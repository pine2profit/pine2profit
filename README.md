# pine2profit

An agent loops over TradingView Pine Script indicators and strategies with one question: can money be made
on them by trading their alerts. This repo is the site that shows its reports and the tool to preview them.

- `modules/frontend` — the site (Next.js, static export). It reads everything with plain GET from `data/`,
  so the same build works on GitHub Pages and from the local server.
- `src/` — the local preview server and the `pine2profit` CLI: the built site from this package plus
  `GET /data/**/*` from `<dir>/data`. Nothing else, no API with a body.
- `data/` — what the agent writes. The three scripts in here are the reference for the format.

```bash
npm install
npm start                      # builds modules/frontend, copies it into build/, serves ./data on http://localhost:60050
npx pine2profit <dir> --port 60050 --host 0.0.0.0   # dir = folder that contains data/, required
npx pine2profit --help                              # the data contract with JSON examples
```

## data/ — the contract

All files are flat in one folder. `id` is a slug (`[a-z0-9-]+`) and prefixes the per-script files.

### `data/index_1.jsonl`, `index_2.jsonl`, …

The list. One JSON object per line, one script per object. The site reads `index_1`, then `index_2`, and
so on until a file is missing (404). Keep a chunk around 1000 lines. A later line with the same `id`
replaces the earlier one, so updates can be appended to the last chunk without rewriting old ones.

Required: `id`, `title`, `kind` (`indicator` | `strategy`), `verdict` (`YES` | `NO` | `UNKNOWN`), `updated`
(`YYYY-MM-DD`). Dollars are integers on a notional $10,000 account. Leave a field out when it is null.

```json
{"id":"sma-cross-20-50","title":"SMA Cross 20/50","kind":"strategy","subcategory":"trend-following","verdict":"NO",
 "main":-2465,"paper":461,"paperTrades":3,"expected":[-599,181],"iterations":3,"updated":"2026-11-26",
 "market":"BTCUSDT","timeframe":"1h","license":"MPL-2.0","author":"example_author",
 "tvUrl":"https://www.tradingview.com/script/EXAMPLE02/","cycleStart":"2026-11-12","percentile":59,
 "reason":"12 months −$2,465; only 4/10 markets positive; not better than random entries (59th percentile)"}
```

| field | meaning |
|---|---|
| `subcategory` | any key; the list builds its filter chips from the values it sees, known keys from `modules/frontend/src/lib/taxonomy.ts` get a label |
| `usable` | `false` when no signal is final at bar close (indicators): the page shows "not tradeable", no rule, no money |
| `main` | 12 months via alerts, $ |
| `paper`, `paperTrades` | paper journal since `cycleStart`, $ and number of trades |
| `expected` | expected per month, `[low, high]` |
| `iterations` | how many iterations the agent has run |
| `market`, `timeframe`, `license`, `author`, `tvUrl` | header chips and the author link |
| `cycleStart` | `YYYY-MM-DD`, drawn on the chart and the P&L line |
| `percentile` | the rule's percentile against random entries |
| `reason` | one sentence under the verdict |

### `data/<id>_messages.json`

```json
{ "head": { "...the same object as the index line..." },
  "groups": [
    { "code": "A", "title": "What it is" },
    { "code": "C", "title": "Money" },
    { "code": "E", "title": "Iterations" }
  ],
  "messages": [
    { "code": "A0", "title": "How to run it", "md": "…" },
    { "code": "C7", "title": "The main number", "md": "…" },
    { "code": "E1", "title": "What happened since the previous iteration?", "md": "…", "iteration": 3, "date": "2026-11-26" }
  ] }
```

`head` repeats the index line so a direct link to `/run/?id=…` needs no index scan. `messages` are rendered
in file order, nothing is deduplicated: put in the file what the page should show. Messages with `iteration`
form a dated section; messages without it go under "Analysis".

`groups` is the left navigation, in that order. A message belongs to the group whose `code` equals its
`group` field, or, without one, the leading letters of its `code` (`A0` → `A`, `RISK2` → `RISK`). A group that
appears in messages but not in `groups` is shown with its code as the title; a group without messages is
dropped. Inside a group the items are the message codes, or the iteration numbers when every message of the
group carries `iteration`. Nothing about the letters is known to the site: any codes and titles work.

Markdown may reference the chart; every reference becomes a button that frames the chart:

```
[[t:2026-11-12T14:00Z]]                                a bar
[[t:2026-11-12T14:00Z@41820]]                          a bar and a price
[[range:2026-11-01T00:00Z..2026-11-08T00:00Z]]         a segment (both edges marked)
[[trade:12]]                                           a trade from the candles file
[see the breakout](ref:range:2026-11-01T00:00Z..2026-11-08T00:00Z)   the same as a link
```

### `data/<id>_candles.json`

```json
{ "timeframe": "1h",
  "bars":   [ { "time": 1732665600000, "open": 62000, "high": 62000, "low": 61498.5, "close": 61498.5, "volume": 377 } ],
  "trades": [ { "id": 1, "side": "long", "open_time": 1732928400000, "open_price": 61642.5, "close_time": 1732996800000, "close_price": 60510.8, "pnl_usd": -195.58 } ],
  "equity": [ { "time": 1732665600000, "backtest_usd": 0, "paper_usd": null } ] }
```

`bars` feed the chart; `trades` label and frame `[[trade:N]]`; `equity` is optional (no P&L panel without it).

### `data/<id>_pinescript.json` — optional

```json
{ "source": "// the author's script …", "rule": "// the agent's trade rule as a Pine strategy …" }
```

No file: no code panel. No `rule`: the chart runs the author's script only.

## Server

```ts
import { serve, setLogger, setConfig } from "pine2profit";
serve("0.0.0.0", 60050, "/path/to/project");   // serves /path/to/project/data; returns a dispose function
// the third argument wins over CC_DATA_PATH, which wins over process.cwd()
```

Environment: `CC_WWWROOT_HOST` (`0.0.0.0`), `CC_WWWROOT_PORT` (`60050`), `CC_DATA_PATH` (folder that contains
`data/`), `CC_WWWROOT_PATH` (override of the static root).

```
src/config/router.ts                  GET /data/* then the static site (serve-handler)
src/routes/data.ts                    streams <root>/data/<path> with the right mime, Cache-Control: no-store, 404 as JSON
src/lib/services/view/DataViewService.ts   resolves a request path inside data/, refuses anything outside (also through symlinks)
src/main/start.ts                     the CLI (runs only when this bundle is the entry script)
scripts/copy.mjs                      modules/frontend/out -> build/modules/frontend/build
```
