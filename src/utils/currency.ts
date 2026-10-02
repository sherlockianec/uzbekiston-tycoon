import { CURRENCY_SUFFIX } from '../game/data/economy';

/** Formats an amount as "2 500 000 so'm" — space-grouped, never a dollar sign. */
export function formatSom(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '\u2212' : '';
  const digits = Math.abs(rounded).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${grouped} ${CURRENCY_SUFFIX}`;
}

/** Compact "+250 000 so'm" / "\u2212400 000 so'm" for deltas. */
export function formatSomDelta(amount: number): string {
  if (amount === 0) return `0 ${CURRENCY_SUFFIX}`;
  const prefix = amount > 0 ? '+' : '';
  return `${prefix}${formatSom(amount)}`;
}
