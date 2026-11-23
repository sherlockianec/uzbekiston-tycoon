import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/game/types';
import { applyCommand, canMortgage, doublesRerollPending, isTradeable, resolveLanding } from '../src/game/engine';
import { ALL_CARDS } from '../src/game/data/cards';
import { BOARD } from '../src/game/data/board';
import { decideAiCommand } from '../src/game/ai/aiPlayer';
import { aiFallbackCommands } from '../src/state/GameProvider';
import { atOfficial, floatRng, newTestGame, queueRng } from './helpers';

const idx = (id: string) => BOARD.find((s) => s.id === id)!.index;
const run = (s: GameState, cmd: Parameters<typeof applyCommand>[1], who = 0, rng = queueRng([])) =>
  applyCommand(s, cmd, s.players[who].id, rng);

/** Player 0 owns the whole Retail group (korzinka, havas, makro) with the given levels. */
function retailOwned(levels: [number, number, number]): GameState {
  const s = newTestGame();
  const ids = ['korzinka', 'havas', 'makro'];
  const ownership = { ...s.ownership };
  ids.forEach((id, i) => {
    ownership[id] = { ...ownership[id], ownerId: s.players[0].id, level: levels[i] };
  });
  return { ...s, ownership, hasRolledThisTurn: true };
}

describe('Tax Inspection cancels a pending doubles re-roll', () => {
  it('a "go to Tax Inspection" card drawn after doubles gives no free roll from jail', () => {
    const s0 = newTestGame();
    const s: GameState = {
      ...s0,
      phase: 'AWAITING_CARD_ACK',
      drawnCard: ALL_CARDS['business-dispute'],
      drawnCardDeck: 'business',
      hasRolledThisTurn: true,
      doublesStreak: 1,
      dice: [3, 3],
    };
    const jailed = run(s, { type: 'ACK_CARD' });
    expect(jailed.players[0].inDetention).toBe(true);
    expect(jailed.doublesStreak).toBe(0);
    expect(run(jailed, { type: 'ROLL_DICE' }, 0, queueRng([6, 6]))).toBe(jailed); // refused
    expect(run(jailed, { type: 'END_TURN' }).currentPlayerIndex).toBe(1); // and the turn can end
  });

  it('losing the bribe gamble to Tax Inspection after doubles gives no free roll either', () => {
    const s = { ...atOfficial(newTestGame()), doublesStreak: 1, dice: [5, 5] as [number, number] };
    const jailed = run(s, { type: 'ATTEMPT_BRIBE' }, 0, floatRng([0.5])); // 0.40 <= 0.5 < 0.75: jail
    expect(jailed.players[0].inDetention).toBe(true);
    expect(jailed.doublesStreak).toBe(0);
    expect(run(jailed, { type: 'ROLL_DICE' }, 0, queueRng([2, 2]))).toBe(jailed);
  });
});

describe('the doubles re-roll is mandatory', () => {
  it('END_TURN is refused until the extra roll is taken', () => {
    const s: GameState = { ...newTestGame(), hasRolledThisTurn: true, doublesStreak: 1, dice: [2, 2] };
    expect(doublesRerollPending(s, s.players[0].id)).toBe(true);
    expect(run(s, { type: 'END_TURN' })).toBe(s);
    const afterReroll = { ...s, doublesStreak: 0 };
    expect(doublesRerollPending(afterReroll, s.players[0].id)).toBe(false);
    expect(run(afterReroll, { type: 'END_TURN' }).currentPlayerIndex).toBe(1);
  });

  it('bots still roll again before ending the turn', () => {
    let s: GameState = { ...newTestGame(), hasRolledThisTurn: true, doublesStreak: 1, dice: [2, 2] };
    s = { ...s, currentPlayerIndex: 1, players: s.players.map((p) => ({ ...p, position: idx('detention') })) };
    expect(decideAiCommand(s, s.players[1].id, () => 0.99)).toEqual({ type: 'ROLL_DICE' });
  });
});

describe('a colour group with development cannot be mortgaged or traded piece by piece', () => {
  it('the undeveloped piece of a developed group cannot be mortgaged', () => {
    const s = retailOwned([1, 1, 0]);
    expect(canMortgage(s, s.players[0].id, 'makro')).toBe(false);
    expect(run(s, { type: 'MORTGAGE', spaceId: 'makro' })).toBe(s);
    const cleared = retailOwned([0, 0, 0]);
    expect(canMortgage(cleared, cleared.players[0].id, 'makro')).toBe(true);
  });

  it('nor offered in a trade', () => {
    const s = retailOwned([1, 1, 0]);
    expect(isTradeable(s, 'makro')).toBe(false);
    const offer = {
      fromId: s.players[0].id,
      toId: s.players[1].id,
      offerCash: 0,
      offerPropertyIds: ['makro'],
      offerReleasePapers: 0,
      requestCash: 100_000,
      requestPropertyIds: [],
      requestReleasePapers: 0,
    };
    expect(run(s, { type: 'PROPOSE_TRADE', offer })).toBe(s);
    const cleared = retailOwned([0, 0, 0]);
    expect(run(cleared, { type: 'PROPOSE_TRADE', offer }).phase).toBe('AWAITING_TRADE_RESPONSE');
  });

  it('transport and utilities are unaffected', () => {
    let s = newTestGame();
    s = { ...s, ownership: { ...s.ownership, 'uzbekistan-railways': { ...s.ownership['uzbekistan-railways'], ownerId: s.players[0].id } } };
    expect(isTradeable(s, 'uzbekistan-railways')).toBe(true);
    expect(canMortgage(s, s.players[0].id, 'uzbekistan-railways')).toBe(true);
  });
});

describe('rent while the owner is in Tax Inspection', () => {
  it('the log names the property, not its internal id', () => {
    let s = newTestGame();
    s = {
      ...s,
      ownership: { ...s.ownership, havas: { ...s.ownership.havas, ownerId: s.players[1].id } },
      players: s.players.map((p, i) => (i === 1 ? { ...p, inDetention: true } : { ...p, position: idx('havas') })),
    };
    const r = resolveLanding(s, s.players[0].id, queueRng([]));
    const last = r.log[r.log.length - 1].text;
    expect(last).toContain('Havas');
    expect(last).not.toContain('havas earned');
  });
});

describe('bot fallback moves (keep the game loop from freezing)', () => {
  it('offers a legal move for every phase a bot can be asked to act in', () => {
    const s = newTestGame();
    expect(aiFallbackCommands(s, s.players[0].id)[0]).toEqual({ type: 'ROLL_DICE' });
    expect(aiFallbackCommands({ ...s, phase: 'AWAITING_PURCHASE_DECISION' }, s.players[0].id)).toEqual([{ type: 'DECLINE_PURCHASE' }]);
    expect(aiFallbackCommands({ ...s, phase: 'AWAITING_CARD_ACK' }, s.players[0].id)).toEqual([{ type: 'ACK_CARD' }]);
  });

  it('the first fallback that the rules accept actually changes the state', () => {
    const s: GameState = { ...newTestGame(), hasRolledThisTurn: true };
    const refused = run(s, { type: 'DEVELOP', spaceId: 'havas' }); // owns nothing: refused
    expect(refused).toBe(s);
    const moved = aiFallbackCommands(s, s.players[0].id)
      .map((cmd) => run(s, cmd))
      .find((next) => next !== s);
    expect(moved?.currentPlayerIndex).toBe(1); // ROLL_DICE refused (already rolled), END_TURN accepted
  });
});
