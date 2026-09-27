/* The Teachings, for the owner's checkpoints: one batch as a page to read.

   node .scripts/teachings/review.js <plan> <n> <out.html> [--trails 5] [--name dry]

   Every entry of the batch as the reader would see it (key verse, reference,
   sentence) with its source line, then the full evidence trail of a chosen
   few: the commentator's own words and their gloss, what was opened, the
   verdict, the refuter's attack, any re-verification or revision, and the
   machine recheck. The trails are chosen to cover every commentator named,
   every hedged or revised entry, and then a seeded random few. The page is
   self-contained (no network) and follows the light or dark setting. */
'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

const a = process.argv.slice(2);
const plan = a[0], all = a[1] === 'all', n = all ? 0 : +a[1], out = a[2];
const flag = k => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : null; };
const nTrails = flag('--trails') === 'all' ? Infinity : +(flag('--trails') || 5), name = flag('--name');
/* --days a,b,c: only those days (a checkpoint's chosen set) */
const onlyDays = flag('--days') ? new Set(flag('--days').split(',').map(Number)) : null;
if (!plan || !(all || n) || !out) { console.error('usage: node .scripts/teachings/review.js <plan> <n|all> <out.html> [--trails 5] [--name dry]'); process.exit(1); }

const ROSTER = JSON.parse(fs.readFileSync(path.join(__dirname, 'roster.json'), 'utf8'));
/* one batch, or with "all" every batch of the plan that has landed (ledger.json) */
const refs = all
  ? ((lib.readJSON(path.join(__dirname, 'ledger.json')) || { plans: {} }).plans[plan] || { batches: [] }).batches
      .map(bn => lib.batchRef(plan, +bn.slice(plan.length + 1)))
  : [lib.batchRef(plan, n, name)];
if (!refs.length) { console.error('nothing landed for ' + plan); process.exit(1); }
const B = all ? { name: plan + '-all', dir: refs[0].dir } : refs[0];
const bj = { days: [], holes: [] };
const recheck = {};
const critics = [];
refs.forEach(R => {
  const one = lib.readJSON(path.join(R.dir, 'batch.json'));
  if (!one) { console.error('no batch.json in ' + R.name); process.exit(1); }
  one.days.forEach(e => bj.days.push(Object.assign({ _dir: R.dir }, e)));
  (one.holes || []).forEach(h => bj.holes.push(h));
  Object.assign(recheck, lib.readJSON(path.join(R.dir, 'recheck.json')) || {});
  const c = lib.lastCritic(R.dir);
  if (c) critics.push(c);
});
if (onlyDays) bj.days = bj.days.filter(e => onlyDays.has(e.d));
bj.days.sort((x, y) => x.d - y.d);
const HARD = new Set(lib.sensitiveDays(plan, bj.days.map(e => e.d)));
const critic = critics.length ? { ok: critics.every(c => c.ok), problems: [].concat(...critics.map(c => c.problems || [])) } : null;
const esc = s => String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const who = id => (ROSTER.people[id] ? ROSTER.people[id].name : id);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const trailOf = e => {
  const dir = e._dir || B.dir;
  const v = lib.readJSON(path.join(dir, 'verdicts', e.id + '.json')) || {};
  const r = lib.readJSON(path.join(dir, 'refutations', e.id + '.json'));
  const rv = lib.readJSON(path.join(dir, 'reverify', e.id + '.json'));
  /* every revision round; the last cleared one is what ships */
  const rounds = [];
  for (let k = 1; ; k++) {
    const key = lib.roundKey(e.id, k);
    const re1 = lib.readJSON(path.join(dir, 'revise', key + '.json'));
    if (!re1) break;
    rounds.push({ k, re: re1, rr: lib.readJSON(path.join(dir, 'revrefute', key + '.json')) });
  }
  const keptR = rounds.filter(x => x.re.verdict === 'CORRECTED' && x.rr && x.rr.refuted === false).pop();
  const re = keptR ? keptR.re : (rounds.length ? rounds[rounds.length - 1].re : null);
  const rr = keptR ? keptR.rr : (rounds.length ? rounds[rounds.length - 1].rr : null);
  const kept = !!keptR;
  return { v, r, rv, re, rr, kept, ev: ((kept ? re : null) || (rv && lib.passes(rv) ? rv : null) || v).evidence || {} };
};

/* which trails to print */
let seed = 0;
for (const c of B.name) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
const days = bj.days.slice();
const chosen = [];
const take = e => { if (e && !chosen.includes(e) && chosen.length < nTrails) chosen.push(e); };
[...new Set(days.map(e => e.by))].forEach(by => take(days.find(e => e.by === by)));
/* a whole plan: one trail from each batch first, then the rest at random; a
   single batch: every hedged, refuted, corrected or revised entry first */
if (all) refs.forEach(R => { const inB = days.filter(e => e._dir === R.dir && !chosen.includes(e)); if (inB.length) take(inB[Math.floor(rnd() * inB.length)]); });
else days.filter(e => e.hedge || trailOf(e).kept || trailOf(e).rv || (trailOf(e).v.verdict === 'CORRECTED')).forEach(take);
const rest = days.filter(e => !chosen.includes(e));
while (chosen.length < nTrails && rest.length) take(rest.splice(Math.floor(rnd() * rest.length), 1)[0]);
chosen.sort((x, y) => x.d - y.d);

const spread = {};
days.forEach(e => { spread[who(e.by)] = (spread[who(e.by)] || 0) + 1; });

const entryHTML = e => {
  const t = trailOf(e);
  const tags = [cap(who(e.by)) + (e.by2 ? ' and ' + who(e.by2) : '')];
  if (e.hedge) tags.push('as given in ' + (ROSTER.conduits[e.hedge] ? ROSTER.conduits[e.hedge].name : e.hedge));
  if (t.v.verdict === 'CORRECTED') tags.push('corrected by its verifier');
  if (t.rv) tags.push('refuted, then re-verified');
  if (t.kept) tags.push('revised after the critic');
  if (e.id.slice(-1) === 's') tags.push('the standby');
  if (HARD.has(e.d)) tags.push('a hard passage');
  return '<article class="entry" id="d' + e.d + '"><div class="day">Day ' + e.d + '</div>' +
    '<blockquote>“' + esc(e.key) + '”</blockquote><div class="ref">' + esc(e.ref) + '</div>' +
    '<p class="s">' + esc(e.s) + '</p><p class="src">' + esc(e.src) + '</p>' +
    '<p class="tags">' + tags.map(x => '<span>' + esc(x) + '</span>').join('') +
    (chosen.includes(e) ? '<a href="#trail-' + e.d + '">its evidence trail</a>' : '') + '</p></article>';
};
const row = (k, v) => v ? '<tr><th>' + esc(k) + '</th><td>' + v + '</td></tr>' : '';
const trailHTML = e => {
  const t = trailOf(e), ev = t.ev;
  const rc = recheck[e.id];
  return '<section class="trail" id="trail-' + e.d + '"><h3>Day ' + e.d + ': ' + esc(e.ref) + ', ' + esc(who(e.by)) + '</h3><table>' +
    row('The commentator’s words', '<span class="zh">' + esc(ev.words) + '</span>') +
    row('Gloss', esc(ev.gloss)) +
    row('Opened', (ev.opened || []).map(o => esc(o.locator) + '<br><span class="url">' + esc(o.url) + ' (' + esc(o.via) + ')</span>').join('<br>')) +
    row('Verdict', '<b>' + esc(t.v.verdict) + '</b> (' + esc(t.v.confidence) + '). ' + esc(t.v.reason)) +
    row('Refuter', t.r ? '<b>' + (t.r.refuted ? 'Refuted' : 'Cleared') + '</b>. ' + esc(t.r.reason) : 'none') +
    row('Re-verified', t.rv ? '<b>' + esc(t.rv.verdict) + '</b>. ' + esc(t.rv.reason) : '') +
    row('Revision', t.re ? '<b>' + esc(t.re.verdict) + '</b>. ' + esc(t.re.reason) + (t.rr ? '<br><b>Its refuter: ' + (t.rr.refuted ? 'refuted' : 'cleared') + '</b>. ' + esc(t.rr.reason) : '') : '') +
    row('Machine recheck', rc ? '<b>' + esc(rc.status) + '</b>' + (rc.detail ? ' ' + esc(rc.detail) : '') : 'not run') +
    '</table><p><a href="#d' + e.d + '">Back to the entry</a></p></section>';
};

/* the work and the translation its key verses are copied from */
const WORK = { tao: ['the Tao Te Ching', 'Legge’s translation'], pali: ['the Dhammapada', 'Müller’s translation'], gita: ['the Bhagavad Gita', 'Besant’s translation'],
  upanishads: ['the Upanishads', 'Paramananda’s translation'], analects: ['the Analects', 'Legge’s translation'], zhuangzi: ['the Zhuangzi', 'Giles’ translation'],
  quran: ['the Qur’an', 'Pickthall’s translation'], veda: ['the Rig Veda', 'Griffith’s translation'], tanakh: ['the Tanakh', 'the JPS translation of 1917'], bible: ['the Bible', 'the World English Bible'] }[plan] || [plan, 'the app’s translation'];
const title = 'The Teachings: ' + bj.days.length + ' days of ' + WORK[0] + ' for review';
const html = '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Teachings review</title><style>' +
  ':root{--bg:#faf8f3;--fg:#23201b;--muted:#6b645a;--line:#e3ddd1;--accent:#8a5a1f;--card:#fffdf8}' +
  '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#17150f;--fg:#ece6da;--muted:#a79f91;--line:#3a352c;--accent:#d8a55e;--card:#1f1c16}}' +
  'body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.6 Georgia,"Iowan Old Style",serif}' +
  'main{max-width:720px;margin:0 auto;padding:28px 16px 80px}h1{font-size:1.5rem;line-height:1.3;margin:0 0 6px}h2{font-size:1.15rem;margin:40px 0 12px;color:var(--accent)}' +
  '.lede{color:var(--muted);margin:0 0 20px}.entry{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:0 0 14px}' +
  '.day{font:600 .75rem/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}' +
  'blockquote{margin:10px 0 2px;font-size:1.12rem;font-style:italic}.ref{font:.8rem system-ui,sans-serif;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}' +
  '.s{margin:10px 0 6px}.src{font:.82rem/1.45 system-ui,sans-serif;color:var(--muted);margin:0}' +
  '.tags{margin:8px 0 0;font:.78rem system-ui,sans-serif;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.tags span{border:1px solid var(--line);border-radius:999px;padding:2px 9px;color:var(--muted)}' +
  'a{color:var(--accent)}.tags a{margin-left:auto;min-height:32px;display:inline-flex;align-items:center}' +
  '.trail{border-top:1px solid var(--line);padding-top:14px;margin-top:22px}.trail h3{font-size:1rem;margin:0 0 8px}' +
  'table{border-collapse:collapse;width:100%;font:.9rem/1.5 system-ui,sans-serif}th{text-align:left;vertical-align:top;color:var(--muted);font-weight:600;padding:6px 10px 6px 0;width:9.5em}td{padding:6px 0;vertical-align:top;overflow-wrap:anywhere}' +
  '.zh{font-size:1.05rem}.url{color:var(--muted);font-size:.8rem}ul{padding-left:1.2em}' +
  '@media (max-width:560px){th,td{display:block;width:auto;padding:2px 0}th{padding-top:10px}}' +
  '</style></head><body><main>' +
  '<h1>' + esc(title) + '</h1>' +
  '<p class="lede">' + (all ? 'Batches ' + refs.map(r => r.name).join(', ') : 'Batch ' + B.name) + '. Each day gives a key verse, copied word for word from that day’s passage in ' + WORK[1] + ', and one sentence: the context of the verse in its chapter, then a classical commentator’s reading. ' +
  'Commentators: ' + Object.keys(spread).map(k => esc(k) + ' on ' + spread[k] + ' days').join(', ') + '. ' +
  'Every entry survived a verifier who found the commentator’s own words and a refuter told to break it, and a machine found those words again in the source. ' +
  (bj.holes && bj.holes.length && !onlyDays ? 'Days with no surviving entry: ' + bj.holes.join(', ') + '. ' : '') +
  (HARD.size ? HARD.size + ' of these days hold a hard passage (war, punishment, law), marked so: each is stated plainly and carries the commentator’s own limit or occasion where he sets one. ' : '') +
  (critic ? 'The critic’s last reading: ' + (critic.ok ? 'no problems.' : critic.problems.length + ' problem(s), listed at the end.') : '') + '</p>' +
  '<h2>The ' + bj.days.length + ' days</h2>' + bj.days.map(entryHTML).join('') +
  '<h2>' + chosen.length + ' evidence trails, end to end</h2><p class="lede">' + (chosen.length === bj.days.length ? 'One for every day above.' : 'Chosen to cover each commentator and every corrected, hedged or revised entry, then at random.') + '</p>' +
  chosen.map(trailHTML).join('') +
  (critic && !critic.ok ? '<h2>The critic’s open problems</h2><ul>' + critic.problems.map(p => '<li>' + esc(typeof p === 'string' ? p : 'Day ' + p.d + ': ' + p.problem + ' Fix: ' + p.fix) + '</li>').join('') + '</ul>' : '') +
  '</main></body></html>';
fs.writeFileSync(out, html, 'utf8');
console.log('  wrote ' + out + ': ' + bj.days.length + ' entries, ' + chosen.length + ' trails (days ' + chosen.map(e => e.d).join(', ') + ')');
