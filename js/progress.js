// Saved state: coins, unlocked levels, shop items and per-skill mastery.
//
// Keeping it safe:
//  - The save lives in the app's web storage, which app updates keep (the app id, signing key
//    and web address it runs at never change; see capacitor.config.json).
//  - Before each save, the previous one is kept as a backup. A save that cannot be read is
//    set aside, never silently replaced, and the backup is used instead.
//  - In the Android app a second copy goes to native storage, which Android also includes in
//    its device backup. If the web storage is ever empty, that copy is restored.
//  - Saves carry a version number, and older saves are converted forward, never discarded.
import { LEVELS, BONUSES, POWERS, worldSkills, skillKey } from './curriculum.js';
import { prefGet, prefSet, hasNative } from './native.js';

const KEY = 'k-learn-save-v1';          // keep this name forever: changing it would lose every save
const BACKUP = `${KEY}-backup`;
const NATIVE_KEY = 'k-learn-save';
export const SAVE_VERSION = 2;

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
  saveVersion: SAVE_VERSION,
  savedAt: 0,     // when this save was written (to pick the newest copy)
});

let memory = null; // fallback when storage is unavailable (private mode, sandboxed frames)
let nativeChecked = !hasNative(); // do not write the native copy until it has been read once

/** Bring a save from any earlier version of the game up to date. Nothing is thrown away. */
export function migrate(raw) {
  const s = { ...fresh(), ...raw };
  s.settings = { ...fresh().settings, ...(raw.settings || {}) };
  if ((raw.saveVersion || 1) < 2) {
    // version 1 named levels by position (canyon-3); now they are named by content (canyon:blend-it)
    const levels = Object.fromEntries(LEVELS.map((l) => [l.legacyId, l.id]));
    for (const field of ['done', 'gems', 'plays']) {
      s[field] = Object.fromEntries(Object.entries(s[field] || {}).map(([k, v]) => [levels[k] || k, v]));
    }
    const bonuses = Object.fromEntries(BONUSES.map((b) => [b.legacyId, b.id]));
    s.bonus = Object.fromEntries(Object.entries(s.bonus || {}).map(([k, v]) => [bonuses[k] || k, v]));
  }
  s.saveVersion = SAVE_VERSION;
  return s;
}

function parse(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? migrate(data) : null;
  } catch { return null; }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const s = parse(raw);
    if (s) return s;
    if (raw) {
      // unreadable: set it aside rather than overwrite it, and fall back to the backup
      localStorage.setItem(`${KEY}-unreadable-${Date.now()}`, raw);
    }
    const backup = parse(localStorage.getItem(BACKUP));
    if (backup) return backup;
  } catch { /* storage unavailable */ }
  return memory || fresh();
}

export function save(state) {
  memory = state;
  state.saveVersion = SAVE_VERSION;
  state.savedAt = Date.now();
  const json = JSON.stringify(state);
  try {
    const prev = localStorage.getItem(KEY);
    if (prev && parse(prev)) localStorage.setItem(BACKUP, prev);
    localStorage.setItem(KEY, json);
  } catch { /* keep in memory only */ }
  if (nativeChecked) prefSet(NATIVE_KEY, json);
}

/**
 * In the Android app: read the native copy of the save. Returns it if it is newer than
 * `current` (for example after the web storage was reset), otherwise null.
 */
export async function restoreNative(current) {
  if (!hasNative()) return null;
  const copy = parse(await prefGet(NATIVE_KEY));
  nativeChecked = true;
  if (copy && (copy.savedAt || 0) > (current.savedAt || 0)) return copy;
  if ((current.savedAt || 0) > 0) prefSet(NATIVE_KEY, JSON.stringify(current)); // bring the copy up to date
  return null;
}

export function reset() {
  memory = null;
  try {
    // the old save is kept as the backup, so "Erase all progress" can still be undone by hand
    const prev = localStorage.getItem(KEY);
    if (prev) localStorage.setItem(BACKUP, prev);
    localStorage.removeItem(KEY);
  } catch { /* ignore */ }
  const s = fresh();
  if (nativeChecked) prefSet(NATIVE_KEY, JSON.stringify(s));
  return s;
}

export const MASTERED = 3;

// How much a world's boss door asks for, chosen on the grown-ups page. Levels always open one
// after another, so reaching the boss already means every level in the world is finished.
//   relaxed   finishing the levels is enough
//   balanced  ...and about half the world's letters or words answered right first time twice
//   strict    ...and 80% of them known well (right first time three times)
export const DOOR_RULES = {
  relaxed: { share: 0, box: 0 },
  balanced: { share: 0.5, box: 2 },
  strict: { share: 0.8, box: 3 },
};
export const doorRule = (state) => DOOR_RULES[state.settings?.door] || DOOR_RULES.balanced;

// Leitner-style: a first-try right answer moves a skill up a box, a miss moves it down.
export function recordAnswer(state, key, firstTry) {
  const m = state.mastery[key] || (state.mastery[key] = { b: 0, s: 0, r: 0 });
  m.s++;
  if (firstTry) { m.r++; m.b = Math.min(4, m.b + 1); } else { m.b = Math.max(0, m.b - 1); }
}

const box = (state, key) => state.mastery[key]?.b || 0;

/** How close a world is to opening its boss door. */
export function worldMastery(state, world) {
  const rule = doorRule(state);
  const keys = worldSkills(world);
  const have = keys.filter((k) => box(state, k) >= rule.box).length;
  return { have: rule.share ? have : 0, need: Math.ceil(keys.length * rule.share), total: keys.length };
}

/**
 * The grown-up's stop point: the last level that can be played, as an index into LEVELS
 * (Infinity when there is none). Everything after it stays shut, even levels already won,
 * so he practises what came before.
 */
export function stopIndex(state) {
  if (!state.stopAt) return Infinity;
  const i = LEVELS.findIndex((l) => l.id === state.stopAt);
  return i === -1 ? Infinity : i;
}
export const pausedByGrownUp = (state, index) => index > stopIndex(state);

// Levels open one after another. A boss also needs its door open (see DOOR_RULES), and the
// next world only opens once the boss is beaten. Nothing past the grown-up's stop point opens.
export function isUnlocked(state, index) {
  if (pausedByGrownUp(state, index)) return false;
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
  // Everything open has been played. If a grown-up set a stop point, practise the weakest
  // level anywhere before it; otherwise the boss door is still shut (or the game is finished),
  // so practise the weakest level in that world.
  const stop = stopIndex(state);
  const gated = LEVELS.find((l) => !state.done[l.id]);
  const world = gated ? gated.world : LEVELS[LEVELS.length - 1].world;
  const inRange = (l, i) => (stop < Infinity ? i <= stop : l.world === world);
  let best = Math.min(0, stop);
  let bestScore = Infinity;
  LEVELS.forEach((l, i) => {
    if (!inRange(l, i) || l.boss || !isUnlocked(state, i)) return;
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

// for the tests
export const __forTests = { worldSkills };
