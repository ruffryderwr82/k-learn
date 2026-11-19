// Makes the game's voice: one short MP3 per line in js/voicelist.js, using ElevenLabs.
//
//   node tools/voicegen.mjs --dry      count what would be made, and the characters it would use
//   node tools/voicegen.mjs            make every clip that is missing or out of date
//
// Clips go in voice/, listed in voice/manifest.json. Only new or changed lines are generated,
// so adding a word later costs only that word. The API key is read from ELEVENLABS_API_KEY
// (in a Claude cloud session the network proxy adds it, so none is needed there).
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, unlinkSync } from 'node:fs';
import { voiceLines } from '../js/voicelist.js';

const run = promisify(execFile);
const VOICE = { name: 'Matilda', id: 'XrExE9yKIg1WjnnlVkGX' };
const MODEL = 'eleven_v4_turbo';
const SETTINGS = { stability: 0.7, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true, speed: 0.9 };
const FORMAT = 'mp3_44100_64';
const DIR = new URL('../voice/', import.meta.url).pathname;
const MANIFEST = `${DIR}manifest.json`;

const dry = process.argv.includes('--dry');
const lines = voiceLines();
mkdirSync(DIR, { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { clips: {} };
const same = manifest.voice?.id === VOICE.id && manifest.model === MODEL && JSON.stringify(manifest.settings) === JSON.stringify(SETTINGS);
const todo = lines.filter((l) => !same || manifest.clips[l.key]?.text !== l.text || !existsSync(DIR + manifest.clips[l.key].file));
const chars = todo.reduce((n, l) => n + l.text.length, 0);
console.log(`${lines.length} lines; ${todo.length} to make (${chars} characters) with ${VOICE.name}, ${MODEL}`);
// lines the game no longer says: their clips are removed
const wanted = new Set(lines.map((l) => l.key));
const stale = Object.keys(manifest.clips).filter((k) => !wanted.has(k));
console.log(`${stale.length} clips no longer used${stale.length ? `: ${stale.join(' | ')}` : ''}`);
if (!dry) {
  for (const k of stale) { try { unlinkSync(DIR + manifest.clips[k].file); } catch { /* already gone */ } delete manifest.clips[k]; }
  if (!todo.length && stale.length) writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 1)}\n`);
}
if (dry || !todo.length) process.exit(0);

const fileFor = (l) => `${l.key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'line'}-${createHash('sha1').update(l.key).digest('hex').slice(0, 6)}.mp3`;
const key = process.env.ELEVENLABS_API_KEY || 'proxy-injected';

async function make(l) {
  const file = fileFor(l);
  const body = JSON.stringify({ text: l.text, model_id: MODEL, voice_settings: SETTINGS });
  for (let attempt = 1; attempt <= 4; attempt++) {
    const { stdout } = await run('curl', ['-sS', '-o', DIR + file, '-w', '%{http_code}', '-X', 'POST',
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}?output_format=${FORMAT}`,
      '-H', 'Content-Type: application/json', '-H', `xi-api-key: ${key}`, '-d', body]);
    if (stdout === '200' && statSync(DIR + file).size > 500) return { ...l, file };
    const err = existsSync(DIR + file) ? readFileSync(DIR + file, 'utf8').slice(0, 200) : '';
    if (stdout !== '429' && !stdout.startsWith('5')) throw new Error(`"${l.text}": HTTP ${stdout} ${err}`);
    await new Promise((r) => setTimeout(r, attempt * 2000)); // busy: wait and try again
  }
  throw new Error(`"${l.text}": gave up after retries`);
}

const done = [];
const failed = [];
let next = 0;
const worker = async () => {
  while (next < todo.length) {
    const l = todo[next++];
    try { done.push(await make(l)); } catch (e) { failed.push(e.message); }
    if ((done.length + failed.length) % 50 === 0) console.log(`  ${done.length + failed.length} / ${todo.length}`);
  }
};
await Promise.all([worker(), worker(), worker()]);

if (!same) manifest.clips = {};
for (const l of done) manifest.clips[l.key] = { file: l.file, text: l.text };
Object.assign(manifest, { voice: VOICE, model: MODEL, settings: SETTINGS, format: FORMAT });
manifest.clips = Object.fromEntries(Object.entries(manifest.clips).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 1)}\n`);
console.log(`made ${done.length}, failed ${failed.length}`);
for (const f of failed) console.log(`  FAILED ${f}`);
process.exit(failed.length ? 1 : 0);
