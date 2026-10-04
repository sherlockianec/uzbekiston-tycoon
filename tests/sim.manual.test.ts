import { it } from 'vitest';
import { createNewGame, applyCommand } from '../src/game/engine';
import { createRng } from '../src/game/engine/random';
import { decideAiCommand, nextActorId } from '../src/game/ai/aiPlayer';
import type { GameState, PersonalityId } from '../src/game/types';
import { PROPERTIES } from '../src/game/data/properties';

const IDS: PersonalityId[] = ['conservative', 'aggressive', 'developer', 'banker', 'chaotic'];
function play(seed: number) {
  const players = [0, 1, 2, 3].map((i) => ({ name: `B${i}`, isAI: true, personality: IDS[(i + seed) % 5], difficulty: 'hard' as const }));
  let s = createNewGame({ players, settings: { sound: false, animations: false, aiSpeedMs: 1, language: 'en' } }, seed);
  const rng = createRng(seed * 7 + 1);
  let n = 0;
  for (; n < 30000 && s.phase !== 'GAME_OVER'; n++) {
    const id = nextActorId(s); if (!id) break;
    const cmd = decideAiCommand(s, id, () => rng.next()); if (!cmd) break;
    s = applyCommand(s, cmd, id, rng);
  }
  return s;
}
it.skipIf(!process.env.SIM)('sim', () => {
  const N = +(process.env.SIM ?? 0);
  const turns: number[] = []; const wins: Record<string, number> = {}; let over = 0; let dev = 0, trades = 0;
  for (let seed = 1; seed <= N; seed++) {
    const s = play(seed);
    turns.push(s.turnNumber);
    if (s.phase === 'GAME_OVER') {
      over++;
      const w = s.players.find((p) => !p.bankrupt)!;
      const k = String(w.personality); wins[k] = (wins[k] ?? 0) + 1;
    }
    dev += s.log.filter((l) => /developed/.test(l.text)).length;
    trades += s.log.filter((l) => /completed a trade/.test(l.text)).length;
  }
  turns.sort((a, b) => a - b);
  const avg = Object.values(PROPERTIES).reduce((a, p) => a + p.price, 0) / Object.values(PROPERTIES).length;
  console.log(JSON.stringify({ N, finished: over, medianTurns: turns[N >> 1], p90: turns[Math.floor(N * 0.9)], max: turns[N - 1], wins, devPerGame: dev / N, tradesPerGame: trades / N, avgPrice: Math.round(avg) }));
}, 600000);
