/* The Readings: per-plan rules for the build and the gate.

   Nothing in .scripts/plans ships. build-plans.js reads js/texts/** through
   atoms.js, divides each work with divide.js and writes js/data-plans.js;
   check-plans.js rebuilds the same atoms and holds the result to the rules.

   Measures: 230 words a minute, so ten minutes is 2,300 words. Long works
   may run to 2,760 (twelve minutes) to reach a natural boundary; the short
   contemplative works never pass 2,300 and never give more than one chapter
   (group) a day. */
'use strict';
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TEXTS = path.join(ROOT, 'js', 'texts');

const TARGET = 2300;
const LONG_MAX = 2760;
const LONG_MIN = 1380;     /* the gate's floor for a long-work day of more than one atom */
const SHORT_MAX = 2300;
const P_MID = 500000;      /* Qur'an: the cost of a day that ends inside a surah */
const MEAN_TOLERANCE = 0.03;

/* The commit whose js/plan.js holds the old 366-day and short plans. */
const LEGACY_COMMIT = '9528736';

/* Shelf order (build-library.js SHELF), which is the order the plans are
   listed in: the least ranked order the app has. */
const PLANS = [
  { id: 'veda',       work: 'rigveda',     unit: 'hymn',      kind: 'long' },
  { id: 'tanakh',     work: 'tanakh',      unit: 'chapter',   kind: 'long' },
  { id: 'upanishads', work: 'upanishads',  unit: 'verse',     kind: 'short' },
  { id: 'pali',       work: 'dhammapada',  unit: 'verse',     kind: 'short', days: 26 },
  { id: 'analects',   work: 'analects',    unit: 'saying',    kind: 'short' },
  { id: 'tao',        work: 'tao',         unit: 'chapter',   kind: 'short', days: 81 },
  { id: 'zhuangzi',   work: 'zhuangzi',    unit: 'paragraph', kind: 'long' },
  { id: 'gita',       work: 'gita-besant', unit: 'verse',     kind: 'short', days: 18 },
  { id: 'bible',      work: 'bible',       unit: 'chapter',   kind: 'long' },
  { id: 'quran',      work: 'quran',       unit: 'ayah',      kind: 'long' }
];
const PLAN_BY_ID = {};
PLANS.forEach(p => { PLAN_BY_ID[p.id] = p; });

/* Surah names as the labels print them: one transliteration, ASCII
   apostrophes, the article joined with a hyphen. */
const SURAH_NAMES = [
  'Al-Fatiha', 'Al-Baqarah', "Al 'Imran", 'An-Nisa', "Al-Ma'idah", "Al-An'am", "Al-A'raf",
  'Al-Anfal', 'At-Tawbah', 'Yunus', 'Hud', 'Yusuf', "Ar-Ra'd", 'Ibrahim', 'Al-Hijr',
  'An-Nahl', 'Al-Isra', 'Al-Kahf', 'Maryam', 'Ta-Ha', 'Al-Anbiya', 'Al-Hajj',
  "Al-Mu'minun", 'An-Nur', 'Al-Furqan', "Ash-Shu'ara", 'An-Naml', 'Al-Qasas',
  "Al-'Ankabut", 'Ar-Rum', 'Luqman', 'As-Sajdah', 'Al-Ahzab', 'Saba', 'Fatir', 'Ya-Sin',
  'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir', 'Fussilat', 'Ash-Shura', 'Az-Zukhruf',
  'Ad-Dukhan', 'Al-Jathiyah', 'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf',
  'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman', "Al-Waqi'ah", 'Al-Hadid',
  'Al-Mujadilah', 'Al-Hashr', 'Al-Mumtahanah', 'As-Saff', "Al-Jumu'ah", 'Al-Munafiqun',
  'At-Taghabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah',
  "Al-Ma'arij", 'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah',
  'Al-Insan', 'Al-Mursalat', 'An-Naba', "An-Nazi'at", "'Abasa", 'At-Takwir', 'Al-Infitar',
  'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj', 'At-Tariq', "Al-A'la", 'Al-Ghashiyah',
  'Al-Fajr', 'Al-Balad', 'Ash-Shams', 'Al-Layl', 'Ad-Duha', 'Ash-Sharh', 'At-Tin',
  "Al-'Alaq", 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', "Al-'Adiyat", "Al-Qari'ah",
  'At-Takathur', "Al-'Asr", 'Al-Humazah', 'Al-Fil', 'Quraysh', "Al-Ma'un", 'Al-Kawthar',
  'Al-Kafirun', 'An-Nasr', 'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas'
];

/* The Tanakh files real books under JPS 1917's Roman numerals; the labels
   print the numbers readers look up. Every other book shows as filed. */
const TANAKH_DISPLAY = {
  'I Samuel': '1 Samuel', 'II Samuel': '2 Samuel',
  'I Kings': '1 Kings', 'II Kings': '2 Kings',
  'I Chronicles': '1 Chronicles', 'II Chronicles': '2 Chronicles'
};
/* The composites of TANAKH_BOOKS (data-canon.js) and the real books under
   them, in order. The gate proves the chapter sums; a label never prints a
   composite name. */
const TANAKH_COMPOSITES = {
  'Samuel': ['I Samuel', 'II Samuel'],
  'Kings': ['I Kings', 'II Kings'],
  'Chronicles': ['I Chronicles', 'II Chronicles'],
  'Ezra–Nehemiah': ['Ezra', 'Nehemiah'],
  'The Twelve': ['Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
                 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi']
};

/* Paramananda's Upanishads, as baked into js/texts/upanishads/all.js.
   entry: index in the payload; from/to: the blocks that belong to this
   Upanishad; exclude: blocks inside that range that are not its text.
   sections: [prefix, verses] in order ('' for the Isa, which has none).

   Isa 57 to 59 is Paramananda's closing essay on the Isa and 60 to 63 his
   introduction to the Katha, filed at the end of the Isa entry by the bake.
   Kena 0 to 2 is his introduction and the title line; Kena 97 to 101 is his
   closing essay, the same kind of matter as Isa 57 to 59, so it is left out
   in the same way (the closing Peace Chant, block 102, stays). */
const UPANISHAD_MAP = [
  { entry: 0, name: 'Isa Upanishad', from: 0, to: 56, exclude: [],
    excludedRanges: [[57, 63]], sections: [['', 18]] },
  { entry: 1, name: 'Katha Upanishad', from: 0, to: 309, exclude: [],
    excludedRanges: [],
    sections: [['1.1', 29], ['1.2', 25], ['1.3', 17], ['2.1', 15], ['2.2', 15], ['2.3', 18]] },
  { entry: 2, name: 'Kena Upanishad', from: 3, to: 102, exclude: [[97, 101]],
    excludedRanges: [[0, 2], [97, 101]], sections: [['1', 8], ['2', 5], ['3', 12], ['4', 9]] }
];
/* Block text that is a heading, not reading: never counted as words. */
const UPANISHAD_HEADING = /^(?:[IVXL]+|Part \w+|Peace Chant|PEACE CHANT|Here ends this Upanishad\.?|[A-Z]+-UPANISHAD|[A-Z][a-z]+-Upanishad)$/;
const UPANISHAD_VERSE_HEADING = /^[IVXL]+$/;
const UPANISHAD_PART_HEADING = /^Part \w+$/;

/* Giles' Zhuangzi: chapter 33 runs on into his index, errata and printer's
   notes from this block; the plan stops before it. */
const ZHUANGZI_BACKMATTER = '_INDEX_';
const ZHUANGZI_TITLES = [
  'Transcendental Bliss', 'The Identity of Contraries', 'Nourishment of the Soul', 'Man Among Men',
  'The Evidence of Virtue Complete', 'The Great Supreme', 'How to Govern', 'Joined Toes',
  "Horses' Hoofs", 'Opening Trunks', 'On Letting Alone', 'The Universe', 'The Tao of God',
  'The Circling Sky', 'Self-Conceit', 'Exercise of Faculties', 'Autumn Floods', 'Perfect Happiness',
  'The Secret of Life', 'Mountain Trees', "T'ien Tzŭ Fang", 'Knowledge Travels North',
  "Kêng Sang Ch'u", 'Hsü Wu Kuei', 'Tsê Yang', 'Contingencies', 'Language',
  'On Declining Power', 'Robber Chê', 'On Swords', 'The Old Fisherman', 'Lieh Tzŭ', 'The Empire'
];

/* The standard verse count of each Gita chapter (700 in all). */
const STANDARD_GITA = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 34, 27, 20, 24, 28, 78];
/* Legge's 499 sayings. The baked payload runs VII.17 into the end of VII.16
   (its Book 7 has 36 chapters where Legge has 37); atoms.js splits a
   chapter at any line that opens with Legge's own "CHAP. <numeral>" and
   numbers the pieces as Legge does, so the labels cite his numbers. */
const ANALECTS_SAYINGS = 499;
const ANALECTS_CHAP = /^CHAP\.\s+([IVXL]+)\.?\s+/;

/* The only atoms that may hold no words. Every other empty atom is a text
   the bake failed to fetch, and the gate fails on it.
     veda  1.179: Griffith leaves the hymn untranslated.
     pali  the second verse of a pair Muller prints as one paragraph
           under one label (58 and 59): its words are counted on the
           first. */
const EMPTY_ATOMS = {
  veda: a => a.coord.m === 1 && a.coord.h === 179,
  pali: a => a.coord.v !== +String(a.coord.para).match(/^\d+/)[0]
};

/* Who a day's teaching may name, per plan (the closed roster; the authoring
   phase may widen it here, never in the teaching files). A course may name
   anyone on any plan's roster. */
const TEACH_ROSTER = {
  bible: ['Augustine', 'John Chrysostom', 'Chrysostom', 'Jerome', 'Gregory the Great', 'Basil',
          'Ambrose', 'Origen', 'Irenaeus', 'Athanasius', 'Cyril of Alexandria', 'Gregory of Nyssa',
          'Gregory of Nazianzus', 'Ephrem', 'Bede', 'Leo the Great', 'Hilary of Poitiers', 'Matthew Henry'],
  tanakh: ['Rashi', 'Ibn Ezra', 'Radak', 'Ramban', 'Sforno', 'Midrash Rabbah', 'the Midrash'],
  quran: ['al-Tabari', 'Ibn Kathir', 'the Jalalayn'],
  veda: ['Sayana', 'Sāyaṇa'],
  pali: ['the Dhammapada commentary', 'Buddhaghosa'],
  gita: ['Shankara', 'Śaṅkara', 'Ramanuja', 'Rāmānuja', 'Madhva'],
  upanishads: ['Shankara', 'Śaṅkara', 'Ramanuja', 'Rāmānuja', 'Madhva'],
  analects: ['Zhu Xi', 'He Yan'],
  tao: ['Wang Bi', 'Heshang Gong'],
  zhuangzi: ['Guo Xiang']
};
/* One person under two spellings, or a longer and a shorter form of one
   name: the key each counts under when the gate asks how many commentators
   a sentence names. */
const TEACH_ALIASES = {
  'Chrysostom': 'John Chrysostom', 'the Midrash': 'Midrash Rabbah',
  'Śaṅkara': 'Shankara', 'Rāmānuja': 'Ramanuja', 'Sāyaṇa': 'Sayana'
};
/* American spellings a teaching sentence may not use (British English). */
const AMERICAN = /\b(honor|honors|honored|honorable|color|colors|favor|favored|favorite|behavior|center|centered|realize|realized|realizes|realizing|recognize|recognized|organize|organized|analyze|analyzed|judgment|fulfill|fulfills|fulfillment|defense|offense|labor|labored|neighbor|neighbors|savior|traveled|traveling|worshiped|worshiping|counseled|splendor|endeavor)\b/i;

module.exports = {
  ROOT, TEXTS, TARGET, LONG_MAX, LONG_MIN, SHORT_MAX, P_MID, MEAN_TOLERANCE, LEGACY_COMMIT,
  PLANS, PLAN_BY_ID, SURAH_NAMES, TANAKH_DISPLAY, TANAKH_COMPOSITES, UPANISHAD_MAP,
  UPANISHAD_HEADING, UPANISHAD_VERSE_HEADING, UPANISHAD_PART_HEADING,
  ZHUANGZI_BACKMATTER, ZHUANGZI_TITLES, STANDARD_GITA, ANALECTS_SAYINGS, ANALECTS_CHAP, EMPTY_ATOMS,
  TEACH_ROSTER, TEACH_ALIASES, AMERICAN
};
