// SFX sintetizados via WebAudio (placeholder até trilha final)
let ctx = null, muted = false, master = null;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.35; return muted; }

function tone(freq, dur, type = 'square', vol = 0.5, slide = 0) {
  if (muted) return;
  try {
    const a = ac();
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(a.currentTime + dur);
  } catch (e) { /* áudio indisponível */ }
}

function noise(dur, vol = 0.3) {
  if (muted) return;
  try {
    const a = ac();
    const len = a.sampleRate * dur;
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource(); s.buffer = buf;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(master); s.start();
  } catch (e) { /* áudio indisponível */ }
}

// vibração háptica (mobile)
export function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* sem haptics */ } }

export const sfx = {
  shoot: () => tone(420, 0.06, 'square', 0.12, -180),
  hit: () => tone(180, 0.05, 'square', 0.18, -60),
  crit: () => { tone(600, 0.08, 'square', 0.2, 300); },
  kill: () => { tone(240, 0.12, 'triangle', 0.3, -160); noise(0.08, 0.12); },
  hurt: () => { tone(110, 0.25, 'sawtooth', 0.4, -60); noise(0.15, 0.2); },
  gem: () => tone(880, 0.07, 'sine', 0.25, 220),
  coin: () => { tone(988, 0.06, 'square', 0.2); setTimeout(() => tone(1319, 0.09, 'square', 0.2), 60); },
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.3), i * 80)),
  fusion: () => [392, 523, 659, 880, 1175].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.3), i * 70)),
  build: () => { noise(0.1, 0.25); setTimeout(() => tone(330, 0.1, 'triangle', 0.3), 60); },
  boss: () => [98, 92, 87, 82].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.35), i * 180)),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.32), i * 110)),
  lose: () => [330, 262, 220, 165].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sawtooth', 0.3), i * 150)),
  click: () => tone(700, 0.04, 'square', 0.12),
};
