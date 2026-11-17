// Ember Grove — boot, the fixed-step loop and the state machine.
//
// States: title → playing ⇄ levelup ⇄ paused → over / won → playing.
// The loop runs at a fixed 60 Hz step so play feels the same on every
// machine; rendering is a separate pass that reads the state. With
// ?shot=<scene>&seed=<n> in the URL the game instead builds one frozen
// scene for a screenshot and reports window.__shotReady.

import { createInput, moveVector, pressedOnce, clickedIn, endTick } from './input.js';
import { makeState, updatePlayer, updateFoes, updateBolts, updateOrbs, updateEmbers, updateParticles, updateSpawns, updateClock } from './entities.js';
import { render, fitCanvas } from './render.js';
import { buildShotScene } from './shots.js';
import { drawChoices, applyChoice } from './upgrades.js';
import { unlockAudio, toggleMute, sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput(canvas);
fitCanvas(canvas);
window.addEventListener('resize', () => fitCanvas(canvas));

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') || 7);

let state;
let shotMode = false;

if (shotName) {
  // Screenshot mode: one frozen scene, no input, no clock.
  shotMode = true;
  state = buildShotScene(shotName, shotSeed);
  state.muted = true;
} else {
  state = makeState(Date.now() % 2147483647);
  try {
    state.best = Number(window.localStorage.getItem('embergrove-best') || 0) || 0;
  } catch (_err) {
    state.best = 0;
  }
}

// A read-only handle for automated play-tests: lets a test read the live
// state (time, score, kills) without touching the game's own code paths.
Object.defineProperty(window, '__emberState', {
  get() { return state; },
});

function saveBest() {
  if (state.score <= state.best) return;
  state.best = state.score;
  try {
    window.localStorage.setItem('embergrove-best', String(state.best));
  } catch (_err) {
    /* best score is a nicety, not a requirement */
  }
}

function startRun() {
  const best = state.best;
  const seed = Date.now() % 2147483647;
  state = makeState(seed);
  state.best = best;
  state.state = 'playing';
  state.banner = 'Chapter I — First Wisps';
  state.bannerTimer = 2.6;
  unlockAudio();
  sfx.click();
}

function openLevelUp() {
  state.choices = drawChoices(state.rng, state.taken);
  state.state = 'levelup';
  sfx.levelUp();
}

function takeChoice(index) {
  const card = (state.choices || [])[index];
  if (!card) return;
  applyChoice(state.player, state.taken, card);
  state.choices = null;
  state.state = 'playing';
  sfx.click();
}

function levelUpCardRect(i, count) {
  const cw = 250;
  const ch = 300;
  const gap = 30;
  const total = count * cw + (count - 1) * gap;
  const x = 640 - total / 2 + i * (cw + gap);
  return { x, y: 210, w: cw, h: ch };
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function tick(dt) {
  if (state.state === 'playing') {
    const mv = moveVector(input);
    const levelBefore = state.level;
    updatePlayer(state, dt, mv);
    updateFoes(state, dt);
    updateBolts(state, dt);
    updateOrbs(state, dt);
    updateEmbers(state, dt);
    updateParticles(state, dt);
    updateSpawns(state, dt);
    updateClock(state, dt);
    if (state.state === 'playing' && state.level > levelBefore) {
      openLevelUp();
    }
    if (state.state === 'over' || state.state === 'won') saveBest();
  } else if (state.state === 'levelup') {
    updateParticles(state, dt);
  } else if (state.state === 'title' || state.state === 'over' || state.state === 'won' || state.state === 'paused') {
    updateParticles(state, dt);
  }

  // Global keys, handled in every state.
  if (pressedOnce(input, 'KeyM')) {
    state.muted = toggleMute();
  }

  if (state.state === 'title') {
    const start = pressedOnce(input, 'Enter') || pressedOnce(input, 'Space') ||
      clickedIn(input, 490, 510, 300, 60);
    if (start) startRun();
  } else if (state.state === 'playing') {
    if (pressedOnce(input, 'KeyP') || pressedOnce(input, 'Escape')) {
      state.state = 'paused';
      sfx.click();
    }
  } else if (state.state === 'paused') {
    if (pressedOnce(input, 'KeyP') || pressedOnce(input, 'Escape') || input.clicked) {
      state.state = 'playing';
      sfx.click();
    }
  } else if (state.state === 'levelup') {
    const cards = state.choices || [];
    let picked = -1;
    if (pressedOnce(input, 'Digit1')) picked = 0;
    if (pressedOnce(input, 'Digit2')) picked = 1;
    if (pressedOnce(input, 'Digit3')) picked = 2;
    cards.forEach((card, i) => {
      const r = levelUpCardRect(i, cards.length);
      if (clickedIn(input, r.x, r.y, r.w, r.h)) picked = i;
    });
    if (picked >= 0) takeChoice(picked);
  } else if (state.state === 'over' || state.state === 'won') {
    const again = pressedOnce(input, 'Enter') || pressedOnce(input, 'Space') ||
      clickedIn(input, 490, 500, 300, 60);
    if (again) startRun();
  }

  endTick(input);
}

// Fixed 60 Hz step with an accumulator; a slow frame never spirals.
const STEP = 1 / 60;
let acc = 0;
let last = performance.now();

function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  acc += elapsed;
  let guard = 0;
  while (acc >= STEP && guard < 5) {
    tick(STEP);
    acc -= STEP;
    guard += 1;
  }
  if (guard === 5) acc = 0;
  render(ctx, state, input, now / 1000);
  if (!shotMode) requestAnimationFrame(frame);
}

if (shotMode) {
  // One frozen frame, then tell the screenshot tool the scene is ready.
  render(ctx, state, input, 1.6);
  window.__shotReady = true;
  announce('Ember Grove screenshot scene ready.');
} else {
  announce('Ember Grove loaded. Press Enter to light the lantern.');
  requestAnimationFrame(frame);
}
