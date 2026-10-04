import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/game/types';
import { applyCommand, createRng } from '../src/game/engine';
import {
  BRIBE_GAMBLE_GAIN_CHANCE,
  BRIBE_GAMBLE_GAIN_MAX,
  BRIBE_GAMBLE_GAIN_MIN,
  BRIBE_GAMBLE_JAIL_CHANCE,
  BRIBE_GAMBLE_LOSS_CHANCE,
  BRIBE_GAMBLE_LOSS_MAX,
  BRIBE_GAMBLE_LOSS_MIN,
  randomBribeAmount,
} from '../src/game/data/economy';
import { newTestGame as plainGame, floatRng, atOfficial } from './helpers';

// The gamble is only possible while standing on the Senior Official cell.
const newTestGame = () => atOfficial(plainGame());

const attempt = (s: GameState, floats: number[], who = 0) =>
  applyCommand(s, { type: 'ATTEMPT_BRIBE' }, s.players[who].id, floatRng(floats));

describe('bribe odds configuration', () => {
  it('sums to 1 and keeps loss > jail > gain', () => {
    expect(BRIBE_GAMBLE_LOSS_CHANCE + BRIBE_GAMBLE_JAIL_CHANCE + BRIBE_GAMBLE_GAIN_CHANCE).toBeCloseTo(1, 10);
    expect(BRIBE_GAMBLE_LOSS_CHANCE).toBeGreaterThan(BRIBE_GAMBLE_JAIL_CHANCE);
    expect(BRIBE_GAMBLE_JAIL_CHANCE).toBeGreaterThan(BRIBE_GAMBLE_GAIN_CHANCE);
  });
  it('ranges are as specified', () => {
    expect([BRIBE_GAMBLE_LOSS_MIN, BRIBE_GAMBLE_LOSS_MAX]).toEqual([300_000, 1_200_000]);
    expect([BRIBE_GAMBLE_GAIN_MIN, BRIBE_GAMBLE_GAIN_MAX]).toEqual([500_000, 2_500_000]);
  });
});

describe('randomBribeAmount', () => {
  it('hits min and max at the extremes and rounds to 1000', () => {
    expect(randomBribeAmount(300_000, 1_200_000, 0)).toBe(300_000);
    expect(randomBribeAmount(300_000, 1_200_000, 0.999999)).toBe(1_200_000);
    expect(randomBribeAmount(300_000, 1_200_000, 0.5) % 1000).toBe(0);
    expect(randomBribeAmount(500_000, 2_500_000, 0.5)).toBe(1_500_000);
  });
  it('never leaves the range for any roll', () => {
    for (let i = 0; i <= 1000; i++) {
      const v = randomBribeAmount(300_000, 1_200_000, i / 1000);
      expect(v).toBeGreaterThanOrEqual(300_000);
      expect(v).toBeLessThanOrEqual(1_200_000);
    }
  });
});

describe('outcome boundaries', () => {
  it('0.0 and 0.399 -> loss', () => {
    for (const roll of [0.0, 0.399]) {
      const s = newTestGame();
      const r = attempt(s, [roll, 0.5]);
      expect(r.bribeResult?.outcome).toBe('loss');
      expect(r.players[0].cash).toBe(s.players[0].cash - r.bribeResult!.amount);
    }
  });
  it('0.40 and 0.749 -> jail', () => {
    for (const roll of [0.4, 0.749]) {
      const r = attempt(newTestGame(), [roll]);
      expect(r.bribeResult?.outcome).toBe('jail');
      expect(r.players[0].inDetention).toBe(true);
      expect(r.players[0].position).toBe(30);
    }
  });
  it('0.75 and 0.999 -> gain', () => {
    for (const roll of [0.75, 0.999]) {
      const s = newTestGame();
      const r = attempt(s, [roll, 0.5]);
      expect(r.bribeResult?.outcome).toBe('gain');
      expect(r.players[0].cash).toBe(s.players[0].cash + r.bribeResult!.amount);
    }
  });
});

describe('random amounts', () => {
  it('loss: lowest roll takes 300 000, highest takes 1 200 000', () => {
    const s = newTestGame();
    expect(attempt(s, [0.1, 0]).bribeResult?.amount).toBe(300_000);
    expect(attempt(s, [0.1, 0.999999]).bribeResult?.amount).toBe(1_200_000);
  });
  it('gain: lowest roll pays 500 000, highest pays 2 500 000', () => {
    const s = newTestGame();
    expect(attempt(s, [0.9, 0]).bribeResult?.amount).toBe(500_000);
    expect(attempt(s, [0.9, 0.999999]).bribeResult?.amount).toBe(2_500_000);
  });
  it('the amount is logged and matches the cash change', () => {
    const s = newTestGame();
    const r = attempt(s, [0.9, 0.5]);
    expect(r.log[r.log.length - 1].text).toContain('1 500 000');
  });
});

describe('rules around the gamble', () => {
  it('once per turn: a second attempt is a no-op', () => {
    const s = newTestGame();
    const once = attempt(s, [0.9, 0.5]);
    const twice = applyCommand({ ...once, bribeResult: null }, { type: 'ATTEMPT_BRIBE' }, s.players[0].id, floatRng([0.9, 0.5]));
    expect(twice.players[0].cash).toBe(once.players[0].cash);
    expect(once.bribeGambleUsedThisTurn).toBe(true);
  });
  it('is available again after the turn passes', () => {
    let s = attempt(newTestGame(), [0.9, 0.5]);
    s = applyCommand({ ...s, hasRolledThisTurn: true, bribeResult: null }, { type: 'END_TURN' }, s.players[0].id, createRng(1));
    expect(s.bribeGambleUsedThisTurn).toBe(false);
  });
  it('only the current player, only in the roll phase', () => {
    const s = newTestGame();
    const notMe = applyCommand(s, { type: 'ATTEMPT_BRIBE' }, s.players[1].id, floatRng([0.9]));
    expect(notMe).toBe(s);
    const wrongPhase = { ...s, phase: 'AWAITING_PURCHASE_DECISION' as const };
    expect(applyCommand(wrongPhase, { type: 'ATTEMPT_BRIBE' }, s.players[0].id, floatRng([0.9]))).toBe(wrongPhase);
  });
  it('unaffordable loss: balance goes negative and the result popup still shows', () => {
    let s = newTestGame();
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, cash: 100_000 } : p)) };
    const r = attempt(s, [0.1, 0.5]);
    expect(r.phase).toBe('AWAITING_ROLL');
    expect(r.players[0].cash).toBe(100_000 - 750_000);
    expect(r.bribeResult?.outcome).toBe('loss');
  });
  it('AI attempts never set bribeResult, for any outcome', () => {
    for (const [roll, amt] of [[0.1, 0.5], [0.5, 0.5], [0.9, 0.5]]) {
      const s = newTestGame();
      const asCurrent: GameState = { ...s, currentPlayerIndex: 1 };
      const out = applyCommand(asCurrent, { type: 'ATTEMPT_BRIBE' }, asCurrent.players[1].id, floatRng([roll, amt]));
      expect(out.bribeGambleUsedThisTurn).toBe(true);
      expect(out.bribeResult).toBeNull();
    }
  });
  it('a stale result is cleared when the turn advances', () => {
    let s = attempt(newTestGame(), [0.9, 0.5]);
    expect(s.bribeResult).not.toBeNull();
    s = applyCommand({ ...s, hasRolledThisTurn: true }, { type: 'END_TURN' }, s.players[0].id, createRng(1));
    expect(s.bribeResult).toBeNull();
  });
});

describe('statistics (seeded, 20 000 attempts)', () => {
  it('outcome frequencies are within +-2% of 40/35/25 and amounts stay in range', () => {
    const rng = createRng(2024);
    const N = 20_000;
    const counts = { loss: 0, jail: 0, gain: 0 };
    let lossSum = 0;
    let gainSum = 0;
    const base = newTestGame();
    const rich: GameState = { ...base, players: base.players.map((p, i) => (i === 0 ? { ...p, cash: 1e12 } : p)) };
    for (let i = 0; i < N; i++) {
      const r = applyCommand(rich, { type: 'ATTEMPT_BRIBE' }, rich.players[0].id, rng);
      const res = r.bribeResult!;
      counts[res.outcome]++;
      if (res.outcome === 'loss') {
        lossSum += res.amount;
        expect(res.amount).toBeGreaterThanOrEqual(BRIBE_GAMBLE_LOSS_MIN);
        expect(res.amount).toBeLessThanOrEqual(BRIBE_GAMBLE_LOSS_MAX);
      }
      if (res.outcome === 'gain') {
        gainSum += res.amount;
        expect(res.amount).toBeGreaterThanOrEqual(BRIBE_GAMBLE_GAIN_MIN);
        expect(res.amount).toBeLessThanOrEqual(BRIBE_GAMBLE_GAIN_MAX);
      }
    }
    expect(Math.abs(counts.loss / N - 0.4)).toBeLessThan(0.02);
    expect(Math.abs(counts.jail / N - 0.35)).toBeLessThan(0.02);
    expect(Math.abs(counts.gain / N - 0.25)).toBeLessThan(0.02);
    // mean amounts sit near the range midpoints (750k and 1.5M)
    expect(Math.abs(lossSum / counts.loss - 750_000)).toBeLessThan(25_000);
    expect(Math.abs(gainSum / counts.gain - 1_500_000)).toBeLessThan(50_000);
  });
});
