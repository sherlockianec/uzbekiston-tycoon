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
  /** Re-opens the negative-balance dialog (sell / mortgage lists, bankruptcy) when it was set aside. */
  onOpenDebt?: () => void;
  /** 'centre': drawn in the middle of the board. 'bar': compact bar under a scrolling board (phones). */
  variant?: 'centre' | 'bar';
}

export default function ActionBar({
  onOpenTrade,
  onOpenBuild,
  onOpenBank,
  onOpenNetworkTravel,
  onOpenBribe,
  onOpenDebt,
  variant = 'centre',
}: ActionBarProps) {
  const { state, dispatch, busy } = useActiveGame();
  const lang = state.settings.language;
  const currentP = state.players[state.currentPlayerIndex];
  const actorId = nextActorId(state);
  const actor = state.players.find((p) => p.id === actorId);
  const negative = !!actor && actor.cash < 0;
  const humanTurn = !busy && !!actor && !actor.isAI;
  const isLocalHumanActing = humanTurn && state.phase === 'AWAITING_ROLL';
  const resting = !!actor?.resting;
  const currentFine = actor ? DETENTION_FINE_SCHEDULE[Math.min(actor.detentionTurns, DETENTION_FINE_SCHEDULE.length - 1)] : 0;
  const here = actor ? BOARD[actor.position] : undefined;

  // "Buy" is there whenever you stand on an unowned space: right after landing,
  // or at the start of your next turn before you roll.
  const buyableHere =
    isLocalHumanActing &&
    !!actor &&
    !actor.inDetention &&
    !resting &&
    !!here &&
    isOwnableId(here.id) &&
    !state.ownership[here.id]?.ownerId;

  let status: string;
  if (state.phase === 'GAME_OVER') {
    status = '';
  } else if (busy) {
    status = tf('statusMoving', lang, { name: currentP.name });
  } else if (humanTurn && negative) {
    status = tf('statusInDebt', lang, { name: actor!.name, amount: formatSom(actor!.cash) });
  } else if (!isLocalHumanActing) {
    status = actor?.isAI ? tf('statusAiPlaying', lang, { name: currentP.name }) : t('statusWaiting', lang);
  } else if (resting) {
    status = tf('statusResting', lang, { name: actor!.name });
  } else if (actor!.inDetention && !state.hasRolledThisTurn) {
    status = tf('statusDetention', lang, { name: actor!.name });
  } else if (!state.hasRolledThisTurn) {
    status = buyableHere ? tf('statusBuyFirst', lang, { name: actor!.name }) : tf('statusYourTurn', lang, { name: actor!.name });
  } else if (state.doublesStreak > 0 && state.doublesStreak < 3) {
    status = t('statusDoubles', lang);
  } else {
    status = tf('statusManage', lang, { name: actor!.name });
  }

  const canRoll =
    isLocalHumanActing && !negative && !resting && (!state.hasRolledThisTurn || (state.doublesStreak > 0 && state.doublesStreak < 3));
  const canEndTurn = isLocalHumanActing && !negative && (state.hasRolledThisTurn || resting);
  const showPayFine = isLocalHumanActing && !state.hasRolledThisTurn && actor!.inDetention;
  const canUsePaper = isLocalHumanActing && !state.hasRolledThisTurn && actor!.inDetention && actor!.releasePapers > 0;
  const canManage = isLocalHumanActing;
  // The transport network is a bonus for ending a dice roll on an owned station.
  const canTravelNetwork =
    isLocalHumanActing &&
    !negative &&
    state.networkTravelEligible &&
    !state.networkTravelUsed &&
    here?.kind === 'infrastructure' &&
    !!state.ownership[here.id]?.ownerId;
  const canBribe = isLocalHumanActing && here?.kind === 'corner-bribe' && !state.bribeGambleUsedThisTurn;

  return (
    <div className={`action-bar action-bar--${variant}${variant === 'bar' ? ' panel' : ''}`}>
      <div className="action-bar__info">
        <Dice dice={state.dice} rolling={state.hasRolledThisTurn} />
        <div className="action-bar__status" role="status">
          {status}
        </div>
      </div>
      <div className="action-bar__buttons">
        {buyableHere && (
          <CostButton
            label={t('buy', lang)}
            cost={priceAfterDiscount(state, actorId!, here!.id)}
            cash={actor!.cash}
            lang={lang}
            onClick={() => dispatch({ type: 'BUY_PROPERTY' }, actorId!)}
          />
        )}
        {canRoll && (
          <button className="btn btn--primary btn--roll" onClick={() => dispatch({ type: 'ROLL_DICE' }, actorId!)}>
            {state.hasRolledThisTurn ? t('rollAgain', lang) : t('rollDice', lang)}
          </button>
        )}
        {humanTurn && negative && onOpenDebt && (
          <button className="btn btn--danger" onClick={onOpenDebt}>
            {t('debtOptions', lang)}
          </button>
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
        {canBribe && (
          <button className="btn btn--risk" onClick={onOpenBribe}>
            {t('bribeOfficial', lang)}
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
        {canManage && (
          <button className="btn btn--gold" onClick={onOpenTrade}>
            {t('trade', lang)}
          </button>
        )}
        {canEndTurn && (
          <button className="btn btn--end" onClick={() => dispatch({ type: 'END_TURN' }, actorId!)}>
            {t('endTurn', lang)}
          </button>
        )}
      </div>
    </div>
  );
}
