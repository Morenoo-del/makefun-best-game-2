// Ember Grove — tiny synthesized sound effects.
//
// No audio files ship with the game: every effect is a short WebAudio
// oscillator burst built at run time. The context is created lazily on the
// first player gesture (browsers block audio before one) and every call is
// guarded, so headless renders and muted play never throw.

let ctx = null;
let muted = false;
let master = null;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

// Call from any user gesture (key, click) so the browser unlocks audio.
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch (_err) {
    ctx = null;
  }
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || muted || ctx.state !== 'running') return;
  try {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch (_err) {
    /* audio is decoration; a failure must never break the game */
  }
}

function noiseBurst(dur, vol, lowpass) {
  if (!ctx || muted || ctx.state !== 'running') return;
  try {
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  } catch (_err) {
    /* audio is decoration; a failure must never break the game */
  }
}

// One named effect per game event. Keep them short and quiet.
export const sfx = {
  shoot() {
    tone(720, 0.07, 'triangle', 0.09, 320);
  },
  hit() {
    noiseBurst(0.06, 0.1, 2400);
  },
  foeDie() {
    tone(220, 0.16, 'sawtooth', 0.1, 60);
    noiseBurst(0.12, 0.12, 1200);
  },
  pickup() {
    tone(880, 0.08, 'sine', 0.12, 1320);
  },
  hurt() {
    tone(140, 0.22, 'square', 0.16, 70);
    noiseBurst(0.15, 0.14, 700);
  },
  levelUp() {
    tone(523, 0.1, 'sine', 0.14);
    setTimeout(() => tone(659, 0.1, 'sine', 0.14), 90);
    setTimeout(() => tone(784, 0.18, 'sine', 0.16), 180);
  },
  nova() {
    tone(180, 0.35, 'sine', 0.16, 720);
    noiseBurst(0.25, 0.1, 900);
  },
  boss() {
    tone(98, 0.7, 'sawtooth', 0.18, 49);
    tone(147, 0.7, 'sawtooth', 0.12, 73);
  },
  chapter() {
    tone(392, 0.16, 'sine', 0.1, 392);
    setTimeout(() => tone(494, 0.2, 'sine', 0.1), 120);
  },
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.15), i * 130));
  },
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.14), i * 160));
  },
  click() {
    tone(660, 0.05, 'sine', 0.1, 880);
  },
};
