import MarkdownIt from 'markdown-it';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';
import type { Block, ChartRef, Trade } from './types';

/**
 * Chart references the agent writes inside its markdown:
 *   [[t:2026-11-12T14:00Z]]            a bar (time)
 *   [[t:2026-11-12T14:00Z@41820]]      a bar and a price
 *   [[range:2026-11-01T00:00Z..2026-11-08T00:00Z]]   a time range
 *   [[trade:12]]                       a trade from trades.json
 * Each becomes <a class="ref" data-ref="{…}"> that the chart panel listens to.
 */
export function parseRef(body: string, trades: Trade[], block: string): ChartRef | null {
  const m = /^(t|range|trade):(.+)$/.exec(body.trim());
  if (!m) return null;
  const [, kind, rest] = m;
  if (kind === 't') {
    const [ts, price] = rest.split('@');
    const time = Date.parse(ts);
    if (Number.isNaN(time)) return null;
    const p = price != null ? Number(price) : undefined;
    return { kind: 't', block, time, price: p, label: fmtTime(time) + (p != null && !Number.isNaN(p) ? ` @ ${fmtPrice(p)}` : '') };
  }
  if (kind === 'range') {
    const [a, b] = rest.split('..');
    const from = Date.parse(a), to = Date.parse(b);
    if (Number.isNaN(from) || Number.isNaN(to)) return null;
    return { kind: 'range', block, from, to, label: `${fmtDay(from)} → ${fmtDay(to)}` };
  }
  const id = Number(rest);
  const t = trades.find((x) => x.id === id);
  if (!t) return { kind: 'trade', block, trade: id, label: `trade #${id} (not in journal)` };
  return { kind: 'trade', block, trade: id, time: t.open_time, label: `#${id} ${t.side} ${t.pnl_usd >= 0 ? '+' : '−'}$${Math.abs(Math.round(t.pnl_usd))}` };
}

const pad = (n: number) => String(n).padStart(2, '0');
export function fmtTime(t: number) {
  const d = new Date(t);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${String(d.getUTCFullYear()).slice(2)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
export function fmtDay(t: number) {
  const d = new Date(t);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${String(d.getUTCFullYear()).slice(2)}`;
}
export function fmtPrice(p: number) {
  return p >= 1000 ? Math.round(p).toLocaleString('en-US') : p >= 10 ? p.toFixed(2) : p.toFixed(4);
}

function chartRefPlugin(md: MarkdownIt, ctx: { trades: Trade[]; block: string; refs: ChartRef[] }) {
  md.inline.ruler.before('link', 'chartref', (state: StateInline, silent: boolean) => {
    const src = state.src;
    if (src.charCodeAt(state.pos) !== 0x5b || src.charCodeAt(state.pos + 1) !== 0x5b) return false;
    const end = src.indexOf(']]', state.pos + 2);
    if (end < 0) return false;
    const ref = parseRef(src.slice(state.pos + 2, end), ctx.trades, ctx.block);
    if (!ref) return false;
    if (!silent) {
      const token = state.push('chartref', 'a', 0);
      token.meta = ref;
      ctx.refs.push(ref);
    }
    state.pos = end + 2;
    return true;
  });
  md.renderer.rules.chartref = (tokens, i) => {
    const r = tokens[i].meta as ChartRef;
    const data = md.utils.escapeHtml(JSON.stringify(r));
    return `<a class="ref ref-${r.kind}" href="#chart" data-ref="${data}" title="show on chart"><i></i>${md.utils.escapeHtml(r.label)}</a>`;
  };
}

/** Splits an answers/NNN.md file into blocks by `### <code> <title>` headings and renders each. */
export function renderAnswers(markdown: string, trades: Trade[], iteration: number): { date: string; blocks: Block[] } {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const dateMatch = /— (\d{4}-\d{2}-\d{2})\s*$/.exec(lines.find((l) => l.startsWith('# ')) ?? '');
  const date = dateMatch?.[1] ?? '';
  const blocks: Block[] = [];
  let cur: { code: string; title: string; body: string[] } | null = null;
  const flush = () => {
    if (!cur) return;
    const refs: ChartRef[] = [];
    const md = new MarkdownIt({ html: false, linkify: true, breaks: false });
    md.use(chartRefPlugin, { trades, block: cur.code, refs });
    const raw = cur.body.join('\n');
    blocks.push({ code: cur.code, title: cur.title, html: md.render(raw), md: raw, refs, iteration });
  };
  for (const line of lines) {
    const h = /^###\s+([A-E]′?\d+)\s+(.*)$/.exec(line);
    if (h) { flush(); cur = { code: h[1], title: h[2].trim(), body: [] }; continue; }
    if (cur) cur.body.push(line);
  }
  flush();
  return { date, blocks };
}
