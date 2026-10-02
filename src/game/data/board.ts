import type { BoardSpace, SpaceKind } from '../types';
import { PROPERTIES, INFRASTRUCTURE, UTILITIES, TAXES } from './properties';

// A classic 40-space, 4-sided, 11x11-corner layout — the generic structural
// shape shared by countless property-trading board games. Everything placed
// on it (names, art, card text, board order of themes) is original to this
// project.
//
// index 0            -> start corner (bottom-right)
// index 1-9          -> bottom row, right to left
// index 10           -> detention corner (bottom-left)
// index 11-19        -> left column, bottom to top
// index 20           -> rest corner (top-left)
// index 21-29        -> top row, left to right
// index 30           -> go-to-detention corner (top-right)
// index 31-39        -> right column, top to bottom

interface Slot {
  id: string;
  kind: SpaceKind;
}

const SLOTS: Slot[] = [
  { id: 'start', kind: 'corner-start' }, // 0
  { id: 'chorsu-bazaar', kind: 'property' }, // 1
  { id: 'mahalla-card-1', kind: 'card-mahalla' }, // 2
  { id: 'qumtepa-bazaar', kind: 'property' }, // 3
  { id: 'income-tax', kind: 'tax' }, // 4
  { id: 'uzbekistan-railways', kind: 'infrastructure' }, // 5
  { id: 'korzinka', kind: 'property' }, // 6
  { id: 'business-card-1', kind: 'card-business' }, // 7
  { id: 'havas', kind: 'property' }, // 8
  { id: 'makro', kind: 'property' }, // 9
  { id: 'detention', kind: 'corner-detention' }, // 10
  { id: 'mobiuz', kind: 'property' }, // 11
  { id: 'uzbekneftegaz', kind: 'utility' }, // 12
  { id: 'ucell', kind: 'property' }, // 13
  { id: 'beeline', kind: 'property' }, // 14
  { id: 'uzbekistan-airways', kind: 'infrastructure' }, // 15
  { id: 'click', kind: 'property' }, // 16
  { id: 'mahalla-card-2', kind: 'card-mahalla' }, // 17
  { id: 'payme', kind: 'property' }, // 18
  { id: 'uzum', kind: 'property' }, // 19
  { id: 'rest', kind: 'corner-rest' }, // 20
  { id: 'agrobank', kind: 'property' }, // 21
  { id: 'business-card-2', kind: 'card-business' }, // 22
  { id: 'hamkorbank', kind: 'property' }, // 23
  { id: 'kapitalbank', kind: 'property' }, // 24
  { id: 'qanot-sharq', kind: 'infrastructure' }, // 25
  { id: 'murad-buildings', kind: 'property' }, // 26
  { id: 'enter-engineering', kind: 'property' }, // 27
  { id: 'uzbekenergo', kind: 'utility' }, // 28
  { id: 'akfa', kind: 'property' }, // 29
  { id: 'go-to-detention', kind: 'corner-go-to-detention' }, // 30
  { id: 'uzmetkombinat', kind: 'property' }, // 31
  { id: 'almalyk-mmc', kind: 'property' }, // 32
  { id: 'mahalla-card-3', kind: 'card-mahalla' }, // 33
  { id: 'navoiy-mmc', kind: 'property' }, // 34
  { id: 'tashkent-metro', kind: 'infrastructure' }, // 35
  { id: 'local-official', kind: 'corruption' }, // 36
  { id: 'tashkent-city', kind: 'property' }, // 37
  { id: 'customs-duty', kind: 'tax' }, // 38
  { id: 'tibc', kind: 'property' }, // 39
];

export const BOARD: BoardSpace[] = SLOTS.map((s, index) => ({
  id: s.id,
  index,
  kind: s.kind,
}));

export const BOARD_SIZE = BOARD.length; // 40

export const CORNER_NAMES: Record<string, { name: string; nameUz: string; nameRu: string; nameUzCyrl: string }> = {
  start: { name: 'START', nameUz: 'BOSHLANISH', nameRu: '\u0421\u0422\u0410\u0420\u0422', nameUzCyrl: '\u0411\u041e\u0428\u041b\u0410\u041d\u0418\u0428' },
  detention: {
    name: 'Tax Inspection',
    nameUz: 'Soliq tekshiruvi',
    nameRu: '\u041d\u0430\u043b\u043e\u0433\u043e\u0432\u0430\u044f \u0438\u043d\u0441\u043f\u0435\u043a\u0446\u0438\u044f',
    nameUzCyrl: '\u0421\u043e\u043b\u0438\u049b \u0442\u0435\u043a\u0448\u0438\u0440\u0443\u0432\u0438',
  },
  rest: {
    name: 'Chorsu Choyxona',
    nameUz: 'Chorsu Choyxonasi',
    nameRu: '\u0427\u0430\u0439\u0445\u0430\u043d\u0430 \u0427\u043e\u0440\u0441\u0443',
    nameUzCyrl: '\u0427\u043e\u0440\u0441\u0443 \u0447\u043e\u0439\u062e\u043e\u043d\u0430\u0441\u0438',
  },
  'go-to-detention': {
    name: 'Go to Inspection',
    nameUz: 'Tekshiruvga!',
    nameRu: '\u041d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443!',
    nameUzCyrl: '\u0422\u0435\u043a\u0448\u0438\u0440\u0443\u0432\u0433\u0430!',
  },
};

const CARD_LABELS = {
  mahalla: { name: 'Mahalla', nameUz: 'Mahalla', nameRu: '\u041c\u0430\u0445\u0430\u043b\u043b\u044f', nameUzCyrl: '\u041c\u0430\u04b3\u0430\u043b\u043b\u0430' },
  business: {
    name: 'Business Opportunity',
    nameUz: 'Biznes imkoniyati',
    nameRu: '\u0411\u0438\u0437\u043d\u0435\u0441-\u0432\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u044c',
    nameUzCyrl: '\u0411\u0438\u0437\u043d\u0435\u0441 \u0438\u043c\u043a\u043e\u043d\u0438\u044f\u0442\u0438',
  },
};

const CORRUPTION_LABEL = {
  name: 'Local Official',
  nameUz: 'Mahalliy amaldor',
  nameRu: '\u041c\u0435\u0441\u0442\u043d\u044b\u0439 \u0447\u0438\u043d\u043e\u0432\u043d\u0438\u043a',
  nameUzCyrl: '\u041c\u0430\u04b3\u0430\u043b\u043b\u0438\u0439 \u0430\u043c\u0430\u043b\u0434\u043e\u0440',
};

export function spaceById(id: string): BoardSpace {
  const space = BOARD.find((s) => s.id === id);
  if (!space) throw new Error(`Unknown space id: ${id}`);
  return space;
}

export function spaceLabel(space: BoardSpace): { name: string; nameUz: string; nameRu: string; nameUzCyrl: string } {
  switch (space.kind) {
    case 'property':
      return withFallback(PROPERTIES[space.id]);
    case 'infrastructure':
      return withFallback(INFRASTRUCTURE[space.id]);
    case 'utility':
      return withFallback(UTILITIES[space.id]);
    case 'tax':
      return TAXES[space.id];
    case 'corruption':
      return CORRUPTION_LABEL;
    case 'card-mahalla':
      return CARD_LABELS.mahalla;
    case 'card-business':
      return CARD_LABELS.business;
    default:
      return CORNER_NAMES[space.id] ?? { name: space.id, nameUz: space.id, nameRu: space.id, nameUzCyrl: space.id };
  }
}

function withFallback(def: { name: string; nameUz: string; nameRu?: string; nameUzCyrl?: string }) {
  return { name: def.name, nameUz: def.nameUz, nameRu: def.nameRu ?? def.name, nameUzCyrl: def.nameUzCyrl ?? def.nameUz };
}

/** Nearest space of a given kind at or after `fromIndex`, wrapping around the board. */
export function nearestSpaceOfKind(fromIndex: number, kinds: SpaceKind[]): BoardSpace {
  for (let step = 1; step <= BOARD_SIZE; step++) {
    const idx = (fromIndex + step) % BOARD_SIZE;
    if (kinds.includes(BOARD[idx].kind)) return BOARD[idx];
  }
  throw new Error('No matching space found on board');
}

/** Nearest property belonging to a specific group, searching forward from fromIndex. */
export function nearestPropertyInGroup(fromIndex: number, groupPropertyIds: string[]): BoardSpace {
  for (let step = 1; step <= BOARD_SIZE; step++) {
    const idx = (fromIndex + step) % BOARD_SIZE;
    if (groupPropertyIds.includes(BOARD[idx].id)) return BOARD[idx];
  }
  throw new Error('No matching group property found on board');
}
