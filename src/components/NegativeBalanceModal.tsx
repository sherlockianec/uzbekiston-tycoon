import { useState } from 'react';
import { useActiveGame } from '../state/GameProvider';
import { canMortgage, canSellDevelopment, liquidValue, ownableDef, refundForCurrentLevel, shouldWarnBeforeBankruptcy } from '../game/engine';
import { isPropertyId, PROPERTIES } from '../game/data/properties';
import { formatSom } from '../utils/currency';
import { t, localized } from '../i18n/strings';

/** Shown while the current player's balance is below zero. Rent, taxes and loans are always
 * paid in full, so the only way forward is to raise money (sell, mortgage, loan, trade) until the
 * balance is 0 or more, or to declare bankruptcy. It can be set aside to use the Bank / Trade. */
export default function NegativeBalanceModal({
  actorId,
  onSetAside,
  onOpenBank,
  onOpenTrade,
}: {
  actorId: string;
  onSetAside: () => void;
  onOpenBank: () => void;
  onOpenTrade: () => void;
}) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const [confirming, setConfirming] = useState(false);
  const me = state.players.find((p) => p.id === actorId)!;
  if (me.cash >= 0) return null;

  const sellable = Object.entries(state.ownership).filter(([id]) => isPropertyId(id) && canSellDevelopment(state, actorId, id));
  const mortgageable = Object.entries(state.ownership).filter(([id]) => canMortgage(state, actorId, id));
  const netWorth = liquidValue(state, actorId);

  function declare() {
    if (shouldWarnBeforeBankruptcy(state, actorId)) setConfirming(true);
    else dispatch({ type: 'DECLARE_BANKRUPTCY' }, actorId);
  }

  if (confirming) {
    return (
      <div className="modal-overlay">
        <div className="panel panel--gold-edge modal">
          <h2>{t('declareBankruptcy', lang)}?</h2>
          <p className="text-sm text-muted">{t('bankruptWarning', lang)}</p>
          <p className="text-sm">{t('bankruptcyConfirm', lang)}</p>
          <div className="modal__row">
            <span>{t('netWorth', lang)}</span>
            <span className="money money--positive">{formatSom(netWorth)}</span>
          </div>
          <div className="modal__actions">
            <button className="btn" onClick={() => setConfirming(false)}>
              {t('keepTrying', lang)}
            </button>
            <button className="btn btn--danger" onClick={() => dispatch({ type: 'DECLARE_BANKRUPTCY' }, actorId)}>
              {t('confirmBankruptcy', lang)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="panel panel--gold-edge modal modal--wide">
        <h2>{t('negativeBalance', lang)}</h2>
        <div className="modal__row">
          <span>{t('balanceNow', lang)}</span>
          <span className="money money--negative">{formatSom(me.cash)}</span>
        </div>
        <div className="modal__row">
          <span>{t('toReachZero', lang)}</span>
          <span className="money">{formatSom(-me.cash)}</span>
        </div>
        <p className="text-sm text-muted">{t('raiseCash', lang)}</p>

        {sellable.length > 0 && (
          <>
            <h4 className="modal__h4">{t('sellDevLevels', lang)}</h4>
            <div className="trade-list">
              {sellable.map(([id, o]) => (
                <div key={id} className="trade-item" onClick={() => dispatch({ type: 'SELL_DEVELOPMENT', spaceId: id }, actorId)}>
                  <span style={{ flex: 1 }}>
                    {localized(PROPERTIES[id], lang)} ({t('levelLabel', lang).toLowerCase()} {o.level})
                  </span>
                  <span className="money">+{formatSom(refundForCurrentLevel(PROPERTIES[id], o.level))}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {mortgageable.length > 0 && (
          <>
            <h4 className="modal__h4">{t('mortgageProps', lang)}</h4>
            <div className="trade-list">
              {mortgageable.map(([id]) => (
                <div key={id} className="trade-item" onClick={() => dispatch({ type: 'MORTGAGE', spaceId: id }, actorId)}>
                  <span style={{ flex: 1 }}>{localized(ownableDef(id), lang)}</span>
                  <span className="money">+{formatSom(ownableDef(id).mortgageValue)}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {sellable.length === 0 && mortgageable.length === 0 && <p className="text-sm text-muted">{t('nothingToLiquidate', lang)}</p>}

        <div className="modal__actions modal__actions--wrap">
          <button className="btn" onClick={onOpenBank}>
            {t('bank', lang)}
          </button>
          <button className="btn btn--gold" onClick={onOpenTrade}>
            {t('trade', lang)}
          </button>
          <button className="btn btn--primary" onClick={onSetAside}>
            {t('raiseMoney', lang)}
          </button>
          <button className="btn btn--danger" onClick={declare}>
            {t('declareBankruptcy', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
