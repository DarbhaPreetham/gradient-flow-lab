let ctx: AudioContext | null = null;
let enabled = true;
let master: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.35;
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
  const osc = c.createOscillator();
  const g = c.createGain();
  const filter = c.createBiquadFilter();
  osc.type = "triangle";
  const base = 520 + Math.random() * 120;
  osc.frequency.setValueAtTime(base, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(base * 1.6, c.currentTime + 0.18);
  filter.type = "highpass";
  filter.frequency.value = 400;
  osc.connect(filter).connect(g).connect(master);
  envelope(g, c, 0.005, 0.22, 0.35);
  osc.start();
  osc.stop(c.currentTime + 0.3);
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