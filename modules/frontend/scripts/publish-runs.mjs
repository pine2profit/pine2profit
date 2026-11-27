// prebuild: copies the files the browser needs from runs/<slug>/ into public/runs/<slug>/
// and writes public/runs/index.jsonl — one line per script, the only thing the list page downloads.
import { mkdirSync, readdirSync, copyFileSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

rmSync('public/runs', { recursive: true, force: true });
const rows = [];
for (const slug of readdirSync('runs')) {
  if (!existsSync(`runs/${slug}/meta.json`)) continue;
  mkdirSync(`public/runs/${slug}`, { recursive: true });
  // the chart needs bars; the trade markers come from the agent's rule run in the browser (rule.pine)
  for (const f of ['bars.json', 'rule.pine']) if (existsSync(`runs/${slug}/${f}`)) copyFileSync(`runs/${slug}/${f}`, `public/runs/${slug}/${f}`);
  const meta = JSON.parse(readFileSync(`runs/${slug}/meta.json`, 'utf8'));
  const verdict = JSON.parse(readFileSync(`runs/${slug}/verdict.json`, 'utf8'));
  rows.push({
    slug, title: meta.title, kind: meta.kind, subcategory: meta.subcategory ?? null,
    usable: meta.kind !== 'indicator' || meta.usable !== false,
    verdict: verdict.verdict, expected: verdict.expected_month_usd ?? null,
    main: verdict.main_number_usd ?? null, paper: verdict.paper_pnl_usd ?? null,
    paperTrades: verdict.paper_trades ?? 0, iterations: verdict.iterations ?? 1, updated: verdict.updated,
  });
}
rows.sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : a.title.localeCompare(b.title)));
writeFileSync('public/runs/index.jsonl', rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`published ${rows.length} runs → public/runs/ (+ index.jsonl)`);
