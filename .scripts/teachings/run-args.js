/* The Teachings, an operator tool: the args for a batch's workflow run.

   node .scripts/teachings/run-args.js <plan> <n> [--name dry] [--revise-all "<problem>" "<fix>"]

   Prints the JSON to pass as the Workflow tool's args, built from the
   batch's brief.json and todo.json (run prep-batch.js first, and again
   before a resumed run, so todo.json is current). */
'use strict';
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
  const c = lib.readJSON(path.join(B.dir, 'critic.json')) || lib.readJSON(path.join(B.dir, 'critic-1.json'));
  const byId = {};
  ((c && c.problems) || []).filter(p => p && p.id).forEach(p => { (byId[p.id] = byId[p.id] || { id: p.id, d: p.d, problems: [] }).problems.push({ problem: p.problem, fix: p.fix }); });
  revise = revise.concat(Object.values(byId));
  todo.lanesMissing = [];
}
if (!brief) { console.error('no brief.json: run prep-batch.js first'); process.exit(1); }
console.log(JSON.stringify({
  plan, n, name: B.name, dryName: dryName || '', root: lib.ROOT.replace(/\\/g, '/'), dir: B.dir.replace(/\\/g, '/'),
  lanes: brief.lanes, days: brief.days, todo, rounds, revise,
  reviseProblems: ri > -1 ? [{ problem: a[ri + 1], fix: a[ri + 2] }] : [],
  reviseWhy: a.includes('--revise-critic') && ri < 0 ? 'critic' : 'owner'
}));
