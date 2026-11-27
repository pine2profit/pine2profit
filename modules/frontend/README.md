# Can money be made on this?

Static site (Next.js → HTML, GitHub Pages) that shows the output of an agent looping over Pine Script
indicators and strategies with one question: can money be made on them by trading their alerts.
The agent's protocol and data contract live in `PLAN.md`; contract changes made during the redesign are listed at the end of this file.

The list page is a card grid virtualised with `react-virtuoso` (`VirtuosoGrid`, 60 more cards per "reached the bottom"),
fed by `public/runs/index.jsonl` (one JSON object per line, streamed as it downloads). The script page: the verdict as one
band, A–E navigation on the left, the author's code in Ace, the agent's blocks in the centre, a sticky Vela chart and the
P&L line on the right. Every `[[t:…]]`, `[[range:…]]`, `[[trade:N]]` in the agent's text is a button: the chart frames that bar, period or trade.

## Layout

```
PLAN.md                        agent protocol, rules, data contract
runs/<slug>/                   one script = one folder (PLAN.md §5 + changes below)
scripts/publish-runs.mjs       prebuild: copies bars.json and rule.pine into public/runs/<slug>/,
                               writes public/runs/index.jsonl
src/lib/taxonomy.ts            categories and subcategories
src/lib/markdown.ts            markdown-it + the [[…]] rule → <a class="ref" data-ref="…">
src/lib/runs.ts                reads runs/ at build time, blocks A–E per iteration, C4 percentile
src/components/RunsList.tsx    list: streams index.jsonl, filters, sorting, VirtuosoGrid
src/components/RunCard.tsx     one card
src/components/Rail.tsx        A–E navigation with scroll-spy
src/components/ChartPanel.tsx  Vela: bars, author's script, trade rule, reference marks, pm:goto;
                               chart theme from createTheme() in the site palette
src/components/PineCode.tsx    Ace (bundled from node_modules) + a Pine highlighter mode
src/components/EquityChart.tsx P&L line: backtest → paper journal
src/app/page.tsx               list page
src/app/runs/[slug]/page.tsx   script page
```

## Commands

```bash
npm install
npm run dev        # predev publishes runs/ → public/runs/
npm run build      # static export to out/
npm run preview
```

## GitHub Pages

Push to `main` → the workflow builds with `NEXT_PUBLIC_BASE_PATH=/<repo>` and publishes `out/`. In the repository
settings → Pages choose "GitHub Actions" as the source. For a root site (`<owner>.github.io`) remove `NEXT_PUBLIC_BASE_PATH` from the workflow.

## Adding a script

The agent writes `runs/<slug>/` per the contract. Pages and `index.jsonl` are generated at build time.
Only `bars.json` and `rule.pine` reach the browser (the chart needs them); `trades.json`, `equity.json`,
`source.pine` and the answers are embedded into the page at build time — the site links to no files.

## Data-contract changes (relative to PLAN.md)

- `meta.json`: `subcategory` — a key from `src/lib/taxonomy.ts`, assigned by the agent in A1.
  Indicators: `trend · oscillator · volatility · volume · structure · signals` (what the script computes and draws).
  Strategies: `trend-following · mean-reversion · breakout · grid-dca · pattern-event · composite` (entry/exit logic).
- `meta.json`, indicators: `usable: boolean` and `usable_reason` — the A2 result (is any signal final at bar close
  and placeable in an alert). When `usable: false` the agent skips B and C, writes D1/D4/D5 and E; the page shows
  "NO · not tradeable", no trade rule, no P&L.
- `verdict.json`: `expected_month_usd`, `main_number_usd`, `paper_pnl_usd` are `null` for a non-tradeable indicator.
  `confidence` is gone — the C4 percentile against 1000 random-entry runs is shown instead (a computed number).
  D2's "the agent's estimate of how likely the edge is real" should be dropped from PLAN.md accordingly.
- A0 must contain the trade rule in one sentence (entry, exit, execution, costs) — `meta.rule` is no longer shown.
- The "profitable only (main number > 0)" filter is gone: C7 is a historical backtest number; the verdict filter covers it.
- `equity.json` may be `[]` and `trades.json` `[]` for non-tradeable indicators.
