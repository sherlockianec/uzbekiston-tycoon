import type { GameState, PropertyDef } from '../types';
import {
  PROPERTIES,
  INFRASTRUCTURE,
  UTILITIES,
  GROUPS,
  isPropertyId,
  isInfrastructureId,
  isUtilityId,
  groupOf,
} from '../data/properties';
import { DEVELOPMENT_LEVEL_NAMES, MORTGAGE_DEADLINE_LAPS, MORTGAGE_WARNING_LAPS } from '../data/economy';
import { formatSom } from '../../utils/currency';
import {
  appendLog,
  costToReachNextLevel,
  getPlayer,
  ownableDef,
  playersOwning,
  refundForCurrentLevel,
  updateOwnership,
  updatePlayer,
} from './helpers';

export { costToReachNextLevel, refundForCurrentLevel };

export function ownsFullGroup(state: GameState, playerId: string, groupId: string): boolean {
  const group = GROUPS.find((g) => g.id === groupId);
  if (!group) return false;
  return group.propertyIds.every((id) => state.ownership[id].ownerId === playerId);
}

function groupHasMortgagedSibling(state: GameState, groupId: string): boolean {
  const group = GROUPS.find((g) => g.id === groupId);
  if (!group) return false;
  return group.propertyIds.some((id) => state.ownership[id].mortgaged);
}


export function canBuy(state: GameState, playerId: string, spaceId: string): boolean {
  const o = state.ownership[spaceId];
  if (!o || o.ownerId) return false;
  const price = priceAfterDiscount(state, playerId, spaceId);
  return getPlayer(state, playerId).cash >= price;
}

/** The price this player would actually pay right now, after consuming any
 * sticky purchase-discount buff they're holding. */
export function priceAfterDiscount(state: GameState, playerId: string, spaceId: string): number {
  const price = ownableDef(spaceId).price;
  const discount = getPlayer(state, playerId).purchaseDiscountPercent;
  if (!discount) return price;
  return Math.round((price * (1 - discount / 100)) / 1000) * 1000;
}

/** `ignoreCash` answers "would this be allowed if the player had the money?" so the UI
 * can show a red, explained button instead of hiding the option. */
export function canDevelop(state: GameState, playerId: string, spaceId: string, ignoreCash = false): boolean {
  if (!isPropertyId(spaceId)) return false;
  const o = state.ownership[spaceId];
  const def = PROPERTIES[spaceId];
  if (o.ownerId !== playerId || o.mortgaged) return false;
  if (o.level >= 5) return false;
  if (!ownsFullGroup(state, playerId, def.groupId)) return false;
  if (groupHasMortgagedSibling(state, def.groupId)) return false;
  if (!ignoreCash && getPlayer(state, playerId).cash < costToReachNextLevel(def, o.level)) return false;
  const group = groupOf(spaceId);
  const minLevel = Math.min(...group.propertyIds.map((id) => state.ownership[id].level));
  return o.level === minLevel; // even-building rule: develop the lowest level in the group first
}

export function canSellDevelopment(state: GameState, playerId: string, spaceId: string): boolean {
  if (!isPropertyId(spaceId)) return false;
  const o = state.ownership[spaceId];
  if (o.ownerId !== playerId || o.level <= 0) return false;
  const group = groupOf(spaceId);
  const maxLevel = Math.max(...group.propertyIds.map((id) => state.ownership[id].level));
  return o.level === maxLevel; // sell the highest level in the group first
}

export function canMortgage(state: GameState, playerId: string, spaceId: string): boolean {
  const o = state.ownership[spaceId];
  if (!o || o.ownerId !== playerId || o.mortgaged) return false;
  if (isPropertyId(spaceId) && o.level > 0) return false;
  return true;
}

export function canUnmortgage(state: GameState, playerId: string, spaceId: string, ignoreCash = false): boolean {
  const o = state.ownership[spaceId];
  if (!o || o.ownerId !== playerId || !o.mortgaged) return false;
  if (ignoreCash) return true;
  return getPlayer(state, playerId).cash >= ownableDef(spaceId).unmortgageCost;
}

/** Rent owed if `spaceId` (owned by someone other than the roller) is landed
 * on. 0 if unowned/self-owned/mortgaged — or if the owner is currently in
 * Tax Inspection, since a business with no one minding it earns nothing. */
export function computeRent(state: GameState, spaceId: string, diceSum: number, rentMultiplier = 1): number {
  const o = state.ownership[spaceId];
  if (!o.ownerId || o.mortgaged) return 0;
  if (getPlayer(state, o.ownerId).inDetention) return 0;

  if (isPropertyId(spaceId)) {
    const def = PROPERTIES[spaceId];
    if (o.level > 0) return def.rentTable[1 + o.level] * rentMultiplier;
    const fullSet = ownsFullGroup(state, o.ownerId, def.groupId);
    return (fullSet ? def.rentTable[1] : def.rentTable[0]) * rentMultiplier;
  }

  if (isInfrastructureId(spaceId)) {
    const ownedCount = playersOwning(state, o.ownerId, Object.keys(INFRASTRUCTURE)).length;
    const def = INFRASTRUCTURE[spaceId];
    return def.rentTable[Math.min(ownedCount, 4) - 1] * rentMultiplier;
  }

  if (isUtilityId(spaceId)) {
    const ownedCount = playersOwning(state, o.ownerId, Object.keys(UTILITIES)).length;
    const def = UTILITIES[spaceId];
    const mult = ownedCount >= 2 ? def.diceMultiplier.both : def.diceMultiplier.one;
    return diceSum * mult * def.unitValue * rentMultiplier;
  }

  return 0;
}

export function buyProperty(state: GameState, playerId: string, spaceId: string): GameState {
  const def = ownableDef(spaceId);
  const price = priceAfterDiscount(state, playerId, spaceId);
  const hadDiscount = !!getPlayer(state, playerId).purchaseDiscountPercent;
  let next = updatePlayer(state, playerId, (p) => ({ ...p, cash: p.cash - price, purchaseDiscountPercent: null }));
  next = updateOwnership(next, spaceId, (o) => ({ ...o, ownerId: playerId }));
  next = appendLog(
    next,
    `${getPlayer(state, playerId).name} bought ${def.name} for ${formatSom(price)}${hadDiscount ? ' (discount applied)' : ''}.`
  );
  return next;
}

export function developProperty(state: GameState, playerId: string, spaceId: string): GameState {
  const def = PROPERTIES[spaceId];
  const currentLevel = state.ownership[spaceId].level;
  const cost = costToReachNextLevel(def, currentLevel);
  let next = updatePlayer(state, playerId, (p) => ({ ...p, cash: p.cash - cost }));
  next = updateOwnership(next, spaceId, (o) => ({ ...o, level: o.level + 1 }));
  const newLevel = currentLevel + 1;
  next = appendLog(
    next,
    `${getPlayer(state, playerId).name} developed ${def.name} to ${DEVELOPMENT_LEVEL_NAMES[newLevel]} (${formatSom(cost)}).`
  );
  return next;
}

export function sellDevelopment(state: GameState, playerId: string, spaceId: string): GameState {
  const def = PROPERTIES[spaceId];
  const currentLevel = state.ownership[spaceId].level;
  const refund = refundForCurrentLevel(def, currentLevel);
  let next = updatePlayer(state, playerId, (p) => ({ ...p, cash: p.cash + refund }));
  next = updateOwnership(next, spaceId, (o) => ({ ...o, level: o.level - 1 }));
  const newLevel = currentLevel - 1;
  next = appendLog(
    next,
    `${getPlayer(state, playerId).name} sold a development level on ${def.name}, back to ${DEVELOPMENT_LEVEL_NAMES[newLevel]} (+${formatSom(
      refund
    )}).`
  );
  return next;
}

export function mortgageProperty(state: GameState, playerId: string, spaceId: string): GameState {
  const def = ownableDef(spaceId);
  let next = updateOwnership(state, spaceId, (o) => ({ ...o, mortgaged: true, mortgageLapsRemaining: MORTGAGE_DEADLINE_LAPS }));
  next = updatePlayer(next, playerId, (p) => ({ ...p, cash: p.cash + def.mortgageValue }));
  next = appendLog(
    next,
    `${getPlayer(state, playerId).name} mortgaged ${def.name} for ${formatSom(def.mortgageValue)} (redeem within ${MORTGAGE_DEADLINE_LAPS} laps or the bank forecloses).`
  );
  return next;
}

export function unmortgageProperty(state: GameState, playerId: string, spaceId: string): GameState {
  const def = ownableDef(spaceId);
  let next = updateOwnership(state, spaceId, (o) => ({ ...o, mortgaged: false, mortgageLapsRemaining: null }));
  next = updatePlayer(next, playerId, (p) => ({ ...p, cash: p.cash - def.unmortgageCost }));
  next = appendLog(next, `${getPlayer(state, playerId).name} paid off the mortgage on ${def.name}.`);
  return next;
}

/** Laps left to redeem a mortgaged asset, or null if it is not mortgaged. */
export function mortgageLapsLeft(state: GameState, spaceId: string): number | null {
  const o = state.ownership[spaceId];
  if (!o || !o.mortgaged) return null;
  return o.mortgageLapsRemaining;
}

/** True when a mortgaged asset is close enough to foreclosure to warn about. */
export function isMortgageUrgent(state: GameState, spaceId: string): boolean {
  const laps = mortgageLapsLeft(state, spaceId);
  return laps != null && laps <= MORTGAGE_WARNING_LAPS;
}
