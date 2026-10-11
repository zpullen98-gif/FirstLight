/* Data provenance shape, daily diversity, clock boundaries and safe rendering.
   Evidence itself is recorded in anthology-audit.json, not inferred by a test.
   Run: node .scripts/check-anthology.js [deployable First Light root] */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
const ctx = vm.createContext({ console, Date, Math, JSON, Number, String, Object, Array,
  setTimeout() {}, clearTimeout() {}, window: { addEventListener() {} },
  document: { addEventListener() {} }, FL_ACTS: {}, FL_VIEWS: {},
  esc: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
});
function load(file) { vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file }); }
['js/store.js', 'js/data-anthology.js', 'js/anthology.js', 'js/ui-anthology.js', 'js/data-year.js', 'js/data-year-makers.js', 'js/data-year-classics.js'].forEach(load);
const quotes = vm.runInContext('DAWN_QUOTES', ctx), ids = new Set(), texts = new Set();
for (const q of quotes) {
  ok(/^[a-z0-9-]+$/.test(q.id) && !ids.has(q.id), 'Stable, unique safe quote ID: ' + q.id); ids.add(q.id);
  ok(!texts.has(ctx.dawnNorm(q.text)), 'No duplicate quote: ' + q.id); texts.add(ctx.dawnNorm(q.text));
  for (const key of ['text', 'speaker', 'work', 'locator', 'context', 'verified']) ok(typeof q[key] === 'string' && q[key].length > 0, q.id + ' has ' + key);
  ok(ctx.DAWN_COLLECTIONS.some(c => c[0] === q.collection), q.id + ' has a named collection');
  ok(q.sources.length > 0 && q.sources.every(s => s.label && /^https:\/\//.test(s.url) && new URL(s.url).hostname), q.id + ' has secure, labelled sources');
  ok(!/—|&mdash;| -- /.test(JSON.stringify(q)), 'No new dash prose: ' + q.id);
}
for (const c of ctx.DAWN_COLLECTIONS) ok(quotes.filter(q => q.collection === c[0] && q.daily !== false).length >= 3, c[1] + ' has a daily pool');
const covered = new Set();
for (const year of [2027, 2028, 2029]) {
  for (let d = new Date(year, 0, 1, 12); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
    const key = ctx.flDateKey(d);
    for (const name of ['Q', 'Q_MAKERS', 'Q_CLASSICS']) {
      const dated = vm.runInContext(name, ctx)[d.getMonth() + 1].find(e => e[0] === d.getDate())[1];
      const daily = ctx.dawnDaily(key, dated);
      ok(daily.length === 9, key + ' plus Year makes ten');
      ok(new Set(daily.map(q => ctx.dawnNorm(q.text))).size === 9, key + ' contains no repeated lines');
      ok(daily.every(q => ctx.dawnNorm(q.text) !== ctx.dawnNorm(dated) && q.daily !== false), key + ' excludes dated reading and library-only lines');
      ok(new Set(daily.map(q => q.collection)).size === 6, key + ' represents every collection');
      ok(JSON.stringify(daily) === JSON.stringify(ctx.dawnDaily(key, dated)), key + ' is stable across reloads');
      daily.forEach(q => covered.add(q.id));
    }
  }
}
ok(quotes.filter(q => q.daily !== false).every(q => covered.has(q.id)), 'Every daily quote can actually appear');
ctx.FL.prefs.dayEnd = 4;
const before = ctx.flDateKey(new Date(2026, 9, 12, 3, 59));
const after = ctx.flDateKey(new Date(2026, 9, 12, 4));
ok(before === '2026-10-11' && after === '2026-10-12', 'Daily quotes respect the shift boundary');
ok(JSON.stringify(ctx.dawnDaily(before)) !== JSON.stringify(ctx.dawnDaily(after)), 'The selection changes at the next day');
const record = JSON.stringify(ctx.FL);
ctx.dawnQuery = '<script>zz-unmatched'; ctx.dawnFilter = 'all';
const html = ctx.FL_VIEWS.anthology.render();
ok(!html.includes('value="<script>') && html.includes('value="&lt;script>'), 'Search input is escaped');
ok(html.includes('No quotations match'), 'Empty results explain recovery');
ctx.dawnQuery = '';
ok(ctx.FL_VIEWS.anthology.render('missing').includes('not in this edition'), 'Unknown deep links have recovery');
ok(ctx.FL_VIEWS.anthology.render(quotes[0].id).includes('<details open>'), 'Deep links open the source');
ok(JSON.stringify(ctx.FL) === record, 'Browsing never changes personal records');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const file of ['js/data-anthology.js', 'js/anthology.js', 'js/ui-anthology.js', 'css/house-anthology.css']) {
  ok(index.includes(file) && sw.includes(file), file + ' is loaded and precached');
}
console.log('Dawn Anthology: ' + quotes.length + ' quotes, ' + checks + ' checks passed.');
