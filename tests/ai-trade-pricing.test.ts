import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/game/types';
import { decideAiCommand, tradeAskPrice } from '../src/game/ai/aiPlayer';
import { PROPERTIES } from '../src/game/data/properties';
import { newTestGame } from './helpers';

// player-0 = the human asking; player-1 = the bot that owns agrobank.
function scenario(requesterBanks: string[], offerCash: number): GameState {
  let s = newTestGame(2);
  const own = (id: string, who: string) => {
    s = { ...s, ownership: { ...s.ownership, [id]: { ...s.ownership[id], ownerId: who } } };
  };
  own('agrobank', 'player-1');
  for (const b of requesterBanks) own(b, 'player-0');
  s = { ...s, players: s.players.map((p) => ({ ...p, cash: 50_000_000 })) };
  return {
    ...s,
    phase: 'AWAITING_TRADE_RESPONSE',
    trade: {
      id: 't', fromId: 'player-0', toId: 'player-1',
      offerCash, offerPropertyIds: [], offerReleasePapers: 0,
      requestCash: 0, requestPropertyIds: ['agrobank'], requestReleasePapers: 0,
    },
  };
}
const answer = (s: GameState) => {
  const c = decideAiCommand(s, 'player-1', () => 0.5);
  return c?.type === 'RESPOND_TRADE' ? c.accept : null;
};
const price = PROPERTIES['agrobank'].price;

describe('bots price a property by what the requester already holds', () => {
  it('refuses an even-price offer', () => {
    expect(answer(scenario([], price))).toBe(false);
  });
  it('requester owns no other bank: about double', () => {
    expect(answer(scenario([], price * 1.5))).toBe(false);
    expect(answer(scenario([], price * 2.1))).toBe(true);
  });
  it('requester owns one other bank: much dearer', () => {
    expect(answer(scenario(['hamkorbank'], price * 2.2))).toBe(false);
    expect(answer(scenario(['hamkorbank'], price * 3.7))).toBe(true);
  });
  it('requester would complete the set (owns 2, wants the 3rd): a fortune', () => {
    expect(answer(scenario(['hamkorbank', 'kapitalbank'], price * 4))).toBe(false);
    expect(answer(scenario(['hamkorbank', 'kapitalbank'], price * 6.5))).toBe(true);
  });
  it('the ask grows strictly with holdings, and the bot asks more for breaking its own set', () => {
    const a0 = tradeAskPrice(scenario([], 0), 'player-1', 'player-0', 'agrobank');
    const a1 = tradeAskPrice(scenario(['hamkorbank'], 0), 'player-1', 'player-0', 'agrobank');
    const a2 = tradeAskPrice(scenario(['hamkorbank', 'kapitalbank'], 0), 'player-1', 'player-0', 'agrobank');
    expect(a0).toBeGreaterThanOrEqual(price * 2);
    expect(a1).toBeGreaterThan(a0);
    expect(a2).toBeGreaterThan(a1);
    let own = scenario([], 0);
    for (const b of ['hamkorbank', 'kapitalbank']) own = { ...own, ownership: { ...own.ownership, [b]: { ...own.ownership[b], ownerId: 'player-1' } } };
    expect(tradeAskPrice(own, 'player-1', 'player-0', 'agrobank')).toBeGreaterThan(a0);
  });
});
