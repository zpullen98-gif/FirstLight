/* The Teachings, an agent tool: is this key verse verbatim in the day?

   node .scripts/teachings/verse.js <plan> <day> "<the key verse>"

   Prints JSON: exact (verbatim in the day's passage, after joining wrapped
   lines, treating curly and straight quotes as one mark, and dropping Legge's
   section numbers), ref and at (where it is: copy both into the proposal),
   kind (only "verse" may be a key verse), words, dash, starts, ends, and
   problems (empty when the key may be used). A key with any problem may not
   be proposed. */
'use strict';
const corpus = require('./corpus');

const [plan, dayArg, key] = process.argv.slice(2);
if (!plan || !dayArg || key === undefined) { console.error('usage: node .scripts/teachings/verse.js <plan> <day> "<key verse>"'); process.exit(1); }
const r = corpus.locate(plan, +dayArg, key);
r.ok = r.exact && !r.problems.length;
console.log(JSON.stringify(r, null, 1));
process.exit(r.ok ? 0 : 2);
