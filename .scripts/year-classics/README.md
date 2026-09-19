# The Classics, month by month

The third 366 is built one month at a time, and nothing lands unverified. The
rules live in `prep-month.js` (they are written into every `brief.json`) and in
`../check-year.js` (the gate). This file is only the procedure.

## One month

1. `node .scripts/year-classics/prep-month.js <m>` writes `work/MM/brief.json`
   and `work/MM/todo.json` from what is on disk. Run it again after a dead run:
   the todo then holds only the missing work.
2. Run the Workflow. The tool refuses a `scriptPath` outside the session's
   working directory, so copy `month.workflow.js` into that directory and pass
   the copy's path. The copy runs as it is, so the repo file stays the script of
   record; if the script must change, change it here and copy again. Args:
   `{ month, MM, root: 'C:/Users/zpull/FirstLight', todo }` where `todo` is
   `todo.json` plus `days` (the month's length; 29 for February).
   After any change to the script, copy it again: the run copy must be
   byte-identical (`cmp`) to the repo file.
   Four curator lanes of sixteen, then verifier, refuter, re-verifier, editor,
   critic: about forty agents and an hour. Agents write to `work/MM/` before
   they return, so a rate-limited run resumes from disk through step 1.
3. Read `work/MM/month.json`, `critic.json` and `SOURCES-MM.md`. Rule on every
   problem the critic filed. A ruling that needs a page is checked against the
   page: archive.org's full text search
   (`https://be-api.us.archive.org/fts/v1/search?q=...`) reads lent books that
   cannot be opened, and returns the page. Apply rulings to `month.json` with a
   scratch script, then append `### The critic's read, and N rulings` to
   `SOURCES-MM.md`. No dash in it anywhere.
4. `node .scripts/year-classics/land-month.js <m>` builds a candidate, runs the
   gate, and only then writes; it recounts `ledger.json`, routes the unused
   survivors to `carry.json`, and appends the month's sources to `SOURCES.md`.
5. `node .scripts/check-syntax.js`, bump `js/data-year-classics.js?v=` in
   `index.html` and `CACHE` in `sw.js`, read the month in the app at
   `#/year?preview=classics`, commit by explicit path, push.

## Checkpoints

At months 3, 6, 9 and 12 the suite's wing is synced from
`OutsideOfTime/.scripts/resync-light.mjs` (`--check`, then `--apply`), and
`light/index.html` and `light/sw.js` are merged by hand. The wing's stamps are
bumped from the WING's numbers, not the source's.

Expect `tracks.js` and `ui-year.js` to reject whenever the source touches them:
the wing swept their em dashes, so the patch's context lines do not match. The
wing's only divergence in those two files IS the sweeps (six in `tracks.js`,
all to a comma; three in `ui-year.js`: a colon in the header comment, a colon
after voices, a comma in the month intro), so rebuild each from the source plus
the sweeps, diff it against the source to prove nothing else differs, delete the
`.rej`, and run `resync-light.mjs --finish`. Month 3 was done this way.

The browser pane cannot register a service worker against the local suite
server (every wing fails alike), so the worker is proved two ways instead:
every ASSETS path exists on disk before publishing, and the handover is read on
the live site after.

## What the work folder is

`work/MM/` is committed. It is the evidence trail: every proposal, verdict,
refutation and re-verification, the editor's month and the critic's read.
