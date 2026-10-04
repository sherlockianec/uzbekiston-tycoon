import { formatSom } from '../utils/currency';
import type { Language } from '../game/types';
import { t } from '../i18n/strings';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { RULES_INTRO, RULES_PAGE_TITLE, RULE_SECTIONS, ruleText, type RuleVars } from '../i18n/rules';
import {
  STARTING_CASH,
  GO_SALARY,
  DETENTION_FINE_SCHEDULE,
  INCOME_TAX_PERCENT,
  PROPERTY_TAX_PER_ASSET,
  MORTGAGE_REDEMPTION_INTEREST_PERCENT,
  MORTGAGE_DEADLINE_LAPS,
  MAX_LOAN_AMOUNT,
  LOAN_INTEREST_PERCENT,
  LOAN_LAPS,
  CORRUPTION_TOLL_AMOUNT,
  BRIBE_GAMBLE_LOSS_CHANCE,
  BRIBE_GAMBLE_JAIL_CHANCE,
  BRIBE_GAMBLE_GAIN_CHANCE,
  BRIBE_GAMBLE_GAIN_MIN,
  BRIBE_GAMBLE_GAIN_MAX,
  BRIBE_GAMBLE_LOSS_MIN,
  BRIBE_GAMBLE_LOSS_MAX,
} from '../game/data/economy';

/** Every number on the page comes from the live economy constants. */
export function ruleVars(): RuleVars {
  return {
    startCash: formatSom(STARTING_CASH),
    salary: formatSom(GO_SALARY),
    deadline: MORTGAGE_DEADLINE_LAPS,
    redeemPct: MORTGAGE_REDEMPTION_INTEREST_PERCENT,
    loanMax: formatSom(MAX_LOAN_AMOUNT),
    loanInstallments: LOAN_LAPS,
    loanPct: LOAN_INTEREST_PERCENT,
    fineFirst: formatSom(DETENTION_FINE_SCHEDULE[0]),
    fineLast: formatSom(DETENTION_FINE_SCHEDULE[DETENTION_FINE_SCHEDULE.length - 1]),
    incomePct: INCOME_TAX_PERCENT,
    propTax: formatSom(PROPERTY_TAX_PER_ASSET),
    toll: formatSom(CORRUPTION_TOLL_AMOUNT),
    gainPct: Math.round(BRIBE_GAMBLE_GAIN_CHANCE * 100),
    lossPct: Math.round(BRIBE_GAMBLE_LOSS_CHANCE * 100),
    jailPct: Math.round(BRIBE_GAMBLE_JAIL_CHANCE * 100),
    gainMin: formatSom(BRIBE_GAMBLE_GAIN_MIN),
    gainMax: formatSom(BRIBE_GAMBLE_GAIN_MAX),
    lossMin: formatSom(BRIBE_GAMBLE_LOSS_MIN),
    lossMax: formatSom(BRIBE_GAMBLE_LOSS_MAX),
  };
}

export default function RulesScreen({
  lang,
  onLanguageChange,
  onBack,
}: {
  lang: Language;
  onLanguageChange: (l: Language) => void;
  onBack: () => void;
}) {
  const vars = ruleVars();
  return (
    <div className="center-screen" style={{ alignItems: 'flex-start' }}>
      <div className="rules-screen">
        <div className="flex-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <button className="btn" onClick={onBack}>
            {'\u2190'} {t('back', lang)}
          </button>
          <LanguageSwitcher lang={lang} onChange={onLanguageChange} />
        </div>
        <h1>{ruleText(RULES_PAGE_TITLE, lang)}</h1>
        <p className="text-sm text-muted">{ruleText(RULES_INTRO, lang, vars)}</p>
        {RULE_SECTIONS.map((section) => (
          <section key={section.id}>
            <h2>{ruleText(section.title, lang)}</h2>
            <p>{ruleText(section.body, lang, vars)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
