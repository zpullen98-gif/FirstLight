/* Apply citation-audit corrections to js/data-year.js.

   AUTHORING TOOL. Run by hand; output committed.

   This edits the author's book, so it is deliberately paranoid: every correction
   names the exact source string it expects to replace, and the script aborts without
   writing anything if a single expectation does not match. A silent partial apply
   would be far worse than a failure — you would not know which days had been touched.

   Entries become [day, quote, source, tradition, note?]. The note is the honest part:
   where a beloved line turns out to be a twentieth-century invention, the almanac
   keeps the line and tells the truth underneath it, rather than either printing a
   false citation or quietly deleting a day the reader may already have kept.

   Usage: node .scripts/apply-citations.js <month>   e.g. 1
*/
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'js', 'data-year.js');
const MONTH = parseInt(process.argv[2] || '1', 10);

/* January. Audited against primary texts; 23 of 31 days established so far.
   Days 13-20 were not reached before the run was cut short and are left untouched. */
const CORRECTIONS = { 1: [
  { d: 1,  from: 'Seneca',            to: 'Seneca, Letters 101.10' },
  { d: 2,  from: 'Marcus Aurelius',   to: 'Marcus Aurelius, Meditations 10.16',
    quoteFrom: 'Waste no more time arguing about what a good man should be. Be one.',
    quoteTo:   'Waste no more time arguing what a good man should be. Be one.',
    note: 'Staniforth’s 1964 wording. The stray “about” is how the line travels online.' },
  { d: 3,  from: 'Epictetus',         to: 'Epictetus, Discourses 3.23.1' },
  { d: 4,  from: 'Marcus Aurelius',   to: 'Elbert Hubbard, The Fra, 1914',
    note: 'Carried under Marcus Aurelius for a century. It is nowhere in the Meditations; the words are Hubbard’s.' },
  { d: 5,  from: 'Epictetus',         to: 'Attributed to Epictetus',
    note: 'Survives only as Fragment 35, which modern editors class among the doubtful and spurious. For the same thought with a real source, see Discourses 4.1.' },
  { d: 6,  from: 'Seneca',            to: 'Seneca, On the Shortness of Life 1.3' },
  { d: 7,  from: 'Marcus Aurelius',   to: 'Marcus Aurelius, Meditations 7.29' },
  { d: 8,  from: 'Zeno of Citium',    to: 'Attributed to Zeno of Citium',
    note: 'Found in no ancient source; it appears online from about 2015. The idea is Plato’s — Laws 626e, that the first and best victory is to conquer oneself.' },
  { d: 9,  from: 'Seneca',            to: 'Seneca, Letters 13.4' },
  { d: 10, from: 'Marcus Aurelius',   to: 'Marcus Aurelius, Meditations 5.20',
    note: 'The epigram is Gregory Hays’s 2002 compression; no earlier translation reads anything like it.' },
  { d: 11, from: 'Epictetus',         to: 'Epictetus, Discourses 1.1.17' },
  { d: 12, from: 'Seneca',            to: 'Anonymous, in print by 1912',
    note: 'Circulates as Seneca and is not his. An American maxim from The Youth’s Companion, retrofitted onto him in the late 1990s.' },

  { d: 21, from: 'Seneca',            to: 'Seneca, Letters 76.3' },
  { d: 22, from: 'Marcus Aurelius',   to: 'Marcus Aurelius, Meditations 2.5' },
  { d: 23, from: 'Epictetus',         to: 'James Allen, As a Man Thinketh, 1903',
    note: 'Not Epictetus. Compare Discourses 1.24.1 — difficulties show what men are to others; the turn inward is Allen’s.' },
  { d: 24, from: 'Seneca',            to: 'After Seneca, Letters 85.24',
    note: 'Seneca’s brave man is free from fear, not free as such. The short form gains a meaning the Latin does not carry.' },
  { d: 25, from: 'Marcus Aurelius',   to: 'Marcus Aurelius, Meditations 5.16' },
  { d: 26, from: 'Epictetus',         to: 'Epictetus, Discourses 1.15.7' },
  { d: 27, from: 'Seneca',            to: 'After Seneca, On Anger 3.36',
    note: 'Seneca reports this as the nightly practice of his teacher Sextius. The wording is a modern compression, not a translation.' },
  { d: 28, from: 'Marcus Aurelius',   to: 'Marcus Aurelius, Meditations 12.17' },
  { d: 29, from: 'Epictetus',         to: 'Epictetus, Discourses 3.1.25' },
  { d: 30, from: 'Attributed to Zeno of Citium', to: 'Zeno of Citium, in Diogenes Laertius 7.26',
    note: 'Diogenes adds that others ascribe the saying to Socrates.' },
  { d: 31, from: 'Marcus Aurelius',   to: 'Marcus Aurelius, Meditations 7.49, freely rendered',
    note: '“Empires that rose and fell” is a translator’s flourish; Marcus wrote of changes of dominion.' }
]};

const list = CORRECTIONS[MONTH];
if (!list) { console.error('No corrections recorded for month ' + MONTH); process.exit(1); }

let src = fs.readFileSync(FILE, 'utf8');

/* Locate the month block so a day number cannot match in the wrong month. */
const blockStart = src.indexOf('\n' + MONTH + ':[\n');
if (blockStart < 0) { console.error('Could not find month block ' + MONTH); process.exit(1); }
const blockEnd = src.indexOf('\n],\n', blockStart);
const block = src.slice(blockStart, blockEnd);

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const problems = [];
let out = block;
let changed = 0;

for (const c of list) {
  /* Match the whole entry line for this day: [N,"quote","source","tradition"], */
  const re = new RegExp('^\\[' + c.d + ',("(?:[^"\\\\]|\\\\.)*"),("(?:[^"\\\\]|\\\\.)*"),("(?:[^"\\\\]|\\\\.)*")\\],$', 'm');
  const m = out.match(re);
  if (!m) { problems.push('day ' + c.d + ': entry line not found (already corrected?)'); continue; }

  const quote = JSON.parse(m[1]);
  const source = JSON.parse(m[2]);
  const tradition = JSON.parse(m[3]);

  if (source !== c.from) {
    problems.push('day ' + c.d + ': expected source "' + c.from + '" but found "' + source + '"');
    continue;
  }
  if (c.quoteFrom && quote !== c.quoteFrom) {
    problems.push('day ' + c.d + ': expected quote to start "' + c.quoteFrom.slice(0, 40) + '…"');
    continue;
  }

  const newQuote = c.quoteTo || quote;
  const parts = [c.d, JSON.stringify(newQuote), JSON.stringify(c.to), JSON.stringify(tradition)];
  if (c.note) parts.push(JSON.stringify(c.note));
  out = out.replace(re, '[' + parts.join(',') + '],');
  changed++;
}

if (problems.length) {
  console.error('\nRefusing to write — ' + problems.length + ' expectation(s) did not match:');
  problems.forEach(p => console.error('  ' + p));
  process.exit(1);
}

fs.writeFileSync(FILE, src.slice(0, blockStart) + out + src.slice(blockEnd), 'utf8');
console.log('  month ' + MONTH + ': ' + changed + ' entries corrected, ' +
            list.filter(c => c.note).length + ' carrying a provenance note.');
