// The speech sounds (phonemes) the game teaches, and how words break into them.
// Pure data and functions: no audio here, so it runs in Node for tests.

// tip: how to say the pure sound when recording it. Stops must be short with no "uh" on the end.
// word/emoji/pos: a key word that contains the sound, used when no recording exists.
export const SOUNDS = {
  s: { tip: 'ssss, like a snake. Hold it.', word: 'sun', emoji: '☀️', pos: 'start' },
  a: { tip: 'a, as in apple. Short.', word: 'apple', emoji: '🍎', pos: 'start' },
  t: { tip: 't, just a tap of the tongue. Not "tuh".', word: 'turtle', emoji: '🐢', pos: 'start' },
  p: { tip: 'p, a quiet puff of air. Not "puh".', word: 'pig', emoji: '🐷', pos: 'start' },
  i: { tip: 'i, as in igloo. Short.', word: 'iguana', emoji: '🦎', pos: 'start' },
  n: { tip: 'nnnn. Hold it.', word: 'nose', emoji: '👃', pos: 'start' },
  m: { tip: 'mmmm. Hold it, lips closed.', word: 'moon', emoji: '🌙', pos: 'start' },
  d: { tip: 'd, short. Not "duh".', word: 'dog', emoji: '🐶', pos: 'start' },
  g: { tip: 'g, as in goat. Short. Not "guh".', word: 'goat', emoji: '🐐', pos: 'start' },
  o: { tip: 'o, as in octopus. Short.', word: 'octopus', emoji: '🐙', pos: 'start' },
  k: { tip: 'k, a quiet click at the back of the mouth. Not "kuh". (Used for c, k and ck.)', word: 'cat', emoji: '🐱', pos: 'start' },
  e: { tip: 'e, as in egg. Short.', word: 'egg', emoji: '🥚', pos: 'start' },
  u: { tip: 'u, as in umbrella. Short.', word: 'umbrella', emoji: '☂️', pos: 'start' },
  r: { tip: 'rrrr. Hold it. Not "ruh".', word: 'rocket', emoji: '🚀', pos: 'start' },
  h: { tip: 'h, just a breath out. Not "huh".', word: 'hat', emoji: '🎩', pos: 'start' },
  b: { tip: 'b, short. Not "buh".', word: 'ball', emoji: '🏀', pos: 'start' },
  f: { tip: 'ffff. Hold it.', word: 'fish', emoji: '🐟', pos: 'start' },
  l: { tip: 'llll. Hold it, tongue up.', word: 'lion', emoji: '🦁', pos: 'start' },
  j: { tip: 'j, as in juice. Short. Not "juh".', word: 'juice', emoji: '🧃', pos: 'start' },
  v: { tip: 'vvvv. Hold it.', word: 'volcano', emoji: '🌋', pos: 'start' },
  w: { tip: 'w, as in watermelon. Lips round, short.', word: 'watermelon', emoji: '🍉', pos: 'start' },
  x: { tip: 'ks, as at the end of fox.', word: 'fox', emoji: '🦊', pos: 'end' },
  y: { tip: 'y, as in yo-yo. Short.', word: 'yo-yo', emoji: '🪀', pos: 'start' },
  z: { tip: 'zzzz, like a bee. Hold it.', word: 'zebra', emoji: '🦓', pos: 'start' },
  qu: { tip: 'kw, as in queen.', word: 'queen', emoji: '👸', pos: 'start' },
  sh: { tip: 'shhh. Hold it.', word: 'ship', emoji: '🚢', pos: 'start' },
  ch: { tip: 'ch, as in chick. Short.', word: 'chick', emoji: '🐥', pos: 'start' },
  th: { tip: 'thhh, as in bath. Tongue between teeth, no voice.', word: 'bath', emoji: '🛁', pos: 'end' },
  ng: { tip: 'ng, as at the end of ring. Hold it.', word: 'ring', emoji: '💍', pos: 'end' },
  ai: { tip: 'ay, the long a in rain and cake.', word: 'rain', emoji: '🌧️', pos: 'middle' },
  ee: { tip: 'ee, the long e in bee.', word: 'bee', emoji: '🐝', pos: 'end' },
  ie: { tip: 'eye, the long i in bike.', word: 'bike', emoji: '🚲', pos: 'middle' },
  oa: { tip: 'oh, the long o in boat and bone.', word: 'boat', emoji: '⛵', pos: 'middle' },
  ue: { tip: 'yoo, the long u in cube.', word: 'cube', emoji: '🧊', pos: 'middle' },
  oo: { tip: 'oo, as in moon.', word: 'moon', emoji: '🌙', pos: 'middle' },
  uu: { tip: 'the short oo in book.', word: 'book', emoji: '📖', pos: 'middle' },
  ar: { tip: 'ar, as in car.', word: 'car', emoji: '🚗', pos: 'end' },
  or: { tip: 'or, as in corn.', word: 'corn', emoji: '🌽', pos: 'middle' },
  ir: { tip: 'er, as in bird.', word: 'bird', emoji: '🐦', pos: 'middle' },
};

// Which sound a spelling (grapheme) makes.
const G2S = {
  c: 'k', k: 'k', ck: 'k', q: 'qu', qu: 'qu', ll: 'l', ss: 's', wh: 'w',
  ea: 'ee', a_e: 'ai', i_e: 'ie', o_e: 'oa', u_e: 'ue',
};
export const soundOf = (grapheme) => G2S[grapheme] || grapheme;

const MULTI = ['sh', 'ch', 'th', 'ck', 'ng', 'ee', 'ai', 'oa', 'ea', 'oo', 'ar', 'or', 'ir', 'll', 'ss', 'wh', 'qu'];
const VOWELS = 'aeiou';

// Words whose spelling does not follow the simple rules below.
const EXCEPTIONS = {
  rose: [['r', 'r'], ['o_e', 'oa'], ['s', 'z']],
  nose: [['n', 'n'], ['o_e', 'oa'], ['s', 'z']],
  horse: [['h', 'h'], ['or', 'or'], ['se', 's']],
  book: [['b', 'b'], ['oo', 'uu'], ['k', 'k']],
  bee: [['b', 'b'], ['ee', 'ee']],
  tree: [['t', 't'], ['r', 'r'], ['ee', 'ee']],
};

/**
 * Split a word into its sounds, left to right.
 * Returns [{ g: spelling, s: sound id, at: [letter indexes] }].
 * A "magic e" vowel (cake) is one unit whose letters are not next to each other.
 */
export function segment(word) {
  if (EXCEPTIONS[word]) {
    let i = 0;
    return EXCEPTIONS[word].map(([g, s]) => {
      const at = g.includes('_') ? [i, i + 2] : [...g].map((_, k) => i + k);
      i += g.includes('_') ? 1 : g.length;
      return { g, s, at };
    });
  }
  const out = [];
  const n = word.length;
  // consonant + vowel + consonant + e at the end of the word: the e makes the vowel long
  const magic = n >= 4 && word[n - 1] === 'e' && !VOWELS.includes(word[n - 2]) && VOWELS.includes(word[n - 3]) && !VOWELS.includes(word[n - 4] || 'a');
  for (let i = 0; i < n; i++) {
    if (magic && i === n - 1) break; // the silent e belongs to the vowel
    if (magic && i === n - 3) {
      const g = `${word[i]}_e`;
      out.push({ g, s: soundOf(g), at: [i, n - 1] });
      continue;
    }
    const two = word.slice(i, i + 2);
    if (MULTI.includes(two)) {
      out.push({ g: two, s: soundOf(two), at: [i, i + 1] });
      i++;
    } else out.push({ g: word[i], s: soundOf(word[i]), at: [i] });
  }
  return out;
}

export const soundsIn = (word) => segment(word).map((x) => x.s);
