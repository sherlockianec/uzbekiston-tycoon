import type { GameState } from '../types';
import { LOAN_INTEREST_PERCENT, LOAN_INSTALLMENTS, MAX_LOAN_AMOUNT, MIN_LOAN_AMOUNT } from '../data/economy';
import { formatSom } from '../../utils/currency';
import { appendLog, getPlayer, updatePlayer } from './helpers';

export function canTakeLoan(state: GameState, playerId: string, amount: number): boolean {
  const player = getPlayer(state, playerId);
  if (player.loan) return false; // one loan at a time, keeps repayment tracking simple
  if (!Number.isFinite(amount)) return false;
  return amount >= MIN_LOAN_AMOUNT && amount <= MAX_LOAN_AMOUNT;
}

/** Borrow `amount` now; repay principal + interest in equal installments,
 * one collected automatically each time you next pass/land on START. */
export function takeLoan(state: GameState, playerId: string, amount: number): GameState {
  const totalOwed = Math.round((amount * (1 + LOAN_INTEREST_PERCENT / 100)) / 1000) * 1000;
  const installmentAmount = Math.round(totalOwed / LOAN_INSTALLMENTS / 1000) * 1000;
  const player = getPlayer(state, playerId);
  let next = updatePlayer(state, playerId, (p) => ({
    ...p,
    cash: p.cash + amount,
    loan: { principal: amount, installmentAmount, installmentsLeft: LOAN_INSTALLMENTS },
  }));
  next = appendLog(
    next,
    `${player.name} took a loan of ${formatSom(amount)} \u2014 ${formatSom(installmentAmount)} x ${LOAN_INSTALLMENTS}, one due each lap of the board.`
  );
  return next;
}

export function canRepayLoanEarly(state: GameState, playerId: string): boolean {
  const player = getPlayer(state, playerId);
  if (!player.loan) return false;
  const remaining = player.loan.installmentAmount * player.loan.installmentsLeft;
  return player.cash >= remaining;
}

export function repayLoanEarly(state: GameState, playerId: string): GameState {
  const player = getPlayer(state, playerId);
  if (!player.loan) return state;
  const remaining = player.loan.installmentAmount * player.loan.installmentsLeft;
  let next = updatePlayer(state, playerId, (p) => ({ ...p, cash: p.cash - remaining, loan: null }));
  next = appendLog(next, `${player.name} paid off the remaining ${formatSom(remaining)} loan balance early.`);
  return next;
}
