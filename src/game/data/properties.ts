import type { GroupDef, InfrastructureDef, PropertyDef, TaxDef, UtilityDef } from '../types';
import {
  buildRentTable,
  developmentCostFor,
  developmentCostLevel5For,
  mortgageValueFor,
  unmortgageCostFor,
  INFRASTRUCTURE_PRICE,
  INFRASTRUCTURE_RENT_TABLE,
  UTILITY_PRICE,
  UTILITY_DICE_MULTIPLIER,
  UTILITY_UNIT_VALUE,
  PROPERTY_TAX_PER_ASSET,
} from './economy';

// ---------------------------------------------------------------------------
// NOTE ON REAL COMPANY NAMES
// Real Uzbek company names are used here purely as thematic flavor text, the
// way countless fan-made "-opoly" style board games reference local
// businesses. No affiliation, sponsorship or ownership by any named company
// is implied anywhere in this game (see the in-app footer disclaimer).
// No real logos or brand artwork are used anywhere in this project —
// ownership/branding is represented with original abstract iconography only.
// ---------------------------------------------------------------------------

interface RawProperty {
  id: string;
  name: string;
  nameUz: string;
  groupId: string;
  price: number;
  description: string;
}

const RAW_PROPERTIES: RawProperty[] = [
  // Group A — Mahalla Bazaars
  { id: 'chorsu-bazaar', name: 'Chorsu Bazaar', nameUz: "Chorsu Bozori", groupId: 'bazaars', price: 600_000, description: 'A sprawling, centuries-old covered market. Cheap stalls, huge foot traffic.' },
  { id: 'qumtepa-bazaar', name: 'Qumtepa Bazaar', nameUz: 'Qumtepa Bozori', groupId: 'bazaars', price: 700_000, description: 'A busy neighbourhood bazaar known for its produce and textiles.' },

  // Group B — Retail Chains
  { id: 'korzinka', name: 'Korzinka', nameUz: 'Korzinka', groupId: 'retail', price: 900_000, description: 'A nationwide supermarket chain, a fixture of every mahalla.' },
  { id: 'havas', name: 'Havas', nameUz: 'Havas', groupId: 'retail', price: 1_000_000, description: 'An electronics and appliance retail chain.' },
  { id: 'makro', name: 'Makro', nameUz: 'Makro', groupId: 'retail', price: 1_100_000, description: 'A wholesale and cash-and-carry retail chain.' },

  // Group C — Telecom
  { id: 'mobiuz', name: 'Mobiuz', nameUz: 'Mobiuz', groupId: 'telecom', price: 1_200_000, description: 'A newer mobile network operator, expanding fast.' },
  { id: 'ucell', name: 'Ucell', nameUz: 'Ucell', groupId: 'telecom', price: 1_300_000, description: 'A major mobile and data network operator.' },
  { id: 'beeline', name: 'Beeline Uzbekistan', nameUz: 'Beeline O\u02bbzbekiston', groupId: 'telecom', price: 1_400_000, description: 'One of the country\u2019s largest telecom networks.' },

  // Group D — Fintech & Digital
  { id: 'click', name: 'Click', nameUz: 'Click', groupId: 'fintech', price: 1_600_000, description: 'A mobile payments and e-commerce platform.' },
  { id: 'payme', name: 'Payme', nameUz: 'Payme', groupId: 'fintech', price: 1_700_000, description: 'A digital wallet and bill-payment app used nationwide.' },
  { id: 'uzum', name: 'Uzum', nameUz: 'Uzum', groupId: 'fintech', price: 1_800_000, description: 'A fast-growing marketplace and fintech super-app.' },

  // Group E — Banking
  { id: 'agrobank', name: 'Agrobank', nameUz: 'Agrobank', groupId: 'banking', price: 1_900_000, description: 'A commercial bank historically focused on agricultural lending.' },
  { id: 'hamkorbank', name: 'Hamkorbank', nameUz: 'Hamkorbank', groupId: 'banking', price: 2_000_000, description: 'A commercial bank with a large regional branch network.' },
  { id: 'kapitalbank', name: 'Kapitalbank', nameUz: 'Kapitalbank', groupId: 'banking', price: 2_100_000, description: 'One of the country\u2019s largest private banks.' },

  // Group F — Construction & Industry
  { id: 'murad-buildings', name: 'Murad Buildings', nameUz: 'Murad Buildings', groupId: 'construction', price: 2_300_000, description: 'A residential and commercial property developer.' },
  { id: 'enter-engineering', name: 'Enter Engineering', nameUz: 'Enter Engineering', groupId: 'construction', price: 2_400_000, description: 'A large industrial and civil engineering contractor.' },
  { id: 'akfa', name: 'AKFA', nameUz: 'AKFA', groupId: 'construction', price: 2_500_000, description: 'A construction-materials and consumer-goods conglomerate.' },

  // Group G — Mining & Energy
  { id: 'uzmetkombinat', name: 'Uzmetkombinat', nameUz: 'Uzmetkombinat', groupId: 'mining', price: 2_600_000, description: 'A metallurgical combine producing steel and rolled metal.' },
  { id: 'almalyk-mmc', name: 'Almalyk MMC', nameUz: 'Olmaliq KMK', groupId: 'mining', price: 2_800_000, description: 'A mining and metallurgical combine processing copper ore.' },
  { id: 'navoiy-mmc', name: 'Navoiy MMC', nameUz: 'Navoiy KMK', groupId: 'mining', price: 3_000_000, description: 'One of the world\u2019s largest gold-mining operations.' },

  // Group H — Capital Holdings (premium)
  { id: 'tashkent-city', name: 'Tashkent City', nameUz: 'Toshkent Siti', groupId: 'capital', price: 3_500_000, description: 'A large-scale mixed-use business and residential district.' },
  { id: 'tibc', name: 'Tashkent International Business Center', nameUz: 'Toshkent Xalqaro Biznes Markazi', groupId: 'capital', price: 4_000_000, description: 'The tallest tower in the capital\u2019s financial district.' },
];

export const GROUPS: GroupDef[] = [
  { id: 'bazaars', name: 'Mahalla Bazaars', nameUz: 'Mahalla Bozorlari', nameRu: '\u0411\u0430\u0437\u0430\u0440\u044b \u043c\u0430\u0445\u0430\u043b\u043b\u0438', nameUzCyrl: '\u041c\u0430\u04b3\u0430\u043b\u043b\u0430 \u0431\u043e\u0437\u043e\u0440\u043b\u0430\u0440\u0438', color: '#A08868', propertyIds: ['chorsu-bazaar', 'qumtepa-bazaar'] },
  { id: 'retail', name: 'Retail Chains', nameUz: 'Chakana Savdo', nameRu: '\u0420\u043e\u0437\u043d\u0438\u0447\u043d\u044b\u0435 \u0441\u0435\u0442\u0438', nameUzCyrl: '\u0427\u0430\u043a\u0430\u043d\u0430 \u0441\u0430\u0432\u0434\u043e', color: '#4FA8D8', propertyIds: ['korzinka', 'havas', 'makro'] },
  { id: 'telecom', name: 'Telecom', nameUz: 'Aloqa', nameRu: '\u0422\u0435\u043b\u0435\u043a\u043e\u043c', nameUzCyrl: '\u0410\u043b\u043e\u049b\u0430', color: '#8B6FD9', propertyIds: ['mobiuz', 'ucell', 'beeline'] },
  { id: 'fintech', name: 'Fintech & Digital', nameUz: 'Fintex', nameRu: '\u0424\u0438\u043d\u0442\u0435\u0445', nameUzCyrl: '\u0424\u0438\u043d\u0442\u0435\u0445', color: '#E0568F', propertyIds: ['click', 'payme', 'uzum'] },
  { id: 'banking', name: 'Banking', nameUz: 'Bank Ishi', nameRu: '\u0411\u0430\u043d\u043a\u0438', nameUzCyrl: '\u0411\u0430\u043d\u043a \u0438\u0448\u0438', color: '#C0392B', propertyIds: ['agrobank', 'hamkorbank', 'kapitalbank'] },
  { id: 'construction', name: 'Construction & Industry', nameUz: 'Qurilish', nameRu: '\u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e', nameUzCyrl: '\u049a\u0443\u0440\u0438\u043b\u0438\u0448', color: '#E0793A', propertyIds: ['murad-buildings', 'enter-engineering', 'akfa'] },
  { id: 'mining', name: 'Mining & Energy', nameUz: 'Kon-metallurgiya', nameRu: '\u0413\u043e\u0440\u043d\u043e-\u044d\u043d\u0435\u0440\u0433\u0435\u0442\u0438\u043a\u0430', nameUzCyrl: '\u041a\u043e\u043d-\u043c\u0435\u0442\u0430\u043b\u043b\u0443\u0440\u0433\u0438\u044f', color: '#3F9F63', propertyIds: ['uzmetkombinat', 'almalyk-mmc', 'navoiy-mmc'] },
  { id: 'capital', name: 'Capital Holdings', nameUz: 'Poytaxt Xoldingi', nameRu: '\u0421\u0442\u043e\u043b\u0438\u0447\u043d\u044b\u0435 \u0445\u043e\u043b\u0434\u0438\u043d\u0433\u0438', nameUzCyrl: '\u041f\u043e\u0439\u0442\u0430\u0445\u0442 \u0445\u043e\u043b\u0434\u0438\u043d\u0433\u0438', color: '#2FB8AF', propertyIds: ['tashkent-city', 'tibc'] },
];

export const PROPERTIES: Record<string, PropertyDef> = Object.fromEntries(
  RAW_PROPERTIES.map((p) => {
    const mortgageValue = mortgageValueFor(p.price);
    const def: PropertyDef = {
      id: p.id,
      name: p.name,
      nameUz: p.nameUz,
      groupId: p.groupId,
      price: p.price,
      description: p.description,
      mortgageValue,
      unmortgageCost: unmortgageCostFor(mortgageValue),
      developmentCost: developmentCostFor(p.price),
      developmentCostLevel5: developmentCostLevel5For(p.price),
      rentTable: buildRentTable(p.price),
    };
    return [p.id, def];
  })
);

export const PROPERTY_ORDER = RAW_PROPERTIES.map((p) => p.id);

interface RawInfra {
  id: string;
  name: string;
  nameUz: string;
}

const RAW_INFRASTRUCTURE: RawInfra[] = [
  { id: 'uzbekistan-railways', name: 'Uzbekistan Railways', nameUz: "O\u02bbzbekiston Temir Yo\u02bblari" },
  { id: 'uzbekistan-airways', name: 'Uzbekistan Airways', nameUz: "O\u02bbzbekiston Havo Yo\u02bblari" },
  { id: 'qanot-sharq', name: 'Qanot Sharq', nameUz: 'Qanot Sharq' },
  { id: 'tashkent-metro', name: 'Tashkent Metro', nameUz: 'Toshkent Metropoliteni' },
];

export const INFRASTRUCTURE: Record<string, InfrastructureDef> = Object.fromEntries(
  RAW_INFRASTRUCTURE.map((r) => {
    const mortgageValue = INFRASTRUCTURE_PRICE / 2;
    const def: InfrastructureDef = {
      id: r.id,
      name: r.name,
      nameUz: r.nameUz,
      price: INFRASTRUCTURE_PRICE,
      mortgageValue,
      unmortgageCost: unmortgageCostFor(mortgageValue),
      rentTable: INFRASTRUCTURE_RENT_TABLE,
    };
    return [r.id, def];
  })
);

interface RawUtility {
  id: string;
  name: string;
  nameUz: string;
}

const RAW_UTILITIES: RawUtility[] = [
  { id: 'uzbekneftegaz', name: 'Uzbekneftegaz', nameUz: 'Uzbekneftegaz' },
  { id: 'uzbekenergo', name: 'Uzbekenergo', nameUz: 'Uzbekenergo' },
];

export const UTILITIES: Record<string, UtilityDef> = Object.fromEntries(
  RAW_UTILITIES.map((r) => {
    const mortgageValue = UTILITY_PRICE / 2;
    const def: UtilityDef = {
      id: r.id,
      name: r.name,
      nameUz: r.nameUz,
      price: UTILITY_PRICE,
      mortgageValue,
      unmortgageCost: unmortgageCostFor(mortgageValue),
      diceMultiplier: UTILITY_DICE_MULTIPLIER,
      unitValue: UTILITY_UNIT_VALUE,
    };
    return [r.id, def];
  })
);

export const TAXES: Record<string, TaxDef> = {
  'income-tax': {
    id: 'income-tax',
    name: 'Income Tax',
    nameUz: 'Daromad solig\u02bbi',
    nameRu: '\u041f\u043e\u0434\u043e\u0445\u043e\u0434\u043d\u044b\u0439 \u043d\u0430\u043b\u043e\u0433',
    nameUzCyrl: '\u0414\u0430\u0440\u043e\u043c\u0430\u0434 \u0441\u043e\u043b\u0438\u0493\u0438',
    kind: 'percent',
    amount: 12,
  },
  'customs-duty': {
    id: 'customs-duty',
    name: 'Business Tax',
    nameUz: "Biznes solig'i",
    nameRu: '\u041d\u0430\u043b\u043e\u0433 \u043d\u0430 \u0431\u0438\u0437\u043d\u0435\u0441',
    nameUzCyrl: '\u0411\u0438\u0437\u043d\u0435\u0441 \u0441\u043e\u043b\u0438\u0493\u0438',
    kind: 'perAsset',
    amount: PROPERTY_TAX_PER_ASSET,
  },
};

export function isPropertyId(id: string): boolean {
  return id in PROPERTIES;
}
export function isInfrastructureId(id: string): boolean {
  return id in INFRASTRUCTURE;
}
export function isUtilityId(id: string): boolean {
  return id in UTILITIES;
}
export function isOwnableId(id: string): boolean {
  return isPropertyId(id) || isInfrastructureId(id) || isUtilityId(id);
}
export function groupOf(propertyId: string): GroupDef {
  const def = PROPERTIES[propertyId];
  const group = GROUPS.find((g) => g.id === def.groupId);
  if (!group) throw new Error(`No group for property ${propertyId}`);
  return group;
}
