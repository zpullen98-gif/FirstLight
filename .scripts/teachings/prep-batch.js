/* The Teachings, an operator tool: prepare a batch for its workflow run.

   node .scripts/teachings/prep-batch.js <plan> <n> [--days 1,2,3] [--name dry] [--redo]

   Writes work/<plan>-<NN>/brief.json (everything an agent is bound by) and
   todo.json (what is still to do, read from the files on disk, so a run
   that died resumes where it stopped). Refuses when the plan's division has
   moved since its set was written, when the batch has landed, or when a
   day's commentary packet is missing (run fetch-commentary.js first).
   --days and --name make a dry run: a named folder over chosen days that
   never lands. */
'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('./lib');
const corpus = require('./corpus');
const { packetsFor } = require('./packet');
const { readSet } = require('../check-teachings');

const ROSTER = JSON.parse(fs.readFileSync(path.join(__dirname, 'roster.json'), 'utf8'));

const RULES = [
  '1. FORM. One sentence: <plain sense>; <Commentator>, <place>, reads it as <reading>. Exactly one semicolon and one full stop, at the end. Aim for 35 to 45 words; at most 45, or 60 when two commentators are named (then: ...; A (school), place, reads it as X, and B (school), place, as Y.). The owner set this length: a reader meets it at six in the morning. The verb after the commentator is one of: reads, takes, hears, explains, understands. Never: shows, proves, reveals, the true meaning, actually.',
  '2. PLAIN SENSE (before the semicolon). A short clause of CONTEXT, because the key verse is printed just above the sentence: where the verse stands in the day’s passage and what the passage around it is doing (who speaks, to whom, what the chapter is about, what comes before or after), in the passage’s own terms. It NEVER repeats the key verse’s own words (the gate fails four words in a row taken from the verse) and never paraphrases it line by line. Forms that work: "Closing a chapter on the sage’s humility, the verse ..."; "In a chapter of contrasts between the multitude and the speaker, ..."; "Krishna, answering Arjuna’s doubt about action, ...". Present tense. No doctrine, no application, no evaluation, no dating, no authorship claim ("the chapter", "the text", "the Master says"; never "Laozi wrote" or "Muhammad writes"). It never names the commentator.',
  '3. THE READING (after the semicolon). One commentator from this plan’s roster (two only where they genuinely differ, and then name the difference without resolving it), opening the second half with his display name exactly as the roster gives it, then the place in the commentary (chapter, verse, book and section, page), then a paraphrase that the evidence supports and does not go beyond. No quotation from the commentator in the sentence. At most three words of the key verse may be quoted, in curly quotes.',
  '4. NEVER ANOTHER TRADITION. No comparison, no ranking, no "unlike", "fulfils", "anticipates", "all faiths", "superior". Name other groups only as the day’s text itself names them.',
  '5. DISAGREEMENT IS NAMED, NOT RESOLVED. No "rightly", "better", "more accurately", "correctly", "mistaken".',
  '6. HARD PASSAGES (war, killing, punishment, exclusion, law, sexuality). The plain sense states it in one plain clause: no softening, no pleading for context, no graphic detail, no polemic. The reading gives the commentator’s reading, including any limit he sets, attributed to him.',
  '7. HOUSE STYLE. British spelling (honour, colour, realise, judgement). Curly quotes and apostrophes only. No em dash, no en dash, no double hyphen, anywhere. No question or exclamation mark in the sentence. No you, your, we, our, us. No honorifics (Saint, St., Sri, pbuh and its signs, the Venerable, Lord Krishna). Names exactly as the roster spells them. The divine name as the key verse’s translation prints it when quoting; otherwise "God" or "the LORD" as the translation has it; never spell out the four-letter Hebrew name.',
  '8. THE KEY VERSE. Copied from `day.js`, verbatim, inside ONE unit (one verse, one ayah, one of Legge’s numbered sections, one paragraph); one to three whole sentences, beginning where a sentence begins and ending in . ? or !; 4 to 60 words; no dash of any kind (choose another verse, or stop before it); only these changes: straight quotes to curly, wrapped lines joined. Everything else stays exactly as printed, parentheses and capitals included. Never from a note, an argument, a commentary, a chant or a colophon (`day.js` marks them NOT CITABLE). Run `verse.js` on every key: it must print "ok": true, and its ref and at are copied into the proposal unchanged.',
  '9. THE SOURCE LINE (src). The commentator’s display name first, then the work and the place, then the edition actually read and its year: for example "Wang Bi, Laozi zhu, chapter 8, zh.wikisource (the Huating Zhang edition), revision 2354026 (2024)". When the reading is found only through a conduit (Legge’s notes and the like), the form is "<name>, as given in <conduit>, <place>" and the entry carries hedge: <conduit id>. At most 160 characters. No dash.',
  '10. THE STANDARD. A confident false attribution is worse than naming a different commentator. A reading not found in a source you opened does not ship. When in doubt, choose the reading you can show in the commentator’s own words.'
];

const VOICE = {
  tao: 'The Tao Te Ching is read here in James Legge’s translation (SBE 39, 1891), one chapter a day. Its authorship is traditional: say "the chapter" or "the text", never "Laozi says". The two roster commentaries are the oldest that survive: Wang Bi (third century), who reads the text through non-being (無) as the root of all that is, and the Heshang Gong commentary (Han dynasty or later, author unknown), which reads it as counsel for governing the self and the state and for nourishing life. Aim for a real mix across the batch: roughly half the days name each, choosing on each day the one whose comment on that chapter is the more substantial and the more clearly tied to the key verse.',
  pali: 'The Dhammapada is read in Max Müller’s translation (SBE 10, 1881), a chapter a day. The Buddha is "the Buddha" or "the Blessed One" only as the text names him; the reading is the Theravada commentary’s, through Burlingame’s translation of its stories.',
  gita: 'The Gita is read in Annie Besant’s verse-numbered translation (1922), a chapter a day. Krishna speaks to Arjuna on the field of Kurukshetra; the plain sense names who speaks. The three roster commentators are the founders of three schools of Vedanta: name the school whenever it is needed.',
  upanishads: 'The Isa, Kena and Katha Upanishads are read in Swami Paramananda’s translation; his own commentary is printed under each verse and is not a source. Name Śaṅkara (Advaita) by default; Madhva (Dvaita) where his reading differs; Rāmānuja only through the Śrī Bhāṣya.',
  analects: 'The Analects are read in James Legge’s translation (1893). "The Master" is Confucius as the text names him. Zhu Xi’s reading is the Neo-Confucian standard; He Yan’s collection preserves the older Han and Wei glosses.',
  zhuangzi: 'The Zhuangzi is read in Herbert Giles’ translation (1889). Guo Xiang’s commentary is the one through which the text was received.',
  veda: 'The Rig Veda is read in Ralph Griffith’s translation (1889 to 1892). A hymn addresses its god (Agni, Indra, Soma, the Dawn) by name; the plain sense names the god and what is asked. Sāyaṇa’s reading is the ritual one.',
  quran: 'The Qur’an is read in Marmaduke Pickthall’s translation (1930), which writes "Allah". The plain sense says what the ayah says and to whom ("the Prophet is told", "the believers are told"); the reading paraphrases the named mufassir.',
  tanakh: 'The Tanakh is read in the Jewish Publication Society translation (1917). The reading is from the Jewish commentators alone; the plan carries no Christian vocabulary of any kind.',
  bible: 'The Bible is read in the World English Bible, which prints "Yahweh". The reading is from the Church Fathers shared by Catholic, Orthodox and Protestant readers; Matthew Henry only as a labelled fallback.'
};

function trapsFor(plan) {
  const md = fs.readFileSync(path.join(__dirname, 'traps.md'), 'utf8');
  const sec = name => { const m = md.split(/^## /m).find(s => s.split('\n')[0].trim() === name); return m ? m.split('\n').slice(1).join('\n').trim() : ''; };
  return { all: sec('all'), plan: sec(plan) };
}

function main() {
  const args = process.argv.slice(2);
  const plan = args[0], n = +args[1];
  if (!plan || !n) { console.error('usage: node .scripts/teachings/prep-batch.js <plan> <n> [--days a,b,c] [--name dry]'); process.exit(1); }
  const flag = k => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : null; };
  const dryDays = flag('--days'), dryName = flag('--name');
  const P = ROSTER.plans[plan];
  if (!P) { console.error('no roster for ' + plan); process.exit(1); }

  const rt = corpus.rt();
  const div = rt.planDef(plan).div;
  const set = readSet(plan);
  if (set && set.div !== div) { console.error('refused: the ' + plan + ' set was written against division ' + set.div + ' and the plan is ' + div + ' now'); process.exit(1); }
  let days = lib.batchDays(plan, n);
  if (dryDays) days = dryDays.split(',').map(Number);
  const landed = new Set(((set && set.days) || []).map(e => e.d));
  /* --redo: the owner amended the rules after the batch landed; it is prepared
     again for a revision run and re-landed with land-batch.js --replace */
  if (!dryName && !args.includes('--redo') && days.every(d => landed.has(d))) { console.error('refused: ' + lib.batchName(plan, n) + ' has landed (use --redo to revise it under amended rules)'); process.exit(1); }
  const missing = [];
  days.forEach(d => packetsFor(plan, d).forEach(p => { if (p.missing) missing.push('day ' + d + ' chapter ' + p.ch); }));
  if (missing.length) { console.error('refused: packets missing (run node .scripts/teachings/fetch-commentary.js ' + plan + '): ' + missing.slice(0, 6).join(', ')); process.exit(1); }

  const name = dryName ? plan + '-' + dryName : lib.batchName(plan, n);
  const dir = dryName ? path.join(lib.WORK, name) : lib.batchDir(plan, n);
  fs.mkdirSync(dir, { recursive: true });
  ['verdicts', 'refutations', 'reverify', 'revise', 'revrefute', 'scratch'].forEach(s => fs.mkdirSync(path.join(dir, s), { recursive: true }));

  const counts = {};
  ((set && set.days) || []).forEach(e => { counts[e.by] = (counts[e.by] || 0) + 1; });
  const lanes = lib.lanesOf(plan, days);
  const root = lib.ROOT.replace(/\\/g, '/');
  const brief = {
    plan, batch: name, dry: !!dryName, div, root,
    days: days.map(d => ({ d, label: rt.planDayLabel(plan, d), id: { primary: lib.candId(plan, n, d, 'p').replace(lib.batchName(plan, n), name), standby: lib.candId(plan, n, d, 's').replace(lib.batchName(plan, n), name) } })),
    lanes,
    sensitive: lib.sensitiveDays(plan, days),
    rules: RULES,
    voice: VOICE[plan] || '',
    roster: {
      commentators: P.commentators.map(id => {
        const p = ROSTER.people[id];
        return { id, name: p.name, alsoName: p.alsoName || '', school: p.school || '', dates: p.dates, work: p.work, lang: p.lang, coverage: p.coverage[plan], sources: p.sources, traps: p.traps };
      }),
      conduits: P.conduits.map(id => Object.assign({ id }, ROSTER.conduits[id]))
    },
    forbid: P.forbid, watch: P.watch,
    traps: trapsFor(plan),
    countsSoFar: counts,
    tools: {
      day: 'node ' + root + '/.scripts/teachings/day.js ' + plan + ' <day>',
      verse: 'node ' + root + '/.scripts/teachings/verse.js ' + plan + ' <day> "<key verse>"',
      packet: 'node ' + root + '/.scripts/teachings/packet.js ' + plan + ' <day>',
      status: 'node ' + root + '/.scripts/teachings/status.js ' + plan + ' ' + n + (dryName ? ' --name ' + dryName : ''),
      gate: 'node ' + root + '/.scripts/check-teachings.js --candidate ' + path.join(dir, 'batch.json').replace(/\\/g, '/')
    },
    evidence: {
      rule: 'The commentator’s own words, verbatim from a source you actually opened, 12 to 120 characters for Chinese or 12 to 120 words otherwise, in the original language where you read it so, with your English gloss. At most 40 words from any copyrighted English. A packet source is cited with via "packet" and the packet’s url; anything else you opened with via "webfetch" and its exact url. The operator re-finds these words by machine (recheck-evidence.js) before anything lands.',
      packetSources: 'node ' + root + '/.scripts/teachings/packet.js ' + plan + ' <day>'
    },
    paths: {
      dir: dir.replace(/\\/g, '/'),
      proposals: dir.replace(/\\/g, '/') + '/proposals-<lane>.json',
      verdicts: dir.replace(/\\/g, '/') + '/verdicts/<id>.json',
      refutations: dir.replace(/\\/g, '/') + '/refutations/<id>.json',
      reverify: dir.replace(/\\/g, '/') + '/reverify/<id>.json',
      batch: dir.replace(/\\/g, '/') + '/batch.json',
      sources: dir.replace(/\\/g, '/') + '/SOURCES-' + name + '.md',
      critic: dir.replace(/\\/g, '/') + '/critic.json'
    }
  };
  fs.writeFileSync(path.join(dir, 'brief.json'), JSON.stringify(brief, null, 1) + '\n', 'utf8');

  const st = dryName ? null : lib.status(plan, n);
  const todo = st ? {
    lanesMissing: st.lanesMissing, daysMissing: st.daysMissing, needVerdict: st.needVerdict, needRefute: st.needRefute,
    needReverify: st.needReverify, needRevRefute: st.needRevRefute, needStandby: st.needStandby, standbyMissing: st.standbyMissing, blocked: st.blocked,
    hasBatch: st.hasBatch, alive: st.alive, dead: st.dead
  } : { lanesMissing: lanes.map(l => l.key), dry: true };
  fs.writeFileSync(path.join(dir, 'todo.json'), JSON.stringify(todo, null, 1) + '\n', 'utf8');
  console.log('  ' + name + ': ' + days.length + ' days (' + days[0] + ' to ' + days[days.length - 1] + '), ' + lanes.length + ' lanes, ' +
    brief.sensitive.length + ' sensitive; todo: ' + JSON.stringify(todo));
  console.log('  brief: ' + path.relative(lib.ROOT, path.join(dir, 'brief.json')).replace(/\\/g, '/'));
}
main();
