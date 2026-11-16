// Plays every level with a simple bot to prove each one can be finished.
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

const results = await page.evaluate(() => {
  const { game: g, startLevel, LEVELS } = window.__k;
  const out = [];
  const dump = (g) => {
    const cc = Math.floor(g.p.x / 48);
    const rows = [];
    for (let r = 0; r < 14; r++) { let l = ''; for (let c = cc - 8; c < cc + 10; c++) l += c === cc && r === Math.floor(g.p.y / 48) ? 'P' : '.123#'[g.tile(c, r)]; rows.push(l); }
    return rows.join('\n') + `\nactive=${!!g.active} grounded=${g.p.grounded} state=${g.state}`;
  };
  for (let i = 0; i < LEVELS.length; i++) {
    let done = null;
    const keep = g.hooks.onComplete;
    g.hooks.onComplete = (r) => { done = r; };
    startLevel(i);
    g.stop();
    const inp = g.input;
    let steps = 0;
    const tap = () => { inp.jump = g.p.grounded && !inp.jump; };
    for (; steps < 120 * 240 && !done; steps++) {
      const p = g.p;
      const px = p.x + p.w / 2;
      const feet = Math.floor((p.y + p.h - 1) / 48);
      if (g.active) {
        const s = g.active;
        const slot = s.slots.find((b) => b.choice === s.q.answer);
        const tx = (slot.c + 1) * 48;
        const onTop = p.y + p.h <= slot.r * 48; // landed on the blocks: walk back off first
        inp.left = onTop || px > tx + 6;
        inp.right = !onTop && px < tx - 6;
        if (inp.left || inp.right) inp.jump = false; else if (p.grounded) tap();
      } else {
        inp.left = false;
        inp.right = true;
        const wall = g.tile(Math.floor((px + 30) / 48), feet) !== 0;
        const pit = feet >= 9 && g.tile(Math.floor((px + 18) / 48), 13) === 0; // a real pit, not a step down
        if (p.grounded) { if (wall || pit) tap(); else inp.jump = false; }
      }
      g.step(1 / 120);
    }
    g.hooks.onComplete = keep;
    inp.left = inp.right = inp.jump = false;
    out.push({ id: LEVELS[i].id, ok: !!done, seconds: Math.round(steps / 120), width: g.lv.W, ...(done || { stuckAt: Math.round(g.p.x / 48), dump: dump(g) }) });
  }
  return out;
});

let bad = 0;
for (const r of results) {
  if (!r.ok || r.firstTry !== 6) bad++;
  console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.id.padEnd(10)} ${String(r.seconds).padStart(3)}s  ${r.width} tiles  coins ${r.coins ?? '-'}  first-try ${r.firstTry ?? '-'}/6 ${r.ok ? '' : 'stuck at column ' + r.stuckAt}`);
  if (r.dump) console.log(r.dump);
}
if (errors.length) console.log('page errors:', errors);
await browser.close();
process.exit(bad || errors.length ? 1 : 0);
