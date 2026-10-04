import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameContext } from '../src/state/GameProvider';
import type { GameState } from '../src/game/types';
import { GROUPS, PROPERTIES } from '../src/game/data/properties';
import { UTILITIES } from '../src/game/data/properties';
import { DETENTION_FINE_SCHEDULE, MAX_LOAN_AMOUNT } from '../src/game/data/economy';
import CostButton from '../src/components/CostButton';
import BuildModal from '../src/components/BuildModal';
import BankModal from '../src/components/BankModal';
import PropertyInspector from '../src/components/PropertyInspector';
import ActionBar from '../src/components/ActionBar';
import { newTestGame } from './helpers';

function wrap(state: GameState, el: React.ReactElement) {
  const value = {
    state,
    dispatch: () => undefined,
    startNewGame: () => undefined,
    loadSavedGame: () => false,
    quitToMenu: () => undefined,
    updateSettings: () => undefined,
  };
  return renderToStaticMarkup(<GameContext.Provider value={value}>{el}</GameContext.Provider>);
}

const withCash = (s: GameState, cash: number): GameState => ({
  ...s,
  players: s.players.map((p, i) => (i === 0 ? { ...p, cash } : p)),
});

/** P0 owns all of bazaars at `level`. */
function ownsBazaars(level: number, cash: number): GameState {
  const s = newTestGame();
  const ownership = { ...s.ownership };
  for (const id of GROUPS.find((g) => g.id === 'bazaars')!.propertyIds) {
    ownership[id] = { ...ownership[id], ownerId: s.players[0].id, level };
  }
  return withCash({ ...s, ownership }, cash);
}

const noop = () => undefined;

describe('CostButton', () => {
  it('affordable: green, enabled, shows the cost', () => {
    const html = renderToStaticMarkup(<CostButton label="Buy" cost={500_000} cash={500_000} lang="en" onClick={noop} />);
    expect(html).toContain('btn--affordable');
    expect(html).not.toContain('btn--unaffordable');
    expect(html).not.toContain('disabled');
    expect(html).toContain('500 000');
  });
  it('unaffordable: red, disabled, states the missing amount in text', () => {
    const html = renderToStaticMarkup(<CostButton label="Buy" cost={500_000} cash={200_000} lang="en" onClick={noop} />);
    expect(html).toContain('btn--unaffordable');
    expect(html).toContain('disabled');
    expect(html).toContain('short by');
    expect(html).toContain('300 000');
  });
  it('the shortfall text is localized', () => {
    const html = renderToStaticMarkup(<CostButton label="X" cost={10} cash={0} lang="ru" onClick={noop} />);
    expect(html).toContain('не хватает');
  });
});

describe('Buy button (inspector)', () => {
  const korz = PROPERTIES['korzinka'];
  const decision = (cash: number): GameState => {
    const s = withCash(newTestGame(), cash);
    return { ...s, phase: 'AWAITING_PURCHASE_DECISION', currentSpaceId: 'korzinka' };
  };
  it('green when affordable', () => {
    const html = wrap(decision(korz.price), <PropertyInspector spaceId="korzinka" actorId={newTestGame().players[0].id} onClose={noop} forceDecision />);
    expect(html).toContain('btn--affordable');
  });
  it('red + short-by when not', () => {
    const html = wrap(decision(korz.price - 1000), <PropertyInspector spaceId="korzinka" actorId={newTestGame().players[0].id} onClose={noop} forceDecision />);
    expect(html).toContain('btn--unaffordable');
    expect(html).toContain('short by');
  });
  it('shows the discounted price when a discount is held', () => {
    let s = decision(korz.price);
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, purchaseDiscountPercent: 50 } : p)) };
    const html = wrap(s, <PropertyInspector spaceId="korzinka" actorId={s.players[0].id} onClose={noop} forceDecision />);
    expect(html).toMatch(/Buy \(450 000/);
  });
});

describe('Develop buttons', () => {
  const A = PROPERTIES['chorsu-bazaar'];
  it('BuildModal lists an unaffordable development in red with the shortfall', () => {
    const s = ownsBazaars(0, A.developmentCost - 1000);
    const html = wrap(s, <BuildModal actorId={s.players[0].id} onClose={noop} />);
    expect(html).toContain('btn--unaffordable');
    expect(html).toContain('short by');
    expect(html).not.toContain('btn--affordable');
  });
  it('BuildModal shows green when affordable', () => {
    const s = ownsBazaars(0, 50_000_000);
    const html = wrap(s, <BuildModal actorId={s.players[0].id} onClose={noop} />);
    expect(html).toContain('btn--affordable');
  });
  it('level 4 -> 5 shows the premium price', () => {
    const s = ownsBazaars(4, 50_000_000);
    const html = wrap(s, <BuildModal actorId={s.players[0].id} onClose={noop} />);
    expect(html).toContain(String(A.developmentCostLevel5).replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
  });
  it('inspector Develop button is red when cash is short', () => {
    const s = ownsBazaars(0, 1000);
    const html = wrap(s, <PropertyInspector spaceId="chorsu-bazaar" actorId={s.players[0].id} onClose={noop} />);
    expect(html).toContain('btn--unaffordable');
  });
  it('shows "nothing to build" without a monopoly', () => {
    const s = newTestGame();
    const html = wrap(s, <BuildModal actorId={s.players[0].id} onClose={noop} />);
    expect(html).not.toContain('btn--affordable');
    expect(html).not.toContain('btn--unaffordable');
  });
});

describe('Unmortgage button', () => {
  const mortgaged = (cash: number): GameState => {
    const s = newTestGame();
    return withCash(
      { ...s, ownership: { ...s.ownership, korzinka: { ownerId: s.players[0].id, level: 0, mortgaged: true, mortgageLapsRemaining: 5 } } },
      cash
    );
  };
  it('green with enough cash, red without', () => {
    const price = PROPERTIES['korzinka'].unmortgageCost;
    const id = newTestGame().players[0].id;
    expect(wrap(mortgaged(price), <PropertyInspector spaceId="korzinka" actorId={id} onClose={noop} />)).toContain('btn--affordable');
    const red = wrap(mortgaged(price - 1000), <PropertyInspector spaceId="korzinka" actorId={id} onClose={noop} />);
    expect(red).toContain('btn--unaffordable');
    expect(red).toContain('short by');
  });
});

describe('Bank buttons', () => {
  it('Take loan is green for a valid amount', () => {
    const s = newTestGame();
    const html = wrap(s, <BankModal actorId={s.players[0].id} onClose={noop} />);
    expect(html).toContain('btn--affordable');
  });
  it('Repay is green when cash covers the balance, red otherwise', () => {
    const s = newTestGame();
    const loan = { principal: 3_000_000, dueAmount: 3_900_000, lapsLeft: 3 }; // 3.9M due at maturity
    const mk = (cash: number) => withCash({ ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, loan } : p)) }, cash);
    expect(wrap(mk(3_900_000), <BankModal actorId={s.players[0].id} onClose={noop} />)).toContain('btn--affordable');
    const red = wrap(mk(3_899_000), <BankModal actorId={s.players[0].id} onClose={noop} />);
    expect(red).toContain('btn--unaffordable');
    expect(red).toContain('1 000');
    expect(MAX_LOAN_AMOUNT).toBeGreaterThan(0);
    void UTILITIES;
  });
});

describe('Pay fine button', () => {
  const jailed = (cash: number): GameState => {
    const s = newTestGame();
    return withCash(
      {
        ...s,
        phase: 'AWAITING_ROLL',
        hasRolledThisTurn: false,
        players: s.players.map((p, i) => (i === 0 ? { ...p, inDetention: true, detentionTurns: 0 } : p)),
      },
      cash
    );
  };
  it('green when affordable, red when not', () => {
    const fine = DETENTION_FINE_SCHEDULE[0];
    const props = { onOpenTrade: noop, onOpenBuild: noop, onOpenBank: noop, onOpenNetworkTravel: noop, onOpenBribe: noop };
    expect(wrap(jailed(fine), <ActionBar {...props} />)).toContain('btn--affordable');
    const red = wrap(jailed(fine - 1000), <ActionBar {...props} />);
    expect(red).toContain('btn--unaffordable');
    expect(red).toContain('short by');
  });
});
