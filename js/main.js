// Screens, menus and wiring between the game, the curriculum and saved progress.
import { LEVELS, WORLDS, LETTERS, PICTURES, makeQuestion } from './curriculum.js';
import * as store from './progress.js';
import * as audio from './audio.js';
import { Game } from './game.js';
import { drawHero, COLORS, HATS } from './hero.js';

const $ = (id) => document.getElementById(id);
let state = store.load();
Object.assign(audio.settings, state.settings);

let current = 0;       // index of the level being played
let mapWorld = 0;
let lastResult = null;

const say = (text) => audio.speak(text);

// ---- screens --------------------------------------------------------------
const renderers = { map: renderMap, shop: renderShop, album: renderAlbum, parent: renderParent };

function show(name) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('show', s.id === name);
  document.querySelectorAll('[data-coins]').forEach((e) => { e.textContent = state.coins; });
  document.querySelectorAll('[data-gems]').forEach((e) => { e.textContent = store.gemCount(state); });
  if (name !== 'play') { game.stop(); audio.music(null); }
  renderers[name]?.();
  screen = name;
}
let screen = 'title';

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (!go) return;
  audio.unlock();
  audio.sfx('tap');
  audio.hush();
  show(go.dataset.go);
});

// ---- the game -------------------------------------------------------------
const game = new Game($('game'), {
  nextQuestion: (avoid) => makeQuestion(LEVELS[current], state.mastery, Math.random, avoid),
  onAnswer: (q, firstTry) => { store.recordAnswer(state, q.key, firstTry); store.save(state); },
  onPrompt: showPrompt,
  onHud: (h) => {
    $('hudCoins').textContent = h.coins;
    [...$('hudGems').children].forEach((el, i) => el.classList.toggle('on', h.gems[i]));
    [...$('hudStreak').children].forEach((el, i) => el.classList.toggle('on', h.super || i < h.streak));
    $('hudStreak').classList.toggle('super', h.super);
  },
  onComplete: finishLevel,
  speak: say,
  sfx: audio.sfx,
});

function applyLook() {
  game.look = { color: COLORS[state.color].hex, hat: state.hat };
}

function startLevel(index) {
  current = index;
  const level = LEVELS[index];
  applyLook();
  $('pause').hidden = true;
  $('done').hidden = true;
  show('play');
  game.start(index, level.world, state.gems[level.id]);
  game.run();
  audio.music(level.world);
}

function showPrompt(q) {
  const el = $('prompt');
  if (!q) { el.hidden = true; return; }
  const box = $('promptShow');
  box.textContent = q.show ? (q.show.emoji || q.show.text) : '';
  box.classList.toggle('long', !!q.show?.long);
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth; // restart the drop-in animation
  el.style.animation = '';
}

$('prompt').addEventListener('click', () => { if (game.active) say(game.active.q.say); });

function finishLevel(r) {
  const level = LEVELS[current];
  const stars = r.firstTry >= r.right - 1 ? 3 : r.firstTry >= r.right / 2 ? 2 : 1;
  lastResult = { ...r, stars };
  state.coins += r.coins;
  state.done[level.id] = Math.max(state.done[level.id] || 0, stars);
  const old = state.gems[level.id] || [false, false, false];
  state.gems[level.id] = old.map((g, i) => g || r.gems[i]);
  store.save(state);

  $('doneCoins').textContent = r.coins;
  [...$('doneGems').children].forEach((el, i) => el.classList.toggle('on', r.gems[i]));
  const starEls = [...$('doneStars').children];
  starEls.forEach((el) => el.classList.remove('on'));
  $('done').hidden = false;
  $('btnNext').style.display = current + 1 < LEVELS.length ? '' : 'none';
  setTimeout(() => starEls.forEach((el, i) => el.classList.toggle('on', i < stars)), 150);
  audio.music(null);
  say(`${['Good work!', 'Great job!', 'Amazing!'][stars - 1]} You got ${r.coins} coins.`);
}

$('btnNext').onclick = () => { audio.sfx('tap'); startLevel(Math.min(current + 1, LEVELS.length - 1)); };
$('btnAgain').onclick = () => { audio.sfx('tap'); startLevel(current); };
$('btnDoneMap').onclick = () => { audio.hush(); mapWorld = LEVELS[current].world; show('map'); };
$('btnRestart').onclick = () => startLevel(current);
$('btnQuit').onclick = () => { audio.hush(); mapWorld = LEVELS[current].world; show('map'); };

function pause(on) {
  if (screen !== 'play' || !$('done').hidden) return;
  $('pause').hidden = !on;
  if (on) { game.stop(); audio.hush(); } else game.run();
}
$('btnPause').onclick = () => pause(true);
$('btnResume').onclick = () => pause(false);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
window.addEventListener('resize', () => { game.lv && game.resize(); if (!game.running && game.lv) game.render(); });

// ---- controls -------------------------------------------------------------
function hold(btn, key) {
  const set = (v) => (e) => {
    e.preventDefault();
    if (v) { audio.unlock(); try { btn.setPointerCapture(e.pointerId); } catch { /* fine */ } }
    game.input[key] = v;
    btn.classList.toggle('down', v);
  };
  btn.addEventListener('pointerdown', set(true));
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, set(false));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}
hold($('btnLeft'), 'left');
hold($('btnRight'), 'right');
hold($('btnJump'), 'jump');

const KEYS = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'jump', w: 'jump', ' ': 'jump' };
window.addEventListener('keydown', (e) => {
  if (screen !== 'play') return;
  if (e.key === 'Escape') pause($('pause').hidden);
  const k = KEYS[e.key];
  if (k) { game.input[k] = true; e.preventDefault(); }
});
window.addEventListener('keyup', (e) => { const k = KEYS[e.key]; if (k) game.input[k] = false; });
// Stop iOS from zooming or scrolling the page on double taps and drags.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// ---- title ----------------------------------------------------------------
$('btnPlay').onclick = () => {
  audio.unlock();
  audio.sfx('tap');
  startLevel(store.nextLevelIndex(state));
};

function heroLoop() {
  const t = performance.now() / 1000;
  for (const [id, size] of [['titleHero', 3.4], ['shopHero', 3.6]]) {
    const c = $(id);
    if (!c.offsetParent) continue;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    drawHero(ctx, c.width / 2, c.height - 16, size, { color: COLORS[state.color].hex, hat: state.hat, t, facing: Math.sin(t * 0.7) > 0 ? 1 : -1, cheer: id === 'titleHero' && t % 4 < 0.6 });
  }
  requestAnimationFrame(heroLoop);
}
requestAnimationFrame(heroLoop);

// Grown-ups button needs a long press so small fingers stay in the game.
{
  const b = $('btnParent');
  let timer = null;
  const cancel = () => { clearTimeout(timer); b.classList.remove('holding'); };
  b.addEventListener('pointerdown', () => {
    b.classList.add('holding');
    timer = setTimeout(() => { cancel(); show('parent'); }, 1500);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, cancel);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ---- map ------------------------------------------------------------------
function worldUnlocked(w) {
  const first = LEVELS.findIndex((l) => l.world === w);
  return store.isUnlocked(state, first);
}

function renderMap() {
  const tabs = $('worldTabs');
  tabs.innerHTML = '';
  WORLDS.forEach((w, i) => {
    const b = document.createElement('button');
    b.textContent = worldUnlocked(i) ? w.icon : '🔒';
    b.className = (i === mapWorld ? 'on ' : '') + (worldUnlocked(i) ? '' : 'locked');
    b.setAttribute('aria-label', w.name);
    b.onclick = () => { audio.sfx('tap'); mapWorld = i; renderMap(); say(w.name); };
    tabs.append(b);
  });
  $('worldName').textContent = WORLDS[mapWorld].name;
  const next = store.nextLevelIndex(state);
  const nodes = $('levelNodes');
  nodes.innerHTML = '';
  let n = 0;
  LEVELS.forEach((level, i) => {
    if (level.world !== mapWorld) return;
    n++;
    const open = store.isUnlocked(state, i);
    const b = document.createElement('button');
    b.className = `node ${open ? '' : 'locked'} ${i === next && open ? 'next' : ''}`;
    const stars = state.done[level.id] || 0;
    b.innerHTML = `<b>${open ? n : '🔒'}</b><small></small><span class="s">${'⭐'.repeat(stars)}</span>`;
    b.querySelector('small').textContent = level.title;
    b.onclick = () => {
      audio.unlock();
      if (!open) { audio.sfx('wrong'); return; }
      audio.sfx('tap');
      startLevel(i);
    };
    nodes.append(b);
  });
}

// ---- shop -----------------------------------------------------------------
function shopItem(kind, id, cost, preview) {
  const key = `${kind}:${id}`;
  const owned = state.owned.includes(key);
  const b = document.createElement('button');
  b.className = `item ${state[kind] === id ? 'on' : ''} ${!owned && state.coins < cost ? 'poor' : ''}`;
  b.setAttribute('aria-label', `${id} ${kind}`);
  b.append(preview);
  if (!owned) {
    const p = document.createElement('span');
    p.className = 'price';
    p.innerHTML = `<span class="coin"></span>${cost}`;
    b.append(p);
  }
  b.onclick = () => {
    if (!owned) {
      if (state.coins < cost) {
        audio.sfx('wrong');
        b.classList.add('nope');
        say(`You need ${cost - state.coins} more coins.`);
        setTimeout(() => b.classList.remove('nope'), 300);
        return;
      }
      state.coins -= cost;
      state.owned.push(key);
      audio.sfx('buy');
    } else audio.sfx('tap');
    state[kind] = id;
    store.save(state);
    show('shop');
  };
  return b;
}

function renderShop() {
  const colors = $('shopColors');
  const hats = $('shopHats');
  colors.innerHTML = '';
  hats.innerHTML = '';
  for (const [id, c] of Object.entries(COLORS)) {
    const sw = document.createElement('span');
    sw.className = 'sw';
    sw.style.background = c.hex;
    colors.append(shopItem('color', id, c.cost, sw));
  }
  for (const [id, h] of Object.entries(HATS)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 112;
    drawHero(cv.getContext('2d'), 56, 100, 1.5, { color: COLORS[state.color].hex, hat: id, t: 0.5 });
    hats.append(shopItem('hat', id, h.cost, cv));
  }
}

// ---- sticker book ---------------------------------------------------------
const box = (key) => state.mastery[key]?.b || 0;

function renderAlbum() {
  const letters = $('albumLetters');
  letters.innerHTML = '';
  for (const [l, info] of Object.entries(LETTERS)) {
    const got = box(`n:${l}`) >= store.MASTERED;
    const sound = box(`s:${l}`) >= store.MASTERED;
    const b = document.createElement('button');
    b.className = `sticker ${got ? 'got' : ''}`;
    b.innerHTML = `<span>${l.toUpperCase()}${l}</span><span class="pic" style="${sound ? 'filter:none' : ''}">${info.emoji}</span>`;
    b.onclick = () => say(`${info.name}. ${info.word}.`);
    letters.append(b);
  }
  const wordsEl = $('albumWords');
  wordsEl.innerHTML = '';
  for (const [w, emoji] of Object.entries(PICTURES)) {
    if (box(`w:${w}`) < store.MASTERED) continue;
    const b = document.createElement('button');
    b.className = 'sticker got';
    b.innerHTML = `<span class="pic">${emoji}</span><span>${w}</span>`;
    b.onclick = () => say(w);
    wordsEl.append(b);
  }
}

// ---- grown-ups ------------------------------------------------------------
function renderParent() {
  const m = state.mastery;
  const count = (prefix) => Object.keys(m).filter((k) => k.startsWith(prefix) && m[k].b >= store.MASTERED).length;
  const meter = (label, n, total) => `<div class="meter"><span>${label}</span><div><span style="width:${(100 * n) / total}%"></span></div><em>${n} / ${total}</em></div>`;
  const label = (k) => {
    const [p, item] = k.split(':');
    return { n: `letter ${item.toUpperCase()}`, s: `sound of ${item}`, w: item, x: item }[p] || null;
  };
  const tricky = Object.keys(m).filter((k) => m[k].s >= 2 && m[k].b === 0).map(label).filter(Boolean);
  const sightTotal = new Set(LEVELS.filter((l) => l.poolKind === 'sight').flatMap((l) => l.pool)).size;
  const wordTotal = new Set(LEVELS.filter((l) => l.poolKind === 'word').flatMap((l) => l.pool)).size;

  $('parentBody').innerHTML = `
    <section>
      <h3>What has been learned</h3>
      ${meter('Letter names', count('n:'), 26)}
      ${meter('Letter sounds', count('s:'), 26)}
      ${meter('Words read', count('w:'), wordTotal)}
      ${meter('Sight words', count('x:'), sightTotal)}
      <p>Something counts as learned after three right answers on the first try. A miss moves it back a step, and the game asks about weaker items more often.</p>
    </section>
    <section>
      <h3>Needs more practice</h3>
      ${tricky.length ? `<div class="chips">${tricky.map((t) => `<span>${t}</span>`).join('')}</div>` : '<p>Nothing is stuck right now.</p>'}
    </section>
    <section>
      <h3>Worlds</h3>
      ${WORLDS.map((w, i) => {
        const ls = LEVELS.filter((l) => l.world === i);
        return meter(`${w.icon} ${w.name}`, ls.filter((l) => state.done[l.id]).length, ls.length);
      }).join('')}
      <label><input type="checkbox" id="optUnlock" ${state.unlockAll ? 'checked' : ''}> Unlock every level (to start further along)</label>
    </section>
    <section>
      <h3>Sound</h3>
      <label><input type="checkbox" data-set="voice" ${state.settings.voice ? 'checked' : ''}> Speaking voice</label>
      <label><input type="checkbox" data-set="sfx" ${state.settings.sfx ? 'checked' : ''}> Sound effects</label>
      <label><input type="checkbox" data-set="music" ${state.settings.music ? 'checked' : ''}> Music</label>
      <button class="plain" id="optTest">Test the voice</button>
      <p>The voice is the device's built-in one. If it is silent, check the mute switch and volume.</p>
    </section>
    <section>
      <h3>Start over</h3>
      <button class="plain danger" id="optReset">Erase all progress</button>
    </section>`;

  $('optUnlock').onchange = (e) => { state.unlockAll = e.target.checked; store.save(state); };
  document.querySelectorAll('[data-set]').forEach((el) => {
    el.onchange = () => {
      state.settings[el.dataset.set] = el.checked;
      Object.assign(audio.settings, state.settings);
      store.save(state);
    };
  });
  $('optTest').onclick = () => { audio.unlock(); say('Find the letter em. Great job!'); };
  $('optReset').onclick = (e) => {
    // Two taps instead of a browser dialog, which some app views never show.
    if (!e.target.dataset.sure) { e.target.dataset.sure = '1'; e.target.textContent = 'Tap again to erase coins, stars and learning progress'; return; }
    state = store.reset();
    Object.assign(audio.settings, state.settings);
    show('parent');
  };
}

// ---- offline support ------------------------------------------------------
// (Not needed inside the Android app, where the files are already on the device.)
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.Capacitor) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* the game works without it */ });
}

// Handles for automated play-testing.
window.__k = { game, startLevel, LEVELS, audio, get state() { return state; } };
