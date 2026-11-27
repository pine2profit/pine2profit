import type { EquityPoint } from '@/lib/types';
import { usd } from '@/lib/base';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** One line: backtest P&L in $ up to the cycle start, then the paper journal. */
export function EquityChart({ points, cycleStart }: { points: EquityPoint[]; cycleStart: number }) {
  const W = 640, H = 210, L = 62, R = 18, T = 20, B = 28;
  const back = points.filter((p) => p.backtest_usd != null).map((p) => ({ t: p.time, v: p.backtest_usd as number }));
  const lastBack = back[back.length - 1]?.v ?? 0;
  const paper = points.filter((p) => p.paper_usd != null).map((p) => ({ t: p.time, v: lastBack + (p.paper_usd as number) }));
  const all = [...back, ...paper];
  if (!all.length) return null;
  const t0 = all[0].t, t1 = all[all.length - 1].t;
  const vs = all.map((p) => p.v);
  const lo = Math.min(0, ...vs), hi = Math.max(0, ...vs);
  const pad = (hi - lo) * 0.12 || 100;
  const x = (t: number) => L + ((W - L - R) * (t - t0)) / Math.max(1, t1 - t0);
  const y = (v: number) => T + ((hi + pad - v) / (hi - lo + 2 * pad)) * (H - T - B);
  const path = (pts: { t: number; v: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = back.length ? `${path(back)} L${x(back[back.length - 1].t).toFixed(1)},${y(0).toFixed(1)} L${x(back[0].t).toFixed(1)},${y(0).toFixed(1)} Z` : '';
  const ticks: number[] = [];
  { const d = new Date(t0); let m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); while (m.getTime() < t1) { if (m.getUTCMonth() % 3 === 0) ticks.push(m.getTime()); m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1)); } }
  const yt = [...new Set([lo, 0, hi])];
  const last = paper.length ? paper[paper.length - 1] : back[back.length - 1];
  return (
    <div className="equity">
      <div className="eq-head"><b>P&amp;L on $10,000</b><span>backtest → paper journal</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Equity">
        <defs><linearGradient id="pm-eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--acc)" stopOpacity="0.22" /><stop offset="100%" stopColor="var(--acc)" stopOpacity="0" /></linearGradient></defs>
        {yt.map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className={v === 0 ? 'zero' : 'grid'} /><text x={L - 8} y={y(v) + 3} textAnchor="end" className="ax">{usd(v)}</text></g>)}
        {ticks.map((t) => <text key={t} x={x(t)} y={H - 8} textAnchor="middle" className="ax">{MON[new Date(t).getUTCMonth()]} ’{String(new Date(t).getUTCFullYear()).slice(2)}</text>)}
        {area && <path d={area} fill="url(#pm-eqg)" />}
        <line x1={x(cycleStart)} x2={x(cycleStart)} y1={T - 4} y2={H - B} className="cycle" />
        <text x={x(cycleStart) - 6} y={T + 4} textAnchor="end" className="ax" fill="var(--warn)" style={{ fill: 'var(--warn)' }}>cycle start</text>
        <path d={path(back)} className="back" fill="none" strokeLinejoin="round" />
        {paper.length > 1 && <path d={path(paper)} className="paper" fill="none" strokeLinejoin="round" />}
        <circle cx={x(last.t)} cy={y(last.v)} r={3.5} fill={paper.length ? 'var(--warn)' : 'var(--acc)'} />
        <text x={x(last.t) - 8} y={y(last.v) - 9} textAnchor="end" className="ax" style={{ fill: 'var(--t1)', fontWeight: 700, fontSize: 12.5 }}>{usd(last.v)}</text>
      </svg>
      <div className="eq-legend"><span><i className="sw back" />backtest</span><span><i className="sw paper" />paper journal</span></div>
    </div>
  );
}
