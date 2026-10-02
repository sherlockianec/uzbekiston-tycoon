import { useState } from 'react';
import { t, tf } from '../i18n/strings';
import { difficultyLabel, personalityDescription, personalityLabel } from '../i18n/content';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { PERSONALITIES, DIFFICULTY_LABELS, pickAiName } from '../game/ai/personalities';
import type { Difficulty, Language, NewGameConfig, PersonalityId, Settings } from '../game/types';

const PERSONALITY_IDS: PersonalityId[] = ['conservative', 'aggressive', 'developer', 'banker', 'chaotic'];
const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
const AI_PRESETS: PersonalityId[] = ['conservative', 'aggressive', 'developer'];

interface SlotConfig {
  isAI: boolean;
  name: string;
  personality: PersonalityId;
  difficulty: Difficulty;
}

function defaultSlot(index: number): SlotConfig {
  return {
    isAI: index > 0,
    name: '',
    personality: AI_PRESETS[(index - 1 + AI_PRESETS.length) % AI_PRESETS.length],
    difficulty: 'normal',
  };
}

export default function NewGameScreen({
  lang,
  onLanguageChange,
  settings,
  onStart,
  onBack,
}: {
  lang: Language;
  onLanguageChange: (l: Language) => void;
  settings: Settings;
  onStart: (config: NewGameConfig) => void;
  onBack: () => void;
}) {
  const [totalPlayers, setTotalPlayers] = useState(4);
  const [slots, setSlots] = useState<SlotConfig[]>(() => [0, 1, 2, 3].map(defaultSlot));

  function updateSlot(index: number, patch: Partial<SlotConfig>) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  const activeSlots = slots.slice(0, totalPlayers);
  const humanCount = activeSlots.filter((s) => !s.isAI).length;
  const canStart = humanCount >= 1;

  function start() {
    const takenAiNames: string[] = [];
    const players = activeSlots.map((s, i) => {
      if (!s.isAI) {
        return { name: s.name.trim() || tf('playerN', lang, { n: i + 1 }), isAI: false as const };
      }
      const name = s.name.trim() || pickAiName(i, takenAiNames);
      takenAiNames.push(name);
      return { name, isAI: true as const, personality: s.personality, difficulty: s.difficulty };
    });
    onStart({
      players,
      settings: { ...settings, language: lang },
    });
  }

  return (
    <div className="center-screen">
      <div className="panel panel--gold-edge setup-screen scroll-y">
        <LanguageSwitcher lang={lang} onChange={onLanguageChange} />
        <h1>{t('newGame', lang)}</h1>
        <p className="text-sm text-muted">
          {t('setupIntro', lang)}
        </p>

        <div className="field">
          <label>{t('numberOfPlayers', lang)}</label>
          <div className="count-selector">
            {[2, 3, 4].map((n) => (
              <button key={n} className={`btn ${totalPlayers === n ? 'btn--primary' : ''}`} onClick={() => setTotalPlayers(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <h2>{t('playersHeading', lang)}</h2>
        {activeSlots.map((slot, i) => (
          <div key={i} className="opponent-row">
            <input
              type="text"
              value={slot.name}
              placeholder={slot.isAI ? t('aiNameOptional', lang) : tf('playerN', lang, { n: i + 1 })}
              onChange={(e) => updateSlot(i, { name: e.target.value })}
              maxLength={20}
            />
            <select value={slot.isAI ? 'ai' : 'human'} onChange={(e) => updateSlot(i, { isAI: e.target.value === 'ai' })}>
              <option value="human">{t('humanPlayer', lang)}</option>
              <option value="ai">{t('aiOpponent', lang)}</option>
            </select>
            {slot.isAI && (
              <select
                value={slot.personality}
                onChange={(e) => updateSlot(i, { personality: e.target.value as PersonalityId })}
              >
                {PERSONALITY_IDS.map((id) => (
                  <option key={id} value={id}>
                    {personalityLabel(id, PERSONALITIES[id].label, lang)}
                  </option>
                ))}
              </select>
            )}
            {slot.isAI && (
              <select value={slot.difficulty} onChange={(e) => updateSlot(i, { difficulty: e.target.value as Difficulty })}>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {difficultyLabel(d, DIFFICULTY_LABELS[d].label, lang)}
                  </option>
                ))}
              </select>
            )}
            {slot.isAI && <p className="personality-note">{personalityDescription(slot.personality, PERSONALITIES[slot.personality].description, lang)}</p>}
          </div>
        ))}

        {!canStart && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {t('needHuman', lang)}
          </p>
        )}

        <div className="setup-screen__actions">
          <button className="btn" onClick={onBack}>
            {t('back', lang)}
          </button>
          <button className="btn btn--primary" disabled={!canStart} onClick={start}>
            {t('startGame', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
