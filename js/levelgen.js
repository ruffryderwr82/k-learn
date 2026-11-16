// Builds a side-scrolling level out of small hand-shaped chunks.
// The same level always comes out the same (so secrets can be remembered),
// while the questions asked inside it change every time.
import { mulberry32 } from './curriculum.js';

export const TILE = 48;
export const ROWS = 14;
export const GROUND = 11; // first solid row of normal ground
export const T = { EMPTY: 0, GROUND: 1, BRICK: 2, BLOCK: 3, BARRIER: 4 };
export const STATION_SLOTS = [1, 4, 7]; // left column of each 2-wide answer block, relative to the station
export const BLOCK_ROW = GROUND - 4;

export function generateLevel(levelIndex, world, stationsWanted = 6) {
  const rng = mulberry32(1234 + levelIndex * 7919);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const cols = []; // each column is an array of ROWS tile ids
  const lv = { coins: [], gems: [], enemies: [], springs: [], stations: [], deco: [] };
  const hard = world + (levelIndex % 8) / 8; // 0 .. ~5

  const col = (groundTop = GROUND) => {
    const c = new Array(ROWS).fill(T.EMPTY);
    if (groundTop !== null) for (let r = groundTop; r < ROWS; r++) c[r] = T.GROUND;
    cols.push(c);
    return cols.length - 1;
  };
  const set = (c, r, t) => { cols[c][r] = t; };
  const coin = (c, r) => lv.coins.push({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE });
  const deco = (c) => { if (rng() < 0.5) lv.deco.push({ x: (c + 0.5) * TILE, kind: ri(0, 2), size: ri(26, 44) }); };

  const flat = (n, coins = true) => {
    const start = cols.length;
    for (let i = 0; i < n; i++) { const c = col(); deco(c); }
    if (coins && rng() < 0.7) for (let i = 1; i < n - 1; i++) coin(start + i, GROUND - 1);
    return start;
  };

  const pit = () => {
    flat(2, false);
    const w = hard > 1.5 && rng() < 0.5 ? 3 : 2;
    const start = cols.length;
    for (let i = 0; i < w; i++) col(null);
    // an arc of coins shows the jump
    for (let i = 0; i < w; i++) coin(start + i, GROUND - 3);
    flat(2, false);
  };

  const hill = () => {
    flat(1, false);
    const tops = hard > 2 && rng() < 0.5 ? [1, 2, 2, 1] : [1, 2, 1];
    for (const up of tops) {
      for (let i = 0; i < 3; i++) { const c = col(GROUND - up); if (i === 1) coin(c, GROUND - up - 1); }
    }
    flat(1, false);
  };

  const enemies = () => {
    const n = ri(7, 9);
    const start = flat(n, false);
    const count = hard > 2.5 && rng() < 0.6 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      lv.enemies.push({
        x: (start + 3 + i * 3) * TILE, y: GROUND * TILE,
        minX: (start + 1) * TILE, maxX: (start + n - 1) * TILE,
      });
    }
  };

  const floaters = () => {
    const start = flat(11, false);
    for (const [dc, r] of [[1, GROUND - 2], [6, GROUND - 3]]) {
      for (let i = 0; i < 3; i++) { set(start + dc + i, r, T.BRICK); coin(start + dc + i, r - 1); }
    }
  };

  const springSecret = (gemIndex) => {
    const start = flat(10, false);
    lv.springs.push({ c: start + 1, r: GROUND - 1 });
    for (let i = 4; i <= 7; i++) { set(start + i, 5, T.BRICK); if (i !== 6) coin(start + i, 4); }
    lv.gems.push({ x: (start + 6.5) * TILE, y: 4.5 * TILE, i: gemIndex });
  };

  const stairSecret = (gemIndex) => {
    const start = flat(11, false);
    [[1, GROUND - 2], [4, GROUND - 4], [7, GROUND - 6]].forEach(([dc, r]) => {
      set(start + dc, r, T.BRICK);
      set(start + dc + 1, r, T.BRICK);
      coin(start + dc, r - 1);
    });
    lv.gems.push({ x: (start + 8.5) * TILE, y: (GROUND - 7.5) * TILE, i: gemIndex });
  };

  const station = () => {
    const start = flat(14, false);
    const blocks = STATION_SLOTS.map((dc) => {
      set(start + dc, BLOCK_ROW, T.BLOCK);
      set(start + dc + 1, BLOCK_ROW, T.BLOCK);
      return { c: start + dc, r: BLOCK_ROW };
    });
    const barrierC = start + 11;
    for (let r = 0; r < GROUND; r++) set(barrierC, r, T.BARRIER);
    lv.stations.push({ c0: start, blocks, barrierC });
  };

  const fillers = [flat.bind(null, 5), floaters];
  if (levelIndex >= 1) fillers.push(pit, hill);
  if (levelIndex >= 2) fillers.push(enemies, enemies);
  if (hard > 2) fillers.push(pit);

  flat(7, false);
  const secretAt = [0, 2, 4];
  for (let s = 0; s < stationsWanted; s++) {
    const gemIndex = secretAt.indexOf(s);
    const n = ri(2, 3);
    const secretPos = ri(0, n - 1);
    let afterSecret = false; // true when the previous chunk ends up high
    for (let i = 0; i < n; i++) {
      if (gemIndex >= 0 && i === secretPos) {
        (rng() < 0.5 ? springSecret : stairSecret)(gemIndex);
        afterSecret = true;
        continue;
      }
      // Never put a pit right where a jump down from a high place lands.
      let f = fillers[ri(0, fillers.length - 1)];
      if (afterSecret && f === pit) f = fillers[0];
      afterSecret = f === hill; // the same goes for hopping down off a hill
      f();
    }
    station();
  }
  const end = flat(10);
  lv.goalC = end + 6;

  lv.W = cols.length;
  lv.H = ROWS;
  lv.tiles = new Uint8Array(lv.W * ROWS);
  cols.forEach((c, x) => c.forEach((t, y) => { lv.tiles[y * lv.W + x] = t; }));
  lv.spawn = { x: 2.5 * TILE, y: GROUND * TILE };
  return lv;
}
