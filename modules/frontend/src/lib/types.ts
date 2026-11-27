export type Kind = 'indicator' | 'strategy';
export type VerdictWord = 'YES' | 'NO' | 'UNKNOWN';

export interface Meta {
  title: string;
  author: string;
  tv_url: string;
  kind: Kind;
  /** Family within the kind; keys from lib/taxonomy.ts. Assigned by the agent in A1. */
  subcategory?: string;
  /** Indicators only: A2 found a signal that is final at bar close and can be placed in an alert. */
  usable?: boolean;
  usable_reason?: string;
  market: string;
  timeframe: string;
  license: string;
  source_sha256: string;
  created: string;
  updated: string;
  cycle_start: string;
  rule?: string;
  rule_entry?: string;
  rule_exit?: string;
}

export interface Verdict {
  verdict: VerdictWord;
  reason: string;
  /** null when there is no rule to run (indicator not tradeable) */
  expected_month_usd: [number, number] | null;
  main_number_usd: number | null;
  paper_pnl_usd: number | null;
  paper_trades: number;
  iterations: number;
  updated: string;
}

export interface Trade {
  id: number;
  iteration: number;
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

export interface Block {
  code: string; // A1, B2, C7, E1 …
  title: string;
  html: string;
  md: string;
  refs: ChartRef[];
  iteration: number;
}

export interface Iteration {
  n: number;
  date: string;
  blocks: Block[];
}

export interface Run {
  slug: string;
  meta: Meta;
  verdict: Verdict;
  trades: Trade[];
  equity: EquityPoint[];
  source: string;
  rule: string;
  iterations: Iteration[];
}

/** One line of public/runs/index.jsonl — what the list page works with. */
export interface IndexRow {
  slug: string;
  title: string;
  kind: Kind;
  subcategory: string | null;
  usable: boolean;
  verdict: VerdictWord;
  expected: [number, number] | null;
  main: number | null;
  paper: number | null;
  paperTrades: number;
  iterations: number;
  updated: string;
}
