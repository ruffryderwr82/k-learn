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
};

export const HATS = {
  none: { cost: 0 },
  cap: { cost: 40 },
  party: { cost: 60 },
  propeller: { cost: 90 },
  wizard: { cost: 130 },
  crown: { cost: 200 },
};

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
