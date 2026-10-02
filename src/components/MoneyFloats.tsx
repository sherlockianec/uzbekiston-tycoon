import { useMoneyFloats } from '../state/GameProvider';
import { formatSom } from '../utils/currency';

/** Green "+100 000 so'm" / red "-100 000 so'm" badges that drift up next to a
 * player's icon whenever their cash changes. Animates transform + opacity only. */
export default function MoneyFloats({ playerId, className = '' }: { playerId: string; className?: string }) {
  const floats = useMoneyFloats(playerId);
  if (floats.length === 0) return null;
  return (
    <span className={`money-floats ${className}`.trim()} aria-hidden="true">
      {floats.map((f) => (
        <span key={f.id} className={`money-float ${f.delta > 0 ? 'money-float--gain' : 'money-float--loss'}`}>
          {f.delta > 0 ? '+' : '\u2212'}
          {formatSom(Math.abs(f.delta))}
        </span>
      ))}
    </span>
  );
}
