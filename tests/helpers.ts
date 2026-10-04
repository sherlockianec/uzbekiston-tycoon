import type { GameState } from '../src/game/types';
import type { Rng } from '../src/game/engine/random';
import { createNewGame } from '../src/game/engine';

export function newTestGame(playerCount = 2): GameState {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    name: `P${i}`,
    isAI: i !== 0,
    personality: 'conservative' as const,
    difficulty: 'normal' as const,
  }));
  return createNewGame(
    { players, settings: { sound: false, animations: false, aiSpeedMs: 100, language: 'en' } },
    12345
  );
}

/** RNG whose int() replays a queue (dice) then returns min; next() is fixed. */
export function queueRng(ints: number[], next = 0.5): Rng {
  let i = 0;
  return { next: () => next, int: (min: number) => (i < ints.length ? ints[i++] : min) };
}

/** RNG whose next() replays a queue (then repeats the last value); int() returns min. */
export function floatRng(floats: number[]): Rng {
  let i = 0;
  return {
    next: () => floats[Math.min(i++, floats.length - 1)],
    int: (min: number) => min,
  };
}

/** Puts every player on the Senior Official (bribe) corner, index 20. */
export function atOfficial(s: GameState): GameState {
  return { ...s, players: s.players.map((p) => ({ ...p, position: 20 })) };
}
