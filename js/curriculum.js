// Curriculum: what gets taught, in what order, and how a question is built.
// Everything here is plain data + pure functions so it can be unit tested in Node.
//
// The method is systematic synthetic phonics ("sounding out"):
//   1. teach what sound each letter makes, a few letters at a time, useful ones first
//   2. start blending those sounds into words straight away
//   3. practise hearing the sounds inside words (first, last, middle) and spelling by sound
//   4. only ask the child to read words made of sounds already taught
//   5. teach the few irregular words by sounding out what can be and marking the tricky part
import { SOUNDS, soundOf, segment, soundsIn } from './sounds.js';

// Each letter with a key word that starts with its sound.
export const LETTERS = {
  a: { word: 'apple', emoji: '🍎' },
  b: { word: 'ball', emoji: '🏀' },
  c: { word: 'cat', emoji: '🐱' },
  d: { word: 'dog', emoji: '🐶' },
  e: { word: 'egg', emoji: '🥚' },
  f: { word: 'fish', emoji: '🐟' },
  g: { word: 'goat', emoji: '🐐' },
  h: { word: 'hat', emoji: '🎩' },
  i: { word: 'iguana', emoji: '🦎' },
  j: { word: 'juice', emoji: '🧃' },
  k: { word: 'kite', emoji: '🪁' },
  l: { word: 'lion', emoji: '🦁' },
  m: { word: 'moon', emoji: '🌙' },
  n: { word: 'nose', emoji: '👃' },
  o: { word: 'octopus', emoji: '🐙' },
  p: { word: 'pig', emoji: '🐷' },
  q: { word: 'queen', emoji: '👸' },
  r: { word: 'rocket', emoji: '🚀' },
  s: { word: 'sun', emoji: '☀️' },
  t: { word: 'turtle', emoji: '🐢' },
  u: { word: 'umbrella', emoji: '☂️' },
  v: { word: 'volcano', emoji: '🌋' },
  w: { word: 'wolf', emoji: '🐺' },
  x: { word: 'fox', emoji: '🦊', end: true }, // x is taught as an ending sound
  y: { word: 'yarn', emoji: '🧶' },
  z: { word: 'zebra', emoji: '🦓' },
};

// A letter's name is spoken by handing the voice the capital letter on its own ("A"), which
// engines read as the letter name. Phonetic respellings ("ay") are unreliable: some voices
// read that one as "eye". A grown-up can also record any letter name to override the voice.
for (const [l, v] of Object.entries(LETTERS)) v.name = l.toUpperCase();

// Letters are introduced in a phonics-friendly order (useful sounds first,
// look-alikes such as b/d kept apart) rather than alphabetically.
const LETTER_GROUPS = ['satp', 'inmd', 'gock', 'eur', 'hbfl', 'jvw', 'xyzq'].map((g) => [...g]);

// Picturable words. Every word here has an emoji a child can name.
export const PICTURES = {
  // short a
  cat: '🐱', hat: '🎩', bat: '🦇', van: '🚐', pan: '🍳', can: '🥫', map: '🗺️', cap: '🧢', rat: '🐀', man: '👨',
  // short i
  pig: '🐷', pin: '📌', lip: '👄', six: '6️⃣', kid: '🧒', zip: '🤐',
  // short o
  dog: '🐶', fox: '🦊', box: '📦', pot: '🍲', log: '🪵', cop: '👮',
  // short u
  sun: '☀️', bug: '🐛', bus: '🚌', cup: '🥤', nut: '🥜', tub: '🛁', hug: '🤗', run: '🏃',
  // short e
  bed: '🛏️', hen: '🐔', web: '🕸️', leg: '🦵', ten: '🔟', pen: '🖊️', net: '🥅', jet: '✈️',
  // digraphs
  ship: '🚢', fish: '🐟', shell: '🐚', chick: '🐥', bath: '🛁', duck: '🦆', sock: '🧦', lock: '🔒', king: '🤴', ring: '💍',
  // blends
  frog: '🐸', crab: '🦀', drum: '🥁', flag: '🚩', sled: '🛷', swim: '🏊', clap: '👏', stop: '🛑', hand: '✋', milk: '🥛', tent: '⛺', gift: '🎁',
  // silent e
  cake: '🎂', bike: '🚲', kite: '🪁', bone: '🦴', rose: '🌹', nose: '👃', snake: '🐍', whale: '🐳', five: '5️⃣', nine: '9️⃣', home: '🏠', cone: '🍦',
  // vowel teams
  bee: '🐝', tree: '🌳', feet: '🦶', sheep: '🐑', rain: '🌧️', snail: '🐌', train: '🚂', boat: '⛵', goat: '🐐', soap: '🧼', leaf: '🍃', moon: '🌙', spoon: '🥄', book: '📖',
  // r-controlled
  star: '⭐', car: '🚗', corn: '🌽', fork: '🍴', bird: '🐦', shark: '🦈', horse: '🐴',
};

// Extra decodable words (no picture) used only as look-alike wrong answers.
const DECOYS = (
  'cot cut cap cab can cub hit hot hut hop hip ban bag big bin bit bun bud bad dig dot dug den did ' +
  'fan fin fun fog fit fed got get gum hen him ham jam jog lap lid lot log mad mat men mop mud nap ' +
  'not nod pat pet pit pop pup rag rib rod rug sad set sip sit sob tag tap tip top tug wag wet win ' +
  'shop shed shut chip chop chat thin then them back kick pick rock luck sing song long wing ' +
  'flip flat from crib drip drop slip slid spot step skip plan plum trip trap hunt mint tend golf ' +
  'cape bite kit bake lake like line hole hope rope nine note cane tame dime ' +
  'beet tray trail boot seat seal soak loaf main mean feel shop stir cart cord bark hose burn'
).split(' ');

// Sight words (high-frequency words), in the order they are taught: eight sets of six,
// two per world from Sound Canyon on. They start as soon as blending does.
const SIGHT_SETS = [
  ['I', 'a', 'the', 'is', 'to', 'and'],
  ['it', 'in', 'at', 'on', 'can', 'not'],
  ['he', 'she', 'we', 'me', 'be', 'my'],
  ['you', 'see', 'go', 'no', 'so', 'do'],
  ['like', 'said', 'was', 'are', 'look', 'have'],
  ['they', 'with', 'what', 'here', 'come', 'of'],
  ['for', 'her', 'all', 'one', 'two', 'out'],
  ['there', 'were', 'some', 'when', 'your', 'want'],
];

// Which letters of a sight word do not say what the child expects. Those are learned
// "by heart" and shown in red; the rest of the word is still sounded out. Words missing
// here (it, in, can, and ...) are fully decodable and get no red letters.
export const HEART = {
  I: [0], a: [0], the: [2], is: [1], to: [1],
  he: [1], she: [2], we: [1], me: [1], be: [1], my: [1],
  you: [1, 2], go: [1], no: [1], so: [1], do: [1],
  like: [3], said: [1, 2], was: [1, 2], are: [0, 1, 2], have: [3],
  they: [2, 3], what: [1, 2], here: [2, 3], come: [1, 3], of: [0, 1],
  all: [0], one: [0, 1, 2], two: [1, 2], out: [0, 1],
  there: [2, 3, 4], were: [1, 2, 3], some: [1, 3], your: [1, 2, 3], want: [1],
};

// Read the sentence, pick the picture.
const SENTENCE_PICS = [
  ['I see a red bug.', '🐞', ['🐸', '🐟']],
  ['It is a big ship.', '🚢', ['🚗', '🚲']],
  ['A frog can hop.', '🐸', ['🐟', '🐌']],
  ['The cat is on a bed.', '🛏️', ['📦', '🚌']],
  ['A duck can swim.', '🦆', ['🐔', '🐱']],
  ['I like to ride my bike.', '🚲', ['🚂', '⛵']],
  ['The bee is on a rose.', '🌹', ['🌳', '🍃']],
  ['We can see the moon.', '🌙', ['☀️', '🌧️']],
  ['She has a gift for you.', '🎁', ['🥛', '🧦']],
  ['He will bake a cake.', '🎂', ['🌽', '🍦']],
  ['A snail is on the leaf.', '🍃', ['🪵', '🐚']],
  ['The king has a ring.', '💍', ['🧢', '🥁']],
  ['Look at the train go!', '🚂', ['🚗', '✈️']],
  ['The shark has a fin.', '🦈', ['🐑', '🐴']],
];

// Read the sentence, decide if it is true or silly.
const SENTENCE_YN = [
  ['A fish can swim.', true], ['A pig can fly.', false], ['The sun is hot.', true],
  ['A bus is big.', true], ['A cat can drive a van.', false], ['A dog has six legs.', false],
  ['A frog can hop.', true], ['A bed can run.', false], ['A bee can buzz.', true],
  ['A snake has feet.', false], ['We sleep in a bed.', true], ['A whale is small.', false],
  ['Rain is wet.', true], ['A tree can talk.', false], ['A bird can sing.', true],
  ['You can eat a rock.', false], ['A horse can run fast.', true], ['Corn is a snack.', true],
];

export const SIGHT_WORDS = SIGHT_SETS.flat();

export const WORLDS = [
  { id: 'meadow', name: 'Letter Meadow', icon: '🌼', goal: 'The sound each letter makes' },
  { id: 'canyon', name: 'Sound Canyon', icon: '🌵', goal: 'Hearing sounds in words, blending, first sight words' },
  { id: 'woods', name: 'Word Woods', icon: '🍄', goal: 'Sounding out and spelling short words, more sight words' },
  { id: 'sky', name: 'Sky Islands', icon: '☁️', goal: 'sh ch th ck ng, blends, sight words' },
  { id: 'summit', name: 'Story Summit', icon: '❄️', goal: 'First grade: long vowels, sight words, sentences' },
];

const words = (s) => s.split(' ');
const CVC = {
  a: words('cat hat bat van pan can map cap rat man'),
  i: words('pig pin lip six kid zip'),
  o: words('dog fox box pot log cop'),
  u: words('sun bug bus cup nut tub hug run'),
  e: words('bed hen web leg ten pen net jet'),
};
const ALL_CVC = Object.values(CVC).flat();

// Words that can be spelled by bumping three different letters in order.
const buildable = (list) => list.filter((w) => w.length === 3 && new Set(w).size === 3 && segment(w).length === 3);

// Question types that ask about a word rather than a letter.
const WORD_TYPES = new Set(['firstSound', 'lastSound', 'midSound', 'blend', 'soundout', 'build', 'pic2word', 'word2pic']);

function buildLevels() {
  const L = [];
  // pools: extra item lists for question types that do not use the level's main pool
  const add = (world, title, types, pool, extra = {}) => {
    const prev = L.filter((l) => l.world === world && l.poolKind === extra.poolKind);
    const review = [...new Set(prev.flatMap((l) => l.pool))];
    L.push({ id: `${WORLDS[world].id}-${L.filter((l) => l.world === world).length + 1}`, world, title, types, pool, review, pools: {}, ...extra });
  };
  // Each world ends with a boss fight that asks about everything taught in that world.
  const boss = (world, types, poolKind, pools = {}) => {
    const pool = [...new Set(L.filter((l) => l.world === world && l.poolKind === poolKind).flatMap((l) => l.pool))];
    add(world, 'Boss', types, pool, { poolKind, boss: true, id: `${WORLDS[world].id}-boss`, review: [], pools });
  };

  // World 1: the sound each letter makes (and its name), a few letters at a time.
  // From the second set on there are enough letters to blend real words, so blending starts here.
  const taught = [];
  LETTER_GROUPS.forEach((g) => {
    taught.push(...g);
    const decodable = ALL_CVC.filter((w) => [...w].every((ch) => taught.includes(ch)));
    add(0, g.join(' '), ['hearSound', 'hearSound', 'starts', 'nameL', 'nameU', 'match', 'blend'], g, { poolKind: 'letter', pools: { blend: decodable } });
  });
  add(0, 'a to z', ['hearSound', 'hearSound', 'starts', 'nameL', 'match', 'blend'], Object.keys(LETTERS), { poolKind: 'letter', pools: { blend: ALL_CVC } });
  boss(0, ['hearSound', 'starts'], 'letter');

  // World 2: hear the sounds inside words, then push sounds together to read.
  add(1, 'first sound', ['firstSound'], CVC.a, { poolKind: 'word' });
  add(1, 'last sound', ['lastSound', 'firstSound'], [...CVC.i, ...CVC.o], { poolKind: 'word' });
  add(1, 'middle sound', ['midSound', 'lastSound'], [...CVC.u, ...CVC.e], { poolKind: 'word' });
  add(1, 'blend it', ['blend'], [...CVC.a, ...CVC.i], { poolKind: 'blend' });
  add(1, 'blend more', ['blend'], [...CVC.o, ...CVC.u, ...CVC.e], { poolKind: 'blend' });
  add(1, SIGHT_SETS[0].slice(0, 3).join(', ') + '...', ['hear'], SIGHT_SETS[0], { poolKind: 'sight' });
  add(1, 'sound buttons', ['soundout', 'blend'], [...CVC.a, ...CVC.i], { poolKind: 'blend' });
  add(1, 'more buttons', ['soundout', 'soundout', 'blend'], [...CVC.o, ...CVC.u, ...CVC.e], { poolKind: 'blend' });
  add(1, SIGHT_SETS[1].slice(0, 3).join(', ') + '...', ['hear'], SIGHT_SETS[1], { poolKind: 'sight' });
  add(1, 'build a word', ['build', 'soundout'], buildable([...CVC.a, ...CVC.i, ...CVC.o]), { poolKind: 'spell' });
  boss(1, ['soundout', 'blend'], 'blend');

  // World 3: read and spell short-vowel words without help, one vowel at a time.
  for (const [v, pool] of Object.entries(CVC)) {
    add(2, `short ${v}`, ['word2pic', 'pic2word', 'build'], pool, { poolKind: 'word', pools: { build: buildable(pool) } });
    if (v === 'i') add(2, SIGHT_SETS[2].slice(0, 3).join(', ') + '...', ['hear'], SIGHT_SETS[2], { poolKind: 'sight' });
  }
  add(2, SIGHT_SETS[3].slice(0, 3).join(', ') + '...', ['hear'], SIGHT_SETS[3], { poolKind: 'sight' });
  add(2, 'mix it up', ['word2pic', 'word2pic', 'pic2word', 'build'], ALL_CVC, { poolKind: 'word', pools: { build: buildable(ALL_CVC) } });
  boss(2, ['word2pic', 'pic2word'], 'word');

  // World 4: two letters, one sound. The new sound is taught first, then read in words.
  add(3, 'sh ch th', ['word2pic', 'hearSound', 'pic2word'], words('ship fish shell chick bath'), { poolKind: 'word', pools: { hearSound: ['sh', 'ch', 'th'] } });
  add(3, SIGHT_SETS[4].slice(0, 3).join(', ') + '...', ['hear'], SIGHT_SETS[4], { poolKind: 'sight' });
  add(3, 'ck ng', ['word2pic', 'hearSound', 'pic2word'], words('duck sock lock king ring'), { poolKind: 'word', pools: { hearSound: ['ck', 'ng'] } });
  add(3, 'blends', ['word2pic', 'pic2word'], words('frog crab drum flag sled swim'), { poolKind: 'word' });
  add(3, SIGHT_SETS[5].slice(0, 3).join(', ') + '...', ['hear'], SIGHT_SETS[5], { poolKind: 'sight' });
  add(3, 'more blends', ['word2pic', 'pic2word'], words('clap stop hand milk tent gift'), { poolKind: 'word' });
  add(3, 'silly or true?', ['yesno'], SENTENCE_YN.slice(0, 9).map((_, i) => i), { poolKind: 'yn' });
  boss(3, ['word2pic', 'pic2word'], 'word', { hearSound: ['sh', 'ch', 'th', 'ck', 'ng'] });

  // World 5: first grade.
  add(4, 'magic e', ['word2pic', 'pic2word'], words('cake bike kite bone rose nose'), { poolKind: 'word' });
  add(4, 'more magic e', ['word2pic', 'pic2word'], words('snake whale five nine home cone'), { poolKind: 'word' });
  add(4, SIGHT_SETS[6].slice(0, 3).join(', ') + '...', ['hear'], SIGHT_SETS[6], { poolKind: 'sight' });
  add(4, 'ee ai', ['word2pic', 'hearSound', 'pic2word'], words('bee tree feet sheep rain snail train'), { poolKind: 'word', pools: { hearSound: ['ee', 'ai'] } });
  add(4, SIGHT_SETS[7].slice(0, 3).join(', ') + '...', ['hear'], SIGHT_SETS[7], { poolKind: 'sight' });
  add(4, 'oa ea oo', ['word2pic', 'hearSound', 'pic2word'], words('boat goat soap leaf moon spoon book'), { poolKind: 'word', pools: { hearSound: ['oa', 'oo'] } });
  add(4, 'ar or ir', ['word2pic', 'hearSound', 'pic2word'], words('star car corn fork bird shark horse'), { poolKind: 'word', pools: { hearSound: ['ar', 'or', 'ir'] } });
  add(4, 'read and find', ['sentpic'], SENTENCE_PICS.map((_, i) => i), { poolKind: 'sp' });
  add(4, 'story time', ['sentpic', 'yesno2'], SENTENCE_PICS.map((_, i) => i), { poolKind: 'sp' });
  boss(4, ['word2pic', 'pic2word'], 'word');

  // Sight words need far more repetition than one level gives, so once a set has been
  // taught it keeps coming back: every later level mixes in the sight words learned so
  // far, and each boss asks the ones from its own world.
  const learned = [];
  for (const l of L) {
    if (l.poolKind === 'sight') { learned.push(...l.pool); continue; }
    const pool = l.boss ? L.filter((x) => x.world === l.world && x.poolKind === 'sight').flatMap((x) => x.pool) : [...learned];
    if (!pool.length) continue;
    // about one question in five, whatever else the level asks
    const copies = Math.ceil(4 / l.types.length);
    l.types = [...Array.from({ length: copies }, () => l.types).flat(), 'hear'];
    l.pools = { ...l.pools, hear: pool };
  }
  return L;
}

export const LEVELS = buildLevels();

// Beating a world's boss earns a new power that works everywhere from then on.
export const POWERS = [
  { id: 'double', name: 'Double Jump', icon: '⏫', say: 'New power! Double jump. Tap jump again in the air to go higher.' },
  { id: 'dash', name: 'Dash', icon: '💨', say: 'New power! Dash. Tap the dash button to zoom and smash cracked walls.' },
  { id: 'magnet', name: 'Coin Magnet', icon: '🧲', say: 'New power! Coin magnet. Coins fly right to you.' },
  { id: 'shield', name: 'Bubble Shield', icon: '🛡️', say: 'New power! Bubble shield. It blocks one bump from a Grump.' },
  { id: 'gold', name: 'Golden Pip', icon: '👑', say: 'You did it! You beat every boss. Golden Pip is yours.' },
];

// ---- question building -------------------------------------------------

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Which mastery record a question type reads and writes:
// s = letter sound, n = letter name, p = hearing sounds in a word, b = blending,
// e = spelling (encoding), w = reading a word unaided, x = tricky word, t / y = sentences.
const KEY_PREFIX = {
  hearSound: 's', starts: 's', nameU: 'n', nameL: 'n', match: 'n',
  firstSound: 'p', lastSound: 'p', midSound: 'p', blend: 'b', soundout: 'b', build: 'e',
  pic2word: 'w', word2pic: 'w', hear: 'x', sentpic: 't', yesno: 'y', yesno2: 'y',
};
export const skillKey = (type, item) => `${KEY_PREFIX[type]}:${item}`;

// The things a world must have mastered before its boss door opens: whatever the boss
// itself asks about (letter sounds, then blending, then reading words) plus the sight
// words taught in that world.
export function worldSkills(world) {
  const boss = LEVELS.find((l) => l.world === world && l.boss);
  const keys = new Set();
  for (const l of LEVELS) {
    if (l.world !== world || l.boss || (l.poolKind !== boss.poolKind && l.poolKind !== 'sight')) continue;
    for (const item of l.pool) keys.add(skillKey(l.types[0], item));
  }
  return [...keys];
}

const poolFor = (level, type) => level.pools[type] || level.pool;

// Pick what to ask about: mostly this level's new items, sometimes review,
// and always leaning toward whatever the child knows least.
function chooseItem(level, type, mastery, rng, avoid) {
  const main = poolFor(level, type);
  const useReview = main === level.pool && level.review.length > 0 && rng() < 0.3;
  let pool = (useReview ? level.review : main).filter((it) => it !== avoid);
  if (!pool.length) pool = main;
  const weights = pool.map((it) => {
    const m = mastery[skillKey(type, it)];
    return 5 - Math.min(m ? m.b : 0, 4);
  });
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// Wrong answers that look like the right one, so the child has to really read.
function similarWords(word, n, rng) {
  const all = [...new Set([...Object.keys(PICTURES), ...DECOYS])].filter((w) => w !== word);
  const score = (w) => {
    let s = 0;
    if (w[0] === word[0]) s += 2;
    if (w.slice(-2) === word.slice(-2)) s += 2;
    if (w.length === word.length) s += 1;
    for (let i = 0; i < Math.min(w.length, word.length); i++) if (w[i] === word[i]) s += 0.5;
    return s + rng() * 1.5;
  };
  return all.map((w) => [score(w), w]).sort((a, b) => b[0] - a[0]).slice(0, n).map((x) => x[1]);
}

function otherPictures(word, n, rng) {
  // Never offer two pictures that share an emoji (tub / bath).
  const seen = new Set([PICTURES[word]]);
  const out = [];
  for (const w of shuffle(Object.keys(PICTURES), rng)) {
    if (w === word || seen.has(PICTURES[w])) continue;
    seen.add(PICTURES[w]);
    out.push(w);
    if (out.length === n) break;
  }
  return out;
}

// Other letters to offer. Never one that makes the same sound (c and k), and
// known letters first so the choice is between things already taught.
function otherLetters(level, letter, n, rng, only = Object.keys(LETTERS)) {
  const ok = (l) => l !== letter && soundOf(l) !== soundOf(letter) && only.includes(l);
  const known = [...new Set([...level.pool, ...level.review])].filter((l) => LETTERS[l] && ok(l));
  const rest = Object.keys(LETTERS).filter((l) => ok(l) && !known.includes(l));
  // ...and no two that sound the same as each other
  const heard = new Set();
  return [...shuffle(known, rng), ...shuffle(rest, rng)].filter((l) => !heard.has(soundOf(l)) && heard.add(soundOf(l))).slice(0, n);
}

function finish(q, right, wrongs, rng) {
  const choices = shuffle([right, ...wrongs], rng);
  return { ...q, choices, answer: choices.indexOf(right) };
}

const spell = (g) => [...g].map((ch) => LETTERS[ch].name).join(' ');
const nm = (l) => ({ name: l });               // a letter name, as its own piece of audio
const names = (g) => [...g].map(nm);
const letterChoice = (l, upper) => ({ label: upper ? l.toUpperCase() : l, kind: 'letter', say: spell(l), names: [...l], sound: soundOf(l) });
const wordChoice = (w) => ({ label: w, kind: 'word', say: w });
const picChoice = (w) => ({ label: PICTURES[w], kind: 'emoji', say: w });

// Audio scripts are lists of: text to speak, { s: sound id } to play a recorded sound,
// { name: letter } to say a letter's name, or { pause: ms }.
const snd = (s) => ({ s });
const stretched = (word) => soundsIn(word).flatMap((s, i) => (i ? [{ pause: 350 }, snd(s)] : [snd(s)]));
const DIGRAPHS = ['sh', 'ch', 'th', 'ck', 'ng', 'ee', 'ai', 'oa', 'oo', 'ar', 'or', 'ir'];
const CONSONANTS = Object.keys(LETTERS).filter((l) => !'aeiou'.includes(l));

/**
 * Build one question for a level.
 *
 * has(soundId) says whether a recording of that sound exists. Questions that only make
 * sense with real letter sounds (blending, "which letter says mmm") fall back to a
 * key-word version when the recording is missing.
 *
 * Returns { type, item, key, say, audio?, show, choices[{label,kind,say}], answer, praise,
 *           praiseAudio?, soundOut?, sequence? }.
 *   say / praise   plain text, always present
 *   audio / praiseAudio   richer script using recorded sounds, when available
 *   soundOut       sounds to play when the child asks for help with a printed word
 *   sequence       for spelling: the order the blocks must be bumped in
 */
export function makeQuestion(level, mastery = {}, rng = Math.random, avoid = null, has = () => false) {
  const usable = level.types.filter((t) => t === 'yesno2' || poolFor(level, t).length);
  let type = pick(usable, rng);
  if (type === 'yesno2') return yesNo('yesno', Math.floor(rng() * SENTENCE_YN.length));
  const item = chooseItem(level, type, mastery, rng, avoid);
  const base = { type, item, key: skillKey(type, item) };
  const hasAll = (ids) => ids.every(has);

  // Without recordings these become their key-word cousins (same mastery key).
  if ((type === 'blend' || type === 'soundout') && !hasAll(soundsIn(item))) type = type === 'blend' ? 'firstSound' : 'word2pic';
  base.type = type;

  switch (type) {
    case 'hearSound': {
      // The core of phonics: hear a sound, find the letter(s) that spell it.
      const sid = soundOf(item);
      const S = SOUNDS[sid];
      const single = item.length === 1;
      const others = single ? otherLetters(level, item, 2, rng) : shuffle(DIGRAPHS.filter((d) => d !== item && soundOf(d) !== sid), rng).slice(0, 2);
      const where = { start: 'start', end: 'end', middle: 'middle' }[S.pos];
      const q = {
        ...base,
        say: `${S.word}. Which one makes the sound at the ${where} of ${S.word}?`,
        show: { emoji: S.emoji },
        praise: `Yes! ${spell(item)}. ${S.word}.`,
        praiseAudio: ['Yes!', ...names(item), `${S.word}.`],
      };
      if (has(sid)) {
        q.audio = ['Which one says', snd(sid), { pause: 200 }, snd(sid)];
        q.show = null;
        q.praiseAudio = [snd(sid), { pause: 150 }, `${S.word}.`];
      }
      return finish(q, letterChoice(item, false), others.map((l) => letterChoice(l, false)), rng);
    }
    case 'starts': {
      const L = LETTERS[item];
      const sid = soundOf(item);
      const where = L.end ? 'ends' : 'starts';
      const pic = (l) => ({ label: LETTERS[l].emoji, kind: 'emoji', say: LETTERS[l].word });
      const q = {
        ...base,
        say: `This is the letter ${L.name}. Which one ${where} with ${L.name}?`,
        audio: ['This is', nm(item), `Which one ${where} with`, nm(item)],
        show: { text: item },
        praise: `${L.word} ${where} with ${L.name}!`,
        praiseAudio: [`${L.word} ${where} with`, nm(item)],
      };
      if (has(sid)) {
        q.audio = ['This says', snd(sid), `Which one ${where} with`, snd(sid)];
        q.praiseAudio = [snd(sid), { pause: 150 }, `${L.word}!`];
      }
      return finish(q, pic(item), otherLetters(level, item, 2, rng).map(pic), rng);
    }
    case 'nameU':
    case 'nameL': {
      const up = type === 'nameU';
      const L = LETTERS[item];
      const q = { ...base, say: `Find the letter ${L.name}.`, audio: ['Find the letter', nm(item)], show: null, praise: `${L.name}!`, praiseAudio: [nm(item)] };
      if (has(soundOf(item))) q.praiseAudio = [nm(item), 'says', snd(soundOf(item))];
      return finish(q, letterChoice(item, up), otherLetters(level, item, 2, rng).map((l) => letterChoice(l, up)), rng);
    }
    case 'match': {
      const toLower = rng() < 0.5;
      const L = LETTERS[item];
      const partner = `Find its ${toLower ? 'little' : 'big'} partner.`;
      const q = { ...base, say: `This is the letter ${L.name}. ${partner}`, audio: ['This is', nm(item), partner], show: { text: toLower ? item.toUpperCase() : item }, praise: `${L.name}!`, praiseAudio: [nm(item)] };
      if (has(soundOf(item))) q.praiseAudio = [nm(item), 'says', snd(soundOf(item))];
      return finish(q, letterChoice(item, !toLower), otherLetters(level, item, 2, rng).map((l) => letterChoice(l, !toLower)), rng);
    }
    case 'firstSound':
    case 'lastSound':
    case 'midSound': {
      // Hearing the separate sounds inside a spoken word (no print: this is ear training).
      const seg = segment(item);
      const at = type === 'firstSound' ? 0 : type === 'lastSound' ? seg.length - 1 : 1;
      const g = seg[at].g;
      const which = { firstSound: 'first', lastSound: 'last', midSound: 'middle' }[type];
      const isVowel = 'aeiou'.includes(g);
      const q = {
        ...base,
        say: `${item}. What is the ${which} sound in ${item}?`,
        show: { emoji: PICTURES[item] },
        praise: `Yes! ${spell(g)}. ${item}.`,
        praiseAudio: ['Yes!', nm(g), `${item}.`],
      };
      if (has(seg[at].s)) q.praiseAudio = [snd(seg[at].s), { pause: 150 }, `${item}.`];
      return finish(q, letterChoice(g, false), otherLetters(level, g, 2, rng, isVowel ? [...'aeiou'] : CONSONANTS).map((l) => letterChoice(l, false)), rng);
    }
    case 'blend':
      // Hear the sounds one at a time, push them together, find the picture. No print.
      return finish({
        ...base,
        say: 'Listen to the sounds. What word is it?',
        audio: [...stretched(item), { pause: 300 }, 'What word is it?'],
        show: null,
        praise: `${item}!`,
        praiseAudio: [...stretched(item), { pause: 250 }, `${item}!`],
      }, picChoice(item), otherPictures(item, 2, rng).map(picChoice), rng);
    case 'soundout':
      // The same, now with the letters in view and the game modelling each sound.
      return finish({
        ...base,
        say: 'Sound it out. Find the picture.',
        audio: ['Sound it out.', ...stretched(item)],
        show: { word: item },
        soundOut: soundsIn(item),
        praise: `${item}!`,
        praiseAudio: [...stretched(item), { pause: 250 }, `${item}!`],
      }, picChoice(item), otherPictures(item, 2, rng).map(picChoice), rng);
    case 'word2pic':
      // Reading unaided. Tapping the word plays its sounds, never the whole word.
      return finish({
        ...base,
        say: 'Sound it out. Find the picture.',
        show: { word: item },
        soundOut: soundsIn(item),
        praise: `${item}!`,
        praiseAudio: hasAll(soundsIn(item)) ? [...stretched(item), { pause: 250 }, `${item}!`] : undefined,
      }, picChoice(item), otherPictures(item, 2, rng).map(picChoice), rng);
    case 'pic2word':
      return finish({
        ...base,
        say: `${item}. Find the word ${item}.`,
        show: { emoji: PICTURES[item] },
        praise: `${item}!`,
        praiseAudio: hasAll(soundsIn(item)) ? [...stretched(item), { pause: 250 }, `${item}!`] : undefined,
      }, wordChoice(item), similarWords(item, 2, rng).map(wordChoice), rng);
    case 'build': {
      // Spelling by sound: say the word, pull it apart, bump each letter in order.
      const letters = [...item];
      const order = shuffle([0, 1, 2], rng);
      const choices = order.map((i) => letterChoice(letters[i], false));
      return {
        ...base,
        say: `${item}. Spell ${item}. Bump the sounds in order.`,
        show: { emoji: PICTURES[item], slots: letters },
        praise: `${item}!`,
        praiseAudio: hasAll(soundsIn(item)) ? [...stretched(item), { pause: 250 }, `${item}!`] : undefined,
        choices,
        answer: order.indexOf(0),
        sequence: [0, 1, 2].map((i) => order.indexOf(i)),
      };
    }
    case 'hear': {
      // Sight words: hear it, find it among look-alikes. Letters that break the rules are red.
      const all = SIGHT_SETS.flat().filter((w) => w.toLowerCase() !== item.toLowerCase());
      const near = shuffle(all.filter((w) => w[0].toLowerCase() === item[0].toLowerCase() || (w.length === item.length && w.slice(-1) === item.slice(-1))), rng);
      const wrongs = [...near, ...shuffle(all, rng)].filter((w, i, a) => a.indexOf(w) === i).slice(0, 2);
      const heart = HEART[item] || [];
      const tricky = heart.length && heart.length < item.length ? ` The tricky part is ${heart.map((i) => LETTERS[item[i].toLowerCase()].name).join(' ')}.` : '';
      const c = (w) => ({ ...wordChoice(w), heart: HEART[w] || [] });
      return finish({ ...base, say: `Find the word: ${item}.`, show: null, praise: `${item}!${tricky}` }, c(item), wrongs.map(c), rng);
    }
    case 'sentpic': {
      const [text, right, wrong] = SENTENCE_PICS[item];
      const c = (e) => ({ label: e, kind: 'emoji', say: null });
      return finish({ ...base, say: 'Read it. Find the picture.', show: { text, long: true }, praise: text }, c(right), wrong.map(c), rng);
    }
    case 'yesno':
      return yesNo(type, item);
    default:
      throw new Error(`unknown question type ${type}`);
  }
}

function yesNo(type, i) {
  const [text, yes] = SENTENCE_YN[i];
  const choices = [{ label: '👍', kind: 'emoji', say: null }, { label: '👎', kind: 'emoji', say: null }];
  return {
    type, item: i, key: skillKey(type, i),
    say: 'Read it. Is it true? Thumbs up or thumbs down?', show: { text, long: true },
    praise: yes ? `Yes! ${text}` : `Silly! ${text} No way!`,
    choices, answer: yes ? 0 : 1,
  };
}

/**
 * The letter critter a right answer sets free: the letter itself for letter questions,
 * otherwise the first letter of the word or sentence.
 */
export function critterFor(q) {
  const right = q.choices?.[q.answer];
  if (right?.kind === 'letter' && !q.sequence) return right.label.toLowerCase()[0];
  const text = typeof q.item === 'string' ? q.item : q.show?.text || '';
  const m = text.match(/[a-z]/i);
  return m ? m[0].toLowerCase() : null;
}
