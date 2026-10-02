import { BOARD } from '../game/data/board';
import { INFRASTRUCTURE } from '../game/data/properties';
import { formatSom } from '../utils/currency';
import { t, localized } from '../i18n/strings';
import { useActiveGame } from '../state/GameProvider';

export default function NetworkTravelModal({ actorId, onClose }: { actorId: string; onClose: () => void }) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const player = state.players.find((p) => p.id === actorId)!;
  const here = BOARD[player.position];

  const destinations = Object.keys(INFRASTRUCTURE).filter((id) => id !== here.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel panel--gold-edge modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('travelNetwork', lang)}</h2>
        <p className="modal__sub">{t('chooseDestination', lang)}</p>
        <div className="trade-list">
          {destinations.map((id) => {
            const def = INFRASTRUCTURE[id];
            const ownership = state.ownership[id];
            const owner = ownership.ownerId ? state.players.find((p) => p.id === ownership.ownerId) : null;
            return (
              <div
                key={id}
                className="trade-item"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  dispatch({ type: 'TRAVEL_NETWORK', targetSpaceId: id }, actorId);
                  onClose();
                }}
              >
                <span style={{ flex: 1 }}>{localized(def, lang)}</span>
                {owner ? (
                  <span className="text-sm" style={{ color: owner.tokenColor, fontWeight: 700 }}>
                    {owner.name}
                  </span>
                ) : (
                  <span className="money">{formatSom(def.price)}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="modal__actions">
          <button className="btn" onClick={onClose}>
            {t('cancel', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
