import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/game/types';
import { applyCommand, sendToDetention } from '../src/game/engine';
import { GO_SALARY, LOAN_LAPS } from '../src/game/data/economy';
import { BOARD } from '../src/game/data/board';
import { newTestGame, queueRng, floatRng } from './helpers';

const idx = (id: string) => BOARD.find((s) => s.id === id)!.index;
const at = (s: GameState, id: string, position: number, extra: Partial<GameState['players'][number]> = {}): GameState => ({
  ...s,
  players: s.players.map((p) => (p.id === id ? { ...p, position, ...extra } : p)),
});
const own = (s: GameState, spaceId: string, ownerId: string | null): GameState => ({
  ...s,
  ownership: { ...s.ownership, [spaceId]: { ...s.ownership[spaceId], ownerId } },
});
const run = (s: GameState, cmd: Parameters<typeof applyCommand>[1], who = 0, rng = queueRng([])) =>
  applyCommand(s, cmd, s.players[who].id, rng);

describe('board corners (v1.2 swap)', () => {
  it('Chorsu Choyxona 10, Senior Official 20, Tax Inspection 30', () => {
    expect([BOARD[10].id, BOARD[10].kind]).toEqual(['rest', 'corner-rest']);
    expect([BOARD[20].id, BOARD[20].kind]).toEqual(['bribe-official', 'corner-bribe']);
    expect([BOARD[30].id, BOARD[30].kind]).toEqual(['detention', 'corner-detention']);
  });
});

describe('transport network: only right after arriving by dice, only on an owned station, once', () => {
  const ready = (): GameState => {
    let s = newTestGame();
    s = at(s, s.players[0].id, idx('tashkent-metro'));
    s = own(s, 'tashkent-metro', s.players[0].id);
    return { ...s, networkTravelEligible: true, hasRolledThisTurn: true };
  };
  it('Metro (35) -> Railways (5) goes forward across START and pays the salary', () => {
    const s = ready();
    const before = s.players[0].cash;
    const r = run(s, { type: 'TRAVEL_NETWORK', targetSpaceId: 'uzbekistan-railways' });
    expect(r.players[0].position).toBe(5);
    expect(r.players[0].cash).toBe(before + GO_SALARY);
    expect(r.lastMove).toMatchObject({ from: 35, to: 5, backward: false, kind: 'travel', crossedStart: true, startDelta: GO_SALARY });
  });
  it('Railways (5) -> Airways (15) does not cross START, so no salary', () => {
    let s = at(ready(), 'player-0', idx('uzbekistan-railways'));
    s = own(s, 'uzbekistan-railways', 'player-0');
    const before = s.players[0].cash;
    const r = run(s, { type: 'TRAVEL_NETWORK', targetSpaceId: 'uzbekistan-airways' });
    expect(r.players[0].position).toBe(15);
    expect(r.players[0].cash).toBe(before);
    expect(r.lastMove?.crossedStart).toBe(false);
  });
  it('is refused when not eligible (not arrived by dice) or when the station is unowned', () => {
    const s = ready();
    expect(run({ ...s, networkTravelEligible: false }, { type: 'TRAVEL_NETWORK', targetSpaceId: 'uzbekistan-railways' }).players[0].position).toBe(35);
    const unowned = own(s, 'tashkent-metro', null);
    expect(run(unowned, { type: 'TRAVEL_NETWORK', targetSpaceId: 'uzbekistan-railways' }).players[0].position).toBe(35);
  });
  it('after travelling there is no chain: eligibility is spent, and it resets on the next turn', () => {
    const r = run(ready(), { type: 'TRAVEL_NETWORK', targetSpaceId: 'uzbekistan-railways' });
    expect(r.networkTravelEligible).toBe(false);
    expect(run(r, { type: 'TRAVEL_NETWORK', targetSpaceId: 'uzbekistan-airways' }).players[0].position).toBe(5);
    const next = run({ ...r, hasRolledThisTurn: true }, { type: 'END_TURN' });
    expect(next.networkTravelEligible).toBe(false);
  });
  it('a dice roll ending on a station makes travel eligible; a roll ending elsewhere does not', () => {
    let s = at(newTestGame(), 'player-0', 2);
    let r = run(s, { type: 'ROLL_DICE' }, 0, queueRng([1, 2])); // 2 + 3 = 5 railways
    expect(r.players[0].position).toBe(5);
    expect(r.networkTravelEligible).toBe(true);
    r = run(s, { type: 'ROLL_DICE' }, 0, queueRng([1, 1])); // lands on 4 (tax)
    expect(r.networkTravelEligible).toBe(false);
  });
});

describe('Tax Inspection (index 30): only forward, salary when crossing START', () => {
  it('from beyond the corner the token crosses START and collects', () => {
    let s = at(newTestGame(), 'player-0', 35);
    const before = s.players[0].cash;
    const r = sendToDetention(s, s.players[0].id);
    expect(r.players[0].position).toBe(30);
    expect(r.players[0].inDetention).toBe(true);
    expect(r.players[0].cash).toBe(before + GO_SALARY);
    expect(r.lastMove).toMatchObject({ from: 35, to: 30, backward: false, kind: 'jail', crossedStart: true });
  });
  it('from before the corner no START is crossed, so no salary', () => {
    const s = at(newTestGame(), 'player-0', 25);
    const before = s.players[0].cash;
    const r = sendToDetention(s, s.players[0].id);
    expect(r.players[0].position).toBe(30);
    expect(r.players[0].cash).toBe(before);
  });
  it('already standing there: no move and no free lap', () => {
    const s = at(newTestGame(), 'player-0', 30);
    const before = s.players[0].cash;
    const r = sendToDetention(s, s.players[0].id);
    expect(r.players[0].cash).toBe(before);
    expect(r.players[0].inDetention).toBe(true);
  });
  it('three doubles in a row also send you forward past START', () => {
    let s = { ...at(newTestGame(), 'player-0', 35), hasRolledThisTurn: true, doublesStreak: 2 };
    const before = s.players[0].cash;
    const r = run(s, { type: 'ROLL_DICE' }, 0, queueRng([3, 3]));
    expect(r.players[0].inDetention).toBe(true);
    expect(r.players[0].position).toBe(30);
    expect(r.players[0].cash).toBe(before + GO_SALARY);
  });
});

describe('Senior Official (index 20) is a board cell', () => {
  it('landing there costs nothing and sends nobody to jail', () => {
    let s = { ...at(newTestGame(), 'player-0', 15), phase: 'AWAITING_ROLL' as const };
    const before = s.players[0].cash;
    const r = run(s, { type: 'ROLL_DICE' }, 0, queueRng([2, 3]));
    expect(r.players[0].position).toBe(20);
    expect(r.players[0].inDetention).toBe(false);
    expect(r.players[0].cash).toBe(before);
  });
  it('the bribe is only possible while standing on it, and is optional', () => {
    const base = { ...newTestGame(), hasRolledThisTurn: true };
    const away = at(base, base.players[0].id, 5);
    expect(run(away, { type: 'ATTEMPT_BRIBE' }, 0, floatRng([0.9, 0.5]))).toBe(away);
    const here = at(base, base.players[0].id, 20);
    const done = run(here, { type: 'ATTEMPT_BRIBE' }, 0, floatRng([0.9, 0.5]));
    expect(done.bribeGambleUsedThisTurn).toBe(true);
    expect(run(here, { type: 'END_TURN' }).currentPlayerIndex).toBe(1);
  });
});

describe('Chorsu Choyxona: ending a turn there skips the next roll', () => {
  it('END_TURN on the choyxona sets resting; next turn has no roll and clears it', () => {
    let s = { ...at(newTestGame(), 'player-0', 10), hasRolledThisTurn: true };
    s = run(s, { type: 'END_TURN' });
    expect(s.players[0].resting).toBe(true);
    // second player plays and ends, back to player 0
    s = run({ ...s, hasRolledThisTurn: true }, { type: 'END_TURN' }, 1);
    expect(s.currentPlayerIndex).toBe(0);
    expect(run(s, { type: 'ROLL_DICE' })).toBe(s);
    const after = run(s, { type: 'END_TURN' });
    expect(after.players[0].resting).toBe(false);
    expect(after.currentPlayerIndex).toBe(1);
  });
  it('passing over the choyxona does nothing', () => {
    const s = at(newTestGame(), 'player-0', 8);
    const r = run(s, { type: 'ROLL_DICE' }, 0, queueRng([3, 4])); // 8 + 7 = 15
    expect(r.players[0].resting).toBe(false);
    expect(run({ ...r, hasRolledThisTurn: true }, { type: 'END_TURN' }).players[0].resting).toBe(false);
  });
});

describe('Buying before the roll', () => {
  const standing = (cash: number): GameState => {
    let s = at(newTestGame(), 'player-0', idx('korzinka'), { cash });
    return { ...s, phase: 'AWAITING_ROLL', hasRolledThisTurn: false };
  };
  it('can buy the unowned property you stand on at the start of your turn, then roll', () => {
    let s = run(standing(5_000_000), { type: 'BUY_PROPERTY' });
    expect(s.ownership['korzinka'].ownerId).toBe('player-0');
    expect(s.phase).toBe('AWAITING_ROLL');
    expect(s.hasRolledThisTurn).toBe(false);
    s = run(s, { type: 'ROLL_DICE' }, 0, queueRng([1, 2]));
    expect(s.players[0].position).toBe(idx('korzinka') + 3);
  });
  it('cannot buy what is owned, or without enough cash', () => {
    const owned = own(standing(5_000_000), 'korzinka', 'player-1');
    expect(run(owned, { type: 'BUY_PROPERTY' })).toBe(owned);
    const poor = standing(100_000);
    expect(run(poor, { type: 'BUY_PROPERTY' })).toBe(poor);
  });
  it('decline then raise money with a loan, then buy', () => {
    let s: GameState = { ...standing(100_000), phase: 'AWAITING_PURCHASE_DECISION', currentSpaceId: 'korzinka', hasRolledThisTurn: true };
    s = run(s, { type: 'DECLINE_PURCHASE' });
    s = run(s, { type: 'TAKE_LOAN', amount: 1_000_000 });
    s = run(s, { type: 'BUY_PROPERTY' });
    expect(s.ownership['korzinka'].ownerId).toBe('player-0');
  });
});

describe('Negative balance instead of debt', () => {
  const owing = (cash: number): GameState => {
    let s = at(newTestGame(), 'player-0', idx('korzinka') - 3, { cash });
    s = own(s, 'korzinka', 'player-1');
    return s;
  };
  it('rent is paid in full to the owner even when the payer cannot cover it', () => {
    const s = owing(10_000);
    const rentless = run(s, { type: 'ROLL_DICE' }, 0, queueRng([1, 2]));
    const paid = s.players[1].cash;
    expect(rentless.players[1].cash).toBeGreaterThan(paid);
    expect(rentless.players[0].cash).toBe(10_000 - (rentless.players[1].cash - paid));
    expect(rentless.players[0].cash).toBeLessThan(0);
    expect(rentless.phase).toBe('AWAITING_ROLL');
    expect(rentless.players[0].bankrupt).toBe(false);
  });
  it('cannot end the turn or roll while negative; can once back at zero or above', () => {
    let s: GameState = { ...at(newTestGame(), 'player-0', 6, { cash: -100_000 }), hasRolledThisTurn: true };
    expect(run(s, { type: 'END_TURN' })).toBe(s);
    s = own(s, 'korzinka', 'player-0');
    s = run(s, { type: 'MORTGAGE', spaceId: 'korzinka' });
    expect(s.players[0].cash).toBeGreaterThanOrEqual(0);
    expect(run(s, { type: 'END_TURN' }).currentPlayerIndex).toBe(1);
  });
  it('a loan can lift a negative balance', () => {
    let s: GameState = at(newTestGame(), 'player-0', 6, { cash: -500_000 });
    s = run(s, { type: 'TAKE_LOAN', amount: 1_000_000 });
    expect(s.players[0].cash).toBe(500_000);
  });
  it('bankruptcy is only offered while negative and frees every property', () => {
    let s: GameState = at(newTestGame(), 'player-0', 6, { cash: 1_000_000 });
    expect(run(s, { type: 'DECLARE_BANKRUPTCY' })).toBe(s);
    s = own(s, 'korzinka', 'player-0');
    s = at(s, 'player-0', 6, { cash: -1_000_000 });
    s = { ...s, ownership: { ...s.ownership, korzinka: { ...s.ownership.korzinka, level: 2 } } };
    const r = run(s, { type: 'DECLARE_BANKRUPTCY' });
    expect(r.players[0].bankrupt).toBe(true);
    expect(r.ownership['korzinka']).toMatchObject({ ownerId: null, level: 0, mortgaged: false });
    expect(r.players[1].cash).toBe(s.players[1].cash); // nothing is transferred to anyone
  });
});

describe('Loan: one lump sum at maturity', () => {
  it('takes principal + 30% once, after LOAN_LAPS START passes', () => {
    let s = run(newTestGame(), { type: 'TAKE_LOAN', amount: 10_000_000 });
    expect(s.players[0].loan).toEqual({ principal: 10_000_000, dueAmount: 13_000_000, lapsLeft: LOAN_LAPS });
    const cashAfterLoan = s.players[0].cash;
    for (let lap = 1; lap <= LOAN_LAPS; lap++) {
      s = { ...at(s, 'player-0', 38), phase: 'AWAITING_ROLL', hasRolledThisTurn: false, doublesStreak: 0 };
      s = run(s, { type: 'ROLL_DICE' }, 0, queueRng([2, 3])); // crosses START
      if (lap < LOAN_LAPS) expect(s.players[0].loan?.lapsLeft).toBe(LOAN_LAPS - lap);
    }
    expect(s.players[0].loan).toBeNull();
    expect(s.players[0].cash).toBe(cashAfterLoan + GO_SALARY * LOAN_LAPS - 13_000_000);
  });
});
