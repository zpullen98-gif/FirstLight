/* The Teachings, an agent tool: one day's passage, unit by unit.

   node .scripts/teachings/day.js <plan> <day>          readable text
   node .scripts/teachings/day.js <plan> <day> --json   the units as JSON

   Each unit prints under its reference and kind. Only kind "verse" may be a
   key verse; the rest (Giles' arguments and notes, Paramananda's commentary,
   peace chants, the Gita's colophons) are printed on the reader's page but
   are not the text. Legge's section numbers are already dropped. */
'use strict';
const corpus = require('./corpus');

const [plan, dayArg, flag] = process.argv.slice(2);
if (!plan || !dayArg) { console.error('usage: node .scripts/teachings/day.js <plan> <day> [--json]'); process.exit(1); }
const day = corpus.dayOf(plan, +dayArg);
if (flag === '--json') { console.log(JSON.stringify(day, null, 1)); process.exit(0); }
console.log(plan + ', day ' + day.d + ': ' + day.label + ' (division ' + day.div + ')\n');
day.units.forEach(u => {
  const head = u.kind === 'verse' ? '[' + u.ref + ']' : '[' + u.kind.toUpperCase() + ': not citable]';
  console.log(head + '\n' + u.txt + '\n');
});
