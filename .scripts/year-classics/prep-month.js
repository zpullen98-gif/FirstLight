/* Prepare one month of The Classics for its workflow run.

   Writes work/<MM>/brief.json, everything the agents read for themselves:
   the theme and blurb, the rules, the banned list, the persons at cap, the
   carry-ins that fit this month, the CFL candidates, the misattribution list,
   and the tag counts so far. Then computes the todo from what is already on
   disk in work/<MM>/ and writes it to work/<MM>/todo.json, so a run after a
   dead one does only the missing work. The workflow script has no filesystem;
   it gets `todo` through args and the agents read the brief themselves.

   Usage: node .scripts/year-classics/prep-month.js <month 1..12> */
'use strict';
const fs = require('fs');
const path = require('path');
const gate = require('../check-year');

const m = Number(process.argv[2]);
if (!(m >= 1 && m <= 12)) { console.error('usage: prep-month.js <month 1..12>'); process.exit(1); }
const MM = String(m).padStart(2, '0');
const HERE = __dirname;
const WORK = path.join(HERE, 'work', MM);
fs.mkdirSync(path.join(WORK, 'verdicts'), { recursive: true });
fs.mkdirSync(path.join(WORK, 'refutations'), { recursive: true });
fs.mkdirSync(path.join(WORK, 'reverify'), { recursive: true });

const readJson = (p, fallback) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback;

const year = gate.loadYear('js/data-year-classics.js');
if (year.q && year.q[m]) { console.error(`month ${m} has already landed (${year.q[m].length} entries); nothing to prepare.`); process.exit(1); }

const months = year.months[m - 1];
const ledger = readJson(path.join(HERE, 'ledger.json'), { persons: {} }).persons || {};
const carry = readJson(path.join(HERE, 'carry.json'), { entries: [] }).entries || [];
const banned = readJson(path.join(HERE, 'banned.json'), { banned: [], out_of_scope: [] });
const cfl = readJson(path.join(HERE, 'work', 'cfl-candidates.json'), { candidates: [] }).candidates || [];
const misattributions = fs.existsSync(path.join(HERE, 'misattributions.md')) ? fs.readFileSync(path.join(HERE, 'misattributions.md'), 'utf8') : '';

const tagsSoFar = {};
let landed = 0;
for (const k of Object.keys(year.q || {})) for (const e of year.q[k]) { landed++; tagsSoFar[e[3]] = (tagsSoFar[e[3]] || 0) + 1; }

const atCap = Object.entries(ledger).filter(([, v]) => (v.count || 0) >= 3).map(([k, v]) => ({ person: k, count: v.count, months: v.months }));
const used = Object.entries(ledger).map(([k, v]) => ({ person: k, count: v.count }));

const brief = {
  month: m, name: months[0], theme: months[1], blurb: months[2], days: gate.MLEN[m - 1],
  landedSoFar: landed, tagsSoFar,
  vocabulary: gate.CLASSICS_TAGS,
  rules: [
    'A line from a NAMED WORK by a named author, philosophy or imaginative literature, first published before 2000.',
    'Famous, meaning one of: the opening or closing line of a work; the sentence the work is known by; a locatable entry in a standard reference (a fame signal, never a verification).',
    'It must help at six in the morning on this month\'s theme. Famous and bleak is out.',
    'Every candidate carries a LOCATABLE citation before it is proposed: work, and book/chapter/letter/section/line, or edition and page. A translated line names the translator and year of the published translation whose wording it uses.',
    'The source line LEADS with the author\'s name (the card prints it as the byline and has no author field), then the work, then the locator, then the translation in parentheses. A character\'s line names the speaker in parentheses after the locator. At most 140 characters. No em dash in the source or the note: use a colon.',
    'The quotation ends in a full stop, question mark or exclamation mark. Curly quotes only; no straight double quote anywhere.',
    'No person twice in the month; at most three lines per person in the year. Authors on the banned list never.',
    'Per month the editor balances: at most 10 entries from one country, at most 16 originally written in English, at least 8 women, at least 4 of the 7 tags, at least 3 centuries. Curators recruit toward that: name translators, go beyond the English canon.',
    'Nothing already shipped in Q, Q_MAKERS, UPLIFT or this file: run node .scripts/year-classics/shipped.js "<quote>" "<author>" before proposing, and again before ruling.',
    'Keep the material publishable: no graphic description of wounds, dying or atrocity. A quotation that would need a content warning is the wrong quotation, however powerful.',
    'A confident false citation is worse than an honest "attributed to". Never mint wording. Where the trail runs out, HEDGE with a note that says so plainly.',
    'The editor is forbidden to pad the month to reach the day count.'
  ],
  outOfScope: banned.out_of_scope,
  banned: banned.banned,
  personsAtCap: atCap,
  personsUsed: used,
  carryIns: carry.filter(c => Number(c.fitMonth) === m),
  cflCandidates: cfl,
  misattributions
};
fs.writeFileSync(path.join(WORK, 'brief.json'), JSON.stringify(brief, null, 1) + '\n');

/* ---- the todo, from disk ---- */
const LANES = ['philosophy', 'poetry-drama', 'fiction-essay', 'cfl'];
const lanesMissing = LANES.filter(l => !fs.existsSync(path.join(WORK, `proposals-${l}.json`)));
const proposals = [];
for (const l of LANES) {
  const p = path.join(WORK, `proposals-${l}.json`);
  if (!fs.existsSync(p)) continue;
  const j = readJson(p, { candidates: [] });
  for (const c of j.candidates || []) proposals.push(Object.assign({ lane: l }, c));
}
const verdictOf = (id) => readJson(path.join(WORK, 'verdicts', id + '.json'), null);
const refutationOf = (id) => readJson(path.join(WORK, 'refutations', id + '.json'), null);
const reverifyOf = (id) => readJson(path.join(WORK, 'reverify', id + '.json'), null);

const needVerdict = proposals.filter(c => !verdictOf(c.id)).map(c => c.id);
const needRefute = proposals.filter(c => { const v = verdictOf(c.id); return v && (v.verdict === 'VERIFIED' || v.verdict === 'CORRECTED') && !refutationOf(c.id); }).map(c => c.id);
const needReverify = proposals.filter(c => { const r = refutationOf(c.id); return r && r.refuted && !reverifyOf(c.id); }).map(c => c.id);
const hasMonth = fs.existsSync(path.join(WORK, 'month.json'));

const todo = { month: m, MM, lanesMissing, proposals: proposals.length, needVerdict, needRefute, needReverify, hasMonth };
fs.writeFileSync(path.join(WORK, 'todo.json'), JSON.stringify(todo, null, 1) + '\n');
console.log(JSON.stringify(todo, null, 1));
