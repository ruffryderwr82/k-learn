// Curriculum: what gets taught, in what order, and how a question is built.
// Everything here is plain data + pure functions so it can be unit tested in Node.

// Spoken letter names are spelled out so text-to-speech never guesses wrong.
export const LETTERS = {
  a: { name: 'ay', word: 'apple', emoji: '🍎' },
  b: { name: 'bee', word: 'ball', emoji: '🏀' },
  c: { name: 'see', word: 'cat', emoji: '🐱' },
  d: { name: 'dee', word: 'dog', emoji: '🐶' },
  e: { name: 'ee', word: 'egg', emoji: '🥚' },
  f: { name: 'eff', word: 'fish', emoji: '🐟' },
  g: { name: 'jee', word: 'goat', emoji: '🐐' },
  h: { name: 'aitch', word: 'hat', emoji: '🎩' },
  i: { name: 'eye', word: 'iguana', emoji: '🦎' },
  j: { name: 'jay', word: 'juice', emoji: '🧃' },
  k: { name: 'kay', word: 'kite', emoji: '🪁' },
  l: { name: 'el', word: 'lion', emoji: '🦁' },
  m: { name: 'em', word: 'moon', emoji: '🌙' },
  n: { name: 'en', word: 'nose', emoji: '👃' },
  o: { name: 'oh', word: 'octopus', emoji: '🐙' },
  p: { name: 'pee', word: 'pig', emoji: '🐷' },
  q: { name: 'cue', word: 'queen', emoji: '👸' },
  r: { name: 'are', word: 'rocket', emoji: '🚀' },
  s: { name: 'ess', word: 'sun', emoji: '☀️' },
  t: { name: 'tee', word: 'turtle', emoji: '🐢' },
  u: { name: 'you', word: 'umbrella', emoji: '☂️' },
  v: { name: 'vee', word: 'volcano', emoji: '🌋' },
  w: { name: 'double you', word: 'wolf', emoji: '🐺' },
  x: { name: 'ex', word: 'fox', emoji: '🦊', end: true }, // x is taught as an ending sound
  y: { name: 'why', word: 'yarn', emoji: '🧶' },
  z: { name: 'zee', word: 'zebra', emoji: '🦓' },
};

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

const SIGHT_SETS = [
  ['the', 'a', 'I', 'is', 'to', 'and'],
  ['you', 'he', 'she', 'we', 'my', 'see'],
  ['like', 'go', 'said', 'was', 'are', 'look'],
  ['have', 'they', 'with', 'what', 'here', 'come'],
];

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

export const WORLDS = [
  { id: 'meadow', name: 'Letter Meadow', icon: '🌼', goal: 'Letter names' },
  { id: 'canyon', name: 'Sound Canyon', icon: '🌵', goal: 'Letter sounds' },
  { id: 'woods', name: 'Word Woods', icon: '🍄', goal: 'Sounding out words' },
  { id: 'sky', name: 'Sky Islands', icon: '☁️', goal: 'Sight words, sh ch th, blends' },
  { id: 'summit', name: 'Story Summit', icon: '❄️', goal: 'First grade: long vowels and sentences' },
];

const words = (s) => s.split(' ');

function buildLevels() {
  const L = [];
  const add = (world, title, types, pool, extra = {}) => {
    const prev = L.filter((l) => l.world === world && l.poolKind === extra.poolKind);
    const review = [...new Set(prev.flatMap((l) => l.pool))];
    L.push({ id: `${WORLDS[world].id}-${L.filter((l) => l.world === world).length + 1}`, world, title, types, pool, review, ...extra });
  };

  // Each world ends with a boss fight that asks about everything taught in that world.
  const boss = (world, types, poolKind) => {
    const pool = [...new Set(L.filter((l) => l.world === world && l.poolKind === poolKind).flatMap((l) => l.pool))];
    add(world, 'Boss', types, pool, { poolKind, boss: true, id: `${WORLDS[world].id}-boss`, review: [] });
  };

  // World 1: letter names, upper and lower case.
  LETTER_GROUPS.forEach((g, i) =>
    add(0, g.join(' ').toUpperCase(), i === 0 ? ['nameU', 'nameL'] : ['nameU', 'nameL', 'match'], g, { poolKind: 'letter' }));
  add(0, 'A to Z', ['nameU', 'nameL', 'match'], Object.keys(LETTERS), { poolKind: 'letter' });

  boss(0, ['nameU', 'nameL', 'match'], 'letter');

  // World 2: letter sounds.
  LETTER_GROUPS.forEach((g) => add(1, g.join(' '), ['sound', 'starts'], g, { poolKind: 'letter' }));
  add(1, 'a to z', ['sound', 'starts'], Object.keys(LETTERS), { poolKind: 'letter' });

  boss(1, ['sound', 'starts'], 'letter');

  // World 3: blending three-sound words, one vowel at a time.
  const cvc = {
    'short a': words('cat hat bat van pan can map cap rat man'),
    'short i': words('pig pin lip six kid zip'),
    'short o': words('dog fox box pot log cop'),
    'short u': words('sun bug bus cup nut tub hug run'),
    'short e': words('bed hen web leg ten pen net jet'),
  };
  for (const [title, pool] of Object.entries(cvc)) add(2, title, ['pic2word', 'word2pic'], pool, { poolKind: 'word' });
  add(2, 'the, a, I...', ['hear'], SIGHT_SETS[0], { poolKind: 'sight' });
  add(2, 'mix it up', ['pic2word', 'word2pic', 'word2pic'], Object.values(cvc).flat(), { poolKind: 'word' });

  boss(2, ['pic2word', 'word2pic'], 'word');

  // World 4: sight words, digraphs and blends.
  add(3, 'sh ch th', ['pic2word', 'word2pic'], words('ship fish shell chick bath'), { poolKind: 'word' });
  add(3, 'you, he, she...', ['hear'], SIGHT_SETS[1], { poolKind: 'sight' });
  add(3, 'ck ng', ['pic2word', 'word2pic'], words('duck sock lock king ring'), { poolKind: 'word' });
  add(3, 'blends', ['pic2word', 'word2pic'], words('frog crab drum flag sled swim'), { poolKind: 'word' });
  add(3, 'like, go, said...', ['hear'], SIGHT_SETS[2], { poolKind: 'sight' });
  add(3, 'more blends', ['pic2word', 'word2pic'], words('clap stop hand milk tent gift'), { poolKind: 'word' });
  add(3, 'silly or true?', ['yesno'], SENTENCE_YN.slice(0, 9).map((_, i) => i), { poolKind: 'yn' });

  boss(3, ['pic2word', 'word2pic'], 'word');

  // World 5: first grade.
  add(4, 'magic e', ['pic2word', 'word2pic'], words('cake bike kite bone rose nose'), { poolKind: 'word' });
  add(4, 'more magic e', ['pic2word', 'word2pic'], words('snake whale five nine home cone'), { poolKind: 'word' });
  add(4, 'have, they, with...', ['hear'], SIGHT_SETS[3], { poolKind: 'sight' });
  add(4, 'ee ai', ['pic2word', 'word2pic'], words('bee tree feet sheep rain snail train'), { poolKind: 'word' });
  add(4, 'oa ea oo', ['pic2word', 'word2pic'], words('boat goat soap leaf moon spoon book'), { poolKind: 'word' });
  add(4, 'ar or ir', ['pic2word', 'word2pic'], words('star car corn fork bird shark horse'), { poolKind: 'word' });
  add(4, 'read and find', ['sentpic'], SENTENCE_PICS.map((_, i) => i), { poolKind: 'sp' });
  add(4, 'story time', ['sentpic', 'yesno2'], SENTENCE_PICS.map((_, i) => i), { poolKind: 'sp' });
  boss(4, ['pic2word', 'word2pic'], 'word');
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

// Which mastery record a question type reads and writes.
const KEY_PREFIX = { nameU: 'n', nameL: 'n', match: 'n', sound: 's', starts: 's', pic2word: 'w', word2pic: 'w', hear: 'x', sentpic: 't', yesno: 'y', yesno2: 'y' };
export const skillKey = (type, item) => `${KEY_PREFIX[type]}:${item}`;

// The things a world teaches, as mastery keys. Used to decide when its boss door opens.
export function worldSkills(world) {
  const keys = new Set();
  for (const l of LEVELS) {
    if (l.world !== world || l.boss || !['letter', 'word', 'sight'].includes(l.poolKind)) continue;
    for (const item of l.pool) keys.add(skillKey(l.types[0], item));
  }
  return [...keys];
}

// Pick what to ask about: mostly this level's new items, sometimes review,
// and always leaning toward whatever the child knows least.
function chooseItem(level, type, mastery, rng, avoid) {
  const useReview = level.review.length > 0 && rng() < 0.3;
  let pool = (useReview ? level.review : level.pool).filter((it) => it !== avoid);
  if (!pool.length) pool = level.pool;
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

function otherLetters(level, letter, n, rng) {
  const known = [...new Set([...level.pool, ...level.review])].filter((l) => l !== letter);
  const rest = Object.keys(LETTERS).filter((l) => l !== letter && !known.includes(l));
  return [...shuffle(known, rng), ...shuffle(rest, rng)].slice(0, n);
}

function finish(q, right, wrongs, rng) {
  const choices = shuffle([right, ...wrongs], rng);
  return { ...q, choices, answer: choices.indexOf(right) };
}

const letterChoice = (l, upper) => ({ label: upper ? l.toUpperCase() : l, kind: 'letter', say: LETTERS[l].name });
const wordChoice = (w) => ({ label: w, kind: 'word', say: w });
const picChoice = (w) => ({ label: PICTURES[w], kind: 'emoji', say: w });

/**
 * Build one question for a level.
 * Returns { type, item, key, say, show, choices[{label,kind,say}], answer, praise }.
 */
export function makeQuestion(level, mastery = {}, rng = Math.random, avoid = null) {
  let type = pick(level.types, rng);
  if (type === 'yesno2') {
    const i = Math.floor(rng() * SENTENCE_YN.length);
    return yesNo('yesno', i, rng);
  }
  const item = chooseItem(level, type, mastery, rng, avoid);
  const base = { type, item, key: skillKey(type, item) };

  switch (type) {
    case 'nameU':
    case 'nameL': {
      const up = type === 'nameU';
      const L = LETTERS[item];
      return finish({ ...base, say: `Find the letter ${L.name}.`, show: null, praise: `${L.name}!` },
        letterChoice(item, up), otherLetters(level, item, 2, rng).map((l) => letterChoice(l, up)), rng);
    }
    case 'match': {
      const toLower = rng() < 0.5;
      const L = LETTERS[item];
      return finish({ ...base, say: `This is ${L.name}. Find its ${toLower ? 'little' : 'big'} partner.`, show: { text: toLower ? item.toUpperCase() : item }, praise: `${L.name}!` },
        letterChoice(item, !toLower), otherLetters(level, item, 2, rng).map((l) => letterChoice(l, !toLower)), rng);
    }
    case 'sound': {
      const L = LETTERS[item];
      const where = L.end ? 'end' : 'start';
      return finish({ ...base, say: `${L.word}. Which letter does ${L.word} ${where} with?`, show: { emoji: L.emoji }, praise: `Yes! ${L.word} ${where}s with ${L.name}.` },
        letterChoice(item, false), otherLetters(level, item, 2, rng).map((l) => letterChoice(l, false)), rng);
    }
    case 'starts': {
      const L = LETTERS[item];
      const where = L.end ? 'ends' : 'starts';
      const pic = (l) => ({ label: LETTERS[l].emoji, kind: 'emoji', say: LETTERS[l].word });
      return finish({ ...base, say: `This is ${L.name}. Which one ${where} with ${L.name}?`, show: { text: item }, praise: `${L.word} ${where} with ${L.name}!` },
        pic(item), otherLetters(level, item, 2, rng).map(pic), rng);
    }
    case 'pic2word':
      return finish({ ...base, say: `${item}. Find the word ${item}.`, show: { emoji: PICTURES[item] }, praise: `${item}!` },
        wordChoice(item), similarWords(item, 2, rng).map(wordChoice), rng);
    case 'word2pic':
      return finish({ ...base, say: 'Read the word. Find the picture.', show: { text: item }, praise: `${item}!` },
        picChoice(item), otherPictures(item, 2, rng).map(picChoice), rng);
    case 'hear': {
      const all = SIGHT_SETS.flat().filter((w) => w !== item && w.toLowerCase() !== item.toLowerCase());
      const near = shuffle(all.filter((w) => w[0].toLowerCase() === item[0].toLowerCase() || w.length === item.length), rng);
      const wrongs = [...near, ...shuffle(all, rng)].filter((w, i, a) => a.indexOf(w) === i).slice(0, 2);
      return finish({ ...base, say: `Find the word: ${item}.`, show: null, praise: `${item}!` },
        wordChoice(item), wrongs.map(wordChoice), rng);
    }
    case 'sentpic': {
      const [text, right, wrong] = SENTENCE_PICS[item];
      const c = (e) => ({ label: e, kind: 'emoji', say: null });
      return finish({ ...base, say: 'Read it. Find the picture.', show: { text, long: true }, praise: text }, c(right), wrong.map(c), rng);
    }
    case 'yesno':
      return yesNo(type, item, rng);
    default:
      throw new Error(`unknown question type ${type}`);
  }
}

function yesNo(type, i, rng) {
  const [text, yes] = SENTENCE_YN[i];
  const choices = [{ label: '👍', kind: 'emoji', say: null }, { label: '👎', kind: 'emoji', say: null }];
  return {
    type, item: i, key: skillKey(type, i),
    say: 'Read it. Is it true? Thumbs up or thumbs down?', show: { text, long: true },
    praise: yes ? `Yes! ${text}` : `Silly! ${text} No way!`,
    choices, answer: yes ? 0 : 1,
  };
}
