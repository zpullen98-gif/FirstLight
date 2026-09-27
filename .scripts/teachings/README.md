# The Teachings

Each day of every plan in The Readings gets a key verse, copied verbatim from that day's passage, and one sentence. The sentence gives the passage's plain sense, then a named classical commentator's reading and its place in the commentary. The approved plan is `~/.claude/plans/i-want-to-improve-curious-pebble.md`, section G. This folder is the pipeline that writes the teachings and proves them.

A set reaches the reader only when it is **complete** and passes both gates. Until then it lives in `.scripts/plans/teachings/<plan>.json`. The build writes a git-ignored preview, which you can read at `/?nosw&preview=teachings#/hall/<plan>`.

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
| `fetch-commentary.js` | Fetches the commentaries once into `.scripts/.cache/teachings/`, then writes one packet per chapter. |
| `prep-batch.js`, `run-args.js`, `teach.workflow.js` | Prepare and run one batch. |
| `recheck-evidence.js` | Finds every survivor's evidence again, by machine. A packet is OCR and is matched as it stands; only a fetched HTML page loses its tags. `--selftest` holds that, on fixtures and on Madhva at Gita 18.66. |
| `land-batch.js` | The only way a batch reaches the set. It refuses rewording, unfound evidence, an unruled critic, and a set that fails the gate. |
| `sample.js` | Entries with their full trails, for the owner's reading. |
| `ledger.json` | What has landed, per plan. |
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

## The owner's checkpoints (the plan)

- **Tao batch 1 is the pilot.** The owner reads all 27 entries (`sample.js tao 1 --all`) and five evidence trails from end to end. The brief is amended before any other batch runs. If more than 40% of primaries die, pause.
- **After that, sample 10 per work.** For the Qur'an, the owner also reads every sensitive day. For the Tanakh, sample again at batch 5. For the Bible, the owner reads `pairs.js` before the Old Testament lands (not yet written; write it before the Bible's first batch), with a checkpoint at the boundary between the Old and New Testaments.

## Sources in hand

- **Tao Te Ching:**
  - Wang Bi and the Heshang Gong commentary come from zh.wikisource, pinned revisions 2354026, 2019760 and 1552800.
  - Legge's notes (SBE 39, 1891) come from archive.org `sacredbooksofchi01oxfo`, cut against Gutenberg #216.
  - ctext.org needs a paid key for its API, and its pages refuse scripts, so it is not used.
- **Other plans:** each is added to `fetch-commentary.js` when its batches come.
- **Zhuangzi:** needs `zhuangzi-notes.json` (Giles' notes by block) before its first batch. `corpus.js` refuses to cite it without the file.
