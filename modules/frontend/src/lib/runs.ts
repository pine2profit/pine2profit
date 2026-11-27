import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Block, Iteration, Run } from './types';
import { renderAnswers } from './markdown';

const RUNS = join(process.cwd(), 'runs');
let cache: Run[] | null = null;

const read = (p: string) => readFileSync(p, 'utf8');
const json = <T,>(p: string): T => JSON.parse(read(p)) as T;

export function allRuns(): Run[] {
  if (cache) return cache;
  cache = readdirSync(RUNS)
    .filter((slug) => existsSync(join(RUNS, slug, 'meta.json')))
    .map((slug) => {
      const dir = join(RUNS, slug);
      const trades = json<Run['trades']>(join(dir, 'trades.json'));
      const answersDir = join(dir, 'answers');
      const iterations: Iteration[] = readdirSync(answersDir)
        .filter((f) => /^\d{3}\.md$/.test(f))
        .sort()
        .map((f) => {
          const n = Number(f.slice(0, 3));
          const { date, blocks } = renderAnswers(read(join(answersDir, f)), trades, n);
          return { n, date, blocks };
        });
      return {
        slug,
        meta: json(join(dir, 'meta.json')),
        verdict: json(join(dir, 'verdict.json')),
        trades,
        equity: json(join(dir, 'equity.json')),
        source: read(join(dir, 'source.pine')),
        rule: existsSync(join(dir, 'rule.pine')) ? read(join(dir, 'rule.pine')) : '',
        iterations,
      } as Run;
    })
    .sort((a, b) => (a.verdict.updated < b.verdict.updated ? 1 : -1));
  return cache;
}

export const runBySlug = (slug: string) => allRuns().find((r) => r.slug === slug);

/** Indicators: A2 decided whether any signal is final at bar close. Strategies always go through B and C. */
export const isUsable = (run: Run) => run.meta.kind !== 'indicator' || run.meta.usable !== false;

/** Blocks A–D: the latest version of each code across iterations, in canonical order. */
export function analysisBlocks(run: Run): Block[] {
  const latest = new Map<string, Block>();
  for (const it of run.iterations) for (const b of it.blocks) if (!b.code.startsWith('E')) latest.set(b.code, b);
  return [...latest.values()].sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }));
}

/** Blocks E per iteration, latest iteration first. */
export function cycleBlocks(run: Run): { n: number; date: string; blocks: Block[] }[] {
  return [...run.iterations]
    .map((it) => ({ n: it.n, date: it.date, blocks: it.blocks.filter((b) => b.code.startsWith('E')) }))
    .filter((it) => it.blocks.length)
    .reverse();
}

export function allRefs(run: Run) {
  return run.iterations.flatMap((it) => it.blocks.flatMap((b) => b.refs));
}

/** C4: the rule's percentile against 1000 random-entry runs — a computed number, shown instead of any "confidence". */
export function c4Percentile(run: Run): string | null {
  const c4 = analysisBlocks(run).find((b) => b.code === 'C4');
  const m = c4 && /\|\s*(?:rule\s+|strategy\s+)?percentile\s*\|\s*([^|\n]+?)\s*\|/i.exec(c4.md);
  return m ? m[1] : null;
}
