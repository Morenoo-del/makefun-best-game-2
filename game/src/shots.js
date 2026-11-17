// Ember Grove — deterministic screenshot scenes.
//
// The entry's screenshots are real renders of the game's own code, taken in
// a headless browser at ?shot=<scene>&seed=<n>. Each scene builds one fixed
// game state from a seeded generator and a scripted play-through, then
// freezes it: no wall clock, no live input, so the same URL always draws
// the same picture. main.js calls buildShotScene at boot when the query
// carries a shot, and sets window.__shotReady once the frame is drawn.
//
// Scenes: title, play, levelup, victory.

import { makeRng, range } from './rng.js';
import { makeState, updatePlayer, updateFoes, updateBolts, updateOrbs, updateEmbers, updateParticles, updateSpawns, updateClock } from './entities.js';
import { makeFoe, makeBoss, FOE_KINDS } from './world.js';
import { drawChoices } from './upgrades.js';

// A scripted steering pattern: the warden circles the grove centre so the
// simulated play looks like a real run instead of a standing target.
function scriptedMove(t) {
  const a = t * 0.55;
  return { x: Math.cos(a) * 0.9, y: Math.sin(a * 1.3) * 0.9 };
}

// Drive the live update code for `seconds` at a fixed 60 Hz step.
function simulate(state, seconds) {
  const dt = 1 / 60;
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (state.state !== 'playing') break;
    const mv = scriptedMove(state.time);
    updatePlayer(state, dt, mv);
    updateFoes(state, dt);
    updateBolts(state, dt);
    updateOrbs(state, dt);
    updateEmbers(state, dt);
    updateParticles(state, dt);
    updateSpawns(state, dt);
    updateClock(state, dt);
    // Level-ups pause the live game; in a shot we take the blessing at once.
    if (state.level > 1 && state.choices === null) {
      state.choices = drawChoices(state.rng, state.taken);
    }
  }
}

// Scatter a crowd of foes around the arena for a busy action frame. Foes
// keep clear of the warden, so the player still reads at a glance.
function crowd(state, count, kinds) {
  for (let i = 0; i < count; i++) {
    const kind = kinds[Math.floor(state.rng() * kinds.length)];
    const foe = makeFoe(state.rng, kind, state.time, state.rng() < 0.12);
    let x = 640;
    let y = 360;
    for (let tries = 0; tries < 10; tries++) {
      const a = state.rng() * Math.PI * 2;
      const d = range(state.rng, 170, 430);
      x = Math.max(30, Math.min(1250, 640 + Math.cos(a) * d));
      y = Math.max(30, Math.min(690, 360 + Math.sin(a) * d));
      if (Math.hypot(x - state.player.x, y - state.player.y) > 170) break;
    }
    foe.x = x;
    foe.y = y;
    foe.born = 0;
    state.foes.push(foe);
  }
}

function burstEmbers(state, n) {
  for (let i = 0; i < n; i++) {
    const a = state.rng() * Math.PI * 2;
    const d = range(state.rng, 40, 300);
    state.embers.push({
      x: Math.max(20, Math.min(1260, 640 + Math.cos(a) * d)),
      y: Math.max(20, Math.min(700, 360 + Math.sin(a) * d)),
      vx: 0, vy: 0, value: 1,
      kind: state.rng() < 0.2 ? 'big' : 'small',
      phase: state.rng() * Math.PI * 2,
    });
  }
}

export function buildShotScene(scene, seed) {
  const rng = makeRng(seed);
  const state = makeState(seed);
  state.best = 18420;

  if (scene === 'title') {
    state.state = 'title';
    // A few wisps drift behind the title panel so the grove feels alive.
    const wisp = FOE_KINDS[0];
    for (let i = 0; i < 5; i++) {
      const foe = makeFoe(rng, wisp, 0, false);
      foe.x = range(rng, 80, 1200);
      foe.y = range(rng, 560, 680);
      foe.born = 0;
      state.foes.push(foe);
    }
    return state;
  }

  if (scene === 'play') {
    state.state = 'playing';
    state.time = 118;
    state.level = 7;
    state.xp = 12;
    state.xpNext = 41;
    state.kills = 96;
    state.embersGot = 74;
    state.score = 12480;
    state.player.boltDamage = 22;
    state.player.fireRate = 2.2;
    state.player.multishot = 3;
    state.player.pierce = 1;
    state.player.novaLevel = 2;
    state.player.auraLevel = 1;
    state.player.auraRadius = 52;
    state.taken = { ember: 2, rapid: 2, split: 2, pierce: 1, nova: 2, aura: 1 };
    crowd(state, 26, FOE_KINDS.slice(0, 4));
    burstEmbers(state, 22);
    simulate(state, 1.2);
    // A frozen frame must not catch a mid-flash: clear transient screen
    // effects so the shot shows the grove, not the damage vignette.
    state.flashRed = 0;
    state.shake = 0;
    state.novaFlash = 0;
    state.banner = 'Chapter III — Spitting Gloom';
    state.bannerTimer = 1.8;
    return state;
  }

  if (scene === 'levelup') {
    state.state = 'playing';
    state.time = 96;
    state.level = 6;
    state.xp = 0;
    state.xpNext = 36;
    state.kills = 71;
    state.embersGot = 58;
    state.score = 9310;
    state.player.boltDamage = 20;
    state.player.fireRate = 2.0;
    state.player.multishot = 2;
    state.taken = { ember: 2, rapid: 2, split: 1 };
    crowd(state, 12, FOE_KINDS.slice(0, 3));
    burstEmbers(state, 10);
    simulate(state, 0.4);
    state.flashRed = 0;
    state.shake = 0;
    state.novaFlash = 0;
    // The level-up itself: freeze the run and offer three blessings.
    state.state = 'levelup';
    state.choices = drawChoices(rng, state.taken);
    return state;
  }

  if (scene === 'victory') {
    state.state = 'won';
    state.time = 300;
    state.level = 14;
    state.kills = 412;
    state.embersGot = 388;
    state.score = 52140;
    state.bossSlain = true;
    state.best = 52140;
    const boss = makeBoss();
    boss.x = 640;
    boss.y = 300;
    boss.hp = 0;
    boss.dead = true;
    // Dawn light: a few embers still drifting where the Herald fell.
    burstEmbers(state, 18);
    return state;
  }

  // Unknown scene: fall back to the title.
  state.state = 'title';
  return state;
}

// The ordered shot list the entry ships, for shots.json.
export const SHOT_SCENES = [
  { name: '1-title.jpg', query: '?shot=title&seed=7' },
  { name: '2-play.jpg', query: '?shot=play&seed=7' },
  { name: '3-levelup.jpg', query: '?shot=levelup&seed=7' },
  { name: '4-victory.jpg', query: '?shot=victory&seed=7' },
];
