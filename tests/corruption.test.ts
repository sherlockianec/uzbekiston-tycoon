import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/game/types';
import { applyCommand } from '../src/game/engine';
import { spaceById } from '../src/game/data/board';
import { CORRUPTION_TOLL_AMOUNT } from '../src/game/data/economy';
import { newTestGame, queueRng } from './helpers';

const IDX = spaceById('local-official').index;

function landOnOfficial(s: GameState, cash?: number): GameState {
  const id = s.players[0].id;
  const t: GameState = {
    ...s,
    players: s.players.map((p, i) => (i === 0 ? { ...p, position: IDX - 3, ...(cash !== undefined ? { cash } : {}) } : p)),
  };
  return applyCommand(t, { type: 'ROLL_DICE' }, id, queueRng([1, 2]));
}

describe('Local Official (corruption cell)', () => {
  it('is on the board at the expected slot', () => {
    expect(IDX).toBe(36);
    expect(spaceById('local-official').kind).toBe('corruption');
  });
  it('charges the fixed toll exactly once, with no choice, and returns to the roll phase', () => {
    const s = newTestGame();
    const before = s.players[0].cash;
    const r = landOnOfficial(s);
    expect(r.players[0].position).toBe(IDX);
    expect(before - r.players[0].cash).toBe(CORRUPTION_TOLL_AMOUNT);
    expect(r.phase).toBe('AWAITING_ROLL');
    expect(r.log.filter((l) => /local official/.test(l.text))).toHaveLength(1);
  });
  it('is the same amount regardless of wealth or assets', () => {
    const rich = landOnOfficial(newTestGame(), 100_000_000);
    expect(100_000_000 - rich.players[0].cash).toBe(CORRUPTION_TOLL_AMOUNT);
    let s = newTestGame();
    s = { ...s, ownership: { ...s.ownership, korzinka: { ...s.ownership['korzinka'], ownerId: s.players[0].id } } };
    const r = landOnOfficial(s);
    expect(s.players[0].cash - r.players[0].cash).toBe(CORRUPTION_TOLL_AMOUNT);
  });
  it('unaffordable: the toll is still taken in full and the balance goes negative', () => {
    const r = landOnOfficial(newTestGame(), CORRUPTION_TOLL_AMOUNT - 1);
    expect(r.phase).toBe('AWAITING_ROLL');
    expect(r.players[0].cash).toBe(-1);
  });
  it('tax immunity does not apply to the toll', () => {
    let s = newTestGame();
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, taxImmunity: true } : p)) };
    const before = s.players[0].cash;
    const r = landOnOfficial(s);
    expect(before - r.players[0].cash).toBe(CORRUPTION_TOLL_AMOUNT);
    expect(r.players[0].taxImmunity).toBe(true);
  });
});
