# Pip and the Lost Letters

A platformer that teaches a kindergartner to read, built so the game comes first.
Run, jump, stomp Grumps, hunt hidden gems and dress up Pip. The reading *is* the
game mechanic: every gate opens by giving the right answer, and how you answer keeps changing
(bump a block, pop a balloon, stomp the Grump carrying the right sign).

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
6. **Sight words alongside.** 48 high-frequency words (I, a, the ... there, were, want) are taught
   six at a time, two sets per world, starting as soon as he can blend. Once taught they come back
   in about one question in five of every later level. Letters that break the rules are shown in
   red; the rest of the word is still sounded out.

| World | Focus | Example question |
| --- | --- | --- |
| Letter Meadow | The sound of each letter; first blending | "Which one says mmm?" |
| Sound Canyon | Hearing sounds in words, blending, sound buttons, first spelling, first 12 sight words | "c ... a ... t. What word is it?" |
| Word Woods | Reading and spelling short-vowel words unaided; 12 more sight words | Read **pot**, find the picture |
| Sky Islands | sh ch th ck ng taught as sounds, then blends; 12 more sight words | "Which one says shhh?" then read **ship** |
| Story Summit (1st grade) | Magic e, vowel teams, r-controlled vowels, 12 more sight words, sentences | Read a sentence, pick the picture |

### Record the letter sounds first

A tablet's built-in voice can say letter *names* but not a clean "mmm" or "sss", and sounding out
depends on those. So a grown-up records each of the 39 sounds once: title screen → hold the
Grown-ups button → **Your voice**. Each one comes with a tip on saying it purely
("mmm", not "muh"). It takes about five minutes and is stored on the device.

The same screen has a **Letter names** tab. Those are optional: the voice says letter names by
itself, but if it gets one wrong on your tablet, record that letter and your voice replaces it.
Any recording can be re-done or removed at any time.

Until a sound is recorded the game still works, but falls back to key words ("which one makes the
sound at the start of moon?") and skips the blending questions that need real sounds.

How it keeps him learning rather than guessing:

- **No reading needed to play.** Every prompt is spoken, menus are pictures, and tapping the prompt repeats it.
- **A miss teaches, then moves on.** The voice says what he picked, the right answer lights up
  green, and the gate swaps to a different question (the missed one comes back later, more often).
- **Three misses in a row cost something.** Pip is knocked out and starts again from the last gate
  he opened, so he has to run back. Three hearts at the top show how many tries are left; a right
  answer refills them.
- **It adapts.** Each sound and word has a mastery level. Weak ones come back more often, and about a third of questions review earlier levels.
- **Knowing things is power.** Three first-try answers in a row trigger Super Spark: faster, coin magnet, Grumps pop on touch.
- **Grown-ups page** (hold the button on the title screen) shows what is learned, what needs practice, and can unlock every level and power to start further along.

## Rescuing the lost letters

Every right answer frees a letter critter: the letter itself with eyes and feet. Freed letters follow
Pip along his path, dance on the level-end card, and move into their own house in the **Letter
Village** (the 🏡 button). Houses stay boarded up until their letter is rescued, and get a gold star
once he knows that letter's sound. Tapping a letter in the village says its name and sound.

## Bonus games

After every third level there is an optional bonus stop on the map (12 in all, each of the four
games comes up three times, harder each time). They practise reading with a different kind of play,
take about a minute, and pay coins plus a gem the first time each is finished. Answers in them count
toward mastery like any other.

| Game | Skill | How it plays |
| --- | --- | --- |
| Letter Train | Blending | The word's sound cars roll past a bell, each saying its sound. Each pass is faster, until "m ... a ... p" runs together into "map". Then pick the picture. |
| Grump Pop | Letter sounds, then sight words and words | Friendly Grumps pop out of holes holding signs. Tap the one that answers the question. Gold Grumps are bonus coins. |
| Mine Cart | Letter sounds, then reading words | The track splits; tap the sign with the answer before the cart reaches the split. The wrong track is a bumpy ride. |
| Rocket Ride | Spelling | Hear a word, then steer the rocket to catch its letters in order. |

## Sound and praise

Music is generated in the game: each world has its own key, tempo and groove, bosses and bonus
games have their own, and the music dips whenever the voice speaks. Praise is varied: a random cheer,
sometimes with his name. On the grown-ups page, under **Your voice → Cheers & his name**, you can
record his name and up to ten cheers in your own voice, or type his name for the tablet's voice to use.

## How progress works

- **Each world ends with a boss.** Right answers zap it; five hits win. The boss asks about everything the world taught.
- **The boss door opens on mastery, not completion.** 80% of what the boss asks about (letter sounds, then blending, then reading words, plus that world's sight words) must be learned
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

- **Get the APK:** every update to `main` is published as a release. On the tablet, open the repo's
  **Releases** page (or https://github.com/ruffryderwr82/k-learn/releases/latest), tap the `.apk`
  file to download it, then open it and tap Install (allow "install unknown apps" the first time).
  Each release has a higher version number and installs over the last one, keeping progress.
  Builds from other branches are kept as run artifacts on the Actions tab, for testing.
- **Build it yourself:** with Android Studio (or JDK 21 + Android SDK) installed, run `npm ci && npm run android:apk`.
  The APK lands in `android/app/build/outputs/apk/debug/`.

**Progress is kept across updates.** Installing a new release over the old one keeps his
stars, coins, learned letters, rescued letters and your recordings:

- The save stays in the app's storage, which updates do not touch (same app id, same signing
  key, and the web address it runs at is pinned in `capacitor.config.json`).
- The previous save is kept as a backup every time, and a save that cannot be read is set aside
  rather than overwritten.
- The app also keeps a second copy of the save and of every recording in Android's own storage.
  If the game's storage is ever emptied, both come back from that copy on the next start.
  These copies are included in Android's device backup (if it is turned on), so they can come
  back after a reinstall or on a new tablet signed in to the same Google account.
- Older saves are converted forward, never thrown away. Levels are identified by their name, not
  their position, so adding levels in an update does not move his stars.

Uninstalling the app (rather than installing over it) still erases what is on the tablet.

Inside the app the voice comes from the tablet's own text-to-speech engine. If it is silent,
check Settings → Accessibility → Text-to-speech and make sure English voice data is installed.

Builds are signed with the key in `android/app/pip-sideload.keystore` so a new build installs
over the old one and keeps saved progress. That key is public in this repo, which is fine for
sideloading at home but not for a store release.

## Tests

```sh
npm test                    # curriculum and level-generator checks
npm start & node tests/savetest.mjs   # progress and recordings survive an update and a wiped web storage
node tests/playtest.mjs   # a bot plays all 141 layouts and all 12 bonus games, with and without recorded sounds, to prove each can be finished (needs Playwright)
```

## Where things are

- `js/curriculum.js` — all teaching content: letters, word lists, sentences, level order, question building. Add words or levels here.
- `js/sounds.js` — the 39 speech sounds and how words split into them.
- `js/levelgen.js` — builds each level from chunks (pits, hills, cliffs, moving platforms, secrets, answer stations, boss arenas).
- `js/game.js` — physics, powers, enemies, bosses, answer blocks, drawing.
- `js/hero.js` — Pip, hats, colors and pets.
- `js/minigames.js` — the four bonus games.
- `js/main.js` — menus, map, shop, Letter Village, grown-ups page.
- `js/progress.js` — saved progress, mastery tracking and the rules for what is unlocked (stored on the device).
- `js/audio.js` — sound effects, music and the voice.

## Known limits

- Letter sounds must be recorded by a grown-up (see above). Recordings stay on the device they were
  made on, so each tablet needs its own.
- Progress is saved on one device only.

The Andika font (SIL Open Font License, see `fonts/OFL-Andika.txt`) is used because its letter shapes
match how children are taught to write.
