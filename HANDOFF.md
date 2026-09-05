# First Light — handoff

Paste-ready context for a fresh session.

## What it is

An offline-first PWA for a daily contemplative practice, at `C:\Users\zpull\FirstLight`.
Run it with `py serve.py 8633`. Repo: <https://github.com/zpullen98-gif/FirstLight>
(branch `main`, public). **GitHub Pages is not yet enabled** — Settings → Pages →
Deploy from a branch → `main` / `(root)`. The Save button is inline beside the two
dropdowns, not at the bottom of the page, and only appears once the branch is
changed from *None*.

Fourteen views: **Today** (guided morning / evening examen / whole page), **The
Year** (all 366), **A Life Well Lived** (goal ladder), **The Library** (ten works,
seven traditions, plus chambers and threads), **The Body**, **Astrology** (+ a real
natal chart at `#/chart`), **Vault**, and the tools row — **Journal**, **Search**,
**The Record**, **Settings**. Plus `#/hall`, the five reading plans, reached from
the Library and hidden from the nav.

**The nav is five clusters, and The Library is one of them.** It used to sit inside
"The Book" between the secular 366 and the sky, which made scripture read as one
more chapter of the same book. It is now its own top-level tab, with `#/hall` and
`#/threads` lighting it rather than the Book. The matching half of that change is in
Today: when `FL.prefs.canonLines` is off, the morning has **no reading step and no
reading section at all** — not even a pointer. `todayCanonQuiet()` used to draw a
faint "there is a Library, when you want it" line into the reading slot, which spent
a step of the morning re-offering something the reader had already declined at first
run. It is deleted. Do not reintroduce it: the tab is the discoverability, and the
promise is that nobody is walked into the religious rooms.

## Origin

Two predecessors in `~/Downloads` are **archives, not sources** — never edit them:

- `first-light.jsx` (108 KB, React original) generated each morning live via three
  `POST`s to `api.anthropic.com`. It had an intent picker, an evening examen, a
  correct `computeStreak`, and practice-completion marking.
- `first_light_year_4.html` (139 KB) is the artifact this was rebuilt from. Cutting
  the API dependency is what flattened it: those four features were dropped and
  `computeStreak` became `days.length`.

## Why it needed rebuilding

- **Nothing persisted.** State went through `window.storage.get/set`, which does not
  exist in a browser; the catch parked values in an object that died on refresh.
- **Nothing worked offline** — no manifest, no service worker, Google Fonts by
  `@import`, all scripture fetched live.
- **No routing** — seven sections toggled by a `.hide` class.
- **Two disagreeing day-of-year computations**, desynchronising the reflection from
  the canon readings for ten months of every common year.
- **The Rig Veda reader was 100% dead** — it requested a Wikisource title that
  returns `missingtitle`. Every Veda day failed behind a generic error.
- **The Dhammapada parser lost 18 verses** — Müller sets nine verse *pairs* as one
  paragraph ("58, 59. As on a heap of rubbish…") and the regex required a digit
  followed directly by a period. 405 of 423.

## Architecture

No build step, no bundler, no npm, no framework. Classic `<script>` tags, one shared
global scope, fixed load order. **The repo is the deployable artifact.** Matches the
sibling PWAs (BartendersLedger, SommeliersCodex, CalendarForLife).

157 JS files, of which 122 are baked scripture. Repo ~44 MB; scripture ~10.6 MB.

**Load order is load-bearing:** `registry.js` (declares `FL_VIEWS`/`FL_ACTS`) must
precede every view; `store.js` → `plan.js` → `sun.js` → `text-store.js` →
`reading.js`; `app.js` last.

| File | Declares |
|---|---|
| `js/data-year.js` | `MONTHS`, `Q` — the Philosophers 366. Entries are `[day, quote, source, tradition, note?]` |
| `js/data-year-makers.js` | `MONTHS_MAKERS`, `Q_MAKERS` — the second track. **274 of 366 written** |
| `js/tracks.js` | `FL_TRACKS`, `flActiveTrack`, `trackQ`, `trackMonths` — the corpus swap |
| `js/data-practice.js` | `PRACTICES`, `REFLECTIONS` |
| `js/data-intent.js` | `INTENTS`, `EXAMEN_QUESTIONS`, `LOCAL_*` — recovered from the `.jsx` |
| `js/data-life.js` · `data-body.js` · `data-astro.js` · `data-canon.js` | content |
| `js/data-library.js` | `FL_LIBRARY` — **generated**, run `.scripts/build-library.js` |
| `js/data-traditions.js` | `FL_TRADITIONS` — seven authored chambers |
| `js/data-threads.js` | `FL_THREADS` — eight cross-tradition threads |
| `js/data-cities.js` | `FL_CITIES`, `FL_ZONES` — **generated**, 4,000 cities |
| `js/registry.js` | `FL_VIEWS`, `FL_ACTS` |
| `js/store.js` | `FL`, `flSave`, `flBoot`, `flStreak`, `flExport`, `flImport` |
| `js/plan.js` | `doyOf`, `MLEN`, `PLAN_*`, `HALL_YEARS`, `canonState/Doy/Progress/MarkRead` |
| `js/sun.js` | `sunAltitude`, `sunPhase`, `sunIsEvening`, `sunApply` |
| `js/text-store.js` | `FLTextLoad/Put/Has/Cached/Forget`, `FLBytes`, `FL_TEXT_V` |
| `js/reading.js` | maps plan units to library text; `readRender`, `readSaveCanon` |
| `js/journal.js` · `search.js` | writing and search |
| `js/astro-chart.js` · `astro-wheel.js` | ephemeris maths and the SVG wheel |
| `js/practice.js` | breath pacer, sequence timer |
| `js/vendor/astronomy.js` | astronomy-engine 2.1.19, MIT, 116 KB |
| `js/ui-*.js` | one `FL_VIEWS` entry each |
| `js/app.js` | `esc`, `announce`, `toast`, hash router, `render()`, SW registration |

Rendering: one `render()` writing string-concatenated HTML into `<main id="view">`,
one delegated handler on `data-act`/`data-change`, a hash router (`#/view/arg` — the
arg keeps its slashes), state in one object. **Everything the reader typed goes
through `esc()`.**

## Decisions worth not reversing

- **No build step.** Classic scripts, one global scope.
- **`localStorage` under `firstlight-v1`, additive schema only.** Never rename a
  field. Migration from the artifact's `fl2:*` keys runs in `flBootMigrate()`.
- **Scripture is baked into the repo, not fetched.** `.scripts/fetch-texts.js` is an
  *authoring tool run by hand*, output committed. The live-fetch plan was abandoned
  because bible-api.com caps 15 req/30s and asks users not to download whole bibles,
  Sefaria directs bulk users to its exports, and Wikimedia rate-limits with
  well-formed *empty* JSON — ~82 MB of traffic to store ~12.5 MB.
- **Two caches, deliberately.** Shell in `firstlight-vN` (currently **v23**), replaced
  every deploy. Scripture in `firstlight-texts-vN` (currently **v3**), **not**
  versioned with the shell — 10 MB re-downloaded per deploy would make "saved for
  offline" a lie. Bump `TEXT_CACHE` and `FL_TEXT_V` together when a text is re-baked.
- **`sw.js` reaps only `firstlight-` keys.** Cache Storage is per-origin and
  `zpullen98-gif.github.io` hosts the sibling PWAs.
- **`sw.js` precaches one asset at a time, not `addAll`.** `addAll` is atomic: one
  404 installs the worker with *no* cache, it still activates, and install never
  re-runs. Online it looks perfect; offline it is dead.
- **One `doyOf()`, fixed 366-slot table.** A given date draws the same voice every
  year. Slot 60 is unreachable outside a leap year on purpose.
- **Palette runs on solar *altitude*, not sunrise/sunset events** — continuous,
  defined at every latitude, no polar null-guards.
- **Astrology keeps its sceptical framing note.** Do not quietly drop it.
- **Citation policy:** a confident false citation is worse than an honest "attributed
  to". The line is kept, the byline is corrected, a provenance note goes underneath.
  Nothing is deleted — a reader may already have kept that day.

## Current state — all shipped and verified

**Phase 1.** Real persistence, hash routing with focus management and a live region,
installable + fully offline, four sun-driven palettes, real streaks, JSON
export/import (merge-not-replace, keeps the longer text on collision).

**Phase 2 — The Library.** Ten works, seven traditions, 10.6 MB, all baked:

| Work | Translation | Extent |
|---|---|---|
| The Bible | World English Bible | 66 books · 1,189 ch · 31,095 v |
| The Hebrew Bible | JPS 1917 | 39 books · 929 ch · 23,206 v |
| The Qur'an | Pickthall | 114 surahs · 6,236 ayahs |
| The Rig Veda | Griffith | 10 mandalas · 1,028 hymns · 10,497 v |
| The Dhammapada | Müller | 26 ch · 423 v |
| The Bhagavad Gita | Edwin Arnold | 18 ch |
| Three Upanishads | Paramananda | Isa, Katha, Kena + commentary |
| The Tao Te Ching | Legge | 81 ch |
| The Analects | Legge | 20 books · 498 ch |
| The Zhuangzi | Giles | 33 ch |

Plus an authored chamber per tradition and eight cross-tradition threads. One real
gap: Griffith exiled RV 1.179 to an appendix in Latin on grounds of decency, so the
app prints his editor's note rather than claiming the hymn is unavailable.

**The migration.** Reading plans read from local text via `reading.js`; `canon.js`
and its four live fetchers are deleted. The whole Bible saves to a device in **14
seconds**. Per-canon personal start dates and completion marks with a progress bar;
marking updates in place so scroll position survives.

**Phase 3.** Journal (attached to a day, a kept voice, a passage, or the examen;
autosave; in the export), guided five-step morning, evening examen keyed to
`sunIsEvening()`, intent detour, search across everything in memory, 366-cell year
heatmap at `#/stats`.

**Phase 4.** Natal chart at `#/chart` — ten bodies, ASC/MC, house cusps, aspects, an
SVG wheel with glyph collision-avoidance, and a data table that is always present.
Validated against four published reference charts (NYC 1990, London 2000, Sydney
1985, Tromsø 1980), **all matching to the arcminute**, plus a geometric check that
the computed Ascendant sits at altitude 0 in the eastern half. Breath pacer,
interval timers and written sequences in `practice.js`.

**Phase 5 — in progress. January, February and March audited (91 of 366).**
See `SOURCES.md` for the full record.

## Traps, all verified — do not re-learn them

- `Astronomy.EclipticLongitude()` is **heliocentric** and throws on the Sun. It puts
  Mars in Gemini where the chart needs Cancer. Use
  `Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon`.
- **Obliquity** must come from the polynomial in `astro-chart.js`, never from
  `Rotation_ECT_EQD`, which returns a negative value that leaves the MC correct and
  the ASC silently wrong — half the output looking right is the worst kind of bug.
- **Do not bundle IANA tzdata.** `data-cities.js` carries each city's zone *name* and
  the browser's `Intl` supplies the historical offset. Verified on the 1974 US
  year-round-DST year, Indianapolis pre/post-2006, and 1970 British Standard Time.
- **Placidus is undefined above ~66.56°** — the cusp genuinely does not exist. Falls
  back to Whole Sign with a note.
- **`navigator.onLine` lies** — true on a captive portal, and true when the machine
  is online but this app's host is not. Never branch messaging on it.
- **`cache.addAll` is atomic** — see above.
- **Verify every Project Gutenberg id against its title.** ID 65566 has exactly the
  right size for Griffith's Rig Veda and is *Porgy* by DuBose Heyward.
- **Dev caching friction:** the SW's `{ignoreSearch:true}` makes `?bust=` useless.
  Use `?nosw=1`, and unregister first — an already-registered worker still controls
  the page, and a second tab on the same origin keeps the registration alive.
- **`const` at top level of a classic script** is a lexical global: visible to later
  scripts, invisible to `vm.runInContext`. This is why `check-syntax.js` compiles
  rather than evaluates.
- **`toISOString()` is the wrong way to build a date key** — east of Greenwich it
  rolls over before local midnight. Use `flDateKey()`.

## What's left

**Phase 5 — nine months remain** (April–December, 275 entries). March is done;
see SOURCES.md, which now also carries the two editorial rules March forced into
the open (when a tradition tag travels with a name, and when a shipped quotation
may be edited). Method that works:
a `Workflow` with 4–6 verify agents of ~6 entries each, then one adversarial agent
told to *refute* everything claimed genuine, returning raw findings so a failed
synthesis cannot lose the research. A 24-agent run hit a hard session limit; 5–6
agents completes reliably.

Then `node .scripts/apply-citations.js <month>` — it is idempotent, refuses to write
if any expectation fails, and can move a tradition tag along with an attribution.
Add the month to `AUDITED_MONTHS` in `ui-settings.js` and write up `SOURCES.md`.

March is Confucian and Stoic and contains **"Attributed to Confucius" twice** and
"Attributed to Xunzi" once — after February, treat an existing hedge as a warning
rather than a reassurance, in *both* directions: January's day 30 hedge was too
weak and turned out to have a real citation, February's day 8 was too strong.
April is heavily Laozi, where "attributed to" is doing a lot of load-bearing work.

**Phase 6 — the second 366, "The Canons".** Not started. The existing year is
**82.8% Stoic/Taoist/Confucian/Roman** (303 of 366 entries, counted directly from
the `tradition` field in `js/data-year.js` after March's audit — an earlier "94%"
here was never measured; it was 305 before March moved days 2 and 4 to Wisdom) with no Buddhist, Hindu, Jewish, Christian,
Islamic, Sikh, Sufi, Zen or Indigenous voices, in an app whose Library teaches ten
works across seven traditions. The `.jsx` drew on 17.

**Track switching is now fully wired, and the first second-track is The Makers, not
The Canons.** `js/tracks.js` holds the registry and the corpus swap — `trackQ()` and
`trackMonths()` replaced every direct read of `Q` and the track-specific reads of
`MONTHS`, so a third track is a data file and one registry entry. `FL.prefs.track`
had namespaced the vault keys for a long time but nothing ever swapped the corpus;
`dayEntry()` always read the one global `Q`.

**A track is only offered once all 366 days exist.** `flTrackComplete()` counts
them, `flTracksOffered()` filters on it, and `flActiveTrack()` falls back to the
Philosophers when the preference names an unfinished track — which is what lets a
half-written corpus sit in the repo safely, because `dayEntry()` treats a missing
day as a loud data bug and is right to.

**The Makers: 274 of 366.** January through September are written
and recorded in SOURCES.md; the second half is in progress. Method is a workflow per month:
four curators propose in different domains, a verifier rules on every candidate,
and an editor selects and dates from the survivors only. It is built *clean*, not audited clean afterwards — motivational quotation is
the most corrupted body of text in English and auditing it later would be the
Philosophers' January twelve times over. Two things the January run established:
the source line must lead with the maker's name, because `dayEntry()` returns
element 2 as the byline and there is no author field; and the pool leans American
unless the curators are explicitly told to recruit outside the Paris Review and the
Academy of Achievement, which the script now requires. A third rule came out of
March: the Enterprise tag sat empty for three months because no curator lane
covered it, so there is a fourth lane for it now and the editor must say out loud
when a tag comes up empty. A fourth came out of running April, May and June at
once: concurrent months cannot see each other's picks, so check for a repeated
maker before writing a batch in, and resolve it from the month's own held-back
pool rather than re-researching. Sixteen verified survivors
are held for later months rather than thrown away.

The Canons remains unstarted and is now a *third* track; same twelve monthly themes
so the tracks are interchangeable day for day; cite to the Phase 5 standard from the
start.

**Also outstanding:**
- Enable GitHub Pages, then verify on the real shared origin that the prefix-filtered
  cache reap leaves SommeliersCodex and BartendersLedger working offline. This is the
  one thing that cannot be tested locally.
- The optional user-supplied API key (Phase 4's third piece) was never built.
- `AUDIT_PARTIAL` in `ui-settings.js` exists for mid-month reporting and is unused.

## Testing

- `node .scripts/check-syntax.js` — parses every JS file without executing it, and
  verifies `sw.js` and `index.html` agree on the file list. Run after every change.
- Offline: load once, stop the server, reload. Only un-saved scripture may report
  needing a connection.
- Dates: Feb 28 / 29 / Mar 1 in both a leap and a common year; the quote, reflection
  and all five canon readings must stay in step.
- Deploy ritual: bump `?v=N` in `index.html` **and** `CACHE` in `sw.js`. Both.
