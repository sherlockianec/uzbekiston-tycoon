import type { Language } from '../game/types';

/** Each language is labelled in its own script so anyone can find theirs. */
export const LANGUAGE_OPTIONS: { id: Language; label: string; full: string; htmlLang: string }[] = [
  { id: 'en', label: 'EN', full: 'English', htmlLang: 'en' },
  { id: 'uz', label: "O'ZB", full: "O'zbekcha", htmlLang: 'uz' },
  { id: 'ru', label: '\u0420\u0423\u0421', full: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', htmlLang: 'ru' },
  { id: 'uz-cyrl', label: '\u040e\u0417\u0411', full: '\u040e\u0437\u0431\u0435\u043a\u0447\u0430', htmlLang: 'uz-Cyrl' },
];

export function htmlLangFor(lang: Language): string {
  return LANGUAGE_OPTIONS.find((o) => o.id === lang)?.htmlLang ?? 'en';
}

export default function LanguageSwitcher({ lang, onChange }: { lang: Language; onChange: (l: Language) => void }) {
  return (
    <div className="lang-switcher" role="group" aria-label="Language">
      {LANGUAGE_OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`btn btn--sm ${o.id === lang ? 'btn--primary' : 'btn--ghost'}`}
          aria-pressed={o.id === lang}
          title={o.full}
          lang={o.htmlLang}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
