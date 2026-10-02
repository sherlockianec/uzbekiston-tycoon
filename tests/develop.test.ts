import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/game/types';
import {
  canDevelop,
  canSellDevelopment,
  developProperty,
  sellDevelopment,
  liquidValue,
  costToReachNextLevel,
  refundForCurrentLevel,
  totalDevelopmentRefund,
} from '../src/game/engine';
import { decideAiCommand } from '../src/game/ai/aiPlayer';
import { PROPERTIES, GROUPS } from '../src/game/data/properties';
import { PERSONALITIES } from '../src/game/ai/personalities';
import { newTestGame } from './helpers';

const GROUP = GROUPS.find((g) => g.id === 'bazaars')!; // chorsu-bazaar, qumtepa-bazaar
const A = PROPERTIES[GROUP.propertyIds[0]];

/** P0 owns the whole bazaars group, every property at `level`, with `cash`. */
function owned(level: number, cash: number): GameState {
  const s = newTestGame();
  const id = s.players[0].id;
  const ownership = { ...s.ownership };
  for (const pid of GROUP.propertyIds) ownership[pid] = { ...ownership[pid], ownerId: id, level };
  return { ...s, ownership, players: s.players.map((p, i) => (i === 0 ? { ...p, cash } : p)) };
}

describe('level-5 cost premium', () => {
  it('data: level 5 costs exactly double levels 1-4', () => {
    expect(A.developmentCostLevel5).toBe(A.developmentCost * 2);
    for (const l of [0, 1, 2, 3]) expect(costToReachNextLevel(A, l)).toBe(A.developmentCost);
    expect(costToReachNextLevel(A, 4)).toBe(A.developmentCostLevel5);
  });

  it('developing 3 -> 4 charges the normal cost', () => {
    const s = owned(3, 10_000_000);
    const r = developProperty(s, s.players[0].id, A.id);
    expect(s.players[0].cash - r.players[0].cash).toBe(A.developmentCost);
    expect(r.ownership[A.id].level).toBe(4);
  });

  it('developing 4 -> 5 charges the premium', () => {
    const s = owned(4, 10_000_000);
    const r = developProperty(s, s.players[0].id, A.id);
    expect(s.players[0].cash - r.players[0].cash).toBe(A.developmentCostLevel5);
    expect(r.ownership[A.id].level).toBe(5);
  });

  it('canDevelop is false when cash covers the normal cost but not the premium', () => {
    const s = owned(4, A.developmentCostLevel5 - 1000);
    expect(s.players[0].cash).toBeGreaterThanOrEqual(A.developmentCost);
    expect(canDevelop(s, s.players[0].id, A.id)).toBe(false);
    const ok = owned(4, A.developmentCostLevel5);
    expect(canDevelop(ok, ok.players[0].id, A.id)).toBe(true);
  });

  it('selling level 5 refunds half the premium; selling level 4 refunds half the normal cost', () => {
    let s = owned(5, 0);
    // even-sell rule: sell the highest first. Both are level 5; sell A.
    const id = s.players[0].id;
    expect(canSellDevelopment(s, id, A.id)).toBe(true);
    const r = sellDevelopment(s, id, A.id);
    expect(r.players[0].cash - s.players[0].cash).toBe(A.developmentCostLevel5 / 2);
    expect(r.ownership[A.id].level).toBe(4);
    expect(refundForCurrentLevel(A, 4)).toBe(A.developmentCost / 2);
    s = r;
  });

  it('liquidValue counts the full level-5 refund (not 5 x the normal cost)', () => {
    const lvl4 = owned(4, 0);
    const lvl5 = owned(5, 0);
    const diff = liquidValue(lvl5, lvl5.players[0].id) - liquidValue(lvl4, lvl4.players[0].id);
    const expected = GROUP.propertyIds.reduce(
      (sum, pid) => sum + refundForCurrentLevel(PROPERTIES[pid], 5),
      0
    );
    expect(diff).toBe(expected);
    expect(totalDevelopmentRefund(A, 5)).toBe(refundForCurrentLevel(A, 5) + 4 * refundForCurrentLevel(A, 4));
  });

  it('AI budgets for the premium: no develop below premium + reserve, develops at exactly that', () => {
    const reserve = PERSONALITIES.developer.cashReserve;
    const asAi = (cash: number): GameState => {
      const s = owned(4, cash);
      return {
        ...s,
        phase: 'AWAITING_ROLL',
        hasRolledThisTurn: true,
        players: s.players.map((p, i) =>
          i === 0 ? { ...p, isAI: true, personality: 'developer' as const, difficulty: 'hard' as const } : p
        ),
      };
    };
    const id = owned(4, 0).players[0].id;
    // Enough for the normal cost + reserve (the old, buggy check) but not premium + reserve.
    const short = asAi(A.developmentCostLevel5 + reserve - 1000);
    expect(short.players[0].cash - A.developmentCost).toBeGreaterThanOrEqual(reserve);
    expect(decideAiCommand(short, id, () => 0.5)?.type).not.toBe('DEVELOP');
    const enough = asAi(A.developmentCostLevel5 + reserve);
    expect(decideAiCommand(enough, id, () => 0.5)?.type).toBe('DEVELOP');
  });
});
