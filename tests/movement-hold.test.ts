import { describe, it, expect } from 'vitest';
import { applyCommand } from '../src/game/engine';
import { planMovementHold, movementHoldMs, hopStepMs, pathSteps } from '../src/utils/movement';
import { newTestGame, queueRng } from './helpers';

describe('walk first, consequences after', () => {
  it('a roll onto an unowned property: the pawn walks, the purchase prompt waits', () => {
    const prev = newTestGame();
    const next = applyCommand(prev, { type: 'ROLL_DICE' }, prev.players[0].id, queueRng([2, 4])); // to space 6
    expect(next.phase).toBe('AWAITING_PURCHASE_DECISION');
    const hold = planMovementHold(prev, next)!;
    expect(hold).not.toBeNull();
    expect(hold.intermediate.players[0].position).toBe(6);
    expect(hold.intermediate.dice).toEqual([2, 4]);
    expect(hold.intermediate.phase).toBe('AWAITING_ROLL'); // no prompt yet
    expect(hold.ms).toBe(movementHoldMs(6));
  });
  it('rent is not shown as paid until arrival', () => {
    let prev = newTestGame();
    prev = { ...prev, ownership: { ...prev.ownership, korzinka: { ...prev.ownership.korzinka, ownerId: prev.players[1].id } } };
    const next = applyCommand(prev, { type: 'ROLL_DICE' }, prev.players[0].id, queueRng([2, 4]));
    expect(next.players[0].cash).toBeLessThan(prev.players[0].cash);
    const hold = planMovementHold(prev, next)!;
    expect(hold.intermediate.players[0].cash).toBe(prev.players[0].cash);
    expect(hold.intermediate.players[1].cash).toBe(prev.players[1].cash);
  });
  it('a purchase by a bot is not shown until the bot has arrived (ownership comes only from the final state)', () => {
    const prev = newTestGame();
    const rolled = applyCommand(prev, { type: 'ROLL_DICE' }, prev.players[0].id, queueRng([2, 4]));
    const bought = applyCommand(rolled, { type: 'BUY_PROPERTY' }, prev.players[0].id, queueRng([]));
    expect(bought.ownership.korzinka.ownerId).not.toBeNull();
    // Buying does not move anyone, so no hold of its own - the AI is simply not asked until the walk ends.
    expect(planMovementHold(rolled, bought)).toBeNull();
    expect(planMovementHold(prev, rolled)!.intermediate.ownership.korzinka.ownerId).toBeNull();
  });
  it('no movement, no hold', () => {
    const prev = newTestGame();
    expect(planMovementHold(prev, { ...prev, turnNumber: 2 })).toBeNull();
  });
  it('jail and transport walk forward (long trips hop faster)', () => {
    const prev = { ...newTestGame(), players: newTestGame().players.map((p, i) => (i === 0 ? { ...p, position: 25 } : p)) };
    const jailed = applyCommand({ ...prev, hasRolledThisTurn: true, doublesStreak: 2 }, { type: 'ROLL_DICE' }, prev.players[0].id, queueRng([3, 3]));
    const hold = planMovementHold(prev, jailed)!;
    expect(hold.intermediate.lastMove).toMatchObject({ kind: 'jail', backward: false });
    expect(pathSteps(25, 10, false)).toBe(25);
    expect(hopStepMs(25)).toBeLessThan(hopStepMs(5));
  });
  it('"go back" cards still walk backward', () => {
    expect(pathSteps(10, 7, true)).toBe(3);
  });
});
