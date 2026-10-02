// ---------------------------------------------------------------------------
// Central balance configuration. Every number in the game derives from here,
// so the whole economy can be re-tuned from one file.
//
// These are GAME BALANCE values, not real currency-exchange figures.
// ---------------------------------------------------------------------------

export const CURRENCY_SUFFIX = "so'm";

export const STARTING_CASH = 15_000_000;
export const GO_SALARY = 1_500_000;

// Detention ("Tax Inspection"): buyout cost decreases the longer you wait,
// so paying immediately is a real choice, not just the only rational one.
// Indexed by how many failed roll-attempts have already happened (0, 1, 2).
export const DETENTION_FINE_SCHEDULE = [600_000, 400_000, 200_000] as const;
export const MAX_DETENTION_TURNS = 3;

export const INCOME_TAX_PERCENT = 12; // percent of cash on hand

// Second tax: a flat fee per unmortgaged asset you own (property,
// infrastructure or utility), instead of one more flat/percent toll. Scales
// naturally with how big your empire has gotten.
export const PROPERTY_TAX_PER_ASSET = 150_000;


// Mortgaging: 50% of price upfront. Redeeming costs the FULL price (not a
// small interest fee) and must happen within MORTGAGE_DEADLINE_LAPS laps of
// the owner's own — miss it and the bank forecloses for nothing.
export const MORTGAGE_REDEMPTION_INTEREST_PERCENT = 100; // redemption = mortgageValue x 2 = full price
export const MORTGAGE_DEADLINE_LAPS = 6;
/** UI shows a warning once this many laps (or fewer) remain. */
export const MORTGAGE_WARNING_LAPS = 2;

// Bank loans: borrow up to MAX_LOAN_AMOUNT, repaid over the next
// LOAN_INSTALLMENTS times you complete a lap of the board (pass/land on
// START), with LOAN_INTEREST_PERCENT total interest spread across those
// installments.
export const MAX_LOAN_AMOUNT = 10_000_000;
export const MIN_LOAN_AMOUNT = 500_000;
export const LOAN_INTEREST_PERCENT = 30;
export const LOAN_INSTALLMENTS = 3;

// "Local Official" — a mandatory flat cost when you land on this space; no
// choice involved, same spirit as a toll.
export const CORRUPTION_TOLL_AMOUNT = 400_000;

// "Bribe a Senior Official" — a voluntary gamble available once per turn.
// Odds intentionally skew unfavorable: losing is more likely than jail,
// which is more likely than a payoff.
export const BRIBE_GAMBLE_LOSS_CHANCE = 0.4;
export const BRIBE_GAMBLE_JAIL_CHANCE = 0.35;
export const BRIBE_GAMBLE_GAIN_CHANCE = 0.25; // remainder
// Payoff and penalty are random within a range (rounded to 1 000 so'm), so a
// single attempt can never be priced exactly in advance - the ranges are shown.
export const BRIBE_GAMBLE_GAIN_MIN = 500_000;
export const BRIBE_GAMBLE_GAIN_MAX = 2_500_000;
export const BRIBE_GAMBLE_LOSS_MIN = 300_000;
export const BRIBE_GAMBLE_LOSS_MAX = 1_200_000;

/** Pick an amount in [min, max], rounded to the nearest 1 000, from one rng.next(). */
export function randomBribeAmount(min: number, max: number, roll: number): number {
  const raw = min + roll * (max - min);
  return Math.min(max, Math.max(min, Math.round(raw / 1000) * 1000));
}

// Rent multipliers relative to a property's base rent:
// [base, fullSetUnimproved, level1, level2, level3, level4, level5]
const RENT_MULTIPLIERS = [1, 2, 4, 9, 20, 35, 55] as const;

function roundToThousand(n: number): number {
  return Math.round(n / 1000) * 1000;
}

export function buildRentTable(
  price: number
): [number, number, number, number, number, number, number] {
  const base = roundToThousand(price * 0.07);
  return RENT_MULTIPLIERS.map((m) => roundToThousand(base * m)) as [
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ];
}

/** Levels 1-4 all cost the same; level 5 (the top "Holding" tier) costs
 * double — the last upgrade is meant to feel like a splurge. */
export function developmentCostFor(price: number): number {
  return roundToThousand(price * 0.5);
}
export function developmentCostLevel5For(price: number): number {
  return developmentCostFor(price) * 2;
}

export function mortgageValueFor(price: number): number {
  return roundToThousand(price * 0.5);
}

export function unmortgageCostFor(mortgageValue: number): number {
  return roundToThousand(mortgageValue * (1 + MORTGAGE_REDEMPTION_INTEREST_PERCENT / 100));
}

// Development level display names. Index 0 = undeveloped.
export const DEVELOPMENT_LEVEL_NAMES = [
  'Undeveloped',
  'Business',
  'Company',
  'Development',
  'Business Center',
  'Holding',
] as const;
export const DEVELOPMENT_LEVEL_NAMES_UZ = [
  'Rivojlanmagan',
  'Biznes',
  'Kompaniya',
  'Loyiha',
  'Biznes-markaz',
  "Xolding",
] as const;
export const DEVELOPMENT_LEVEL_NAMES_RU = [
  '\u041d\u0435 \u0437\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u043e',
  '\u0411\u0438\u0437\u043d\u0435\u0441',
  '\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f',
  '\u0417\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430',
  '\u0411\u0438\u0437\u043d\u0435\u0441-\u0446\u0435\u043d\u0442\u0440',
  '\u0425\u043e\u043b\u0434\u0438\u043d\u0433',
] as const;
export const DEVELOPMENT_LEVEL_NAMES_UZ_CYRL = [
  '\u0420\u0438\u0432\u043e\u0436\u043b\u0430\u043d\u043c\u0430\u0433\u0430\u043d',
  '\u0411\u0438\u0437\u043d\u0435\u0441',
  '\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f',
  '\u041b\u043e\u0439\u0438\u04b3\u0430',
  '\u0411\u0438\u0437\u043d\u0435\u0441-\u043c\u0430\u0440\u043a\u0430\u0437',
  '\u0425\u043e\u043b\u0434\u0438\u043d\u0433',
] as const;
export const DEVELOPMENT_LEVEL_ICONS = ['', '\ud83c\udfea', '\ud83c\udfe2', '\ud83c\udfd7\ufe0f', '\ud83c\udfd9\ufe0f', '\ud83c\udfe6'] as const;

// Infrastructure (railway-equivalent) balance
export const INFRASTRUCTURE_PRICE = 2_000_000;
export const INFRASTRUCTURE_RENT_TABLE: [number, number, number, number] = [
  250_000,
  500_000,
  1_000_000,
  2_000_000,
];

// Utility (network) balance
export const UTILITY_PRICE = 1_500_000;
export const UTILITY_DICE_MULTIPLIER = { one: 4, both: 10 };
export const UTILITY_UNIT_VALUE = 20_000; // so'm per multiplier-point per dice pip
