import { useState } from 'react';
import { MAX_LOAN_AMOUNT, MIN_LOAN_AMOUNT, LOAN_INTEREST_PERCENT, LOAN_LAPS } from '../game/data/economy';
import { canTakeLoan } from '../game/engine';
import { formatSom } from '../utils/currency';
import { t } from '../i18n/strings';
import { useActiveGame } from '../state/GameProvider';
import CostButton from './CostButton';

export default function BankModal({ actorId, onClose }: { actorId: string; onClose: () => void }) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const player = state.players.find((p) => p.id === actorId)!;
  const [amount, setAmount] = useState(Math.min(2_000_000, MAX_LOAN_AMOUNT));

  const canBorrow = canTakeLoan(state, actorId, amount);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel panel--gold-edge modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('bank', lang)}</h2>

        {player.loan ? (
          <>
            <div className="modal__row">
              <span>{t('loanBalance', lang)}</span>
              <span className="money">{formatSom(player.loan.dueAmount)}</span>
            </div>
            <div className="modal__row">
              <span>{t('installmentsLeft', lang)}</span>
              <span>{player.loan.lapsLeft}</span>
            </div>
            <p className="text-sm text-muted" style={{ marginTop: 10 }}>
              {t('bankInstallmentNote', lang)}
            </p>
            <div className="modal__actions">
              <button className="btn" onClick={onClose}>
                {t('close', lang)}
              </button>
              <CostButton
                label={t('repayLoanEarly', lang)}
                cost={player.loan.dueAmount}
                cash={player.cash}
                lang={lang}
                onClick={() => dispatch({ type: 'REPAY_LOAN_EARLY' }, actorId)}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">{t('noActiveLoan', lang)}</p>
            <div className="field" style={{ marginTop: 14 }}>
              <label>
                {t('loanAmount', lang)} ({formatSom(MIN_LOAN_AMOUNT)} - {formatSom(MAX_LOAN_AMOUNT)})
              </label>
              <input
                type="range"
                min={MIN_LOAN_AMOUNT}
                max={MAX_LOAN_AMOUNT}
                step={100_000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--turquoise)' }}
              />
              <div className="flex-row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                <span className="money">{formatSom(amount)}</span>
                <span className="text-sm text-muted">
                  +{LOAN_INTEREST_PERCENT}% after {LOAN_LAPS} laps
                </span>
              </div>
            </div>
            <div className="modal__row">
              <span>{t('totalToRepay', lang)}</span>
              <span className="money">{formatSom(Math.round((amount * (1 + LOAN_INTEREST_PERCENT / 100)) / 1000) * 1000)}</span>
            </div>
            <div className="modal__actions">
              <button className="btn" onClick={onClose}>
                {t('cancel', lang)}
              </button>
              <button
                className={`btn ${canBorrow ? 'btn--affordable' : 'btn--unaffordable'}`}
                disabled={!canBorrow}
                onClick={() => {
                  dispatch({ type: 'TAKE_LOAN', amount }, actorId);
                  onClose();
                }}
              >
                {t('takeLoan', lang)} (+{formatSom(amount)})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
