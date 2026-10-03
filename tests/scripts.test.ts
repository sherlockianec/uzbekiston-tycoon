import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe('source text uses only Latin and Cyrillic scripts', () => {
  it('has no stray Arabic, Hebrew, Indic, Thai or CJK letters (a lookalike letter once slipped into Uzbek Cyrillic)', () => {
    const offenders: string[] = [];
    for (const f of walk('src')) {
      const decoded = readFileSync(f, 'utf8').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      for (const m of decoded.matchAll(/[֐-ۿऀ-෿฀-๿぀-鿿]/g)) {
        offenders.push(`${f}: U+${m[0].charCodeAt(0).toString(16).toUpperCase()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
