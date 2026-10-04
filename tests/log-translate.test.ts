import { describe, it, expect } from 'vitest';
import { createNewGame, applyCommand } from '../src/game/engine';
import { createRng } from '../src/game/engine/random';
import { decideAiCommand, nextActorId } from '../src/game/ai/aiPlayer';
import { translateLog, isLogLineKnown } from '../src/i18n/logTranslate';
import type { GameState, PersonalityId } from '../src/game/types';

function playBotGame(seed: number, steps = 2500): GameState {
  const personalities: PersonalityId[] = ['conservative', 'aggressive', 'developer', 'banker', 'chaotic'];
  const players = [0, 1, 2, 3].map((i) => ({
    name: `Bot${i}`, isAI: true, personality: personalities[(i + seed) % 5], difficulty: 'hard' as const,
  }));
  let s = createNewGame({ players, settings: { sound: false, animations: false, aiSpeedMs: 1, language: 'en' } }, seed);
  const rng = createRng(seed * 7 + 1);
  for (let i = 0; i < steps && s.phase !== 'GAME_OVER'; i++) {
    const id = nextActorId(s);
    if (!id) break;
    const cmd = decideAiCommand(s, id, () => rng.next());
    if (!cmd) break;
    s = applyCommand(s, cmd, id, rng);
  }
  return s;
}

describe('game log is translated', () => {
  it('every line of several full bot games has a translation pattern', () => {
    const unknown = new Set<string>();
    let total = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s = playBotGame(seed);
      total += s.log.length;
      for (const e of s.log) if (!isLogLineKnown(e.text)) unknown.add(e.text.replace(/\d[\d ]*/g, '#'));
    }
    expect(total).toBeGreaterThan(1500); // the games really were played
    expect([...unknown]).toEqual([]);
  });

  it('translates into Uzbek, Russian and Uzbek Cyrillic and keeps names and amounts', () => {
    const line = 'Ali bought Korzinka for 600 000 so\'m.';
    expect(translateLog(line, 'en')).toBe(line);
    const uz = translateLog(line, 'uz');
    const ru = translateLog(line, 'ru');
    const uc = translateLog(line, 'uz-cyrl');
    expect(uz).toContain('Ali');
    expect(uz).toContain("600 000 so'm");
    expect(uz).not.toContain('bought');
    expect(ru).toMatch(/купил/);
    expect(ru).toContain('Korzinka'); // brand names stay Latin
    expect(uc).toMatch(/[\u0400-\u04FF]/);
    expect(uc).toContain('Korzinka');
    expect(uc).not.toMatch(/bought/);
  });

  it('localises asset, card and level names inside lines', () => {
    expect(translateLog('Ali bought Tashkent Metro for 500 000 so\'m.', 'ru')).toContain('Ташкентский метрополитен');
    expect(translateLog('Ali developed Korzinka to Company (300 000 so\'m).', 'ru')).toContain('Компания');
    expect(translateLog("Ali collected 200 000 so'm (Birthday).", 'ru')).toContain('День рождения');
  });

  it('leaves unknown lines untouched instead of hiding them', () => {
    expect(translateLog('Something nobody wrote a pattern for.', 'ru')).toBe('Something nobody wrote a pattern for.');
  });
});
