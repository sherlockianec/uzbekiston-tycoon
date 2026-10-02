import { useEffect, useRef, useState } from 'react';
import { useActiveGame } from '../state/GameProvider';
import { nextActorId } from '../game/ai/aiPlayer';
import Board from '../components/Board';
import { PlayerList, MyProperties } from '../components/PlayerPanel';
import ActionBar from '../components/ActionBar';
import GameLog from '../components/GameLog';
import PropertyInspector from '../components/PropertyInspector';
import CardModal from '../components/CardModal';
import TradeModal from '../components/TradeModal';
import LiquidationModal from '../components/LiquidationModal';
import BuildModal from '../components/BuildModal';
import BankModal from '../components/BankModal';
import NetworkTravelModal from '../components/NetworkTravelModal';
import BribeModal from '../components/BribeModal';
import NoticeToasts from '../components/NoticeToasts';
import { LANGUAGE_OPTIONS } from '../components/LanguageSwitcher';
import EndGameModal from '../components/EndGameModal';
import { isOwnableId } from '../game/data/properties';
import { t } from '../i18n/strings';
import { useSound } from '../hooks/useSound';
import type { Language } from '../game/types';

const ICON_GEAR = '\u2699\ufe0f';
const ICON_CLOSE = '\u2716';

type OverlayModal = 'none' | 'trade' | 'build' | 'bank' | 'network' | 'bribe' | 'settings';

export default function GameScreen({ onQuit, onPlayAgain }: { onQuit: () => void; onPlayAgain: () => void }) {
  const { state, quitToMenu } = useActiveGame();
  const lang = state.settings.language;
  const currentPlayer = state.players[state.currentPlayerIndex];

  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayModal>('none');

  const actorId = nextActorId(state) ?? currentPlayer.id;
  const actor = state.players.find((p) => p.id === actorId) ?? currentPlayer;
  const isLocalHumanActing = !actor.isAI;

  const humanMustDecide = state.phase === 'AWAITING_PURCHASE_DECISION' && isLocalHumanActing;
  const humanMustAckCard = state.phase === 'AWAITING_CARD_ACK' && isLocalHumanActing;
  const inTradeResponse = state.phase === 'AWAITING_TRADE_RESPONSE' && state.trade?.toId === actorId;
  const humanMustLiquidate = state.phase === 'AWAITING_LIQUIDATION' && isLocalHumanActing;
  const gameOver = state.phase === 'GAME_OVER';

  // Auto-close the trade overlay once a proposed trade actually resolves.
  const sawTradeRef = useRef(false);
  useEffect(() => {
    const tradeOpen = overlay === 'trade';
    if (tradeOpen && state.trade) sawTradeRef.current = true;
    else if (tradeOpen && !state.trade && sawTradeRef.current) {
      setOverlay('none');
      sawTradeRef.current = false;
    }
    if (!tradeOpen) sawTradeRef.current = false;
  }, [state.trade, overlay]);

  // If a bribe attempt's loss couldn't be covered, liquidation takes over —
  // close the bribe overlay immediately so it doesn't linger and reopen later.
  useEffect(() => {
    if (state.phase === 'AWAITING_LIQUIDATION' && overlay === 'bribe') setOverlay('none');
  }, [state.phase, overlay]);

  // Lightweight sound cues driven off the newest log line.
  const play = useSound(state.settings.sound);
  const lastLogIdRef = useRef<string | null>(null);
  useEffect(() => {
    const last = state.log[state.log.length - 1];
    if (!last || last.id === lastLogIdRef.current) return;
    lastLogIdRef.current = last.id;
    if (/rolled/.test(last.text)) play('dice');
    else if (/bought/.test(last.text)) play('buy');
    else if (/paid|mortgaged/.test(last.text)) play('cash-out');
    else if (/collected|settled|took a loan/.test(last.text)) play('cash-in');
  }, [state.log, play]);

  function handleSelectSpace(spaceId: string) {
    if (humanMustDecide) return;
    if (isOwnableId(spaceId)) setSelectedSpace(spaceId);
  }

  function handleQuit() {
    quitToMenu();
    onQuit();
  }

  function handlePlayAgain() {
    quitToMenu();
    onPlayAgain();
  }

  return (
    <div className="game-screen">
      <div className="game-screen__left scroll-y">
        <MyProperties state={state} playerId={currentPlayer.id} onSelectSpace={setSelectedSpace} />
      </div>

      <div className="game-screen__board">
        <Board state={state} onSelectSpace={handleSelectSpace} />
      </div>

      <div className="game-screen__right">
        <div className="flex-row" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow">
            {t('round', lang)} {state.turnNumber}
          </span>
          <div className="flex-row">
            <button className="icon-btn" onClick={() => setOverlay('settings')} title={t('settings', lang)}>
              {ICON_GEAR}
            </button>
            <button className="icon-btn" onClick={handleQuit} title={t('quitToMenu', lang)}>
              {ICON_CLOSE}
            </button>
          </div>
        </div>
        <PlayerList state={state} />
        <GameLog />
      </div>

      <div className="game-screen__actions">
        <ActionBar
          onOpenTrade={() => setOverlay('trade')}
          onOpenBuild={() => setOverlay('build')}
          onOpenBank={() => setOverlay('bank')}
          onOpenNetworkTravel={() => setOverlay('network')}
          onOpenBribe={() => setOverlay('bribe')}
        />
      </div>

      {selectedSpace && !humanMustDecide && (
        <PropertyInspector spaceId={selectedSpace} actorId={actorId} onClose={() => setSelectedSpace(null)} />
      )}
      {humanMustDecide && state.currentSpaceId && (
        <PropertyInspector spaceId={state.currentSpaceId} actorId={actorId} onClose={() => undefined} forceDecision />
      )}
      {humanMustAckCard && <CardModal actorId={actorId} />}
      {(overlay === 'trade' || inTradeResponse) && <TradeModal actorId={actorId} onClose={() => setOverlay('none')} />}
      {overlay === 'build' && isLocalHumanActing && <BuildModal actorId={actorId} onClose={() => setOverlay('none')} />}
      {overlay === 'bank' && isLocalHumanActing && <BankModal actorId={actorId} onClose={() => setOverlay('none')} />}
      {overlay === 'network' && isLocalHumanActing && <NetworkTravelModal actorId={actorId} onClose={() => setOverlay('none')} />}
      {overlay === 'bribe' && isLocalHumanActing && state.phase !== 'AWAITING_LIQUIDATION' && (
        <BribeModal actorId={actorId} onClose={() => setOverlay('none')} />
      )}
      {humanMustLiquidate && <LiquidationModal actorId={actorId} />}
      <NoticeToasts />
      {gameOver && <EndGameModal onPlayAgain={handlePlayAgain} onReturnToMenu={handleQuit} />}
      {overlay === 'settings' && <SettingsPopover onClose={() => setOverlay('none')} />}
    </div>
  );
}

function SettingsPopover({ onClose }: { onClose: () => void }) {
  const { state, updateSettings } = useActiveGame();
  const lang = state.settings.language;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel panel--gold-edge modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('settings', lang)}</h2>
        <div className="modal__row">
          <span>{t('sound', lang)}</span>
          <input type="checkbox" checked={state.settings.sound} onChange={(e) => updateSettings({ sound: e.target.checked })} />
        </div>
        <div className="modal__row">
          <span>{t('animations', lang)}</span>
          <input
            type="checkbox"
            checked={state.settings.animations}
            onChange={(e) => updateSettings({ animations: e.target.checked })}
          />
        </div>
        <div className="modal__row">
          <span>{t('language', lang)}</span>
          <select value={state.settings.language} onChange={(e) => updateSettings({ language: e.target.value as Language })}>
            {LANGUAGE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.full}
              </option>
            ))}
          </select>
        </div>
        <div className="modal__row">
          <span>{t('aiSpeed', lang)}</span>
          <select value={state.settings.aiSpeedMs} onChange={(e) => updateSettings({ aiSpeedMs: Number(e.target.value) })}>
            <option value={400}>{t('speedFast', lang)}</option>
            <option value={900}>{t('speedNormal', lang)}</option>
            <option value={1600}>{t('speedSlow', lang)}</option>
          </select>
        </div>
        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onClose}>
            {t('close', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

