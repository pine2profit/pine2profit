import MarkdownIt from 'markdown-it';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';
import { inject } from '../../core/di';
import { TYPES } from '../../core/types';
import LoggerService from '../base/LoggerService';
import type { Block, ChartRef, Message, Trade } from '../../types';

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

/**
 * Chart references the agent writes inside its markdown:
 *   [[t:2026-11-12T14:00Z]]            a bar (time)
 *   [[t:2026-11-12T14:00Z@41820]]      a bar and a price
 *   [[range:2026-11-01T00:00Z..2026-11-08T00:00Z]]   a time range — the chart frames the segment
 *   [[trade:12]]                       a trade from the candles file
 * The same body also works as a link target: [see the breakout](ref:range:…..…).
 * Each becomes <a class="ref" data-ref="{…}"> that LinkService routes to the chart.
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

interface RenderContext {
  trades: Trade[];
  block: string;
  refs: ChartRef[];
}

const refAnchor = (md: MarkdownIt, r: ChartRef, inner: string) => {
  const data = md.utils.escapeHtml(JSON.stringify(r));
  return `<a class="ref ref-${r.kind}" href="#chart" data-ref="${data}" title="show on chart"><i></i>${inner}`;
};

function chartRefPlugin(md: MarkdownIt, ctx: RenderContext) {
  // [[…]] inline syntax
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
    return `${refAnchor(md, r, md.utils.escapeHtml(r.label))}</a>`;
  };

  // [text](ref:…) links → the same anchor; everything else opens in a new tab
  const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') ?? '';
    if (href.startsWith('ref:')) {
      const ref = parseRef(href.slice(4), ctx.trades, ctx.block);
      if (ref) {
        ctx.refs.push(ref);
        return refAnchor(md, ref, '');
      }
    }
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noreferrer');
    return defaultLinkOpen(tokens, idx, options, env, self);
  };
}

/** Renders one message of data/<id>_messages.json into HTML and collects its chart references. */
export class MarkdownHelperService {
  private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public render = (message: Message, trades: Trade[], key: string): Block => {
    this.loggerService.log('markdownHelperService render', { key, code: message.code });
    const code = message.code ?? '';
    const refs: ChartRef[] = [];
    const md = new MarkdownIt({ html: false, linkify: true, breaks: false });
    md.use(chartRefPlugin, { trades, block: code || key, refs });
    return {
      key,
      code,
      title: message.title,
      html: md.render(message.md ?? ''),
      md: message.md ?? '',
      refs,
      iteration: message.iteration ?? null,
      date: message.date,
    };
  };
}

export default MarkdownHelperService;
