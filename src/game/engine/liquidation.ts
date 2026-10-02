import type { GameState } from '../types';
import { formatSom } from '../../utils/currency';
import { addNotice, advanceTurn, appendLog, getPlayer, updateOwnership, updatePlayer } from './helpers';
import { canMortgage, canSellDevelopment, mortgageProperty, sellDevelopment } from './properties';
import { resolveLanding } from './turn';
import type { Rng } from './random';

export function liquidateMortgage(state: GameState, playerId: string, spaceId: string, rng: Rng): GameState {
  if (!canMortgage(state, playerId, spaceId)) return state;
  const mortgaged = mortgageProperty(state, playerId, spaceId);
  return settleDebtIfAffordable(mortgaged, playerId, rng);
}

export function liquidateSellDevelopment(state: GameState, playerId: string, spaceId: string, rng: Rng): GameState {
  if (!canSellDevelopment(state, playerId, spaceId)) return state;
  const sold = sellDevelopment(state, playerId, spaceId);
  return settleDebtIfAffordable(sold, playerId, rng);
}

/** If the debtor can now cover the pending debt, pays it (decrementing a
 * loan's installment count if that's what the debt was) and resumes the
 * turn: back to landing resolution if the debt interrupted a card's move,
 * otherwise straight back to AWAITING_ROLL. Otherwise leaves the state in
 * AWAITING_LIQUIDATION. */
function settleDebtIfAffordable(state: GameState, playerId: string, rng: Rng): GameState {
  const debt = state.pendingDebt;
  if (!debt) return state;
  const player = getPlayer(state, playerId);
  if (player.cash < debt.amount) return state;

  let next = updatePlayer(state, playerId, (p) => ({ ...p, cash: p.cash - debt.amount }));
  if (debt.payeeId !== 'BANK') {
    next = updatePlayer(next, debt.payeeId, (p) => ({ ...p, cash: p.cash + debt.amount }));
  }
  if (debt.kind === 'loan') {
    const left = (player.loan?.installmentsLeft ?? 1) - 1;
    next = updatePlayer(next, playerId, (p) => {
      if (!p.loan) return p;
      return { ...p, loan: left > 0 ? { ...p.loan, installmentsLeft: left } : null };
    });
    next = addNotice(next, { kind: 'loanPaid', playerId, amount: debt.amount, remaining: Math.max(0, left) });
  }
  next = appendLog(next, `${player.name} raised cash and settled a debt of ${formatSom(debt.amount)}.`);
  next = { ...next, pendingDebt: null };

  if (next.cardCausedMove) {
    return resolveLanding({ ...next, cardCausedMove: false }, playerId, rng);
  }
  return { ...next, phase: 'AWAITING_ROLL' };
}

/**
 * The debtor gives up: every owned asset is liquidated. Properties owed to
 * another player transfer to them as-is (mortgage status and development
 * preserved); properties owed to the bank (tax / card debts) return to the
 * unowned pool. Ends the debtor's turn and checks the win condition.
 */
export function declareBankruptcy(state: GameState, playerId: string): GameState {
  const debt = state.pendingDebt;
  const player = getPlayer(state, playerId);
  const creditorId = debt?.payeeId && debt.payeeId !== 'BANK' ? debt.payeeId : null;

  let next = state;
  for (const [spaceId, ownership] of Object.entries(state.ownership)) {
    if (ownership.ownerId !== playerId) continue;
    if (creditorId) {
      next = updateOwnership(next, spaceId, (o) => ({ ...o, ownerId: creditorId }));
    } else {
      next = updateOwnership(next, spaceId, () => ({ ownerId: null, level: 0, mortgaged: false, mortgageLapsRemaining: null }));
    }
  }
  // Any un-owed leftover cash (there normally isn't any) follows the same rule.
  if (creditorId) {
    next = updatePlayer(next, creditorId, (p) => ({ ...p, cash: p.cash + player.cash }));
  }
  const bankruptOrder = next.players.filter((p) => p.bankrupt).length + 1;
  next = updatePlayer(next, playerId, (p) => ({ ...p, cash: 0, bankrupt: true, bankruptOrder }));
  next = appendLog(
    next,
    creditorId
      ? `${player.name} went bankrupt. Their assets pass to ${getPlayer(state, creditorId).name}.`
      : `${player.name} went bankrupt. Their properties return to the bank.`
  );
  next = { ...next, pendingDebt: null, drawnCard: null, drawnCardDeck: null };

  const survivors = next.players.filter((p) => !p.bankrupt);
  if (survivors.length <= 1) {
    return {
      ...next,
      phase: 'GAME_OVER',
      winnerId: survivors[0]?.id ?? null,
    };
  }
  return advanceTurn(next);
}
