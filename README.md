# Pip and the Lost Letters

A platformer that teaches a kindergartner to read, built so the game comes first.
Run, jump, stomp Grumps, hunt hidden gems and dress up Pip. The reading *is* the
game mechanic: every gate opens by bumping the right answer block with your head.

Made for touch on an iPad. Also works with a keyboard (arrows + space) and on phones.

## What it teaches

| World | Skill | How it is asked |
| --- | --- | --- |
| Letter Meadow | Letter names, upper and lower case | Hear "find the letter M"; match big letters to little ones |
| Sound Canyon | Letter sounds | See and hear "moon", pick the letter it starts with; see a letter, pick the picture |
| Word Woods | Sounding out short-vowel words, first sight words | See a picture, pick the word among look-alikes (cat / cot / cap); read a word, pick the picture |
| Sky Islands | sh ch th ck ng, blends, more sight words, first sentences | Same, plus "silly or true?" sentences |
| Story Summit (1st grade) | Magic e, vowel teams, r-controlled vowels, sentences | Read a sentence, pick the picture or decide if it is true |

38 levels in all. Letters are introduced in a phonics order (s a t p, i n m d ...) rather than A to Z.

How it keeps him learning rather than guessing:

- **No reading needed to play.** Every prompt is spoken, menus are pictures, and tapping the prompt repeats it.
- **Mistakes are safe.** A wrong block greys out, the voice names what it was, and he tries again. Nothing is lost.
- **It adapts.** Each letter and word has a mastery level. Weak ones come back more often, and about a third of questions review earlier levels.
- **Knowing things is power.** Three first-try answers in a row trigger Super Spark: faster, coin magnet, Grumps pop on touch.
- **Grown-ups page** (hold the button on the title screen) shows what is learned, what needs practice, and can unlock every level to start further along.

## Play it

It is a static site with no build step.

```sh
npm start          # serves on http://localhost:8080
```

To put it on an iPad: host the folder anywhere static (GitHub Pages: Settings → Pages →
deploy from branch), open it in Safari, then Share → Add to Home Screen. It then runs
full screen and works offline.

## Tests

```sh
npm test                    # curriculum and level-generator checks
npm start & node tests/playtest.mjs   # a bot plays all 38 levels to prove each can be finished (needs Playwright)
```

## Where things are

- `js/curriculum.js` — all teaching content: letters, word lists, sentences, level order, question building. Add words or levels here.
- `js/levelgen.js` — builds each level from chunks (pits, hills, secrets, answer stations).
- `js/game.js` — physics, enemies, answer blocks, drawing.
- `js/main.js` — menus, shop, sticker book, grown-ups page.
- `js/progress.js` — saved progress and mastery tracking (stored on the device).
- `js/audio.js` — sound effects, music and the voice.

## Known limits

- The voice is the device's built-in text-to-speech. It says letter *names* and words well, but cannot
  say a clean isolated letter sound ("mmm"), so sound questions use a key word ("which letter does
  moon start with?"). Recorded letter sounds would be the best next upgrade.
- Progress is saved on one device only.

The Andika font (SIL Open Font License, see `fonts/OFL-Andika.txt`) is used because its letter shapes
match how children are taught to write.
