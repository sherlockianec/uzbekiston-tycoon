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
  const me = state.players.find((p) => p.id === actorId);
  const price = (ids: string[]) => ids.reduce((sum, id) => sum + ownableDef(id).price, 0);
  // From MY side: what I receive minus what I hand over, at list prices.
  const balance = price(trade.offerPropertyIds) + trade.offerCash - price(trade.requestPropertyIds) - trade.requestCash;

  return (
    <div className="modal-overlay">
      <div className="panel panel--gold-edge modal modal--wide" role="dialog" aria-label={t('trade', lang)}>
        <h2>{tf('tradeOfferFrom', lang, { name: proposer?.name ?? '' })}</h2>
        <p className="trade-banner" role="status">
          {tf('tradeOfferQuestion', lang, { from: proposer?.name ?? '', to: me?.name ?? '' })}
        </p>
        <div className="trade-columns">
          <div className="trade-side trade-side--get">
            <h4>{tf('tradeYouWouldGet', lang, { name: me?.name ?? '' })}</h4>
            <TradeSideSummary cash={trade.offerCash} propertyIds={trade.offerPropertyIds} papers={trade.offerReleasePapers} lang={lang} />
          </div>
          <div className="trade-side trade-side--give">
            <h4>{tf('tradeYouWouldGive', lang, { name: me?.name ?? '' })}</h4>
            <TradeSideSummary cash={trade.requestCash} propertyIds={trade.requestPropertyIds} papers={trade.requestReleasePapers} lang={lang} />
          </div>
        </div>
        <div className={`trade-balance ${balance < 0 ? 'trade-balance--neg' : balance > 0 ? 'trade-balance--pos' : ''}`}>
          <span>{t('tradeYourBalance', lang)}</span>
          <strong className="money">
            {balance > 0 ? '+' : balance < 0 ? '\u2212' : ''}
            {formatSom(Math.abs(balance))}
          </strong>
        </div>
        <div className="modal__actions">
          <button className="btn btn--danger" onClick={() => dispatch({ type: 'RESPOND_TRADE', accept: false }, actorId)}>
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

  // After a refusal this window is rebuilt (the other player's review window took its place),
  // so start from the refused offer: same person, same pieces, same cash - ready to adjust.
  const last = state.lastTradeResult;
  const refused = !!last && !last.accepted && last.fromId === actorId ? last : null;
  const [targetId, setTargetId] = useState(refused?.toId ?? opponents[0]?.id ?? '');
  // One signed number: > 0 means YOU pay that cash, < 0 means THEY pay it.
  const [net, setNet] = useState(refused?.offer ? refused.offer.offerCash - refused.offer.requestCash : 0);
  const [offerProps, setOfferProps] = useState<Set<string>>(new Set(refused?.offer?.offerPropertyIds ?? []));
  const [requestProps, setRequestProps] = useState<Set<string>>(new Set(refused?.offer?.requestPropertyIds ?? []));

  const target = state.players.find((p) => p.id === targetId);
  const result = state.lastTradeResult;
  const declined = !!result && !result.accepted && result.fromId === actorId && !pending;
  // The refusal banner names whoever REALLY refused, not whoever is selected in the list now.
  const refuser = declined && result ? state.players.find((p) => p.id === result.toId) : undefined;

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
  // Slider value v = -net: dragging LEFT (v < 0) means you GIVE cash, RIGHT means you ASK for cash.
  const thumbPct = ((-net + maxGive) / span) * 100;
  const zeroPct = (maxGive / span) * 100;
  const segA = Math.min(thumbPct, zeroPct);
  const segB = Math.max(thumbPct, zeroPct);
  const propsDiff = sumPrice(requestProps) - sumPrice(offerProps); // > 0: you get more property than you give


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
      ? result.ratio === undefined
        ? 'tradeDeclinedPlain'
        : result.ratio >= 0.85
        ? 'tradeDeclinedClose'
        : result.ratio >= 0.5
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
            {tf(hintKey, lang, { name: refuser?.name ?? target.name })}
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
              <span className="trade-money__mine">
                <strong>{human.name}</strong>
                <span className="money text-sm"> {formatSom(human.cash)}</span>
              </span>
              <span className="trade-money__theirs" style={{ textAlign: 'right' }}>
                <strong>{target.name}</strong>
                <span className="money text-sm"> {formatSom(target.cash)}</span>
              </span>
            </div>
            <input
              type="range"
              className="trade-slider"
              aria-label={t('tradeCashSlider', lang)}
              min={-maxGive}
              max={maxGet}
              step={CASH_STEP}
              disabled={span <= 1}
              value={-net}
              onChange={(e) => setNet(clampNet(-Number(e.target.value)))}
              style={{ '--a': `${segA}%`, '--b': `${segB}%` } as React.CSSProperties}
            />
            <div className="trade-money__legend">
              <span>{'\u25c0'} {t('tradeDragGive', lang)}</span>
              <span>{t('tradeDragAsk', lang)} {'\u25b6'}</span>
            </div>
            <div className="trade-money__row">
              <button className="btn btn--sm" onClick={() => setNet((n) => clampNet(n + CASH_JUMP))} aria-label={tf('tradeGiveMore', lang, { amount: formatSom(CASH_JUMP) })}>
                {'\u25c0'} {tf('tradeGiveMore', lang, { amount: formatSom(CASH_JUMP) })}
              </button>
              <div className={`trade-money__now ${net > 0 ? 'money--negative' : net < 0 ? 'money--positive' : ''}`} aria-live="polite">
                {net > 0
                  ? tf('tradeYouGive', lang, { amount: formatSom(net) })
                  : net < 0
                    ? tf('tradeYouGet', lang, { amount: formatSom(-net) })
                    : t('tradeNoCash', lang)}
              </div>
              <button className="btn btn--sm" onClick={() => setNet((n) => clampNet(n - CASH_JUMP))} aria-label={tf('tradeAskMore', lang, { amount: formatSom(CASH_JUMP) })}>
                {tf('tradeAskMore', lang, { amount: formatSom(CASH_JUMP) })} {'\u25b6'}
              </button>
            </div>
            <button className="btn btn--sm trade-equalize" onClick={() => setNet(clampNet(propsDiff))} disabled={propsDiff === 0 && net === 0}>
              {t('tradeEqualize', lang)}
            </button>
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
