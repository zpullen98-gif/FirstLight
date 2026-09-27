/* The Teachings, an operator tool: land a verified batch in its plan's set.

   node .scripts/teachings/land-batch.js <plan> <n> [--replace]

   Nothing is written until every check passes:
     - the batch has not landed, and its days are free in the set
     - every entry in work/<plan>-<NN>/batch.json is a survivor (lib.status),
       exactly as the verdict that kept it alive gives it: the editor may turn
       straight quotes curly and nothing else
     - every entry's evidence was re-found by machine (recheck.json FOUND),
       or rulings.json rules { "<id>": { "ruling": "accept", "reason": "..." } }
     - the critic's last reading found nothing, or rulings.json holds { "critic": "..." }
     - the whole set, with the batch joined, passes check-teachings.js
   Then it writes .scripts/plans/teachings/<plan>.json, recounts ledger.json,
   and appends the batch's SOURCES section to SOURCES.md under
   "# The Teachings". A batch with holes (days with no survivor) lands its
   survivors; the holes are rerun as a batch of their own days. */
'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('./lib');
const corpus = require('./corpus');
const { checkSet, readSet } = require('../check-teachings');

const SET_DIR = path.join(__dirname, '..', 'plans', 'teachings');
const LEDGER = path.join(__dirname, 'ledger.json');
const SOURCES = path.join(lib.ROOT, 'SOURCES.md');

function refuse(m) { console.error('land-batch: refused, nothing written.\n  ' + m); process.exit(1); }

function main() {
  const [plan, nArg] = process.argv.slice(2);
  const n = +nArg;
  if (!plan || !n) { console.error('usage: node .scripts/teachings/land-batch.js <plan> <n>'); process.exit(1); }
  const B = lib.batchRef(plan, n);
  const bj = lib.readJSON(path.join(B.dir, 'batch.json'));
  if (!bj) refuse('no batch.json in ' + path.relative(lib.ROOT, B.dir));
  const rt = corpus.rt();
  const div = rt.planDef(plan).div;
  if (bj.div && bj.div !== div) refuse('the batch was written against division ' + bj.div + ', the plan is ' + div);
  const set = readSet(plan) || { plan, div, days: [] };
  if (set.div !== div) refuse('the set was written against division ' + set.div);
  /* --replace: a batch revised under amended rules takes back its own days */
  if (process.argv.includes('--replace')) {
    const before = set.days.length;
    set.days = set.days.filter(e => e.batch !== B.name);
    console.log('  --replace: ' + (before - set.days.length) + ' landed day(s) of ' + B.name + ' taken back for re-landing');
  }
  const landed = new Set(set.days.map(e => e.d));
  const entries = bj.days || [];
  const inBatch = new Set(B.days);
  const problems = [];
  entries.forEach(e => {
    if (!inBatch.has(e.d)) problems.push('day ' + e.d + ' is not in ' + B.name);
    if (landed.has(e.d)) problems.push('day ' + e.d + ' has already landed');
  });

  /* survivors only, unreworded */
  const st = lib.status(plan, n);
  const q = s => corpus.norm(s || '');
  entries.forEach(e => {
    const rec = st.days[e.d];
    const sv = rec && rec.survivor;
    if (!sv) { problems.push('day ' + e.d + ': no survivor on disk'); return; }
    if (sv.id !== e.id) { problems.push('day ' + e.d + ': the entry is ' + e.id + ' but the survivor is ' + sv.id); return; }
    const want = lib.entryOf(sv.final);
    lib.ENTRY_FIELDS.forEach(k => {
      const a = e[k], b = want[k];
      const same = (k === 'key' || k === 's' || k === 'src') ? q(a) === q(b) : JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
      if (!same) problems.push('day ' + e.d + ': ' + k + ' differs from the verdict that kept it alive (the editor may only curl quotes)');
    });
  });

  /* the machine recheck, and the operator's rulings */
  const recheck = lib.readJSON(path.join(B.dir, 'recheck.json'));
  const rulings = lib.readJSON(path.join(B.dir, 'rulings.json')) || {};
  if (!recheck) problems.push('no recheck.json: run node .scripts/teachings/recheck-evidence.js ' + plan + ' ' + n);
  else entries.forEach(e => {
    const r = recheck[e.id];
    if (r && r.status === 'FOUND') return;
    const ru = rulings[e.id];
    if (ru && ru.ruling === 'accept' && ru.reason) return;
    problems.push('day ' + e.d + ': evidence ' + (r ? r.status : 'not rechecked') + (r && r.detail ? ' (' + r.detail + ')' : '') + ', and no accepting ruling in rulings.json');
  });
  /* the critic's last reading: critic.json after a round of revisions, else critic-1.json */
  const critic = lib.readJSON(path.join(B.dir, 'critic.json')) || lib.readJSON(path.join(B.dir, 'critic-1.json'));
  if (!critic) problems.push('no critic.json or critic-1.json');
  else if (!critic.ok && !rulings.critic) problems.push('the critic found ' + (critic.problems || []).length + ' problem(s): rule on them in rulings.json ("critic")');
  if (problems.length) refuse(problems.join('\n  '));

  /* the whole set, with the batch joined, through the gate */
  const add = entries.map(e => {
    const out = { d: e.d, label: rt.planDayLabel(plan, e.d) };
    lib.ENTRY_FIELDS.forEach(k => { if (e[k] !== undefined && e[k] !== null && e[k] !== '') out[k] = e[k]; });
    out.batch = B.name;
    out.id = e.id;
    return out;
  });
  const joined = { plan, div, days: set.days.concat(add).sort((a, b) => a.d - b.d) };
  const r = checkSet(joined, {});
  if (r.errors.length) refuse('the joined set fails the gate:\n  ' + r.errors.join('\n  '));

  fs.mkdirSync(SET_DIR, { recursive: true });
  fs.writeFileSync(path.join(SET_DIR, plan + '.json'), JSON.stringify(joined, null, 1) + '\n', 'utf8');

  const ledger = lib.readJSON(LEDGER) || { about: 'The Teachings: what has landed, per plan. Written by land-batch.js.', plans: {} };
  const by = {};
  joined.days.forEach(e => { by[e.by] = (by[e.by] || 0) + 1; });
  const L = ledger.plans[plan] || { batches: [] };
  if (!L.batches.includes(B.name)) L.batches.push(B.name);
  if (process.argv.includes('--replace')) L.relanded = (L.relanded || []).concat([B.name]);
  L.days = joined.days.length;
  L.of = rt.planDays(plan);
  L.by = by;
  L.hedged = joined.days.filter(e => e.hedge).length;
  ledger.plans[plan] = L;
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n', 'utf8');

  const secFile = path.join(B.dir, 'SOURCES-' + B.name + '.md');
  if (fs.existsSync(secFile)) {
    let src = fs.readFileSync(SOURCES, 'utf8');
    if (src.indexOf('\n# The Teachings') < 0) src = src.replace(/\s*$/, '\n\n# The Teachings\n\nEach day’s key verse and one sentence, per plan, verified batch by batch; the evidence trails are in .scripts/teachings/work/.\n');
    const sec = fs.readFileSync(secFile, 'utf8').trim();
    const head = sec.split('\n')[0];
    /* a re-landed batch replaces its own section */
    const at = src.indexOf('\n' + head + '\n');
    if (at > -1) {
      const next = src.indexOf('\n## ', at + head.length + 1);
      src = src.slice(0, at) + '\n' + sec + '\n' + (next > -1 ? src.slice(next) : '');
    } else src = src.replace(/\s*$/, '\n\n' + sec + '\n');
    fs.writeFileSync(SOURCES, src, 'utf8');
  }

  const holes = B.days.filter(d => !entries.some(e => e.d === d));
  console.log('  landed ' + B.name + ': ' + entries.length + ' of ' + B.days.length + ' days' + (holes.length ? ' (holes: ' + holes.join(', ') + ')' : '') +
    '; ' + plan + ' now ' + joined.days.length + ' of ' + rt.planDays(plan) + '; ' + r.warns.length + ' warning(s)');
  r.warns.forEach(w => console.log('    warn ' + w));
  console.log('\n  next:\n    node .scripts/plans/build-plans.js      (writes the preview, or the full set when complete)' +
    '\n    node .scripts/check-teachings.js && node .scripts/check-plans.js && node .scripts/check-syntax.js' +
    '\n    preview: py serve.py 8633, then /?nosw&preview=teachings#/hall/' + plan +
    '\n    commit by explicit path: .scripts/plans/teachings/' + plan + '.json .scripts/teachings/ledger.json SOURCES.md .scripts/teachings/work/' + B.name + '/');
}
main();
