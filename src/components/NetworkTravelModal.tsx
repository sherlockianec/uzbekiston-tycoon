import type React from 'react';
import { BOARD } from '../game/data/board';
import { INFRASTRUCTURE } from '../game/data/properties';
import { formatSom } from '../utils/currency';
import { GO_SALARY } from '../game/data/economy';
import { t, tf, localized } from '../i18n/strings';
import { useActiveGame } from '../state/GameProvider';
import Icon from './icons/Icon';
import { assetIconName } from './icons/iconFor';

export default function NetworkTravelModal({ actorId, onClose }: { actorId: string; onClose: () => void }) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const player = state.players.find((p) => p.id === actorId)!;
  const here = BOARD[player.position];

  const destinations = Object.keys(INFRASTRUCTURE).filter((id) => id !== here.id && !!state.ownership[id]?.ownerId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel panel--gold-edge modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('travelNetwork', lang)}</h2>
        <p className="modal__sub">
          {t('chooseDestination', lang)} {'\u00b7'} {t('forwardOnly', lang)}
        </p>
        <div className="trade-list">
          {destinations.length === 0 && <p className="text-sm">{t('noOwnedStations', lang)}</p>}
          {destinations.map((id) => {
            const def = INFRASTRUCTURE[id];
            const ownership = state.ownership[id];
            const owner = ownership.ownerId ? state.players.find((p) => p.id === ownership.ownerId) : null;
            // Travel always goes forward, so a destination 'behind' you means a lap past START.
            const crossesStart = BOARD.findIndex((b) => b.id === id) < player.position;
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
                {assetIconName(id) && (
                  <span className="group-dot" style={{ '--badge-color': '#6b7c99' } as React.CSSProperties}>
                    <Icon name={assetIconName(id)!} />
                  </span>
                )}
                <span style={{ flex: 1 }}>
                  {localized(def, lang)}
                  {crossesStart && (
                    <span className="text-sm money money--positive" style={{ display: 'block' }}>
                      {tf('crossesStart', lang, { amount: formatSom(GO_SALARY) })}
                    </span>
                  )}
                </span>
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
