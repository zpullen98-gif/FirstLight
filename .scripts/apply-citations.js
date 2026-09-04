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

/* March. The references were largely sound — exactly one points at the wrong
   passage — so the failures moved up a layer into the English: six entries
   reproduce no published translation at all, and seven carried a pedigree that
   was false or overstated. March is the month of the unattributed translation.

   Two rules were written during this month because the file had been applying
   contradictory ones. See SOURCES.md: the tradition tag travels with a name only
   when nothing replaces it, and a shipped quotation is edited only where the
   drift damages meaning AND an attested wording exists to restore. */
3: [
  { d: 1,  from: 'Zengzi, Analects 1.4', to: 'After Zengzi, Analects 1.4',
    note: 'Zengzi asks these as questions about failure rather than naming three virtues, and no translator writes this sentence. The third divides them: Legge and Waley read it as what his teacher handed down, Lau and Slingerland as what he has taught without practising.' },
  { d: 2,  from: 'Confucius', to: 'Author unknown', tradTo: 'Wisdom',
    note: 'Not in the Analects, and no Chinese text of any age has been produced for it. Where the English came from has not been traced. The thought is real enough: Analects 9.19, the mound abandoned one basketful short.' },
  { d: 3,  from: 'Epictetus, Discourses 2.18', to: 'Epictetus, Discourses 2.18.1' },
  { d: 4,  from: 'Attributed to Confucius', to: 'Author unknown', tradTo: 'Wisdom',
    note: 'Not in the Analects, and absent from both standard Victorian collections of Chinese proverbs, Davis 1836 and Scarborough 1875. It circulates as often as a Chinese proverb as under Confucius. The image recalls the Foolish Old Man of the Liezi, who carried the mountain away in baskets.' },
  { d: 5,  from: 'Confucius, Analects 2.17', to: 'Confucius, Analects 2.17',
    note: 'Legge’s wording, lightly compressed. He keeps the Master’s opening address: “Yu, shall I teach you what knowledge is?” — Yu being the disciple Zilu, who is being corrected to his face.' },
  { d: 6,  from: 'Proverb', to: 'Roy L. Smith, Splinters, 1929',
    note: 'Not a proverb. It stands on page 53 of Splinters, Roy L. Smith’s 1929 collection of sentence sermons, under the heading “Discipline”. Contemporary notices call the book assembled as well as written, so his authorship of this line is likely rather than certain.' },
  { d: 7,  from: 'Confucius, Analects 14.29', to: 'Confucius, Analects 14.27',
    note: 'Legge numbers this passage 14.29, and this English is his; 14.27 is the modern scheme used by Lau, Slingerland and the Chinese Text Project.' },
  { d: 8,  from: 'Xunzi 1', to: 'After Xunzi 1, Encouraging Learning',
    note: 'Xunzi’s 輮 is the craftsman’s steam-bending rather than force, and his point is that the curve is permanent: Watson has “even after the wood has dried, it will not straighten out again.” The English here is no translator’s.' },
  { d: 9,  from: 'Confucius, Analects 2.15', to: 'Confucius, Analects 2.15',
    note: 'The English is Arthur Waley’s, 1938. Legge’s 2.15 reads quite differently — “Learning without thought is labour lost; thought without learning is perilous.”' },
  { d: 10, from: 'Marcus Aurelius, Meditations 4.2', to: 'Marcus Aurelius, Meditations 12.20',
    note: 'The passage is at 12.20, not 4.2 — Long’s 4.2 is a different maxim that also turns on purpose, which is likely how the slip happened. Marcus gives a second rule with it: “make thy acts refer to nothing else than to a social end.”' },
  { d: 11, from: 'Chinese proverb', to: 'Chinese proverb',
    note: 'In English as a Chinese proverb since at least 1836, when John Francis Davis printed it among his aphorisms — “nor man perfected without adversity”. The Chinese shape is 玉不琢不成器，人不磨不成道: jade uncut forms no vessel, a man unground attains no way.' },
  { d: 12, from: 'Attributed to Xunzi', to: 'Attributed to Xunzi',
    note: 'A twentieth-century classroom maxim, not a translation of anything. The nearest real text is Xunzi 8, 儒效: not hearing is not as good as hearing, hearing as seeing, seeing as knowing, knowing as doing — five rungs, and no forgetting in any of them.' },
  { d: 13, from: 'Laozi, Tao Te Ching 56', to: 'Laozi, Tao Te Ching 56',
    note: 'Arthur Waley’s 1934 wording, exactly. Legge glosses more heavily — “He who knows (the Tao) does not (care to) speak (about it)” — but the Chinese, 知者不言，言者不知, is as bare as Waley makes it.' },
  { d: 14, from: 'Confucius', to: 'Attributed to Confucius',
    note: 'Not in the Analects: five complete translations contain neither this sentence nor the phrase “real knowledge”. The thought it answers to is 2.17, knowing what you know and admitting what you do not — measuring the extent of one’s ignorance is a Socratic turn Confucius never takes.' },
  { d: 15, from: 'Confucius, Analects 17.2', to: 'Confucius, Analects 17.2',
    quoteFrom: 'The nature of men is always the same; it is their habits that separate them.',
    quoteTo:   'Men’s natures are alike; it is their habits that carry them far apart.',
    note: 'The reference is right; the English had drifted. Lionel Giles (1907) wrote it this way. 性相近 is near to one another, not the same — Confucius stops short of identical natures, and that gap is exactly what Mencius and Xunzi went on to argue about.' },
  { d: 16, from: 'Proverb', to: 'Proverb, from Spurgeon’s The Salt-Cellars, 1889',
    note: 'Gathered by C. H. Spurgeon in The Salt-Cellars, 1889, page 89, with his own gloss: “the snails started early, and by keeping on they entered the ark.” The image is older than the proverb — a Methodist blacksmith’s consolation, in print by 1832.' },
  { d: 17, from: 'Confucius, Analects 9.19', to: 'Confucius, Analects 9.19',
    note: 'Legge numbers this 9.18 — from Book IX chapter VII he runs one behind the modern scheme the almanac follows. The English is no published translation; Lau is nearest: “if, before the very last basketful, I stop, then I shall have stopped.”' },
  { d: 18, from: 'Seneca, Letters 76', to: 'Seneca, Letters 76.6',
    note: 'Seneca’s Latin at 76.6 is nulli sapere casu obtigit. The English is an epigram in circulation rather than any published translation; Gummere’s Loeb renders it “Wisdom comes haphazard to no man”.' },
  { d: 19, from: 'Xunzi, Encouraging Learning', to: 'Xunzi 1, Encouraging Learning',
    note: 'The opening line of the Xunzi’s first chapter, where the text puts it in the mouth of “the gentleman” rather than stating it in Xunzi’s own voice. The wording is Burton Watson’s; Hutton has “Learning must never stop”.' },
  { d: 20, from: 'Epictetus, Discourses 1.18', to: 'Epictetus, Discourses 1.18.18',
    note: 'Higginson’s wording, revising Elizabeth Carter’s 1758 “Exercise yourself, for Heaven’s sake, in little things”; the Greek really does swear by the gods. The little things Epictetus has in view are a headache and an earache.' },
  { d: 21, from: 'Confucius, Analects 1.8', to: 'Confucius, Analects 1.8',
    note: 'One of the four counsels of Analects 1.8; day 31 carries another. All three recur verbatim later in the book, at 9.25 — 9.24 in Legge.' },
  { d: 22, from: 'Chinese proverb', to: 'Chinese proverb, in Journey to the West, chapter 2',
    note: 'The Chinese is 世上無難事，只怕有心人 — the Patriarch’s answer when Wukong protests that cloud-soaring is beyond him. Older forms survive: the Shilin Guangji has 人心自不堅, it is the heart that is not firm. 難事 is a hard thing rather than an impossible one.' },
  { d: 23, from: 'Confucius, Analects 4.11', to: 'Confucius, Analects 4.11',
    note: 'Verbatim Legge, and 4.11 in his numbering and the modern one alike. 懷土 is where translators part company: Legge’s “comfort” glosses a word meaning earth or land, which Muller renders “material things” and Lau “his native land”.' },
  { d: 24, from: 'Marcus Aurelius, Meditations 3.12', to: 'After Marcus Aurelius, Meditations 3.12',
    note: 'Long’s sentence, abridged. He gives three adverbs — “seriously, vigorously, calmly” — and the third, εὐμενῶς, is the one translators dispute: Farquharson has “with kindness”. Marcus also makes the happy life conditional on expecting nothing and fearing nothing.' },
  { d: 25, from: 'Confucius', to: 'Anonymous, in print by 1872',
    quoteFrom: 'Study the past if you would define the future.',
    quoteTo:   'Study the past if you would divine the future.',
    note: 'Not in the Analects, and no Chinese original has ever been produced. The earliest print appearance found is Ballou’s Treasury of Thought, 1872, which sets it under PAST with nothing but the name attached. “Divine” is the nineteenth-century form; “define” is a later drift that turns foreseeing into shaping.' },
  { d: 26, from: 'Proverb', to: 'Ann Voskamp, One Thousand Gifts, 2010',
    note: 'Not a proverb, and not old. It is Ann Voskamp’s own sentence, from One Thousand Gifts, 2010 — a modern devotional book. It appears nowhere in print before it, and no tradition has ever claimed it.' },
  { d: 27, from: 'Epictetus, Enchiridion 5', to: 'Epictetus, Enchiridion 5',
    note: 'Long’s wording with one word added — he has “the opinions about the things”. The possessive belongs to Oldfather’s line, “their judgements”. Epictetus makes it personal himself a few lines on: “that is, our opinions”.' },
  { d: 28, from: 'Confucius, Analects 4.23', to: 'Confucius, Analects 4.23',
    note: 'Legge’s phrasing. 約 is self-restraint, or holding to essentials, rather than caution about risk — Waley has “Those who err on the side of strictness are few indeed”.' },
  { d: 30, from: 'Confucius, Analects 1.1', to: 'Confucius, Analects 1.1',
    note: 'Legge’s phrasing, and the first of the three questions that open the Analects. 時習 is practice at due times rather than perseverance as such — Waley has “to learn and at due times to repeat what one has learnt”.' },
  { d: 31, from: 'Confucius, Analects 1.8', to: 'Confucius, Analects 1.8',
    note: 'The last of the four counsels in Analects 1.8. The same three counsels recur verbatim later in the book, at 9.25 — 9.24 in Legge.' }
],

/* September. One repair only, pending that month’s own audit: day 6 shipped the
   source line “Xunzi, tradition”, where a tradition value had leaked into the
   source field. Reduced to the bare “Xunzi” the rest of the year uses, which
   asserts nothing new; the chapter it needs is September’s work. */
9: [
  { d: 6, from: 'Xunzi, tradition', to: 'Xunzi' }
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
