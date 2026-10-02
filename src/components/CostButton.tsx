import type { Language } from '../game/types';
import { formatSom } from '../utils/currency';
import { t } from '../i18n/strings';

interface CostButtonProps {
  label: string;
  /** What the action costs the player (so'm). */
  cost: number;
  /** What the player has right now. */
  cash: number;
  lang: Language;
  onClick: () => void;
  /** Disabled for a non-money reason (rule not met). Renders as a plain disabled button. */
  blocked?: boolean;
  size?: 'sm' | 'md';
  /** Show the cost in brackets after the label (default true). */
  showCost?: boolean;
}

/** One button for every action that costs money: green when affordable, red and
 * disabled when not, with the missing amount spelled out in text (not colour alone). */
export default function CostButton({ label, cost, cash, lang, onClick, blocked = false, size = 'md', showCost = true }: CostButtonProps) {
  const affordable = cash >= cost;
  const missing = Math.max(0, cost - cash);
  const cls = ['btn', size === 'sm' ? 'btn--sm' : '', affordable ? 'btn--affordable' : 'btn--unaffordable'].filter(Boolean).join(' ');
  const shortText = `${t('shortBy', lang)} ${formatSom(missing)}`;
  return (
    <button
      className={cls}
      disabled={blocked || !affordable}
      title={affordable ? undefined : shortText}
      aria-label={affordable ? undefined : `${label} - ${shortText}`}
      onClick={onClick}
    >
      {label}
      {showCost ? ` (${formatSom(cost)})` : ''}
      {!affordable && <span className="btn__short">{shortText}</span>}
    </button>
  );
}
