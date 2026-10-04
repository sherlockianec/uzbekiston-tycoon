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
const withLoan = (s: GameState, left: number, who = 0, due = 3_900_000): GameState => ({
  ...s,
  players: s.players.map((p, i) => (i === who ? { ...p, loan: { principal: 3_000_000, dueAmount: due, lapsLeft: left } } : p)),
});

describe('loan notices (one lump payment at maturity)', () => {
  it('a lap before maturity: toast with the amount due and laps left, nothing charged', () => {
    const r = passStartWith(withLoan(newTestGame(), 3));
    expect(r.notices).toHaveLength(1);
    expect(r.notices[0]).toMatchObject({ kind: 'loanLap', amount: 3_900_000, remaining: 2, playerId: r.players[0].id });
    expect(r.players[0].loan?.lapsLeft).toBe(2);
  });
  it('at maturity the whole amount is taken at once, even below zero', () => {
    let s = withLoan(newTestGame(), 1, 0, 13_000_000);
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, cash: 4_000_000 } : p)) };
    const r = passStartWith(s);
    expect(r.notices[0]).toMatchObject({ kind: 'loanPaid', amount: 13_000_000, remaining: 0 });
    expect(r.players[0].loan).toBeNull();
    expect(r.players[0].cash).toBe(4_000_000 + GO_SALARY - 13_000_000);
    expect(noticeText(r.notices[0], 'en')).toMatch(/13 000 000/);
  });
  it('AI players never get a toast (the log still records it)', () => {
    const r = passStartWith(withLoan(newTestGame(), 3, 1), 1);
    expect(r.notices).toHaveLength(0);
    expect(r.log.some((l) => /loan/.test(l.text))).toBe(true);
  });
  it('no loan, no toast', () => {
    expect(passStartWith(newTestGame()).notices).toHaveLength(0);
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
    expect(html).toContain('3 900 000');
    expect(html).toContain('aria-label="Dismiss"');
  });
  it('renders nothing when there are no notices', () => {
    expect(render(newTestGame())).toBe('');
  });
  it('is translated into all four languages', () => {
    const r = passStartWith(withLoan(newTestGame(), 3));
    const texts = (['en', 'uz', 'ru', 'uz-cyrl'] as const).map((l) => noticeText(r.notices[0], l));
    expect(new Set(texts).size).toBe(4);
    expect(texts[2]).toMatch(/кругов/);
    expect(texts[3]).toMatch(/қолди/);
    for (const x of texts) expect(x).not.toContain('{');
  });
});
