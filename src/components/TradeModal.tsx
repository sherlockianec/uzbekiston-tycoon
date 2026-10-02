import { useState } from 'react';
import { useActiveGame } from '../state/GameProvider';
import { ownableDef, balanceTradeCash } from '../game/engine';
import { isPropertyId } from '../game/data/properties';
import { formatSom } from '../utils/currency';
import { t, tf, localized } from '../i18n/strings';
import type { Language, TradeOffer } from '../game/types';

export default function TradeModal({ actorId, onClose }: { actorId: string; onClose: () => void }) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const trade = state.trade;

  if (trade && trade.toId === actorId) {
    return <TradeReview trade={trade} actorId={actorId} />;
  }

  if (trade && trade.fromId === actorId) {
    const target = state.players.find((p) => p.id === trade.toId);
    return (
      <div className="modal-overlay">
        <div className="panel panel--gold-edge modal">
          <h2>{t('trade', lang)}</h2>
          <p className="text-sm text-muted">{tf('tradeWaiting', lang, { name: target?.name ?? t('theOtherPlayer', lang) })}</p>
          <div className="modal__actions">
            <button className="btn" onClick={() => dispatch({ type: 'CANCEL_TRADE' }, actorId)}>
              {t('cancel', lang)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <TradeBuilder actorId={actorId} onClose={onClose} />;
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

function TradeBuilder({ actorId, onClose }: { actorId: string; onClose: () => void }) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const human = state.players.find((p) => p.id === actorId)!;
  const opponents = state.players.filter((p) => p.id !== actorId && !p.bankrupt);

  const [targetId, setTargetId] = useState(opponents[0]?.id ?? '');
  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);
  const [offerProps, setOfferProps] = useState<Set<string>>(new Set());
  const [requestProps, setRequestProps] = useState<Set<string>>(new Set());

  const target = state.players.find((p) => p.id === targetId);

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

  function parseAmount(raw: string, max: number): number {
    const digits = Number(raw.replace(/\D/g, '')) || 0;
    return Math.max(0, Math.min(max, digits));
  }

  function propsValue(ids: Set<string>): number {
    return Array.from(ids).reduce((sum, id) => sum + ownableDef(id).price, 0);
  }

  function handleBalance() {
    const next = balanceTradeCash({
      offerCash,
      requestCash,
      offerPropsValue: propsValue(offerProps),
      requestPropsValue: propsValue(requestProps),
      myCash: human.cash,
      theirCash: target!.cash,
    });
    setOfferCash(next.offerCash);
    setRequestCash(next.requestCash);
  }

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
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel panel--gold-edge modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h2>{t('proposeTrade', lang)}</h2>
        <div className="field">
          <label>{t('tradeWith', lang)}</label>
          <select
            value={targetId}
            onChange={(e) => {
              setTargetId(e.target.value);
              setRequestProps(new Set());
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
            <div className="field">
              <label>{t('cash', lang)}</label>
              <div className="flex-row">
                <button className="btn btn--sm" onClick={() => setOfferCash((c) => Math.max(0, c - 100_000))}>
                  {'\u2212'}
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={offerCash}
                  onChange={(e) => setOfferCash(parseAmount(e.target.value, human.cash))}
                  style={{ flex: 1, textAlign: 'center' }}
                />
                <button className="btn btn--sm" onClick={() => setOfferCash((c) => Math.min(human.cash, c + 100_000))}>
                  +
                </button>
              </div>
            </div>
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
            <div className="field">
              <label>{t('cash', lang)}</label>
              <div className="flex-row">
                <button className="btn btn--sm" onClick={() => setRequestCash((c) => Math.max(0, c - 100_000))}>
                  {'\u2212'}
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={requestCash}
                  onChange={(e) => setRequestCash(parseAmount(e.target.value, target.cash))}
                  style={{ flex: 1, textAlign: 'center' }}
                />
                <button className="btn btn--sm" onClick={() => setRequestCash((c) => Math.min(target.cash, c + 100_000))}>
                  +
                </button>
              </div>
            </div>
            <div className="trade-list">
              {theirTradeable.length === 0 && <p className="text-sm text-muted">{t('noTradeable', lang)}</p>}
              {theirTradeable.map(([id]) => (
                <label key={id} className="trade-item">
                  <input
                    type="checkbox"
                    checked={requestProps.has(id)}
                    onChange={() => toggle(requestProps, setRequestProps, id)}
                  />
                  {localized(ownableDef(id), lang)}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-row" style={{ justifyContent: 'center', marginTop: 10 }}>
          <button className="btn btn--sm" onClick={handleBalance}>
            {t('balanceOffer', lang)}
          </button>
        </div>

        <div className="modal__actions">
          <button className="btn" onClick={onClose}>
            {t('cancel', lang)}
          </button>
          <button className="btn btn--primary" onClick={submit}>
            {t('proposeTrade', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
