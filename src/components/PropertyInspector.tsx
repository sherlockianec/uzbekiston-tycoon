import {
  PROPERTIES,
  INFRASTRUCTURE,
  UTILITIES,
  GROUPS,
  isPropertyId,
  isInfrastructureId,
  isUtilityId,
} from '../game/data/properties';
import { DEVELOPMENT_LEVEL_ICONS } from '../game/data/economy';
import { devLevelName, propertyDescription } from '../i18n/content';
import {
  canDevelop,
  canSellDevelopment,
  canMortgage,
  canUnmortgage,
  computeRent,
  ownsFullGroup,
  playersOwning,
  isMortgageUrgent,
  mortgageLapsLeft,
  costToReachNextLevel,
  priceAfterDiscount,
} from '../game/engine';
import { formatSom } from '../utils/currency';
import { t, tf, localized } from '../i18n/strings';
import { useActiveGame } from '../state/GameProvider';
import CostButton from './CostButton';

const ICON_LOCK = '\ud83d\udd12';

interface Props {
  spaceId: string;
  actorId: string;
  onClose: () => void;
  forceDecision?: boolean;
}

export default function PropertyInspector({ spaceId, actorId, onClose, forceDecision }: Props) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const actorCash = state.players.find((p) => p.id === actorId)?.cash ?? 0;

  const isProperty = isPropertyId(spaceId);
  const isInfra = isInfrastructureId(spaceId);
  const isUtility = isUtilityId(spaceId);
  const def = isProperty ? PROPERTIES[spaceId] : isInfra ? INFRASTRUCTURE[spaceId] : UTILITIES[spaceId];
  const group = isProperty ? GROUPS.find((g) => g.id === PROPERTIES[spaceId].groupId) : null;
  const ownership = state.ownership[spaceId];
  const owner = ownership.ownerId ? state.players.find((p) => p.id === ownership.ownerId) : null;
  const isMine = ownership.ownerId === actorId;

  // A single, prominent "what would I pay right now" figure. Utilities can't
  // show one fixed number since their rent depends on the dice roll at the
  // moment you land, so we show the multiplier instead.
  let currentRentDisplay: string;
  if (!owner) {
    currentRentDisplay = t('unowned', lang);
  } else if (ownership.mortgaged) {
    currentRentDisplay = `${formatSom(0)} (${t('mortgaged', lang).toLowerCase()})`;
  } else if (isUtility) {
    const ownedCount = playersOwning(state, ownership.ownerId!, Object.keys(UTILITIES)).length;
    currentRentDisplay = tf('diceMultiple', lang, { n: ownedCount >= 2 ? 10 : 4 });
  } else {
    currentRentDisplay = formatSom(computeRent(state, spaceId, 7));
  }

  const fullSetOwned = isProperty && owner ? ownsFullGroup(state, ownership.ownerId!, PROPERTIES[spaceId].groupId) : false;

  return (
    <div className="modal-overlay" onClick={forceDecision ? undefined : onClose}>
      <div className="panel panel--gold-edge modal" onClick={(e) => e.stopPropagation()}>
        {group && <div className="property-color-bar" style={{ background: group.color }} />}
        <h2>{localized(def, lang)}</h2>
        <div className="modal__sub">
          {group ? localized(group, lang) : isInfra ? t('infrastructureLabel', lang) : t('utilityLabel', lang)}
        </div>

        {isProperty && (
          <p className="text-sm text-muted">{propertyDescription(spaceId, PROPERTIES[spaceId].description, lang)}</p>
        )}

        <div className="modal__row">
          <span>{t('owner', lang)}</span>
          <span style={{ fontWeight: 700, color: owner?.tokenColor }}>{owner ? owner.name : t('unowned', lang)}</span>
        </div>
        <div className="modal__row">
          <span>{t('currentRent', lang)}</span>
          <span className="money">{currentRentDisplay}</span>
        </div>
        {isProperty && fullSetOwned && ownership.level === 0 && (
          <div className="modal__row">
            <span className="text-sm text-muted">{t('fullGroupDoubled', lang)}</span>
            <span />
          </div>
        )}
        <div className="modal__row">
          <span>{t('price', lang)}</span>
          <span className="money">{formatSom(def.price)}</span>
        </div>
        {ownership.mortgaged && (
          <div className="modal__row">
            <span>{t('mortgaged', lang)}</span>
            <span className={isMortgageUrgent(state, spaceId) ? 'lap-warn' : ''}>
              {ICON_LOCK} {mortgageLapsLeft(state, spaceId) ?? '?'} {t('lapsToRedeem', lang)}
            </span>
          </div>
        )}
        {ownership.mortgaged && (
          <div className="modal__row">
            <span>{t('unmortgage', lang)}</span>
            <span className="money">{formatSom(def.unmortgageCost)}</span>
          </div>
        )}
        {isProperty && (
          <div className="modal__row">
            <span>{t('levelLabel', lang)}</span>
            <span>
              {DEVELOPMENT_LEVEL_ICONS[ownership.level]} {devLevelName(ownership.level, lang)}
            </span>
          </div>
        )}

        {isProperty && (
          <>
            <div className="modal__row">
              <span>{t('developmentCost', lang)}</span>
              <span className="money">{formatSom(PROPERTIES[spaceId].developmentCost)}</span>
            </div>
            <div className="modal__row">
              <span>{t('finalUpgradeCost', lang)}</span>
              <span className="money">{formatSom(PROPERTIES[spaceId].developmentCostLevel5)}</span>
            </div>
            <table style={{ width: '100%', fontSize: 11, color: 'var(--text-muted)', borderCollapse: 'collapse', marginTop: 10 }}>
              <tbody>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i}>
                    <td style={{ padding: '2px 0' }}>
                      {i === 0 ? t('rentBase', lang) : i === 1 ? t('rentFullSet', lang) : tf('rentLevelN', lang, { n: i - 1 })}
                    </td>
                    <td style={{ textAlign: 'right' }} className="money">
                      {formatSom(PROPERTIES[spaceId].rentTable[i])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {!isProperty && (
          <div className="modal__row">
            <span>{t('mortgageValue', lang)}</span>
            <span className="money">{formatSom(def.mortgageValue)}</span>
          </div>
        )}

        {forceDecision && <p className="text-sm text-muted">{t('buyLaterHint', lang)}</p>}
        <div className="modal__actions">
          {forceDecision ? (
            <>
              <button className="btn" onClick={() => dispatch({ type: 'DECLINE_PURCHASE' }, actorId)}>
                {t('notNow', lang)}
              </button>
              <CostButton
                label={t('buy', lang)}
                cost={priceAfterDiscount(state, actorId, spaceId)}
                cash={actorCash}
                lang={lang}
                onClick={() => dispatch({ type: 'BUY_PROPERTY' }, actorId)}
              />
            </>
          ) : (
            <>
              {isMine && isProperty && canDevelop(state, actorId, spaceId, true) && (
                <CostButton
                  size="sm"
                  label={t('develop', lang)}
                  cost={costToReachNextLevel(PROPERTIES[spaceId], ownership.level)}
                  cash={actorCash}
                  lang={lang}
                  onClick={() => dispatch({ type: 'DEVELOP', spaceId }, actorId)}
                />
              )}
              {isMine && isProperty && canSellDevelopment(state, actorId, spaceId) && (
                <button className="btn btn--sm" onClick={() => dispatch({ type: 'SELL_DEVELOPMENT', spaceId }, actorId)}>
                  {t('sellDevelopment', lang)}
                </button>
              )}
              {isMine && canMortgage(state, actorId, spaceId) && (
                <button className="btn btn--sm" onClick={() => dispatch({ type: 'MORTGAGE', spaceId }, actorId)}>
                  {t('mortgage', lang)}
                </button>
              )}
              {isMine && canUnmortgage(state, actorId, spaceId, true) && (
                <CostButton
                  size="sm"
                  label={t('unmortgage', lang)}
                  cost={def.unmortgageCost}
                  cash={actorCash}
                  lang={lang}
                  onClick={() => dispatch({ type: 'UNMORTGAGE', spaceId }, actorId)}
                />
              )}
              <button className="btn" onClick={onClose}>
                {t('close', lang)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
