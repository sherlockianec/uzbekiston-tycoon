import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { GameCommand, GameState, NewGameConfig, Settings } from '../game/types';
import { applyCommand, createNewGame, createRng } from '../game/engine';
import type { Rng } from '../game/engine/random';
import { decideAiCommand, nextActorId } from '../game/ai/aiPlayer';
import { loadGame, saveGame, saveSettings } from '../game/persistence';

interface GameContextValue {
  state: GameState | null;
  dispatch: (command: GameCommand, actingPlayerId?: string) => void;
  startNewGame: (config: NewGameConfig) => void;
  loadSavedGame: () => boolean;
  quitToMenu: () => void;
  updateSettings: (partial: Partial<Settings>) => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}

/** Convenience hook for components that only ever render once a game is
 * active (the board, action bar, modals, ...). */
export function useActiveGame(): Omit<GameContextValue, 'state'> & { state: GameState } {
  const ctx = useGame();
  if (!ctx.state) throw new Error('useActiveGame used with no active game');
  return { ...ctx, state: ctx.state };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const rngRef = useRef<Rng | null>(null);

  const dispatch = useCallback((command: GameCommand, actingPlayerId?: string) => {
    setState((prev) => {
      if (!prev || !rngRef.current) return prev;
      const actorId = actingPlayerId ?? prev.players[prev.currentPlayerIndex].id;
      return applyCommand(prev, command, actorId, rngRef.current);
    });
  }, []);

  const startNewGame = useCallback((config: NewGameConfig) => {
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    rngRef.current = createRng(seed);
    setState(createNewGame(config, seed));
  }, []);

  const loadSavedGame = useCallback((): boolean => {
    const saved = loadGame();
    if (!saved) return false;
    rngRef.current = createRng(Date.now() >>> 0);
    setState(saved);
    return true;
  }, []);

  const quitToMenu = useCallback(() => {
    setState(null);
  }, []);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setState((prev) => (prev ? { ...prev, settings: { ...prev.settings, ...partial } } : prev));
  }, []);

  // Preferences (language, sound, speed...) outlive any single game.
  const settings = state?.settings;
  useEffect(() => {
    if (settings) saveSettings(settings);
  }, [settings]);

  // Autosave whenever state changes (state is only non-null once a game exists).
  useEffect(() => {
    if (state) saveGame(state);
  }, [state]);

  // Drives AI players automatically: after each state change, if whoever
  // needs to act next is an AI, decide their move and dispatch it after a
  // short delay (so the person can follow what's happening on screen).
  useEffect(() => {
    if (!state || state.phase === 'GAME_OVER') return;
    const actorId = nextActorId(state);
    if (!actorId) return;
    const actor = state.players.find((p) => p.id === actorId);
    if (!actor || !actor.isAI || actor.bankrupt) return;

    const timer = setTimeout(() => {
      const command = decideAiCommand(state, actorId);
      if (command) dispatch(command, actorId);
    }, Math.max(150, state.settings.aiSpeedMs));
    return () => clearTimeout(timer);
  }, [state, dispatch]);

  const value = useMemo<GameContextValue>(
    () => ({ state, dispatch, startNewGame, loadSavedGame, quitToMenu, updateSettings }),
    [state, dispatch, startNewGame, loadSavedGame, quitToMenu, updateSettings]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
