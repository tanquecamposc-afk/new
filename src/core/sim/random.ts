/**
 * Deterministic hashing for "random" gameplay values that must be reproducible from a seed:
 * weapon spread, recoil, bot decisions. Never used for anything security related.
 */

/** Mixes up to four integers into one well-distributed unsigned 32-bit value. */
export function hash32(a: number, b = 0, c = 0, d = 0): number {
  let h = 0x9e3779b9 ^ (a | 0);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h ^= b | 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= c | 0;
  h = Math.imul(h ^ (h >>> 16), 0x27d4eb2f);
  h ^= d | 0;
  h = Math.imul(h ^ (h >>> 15), 0x165667b1);
  h ^= h >>> 16;
  return h >>> 0;
}

/** FNV-1a over the UTF-16 code units of a string. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Uniform value in [0, 1) derived from a hash; `n` selects one of several independent values. */
export function hashUnit(seed: number, n = 0): number {
  return hash32(seed, n, 0x51ed270b) / 4294967296;
}
