import { useActiveGame } from '../state/GameProvider';
import { nextActorId } from '../game/ai/aiPlayer';
import { BOARD } from '../game/data/board';
import { isOwnableId } from '../game/data/properties';
import { priceAfterDiscount } from '../game/engine';
import { formatSom } from '../utils/currency';
import { t, tf } from '../i18n/strings';
import Dice from './Dice';
import { DETENTION_FINE_SCHEDULE } from '../game/data/economy';
import CostButton from './CostButton';

interface ActionBarProps {
  onOpenTrade: () => void;
  onOpenBuild: () => void;
  onOpenBank: () => void;
  onOpenNetworkTravel: () => void;
  onOpenBribe: () => void;
  /** Re-opens the debt dialog (sell / mortgage lists, bankruptcy) when it was set aside. */
  onOpenDebt?: () => void;
}

export default function ActionBar({ onOpenTrade, onOpenBuild, onOpenBank, onOpenNetworkTravel, onOpenBribe, onOpenDebt }: ActionBarProps) {
  const { state, dispatch, busy } = useActiveGame();
  const lang = state.settings.language;
  const currentP = state.players[state.currentPlayerIndex];
  const actorId = nextActorId(state);
  const actor = state.players.find((p) => p.id === actorId);
  const inDebt = state.phase === 'AWAITING_LIQUIDATION' && !!state.pendingDebt;
  const humanTurn = !busy && !!actor && !actor.isAI;
  const isLocalHumanActing = humanTurn && state.phase === 'AWAITING_ROLL';
  const currentFine = actor ? DETENTION_FINE_SCHEDULE[Math.min(actor.detentionTurns, DETENTION_FINE_SCHEDULE.length - 1)] : 0;

  let status: string;
  if (state.phase === 'GAME_OVER') {
    status = '';
  } else if (busy) {
    status = tf('statusMoving', lang, { name: currentP.name });
  } else if (humanTurn && inDebt) {
    status = tf('statusInDebt', lang, { name: actor!.name, amount: formatSom(state.pendingDebt!.amount) });
  } else if (!isLocalHumanActing) {
    status = actor?.isAI ? tf('statusAiPlaying', lang, { name: currentP.name }) : t('statusWaiting', lang);
  } else if (actor!.inDetention && !state.hasRolledThisTurn) {
    status = tf('statusDetention', lang, { name: actor!.name });
  } else if (!state.hasRolledThisTurn) {
    status = tf('statusYourTurn', lang, { name: actor!.name });
  } else if (state.doublesStreak > 0 && state.doublesStreak < 3) {
    status = t('statusDoubles', lang);
  } else {
    status = tf('statusManage', lang, { name: actor!.name });
  }

  const canRoll = isLocalHumanActing && (!state.hasRolledThisTurn || (state.doublesStreak > 0 && state.doublesStreak < 3));
  const canEndTurn = isLocalHumanActing && state.hasRolledThisTurn;
  const showPayFine = isLocalHumanActing && !state.hasRolledThisTurn && actor!.inDetention;
  const canUsePaper = isLocalHumanActing && !state.hasRolledThisTurn && actor!.inDetention && actor!.releasePapers > 0;
  // Money tools (loan, trade, selling buildings) stay open while in debt, so a
  // player is never forced to give up before trying everything.
  const canManage = isLocalHumanActing || (humanTurn && inDebt);
  const here = actor ? BOARD[actor.position] : undefined;
  const standingOnInfra = !!actor && here?.kind === 'infrastructure';
  const canTravelNetwork = isLocalHumanActing && standingOnInfra && !state.networkTravelUsed;
  const canBribe = isLocalHumanActing && here?.kind === 'corner-bribe' && !state.bribeGambleUsedThisTurn;
  // "Buy" is always there while you stand on an unowned space this turn.
  const buyableHere =
    isLocalHumanActing &&
    state.hasRolledThisTurn &&
    !!actor &&
    !actor.inDetention &&
    !!here &&
    isOwnableId(here.id) &&
    !state.ownership[here.id]?.ownerId;

  return (
    <div className="panel action-bar">
      <Dice dice={state.dice} rolling={state.hasRolledThisTurn} />
      <div className="action-bar__status">{status}</div>
      <div className="action-bar__buttons">
        {humanTurn && inDebt && (
          <CostButton
            label={t('payDebt', lang)}
            cost={state.pendingDebt!.amount}
            cash={actor!.cash}
            lang={lang}
            onClick={() => dispatch({ type: 'PAY_DEBT' }, actorId!)}
          />
        )}
        {humanTurn && inDebt && onOpenDebt && (
          <button className="btn btn--danger" onClick={onOpenDebt}>
            {t('debtOptions', lang)}
          </button>
        )}
        {buyableHere && (
          <CostButton
            label={t('buy', lang)}
            cost={priceAfterDiscount(state, actorId!, here!.id)}
            cash={actor!.cash}
            lang={lang}
            onClick={() => dispatch({ type: 'BUY_PROPERTY' }, actorId!)}
          />
        )}
        {canUsePaper && (
          <button className="btn" onClick={() => dispatch({ type: 'USE_RELEASE_PAPER' }, actorId!)}>
            {t('useReleasePaper', lang)}
          </button>
        )}
        {showPayFine && (
          <CostButton
            label={t('payFine', lang)}
            cost={currentFine}
            cash={actor!.cash}
            lang={lang}
            onClick={() => dispatch({ type: 'PAY_DETENTION_FINE' }, actorId!)}
          />
        )}
        {canTravelNetwork && (
          <button className="btn" onClick={onOpenNetworkTravel}>
            {t('travelNetwork', lang)}
          </button>
        )}
        {isLocalHumanActing && (
          <button className="btn" onClick={onOpenBuild}>
            {t('build', lang)}
          </button>
        )}
        {canManage && (
          <button className="btn" onClick={onOpenBank}>
            {t('bank', lang)}
          </button>
        )}
        {canBribe && (
          <button className="btn btn--risk" onClick={onOpenBribe}>
            {t('bribeOfficial', lang)}
          </button>
        )}
        {canManage && (
          <button className="btn btn--gold" onClick={onOpenTrade}>
            {t('trade', lang)}
          </button>
        )}
        {canRoll && (
          <button className="btn btn--primary" onClick={() => dispatch({ type: 'ROLL_DICE' }, actorId!)}>
            {state.hasRolledThisTurn ? t('rollAgain', lang) : t('rollDice', lang)}
          </button>
        )}
        {canEndTurn && (
          <button className="btn" onClick={() => dispatch({ type: 'END_TURN' }, actorId!)}>
            {t('endTurn', lang)}
          </button>
        )}
      </div>
    </div>
  );
}
