import type { Language } from '../game/types';
import { latinToCyrillic } from './translit';

/**
 * The rules page, as data. English / Uzbek (Latin) / Russian are written by
 * hand; Uzbek Cyrillic is derived from the Uzbek Latin text. {placeholders}
 * are filled from the live economy constants, so the page can never disagree
 * with the engine. Proofreading by native speakers is still recommended.
 */

export type RuleVars = Record<string, string | number>;

interface Tri {
  en: string;
  uz: string;
  ru: string;
}

export interface RuleSection {
  id: string;
  title: Tri;
  body: Tri;
}

export const RULES_PAGE_TITLE: Tri = { en: 'How to Play', uz: "Qanday o'ynaladi", ru: 'Как играть' };
export const RULES_INTRO: Tri = {
  en: 'You start with {startCash}. Buy properties, collect rent, build your business empire, and outlast your opponents.',
  uz: "Siz {startCash} bilan boshlaysiz. Mulk sotib oling, ijara yig'ing, biznes imperiyangizni quring va raqiblaringizdan uzoqroq turing.",
  ru: 'Вы начинаете с {startCash}. Покупайте имущество, собирайте ренту, стройте бизнес-империю и переживите соперников.',
};

export const RULE_SECTIONS: RuleSection[] = [
  {
    id: 'movement',
    title: { en: 'Movement', uz: 'Harakat', ru: 'Движение' },
    body: {
      en: "Roll two dice and move that many spaces around the board. Roll doubles and you roll again after resolving your move \u2014 but roll doubles three times in a row and you're sent straight to Tax Inspection instead. Pass or land on START and collect {salary}. Pieces only ever move forward around the board (except a few cards that say \"go back\"), so being sent to Tax Inspection from past it takes you across START, and you collect the salary on the way.",
      uz: "Ikkita zar tashlang va shuncha katak yuring. Dubl tushsa, yurishingizni bajargach yana tashlaysiz \u2014 lekin ketma-ket uch marta dubl tushsa, to'g'ridan-to'g'ri Soliq tekshiruviga yuborilasiz. BOSHLANISH'dan o'tsangiz yoki unga tushsangiz, {salary} olasiz. Toshlar doim taxta bo'ylab oldinga yuradi (\"orqaga\" deydigan bir nechta kartadan tashqari), shuning uchun Soliq tekshiruviga undan o'tib ketgan joydan yuborilsangiz, BOSHLANISH'dan o'tasiz va maosh olasiz.",
      ru: 'Бросьте два кубика и сделайте столько ходов по полю. Выпал дубль \u2014 бросаете снова после хода, но три дубля подряд отправляют вас прямо на налоговую проверку. Пройдя или остановившись на СТАРТЕ, вы получаете {salary}. Фишки всегда идут только вперёд (кроме нескольких карт «назад»), поэтому при отправке на налоговую проверку из-за её пределов вы проезжаете СТАРТ и получаете зарплату.',
    },
  },
  {
    id: 'buying',
    title: { en: 'Buying property', uz: 'Mulk sotib olish', ru: 'Покупка имущества' },
    body: {
      en: 'Land on an unowned property, piece of infrastructure, or utility network, and you may buy it at list price. Decline, and it simply stays unowned until someone \u2014 anyone, including you later \u2014 lands there and buys it. There are no auctions. Declining is not final for your turn: while you are still standing on the space you can take a loan, sell buildings, mortgage or trade to raise the money, and then press Buy.',
      uz: "Egasiz mulk, infratuzilma yoki kommunal tarmoqqa tushsangiz, uni belgilangan narxda sotib olishingiz mumkin. Rad etsangiz, u egasiz qoladi \u2014 keyin kimdir (shu jumladan siz ham) unga tushib, sotib olguncha. Auksionlar yo'q. Rad etish shu yurishda yakuniy emas: o'sha katakda turganingizda kredit olishingiz, bino sotishingiz, garovga qo'yishingiz yoki savdo qilib pul topishingiz va so'ng Sotib olishni bosishingiz mumkin.",
      ru: 'Остановившись на свободном имуществе, транспортном активе или сети, вы можете купить его по цене из списка. Откажетесь \u2014 он останется свободным, пока кто-нибудь (в том числе вы позже) не остановится на нём и не купит. Аукционов нет. Отказ не окончателен в этот ход: пока вы стоите на этой клетке, можно взять кредит, продать постройки, заложить имущество или обменяться, чтобы собрать деньги, а затем нажать «Купить».',
    },
  },
  {
    id: 'rent',
    title: { en: 'Rent', uz: 'Ijara', ru: 'Рента' },
    body: {
      en: "Land on a space someone else owns and you pay rent automatically. Owning every property in a group doubles the base rent even before you develop anything. Infrastructure rent scales with how many of the four you own; utility rent is a multiple of your dice roll. A property owned by someone currently in Tax Inspection earns no rent \u2014 there's no one minding the business.",
      uz: "Boshqa birovning mulkiga tushsangiz, ijara avtomatik to'lanadi. Guruhdagi barcha mulkka ega bo'lish, hali rivojlantirmasangiz ham, asosiy ijarani ikki baravar oshiradi. Infratuzilma ijarasi to'rttadan nechtasiga egaligingizga bog'liq; kommunal tarmoq ijarasi zar yig'indisiga ko'paytiriladi. Hozir Soliq tekshiruvida bo'lgan odamning mulki ijara keltirmaydi \u2014 biznesga qarab turadigan hech kim yo'q.",
      ru: 'Остановившись на чужом имуществе, вы автоматически платите ренту. Если у владельца вся группа, базовая рента удваивается ещё до застройки. Рента транспортных активов зависит от того, сколько из четырёх у владельца; рента сетей \u2014 кратна сумме кубиков. Имущество игрока, который сейчас на налоговой проверке, ренту не приносит \u2014 за бизнесом некому присматривать.',
    },
  },
  {
    id: 'development',
    title: { en: 'Development', uz: 'Rivojlantirish', ru: 'Развитие' },
    body: {
      en: "Own every property in a group and you can develop them: Business, Company, Development, Business Center, and finally Holding. The last upgrade, to Holding, costs double what the earlier levels cost \u2014 it's meant to feel like a splurge. You must develop evenly across a group (the least-developed property first) and sell back the same way. The Build button shows every upgrade you can make right now.",
      uz: "Guruhdagi barcha mulkka ega bo'lsangiz, ularni rivojlantirishingiz mumkin: Biznes, Kompaniya, Loyiha, Biznes-markaz va nihoyat Xolding. Xoldingga oxirgi yangilanish oldingi darajalardan ikki baravar qimmat \u2014 bu katta sarf bo'lishi kerak. Guruh bo'ylab tekis rivojlantirish shart (avval eng kam rivojlangani) va sotishda ham xuddi shunday. \u00abQurish\u00bb tugmasi hozir qila oladigan barcha yangilanishlarni ko'rsatadi.",
      ru: 'Если у вас вся группа, вы можете её развивать: Бизнес, Компания, Застройка, Бизнес-центр и, наконец, Холдинг. Последнее улучшение до Холдинга стоит вдвое больше предыдущих \u2014 это задумано как крупная трата. Развивать нужно равномерно по группе (сначала наименее развитый объект), продавать \u2014 так же. Кнопка \u00abСтроить\u00bb показывает все улучшения, доступные прямо сейчас.',
    },
  },
  {
    id: 'trading',
    title: { en: 'Trading', uz: 'Savdo', ru: 'Обмен' },
    body: {
      en: "On your turn, propose a trade to any opponent: cash, properties, and release papers in any combination. The Balance button fills in cash so both sides are worth the same. They'll accept or reject based on the value of the deal, and AI opponents may propose trades to you as well. Developed properties can't be traded until you sell the development back.",
      uz: "O'z navbatingizda istalgan raqibga savdo taklif qiling: pul, mulk va ozodlik varaqalari \u2014 istalgan kombinatsiyada. \u00abTenglashtirish\u00bb tugmasi ikkala tomon qiymati teng bo'lishi uchun pulni to'ldiradi. Ular bitim qiymatiga qarab qabul qiladi yoki rad etadi, SI raqiblar ham sizga savdo taklif qilishi mumkin. Rivojlantirilgan mulkni rivojlanishni sotmaguningizcha almashtirib bo'lmaydi.",
      ru: 'В свой ход предложите любому сопернику обмен: деньги, имущество и бумаги об освобождении в любых сочетаниях. Кнопка \u00abУравнять\u00bb подбирает сумму так, чтобы обе стороны стоили поровну. Соперник принимает или отклоняет предложение, исходя из выгоды; ИИ тоже может предлагать вам обмен. Застроенное имущество нельзя обменять, пока вы не продадите постройки.',
    },
  },
  {
    id: 'network',
    title: { en: 'Transport network', uz: 'Transport tarmog\u2019i', ru: 'Транспортная сеть' },
    body: {
      en: 'Standing on a transport asset (railways, airways, metro...)? Once per turn, before you roll, you can travel for free to any other transport asset and resolve it as if you had landed there normally \u2014 buy it, or pay its owner. You always travel forward around the board, never back, so a destination \"behind\" you means a lap past START and you collect the salary.',
      uz: "Transport aktivida (temir yo'l, aviatsiya, metro...) turibsizmi? Har navbatda bir marta, zar tashlashdan oldin, bepul boshqa istalgan transport aktiviga o'tishingiz va uni xuddi odatiy tushgandek hal qilishingiz mumkin \u2014 sotib olasiz yoki egasiga to'laysiz. Siz doim oldinga yurasiz, hech qachon orqaga emas, shuning uchun \"orqadagi\" manzil BOSHLANISH'dan o'tishni anglatadi va maosh olasiz.",
      ru: 'Стоите на транспортном активе (железные дороги, авиалинии, метро...)? Раз за ход, до броска кубиков, вы можете бесплатно переехать на любой другой транспортный актив и разыграть его как обычную остановку \u2014 купить или заплатить владельцу. Вы всегда едете вперёд, никогда назад, поэтому пункт «позади» означает круг через СТАРТ и получение зарплаты.',
    },
  },
  {
    id: 'mortgage',
    title: { en: 'Mortgaging', uz: "Garovga qo'yish", ru: 'Залог' },
    body: {
      en: "Short on cash? Mortgage a property for half its price. It stops earning rent immediately. You then have {deadline} laps to redeem it by paying back the full price ({redeemPct}% interest on the amount you borrowed) \u2014 miss the deadline and the bank forecloses for nothing. A lock and the laps left show on the board, turning red when time is short. You can't mortgage a property with development on it, and can't develop a group while any property in it is mortgaged.",
      uz: "Pul yetishmayaptimi? Mulkni narxining yarmiga garovga qo'ying. U darhol ijara keltirishdan to'xtaydi. Keyin uni to'liq narxini to'lab (olgan summangizga {redeemPct}% foiz) qaytarib olish uchun {deadline} aylana vaqtingiz bor \u2014 muddatni o'tkazib yuborsangiz, bank uni hech qanday tovonsiz musodara qiladi. Qulf va qolgan aylanalar soni taxtada ko'rinadi, vaqt kam qolganda qizil bo'ladi. Rivojlantirilgan mulkni garovga qo'yib bo'lmaydi, guruhdagi biror mulk garovda bo'lsa, guruhni rivojlantirib bo'lmaydi.",
      ru: 'Не хватает денег? Заложите имущество за половину его цены. Оно сразу перестаёт приносить ренту. На выкуп у вас {deadline} кругов: нужно вернуть полную цену ({redeemPct}% сверху от полученной суммы) \u2014 пропустите срок, и банк заберёт имущество без компенсации. Замок и число оставшихся кругов видны на поле и краснеют, когда времени мало. Нельзя заложить имущество с постройками, и нельзя развивать группу, пока что-то из неё в залоге.',
    },
  },
  {
    id: 'loans',
    title: { en: 'Bank loans', uz: 'Bank kreditlari', ru: 'Банковские кредиты' },
    body: {
      en: "Visit the Bank to borrow up to {loanMax}, repaid automatically over the next {loanInstallments} times you pass or land on START, with {loanPct}% interest included in the total. A notification appears whenever an installment is paid. You can pay it off early in full at the Bank, and only one loan is allowed at a time. Some event cards can reduce, forgive, or extend a loan's term.",
      uz: "Bankka borib {loanMax} gacha kredit oling: u keyingi {loanInstallments} marta BOSHLANISH'dan o'tganingizda yoki unga tushganingizda avtomatik to'lanadi, jami summaga {loanPct}% foiz kiritilgan. Har bir to'lov to'langanda xabar chiqadi. Uni bankda to'liq muddatidan oldin to'lashingiz mumkin, bir vaqtning o'zida faqat bitta kredit ruxsat etiladi. Ba'zi voqea kartalari kreditni kamaytirishi, kechirishi yoki muddatini uzaytirishi mumkin.",
      ru: 'В банке можно взять до {loanMax}; сумма списывается автоматически за следующие {loanInstallments} прохождения или остановки на СТАРТЕ, {loanPct}% процентов уже входят в общую сумму. При каждом платеже появляется уведомление. Можно погасить кредит досрочно и целиком в банке; одновременно разрешён только один кредит. Некоторые карточки событий могут уменьшить, списать или продлить кредит.',
    },
  },
  {
    id: 'detention',
    title: { en: 'Tax Inspection', uz: 'Soliq tekshiruvi', ru: 'Налоговая проверка' },
    body: {
      en: "Sent to Tax Inspection? Pay a fine, use a Release Paper, or try to roll doubles on your turn. The fine drops the longer you wait: {fineFirst} at first, down to {fineLast} on your last chance \u2014 but your properties earn you no rent while you're inside, so waiting has a real cost too.",
      uz: "Soliq tekshiruviga yuborildingizmi? Jarima to'lang, Ozodlik varaqasidan foydalaning yoki navbatingizda dubl tashlashga harakat qiling. Qancha uzoq kutsangiz, jarima shuncha kamayadi: avval {fineFirst}, oxirgi imkoniyatda {fineLast} \u2014 lekin ichkarida bo'lganingizda mulklaringiz ijara keltirmaydi, shuning uchun kutishning ham haqiqiy narxi bor.",
      ru: 'Отправили на налоговую проверку? Заплатите штраф, используйте бумагу об освобождении или попробуйте выбросить дубль в свой ход. Чем дольше ждёте, тем штраф меньше: сначала {fineFirst}, на последней попытке \u2014 {fineLast}. Но пока вы внутри, ваше имущество не приносит ренты, так что ожидание тоже чего-то стоит.',
    },
  },
  {
    id: 'cards',
    title: { en: 'Mahalla & Business cards', uz: 'Mahalla va Biznes kartalari', ru: 'Карточки Махалли и Бизнеса' },
    body: {
      en: 'Land on a card space and draw from the Mahalla or Business Opportunity deck \u2014 small community events or bigger business swings, with real effects on your cash, position, taxes, and loans. Read the card, press OK, and its effect is applied.',
      uz: "Karta maydoniga tushing va Mahalla yoki Biznes imkoniyati to'plamidan karta oling \u2014 kichik jamoaviy voqealar yoki kattaroq biznes o'zgarishlari, pulingizga, o'rningizga, soliqlaringizga va kreditlaringizga haqiqiy ta'sir qiladi. Kartani o'qing, OK bosing \u2014 ta'siri qo'llaniladi.",
      ru: 'Остановившись на клетке карточки, вы берёте карту из колоды Махалли или Бизнес-возможностей \u2014 небольшие события общины или крупные деловые повороты с реальным влиянием на деньги, позицию, налоги и кредиты. Прочитайте карточку, нажмите OK \u2014 и эффект применится.',
    },
  },
  {
    id: 'taxes',
    title: { en: 'Taxes', uz: 'Soliqlar', ru: 'Налоги' },
    body: {
      en: "Income Tax costs {incomePct}% of your cash on hand. Business Tax charges {propTax} for every unmortgaged asset you own \u2014 cheap early on, expensive once you've built an empire.",
      uz: "Daromad solig'i qo'lingizdagi naqd pulning {incomePct}% ini tashkil qiladi. Biznes solig'i garovga qo'yilmagan har bir aktivingiz uchun {propTax} oladi \u2014 boshida arzon, imperiya qurgach qimmat.",
      ru: 'Подоходный налог \u2014 {incomePct}% ваших наличных. Деловой налог \u2014 {propTax} за каждый незаложенный актив: сначала дёшево, но дорого, когда империя построена.',
    },
  },
  {
    id: 'official',
    title: { en: 'Local Official', uz: 'Mahalliy amaldor', ru: 'Местный чиновник' },
    body: {
      en: 'Land on this space and you pay a flat {toll} to keep things moving \u2014 no choice involved, the cost of doing business.',
      uz: "Shu maydonga tushsangiz, ishlar yurishib ketishi uchun qat'iy {toll} to'laysiz \u2014 tanlov yo'q, bu biznes yuritish narxi.",
      ru: 'Остановившись на этой клетке, вы платите фиксированные {toll}, чтобы дела шли \u2014 без выбора, такова цена ведения бизнеса.',
    },
  },
  {
    id: 'bribe',
    title: { en: 'Bribe a Senior Official', uz: 'Yuqori amaldorga pora berish', ru: 'Подкуп высокопоставленного чиновника' },
    body: {
      en: "The Senior Official has his own cell on the board (top-right corner). Land on it and you may \u2014 entirely by choice, and only while you are standing there \u2014 try your luck once: {lossPct}% chance to lose a random {lossMin} to {lossMax}, {jailPct}% chance of landing straight in Tax Inspection, and {gainPct}% chance to gain a random {gainMin} to {gainMax}. The odds are not in your favor \u2014 it's there for players who like to gamble, not a reliable strategy.",
      uz: "Katta amaldorning taxtada o'z katagi bor (yuqori o'ng burchak). Unga tushsangiz, faqat o'sha yerda turganingizda va butunlay ixtiyoriy ravishda bir marta omadingizni sinashingiz mumkin: {lossPct}% ehtimol bilan tasodifiy {lossMin} dan {lossMax} gacha yo'qotasiz, {jailPct}% ehtimol bilan to'g'ridan-to'g'ri Soliq tekshiruviga tushasiz, {gainPct}% ehtimol bilan tasodifiy {gainMin} dan {gainMax} gacha yutasiz. Ehtimollar sizning foydangizga emas \u2014 bu tavakkalchilarni sevuvchilar uchun, ishonchli strategiya emas.",
      ru: 'У высокопоставленного чиновника своя клетка на поле (правый верхний угол). Остановившись на ней, вы можете \u2014 исключительно по желанию и только пока стоите там \u2014 один раз испытать удачу: {lossPct}% \u2014 потерять случайную сумму от {lossMin} до {lossMax}, {jailPct}% \u2014 сразу попасть на налоговую проверку, {gainPct}% \u2014 получить случайную сумму от {gainMin} до {gainMax}. Шансы не в вашу пользу: это для любителей риска, а не надёжная стратегия.',
    },
  },
  {
    id: 'bankruptcy',
    title: { en: 'Bankruptcy', uz: 'Bankrotlik', ru: 'Банкротство' },
    body: {
      en: "Can't cover a debt even after mortgaging everything and selling back your developments? You're out. Debts owed to another player hand them everything you own; debts owed to the bank return your properties to the open market. If you still have positive net worth when you choose to declare bankruptcy, the game double-checks you really mean it.",
      uz: "Hamma narsani garovga qo'yib, rivojlanishlaringizni sotgandan keyin ham qarzni qoplay olmaysizmi? Siz o'yindan chiqasiz. Boshqa o'yinchiga qarzdor bo'lsangiz, unga barcha mol-mulkingiz o'tadi; bankka qarz bo'lsa, mulklaringiz ochiq bozorga qaytadi. Bankrotlikni e'lon qilayotganingizda sof boyligingiz hali musbat bo'lsa, o'yin sizdan ikki marta tasdiq so'raydi.",
      ru: 'Не можете покрыть долг, даже заложив всё и продав постройки? Вы выбываете. Долги другому игроку передают ему всё ваше имущество; долги банку возвращают ваше имущество на открытый рынок. Если при объявлении банкротства ваш чистый капитал ещё положителен, игра дважды уточнит, действительно ли вы этого хотите.',
    },
  },
  {
    id: 'winning',
    title: { en: 'Winning', uz: "G'alaba", ru: 'Победа' },
    body: {
      en: "Play continues until only one player hasn't gone bankrupt \u2014 that player wins. The final table ranks everyone: the winner first, then the others in reverse order of going bankrupt (last one out is second).",
      uz: "O'yin faqat bitta o'yinchi bankrot bo'lmay qolguncha davom etadi \u2014 o'sha g'olib. Yakuniy jadval hammani saralaydi: avval g'olib, keyin qolganlar bankrot bo'lish tartibining teskarisida (oxirgi chiqqan \u2014 ikkinchi).",
      ru: 'Игра продолжается, пока не останется один небанкрот \u2014 он побеждает. В итоговой таблице сначала победитель, затем остальные в обратном порядке банкротства (последний выбывший \u2014 второй).',
    },
  },
];

export function ruleText(tri: Tri, lang: Language, vars: RuleVars = {}): string {
  const raw = lang === 'uz' ? tri.uz : lang === 'ru' ? tri.ru : lang === 'uz-cyrl' ? latinToCyrillic(tri.uz) : tri.en;
  return Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), raw);
}
