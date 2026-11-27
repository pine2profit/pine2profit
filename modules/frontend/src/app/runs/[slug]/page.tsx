import { notFound } from 'next/navigation';
import { allRuns, runBySlug, analysisBlocks, cycleBlocks, allRefs, isUsable, c4Percentile } from '@/lib/runs';
import { usd, usd0 } from '@/lib/base';
import { subLabel } from '@/lib/taxonomy';
import { ChartPanelLoader } from '@/components/ChartPanelLoader';
import { PineCodeLoader } from '@/components/PineCodeLoader';
import { Answers } from '@/components/Answers';
import { EquityChart } from '@/components/EquityChart';
import { Rail, type RailGroup } from '@/components/Rail';

export const dynamicParams = false;
export function generateStaticParams() {
  return allRuns().map((r) => ({ slug: r.slug }));
}

const pad3 = (n: number) => String(n).padStart(3, '0');
const sign = (v: number) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');

export default async function RunPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const run = runBySlug(slug);
  if (!run) notFound();
  const { meta, verdict } = run;
  const usable = isUsable(run);
  const analysis = analysisBlocks(run);
  const cycle = cycleBlocks(run);
  const refs = allRefs(run);
  const noRefs = run.iterations.flatMap((i) => i.blocks).filter((b) => !b.refs.length).length;
  const cycleStart = Date.parse(meta.cycle_start);
  const pct = c4Percentile(run);
  const em = verdict.expected_month_usd, main = verdict.main_number_usd, paper = verdict.paper_pnl_usd;

  const GT: Record<string, string> = { A: 'What it is', B: meta.kind === 'strategy' ? 'Tester vs. alerts' : 'Signal → trade', C: 'Money', D: 'Verdict' };
  const rail: RailGroup[] = ['A', 'B', 'C', 'D']
    .map((L) => ({ letter: L, title: GT[L], items: analysis.filter((b) => b.code.startsWith(L)).map((b) => ({ code: b.code, id: `blk-${b.code}-${b.iteration}` })) }))
    .filter((g) => g.items.length);
  if (cycle.length) rail.push({ letter: 'E', title: 'Iterations', items: cycle.map((it) => ({ code: pad3(it.n), id: `iter-${it.n}` })) });

  return (
    <div className="wrap">
      <div className="run-head">
        <h1>{meta.title}</h1>
        <div className="tags">
          <span className="cat">{meta.kind}</span>
          <span className="sub">{subLabel(meta.kind, meta.subcategory)}</span>
          <span>{meta.market} {meta.timeframe}</span>
          <span>{meta.license}</span>
          <a href={meta.tv_url} target="_blank" rel="noreferrer">by {meta.author} ↗</a>
          <span>updated {verdict.updated}</span>
        </div>
      </div>

      <section className="hero">
        <div className="top-row">
          <div>
            <span className="label">Verdict</span>
            <div className="word-row">
              <span className={`word ${verdict.verdict}`}>{verdict.verdict}</span>
              {!usable && <span className="nt">not tradeable</span>}
            </div>
          </div>
          <div className="stats">
            {usable && em && (
              <div className="stat"><span className="k">Expected per month on $10,000</span><span className="v">{usd(em[0])} … {usd(em[1])}</span><span className="d">{pct ? `percentile vs. random entries: ${pct}` : '25th–75th percentile of monthly results'}</span></div>
            )}
            {usable && main != null && (
              <div className="stat"><span className="k">12 months via alerts · C7</span><span className={`v ${sign(main)}`}>{usd0(10000 + main)}</span><span className="d">{usd(main)} on a $10,000 account</span></div>
            )}
            {usable && paper != null && (
              <div className="stat"><span className="k">Paper journal since cycle start</span><span className={`v ${sign(paper)}`}>{usd(paper)}</span><span className="d">{verdict.paper_trades} trades · since {meta.cycle_start.slice(0, 10)}</span></div>
            )}
            <div className="stat"><span className="k">Chart references in the text</span><span className="v">{refs.length}</span><span className="d">{noRefs ? `${noRefs} blocks without references` : 'every block references the chart'}</span></div>
          </div>
        </div>
        <p className="reason">{verdict.reason}</p>
      </section>

      <div className="layout">
        <Rail groups={rail} />
        <div className="center">
          <section className="code-panel">
            <div className="bar"><b>source.pine</b><span>the author&apos;s script, as published</span><span className="ro">Pine Script · read-only</span></div>
            <PineCodeLoader files={[{ name: 'source.pine', code: run.source }]} />
          </section>
          <h2 className="sec">Analysis</h2>
          <Answers blocks={analysis} />
          {cycle.map((it) => (
            <div key={it.n}>
              <div className="iter-head" data-blk={`iter-${it.n}`}><h2>Iteration {pad3(it.n)}</h2><span>{it.date}</span></div>
              <Answers blocks={it.blocks} />
            </div>
          ))}
        </div>
        <aside className="side">
          <ChartPanelLoader slug={run.slug} timeframe={meta.timeframe} source={run.source} rule={usable ? run.rule : ''} trades={run.trades} refs={refs} cycleStart={cycleStart} tvUrl={meta.tv_url} usable={usable} />
          {run.equity.length > 1 && <EquityChart points={run.equity} cycleStart={cycleStart} />}
        </aside>
      </div>
    </div>
  );
}
