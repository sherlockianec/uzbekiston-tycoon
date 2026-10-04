import { useEffect, useRef, useState } from 'react';
import { useActiveGame } from '../state/GameProvider';
import { nextActorId } from '../game/ai/aiPlayer';
import Board from '../components/Board';
import { MyProperties } from '../components/PlayerPanel';
import ActionBar from '../components/ActionBar';
import CentreDashboard from '../components/CentreDashboard';
import GameLog from '../components/GameLog';
import PropertyInspector from '../components/PropertyInspector';
import CardModal from '../components/CardModal';
import TradeModal from '../components/TradeModal';
import SidePanel from '../components/SidePanel';
import NegativeBalanceModal from '../components/NegativeBalanceModal';
import BuildModal from '../components/BuildModal';
import BankModal from '../components/BankModal';
import NetworkTravelModal from '../components/NetworkTravelModal';
import BribeModal from '../components/BribeModal';
import NoticeToasts from '../components/NoticeToasts';
import Icon from '../components/icons/Icon';
import { LANGUAGE_OPTIONS } from '../components/LanguageSwitcher';
import EndGameModal from '../components/EndGameModal';
import { isOwnableId } from '../game/data/properties';
import { BOARD } from '../game/data/board';
import { coordsPercent, BOARD_RATIO } from '../components/boardGeometry';
import { t } from '../i18n/strings';
import { useSound } from '../hooks/useSound';
import { useIsNarrow } from '../hooks/useIsNarrow';
import type { Language } from '../game/types';

type OverlayModal = 'none' | 'trade' | 'build' | 'bank' | 'network' | 'bribe' | 'settings' | 'properties' | 'log';

/** Width of the board on phones at zoom 1: wide enough that tile text is readable, then panned. */
const PHONE_BOARD_WIDTH = 980;
const ZOOM_MIN = 0.7;
const ZOOM_MAX = 1.8;

export default function GameScreen({ onQuit, onPlayAgain }: { onQuit: () => void; onPlayAgain: () => void }) {
  const { state, quitToMenu, busy } = useActiveGame();
  const lang = state.settings.language;
  const narrow = useIsNarrow();
  const currentPlayer = state.players[state.currentPlayerIndex];

  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayModal>('none');
  const [zoom, setZoom] = useState(1);

  const actorId = nextActorId(state) ?? currentPlayer.id;
  const actor = state.players.find((p) => p.id === actorId) ?? currentPlayer;
  // While a pawn is still walking to its tile nothing can be decided yet.
  const isLocalHumanActing = !actor.isAI && !busy;

  const humanMustDecide = state.phase === 'AWAITING_PURCHASE_DECISION' && isLocalHumanActing;
  const humanMustAckCard = state.phase === 'AWAITING_CARD_ACK' && isLocalHumanActing;
  const inTradeResponse = state.phase === 'AWAITING_TRADE_RESPONSE' && state.trade?.toId === actorId;
  const negativeBalance = isLocalHumanActing && state.phase === 'AWAITING_ROLL' && actor.cash < 0;
  const gameOver = state.phase === 'GAME_OVER';

  // A negative balance does not trap you: the dialog can be set aside to use the bank,
  // trading and so on, and is re-opened from the action bar.
  const [debtOpen, setDebtOpen] = useState(true);
  const wasNegativeRef = useRef(false);
  useEffect(() => {
    if (negativeBalance && !wasNegativeRef.current) setDebtOpen(true);
    wasNegativeRef.current = negativeBalance;
  }, [negativeBalance]);

  // Ending a move on the Senior Official cell: offer the (optional) bribe once per landing.
  const bribePromptedRef = useRef<string | null>(null);
  const onBribeCell = BOARD[actor.position]?.kind === 'corner-bribe';
  const landingKey = `${state.turnNumber}:${actor.position}:${state.dice ? state.dice.join('-') : ''}`;
  useEffect(() => {
    if (!isLocalHumanActing || state.phase !== 'AWAITING_ROLL' || !state.hasRolledThisTurn || actor.cash < 0) return;
    if (!onBribeCell || state.bribeGambleUsedThisTurn || bribePromptedRef.current === landingKey) return;
    bribePromptedRef.current = landingKey;
    setOverlay('bribe');
  }, [isLocalHumanActing, state.phase, state.hasRolledThisTurn, state.bribeGambleUsedThisTurn, onBribeCell, landingKey, actor.cash]);

  // Auto-close the trade overlay once a proposed trade actually resolves.
  const sawTradeRef = useRef(false);
  useEffect(() => {
    const tradeOpen = overlay === 'trade';
    if (tradeOpen && state.trade) sawTradeRef.current = true;
    else if (tradeOpen && !state.trade && sawTradeRef.current) {
      // A refusal keeps the window open so the offer can be adjusted; an accepted deal or a withdrawal closes it.
      if (!state.lastTradeResult || state.lastTradeResult.accepted) setOverlay('none');
      sawTradeRef.current = false;
    }
    if (!tradeOpen) sawTradeRef.current = false;
  }, [state.trade, state.lastTradeResult, overlay]);

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

  // Phones: keep the active pawn in view as it moves (the board is bigger than the screen).
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const followPos = state.players[state.currentPlayerIndex]?.position ?? 0;
  useEffect(() => {
    const box = scrollRef.current;
    if (!narrow || !box) return;
    const width = PHONE_BOARD_WIDTH * zoom;
    const height = width / BOARD_RATIO;
    const { left, top } = coordsPercent(followPos);
    const x = (left / 100) * width - box.clientWidth / 2;
    const y = (top / 100) * height - box.clientHeight / 2;
    box.scrollTo({ left: Math.max(0, x), top: Math.max(0, y), behavior: state.settings.animations ? 'smooth' : 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow, followPos, state.currentPlayerIndex]);

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

  const openers = {
    onOpenTrade: () => setOverlay('trade'),
    onOpenBuild: () => setOverlay('build'),
    onOpenBank: () => setOverlay('bank'),
    onOpenNetworkTravel: () => setOverlay('network'),
    onOpenBribe: () => setOverlay('bribe'),
    onOpenDebt: () => setDebtOpen(true),
  };

  const centre = (
    <CentreDashboard
      {...openers}
      onOpenProperties={() => setOverlay('properties')}
      onOpenLog={() => setOverlay('log')}
      onOpenSettings={() => setOverlay('settings')}
      onQuit={handleQuit}
      showActions={!narrow}
      sidebar={!narrow}
    />
  );

  return (
    <div className={`game-screen${narrow ? ' game-screen--narrow' : ''}`}>
      <div className="game-screen__board" ref={scrollRef}>
        <Board state={state} onSelectSpace={handleSelectSpace} centre={centre} fixedWidth={narrow ? PHONE_BOARD_WIDTH * zoom : undefined} />
      </div>

      {!narrow && (
        <SidePanel
          onOpenProperties={() => setOverlay('properties')}
          onOpenLog={() => setOverlay('log')}
          onOpenSettings={() => setOverlay('settings')}
          onQuit={handleQuit}
        />
      )}

      {narrow && (
        <>
          <div className="zoom-controls">
            <button className="icon-btn" aria-label={t('zoomIn', lang)} title={t('zoomIn', lang)} onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + 0.2).toFixed(2)))}>
              <Icon name="plus" />
            </button>
            <button className="icon-btn" aria-label={t('zoomOut', lang)} title={t('zoomOut', lang)} onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - 0.2).toFixed(2)))}>
              <Icon name="minus" />
            </button>
          </div>
          <div className="game-screen__actions">
            <ActionBar {...openers} variant="bar" />
          </div>
        </>
      )}

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
      {overlay === 'bribe' && isLocalHumanActing && actor.cash >= 0 && <BribeModal actorId={actorId} onClose={() => setOverlay('none')} />}
      {negativeBalance && debtOpen && overlay === 'none' && (
        <NegativeBalanceModal
          actorId={actorId}
          onSetAside={() => setDebtOpen(false)}
          onOpenBank={() => setOverlay('bank')}
          onOpenTrade={() => setOverlay('trade')}
        />
      )}
      {overlay === 'properties' && (
        <div className="modal-overlay" onClick={() => setOverlay('none')}>
          <div className="panel panel--gold-edge modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <MyProperties state={state} playerId={actor.isAI ? currentPlayer.id : actorId} onSelectSpace={(id) => { setOverlay('none'); setSelectedSpace(id); }} />
            <div className="modal__actions">
              <button className="btn btn--primary" onClick={() => setOverlay('none')}>
                {t('close', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
      {overlay === 'log' && (
        <div className="modal-overlay" onClick={() => setOverlay('none')}>
          <div className="modal modal--wide modal--log" onClick={(e) => e.stopPropagation()}>
            <GameLog />
            <div className="modal__actions">
              <button className="btn btn--primary" onClick={() => setOverlay('none')}>
                {t('close', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
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
          <span>{t('theme', lang)}</span>
          <select value={state.settings.theme ?? 'dark'} onChange={(e) => updateSettings({ theme: e.target.value as 'dark' | 'light' })}>
            <option value="dark">{t('themeDark', lang)}</option>
            <option value="light">{t('themeLight', lang)}</option>
          </select>
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

