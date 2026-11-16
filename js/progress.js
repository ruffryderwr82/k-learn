// Saved state: coins, unlocked levels, shop items and per-skill mastery.
import { LEVELS } from './curriculum.js';

const KEY = 'k-learn-save-v1';

const fresh = () => ({
  coins: 0,
  done: {},      // levelId -> best stars (1-3)
  gems: {},      // levelId -> [bool, bool, bool]
  mastery: {},   // skillKey -> { b: box 0-4, s: seen, r: right first try }
  owned: ['color:sky', 'hat:none'],
  color: 'sky',
  hat: 'none',
  unlockAll: false,
  settings: { voice: true, sfx: true, music: true },
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

// Leitner-style: a first-try right answer moves a skill up a box, a miss moves it down.
export function recordAnswer(state, key, firstTry) {
  const m = state.mastery[key] || (state.mastery[key] = { b: 0, s: 0, r: 0 });
  m.s++;
  if (firstTry) { m.r++; m.b = Math.min(4, m.b + 1); } else { m.b = Math.max(0, m.b - 1); }
}

export function isUnlocked(state, index) {
  if (state.unlockAll || index === 0) return true;
  return !!state.done[LEVELS[index - 1].id];
}

export function nextLevelIndex(state) {
  const i = LEVELS.findIndex((l) => !state.done[l.id]);
  return i === -1 ? LEVELS.length - 1 : i;
}

export function gemCount(state) {
  return Object.values(state.gems).reduce((n, g) => n + g.filter(Boolean).length, 0);
}
