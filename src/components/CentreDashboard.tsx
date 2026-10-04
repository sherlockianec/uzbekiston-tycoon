import type React from 'react';
import { formatSom } from '../utils/currency';
import { TOKEN_ICONS } from '../utils/tokenIcons';
import { useActiveGame } from '../state/GameProvider';
import { t } from '../i18n/strings';
import { PlayerStrip } from './PlayerPanel';
import ActionBar from './ActionBar';
import Emblem from './Emblem';
import Icon from './icons/Icon';
import { translateLog } from '../i18n/logTranslate';

interface Props {
  onOpenTrade: () => void;
  onOpenBuild: () => void;
  onOpenBank: () => void;
  onOpenNetworkTravel: () => void;
  onOpenBribe: () => void;
  onOpenDebt: () => void;
  onOpenProperties: () => void;
  onOpenLog: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
  /** Phones show the action bar under the board instead of in the middle of it. */
  showActions: boolean;
  /** Desktop: players, log and the header buttons live in the sidebar beside the board, not in the middle of it. */
  sidebar?: boolean;
}

/** Everything that used to sit around the board now lives in the middle of it. */
export default function CentreDashboard(p: Props) {
  const { state } = useActiveGame();
  const lang = state.settings.language;
  const cur = state.players[state.currentPlayerIndex];
  const lastLines = state.log.slice(-3).slice().reverse();
  return (
    <div className="centre">
      <div className="centre__top">
        <Emblem className="centre__emblem" />
        <span className="centre__title">{t('appTitle', lang)}</span>
        <span className="centre__round eyebrow">
          {t('round', lang)} {state.turnNumber}
        </span>
        <span className="spacer" />
        {!p.sidebar && (<>
        <button className="chip-btn" onClick={p.onOpenProperties}>
          {t('properties', lang)}
        </button>
        <button className="chip-btn" onClick={p.onOpenLog}>
          {t('logButton', lang)}
        </button>
        <button className="chip-btn chip-btn--icon" onClick={p.onOpenSettings} title={t('settings', lang)} aria-label={t('settings', lang)}>
          <Icon name="settings" />
        </button>
        <button className="chip-btn chip-btn--icon" onClick={p.onQuit} title={t('quitToMenu', lang)} aria-label={t('quitToMenu', lang)}>
          <Icon name="close" />
        </button>
        </>)}
      </div>
      {!p.sidebar && <PlayerStrip state={state} />}
      {p.sidebar && cur && (
        <div className="centre__turn" style={{ '--player-color': cur.tokenColor } as React.CSSProperties}>
          <span className="centre__turn-token" style={{ background: cur.tokenColor }}>{TOKEN_ICONS[cur.tokenShape]}</span>
          <span className="centre__turn-name">{cur.name}</span>
          <span className={`centre__turn-cash money${cur.cash < 0 ? ' money--negative' : ''}`}>{formatSom(cur.cash)}</span>
        </div>
      )}
      {p.showActions && (
        <ActionBar
          variant="centre"
          onOpenTrade={p.onOpenTrade}
          onOpenBuild={p.onOpenBuild}
          onOpenBank={p.onOpenBank}
          onOpenNetworkTravel={p.onOpenNetworkTravel}
          onOpenBribe={p.onOpenBribe}
          onOpenDebt={p.onOpenDebt}
        />
      )}
      {!p.sidebar && (
        <ul className="centre__log" aria-label={t('gameLog', lang)}>
          {lastLines.map((e, i) => (
            <li key={e.id} style={{ opacity: 1 - i * 0.25 }}>
              {translateLog(e.text, lang)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
