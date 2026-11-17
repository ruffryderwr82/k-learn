import test from 'node:test';
import assert from 'node:assert/strict';

// a tiny stand-in for the browser's localStorage
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

const { LEVELS, BONUSES } = await import('../js/curriculum.js');
const store = await import('../js/progress.js');

test('level and bonus ids come from content, not position', () => {
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, LEVELS.length);
  assert.equal(new Set(BONUSES.map((b) => b.id)).size, BONUSES.length);
  for (const l of LEVELS) assert.match(l.id, /^[a-z]+:[a-z0-9-]+$/, l.id);
  assert.equal(LEVELS.find((l) => l.world === 1 && l.title === 'blend it').id, 'canyon:blend-it');
});

test('a save from the old version keeps all its progress', () => {
  const blendIt = LEVELS.find((l) => l.id === 'canyon:blend-it');
  const old = {
    coins: 321,
    done: { 'meadow-1': 3, [blendIt.legacyId]: 2, 'meadow-boss': 1 },
    gems: { 'meadow-1': [true, false, true] },
    plays: { 'meadow-1': 4 },
    bonus: { 'bonus-1': 3 },
    mastery: { 's:a': { b: 4, s: 9, r: 8 } },
    rescued: { a: 2 },
    settings: { voice: false },
  };
  const s = store.migrate(old);
  assert.equal(s.saveVersion, store.SAVE_VERSION);
  assert.equal(s.coins, 321);
  assert.deepEqual(s.done, { 'meadow:s-a-t-p': 3, 'canyon:blend-it': 2, 'meadow:boss': 1 });
  assert.deepEqual(s.gems, { 'meadow:s-a-t-p': [true, false, true] });
  assert.deepEqual(s.plays, { 'meadow:s-a-t-p': 4 });
  assert.deepEqual(s.bonus, { [BONUSES[0].id]: 3 });
  assert.deepEqual(s.mastery, old.mastery);
  assert.deepEqual(s.rescued, { a: 2 });
  assert.equal(s.settings.voice, false, 'settings kept');
  assert.equal(s.settings.music, true, 'new settings filled in');
  // migrating twice changes nothing
  assert.deepEqual(store.migrate(s), s);
});

test('an old save in storage is converted on load, then saved in the new form', () => {
  mem.clear();
  localStorage.setItem('k-learn-save-v1', JSON.stringify({ coins: 50, done: { 'meadow-1': 3 } }));
  const s = store.load();
  assert.equal(s.coins, 50);
  assert.equal(s.done['meadow:s-a-t-p'], 3);
  assert.equal(store.isUnlocked(s, 1), true, 'the next level is still open');
  store.save(s);
  assert.equal(JSON.parse(localStorage.getItem('k-learn-save-v1')).saveVersion, store.SAVE_VERSION);
});

test('every save keeps the one before it as a backup', () => {
  mem.clear();
  const s = store.load();
  s.coins = 10;
  store.save(s);
  s.coins = 20;
  store.save(s);
  assert.equal(JSON.parse(localStorage.getItem('k-learn-save-v1-backup')).coins, 10);
});

test('an unreadable save is set aside, not overwritten, and the backup is used', () => {
  mem.clear();
  const s = store.load();
  s.coins = 77;
  store.save(s);
  store.save(s); // backup now holds coins 77 too
  localStorage.setItem('k-learn-save-v1', '{"coins": 99, "do'); // cut off half-way through
  const loaded = store.load();
  assert.equal(loaded.coins, 77, 'progress comes back from the backup');
  const aside = [...mem.keys()].find((k) => k.startsWith('k-learn-save-v1-unreadable-'));
  assert.ok(aside, 'the damaged save is kept to one side');
  assert.equal(mem.get(aside), '{"coins": 99, "do');
});

test('erasing progress keeps the old save as the backup', () => {
  mem.clear();
  const s = store.load();
  s.coins = 500;
  store.save(s);
  const fresh = store.reset();
  assert.equal(fresh.coins, 0);
  assert.equal(JSON.parse(localStorage.getItem('k-learn-save-v1-backup')).coins, 500);
});
