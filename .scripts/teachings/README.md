# The Teachings

Each day of every plan in The Readings gets a key verse, copied verbatim from that day's passage, and one sentence. The sentence gives the passage's plain sense, then a named classical commentator's reading and its place in the commentary. The approved plan is `~/.claude/plans/i-want-to-improve-curious-pebble.md`, section G. This folder is the pipeline that writes the teachings and proves them.

A set reaches the reader only when it is **complete** and passes both gates. Until then it lives in `.scripts/plans/teachings/<plan>.json`. The build writes a git-ignored preview, which you can read at `/?nosw&preview=teachings#/hall/<plan>`.

## Where it stands (paused 2026-09-27)

The owner paused First Light here to work on the World Table. Nothing is running and nothing is half done.

- **Live for the reader:** the Tao Te Ching 81, the Dhammapada 26, the Gita 18, the Upanishads 12, the Analects 21, the Zhuangzi 44 and the Rig Veda 126.
- **Complete but held (`.scripts/plans/teachings/_hold.json`):** the Qur’an, 66 days. The owner reads every hard day and ten more first: `node .scripts/teachings/review.js quran all <out.html> --days 3,4,7,9,10,12,13,20,21,22,36,37,38,46,48,53,56,57,59,61 --trails all`. The hard days were read again by two reviewers before the owner (work/quran-01/hardcheck.json); three were revised for al-Tabari’s own limits. Take the line out of `_hold.json` to release it, rebuild, sync the wing.
- **In progress:** the Tanakh, 30 of 267 (tanakh-01 landed; tanakh-02 to -05 are prepared, `prep-batch.js tanakh <n>` again before running, since todo.json may be stale). The plan’s Tanakh checkpoint is a sample after batch 5.
- **Not begun:** the Bible, 330 days (packets cached; write `pairs.js`, the Tanakh and Bible readings of the same chapters side by side, for the owner before any Old Testament batch lands; checkpoint again at the boundary of the Testaments; Matthew Henry at most one day in ten).
- **The seven courses:** tooled and dry-run (work/course-jewish-dry, three days, every stage passed). None run yet. `course-muslim` is held with the Qur’an and its Jihād day goes to the sensitive lane. Run one batch per course: `prep-batch.js course-<tr> 1`.
- **For the owner, when back:** the Qur’an reading above; the baked Griffith text of Rig Veda 5.28.1 prints "the Godswith homage" (a missing space; an erratum in the fetch script, and it moves no division); the licences to settle before any paid boundary (VRI Pali non-commercial, OpenITI asbāb CC BY-NC-SA, CCEL non-profit, some Sefaria English CC-BY-NC, used as evidence only, never shipped); the source line (src) is never shown to the reader, so a critic’s call for one wording across a batch is ruled in rulings.json, not revised.
- **Resuming a batch:** `prep-batch.js <plan> <n>` then `run-args.js <plan> <n>` (a lane whose proposer died part-way resumes in a remainder lane); copy `teach.workflow.js` to `C:\Users\zpull\.claude\workflows-run\` first and `cmp` it; a critic’s last problems go through `run-args.js <plan> <n> --revise-critic` (it maps "days 2, 7" and "d65 to d70" to their survivors); rename critic-1.json and critic.json to critic-runN-*.json before a new round so the record keeps every reading.

## The files

| File | What it is |
|---|---|
| `roster.json` | The closed roster: who may be named for each plan, the coverage, sources, traps and conduits. It is the only place the roster is widened. `.scripts/plans/config.js` derives `TEACH_ROSTER` from it. |
| `traps.md` | Ways a plausible teaching goes wrong, per plan. Add each new one here. |
| `sensitive.json` | Passages that go to the sensitive lane (two days per agent, text read from disk). |
| `batches.json` | Batch and lane sizes per plan. |
| `corpus.js` | Each day's text, cut into citable units. Its `locate()` is the one authority on "verbatim". |
| `lib.js` | Batch bookkeeping. `status()` says what is alive on disk. |
| `day.js`, `verse.js`, `packet.js`, `entry-check.js`, `status.js` | The agents' tools. |
| `find.js` | A course's search: every verse of the tradition's works holding all the words of a query, with its work, day and reference. |
| `fetch-commentary.js` | Fetches the commentaries once into `.scripts/.cache/teachings/`, then writes one packet per chapter. |
| `prep-batch.js`, `run-args.js`, `teach.workflow.js` | Prepare and run one batch. |
| `recheck-evidence.js` | Finds every survivor's evidence again, by machine. A packet is OCR and is matched as it stands; only a fetched HTML page loses its tags. `--selftest` holds that, on fixtures and on Madhva at Gita 18.66. |
| `land-batch.js` | The only way a batch reaches the set. It refuses rewording, unfound evidence, an unruled critic, and a set that fails the gate. |
| `sample.js` | Entries with their full trails, for the owner's reading. |
| `ledger.json` | What has landed, per plan. |
| `.scripts/plans/teachings/_hold.json` | Complete sets held for the owner's reading: `{ "<plan>": "<why>" }`. A held set stays in preview, never listed for the reader, until its line is taken out. |
| `work/<plan>-<NN>/` | The evidence trail of each batch, committed. Its `scratch/` folder is git-ignored. |

The gate is `.scripts/check-teachings.js`, with `--selftest` and `--candidate <batch.json>`. It holds the authoring sets to the whole brief. `.scripts/check-plans.js` holds the shipped file to its contract.

## One batch, step by step

1. **Fetch the commentary, once per plan:** `node .scripts/teachings/fetch-commentary.js <plan>`.
2. **Prepare the batch:** `node .scripts/teachings/prep-batch.js <plan> <n>`. This writes `brief.json` and `todo.json`.
3. **Run it:**
   - Copy `teach.workflow.js` to `C:\Users\zpull\.claude\workflows-run\` and `cmp` the two copies.
   - Run the Workflow tool with `scriptPath` set to that copy, and `args` set to the output of `node .scripts/teachings/run-args.js <plan> <n>`.
   - If a run dies, run `prep-batch.js` again (which refreshes `todo.json`), then run again with the new args. Work already on disk is not redone.
4. **Check the evidence by machine:** `node .scripts/teachings/recheck-evidence.js <plan> <n>`.
5. **Rule on anything left.** Write `work/<plan>-<NN>/rulings.json`:
   - `{ "<id>": { "ruling": "accept", "reason": "..." } }` for evidence that was NOT FOUND but is sound (OCR noise, say);
   - `{ "critic": "..." }` once the critic's problems are dealt with.
   - Anything else is fixed by rerunning the batch, never by hand.
6. **Land it:** `node .scripts/teachings/land-batch.js <plan> <n>`.
7. **Build and check:** run `node .scripts/plans/build-plans.js`, then the three gates, then preview it. Commit by explicit path.
8. **When a plan's set is complete**, the build lists it in `FL_PLANS.teach`. Then sync the wing and publish.

## The tradition courses

The seven courses (`course-hindu`, `course-jewish`, `course-buddhist`, `course-confucian`, `course-taoist`, `course-christian`, `course-muslim`) run through the same pipeline as the works, one batch each (`prep-batch.js course-jewish 1`). The tools treat a course as a plan:

- **Its days** are the tradition's chamber entries in the Library (`FL_TRADITIONS`: concepts, then practices, then festivals), 17 or 18 of them. A day's label is the entry's title. Its division is a hash of the entries, so a set written against a chamber that has since changed is refused.
- **Its key line** may come from any of the tradition's works in the app, as `roster.json`'s `courses` map lists them (the Hindu course: the Rig Veda, the Upanishads, the Gita). `find.js` searches them; `verse.js course-<tr> <day> "<line>"` places the line and prints the work, the work's day and the packet command for its commentary.
- **Its rules** are the works' rules, applied where the line stands: `check-teachings.js` holds each course entry to the roster, coverage, forbidden words and form of the line's own work, on the work's day that holds it. Rules 2 and 8 of the brief have course forms (the context clause gives the line's place in its work and never claims the line is about the entry unless the text names it; the line is chosen for how directly it bears on the entry).
- **Landing** records `work` and `pd` (the work and its day) on each entry. The build writes `js/texts/courses/<tr>.js` in the shape `check-plans.js` holds (`{ d, sec, i, line, ref, loc: { plan, at }, s, by }`) and lists it in `FL_PLANS.courses` once complete; until then `js/texts/courses/_preview/<tr>.js`, read on `/?nosw&preview=teachings#/hall/course-<tr>`.

## The owner's checkpoints (the plan)

- **Tao batch 1 is the pilot.** The owner reads all 27 entries (`sample.js tao 1 --all`) and five evidence trails from end to end. The brief is amended before any other batch runs. If more than 40% of primaries die, pause.
- **After that, sample 10 per work.** For the Qur'an, the owner also reads every sensitive day (`review.js quran all <out.html> --days <the hard days and ten more> --trails all`); the set is held in `_hold.json` until then. For the Tanakh, sample again at batch 5. For the Bible, the owner reads `pairs.js` before the Old Testament lands (not yet written; write it before the Bible's first batch), with a checkpoint at the boundary between the Old and New Testaments.

## Sources in hand

- **Tao Te Ching:**
  - Wang Bi and the Heshang Gong commentary come from zh.wikisource, pinned revisions 2354026, 2019760 and 1552800.
  - Legge's notes (SBE 39, 1891) come from archive.org `sacredbooksofchi01oxfo`, cut against Gutenberg #216.
  - ctext.org needs a paid key for its API, and its pages refuse scripts, so it is not used.
- **Other plans:** each is added to `fetch-commentary.js` when its batches come.
- **Zhuangzi:** needs `zhuangzi-notes.json` (Giles' notes by block) before its first batch. `corpus.js` refuses to cite it without the file.
