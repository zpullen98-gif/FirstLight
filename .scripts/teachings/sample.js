/* The Teachings, for the owner's reading: entries with their evidence trails.

   node .scripts/teachings/sample.js <plan> <n> [count] [--all] [--name dry]

   Prints, for a random choice of count days (5 by default; --all for every
   day) from the batch's batch.json: the entry as it would ship, then its
   trail: the verdict (evidence words, gloss, sources opened, reason), the
   refutation, the re-verification if there was one, and the machine recheck.
   The choice is seeded by the batch's name, so the same command shows the
   same days. */
'use strict';
const path = require('path');
const lib = require('./lib');

const a = process.argv.slice(2);
const plan = a[0], n = +a[1];
const ni = a.indexOf('--name'), name = ni > -1 ? a[ni + 1] : null;
const count = /^\d+$/.test(a[2] || '') ? +a[2] : 5;
if (!plan || !n) { console.error('usage: node .scripts/teachings/sample.js <plan> <n> [count] [--all] [--name dry]'); process.exit(1); }
const B = lib.batchRef(plan, n, name);
const bj = lib.readJSON(path.join(B.dir, 'batch.json'));
if (!bj) { console.error('no batch.json yet'); process.exit(1); }
let seed = 0;
for (const c of B.name) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
let pick = bj.days.slice();
if (!a.includes('--all')) {
  for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
  pick = pick.slice(0, count).sort((x, y) => x.d - y.d);
}
const recheck = lib.readJSON(path.join(B.dir, 'recheck.json')) || {};
const line = (k, v) => v ? '  ' + k.padEnd(12) + v : '';
pick.forEach(e => {
  const v = lib.readJSON(path.join(B.dir, 'verdicts', e.id + '.json')) || {};
  const r = lib.readJSON(path.join(B.dir, 'refutations', e.id + '.json'));
  const rv = lib.readJSON(path.join(B.dir, 'reverify', e.id + '.json'));
  const re = lib.readJSON(path.join(B.dir, 'revise', e.id + '.json'));
  const rr = lib.readJSON(path.join(B.dir, 'revrefute', e.id + '.json'));
  const kept = re && rr && rr.refuted === false;
  const ev = ((kept ? re : null) || rv || v).evidence || {};
  console.log('\n==== day ' + e.d + ' (' + e.id + ')');
  console.log('  “' + e.key + '”\n  ' + e.ref + '\n  ' + e.s + '\n  source: ' + e.src + (e.hedge ? '  [hedged through ' + e.hedge + ']' : ''));
  console.log('  -- trail --');
  [line('verdict', v.verdict + (v.confidence ? ' (' + v.confidence + ')' : '') + ': ' + (v.reason || '')),
   line('words', ev.words), line('gloss', ev.gloss),
   line('opened', (ev.opened || []).map(o => o.via + ' ' + o.url + ' ' + o.locator).join(' | ')),
   line('refutation', r ? (r.refuted ? 'REFUTED: ' : 'cleared: ') + r.reason + (r.reopened ? ' [re-opened ' + r.reopened.url + ', found ' + r.reopened.found + ']' : '') : 'none'),
   line('re-verify', rv ? rv.verdict + ': ' + rv.reason : ''),
   line('revision', re ? re.verdict + ': ' + re.reason + (rr ? (rr.refuted ? ' [REFUTED: ' : ' [cleared: ') + rr.reason + ']' : ' [not yet attacked]') : ''),
   line('recheck', recheck[e.id] ? recheck[e.id].status + (recheck[e.id].detail ? ' (' + recheck[e.id].detail + ')' : '') : 'not run')
  ].filter(Boolean).forEach(x => console.log(x));
});
