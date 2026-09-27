/* The Teachings, an operator tool: the args for a batch's workflow run.

   node .scripts/teachings/run-args.js <plan> <n> [--name dry]

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
if (!brief) { console.error('no brief.json: run prep-batch.js first'); process.exit(1); }
console.log(JSON.stringify({
  plan, n, name: B.name, dryName: dryName || '', root: lib.ROOT.replace(/\\/g, '/'), dir: B.dir.replace(/\\/g, '/'),
  lanes: brief.lanes, days: brief.days, todo
}));
