import type React from 'react';
import { GROUPS, PROPERTIES, isPropertyId } from '../game/data/properties';
import { canDevelop, costToReachNextLevel } from '../game/engine';
import { t, localized } from '../i18n/strings';
import { useActiveGame } from '../state/GameProvider';
import CostButton from './CostButton';
import Icon from './icons/Icon';
import { groupIconName } from './icons/iconFor';

export default function BuildModal({ actorId, onClose }: { actorId: string; onClose: () => void }) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const cash = state.players.find((p) => p.id === actorId)?.cash ?? 0;

  // Everything the rules allow, regardless of cash - unaffordable ones are shown red with the shortfall.
  const developable = Object.keys(state.ownership)
    .filter((id) => isPropertyId(id) && canDevelop(state, actorId, id, true))
    .map((id) => ({ id, def: PROPERTIES[id], group: GROUPS.find((g) => g.id === PROPERTIES[id].groupId)! }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel panel--gold-edge modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('build', lang)}</h2>
        {developable.length === 0 ? (
          <p className="text-sm text-muted">{t('nothingToBuild', lang)}</p>
        ) : (
          <div className="trade-list" style={{ maxHeight: 320 }}>
            {developable.map(({ id, def, group }) => {
              const level = state.ownership[id].level;
              return (
                <div key={id} className="trade-item">
                  <span className="group-dot" style={{ '--badge-color': group.color } as React.CSSProperties}>
                    {groupIconName(group.id) && <Icon name={groupIconName(group.id)!} />}
                  </span>
                  <span style={{ flex: 1 }}>
                    {localized(def, lang)}{' '}
                    <span className="text-muted">
                      ({localized(group, lang)}, {t('levelLabel', lang)} {level} {'\u2192'} {level + 1})
                    </span>
                  </span>
                  <CostButton
                    size="sm"
                    label={t('develop', lang)}
                    cost={costToReachNextLevel(def, level)}
                    cash={cash}
                    lang={lang}
                    onClick={() => dispatch({ type: 'DEVELOP', spaceId: id }, actorId)}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onClose}>
            {t('close', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
