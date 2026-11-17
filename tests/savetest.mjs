// Checks that progress and recordings survive in the Android app:
//  1. an app update (the page reloads with its storage kept)
//  2. the web storage being wiped (everything comes back from the native copy)
// The Android storage plugins are stood in for by a fake whose data lives in this test,
// outside the page, the way native storage lives outside the web view.
// Run: npm start (in another terminal), then: node tests/savetest.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // uses a globally installed Playwright

const url = process.env.URL || 'http://localhost:8080/';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

const prefs = new Map();
const files = new Map();
await page.exposeFunction('__native', (op, a, b) => {
  if (op === 'pget') return prefs.has(a) ? prefs.get(a) : null;
  if (op === 'pset') { prefs.set(a, b); return null; }
  if (op === 'fwrite') { files.set(a, b); return null; }
  if (op === 'fread') return files.has(a) ? files.get(a) : null;
  if (op === 'fdelete') { files.delete(a); return null; }
  if (op === 'flist') return [...files.keys()].filter((k) => k.startsWith(`${a}/`)).map((k) => k.slice(a.length + 1));
  return null;
});
await page.addInitScript(() => {
  const n = (...args) => window.__native(...args);
  window.Capacitor = {
    isNativePlatform: () => true,
    Plugins: {
      Preferences: {
        get: async ({ key }) => ({ value: await n('pget', key) }),
        set: async ({ key, value }) => { await n('pset', key, value); },
      },
      Filesystem: {
        writeFile: async ({ path, data }) => { await n('fwrite', path, data); return { uri: path }; },
        readFile: async ({ path }) => { const data = await n('fread', path); if (data == null) throw new Error('missing'); return { data }; },
        deleteFile: async ({ path }) => { await n('fdelete', path); },
        readdir: async ({ path }) => ({ files: (await n('flist', path)).map((name) => ({ name })) }),
      },
    },
  };
});

const ready = async () => { await page.waitForFunction(() => window.__k); await page.waitForTimeout(400); };
const snapshot = () => page.evaluate(() => {
  const s = window.__k.state;
  return { coins: s.coins, done: Object.keys(s.done).length, mastery: s.mastery['s:m']?.b, rescued: s.rescued.m, kid: s.settings.kidName, clips: window.__k.audio.soundCount(), cheer: window.__k.audio.hasSound('cheer:0') };
});

await page.goto(url);
await ready();
// some progress and two recordings
await page.evaluate(async () => {
  const k = window.__k;
  const s = k.state;
  s.coins = 123;
  for (let i = 0; i < 5; i++) s.done[k.LEVELS[i].id] = 3;
  s.mastery['s:m'] = { b: 3, s: 4, r: 3 };
  s.rescued.m = 2;
  s.settings.kidName = 'Sam';
  k.game.hooks.onAnswer({ key: 's:a' }, true); // saves, the way a real answer does
  const tone = new Float32Array(4000).map((_, i) => Math.sin(i / 8) * 0.5);
  await k.audio.saveClip('m', tone, 44100);
  await k.audio.saveClip('cheer:0', tone, 44100);
});
const before = await snapshot();

// 1. an update: the app restarts with its storage in place
await page.reload();
await ready();
const afterUpdate = await snapshot();

// 2. the web storage is wiped: localStorage and the recordings database
await page.evaluate(async () => {
  localStorage.clear();
  await new Promise((r) => { const q = indexedDB.deleteDatabase('k-learn-sounds'); q.onsuccess = q.onerror = q.onblocked = r; });
});
await page.reload();
await ready();
const afterWipe = await snapshot();
// and the restored save is written back to the web storage, so a second restart is normal again
await page.reload();
await ready();
const afterRestart = await snapshot();

const checks = { afterUpdate, afterWipe, afterRestart };
let bad = errors.length;
console.log('before         ', JSON.stringify(before));
for (const [name, got] of Object.entries(checks)) {
  const same = JSON.stringify(got) === JSON.stringify(before);
  if (!same) bad++;
  console.log(`${same ? 'ok  ' : 'FAIL'} ${name.padEnd(12)} ${JSON.stringify(got)}`);
}
console.log(`native copies: save ${prefs.has('k-learn-save') ? 'yes' : 'no'}, recordings ${[...files.keys()].join(', ')}`);
if (errors.length) console.log('page errors:', errors);
await browser.close();
process.exit(bad ? 1 : 0);
