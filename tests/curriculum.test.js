import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, WORLDS, PICTURES, SIGHT_WORDS, HEART, BONUSES, MINI, bonusLevel, critterFor, makeQuestion, mulberry32, worldSkills } from '../js/curriculum.js';
import { SOUNDS, segment } from '../js/sounds.js';
import { isUnlocked, nextLevelIndex, worldMastery, hasPower } from '../js/progress.js';
import { generateLevel, T, GROUND, ROWS } from '../js/levelgen.js';

test('every level builds valid questions, with and without recorded sounds', () => {
  for (const has of [() => false, () => true]) {
    for (const level of LEVELS) {
      const rng = mulberry32(7);
      for (let i = 0; i < 300; i++) {
        const q = makeQuestion(level, {}, rng, null, has);
        assert.ok(q.say, `${level.id} has a spoken prompt`);
        assert.ok(q.choices.length === 2 || q.choices.length === 3, level.id);
        assert.ok(q.answer >= 0 && q.answer < q.choices.length, level.id);
        const labels = q.choices.map((c) => c.label);
        assert.equal(new Set(labels).size, labels.length, `${level.id} duplicate choices: ${labels}`);
        for (const c of q.choices) assert.ok(c.label, `${level.id} empty label`);
        // a question must not show its own answer
        if (q.show?.text) assert.notEqual(q.show.text, q.choices[q.answer].label, level.id);
        // every recorded sound a script asks for must exist
        for (const part of [...(q.audio || []), ...(q.praiseAudio || [])]) if (part.s) assert.ok(SOUNDS[part.s], `${level.id} unknown sound ${part.s}`);
        if (!has()) {
          for (const part of [...(q.audio || []), ...(q.praiseAudio || [])]) assert.equal(part.s, undefined, `${level.id} ${q.type} needs recordings it does not have`);
          assert.notEqual(q.type, 'blend');
        }
        if (q.sequence) {
          assert.equal(q.sequence.map((c) => q.choices[c].label).join(''), q.item, 'spelling order spells the word');
        }
        // two letters that make the same sound are never offered against each other
        if (q.type === 'hearSound' || q.type === 'firstSound') {
          const sounds = q.choices.map((c) => c.sound);
          assert.equal(new Set(sounds).size, sounds.length, `${level.id} same-sound choices: ${labels}`);
        }
      }
    }
  }
});

test('letter names are spoken as the capital letter, never a respelling', () => {
  const q = makeQuestion({ ...LEVELS[0], types: ['nameL'], pool: ['a'] }, {}, mulberry32(1));
  assert.equal(q.say, 'Find the letter A.');
  assert.deepEqual(q.audio, ['Find the letter', { name: 'a' }]);
});

test('every word breaks into known sounds', () => {
  for (const w of Object.keys(PICTURES)) for (const part of segment(w)) assert.ok(SOUNDS[part.s], `${w}: ${part.g}`);
  const spelled = (w) => segment(w).map((p) => `${p.g}=${p.s}`).join(' ');
  assert.equal(spelled('cat'), 'c=k a=a t=t');
  assert.equal(spelled('ship'), 'sh=sh i=i p=p');
  assert.equal(spelled('duck'), 'd=d u=u ck=k');
  assert.equal(spelled('cake'), 'c=k a_e=ai k=k');
  assert.equal(spelled('train'), 't=t r=r ai=ai n=n');
  assert.equal(spelled('fox'), 'f=f o=o x=x');
});

test('teaching order: sounds first, and blending only with letters already taught', () => {
  const meadow = LEVELS.filter((l) => l.world === 0 && !l.boss);
  const taught = [];
  for (const level of meadow) {
    assert.equal(level.types[0], 'hearSound', 'letter levels lead with the sound');
    taught.push(...level.pool);
    for (const w of level.pools.blend || []) for (const ch of w) assert.ok(taught.includes(ch), `${level.id}: ${w} uses untaught ${ch}`);
  }
  assert.ok(meadow[1].pools.blend.length > 0, 'blending starts by the second letter set');
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
  const mastery = Object.fromEntries(level.pool.slice(1).flatMap((l) => [[`n:${l}`, { b: 4 }], [`s:${l}`, { b: 4 }]]));
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

test('sight words run through the whole progression', () => {
  assert.equal(new Set(SIGHT_WORDS).size, SIGHT_WORDS.length, 'no sight word is taught twice');
  for (const [w, idx] of Object.entries(HEART)) {
    assert.ok(SIGHT_WORDS.includes(w), `${w} is marked tricky but never taught`);
    for (const i of idx) assert.ok(i < w.length, w);
  }
  const taught = [];
  for (const level of LEVELS) {
    if (level.poolKind === 'sight') { taught.push(...level.pool); continue; }
    if (level.world === 0) { assert.ok(!level.types.includes('hear'), 'none before he can blend'); continue; }
    if (level.boss) continue;
    // every later level reviews exactly the sight words taught so far, as a minority of questions
    if (taught.length) {
      assert.deepEqual(level.pools.hear, taught, level.id);
      const share = level.types.filter((t) => t === 'hear').length / level.types.length;
      assert.ok(share > 0 && share <= 0.25, `${level.id} sight share ${share}`);
    }
  }
  assert.deepEqual(taught, SIGHT_WORDS, 'every set is taught, in order');
  // worlds 2 to 5 each teach two sets, need them for the boss door, and the boss asks them
  for (let w = 1; w < WORLDS.length; w++) {
    const own = LEVELS.filter((l) => l.world === w && l.poolKind === 'sight').flatMap((l) => l.pool);
    assert.equal(own.length, 12, WORLDS[w].name);
    for (const word of own) assert.ok(worldSkills(w).includes(`x:${word}`), `${word} gates ${WORLDS[w].name}`);
    assert.deepEqual(LEVELS.find((l) => l.world === w && l.boss).pools.hear, own);
  }
});

test('a bonus game after every third level, using only what has been taught', () => {
  assert.equal(BONUSES.length, 12);
  for (const w of WORLDS.keys()) assert.ok(BONUSES.filter((b) => b.world === w).length >= 2, `world ${w} has bonus games`);
  for (const g of MINI) assert.equal(BONUSES.filter((b) => b.game === g.id).length, 3, `${g.id} comes up three times`);
  for (const b of BONUSES) {
    assert.ok(!LEVELS[b.after].boss && LEVELS[b.after].world === b.world, b.id);
    const level = bonusLevel(b);
    assert.ok(level.pool.length >= 3, `${b.id} has enough to ask`);
    for (const has of [() => false, () => true]) {
      const rng = mulberry32(11);
      for (let i = 0; i < 150; i++) {
        const q = makeQuestion(level, {}, rng, null, has);
        assert.ok(q.choices.length >= 2 && q.answer >= 0, b.id);
        if (b.game === 'train') { assert.ok(PICTURES[q.item], `${b.id} train word ${q.item} has a picture`); assert.ok(segment(q.item).length <= 4); }
        if (b.game === 'rocket') assert.equal(q.sequence.length, 3, `${b.id} spells a three-sound word`);
        // nothing a child has not been taught yet
        if (typeof q.item === 'string' && PICTURES[q.item]) {
          const met = LEVELS.slice(0, b.after + 1).some((l) => [l.pool, ...Object.values(l.pools)].some((list) => list.includes(q.item)));
          assert.ok(met, `${b.id}: ${q.item} not taught yet`);
        }
      }
    }
  }
});

test('every right answer frees a letter critter', () => {
  for (const level of LEVELS) {
    const rng = mulberry32(5);
    for (let i = 0; i < 60; i++) {
      const letter = critterFor(makeQuestion(level, {}, rng, null, () => true));
      assert.match(letter, /^[a-z]$/, level.id);
    }
  }
});

// ---- no mismatched letters, words or pictures ----------------------------------------------
const { keyWord, namesFor, LETTERS: LETTER_KEYS } = await import('../js/curriculum.js');
const { soundOf } = await import('../js/sounds.js');

test('every letter\'s example word starts with that letter and its sound (ends, for x)', () => {
  for (const [l, info] of Object.entries(LETTER_KEYS)) {
    const parts = segment(info.word.replace(/[^a-z]/g, ''));
    const unit = info.end ? parts[parts.length - 1] : parts[0];
    assert.ok(unit.g.startsWith(l), `${l}: ${info.word} does not ${info.end ? 'end' : 'start'} with ${l}`);
    assert.equal(unit.s, soundOf(l), `${l}: ${info.word} does not ${info.end ? 'end' : 'start'} with the sound of ${l}`);
  }
});

test('no question pairs a letter with a word, or a picture with a name, that does not fit', () => {
  const where = (parts, pos) => (pos === 'start' ? [parts[0]] : pos === 'end' ? [parts[parts.length - 1]] : parts);
  const levels = [...LEVELS, ...BONUSES.map(bonusLevel)];
  for (const has of [() => false, () => true]) {
    for (const level of levels) {
      const rng = mulberry32(21);
      for (let i = 0; i < 300; i++) {
        const q = makeQuestion(level, {}, rng, null, has);
        const ans = q.choices[q.answer];
        const at = `${level.id} ${q.type} "${q.item}"`;
        if (q.type === 'hearSound') {
          // the example word must contain the letters asked about, making that sound, in that place
          const key = keyWord(q.item);
          const parts = segment(key.word.replace(/[^a-z]/g, ''));
          assert.ok(where(parts, key.pos).some((p) => p.g.startsWith(q.item) && p.s === soundOf(q.item)), `${at}: example word "${key.word}" does not have "${q.item}" at the ${key.pos}`);
          assert.ok(!q.say.includes('.') || q.say.startsWith(`${key.word}.`), at);
          // only one choice makes the sound
          assert.equal(q.choices.filter((c) => c.sound === soundOf(q.item)).length, 1, `${at}: two choices make the same sound`);
        }
        if (q.type === 'starts') {
          const L = LETTER_KEYS[q.item];
          const sound = soundOf(q.item);
          for (const c of q.choices) {
            const word = Object.values(LETTER_KEYS).find((x) => x.emoji === c.label).word;
            const clash = namesFor(word).some((n) => {
              const parts = segment(n.replace(/[^a-z]/g, ''));
              return (L.end ? parts[parts.length - 1] : parts[0])?.s === sound;
            });
            if (c === ans) assert.ok(clash, `${at}: the answer ${word} does not fit`);
            else assert.ok(!clash, `${at}: wrong picture ${word} could also fit`);
          }
        }
        if (['firstSound', 'lastSound', 'midSound'].includes(q.type)) {
          const parts = segment(q.item);
          const unit = parts[q.type === 'firstSound' ? 0 : q.type === 'lastSound' ? parts.length - 1 : 1];
          assert.equal(ans.label, unit.g, `${at}: answer is not the word's own spelling`);
          assert.equal(q.choices.filter((c) => c.sound === unit.s).length, 1, `${at}: two choices make the same sound`);
        }
        const pictures = q.choices.filter((c) => c.kind === 'emoji' && c.say && PICTURES[c.say]);
        if (pictures.length === q.choices.length) {
          // a set of pictures: none could share a name or look the same
          assert.equal(new Set(pictures.map((c) => c.label)).size, pictures.length, `${at}: two pictures look the same`);
          for (const a of pictures) for (const b of pictures) {
            if (a !== b) assert.ok(!namesFor(a.say).some((n) => namesFor(b.say).includes(n)), `${at}: ${a.say} and ${b.say} could have the same name`);
          }
        }
        if (q.type === 'pic2word') {
          for (const c of q.choices) if (c !== ans) assert.ok(!namesFor(q.item).includes(c.label), `${at}: "${c.label}" is another name for the picture`);
        }
      }
    }
  }
});
