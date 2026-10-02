import { useActiveGame } from '../state/GameProvider';
import {
  BRIBE_GAMBLE_GAIN_MIN,
  BRIBE_GAMBLE_GAIN_MAX,
  BRIBE_GAMBLE_GAIN_CHANCE,
  BRIBE_GAMBLE_JAIL_CHANCE,
  BRIBE_GAMBLE_LOSS_MIN,
  BRIBE_GAMBLE_LOSS_MAX,
  BRIBE_GAMBLE_LOSS_CHANCE,
} from '../game/data/economy';
import { formatSom } from '../utils/currency';
import { t } from '../i18n/strings';

const ICON_GAIN = '\ud83d\ude0e';
const ICON_LOSS = '\ud83d\ude2c';
const ICON_JAIL = '\ud83d\udea8';

export default function BribeModal({ actorId, onClose }: { actorId: string; onClose: () => void }) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const result = state.bribeResult;

  if (result) {
    const icon = result.outcome === 'gain' ? ICON_GAIN : result.outcome === 'loss' ? ICON_LOSS : ICON_JAIL;
    const headline =
      result.outcome === 'gain' ? t('bribeResultGain', lang) : result.outcome === 'loss' ? t('bribeResultLoss', lang) : t('bribeResultJail', lang);
    return (
      <div className="modal-overlay">
        <div className="panel panel--gold-edge modal" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{icon}</div>
          <h2>{headline}</h2>
          {result.amount > 0 && (
            <p className={`money ${result.outcome === 'gain' ? 'money--positive' : 'money--negative'}`} style={{ fontSize: 20 }}>
              {result.outcome === 'gain' ? '+' : '\u2212'}
              {formatSom(result.amount)}
            </p>
          )}
          <div className="modal__actions" style={{ justifyContent: 'center' }}>
            <button
              className="btn btn--primary"
              onClick={() => {
                dispatch({ type: 'DISMISS_BRIBE_RESULT' }, actorId);
                onClose();
              }}
            >
              {t('ok', lang)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel panel--gold-edge modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('bribeTitle', lang)}</h2>
        <p className="modal__sub">{t('bribeExplain', lang)}</p>
        <div className="modal__row">
          <span>
            {Math.round(BRIBE_GAMBLE_GAIN_CHANCE * 100)}% {t('bribeGain', lang)}
          </span>
          <span className="money money--positive">+{formatSom(BRIBE_GAMBLE_GAIN_MIN)} {'\u2013'} {formatSom(BRIBE_GAMBLE_GAIN_MAX)}</span>
        </div>
        <div className="modal__row">
          <span>
            {Math.round(BRIBE_GAMBLE_LOSS_CHANCE * 100)}% {t('bribeLoss', lang)}
          </span>
          <span className="money money--negative">{'\u2212'}{formatSom(BRIBE_GAMBLE_LOSS_MIN)} {'\u2013'} {formatSom(BRIBE_GAMBLE_LOSS_MAX)}</span>
        </div>
        <div className="modal__row">
          <span>
            {Math.round(BRIBE_GAMBLE_JAIL_CHANCE * 100)}% {t('bribeJail', lang)}
          </span>
          <span>{ICON_JAIL}</span>
        </div>
        <div className="modal__actions">
          <button className="btn" onClick={onClose}>
            {t('walkAway', lang)}
          </button>
          <button className="btn btn--risk" onClick={() => dispatch({ type: 'ATTEMPT_BRIBE' }, actorId)}>
            {t('tryBribe', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
