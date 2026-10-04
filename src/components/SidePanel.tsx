import { useEffect, useRef } from 'react';
import { useActiveGame } from '../state/GameProvider';
import { t } from '../i18n/strings';
import { translateLog } from '../i18n/logTranslate';
import { PlayerStrip } from './PlayerPanel';
import Icon from './icons/Icon';

interface Props {
  onOpenProperties: () => void;
  onOpenLog: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

/** Desktop sidebar: header buttons, every player's wealth, and the running game log. */
export default function SidePanel(p: Props) {
  const { state } = useActiveGame();
  const lang = state.settings.language;
  const logRef = useRef<HTMLUListElement | null>(null);
  const lines = state.log.slice(-40);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.log.length]);
  return (
    <aside className="side-panel" aria-label={t('gameLog', lang)}>
      <div className="side-panel__top">
        <span className="side-panel__round eyebrow">
          {t('round', lang)} {state.turnNumber}
        </span>
        <span className="spacer" />
        <button className="chip-btn" onClick={p.onOpenProperties}>
          {t('properties', lang)}
        </button>
        <button className="chip-btn chip-btn--icon" onClick={p.onOpenSettings} title={t('settings', lang)} aria-label={t('settings', lang)}>
          <Icon name="settings" />
        </button>
        <button className="chip-btn chip-btn--icon" onClick={p.onQuit} title={t('quitToMenu', lang)} aria-label={t('quitToMenu', lang)}>
          <Icon name="close" />
        </button>
      </div>
      <PlayerStrip state={state} />
      <div className="side-panel__log-head">
        <h3>{t('gameLog', lang)}</h3>
        <button className="chip-btn" onClick={p.onOpenLog}>
          {t('logButton', lang)}
        </button>
      </div>
      <ul className="side-panel__log" ref={logRef} aria-label={t('gameLog', lang)} aria-live="off">
        {lines.map((e) => (
          <li key={e.id}>{translateLog(e.text, lang)}</li>
        ))}
      </ul>
    </aside>
  );
}
