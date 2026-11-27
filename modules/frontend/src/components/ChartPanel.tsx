'use client';

import { useEffect, useRef, useState } from 'react';
import { withBase, usd } from '@/lib/base';
import type { ChartRef, Trade } from '@/lib/types';
import { THEME_EVENT, currentTheme, type Theme } from './ThemeToggle';
import type { ThemeId, UiTheme, VelaTheme } from '@luxalgo/vela';

/** What `new Vela(host, { theme })` accepts: a built-in id or a full theme object. */
type VelaThemeOption = ThemeId | VelaTheme | UiTheme;

export const GOTO_EVENT = 'pm:goto';
export const RESET_EVENT = 'pm:reset';

interface Props {
  slug: string;
  timeframe: string;
  source: string;
  /** the agent's trade rule as a Pine strategy; empty when the indicator is not tradeable */
  rule: string;
  trades: Trade[];
  refs: ChartRef[];
  cycleStart: number;
  tvUrl?: string;
  usable: boolean;
}

const TF_MS: Record<string, number> = { '1m': 60e3, '5m': 300e3, '15m': 900e3, '30m': 1800e3, '1h': 3600e3, '4h': 14400e3, '1D': 86400e3, D: 86400e3 };

/** Site palette for the chart canvas — the same values as the tokens in globals.css. */
const PALETTE = {
  light: { bg: '#ffffff', grid: '#f0f0f3', text: '#8e8e9b', up: '#13a35e', down: '#e5484d', accent: '#ff6a1a', warn: '#c99200' },
  dark: { bg: '#18181d', grid: '#24242b', text: '#6c6c79', up: '#3fd68a', down: '#ff6b6b', accent: '#ff7a2e', warn: '#f2c14e' },
};

/**
 * Vela theme in the site's palette. `createTheme` derives a full theme (canvas, axes, chrome tokens) from a few
 * colors; check the field names against the installed Vela's docs/user/options.md ("createTheme") — if the
 * call fails we fall back to the built-in 'light' / 'dark' themes so the chart always renders.
 */
async function velaTheme(t: Theme): Promise<VelaThemeOption> {
  const p = PALETTE[t];
  try {
    const mod = (await import('@luxalgo/vela')) as unknown as { createTheme?: (o: Record<string, unknown>) => VelaThemeOption };
    if (typeof mod.createTheme === 'function') {
      return mod.createTheme({ base: t, background: p.bg, grid: p.grid, text: p.text, upColor: p.up, downColor: p.down, accent: p.accent, font: 'JetBrains Mono, ui-monospace, monospace' });
    }
  } catch { /* fall back below */ }
  return t;
}

/**
 * Vela chart with the author's script and the agent's trade rule (strategy → fill markers; a separate pane
 * appears automatically for overlay=false indicators). Every chart reference in the agent's text is pinned
 * as a timeline mark; clicking a reference in the text (window event `pm:goto`) frames the chart on it.
 */
export default function ChartPanel({ slug, timeframe, source, rule, trades, refs, cycleStart, tvUrl, usable }: Props) {
  const host = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const focusIds = useRef<string[]>([]);
  const [status, setStatus] = useState('loading chart…');
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<ChartRef | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any = null;
    const tf = TF_MS[timeframe] ?? 3600e3;
    let pal = PALETTE[currentTheme()];

    const clearFocus = () => {
      for (const id of focusIds.current) { try { chart?.drawings.remove(id); } catch { /* ignore */ } }
      focusIds.current = [];
      try { chart?.renderer.setExternalCrosshair(null); } catch { /* ignore */ }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keep = (d: any) => { if (d?.id) { focusIds.current.push(d.id); try { chart.drawings.lock(d.id); } catch { /* ignore */ } } };

    const goto = (r: ChartRef) => {
      if (!chart) return;
      clearFocus();
      setFocus(r);
      const A = pal.accent, W = pal.warn;
      if (r.kind === 't' && r.time != null) {
        chart.setVisibleRange({ from: r.time - 90 * tf, to: r.time + 40 * tf });
        if (r.price != null) {
          keep(chart.drawings.add('crossline', { paneId: 'price', anchors: [{ time: r.time, price: r.price }], style: { lineColor: A, lineWidth: 1, lineStyle: 'dashed' } }));
          keep(chart.drawings.add('pricelabel', { paneId: 'price', anchors: [{ time: r.time, price: r.price }], style: { lineColor: A, lineWidth: 1, lineStyle: 'solid', fillColor: A, fillOpacity: 0.9 } }));
          try { chart.renderer.setExternalCrosshair(r.time, r.price); } catch { /* ignore */ }
        } else {
          keep(chart.drawings.add('vline', { paneId: 'price', anchors: [{ time: r.time, price: 0 }], style: { lineColor: A, lineWidth: 2, lineStyle: 'dashed' }, text: { value: r.block, size: 'small' } }));
        }
      } else if (r.kind === 'range' && r.from != null && r.to != null) {
        chart.setVisibleRange({ from: r.from - 10 * tf, to: r.to + 10 * tf });
        for (const t of [r.from, r.to]) keep(chart.drawings.add('vline', { paneId: 'price', anchors: [{ time: t, price: 0 }], style: { lineColor: A, lineWidth: 2, lineStyle: 'dashed' } }));
      } else if (r.kind === 'trade' && r.trade != null) {
        const t = trades.find((x) => x.id === r.trade);
        if (!t) return;
        const end = t.close_time ?? t.open_time + 10 * tf, endPrice = t.close_price ?? t.open_price;
        const span = Math.max(end - t.open_time, 10 * tf);
        chart.setVisibleRange({ from: t.open_time - Math.max(30 * tf, span * 0.6), to: end + Math.max(30 * tf, span * 0.6) });
        const col = t.pnl_usd >= 0 ? pal.up : pal.down;
        keep(chart.drawings.add('box', {
          paneId: 'price',
          anchors: [{ time: t.open_time, price: t.open_price }, { time: end, price: endPrice }],
          style: { lineColor: col, lineWidth: 2, lineStyle: 'solid', fillColor: col, fillOpacity: 0.12 },
          text: { value: `#${t.id} ${usd(t.pnl_usd)}`, size: 'small' },
        }));
        keep(chart.drawings.add('arrowmarkup', { paneId: 'price', anchors: [{ time: t.open_time, price: t.open_price }] }));
        if (t.close_time != null) keep(chart.drawings.add('arrowmarkdown', { paneId: 'price', anchors: [{ time: t.close_time, price: endPrice }] }));
        try { chart.renderer.setExternalCrosshair(t.open_time, t.open_price); } catch { /* ignore */ }
        void W;
      }
    };

    const onGoto = (e: Event) => goto((e as CustomEvent<ChartRef>).detail);
    const onReset = () => { clearFocus(); setFocus(null); chart?.setVisibleRangePreset?.('ALL'); };
    const onTheme = async (e: Event) => { const t = (e as CustomEvent<Theme>).detail; pal = PALETTE[t]; try { chart?.setTheme(await velaTheme(t)); } catch { /* ignore */ } };
    const onResize = () => { try { chart?.resize(); } catch { /* ignore */ } };
    window.addEventListener(GOTO_EVENT, onGoto);
    window.addEventListener(RESET_EVENT, onReset);
    window.addEventListener(THEME_EVENT, onTheme);
    window.addEventListener('resize', onResize);

    (async () => {
      const [{ Vela }, { PineEngine }, theme] = await Promise.all([import('@luxalgo/vela'), import('@luxalgo/vela-pinets'), velaTheme(currentTheme())]);
      const bars = await fetch(withBase(`/runs/${slug}/bars.json`)).then((r) => r.json());
      if (cancelled || !host.current) return;
      host.current.innerHTML = '';
      chart = new Vela(host.current, { data: bars, timeframe, theme, height: '100%' });
      try { chart.renderer.set('attribution', false); } catch { /* ignore */ }
      chartRef.current = chart;
      chart.registerEngine('pine', new PineEngine());
      await chart.ready();
      if (cancelled) return;

      setStatus('running the author\'s script…');
      const a = await chart.runIndicator(source, { language: 'pine' });
      if (!a.ok) setError(`author's script: ${a.error?.message ?? a.error}`);
      if (rule.trim()) {
        setStatus('running the trade rule…');
        const b = await chart.runIndicator(rule, { language: 'pine' });
        if (!b.ok) setError((e) => `${e ? e + '\n' : ''}trade rule: ${b.error?.message ?? b.error}`);
      }
      if (cancelled) return;

      try {
        const d = chart.drawings.add('vline', { paneId: 'price', anchors: [{ time: cycleStart, price: 0 }], style: { lineColor: pal.warn, lineWidth: 2, lineStyle: 'dotted' }, text: { value: 'cycle start', size: 'small' } });
        if (d?.id) chart.drawings.lock(d.id);
      } catch { /* ignore */ }

      // every reference the agent made → a timeline mark
      try {
        chart.marks.defineGroup({ id: 'agent', label: 'Agent references' });
        refs.forEach((r, i) => {
          const time = r.kind === 'trade' ? trades.find((t) => t.id === r.trade)?.open_time : r.kind === 'range' ? r.from : r.time;
          if (time == null) return;
          chart.marks.add({
            id: `ref-${i}`, time, group: 'agent', title: `${r.block}: ${r.label}`, tooltip: `${r.block} · ${r.label}`,
            glyph: { shape: 'circle', color: r.kind === 'trade' ? pal.warn : pal.accent, letter: r.block.charAt(0) },
            content: { text: `${r.block} — ${r.label}` },
          });
        });
        chart.on('mark:click', ({ id }: { id: string }) => { const r = refs[Number(String(id).replace('ref-', ''))]; if (r) goto(r); });
      } catch { /* marks are optional */ }

      setStatus(usable
        ? `${trades.length} rule trades on the chart · ${refs.length} agent references marked above the time axis`
        : `no trade rule — the signal is not tradeable (A2) · ${refs.length} agent references marked above the time axis`);
    })().catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });

    return () => {
      cancelled = true;
      window.removeEventListener(GOTO_EVENT, onGoto);
      window.removeEventListener(RESET_EVENT, onReset);
      window.removeEventListener(THEME_EVENT, onTheme);
      window.removeEventListener('resize', onResize);
      try { chart?.destroy?.(); } catch { /* ignore */ }
    };
  }, [slug, timeframe, source, rule, trades, refs, cycleStart, usable]);

  return (
    <div className="chart-panel" id="chart">
      <div className="chart-bar">
        {focus
          ? <><span className="focus"><b>{focus.block}</b><span>{focus.label}</span></span><button className="pill-btn" onClick={() => window.dispatchEvent(new Event(RESET_EVENT))}>reset</button></>
          : <span className="hint">click a reference in the text — the chart jumps there</span>}
        {tvUrl && <a className="tv" href={tvUrl} target="_blank" rel="noreferrer">Open on TradingView ↗</a>}
      </div>
      <div ref={host} className="chart-host" />
      <div className={`chart-status${error ? ' error' : ''}`}>{error ?? status}</div>
    </div>
  );
}
