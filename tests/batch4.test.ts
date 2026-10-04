import { describe, it, expect } from 'vitest';
import { applyCommand } from '../src/game/engine';
import { createRng } from '../src/game/engine/random';
import { pickTradeProposal, tradeAskPrice } from '../src/game/ai/aiPlayer';
import { PERSONALITIES, pickAiName, AI_FIRST_NAMES } from '../src/game/ai/personalities';
import { localBotName, localizeNamesInText, withLocalBotNames } from '../src/i18n/names';
import { translateLog } from '../src/i18n/logTranslate';
import { PROPERTIES, GROUPS } from '../src/game/data/properties';
import { newTestGame } from './helpers';
import type { GameState } from '../src/game/types';

const rng = () => createRng(5);
const own = (s: GameState, id: string, who: string | null): GameState => ({ ...s, ownership: { ...s.ownership, [id]: { ...s.ownership[id], ownerId: who } } });

describe('a player below zero can still trade', () => {
  it('proposes a property-for-cash deal while cash is negative', () => {
    let s = newTestGame(2);
    s = own(own(s, 'agrobank', 'player-0'), 'uzum', 'player-1');
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, cash: -3_000_000 } : { ...p, cash: 20_000_000 })) };
    const r = applyCommand(s, {
      type: 'PROPOSE_TRADE',
      offer: { fromId: 'player-0', toId: 'player-1', offerCash: 0, offerPropertyIds: ['agrobank'], offerReleasePapers: 0, requestCash: 4_000_000, requestPropertyIds: [], requestReleasePapers: 0 },
    }, 'player-0', rng());
    expect(r.phase).toBe('AWAITING_TRADE_RESPONSE');
    const done = applyCommand(r, { type: 'RESPOND_TRADE', accept: true }, 'player-1', rng());
    expect(done.players[0].cash).toBe(1_000_000);
    expect(done.ownership['agrobank'].ownerId).toBe('player-1');
  });
  it('still rejects paying cash you do not have', () => {
    let s = newTestGame(2);
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, cash: -1 } : p)) };
    const r = applyCommand(s, {
      type: 'PROPOSE_TRADE',
      offer: { fromId: 'player-0', toId: 'player-1', offerCash: 100_000, offerPropertyIds: [], offerReleasePapers: 0, requestCash: 0, requestPropertyIds: [], requestReleasePapers: 0 },
    }, 'player-0', rng());
    expect(r.phase).toBe('AWAITING_ROLL');
  });
});

describe('bots do not sell cheaply', () => {
  it('a lone piece costs at least about 1.5x its price for a rich, calm bot (any mood)', () => {
    let s = newTestGame(2);
    s = own(s, 'agrobank', 'player-1');
    s = { ...s, players: s.players.map((p) => ({ ...p, cash: 30_000_000 })) };
    for (let turn = 1; turn <= 20; turn++) {
      expect(tradeAskPrice({ ...s, turnNumber: turn }, 'player-1', 'player-0', 'agrobank')).toBeGreaterThan(PROPERTIES['agrobank'].price * 1.5);
    }
  });
});

describe('bot proposals: swaps, and never a loss for the receiver', () => {
  const group = GROUPS.find((g) => g.propertyIds.length === 3)!;
  const [a, b, c] = group.propertyIds;
  function setup() {
    let s = newTestGame(2);
    s = own(own(own(s, a, 'player-1'), b, 'player-1'), c, 'player-0'); // bot holds 2 of 3
    const loneIds = Object.keys(PROPERTIES).filter((id) => !group.propertyIds.includes(id));
    // give the bot two lone spare pieces from different groups
    const seen = new Set<string>();
    const spares: string[] = [];
    for (const id of loneIds) {
      const gid = GROUPS.find((g) => g.propertyIds.includes(id))!.id;
      if (!seen.has(gid) && spares.length < 2) { seen.add(gid); spares.push(id); s = own(s, id, 'player-1'); }
    }
    return { s: { ...s, currentPlayerIndex: 1, tradeProposedThisTurn: false, players: s.players.map((p) => ({ ...p, cash: 40_000_000 })) } as GameState, spares };
  }
  it('every offer is worth at least the requested piece to the human, and some offers are multi-piece swaps', () => {
    const { s } = setup();
    let multi = 0, total = 0;
    for (let seed = 1; seed <= 60; seed++) {
      let i = 0;
      const r = () => { i++; return ((seed * 9301 + i * 49297) % 233280) / 233280; };
      const cmd = pickTradeProposal(s, s.players[1], PERSONALITIES.aggressive, r, 'hard');
      if (!cmd || cmd.type !== 'PROPOSE_TRADE') continue;
      total++;
      const o = cmd.offer;
      const offered = o.offerCash + o.offerPropertyIds.reduce((x, id) => x + PROPERTIES[id].price, 0);
      const wanted = o.requestPropertyIds.reduce((x, id) => x + PROPERTIES[id].price, 0);
      expect(offered).toBeGreaterThanOrEqual(wanted);
      expect(o.offerCash).toBeGreaterThanOrEqual(0);
      if (o.offerPropertyIds.length >= 1) multi++;
    }
    expect(total).toBeGreaterThan(10);
    expect(multi).toBeGreaterThan(0);
  });
});

describe('bot names', () => {
  it('has 30 distinct Uzbek names and picks randomly among the free ones', () => {
    expect(new Set(AI_FIRST_NAMES).size).toBe(30);
    expect(pickAiName(0, [], () => 0)).toBe(AI_FIRST_NAMES[0]);
    expect(pickAiName(0, [AI_FIRST_NAMES[0]], () => 0)).toBe(AI_FIRST_NAMES[1]);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add(pickAiName(0, [], Math.random));
    expect(seen.size).toBeGreaterThan(5);
  });
  it('shows Botir as Ботир in Russian and Uzbek Cyrillic, unchanged in Latin languages', () => {
    expect(localBotName('Botir', 'ru')).toBe('Ботир');
    expect(localBotName('Botir', 'uz-cyrl')).toBe('Ботир');
    expect(localBotName('Botir', 'en')).toBe('Botir');
    expect(localBotName('Botir', 'uz')).toBe('Botir');
    expect(localBotName('Me Myself', 'ru')).toBe('Me Myself'); // human names untouched
    for (const n of AI_FIRST_NAMES) expect(localBotName(n, 'ru')).toMatch(/^[\u0400-\u04FF]+$/);
  });
  it('localizes names in state and log lines, ids untouched', () => {
    const s = newTestGame(2);
    const bot = { ...s, players: s.players.map((p, i) => (i === 1 ? { ...p, isAI: true, name: 'Dilnoza' } : p)) };
    const view = withLocalBotNames(bot, 'ru');
    expect(view.players[1].name).toBe('Дилноза');
    expect(view.players[1].id).toBe(bot.players[1].id);
    expect(localizeNamesInText('Dilnoza rolled 3-4.', 'ru')).toBe('Дилноза rolled 3-4.');
    expect(translateLog('Dilnoza rolled 3-4.', 'ru')).toContain('Дилноза');
    expect(translateLog("Sherzod paid 300 000 so'm rent to Dilnoza.", 'uz-cyrl')).toMatch(/Шерзод.*Дилноза|Дилноза.*Шерзод/);
  });
});

describe('Senior Official gamble only on the turn you land there', () => {
  const idx = 20;
  const base = () => {
    const s = newTestGame(2);
    return { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, position: idx } : p)) } as GameState;
  };
  it('is refused at the start of a turn spent standing on the cell', () => {
    const s = { ...base(), hasRolledThisTurn: false };
    const r = applyCommand(s, { type: 'ATTEMPT_BRIBE' }, 'player-0', rng());
    expect(r.bribeGambleUsedThisTurn).toBe(false);
    expect(r).toBe(s);
  });
  it('works after a move this turn, once', () => {
    const s = { ...base(), hasRolledThisTurn: true };
    const r = applyCommand(s, { type: 'ATTEMPT_BRIBE' }, 'player-0', rng());
    expect(r.bribeGambleUsedThisTurn).toBe(true);
    expect(applyCommand(r, { type: 'ATTEMPT_BRIBE' }, 'player-0', rng())).toBe(r);
  });
});

describe('a refused offer remembers who refused and what was offered', () => {
  it('stores toId and the offer, so the reopened window names the right person', () => {
    let s = newTestGame(3);
    s = own(own(s, 'agrobank', 'player-2'), 'uzum', 'player-0');
    const offer = { fromId: 'player-0', toId: 'player-2', offerCash: 500_000, offerPropertyIds: ['uzum'], offerReleasePapers: 0, requestCash: 0, requestPropertyIds: ['agrobank'], requestReleasePapers: 0 };
    s = applyCommand(s, { type: 'PROPOSE_TRADE', offer }, 'player-0', rng());
    s = applyCommand(s, { type: 'RESPOND_TRADE', accept: false }, 'player-2', rng());
    expect(s.lastTradeResult).toMatchObject({ accepted: false, fromId: 'player-0', toId: 'player-2' });
    expect(s.lastTradeResult?.ratio).toBeUndefined(); // a person refused, not a bot's maths
    expect(s.lastTradeResult?.offer).toMatchObject({ offerCash: 500_000, offerPropertyIds: ['uzum'], requestPropertyIds: ['agrobank'] });
  });
});
