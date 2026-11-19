// Fixed lines the game says outside the questions, and how spoken text is matched to a
// recorded voice clip. Kept in one place so the voice generator (tools/voicegen.mjs) can find
// every line that needs a clip.

// Things to say when he gets one right. A grown-up can record their own (cheer:0 ... cheer:9).
export const CHEERS = ['Yes!', 'You got it!', 'Great reading!', 'Wow!', 'Super!', 'Nice one!', 'Awesome!', 'You did it!', 'Way to go!', 'Brilliant!'];

// Small counts are said as words ("You freed three letters!").
export const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const numberWord = (n) => NUMBER_WORDS[n] ?? String(n);

// Every fixed line spoken by the menus, the game and the bonus games.
export const UI_LINES = [
  // answers
  'That one is', 'That one says', 'Not that one.', 'Not quite.', 'says',
  'Oh no! Three misses. Back you go. You can do it!',
  // freed letters and the end of a level
  'You freed a letter! It will follow you.',
  'You freed', 'letter!', 'letters!', 'They are going home to the village.',
  'Look at all your coins!', 'A bonus game is open!', 'And a gem!',
  // the map
  'You beat this boss!', 'The boss door is open!', 'Keep playing to open the boss door!',
  'Finish the level before it to play this bonus game.',
  'A grown-up has paused this part for now. Keep practicing the ones before it!',
  // the shop
  'Beat the last boss to win this one.', 'You need more coins. Keep playing!', 'You need more gems. Find the hidden gems in the levels!',
  // the Letter Village
  'This house is waiting for', 'Free it in a level!',
  // grown-ups page
  'Find the letter',
  // bonus games
  'Listen to the train!', 'Read the train!', 'What word is it?', 'Which picture?', 'Tap a sign to pick a track!',
];

/**
 * The key a piece of spoken text is filed under: lower case, without punctuation, so
 * "cat.", "cat?" and "Cat!" all use the same clip.
 */
export const voiceKey = (text) => String(text).toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim();
