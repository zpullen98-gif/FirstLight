/* The Readings: every plan's atoms, read from the baked texts.

   An atom is the smallest piece a day is made of (a chapter, a hymn, an
   ayah, a verse, a saying, a paragraph, an Upanishad verse with its
   commentary). Each atom carries:
     w       words the reader will read in it
     g       its group: a day of a short work never leaves its group, and a
             long work's rules for where a day may end are written per group
     coord   where it is, in the payload's own terms
     text()  exactly the strings the reader renders for it (verses,
             paragraphs, commentary; never headings or verse numbers)

   words(s) = (s.match(/\S+/g) || []).length, summed over text().

   Used by build-plans.js and, independently of the build's output, by the
   gate (check-plans.js), which rebuilds the atoms and compares. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const C = require('./config');

const cache = {};
/* Each js/texts file is one FLTextPut(work, part, data) call: run it
   against a stub and keep the data. */
function loadPart(work, part) {
  const key = work + '/' + part;
  if (cache[key]) return cache[key];
  const file = path.join(C.TEXTS, work, part + '.js');
  let out = null;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { FLTextPut: (w, p, d) => { out = d; } }, { filename: file });
  if (!out) throw new Error('no FLTextPut payload in ' + file);
  cache[key] = out;
  return out;
}
function loadIndex(work) {
  return JSON.parse(fs.readFileSync(path.join(C.TEXTS, work, 'index.json'), 'utf8'));
}

function words(s) { return (String(s).match(/\S+/g) || []).length; }
function wordsOf(list) { let n = 0; for (const s of list) n += words(s); return n; }
function flat(blocks) { const out = []; for (const b of blocks) for (const l of b) out.push(l); return out; }

function atom(g, coord, textFn) {
  const t = textFn();
  return { g: g, coord: coord, w: wordsOf(t), text: textFn };
}

/* ---- per work ---- */

function bookParts(work) {
  const idx = loadIndex(work);
  return idx.books.map(b => ({ part: b.part, book: b.book, chapters: b.chapters }));
}

function buildBible() {
  const seg = [], atoms = [];
  bookParts('bible').forEach((b, bi) => {
    const d = loadPart('bible', b.part);
    seg.push([b.book, b.part, d.ch.length]);
    d.ch.forEach((verses, ci) => atoms.push(atom(bi, { book: b.book, ch: ci + 1 }, () => verses)));
  });
  return { seg, atoms };
}

function buildTanakh() {
  const seg = [], atoms = [];
  bookParts('tanakh').forEach((b, bi) => {
    const d = loadPart('tanakh', b.part);
    seg.push([C.TANAKH_DISPLAY[b.book] || b.book, b.part, d.ch.length]);
    d.ch.forEach((verses, ci) => atoms.push(atom(bi, { book: b.book, ch: ci + 1 }, () => verses)));
  });
  return { seg, atoms };
}

function buildVeda() {
  const seg = [], atoms = [];
  for (let m = 1; m <= 10; m++) {
    const part = String(m).padStart(2, '0');
    const d = loadPart('rigveda', part);
    seg.push(['Mandala ' + m, part, d.hymns.length]);
    d.hymns.forEach((hy, hi) => {
      if (hy.h !== hi + 1) throw new Error('rigveda ' + part + ': hymn ' + hy.h + ' out of order');
      atoms.push(atom(m - 1, { m: m, h: hy.h }, () => hy.v));
    });
  }
  return { seg, atoms };
}

function buildQuran() {
  const d = loadPart('quran', 'all');
  const seg = [], atoms = [];
  d.forEach((s, si) => {
    if (s.n !== si + 1) throw new Error('quran: surah ' + s.n + ' out of order');
    seg.push([C.SURAH_NAMES[si], 'all', s.v.length]);
    s.v.forEach((t, ai) => atoms.push(atom(si, { s: s.n, a: ai + 1 }, () => [t])));
  });
  return { seg, atoms };
}

/* Muller prints nine verse pairs as one paragraph under a label like
   "58–59". The paragraph's words go to its first verse; the second verse
   is an atom of no words, so a day that holds the pair prints it once. */
function buildPali() {
  const d = loadPart('dhammapada', 'all');
  const seg = [], atoms = [];
  let expect = 1;
  d.forEach((c, ci) => {
    let count = 0;
    c.v.forEach(v => {
      const label = String(v[0]);
      const m = label.match(/^(\d+)(?:\s*[–-]\s*(\d+))?$/);
      if (!m) throw new Error('dhammapada: unreadable verse label ' + label);
      const lo = +m[1], hi = m[2] ? +m[2] : lo;
      for (let n = lo; n <= hi; n++) {
        if (n !== expect) throw new Error('dhammapada: verse ' + n + ' where ' + expect + ' was expected');
        expect++;
        const first = n === lo;
        atoms.push(atom(ci, { ch: ci + 1, v: n, para: label }, () => first ? [v[1]] : []));
        count++;
      }
    });
    seg.push([c.title, 'all', count]);
  });
  return { seg, atoms };
}

/* Besant's Gita under the standard numbers. The colophon ("Thus in the
   glorious Upanishads...") is read with the chapter's last verse, and
   Discourse 13's unnumbered opening question with its first. */
function buildGita() {
  const d = loadPart('gita-besant', 'all');
  const seg = [], atoms = [];
  d.forEach((c, ci) => {
    seg.push([c.title, 'all', c.v.length]);
    c.v.forEach((v, vi) => {
      if (v[0] !== vi + 1) throw new Error('gita-besant ' + c.n + ': verse ' + v[0] + ' out of order');
      const last = vi === c.v.length - 1;
      atoms.push(atom(ci, { ch: c.n, v: v[0] }, () => {
        const t = [];
        if (vi === 0 && c.pre) t.push(c.pre[1]);
        t.push(v[1]);
        if (last && c.end) t.push(c.end);
        return t;
      }));
    });
  });
  return { seg, atoms };
}

function buildTao() {
  const d = loadPart('tao', 'all');
  const atoms = d.map((c, ci) => {
    if ((c.n || ci + 1) !== ci + 1) throw new Error('tao: chapter ' + c.n + ' out of order');
    return atom(ci, { ch: ci + 1 }, () => flat(c.b));
  });
  return { seg: [['Tao Te Ching', 'all', atoms.length]], atoms };
}

function roman(s) {
  const v = { I: 1, V: 5, X: 10, L: 50 };
  let n = 0;
  for (let i = 0; i < s.length; i++) n += v[s[i]] < (v[s[i + 1]] || 0) ? -v[s[i]] : v[s[i]];
  return n;
}
/* Legge's sayings. A payload chapter is split wherever one of its lines
   opens with Legge's "CHAP. <numeral>" (the bake ran VII.17 into VII.16):
   the saying starts at that line, takes the numeral's number, and the
   "CHAP. XVII " prefix is neither counted nor printed. Every later saying in
   the book is numbered on from it. coord: book, ch (Legge's number), pch
   (the payload chapter), fromLine and toLine (flat line indices in it). The
   reader must split in the same way, by C.ANALECTS_CHAP. */
function buildAnalects() {
  const d = loadPart('analects', 'all');
  const seg = [], atoms = [];
  d.forEach((bk, bi) => {
    if (bk.n !== bi + 1) throw new Error('analects: book ' + bk.n + ' out of order');
    let next = 1;
    bk.ch.forEach((c, ci) => {
      if (c.n !== ci + 1) throw new Error('analects ' + bk.n + ': chapter ' + c.n + ' out of order');
      const lines = flat(c.b);
      const starts = [0];
      lines.forEach((l, j) => {
        const m = String(l).match(C.ANALECTS_CHAP);
        if (!m) return;
        if (j > 0) starts.push(j);
        const want = next + starts.length - 1;
        if (roman(m[1]) !== want) throw new Error('analects ' + bk.n + '.' + c.n + ': CHAP. ' + m[1] + ' where saying ' + want + ' was expected');
      });
      starts.forEach((from, i) => {
        const to = i + 1 < starts.length ? starts[i + 1] - 1 : lines.length - 1;
        const coord = { book: bk.n, ch: next, pch: c.n, fromLine: from, toLine: to };
        atoms.push(atom(bi, coord, () => {
          const t = lines.slice(from, to + 1);
          if (t.length) t[0] = String(t[0]).replace(C.ANALECTS_CHAP, '');
          return t;
        }));
        next++;
      });
    });
    seg.push([bk.title, 'all', next - 1]);
  });
  return { seg, atoms };
}

/* Giles' Zhuangzi: block 0 of each chapter is its title; paragraph n is
   block n, so the numbers the reader prints are the blocks' own. */
function buildZhuangzi() {
  const d = loadPart('zhuangzi', 'all');
  const seg = [], atoms = [];
  d.forEach((c, ci) => {
    let end = c.b.length;
    const bm = c.b.findIndex(b => b.length === 1 && b[0].trim() === C.ZHUANGZI_BACKMATTER);
    if (bm > -1) end = bm;
    seg.push([C.ZHUANGZI_TITLES[ci], 'all', end - 1, 1]);
    for (let k = 1; k < end; k++) {
      const blk = c.b[k];
      atoms.push(atom(ci, { ch: c.n, p: k }, () => blk.slice()));
    }
  });
  return { seg, atoms };
}

/* Paramananda: an atom is one verse group, the Roman heading with the verse
   and his commentary under it. Anything before an Upanishad's first verse
   (the opening Peace Chant) folds into that verse, anything after its last
   (the closing chant, "Here ends this Upanishad") into the last, and a "Part"
   heading goes with the verse it introduces. */
function buildUpanishads() {
  const d = loadPart('upanishads', 'all');
  const seg = [], atoms = [], blocks = [];
  C.UPANISHAD_MAP.forEach(u => {
    const e = d[u.entry];
    const excluded = k => u.exclude.some(r => k >= r[0] && k <= r[1]);
    const isText = k => !excluded(k);
    const head = k => (e.b[k].length === 1 ? e.b[k][0].trim() : '');
    const starts = [];
    for (let k = u.from; k <= u.to; k++) if (isText(k) && C.UPANISHAD_VERSE_HEADING.test(head(k))) starts.push(k);
    const want = u.sections.reduce((s, x) => s + x[1], 0);
    if (starts.length !== want) throw new Error(u.name + ': ' + starts.length + ' verse headings, expected ' + want);
    const bounds = starts.map((k, i) => {
      let s = k;
      if (i === 0) s = u.from;
      else while (s - 1 > starts[i - 1] && C.UPANISHAD_PART_HEADING.test(head(s - 1))) s--;
      return s;
    });
    let vi = 0;
    u.sections.forEach(sec => {
      const si = seg.length;
      seg.push([u.name, 'all', sec[1], sec[0]]);
      for (let v = 1; v <= sec[1]; v++, vi++) {
        const a = bounds[vi], b = vi + 1 < bounds.length ? bounds[vi + 1] - 1 : u.to;
        const ks = [];
        for (let k = a; k <= b; k++) if (isText(k)) ks.push(k);
        /* [entry, from, to, from, to, ...]: the block ranges the reader prints,
           which skip an excluded range lying inside the group */
        const br = [u.entry];
        ks.forEach(k => {
          if (br.length > 1 && br[br.length - 1] === k - 1) br[br.length - 1] = k;
          else br.push(k, k);
        });
        blocks.push(br);
        atoms.push(atom(si, { up: u.name, sec: sec[0], v: v, from: a, to: b }, () => {
          const t = [];
          ks.forEach(k => { if (!C.UPANISHAD_HEADING.test(head(k))) e.b[k].forEach(l => t.push(l)); });
          return t;
        }));
      }
    });
  });
  return { seg, atoms, blocks };
}

const BUILDERS = {
  bible: buildBible, tanakh: buildTanakh, veda: buildVeda, quran: buildQuran, pali: buildPali,
  gita: buildGita, tao: buildTao, analects: buildAnalects, zhuangzi: buildZhuangzi, upanishads: buildUpanishads
};

/* Where a day may end. cut[j] is true when a day may end after atom j-1
   (j = 1..n; cut[n] is always true); pen[j] is what ending there costs on
   top of the length. Short works also may not cross a group, which
   divide.js enforces from g. */
function cutRules(plan, atoms) {
  const n = atoms.length;
  const gw = {};
  atoms.forEach(a => { gw[a.g] = (gw[a.g] || 0) + a.w; });
  const cut = new Array(n + 1).fill(false), pen = new Array(n + 1).fill(0);
  cut[0] = true;
  for (let j = 1; j <= n; j++) {
    const groupEnd = j === n || atoms[j].g !== atoms[j - 1].g;
    if (plan.id === 'bible' || plan.id === 'tanakh' || plan.id === 'veda') cut[j] = true;
    else if (plan.id === 'quran') { cut[j] = true; if (!groupEnd) pen[j] = C.P_MID; }
    else if (plan.id === 'zhuangzi') cut[j] = groupEnd || gw[atoms[j - 1].g] > C.TARGET;
    else cut[j] = groupEnd || gw[atoms[j - 1].g] > C.SHORT_MAX;
  }
  return { cut, pen, groupWords: gw };
}

function buildAtoms(planId) {
  const plan = C.PLAN_BY_ID[planId];
  if (!plan) throw new Error('unknown plan ' + planId);
  const r = BUILDERS[planId]();
  const rules = cutRules(plan, r.atoms);
  return {
    id: plan.id, work: plan.work, unit: plan.unit, kind: plan.kind,
    seg: r.seg, atoms: r.atoms, blocks: r.blocks || null,
    cut: rules.cut, pen: rules.pen, groupWords: rules.groupWords,
    max: plan.kind === 'short' ? C.SHORT_MAX : C.LONG_MAX,
    oneGroup: plan.kind === 'short'
  };
}

module.exports = { buildAtoms, loadPart, loadIndex, words, wordsOf };
