'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ioc from '@/lib';
import { decodeLine } from '@/lib/decodeLine';
import { usd, usd0 } from '@/lib/base';
import { subLabel } from '@/lib/taxonomy';
import type { Block, CandlesFile, IndexRow, MessagesFile, PinescriptFile } from '@/lib/types';
import { ChartPanelLoader } from './ChartPanelLoader';
import { PineCodeLoader } from './PineCodeLoader';
import { Answers } from './Answers';
import { EquityChart } from './EquityChart';
import { Rail, type RailGroup } from './Rail';

const pad3 = (n: number) => String(n).padStart(3, '0');
const sign = (v: number) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');
const NOTES = '·';

type Loaded<T> = T | null | undefined; // undefined = loading, null = the agent did not write the file

interface Section { iteration: number | null; date?: string; blocks: Block[] }

const emptyHead = (id: string): IndexRow => ({
  id, title: id, kind: 'indicator', subcategory: null, usable: true, verdict: 'UNKNOWN', main: null, paper: null, paperTrades: 0,
  expected: null, iterations: 1, updated: '', market: '', timeframe: '', license: '', author: '', tvUrl: '', cycleStart: '', percentile: null, reason: '',
});

/**
 * One script: the header from the index line (cached from the list, or `head` of the messages file for a
 * direct link), then data/<id>_messages.json, _candles.json and _pinescript.json fetched in parallel.
 * Messages render in file order; consecutive messages with the same `iteration` form a dated section;
 * the rail groups codes by their first letter. Missing candles or code just hide their panels.
 */
export function RunView() {
  const id = useSearchParams().get('id') ?? '';
  const [head, setHead] = useState<IndexRow | null>(null);
  const [messages, setMessages] = useState<Loaded<MessagesFile>>(undefined);
  const [candles, setCandles] = useState<Loaded<CandlesFile>>(undefined);
  const [pine, setPine] = useState<Loaded<PinescriptFile>>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHead(id ? ioc.indexViewService.rowById(id) : null);
    setMessages(undefined); setCandles(undefined); setPine(undefined); setError(null);
    if (!id) return;
    (async () => {
      const [m, c, p] = await Promise.all([
        ioc.messagesViewService.getMessages(id),
        ioc.candlesViewService.getCandles(id),
        ioc.pinescriptViewService.getPinescript(id),
      ]);
      if (cancelled) return;
      if (m?.head) setHead(decodeLine(m.head));
      setMessages(m); setCandles(c); setPine(p);
    })().catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [id]);

  const trades = useMemo(() => candles?.trades ?? [], [candles]);
  const bars = useMemo(() => candles?.bars ?? [], [candles]);
  const equity = useMemo(() => candles?.equity ?? [], [candles]);
  const files = useMemo(() => (pine ? [{ name: 'source.pine', code: pine.source }] : null), [pine]);
  const blocks = useMemo(
    () => (messages?.messages ?? []).map((m, i) => ioc.markdownHelperService.render(m, trades, `blk-${m.iteration ?? 0}-${i}`)),
    [messages, trades],
  );
  const refs = useMemo(() => blocks.flatMap((b) => b.refs), [blocks]);
  const noRefs = blocks.filter((b) => !b.refs.length).length;

  const sections = useMemo(() => {
    const out: Section[] = [];
    for (const b of blocks) {
      const last = out[out.length - 1];
      if (last && last.iteration === b.iteration) last.blocks.push(b);
      else out.push({ iteration: b.iteration, date: b.date, blocks: [b] });
    }
    return out;
  }, [blocks]);

  const h = head ?? emptyHead(id);
  const usable = h.usable;
  const cycleStart = Date.parse(h.cycleStart);

  // Left navigation: groups come from messages.json (`groups`, in that order); a group that only shows up
  // in message codes is appended with its code as the title. Nothing about A–E is known here.
  const rail = useMemo<RailGroup[]>(() => {
    const declared = messages?.groups ?? [];
    const codes = [...new Set([...declared.map((g) => g.code), ...blocks.map((b) => b.group)])];
    return codes
      .map((code) => {
        const bs = blocks.filter((b) => b.group === code);
        const iterated = bs.length > 0 && bs.every((b) => b.iteration != null);
        const items = iterated
          ? [...new Set(bs.map((b) => b.iteration as number))].map((n) => ({ code: pad3(n), id: `iter-${n}` }))
          : bs.map((b) => ({ code: b.code || '•', id: b.key }));
        return { letter: code || NOTES, title: declared.find((g) => g.code === code)?.title ?? (code ? code : 'Notes'), items };
      })
      .filter((g) => g.items.length);
  }, [blocks, messages]);

  if (!id) return <div className="wrap"><div className="run-head"><h1>No script id</h1></div><p className="muted">Open a script from the list: /run/?id=…</p></div>;
  if (error) return <div className="wrap"><div className="run-head"><h1>{h.title}</h1></div><p className="muted">Could not load this script: {error}</p></div>;
  if (messages === null && !head) return <div className="wrap"><div className="run-head"><h1>Not found</h1></div><p className="muted">There is no script with id <code>{id}</code>.</p></div>;

  return (
    <div className="wrap">
      <div className="run-head">
        <h1>{h.title}</h1>
        <div className="tags">
          <span className="cat">{h.kind}</span>
          <span className="sub">{subLabel(h.kind, h.subcategory)}</span>
          {(h.market || h.timeframe) && <span>{h.market} {h.timeframe}</span>}
          {h.license && <span>{h.license}</span>}
          {h.tvUrl ? <a href={h.tvUrl} target="_blank" rel="noreferrer">by {h.author || 'author'} ↗</a> : h.author && <span>by {h.author}</span>}
          {h.updated && <span>updated {h.updated}</span>}
        </div>
      </div>

      <section className="hero">
        <div className="top-row">
          <div>
            <span className="label">Verdict</span>
            <div className="word-row">
              <span className={`word ${h.verdict}`}>{h.verdict}</span>
              {!usable && <span className="nt">not tradeable</span>}
            </div>
          </div>
          <div className="stats">
            {usable && h.expected && (
              <div className="stat"><span className="k">Expected per month on $10,000</span><span className="v">{usd(h.expected[0])} … {usd(h.expected[1])}</span><span className="d">{h.percentile != null ? `percentile vs. random entries: ${h.percentile}` : '25th–75th percentile of monthly results'}</span></div>
            )}
            {usable && h.main != null && (
              <div className="stat"><span className="k">12 months via alerts · C7</span><span className={`v ${sign(h.main)}`}>{usd0(10000 + h.main)}</span><span className="d">{usd(h.main)} on a $10,000 account</span></div>
            )}
            {usable && h.paper != null && (
              <div className="stat"><span className="k">Paper journal since cycle start</span><span className={`v ${sign(h.paper)}`}>{usd(h.paper)}</span><span className="d">{h.paperTrades} trades{h.cycleStart ? ` · since ${h.cycleStart}` : ''}</span></div>
            )}
            <div className="stat"><span className="k">Chart references in the text</span><span className="v">{messages === undefined ? '…' : refs.length}</span><span className="d">{messages === undefined ? 'loading' : noRefs ? `${noRefs} blocks without references` : 'every block references the chart'}</span></div>
          </div>
        </div>
        {h.reason && <p className="reason">{h.reason}</p>}
      </section>

      <div className="layout">
        <Rail groups={rail} />
        <div className="center">
          {files && (
            <section className="code-panel">
              <div className="bar"><b>source.pine</b><span>the author&apos;s script, as published</span><span className="ro">Pine Script · read-only</span></div>
              <PineCodeLoader files={files} />
            </section>
          )}
          {messages === undefined && <div className="empty">loading the agent&apos;s answers…</div>}
          {messages === null && <div className="empty">the agent has not written any answers for this script yet</div>}
          {sections.map((s, i) => (
            <div key={s.iteration == null ? `analysis-${i}` : `iter-${s.iteration}`}>
              {s.iteration == null
                ? <h2 className="sec">Analysis</h2>
                : <div className="iter-head" data-blk={`iter-${s.iteration}`}><h2>Iteration {pad3(s.iteration)}</h2><span>{s.date}</span></div>}
              <Answers blocks={s.blocks} />
            </div>
          ))}
        </div>
        <aside className="side">
          {bars.length
            ? <ChartPanelLoader timeframe={candles?.timeframe || h.timeframe} source={pine?.source ?? ''} rule={usable && pine?.rule ? pine.rule : ''} bars={bars} trades={trades} refs={refs} cycleStart={cycleStart} tvUrl={h.tvUrl || undefined} usable={usable} />
            : <div className="chart-panel" id="chart"><div className="chart-bar"><span className="hint">{candles === undefined ? 'loading chart…' : 'no candles for this script'}</span></div><div className="chart-host" /></div>}
          {equity.length > 1 && Number.isFinite(cycleStart) && <EquityChart points={equity} cycleStart={cycleStart} />}
        </aside>
      </div>
    </div>
  );
}
