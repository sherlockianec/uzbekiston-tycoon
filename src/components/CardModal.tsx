import { useActiveGame } from '../state/GameProvider';
import { t } from '../i18n/strings';
import { cardText, cardTitle } from '../i18n/content';

export default function CardModal({ actorId }: { actorId: string }) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const card = state.drawnCard;
  if (!card) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ background: 'none', border: 'none', boxShadow: 'none', padding: 0 }}>
        <div className="card-face">
          <div className="card-face__deck">{card.deck === 'mahalla' ? t('deckMahalla', lang) : t('deckBusiness', lang)}</div>
          <div className="card-face__title">{cardTitle(card, lang)}</div>
          <div className="card-face__text">{cardText(card, lang)}</div>
          <div className="modal__actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn--primary" onClick={() => dispatch({ type: 'ACK_CARD' }, actorId)}>
              {t('ok', lang)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
