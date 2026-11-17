// Bonus mini-games: short, touch-first breaks from the platformer that still practise reading.
//   train   Letter Train   sound cars roll past faster and faster until the sounds blend into a word
//   pop     Grump Pop      Grumps pop out of holes holding answers; tap the right one
//   cart    Mine Cart      ride the rails and pick the track whose sign is the answer
//   rocket  Rocket Ride    fly up and catch the letters that spell the word, in order
import { THEMES, FONT } from './game.js';
import { drawHero } from './hero.js';
import { segment } from './sounds.js';

const VW = 1024;
const VH = 576;
const ROUNDS = { train: 5, pop: 8, cart: 8, rocket: 4 };
const EX = 700; // backgrounds reach this far past the play area, so any screen shape is filled

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (k) => k * k * (3 - 2 * k);

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** An answer's letter, word or picture, centered and shrunk to fit. */
function drawLabel(ctx, choice, cx, cy, w, big = 1) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#26314f';
  if (choice.kind === 'emoji') {
    ctx.font = `${44 * big}px sans-serif`;
    ctx.fillText(choice.label, cx, cy + 2);
    return;
  }
  let size = (choice.kind === 'letter' ? 50 : 38) * big;
  ctx.font = `700 ${size}px ${FONT}`;
  while (ctx.measureText(choice.label).width > w - 16 && size > 16) { size -= 2; ctx.font = `700 ${size}px ${FONT}`; }
  if (choice.heart?.length) {
    let lx = cx - ctx.measureText(choice.label).width / 2;
    ctx.textAlign = 'left';
    [...choice.label].forEach((ch, i) => {
      ctx.fillStyle = choice.heart.includes(i) ? '#e11d48' : '#26314f';
      ctx.fillText(ch, lx, cy);
      lx += ctx.measureText(ch).width;
    });
    ctx.textAlign = 'center';
  } else ctx.fillText(choice.label, cx, cy);
}

/**
 * hooks: question(avoidItem) -> q, onAnswer(q, right), ask(q), say(script), praise(q),
 *        wrong(q, choice), sound(soundId), hasSound(soundId), sfx(name),
 *        onHud({ coins, round, total }), onComplete({ coins, firstTry, total })
 */
export class Minis {
  constructor(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.running = false;
    this.auto = false; // the test bot plays by itself
    this.look = { color: '#4db8ff', hat: 'none' };
    this.keys = { left: false, right: false };
    this._frame = this._frame.bind(this);
    const toView = (e) => {
      const r = canvas.getBoundingClientRect();
      const dpr = canvas.width / (r.width || 1);
      return { x: ((e.clientX - r.left) * dpr - this.offX) / this.scale, y: ((e.clientY - r.top) * dpr - this.offY) / this.scale };
    };
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch { /* fine */ }
      const p = toView(e);
      this.pointer = p;
      if (this.state === 'play') this._tap(p.x, p.y);
    });
    canvas.addEventListener('pointermove', (e) => { if (this.pointer) this.pointer = toView(e); });
    const up = () => { this.pointer = null; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  start(kind, world) {
    this.kind = kind;
    this.world = world;
    this.theme = THEMES[world % THEMES.length];
    this.t = 0;
    this.acc = 0;
    this.state = 'play';
    this.round = -1;
    this.total = ROUNDS[kind];
    this.coins = 0;
    this.firstTry = 0;
    this.q = null;
    this.particles = [];
    this.popups = [];
    this.timers = [];
    this.pointer = null;
    this.reported = false;
    this.resize();
    GAMES[kind].init(this);
    this._next();
  }

  // ---- loop ------------------------------------------------------------
  run() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this._frame);
  }

  stop() { this.running = false; }

  _frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    while (this.acc >= 1 / 120) { this.step(1 / 120); this.acc -= 1 / 120; }
    this.render();
    requestAnimationFrame(this._frame);
  }

  resize() {
    const c = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round((c.clientWidth || VW) * dpr);
    c.height = Math.round((c.clientHeight || VH) * dpr);
    this.scale = Math.min(c.width / VW, c.height / VH);
    this.offX = (c.width - VW * this.scale) / 2;
    this.offY = (c.height - VH * this.scale) / 2;
  }

  after(sec, fn) { this.timers.push({ at: this.t + sec, fn }); }

  step(dt) {
    this.t += dt;
    const due = this.timers.filter((x) => x.at <= this.t);
    this.timers = this.timers.filter((x) => x.at > this.t);
    for (const x of due) x.fn();
    if (this.state === 'play' || this.state === 'between') GAMES[this.kind].step(this, dt);
    for (const p of this.particles) { p.life -= dt; p.vy += (p.g ?? 700) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.popups = this.popups.filter((p) => this.t - p.t < 1.1);
    if (this.state === 'over' && !this.reported && this.t - this.overT > 1.2) {
      this.reported = true;
      this.hooks.onComplete?.({ coins: this.coins, firstTry: this.firstTry, total: this.total });
    }
  }

  // ---- shared round logic ---------------------------------------------
  _next() {
    this.round++;
    this._hud();
    if (this.round >= this.total) {
      this.state = 'over';
      this.overT = this.t;
      this.hooks.sfx?.('win');
      for (let i = 0; i < 40; i++) this.spark(VW / 2, VH / 2, `hsl(${i * 37} 90% 60%)`, 1, 460);
      return;
    }
    const prev = this.q?.item;
    this.q = this.hooks.question(prev);
    this.missed = false;
    this.state = 'play';
    GAMES[this.kind].round(this);
  }

  /** A right answer: coins, praise, and the next round after `delay` seconds. */
  right(x, y, delay = 1.4) {
    const q = this.q;
    if (!this.missed) this.firstTry++;
    this.hooks.onAnswer?.(q, !this.missed);
    const n = this.missed ? 2 : 5;
    this.coins += n;
    this.popups.push({ x, y: y - 30, text: `+${n}`, t: this.t, color: '#ffd23f' });
    this.hooks.sfx?.('right');
    this.hooks.praise?.(q);
    for (let i = 0; i < 22; i++) this.spark(x, y, i % 2 ? '#ffe066' : '#7ee081', 1, 380);
    this.state = 'between';
    this._hud();
    this.after(delay, () => this._next());
  }

  /** A wrong answer: recorded once per round, and the voice says what was picked. */
  wrong(choice) {
    if (!this.missed) this.hooks.onAnswer?.(this.q, false);
    this.missed = true;
    this.hooks.sfx?.('wrong');
    this.hooks.wrong?.(this.q, choice);
  }

  spark(x, y, color, n = 1, speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, life: 0.5 + Math.random() * 0.4, color, size: 3 + Math.random() * 4 });
    }
  }

  _hud() { this.hooks.onHud?.({ coins: this.coins, round: Math.min(this.round, this.total), total: this.total }); }

  _tap(x, y) {
    // the speech bubble at the top repeats the question
    if (this.q && this.bubble && Math.abs(x - VW / 2) < this.bubble.w / 2 && y < this.bubble.h + 20) {
      this.hooks.ask?.(this.q);
      return;
    }
    GAMES[this.kind].tap(this, x, y);
  }

  // ---- drawing ---------------------------------------------------------
  render() {
    const { ctx, theme } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = theme.sky[0];
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offX, this.offY);
    ctx.save();
    GAMES[this.kind].draw(this, ctx);
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const p of this.popups) {
      const k = (this.t - p.t) / 1.1;
      ctx.globalAlpha = 1 - k;
      ctx.font = `700 34px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#26314f';
      ctx.strokeText(p.text, p.x, p.y - k * 50);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y - k * 50);
    }
    ctx.globalAlpha = 1;
    this._drawProgress(ctx);
    ctx.restore();
  }

  sky(ctx, top, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, top || this.theme.sky[0]);
    g.addColorStop(1, bottom || this.theme.sky[1]);
    ctx.fillStyle = top || this.theme.sky[0];
    ctx.fillRect(-EX, -EX, VW + EX * 2, EX);
    ctx.fillStyle = g;
    ctx.fillRect(-EX, 0, VW + EX * 2, VH + EX);
  }

  hills(ctx, base, scroll = 0) {
    for (const [color, par, amp, off, f] of [[this.theme.far, 0.2, 50, 140, 0.006], [this.theme.near, 0.4, 34, 70, 0.011]]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-EX, VH + EX);
      for (let x = -EX; x <= VW + EX; x += 20) {
        const wx = x + scroll * par;
        ctx.lineTo(x, base - off - Math.sin(wx * f) * amp - Math.sin(wx * f * 2.3 + 1) * amp * 0.4);
      }
      ctx.lineTo(VW + EX, VH + EX);
      ctx.fill();
    }
  }

  /** The question bubble at the top: what to look at, and a speaker to hear it again. */
  drawBubble(ctx, show, extra) {
    ctx.font = `700 52px ${FONT}`;
    let content = 0;
    if (show?.slots) content = 70 + show.slots.length * 54;
    else if (show?.emoji) content = 70;
    else if (show?.text || show?.word) {
      ctx.font = `700 ${show.long ? 32 : 52}px ${FONT}`;
      content = ctx.measureText(show.text || show.word).width + 10;
    }
    const w = Math.min(VW - 120, 90 + content);
    const h = 84;
    this.bubble = { w, h };
    const x = VW / 2 - w / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    rr(ctx, x, 18, w, h, 24);
    ctx.fill();
    ctx.fillStyle = '#fffdf5';
    rr(ctx, x, 12, w, h, 24);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔊', x + 18, 55 + Math.sin(this.t * 4) * 2);
    let cx = x + 70;
    if (show?.slots) {
      ctx.font = '48px sans-serif';
      ctx.fillText(show.emoji, cx, 56);
      cx += 70;
      show.slots.forEach((ch, i) => {
        const filled = i < (extra?.step || 0);
        ctx.fillStyle = filled ? '#2f9a3a' : '#f59e0b';
        ctx.fillRect(cx + i * 54, 82, 44, 6);
        if (filled) {
          ctx.fillStyle = '#2f9a3a';
          ctx.font = `700 48px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.fillText(ch, cx + i * 54 + 22, 54);
          ctx.textAlign = 'left';
        }
      });
    } else if (show?.emoji) {
      ctx.font = '50px sans-serif';
      ctx.fillText(show.emoji, cx, 57);
    } else if (show?.text || show?.word) {
      ctx.fillStyle = '#26314f';
      ctx.font = `700 ${show.long ? 32 : 52}px ${FONT}`;
      ctx.fillText(show.text || show.word, cx, 54);
    }
  }

  _drawProgress(ctx) {
    // one dot per round, top right
    for (let i = 0; i < this.total; i++) {
      const x = VW - 30 - (this.total - 1 - i) * 26;
      ctx.fillStyle = i < this.round ? '#ffd23f' : i === this.round ? '#fffdf5' : 'rgba(255,255,255,0.35)';
      ctx.strokeStyle = '#26314f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, 30, i === this.round ? 10 : 8, 0, 7);
      ctx.fill();
      ctx.stroke();
    }
  }
}

// ======================================================================
// Letter Train: the word's sound cars roll past, faster each time, until the
// separate sounds run together into the word. Then pick its picture.
// ======================================================================
const TRAIN_Y = 372;
const CAR_W = 104;
const ENGINE_W = 140;
const PASS_SPEED = [170, 330, 620]; // the sound cars cross the bell slower, then faster: m...a...p, m.a.p, map
const CRUISE = 700;                   // speed on the way in and out, when nothing is being sounded

const train = {
  init(m) { m.tr = { cars: [], x: -400, v: 0 }; },

  round(m) {
    const q = m.q;
    const tr = m.tr;
    tr.cars = segment(q.item).map((p) => ({ label: p.g.replace('_', '-'), s: p.s, flash: -9, sounded: false }));
    tr.len = ENGINE_W + tr.cars.length * (CAR_W + 10);
    tr.voiced = tr.cars.every((c) => m.hooks.hasSound?.(c.s));
    tr.pass = 0;
    tr.passes = tr.voiced ? PASS_SPEED.length : 1;
    tr.x = -tr.len - 40; // x of the back of the last car; the engine leads on the right
    tr.v = 0;
    tr.phase = 'wait';
    tr.picked = [];
    tr.leave = false;
    m.hooks.say?.(tr.voiced ? 'Listen to the train!' : 'Read the train!');
    m.after(1.2, () => { tr.phase = 'pass'; tr.v = CRUISE; });
  },

  step(m, dt) {
    const tr = m.tr;
    if (tr.phase === 'pass' || tr.phase === 'arrive' || tr.leave) {
      tr.x += tr.v * dt;
      if (Math.random() < tr.v / 2500) m.hooks.sfx?.('chug');
      if (Math.random() < 0.3) m.particles.push({ x: tr.x + tr.len - 34, y: TRAIN_Y - 128, vx: -tr.v * 0.3 - 20, vy: -60, life: 0.9, color: 'rgba(255,255,255,0.8)', size: 8 + Math.random() * 6, g: -20 });
    }
    // each car plays its sound as it crosses the middle of the screen
    tr.cars.forEach((c, i) => {
      const cx = tr.x + (tr.cars.length - 1 - i) * (CAR_W + 10) + CAR_W / 2;
      if (!c.sounded && tr.phase === 'pass' && cx >= VW / 2) {
        c.sounded = true;
        c.flash = m.t;
        if (tr.voiced) m.hooks.sound?.(c.s);
      }
    });
    if (tr.phase === 'pass') {
      // cruise in, slow to this pass's speed while the cars cross the bell, then cruise out
      const carX = (i) => tr.x + (tr.cars.length - 1 - i) * (CAR_W + 10) + CAR_W / 2;
      const sounding = carX(0) > VW / 2 - 150 && !tr.cars[tr.cars.length - 1].sounded;
      const want = sounding ? PASS_SPEED[tr.pass] : CRUISE;
      tr.v += (want - tr.v) * Math.min(1, (sounding ? 9 : 3) * dt);
    }
    if (tr.phase === 'pass' && tr.x > VW + 40) {
      tr.pass++;
      tr.x = -tr.len - 40;
      for (const c of tr.cars) c.sounded = false;
      if (tr.pass < tr.passes) tr.v = CRUISE;
      else { tr.phase = 'arrive'; tr.v = CRUISE; }
    }
    if (tr.phase === 'arrive') {
      const stopAt = VW / 2 - tr.len / 2;
      tr.v = clamp((stopAt - tr.x) * 2.4, 60, CRUISE);
      if (tr.x >= stopAt - 1) {
        tr.x = stopAt;
        tr.v = 0;
        tr.phase = 'choose';
        tr.chooseT = m.t;
        m.hooks.sfx?.('toot');
        m.hooks.say?.(tr.voiced ? 'What word is it?' : 'Which picture?');
      }
    }
    if (tr.leave) tr.v = Math.min(900, tr.v + 900 * dt);
    if (m.auto && tr.phase === 'choose' && m.t - tr.chooseT > 0.3) train.tap(m, train.choiceX(m, m.q.answer), 500);
  },

  // where picture i sits along the bottom (two pictures sit closer together)
  choiceX(m, i) {
    const k = m.q.choices.length === 2 ? (i === 0 ? 0.5 : 1.5) : i;
    return VW / 2 + (k - 1) * 230;
  },

  tap(m, x, y) {
    const tr = m.tr;
    // tap the train to hear the sounds again
    if (tr.phase === 'choose' && y > TRAIN_Y - 140 && y < TRAIN_Y + 20 && x > tr.x && x < tr.x + tr.len) {
      tr.cars.slice().reverse().forEach((c, i) => {
        m.after(i * 0.55, () => { c.flash = m.t; if (tr.voiced) m.hooks.sound?.(c.s); });
      });
      if (!tr.voiced) m.hooks.say?.('Read the train!');
      return;
    }
    if (tr.phase !== 'choose') return;
    for (let i = 0; i < m.q.choices.length; i++) {
      const cx = train.choiceX(m, i);
      if (Math.abs(x - cx) < 95 && Math.abs(y - 500) < 60 && !tr.picked.includes(i)) {
        if (i === m.q.answer) {
          tr.phase = 'done';
          tr.leave = true;
          tr.v = 120;
          tr.won = i;
          m.hooks.sfx?.('toot');
          m.right(cx, 480, 1.9);
        } else {
          tr.picked.push(i);
          tr.shake = { i, t: m.t };
          m.wrong(m.q.choices[i]);
        }
        return;
      }
    }
  },

  draw(m, ctx) {
    const tr = m.tr;
    m.sky(ctx);
    m.hills(ctx, TRAIN_Y + 20, m.t * 30);
    ctx.fillStyle = m.theme.grass;
    ctx.fillRect(-EX, TRAIN_Y + 14, VW + EX * 2, VH + EX);
    ctx.fillStyle = m.theme.dirt;
    ctx.fillRect(-EX, TRAIN_Y + 30, VW + EX * 2, VH + EX);
    // track
    ctx.fillStyle = '#7a5a3a';
    for (let x = -EX; x < VW + EX; x += 34) ctx.fillRect(x, TRAIN_Y + 4, 18, 12);
    ctx.fillStyle = '#8a8fa3';
    ctx.fillRect(-EX, TRAIN_Y + 2, VW + EX * 2, 5);
    // a little station in the middle, where the sounds are heard
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(VW / 2 - 3, TRAIN_Y - 210, 6, 70);
    ctx.font = '34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔔', VW / 2, TRAIN_Y - 220);

    // the cars (back of the train on the left) then the engine
    const wheel = (x) => {
      ctx.fillStyle = '#26314f';
      ctx.beginPath(); ctx.arc(x, TRAIN_Y - 4, 13, 0, 7); ctx.fill();
      ctx.strokeStyle = '#8a8fa3';
      ctx.lineWidth = 3;
      const a = (tr.x / 13) % (Math.PI * 2);
      ctx.beginPath(); ctx.moveTo(x, TRAIN_Y - 4); ctx.lineTo(x + Math.cos(a) * 10, TRAIN_Y - 4 + Math.sin(a) * 10); ctx.stroke();
    };
    const colors = ['#ff6b6b', '#4db8ff', '#7ed957', '#ffd23f', '#a06cd5'];
    tr.cars.forEach((c, i) => {
      const cx = tr.x + (tr.cars.length - 1 - i) * (CAR_W + 10);
      const lit = m.t - c.flash < 0.45;
      const lift = lit ? Math.sin(((m.t - c.flash) / 0.45) * Math.PI) * 14 : 0;
      ctx.save();
      ctx.translate(0, -lift);
      if (lit) { ctx.fillStyle = 'rgba(255, 236, 120, 0.6)'; ctx.beginPath(); ctx.arc(cx + CAR_W / 2, TRAIN_Y - 60, 70, 0, 7); ctx.fill(); }
      ctx.fillStyle = colors[i % colors.length];
      rr(ctx, cx, TRAIN_Y - 100, CAR_W, 82, 12);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#26314f';
      ctx.stroke();
      ctx.fillStyle = '#fffdf5';
      rr(ctx, cx + 12, TRAIN_Y - 92, CAR_W - 24, 64, 10);
      ctx.fill();
      ctx.restore();
      drawLabel(ctx, { kind: 'letter', label: c.label }, cx + CAR_W / 2, TRAIN_Y - 61 - lift, CAR_W - 24);
      wheel(cx + 24);
      wheel(cx + CAR_W - 24);
      ctx.fillStyle = '#26314f';
      ctx.fillRect(cx + CAR_W, TRAIN_Y - 40, 10, 6);
    });
    const ex = tr.x + tr.len - ENGINE_W;
    ctx.fillStyle = '#e63946';
    rr(ctx, ex, TRAIN_Y - 82, ENGINE_W - 20, 64, 12);
    ctx.fill();
    ctx.fillStyle = '#26314f';
    rr(ctx, ex + ENGINE_W - 30, TRAIN_Y - 60, 26, 42, 6);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    rr(ctx, ex + 6, TRAIN_Y - 140, 56, 60, 8);
    ctx.fill();
    ctx.fillStyle = '#26314f';
    ctx.fillRect(ex + 88, TRAIN_Y - 128, 18, 46);
    drawHero(ctx, ex + 34, TRAIN_Y - 86, 0.9, { ...m.look, t: m.t, facing: 1, cheer: tr.phase === 'done' });
    ctx.fillStyle = 'rgba(160,220,255,0.35)';
    ctx.fillRect(ex + 10, TRAIN_Y - 136, 48, 30);
    wheel(ex + 30);
    wheel(ex + 80);
    wheel(ex + 112);

    // the pictures to pick from
    if (tr.phase === 'choose' || tr.phase === 'done') {
      m.q.choices.forEach((c, i) => {
        const cx = train.choiceX(m, i);
        const out = tr.picked.includes(i);
        const won = tr.phase === 'done' && i === tr.won;
        if (tr.phase === 'done' && !won) return;
        const pop = Math.min(1, (m.t - tr.chooseT) / 0.25);
        const shake = tr.shake?.i === i && m.t - tr.shake.t < 0.3 ? Math.sin((m.t - tr.shake.t) * 60) * 6 : 0;
        ctx.save();
        ctx.translate(cx + shake, 500);
        ctx.scale(pop, pop);
        ctx.fillStyle = won ? '#7ee081' : out ? '#aab0c0' : '#fffdf5';
        rr(ctx, -85, -50, 170, 100, 18);
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = won ? '#2f9a3a' : out ? '#8b91a3' : '#f59e0b';
        ctx.stroke();
        ctx.globalAlpha = out ? 0.4 : 1;
        drawLabel(ctx, c, 0, 0, 150, 1.2);
        ctx.restore();
      });
    }
    m.bubble = null; // the train is the question here
  },
};

// ======================================================================
// Grump Pop: friendly Grumps pop up holding answers. Tap the right one.
// A golden Grump sometimes pops up too: tap it for bonus coins.
// ======================================================================
const HOLES = [[262, 300], [512, 300], [762, 300], [262, 475], [512, 475], [762, 475]];

const pop = {
  init(m) { m.pp = { grumps: [] }; },

  round(m) {
    const pp = m.pp;
    const n = m.q.choices.length;
    pp.stay = Math.max(1.9, 3.4 - m.round * 0.2);
    pp.grumps = Array.from({ length: n }, (_, i) => ({ choice: i, hole: -1, up: 0, phase: 'down', wait: 0.4 + i * 0.35, out: false }));
    pp.gold = { choice: -1, hole: -1, up: 0, phase: 'down', wait: 3 + Math.random() * 3, gold: true };
    pp.solved = false;
    m.hooks.ask?.(m.q);
  },

  freeHole(m) {
    const used = new Set([...m.pp.grumps, m.pp.gold].map((g) => g.hole).filter((h) => h >= 0));
    const free = HOLES.map((_, i) => i).filter((i) => !used.has(i));
    return free[Math.floor(Math.random() * free.length)] ?? -1;
  },

  step(m, dt) {
    const pp = m.pp;
    for (const g of [...pp.grumps, pp.gold]) {
      if (g.phase === 'down') {
        g.wait -= dt;
        if (g.wait <= 0 && !pp.solved && !g.out) {
          const h = pop.freeHole(m);
          if (h >= 0) { g.hole = h; g.phase = 'rise'; g.timer = g.gold ? 1.3 : pp.stay; }
        }
      } else if (g.phase === 'rise') {
        g.up = Math.min(1, g.up + dt * 6);
        if (g.up >= 1) g.phase = 'up';
      } else if (g.phase === 'up') {
        g.timer -= dt;
        if (g.timer <= 0 || pp.solved) g.phase = 'fall';
      } else if (g.phase === 'fall' || g.phase === 'bonked') {
        g.up = Math.max(0, g.up - dt * (g.phase === 'bonked' ? 3 : 5));
        if (g.up <= 0) {
          g.phase = 'down';
          g.hole = -1;
          g.wait = g.gold ? 4 + Math.random() * 4 : 0.3 + Math.random() * 0.8;
        }
      }
    }
    if (m.auto && !pp.solved) {
      const g = pp.grumps.find((x) => x.choice === m.q.answer && x.phase === 'up');
      if (g) pop.tap(m, HOLES[g.hole][0], HOLES[g.hole][1] - 60);
    }
  },

  tap(m, x, y) {
    const pp = m.pp;
    if (pp.solved) return;
    for (const g of [...pp.grumps, pp.gold]) {
      if (g.hole < 0 || g.up < 0.5 || g.phase === 'bonked' || g.phase === 'fall') continue;
      const [hx, hy] = HOLES[g.hole];
      if (Math.abs(x - hx) > 75 || y > hy + 10 || y < hy - 170) continue;
      g.phase = 'bonked';
      g.bonkT = m.t;
      if (g.gold) {
        m.coins += 3;
        m.popups.push({ x: hx, y: hy - 100, text: '+3', t: m.t, color: '#ffd23f' });
        m.hooks.sfx?.('bonk');
        m.hooks.sfx?.('coin');
        m.spark(hx, hy - 60, '#ffe066', 14);
        m._hud();
      } else if (g.choice === m.q.answer) {
        pp.solved = true;
        m.hooks.sfx?.('bonk');
        m.right(hx, hy - 80, 1.3);
      } else {
        g.out = true; // that one stays away for the rest of the round
        m.hooks.sfx?.('raspberry');
        m.wrong(m.q.choices[g.choice]);
      }
      return;
    }
  },

  draw(m, ctx) {
    const pp = m.pp;
    m.sky(ctx);
    m.hills(ctx, 230);
    ctx.fillStyle = m.theme.grass;
    ctx.fillRect(-EX, 200, VW + EX * 2, VH + EX);
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 173) % VW, 210 + ((i * 97) % 360), 30, 4);
    for (const [i, [hx, hy]] of HOLES.entries()) {
      // the hole
      ctx.fillStyle = m.theme.dirt;
      ctx.beginPath(); ctx.ellipse(hx, hy, 82, 26, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b1d12';
      ctx.beginPath(); ctx.ellipse(hx, hy, 66, 18, 0, 0, 7); ctx.fill();
      const g = [...pp.grumps, pp.gold].find((x) => x.hole === i);
      if (!g || g.up <= 0) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(hx - 120, hy - 260, 240, 260); // only the part above the hole shows
      ctx.clip();
      const k = ease(g.up);
      const body = hy + 60 - k * 100;
      const squish = g.phase === 'bonked' ? 0.7 : 1;
      ctx.fillStyle = g.gold ? '#f5b700' : '#2fb5a6';
      rr(ctx, hx - 42, body - 10, 84, 80 * squish, 26);
      ctx.fill();
      // face
      const dazed = g.phase === 'bonked';
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(hx - 15, body + 16, 10, 0, 7); ctx.arc(hx + 15, body + 16, 10, 0, 7); ctx.fill();
      ctx.fillStyle = '#12423d';
      if (dazed) {
        ctx.font = '700 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×', hx - 15, body + 16);
        ctx.fillText('×', hx + 15, body + 16);
      } else {
        ctx.beginPath(); ctx.arc(hx - 13, body + 18, 5, 0, 7); ctx.arc(hx + 17, body + 18, 5, 0, 7); ctx.fill();
      }
      ctx.restore();
      if (g.gold) {
        ctx.font = '30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👑', hx, body - 18);
        continue;
      }
      // the sign it holds up
      if (k > 0.4) {
        const sy = body - 70;
        const a = Math.min(1, (k - 0.4) / 0.4);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#8a6a45';
        ctx.fillRect(hx - 3, sy + 40, 6, 30);
        ctx.fillStyle = dazed && g.choice === m.q.answer ? '#7ee081' : '#fffdf5';
        rr(ctx, hx - 70, sy - 26, 140, 66, 14);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#2fb5a6';
        ctx.stroke();
        drawLabel(ctx, m.q.choices[g.choice], hx, sy + 7, 132);
        ctx.globalAlpha = 1;
      }
    }
    if (m.state === 'play' || m.state === 'between') m.drawBubble(ctx, m.q?.show);
  },
};

// ======================================================================
// Mine Cart: the track splits; each branch has a sign. Tap the sign with the
// answer before the cart reaches the split. The wrong branch is a bumpy ride.
// ======================================================================
const CART_X = 250;
const MID_Y = 380;
const SPLIT = 160;   // length of the curve where the tracks split
const GATE = 520;    // where a branch's tunnel is
const MERGE = 700;   // where the branches join again
const laneYs = (n) => (n === 2 ? [300, 470] : [250, 380, 510]);

const cart = {
  init(m) { m.ct = { d: 0, v: 220, fork: 900, lane: null, y: MID_Y, bump: 0 }; },

  round(m) {
    const ct = m.ct;
    ct.fork = ct.d + 760; // the split, in distance travelled
    ct.lane = null;
    ct.result = null;
    ct.waiting = false;
    ct.asked = false;
    ct.signT = m.t;
  },

  trackY(m, lane, x) {
    // height of a branch at distance x relative to the split
    if (lane == null || x <= 0 || x >= MERGE) return MID_Y;
    const ly = laneYs(m.q.choices.length)[lane];
    if (x < SPLIT) return MID_Y + (ly - MID_Y) * ease(x / SPLIT);
    if (x > MERGE - SPLIT) return ly + (MID_Y - ly) * ease((x - (MERGE - SPLIT)) / SPLIT);
    return ly;
  },

  step(m, dt) {
    const ct = m.ct;
    const rel = ct.d - ct.fork; // where the cart is relative to the split
    if (!ct.asked && rel > -620) { ct.asked = true; m.hooks.ask?.(m.q); }
    // it waits at the split until a sign has been picked
    if (ct.lane == null && rel > -90 && m.state === 'play') {
      if (!ct.waiting) { ct.waiting = true; m.hooks.say?.('Tap a sign to pick a track!'); }
      ct.v = Math.max(0, ct.v - 600 * dt);
    } else ct.v = Math.min(m.state === 'over' ? 320 : 230, ct.v + 300 * dt);
    ct.d += ct.v * dt;
    ct.y = cart.trackY(m, ct.lane, ct.d - ct.fork);
    if (ct.bump > 0) ct.bump -= dt;
    // the branch tunnel decides it
    if (ct.lane != null && !ct.result && ct.d - ct.fork > GATE) {
      const lx = CART_X + 40;
      if (ct.lane === m.q.answer) {
        ct.result = 'right';
        m.hooks.sfx?.('ding');
        m.right(lx, ct.y - 60, 99); // the next round starts at the merge instead
      } else {
        ct.result = 'wrong';
        ct.bump = 1;
        m.hooks.sfx?.('rattle');
        for (let i = 0; i < 16; i++) m.particles.push({ x: lx, y: ct.y, vx: (Math.random() - 0.5) * 300, vy: -200 - Math.random() * 200, life: 0.7, color: '#7a5a3a', size: 4 + Math.random() * 4 });
        m.wrong(m.q.choices[ct.lane]);
      }
    }
    if (ct.result && ct.d - ct.fork > MERGE + 40) {
      m.timers = [];
      if (ct.result === 'wrong') m.state = 'play';
      m._next();
    }
    if (m.auto && ct.lane == null && rel > -500) ct.lane = m.q.answer;
  },

  signPos(m, i) {
    const x = CART_X + (m.ct.fork + 90 - m.ct.d);
    return [x, laneYs(m.q.choices.length)[i] - 72];
  },

  tap(m, x, y) {
    const ct = m.ct;
    if (!m.q || (ct.lane != null && ct.d - ct.fork > 10)) return; // too late to switch once past the split
    for (let i = 0; i < m.q.choices.length; i++) {
      const [sx, sy] = cart.signPos(m, i);
      if (Math.abs(x - sx) < 85 && Math.abs(y - sy) < 60) {
        ct.lane = i;
        ct.waiting = false;
        m.hooks.sfx?.('tap');
        return;
      }
    }
  },

  draw(m, ctx) {
    const ct = m.ct;
    m.sky(ctx, m.theme.sky[0], m.theme.sky[1]);
    m.hills(ctx, 220, ct.d);
    // rocky ground
    ctx.fillStyle = m.theme.dirt2;
    ctx.fillRect(-EX, 200, VW + EX * 2, VH + EX);
    ctx.fillStyle = m.theme.dirt;
    for (let i = 0; i < 18; i++) {
      const x = ((i * 211 - ct.d * 0.9) % (VW + 200) + VW + 200) % (VW + 200) - 100;
      ctx.beginPath(); ctx.ellipse(x, 230 + ((i * 131) % 330), 40, 16, 0, 0, 7); ctx.fill();
    }
    const n = m.q ? m.q.choices.length : 3;
    const drawTrack = (lane, faded) => {
      ctx.globalAlpha = faded ? 0.45 : 1;
      for (let sx = -EX; sx < VW + EX; sx += 26) {
        const rel = ct.d + (sx - CART_X) - ct.fork;
        if (lane != null ? rel < 0 || rel > MERGE : m.q && rel > 0 && rel < MERGE) continue;
        const y = cart.trackY(m, lane, rel);
        ctx.fillStyle = '#5b3d22';
        ctx.fillRect(sx - 4, y - 2, 16, 12);
      }
      ctx.strokeStyle = '#a7adbd';
      ctx.lineWidth = 4;
      for (const off of [-1, 5]) {
        ctx.beginPath();
        let first = true;
        for (let sx = -EX; sx < VW + EX; sx += 10) {
          const rel = ct.d + (sx - CART_X) - ct.fork;
          if (lane != null ? rel < 0 || rel > MERGE : m.q && rel > 0 && rel < MERGE) { first = true; continue; }
          const y = cart.trackY(m, lane, rel) + off;
          if (first) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
          first = false;
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    drawTrack(null, false);
    if (m.q) {
      for (let i = 0; i < n; i++) drawTrack(i, ct.lane != null && ct.lane !== i);
      // tunnels on each branch
      for (let i = 0; i < n; i++) {
        const x = CART_X + (ct.fork + GATE - ct.d);
        const y = laneYs(n)[i];
        const right = ct.result && i === m.q.answer;
        ctx.fillStyle = right ? '#7ee081' : '#4a3a2a';
        ctx.beginPath(); ctx.arc(x, y + 6, 46, Math.PI, 0); ctx.fill();
        ctx.fillStyle = right ? '#c8f7c5' : '#1d140c';
        ctx.beginPath(); ctx.arc(x, y + 6, 32, Math.PI, 0); ctx.fill();
      }
      // the signs
      for (let i = 0; i < n; i++) {
        const [sx, sy] = cart.signPos(m, i);
        const chosen = ct.lane === i;
        const reveal = ct.result === 'wrong' && i === m.q.answer;
        ctx.fillStyle = '#8a6a45';
        ctx.fillRect(sx - 4, sy + 30, 8, 44);
        ctx.fillStyle = reveal ? '#7ee081' : '#fffdf5';
        rr(ctx, sx - 78, sy - 32, 156, 66, 14);
        ctx.fill();
        ctx.lineWidth = chosen ? 7 : 4;
        ctx.strokeStyle = chosen ? '#e11d48' : '#f59e0b';
        ctx.stroke();
        drawLabel(ctx, m.q.choices[i], sx, sy + 1, 146);
        if (ct.lane == null && ct.waiting) {
          ctx.font = '30px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('👆', sx + 60, sy + 34 + Math.sin(m.t * 8) * 5);
        }
      }
    }
    // the cart, with Pip riding in it
    const bump = ct.bump > 0 ? Math.sin(m.t * 50) * 5 : 0;
    const cy = ct.y + bump;
    drawHero(ctx, CART_X, cy - 26, 0.95, { ...m.look, t: m.t, facing: 1, cheer: ct.result === 'right' });
    ctx.fillStyle = '#6b7080';
    ctx.beginPath();
    ctx.moveTo(CART_X - 46, cy - 50); ctx.lineTo(CART_X + 46, cy - 50); ctx.lineTo(CART_X + 36, cy - 6); ctx.lineTo(CART_X - 36, cy - 6);
    ctx.fill();
    ctx.fillStyle = '#9aa0b2';
    ctx.fillRect(CART_X - 50, cy - 56, 100, 10);
    ctx.fillStyle = '#26314f';
    for (const wx of [-22, 22]) { ctx.beginPath(); ctx.arc(CART_X + wx, cy - 4, 10, 0, 7); ctx.fill(); }
    if (ct.v > 150) for (let i = 0; i < 2; i++) ctx.fillRect(CART_X - 70 - i * 26, cy - 30 + i * 12, 18, 3);
    if (m.q && m.state !== 'over') m.drawBubble(ctx, m.q.show);
  },
};

// ======================================================================
// Rocket Ride: hear the word, then steer the rocket to catch its letters in order.
// ======================================================================
const ROCKET_Y = 470;
const LANES = [192, 352, 512, 672, 832];

const rocket = {
  init(m) {
    m.rk = { x: VW / 2, items: [], stars: Array.from({ length: 50 }, (_, i) => ({ x: (i * 197) % VW, y: (i * 89) % VH, s: 1 + (i % 3) })) };
  },

  round(m) {
    const rk = m.rk;
    rk.step = 0;
    rk.items = [];
    rk.spawnT = 1.4;
    rk.sinceNeeded = 0;
    rk.boost = 0;
    rk.speed = 135 + m.round * 18;
    m.hooks.ask?.(m.q);
  },

  needed(m) { return m.q.sequence[m.rk.step]; },

  step(m, dt) {
    const rk = m.rk;
    // steering: hold a finger where the rocket should go, or use the arrow keys
    let target = rk.x;
    if (m.pointer && m.pointer.y > 140) target = m.pointer.x;
    if (m.keys.left) target = rk.x - 400;
    if (m.keys.right) target = rk.x + 400;
    if (m.auto && m.state === 'play') {
      const want = rk.items.filter((it) => it.choice === rocket.needed(m) && !it.gone).sort((a, b) => b.y - a.y)[0];
      if (want) target = want.x;
    }
    rk.x += clamp(target - rk.x, -620 * dt, 620 * dt);
    rk.x = clamp(rk.x, 80, VW - 80);
    for (const s of rk.stars) { s.y += s.s * 40 * dt * (1 + rk.boost * 6); if (s.y > VH) { s.y -= VH; s.x = Math.random() * VW; } }
    if (rk.boost > 0) rk.boost -= dt;
    if (m.state !== 'play') return;

    // new letters (and coins) fall from the top; the needed letter comes along often
    rk.spawnT -= dt;
    if (rk.spawnT <= 0) {
      rk.spawnT = Math.max(0.75, 1.25 - m.round * 0.1);
      const busy = new Set(rk.items.filter((it) => it.y < 120).map((it) => it.lane));
      const lanes = LANES.map((_, i) => i).filter((i) => !busy.has(i));
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      if (lane != null) {
        const roll = Math.random();
        rk.sinceNeeded++;
        let choice;
        if (rk.sinceNeeded >= 2 || roll < 0.45) { choice = rocket.needed(m); rk.sinceNeeded = 0; } else if (roll < 0.75) {
          const others = m.q.choices.map((_, i) => i).filter((i) => i !== rocket.needed(m));
          choice = others[Math.floor(Math.random() * others.length)];
        } else choice = -1; // a coin
        rk.items.push({ lane, x: LANES[lane], y: -40, choice, wob: Math.random() * 6 });
      }
    }
    for (const it of rk.items) {
      if (it.gone) { it.y -= 500 * dt; it.x += it.vx * dt; continue; }
      it.y += rk.speed * dt;
      if (Math.abs(it.y - (ROCKET_Y - 50)) < 46 && Math.abs(it.x - rk.x) < 58) {
        if (it.choice === -1) {
          it.gone = true; it.vx = 0; it.y = -999;
          m.coins += 1;
          m.hooks.sfx?.('coin');
          m._hud();
        } else if (it.choice === rocket.needed(m)) {
          it.gone = true; it.vx = 0; it.y = -999;
          const c = m.q.choices[it.choice];
          m.spark(rk.x, ROCKET_Y - 60, '#7ee081', 12);
          rk.step++;
          if (rk.step >= m.q.sequence.length) {
            rk.boost = 1.4;
            m.hooks.sfx?.('boost');
            m.right(rk.x, ROCKET_Y - 100, 2);
          } else {
            m.hooks.sfx?.('catch');
            if (m.hooks.hasSound?.(c.sound)) m.hooks.sound?.(c.sound);
          }
        } else if (!m.auto) {
          // not that one yet: it bounces off
          it.gone = true;
          it.vx = (it.x < rk.x ? -1 : 1) * 300;
          m.wrong(m.q.choices[it.choice]);
        }
      }
    }
    rk.items = rk.items.filter((it) => it.y < VH + 60 && it.y > -300);
  },

  tap() { /* steering is handled by holding a finger down */ },

  draw(m, ctx) {
    const rk = m.rk;
    m.sky(ctx, '#0f1d44', m.theme.sky[0]);
    for (const s of rk.stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + s.s * 0.2})`;
      for (const oy of [-VH, 0, VH]) ctx.fillRect(s.x, s.y + oy, s.s + 1, (s.s + 1) * (1 + rk.boost * 5));
    }
    ctx.fillStyle = 'rgba(255, 210, 120, 0.85)';
    ctx.beginPath(); ctx.arc(860, 200 + (m.t * 4) % 500, 46, 0, 7); ctx.fill();
    // falling letters inside bubbles, coins
    for (const it of rk.items) {
      if (it.y < -100) continue;
      const x = it.x + Math.sin(m.t * 3 + it.wob) * 6;
      if (it.choice === -1) {
        ctx.fillStyle = '#f5b700';
        ctx.beginPath(); ctx.arc(x, it.y, 16, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffe066';
        ctx.beginPath(); ctx.arc(x, it.y, 10, 0, 7); ctx.fill();
        continue;
      }
      ctx.fillStyle = 'rgba(180, 230, 255, 0.35)';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, it.y, 42, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fffdf5';
      ctx.beginPath(); ctx.arc(x, it.y, 32, 0, 7); ctx.fill();
      drawLabel(ctx, m.q.choices[it.choice], x, it.y + 1, 60);
    }
    // the rocket
    const x = rk.x;
    const y = ROCKET_Y;
    const flame = 24 + Math.sin(m.t * 40) * 6 + rk.boost * 30;
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath(); ctx.moveTo(x - 18, y + 30); ctx.lineTo(x, y + 30 + flame); ctx.lineTo(x + 18, y + 30); ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.moveTo(x - 10, y + 30); ctx.lineTo(x, y + 30 + flame * 0.6); ctx.lineTo(x + 10, y + 30); ctx.fill();
    ctx.fillStyle = '#e63946';
    ctx.beginPath(); ctx.moveTo(x - 30, y + 30); ctx.lineTo(x - 46, y + 44); ctx.lineTo(x - 28, y); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 30, y + 30); ctx.lineTo(x + 46, y + 44); ctx.lineTo(x + 28, y); ctx.fill();
    ctx.fillStyle = '#f1f3f8';
    ctx.beginPath();
    ctx.moveTo(x, y - 80);
    ctx.quadraticCurveTo(x + 34, y - 40, x + 30, y + 32);
    ctx.lineTo(x - 30, y + 32);
    ctx.quadraticCurveTo(x - 34, y - 40, x, y - 80);
    ctx.fill();
    ctx.fillStyle = '#e63946';
    ctx.beginPath(); ctx.moveTo(x, y - 80); ctx.quadraticCurveTo(x + 18, y - 64, x + 22, y - 52); ctx.lineTo(x - 22, y - 52); ctx.quadraticCurveTo(x - 18, y - 64, x, y - 80); ctx.fill();
    ctx.fillStyle = '#9fd3ff';
    ctx.beginPath(); ctx.arc(x, y - 16, 20, 0, 7); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y - 16, 18, 0, 7); ctx.clip();
    drawHero(ctx, x, y + 6, 0.6, { ...m.look, t: m.t, facing: 1 });
    ctx.restore();
    if (m.q && m.state !== 'over') {
      const slots = m.q.sequence.map((c) => m.q.choices[c].label);
      m.drawBubble(ctx, { emoji: m.q.show.emoji, slots }, { step: rk.step });
    }
  },
};

const GAMES = { train, pop, cart, rocket };
