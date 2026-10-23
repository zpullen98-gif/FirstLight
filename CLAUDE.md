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

For the suite, the public site now lives in `C:/Users/zpull/OutsideOfTime/_publish`.
The old workshop's resync and publish scripts are retired: do not run them.
Commit source changes first, then merge only that reviewed source delta into the
public `light/` copy. It has deliberate differences: profile-scoped records,
dash-free prose, shared scripts, the suite manifest, and its own worker prefixes.
Use a three-way merge against the source commit the delta starts from, never a
directory copy. Stop on a conflict and review it before writing anything.
Hand-merge index.html and sw.js, preserving the wing's integration; order there
remains app.js, house.js, oot-light.js. Bump changed URL stamps and the wing's
oot-light cache. New assets need precache entries. Run source check-syntax and
check-flow plus the public site's tools/check-all.mjs before publication.
Permanent texts-v3 caches remain unchanged. The live public destination is /light/;
standalone FirstLight GitHub Pages was not enabled for this design change.

## Shared service and Today, 4 October 2026

The common service controller exposes `html[data-service="day"|"night"]` and
`window.OOT.service`, dispatching `oot:servicechange` when it changes. sunApply
maps that choice into the existing four-phase palette without repainting the
view or changing FL.prefs.theme. When the controller is present, Settings offers
Day service and Night service; the saved solar preference remains the fallback
when the controller is absent. Location still informs the solar summary.

Today always offers one yoga film and one workout, including the guided Move
step. The owner-requested counter beneath the workout is independent of sessions,
moves and completion records. `FL.workoutSets[flToday()][videoId]` is additive,
stores `{count,updated}`, and uses the same shift boundary as the rest of the app.
A tap saves immediately and updates only the counter, preserving the player.
Undo reverses the last counter action in this session; a reset retains a zero
record so an older backup cannot revive it. Import joins days/videos and chooses
the newest edit for one count. `.scripts/check-flow.js` exercises the live source;
pass a deployable root as its first argument to check the public copy as well.

## Dawn Anthology cast, 11 October 2026

The owner’s Table Out Of Time Cast adds six gatherings with 71 guests and Lizzy,
the original host. Each guest began with ten citable selections, including existing
anthology entries. Lizzy awaits the owner’s original text. `js/data-dawn-cast.js`
indexes quote IDs from `js/data-anthology.js`; `js/ui-dawn-cast.js` supplies the
cast index and individual shelves within `#/anthology`. Character aliases are
searchable, and the index follows the PDF’s group order and episode numbers.

The owner explicitly authorised attributed accounts and later portrayals where
personal words are scarce. Preserve the distinction between actual speaker and
the character a passage concerns. `kind` is words, account, portrayal or tradition.
Source panels retain original work, location, edition, context and evidence links.
New translations expose `originalText`, `originalLanguage` and `translation`.
Never silently turn a screenplay draft into released dialogue or an account into
the subject’s own speech. Evidence and exclusions live in
`.scripts/anthology-cast-audit.json`; earlier audits remain intact.

The requested cast includes religious figures within this explicitly chosen
anthology shelf. Their transmitted words are labelled `tradition` and remain
library-only, as do accounts and other passages needing their full setting.
This exception does not change the default Today path or the Soul privacy rules.
The original ten-selection Today layout was superseded by the three-quote
restoration below. Cast browsing changes no personal records.

Run `.scripts/check-anthology.js` as well as syntax and flow checks before release.
It verifies the full roster, references, evidence shape, aliases, safe rendering,
source labels and library-only exclusions.

## Today’s three and the complete anthology, 11 October 2026

The owner restored Today to one dated Year voice plus two lines under A lift for
the day. The original Lift and Classics pools supply the pair, retaining existing
citations and provenance notes. Another changes the session’s pair in place so
films, set counters and a running pacer survive. The shifted day resets that seed;
normalized text prevents either lift from repeating the dated voice or the other.
The guided walk keeps its dated voice first and the two lifts with The practice.

The Dawn Anthology became the common quotation shelf with 789 sourced selections,
all three completed 366-entry Year tracks and the 156 original Lift entries.
Lazy adapters in anthology.js read the existing arrays without copying or changing
them. Original entries keep their citation qualifications and are explicitly
distinguished from the newer source-checked additions. Their dates are reading
slots, so identical wording in separate dated records or editions is preserved.
The Year and Vault remain working utilities; anthology browsing never switches
a track or rewrites kept/by-heart keys. Global quote search opens anthology
permalinks, while the scripture preference and private journal filters still hold.
Keep existing Lift slots in their current order so lift-NNN links remain stable.

Run check-today-quotes.js and check-anthology-library.js alongside check-syntax.js,
check-flow.js and check-anthology.js before release. The new checks cover all
three tracks, distinct lift pairs, day rollover, exact legacy citations, original
collection filtering, links and state-preserving updates.

## Historical leaders expansion, 11 October 2026

The twelve leaders in Ghosts at the Golden Table now have twelve selections each.
Twenty-four new passages bring the source-checked shelf to 813 and the complete
library to 2,067 entries. The first page offers one new passage from every leader;
each leader's profile begins with that person's two additions. Cast cards report
the actual selection count, allowing the shelves to grow beyond the initial ten.

Speeches and correspondence retain their dates, excerpt boundaries and historical
setting. The two new de Gaulle translations expose French wording and translation
notes; Washington's early-access letter transcription is labelled. The Jefferson
patents letter and de Gaulle Oxford speech are cited through institutional extracts,
with that scope made explicit. Research, source budgets, exclusions and independent
review are recorded in `.scripts/anthology-leaders-expansion-audit.json`.

Earlier source records, original Year/Lift data and personal records are unchanged.
These additions are library-only; Today remains the dated voice plus two lifts.
Run the same five First Light gates and the public suite checks before publication.

## The Lantern Stage, 11 October 2026

Twelve requested writers now have ten additional selections each, bringing the
source-checked shelf to 933 and the complete library to 2,187 entries. These author
profiles live separately from the original PDF cast in `js/data-dawn-writers.js`.
`js/ui-dawn-writers.js` supplies `#/anthology/writers` and `#/anthology/writer-ID`.
The first anthology page offers one new line from each author in the requested order.
The Poets & playwrights filter finds all 120, and author names, aliases and work
titles are searchable. The UI credits the speaking character separately from the
writer. Original spelling in quotations and named translations is retained.

The reading shelves contain 24 free complete-text links, twelve authorised excerpts
and one library catalogue link. Keep these access labels explicit, especially for
modern plays. External texts require a connection and are not cached in the app.
Primary editions, publisher previews, theatre education materials and published
interviews support the selections; generic quotation websites are not evidence.
Research, source budgets, independent review and the resulting context corrections
are retained in `.scripts/anthology-dramatists-audit.json`.

Today still has three quotations. Previous anthology records, the original cast,
Year/Lift data and personal records are unchanged. Run the same five First Light
gates and public suite checks, plus desktop, phone, palette and offline route checks.

## The Poets’ Study, 11 October 2026

Mind now includes a dedicated study room at `#/poets`, with separate Shakespeare
and Chaucer tabs. `js/data-poets.js` indexes 100 new selections per writer from
the anthology. The source shelf now contains 1,133 selections, the complete library
2,387. Both Lantern Stage author indexes contain 110 selections; their earlier ten
still render on the old profile, with a prominent link to the additional hundred.
Existing source records, legacy arrays, cast references and Today remain unchanged.

`js/ui-poets.js` renders the entrance, an author's passages, works/free editions,
suggested reading path and individual work routes. `css/house-poets.css` inherits
the house palettes and typography. Work, theme and text filters are session-only;
pagination starts with twelve cards. Subroute changes reset scroll and focus like
anthology subroutes. Every selection remains searchable in the main anthology.

There are 33 Shakespeare works and 23 Chaucer works or sections. Quotations retain
their source wording and edition-specific locations. Chaucer's original Middle
English has a separately labelled, original plain-English reading aid. Prompts and
reading paths are editorial guidance, never completion records. Collaborative
Shakespeare plays carry visible `authorCredit` qualifications and source context;
the indexed `author` field remains the writer's shelf identity. Search includes
both fields, the gloss, study prompt and themes.

The research and independent reviews are in `.scripts/anthology-poets-audit.json`.
The public-domain editions are linked at work or scene anchors, with their actual
edition identified. External full texts need a connection; passages and study notes
are cached with the shell. No permanent scripture text cache changes are involved.
Run `.scripts/check-poets.js` alongside all five existing First Light checks and
the public suite gate, plus phone/desktop, palette, focus, search and offline checks.

## The Canterbury reading companion, 15 October 2026

Chaucer's study now includes `#/poets/chaucer/canterbury`: an introduction,
all 24 tales plus General Prologue and Retraction, six close-reading lessons,
and 28 glossary entries. `js/data-canterbury.js` holds the authored guide;
`js/ui-canterbury.js` renders its nested routes through the existing poets view.
`css/house-poets.css` keeps the same house palettes and responsive reading faces.
The 18 paired excerpts contain 94 lines of original Middle English alongside
new current-English learning translations. These are selected passages, not
a complete modern-English translation. Summaries describe the whole collection.

The editorial pass reviewed all 110 Chaucer selections, improved commentary on
87 and revised the 23 work introductions and reading path. Every Chaucer card
now displays its plain-English aid beside the original without opening details.
Quotation wording, speakers, source locators, IDs, counts and other writers stay
unchanged. The earlier ten gained separately labelled glosses and study prompts.

Keep plot summaries distinct from interpretive guidance. Do not turn a pilgrim's
claim into Chaucer's personal belief or a coercive ending into a general rule for
life. The original text, exact excerpt boundaries and Skeat's edition-specific
group/line references are retained. The tale sequence follows the linked Skeat
edition, with its difference from familiar modern fragment order explained.
The four public-domain editions and linked Harvard learning resources are free
external reading; modern translations on those sites were not copied here.

The companion writes no progress or personal records. Search is session-only.
All guide content and selected readings are precached with the shell; outside
editions require a connection. Both scripture text caches remain unchanged.
Research, editorial decisions and independent reviews are in
`.scripts/anthology-chaucer-reading-audit.json`. Run `.scripts/check-canterbury.js`
with the six existing First Light checks, and the public site's full suite gate.
Verify mobile/desktop, day/night, tale/lesson links, search, focus and offline
behaviour. Today retains its three-quote format.

## The Anthology reading year, 23 October 2026

The owner chose twelve quotations per day, in three readings of four. The Anthology
now opens on Daily readings, with Year calendar and Explore the library as its
other two doors. `#/anthology/read/YYYY-MM-DD/1` (or 2 or 3) is a dated reading;
`#/anthology/calendar/YYYY-MM` opens a month, and `#/anthology/library` searches
all 2,387 existing entries. Old quote, cast, writer and Poets' Study links remain
valid, with their original sources, interpretations and free-edition links.

`js/anthology-calendar.js` interleaves the fourteen collections proportionally,
using the existing fixed 366-slot `doyOf` convention. Common years omit February
29, and the complete collection is still covered. A second occurrence of the same
normalised wording is deferred to another day without dropping its record. The
year revisits passages because twelve selections per day exceeds the corpus.
The three reading prompts are editorial invitations, not shared claims or themes
attributed to the quoted speakers. Today's three-quote system is unchanged.

This is an explicitly entered anthology, so labelled accounts, portrayals and
faith traditions remain available here. Legacy Year/Lift citations remain honestly
labelled as not newly reviewed. No quotation dataset or personal Year/Vault key
was changed. Browsing never marks a reading, and filters remain session-only.

`FL.anthologyRead` is additive: date:part:quotation-ID-hash maps to `{done, updated}`.
Only an explicit mark changes it; undo keeps a newer tombstone. Import merges by
timestamp (an equal-time undo wins), and old composition hashes cannot mark a
changed reading complete. Failed saves restore both the record and fallback copy.
The normal profile-scoped blob, export and import carry this field unchanged.

Run the seven existing First Light gates plus `check-anthology-calendar.js` and
`check-anthology-browser.cjs`. The browser check accepts a source root, public
light root or URL and an output directory. It covers phones, desktop, day/night,
reading/calendar/library navigation, Poets return paths, sources, marks and offline
routes. Release through a reviewed three-way delta from the pre-edit source commit;
preserve the public store's profile keys, shell integration and separate worker.

## Personal astrology and the monthly sky, October 2026

`#/astro` opens the current monthly sky. `#/astro/month/YYYY-MM` keeps a deliberately
selected month; `#/astro/learn` holds the reference in ten expandable chapters.
`#/chart` retains the natal wheel and editable local birth record. Never embed a
real person's birth date, time or location in code, fixtures, URLs or a public commit.
Set personal details through the chart form in that person's browser profile.

`chartFromBirth(b)` validates `FL.prefs.birth` and resolves historical civil time.
Missing times and DST gaps/folds require correction rather than an invented noon.
`astroMonthBuild(year, month, natal, {zone})` calculates geocentric tropical aspects,
phases, sign changes and stations. Calendar boundaries have their own resolver;
birth-time ambiguity checks must not be reused for midnight month boundaries.
Monthly results are held in a four-entry memory cache, not the saved personal record.

`ui-astro-month.js` provides the monthly view and learning flow; `house-astro.css`
uses the existing service palettes. Current-month selection follows `flToday()` and
refreshes on visibility or a visible one-minute check. A browsed month stays selected.
The astronomy library and city list execute lazily, but are now precached with the
shell to cover a first visit before service-worker control. The chart fetch path
prefers that release's shell copy. The permanent scripture cache remains unchanged.

Verification: `.scripts/check-chart.cjs`, `.scripts/check-astro-month.cjs`, and
`.scripts/check-astro-browser.cjs [source-or-public-root] [output-directory]`.
The browser check uses synthetic details and covers phone/desktop, palettes,
accessibility, navigation, reload, month rollover, retry and first-visit offline use.
The browser outputs are evidence, not deployable files. Publish only a committed
three-way source delta into the public fork; preserve its profile storage, suite
scripts and `oot-light-*` cache names. Run the public `tools/check-all.mjs` gate.
