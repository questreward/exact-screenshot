// Sons synthétisés localement (aucun fichier ni service extérieur). Coupés par défaut.
const KEY = 'civitas-sons';
let ctx: AudioContext | null = null;

export function soundsEnabled(): boolean {
  return typeof window !== 'undefined' && window.localStorage.getItem(KEY) === 'on';
}
export function setSoundsEnabled(on: boolean) {
  window.localStorage.setItem(KEY, on ? 'on' : 'off');
}
function audio(): AudioContext | null {
  if (!soundsEnabled()) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}
function tone(freqs: number[], step: number, type: OscillatorType = 'sine', vol = 0.08) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; g.gain.value = vol; o.connect(g).connect(a.destination);
  freqs.forEach((f, i) => o.frequency.setValueAtTime(f, a.currentTime + i * step));
  g.gain.setValueAtTime(vol, a.currentTime + freqs.length * step - 0.05);
  g.gain.linearRampToValueAtTime(0, a.currentTime + freqs.length * step);
  o.start(); o.stop(a.currentTime + freqs.length * step);
}
function noise(seconds: number, vol: number, low: number) {
  const a = audio(); if (!a) return;
  const buf = a.createBuffer(1, a.sampleRate * seconds, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / d.length);
  const s = a.createBufferSource(); const f = a.createBiquadFilter(); const g = a.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = low; g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination); s.start();
}

export type Sfx = 'sirene_pompiers' | 'sirene_police' | 'radio' | 'bip' | 'foule' | 'megaphone' | 'jingle';
export function play(kind: Sfx) {
  switch (kind) {
    case 'sirene_pompiers': return tone([435, 488, 435, 488, 435, 488], 0.5, 'triangle'); // « pin-pon » français
    case 'sirene_police': return tone([420, 520, 620, 520, 420, 520, 620, 520], 0.22, 'sawtooth', 0.04);
    case 'radio': noise(0.35, 0.12, 3000); return tone([880, 1320], 0.08, 'square', 0.03);
    case 'bip': return tone([1000], 0.12, 'square', 0.04);
    case 'foule': return noise(2.5, 0.25, 700);
    case 'megaphone': noise(0.2, 0.1, 2000); return tone([300, 330, 300], 0.15, 'square', 0.04);
    case 'jingle': return tone([523, 659, 784, 1046], 0.18, 'triangle', 0.07);
  }
}
