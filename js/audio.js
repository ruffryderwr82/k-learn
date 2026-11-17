import { hasNative, fileWrite, fileRead, fileDelete, fileList, toBase64, fromBase64 } from './native.js';

// Sound: synthesized effects, music for each world, and the speaking voice.
// No audio files, so the whole game works offline from a few kilobytes.

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let noiseBuf = null;
export const settings = { voice: true, sfx: true, music: true, kidName: '' };

export function unlock() {
  // Browsers only allow audio after a tap, so this is called from the first button press.
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      // everything goes through a gentle compressor so loud moments never clip
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      comp.connect(ctx.destination);
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(comp);
      sfxBus = ctx.createGain();
      sfxBus.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.5;
      musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}

function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0, at, bus, attack = 0.01 } = {}) {
  if (!ctx) return;
  const t = at ?? ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus || sfxBus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Filtered noise: thumps, whooshes, crunches, drums.
function noise(dur, { vol = 0.2, delay = 0, at, type = 'lowpass', freq = 1000, to, q = 1, bus } = {}) {
  if (!ctx) return;
  const t = at ?? ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus || sfxBus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

const arp = (notes, step, opts) => notes.forEach((f, i) => tone(f, opts.dur || 0.22, { ...opts, delay: (opts.delay || 0) + i * step }));

const SFX = {
  jump: () => { tone(330, 0.18, { type: 'square', vol: 0.1, slide: 330 }); noise(0.1, { vol: 0.05, type: 'highpass', freq: 2500 }); },
  coin: () => { tone(988, 0.07, { type: 'square', vol: 0.08 }); tone(1319, 0.22, { type: 'square', vol: 0.08, delay: 0.07 }); tone(2637, 0.15, { type: 'sine', vol: 0.03, delay: 0.07 }); },
  gem: () => { arp([659, 784, 988, 1319, 1568], 0.07, { type: 'triangle', vol: 0.18, dur: 0.3 }); noise(0.4, { vol: 0.04, type: 'highpass', freq: 6000, delay: 0.1 }); },
  right: () => { arp([523, 659, 784, 1047], 0.08, { type: 'triangle', vol: 0.22 }); tone(131, 0.4, { type: 'triangle', vol: 0.2 }); tone(2093, 0.3, { type: 'sine', vol: 0.05, delay: 0.3 }); },
  wrong: () => { tone(220, 0.14, { type: 'square', vol: 0.08, slide: -20 }); tone(165, 0.3, { type: 'square', vol: 0.08, delay: 0.14, slide: -40 }); },
  stomp: () => { noise(0.12, { vol: 0.35, freq: 500 }); tone(240, 0.14, { type: 'square', vol: 0.12, slide: -170 }); },
  hurt: () => { tone(300, 0.25, { type: 'sawtooth', vol: 0.1, slide: -200 }); noise(0.15, { vol: 0.1, freq: 1200 }); },
  spring: () => tone(220, 0.4, { type: 'sine', vol: 0.25, slide: 900 }),
  gate: () => { arp([392, 523, 659, 784], 0.05, { type: 'sine', vol: 0.16, dur: 0.5 }); noise(0.6, { vol: 0.05, type: 'highpass', freq: 5000 }); },
  super: () => arp([523, 659, 784, 1047, 1319, 1568], 0.06, { type: 'square', vol: 0.08, dur: 0.18 }),
  win: () => {
    // a little fanfare: two pickups, then a held major chord over a bass
    arp([523, 659, 784], 0.11, { type: 'square', vol: 0.09, dur: 0.12 });
    [523, 659, 784, 1047].forEach((f) => tone(f, 0.9, { type: 'triangle', vol: 0.12, delay: 0.4 }));
    tone(131, 1, { type: 'triangle', vol: 0.25, delay: 0.4 });
    noise(0.8, { vol: 0.06, type: 'highpass', freq: 6000, delay: 0.4 });
  },
  dash: () => { noise(0.25, { vol: 0.25, type: 'bandpass', freq: 600, to: 3000, q: 2 }); tone(500, 0.16, { type: 'sawtooth', vol: 0.05, slide: 700 }); },
  smash: () => { noise(0.4, { vol: 0.5, freq: 900, to: 200 }); tone(110, 0.3, { type: 'square', vol: 0.15, slide: -60 }); },
  shield: () => tone(900, 0.3, { type: 'sine', vol: 0.2, slide: -600 }),
  bosshit: () => { noise(0.35, { vol: 0.4, freq: 700 }); tone(160, 0.3, { type: 'sawtooth', vol: 0.15, slide: -90 }); tone(1200, 0.15, { type: 'square', vol: 0.06, delay: 0.02 }); },
  bossdown: () => { arp([784, 659, 523, 392, 262, 196], 0.09, { type: 'square', vol: 0.12, dur: 0.25 }); noise(1.2, { vol: 0.3, freq: 400, to: 60, delay: 0.1 }); },
  power: () => arp([392, 523, 659, 784, 1047, 1319, 1568], 0.1, { type: 'triangle', vol: 0.2, dur: 0.3 }),
  die: () => arp([523, 494, 440, 392, 330, 262, 196], 0.1, { type: 'square', vol: 0.12, dur: 0.16 }),
  tap: () => tone(660, 0.06, { type: 'sine', vol: 0.15 }),
  buy: () => arp([784, 1047, 1568], 0.07, { type: 'triangle', vol: 0.2, dur: 0.15 }),
  // a freed letter: a happy rising "wheee" and a chime
  free: () => { tone(500, 0.35, { type: 'sine', vol: 0.18, slide: 900 }); tone(1568, 0.3, { type: 'triangle', vol: 0.08, delay: 0.25 }); tone(2093, 0.4, { type: 'triangle', vol: 0.06, delay: 0.32 }); },
  pop: () => { noise(0.06, { vol: 0.4, type: 'highpass', freq: 1500 }); tone(900, 0.12, { type: 'sine', vol: 0.12, slide: -500 }); },
  bonk: () => { tone(180, 0.1, { type: 'square', vol: 0.18, slide: 120 }); noise(0.08, { vol: 0.25, freq: 2000 }); },
  raspberry: () => { tone(110, 0.35, { type: 'sawtooth', vol: 0.1, slide: 30 }); noise(0.35, { vol: 0.06, type: 'bandpass', freq: 400, q: 3 }); },
  toot: () => { tone(587, 0.5, { type: 'square', vol: 0.06 }); tone(740, 0.5, { type: 'square', vol: 0.05 }); tone(880, 0.5, { type: 'triangle', vol: 0.05 }); },
  chug: () => noise(0.09, { vol: 0.12, type: 'bandpass', freq: 700, q: 1.5 }),
  ding: () => { tone(1319, 0.5, { type: 'sine', vol: 0.15 }); tone(1976, 0.4, { type: 'sine', vol: 0.06 }); },
  rattle: () => { for (let i = 0; i < 4; i++) noise(0.05, { vol: 0.12, type: 'bandpass', freq: 1500, q: 4, delay: i * 0.07 }); },
  boost: () => { noise(0.6, { vol: 0.3, type: 'bandpass', freq: 300, to: 2000, q: 1 }); tone(200, 0.5, { type: 'sawtooth', vol: 0.05, slide: 400 }); },
  catch: () => { tone(880, 0.1, { type: 'square', vol: 0.08 }); tone(1175, 0.18, { type: 'square', vol: 0.08, delay: 0.06 }); },
  drumroll: () => { for (let i = 0; i < 16; i++) noise(0.05, { vol: 0.05 + i * 0.012, type: 'bandpass', freq: 1800, q: 1, delay: i * 0.05 }); noise(0.5, { vol: 0.25, freq: 300, delay: 0.8 }); },
};

export function sfx(name) {
  if (settings.sfx && SFX[name]) SFX[name]();
}

// ---- music ---------------------------------------------------------------
// A small sequencer: bass, soft chords, a melody built from the chords, and drums.
// Each world has its own key, tempo and chord loop; bosses and mini-games get their own.
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXO = [0, 2, 4, 5, 7, 9, 10];
const SONGS = {
  0: { bpm: 112, root: 60, scale: MAJOR, prog: [0, 4, 5, 3], lead: 'triangle', groove: 'bounce' },     // Letter Meadow: sunny
  1: { bpm: 100, root: 62, scale: MIXO, prog: [0, 6, 3, 0], lead: 'square', groove: 'gallop' },       // Sound Canyon: western
  2: { bpm: 92, root: 57, scale: DORIAN, prog: [0, 3, 0, 6], lead: 'triangle', groove: 'soft' },      // Word Woods: mysterious
  3: { bpm: 120, root: 65, scale: MAJOR, prog: [3, 4, 2, 5], lead: 'sine', groove: 'float' },         // Sky Islands: dreamy
  4: { bpm: 104, root: 55, scale: MAJOR, prog: [0, 5, 3, 4], lead: 'triangle', groove: 'bounce' },    // Story Summit: bright and snowy
  boss: { bpm: 144, root: 57, scale: MINOR, prog: [0, 5, 6, 4], lead: 'square', groove: 'drive' },
  mini: { bpm: 128, root: 62, scale: MAJOR, prog: [0, 3, 4, 3], lead: 'square', groove: 'drive' },
};
// melody: which chord tone (0-2, +3 = an octave up) to play on each eighth note; -1 rests
const MOTIFS = [
  [3, -1, 4, 5, 4, -1, 3, 2],
  [0, 2, 3, -1, 5, 4, 3, -1],
  [5, -1, 4, 3, 4, -1, 2, -1],
  [3, 4, 5, 4, 3, 2, 1, 2],
];
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

let song = null;
let songStep = 0;
let nextTime = 0;
let musicTimer = null;

function chordNotes(sng, degree) {
  const n = sng.scale.length;
  return [0, 2, 4].map((k) => {
    const d = degree + k;
    return sng.root + sng.scale[d % n] + 12 * Math.floor(d / n);
  });
}

function scheduleStep(sng, step, at) {
  const sixteenth = 60 / sng.bpm / 4;
  const bar = Math.floor(step / 16);
  const s = step % 16;
  const chord = chordNotes(sng, sng.prog[bar % sng.prog.length]);
  const bus = musicBus;
  // chords: a soft pad at the start of each bar
  if (s === 0) chord.forEach((m) => tone(midi(m), sixteenth * 15, { type: 'sine', vol: 0.022, at, bus, attack: 0.12 }));
  // bass
  const bassHits = { bounce: [0, 4, 8, 12], gallop: [0, 3, 6, 8, 11, 14], soft: [0, 8], float: [0, 6, 10], drive: [0, 2, 4, 6, 8, 10, 12, 14] }[sng.groove];
  if (bassHits.includes(s)) {
    const m = (s / 2) % 2 && sng.groove === 'bounce' ? chord[2] - 24 : chord[0] - 24;
    tone(midi(m), sixteenth * 1.8, { type: 'triangle', vol: 0.13, at, bus });
  }
  // melody on eighth notes, a different motif each bar of the loop
  if (s % 2 === 0) {
    const pick = MOTIFS[(bar + Math.floor(bar / 4)) % MOTIFS.length][s / 2];
    if (pick >= 0) tone(midi(chord[pick % 3] + 12 * (1 + Math.floor(pick / 3))), sixteenth * 1.7, { type: sng.lead, vol: sng.lead === 'square' ? 0.028 : 0.05, at, bus });
  }
  // drums
  const drive = sng.groove === 'drive';
  if (s === 0 || s === 8 || (drive && (s === 4 || s === 12)) || (sng.groove === 'bounce' && s === 10)) {
    tone(150, 0.16, { type: 'sine', vol: 0.32, slide: -110, at, bus });
  }
  if ((s === 4 || s === 12) && sng.groove !== 'soft') noise(0.13, { vol: 0.09, type: 'bandpass', freq: 1800, at, bus });
  if (s % 2 === 0 || drive) noise(0.03, { vol: s % 4 === 2 ? 0.05 : 0.025, type: 'highpass', freq: 7000, at, bus });
}

function tick() {
  if (!song || !ctx || !settings.music || document.hidden) { nextTime = 0; return; }
  // duck under the voice
  musicBus.gain.setTargetAtTime(isSpeaking() ? 0.17 : 0.5, ctx.currentTime, 0.08);
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + 0.15) {
    scheduleStep(song, songStep, nextTime);
    nextTime += 60 / song.bpm / 4;
    songStep++;
  }
}

/** Start the music for a world (0-4), optionally as its 'boss' or 'mini' variant. null stops it. */
export function music(world, kind = null) {
  clearInterval(musicTimer);
  musicTimer = null;
  song = null;
  if (world == null) return;
  const base = SONGS[kind || world] || SONGS[0];
  // bosses and mini-games borrow a little of their world's key so they still belong there
  song = kind ? { ...base, root: base.root + ((world || 0) % 3) - 1 } : base;
  songStep = 0;
  nextTime = 0;
  musicTimer = setInterval(tick, 25);
}

// ---- voice --------------------------------------------------------------
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;

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
let talking = 0;

export const isSpeaking = () => talking > 0 || (!!synth && synth.speaking);
export const lastSpoken = { text: '' }; // what was said last, as text (for tests)

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Speak one piece of text and resolve when it has finished. */
function utter(text) {
  if (!settings.voice || !text) return Promise.resolve();
  const tts = nativeTTS();
  if (tts) return tts.speak({ text, lang: 'en-US', rate: 0.85, pitch: 1.1, queueStrategy: 0 }).catch(() => { /* no speech engine installed */ });
  if (!synth) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = 'en-US';
    u.rate = 0.85;
    u.pitch = 1.1;
    // some browsers never fire "end", so never wait forever
    const giveUp = setTimeout(resolve, 1500 + text.length * 110);
    u.onend = u.onerror = () => { clearTimeout(giveUp); resolve(); };
    synth.speak(u);
  });
}

let playId = 0; // bumping this cancels whatever is playing

// Things to say when he gets one right. A grown-up can record their own (cheer:0 ... cheer:9).
export const CHEERS = ['Yes!', 'You got it!', 'Great reading!', 'Wow!', 'Super!', 'Nice one!', 'Awesome!', 'You did it!', 'Way to go!', 'Brilliant!'];
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Play a script: a list of text to speak, { s: soundId } recorded sounds,
 * { name: letter } letter names (a recording if there is one, else the voice),
 * { cheer: true } a cheer (a recorded one if any, else the voice), { kid: true } the child's
 * name (recorded or typed in; skipped if neither) and { pause: ms }.
 * A plain string works too. Starting a new script stops the one before it.
 */
export async function play(script) {
  const parts = typeof script === 'string' ? [script] : script.filter(Boolean);
  lastSpoken.text = parts.map((p) => (typeof p === 'string' ? p : p.s ? `/${p.s}/` : p.name ? `[${p.name.toUpperCase()}]` : p.cheer ? '<cheer>' : p.kid ? '<name>' : '')).filter(Boolean).join(' ');
  hush();
  const id = playId;
  talking++;
  try {
    await wait(80); // iOS drops speech queued in the same tick as a cancel
    for (const part of parts) {
      if (id !== playId) return;
      if (typeof part === 'string') await utter(part);
      else if (part.pause) await wait(part.pause);
      else if (part.s) await playSound(part.s);
      else if (part.name) await (clips.has(`name:${part.name}`) ? playSound(`name:${part.name}`) : utter(part.name.toUpperCase()));
      else if (part.cheer) {
        const mine = [...clips.keys()].filter((k) => k.startsWith('cheer:'));
        await (mine.length ? playSound(pickOne(mine)) : utter(pickOne(CHEERS)));
      } else if (part.kid) {
        if (clips.has('kidname')) await playSound('kidname');
        else if (settings.kidName) await utter(settings.kidName);
      }
    }
  } finally { talking--; }
}

export const speak = (text) => play(text);

export function hush() {
  playId++;
  synth?.cancel();
  nativeTTS()?.stop().catch(() => {});
  if (clipNode) { try { clipNode.stop(); } catch { /* already stopped */ } clipNode = null; }
}

// ---- recorded letter sounds ----------------------------------------------
// A grown-up records each sound once. Clips are trimmed, stored on the device
// (IndexedDB) and played through Web Audio so they can be sequenced tightly for blending.
const clips = new Map(); // soundId -> { rate, pcm: Float32Array }
let clipNode = null;
let dbPromise = null;

function db() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('k-learn-sounds', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('clips');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

const tx = async (mode, fn) => {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('clips', mode);
    const out = fn(t.objectStore('clips'));
    t.oncomplete = () => resolve(out.result);
    t.onerror = () => reject(t.error);
  });
};

/** Load saved recordings. Safe to call when storage is unavailable. */
export async function loadClips() {
  try {
    const d = await db();
    await new Promise((resolve, reject) => {
      const req = d.transaction('clips').objectStore('clips').openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return resolve();
        clips.set(c.key, { rate: c.value.rate, pcm: new Float32Array(c.value.pcm) });
        c.continue();
      };
      req.onerror = () => reject(req.error);
    });
  } catch { /* no recordings available */ }
  await restoreNativeClips();
  return clips.size;
}

// In the Android app every recording is also kept as a file (16-bit, about 150 KB each).
// Any recording missing from the web storage is restored from those files.
const CLIP_DIR = 'clips';
const clipFile = (id, rate) => `${CLIP_DIR}/${id.replace(':', '__')}@${rate}.pcm`;

async function restoreNativeClips() {
  if (!hasNative()) return;
  for (const name of await fileList(CLIP_DIR)) {
    const m = name.match(/^(.+)@(\d+)\.pcm$/);
    if (!m) continue;
    const id = m[1].replace('__', ':');
    if (clips.has(id)) continue;
    const b64 = await fileRead(`${CLIP_DIR}/${name}`);
    if (!b64) continue;
    const bytes = fromBase64(b64);
    const pcm16 = new Int16Array(bytes.buffer, 0, bytes.length >> 1);
    const pcm = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) pcm[i] = pcm16[i] / 32767;
    const rate = Number(m[2]);
    clips.set(id, { rate, pcm });
    try { await tx('readwrite', (s) => s.put({ rate, pcm: pcm.buffer }, id)); } catch { /* still usable this session */ }
  }
}

async function writeNativeClip(id, pcm, rate) {
  if (!hasNative()) return;
  await deleteNativeClip(id);
  const pcm16 = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) pcm16[i] = Math.max(-1, Math.min(1, pcm[i])) * 32767;
  await fileWrite(clipFile(id, rate), toBase64(new Uint8Array(pcm16.buffer)));
}

async function deleteNativeClip(id) {
  if (!hasNative()) return;
  const prefix = `${id.replace(':', '__')}@`;
  for (const name of await fileList(CLIP_DIR)) if (name.startsWith(prefix)) await fileDelete(`${CLIP_DIR}/${name}`);
}

export const hasSound = (id) => clips.has(id);
export const soundCount = () => [...clips.keys()].filter((k) => !k.includes(':') && k !== 'kidname').length;
export const hasKidName = () => clips.has('kidname') || !!settings.kidName;

export function playSound(id) {
  const clip = clips.get(id);
  if (!clip || !ctx || !settings.voice) return Promise.resolve();
  return new Promise((resolve) => {
    const buf = ctx.createBuffer(1, clip.pcm.length, clip.rate);
    buf.copyToChannel(clip.pcm, 0);
    const node = ctx.createBufferSource();
    node.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 1.8; // voice sits above the music and effects
    node.connect(g).connect(ctx.destination);
    node.onended = resolve;
    clipNode = node;
    node.start();
    setTimeout(resolve, (clip.pcm.length / clip.rate) * 1000 + 300); // in case "ended" never fires
  });
}

/** Cut silence off both ends and bring the level up, so every sound starts at once and is as loud as the others. */
export function trim(pcm, rate) {
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) peak = Math.max(peak, Math.abs(pcm[i]));
  if (peak < 0.02) return null; // nothing was heard
  const gate = peak * 0.08;
  let a = 0;
  let b = pcm.length - 1;
  while (a < b && Math.abs(pcm[a]) < gate) a++;
  while (b > a && Math.abs(pcm[b]) < gate) b--;
  const pad = Math.floor(rate * 0.03);
  a = Math.max(0, a - pad);
  b = Math.min(pcm.length - 1, b + pad * 2);
  const out = pcm.slice(a, b + 1);
  const k = 0.9 / peak;
  const fade = Math.min(pad, out.length >> 1);
  for (let i = 0; i < out.length; i++) {
    let v = out[i] * k;
    if (i < fade) v *= i / fade;
    if (out.length - i <= fade) v *= (out.length - i) / fade;
    out[i] = v;
  }
  return out;
}

export async function saveClip(id, pcm, rate) {
  clips.set(id, { rate, pcm });
  try { await tx('readwrite', (s) => s.put({ rate, pcm: pcm.buffer }, id)); } catch { /* kept for this session only */ }
  await writeNativeClip(id, pcm, rate);
}

export async function deleteClip(id) {
  clips.delete(id);
  try { await tx('readwrite', (s) => s.delete(id)); } catch { /* ignore */ }
  await deleteNativeClip(id);
}

let micStream = null;

/** Ask for the microphone. Throws if it is refused or missing. */
export async function openMic() {
  unlock();
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This device or view cannot record.');
  if (!micStream) micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
  return micStream;
}

export function closeMic() {
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
}

/** Record for up to `ms`, then trim and save as sound `id`. Resolves true if something was heard. */
export async function record(id, ms = 1800) {
  const stream = await openMic();
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const stopped = new Promise((r) => { rec.onstop = r; });
  rec.start();
  await wait(ms);
  rec.stop();
  await stopped;
  const raw = await new Blob(chunks, { type: rec.mimeType }).arrayBuffer();
  const decoded = await ctx.decodeAudioData(raw);
  const pcm = trim(decoded.getChannelData(0).slice(), decoded.sampleRate);
  if (!pcm) return false;
  await saveClip(id, pcm, decoded.sampleRate);
  return true;
}
