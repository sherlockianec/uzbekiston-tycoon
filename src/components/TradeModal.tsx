import { useState } from 'react';
import type React from 'react';
import { useActiveGame } from '../state/GameProvider';
import { ownableDef } from '../game/engine';
import { isPropertyId } from '../game/data/properties';
import { formatSom } from '../utils/currency';
import { t, tf, localized, type StringKey } from '../i18n/strings';
import type { Language, TradeOffer } from '../game/types';

export default function TradeModal({ actorId, onClose }: { actorId: string; onClose: () => void }) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const trade = state.trade;

  if (trade && trade.toId === actorId) {
    return <TradeReview trade={trade} actorId={actorId} />;
  }

  return <TradeBuilder actorId={actorId} onClose={onClose} pending={trade?.fromId === actorId} />;
}

function TradeReview({ trade, actorId }: { trade: TradeOffer; actorId: string }) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const proposer = state.players.find((p) => p.id === trade.fromId);

  return (
    <div className="modal-overlay">
      <div className="panel panel--gold-edge modal modal--wide">
        <h2>
          {t('trade', lang)} {'\u2014'} {proposer?.name}
        </h2>
        <div className="trade-columns">
          <div>
            <h4>{t('theyOffer', lang)}</h4>
            <TradeSideSummary cash={trade.offerCash} propertyIds={trade.offerPropertyIds} papers={trade.offerReleasePapers} lang={lang} />
          </div>
          <div>
            <h4>{t('theyWant', lang)}</h4>
            <TradeSideSummary cash={trade.requestCash} propertyIds={trade.requestPropertyIds} papers={trade.requestReleasePapers} lang={lang} />
          </div>
        </div>
        <div className="modal__actions">
          <button className="btn" onClick={() => dispatch({ type: 'RESPOND_TRADE', accept: false }, actorId)}>
            {t('reject', lang)}
          </button>
          <button className="btn btn--primary" onClick={() => dispatch({ type: 'RESPOND_TRADE', accept: true }, actorId)}>
            {t('accept', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

function TradeSideSummary({ cash, propertyIds, papers, lang }: { cash: number; propertyIds: string[]; papers: number; lang: Language }) {
  const empty = cash === 0 && papers === 0 && propertyIds.length === 0;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {cash > 0 && <li className="money">{formatSom(cash)}</li>}
      {papers > 0 && <li>{tf('releasePapersN', lang, { n: papers })}</li>}
      {propertyIds.map((id) => (
        <li key={id}>{localized(ownableDef(id), lang)}</li>
      ))}
      {empty && <li className="text-muted">{t('nothing', lang)}</li>}
    </ul>
  );
}

const CASH_STEP = 100_000;
const CASH_JUMP = 500_000;

function TradeBuilder({ actorId, onClose, pending }: { actorId: string; onClose: () => void; pending: boolean }) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const human = state.players.find((p) => p.id === actorId)!;
  const opponents = state.players.filter((p) => p.id !== actorId && !p.bankrupt);

  const [targetId, setTargetId] = useState(opponents[0]?.id ?? '');
  // One signed number: > 0 means YOU pay that cash, < 0 means THEY pay it.
  const [net, setNet] = useState(0);
  const [offerProps, setOfferProps] = useState<Set<string>>(new Set());
  const [requestProps, setRequestProps] = useState<Set<string>>(new Set());

  const target = state.players.find((p) => p.id === targetId);
  const result = state.lastTradeResult;
  const declined = !!result && !result.accepted && result.fromId === actorId && !pending;

  if (!target) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="panel modal" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted">{t('noOtherPlayers', lang)}</p>
          <div className="modal__actions">
            <button className="btn" onClick={onClose}>
              {t('close', lang)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const myTradeable = Object.entries(state.ownership).filter(
    ([id, o]) => o.ownerId === actorId && (!isPropertyId(id) || o.level === 0)
  );
  const theirTradeable = Object.entries(state.ownership).filter(
    ([id, o]) => o.ownerId === target.id && (!isPropertyId(id) || o.level === 0)
  );

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  }

  const sumPrice = (ids: Set<string>) => Array.from(ids).reduce((sum, id) => sum + ownableDef(id).price, 0);
  const maxGive = Math.floor(Math.max(0, human.cash) / CASH_STEP) * CASH_STEP;
  const maxGet = Math.floor(Math.max(0, target.cash) / CASH_STEP) * CASH_STEP;
  const clampNet = (v: number) => Math.max(-maxGet, Math.min(maxGive, Math.round(v / CASH_STEP) * CASH_STEP));
  const offerCash = Math.max(0, net);
  const requestCash = Math.max(0, -net);
  // Price-basis balance for you: what you receive minus what you hand over.
  const balance = sumPrice(requestProps) + requestCash - sumPrice(offerProps) - offerCash;

  const span = maxGive + maxGet || 1;
  const fillPct = ((net + maxGet) / span) * 100;
  const zeroPct = (maxGet / span) * 100;

  function submit() {
    dispatch(
      {
        type: 'PROPOSE_TRADE',
        offer: {
          fromId: actorId,
          toId: target!.id,
          offerCash,
          offerPropertyIds: Array.from(offerProps),
          offerReleasePapers: 0,
          requestCash,
          requestPropertyIds: Array.from(requestProps),
          requestReleasePapers: 0,
        },
      },
      actorId
    );
  }

  const nothingChosen = offerCash === 0 && requestCash === 0 && offerProps.size === 0 && requestProps.size === 0;
  const hintKey: StringKey | null =
    declined && result
      ? (result.ratio ?? 0) >= 0.85
        ? 'tradeDeclinedClose'
        : (result.ratio ?? 0) >= 0.5
          ? 'tradeDeclinedMore'
          : 'tradeDeclinedFar'
      : null;

  return (
    <div className="modal-overlay" onClick={pending ? undefined : onClose}>
      <div className="panel panel--gold-edge modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h2>{t('proposeTrade', lang)}</h2>

        {pending && (
          <p className="trade-banner" role="status">
            {tf('tradeWaiting', lang, { name: target.name })}
          </p>
        )}
        {hintKey && (
          <p className="trade-banner trade-banner--no" role="alert">
            {tf(hintKey, lang, { name: target.name })}
          </p>
        )}

        <fieldset disabled={pending} className="trade-fieldset">
          <div className="field">
            <label>{t('tradeWith', lang)}</label>
            <select
              value={targetId}
              onChange={(e) => {
                setTargetId(e.target.value);
                setRequestProps(new Set());
                setNet(0);
              }}
            >
              {opponents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="trade-columns">
            <div>
              <h4>{t('youOffer', lang)}</h4>
              <div className="trade-list">
                {myTradeable.length === 0 && <p className="text-sm text-muted">{t('noTradeable', lang)}</p>}
                {myTradeable.map(([id]) => (
                  <label key={id} className="trade-item">
                    <input type="checkbox" checked={offerProps.has(id)} onChange={() => toggle(offerProps, setOfferProps, id)} />
                    {localized(ownableDef(id), lang)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h4>{t('youRequest', lang)}</h4>
              <div className="trade-list">
                {theirTradeable.length === 0 && <p className="text-sm text-muted">{t('noTradeable', lang)}</p>}
                {theirTradeable.map(([id]) => (
                  <label key={id} className="trade-item">
                    <input type="checkbox" checked={requestProps.has(id)} onChange={() => toggle(requestProps, setRequestProps, id)} />
                    {localized(ownableDef(id), lang)}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="trade-money">
            <div className="trade-money__ends">
              <span>
                <strong>{target.name}</strong>
                <span className="money text-sm"> {formatSom(target.cash)}</span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <strong>{human.name}</strong>
                <span className="money text-sm"> {formatSom(human.cash)}</span>
              </span>
            </div>
            <input
              type="range"
              className="trade-slider"
              aria-label={t('tradeCashSlider', lang)}
              min={-maxGet}
              max={maxGive}
              step={CASH_STEP}
              value={net}
              onChange={(e) => setNet(clampNet(Number(e.target.value)))}
              style={{ '--fill': `${fillPct}%`, '--zero': `${zeroPct}%` } as React.CSSProperties}
            />
            <div className="trade-money__row">
              <button className="btn btn--sm" onClick={() => setNet((n) => clampNet(n - CASH_JUMP))} aria-label={tf('tradeLess', lang, { amount: formatSom(CASH_JUMP) })}>
                {'\u2212'} {formatSom(CASH_JUMP)}
              </button>
              <div className={`trade-money__now ${net > 0 ? 'money--negative' : net < 0 ? 'money--positive' : ''}`} aria-live="polite">
                {net > 0
                  ? tf('tradeYouGive', lang, { amount: formatSom(net) })
                  : net < 0
                    ? tf('tradeYouGet', lang, { amount: formatSom(-net) })
                    : t('tradeNoCash', lang)}
              </div>
              <button className="btn btn--sm" onClick={() => setNet((n) => clampNet(n + CASH_JUMP))} aria-label={tf('tradeMore', lang, { amount: formatSom(CASH_JUMP) })}>
                + {formatSom(CASH_JUMP)}
              </button>
            </div>
          </div>

          <div className={`trade-balance ${balance < 0 ? 'trade-balance--neg' : balance > 0 ? 'trade-balance--pos' : ''}`} aria-live="polite">
            <span>{t('tradeYourBalance', lang)}</span>
            <strong className="money">
              {balance > 0 ? '+' : balance < 0 ? '\u2212' : ''}
              {formatSom(Math.abs(balance))}
            </strong>
          </div>
        </fieldset>

        <div className="modal__actions">
          {pending ? (
            <button className="btn" onClick={() => dispatch({ type: 'CANCEL_TRADE' }, actorId)}>
              {t('cancel', lang)}
            </button>
          ) : (
            <>
              <button className="btn" onClick={onClose}>
                {t('close', lang)}
              </button>
              <button className="btn btn--primary" onClick={submit} disabled={nothingChosen}>
                {t('proposeTrade', lang)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
