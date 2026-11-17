// Screens, menus and wiring between the game, the curriculum and saved progress.
import { LEVELS, WORLDS, LETTERS, PICTURES, POWERS, SIGHT_WORDS, HEART, MINI, BONUSES, bonusLevel, makeQuestion, critterFor } from './curriculum.js';
import { SOUNDS, segment, soundOf } from './sounds.js';
import * as store from './progress.js';
import * as audio from './audio.js';
import { Game } from './game.js';
import { Minis } from './minigames.js';
import { drawHero, drawPet, drawCritter, critterColor, COLORS, HATS, PETS } from './hero.js';

const $ = (id) => document.getElementById(id);
let state = store.load();
Object.assign(audio.settings, state.settings);

let current = 0;       // index of the level being played
let mapWorld = 0;
let lastResult = null;

const say = (text) => audio.play(text);
const promptScript = (q) => q.audio || [q.say];
const canSound = (ids) => !!ids && ids.every(audio.hasSound);
// "Great job, Sam!" now and then, so praise does not sound the same every time
const cheer = (withName = Math.random() < 0.3) => (withName && audio.hasKidName() ? [{ cheer: true }, { kid: true }] : [{ cheer: true }]);
const rescuedEver = () => Object.values(state.rescued || {}).reduce((a, b) => a + b, 0);
let lastCoins = 0;

// ---- screens --------------------------------------------------------------
const renderers = { map: renderMap, shop: renderShop, album: renderAlbum, parent: renderParent };

function show(name) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('show', s.id === name);
  document.querySelectorAll('[data-coins]').forEach((e) => { e.textContent = state.coins; });
  document.querySelectorAll('[data-gems]').forEach((e) => { e.textContent = store.gemBalance(state); });
  if (name !== 'play') { game.stop(); audio.music(null); }
  if (name !== 'mini') minis.stop();
  if (name !== 'parent') audio.closeMic();
  renderers[name]?.();
  if (name === 'title') updateNudge();
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
  nextQuestion: (avoid) => makeQuestion(LEVELS[current], state.mastery, Math.random, avoid, audio.hasSound),
  onAnswer: (q, right) => { store.recordAnswer(state, q.key, right); store.save(state); },
  onPrompt: showPrompt,
  onHud: (h) => {
    if (h.coins > lastCoins) {
      // the counter pops when a coin lands in it
      const w = $('hudCoins').parentElement;
      w.classList.remove('pop');
      void w.offsetWidth;
      w.classList.add('pop');
    }
    lastCoins = h.coins;
    $('hudCoins').textContent = h.coins;
    [...$('hudGems').children].forEach((el, i) => el.classList.toggle('on', h.gems[i]));
    [...$('hudStreak').children].forEach((el, i) => el.classList.toggle('on', h.super || i < h.streak));
    [...$('hudLives').children].forEach((el, i) => el.classList.toggle('on', i < h.lives));
    $('hudStreak').classList.toggle('super', h.super);
  },
  onComplete: finishLevel,
  ask: (q) => audio.play(promptScript(q)),
  praise: (q) => {
    let detail = q.praiseAudio || [q.praise];
    if (detail[0] === 'Yes!') detail = detail.slice(1);
    // the very first letter ever freed gets explained
    const first = !rescuedEver() && game.rescued.length === 1 ? ['You freed a letter! It will follow you.'] : [];
    return audio.play([...cheer(), { pause: 100 }, ...detail, ...first]);
  },
  critterFor,
  coinTarget: () => {
    const r = $('hudCoins').parentElement.querySelector('.coin').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  },
  // A miss: say what was picked (by its sound when there is one). The right answer
  // lights up on screen, and the gate then asks something new.
  wrong: (q, choice) => wrongVoice(q, choice),
  died: () => audio.play('Oh no! Three misses. Back you go. You can do it!'),
  sound: (id) => audio.playSound(id),
  sfx: audio.sfx,
});

function wrongVoice(q, choice) {
  if (q.sequence) return audio.play(['Not quite.', q.item]);
  const bySound = choice.sound && audio.hasSound(choice.sound) && promptScript(q).some((part) => part.s);
  const picked = bySound ? ['That one says', { s: choice.sound }]
    : choice.names ? ['That one is', ...choice.names.map((name) => ({ name }))]
      : [choice.say ? `That one is ${choice.say}.` : 'Not that one.'];
  return audio.play(picked);
}

// ---- bonus mini-games -------------------------------------------------------
let currentBonus = 0;
let bonusPool = null;
const minis = new Minis($('miniCanvas'), {
  question: (avoid) => makeQuestion(bonusPool, state.mastery, Math.random, avoid, audio.hasSound),
  onAnswer: (q, right) => { store.recordAnswer(state, q.key, right); store.save(state); },
  ask: (q) => audio.play(promptScript(q)),
  say: (script) => audio.play(script),
  praise: (q) => {
    let detail = q.praiseAudio || [q.praise];
    if (detail[0] === 'Yes!') detail = detail.slice(1);
    return audio.play([...cheer(), { pause: 100 }, ...detail]);
  },
  wrong: (q, choice) => wrongVoice(q, choice),
  sound: (id) => audio.playSound(id),
  hasSound: audio.hasSound,
  sfx: audio.sfx,
  onHud: (h) => {
    const el = $('miniCoins');
    if (Number(el.textContent) < h.coins) { el.parentElement.classList.remove('pop'); void el.offsetWidth; el.parentElement.classList.add('pop'); }
    el.textContent = h.coins;
  },
  onComplete: finishBonus,
});

function startBonus(i) {
  currentBonus = i;
  const b = BONUSES[i];
  bonusPool = bonusLevel(b);
  show('mini');
  $('miniDone').hidden = true;
  $('miniCoins').textContent = '0';
  minis.look = { color: COLORS[state.color].hex, hat: state.hat };
  minis.start(b.game, b.world);
  minis.run();
  audio.music(b.world, 'mini');
}

function finishBonus(r) {
  const b = BONUSES[currentBonus];
  const stars = r.firstTry >= r.total - 1 ? 3 : r.firstTry >= r.total / 2 ? 2 : 1;
  state.bonus = state.bonus || {};
  const first = !state.bonus[b.id];
  state.bonus[b.id] = Math.max(state.bonus[b.id] || 0, stars);
  state.coins += r.coins;
  if (first) state.bonusGems = (state.bonusGems || 0) + 1; // the first finish of each bonus game pays a gem
  store.save(state);
  minis.stop();
  audio.music(null);
  $('miniName').textContent = MINI.find((g) => g.id === b.game).name;
  $('miniDoneCoins').textContent = r.coins;
  $('miniGem').hidden = !first;
  const starEls = [...$('miniStars').children];
  starEls.forEach((el) => el.classList.remove('on'));
  $('miniDone').hidden = false;
  setTimeout(() => starEls.forEach((el, k) => el.classList.toggle('on', k < stars)), 150);
  say([...cheer(true), `You got ${r.coins} coins.`, first ? 'And a gem!' : '']);
}

const nextAfterBonus = () => {
  const next = BONUSES[currentBonus].after + 1;
  return next < LEVELS.length && store.isUnlocked(state, next) ? next : store.nextLevelIndex(state);
};
$('btnMiniNext').onclick = () => { audio.sfx('tap'); startLevel(nextAfterBonus()); };
$('btnMiniAgain').onclick = () => { audio.sfx('tap'); startBonus(currentBonus); };
$('btnMiniMap').onclick = () => { audio.hush(); mapWorld = BONUSES[currentBonus].world; show('map'); };
$('btnMiniQuit').onclick = () => { audio.hush(); mapWorld = BONUSES[currentBonus].world; show('map'); };
$('btnBonus').onclick = () => {
  audio.sfx('tap');
  const i = BONUSES.findIndex((b) => b.after === current);
  if (i >= 0) startBonus(i);
};

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
  const powers = Object.fromEntries(POWERS.map((p) => [p.id, store.hasPower(state, p.id)]));
  $('btnDash').hidden = !powers.dash;
  game.start(index, level.world, {
    gems: state.gems[level.id],
    variant: (state.plays[level.id] || 0) % 3, // replays rotate through three layouts
    boss: !!level.boss,
    powers,
    pet: state.pet,
  });
  game.run();
  lastCoins = 0;
  audio.music(level.world, level.boss ? 'boss' : null);
  if (level.boss) audio.sfx('drumroll');
}

function showPrompt(q, step = 0) {
  const el = $('prompt');
  if (!q) { el.hidden = true; return; }
  const box = $('promptShow');
  const show = q.show || {};
  box.classList.toggle('long', !!show.long);
  box.classList.toggle('sounded', !!show.word);
  if (show.word) {
    // a printed word with "sound buttons": a dot under each single sound, a bar under two letters that share one
    box.innerHTML = '';
    for (const part of segment(show.word)) {
      const span = document.createElement('span');
      span.className = part.g.includes('_') ? 'gr split' : part.g.length > 1 ? 'gr pair' : 'gr';
      // a magic-e vowel shows just the vowel here; its silent e is added at the end
      span.textContent = part.g.includes('_') ? show.word[part.at[0]] : show.word.slice(part.at[0], part.at[part.at.length - 1] + 1);
      box.append(span);
    }
    const last = segment(show.word).find((p) => p.g.includes('_'));
    if (last) { const e = document.createElement('span'); e.className = 'gr silent'; e.textContent = 'e'; box.append(e); }
  } else if (show.slots) {
    box.innerHTML = '';
    box.append(`${show.emoji} `);
    show.slots.forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = `slot ${i < step ? 'in' : ''}`;
      span.textContent = i < step ? ch : '';
      box.append(span);
    });
  } else box.textContent = show.emoji || show.text || '';
  if (step) return; // just filling in a letter: no need to replay the entrance
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth; // restart the drop-in animation
  el.style.animation = '';
}

// Tapping the prompt repeats it. On a printed word it sounds the word out instead:
// each sound in turn, never the whole word, so the blending is still his to do.
$('prompt').addEventListener('click', () => {
  const q = game.active?.q;
  if (!q) return;
  if (q.show?.word && canSound(q.soundOut)) audio.play(q.soundOut.flatMap((id, i) => (i ? [{ pause: 350 }, { s: id }] : [{ s: id }])));
  else audio.play(promptScript(q));
});

function finishLevel(r) {
  const level = LEVELS[current];
  const stars = r.firstTry >= r.right - 1 ? 3 : r.firstTry >= r.right / 2 ? 2 : 1;
  lastResult = { ...r, stars };
  const power = level.boss && !state.done[level.id] ? POWERS[level.world] : null;
  state.plays[level.id] = (state.plays[level.id] || 0) + 1;
  state.coins += r.coins;
  state.done[level.id] = Math.max(state.done[level.id] || 0, stars);
  const old = state.gems[level.id] || [false, false, false];
  state.gems[level.id] = old.map((g, i) => g || r.gems[i]);
  state.rescued = state.rescued || {};
  for (const l of r.rescued || []) state.rescued[l] = (state.rescued[l] || 0) + 1;
  doneCritters = [...(r.rescued || [])];
  store.save(state);

  $('doneCoins').textContent = r.coins;
  [...$('doneGems').children].forEach((el, i) => el.classList.toggle('on', r.gems[i]));
  const starEls = [...$('doneStars').children];
  starEls.forEach((el) => el.classList.remove('on'));
  $('done').hidden = false;
  setTimeout(() => starEls.forEach((el, i) => el.classList.toggle('on', i < stars)), 150);
  audio.music(null);
  const bonusAfter = BONUSES.find((b) => b.after === current);
  $('btnBonus').hidden = !bonusAfter;
  if (bonusAfter) $('btnBonus').textContent = MINI.find((g) => g.id === bonusAfter.game).icon;
  const bonusNews = bonusAfter && !(state.bonus || {})[bonusAfter.id] ? ['A bonus game is open!'] : [];
  $('donePower').hidden = !power;
  if (power) {
    $('donePowerIcon').textContent = power.icon;
    $('donePowerName').textContent = power.name;
    audio.sfx('power');
    say(power.say);
  } else {
    const freed = doneCritters.length;
    say([...cheer(true), freed ? `You freed ${freed} letter${freed > 1 ? 's' : ''}! They are going home to the village.` : `You got ${r.coins} coins.`, ...bonusNews]);
  }
}

// The letters freed in the level dance on the level-end card.
let doneCritters = [];
function drawDoneCritters(t) {
  const c = $('doneCritters');
  c.hidden = !doneCritters.length;
  if (!doneCritters.length || !c.offsetParent) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  const n = doneCritters.length;
  const gap = Math.min(80, (c.width - 50) / n);
  doneCritters.forEach((l, i) => {
    drawCritter(ctx, c.width / 2 + (i - (n - 1) / 2) * gap, c.height - 6, l, t + i * 0.37, { size: 1.25, hop: 14, facing: i % 2 ? -1 : 1 });
  });
}

$('btnNext').onclick = () => {
  audio.sfx('tap');
  // carry on to the next level if it is open, otherwise practice where he is weakest
  const next = current + 1;
  startLevel(next < LEVELS.length && store.isUnlocked(state, next) ? next : store.nextLevelIndex(state));
};
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
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pause(true); minis.stop(); } else if (screen === 'mini' && $('miniDone').hidden) minis.run();
});
window.addEventListener('resize', () => {
  if (game.lv) game.resize();
  if (!game.running && game.lv) game.render();
  if (screen === 'mini' && minis.kind) minis.resize();
});

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
hold($('btnDash'), 'dash');

const KEYS = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'jump', w: 'jump', ' ': 'jump', Shift: 'dash', x: 'dash' };
window.addEventListener('keydown', (e) => {
  if (screen === 'mini') {
    if (e.key === 'ArrowLeft') minis.keys.left = true;
    if (e.key === 'ArrowRight') minis.keys.right = true;
    return;
  }
  if (screen !== 'play') return;
  if (e.key === 'Escape') pause($('pause').hidden);
  const k = KEYS[e.key];
  if (k) { game.input[k] = true; e.preventDefault(); }
});
window.addEventListener('keyup', (e) => {
  const k = KEYS[e.key];
  if (k) game.input[k] = false;
  if (e.key === 'ArrowLeft') minis.keys.left = false;
  if (e.key === 'ArrowRight') minis.keys.right = false;
});
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
  drawVillage(t);
  drawDoneCritters(t);
  for (const [id, size] of [['titleHero', 3.4], ['shopHero', 3.6]]) {
    const c = $(id);
    if (!c.offsetParent) continue;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    drawHero(ctx, c.width / 2, c.height - 16, size, { color: COLORS[state.color].hex, hat: state.hat, t, facing: Math.sin(t * 0.7) > 0 ? 1 : -1, cheer: id === 'titleHero' && t % 4 < 0.6 });
    if (state.pet !== 'none') {
      ctx.save();
      ctx.translate(c.width / 2 - size * 30, c.height - 16 - size * 34 + Math.sin(t * 4) * 6);
      ctx.scale(size * 0.75, size * 0.75);
      drawPet(ctx, 0, 0, state.pet, t, 1);
      ctx.restore();
    }
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

  // the boss door: fills up as letters and words are mastered
  const gate = store.worldMastery(state, mapWorld);
  const bossLevel = LEVELS.find((l) => l.world === mapWorld && l.boss);
  const beaten = !!state.done[bossLevel.id];
  const open = gate.have >= gate.need || state.unlockAll || beaten;
  $('gate').classList.toggle('open', open);
  $('gateFill').style.width = `${Math.min(100, (100 * gate.have) / gate.need)}%`;
  $('gateText').textContent = open ? '' : `${gate.have} / ${gate.need}`;
  $('gateIcon').textContent = beaten ? '✅' : open ? '👑' : '🔒';
  $('gate').onclick = () => {
    audio.unlock();
    say(beaten ? 'You beat this boss!' : open ? 'The boss door is open!' : `You need ${gate.need - gate.have} more stickers to open the boss door. Keep playing to win them!`);
  };

  const nodes = $('levelNodes');
  nodes.innerHTML = '';
  let n = 0;
  LEVELS.forEach((level, i) => {
    if (level.world !== mapWorld) return;
    n++;
    const open = store.isUnlocked(state, i);
    const b = document.createElement('button');
    b.className = `node ${level.boss ? 'boss' : ''} ${open ? '' : 'locked'} ${i === next && open ? 'next' : ''}`;
    const stars = state.done[level.id] || 0;
    b.innerHTML = `<b>${!open ? '🔒' : level.boss ? '👑' : n}</b><small></small><span class="s">${'⭐'.repeat(stars)}</span>`;
    b.querySelector('small').textContent = level.title;
    b.onclick = () => {
      audio.unlock();
      if (!open) {
        audio.sfx('wrong');
        if (level.boss && state.done[LEVELS[i - 1].id]) $('gate').onclick();
        return;
      }
      audio.sfx('tap');
      startLevel(i);
    };
    nodes.append(b);
    const bi = BONUSES.findIndex((x) => x.after === i);
    if (bi >= 0) {
      const bonus = BONUSES[bi];
      const game = MINI.find((g) => g.id === bonus.game);
      const ready = !!state.done[level.id] || state.unlockAll;
      const bb = document.createElement('button');
      bb.className = `node bonus ${ready ? '' : 'locked'}`;
      bb.setAttribute('aria-label', game.name);
      bb.innerHTML = `<b>${ready ? game.icon : '🔒'}</b><small></small><span class="s">${'⭐'.repeat((state.bonus || {})[bonus.id] || 0)}</span>`;
      bb.querySelector('small').textContent = game.name;
      bb.onclick = () => {
        audio.unlock();
        if (!ready) { audio.sfx('wrong'); say('Finish the level before it to play this bonus game.'); return; }
        audio.sfx('tap');
        startBonus(bi);
      };
      nodes.append(bb);
    }
  });
}

// ---- shop -----------------------------------------------------------------
function shopItem(kind, id, def, preview) {
  const key = `${kind}:${id}`;
  const prize = def.power; // won from a boss instead of bought
  const owned = prize ? store.hasPower(state, prize) : !def.cost || state.owned.includes(key);
  const purse = def.gems ? store.gemBalance(state) : state.coins;
  const b = document.createElement('button');
  b.className = `item ${state[kind] === id ? 'on' : ''} ${!owned && (prize || purse < def.cost) ? 'poor' : ''}`;
  b.setAttribute('aria-label', `${id} ${kind}`);
  b.append(preview);
  if (!owned) {
    const p = document.createElement('span');
    p.className = `price ${def.gems ? 'gem' : ''}`;
    p.innerHTML = prize ? '👑🔒' : def.gems ? `💎 ${def.cost}` : `<span class="coin"></span>${def.cost}`;
    b.append(p);
  }
  b.onclick = () => {
    if (!owned) {
      if (prize || purse < def.cost) {
        audio.sfx('wrong');
        b.classList.add('nope');
        say(prize ? 'Beat the last boss to win this one.' : `You need ${def.cost - purse} more ${def.gems ? 'gems' : 'coins'}.`);
        setTimeout(() => b.classList.remove('nope'), 300);
        return;
      }
      if (def.gems) state.gemsSpent = (state.gemsSpent || 0) + def.cost; else state.coins -= def.cost;
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
  const pets = $('shopPets');
  colors.innerHTML = hats.innerHTML = pets.innerHTML = '';
  for (const [id, c] of Object.entries(COLORS)) {
    const sw = document.createElement('span');
    sw.className = 'sw';
    sw.style.background = c.hex === 'rainbow' ? 'conic-gradient(#ff5d5d, #ffd23f, #7ed957, #4db8ff, #a06cd5, #ff5d5d)' : c.hex;
    colors.append(shopItem('color', id, c, sw));
  }
  for (const [id, h] of Object.entries(HATS)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 112;
    drawHero(cv.getContext('2d'), 56, 100, 1.5, { color: COLORS[state.color].hex, hat: id, t: 0.5 });
    hats.append(shopItem('hat', id, h, cv));
  }
  for (const [id, pet] of Object.entries(PETS)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 112;
    const ctx = cv.getContext('2d');
    if (id === 'none') { ctx.font = '60px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🚫', 56, 78); } else { ctx.translate(56, 60); ctx.scale(2.6, 2.6); drawPet(ctx, 0, 0, id, 0.5, 1); }
    pets.append(shopItem('pet', id, pet, cv));
  }
}

// ---- sticker book ---------------------------------------------------------
const box = (key) => state.mastery[key]?.b || 0;

// ---- letter village --------------------------------------------------------
// Every freed letter moves into its own house. A house stays boarded up until its
// letter is rescued, and gets a gold star once he knows the letter's sound.
const VW = 960;
const VH = 330;
const villageJump = {};
const houseSpot = (i) => ({ x: (i % 13) * (VW / 13) + VW / 26, y: i < 13 ? 150 : 305 });

function drawVillage(t) {
  const c = $('village');
  if (!c || !c.offsetParent) return;
  const ctx = c.getContext('2d');
  const k = c.width / VW;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, '#8fd8ff');
  sky.addColorStop(1, '#e6f8ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#9be38c';
  ctx.beginPath();
  ctx.moveTo(0, 110);
  for (let x = 0; x <= VW; x += 20) ctx.lineTo(x, 104 + Math.sin(x * 0.012) * 10);
  ctx.lineTo(VW, VH); ctx.lineTo(0, VH);
  ctx.fill();
  ctx.fillStyle = '#e8d3a5'; // the two streets
  ctx.fillRect(0, 150, VW, 12);
  ctx.fillRect(0, 305, VW, 12);
  const rescued = state.rescued || {};
  Object.keys(LETTERS).forEach((l, i) => {
    const { x, y } = houseSpot(i);
    const home = (rescued[l] || 0) > 0;
    const star = box(`s:${l}`) >= store.MASTERED;
    // house
    ctx.fillStyle = home ? critterColor(l).replace('58%)', '82%)') : '#c9cfdc';
    ctx.fillRect(x - 26, y - 92, 52, 44);
    ctx.fillStyle = home ? critterColor(l).replace('58%)', '40%)') : '#9aa3b8';
    ctx.beginPath(); ctx.moveTo(x - 33, y - 90); ctx.lineTo(x, y - 118); ctx.lineTo(x + 33, y - 90); ctx.fill();
    ctx.fillStyle = home ? '#7a4b2a' : '#8b93a7';
    ctx.fillRect(x - 9, y - 68, 18, 20);
    ctx.fillStyle = home ? '#fffdf5' : '#aab1c2';
    ctx.beginPath(); ctx.arc(x, y - 80, 8, 0, 7); ctx.fill();
    ctx.fillStyle = home ? '#26314f' : '#8b93a7';
    ctx.font = '700 14px Andika, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(l, x, y - 80);
    if (!home) {
      // boarded up until its letter comes home
      ctx.strokeStyle = '#7d6a55';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 24, y - 86); ctx.lineTo(x + 24, y - 54); ctx.moveTo(x + 24, y - 86); ctx.lineTo(x - 24, y - 54); ctx.stroke();
    }
    if (star) { ctx.font = '18px sans-serif'; ctx.fillText('⭐', x, y - 124); }
    if (home) {
      const j = Math.max(0, 1 - (t - (villageJump[l] || -9)) * 2);
      const wander = Math.sin(t * 0.6 + i * 1.7) * 14;
      ctx.save();
      ctx.translate(0, -Math.sin(j * Math.PI) * 40);
      drawCritter(ctx, x + wander, y - 2, l, t, { size: 0.78, hop: 3, facing: Math.cos(t * 0.6 + i * 1.7) > 0 ? 1 : -1 });
      ctx.restore();
      if (rescued[l] > 1) {
        ctx.fillStyle = '#26314f';
        ctx.beginPath(); ctx.arc(x + 24, y - 92, 10, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.fillText(Math.min(99, rescued[l]), x + 24, y - 91);
      }
    }
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

$('village')?.addEventListener('click', (e) => {
  const c = $('village');
  const r = c.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * VW;
  const y = ((e.clientY - r.top) / r.height) * VH;
  let best = -1;
  let bestD = 60;
  Object.keys(LETTERS).forEach((l, i) => {
    const h = houseSpot(i);
    const d = Math.hypot(h.x - x, h.y - 50 - y);
    if (d < bestD) { bestD = d; best = i; }
  });
  if (best < 0) return;
  const l = Object.keys(LETTERS)[best];
  const info = LETTERS[l];
  audio.unlock();
  if (!(state.rescued || {})[l]) { audio.play(['This house is waiting for', { name: l }, 'Free it in a level!']); return; }
  villageJump[l] = performance.now() / 1000;
  audio.sfx('free');
  audio.play(audio.hasSound(soundOf(l)) ? [{ name: l }, 'says', { s: soundOf(l) }, `${info.word}.`] : [{ name: l }, `${info.word}.`]);
});

function sizeVillage() {
  const c = $('village');
  const w = Math.min(960, c.parentElement.clientWidth || 960);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.style.width = `${w}px`;
  c.style.height = `${(w * VH) / VW}px`;
  c.width = Math.round(w * dpr);
  c.height = Math.round(((w * VH) / VW) * dpr);
}
window.addEventListener('resize', () => { if (screen === 'album') sizeVillage(); });

function renderAlbum() {
  sizeVillage();
  const home = Object.keys(state.rescued || {}).length;
  $('villageCount').textContent = `${home} / 26 letters home`;
  const wordsEl = $('albumWords');
  wordsEl.innerHTML = '';
  // sight words: every one has a place waiting, so he can see what is left to win
  for (const w of SIGHT_WORDS) {
    const got = box(`x:${w}`) >= store.MASTERED;
    const b = document.createElement('button');
    b.className = `sticker sight ${got ? 'got' : ''}`;
    const heart = HEART[w] || [];
    b.innerHTML = `<span>${[...w].map((ch, i) => (got && heart.includes(i) ? `<i>${ch}</i>` : ch)).join('')}</span>`;
    b.onclick = () => { audio.unlock(); say(w); };
    wordsEl.append(b);
  }
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
    return { n: `name of ${item.toUpperCase()}`, s: `sound of ${item}`, p: `sounds in ${item}`, b: `blending ${item}`, e: `spelling ${item}`, w: `reading ${item}`, x: item }[p] || null;
  };
  const tricky = Object.keys(m).filter((k) => m[k].s >= 2 && m[k].b === 0).map(label).filter(Boolean);
  const sightTotal = new Set(LEVELS.filter((l) => l.poolKind === 'sight').flatMap((l) => l.pool)).size;
  const wordTotal = new Set(LEVELS.filter((l) => l.poolKind === 'word' && l.world >= 2).flatMap((l) => l.pool)).size;
  const spellTotal = new Set(LEVELS.flatMap((l) => (l.poolKind === 'spell' ? l.pool : l.pools.build || []))).size;

  $('parentBody').innerHTML = `
    <section id="studio"></section>
    <section>
      <h3>How it teaches</h3>
      <p>The game follows systematic phonics, the sounding-out method: first the <b>sound</b> each letter makes, a few letters at a time; then <b>blending</b> sounds into words (s-a-t, sat) and <b>hearing</b> the sounds inside words; then reading and <b>spelling</b> words made only of sounds already taught. </p>
      <p><b>Sight words</b> (the, said, was ...) start as soon as he can blend: six new ones at a time, two sets per world, 48 in all. Once taught they keep coming back in every later level. Letters that break the rules are shown in red; the rest of the word is still sounded out.</p>
      <p>On any printed word he can tap the word to hear its sounds one by one. It never says the whole word for him.</p>
    </section>
    <section>
      <h3>What has been learned</h3>
      ${meter('Letter sounds', count('s:'), 26 + 10)}
      ${meter('Letter names', count('n:'), 26)}
      ${meter('Blending', count('b:'), 38)}
      ${meter('Spelling', count('e:'), spellTotal)}
      ${meter('Words read alone', count('w:'), wordTotal)}
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
        const g = store.worldMastery(state, i);
        return meter(`${w.icon} ${w.name}`, g.have, g.total);
      }).join('')}
      <p>Each world ends with a boss. Its door opens once 80% of that world's sounds or words, including its sight words, are learned, so he replays levels (each has three layouts) until they stick. Beating the boss opens the next world and wins a new power: double jump, dash, coin magnet, bubble shield.</p>
      <label><input type="checkbox" id="optUnlock" ${state.unlockAll ? 'checked' : ''}> Unlock every level and power (to start further along)</label>
    </section>
    <section>
      <h3>Sound</h3>
      <label><input type="checkbox" data-set="voice" ${state.settings.voice ? 'checked' : ''}> Speaking voice</label>
      <label><input type="checkbox" data-set="sfx" ${state.settings.sfx ? 'checked' : ''}> Sound effects</label>
      <label><input type="checkbox" data-set="music" ${state.settings.music ? 'checked' : ''}> Music</label>
      <label>His name <input id="optName" type="text" maxlength="20" autocomplete="off" placeholder="For &quot;Great job, ___!&quot;" value=""></label>
      <button class="plain" id="optTest">Test the voice</button>
      <p>The voice is the device's built-in one. If it is silent, check the mute switch and volume.</p>
    </section>
    <section>
      <h3>Start over</h3>
      <button class="plain danger" id="optReset">Erase all progress</button>
    </section>`;

  renderStudio();
  $('optUnlock').onchange = (e) => { state.unlockAll = e.target.checked; store.save(state); };
  document.querySelectorAll('[data-set]').forEach((el) => {
    el.onchange = () => {
      state.settings[el.dataset.set] = el.checked;
      Object.assign(audio.settings, state.settings);
      store.save(state);
    };
  });
  $('optName').value = state.settings.kidName || '';
  $('optName').onchange = (e) => {
    state.settings.kidName = e.target.value.trim();
    audio.settings.kidName = state.settings.kidName;
    store.save(state);
  };
  $('optTest').onclick = () => { audio.unlock(); audio.play(['Find the letter', { name: 'a' }, { cheer: true }, { kid: true }]); };
  $('optReset').onclick = (e) => {
    // Two taps instead of a browser dialog, which some app views never show.
    if (!e.target.dataset.sure) { e.target.dataset.sure = '1'; e.target.textContent = 'Tap again to erase coins, stars and learning progress'; return; }
    state = store.reset();
    Object.assign(audio.settings, state.settings);
    show('parent');
  };
}

// ---- recording the letter sounds ------------------------------------------
// The tablet's voice cannot say a pure "mmm", so a grown-up records each sound once.
const SOUND_LABEL = { k: 'c k ck', qu: 'qu', ai: 'ai a_e', ee: 'ee ea', ie: 'i_e', oa: 'oa o_e', ue: 'u_e', oo: 'oo (moon)', uu: 'oo (book)' };
const soundLabel = (id) => SOUND_LABEL[id] || id;
let studioTab = 'sounds';
let studioAt = null;   // clip being recorded
let studioMsg = '';

// Everything a grown-up can record: the 39 speech sounds, and (optionally) the 26 letter names.
const STUDIO = {
  sounds: {
    ids: Object.keys(SOUNDS),
    label: soundLabel,
    tip: (id) => `<p><b>Say:</b> ${SOUNDS[id].tip}</p><p class="eg">${SOUNDS[id].emoji} as at the ${SOUNDS[id].pos} of <b>${SOUNDS[id].word}</b>. Say only the sound, once, right after you tap.</p>`,
  },
  cheers: {
    ids: ['kidname', ...audio.CHEERS.map((_, i) => `cheer:${i}`)],
    label: (id) => (id === 'kidname' ? 'His name' : `“${audio.CHEERS[Number(id.slice(6))]}”`),
    tip: (id) => (id === 'kidname'
      ? '<p><b>Say his name</b>, the way you would call him.</p><p class="eg">The game uses it now and then: "Great job, ___!"</p>'
      : `<p><b>Say a cheer</b>, like "${audio.CHEERS[Number(id.slice(6))]}", or anything you like to say when he gets it right.</p><p class="eg">One of your cheers is picked at random each time he answers right.</p>`),
  },
  names: {
    ids: Object.keys(LETTERS).map((l) => `name:${l}`),
    label: (id) => `${id.slice(5).toUpperCase()} ${id.slice(5)}`,
    tip: (id) => `<p><b>Say the name of the letter ${id.slice(5).toUpperCase()}</b>, as in the alphabet song.</p><p class="eg">Your recording replaces the tablet's voice wherever the game names this letter.</p>`,
  },
};

function renderStudio() {
  const el = $('studio');
  if (!el) return;
  const tab = STUDIO[studioTab];
  const { ids } = tab;
  const done = ids.filter(audio.hasSound).length;
  if (!ids.includes(studioAt)) studioAt = ids.find((id) => !audio.hasSound(id)) || ids[0];
  const soundsLeft = STUDIO.sounds.ids.filter((id) => !audio.hasSound(id)).length;
  const intro = studioTab === 'cheers'
    ? 'Optional, and kids love it. Record his name and a few cheers in your voice, and the game uses them when he gets answers right. Until then the tablet\'s voice cheers instead.'
    : studioTab === 'names'
    ? 'Optional. The tablet\'s voice says letter names, but some voices get one wrong. Record any letter here and your voice is used for it instead.'
    : soundsLeft ? '<b>Please do this first.</b> Sounding out needs real letter sounds, and the tablet\'s voice can only say letter names. Until a sound is recorded, the game falls back to key words ("the first sound in moon") and cannot do blending. It takes about five minutes.'
      : 'All sounds are recorded. Tap any one to hear it or record it again.';
  el.innerHTML = `
    <h3>Your voice <em class="count ${done === ids.length ? 'ok' : ''}">${done} / ${ids.length} recorded</em></h3>
    <div class="tabs2">
      <button data-tab="sounds" class="${studioTab === 'sounds' ? 'on' : ''}">Letter sounds</button>
      <button data-tab="names" class="${studioTab === 'names' ? 'on' : ''}">Letter names</button>
      <button data-tab="cheers" class="${studioTab === 'cheers' ? 'on' : ''}">Cheers &amp; his name</button>
    </div>
    <p>${intro}</p>
    <div class="recorder">
      <div class="big ${studioTab === 'cheers' ? 'small' : ''}">${tab.label(studioAt)}</div>
      <div class="how">
        ${tab.tip(studioAt)}
        <div>
          <button class="plain rec" id="recGo">● Record</button>
          <button class="plain" id="recPlay" ${audio.hasSound(studioAt) ? '' : 'disabled'}>▶ Listen</button>
          <button class="plain" id="recDel" ${audio.hasSound(studioAt) ? '' : 'disabled'}>Remove</button>
          <button class="plain" id="recNext">Next →</button>
        </div>
        <p class="msg" id="recMsg">${studioMsg}</p>
      </div>
    </div>
    <div class="soundgrid">${ids.map((id) => `<button data-snd="${id}" class="${audio.hasSound(id) ? 'ok' : ''} ${id === studioAt ? 'at' : ''}">${tab.label(id)}</button>`).join('')}</div>`;
  studioMsg = '';

  const next = () => {
    const i = ids.indexOf(studioAt);
    studioAt = [...ids.slice(i + 1), ...ids.slice(0, i + 1)].find((id) => !audio.hasSound(id)) || ids[(i + 1) % ids.length];
    renderStudio();
  };
  $('recNext').onclick = next;
  $('recDel').onclick = async () => { await audio.deleteClip(studioAt); studioMsg = 'Removed.'; renderStudio(); };
  el.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { studioTab = b.dataset.tab; studioAt = null; renderStudio(); }; });
  $('recPlay').onclick = () => { audio.unlock(); audio.play([{ s: studioAt }]); };
  el.querySelectorAll('[data-snd]').forEach((b) => {
    b.onclick = () => { studioAt = b.dataset.snd; renderStudio(); audio.unlock(); if (audio.hasSound(studioAt)) audio.play([{ s: studioAt }]); };
  });
  $('recGo').onclick = async () => {
    const btn = $('recGo');
    try {
      audio.hush();
      await audio.openMic();
      btn.classList.add('live');
      btn.textContent = '● Listening…';
      const heard = await audio.record(studioAt, studioTab === 'cheers' ? 2800 : 1800);
      if (heard) {
        studioMsg = 'Saved. Playing it back. If it has an "uh" on the end, record it again.';
        renderStudio();
        audio.play([{ s: studioAt }]);
      } else {
        studioMsg = 'Nothing was heard. Try again a little louder.';
        renderStudio();
      }
    } catch (err) {
      studioMsg = `The microphone is not available here (${err.message || err.name}). Open the game in the Android app or a normal browser tab and allow the microphone when asked.`;
      renderStudio();
    }
  };
}

// A nudge on the title screen until the sounds are recorded.
function updateNudge() {
  const missing = Object.keys(SOUNDS).filter((id) => !audio.hasSound(id)).length;
  $('btnParent').textContent = missing ? '🎙 Grown-ups: record the letter sounds (hold here)' : 'Grown-ups: hold here';
}
audio.loadClips().then(updateNudge);

// ---- offline support ------------------------------------------------------
// (Not needed inside the Android app, where the files are already on the device.)
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.Capacitor) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* the game works without it */ });
}

// Handles for automated play-testing.
window.__k = { game, minis, startLevel, startBonus, LEVELS, BONUSES, audio, get state() { return state; } };
