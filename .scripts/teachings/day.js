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
/* A course's day is its chamber entry; its line is found in the works. */
if (day.course) {
  const SEC = { concepts: 'a concept', practices: 'a practice', festivals: 'a festival' };
  const rt = corpus.rt(), T = 'node ' + __dirname.replace(/\\/g, '/');
  console.log(plan + ', day ' + day.d + ' of ' + rt.planDays(plan) + ': ' + day.label + ', ' + (SEC[day.sec] || day.sec) +
    (day.when ? ' (' + day.when + ')' : '') + ' (division ' + day.div + ')\n');
  console.log('The chamber’s words, printed just above the key line on the reader’s page:\n' + day.gloss + '\n');
  console.log('The key line may come from anywhere in: ' + day.works.map(w => w + ' (' + rt.planDays(w) + ' days)').join(', ') + '.');
  console.log('  search them:        ' + T + '/find.js ' + plan + ' "<words>"');
  console.log('  read around a line: ' + T + '/day.js <work> <work day>');
  console.log('  place the line:     ' + T + '/verse.js ' + plan + ' ' + day.d + ' "<the line>"   (it prints the packet command for the line)');
  process.exit(0);
}
console.log(plan + ', day ' + day.d + ': ' + day.label + ' (division ' + day.div + ')\n');
day.units.forEach(u => {
  const head = u.kind === 'verse' ? '[' + u.ref + ']' : '[' + u.kind.toUpperCase() + ': not citable]';
  console.log(head + '\n' + u.txt + '\n');
});
