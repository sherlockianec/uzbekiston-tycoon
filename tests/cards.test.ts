import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/game/types';
import type { Rng } from '../src/game/engine/random';
import { applyCommand, createRng } from '../src/game/engine';
import { newTestGame, queueRng } from './helpers';
import { ALL_CARDS, MAHALLA_CARDS, BUSINESS_CARDS } from '../src/game/data/cards';
import { spaceById } from '../src/game/data/board';
import { PROPERTIES } from '../src/game/data/properties';
import { LOAN_INSTALLMENTS, PROPERTY_TAX_PER_ASSET } from '../src/game/data/economy';

const rng: Rng = createRng(1);
const indexOf = (id: string) => spaceById(id)!.index;

/** Put the current player into AWAITING_CARD_ACK holding `cardId`, then press OK. */
function drawAndAck(state: GameState, cardId: string): GameState {
  const card = ALL_CARDS[cardId];
  const pending: GameState = { ...state, phase: 'AWAITING_CARD_ACK', drawnCard: card, drawnCardDeck: card.deck, cardCausedMove: false };
  return applyCommand(pending, { type: 'ACK_CARD' }, pending.players[pending.currentPlayerIndex].id, rng);
}

function withLoan(state: GameState, installmentAmount: number, installmentsLeft: number): GameState {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === 0 ? { ...p, loan: { principal: 3_000_000, installmentAmount, installmentsLeft } } : p
    ),
  };
}

describe('new card pool', () => {
  it('every new-effect card is present in a deck', () => {
    const types = new Set([...MAHALLA_CARDS, ...BUSINESS_CARDS].map((c) => c.effect.type));
    for (const t of ['reduceLoanBalance', 'forgiveLoan', 'extendLoanTerm', 'taxImmunity', 'purchaseDiscount']) {
      expect(types.has(t as never)).toBe(true);
    }
  });
  it('loan relief is Mahalla; tax and discount are Business', () => {
    for (const c of MAHALLA_CARDS) {
      if (['reduceLoanBalance', 'forgiveLoan', 'extendLoanTerm'].includes(c.effect.type)) expect(c.deck).toBe('mahalla');
      expect(['taxImmunity', 'purchaseDiscount']).not.toContain(c.effect.type);
    }
    for (const c of BUSINESS_CARDS) {
      expect(['reduceLoanBalance', 'forgiveLoan', 'extendLoanTerm']).not.toContain(c.effect.type);
    }
  });
  it('card ids are unique', () => {
    const ids = [...MAHALLA_CARDS, ...BUSINESS_CARDS].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('loan cards', () => {
  it('reduces the remaining balance by 30%', () => {
    const s = drawAndAck(withLoan(newTestGame(), 1_000_000, 3), 'mahalla-loan-relief');
    const loan = s.players[0].loan!;
    expect(loan.installmentsLeft).toBe(3);
    expect(loan.installmentAmount * 3).toBe(2_100_000); // 3,000,000 x 0.7
    expect(s.phase).toBe('AWAITING_ROLL');
  });
  it('forgives the loan entirely', () => {
    const s = drawAndAck(withLoan(newTestGame(), 1_000_000, 2), 'mahalla-loan-forgiven');
    expect(s.players[0].loan).toBeNull();
    expect(s.players[0].cash).toBe(newTestGame().players[0].cash); // no cash changes hands
  });
  it('extends the term by one lap, preserving the total owed', () => {
    const s = drawAndAck(withLoan(newTestGame(), 1_200_000, 2), 'mahalla-loan-extended');
    const loan = s.players[0].loan!;
    expect(loan.installmentsLeft).toBe(3);
    expect(loan.installmentAmount).toBe(800_000); // 2,400,000 / 3
    expect(loan.installmentAmount * loan.installmentsLeft).toBe(2_400_000);
  });
  it('are harmless without a loan and say so in the log', () => {
    for (const id of ['mahalla-loan-relief', 'mahalla-loan-forgiven', 'mahalla-loan-extended']) {
      const s = drawAndAck(newTestGame(), id);
      expect(s.players[0].loan).toBeNull();
      expect(s.phase).toBe('AWAITING_ROLL');
      expect(s.log[s.log.length - 1].text).toMatch(/no loan/);
    }
  });
  it('LOAN_INSTALLMENTS sanity: extending never leaves 0 installments', () => {
    expect(LOAN_INSTALLMENTS).toBeGreaterThan(0);
  });
});

function placeAt(state: GameState, index: number): GameState {
  return { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, position: index } : p)) };
}

describe('tax immunity card', () => {
  it('sets the buff', () => {
    const s = drawAndAck(newTestGame(), 'business-tax-exemption');
    expect(s.players[0].taxImmunity).toBe(true);
  });

  it('is consumed by Income Tax: no payment, buff cleared', () => {
    let s = drawAndAck(newTestGame(), 'business-tax-exemption');
    const cash = s.players[0].cash;
    s = placeAt(s, indexOf('income-tax') - 3);
    s = applyCommand(s, { type: 'ROLL_DICE' }, s.players[0].id, queueRng([1, 2]));
    expect(s.players[0].position).toBe(indexOf('income-tax'));
    expect(s.players[0].cash).toBe(cash);
    expect(s.players[0].taxImmunity).toBe(false);
  });

  it('is consumed by Business Tax even when the bill would have been non-zero', () => {
    let s = drawAndAck(newTestGame(), 'business-tax-exemption');
    s = { ...s, ownership: { ...s.ownership, korzinka: { ...s.ownership['korzinka'], ownerId: s.players[0].id } } };
    const cash = s.players[0].cash;
    s = placeAt(s, indexOf('customs-duty') - 3);
    s = applyCommand(s, { type: 'ROLL_DICE' }, s.players[0].id, queueRng([1, 2]));
    expect(s.players[0].cash).toBe(cash);
    expect(s.players[0].taxImmunity).toBe(false);
  });

  it('is NOT consumed by the Local Official toll (that is not a tax)', () => {
    let s = drawAndAck(newTestGame(), 'business-tax-exemption');
    const cash = s.players[0].cash;
    s = placeAt(s, indexOf('local-official') - 3);
    s = applyCommand(s, { type: 'ROLL_DICE' }, s.players[0].id, queueRng([1, 2]));
    expect(s.players[0].cash).toBeLessThan(cash); // toll was charged
    expect(s.players[0].taxImmunity).toBe(true); // buff still held
  });

  it('without the buff, Business Tax charges per unmortgaged asset', () => {
    let s = newTestGame();
    s = { ...s, ownership: { ...s.ownership, korzinka: { ...s.ownership['korzinka'], ownerId: s.players[0].id } } };
    const cash = s.players[0].cash;
    s = placeAt(s, indexOf('customs-duty') - 3);
    s = applyCommand(s, { type: 'ROLL_DICE' }, s.players[0].id, queueRng([1, 2]));
    expect(s.players[0].cash).toBe(cash - PROPERTY_TAX_PER_ASSET);
  });
});

describe('purchase discount card', () => {
  it('applies to the next purchase only, rounded to 1000, and is logged', async () => {
    const { buyProperty, canBuy } = await import('../src/game/engine/properties');
    let s = drawAndAck(newTestGame(), 'business-supplier-discount');
    expect(s.players[0].purchaseDiscountPercent).toBe(50);
    const id = s.players[0].id;
    const price = PROPERTIES['korzinka'].price;
    const cash0 = s.players[0].cash;
    s = buyProperty(s, id, 'korzinka');
    const discounted = Math.round((price * 0.5) / 1000) * 1000;
    expect(cash0 - s.players[0].cash).toBe(discounted);
    expect(discounted % 1000).toBe(0);
    expect(s.players[0].purchaseDiscountPercent).toBeNull();
    expect(s.log[s.log.length - 1].text).toMatch(/discount/);
    // second purchase: full price
    const cash1 = s.players[0].cash;
    s = buyProperty(s, id, 'makro');
    expect(cash1 - s.players[0].cash).toBe(PROPERTIES['makro'].price);
    expect(canBuy(s, id, 'havas')).toBe(true);
  });

  it('25% card uses its own percentage', () => {
    const s = drawAndAck(newTestGame(), 'business-early-bird');
    expect(s.players[0].purchaseDiscountPercent).toBe(25);
  });

  it('makes an otherwise unaffordable property buyable', async () => {
    const { canBuy } = await import('../src/game/engine/properties');
    let s = drawAndAck(newTestGame(), 'business-supplier-discount');
    const price = PROPERTIES['tashkent-city'].price;
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, cash: Math.round(price * 0.6) } : p)) };
    expect(canBuy(s, s.players[0].id, 'tashkent-city')).toBe(true);
    const plain = { ...s, players: s.players.map((p) => ({ ...p, purchaseDiscountPercent: null })) };
    expect(canBuy(plain, s.players[0].id, 'tashkent-city')).toBe(false);
  });
});
