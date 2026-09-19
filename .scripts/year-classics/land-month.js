/* Land one month of The Classics.

   Reads work/<MM>/month.json, refuses a month that has already landed,
   rebuilds the Q_CLASSICS literal with the new month in place, writes it to a
   CANDIDATE file, runs the gate on the candidate, and only on a pass moves it
   over js/data-year-classics.js. Then: the ledger is recounted from the file
   (canonical, never incremented), the editor's unused survivors go to the
   carry, and work/<MM>/SOURCES-<MM>.md is appended to SOURCES.md under the
   Classics section. The posture is apply-citations.js's: paranoid, all or
   nothing, and nothing is written until everything has been checked.

   Usage: node .scripts/year-classics/land-month.js <month 1..12>
   Then:  node .scripts/check-syntax.js, bump ?v= and CACHE, commit. */
'use strict';
const fs = require('fs');
const path = require('path');
const gate = require('../check-year');

const m = Number(process.argv[2]);
if (!(m >= 1 && m <= 12)) { console.error('usage: land-month.js <month 1..12>'); process.exit(1); }
const MM = String(m).padStart(2, '0');
const HERE = __dirname;
const ROOT = path.join(HERE, '..', '..');
const WORK = path.join(HERE, 'work', MM);
const REL = 'js/data-year-classics.js';
const FILE = path.join(ROOT, REL);
const die = (msg) => { console.error('\n  refusing to land: ' + msg + '\n'); process.exit(1); };

const monthPath = path.join(WORK, 'month.json');
if (!fs.existsSync(monthPath)) die(`${monthPath} does not exist; the editor has not run`);
const month = JSON.parse(fs.readFileSync(monthPath, 'utf8'));
if (Number(month.month) !== m) die(`month.json says month ${month.month}, not ${m}`);
if (!Array.isArray(month.entries) || !month.entries.length) die('month.json has no entries');

const src = fs.readFileSync(FILE, 'utf8');
const marker = 'const Q_CLASSICS = {';
const at = src.indexOf(marker);
if (at < 0) die('cannot find "const Q_CLASSICS = {" in ' + REL);
const head = src.slice(0, at);

const year = gate.loadYear(REL);
const q = Object.assign({}, year.q || {});
if (q[m]) die(`month ${m} has already landed (${q[m].length} entries)`);
q[m] = month.entries;

/* one entry per line, JSON.stringify's escaping, keys in month order */
const keys = Object.keys(q).map(Number).sort((a, b) => a - b);
const blocks = keys.map(k => `${k}:[\n` + q[k].map(e => JSON.stringify(e)).join(',\n') + '\n]');
const body = marker + '\n' + blocks.join(',\n') + '\n};\n';
const candidate = head + body;

const candPath = path.join(WORK, 'data-year-classics.candidate.js');
fs.writeFileSync(candPath, candidate);

/* the gate, on the candidate, against every other shipped line */
const g = new Function(candidate + '\n;return {MONTHS_CLASSICS: MONTHS_CLASSICS, Q_CLASSICS: Q_CLASSICS};')();
const r = gate.checkYear({ months: g.MONTHS_CLASSICS, q: g.Q_CLASSICS, profile: gate.PROFILES[REL] }, { others: gate.othersFor(REL) });
for (const w of r.warns) console.log('    warn: ' + w);
if (r.fails.length) {
  for (const f of r.fails) console.error('    FAIL: ' + f);
  die(`${r.fails.length} failure(s); the candidate is at ${candPath} and the real file is untouched`);
}
try { new (require('vm').Script)(candidate, { filename: REL }); } catch (e) { die('candidate does not parse: ' + e.message); }

/* ---- everything checked; now write ---- */
fs.writeFileSync(FILE, candidate);
console.log(`\n  landed month ${m} (${month.entries.length} entries) into ${REL}: ${r.report.count} of 366${r.report.complete ? ', COMPLETE' : ''}`);

/* the ledger, recounted from the file */
const persons = {};
for (const k of keys) for (const e of q[k]) {
  const key = gate.personKey(e[2]);
  const existing = Object.keys(persons).find(p => gate.samePerson(p, key));
  const slot = existing || key;
  persons[slot] = persons[slot] || { count: 0, months: [] };
  persons[slot].count++;
  if (persons[slot].months.indexOf(k) < 0) persons[slot].months.push(k);
}
const ledgerPath = path.join(HERE, 'ledger.json');
const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : {};
ledger.persons = persons;
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 1) + '\n');

/* the carry: the editor's unused survivors, each with the month it fits */
const carryPath = path.join(HERE, 'carry.json');
const carry = fs.existsSync(carryPath) ? JSON.parse(fs.readFileSync(carryPath, 'utf8')) : { entries: [] };
carry.entries = (carry.entries || []).filter(c => Number(c.fitMonth) !== m || c.fromMonth !== m);
let carried = 0;
for (const u of month.unused || []) { if (u && u.fitMonth) { carry.entries.push(Object.assign({ fromMonth: m }, u)); carried++; } }
fs.writeFileSync(carryPath, JSON.stringify(carry, null, 1) + '\n');

/* SOURCES.md */
const srcNote = path.join(WORK, `SOURCES-${MM}.md`);
if (fs.existsSync(srcNote)) {
  const sourcesPath = path.join(ROOT, 'SOURCES.md');
  let sources = fs.readFileSync(sourcesPath, 'utf8');
  const header = '# The Classics: the third track';
  if (sources.indexOf(header) < 0) {
    sources = sources.replace(/\s*$/, '') + '\n\n---\n\n' + header + '\n\n' +
      'A third 366, the famous lines of philosophy and literature, built clean by the Makers method: four curator lanes propose, a verifier rules VERIFIED, CORRECTED, HEDGE or REJECT with a locatable citation, a refuter tries to break every survivor, a fresh verifier rules on every refutation, and an editor selects, dates and balances the month from survivors only. `.scripts/check-year.js` refuses the file before anything lands. Calendar For Life\'s quotations enter as candidates through their own lane and are verified like any other; its own audit record states that most of them had never been externally verified.\n';
  }
  sources = sources.replace(/\s*$/, '') + '\n\n' + fs.readFileSync(srcNote, 'utf8').replace(/\s*$/, '') + '\n';
  fs.writeFileSync(sourcesPath, sources);
  console.log('  SOURCES.md: appended ' + path.basename(srcNote));
}

const tags = Object.entries(r.report.tags).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', ');
console.log('  tags so far: ' + tags);
console.log('  persons more than once: ' + (Object.entries(persons).filter(([, v]) => v.count > 1).map(([k, v]) => `${k} ${v.count}`).join(', ') || 'none'));
console.log(`  carry: ${carried} routed forward, ${carry.entries.length} waiting`);
if (month.report && month.report.shortfall) console.log('  NOTE the editor reported a shortfall: ' + JSON.stringify(month.report.shortfall));
console.log('\n  next: node .scripts/check-syntax.js, bump data-year-classics.js ?v= in index.html and CACHE in sw.js, commit.\n');
