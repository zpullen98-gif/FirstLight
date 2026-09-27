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
const crypto = require('crypto');
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

let BASE = null, RT = null, ZNOTES = null;
const ATOMS = {};
function base() { if (!BASE) BASE = loadRuntime(); return BASE; }
/* The app's runtime, with the tradition courses answered as plans: a
   course's days, a day's label and its division (see below). */
function rt() {
  if (!RT) {
    const b = base();
    RT = Object.assign({}, b, {
      planDays: id => isCourse(id) ? courseEntries(id).length : b.planDays(id),
      planDayLabel: (id, d) => isCourse(id) ? ((courseEntries(id)[d - 1] || {}).title || '') : b.planDayLabel(id, d),
      planDef: id => isCourse(id) ? { id, div: courseDiv(id), course: true } : b.planDef(id)
    });
  }
  return RT;
}
function atomsOf(planId) { if (!ATOMS[planId]) ATOMS[planId] = A.buildAtoms(planId); return ATOMS[planId]; }

/* ---- the tradition courses ----
   A course (#/hall/course-<tr>) takes its days from the tradition's chamber
   in the Library (FL_TRADITIONS: its concepts, then its practices, then its
   festivals), and a day's key line may come from anywhere in the tradition's
   own works in the app, as roster.json's courses map lists them. The tools
   treat "course-<tr>" as a plan: its days are the chamber's entries, a day's
   label is the entry's title, and its division is a hash of the entries, so a
   set written against a chamber that has since changed is refused. */
const ROSTER = JSON.parse(fs.readFileSync(path.join(__dirname, 'roster.json'), 'utf8'));
const COURSES = ROSTER.courses || {};
function isCourse(id) { const m = /^course-([a-z]+)$/.exec(String(id || '')); return !!(m && Array.isArray(COURSES[m[1]])); }
function courseTr(id) { return String(id).slice(7); }
function courseIds() { return Object.keys(COURSES).filter(k => Array.isArray(COURSES[k])).map(k => 'course-' + k); }
function courseWorks(id) { return COURSES[courseTr(id)].slice(); }
function courseEntries(id) { return base().courseDays(courseTr(id)); }
function courseDiv(id) {
  return crypto.createHash('sha1').update(JSON.stringify(courseEntries(id).map(e => [e.sec, e.i, e.title]))).digest('hex').slice(0, 10);
}

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

/* The day: its label, atom range and every unit in order. A course's day is
   its chamber entry; its units are empty, because its key line may come from
   any of its works (locateCourse). */
function dayOf(planId, d) {
  if (isCourse(planId)) {
    const E = courseEntries(planId), e = E[d - 1];
    if (!e) throw new Error(planId + ': no day ' + d + ' (the course has ' + E.length + ')');
    return { plan: planId, d, label: e.title, sec: e.sec, i: e.i, when: e.when, gloss: e.gloss,
             works: courseWorks(planId), div: courseDiv(planId), course: true, units: [] };
  }
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
function locate(planId, d, key, prefer) {
  if (isCourse(planId)) return locateCourse(planId, d, key, prefer);
  const day = dayOf(planId, d);
  const k = norm(key);
  const res = { plan: planId, d, label: day.label, exact: false, ref: '', at: null, kind: '', words: words(k), dash: DASH.test(String(key)), starts: false, ends: false, problems: [] };
  if (!k) { res.problems.push('empty'); return res; }
  /* prefer ({ a, u }): the unit a course placed the line in is tried first,
     for a line the day holds twice */
  const isPref = x => prefer && typeof prefer === 'object' && x.a === prefer.a && x.u === prefer.u;
  const U = prefer ? day.units.filter(isPref).concat(day.units.filter(x => !isPref(x))) : day.units;
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

/* Every unit of a work in order, each carrying its work (plan) and the work's
   day that holds it (pd): what a course searches and places a line in. */
const ALL_UNITS = {};
function unitsOfPlan(planId) {
  if (ALL_UNITS[planId]) return ALL_UNITS[planId];
  const r = rt(), n = r.planDays(planId), out = [];
  for (let d = 1; d <= n; d++) {
    const day = r.planDay(planId, d);
    for (let a = day.a0; a <= day.a1; a++) unitsOfAtom(planId, a).forEach(u => { u.plan = planId; u.pd = d; out.push(u); });
  }
  ALL_UNITS[planId] = out;
  return out;
}

/* Where a course day's key line lies in the tradition's works. Every unit
   holding the line is a place it may be cited from; the one whose ref is
   wantRef is taken (a refrain the Rig Veda repeats, a line two Psalms share),
   else the first citable one. Then locate() on that work's day judges it, as
   it judges a work's own key verse. Returns locate()'s result, with plan the
   course, d the course day, work and pd the work and its day, and also the
   other places the line stands. */
function locateCourse(id, d, key, wantRef) {
  const e = courseEntries(id)[d - 1];
  const k = norm(key);
  const res = { plan: id, d, label: e ? e.title : '', exact: false, ref: '', at: null, kind: '', words: words(k), dash: DASH.test(String(key)),
                starts: false, ends: false, problems: [], work: '', pd: 0, also: [] };
  if (!e) { res.problems.push('no day ' + d + ' in ' + id); return res; }
  if (!k) { res.problems.push('empty'); return res; }
  const works = courseWorks(id), hits = [];
  works.forEach(p => unitsOfPlan(p).forEach(u => { if (u.txt.indexOf(k) > -1) hits.push(u); }));
  if (!hits.length) {
    const probe = k.slice(0, 40);
    let near = null;
    works.some(p => (near = unitsOfPlan(p).find(u => u.txt.indexOf(probe) > -1) || null));
    res.problems.push(near ? 'the opening matches ' + (near.ref || near.kind) + ' (' + near.plan + ', day ' + near.pd + ') but the wording then differs from the page'
                           : 'not in ' + works.join(', '));
    return res;
  }
  const pick = (typeof wantRef === 'string' && hits.find(u => u.ref === wantRef)) || hits.find(u => u.kind === 'verse') || hits[0];
  const r = locate(pick.plan, pick.pd, key, { a: pick.a, u: pick.u });
  return Object.assign(r, { plan: id, d, label: e.title, work: pick.plan, pd: pick.pd,
                            also: hits.filter(u => u !== pick).map(u => u.plan + ' ' + (u.ref || u.kind)).slice(0, 8) });
}

/* A course's search: every citable unit of the given works that holds every
   word of the query (whole words, any case; a trailing * matches the word's
   start, so "forgiv*" finds forgive and forgiveness), or that matches
   /regex/flags. Returns { hits (at most limit), total }. */
function searchUnits(planIds, query, limit) {
  let test;
  const m = /^\/(.+)\/([a-z]*)$/.exec(String(query));
  if (m) {
    const re = new RegExp(m[1], m[2].indexOf('i') > -1 ? m[2] : m[2] + 'i');
    test = t => re.test(t);
  } else {
    const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const res = norm(query).split(' ').filter(Boolean).map(w => /\*$/.test(w)
      ? new RegExp('(^|[^A-Za-zÀ-ɏ])' + esc(w.slice(0, -1)), 'i')
      : new RegExp('(^|[^A-Za-zÀ-ɏ])' + esc(w) + '($|[^A-Za-zÀ-ɏ])', 'i'));
    test = t => res.every(re => re.test(t));
  }
  const hits = [];
  let total = 0;
  planIds.forEach(p => unitsOfPlan(p).forEach(u => {
    if (u.kind !== 'verse' || !test(u.txt)) return;
    total++;
    if (hits.length < (limit || 40)) hits.push(u);
  }));
  return { hits, total };
}

module.exports = { norm, words, DASH, dayOf, unitsOfAtom, locate, atomsOf, rt,
  isCourse, courseIds, courseTr, courseWorks, courseEntries, courseDiv, unitsOfPlan, locateCourse, searchUnits };
