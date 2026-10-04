import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/game/types';
import type { Rng } from '../src/game/engine/random';
import {
  applyCommand,
  buyProperty,
  canDevelop,
  computeRent,
  createNewGame,
  createRng,
  developProperty,
  liquidValue,
  mortgageProperty,
  ownableDef,
  unmortgageProperty,
} from '../src/game/engine';
import { PROPERTIES, INFRASTRUCTURE, UTILITIES } from '../src/game/data/properties';
import { spaceById } from '../src/game/data/board';
import { DETENTION_FINE_SCHEDULE, GO_SALARY, STARTING_CASH } from '../src/game/data/economy';
import { formatSom } from '../src/utils/currency';
import { parseSave } from '../src/game/persistence';
import { SAVE_VERSION } from '../src/game/engine';

function scriptedRng(queue: number[]): Rng {
  let i = 0;
  return {
    next: () => Math.random(),
    int: (min: number) => (i < queue.length ? queue[i++] : min),
  };
}

function baseGame(playerCount = 2): GameState {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    name: `P${i}`,
    isAI: i !== 0,
    personality: 'conservative' as const,
    difficulty: 'normal' as const,
  }));
  return createNewGame(
    { players, settings: { sound: false, animations: false, aiSpeedMs: 100, language: 'en' } },
    12345
  );
}

describe('currency formatting', () => {
  it('groups digits with spaces and appends so\'m', () => {
    expect(formatSom(2500000)).toBe("2 500 000 so'm");
    expect(formatSom(0)).toBe("0 so'm");
    expect(formatSom(-400000)).toBe("\u2212400 000 so'm");
  });
});

describe('seeded RNG', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [a.int(1, 6), a.int(1, 6), a.int(1, 6)];
    const seqB = [b.int(1, 6), b.int(1, 6), b.int(1, 6)];
    expect(seqA).toEqual(seqB);
  });

  it('stays within the requested bounds', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const v = rng.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
});

describe('new game setup', () => {
  it('gives every player the starting cash and position 0', () => {
    const state = baseGame(3);
    expect(state.players).toHaveLength(3);
    for (const p of state.players) {
      expect(p.cash).toBe(STARTING_CASH);
      expect(p.position).toBe(0);
      expect(p.bankrupt).toBe(false);
    }
  });

  it('leaves every property, infrastructure and utility unowned', () => {
    const state = baseGame();
    const allIds = [...Object.keys(PROPERTIES), ...Object.keys(INFRASTRUCTURE), ...Object.keys(UTILITIES)];
    for (const id of allIds) {
      expect(state.ownership[id]).toEqual({ ownerId: null, level: 0, mortgaged: false, mortgageLapsRemaining: null });
    }
  });
});

describe('movement and dice', () => {
  it('moves the player forward by the dice sum without granting salary mid-board', () => {
    let state = baseGame();
    const humanId = state.players[0].id;
    state = applyCommand(state, { type: 'ROLL_DICE' }, humanId, scriptedRng([2, 4]));
    expect(state.players[0].position).toBe(6); // korzinka
    expect(state.players[0].cash).toBe(STARTING_CASH - 0); // no purchase yet, no salary
    expect(state.dice).toEqual([2, 4]);
  });

  it('grants salary when passing or landing on START', () => {
    let state = baseGame();
    const humanId = state.players[0].id;
    state = { ...state, players: state.players.map((p) => (p.id === humanId ? { ...p, position: 38 } : p)) };
    state = applyCommand(state, { type: 'ROLL_DICE' }, humanId, scriptedRng([2, 3])); // 38 + 5 = 43 -> wraps to 3
    const human = state.players.find((p) => p.id === humanId)!;
    expect(human.position).toBe(3);
    expect(human.cash).toBe(STARTING_CASH + GO_SALARY);
  });

  it('rejects a command from a player who is not acting', () => {
    const state = baseGame();
    const notCurrent = state.players[1].id;
    const next = applyCommand(state, { type: 'ROLL_DICE' }, notCurrent, scriptedRng([3, 3]));
    expect(next).toBe(state); // no-op: same reference
  });
});

describe('buying and rent', () => {
  it('buying a property deducts cash and sets ownership', () => {
    let state = baseGame();
    const buyerId = state.players[0].id;
    state = buyProperty(state, buyerId, 'korzinka');
    expect(state.ownership['korzinka'].ownerId).toBe(buyerId);
    expect(state.players[0].cash).toBe(STARTING_CASH - PROPERTIES['korzinka'].price);
  });

  it('charges base rent for a single unimproved property', () => {
    let state = baseGame();
    const ownerId = state.players[0].id;
    state = buyProperty(state, ownerId, 'korzinka');
    const rent = computeRent(state, 'korzinka', 7);
    expect(rent).toBe(PROPERTIES['korzinka'].rentTable[0]);
  });

  it('doubles rent once the owner has the full color group', () => {
    let state = baseGame();
    const ownerId = state.players[0].id;
    state = buyProperty(state, ownerId, 'korzinka');
    state = buyProperty(state, ownerId, 'havas');
    state = buyProperty(state, ownerId, 'makro');
    const rent = computeRent(state, 'korzinka', 7);
    expect(rent).toBe(PROPERTIES['korzinka'].rentTable[1]);
  });

  it('charges no rent on a mortgaged property', () => {
    let state = baseGame();
    const ownerId = state.players[0].id;
    state = buyProperty(state, ownerId, 'korzinka');
    state = mortgageProperty(state, ownerId, 'korzinka');
    expect(computeRent(state, 'korzinka', 7)).toBe(0);
  });

  it('scales infrastructure rent with how many are owned', () => {
    let state = baseGame();
    const ownerId = state.players[0].id;
    state = buyProperty(state, ownerId, 'uzbekistan-railways');
    expect(computeRent(state, 'uzbekistan-railways', 0)).toBe(INFRASTRUCTURE['uzbekistan-railways'].rentTable[0]);
    state = buyProperty(state, ownerId, 'uzbekistan-airways');
    state = buyProperty(state, ownerId, 'qanot-sharq');
    state = buyProperty(state, ownerId, 'tashkent-metro');
    expect(computeRent(state, 'uzbekistan-railways', 0)).toBe(INFRASTRUCTURE['uzbekistan-railways'].rentTable[3]);
  });

  it('scales utility rent with the dice roll and how many utilities are owned', () => {
    let state = baseGame();
    const ownerId = state.players[0].id;
    state = buyProperty(state, ownerId, 'uzbekneftegaz');
    const oneOwned = computeRent(state, 'uzbekneftegaz', 7);
    expect(oneOwned).toBe(7 * UTILITIES['uzbekneftegaz'].diceMultiplier.one * UTILITIES['uzbekneftegaz'].unitValue);
    state = buyProperty(state, ownerId, 'uzbekenergo');
    const bothOwned = computeRent(state, 'uzbekneftegaz', 7);
    expect(bothOwned).toBe(7 * UTILITIES['uzbekneftegaz'].diceMultiplier.both * UTILITIES['uzbekneftegaz'].unitValue);
  });

  it('an unaffordable rent payment goes through in full and leaves a negative balance', () => {
    let state = baseGame();
    const ownerId = state.players[0].id;
    const payerId = state.players[1].id;
    state = buyProperty(state, ownerId, 'korzinka');
    state = buyProperty(state, ownerId, 'havas');
    state = buyProperty(state, ownerId, 'makro'); // full set, doubled rent
    // Drain the payer down to almost nothing.
    state = { ...state, players: state.players.map((p) => (p.id === payerId ? { ...p, cash: 100 } : p)) };
    state = {
      ...state,
      currentPlayerIndex: state.players.findIndex((p) => p.id === payerId),
      players: state.players.map((p) => (p.id === payerId ? { ...p, position: spaceById('korzinka').index } : p)),
    };
    // Simulate landing resolution directly by re-rolling with a fixed sum via ROLL_DICE
    // from one space back, so movement lands exactly on korzinka.
    state = { ...state, players: state.players.map((p) => (p.id === payerId ? { ...p, position: 4 } : p)) };
    const ownerBefore = state.players.find((p) => p.id === ownerId)!.cash;
    state = applyCommand(state, { type: 'ROLL_DICE' }, payerId, scriptedRng([1, 1]));
    expect(state.phase).toBe('AWAITING_ROLL');
    expect(state.players.find((p) => p.id === payerId)!.cash).toBeLessThan(0);
    expect(state.players.find((p) => p.id === ownerId)!.cash).toBeGreaterThan(ownerBefore);
  });
});

describe('development (even-building rule)', () => {
  it('requires the full group before developing', () => {
    let state = baseGame();
    const ownerId = state.players[0].id;
    state = buyProperty(state, ownerId, 'chorsu-bazaar');
    expect(canDevelop(state, ownerId, 'chorsu-bazaar')).toBe(false);
    state = buyProperty(state, ownerId, 'qumtepa-bazaar');
    expect(canDevelop(state, ownerId, 'chorsu-bazaar')).toBe(true);
  });

  it('blocks developing a property further ahead of its group siblings', () => {
    let state = baseGame();
    const ownerId = state.players[0].id;
    state = buyProperty(state, ownerId, 'chorsu-bazaar');
    state = buyProperty(state, ownerId, 'qumtepa-bazaar');
    state = developProperty(state, ownerId, 'chorsu-bazaar');
    expect(state.ownership['chorsu-bazaar'].level).toBe(1);
    expect(canDevelop(state, ownerId, 'chorsu-bazaar')).toBe(false); // must wait for qumtepa
    expect(canDevelop(state, ownerId, 'qumtepa-bazaar')).toBe(true);
    expect(state.players[0].cash).toBe(
      STARTING_CASH - PROPERTIES['chorsu-bazaar'].price - PROPERTIES['qumtepa-bazaar'].price - PROPERTIES['chorsu-bazaar'].developmentCost
    );
  });
});

describe('mortgaging', () => {
  it('pays out the mortgage value and later charges the mortgage cost plus interest', () => {
    let state = baseGame();
    const ownerId = state.players[0].id;
    state = buyProperty(state, ownerId, 'korzinka');
    const afterBuy = state.players[0].cash;
    state = mortgageProperty(state, ownerId, 'korzinka');
    expect(state.ownership['korzinka'].mortgaged).toBe(true);
    expect(state.players[0].cash).toBe(afterBuy + PROPERTIES['korzinka'].mortgageValue);
    state = unmortgageProperty(state, ownerId, 'korzinka');
    expect(state.ownership['korzinka'].mortgaged).toBe(false);
    expect(state.players[0].cash).toBe(afterBuy + PROPERTIES['korzinka'].mortgageValue - PROPERTIES['korzinka'].unmortgageCost);
  });
});

describe('taxes', () => {
  it('charges 12% of cash on hand at the income tax space', () => {
    let state = baseGame();
    const humanId = state.players[0].id;
    state = { ...state, players: state.players.map((p) => (p.id === humanId ? { ...p, position: 1 } : p)) };
    state = applyCommand(state, { type: 'ROLL_DICE' }, humanId, scriptedRng([2, 1])); // 1 + 3 = 4 -> income-tax
    const expectedTax = Math.round(((STARTING_CASH * 12) / 100 / 1000)) * 1000;
    expect(state.players[0].cash).toBe(STARTING_CASH - expectedTax);
  });
});

describe('cards', () => {
  it('applies a simple collect-cash card and returns to AWAITING_ROLL on ack (no re-draw)', () => {
    let state = baseGame();
    const humanId = state.players[0].id;
    // Force "birthday-gift" (collect 200,000, no movement) to the top of the deck.
    state = { ...state, mahallaDeck: ['birthday-gift', ...state.mahallaDeck.filter((id) => id !== 'birthday-gift')] };
    state = { ...state, players: state.players.map((p) => (p.id === humanId ? { ...p, position: 0 } : p)) };
    state = applyCommand(state, { type: 'ROLL_DICE' }, humanId, scriptedRng([1, 1])); // 0+2 -> mahalla-card-1
    expect(state.phase).toBe('AWAITING_CARD_ACK');
    expect(state.drawnCard?.id).toBe('birthday-gift');
    expect(state.players[0].cash).toBe(STARTING_CASH); // effect not applied yet — card is shown first
    const deckSizeBefore = state.mahallaDeck.length;
    state = applyCommand(state, { type: 'ACK_CARD' }, humanId, scriptedRng([]));
    expect(state.phase).toBe('AWAITING_ROLL');
    expect(state.drawnCard).toBeNull();
    expect(state.players[0].cash).toBe(STARTING_CASH + 200_000); // applied on acknowledgement
    // Acknowledging must not draw a second card.
    expect(state.mahallaDeck.length).toBe(deckSizeBefore);
  });

  it('a movement card resolves the destination space after being acknowledged', () => {
    let state = baseGame();
    const humanId = state.players[0].id;
    state = { ...state, mahallaDeck: ['countryside-trip', ...state.mahallaDeck.filter((id) => id !== 'countryside-trip')] };
    state = { ...state, players: state.players.map((p) => (p.id === humanId ? { ...p, position: 0 } : p)) };
    state = applyCommand(state, { type: 'ROLL_DICE' }, humanId, scriptedRng([1, 1])); // lands on mahalla-card-1
    expect(state.phase).toBe('AWAITING_CARD_ACK');
    state = applyCommand(state, { type: 'ACK_CARD' }, humanId, scriptedRng([]));
    // countryside-trip moves the player to chorsu-bazaar, which is unowned.
    expect(state.players[0].position).toBe(spaceById('chorsu-bazaar').index);
    expect(state.phase).toBe('AWAITING_PURCHASE_DECISION');
    expect(state.currentSpaceId).toBe('chorsu-bazaar');
  });
});

describe('detention (jail)', () => {
  it('sends a player to detention after three consecutive doubles', () => {
    let state = baseGame();
    const humanId = state.players[0].id;
    state = { ...state, doublesStreak: 2 };
    state = applyCommand(state, { type: 'ROLL_DICE' }, humanId, scriptedRng([4, 4]));
    const human = state.players.find((p) => p.id === humanId)!;
    expect(human.inDetention).toBe(true);
    expect(human.position).toBe(spaceById('detention').index);
    expect(state.doublesStreak).toBe(0);
  });

  it('releases a jailed player who rolls doubles and moves them that roll', () => {
    let state = baseGame();
    const humanId = state.players[0].id;
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === humanId ? { ...p, inDetention: true, position: spaceById('detention').index } : p
      ),
    };
    state = applyCommand(state, { type: 'ROLL_DICE' }, humanId, scriptedRng([5, 5]));
    const human = state.players.find((p) => p.id === humanId)!;
    expect(human.inDetention).toBe(false);
    expect(human.position).toBe((spaceById('detention').index + 10) % 40);
  });

  it('force-releases after three failed attempts and charges the fine', () => {
    let state = baseGame();
    const humanId = state.players[0].id;
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === humanId ? { ...p, inDetention: true, detentionTurns: 2, position: spaceById('detention').index } : p
      ),
    };
    const cashBefore = state.players[0].cash;
    state = applyCommand(state, { type: 'ROLL_DICE' }, humanId, scriptedRng([1, 2])); // 10 + 3 = 13 (ucell, a plain property)
    const human = state.players.find((p) => p.id === humanId)!;
    expect(human.inDetention).toBe(false);
    expect(human.cash).toBe(cashBefore - DETENTION_FINE_SCHEDULE[DETENTION_FINE_SCHEDULE.length - 1]);
  });

  it('paying the fine up front releases without needing to roll first', () => {
    let state = baseGame();
    const humanId = state.players[0].id;
    state = {
      ...state,
      players: state.players.map((p) => (p.id === humanId ? { ...p, inDetention: true } : p)),
    };
    state = applyCommand(state, { type: 'PAY_DETENTION_FINE' }, humanId, scriptedRng([]));
    const human = state.players.find((p) => p.id === humanId)!;
    expect(human.inDetention).toBe(false);
    expect(human.cash).toBe(STARTING_CASH - DETENTION_FINE_SCHEDULE[0]);
    expect(state.hasRolledThisTurn).toBe(false); // still needs to roll to actually move
  });
});

describe('bankruptcy', () => {
  it('ends the game with one player left (2-player game); assets go back to the bank', () => {
    let state = baseGame(2);
    const debtorId = state.players[1].id;
    const creditorId = state.players[0].id;
    state = buyProperty(state, debtorId, 'chorsu-bazaar');
    state = {
      ...state,
      currentPlayerIndex: 1,
      players: state.players.map((p) => (p.id === debtorId ? { ...p, cash: -5_000_000 } : p)),
    };
    state = applyCommand(state, { type: 'DECLARE_BANKRUPTCY' }, debtorId, scriptedRng([]));
    expect(state.players.find((p) => p.id === debtorId)?.bankrupt).toBe(true);
    expect(state.ownership['chorsu-bazaar'].ownerId).toBeNull();
    expect(state.phase).toBe('GAME_OVER');
    expect(state.winnerId).toBe(creditorId);
  });

  it('returns properties to the bank, open to buy again', () => {
    let state = baseGame(3);
    const debtorId = state.players[1].id;
    state = buyProperty(state, debtorId, 'chorsu-bazaar');
    state = {
      ...state,
      currentPlayerIndex: 1,
      players: state.players.map((p) => (p.id === debtorId ? { ...p, cash: -5_000_000 } : p)),
    };
    state = applyCommand(state, { type: 'DECLARE_BANKRUPTCY' }, debtorId, scriptedRng([]));
    expect(state.ownership['chorsu-bazaar']).toEqual({ ownerId: null, level: 0, mortgaged: false, mortgageLapsRemaining: null });
    expect(state.phase).not.toBe('GAME_OVER'); // one AI player still remains besides the winner-designate
  });
});

describe('no auctions: declining a purchase leaves the property for whoever lands there next', () => {
  it('declining keeps the property unowned and the game moves on', () => {
    let state = baseGame(2);
    const [p0] = state.players.map((p) => p.id);
    state = { ...state, phase: 'AWAITING_PURCHASE_DECISION', currentSpaceId: 'korzinka' };
    state = applyCommand(state, { type: 'DECLINE_PURCHASE' }, p0, scriptedRng([]));
    expect(state.ownership['korzinka'].ownerId).toBeNull();
    expect(state.phase).toBe('AWAITING_ROLL');
    expect(state.log[state.log.length - 1].text).not.toMatch(/auction/i);
  });

  it('the other player can still buy it when they land there later', () => {
    let state = baseGame(2);
    const [p0, p1] = state.players.map((p) => p.id);
    state = { ...state, phase: 'AWAITING_PURCHASE_DECISION', currentSpaceId: 'korzinka' };
    state = applyCommand(state, { type: 'DECLINE_PURCHASE' }, p0, scriptedRng([]));
    state = { ...state, currentPlayerIndex: 1, phase: 'AWAITING_PURCHASE_DECISION', currentSpaceId: 'korzinka' };
    state = applyCommand(state, { type: 'BUY_PROPERTY' }, p1, scriptedRng([]));
    expect(state.ownership['korzinka'].ownerId).toBe(p1);
  });

  it('the engine no longer has an auction phase, state or commands', () => {
    const state = baseGame(2) as unknown as Record<string, unknown>;
    expect('auction' in state).toBe(false);
    const bid = applyCommand(baseGame(2), { type: 'PLACE_BID', amount: 1 } as never, baseGame(2).players[0].id, scriptedRng([]));
    expect(bid.phase).toBe('AWAITING_ROLL'); // unknown command is a harmless no-op
  });
});

describe('trading', () => {
  it('exchanges cash and properties on acceptance', () => {
    let state = baseGame(2);
    const [p0, p1] = state.players.map((p) => p.id);
    state = buyProperty(state, p0, 'korzinka');
    state = applyCommand(
      state,
      {
        type: 'PROPOSE_TRADE',
        offer: {
          fromId: p0,
          toId: p1,
          offerCash: 0,
          offerPropertyIds: ['korzinka'],
          offerReleasePapers: 0,
          requestCash: 500_000,
          requestPropertyIds: [],
          requestReleasePapers: 0,
        },
      },
      p0,
      scriptedRng([])
    );
    expect(state.phase).toBe('AWAITING_TRADE_RESPONSE');
    state = applyCommand(state, { type: 'RESPOND_TRADE', accept: true }, p1, scriptedRng([]));
    expect(state.ownership['korzinka'].ownerId).toBe(p1);
    expect(state.players.find((p) => p.id === p0)?.cash).toBe(STARTING_CASH - PROPERTIES['korzinka'].price + 500_000);
    expect(state.players.find((p) => p.id === p1)?.cash).toBe(STARTING_CASH - 500_000);
  });

  it('leaves everything unchanged on rejection', () => {
    let state = baseGame(2);
    const [p0, p1] = state.players.map((p) => p.id);
    state = buyProperty(state, p0, 'korzinka');
    const cashBefore = state.players.map((p) => p.cash);
    state = applyCommand(
      state,
      {
        type: 'PROPOSE_TRADE',
        offer: {
          fromId: p0,
          toId: p1,
          offerCash: 0,
          offerPropertyIds: ['korzinka'],
          offerReleasePapers: 0,
          requestCash: 500_000,
          requestPropertyIds: [],
          requestReleasePapers: 0,
        },
      },
      p0,
      scriptedRng([])
    );
    state = applyCommand(state, { type: 'RESPOND_TRADE', accept: false }, p1, scriptedRng([]));
    expect(state.ownership['korzinka'].ownerId).toBe(p0);
    expect(state.players.map((p) => p.cash)).toEqual(cashBefore);
  });
});

describe('save/load round-trip', () => {
  it('is fully JSON-serializable and reconstructs identically', () => {
    let state = baseGame(3);
    const humanId = state.players[0].id;
    state = applyCommand(state, { type: 'ROLL_DICE' }, humanId, scriptedRng([2, 4]));
    const restored = JSON.parse(JSON.stringify(state));
    expect(restored).toEqual(state);
  });
});

describe('liquidValue', () => {
  it('counts cash plus mortgage value of unmortgaged holdings', () => {
    let state = baseGame();
    const ownerId = state.players[0].id;
    state = buyProperty(state, ownerId, 'korzinka');
    const expected = state.players[0].cash + PROPERTIES['korzinka'].mortgageValue;
    expect(liquidValue(state, ownerId)).toBe(expected);
  });
});

describe('ownableDef', () => {
  it('resolves properties, infrastructure and utilities uniformly', () => {
    expect(ownableDef('korzinka').price).toBe(PROPERTIES['korzinka'].price);
    expect(ownableDef('uzbekistan-railways').price).toBe(INFRASTRUCTURE['uzbekistan-railways'].price);
    expect(ownableDef('uzbekneftegaz').price).toBe(UTILITIES['uzbekneftegaz'].price);
  });
});

describe('save versioning', () => {
  it('round-trips a current-version save', () => {
    const state = baseGame();
    const parsed = parseSave(JSON.stringify(state));
    expect(parsed.status).toBe('ok');
    expect(parsed.state?.saveVersion).toBe(SAVE_VERSION);
    expect(parsed.state?.players).toHaveLength(2);
  });

  it('rejects a v1 save as outdated', () => {
    const old = { ...baseGame(), saveVersion: 1 };
    expect(parseSave(JSON.stringify(old))).toEqual({ status: 'outdated', state: null });
  });

  it('classifies empty and garbage input', () => {
    expect(parseSave(null).status).toBe('none');
    expect(parseSave('{not json').status).toBe('corrupt');
    expect(parseSave('42').status).toBe('corrupt');
    expect(parseSave(JSON.stringify({ saveVersion: SAVE_VERSION })).status).toBe('corrupt');
  });
});
