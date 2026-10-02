import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/game/types';
import { applyCommand, sendToDetention } from '../src/game/engine';
import { GO_SALARY } from '../src/game/data/economy';
import { BOARD } from '../src/game/data/board';
import { newTestGame, queueRng, floatRng } from './helpers';

const idx = (id: string) => BOARD.find((s) => s.id === id)!.index;
const at = (s: GameState, id: string, position: number, extra: Partial<GameState['players'][number]> = {}): GameState => ({
  ...s,
  players: s.players.map((p) => (p.id === id ? { ...p, position, ...extra } : p)),
});
const run = (s: GameState, cmd: Parameters<typeof applyCommand>[1], who = 0, rng = queueRng([])) =>
  applyCommand(s, cmd, s.players[who].id, rng);

describe('transport network: forward only, salary when crossing START', () => {
  it('Metro (35) -> Railways (5) goes forward across START and pays the salary', () => {
    let s = newTestGame();
    s = at(s, s.players[0].id, idx('tashkent-metro'));
    const before = s.players[0].cash;
    const r = run(s, { type: 'TRAVEL_NETWORK', targetSpaceId: 'uzbekistan-railways' });
    expect(r.players[0].position).toBe(5);
    expect(r.players[0].cash).toBe(before + GO_SALARY);
    expect(r.lastMove).toMatchObject({ from: 35, to: 5, backward: false, kind: 'travel' });
  });
  it('Airways (15) -> Railways (5) is NOT a short hop back: it goes around, with salary', () => {
    let s = newTestGame();
    s = at(s, s.players[0].id, idx('uzbekistan-airways'));
    const before = s.players[0].cash;
    const r = run(s, { type: 'TRAVEL_NETWORK', targetSpaceId: 'uzbekistan-railways' });
    expect(r.players[0].cash).toBe(before + GO_SALARY);
    expect(r.lastMove?.backward).toBe(false);
  });
  it('Railways (5) -> Airways (15) does not cross START, so no salary', () => {
    let s = newTestGame();
    s = at(s, s.players[0].id, idx('uzbekistan-railways'));
    const before = s.players[0].cash;
    const r = run(s, { type: 'TRAVEL_NETWORK', targetSpaceId: 'uzbekistan-airways' });
    expect(r.players[0].position).toBe(15);
    expect(r.players[0].cash).toBe(before);
  });
});

describe('Tax Inspection: only forward, salary when crossing START', () => {
  it('from beyond the inspection corner the token crosses START and collects', () => {
    let s = newTestGame();
    s = at(s, s.players[0].id, 25);
    const before = s.players[0].cash;
    const r = sendToDetention(s, s.players[0].id);
    expect(r.players[0].position).toBe(10);
    expect(r.players[0].inDetention).toBe(true);
    expect(r.players[0].cash).toBe(before + GO_SALARY);
    expect(r.lastMove).toMatchObject({ from: 25, to: 10, backward: false, kind: 'jail' });
  });
  it('from before the corner no START is crossed, so no salary', () => {
    let s = newTestGame();
    s = at(s, s.players[0].id, 4);
    const before = s.players[0].cash;
    const r = sendToDetention(s, s.players[0].id);
    expect(r.players[0].position).toBe(10);
    expect(r.players[0].cash).toBe(before);
  });
  it('already standing there: no move and no free lap', () => {
    let s = newTestGame();
    s = at(s, s.players[0].id, 10);
    const before = s.players[0].cash;
    const r = sendToDetention(s, s.players[0].id);
    expect(r.players[0].cash).toBe(before);
    expect(r.players[0].inDetention).toBe(true);
  });
  it('three doubles in a row also send you forward past START', () => {
    let s = newTestGame();
    s = { ...at(s, s.players[0].id, 25), hasRolledThisTurn: true, doublesStreak: 2 };
    const before = s.players[0].cash;
    const r = run(s, { type: 'ROLL_DICE' }, 0, queueRng([3, 3]));
    expect(r.players[0].inDetention).toBe(true);
    expect(r.players[0].position).toBe(10);
    expect(r.players[0].cash).toBe(before + GO_SALARY);
  });
});

describe('Senior Official is a board cell', () => {
  it('sits at index 30 and the old go-to-inspection corner is gone', () => {
    expect(BOARD[30].id).toBe('bribe-official');
    expect(BOARD[30].kind).toBe('corner-bribe');
    expect(BOARD.some((b) => (b.kind as string) === 'corner-go-to-detention')).toBe(false);
  });
  it('landing there costs nothing and sends nobody to jail', () => {
    let s = newTestGame();
    s = { ...at(s, s.players[0].id, 25), phase: 'AWAITING_ROLL' };
    const before = s.players[0].cash;
    const r = run(s, { type: 'ROLL_DICE' }, 0, queueRng([2, 3]));
    expect(r.players[0].position).toBe(30);
    expect(r.players[0].inDetention).toBe(false);
    expect(r.players[0].cash).toBe(before);
    expect(r.phase).toBe('AWAITING_ROLL');
  });
  it('the bribe is only possible while standing on it, and is optional', () => {
    const base = { ...newTestGame(), hasRolledThisTurn: true };
    const away = at(base, base.players[0].id, 5);
    expect(run(away, { type: 'ATTEMPT_BRIBE' }, 0, floatRng([0.9, 0.5]))).toBe(away);
    const here = at(base, base.players[0].id, 30);
    const done = run(here, { type: 'ATTEMPT_BRIBE' }, 0, floatRng([0.9, 0.5]));
    expect(done.bribeGambleUsedThisTurn).toBe(true);
    // Not bribing is simply ending the turn.
    expect(run(here, { type: 'END_TURN' }).currentPlayerIndex).toBe(1);
  });
});

describe('Buy stays available while standing on an unowned space', () => {
  const landed = (cash: number): GameState => {
    let s = newTestGame();
    s = at(s, s.players[0].id, idx('korzinka'), { cash });
    return { ...s, phase: 'AWAITING_PURCHASE_DECISION', currentSpaceId: 'korzinka', hasRolledThisTurn: true, dice: [3, 3] };
  };
  it('decline, raise money with a loan, then buy', () => {
    let s = landed(100_000);
    expect(run(s, { type: 'BUY_PROPERTY' })).toBe(s); // cannot afford yet
    s = run(s, { type: 'DECLINE_PURCHASE' });
    expect(s.phase).toBe('AWAITING_ROLL');
    expect(run(s, { type: 'BUY_PROPERTY' })).toBe(s); // still short
    s = run(s, { type: 'TAKE_LOAN', amount: 1_000_000 });
    expect(s.players[0].cash).toBeGreaterThan(900_000);
    s = run(s, { type: 'BUY_PROPERTY' });
    expect(s.ownership['korzinka'].ownerId).toBe(s.players[0].id);
  });
  it('is not allowed before rolling, away from the space, or on an owned space', () => {
    const declined = run(landed(5_000_000), { type: 'DECLINE_PURCHASE' });
    expect(run({ ...declined, hasRolledThisTurn: false }, { type: 'BUY_PROPERTY' }).ownership['korzinka'].ownerId).toBeNull();
    const moved = at(declined, declined.players[0].id, 1);
    expect(run(moved, { type: 'BUY_PROPERTY' }).ownership['chorsu-bazaar'].ownerId).toBe(moved.players[0].id); // chorsu is unowned and he stands on it
    expect(run(moved, { type: 'BUY_PROPERTY' }).ownership['korzinka'].ownerId).toBeNull();
    const bought = run(declined, { type: 'BUY_PROPERTY' });
    expect(run(bought, { type: 'BUY_PROPERTY' })).toBe(bought);
  });
});

describe('Debt does not force bankruptcy', () => {
  const inDebt = (): GameState => {
    let s = newTestGame();
    s = at(s, s.players[0].id, 6, { cash: 0 });
    return {
      ...s,
      phase: 'AWAITING_LIQUIDATION',
      hasRolledThisTurn: true,
      pendingDebt: { amount: 2_000_000, payeeId: 'BANK', reason: 'tax', kind: 'tax' },
    };
  };
  it('a loan settles the debt and the player is still in the game', () => {
    const r = run(inDebt(), { type: 'TAKE_LOAN', amount: 3_000_000 });
    expect(r.phase).toBe('AWAITING_ROLL');
    expect(r.pendingDebt).toBeNull();
    expect(r.players[0].bankrupt).toBe(false);
    expect(r.players[0].cash).toBe(1_000_000);
  });
  it('a loan that is too small leaves the debt open, and PAY_DEBT waits until cash covers it', () => {
    let r = run(inDebt(), { type: 'TAKE_LOAN', amount: 1_000_000 });
    expect(r.phase).toBe('AWAITING_LIQUIDATION');
    expect(run(r, { type: 'PAY_DEBT' })).toBe(r);
    r = { ...r, players: r.players.map((p, i) => (i === 0 ? { ...p, cash: 2_500_000 } : p)) };
    r = run(r, { type: 'PAY_DEBT' });
    expect(r.phase).toBe('AWAITING_ROLL');
    expect(r.players[0].cash).toBe(500_000);
  });
  it('mortgaging through the normal MORTGAGE command works while in debt', () => {
    let s = inDebt();
    s = { ...s, pendingDebt: { ...s.pendingDebt!, amount: 300_000 }, ownership: { ...s.ownership, korzinka: { ...s.ownership.korzinka, ownerId: s.players[0].id } } };
    const r = run(s, { type: 'MORTGAGE', spaceId: 'korzinka' });
    expect(r.phase).toBe('AWAITING_ROLL');
    expect(r.players[0].bankrupt).toBe(false);
  });
  it('a trade can be proposed in debt; accepting pays the debt, declining returns to the debt', () => {
    let s = inDebt();
    s = { ...s, ownership: { ...s.ownership, korzinka: { ...s.ownership.korzinka, ownerId: s.players[0].id } } };
    const offer = {
      fromId: s.players[0].id, toId: s.players[1].id,
      offerCash: 0, offerPropertyIds: ['korzinka'], offerReleasePapers: 0,
      requestCash: 3_000_000, requestPropertyIds: [], requestReleasePapers: 0,
    };
    const proposed = run(s, { type: 'PROPOSE_TRADE', offer });
    expect(proposed.phase).toBe('AWAITING_TRADE_RESPONSE');
    const declined = run(proposed, { type: 'RESPOND_TRADE', accept: false }, 1);
    expect(declined.phase).toBe('AWAITING_LIQUIDATION');
    expect(declined.pendingDebt).not.toBeNull();
    const accepted = run(proposed, { type: 'RESPOND_TRADE', accept: true }, 1);
    expect(accepted.phase).toBe('AWAITING_ROLL');
    expect(accepted.pendingDebt).toBeNull();
    expect(accepted.players[0].cash).toBe(1_000_000);
  });
  it('declaring bankruptcy is still available as the last resort', () => {
    const r = run(inDebt(), { type: 'DECLARE_BANKRUPTCY' });
    expect(r.players[0].bankrupt).toBe(true);
  });
});
