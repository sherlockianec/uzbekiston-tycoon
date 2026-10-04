import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/game/types';
import {
  applyCommand,
  computeRent,
  rankPlayers,
  shouldWarnBeforeBankruptcy,
  balanceTradeCash,
  liquidValue,
} from '../src/game/engine';
import { pickTradeProposal } from '../src/game/ai/aiPlayer';
import { PERSONALITIES } from '../src/game/ai/personalities';
import { spaceById } from '../src/game/data/board';
import { GROUPS, PROPERTIES } from '../src/game/data/properties';
import { DETENTION_FINE_SCHEDULE, PROPERTY_TAX_PER_ASSET } from '../src/game/data/economy';
import { newTestGame, queueRng } from './helpers';

const own = (s: GameState, owner: number, ids: string[], extra: Record<string, unknown> = {}): GameState => {
  const ownership = { ...s.ownership };
  for (const id of ids) ownership[id] = { ...ownership[id], ownerId: s.players[owner].id, ...extra };
  return { ...s, ownership };
};

describe('jailed owners earn no rent', () => {
  it('computeRent is 0 while the owner is in Tax Inspection, normal otherwise', () => {
    let s = own(newTestGame(), 1, ['korzinka']);
    const normal = computeRent(s, 'korzinka', 7, 1);
    expect(normal).toBeGreaterThan(0);
    s = { ...s, players: s.players.map((p, i) => (i === 1 ? { ...p, inDetention: true } : p)) };
    expect(computeRent(s, 'korzinka', 7, 1)).toBe(0);
  });

  it('a visitor pays nothing and the log explains why', () => {
    let s = own(newTestGame(), 1, ['korzinka']);
    s = { ...s, players: s.players.map((p, i) => (i === 1 ? { ...p, inDetention: true } : p)) };
    const idx = spaceById('korzinka').index;
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, position: idx - 3 } : p)) };
    const cash = s.players[0].cash;
    const r = applyCommand(s, { type: 'ROLL_DICE' }, s.players[0].id, queueRng([1, 2]));
    expect(r.players[0].position).toBe(idx);
    expect(r.players[0].cash).toBe(cash);
    expect(r.log.some((l) => /earned no rent/.test(l.text))).toBe(true);
  });
});

describe('detention fine decreases with waiting', () => {
  it('schedule is strictly decreasing', () => {
    for (let i = 1; i < DETENTION_FINE_SCHEDULE.length; i++) {
      expect(DETENTION_FINE_SCHEDULE[i]).toBeLessThan(DETENTION_FINE_SCHEDULE[i - 1]);
    }
  });
  it('each turn served charges the matching tier and frees the player', () => {
    DETENTION_FINE_SCHEDULE.forEach((fine, turns) => {
      let s = newTestGame();
      s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, inDetention: true, detentionTurns: turns } : p)) };
      const cash = s.players[0].cash;
      const r = applyCommand(s, { type: 'PAY_DETENTION_FINE' }, s.players[0].id, queueRng([]));
      expect(cash - r.players[0].cash).toBe(fine);
      expect(r.players[0].inDetention).toBe(false);
    });
  });
  it('cannot pay without enough cash', () => {
    let s = newTestGame();
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, inDetention: true, detentionTurns: 0, cash: 100 } : p)) };
    expect(applyCommand(s, { type: 'PAY_DETENTION_FINE' }, s.players[0].id, queueRng([]))).toBe(s);
  });
});

describe('business tax counts only unmortgaged assets', () => {
  const landOnBusinessTax = (s: GameState) => {
    const idx = spaceById('customs-duty').index;
    const t = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, position: idx - 3 } : p)) };
    return applyCommand(t, { type: 'ROLL_DICE' }, t.players[0].id, queueRng([1, 2]));
  };
  it('3 owned, 1 mortgaged -> pays for 2', () => {
    let s = own(newTestGame(), 0, ['korzinka', 'havas', 'makro']);
    s = own(s, 0, ['makro'], { mortgaged: true, mortgageLapsRemaining: 6 });
    const cash = s.players[0].cash;
    const r = landOnBusinessTax(s);
    expect(cash - r.players[0].cash).toBe(2 * PROPERTY_TAX_PER_ASSET);
  });
  it('owning nothing costs nothing', () => {
    const s = newTestGame();
    const r = landOnBusinessTax(s);
    expect(r.players[0].cash).toBe(s.players[0].cash);
  });
});

describe('end-game ranking', () => {
  it('winner first, then by bankruptcy order descending (last out = 2nd)', () => {
    let s = newTestGame();
    s = {
      ...s,
      winnerId: s.players[0].id,
      players: s.players.map((p, i) => (i === 0 ? p : { ...p, bankrupt: true, bankruptOrder: i })),
    };
    const ranked = rankPlayers(s);
    expect(ranked[0].id).toBe(s.players[0].id);
    expect(ranked.map((p) => p.bankruptOrder ?? 0)).toEqual([0, 1]);
  });
  it('4 players rank correctly', () => {
    const s0 = newTestGame(4);
    const orders = [0, 3, 1, 2]; // player 1 went out last, then 3, then 2
    const s: GameState = {
      ...s0,
      winnerId: s0.players[0].id,
      players: s0.players.map((p, i) => (i === 0 ? p : { ...p, bankrupt: true, bankruptOrder: orders[i] })),
    };
    expect(rankPlayers(s).map((p) => p.id)).toEqual([s0.players[0].id, s0.players[1].id, s0.players[3].id, s0.players[2].id]);
  });
  it('liquidation assigns increasing bankruptOrder', () => {
    let s = newTestGame(3);
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, cash: -9e9 } : p)), currentPlayerIndex: 0 } as GameState;
    s = applyCommand(s, { type: 'DECLARE_BANKRUPTCY' }, s.players[0].id, queueRng([]));
    expect(s.players[0].bankruptOrder).toBe(1);
  });
});

describe('bankruptcy warning', () => {
  it('warns when net worth is still positive, not when broke', () => {
    const s = newTestGame();
    expect(shouldWarnBeforeBankruptcy(s, s.players[0].id)).toBe(true);
    const broke = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, cash: 0 } : p)) };
    expect(shouldWarnBeforeBankruptcy(broke, s.players[0].id)).toBe(false);
  });
  it('owned assets and loans count toward net worth', () => {
    let s = own(newTestGame(), 0, ['korzinka']);
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, cash: 0 } : p)) };
    expect(shouldWarnBeforeBankruptcy(s, s.players[0].id)).toBe(true);
    const loaded = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, loan: { principal: 1, dueAmount: 1e9, lapsLeft: 1 } } : p)) };
    expect(liquidValue(loaded, s.players[0].id)).toBeLessThan(0);
    expect(shouldWarnBeforeBankruptcy(loaded, s.players[0].id)).toBe(false);
  });
});

describe('trade balance helper', () => {
  const base = { offerCash: 0, requestCash: 0, offerPropsValue: 0, requestPropsValue: 0, myCash: 5_000_000, theirCash: 5_000_000 };
  it('adds cash to my side when I ask for more', () => {
    expect(balanceTradeCash({ ...base, requestPropsValue: 700_000 })).toEqual({ offerCash: 700_000, requestCash: 0 });
  });
  it('asks them for cash when I offer more', () => {
    expect(balanceTradeCash({ ...base, offerPropsValue: 600_000, offerCash: 100_000 })).toEqual({ offerCash: 100_000, requestCash: 700_000 });
  });
  it('is a no-op when already balanced', () => {
    expect(balanceTradeCash({ ...base, offerPropsValue: 600_000, requestPropsValue: 600_000 })).toEqual({ offerCash: 0, requestCash: 0 });
  });
  it('is capped by what the paying player holds', () => {
    expect(balanceTradeCash({ ...base, requestPropsValue: 9_000_000, myCash: 2_000_000 }).offerCash).toBe(2_000_000);
    expect(balanceTradeCash({ ...base, offerPropsValue: 9_000_000, theirCash: 1_000_000 }).requestCash).toBe(1_000_000);
  });
});

describe('AI trade proposals', () => {
  const nearMonopoly = (): GameState => {
    const g = GROUPS.find((x) => x.id === 'retail')!; // 3 properties
    let s = own(newTestGame(), 1, [g.propertyIds[0], g.propertyIds[1]]); // AI = player 1
    s = own(s, 0, [g.propertyIds[2]]); // human holds the last piece
    return { ...s, currentPlayerIndex: 1 };
  };
  const ai = (s: GameState) => s.players[1];
  const traits = PERSONALITIES.developer;

  it('proposes buying the one missing piece at the owner\'s full monopoly-aware ask', () => {
    const s = nearMonopoly();
    const cmd = pickTradeProposal(s, ai(s), traits, () => 0, 'hard');
    expect(cmd?.type).toBe('PROPOSE_TRADE');
    if (cmd?.type !== 'PROPOSE_TRADE') return;
    const missing = GROUPS.find((x) => x.id === 'retail')!.propertyIds[2];
    expect(cmd.offer.requestPropertyIds).toEqual([missing]);
    expect(cmd.offer.toId).toBe(s.players[0].id);
    expect(cmd.offer.offerCash).toBeGreaterThanOrEqual(PROPERTIES[missing].price * 1.5);
    expect(cmd.offer.offerCash % 1000).toBe(0);
  });
  it('once per turn: the cap blocks a second proposal', () => {
    const s = { ...nearMonopoly(), tradeProposedThisTurn: true };
    expect(pickTradeProposal(s, ai(s), traits, () => 0, 'hard')).toBeNull();
  });
  it('the engine sets the cap when any trade is proposed', () => {
    const s = nearMonopoly();
    const cmd = pickTradeProposal(s, ai(s), traits, () => 0, 'hard')!;
    const r = applyCommand(s, cmd, s.players[1].id, queueRng([]));
    expect(r.tradeProposedThisTurn).toBe(true);
    expect(r.phase).toBe('AWAITING_TRADE_RESPONSE');
  });
  it('skips when the AI cannot afford the offer, or the target has buildings/mortgage', () => {
    const poor = { ...nearMonopoly() };
    poor.players = poor.players.map((p, i) => (i === 1 ? { ...p, cash: 1000 } : p));
    expect(pickTradeProposal(poor, ai(poor), traits, () => 0, 'hard')).toBeNull();
    const missing = GROUPS.find((x) => x.id === 'retail')!.propertyIds[2];
    const built = nearMonopoly();
    built.ownership = { ...built.ownership, [missing]: { ...built.ownership[missing], level: 1 } };
    expect(pickTradeProposal(built, ai(built), traits, () => 0, 'hard')).toBeNull();
    const mort = nearMonopoly();
    mort.ownership = { ...mort.ownership, [missing]: { ...mort.ownership[missing], mortgaged: true, mortgageLapsRemaining: 3 } };
    expect(pickTradeProposal(mort, ai(mort), traits, () => 0, 'hard')).toBeNull();
  });
  it('rng gate: a high roll suppresses the attempt; easy tries less than hard', () => {
    const s = nearMonopoly();
    expect(pickTradeProposal(s, ai(s), traits, () => 0.999, 'hard')).toBeNull();
    const roll = 0.12;
    const hard = pickTradeProposal(s, ai(s), { ...traits, tradeWillingness: 0.5 }, () => roll, 'hard');
    const easy = pickTradeProposal(s, ai(s), { ...traits, tradeWillingness: 0.5 }, () => roll, 'easy');
    expect(hard).not.toBeNull(); // 0.5*0.5=0.25 > 0.12
    expect(easy).toBeNull(); // 0.5*0.15=0.075 < 0.12
  });
});
