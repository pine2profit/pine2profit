import Link from 'next/link';
import type { IndexRow } from '@/lib/types';
import { subLabel } from '@/lib/taxonomy';
import { usd } from '@/lib/base';

const sign = (v: number) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');

export function RunCard({ row: r }: { row: IndexRow }) {
  const kindLabel = `${r.kind} · ${subLabel(r.kind, r.subcategory).toLowerCase()}${r.usable ? '' : ' · not tradeable'}`;
  return (
    <Link className="card" href={`/run/?id=${encodeURIComponent(r.id)}`}>
      <div>
        <div className="row"><span className="kind">{kindLabel}</span><span className={`verdict ${r.verdict}`}>{r.verdict}</span></div>
        <h2>{r.title}</h2>
      </div>
      {r.usable && r.main != null ? (
        <div className="metrics">
          <div><span className="k">12 months via alerts</span><span className={`v ${sign(r.main)}`}>{usd(r.main)}</span></div>
          <div><span className="k">Paper journal</span><span className={`v ${sign(r.paper ?? 0)}`}>{r.paper != null ? usd(r.paper) : '—'}</span><span className="sub">{r.paperTrades} trades</span></div>
          <div className="span"><span className="k">Expected per month on $10,000</span><span className="v small">{r.expected ? `${usd(r.expected[0])} … ${usd(r.expected[1])}` : '—'}</span></div>
        </div>
      ) : (
        <div className="note">{r.reason || 'Not tradeable: no signal is final at bar close, so there is no rule to run and nothing to count.'}</div>
      )}
      <div className="foot"><span>{r.iterations} iteration{r.iterations === 1 ? '' : 's'}</span><span>updated {r.updated}</span></div>
    </Link>
  );
}
