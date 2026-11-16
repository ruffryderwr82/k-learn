// Sound: synthesized effects, a tiny music loop, and the speaking voice.
// No audio files, so the whole game works offline from a few kilobytes.

let ctx = null;
let master = null;
let musicTimer = null;
export const settings = { voice: true, sfx: true, music: true };

export function unlock() {
  // Browsers only allow audio after a tap, so this is called from the first button press.
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}

function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const SFX = {
  jump: () => tone(330, 0.18, { type: 'square', vol: 0.12, slide: 330 }),
  coin: () => { tone(988, 0.07, { type: 'square', vol: 0.1 }); tone(1319, 0.2, { type: 'square', vol: 0.1, delay: 0.07 }); },
  gem: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.2, delay: i * 0.08 })),
  right: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.25, delay: i * 0.09 })),
  wrong: () => tone(196, 0.3, { type: 'sawtooth', vol: 0.1, slide: -70 }),
  stomp: () => tone(220, 0.15, { type: 'square', vol: 0.15, slide: -140 }),
  hurt: () => tone(300, 0.25, { type: 'sawtooth', vol: 0.12, slide: -200 }),
  spring: () => tone(220, 0.35, { type: 'sine', vol: 0.25, slide: 900 }),
  gate: () => [392, 523, 659].forEach((f, i) => tone(f, 0.4, { type: 'sine', vol: 0.2, delay: i * 0.05 })),
  super: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.18, { type: 'square', vol: 0.1, delay: i * 0.06 })),
  win: () => [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.25, delay: i * 0.13 })),
  dash: () => tone(500, 0.16, { type: 'sawtooth', vol: 0.1, slide: 700 }),
  smash: () => { tone(140, 0.25, { type: 'square', vol: 0.2, slide: -80 }); tone(90, 0.3, { type: 'sawtooth', vol: 0.15, delay: 0.05 }); },
  shield: () => tone(900, 0.3, { type: 'sine', vol: 0.2, slide: -600 }),
  bosshit: () => { tone(160, 0.3, { type: 'sawtooth', vol: 0.2, slide: -90 }); tone(1200, 0.15, { type: 'square', vol: 0.1, delay: 0.02 }); },
  bossdown: () => [784, 659, 523, 392, 262, 196].forEach((f, i) => tone(f, 0.25, { type: 'square', vol: 0.15, delay: i * 0.09 })),
  power: () => [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.22, delay: i * 0.1 })),
  tap: () => tone(660, 0.06, { type: 'sine', vol: 0.15 }),
  buy: () => [784, 1047, 1568].forEach((f, i) => tone(f, 0.15, { type: 'triangle', vol: 0.2, delay: i * 0.07 })),
};

export function sfx(name) {
  if (settings.sfx && SFX[name]) SFX[name]();
}

// ---- music: a gentle looping arpeggio, different key per world ----------
const SCALES = [
  [262, 294, 330, 392, 440], [294, 330, 370, 440, 494], [220, 262, 294, 330, 392],
  [349, 392, 440, 523, 587], [247, 294, 330, 370, 440],
];
const PATTERN = [0, 2, 4, 2, 1, 3, 4, 3, 0, 2, 3, 2, 1, 2, 4, 1];

export function music(world) {
  clearInterval(musicTimer);
  musicTimer = null;
  if (world == null) return;
  let step = 0;
  const scale = SCALES[world % SCALES.length];
  musicTimer = setInterval(() => {
    if (!settings.music || !ctx || document.hidden) return;
    const quiet = isSpeaking() ? 0.25 : 1; // duck under the voice
    tone(scale[PATTERN[step % PATTERN.length]], 0.3, { type: 'triangle', vol: 0.05 * quiet });
    if (step % 4 === 0) tone(scale[0] / 2, 0.5, { type: 'sine', vol: 0.07 * quiet });
    step++;
  }, 260);
}

// ---- voice --------------------------------------------------------------
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;
let speakTimer = null;

function chooseVoice() {
  if (!synth) return;
  const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang));
  const prefer = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Karen'];
  voice = prefer.map((n) => vs.find((v) => v.name.includes(n))).find(Boolean)
    || vs.find((v) => /en[-_]US/i.test(v.lang)) || vs[0] || null;
}
if (synth) {
  chooseVoice();
  synth.addEventListener?.('voiceschanged', chooseVoice);
}

// Inside the Android app the browser voice does not exist, so use the tablet's own
// text-to-speech through the native plugin instead.
const nativeTTS = () => (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.TextToSpeech : null);
let nativeTalking = 0;

export const isSpeaking = () => nativeTalking > 0 || (!!synth && synth.speaking);
export const lastSpoken = { text: '' }; // exposed for tests and the "say it again" button

export function speak(text, { interrupt = true } = {}) {
  lastSpoken.text = text;
  if (!settings.voice || !text) return;
  const tts = nativeTTS();
  if (tts) {
    nativeTalking++;
    // queueStrategy 0 cuts off whatever is being said, 1 waits its turn
    tts.speak({ text, lang: 'en-US', rate: 0.85, pitch: 1.1, queueStrategy: interrupt ? 0 : 1 })
      .catch(() => { /* no speech engine installed */ })
      .finally(() => { nativeTalking--; });
    return;
  }
  if (!synth) return;
  clearTimeout(speakTimer);
  if (interrupt) synth.cancel();
  // iOS drops an utterance queued in the same tick as cancel().
  speakTimer = setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = 'en-US';
    u.rate = 0.85;
    u.pitch = 1.1;
    synth.speak(u);
  }, interrupt ? 80 : 0);
}

export function hush() {
  clearTimeout(speakTimer);
  nativeTTS()?.stop().catch(() => {});
  synth?.cancel();
}
