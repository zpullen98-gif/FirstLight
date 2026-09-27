/* The Teachings gate: the authoring sets in .scripts/plans/teachings/, held
   to the rules brief before anything reaches the reader.

   check-plans.js holds the SHIPPED file to its contract (verbatim at its
   place, one sentence, a roster name, no dash). This gate holds the
   AUTHORING set to the whole brief, day by day, against the real texts
   (.scripts/teachings/corpus.js):
     the day      in range, in order, once; its label is the plan's label now
                  (a moved division fails every entry written against it)
     the key      verbatim in the day's passage, inside one verse, from the
                  text and not a note, a commentary, a chant or a colophon;
                  begins where a sentence begins and ends in . ? or !; 4 to 60
                  words; no dash; curly quotes only; ref and at are where it is
     the sentence one sentence, one semicolon, a full stop; at most 45 words,
                  or 60 when two commentators are named (the owner, 2026-09-26);
                  a plain sense that gives context and repeats no four words
                  in a row of the key verse; after the semicolon
                  a commentator on this plan's closed roster, covering the
                  day's book, then a verb of reading (reads, takes, hears,
                  explains, understands); a school named where one is needed;
                  no other tradition's commentators; no ranking words; no
                  quotation of more than three words; no you or we; no
                  honorific; British spelling; no dash; curly quotes only;
                  the plan's forbidden terms fail and its watch list warns
     the source   leads with the commentator's name; a year, or the "as given
                  in" form of a conduit; at most 160 characters; no dash
     the set      the plan's current division; no key and no sentence twice;
                  Matthew Henry at most one day in ten; a spread warning when
                  one commentator holds more than three days in five

   Usage:
     node .scripts/check-teachings.js                    every set (exit 1 on failure)
     node .scripts/check-teachings.js --candidate <file> a batch before it lands, with the set it joins
     node .scripts/check-teachings.js --selftest         break every rule on a fixture, then the real texts */
'use strict';
const fs = require('fs');
const path = require('path');
const corpus = require('./teachings/corpus');
const C = require('./plans/config');

const ROSTER = JSON.parse(fs.readFileSync(path.join(__dirname, 'teachings', 'roster.json'), 'utf8'));
const SET_DIR = path.join(__dirname, 'plans', 'teachings');

const DASH = /[\u2012\u2013\u2014\u2015\u2E3A\u2E3B]|--/;
const STRAIGHT = /['"]/;
const VERB = /\b(reads|takes|hears|explains|understands)\b/;
const PRONOUN = /\b(you|your|yours|yourself|yourselves|we|our|ours|ourselves|us)\b/i;
const HONORIFIC = /\b(Saint|St\.|Sri|Shri|Hazrat|pbuh|PBUH|Venerable|Lord Buddha|Lord Krishna)\b|\uFDFA/;
const BANNED = [
  [/\bproves?\b/i, 'proves'], [/\bthe true meaning\b/i, 'the true meaning'], [/\bactually\b/i, 'actually'],
  [/\brightly\b/i, 'rightly'], [/\bmore accurately\b/i, 'more accurately'], [/\bunlike\b/i, 'unlike'],
  [/\bfulfil(s|led|ment)?\b/i, 'fulfils'], [/\banticipates?\b/i, 'anticipates'], [/\ball (faiths|religions|traditions)\b/i, 'all faiths'],
  [/\b(superior|inferior)\b/i, 'superior or inferior'], [/\bcorrectly\b/i, 'correctly'], [/\bmistaken(ly)?\b/i, 'mistaken']
];
const WATCH = [[/\bshows?\b/i, 'shows'], [/\breveals?\b/i, 'reveals'], [/\bbetter\b/i, 'better'], [/\bforeshadow/i, 'foreshadows']];
/* the owner's caps (checkpoint, 2026-09-26): one commentator, two */
const CAP1 = 45, CAP2 = 60;
/* Four words in a row from the key verse, in the plain sense, repeat it. */
function repeated(plain, key) {
  const w = s => corpus.norm(s).toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF' ]+/g, ' ').split(/\s+/).filter(Boolean);
  const k = w(key), p = w(plain);
  const grams = new Set();
  for (let i = 0; i + 4 <= k.length; i++) grams.add(k.slice(i, i + 4).join(' '));
  for (let i = 0; i + 4 <= p.length; i++) { const g = p.slice(i, i + 4).join(' '); if (grams.has(g)) return g; }
  return '';
}
const ABBREV = /\b(vols?|pp?|chs?|nos?|eds?|trans|cf|ca|ff|vv?|sect?|bk|col|fol|repr)\.\s/gi;

function words(s) { return (String(s).match(/\S+/g) || []).length; }
function termRe(t) { return new RegExp('(^|[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF])'); }

/* Every spelling a person may be named by in a sentence's reading. */
function namesOf(id) {
  const p = ROSTER.people[id];
  if (!p) return [];
  return [p.name].concat(p.alsoName ? [p.alsoName] : [], p.names || []);
}
/* Every recognised spelling (display names, work names and aliases) of every
   person on some plan's roster, with the person's id. */
const ALL_NAMES = [];
Object.keys(ROSTER.people).forEach(id => {
  const p = ROSTER.people[id];
  namesOf(id).concat(p.aliases || []).forEach(n => ALL_NAMES.push({ n, id }));
});
ALL_NAMES.sort((a, b) => b.n.length - a.n.length);

function planIds() { return C.PLANS.map(p => p.id).concat(corpus.courseIds()); }
/* A course's roster: everyone on the rosters of the works its lines may come
   from (each line is then held to its own work's roster). */
function rosterOf(planId) {
  if (!corpus.isCourse(planId)) return ROSTER.plans[planId];
  const out = { commentators: [], conduits: [], forbid: [], watch: [] };
  corpus.courseWorks(planId).forEach(w => {
    const P = ROSTER.plans[w];
    Object.keys(out).forEach(k => (P[k] || []).forEach(x => { if (!out[k].includes(x)) out[k].push(x); }));
  });
  return out;
}

/* A course day's entry. Its label is the chamber entry's title; its key line
   stands somewhere in the tradition's works (corpus.locateCourse); and the
   rest is held to the brief exactly as a teaching of that work would be, on
   the work's day that holds the line: that work's roster, coverage,
   forbidden words and quotation rules. work and pd, when given (land-batch.js
   writes them), must be where the line stands. */
function checkCourseEntry(e, ctx) {
  const errors = [], warns = [];
  const planId = ctx.planId, at = 'day ' + e.d + ': ';
  if (!(Number.isInteger(e.d) && e.d >= 1 && e.d <= ctx.nDays)) { errors.push(at + 'no such day (the course has ' + ctx.nDays + ')'); return { errors, warns }; }
  const day = corpus.dayOf(planId, e.d);
  if (e.label !== day.label) errors.push(at + 'label "' + e.label + '" is not the chamber’s entry now, "' + day.label + '" (the chamber changed)');
  const key = String(e.key || '');
  const loc = corpus.locateCourse(planId, e.d, key, e.ref);
  if (!loc.exact) {
    errors.push(at + 'the key line is not verbatim in ' + corpus.courseWorks(planId).join(', ') + ': ' + loc.problems.join('; '));
    return { errors, warns };
  }
  if (e.work !== undefined && e.work !== loc.work) errors.push(at + 'work "' + e.work + '", but the line stands in ' + loc.work);
  if (e.pd !== undefined && e.pd !== loc.pd) errors.push(at + 'pd ' + e.pd + ', but the line stands on ' + loc.work + ' day ' + loc.pd);
  const r = corpus.rt();
  const x = Object.assign({}, e, { d: loc.pd, label: r.planDayLabel(loc.work, loc.pd) });
  const w = checkEntry(x, { planId: loc.work, nDays: r.planDays(loc.work) });
  const pre = 'day ' + loc.pd + ': ', where = at + '(' + loc.work + ', day ' + loc.pd + ') ';
  const re = m => (m.indexOf(pre) === 0 ? where + m.slice(pre.length) : at + m);
  w.errors.forEach(m => errors.push(re(m)));
  w.warns.forEach(m => warns.push(re(m)));
  return { errors, warns };
}
function bookOf(planId, ref) {
  if (planId !== 'bible' && planId !== 'tanakh') return null;
  const m = String(ref).match(/^(.+) \d+:\d+$/);
  return m ? m[1] : null;
}
function covers(id, planId, ref, s) {
  const p = ROSTER.people[id];
  const cov = p && p.coverage && p.coverage[planId];
  if (!cov) return p ? p.name + ' is not on the ' + planId + ' roster' : 'no such commentator ' + id;
  if (cov === 'all') return '';
  if (cov === 'sri-bhasya') return /\u015Ar\u012B Bh\u0101\u1E63ya/.test(s) ? '' : p.name + ' wrote no commentary on these Upanishads: name him only where the \u015Ar\u012B Bh\u0101\u1E63ya treats the verse, and name it';
  if (Array.isArray(cov)) {
    const b = bookOf(planId, ref);
    return cov.includes(b) ? '' : p.name + '\u2019s commentary does not cover ' + b;
  }
  return 'unreadable coverage for ' + id;
}

/* One entry. ctx: { planId, nDays }. Returns { errors, warns }. */
function checkEntry(e, ctx) {
  if (corpus.isCourse(ctx.planId)) return checkCourseEntry(e, ctx);
  const errors = [], warns = [];
  const planId = ctx.planId, P = ROSTER.plans[planId];
  const at = 'day ' + e.d + ': ';
  const err = m => errors.push(at + m), warn = m => warns.push(at + m);
  if (!(Number.isInteger(e.d) && e.d >= 1 && e.d <= ctx.nDays)) { err('no such day (the plan has ' + ctx.nDays + ')'); return { errors, warns }; }
  const day = corpus.dayOf(planId, e.d);
  if (e.label !== day.label) err('label "' + e.label + '" is not the plan\u2019s label now, "' + day.label + '" (the division moved)');

  /* the key */
  const key = String(e.key || '');
  if (key !== key.trim()) err('the key has space at an end');
  if (STRAIGHT.test(key)) err('straight quotes in the key: curly only');
  const loc = corpus.locate(planId, e.d, key);
  if (!loc.exact) err('the key is not verbatim in the day: ' + loc.problems.join('; '));
  else {
    loc.problems.forEach(p => err('the key ' + p));
    if (e.ref !== loc.ref) err('ref "' + e.ref + '", but the key is at ' + loc.ref);
    if (JSON.stringify(e.at) !== JSON.stringify(loc.at)) err('at ' + JSON.stringify(e.at) + ', but the key is at ' + JSON.stringify(loc.at));
  }
  if (DASH.test(String(e.ref || ''))) err('a dash in the ref');

  /* the sentence */
  const s = String(e.s || '');
  const semi = (s.match(/;/g) || []).length;
  if (!s.trim()) { err('no sentence'); return { errors, warns }; }
  if (s !== s.trim()) err('the sentence has space at an end');
  if (!/\.$/.test(s)) err('the sentence does not end in a full stop');
  if (/[?!]/.test(s)) err('a question or exclamation mark in the sentence');
  if (semi !== 1) err(semi + ' semicolons: the form is <plain sense>; <commentator>, <place>, reads it as <reading>.');
  const bare = s.replace(ABBREV, 'x ').replace(/\b[A-Z]\.\s/g, 'X ');
  if (/[.]\s+\S/.test(bare)) err('more than one sentence');
  const two = !!e.by2;
  const w = words(s);
  if (w > (two ? CAP2 : CAP1)) err('sentence of ' + w + ' words (at most ' + (two ? CAP2 : CAP1) + ')');
  const parts = s.split(';');
  const plain = parts[0] || '', reading = (parts.slice(1).join(';') || '').trim();

  const roster = P ? P.commentators : [];
  if (!roster.includes(e.by)) err('by "' + e.by + '" is not on the ' + planId + ' roster');
  const opens = namesOf(e.by).filter(n => reading.indexOf(n) === 0);
  if (!opens.length) err('the reading must open with ' + (ROSTER.people[e.by] ? '"' + ROSTER.people[e.by].name + '"' : 'a roster name') + ' after the semicolon');
  const cov = covers(e.by, planId, e.ref, s);
  if (cov) err(cov);
  if (two) {
    if (!roster.includes(e.by2)) err('by2 "' + e.by2 + '" is not on the ' + planId + ' roster');
    else {
      if (!namesOf(e.by2).some(n => reading.indexOf(n) > 0)) err('the second commentator, ' + ROSTER.people[e.by2].name + ', is not named in the reading');
      const c2 = covers(e.by2, planId, e.ref, s);
      if (c2) err(c2);
    }
  }
  /* a school named where one is needed */
  [e.by].concat(two ? [e.by2] : []).forEach(id => {
    const p = ROSTER.people[id];
    if (!p || !p.school) return;
    const needs = two || id === 'ramanuja' || id === 'madhva';
    if (needs && s.indexOf('(' + p.school + ')') < 0 && !(id === 'tabarsi')) err('name ' + p.name + '\u2019s school as "(' + p.school + ')"');
  });
  if (!VERB.test(reading)) err('the reading has no verb of reading (reads, takes, hears, explains, understands)');

  /* names: nobody from another roster; nobody but the named commentators */
  const named = new Set([e.by].concat(two ? [e.by2] : []));
  const seen = new Set();
  ALL_NAMES.forEach(x => {
    if (seen.has(x.n)) return;
    if (!termRe(x.n).test(s)) return;
    ALL_NAMES.filter(y => y.n.indexOf(x.n) > -1).forEach(y => seen.add(y.n));
    if (!roster.includes(x.id)) err('names ' + x.n + ', who is not on the ' + planId + ' roster (never another tradition)');
    else if (!named.has(x.id)) err('names ' + x.n + ' without by2');
  });
  namesOf(e.by).concat(two ? namesOf(e.by2) : []).forEach(n => { if (termRe(n).test(plain)) err('the plain sense names ' + n + ': the reading is attributed only after the semicolon'); });
  /* the plain sense gives the context; the verse is printed just above it */
  const rep = repeated(plain, key);
  if (rep) err('the plain sense repeats the key verse ("' + rep + '"): give the chapter\u2019s context instead');

  /* style */
  [['sentence', s], ['source', e.src || '']].forEach(([what, t]) => {
    if (DASH.test(t)) err('a dash in the ' + what);
    if (STRAIGHT.test(t)) err('straight quotes in the ' + what + ': curly only');
  });
  if (PRONOUN.test(s)) err('"' + s.match(PRONOUN)[0] + '" in the sentence: no you or we');
  if (HONORIFIC.test(s)) err('an honorific in the sentence: ' + s.match(HONORIFIC)[0]);
  if (C.AMERICAN.test(s)) err('American spelling: ' + s.match(C.AMERICAN)[0]);
  BANNED.forEach(([re, t]) => { if (re.test(s)) err('"' + t + '" may not appear in a teaching (no ranking, no claim of proof)'); });
  WATCH.forEach(([re, t]) => { if (re.test(s)) warn('"' + t + '": read it again for ranking or claim'); });
  (P ? P.forbid : []).forEach(t => { if (termRe(t).test(s)) err('"' + t + '" is forbidden in the ' + planId + ' plan'); });
  (P ? P.watch : []).forEach(t => { if (termRe(t).test(s)) warn('"' + t + '" is on the ' + planId + ' watch list'); });
  /* words the translation prints that the sentence's own voice does not
     (the Qur'an's "Allah": the app writes "God", keeping "Allah" for a quotation) */
  const unquoted = s.replace(/(^|[\s(])[‘“][^”]*?[’”](?=[\s,;.:)]|$)/g, '$1');
  (P && P.quoteOnly ? P.quoteOnly : []).forEach(t => { if (termRe(t).test(unquoted)) err('"' + t + '" outside a quotation: the sentence’s own voice writes ' + (P.quoteOnlyUse || 'another word')); });
  const qre =/(^|[\s(])[\u2018\u201C]([^\u201D]*?)[\u2019\u201D](?=[\s,;.:)]|$)/g;
  let q;
  while ((q = qre.exec(s))) if (words(q[2]) > 3) err('a quotation of ' + words(q[2]) + ' words in the sentence (at most three)');

  /* the source line */
  const src = String(e.src || '');
  if (!src) err('no source line');
  else {
    if (!namesOf(e.by).some(n => src.indexOf(n) === 0 || src.indexOf(n.charAt(0).toUpperCase() + n.slice(1)) === 0)) err('the source line must lead with ' + (ROSTER.people[e.by] ? ROSTER.people[e.by].name : 'the commentator'));
    if (src.length > 160) err('source line of ' + src.length + ' characters (at most 160)');
    if (!/\b(1[0-9]{3}|20[0-2][0-9])\b/.test(src) && src.indexOf('as given in') < 0) err('the source line gives no year of the edition read, and is not in the "as given in" form');
  }
  if (e.hedge) {
    if (!(P && P.conduits.includes(e.hedge))) err('hedge "' + e.hedge + '" is not a conduit for ' + planId);
    else if (src.indexOf('as given in') < 0) err('a hedged entry\u2019s source line reads "<name>, as given in <conduit>"');
  }
  return { errors, warns };
}

/* A whole set, or a candidate joined to one. opts.full requires every day. */
function checkSet(set, opts) {
  opts = opts || {};
  const errors = [], warns = [];
  const planId = set && set.plan;
  if (!planIds().includes(planId)) return { errors: ['no such plan: ' + planId], warns, n: 0 };
  const rt = corpus.rt();
  const nDays = rt.planDays(planId), div = rt.planDef(planId).div;
  if (set.div !== div) errors.push('written against division ' + set.div + ', the plan is ' + div + ' now');
  const days = set.days || [];
  let last = 0;
  const keys = {}, sents = {}, by = {};
  days.forEach(e => {
    if (!(e.d > last)) errors.push('day ' + e.d + ' is out of order or given twice');
    last = Math.max(last, e.d || 0);
    const r = checkEntry(e, { planId, nDays });
    r.errors.forEach(m => errors.push(m));
    r.warns.forEach(m => warns.push(m));
    const k = corpus.norm(e.key || '').toLowerCase();
    if (keys[k]) errors.push('day ' + e.d + ': the same key as day ' + keys[k]); else keys[k] = e.d;
    const sn = corpus.norm(e.s || '').toLowerCase();
    if (sents[sn]) errors.push('day ' + e.d + ': the same sentence as day ' + sents[sn]); else sents[sn] = e.d;
    by[e.by] = (by[e.by] || 0) + 1;
  });
  if (opts.full && days.length !== nDays) errors.push(days.length + ' of ' + nDays + ' days: a set ships only complete');
  if (by['matthew-henry'] && by['matthew-henry'] > Math.floor(nDays / 10)) errors.push('Matthew Henry on ' + by['matthew-henry'] + ' days: at most one day in ten (' + Math.floor(nDays / 10) + ')');
  if (days.length >= 10) Object.keys(by).forEach(id => {
    if (by[id] / days.length > 0.6 && (rosterOf(planId).commentators.length > 1)) warns.push(ROSTER.people[id].name + ' holds ' + by[id] + ' of ' + days.length + ' days: is another commentator surviving and unused');
  });
  if (corpus.isCourse(planId)) courseSetWarns(planId, days).forEach(m => warns.push(m));
  return { errors, warns, n: days.length };
}
/* A course's lines, read against its works: a line that is already the key
   verse of its work's own teaching that day gives the reader the same line
   twice; and a course of several works drawn from one alone is noted. */
function courseSetWarns(planId, days) {
  const out = [], from = {};
  days.forEach(e => {
    const loc = corpus.locateCourse(planId, e.d, String(e.key || ''), e.ref);
    if (!loc.exact) return;
    from[loc.work] = (from[loc.work] || 0) + 1;
    const own = readSet(loc.work);
    const same = own && (own.days || []).find(t => corpus.norm(t.key || '').toLowerCase() === corpus.norm(e.key || '').toLowerCase());
    if (same) out.push('day ' + e.d + ': the same line is the key verse of ' + loc.work + ' day ' + same.d + '; another line serves the reader better if one fits');
  });
  const works = corpus.courseWorks(planId);
  if (works.length > 1 && days.length >= 10) works.forEach(w => { if (!from[w]) out.push('no line from ' + w + ' in ' + days.length + ' days: is every line from ' + Object.keys(from).join(' and ') + ' the best one'); });
  return out;
}

function readSet(planId) {
  const f = path.join(SET_DIR, planId + '.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}

/* A batch before it lands: { plan, batch, days: [...] }, joined to the set it
   will join, so a key or sentence already landed counts as a repeat. */
function checkCandidate(file) {
  const cand = JSON.parse(fs.readFileSync(file, 'utf8'));
  /* the label is the plan's, filled in here as land-batch.js fills it */
  cand.days.forEach(e => { if (!e.label && Number.isInteger(e.d) && e.d >= 1 && e.d <= corpus.rt().planDays(cand.plan)) e.label = corpus.rt().planDayLabel(cand.plan, e.d); });
  const set = readSet(cand.plan) || { plan: cand.plan, div: corpus.rt().planDef(cand.plan).div, days: [] };
  /* a batch being revised and re-landed (land-batch.js --replace) is checked
     against the set without its own earlier landing */
  if (cand.batch) set.days = set.days.filter(e => e.batch !== cand.batch);
  const landed = new Set(set.days.map(e => e.d));
  const clash = cand.days.filter(e => landed.has(e.d)).map(e => e.d);
  const joined = { plan: set.plan, div: set.div, days: set.days.concat(cand.days).sort((a, b) => a.d - b.d) };
  const r = checkSet(joined, {});
  if (clash.length) r.errors.unshift('days already landed: ' + clash.join(', '));
  if (cand.div && cand.div !== set.div) r.errors.unshift('the batch was written against division ' + cand.div);
  return r;
}

function report(name, r) {
  console.log('  ' + (r.errors.length ? 'FAIL' : 'ok  ') + ' ' + name + ': ' + r.n + ' day(s), ' + r.errors.length + ' error(s), ' + r.warns.length + ' warning(s)');
  r.errors.forEach(m => console.log('         ' + m));
  r.warns.forEach(m => console.log('    warn ' + m));
}

/* ---------------------------------------------------------------- selftest */
function selftest() {
  const failures = [];
  let held = 0;
  const rt = corpus.rt();
  const good = {
    d: 8, label: 'Tao Te Ching 8', key: 'The highest excellence is like (that of) water.', ref: 'Tao Te Ching 8', at: [7],
    s: 'The chapter likens the highest excellence to water, which benefits all things and takes the low place; Wang Bi, on chapter 8, reads the low place as the way of the Tao.',
    by: 'wang-bi', src: 'Wang Bi, Commentary on the Laozi, chapter 8, fixture text (1782)', batch: 'fixture'
  };
  const setOf = list => ({ plan: 'tao', div: rt.planDef('tao').div, days: list });
  const base = checkSet(setOf([good]), {});
  if (base.errors.length) failures.push('the good fixture fails: ' + base.errors.join(' | '));
  else { held++; console.log('  ok   the good fixture passes'); }

  const q = (a, b) => String.fromCharCode(a) + b + String.fromCharCode(a === 0x2018 ? 0x2019 : 0x201D);
  const cases = [
    ['key not verbatim', e => { e.key = 'The highest excellence is like water.'; }, /not verbatim/],
    ['key with a dash', e => { e.key = 'The highest excellence ' + String.fromCharCode(0x2014) + ' is like (that of) water.'; }, /verbatim|dash/],
    ['key from another day', e => { e.d = 9; e.label = 'Tao Te Ching 9'; }, /not verbatim/],
    ['key with straight quotes', e => { e.key = "The highest excellence is like (that of) water's."; }, /straight quotes/],
    ['key mid-sentence', e => { e.key = 'excellence is like (that of) water.'; }, /sentence begins/],
    ['key without a stop', e => { e.key = 'The highest excellence is like (that of) water'; }, /full stop/],
    ['ref elsewhere', e => { e.ref = 'Tao Te Ching 9'; }, /ref "/],
    ['at elsewhere', e => { e.at = [8]; }, /^day 8: at /],
    ['label moved', e => { e.label = 'Tao Te Ching 8 to 9'; }, /label/],
    ['day out of range', e => { e.d = 82; }, /no such day/],
    ['two semicolons', e => { e.s = e.s.replace(' and takes', '; and takes'); }, /semicolons/],
    ['two sentences', e => { e.s = e.s.replace(' which benefits', '. It benefits'); }, /more than one sentence/],
    ['a question', e => { e.s = e.s.replace(/\.$/, '?'); }, /question|full stop/],
    ['46 words', e => { e.s = e.s.replace('the way of the Tao', 'the way of the Tao ' + 'and so on '.repeat(5).trim()); }, /words \(at most 45\)/],
    ['the plain sense repeats the verse', e => { e.s = e.s.replace('The chapter likens the highest excellence to water, which benefits all things and takes the low place', 'The chapter says the highest excellence is like water'); }, /repeats the key verse/],
    ['opens with no roster name', e => { e.s = e.s.replace('Wang Bi, on', 'the old commentary, on'); }, /must open with/],
    ['another tradition named', e => { e.s = e.s.replace('the way of the Tao', 'what Rashi calls humility'); }, /not on the tao roster/],
    ['a second name without by2', e => { e.s = e.s.replace('the way of the Tao', 'the way the Heshang Gong commentary also takes'); }, /without by2/],
    ['the plain sense names the commentator', e => { e.s = 'Wang Bi likens the highest excellence to water; Wang Bi, on chapter 8, reads the low place as the way of the Tao.'; }, /plain sense names/],
    ['a pronoun', e => { e.s = e.s.replace('takes the low place', 'takes the low place we avoid'); }, /no you or we/],
    ['an honorific', e => { e.s = e.s.replace('the highest excellence', 'the highest excellence of Saint Nobody'); }, /honorific/],
    ['American spelling', e => { e.s = e.s.replace('the low place;', 'the low place of honor;'); }, /American/],
    ['straight quotes', e => { e.s = e.s.replace('the low place as', "the 'low place' as"); }, /straight quotes/],
    ['a dash in the sentence', e => { e.s = e.s.replace(' which benefits', ' ' + String.fromCharCode(0x2014) + ' which benefits'); }, /dash in the sentence/],
    ['a ranking word', e => { e.s = e.s.replace('reads the low place', 'rightly reads the low place'); }, /rightly/],
    ['a claim of proof', e => { e.s = e.s.replace('reads the low place as', 'reads the low place as what proves'); }, /proves/],
    ['a long quotation', e => { e.s = e.s.replace('the way of the Tao', q(0x2018, 'the way of the Tao itself')); }, /quotation of 6 words/],
    ['no verb of reading', e => { e.s = e.s.replace('reads the low place as', 'sees in the low place'); }, /verb of reading/],
    ['by is someone else', e => { e.by = 'heshang-gong'; }, /must open with/],
    ['by off the roster', e => { e.by = 'rashi'; }, /not on the tao roster/],
    ['source without the name', e => { e.src = 'Commentary on the Laozi, chapter 8 (1782)'; }, /lead with/],
    ['source too long', e => { e.src = e.src + ' x'.repeat(60); }, /160/],
    ['source without a year', e => { e.src = 'Wang Bi, Commentary on the Laozi, chapter 8'; }, /no year/],
    ['a hedge without its form', e => { e.hedge = 'legge-sbe39'; }, /as given in/],
    ['a second commentator unnamed', e => { e.by2 = 'heshang-gong'; }, /second commentator/],
  ];
  cases.forEach(([name, mut, re]) => {
    const e = JSON.parse(JSON.stringify(good));
    mut(e);
    const r = checkSet(setOf([e]), {});
    if (r.errors.some(m => re.test(m))) { held++; }
    else failures.push(name + ': expected ' + re + ', got ' + (r.errors.join(' | ') || 'no error'));
  });
  console.log('  ok   ' + (cases.length - failures.filter(f => cases.some(c => f.indexOf(c[0] + ':') === 0)).length) + ' of ' + cases.length + ' broken fixtures fail as they should');

  /* set-level rules */
  const e2 = JSON.parse(JSON.stringify(good));
  const setCases = [
    ['a day twice', setOf([good, e2]), /out of order or given twice/],
    ['the same key twice', setOf([good, Object.assign({}, e2, { d: 9, label: 'Tao Te Ching 9' })]), /same key/],
    ['a moved division', Object.assign(setOf([good]), { div: '0000000000' }), /division/],
    ['incomplete when full', setOf([good]), /ships only complete/, { full: true }],
  ];
  setCases.forEach(([name, set, re, opts]) => {
    const r = checkSet(set, opts || {});
    if (r.errors.some(m => re.test(m))) held++;
    else failures.push(name + ': expected ' + re + ', got ' + (r.errors.join(' | ') || 'no error'));
  });
  console.log('  ok   set rules: a day twice, a key twice, a moved division, a partial set shipped whole');

  /* the real texts: five of the chambers' epigraphs (data-traditions.js) are
     quoted in another translation than the one the app prints, so none may
     be a key verse anywhere in its plan: the gate reads the app's text, not
     a remembered one */
  const TR = (() => {
    const ctx = {};
    require('vm').runInNewContext(fs.readFileSync(path.join(C.ROOT, 'js', 'data-traditions.js'), 'utf8') + '\n;this.T = FL_TRADITIONS;', ctx);
    return ctx.T || [];
  })();
  const EPI_PLAN = { 'Rig Veda': 'veda', 'The Basmala': 'quran', 'Dhammapada': 'pali', 'Analects': 'analects', 'Tao Te Ching': 'tao' };
  let epis = 0;
  TR.forEach(T => {
    const ep = T.epigraph;
    if (!ep) return;
    const pre = Object.keys(EPI_PLAN).find(k => ep[1].indexOf(k) === 0);
    if (!pre) return;
    const pid = EPI_PLAN[pre];
    epis++;
    let hit = 0;
    for (let d = 1; d <= rt.planDays(pid); d++) if (corpus.locate(pid, d, ep[0]).exact) hit = d;
    if (hit) failures.push(pid + ': the chamber epigraph "' + ep[0].slice(0, 40) + '" located on day ' + hit);
    else held++;
  });
  if (epis !== 5) failures.push('expected five chamber epigraphs to test, found ' + epis);
  else console.log('  ok   the five chamber epigraphs quoted from other translations never pass as a key verse');

  /* a school unnamed: Ramanuja on the Gita, without "(Visistadvaita)" */
  {
    const k = 'Thy business is with the action only, never with its fruits; so let not the fruit of action be thy motive, nor be thou to inaction attached.';
    const lg = corpus.locate('gita', 2, k);
    const ge = { d: 2, label: rt.planDayLabel('gita', 2), key: k, ref: lg.ref, at: lg.at,
      s: 'Krishna, answering Arjuna\u2019s refusal to fight, turns to deeds and their rewards; ' + ROSTER.people.ramanuja.name + ', G\u012bt\u0101 Bh\u0101\u1e63ya 2.47, reads it as work done as worship.',
      by: 'ramanuja', src: ROSTER.people.ramanuja.name + ', G\u012bt\u0101 Bh\u0101\u1e63ya 2.47, trans. A. Govindacharya (1898)' };
    const r1 = checkSet({ plan: 'gita', div: rt.planDef('gita').div, days: [ge] }, {});
    const named = Object.assign({}, ge, { s: ge.s.replace(', G\u012bt\u0101', ' (Vi\u015bi\u1e63\u1e6d\u0101dvaita), G\u012bt\u0101') });
    const r2 = checkSet({ plan: 'gita', div: rt.planDef('gita').div, days: [named] }, {});
    if (r1.errors.some(m => /school/.test(m)) && !r2.errors.length) { held += 2; console.log('  ok   a school named where one is needed (Gita, R\u0101m\u0101nuja)'); }
    else failures.push('the school rule: unnamed gave ' + JSON.stringify(r1.errors) + ', named gave ' + JSON.stringify(r2.errors));
  }

  /* Deuteronomy 6:4 passes as a key verse in the Tanakh plan */
  let deut = null;
  for (let d = 1; d <= rt.planDays('tanakh') && !deut; d++) {
    const u = corpus.dayOf('tanakh', d).units.find(x => x.ref === 'Deuteronomy 6:4');
    if (u) deut = { d, txt: u.txt };
  }
  if (!deut) failures.push('Deuteronomy 6:4 not found in the Tanakh plan');
  else {
    const r = corpus.locate('tanakh', deut.d, deut.txt.replace(/'/g, '\u2019'));
    if (r.exact && !r.problems.length && r.ref === 'Deuteronomy 6:4') { held++; console.log('  ok   Deuteronomy 6:4 passes as a key verse (day ' + deut.d + ')'); }
    else failures.push('Deuteronomy 6:4 as a key verse: ' + JSON.stringify(r.problems) + ' ' + r.ref);
  }

  /* printed on the page but not the text */
  const up = corpus.dayOf('upanishads', 4).units.find(u => u.kind === 'commentary');
  const upFirst = up && up.txt.match(/^[^.?!]+[.?!]/);
  const rUp = upFirst && corpus.locate('upanishads', 4, upFirst[0]);
  if (rUp && rUp.exact && rUp.problems.some(p => /commentary/.test(p))) held++;
  else failures.push('Paramananda\u2019s commentary is not refused as a key verse: ' + JSON.stringify(rUp && rUp.problems));
  const g = corpus.dayOf('gita', 2).units.find(u => u.kind === 'colophon');
  const gFirst = g && g.txt.match(/^[^.?!]+[.?!]/);
  const rG = gFirst && corpus.locate('gita', 2, gFirst[0]);
  if (rG && rG.exact && rG.problems.some(p => /colophon/.test(p))) held++;
  else failures.push('the Gita colophon is not refused as a key verse: ' + JSON.stringify(rG && rG.problems));
  console.log('  ok   commentary and colophons are printed but never a key verse');

  /* the tradition courses: a line from anywhere in the tradition's works,
     held to its own work's rules on the work's day that holds it */
  {
    const cid = 'course-jewish';
    const shab = corpus.dayOf(cid, 9);
    const cgood = {
      d: 9, label: shab.label, key: 'Remember the sabbath day, to keep it holy.', ref: 'Exodus 20:8', at: corpus.locateCourse(cid, 9, 'Remember the sabbath day, to keep it holy.').at,
      s: 'Given at Sinai among the ten words, the command stands between the reverence due to the name and the honour due to parents; Rashi, on Exodus 20:8, reads remembering as keeping the day in mind all week, setting aside a fine thing for it.',
      by: 'rashi', src: 'Rashi, Commentary on the Torah, Exodus 20:8, fixture text (1929)', batch: 'fixture'
    };
    const cset = list => ({ plan: cid, div: rt.planDef(cid).div, days: list });
    const g0 = checkSet(cset([cgood]), {});
    if (shab.label !== 'Shabbat' || g0.errors.length) failures.push('the good course fixture fails (' + shab.label + '): ' + g0.errors.join(' | '));
    else held++;
    const gitaLine = 'Thy business is with the action only, never with its fruits; so let not the fruit of action be thy motive, nor be thou to inaction attached.';
    const ccases = [
      ['a course label moved', e => { e.label = 'Sabbath'; }, /chamber/],
      ['a line from another tradition', e => { e.key = gitaLine; e.ref = 'Bhagavad Gita 2.47'; }, /not verbatim in tanakh/],
      ['a commentator off the line’s own roster', e => { e.by = 'wang-bi'; e.s = e.s.replace('Rashi, on', 'Wang Bi, on'); e.src = e.src.replace('Rashi', 'Wang Bi'); }, /not on the tanakh roster/],
      ['a line placed in the wrong work', e => { e.work = 'bible'; }, /stands in tanakh/],
      ['a line placed on the wrong day', e => { e.pd = 1; }, /stands on tanakh day/],
      ['a course sentence breaking the work’s rule', e => { e.s = e.s.replace('the ten words', 'the ten words, which the Gospel fulfils'); }, /fulfils|forbidden/],
    ];
    ccases.forEach(([name, mut, re]) => {
      const e = JSON.parse(JSON.stringify(cgood));
      mut(e);
      const r = checkSet(cset([e]), {});
      if (r.errors.some(m => re.test(m))) held++;
      else failures.push(name + ': expected ' + re + ', got ' + (r.errors.join(' | ') || 'no error'));
    });
    const moved = checkSet(Object.assign(cset([cgood]), { div: '0000000000' }), {});
    if (moved.errors.some(m => /division/.test(m))) held++; else failures.push('a course written against another chamber passes');
    console.log('  ok   the courses: a line from the tradition’s works only, on its own work’s roster and rules, against the chamber as it stands');
  }

  console.log('\n  selftest: ' + held + ' assertions held' + (failures.length ? ', ' + failures.length + ' FAILED:\n    ' + failures.join('\n    ') : '.'));
  return failures.length ? 1 : 0;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--selftest') process.exit(selftest());
  if (args[0] === '--candidate') {
    const r = checkCandidate(args[1]);
    report(path.basename(args[1]), r);
    process.exit(r.errors.length ? 1 : 0);
  }
  if (!fs.existsSync(SET_DIR)) { console.log('  no teaching sets yet (.scripts/plans/teachings/ is empty)'); return; }
  let bad = 0;
  const files = fs.readdirSync(SET_DIR).filter(f => /^(course-)?[a-z]+\.json$/.test(f)).sort();
  if (!files.length) console.log('  no teaching sets yet');
  files.forEach(f => {
    const set = JSON.parse(fs.readFileSync(path.join(SET_DIR, f), 'utf8'));
    const r = checkSet(set, {});
    report(f, r);
    if (r.errors.length) bad++;
  });
  process.exit(bad ? 1 : 0);
}

if (require.main === module) main();

module.exports = { checkSet, checkEntry, checkCandidate, readSet, namesOf, ROSTER };
