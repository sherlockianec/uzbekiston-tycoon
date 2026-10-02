import type { CardDef, DeckId, GameState } from '../types';
import { BOARD, BOARD_SIZE, spaceById, nearestPropertyInGroup } from '../data/board';
import { GROUPS, TAXES, isInfrastructureId } from '../data/properties';
import { MAHALLA_CARDS, BUSINESS_CARDS, ALL_CARDS } from '../data/cards';
import {
  GO_SALARY,
  CORRUPTION_TOLL_AMOUNT,
  BRIBE_GAMBLE_LOSS_CHANCE,
  BRIBE_GAMBLE_JAIL_CHANCE,
  BRIBE_GAMBLE_GAIN_MIN,
  BRIBE_GAMBLE_GAIN_MAX,
  BRIBE_GAMBLE_LOSS_MIN,
  BRIBE_GAMBLE_LOSS_MAX,
  randomBribeAmount,
} from '../data/economy';
import { formatSom } from '../../utils/currency';
import type { Rng } from './random';
import { shuffle } from './random';
import { addNotice, appendLog, chargePlayer, getPlayer, ownableDef, updateOwnership, updatePlayer } from './helpers';
import { computeRent } from './properties';

export function rollDice(rng: Rng): [number, number] {
  return [rng.int(1, 6), rng.int(1, 6)];
}

function grantSalary(state: GameState, playerId: string): GameState {
  let next = updatePlayer(state, playerId, (p) => ({ ...p, cash: p.cash + GO_SALARY }));
  next = appendLog(next, `${getPlayer(state, playerId).name} passed START and collected ${formatSom(GO_SALARY)}.`);

  // Mortgage deadlines: every mortgaged asset this player owns loses one lap;
  // any that hit zero are foreclosed (returned to the bank, no compensation).
  const ownerName = getPlayer(next, playerId).name;
  for (const [spaceId, o] of Object.entries(next.ownership)) {
    if (o.ownerId !== playerId || !o.mortgaged || o.mortgageLapsRemaining == null) continue;
    const remaining = o.mortgageLapsRemaining - 1;
    if (remaining <= 0) {
      const def = ownableDef(spaceId);
      next = updateOwnership(next, spaceId, () => ({ ownerId: null, level: 0, mortgaged: false, mortgageLapsRemaining: null }));
      next = appendLog(next, `${ownerName} missed the redemption deadline on ${def.name} \u2014 the bank foreclosed.`);
      next = addNotice(next, { kind: 'foreclosed', playerId, amount: def.unmortgageCost, remaining: 0, spaceId });
    } else {
      next = updateOwnership(next, spaceId, (oo) => ({ ...oo, mortgageLapsRemaining: remaining }));
    }
  }

  const player = getPlayer(next, playerId);
  if (player.loan && player.loan.installmentsLeft > 0) {
    const amount = player.loan.installmentAmount;
    const { state: charged, needsLiquidation } = chargePlayer(next, playerId, amount, 'BANK', 'loan installment', 'loan');
    if (needsLiquidation) return charged; // settled later; installment count decrements when the debt clears
    const remaining = player.loan.installmentsLeft - 1;
    let afterPay = updatePlayer(charged, playerId, (p) => ({
      ...p,
      loan: remaining > 0 ? { ...p.loan!, installmentsLeft: remaining } : null,
    }));
    afterPay = appendLog(
      afterPay,
      `${player.name} paid a loan installment of ${formatSom(amount)}${remaining > 0 ? ` (${remaining} left)` : ' \u2014 loan paid off'}.`
    );
    return addNotice(afterPay, { kind: 'loanPaid', playerId, amount, remaining });
  }
  return next;
}

function setPosition(state: GameState, playerId: string, index: number): GameState {
  return updatePlayer(state, playerId, (p) => ({ ...p, position: index }));
}

export function moveForward(state: GameState, playerId: string, spaces: number, collectSalary = true): GameState {
  const player = getPlayer(state, playerId);
  const raw = player.position + spaces;
  const newPos = raw % BOARD_SIZE;
  const passedStart = raw >= BOARD_SIZE;
  let next = setPosition(state, playerId, newPos);
  if (passedStart && collectSalary) next = grantSalary(next, playerId);
  return next;
}

export function moveBackward(state: GameState, playerId: string, spaces: number): GameState {
  const player = getPlayer(state, playerId);
  const newPos = (((player.position - spaces) % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  return setPosition(state, playerId, newPos);
}

export function moveToTarget(
  state: GameState,
  playerId: string,
  targetIndex: number,
  collectIfPassed: boolean
): GameState {
  const player = getPlayer(state, playerId);
  let distance = targetIndex - player.position;
  if (distance <= 0) distance += BOARD_SIZE;
  const passedStart = player.position + distance >= BOARD_SIZE;
  let next = setPosition(state, playerId, targetIndex);
  if (passedStart && collectIfPassed) next = grantSalary(next, playerId);
  return next;
}

export function sendToDetention(state: GameState, playerId: string): GameState {
  const detentionIndex = spaceById('detention').index;
  let next = setPosition(state, playerId, detentionIndex);
  next = updatePlayer(next, playerId, (p) => ({ ...p, inDetention: true, detentionTurns: 0 }));
  next = appendLog(next, `${getPlayer(state, playerId).name} was sent to Tax Inspection.`);
  return next;
}

export function releaseFromDetention(state: GameState, playerId: string): GameState {
  return updatePlayer(state, playerId, (p) => ({ ...p, inDetention: false, detentionTurns: 0 }));
}

// --- Bribery: a mandatory toll cell, and a voluntary high-stakes gamble ------------

export function attemptBribe(state: GameState, playerId: string, rng: Rng): GameState {
  const player = getPlayer(state, playerId);
  const roll = rng.next();
  let next: GameState = { ...state, bribeGambleUsedThisTurn: true };

  if (roll < BRIBE_GAMBLE_LOSS_CHANCE) {
    const lossAmount = randomBribeAmount(BRIBE_GAMBLE_LOSS_MIN, BRIBE_GAMBLE_LOSS_MAX, rng.next());
    const { state: charged, needsLiquidation } = chargePlayer(
      next,
      playerId,
      lossAmount,
      'BANK',
      'a failed bribe attempt',
      'card'
    );
    next = charged;
    if (needsLiquidation) return next; // the liquidation flow explains itself; no separate result popup needed
    next = appendLog(
      next,
      `${player.name} tried to bribe a senior official and got burned \u2014 lost ${formatSom(lossAmount)}.`
    );
    if (!player.isAI) next = { ...next, bribeResult: { outcome: 'loss', amount: lossAmount } };
  } else if (roll < BRIBE_GAMBLE_LOSS_CHANCE + BRIBE_GAMBLE_JAIL_CHANCE) {
    next = sendToDetention(next, playerId);
    next = appendLog(next, `${player.name}'s bribe attempt was reported \u2014 straight to Tax Inspection.`);
    if (!player.isAI) next = { ...next, bribeResult: { outcome: 'jail', amount: 0 } };
  } else {
    const gainAmount = randomBribeAmount(BRIBE_GAMBLE_GAIN_MIN, BRIBE_GAMBLE_GAIN_MAX, rng.next());
    next = updatePlayer(next, playerId, (p) => ({ ...p, cash: p.cash + gainAmount }));
    next = appendLog(
      next,
      `${player.name} bribed a senior official and it paid off \u2014 gained ${formatSom(gainAmount)}.`
    );
    if (!player.isAI) next = { ...next, bribeResult: { outcome: 'gain', amount: gainAmount } };
  }
  return next;
}

// --- Cards -------------------------------------------------------------------

function drawFromDeck(state: GameState, deck: DeckId, rng: Rng): { card: CardDef; state: GameState } {
  if (deck === 'mahalla') {
    let drawPile = state.mahallaDeck;
    let discardPile = state.mahallaDiscard;
    if (drawPile.length === 0) {
      drawPile = shuffle(MAHALLA_CARDS.map((c) => c.id), rng);
      discardPile = [];
    }
    const [cardId, ...rest] = drawPile;
    return {
      card: ALL_CARDS[cardId],
      state: { ...state, mahallaDeck: rest, mahallaDiscard: [...discardPile, cardId] },
    };
  }
  let drawPile = state.businessDeck;
  let discardPile = state.businessDiscard;
  if (drawPile.length === 0) {
    drawPile = shuffle(BUSINESS_CARDS.map((c) => c.id), rng);
    discardPile = [];
  }
  const [cardId, ...rest] = drawPile;
  return {
    card: ALL_CARDS[cardId],
    state: { ...state, businessDeck: rest, businessDiscard: [...discardPile, cardId] },
  };
}

function applyCardEffect(state: GameState, playerId: string, card: CardDef, rng: Rng): GameState {
  const effect = card.effect;
  const player = getPlayer(state, playerId);

  switch (effect.type) {
    case 'collect': {
      const next = updatePlayer(state, playerId, (p) => ({ ...p, cash: p.cash + effect.amount }));
      return appendLog(next, `${player.name} collected ${formatSom(effect.amount)} (${card.title}).`);
    }
    case 'pay': {
      const { state: charged } = chargePlayer(state, playerId, effect.amount, 'BANK', card.title, 'card');
      if (charged.phase === 'AWAITING_LIQUIDATION') return charged;
      return appendLog(charged, `${player.name} paid ${formatSom(effect.amount)} (${card.title}).`);
    }
    case 'collectFromEach': {
      let next = state;
      let collected = 0;
      for (const other of state.players) {
        if (other.id === playerId || other.bankrupt) continue;
        const pay = Math.max(0, Math.min(other.cash, effect.amount));
        next = updatePlayer(next, other.id, (p) => ({ ...p, cash: p.cash - pay }));
        collected += pay;
      }
      next = updatePlayer(next, playerId, (p) => ({ ...p, cash: p.cash + collected }));
      return appendLog(next, `${player.name} collected ${formatSom(collected)} from other players (${card.title}).`);
    }
    case 'payToEach': {
      let next = state;
      for (const other of state.players) {
        if (other.id === playerId || other.bankrupt) continue;
        const payer = getPlayer(next, playerId);
        const pay = Math.max(0, Math.min(payer.cash, effect.amount));
        next = updatePlayer(next, playerId, (p) => ({ ...p, cash: p.cash - pay }));
        next = updatePlayer(next, other.id, (p) => ({ ...p, cash: p.cash + pay }));
      }
      return appendLog(next, `${player.name} paid ${formatSom(effect.amount)} to every other player (${card.title}).`);
    }
    case 'moveTo': {
      const target = spaceById(effect.spaceId);
      const moved = moveToTarget(state, playerId, target.index, effect.collectIfPassed);
      return { ...moved, cardCausedMove: true };
    }
    case 'moveRelative': {
      const moved =
        effect.spaces >= 0
          ? moveForward(state, playerId, effect.spaces, false)
          : moveBackward(state, playerId, -effect.spaces);
      return { ...moved, cardCausedMove: true };
    }
    case 'goToDetention':
      // sendToDetention is fully self-contained (no further landing to resolve).
      return sendToDetention(state, playerId);
    case 'getOutFree': {
      const next = updatePlayer(state, playerId, (p) => ({ ...p, releasePapers: p.releasePapers + 1 }));
      return appendLog(next, `${player.name} received a Release Paper.`);
    }
    case 'payPerLevel': {
      let totalLevels = 0;
      for (const o of Object.values(state.ownership)) {
        if (o.ownerId === playerId) totalLevels += o.level;
      }
      const amount = totalLevels * effect.amountPerLevel;
      const { state: charged } = chargePlayer(state, playerId, amount, 'BANK', card.title, 'card');
      if (charged.phase === 'AWAITING_LIQUIDATION') return charged;
      return appendLog(
        charged,
        `${player.name} paid ${formatSom(amount)} across ${totalLevels} development level(s) (${card.title}).`
      );
    }
    case 'payPerInfrastructure': {
      const count = Object.entries(state.ownership).filter(
        ([id, o]) => o.ownerId === playerId && isInfrastructureId(id)
      ).length;
      const amount = count * effect.amountEach;
      const { state: charged } = chargePlayer(state, playerId, amount, 'BANK', card.title, 'card');
      if (charged.phase === 'AWAITING_LIQUIDATION') return charged;
      return appendLog(charged, `${player.name} paid ${formatSom(amount)} (${card.title}).`);
    }
    case 'advanceToNearestGroup': {
      const group = GROUPS.find((g) => g.id === effect.groupId);
      if (!group) return state;
      const target = nearestPropertyInGroup(player.position, group.propertyIds);
      const alreadyOwned = state.ownership[target.id]?.ownerId != null;
      const next = moveToTarget(state, playerId, target.index, effect.collectIfPassed);
      return { ...next, pendingRentMultiplier: alreadyOwned ? 2 : 1, cardCausedMove: true };
    }
    case 'reduceLoanBalance': {
      if (!player.loan) return appendLog(state, `${player.name} had no loan to reduce (${card.title}).`);
      const totalRemaining = player.loan.installmentAmount * player.loan.installmentsLeft;
      const reduced = Math.round((totalRemaining * (1 - effect.percent / 100)) / 1000) * 1000;
      const newInstallmentAmount = Math.round(reduced / player.loan.installmentsLeft / 1000) * 1000;
      const next = updatePlayer(state, playerId, (p) =>
        p.loan ? { ...p, loan: { ...p.loan, installmentAmount: newInstallmentAmount } } : p
      );
      return appendLog(next, `${player.name}'s loan balance was cut by ${effect.percent}% (${card.title}).`);
    }
    case 'forgiveLoan': {
      if (!player.loan) return appendLog(state, `${player.name} had no loan to forgive (${card.title}).`);
      const next = updatePlayer(state, playerId, (p) => ({ ...p, loan: null }));
      return appendLog(next, `${player.name}'s remaining loan was forgiven in full (${card.title}).`);
    }
    case 'extendLoanTerm': {
      if (!player.loan) return appendLog(state, `${player.name} had no loan to extend (${card.title}).`);
      const totalRemaining = player.loan.installmentAmount * player.loan.installmentsLeft;
      const newInstallmentsLeft = player.loan.installmentsLeft + effect.extraInstallments;
      const newInstallmentAmount = Math.round(totalRemaining / newInstallmentsLeft / 1000) * 1000;
      const next = updatePlayer(state, playerId, (p) =>
        p.loan ? { ...p, loan: { ...p.loan, installmentsLeft: newInstallmentsLeft, installmentAmount: newInstallmentAmount } } : p
      );
      return appendLog(next, `${player.name}'s loan term was extended by ${effect.extraInstallments} lap(s) (${card.title}).`);
    }
    case 'taxImmunity': {
      const next = updatePlayer(state, playerId, (p) => ({ ...p, taxImmunity: true }));
      return appendLog(next, `${player.name} is immune to the next tax bill (${card.title}).`);
    }
    case 'purchaseDiscount': {
      const next = updatePlayer(state, playerId, (p) => ({ ...p, purchaseDiscountPercent: effect.percent }));
      return appendLog(next, `${player.name} has ${effect.percent}% off their next purchase (${card.title}).`);
    }
    default:
      return state;
  }
}

/** Draws a card for `playerId` and shows it. The effect is deliberately NOT
 * applied yet — see acknowledgeCard — so the player reads the card before
 * any cash change happens, instead of the number already having moved. */
export function drawCard(state: GameState, playerId: string, deck: DeckId, rng: Rng): GameState {
  const { card, state: drawn } = drawFromDeck(state, deck, rng);
  return { ...drawn, phase: 'AWAITING_CARD_ACK', drawnCard: card, drawnCardDeck: deck, cardCausedMove: false };
}

/** Called when the player dismisses the card modal: applies the card's
 * effect now, then resolves whatever space it left them on, if any. */
export function acknowledgeCard(state: GameState, playerId: string, rng: Rng): GameState {
  const card = state.drawnCard;
  if (!card) return { ...state, phase: 'AWAITING_ROLL' };

  const afterEffect = applyCardEffect({ ...state, cardCausedMove: false }, playerId, card, rng);
  const cleared: GameState = { ...afterEffect, drawnCard: null, drawnCardDeck: null };

  if (cleared.phase === 'AWAITING_LIQUIDATION') {
    return cleared; // an unaffordable card payment (or loan installment along the way) takes over
  }
  if (!cleared.cardCausedMove) {
    return { ...cleared, phase: 'AWAITING_ROLL' };
  }
  return resolveLanding({ ...cleared, cardCausedMove: false }, playerId, rng);
}

// --- Landing resolution --------------------------------------------------------

/** Resolves whatever space the player currently stands on. May move the
 * phase to AWAITING_PURCHASE_DECISION, AWAITING_CARD_ACK or
 * AWAITING_LIQUIDATION; otherwise returns to AWAITING_ROLL. */
export function resolveLanding(state: GameState, playerId: string, rng: Rng): GameState {
  const player = getPlayer(state, playerId);
  const space = BOARD[player.position];
  const multiplier = state.pendingRentMultiplier ?? 1;
  const resetMultiplier = { pendingRentMultiplier: 1 };

  switch (space.kind) {
    case 'property':
    case 'infrastructure':
    case 'utility': {
      const o = state.ownership[space.id];
      if (!o.ownerId) {
        return { ...state, ...resetMultiplier, phase: 'AWAITING_PURCHASE_DECISION', currentSpaceId: space.id };
      }
      if (o.ownerId === playerId || o.mortgaged) {
        return { ...state, ...resetMultiplier, phase: 'AWAITING_ROLL', currentSpaceId: space.id };
      }
      const diceSum = state.dice ? state.dice[0] + state.dice[1] : 0;
      const rent = computeRent(state, space.id, diceSum, multiplier);
      const owner = getPlayer(state, o.ownerId);
      if (rent === 0 && owner.inDetention) {
        const logged = appendLog(state, `${owner.name} is in Tax Inspection, so ${space.id} earned no rent this time.`);
        return { ...logged, ...resetMultiplier, phase: 'AWAITING_ROLL', currentSpaceId: space.id };
      }
      const { state: charged } = chargePlayer(state, playerId, rent, o.ownerId, `rent on ${space.id}`, 'rent');
      if (charged.phase === 'AWAITING_LIQUIDATION') {
        return { ...charged, ...resetMultiplier, currentSpaceId: space.id };
      }
      const logged = appendLog(charged, `${player.name} paid ${formatSom(rent)} rent to ${owner.name}.`);
      return { ...logged, ...resetMultiplier, phase: 'AWAITING_ROLL', currentSpaceId: space.id };
    }
    case 'tax': {
      const def = TAXES[space.id];
      if (player.taxImmunity) {
        const next = updatePlayer(state, playerId, (p) => ({ ...p, taxImmunity: false }));
        const logged = appendLog(next, `${player.name} was immune to ${def.name} this time.`);
        return { ...logged, ...resetMultiplier, phase: 'AWAITING_ROLL', currentSpaceId: space.id };
      }
      let amount: number;
      if (def.kind === 'percent') {
        amount = Math.round((player.cash * def.amount) / 100 / 1000) * 1000;
      } else if (def.kind === 'perAsset') {
        const count = Object.values(state.ownership).filter((o) => o.ownerId === playerId && !o.mortgaged).length;
        amount = count * def.amount;
      } else {
        amount = def.amount;
      }
      const { state: charged } = chargePlayer(state, playerId, amount, 'BANK', `tax at ${space.id}`, 'tax');
      if (charged.phase === 'AWAITING_LIQUIDATION') return { ...charged, ...resetMultiplier, currentSpaceId: space.id };
      const logged = appendLog(charged, `${player.name} paid ${formatSom(amount)} in ${def.name}.`);
      return { ...logged, ...resetMultiplier, phase: 'AWAITING_ROLL', currentSpaceId: space.id };
    }
    case 'corruption': {
      const { state: charged } = chargePlayer(state, playerId, CORRUPTION_TOLL_AMOUNT, 'BANK', 'a local official', 'tax');
      if (charged.phase === 'AWAITING_LIQUIDATION') return { ...charged, ...resetMultiplier, currentSpaceId: space.id };
      const logged = appendLog(
        charged,
        `${player.name} paid ${formatSom(CORRUPTION_TOLL_AMOUNT)} to a local official to keep things moving.`
      );
      return { ...logged, ...resetMultiplier, phase: 'AWAITING_ROLL', currentSpaceId: space.id };
    }
    case 'card-mahalla':
      // Note: no multiplier reset here — a card's own effect (e.g. Construction
      // Boom) may have just set one for the player's new position, and it must
      // survive until that position is resolved via acknowledgeCard().
      return drawCard(state, playerId, 'mahalla', rng);
    case 'card-business':
      return drawCard(state, playerId, 'business', rng);
    case 'corner-go-to-detention': {
      const sent = sendToDetention(state, playerId);
      return { ...sent, ...resetMultiplier, phase: 'AWAITING_ROLL', currentSpaceId: space.id };
    }
    default:
      return { ...state, ...resetMultiplier, phase: 'AWAITING_ROLL', currentSpaceId: space.id };
  }
}
