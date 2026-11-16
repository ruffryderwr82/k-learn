import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, WORLDS, PICTURES, makeQuestion, mulberry32, worldSkills } from '../js/curriculum.js';
import { isUnlocked, nextLevelIndex, worldMastery, hasPower } from '../js/progress.js';
import { generateLevel, T, GROUND, ROWS } from '../js/levelgen.js';

test('every level builds valid questions', () => {
  for (const level of LEVELS) {
    const rng = mulberry32(7);
    for (let i = 0; i < 300; i++) {
      const q = makeQuestion(level, {}, rng);
      assert.ok(q.say, `${level.id} has a spoken prompt`);
      assert.ok(q.choices.length === 2 || q.choices.length === 3, level.id);
      assert.ok(q.answer >= 0 && q.answer < q.choices.length, level.id);
      const labels = q.choices.map((c) => c.label);
      assert.equal(new Set(labels).size, labels.length, `${level.id} duplicate choices: ${labels}`);
      for (const c of q.choices) assert.ok(c.label, `${level.id} empty label`);
      // a hear-only question must not show its answer
      if (q.show?.text) assert.notEqual(q.show.text, q.choices[q.answer].label, level.id);
    }
  }
});

test('every word used in a picture level has a picture', () => {
  for (const level of LEVELS.filter((l) => l.poolKind === 'word')) {
    for (const w of level.pool) assert.ok(PICTURES[w], `${w} needs an emoji`);
  }
});

test('levels are unique and cover every world', () => {
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, LEVELS.length);
  WORLDS.forEach((_, i) => assert.ok(LEVELS.some((l) => l.world === i)));
});

test('weak items are asked more often', () => {
  const level = LEVELS[0];
  const mastery = Object.fromEntries(level.pool.slice(1).flatMap((l) => [[`n:${l}`, { b: 4 }]]));
  const rng = mulberry32(3);
  let weak = 0;
  for (let i = 0; i < 400; i++) if (makeQuestion(level, mastery, rng).item === level.pool[0]) weak++;
  assert.ok(weak > 200, `weak item asked ${weak} / 400`);
});

test('generated levels are well formed', () => {
  LEVELS.forEach((level, i) => {
    for (const variant of [0, 1, 2]) {
      const opts = { variant, boss: !!level.boss };
      const lv = generateLevel(i, level.world, opts);
      assert.equal(lv.stations.length, level.boss ? 1 : 6);
      assert.equal(!!lv.boss, !!level.boss);
      assert.equal(lv.gems.length, 3);
      assert.equal(lv.tiles.length, lv.W * ROWS);
      // no pit wider than 3 tiles unless a moving platform crosses it
      let run = 0;
      for (let c = 0; c < lv.W; c++) {
        const open = lv.tiles[GROUND * lv.W + c] === T.EMPTY && lv.tiles[(ROWS - 1) * lv.W + c] === T.EMPTY;
        const bridged = lv.movers.some((m) => c * 48 >= m.x0 && c * 48 < m.x1 + m.w);
        run = open && !bridged ? run + 1 : 0;
        assert.ok(run <= 3, `${level.id} pit too wide at ${c}`);
      }
      assert.deepEqual(generateLevel(i, level.world, opts).tiles, lv.tiles, 'same layout every time');
    }
    assert.notDeepEqual(generateLevel(i, level.world, { variant: 1 }).tiles, generateLevel(i, level.world, { variant: 0 }).tiles, 'variants differ');
  });
});

test('worlds are gated by mastery and bosses grant powers', () => {
  const state = { done: {}, mastery: {}, plays: {}, unlockAll: false };
  const bossIndex = LEVELS.findIndex((l) => l.boss);
  for (let i = 0; i < bossIndex; i++) state.done[LEVELS[i].id] = 1;
  assert.equal(isUnlocked(state, bossIndex), false, 'boss stays shut without mastery');
  assert.equal(LEVELS[nextLevelIndex(state)].world, 0, 'play button offers practice in the same world');
  assert.equal(LEVELS[nextLevelIndex(state)].boss, undefined);
  const { need } = worldMastery(state, 0);
  worldSkills(0).slice(0, need).forEach((k) => { state.mastery[k] = { b: 3 }; });
  assert.equal(isUnlocked(state, bossIndex), true, 'boss opens at the mastery gate');
  assert.equal(nextLevelIndex(state), bossIndex);
  assert.equal(isUnlocked(state, bossIndex + 1), false, 'next world needs the boss beaten');
  assert.equal(hasPower(state, 'double'), false);
  state.done[LEVELS[bossIndex].id] = 3;
  assert.equal(isUnlocked(state, bossIndex + 1), true);
  assert.equal(hasPower(state, 'double'), true);
  assert.equal(hasPower(state, 'dash'), false);
});
