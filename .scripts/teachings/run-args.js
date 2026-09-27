/* The Teachings, an operator tool: the args for a batch's workflow run.

   node .scripts/teachings/run-args.js <plan> <n> [--name dry] [--revise-all "<problem>" "<fix>"]

   Prints the JSON to pass as the Workflow tool's args, built from the
   batch's brief.json and todo.json (run prep-batch.js first, and again
   before a resumed run, so todo.json is current). */
'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

const a = process.argv.slice(2);
const plan = a[0], n = +a[1];
const ni = a.indexOf('--name'), dryName = ni > -1 ? a[ni + 1] : null;
if (!plan || !n) { console.error('usage: node .scripts/teachings/run-args.js <plan> <n> [--name dry]'); process.exit(1); }
const B = lib.batchRef(plan, n, dryName);
const brief = lib.readJSON(path.join(B.dir, 'brief.json'));
const todo = lib.readJSON(path.join(B.dir, 'todo.json')) || {};
/* each candidate's next revision round, from disk */
const rounds = {};
brief.days.forEach(x => [x.id.primary, x.id.standby].forEach(id => { const k = lib.nextRound(B.dir, id); if (k > 1) rounds[id] = k; }));
/* A lane whose proposer died part-way (a usage limit, a crash) wrote some of
   its days: the rest go to a remainder lane of their own, written to
   proposals-<key>r.json, so nothing already proposed is proposed again under
   the same ids and no proposed day is left without a proposer. */
const lanes = (brief ? brief.lanes : []).slice();
const missingDays = new Set(todo.daysMissing || []);
lanes.slice().forEach(l => {
  if ((todo.lanesMissing || []).includes(l.key)) return;
  const rest = l.days.filter(d => missingDays.has(d));
  if (!rest.length) return;
  let key = l.key + 'r';
  while (fs.existsSync(path.join(B.dir, 'proposals-' + key + '.json'))) key += 'r';
  lanes.push({ key, days: rest, sensitive: l.sensitive });
  todo.lanesMissing = (todo.lanesMissing || []).concat(key);
});
/* --revise-all "<problem>" "<fix>": every survivor revised first (an owner's amendment) */
const ri = a.indexOf('--revise-all');
let revise = [];
if (ri > -1) {
  const st = lib.status(plan, n, dryName);
  revise = Object.keys(st.days).map(Number).sort((x, y) => x - y).filter(d => st.days[d].survivor)
    .map(d => ({ id: st.days[d].survivor.id, d }));
  todo.lanesMissing = [];
}
/* --revise-critic: the critic's last reading still names problems after a
   run; each named entry goes through one more revision round (a revision and
   its refuter), then the editor and the critic read again */
if (a.includes('--revise-critic')) {
  const c = lib.lastCritic(B.dir);
  const byId = {};
  const add = (id, p) => { (byId[id] = byId[id] || { id, d: +id.match(/-d(\d{3})-/)[1], problems: [] }).problems.push({ problem: p.problem, fix: p.fix }); };
  /* a problem with the batch as a whole reaches every entry its text names */
  const idRe = new RegExp(B.name.replace(/[-]/g, '\\-') + '-d\\d{3}-[ps]', 'g');
  ((c && c.problems) || []).forEach(p => {
    if (!p) return;
    if (p.id) add(p.id, p);
    else {
      const txt = (p.problem || '') + ' ' + (p.fix || '');
      /* full ids, and the short form a critic uses after the first ("d020-p") */
      const ids = new Set(txt.match(idRe) || []);
      (txt.match(/\bd\d{3}-[ps]\b/g) || []).forEach(sh => ids.add(B.name + '-' + sh));
      [...ids].forEach(id => add(id, p));
    }
  });
  revise = revise.concat(Object.values(byId));
  todo.lanesMissing = [];
}
if (!brief) { console.error('no brief.json: run prep-batch.js first'); process.exit(1); }
console.log(JSON.stringify({
  plan, n, name: B.name, dryName: dryName || '', root: lib.ROOT.replace(/\\/g, '/'), dir: B.dir.replace(/\\/g, '/'),
  lanes, days: brief.days, todo, rounds, revise,
  reviseProblems: ri > -1 ? [{ problem: a[ri + 1], fix: a[ri + 2] }] : [],
  reviseWhy: a.includes('--revise-critic') && ri < 0 ? 'critic' : 'owner',
  verifyPer: typeof lib.CFG.verifyPerAgent === 'object' ? (lib.CFG.verifyPerAgent[plan] || lib.CFG.verifyPerAgent.default || 3) : (lib.CFG.verifyPerAgent || 3)
}));
