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

function afterTrade(state: GameState): GameState {
  return { ...state, trade: null, phase: 'AWAITING_ROLL' };
}

export function cancelTrade(state: GameState): GameState {
  if (!state.trade) return state;
  const next = appendLog(state, 'The trade offer was withdrawn.');
  return afterTrade(next);
}

export function respondTrade(state: GameState, accept: boolean, ratio?: number): GameState {
  const trade = state.trade;
  if (!trade) return state;

  if (!accept) {
    let next = appendLog(state, `${getPlayer(state, trade.toId).name} declined the trade.`);
    const proposer = getPlayer(state, trade.fromId);
    // Remember refused bot offers so the bot raises its price a little, then gives up.
    if (proposer.isAI && trade.requestPropertyIds.length > 0) {
      const key = `${trade.fromId}>${trade.requestPropertyIds[0]}`;
      const rej = { ...(next.tradeRejections ?? {}) };
      rej[key] = (rej[key] ?? 0) + 1;
      next = { ...next, tradeRejections: rej };
    }
    next = { ...next, lastTradeResult: { nonce: Date.now(), fromId: trade.fromId, toId: trade.toId, accepted: false, ratio, offer: { offerCash: trade.offerCash, offerPropertyIds: trade.offerPropertyIds, requestCash: trade.requestCash, requestPropertyIds: trade.requestPropertyIds } } };
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
  next = { ...next, lastTradeResult: { nonce: Date.now(), fromId: trade.fromId, toId: trade.toId, accepted: true } };
  return afterTrade(next);
}
