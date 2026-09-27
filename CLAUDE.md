# First Light — A Year of Mornings

An offline-first daily-practice PWA. 366 dated voices, the Readings (ten works, a passage a day),
a goal ladder, a body chapter, an astrology chapter, and a vault of kept words.

Rebuilt from `~/Downloads/first_light_year_4.html`, a single-file claude.ai artifact.
That file is the archive — never edit it, and never treat it as the source of truth.

## Run it

```bash
py serve.py 8633
```

`?nosw` on the URL skips service-worker registration — use it when debugging a
caching problem, so you are not fighting the cache to look at the cache.

`?preview=<track id>` lets the Year view read a track that is not yet complete
(`#/year?preview=classics`), without keep buttons; nothing else honours it.

`node .scripts/check-syntax.js` parses every `js/*.js` without executing it, and
checks that `sw.js`'s precache list and `index.html`'s script tags agree. Run it
after every change. With ~20 files in one global scope, a stray apostrophe in
`data-year.js` surfaces at runtime as "MONTHS is not defined" three files later.

## Architecture

No build step, no bundler, no npm, no framework. Classic `<script>` tags, one shared
global scope, fixed load order. The repo is the deployable artifact.

**Load order is load-bearing.** `registry.js` must precede the views; `store.js`
before `plan.js` before `sun.js`.

| File | Declares |
|---|---|
| `js/data-year.js` | `MONTHS`, `Q` — the 366, extracted verbatim from the artifact |
| `js/data-year-makers.js` | `MONTHS_MAKERS`, `Q_MAKERS` — the second 366, built clean |
| `js/data-year-classics.js` | `MONTHS_CLASSICS`, `Q_CLASSICS` — the third 366, complete on 26 September 2026, built a month at a time through `.scripts/year-classics/` (the work folders are the evidence trail); `.scripts/check-year.js` is its gate |
| `js/data-practice.js` | `PRACTICES`, `REFLECTIONS` |
| `js/data-intent.js` | `INTENTS`, `EXAMEN_QUESTIONS`, `LOCAL_*` — recovered from `first-light.jsx` |
| `js/data-uplift.js` | `UPLIFT` (film lines and voices for the morning page), `TEACHINGS` (three per month) |
| `js/data-move.js` | `MOVE_WEEK` (seven weekday focuses), `MOVES` (21 timed sessions, the SEQUENCES shape), `moveToday`/`moveLevel`/`moveFor` |
| `js/data-life.js` | `LIFE` — the five-tier goal ladder |
| `js/data-body.js` | `BODY_TEACH`, `EIGHT_LIMBS`, `BODY_VIDEOS` |
| `js/data-astro.js` | `SIGNS`, `A_HISTORY`, `A_ELEMENTS`, `A_MODES`, `A_PLANETS`, `A_HOUSES`, `A_ASPECTS`, `A_HOWTO`, `A_RELATIONS` |
| `js/data-canon.js` | `BIBLE_BOOKS`, `TANAKH_BOOKS`, `JUZ`, `SURAH_AYAHS`, `JUZ_START`, `DHP_CH`, `RV_MANDALAS` (canon structure; `JUZ_START` is also read by `.scripts/plans/legacy.js`) |
| `js/data-library.js` | `FL_LIBRARY` — **generated**, do not hand-edit; run `.scripts/build-library.js` |
| `js/data-plans.js` | `FL_PLANS`, **generated**: do not hand-edit; run `.scripts/plans/build-plans.js`, gate `.scripts/check-plans.js` |
| `js/data-traditions.js` | `FL_TRADITIONS` — the seven authored chambers |
| `js/data-threads.js` | `FL_THREADS` — eight cross-tradition threads |
| `js/text-store.js` | `FLTextLoad`, `FLTextPut`, `FLTextCached`, `FLTextForget`, `FLBytes` |
| `js/texts/**` | **generated** scripture, loaded on demand, never precached |
| `js/registry.js` | `FL_VIEWS`, `FL_ACTS` — must load before any view |
| `js/store.js` | `FL` (the record), `flSave`, `flBoot`, `flStreak`, `flExport`, `flImport` |
| `js/plan.js` | `doyOf`, `MLEN`, `HALL_YEARS`, `hallById`; the Readings: `planDef`, `planDays`, `planDay`, `planAtom`, `planLabelRange`, `planDayLabel`, `planState`, `planPeek`, `planToday`, `planProgress`, `planMarkRead`, `planBeginAgain`, `planCarry`, `planCarryAll`, `planConvertRead`, `courseDays`, `courseReady` |
| `js/sun.js` | `sunAltitude`, `sunPhase`, `sunIsEvening`, `sunApply`, `sunDescribe` |
| `js/reading.js` | a plan's day to library text: `readPartsFor`, `readLoad`, `readRender` (prints the numbers the labels cite), `readSaveCanon`; the teachings and courses loaders (`readTeach*`, `readCourse*`); `PLAN_OF_WORK` |
| `js/ui-*.js` | one `FL_VIEWS` entry each |
| `js/app.js` | `esc`, `announce`, `toast`, hash router, `render()`, SW registration |

Rendering is the house pattern: one `render()` writing string-concatenated HTML into
`<main id="view">`, one delegated handler keyed on `data-act` / `data-change`, a
hash router (`#/view/arg`), state in one object.

## The nav

`renderNav()` in `js/app.js` builds three tiers from `NAV_CLUSTERS`, `NAV_UTILS`,
`NAV_HOMES`, `NAV_UNLISTED` and `NAV_LABELS`. The app opens on Today.

- **The home line**: "First Light" (to `#/today`) on the left, Search and Settings
  small on the right. None of them lights a tab.
- **Four tabs**: Mind (year, vault, floor, astro; chart lights it), Body (body,
  videos, reset), Heart (reflect, journal, life, stats), Soul (library, hall,
  threads). A tab links to the room last visited in it this session.
- **The sub-row** lists the open tab's rooms. `NAV_LABELS` overrides a view's label
  there (vault shows "The Vault", hall "The Readings", threads "The Threads").

Soul holds ONLY the religious material: the Library is a door a reader enters by
choosing to, never mixed with secular rooms. Clear Mornings and the Line-Up are in
`NAV_UNLISTED`: listed nowhere, lighting nothing. Any other registered, non-hidden
view missing from every list is appended to the home line's utilities, so a new view
can never become unreachable. Keys 1 to 4 open the tabs; "/" opens Search.

**Everything the reader typed goes through `esc()`.** The artifact never interpolated
user input so it had no escaping; this app has a journal coming in Phase 3.

## Update discipline

1. Edit files.
2. Bump `?v=N` on the changed files' URLs in `index.html`.
3. **Bump `CACHE` in `sw.js`** (`firstlight-v1` → `firstlight-v2`). This is the whole
   update mechanism.
4. If you add a file, add it to `ASSETS` in `sw.js` **and** a `<script>`/`<link>` tag
   in `index.html`. `check-syntax.js` fails the build if they disagree — that
   mismatch is the one that works online and breaks offline.

## Storage

`localStorage`, one versioned key `firstlight-v1`, one JSON blob, every access in
`try/catch`. Fields: kept, byheart, clear, sessions, checks, days, practice,
intents, journal, examen, canon, prefs (theme, track, todayMode, canonLines,
onboarded, dayEnd, weekAnchor, clearOpened, lat/lon...). Journal ref kinds:
day, examen, debrief, voice, passage, clear — **'clear:' refs are structurally
private: filtered out of the Journal view and search; they render only in
#/clear. Keep those filters when touching either surface.**
`morning` is written by the pacer's five-round latch and by a finished movement
(practice.js) and read by nothing since Today lost its checklist; it stays because
the schema is additive.
**Schema changes are additive only — never rename or repurpose a field.**
Readers have a year of mornings in there and a rename silently orphans all of it. To
change a meaning, add a field and migrate in `flBootMigrate()`.

A write that genuinely fails raises a `fl:storage` event and an assertive toast. It
must never return as though it worked — that was the artifact's defining bug.

Scripture text never goes in `localStorage` (far past the ~5 MB ceiling) and there is
no IndexedDB: the texts are baked into `js/texts/**` and cached on first read by the
service worker (see The Library below).

## The wellness wing (2026-08 pass)

Ten hospitality-wellness features shipped in order; the load-bearing rules:

- **prefs.canonLines** gates every religious surface on the default path (Today's
  canon lines, search's Traditions/Threads groups, the goal ladder's scriptural
  quotes via LIFE_ALT). Asked once at first run, reversible in Settings. Never
  surface Library content on the default path without checking it.
- **prefs.dayEnd** (the shift clock) re-keys `flDateKey` — the whole record
  inherits it. Views needing today's m/d/weekday use `flShiftedNow()`, never
  `new Date()`. sunIsEvening's small-hours edge reads the same pref.
- **Hidden rooms**: #/reset (Walk-In), #/floor (Floor Book), #/clear (Clear
  Mornings), #/lineup (Line-Up). The Walk-In and the Floor Book keep their
  hidden flag but are listed in their tab's sub-row (Body and Mind); Clear
  Mornings and the Line-Up are listed nowhere and light no tab. The Walk-In and Line-Up record NOTHING by
  written decision; the Line-Up must stay stateless (boot skips flMarkDay for
  it). FL.clear is counted, never chained — do not wire it into flStreak, ever.
- **FL.sessions** counts finished sequences only — never the Walk-In's pacer.
- Bands not scores everywhere: byheart (new/turning over/by heart), the
  Record's season words, no earnings data anywhere by refusal.

## The Library

Scripture is **baked into the repo**, not fetched at runtime. `.scripts/fetch-texts.js`
is an authoring tool you run by hand; its output is committed like any other data
file. Then `node .scripts/build-library.js` regenerates `js/data-library.js`.

Two caches, on purpose. The shell lives in `firstlight-vN` and is replaced on every
deploy. Scripture lives in `firstlight-texts-vN` and is **not** versioned with the
shell — 9 MB re-downloaded on every deploy would make "saved for offline" a lie.
Bump `TEXT_CACHE` only when a text is re-baked, and bump `FL_TEXT_V` in
`js/text-store.js` with it.

`js/texts/**` is deliberately **absent** from the service worker's `ASSETS`. Those
files are cached on first read by the fetch handler instead, which is what makes
"open it once and it stays" true without a second storage system.

## The Readings (#/hall, under Soul)

Ten works divided into days of about ten minutes (230 words a minute, 2,300 words),
cut only at natural boundaries, and later a daily course per tradition.

- **`js/data-plans.js` is generated.** `.scripts/plans/` (config, atoms, divide,
  legacy, runtime, build-plans) reads `js/texts/**` and writes it;
  `divisions.json` locks each plan's division hash (`div`), and the build refuses
  a change unless run with `--refreeze`, which keeps the old division in `prior`.
  `node .scripts/check-plans.js` (and `--selftest`) is the gate: atoms, caps,
  labels parsed back by its own grammar, the lock, the legacy map, migration, the
  teaching and course files, and the owner's rules.
- **The record is `FL.readings[id]`** = `{start, read:{day:1}, div, carried, rounds}`,
  id a plan id or `course-<tradition>`. Day one is the day the reader first marks;
  today's reading is the first day not yet read (a missed morning waits). `FL.canon`
  (the retired calendar plans' ticks) is never written by the app and never deleted:
  `planCarry` maps it through `prior.legacy` at boot and after an import, adding
  only days newly covered, so a day the reader unticked stays unticked, and only in
  the first read-through (after Begin again the calendar is remembered, not marked).
  An import merges each record through `planImport`: days read join as a union
  only within one read-through (a backup that has begun again fewer times brings
  no days; one that has begun again more times replaces the round in progress),
  a record under another division is converted first, and `planCarryMerge` joins
  the two devices' carried ticks, marking a day only both together cover.
- **Labels are one function**, `planLabelRange`: the exact passage ("An-Nisa 4:94
  to 4:147", "Dhammapada 90 to 99, The Venerable (Arhat)"), "to" for ranges, no
  dash, no Juz, no composite book names. The reader prints the same numbers.
- **Teachings and courses ship only complete.** `js/texts/teachings/<plan>.js` and
  `js/texts/courses/<tr>.js` are listed in `FL_PLANS.teach` / `FL_PLANS.courses`
  only when the gate has passed the whole set, and load through
  `FLTextLoad(work, part, ver)` under their own hash, never `FL_TEXT_V`.
- **The teachings are written by `.scripts/teachings/`** (read its README first):
  the authoring set `.scripts/plans/teachings/<plan>.json` is written only by
  `land-batch.js`, gated by `.scripts/check-teachings.js` (the whole brief, against
  the real texts), and emitted by `build-plans.js`: complete sets to
  `js/texts/teachings/`, a set in progress to the git-ignored
  `js/texts/teachings/_preview/`, read only with `?preview=teachings` in the address.
  The closed roster is `.scripts/teachings/roster.json`; `config.js` derives
  `TEACH_ROSTER` from it.
- **Nothing of it reaches Today.** `ui-today.js` must not mention `FL_PLANS`,
  `planToday`, `hallById`, `readRender`, `POOLS` or `#/hall`; the gate fails if it
  does. Traditions are never ranked (the works in the Library's shelf order, the
  courses in `FL_TRADITIONS` order). No em dash or " -- " anywhere in the Readings'
  files; text, not glyphs.

## Dev gotchas (hard-won)

- **Cache Storage is per-origin.** `zpullen98-gif.github.io` hosts The Bartender's
  Ledger, The Sommelier's Codex, and Calendar For Life. An unfiltered `caches.keys()`
  reap wipes their offline shells. `sw.js` only ever deletes keys starting
  `firstlight-`. Keep it that way.
- **bfcache can restore an old JS heap.** Test with a unique query string
  (`?fresh=anything`), not just a reload.
- **`const` at top level of a classic script** creates a *lexical* global, not a
  property of `window`. It is visible to later scripts but invisible to
  `vm.runInContext`. This is why `check-syntax.js` compiles rather than evaluates.
- **`toISOString()` is the wrong way to build a date key.** East of Greenwich it
  rolls over before local midnight, so a 9pm entry lands on tomorrow and breaks the
  streak walk. Use `flDateKey()`.
- **`navigator.onLine` lies** — `true` on a captive portal, and `true` again when the
  machine has a connection but this app's host is unreachable, which is the common
  case. Never branch messaging on it; write copy that is true either way.
- **`cache.addAll` is atomic.** One 404 rejects the whole call, the worker installs
  with *no* cache, and it still activates — so install never re-runs to fix itself.
  The app then looks perfectly healthy online and is completely broken offline.
  `sw.js` precaches one asset at a time and logs what failed.
- **Verify every Project Gutenberg id against its title.** ID 65566 has a plausible
  size for Griffith's Rig Veda and is *Porgy* by DuBose Heyward.
- **Day-of-year has exactly one definition**, `doyOf()` in `plan.js`, using a fixed
  366-slot table with February at 29. The artifact had two that disagreed in common
  years. The almanac is dated: 1 January is Seneca every year. The cost is that slot
  60 is unreachable outside a leap year, which is intended — that voice is the leap
  day's. `sun.js` deliberately uses the *real* calendar instead; the sun does not
  observe the almanac's fiction.

## Theme

Four palettes — `night`, `firstlight`, `day`, `dusk` — selected by `data-phase` on
`<html>`, driven by real solar altitude. **All colour lives in `css/firstlight.css`;
`sun.js` never touches a hex value.** Readers can pin one palette in Settings.

Palette runs on *altitude*, not sunrise/sunset events: altitude is continuous,
defined at every latitude on every day, and needs no null-guard inside the polar
circles, where rise and set simply do not occur.

Type: Cormorant Garamond for voice, Karla for interface. Both self-hosted variable
fonts, latin subset, 93 KB for all three files. No Google Fonts at runtime.

**Typography, not pictures.** No emoji or dingbats in the interface; state is named in
words. Astrological glyphs are the one deliberate exception — they are the notation.

## Where this is going

Phase 1 (done) — persistence, routing, offline, palette, real streaks, export/import.
Phase 2 (done): local scripture (`js/texts/**`), completion marks; then the Readings
(2026-09-26): exact days, day one the day you begin, teachings and courses to come.
Phase 3 — journal, search, guided morning, evening examen, intent detour, heatmap.
Phase 4 — real ephemeris and natal chart; the body practice engine.
Phase 5 — audit all 366 citations.
Phase 6 — a third 366, The Classics (philosophy and literature), complete on
26 September 2026; The Canons (the religious-tradition balance) still owed after it.

See `HANDOFF.md` for full context and the decisions worth not reversing.

## House art direction, 27 September 2026

The owner's Explorer's Library direction now extends to First Light. This intentionally
supersedes the earlier "typography, not pictures" rule for the decorative masthead.
All words and controls remain real HTML. `assets/first-light-dawn-v1.webp` is a dawn
library scene, 1536 by 1024, compressed to 416,874 bytes; it and the added Cinzel
font are cached with the shell. Font licensing is in `fonts/house-OFL.txt`.

`css/house.css` supplies the shell and the four solar palettes. `house-library.css`
and `house-practice.css` cover the reading and practice surfaces. The original
Cormorant Garamond reading face and Karla interface face are retained. Keep the
pre-paint palette values in index.html aligned with --bg for each phase.

`js/house.js` loads after app.js, adds presentation-only route markers through
renderNav, and makes the Today masthead compact during the guided morning. It does
not alter records, privacy choices, content, practice timers or completion rules.
Keep the existing safe-area insets, keyboard focus and reduced-motion treatment.

For the suite, commit source changes then use OutsideOfTime's resync-light script.
Hand-merge index.html and sw.js, preserving the wing's integration; order there is
app.js, house.js, oot-light.js. New CSS, font and artwork need precache entries too.
The release uses firstlight-v87 in source and oot-light-v83 in the wing. Permanent
texts-v3 caches remain unchanged. The live public destination remains /light/;
standalone FirstLight GitHub Pages was not enabled for this design change.
