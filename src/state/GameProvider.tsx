import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { GameCommand, GameState, NewGameConfig, Settings } from '../game/types';
import { applyCommand, createNewGame, createRng } from '../game/engine';
import type { Rng } from '../game/engine/random';
import { decideAiCommand, nextActorId } from '../game/ai/aiPlayer';
import { loadGame, saveGame, saveSettings } from '../game/persistence';
import { hopStepMs, pathSteps, planMovementHold, reducedMotionPreferred } from '../utils/movement';
import { stepsToStart } from '../components/boardGeometry';

/** A short-lived "+/- money" badge shown next to a player's icon. */
export interface MoneyFloat {
  id: number;
  playerId: string;
  delta: number;
  /** 'start': drawn on the START tile (salary / loan maturity) instead of beside the pawn. */
  anchor?: 'start';
}

const FLOAT_LIFETIME_MS = 2400;

interface GameContextValue {
  /** What the UI should draw. While a pawn is walking this lags the engine's
   * state on purpose (see planMovementHold); the AI and autosave use the real one. */
  state: GameState | null;
  /** True while a pawn is mid-walk: actions are not offered yet. */
  busy?: boolean;
  floats?: MoneyFloat[];
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

/** Money floats for one player (empty outside the provider, e.g. in tests). */
export function useMoneyFloats(playerId: string): MoneyFloat[] {
  const ctx = useContext(GameContext);
  const all = ctx?.floats;
  return useMemo(() => (all ?? []).filter((f) => f.playerId === playerId && f.anchor !== 'start'), [all, playerId]);
}

/** Floats that belong on the START tile. */
export function useStartFloats(): MoneyFloat[] {
  const ctx = useContext(GameContext);
  const all = ctx?.floats;
  return useMemo(() => (all ?? []).filter((f) => f.anchor === 'start'), [all]);
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setState] = useState<GameState | null>(null);
  const [shown, setShown] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  const [floats, setFloats] = useState<MoneyFloat[]>([]);
  const rngRef = useRef<Rng | null>(null);
  const busyRef = useRef(false);
  const latestRef = useRef<GameState | null>(null);
  const prevAuthRef = useRef<GameState | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const floatIdRef = useRef(0);
  const floatTimersRef = useRef<number[]>([]);
  const prevCashRef = useRef<{ game: number; cash: Record<string, number> } | null>(null);
  const lastMoveSeenRef = useRef<unknown>(null);
  const startSplitRef = useRef<{ playerId: string; delta: number } | null>(null);

  const dispatch = useCallback((command: GameCommand, actingPlayerId?: string) => {
    setState((prev) => {
      if (!prev || !rngRef.current) return prev;
      // Nothing is actionable while a pawn is still walking to its tile.
      if (busyRef.current && command.type !== 'DISMISS_NOTICE') return prev;
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
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    busyRef.current = false;
    setBusy(false);
    setFloats([]);
    setState(null);
  }, []);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setState((prev) => (prev ? { ...prev, settings: { ...prev.settings, ...partial } } : prev));
  }, []);

  // The "presented" state: identical to the real one except for the moment a
  // pawn is walking, when landing consequences are held back until it arrives.
  useEffect(() => {
    latestRef.current = gameState;
    if (!gameState) {
      prevAuthRef.current = null;
      setShown(null);
      return;
    }
    const prev = prevAuthRef.current;
    prevAuthRef.current = gameState;
    if (holdTimerRef.current != null) return; // the running timer publishes the latest state when it ends
    const hold =
      prev && prev.createdAt === gameState.createdAt && gameState.settings.animations && !reducedMotionPreferred()
        ? planMovementHold(prev, gameState)
        : null;
    if (!hold) {
      setShown(gameState);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setShown(hold.intermediate);
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      busyRef.current = false;
      setBusy(false);
      setShown(latestRef.current);
    }, hold.ms);
  }, [gameState]);

  useEffect(
    () => () => {
      if (holdTimerRef.current != null) window.clearTimeout(holdTimerRef.current);
      for (const id of floatTimersRef.current) window.clearTimeout(id);
    },
    []
  );

  const state = gameState ? (shown && shown.createdAt === gameState.createdAt ? shown : gameState) : null;

  // Floating "+100 000 / -100 000" badges: one per player whose cash changed in what is shown.
  // Money earned/lost by crossing START is split off and drawn ON the START tile at the moment
  // the pawn crosses it, not when the pawn finishes walking.
  useEffect(() => {
    if (!state) {
      prevCashRef.current = null;
      lastMoveSeenRef.current = null;
      startSplitRef.current = null;
      return;
    }
    const cash: Record<string, number> = {};
    for (const p of state.players) cash[p.id] = p.cash;
    const prev = prevCashRef.current;
    prevCashRef.current = { game: state.createdAt, cash };
    if (!prev || prev.game !== state.createdAt) {
      lastMoveSeenRef.current = state.lastMove;
      startSplitRef.current = null;
      return;
    }

    const lm = state.lastMove;
    if (lm && lm !== lastMoveSeenRef.current) {
      lastMoveSeenRef.current = lm;
      if (lm.crossedStart && lm.startDelta !== 0 && !lm.backward) {
        const walking = busyRef.current;
        const total = pathSteps(lm.from, lm.to, false);
        const delay = walking ? stepsToStart(lm.from) * hopStepMs(total) : 0;
        startSplitRef.current = { playerId: lm.playerId, delta: lm.startDelta };
        const id = ++floatIdRef.current;
        const mover = lm.playerId;
        const amount = lm.startDelta;
        floatTimersRef.current.push(
          window.setTimeout(() => {
            setFloats((f) => [...f, { id, playerId: mover, delta: amount, anchor: 'start' as const }].slice(-12));
            floatTimersRef.current.push(window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), FLOAT_LIFETIME_MS));
          }, delay)
        );
      }
    } else if (lm !== lastMoveSeenRef.current) {
      lastMoveSeenRef.current = lm;
    }

    const added: MoneyFloat[] = [];
    for (const p of state.players) {
      if (p.bankrupt) continue;
      let delta = p.cash - (prev.cash[p.id] ?? p.cash);
      const split = startSplitRef.current;
      if (split && split.playerId === p.id && delta !== 0) {
        delta -= split.delta;
        startSplitRef.current = null;
      }
      if (delta !== 0) added.push({ id: ++floatIdRef.current, playerId: p.id, delta });
    }
    if (added.length === 0) return;
    setFloats((f) => [...f, ...added].slice(-12));
    const ids = new Set(added.map((a) => a.id));
    floatTimersRef.current.push(
      window.setTimeout(() => setFloats((f) => f.filter((x) => !ids.has(x.id))), FLOAT_LIFETIME_MS)
    );
  }, [state]);

  // Preferences (language, sound, speed...) outlive any single game.
  const settings = gameState?.settings;
  useEffect(() => {
    if (settings) saveSettings(settings);
  }, [settings]);

  // Autosave whenever state changes (state is only non-null once a game exists).
  useEffect(() => {
    if (gameState) saveGame(gameState);
  }, [gameState]);

  // Drives AI players automatically: after each state change, if whoever
  // needs to act next is an AI, decide their move and dispatch it after a
  // short delay (so the person can follow what's happening on screen).
  useEffect(() => {
    if (!gameState || gameState.phase === 'GAME_OVER' || busy) return;
    const actorId = nextActorId(gameState);
    if (!actorId) return;
    const actor = gameState.players.find((p) => p.id === actorId);
    if (!actor || !actor.isAI || actor.bankrupt) return;

    const timer = setTimeout(() => {
      const command = decideAiCommand(gameState, actorId);
      if (command) dispatch(command, actorId);
    }, Math.max(150, gameState.settings.aiSpeedMs));
    return () => clearTimeout(timer);
  }, [gameState, busy, dispatch]);

  const value = useMemo<GameContextValue>(
    () => ({ state, busy, floats, dispatch, startNewGame, loadSavedGame, quitToMenu, updateSettings }),
    [state, busy, floats, dispatch, startNewGame, loadSavedGame, quitToMenu, updateSettings]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
