/**
 * Uzbek Latin -> Uzbek Cyrillic (official 1995 alphabet mapping).
 *
 * Used for long-form Uzbek content (cards, descriptions, rules) so the Latin
 * text is the single source of truth and the Cyrillic version can never drift.
 * Hand-written Cyrillic (UI chrome, group names) is kept as-is.
 *
 * Known limits (flagged in HANDOFF for native-speaker review): a few loanwords
 * have spellings that need a human (e.g. "ts" digraph words), and brand names
 * are transliterated phonetically.
 */

const APOS = /[\u0027\u02bb\u02bc\u2018\u2019\u0060\u00b4]/; // ' ʻ ʼ ‘ ’ ` ´

const SIMPLE: Record<string, string> = {
  a: 'а', b: 'б', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м',
  n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з',
  c: 'к', w: 'в', // not native to Uzbek; best-effort for brand names
};

function isLetter(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z\u0400-\u04ff]/.test(ch);
}

function matchCase(src: string, out: string): string {
  const isUpper = src !== src.toLowerCase();
  if (!isUpper) return out;
  return out.length > 1 ? out[0].toUpperCase() + out.slice(1) : out.toUpperCase();
}

export function latinToCyrillic(input: string): string {
  let out = '';
  const n = input.length;
  for (let i = 0; i < n; i++) {
    const ch = input[i];
    const lower = ch.toLowerCase();
    const next = input[i + 1];
    const nextLower = next?.toLowerCase();
    const prev = input[i - 1];
    // {placeholders} are template variables, never text: copy them through untouched.
    if (ch === '{') {
      const close = input.indexOf('}', i);
      if (close > i) {
        out += input.slice(i, close + 1);
        i = close;
        continue;
      }
    }
    const wordStart = !isLetter(prev) && !(prev && APOS.test(prev) && isLetter(input[i - 2]));

    // o' / g' (the two apostrophe letters)
    if ((lower === 'o' || lower === 'g') && next && APOS.test(next)) {
      const base = lower === 'o' ? 'ў' : 'ғ';
      out += matchCase(ch, base);
      i += 1;
      continue;
    }
    // sh, ch
    if (lower === 's' && nextLower === 'h') { out += matchCase(ch, 'ш'); i++; continue; }
    if (lower === 'c' && nextLower === 'h') { out += matchCase(ch, 'ч'); i++; continue; }
    // ng - but not when the g is really the letter "g'" (ғ), as in qo'ng'iroq
    if (lower === 'n' && nextLower === 'g' && !(input[i + 2] && APOS.test(input[i + 2]))) {
      out += matchCase(ch, 'нг'); i++; continue;
    }
    // ye / yo / yu / ya - but "yo'" is y + o' (йў), not yo
    if (lower === 'y' && nextLower && 'eoua'.includes(nextLower)) {
      const afterNext = input[i + 2];
      const isApostropheLetter = nextLower === 'o' && afterNext && APOS.test(afterNext);
      if (!isApostropheLetter) {
        const map: Record<string, string> = { e: 'е', o: 'ё', u: 'ю', a: 'я' };
        out += matchCase(ch, map[nextLower]);
        i++;
        continue;
      }
    }
    // e: "э" at word start, "е" elsewhere
    if (lower === 'e') { out += matchCase(ch, wordStart ? 'э' : 'е'); continue; }
    // ts digraph (loanwords): treat as ц only at a clear boundary; default to т+с
    // Lone apostrophe between letters = tutuq belgisi (ъ), e.g. ma'no
    if (APOS.test(ch)) {
      // Suffix glue after an ALL-CAPS name (BOSHLANISH'dan, SQB'dan) is not a tutuq belgisi.
      const afterCaps = !!prev && /[A-Z]/.test(prev) && !!next && /[a-z]/.test(next) && !(input[i - 2] && /[a-z]/.test(input[i - 2]));
      if (afterCaps) continue;
      if (isLetter(prev) && isLetter(next)) out += 'ъ';
      else out += ch;
      continue;
    }
    const m = SIMPLE[lower];
    if (m) { out += matchCase(ch, m); continue; }
    out += ch; // digits, punctuation, spaces, already-Cyrillic text
  }
  return out;
}

/** Convenience: only transliterates when the target is Uzbek Cyrillic. */
export function toUzCyrillic(uzLatin: string): string {
  return latinToCyrillic(uzLatin);
}
