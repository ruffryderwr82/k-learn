import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, WORLDS, PICTURES, makeQuestion, mulberry32 } from '../js/curriculum.js';
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
    const lv = generateLevel(i, level.world);
    assert.equal(lv.stations.length, 6);
    assert.equal(lv.gems.length, 3);
    assert.equal(lv.tiles.length, lv.W * ROWS);
    // no pit wider than 3 tiles
    let run = 0;
    for (let c = 0; c < lv.W; c++) {
      run = lv.tiles[GROUND * lv.W + c] === T.EMPTY && lv.tiles[(ROWS - 1) * lv.W + c] === T.EMPTY ? run + 1 : 0;
      assert.ok(run <= 3, `${level.id} pit too wide at ${c}`);
    }
    assert.deepEqual(generateLevel(i, level.world).tiles, lv.tiles, 'same level every time');
  });
});
