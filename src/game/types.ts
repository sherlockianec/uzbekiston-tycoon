// ---------------------------------------------------------------------------
// Core type definitions. Everything in game/engine and game/ai is written
// against these types and has zero dependency on React.
// ---------------------------------------------------------------------------

export type PersonalityId =
  | 'conservative'
  | 'aggressive'
  | 'developer'
  | 'banker'
  | 'chaotic';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type Language = 'en' | 'uz' | 'ru' | 'uz-cyrl';

export interface Settings {
  sound: boolean;
  animations: boolean;
  aiSpeedMs: number; // delay between automatic AI actions
  language: Language;
}

// --- Board -----------------------------------------------------------------

export type SpaceKind =
  | 'corner-start'
  | 'corner-detention' // "just visiting" / jail corner
  | 'corner-rest'
  | 'corner-go-to-detention'
  | 'property'
  | 'infrastructure'
  | 'utility'
  | 'tax'
  | 'corruption'
  | 'card-mahalla'
  | 'card-business';

export interface BoardSpace {
  id: string; // stable slug, e.g. "chorsu-bazaar"
  index: number; // 0-39, position on the board
  kind: SpaceKind;
}

export interface GroupDef {
  id: string;
  name: string;
  nameUz: string;
  nameRu: string;
  nameUzCyrl: string;
  color: string;
  propertyIds: string[]; // in board order
}

export interface OwnableDef {
  id: string;
  name: string;
  nameUz: string;
  nameRu?: string;
  nameUzCyrl?: string;
  price: number;
  mortgageValue: number;
  unmortgageCost: number;
}

export interface PropertyDef extends OwnableDef {
  groupId: string;
  description: string;
  developmentCost: number;
  /** Cost of the 5th (top "Holding") level — a deliberate premium over levels 1-4. */
  developmentCostLevel5: number;
  // [base, fullSetUnimproved, level1, level2, level3, level4(hotel-tier: level5)]
  // index 0: base rent, unowned-set
  // index 1: rent when owner has full group but no development
  // index 2-6: rent at development level 1..5
  rentTable: [number, number, number, number, number, number, number];
}

export interface InfrastructureDef extends OwnableDef {
  rentTable: [number, number, number, number]; // by count owned 1..4
}

export interface UtilityDef extends OwnableDef {
  diceMultiplier: { one: number; both: number };
  unitValue: number; // so'm per multiplier-point per dice pip
}

export interface TaxDef {
  id: string;
  name: string;
  nameUz: string;
  nameRu: string;
  nameUzCyrl: string;
  kind: 'percent' | 'flat' | 'perAsset';
  amount: number; // percent (0-100), flat so'm, or so'm-per-unmortgaged-asset
}

// --- Cards -------------------------------------------------------------------

export type CardEffect =
  | { type: 'collect'; amount: number }
  | { type: 'pay'; amount: number }
  | { type: 'collectFromEach'; amount: number }
  | { type: 'payToEach'; amount: number }
  | { type: 'moveTo'; spaceId: string; collectIfPassed: boolean }
  | { type: 'moveRelative'; spaces: number }
  | { type: 'goToDetention' }
  | { type: 'getOutFree' }
  | { type: 'payPerLevel'; amountPerLevel: number }
  | { type: 'payPerInfrastructure'; amountEach: number }
  | { type: 'advanceToNearestGroup'; groupId: string; collectIfPassed: boolean }
  | { type: 'reduceLoanBalance'; percent: number }
  | { type: 'forgiveLoan' }
  | { type: 'extendLoanTerm'; extraInstallments: number }
  | { type: 'taxImmunity' }
  | { type: 'purchaseDiscount'; percent: number };

export type DeckId = 'mahalla' | 'business';

export interface CardDef {
  id: string;
  deck: DeckId;
  title: string;
  titleUz: string;
  text: string;
  effect: CardEffect;
}

// --- Runtime state -----------------------------------------------------------

export interface OwnershipState {
  ownerId: string | null;
  level: number; // 0 = undeveloped; properties only, 1-5 for developed tiers
  mortgaged: boolean;
  /** Laps the owner has left to redeem before the bank forecloses. Null
   * whenever not mortgaged. */
  mortgageLapsRemaining: number | null;
}

export interface Loan {
  principal: number;
  installmentAmount: number;
  installmentsLeft: number;
}

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  personality?: PersonalityId;
  difficulty?: Difficulty;
  tokenColor: string;
  tokenShape: TokenShape;
  cash: number;
  position: number; // 0-39
  inDetention: boolean;
  detentionTurns: number;
  releasePapers: number; // "get out of jail free" cards held
  loan: Loan | null;
  /** One-time immunity from the next tax charge (sticky card buff). */
  taxImmunity: boolean;
  /** Percent off the next property purchase, if any (sticky card buff). */
  purchaseDiscountPercent: number | null;
  bankrupt: boolean;
  /** Set the moment this player goes bankrupt (1st out, 2nd out, ...). Null
   * while still in the game. Used to rank the end-game leaderboard. */
  bankruptOrder: number | null;
}

export type TokenShape = 'car' | 'tower' | 'bank' | 'briefcase' | 'train' | 'building' | 'plane' | 'phone';

export type GamePhase =
  | 'AWAITING_ROLL'
  | 'AWAITING_PURCHASE_DECISION'
  | 'AWAITING_CARD_ACK'
  | 'AWAITING_TRADE_RESPONSE'
  | 'AWAITING_LIQUIDATION'
  | 'GAME_OVER';

export interface TradeOffer {
  id: string;
  fromId: string;
  toId: string;
  offerCash: number;
  offerPropertyIds: string[];
  offerReleasePapers: number;
  requestCash: number;
  requestPropertyIds: string[];
  requestReleasePapers: number;
}

export interface PendingDebt {
  amount: number;
  payeeId: string | 'BANK';
  reason: string;
  kind: 'rent' | 'tax' | 'card' | 'loan';
}

export interface BribeResult {
  outcome: 'gain' | 'loss' | 'jail';
  amount: number;
}

/** A short, human-facing event the UI shows as a toast (the log still records it too). */
export interface GameNotice {
  id: string;
  kind: 'loanPaid' | 'foreclosed';
  playerId: string;
  /** loanPaid: the installment; foreclosed: the asset's unmortgage cost. */
  amount: number;
  /** loanPaid: installments still to pay (0 = loan paid off). */
  remaining: number;
  /** foreclosed: which asset the bank took. */
  spaceId?: string;
}

export interface LogEntry {
  id: string;
  turn: number;
  text: string;
}

export interface GameState {
  saveVersion: number;
  createdAt: number;
  rngSeed: number;
  players: Player[];
  currentPlayerIndex: number;
  ownership: Record<string, OwnershipState>;
  phase: GamePhase;
  dice: [number, number] | null;
  doublesStreak: number;
  hasRolledThisTurn: boolean;
  currentSpaceId: string | null;
  /** Multiplies the next rent payment once, then resets to 1. Used by cards
   * like "Construction Boom" that charge double rent on the landed space. */
  pendingRentMultiplier: number;
  drawnCard: CardDef | null;
  drawnCardDeck: DeckId | null;
  /** True if the currently-shown card's effect moved the player, meaning
   * acknowledging it must resolve the new space (not just close the modal). */
  cardCausedMove: boolean;
  mahallaDeck: string[];
  mahallaDiscard: string[];
  businessDeck: string[];
  businessDiscard: string[];
  trade: TradeOffer | null;
  pendingDebt: PendingDebt | null;
  log: LogEntry[];
  turnNumber: number;
  networkTravelUsed: boolean;
  bribeGambleUsedThisTurn: boolean;
  /** Set once anyone proposes a trade this turn; stops AI from re-proposing repeatedly. */
  tradeProposedThisTurn: boolean;
  bribeResult: BribeResult | null;
  /** Toasts for the acting human (never queued for AI players). Cleared when the turn advances. */
  notices: GameNotice[];
  winnerId: string | null;
  settings: Settings;
}

// --- Commands (the only way to mutate GameState) ------------------------------

export type GameCommand =
  | { type: 'ROLL_DICE' }
  | { type: 'BUY_PROPERTY' }
  | { type: 'DECLINE_PURCHASE' }
  | { type: 'ACK_CARD' }
  | { type: 'PAY_DETENTION_FINE' }
  | { type: 'USE_RELEASE_PAPER' }
  | { type: 'END_TURN' }
  | { type: 'DEVELOP'; spaceId: string }
  | { type: 'SELL_DEVELOPMENT'; spaceId: string }
  | { type: 'MORTGAGE'; spaceId: string }
  | { type: 'UNMORTGAGE'; spaceId: string }
  | { type: 'PROPOSE_TRADE'; offer: Omit<TradeOffer, 'id'> }
  | { type: 'RESPOND_TRADE'; accept: boolean }
  | { type: 'CANCEL_TRADE' }
  | { type: 'LIQUIDATE_MORTGAGE'; spaceId: string }
  | { type: 'LIQUIDATE_SELL_DEVELOPMENT'; spaceId: string }
  | { type: 'DECLARE_BANKRUPTCY' }
  | { type: 'TAKE_LOAN'; amount: number }
  | { type: 'REPAY_LOAN_EARLY' }
  | { type: 'TRAVEL_NETWORK'; targetSpaceId: string }
  | { type: 'ATTEMPT_BRIBE' }
  | { type: 'DISMISS_BRIBE_RESULT' }
  | { type: 'DISMISS_NOTICE'; id: string };

export interface NewGamePlayerConfig {
  name: string;
  isAI: boolean;
  personality?: PersonalityId;
  difficulty?: Difficulty;
}

export interface NewGameConfig {
  players: NewGamePlayerConfig[];
  settings: Settings;
}
