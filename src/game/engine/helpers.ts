import type { GameNotice, GameState, LogEntry, OwnershipState, Player, PropertyDef } from '../types';
import { PROPERTIES, INFRASTRUCTURE, UTILITIES, isPropertyId, isInfrastructureId, isUtilityId } from '../data/properties';

let logCounter = 0;

export function appendLog(state: GameState, text: string): GameState {
  logCounter += 1;
  const entry: LogEntry = { id: `log-${Date.now()}-${logCounter}`, turn: state.turnNumber, text };
  return { ...state, log: [...state.log, entry] };
}

export function getPlayer(state: GameState, playerId: string): Player {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`Unknown player id: ${playerId}`);
  return player;
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function updatePlayer(state: GameState, playerId: string, fn: (p: Player) => Player): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? fn(p) : p)),
  };
}

export function ownershipOf(state: GameState, spaceId: string): OwnershipState {
  const o = state.ownership[spaceId];
  if (!o) throw new Error(`${spaceId} is not an ownable space`);
  return o;
}

export function updateOwnership(
  state: GameState,
  spaceId: string,
  fn: (o: OwnershipState) => OwnershipState
): GameState {
  return {
    ...state,
    ownership: { ...state.ownership, [spaceId]: fn(ownershipOf(state, spaceId)) },
  };
}

export interface OwnableSummary {
  id: string;
  name: string;
  nameUz: string;
  price: number;
  mortgageValue: number;
  unmortgageCost: number;
}

/** Works across properties, infrastructure and utilities uniformly. */
export function ownableDef(spaceId: string): OwnableSummary {
  if (isPropertyId(spaceId)) return PROPERTIES[spaceId];
  if (isInfrastructureId(spaceId)) return INFRASTRUCTURE[spaceId];
  if (isUtilityId(spaceId)) return UTILITIES[spaceId];
  throw new Error(`${spaceId} is not ownable`);
}

export function playersOwning(state: GameState, playerId: string, spaceIds: string[]): string[] {
  return spaceIds.filter((id) => state.ownership[id]?.ownerId === playerId);
}

export function livingPlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.bankrupt);
}

export function nextLivingPlayerIndex(state: GameState, fromIndex: number): number {
  const n = state.players.length;
  let idx = fromIndex;
  for (let i = 0; i < n; i++) {
    idx = (idx + 1) % n;
    if (!state.players[idx].bankrupt) return idx;
  }
  return fromIndex;
}

/**
 * Charges `amount` from `payerId` to `payeeId` ('BANK' for taxes / card debts
 * owed to no one). The transfer ALWAYS happens in full - a payer short of cash
 * simply goes negative and must raise money (sell, mortgage, loan) before they
 * may roll or end the turn. There is no "debt" object and no asset transfer.
 */
export function chargePlayer(
  state: GameState,
  payerId: string,
  amount: number,
  payeeId: string | 'BANK'
): GameState {
  if (amount <= 0) return state;
  let next = updatePlayer(state, payerId, (p) => ({ ...p, cash: p.cash - amount }));
  if (payeeId !== 'BANK') {
    next = updatePlayer(next, payeeId, (p) => ({ ...p, cash: p.cash + amount }));
  }
  return next;
}

export function advanceTurn(state: GameState): GameState {
  const nextIndex = nextLivingPlayerIndex(state, state.currentPlayerIndex);
  return {
    ...state,
    currentPlayerIndex: nextIndex,
    phase: 'AWAITING_ROLL',
    hasRolledThisTurn: false,
    doublesStreak: 0,
    dice: null,
    currentSpaceId: null,
    networkTravelUsed: false,
    networkTravelEligible: false,
    bribeGambleUsedThisTurn: false,
    tradeProposedThisTurn: false,
    bribeResult: null,
    notices: [],
    turnNumber: state.turnNumber + 1,
  };
}

/** Total worth if everything were liquidated: cash + mortgage value of unmortgaged
 * holdings + half the development cost of any development levels owned. Used to
 * judge affordability and to drive forced liquidation / bankruptcy. */
export function liquidValue(state: GameState, playerId: string): number {
  const player = getPlayer(state, playerId);
  let total = player.cash;
  for (const [spaceId, o] of Object.entries(state.ownership)) {
    if (o.ownerId !== playerId) continue;
    const def = ownableDef(spaceId);
    if (!o.mortgaged) total += def.mortgageValue;
    if (isPropertyId(spaceId) && o.level > 0) {
      total += totalDevelopmentRefund(PROPERTIES[spaceId], o.level);
    }
  }
  if (player.loan) {
    total -= player.loan.dueAmount;
  }
  return total;
}

// --- Development cost helpers (single source for UI, AI and engine) ----------

/** Cost of the NEXT upgrade from `currentLevel`. Levels 1-4 cost the same;
 * the jump from level 4 to the top "Holding" tier costs the level-5 premium. */
export function costToReachNextLevel(def: PropertyDef, currentLevel: number): number {
  return currentLevel === 4 ? def.developmentCostLevel5 : def.developmentCost;
}

/** Refund for selling back the level the property is currently at (50% of what that level cost). */
export function refundForCurrentLevel(def: PropertyDef, currentLevel: number): number {
  const paid = currentLevel === 5 ? def.developmentCostLevel5 : def.developmentCost;
  return Math.round(paid / 2);
}

/** Total cash recovered by selling every level of a property, one by one, top first. */
export function totalDevelopmentRefund(def: PropertyDef, level: number): number {
  let total = 0;
  for (let l = level; l >= 1; l--) total += refundForCurrentLevel(def, l);
  return total;
}

// --- Pure rules used by the UI (kept here so they can be unit-tested) ---------

/** Final standings: the winner first, then everyone else by how long they
 * lasted (last to go bankrupt = 2nd). */
export function rankPlayers(state: GameState): Player[] {
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : undefined;
  const out = state.players
    .filter((p) => p.bankrupt)
    .sort((a, b) => (b.bankruptOrder ?? 0) - (a.bankruptOrder ?? 0));
  return winner ? [winner, ...out.filter((p) => p.id !== winner.id)] : out;
}

/** Declaring bankruptcy needs a second confirmation while the player could
 * still (in theory) raise money: i.e. net worth after liquidation is positive. */
export function shouldWarnBeforeBankruptcy(state: GameState, playerId: string): boolean {
  return liquidValue(state, playerId) > 0;
}

/** "Balance" button in the trade builder: add cash to whichever side is worth
 * less so both sides are equal, capped by what that side's player holds. */
export function balanceTradeCash(input: {
  offerCash: number;
  requestCash: number;
  offerPropsValue: number;
  requestPropsValue: number;
  myCash: number;
  theirCash: number;
}): { offerCash: number; requestCash: number } {
  const offerTotal = input.offerCash + input.offerPropsValue;
  const requestTotal = input.requestCash + input.requestPropsValue;
  const diff = requestTotal - offerTotal;
  if (diff > 0) return { offerCash: Math.min(input.myCash, input.offerCash + diff), requestCash: input.requestCash };
  if (diff < 0) return { offerCash: input.offerCash, requestCash: Math.min(input.theirCash, input.requestCash - diff) };
  return { offerCash: input.offerCash, requestCash: input.requestCash };
}

/** Queue a toast for a human player. AI players never get one (nobody would read it). */
export function addNotice(state: GameState, notice: Omit<GameNotice, 'id'>): GameState {
  if (getPlayer(state, notice.playerId).isAI) return state;
  const id = `n${state.turnNumber}-${state.log.length}-${state.notices.length}`;
  return { ...state, notices: [...state.notices, { ...notice, id }] };
}
