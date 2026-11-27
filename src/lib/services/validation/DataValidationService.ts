import { readdir, readFile, stat } from "fs/promises";
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

export interface DataReport {
  root: string;
  scripts: number;
  chunks: number;
  errors: number;
  warnings: number;
  issues: DataIssue[];
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

const join = (at: string | undefined, key: string) => (at ? `${at}.${key}` : key);

/** Key order and formatting do not matter when comparing head with the index line. */
const canonical = (v: unknown): string =>
  isPlainObject(v)
    ? `{${Object.keys(v).filter((k) => v[k] !== null && v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`
    : JSON.stringify(v);

export class DataValidationService {
  private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  /**
   * Checks <root>/data against the contract: the index files, every script's files and their
   * schemas, the chart references inside the markdown. Errors mean the site would show something
   * wrong or nothing at all; warnings are things worth cleaning up.
   */
  public validate = async (root: string): Promise<DataReport> => {
    this.loggerService.log("dataValidationService validate", { root });
    const dir = path.resolve(root, DATA_DIR);
    const rel = (name: string) => path.join(DATA_DIR, name);
    const issues: DataIssue[] = [];
    const error = (file: string, message: string, where: Partial<Where> = {}) => issues.push({ level: "error", file, message, ...where });
    const warning = (file: string, message: string, where: Partial<Where> = {}) => issues.push({ level: "warning", file, message, ...where });
    const report = (): DataReport => ({
      root,
      scripts: 0,
      chunks: 0,
      errors: issues.filter((i) => i.level === "error").length,
      warnings: issues.filter((i) => i.level === "warning").length,
      issues,
    });

    // the folder
    let dirStat;
    try {
      dirStat = await stat(dir);
    } catch {
      error(DATA_DIR, `folder not found: ${dir}`);
      return report();
    }
    if (!dirStat.isDirectory()) {
      error(DATA_DIR, `is not a folder: ${dir}`);
      return report();
    }
    const names = (await readdir(dir)).filter((n) => !n.startsWith("."));

    // index chunks: index_1 … index_N without gaps
    const chunks = names
      .map((n) => ({ name: n, n: Number(INDEX_FILE.exec(n)?.[1]) }))
      .filter((c) => Number.isInteger(c.n) && c.n >= 1)
      .sort((a, b) => a.n - b.n);
    if (!chunks.length) {
      error(rel("index_1.jsonl"), "not found: the list is read from data/index_1.jsonl (an empty file is fine)");
    }
    for (let i = 0; i < chunks.length; i += 1) {
      const expected = i + 1;
      if (chunks[i].n !== expected) {
        error(rel(`index_${expected}.jsonl`), `missing: the site stops at the first missing index file, so index_${chunks[i].n}.jsonl and later are never read`);
        break;
      }
    }

    // index lines
    const rows = new Map<string, Record<string, unknown>>();
    for (const chunk of chunks) {
      const file = rel(chunk.name);
      const text = await readFile(path.join(dir, chunk.name), "utf8");
      const lines = text.split("\n");
      lines.forEach((raw, idx) => {
        const line = idx + 1;
        const l = raw.trim();
        if (!l) return;
        let obj: unknown;
        try {
          obj = JSON.parse(l);
        } catch (e) {
          error(file, `not valid JSON: ${(e as Error).message}`, { line });
          return;
        }
        const before = issues.length;
        this.checkObject(obj, INDEX_LINE, { file, line }, error);
        if (issues.length === before && isPlainObject(obj)) {
          rows.set(obj.id as string, obj);
        }
      });
    }

    // every script's files
    const known = new Set<string>();
    for (const [id, row] of rows) {
      const messagesName = `${id}_messages.json`;
      const candlesName = `${id}_candles.json`;
      const pinescriptName = `${id}_pinescript.json`;
      known.add(messagesName); known.add(candlesName); known.add(pinescriptName);

      const tradeIds = await this.checkCandles(dir, rel(candlesName), names.includes(candlesName), error, warning);
      await this.checkMessages(dir, rel(messagesName), names.includes(messagesName), id, row, tradeIds, error, warning);
      if (names.includes(pinescriptName)) {
        const doc = await this.readJson(dir, rel(pinescriptName), error);
        if (doc !== undefined) this.checkObject(doc, PINESCRIPT_FILE, { file: rel(pinescriptName) }, error);
      }
    }

    // files nobody asked for
    for (const name of names) {
      if (INDEX_FILE.test(name) || known.has(name)) continue;
      const m = SCRIPT_FILE.exec(name);
      if (m) warning(rel(name), `no index line with id "${m[1]}": the file is never shown`);
      else warning(rel(name), "unexpected file: the site only reads index_N.jsonl and <id>_messages|candles|pinescript.json");
    }

    const result = report();
    result.scripts = rows.size;
    result.chunks = chunks.length;
    return result;
  };

  private readJson = async (dir: string, file: string, error: (file: string, message: string, where?: Partial<Where>) => void): Promise<unknown> => {
    const text = await readFile(path.join(dir, path.basename(file)), "utf8");
    try {
      return JSON.parse(text);
    } catch (e) {
      error(file, `not valid JSON: ${(e as Error).message}`);
      return undefined;
    }
  };

  private checkObject = (
    value: unknown,
    schema: Schema,
    where: Where,
    error: (file: string, message: string, where?: Partial<Where>) => void,
  ): boolean => {
    if (!isPlainObject(value)) {
      error(where.file, `must be an object, got ${describe(value)}`, { line: where.line, at: where.at });
      return false;
    }
    let ok = true;
    for (const [key, rule] of Object.entries(schema)) {
      const v = value[key];
      const at = join(where.at, key);
      if (v === undefined || (v === null && !rule.nullable)) {
        if (rule.required) {
          error(where.file, v === null ? `"${key}" is required and must not be null` : `"${key}" is required`, { line: where.line, at: where.at });
          ok = false;
        }
        continue;
      }
      if (v === null) continue;
      const problem = typeError(rule, v);
      if (problem) {
        error(where.file, `"${key}" ${problem}`, { line: where.line, at: where.at });
        ok = false;
        continue;
      }
      if (rule.required && rule.type === "string" && !(v as string).trim()) {
        error(where.file, `"${key}" must not be empty`, { line: where.line, at: where.at });
        ok = false;
      }
      void at;
    }
    for (const key of Object.keys(value)) {
      if (!(key in schema)) {
        error(where.file, `unknown field "${key}"${this.suggest(key, schema)}`, { line: where.line, at: where.at });
        ok = false;
      }
    }
    return ok;
  };

  /** "tv_url" → ' (did you mean "tvUrl"?)' */
  private suggest = (key: string, schema: Schema) => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const hit = Object.keys(schema).find((k) => norm(k) === norm(key));
    return hit ? ` (did you mean "${hit}"?)` : "";
  };

  private checkCandles = async (
    dir: string,
    file: string,
    exists: boolean,
    error: (file: string, message: string, where?: Partial<Where>) => void,
    warning: (file: string, message: string, where?: Partial<Where>) => void,
  ): Promise<Set<number> | null> => {
    if (!exists) {
      error(file, "not found: every script needs its candles file (bars for the chart)");
      return null;
    }
    const doc = await this.readJson(dir, file, error);
    if (doc === undefined) return null;
    if (!this.checkObject(doc, CANDLES_FILE, { file }, error)) return null;
    const d = doc as { bars: unknown[]; trades?: unknown[]; equity?: unknown[] };
    if (!d.bars.length) error(file, '"bars" must not be empty', { at: "bars" });
    let prev = -Infinity;
    d.bars.forEach((bar, i) => {
      if (!this.checkObject(bar, BAR, { file, at: `bars[${i}]` }, error)) return;
      const b = bar as { time: number; high: number; low: number };
      if (b.time <= prev) error(file, `"time" must grow from bar to bar (got ${b.time} after ${prev})`, { at: `bars[${i}]` });
      if (b.high < b.low) error(file, `"high" is below "low"`, { at: `bars[${i}]` });
      prev = b.time;
    });
    const tradeIds = new Set<number>();
    (d.trades ?? []).forEach((trade, i) => {
      if (!this.checkObject(trade, TRADE, { file, at: `trades[${i}]` }, error)) return;
      const t = trade as { id: number; open_time: number; close_time: number | null };
      if (tradeIds.has(t.id)) error(file, `"id" ${t.id} is used twice`, { at: `trades[${i}]` });
      tradeIds.add(t.id);
      if (t.close_time != null && t.close_time < t.open_time) error(file, `"close_time" is before "open_time"`, { at: `trades[${i}]` });
    });
    (d.equity ?? []).forEach((point, i) => this.checkObject(point, EQUITY, { file, at: `equity[${i}]` }, error));
    if (d.equity && d.equity.length === 1) warning(file, '"equity" has a single point: the P&L line needs at least two', { at: "equity" });
    return tradeIds;
  };

  private checkMessages = async (
    dir: string,
    file: string,
    exists: boolean,
    id: string,
    row: Record<string, unknown>,
    tradeIds: Set<number> | null,
    error: (file: string, message: string, where?: Partial<Where>) => void,
    warning: (file: string, message: string, where?: Partial<Where>) => void,
  ) => {
    if (!exists) {
      error(file, "not found: every script needs its messages file (the report text)");
      return;
    }
    const doc = await this.readJson(dir, file, error);
    if (doc === undefined) return;
    if (!this.checkObject(doc, MESSAGES_FILE, { file }, error)) return;
    const d = doc as { head?: Record<string, unknown>; groups?: unknown[]; messages: unknown[] };
    if (d.head !== undefined && this.checkObject(d.head, INDEX_LINE, { file, at: "head" }, error)) {
      if (d.head.id !== id) error(file, `"id" is "${d.head.id}" but the file belongs to "${id}"`, { at: "head" });
      else if (canonical(d.head) !== canonical(row)) {
        const diff = [...new Set([...Object.keys(d.head), ...Object.keys(row)])].filter((k) => canonical(d.head![k]) !== canonical(row[k]));
        error(file, `differs from the index line in ${diff.map((k) => `"${k}"`).join(", ")}: copy the index line as is`, { at: "head" });
      }
    }
    if (d.head === undefined) warning(file, '"head" is missing: a direct link to /run/?id=' + id + " has to scan the index first");
    (d.groups ?? []).forEach((g, i) => this.checkObject(g, GROUP, { file, at: `groups[${i}]` }, error));
    if (!d.messages.length) warning(file, '"messages" is empty: the page shows no text', { at: "messages" });
    d.messages.forEach((m, i) => {
      if (!this.checkObject(m, MESSAGE, { file, at: `messages[${i}]` }, error)) return;
      this.checkRefs((m as { md: string }).md, { file, at: `messages[${i}].md` }, tradeIds, error);
    });
  };

  /** [[t:…]], [[range:…]], [[trade:N]] and [text](ref:…) must point at something the chart can show. */
  private checkRefs = (md: string, where: Where, tradeIds: Set<number> | null, error: (file: string, message: string, where?: Partial<Where>) => void) => {
    for (const m of md.matchAll(CHART_REF)) {
      const kind = m[1] ?? m[3];
      const body = (m[2] ?? m[4]).trim();
      const ref = m[0];
      if (kind === "t") {
        const [ts, price] = body.split("@");
        if (Number.isNaN(Date.parse(ts))) error(where.file, `${ref}: not a date (ISO 8601 expected)`, { at: where.at });
        if (price !== undefined && !Number.isFinite(Number(price))) error(where.file, `${ref}: the price after @ is not a number`, { at: where.at });
      } else if (kind === "range") {
        const [a, b] = body.split("..");
        const from = Date.parse(a), to = Date.parse(b ?? "");
        if (Number.isNaN(from) || Number.isNaN(to)) error(where.file, `${ref}: expected two ISO 8601 dates joined with ".."`, { at: where.at });
        else if (from >= to) error(where.file, `${ref}: the range ends before it starts`, { at: where.at });
      } else {
        const n = Number(body);
        if (!Number.isInteger(n)) error(where.file, `${ref}: expected a trade id (integer)`, { at: where.at });
        else if (tradeIds && !tradeIds.has(n)) error(where.file, `${ref}: no trade with id ${n} in the candles file`, { at: where.at });
      }
    }
  };
}

export default DataValidationService;
