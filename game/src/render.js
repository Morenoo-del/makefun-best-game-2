// Ember Grove — every pixel the player sees.
//
// One canvas, one palette: a deep teal night grove lit by warm amber. The
// renderer draws the grove floor, the lantern glow, every entity, the HUD
// and the four screens (title, level-up, game over, victory). It never
// changes game state; it only reads it.

import { ARENA_W, ARENA_H, DAWN_SECONDS, chapterAt } from './world.js';
import { makeRng, range } from './rng.js';

// Decorative grove: seeded once, drawn under everything. Fireflies drift
// with the wall clock on the title screen and freeze in screenshot scenes.
const decoRng = makeRng(20261117);
const TUFTS = [];
const SHROOMS = [];
const STONES = [];
const FLIES = [];
for (let i = 0; i < 90; i++) TUFTS.push({ x: range(decoRng, 10, ARENA_W - 10), y: range(decoRng, 10, ARENA_H - 10), s: range(decoRng, 0.6, 1.4), ph: range(decoRng, 0, 6.28) });
for (let i = 0; i < 14; i++) SHROOMS.push({ x: range(decoRng, 30, ARENA_W - 30), y: range(decoRng, 30, ARENA_H - 30), s: range(decoRng, 0.7, 1.5), hue: decoRng() });
for (let i = 0; i < 10; i++) STONES.push({ x: range(decoRng, 40, ARENA_W - 40), y: range(decoRng, 40, ARENA_H - 40), r: range(decoRng, 8, 22) });
for (let i = 0; i < 36; i++) FLIES.push({ x: range(decoRng, 0, ARENA_W), y: range(decoRng, 0, ARENA_H), sp: range(decoRng, 6, 20), ph: range(decoRng, 0, 6.28) });

export function fitCanvas(canvas) {
  const scale = Math.min(window.innerWidth / ARENA_W, window.innerHeight / ARENA_H);
  canvas.width = ARENA_W;
  canvas.height = ARENA_H;
  canvas.style.width = `${Math.floor(ARENA_W * scale)}px`;
  canvas.style.height = `${Math.floor(ARENA_H * scale)}px`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, state, now) {
  const g = ctx.createLinearGradient(0, 0, 0, ARENA_H);
  g.addColorStop(0, '#0a1f1a');
  g.addColorStop(0.55, '#0d2b20');
  g.addColorStop(1, '#081a14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  // Soft moonlight pools.
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#9fd8ff';
  ctx.beginPath(); ctx.ellipse(300, 180, 260, 150, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(980, 540, 300, 170, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Grass tufts.
  ctx.strokeStyle = '#1d4a35';
  ctx.lineWidth = 1.5;
  for (const t of TUFTS) {
    const sway = Math.sin(now * 0.7 + t.ph) * 2;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x - 4 * t.s + sway, t.y - 9 * t.s);
    ctx.moveTo(t.x + 2, t.y);
    ctx.lineTo(t.x + 2 * t.s + sway, t.y - 11 * t.s);
    ctx.moveTo(t.x + 4, t.y);
    ctx.lineTo(t.x + 7 * t.s + sway, t.y - 8 * t.s);
    ctx.stroke();
  }

  // Stones.
  for (const s of STONES) {
    ctx.fillStyle = '#233a30';
    ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2e4a3c';
    ctx.beginPath(); ctx.ellipse(s.x - s.r * 0.2, s.y - s.r * 0.25, s.r * 0.6, s.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Glowing mushrooms.
  for (const m of SHROOMS) {
    const glow = m.hue > 0.5 ? '#7fe0b2' : '#ffd27a';
    ctx.fillStyle = '#e8dcc3';
    ctx.fillRect(m.x - 1.5 * m.s, m.y - 6 * m.s, 3 * m.s, 7 * m.s);
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(m.x, m.y - 7 * m.s, 6 * m.s, Math.PI, 0); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Fireflies.
  for (const f of FLIES) {
    const fx = (f.x + Math.sin(now * 0.3 + f.ph) * 22 + ARENA_W) % ARENA_W;
    const fy = (f.y + Math.cos(now * 0.23 + f.ph) * 16 + ARENA_H) % ARENA_H;
    const tw = 0.35 + 0.3 * Math.sin(now * 2.2 + f.ph);
    ctx.fillStyle = `rgba(255, 220, 130, ${Math.max(0, tw)})`;
    ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Bramble border: the arena's edge.
  ctx.strokeStyle = '#3d6b4a';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, ARENA_W - 10, ARENA_H - 10);
  ctx.strokeStyle = '#24402c';
  ctx.lineWidth = 2;
  for (let x = 14; x < ARENA_W; x += 26) {
    ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x + 8, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, ARENA_H - 4); ctx.lineTo(x + 8, ARENA_H - 12); ctx.stroke();
  }
  for (let y = 14; y < ARENA_H; y += 26) {
    ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(12, y + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ARENA_W - 4, y); ctx.lineTo(ARENA_W - 12, y + 8); ctx.stroke();
  }
}

function drawLanternGlow(ctx, state) {
  const p = state.player;
  const radius = 185 + p.auraRadius * 0.4 + 40 * Math.sin(state.time * 3) * 0.06;
  const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, radius);
  g.addColorStop(0, 'rgba(255, 190, 90, 0.30)');
  g.addColorStop(0.6, 'rgba(255, 170, 60, 0.12)');
  g.addColorStop(1, 'rgba(255, 170, 60, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
  // A warm ring on the ground marks the warden, so the eye finds the
  // player at a glance even in a crowd of foes.
  ctx.strokeStyle = 'rgba(255, 205, 110, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 16, 26, 10, 0, 0, Math.PI * 2); ctx.stroke();
}

function drawEmbers(ctx, state, now) {
  for (const e of state.embers) {
    const bob = Math.sin(e.phase) * 2;
    const r = e.kind === 'big' ? 7 : 4.5;
    const g = ctx.createRadialGradient(e.x, e.y + bob, 0, e.x, e.y + bob, r * 3);
    g.addColorStop(0, 'rgba(255, 200, 90, 0.55)');
    g.addColorStop(1, 'rgba(255, 200, 90, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, r * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.kind === 'big' ? '#ffd27a' : '#ffb347';
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath(); ctx.arc(e.x - r * 0.3, e.y + bob - r * 0.3, r * 0.4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawFoe(ctx, f, now) {
  const colors = {
    wisp: { body: '#5a4a8a', dark: '#3a2f5e', eye: '#c9a7ff', glow: 'rgba(150, 110, 255, 0.35)' },
    skitter: { body: '#6b3a7a', dark: '#472652', eye: '#ff9de2', glow: 'rgba(255, 120, 200, 0.3)' },
    spitter: { body: '#4a5a8a', dark: '#2f3a5e', eye: '#9fd8ff', glow: 'rgba(110, 170, 255, 0.35)' },
    brute: { body: '#3f3350', dark: '#2a2238', eye: '#ff6b6b', glow: 'rgba(255, 90, 90, 0.3)' },
    wraith: { body: '#4a6a6a', dark: '#2f4545', eye: '#a8fff0', glow: 'rgba(120, 255, 230, 0.3)' },
    herald: { body: '#2e1a4a', dark: '#1c0f30', eye: '#ff4d6d', glow: 'rgba(200, 90, 255, 0.45)' },
  };
  const c = colors[f.kind] || colors.wisp;
  const wob = Math.sin(now * 3 + f.phase) * 2;

  if (f.born > 0) {
    ctx.save();
    ctx.globalAlpha = 1 - f.born / 0.5 * 0.7;
    ctx.strokeStyle = c.eye;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(f.x, f.y, f.radius + 10, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 2.2);
  g.addColorStop(0, c.glow);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(f.x, f.y, f.radius * 2.2, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = f.flash > 0 ? '#ffffff' : c.body;
  ctx.beginPath(); ctx.arc(f.x, f.y + wob * 0.4, f.radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = f.flash > 0 ? '#ffffff' : c.dark;
  ctx.beginPath(); ctx.arc(f.x, f.y + wob * 0.4 + f.radius * 0.3, f.radius * 0.72, 0, Math.PI * 2); ctx.fill();

  // Eyes look toward the player.
  const ex = f.radius * 0.36;
  const ey = -f.radius * 0.15 + wob * 0.4;
  ctx.fillStyle = c.eye;
  ctx.beginPath(); ctx.arc(f.x - ex, f.y + ey, f.kind === 'herald' ? 6 : 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(f.x + ex, f.y + ey, f.kind === 'herald' ? 6 : 3.4, 0, Math.PI * 2); ctx.fill();

  if (f.kind === 'herald') {
    ctx.strokeStyle = '#c9a7ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + now * 0.5;
      const x1 = f.x + Math.cos(a) * (f.radius + 4);
      const y1 = f.y + Math.sin(a) * (f.radius + 4);
      const x2 = f.x + Math.cos(a) * (f.radius + 16);
      const y2 = f.y + Math.sin(a) * (f.radius + 16);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    // Crown.
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.moveTo(f.x - 18, f.y - f.radius + 6);
    ctx.lineTo(f.x - 9, f.y - f.radius - 12);
    ctx.lineTo(f.x, f.y - f.radius + 2);
    ctx.lineTo(f.x + 9, f.y - f.radius - 12);
    ctx.lineTo(f.x + 18, f.y - f.radius + 6);
    ctx.closePath();
    ctx.fill();
  }

  if (f.elite && f.kind !== 'herald') {
    ctx.strokeStyle = '#ff9d5c';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.radius + 4, 0, Math.PI * 2); ctx.stroke();
  }

  // Health bar for hurt or big foes.
  if ((f.hp < f.maxHp && f.maxHp > 30) || f.elite) {
    const w = f.radius * 2;
    const pct = Math.max(0, f.hp / f.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(f.x - w / 2, f.y - f.radius - 12, w, 5);
    ctx.fillStyle = f.elite ? '#ff9d5c' : '#c9a7ff';
    ctx.fillRect(f.x - w / 2, f.y - f.radius - 12, w * pct, 5);
  }
}

function drawPlayer(ctx, state, now) {
  const p = state.player;
  const bob = p.moving ? Math.sin(p.walkPhase) * 2 : Math.sin(now * 2) * 1.2;
  const blink = p.invuln > 0 && Math.floor(now * 14) % 2 === 0;

  ctx.save();
  if (blink) ctx.globalAlpha = 0.45;

  // Cloak: a deep green hood with a warm hem.
  ctx.fillStyle = '#1f5c40';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 20 + bob * 0.3);
  ctx.quadraticCurveTo(p.x + 17, p.y - 8, p.x + 14, p.y + 14 + bob * 0.3);
  ctx.quadraticCurveTo(p.x, p.y + 20, p.x - 14, p.y + 14 + bob * 0.3);
  ctx.quadraticCurveTo(p.x - 17, p.y - 8, p.x, p.y - 20 + bob * 0.3);
  ctx.fill();
  ctx.fillStyle = '#2a7a54';
  ctx.beginPath();
  ctx.moveTo(p.x - 14, p.y + 12 + bob * 0.3);
  ctx.quadraticCurveTo(p.x, p.y + 20, p.x + 14, p.y + 12 + bob * 0.3);
  ctx.lineTo(p.x + 10, p.y + 16 + bob * 0.3);
  ctx.lineTo(p.x - 10, p.y + 16 + bob * 0.3);
  ctx.closePath();
  ctx.fill();

  // Hood shadow and face.
  ctx.fillStyle = '#123b29';
  ctx.beginPath(); ctx.arc(p.x, p.y - 6 + bob * 0.3, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe9c0';
  ctx.beginPath(); ctx.arc(p.x, p.y - 5 + bob * 0.3, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(p.x - 2.4, p.y - 6 + bob * 0.3, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + 2.4, p.y - 6 + bob * 0.3, 1.4, 0, Math.PI * 2); ctx.fill();

  // The lantern, held toward the aim.
  const lx = p.x + p.aimX * 20;
  const ly = p.y + 4 + p.aimY * 14;
  ctx.strokeStyle = '#8a6a2f';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p.x + p.aimX * 8, p.y + 2); ctx.lineTo(lx, ly); ctx.stroke();
  ctx.fillStyle = '#3a2c12';
  ctx.fillRect(lx - 6, ly - 9, 12, 14);
  const flick = 0.75 + 0.25 * Math.sin(now * 9 + p.x);
  ctx.fillStyle = `rgba(255, 205, 110, ${flick})`;
  ctx.beginPath(); ctx.arc(lx, ly - 2, 5, 0, Math.PI * 2); ctx.fill();

  // Ward ring.
  if (p.wardLevel > 0 && p.wardTimer <= 0) {
    ctx.strokeStyle = 'rgba(159, 216, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 26 + Math.sin(now * 3) * 2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawBolts(ctx, state) {
  for (const b of state.bolts) {
    const a = Math.atan2(b.vy, b.vx);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(a);
    const g = ctx.createLinearGradient(-14, 0, 8, 0);
    g.addColorStop(0, 'rgba(255, 180, 80, 0)');
    g.addColorStop(0.7, '#ffb347');
    g.addColorStop(1, '#fff3d0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawOrbs(ctx, state, now) {
  for (const o of state.orbs) {
    const pulse = 1 + 0.2 * Math.sin(now * 8 + o.x);
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.radius * 2.4 * pulse);
    g.addColorStop(0, 'rgba(180, 140, 255, 0.6)');
    g.addColorStop(1, 'rgba(180, 140, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.radius * 2.4 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b48cff';
    ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8dcff';
    ctx.beginPath(); ctx.arc(o.x, o.y, o.radius * 0.45, 0, Math.PI * 2); ctx.fill();
  }
}

function drawParticles(ctx, state) {
  for (const pt of state.parts) {
    const alpha = Math.max(0, pt.life / pt.maxLife);
    if (pt.ring) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (1.6 - alpha * 0.6), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      continue;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * alpha + 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  for (const fl of state.floats) {
    ctx.globalAlpha = Math.max(0, fl.life / fl.maxLife);
    ctx.fillStyle = fl.color;
    ctx.fillText(fl.text, fl.x, fl.y);
  }
  ctx.globalAlpha = 1;
}

// --- HUD ----------------------------------------------------------------------

function drawHud(ctx, state, input) {
  const p = state.player;
  const remain = Math.max(0, DAWN_SECONDS - state.time);
  const mm = Math.floor(remain / 60);
  const ss = String(Math.floor(remain % 60)).padStart(2, '0');

  // Top bar.
  ctx.fillStyle = 'rgba(6, 18, 13, 0.72)';
  ctx.fillRect(0, 0, ARENA_W, 64);
  ctx.fillStyle = '#2a7a54';
  ctx.fillRect(0, 64, ARENA_W, 2);

  // Health.
  ctx.fillStyle = '#e8f5ec';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('❤ HEALTH', 24, 26);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  roundRect(ctx, 24, 34, 220, 16, 8); ctx.fill();
  const hpPct = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = hpPct > 0.5 ? '#58c98a' : hpPct > 0.25 ? '#ffb347' : '#ff6b6b';
  roundRect(ctx, 24, 34, 220 * hpPct, 16, 8); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 252, 47);

  // XP.
  ctx.fillStyle = '#e8f5ec';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(`✦ LEVEL ${state.level}`, 320, 26);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  roundRect(ctx, 320, 34, 220, 16, 8); ctx.fill();
  ctx.fillStyle = '#ffb347';
  roundRect(ctx, 320, 34, 220 * Math.min(1, state.xp / state.xpNext), 16, 8); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(`${state.xp} / ${state.xpNext} XP`, 548, 47);

  // Timer to dawn, centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText(`${mm}:${ss}`, 640, 38);
  ctx.fillStyle = '#cfe8d8';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('until dawn', 640, 56);

  // Score, kills, chapter, right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8f5ec';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.fillText(`SCORE ${state.score.toLocaleString('en-US')}`, ARENA_W - 24, 26);
  ctx.fillStyle = '#cfe8d8';
  ctx.font = '14px Georgia, serif';
  ctx.fillText(`☠ ${state.kills} slain   ◆ ${state.embersGot} embers`, ARENA_W - 24, 47);

  // Chapter line under the bar; hidden while the banner announces it.
  if (!(state.banner && state.bannerTimer > 0)) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(207, 232, 216, 0.85)';
    ctx.font = 'italic 14px Georgia, serif';
    ctx.fillText(chapterAt(state.time), 640, 88);
  }

  // Wave banner.
  if (state.banner && state.bannerTimer > 0) {
    const a = Math.min(1, state.bannerTimer);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(6, 18, 13, 0.8)';
    const w = ctx.measureText(state.banner).width + 60;
    roundRect(ctx, 640 - w / 2, 150, w, 44, 22); ctx.fill();
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 640 - w / 2, 150, w, 44, 22); ctx.stroke();
    ctx.fillStyle = '#ffd27a';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.banner, 640, 179);
    ctx.restore();
  }

  // Low health vignette pulse.
  if (hpPct <= 0.25 && state.state === 'playing') {
    const pulse = 0.14 + 0.1 * Math.sin(state.time * 5);
    const vg = ctx.createRadialGradient(640, 360, 260, 640, 360, 640);
    vg.addColorStop(0, 'rgba(255, 40, 40, 0)');
    vg.addColorStop(1, `rgba(255, 40, 40, ${pulse})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  }

  // Controls hint, bottom left.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(207, 232, 216, 0.6)';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('WASD / arrows — move    P — pause    M — mute', 24, ARENA_H - 16);

  // Mute state.
  ctx.textAlign = 'right';
  ctx.fillText(state.muted ? '🔇 muted (M)' : '🔊 sound on (M)', ARENA_W - 24, ARENA_H - 16);
}

// --- screens ------------------------------------------------------------------

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(6, 18, 13, 0.86)';
  roundRect(ctx, x, y, w, h, 18); ctx.fill();
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 18); ctx.stroke();
}

function button(ctx, x, y, w, h, label, hover) {
  ctx.fillStyle = hover ? '#ffb347' : '#e8963c';
  roundRect(ctx, x, y, w, h, 12); ctx.fill();
  ctx.fillStyle = '#241a08';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 8);
}

export function drawTitle(ctx, state, input, now) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.shadowColor = 'rgba(255, 180, 80, 0.7)';
  ctx.shadowBlur = 34;
  ctx.fillText('EMBERGROVE', 640, 190);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#cfe8d8';
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('Warden of the Last Lantern', 640, 232);

  panel(ctx, 340, 270, 600, 210);
  ctx.fillStyle = '#e8f5ec';
  ctx.font = '17px Georgia, serif';
  ctx.fillText('Night has swallowed the grove. The gloom comes in waves —', 640, 306);
  ctx.fillText('hold the lantern alight until dawn breaks at 5:00.', 640, 332);
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText('Move — WASD or arrow keys      Your lantern fires on its own', 640, 366);
  ctx.fillStyle = '#e8f5ec';
  ctx.font = '17px Georgia, serif';
  ctx.fillText('Gather embers, level up, choose your blessings.', 640, 392);
  ctx.fillText('Slay the Gloom Herald when it comes. Survive until dawn.', 640, 418);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'italic 15px Georgia, serif';
  ctx.fillText('Click a card to take it · P pauses · M mutes', 640, 452);

  const hover = input.mouseX >= 490 && input.mouseX <= 790 && input.mouseY >= 510 && input.mouseY <= 570;
  button(ctx, 490, 510, 300, 60, '▶  LIGHT THE LANTERN', hover);

  ctx.fillStyle = 'rgba(207, 232, 216, 0.75)';
  ctx.font = '15px Georgia, serif';
  if (state.best > 0) ctx.fillText(`Best score: ${state.best.toLocaleString('en-US')}`, 640, 610);
  ctx.fillText('Press Enter or click to begin — a complete game in your browser, no downloads.', 640, 640);
}

export function drawLevelUp(ctx, state, input) {
  ctx.fillStyle = 'rgba(4, 12, 9, 0.66)';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(`LEVEL ${state.level} — CHOOSE A BLESSING`, 640, 130);
  ctx.fillStyle = '#cfe8d8';
  ctx.font = 'italic 18px Georgia, serif';
  ctx.fillText('The lantern grows brighter. Pick one — click a card, or press 1, 2, 3.', 640, 164);

  const cards = state.choices || [];
  const cw = 250;
  const ch = 300;
  const gap = 30;
  const total = cards.length * cw + (cards.length - 1) * gap;
  let x = 640 - total / 2;
  const y = 210;
  cards.forEach((card, i) => {
    const hover = input.mouseX >= x && input.mouseX <= x + cw && input.mouseY >= y && input.mouseY <= y + ch;
    ctx.fillStyle = hover ? 'rgba(30, 70, 50, 0.97)' : 'rgba(12, 34, 25, 0.95)';
    roundRect(ctx, x, y, cw, ch, 16); ctx.fill();
    ctx.strokeStyle = hover ? '#ffd27a' : '#3d6b4a';
    ctx.lineWidth = hover ? 3 : 2;
    roundRect(ctx, x, y, cw, ch, 16); ctx.stroke();
    ctx.fillStyle = '#ffd27a';
    ctx.font = '52px Georgia, serif';
    ctx.fillText(card.icon, x + cw / 2, y + 84);
    ctx.fillStyle = '#e8f5ec';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(card.name, x + cw / 2, y + 132);
    ctx.fillStyle = '#9fd8ff';
    ctx.font = '15px Georgia, serif';
    ctx.fillText(`Rank ${card.rank} of ${card.max}`, x + cw / 2, y + 162);
    ctx.fillStyle = '#cfe8d8';
    ctx.font = '17px Georgia, serif';
    wrapText(ctx, card.blurb, x + cw / 2, y + 196, cw - 36, 24);
    ctx.fillStyle = 'rgba(207, 232, 216, 0.7)';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(`[ ${i + 1} ]`, x + cw / 2, y + ch - 22);
    x += cw + gap;
  });
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = w;
      yy += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

function statLine(ctx, label, value, y) {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cfe8d8';
  ctx.font = '18px Georgia, serif';
  ctx.fillText(label, 460, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText(value, 820, y);
}

export function drawGameOver(ctx, state, input) {
  ctx.fillStyle = 'rgba(10, 4, 8, 0.72)';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.shadowColor = 'rgba(255, 60, 60, 0.6)';
  ctx.shadowBlur = 28;
  ctx.fillText('THE LIGHT GOES OUT', 640, 180);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#cfe8d8';
  ctx.font = 'italic 20px Georgia, serif';
  ctx.fillText('The gloom takes the grove… this time. The lantern can be lit again.', 640, 222);

  panel(ctx, 380, 260, 520, 210);
  statLine(ctx, 'Score', state.score.toLocaleString('en-US'), 306);
  statLine(ctx, 'Survived', `${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')} of 5:00`, 340);
  statLine(ctx, 'Foes slain', String(state.kills), 374);
  statLine(ctx, 'Embers gathered', String(state.embersGot), 408);
  statLine(ctx, 'Level reached', String(state.level), 442);

  const hover = input.mouseX >= 490 && input.mouseX <= 790 && input.mouseY >= 500 && input.mouseY <= 560;
  button(ctx, 490, 500, 300, 60, '↻  LIGHT IT AGAIN', hover);
  ctx.fillStyle = 'rgba(207, 232, 216, 0.75)';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('Press Enter or click to play again.', 640, 600);
  if (state.best > 0) ctx.fillText(`Best score: ${state.best.toLocaleString('en-US')}`, 640, 628);
}

export function drawVictory(ctx, state, input) {
  ctx.fillStyle = 'rgba(20, 16, 4, 0.55)';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 72px Georgia, serif';
  ctx.shadowColor = 'rgba(255, 200, 90, 0.8)';
  ctx.shadowBlur = 34;
  ctx.fillText('DAWN BREAKS', 640, 180);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff3d0';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('Five minutes of night, held back by one small light. The grove is saved.', 640, 224);

  panel(ctx, 380, 262, 520, 210);
  statLine(ctx, 'Score', state.score.toLocaleString('en-US'), 308);
  statLine(ctx, 'Foes slain', String(state.kills), 342);
  statLine(ctx, 'Embers gathered', String(state.embersGot), 376);
  statLine(ctx, 'Level reached', String(state.level), 410);
  statLine(ctx, 'The Herald', state.bossSlain ? 'Slain ✓' : 'Never faced', 444);

  const hover = input.mouseX >= 490 && input.mouseX <= 790 && input.mouseY >= 502 && input.mouseY <= 562;
  button(ctx, 490, 502, 300, 60, '☀  PLAY AGAIN', hover);
  ctx.fillStyle = 'rgba(207, 232, 216, 0.8)';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('Press Enter or click to defend the grove again.', 640, 602);
  if (state.best > 0) ctx.fillText(`Best score: ${state.best.toLocaleString('en-US')}`, 640, 630);
}

export function drawPaused(ctx, state) {
  ctx.fillStyle = 'rgba(4, 12, 9, 0.6)';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText('PAUSED', 640, 320);
  ctx.fillStyle = '#cfe8d8';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('The lantern waits. Press P or click to carry on.', 640, 362);
}

// --- the frame ------------------------------------------------------------------

export function render(ctx, state, input, now) {
  ctx.save();
  if (state.shake > 0) {
    const s = state.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, state, now);
  if (state.state !== 'title') drawLanternGlow(ctx, state);
  drawEmbers(ctx, state, now);
  for (const f of state.foes) drawFoe(ctx, f, now);
  drawBolts(ctx, state);
  drawOrbs(ctx, state, now);
  if (state.state !== 'title') drawPlayer(ctx, state, now);
  drawParticles(ctx, state);
  ctx.restore();

  // Warm vignette over everything.
  const vg = ctx.createRadialGradient(640, 360, 300, 640, 360, 700);
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vg.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  if (state.flashRed > 0) {
    ctx.fillStyle = `rgba(255, 40, 40, ${Math.min(0.25, state.flashRed)})`;
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  }
  if (state.novaFlash > 0) {
    ctx.fillStyle = `rgba(255, 190, 90, ${state.novaFlash * 0.5})`;
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  }

  if (state.state === 'playing' || state.state === 'paused' || state.state === 'levelup') {
    drawHud(ctx, state, input);
  }
  if (state.state === 'title') drawTitle(ctx, state, input, now);
  else if (state.state === 'levelup') drawLevelUp(ctx, state, input);
  else if (state.state === 'over') drawGameOver(ctx, state, input);
  else if (state.state === 'won') drawVictory(ctx, state, input);
  else if (state.state === 'paused') drawPaused(ctx, state);
}
