import { createReadStream } from "fs";
import { readdir, readFile, stat } from "fs/promises";
import { createInterface } from "readline";
import path from "path";

import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import { TYPES } from "../../core/types";

export type IssueLevel = "error" | "warning";

export interface DataIssue {
  level: IssueLevel;
  /** relative to the project root: data/index_1.jsonl */
  file: string;
  /** 1-based line of a .jsonl file */
  line?: number;
  /** location inside a JSON document: messages[2].md */
  at?: string;
  message: string;
}

/** The return value of the validate() generator, available once every issue has been yielded. */
export interface DataSummary {
  root: string;
  scripts: number;
  chunks: number;
  errors: number;
  warnings: number;
}

const DATA_DIR = "data";
const SLUG = /^[a-z0-9-]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const INDEX_FILE = /^index_(\d+)\.jsonl$/;
const SCRIPT_FILE = /^([a-z0-9-]+)_(messages|candles|pinescript)\.json$/;
const CHART_REF = /\[\[(t|range|trade):([^\]]+)\]\]|\]\(ref:(t|range|trade):([^)]+)\)/g;

type RuleType = "string" | "number" | "integer" | "boolean" | "date" | "slug" | "enum" | "tuple2" | "array" | "object";

interface Rule {
  type: RuleType;
  required?: boolean;
  /** null is accepted as a value (close_time of an open trade) */
  nullable?: boolean;
  values?: readonly string[];
}

type Schema = Record<string, Rule>;

const INDEX_LINE: Schema = {
  id: { type: "slug", required: true },
  title: { type: "string", required: true },
  kind: { type: "enum", values: ["indicator", "strategy"], required: true },
  subcategory: { type: "string" },
  usable: { type: "boolean" },
  verdict: { type: "enum", values: ["YES", "NO", "UNKNOWN"], required: true },
  main: { type: "number" },
  paper: { type: "number" },
  paperTrades: { type: "integer" },
  expected: { type: "tuple2" },
  iterations: { type: "integer" },
  updated: { type: "date", required: true },
  market: { type: "string" },
  timeframe: { type: "string" },
  license: { type: "string" },
  author: { type: "string" },
  tvUrl: { type: "string" },
  cycleStart: { type: "date" },
  percentile: { type: "number" },
  reason: { type: "string" },
};

const MESSAGES_FILE: Schema = {
  head: { type: "object" },
  groups: { type: "array" },
  messages: { type: "array", required: true },
};

const GROUP: Schema = {
  code: { type: "string", required: true },
  title: { type: "string", required: true },
};

const MESSAGE: Schema = {
  code: { type: "string" },
  group: { type: "string" },
  title: { type: "string", required: true },
  md: { type: "string", required: true },
  iteration: { type: "integer" },
  date: { type: "date" },
};

const CANDLES_FILE: Schema = {
  timeframe: { type: "string" },
  bars: { type: "array", required: true },
  trades: { type: "array" },
  equity: { type: "array" },
};

const BAR: Schema = {
  time: { type: "number", required: true },
  open: { type: "number", required: true },
  high: { type: "number", required: true },
  low: { type: "number", required: true },
  close: { type: "number", required: true },
  volume: { type: "number", required: true },
};

const TRADE: Schema = {
  id: { type: "integer", required: true },
  iteration: { type: "integer" },
  side: { type: "enum", values: ["long", "short"], required: true },
  open_time: { type: "number", required: true },
  open_price: { type: "number", required: true },
  close_time: { type: "number", nullable: true },
  close_price: { type: "number", nullable: true },
  pnl_usd: { type: "number", required: true },
};

const EQUITY: Schema = {
  time: { type: "number", required: true },
  backtest_usd: { type: "number", nullable: true },
  paper_usd: { type: "number", nullable: true },
};

const PINESCRIPT_FILE: Schema = {
  source: { type: "string", required: true },
  rule: { type: "string" },
};

interface Where {
  file: string;
  line?: number;
  at?: string;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const describe = (v: unknown) => {
  if (v === null) return "null";
  if (Array.isArray(v)) return "an array";
  if (typeof v === "string") return `"${v.length > 40 ? v.slice(0, 40) + "…" : v}"`;
  return typeof v === "object" ? "an object" : String(v);
};

const typeError = (rule: Rule, v: unknown): string | null => {
  switch (rule.type) {
    case "string": return typeof v === "string" ? null : `must be a string, got ${describe(v)}`;
    case "number": return typeof v === "number" && Number.isFinite(v) ? null : `must be a number, got ${describe(v)}`;
    case "integer": return Number.isInteger(v) ? null : `must be an integer, got ${describe(v)}`;
    case "boolean": return typeof v === "boolean" ? null : `must be true or false, got ${describe(v)}`;
    case "date": return typeof v === "string" && DATE.test(v) && !Number.isNaN(Date.parse(v)) ? null : `must be a date YYYY-MM-DD, got ${describe(v)}`;
    case "slug": return typeof v === "string" && SLUG.test(v) ? null : `must be a slug [a-z0-9-]+, got ${describe(v)}`;
    case "enum": return typeof v === "string" && rule.values!.includes(v) ? null : `must be one of ${rule.values!.join(", ")}, got ${describe(v)}`;
    case "tuple2": return Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === "number" && Number.isFinite(x)) ? null : `must be [low, high] with two numbers, got ${describe(v)}`;
    case "array": return Array.isArray(v) ? null : `must be an array, got ${describe(v)}`;
    case "object": return isPlainObject(v) ? null : `must be an object, got ${describe(v)}`;
  }
};

/** Key order and formatting do not matter when comparing head with the index line. */
const canonical = (v: unknown): string =>
  isPlainObject(v)
    ? `{${Object.keys(v).filter((k) => v[k] !== null && v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`
    : JSON.stringify(v);

const error = (file: string, message: string, where: Partial<Where> = {}): DataIssue => ({ level: "error", file, message, ...where });
const warning = (file: string, message: string, where: Partial<Where> = {}): DataIssue => ({ level: "warning", file, message, ...where });

/** The shape of a JSON value against a schema; pure and small, so a plain array is returned. */
const checkObject = (value: unknown, schema: Schema, where: Where): { ok: boolean; issues: DataIssue[] } => {
  const issues: DataIssue[] = [];
  const at = (): Partial<Where> => ({ line: where.line, at: where.at });
  if (!isPlainObject(value)) {
    issues.push(error(where.file, `must be an object, got ${describe(value)}`, at()));
    return { ok: false, issues };
  }
  for (const [key, rule] of Object.entries(schema)) {
    const v = value[key];
    if (v === undefined || (v === null && !rule.nullable)) {
      if (rule.required) issues.push(error(where.file, v === null ? `"${key}" is required and must not be null` : `"${key}" is required`, at()));
      continue;
    }
    if (v === null) continue;
    const problem = typeError(rule, v);
    if (problem) {
      issues.push(error(where.file, `"${key}" ${problem}`, at()));
      continue;
    }
    if (rule.required && rule.type === "string" && !(v as string).trim()) {
      issues.push(error(where.file, `"${key}" must not be empty`, at()));
    }
  }
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const key of Object.keys(value)) {
    if (key in schema) continue;
    const hit = Object.keys(schema).find((k) => norm(k) === norm(key));
    issues.push(error(where.file, `unknown field "${key}"${hit ? ` (did you mean "${hit}"?)` : ""}`, at()));
  }
  return { ok: !issues.length, issues };
};

/** [[t:…]], [[range:…]], [[trade:N]] and [text](ref:…) must point at something the chart can show. */
function* checkRefs(md: string, where: Where, tradeIds: Set<number> | null): Generator<DataIssue> {
  for (const m of md.matchAll(CHART_REF)) {
    const kind = m[1] ?? m[3];
    const body = (m[2] ?? m[4]).trim();
    const ref = m[0];
    const at = { at: where.at };
    if (kind === "t") {
      const [ts, price] = body.split("@");
      if (Number.isNaN(Date.parse(ts))) yield error(where.file, `${ref}: not a date (ISO 8601 expected)`, at);
      if (price !== undefined && !Number.isFinite(Number(price))) yield error(where.file, `${ref}: the price after @ is not a number`, at);
    } else if (kind === "range") {
      const [a, b] = body.split("..");
      const from = Date.parse(a), to = Date.parse(b ?? "");
      if (Number.isNaN(from) || Number.isNaN(to)) yield error(where.file, `${ref}: expected two ISO 8601 dates joined with ".."`, at);
      else if (from >= to) yield error(where.file, `${ref}: the range ends before it starts`, at);
    } else {
      const n = Number(body);
      if (!Number.isInteger(n)) yield error(where.file, `${ref}: expected a trade id (integer)`, at);
      else if (tradeIds && !tradeIds.has(n)) yield error(where.file, `${ref}: no trade with id ${n} in the candles file`, at);
    }
  }
}

/**
 * Validates <root>/data against the contract and yields every problem the moment it is found:
 * the index files are read line by line, the files of each script one script at a time, so memory
 * holds one document at once whatever the size of the folder. The generator's return value is
 * the summary (counts) once everything has been yielded.
 */
export class DataValidationService {
  private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public validate = async function* (this: DataValidationService, root: string): AsyncGenerator<DataIssue, DataSummary> {
    this.loggerService.log("dataValidationService validate", { root });
    const dir = path.resolve(root, DATA_DIR);
    const rel = (name: string) => path.join(DATA_DIR, name);
    const summary: DataSummary = { root, scripts: 0, chunks: 0, errors: 0, warnings: 0 };
    const count = (issue: DataIssue) => {
      if (issue.level === "error") summary.errors += 1;
      else summary.warnings += 1;
      return issue;
    };

    // the folder
    let dirStat;
    try {
      dirStat = await stat(dir);
    } catch {
      yield count(error(DATA_DIR, `folder not found: ${dir}`));
      return summary;
    }
    if (!dirStat.isDirectory()) {
      yield count(error(DATA_DIR, `is not a folder: ${dir}`));
      return summary;
    }
    const names = (await readdir(dir)).filter((n) => !n.startsWith("."));
    const present = new Set(names);

    // index chunks: index_1 … index_N without gaps
    const chunks = names
      .map((n) => ({ name: n, n: Number(INDEX_FILE.exec(n)?.[1]) }))
      .filter((c) => Number.isInteger(c.n) && c.n >= 1)
      .sort((a, b) => a.n - b.n);
    summary.chunks = chunks.length;
    if (!chunks.length) {
      yield count(error(rel("index_1.jsonl"), "not found: the list is read from data/index_1.jsonl (an empty file is fine)"));
    }
    for (let i = 0; i < chunks.length; i += 1) {
      const expected = i + 1;
      if (chunks[i].n !== expected) {
        yield count(error(rel(`index_${expected}.jsonl`), `missing: the site stops at the first missing index file, so index_${chunks[i].n}.jsonl and later are never read`));
        break;
      }
    }

    // index lines, streamed; only the raw text of the last line per id is kept
    const rows = new Map<string, string>();
    for (const chunk of chunks) {
      const file = rel(chunk.name);
      const lines = createInterface({ input: createReadStream(path.join(dir, chunk.name), "utf8"), crlfDelay: Infinity });
      let line = 0;
      for await (const raw of lines) {
        line += 1;
        const l = raw.trim();
        if (!l) continue;
        let obj: unknown;
        try {
          obj = JSON.parse(l);
        } catch (e) {
          yield count(error(file, `not valid JSON: ${(e as Error).message}`, { line }));
          continue;
        }
        const check = checkObject(obj, INDEX_LINE, { file, line });
        for (const issue of check.issues) yield count(issue);
        if (check.ok) rows.set((obj as { id: string }).id, l);
      }
    }
    summary.scripts = rows.size;

    // every script's files, one script at a time
    const known = new Set<string>();
    for (const [id, raw] of rows) {
      const row = JSON.parse(raw) as Record<string, unknown>;
      const messagesName = `${id}_messages.json`;
      const candlesName = `${id}_candles.json`;
      const pinescriptName = `${id}_pinescript.json`;
      known.add(messagesName); known.add(candlesName); known.add(pinescriptName);

      let tradeIds: Set<number> | null = null;
      for await (const item of this.checkCandles(dir, rel(candlesName), present.has(candlesName))) {
        if (item instanceof Set) tradeIds = item;
        else yield count(item);
      }
      for await (const issue of this.checkMessages(dir, rel(messagesName), present.has(messagesName), id, row, tradeIds)) yield count(issue);
      if (present.has(pinescriptName)) {
        const doc = await this.readJson(dir, pinescriptName);
        if (doc.issue) yield count(doc.issue);
        else for (const issue of checkObject(doc.value, PINESCRIPT_FILE, { file: rel(pinescriptName) }).issues) yield count(issue);
      }
    }

    // files nobody asked for
    for (const name of names) {
      if (INDEX_FILE.test(name) || known.has(name)) continue;
      const m = SCRIPT_FILE.exec(name);
      yield count(m
        ? warning(rel(name), `no index line with id "${m[1]}": the file is never shown`)
        : warning(rel(name), "unexpected file: the site only reads index_N.jsonl and <id>_messages|candles|pinescript.json"));
    }

    return summary;
  };

  private readJson = async (dir: string, name: string): Promise<{ value?: unknown; issue?: DataIssue }> => {
    const text = await readFile(path.join(dir, name), "utf8");
    try {
      return { value: JSON.parse(text) };
    } catch (e) {
      return { issue: error(path.join(DATA_DIR, name), `not valid JSON: ${(e as Error).message}`) };
    }
  };

  /** Yields issues, and the set of trade ids as the last item when the file is usable. */
  private checkCandles = async function* (this: DataValidationService, dir: string, file: string, exists: boolean): AsyncGenerator<DataIssue | Set<number>> {
    if (!exists) {
      yield error(file, "not found: every script needs its candles file (bars for the chart)");
      return;
    }
    const doc = await this.readJson(dir, path.basename(file));
    if (doc.issue) {
      yield doc.issue;
      return;
    }
    const top = checkObject(doc.value, CANDLES_FILE, { file });
    yield* top.issues;
    if (!top.ok) return;
    const d = doc.value as { bars: unknown[]; trades?: unknown[]; equity?: unknown[] };
    if (!d.bars.length) yield error(file, '"bars" must not be empty', { at: "bars" });
    let prev = -Infinity;
    for (let i = 0; i < d.bars.length; i += 1) {
      const check = checkObject(d.bars[i], BAR, { file, at: `bars[${i}]` });
      yield* check.issues;
      if (!check.ok) continue;
      const b = d.bars[i] as { time: number; high: number; low: number };
      if (b.time <= prev) yield error(file, `"time" must grow from bar to bar (got ${b.time} after ${prev})`, { at: `bars[${i}]` });
      if (b.high < b.low) yield error(file, `"high" is below "low"`, { at: `bars[${i}]` });
      prev = b.time;
    }
    const tradeIds = new Set<number>();
    const trades = d.trades ?? [];
    for (let i = 0; i < trades.length; i += 1) {
      const check = checkObject(trades[i], TRADE, { file, at: `trades[${i}]` });
      yield* check.issues;
      if (!check.ok) continue;
      const t = trades[i] as { id: number; open_time: number; close_time: number | null };
      if (tradeIds.has(t.id)) yield error(file, `"id" ${t.id} is used twice`, { at: `trades[${i}]` });
      tradeIds.add(t.id);
      if (t.close_time != null && t.close_time < t.open_time) yield error(file, `"close_time" is before "open_time"`, { at: `trades[${i}]` });
    }
    const equity = d.equity ?? [];
    for (let i = 0; i < equity.length; i += 1) yield* checkObject(equity[i], EQUITY, { file, at: `equity[${i}]` }).issues;
    if (d.equity && d.equity.length === 1) yield warning(file, '"equity" has a single point: the P&L line needs at least two', { at: "equity" });
    yield tradeIds;
  };

  private checkMessages = async function* (this: DataValidationService, dir: string, file: string, exists: boolean, id: string, row: Record<string, unknown>, tradeIds: Set<number> | null): AsyncGenerator<DataIssue> {
    if (!exists) {
      yield error(file, "not found: every script needs its messages file (the report text)");
      return;
    }
    const doc = await this.readJson(dir, path.basename(file));
    if (doc.issue) {
      yield doc.issue;
      return;
    }
    const top = checkObject(doc.value, MESSAGES_FILE, { file });
    yield* top.issues;
    if (!top.ok) return;
    const d = doc.value as { head?: Record<string, unknown>; groups?: unknown[]; messages: unknown[] };
    if (d.head !== undefined) {
      const check = checkObject(d.head, INDEX_LINE, { file, at: "head" });
      yield* check.issues;
      if (check.ok) {
        if (d.head.id !== id) yield error(file, `"id" is "${d.head.id}" but the file belongs to "${id}"`, { at: "head" });
        else if (canonical(d.head) !== canonical(row)) {
          const diff = [...new Set([...Object.keys(d.head), ...Object.keys(row)])].filter((k) => canonical(d.head![k]) !== canonical(row[k]));
          yield error(file, `differs from the index line in ${diff.map((k) => `"${k}"`).join(", ")}: copy the index line as is`, { at: "head" });
        }
      }
    } else {
      yield warning(file, `"head" is missing: a direct link to /run/?id=${id} has to scan the index first`);
    }
    const groups = d.groups ?? [];
    for (let i = 0; i < groups.length; i += 1) yield* checkObject(groups[i], GROUP, { file, at: `groups[${i}]` }).issues;
    if (!d.messages.length) yield warning(file, '"messages" is empty: the page shows no text', { at: "messages" });
    for (let i = 0; i < d.messages.length; i += 1) {
      const check = checkObject(d.messages[i], MESSAGE, { file, at: `messages[${i}]` });
      yield* check.issues;
      if (!check.ok) continue;
      yield* checkRefs((d.messages[i] as { md: string }).md, { file, at: `messages[${i}].md` }, tradeIds);
    }
  };
}

export default DataValidationService;
