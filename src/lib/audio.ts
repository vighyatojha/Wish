// ─────────────────────────────────────────────────────────────
//  Sound
//  Phones block sound until the person touches the screen, so
//  unlockAudio() runs on the very first tap. After that any scene
//  can play sound. Rain and wind are synthesised live, so they
//  cost nothing to download.
// ─────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function unlockAudio(): AudioContext | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  // A silent blip fully wakes the audio engine on some Android phones.
  const blip = ctx.createBufferSource();
  blip.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  blip.connect(master!);
  blip.start();
  return ctx;
}

export interface LiveSound {
  setLevel(v: number): void;
  stop(fade?: number): void;
}

const silent: LiveSound = { setLevel() {}, stop() {} };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function pinkNoise(ac: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buf;
}

function brownNoise(ac: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

function dropBuffer(ac: AudioContext): AudioBuffer {
  const len = Math.floor(ac.sampleRate * 0.03);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-i / len) * 9);
  return buf;
}

// ── Rain: hiss + rumble + little droplet ticks ───────────────
export function createRainSound(): LiveSound {
  if (!ctx || !master) return silent;
  const ac = ctx;
  const out = ac.createGain();
  out.connect(master);

  const hiss = ac.createBufferSource();
  hiss.buffer = pinkNoise(ac, 4);
  hiss.loop = true;
  const hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 500 });
  const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 6500 });
  const hissGain = new GainNode(ac, { gain: 0 });
  hiss.connect(hp).connect(lp).connect(hissGain).connect(out);

  const rumble = ac.createBufferSource();
  rumble.buffer = brownNoise(ac, 4);
  rumble.loop = true;
  const rlp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 380 });
  const rumbleGain = new GainNode(ac, { gain: 0 });
  rumble.connect(rlp).connect(rumbleGain).connect(out);

  hiss.start();
  rumble.start();

  const tick = dropBuffer(ac);
  let level = 0;
  let stopped = false;
  let timer = 0;
  const slice = 0.06;
  const scheduleDrops = () => {
    if (stopped) return;
    let lambda = level < 0.01 ? 0 : (5 + 55 * level) * slice;
    while (lambda > 0 && Math.random() < Math.min(1, lambda)) {
      lambda -= 1;
      const src = new AudioBufferSourceNode(ac, { buffer: tick, playbackRate: 0.7 + Math.random() * 0.9 });
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1400 + Math.random() * 4200, Q: 2.5 });
      const g = new GainNode(ac, { gain: (0.08 + Math.random() * 0.22) * (1 - level * 0.33) });
      const pan = new StereoPannerNode(ac, { pan: Math.random() * 1.6 - 0.8 });
      src.connect(bp).connect(g).connect(pan).connect(out);
      src.start(ac.currentTime + 0.02 + Math.random() * slice);
    }
    timer = window.setTimeout(scheduleDrops, slice * 1000);
  };
  scheduleDrops();

  return {
    setLevel(v) {
      level = clamp01(v);
      const t = ac.currentTime;
      hissGain.gain.setTargetAtTime(0.28 * Math.pow(level, 0.8), t, 0.25);
      rumbleGain.gain.setTargetAtTime(0.16 * Math.pow(level, 1.6), t, 0.4);
    },
    stop(fade = 1.5) {
      out.gain.setTargetAtTime(0, ac.currentTime, fade / 4);
      window.setTimeout(() => {
        stopped = true;
        clearTimeout(timer);
        try { hiss.stop(); rumble.stop(); } catch { /* already stopped */ }
        out.disconnect();
      }, fade * 1000 + 200);
    },
  };
}

// ── Wind: soft rushing air for flying through the fog ────────
export function createWindSound(): LiveSound {
  if (!ctx || !master) return silent;
  const ac = ctx;
  const out = new GainNode(ac, { gain: 0 });
  out.connect(master);

  const src = new AudioBufferSourceNode(ac, { buffer: pinkNoise(ac, 4), loop: true });
  const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 420, Q: 0.8 });
  const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 2200 });
  src.connect(bp).connect(lp).connect(out);
  src.start();

  // slow gusts: the filter drifts up and down
  const lfo = new OscillatorNode(ac, { frequency: 0.13 });
  const depth = new GainNode(ac, { gain: 110 });
  lfo.connect(depth).connect(bp.frequency);
  lfo.start();

  return {
    setLevel(v) {
      const level = clamp01(v);
      const t = ac.currentTime;
      out.gain.setTargetAtTime(0.42 * level, t, 0.35);
      bp.frequency.setTargetAtTime(360 + 900 * level, t, 0.45);
    },
    stop(fade = 1.5) {
      out.gain.setTargetAtTime(0, ac.currentTime, fade / 4);
      window.setTimeout(() => {
        try { src.stop(); lfo.stop(); } catch { /* already stopped */ }
        out.disconnect();
      }, fade * 1000 + 200);
    },
  };
}

// ── Paper: a short rustle as the map unrolls ─────────────────
export function playRustle(): void {
  if (!ctx || !master) return;
  const ac = ctx;
  const len = Math.floor(ac.sampleRate * 0.9);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let crackle = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const env = Math.sin(Math.PI * Math.min(1, t * 1.6)) * (1 - t * 0.6);
    if (Math.random() < 0.004) crackle = 1;
    crackle *= 0.985;
    d[i] = (Math.random() * 2 - 1) * env * (0.35 + crackle * 0.9);
  }
  const src = new AudioBufferSourceNode(ac, { buffer: buf });
  const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2600, Q: 0.7 });
  const hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 700 });
  const g = new GainNode(ac, { gain: 0.35 });
  src.connect(bp).connect(hp).connect(g).connect(master);
  src.start();
}

// ── A small brass bell: a few inharmonic partials ringing out ──
export function playBell(): void {
  if (!ctx || !master) return;
  const ac = ctx;
  const out = new GainNode(ac, { gain: 0.55 });
  out.connect(master);
  const strike = (at: number, level: number) => {
    const f0 = 1560;
    const partials: [number, number, number][] = [
      // ratio, loudness, ring time (s)
      [0.5, 0.16, 1.6], [1, 1, 2.2], [2.01, 0.42, 1.4], [2.74, 0.34, 1.0], [4.07, 0.2, 0.6], [5.42, 0.13, 0.4],
    ];
    for (const [ratio, amp, ring] of partials) {
      const o = new OscillatorNode(ac, { frequency: f0 * ratio * (1 + (Math.random() - 0.5) * 0.002) });
      const g = new GainNode(ac, { gain: 0 });
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(amp * 0.3 * level, at + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, at + ring);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + ring + 0.05);
    }
  };
  const t = ac.currentTime + 0.01;
  strike(t, 1);
  strike(t + 0.21, 0.55); // the clapper swings back
  strike(t + 0.46, 0.25);
  window.setTimeout(() => out.disconnect(), 3200);
}

// ── A songbird's chirp: quick rising-and-falling whistles ─────
export function playChirp(pitch = 1, notes = 3): void {
  if (!ctx || !master) return;
  const ac = ctx;
  const pan = new StereoPannerNode(ac, { pan: (Math.random() - 0.5) * 0.8 });
  pan.connect(master);
  let t = ac.currentTime + 0.01;
  for (let i = 0; i < notes; i++) {
    const p = pitch * (1 + (Math.random() - 0.5) * 0.12);
    const o = new OscillatorNode(ac, { type: 'sine', frequency: 2600 * p });
    const g = new GainNode(ac, { gain: 0 });
    o.frequency.setValueAtTime(2500 * p, t);
    o.frequency.exponentialRampToValueAtTime(4300 * p, t + 0.045);
    o.frequency.exponentialRampToValueAtTime(3100 * p, t + 0.09);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g).connect(pan);
    o.start(t);
    o.stop(t + 0.12);
    t += 0.1 + Math.random() * 0.05;
  }
  window.setTimeout(() => pan.disconnect(), 1200);
}

// ── A soft "bloop" as an animal pops up (or ducks away) ───────
export function playPop(pitch = 1): void {
  if (!ctx || !master) return;
  const ac = ctx;
  const t = ac.currentTime + 0.01;
  const o = new OscillatorNode(ac, { type: 'sine', frequency: 320 * pitch });
  o.frequency.setValueAtTime(260 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(720 * pitch, t + 0.09);
  const g = new GainNode(ac, { gain: 0 });
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  // a little sparkle on top
  const s = new OscillatorNode(ac, { type: 'triangle', frequency: 2100 * pitch });
  const sg = new GainNode(ac, { gain: 0 });
  sg.gain.setValueAtTime(0, t + 0.05);
  sg.gain.linearRampToValueAtTime(0.04, t + 0.06);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(master);
  s.connect(sg).connect(master);
  o.start(t); o.stop(t + 0.25);
  s.start(t); s.stop(t + 0.32);
}

// ── helpers for short noise sounds ───────────────────────────
function noiseBurst(ac: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// ── A soft whoosh (butterflies rushing past, the flower flying at us) ──
export function playWhoosh(seconds = 1.4, from = 300, to = 2200, level = 0.35): void {
  if (!ctx || !master) return;
  const ac = ctx;
  const t = ac.currentTime + 0.01;
  const src = new AudioBufferSourceNode(ac, { buffer: noiseBurst(ac, seconds + 0.1) });
  const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: from, Q: 1.2 });
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(to, t + seconds * 0.7);
  const g = new GainNode(ac, { gain: 0 });
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + seconds * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  src.connect(bp).connect(g).connect(master);
  src.start(t);
}

// ── A stem snapping ───────────────────────────────────────────
export function playSnap(): void {
  if (!ctx || !master) return;
  const ac = ctx;
  const t = ac.currentTime + 0.01;
  const src = new AudioBufferSourceNode(ac, { buffer: noiseBurst(ac, 0.12) });
  const hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 1800 });
  const g = new GainNode(ac, { gain: 0.5 });
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  src.connect(hp).connect(g).connect(master);
  src.start(t);
  playPop(1.4);
}

// ── Air brakes letting go: a long "psshhh" ────────────────────
export function playAirRelease(seconds = 1.3, level = 0.5): void {
  if (!ctx || !master) return;
  const ac = ctx;
  const t = ac.currentTime + 0.01;
  const src = new AudioBufferSourceNode(ac, { buffer: noiseBurst(ac, seconds + 0.2) });
  const hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 2400 });
  const pk = new BiquadFilterNode(ac, { type: 'peaking', frequency: 5200, Q: 1, gain: 6 });
  const g = new GainNode(ac, { gain: 0 });
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.03);
  g.gain.setTargetAtTime(level * 0.55, t + 0.1, 0.25);
  g.gain.setTargetAtTime(0, t + seconds * 0.6, seconds * 0.18);
  src.connect(hp).connect(pk).connect(g).connect(master);
  src.start(t);
  src.stop(t + seconds + 0.2);
}

// ── The bus door: a hiss of air, then a soft thud as it folds open ──
export function playDoor(): void {
  playAirRelease(0.9, 0.42);
  if (!ctx || !master) return;
  const ac = ctx;
  const t = ac.currentTime + 0.75;
  const o = new OscillatorNode(ac, { type: 'sine', frequency: 140 });
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
  const g = new GainNode(ac, { gain: 0 });
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.5, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.3);
  // a metallic rattle of the folding leaves
  const r = new AudioBufferSourceNode(ac, { buffer: noiseBurst(ac, 0.2) });
  const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 3200, Q: 6 });
  const rg = new GainNode(ac, { gain: 0 });
  rg.gain.setValueAtTime(0, t - 0.05);
  rg.gain.linearRampToValueAtTime(0.18, t);
  rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  r.connect(bp).connect(rg).connect(master);
  r.start(t - 0.05);
}

// ── A small footstep (stop-motion walking) ────────────────────
export function playStep(pitch = 1): void {
  if (!ctx || !master) return;
  const ac = ctx;
  const t = ac.currentTime + 0.005;
  const src = new AudioBufferSourceNode(ac, { buffer: noiseBurst(ac, 0.07) });
  const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 900 * pitch });
  const g = new GainNode(ac, { gain: 0.32 });
  g.gain.setValueAtTime(0.32, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  src.connect(lp).connect(g).connect(master);
  src.start(t);
}

// ── A magical shimmer (golden dust) ───────────────────────────
export function playShimmer(seconds = 2.2): void {
  if (!ctx || !master) return;
  const ac = ctx;
  const notes = [1568, 1976, 2349, 2637, 3136, 3520, 3951];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const t = ac.currentTime + 0.02 + (i / n) * seconds * 0.8 + Math.random() * 0.05;
    const o = new OscillatorNode(ac, { type: 'sine', frequency: notes[(i * 3) % notes.length] * (Math.random() < 0.3 ? 2 : 1) });
    const g = new GainNode(ac, { gain: 0 });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    const p = new StereoPannerNode(ac, { pan: Math.random() * 1.6 - 0.8 });
    o.connect(g).connect(p).connect(master);
    o.start(t);
    o.stop(t + 1);
  }
}

// ── A gentle chime (a choice made) ────────────────────────────
export function playChime(): void {
  if (!ctx || !master) return;
  const ac = ctx;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const t = ac.currentTime + 0.02 + i * 0.09;
    const o = new OscillatorNode(ac, { type: 'triangle', frequency: f });
    const g = new GainNode(ac, { gain: 0 });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g).connect(master!);
    o.start(t);
    o.stop(t + 1.3);
  });
}

// ── Crickets at night ─────────────────────────────────────────
export function createCrickets(): LiveSound {
  if (!ctx || !master) return silent;
  const ac = ctx;
  const out = new GainNode(ac, { gain: 0 });
  out.connect(master);
  let level = 0;
  let stopped = false;
  let timer = 0;
  const chirp = () => {
    if (stopped) return;
    if (level > 0.01) {
      const t = ac.currentTime + 0.02;
      const f = 4300 + Math.random() * 600;
      const pan = new StereoPannerNode(ac, { pan: Math.random() * 1.6 - 0.8 });
      pan.connect(out);
      for (let k = 0; k < 3; k++) {
        const o = new OscillatorNode(ac, { type: 'sine', frequency: f });
        const g = new GainNode(ac, { gain: 0 });
        const s = t + k * 0.055;
        g.gain.setValueAtTime(0, s);
        g.gain.linearRampToValueAtTime(0.05, s + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 0.04);
        o.connect(g).connect(pan);
        o.start(s);
        o.stop(s + 0.05);
      }
    }
    timer = window.setTimeout(chirp, 260 + Math.random() * 700);
  };
  chirp();
  return {
    setLevel(v) {
      level = clamp01(v);
      out.gain.setTargetAtTime(0.9 * level, ac.currentTime, 0.6);
    },
    stop(fade = 1) {
      out.gain.setTargetAtTime(0, ac.currentTime, fade / 4);
      window.setTimeout(() => { stopped = true; clearTimeout(timer); out.disconnect(); }, fade * 1000 + 200);
    },
  };
}
