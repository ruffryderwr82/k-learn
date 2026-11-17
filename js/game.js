// The platformer: physics, answer blocks, enemies, collectibles and drawing.
import { generateLevel, TILE, ROWS, GROUND, T, STATION_SLOTS, BOSS_HP } from './levelgen.js';
import { drawHero, drawPet } from './hero.js';

export const FONT = 'Andika, "Chalkboard SE", "Comic Sans MS", sans-serif';
const VIEW_H = 576;
const STEP = 1 / 120;
const GRAVITY = 2000;
const JUMP_V = -840;
const RUN = 270;
const SPRING_V = -1250;
const AIR_JUMP_V = -760;
const DASH_V = 720;
const BOSS_COLORS = ['#e0528b', '#e07a2f', '#3f9d6b', '#7b5be0', '#3d6fd6'];
const PW = 30;
const PH = 42;

const THEMES = [
  { sky: ['#63c7ff', '#dff6ff'], far: '#a8e4a0', near: '#6fcf6f', grass: '#4cc24a', dirt: '#b9793f', dirt2: '#a3652f', brick: '#f2a65a', deco: ['🌼', '🌷', '🌳'], orb: '#fff6b0' },
  { sky: ['#ff9e5e', '#ffe2a8'], far: '#e8a064', near: '#d17a45', grass: '#f0c060', dirt: '#c9713d', dirt2: '#b05e2f', brick: '#e07a5f', deco: ['🌵', '🌴', '🌵'], orb: '#fff1c1' },
  { sky: ['#2d8f85', '#b8ead0'], far: '#2f7d5b', near: '#1f6648', grass: '#3fae6a', dirt: '#6b4a2f', dirt2: '#573a22', brick: '#8d6e4a', deco: ['🍄', '🌲', '🌿'], orb: '#eaffd0' },
  { sky: ['#8a6be8', '#ffc9ec'], far: '#c9b3ff', near: '#b094f5', grass: '#ffffff', dirt: '#cdb9ff', dirt2: '#b9a2f5', brick: '#ff9ecb', deco: ['⭐', '🌈', '🎈'], orb: '#ffffff' },
  { sky: ['#14274e', '#5f7fc4'], far: '#8fa8d8', near: '#b8caea', grass: '#ffffff', dirt: '#7f95c4', dirt2: '#6b82b3', brick: '#9fd3ff', deco: ['🌲', '⛄', '🌲'], orb: '#f3f6ff' },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Game {
  /**
   * hooks: nextQuestion(avoidItem), onAnswer(question, firstTry), onPrompt(question|null, step),
   *        ask(question), praise(question), wrong(question, choice), died(), sound(soundId),
   *        onHud(state), onComplete(result), sfx(name)
   */
  constructor(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.input = { left: false, right: false, jump: false, dash: false };
    this.running = false;
    this.look = { color: '#4db8ff', hat: 'none' };
    this._frame = this._frame.bind(this);
  }

  /**
   * opts: gems (already found), variant (layout number), boss, pet,
   *       powers { double, dash, magnet, shield }
   */
  start(levelIndex, world, { gems: gemsAlreadyFound = [false, false, false], variant = 0, boss = false, powers = {}, pet = 'none' } = {}) {
    const lv = generateLevel(levelIndex, world, { variant, boss });
    this.powers = powers;
    this.world = world;
    this.lv = lv;
    this.theme = THEMES[world % THEMES.length];
    this.t = 0;
    this.acc = 0;
    this.state = 'play';
    this.wonAt = 0;
    this.p = { x: lv.spawn.x - PW / 2, y: lv.spawn.y - PH, w: PW, h: PH, vx: 0, vy: 0, grounded: true, facing: 1, coyote: 0, buffer: 0, invuln: 0, stun: 0, squash: 0, airJumps: 0, dashT: 0, dashCd: 0, dashDir: 1, riding: null, shield: !!powers.shield, shieldAt: 0 };
    this.pet = { kind: pet, x: this.p.x - 40, y: this.p.y };
    this.safe = { x: this.p.x, y: this.p.y };
    this.jumpWasDown = false;
    this.dashWasDown = false;
    this.cam = { x: 0, y: 0 };
    this.coins = lv.coins.map((c) => ({ ...c, got: false }));
    this.gems = lv.gems.map((g) => ({ ...g, got: false, old: !!gemsAlreadyFound[g.i] }));
    this.enemies = lv.enemies.map((e) => ({ ...e, baseY: e.y, w: 40, h: 32, dir: -1, dead: 0 }));
    this.movers = lv.movers.map((m) => ({ ...m, x: m.x0, dx: 0 }));
    this.boss = lv.boss ? { ...lv.boss, hp: BOSS_HP, hitT: -9, nextSpawn: Infinity, dead: 0, bounceT: -9 } : null;
    this.bolt = null;
    this.springs = lv.springs.map((s) => ({ ...s, boing: 0 }));
    this.stations = lv.stations.map((s) => ({ ...s, state: 'idle', q: null, slots: [], firstTry: true, shake: 0 }));
    this.particles = [];
    this.popups = [];
    this.loose = []; // coins flying out of blocks and enemies
    this.score = { coins: 0, right: 0, firstTry: 0 };
    this.streak = 0;
    this.superT = 0;
    this.lastItem = null;
    this.strikes = 0; // wrong answers in a row; three sends him back to the checkpoint
    this.checkpoint = { x: this.p.x, y: this.p.y };
    this.active = null; // the station currently asking a question
    this.hooks.onPrompt?.(null);
    this._hud();
    this.resize();
    this.cam.y = ROWS * TILE - this.viewH;
  }

  // ---- loop -------------------------------------------------------------
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
    this.advance(dt);
    this.render();
    requestAnimationFrame(this._frame);
  }

  advance(dt) {
    this.acc += dt;
    while (this.acc >= STEP) { this.step(STEP); this.acc -= STEP; }
  }

  resize() {
    const c = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = c.clientWidth || 800;
    const ch = c.clientHeight || 600;
    c.width = Math.round(cw * dpr);
    c.height = Math.round(ch * dpr);
    const aspect = cw / ch;
    // Landscape shows a fixed height; portrait keeps a playable width and shows more sky.
    // Short screens (phones) zoom in a little so letters stay readable.
    const h = ch < 500 ? 456 : VIEW_H;
    if (aspect >= 1.2) { this.viewH = h; this.viewW = h * aspect; } else { this.viewW = 700; this.viewH = 700 / aspect; }
    this.scale = c.width / this.viewW;
  }

  // ---- world helpers ----------------------------------------------------
  tile(c, r) {
    if (c < 0 || c >= this.lv.W) return T.GROUND; // invisible walls at both ends
    if (r < 0 || r >= ROWS) return T.EMPTY;
    return this.lv.tiles[r * this.lv.W + c];
  }

  setTile(c, r, t) { this.lv.tiles[r * this.lv.W + c] = t; }

  solidAt(px, py) { return this.tile(Math.floor(px / TILE), Math.floor(py / TILE)) !== T.EMPTY; }

  // ---- simulation -------------------------------------------------------
  step(dt) {
    this.t += dt;
    const p = this.p;
    const inp = this.input;

    // moving platforms carry whoever stands on them
    for (const m of this.movers) {
      const nx = m.x0 + (m.x1 - m.x0) * (0.5 - 0.5 * Math.cos(this.t * 0.9 + m.phase));
      m.dx = nx - m.x;
      m.x = nx;
    }
    if (p.riding) { const vx = p.vx; this._moveX(p.riding.dx); p.vx = vx; }

    // three wrong answers in a row: Pip is knocked out, tumbles off the screen
    // and starts again from the last gate he opened
    if (this.state === 'dying') {
      p.vy += GRAVITY * dt;
      p.y += p.vy * dt;
      p.spin = (this.t - this.dieT) * 10;
      for (const q of this.particles) { q.life -= dt; q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
      this.particles = this.particles.filter((q) => q.life > 0);
      if (this.t - this.dieT > 1.7) this._respawn();
      return;
    }

    if (this.state === 'won') {
      p.vx = 0;
      if (this.t - this.wonAt > 1.6 && !this.reported) {
        this.reported = true;
        this.hooks.onComplete?.({
          coins: this.score.coins, right: this.score.right, firstTry: this.score.firstTry,
          gems: [0, 1, 2].map((i) => this.gems.some((g) => g.i === i && (g.got || g.old))),
        });
      }
    }

    // run
    const speed = RUN * (this.superT > 0 ? 1.2 : 1);
    let want = 0;
    if (this.state === 'play' && p.stun <= 0) want = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (want) p.facing = want;
    const accel = p.grounded ? 2600 : 1700;
    const target = want * speed;
    if (p.stun <= 0) p.vx += clamp(target - p.vx, -accel * dt, accel * dt);

    // jump, with a little forgiveness on both sides of the button press
    const pressed = inp.jump && !this.jumpWasDown;
    this.jumpWasDown = inp.jump;
    p.buffer = pressed ? 0.13 : p.buffer - dt;
    p.coyote = p.grounded ? 0.1 : p.coyote - dt;
    if (p.grounded) p.airJumps = 0;
    const canAct = this.state === 'play' && p.stun <= 0;
    // Every jump is full height: a quick tap must still reach the answer blocks.
    if (canAct && p.buffer > 0 && p.coyote > 0) {
      p.vy = JUMP_V;
      p.buffer = 0;
      p.coyote = 0;
      p.grounded = false;
      p.squash = -0.25;
      this.hooks.sfx?.('jump');
    } else if (canAct && pressed && !p.grounded && this.powers.double && p.airJumps < 1) {
      p.vy = AIR_JUMP_V;
      p.airJumps++;
      p.buffer = 0;
      p.squash = -0.2;
      this.hooks.sfx?.('jump');
      for (let i = -3; i <= 3; i++) this.particles.push({ x: p.x + p.w / 2 + i * 6, y: p.y + p.h, vx: i * 40, vy: 60, life: 0.4, color: '#ffffff', size: 4 });
    }

    // dash: a short burst straight ahead that smashes cracked walls and Grumps
    const dashPressed = inp.dash && !this.dashWasDown;
    this.dashWasDown = inp.dash;
    p.dashCd -= dt;
    if (canAct && dashPressed && this.powers.dash && p.dashCd <= 0) {
      p.dashT = 0.2;
      p.dashCd = 0.7;
      p.dashDir = p.facing;
      this.hooks.sfx?.('dash');
    }
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = p.dashDir * DASH_V;
      p.vy = 0;
      this.particles.push({ x: p.x + p.w / 2, y: p.y + p.h / 2 + (Math.random() - 0.5) * 30, vx: -p.dashDir * 80, vy: -100, life: 0.3, color: '#c9f0ff', size: 5 });
    } else p.vy = Math.min(1300, p.vy + GRAVITY * dt);
    if (this.powers.shield && !p.shield && this.t >= p.shieldAt) p.shield = true;

    this._moveX(p.vx * dt);
    this._moveY(p.vy * dt);

    p.invuln -= dt;
    p.stun -= dt;
    p.squash *= 1 - 8 * dt;
    if (this.superT > 0) {
      this.superT -= dt;
      if (Math.random() < 0.5) this._spark(p.x + p.w / 2, p.y + p.h / 2, `hsl(${(this.t * 400) % 360} 90% 60%)`, 1);
      if (this.superT <= 0) this._hud();
    }

    // remember the last safe footing, and come back to it after a fall
    if (p.grounded && this.solidAt(p.x + 2, p.y + p.h + 2) && this.solidAt(p.x + p.w - 2, p.y + p.h + 2)) {
      this.safe.x = p.x;
      this.safe.y = p.y;
    }
    if (p.y > ROWS * TILE + 150) {
      p.x = this.safe.x; p.y = this.safe.y - 4; p.vx = 0; p.vy = 0; p.invuln = 1;
      this._burst(p.x + p.w / 2, p.y + p.h / 2, '#ffffff', 14);
      this.hooks.sfx?.('hurt');
    }

    this._stations();
    this._things(dt);

    // goal
    if (this.state === 'play' && p.x + p.w / 2 > this.lv.goalC * TILE) {
      this.state = 'won';
      this.wonAt = this.t;
      this.reported = false;
      this.hooks.sfx?.('win');
      for (let i = 0; i < 40; i++) this._spark(this.lv.goalC * TILE + TILE / 2, (GROUND - 2) * TILE, `hsl(${i * 37} 90% 60%)`, 1, 420);
    }

    // pet trails behind
    const pet = this.pet;
    pet.x += (p.x + p.w / 2 - p.facing * 46 - pet.x) * Math.min(1, 5 * dt);
    pet.y += (p.y + 6 - pet.y) * Math.min(1, 5 * dt);

    // camera
    // during a boss fight the camera holds on the arena so the boss stays in view
    const fight = this.boss && !this.boss.dead && p.x + p.w / 2 > this.stations[0].c0 * TILE;
    const camX = fight ? this.boss.centerX - this.viewW / 2 : p.x + p.w / 2 - this.viewW * 0.4 + p.facing * 40;
    const tx = clamp(camX, 0, Math.max(0, this.lv.W * TILE - this.viewW));
    this.cam.x += (tx - this.cam.x) * Math.min(1, 6 * dt);
    const maxY = ROWS * TILE - this.viewH;
    const ty = maxY < 0 ? maxY : clamp(p.y - this.viewH * 0.5, 0, maxY);
    this.cam.y += (ty - this.cam.y) * Math.min(1, 5 * dt);
  }

  _moveX(dx) {
    const p = this.p;
    p.x += dx;
    const r0 = Math.floor(p.y / TILE);
    const r1 = Math.floor((p.y + p.h - 1) / TILE);
    if (dx === 0) return;
    const c = Math.floor((dx > 0 ? p.x + p.w : p.x) / TILE);
    for (let r = r0; r <= r1; r++) {
      const tl = this.tile(c, r);
      if (!tl) continue;
      if (tl === T.CRACK && p.dashT > 0) { this._smash(c); break; }
      p.x = dx > 0 ? c * TILE - p.w - 0.01 : (c + 1) * TILE + 0.01;
      p.vx = 0;
      break;
    }
  }

  _smash(c) {
    for (let r = 0; r < GROUND; r++) {
      if (this.tile(c, r) !== T.CRACK) continue;
      this.setTile(c, r, T.EMPTY);
      this._spark((c + 0.5) * TILE, (r + 0.5) * TILE, '#b7a48c', 3, 380);
    }
    this.hooks.sfx?.('smash');
  }

  _hurt(dir) {
    const p = this.p;
    if (p.shield) {
      // the bubble pops instead, and grows back after a while
      p.shield = false;
      p.shieldAt = this.t + 12;
      p.invuln = 1.2;
      p.vx = dir * 250;
      p.vy = -300;
      p.grounded = false;
      this._burst(p.x + p.w / 2, p.y + p.h / 2, '#9be7ff', 16);
      this.hooks.sfx?.('shield');
      return;
    }
    p.invuln = 1.6;
    p.stun = 0.35;
    p.dashT = 0;
    p.vx = dir * 320;
    p.vy = -420;
    p.grounded = false;
    this.streak = 0;
    const lost = Math.min(3, this.score.coins);
    this.score.coins -= lost;
    for (let i = 0; i < lost; i++) this._spark(p.x + p.w / 2, p.y + p.h / 2, '#ffe066', 1, 300);
    this.hooks.sfx?.('hurt');
    this._hud();
  }

  _moveY(dy) {
    const p = this.p;
    p.y += dy;
    const c0 = Math.floor(p.x / TILE);
    const c1 = Math.floor((p.x + p.w - 1) / TILE);
    const wasGrounded = p.grounded;
    p.grounded = false;
    p.riding = null;
    if (dy >= 0) {
      const r = Math.floor((p.y + p.h) / TILE);
      for (let c = c0; c <= c1; c++) {
        if (this.tile(c, r)) {
          p.y = r * TILE - p.h;
          if (!wasGrounded && p.vy > 300) p.squash = 0.3;
          p.vy = 0;
          p.grounded = true;
          break;
        }
      }
      // moving platforms are solid from above only
      if (!p.grounded) {
        for (const m of this.movers) {
          if (p.x + p.w > m.x && p.x < m.x + m.w && p.y + p.h >= m.y && p.y + p.h - dy <= m.y + 6) {
            p.y = m.y - p.h;
            p.vy = 0;
            p.grounded = true;
            p.riding = m;
            break;
          }
        }
      }
    } else {
      const r = Math.floor(p.y / TILE);
      const mid = Math.floor((p.x + p.w / 2) / TILE);
      let hit = null;
      for (const c of [mid, c0, c1]) if (this.tile(c, r)) { hit = c; break; }
      if (hit !== null) {
        p.y = (r + 1) * TILE;
        p.vy = 60;
        if (this.tile(hit, r) === T.BLOCK) this._bump(hit, r);
      }
    }
  }

  // ---- questions --------------------------------------------------------
  _stations() {
    const px = this.p.x + this.p.w / 2;
    for (const s of this.stations) {
      if ((s.state === 'rearm' || s.state === 'swap') && this.t >= s.rearmAt) {
        // ask something new (after a boss hit, or after a wrong answer): put all three blocks back
        for (const b of s.blocks) { this.setTile(b.c, b.r, T.BLOCK); this.setTile(b.c + 1, b.r, T.BLOCK); }
        s.state = 'idle';
      }
      if (s.state !== 'idle' || px < s.c0 * TILE) continue;
      if (s.boss && this.boss.nextSpawn === Infinity) {
        this.boss.nextSpawn = this.t + 4;
        this.checkpoint = { x: (s.c0 - 3) * TILE, y: GROUND * TILE - PH }; // the arena door
      }
      const q = this.hooks.nextQuestion(this.lastItem);
      this.lastItem = q.item;
      s.q = q;
      s.state = 'active';
      s.firstTry = !s.missed; // for stars: was this gate opened without a miss?
      s.step = 0; // for spelling questions: how many letters are in place
      s.askedT = this.t;
      s.armed = false;
      // two answers use the outer blocks; the middle one is removed
      const use = q.choices.length === 2 ? [0, 2] : [0, 1, 2];
      // spelling needs blocks that stay put; otherwise use this gate's own style
      s.live = q.sequence ? 'blocks' : s.mode;
      s.slots = use.map((slot, i) => {
        const c = s.c0 + STATION_SLOTS[slot];
        const base = { c, r: s.blocks[slot].r, choice: i, wrong: false, pop: this.t + i * 0.08 };
        if (s.live === 'balloons') return { ...base, homeX: (c + 1) * TILE, homeY: GROUND * TILE - 150, x: (c + 1) * TILE, y: GROUND * TILE - 150 };
        if (s.live === 'grumps') return { ...base, homeX: (c + 1) * TILE, x: (c + 1) * TILE, y: GROUND * TILE - 60, dir: i % 2 ? 1 : -1 };
        return base;
      });
      // clear the blocks that are not needed (all of them when the answers float or walk)
      s.blocks.forEach((b, i) => {
        if (s.live === 'blocks' && use.includes(i)) return;
        this.setTile(b.c, b.r, T.EMPTY);
        this.setTile(b.c + 1, b.r, T.EMPTY);
        if (s.live !== 'blocks') this._burst((b.c + 1) * TILE, (b.r + 0.5) * TILE, '#ffe9a8', 8);
      });
      this.active = s;
      this.hooks.onPrompt?.(q, 0);
      this.hooks.ask?.(q);
    }
  }

  _bump(c, r) {
    const s = this.stations.find((st) => st.state === 'active' && st.slots.some((b) => b.r === r && (b.c === c || b.c + 1 === c)));
    if (!s) return;
    const slot = s.slots.find((b) => b.r === r && (b.c === c || b.c + 1 === c));
    if (slot.wrong || slot.locked) return;
    this.answer(s, slot);
  }

  answer(s, slot) {
    const q = s.q;
    const bx = slot.x ?? (slot.c + 1) * TILE;
    const by = slot.y ?? slot.r * TILE;
    slot.bumpT = this.t;
    if (q.sequence) {
      // spelling: the letters must be bumped in order, one sound at a time
      if (slot.choice !== q.sequence[s.step]) {
        slot.missT = this.t;
        this._miss(s, slot);
        return;
      }
      slot.locked = true;
      s.step++;
      this.hooks.onPrompt?.(q, s.step);
      if (s.step < q.sequence.length) {
        this.hooks.sfx?.('coin');
        this.hooks.sound?.(q.choices[slot.choice].sound);
        this._burst(bx, by, '#7ee081', 8);
        return;
      }
    }
    if (q.sequence || slot.choice === q.answer) {
      s.state = 'done';
      this.active = null;
      this.score.right++;
      this.strikes = 0;
      if (s.firstTry) this.score.firstTry++;
      this.hooks.onAnswer?.(q, true);
      this.hooks.sfx?.('right');
      this.hooks.praise?.(q);
      this.hooks.onPrompt?.(null);
      const prize = s.firstTry ? 6 : 2;
      for (let i = 0; i < prize; i++) this.loose.push({ x: bx, y: by - 10, vx: (i - (prize - 1) / 2) * 60, vy: -520 - Math.random() * 120, life: 0 });
      this._burst(bx, by, '#ffe066', 18);
      const boss = s.boss ? this.boss : null;
      if (boss) {
        // a right answer zaps the boss
        boss.hp--;
        boss.hitT = this.t;
        this.bolt = { x0: bx, y0: by, x1: boss.x, y1: boss.y - 50, t: this.t };
        this._burst(boss.x, boss.y - 50, '#ffe066', 24);
        this.hooks.sfx?.('bosshit');
      }
      if (boss && boss.hp > 0) {
        s.state = 'rearm';
        s.rearmAt = this.t + 2;
      } else {
        if (boss) {
          boss.dead = this.t;
          for (const e of this.enemies) if (e.minion && !e.dead) e.dead = this.t;
          for (let i = 0; i < 16; i++) this.loose.push({ x: boss.x, y: boss.y - 60, vx: (i - 7.5) * 45, vy: -500 - Math.random() * 300, life: 0 });
          this._burst(boss.x, boss.y - 50, BOSS_COLORS[this.world % 5], 50);
          this.hooks.sfx?.('bossdown');
        }
        // open the gate; this is where he comes back to after three misses
        this.checkpoint = { x: (s.barrierC + 1.5) * TILE - PW / 2, y: GROUND * TILE - PH };
        for (let r = 0; r < GROUND; r++) {
          this.setTile(s.barrierC, r, T.EMPTY);
          this._spark((s.barrierC + 0.5) * TILE, (r + 0.5) * TILE, '#b8f3ff', 3);
        }
        setTimeout(() => this.hooks.sfx?.('gate'), 350);
      }
      // answer streaks charge up Super Spark
      this.streak = s.firstTry ? this.streak + 1 : 0;
      if (this.streak >= 3) {
        this.streak = 0;
        this.superT = 10;
        this.hooks.sfx?.('super');
        this.popups.push({ x: bx, y: by - 60, text: 'SUPER!', t: this.t, color: '#ff5d8f', size: 40 });
      }
    } else {
      slot.wrong = true;
      this._miss(s, slot);
    }
    this._hud();
  }

  // A wrong answer. The right one is shown for a moment, then the gate asks a
  // different question. Three in a row and Pip is sent back to the checkpoint.
  _miss(s, slot) {
    const q = s.q;
    s.missed = true;
    s.firstTry = false;
    this.streak = 0;
    this.strikes++;
    this.active = null;
    this.hooks.onAnswer?.(q, false);
    this.hooks.onPrompt?.(null);
    this.hooks.sfx?.('wrong');
    s.state = 'swap';
    if (this.strikes >= 3) {
      s.rearmAt = Infinity; // reset when he respawns
      this.state = 'dying';
      this.dieT = this.t;
      this.p.vx = 0;
      this.p.vy = -780;
      this.p.dashT = 0;
      this._burst(this.p.x + this.p.w / 2, this.p.y + this.p.h / 2, '#ffffff', 20);
      this.hooks.sfx?.('die');
      this.hooks.died?.();
    } else {
      s.rearmAt = this.t + 2.4;
      this.hooks.wrong?.(q, q.choices[slot.choice]);
    }
    this._hud();
  }

  _respawn() {
    const p = this.p;
    Object.assign(p, { x: this.checkpoint.x, y: this.checkpoint.y, vx: 0, vy: 0, spin: 0, grounded: true, invuln: 1.5, stun: 0, facing: 1, riding: null });
    this.safe = { x: p.x, y: p.y };
    this.strikes = 0;
    this.state = 'play';
    this.active = null;
    // whatever gate he was at asks afresh when he gets back to it
    for (const s of this.stations) if (s.state === 'swap' || s.state === 'active') s.rearmAt = 0;
    this.cam.x = clamp(p.x - this.viewW * 0.4, 0, Math.max(0, this.lv.W * TILE - this.viewW));
    this._burst(p.x + p.w / 2, p.y + p.h / 2, '#ffffff', 16);
    this._hud();
  }

  // ---- coins, gems, springs, enemies ------------------------------------
  _collect(n = 1) {
    this.score.coins += n;
    this._hud();
  }

  _things(dt) {
    const p = this.p;
    const pc = { x: p.x + p.w / 2, y: p.y + p.h / 2 };

    for (const c of this.coins) {
      if (c.got) continue;
      const dx = pc.x - c.x;
      const dy = pc.y - c.y;
      const d = Math.hypot(dx, dy);
      const reach = this.superT > 0 ? 170 : this.powers.magnet ? 120 : 0;
      if (d < reach && d > 1) { c.x += (dx / d) * 500 * dt; c.y += (dy / d) * 500 * dt; }
      if (d < 34) { c.got = true; this._collect(); this.hooks.sfx?.('coin'); this._spark(c.x, c.y, '#ffe066', 4); }
    }

    for (const c of this.loose) {
      c.life += dt;
      c.vy += GRAVITY * 0.8 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.life > 0.55 && !c.got) { c.got = true; this._collect(); this.hooks.sfx?.('coin'); }
    }
    this.loose = this.loose.filter((c) => !c.got);

    for (const g of this.gems) {
      if (g.got) continue;
      if (Math.hypot(pc.x - g.x, pc.y - g.y) < 40) {
        g.got = true;
        this.hooks.sfx?.('gem');
        this._burst(g.x, g.y, '#7df9ff', 20);
        this.popups.push({ x: g.x, y: g.y - 30, text: '💎', t: this.t, size: 40 });
        this._hud();
      }
    }

    // answers that float (balloons) or walk (Grumps with signs)
    const st = this.active;
    if (st && st.live !== 'blocks') {
      // Nothing counts until he has landed and had a moment to look, so arriving
      // mid-jump can never pop a balloon or squash a Grump by accident.
      if (!st.armed && p.grounded && this.t - st.askedT > 0.4) st.armed = true;
      for (const [i, a] of st.slots.entries()) {
        if (a.wrong || st.state !== 'active') continue;
        if (st.live === 'balloons') {
          a.x = a.homeX + Math.sin(this.t * 0.8 + i * 2) * 16;
          a.y = a.homeY + Math.sin(this.t * 1.7 + i) * 18;
          const nx = clamp(a.x, p.x, p.x + p.w);
          const ny = clamp(a.y, p.y, p.y + p.h);
          if (st.armed && Math.hypot(a.x - nx, a.y - ny) < 38) this.answer(st, a);
        } else {
          a.x += a.dir * 30 * dt;
          if (Math.abs(a.x - a.homeX) > 20) a.dir = a.x > a.homeX ? -1 : 1;
          // only a stomp counts: walking into one does nothing
          const box = { x: a.x - 26, y: GROUND * TILE - 36, w: 52, h: 36 };
          if (st.armed && p.vy > 80 && p.y + p.h < box.y + 22 && overlap(p, box)) { p.vy = -560; this.answer(st, a); }
        }
      }
    }

    for (const s of this.springs) {
      const box = { x: s.c * TILE + 6, y: s.r * TILE + 22, w: TILE - 12, h: 26 };
      if (p.vy >= 0 && overlap(p, box)) {
        p.vy = SPRING_V;
        p.grounded = false;
        s.boing = this.t;
        this.hooks.sfx?.('spring');
      }
    }

    for (const e of this.enemies) {
      if (e.dead) continue;
      e.x += e.dir * (e.minion ? 85 : 55) * dt;
      if (e.fly) e.y = e.baseY + Math.sin(this.t * 2.2 + e.minX) * 34;
      if (e.minion && e.x < e.minX) { e.dead = this.t; this._spark(e.x, e.y - 16, '#b388ff', 6); continue; }
      if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
      if (e.x > e.maxX) { e.x = e.maxX; e.dir = -1; }
      const box = { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h };
      if (!overlap(p, box)) continue;
      const stomp = p.vy > 80 && p.y + p.h < box.y + 20;
      if (stomp || this.superT > 0 || p.dashT > 0) {
        e.dead = this.t;
        if (stomp) p.vy = -560;
        this.hooks.sfx?.('stomp');
        this._burst(e.x, e.y - 16, '#b388ff', 12);
        for (let i = 0; i < 2; i++) this.loose.push({ x: e.x, y: e.y - 30, vx: (i - 0.5) * 120, vy: -480, life: 0 });
      } else if (p.invuln <= 0) this._hurt(pc.x < e.x ? -1 : 1);
    }

    // the boss sends Grumps marching across the arena, and is bouncy on top
    const b = this.boss;
    if (b && !b.dead) {
      if (this.t >= b.nextSpawn) {
        b.nextSpawn = this.t + 5;
        if (this.enemies.filter((e) => e.minion && !e.dead).length < 2) {
          this.enemies.push({ x: b.x - 70, y: b.y, baseY: b.y, minX: b.leftX, maxX: b.x, w: 40, h: 32, dir: -1, dead: 0, minion: true });
        }
      }
      const box = { x: b.x - 55, y: b.y - 96, w: 110, h: 96 };
      if (overlap(p, box)) {
        if (p.vy > 80 && p.y + p.h < box.y + 34) { p.vy = -760; b.bounceT = this.t; this.hooks.sfx?.('spring'); } else if (p.invuln <= 0) this._hurt(-1);
      }
    }

    for (const q of this.particles) { q.life -= dt; q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    this.particles = this.particles.filter((q) => q.life > 0);
    this.popups = this.popups.filter((q) => this.t - q.t < 1.2);
  }

  _spark(x, y, color, n = 1, speed = 220) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0.5 + Math.random() * 0.4, color, size: 3 + Math.random() * 4 });
    }
  }

  _burst(x, y, color, n) { this._spark(x, y, color, n, 320); }

  _hud() {
    this.hooks.onHud?.({
      coins: this.score.coins,
      gems: [0, 1, 2].map((i) => this.gems.some((g) => g.i === i && (g.got || g.old))),
      streak: this.streak,
      lives: 3 - this.strikes,
      super: this.superT > 0,
    });
  }

  // ---- drawing ----------------------------------------------------------
  render() {
    const { ctx, theme, cam, viewW, viewH, lv, t } = this;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, viewH);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewW, viewH);

    // sun or moon
    ctx.fillStyle = theme.orb;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(viewW * 0.8, viewH * 0.2, 46, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;

    // clouds
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 6; i++) {
      const x = ((i * 370 - cam.x * 0.15 + t * 6) % (viewW + 300) + viewW + 300) % (viewW + 300) - 150;
      const y = 50 + ((i * 97) % 170);
      for (const [ox, oy, r] of [[0, 0, 26], [28, -10, 32], [60, 0, 24], [30, 8, 28]]) {
        ctx.beginPath();
        ctx.ellipse(x + ox, y + oy, r * 1.2, r * 0.8, 0, 0, 7);
        ctx.fill();
      }
    }

    // rolling hills, two layers of parallax
    const horizon = GROUND * TILE - cam.y;
    for (const [color, par, amp, base, f] of [[theme.far, 0.25, 60, 150, 0.006], [theme.near, 0.45, 40, 80, 0.011]]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, viewH);
      for (let x = 0; x <= viewW + 20; x += 20) {
        const wx = x + cam.x * par;
        ctx.lineTo(x, horizon - base - Math.sin(wx * f) * amp - Math.sin(wx * f * 2.3 + 1) * amp * 0.4);
      }
      ctx.lineTo(viewW, viewH);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-Math.round(cam.x * 2) / 2, -Math.round(cam.y * 2) / 2);

    // decorations behind everything
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const d of lv.deco) {
      if (d.x < cam.x - 60 || d.x > cam.x + viewW + 60) continue;
      ctx.font = `${d.size}px sans-serif`;
      ctx.fillText(theme.deco[d.kind], d.x, GROUND * TILE + 4);
    }

    // goal portal
    this._drawGoal();

    // tiles
    const c0 = Math.max(0, Math.floor(cam.x / TILE));
    const c1 = Math.min(lv.W - 1, Math.floor((cam.x + viewW) / TILE));
    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < ROWS; r++) {
        const tl = lv.tiles[r * lv.W + c];
        const x = c * TILE;
        const y = r * TILE;
        if (tl === T.GROUND) {
          ctx.fillStyle = (c + r) % 2 ? theme.dirt : theme.dirt2;
          ctx.fillRect(x, y, TILE + 0.5, TILE + 0.5);
          if (r === 0 || lv.tiles[(r - 1) * lv.W + c] !== T.GROUND) {
            ctx.fillStyle = theme.grass;
            roundRect(ctx, x - 1, y - 4, TILE + 2, 16, 6);
            ctx.fill();
          }
        } else if (tl === T.BRICK) {
          ctx.fillStyle = theme.brick;
          roundRect(ctx, x + 1, y + 1, TILE - 2, TILE - 2, 8);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          roundRect(ctx, x + 6, y + 5, TILE - 12, 8, 4);
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          roundRect(ctx, x + 1, y + TILE - 10, TILE - 2, 9, 5);
          ctx.fill();
        } else if (tl === T.BARRIER) {
          const a = 0.45 + 0.15 * Math.sin(t * 4 + r);
          ctx.fillStyle = `rgba(120, 220, 255, ${a})`;
          roundRect(ctx, x + 8, y + 1, TILE - 16, TILE - 2, 10);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fillRect(x + 14, y + 6, 4, TILE - 14);
          if (r === GROUND - 2) { ctx.font = '30px sans-serif'; ctx.fillText('🔒', x + TILE / 2, y + 34); }
        } else if (tl === T.CRACK) {
          ctx.fillStyle = (r % 2) ? '#9a8a76' : '#8c7c69';
          ctx.fillRect(x + 4, y, TILE - 8, TILE + 0.5);
          ctx.strokeStyle = '#4d4032';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x + 12 + (r * 7) % 14, y);
          ctx.lineTo(x + 26 - (r * 5) % 10, y + 18);
          ctx.lineTo(x + 16 + (r * 3) % 12, y + 30);
          ctx.lineTo(x + 28, y + TILE);
          ctx.stroke();
          if (r === GROUND - 2) { ctx.font = '26px sans-serif'; ctx.fillText('💨', x + TILE / 2, y + 32); }
        }
      }
    }

    this._drawBlocks();

    // moving platforms
    for (const m of this.movers) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      roundRect(ctx, m.x + 2, m.y + 6, m.w - 4, 18, 9);
      ctx.fill();
      ctx.fillStyle = theme.brick;
      roundRect(ctx, m.x, m.y, m.w, 18, 9);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      roundRect(ctx, m.x + 8, m.y + 3, m.w - 16, 5, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      const dir = m.dx >= 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(m.x + m.w / 2 + dir * 8, m.y + 12);
      ctx.lineTo(m.x + m.w / 2 - dir * 5, m.y + 8);
      ctx.lineTo(m.x + m.w / 2 - dir * 5, m.y + 16);
      ctx.fill();
    }

    this._drawBoss();

    // springs
    for (const s of this.springs) {
      const x = s.c * TILE;
      const y = s.r * TILE;
      const k = Math.max(0, 1 - (t - s.boing) * 4);
      const top = y + 22 - k * 16;
      ctx.strokeStyle = '#8a8fa3';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) ctx.lineTo(x + (i % 2 ? 34 : 14), top + ((TILE - top + y) * i) / 4);
      ctx.stroke();
      ctx.fillStyle = '#ff5d5d';
      roundRect(ctx, x + 4, top - 6, TILE - 8, 12, 6);
      ctx.fill();
    }

    // coins
    for (const c of [...this.coins, ...this.loose]) {
      if (c.got || c.x < cam.x - 30 || c.x > cam.x + viewW + 30) continue;
      const sx = Math.abs(Math.cos(t * 4 + c.x * 0.01));
      ctx.fillStyle = '#f5b700';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + Math.sin(t * 3 + c.x) * 2, 11 * sx + 2, 13, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + Math.sin(t * 3 + c.x) * 2, 7 * sx + 1, 9, 0, 0, 7);
      ctx.fill();
    }

    // gems
    for (const g of this.gems) {
      if (g.got) continue;
      const y = g.y + Math.sin(t * 2.5) * 5;
      ctx.globalAlpha = g.old ? 0.35 : 1;
      ctx.fillStyle = 'rgba(125,249,255,0.3)';
      ctx.beginPath();
      ctx.arc(g.x, y, 26 + Math.sin(t * 5) * 3, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#19c9e6';
      ctx.beginPath();
      ctx.moveTo(g.x, y - 18); ctx.lineTo(g.x + 16, y - 4); ctx.lineTo(g.x, y + 18); ctx.lineTo(g.x - 16, y - 4);
      ctx.fill();
      ctx.fillStyle = '#a5f6ff';
      ctx.beginPath();
      ctx.moveTo(g.x, y - 18); ctx.lineTo(g.x + 16, y - 4); ctx.lineTo(g.x - 16, y - 4);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // enemies ("Grumps")
    for (const e of this.enemies) {
      const since = e.dead ? t - e.dead : 0;
      if (since > 0.4) continue;
      const squish = e.dead ? Math.max(0.15, 1 - since * 4) : 1 + Math.sin(t * 8 + e.minX) * 0.06;
      const h = e.h * squish;
      if (e.fly && !e.dead) {
        const flap = Math.sin(t * 18) * 9;
        ctx.fillStyle = '#c9b3ff';
        for (const sgn of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(e.x + sgn * 14, e.y - h / 2);
          ctx.lineTo(e.x + sgn * 40, e.y - h / 2 - 10 - flap);
          ctx.lineTo(e.x + sgn * 34, e.y - h / 2 + 8);
          ctx.fill();
        }
      }
      ctx.fillStyle = '#8e5bd6';
      roundRect(ctx, e.x - e.w / 2, e.y - h, e.w, h, Math.min(14, h / 2));
      ctx.fill();
      if (!e.dead) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(e.x - 8 + e.dir * 3, e.y - h + 13, 6, 0, 7); ctx.arc(e.x + 8 + e.dir * 3, e.y - h + 13, 6, 0, 7); ctx.fill();
        ctx.fillStyle = '#2b1b4a';
        ctx.beginPath(); ctx.arc(e.x - 8 + e.dir * 5, e.y - h + 14, 3, 0, 7); ctx.arc(e.x + 8 + e.dir * 5, e.y - h + 14, 3, 0, 7); ctx.fill();
        ctx.strokeStyle = '#2b1b4a';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(e.x - 15, e.y - h + 3); ctx.lineTo(e.x - 3, e.y - h + 8); ctx.moveTo(e.x + 15, e.y - h + 3); ctx.lineTo(e.x + 3, e.y - h + 8); ctx.stroke();
      }
    }

    // pet
    if (this.pet.kind !== 'none') drawPet(ctx, this.pet.x, this.pet.y + Math.sin(t * 4) * 5, this.pet.kind, t, this.p.x + this.p.w / 2 > this.pet.x ? 1 : -1);

    // answer bolt
    if (this.bolt && t - this.bolt.t < 0.3) {
      const bo = this.bolt;
      ctx.strokeStyle = '#fff27a';
      ctx.lineWidth = 7;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(bo.x0, bo.y0);
      for (let i = 1; i < 8; i++) ctx.lineTo(bo.x0 + ((bo.x1 - bo.x0) * i) / 8, bo.y0 + ((bo.y1 - bo.y0) * i) / 8 + (i % 2 ? -18 : 18));
      ctx.lineTo(bo.x1, bo.y1);
      ctx.stroke();
    }

    // hero
    const p = this.p;
    if (this.state === 'dying') {
      // tumbling head over heels
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.spin || 0);
      drawHero(ctx, 0, p.h / 2, 1, { ...this.look, facing: p.facing, t, air: true, vy: 0 });
      ctx.restore();
    } else if (!(p.invuln > 0 && Math.floor(t * 14) % 2)) {
      drawHero(ctx, p.x + p.w / 2, p.y + p.h, 1, {
        ...this.look, facing: p.facing, t, moving: Math.abs(p.vx) > 30 && p.grounded,
        air: !p.grounded, vy: p.vy, squash: p.squash, glow: this.superT > 0, cheer: this.state === 'won',
      });
    }
    if (p.shield && this.state !== 'dying') {
      ctx.strokeStyle = 'rgba(155, 231, 255, 0.9)';
      ctx.fillStyle = 'rgba(155, 231, 255, 0.18)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + p.h / 2 - 4, 36 + Math.sin(t * 4) * 1.5, 0, 7);
      ctx.fill();
      ctx.stroke();
    }

    // particles and floating text
    for (const q of this.particles) {
      ctx.globalAlpha = Math.min(1, q.life * 2);
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.size, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const q of this.popups) {
      const k = (t - q.t) / 1.2;
      ctx.globalAlpha = 1 - k;
      ctx.font = `700 ${q.size}px ${FONT}`;
      ctx.fillStyle = q.color || '#fff';
      ctx.fillText(q.text, q.x, q.y - k * 60);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawBlocks() {
    const { ctx, t, cam, viewW } = this;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of this.stations) {
      if (s.c0 * TILE > cam.x + viewW + 100 || (s.c0 + 14) * TILE < cam.x - 100) continue;
      if (s.state !== 'idle' && s.live !== 'blocks') { this._drawFloaters(s); continue; }
      const slots = s.state === 'idle' ? s.blocks.map((b) => ({ ...b, blank: true })) : s.slots;
      for (const b of slots) {
        const choice = b.blank ? null : s.q.choices[b.choice];
        const over = s.state === 'done' || s.state === 'rearm' || s.state === 'swap';
        const right = b.locked || (over && !s.q.sequence && b.choice === s.q.answer);
        const faded = b.wrong || (over && !right);
        let x = b.c * TILE;
        let y = b.r * TILE - 6;
        const w = TILE * 2;
        const h = TILE + 6;
        const since = t - (b.bumpT ?? -9);
        if (since < 0.25) {
          if (b.wrong || b.missT === b.bumpT) x += Math.sin(since * 60) * 5; else y -= Math.sin((since / 0.25) * Math.PI) * 12;
        }
        if (!b.blank && t - b.pop < 0.2) y -= Math.sin(((t - b.pop) / 0.2) * Math.PI) * 8;

        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        roundRect(ctx, x + 2, y + 5, w - 4, h, 14);
        ctx.fill();
        ctx.fillStyle = faded ? '#aab0c0' : right ? '#7ee081' : b.blank ? '#ffc94d' : '#fffdf5';
        roundRect(ctx, x + 2, y, w - 4, h, 14);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = faded ? '#8b91a3' : right ? '#3fae4a' : '#f59e0b';
        ctx.stroke();

        ctx.globalAlpha = faded ? 0.45 : 1;
        this._label(choice, x + w / 2, y + h / 2 + 2, w);
        ctx.globalAlpha = 1;
      }
    }
    ctx.textBaseline = 'alphabetic';
  }

  /** An answer's text or picture, centered, shrunk to fit. */
  _label(choice, cx, cy, w) {
    const { ctx } = this;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#26314f';
    if (!choice) {
      ctx.fillStyle = '#b36b00';
      ctx.font = `700 34px ${FONT}`;
      ctx.fillText('?', cx, cy);
    } else if (choice.kind === 'emoji') {
      ctx.font = '36px sans-serif';
      ctx.fillText(choice.label, cx, cy + 1);
    } else {
      let size = choice.kind === 'letter' ? 42 : 34;
      ctx.font = `700 ${size}px ${FONT}`;
      while (ctx.measureText(choice.label).width > w - 18 && size > 16) { size -= 2; ctx.font = `700 ${size}px ${FONT}`; }
      if (choice.heart?.length) {
        // tricky words: the letters to learn by heart are red
        let lx = cx - ctx.measureText(choice.label).width / 2;
        ctx.textAlign = 'left';
        [...choice.label].forEach((ch, i) => {
          ctx.fillStyle = choice.heart.includes(i) ? '#e11d48' : '#26314f';
          ctx.fillText(ch, lx, cy - 2);
          lx += ctx.measureText(ch).width;
        });
        ctx.textAlign = 'center';
      } else ctx.fillText(choice.label, cx, cy - 2);
    }
  }

  // Balloons to pop and Grumps to stomp, each carrying one answer.
  _drawFloaters(s) {
    const { ctx, t } = this;
    const COLORS = ['#ff8fab', '#7fd4ff', '#b9f18d'];
    for (const a of s.slots) {
      const over = s.state === 'done' || s.state === 'swap';
      const right = over && a.choice === s.q.answer;
      const since = t - (a.wrong ? a.bumpT : a.endT ?? t);
      // popped or finished ones shrink away; the right one lingers a moment longer
      const gone = a.wrong || over;
      const k = gone ? Math.max(0, 1 - since / (right ? 0.9 : 0.25)) : Math.min(1, (t - a.pop) / 0.25);
      if (over && !a.wrong && a.endT === undefined) a.endT = t; // the others leave when the question is over
      if (k <= 0) continue;
      const choice = s.q.choices[a.choice];
      ctx.save();
      if (s.live === 'balloons') {
        ctx.translate(a.x, a.y - (right && s.state === 'done' ? since * 120 : 0));
        ctx.scale(k, k);
        ctx.strokeStyle = 'rgba(38,49,79,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 44); ctx.quadraticCurveTo(8, 62, -2, 84); ctx.stroke();
        ctx.fillStyle = right ? '#7ee081' : COLORS[a.choice % 3];
        ctx.beginPath(); ctx.ellipse(0, 0, 52, 46, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-7, 44); ctx.lineTo(7, 44); ctx.lineTo(0, 52); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.ellipse(-22, -20, 12, 8, -0.6, 0, 7); ctx.fill();
        this._label(choice, 0, 2, 96);
      } else {
        const squish = gone ? Math.max(0.2, k) : 1;
        ctx.translate(a.x, GROUND * TILE);
        // the Grump (teal, so it is clearly not one of the purple ones that hurt)
        const h = (34 + Math.sin(t * 8 + a.choice) * 2) * squish;
        ctx.fillStyle = '#2fb5a6';
        roundRect(ctx, -22, -h, 44, h, Math.min(14, h / 2));
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-8 + a.dir * 3, -h + 14, 6, 0, 7); ctx.arc(8 + a.dir * 3, -h + 14, 6, 0, 7); ctx.fill();
        ctx.fillStyle = '#12423d';
        ctx.beginPath(); ctx.arc(-8 + a.dir * 5, -h + 15, 3, 0, 7); ctx.arc(8 + a.dir * 5, -h + 15, 3, 0, 7); ctx.fill();
        // its sign
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = '#8a6a45';
        ctx.fillRect(-3, -h - 22, 6, 24);
        ctx.fillStyle = right ? '#7ee081' : '#fffdf5';
        roundRect(ctx, -48, -h - 76, 96, 56, 12);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = right ? '#3fae4a' : '#2fb5a6';
        ctx.stroke();
        this._label(choice, 0, -h - 46, 96);
        // an arrow that says "jump on me"
        if (!gone) {
          ctx.fillStyle = '#2fb5a6';
          const bob = Math.sin(t * 6) * 3;
          ctx.beginPath(); ctx.moveTo(-8, -h - 92 + bob); ctx.lineTo(8, -h - 92 + bob); ctx.lineTo(0, -h - 82 + bob); ctx.fill();
        }
      }
      ctx.restore();
    }
    ctx.textBaseline = 'alphabetic';
  }

  _drawBoss() {
    const b = this.boss;
    if (!b) return;
    const { ctx, t } = this;
    const since = b.dead ? t - b.dead : 0;
    if (since > 0.7) return;
    const hit = t - b.hitT < 0.35;
    const k = b.dead ? Math.max(0.05, 1 - since / 0.7) : 1;
    const bounce = Math.max(0, 1 - (t - b.bounceT) * 5) * 0.2;
    const w = 110 * k * (1 + bounce);
    const h = (96 + Math.sin(t * 3) * 4) * k * (1 - bounce);
    const x = b.x + (hit ? Math.sin(t * 70) * 6 : 0);
    ctx.fillStyle = hit ? '#ffffff' : BOSS_COLORS[this.world % 5];
    roundRect(ctx, x - w / 2, b.y - h, w, h, Math.min(38, h / 2));
    ctx.fill();
    if (b.dead) return;
    // crown
    ctx.fillStyle = '#f5b700';
    ctx.beginPath();
    ctx.moveTo(x - 30, b.y - h + 6); ctx.lineTo(x - 30, b.y - h - 26); ctx.lineTo(x - 15, b.y - h - 10); ctx.lineTo(x, b.y - h - 30);
    ctx.lineTo(x + 15, b.y - h - 10); ctx.lineTo(x + 30, b.y - h - 26); ctx.lineTo(x + 30, b.y - h + 6);
    ctx.fill();
    // face (always glaring left, toward the player)
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 26, b.y - h + 40, 14, 0, 7); ctx.arc(x + 14, b.y - h + 40, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b1b4a';
    ctx.beginPath(); ctx.arc(x - 31, b.y - h + 42, 6, 0, 7); ctx.arc(x + 9, b.y - h + 42, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2b1b4a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - 44, b.y - h + 18); ctx.lineTo(x - 14, b.y - h + 30);
    ctx.moveTo(x + 32, b.y - h + 18); ctx.lineTo(x + 2, b.y - h + 30);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    if (hit) ctx.arc(x - 6, b.y - h + 72, 9, 0, 7); else ctx.arc(x - 6, b.y - h + 80, 16, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
    // health
    for (let i = 0; i < BOSS_HP; i++) {
      ctx.fillStyle = i < b.hp ? '#ff4d6d' : 'rgba(38,49,79,0.35)';
      ctx.beginPath();
      ctx.arc(b.x - (BOSS_HP - 1) * 13 + i * 26, b.y - 150, 9, 0, 7);
      ctx.fill();
    }
  }

  _drawGoal() {
    const { ctx, t } = this;
    const x = (this.lv.goalC + 0.5) * TILE;
    const y = (GROUND - 2) * TILE;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `hsla(${(t * 80 + i * 60) % 360}, 90%, 65%, 0.85)`;
      ctx.lineWidth = 8 - i * 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 44 - i * 10 + Math.sin(t * 3 + i) * 3, 78 - i * 14, 0, 0, 7);
      ctx.stroke();
    }
    ctx.font = '44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⭐', x, y + 14 + Math.sin(t * 3) * 6);
  }
}
