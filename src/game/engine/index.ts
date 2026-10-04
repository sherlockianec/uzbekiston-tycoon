import type { GameCommand, GameState, TradeOffer } from '../types';
import { isPropertyId, isInfrastructureId, isOwnableId } from '../data/properties';
import { BOARD, spaceById } from '../data/board';
import { DETENTION_FINE_SCHEDULE, MAX_DETENTION_TURNS } from '../data/economy';
import { formatSom } from '../../utils/currency';
import type { Rng } from './random';
import { advanceTurn, appendLog, currentPlayer, getPlayer, livingPlayers, updatePlayer } from './helpers';
import { acknowledgeCard, attemptBribe, moveForward, moveToTarget, releaseFromDetention, resolveLanding, rollDice, sendToDetention } from './turn';
import {
  buyProperty,
  canBuy,
  canDevelop,
  canMortgage,
  canSellDevelopment,
  canUnmortgage,
  developProperty,
  mortgageProperty,
  sellDevelopment,
  unmortgageProperty,
} from './properties';
import { cancelTrade, proposeTrade, respondTrade } from './negotiation';
import { declareBankruptcy } from './bankruptcy';
import { canRepayLoanEarly, canTakeLoan, repayLoanEarly, takeLoan } from './bank';

export { createNewGame, SAVE_VERSION } from './newGame';
export { createRng } from './random';
export type { Rng } from './random';
export * from './properties';
export * from './helpers';
export * from './negotiation';
export * from './bankruptcy';
export * from './turn';
export * from './bank';

function noop(state: GameState): GameState {
  return state;
}

/** After a DICE move ends, remember whether the token stands on a transport
 * station - the only situation in which the travel network may be used. */
function markTravelEligibility(state: GameState, playerId: string): GameState {
  const p = getPlayer(state, playerId);
  const onStation = BOARD[p.position].kind === 'infrastructure' && !p.inDetention;
  return { ...state, networkTravelEligible: onStation };
}

function validateTradeOffer(state: GameState, offer: Omit<TradeOffer, 'id'>): boolean {
  if (offer.fromId === offer.toId) return false;
  const fromP = state.players.find((p) => p.id === offer.fromId);
  const toP = state.players.find((p) => p.id === offer.toId);
  if (!fromP || !toP || fromP.bankrupt || toP.bankrupt) return false;
  if (offer.offerCash < 0 || offer.requestCash < 0) return false;
  if (fromP.cash < offer.offerCash || toP.cash < offer.requestCash) return false;
  if (fromP.releasePapers < offer.offerReleasePapers) return false;
  if (toP.releasePapers < offer.requestReleasePapers) return false;
  for (const id of offer.offerPropertyIds) {
    const o = state.ownership[id];
    if (!o || o.ownerId !== offer.fromId) return false;
    if (isPropertyId(id) && o.level > 0) return false;
  }
  for (const id of offer.requestPropertyIds) {
    const o = state.ownership[id];
    if (!o || o.ownerId !== offer.toId) return false;
    if (isPropertyId(id) && o.level > 0) return false;
  }
  return true;
}

/**
 * The single entry point that mutates game state. Every command is validated
 * against the current phase and the acting player before anything happens;
 * an illegal command is a no-op rather than a thrown error, so the UI (and
 * the AI) can attempt things speculatively without risk of crashing a game.
 */
export function applyCommand(
  state: GameState,
  command: GameCommand,
  actingPlayerId: string,
  rng: Rng
): GameState {
  const acting = state.players.find((p) => p.id === actingPlayerId);
  if (!acting || acting.bankrupt) return state;
  const isCurrent = actingPlayerId === currentPlayer(state).id;

  switch (command.type) {
    case 'ROLL_DICE': {
      if (!isCurrent || state.phase !== 'AWAITING_ROLL') return noop(state);
      if (acting.cash < 0 || acting.resting) return noop(state); // clear a negative balance first / resting on the choyxona
      const canRoll = !state.hasRolledThisTurn || (state.doublesStreak > 0 && state.doublesStreak < 3);
      if (!canRoll) return noop(state);
      const [d1, d2] = rollDice(rng);
      const player = acting;
      state = { ...state, networkTravelEligible: false };

      if (player.inDetention) {
        const isDoubles = d1 === d2;
        if (isDoubles) {
          let next = releaseFromDetention(state, player.id);
          next = appendLog(next, `${player.name} rolled doubles (${d1}-${d2}) and left Tax Inspection.`);
          next = { ...next, dice: [d1, d2], hasRolledThisTurn: true };
          next = moveForward(next, player.id, d1 + d2);
          return markTravelEligibility(resolveLanding(next, player.id, rng), player.id);
        }
        const turns = player.detentionTurns + 1;
        if (turns >= MAX_DETENTION_TURNS) {
          const fine = DETENTION_FINE_SCHEDULE[DETENTION_FINE_SCHEDULE.length - 1];
          let next = updatePlayer(state, player.id, (p) => ({
            ...p,
            cash: p.cash - fine,
            inDetention: false,
            detentionTurns: 0,
          }));
          next = appendLog(
            next,
            `${player.name} paid ${formatSom(fine)} and was released after ${MAX_DETENTION_TURNS} turns in Tax Inspection.`
          );
          next = { ...next, dice: [d1, d2], hasRolledThisTurn: true };
          next = moveForward(next, player.id, d1 + d2);
          return markTravelEligibility(resolveLanding(next, player.id, rng), player.id);
        }
        let next = updatePlayer(state, player.id, (p) => ({ ...p, detentionTurns: turns }));
        next = appendLog(next, `${player.name} rolled ${d1}-${d2} — still in Tax Inspection (${turns}/${MAX_DETENTION_TURNS}).`);
        return { ...next, dice: [d1, d2], hasRolledThisTurn: true, phase: 'AWAITING_ROLL' };
      }

      const isDoubles = d1 === d2;
      const newStreak = isDoubles ? state.doublesStreak + 1 : 0;
      if (isDoubles && newStreak >= 3) {
        let next: GameState = { ...state, dice: [d1, d2], hasRolledThisTurn: true, doublesStreak: 0 };
        next = appendLog(next, `${player.name} rolled doubles a third time in a row and was sent to Tax Inspection.`);
        next = sendToDetention(next, player.id);
        return { ...next, phase: 'AWAITING_ROLL' };
      }
      let next: GameState = { ...state, dice: [d1, d2], hasRolledThisTurn: true, doublesStreak: newStreak };
      next = appendLog(next, `${player.name} rolled ${d1}-${d2}${isDoubles ? ' — doubles, roll again after this turn resolves' : ''}.`);
      next = moveForward(next, player.id, d1 + d2);
      return markTravelEligibility(resolveLanding(next, player.id, rng), player.id);
    }

    case 'PAY_DETENTION_FINE': {
      if (!isCurrent || state.phase !== 'AWAITING_ROLL' || state.hasRolledThisTurn) return noop(state);
      if (!acting.inDetention) return noop(state);
      const fine = DETENTION_FINE_SCHEDULE[Math.min(acting.detentionTurns, DETENTION_FINE_SCHEDULE.length - 1)];
      if (acting.cash < fine) return noop(state);
      let next = updatePlayer(state, acting.id, (p) => ({
        ...p,
        cash: p.cash - fine,
        inDetention: false,
        detentionTurns: 0,
      }));
      return appendLog(next, `${acting.name} paid ${formatSom(fine)} and left Tax Inspection.`);
    }

    case 'USE_RELEASE_PAPER': {
      if (!isCurrent || state.phase !== 'AWAITING_ROLL' || state.hasRolledThisTurn) return noop(state);
      if (!acting.inDetention || acting.releasePapers < 1) return noop(state);
      let next = updatePlayer(state, acting.id, (p) => ({
        ...p,
        releasePapers: p.releasePapers - 1,
        inDetention: false,
        detentionTurns: 0,
      }));
      return appendLog(next, `${acting.name} used a Release Paper and left Tax Inspection.`);
    }

    case 'BUY_PROPERTY': {
      if (!isCurrent) return noop(state);
      // Normally the purchase prompt right after landing. But declining (or being
      // unable to afford it) is not final for this turn: while you are still
      // standing on an unowned space you may raise money (loan, sell, trade) and
      // then buy it from the action bar.
      let spaceId: string | null = null;
      if (state.phase === 'AWAITING_PURCHASE_DECISION') spaceId = state.currentSpaceId;
      else if (state.phase === 'AWAITING_ROLL' && !acting.inDetention && !acting.resting) {
        const here = BOARD[acting.position];
        if (isOwnableId(here.id)) spaceId = here.id;
      }
      if (!spaceId || !canBuy(state, acting.id, spaceId)) return noop(state);
      const bought = buyProperty(state, acting.id, spaceId);
      return { ...bought, phase: 'AWAITING_ROLL' };
    }

    case 'DECLINE_PURCHASE': {
      if (!isCurrent || state.phase !== 'AWAITING_PURCHASE_DECISION' || !state.currentSpaceId) return noop(state);
      // No auction: the property simply stays unowned until someone lands on
      // it and chooses to buy it themselves.
      const next = appendLog(state, `${acting.name} declined to buy \u2014 it stays unowned for now.`);
      return { ...next, phase: 'AWAITING_ROLL' };
    }

    case 'ACK_CARD': {
      if (!isCurrent || state.phase !== 'AWAITING_CARD_ACK') return noop(state);
      return acknowledgeCard(state, acting.id, rng);
    }

    case 'END_TURN': {
      if (!isCurrent || state.phase !== 'AWAITING_ROLL') return noop(state);
      if (acting.cash < 0) return noop(state); // must get back to zero or above first
      if (!state.hasRolledThisTurn && !acting.resting) return noop(state);
      let next = appendLog(state, `${acting.name} ended their turn.`);
      if (acting.resting) {
        // The rest is over: the next turn is a normal one.
        next = updatePlayer(next, acting.id, (p) => ({ ...p, resting: false }));
      } else if (BOARD[acting.position].kind === 'corner-rest') {
        // Ended the turn on the choyxona: skip the dice roll next turn.
        next = updatePlayer(next, acting.id, (p) => ({ ...p, resting: true }));
        next = appendLog(next, `${acting.name} sat down at the choyxona and will skip the next roll.`);
      }
      return advanceTurn(next);
    }

    case 'DEVELOP': {
      if (!isCurrent || state.phase !== 'AWAITING_ROLL') return noop(state);
      if (!canDevelop(state, acting.id, command.spaceId)) return noop(state);
      return developProperty(state, acting.id, command.spaceId);
    }

    case 'SELL_DEVELOPMENT': {
      if (!isCurrent || state.phase !== 'AWAITING_ROLL') return noop(state);
      if (!canSellDevelopment(state, acting.id, command.spaceId)) return noop(state);
      return sellDevelopment(state, acting.id, command.spaceId);
    }

    case 'MORTGAGE': {
      if (!isCurrent || state.phase !== 'AWAITING_ROLL') return noop(state);
      if (!canMortgage(state, acting.id, command.spaceId)) return noop(state);
      return mortgageProperty(state, acting.id, command.spaceId);
    }

    case 'UNMORTGAGE': {
      if (!isCurrent || state.phase !== 'AWAITING_ROLL') return noop(state);
      if (!canUnmortgage(state, acting.id, command.spaceId)) return noop(state);
      return unmortgageProperty(state, acting.id, command.spaceId);
    }

    case 'TAKE_LOAN': {
      if (!isCurrent || state.phase !== 'AWAITING_ROLL') return noop(state);
      if (!canTakeLoan(state, acting.id, command.amount)) return noop(state);
      return takeLoan(state, acting.id, command.amount);
    }

    case 'REPAY_LOAN_EARLY': {
      if (!isCurrent || state.phase !== 'AWAITING_ROLL') return noop(state);
      if (!canRepayLoanEarly(state, acting.id)) return noop(state);
      return repayLoanEarly(state, acting.id);
    }

    case 'TRAVEL_NETWORK': {
      // Only right after arriving on a station by your own dice roll, only if that
      // station is owned (bought, or you just paid its rent), once per turn.
      if (!isCurrent || state.phase !== 'AWAITING_ROLL' || state.networkTravelUsed) return noop(state);
      if (!state.networkTravelEligible || acting.cash < 0) return noop(state);
      const here = BOARD[acting.position];
      if (here.kind !== 'infrastructure') return noop(state);
      if (!state.ownership[here.id]?.ownerId) return noop(state);
      if (!isInfrastructureId(command.targetSpaceId) || command.targetSpaceId === here.id) return noop(state);
      const target = spaceById(command.targetSpaceId);
      // Always forward around the board, collecting the salary when crossing START.
      let next = moveToTarget(state, acting.id, target.index, true, 'travel');
      next = { ...next, networkTravelUsed: true, networkTravelEligible: false };
      return resolveLanding(next, acting.id, rng);
    }

    case 'ATTEMPT_BRIBE': {
      if (!isCurrent || state.phase !== 'AWAITING_ROLL' || state.bribeGambleUsedThisTurn) return noop(state);
      // Only possible while standing on the Senior Official cell.
      if (BOARD[acting.position].kind !== 'corner-bribe') return noop(state);
      return attemptBribe(state, acting.id, rng);
    }

    case 'DISMISS_NOTICE': {
      if (!state.notices.some((n) => n.id === command.id)) return noop(state);
      return { ...state, notices: state.notices.filter((n) => n.id !== command.id) };
    }

    case 'DISMISS_BRIBE_RESULT': {
      if (!state.bribeResult) return noop(state);
      return { ...state, bribeResult: null };
    }

    case 'PROPOSE_TRADE': {
      if (!isCurrent || state.phase !== 'AWAITING_ROLL' || command.offer.fromId !== acting.id) return noop(state);
      if (!validateTradeOffer(state, command.offer)) return noop(state);
      return { ...proposeTrade(state, command.offer), tradeProposedThisTurn: true };
    }

    case 'RESPOND_TRADE': {
      if (state.phase !== 'AWAITING_TRADE_RESPONSE' || !state.trade) return noop(state);
      if (state.trade.toId !== acting.id) return noop(state);
      return respondTrade(state, command.accept);
    }

    case 'CANCEL_TRADE': {
      if (state.phase !== 'AWAITING_TRADE_RESPONSE' || !state.trade) return noop(state);
      if (state.trade.fromId !== acting.id && state.trade.toId !== acting.id) return noop(state);
      return cancelTrade(state);
    }

    case 'DECLARE_BANKRUPTCY': {
      // Only offered while the balance is negative.
      if (!isCurrent || state.phase !== 'AWAITING_ROLL' || acting.cash >= 0) return noop(state);
      return declareBankruptcy(state, acting.id);
    }

    default:
      return state;
  }
}

export function playerById(state: GameState, id: string) {
  return getPlayer(state, id);
}
