// Ember Grove — the night itself: spawning, waves and the dawn timer.
//
// The run lasts DAWN_SECONDS: survive until then and the grove is saved.
// Spawns start as lone wisps and grow into mixed packs; every 60 seconds a
// new foe kind joins the night, and the Gloom Herald arrives at 240 s.

import { range, intIn, chance } from './rng.js';

export const ARENA_W = 1280;
export const ARENA_H = 720;
export const DAWN_SECONDS = 300;

// Foe kinds, in the order they join the night. `from` is the second they
// first appear; weights shift toward the heavier kinds as the night deepens.
export const FOE_KINDS = [
  { kind: 'wisp', from: 0, weight: 10, hp: 12, speed: 78, radius: 13, dmg: 8, score: 10, ember: 1 },
  { kind: 'skitter', from: 45, weight: 7, hp: 18, speed: 128, radius: 12, dmg: 10, score: 15, ember: 1 },
  { kind: 'spitter', from: 90, weight: 5, hp: 26, speed: 62, radius: 15, dmg: 12, score: 25, ember: 2 },
  { kind: 'brute', from: 140, weight: 4, hp: 95, speed: 44, radius: 24, dmg: 18, score: 40, ember: 3 },
  { kind: 'wraith', from: 200, weight: 3, hp: 46, speed: 96, radius: 14, dmg: 14, score: 35, ember: 2 },
];

export const BOSS_AT = 240;

// How many foes may be alive at once grows with the clock, so the screen
// stays readable early and crowded late.
export function foeCapAt(t) {
  return Math.min(90, 14 + Math.floor(t / 9));
}

// Seconds between spawn ticks; packs arrive faster as dawn approaches.
export function spawnIntervalAt(t) {
  return Math.max(0.32, 1.15 - t * 0.0026);
}

// How many foes one spawn tick drops.
export function packSizeAt(rng, t) {
  if (t < 60) return 1;
  if (t < 150) return intIn(rng, 1, 2);
  return intIn(rng, 2, 3);
}

// Pick a foe kind available at time t, weighted toward the night's mood.
export function pickKind(rng, t) {
  const open = FOE_KINDS.filter((f) => t >= f.from);
  let total = 0;
  for (const f of open) total += f.weight;
  let roll = rng() * total;
  for (const f of open) {
    roll -= f.weight;
    if (roll <= 0) return f;
  }
  return open[0];
}

// A spawn point just outside one edge of the arena, away from the player.
export function spawnPoint(rng, player) {
  for (let tries = 0; tries < 8; tries++) {
    const edge = Math.floor(rng() * 4);
    let x;
    let y;
    if (edge === 0) { x = range(rng, 0, ARENA_W); y = -30; }
    else if (edge === 1) { x = ARENA_W + 30; y = range(rng, 0, ARENA_H); }
    else if (edge === 2) { x = range(rng, 0, ARENA_W); y = ARENA_H + 30; }
    else { x = -30; y = range(rng, 0, ARENA_H); }
    if (Math.hypot(x - player.x, y - player.y) > 320) return { x, y };
  }
  return { x: -30, y: range(rng, 0, ARENA_H) };
}

// Elites: from 90 s on, a small share of spawns arrive bigger, tougher and
// worth a burst of embers.
export function rollElite(rng, t) {
  return t >= 90 && chance(rng, 0.07);
}

// The night's chapter name, shown on the wave banner.
export function chapterAt(t) {
  if (t < 45) return 'Chapter I — First Wisps';
  if (t < 90) return 'Chapter II — Skittering Dark';
  if (t < 140) return 'Chapter III — Spitting Gloom';
  if (t < 200) return 'Chapter IV — Heavy Shadows';
  if (t < 240) return 'Chapter V — Wraiths in the Mist';
  if (t < 280) return 'Chapter VI — The Herald Wakes';
  return 'Final Chapter — Hold Until Dawn';
}

// Build a foe from a kind definition and the current clock.
export function makeFoe(rng, kind, t, elite) {
  const hpScale = 1 + t / 150;
  const foe = {
    kind: kind.kind,
    x: 0,
    y: 0,
    radius: kind.radius * (elite ? 1.5 : 1),
    hp: Math.round(kind.hp * hpScale * (elite ? 3.2 : 1)),
    maxHp: 0,
    speed: kind.speed * range(rng, 0.9, 1.1) * (elite ? 0.85 : 1),
    dmg: kind.dmg * (elite ? 2 : 1),
    score: kind.score * (elite ? 4 : 1),
    ember: kind.ember * (elite ? 5 : 1),
    elite,
    // Wobble phase for skittering movement, spit timer for spitters.
    phase: rng() * Math.PI * 2,
    spitTimer: range(rng, 1.5, 3),
    // Contact damage cooldown per foe.
    touchCd: 0,
    flash: 0,
    // Spawn-in telegraph: 0.5 s of fading in before the foe can hurt.
    born: 0.5,
    dead: false,
  };
  foe.maxHp = foe.hp;
  return foe;
}

// The Gloom Herald: the run's boss, a slow ring of shadow that spits radial
// bursts and calls wisps to its side.
export function makeBoss() {
  return {
    kind: 'herald',
    x: 640,
    y: -60,
    radius: 52,
    hp: 1500,
    maxHp: 1500,
    speed: 34,
    dmg: 24,
    score: 500,
    ember: 25,
    elite: true,
    phase: 0,
    spitTimer: 2.5,
    touchCd: 0,
    flash: 0,
    born: 0.8,
    dead: false,
    burstCd: 6,
    summonCd: 9,
  };
}

// A random decorative name for a foe kind, used only in the bestiary line.
export function kindLabel(kind) {
  return {
    wisp: 'Gloom Wisp',
    skitter: 'Skitter Shade',
    spitter: 'Spitting Gloom',
    brute: 'Brute Shadow',
    wraith: 'Mist Wraith',
    herald: 'The Gloom Herald',
  }[kind] || kind;
}
