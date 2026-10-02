import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { STRINGS, t, tf, localized } from '../src/i18n/strings';
import type { Language } from '../src/game/types';
import { ALL_CARDS } from '../src/game/data/cards';
import { PROPERTIES, INFRASTRUCTURE, UTILITIES } from '../src/game/data/properties';
import {
  CARD_TRANSLATION_IDS,
  PROPERTY_DESCRIPTION_IDS,
  cardText,
  cardTitle,
  devLevelName,
  propertyDescription,
  personalityLabel,
  difficultyLabel,
} from '../src/i18n/content';
import { RULE_SECTIONS, RULES_INTRO, ruleText } from '../src/i18n/rules';
import { PERSONALITIES, DIFFICULTY_LABELS } from '../src/game/ai/personalities';
import { ruleVars } from '../src/pages/RulesScreen';
import RulesScreen from '../src/pages/RulesScreen';
import NewGameScreen from '../src/pages/NewGameScreen';
import StartScreen from '../src/pages/StartScreen';
import { DEFAULT_SETTINGS } from '../src/game/persistence';

const LANGS: Language[] = ['en', 'uz', 'ru', 'uz-cyrl'];
const CYR = /[\u0400-\u04ff]/;
const LAT = /[A-Za-z]/;
const placeholders = (s: string) => (s.match(/\{[A-Za-z]+\}/g) ?? []).sort().join(',');

// Entries that are legitimately identical across languages (brand / loanword).
const SAME_ALLOWED = new Set(['appTitle', 'appSubtitle', 'bank', 'deckMahalla']);

describe('UI strings: completeness', () => {
  const keys = Object.keys(STRINGS) as (keyof typeof STRINGS)[];

  it('has a non-empty value in all 4 languages for every key', () => {
    for (const k of keys) {
      for (const l of LANGS) {
        const v = (STRINGS[k] as Record<string, string>)[l];
        expect(v && v.trim().length > 0, `${k}.${l}`).toBe(true);
      }
    }
  });

  it('never leaks a raw \\uXXXX escape into visible text', () => {
    for (const k of keys) {
      for (const l of LANGS) {
        expect((STRINGS[k] as Record<string, string>)[l], `${k}.${l}`).not.toMatch(/\\u[0-9a-fA-F]{4}/);
      }
    }
  });

  it('uses the right script: Cyrillic for ru/uz-cyrl, Latin for en/uz', () => {
    for (const k of keys) {
      const e = STRINGS[k] as Record<string, string>;
      if (SAME_ALLOWED.has(k)) continue;
      expect(CYR.test(e.ru), `${k}.ru should be Cyrillic`).toBe(true);
      expect(CYR.test(e['uz-cyrl']), `${k}.uz-cyrl should be Cyrillic`).toBe(true);
      expect(CYR.test(e.en), `${k}.en`).toBe(false);
      expect(CYR.test(e.uz), `${k}.uz`).toBe(false);
    }
  });

  it('every language uses the same {placeholders}', () => {
    for (const k of keys) {
      const e = STRINGS[k] as Record<string, string>;
      const want = placeholders(e.en);
      for (const l of LANGS) expect(placeholders(e[l]), `${k}.${l}`).toBe(want);
    }
  });

  it('translations are really translated (not copied English) except allowed ones', () => {
    for (const k of keys) {
      const e = STRINGS[k] as Record<string, string>;
      if (SAME_ALLOWED.has(k) || e.en.length <= 3) continue;
      expect(e.ru, `${k}.ru`).not.toBe(e.en);
      expect(e.uz, `${k}.uz`).not.toBe(e.en);
    }
  });

  it('t() and tf() fill placeholders in every language', () => {
    for (const l of LANGS) {
      const out = tf('playerN', l, { n: 3 });
      expect(out).toContain('3');
      expect(out).not.toContain('{');
    }
  });
});

describe('game content translations', () => {
  it('every card has a translation entry (Uzbek text + Russian title and text)', () => {
    for (const id of Object.keys(ALL_CARDS)) expect(CARD_TRANSLATION_IDS, id).toContain(id);
    for (const id of CARD_TRANSLATION_IDS) expect(ALL_CARDS[id], `orphan translation ${id}`).toBeDefined();
  });

  it('cards render in every language with the right script and no leftovers', () => {
    for (const card of Object.values(ALL_CARDS)) {
      for (const l of LANGS) {
        const title = cardTitle(card, l);
        const text = cardText(card, l);
        expect(title.length, `${card.id}.${l} title`).toBeGreaterThan(0);
        expect(text.length, `${card.id}.${l} text`).toBeGreaterThan(8);
        if (l === 'ru' || l === 'uz-cyrl') {
          expect(CYR.test(title), `${card.id}.${l} title script`).toBe(true);
          expect(CYR.test(text), `${card.id}.${l} text script`).toBe(true);
        }
        if (l === 'uz-cyrl') {
          // Only a few Latin tokens may remain (brand/abbreviation words)
          const latin = (text.match(/[A-Za-z]+/g) ?? []).filter((w) => !['OK', 'IT', 'IPO'].includes(w));
          expect(latin, `${card.id} uz-cyrl text has Latin: ${latin.join(',')}`).toEqual([]);
        }
        expect(text).not.toMatch(/\{|\\u/);
      }
    }
  });

  it('English card text is unchanged for English and differs elsewhere', () => {
    const c = ALL_CARDS['wedding-expenses'];
    expect(cardText(c, 'en')).toBe(c.text);
    expect(cardText(c, 'ru')).not.toBe(c.text);
    expect(cardText(c, 'uz')).not.toBe(c.text);
  });

  it('all 22 properties have Uzbek and Russian descriptions', () => {
    const ids = Object.keys(PROPERTIES);
    expect(ids).toHaveLength(22);
    for (const id of ids) {
      expect(PROPERTY_DESCRIPTION_IDS, id).toContain(id);
      for (const l of LANGS) expect(propertyDescription(id, PROPERTIES[id].description, l).length).toBeGreaterThan(8);
      expect(CYR.test(propertyDescription(id, '', 'ru'))).toBe(true);
    }
  });

  it('asset names localize in every language (Cyrillic for ru overrides and uz-cyrl)', () => {
    for (const def of [...Object.values(PROPERTIES), ...Object.values(INFRASTRUCTURE), ...Object.values(UTILITIES)]) {
      for (const l of LANGS) expect(localized(def, l).length, `${def.id}.${l}`).toBeGreaterThan(0);
      expect(CYR.test(localized(def, 'uz-cyrl')), `${def.id} uz-cyrl`).toBe(true);
    }
    expect(CYR.test(localized(INFRASTRUCTURE['tashkent-metro'], 'ru'))).toBe(true);
  });

  it('personalities, difficulties and development levels are all localized', () => {
    for (const [id, p] of Object.entries(PERSONALITIES)) {
      for (const l of LANGS) expect(personalityLabel(id as never, p.label, l).length).toBeGreaterThan(2);
      expect(CYR.test(personalityLabel(id as never, p.label, 'ru'))).toBe(true);
    }
    for (const [d, v] of Object.entries(DIFFICULTY_LABELS)) {
      expect(CYR.test(difficultyLabel(d as never, v.label, 'ru'))).toBe(true);
      expect(CYR.test(difficultyLabel(d as never, v.label, 'uz-cyrl'))).toBe(true);
    }
    for (let lvl = 0; lvl <= 5; lvl++) {
      expect(devLevelName(lvl, 'en')).not.toBe(devLevelName(lvl, 'ru'));
      expect(CYR.test(devLevelName(lvl, 'uz-cyrl'))).toBe(true);
    }
  });
});

describe('rules page', () => {
  const vars = ruleVars();
  it('has every section in all 4 languages with all numbers filled in', () => {
    for (const l of LANGS) {
      for (const s of RULE_SECTIONS) {
        for (const text of [ruleText(s.title, l, vars), ruleText(s.body, l, vars)]) {
          expect(text.length, `${s.id}.${l}`).toBeGreaterThan(3);
          expect(text, `${s.id}.${l} has an unfilled placeholder`).not.toMatch(/\{[A-Za-z]+\}/);
          expect(text).not.toMatch(/\\u/);
        }
      }
      expect(ruleText(RULES_INTRO, l, vars)).not.toMatch(/\{/);
    }
  });
  it('every language mentions the same placeholders per section', () => {
    for (const s of RULE_SECTIONS) {
      const want = placeholders(s.body.en);
      expect(placeholders(s.body.uz), `${s.id}.uz`).toBe(want);
      expect(placeholders(s.body.ru), `${s.id}.ru`).toBe(want);
    }
  });
  it('Uzbek Cyrillic and Russian rules are in Cyrillic; the live numbers come from the economy', () => {
    for (const s of RULE_SECTIONS) {
      expect(CYR.test(ruleText(s.body, 'ru', vars))).toBe(true);
      expect(CYR.test(ruleText(s.body, 'uz-cyrl', vars))).toBe(true);
    }
    const bribe = RULE_SECTIONS.find((s) => s.id === 'bribe')!;
    for (const l of LANGS) {
      const txt = ruleText(bribe.body, l, vars);
      expect(txt).toContain('40');
      expect(txt).toContain('35');
      expect(txt).toContain('25');
      expect(txt).toContain('300 000');
      expect(txt).toContain('2 500 000');
    }
  });
  it('covers every mechanic (no auction text, transport network and winning-order are present)', () => {
    const ids = RULE_SECTIONS.map((s) => s.id);
    for (const id of ['movement', 'buying', 'rent', 'development', 'trading', 'network', 'mortgage', 'loans', 'detention', 'cards', 'taxes', 'official', 'bribe', 'bankruptcy', 'winning']) {
      expect(ids).toContain(id);
    }
    const winning = RULE_SECTIONS.find((s) => s.id === 'winning')!;
    expect(winning.body.en).not.toMatch(/net worth/i); // ranking is by bankruptcy order
  });
});

describe('screens switch language', () => {
  const noop = () => undefined;
  it('Rules screen renders each language', () => {
    for (const [l, marker] of [['en', 'How to Play'], ['uz', "Qanday o'ynaladi"], ['ru', 'Как играть'], ['uz-cyrl', 'Қандай ўйналади']] as const) {
      const html = renderToStaticMarkup(<RulesScreen lang={l} onLanguageChange={noop} onBack={noop} />);
      expect(html.replace(/&#x27;/g, "'")).toContain(marker);
    }
  });
  it('New game screen renders each language, with bot personalities translated', () => {
    const html = (l: Language) => renderToStaticMarkup(<NewGameScreen lang={l} onLanguageChange={noop} settings={DEFAULT_SETTINGS} onStart={noop} onBack={noop} />);
    expect(html('ru')).toContain('Игроки');
    expect(html('ru')).toContain('Осторожный инвестор');
    expect(html('uz')).toContain("O&#x27;yinchilar");
    expect(html('uz-cyrl')).toContain('Ўйинчилар');
    expect(html('en')).toContain('Number of players');
  });
  it('Start screen shows the language switcher and a translated disclaimer', () => {
    const html = renderToStaticMarkup(<StartScreen lang="ru" onLanguageChange={noop} onNewGame={noop} onContinue={noop} onRules={noop} />);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Некоммерческий');
    expect(t('rules', 'ru').length).toBeGreaterThan(0);
  });
});

// --- Regression guard: no hardcoded English sneaks back into the UI ----------------
describe('no hardcoded English in components', () => {
  const dirs = ['src/components', 'src/pages'];
  // Words that are fine as literal text (brand, symbols, units).
  const ALLOWED_TEXT = new Set(['OK', 'EN']);
  function files() {
    return dirs.flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.tsx')).map((f) => join(d, f)));
  }
  it('JSX text nodes and user-facing attributes contain no English sentences', () => {
    const offenders: string[] = [];
    for (const f of files()) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        const trimmed = line.trim();
        if (/^(import|\/\/|\*|\/\*)/.test(trimmed)) return;
        for (const m of line.matchAll(/>([^<>{}=;]*[A-Za-z]{3,}[^<>{}=;]*)</g)) {
          const text = m[1].trim();
          // JS operators/generics like ">= 0 &&" or "Set<string>" are not text nodes
          if (/[&|!(]/.test(text) || /^\d/.test(text) || ALLOWED_TEXT.has(text)) continue;
          if (/^[A-Za-z]+$/.test(text) && text === text.toUpperCase()) continue; // DEVELOP, OK
          offenders.push(`${f}:${i + 1} text "${text}"`);
        }
        for (const m of line.matchAll(/\b(?:title|placeholder|aria-label|label)="([^"]*[A-Za-z]{3,}[^"]*)"/g)) {
          if (ALLOWED_TEXT.has(m[1]) || m[1] === 'Language') continue; // the switcher group label is language-neutral
          offenders.push(`${f}:${i + 1} attr "${m[1]}"`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
