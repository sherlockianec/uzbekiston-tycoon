import { useActiveGame } from '../state/GameProvider';
import { t } from '../i18n/strings';
import { PlayerStrip } from './PlayerPanel';
import ActionBar from './ActionBar';
import Emblem from './Emblem';
import Icon from './icons/Icon';

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
}

/** Everything that used to sit around the board now lives in the middle of it. */
export default function CentreDashboard(p: Props) {
  const { state } = useActiveGame();
  const lang = state.settings.language;
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
      </div>
      <PlayerStrip state={state} />
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
      <ul className="centre__log" aria-label={t('gameLog', lang)}>
        {lastLines.map((e, i) => (
          <li key={e.id} style={{ opacity: 1 - i * 0.25 }}>
            {e.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
