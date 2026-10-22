// Synthetic street ambience (browser only, started by the player): traffic hum,
// rain hiss when the recorded weather says rain, birds by day. Purely decorative.
import type { SceneWeather } from "@/game/world-scene";
import type { DayPhase } from "@/game/world";

export type Ambience = { update: (weather: SceneWeather, phase: DayPhase) => void; stop: () => void };

function noiseBuffer(ac: AudioContext, brown: boolean) {
  const b = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate); const d = b.getChannelData(0); let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w * 0.5; }
  return b;
}
function loop(ac: AudioContext, buffer: AudioBuffer, type: BiquadFilterType, freq: number) {
  const src = ac.createBufferSource(); src.buffer = buffer; src.loop = true;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ac.createGain(); g.gain.value = 0;
  src.connect(f).connect(g).connect(ac.destination); src.start();
  return g;
}

/** Target volumes for each layer; exported for tests. */
export function ambienceLevels(weather: SceneWeather, phase: DayPhase) {
  const night = phase === "nuit";
  return {
    traffic: night ? 0.12 : phase === "soiree" ? 0.25 : 0.32,
    rain: weather === "pluie" ? 0.28 : 0,
    birds: !night && weather !== "pluie" && weather !== "neige",
  };
}

export function startAmbience(weather: SceneWeather, phase: DayPhase): Ambience | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ac = new AC();
  const traffic = loop(ac, noiseBuffer(ac, true), "lowpass", 600);
  const rain = loop(ac, noiseBuffer(ac, false), "highpass", 2500);
  let birds = false;
  const chirp = () => {
    if (!birds || ac.state === "closed") return;
    const o = ac.createOscillator(); const g = ac.createGain(); const t = ac.currentTime;
    const f0 = 2200 + Math.random() * 1600;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.4, t + 0.08);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.15);
  };
  const timer = window.setInterval(() => { if (Math.random() < 0.5) { chirp(); window.setTimeout(chirp, 160); } }, 1800);
  const update = (w: SceneWeather, p: DayPhase) => {
    const l = ambienceLevels(w, p); const t = ac.currentTime + 1.5;
    traffic.gain.linearRampToValueAtTime(l.traffic, t); rain.gain.linearRampToValueAtTime(l.rain, t); birds = l.birds;
  };
  update(weather, phase);
  return { update, stop: () => { window.clearInterval(timer); void ac.close(); } };
}
