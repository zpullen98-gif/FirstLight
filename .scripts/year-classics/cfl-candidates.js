/* Calendar For Life's quotations, as CANDIDATES for The Classics.

   CFL's own audit commit (66b74c4) says most of its 840 lines had no external
   verification, so nothing here is imported on CFL's say-so. This filters its
   inventory to the named-person records whose author is on cfl-authors.txt
   (philosophy and literature), drops anything First Light has already shipped,
   and writes work/cfl-candidates.json for the CFL curator lane to propose
   from. The verifier then treats the CFL attribution as a starting claim.

   Inputs: C:\Users\zpull\CalendarForLife\.scripts\quote-inventory.json, built
   by that project's build-quote-inventory.ps1 (extended to include the twelve
   MONTH_QUOTES). CFL's voice rules strip the terminal period; the verifier
   restores wording to the located edition, so the text is passed through as
   CFL has it.

   Usage: node .scripts/year-classics/cfl-candidates.js */
'use strict';
const fs = require('fs');
const path = require('path');
const gate = require('../check-year');

const INV = 'C:/Users/zpull/CalendarForLife/.scripts/quote-inventory.json';
if (!fs.existsSync(INV)) { console.error('no inventory at ' + INV + '; run CalendarForLife/.scripts/build-quote-inventory.ps1 first'); process.exit(1); }
const inventory = JSON.parse(fs.readFileSync(INV, 'utf8'));

const authors = fs.readFileSync(path.join(__dirname, 'cfl-authors.txt'), 'utf8')
  .split('\n').map(s => s.replace(/#.*$/, '').trim()).filter(Boolean)
  .map(name => ({ name, key: gate.personKey(name) }));

const others = gate.othersFor('__all__');
const isShipped = (text) => { const n = gate.normText(text); return others.some(o => o.norms.has(n)); };
const opensLikeShipped = (text) => { const h = gate.normText(text).slice(0, 40); return others.some(o => o.heads.has(h)); };

const kept = [], byAuthor = {};
let considered = 0, wrongClass = 0, notListed = 0, shipped = 0, near = 0;
for (const rec of inventory) {
  considered++;
  if (rec.class !== 'named-person' && rec.class !== 'named-person-with-work') { wrongClass++; continue; }
  const key = gate.personKey(rec.author);
  const hit = authors.find(a => gate.samePerson(a.key, key));
  if (!hit) { notListed++; continue; }
  if (isShipped(rec.text)) { shipped++; continue; }
  const flag = opensLikeShipped(rec.text);
  if (flag) near++;
  kept.push({ cflId: rec.id, key: rec.carriers, book: rec.book, subject: rec.subject, text: rec.text, author: rec.author, class: rec.class, listedAs: hit.name, opensLikeShipped: flag });
  byAuthor[hit.name] = (byAuthor[hit.name] || 0) + 1;
}

const out = {
  _readme: 'Candidates only. Every line is verified from a real edition before it can land; the CFL attribution is the starting claim, not evidence. Text is as CFL has it (no terminal period; curly quotes).',
  builtFrom: INV, inventoryRecords: inventory.length, candidates: kept
};
fs.mkdirSync(path.join(__dirname, 'work'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'work', 'cfl-candidates.json'), JSON.stringify(out, null, 1) + '\n');

console.log(`inventory ${considered}: ${wrongClass} not a named person, ${notListed} author not on the list, ${shipped} already shipped, ${kept.length} candidates (${near} open like a shipped line)`);
console.log('by author: ' + Object.entries(byAuthor).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} ${n}`).join(', '));
