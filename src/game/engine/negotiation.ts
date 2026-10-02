import type { GameState, TradeOffer } from '../types';
import { formatSom } from '../../utils/currency';
import { appendLog, getPlayer, ownableDef, updateOwnership, updatePlayer } from './helpers';

// --- Trading ---------------------------------------------------------------------

export function proposeTrade(state: GameState, offer: Omit<TradeOffer, 'id'>): GameState {
  const trade: TradeOffer = { ...offer, id: `trade-${Date.now()}` };
  const next = appendLog(
    state,
    `${getPlayer(state, offer.fromId).name} proposed a trade to ${getPlayer(state, offer.toId).name}.`
  );
  return { ...next, trade, phase: 'AWAITING_TRADE_RESPONSE' };
}

export function cancelTrade(state: GameState): GameState {
  if (!state.trade) return state;
  const next = appendLog(state, 'The trade offer was withdrawn.');
  return { ...next, trade: null, phase: 'AWAITING_ROLL' };
}

export function respondTrade(state: GameState, accept: boolean): GameState {
  const trade = state.trade;
  if (!trade) return state;

  if (!accept) {
    const next = appendLog(state, `${getPlayer(state, trade.toId).name} declined the trade.`);
    return { ...next, trade: null, phase: 'AWAITING_ROLL' };
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
  return { ...next, trade: null, phase: 'AWAITING_ROLL' };
}
