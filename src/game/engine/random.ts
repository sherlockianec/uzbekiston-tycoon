// A small, dependency-free seedable PRNG (mulberry32). Not cryptographic —
// just deterministic, which is what makes dice rolls and card shuffles
// unit-testable.

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  function nextFloat(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next: nextFloat,
    int(min: number, max: number) {
      return min + Math.floor(nextFloat() * (max - min + 1));
    },
  };
}

/** Fisher-Yates shuffle using the given Rng. Returns a new array. */
export function shuffle<T>(items: T[], rng: Rng): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
