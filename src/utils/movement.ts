import { BOARD_SIZE } from '../game/data/board';
import type { GameState } from '../game/types';

/** Time one hop takes. Long trips (transport, jail) hop faster so they never drag. */
export function hopStepMs(steps: number): number {
  if (steps > 14) return 80;
  if (steps > 8) return 105;
  return 140;
}

/** Pause after the last hop so the player sees the pawn arrive before anything resolves. */
export const LANDING_SETTLE_MS = 450;

export function pathSteps(from: number, to: number, backward: boolean): number {
  return backward ? (from - to + BOARD_SIZE) % BOARD_SIZE : (to - from + BOARD_SIZE) % BOARD_SIZE;
}

export function movementHoldMs(steps: number): number {
  return steps * hopStepMs(steps) + LANDING_SETTLE_MS;
}

export function reducedMotionPreferred(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export interface MovementHold {
  /** What the UI shows while the pawn is travelling: the new position and dice,
   * but none of the consequences (cash, ownership, prompts) yet. */
  intermediate: GameState;
  ms: number;
}

/**
 * If a command moved a token, returns the "pawn is walking" view of the game
 * and how long to hold it. The engine resolves a move and its consequences in
 * one step; the UI uses this to show them in the right order: walk first,
 * then the purchase prompt / rent / card.
 */
export function planMovementHold(prev: GameState, next: GameState): MovementHold | null {
  const mover = next.players.find((p, i) => !p.bankrupt && prev.players[i] && prev.players[i].position !== p.position);
  if (!mover) return null;
  const before = prev.players.find((p) => p.id === mover.id)!;
  const backward = next.lastMove?.playerId === mover.id ? next.lastMove.backward : false;
  const steps = pathSteps(before.position, mover.position, backward);
  if (steps === 0) return null;
  const intermediate: GameState = {
    ...prev,
    dice: next.dice,
    lastMove: next.lastMove ?? null,
    players: prev.players.map((p) => (p.id === mover.id ? { ...p, position: mover.position } : p)),
  };
  return { intermediate, ms: movementHoldMs(steps) };
}
