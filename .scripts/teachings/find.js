/* The Teachings, an agent tool: search a tradition's works for a course's
   key line (or one work, for any plan).

   node .scripts/teachings/find.js <course-<tr> | plan> "<words>" [--limit n]
   node .scripts/teachings/find.js course-jewish "remember sabbath"
   node .scripts/teachings/find.js course-hindu "light shines"
   node .scripts/teachings/find.js course-muslim "forgiv* merciful"
   node .scripts/teachings/find.js course-taoist "/\bwater\b.*\blow/"

   Prints every citable verse (the text, never a note, a commentary, a chant
   or a colophon) that holds EVERY word of the query, whole words in any
   case (a trailing * matches the start of a word), or that matches a
   /regex/; each under its work, the work's day and its reference, which is
   what verse.js and packet.js take next. At most --limit (default 40) are
   printed, with the total. */
'use strict';
const corpus = require('./corpus');

const NAMES = {
  veda: 'the Rig Veda (Griffith)', upanishads: 'the Upanishads (Paramananda)', gita: 'the Bhagavad Gita (Besant)',
  tanakh: 'the Tanakh (JPS 1917)', pali: 'the Dhammapada (Muller)', analects: 'the Analects (Legge)',
  tao: 'the Tao Te Ching (Legge)', zhuangzi: 'the Zhuangzi (Giles)', bible: 'the Bible (World English Bible)',
  quran: 'the Qur’an (Pickthall)'
};

const argv = process.argv.slice(2);
const [plan, query] = argv;
const li = argv.indexOf('--limit'), limit = li > -1 ? Math.max(1, +argv[li + 1] || 40) : 40;
if (!plan || !query) { console.error('usage: node .scripts/teachings/find.js <course-<tr> | plan> "<words or /regex/>" [--limit n]'); process.exit(1); }
const works = corpus.isCourse(plan) ? corpus.courseWorks(plan) : [plan];
const r = corpus.searchUnits(works, query, limit);
console.log('In ' + works.map(w => NAMES[w] || w).join(', ') + ': ' + r.total + ' verse' + (r.total === 1 ? '' : 's') +
  (r.total > r.hits.length ? ', the first ' + r.hits.length + ' printed (narrow the words, or --limit)' : '') + '.\n');
r.hits.forEach(u => {
  const t = u.txt.length > 600 ? u.txt.slice(0, 600) + ' [...]' : u.txt;
  console.log('[' + u.ref + ']  ' + u.plan + ', day ' + u.pd + '\n' + t + '\n');
});
if (corpus.isCourse(plan) && r.hits.length) console.log('Next: read the passage around a line (node .scripts/teachings/day.js <work> <day>), then place it: node .scripts/teachings/verse.js ' + plan + ' <course day> "<the line>"');
