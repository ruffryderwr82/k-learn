# Pip and the Lost Letters

A platformer that teaches a kindergartner to read, built so the game comes first.
Run, jump, stomp Grumps, hunt hidden gems and dress up Pip. The reading *is* the
game mechanic: every gate opens by bumping the right answer block with your head.

Made for touch on an iPad. Also works with a keyboard (arrows + space) and on phones.

## How it teaches reading

The game follows **systematic synthetic phonics**, the sounding-out method used by structured
literacy programs:

1. **Sounds first.** Each letter is taught by the sound it makes (its name comes along with it),
   a few letters at a time in a useful order (s a t p, i n m d ...), not A to Z.
2. **Blend straight away.** As soon as enough letters are known, he hears "m ... a ... p" and finds
   the picture. Words only ever use letters already taught.
3. **Hear the sounds inside words.** First, last and middle sound of a spoken word.
4. **Read with sound buttons.** A printed word has a dot under each sound (a bar under two letters
   that share one, like sh). Tapping the word plays its sounds one by one. It never says the whole
   word for him: the blending is his job.
5. **Spell by sound.** Hear a word and bump its letters in order.
6. **Tricky words by heart.** Irregular words (the, said, was) show the letters that break the rules in red.

| World | Focus | Example question |
| --- | --- | --- |
| Letter Meadow | The sound of each letter; first blending | "Which one says mmm?" |
| Sound Canyon | Hearing sounds in words, blending, sound buttons, first spelling | "c ... a ... t. What word is it?" |
| Word Woods | Reading and spelling short-vowel words unaided; first tricky words | Read **pot**, find the picture |
| Sky Islands | sh ch th ck ng taught as sounds, then blends; more tricky words | "Which one says shhh?" then read **ship** |
| Story Summit (1st grade) | Magic e, vowel teams, r-controlled vowels, sentences | Read a sentence, pick the picture |

### Record the letter sounds first

A tablet's built-in voice can say letter *names* but not a clean "mmm" or "sss", and sounding out
depends on those. So a grown-up records each of the 39 sounds once: title screen → hold the
Grown-ups button → **Letter sounds in your voice**. Each one comes with a tip on saying it purely
("mmm", not "muh"). It takes about five minutes and is stored on the device.

Until a sound is recorded the game still works, but falls back to key words ("which one makes the
sound at the start of moon?") and skips the blending questions that need real sounds.

How it keeps him learning rather than guessing:

- **No reading needed to play.** Every prompt is spoken, menus are pictures, and tapping the prompt repeats it.
- **Mistakes are safe.** A wrong block greys out, the voice says what that one was, and he tries again. Nothing is lost.
- **It adapts.** Each sound and word has a mastery level. Weak ones come back more often, and about a third of questions review earlier levels.
- **Knowing things is power.** Three first-try answers in a row trigger Super Spark: faster, coin magnet, Grumps pop on touch.
- **Grown-ups page** (hold the button on the title screen) shows what is learned, what needs practice, and can unlock every level and power to start further along.

## How progress works

- **Each world ends with a boss.** Right answers zap it; five hits win. The boss asks about everything the world taught.
- **The boss door opens on mastery, not completion.** 80% of what the boss asks about (letter sounds, then blending, then reading words) must be learned
  (three first-try answers each). Until then the Play button sends him to the level where he is weakest.
- **Beating a boss opens the next world and wins a power** that works everywhere: double jump, dash,
  coin magnet, bubble shield, and finally Golden Pip.
- **Later worlds use those powers:** moving platforms and tall cliffs (double jump) from Sound Canyon,
  cracked walls (dash) from Word Woods, flying Grumps from Sky Islands.
- **Rewards:** coins buy 10 colors and 9 hats. Hidden gems buy pets that follow Pip, plus a few rare items.

How it keeps him learning rather than guessing:

- **No reading needed to play.** Every prompt is spoken, menus are pictures, and tapping the prompt repeats it.
- **Mistakes are safe.** A wrong block greys out, the voice names what it was, and he tries again. Nothing is lost.
- **It adapts.** Each letter and word has a mastery level. Weak ones come back more often, and about a third of questions review earlier levels.
- **Knowing things is power.** Three first-try answers in a row trigger Super Spark: faster, coin magnet, Grumps pop on touch.
- **Grown-ups page** (hold the button on the title screen) shows what is learned, what needs practice, and can unlock every level and power to start further along.

## Play it

It is a static site with no build step.

```sh
npm start          # serves on http://localhost:8080
```

To put it on an iPad: host the folder anywhere static (GitHub Pages: Settings → Pages →
deploy from branch), open it in Safari, then Share → Add to Home Screen. It then runs
full screen and works offline.

## Android app (APK)

The game is also packaged as a standalone Android app with Capacitor. Everything is inside
the APK: no server and no internet needed.

- **Get the APK without installing anything:** every push builds one on GitHub. Open the
  repo's Actions tab → latest "Android APK" run → download `pip-apk` from Artifacts, unzip,
  copy `pip.apk` to the tablet and open it (allow "install unknown apps" when asked).
- **Build it yourself:** with Android Studio (or JDK 21 + Android SDK) installed, run `npm ci && npm run android:apk`.
  The APK lands in `android/app/build/outputs/apk/debug/`.

Inside the app the voice comes from the tablet's own text-to-speech engine. If it is silent,
check Settings → Accessibility → Text-to-speech and make sure English voice data is installed.

Builds are signed with the key in `android/app/pip-sideload.keystore` so a new build installs
over the old one and keeps saved progress. That key is public in this repo, which is fine for
sideloading at home but not for a store release.

## Tests

```sh
npm test                    # curriculum and level-generator checks
npm start & node tests/playtest.mjs   # a bot plays all 129 layouts, with and without recorded sounds, to prove each can be finished (needs Playwright)
```

## Where things are

- `js/curriculum.js` — all teaching content: letters, word lists, sentences, level order, question building. Add words or levels here.
- `js/sounds.js` — the 39 speech sounds and how words split into them.
- `js/levelgen.js` — builds each level from chunks (pits, hills, cliffs, moving platforms, secrets, answer stations, boss arenas).
- `js/game.js` — physics, powers, enemies, bosses, answer blocks, drawing.
- `js/hero.js` — Pip, hats, colors and pets.
- `js/main.js` — menus, shop, sticker book, grown-ups page.
- `js/progress.js` — saved progress, mastery tracking and the rules for what is unlocked (stored on the device).
- `js/audio.js` — sound effects, music and the voice.

## Known limits

- Letter sounds must be recorded by a grown-up (see above). Recordings stay on the device they were
  made on, so each tablet needs its own.
- Progress is saved on one device only.

The Andika font (SIL Open Font License, see `fonts/OFL-Andika.txt`) is used because its letter shapes
match how children are taught to write.
