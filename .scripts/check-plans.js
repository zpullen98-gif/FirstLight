/* The Readings gate: what js/data-plans.js, the teachings and the courses
   have to be before they ship.

   Divisions (C1 to C9), rebuilt from the texts and held to the rules:
     C1  atoms rebuilt from js/texts match each plan's seg, and the canon
         counts in data-canon.js (Bible 66 books and 1,189 chapters; Tanakh
         929 chapters summing to its composites; the Qur'an's SURAH_AYAHS;
         the Rig Veda's mandalas; the Dhammapada's chapter ends; the Gita's
         700 standard verses; Legge's 499 sayings, with no "CHAP." heading
         left inside one; no Zhuangzi back matter; the Upanishad verse
         counts, with nothing excluded that holds a verse and every block of
         each Upanishad in exactly one verse or one excluded range; the
         surah names against the payload's own; no atom without words
         except those config.EMPTY_ATOMS allows)
     C2  every atom once, in order, and no empty day
     C3  every stored word count is the recomputed one
     C4  every day ends where a day may end
     C5  long works: 1,380 to 2,760 words a day unless one atom; the mean
         within 3% of 2,300
     C6  short works: no more than 2,300 words unless one atom; one group a
         day; a group of 2,300 or fewer is exactly one day; Tao Te Ching 81,
         Dhammapada 26, Gita 18
     C7  every label (the app's own planLabelRange) parses, under this
         file's own grammar, back to its exact atoms; unique in its plan;
         no "Juz", no composite book, no dash of any kind
     C8  div is the hash of the days and equals the lock; every earlier
         division in the lock has its prior entry
     C9  prior.legacy equals legacy.js AND the old js/plan.js itself, read
         from git (a warning, not a failure, where git is unavailable)
   Migration (C10), through the app's own planCarry: the worked examples,
   computed from the real divisions; idempotence; a day unticked stays
   unticked after a later import; a record under an earlier division
   converts; progress counts days 1..N only; calendar ticks never fill a
   round begun again; two devices' carried ticks joined by an import mark
   what only both together cover; an import joins days read only within
   one read-through; and a randomised property test.
   Teachings (T) and courses (K): a manifest entry exists if and only if the
   file does and the set is complete; see checkTeachings and checkCourses.
   Owner rules (O): nothing of the Readings on Today; the stale promises
   gone; no dash in the Readings' files; no "in a year" once the calendar
   plans are gone from plan.js.

   Usage:
     node .scripts/check-plans.js              run every check (exit 1 on failure)
     node .scripts/check-plans.js --selftest   break every rule on a fixture, expect
                                               each to fail, then run the real data */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const C = require('./plans/config');
const { buildAtoms, words, loadPart } = require('./plans/atoms');
const { divHash } = require('./plans/build-plans');
const legacy = require('./plans/legacy');
const { loadRuntime } = require('./plans/runtime');

const ROOT = C.ROOT;
const rel = p => path.join(ROOT, p);
const EM = String.fromCharCode(0x2014), EN = String.fromCharCode(0x2013), DD = "-" + "-";
/* built from char codes so this file holds no dash of its own. DASH is for
   code files, where a double hyphen can be an operator; TEXT_DASH is for
   authored teaching and course strings, where any double hyphen is a dash
   (Giles writes them unspaced, between two words). */
const DASH = new RegExp(EM + "|&mdash;|&#8212;|&#x2014;| " + DD + " ", "i");
const TEXT_DASH = new RegExp(EM + "|" + DD + "|&mdash;|&#8212;|&#x2014;", "i");
const ANY_DASH = new RegExp(EM + "|" + EN + "|" + DD + "|&mdash;|&ndash;|&#821[12];", "i");

/* ---------------------------------------------------------------- loading */

function loadCanon() {
  const src = fs.readFileSync(rel('js/data-canon.js'), 'utf8');
  return new Function(src + '\n;return { BIBLE_BOOKS, TANAKH_BOOKS, SURAH_AYAHS, DHP_CH, RV_MANDALAS };')();
}
function loadPlansFile() {
  const src = fs.readFileSync(rel('js/data-plans.js'), 'utf8');
  return new Function(src + '\n;return FL_PLANS;')();
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function sha10(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 10); }

/* The old calendar plans, run from the file that shipped them. */
function loadOldFromGit() {
  try {
    const show = f => cp.execSync('git show ' + C.LEGACY_COMMIT + ':' + f,
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    const src = show('js/data-canon.js') + '\n' + show('js/data-library.js') + '\n' +
      'function flShiftedNow() { return new Date(); }\n' + show('js/plan.js');
    return new Function(src + '\n;return { PLAN_BIBLE_UNITS, PLAN_TANAKH_UNITS, PLAN_QURAN_UNITS,' +
      ' PLAN_PALI_UNITS, PLAN_VEDA_UNITS, SHORT_UNITS, resolveTanakh };')();
  } catch (e) { return null; }
}

/* Everything the checks read, from the real repo. */
function realContext() {
  const built = {};
  C.PLANS.forEach(p => { built[p.id] = buildAtoms(p.id); });
  const legacyNew = {}, legacyOld = {};
  const old = loadOldFromGit();
  C.PLANS.forEach(p => {
    legacyNew[p.id] = flatPairs(legacy.legacyDays(p.id, built[p.id]));
    legacyOld[p.id] = old ? flatPairs(legacy.toAtoms(p.id, built[p.id], old)) : null;
  });
  return {
    plans: loadPlansFile(),
    lock: JSON.parse(fs.readFileSync(path.join(__dirname, 'plans', 'divisions.json'), 'utf8')),
    canon: loadCanon(),
    built, legacyNew, legacyOld: old ? legacyOld : null,
    files: ownerFiles(),
    teachFiles: readDir('js/texts/teachings'),
    courseFiles: readDir('js/texts/courses')
  };
}
function flatPairs(list) { const out = []; list.forEach(r => out.push(r[0], r[1])); return out; }
function readDir(d) {
  const out = {};
  const dir = rel(d);
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir).filter(f => f.endsWith('.js')).forEach(f => { out[f.slice(0, -3)] = fs.readFileSync(path.join(dir, f), 'utf8'); });
  return out;
}
function ownerFiles() {
  const out = {};
  ['js/ui-today.js', 'js/data-plans.js', 'js/plan.js', 'js/reading.js', 'js/ui-hall.js', 'index.html']
    .forEach(f => { out[f] = fs.existsSync(rel(f)) ? fs.readFileSync(rel(f), 'utf8') : ''; });
  fs.readdirSync(rel('js')).filter(f => f.endsWith('.js')).forEach(f => {
    const k = 'js/' + f;
    if (!(k in out)) out[k] = fs.readFileSync(rel(k), 'utf8');
  });
  ['js/texts/teachings', 'js/texts/courses'].forEach(d => {
    const files = readDir(d);
    Object.keys(files).forEach(k => { out[d + '/' + k + '.js'] = files[k]; });
  });
  return out;
}

/* ----------------------------------------------------- the gate's grammar
   Its own reading of a label, written without the app's planLabelRange:
   label -> [a0, a1] against the plan's seg, or an Error. */

function segStarts(P) {
  const st = [0];
  P.seg.forEach((s, i) => st.push(st[i] + s[2]));
  return st;
}
function segByName(P, name, extra) {
  for (let i = 0; i < P.seg.length; i++) {
    if (P.seg[i][0] === name && (extra === undefined || String(P.seg[i][3] || '') === extra)) return i;
  }
  return -1;
}
function atomAt(P, st, s, local) {
  if (s < 0 || s >= P.seg.length) throw new Error('no such division ' + (s + 1));
  if (!(local >= 0) || local >= P.seg[s][2]) throw new Error('number out of range in ' + P.seg[s][0]);
  return st[s] + local;
}
function num(x) { if (!/^\d+$/.test(x)) throw new Error('not a number: ' + x); return +x; }

function parseLabel(P, label) {
  const st = segStarts(P);
  const bad = () => { throw new Error('does not parse: "' + label + '"'); };
  let m;
  switch (P.work) {
    case 'bible':
    case 'tanakh': {
      const parts = label.split(' to ');
      if (parts.length > 2) bad();
      let prevSeg = -1;
      const ends = parts.map((p, i) => {
        let mm = p.match(/^(.+) (\d+)$/), s;
        if (mm) {
          const nm = mm[1] === 'Psalm' ? 'Psalms' : mm[1];
          s = segByName(P, nm);
          if (s < 0) throw new Error('unknown book "' + mm[1] + '" in "' + label + '"');
          if (mm[1] === 'Psalms' && parts.length === 1) throw new Error('one psalm is "Psalm": ' + label);
          return atomAt(P, st, s, num(mm[2]) - 1) + (prevSeg = s, 0);
        }
        mm = p.match(/^(\d+)$/);
        if (!mm || i === 0) bad();
        return atomAt(P, st, prevSeg, num(mm[1]) - 1);
      });
      return [ends[0], ends[ends.length - 1]];
    }
    case 'rigveda':
      m = label.match(/^Rig Veda (\d+)\.(\d+)(?: to (\d+)\.(\d+))?$/);
      if (!m) bad();
      return [atomAt(P, st, num(m[1]) - 1, num(m[2]) - 1),
              m[3] ? atomAt(P, st, num(m[3]) - 1, num(m[4]) - 1) : atomAt(P, st, num(m[1]) - 1, num(m[2]) - 1)];
    case 'quran': {
      if ((m = label.match(/^Surah (\d+), (.+)$/))) {
        const s = num(m[1]) - 1;
        if (!P.seg[s] || P.seg[s][0] !== m[2]) throw new Error('surah name mismatch: ' + label);
        return [st[s], st[s + 1] - 1];
      }
      if ((m = label.match(/^Surahs (\d+) to (\d+), (.+) to (.+)$/))) {
        const s0 = num(m[1]) - 1, s1 = num(m[2]) - 1;
        if (!P.seg[s0] || !P.seg[s1] || P.seg[s0][0] !== m[3] || P.seg[s1][0] !== m[4] || s1 <= s0) throw new Error('surah names mismatch: ' + label);
        return [st[s0], st[s1 + 1] - 1];
      }
      const parts = label.split(' to ');
      if (parts.length > 2) bad();
      const ends = parts.map((p, i) => {
        const mm = p.match(/^(?:(.+) )?(\d+):(\d+)$/);
        if (!mm || (i === 0 && !mm[1])) bad();
        const s = num(mm[2]) - 1;
        if (mm[1] !== undefined && (!P.seg[s] || P.seg[s][0] !== mm[1])) throw new Error('surah name mismatch: ' + label);
        return atomAt(P, st, s, num(mm[3]) - 1);
      });
      return [ends[0], ends[ends.length - 1]];
    }
    case 'dhammapada': {
      /* "Dhammapada 90 to 99, The Venerable (Arhat)": the chapter's title
         after a comma when the day is one chapter; no Dhammapada title
         holds a comma, so the first comma is the separator */
      m = label.match(/^Dhammapada (\d+)(?: to (\d+))?(?:, ([^,]+))?$/);
      if (!m) bad();
      const a0 = num(m[1]) - 1, a1 = (m[2] ? num(m[2]) : num(m[1])) - 1;
      const total = st[st.length - 1];
      if (a0 < 0 || a1 >= total) bad();
      const segOf = a => { let s = 0; while (st[s + 1] <= a) s++; return s; };
      const same = segOf(a0) === segOf(a1);
      if (same !== (m[3] !== undefined)) throw new Error('chapter title shown wrongly: ' + label);
      if (same && P.seg[segOf(a0)][0] !== m[3]) throw new Error('chapter title mismatch: ' + label);
      return [a0, a1];
    }
    case 'gita-besant':
    case 'analects': {
      const word = P.work === 'analects' ? 'Analects' : 'Bhagavad Gita';
      m = label.match(new RegExp('^' + word + ' (\\d+)\\.(\\d+)(?: to (\\d+)\\.(\\d+))?$'));
      if (!m) bad();
      const a0 = atomAt(P, st, num(m[1]) - 1, num(m[2]) - 1);
      return [a0, m[3] ? atomAt(P, st, num(m[3]) - 1, num(m[4]) - 1) : a0];
    }
    case 'tao': {
      m = label.match(/^Tao Te Ching (\d+)(?: to (\d+))?$/);
      if (!m) bad();
      const a0 = atomAt(P, st, 0, num(m[1]) - 1);
      return [a0, m[2] ? atomAt(P, st, 0, num(m[2]) - 1) : a0];
    }
    case 'zhuangzi': {
      if ((m = label.match(/^Zhuangzi (\d+)(?: to (\d+))?$/))) {
        const s0 = num(m[1]) - 1, s1 = (m[2] ? num(m[2]) : num(m[1])) - 1;
        if (!P.seg[s0] || !P.seg[s1]) bad();
        return [st[s0], st[s1 + 1] - 1];
      }
      m = label.match(/^Zhuangzi (\d+)\.(\d+)(?: to (\d+)\.(\d+))?$/);
      if (!m) bad();
      const at = (c, p) => { const s = num(c) - 1; if (!P.seg[s]) bad(); return atomAt(P, st, s, num(p) - (P.seg[s][3] || 1)); };
      const a0 = at(m[1], m[2]);
      return [a0, m[3] ? at(m[3], m[4]) : a0];
    }
    case 'upanishads': {
      const parts = label.split(' to ');
      if (parts.length > 2) bad();
      let prevName = null;
      const ends = parts.map((p, i) => {
        const mm = p.match(/^(?:(.+ Upanishad) )?((?:\d+\.)*\d+)$/);
        if (!mm || (i === 0 && !mm[1])) bad();
        const name = mm[1] || prevName;
        prevName = name;
        const nums = mm[2].split('.');
        const v = num(nums.pop());
        const s = segByName(P, name, nums.join('.'));
        if (s < 0) throw new Error('no section "' + name + ' ' + nums.join('.') + '" for "' + label + '"');
        return atomAt(P, st, s, v - 1);
      });
      return [ends[0], ends[ends.length - 1]];
    }
  }
  bad();
}

/* A teaching's reference: one atom, and for a chapter or hymn the verse in
   it. Returns [atom, sub or null]. */
function parseRef(P, ref) {
  const st = segStarts(P);
  let m;
  if (P.work === 'bible' || P.work === 'tanakh') {
    m = ref.match(/^(.+) (\d+):(\d+)$/);
    if (!m) throw new Error('reference does not parse: ' + ref);
    const s = segByName(P, m[1] === 'Psalm' ? 'Psalms' : m[1]);
    if (s < 0) throw new Error('unknown book in ' + ref);
    return [atomAt(P, st, s, num(m[2]) - 1), num(m[3])];
  }
  if (P.work === 'rigveda') {
    m = ref.match(/^Rig Veda (\d+)\.(\d+)\.(\d+)$/);
    if (!m) throw new Error('reference does not parse: ' + ref);
    return [atomAt(P, st, num(m[1]) - 1, num(m[2]) - 1), num(m[3])];
  }
  /* A Dhammapada verse is cited without its chapter's title, and one of
     Muller's pairs, printed as one paragraph on the first verse's atom, as
     "Dhammapada 58 to 59". */
  if (P.work === 'dhammapada') {
    m = ref.match(/^Dhammapada (\d+)(?: to (\d+))?$/);
    if (!m) throw new Error('reference does not parse: ' + ref);
    const a = num(m[1]) - 1, total = st[st.length - 1];
    if (a < 0 || a >= total || (m[2] && num(m[2]) !== num(m[1]) + 1)) throw new Error('reference out of range or not a pair: ' + ref);
    return [a, null];
  }
  const r = parseLabel(P, ref);
  if (r[0] !== r[1]) throw new Error('a reference names one place: ' + ref);
  return [r[0], null];
}

/* ------------------------------------------------------------------ checks */

/* A surah name reduced to what two transliterations share: lower case, no
   diacritics, no article ("Al-", "An-", "Aal-i-"), letters only, one
   spelling for a sound (ai and ay, ee and i, oo, ou and u, dh and d), no
   doubled letter, no closing h after a final a. "Al-Baqarah" meets
   "Al-Baqara" and "Al 'Imran" meets "Aal-i-Imraan"; all 114 stay distinct. */
function surahSkeleton(s) {
  let t = String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  t = t.replace(/^a{1,2}(?:l|[nrstdz]|dh|sh|th)(?:-i)?[- ']+/, '');
  t = t.replace(/[^a-z]/g, '').replace(/ai/g, 'ay').replace(/ee/g, 'i').replace(/oo|ou/g, 'u').replace(/dh/g, 'd');
  return t.replace(/(.)\1+/g, '$1').replace(/ah$/, 'a');
}

function fail(errs, code, plan, msg) { errs.push({ code, plan, msg }); }

function checkDivisions(ctx, opts) {
  opts = opts || {};
  const errs = [], warns = [];
  const plans = ctx.plans;
  const rt = opts.rt || loadRuntime({ plans: plans });
  const label = opts.label || ((id, a0, a1) => rt.planLabelRange(id, a0, a1));
  const ids = Object.keys(plans.plans || {});
  const want = C.PLANS.map(p => p.id);
  if (JSON.stringify(ids) !== JSON.stringify(want)) fail(errs, 'C1', '*', 'plans are ' + ids.join(',') + ', expected ' + want.join(',') + ' (shelf order)');

  for (const cfg of C.PLANS) {
    const id = cfg.id, P = plans.plans[id], B = ctx.built[id];
    if (!P) { fail(errs, 'C1', id, 'missing'); continue; }
    const n = B.atoms.length;

    /* C1: the atoms, and the canon's own counts */
    if (P.work !== cfg.work || P.unit !== cfg.unit) fail(errs, 'C1', id, 'work/unit ' + P.work + '/' + P.unit);
    if (JSON.stringify(P.seg) !== JSON.stringify(B.seg)) fail(errs, 'C1', id, 'seg differs from the atoms rebuilt from js/texts');
    if (B.blocks && JSON.stringify(P.blocks) !== JSON.stringify(B.blocks)) fail(errs, 'C1', id, 'blocks differ from the rebuilt atoms');
    const counts = P.seg.map(s => s[2]);
    const total = counts.reduce((s, x) => s + x, 0);
    const cn = ctx.canon;
    /* an atom with no words is a text the bake failed to fetch, unless the
       edition itself has none there */
    const empty = C.EMPTY_ATOMS[id];
    B.atoms.forEach((a, i) => {
      if (a.w === 0 && !(empty && empty(a))) fail(errs, 'C1', id, 'atom ' + i + ' ' + JSON.stringify(a.coord) + ' has no words');
    });
    if (id === 'bible') {
      if (P.seg.length !== 66 || total !== 1189) fail(errs, 'C1', id, P.seg.length + ' books, ' + total + ' chapters');
      if (JSON.stringify(P.seg.map(s => [s[0], s[2]])) !== JSON.stringify(cn.BIBLE_BOOKS)) fail(errs, 'C1', id, 'books differ from BIBLE_BOOKS');
    }
    if (id === 'tanakh') {
      if (total !== 929) fail(errs, 'C1', id, total + ' chapters');
      const shown = P.seg.map(s => s[0]);
      let k = 0;
      cn.TANAKH_BOOKS.forEach(b => {
        const parts = C.TANAKH_COMPOSITES[b[0]] || [b[0]];
        let sum = 0;
        parts.forEach(pn => {
          const disp = C.TANAKH_DISPLAY[pn] || pn;
          if (shown[k] !== disp) fail(errs, 'C1', id, 'book ' + (k + 1) + ' is ' + shown[k] + ', expected ' + disp);
          sum += counts[k] || 0; k++;
        });
        if (sum !== b[1]) fail(errs, 'C1', id, b[0] + ' sums to ' + sum + ', TANAKH_BOOKS says ' + b[1]);
      });
      if (k !== P.seg.length) fail(errs, 'C1', id, P.seg.length + ' books, the composites resolve to ' + k);
    }
    if (id === 'quran') {
      if (JSON.stringify(counts) !== JSON.stringify(cn.SURAH_AYAHS)) fail(errs, 'C1', id, 'ayah counts differ from SURAH_AYAHS');
      if (JSON.stringify(P.seg.map(s => s[0])) !== JSON.stringify(C.SURAH_NAMES)) fail(errs, 'C1', id, 'surah names differ from SURAH_NAMES');
      /* and against the payload's own transliteration, so two names swapped
         in config.js cannot label every day with the wrong surah */
      const qd = loadPart('quran', 'all');
      P.seg.forEach((s, i) => {
        const pn = qd[i] && qd[i].name;
        if (surahSkeleton(s[0]) !== surahSkeleton(pn)) fail(errs, 'C1', id, 'surah ' + (i + 1) + ' is shown as "' + s[0] + '", the text calls it "' + pn + '"');
      });
    }
    if (id === 'veda' && JSON.stringify(counts) !== JSON.stringify(cn.RV_MANDALAS)) fail(errs, 'C1', id, 'hymn counts differ from RV_MANDALAS');
    if (id === 'pali') {
      let acc = 0;
      const ends = counts.map(c => (acc += c));
      if (JSON.stringify(ends) !== JSON.stringify(cn.DHP_CH.map(c => c[1]))) fail(errs, 'C1', id, 'chapter ends differ from DHP_CH');
      if (total !== 423) fail(errs, 'C1', id, total + ' verses');
    }
    if (id === 'gita' && (JSON.stringify(counts) !== JSON.stringify(C.STANDARD_GITA) || total !== 700)) fail(errs, 'C1', id, 'verse counts differ from the standard 700');
    if (id === 'analects') {
      if (total !== C.ANALECTS_SAYINGS) fail(errs, 'C1', id, total + ' sayings, Legge has ' + C.ANALECTS_SAYINGS);
      /* read straight from the payload: each book's chapters, plus every
         "CHAP." line inside one (a saying the bake ran on) */
      const ad = loadPart('analects', 'all');
      const want = ad.map(bk => bk.ch.reduce((n, c) => {
        const lines = [];
        c.b.forEach(b => b.forEach(l => lines.push(String(l))));
        return n + 1 + lines.filter((l, j) => j > 0 && /^CHAP\.\s/.test(l)).length;
      }, 0));
      if (JSON.stringify(counts) !== JSON.stringify(want)) fail(errs, 'C1', id, 'sayings per book ' + counts.join(',') + ', the payload with its CHAP. lines gives ' + want.join(','));
      B.atoms.forEach(a => { if (a.text().some(l => /^\s*CHAP\./.test(String(l)))) fail(errs, 'C1', id, 'a CHAP. heading inside saying ' + a.coord.book + '.' + a.coord.ch); });
    }
    if (id === 'tao' && total !== 81) fail(errs, 'C1', id, total + ' chapters');
    if (id === 'zhuangzi') {
      B.atoms.forEach(a => { if (a.text().some(l => l.indexOf(C.ZHUANGZI_BACKMATTER) > -1)) fail(errs, 'C1', id, 'back matter in ' + a.coord.ch + '.' + a.coord.p); });
      const last = B.atoms[B.atoms.length - 1];
      if (P.seg.length !== 33 || !(last.coord.ch === 33)) fail(errs, 'C1', id, 'chapter 33 must close the plan');
      const d = loadPart('zhuangzi', 'all');
      const bm = d[32].b.findIndex(b => b.length === 1 && b[0].trim() === C.ZHUANGZI_BACKMATTER);
      if (bm < 0 || P.seg[32][2] !== bm - 1) fail(errs, 'C1', id, 'chapter 33 does not stop before ' + C.ZHUANGZI_BACKMATTER);
    }
    if (id === 'upanishads') {
      const wantU = [18, 29, 25, 17, 15, 15, 18, 8, 5, 12, 9];
      if (JSON.stringify(counts) !== JSON.stringify(wantU)) fail(errs, 'C1', id, 'verse counts ' + counts.join(','));
      const d = loadPart('upanishads', 'all');
      C.UPANISHAD_MAP.forEach(u => u.excludedRanges.forEach(r => {
        for (let k = r[0]; k <= r[1]; k++) {
          const b = d[u.entry].b[k];
          if (b && b.length === 1 && C.UPANISHAD_VERSE_HEADING.test(b[0].trim())) fail(errs, 'C1', id, u.name + ' block ' + k + ' is a verse heading inside an excluded range');
        }
      }));
      if (!P.blocks || P.blocks.length !== total) fail(errs, 'C1', id, 'blocks must hold one entry per verse');
      /* every block of each Upanishad is in exactly one verse or one
         excluded range, and the excluded ranges are exactly what the
         builder's from, to and exclude leave out */
      const upMap = ctx.upMap || C.UPANISHAD_MAP;
      upMap.forEach(u => {
        const len = d[u.entry].b.length;
        const hits = new Array(len).fill(0);
        const mark = (lo, hi) => {
          for (let k = lo; k <= hi; k++) {
            if (k < 0 || k >= len) fail(errs, 'C1', id, u.name + ' block ' + k + ' does not exist');
            else hits[k]++;
          }
        };
        (P.blocks || []).forEach(br => { if (br[0] === u.entry) for (let j = 1; j + 1 < br.length; j += 2) mark(br[j], br[j + 1]); });
        u.excludedRanges.forEach(r => mark(r[0], r[1]));
        const off = [];
        hits.forEach((h, k) => { if (h !== 1) off.push(k + (h ? ' (' + h + ' times)' : ' (none)')); });
        if (off.length) fail(errs, 'C1', id, u.name + ': blocks not tiled exactly once by its verses and excluded ranges: ' + off.slice(0, 8).join(', '));
        const out = [];
        const add = (lo, hi) => {
          if (lo > hi) return;
          const t = out[out.length - 1];
          if (t && t[1] + 1 >= lo) t[1] = Math.max(t[1], hi); else out.push([lo, hi]);
        };
        add(0, u.from - 1);
        u.exclude.slice().sort((x, y) => x[0] - y[0]).forEach(r => add(r[0], r[1]));
        add(u.to + 1, len - 1);
        if (JSON.stringify(out) !== JSON.stringify(u.excludedRanges)) fail(errs, 'C1', id, u.name + ': excludedRanges ' + JSON.stringify(u.excludedRanges) + ', but from, to and exclude leave out ' + JSON.stringify(out));
      });
    }

    /* C2: every atom once, in order, no empty day */
    const days = [];
    if (!Array.isArray(P.days) || P.days.length % 3) { fail(errs, 'C2', id, 'days is not flat triples'); continue; }
    for (let k = 0; k < P.days.length; k += 3) days.push([P.days[k], P.days[k + 1], P.days[k + 2]]);
    let next = 0;
    days.forEach((d, i) => {
      if (d[0] !== next) fail(errs, 'C2', id, 'day ' + (i + 1) + ' starts at atom ' + d[0] + ', expected ' + next);
      if (d[1] < d[0]) fail(errs, 'C2', id, 'day ' + (i + 1) + ' is empty');
      if (!(d[2] > 0)) fail(errs, 'C2', id, 'day ' + (i + 1) + ' has no words');
      next = d[1] + 1;
    });
    if (next !== n) fail(errs, 'C2', id, 'days end at atom ' + (next - 1) + ' of ' + (n - 1));

    /* C3: stored words = recomputed */
    days.forEach((d, i) => {
      let w = 0;
      for (let a = d[0]; a <= d[1] && a < n; a++) w += B.atoms[a].w;
      if (w !== d[2]) fail(errs, 'C3', id, 'day ' + (i + 1) + ' stores ' + d[2] + ' words, the text gives ' + w);
    });

    /* C4: every boundary an allowed cut */
    days.forEach((d, i) => {
      if (d[1] + 1 <= n && !B.cut[d[1] + 1]) fail(errs, 'C4', id, 'day ' + (i + 1) + ' ends where no day may end (after atom ' + d[1] + ')');
    });

    /* C5 / C6 */
    if (cfg.kind === 'long') {
      days.forEach((d, i) => {
        if (d[1] > d[0] && (d[2] < C.LONG_MIN || d[2] > C.LONG_MAX)) fail(errs, 'C5', id, 'day ' + (i + 1) + ' has ' + d[2] + ' words');
      });
      const mean = days.reduce((s, d) => s + d[2], 0) / days.length;
      if (Math.abs(mean - C.TARGET) > C.MEAN_TOLERANCE * C.TARGET) fail(errs, 'C5', id, 'mean ' + mean.toFixed(0) + ' words is outside 3% of ' + C.TARGET);
    } else {
      const gw = {};
      B.atoms.forEach(a => { gw[a.g] = (gw[a.g] || 0) + a.w; });
      days.forEach((d, i) => {
        if (d[1] > d[0] && d[2] > C.SHORT_MAX) fail(errs, 'C6', id, 'day ' + (i + 1) + ' has ' + d[2] + ' words');
        if (d[1] < n && B.atoms[d[0]] && B.atoms[d[1]] && B.atoms[d[0]].g !== B.atoms[d[1]].g) fail(errs, 'C6', id, 'day ' + (i + 1) + ' crosses a chapter');
      });
      Object.keys(gw).forEach(g => {
        if (gw[g] > C.SHORT_MAX) return;
        const idx = B.atoms.map((a, i) => a.g === +g ? i : -1).filter(i => i >= 0);
        const lo = idx[0], hi = idx[idx.length - 1];
        if (!days.some(d => d[0] === lo && d[1] === hi)) fail(errs, 'C6', id, 'group ' + g + ' (' + gw[g] + ' words) is not exactly one day');
      });
      if (cfg.days && days.length !== cfg.days) fail(errs, 'C6', id, days.length + ' days, expected ' + cfg.days);
    }

    /* C7: labels */
    const seen = {};
    const checkLabel = (a0, a1, what) => {
      const L = label(id, a0, a1);
      if (!L) { fail(errs, 'C7', id, what + ' has no label'); return L; }
      if (ANY_DASH.test(L)) fail(errs, 'C7', id, what + ' label has a dash: ' + L);
      if (/Juz/i.test(L)) fail(errs, 'C7', id, what + ' label names a juz: ' + L);
      if (/(?<![12] )\b(Samuel|Kings|Chronicles)\b|Ezra.Nehemiah|The Twelve/.test(L)) fail(errs, 'C7', id, what + ' label names a composite book: ' + L);
      try {
        const r = parseLabel(P, L);
        if (r[0] !== a0 || r[1] !== a1) fail(errs, 'C7', id, what + ' label "' + L + '" parses to ' + r.join('..') + ', not ' + a0 + '..' + a1);
      } catch (e) { fail(errs, 'C7', id, what + ': ' + e.message); }
      return L;
    };
    days.forEach((d, i) => {
      const L = checkLabel(d[0], d[1], 'day ' + (i + 1));
      if (L && seen[L]) fail(errs, 'C7', id, 'label "' + L + '" is used by days ' + seen[L] + ' and ' + (i + 1));
      if (L) seen[L] = i + 1;
    });
    /* the old days' labels too: the journal names old passages through them */
    const lg = (P.prior && P.prior.legacy) || [];
    for (let k = 0; k + 1 < lg.length; k += 2) checkLabel(lg[k], lg[k + 1], 'old day ' + (k / 2 + 1));

    /* C8: the hash and the lock */
    const pairs = [];
    days.forEach(d => pairs.push(d[0], d[1]));
    const h = divHash(P.seg, pairs);
    if (P.div !== h) fail(errs, 'C8', id, 'div ' + P.div + ' is not the hash of its days (' + h + ')');
    const L8 = ctx.lock && ctx.lock.plans && ctx.lock.plans[id];
    if (!L8) fail(errs, 'C8', id, 'not in divisions.json');
    else {
      if (L8.div !== P.div) fail(errs, 'C8', id, 'div ' + P.div + ' differs from the lock ' + L8.div);
      Object.keys(L8.prior || {}).forEach(hh => {
        if (!P.prior || JSON.stringify(P.prior[hh]) !== JSON.stringify(L8.prior[hh])) fail(errs, 'C8', id, 'earlier division ' + hh + ' has no matching prior entry');
      });
    }

    /* C9: the old plan */
    const lgWant = ctx.legacyNew[id];
    if (JSON.stringify(lg) !== JSON.stringify(lgWant)) fail(errs, 'C9', id, 'prior.legacy differs from legacy.js');
    if (ctx.legacyOld) {
      if (JSON.stringify(lg) !== JSON.stringify(ctx.legacyOld[id])) fail(errs, 'C9', id, 'prior.legacy differs from git show ' + C.LEGACY_COMMIT + ':js/plan.js');
    } else if (!warns.includes('git')) warns.push('git');
  }
  return { errs, warns: warns.map(w => w === 'git' ? 'C9: git is unavailable, so prior.legacy was checked against legacy.js only' : w) };
}

/* C10: migration, through the app's own planCarry. Expected values are
   computed here from the divisions and the legacy ranges, not typed. */
function checkMigration(ctx, opts) {
  opts = opts || {};
  const errs = [], notes = [];
  const plans = ctx.plans;
  const rt = loadRuntime({ plans: plans, patch: opts.patch });
  const J = x => JSON.stringify(x);
  const dayList = id => { const P = plans.plans[id], out = []; for (let k = 0; k < P.days.length; k += 3) out.push([P.days[k], P.days[k + 1]]); return out; };
  /* the days of the current division that a set of old days fully covers */
  const cover = (id, oldDays) => {
    const lg = ctx.legacyNew[id], marked = new Set();
    oldDays.forEach(od => { for (let a = lg[2 * od - 2]; a <= lg[2 * od - 1]; a++) marked.add(a); });
    const out = [];
    dayList(id).forEach((d, i) => { let all = true; for (let a = d[0]; a <= d[1]; a++) if (!marked.has(a)) { all = false; break; } if (all) out.push(i + 1); });
    return out;
  };
  const keys = o => Object.keys(o || {}).map(Number).sort((a, b) => a - b);
  const set = list => { const o = {}; list.forEach(k => { o[k] = 1; }); return o; };
  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  const firstMissing = (n, have) => { for (let d = 1; d <= n; d++) if (!have.includes(d)) return d; return 0; };

  try {
    /* Bible: old days 1 to 5 read, begun 2026-03-01 */
    rt.setFL({ canon: { bible: { start: '2026-03-01', done: set(range(1, 5)) } }, readings: {} });
    const nB = plans.plans.bible.days.length / 3;
    if (!rt.planCarry('bible')) fail(errs, 'C10', 'bible', 'planCarry reported no change on a first carry');
    let r = rt.FL.readings.bible, want = cover('bible', range(1, 5));
    if (J(keys(r.read)) !== J(want)) fail(errs, 'C10', 'bible', 'read ' + J(keys(r.read)) + ', expected ' + J(want));
    if (J(keys(r.carried)) !== J(range(1, 5))) fail(errs, 'C10', 'bible', 'carried ' + J(keys(r.carried)));
    if (r.start !== '2026-03-01') fail(errs, 'C10', 'bible', 'start not carried: ' + r.start);
    if (r.div !== plans.plans.bible.div) fail(errs, 'C10', 'bible', 'div not set');
    const tB = rt.planToday('bible');
    if (tB !== firstMissing(nB, want)) fail(errs, 'C10', 'bible', 'today is day ' + tB);
    const pB = rt.planProgress('bible');
    if (pB.done !== want.length || pB.total !== nB) fail(errs, 'C10', 'bible', 'progress ' + J(pB));
    notes.push('Bible, old days 1 to 5: new days ' + J(want) + ' read; today Day ' + tB + ' ' + rt.planDayLabel('bible', tB) + '; Read ' + pB.done + ' of ' + pB.total);
    /* idempotent */
    const snap = J(rt.FL.readings);
    if (rt.planCarry('bible') || J(rt.FL.readings) !== snap) fail(errs, 'C10', 'bible', 'a second carry changed the record');
    /* the reader unticks a day, then an import brings old days 6 and 7 */
    const untick = want.length >= 3 ? want[2] : want[0];
    rt.planMarkRead('bible', untick, false);
    rt.FL.canon.bible.done[6] = 1; rt.FL.canon.bible.done[7] = 1;
    rt.planCarry('bible');
    r = rt.FL.readings.bible;
    const before = cover('bible', range(1, 5)), after = cover('bible', range(1, 7));
    const wantAfter = after.filter(d => d !== untick);
    if (J(keys(r.read)) !== J(wantAfter)) fail(errs, 'C10', 'bible', 'after the import read ' + J(keys(r.read)) + ', expected ' + J(wantAfter));
    if (r.read[untick]) fail(errs, 'C10', 'bible', 'day ' + untick + ', unticked by the reader, was ticked again by an import');
    notes.push('Bible, import of old days 6 and 7: newly covered ' + J(after.filter(d => !before.includes(d))) + ' added; day ' + untick + ' (unticked) stays unticked');
    if (rt.planCarry('bible')) fail(errs, 'C10', 'bible', 'a carry after the import was not idempotent');

    /* Qur'an: old days 1 to 8, no start */
    rt.setFL({ canon: { quran: { start: null, done: set(range(1, 8)) } }, readings: {} });
    rt.planCarry('quran');
    r = rt.FL.readings.quran; want = cover('quran', range(1, 8));
    if (J(keys(r.read)) !== J(want)) fail(errs, 'C10', 'quran', 'read ' + J(keys(r.read)) + ', expected ' + J(want));
    if (r.start !== null) fail(errs, 'C10', 'quran', 'start should stay empty, is ' + r.start);
    const tQ = rt.planToday('quran');
    if (tQ !== firstMissing(plans.plans.quran.days.length / 3, want)) fail(errs, 'C10', 'quran', 'today is day ' + tQ);
    notes.push("Qur'an, old days 1 to 8: new days " + J(want) + ' read; today Day ' + tQ + ' ' + rt.planDayLabel('quran', tQ) + '; start stays empty');

    /* Gita: bogus keys from the old short-plan grid */
    rt.setFL({ canon: { gita: { start: null, done: { 2: 1, 19: 1, 200: 1, x: 1 } } }, readings: {} });
    rt.planCarry('gita');
    r = rt.FL.readings.gita; want = cover('gita', [2]);
    if (J(keys(r.carried)) !== J([2])) fail(errs, 'C10', 'gita', 'carried ' + J(keys(r.carried)) + ': keys past the old length must be ignored');
    if (J(keys(r.read)) !== J(want)) fail(errs, 'C10', 'gita', 'read ' + J(keys(r.read)) + ', expected ' + J(want));
    const pG = rt.planProgress('gita');
    notes.push('Gita, done {2, 19, 200}: carried ' + J(keys(r.carried)) + ', read ' + J(want) + ', Read ' + pG.done + ' of ' + pG.total);

    /* progress counts days 1..N only */
    rt.setFL({ canon: {}, readings: { gita: { start: null, read: { 0: 1, 1: 1, 19: 1, 200: 1, x: 1 }, div: plans.plans.gita.div, carried: {}, rounds: [] } } });
    const pr = rt.planProgress('gita');
    if (pr.done !== 1 || pr.total !== 18 || pr.pct > 100) fail(errs, 'C10', 'gita', 'progress over stray keys ' + J(pr));
    if (rt.planToday('gita') !== 2) fail(errs, 'C10', 'gita', 'today over stray keys is ' + rt.planToday('gita'));

    /* a record under an earlier division converts through prior */
    const P2 = clone(plans);
    P2.plans.bible.prior.f00d000000 = ctx.legacyNew.bible;
    const rt2 = loadRuntime({ plans: P2, patch: opts.patch });
    rt2.setFL({ canon: {}, readings: { bible: { start: '2026-01-01', read: set(range(1, 5)), div: 'f00d000000', carried: {}, rounds: [] } } });
    rt2.planCarry('bible');
    r = rt2.FL.readings.bible;
    if (r.div !== plans.plans.bible.div || J(keys(r.read)) !== J(cover('bible', range(1, 5)))) fail(errs, 'C10', 'bible', 'a record under an earlier division did not convert: ' + J(keys(r.read)));

    /* first mark sets start; a new round keeps the old one */
    rt.setFL({ canon: {}, readings: {} });
    rt.planMarkRead('tao', 1);
    if (rt.FL.readings.tao.start !== '2026-09-26') fail(errs, 'C10', 'tao', 'the first mark did not set start');
    rt.planBeginAgain('tao');
    const rt0 = rt.FL.readings.tao;
    if (rt0.rounds.length !== 1 || rt0.rounds[0].n !== 1 || keys(rt0.read).length || rt0.start !== null) fail(errs, 'C10', 'tao', 'begin again did not keep a round and start over');

    /* begin again after a carry: the next boot's carry must leave the new
       round empty, and must not put the old calendar's start back on it;
       nor may calendar ticks that arrive later (an import of a calendar-era
       backup) fill it: the calendar belongs to the first read-through */
    rt.setFL({ canon: { bible: { start: '2026-03-01', done: set(range(1, 5)) } }, readings: {} });
    rt.planCarry('bible');
    rt.planBeginAgain('bible');
    rt.planCarry('bible');
    range(6, 10).forEach(od => { rt.FL.canon.bible.done[od] = 1; });
    rt.planCarry('bible');
    r = rt.FL.readings.bible;
    if (J(keys(r.carried)) !== J(range(1, 10))) fail(errs, 'C10', 'bible', 'after begin again the calendar ticks were not remembered as carried: ' + J(keys(r.carried)));
    if (keys(r.read).length || rt.planToday('bible') !== 1 || r.rounds.length !== 1) fail(errs, 'C10', 'bible', 'a carry after begin again refilled the new round: read ' + J(keys(r.read)) + ', today ' + rt.planToday('bible') + ', rounds ' + r.rounds.length);
    if (r.start !== null) fail(errs, 'C10', 'bible', 'a carry after begin again put the old start ' + r.start + ' on the new round');

    /* two devices, each carrying its own calendar ticks at boot, then one
       imports the other (flImport's order: canon joined, planImport, the
       carry). A day only the two sets cover together was offered on
       neither device, so it is marked: the result equals one device
       holding both sets. */
    const boot = done => {
      const dv = loadRuntime({ plans: plans, patch: opts.patch });
      dv.setFL({ canon: { bible: { start: '2026-03-01', done: set(done) } }, readings: {} });
      dv.planCarry('bible');
      return dv;
    };
    const importInto = (dev, from) => {
      const rec = JSON.parse(J(from.FL));
      Object.keys(rec.canon).forEach(id => {
        const m = dev.FL.canon[id] || (dev.FL.canon[id] = { start: null, done: {} });
        Object.keys(rec.canon[id].done || {}).forEach(k => { m.done[k] = 1; });
      });
      Object.keys(rec.readings).forEach(id => dev.planImport(id, rec.readings[id]));
      dev.planCarryAll();
    };
    const phone = boot(range(1, 5)), tablet = boot([1, 2, 3, 4, 6]);
    importInto(phone, tablet);
    const wantBoth = cover('bible', range(1, 6));
    r = phone.FL.readings.bible;
    if (J(keys(r.read)) !== J(wantBoth)) fail(errs, 'C10', 'bible', 'two devices: read ' + J(keys(r.read)) + ' after the import, expected ' + J(wantBoth) + ' (as one device holding both sets)');
    if (J(keys(r.carried)) !== J(range(1, 6))) fail(errs, 'C10', 'bible', 'two devices: carried ' + J(keys(r.carried)));
    const snapM = J(phone.FL.readings);
    if (phone.planCarryAll() || J(phone.FL.readings) !== snapM) fail(errs, 'C10', 'bible', 'two devices: a carry after the import was not idempotent');
    notes.push('two devices, old days 1 to 5 and 1, 2, 3, 4, 6: read ' + J(wantBoth) + ', today Day ' + phone.planToday('bible') + ' ' + phone.planDayLabel('bible', phone.planToday('bible')));
    /* a day this device unticked stays unticked when the other device's backup arrives */
    const phone2 = boot(range(1, 5)), untick2 = cover('bible', range(1, 5))[0];
    phone2.planMarkRead('bible', untick2, false);
    const tablet2 = boot(range(1, 5));
    tablet2.planMarkRead('bible', untick2, false);
    importInto(phone2, tablet2);
    if (phone2.FL.readings.bible.read[untick2]) fail(errs, 'C10', 'bible', 'two devices: day ' + untick2 + ', unticked by the reader, was ticked again by an import');

    /* imports across Begin again: days join only within one read-through */
    const fresh = () => { const dv = loadRuntime({ plans: plans, patch: opts.patch }); dv.setFL({ canon: {}, readings: {} }); return dv; };
    const markAll = (dv, id) => { for (let d = 1; d <= dv.planDays(id); d++) dv.planMarkRead(id, d); };
    const gA = fresh();
    markAll(gA, 'gita');
    const before18 = JSON.parse(J(gA.FL));
    gA.planBeginAgain('gita');
    gA.planImport('gita', before18.readings.gita);
    r = gA.FL.readings.gita;
    if (keys(r.read).length || r.start !== null || gA.planToday('gita') !== 1 || r.rounds.length !== 1) fail(errs, 'C10', 'gita', 'an older backup undid begin again: read ' + J(keys(r.read)) + ', start ' + r.start + ', rounds ' + r.rounds.length);
    /* A has begun again and read day 1; B is still finished */
    const gB = fresh();
    markAll(gB, 'gita');
    gA.planMarkRead('gita', 1);
    const recA = JSON.parse(J(gA.FL)), recB = JSON.parse(J(gB.FL));
    gB.planImport('gita', recA.readings.gita);
    r = gB.FL.readings.gita;
    if (J(keys(r.read)) !== J([1]) || r.rounds.length !== 1) fail(errs, 'C10', 'gita', 'a finished device importing one that has begun again: read ' + J(keys(r.read)) + ', rounds ' + r.rounds.length);
    gA.planImport('gita', recB.readings.gita);
    r = gA.FL.readings.gita;
    if (J(keys(r.read)) !== J([1]) || r.rounds.length !== 1 || gA.planToday('gita') !== 2) fail(errs, 'C10', 'gita', 'a device that has begun again importing a finished one: read ' + J(keys(r.read)) + ', rounds ' + r.rounds.length);

    /* the randomised property test */
    let seed = 20260926;
    const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    let trials = 0;
    for (const cfg of C.PLANS) {
      const id = cfg.id, oldLen = ctx.legacyNew[id].length / 2, days = dayList(id);
      for (let t = 0; t < 12; t++) {
        const dens = rnd();
        const ticks = [];
        for (let od = 1; od <= oldLen; od++) if (rnd() < dens) ticks.push(od);
        const extra = {};
        ticks.forEach(k => { extra[k] = 1; });
        extra[oldLen + 1 + Math.floor(rnd() * 400)] = 1;          /* a stray key the grid could leave */
        rt.setFL({ canon: { [id]: { start: null, done: extra } }, readings: {} });
        rt.planCarry(id);
        const rec = rt.FL.readings[id];
        const marked = new Set();
        ticks.forEach(od => { const lg = ctx.legacyNew[id]; for (let a = lg[2 * od - 2]; a <= lg[2 * od - 1]; a++) marked.add(a); });
        days.forEach((d, i) => {
          let all = true;
          for (let a = d[0]; a <= d[1]; a++) if (!marked.has(a)) { all = false; break; }
          if (!!rec.read[i + 1] !== all) fail(errs, 'C10', id, 'property: day ' + (i + 1) + (all ? ' is fully covered but not marked' : ' is marked but not fully covered'));
        });
        Object.keys(rec.read).forEach(k => { if (!(+k >= 1 && +k <= days.length)) fail(errs, 'C10', id, 'property: a key outside the plan was marked: ' + k); });
        /* then the reader unticks some, and more old ticks arrive */
        const unticked = keys(rec.read).filter(() => rnd() < 0.3);
        unticked.forEach(d => rt.planMarkRead(id, d, false));
        for (let od = 1; od <= oldLen; od++) if (rnd() < 0.2) rt.FL.canon[id].done[od] = 1;
        const covBefore = new Set(cover(id, ticks));
        const all2 = keys(rt.FL.canon[id].done).filter(k => k >= 1 && k <= oldLen);
        rt.planCarry(id);
        const rec2 = rt.FL.readings[id];
        cover(id, all2).forEach(d => {
          const shouldBe = covBefore.has(d) ? !unticked.includes(d) : true;
          if (!!rec2.read[d] !== shouldBe) fail(errs, 'C10', id, 'property after an import: day ' + d + (shouldBe ? ' should be marked' : ' was unticked and must stay so'));
        });
        const snap2 = J(rt.FL.readings);
        rt.planCarry(id);
        if (J(rt.FL.readings) !== snap2) fail(errs, 'C10', id, 'property: carry is not idempotent');
        trials++;
      }
    }
    notes.push('property test: ' + trials + ' random records across ' + C.PLANS.length + ' plans');
  } catch (e) {
    fail(errs, 'C10', '*', 'migration threw: ' + e.message);
  }
  return { errs, notes };
}

/* Teachings: js/texts/teachings/<planId>.js, FLTextPut("teachings", id,
   {plan, div, days:[{d, at, ref, key, s, by}]}), listed in FL_PLANS.teach
   only when complete. */
function payloadOf(src, kind, id) {
  let out = null, w = null, p = null;
  new Function('FLTextPut', src)((a, b, d) => { w = a; p = b; out = d; });
  if (w !== kind || p !== id) throw new Error('FLTextPut("' + w + '", "' + p + '") where ("' + kind + '", "' + id + '") was expected');
  return out;
}
/* Verbatim means verbatim after this and nothing more: curly and straight
   quotes are one mark (a key verse prints curly quotes over a translation
   typed with straight ones), Gutenberg's italic underscores are dropped,
   and whitespace runs are one space. The same rule as the authoring
   corpus (.scripts/teachings/corpus.js norm). */
function norm(s) {
  return String(s || '')
    .replace(/[\u2018\u2019\u201A\u201B\u2032`\u00B4]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/_/g, '')
    .replace(/\s+/g, ' ').trim();
}
function sentenceErrors(s, by, roster) {
  const out = [];
  if (!s || typeof s !== 'string') return ['no sentence'];
  const w = words(s);
  /* distinct people: a name inside a longer matched one is the same
     mention ("Chrysostom" in "John Chrysostom"), and aliases share a key */
  const hit = roster.filter(r => s.indexOf(r) > -1);
  const people = new Set(hit.filter(r => !hit.some(o => o !== r && o.indexOf(r) > -1)).map(r => C.TEACH_ALIASES[r] || r));
  const two = people.size > 1;
  if (w > (two ? 60 : 45)) out.push('sentence of ' + w + ' words');
  if (!/[.]$/.test(s.trim()) || /[.!?]\s+[A-Z]/.test(s)) out.push('not one sentence');
  if (!by || s.indexOf(by) < 0) out.push('the sentence does not name "' + by + '"');
  if (!roster.includes(by)) out.push('"' + by + '" is not on the roster');
  if (C.AMERICAN.test(s)) out.push('American spelling: ' + s.match(C.AMERICAN)[0]);
  return out;
}
function atomText(B, at) {
  const a = B.atoms[at[0]];
  if (!a) return null;
  const t = a.text();
  if (at[1] !== null && at[1] !== undefined) return t[at[1] - 1] === undefined ? null : t[at[1] - 1];
  return t.join(' ');
}

function checkTeachings(ctx) {
  const errs = [], notes = [];
  const teach = (ctx.plans && ctx.plans.teach) || {};
  const files = ctx.teachFiles || {};
  const ids = new Set(Object.keys(teach).concat(Object.keys(files)));
  ids.forEach(id => {
    const P = ctx.plans.plans[id], B = ctx.built[id];
    if (!P) { fail(errs, 'T', id, 'a teaching set for a plan that does not exist'); return; }
    if (!teach[id]) { fail(errs, 'T', id, 'teachings/' + id + '.js exists but FL_PLANS.teach has no entry'); return; }
    if (!(id in files)) { fail(errs, 'T', id, 'FL_PLANS.teach lists it but there is no file'); return; }
    const src = files[id];
    const n = P.days.length / 3;
    if (teach[id].v !== sha10(src)) fail(errs, 'T', id, 'manifest v ' + teach[id].v + ' is not the file hash ' + sha10(src));
    if (teach[id].n !== n) fail(errs, 'T', id, 'manifest n ' + teach[id].n + ', the plan has ' + n + ' days');
    let data;
    try { data = payloadOf(src, 'teachings', id); } catch (e) { fail(errs, 'T', id, e.message); return; }
    if (data.plan !== id) fail(errs, 'T', id, 'file plan is ' + data.plan);
    if (data.div !== P.div) fail(errs, 'T', id, 'written against division ' + data.div + ', the plan is ' + P.div);
    const days = data.days || [];
    if (days.length !== n) fail(errs, 'T', id, days.length + ' days of ' + n + ': a set ships only complete');
    const roster = C.TEACH_ROSTER[id] || [];
    days.forEach((t, i) => {
      const where = 'day ' + (i + 1);
      if (t.d !== i + 1) fail(errs, 'T', id, where + ' is numbered ' + t.d);
      const k = i * 3, a0 = P.days[k], a1 = P.days[k + 1];
      if (!Array.isArray(t.at) || !(t.at[0] >= a0 && t.at[0] <= a1)) { fail(errs, 'T', id, where + ': at ' + JSON.stringify(t.at) + ' is outside the day'); return; }
      const at = [t.at[0], t.at.length > 1 ? t.at[1] : null];
      try {
        const r = parseRef(P, t.ref || '');
        if (r[0] !== at[0] || r[1] !== at[1]) fail(errs, 'T', id, where + ': ref "' + t.ref + '" is not at ' + JSON.stringify(t.at));
      } catch (e) { fail(errs, 'T', id, where + ': ' + e.message); }
      const text = atomText(B, at);
      const kw = words(t.key || '');
      if (text === null || norm(text).indexOf(norm(t.key)) < 0) fail(errs, 'T', id, where + ': the key is not verbatim at ' + t.ref);
      if (kw < 4 || kw > 60) fail(errs, 'T', id, where + ': key of ' + kw + ' words');
      [t.key, t.s, t.ref].forEach(x => { if (TEXT_DASH.test(String(x || ''))) fail(errs, 'T', id, where + ': a dash in "' + x + '"'); });
      sentenceErrors(t.s, t.by, roster).forEach(m => fail(errs, 'T', id, where + ': ' + m));
    });
    notes.push(id + ': ' + days.length + ' teachings');
  });
  return { errs, notes };
}

/* Courses: js/texts/courses/<tr>.js, FLTextPut("courses", tr, {tradition,
   days:[{d, sec, i, line, ref, loc:{plan, at}|null, ext?, s, by}]}), one day
   per chamber entry (concepts, practices, festivals) in order. */
function checkCourses(ctx, rt) {
  const errs = [], notes = [];
  const courses = (ctx.plans && ctx.plans.courses) || {};
  const files = ctx.courseFiles || {};
  rt = rt || loadRuntime({ plans: ctx.plans });
  const union = [];
  Object.keys(C.TEACH_ROSTER).forEach(k => C.TEACH_ROSTER[k].forEach(n => { if (!union.includes(n)) union.push(n); }));
  const ids = new Set(Object.keys(courses).concat(Object.keys(files)));
  ids.forEach(tr => {
    const want = rt.courseDays(tr);
    if (!want.length) { fail(errs, 'K', tr, 'no such tradition in FL_TRADITIONS'); return; }
    if (!courses[tr]) { fail(errs, 'K', tr, 'courses/' + tr + '.js exists but FL_PLANS.courses has no entry'); return; }
    if (!(tr in files)) { fail(errs, 'K', tr, 'FL_PLANS.courses lists it but there is no file'); return; }
    const src = files[tr];
    if (courses[tr].v !== sha10(src)) fail(errs, 'K', tr, 'manifest v is not the file hash');
    if (courses[tr].n !== want.length) fail(errs, 'K', tr, 'manifest n ' + courses[tr].n + ', the chamber has ' + want.length);
    let data;
    try { data = payloadOf(src, 'courses', tr); } catch (e) { fail(errs, 'K', tr, e.message); return; }
    if (data.tradition !== tr) fail(errs, 'K', tr, 'file tradition is ' + data.tradition);
    const days = data.days || [];
    if (days.length !== want.length) fail(errs, 'K', tr, days.length + ' days of ' + want.length);
    let ext = 0;
    days.forEach((t, i) => {
      const where = 'day ' + (i + 1), w = want[i];
      if (!w || t.d !== w.d || t.sec !== w.sec || t.i !== w.i) fail(errs, 'K', tr, where + ' is not the chamber entry ' + (w ? w.sec + ' ' + w.i : '(none)'));
      if (t.loc) {
        const P = ctx.plans.plans[t.loc.plan], B = ctx.built[t.loc.plan];
        if (!P || !B || !Array.isArray(t.loc.at)) { fail(errs, 'K', tr, where + ': loc names no plan'); }
        else {
          const at = [t.loc.at[0], t.loc.at.length > 1 ? t.loc.at[1] : null];
          try {
            const r = parseRef(P, t.ref || '');
            if (r[0] !== at[0] || r[1] !== at[1]) fail(errs, 'K', tr, where + ': ref "' + t.ref + '" is not at its loc');
          } catch (e) { fail(errs, 'K', tr, where + ': ' + e.message); }
          const text = atomText(B, at);
          if (text === null || norm(text).indexOf(norm(t.line)) < 0) fail(errs, 'K', tr, where + ': the line is not verbatim at ' + t.ref);
        }
      } else {
        ext++;
        if (!t.ext || typeof t.ext !== 'string') fail(errs, 'K', tr, where + ': no local line and no external edition');
      }
      const lw = words(t.line || '');
      if (lw < 4 || lw > 60) fail(errs, 'K', tr, where + ': line of ' + lw + ' words');
      [t.line, t.s, t.ref].forEach(x => { if (TEXT_DASH.test(String(x || ''))) fail(errs, 'K', tr, where + ': a dash in "' + x + '"'); });
      sentenceErrors(t.s, t.by, union).forEach(m => fail(errs, 'K', tr, where + ': ' + m));
    });
    notes.push(tr + ': ' + days.length + ' days, ' + ext + ' from an external edition');
  });
  return { errs, notes };
}

/* The owner's rules, over file contents. */
function checkOwner(files) {
  const errs = [], notes = [];
  const today = files['js/ui-today.js'] || '';
  ['FL_PLANS', 'planToday', 'hallById', 'readRender', 'POOLS', '#/hall'].forEach(w => {
    if (today.indexOf(w) > -1) fail(errs, 'O', 'ui-today.js', 'Today mentions ' + w + ': the Readings stay under Soul');
  });
  const stale = ['Show today’s readings on your morning page', 'Today’s readings will appear on the morning page',
                 "Show today's readings on your morning page", "Today's readings will appear on the morning page"];
  Object.keys(files).forEach(f => {
    if (!/^js\/[^/]+\.js$|^index\.html$/.test(f)) return;
    stale.forEach(p => { if (files[f].indexOf(p) > -1) fail(errs, 'O', f, 'the stale promise "' + p + '"'); });
  });
  Object.keys(files).forEach(f => {
    if (!(['js/data-plans.js', 'js/plan.js', 'js/reading.js', 'js/ui-hall.js'].includes(f) ||
          f.indexOf('js/texts/teachings/') === 0 || f.indexOf('js/texts/courses/') === 0)) return;
    files[f].split('\n').forEach((line, i) => { if (DASH.test(line)) fail(errs, 'O', f, 'a dash on line ' + (i + 1) + ': ' + line.trim().slice(0, 80)); });
  });
  /* The calendar plans' descriptions said "in a year". They left plan.js
     with the calendar plans, so the check is armed: any "in a year" there
     fails (were chunkPlan ever back, it would only be reported). */
  const plan = files['js/plan.js'] || '';
  const armed = !/function chunkPlan\b/.test(plan);
  const hits = plan.split('\n').filter(l => /in a year/i.test(l)).length;
  if (hits) {
    if (armed) fail(errs, 'O', 'js/plan.js', hits + ' HALL_YEARS line(s) still say "in a year"');
    else notes.push('deferred until the calendar plans leave plan.js: ' + hits + ' HALL_YEARS line(s) still say "in a year"');
  }
  return { errs, notes };
}

function runAll(ctx, opts) {
  opts = opts || {};
  const d = checkDivisions(ctx, opts);
  const m = opts.skipMigration ? { errs: [], notes: [] } : checkMigration(ctx, opts);
  const t = checkTeachings(ctx);
  const k = checkCourses(ctx);
  const o = checkOwner(ctx.files);
  return { errs: d.errs.concat(m.errs, t.errs, k.errs, o.errs), warns: d.warns,
           notes: m.notes.concat(t.notes, k.notes, o.notes) };
}

/* ---------------------------------------------------------------- selftest */

function selftest() {
  const base = realContext();
  /* the label fixtures lean on the app's labeller for every day they do not break */
  const rtBase = loadRuntime({ plans: base.plans });
  base.rtLabel = (id, a0, a1) => rtBase.planLabelRange(id, a0, a1);
  let held = 0;
  const failures = [];
  /* A fixture holds only when the check it aims at fires: re, when given,
     must match the failure's message, so a fixture cannot pass on another
     check of the same code that its edit happens to trip as well. */
  const expectFail = (name, code, mutate, opts, re) => {
    if (opts instanceof RegExp) { re = opts; opts = null; }
    const ctx = Object.assign({}, base, { plans: clone(base.plans), lock: clone(base.lock), files: Object.assign({}, base.files),
      teachFiles: Object.assign({}, base.teachFiles), courseFiles: Object.assign({}, base.courseFiles),
      built: Object.assign({}, base.built) });
    const o = Object.assign({ skipMigration: code !== 'C10' }, opts || {});
    mutate(ctx, o);
    const r = runAll(ctx, o);
    const hit = r.errs.filter(e => e.code === code && (!re || re.test(e.msg)));
    if (hit.length) { held++; console.log('  ok   ' + code.padEnd(4) + name + '  (' + hit[0].msg.slice(0, 90) + ')'); }
    else failures.push(code + ' ' + name + ': expected a ' + code + ' failure' + (re ? ' matching ' + re : '') + ', got ' +
      (r.errs.length ? r.errs.slice(0, 4).map(e => e.code + ' ' + e.msg.slice(0, 70)).join('; ') : 'none'));
  };
  const P = ctx => ctx.plans.plans;
  const reLock = (ctx, id) => { /* keep C8 quiet when a fixture edits days on purpose */
    const pl = P(ctx)[id], pairs = [];
    for (let k = 0; k < pl.days.length; k += 3) pairs.push(pl.days[k], pl.days[k + 1]);
    pl.div = divHash(pl.seg, pairs);
    ctx.lock.plans[id].div = pl.div;
  };
  /* a plan's rebuilt atoms, copied so that a fixture may change one */
  const ownBuilt = (ctx, id) => {
    const B = ctx.built[id];
    ctx.built[id] = Object.assign({}, B, { atoms: B.atoms.map(a => Object.assign({}, a)) });
    return ctx.built[id];
  };

  console.log('\n  the division checks');
  expectFail('a plan out of shelf order', 'C1', ctx => { const p = P(ctx); const q = {}; Object.keys(p).reverse().forEach(k => { q[k] = p[k]; }); ctx.plans.plans = q; }, /shelf order/);
  expectFail('a Bible book with a chapter missing', 'C1', ctx => { P(ctx).bible.seg[0][2] = 49; }, /^66 books, 1188 chapters$/);
  expectFail('Bible books against BIBLE_BOOKS', 'C1', ctx => { ctx.canon = clone(ctx.canon); ctx.canon.BIBLE_BOOKS[1][0] = 'Exodos'; }, /BIBLE_BOOKS/);
  expectFail('Qur\'an seg against SURAH_AYAHS', 'C1', ctx => { ctx.canon = clone(ctx.canon); ctx.canon.SURAH_AYAHS[1] = 285; }, /SURAH_AYAHS/);
  expectFail('two surah names swapped', 'C1', ctx => { const g = P(ctx).quran.seg, x = g[1][0]; g[1][0] = g[2][0]; g[2][0] = x; }, /the text calls it/);
  expectFail('a Tanakh composite that no longer sums', 'C1', ctx => { ctx.canon = clone(ctx.canon); ctx.canon.TANAKH_BOOKS[7][1] = 54; }, /sums to/);
  expectFail('Rig Veda mandala counts', 'C1', ctx => { ctx.canon = clone(ctx.canon); ctx.canon.RV_MANDALAS[0] = 190; }, /RV_MANDALAS/);
  expectFail('Dhammapada chapter ends', 'C1', ctx => { ctx.canon = clone(ctx.canon); ctx.canon.DHP_CH[0][1] = 21; }, /DHP_CH/);
  expectFail('a Gita chapter off the standard count', 'C1', ctx => { P(ctx).gita.seg[1][2] = 71; }, /standard 700/);
  expectFail('Analects VII.17 run into VII.16 again', 'C1', ctx => { P(ctx).analects.seg[6][2] = 36; }, /Legge has 499/);
  expectFail('Analects sayings moved between books', 'C1', ctx => { P(ctx).analects.seg[6][2] = 36; P(ctx).analects.seg[7][2] += 1; }, /CHAP\. lines gives/);
  expectFail('an Analects saying still headed "CHAP."', 'C1', ctx => {
    const B = ownBuilt(ctx, 'analects'), a = B.atoms[100], t0 = a.text;
    a.text = () => { const t = t0(); t[0] = 'CHAP. IX ' + t[0]; return t; }; }, /CHAP\. heading inside/);
  expectFail('Zhuangzi back matter in the plan', 'C1', ctx => { P(ctx).zhuangzi.seg[32][2] += 3; }, /does not stop before/);
  expectFail('Upanishad verse counts', 'C1', ctx => { P(ctx).upanishads.seg[2][2] = 24; }, /verse counts/);
  expectFail('a Katha verse that drops the opening Peace Chant', 'C1', ctx => {
    const br = P(ctx).upanishads.blocks.find(x => x[0] === 1); br[1] = 3; }, /not tiled exactly once/);
  expectFail('excludedRanges that are not what from, to and exclude leave out', 'C1', ctx => {
    ctx.upMap = clone(C.UPANISHAD_MAP); ctx.upMap[1].from = 3; }, /leave out/);
  expectFail('a Bible chapter the bake left empty', 'C1', ctx => {
    const B = ownBuilt(ctx, 'bible'); B.atoms[5].w = 0; B.atoms[5].text = () => []; }, /^atom 5 .* has no words$/);
  expectFail('an atom read twice', 'C2', ctx => { P(ctx).bible.days[3] = 2; reLock(ctx, 'bible'); }, /starts at atom/);
  expectFail('an atom skipped', 'C2', ctx => { P(ctx).tanakh.days[3] = 4; reLock(ctx, 'tanakh'); }, /starts at atom/);
  expectFail('an empty day', 'C2', ctx => { const d = P(ctx).tao.days; d.splice(3, 0, 1, 0, 0); reLock(ctx, 'tao'); }, /is empty/);
  expectFail('a stored word count that is wrong', 'C3', ctx => { P(ctx).veda.days[2] += 1; }, /stores/);
  expectFail('a day ending inside a short chapter', 'C4', ctx => {
    const d = P(ctx).gita.days; const a0 = d[0], a1 = d[1];
    d.splice(0, 3, a0, a1 - 1, 1, a1, a1, 1); reLock(ctx, 'gita'); }, /no day may end/);
  expectFail('a long day past 2,760 words', 'C5', ctx => {
    const d = P(ctx).bible.days; d.splice(0, 6, d[0], d[4], d[2] + d[5]); reLock(ctx, 'bible'); }, /^day 1 has \d+ words$/);
  expectFail('a long day under 1,380 words', 'C5', ctx => { P(ctx).bible.days[2] = 1000; }, /^day 1 has 1000 words$/);
  expectFail('a long work whose mean leaves the 3% band', 'C5', ctx => {
    const d = P(ctx).zhuangzi.days, out = [];
    for (let k = 0; k < d.length; k += 3) out.push([d[k], d[k + 1], d[k + 2]]);
    const B = base.built.zhuangzi, nd = [];
    out.forEach(x => { if (x[1] - x[0] >= 8) { let w = 0; for (let a = x[0]; a <= x[1] - 4; a++) w += B.atoms[a].w; nd.push(x[0], x[1] - 4, w, x[1] - 3, x[1], x[2] - w); } else nd.push(x[0], x[1], x[2]); });
    P(ctx).zhuangzi.days = nd; reLock(ctx, 'zhuangzi'); }, /outside 3%/);
  expectFail('two Tao Te Ching chapters in one day', 'C6', ctx => {
    const d = P(ctx).tao.days; d.splice(0, 6, 0, 1, d[2] + d[5]); reLock(ctx, 'tao'); }, /crosses a chapter/);
  expectFail('a split Dhammapada chapter that fits in a day', 'C6', ctx => {
    const B = base.built.pali; const d = P(ctx).pali.days; const w = B.atoms[0].w;
    d.splice(0, 3, 0, 0, w, 1, d[1], d[2] - w); reLock(ctx, 'pali'); }, /is not exactly one day/);
  expectFail('a label the grammar reads back wrongly', 'C7', () => {}, { label: (id, a0, a1) => id === 'bible' && a0 === 0 ? 'Genesis 1 to 4' : base.rtLabel(id, a0, a1) }, /parses to/);
  expectFail('a label with an en dash', 'C7', () => {}, { label: (id, a0, a1) => id === 'veda' && a0 === 0 ? 'Rig Veda 1.1' + EN + '1.12' : base.rtLabel(id, a0, a1) }, /has a dash/);
  expectFail('a label naming a juz', 'C7', () => {}, { label: (id, a0, a1) => id === 'quran' && a0 === 0 ? 'Juz 1, day 1' : base.rtLabel(id, a0, a1) }, /names a juz/);
  expectFail('a label naming a composite book', 'C7', ctx => { P(ctx).tanakh.seg[7][0] = 'Samuel'; }, /composite book/);
  expectFail('two days with one label', 'C7', () => {}, { label: (id, a0, a1) => id === 'tao' && a0 < 2 ? 'Tao Te Ching 1' : base.rtLabel(id, a0, a1) }, /is used by days/);
  expectFail('div that is not the hash of the days', 'C8', ctx => { P(ctx).quran.div = '0000000000'; }, /is not the hash/);
  expectFail('div that differs from the lock', 'C8', ctx => { ctx.lock.plans.analects.div = 'ffffffffff'; }, /differs from the lock/);
  expectFail('an earlier division with no prior entry', 'C8', ctx => { ctx.lock.plans.pali.prior = { abcdef0123: [0, 1] }; }, /no matching prior/);
  expectFail('prior.legacy that is not the old plan', 'C9', ctx => { P(ctx).bible.prior.legacy[1] = 4; P(ctx).bible.prior.legacy[2] = 5; }, /differs from legacy\.js/);
  expectFail('legacy.js drifting from the old plan.js', 'C9', ctx => { ctx.legacyOld = clone(ctx.legacyOld || ctx.legacyNew); ctx.legacyOld.pali[1] = 2; ctx.legacyOld.pali[2] = 3; }, /git show/);

  console.log('\n  the migration checks');
  expectFail('carry that keeps keys past the old length', 'C10', () => {}, { patch: [['if (od >= 1 && od <= oldLen) old[od] = 1;', 'if (od >= 1) old[od] = 1;']] });
  expectFail('carry that reticks a day the reader unticked', 'C10', () => {}, { patch: [['for (var d in now) if (!before[d]) r.read[d] = 1;', 'for (var d in now) r.read[d] = 1;']] });
  expectFail('carry that marks a partly read day', 'C10', () => {}, { patch: [['if (!marked[a]) { all = false; break; }', 'if (!marked[a] && a === P.days[k]) { all = false; break; }']] });
  expectFail('carry that forgets the start date', 'C10', () => {}, { patch: [['if (!r.start && !r.rounds.length && canon && canon.start) r.start = canon.start;', '']] }, /start not carried/);
  expectFail('carry that puts the old start on a new round', 'C10', () => {}, { patch: [['if (!r.start && !r.rounds.length && canon && canon.start)', 'if (!r.start && canon && canon.start)']] }, /old start/);
  expectFail('carry that fills a new round with calendar ticks', 'C10', () => {}, { patch: [['if (!r.rounds.length) for (var d in now) if (!before[d])', 'for (var d in now) if (!before[d])']] }, /refilled the new round/);
  expectFail('an import that joins two carried sets without marking', 'C10', () => {}, { patch: [['for (var d in now) if (!mine[d] && !yours[d]) r.read[d] = 1;', '']] }, /two devices: read/);
  expectFail('an import that marks what either device had offered', 'C10', () => {}, { patch: [['if (!mine[d] && !yours[d]) r.read[d] = 1;', 'r.read[d] = 1;']] }, /two devices: day/);
  expectFail('an import that joins read days across begin again', 'C10', () => {}, { patch: [['if (tr >= mr && read) {', 'if (read) {']] }, /undid begin again/);
  expectFail('an import from a later round that keeps this one', 'C10', () => {}, { patch: [['if (tr > mr) { r.read = {}; r.start = null; }', '']] }, /finished device importing/);
  expectFail('progress that counts stray keys', 'C10', () => {}, { patch: [['for (var d = 1; d <= n; d++) if (read[d]) done++;', 'for (var d in read) done++;']] });
  expectFail('no conversion through prior', 'C10', () => {}, { patch: [['if (map) r.read = planCovered(P, planMarkPairs(map, r.read, {}));', 'if (map) r.read = {};']] });
  expectFail('legacy ranges the runtime disagrees with', 'C10', ctx => { const l = P(ctx).gita.prior.legacy; l[3] -= 1; l[4] -= 1; });

  console.log('\n  the teaching and course checks (no real set exists yet, so fixtures)');
  const good = makeTeachFixture(base);
  const withTeach = (ctx, mut) => {
    const f = clone(good);
    mut(f);
    const src = 'FLTextPut("teachings","tao",' + JSON.stringify(f) + ');';
    ctx.teachFiles = { tao: src };
    ctx.plans.teach = { tao: { v: sha10(src), n: 81 } };
  };
  {
    const ctx = Object.assign({}, base, { plans: clone(base.plans) });
    withTeach(ctx, () => {});
    const r = checkTeachings(ctx);
    if (r.errs.length) failures.push('T: the good fixture fails: ' + r.errs.slice(0, 3).map(e => e.msg).join('; '));
    else { held++; console.log('  ok   T   a complete, valid fixture set passes'); }
  }
  expectFail('a file with no manifest entry', 'T', ctx => { ctx.teachFiles = { tao: 'FLTextPut("teachings","tao",{});' }; });
  expectFail('a manifest entry with no file', 'T', ctx => { ctx.plans.teach = { tao: { v: 'x', n: 81 } }; });
  expectFail('an incomplete set', 'T', ctx => withTeach(ctx, f => { f.days.pop(); }));
  expectFail('a set written against another division', 'T', ctx => withTeach(ctx, f => { f.div = '1234567890'; }));
  expectFail('a manifest hash that is not the file\'s', 'T', ctx => { withTeach(ctx, () => {}); ctx.plans.teach.tao.v = 'deadbeef00'; });
  expectFail('a key outside its day', 'T', ctx => withTeach(ctx, f => { f.days[0].at = [5]; }));
  expectFail('a ref that is not at', 'T', ctx => withTeach(ctx, f => { f.days[0].ref = 'Tao Te Ching 2'; }));
  expectFail('a key that is not verbatim', 'T', ctx => withTeach(ctx, f => { f.days[0].key = 'The Way that can be walked is not the Way'; }));
  expectFail('a key of three words', 'T', ctx => withTeach(ctx, f => { f.days[0].key = f.days[0].key.split(' ').slice(0, 3).join(' '); }));
  expectFail('two sentences', 'T', ctx => withTeach(ctx, f => { f.days[0].s = f.days[0].s + ' Wang Bi agrees.'; }));
  expectFail('a sentence that does not name its commentator', 'T', ctx => withTeach(ctx, f => { f.days[0].s = 'The chapter names what cannot be named.'; }));
  expectFail('a commentator off the roster', 'T', ctx => withTeach(ctx, f => { f.days[0].by = 'Zhu Xi'; f.days[0].s = 'The chapter names the nameless; Zhu Xi reads it as order.'; }));
  expectFail('an American spelling', 'T', ctx => withTeach(ctx, f => { f.days[0].s = 'The chapter honors the nameless; Wang Bi, commentary 1, reads it as the root.'; }));
  expectFail('a dash in a sentence', 'T', ctx => withTeach(ctx, f => { f.days[0].s = 'The chapter ' + EM + ' the first; Wang Bi, commentary 1, reads it as the root.'; }));
  expectFail('a sentence past 60 words', 'T', ctx => withTeach(ctx, f => { f.days[0].s = 'Wang Bi reads it ' + 'very '.repeat(60) + 'plainly.'; }));
  expectFail('an unspaced double hyphen in a key', 'T', ctx => withTeach(ctx, f => { f.days[0].key = 'Space infinite' + DD + 'Time infinite, and more'; }), /a dash in/);
  {
    /* one commentator under a long and a short name is one person: 54
       words may not pass as a sentence naming two (caps 45 and 60) */
    const pad = 'the reading turns on this line '.repeat(8);
    const cases = [
      ['John Chrysostom reads ' + pad + 'and Chrysostom stops there.', 'John Chrysostom', 'bible', true],
      ['The Midrash Rabbah reads ' + pad + 'and the Midrash stops there.', 'Midrash Rabbah', 'tanakh', true],
      ['Shankara reads ' + pad + 'as Śaṅkara says elsewhere.', 'Shankara', 'gita', true],
      ['John Chrysostom reads ' + pad + 'and Augustine agrees.', 'Augustine', 'bible', false],
      ['Rashi follows ' + pad + 'the Midrash Rabbah closely here.', 'Rashi', 'tanakh', false],
      /* a roster that names one person twice with no alias: the shorter name
         inside the longer one is still one mention */
      ['Leo the Great reads ' + pad + 'and says no more.', 'Leo the Great', ['Leo', 'Leo the Great'], true]
    ];
    const bad = cases.filter(c => sentenceErrors(c[0], c[1], Array.isArray(c[2]) ? c[2] : C.TEACH_ROSTER[c[2]]).some(x => /^sentence of/.test(x)) !== c[3]);
    if (bad.length) failures.push('T: the two-commentator allowance counts names, not people: ' + bad.map(c => c[1] + ' in ' + c[2]).join('; '));
    else { held++; console.log('  ok   T   the two-commentator allowance counts people, not spellings (' + cases.length + ' sentences)'); }
  }

  const goodC = makeCourseFixture(base);
  const withCourse = (ctx, mut) => {
    const f = clone(goodC);
    mut(f);
    const src = 'FLTextPut("courses","taoist",' + JSON.stringify(f) + ');';
    ctx.courseFiles = { taoist: src };
    ctx.plans.courses = { taoist: { v: sha10(src), n: f.n || goodC.days.length } };
    delete f.n;
  };
  {
    const ctx = Object.assign({}, base, { plans: clone(base.plans) });
    withCourse(ctx, () => {});
    const r = checkCourses(ctx);
    if (r.errs.length) failures.push('K: the good fixture fails: ' + r.errs.slice(0, 3).map(e => e.msg).join('; '));
    else { held++; console.log('  ok   K   a complete, valid course fixture passes (' + r.notes.join('') + ')'); }
  }
  expectFail('a course file with no manifest entry', 'K', ctx => { ctx.courseFiles = { taoist: 'FLTextPut("courses","taoist",{});' }; });
  expectFail('a course out of the chamber\'s order', 'K', ctx => withCourse(ctx, f => { const x = f.days[0]; f.days[0] = f.days[1]; f.days[1] = x; }));
  expectFail('a course day missing', 'K', ctx => withCourse(ctx, f => { f.days.pop(); }));
  expectFail('a course line not verbatim at loc', 'K', ctx => withCourse(ctx, f => { f.days[0].line = 'Nothing in the text says this at all'; }));
  expectFail('a course day with neither loc nor ext', 'K', ctx => withCourse(ctx, f => { f.days[1].loc = null; delete f.days[1].ext; }));

  console.log('\n  the owner rules');
  expectFail('Today reading the plans', 'O', ctx => { ctx.files['js/ui-today.js'] += '\nvar x = planToday("bible");'; });
  expectFail('Today linking to the Readings', 'O', ctx => { ctx.files['js/ui-today.js'] += '\nvar y = "#/hall";'; });
  expectFail('the stale promise back in onboarding', 'O', ctx => { ctx.files['js/app.js'] += '\n// Show today’s readings on your morning page'; });
  expectFail('an em dash in plan.js', 'O', ctx => { ctx.files['js/plan.js'] += '\n/* a ' + EM + ' b */'; });
  expectFail('a spaced double hyphen in ui-hall.js', 'O', ctx => { ctx.files['js/ui-hall.js'] += '\n/* a ' + DD + ' b */'; });
  expectFail('a dash in a teaching file', 'O', ctx => { ctx.files['js/texts/teachings/tao.js'] = 'FLTextPut("teachings","tao",{"s":"a ' + EM + ' b"});'; });
  expectFail('"in a year" back in a HALL_YEARS description', 'O', ctx => {
    ctx.files['js/plan.js'] += "\n  'The whole Bible in a year.',"; }, /in a year/);

  console.log('\n  the real data');
  const r = runAll(base);
  if (r.errs.length) failures.push('the real data fails: ' + r.errs.slice(0, 5).map(e => e.code + ' ' + e.plan + ': ' + e.msg).join('; '));
  else { held++; console.log('  ok   all checks pass on the shipped data'); }

  /* plan.js must load and answer without FL_PLANS */
  try {
    const rt = loadRuntime({ noPlans: true });
    if (rt.planDef('bible') !== null || rt.planDays('bible') !== 0 || rt.planCarryAll() !== 0 || rt.planLabelRange('bible', 0, 1) !== '' || rt.courseReady('hindu')) throw new Error('answers without FL_PLANS were not empty');
    if (rt.planLength) throw new Error('the calendar planLength is still in plan.js');
    const h = rt.hallById('bible');
    if (!h || h.length !== 9 || h[4] !== null || !/Genesis to Revelation\.$/.test(h[3])) throw new Error('HALL_YEARS without FL_PLANS: ' + JSON.stringify(h && h[3]));
    held++; console.log('  ok   plan.js loads and answers empty without FL_PLANS; HALL_YEARS keeps its shape and names no length');
  } catch (e) { failures.push('runtime without FL_PLANS: ' + e.message); }

  if (failures.length) {
    console.error('\n  selftest FAILED:\n    ' + failures.join('\n    '));
    process.exit(1);
  }
  console.log('\n  selftest: ' + held + ' assertions held.\n');
}

/* A valid teaching set for the Tao Te Ching, built from the text so it is
   verbatim by construction: each day's key is the first eight words of the
   chapter's first line block. Used only by the selftest. */
function makeTeachFixture(base) {
  const P = base.plans.plans.tao, B = base.built.tao;
  const days = [];
  for (let d = 1; d <= P.days.length / 3; d++) {
    const a = P.days[(d - 1) * 3];
    const text = norm(B.atoms[a].text().join(' '));
    const key = text.split(' ').slice(0, 8).join(' ');
    days.push({ d: d, at: [a], ref: 'Tao Te Ching ' + (a + 1), key: key,
                s: 'The chapter opens on this line; Wang Bi, commentary ' + (a + 1) + ', reads it as the root.', by: 'Wang Bi' });
  }
  return { plan: 'tao', div: P.div, days: days };
}
/* A valid course for Taoism: local lines from the Tao Te Ching, verbatim by
   construction, and one day from an external edition. */
function makeCourseFixture(base) {
  const rt = loadRuntime({ plans: base.plans });
  const want = rt.courseDays('taoist');
  const B = base.built.tao;
  const days = want.map((w, i) => {
    const a = i % 81;
    const line = norm(B.atoms[a].text().join(' ')).split(' ').slice(0, 6).join(' ');
    const t = { d: w.d, sec: w.sec, i: w.i, line: line, ref: 'Tao Te Ching ' + (a + 1), loc: { plan: 'tao', at: [a] },
                s: 'The line names the matter; Wang Bi reads it as the root.', by: 'Wang Bi' };
    if (i === 1) { t.loc = null; t.ext = 'An external public-domain edition'; }
    return t;
  });
  return { tradition: 'taoist', days: days };
}

/* ---------------------------------------------------------------- main */

function main() {
  if (process.argv.includes('--selftest')) { selftest(); return; }
  const ctx = realContext();
  const r = runAll(ctx);
  r.notes.forEach(n => console.log('  ' + n));
  r.warns.forEach(w => console.warn('  warning: ' + w));
  if (r.errs.length) {
    console.error('\n  ' + r.errs.length + ' problem(s):');
    r.errs.slice(0, 60).forEach(e => console.error('    ' + e.code + ' ' + e.plan + ': ' + e.msg));
    process.exit(1);
  }
  const n = Object.keys(ctx.plans.plans).reduce((s, id) => s + ctx.plans.plans[id].days.length / 3, 0);
  console.log('check-plans: ' + Object.keys(ctx.plans.plans).length + ' plans, ' + n + ' days: every division, label, lock, legacy and migration check passes; teachings ' +
    Object.keys(ctx.plans.teach || {}).length + ', courses ' + Object.keys(ctx.plans.courses || {}).length + '.');
}
if (require.main === module) main();

module.exports = { parseLabel, parseRef, checkDivisions, checkMigration, checkTeachings, checkCourses, checkOwner };
