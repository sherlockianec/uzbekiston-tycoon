import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/game/types';
import {
  applyCommand,
  mortgageProperty,
  unmortgageProperty,
  isMortgageUrgent,
  mortgageLapsLeft,
  canUnmortgage,
} from '../src/game/engine';
import { PROPERTIES } from '../src/game/data/properties';
import { GO_SALARY, MORTGAGE_DEADLINE_LAPS, MORTGAGE_WARNING_LAPS } from '../src/game/data/economy';
import { newTestGame, queueRng } from './helpers';

/** P0 owns korzinka, positioned 3 before START so a [1,2] roll... wraps via a big roll. */
function setup(): GameState {
  let s = newTestGame();
  const id = s.players[0].id;
  s = { ...s, ownership: { ...s.ownership, korzinka: { ...s.ownership['korzinka'], ownerId: id } } };
  return mortgageProperty(s, id, 'korzinka');
}

/** Make P0 pass START with a roll that lands on a quiet space (idx 3 = Qumtepa Bazaar). */
function passStart(s: GameState): GameState {
  const id = s.players[0].id;
  let t: GameState = { ...s, phase: 'AWAITING_ROLL', hasRolledThisTurn: false, players: s.players.map((p, i) => (i === 0 ? { ...p, position: 38 } : p)) };
  t = applyCommand(t, { type: 'ROLL_DICE' }, id, queueRng([2, 3])); // 38 + 5 = 43 -> idx 3
  // Qumtepa is unowned: decline so we can loop again.
  if (t.phase === 'AWAITING_PURCHASE_DECISION') t = applyCommand(t, { type: 'DECLINE_PURCHASE' }, id, queueRng([]));
  return t;
}

describe('mortgage deadline', () => {
  it('mortgaging pays 50% of price and starts the countdown at the deadline', () => {
    const s = newTestGame();
    const id = s.players[0].id;
    const owned = { ...s, ownership: { ...s.ownership, korzinka: { ...s.ownership['korzinka'], ownerId: id } } };
    const m = mortgageProperty(owned, id, 'korzinka');
    expect(m.ownership['korzinka'].mortgaged).toBe(true);
    expect(m.ownership['korzinka'].mortgageLapsRemaining).toBe(MORTGAGE_DEADLINE_LAPS);
    expect(m.players[0].cash - owned.players[0].cash).toBe(PROPERTIES['korzinka'].price / 2);
    expect(mortgageLapsLeft(m, 'korzinka')).toBe(MORTGAGE_DEADLINE_LAPS);
    expect(mortgageLapsLeft(owned, 'korzinka')).toBeNull();
  });

  it('each START pass decrements the counter', () => {
    let s = passStart(setup());
    expect(s.ownership['korzinka'].mortgageLapsRemaining).toBe(MORTGAGE_DEADLINE_LAPS - 1);
    s = passStart({ ...s, currentPlayerIndex: 0 });
    expect(s.ownership['korzinka'].mortgageLapsRemaining).toBe(MORTGAGE_DEADLINE_LAPS - 2);
  });

  it('does not decrement when another player passes START', () => {
    const s = setup();
    const other = s.players[1].id;
    let t: GameState = { ...s, currentPlayerIndex: 1, phase: 'AWAITING_ROLL', hasRolledThisTurn: false, players: s.players.map((p, i) => (i === 1 ? { ...p, position: 38 } : p)) };
    t = applyCommand(t, { type: 'ROLL_DICE' }, other, queueRng([2, 3]));
    expect(t.ownership['korzinka'].mortgageLapsRemaining).toBe(MORTGAGE_DEADLINE_LAPS);
  });

  it('warns at the threshold and not before', () => {
    let s = setup();
    expect(isMortgageUrgent(s, 'korzinka')).toBe(false);
    s = { ...s, ownership: { ...s.ownership, korzinka: { ...s.ownership['korzinka'], mortgageLapsRemaining: MORTGAGE_WARNING_LAPS } } };
    expect(isMortgageUrgent(s, 'korzinka')).toBe(true);
  });

  it('forecloses at zero: asset returns to the bank, with a log line', () => {
    let s = setup();
    s = { ...s, ownership: { ...s.ownership, korzinka: { ...s.ownership['korzinka'], mortgageLapsRemaining: 1 } } };
    const cashBefore = s.players[0].cash;
    s = passStart(s);
    expect(s.ownership['korzinka']).toEqual({ ownerId: null, level: 0, mortgaged: false, mortgageLapsRemaining: null });
    expect(s.log.some((l) => /foreclosed/.test(l.text))).toBe(true);
    expect(s.players[0].cash).toBe(cashBefore + GO_SALARY); // no compensation
  });

  it('redeeming costs the full price and clears the counter', () => {
    const s = setup();
    const id = s.players[0].id;
    expect(canUnmortgage(s, id, 'korzinka')).toBe(true);
    const cash = s.players[0].cash;
    const r = unmortgageProperty(s, id, 'korzinka');
    expect(cash - r.players[0].cash).toBe(PROPERTIES['korzinka'].price);
    expect(r.ownership['korzinka'].mortgaged).toBe(false);
    expect(r.ownership['korzinka'].mortgageLapsRemaining).toBeNull();
  });

  it('cannot redeem without enough cash', () => {
    let s = setup();
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, cash: PROPERTIES['korzinka'].price - 1 } : p)) };
    expect(canUnmortgage(s, s.players[0].id, 'korzinka')).toBe(false);
  });

  it('a traded mortgaged asset keeps its remaining laps', () => {
    let s = setup();
    s = { ...s, ownership: { ...s.ownership, korzinka: { ...s.ownership['korzinka'], mortgageLapsRemaining: 4 } } };
    const [a, b] = [s.players[0].id, s.players[1].id];
    s = applyCommand(
      s,
      {
        type: 'PROPOSE_TRADE',
        offer: { fromId: a, toId: b, offerCash: 0, offerPropertyIds: ['korzinka'], offerReleasePapers: 0, requestCash: 0, requestPropertyIds: [], requestReleasePapers: 0 },
      },
      a,
      queueRng([])
    );
    expect(s.phase).toBe('AWAITING_TRADE_RESPONSE');
    s = applyCommand(s, { type: 'RESPOND_TRADE', accept: true }, b, queueRng([]));
    expect(s.ownership['korzinka'].ownerId).toBe(b);
    expect(s.ownership['korzinka'].mortgaged).toBe(true);
    expect(s.ownership['korzinka'].mortgageLapsRemaining).toBe(4);
  });
});
