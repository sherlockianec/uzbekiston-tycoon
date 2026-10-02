import { useState } from 'react';
import { useActiveGame } from '../state/GameProvider';
import { canMortgage, canSellDevelopment, liquidValue, ownableDef, refundForCurrentLevel, shouldWarnBeforeBankruptcy } from '../game/engine';
import { isPropertyId, PROPERTIES } from '../game/data/properties';
import { formatSom } from '../utils/currency';
import { t, localized } from '../i18n/strings';

export default function LiquidationModal({ actorId }: { actorId: string }) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const debt = state.pendingDebt;
  const [confirmingBankruptcy, setConfirmingBankruptcy] = useState(false);
  if (!debt) return null;
  const human = state.players.find((p) => p.id === actorId)!;

  const sellable = Object.entries(state.ownership).filter(
    ([id]) => isPropertyId(id) && canSellDevelopment(state, actorId, id)
  );
  const mortgageable = Object.entries(state.ownership).filter(([id]) => canMortgage(state, actorId, id));
  const shortBy = Math.max(0, debt.amount - human.cash);
  const netWorth = liquidValue(state, actorId);

  function handleDeclareClick() {
    if (shouldWarnBeforeBankruptcy(state, actorId)) {
      setConfirmingBankruptcy(true);
    } else {
      dispatch({ type: 'DECLARE_BANKRUPTCY' }, actorId);
    }
  }

  if (confirmingBankruptcy) {
    return (
      <div className="modal-overlay">
        <div className="panel panel--gold-edge modal">
          <h2>{t('declareBankruptcy', lang)}?</h2>
          <p className="text-sm text-muted">{t('bankruptWarning', lang)}</p>
          <div className="modal__row">
            <span>{t('netWorth', lang)}</span>
            <span className="money money--positive">{formatSom(netWorth)}</span>
          </div>
          <div className="modal__actions">
            <button className="btn" onClick={() => setConfirmingBankruptcy(false)}>
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
        <h2>
          {t('youOwe', lang)} {formatSom(debt.amount)}
        </h2>
        <div className="modal__sub">
          {debt.reason} {'\u00b7'} you have {formatSom(human.cash)}
          {shortBy > 0 ? ` \u00b7 short by ${formatSom(shortBy)}` : ''}
        </div>
        <p className="text-sm text-muted">{t('raiseCash', lang)}</p>

        {sellable.length > 0 && (
          <>
            <h4 style={{ fontSize: 12, color: 'var(--text-muted)', margin: '14px 0 6px' }}>{t('sellDevLevels', lang)}</h4>
            <div className="trade-list">
              {sellable.map(([id, o]) => (
                <div
                  key={id}
                  className="trade-item"
                  onClick={() => dispatch({ type: 'LIQUIDATE_SELL_DEVELOPMENT', spaceId: id }, actorId)}
                >
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
            <h4 style={{ fontSize: 12, color: 'var(--text-muted)', margin: '14px 0 6px' }}>{t('mortgageProps', lang)}</h4>
            <div className="trade-list">
              {mortgageable.map(([id]) => (
                <div key={id} className="trade-item" onClick={() => dispatch({ type: 'LIQUIDATE_MORTGAGE', spaceId: id }, actorId)}>
                  <span style={{ flex: 1 }}>{localized(ownableDef(id), lang)}</span>
                  <span className="money">+{formatSom(ownableDef(id).mortgageValue)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {sellable.length === 0 && mortgageable.length === 0 && (
          <p className="text-sm text-muted">{t('nothingToLiquidate', lang)}</p>
        )}

        <div className="modal__actions">
          <button className="btn btn--danger" onClick={handleDeclareClick}>
            {t('declareBankruptcy', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
