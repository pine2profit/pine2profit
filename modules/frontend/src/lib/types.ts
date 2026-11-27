export type Kind = 'indicator' | 'strategy';
export type VerdictWord = 'YES' | 'NO' | 'UNKNOWN';
export type Theme = 'light' | 'dark';

/**
 * One line of data/index_N.jsonl — everything the list card and the run header show. Field names are the
 * same as IndexRow; only `id`, `title`, `kind`, `verdict` and `updated` are required. Dollars are integers.
 * An absent field means null (numbers, strings) or its default (`usable` → true, counts → 0 / 1).
 */
export interface IndexLine {
  id: string;
  title: string;
  kind: Kind;
  subcategory?: string;
  /** false when no signal is final at bar close (indicators): no rule, no money numbers */
  usable?: boolean;
  verdict: VerdictWord;
  /** 12 months via alerts, $ on a $10,000 account */
  main?: number;
  /** paper journal since the cycle start, $ */
  paper?: number;
  paperTrades?: number;
  /** expected per month on $10,000: [low, high] */
  expected?: [number, number];
  iterations?: number;
  /** YYYY-MM-DD */
  updated: string;
  market?: string;
  timeframe?: string;
  license?: string;
  author?: string;
  tvUrl?: string;
  /** YYYY-MM-DD */
  cycleStart?: string;
  /** the rule's percentile against random entries */
  percentile?: number;
  /** one sentence under the verdict */
  reason?: string;
}

/** An index line with every field present: what the card and the run header render. */
export interface IndexRow {
  id: string;
  title: string;
  kind: Kind;
  subcategory: string | null;
  usable: boolean;
  verdict: VerdictWord;
  main: number | null;
  paper: number | null;
  paperTrades: number;
  expected: [number, number] | null;
  iterations: number;
  updated: string;
  market: string;
  timeframe: string;
  license: string;
  author: string;
  tvUrl: string;
  cycleStart: string;
  percentile: number | null;
  reason: string;
}

/** A group of the left navigation, declared in data/<id>_messages.json. */
export interface MessageGroup {
  /** prefix of the message codes that belong here: "A" for A0, A1 …; any string works */
  code: string;
  title: string;
}

/** data/<id>_messages.json — the agent's text, rendered in file order. */
export interface Message {
  /** A0, B2, E1 … — shown on the block and in the left navigation; optional */
  code?: string;
  /** which navigation group this message belongs to; default: the leading letters of `code` */
  group?: string;
  title: string;
  md: string;
  /** set on messages that belong to a dated iteration; consecutive messages with the same value form a section */
  iteration?: number;
  date?: string;
}

export interface MessagesFile {
  /** the index line again, so a direct link to /run/?id=… needs no index scan */
  head?: IndexLine;
  /** left navigation groups in display order; a group that appears in messages but not here is shown with its code as the title */
  groups?: MessageGroup[];
  messages: Message[];
}

export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  id: number;
  iteration?: number;
  side: 'long' | 'short';
  open_time: number;
  open_price: number;
  close_time: number | null;
  close_price: number | null;
  pnl_usd: number;
}

export interface EquityPoint {
  time: number;
  backtest_usd: number | null;
  paper_usd: number | null;
}

/** data/<id>_candles.json */
export interface CandlesFile {
  timeframe?: string;
  bars: Bar[];
  trades?: Trade[];
  equity?: EquityPoint[];
}

/** data/<id>_pinescript.json — absent for scripts without code to show */
export interface PinescriptFile {
  source: string;
  /** the agent's trade rule as a Pine strategy; absent when the signal is not tradeable */
  rule?: string;
}

/** A reference from the agent's text to the chart. */
export interface ChartRef {
  kind: 't' | 'range' | 'trade';
  block: string;
  label: string;
  time?: number;
  price?: number;
  from?: number;
  to?: number;
  trade?: number;
}

/** A rendered message. */
export interface Block {
  key: string;
  code: string;
  /** navigation group: message.group or the leading letters of code, "" when neither */
  group: string;
  title: string;
  html: string;
  md: string;
  refs: ChartRef[];
  iteration: number | null;
  date?: string;
}
