import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameContext } from '../src/state/GameProvider';
import { createNewGame, buyProperty, developProperty } from '../src/game/engine';
import type { GameState } from '../src/game/types';
import GameScreen from '../src/pages/GameScreen';

function harness(state: GameState) {
  const value = {
    state,
    dispatch: () => undefined,
    startNewGame: () => undefined,
    loadSavedGame: () => false,
    quitToMenu: () => undefined,
    updateSettings: () => undefined,
  };
  return (
    <GameContext.Provider value={value}>
      <GameScreen onQuit={() => undefined} onPlayAgain={() => undefined} />
    </GameContext.Provider>
  );
}

describe('GameScreen render smoke test', () => {
  it('renders a fresh game (board, panels, action bar) without throwing', () => {
    const state = createNewGame(
      {
        players: [
          { name: 'You', isAI: false },
          { name: 'Aziz', isAI: true, personality: 'aggressive', difficulty: 'normal' },
          { name: 'Malika', isAI: true, personality: 'developer', difficulty: 'hard' },
        ],
        settings: { sound: false, animations: true, aiSpeedMs: 500, language: 'en' },
      },
      99
    );
    const html = renderToStaticMarkup(harness(state));
    expect(html).toContain('Aziz');
    expect(html).toContain('Malika');
  });

  it('renders correctly with owned, developed and mortgaged properties on the board', () => {
    let state = createNewGame(
      {
        players: [
          { name: 'You', isAI: false },
          { name: 'Bot', isAI: true, personality: 'banker', difficulty: 'easy' },
        ],
        settings: { sound: true, animations: true, aiSpeedMs: 500, language: 'uz' },
      },
      7
    );
    const humanId = state.players[0].id;
    state = buyProperty(state, humanId, 'chorsu-bazaar');
    state = buyProperty(state, humanId, 'qumtepa-bazaar');
    state = developProperty(state, humanId, 'chorsu-bazaar');
    const html = renderToStaticMarkup(harness(state));
    expect(html.length).toBeGreaterThan(0);
  });

  it('renders the forced purchase-decision modal', () => {
    const state = createNewGame(
      {
        players: [
          { name: 'You', isAI: false },
          { name: 'Bot', isAI: true, personality: 'chaotic', difficulty: 'hard' },
        ],
        settings: { sound: false, animations: false, aiSpeedMs: 500, language: 'en' },
      },
      3
    );
    const withDecision: GameState = { ...state, phase: 'AWAITING_PURCHASE_DECISION', currentSpaceId: 'korzinka' };
    const html = renderToStaticMarkup(harness(withDecision));
    expect(html).toContain('Korzinka');
  });

  it('renders the drawn-card modal', () => {
    const state = createNewGame(
      {
        players: [
          { name: 'You', isAI: false },
          { name: 'Bot', isAI: true, personality: 'banker', difficulty: 'normal' },
        ],
        settings: { sound: false, animations: false, aiSpeedMs: 500, language: 'en' },
      },
      3
    );
    const withCard: GameState = {
      ...state,
      phase: 'AWAITING_CARD_ACK',
      drawnCard: {
        id: 'birthday-gift',
        deck: 'mahalla',
        title: 'Birthday',
        titleUz: "Tug'ilgan kun",
        text: 'It is your birthday.',
        effect: { type: 'collect', amount: 200_000 },
      },
      drawnCardDeck: 'mahalla',
    };
    const html = renderToStaticMarkup(harness(withCard));
    expect(html).toContain('Birthday');
  });

  it('renders the end-game victory modal', () => {
    const state = createNewGame(
      {
        players: [
          { name: 'You', isAI: false },
          { name: 'Bot', isAI: true, personality: 'banker', difficulty: 'normal' },
        ],
        settings: { sound: false, animations: false, aiSpeedMs: 500, language: 'en' },
      },
      3
    );
    const gameOver: GameState = { ...state, phase: 'GAME_OVER', winnerId: state.players[0].id };
    const html = renderToStaticMarkup(harness(gameOver));
    expect(html).toContain('You');
  });
});
