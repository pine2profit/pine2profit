'use client';

import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { VirtuosoGrid } from 'react-virtuoso';
import ioc from '@/lib';
import type { IndexRow, Kind, VerdictWord } from '@/lib/types';
import { SUBCATS, subLabel } from '@/lib/taxonomy';
import { RunCard } from './RunCard';

const KINDS: readonly Kind[] = ['indicator', 'strategy'];
const VERDICTS: readonly VerdictWord[] = ['YES', 'NO', 'UNKNOWN'];
const VERDICT_ORDER: Record<VerdictWord, number> = { YES: 0, UNKNOWN: 1, NO: 2 };
const SORT_KEYS = ['verdict', 'main', 'paper', 'expected', 'updated', 'title'] as const;
type SortKey = (typeof SORT_KEYS)[number];
const ASC_BY_DEFAULT: ReadonlySet<SortKey> = new Set<SortKey>(['verdict', 'title']);
const defaultDir = (k: SortKey): 1 | -1 => (ASC_BY_DEFAULT.has(k) ? 1 : -1);
const num = (v: number | null | undefined) => (v == null ? -Infinity : v);

/** The filter state. It lives in the query string (?kind=indicator&verdict=YES&sub=trend&sort=updated&dir=asc), defaults omitted. */
interface Filters {
  kind: 'all' | Kind;
  verdict: 'all' | VerdictWord;
  sub: string;
  sort: SortKey;
  dir: 1 | -1;
}

function readFilters(sp: URLSearchParams): Filters {
  const kind = sp.get('kind') as Kind | null;
  const verdict = sp.get('verdict') as VerdictWord | null;
  const sort = sp.get('sort') as SortKey | null;
  const sortKey: SortKey = sort && (SORT_KEYS as readonly string[]).includes(sort) ? sort : 'verdict';
  const dir = sp.get('dir');
  return {
    kind: kind && KINDS.includes(kind) ? kind : 'all',
    verdict: verdict && VERDICTS.includes(verdict) ? verdict : 'all',
    sub: sp.get('sub') ?? 'all',
    sort: sortKey,
    dir: dir === 'asc' ? 1 : dir === 'desc' ? -1 : defaultDir(sortKey),
  };
}

function writeFilters(f: Filters) {
  const p = new URLSearchParams();
  if (f.kind !== 'all') p.set('kind', f.kind);
  if (f.verdict !== 'all') p.set('verdict', f.verdict);
  if (f.kind !== 'all' && f.sub !== 'all') p.set('sub', f.sub);
  if (f.sort !== 'verdict') p.set('sort', f.sort);
  if (f.dir !== defaultDir(f.sort)) p.set('dir', f.dir === 1 ? 'asc' : 'desc');
  const q = p.toString();
  window.history.replaceState(window.history.state, '', q ? `?${q}` : window.location.pathname);
}

/**
 * The list is fed by IndexViewService, which streams data/index_1.jsonl, index_2.jsonl, … and pushes the rows
 * read so far, so the first cards render before a large index finishes downloading. Filtering and sorting
 * happen in memory over the whole set; VirtuosoGrid renders only the cards in view, so tens of thousands of
 * scripts stay scrollable. Subcategory chips come from the data, not from a fixed list.
 */
export function RunsList() {
  const sp = useSearchParams();
  const [f, setF] = useState<Filters>(() => readFilters(new URLSearchParams(sp.toString())));
  const [all, setAll] = useState<IndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const svc = ioc.indexViewService;
    setAll(svc.getRows());
    if (svc.doneSubject.data) setLoading(false);
    const unRows = svc.rowsSubject.subscribe((rows: IndexRow[]) => startTransition(() => setAll(rows)));
    const unDone = svc.doneSubject.subscribe((done: boolean) => { if (done) setLoading(false); });
    svc.load().catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
    return () => { unRows(); unDone(); };
  }, []);

  const update = useCallback((patch: Partial<Filters>) => {
    setF((prev) => {
      const next = { ...prev, ...patch };
      if (patch.kind !== undefined || patch.verdict !== undefined) next.sub = 'all';
      if (patch.sort !== undefined && patch.dir === undefined) next.dir = defaultDir(patch.sort);
      writeFilters(next);
      return next;
    });
  }, []);

  const { kind, verdict, sub, sort, dir } = f;
  const inScope = useCallback((r: IndexRow) => (kind === 'all' || r.kind === kind) && (verdict === 'all' || r.verdict === verdict), [kind, verdict]);

  const shown = useMemo(() => {
    const rows = all.filter((r) => inScope(r) && (sub === 'all' || r.subcategory === sub));
    const cmp = (a: IndexRow, b: IndexRow) => {
      switch (sort) {
        case 'verdict': return VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || num(b.main) - num(a.main);
        case 'title': return a.title.localeCompare(b.title);
        case 'updated': return a.updated.localeCompare(b.updated);
        case 'expected': return num(a.expected?.[1]) - num(b.expected?.[1]);
        default: return num(a[sort]) - num(b[sort]);
      }
    };
    return rows.sort((a, b) => dir * cmp(a, b));
  }, [all, inScope, sub, sort, dir]);

  // Subcategories present in the data for the chosen kind (known keys first, in taxonomy order, then the rest
  // alphabetically); counts respect the verdict filter, a chip with no matches is dimmed, not hidden.
  const chips = useMemo(() => {
    if (kind === 'all') return [];
    const present = new Set<string>();
    const counts = new Map<string, number>();
    for (const r of all) {
      if (r.kind !== kind || !r.subcategory) continue;
      present.add(r.subcategory);
      if (verdict === 'all' || r.verdict === verdict) counts.set(r.subcategory, (counts.get(r.subcategory) ?? 0) + 1);
    }
    const known = SUBCATS[kind].map(([key]) => key).filter((key) => present.has(key));
    const rest = [...present].filter((key) => !known.includes(key)).sort();
    return [...known, ...rest].map((key) => ({ key, label: subLabel(kind, key), count: counts.get(key) ?? 0 }));
  }, [all, kind, verdict]);

  return (
    <>
      <div className="filters">
        <select className="pill-select" value={kind} onChange={(e) => update({ kind: e.target.value as 'all' | Kind })} aria-label="Type">
          <option value="all">indicators and strategies</option><option value="indicator">indicators</option><option value="strategy">strategies</option>
        </select>
        <select className="pill-select" value={verdict} onChange={(e) => update({ verdict: e.target.value as 'all' | VerdictWord })} aria-label="Verdict">
          <option value="all">any verdict</option><option value="YES">YES</option><option value="NO">NO</option><option value="UNKNOWN">UNKNOWN</option>
        </select>
        <select className="pill-select dim" value={sort} onChange={(e) => update({ sort: e.target.value as SortKey })} aria-label="Sort">
          <option value="verdict">sort: verdict</option><option value="main">sort: 12 months via alerts</option><option value="paper">sort: paper journal</option>
          <option value="expected">sort: expected per month</option><option value="updated">sort: updated</option><option value="title">sort: name</option>
        </select>
        <button className="pill-btn mono" onClick={() => update({ dir: dir === 1 ? -1 : 1 })} title="sort direction" aria-label="sort direction">{dir === 1 ? '↑' : '↓'}</button>
        <span className="count">{loading ? `loading… ${all.length}` : `${shown.length} of ${all.length}`}</span>
        {error && <span className="count neg" title={error}>could not load the list: {error}</span>}
      </div>
      {chips.length > 0 && (
        <div className="chips">
          {chips.map((c) => (
            <button key={c.key} className={`chip${sub === c.key ? ' on' : ''}${c.count ? '' : ' dim'}`} onClick={() => update({ sub: sub === c.key ? 'all' : c.key })}>
              {c.label}{c.count ? ` ${c.count}` : ''}
            </button>
          ))}
        </div>
      )}
      <VirtuosoGrid
        useWindowScroll
        data={shown}
        overscan={800}
        listClassName="cards"
        itemClassName="cards-item"
        computeItemKey={(_, row) => row.id}
        itemContent={(_, row) => <RunCard row={row} />}
      />
      {!loading && !error && !shown.length && <div className="empty">nothing matches the filters</div>}
    </>
  );
}
