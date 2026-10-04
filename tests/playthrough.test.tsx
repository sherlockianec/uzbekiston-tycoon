import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameContext } from '../src/state/GameProvider';
import type { GameState, Language } from '../src/game/types';
import { applyCommand, createNewGame, createRng } from '../src/game/engine';
import { decideAiCommand, nextActorId } from '../src/game/ai/aiPlayer';
import GameScreen from '../src/pages/GameScreen';
import BuildModal from '../src/components/BuildModal';
import BankModal from '../src/components/BankModal';
import BribeModal from '../src/components/BribeModal';
import NetworkTravelModal from '../src/components/NetworkTravelModal';
import NegativeBalanceModal from '../src/components/NegativeBalanceModal';
import CardModal from '../src/components/CardModal';
import EndGameModal from '../src/components/EndGameModal';
import TradeModal from '../src/components/TradeModal';
import PropertyInspector from '../src/components/PropertyInspector';
import { ALL_CARDS } from '../src/game/data/cards';
import { newTestGame } from './helpers';

const LANGS: Language[] = ['en', 'uz', 'ru', 'uz-cyrl'];
const noop = () => undefined;

function wrap(state: GameState, el: React.ReactElement) {
  const value = { state, dispatch: noop, startNewGame: noop, loadSavedGame: () => false, quitToMenu: noop, updateSettings: noop };
  return renderToStaticMarkup(<GameContext.Provider value={value}>{el}</GameContext.Provider>);
}

/** Things that must never appear in rendered UI text. */
function assertClean(html: string, where: string) {
  const text = html.replace(/<style[\s\S]*?<\/style>/g, '');
  for (const bad of ['NaN', 'undefined', '[object', 'null%']) {
    expect(text.includes(bad), `${where}: contains "${bad}"`).toBe(false);
  }
  expect(/\{[A-Za-z]+\}/.test(text), `${where}: unfilled {placeholder}`).toBe(false);
  expect(/\\u[0-9a-fA-F]{4}/.test(text), `${where}: raw \\u escape`).toBe(false);
}

function withLang(s: GameState, language: Language): GameState {
  return { ...s, settings: { ...s.settings, language } };
}

/** Snapshots from real AI-vs-AI games. The player who must act next is flagged human
 * in the *rendered copy only*, so every phase's modal for that player gets rendered. */
function collectSnapshots(seed: number) {
  const rng = createRng(seed);
  let s = createNewGame(
    {
      players: (['conservative', 'aggressive', 'developer', 'chaotic'] as const).map((p, i) => ({ name: `Bot${i}`, isAI: true, personality: p, difficulty: 'normal' as const })),
      settings: { sound: false, animations: false, aiSpeedMs: 0, language: 'en' },
    },
    seed
  );
  // Seat 0 is flagged human (still driven by the AI logic) and starts with a loan, so
  // installment toasts - which only human players receive - appear in the sampled states.
  s = {
    ...s,
    players: s.players.map((p, i) =>
      i === 0 ? { ...p, isAI: false, loan: { principal: 3_000_000, dueAmount: 3_900_000, lapsLeft: 3 } } : p
    ),
  };
  const snaps: { state: GameState; step: number }[] = [];
  const phases = new Set<string>();
  const sawNotice = { v: false };
  let step = 0;
  while (s.phase !== 'GAME_OVER' && step < 4000) {
    const actorId = nextActorId(s)!;
    const key = s.phase + (s.players[s.currentPlayerIndex].cash < 0 ? 'negative' : '');
    const interesting = (s.phase !== 'AWAITING_ROLL' || key.endsWith('negative')) && !phases.has(key);
    if (interesting || step % 29 === 0 || s.notices.length > 0) {
      if (interesting) phases.add(key);
      if (s.notices.length) sawNotice.v = true;
      snaps.push({ step, state: s });
    }
    const cmd = decideAiCommand(s, actorId, () => rng.next())!;
    s = applyCommand(s, cmd, actorId, rng);
    step++;
  }
  snaps.push({ state: s, step });
  if (s.phase === 'GAME_OVER') phases.add('GAME_OVER');
  return { snaps, phases, sawNotice: sawNotice.v };
}

function asHumanActor(s: GameState): GameState {
  const id = nextActorId(s);
  return { ...s, players: s.players.map((p) => (p.id === id ? { ...p, isAI: false } : p)) };
}

describe('simulated playthroughs rendered in every language', () => {
  const runs = [1, 2, 3].map(collectSnapshots);

  it('the sampled games reached every interesting phase (so the render coverage is real)', () => {
    const all = new Set(runs.flatMap((r) => [...r.phases]));
    for (const phase of ['AWAITING_PURCHASE_DECISION', 'AWAITING_CARD_ACK', 'AWAITING_TRADE_RESPONSE', 'GAME_OVER']) {
      expect([...all].some((p) => p.startsWith(phase)), `never reached ${phase}`).toBe(true);
    }
    expect(runs.some((r) => r.sawNotice)).toBe(true);
    expect([...all].some((p) => p.endsWith('negative'))).toBe(true); // loan/foreclosure toasts were on screen at least once
  });

  it('GameScreen renders every sampled state in all 4 languages without junk', () => {
    let rendered = 0;
    for (const { snaps } of runs) {
      for (const { state, step } of snaps) {
        for (const lang of LANGS) {
          const html = wrap(withLang(asHumanActor(state), lang), <GameScreen onQuit={noop} onPlayAgain={noop} />);
          assertClean(html, `step ${step} ${lang} ${state.phase}`);
          expect(html.length).toBeGreaterThan(1000);
          rendered++;
        }
      }
    }
    expect(rendered).toBeGreaterThan(200);
  });

  it('Russian and Uzbek-Cyrillic screens really are in Cyrillic (spot check)', () => {
    const state = asHumanActor(runs[0].snaps[0].state);
    for (const lang of ['ru', 'uz-cyrl'] as const) {
      const html = wrap(withLang(state, lang), <GameScreen onQuit={noop} onPlayAgain={noop} />);
      expect((html.match(/[\u0400-\u04ff]/g) ?? []).length).toBeGreaterThan(30);
    }
  });
});

describe('every modal in every language', () => {
  function richGame(): GameState {
    // Player 0 owns a full group + an infrastructure asset + a mortgaged property + a loan.
    let s = newTestGame(3);
    const me = s.players[0].id;
    const own = (id: string, extra: Record<string, unknown> = {}) => {
      s = { ...s, ownership: { ...s.ownership, [id]: { ...s.ownership[id], ownerId: me, ...extra } } };
    };
    own('chorsu-bazaar', { level: 2 });
    own('qumtepa-bazaar', { level: 2 });
    own('korzinka', { mortgaged: true, mortgageLapsRemaining: 2 });
    own('uzbekistan-railways');
    own('uzbekneftegaz');
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0 ? { ...p, position: 5, loan: { principal: 3_000_000, dueAmount: 2_600_000, lapsLeft: 2 } } : p
      ),
    };
    return s;
  }

  it('renders all modals cleanly', () => {
    for (const lang of LANGS) {
      const s = withLang(richGame(), lang);
      const me = s.players[0].id;
      const other = s.players[1].id;
      const cases: [string, GameState, React.ReactElement][] = [
        ['Build', s, <BuildModal key="b" actorId={me} onClose={noop} />],
        ['Bank (loan)', s, <BankModal key="k" actorId={me} onClose={noop} />],
        ['Bank (no loan)', withLang(newTestGame(), lang), <BankModal key="k2" actorId={newTestGame().players[0].id} onClose={noop} />],
        ['Network travel', s, <NetworkTravelModal key="n" actorId={me} onClose={noop} />],
        ['Trade builder', s, <TradeModal key="t" actorId={me} onClose={noop} />],
        [
          'Trade review',
          {
            ...s,
            phase: 'AWAITING_TRADE_RESPONSE',
            trade: { id: 't1', fromId: other, toId: me, offerCash: 500_000, offerPropertyIds: ['makro'], offerReleasePapers: 1, requestCash: 0, requestPropertyIds: ['chorsu-bazaar'], requestReleasePapers: 0 },
          },
          <TradeModal key="tr" actorId={me} onClose={noop} />,
        ],
        ['Negative balance', { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, cash: -9_000_000 } : p)) } as GameState, <NegativeBalanceModal key="l" actorId={me} onSetAside={noop} onOpenBank={noop} onOpenTrade={noop} />],
        ['Inspector (property)', s, <PropertyInspector key="p1" spaceId="chorsu-bazaar" actorId={me} onClose={noop} />],
        ['Inspector (mortgaged)', s, <PropertyInspector key="p2" spaceId="korzinka" actorId={me} onClose={noop} />],
        ['Inspector (infra)', s, <PropertyInspector key="p3" spaceId="uzbekistan-railways" actorId={me} onClose={noop} />],
        ['Inspector (utility)', s, <PropertyInspector key="p4" spaceId="uzbekneftegaz" actorId={me} onClose={noop} />],
        ['Inspector (unowned)', s, <PropertyInspector key="p5" spaceId="havas" actorId={me} onClose={noop} forceDecision />],
        ['Bribe (idle)', s, <BribeModal key="br" actorId={me} onClose={noop} />],
        ...(['gain', 'loss', 'jail'] as const).map(
          (o) => [`Bribe (${o})`, { ...s, bribeResult: { outcome: o, amount: 1_250_000 } }, <BribeModal key={`br-${o}`} actorId={me} onClose={noop} />] as [string, GameState, React.ReactElement]
        ),
        ['End game', { ...s, phase: 'GAME_OVER', winnerId: me, players: s.players.map((p, i) => (i === 0 ? p : { ...p, bankrupt: true, bankruptOrder: i })) } as GameState, <EndGameModal key="e" onPlayAgain={noop} onReturnToMenu={noop} />],
        ...Object.values(ALL_CARDS).map(
          (c) => [`Card ${c.id}`, { ...s, phase: 'AWAITING_CARD_ACK', drawnCard: c, drawnCardDeck: c.deck } as GameState, <CardModal key={c.id} actorId={me} />] as [string, GameState, React.ReactElement]
        ),
      ];
      for (const [name, state, el] of cases) {
        const html = wrap(state, el);
        assertClean(html, `${name} (${lang})`);
        expect(html.length, `${name} (${lang}) rendered nothing`).toBeGreaterThan(50);
      }
    }
  });
});
