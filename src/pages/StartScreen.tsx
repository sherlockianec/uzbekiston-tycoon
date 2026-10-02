import { useEffect, useState } from 'react';
import Emblem from '../components/Emblem';
import { getSaveStatus, deleteSavedGame } from '../game/persistence';
import LanguageSwitcher from '../components/LanguageSwitcher';
import type { Language } from '../game/types';
import type { SaveStatus } from '../game/persistence';
import { t } from '../i18n/strings';

export default function StartScreen({
  lang,
  onLanguageChange,
  onNewGame,
  onContinue,
  onRules,
}: {
  lang: Language;
  onLanguageChange: (l: Language) => void;
  onNewGame: () => void;
  onContinue: () => void;
  onRules: () => void;
}) {
  const [status, setStatus] = useState<SaveStatus>('none');
  useEffect(() => {
    setStatus(getSaveStatus());
  }, []);
  const hasSave = status === 'ok';

  return (
    <div className="center-screen">
      <div className="panel panel--gold-edge start-screen">
        <LanguageSwitcher lang={lang} onChange={onLanguageChange} />
        <Emblem className="start-screen__emblem" />
        <h1 className="start-screen__title">{t('appTitle', lang)}</h1>
        <p className="start-screen__subtitle">{t('appSubtitle', lang)}</p>
        <div className="start-screen__actions">
          {hasSave && (
            <button className="btn btn--primary btn--block" onClick={onContinue}>
              {t('continueGame', lang)}
            </button>
          )}
          <button className={`btn btn--block ${hasSave ? '' : 'btn--primary'}`} onClick={onNewGame}>
            {t('newGame', lang)}
          </button>
          <button className="btn btn--ghost btn--block" onClick={onRules}>
            {t('rules', lang)}
          </button>
          {hasSave && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                deleteSavedGame();
                setStatus('none');
              }}
            >
              {t('deleteSave', lang)}
            </button>
          )}
        </div>
        {(status === 'outdated' || status === 'corrupt') && (
          <p className="start-screen__footer" role="status">
            {t('saveOutdated', lang)}
          </p>
        )}
        <p className="start-screen__footer">{t('disclaimer', lang)}</p>
      </div>
    </div>
  );
}
