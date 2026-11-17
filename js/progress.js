// Saved state: coins, unlocked levels, shop items and per-skill mastery.
import { LEVELS, POWERS, worldSkills, skillKey } from './curriculum.js';

const KEY = 'k-learn-save-v1';

const fresh = () => ({
  coins: 0,
  gemsSpent: 0,
  done: {},      // levelId -> best stars (1-3)
  plays: {},     // levelId -> times finished (picks which layout comes next)
  gems: {},      // levelId -> [bool, bool, bool]
  mastery: {},   // skillKey -> { b: box 0-4, s: seen, r: right first try }
  owned: [],
  color: 'sky',
  hat: 'none',
  pet: 'none',
  unlockAll: false,
  settings: { voice: true, sfx: true, music: true, kidName: '' },
  rescued: {},    // letter -> times freed (they live in the Letter Village)
  bonus: {},      // bonus game id -> best stars
  bonusGems: 0,
});

let memory = null; // fallback when storage is unavailable (private mode, sandboxed frames)

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = { ...fresh(), ...JSON.parse(raw) };
      s.settings = { ...fresh().settings, ...s.settings };
      return s;
    }
  } catch { /* fall through */ }
  return memory || fresh();
}

export function save(state) {
  memory = state;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* keep in memory only */ }
}

export function reset() {
  memory = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return fresh();
}

export const MASTERED = 3;
export const GATE = 0.8; // share of a world's skills that must be mastered to face its boss

// Leitner-style: a first-try right answer moves a skill up a box, a miss moves it down.
export function recordAnswer(state, key, firstTry) {
  const m = state.mastery[key] || (state.mastery[key] = { b: 0, s: 0, r: 0 });
  m.s++;
  if (firstTry) { m.r++; m.b = Math.min(4, m.b + 1); } else { m.b = Math.max(0, m.b - 1); }
}

const box = (state, key) => state.mastery[key]?.b || 0;

/** How close a world is to opening its boss door. */
export function worldMastery(state, world) {
  const keys = worldSkills(world);
  const have = keys.filter((k) => box(state, k) >= MASTERED).length;
  return { have, need: Math.ceil(keys.length * GATE), total: keys.length };
}

// Levels open one after another. A boss also needs the world's skills to be mastered,
// and the next world only opens once the boss is beaten.
export function isUnlocked(state, index) {
  if (state.unlockAll || index === 0) return true;
  if (!state.done[LEVELS[index - 1].id]) return false;
  const level = LEVELS[index];
  if (!level.boss || state.done[level.id]) return true;
  const m = worldMastery(state, level.world);
  return m.have >= m.need;
}

/** What the big Play button starts: the next new level, or practice where he is weakest. */
export function nextLevelIndex(state) {
  const fresh = LEVELS.findIndex((l, i) => !state.done[l.id] && isUnlocked(state, i));
  if (fresh !== -1) return fresh;
  // Everything open has been played: the boss door is still shut (or the game is finished).
  const gated = LEVELS.find((l) => !state.done[l.id]);
  const world = gated ? gated.world : LEVELS[LEVELS.length - 1].world;
  let best = 0;
  let bestScore = Infinity;
  LEVELS.forEach((l, i) => {
    if (l.world !== world || l.boss) return;
    const score = l.pool.reduce((n, item) => n + box(state, skillKey(l.types[0], item)), 0) / l.pool.length
      + (state.plays[l.id] || 0) * 0.01; // break ties toward the least played
    if (score < bestScore) { bestScore = score; best = i; }
  });
  return best;
}

export function hasPower(state, id) {
  if (state.unlockAll) return true;
  const world = POWERS.findIndex((p) => p.id === id);
  const boss = LEVELS.find((l) => l.boss && l.world === world);
  return !!(boss && state.done[boss.id]);
}

export function gemCount(state) {
  // gems found hidden in levels, plus one for the first finish of each bonus game
  return Object.values(state.gems).reduce((n, g) => n + g.filter(Boolean).length, 0) + (state.bonusGems || 0);
}

export const gemBalance = (state) => gemCount(state) - (state.gemsSpent || 0);
