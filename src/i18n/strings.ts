import type { Language } from '../game/types';
import { latinToCyrillic } from './translit';
import { RU_NAME_OVERRIDES } from './content';

/** Builds an entry from English, Uzbek (Latin) and Russian; Uzbek Cyrillic is derived. */
function S(en: string, uz: string, ru: string) {
  return { en, uz, ru, 'uz-cyrl': latinToCyrillic(uz) };
}

// A hand-picked set of UI-chrome strings, covering buttons, labels and
// headings in all four languages. Group names, corner/space names and
// development-level names are also fully localized (see game/data/*).
// Property and card names stay as their original brand names / English
// text across languages for now — see the README roadmap.

export const STRINGS = {
  appTitle: { en: "Tycoon: O'zbekiston", uz: "Tycoon: O'zbekiston", ru: "Tycoon: O'zbekiston", 'uz-cyrl': "Tycoon: O'zbekiston" },
  appSubtitle: {
    en: "O'zbekiston Business Game",
    uz: "O'zbekiston Business Game",
    ru: "O'zbekiston Business Game",
    'uz-cyrl': "O'zbekiston Business Game",
  },
  newGame: { en: 'New Game', uz: "Yangi o'yin", ru: '\u041d\u043e\u0432\u0430\u044f \u0438\u0433\u0440\u0430', 'uz-cyrl': '\u042f\u043d\u0433\u0438 \u045e\u0439\u0438\u043d' },
  continueGame: { en: 'Continue Game', uz: 'Davom etish', ru: '\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c', 'uz-cyrl': '\u0414\u0430\u0432\u043e\u043c \u044d\u0442\u0438\u0448' },
  rules: { en: 'Rules', uz: 'Qoidalar', ru: '\u041f\u0440\u0430\u0432\u0438\u043b\u0430', 'uz-cyrl': '\u049a\u043e\u0438\u0434\u0430\u043b\u0430\u0440' },
  deleteSave: { en: 'Delete Save', uz: "O'chirish", ru: '\u0423\u0434\u0430\u043b\u0438\u0442\u044c', 'uz-cyrl': '\u040e\u0447\u0438\u0440\u0438\u0448' },
  rollDice: { en: 'Roll Dice', uz: 'Zar tashlash', ru: '\u0411\u0440\u043e\u0441\u0438\u0442\u044c \u043a\u0443\u0431\u0438\u043a\u0438', 'uz-cyrl': '\u0417\u0430\u0440 \u0442\u0430\u0448\u043b\u0430\u0448' },
  rollAgain: {
    en: 'Roll Again (doubles!)',
    uz: 'Yana tashlang (dubl!)',
    ru: '\u0415\u0449\u0451 \u0440\u0430\u0437 (\u0434\u0443\u0431\u043b\u044c!)',
    'uz-cyrl': '\u042f\u043d\u0430 \u0442\u0430\u0448\u043b\u0430\u043d\u0433 (\u0434\u0443\u0431\u043b!)',
  },
  buy: { en: 'Buy', uz: 'Sotib olish', ru: '\u041a\u0443\u043f\u0438\u0442\u044c', 'uz-cyrl': '\u0421\u043e\u0442\u0438\u0431 \u043e\u043b\u0438\u0448' },
  decline: { en: 'Decline', uz: 'Rad etish', ru: '\u041e\u0442\u043a\u0430\u0437\u0430\u0442\u044c\u0441\u044f', 'uz-cyrl': '\u0420\u0430\u0434 \u044d\u0442\u0438\u0448' },
  endTurn: { en: 'End Turn', uz: 'Navbatni tugatish', ru: '\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u0445\u043e\u0434', 'uz-cyrl': '\u041d\u0430\u0432\u0431\u0430\u0442\u043d\u0438 \u0442\u0443\u0433\u0430\u0442\u0438\u0448' },
  develop: { en: 'Develop', uz: 'Rivojlantirish', ru: '\u0420\u0430\u0437\u0432\u0438\u0432\u0430\u0442\u044c', 'uz-cyrl': '\u0420\u0438\u0432\u043e\u0436\u043b\u0430\u043d\u0442\u0438\u0440\u0438\u0448' },
  sellDevelopment: { en: 'Sell Level', uz: 'Darajani sotish', ru: '\u041f\u0440\u043e\u0434\u0430\u0442\u044c \u0443\u0440\u043e\u0432\u0435\u043d\u044c', 'uz-cyrl': '\u0414\u0430\u0440\u0430\u0436\u0430\u043d\u0438 \u0441\u043e\u0442\u0438\u0448' },
  mortgage: { en: 'Mortgage', uz: "Garovga qo'yish", ru: '\u0417\u0430\u043b\u043e\u0436\u0438\u0442\u044c', 'uz-cyrl': '\u0413\u0430\u0440\u043e\u0432\u0433\u0430 \u049b\u045e\u0439\u0438\u0448' },
  unmortgage: { en: 'Pay Off Mortgage', uz: 'Garovni yopish', ru: '\u0412\u044b\u043a\u0443\u043f\u0438\u0442\u044c \u0437\u0430\u043b\u043e\u0433', 'uz-cyrl': '\u0413\u0430\u0440\u043e\u0432\u043d\u0438 \u0451\u043f\u0438\u0448' },
  payFine: { en: 'Pay Fine', uz: "Jarima to'lash", ru: '\u0417\u0430\u043f\u043b\u0430\u0442\u0438\u0442\u044c \u0448\u0442\u0440\u0430\u0444', 'uz-cyrl': '\u0416\u0430\u0440\u0438\u043c\u0430 \u0442\u045e\u043b\u0430\u0448' },
  useReleasePaper: {
    en: 'Use Release Paper',
    uz: "Ozodlik varag'ini ishlatish",
    ru: '\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c \u043a\u0430\u0440\u0442\u0443 \u043e\u0441\u0432\u043e\u0431\u043e\u0436\u0434\u0435\u043d\u0438\u044f',
    'uz-cyrl': '\u041e\u0437\u043e\u0434\u043b\u0438\u043a \u0432\u0430\u0440\u0430\u0493\u0438\u043d\u0438 \u0438\u0448\u043b\u0430\u0442\u0438\u0448',
  },
  close: { en: 'Close', uz: 'Yopish', ru: '\u0417\u0430\u043a\u0440\u044b\u0442\u044c', 'uz-cyrl': '\u0401\u043f\u0438\u0448' },
  ok: { en: 'OK', uz: 'OK', ru: '\u041e\u041a', 'uz-cyrl': '\u041e\u041a' },
  cash: { en: 'Cash', uz: 'Naqd pul', ru: '\u041d\u0430\u043b\u0438\u0447\u043d\u044b\u0435', 'uz-cyrl': '\u041d\u0430\u049b\u0434 \u043f\u0443\u043b' },
  properties: { en: 'Properties', uz: 'Mulklar', ru: '\u0418\u043c\u0443\u0449\u0435\u0441\u0442\u0432\u043e', 'uz-cyrl': '\u041c\u0443\u043b\u043a\u043b\u0430\u0440' },
  netWorth: { en: 'Net Worth', uz: 'Sof qiymat', ru: '\u0427\u0438\u0441\u0442\u0430\u044f \u0441\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c', 'uz-cyrl': '\u0421\u043e\u0444 \u049b\u0438\u0439\u043c\u0430\u0442' },
  trade: { en: 'Trade', uz: 'Savdo', ru: '\u041e\u0431\u043c\u0435\u043d', 'uz-cyrl': '\u0421\u0430\u0432\u0434\u043e' },
  proposeTrade: { en: 'Propose Trade', uz: 'Savdo taklif qilish', ru: '\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0438\u0442\u044c \u043e\u0431\u043c\u0435\u043d', 'uz-cyrl': '\u0421\u0430\u0432\u0434\u043e \u0442\u0430\u043a\u043b\u0438\u0444 \u049b\u0438\u043b\u0438\u0448' },
  accept: { en: 'Accept', uz: 'Qabul qilish', ru: '\u041f\u0440\u0438\u043d\u044f\u0442\u044c', 'uz-cyrl': '\u049a\u0430\u0431\u0443\u043b \u049b\u0438\u043b\u0438\u0448' },
  reject: { en: 'Reject', uz: 'Rad etish', ru: '\u041e\u0442\u043a\u043b\u043e\u043d\u0438\u0442\u044c', 'uz-cyrl': '\u0420\u0430\u0434 \u044d\u0442\u0438\u0448' },
  cancel: { en: 'Cancel', uz: 'Bekor qilish', ru: '\u041e\u0442\u043c\u0435\u043d\u0430', 'uz-cyrl': '\u0411\u0435\u043a\u043e\u0440 \u049b\u0438\u043b\u0438\u0448' },
  youOwe: { en: 'You owe', uz: 'Qarzingiz', ru: '\u0412\u044b \u0434\u043e\u043b\u0436\u043d\u044b', 'uz-cyrl': '\u049a\u0430\u0440\u0437\u0438\u043d\u0433\u0438\u0437' },
  raiseCash: {
    en: 'Raise cash by mortgaging or selling development levels, or declare bankruptcy.',
    uz: "Garovga qo'ying yoki darajalarni soting, yoxud bankrotlikni e'lon qiling.",
    ru: '\u0417\u0430\u043b\u043e\u0436\u0438\u0442\u0435 \u0438\u043c\u0443\u0449\u0435\u0441\u0442\u0432\u043e \u0438\u043b\u0438 \u043f\u0440\u043e\u0434\u0430\u0439\u0442\u0435 \u0443\u0440\u043e\u0432\u043d\u0438 \u0437\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438, \u043b\u0438\u0431\u043e \u043e\u0431\u044a\u044f\u0432\u0438\u0442\u0435 \u0431\u0430\u043d\u043a\u0440\u043e\u0442\u0441\u0442\u0432\u043e.',
    'uz-cyrl': '\u0413\u0430\u0440\u043e\u0432\u0433\u0430 \u049b\u045e\u0439\u0438\u043d\u0433 \u0451\u043a\u0438 \u0434\u0430\u0440\u0430\u0436\u0430\u043b\u0430\u0440\u043d\u0438 \u0441\u043e\u0442\u0438\u043d\u0433, \u0451\u0445\u0443\u0434 \u0431\u0430\u043d\u043a\u0440\u043e\u0442\u043b\u0438\u043a\u043d\u0438 \u044d\u044a\u043b\u043e\u043d \u049b\u0438\u043b\u0438\u043d\u0433.',
  },
  declareBankruptcy: {
    en: 'Declare Bankruptcy',
    uz: "Bankrotlikni e'lon qilish",
    ru: '\u041e\u0431\u044a\u044f\u0432\u0438\u0442\u044c \u0431\u0430\u043d\u043a\u0440\u043e\u0442\u0441\u0442\u0432\u043e',
    'uz-cyrl': '\u0411\u0430\u043d\u043a\u0440\u043e\u0442\u043b\u0438\u043a\u043d\u0438 \u044d\u044a\u043b\u043e\u043d \u049b\u0438\u043b\u0438\u0448',
  },
  gameLog: { en: 'Game Log', uz: "O'yin jurnali", ru: '\u0416\u0443\u0440\u043d\u0430\u043b \u0438\u0433\u0440\u044b', 'uz-cyrl': '\u040e\u0439\u0438\u043d \u0436\u0443\u0440\u043d\u0430\u043b\u0438' },
  settings: { en: 'Settings', uz: 'Sozlamalar', ru: '\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438', 'uz-cyrl': '\u0421\u043e\u0437\u043b\u0430\u043c\u0430\u043b\u0430\u0440' },
  sound: { en: 'Sound', uz: 'Ovoz', ru: '\u0417\u0432\u0443\u043a', 'uz-cyrl': '\u041e\u0432\u043e\u0437' },
  animations: { en: 'Animations', uz: 'Animatsiyalar', ru: '\u0410\u043d\u0438\u043c\u0430\u0446\u0438\u044f', 'uz-cyrl': '\u0410\u043d\u0438\u043c\u0430\u0446\u0438\u044f\u043b\u0430\u0440' },
  aiSpeed: { en: 'AI Speed', uz: 'Bot tezligi', ru: '\u0421\u043a\u043e\u0440\u043e\u0441\u0442\u044c \u0431\u043e\u0442\u043e\u0432', 'uz-cyrl': '\u0411\u043e\u0442 \u0442\u0435\u0437\u043b\u0438\u0433\u0438' },
  language: { en: 'Language', uz: 'Til', ru: '\u042f\u0437\u044b\u043a', 'uz-cyrl': '\u0422\u0438\u043b' },
  victory: {
    en: 'Business Empire Complete',
    uz: "Biznes imperiyasi barpo bo'ldi",
    ru: '\u0411\u0438\u0437\u043d\u0435\u0441-\u0438\u043c\u043f\u0435\u0440\u0438\u044f \u043f\u043e\u0441\u0442\u0440\u043e\u0435\u043d\u0430',
    'uz-cyrl': '\u0411\u0438\u0437\u043d\u0435\u0441 \u0438\u043c\u043f\u0435\u0440\u0438\u044f\u0441\u0438 \u0431\u0430\u0440\u043f\u043e \u0431\u045e\u043b\u0434\u0438',
  },
  playAgain: { en: 'Play Again', uz: "Yana o'ynash", ru: '\u0418\u0433\u0440\u0430\u0442\u044c \u0441\u043d\u043e\u0432\u0430', 'uz-cyrl': '\u042f\u043d\u0430 \u045e\u0439\u043d\u0430\u0448' },
  returnToMenu: { en: 'Return to Menu', uz: 'Menyuga qaytish', ru: '\u0412 \u0433\u043b\u0430\u0432\u043d\u043e\u0435 \u043c\u0435\u043d\u044e', 'uz-cyrl': '\u041c\u0435\u043d\u044e\u0433\u0430 \u049b\u0430\u0439\u0442\u0438\u0448' },
  round: { en: 'Round', uz: 'Tur', ru: '\u0420\u0430\u0443\u043d\u0434', 'uz-cyrl': '\u0422\u0443\u0440' },
  undeveloped: { en: 'Undeveloped', uz: 'Rivojlanmagan', ru: '\u041d\u0435 \u0437\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u043e', 'uz-cyrl': '\u0420\u0438\u0432\u043e\u0436\u043b\u0430\u043d\u043c\u0430\u0433\u0430\u043d' },
  mortgaged: { en: 'Mortgaged', uz: 'Garovda', ru: '\u0412 \u0437\u0430\u043b\u043e\u0433\u0435', 'uz-cyrl': '\u0413\u0430\u0440\u043e\u0432\u0434\u0430' },
  unowned: { en: 'Unowned', uz: 'Egasiz', ru: '\u0421\u0432\u043e\u0431\u043e\u0434\u043d\u043e', 'uz-cyrl': '\u042d\u0433\u0430\u0441\u0438\u0437' },
  owner: { en: 'Owner', uz: 'Egasi', ru: '\u0412\u043b\u0430\u0434\u0435\u043b\u0435\u0446', 'uz-cyrl': '\u042d\u0433\u0430\u0441\u0438' },
  price: { en: 'Purchase Price', uz: 'Narxi', ru: '\u0426\u0435\u043d\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438', 'uz-cyrl': '\u041d\u0430\u0440\u0445\u0438' },
  currentRent: { en: 'Current Rent', uz: 'Joriy ijara haqqi', ru: '\u0422\u0435\u043a\u0443\u0449\u0430\u044f \u0430\u0440\u0435\u043d\u0434\u0430', 'uz-cyrl': '\u0416\u043e\u0440\u0438\u0439 \u0438\u0436\u0430\u0440\u0430 \u04b3\u0430\u049b\u049b\u0438' },
  developmentCost: {
    en: 'Development Cost',
    uz: 'Rivojlantirish narxi',
    ru: '\u0421\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c \u0437\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438',
    'uz-cyrl': '\u0420\u0438\u0432\u043e\u0436\u043b\u0430\u043d\u0442\u0438\u0440\u0438\u0448 \u043d\u0430\u0440\u0445\u0438',
  },
  shortBy: { en: 'short by', uz: 'yetishmaydi', ru: 'не хватает', 'uz-cyrl': 'етишмайди' },
  finalUpgradeCost: {
    en: 'Final Upgrade (Holding)',
    uz: 'Yakuniy daraja (Xolding)',
    ru: 'Финальное улучшение (Холдинг)',
    'uz-cyrl': 'Якуний даража (Холдинг)',
  },
  nextUpgradeCost: {
    en: 'Next Upgrade',
    uz: 'Keyingi daraja',
    ru: 'Следующее улучшение',
    'uz-cyrl': 'Кейинги даража',
  },
  mortgageValue: { en: 'Mortgage Value', uz: "Garov qiymati", ru: '\u0417\u0430\u043b\u043e\u0433\u043e\u0432\u0430\u044f \u0441\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c', 'uz-cyrl': '\u0413\u0430\u0440\u043e\u0432 \u049b\u0438\u0439\u043c\u0430\u0442\u0438' },

  // Build / Bank / Network travel
  build: { en: 'Build', uz: 'Qurish', ru: '\u0421\u0442\u0440\u043e\u0438\u0442\u044c', 'uz-cyrl': '\u049a\u0443\u0440\u0438\u0448' },
  bank: { en: 'Bank', uz: 'Bank', ru: '\u0411\u0430\u043d\u043a', 'uz-cyrl': '\u0411\u0430\u043d\u043a' },
  takeLoan: { en: 'Take Loan', uz: 'Kredit olish', ru: '\u0412\u0437\u044f\u0442\u044c \u043a\u0440\u0435\u0434\u0438\u0442', 'uz-cyrl': '\u041a\u0440\u0435\u0434\u0438\u0442 \u043e\u043b\u0438\u0448' },
  repayLoanEarly: {
    en: 'Pay Off Loan',
    uz: 'Kreditni yopish',
    ru: '\u041f\u043e\u0433\u0430\u0441\u0438\u0442\u044c \u043a\u0440\u0435\u0434\u0438\u0442',
    'uz-cyrl': '\u041a\u0440\u0435\u0434\u0438\u0442\u043d\u0438 \u0451\u043f\u0438\u0448',
  },
  loanAmount: { en: 'Loan Amount', uz: 'Kredit summasi', ru: '\u0421\u0443\u043c\u043c\u0430 \u043a\u0440\u0435\u0434\u0438\u0442\u0430', 'uz-cyrl': '\u041a\u0440\u0435\u0434\u0438\u0442 \u0441\u0443\u043c\u043c\u0430\u0441\u0438' },
  loanBalance: {
    en: 'Remaining Balance',
    uz: 'Qolgan qarz',
    ru: '\u041e\u0441\u0442\u0430\u0442\u043e\u043a \u0434\u043e\u043b\u0433\u0430',
    'uz-cyrl': '\u049a\u043e\u043b\u0433\u0430\u043d \u049b\u0430\u0440\u0437',
  },
  installmentsLeft: {
    en: 'Installments Left',
    uz: "Qolgan to'lovlar",
    ru: '\u041e\u0441\u0442\u0430\u043b\u043e\u0441\u044c \u043f\u043b\u0430\u0442\u0435\u0436\u0435\u0439',
    'uz-cyrl': '\u049a\u043e\u043b\u0433\u0430\u043d \u0442\u045e\u043b\u043e\u0432\u043b\u0430\u0440',
  },
  noActiveLoan: {
    en: 'No active loan.',
    uz: "Faol kredit yo'q.",
    ru: '\u0410\u043a\u0442\u0438\u0432\u043d\u043e\u0433\u043e \u043a\u0440\u0435\u0434\u0438\u0442\u0430 \u043d\u0435\u0442.',
    'uz-cyrl': '\u0424\u0430\u043e\u043b \u043a\u0440\u0435\u0434\u0438\u0442 \u0439\u045e\u049b.',
  },
  nothingToBuild: {
    en: "Nothing to develop right now \u2014 you need a complete, unmortgaged group first.",
    uz: "Hozircha rivojlantiradigan narsa yo'q \u2014 avval to'liq guruhga ega bo'lishingiz kerak.",
    ru: '\u0421\u0435\u0439\u0447\u0430\u0441 \u043d\u0435\u0447\u0435\u0433\u043e \u0437\u0430\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0442\u044c \u2014 \u0441\u043d\u0430\u0447\u0430\u043b\u0430 \u043d\u0443\u0436\u043d\u0430 \u0446\u0435\u043b\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430 \u0431\u0435\u0437 \u0437\u0430\u043b\u043e\u0433\u0430.',
    'uz-cyrl': '\u04b2\u043e\u0437\u0438\u0440\u0447\u0430 \u0440\u0438\u0432\u043e\u0436\u043b\u0430\u043d\u0442\u0438\u0440\u0430\u0434\u0438\u0433\u0430\u043d \u043d\u0430\u0440\u0441\u0430 \u0439\u045e\u049b \u2014 \u0430\u0432\u0432\u0430\u043b \u0442\u045e\u043b\u0438\u049b \u0433\u0443\u0440\u0443\u04b3\u0433\u0430 \u044d\u0433\u0430 \u0431\u045e\u043b\u0438\u0448\u0438\u043d\u0433\u0438\u0437 \u043a\u0435\u0440\u0430\u043a.',
  },
  travelNetwork: {
    en: 'Travel Network',
    uz: 'Tarmoq orqali sayohat',
    ru: '\u0422\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442\u043d\u0430\u044f \u0441\u0435\u0442\u044c',
    'uz-cyrl': '\u0422\u0430\u0440\u043c\u043e\u049b \u043e\u0440\u049b\u0430\u043b\u0438 \u0441\u0430\u0451\u04b3\u0430\u0442',
  },
  chooseDestination: {
    en: 'Choose a destination',
    uz: 'Manzilni tanlang',
    ru: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043d\u0430\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435',
    'uz-cyrl': '\u041c\u0430\u043d\u0437\u0438\u043b\u043d\u0438 \u0442\u0430\u043d\u043b\u0430\u043d\u0433',
  },
  humanPlayer: { en: 'Human', uz: 'Odam', ru: '\u0427\u0435\u043b\u043e\u0432\u0435\u043a', 'uz-cyrl': '\u041e\u0434\u0430\u043c' },
  aiOpponent: { en: 'AI', uz: 'Bot', ru: '\u0418\u0418', 'uz-cyrl': '\u0411\u043e\u0442' },
  infrastructureLabel: { en: 'Infrastructure', uz: 'Infratuzilma', ru: '\u0418\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430', 'uz-cyrl': '\u0418\u043d\u0444\u0440\u0430\u0442\u0443\u0437\u0438\u043b\u043c\u0430' },
  utilityLabel: {
    en: 'Utility network',
    uz: 'Tarmoq korxonasi',
    ru: '\u0421\u0435\u0442\u0435\u0432\u0430\u044f \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044f',
    'uz-cyrl': '\u0422\u0430\u0440\u043c\u043e\u049b \u043a\u043e\u0440\u0445\u043e\u043d\u0430\u0441\u0438',
  },

  // Leaderboard / bankruptcy warning
  leaderboard: { en: 'Final Standings', uz: 'Yakuniy natijalar', ru: '\u0418\u0442\u043e\u0433\u043e\u0432\u0430\u044f \u0442\u0430\u0431\u043b\u0438\u0446\u0430', 'uz-cyrl': '\u042f\u043a\u0443\u043d\u0438\u0439 \u043d\u0430\u0442\u0438\u0436\u0430\u043b\u0430\u0440' },
  rank: { en: 'Rank', uz: "O'rin", ru: '\u041c\u0435\u0441\u0442\u043e', 'uz-cyrl': "\u045e\u0440\u0438\u043d" },
  bankruptWarning: {
    en: 'You still have positive net worth. Are you sure you want to declare bankruptcy instead of trying to raise more cash?',
    uz: "Sof qiymatingiz hali musbat. Ko'proq pul topishga harakat qilish o'rniga bankrotlikni tanlashga aminmisiz?",
    ru: '\u0423 \u0432\u0430\u0441 \u0432\u0441\u0451 \u0435\u0449\u0451 \u043f\u043e\u043b\u043e\u0436\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u0447\u0438\u0441\u0442\u0430\u044f \u0441\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c. \u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u043e\u0431\u044a\u044f\u0432\u0438\u0442\u044c \u0431\u0430\u043d\u043a\u0440\u043e\u0442\u0441\u0442\u0432\u043e, \u0432\u043c\u0435\u0441\u0442\u043e \u0442\u043e\u0433\u043e \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u043f\u044b\u0442\u0430\u0442\u044c\u0441\u044f \u043d\u0430\u0439\u0442\u0438 \u0434\u0435\u043d\u044c\u0433\u0438?',
    'uz-cyrl': '\u0421\u043e\u0444 \u049b\u0438\u0439\u043c\u0430\u0442\u0438\u043d\u0433\u0438\u0437 \u04b3\u0430\u043b\u0438 \u043c\u0443\u0441\u0431\u0430\u0442. Кўпроқ пул топишга ҳаракат қилиш ўрнига банкротликни танлашга аминмисиз?',
  },
  confirmBankruptcy: { en: 'Yes, Declare Bankruptcy', uz: "Ha, bankrot bo'lish", ru: '\u0414\u0430, \u043e\u0431\u044a\u044f\u0432\u0438\u0442\u044c \u0431\u0430\u043d\u043a\u0440\u043e\u0442\u0441\u0442\u0432\u043e', 'uz-cyrl': "Ҳа, банкрот бўлиш" },
  keepTrying: { en: 'Keep Trying', uz: 'Davom etaman', ru: '\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043f\u043e\u043f\u044b\u0442\u043a\u0438', 'uz-cyrl': 'Давом этаман' },

  // Trade balance helper
  balanceOffer: { en: 'Balance', uz: 'Tenglashtirish', ru: '\u0423\u0440\u0430\u0432\u043d\u044f\u0442\u044c', 'uz-cyrl': 'Тенглаштириш' },

  corruptionTip: {
    en: 'Local Official: a mandatory fixed payment every time you land here.',
    uz: "Mahalliy amaldor: bu yerga tushganingizda majburiy qat'iy to'lov.",
    ru: 'Местный чиновник: обязательный фиксированный платёж при каждой остановке.',
    'uz-cyrl': 'Маҳаллий амалдор: бу ерга тушганингизда мажбурий қатъий тўлов.',
  },

  // --- Menus / setup ---
  disclaimer: S(
    'Fan-made, non-commercial project inspired by classic property-trading board games. Company names are used as thematic flavor only \u2014 no affiliation, sponsorship, or endorsement by any referenced company is implied.',
    "Mulk savdosi bo'yicha mashhur stol o'yinlaridan ilhomlangan notijorat muxlis loyihasi. Kompaniya nomlari faqat mavzuviy ruh uchun ishlatilgan \u2014 hech bir kompaniya bilan bog'liqlik, homiylik yoki qo'llab-quvvatlash nazarda tutilmaydi.",
    'Некоммерческий фанатский проект по мотивам классических настольных игр о торговле недвижимостью. Названия компаний используются только как тематический антураж \u2014 никакой связи, спонсорства или одобрения со стороны упомянутых компаний не подразумевается.'
  ),
  back: S('Back', 'Orqaga', 'Назад'),
  setupIntro: S(
    '2-4 players. Set any slot to Human or AI \u2014 play solo against bots, or hand the screen around with friends.',
    "2-4 o'yinchi. Har bir o'rinni Inson yoki SI qilib belgilang \u2014 botlarga qarshi yakka o'ynang yoki ekranni do'stlar bilan almashib o'ynang.",
    '2\u20134 игрока. Для каждого места выберите \u00abЧеловек\u00bb или \u00abИИ\u00bb: играйте в одиночку против ботов или передавайте экран друзьям.'
  ),
  numberOfPlayers: S('Number of players', "O'yinchilar soni", 'Количество игроков'),
  playersHeading: S('Players', "O'yinchilar", 'Игроки'),
  playerN: S('Player {n}', "{n}-o'yinchi", 'Игрок {n}'),
  aiNameOptional: S('AI name (optional)', 'SI nomi (ixtiyoriy)', 'Имя ИИ (необязательно)'),
  needHuman: S('At least one player needs to be Human.', "Kamida bitta o'yinchi Inson bo'lishi kerak.", 'Хотя бы один игрок должен быть человеком.'),
  // --- In game ---
  quitToMenu: S('Quit to menu', 'Menyuga chiqish', 'Выйти в меню'),
  speedFast: S('Fast', 'Tez', 'Быстро'),
  speedNormal: S('Normal', "O'rtacha", 'Обычно'),
  speedSlow: S('Slow', 'Sekin', 'Медленно'),
  statusWaiting: S('Waiting...', 'Kutilmoqda...', 'Ожидание...'),
  statusAiPlaying: S('{name} is playing...', "{name} o'ynamoqda...", '{name} ходит...'),
  statusDetention: S(
    "{name}: you're in Tax Inspection. Pay the fine, use a release paper, or try to roll doubles.",
    "{name}: siz Soliq tekshiruvidasiz. Jarima to'lang, ozodlik varaqasidan foydalaning yoki dubl tashlashga harakat qiling.",
    '{name}: вы на налоговой проверке. Заплатите штраф, используйте бумагу об освобождении или попробуйте выбросить дубль.'
  ),
  statusYourTurn: S("{name}'s turn \u2014 roll the dice.", '{name} navbati \u2014 zar tashlang.', 'Ход игрока {name} \u2014 бросьте кубики.'),
  statusDoubles: S('Doubles! Roll again, or manage properties first.', 'Dubl! Yana tashlang yoki avval mulklarni boshqaring.', 'Дубль! Бросайте ещё раз или сначала займитесь имуществом.'),
  statusManage: S('{name}: manage your properties, then end your turn.', "{name}: mulklaringizni boshqaring, so'ng navbatni yakunlang.", '{name}: займитесь имуществом, затем завершите ход.'),
  deckMahalla: S('Mahalla', 'Mahalla', 'Махалля'),
  deckBusiness: S('Business Opportunity', 'Biznes imkoniyati', 'Бизнес-возможность'),
  // --- Property inspector ---
  rentBase: S('Base', 'Asosiy', 'Базовая'),
  rentFullSet: S('Full set', "To'liq to'plam", 'Полный набор'),
  rentLevelN: S('Level {n}', '{n}-daraja', 'Уровень {n}'),
  fullGroupDoubled: S('Full group owned \u2014 rent doubled', "Guruh to'liq egallangan \u2014 ijara ikki barobar", 'Группа собрана целиком \u2014 рента удвоена'),
  diceMultiple: S('{n}\u00d7 dice roll', 'Zar yig\u2019indisi \u00d7 {n}', '{n}\u00d7 сумма кубиков'),
  // --- Trade ---
  theyOffer: S('They offer you', 'Ular sizga taklif qilmoqda', 'Они предлагают вам'),
  theyWant: S('They want from you', "Ular sizdan so'ramoqda", 'Они хотят от вас'),
  nothing: S('Nothing', 'Hech narsa', 'Ничего'),
  noOtherPlayers: S('No other players to trade with.', "Savdo qilish uchun boshqa o'yinchilar yo'q.", 'Нет других игроков для обмена.'),
  tradeWith: S('Trade with', 'Savdo hamkori', 'Обмен с'),
  youOffer: S('You offer', 'Siz taklif qilasiz', 'Вы предлагаете'),
  youRequest: S('You request', "Siz so'raysiz", 'Вы просите'),
  noTradeable: S('No tradeable assets.', "Savdo qilish mumkin bo'lgan aktivlar yo'q.", 'Нет активов для обмена.'),
  // --- Bank / liquidation ---
  bankInstallmentNote: S(
    'One installment is collected automatically each time you pass or land on START.',
    "Har safar BOSHLANISH'dan o'tganingizda yoki unga tushganingizda bitta to'lov avtomatik yechib olinadi.",
    'Один платёж списывается автоматически каждый раз, когда вы проходите или останавливаетесь на СТАРТЕ.'
  ),
  totalToRepay: S('Total to repay', 'Jami qaytariladigan summa', 'Всего к возврату'),
  sellDevLevels: S('Sell development levels', "Rivojlanish darajalarini sotish", 'Продать уровни развития'),
  mortgageProps: S('Mortgage properties', "Mulklarni garovga qo'yish", 'Заложить имущество'),
  nothingToLiquidate: S('Nothing left to liquidate.', 'Sotadigan hech narsa qolmadi.', 'Больше нечего продавать.'),
  // --- End game ---
  developmentsStat: S('Developments', 'Rivojlanishlar', 'Развитие'),
  bankruptLabel: S('bankrupt', 'bankrot', 'банкрот'),
  winnerLine: S(
    "{name} built the largest business empire in O'zbekiston.",
    "{name} O'zbekistondagi eng katta biznes imperiyasini qurdi.",
    '{name} построил(а) крупнейшую бизнес-империю Узбекистана.'
  ),

  startGame: S('Start game', 'Boshlash', 'Начать игру'),
  tradeWaiting: S('Waiting for {name} to respond...', '{name} javobini kutmoqda...', 'Ожидание ответа от {name}...'),
  releasePapersN: S('{n} release paper(s)', "{n} ta ozodlik varaqasi", 'Бумаг об освобождении: {n}'),
  theOtherPlayer: S('the other player', "boshqa o'yinchi", 'другой игрок'),

  // Toasts
  toastLoanPaid: {
    en: 'Loan installment paid: {amount}. {n} left.',
    uz: "Kredit to'lovi to'landi: {amount}. {n} ta qoldi.",
    ru: 'Платёж по кредиту внесён: {amount}. Осталось: {n}.',
    'uz-cyrl': 'Кредит тўлови тўланди: {amount}. {n} та қолди.',
  },
  toastLoanPaidOff: {
    en: 'Loan fully paid off with a final installment of {amount}.',
    uz: "Kredit to'liq yopildi, oxirgi to'lov: {amount}.",
    ru: 'Кредит полностью погашен последним платежом {amount}.',
    'uz-cyrl': 'Кредит тўлиқ ёпилди, охирги тўлов: {amount}.',
  },
  toastForeclosed: {
    en: 'The bank foreclosed on {name}: the mortgage deadline passed.',
    uz: "Bank {name} ni musodara qildi: ipoteka muddati o'tib ketdi.",
    ru: 'Банк изъял {name}: срок выкупа залога истёк.',
    'uz-cyrl': 'Банк {name} ни мусодара қилди: ипотека муддати ўтиб кетди.',
  },
  dismiss: { en: 'Dismiss', uz: 'Yopish', ru: 'Закрыть', 'uz-cyrl': 'Ёпиш' },

  // Save compatibility
  saveOutdated: {
    en: 'A saved game from an older version was found. It cannot be loaded and will be replaced when you start a new game.',
    uz: "Eski versiyadagi saqlangan o'yin topildi. Uni yuklab bo'lmaydi; yangi o'yin boshlaganingizda almashtiriladi.",
    ru: '\u041d\u0430\u0439\u0434\u0435\u043d\u043e \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435 \u0441\u0442\u0430\u0440\u043e\u0439 \u0432\u0435\u0440\u0441\u0438\u0438. \u0415\u0433\u043e \u043d\u0435\u043b\u044c\u0437\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c; \u043e\u043d\u043e \u0431\u0443\u0434\u0435\u0442 \u0437\u0430\u043c\u0435\u043d\u0435\u043d\u043e \u043f\u0440\u0438 \u043d\u0430\u0447\u0430\u043b\u0435 \u043d\u043e\u0432\u043e\u0439 \u0438\u0433\u0440\u044b.',
    'uz-cyrl': 'Эски версиядаги сақланган ўйин топилди. Уни юклаб бўлмайди; янги ўйин бошлаганингизда алмаштирилади.',
  },

  // Mortgage deadline
  lapsToRedeem: { en: 'laps to redeem', uz: 'aylanishda qaytariladi', ru: '\u043a\u0440\u0443\u0433\u043e\u0432 \u043d\u0430 \u0432\u044b\u043a\u0443\u043f', 'uz-cyrl': 'айланишда қайтарилади' },

  // Build modal
  levelLabel: { en: 'Level', uz: 'Daraja', ru: '\u0423\u0440\u043e\u0432\u0435\u043d\u044c', 'uz-cyrl': 'Даража' },

  // Corruption mechanics
  bribeOfficial: { en: 'Bribe Official', uz: 'Amaldorga pora', ru: '\u0412\u0437\u044f\u0442\u043a\u0430', 'uz-cyrl': 'Амалдорга пора' },
  bribeTitle: {
    en: 'Bribe a Senior Official',
    uz: 'Yuqori amaldorga pora',
    ru: '\u0412\u0437\u044f\u0442\u043a\u0430 \u0432\u044b\u0441\u043e\u043a\u043e\u043c\u0443 \u0447\u0438\u043d\u043e\u0432\u043d\u0438\u043a\u0443',
    'uz-cyrl': 'Юқори амалдорга пора',
  },
  bribeExplain: {
    en: 'A risky, voluntary gamble. The odds are stacked against you.',
    uz: "Xavfli, ixtiyoriy tavakkal. Ehtimollik sizga qarshi.",
    ru: '\u0420\u0438\u0441\u043a\u043e\u0432\u0430\u043d\u043d\u0430\u044f, \u0434\u043e\u0431\u0440\u043e\u0432\u043e\u043b\u044c\u043d\u0430\u044f \u0430\u0432\u0430\u043d\u0442\u044e\u0440\u0430. \u0428\u0430\u043d\u0441\u044b \u043d\u0435 \u0432 \u0432\u0430\u0448\u0443 \u043f\u043e\u043b\u044c\u0437\u0443.',
    'uz-cyrl': "Хавфли, ихтиёрий таваккал. Эҳтимоллик сизга қарши.",
  },
  bribeGain: { en: 'chance to gain', uz: "yutish ehtimoli", ru: '\u0448\u0430\u043d\u0441 \u0432\u044b\u0438\u0433\u0440\u0430\u0442\u044c', 'uz-cyrl': "ютиш эҳтимоли" },
  bribeLoss: { en: 'chance to lose', uz: "yo'qotish ehtimoli", ru: '\u0448\u0430\u043d\u0441 \u043f\u043e\u0442\u0435\u0440\u044f\u0442\u044c', 'uz-cyrl': "йўқотиш эҳтимоли" },
  bribeJail: { en: 'chance of Tax Inspection', uz: 'tekshiruvga tushish ehtimoli', ru: '\u0448\u0430\u043d\u0441 \u043f\u043e\u043f\u0430\u0441\u0442\u044c \u043f\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443', 'uz-cyrl': 'текширувга тушиш эҳтимоли' },
  tryBribe: { en: 'Try It', uz: 'Sinab ko\u02bbrish', ru: '\u041f\u043e\u043f\u0440\u043e\u0431\u043e\u0432\u0430\u0442\u044c', 'uz-cyrl': "Синаб кўриш" },
  bribeResultGain: { en: 'It paid off!', uz: "Ish o'ngidan keldi!", ru: '\u041f\u043e\u043b\u0443\u0447\u0438\u043b\u043e\u0441\u044c!', 'uz-cyrl': "Иш ўнгидан келди!" },
  bribeResultLoss: { en: 'You got burned.', uz: "Kuyib qoldingiz.", ru: '\u0412\u044b \u043f\u043e\u0433\u043e\u0440\u0435\u043b\u0438.', 'uz-cyrl': "Куйиб қолдингиз." },
  bribeResultJail: {
    en: 'Reported \u2014 off to Tax Inspection.',
    uz: 'Xabar berildi \u2014 tekshiruvga yubordilar.',
    ru: '\u0421\u043e\u043e\u0431\u0449\u0438\u043b\u0438 \u043a\u0443\u0434\u0430 \u043d\u0443\u0436\u043d\u043e \u2014 \u0432\u044b \u043f\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u043e\u0439.',
    'uz-cyrl': 'Хабар берилди \u2014 текширувга юбордилар.',
  },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Language): string {
  return STRINGS[key][lang] ?? STRINGS[key].en;
}

interface Named {
  id?: string;
  name: string;
  nameUz: string;
  nameRu?: string;
  nameUzCyrl?: string;
}

/** Fill {placeholders} in a translated template. */
export function tf(key: StringKey, lang: Language, vars: Record<string, string | number>): string {
  let out = t(key, lang);
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Picks the right localized name from any object carrying name/nameUz/
 * nameRu/nameUzCyrl. Falls back gracefully: Russian -> curated override ->
 * English (brand names stay Latin); Uzbek Cyrillic -> transliterated Uzbek Latin. */
export function localized(obj: Named, lang: Language): string {
  switch (lang) {
    case 'uz':
      return obj.nameUz;
    case 'ru':
      return obj.nameRu ?? (obj.id ? RU_NAME_OVERRIDES[obj.id] : undefined) ?? obj.name;
    case 'uz-cyrl':
      return obj.nameUzCyrl ?? latinToCyrillic(obj.nameUz);
    default:
      return obj.name;
  }
}
