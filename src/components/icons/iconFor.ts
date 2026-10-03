import type { BoardSpace } from '../../game/types';
import type { IconName } from './paths';

const GROUP_ICONS: Record<string, IconName> = {
  bazaars: 'group-bazaars',
  retail: 'group-retail',
  telecom: 'group-telecom',
  fintech: 'group-fintech',
  banking: 'group-banking',
  construction: 'group-construction',
  mining: 'group-mining',
  capital: 'group-capital',
};

const ASSET_ICONS: Record<string, IconName> = {
  'uzbekistan-railways': 'infra-railways',
  'uzbekistan-airways': 'infra-airways',
  'qanot-sharq': 'infra-qanot-sharq',
  'tashkent-metro': 'infra-metro',
  uzbekneftegaz: 'utility-oil-gas',
  uzbekenergo: 'utility-power',
};

const CORNER_ICONS: Record<string, IconName> = {
  start: 'start',
  detention: 'detention',
  rest: 'rest',
  'bribe-official': 'bribe-official',
};

export function groupIconName(groupId: string): IconName | null {
  return GROUP_ICONS[groupId] ?? null;
}

/** Icon for a transport asset or utility network, by id. */
export function assetIconName(spaceId: string): IconName | null {
  return ASSET_ICONS[spaceId] ?? null;
}

/** Icon for a non-property board cell (cards, taxes, the Local Official, corners). */
export function specialIconName(space: Pick<BoardSpace, 'id' | 'kind'>): IconName | null {
  switch (space.kind) {
    case 'card-mahalla':
      return 'card-mahalla';
    case 'card-business':
      return 'card-business';
    case 'tax':
      return 'tax';
    case 'corruption':
      return 'corruption';
    default:
      return CORNER_ICONS[space.id] ?? null;
  }
}

export const GROUP_ICON_IDS = Object.keys(GROUP_ICONS);
export const ASSET_ICON_IDS = Object.keys(ASSET_ICONS);
