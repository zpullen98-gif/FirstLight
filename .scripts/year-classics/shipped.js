/* Is this line already shipped anywhere in First Light, and is this person at
   the cap? A curator runs it before proposing, a verifier before ruling.

   Usage: node .scripts/year-classics/shipped.js "<quotation>" "<author or source line>"
   Prints one JSON object. The answer is the JSON; the exit code is always 0. */
'use strict';
const fs = require('fs');
const path = require('path');
const gate = require('../check-year');

const [quote, who] = process.argv.slice(2);
const norm = gate.normText(quote || '');
const head = norm.slice(0, 40);

const shipped = [], near = [];
for (const o of gate.othersFor('__all__')) {
  if (norm && o.norms.has(norm)) shipped.push(o.label);
  else if (head && o.heads.has(head)) near.push(o.label);
}

let person = null, yearCount = 0, months = [];
if (who) {
  person = gate.personKey(who);
  const ledgerPath = path.join(__dirname, 'ledger.json');
  const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')).persons || {} : {};
  for (const [k, v] of Object.entries(ledger)) {
    if (gate.samePerson(k, person)) { yearCount += v.count || 0; months = months.concat(v.months || []); }
  }
}

const banned = gate.CLASSICS_BANNED.some(b => person && gate.samePerson(gate.personKey(b), person));

console.log(JSON.stringify({
  shipped,                       // files that already carry this exact line: propose it nowhere
  near,                          // files with a line that opens the same way: probably another rendering of it
  person, yearCount, months,
  cap: 3, atCap: yearCount >= 3, banned
}, null, 1));
