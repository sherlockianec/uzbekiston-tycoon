import { describe, it, expect } from 'vitest';
import { latinToCyrillic as tr } from '../src/i18n/translit';

describe('Uzbek Latin -> Cyrillic', () => {
  const cases: [string, string][] = [
    ["O'zbekiston", 'Ўзбекистон'],
    ['O\u02bbzbekiston', 'Ўзбекистон'],
    ['Toshkent', 'Тошкент'],
    ['Samarqand', 'Самарқанд'],
    ["Tug'ilgan kun", 'Туғилган кун'],
    ['mahalla', 'маҳалла'],
    ['Navro\u02bbz', 'Наврўз'],
    ["ma'no", 'маъно'],
    ['shahar', 'шаҳар'],
    ['choy', 'чой'],
    ['kitob', 'китоб'],
    ['yangi', 'янги'],
    ['yo\u02bbl', 'йўл'],
    ['Yoqilg\u02bbi', 'Ёқилғи'],
    ['yer', 'ер'],
    ['Elektr', 'Электр'],
    ['bozor', 'бозор'],
    ['Ozodlik varaqasi', 'Озодлик варақаси'],
    ['jarima', 'жарима'],
    ['xarid', 'харид'],
    ['qo\u02bbng\u02bbiroq', 'қўнғироқ'],
  ];
  it.each(cases)('%s -> %s', (src, want) => {
    expect(tr(src)).toBe(want);
  });

  it('keeps digits, punctuation and spaces', () => {
    expect(tr('30% kredit, 3 ta.')).toBe('30% кредит, 3 та.');
  });
  it('capitalises digraph results correctly', () => {
    expect(tr('Shartnoma')).toBe('Шартнома');
    expect(tr('Chorsu')).toBe('Чорсу');
    expect(tr('Yangi')).toBe('Янги');
  });
  it('leaves {placeholders} untouched', () => {
    expect(tr("{n}-o'yinchi")).toBe('{n}-ўйинчи');
    expect(tr('Jami {startCash} dan boshlaysiz')).toBe('Жами {startCash} дан бошлайсиз');
    expect(tr('{name} navbati')).toBe('{name} навбати');
  });
  it('drops the suffix apostrophe after an ALL-CAPS name but keeps real tutuq', () => {
    expect(tr("BOSHLANISH'dan")).toBe('БОШЛАНИШдан');
    expect(tr("ma'qullandi")).toBe('маъқулланди');
    expect(tr("ta'mirlash")).toBe('таъмирлаш');
  });
  it('is idempotent on Cyrillic input', () => {
    expect(tr('Ўзбекистон')).toBe('Ўзбекистон');
  });
  it('never leaves Latin letters behind in plain Uzbek text', () => {
    const sample = "Mahalla qo'mitasi ko'chaning tozaligi uchun mas'ul. Bozorda mevalar sotiladi.";
    expect(tr(sample)).not.toMatch(/[A-Za-z]/);
  });
});

describe('brand names stay as written', () => {
  it('never transliterates company names', () => {
    expect(tr('Click orqali toʻlang')).toBe('Click орқали тўланг');
    expect(tr('Payme va Uzum')).toBe('Payme ва Uzum');
    expect(tr('Beeline Oʻzbekiston')).toBe('Beeline Ўзбекистон');
    expect(tr("Click'ni oling")).toBe('Click-ни олинг');
    expect(tr('click')).toBe('click');
  });
  it('still converts ordinary words next to brands', () => {
    expect(tr('Korzinka bozori')).toBe('Korzinka бозори');
  });
});
