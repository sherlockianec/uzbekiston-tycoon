import type { Difficulty, GameCommand, GameState, Player } from '../types';
import { PROPERTIES, GROUPS, INFRASTRUCTURE, UTILITIES, isPropertyId, isInfrastructureId, isUtilityId, isOwnableId } from '../data/properties';
import { BOARD } from '../data/board';
import { BRIBE_GAMBLE_LOSS_MAX, DETENTION_FINE_SCHEDULE, MORTGAGE_WARNING_LAPS } from '../data/economy';
import { costToReachNextLevel, getPlayer, ownableDef, refundForCurrentLevel } from '../engine/helpers';
import { canDevelop, canMortgage, canSellDevelopment, canBuy, canUnmortgage } from '../engine/properties';
import { canTakeLoan } from '../engine/bank';
import { MAX_LOAN_AMOUNT, MIN_LOAN_AMOUNT, STARTING_CASH } from '../data/economy';
import { PERSONALITIES, type PersonalityTraits } from './personalities';

function traitsFor(player: Player): PersonalityTraits {
  return PERSONALITIES[player.personality ?? 'conservative'];
}

function rollChaos(rng: () => number, chaos: number, difficulty: Difficulty): boolean {
  const factor = difficulty === 'easy' ? 1.6 : difficulty === 'hard' ? 0.6 : 1;
  return rng() < chaos * factor;
}

/** Who needs to act next, given the current phase. Not always the "current
 * player": mid-trade it's whoever received the offer. */
export function nextActorId(state: GameState): string | null {
  if (state.phase === 'GAME_OVER') return null;
  if (state.phase === 'AWAITING_TRADE_RESPONSE' && state.trade) {
    return state.trade.toId;
  }
  return state.players[state.currentPlayerIndex]?.id ?? null;
}

export function decideAiCommand(
  state: GameState,
  playerId: string,
  rng: () => number = Math.random
): GameCommand | null {
  const player = getPlayer(state, playerId);
  const traits = traitsFor(player);
  const difficulty: Difficulty = player.difficulty ?? 'normal';

  switch (state.phase) {
    case 'AWAITING_ROLL': {
      // Negative balance: raise money (sell, mortgage, loan) or give up.
      if (player.cash < 0) return pickRecoveryStep(state, player);
      if (player.resting) return { type: 'END_TURN' };
      if (!state.hasRolledThisTurn) {
        // Standing on an unowned cell from last turn: may buy it before rolling.
        const here = BOARD[player.position];
        if (!player.inDetention && isOwnableId(here.id) && state.ownership[here.id]?.ownerId === null) {
          if (evaluatePurchase(state, player, traits, here.id, rng, difficulty)) return { type: 'BUY_PROPERTY' };
        }
        if (player.inDetention) {
          if (player.releasePapers > 0) return { type: 'USE_RELEASE_PAPER' };
          const currentFine = DETENTION_FINE_SCHEDULE[Math.min(player.detentionTurns, DETENTION_FINE_SCHEDULE.length - 1)];
          if (player.cash >= currentFine * 1.5) return { type: 'PAY_DETENTION_FINE' };
        }
        return { type: 'ROLL_DICE' };
      }
      // Standing on the Senior Official cell: some personalities may gamble (before moving on).
      const bribeCmd = pickBribe(state, player, traits, rng, difficulty);
      if (bribeCmd) return bribeCmd;
      if (state.doublesStreak > 0 && state.doublesStreak < 3) {
        return { type: 'ROLL_DICE' };
      }
      const urgentRedeem = pickRedemption(state, player, traits, difficulty, true);
      if (urgentRedeem) return urgentRedeem;
      const developCmd = pickDevelopment(state, player, traits, difficulty);
      if (developCmd) return developCmd;
      const redeemCmd = pickRedemption(state, player, traits, difficulty, false);
      if (redeemCmd) return redeemCmd;
      const tradeCmd = pickTradeProposal(state, player, traits, rng, difficulty);
      if (tradeCmd) return tradeCmd;
      return { type: 'END_TURN' };
    }

    case 'AWAITING_PURCHASE_DECISION': {
      if (!state.currentSpaceId) return { type: 'DECLINE_PURCHASE' };
      const willing = evaluatePurchase(state, player, traits, state.currentSpaceId, rng, difficulty);
      return willing ? { type: 'BUY_PROPERTY' } : { type: 'DECLINE_PURCHASE' };
    }

    case 'AWAITING_CARD_ACK':
      return { type: 'ACK_CARD' };

    case 'AWAITING_TRADE_RESPONSE': {
      if (!state.trade) return null;
      const verdict = evaluateTradeDetail(state, player, traits);
      return { type: 'RESPOND_TRADE', accept: verdict.accept, ratio: verdict.ratio };
    }

    default:
      return null;
  }
}

function evaluatePurchase(
  state: GameState,
  player: Player,
  traits: PersonalityTraits,
  spaceId: string,
  rng: () => number,
  difficulty: Difficulty
): boolean {
  if (!canBuy(state, player.id, spaceId)) return false;
  const def = ownableDef(spaceId);
  const afterCash = player.cash - def.price;
  const reserveFloor = traits.cashReserve * (difficulty === 'easy' ? 0.3 : 0.6);

  let willing = afterCash >= reserveFloor && def.price / Math.max(player.cash, 1) <= traits.buyThreshold;

  if (isPropertyId(spaceId)) {
    const group = GROUPS.find((g) => g.id === PROPERTIES[spaceId].groupId)!;
    const ownedInGroup = group.propertyIds.filter((id) => state.ownership[id].ownerId === player.id).length;
    if (ownedInGroup === group.propertyIds.length - 1 && afterCash >= 0) {
      // One away from completing a group — worth stretching for.
      willing = willing || traits.developAggressiveness > 0.5;
    }
  }

  if (!willing && rollChaos(rng, traits.chaos, difficulty) && afterCash >= 0) willing = true;
  if (difficulty === 'easy' && rng() < 0.25 && afterCash >= 0) willing = true;

  return willing;
}

/** All ids that belong to the same "business" (colour group / transport / utility). */
function groupMembers(spaceId: string): string[] {
  if (isPropertyId(spaceId)) return GROUPS.find((g) => g.propertyIds.includes(spaceId))!.propertyIds;
  if (isInfrastructureId(spaceId)) return Object.keys(INFRASTRUCTURE);
  if (isUtilityId(spaceId)) return Object.keys(UTILITIES);
  return [spaceId];
}

/** Stable pseudo-random number in [-1, 1] for a string. The same bot answers the same
 * question the same way within one turn (no fishing by re-asking), but the "mood"
 * changes from turn to turn and from deal to deal. */
function mood(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (((h >>> 0) % 2000) / 1000) - 1;
}

/** 0..0.5: how badly this player needs cash right now (loan, mortgages, low or negative cash). */
function financialPressure(state: GameState, playerId: string): number {
  const p = getPlayer(state, playerId);
  let need = 0;
  if (p.loan) need += 0.15;
  const mortgaged = Object.values(state.ownership).filter((o) => o.ownerId === playerId && o.mortgaged).length;
  need += Math.min(0.2, 0.05 * mortgaged);
  if (p.cash < 2_000_000) need += 0.15;
  if (p.cash < 0) need += 0.2;
  return Math.min(0.5, need);
}

/**
 * What an AI owner demands for handing `spaceId` to `requesterId`. It depends on the
 * piece's own price, how many pieces of that business the requester already holds
 * (the more, the dearer; the piece that COMPLETES a monopoly costs a fortune because
 * the owner knows the rent it will pay afterwards), the owner's own wealth and
 * desperation (a bot with a loan or mortgages sells cheaper), breaking its own
 * complete set, and a stable per-turn "mood" of about +-18%.
 * `alsoGetting` = other pieces of that business handed over in the same deal.
 */
export function tradeAskPrice(state: GameState, ownerId: string, requesterId: string, spaceId: string, alsoGetting = 0): number {
  const def = ownableDef(spaceId);
  const o = state.ownership[spaceId];
  const members = groupMembers(spaceId);
  const held = members.filter((id) => state.ownership[id]?.ownerId === requesterId).length + alsoGetting;
  const completes = held + 1 >= members.length && members.length > 1;
  // Bots do NOT sell cheaply: even a lone piece costs about double, each piece of the same
  // business the requester holds adds a full price, and completing a set costs a fortune.
  let mult = completes ? 6 + 0.5 * held : 2.0 + 1.0 * held;
  // A bot that already holds other pieces of this business values the synergy.
  const ownerHolds = members.filter((id) => id !== spaceId && state.ownership[id]?.ownerId === ownerId).length;
  if (members.length > 1 && ownerHolds > 0) mult *= 1 + 0.25 * ownerHolds;
  if (members.length > 1 && members.every((id) => state.ownership[id]?.ownerId === ownerId)) mult *= 1.5; // breaking their own monopoly
  mult *= Math.max(0.5, 1 - financialPressure(state, ownerId)); // desperate sellers take less
  const owner = getPlayer(state, ownerId);
  mult *= 0.9 + 0.3 * Math.min(1, Math.max(0, owner.cash) / (STARTING_CASH * 3)); // rich sellers do not care for money
  mult *= 1 + 0.18 * mood(`${ownerId}|${requesterId}|${spaceId}|${state.turnNumber}`);
  const base = o?.mortgaged ? def.price * 0.6 : def.price;
  return Math.round((base * mult) / 1000) * 1000;
}

/** What a piece is worth TO the bot when it is offered one. */
function valueToBot(state: GameState, botId: string, spaceId: string, alsoOffered: string[]): number {
  const price = ownableDef(spaceId).price;
  const members = groupMembers(spaceId);
  const held = members.filter((id) => state.ownership[id]?.ownerId === botId).length;
  let v = price * (1 + 0.4 * held);
  const completes = members.length > 1 && members.every((id) => id === spaceId || state.ownership[id]?.ownerId === botId || alsoOffered.includes(id));
  if (completes) v += price * 2.5;
  return v;
}

/** The bot's verdict plus how far the offer was from what it wanted (for the player's hint). */
export function evaluateTradeDetail(state: GameState, player: Player, traits: PersonalityTraits): { accept: boolean; ratio: number } {
  const trade = state.trade!;
  const papersValue = DETENTION_FINE_SCHEDULE[0] * 0.8;

  const offeredValue =
    trade.offerCash +
    trade.offerPropertyIds.reduce((sum, id) => sum + valueToBot(state, player.id, id, trade.offerPropertyIds), 0) +
    trade.offerReleasePapers * papersValue;

  const seenInGroup = new Map<string, number>();
  let requiredValue = trade.requestCash + trade.requestReleasePapers * papersValue;
  for (const id of trade.requestPropertyIds) {
    const key = groupMembers(id).join('|');
    const already = seenInGroup.get(key) ?? 0;
    requiredValue += tradeAskPrice(state, player.id, trade.fromId, id, already);
    seenInGroup.set(key, already + 1);
  }

  const ratio = requiredValue <= 0 ? 99 : offeredValue / requiredValue;
  const afterCash = player.cash - trade.requestCash + trade.offerCash;
  if (afterCash < 0) return { accept: false, ratio };
  const discount = 1 - 0.04 * traits.tradeWillingness;
  return { accept: ratio >= discount, ratio };
}

function pickDevelopment(
  state: GameState,
  player: Player,
  traits: PersonalityTraits,
  difficulty: Difficulty
): GameCommand | null {
  const developable = Object.entries(state.ownership)
    .filter(([id, o]) => o.ownerId === player.id && isPropertyId(id) && o.level >= 0)
    .filter(([id]) => canDevelop(state, player.id, id))
    .map(([id, o]) => ({ id, cost: costToReachNextLevel(PROPERTIES[id], o.level) })) // level-5 premium included
    .sort((a, b) => a.cost - b.cost);

  if (developable.length === 0) return null;

  const eagerEnough =
    traits.developAggressiveness >= (difficulty === 'easy' ? 0.3 : difficulty === 'hard' ? 0.45 : 0.4);
  if (!eagerEnough) return null;

  const pick = developable.find((p) => player.cash - p.cost >= traits.cashReserve);
  if (!pick) return null;
  return { type: 'DEVELOP', spaceId: pick.id };
}

/** Max times a bot repeats an offer for the same piece after being refused. */
const MAX_REFUSED_OFFERS = 3;

/**
 * Looks for a business where this AI already owns most pieces and the rest (one or
 * two) belong to ONE other living player, and offers for them: cash, or - when it
 * has a lone spare piece elsewhere - a swap plus a cash top-up. Each refusal makes
 * the next offer about 20% richer; after MAX_REFUSED_OFFERS refusals the bot stops
 * asking for that piece. Gated by personality/difficulty so it does not fire every turn.
 */
export function pickTradeProposal(
  state: GameState,
  player: Player,
  traits: PersonalityTraits,
  rng: () => number,
  difficulty: Difficulty
): GameCommand | null {
  const attemptChance = traits.tradeWillingness * (difficulty === 'hard' ? 0.5 : difficulty === 'easy' ? 0.15 : 0.3);
  if (state.tradeProposedThisTurn) return null;
  if (rng() > attemptChance) return null;

  for (const group of GROUPS) {
    const mine = group.propertyIds.filter((id) => state.ownership[id].ownerId === player.id);
    const missing = group.propertyIds.filter((id) => state.ownership[id].ownerId !== player.id);
    if (mine.length < 1 || missing.length < 1 || missing.length > 2) continue;
    const ownerIds = new Set(missing.map((id) => state.ownership[id].ownerId));
    if (ownerIds.size !== 1) continue;
    const ownerId = [...ownerIds][0];
    if (!ownerId) continue; // a free piece is bought on the board, not traded
    if (missing.some((id) => state.ownership[id].level > 0 || state.ownership[id].mortgaged)) continue;
    const ownerPlayer = state.players.find((p) => p.id === ownerId);
    if (!ownerPlayer || ownerPlayer.bankrupt) continue;

    const refused = state.tradeRejections?.[`${player.id}>${missing[0]}`] ?? 0;
    if (refused >= MAX_REFUSED_OFFERS) continue;

    const sumPrice = missing.reduce((sum, id) => sum + PROPERTIES[id].price, 0);
    let value: number;
    if (ownerPlayer.isAI) {
      // Bots haggle with bots: open a little under the ask and creep up.
      let ask = 0;
      missing.forEach((id, i) => (ask += tradeAskPrice(state, ownerPlayer.id, player.id, id, i)));
      value = ask * (0.85 + 0.1 * refused);
    } else {
      value = sumPrice * (1.5 + 0.3 * refused);
    }

    // Spare lone pieces (the only one it holds of its business, not in this group) can be swapped in.
    const spares = Object.entries(state.ownership)
      .filter(([id, o]) => o.ownerId === player.id && isPropertyId(id) && o.level === 0 && !o.mortgaged && !group.propertyIds.includes(id))
      .filter(([id]) => groupMembers(id).filter((m) => state.ownership[m].ownerId === player.id).length === 1)
      .map(([id]) => id)
      .sort((a, b) => PROPERTIES[a].price - PROPERTIES[b].price);
    // 1-for-1, 2-for-1, 1-for-2, 2-for-2 ...: try a random number of spares (0..2) that fits in the budget.
    const wanted = Math.floor(rng() * (Math.min(2, spares.length) + 1));
    let swap: string[] = [];
    for (let k = wanted; k >= 1; k--) {
      const pick = spares.slice(0, k);
      if (pick.reduce((sum, id) => sum + PROPERTIES[id].price, 0) <= value) {
        swap = pick;
        break;
      }
    }
    const spareValue = swap.reduce((sum, id) => sum + PROPERTIES[id].price, 0);
    const offerCash = Math.round(Math.max(0, value - spareValue) / 1000) * 1000;
    if (player.cash - offerCash < traits.cashReserve * 0.3) continue;
    // Never make an offer that leaves the other side in the minus at list prices.
    if (offerCash + spareValue < sumPrice) continue;

    return {
      type: 'PROPOSE_TRADE',
      offer: {
        fromId: player.id,
        toId: ownerPlayer.id,
        offerCash,
        offerPropertyIds: swap,
        offerReleasePapers: 0,
        requestCash: 0,
        requestPropertyIds: missing,
        requestReleasePapers: 0,
      },
    };
  }
  return null;
}

/** Cash is below zero: sell levels, mortgage, borrow, and only then give up. */
function pickRecoveryStep(state: GameState, player: Player): GameCommand {
  const sellable = Object.entries(state.ownership)
    .filter(([id, o]) => o.ownerId === player.id && isPropertyId(id) && canSellDevelopment(state, player.id, id))
    .map(([id, o]) => ({ id, refund: refundForCurrentLevel(PROPERTIES[id], o.level) }))
    .sort((a, b) => a.refund - b.refund);
  if (sellable.length > 0) return { type: 'SELL_DEVELOPMENT', spaceId: sellable[0].id };

  const mortgageable = Object.entries(state.ownership)
    .filter(([id]) => canMortgage(state, player.id, id))
    .map(([id]) => ({ id, value: ownableDef(id).mortgageValue }))
    .sort((a, b) => b.value - a.value);
  if (mortgageable.length > 0) return { type: 'MORTGAGE', spaceId: mortgageable[0].id };

  const need = Math.max(MIN_LOAN_AMOUNT, Math.ceil(-player.cash / 100_000) * 100_000);
  if (need <= MAX_LOAN_AMOUNT && canTakeLoan(state, player.id, need)) return { type: 'TAKE_LOAN', amount: need };

  return { type: 'DECLARE_BANKRUPTCY' };
}

/** Redeem a mortgage before the bank forecloses on it. Urgent ones (few laps
 * left) are redeemed even if that eats most of the cash reserve; the rest only
 * when the AI is comfortably flush. Easy AIs only react on the very last lap. */
export function pickRedemption(
  state: GameState,
  player: Player,
  traits: PersonalityTraits,
  difficulty: Difficulty,
  urgentOnly: boolean
): GameCommand | null {
  const urgentLaps = difficulty === 'easy' ? 1 : MORTGAGE_WARNING_LAPS;
  const candidates = Object.entries(state.ownership)
    .filter(([id, o]) => o.ownerId === player.id && o.mortgaged && canUnmortgage(state, player.id, id))
    .map(([id, o]) => ({ id, laps: o.mortgageLapsRemaining ?? 99, cost: ownableDef(id).unmortgageCost }))
    .sort((a, b) => a.laps - b.laps || a.cost - b.cost);

  for (const c of candidates) {
    const urgent = c.laps <= urgentLaps;
    if (urgentOnly) {
      if (urgent && player.cash - c.cost >= traits.cashReserve * 0.25) return { type: 'UNMORTGAGE', spaceId: c.id };
    } else if (difficulty !== 'easy' && player.cash - c.cost >= traits.cashReserve * 2) {
      return { type: 'UNMORTGAGE', spaceId: c.id };
    }
  }
  return null;
}

/** Only reckless personalities gamble, only at the start of a turn, and only when
 * even the worst possible loss would leave them solvent (no forced liquidation). */
export function pickBribe(
  state: GameState,
  player: Player,
  traits: PersonalityTraits,
  rng: () => number,
  difficulty: Difficulty
): GameCommand | null {
  if (traits.chaos < 0.5) return null;
  if (BOARD[player.position]?.kind !== 'corner-bribe') return null;
  if (!state.hasRolledThisTurn || state.bribeGambleUsedThisTurn || player.inDetention || player.loan) return null;
  if (player.cash < BRIBE_GAMBLE_LOSS_MAX + traits.cashReserve) return null;
  const chance = traits.chaos * 0.5 * (difficulty === 'easy' ? 0.5 : 1);
  return rng() < chance ? { type: 'ATTEMPT_BRIBE' } : null;
}
