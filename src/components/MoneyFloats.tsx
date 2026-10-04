import { useStartFloats, useMoneyFloats, useGame } from '../state/GameProvider';
import { formatSom } from '../utils/currency';

function Badge({ delta, color }: { delta: number; color?: string }) {
  return (
    <span className={`money-float ${delta > 0 ? 'money-float--gain' : 'money-float--loss'}`}>
      {color && <span className="money-float__dot" style={{ background: color }} />}
      {delta > 0 ? '+' : '−'}
      {formatSom(Math.abs(delta))}
    </span>
  );
}

/** Green "+100 000 so'm" / red "-100 000 so'm" badges that drift up next to a
 * player's icon whenever their cash changes. Animates transform + opacity only. */
export default function MoneyFloats({ playerId, className = '' }: { playerId: string; className?: string }) {
  const floats = useMoneyFloats(playerId);
  if (floats.length === 0) return null;
  return (
    <span className={`money-floats ${className}`.trim()} aria-hidden="true">
      {floats.map((f) => (
        <Badge key={f.id} delta={f.delta} />
      ))}
    </span>
  );
}

/** Badges drawn on the START tile at the moment a pawn crosses it (salary, loan maturity),
 * so the money visibly comes from START and not from the tile where the pawn ends up. */
export function StartFloats() {
  const floats = useStartFloats();
  const ctx = useGame();
  if (floats.length === 0) return null;
  return (
    <span className="money-floats money-floats--start" aria-hidden="true">
      {floats.map((f) => (
        <Badge key={f.id} delta={f.delta} color={ctx.state?.players.find((p) => p.id === f.playerId)?.tokenColor} />
      ))}
    </span>
  );
}
