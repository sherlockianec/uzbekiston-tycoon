import type { GamePhase, GameState, TradeOffer } from '../types';
import { formatSom } from '../../utils/currency';
import { appendLog, getPlayer, ownableDef, updateOwnership, updatePlayer } from './helpers';

// --- Trading ---------------------------------------------------------------------

export function proposeTrade(state: GameState, offer: Omit<TradeOffer, 'id'>): GameState {
  const trade: TradeOffer = { ...offer, id: `trade-${Date.now()}` };
  const next = appendLog(
    state,
    `${getPlayer(state, offer.fromId).name} proposed a trade to ${getPlayer(state, offer.toId).name}.`
  );
  // A trade may be opened while paying off a debt; remember to go back there.
  const returnPhase: GamePhase = state.phase === 'AWAITING_LIQUIDATION' ? 'AWAITING_LIQUIDATION' : 'AWAITING_ROLL';
  return { ...next, trade, phase: 'AWAITING_TRADE_RESPONSE', tradeReturnPhase: returnPhase };
}

function afterTrade(state: GameState): GameState {
  return { ...state, trade: null, phase: state.tradeReturnPhase ?? 'AWAITING_ROLL', tradeReturnPhase: null };
}

export function cancelTrade(state: GameState): GameState {
  if (!state.trade) return state;
  const next = appendLog(state, 'The trade offer was withdrawn.');
  return afterTrade(next);
}

export function respondTrade(state: GameState, accept: boolean): GameState {
  const trade = state.trade;
  if (!trade) return state;

  if (!accept) {
    const next = appendLog(state, `${getPlayer(state, trade.toId).name} declined the trade.`);
    return afterTrade(next);
  }

  let next = state;
  next = updatePlayer(next, trade.fromId, (p) => ({
    ...p,
    cash: p.cash - trade.offerCash + trade.requestCash,
    releasePapers: p.releasePapers - trade.offerReleasePapers + trade.requestReleasePapers,
  }));
  next = updatePlayer(next, trade.toId, (p) => ({
    ...p,
    cash: p.cash - trade.requestCash + trade.offerCash,
    releasePapers: p.releasePapers - trade.requestReleasePapers + trade.offerReleasePapers,
  }));
  for (const spaceId of trade.offerPropertyIds) {
    next = updateOwnership(next, spaceId, (o) => ({ ...o, ownerId: trade.toId }));
  }
  for (const spaceId of trade.requestPropertyIds) {
    next = updateOwnership(next, spaceId, (o) => ({ ...o, ownerId: trade.fromId }));
  }
  next = appendLog(
    next,
    `${getPlayer(state, trade.fromId).name} and ${getPlayer(state, trade.toId).name} completed a trade.`
  );
  return afterTrade(next);
}
