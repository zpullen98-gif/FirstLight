export const meta = {
  name: 'classics-month',
  description: 'Build one month of The Classics: four curator lanes propose, a verifier rules on every candidate with a locatable citation, a refuter tries to break every survivor, a fresh verifier rules on every refutation, an editor selects and dates the month from survivors only, and a critic reads the result',
  phases: [
    { title: 'Propose', detail: 'four lanes, sixteen candidates each, written to disk before they return' },
    { title: 'Verify', detail: 'VERIFIED, CORRECTED, HEDGE or REJECT, four candidates per agent' },
    { title: 'Refute', detail: 'every survivor attacked; default refuted when uncertain' },
    { title: 'Re-verify', detail: 'a fresh verifier on every refutation' },
    { title: 'Edit', detail: 'select, date, balance; never pad' },
    { title: 'Critic', detail: 'the rules, read back against the month' },
  ],
}

const M = args.month
const MM = args.MM
const todo = args.todo || {}
const ROOT = (args.root || 'C:/Users/zpull/FirstLight').replace(/\\/g, '/')
const WORK = `${ROOT}/.scripts/year-classics/work/${MM}`
const BRIEF = `${WORK}/brief.json`
const SHIPPED = `node ${ROOT}/.scripts/year-classics/shipped.js "<quotation>" "<author>"`
const TAGS = ['Philosophy', 'Poetry', 'Drama', 'Fiction', 'Essay', 'Correspondence', 'Diary']
const LANES = [
  { key: 'philosophy',    short: 'phil', brief: 'Ancient and modern PHILOSOPHY: treatises, dialogues, meditations, aphorism-books, essays that argue a position. Plato to Camus, Pascal to Weil, the Upanishadic commentators to Wittgenstein. Not the banned Stoics and Chinese masters; not scripture. FLOOR: at least two of your sixteen are Essay (Montaigne, Emerson, Woolf, Orwell, Baldwin: reflective prose in the author\'s own voice).' },
  { key: 'poetry-drama',  short: 'poet', brief: 'POETRY and DRAMA: epic, lyric, sonnet, haiku, verse fable, and lines spoken on the stage. Homer, Sappho, Dante, the Tang poets, Bashō, Shakespeare, Donne, Blake, Dickinson, Rilke, Akhmatova, Neruda, Heaney. A stage line names the play, act and scene and the speaker. FLOOR: at least four of your sixteen are Drama.' },
  { key: 'fiction-essay', short: 'fict', brief: 'FICTION, ESSAY, CORRESPONDENCE and DIARY: novels and stories, reflective prose in the author\'s own voice, published letters, journals and notebooks. Cervantes, Austen, Tolstoy, Dostoevsky, Eliot, Woolf, Kafka, Baldwin, Morrison; Montaigne, Emerson, Orwell; Rilke to Kappus, Keats, Chekhov; Woolf\'s and Kafka\'s diaries, Pessoa. FLOOR: at least three of your sixteen are Diary and at least three are Correspondence; February landed with one of each because this lane leaned to fiction, and a full count hid it.' },
  { key: 'cfl',           short: 'cfl',  brief: 'THE CALENDAR FOR LIFE LANE: propose ONLY from brief.cflCandidates, the lines Calendar For Life already carries, choosing those that fit this month\'s theme. CFL never externally verified them: treat each author and text as a starting claim. Keep the cflKey on every candidate. Restore the terminal period the CFL voice rules removed. If fewer than eight fit the theme honestly, propose fewer.' },
]

const norm = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[\u2018\u2019\u201a\u201b\u2032']/g, '').replace(/[\u201c\u201d\u201e\u201f\u2033"]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim()

const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out }

const CANDIDATES = {
  type: 'object',
  properties: {
    wrote: { type: 'string', description: 'the absolute path of the proposals file you wrote' },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: `unique: ${MM}-<lane short>-<two digits>, e.g. ${MM}-phil-03` },
          quote: { type: 'string', description: 'the line, in the wording of the edition you cite, ending in a full stop, question mark or exclamation mark, curly quotes only' },
          author: { type: 'string' },
          work: { type: 'string' },
          locator: { type: 'string', description: 'book/chapter/letter/section/line, or edition and page' },
          translator: { type: 'string', description: 'translator and year of the published translation whose English this is; empty if written in English' },
          year: { type: 'string', description: 'first publication, or composition where unpublished in the author\'s life' },
          tag: { type: 'string', enum: TAGS },
          speaker: { type: 'string', description: 'the character who says it, if it is a character\'s line; else empty' },
          fameTest: { type: 'string', enum: ['opening', 'closing', 'signature', 'reference'] },
          whyThisMonth: { type: 'string', description: 'one sentence: what it does for a reader on this theme at six in the morning' },
          cflKey: { type: 'string', description: 'the Calendar For Life carrier key if it came from there; else empty' },
          country: { type: 'string' },
          originalLanguage: { type: 'string' },
          authorGender: { type: 'string', enum: ['woman', 'man', 'other', 'unknown'] },
          century: { type: 'string', description: 'e.g. 19th, or 5th BCE' },
        },
        required: ['id', 'quote', 'author', 'work', 'locator', 'tag', 'fameTest', 'whyThisMonth', 'country', 'originalLanguage', 'authorGender', 'century'],
      },
    },
  },
  required: ['wrote', 'candidates'],
}

const VERDICTS = {
  type: 'object',
  properties: {
    wrote: { type: 'array', items: { type: 'string' }, description: 'the verdict files you wrote, one per candidate' },
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: ['VERIFIED', 'CORRECTED', 'HEDGE', 'REJECT'] },
          quote: { type: 'string', description: 'the line as it should ship: the located edition\'s wording, terminal stop, curly quotes' },
          source: { type: 'string', description: 'the source line as it should ship: Name, Work, locator (trans. Translator, Year), with (Speaker) after the locator for a character\'s line; no dash; at most 140 characters' },
          tradition: { type: 'string', enum: TAGS },
          note: { type: 'string', description: 'for HEDGE or CORRECTED: the plain provenance sentence the card prints beneath the line, at most 60 words; else empty' },
          speaker: { type: 'string' },
          evidence: {
            type: 'object',
            properties: {
              where: { type: 'string', description: 'what you actually consulted: an edition, a scholarly site, a library scan' },
              edition: { type: 'string' },
              locator: { type: 'string' },
              url: { type: 'string' },
            },
            required: ['where'],
          },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          reason: { type: 'string', description: 'one or two sentences: why this verdict' },
        },
        required: ['id', 'verdict', 'quote', 'source', 'tradition', 'note', 'evidence', 'confidence', 'reason'],
      },
    },
  },
  required: ['wrote', 'verdicts'],
}

const REFUTATIONS = {
  type: 'object',
  properties: {
    wrote: { type: 'array', items: { type: 'string' } },
    refutations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          refuted: { type: 'boolean' },
          reason: { type: 'string' },
          betterCitation: { type: 'string', description: 'if you found a better or correct citation, the source line; else empty' },
          wordingChecked: { type: 'boolean', description: 'did you compare the wording against the named edition or translation' },
        },
        required: ['id', 'refuted', 'reason', 'betterCitation', 'wordingChecked'],
      },
    },
  },
  required: ['wrote', 'refutations'],
}

const EDIT = {
  type: 'object',
  properties: {
    wrote: { type: 'array', items: { type: 'string' } },
    selected: { type: 'number' },
    days: { type: 'number' },
    shortfall: { type: 'number', description: 'days minus selected; zero when the month is full' },
    thinnestLane: { type: 'string', description: 'the lane whose survivors were fewest, for a rerun on shortfall' },
    deadLaneSuspected: { type: 'boolean', description: 'true if any tag came in at zero or one with a full or near-full count' },
    survivors: { type: 'number' },
    unused: { type: 'number' },
    balance: { type: 'string', description: 'one line: countries, women, English-original, tags, centuries' },
    notes: { type: 'string' },
  },
  required: ['wrote', 'selected', 'days', 'shortfall', 'thinnestLane', 'deadLaneSuspected', 'survivors', 'unused', 'balance', 'notes'],
}

const CRITIC = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string' } } },
  required: ['ok', 'problems'],
}

const COMMON = `You are working on First Light, an offline-first daily-practice app at ${ROOT}. A third dated year of quotations, The Classics, is being built one month at a time. This run is month ${M} (${MM}).

READ FIRST, with the Read tool: ${BRIEF}. It holds the theme, the blurb, the twelve rules, the closed tag vocabulary, the banned authors, the persons already at cap, the carry-ins, the Calendar For Life candidates, and the misattribution list. Everything there binds you.

The citation standard, in one sentence: a confident false citation is worse than an honest "attributed to", and nothing is minted. A line ships only in wording that exists in a named edition or a named published translation.

Before proposing or ruling on any line, run this in Bash and read the JSON:
  ${SHIPPED}
It says whether the exact line is already shipped anywhere in First Light (then it is out), whether it opens like a shipped line (then it is probably another rendering of one), whether the person is at the cap of three, and whether the author is banned.

You have Bash and the Read/Write tools. Web access may or may not be available; if WebFetch or WebSearch exists, use it to locate passages; if not, rely on what you know and say so in confidence and evidence. Write your output file BEFORE you return, so a run that dies after you loses nothing. Your final text is a return value, not a message to a person: return the JSON the schema asks for and nothing else.`

phase('Propose')
const lanesToRun = LANES.filter(l => !todo.lanesMissing || todo.lanesMissing.includes(l.key))
log(`month ${MM}: proposing on ${lanesToRun.length} lane(s)${todo.proposals ? `, ${todo.proposals} proposals already on disk` : ''}`)

const laneResults = await parallel(lanesToRun.map(lane => () =>
  agent(`${COMMON}

YOUR LANE: ${lane.key}. ${lane.brief}

Propose SIXTEEN candidates for this month's theme (for the cfl lane: up to sixteen from brief.cflCandidates only, fewer if fewer fit honestly). Over-proposing is deliberate: a verifier will reject a good share, and the editor is forbidden to pad. Each candidate needs a LOCATABLE citation before it is proposed: the work, and the book, chapter, letter, section or line, or an edition and page; a translated line names the translator and year of the published translation whose English you are quoting. The quotation ends in a full stop, question mark or exclamation mark and uses curly quotes only. Ids are ${MM}-${lane.short}-01 through ${MM}-${lane.short}-16.

Recruit toward the balance the editor must hit: at most ten from one country, at most sixteen originally in English, at least eight women, at least four of the seven tags, at least three centuries. Go beyond the English-language canon and name translators. Skip every banned author, every person at cap, every line shipped.js reports as shipped, and every line on the misattribution list under its famous name. Keep the material publishable: no wounds, dying or atrocity described.

WRITE your proposals to ${WORK}/proposals-${lane.key}.json as {"lane":"${lane.key}","candidates":[...]} with exactly the fields of the schema, before you return. Then return the same candidates through the schema, with "wrote" set to that path.`,
  { label: `propose:${lane.key}`, phase: 'Propose', schema: CANDIDATES })
))

const proposed = laneResults.filter(Boolean).flatMap(r => r.candidates || [])
log(`${proposed.length} proposed across ${laneResults.filter(Boolean).length} lane(s)`)

const seen = new Set()
const fresh = []
for (const c of proposed) {
  const n = norm(c.quote)
  if (!n || seen.has(n)) continue
  seen.add(n)
  fresh.push(c)
}
if (fresh.length !== proposed.length) log(`${proposed.length - fresh.length} duplicate proposal(s) dropped across lanes`)

const verifyIds = Array.from(new Set([...(todo.needVerdict || []), ...fresh.map(c => c.id)]))
const byId = Object.fromEntries(fresh.map(c => [c.id, c]))
const batches = chunk(verifyIds, 4)
log(`verifying ${verifyIds.length} candidate(s) in ${batches.length} batch(es)`)

const VERIFY_PROMPT = (ids, again) => `${COMMON}

YOUR JOB: rule on each of these candidates independently: ${ids.join(', ')}.
Find each one in ${WORK}/proposals-*.json (Read the four files; the id tells you the lane).${ids.some(i => byId[i]) ? ' For convenience, the proposals as returned this run:\n' + JSON.stringify(ids.map(i => byId[i]).filter(Boolean), null, 1) : ''}

For each: locate the passage. The verdict is one of
  VERIFIED   the line is in the named work at the named place, in this wording or a named edition's wording you now supply;
  CORRECTED  the line is real but the attribution, work, locator, translator or wording was wrong; you supply the right ones and a note saying what was corrected;
  HEDGE      the line is widely attributed and you could not locate it, or the trail ends in a secondary source; it may ship only with an honest "Attributed to" source and a note saying so plainly;
  REJECT     misattributed, minted, paraphrase presented as quotation, out of scope, already shipped, banned author, person at cap, or unpublishable.
Then write the line AS IT SHOULD SHIP: quote in the located edition's wording with a terminal stop and curly quotes; source as "Name, Work, locator (trans. Translator, Year)" with "(Speaker)" after the locator for a character's line, no dash anywhere, at most 140 characters, leading with the author's name because the card prints it as the byline; tradition from the closed vocabulary; note only for HEDGE and CORRECTED, at most 60 words, in plain declarative English with no dash.
${again ? 'This candidate was refuted once and re-verified; you are the second re-verifier. Read the refutation in ' + WORK + '/refutations/ and the earlier verdict in ' + WORK + '/verdicts/ and rule with both in hand. A line that fails twice is REJECT; a line that survives with a doubt is HEDGE with a note.' : ''}
WRITE each verdict to ${WORK}/${again ? 'reverify' : 'verdicts'}/<id>.json (the schema's object for that id) BEFORE you return. Then return all of them through the schema.`

const REFUTE_PROMPT = (verdicts) => `${COMMON}

YOUR JOB: REFUTE. A verifier passed these lines; try to break each one. Default to refuted=true when you are not sure. The lines, as the verifier would ship them:
${JSON.stringify(verdicts.map(v => ({ id: v.id, quote: v.quote, source: v.source, tradition: v.tradition, note: v.note, evidence: v.evidence })), null, 1)}

For each, check: is the wording that of the named edition or translation (translation drift is this track's main failure mode; compare against the named translator's text if you can reach it); is the locator right; is the attribution right (the misattribution list in the brief names the famous traps); is the speaker named where it is a character's line; is the author banned or at cap (run shipped.js); is the line already shipped; is it in scope (no scripture, film, lyric, proverb, business, oratory, post-1999); is it publishable; does the source line lead with the name, carry no dash, and fit 140 characters; is the tag the form of the work. If you find a better or correct citation, put it in betterCitation. A line the verifier ruled HEDGE is attacked like any other, since a hedge may ship and may ride the carry: try to locate it after all (then give the citation), try to show it is a known misattribution or a paraphrase minted later (then it is refuted), and check that its note says plainly what is and is not known. March's one hedge reached the carry without ever meeting a refuter.
WRITE each refutation to ${WORK}/refutations/<id>.json BEFORE you return. Then return all of them through the schema.`

const results = await pipeline(
  batches,
  (ids) => agent(VERIFY_PROMPT(ids, false), { label: `verify:${ids[0]}..`, phase: 'Verify', schema: VERDICTS, effort: 'high' }),
  async (vr, ids) => {
    const verdicts = (vr && vr.verdicts) || []
    const pass = verdicts.filter(v => v.verdict === 'VERIFIED' || v.verdict === 'CORRECTED' || v.verdict === 'HEDGE')
    if (!pass.length) return { verdicts, refutations: [] }
    const rr = await agent(REFUTE_PROMPT(pass), { label: `refute:${ids[0]}..`, phase: 'Refute', schema: REFUTATIONS, effort: 'high' })
    return { verdicts, refutations: (rr && rr.refutations) || [] }
  },
  async (stage, ids) => {
    const refutedIds = (stage.refutations || []).filter(r => r.refuted).map(r => r.id)
    if (!refutedIds.length) return stage
    const rv = await agent(VERIFY_PROMPT(refutedIds, true), { label: `reverify:${refutedIds[0]}..`, phase: 'Re-verify', schema: VERDICTS, effort: 'high' })
    return Object.assign({}, stage, { reverify: (rv && rv.verdicts) || [] })
  }
)

if ((todo.needRefute || []).length) {
  log(`${todo.needRefute.length} earlier verdict(s) still need refutation`)
  await parallel(chunk(todo.needRefute, 4).map(ids => () =>
    agent(`${COMMON}\n\nYOUR JOB: REFUTE the verdicts at ${WORK}/verdicts/ for these ids: ${ids.join(', ')}. Read each verdict file, then apply the refuter's checks: wording against the named edition or translation, locator, attribution against the misattribution list, speaker, banned or at cap (shipped.js), already shipped, scope, publishability, the source line's form. Default to refuted=true when unsure. WRITE ${WORK}/refutations/<id>.json for each BEFORE returning; return them through the schema.`,
      { label: `refute(resume):${ids[0]}..`, phase: 'Refute', schema: REFUTATIONS, effort: 'high' })))
}
if ((todo.needReverify || []).length) {
  log(`${todo.needReverify.length} earlier refutation(s) still need a re-verifier`)
  await parallel(chunk(todo.needReverify, 4).map(ids => () =>
    agent(VERIFY_PROMPT(ids, true), { label: `reverify(resume):${ids[0]}..`, phase: 'Re-verify', schema: VERDICTS, effort: 'high' })))
}

const tally = { verified: 0, corrected: 0, hedge: 0, reject: 0, refuted: 0, reverified: 0 }
for (const r of results.filter(Boolean)) {
  for (const v of r.verdicts || []) tally[v.verdict.toLowerCase()] = (tally[v.verdict.toLowerCase()] || 0) + 1
  tally.refuted += (r.refutations || []).filter(x => x.refuted).length
  tally.reverified += (r.reverify || []).length
}
log(`verdicts: ${tally.verified} verified, ${tally.corrected} corrected, ${tally.hedge} hedged, ${tally.reject} rejected; ${tally.refuted} refuted, ${tally.reverified} re-verified`)

phase('Edit')
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const EDIT_PROMPT = (rerun) => `${COMMON}

YOU ARE THE EDITOR for month ${M}. Read the brief, then READ EVERY FILE in ${WORK}/verdicts/, ${WORK}/refutations/ and ${WORK}/reverify/. The survivors are: every verdict VERIFIED or CORRECTED whose refutation (if any) has refuted=false, plus every re-verification VERIFIED or CORRECTED, plus every HEDGE (from verdicts or reverify) that carries an honest note. A line refuted and then rejected on re-verification is dead. Add the brief's carryIns: they are already verified survivors routed to this month.

Select EXACTLY brief.days entries (${todo.days || 'see the brief'}) from survivors only. Date each to a day. For January, day 1 is an opening line; for December, the last day is a closing line; otherwise date for rhythm, alternating forms and centuries. Apply the month's balance: at most 10 from one country, at most 16 originally in English, at least 8 women, at least 4 of the 7 tags, at least 3 centuries; no person twice in the month; no person over 3 in the year (brief.personsAtCap). Where a quotation IS the theme rather than merely fitting it, it outranks one that fits. NEVER PAD: if survivors fall short, select fewer and report the shortfall and the thinnest lane. A full count with any tag at zero or one means a dead lane, not an editorial choice: say so in deadLaneSuspected.

WRITE ${WORK}/month.json BEFORE you return, exactly this shape:
{"month":${M},"entries":[[day,"quote","source","Tag"] or [day,"quote","source","Tag","note"], ... in day order],
 "unused":[{"id":"...","quote":"...","source":"...","tradition":"...","note":"...","fitMonth":<1..12, the month it fits best>}, ...],
 "report":{"selected":n,"days":n,"shortfall":n,"tags":{...},"countries":{...},"women":n,"englishOriginal":n,"centuries":[...],"thinnestLane":"...","deadLaneSuspected":bool}}
Every entry's quote must end in a terminal stop with curly quotes; every source must lead with the name, name the work, carry no dash and fit 140 characters; every tag must be in the vocabulary; a note is present only for HEDGE and CORRECTED lines and carries no dash. Do NOT run land-month.js; that is the operator's. Do run node ${ROOT}/.scripts/check-year.js --selftest once to make sure the gate is alive, and reread your month.json against the rules before you return.

Also WRITE ${WORK}/SOURCES-${MM}.md: a section "## ${MONTH_NAMES[M-1]}: n of ${todo.days || 'N'}" in the register of SOURCES.md: how many candidates, how many survived, how many used; the balance; every CORRECTED and HEDGE entry with what was corrected or why it is hedged; misattributions found and kept out, so nobody proposes them again; survivors held for later months. No em dash anywhere in it.
${rerun ? 'THIS IS A RE-EDIT after a lane was rerun for a shortfall. Read everything again from disk; the new verdicts are there.' : ''}
Return the schema.`

let edit = await agent(EDIT_PROMPT(false), { label: 'edit', phase: 'Edit', schema: EDIT, effort: 'high' })
log(`editor: ${edit ? edit.selected : '?'} of ${edit ? edit.days : '?'} selected, shortfall ${edit ? edit.shortfall : '?'}, thinnest lane ${edit ? edit.thinnestLane : '?'}`)

if (edit && edit.shortfall > 0 && !args.noRerun) {
  const lane = LANES.find(l => l.key === edit.thinnestLane) || LANES[0]
  log(`shortfall of ${edit.shortfall}: rerunning the ${lane.key} lane once`)
  phase('Propose')
  const again = await agent(`${COMMON}

YOUR LANE: ${lane.key} (again). ${lane.brief}
The month came up ${edit.shortfall} short after verification. Read ${WORK}/proposals-${lane.key}.json and ${WORK}/month.json to see what was proposed and what was used; propose SIXTEEN NEW candidates this lane did not propose before, on this theme, with locatable citations, ids ${MM}-${lane.short}-17 through ${MM}-${lane.short}-32. Same rules as the brief. WRITE them to ${WORK}/proposals-${lane.key}-again.json before returning; return them through the schema.`,
    { label: `propose(again):${lane.key}`, phase: 'Propose', schema: CANDIDATES })
  const more = ((again && again.candidates) || []).filter(c => { const n = norm(c.quote); if (!n || seen.has(n)) return false; seen.add(n); return true })
  for (const c of more) byId[c.id] = c
  await pipeline(
    chunk(more.map(c => c.id), 4),
    (ids) => agent(VERIFY_PROMPT(ids, false).replace('proposals-*.json', 'proposals-*.json (including proposals-' + lane.key + '-again.json)'), { label: `verify(again):${ids[0]}..`, phase: 'Verify', schema: VERDICTS, effort: 'high' }),
    async (vr, ids) => {
      const pass = ((vr && vr.verdicts) || []).filter(v => v.verdict === 'VERIFIED' || v.verdict === 'CORRECTED' || v.verdict === 'HEDGE')
      if (!pass.length) return { refutations: [] }
      const rr = await agent(REFUTE_PROMPT(pass), { label: `refute(again):${ids[0]}..`, phase: 'Refute', schema: REFUTATIONS, effort: 'high' })
      return { refutations: (rr && rr.refutations) || [] }
    },
    async (stage, ids) => {
      const refutedIds = (stage.refutations || []).filter(r => r.refuted).map(r => r.id)
      if (!refutedIds.length) return stage
      await agent(VERIFY_PROMPT(refutedIds, true), { label: `reverify(again):${refutedIds[0]}..`, phase: 'Re-verify', schema: VERDICTS, effort: 'high' })
      return stage
    }
  )
  phase('Edit')
  edit = await agent(EDIT_PROMPT(true), { label: 'edit(again)', phase: 'Edit', schema: EDIT, effort: 'high' })
  log(`editor again: ${edit ? edit.selected : '?'} of ${edit ? edit.days : '?'}, shortfall ${edit ? edit.shortfall : '?'}`)
}

phase('Critic')
const critic = await agent(`${COMMON}

YOU ARE THE CRITIC. Read ${WORK}/month.json and ${BRIEF}. Check the month against the brief's rules, one by one: the count against brief.days (a shortfall is allowed and must be reported, padding is not); day order; every quote ends in a stop with curly quotes; every source leads with a name, names a work, has no dash, fits 140 characters, and names a translator for a translated line; every tag in the vocabulary; a note only on hedged or corrected lines and never with a dash; no person twice; nobody banned; nobody over cap; the balance targets; and the Makers' dead-lane symptom: a full count with a tag at zero or one. Run node ${ROOT}/.scripts/year-classics/shipped.js on any line you doubt. Report problems as specific, actionable sentences naming the day. Return the schema; ok is true only if you found nothing.`,
  { label: 'critic', phase: 'Critic', schema: CRITIC, effort: 'low' })

return {
  month: M,
  proposed: proposed.length,
  tally,
  edit,
  critic,
  next: `node .scripts/year-classics/land-month.js ${M}`,
}
