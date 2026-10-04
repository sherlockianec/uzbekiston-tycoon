import type { Language } from '../game/types';
import { PROPERTIES, INFRASTRUCTURE, UTILITIES, TAXES } from '../game/data/properties';
import { BOARD, spaceLabel } from '../game/data/board';
import { ALL_CARDS } from '../game/data/cards';
import { DEVELOPMENT_LEVEL_NAMES } from '../game/data/economy';
import { localized } from './strings';
import { cardTitle, devLevelName } from './content';
import { latinToCyrillic } from './translit';
import { localizeNamesInText } from './names';

/**
 * The engine writes its game log in English (it is stored in saves and must stay stable).
 * The UI translates every line for display: each pattern below recognises one kind of line,
 * and carries an Uzbek (Latin) and a Russian template. Uzbek Cyrillic is generated from the
 * Uzbek Latin template, exactly like the rest of the UI. Names of players, companies and
 * amounts are carried over; asset / card / tax / level names are localised.
 *
 * Lines nobody has a pattern for are shown in English rather than hidden. A test plays whole
 * bot games and fails if any produced line is missing here.
 * NOTE: written by a non-native speaker; a native reviewer should proofread.
 */

interface Pattern {
  re: RegExp;
  uz: string;
  ru: string;
}

const SOM = "[\\u2212-]?\\d[\\d\\s]*so'm";
const P = '(?<p>.+?)';
const ITEM = '(?<item>.+?)';
const M = (name: string) => `(?<${name}>${SOM})`;

const PATTERNS: Pattern[] = [
  { re: /^New game started with (?<n>\d+) players\.$/, uz: "Yangi o'yin {n} o'yinchi bilan boshlandi.", ru: 'Новая игра началась, игроков: {n}.' },
  { re: new RegExp(`^${P} rolled doubles \\((?<a>\\d)-(?<b>\\d)\\) and left Tax Inspection\\.$`), uz: "{p} dubl tashladi ({a}-{b}) va Soliq tekshiruvidan chiqdi.", ru: '{p} выбросил(а) дубль ({a}-{b}) и покинул(а) налоговую проверку.' },
  { re: new RegExp(`^${P} rolled (?<a>\\d)-(?<b>\\d) \\u2014 still in Tax Inspection \\((?<x>\\d)/(?<y>\\d)\\)\\.$`), uz: '{p} {a}-{b} tashladi \u2014 hali Soliq tekshiruvida ({x}/{y}).', ru: '{p} выбросил(а) {a}-{b} \u2014 всё ещё на налоговой проверке ({x}/{y}).' },
  { re: new RegExp(`^${P} rolled doubles a third time in a row and was sent to Tax Inspection\\.$`), uz: "{p} ketma-ket uchinchi marta dubl tashladi va Soliq tekshiruviga yuborildi.", ru: '{p} в третий раз подряд выбросил(а) дубль и отправлен(а) на налоговую проверку.' },
  { re: new RegExp(`^${P} rolled (?<a>\\d)-(?<b>\\d) \\u2014 doubles, roll again after this turn resolves\\.$`), uz: "{p} {a}-{b} tashladi \u2014 dubl, yurish tugagach yana tashlaydi.", ru: '{p} выбросил(а) {a}-{b} \u2014 дубль, после хода бросок повторится.' },
  { re: new RegExp(`^${P} rolled (?<a>\\d)-(?<b>\\d)\\.$`), uz: '{p} {a}-{b} tashladi.', ru: '{p} выбросил(а) {a}-{b}.' },
  { re: new RegExp(`^${P} paid ${M('m')} and left Tax Inspection\\.$`), uz: "{p} {m} to'lab, Soliq tekshiruvidan chiqdi.", ru: '{p} заплатил(а) {m} и покинул(а) налоговую проверку.' },
  { re: new RegExp(`^${P} paid ${M('m')} and was released after (?<n>\\d+) turns in Tax Inspection\\.$`), uz: "{p} {m} to'ladi va {n} yurishdan keyin Soliq tekshiruvidan qo'yib yuborildi.", ru: '{p} заплатил(а) {m} и освобождён(а) после {n} ходов на налоговой проверке.' },
  { re: new RegExp(`^${P} used a Release Paper and left Tax Inspection\\.$`), uz: "{p} ozod qilish qog'ozidan foydalanib, Soliq tekshiruvidan chiqdi.", ru: '{p} использовал(а) бумагу об освобождении и покинул(а) налоговую проверку.' },
  { re: new RegExp(`^${P} declined to buy \\u2014 it stays unowned for now\\.$`), uz: "{p} sotib olmadi \u2014 hozircha egasiz qoladi.", ru: '{p} отказался(ась) покупать \u2014 пока без владельца.' },
  { re: new RegExp(`^${P} ended their turn\\.$`), uz: '{p} yurishini tugatdi.', ru: '{p} завершил(а) ход.' },
  { re: new RegExp(`^${P} sat down at the choyxona and will skip the next roll\\.$`), uz: "{p} choyxonada o'tirdi va keyingi tashlashni o'tkazib yuboradi.", ru: '{p} сел(а) в чайхане и пропустит следующий бросок.' },
  { re: new RegExp(`^${P} repaid the ${M('m')} loan early\\.$`), uz: "{p} {m} kreditni muddatidan oldin to'ladi.", ru: '{p} досрочно погасил(а) кредит {m}.' },
  { re: new RegExp(`^${P} paid off the mortgage on ${ITEM}\\.$`), uz: "{p} {item} bo'yicha garovni to'lab qaytardi.", ru: '{p} выкупил(а) из залога: {item}.' },
  { re: /^The trade offer was withdrawn\.$/, uz: 'Savdo taklifi qaytarib olindi.', ru: 'Предложение сделки отозвано.' },
  { re: new RegExp(`^${P} declined the trade\\.$`), uz: '{p} savdoni rad etdi.', ru: '{p} отклонил(а) сделку.' },
  { re: /^(?<p>.+?) proposed a trade to (?<q>.+?)\.$/, uz: '{p} {q}ga savdo taklif qildi.', ru: '{p} предложил(а) сделку игроку {q}.' },
  { re: /^(?<p>.+?) and (?<q>.+?) completed a trade\.$/, uz: '{p} va {q} savdoni yakunladi.', ru: '{p} и {q} завершили сделку.' },
  { re: new RegExp(`^${P} passed START and collected ${M('m')}\\.$`), uz: "{p} BOSHLANISH'dan o'tdi va {m} oldi.", ru: '{p} прошёл(а) СТАРТ и получил(а) {m}.' },
  { re: new RegExp(`^${P} missed the redemption deadline on ${ITEM} \\u2014 the bank foreclosed\\.$`), uz: "{p} {item} garovini qaytarish muddatini o'tkazib yubordi \u2014 bank musodara qildi.", ru: '{p} пропустил(а) срок выкупа: {item} \u2014 банк забрал имущество.' },
  { re: new RegExp(`^${P}'s loan: (?<n>\\d+) lap\\(s\\) left before ${M('m')} is due\\.$`), uz: "{p} krediti: {m} to'lanishiga {n} aylana qoldi.", ru: 'Кредит {p}: до списания {m} осталось кругов: {n}.' },
  { re: new RegExp(`^${P}'s loan matured \\u2014 the bank took ${M('m')}\\.$`), uz: "{p} kreditining muddati tugadi \u2014 bank {m} yechib oldi.", ru: 'Срок кредита {p} истёк \u2014 банк списал {m}.' },
  { re: new RegExp(`^${P} was sent to Tax Inspection\\.$`), uz: '{p} Soliq tekshiruviga yuborildi.', ru: '{p} отправлен(а) на налоговую проверку.' },
  { re: new RegExp(`^${P}'s bribe attempt was reported \\u2014 straight to Tax Inspection\\.$`), uz: "{p}ning pora urinishi haqida xabar berildi \u2014 to'g'ri Soliq tekshiruviga.", ru: 'О попытке подкупа {p} сообщили \u2014 сразу на налоговую проверку.' },
  { re: new RegExp(`^${P} collected ${M('m')} from other players \\((?<card>.+)\\)\\.$`), uz: "{p} boshqa o'yinchilardan {m} oldi ({card}).", ru: '{p} получил(а) {m} от остальных игроков ({card}).' },
  { re: new RegExp(`^${P} collected ${M('m')} \\((?<card>.+)\\)\\.$`), uz: '{p} {m} oldi ({card}).', ru: '{p} получил(а) {m} ({card}).' },
  { re: new RegExp(`^${P} paid ${M('m')} to every other player \\((?<card>.+)\\)\\.$`), uz: "{p} har bir o'yinchiga {m} to'ladi ({card}).", ru: '{p} заплатил(а) каждому игроку по {m} ({card}).' },
  { re: new RegExp(`^${P} paid ${M('m')} across (?<n>\\d+) development level\\(s\\) \\((?<card>.+)\\)\\.$`), uz: "{p} {n} ta rivojlanish darajasi uchun {m} to'ladi ({card}).", ru: '{p} заплатил(а) {m} за уровни застройки: {n} ({card}).' },
  { re: new RegExp(`^${P} paid ${M('m')} \\((?<card>.+)\\)\\.$`), uz: "{p} {m} to'ladi ({card}).", ru: '{p} заплатил(а) {m} ({card}).' },
  { re: new RegExp(`^${P} received a Release Paper\\.$`), uz: "{p} ozod qilish qog'ozini oldi.", ru: '{p} получил(а) бумагу об освобождении.' },
  { re: new RegExp(`^${P} had no loan to reduce \\((?<card>.+)\\)\\.$`), uz: "{p}da kamaytiriladigan kredit yo'q ({card}).", ru: 'У {p} нет кредита для уменьшения ({card}).' },
  { re: new RegExp(`^${P}'s loan balance was cut by (?<n>\\d+)% \\((?<card>.+)\\)\\.$`), uz: "{p} kredit qoldig'i {n}% ga kamaydi ({card}).", ru: 'Остаток кредита {p} уменьшен на {n}% ({card}).' },
  { re: new RegExp(`^${P} had no loan to forgive \\((?<card>.+)\\)\\.$`), uz: "{p}da kechiriladigan kredit yo'q ({card}).", ru: 'У {p} нет кредита для списания ({card}).' },
  { re: new RegExp(`^${P}'s remaining loan was forgiven in full \\((?<card>.+)\\)\\.$`), uz: "{p} kreditining qoldig'i to'liq kechirildi ({card}).", ru: 'Остаток кредита {p} полностью списан ({card}).' },
  { re: new RegExp(`^${P} had no loan to extend \\((?<card>.+)\\)\\.$`), uz: "{p}da uzaytiriladigan kredit yo'q ({card}).", ru: 'У {p} нет кредита для продления ({card}).' },
  { re: new RegExp(`^${P}'s loan term was extended by (?<n>\\d+) lap\\(s\\) \\((?<card>.+)\\)\\.$`), uz: "{p} kredit muddati {n} aylanaga uzaytirildi ({card}).", ru: 'Срок кредита {p} продлён на кругов: {n} ({card}).' },
  { re: new RegExp(`^${P} is immune to the next tax bill \\((?<card>.+)\\)\\.$`), uz: "{p} keyingi soliqdan ozod ({card}).", ru: '{p} освобождён(а) от следующего налога ({card}).' },
  { re: new RegExp(`^${P} has (?<n>\\d+)% off their next purchase \\((?<card>.+)\\)\\.$`), uz: "{p} keyingi xaridda {n}% chegirmaga ega ({card}).", ru: 'У {p} скидка {n}% на следующую покупку ({card}).' },
  { re: new RegExp(`^${P} is in Tax Inspection, so (?<item>.+?) earned no rent this time\\.$`), uz: "{p} Soliq tekshiruvida, shuning uchun {item} bu safar ijara olib kelmadi.", ru: '{p} на налоговой проверке, поэтому {item} в этот раз не принёс аренды.' },
  { re: new RegExp(`^${P} paid ${M('m')} rent to (?<q>.+?)\\.$`), uz: "{p} {q}ga {m} ijara to'ladi.", ru: '{p} заплатил(а) аренду {m} игроку {q}.' },
  { re: new RegExp(`^${P} was immune to (?<tax>.+?) this time\\.$`), uz: "{p} bu safar {tax}dan ozod bo'ldi.", ru: '{p} в этот раз освобождён(а): {tax}.' },
  { re: new RegExp(`^${P} paid ${M('m')} in (?<tax>.+?)\\.$`), uz: "{p} {tax} uchun {m} to'ladi.", ru: '{p} заплатил(а) {m}: {tax}.' },
  { re: new RegExp(`^${P} paid ${M('m')} to a local official to keep things moving\\.$`), uz: "{p} ishlar yurishi uchun mahalliy amaldorga {m} to'ladi.", ru: '{p} заплатил(а) {m} местному чиновнику, чтобы дела шли.' },
  { re: new RegExp(`^${P} went bankrupt\\. Their properties return to the bank\\.$`), uz: "{p} bankrot bo'ldi. Uning mulki bankka qaytadi.", ru: '{p} обанкротился(ась). Имущество возвращается банку.' },
  { re: new RegExp(`^${P} bought ${ITEM} for ${M('m')} \\(discount applied\\)\\.$`), uz: "{p} {item}ni {m} ga sotib oldi (chegirma bilan).", ru: '{p} купил(а) {item} за {m} (со скидкой).' },
  { re: new RegExp(`^${P} bought ${ITEM} for ${M('m')}\\.$`), uz: '{p} {item}ni {m} ga sotib oldi.', ru: '{p} купил(а) {item} за {m}.' },
  { re: new RegExp(`^${P} developed ${ITEM} to (?<level>.+?) \\(${M('m')}\\)\\.$`), uz: "{p} {item}ni \"{level}\" darajasiga rivojlantirdi ({m}).", ru: '{p} развил(а) {item} до уровня «{level}» ({m}).' },
  { re: new RegExp(`^${P} sold a development level on ${ITEM}, back to (?<level>.+?) \\(\\+${M('m')}\\)\\.$`), uz: "{p} {item} rivojlanish darajasini sotdi, endi \"{level}\" (+{m}).", ru: '{p} продал(а) уровень застройки на {item}, теперь «{level}» (+{m}).' },
  { re: new RegExp(`^${P} mortgaged ${ITEM} for ${M('m')} \\(redeem within (?<n>\\d+) laps or the bank forecloses\\)\\.$`), uz: "{p} {item}ni {m} ga garovga qo'ydi ({n} aylana ichida qaytaring, aks holda bank musodara qiladi).", ru: '{p} заложил(а) {item} за {m} (выкупите за кругов: {n}, иначе банк заберёт).' },
  { re: new RegExp(`^${P} took a loan of ${M('m')} \\u2014 ${M('d')} is taken at once after (?<n>\\d+) laps\\.$`), uz: "{p} {m} kredit oldi \u2014 {n} aylanadan keyin {d} birdaniga yechiladi.", ru: '{p} взял(а) кредит {m} \u2014 через кругов: {n} банк разом спишет {d}.' },
  { re: new RegExp(`^${P} tried to bribe a senior official and got burned \\u2014 lost ${M('m')}\\.$`), uz: "{p} yuqori amaldorga pora berishga urindi va yutqazdi \u2014 {m} yo'qotdi.", ru: '{p} попытался(ась) подкупить высокого чиновника и прогорел(а) \u2014 потеря {m}.' },
  { re: new RegExp(`^${P} bribed a senior official and it paid off \\u2014 gained ${M('m')}\\.$`), uz: "{p} yuqori amaldorga pora berdi va foyda ko'rdi \u2014 {m} orttirdi.", ru: '{p} подкупил(а) высокого чиновника, и это окупилось \u2014 выигрыш {m}.' },
];

/** English display name -> object carrying all language names, for every asset, tax, corner and card. */
type Entity = { kind: 'named'; obj: Parameters<typeof localized>[0] } | { kind: 'card'; id: string } | { kind: 'level'; i: number };
let NAME_MAP: Map<string, Entity> | null = null;

function nameMap() {
  if (NAME_MAP) return NAME_MAP;
  const m = new Map<string, Entity>();
  for (const d of [...Object.values(PROPERTIES), ...Object.values(INFRASTRUCTURE), ...Object.values(UTILITIES), ...Object.values(TAXES)]) {
    m.set(d.name, { kind: 'named', obj: d });
    m.set(d.id, { kind: 'named', obj: d }); // a few messages carry the raw space id
  }
  for (const s of BOARD) {
    const label = spaceLabel(s);
    if (!m.has(label.name)) m.set(label.name, { kind: 'named', obj: label });
  }
  for (const c of Object.values(ALL_CARDS)) m.set(c.title, { kind: 'card', id: c.id });
  DEVELOPMENT_LEVEL_NAMES.forEach((n, i) => m.set(n, { kind: 'level', i }));
  NAME_MAP = m;
  return m;
}

function localizeEntity(en: string, lang: Language): string {
  const hit = nameMap().get(en);
  if (!hit) return en;
  if (hit.kind === 'named') return localized(hit.obj, lang);
  if (hit.kind === 'card') return cardTitle(ALL_CARDS[hit.id], lang);
  return devLevelName(hit.i, lang);
}

const ENTITY_KEYS = new Set(['item', 'card', 'level', 'tax']);

/** Returns the line in `lang`, or the original English line when no pattern recognises it. */
export function translateLog(text: string, lang: Language): string {
  return localizeNamesInText(translateLogLines(text, lang), lang);
}

function translateLogLines(text: string, lang: Language): string {
  if (lang === 'en') return text;
  for (const pat of PATTERNS) {
    const m = pat.re.exec(text);
    if (!m || !m.groups) continue;
    // Uzbek Cyrillic is made from the Uzbek Latin template (placeholders pass through untouched).
    const template = lang === 'ru' ? pat.ru : lang === 'uz-cyrl' ? latinToCyrillic(pat.uz) : pat.uz;
    return template.replace(/\{(\w+)\}/g, (_, key: string) => {
      const raw = m.groups![key] ?? '';
      return ENTITY_KEYS.has(key) ? localizeEntity(raw, lang) : raw;
    });
  }
  return text;
}

/** Test hook: true if some pattern recognises the English line. */
export function isLogLineKnown(text: string): boolean {
  return PATTERNS.some((p) => p.re.test(text));
}
