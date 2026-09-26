/* First Light: the almanac calendar and the five reading plans.

   Loads after data-canon.js: it consumes BIBLE_BOOKS, TANAKH_BOOKS, JUZ,
   SURAH_AYAHS, JUZ_START, DHP_CH and RV_MANDALAS, and builds the 366-day plans
   plus HALL_YEARS from them.

   --- THE DAY-OF-YEAR RULE ---
   The artifact computed the day of the year two different ways. `doyOf()` used a
   fixed table with February pinned at 29; `renderToday()` used the real calendar.
   In a common year these disagree by one from March onward, so the rotating
   reflection drifted out of step with the five canon readings for ten months.

   This file settles it: the fixed 366-slot table is the only one, and every
   caller uses it.

   That is a deliberate choice, not a convenience. The almanac is dated: the
   first of January is Seneca every year, and it would be a poor almanac if a
   given date drew a different voice depending on the year. A fixed table
   guarantees date → voice is permanent. The cost is that in a common year slot 60
   is never reached, so the leap-day voice appears once in four years. That is the
   right cost: the artifact's own subtitle promises "366 voices, one for every day
   of the year, including the leap day", and a voice reserved for the twenty-ninth
   of February should be rare. */

var MLEN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function doyOf(m, d) {
  var s = 0;
  for (var i = 0; i < m - 1; i++) s += MLEN[i];
  return s + d;
}
function doyToday() {
  /* the shift clock: at 2am a closer is still on the day they are closing */
  var n = flShiftedNow();
  return doyOf(n.getMonth() + 1, n.getDate());
}
/* Inverse, for the year heatmap and for any view that walks slots rather than dates. */
function doyToMD(doy) {
  var m = 0;
  while (m < 12 && doy > MLEN[m]) { doy -= MLEN[m]; m++; }
  return [m + 1, doy];
}
function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
/* True when this slot has no date in the given year: slot 60 outside a leap year. */
function doySkipped(doy, y) { return doy === 60 && !isLeap(y === undefined ? new Date().getFullYear() : y); }

/* --- plan construction (verbatim from the artifact) --- */

function chunkPlan(units, daysTotal) {
  var plan = [], i = 0;
  for (var d = 0; d < daysTotal; d++) {
    var remainDays = daysTotal - d, remainUnits = units.length - i;
    var take = Math.ceil(remainUnits / remainDays);
    plan.push(units.slice(i, i + take)); i += take;
  }
  return plan;
}
function bookUnits(books) {
  var u = [];
  books.forEach(function (bk) { for (var c = 1; c <= bk[1]; c++) u.push([bk[0], c]); });
  return u;
}
function rangeLabel(day) {
  var a = day[0], b = day[day.length - 1];
  if (a[0] === b[0]) return a[0] + ' ' + (a[1] === b[1] ? a[1] : a[1] + '–' + b[1]);
  return a[0] + ' ' + a[1] + ', ' + b[0] + ' ' + b[1];
}

var PLAN_BIBLE_UNITS = chunkPlan(bookUnits(BIBLE_BOOKS), 366);
var PLAN_BIBLE = PLAN_BIBLE_UNITS.map(rangeLabel);
var PLAN_TANAKH_UNITS = chunkPlan(bookUnits(TANAKH_BOOKS), 366);
var PLAN_TANAKH = PLAN_TANAKH_UNITS.map(rangeLabel);

/* The Tanakh counts several books as one; map each composite to its fetchable parts.
   Note the chapter counts follow Jewish numbering (Joel 4, Malachi 3), which is why
   they differ from the same books in BIBLE_BOOKS (Joel 3, Malachi 4). That is not a
   typo in either list: the two canons genuinely divide those books differently. */
var TANAKH_PARTS = {
  'Samuel': [['I Samuel', 31], ['II Samuel', 24]],
  'Kings': [['I Kings', 22], ['II Kings', 25]],
  'Chronicles': [['I Chronicles', 29], ['II Chronicles', 36]],
  'Ezra–Nehemiah': [['Ezra', 10], ['Nehemiah', 13]],
  'The Twelve': [['Hosea', 14], ['Joel', 4], ['Amos', 9], ['Obadiah', 1], ['Jonah', 4], ['Micah', 7],
                 ['Nahum', 3], ['Habakkuk', 3], ['Zephaniah', 3], ['Haggai', 2], ['Zechariah', 14], ['Malachi', 3]]
};
function resolveTanakh(book, ch) {
  var parts = TANAKH_PARTS[book];
  if (!parts) return [book, ch];
  var n = ch;
  for (var i = 0; i < parts.length; i++) {
    if (n <= parts[i][1]) return [parts[i][0], n];
    n -= parts[i][1];
  }
  return [book, ch];
}

var PLAN_QURAN_UNITS = (function () {
  /* flatten (surah,ayah) pairs from a start point up to (not including) an end point */
  function flatten(fromS, fromA, toS, toA) {   // toS/toA null means "to the end"
    var u = [], s = fromS, a = fromA;
    for (;;) {
      if (toS !== null && (s > toS || (s === toS && a >= toA))) break;
      if (s > 114) break;
      u.push([s, a]);
      a++;
      if (a > SURAH_AYAHS[s - 1]) { s++; a = 1; }
    }
    return u;
  }
  var allDays = [];
  for (var j = 0; j < 30; j++) {
    var fs = JUZ_START[j][0], fa = JUZ_START[j][1];
    var next = j < 29 ? JUZ_START[j + 1] : null;
    var units = flatten(fs, fa, next ? next[0] : null, next ? next[1] : null);
    /* 6 juz' of 13 days + 24 of 12 = 366 exactly. */
    var dayCount = 12 + (j < 6 ? 1 : 0);
    chunkPlan(units, dayCount).forEach(function (c) { allDays.push(c); });
  }
  return allDays;
})();

var PLAN_QURAN = (function () {
  var p = [];
  for (var j = 0; j < 30; j++) {
    var days = 12 + (j < 6 ? 1 : 0);
    for (var k = 1; k <= days; k++) {
      p.push('Juz’ ' + (j + 1) + ': begins at ' + JUZ[j] + '  ·  day ' + k + ' of ' + days);
    }
  }
  return p;
})();

var DHP_CHAPTER_OF = function (v) {
  for (var i = 0; i < DHP_CH.length; i++) if (v <= DHP_CH[i][1]) return DHP_CH[i][0];
  return '';
};
var PLAN_PALI_UNITS = (function () {
  var u = [];
  for (var v = 1; v <= 423; v++) u.push(v);
  return chunkPlan(u, 366);
})();
var PLAN_PALI = PLAN_PALI_UNITS.map(function (day) {
  var a = day[0], b = day[day.length - 1];
  return 'Dhammapada ' + (a === b ? ('v. ' + a) : ('vv. ' + a + '–' + b)) + '  ·  ' + DHP_CHAPTER_OF(a);
});

var PLAN_VEDA_UNITS = (function () {
  var u = [];
  RV_MANDALAS.forEach(function (n, m) { for (var h = 1; h <= n; h++) u.push([m + 1, h]); });
  return chunkPlan(u, 366);
})();
var PLAN_VEDA = PLAN_VEDA_UNITS.map(function (day) {
  var a = day[0], b = day[day.length - 1];
  if (a[0] === b[0]) return 'Rig Veda, Mandala ' + a[0] + ', Hymn' + (a[1] === b[1] ? ' ' + a[1] : 's ' + a[1] + '–' + b[1]);
  return 'Rig Veda, Mandala ' + a[0] + ' Hymn ' + a[1] + ', Mandala ' + b[0] + ' Hymn ' + b[1];
});

/* --- the five canons ---
   [id, name, subtitle, planDescription, plan[], epigraph, epigraphSource, blurb, teachings] */
var HALL_YEARS = [
 ['bible', 'The Bible', 'The Christian Scriptures',
  'Whole Bible in a year: all 1,189 chapters, Genesis to Revelation, three to four chapters a day.', PLAN_BIBLE,
  'In the beginning was the Word, and the Word was with God, and the Word was God.', 'John 1:1',
  'Two testaments, one arc: creation, covenant, incarnation, and the promised restoration of all things.',
  'Incarnation · Grace · Resurrection · the Kingdom of God · Agape'],
 ['quran', 'The Qur’an', 'The Recitation',
  'The thirty ajza’ across the year: each juz’ held for twelve or thirteen days, as the month of Ramadan holds it for one.', PLAN_QURAN,
  'In the name of God, the Most Gracious, the Most Merciful.', 'The Basmala',
  'Revealed over twenty-three years, held whole in living memory by millions.',
  'Tawhid · Prophethood · the Day of Judgment · Rahma · the Straight Path'],
 ['veda', 'The Vedas', 'Śruti: That Which Was Heard',
  'All 1,028 hymns of the Rig Veda in a year: two to three hymns a day through the ten mandalas.', PLAN_VEDA,
  'Truth is one; the wise call it by many names.', 'Rig Veda 1.164.46',
  'The oldest scriptures still in daily use, carried by voice for three millennia, culminating in the Upanishads.',
  'Ṛta · Brahman and Atman · Yajña · Om · the Four Ends of Life'],
 ['pali', 'The Tripiṭaka', 'The Pali Canon',
  'The complete Dhammapada in a year: all 423 verses, one or two a day, chapter by chapter.', PLAN_PALI,
  'Mind precedes all things; mind is their chief, mind is their maker.', 'Dhammapada 1',
  'The Buddha’s teaching as his first hearers preserved it: discipline, discourse, and analysis.',
  'the Four Noble Truths · the Eightfold Path · the Three Marks · Dependent Origination · the Brahmavihāras'],
 ['tanakh', 'The Hebrew Bible', 'Tanakh',
  'The whole Tanakh in a year, all 929 chapters in the traditional order: Torah, Prophets, Writings.', PLAN_TANAKH,
  'Hear, O Israel: the Lord our God, the Lord is one.', 'Deuteronomy 6:4',
  'Teaching, Prophets, and Writings: a covenant carried in a portable homeland of words.',
  'Brit · Torah as Teaching · Tzedek · Teshuvah · Shabbat']
];

function hallById(id) {
  for (var i = 0; i < HALL_YEARS.length; i++) if (HALL_YEARS[i][0] === id) return HALL_YEARS[i];
  return null;
}

/* --- personal reading progress ---
   The artifact locked every plan to the calendar: open the Bible year in August and
   you begin at day 227, with no way to read the first 226 chapters. These helpers
   back the Phase 2 UI, where a canon starts the day you enter it and remembers what
   you actually finished. `start` null means the reader has chosen to follow the
   calendar instead, which stays available on purpose: a shared cycle is the older
   and in some ways better discipline. */
function canonState(id) {
  if (!FL.canon[id]) FL.canon[id] = { start: null, done: {} };
  if (!FL.canon[id].done) FL.canon[id].done = {};
  return FL.canon[id];
}
/* Which slot of the plan is "today" for this reader. */
function canonDoy(id) {
  var st = canonState(id);
  /* Following the shared calendar. A year-long plan maps the day of the year
     straight onto the plan; a short read has fewer days than the year has, so
     the calendar day wraps into it. Everybody following the calendar is still
     on the same chapter on the same date, which is the point of following it. */
  if (!st.start) {
    var len0 = planLength(id);
    var d0 = doyToday();
    return len0 >= 366 ? d0 : ((d0 - 1) % len0) + 1;
  }
  /* start was stamped with the shift-aware flToday(), so "days since" must be
     measured against the same clock, or a plan begun after midnight skips
     Day 1 forever. Math.round, not floor: two local midnights across a DST
     spring-forward differ by 23h and floor silently dropped a day. */
  var n = flShiftedNow();
  var start = new Date(st.start + 'T00:00:00');
  var days = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() - start.getTime()) / 86400000);
  if (days < 0) days = 0;
  return (days % planLength(id)) + 1;   // wraps, so a second time through is a second time, not an overrun
}
function canonProgress(id) {
  var done = canonState(id).done, n = 0;
  for (var k in done) if (Object.prototype.hasOwnProperty.call(done, k)) n++;
  var total = planLength(id);
  return { done: n, total: total, pct: Math.round(n / total * 100) };
}
function canonMarkRead(id, doy, on) {
  var st = canonState(id);
  if (on === false) delete st.done[doy]; else st.done[doy] = 1;
  flSave();
}


/* ═══════════════ the short reads ═══════════════

   Five works that do not need a year. The Tao Te Ching has eighty-one chapters
   and reading one a day is the oldest way anybody has read it; the Gita has
   eighteen; the Analects twenty books; the Zhuangzi thirty-three chapters; the
   Upanishads three. A plan should fit its work rather than stretch to a
   calendar, so these run at their own length and finish. Finishing is the
   point: the five canons above are a discipline, and these are a book you can
   actually get to the end of.

   Units are chapter numbers, one day per chapter, taken from the library's own
   index so a re-bake cannot leave the plan pointing at chapters that moved. */

var SHORT_READS = [
  { id: 'gita',       work: 'gita',       unit: 'Chapter' },
  { id: 'tao',        work: 'tao',        unit: 'Chapter' },
  { id: 'analects',   work: 'analects',   unit: 'Book' },
  { id: 'zhuangzi',   work: 'zhuangzi',   unit: 'Chapter' },
  { id: 'upanishads', work: 'upanishads', unit: '' }
];

var SHORT_UNITS = {};   /* id -> [[chapterNumber], …] one entry per day */
var SHORT_LABEL = {};   /* id -> ['Chapter 1', …] the row the plan page shows */

(function () {
  if (typeof FL_LIBRARY === 'undefined') return;
  SHORT_READS.forEach(function (r) {
    var L = FL_LIBRARY[r.work];
    if (!L || !L.chapters || !L.chapters.length) return;
    SHORT_UNITS[r.id] = L.chapters.map(function (c, i) { return [c.n || (i + 1)]; });
    SHORT_LABEL[r.id] = L.chapters.map(function (c, i) {
      var n = c.n || (i + 1);
      if (c.title) return r.unit ? r.unit + ' ' + n + ' · ' + c.title : c.title;
      return (r.unit || 'Chapter') + ' ' + n;
    });
  });
})();

/* How many days this plan runs. The five canons are a year; a short read is as
   long as the work. Everything that used to hard-code 366 asks this instead. */
function planLength(id) {
  return SHORT_UNITS[id] ? SHORT_UNITS[id].length : 366;
}

/* Appended rather than written inline above, so the five canons keep their
   place at the head of the shelf and nothing reorders under a reader. */
HALL_YEARS = HALL_YEARS.concat([
  ['gita', 'The Bhagavad Gita', 'Krishna and Arjuna, on the field',
   'Eighteen chapters, one a day, the whole dialogue in under three weeks.', SHORT_LABEL.gita || [],
   'On action alone be thy interest, never on its fruits.', 'Bhagavad Gita 2:47',
   'A soldier refuses to fight and is answered with the longest argument in Hinduism about duty, action and the self.',
   'Dharma · Karma yoga · Detachment · The eternal Self'],
  ['tao', 'The Tao Te Ching', 'The way, and its power',
   'Eighty-one chapters, one a day. Short enough to read twice and sit with.', SHORT_LABEL.tao || [],
   'The Tao that can be trodden is not the enduring and unchanging Tao.', 'Tao Te Ching 1',
   'Eighty-one short chapters on yielding, emptiness and the strength of water, and the root text of Taoism.',
   'Wu wei · Yielding · The uncarved block · Simplicity'],
  ['analects', 'The Analects', 'Confucius, as his students remembered him',
   'Twenty books, one a day. Three weeks with the most quoted teacher in history.', SHORT_LABEL.analects || [],
   'Is it not pleasant to learn with a constant perseverance and application?', 'Analects 1:1',
   'Not a treatise but a record: what Confucius said, to whom, and on what occasion, gathered by the people who heard it.',
   'Ren · Li · The gentleman · Filial piety · Rectification of names'],
  ['zhuangzi', 'The Zhuangzi', 'The other Taoist master',
   'Thirty-three chapters, one a day, of the strangest and funniest book in the canon.', SHORT_LABEL.zhuangzi || [],
   'Once upon a time, I dreamt I was a butterfly.', 'Zhuangzi 2',
   'Parables, jokes and arguments against certainty, from a writer who thought Confucius earnest and the Tao Te Ching too solemn.',
   'Spontaneity · The useless tree · Perspective · Free and easy wandering'],
  ['upanishads', 'Three Upanishads', 'Isa, Katha and Kena',
   'Three days, one Upanishad each. The shortest way into the Vedanta.', SHORT_LABEL.upanishads || [],
   'The Self is not to be known through study, nor through the intellect.', 'Katha Upanishad',
   'The end of the Vedas, where ritual gives way to the question of what the Self actually is.',
   'Atman · Brahman · The two selves · Death as teacher']
]);


/* ═══════════════ the Readings: exact days (FL_PLANS) ═══════════════

   js/data-plans.js (generated by .scripts/plans/build-plans.js) divides
   each work into days of about ten minutes, cut only at natural
   boundaries. These functions read it. They stand beside the calendar
   plans above and nothing on screen calls them yet; the screens move over
   in the next commit, when the old plans go.

   planLength(id) above keeps its old meaning (366, or the short work's
   chapter count) for the callers that still use it; the new length is
   planDays(id), and planCount(id) answers for a plan or a course.

   The record is FL.readings[id] = {start, read: {day: 1}, div, carried,
   rounds}, where id is a plan id or 'course-<tradition>'. FL.canon is read
   (to carry old ticks over) and never written.

   Everything here tolerates FL_PLANS being absent: it answers null, 0 or
   an empty list, and never throws at load. */

function planDef(id) {
  if (typeof FL_PLANS === 'undefined' || !FL_PLANS || !FL_PLANS.plans) return null;
  return FL_PLANS.plans[id] || null;
}
/* The number of days in a plan's current division (0 when unknown). */
function planDays(id) {
  var P = planDef(id);
  return P ? P.days.length / 3 : 0;
}
/* Day d (1-based): its first and last atom and its words, or null. */
function planDay(id, d) {
  var P = planDef(id);
  if (!P || !(d >= 1) || d > P.days.length / 3 || d !== Math.floor(d)) return null;
  var k = (d - 1) * 3;
  return { d: d, a0: P.days[k], a1: P.days[k + 1], w: P.days[k + 2] };
}

/* Where each seg starts, cached against the plan object it was built from. */
var PLAN_SEG_START = {};
function planSegStarts(id, P) {
  var c = PLAN_SEG_START[id];
  if (c && c.def === P) return c.starts;
  var starts = [0];
  for (var i = 0; i < P.seg.length; i++) starts.push(starts[i] + P.seg[i][2]);
  PLAN_SEG_START[id] = { def: P, starts: starts };
  return starts;
}
/* Atom a (0-based) of a plan: which seg it is in (s), where in it (k,
   0-based), the seg's shown name and text part, and the atom's own number
   as the labels print it (n; the Zhuangzi's is the paragraph number, the
   Dhammapada's and the Tao Te Ching's run through the whole work). */
function planAtom(id, a) {
  var P = planDef(id);
  if (!P) return null;
  var st = planSegStarts(id, P);
  if (!(a >= 0) || a >= st[st.length - 1] || a !== Math.floor(a)) return null;
  var lo = 0, hi = P.seg.length - 1;
  while (lo < hi) {
    var mid = (lo + hi + 1) >> 1;
    if (st[mid] <= a) lo = mid; else hi = mid - 1;
  }
  var seg = P.seg[lo], k = a - st[lo];
  var n = k + 1;
  if (P.work === 'zhuangzi') n = k + (seg[3] || 1);
  else if (P.work === 'dhammapada' || P.work === 'tao') n = a + 1;
  return { a: a, s: lo, k: k, n: n, name: seg[0], part: seg[1], count: seg[2], extra: seg[3] };
}

/* The exact passage, in words: "Genesis 1 to 3", "An-Nisa 4:94 to 4:147",
   "Surah 18, Al-Kahf", "Rig Veda 1.1 to 1.9", "Katha Upanishad 1.2.1 to
   1.2.12". Always "to" for a range, never a dash. */
function planLabelRange(id, a0, a1) {
  var P = planDef(id);
  if (!P) return '';
  var A = planAtom(id, a0), B = planAtom(id, a1);
  if (!A || !B || a1 < a0) return '';
  var one = a0 === a1, sameSeg = A.s === B.s;
  var wholeA = A.k === 0, wholeB = B.k === B.count - 1;
  var to = function (x, y) { return one ? String(x) : x + ' to ' + y; };
  switch (P.work) {
    case 'bible':
    case 'tanakh':
      var nm = function (X, single) { return (X.name === 'Psalms' && single) ? 'Psalm' : X.name; };
      if (sameSeg) return nm(A, one) + ' ' + to(A.n, B.n);
      return nm(A, true) + ' ' + A.n + ' to ' + nm(B, true) + ' ' + B.n;
    case 'rigveda':
      return 'Rig Veda ' + to((A.s + 1) + '.' + A.n, (B.s + 1) + '.' + B.n);
    case 'quran':
      if (wholeA && wholeB) {
        if (sameSeg) return 'Surah ' + (A.s + 1) + ', ' + A.name;
        return 'Surahs ' + (A.s + 1) + ' to ' + (B.s + 1) + ', ' + A.name + ' to ' + B.name;
      }
      if (sameSeg) return A.name + ' ' + to((A.s + 1) + ':' + A.n, (B.s + 1) + ':' + B.n);
      return A.name + ' ' + (A.s + 1) + ':' + A.n + ' to ' + B.name + ' ' + (B.s + 1) + ':' + B.n;
    case 'dhammapada':
      return 'Dhammapada ' + to(A.n, B.n) + (sameSeg ? ' (' + A.name + ')' : '');
    case 'gita-besant':
      return 'Bhagavad Gita ' + to((A.s + 1) + '.' + A.n, (B.s + 1) + '.' + B.n);
    case 'tao':
      return 'Tao Te Ching ' + to(A.n, B.n);
    case 'analects':
      return 'Analects ' + to((A.s + 1) + '.' + A.n, (B.s + 1) + '.' + B.n);
    case 'zhuangzi':
      if (wholeA && wholeB) return 'Zhuangzi ' + (sameSeg ? String(A.s + 1) : (A.s + 1) + ' to ' + (B.s + 1));
      return 'Zhuangzi ' + to((A.s + 1) + '.' + A.n, (B.s + 1) + '.' + B.n);
    case 'upanishads':
      var ref = function (X) { return (X.extra ? X.extra + '.' : '') + X.n; };
      if (A.name === B.name) return A.name + ' ' + to(ref(A), ref(B));
      return A.name + ' ' + ref(A) + ' to ' + B.name + ' ' + ref(B);
  }
  return '';
}
function planDayLabel(id, d) {
  var day = planDay(id, d);
  return day ? planLabelRange(id, day.a0, day.a1) : '';
}

/* --- the reader's record --- */

function planIsCourse(id) { return String(id).indexOf('course-') === 0; }
/* How many days a plan or a course runs. */
function planCount(id) {
  return planIsCourse(id) ? courseDays(String(id).slice(7)).length : planDays(id);
}
function planState(id) {
  if (!FL.readings || typeof FL.readings !== 'object') FL.readings = {};
  var r = FL.readings[id];
  if (!r || typeof r !== 'object') {
    var P = planDef(id);
    r = FL.readings[id] = { start: null, read: {}, div: P ? P.div : null, carried: {}, rounds: [] };
  }
  if (!r.read || typeof r.read !== 'object') r.read = {};
  if (!r.carried || typeof r.carried !== 'object') r.carried = {};
  if (!Array.isArray(r.rounds)) r.rounds = [];
  if (r.start === undefined) r.start = null;
  return r;
}
/* Today's reading is the first day not yet read: a missed morning waits.
   0 when every day is read. */
function planToday(id) {
  var n = planCount(id), read = planState(id).read;
  for (var d = 1; d <= n; d++) if (!read[d]) return d;
  return 0;
}
/* Only days 1..N count, whatever else an old record holds. */
function planProgress(id) {
  var n = planCount(id), read = planState(id).read, done = 0;
  for (var d = 1; d <= n; d++) if (read[d]) done++;
  return { done: done, total: n, pct: n ? Math.round(done / n * 100) : 0 };
}
/* The first mark is the day the reader began. */
function planMarkRead(id, d, on) {
  var r = planState(id);
  if (on === false) delete r.read[d];
  else {
    r.read[d] = 1;
    if (!r.start) r.start = flToday();
  }
  flSave();
}
/* A finished (or abandoned) run goes into rounds and the plan starts over. */
function planBeginAgain(id) {
  var r = planState(id);
  r.rounds.push({ start: r.start, end: flToday(), n: planProgress(id).done });
  r.read = {};
  r.start = null;
  flSave();
}

/* Which days of the current division a set of marked atoms fully covers. */
function planCovered(P, marked) {
  var out = {};
  for (var k = 0, d = 1; k < P.days.length; k += 3, d++) {
    var all = true;
    for (var a = P.days[k]; a <= P.days[k + 1]; a++) if (!marked[a]) { all = false; break; }
    if (all) out[d] = 1;
  }
  return out;
}
/* Mark the atoms that a set of days covered under an earlier division,
   given as flat pairs (day k covers pairs[2k-2]..pairs[2k-1]). */
function planMarkPairs(pairs, days, marked) {
  for (var key in days) {
    if (!Object.prototype.hasOwnProperty.call(days, key) || !days[key]) continue;
    var d = +key;
    if (!(d >= 1) || d !== Math.floor(d) || d * 2 > pairs.length) continue;
    for (var a = pairs[2 * d - 2]; a <= pairs[2 * d - 1]; a++) marked[a] = 1;
  }
  return marked;
}
/* Carry a reader's ticks into the current division. Idempotent.
   1. A record kept under an earlier division is converted through
      prior[div]: its days' atoms are marked, and the days of the current
      division that those atoms fully cover are read.
   2. The calendar plan's ticks (FL.canon[id].done, old day numbers; keys
      past the old plan's length are ignored) are mapped through
      prior.legacy. Only days newly covered since the last carry are added,
      so a day the reader unticked stays unticked.
   Returns true when the record changed. Does not save: the caller does. */
function planCarry(id) {
  var P = planDef(id);
  if (!P || typeof FL === 'undefined') return false;
  var canon = (FL.canon && FL.canon[id]) || null;
  if (!(FL.readings && FL.readings[id]) && !canon) return false;
  var r = planState(id);
  var was = JSON.stringify(r);
  var prior = P.prior || {};

  if (r.div !== P.div) {
    var map = r.div && prior[r.div];
    if (map) r.read = planCovered(P, planMarkPairs(map, r.read, {}));
    else {
      /* a division this build does not know: keep only what can still mean a day */
      var kept = {}, n0 = P.days.length / 3;
      for (var k0 in r.read) if (/^\d+$/.test(k0) && +k0 >= 1 && +k0 <= n0 && r.read[k0]) kept[+k0] = 1;
      r.read = kept;
    }
    r.div = P.div;
  }

  var legacy = prior.legacy;
  if (legacy) {
    var oldLen = legacy.length / 2, old = {};
    var done = (canon && canon.done) || {};
    for (var key in done) {
      if (!Object.prototype.hasOwnProperty.call(done, key) || !done[key]) continue;
      if (!/^\d+$/.test(key)) continue;
      var od = +key;
      if (od >= 1 && od <= oldLen) old[od] = 1;
    }
    var before = planCovered(P, planMarkPairs(legacy, r.carried, {}));
    var now = planCovered(P, planMarkPairs(legacy, old, {}));
    for (var d in now) if (!before[d]) r.read[d] = 1;
    r.carried = old;
  }
  /* the calendar's start belongs to the first round only: after begin
     again the new round starts on its own first mark */
  if (!r.start && !r.rounds.length && canon && canon.start) r.start = canon.start;
  return JSON.stringify(r) !== was;
}
/* Every plan, at boot and after an import. Returns how many changed. */
function planCarryAll() {
  if (typeof FL_PLANS === 'undefined' || !FL_PLANS || !FL_PLANS.plans) return 0;
  var n = 0;
  for (var id in FL_PLANS.plans) {
    if (Object.prototype.hasOwnProperty.call(FL_PLANS.plans, id) && planCarry(id)) n++;
  }
  return n;
}

/* --- the tradition courses ---
   A course's days come from the chamber itself (FL_TRADITIONS): its
   concepts, then its practices, then its festivals, so each title and gloss
   has one source. */
function courseDays(tr) {
  if (typeof FL_TRADITIONS === 'undefined' || !FL_TRADITIONS) return [];
  var T = null;
  for (var i = 0; i < FL_TRADITIONS.length; i++) if (FL_TRADITIONS[i].id === tr) { T = FL_TRADITIONS[i]; break; }
  if (!T) return [];
  var out = [];
  ['concepts', 'practices', 'festivals'].forEach(function (sec) {
    (T[sec] || []).forEach(function (e, j) {
      out.push({ d: out.length + 1, sec: sec, i: j, title: e[0],
                 when: e.length > 2 ? e[1] : null, gloss: e[e.length - 1] });
    });
  });
  return out;
}
/* A course is shown only once its whole set has landed and validated. */
function courseReady(tr) {
  if (typeof FL_PLANS === 'undefined' || !FL_PLANS || !FL_PLANS.courses) return false;
  var c = FL_PLANS.courses[tr];
  return !!(c && c.n && c.n === courseDays(tr).length);
}
