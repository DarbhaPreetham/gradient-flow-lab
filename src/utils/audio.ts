let ctx: AudioContext | null = null;
let enabled = true;
let master: GainNode | null = null;
let ambient: { stop: () => void } | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.32;
  master.connect(ctx.destination);
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
}

export function setAudioEnabled(v: boolean) {
  enabled = v;
  if (v) unlockAudio();
  if (!v) stopAmbient();
}

function envelope(g: GainNode, c: AudioContext, attack = 0.01, decay = 0.2, peak = 0.6) {
  const t = c.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

export function playDragHum(): { stop: () => void } | null {
  if (!enabled) return null;
  const c = getCtx();
  if (!c || !master) return null;
  const osc = c.createOscillator();
  const g = c.createGain();
  const filter = c.createBiquadFilter();
  osc.type = "sine";
  osc.frequency.value = 110;
  filter.type = "lowpass";
  filter.frequency.value = 600;
  g.gain.value = 0.0001;
  osc.connect(filter).connect(g).connect(master);
  const t = c.currentTime;
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
  osc.start();
  let stopped = false;
  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      const now = c.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.stop(now + 0.2);
    },
  };
}

export function playSwap() {
  if (!enabled) return;
  const c = getCtx();
  if (!c || !master) return;
  // Soft pentatonic chime: a fundamental + a fifth above, gently filtered.
  // Picks a random degree of A pentatonic so every swap feels musical.
  const scale = [220.0, 261.63, 329.63, 392.0, 440.0, 523.25, 659.25];
  const f = scale[Math.floor(Math.random() * scale.length)];
  const t = c.currentTime;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2200;
  filter.Q.value = 0.7;
  filter.connect(master);
  [f, f * 1.5].forEach((freq, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(g).connect(filter);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(i === 0 ? 0.22 : 0.09, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.start(t);
    osc.stop(t + 1.0);
  });
}

export function playTap() {
  if (!enabled) return;
  const c = getCtx();
  if (!c || !master) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  osc.connect(g).connect(master);
  envelope(g, c, 0.005, 0.08, 0.2);
  osc.start();
  osc.stop(c.currentTime + 0.1);
}

/** Warm pentatonic pad fading in over 1.5s: C E G A C5 */
export function playVictory() {
  if (!enabled) return;
  const c = getCtx();
  if (!c || !master) return;
  const freqs = [261.63, 329.63, 392.0, 440.0, 523.25];
  const t0 = c.currentTime;
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = i % 2 === 0 ? "sine" : "triangle";
    osc.frequency.value = f;
    osc.connect(g).connect(master!);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 1.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.5);
    osc.start(t0 + i * 0.05);
    osc.stop(t0 + 3.6);
  });
}

/**
 * Soothing ambient pad — two detuned sine voices plus a slow LFO on a
 * low-pass filter. Idempotent: calling startAmbient twice does nothing.
 */
export function startAmbient() {
  if (!enabled) return;
  if (ambient) return;
  const c = getCtx();
  if (!c || !master) return;
  unlockAudio();

  const out = c.createGain();
  out.gain.value = 0.0001;
  out.connect(master);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.6;
  filter.connect(out);

  // Slow filter sweep
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.06;
  lfoGain.gain.value = 320;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  // Two detuned voices an octave apart for warmth
  const voices: OscillatorNode[] = [];
  const baseFreqs = [110, 164.81, 220]; // A2, E3, A3 — open chord
  baseFreqs.forEach((f, i) => {
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    const vGain = c.createGain();
    o1.type = "sine";
    o2.type = "sine";
    o1.frequency.value = f;
    o2.frequency.value = f * 1.005; // gentle detune for chorus
    vGain.gain.value = i === 0 ? 0.5 : i === 1 ? 0.3 : 0.22;
    o1.connect(vGain);
    o2.connect(vGain);
    vGain.connect(filter);
    o1.start();
    o2.start();
    voices.push(o1, o2);
  });

  const t = c.currentTime;
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.18, t + 4.0);

  ambient = {
    stop: () => {
      if (!ambient) return;
      ambient = null;
      const now = c.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
      voices.forEach((v) => v.stop(now + 2.1));
      lfo.stop(now + 2.1);
    },
  };
}

export function stopAmbient() {
  ambient?.stop();
}