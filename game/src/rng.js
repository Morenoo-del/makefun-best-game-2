// Ember Grove — seeded random numbers.
//
// One tiny deterministic generator (mulberry32) drives every roll the game
// makes: enemy spawns, ember drops, upgrade offers and the decorative
// fireflies. Seeded runs make the screenshot scenes reproducible, and the
// live game simply seeds from the clock at the start of a run.

export function makeRng(seed) {
  let a = seed >>> 0;
  if (a === 0) a = 0x9e3779b9;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Roll a float in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Roll an integer in [min, max] inclusive.
export function intIn(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Pick one element of an array at random.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// True with probability p (0..1): the readable form of `rng() < p`.
export function chance(rng, p) {
  return rng() < p;
}

// A stable hash of a short string, for turning a scene name into a seed.
export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
