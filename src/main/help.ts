import { getArgs } from "../helpers/getArgs";
import getEntry from "../helpers/getEntry";

declare const __PACKAGE_VERSION__: string;

const HELP_TEXT = `
Usage:
  npx pine2profit <dir> [flags]

  <dir>              Folder that contains data/ (required)

Flags:

  --port <number>    HTTP port (default: CC_WWWROOT_PORT or 60050)
  --host <string>    Bind address (default: CC_WWWROOT_HOST or 0.0.0.0)
  --help             Print this help message
  --version          Print the version

What the server does:

  GET /              The dashboard bundled with this package (modules/frontend, static export)
  GET /data/<file>   <dir>/data/<file> as is, Cache-Control: no-store, 404 when the file is missing

  Nothing else: no API, no POST. The site on GitHub Pages makes exactly the same requests
  for the same relative paths, so a data folder that works here works there unchanged.

The data folder (<dir>/data/), flat, no subfolders:

  index_1.jsonl, index_2.jsonl, ...   The list: one JSON object per line, about 1000 lines per file
  <id>_messages.json                  The agent's text for one script
  <id>_candles.json                   Bars, trades and equity for the chart
  <id>_pinescript.json                The author's script and the trade rule (optional)

  <id> is a slug matching [a-z0-9-]+ and every file of that script starts with it.

index_N.jsonl (one line per script):

  The site reads index_1, then index_2, ... and stops at the first 404. A later line with the
  same "id" replaces the earlier one, so append updates to the last file instead of rewriting
  old ones. Required: id, title, kind, verdict, updated. Leave a field out when it is null.
  Dollars are integers on a notional $10,000 account.

  {
    "id": string,                      slug, prefix of the other files of this script
    "title": string,
    "kind": "indicator" | "strategy",
    "subcategory": string,             optional; any key — the list builds its filter chips from the
                                       values it sees. Keys with a label on the site:
                                         indicator: trend oscillator volatility volume structure signals
                                         strategy:  trend-following mean-reversion breakout grid-dca
                                                    pattern-event composite
    "usable": boolean,                 optional; false = no signal is final at bar close: the page says
                                       "not tradeable", shows no rule and no money numbers
    "verdict": "YES" | "NO" | "UNKNOWN",
    "main": number,                    optional; 12 months via alerts, $
    "paper": number,                   optional; paper journal since cycleStart, $
    "paperTrades": number,             optional
    "expected": [number, number],      optional; expected per month on $10,000: [low, high]
    "iterations": number,              optional (default 1)
    "updated": "YYYY-MM-DD",
    "market": string,                  optional; "BTCUSDT"
    "timeframe": string,               optional; "1h"
    "license": string,                 optional
    "author": string,                  optional
    "tvUrl": string,                   optional; link under the author's name
    "cycleStart": "YYYY-MM-DD",        optional; drawn on the chart and on the P&L line
    "percentile": number,              optional; the rule's percentile against random entries
    "reason": string                   optional; one sentence under the verdict
  }

  Example line (one line in the file, no line breaks inside):

  {"id":"sma-cross-20-50","title":"SMA Cross 20/50","kind":"strategy","subcategory":"trend-following","verdict":"NO","main":-2465,"paper":461,"paperTrades":3,"expected":[-599,181],"iterations":3,"updated":"2026-11-26","market":"BTCUSDT","timeframe":"1h","license":"MPL-2.0","author":"example_author","tvUrl":"https://www.tradingview.com/script/EXAMPLE02/","cycleStart":"2026-11-12","percentile":59,"reason":"12 months −$2,465; only 4/10 markets positive; not better than random entries (59th percentile)"}

  A script that is not tradeable:

  {"id":"volume-pressure","title":"Volume Pressure Delta","kind":"indicator","subcategory":"volume","usable":false,"verdict":"NO","iterations":1,"updated":"2026-11-26","market":"BTCUSDT","timeframe":"1h","reason":"not tradeable: the signal depends on realtime tick data (varip)"}

<id>_messages.json:

  {
    "head": {                        the same fields as this script's line in index_N.jsonl, same values;
      "id": string,                  the page reads the header from here when opened by a direct link
      "title": string,               /run/?id=<id> without going through the list
      "kind": "indicator" | "strategy",
      "subcategory": string,         optional
      "usable": boolean,             optional
      "verdict": "YES" | "NO" | "UNKNOWN",
      "main": number,                optional
      "paper": number,               optional
      "paperTrades": number,         optional
      "expected": [number, number],  optional
      "iterations": number,          optional
      "updated": "YYYY-MM-DD",
      "market": string,              optional
      "timeframe": string,           optional
      "license": string,             optional
      "author": string,              optional
      "tvUrl": string,               optional
      "cycleStart": "YYYY-MM-DD",    optional
      "percentile": number,          optional
      "reason": string               optional
    },
    "groups": [ { "code": string, "title": string } ],   the left navigation, in this order
    "messages": [
      {
        "code": string,          optional; "A0", "C7", "E1", "RISK2" — shown on the block and in the navigation
        "group": string,         optional; navigation group; default: the leading letters of "code"
        "title": string,
        "md": string,            markdown
        "iteration": number,     optional; messages with the same value in a row form a dated section
        "date": "YYYY-MM-DD"     optional; shown next to the section title
      }
    ]
  }

  Messages render in file order, nothing is deduplicated: put in the file what the page should show.
  A message belongs to the group whose code equals its "group", or the leading letters of its "code"
  (A0 -> A, RISK2 -> RISK). A group that appears in messages but not in "groups" shows its code as
  the title; a group without messages is dropped. Inside a group the navigation items are the message
  codes, or the iteration numbers when every message of the group carries "iteration". Messages
  without "iteration" go under "Analysis".

  Chart references inside "md" become buttons that frame the chart:

    [[t:2026-11-12T14:00Z]]                               a bar
    [[t:2026-11-12T14:00Z@41820]]                         a bar and a price
    [[range:2026-11-01T00:00Z..2026-11-08T00:00Z]]        a segment, both edges marked
    [[trade:12]]                                          a trade from <id>_candles.json
    [see the breakout](ref:range:2026-11-01T00:00Z..2026-11-08T00:00Z)   the same, as a link

  Example:

  {
    "head": {"id":"sma-cross-20-50","title":"SMA Cross 20/50","kind":"strategy","subcategory":"trend-following","verdict":"NO","main":-2465,"paper":461,"paperTrades":3,"expected":[-599,181],"iterations":3,"updated":"2026-11-26","market":"BTCUSDT","timeframe":"1h","cycleStart":"2026-11-12","percentile":59,"reason":"12 months −$2,465; not better than random entries"},
    "groups": [
      { "code": "A", "title": "What it is" },
      { "code": "C", "title": "Money" },
      { "code": "E", "title": "Iterations" }
    ],
    "messages": [
      { "code": "A0", "title": "How to run it", "md": "Run it on **1h**. A typical trade: [[trade:137]]." },
      { "code": "C2", "title": "The last 12 months", "md": "Window [[range:2025-11-12T00:00Z..2026-11-12T00:00Z]]: 97 trades, -$2,465." },
      { "code": "E1", "title": "What happened since the previous iteration?", "md": "Three paper trades, +$461.", "iteration": 3, "date": "2026-11-26" },
      { "code": "E1", "title": "What happened since the previous iteration?", "md": "First week on paper.", "iteration": 2, "date": "2026-11-19" }
    ]
  }

<id>_candles.json:

  {
    "timeframe": string,               optional; "1h" (falls back to the index line)
    "bars":   [ { "time": ms, "open": number, "high": number, "low": number, "close": number, "volume": number } ],
    "trades": [ { "id": number, "side": "long" | "short", "open_time": ms, "open_price": number,
                  "close_time": ms | null, "close_price": number | null, "pnl_usd": number } ],   optional
    "equity": [ { "time": ms, "backtest_usd": number | null, "paper_usd": number | null } ]        optional
  }

  "bars" feed the chart; "trades" label and frame [[trade:N]]; "equity" draws the P&L line
  (no line without it). No file at all: "no candles for this script", the text still renders.

  Example:

  {
    "timeframe": "1h",
    "bars": [
      { "time": 1732665600000, "open": 62000, "high": 62000, "low": 61498.5, "close": 61498.5, "volume": 377 },
      { "time": 1732669200000, "open": 61498.5, "high": 61553.9, "low": 61201.0, "close": 61340.2, "volume": 412 }
    ],
    "trades": [
      { "id": 1, "side": "long", "open_time": 1732928400000, "open_price": 61642.5, "close_time": 1732996800000, "close_price": 60510.8, "pnl_usd": -195.58 }
    ],
    "equity": [
      { "time": 1732665600000, "backtest_usd": 0, "paper_usd": null },
      { "time": 1732996800000, "backtest_usd": -195.58, "paper_usd": null }
    ]
  }

<id>_pinescript.json (optional):

  {
    "source": string,                  the author's script: shown read-only and run on the chart
    "rule": string                     optional; the agent's trade rule as a Pine strategy() — its fills
                                       become the trade markers on the chart
  }

  No file: no code panel. No "rule": the chart runs the author's script only.

  Example:

  {
    "source": "//@version=5\\nindicator(\\"EMA Ribbon\\", overlay=true)\\nplot(ta.ema(close, 20))\\nplot(ta.ema(close, 50))",
    "rule": "//@version=5\\nstrategy(\\"EMA Ribbon rule\\", overlay=true, initial_capital=10000)\\nif ta.crossover(ta.ema(close, 20), ta.ema(close, 50))\\n    strategy.entry(\\"Long\\", strategy.long)\\nif ta.crossunder(ta.ema(close, 20), ta.ema(close, 50))\\n    strategy.close(\\"Long\\")"
  }

Startup check:

  Before listening, the folder is validated. A single error refuses to start (exit code 1);
  warnings are printed and the server starts anyway. What is checked:

    data/ exists; index_1.jsonl exists (an empty file is fine); index files are numbered without gaps
    every index line is JSON with the fields above: required ones present, types and values right,
      no unknown fields (a typo such as "tv_url" is reported together with the right name)
    every script in the index has <id>_messages.json and <id>_candles.json; <id>_pinescript.json is optional
    <id>_messages.json: "head" equals the index line, "groups" and "messages" have the right shape,
      every [[t:...]], [[range:...]], [[trade:N]] and (ref:...) points at a real date, range or trade
    <id>_candles.json: "bars" not empty and numeric with growing time and high >= low, trade ids unique
    warnings only: files for ids that are not in the index, files the site never reads, a missing "head"

A minimal data folder:

  <dir>/data/index_1.jsonl
  <dir>/data/sma-cross-20-50_messages.json
  <dir>/data/sma-cross-20-50_candles.json
  <dir>/data/sma-cross-20-50_pinescript.json

Environment variables:

  CC_WWWROOT_HOST    Bind address (default: 0.0.0.0)
  CC_WWWROOT_PORT    Port (default: 60050)
  CC_DATA_PATH       Folder that contains data/ for serve() called from code without a path;
                     the CLI always takes <dir> from the command line

Examples:

  npx pine2profit .
  npx pine2profit ./project --port 8080
  npx pine2profit /var/agent/project --host 127.0.0.1 --port 60050
`.trimStart();

export const main = () => {
  if (!getEntry(import.meta.url)) {
    return;
  }

  const { values } = getArgs();

  if (!values.help) {
    return;
  }

  process.stdout.write(`pine2profit ${__PACKAGE_VERSION__}\n\n`);
  process.stdout.write(HELP_TEXT);
  process.exit(0);
};

main();
