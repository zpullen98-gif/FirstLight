# First Light — A Year of Mornings

An offline-first daily-practice PWA. 366 dated voices, five scripture year-plans,
a goal ladder, a body chapter, an astrology chapter, and a vault of kept words.

Rebuilt from `~/Downloads/first_light_year_4.html`, a single-file claude.ai artifact.
That file is the archive — never edit it, and never treat it as the source of truth.

## Run it

```bash
py serve.py 8633
```

`?nosw` on the URL skips service-worker registration — use it when debugging a
caching problem, so you are not fighting the cache to look at the cache.

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
| `js/data-practice.js` | `PRACTICES`, `REFLECTIONS` |
| `js/data-intent.js` | `INTENTS`, `EXAMEN_QUESTIONS`, `LOCAL_*` — recovered from `first-light.jsx` |
| `js/data-life.js` | `LIFE` — the five-tier goal ladder |
| `js/data-body.js` | `BODY_TEACH`, `EIGHT_LIMBS`, `BODY_VIDEOS` |
| `js/data-astro.js` | `SIGNS`, `A_HISTORY`, `A_ELEMENTS`, `A_MODES`, `A_PLANETS`, `A_HOUSES`, `A_ASPECTS`, `A_HOWTO`, `A_RELATIONS` |
| `js/data-canon.js` | `BIBLE_BOOKS`, `TANAKH_BOOKS`, `JUZ`, `SURAH_AYAHS`, `JUZ_START`, `DHP_CH`, `RV_MANDALAS`, `POOLS` |
| `js/data-library.js` | `FL_LIBRARY` — **generated**, do not hand-edit; run `.scripts/build-library.js` |
| `js/data-traditions.js` | `FL_TRADITIONS` — the seven authored chambers |
| `js/data-threads.js` | `FL_THREADS` — eight cross-tradition threads |
| `js/text-store.js` | `FLTextLoad`, `FLTextPut`, `FLTextCached`, `FLTextForget`, `FLBytes` |
| `js/texts/**` | **generated** scripture, loaded on demand, never precached |
| `js/registry.js` | `FL_VIEWS`, `FL_ACTS` — must load before any view |
| `js/store.js` | `FL` (the record), `flSave`, `flBoot`, `flStreak`, `flExport`, `flImport` |
| `js/plan.js` | `doyOf`, `MLEN`, `PLAN_*`, `HALL_YEARS`, `canonState/Doy/Progress` |
| `js/sun.js` | `sunAltitude`, `sunPhase`, `sunIsEvening`, `sunApply`, `sunDescribe` |
| `js/canon.js` | `READERS` — the five scripture fetchers |
| `js/ui-*.js` | one `FL_VIEWS` entry each |
| `js/app.js` | `esc`, `announce`, `toast`, hash router, `render()`, SW registration |

Rendering is the house pattern: one `render()` writing string-concatenated HTML into
`<main id="view">`, one delegated handler keyed on `data-act` / `data-change`, a
hash router (`#/view/arg`), state in one object.

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
**Schema changes are additive only — never rename or repurpose a field.**
Readers have a year of mornings in there and a rename silently orphans all of it. To
change a meaning, add a field and migrate in `flBootMigrate()`.

A write that genuinely fails raises a `fl:storage` event and an assertive toast. It
must never return as though it worked — that was the artifact's defining bug.

Scripture text will go to **IndexedDB** in Phase 2, not `localStorage` (far past the
~5 MB ceiling) and not Cache Storage (see below).

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
  Mornings), #/lineup (Line-Up). The Walk-In and Line-Up record NOTHING by
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
Phase 2 — IndexedDB scripture cache, per-canon start dates, completion marks.
Phase 3 — journal, search, guided morning, evening examen, intent detour, heatmap.
Phase 4 — real ephemeris and natal chart; the body practice engine.
Phase 5 — audit all 366 citations.
Phase 6 — the second 366 ("The Canons") as a switchable track.

See `HANDOFF.md` for full context and the decisions worth not reversing.
