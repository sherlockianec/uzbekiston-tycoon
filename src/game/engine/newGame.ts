import type { GameState, NewGameConfig, OwnershipState, Player, TokenShape } from '../types';
import { PROPERTIES, INFRASTRUCTURE, UTILITIES } from '../data/properties';
import { MAHALLA_CARDS, BUSINESS_CARDS } from '../data/cards';
import { STARTING_CASH } from '../data/economy';
import { createRng, shuffle } from './random';

// v2: mortgage deadlines, loan/immunity/discount state, bankruptcy order, per-turn
// flags, no-auction flow. v1 saves have an incompatible shape and are rejected.
export const SAVE_VERSION = 3;

const TOKEN_COLORS = ['#2FB8AF', '#D4AF52', '#D4536B', '#5BB8E0'];
const TOKEN_SHAPES: TokenShape[] = ['car', 'tower', 'bank', 'briefcase', 'train', 'building', 'plane', 'phone'];

export function freshOwnershipMap(): Record<string, OwnershipState> {
  const map: Record<string, OwnershipState> = {};
  for (const id of Object.keys(PROPERTIES)) map[id] = { ownerId: null, level: 0, mortgaged: false, mortgageLapsRemaining: null };
  for (const id of Object.keys(INFRASTRUCTURE)) map[id] = { ownerId: null, level: 0, mortgaged: false, mortgageLapsRemaining: null };
  for (const id of Object.keys(UTILITIES)) map[id] = { ownerId: null, level: 0, mortgaged: false, mortgageLapsRemaining: null };
  return map;
}

export function createNewGame(config: NewGameConfig, seed: number = Date.now()): GameState {
  const rng = createRng(seed);

  const players: Player[] = config.players.map((p, i) => ({
    id: `player-${i}`,
    name: p.name,
    isAI: p.isAI,
    personality: p.personality,
    difficulty: p.difficulty,
    tokenColor: TOKEN_COLORS[i % TOKEN_COLORS.length],
    tokenShape: TOKEN_SHAPES[i % TOKEN_SHAPES.length],
    cash: STARTING_CASH,
    position: 0,
    inDetention: false,
    detentionTurns: 0,
    releasePapers: 0,
    loan: null,
    taxImmunity: false,
    purchaseDiscountPercent: null,
    bankrupt: false,
    bankruptOrder: null,
  }));

  const mahallaDeck = shuffle(MAHALLA_CARDS.map((c) => c.id), rng);
  const businessDeck = shuffle(BUSINESS_CARDS.map((c) => c.id), rng);

  return {
    saveVersion: SAVE_VERSION,
    createdAt: Date.now(),
    rngSeed: seed,
    players,
    currentPlayerIndex: 0,
    ownership: freshOwnershipMap(),
    phase: 'AWAITING_ROLL',
    dice: null,
    doublesStreak: 0,
    hasRolledThisTurn: false,
    currentSpaceId: null,
    pendingRentMultiplier: 1,
    drawnCard: null,
    drawnCardDeck: null,
    cardCausedMove: false,
    mahallaDeck,
    mahallaDiscard: [],
    businessDeck,
    businessDiscard: [],
    trade: null,
    pendingDebt: null,
    log: [{ id: 'log-0', turn: 0, text: `New game started with ${players.length} players.` }],
    turnNumber: 1,
    networkTravelUsed: false,
    bribeGambleUsedThisTurn: false,
    tradeProposedThisTurn: false,
    bribeResult: null,
    notices: [],
    winnerId: null,
    settings: config.settings,
    lastMove: null,
    tradeReturnPhase: null,
  };
}
