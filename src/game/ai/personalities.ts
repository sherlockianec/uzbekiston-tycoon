import type { Difficulty, PersonalityId } from '../types';

export interface PersonalityTraits {
  id: PersonalityId;
  label: string;
  labelUz: string;
  description: string;
  descriptionUz: string;
  /** Won't spend more than this fraction of current cash on one purchase. */
  buyThreshold: number;
  /** So'm the AI tries to keep in reserve after acting. */
  cashReserve: number;
  /** 0-1: how eagerly it develops owned full groups. */
  developAggressiveness: number;
  /** 0-1: how likely it is to accept a fair-ish trade. */
  tradeWillingness: number;
  /** 0-1: chance of ignoring the "rational" choice and doing something looser. */
  chaos: number;
}

export const PERSONALITIES: Record<PersonalityId, PersonalityTraits> = {
  conservative: {
    id: 'conservative',
    label: 'Conservative Investor',
    labelUz: 'Ehtiyotkor investor',
    description: 'Rarely buys overpriced property, saves cash, builds monopolies carefully.',
    descriptionUz: "Qimmat mulkni kamdan-kam sotib oladi, pulni tejaydi, ehtiyotkorlik bilan rivojlanadi.",
    buyThreshold: 0.65,
    cashReserve: 3_000_000,
    developAggressiveness: 0.6,
    tradeWillingness: 0.3,
    chaos: 0.1,
  },
  aggressive: {
    id: 'aggressive',
    label: 'Aggressive Tycoon',
    labelUz: 'Tajovuzkor magnat',
    description: 'Buys almost everything, makes bold trades, often runs low on cash.',
    descriptionUz: "Deyarli hamma narsani sotib oladi, dadil savdo qiladi, ko'pincha puli kamayib qoladi.",
    buyThreshold: 0.85,
    cashReserve: 1_000_000,
    developAggressiveness: 0.8,
    tradeWillingness: 0.7,
    chaos: 0.3,
  },
  developer: {
    id: 'developer',
    label: 'Real Estate Developer',
    labelUz: 'Ko\u02bbchmas mulk quruvchisi',
    description: 'Prioritizes completing property groups and builds aggressively.',
    descriptionUz: "Mulk guruhlarini to'ldirishga ustuvorlik beradi va tez rivojlantiradi.",
    buyThreshold: 0.7,
    cashReserve: 2_000_000,
    developAggressiveness: 0.95,
    tradeWillingness: 0.6,
    chaos: 0.2,
  },
  banker: {
    id: 'banker',
    label: 'Banker',
    labelUz: 'Bankir',
    description: 'Keeps large cash reserves and buys only strategically.',
    descriptionUz: "Katta pul zaxirasini saqlaydi va faqat strategik xarid qiladi.",
    buyThreshold: 0.6,
    cashReserve: 3_500_000,
    developAggressiveness: 0.6,
    tradeWillingness: 0.4,
    chaos: 0.1,
  },
  chaotic: {
    id: 'chaotic',
    label: 'Chaotic Entrepreneur',
    labelUz: 'Betartib tadbirkor',
    description: 'Makes unpredictable trades and purchases — occasionally brilliant.',
    descriptionUz: "Kutilmagan savdo va xaridlar qiladi — ba'zan ajoyib natija beradi.",
    buyThreshold: 0.65,
    cashReserve: 1_500_000,
    developAggressiveness: 0.6,
    tradeWillingness: 0.9,
    chaos: 0.6,
  },
};

export const DIFFICULTY_LABELS: Record<Difficulty, { label: string; labelUz: string }> = {
  easy: { label: 'Easy', labelUz: "Oson" },
  normal: { label: 'Normal', labelUz: "O'rtacha" },
  hard: { label: 'Hard', labelUz: 'Qiyin' },
};

/** 30 Uzbek first names (Latin spelling is what is stored; the UI shows Cyrillic forms in ru / uz-cyrl). */
export const AI_FIRST_NAMES = [
  'Aziz', 'Dilnoza', 'Botir', 'Sherzod', 'Malika', 'Jasur', 'Nodira', 'Farrux', 'Gulnora', 'Rustam',
  'Zarina', 'Kamron', 'Ulugbek', 'Madina', 'Otabek', 'Sevara', 'Bobur', 'Lola', 'Timur', 'Nigora',
  'Akmal', 'Feruza', 'Sardor', 'Shahlo', 'Doniyor', 'Munisa', 'Javlon', 'Dildora', 'Eldor', 'Laylo',
] as const;

/** A random free name. `rand` is injectable so tests stay deterministic. */
export function pickAiName(_index: number, takenNames: string[], rand: () => number = Math.random): string {
  const available = AI_FIRST_NAMES.filter((n) => !takenNames.includes(n));
  const pool = available.length ? available : AI_FIRST_NAMES;
  return pool[Math.floor(rand() * pool.length)];
}
