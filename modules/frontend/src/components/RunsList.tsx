'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import type { IndexRow, Kind, VerdictWord } from '@/lib/types';
import { SUBCATS } from '@/lib/taxonomy';
import { withBase } from '@/lib/base';
import { RunCard } from './RunCard';

const PAGE = 60; // cards appended per "reached the bottom"
const VERDICT_ORDER: Record<VerdictWord, number> = { YES: 0, UNKNOWN: 1, NO: 2 };
type SortKey = 'verdict' | 'main' | 'paper' | 'expected' | 'updated' | 'title';
const num = (v: number | null | undefined) => (v == null ? -Infinity : v);

/**
 * The list reads public/runs/index.jsonl (one JSON object per line, written at build time) and streams it
 * line by line, so the first cards render before a large index finishes downloading. Filtering and sorting
 * happen in memory; VirtuosoGrid virtualises the DOM and `endReached` appends the next page of cards,
 * which keeps thousands of scripts scrollable.
 */
export function RunsList() {
  const [all, setAll] = useState<IndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<'all' | Kind>('all');
  const [verdict, setVerdict] = useState<'all' | VerdictWord>('all');
  const [sub, setSub] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('verdict');
  const [dir, setDir] = useState<1 | -1>(1);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(withBase('/runs/index.jsonl'));
      const rows: IndexRow[] = [];
      const push = (line: string) => { const l = line.trim(); if (l) rows.push(JSON.parse(l) as IndexRow); };
      const reader = res.body?.getReader();
      if (reader) {
        const dec = new TextDecoder(); let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const parts = buf.split('\n'); buf = parts.pop() ?? '';
          parts.forEach(push);
          if (!cancelled) setAll([...rows]);
        }
        push(buf);
      } else {
        (await res.text()).split('\n').forEach(push);
      }
      if (!cancelled) { setAll([...rows]); setLoading(false); }
    })().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const inScope = useCallback((r: IndexRow) => (kind === 'all' || r.kind === kind) && (verdict === 'all' || r.verdict === verdict), [kind, verdict]);

  const shown = useMemo(() => {
    const f = all.filter((r) => inScope(r) && (sub === 'all' || r.subcategory === sub));
    const cmp = (a: IndexRow, b: IndexRow) => {
      switch (sortKey) {
        case 'verdict': return VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || num(b.main) - num(a.main);
        case 'title': return a.title.localeCompare(b.title);
        case 'updated': return a.updated.localeCompare(b.updated);
        case 'expected': return num(a.expected?.[1]) - num(b.expected?.[1]);
        default: return num(a[sortKey]) - num(b[sortKey]);
      }
    };
    return f.sort((a, b) => dir * cmp(a, b));
  }, [all, inScope, sub, sortKey, dir]);

  useEffect(() => { setLimit(PAGE); }, [kind, verdict, sub, sortKey, dir]);
  const visible = useMemo(() => shown.slice(0, limit), [shown, limit]);
  const loadMore = useCallback(() => setLimit((n) => (n < shown.length ? Math.min(n + PAGE, shown.length) : n)), [shown.length]);

  const chips = kind === 'all' ? [] : SUBCATS[kind].map(([key, label]) => {
    const count = all.filter((r) => r.kind === kind && (verdict === 'all' || r.verdict === verdict) && r.subcategory === key).length;
    return { key, label, count };
  });

  return (
    <>
      <div className="filters">
        <select className="pill-select" value={kind} onChange={(e) => { setKind(e.target.value as 'all' | Kind); setSub('all'); }} aria-label="Type">
          <option value="all">indicators and strategies</option><option value="indicator">indicators</option><option value="strategy">strategies</option>
        </select>
        <select className="pill-select" value={verdict} onChange={(e) => { setVerdict(e.target.value as 'all' | VerdictWord); setSub('all'); }} aria-label="Verdict">
          <option value="all">any verdict</option><option value="YES">YES</option><option value="NO">NO</option><option value="UNKNOWN">UNKNOWN</option>
        </select>
        <select className="pill-select dim" value={sortKey} onChange={(e) => { const k = e.target.value as SortKey; setSortKey(k); setDir(k === 'title' || k === 'verdict' ? 1 : -1); }} aria-label="Sort">
          <option value="verdict">sort: verdict</option><option value="main">sort: 12 months via alerts</option><option value="paper">sort: paper journal</option>
          <option value="expected">sort: expected per month</option><option value="updated">sort: updated</option><option value="title">sort: name</option>
        </select>
        <button className="pill-btn mono" onClick={() => setDir((d) => (d === 1 ? -1 : 1))} title="sort direction" aria-label="sort direction">{dir === 1 ? '↑' : '↓'}</button>
        <span className="count">{loading ? 'loading…' : `${shown.length} of ${all.length}`}</span>
      </div>
      {chips.length > 0 && (
        <div className="chips">
          {chips.map((c) => (
            <button key={c.key} className={`chip${sub === c.key ? ' on' : ''}${c.count ? '' : ' dim'}`} onClick={() => setSub(sub === c.key ? 'all' : c.key)}>
              {c.label}{c.count ? ` ${c.count}` : ''}
            </button>
          ))}
        </div>
      )}
      <VirtuosoGrid
        useWindowScroll
        data={visible}
        overscan={600}
        endReached={loadMore}
        listClassName="cards"
        itemClassName="cards-item"
        computeItemKey={(_, row) => row.slug}
        itemContent={(_, row) => <RunCard row={row} />}
      />
      {!loading && !shown.length && <div className="empty">nothing matches the filters</div>}
    </>
  );
}
