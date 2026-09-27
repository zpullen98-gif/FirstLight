export const meta = {
  name: 'teachings-batch',
  description: 'Write one batch of The Teachings: lanes propose a primary and a standby for each day, a verifier rules on every primary against the commentator\u2019s own words, a refuter attacks every survivor, a fresh verifier rules on every refutation, standbys run only where a primary died, an editor copies survivors without rewording, and a critic reads the result',
  phases: [
    { title: 'Propose', detail: 'one agent per lane of days; a primary and a standby per day, written to disk before returning' },
    { title: 'Verify', detail: 'three candidates per agent, against the source opened, effort high' },
    { title: 'Refute', detail: 'every survivor attacked; default refuted' },
    { title: 'Re-verify', detail: 'a fresh verifier on every refutation; two failures are death' },
    { title: 'Standby', detail: 'only for days whose primary died' },
    { title: 'Edit', detail: 'survivors copied exactly; holes reported, never padded' },
    { title: 'Critic', detail: 'the rules read back against the batch' },
    { title: 'Revise', detail: 'a fresh agent answers each problem the critic names with a CORRECTED verdict and its evidence; a refuter attacks it; only a cleared revision replaces the entry' },
  ],
}

const A = args || {}
const ROOT = String(A.root || 'C:/Users/zpull/FirstLight').replace(/\\/g, '/')
const PLAN = A.plan
const NAME = A.name
const DIR = String(A.dir).replace(/\\/g, '/')
const BRIEF = `${DIR}/brief.json`
const LANES = A.lanes || []
const DAYS = A.days || []
const todo = A.todo || {}
const STATUS = `node ${ROOT}/.scripts/teachings/status.js ${PLAN} ${A.n}${A.dryName ? ' --name ' + A.dryName : ''}`
const T = (s) => `node ${ROOT}/.scripts/teachings/${s}`

const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out }
const PASS = ['VERIFIED', 'CORRECTED', 'HEDGE']
const passes = (v) => !!(v && PASS.includes(v.verdict) && (v.verdict !== 'HEDGE' || v.hedge))
const idFor = (d, role) => { const x = DAYS.find(y => y.d === d); return x ? x.id[role === 'p' ? 'primary' : 'standby'] : '' }

const CAND = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    key: { type: 'string', description: 'the key verse, copied from day.js, curly quotes; verse.js must print ok: true' },
    ref: { type: 'string', description: 'copied from verse.js' },
    at: { type: 'array', items: { type: 'number' }, description: 'copied from verse.js' },
    s: { type: 'string', description: 'the one sentence' },
    by: { type: 'string', description: 'the roster id of the commentator named after the semicolon' },
    by2: { type: 'string', description: 'the roster id of a second commentator, or empty' },
    hedge: { type: 'string', description: 'a conduit id when the reading is found only through it, else empty' },
    src: { type: 'string', description: 'the source line' },
    basis: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'the packet source id (wang-bi, heshang-gong, legge-sbe39) or the url opened' },
        words: { type: 'string', description: 'the commentator\u2019s own words that carry the reading, verbatim' },
        gloss: { type: 'string', description: 'your English for those words' },
      },
      required: ['source', 'words', 'gloss'],
    },
  },
  required: ['id', 'key', 'ref', 'at', 's', 'by', 'by2', 'hedge', 'src', 'basis'],
}
const PROPOSALS = {
  type: 'object',
  properties: {
    wrote: { type: 'string' },
    days: { type: 'array', items: { type: 'object', properties: { d: { type: 'number' }, primary: CAND, standby: CAND }, required: ['d', 'primary', 'standby'] } },
  },
  required: ['wrote', 'days'],
}
const VERDICT = {
  type: 'object',
  properties: {
    id: { type: 'string' }, d: { type: 'number' }, role: { type: 'string', enum: ['primary', 'standby'] },
    verdict: { type: 'string', enum: ['VERIFIED', 'CORRECTED', 'HEDGE', 'REJECT'] },
    key: { type: 'string' }, ref: { type: 'string' }, at: { type: 'array', items: { type: 'number' } },
    s: { type: 'string' }, by: { type: 'string' }, by2: { type: 'string' }, hedge: { type: 'string' }, src: { type: 'string' },
    verseCheck: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
    entryCheck: { type: 'object', properties: { ok: { type: 'boolean' }, errors: { type: 'array', items: { type: 'string' } } }, required: ['ok'] },
    plainSense: { type: 'string', enum: ['faithful', 'overreach', 'misread'] },
    evidence: {
      type: 'object',
      properties: {
        opened: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' }, edition: { type: 'string' }, locator: { type: 'string' }, via: { type: 'string', enum: ['packet', 'webfetch'] } }, required: ['url', 'edition', 'locator', 'via'] } },
        words: { type: 'string', description: 'the commentator\u2019s own words, verbatim from what you opened' },
        lang: { type: 'string' }, gloss: { type: 'string' }, licence: { type: 'string' },
        supports: { type: 'boolean', description: 'do these words carry the reading the sentence attributes, without drift' },
      },
      required: ['opened', 'words', 'lang', 'gloss', 'licence', 'supports'],
    },
    sensitivity: { type: 'string', enum: ['none', 'violence', 'law', 'sexual', 'exclusion'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reason: { type: 'string' },
  },
  required: ['id', 'd', 'role', 'verdict', 'key', 'ref', 'at', 's', 'by', 'by2', 'hedge', 'src', 'verseCheck', 'entryCheck', 'plainSense', 'evidence', 'sensitivity', 'confidence', 'reason'],
}
const VERDICTS = { type: 'object', properties: { wrote: { type: 'array', items: { type: 'string' } }, verdicts: { type: 'array', items: VERDICT } }, required: ['wrote', 'verdicts'] }
const REFUTATIONS = {
  type: 'object',
  properties: {
    wrote: { type: 'array', items: { type: 'string' } },
    refutations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' }, refuted: { type: 'boolean' },
          reopened: { type: 'object', properties: { url: { type: 'string' }, found: { type: 'boolean' } }, required: ['url', 'found'] },
          attacks: { type: 'array', items: { type: 'string', enum: ['verse', 'plain', 'attribution', 'locator', 'drift', 'school', 'comparison', 'tone', 'form'] } },
          reason: { type: 'string' }, better: { type: 'string', description: 'a better reading or place you found, else empty' },
        },
        required: ['id', 'refuted', 'reopened', 'attacks', 'reason', 'better'],
      },
    },
  },
  required: ['wrote', 'refutations'],
}
const EDIT = {
  type: 'object',
  properties: {
    wrote: { type: 'array', items: { type: 'string' } },
    selected: { type: 'number' }, days: { type: 'number' },
    holes: { type: 'array', items: { type: 'number' } },
    spread: { type: 'string', description: 'one line: how many days name each commentator; how many hedged' },
    gate: { type: 'string', description: 'the last line check-teachings.js --candidate printed' },
    notes: { type: 'string' },
  },
  required: ['wrote', 'selected', 'days', 'holes', 'spread', 'gate', 'notes'],
}
const CRITIC = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    problems: { type: 'array', items: { type: 'object', properties: {
      d: { type: 'number' }, id: { type: 'string', description: 'the entry id in batch.json, or empty for a problem with the batch as a whole' },
      problem: { type: 'string' }, fix: { type: 'string', description: 'what would put it right, within the rules and the evidence' } }, required: ['d', 'id', 'problem', 'fix'] } },
  },
  required: ['ok', 'problems'],
}

const COMMON = `You are working on First Light, an offline daily-practice app at ${ROOT}. Its Readings divide ten holy works into daily passages; The Teachings give each day a KEY VERSE copied verbatim from that day's passage and ONE SENTENCE: the passage's plain sense, then a named classical commentator's reading, with the place in his commentary. This run is batch ${NAME} of the ${PLAN} plan${A.dryName ? ' (a DRY RUN: it will never land, but hold it to every rule)' : ''}.

READ FIRST, with the Read tool: ${BRIEF}. It holds the ten rules, the closed roster for this plan (who may be named, their coverage, sources and traps), the conduits, the forbidden and watch terms, the traps, how this tradition speaks of its text, the days and their ids, and the paths. Everything there binds you.

The tools (run them with Bash; they read the app's own texts, so they are the only authority on wording):
  ${T(`day.js ${PLAN} <day>`)}        the day's passage, unit by unit; only [ref] units may give a key verse
  ${T(`packet.js ${PLAN} <day>`)}     the commentaries for the day, each line of text beside the commentary on it, with the url to cite
  ${T(`verse.js ${PLAN} <day> "<key verse>"`)}   must print "ok": true; copy its ref and at
  ${T(`entry-check.js ${PLAN} <file.json>`)}     the gate on one entry: write the entry to a scratch file in ${DIR}/scratch/ with the Write tool, then run it; "ok": true or the entry does not stand

The standard, in one sentence: a confident false attribution is worse than naming a different commentator, and a reading not found in the commentator's own words, in a source you actually opened, does not ship. Write your output files BEFORE you return, so a run that dies loses nothing. Your final text is a return value, not a message to a person: return the JSON the schema asks for and nothing else.`

const PROPOSE = (lane) => `${COMMON}

YOUR LANE: ${lane.key}, days ${lane.days.join(', ')}.${lane.sensitive ? ' These days hold hard passages (rule 6): read them from disk with day.js, never paste the passage into your output beyond the key verse, and state the hard matter in one plain clause.' : ''}

For EACH of your days, in order:
1. Run day.js and packet.js for the day and read both whole.
2. Choose a PRIMARY and a STANDBY candidate. They must differ in commentator, or in key verse, or both, so that one can stand if the other falls. Choose for each the commentator whose comment on this chapter is substantial and clearly tied to a line you can use as the key verse; follow the brief's voice on the mix across the batch.
3. For each candidate: pick the key verse from day.js (a [ref] unit only, one to three whole sentences, no dash) and run verse.js until it prints "ok": true; copy ref and at from it. Write the sentence by the rules (form, plain sense, reading, style). Set by (and by2 only where two genuinely differ; then 75 words), hedge only if the reading reaches you only through a conduit (then src is in the "as given in" form), and src. Put in basis the commentator's own words from the packet that carry the reading, verbatim, and your gloss.
4. Write the candidate to a scratch file and run entry-check.js; fix it until "ok": true. Do not propose a candidate that fails.
The ids are fixed: for day d the primary is brief.days[].id.primary and the standby brief.days[].id.standby.

WRITE ${DIR}/proposals-${lane.key}.json as {"lane":"${lane.key}","plan":"${PLAN}","batch":"${NAME}","days":[{"d":<day>,"primary":{...},"standby":{...}}, ...]} with exactly the schema's fields, BEFORE you return. Then return the same through the schema, with "wrote" set to that path.`

const VERIFY = (ids, again) => `${COMMON}

YOUR JOB: rule on each of these candidates independently: ${ids.join(', ')}.
Find each in ${DIR}/proposals-*.json (the id names its day and role). For each:
1. Run day.js and verse.js yourself: the key must be verbatim (ok: true) and ref and at must match.
2. OPEN THE SOURCE YOURSELF: packet.js for a packet source (Wang Bi, the Heshang Gong commentary, Legge's notes), or the url for anything else. Find the commentator's own words at the place the sentence names. Do not trust the proposer's basis: read the commentary on the whole chapter.
3. Judge the plain sense against day.js (faithful, overreach, misread) and the reading against the words you found: do they carry it, without drift, without the proposer's or translator's ideas added?
4. The verdict:
   VERIFIED   the commentator says this, at this place, and the entry obeys every rule;
   CORRECTED  the reading is his but the place, the wording of the sentence, the key verse choice within the day, or the source line needed correcting: you give the corrected entry in full (it must pass entry-check.js), and say in reason what you changed;
   HEDGE      the reading is found only through a conduit on this plan's list (for example Legge's notes reporting Wang Bi): the entry carries hedge: <conduit id> and src in the "as given in" form;
   REJECT     not found in his words at a source you opened, misattributed, beyond what the words say, a key verse that fails, or a sentence that breaks the rules beyond correcting.
5. Evidence: the commentator's own words, VERBATIM from what you opened (for a packet source, copy the characters exactly as packet.js prints them), 12 to 120 characters of Chinese or 12 to 120 words otherwise, never more than 40 words of any copyrighted English; your gloss; opened lists each source with via "packet" and the packet's url, or via "webfetch" and the exact url. The operator re-finds these words by machine; words not found kill the entry.
6. Write the final entry to a scratch file and run entry-check.js; record the result in entryCheck. A VERIFIED, CORRECTED or HEDGE verdict needs entryCheck.ok true.
${again ? `This candidate was REFUTED. Read its refutation in ${DIR}/refutations/<id>.json and the earlier verdict in ${DIR}/verdicts/<id>.json, then rule afresh with both in hand. You are the second judgement: if the refuter is right, REJECT; if the entry can be put right within the rules and the evidence, CORRECTED; otherwise the earlier verdict stands.` : ''}
WRITE each verdict to ${DIR}/${again ? 'reverify' : 'verdicts'}/<id>.json (the schema's object for that id) BEFORE you return. Then return all of them through the schema.`

const REFUTE = (vs) => `${COMMON}

YOUR JOB: REFUTE. A verifier passed these entries; try to break each one. DEFAULT TO refuted=true when you are not sure. The entries as they would ship (read the full verdicts in ${DIR}/verdicts/):
${JSON.stringify(vs.map(v => ({ id: v.id, d: v.d, verdict: v.verdict, key: v.key, ref: v.ref, s: v.s, by: v.by, by2: v.by2, hedge: v.hedge, src: v.src, evidence: v.evidence && { words: v.evidence.words, gloss: v.evidence.gloss, opened: v.evidence.opened } })), null, 1)}

For each, attack on every line and record which attacks land:
  verse        is the key verbatim in the day (run verse.js), from the text and not apparatus, the best-chosen line for the reading?
  plain        does the plain sense say what the day's text says, and no more (run day.js)?
  attribution  is this the named commentator's reading at all, or another's, or the translator's, or the proposer's?
  locator      is the place right?
  drift        do his words, as you find them yourself, carry the whole paraphrase, or does the sentence claim more?
  school       is a school named where the rules need one?
  comparison   any ranking, comparison or other tradition?
  tone         a hard passage softened or sensationalised?
  form         one sentence, one semicolon, the cap, the roster name, the verb, British spelling, no dash (run entry-check.js)
You may clear an entry (refuted=false) ONLY IF you re-opened the source yourself (packet.js or the url), found the commentator's words at the place named, found they carry the paraphrase without drift, and both verse.js and entry-check.js pass. Record the url you re-opened and whether you found the words. If you found a better reading or place, put it in better.
WRITE each refutation to ${DIR}/refutations/<id>.json BEFORE you return. Then return all of them through the schema.`

/* A set of candidate ids through verify, refute and re-verify; returns
   [{ id, alive }] as far as this run could take them. */
async function chain(ids, phaseName) {
  const groups = chunk(ids, 3)
  const res = await parallel(groups.map(g => async () => {
    const vr = await agent(VERIFY(g, false), { label: `verify:${g[0]}${g.length > 1 ? '..' : ''}`, phase: phaseName === 'Standby' ? 'Standby' : 'Verify', schema: VERDICTS, effort: 'high' })
    const vs = (vr && vr.verdicts) || []
    const pass = vs.filter(passes)
    let refs = []
    if (pass.length) {
      const rr = await agent(REFUTE(pass), { label: `refute:${pass[0].id}${pass.length > 1 ? '..' : ''}`, phase: phaseName === 'Standby' ? 'Standby' : 'Refute', schema: REFUTATIONS, effort: 'high' })
      refs = (rr && rr.refutations) || []
    }
    const refuted = refs.filter(r => r.refuted).map(r => r.id)
    let rv = []
    if (refuted.length) {
      const x = await agent(VERIFY(refuted, true), { label: `reverify:${refuted[0]}${refuted.length > 1 ? '..' : ''}`, phase: phaseName === 'Standby' ? 'Standby' : 'Re-verify', schema: VERDICTS, effort: 'high' })
      rv = (x && x.verdicts) || []
    }
    return g.map(id => {
      const v = vs.find(x => x.id === id)
      if (!passes(v)) return { id, alive: false, why: v ? v.verdict : 'no verdict' }
      const r = refs.find(x => x.id === id)
      if (!r) return { id, alive: false, why: 'no refutation returned', pending: true }
      if (!r.refuted) return { id, alive: true }
      const w = rv.find(x => x.id === id)
      return w && passes(w) ? { id, alive: true, after: true } : { id, alive: false, why: 'refuted, then ' + (w ? w.verdict : 'no re-verdict') }
    })
  }))
  return res.filter(Boolean).flat()
}

/* ---- the run ---- */
phase('Propose')
const lanesToRun = LANES.filter(l => !todo.lanesMissing || todo.lanesMissing.includes(l.key))
log(`${NAME}: ${DAYS.length} days in ${LANES.length} lanes; proposing on ${lanesToRun.length}`)

const laneResults = await pipeline(
  lanesToRun,
  (lane) => agent(PROPOSE(lane), { label: `propose:${lane.key}`, phase: 'Propose', schema: PROPOSALS }),
  async (pr, lane) => {
    const got = ((pr && pr.days) || []).map(x => x.d)
    const primaries = lane.days.filter(d => got.includes(d)).map(d => idFor(d, 'p'))
    const first = await chain(primaries, 'Verify')
    const deadDays = first.filter(x => !x.alive && !x.pending).map(x => +x.id.match(/-d(\d{3})-/)[1])
    const second = deadDays.length ? await chain(deadDays.map(d => idFor(d, 's')), 'Standby') : []
    return { lane: lane.key, proposed: got, missing: lane.days.filter(d => !got.includes(d)), first, second }
  }
)

/* resume: work an earlier run left on disk */
const resumeVerify = (todo.needVerdict || []).concat(todo.needStandby || [])
if (resumeVerify.length) { log(`resuming: ${resumeVerify.length} candidate(s) still need a verdict`); await chain(resumeVerify, 'Verify') }
if ((todo.needRefute || []).length) {
  log(`resuming: ${todo.needRefute.length} verdict(s) still need a refuter`)
  await parallel(chunk(todo.needRefute, 3).map(ids => () =>
    agent(`${COMMON}\n\nYOUR JOB: REFUTE the verdicts at ${DIR}/verdicts/ for these ids: ${ids.join(', ')}. Read each verdict file, then attack it exactly as a refuter does (verse, plain, attribution, locator, drift, school, comparison, tone, form), re-opening the source yourself. Default to refuted=true. WRITE ${DIR}/refutations/<id>.json for each BEFORE returning; return them through the schema.`,
      { label: `refute(resume):${ids[0]}..`, phase: 'Refute', schema: REFUTATIONS, effort: 'high' })))
}
if ((todo.needReverify || []).length) {
  log(`resuming: ${todo.needReverify.length} refutation(s) still need a re-verifier`)
  await parallel(chunk(todo.needReverify, 3).map(ids => () =>
    agent(VERIFY(ids, true), { label: `reverify(resume):${ids[0]}..`, phase: 'Re-verify', schema: VERDICTS, effort: 'high' })))
}

if ((todo.needRevRefute || []).length) log(`note: ${todo.needRevRefute.length} revision(s) on disk were never attacked; they stand unused until a run refutes them`)
const flat = laneResults.filter(Boolean)
const firstAlive = flat.flatMap(r => r.first).filter(x => x.alive).length
const firstAll = flat.flatMap(r => r.first).length
const standbyAlive = flat.flatMap(r => r.second).filter(x => x.alive).length
log(`primaries alive ${firstAlive} of ${firstAll}; standbys alive ${standbyAlive} of ${flat.flatMap(r => r.second).length}; lanes missing days: ${flat.flatMap(r => r.missing).join(', ') || 'none'}`)

const EDITOR = (again) => `${COMMON}

YOU ARE THE EDITOR for ${NAME}.${again ? ' THIS IS THE SECOND EDIT, after revisions: read everything again from disk; where a revision was cleared, status.js now gives the revised entry.' : ''} Run this and read its JSON: ${STATUS} --json
It gives, for every day, the survivor (the primary if it lived, else the standby) and the exact entry it would land as.

Write ${DIR}/batch.json:
{"plan":"${PLAN}","batch":"${NAME}","div":"<brief.div>","days":[{"d":..,"label":"<the day's label from brief.days>","id":"<the survivor id>","key":..,"ref":..,"at":..,"s":..,"by":..,"by2"?:..,"hedge"?:..,"src":..}, ... in day order],"holes":[<days with no survivor>]}
COPY EACH SURVIVOR'S ENTRY EXACTLY. The one change allowed is straight quotes to curly. Do not reword, shorten, fix or improve anything: a survivor that needs a change goes through a revision, never through you. NEVER PAD: a day with no survivor is a hole.
Then run: node ${ROOT}/.scripts/check-teachings.js --candidate ${DIR}/batch.json
If it reports an error on an entry, remove that day from days, add it to holes, and say why in notes (say which rule). Run the gate again until it passes.

Also WRITE ${DIR}/SOURCES-${NAME}.md${again ? ' (rewrite it whole, including what the revisions changed and why)' : ''}, one section in the register of the repo's SOURCES.md: "## <the work>, days <first> to <last> (${NAME})", then plain paragraphs: how many candidates were proposed, verified, refuted, survived and used; the spread of commentators and how many hedged; every CORRECTED and HEDGE entry and what was corrected or why it is hedged; every revision and what it changed; the holes and why; any trap found that belongs in traps.md. British spelling, no dash of any kind anywhere in it.
Return the schema.`

const CRITIC_PROMPT = (file, again) => `${COMMON}

YOU ARE THE CRITIC${again ? ', READING AGAIN after revisions (the earlier reading is ' + DIR + '/critic-1.json; the revisions and their refuters are in ' + DIR + '/revise/ and ' + DIR + '/revrefute/)' : ''}. Read ${DIR}/batch.json and the brief, and for anything you doubt the verdict files in ${DIR}/verdicts/ and ${DIR}/reverify/. Check the batch against the rules, entry by entry and as a whole:
- one entry per day, in order, each id a survivor (run ${STATUS})
- every key verbatim (verse.js) and the best line of the day for the reading
- every sentence: the form and the cap, a plain sense that stays inside the passage and does not borrow the commentator's reading, a reading that is the named commentator's (open the packet for any you doubt), the place named, a school named where needed
- rule 6: on a hard passage, the commentator's own limit carried where he sets one on the key verse's lines
- no comparison, ranking or other tradition; hard passages neither softened nor sensationalised; hedges name their conduit
- house style: British spelling, curly quotes, no dash, no you or we, no honorific
- the spread: does one commentator hold the batch where the other had a real comment to offer
- the prose: would a thoughtful reader at six in the morning find each sentence clear, exact and worth reading (no doubled word, no image left without its point)
Report each problem with its day and entry id, what is wrong, and the fix that would put it right within the rules and the commentator's own words. Name only real problems: a preference is not a problem. WRITE ${file} as {"ok":..,"problems":[{"d":..,"id":..,"problem":..,"fix":..}]} BEFORE you return; ok is true only if you found nothing. Return the schema.`

/* Revision rounds (lib.roundKey): revise/<id>.json is the first round of an
   entry, <id>~2.json the second, and each refuter writes under the same name
   in revrefute/. A.rounds gives each entry's next round, read from disk by
   run-args.js; a second round in the same run counts on from it. */
const ROUNDS = Object.assign({}, A.rounds || {})
const roundFile = (id) => { const k = ROUNDS[id] || 1; return k > 1 ? id + '~' + k : id }

const REVISE = (items, why) => `${COMMON}

YOU REVISE. ${why === 'owner' ? 'The owner read these entries at a checkpoint and amended the rules (the brief now carries the amended rules 1 and 2): each entry must be brought to them.' : 'The critic questioned these entries.'} Each is a survivor of verification and refutation, and you are a fresh verifier asked whether it should be CORRECTED. For each, read the entry as it now stands (${STATUS} --json gives it), its trail (${DIR}/verdicts/<id>.json, ${DIR}/refutations/<id>.json, ${DIR}/reverify/<id>.json, and any earlier rounds in ${DIR}/revise/), and the problems to answer:
${JSON.stringify(items.map(x => ({ id: x.id, d: x.d, problems: x.problems, write: `${DIR}/revise/${roundFile(x.id)}.json` })), null, 1)}
Then OPEN THE SOURCE YOURSELF (packet.js for the day) and decide:
  CORRECTED  the problem holds and the entry can be put right within the rules and the commentator's own words: give the whole corrected entry (key, ref, at, s, by, by2, hedge, src), and evidence whose words carry EVERY part of the corrected reading (several passages of his words may be joined with " … "; each must be verbatim from what you opened, because the operator re-finds each piece by machine);
  VERIFIED   the problem does not hold, or the fix would go beyond the evidence: give the entry unchanged and say why in reason.
Run verse.js and entry-check.js on a corrected entry; both must pass. Keep the commentator and his reading unless a problem is with them; change only what the problems name.
WRITE each to the "write" path given for it (the verdict schema; id is the entry id, without any round mark) BEFORE you return. Return all of them through the schema.`

const REVREFUTE = (vs) => REFUTE(vs)
  .replace(`(read the full verdicts in ${DIR}/verdicts/)`, `(these are REVISIONS: each id's revision is the file named below, and the entry it would replace is in ${DIR}/verdicts/ and ${DIR}/reverify/)`)
  .replace(`WRITE each refutation to ${DIR}/refutations/<id>.json BEFORE you return.`, `The revisions, and where to WRITE each refutation: ${JSON.stringify(vs.map(v => ({ id: v.id, revision: `${DIR}/revise/${roundFile(v.id)}.json`, write: `${DIR}/revrefute/${roundFile(v.id)}.json` })))}. WRITE each refutation to its write path BEFORE you return.`)

async function reviseRound(items, why) {
  const res = await parallel(chunk(items, 3).map(g => async () => {
    const rv = await agent(REVISE(g, why), { label: `revise:${g[0].id}${g.length > 1 ? '..' : ''}`, phase: 'Revise', schema: VERDICTS, effort: 'high' })
    const corr = ((rv && rv.verdicts) || []).filter(v => v.verdict === 'CORRECTED' && passes(v))
    if (!corr.length) return g.map(x => ({ id: x.id, kept: false, why: 'no correction' }))
    const rr = await agent(REVREFUTE(corr), { label: `refute revision:${corr[0].id}${corr.length > 1 ? '..' : ''}`, phase: 'Revise', schema: REFUTATIONS, effort: 'high' })
    return corr.map(v => { const r = ((rr && rr.refutations) || []).find(x => x.id === v.id); return { id: v.id, kept: !!(r && r.refuted === false) } })
  }))
  items.forEach(x => { ROUNDS[x.id] = (ROUNDS[x.id] || 1) + 1 })
  return res.filter(Boolean).flat()
}

let revised = []
/* an owner's amendment: every entry it touches is revised first */
/* A.revise: [{ id, d, problems? }], and A.reviseProblems for any without their own */
const OWNER = (A.revise || []).map(x => Object.assign({}, x, { problems: x.problems || A.reviseProblems || [] }))
if (OWNER.length) {
  phase('Revise')
  log(`revising ${OWNER.length} entr${OWNER.length === 1 ? 'y' : 'ies'} to the owner's amended rules`)
  revised = revised.concat(await reviseRound(OWNER, 'owner'))
  log(`owner's amendment: ${revised.filter(x => x.kept).length} of ${OWNER.length} revisions cleared by their refuters`)
}

phase('Edit')
let edit = await agent(EDITOR(revised.length > 0), { label: 'edit', phase: 'Edit', schema: EDIT, effort: 'high' })
log(`editor: ${edit ? edit.selected : '?'} of ${edit ? edit.days : '?'} selected; holes ${edit ? JSON.stringify(edit.holes) : '?'}; ${edit ? edit.spread : ''}`)

phase('Critic')
let critic = await agent(CRITIC_PROMPT(`${DIR}/critic-1.json`, false), { label: 'critic', phase: 'Critic', schema: CRITIC, effort: 'medium' })
const flagged = critic && !critic.ok ? critic.problems.filter(p => p.id && /-d\d{3}-[ps]$/.test(p.id)) : []
if (flagged.length) {
  phase('Revise')
  const byId = {}
  flagged.forEach(p => { (byId[p.id] = byId[p.id] || []).push({ problem: p.problem, fix: p.fix }) })
  const items = Object.keys(byId).map(id => ({ id, d: +id.match(/-d(\d{3})-/)[1], problems: byId[id] }))
  log(`critic questioned ${items.length} entr${items.length === 1 ? 'y' : 'ies'}: revising`)
  const round = await reviseRound(items, 'critic')
  revised = revised.concat(round)
  log(`revisions kept ${round.filter(x => x.kept).length} of ${round.length}`)
  phase('Edit')
  edit = await agent(EDITOR(true), { label: 'edit(again)', phase: 'Edit', schema: EDIT, effort: 'high' })
  phase('Critic')
  critic = await agent(CRITIC_PROMPT(`${DIR}/critic.json`, true), { label: 'critic(again)', phase: 'Critic', schema: CRITIC, effort: 'medium' })
}

return {
  batch: NAME,
  primaries: { alive: firstAlive, of: firstAll },
  standbys: { alive: standbyAlive, of: flat.flatMap(r => r.second).length },
  missing: flat.flatMap(r => r.missing),
  revised,
  edit,
  critic,
  next: A.dryName ? 'dry run: read the batch, then remove the folder or keep it as a record' : `node .scripts/teachings/recheck-evidence.js ${PLAN} ${A.n}; rule in rulings.json; node .scripts/teachings/land-batch.js ${PLAN} ${A.n}`,
}
