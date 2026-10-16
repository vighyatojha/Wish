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
