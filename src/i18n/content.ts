import type { CardDef, Difficulty, Language, PersonalityId } from '../game/types';
import { latinToCyrillic } from './translit';
import { DEVELOPMENT_LEVEL_NAMES, DEVELOPMENT_LEVEL_NAMES_RU, DEVELOPMENT_LEVEL_NAMES_UZ, DEVELOPMENT_LEVEL_NAMES_UZ_CYRL } from '../game/data/economy';

/**
 * Long-form game content in each language. English lives next to the data
 * (cards.ts, properties.ts); this file adds Uzbek (Latin) and Russian. Uzbek
 * Cyrillic is generated from the Uzbek Latin text by `latinToCyrillic` so the
 * two Uzbek scripts can never drift apart.
 *
 * NOTE: written by a non-native speaker; a native Uzbek / Russian reviewer
 * should proofread before any public release (see HANDOFF.md).
 */

type Pair = { uz: string; ru: string };

export function pickText(lang: Language, en: string, tr: Pair | undefined): string {
  if (!tr) return en;
  switch (lang) {
    case 'uz':
      return tr.uz;
    case 'ru':
      return tr.ru;
    case 'uz-cyrl':
      return latinToCyrillic(tr.uz);
    default:
      return en;
  }
}

// --- Cards -------------------------------------------------------------------

interface CardTr {
  titleRu: string;
  textUz: string;
  textRu: string;
}

const CARD_TR: Record<string, CardTr> = {
  'wedding-expenses': { titleRu: 'Свадьба', textUz: "Qarindoshingiz uylanyapti. Siz to'yga hissa qo'shasiz.", textRu: 'Родственник женится. Вы вносите вклад в праздник.' },
  'childrens-festival': { titleRu: 'Детский праздник', textUz: "Siz bolalar bayrami jamg'armasini tashkil qildingiz. Boshqa har bir o'yinchi hissa qo'shadi.", textRu: 'Вы организуете фонд детского праздника. Все остальные игроки скидываются.' },
  'hashar-cleanup': { titleRu: 'Хашар', textUz: "Siz qo'shniga tomini ta'mirlashda yordam berish uchun hashar uyushtirdingiz. Dasturxon xarajatlari sizning zimmangizda.", textRu: 'Вы организовали хашар, чтобы помочь соседу починить крышу. Угощение за ваш счёт.' },
  'birthday-gift': { titleRu: 'День рождения', textUz: "Bugun sizning tug'ilgan kuningiz. Do'stlar va qarindoshlar sovg'alar olib kelishdi.", textRu: 'У вас день рождения. Друзья и родные приносят подарки.' },
  'mahalla-committee': { titleRu: 'Комитет махалли', textUz: "Sizni mahalla qo'mitasiga bir muddatga saylashdi, siz esa haq olasiz.", textRu: 'Вас избрали в комитет махалли на срок, вы получаете вознаграждение.' },
  'pipe-burst': { titleRu: 'Прорвало трубу', textUz: "Uyda suv quvuri yorildi. Ta'mirlash uchun to'laysiz.", textRu: 'Дома прорвало водопроводную трубу. Вы оплачиваете ремонт.' },
  'relative-debt-repaid': { titleRu: 'Старый долг возвращён', textUz: 'Qarindoshingiz yillar oldin olgan qarzini kutilmaganda qaytardi.', textRu: 'Родственник неожиданно возвращает деньги, взятые в долг много лет назад.' },
  'navruz-gift': { titleRu: 'Подарок на Навруз', textUz: "Navro'z bayrami sumalak va kichik pul konvertlarida sovg'alar olib keladi.", textRu: 'Праздник Навруз приносит подарки: сумаляк и небольшие конверты с деньгами.' },
  'doctor-visit': { titleRu: 'Визит к врачу', textUz: "Oddiy tekshiruv rejadagidan uzoqroq cho'zildi. Hisobni to'laysiz.", textRu: 'Обычный осмотр затянулся дольше, чем планировалось. Вы оплачиваете счёт.' },
  'bazaar-day': { titleRu: 'Базарный день', textUz: "Hafta oxiri bozorida o'z hovlingizda yetishtirgan mahsulotlarni sotasiz.", textRu: 'На базаре выходного дня вы продаёте овощи и фрукты со своего двора.' },
  'school-supplies': { titleRu: 'Начало учебного года', textUz: "Yangi o'quv yili bolalar uchun yangi buyumlar va forma xarajatlarini olib keladi.", textRu: 'Новый учебный год — новые принадлежности и форма для детей.' },
  'yard-repairs': { titleRu: 'Ремонт двора', textUz: "Qish tushmasdan hovli devorini qayta qurish kerak.", textRu: 'Перед зимой нужно заново выложить стену во дворе.' },
  'countryside-trip': { titleRu: 'Поездка за город', textUz: "Hafta oxiridagi sayohat sizni shahar chetidagi bozorlar tomon olib boradi. Chorsu bozoriga o'ting; BOSHLANISH'dan o'tsangiz, maosh oling.", textRu: 'Поездка на выходные приводит вас к базарам на окраине города. Переместитесь на Чорсу-базар; если пройдёте СТАРТ, получите зарплату.' },
  'local-raffle': { titleRu: 'Местная лотерея', textUz: "Mahalla lotereyasida kichik sovrin yutdingiz.", textRu: 'Вы выигрываете небольшой приз в местной лотерее.' },
  'missed-watch-duty': { titleRu: 'Пропущенное дежурство', textUz: "Mahalla navbatchiligini o'tkazib yubordingiz va kichik jarima to'laysiz.", textRu: 'Вы пропустили смену в махаллинском дежурстве и платите небольшой штраф.' },
  'guest-hosting': { titleRu: 'Гости приехали', textUz: "Uzoq qarindoshlar xabarsiz mehmon bo'lib kelishdi. Ularni yaxshi kutib olmaslik mumkin emas.", textRu: 'Дальние родственники приехали без предупреждения. Принять их достойно — дело чести.' },
  'mahalla-release-paper': { titleRu: 'Бумага об освобождении', textUz: "Soliq tekshiruvidan chiqarib yuboradigan hujjat. Kerak bo'lguncha saqlang yoki almashtiring.", textRu: 'Документ, освобождающий вас из налоговой проверки. Храните до нужного момента или обменяйте.' },
  'mahalla-loan-relief': { titleRu: 'Поддержка махалли', textUz: "Mahalla sizni bank oldida kafolatlaydi. Kreditingiz bo'lsa, qolgan qoldiq 30% ga kamayadi.", textRu: 'Махалля поручилась за вас перед банком. Если у вас есть кредит, остаток уменьшается на 30%.' },
  'mahalla-loan-forgiven': { titleRu: 'Грантовая программа', textUz: "Kichik biznes granti qarzingizni yopadi. Kreditingiz bo'lsa, u to'liq kechiriladi.", textRu: 'Грант для малого бизнеса покрывает ваш долг. Если у вас есть кредит, он полностью списывается.' },
  'mahalla-loan-extended': { titleRu: 'Кредитные каникулы', textUz: "Bank sizga qo'shimcha vaqt beradi. Kreditingiz bo'lsa, to'lash uchun bitta qo'shimcha aylana beriladi (jami summa o'sha, to'lovlar kichikroq).", textRu: 'Банк даёт вам больше времени. Если у вас есть кредит, на его погашение добавляется ещё один круг (общая сумма та же, платежи меньше).' },
  'new-contract': { titleRu: 'Новый контракт', textUz: 'Sizga yangi ishonchli yetkazib berish shartnomasi nasib etdi.', textRu: 'Вы заключаете выгодный новый контракт на поставки.' },
  'customs-delay': { titleRu: 'Задержка на таможне', textUz: "Yuk bojxonada ushlab qolindi. Saqlash haqlari oshib bormoqda.", textRu: 'Груз задержан на таможне. Расходы на хранение растут.' },
  'tax-audit': { titleRu: 'Налоговая проверка', textUz: "Tekshiruv hujjatlarda xato topdi. Uni tezda hal qilasiz.", textRu: 'Проверка выявила ошибку в документах. Вы быстро её устраняете.' },
  'ipo-success': { titleRu: 'Успешное IPO', textUz: "Korxonalaringizdan biri birjaga muvaffaqiyatli chiqdi.", textRu: 'Одно из ваших предприятий успешно выходит на биржу.' },
  'fuel-shock': { titleRu: 'Скачок цен на топливо', textUz: "Yoqilg'i narxi keskin oshdi; har bir transport aktivingiz uchun xarajat qilasiz.", textRu: 'Цены на топливо резко растут: вы платите за каждый ваш транспортный актив.' },
  'tourist-season': { titleRu: 'Туристический сезон', textUz: "Kuchli turistik mavsum hammaga foyda keltiradi — har bir o'yinchidan ulush olasiz.", textRu: 'Сильный туристический сезон выгоден всем — вы получаете долю от каждого игрока.' },
  'construction-boom': { titleRu: 'Строительный бум', textUz: "Eng yaqin qurilish va sanoat mulkiga o'ting. Egasiz bo'lsa, sotib olishingiz mumkin; egasi bo'lsa, ikki baravar ijara to'laysiz.", textRu: 'Переместитесь на ближайший объект группы «Строительство». Если он свободен — можете купить; если занят — платите двойную ренту.' },
  'bank-loan': { titleRu: 'Кредит одобрен', textUz: "Bank krediti uchun arizangiz qulay shartlarda ma'qullandi.", textRu: 'Ваша заявка на банковский кредит одобрена на хороших условиях.' },
  'it-export-grant': { titleRu: 'Грант на ИТ-экспорт', textUz: "IT eksportini qo'llab-quvvatlash uchun davlat granti oldingiz.", textRu: 'Вы получаете государственный грант на поддержку ИТ-экспорта.' },
  'export-contract-cancelled': { titleRu: 'Контракт расторгнут', textUz: "Eksport shartnomasi oxirgi daqiqada barbod bo'ldi.", textRu: 'Экспортный контракт срывается в последний момент.' },
  'new-branch-opens': { titleRu: 'Новый филиал', textUz: "Yangi filial ochilishini nazorat qilish uchun orqaga qaytasiz.", textRu: 'Вы возвращаетесь, чтобы проследить за открытием нового филиала.' },
  'stock-dip': { titleRu: 'Падение на бирже', textUz: "Qisqa muddatli bozor pasayishi portfelingizni biroz kamaytiradi.", textRu: 'Краткосрочное падение рынка немного уменьшает ваш портфель.' },
  'government-tender': { titleRu: 'Выигран госзаказ', textUz: "Yirik davlat tenderini yutdingiz. BOSHLANISH'ga o'ting va maosh oling.", textRu: 'Вы выигрываете крупный государственный тендер. Переместитесь на СТАРТ и получите зарплату.' },
  'auditors-arrive': { titleRu: 'Приехали аудиторы', textUz: "Mulklaringizning to'liq auditi har bir rivojlangan obyektda mayda kamchiliklarni aniqladi.", textRu: 'Полный аудит ваших активов выявляет мелкие нарушения на каждом застроенном объекте.' },
  'startup-payout': { titleRu: 'Выплата от стартапа', textUz: "Mahalliy startapga qilingan dastlabki sarmoya nihoyat o'zini oqladi.", textRu: 'Ранние инвестиции в местный стартап наконец окупаются.' },
  'business-dispute': { titleRu: 'Деловой спор', textUz: "Shartnoma nizosi sizni soliq inspektorlari qarshisiga olib keldi. To'g'ridan-to'g'ri Soliq tekshiruviga boring.", textRu: 'Спор по контракту приводит вас к налоговым инспекторам. Отправляйтесь прямо на налоговую проверку.' },
  'business-release-paper': { titleRu: 'Бумага об освобождении', textUz: "Soliq tekshiruvidan chiqarib yuboradigan hujjat. Kerak bo'lguncha saqlang yoki almashtiring.", textRu: 'Документ, освобождающий вас из налоговой проверки. Храните до нужного момента или обменяйте.' },
  'business-tax-exemption': { titleRu: 'Налоговая льгота', textUz: "Erkin zona sertifikati. Keyingi safar daromad yoki biznes solig'i maydoniga tushsangiz, hech narsa to'lamaysiz. Ishlatilguncha saqlanadi.", textRu: 'Сертификат свободной зоны. В следующий раз, попав на клетку подоходного или делового налога, вы ничего не платите. Хранится до использования.' },
  'business-supplier-discount': { titleRu: 'Скидка от поставщика', textUz: "Hamkor keyingi mulk xaridingizga yarim narx taklif qiladi. Ishlatilguncha saqlanadi.", textRu: 'Партнёр предлагает половину цены на вашу следующую покупку имущества. Хранится до использования.' },
  'business-early-bird': { titleRu: 'Предложение раннего заказа', textUz: "Quruvchi keyingi mulk xaridingizga 25% chegirma beradi. Ishlatilguncha saqlanadi.", textRu: 'Застройщик даёт скидку 25% на вашу следующую покупку имущества. Хранится до использования.' },
};

export function cardTitle(card: CardDef, lang: Language): string {
  const tr = CARD_TR[card.id];
  return pickText(lang, card.title, tr ? { uz: card.titleUz, ru: tr.titleRu } : { uz: card.titleUz, ru: card.title });
}

export function cardText(card: CardDef, lang: Language): string {
  const tr = CARD_TR[card.id];
  return pickText(lang, card.text, tr ? { uz: tr.textUz, ru: tr.textRu } : undefined);
}

/** Exposed for tests: every card must have a translation entry. */
export const CARD_TRANSLATION_IDS = Object.keys(CARD_TR);

// --- Property descriptions ----------------------------------------------------

const PROPERTY_DESC: Record<string, Pair> = {
  'chorsu-bazaar': { uz: "Asrlik tarixga ega ulkan yopiq bozor. Arzon peshtaxtalar, odam ko'p.", ru: 'Огромный крытый рынок с вековой историей. Недорогие прилавки, большой поток людей.' },
  'qumtepa-bazaar': { uz: "Mevalari va to'qimachiligi bilan mashhur gavjum mahalla bozori.", ru: 'Оживлённый районный базар, известный овощами, фруктами и текстилем.' },
  korzinka: { uz: "Butun mamlakat bo'ylab tarqalgan supermarketlar tarmog'i, har bir mahallaning bir qismi.", ru: 'Сеть супермаркетов по всей стране, привычная часть каждой махалли.' },
  havas: { uz: "Elektronika va maishiy texnika chakana savdo tarmog'i.", ru: 'Сеть розничной торговли электроникой и бытовой техникой.' },
  makro: { uz: "Ulgurji savdo va o'zi olib ketish formatidagi savdo tarmog'i.", ru: 'Сеть оптовой торговли формата cash-and-carry.' },
  mobiuz: { uz: "Tez kengayayotgan yangiroq mobil aloqa operatori.", ru: 'Новый мобильный оператор, быстро расширяющийся.' },
  ucell: { uz: "Yirik mobil aloqa va ma'lumot uzatish operatori.", ru: 'Крупный оператор мобильной связи и передачи данных.' },
  beeline: { uz: "Mamlakatdagi eng yirik telekom tarmoqlaridan biri.", ru: 'Одна из крупнейших телекоммуникационных сетей страны.' },
  click: { uz: "Mobil to'lovlar va elektron tijorat platformasi.", ru: 'Платформа мобильных платежей и электронной коммерции.' },
  payme: { uz: "Butun mamlakatda ishlatiladigan raqamli hamyon va to'lov ilovasi.", ru: 'Цифровой кошелёк и приложение для оплаты счетов, которым пользуются по всей стране.' },
  uzum: { uz: "Tez rivojlanayotgan marketpleys va fintex superilova.", ru: 'Быстрорастущий маркетплейс и финтех-суперприложение.' },
  agrobank: { uz: "Tarixan qishloq xo'jaligini kreditlashga yo'naltirilgan tijorat banki.", ru: 'Коммерческий банк, исторически ориентированный на кредитование сельского хозяйства.' },
  hamkorbank: { uz: "Keng hududiy filiallar tarmog'iga ega tijorat banki.", ru: 'Коммерческий банк с широкой региональной сетью филиалов.' },
  kapitalbank: { uz: "Mamlakatdagi eng yirik xususiy banklardan biri.", ru: 'Один из крупнейших частных банков страны.' },
  'murad-buildings': { uz: "Turar-joy va tijorat ko'chmas mulki quruvchisi.", ru: 'Застройщик жилой и коммерческой недвижимости.' },
  'enter-engineering': { uz: "Yirik sanoat va fuqarolik qurilishi pudratchisi.", ru: 'Крупный подрядчик в промышленном и гражданском строительстве.' },
  akfa: { uz: "Qurilish materiallari va iste'mol tovarlari konglomerati.", ru: 'Конгломерат по производству стройматериалов и товаров народного потребления.' },
  uzmetkombinat: { uz: "Po'lat va prokat metall ishlab chiqaradigan metallurgiya kombinati.", ru: 'Металлургический комбинат, выпускающий сталь и металлопрокат.' },
  'almalyk-mmc': { uz: "Mis rudasini qayta ishlaydigan kon-metallurgiya kombinati.", ru: 'Горно-металлургический комбинат по переработке медной руды.' },
  'navoiy-mmc': { uz: "Dunyodagi eng yirik oltin qazib olish korxonalaridan biri.", ru: 'Одно из крупнейших в мире золотодобывающих предприятий.' },
  'tashkent-city': { uz: "Keng ko'lamli ko'p funksiyali biznes va turar-joy tumani.", ru: 'Масштабный многофункциональный деловой и жилой район.' },
  tibc: { uz: "Poytaxt moliyaviy tumanidagi eng baland minora.", ru: 'Самая высокая башня финансового района столицы.' },
};

export function propertyDescription(id: string, en: string, lang: Language): string {
  return pickText(lang, en, PROPERTY_DESC[id]);
}
export const PROPERTY_DESCRIPTION_IDS = Object.keys(PROPERTY_DESC);

/** Russian names for assets whose English name is a translatable noun phrase.
 * Brand names (Korzinka, Uzum...) intentionally stay in Latin script. */
export const RU_NAME_OVERRIDES: Record<string, string> = {
  'uzbekistan-railways': 'Железные дороги Узбекистана',
  'tashkent-metro': 'Ташкентский метрополитен',
  'uzbekistan-airways': 'Uzbekistan Airways',
  uzbekneftegaz: 'Узбекнефтегаз',
  uzbekenergo: 'Узбекэнерго',
  tibc: 'Ташкентский международный бизнес-центр',
  'tashkent-city': 'Ташкент-Сити',
};

// --- AI personalities and difficulty -------------------------------------------

const PERSONALITY_TR: Record<PersonalityId, { label: Pair; description: Pair }> = {
  conservative: {
    label: { uz: 'Ehtiyotkor investor', ru: 'Осторожный инвестор' },
    description: { uz: "Qimmat mulkni kamdan-kam sotib oladi, pulni tejaydi, monopoliyalarni ehtiyotkorlik bilan quradi.", ru: 'Редко покупает переоценённое имущество, копит деньги, осторожно собирает монополии.' },
  },
  aggressive: {
    label: { uz: 'Tajovuzkor magnat', ru: 'Агрессивный магнат' },
    description: { uz: "Deyarli hamma narsani sotib oladi, dadil savdolar qiladi, tez-tez puli kamayib qoladi.", ru: 'Скупает почти всё, идёт на смелые сделки, часто остаётся без денег.' },
  },
  developer: {
    label: { uz: "Ko'chmas mulk quruvchisi", ru: 'Застройщик' },
    description: { uz: "Mulk guruhlarini to'ldirishga ustuvorlik beradi va tez rivojlantiradi.", ru: 'Приоритет — собрать группы целиком; активно застраивает.' },
  },
  banker: {
    label: { uz: 'Bankir', ru: 'Банкир' },
    description: { uz: "Katta pul zaxirasini saqlaydi va faqat strategik xarid qiladi.", ru: 'Держит крупные денежные резервы и покупает только стратегически.' },
  },
  chaotic: {
    label: { uz: 'Betartib tadbirkor', ru: 'Хаотичный предприниматель' },
    description: { uz: "Kutilmagan savdo va xaridlar qiladi — ba'zan ajoyib natija beradi.", ru: 'Совершает непредсказуемые сделки и покупки — иногда блестяще.' },
  },
};

export function personalityLabel(id: PersonalityId, en: string, lang: Language): string {
  return pickText(lang, en, PERSONALITY_TR[id].label);
}
export function personalityDescription(id: PersonalityId, en: string, lang: Language): string {
  return pickText(lang, en, PERSONALITY_TR[id].description);
}

const DIFFICULTY_TR: Record<Difficulty, Pair> = {
  easy: { uz: 'Oson', ru: 'Лёгкий' },
  normal: { uz: "O'rtacha", ru: 'Средний' },
  hard: { uz: 'Qiyin', ru: 'Сложный' },
};
export function difficultyLabel(d: Difficulty, en: string, lang: Language): string {
  return pickText(lang, en, DIFFICULTY_TR[d]);
}

// --- Development levels ---------------------------------------------------------

export function devLevelName(level: number, lang: Language): string {
  switch (lang) {
    case 'uz':
      return DEVELOPMENT_LEVEL_NAMES_UZ[level];
    case 'ru':
      return DEVELOPMENT_LEVEL_NAMES_RU[level];
    case 'uz-cyrl':
      return DEVELOPMENT_LEVEL_NAMES_UZ_CYRL[level];
    default:
      return DEVELOPMENT_LEVEL_NAMES[level];
  }
}
