# First Light — handoff

Paste-ready context for a fresh session.

## What it is

An offline-first PWA for a daily contemplative practice. Seven sections: **Today**
(the day's voice, a weekday practice, a rotating reflection, the five canon
readings), **The Year** (all 366, keepable), **A Life Well Lived** (a five-tier goal
ladder), **The Study Hall** (five scripture year-plans with full-text reading),
**The Body** (yoga teaching and a practice library), **Astrology** (a long reference
chapter), **The Vault** (kept words), plus **Settings**.

Lives at `C:\Users\zpull\FirstLight`. Runs with `py serve.py 8633`.

## Origin

Two predecessors sit in `~/Downloads` and are archives, not sources:

- `first-light.jsx` (108 KB, the React original) — generated each morning live via
  three `POST`s to `api.anthropic.com`. It had an **intent picker**, an **evening
  examen**, a correct **`computeStreak`**, and **practice-completion marking**.
- `first_light_year_4.html` (139 KB, the direct predecessor) — the artifact this was
  rebuilt from. Cutting the API dependency is what flattened it: the four features
  above were dropped, and `computeStreak` was replaced with `days.length`.

`first_light_year{,_1,_2}.html` are identical 83 KB duplicates; `_3` is a near-twin
of `_4`. Only `_4` and the `.jsx` matter.

## Why it needed rebuilding

The artifact could not function as an app outside claude.ai:

- **Nothing persisted.** State went through `window.storage.get/set`, which does not
  exist in a browser. The `catch` parked values in an object that died on refresh.
  Every kept quote and checked goal was lost on reload, silently.
- **Nothing worked offline** — no manifest, no service worker, Google Fonts by
  `@import`, all scripture fetched live.
- **No routing.** Seven sections toggled by a `.hide` class: no deep link, no back
  button, no way for an installed icon to land anywhere but Today.
- **Two disagreeing day-of-year computations**, desynchronising the reflection from
  the canon readings for ten months of every common year.
- **The Rig Veda reader was 100% dead.** It requested
  `The Rig Veda/Mandala N/Hymn N`, which returns `missingtitle`. Every Veda day
  failed, hidden behind a generic "could not be reached" message.
- **The Dhammapada parser lost 18 verses.** Müller sets nine verse *pairs* as one
  paragraph ("58, 59. As on a heap of rubbish…") and the regex required a digit
  followed directly by a period. 405 of 423.

## Decisions worth not reversing

- **No build step.** Classic script tags, one global scope, fixed load order. Matches
  the sibling PWAs; the repo is the deployable artifact.
- **`localStorage` for the record, additive schema only.** Never rename a field.
- **IndexedDB for scripture, never Cache Storage.** Cache Storage is per-origin and
  a sibling PWA's naive reap could reach it; `{ignoreSearch:true}` also collides with
  the `?translation=` / `?version=` query strings that identify those URLs.
- **`sw.js` reaps only `firstlight-` keys.** Anything broader wipes the sibling
  apps' offline shells on the shared GitHub Pages origin.
- **One `doyOf()`, fixed 366-slot table.** The almanac is dated — a given date draws
  the same voice every year. Slot 60 is unreachable outside a leap year on purpose.
- **The palette runs on solar altitude, not sunrise/sunset events.** Continuous,
  defined at every latitude, no polar null-guards.
- **Astrology keeps its sceptical framing note.** It is the right register and it is
  honest; do not quietly drop it when the real ephemeris lands.

## Current state — Phase 1 complete and verified

Working and confirmed in the browser:

- Persistence survives reload; kept voices, checked goals, and the morning record
  all land in `localStorage`. Migration from the artifact's `fl2:*` keys included.
- Real streaks (consecutive-day walk, recovered from the `.jsx`), longest streak,
  total mornings.
- Hash routing with deep links, back button, focus management, live region.
- Installable PWA; **33 assets precached; every view works with the server stopped**.
- Four-palette time-of-day theming on real solar altitude. Validated against
  published sunrise/sunset for London, New York, Sydney, and Tromsø, and correct
  through polar day and polar night.
- All five canon readers work. **Rig Veda fixed** (correct Wikisource title) and
  **Dhammapada now parses 423/423** with all 18 paired verses recovered.
- JSON export/import, merge-not-replace, keeps the longer text on collision.
- All 366 entries verified present; Bible 1,189 chapters, Tanakh 929, Qur'an 6,236
  ayahs, Dhammapada 423, Rig Veda 1,028 hymns — every plan covers its canon exactly.

## What is left, in priority order

**Phase 2 — The Library.** ✅ *Done, except the Rig Veda crawl.*
The agreed "fetch once + whole-year prefetch" was abandoned for good reason and the
text is **baked into the repo** instead: bible-api.com caps 15 requests / 30 seconds
and asks users not to download entire bibles; Sefaria directs bulk users to its
exports; Wikimedia rate-limits with well-formed *empty* JSON that parses as "no
data". That plan meant ~82 MB of traffic to store ~12.5 MB, and asked two operators
to do exactly what they ask people not to.

`.scripts/fetch-texts.js` is an **authoring tool, not a build step** — run by hand,
output committed. `.scripts/build-library.js` then generates `js/data-library.js`,
a 40 KB index precached with the shell so the Library renders its whole structure
offline before a byte of scripture loads. Text lives in `js/texts/<work>/<part>.js`,
loads by script injection on demand, and is cached permanently by the service worker
in `firstlight-texts-v*` — deliberately not versioned with the shell, so a deploy
never re-downloads 9 MB.

The section grew from five reading plans into **seven traditions and ten works**,
with an authored chamber per tradition (`js/data-traditions.js`) and eight
cross-tradition threads (`js/data-threads.js`).

**Baked and verified:** Bible (WEB, 66 books / 1,189 ch / 31,095 v), Tanakh (JPS
1917, 39 / 929 / 23,206), Qur'an (Pickthall, 114 surahs / 6,236 ayahs), Dhammapada
(Müller, 26 ch / 423 v), Bhagavad Gita (Arnold, 18 ch), Tao Te Ching (Legge, 81 ch),
Analects (Legge, 20 books / 498 ch), Zhuangzi (Giles, 33 ch). **9.2 MB total.**

**The Rig Veda is done.** 1,028 hymns, 10,497 verses, crawled from Wikisource at 5s
each over about three hours and committed. One genuine gap: Griffith exiled RV 1.179
— the Agastya and Lopāmudrā dialogue — to an appendix with lines in Latin on
grounds of Victorian decency, so the page carries an editor's note and no translation.
The app prints the note rather than claiming the hymn is unavailable. The parser
handles three different verse markups across the ten books and was validated against
published verse counts for hymns spread over every mandala.

**Sources worth not re-deriving:** getbible.net returns the whole WEB in one request;
Sefaria returns a whole book per request (39 for the Tanakh); alquran.cloud returns
the entire Pickthall in one. Gutenberg ids: Dhammapada 2017, Gita 2388, Tao 216,
Analects 3330, Zhuangzi 59709. **Verify every Gutenberg id against its title** — 65566
looked right for the Rig Veda in a size probe and is *Porgy* by DuBose Heyward.

**The migration.** ✅ *Done.* The reading plans read from the local library through
`js/reading.js`; `canon.js` and its four live fetchers are deleted. The Study Hall
became `#/hall`, hidden from the nav and reached from the Library, so the religious
section has one front door. Each canon shows honest per-book state, a filled dot per
day for "text is on this device", and a Save-the-whole-year button — the Bible's 66
books land in **14 seconds**, against the ~40 minutes the live-fetch design needed.

**Phase 3.** ✅ *Done.* `journal.js` (entries keyed to a day, a kept voice, a passage,
or the examen; autosave; in the export), `search.js` (both 366 tracks, goals,
chambers, threads, body, astrology, journal, plus any scripture in memory — the UI
names which works are searchable rather than pretending to search unopened books),
the guided five-step morning, the evening examen keyed off `sunIsEvening()`, the
intent detour, and the 366-cell year heatmap at `#/stats`.

**Phase 4.** ✅ *Done.* `js/vendor/astronomy.js` (astronomy-engine 2.1.19, MIT,
116 KB) + `astro-chart.js` + `astro-wheel.js` + `ui-chart.js` at `#/chart`, and the
breath pacer / interval timers / written sequences in `practice.js`.

Validated against four published reference charts — NYC 1990, London 2000, Sydney
1985, Tromsø 1980 — all matching to the arcminute, plus an independent geometric
check that the computed Ascendant sits at altitude 0 in the eastern half. Placidus
cusps are monotonic and sum to 360°; above the Arctic Circle it falls back to Whole
Sign with a note rather than throwing or lying.

**Traps that cost real time, do not re-learn them:**
`Astronomy.EclipticLongitude()` is **heliocentric** and throws on the Sun — it puts
Mars in Gemini where the chart needs Cancer. Use
`Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon`. Obliquity must come
from the polynomial in `astro-chart.js`, never from `Rotation_ECT_EQD`, which returns
a negative value that leaves the MC right and the ASC silently wrong. Do **not** bundle
IANA tzdata: `js/data-cities.js` carries each city's zone NAME and the browser's
`Intl` supplies the historical offset — verified on the 1974 US year-round-DST year,
Indianapolis pre/post-2006, and 1970 British Standard Time.

**Phase 5** — audit all 366 citations. *Not started.*

**Phase 6** — author the second 366, "The Canons". The existing year is **94%
Stoic/Taoist/Confucian/Roman** with zero Buddhist, Hindu, Jewish, Christian, Islamic,
Sikh, Sufi, Zen, or Indigenous voices, in an app whose Study Hall teaches five
scriptures and whose Body chapter is built on Patañjali. The `.jsx` drew on 17
traditions. Track switching is already wired: `FL.prefs.track` and the
`<track>:<m>-<d>` key prefix in `FL.kept`. *Not started.*

**Ship it** — `git init -b main`, push to a new public `FirstLight` repo, Pages from
`main` / root. Everything else is done and verified; nothing is blocking this.

## Testing notes

- `node .scripts/check-syntax.js` — parses every JS file and verifies `sw.js` and
  `index.html` agree on the file list.
- Offline test: load once, stop the server, reload. Only un-cached scripture may
  report needing a connection.
- Date test: override the clock across Feb 28 / 29 / Mar 1 in both a leap and a
  common year; the quote, reflection, and all five canon readings must stay in step.
- **Not yet verified:** that the prefix-filtered cache reap protects the sibling PWAs
  on the real shared origin. Confirm after the first GitHub Pages deploy by loading
  the Ledger and the Codex offline.
