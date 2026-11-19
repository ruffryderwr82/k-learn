// Plays every layout of every level with a simple bot to prove each one can be finished.
// Run: npm start (in another terminal), then: node tests/playtest.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // uses a globally installed Playwright

const url = process.env.URL || 'http://localhost:8080/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => window.__k);

// Run once with no recorded letter sounds (key-word questions) and once with them
// (blending and sound questions), since the two ask different things.
const run = (withSounds) => page.evaluate(async (withSounds) => {
  if (withSounds) {
    const { SOUNDS } = await import('./js/sounds.js');
    for (const id of Object.keys(SOUNDS)) await window.__k.audio.saveClip(id, new Float32Array(2000).fill(0.1), 44100);
  }
  const { game: g, startLevel, LEVELS } = window.__k;
  const out = [];
  const dump = (g) => {
    const cc = Math.floor(g.p.x / 48);
    const rows = [];
    for (let r = 0; r < 14; r++) { let l = ''; for (let c = cc - 8; c < cc + 10; c++) l += c === cc && r === Math.floor(g.p.y / 48) ? 'P' : '.123#X'[g.tile(c, r)]; rows.push(l); }
    return rows.join('\n') + `\nactive=${!!g.active} grounded=${g.p.grounded} state=${g.state}`;
  };
  window.__k.state.unlockAll = true; // every power, every level
  for (let i = 0; i < LEVELS.length; i++) for (const variant of [0, 1, 2]) {
    let done = null;
    const keep = g.hooks.onComplete;
    g.hooks.onComplete = (r) => { done = r; };
    window.__k.state.plays[LEVELS[i].id] = variant;
    startLevel(i);
    g.stop();
    const inp = g.input;
    let steps = 0;
    const tap = () => { inp.jump = !inp.jump; }; // press on one step, release on the next
    for (; steps < 120 * 240 && !done; steps++) {
      const p = g.p;
      const px = p.x + p.w / 2;
      const feet = Math.floor((p.y + p.h - 1) / 48);
      const col = Math.floor(px / 48);
      const crack = g.tile(col + 1, feet) === 5 || g.tile(col + 2, feet) === 5;
      inp.dash = crack ? !inp.dash : false;
      if (g.active) {
        const s = g.active;
        const want = s.q.sequence ? s.q.sequence[s.step] : s.q.answer; // spelling: the next letter
        const slot = s.slots.find((b) => b.choice === want);
        const tx = slot.x ?? (slot.c + 1) * 48; // balloons and sign-carrying Grumps move
        const onTop = p.y + p.h <= slot.r * 48; // landed on the blocks: walk back off first
        inp.left = onTop || px > tx + 6;
        inp.right = !onTop && px < tx - 6;
        if (inp.left || inp.right) inp.jump = false; else if (p.grounded) tap();
      } else if (g.boss && !g.boss.dead && px > g.stations[0].c0 * 48) {
        inp.left = inp.right = inp.jump = false; // wait for the boss to ask again
      } else {
        inp.left = false;
        inp.right = true;
        const ahead = g.tile(Math.floor((px + 30) / 48), feet);
        const wall = ahead !== 0 && ahead !== 5;
        const pit = feet >= 9 && g.tile(Math.floor((px + 18) / 48), 13) === 0; // a real pit, not a step down
        const m = g.movers.find((mv) => px > mv.x0 - 80 && px < mv.x1 + mv.w + 10);
        if (m && p.riding) {
          // ride in the middle, step off when the platform reaches the far side
          inp.jump = false;
          const arriving = m.x >= m.x1 - 3;
          inp.right = arriving || px < m.x + m.w / 2 - 4;
          inp.left = !arriving && px > m.x + m.w / 2 + 4;
        } else if (m && pit && p.grounded) {
          inp.jump = false;
          inp.right = m.x <= m.x0 + 6; // wait at the edge until the platform comes
        } else if (p.grounded) {
          if (wall || pit) tap(); else inp.jump = false;
        } else if (wall && p.vy > -150) tap(); // double jump up a cliff
      }
      g.step(1 / 120);
    }
    g.hooks.onComplete = keep;
    inp.left = inp.right = inp.jump = inp.dash = false;
    out.push({ id: `${LEVELS[i].id}/${variant}${withSounds ? ' +sounds' : ''}`, boss: !!LEVELS[i].boss, ok: !!done, seconds: Math.round(steps / 120), width: g.lv.W, ...(done || { stuckAt: Math.round(g.p.x / 48), dump: dump(g) }) });
  }
  // every bonus mini-game, played start to finish
  const m = window.__k.minis;
  window.__k.BONUSES.forEach((bonus, i) => {
    let res = null;
    const keep = m.hooks.onComplete;
    m.hooks.onComplete = (r) => { res = r; };
    window.__k.startBonus(i);
    m.stop();
    m.auto = true;
    let steps = 0;
    for (; steps < 120 * 300 && !res; steps++) m.step(1 / 120);
    m.auto = false;
    m.hooks.onComplete = keep;
    out.push({ id: `${bonus.id} ${bonus.game}${withSounds ? ' +sounds' : ''}`, boss: false, mini: true, ok: !!res, seconds: Math.round(steps / 120), width: 0, firstTry: res ? res.firstTry : 0, total: res ? res.total : 0, coins: res?.coins });
  });
  return out;
}, withSounds);
const results = [...await run(false), ...await run(true)];

// Wrong answers: one miss swaps in a different question; three in a row knock Pip
// back to the checkpoint, the gate resets, and the level can still be finished.
const misses = await page.evaluate(() => {
  const { game: g, startLevel } = window.__k;
  const run = (seconds) => { for (let i = 0; i < seconds * 120; i++) g.step(1 / 120); };
  const wrong = () => { const s = g.active; g.answer(s, s.slots.find((b) => b.choice !== (s.q.sequence ? s.q.sequence[s.step] : s.q.answer))); };
  const right = () => { const s = g.active; if (s.q.sequence) { for (const c of s.q.sequence) g.answer(s, s.slots.find((b) => b.choice === c)); } else g.answer(s, s.slots.find((b) => b.choice === s.q.answer)); };
  const toGate = (n) => { g.p.x = g.stations[n].c0 * 48 + 30; g.p.y = 11 * 48 - 42; g.p.vy = 0; run(0.2); };
  const out = {};
  startLevel(3);
  g.stop();
  toGate(0);
  right();                      // open gate 1: that is now the checkpoint
  const checkpointX = g.checkpoint.x;
  toGate(1);
  const first = g.active.q.item;
  wrong();
  out.livesAfterOne = 3 - g.strikes;
  out.promptHidden = g.active === null;
  run(3);
  out.newQuestion = !!g.active && g.active.q.item !== first;
  wrong(); run(3);
  out.livesAfterTwo = 3 - g.strikes;
  wrong();
  out.dying = g.state === 'dying';
  run(2.5);
  out.backAtCheckpoint = g.state === 'play' && Math.abs(g.p.x - checkpointX) < 60;
  out.livesRestored = g.strikes === 0;
  out.gateWaiting = g.stations[1].state === 'idle' && g.active === null;
  toGate(1);
  out.asksAgain = !!g.active;
  right();
  out.gateOpens = g.stations[1].state === 'done' && g.tile(g.stations[1].barrierC, 5) === 0;
  // a right answer between misses resets the count
  toGate(2); wrong(); run(3); right(); toGate(3); wrong();
  out.countResets = g.strikes === 1 && g.state === 'play';
  return out;
});
const expected = { livesAfterOne: 2, livesAfterTwo: 1 }; // everything else should simply be true
const missFails = Object.entries(misses).filter(([k, v]) => v !== (expected[k] ?? true));
console.log('wrong-answer rules:', JSON.stringify(misses));

// every line spoken during all that play must have had a ready-made voice clip
const voiceMisses = await page.evaluate(() => [...window.__k.audio.voiceMisses]);
console.log(voiceMisses.length ? `spoken without a voice clip: ${voiceMisses.join(' | ')}` : 'every spoken line had a voice clip');

let bad = missFails.length + voiceMisses.length;
for (const r of results) {
  if (!r.ok || r.firstTry !== (r.mini ? r.total : r.boss ? 5 : 6)) bad++;
  console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.id.padEnd(22)} ${String(r.seconds).padStart(3)}s  ${r.mini ? 'bonus game' : r.width + ' tiles'}  coins ${r.coins ?? '-'}  first-try ${r.firstTry ?? '-'}/${r.mini ? r.total : r.boss ? 5 : 6} ${r.ok ? '' : 'stuck at column ' + r.stuckAt}`);
  if (r.dump) console.log(r.dump);
}
if (errors.length) console.log('page errors:', errors);
await browser.close();
process.exit(bad || errors.length ? 1 : 0);
