import type { IndexLine, IndexRow, Kind, VerdictWord } from './types';

const KINDS: Kind[] = ['indicator', 'strategy'];
const VERDICTS: VerdictWord[] = ['YES', 'NO', 'UNKNOWN'];

/** Fills the defaults of an index line so components never deal with absent fields; null when the line has no id. */
export function decodeLine(l: IndexLine): IndexRow | null {
  if (typeof l.id !== 'string' || !l.id.trim()) return null;
  return {
    id: l.id,
    title: l.title ?? String(l.id),
    kind: KINDS.includes(l.kind) ? l.kind : 'indicator',
    subcategory: l.subcategory ?? null,
    usable: l.usable !== false,
    verdict: VERDICTS.includes(l.verdict) ? l.verdict : 'UNKNOWN',
    main: l.main ?? null,
    paper: l.paper ?? null,
    paperTrades: l.paperTrades ?? 0,
    expected: l.expected ?? null,
    iterations: l.iterations ?? 1,
    updated: l.updated ?? '',
    market: l.market ?? '',
    timeframe: l.timeframe ?? '',
    license: l.license ?? '',
    author: l.author ?? '',
    tvUrl: l.tvUrl ?? '',
    cycleStart: l.cycleStart ?? '',
    percentile: l.percentile ?? null,
    reason: l.reason ?? '',
  };
}
