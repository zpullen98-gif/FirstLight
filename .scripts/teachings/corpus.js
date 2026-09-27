/* The Teachings: each day's text, cut into the units a key verse may cite.

   A unit is one citable piece of a day's passage, in the app's own
   translation: a verse, an ayah, a hymn's verse, a paragraph, one of
   Legge's numbered sections of a saying or of a Tao chapter. A key verse
   lies inside one unit. Each carries
     ref     how the teaching cites it ("Genesis 22:8", "Tao Te Ching 8"),
             in the form check-plans.js parses (parseRef)
     pre     the ref's fixed prefix ("Genesis", "Tao Te Ching"), and
     short   the rest ("22:8")
     txt     the words as the reader prints them, lines joined
     kind    verse | pre | colophon | argument | note | commentary | chant
     ch      the chapter it belongs to
     a, u    the global atom index and the unit's index inside it
     sub     for a chapter or hymn, the verse's number inside the atom
             (the second member of check-plans.js's at)
   Only kind "verse" may be a key verse. Giles' arguments and notes,
   Paramananda's commentary, the Gita's colophons and the Upanishads' peace
   chants are printed on the page but are not the text.

   Matching is exact after one normalisation (norm): curly and straight
   quotes are the same mark, whitespace runs are one space, Gutenberg's
   italic underscores are dropped, and Legge's section numbers at the start
   of a line ("1. ", "2. ") are not part of the text. Nothing else changes:
   case, parentheses, "Yahweh" and every comma stay. */
'use strict';
const fs = require('fs');
const path = require('path');
const A = require('../plans/atoms');
const C = require('../plans/config');
const { loadRuntime } = require('../plans/runtime');

const DASH = /[\u2012\u2013\u2014\u2015\u2E3A\u2E3B]|--/;

function norm(s) {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u201B\u2032`\u00B4]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/_/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
/* Legge (Tao, Analects) numbers the sections of a chapter at the start of a
   line; the number is his apparatus, not the text. */
function dropSectionNumbers(lines) {
  return lines.map(l => String(l).replace(/^\s*\d+\.\s+/, '').replace(/^\s*\d+\.\s*$/, ''));
}
function joinLines(lines) { return norm(lines.filter(l => String(l).trim()).join(' ')); }
function words(s) { return (String(s).match(/\S+/g) || []).length; }

let RT = null, ZNOTES = null;
const ATOMS = {};
function rt() { if (!RT) RT = loadRuntime(); return RT; }
function atomsOf(planId) { if (!ATOMS[planId]) ATOMS[planId] = A.buildAtoms(planId); return ATOMS[planId]; }

/* Giles' notes in the Zhuangzi are ordinary blocks in the baked text; in the
   Gutenberg source they are the paragraphs indented by one space. The map
   (chapter -> [block numbers]) is built once from the cached source by
   zhuangzi-notes.js and committed. */
function zhuangziNotes() {
  if (ZNOTES) return ZNOTES;
  const f = path.join(__dirname, 'zhuangzi-notes.json');
  if (!fs.existsSync(f)) throw new Error('zhuangzi-notes.json is missing: run node .scripts/teachings/zhuangzi-notes.js before any Zhuangzi teaching');
  ZNOTES = JSON.parse(fs.readFileSync(f, 'utf8'));
  return ZNOTES;
}

/* Every unit of one atom. */
function unitsOfAtom(planId, ai) {
  const P = atomsOf(planId), at = P.atoms[ai], c = at.coord;
  const label = rt().planLabelRange(planId, ai, ai);
  const out = [];
  const push = (kind, pre, short, txt, ch) => out.push({ ref: pre && short ? pre + ' ' + short : '', pre, short, txt, kind, ch, a: ai, u: out.length });

  if (planId === 'bible' || planId === 'tanakh') {
    const m = label.match(/^(.*) (\d+)$/);
    at.text().forEach((v, i) => { push('verse', m[1], m[2] + ':' + (i + 1), norm(v), label); out[out.length - 1].sub = i + 1; });
  } else if (planId === 'quran') {
    const m = label.match(/^(.*) (\d+:\d+)$/);
    push('verse', m[1], m[2], norm(at.text()[0]), 's' + c.s);
  } else if (planId === 'veda') {
    const m = label.match(/^(Rig Veda) (\d+\.\d+)$/);
    at.text().forEach((v, i) => { push('verse', m[1], m[2] + '.' + (i + 1), norm(v), label); out[out.length - 1].sub = i + 1; });
  } else if (planId === 'pali') {
    const t = at.text();
    if (t.length) {
      const pair = String(c.para).split(/\s*[\u2013-]\s*/);
      push('verse', 'Dhammapada', pair.length > 1 ? pair[0] + ' to ' + pair[1] : String(c.v), norm(t[0]), 'c' + c.ch);
      out[out.length - 1].last = pair[pair.length - 1];
    }
  } else if (planId === 'gita') {
    const ch = A.loadPart('gita-besant', 'all')[c.ch - 1];
    const v = ch.v[c.v - 1];
    if (c.v === 1 && ch.pre) push('pre', '', '', norm(ch.pre[1]), 'c' + c.ch);
    push('verse', 'Bhagavad Gita', c.ch + '.' + c.v, norm(v[1]), 'c' + c.ch);
    if (c.v === ch.v.length && ch.end) push('colophon', '', '', norm(ch.end), 'c' + c.ch);
  } else if (planId === 'tao') {
    const ch = A.loadPart('tao', 'all')[c.ch - 1];
    ch.b.forEach(blk => {
      const txt = joinLines(dropSectionNumbers(blk));
      if (txt) push('verse', 'Tao Te Ching', String(c.ch), txt, 'c' + c.ch);
    });
  } else if (planId === 'analects') {
    /* one unit per Legge section ("1. ", "2. " at a line's start), so a key
       verse never runs across his numbering */
    const secs = [];
    at.text().forEach(l => { if (!secs.length || /^\s*\d+\.\s/.test(l)) secs.push([]); secs[secs.length - 1].push(l); });
    secs.forEach(s => {
      const txt = joinLines(dropSectionNumbers(s));
      if (txt) push('verse', 'Analects', c.book + '.' + c.ch, txt, 'b' + c.book);
    });
  } else if (planId === 'zhuangzi') {
    const t = at.text(), first = norm(t[0] || '');
    let kind = 'verse';
    if (/^Argument\s*:/.test(first)) kind = 'argument';
    else if ((zhuangziNotes()[c.ch] || []).indexOf(c.p) > -1) kind = 'note';
    push(kind, 'Zhuangzi', c.ch + '.' + c.p, joinLines(t), 'c' + c.ch);
  } else if (planId === 'upanishads') {
    const e = A.loadPart('upanishads', 'all')[C.UPANISHAD_MAP.find(u => u.name === c.up).entry];
    const m = label.match(/^(.*) ([\d.]+)$/);
    const head = k => (e.b[k].length === 1 ? String(e.b[k][0]).trim() : '');
    let afterVerseHead = false, sawVerse = false;
    for (let k = c.from; k <= c.to; k++) {
      const h = head(k);
      if (C.UPANISHAD_HEADING.test(h)) {
        afterVerseHead = C.UPANISHAD_VERSE_HEADING.test(h);
        continue;
      }
      const txt = joinLines(e.b[k]);
      if (!txt) continue;
      if (afterVerseHead && !sawVerse) { push('verse', m[1], m[2], txt, c.up + ' ' + c.sec); sawVerse = true; }
      else if (!sawVerse) push('chant', '', '', txt, c.up);
      else push('commentary', '', '', txt, c.up);
      afterVerseHead = false;
    }
  } else throw new Error('corpus: unknown plan ' + planId);
  return out;
}

/* The day: its label, atom range and every unit in order. */
function dayOf(planId, d) {
  const r = rt(), day = r.planDay(planId, d);
  if (!day) throw new Error(planId + ': no day ' + d + ' (the plan has ' + r.planDays(planId) + ')');
  const units = [];
  for (let a = day.a0; a <= day.a1; a++) unitsOfAtom(planId, a).forEach(u => units.push(u));
  return { plan: planId, d, label: r.planDayLabel(planId, d), a0: day.a0, a1: day.a1, div: r.planDef(planId).div, units };
}

/* A key verse lies inside one unit: one verse, one ayah, one of Legge's
   sections, one paragraph. SPAN stays 1 so the reader's gate
   (check-plans.js, which cites one place) and this one agree. */
const SPAN = 1;

/* Where a candidate key verse sits in the day, if it is there verbatim.
   Returns { exact, ref, at, unit, kind, words, dash, starts, ends, problems },
   where at is check-plans.js's [atom, verse] or [atom]. */
function locate(planId, d, key) {
  const day = dayOf(planId, d);
  const k = norm(key);
  const res = { plan: planId, d, label: day.label, exact: false, ref: '', at: null, kind: '', words: words(k), dash: DASH.test(String(key)), starts: false, ends: false, problems: [] };
  if (!k) { res.problems.push('empty'); return res; }
  const U = day.units;
  let found = null;
  for (let i = 0; i < U.length && !found; i++) {
    for (let n = 1; n <= SPAN && i + n <= U.length && !found; n++) {
      const run = U.slice(i, i + n);
      if (run.some(u => u.ch !== U[i].ch || u.kind !== U[i].kind)) break;
      const joined = run.map(u => u.txt).join(' ');
      const firstLen = run[0].txt.length, lastStart = joined.length - run[n - 1].txt.length;
      let idx = joined.indexOf(k);
      while (idx > -1 && !found) {
        if (idx < firstLen && idx + k.length > lastStart) found = { run, joined, idx };
        idx = joined.indexOf(k, idx + 1);
      }
    }
  }
  /* A near miss is reported, so a curator can see what differs. */
  if (!found) {
    const probe = k.slice(0, 40);
    const hit = U.find(u => u.txt.indexOf(probe) > -1);
    if (hit) res.problems.push('the opening matches ' + (hit.ref || hit.kind) + ' but the wording then differs from the page');
    else res.problems.push('not in this day\u2019s passage');
    return res;
  }
  const run = found.run, first = run[0], last = run[run.length - 1];
  res.exact = true;
  res.kind = first.kind;
  res.at = first.sub ? [first.a, first.sub] : [first.a];
  res.unit = first.u;
  res.ref = run.length === 1 ? first.ref : first.pre + ' ' + first.short + ' to ' + (last.last || last.short);
  if (first.kind !== 'verse') res.problems.push('from ' + first.kind + ', which is printed on the page but is not the text');
  const before = found.joined.slice(0, found.idx);
  res.starts = found.idx === 0 || /[.?!;:]['")\]]*\s$/.test(before);
  res.ends = /[.?!]['")\]]*$/.test(k);
  if (!res.starts) res.problems.push('does not begin where a sentence begins');
  if (!res.ends) res.problems.push('does not end in a full stop, question mark or exclamation mark');
  if (res.dash) res.problems.push('contains a dash; choose another verse or stop before it');
  if (res.words < 4 || res.words > 60) res.problems.push(res.words + ' words; a key verse is 4 to 60');
  return res;
}

module.exports = { norm, words, DASH, dayOf, unitsOfAtom, locate, atomsOf, rt };
