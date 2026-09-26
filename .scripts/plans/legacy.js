/* The Readings: the old plans, as atom ranges.

   Before the re-division, every plan lived in js/plan.js at commit 9528736:
   five 366-day plans cut by chunkPlan() over unit counts, and five short
   plans of one chapter (book, Upanishad) a day built from the library index.
   Readers' ticks in FL.canon[id].done are old day numbers, so carrying them
   over needs to know exactly which atoms each old day covered.

   The code between the two rules below is copied verbatim from
   git show 9528736:js/plan.js (only its comments are left out). It runs
   against the current data-canon.js, which that commit did not change from,
   and the current data-library.js, whose chapter lists for the five short
   works it did not change either. The gate runs the old file itself as well
   and compares (check 9).

   legacyDays(planId, built) returns [[firstAtom, lastAtom], ...], one per
   old day, where built is atoms.buildAtoms(planId). */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./config');

function loadOld() {
  const canon = fs.readFileSync(path.join(C.ROOT, 'js', 'data-canon.js'), 'utf8');
  const lib = fs.readFileSync(path.join(C.ROOT, 'js', 'data-library.js'), 'utf8');
  /* data-canon.js declares top-level const, which is a lexical global: a
     Function body keeps it in scope for its own return. */
  return new Function(canon + '\n' + lib + '\n' + OLD_SOURCE +
    '\n;return { PLAN_BIBLE_UNITS: PLAN_BIBLE_UNITS, PLAN_TANAKH_UNITS: PLAN_TANAKH_UNITS,' +
    ' PLAN_QURAN_UNITS: PLAN_QURAN_UNITS, PLAN_PALI_UNITS: PLAN_PALI_UNITS,' +
    ' PLAN_VEDA_UNITS: PLAN_VEDA_UNITS, SHORT_UNITS: SHORT_UNITS, resolveTanakh: resolveTanakh };')();
}

/* ======================= verbatim from 9528736:js/plan.js ======================= */
const OLD_SOURCE = String.raw`
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

var PLAN_BIBLE_UNITS = chunkPlan(bookUnits(BIBLE_BOOKS), 366);
var PLAN_TANAKH_UNITS = chunkPlan(bookUnits(TANAKH_BOOKS), 366);

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
  function flatten(fromS, fromA, toS, toA) {
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
    var dayCount = 12 + (j < 6 ? 1 : 0);
    chunkPlan(units, dayCount).forEach(function (c) { allDays.push(c); });
  }
  return allDays;
})();

var PLAN_PALI_UNITS = (function () {
  var u = [];
  for (var v = 1; v <= 423; v++) u.push(v);
  return chunkPlan(u, 366);
})();

var PLAN_VEDA_UNITS = (function () {
  var u = [];
  RV_MANDALAS.forEach(function (n, m) { for (var h = 1; h <= n; h++) u.push([m + 1, h]); });
  return chunkPlan(u, 366);
})();

var SHORT_READS = [
  { id: 'gita',       work: 'gita',       unit: 'Chapter' },
  { id: 'tao',        work: 'tao',        unit: 'Chapter' },
  { id: 'analects',   work: 'analects',   unit: 'Book' },
  { id: 'zhuangzi',   work: 'zhuangzi',   unit: 'Chapter' },
  { id: 'upanishads', work: 'upanishads', unit: '' }
];

var SHORT_UNITS = {};

(function () {
  if (typeof FL_LIBRARY === 'undefined') return;
  SHORT_READS.forEach(function (r) {
    var L = FL_LIBRARY[r.work];
    if (!L || !L.chapters || !L.chapters.length) return;
    SHORT_UNITS[r.id] = L.chapters.map(function (c, i) { return [c.n || (i + 1)]; });
  });
})();
`;
/* ================================================================================ */

/* Map one old plan's units to atom ranges. `old` is what loadOld() returns,
   or the same names read from the old file itself (the gate does that). */
function toAtoms(planId, built, old) {
  const atoms = built.atoms;
  const range = list => {
    let lo = Infinity, hi = -Infinity;
    list.forEach(a => {
      if (a === undefined || a < 0) throw new Error(planId + ': an old unit has no atom');
      if (a < lo) lo = a;
      if (a > hi) hi = a;
    });
    return [lo, hi];
  };
  const byKey = {};
  if (planId === 'bible' || planId === 'tanakh') {
    atoms.forEach((a, i) => { byKey[a.coord.book + '|' + a.coord.ch] = i; });
    const units = planId === 'bible' ? old.PLAN_BIBLE_UNITS : old.PLAN_TANAKH_UNITS;
    return units.map(day => range(day.map(u => {
      const r = planId === 'tanakh' ? old.resolveTanakh(u[0], u[1]) : u;
      return byKey[r[0] + '|' + r[1]];
    })));
  }
  if (planId === 'quran') {
    atoms.forEach((a, i) => { byKey[a.coord.s + '|' + a.coord.a] = i; });
    return old.PLAN_QURAN_UNITS.map(day => range(day.map(u => byKey[u[0] + '|' + u[1]])));
  }
  if (planId === 'veda') {
    atoms.forEach((a, i) => { byKey[a.coord.m + '|' + a.coord.h] = i; });
    return old.PLAN_VEDA_UNITS.map(day => range(day.map(u => byKey[u[0] + '|' + u[1]])));
  }
  if (planId === 'pali') {
    atoms.forEach((a, i) => { byKey[a.coord.v] = i; });
    return old.PLAN_PALI_UNITS.map(day => range(day.map(v => byKey[v])));
  }
  /* The short plans: one old day is one chapter (book, Upanishad) n. The
     Gita's old days were Arnold's chapters, and Arnold's chapter n is
     Besant's chapter n. */
  const units = old.SHORT_UNITS[planId];
  if (!units) throw new Error(planId + ': the old plan has no units');
  const groupOf = a => {
    const c = a.coord;
    if (planId === 'upanishads') return c.up;
    if (planId === 'analects') return c.book;
    return c.ch;
  };
  const upNames = C.UPANISHAD_MAP.map(u => u.name);
  return units.map(day => {
    const n = day[0];
    const key = planId === 'upanishads' ? upNames[n - 1] : n;
    const hits = [];
    atoms.forEach((a, i) => { if (groupOf(a) === key) hits.push(i); });
    if (!hits.length) throw new Error(planId + ': old day for chapter ' + n + ' has no atoms');
    return range(hits);
  });
}

function legacyDays(planId, built) {
  return toAtoms(planId, built, loadOld());
}

module.exports = { legacyDays, toAtoms, loadOld, OLD_SOURCE };
