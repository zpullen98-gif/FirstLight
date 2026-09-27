/* The Teachings, an agent tool: is this key verse verbatim in the day?

   node .scripts/teachings/verse.js <plan> <day> "<the key verse>"

   Prints JSON: exact (verbatim in the day's passage, after joining wrapped
   lines, treating curly and straight quotes as one mark, and dropping Legge's
   section numbers), ref and at (where it is: copy both into the proposal),
   kind (only "verse" may be a key verse), words, dash, starts, ends, and
   problems (empty when the key may be used). A key with any problem may not
   be proposed.

   node .scripts/teachings/verse.js course-<tr> <course day> "<the key line>" [--ref "<ref>"]

   For a tradition course the line is placed anywhere in the tradition's works:
   the JSON adds work and pd (the work and the work's day that hold it), also
   (other places the same words stand; --ref chooses among them), and packet,
   the command that prints the commentary on the line. */
'use strict';
const corpus = require('./corpus');

const argv = process.argv.slice(2);
const [plan, dayArg, key] = argv;
const ri = argv.indexOf('--ref'), wantRef = ri > -1 ? argv[ri + 1] : undefined;
if (!plan || !dayArg || key === undefined) { console.error('usage: node .scripts/teachings/verse.js <plan> <day> "<key verse>"'); process.exit(1); }
const r = corpus.locate(plan, +dayArg, key, corpus.isCourse(plan) ? wantRef : undefined);
r.ok = r.exact && !r.problems.length;
if (corpus.isCourse(plan) && r.exact) {
  const u = corpus.unitsOfPlan(r.work).find(x => x.pd === r.pd && x.ref === r.ref);
  const v = u ? String(u.short).split(' to ')[0] : '';
  r.packet = 'node ' + __dirname.replace(/\\/g, '/') + '/packet.js ' + r.work + ' ' + r.pd + (v ? ' --verse ' + v : '');
  r.passage = 'node ' + __dirname.replace(/\\/g, '/') + '/day.js ' + r.work + ' ' + r.pd;
}
console.log(JSON.stringify(r, null, 1));
process.exit(r.ok ? 0 : 2);
