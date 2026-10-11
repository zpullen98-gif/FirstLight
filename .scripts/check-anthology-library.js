/* The original quotation shelves share their existing data with the
   Anthology. Check the adapters and browsing without claiming to reverify
   their literary sources. Run with an optional deployable First Light root. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
const ctx = vm.createContext({ console, Date, Math, JSON, Number, String, Object, Array,
  FL_ACTS: {}, FL_VIEWS: {},
  FL: { prefs: { track: 'makers', canonLines: 'off' }, kept: { 'makers:1-1': 1 }, byheart: { 'classics:2-3': 2 } },
  document: { getElementById() { return null; } },
  render() {}, announce() {},
  esc: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
});
function load(file) { vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file }); }
load('js/anthology.js');
ok(ctx.dawnLibrary().length === 0, 'The shelf is lazy when data scripts have not loaded');
['js/data-year.js', 'js/data-year-makers.js', 'js/data-year-classics.js', 'js/data-uplift.js',
 'js/tracks.js', 'js/data-anthology.js', 'js/data-dawn-cast.js', 'js/data-dawn-writers.js', 'js/ui-dawn-cast.js', 'js/ui-dawn-writers.js', 'js/ui-anthology.js'].forEach(load);
const originals = vm.runInContext('({Q, Q_MAKERS, Q_CLASSICS, UPLIFT, DAWN_QUOTES})', ctx);
const beforeData = JSON.stringify(originals), beforeRecord = JSON.stringify(ctx.FL);
const library = ctx.dawnLibrary();
ok(library.length === originals.DAWN_QUOTES.length + 1254, 'All source-led and 1,254 original entries are available');
ok(new Set(library.map(q => q.id)).size === library.length, 'No quotation IDs collide');
ok(library.every(q => ctx.DAWN_COLLECTIONS.some(c => c[0] === q.collection)), 'Every entry has a named filter');
ok(library.filter(q => q.legacy && q.faithSource).length === 1 && ctx.dawnById('year-philosophers-11-20').faithSource === true,
  'Only the identified Dhammapada-derived Year entry carries the faith-search flag');
ok(originals.DAWN_QUOTES.every(q => ctx.dawnById(q.id) === q), 'Existing quotation IDs resolve to their original records');
for (const [track, data] of [['philosophers', originals.Q], ['makers', originals.Q_MAKERS], ['classics', originals.Q_CLASSICS]]) {
  ok(library.filter(q => q.collection === 'year-' + track).length === 366, track + ' keeps every dated slot');
  for (let month = 1; month <= 12; month++) for (const entry of data[month]) {
    const q = ctx.dawnById(ctx.dawnYearId(track, month, entry[0]));
    ok(q.text === entry[1] && q.speaker === entry[2] && q.tag === (entry[3] || '') && q.context === (entry[4] || ''), q.id + ' preserves text, citation and provenance');
    ok(q.month === month && q.day === entry[0] && q.track === track, q.id + ' retains its date and track');
    ok(!q.verified && !q.sources && !q.kind, q.id + ' does not invent evidence metadata');
  }
}
ok(library.filter(q => q.collection === 'lift').length === 156, 'The entire original Lift bank is browsable');
originals.UPLIFT.forEach((entry, index) => {
  const q = ctx.dawnById(ctx.dawnLiftId(index));
  ok(q.text === entry[0] && q.speaker === entry[1] && q.liftIndex === index, q.id + ' preserves the Lift citation');
  ok(!q.verified && !q.sources, q.id + ' is not relabelled as newly reviewed');
});
for (const collection of ['year-philosophers', 'year-makers', 'year-classics', 'lift']) {
  ctx.dawnFilter = collection; ctx.dawnQuery = '';
  const rows = ctx.dawnFiltered();
  ok(rows.length === (collection === 'lift' ? 156 : 366), collection + ' filter returns all its entries');
  const q = rows[0];
  ctx.dawnQuery = q.text;
  ok(ctx.dawnFiltered().some(row => row.id === q.id), collection + ' text is searchable');
  ctx.dawnQuery = q.speaker;
  ok(ctx.dawnFiltered().some(row => row.id === q.id), collection + ' citation is searchable');
  const detail = ctx.FL_VIEWS.anthology.render(q.id);
  ok(detail.includes('<details open>') && detail.includes('Original citation &amp; notes'), q.id + ' opens its citation notes');
  ok(!detail.includes('Sources checked ') && detail.includes('has not received a new source review'), q.id + ' honestly labels the old citation');
}
const noted = library.find(q => q.legacy === 'year' && q.context);
ok(ctx.dawnCard(noted).includes(ctx.esc(noted.context)), 'Legacy provenance qualifications remain visible in the source panel');
const uncertain = library.find(q => q.legacy === 'lift' && q.speaker.includes('origin uncertain'));
ok(uncertain && ctx.dawnCard(uncertain).includes('origin uncertain'), 'Uncertain Lift attribution is never stripped');
const hostile = { ...noted, text: '<script>line</script>', speaker: '<img src=x onerror=bad()>', context: '<iframe>note</iframe>' };
const escaped = ctx.dawnCard(hostile);
ok(!escaped.includes('<script>') && !escaped.includes('<img src=x') && !escaped.includes('<iframe>'), 'All legacy card content is escaped');
ctx.dawnFilter = 'all'; ctx.dawnQuery = '';
const allPage = ctx.FL_VIEWS.anthology.render();
ok((allPage.match(/data-quote-id=/g) || []).length === 12, 'Initial shelf renders twelve cards, not the entire library');
ok(allPage.includes('Read Today’s three') && !allPage.includes('Today’s ten'), 'Navigation describes the compact morning');
ok(allPage.includes('The original Year &amp; Lift') && allPage.includes('Source-checked selections'), 'Original and reviewed collections are clearly separated');
ok(ctx.FL_VIEWS.anthology.render('year-made-up-1-1').includes('not in this edition'), 'Invalid legacy links recover gracefully');
ok(ctx.FL_VIEWS.anthology.render('year-philosophers-11-20').includes('After the Dhammapada 204'),
  'The faith preference still permits deliberately opening the original citation in the Anthology');
ctx.dawnQuery = '<script>not-a-quotation';
const noMatch = ctx.FL_VIEWS.anthology.render();
ok(noMatch.includes('No quotations match') && noMatch.includes('value="&lt;script>'), 'Unmatched search is escaped and recoverable');
ctx.dawnQuery = '';
ctx.FL_TRACKS.push({ id: 'unfinished', label: 'Unfinished', q: () => ({ 1: [[1, 'Do not publish this preview', 'Fixture', 'Test']] }), months: () => originals.MONTHS });
ok(ctx.dawnLibrary().length === library.length, 'Incomplete Year tracks stay out of the Anthology');
ctx.FL_TRACKS.pop();
ok(JSON.stringify(originals) === beforeData, 'Browse adapters do not change or duplicate the stored datasets');
ok(JSON.stringify(ctx.FL) === beforeRecord, 'Browsing all shelves does not change track, vault or by-heart records');
console.log('Dawn Anthology library: ' + library.length + ' entries, ' + checks + ' checks passed.');
