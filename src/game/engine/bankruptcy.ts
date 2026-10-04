import type { GameState } from '../types';
import { advanceTurn, appendLog, getPlayer, updateOwnership, updatePlayer } from './helpers';

/**
 * The player gives up (only offered while their balance is negative). Every
 * property returns to the bank - unowned, undeveloped, unmortgaged - and is
 * free to buy and trade again. Whatever was already paid out stays paid out.
 * Ends the turn and checks the win condition.
 */
export function declareBankruptcy(state: GameState, playerId: string): GameState {
  const player = getPlayer(state, playerId);
  let next = state;
  for (const [spaceId, ownership] of Object.entries(state.ownership)) {
    if (ownership.ownerId !== playerId) continue;
    next = updateOwnership(next, spaceId, () => ({ ownerId: null, level: 0, mortgaged: false, mortgageLapsRemaining: null }));
  }
  const bankruptOrder = next.players.filter((p) => p.bankrupt).length + 1;
  next = updatePlayer(next, playerId, (p) => ({ ...p, cash: 0, loan: null, bankrupt: true, bankruptOrder, inDetention: false, resting: false }));
  next = appendLog(next, `${player.name} went bankrupt. Their properties return to the bank.`);
  next = { ...next, drawnCard: null, drawnCardDeck: null, trade: null };

  const survivors = next.players.filter((p) => !p.bankrupt);
  if (survivors.length <= 1) {
    return { ...next, phase: 'GAME_OVER', winnerId: survivors[0]?.id ?? null };
  }
  return advanceTurn(next);
}
