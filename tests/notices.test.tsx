import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '../src/game/types';
import { applyCommand, mortgageProperty } from '../src/game/engine';
import { GameContext } from '../src/state/GameProvider';
import NoticeToasts, { noticeText } from '../src/components/NoticeToasts';
import { GO_SALARY } from '../src/game/data/economy';
import { newTestGame, queueRng } from './helpers';

/** Player 0 sits 2 before START and rolls 5 (idx 38 + 5 -> passes START, lands idx 3). */
function passStartWith(s: GameState, who = 0): GameState {
  const t: GameState = {
    ...s,
    currentPlayerIndex: who,
    phase: 'AWAITING_ROLL',
    hasRolledThisTurn: false,
    players: s.players.map((p, i) => (i === who ? { ...p, position: 38 } : p)),
  };
  return applyCommand(t, { type: 'ROLL_DICE' }, t.players[who].id, queueRng([2, 3]));
}
const withLoan = (s: GameState, left: number, who = 0): GameState => ({
  ...s,
  players: s.players.map((p, i) => (i === who ? { ...p, loan: { principal: 3_000_000, installmentAmount: 1_300_000, installmentsLeft: left } } : p)),
});

describe('loan installment notices', () => {
  it('human passing START with a loan gets a toast with the amount and remainder', () => {
    const r = passStartWith(withLoan(newTestGame(), 3));
    expect(r.notices).toHaveLength(1);
    expect(r.notices[0]).toMatchObject({ kind: 'loanPaid', amount: 1_300_000, remaining: 2, playerId: r.players[0].id });
    expect(r.players[0].loan?.installmentsLeft).toBe(2);
  });
  it('the final installment says "paid off"', () => {
    const r = passStartWith(withLoan(newTestGame(), 1));
    expect(r.notices[0].remaining).toBe(0);
    expect(r.players[0].loan).toBeNull();
    expect(noticeText(r.notices[0], 'en')).toMatch(/paid off/);
  });
  it('AI players never get a toast (the log still records it)', () => {
    const r = passStartWith(withLoan(newTestGame(), 3, 1), 1);
    expect(r.notices).toHaveLength(0);
    expect(r.log.some((l) => /loan installment/.test(l.text))).toBe(true);
  });
  it('no loan, no toast', () => {
    expect(passStartWith(newTestGame()).notices).toHaveLength(0);
  });
  it('an installment settled through liquidation raises its toast only once paid', () => {
    let s = withLoan(newTestGame(), 2);
    const id = s.players[0].id;
    s = {
      ...s,
      ownership: { ...s.ownership, 'tashkent-city': { ...s.ownership['tashkent-city'], ownerId: id } },
      players: s.players.map((p, i) =>
        i === 0 ? { ...p, cash: 0, loan: { ...p.loan!, installmentAmount: 3_000_000 } } : p
      ),
    };
    const r = passStartWith(s); // salary 1.5M < 3M installment
    expect(GO_SALARY).toBeLessThan(3_000_000);
    expect(r.phase).toBe('AWAITING_LIQUIDATION');
    expect(r.pendingDebt?.kind).toBe('loan');
    expect(r.notices).toHaveLength(0);
    // mortgaging Tashkent City raises 1.75M: 1.5M + 1.75M >= 3M, so the debt settles
    const settled = applyCommand(r, { type: 'LIQUIDATE_MORTGAGE', spaceId: 'tashkent-city' }, id, queueRng([]));
    expect(settled.pendingDebt).toBeNull();
    expect(settled.notices).toHaveLength(1);
    expect(settled.notices[0]).toMatchObject({ kind: 'loanPaid', amount: 3_000_000, remaining: 1 });
    expect(settled.players[0].loan?.installmentsLeft).toBe(1);
  });
});

describe('foreclosure notice', () => {
  it('tells the human owner which asset the bank took', () => {
    let s = newTestGame();
    const id = s.players[0].id;
    s = { ...s, ownership: { ...s.ownership, korzinka: { ...s.ownership['korzinka'], ownerId: id } } };
    s = mortgageProperty(s, id, 'korzinka');
    s = { ...s, ownership: { ...s.ownership, korzinka: { ...s.ownership['korzinka'], mortgageLapsRemaining: 1 } } };
    const r = passStartWith(s);
    expect(r.notices).toHaveLength(1);
    expect(r.notices[0]).toMatchObject({ kind: 'foreclosed', spaceId: 'korzinka' });
    expect(noticeText(r.notices[0], 'en')).toContain('Korzinka');
  });
});

describe('notice lifecycle', () => {
  it('DISMISS_NOTICE removes only that notice; unknown ids are a no-op', () => {
    const r = passStartWith(withLoan(newTestGame(), 3));
    const id = r.notices[0].id;
    expect(applyCommand(r, { type: 'DISMISS_NOTICE', id: 'nope' }, r.players[0].id, queueRng([]))).toBe(r);
    const d = applyCommand(r, { type: 'DISMISS_NOTICE', id }, r.players[0].id, queueRng([]));
    expect(d.notices).toHaveLength(0);
  });
  it('un-dismissed notices are cleared when the turn advances', () => {
    let r = passStartWith(withLoan(newTestGame(), 3));
    if (r.phase === 'AWAITING_PURCHASE_DECISION') r = applyCommand(r, { type: 'DECLINE_PURCHASE' }, r.players[0].id, queueRng([]));
    expect(r.notices.length).toBe(1);
    r = applyCommand(r, { type: 'END_TURN' }, r.players[0].id, queueRng([]));
    expect(r.notices).toHaveLength(0);
  });
});

describe('toast rendering and translation', () => {
  const render = (s: GameState) =>
    renderToStaticMarkup(
      <GameContext.Provider
        value={{ state: s, dispatch: () => undefined, startNewGame: () => undefined, loadSavedGame: () => false, quitToMenu: () => undefined, updateSettings: () => undefined }}
      >
        <NoticeToasts />
      </GameContext.Provider>
    );
  it('renders an accessible status region with the message', () => {
    const r = passStartWith(withLoan(newTestGame(), 3));
    const html = render(r);
    expect(html).toContain('role="status"');
    expect(html).toContain('1 300 000');
    expect(html).toContain('aria-label="Dismiss"');
  });
  it('renders nothing when there are no notices', () => {
    expect(render(newTestGame())).toBe('');
  });
  it('is translated into all four languages', () => {
    const r = passStartWith(withLoan(newTestGame(), 3));
    const texts = (['en', 'uz', 'ru', 'uz-cyrl'] as const).map((l) => noticeText(r.notices[0], l));
    expect(new Set(texts).size).toBe(4);
    expect(texts[2]).toMatch(/Осталось/);
    expect(texts[3]).toMatch(/қолди/);
    for (const x of texts) expect(x).not.toContain('{');
  });
});
