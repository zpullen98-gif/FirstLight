/* Data provenance, cast references, privacy and safe rendering.
   Evidence is recorded in the anthology audit files, not inferred by a test.
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
['js/store.js', 'js/data-anthology.js', 'js/data-dawn-cast.js', 'js/data-dawn-writers.js', 'js/anthology.js', 'js/ui-dawn-cast.js', 'js/ui-dawn-writers.js', 'js/ui-anthology.js', 'js/data-year.js', 'js/data-year-makers.js', 'js/data-year-classics.js', 'js/data-uplift.js', 'js/tracks.js'].forEach(load);
const quotes = vm.runInContext('DAWN_QUOTES', ctx), ids = new Set(), texts = new Set();
for (const q of quotes) {
  ok(/^[a-z0-9-]+$/.test(q.id) && !ids.has(q.id), 'Stable, unique safe quote ID: ' + q.id); ids.add(q.id);
  ok(!texts.has(ctx.dawnNorm(q.text)), 'No duplicate quote: ' + q.id); texts.add(ctx.dawnNorm(q.text));
  for (const key of ['text', 'speaker', 'work', 'locator', 'context', 'verified']) ok(typeof q[key] === 'string' && q[key].length > 0, q.id + ' has ' + key);
  ok(ctx.DAWN_COLLECTIONS.some(c => c[0] === q.collection), q.id + ' has a named collection');
  ok(q.sources.length > 0 && q.sources.every(s => s.label && /^https:\/\//.test(s.url) && new URL(s.url).hostname), q.id + ' has secure, labelled sources');
  ok(!/—|&mdash;| -- /.test(JSON.stringify(q)), 'No new dash prose: ' + q.id);
}
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
for (const file of ['js/data-anthology.js', 'js/data-dawn-cast.js', 'js/data-dawn-writers.js', 'js/anthology.js', 'js/ui-dawn-cast.js', 'js/ui-dawn-writers.js', 'js/ui-anthology.js', 'css/house-anthology.css']) {
  ok(index.includes(file) && sw.includes(file), file + ' is loaded and precached');
}
const cast = ctx.DAWN_CAST, guests = cast.filter(p => p.group !== 'host');
ok(guests.length === 71 && cast.length === 72, 'PDF has 71 guests and one original host');
ok(ctx.DAWN_CAST_GROUPS.length === 6, 'Six gatherings preserve the PDF roster');
ok(new Set(cast.map(p => p.id)).size === cast.length, 'Cast IDs are unique');
for (const p of guests) {
  ok(p.quoteIds.length >= 10 && new Set(p.quoteIds).size === p.quoteIds.length, p.name + ' retains at least ten distinct selections');
  ok(p.quoteIds.every(id => ids.has(id)), p.name + ' has no broken references');
  ok((ctx.dawnCastProfile(p.id).match(/data-quote-id=/g) || []).length === p.quoteIds.length, p.name + ' renders every selection');
}
ok(ctx.dawnPerson('lizzy').quoteIds.length === 0, 'Lizzy awaits original text');
ok(ctx.dawnCastProfile('lizzy').includes('awaits your original writing'), 'Lizzy has an honest pending state');
ok(ctx.dawnCastProfile('unknown-person').includes('Browse the cast'), 'Unknown cast routes recover');
for (const q of quotes.filter(q => q.kind === 'account' || q.kind === 'tradition')) ok(q.daily === false, 'Context-sensitive source stays out of Today: ' + q.id);
ctx.dawnCastQuery = 'Tony Stark'; ctx.dawnCastGroup = 'all';
ok(ctx.dawnCastMatches().length === 1 && ctx.dawnCastMatches()[0].id === 'iron-man', 'Character aliases can be found');
ctx.dawnCastQuery = 'Jan Zizka';
ok(ctx.dawnCastMatches().length === 1, 'Accent-insensitive character search');
ctx.dawnCastQuery = '';
ctx.dawnCastGroup = 'explorers';
ok(ctx.dawnCastMatches().length === 11, 'Gathering filter follows the PDF');
ctx.dawnCastGroup = 'all';
const translated = quotes.find(q => q.originalText);
ok(translated && ctx.dawnCard(translated).includes('Source wording'), 'Original text accompanies new translations');
const hostile = {...quotes[0], originalText:'<img src=x onerror=alert(1)>', translation:'<script>bad</script>'};
ok(!ctx.dawnCard(hostile).includes('<img src=x') && !ctx.dawnCard(hostile).includes('<script>bad'), 'Additional source fields are escaped');
ok(JSON.stringify(ctx.FL) === record, 'Cast browsing leaves personal records unchanged');
/* Authorship is separate from the character speaking; reading links describe
   their actual access instead of promising an entire book behind an excerpt. */
const writers = ctx.DAWN_WRITERS;
ok(writers.length === 12 && new Set(writers.map(p => p.id)).size === 12, 'Twelve requested writers have distinct shelves');
ok(quotes.filter(q => q.collection === 'stage').length === 120, 'The Lantern Stage contains 120 selections');
for (const p of writers) {
  ok(p.quoteIds.length === 10 && new Set(p.quoteIds).size === 10, p.name + ' has ten distinct selections');
  ok(p.quoteIds.every(id => ids.has(id) && ctx.dawnById(id).author === p.name), p.name + ' references the actual writer');
  ok(p.works.length >= 2 && p.works.every(w => w.title && w.edition && w.note && /^https:\/\//.test(w.url)), p.name + ' has labelled reading editions');
  ok(p.works.every(w => ['Free full text', 'Authorised excerpt', 'Library borrowing'].includes(w.access)), p.name + ' describes access explicitly');
  const page = ctx.FL_VIEWS.anthology.render('writer-' + p.id);
  ok((page.match(/data-quote-id=/g) || []).length === 10 && page.includes('Read beyond the lines'), p.name + ' has a working reading and quote shelf');
  for (const id of p.quoteIds) {
    const q = ctx.dawnById(id), card = ctx.dawnCard(q);
    ok(q.daily === false && q.verified && q.sources.length > 0, id + ' remains sourced and library-only');
    ok(card.includes('writer-' + p.id), id + ' returns to the author shelf');
    if (q.speaker !== q.author) ok(card.includes('Written by ' + ctx.esc(p.name)), id + ' distinguishes character and author');
  }
}
for (const [query,id] of [['Moliere','moliere'],['Eripides','euripides'],['Anton Chekhoy','anton-chekhov'],['Twelfth Night','william-shakespeare'],['The Wild Duck','henrik-ibsen'],['The Lady with the Dog','anton-chekhov'],['Murphy','samuel-beckett'],['The House of Fame','geoffrey-chaucer']]) {
  ctx.dawnWriterQuery = query;
  ok(ctx.dawnWriterMatches().some(p => p.id === id), query + ' finds the intended author');
}
ctx.dawnWriterQuery = '';
ok(ctx.FL_VIEWS.anthology.render('writer-absent').includes('Browse The Lantern Stage'), 'Unknown writer link recovers');
ctx.dawnWriterQuery = '<script>not-a-writer';
const noWriter = ctx.dawnWriterIndex();
ok(noWriter.includes('No writers match') && !noWriter.includes('value="<script>'), 'Writer search escapes unknown input');
ctx.dawnWriterQuery = '';
const unsafeWorks = ctx.dawnWriterWorks({works:[{title:'<script>bad</script>',url:'javascript:alert(1)',access:'<img src=x>',edition:'<iframe>x</iframe>',note:'<script>note</script>'}]});
ok(!unsafeWorks.includes('javascript:') && !unsafeWorks.includes('<script>') && !unsafeWorks.includes('<img src=') && !unsafeWorks.includes('<iframe>'), 'External reading links and metadata are safe');
ok(JSON.stringify(ctx.FL) === record, 'Author browsing leaves personal records unchanged');
/* Integration regression: an enlarged anthology must respect both personal
   search priority and the reader's choice to keep faith readings off search. */
Object.assign(ctx,{trackQ:()=>({}),trackMonths:()=>[],LIFE:[],LIFE_ALT:{},PRACTICES:[],REFLECTIONS:[],BODY_TEACH:[],EIGHT_LIMBS:[],SIGNS:[],A_PLANETS:[],A_HOUSES:[],jAll:()=>[{ref:'journal:fixture',text:'human journal reflection',d:'2026-10-11'},{ref:'clear:fixture',text:'human private note',d:'2026-10-11'}],jLabel:()=> 'My words',jPrettyDate:d=>d,jHref:()=> '#/journal'});
load('js/search.js');
const anthology = ctx.DAWN_QUOTES, library = ctx.dawnLibrary;
ctx.DAWN_QUOTES = Array.from({length:300},(_,i)=>({...quotes[0],id:'test-'+i,text:'human thought '+i}));
ctx.dawnLibrary = () => ctx.DAWN_QUOTES;
const crowded = ctx.flSearch('human');
ok(crowded.results[0].group === 'Your journal', 'Journal survives more than 240 anthology matches');
ok(crowded.results.length === 60 && crowded.total === 301, 'Result cap preserves full match counts');
ok(crowded.counts['Your journal'] === 1, 'Clear Mornings stays private during crowded search');
ctx.DAWN_QUOTES = anthology; ctx.dawnLibrary = library;
ctx.FL.prefs.canonLines = 'off';
ok(!ctx.flSearch('Jesus of Nazareth').results.some(r=>r.group === 'The Dawn Anthology'), 'Faith tradition respects global search preference');
ok(!ctx.flSearch('Dhammapada').results.some(r=>r.href === '#/anthology/year-philosophers-11-20'), 'Existing Dhammapada citation respects search preference');
ctx.FL_TEXT={test:{one:{book:'Fixture',ch:[['faith-test-sentinel']]}}};ctx.FL_LIBRARY={test:{title:'Fixture'}};
ok(ctx.flSearch('faith-test-sentinel').results.length === 0, 'Loaded scripture respects the same preference');
ctx.FL.prefs.canonLines = 'on';
ok(ctx.flSearch('Jesus of Nazareth').results.some(r=>r.group === 'The Dawn Anthology'), 'Opting in makes tradition passages searchable');
ok(ctx.flSearch('Dhammapada').results.some(r=>r.href === '#/anthology/year-philosophers-11-20'), 'Opting in makes the existing Dhammapada citation searchable');
for (const id of ['year-makers-1-1','year-classics-1-1','lift-001']) { const q = ctx.dawnById(id); ok(ctx.flSearch(q.text.slice(0,35)).results.some(r => r.href === '#/anthology/' + id), 'All legacy shelves can be found in global search: ' + id); }
ok(ctx.flSearch('faith-test-sentinel').results.some(r=>r.group === 'Scripture'), 'Opting in makes loaded scripture searchable');
console.log('Dawn Anthology: ' + quotes.length + ' quotes, ' + checks + ' checks passed.');
