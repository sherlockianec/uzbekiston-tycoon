import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/game/types';
import { decideAiCommand, tradeAskPrice, pickTradeProposal } from '../src/game/ai/aiPlayer';
import { PERSONALITIES } from '../src/game/ai/personalities';
import { applyCommand } from '../src/game/engine';
import { PROPERTIES } from '../src/game/data/properties';
import { newTestGame } from './helpers';

// player-0 = the human asking; player-1 = the bot that owns agrobank.
function scenario(requesterBanks: string[], offerCash = 0, turn = 1): GameState {
  let s = newTestGame(2);
  const own = (id: string, who: string) => {
    s = { ...s, ownership: { ...s.ownership, [id]: { ...s.ownership[id], ownerId: who } } };
  };
  own('agrobank', 'player-1');
  for (const b of requesterBanks) own(b, 'player-0');
  s = { ...s, turnNumber: turn, players: s.players.map((p) => ({ ...p, cash: 15_000_000 })) };
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
const price = PROPERTIES['agrobank'].price;
const ask = (s: GameState) => tradeAskPrice(s, 'player-1', 'player-0', 'agrobank');
const answer = (s: GameState) => {
  const c = decideAiCommand(s, 'player-1', () => 0.5);
  return c?.type === 'RESPOND_TRADE' ? c : null;
};

describe('bots price a property by value, holdings, wealth and mood', () => {
  it('refuses an even-price offer', () => {
    expect(answer(scenario([], price))?.accept).toBe(false);
  });
  it('the ask grows with what the requester already holds', () => {
    const a0 = ask(scenario([]));
    const a1 = ask(scenario(['hamkorbank']));
    const a2 = ask(scenario(['hamkorbank', 'kapitalbank']));
    expect(a1).toBeGreaterThan(a0);
    expect(a2).toBeGreaterThan(a1 * 1.5); // completing the set costs a fortune
  });
  it('is not a fixed multiple: the ask varies from turn to turn', () => {
    const asks = new Set<number>();
    for (let turn = 1; turn <= 12; turn++) asks.add(ask(scenario([], 0, turn)));
    expect(asks.size).toBeGreaterThan(4);
    const ratios = [...asks].map((a) => a / price);
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeGreaterThan(0.3);
  });
  it('a desperate bot (loan + mortgages + no cash) asks clearly less than a rich one', () => {
    const rich = scenario([], 0);
    const poor = {
      ...rich,
      players: rich.players.map((p) => (p.id === 'player-1' ? { ...p, cash: 500_000, loan: { principal: 1, dueAmount: 2, lapsLeft: 2 } } : p)),
      ownership: { ...rich.ownership, agrobank: { ...rich.ownership.agrobank, mortgaged: false }, uzum: { ...rich.ownership.uzum, ownerId: 'player-1', mortgaged: true } },
    } as GameState;
    expect(ask(poor)).toBeLessThan(ask(rich) * 0.85);
  });
  it('reports how far an offer was, so the human gets a hint', () => {
    const c = answer(scenario([], price * 0.3));
    expect(c?.accept).toBe(false);
    expect(c?.ratio).toBeLessThan(0.5);
  });
  it('accepts a generous offer', () => {
    expect(answer(scenario([], price * 8))?.accept).toBe(true);
  });
});

describe('a refused trade stays explainable and bots stop nagging', () => {
  it('records lastTradeResult with the ratio when declined', () => {
    const s = scenario([], 1_000_000);
    const r = applyCommand(s, { type: 'RESPOND_TRADE', accept: false, ratio: 0.4 }, 'player-1', { next: () => 0.5, int: () => 1 } as never);
    expect(r.lastTradeResult).toMatchObject({ accepted: false, fromId: 'player-0', ratio: 0.4 });
    expect(r.trade).toBeNull();
  });
  it('a bot raises its offer after each refusal and gives up after three', () => {
    // bot (player-1) owns 2 of a group; the human holds the third.
    const base = () => {
      let s = newTestGame(2);
      const own = (id: string, who: string) => { s = { ...s, ownership: { ...s.ownership, [id]: { ...s.ownership[id], ownerId: who } } }; };
      own('agrobank', 'player-1'); own('hamkorbank', 'player-1'); own('kapitalbank', 'player-0');
      s = { ...s, currentPlayerIndex: 1, tradeProposedThisTurn: false, players: s.players.map((p) => ({ ...p, cash: 40_000_000 })) };
      return s;
    };
    const bot = (s: GameState) => s.players[1];
    const offers: number[] = [];
    let s = base();
    for (let i = 0; i < 4; i++) {
      s = { ...s, tradeProposedThisTurn: false };
      const cmd = pickTradeProposal(s, bot(s), PERSONALITIES.aggressive, () => 0, 'hard');
      if (!cmd || cmd.type !== 'PROPOSE_TRADE') { offers.push(-1); continue; }
      offers.push(cmd.offer.offerCash);
      s = applyCommand(s, cmd, 'player-1', { next: () => 0.5, int: () => 1 } as never);
      s = applyCommand(s, { type: 'RESPOND_TRADE', accept: false }, 'player-0', { next: () => 0.5, int: () => 1 } as never);
    }
    expect(offers[0]).toBeGreaterThan(0);
    expect(offers[1]).toBeGreaterThan(offers[0]);
    expect(offers[2]).toBeGreaterThan(offers[1]);
    expect(offers[3]).toBe(-1); // stopped asking
  });
});
