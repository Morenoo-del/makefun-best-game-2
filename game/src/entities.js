// Ember Grove — the living things: player, foes, bolts, embers, particles.
//
// Everything that moves or dies lives here. The functions take the whole
// game state and a step `dt`, so the main loop stays a thin scheduler and
// the screenshot scenes can drive the same code with a scripted player.

import { ARENA_W, ARENA_H, DAWN_SECONDS, BOSS_AT, foeCapAt, spawnIntervalAt, packSizeAt, pickKind, spawnPoint, rollElite, makeFoe, makeBoss, chapterAt } from './world.js';
import { range, makeRng } from './rng.js';
import { sfx } from './audio.js';

export function makePlayer() {
  return {
    x: ARENA_W / 2,
    y: ARENA_H / 2,
    radius: 18,
    hp: 100,
    maxHp: 100,
    speed: 215,
    // Lantern bolt stats; upgrades multiply these.
    boltDamage: 14,
    fireRate: 1.5,
    multishot: 1,
    pierce: 0,
    magnet: 110,
    regen: 0,
    novaLevel: 0,
    novaTimer: 6,
    auraLevel: 0,
    auraRadius: 0,
    wardLevel: 0,
    wardTimer: 0,
    scoreMult: 1,
    // Runtime state.
    fireTimer: 0.4,
    aimX: 1,
    aimY: 0,
    hurtTimer: 0,
    invuln: 0,
    moving: false,
    walkPhase: 0,
  };
}

export function makeState(seed) {
  return {
    seed,
    // The one seeded stream every roll in the run draws from, so a seeded
    // run (and every screenshot scene) plays out the same way twice.
    rng: makeRng(seed),
    time: 0,
    state: 'title',
    player: makePlayer(),
    foes: [],
    bolts: [],
    orbs: [],
    embers: [],
    parts: [],
    floats: [],
    spawnTimer: 1.2,
    bossSpawned: false,
    bossSlain: false,
    chapter: 'Chapter I — First Wisps',
    banner: null,
    bannerTimer: 0,
    kills: 0,
    embersGot: 0,
    score: 0,
    level: 1,
    xp: 0,
    xpNext: 6,
    taken: {},
    choices: null,
    shake: 0,
    flashRed: 0,
    novaFlash: 0,
    best: 0,
    runStats: { boltsFired: 0, damageDealt: 0 },
    muted: false,
  };
}

// --- combat helpers -------------------------------------------------------

function nearestFoe(state, x, y, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const f of state.foes) {
    if (f.born > 0) continue;
    const d = (f.x - x) * (f.x - x) + (f.y - y) * (f.y - y);
    if (d < bestD) { bestD = d; best = f; }
  }
  return best;
}

function fireVolley(state) {
  const p = state.player;
  const target = nearestFoe(state, p.x, p.y, 520);
  if (!target) return;
  const base = Math.atan2(target.y - p.y, target.x - p.x);
  p.aimX = Math.cos(base);
  p.aimY = Math.sin(base);
  const n = p.multishot;
  for (let i = 0; i < n; i++) {
    const spread = n === 1 ? 0 : (i - (n - 1) / 2) * 0.14;
    const a = base + spread;
    state.bolts.push({
      x: p.x + Math.cos(a) * 22,
      y: p.y + Math.sin(a) * 22,
      vx: Math.cos(a) * 520,
      vy: Math.sin(a) * 520,
      damage: p.boltDamage,
      pierce: p.pierce,
      radius: 7,
      life: 1.1,
    });
  }
  state.runStats.boltsFired += n;
  spawnSpark(state, p.x + p.aimX * 24, p.y + p.aimY * 24, 3, '#ffd27a');
  sfx.shoot();
}

function fireNova(state) {
  const p = state.player;
  const dmg = 22 + p.novaLevel * 16;
  const radius = 150 + p.novaLevel * 30;
  for (const f of state.foes) {
    const d = Math.hypot(f.x - p.x, f.y - p.y);
    if (d < radius + f.radius) hurtFoe(state, f, dmg, p.x, p.y, 260);
  }
  state.novaFlash = 0.35;
  state.shake = Math.max(state.shake, 5);
  spawnRing(state, p.x, p.y, radius, '#ffb347');
  sfx.nova();
}

export function hurtFoe(state, foe, dmg, fromX, fromY, knock) {
  foe.hp -= dmg;
  foe.flash = 0.12;
  state.runStats.damageDealt += dmg;
  const d = Math.max(1, Math.hypot(foe.x - fromX, foe.y - fromY));
  foe.x += ((foe.x - fromX) / d) * knock * 0.06;
  foe.y += ((foe.y - fromY) / d) * knock * 0.06;
  addFloat(state, foe.x, foe.y - foe.radius - 6, String(Math.round(dmg)), '#ffe9a8');
  if (foe.hp <= 0 && !foe.dead) killFoe(state, foe);
}

function killFoe(state, foe) {
  foe.dead = true;
  state.kills += 1;
  state.score += Math.round(foe.score * state.player.scoreMult);
  const burstColor = foe.kind === 'herald' ? '#c9a7ff' : foe.elite ? '#ff9d5c' : '#8f7bff';
  spawnBurst(state, foe.x, foe.y, foe.elite ? 26 : 12, burstColor);
  for (let i = 0; i < foe.ember; i++) {
    const a = state.rng() * Math.PI * 2;
    const dist = range(state.rng, 6, 34);
    state.embers.push({
      x: foe.x + Math.cos(a) * dist,
      y: foe.y + Math.sin(a) * dist,
      vx: Math.cos(a) * 60,
      vy: Math.sin(a) * 60,
      value: 1,
      kind: foe.elite ? 'big' : 'small',
      phase: state.rng() * Math.PI * 2,
    });
  }
  if (foe.kind === 'herald') {
    state.bossSlain = true;
    state.banner = 'The Herald falls — the grove breathes again!';
    state.bannerTimer = 3;
    state.shake = 12;
    for (let i = 0; i < 40; i++) {
      state.embers.push({
        x: foe.x + range(state.rng, -60, 60),
        y: foe.y + range(state.rng, -60, 60),
        vx: range(state.rng, -40, 40),
        vy: range(state.rng, -40, 40),
        value: 1,
        kind: 'small',
        phase: state.rng() * Math.PI * 2,
      });
    }
  }
  sfx.foeDie();
}

function hurtPlayer(state, dmg) {
  const p = state.player;
  if (p.invuln > 0) return;
  if (p.wardLevel > 0 && p.wardTimer <= 0) {
    p.wardTimer = 25;
    addFloat(state, p.x, p.y - 30, 'WARDED', '#9fd8ff');
    spawnRing(state, p.x, p.y, 46, '#9fd8ff');
    sfx.click();
    return;
  }
  p.hp -= dmg;
  p.hurtTimer = 0.35;
  p.invuln = 0.6;
  state.shake = Math.max(state.shake, 8);
  state.flashRed = 0.35;
  spawnBurst(state, p.x, p.y, 10, '#ff6b6b');
  sfx.hurt();
  if (p.hp <= 0) {
    p.hp = 0;
    state.state = 'over';
    sfx.defeat();
  }
}

// --- particles, floats, sparks --------------------------------------------

export function spawnBurst(state, x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = state.rng() * Math.PI * 2;
    const sp = range(state.rng, 40, 220);
    state.parts.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: range(state.rng, 0.3, 0.8),
      maxLife: 0.8,
      size: range(state.rng, 2, 5),
      color,
      drag: 0.92,
    });
  }
}

export function spawnSpark(state, x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = state.rng() * Math.PI * 2;
    const sp = range(state.rng, 20, 90);
    state.parts.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: range(state.rng, 0.15, 0.35),
      maxLife: 0.35,
      size: range(state.rng, 1.5, 3),
      color,
      drag: 0.9,
    });
  }
}

export function spawnRing(state, x, y, radius, color) {
  state.parts.push({
    x, y, vx: 0, vy: 0,
    life: 0.4, maxLife: 0.4,
    size: radius, color, ring: true, drag: 1,
  });
}

export function addFloat(state, x, y, text, color) {
  if (state.floats.length > 40) state.floats.shift();
  state.floats.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
}

// --- per-tick updates -------------------------------------------------------

export function updatePlayer(state, dt, mv) {
  const p = state.player;
  p.moving = mv.x !== 0 || mv.y !== 0;
  if (p.moving) {
    p.x += mv.x * p.speed * dt;
    p.y += mv.y * p.speed * dt;
    p.walkPhase += dt * 11;
  }
  p.x = Math.max(26, Math.min(ARENA_W - 26, p.x));
  p.y = Math.max(26, Math.min(ARENA_H - 26, p.y));
  if (p.regen > 0 && p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
  if (p.invuln > 0) p.invuln -= dt;
  if (p.hurtTimer > 0) p.hurtTimer -= dt;
  if (p.wardTimer > 0) p.wardTimer -= dt;

  // Lantern bolts: auto-fire at the nearest foe in range.
  p.fireTimer -= dt;
  if (p.fireTimer <= 0) {
    fireVolley(state);
    p.fireTimer = 1 / p.fireRate;
  }

  // Kindle nova: a burning ring on a timer.
  if (p.novaLevel > 0) {
    p.novaTimer -= dt;
    if (p.novaTimer <= 0) {
      fireNova(state);
      p.novaTimer = 6;
    }
  }

  // Lantern aura: steady burn on foes that crowd the light.
  if (p.auraLevel > 0) {
    const dps = 6 * p.auraLevel;
    for (const f of state.foes) {
      if (f.born > 0) continue;
      if (Math.hypot(f.x - p.x, f.y - p.y) < p.auraRadius + f.radius) {
        f.hp -= dps * dt;
        if (state.rng() < dt * 6) spawnSpark(state, f.x, f.y, 1, '#ffb347');
        if (f.hp <= 0 && !f.dead) killFoe(state, f);
      }
    }
  }
}

export function updateFoes(state, dt) {
  const p = state.player;
  for (const f of state.foes) {
    if (f.dead) continue;
    if (f.born > 0) { f.born -= dt; continue; }
    if (f.flash > 0) f.flash -= dt;
    if (f.touchCd > 0) f.touchCd -= dt;
    f.phase += dt;

    const dx = p.x - f.x;
    const dy = p.y - f.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    let mx = dx / dist;
    let my = dy / dist;
    let speed = f.speed;

    if (f.kind === 'skitter') {
      const wob = Math.sin(f.phase * 6) * 0.7;
      const px = -my * wob;
      const py = mx * wob;
      mx += px;
      my += py;
      const n = Math.hypot(mx, my) || 1;
      mx /= n;
      my /= n;
    } else if (f.kind === 'spitter') {
      // Keep a firing distance: close in when far, back off when near.
      if (dist > 300) speed = f.speed;
      else if (dist < 200) { mx = -mx; my = -my; speed = f.speed * 0.8; }
      else speed = 0;
      f.spitTimer -= dt;
      if (f.spitTimer <= 0 && dist < 460) {
        f.spitTimer = range(state.rng, 2.2, 3.2);
        state.orbs.push({
          x: f.x, y: f.y,
          vx: (dx / dist) * 170, vy: (dy / dist) * 170,
          damage: f.dmg, radius: 8, life: 4,
        });
        spawnSpark(state, f.x, f.y, 4, '#b48cff');
      }
    } else if (f.kind === 'wraith') {
      // Drift in and out of phase: faster when the player is far.
      speed = dist > 260 ? f.speed * 1.25 : f.speed * 0.7;
    } else if (f.kind === 'herald') {
      f.burstCd -= dt;
      f.summonCd -= dt;
      if (f.burstCd <= 0) {
        f.burstCd = 5.5;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          state.orbs.push({
            x: f.x, y: f.y,
            vx: Math.cos(a) * 150, vy: Math.sin(a) * 150,
            damage: 14, radius: 9, life: 5,
          });
        }
        spawnRing(state, f.x, f.y, 70, '#c9a7ff');
        sfx.boss();
      }
      if (f.summonCd <= 0 && state.foes.length < 60) {
        f.summonCd = 9;
        for (let i = 0; i < 3; i++) {
          const w = makeFoe(state.rng, { kind: 'wisp', hp: 12, speed: 78, radius: 13, dmg: 8, score: 10, ember: 1 }, state.time, false);
          w.x = f.x + range(state.rng, -70, 70);
          w.y = f.y + range(state.rng, -70, 70);
          w.born = 0.5;
          state.foes.push(w);
        }
      }
    }

    f.x += mx * speed * dt;
    f.y += my * speed * dt;
    f.x = Math.max(10, Math.min(ARENA_W - 10, f.x));
    f.y = Math.max(10, Math.min(ARENA_H - 10, f.y));

    // Touch damage, throttled per foe so one touch is not a shredder.
    if (f.touchCd <= 0 && dist < f.radius + p.radius - 2) {
      f.touchCd = 0.9;
      hurtPlayer(state, f.dmg);
    }
  }
  state.foes = state.foes.filter((f) => !f.dead);
}

export function updateBolts(state, dt) {
  for (const b of state.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) {
      b.life = 0;
      continue;
    }
    for (const f of state.foes) {
      if (f.dead || f.born > 0) continue;
      if (Math.hypot(f.x - b.x, f.y - b.y) < f.radius + b.radius) {
        hurtFoe(state, f, b.damage, b.x - b.vx * 0.02, b.y - b.vy * 0.02, 120);
        spawnSpark(state, b.x, b.y, 3, '#ffd27a');
        sfx.hit();
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          b.life = 0;
        }
        break;
      }
    }
  }
  state.bolts = state.bolts.filter((b) => b.life > 0);
}

export function updateOrbs(state, dt) {
  const p = state.player;
  for (const o of state.orbs) {
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.life -= dt;
    if (o.life <= 0 || o.x < -30 || o.x > ARENA_W + 30 || o.y < -30 || o.y > ARENA_H + 30) {
      o.life = 0;
      continue;
    }
    if (Math.hypot(p.x - o.x, p.y - o.y) < p.radius + o.radius) {
      o.life = 0;
      hurtPlayer(state, o.damage);
    }
  }
  state.orbs = state.orbs.filter((o) => o.life > 0);
}

export function updateEmbers(state, dt) {
  const p = state.player;
  for (const e of state.embers) {
    e.phase += dt * 4;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d < p.magnet) {
      const pull = 1 - d / (p.magnet + 60);
      const sp = 420 * (0.4 + pull);
      e.vx += ((p.x - e.x) / Math.max(1, d)) * sp * dt * 6;
      e.vy += ((p.y - e.y) / Math.max(1, d)) * sp * dt * 6;
    }
    e.vx *= 0.9;
    e.vy *= 0.9;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (d < p.radius + 12) {
      e.value = 0;
      state.embersGot += 1;
      state.score += Math.round(2 * p.scoreMult);
      gainXp(state, e.kind === 'big' ? 3 : 1);
      if (state.rng() < 0.5) spawnSpark(state, p.x, p.y, 1, '#ffd27a');
      sfx.pickup();
    }
  }
  state.embers = state.embers.filter((e) => e.value > 0);
}

export function gainXp(state, amount) {
  state.xp += amount;
  while (state.xp >= state.xpNext) {
    state.xp -= state.xpNext;
    state.level += 1;
    state.xpNext = Math.round(6 + state.level * 5);
  }
}

export function updateParticles(state, dt) {
  for (const pt of state.parts) {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= pt.drag;
    pt.vy *= pt.drag;
  }
  state.parts = state.parts.filter((pt) => pt.life > 0);
  for (const fl of state.floats) {
    fl.life -= dt;
    fl.y -= 34 * dt;
  }
  state.floats = state.floats.filter((fl) => fl.life > 0);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
  if (state.flashRed > 0) state.flashRed -= dt;
  if (state.novaFlash > 0) state.novaFlash -= dt;
  if (state.bannerTimer > 0) state.bannerTimer -= dt;
}

// --- spawning ---------------------------------------------------------------

export function updateSpawns(state, dt) {
  const t = state.time;
  const chapter = chapterAt(t);
  if (chapter !== state.chapter) {
    state.chapter = chapter;
    state.banner = chapter;
    state.bannerTimer = 2.6;
    sfx.chapter();
  }
  if (!state.bossSpawned && t >= BOSS_AT) {
    state.bossSpawned = true;
    const boss = makeBoss();
    boss.x = 640;
    boss.y = 90;
    state.foes.push(boss);
    state.banner = 'The Gloom Herald has come!';
    state.bannerTimer = 3.2;
    state.shake = 10;
    sfx.boss();
  }
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  state.spawnTimer = spawnIntervalAt(t);
  if (state.foes.length >= foeCapAt(t)) return;
  const pack = packSizeAt(state.rng, t);
  for (let i = 0; i < pack; i++) {
    const kind = pickKind(state.rng, t);
    const foe = makeFoe(state.rng, kind, t, rollElite(state.rng, t));
    const spot = spawnPoint(state.rng, state.player);
    foe.x = spot.x;
    foe.y = spot.y;
    state.foes.push(foe);
  }
}

// --- the dawn ----------------------------------------------------------------

export function updateClock(state, dt) {
  state.time += dt;
  if (state.time >= DAWN_SECONDS && state.state === 'playing') {
    state.time = DAWN_SECONDS;
    state.state = 'won';
    sfx.victory();
  }
}
