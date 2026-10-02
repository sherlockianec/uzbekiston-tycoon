import { useActiveGame } from '../state/GameProvider';
import { nextActorId } from '../game/ai/aiPlayer';
import { BOARD } from '../game/data/board';
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
}

export default function ActionBar({ onOpenTrade, onOpenBuild, onOpenBank, onOpenNetworkTravel, onOpenBribe }: ActionBarProps) {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const currentP = state.players[state.currentPlayerIndex];
  const actorId = nextActorId(state);
  const actor = state.players.find((p) => p.id === actorId);
  const isLocalHumanActing = !!actor && !actor.isAI && state.phase === 'AWAITING_ROLL';
  const currentFine = actor ? DETENTION_FINE_SCHEDULE[Math.min(actor.detentionTurns, DETENTION_FINE_SCHEDULE.length - 1)] : 0;

  let status: string;
  if (state.phase === 'GAME_OVER') {
    status = '';
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
  const canManage = isLocalHumanActing;
  const standingOnInfra = !!actor && BOARD[actor.position]?.kind === 'infrastructure';
  const canTravelNetwork = canManage && standingOnInfra && !state.networkTravelUsed;
  const canBribe = canManage && !state.bribeGambleUsedThisTurn;

  return (
    <div className="panel action-bar">
      <Dice dice={state.dice} rolling={state.hasRolledThisTurn} />
      <div className="action-bar__status">{status}</div>
      <div className="action-bar__buttons">
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
        {canManage && (
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
