import type { Kind } from './types';

/**
 * Subcategories differ by kind. Indicators are classified by what they compute and draw (the vocabulary of the
 * TradingView script library); strategies by their entry/exit logic. The agent assigns one key in A1 from the code.
 */
export const SUBCATS: Record<Kind, readonly (readonly [string, string])[]> = {
  indicator: [
    ['trend', 'Trend'],
    ['oscillator', 'Oscillators'],
    ['volatility', 'Volatility'],
    ['volume', 'Volume'],
    ['structure', 'Levels & structure'],
    ['signals', 'Signals'],
  ],
  strategy: [
    ['trend-following', 'Trend following'],
    ['mean-reversion', 'Mean reversion'],
    ['breakout', 'Breakout'],
    ['grid-dca', 'Grid / DCA'],
    ['pattern-event', 'Pattern / event'],
    ['composite', 'Composite'],
  ],
};

export function subLabel(kind: Kind, key: string | null | undefined): string {
  if (!key) return '—';
  return SUBCATS[kind].find(([k]) => k === key)?.[1] ?? key;
}
