import type { GameState, Language } from '../game/types';
import { AI_FIRST_NAMES } from '../game/ai/personalities';
import { latinToCyrillic } from './translit';

/** How a bot's (stored, Latin) name is shown: Botir -> Ботир in Russian and Uzbek Cyrillic. */
export function localBotName(name: string, lang: Language): string {
  if (lang === 'en' || lang === 'uz') return name;
  if (!(AI_FIRST_NAMES as readonly string[]).includes(name)) return name;
  const cyr = latinToCyrillic(name);
  return lang === 'ru' ? cyr.replace(/Ў/g, 'У').replace(/ў/g, 'у').replace(/Қ/g, 'К').replace(/қ/g, 'к').replace(/Ғ/g, 'Г').replace(/ғ/g, 'г').replace(/Ҳ/g, 'Х').replace(/ҳ/g, 'х') : cyr;
}

const NAME_RE = new RegExp(`(?<![A-Za-z])(${AI_FIRST_NAMES.join('|')})(?![A-Za-z])`, 'g');

/** Replace every bot name inside a sentence (used for the game log). */
export function localizeNamesInText(text: string, lang: Language): string {
  if (lang === 'en' || lang === 'uz') return text;
  return text.replace(NAME_RE, (n) => localBotName(n, lang));
}

/** The same state, but with bot names shown in the language's alphabet. Ids are unchanged. */
export function withLocalBotNames(state: GameState, lang: Language): GameState {
  if (lang === 'en' || lang === 'uz') return state;
  return { ...state, players: state.players.map((p) => (p.isAI ? { ...p, name: localBotName(p.name, lang) } : p)) };
}
