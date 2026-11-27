# Can money be made on this?

Static site (Next.js → HTML, GitHub Pages) that shows the output of an agent looping over Pine Script
indicators and strategies with one question: can money be made on them by trading their alerts.

Everything is read at runtime with plain GET from `data/` (the contract is in the repository README):
the list streams `data/index_1.jsonl`, `index_2.jsonl`, …; a script page `/run/?id=<id>` fetches
`data/<id>_messages.json`, `<id>_candles.json` and `<id>_pinescript.json`. Nothing is read at build time,
so the same build serves any `data/` folder — on GitHub Pages or from `npx pine2profit`.

## Layout

```
src/lib/core/{di,types,provide}.ts   di-kit container
src/lib/index.ts                     ioc — every service, `window.ioc` in the browser
src/lib/services/base/LoggerService  no-op logger; `ioc.loggerService.setLogger(console)` to trace
src/lib/services/base/ChartService   goto / reset / theme subjects — the channel from text to chart
src/lib/services/base/LinkService    every link in the agent's text: chart references → ChartService, others → new tab
src/lib/services/helpers/MarkdownHelperService   markdown-it + [[t:…]] [[range:…]] [[trade:N]] and [text](ref:…) → <a class="ref" data-ref>
src/lib/services/view/IndexViewService      index_N.jsonl chunks, streamed, deduplicated by id, pushed to subscribers
src/lib/services/view/{Messages,Candles,Pinescript}ViewService   one file per id, cached for the session, 404 → null
src/lib/types.ts                     IndexLine (a jsonl line), IndexRow, Message, CandlesFile, PinescriptFile, ChartRef, Block
src/components/RunsList.tsx          list: filters, sorting, VirtuosoGrid
src/components/RunView.tsx           script page: header, verdict, rail, code, messages, chart, P&L
src/components/ChartPanel.tsx        Vela: bars, author's script, trade rule, reference marks, ChartService.goto
src/components/Answers.tsx           rendered messages; clicks go to LinkService
src/app/page.tsx                     list page
src/app/run/page.tsx                 script page (the id is in the query string)
```

## Commands

```bash
npm install
npm run dev        # http://localhost:3000 — put a data/ folder into public/ or proxy /data to the local server
npm run build      # static export to out/
```

## GitHub Pages

Build with `NEXT_PUBLIC_BASE_PATH=/<repo>` and publish `out/` together with `data/` copied into `out/data/`.
For a root site (`<owner>.github.io`) leave `NEXT_PUBLIC_BASE_PATH` empty.
