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

  { d: 13, from: 'Marcus Aurelius',   to: 'Attributed to Marcus Aurelius',
    note: 'Not in the Meditations, in any translation, and traceable in print only to 2006. It welds Epictetus’s dichotomy of control to Marcus’s doctrine that distress comes from judgement, which is why it passes. For the real thing see Meditations 12.22.' },
  { d: 14, from: 'Epictetus',         to: 'Attributed to Epictetus',
    note: 'Absent from the whole surviving corpus. The wording is Joseph Brotherton’s, in the Commons in 1842, itself reported as an echo of Epicurus. The thought is Epictetan; the words are not.' },
  { d: 15, from: 'Seneca',            to: 'After Seneca, Letters 1.2',
    note: 'Gummere has “While we are postponing, life speeds by” — dum differtur vita transcurrit. Life rushes past while things are deferred, which is not quite the same as waiting for it.' },
  { d: 16, from: 'Marcus Aurelius',   to: 'After Marcus Aurelius, Meditations 6.6',
    note: 'The passage is genuine and one sentence long in the Greek, but this English is no published translator’s. Long: “the best way of avenging thyself is not to become like the wrong-doer.”' },
  { d: 17, from: 'Epictetus',         to: 'Epictetus, Discourses 1.24.1' },
  { d: 18, from: 'Seneca',            to: 'Attributed to Seneca',
    note: 'No Latin original is known, and it appears in none of the 124 letters. Its origin has not been traced.' },
  { d: 19, from: 'Marcus Aurelius',   to: 'After Marcus Aurelius, Meditations 7.67',
    quoteFrom: 'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.',
    quoteTo:   'Very little is needed to make a happy life.',
    note: 'The first clause is Marcus. The rest — “it is all within yourself, in your way of thinking” — is a modern gloss, absent from the Greek and from every standard translation.' },
  { d: 20, from: 'Epictetus',         to: 'Epictetus, Discourses 2.1.22',
    note: 'An elided variant rather than a translator’s sentence; Long has “the educated only are free.”' },

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
],

/* February. These entries arrived WITH references, so the work was checking whether
   the reference says what it is claimed to. Healthier than January — eighteen stood —
   but the failures are subtler: a section number off by two books, hedges pitched at
   the wrong strength in both directions, and two cases where a trimmed quotation
   quietly destroys the argument it was trimmed from. */
2: [
  { d: 2,  from: 'Marcus Aurelius, Meditations 7.13', to: 'After Marcus Aurelius, Meditations 9.23',
    note: 'The passage is at 9.23, not 7.13. Long has “let every act of thine be a component part of social life” — a claim about membership, where “be of benefit to the whole” makes it one about usefulness.' },
  { d: 3,  from: 'Seneca, De Vita Beata', to: 'Seneca, De Vita Beata 24.3' },
  { d: 4,  from: 'Laozi, Tao Te Ching 67', to: 'Laozi, Tao Te Ching 67',
    note: 'The third treasure is 不敢為天下先 — not daring to be first in the world. “Humility” compresses a refusal into a virtue, and the chapter’s argument runs on the refusal.' },
  { d: 7,  from: 'Chinese proverb', to: 'Chinese proverb, from the Zengguang Xianwen',
    note: 'A Ming-dynasty primer, not a floating saying. 三冬 is the three months of one winter rather than three winters — the English is the standard rendering, but it counts wrong.' },
  { d: 8,  from: 'Proverb', to: 'Source unknown', tradTo: 'Wisdom',
    note: 'Calling this a proverb claims a traditional pedigree it does not have. No source of any age has been found for it.' },
  { d: 9,  from: 'Confucius, Analects 15.24', to: 'Confucius, Analects 15.24',
    note: 'Legge numbers this passage 15.23; 15.24 is the modern scheme used by Lau, Slingerland and the Chinese Text Project.' },
  { d: 11, from: 'Publilius Syrus, Sentences', to: 'Source unknown', tradTo: 'Wisdom',
    note: 'Not found in the Sententiae. Syrus does have a maxim close to it — semper beatam se putat benignitas, “kindness always thinks itself happy” — but it is not this sentence.' },
  { d: 12, from: 'Aesop, Fables tradition', to: 'Aesop, The Lion and the Mouse',
    note: 'The fable is real and identifiable, but this wording comes from The Aesop for Children, 1919, whose moral runs “A kindness is never wasted.”' },
  { d: 13, from: 'Publilius Syrus, Sentences', to: 'Attributed to Publilius Syrus',
    note: 'The line is internally incoherent — it enriches “you” more than it costs “the giver”, making one person both parties, which is the fingerprint of a corrupted quotation. Syrus wrote: beneficium dando accepit, qui digno dedit — he who gave to a worthy man received by the giving.' },
  { d: 14, from: 'Laozi, Tao Te Ching 8', to: 'Laozi, Tao Te Ching 8' },
  { d: 15, from: 'Aristotle, Nicomachean Ethics', to: 'After Aristotle, Nicomachean Ethics 1109a26',
    note: 'The passage is Aristotle’s, but the circulating English has been edited twice over and matches no published translation. Ross also has him listing giving and spending money alongside anger.' },
  { d: 16, from: 'Confucius, Analects 1.6', to: 'Confucius, Analects 1.6' },
  { d: 17, from: 'Seneca, Letters 11', to: 'Seneca, Letters 11.8' },
  { d: 18, from: 'Zhuangzi, Inner Chapters', to: 'Zhuangzi, Inner Chapters 1' },
  { d: 19, from: 'Attributed to Laozi', to: 'Author unknown', tradTo: 'Wisdom',
    note: 'Not from the Tao Te Ching and not Laozi’s. “Attributed to” was too generous — the attribution is not contested but false, traceable to a twentieth-century anthology. The Taoist tag went with the name.' },
  { d: 20, from: 'Marcus Aurelius, Meditations 7.73', to: 'Marcus Aurelius, Meditations 7.73' },
  { d: 22, from: 'Laozi, Tao Te Ching 63', to: 'After Laozi, Tao Te Ching 63',
    note: 'Legge’s clause is simply “recompense injury with kindness”. The added praise for excellent virtue is not in the chapter, and it happens to endorse the exact position Confucius rejects at Analects 14.34.' },
  { d: 23, from: 'Epictetus, Enchiridion 5', to: 'Epictetus, Enchiridion 5',
    quoteFrom: 'It is the act of an ill-instructed man to blame others for his own bad condition; the wise man blames neither others nor himself.',
    quoteTo:   'It is the act of an ill-instructed man to blame others for his own bad condition; it is the act of one who has begun to be instructed, to lay the blame on himself; and of one whose instruction is completed, neither to blame another, nor himself.',
    note: 'The middle stage was missing. Epictetus describes a progression — blame others, then blame yourself, then blame no one — and cutting the second step turns a course of training into a contrast between the ignorant and the wise.' },
  { d: 24, from: 'Confucius, Analects 6.30', to: 'Confucius, Analects 6.30',
    note: 'Legge numbers this 6.28; 6.30 is the modern scheme.' },
  { d: 27, from: 'Marcus Aurelius, Meditations 11', to: 'After Marcus Aurelius, Meditations 11.18',
    note: 'The eighth of the ten thoughts Marcus sets down against anger. The wording is a compression rather than any translator’s sentence.' }
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

const S = '("(?:[^"\\\\]|\\\\.)*")';   // one JSON string literal
let already = 0;

for (const c of list) {
  /* Entries are four elements, or five once a provenance note has been added, so
     match both. Re-running this script must be safe: it is the normal way to apply a
     later batch to a month that is already partly corrected. */
  const re = new RegExp('^\\[' + c.d + ',' + S + ',' + S + ',' + S + '(?:,' + S + ')?\\],$', 'm');
  const m = out.match(re);
  if (!m) { problems.push('day ' + c.d + ': entry line not found or malformed'); continue; }

  const quote = JSON.parse(m[1]);
  const source = JSON.parse(m[2]);
  const tradition = JSON.parse(m[3]);
  const existingNote = m[4] ? JSON.parse(m[4]) : '';

  /* Already at the target — this batch has been applied before. Not an error.

     Every field has to be checked, not just the source. Many corrections leave the
     attribution alone and add only a provenance note, or restore a truncated
     quotation; testing the source alone silently skipped four February entries,
     including one whose missing middle clause was the entire point of the fix. */
  const atTarget = source === c.to &&
                   existingNote === (c.note || '') &&
                   (!c.quoteTo || quote === c.quoteTo) &&
                   (!c.tradTo || tradition === c.tradTo);
  if (atTarget) { already++; continue; }

  /* An entry mid-correction may already carry the new source while still lacking its
     note, so accept either the original or the target as the starting point. */
  if (source !== c.from && source !== c.to) {
    problems.push('day ' + c.d + ': expected source "' + c.from + '" but found "' + source + '"');
    continue;
  }
  if (c.quoteFrom && quote !== c.quoteFrom) {
    problems.push('day ' + c.d + ': quote does not match the expected wording');
    continue;
  }

  /* The tradition tag sometimes has to move with the attribution. A line shown to be
     no part of the Tao Te Ching goes on asserting a Taoist pedigree if the tag stays
     put, even after the name has been corrected off it. */
  const newQuote = c.quoteTo || quote;
  const newTrad = c.tradTo || tradition;
  const parts = [c.d, JSON.stringify(newQuote), JSON.stringify(c.to), JSON.stringify(newTrad)];
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

console.log('  month ' + MONTH + ': ' + changed + ' corrected, ' + already +
            ' already applied, ' + list.filter(c => c.note).length + ' notes in the batch.');
