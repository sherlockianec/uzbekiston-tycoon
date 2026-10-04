import { useActiveGame } from '../state/GameProvider';
import { t } from '../i18n/strings';
import { translateLog } from '../i18n/logTranslate';

export default function GameLog() {
  const { state } = useActiveGame();
  const lang = state.settings.language;
  const entries = state.log.slice(-60).slice().reverse();

  return (
    <div className="panel game-log">
      <h3>{t('gameLog', lang)}</h3>
      <ul className="game-log__list">
        {entries.map((e) => (
          <li key={e.id}>{translateLog(e.text, lang)}</li>
        ))}
      </ul>
    </div>
  );
}
