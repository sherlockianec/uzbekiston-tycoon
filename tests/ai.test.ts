import { describe, it, expect } from 'vitest';
import type { GameState, PersonalityId, Difficulty } from '../src/game/types';
import { applyCommand, createNewGame, createRng } from '../src/game/engine';
import { decideAiCommand, pickBribe, pickRedemption } from '../src/game/ai/aiPlayer';
import { PERSONALITIES } from '../src/game/ai/personalities';
import { BRIBE_GAMBLE_LOSS_MAX, MORTGAGE_WARNING_LAPS } from '../src/game/data/economy';
import { PROPERTIES } from '../src/game/data/properties';
import { newTestGame } from './helpers';

const mortgagedFor = (cash: number, laps: number): GameState => {
  const s = newTestGame();
  return {
    ...s,
    ownership: { ...s.ownership, korzinka: { ownerId: s.players[0].id, level: 0, mortgaged: true, mortgageLapsRemaining: laps } },
    players: s.players.map((p, i) => (i === 0 ? { ...p, cash } : p)),
  };
};
const cost = PROPERTIES['korzinka'].unmortgageCost;

describe('AI mortgage redemption', () => {
  const t = PERSONALITIES.conservative;
  it('redeems an urgent mortgage even with a thin cushion', () => {
    const s = mortgagedFor(cost + t.cashReserve * 0.25, MORTGAGE_WARNING_LAPS);
    expect(pickRedemption(s, s.players[0], t, 'normal', true)).toEqual({ type: 'UNMORTGAGE', spaceId: 'korzinka' });
  });
  it('does not redeem when it cannot afford it', () => {
    const s = mortgagedFor(cost - 1, 1);
    expect(pickRedemption(s, s.players[0], t, 'hard', true)).toBeNull();
  });
  it('leaves a non-urgent mortgage alone unless comfortably flush', () => {
    const tight = mortgagedFor(cost + t.cashReserve, 5);
    expect(pickRedemption(tight, tight.players[0], t, 'normal', true)).toBeNull();
    expect(pickRedemption(tight, tight.players[0], t, 'normal', false)).toBeNull();
    const flush = mortgagedFor(cost + t.cashReserve * 2, 5);
    expect(pickRedemption(flush, flush.players[0], t, 'normal', false)).not.toBeNull();
  });
  it('easy AI only reacts on the last lap, and never "comfortably"', () => {
    const two = mortgagedFor(1e9, 2);
    expect(pickRedemption(two, two.players[0], t, 'easy', true)).toBeNull();
    expect(pickRedemption(two, two.players[0], t, 'easy', false)).toBeNull();
    const one = mortgagedFor(1e9, 1);
    expect(pickRedemption(one, one.players[0], t, 'easy', true)).not.toBeNull();
  });
  it('most urgent mortgage first', () => {
    let s = mortgagedFor(1e9, 4);
    s = { ...s, ownership: { ...s.ownership, havas: { ownerId: s.players[0].id, level: 0, mortgaged: true, mortgageLapsRemaining: 1 } } };
    expect(pickRedemption(s, s.players[0], t, 'hard', true)).toEqual({ type: 'UNMORTGAGE', spaceId: 'havas' });
  });
  it('decideAiCommand wires it in after the roll', () => {
    let s = mortgagedFor(1e9, 1);
    s = { ...s, phase: 'AWAITING_ROLL', hasRolledThisTurn: true, players: s.players.map((p, i) => (i === 0 ? { ...p, isAI: true } : p)) };
    expect(decideAiCommand(s, s.players[0].id, () => 0.99)?.type).toBe('UNMORTGAGE');
  });
});

describe('AI bribe gamble', () => {
  const rich = (): GameState => {
    const s = newTestGame();
    return { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, cash: 50_000_000 } : p)) };
  };
  it('only the chaotic personality ever gambles', () => {
    for (const [id, traits] of Object.entries(PERSONALITIES)) {
      const s = rich();
      const cmd = pickBribe(s, s.players[0], traits, () => 0, 'hard');
      if (id === 'chaotic') expect(cmd).toEqual({ type: 'ATTEMPT_BRIBE' });
      else expect(cmd).toBeNull();
    }
  });
  it('is probabilistic, not every turn', () => {
    const s = rich();
    expect(pickBribe(s, s.players[0], PERSONALITIES.chaotic, () => 0.99, 'hard')).toBeNull();
  });
  it('never when a worst-case loss could force liquidation', () => {
    const s = newTestGame();
    const poor = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, cash: BRIBE_GAMBLE_LOSS_MAX + PERSONALITIES.chaotic.cashReserve - 1 } : p)) };
    expect(pickBribe(poor, poor.players[0], PERSONALITIES.chaotic, () => 0, 'hard')).toBeNull();
  });
  it('not twice in a turn, not from detention, not while holding a loan', () => {
    const t = PERSONALITIES.chaotic;
    const s = rich();
    expect(pickBribe({ ...s, bribeGambleUsedThisTurn: true }, s.players[0], t, () => 0, 'hard')).toBeNull();
    const jailed = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, inDetention: true } : p)) };
    expect(pickBribe(jailed, jailed.players[0], t, () => 0, 'hard')).toBeNull();
    const loan = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, loan: { principal: 1, installmentAmount: 1, installmentsLeft: 1 } } : p)) };
    expect(pickBribe(loan, loan.players[0], t, () => 0, 'hard')).toBeNull();
  });
  it('easy gambles half as often', () => {
    const s = rich();
    const t = PERSONALITIES.chaotic; // chaos .6 -> hard .30, easy .15
    expect(pickBribe(s, s.players[0], t, () => 0.2, 'hard')).not.toBeNull();
    expect(pickBribe(s, s.players[0], t, () => 0.2, 'easy')).toBeNull();
  });
});

/** Run an all-AI game and fail on any stall (an AI command that changes nothing). */
function simulate(seed: number, personalities: PersonalityId[], difficulty: Difficulty, maxSteps = 6000) {
  const rng = createRng(seed);
  let s = createNewGame(
    {
      players: personalities.map((personality, i) => ({ name: `AI${i}`, isAI: true, personality, difficulty })),
      settings: { sound: false, animations: false, aiSpeedMs: 0, language: 'en' },
    },
    seed
  );
  const stats = { steps: 0, bribes: 0, redemptions: 0, foreclosures: 0 };
  while (s.phase !== 'GAME_OVER' && stats.steps < maxSteps) {
    const actorId = s.phase === 'AWAITING_TRADE_RESPONSE' ? s.trade!.toId : s.players[s.currentPlayerIndex].id;
    const cmd = decideAiCommand(s, actorId, () => rng.next());
    if (!cmd) throw new Error(`AI returned no command in phase ${s.phase} (seed ${seed})`);
    const next = applyCommand(s, cmd, actorId, rng);
    if (next === s) throw new Error(`Illegal/no-op AI command ${cmd.type} in ${s.phase} (seed ${seed}, step ${stats.steps})`);
    if (cmd.type === 'ATTEMPT_BRIBE') stats.bribes++;
    if (cmd.type === 'UNMORTGAGE') stats.redemptions++;
    stats.foreclosures += next.log.slice(s.log.length).filter((l) => /foreclosed/.test(l.text)).length;
    s = next;
    stats.steps++;
  }
  return { s, stats };
}

describe('AI-vs-AI simulation', () => {
  it('10 mixed games never stall or play an illegal move', () => {
    const mix: PersonalityId[] = ['conservative', 'aggressive', 'developer', 'chaotic'];
    let finished = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const { s } = simulate(seed, mix, (['easy', 'normal', 'hard'] as Difficulty[])[seed % 3]);
      if (s.phase === 'GAME_OVER') finished++;
      // money is conserved enough to stay sane
      for (const p of s.players) expect(Number.isFinite(p.cash)).toBe(true);
    }
    expect(finished).toBe(10); // every game reaches a winner
  });
  it('chaotic AIs gamble over a batch of games', () => {
    let bribes = 0;
    for (let seed = 100; seed < 106; seed++) bribes += simulate(seed, ['chaotic', 'chaotic', 'conservative'], 'hard').stats.bribes;
    expect(bribes).toBeGreaterThan(0);
  });
});
