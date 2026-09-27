/* The Teachings, an agent tool: run the gate on one candidate entry.

   node .scripts/teachings/entry-check.js <plan> <file.json>

   The file holds one entry { d, key, ref, at, s, by, by2?, hedge?, src } (the
   label is filled in), or { days: [ ... ] }. Prints { ok, errors, warns } per
   entry. An entry with any error may not be proposed, passed or landed as it
   stands. Write the file with the Write tool (curly quotes survive; a shell
   argument may not). */
'use strict';
const fs = require('fs');
const corpus = require('./corpus');
const { checkEntry } = require('../check-teachings');

const [plan, file] = process.argv.slice(2);
if (!plan || !file) { console.error('usage: node .scripts/teachings/entry-check.js <plan> <file.json>'); process.exit(1); }
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const list = Array.isArray(j.days) ? j.days : [j];
const rt = corpus.rt();
let bad = 0;
const out = list.map(e => {
  const x = Object.assign({}, e, { label: e.label || (e.d ? rt.planDayLabel(plan, e.d) : '') });
  if (!x.by2) delete x.by2;
  if (!x.hedge) delete x.hedge;
  const r = checkEntry(x, { planId: plan, nDays: rt.planDays(plan) });
  if (r.errors.length) bad++;
  return { d: e.d, id: e.id || '', ok: !r.errors.length, errors: r.errors, warns: r.warns };
});
console.log(JSON.stringify(out.length === 1 ? out[0] : out, null, 1));
process.exit(bad ? 2 : 0);
