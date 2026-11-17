// Pip, the hero. Drawn with shapes so colors and hats can be swapped in the shop.

export const COLORS = {
  sky: { hex: '#4db8ff', cost: 0 },
  lime: { hex: '#7ed957', cost: 30 },
  sunny: { hex: '#ffd23f', cost: 30 },
  berry: { hex: '#ff5d8f', cost: 60 },
  grape: { hex: '#a06cd5', cost: 60 },
  ember: { hex: '#ff8a3d', cost: 90 },
  ghost: { hex: '#f4f4f8', cost: 120 },
  shadow: { hex: '#3a3f58', cost: 150 },
  mint: { hex: '#5eead4', cost: 180 },
  cherry: { hex: '#e11d48', cost: 220 },
  rainbow: { hex: 'rainbow', cost: 12, gems: true },
  gold: { hex: '#f5b700', power: 'gold' }, // prize for beating the last boss
};

export const HATS = {
  none: { cost: 0 },
  cap: { cost: 40 },
  party: { cost: 60 },
  propeller: { cost: 90 },
  wizard: { cost: 130 },
  crown: { cost: 200 },
  tophat: { cost: 240 },
  cowboy: { cost: 280 },
  chef: { cost: 320 },
  viking: { cost: 380 },
  halo: { cost: 8, gems: true },
  flame: { cost: 16, gems: true },
};

// Pets follow Pip around. They cost gems, so the hidden gems are worth hunting.
export const PETS = {
  none: { cost: 0 },
  dot: { cost: 3, gems: true },
  flit: { cost: 6, gems: true },
  mochi: { cost: 10, gems: true },
  boo: { cost: 15, gems: true },
  ember: { cost: 24, gems: true },
};

/** A small companion centered on (x, y). */
export function drawPet(ctx, x, y, kind, t = 0, facing = 1) {
  if (kind === 'none') return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  const eyes = (ex, ey, r = 2.4) => {
    ctx.fillStyle = '#26314f';
    ctx.beginPath(); ctx.arc(ex, ey, r, 0, 7); ctx.arc(ex + 9, ey, r, 0, 7); ctx.fill();
  };
  switch (kind) {
    case 'dot': { // a little star
      ctx.fillStyle = '#ffe066';
      ctx.rotate(Math.sin(t * 3) * 0.2);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 15; const a = (i * Math.PI) / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.fill();
      eyes(-3, 0, 1.8);
      break;
    }
    case 'flit': { // a bird
      const flap = Math.sin(t * 16) * 7;
      ctx.fillStyle = '#ff8fab';
      ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-20, -8 - flap); ctx.lineTo(-8, 6); ctx.fill();
      ctx.fillStyle = '#ff5d8f';
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffb703';
      ctx.beginPath(); ctx.moveTo(11, -2); ctx.lineTo(20, 2); ctx.lineTo(11, 5); ctx.fill();
      eyes(0, -3);
      break;
    }
    case 'mochi': { // a round cat
      ctx.fillStyle = '#ffb561';
      ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(-9, -18); ctx.lineTo(-2, -9); ctx.moveTo(12, -6); ctx.lineTo(9, -18); ctx.lineTo(2, -9); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 15, 12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffb3c6';
      ctx.beginPath(); ctx.arc(1, 3, 2, 0, 7); ctx.fill();
      eyes(-4, -2);
      break;
    }
    case 'boo': { // a friendly ghost
      ctx.fillStyle = 'rgba(190, 170, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(0, -3, 13, Math.PI, 0);
      ctx.lineTo(13, 12);
      for (let i = 0; i < 4; i++) ctx.lineTo(13 - (i + 0.5) * 6.5, 12 - (i % 2 ? 0 : 5) + Math.sin(t * 6 + i) * 1.5);
      ctx.lineTo(-13, 12);
      ctx.fill();
      eyes(-4, -3, 3);
      break;
    }
    case 'ember': { // a baby dragon
      const flap = Math.sin(t * 12) * 6;
      ctx.fillStyle = '#fb923c';
      ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(-22, -14 - flap); ctx.lineTo(-10, 4); ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath(); ctx.moveTo(-10, 4); ctx.quadraticCurveTo(-24, 10, -20, 0); ctx.lineTo(-8, -2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-3, -19); ctx.lineTo(1, -11); ctx.moveTo(4, -10); ctx.lineTo(8, -18); ctx.lineTo(10, -8); ctx.fill();
      if (t % 2.5 < 0.4) { ctx.fillStyle = '#ff5d5d'; ctx.beginPath(); ctx.moveTo(13, 1); ctx.lineTo(26, -3); ctx.lineTo(22, 2); ctx.lineTo(27, 6); ctx.fill(); }
      eyes(0, -3);
      break;
    }
    default:
  }
  ctx.restore();
}



function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHat(ctx, hat, t) {
  // drawn with the top of the head at y = -44, centered on x = 0
  switch (hat) {
    case 'cap':
      ctx.fillStyle = '#e63946';
      ctx.beginPath(); ctx.arc(0, -40, 15, Math.PI, 0); ctx.fill();
      rr(ctx, 2, -43, 24, 6, 3); ctx.fill();
      break;
    case 'party':
      ctx.fillStyle = '#ff5d8f';
      ctx.beginPath(); ctx.moveTo(-11, -41); ctx.lineTo(0, -68); ctx.lineTo(11, -41); ctx.fill();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.arc(0, -68, 5, 0, 7); ctx.fill();
      ctx.fillRect(-7, -52, 14, 3);
      break;
    case 'propeller':
      ctx.fillStyle = '#3a86ff';
      ctx.beginPath(); ctx.arc(0, -40, 14, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#444';
      ctx.fillRect(-1.5, -62, 3, 9);
      ctx.fillStyle = '#ffbe0b';
      ctx.beginPath(); ctx.ellipse(0, -62, 16 * Math.abs(Math.cos(t * 14)) + 2, 4, 0, 0, 7); ctx.fill();
      break;
    case 'wizard':
      ctx.fillStyle = '#5a3fc0';
      ctx.beginPath(); ctx.moveTo(-14, -40); ctx.lineTo(4, -76); ctx.lineTo(14, -40); ctx.fill();
      rr(ctx, -20, -44, 40, 7, 3); ctx.fill();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.arc(1, -54, 3.5, 0, 7); ctx.fill();
      break;
    case 'tophat':
      ctx.fillStyle = '#1f2540';
      rr(ctx, -12, -68, 24, 28, 3); ctx.fill();
      rr(ctx, -20, -44, 40, 6, 3); ctx.fill();
      ctx.fillStyle = '#e63946';
      ctx.fillRect(-12, -50, 24, 5);
      break;
    case 'cowboy':
      ctx.fillStyle = '#9a6a3a';
      ctx.beginPath(); ctx.ellipse(0, -42, 26, 6, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-12, -43); ctx.quadraticCurveTo(-12, -64, 0, -58); ctx.quadraticCurveTo(12, -64, 12, -43); ctx.fill();
      ctx.fillStyle = '#5b3a1c';
      ctx.fillRect(-12, -49, 24, 4);
      break;
    case 'chef':
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(-9, -60, 9, 0, 7); ctx.arc(2, -64, 10, 0, 7); ctx.arc(11, -58, 8, 0, 7); ctx.fill();
      rr(ctx, -13, -60, 26, 19, 3); ctx.fill();
      break;
    case 'viking':
      ctx.fillStyle = '#f1f1e6';
      ctx.beginPath(); ctx.moveTo(-14, -46); ctx.quadraticCurveTo(-28, -52, -22, -66); ctx.quadraticCurveTo(-18, -54, -10, -52); ctx.fill();
      ctx.beginPath(); ctx.moveTo(14, -46); ctx.quadraticCurveTo(28, -52, 22, -66); ctx.quadraticCurveTo(18, -54, 10, -52); ctx.fill();
      ctx.fillStyle = '#8a8fa3';
      ctx.beginPath(); ctx.arc(0, -40, 16, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f5b700';
      ctx.fillRect(-16, -44, 32, 4);
      break;
    case 'halo':
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(0, -54 + Math.sin(t * 3) * 2, 15, 5, 0, 0, 7); ctx.stroke();
      break;
    case 'flame':
      for (const [c, k] of [['#ff5d5d', 1], ['#ffb703', 0.6]]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(-11 * k, -42);
        ctx.quadraticCurveTo(-14 * k, -58 * (0.8 + k * 0.2), Math.sin(t * 9) * 4, -42 - 30 * k - Math.sin(t * 13) * 3);
        ctx.quadraticCurveTo(14 * k, -58 * (0.8 + k * 0.2), 11 * k, -42);
        ctx.fill();
      }
      break;
    case 'crown':
      ctx.fillStyle = '#f5b700';
      ctx.beginPath();
      ctx.moveTo(-14, -40); ctx.lineTo(-14, -58); ctx.lineTo(-7, -49); ctx.lineTo(0, -61);
      ctx.lineTo(7, -49); ctx.lineTo(14, -58); ctx.lineTo(14, -40);
      ctx.fill();
      ctx.fillStyle = '#e63946';
      ctx.beginPath(); ctx.arc(0, -46, 3, 0, 7); ctx.fill();
      break;
    default:
  }
}

/** Draw Pip with feet at (x, y). */
export function drawHero(ctx, x, y, size, o = {}) {
  if (o.color === 'rainbow') o = { ...o, color: `hsl(${((o.t || 0) * 90) % 360} 85% 62%)` };
  const { color = '#4db8ff', hat = 'none', facing = 1, t = 0, moving = false, air = false, vy = 0, squash = 0, glow = false, cheer = false } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);

  let sx = 1 + squash;
  let sy = 1 - squash;
  if (air) { const k = Math.max(-0.15, Math.min(0.15, -vy / 5000)); sx -= k; sy += k; }
  const bob = moving ? Math.abs(Math.sin(t * 16)) * 3 : cheer ? Math.abs(Math.sin(t * 10)) * 8 : Math.sin(t * 3) * 1;

  if (glow) {
    ctx.fillStyle = `hsla(${(t * 300) % 360}, 95%, 65%, 0.45)`;
    ctx.beginPath(); ctx.arc(0, -22, 36 + Math.sin(t * 12) * 3, 0, 7); ctx.fill();
  }

  // feet
  ctx.fillStyle = '#26314f';
  const step = moving ? Math.sin(t * 16) * 7 : 0;
  const spread = air ? 3 : 0;
  ctx.beginPath();
  ctx.ellipse(-8 + step - spread, -3, 7, 4.5, 0, 0, 7);
  ctx.ellipse(8 - step + spread, -3, 7, 4.5, 0, 0, 7);
  ctx.fill();

  ctx.translate(0, -bob);
  ctx.scale(sx, sy);

  // body
  ctx.fillStyle = color;
  rr(ctx, -17, -44, 34, 40, 15);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  rr(ctx, -9, -17, 18, 12, 6);
  ctx.fill();

  // antenna spark
  ctx.strokeStyle = '#26314f';
  ctx.lineWidth = 2.5;
  if (hat === 'none') {
    ctx.beginPath(); ctx.moveTo(0, -43); ctx.quadraticCurveTo(-facing * 6, -52, 0, -56); ctx.stroke();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.arc(0, -58, 4.5 + Math.sin(t * 6) * 0.8, 0, 7); ctx.fill();
  }

  // face
  const ex = facing * 4;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-6 + ex, -29, 6, 7, 0, 0, 7); ctx.ellipse(7 + ex, -29, 6, 7, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#26314f';
  const blink = (t % 3.2) < 0.12 ? 0.15 : 1;
  ctx.beginPath(); ctx.ellipse(-5 + ex * 1.5, -28, 2.8, 3.4 * blink, 0, 0, 7); ctx.ellipse(8 + ex * 1.5, -28, 2.8, 3.4 * blink, 0, 0, 7); ctx.fill();
  ctx.beginPath();
  if (cheer || air) ctx.ellipse(1 + ex, -18, 3.5, 3, 0, 0, 7); else ctx.arc(1 + ex, -20, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.lineWidth = 2;
  cheer || air ? ctx.fill() : ctx.stroke();

  drawHat(ctx, hat, t);
  ctx.restore();
}

// ---- letter critters ------------------------------------------------------
// The "lost letters": each one is its letter with eyes and feet. Colors are fixed
// per letter so a child can start to recognise them.
const CRITTER_FONT = 'Andika, "Chalkboard SE", "Comic Sans MS", sans-serif';
export const critterColor = (letter) => `hsl(${(letter.charCodeAt(0) * 47) % 360} 85% 64%)`;
const DESCENDS = new Set([...'gjpqy']);

/** A letter critter standing with its feet at (x, y). */
export function drawCritter(ctx, x, y, letter, t = 0, o = {}) {
  const { size = 1, hop = 0, facing = 1, happy = true, glow = false } = o;
  const fs = 48 * size;
  ctx.save();
  ctx.translate(x, y - Math.abs(Math.sin(t * 9 + letter.charCodeAt(0))) * hop);
  ctx.font = `700 ${fs}px ${CRITTER_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const w = Math.max(ctx.measureText(letter).width, fs * 0.42);
  const base = -6 * size - (DESCENDS.has(letter) ? fs * 0.2 : 0);
  if (glow) {
    ctx.fillStyle = 'rgba(255, 240, 150, 0.45)';
    ctx.beginPath(); ctx.arc(0, base - fs * 0.3, fs * 0.62, 0, 7); ctx.fill();
  }
  // feet
  ctx.fillStyle = '#26314f';
  const step = hop ? Math.sin(t * 18) * 3 * size : 0;
  ctx.beginPath();
  ctx.ellipse(-w * 0.28 + step, -2 * size, 6 * size, 3.5 * size, 0, 0, 7);
  ctx.ellipse(w * 0.28 - step, -2 * size, 6 * size, 3.5 * size, 0, 0, 7);
  ctx.fill();
  // body: the letter itself, outlined
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6 * size;
  ctx.strokeStyle = '#26314f';
  ctx.strokeText(letter, 0, base);
  ctx.fillStyle = critterColor(letter);
  ctx.fillText(letter, 0, base);
  // eyes peek over the top of the letter, so the letter itself stays easy to read
  const ey = base - fs * 0.5 - 1.5 * size;
  const ex = facing * 1.5 * size;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#26314f';
  ctx.lineWidth = 1.6 * size;
  ctx.beginPath(); ctx.arc(-5 * size + ex, ey, 4.6 * size, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(5 * size + ex, ey, 4.6 * size, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#26314f';
  const blink = (t + letter.charCodeAt(0)) % 3.7 < 0.12 ? 0.2 : 1;
  ctx.beginPath();
  ctx.ellipse(-5 * size + ex * 1.8, ey + 0.4 * size, 2.2 * size, 2.4 * size * blink, 0, 0, 7);
  ctx.ellipse(5 * size + ex * 1.8, ey + 0.4 * size, 2.2 * size, 2.4 * size * blink, 0, 0, 7);
  ctx.fill();
  if (happy) {
    // rosy cheeks either side of the letter
    ctx.fillStyle = 'rgba(255, 120, 150, 0.55)';
    ctx.beginPath(); ctx.arc(-w * 0.5, base - fs * 0.3, 3 * size, 0, 7); ctx.arc(w * 0.5, base - fs * 0.3, 3 * size, 0, 7); ctx.fill();
  }
  ctx.restore();
}
