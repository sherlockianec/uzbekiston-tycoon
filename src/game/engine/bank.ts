import type { GameState } from '../types';
import { LOAN_INTEREST_PERCENT, LOAN_LAPS, MAX_LOAN_AMOUNT, MIN_LOAN_AMOUNT } from '../data/economy';
import { formatSom } from '../../utils/currency';
import { appendLog, getPlayer, updatePlayer } from './helpers';

export function canTakeLoan(state: GameState, playerId: string, amount: number): boolean {
  const player = getPlayer(state, playerId);
  if (player.loan) return false; // one loan at a time, keeps repayment tracking simple
  if (!Number.isFinite(amount)) return false;
  return amount >= MIN_LOAN_AMOUNT && amount <= MAX_LOAN_AMOUNT;
}

/** What a loan of `amount` will cost in total at maturity (rounded to 1 000). */
export function loanDueFor(amount: number): number {
  return Math.round((amount * (1 + LOAN_INTEREST_PERCENT / 100)) / 1000) * 1000;
}

/** Borrow `amount` now; principal + interest is taken ONCE, in one lump sum,
 * the LOAN_LAPS-th time you pass/land on START. */
export function takeLoan(state: GameState, playerId: string, amount: number): GameState {
  const dueAmount = loanDueFor(amount);
  const player = getPlayer(state, playerId);
  let next = updatePlayer(state, playerId, (p) => ({
    ...p,
    cash: p.cash + amount,
    loan: { principal: amount, dueAmount, lapsLeft: LOAN_LAPS },
  }));
  next = appendLog(
    next,
    `${player.name} took a loan of ${formatSom(amount)} \u2014 ${formatSom(dueAmount)} is taken at once after ${LOAN_LAPS} laps.`
  );
  return next;
}

export function canRepayLoanEarly(state: GameState, playerId: string): boolean {
  const player = getPlayer(state, playerId);
  if (!player.loan) return false;
  return player.cash >= player.loan.dueAmount;
}

export function repayLoanEarly(state: GameState, playerId: string): GameState {
  const player = getPlayer(state, playerId);
  if (!player.loan) return state;
  const due = player.loan.dueAmount;
  let next = updatePlayer(state, playerId, (p) => ({ ...p, cash: p.cash - due, loan: null }));
  next = appendLog(next, `${player.name} repaid the ${formatSom(due)} loan early.`);
  return next;
}
