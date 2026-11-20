// Every piece of text the game can say, so a voice clip can be made for each one.
// Used by tools/voicegen.mjs and by the tests that check nothing is missing.
import { LETTERS, PICTURES, SIGHT_WORDS, WORLDS, POWERS, LEVELS, BONUSES, bonusLevel, makeQuestion, mulberry32 } from './curriculum.js';
import { UI_LINES, CHEERS, NUMBER_WORDS, voiceKey } from './phrases.js';

/**
 * Returns [{ key, text }]: the text to send to the voice generator, and the key the game
 * looks it up by. Letter names have keys like "letter:a".
 */
export function voiceLines({ samples = 500 } = {}) {
  const lines = new Map();
  const add = (text) => {
    if (typeof text !== 'string' || !text.trim()) return;
    const key = voiceKey(text);
    if (!key) return;
    const old = lines.get(key);
    // when the same words appear with different punctuation, prefer a calm full stop
    if (!old || (!old.text.endsWith('.') && text.endsWith('.'))) lines.set(key, { key, text: text.trim() });
  };
  const addScript = (script) => { for (const p of script || []) add(p); };

  // letter names, said on their own
  for (const l of Object.keys(LETTERS)) lines.set(`letter:${l}`, { key: `letter:${l}`, text: `${l.toUpperCase()}.` });

  // everything the questions can say, in every level and bonus game, with and without recorded sounds
  for (const has of [() => false, () => true]) {
    for (const level of [...LEVELS, ...BONUSES.map(bonusLevel)]) {
      const rng = mulberry32(7);
      for (let i = 0; i < samples; i++) {
        const q = makeQuestion(level, {}, rng, null, has);
        addScript(q.audio || [q.say]);
        addScript(q.praiseAudio || [q.praise]);
        addScript(q.wrongAudio);
        // "That one is ... cat." (letter answers are named letter by letter instead)
        for (const c of q.choices) if (c.say && !c.names) add(`${c.say}.`);
        if (q.sequence) add(`${q.item}.`); // "Not quite." + the word
      }
    }
  }

  // words he can tap on to hear, and everything said outside the questions
  for (const w of [...Object.keys(PICTURES), ...SIGHT_WORDS]) add(`${w}.`);
  for (const l of Object.values(LETTERS)) add(`${l.word}.`);
  for (const w of WORLDS) add(w.name);
  for (const p of POWERS) add(p.say);
  for (const t of [...UI_LINES, ...CHEERS, ...NUMBER_WORDS]) add(t);
  return [...lines.values()].sort((a, b) => a.key.localeCompare(b.key));
}
