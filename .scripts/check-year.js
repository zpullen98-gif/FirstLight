/* The year gate: what a dated track has to be before it lands.

   check-syntax.js proves a data file parses. Nothing, until this file, proved
   what was in it: a 30-day January, a day listed twice, a quotation already
   shipped on another track, the same person on the 3rd and the 9th, a source
   line that prints anonymously because it names only the book. The Makers were
   built clean by a workflow that carried those rules in prose; the Classics are
   built with the rules in code, and the two shipped years are run through the
   loader too, so the loader is proved against real data every time.

   Two profiles. `strict` is the bar a new track meets before a month lands.
   `shipped` is what the two existing years are held to: shape, order, the count,
   and the duplicate check across files, because their historical choices would
   fail rules they never had, and nothing here rewrites a shipped year.

   Usage:
     node .scripts/check-year.js               every year file, its own profile
     node .scripts/check-year.js <file>        one file
     node .scripts/check-year.js --selftest    break every rule on a fixture and
                                               read the message, then run the two
                                               shipped years and expect 366 of 366

   As a module: require('./check-year') exposes checkYear, loadYear, normText,
   personKey, samePerson and the profiles, for the landing and workflow tools. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MLEN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

/* The same test check-publish.mjs runs across the whole suite. */
const DASH = /—|&mdash;|&#8212;|&#x2014;| -- /gi;

const CLASSICS_TAGS = ['Philosophy', 'Poetry', 'Drama', 'Fiction', 'Essay', 'Correspondence', 'Diary'];

/* Authors with ten or more entries on the Philosophers. The reader who wants
   them has a year of them, and theirs is the quotation trade most corrupted. */
const CLASSICS_BANNED = ['Marcus Aurelius', 'Confucius', 'Laozi', 'Lao Tzu', 'Seneca', 'Zhuangzi',
  'Chuang Tzu', 'Epictetus', 'Publilius Syrus', 'Cicero'];

const PROFILES = {
  'js/data-year.js':          { months: 'MONTHS',          q: 'Q',          mode: 'shipped', track: 'philosophers' },
  'js/data-year-makers.js':   { months: 'MONTHS_MAKERS',   q: 'Q_MAKERS',   mode: 'shipped', track: 'makers' },
  'js/data-year-classics.js': { months: 'MONTHS_CLASSICS', q: 'Q_CLASSICS', mode: 'strict',  track: 'classics',
                                vocab: CLASSICS_TAGS, banned: CLASSICS_BANNED, cap: 3, sourceMax: 140, noteMaxWords: 60 }
};

/* ---- loading -----------------------------------------------------------
   Top-level const in a classic script is a lexical global: invisible to
   vm.runInContext, but a Function body's own consts are in scope for its
   return, which is the whole trick. */
function loadGlobals(src, names) {
  const ret = names.map(n => `${n}: (typeof ${n} === 'undefined' ? null : ${n})`).join(', ');
  return new Function(src + `\n;return {${ret}};`)();
}

function loadYear(rel) {
  const prof = PROFILES[rel];
  if (!prof) throw new Error('no profile for ' + rel);
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const g = loadGlobals(src, [prof.months, prof.q]);
  return { months: g[prof.months], q: g[prof.q], profile: prof, src };
}

function loadUplift() {
  const p = path.join(ROOT, 'js', 'data-uplift.js');
  if (!fs.existsSync(p)) return [];
  const g = loadGlobals(fs.readFileSync(p, 'utf8'), ['UPLIFT']);
  return g.UPLIFT || [];
}

/* ---- text -------------------------------------------------------------- */
function normText(s) {
  return String(s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’‚‛′']/g, '')
    .replace(/[“”„‟″"]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const HONORIFICS = /^(dr|st|saint|sir|dame|lady|lord|mr|mrs|ms|miss|prof|professor|rev|fr|father|mother|brother|sister|rabbi|imam|the venerable|venerable)\.?\s+/i;

/* The name a source line leads with, folded the way the duplicate rule folds
   it: accents and honorifics gone, hedges stripped, the reporter never counted
   because the speaker leads. Pen names are one person with their real name
   only where the table says so. */
const ALIASES = {
  'mark twain': 'samuel clemens', 'george eliot': 'mary ann evans', 'george orwell': 'eric blair',
  'lewis carroll': 'charles dodgson', 'george sand': 'amantine dupin', 'stendhal': 'henri beyle',
  'voltaire': 'francois marie arouet', 'moliere': 'jean baptiste poquelin', 'novalis': 'friedrich von hardenberg',
  'lao tzu': 'laozi', 'chuang tzu': 'zhuangzi', 'basho': 'matsuo basho', 'matsuo basho': 'matsuo basho'
};

function personKey(source) {
  let s = String(source || '').trim();
  s = s.replace(/^(attributed to|after|from)\s+/i, '');
  s = s.split(',')[0].trim();
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  s = s.replace(/[‘’']/g, '').replace(/[^a-z0-9 .-]/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(HONORIFICS, '');
  s = s.replace(/\s+(jr|sr|ii|iii)\.?$/i, '');
  if (ALIASES[s]) s = ALIASES[s];
  return s;
}

/* SOURCES.md: the surname must match and the first names must match in full,
   unless one of them is an initial standing for the other. A middle name or
   initial that only one side carries decides nothing: Ada Yonath is Ada E.
   Yonath, which is the pair exact matching missed; Aruna Roy is not Arundhati
   Roy, which is the pair folding to an initial wrongly joined. */
function samePerson(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const ta = a.split(' '), tb = b.split(' ');
  if (ta[ta.length - 1] !== tb[tb.length - 1]) return false;
  const fa = ta.slice(0, -1), fb = tb.slice(0, -1);
  if (!fa.length || !fb.length) return fa.length === fb.length;   // a lone surname matches only a lone surname
  const n = Math.min(fa.length, fb.length);
  for (let i = 0; i < n; i++) {
    const x = fa[i].replace(/\.$/, ''), y = fb[i].replace(/\.$/, '');
    if (x === y) continue;
    if (x.length === 1 && y[0] === x) continue;
    if (y.length === 1 && x[0] === y) continue;
    return false;
  }
  return true;
}

function endsWithStop(q) {
  const s = String(q || '').trim();
  return /[.!?…]["”’']?$/.test(s);
}

/* ---- the check --------------------------------------------------------- */
function checkYear(data, opts) {
  const { months, q, profile } = data;
  const others = (opts && opts.others) || [];          // [{ label, lines: [normText] }]
  const strict = profile.mode === 'strict';
  const fails = [], warns = [];
  const fail = (m) => fails.push(m);
  const warn = (m) => warns.push(m);
  const report = { count: 0, tags: {}, persons: {}, complete: false };

  if (!months || !Array.isArray(months) || months.length !== 12) {
    fail('months: expected a 12-element array, got ' + (months ? months.length : 'nothing'));
  } else {
    months.forEach((mo, i) => {
      if (!Array.isArray(mo) || mo.length !== 3) return fail(`months[${i}]: expected [name, theme, blurb]`);
      if (mo[0] !== MONTH_NAMES[i]) fail(`months[${i}]: name "${mo[0]}" is not ${MONTH_NAMES[i]}`);
      if (strict && DASH.test(mo[2])) fail(`months ${mo[0]}: the blurb carries a dash`);
      DASH.lastIndex = 0;
    });
  }

  if (!q || typeof q !== 'object') { fail('q: nothing to count'); return { fails, warns, report }; }

  const seenText = [];                       // { norm, where }
  const personsByMonth = {};                 // m -> [key]
  const personsAll = {};                     // key -> [where]
  let present = 0;

  for (let m = 1; m <= 12; m++) {
    const arr = q[m];
    if (!arr) continue;
    if (!Array.isArray(arr)) { fail(`month ${m}: not an array`); continue; }
    present++;
    const want = MLEN[m - 1];
    if (arr.length !== want) fail(`month ${m} (${MONTH_NAMES[m - 1]}): ${arr.length} entries, wanted ${want}${strict ? ' (a present month must be full)' : ''}`);

    let lastDay = 0;
    const days = new Set();
    personsByMonth[m] = [];

    arr.forEach((e, idx) => {
      const where = `${MONTH_NAMES[m - 1]} ${e && e[0]}`;
      report.count++;
      if (!Array.isArray(e) || (e.length !== 4 && e.length !== 5)) return fail(`${where}: entry has ${e && e.length} elements, wanted 4 or 5`);
      const [d, quote, source, tag, note] = e;
      if (typeof d !== 'number' || !Number.isInteger(d)) return fail(`${where}: day is not an integer`);
      for (const [i, name] of [[1, 'quote'], [2, 'source'], [3, 'tradition']]) {
        if (typeof e[i] !== 'string' || !e[i].trim()) fail(`${where}: ${name} is empty or not a string`);
        else if (e[i] !== e[i].trim()) fail(`${where}: ${name} has leading or trailing whitespace`);
      }
      if (e.length === 5 && (typeof note !== 'string' || !note.trim())) fail(`${where}: note present but empty`);

      if (d < 1 || d > want) fail(`${where}: day ${d} is outside 1..${want}`);
      if (days.has(d)) fail(`${where}: day ${d} listed twice`);
      days.add(d);
      if (d <= lastDay) fail(`${where}: days out of order (${d} after ${lastDay})`);
      lastDay = d;

      /* the quotation */
      if (!endsWithStop(quote)) (strict ? fail : warn)(`${where}: quotation does not end in a full stop, question or exclamation`);
      /* a shipped year's quotation dashes are verified wording; only a new
         track is asked to look twice at each one */
      if (strict && DASH.test(quote)) warn(`${where}: the quotation carries a dash (exempt; make sure it is the author's)`);
      DASH.lastIndex = 0;
      if (/\n/.test(quote + source + (note || ''))) fail(`${where}: a field contains a line break`);
      if (strict && /"/.test(quote + source + tag + (note || ''))) fail(`${where}: straight double quote; the card wants curly quotes`);

      /* the source line */
      if (strict) {
        if (DASH.test(source)) fail(`${where}: the source line carries a dash (it is counted against the suite's baseline; use a colon)`);
        DASH.lastIndex = 0;
        if (note && DASH.test(note)) fail(`${where}: the note carries a dash`);
        DASH.lastIndex = 0;
        if (/^(the|a|an)\s/i.test(source) || /^[a-z0-9"“‘]/.test(source)) fail(`${where}: the source must lead with the author's name, not "${source.slice(0, 30)}"`);
        if (source.indexOf(',') < 0 && !/^attributed to /i.test(source)) fail(`${where}: the source names no work (no comma): "${source}"`);
        if (source.length > profile.sourceMax) fail(`${where}: source line is ${source.length} characters, over ${profile.sourceMax}`);
        if (note && note.split(/\s+/).length > profile.noteMaxWords) fail(`${where}: note is ${note.split(/\s+/).length} words, over ${profile.noteMaxWords}`);
        if (profile.vocab && profile.vocab.indexOf(tag) < 0) fail(`${where}: tradition "${tag}" is not in the vocabulary (${profile.vocab.join(', ')})`);
      }

      /* the person */
      const key = personKey(source);
      if (strict && key.split(' ').length === 1) warn(`${where}: single-token name "${key}"; fine for Homer or Sappho, look twice otherwise`);
      if (strict && profile.banned) {
        for (const b of profile.banned) if (samePerson(key, personKey(b))) fail(`${where}: ${b} is banned from this track`);
      }
      /* a shipped year made its own choices about repetition; only a new
         track is held to one person per month */
      if (strict) for (const other of personsByMonth[m]) {
        if (samePerson(key, other.key)) fail(`${where}: ${source.split(',')[0]} already appears this month (${other.where})`);
      }
      personsByMonth[m].push({ key, where });
      const bucket = Object.keys(personsAll).find(k => samePerson(k, key));
      const k2 = bucket || key;
      (personsAll[k2] = personsAll[k2] || []).push(where);

      /* duplicates within the file and across the others */
      const norm = normText(quote);
      for (const s of seenText) {
        if (s.norm === norm) fail(`${where}: the same quotation is already at ${s.where}`);
        else if (s.norm.slice(0, 40) === norm.slice(0, 40)) warn(`${where}: opens like ${s.where} (two renderings of one line?)`);
      }
      seenText.push({ norm, where });
      for (const o of others) {
        if (o.norms.has(norm)) (strict ? fail : warn)(`${where}: already shipped in ${o.label}`);
        else if (o.heads.has(norm.slice(0, 40))) warn(`${where}: opens like a line in ${o.label}`);
      }

      report.tags[tag] = (report.tags[tag] || 0) + 1;
    });
  }

  if (strict && profile.cap) {
    for (const [k, wheres] of Object.entries(personsAll)) {
      if (wheres.length > profile.cap) fail(`${k}: ${wheres.length} entries in the year, cap is ${profile.cap} (${wheres.join('; ')})`);
    }
  }
  report.persons = Object.fromEntries(Object.entries(personsAll).filter(([, w]) => w.length > 1).map(([k, w]) => [k, w.length]));
  report.complete = present === 12 && report.count === 366 && fails.length === 0;
  return { fails, warns, report };
}

/* An "others" bundle: every shipped line, normalised, for the cross-file check. */
function othersFor(excludeRel) {
  const out = [];
  for (const rel of Object.keys(PROFILES)) {
    if (rel === excludeRel) continue;
    if (!fs.existsSync(path.join(ROOT, rel))) continue;
    const y = loadYear(rel);
    const norms = new Set(), heads = new Set();
    for (const m of Object.keys(y.q || {})) for (const e of y.q[m] || []) { const n = normText(e[1]); norms.add(n); heads.add(n.slice(0, 40)); }
    out.push({ label: rel, norms, heads });
  }
  const up = loadUplift();
  if (up.length) {
    const norms = new Set(), heads = new Set();
    for (const u of up) { const n = normText(u[0]); norms.add(n); heads.add(n.slice(0, 40)); }
    out.push({ label: 'js/data-uplift.js', norms, heads });
  }
  return out;
}

/* ---- the CLI ----------------------------------------------------------- */
function runFile(rel, quiet) {
  const y = loadYear(rel);
  const r = checkYear(y, { others: othersFor(rel) });
  const say = quiet ? () => {} : (m) => console.log(m);
  say(`\n  ${rel} [${y.profile.mode}]: ${r.report.count} of 366${r.report.complete ? ', complete' : ''}`);
  const tags = Object.entries(r.report.tags).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', ');
  if (tags) say('    tags: ' + tags);
  const multi = Object.entries(r.report.persons).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} ${n}`).join(', ');
  if (multi) say('    more than once: ' + multi);
  for (const w of r.warns.slice(0, 40)) say('    warn: ' + w);
  if (r.warns.length > 40) say(`    ... ${r.warns.length - 40} more warnings`);
  for (const f of r.fails) say('    FAIL: ' + f);
  return r;
}

function selftest() {
  let n = 0;
  const expectFail = (label, fixture, needle) => {
    const r = checkYear(fixture, { others: fixture.others || [] });
    const hit = r.fails.find(f => f.includes(needle));
    if (!hit) { console.error(`  ✗ ${label}: expected a failure containing "${needle}", got:\n    ${r.fails.join('\n    ') || '(no failures)'}`); process.exit(1); }
    n++; console.log(`  ✓ ${label}: ${hit}`);
  };
  const expectClean = (label, fixture) => {
    const r = checkYear(fixture, { others: fixture.others || [] });
    if (r.fails.length) { console.error(`  ✗ ${label}: expected clean, got:\n    ${r.fails.join('\n    ')}`); process.exit(1); }
    n++; console.log(`  ✓ ${label}: clean`);
  };

  const strict = PROFILES['js/data-year-classics.js'];
  const months = MONTH_NAMES.map(nm => [nm, 'Theme', 'A blurb without a dash.']);
  const jan = (over) => {
    const arr = [];
    for (let d = 1; d <= 31; d++) arr.push([d, `Line number ${d} of a made-up January, and it ends well.`, `Author Number${d}, A Work, ch. ${d}`, 'Fiction']);
    return Object.assign({ months, q: { 1: arr }, profile: strict }, over || {});
  };
  const fix = (mut) => { const f = jan(); mut(f.q[1], f); return f; };

  expectClean('a full, clean January', jan());
  expectFail('a 30-day January', fix(a => a.pop()), '30 entries, wanted 31');
  expectFail('a day listed twice', fix(a => { a[5][0] = 5; }), 'listed twice');
  expectFail('days out of order', fix(a => { a[5][0] = 4; a[4][0] = 6; }), 'out of order');
  expectFail('a quote with no terminal stop', fix(a => { a[2][1] = 'No stop at the end'; }), 'does not end in a full stop');
  expectFail('an em dash in a source', fix(a => { a[2][2] = 'Author Number3, A Work — The Sequel, ch. 3'; }), 'source line carries a dash');
  expectFail('" -- " in a note', fix(a => { a[2] = a[2].concat(['A note -- with the stand-in.']); }), 'note carries a dash');
  expectFail('a dash in a blurb', fix((a, f) => { f.months = months.map((mo, i) => i === 0 ? [mo[0], mo[1], 'Blurb — dashed'] : mo); }), 'blurb carries a dash');
  expectFail('a tag outside the vocabulary', fix(a => { a[2][3] = 'Stoic'; }), 'not in the vocabulary');
  expectFail('a source that leads with the work', fix(a => { a[2][2] = 'The Republic, book 7 (Plato)'; }), 'must lead with the author');
  expectFail('a source with no work', fix(a => { a[2][2] = 'Plato'; }), 'names no work');
  expectFail('the same person twice in a month', fix(a => { a[8][2] = 'Author Number3, Another Work, ch. 9'; }), 'already appears this month');
  expectFail('a fourth line from one person in the year', (() => {
    const f = jan();
    f.q[2] = [[1, 'February first line, ended.', 'Author Number3, Work Two, p. 1', 'Poetry'],
              [2, 'February second line, ended.', 'Author Number 3, Work Three, p. 2', 'Poetry']];   // "Number 3" vs "Number3": different surname, not a match
    f.q[2][1][2] = 'Author Number3, Work Three, p. 2';
    f.q[3] = [[1, 'March first line, ended.', 'A. Number3, Work Four, p. 1', 'Drama']];              // initial matches full first name
    for (let d = 2; d <= 29; d++) f.q[2].push([d, `February line ${d}, ended.`, `Feb Person${d}, Work, ch. ${d}`, 'Poetry']);
    f.q[2].sort((x, y) => x[0] - y[0]);
    for (let d = 2; d <= 31; d++) f.q[3].push([d, `March line ${d}, ended.`, `Mar Person${d}, Work, ch. ${d}`, 'Drama']);
    return f;
  })(), 'cap is 3');
  expectFail('a banned author', fix(a => { a[2][2] = 'Seneca, Letters 1.1'; }), 'banned from this track');
  expectFail('a line copied from another track', (() => {
    const f = jan();
    f.others = [{ label: 'js/data-year.js', norms: new Set([normText(f.q[1][4][1])]), heads: new Set() }];
    return f;
  })(), 'already shipped in js/data-year.js');
  expectFail('the same line twice in the file', fix(a => { a[9][1] = a[3][1]; }), 'same quotation is already at');
  expectFail('a straight double quote', fix(a => { a[2][1] = 'He said "no" and meant it.'; }), 'straight double quote');
  expectFail('a source over 140 characters', fix(a => { a[2][2] = 'Author Number3, ' + 'A Very Long Title '.repeat(9) + ', ch. 1'; }), 'over 140');
  expectFail('a partial month in strict mode', fix(a => a.splice(10, 5)), 'a present month must be full');

  /* the folding rule itself */
  const same = [['Ada Yonath', 'Ada E. Yonath'], ['A. Roy', 'Arundhati Roy'], ['Dr. Maya Angelou', 'Maya Angelou'], ['Mark Twain', 'Samuel Clemens']];
  const diff = [['Aruna Roy', 'Arundhati Roy'], ['Marie Curie', 'Pierre Curie'], ['Homer', 'Winslow Homer']];
  for (const [a, b] of same) { if (!samePerson(personKey(a), personKey(b))) { console.error(`  ✗ ${a} should match ${b}`); process.exit(1); } n++; }
  for (const [a, b] of diff) { if (samePerson(personKey(a), personKey(b))) { console.error(`  ✗ ${a} should NOT match ${b}`); process.exit(1); } n++; }
  console.log(`  ✓ the person rule: ${same.length} matches, ${diff.length} non-matches`);

  /* the loader, against real data */
  for (const rel of ['js/data-year.js', 'js/data-year-makers.js']) {
    const r = runFile(rel, true);
    if (r.report.count !== 366 || r.fails.length) { console.error(`  ✗ ${rel}: ${r.report.count} of 366, ${r.fails.length} failure(s):\n    ${r.fails.join('\n    ')}`); process.exit(1); }
    n++; console.log(`  ✓ ${rel}: 366 of 366 through the loader`);
  }
  console.log(`\n  selftest: ${n} assertions held.\n`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) { selftest(); process.exit(0); }
  const files = args.length ? args.map(a => a.replace(/\\/g, '/').replace(/^\.\//, '')) : Object.keys(PROFILES).filter(rel => fs.existsSync(path.join(ROOT, rel)));
  let failed = 0;
  for (const rel of files) {
    if (!PROFILES[rel]) { console.error('  no profile for ' + rel); failed++; continue; }
    const r = runFile(rel);
    failed += r.fails.length;
  }
  console.log('');
  if (failed) { console.error(`  ${failed} problem(s).\n`); process.exit(1); }
  console.log('  every year file holds.\n');
}

module.exports = { checkYear, loadYear, loadUplift, othersFor, normText, personKey, samePerson, endsWithStop, MLEN, MONTH_NAMES, PROFILES, CLASSICS_TAGS, CLASSICS_BANNED };
