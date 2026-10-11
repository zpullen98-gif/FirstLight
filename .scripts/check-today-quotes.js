/* Today stays a dated voice and two lifts; the complete shelves stay in the
   Anthology. Exercise real quotation data and the in-place Lift refresh.
   Run: node .scripts/check-today-quotes.js [deployable First Light root] */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
function equal(actual, expected, message) { assert.equal(actual, expected, message); checks++; }
const nodes = {}, announcements = [];
const ctx = vm.createContext({ console, Date, Math, JSON, Number, String, Object, Array,
  setTimeout() {}, clearTimeout() {},
  window: { addEventListener() {}, dispatchEvent() {} },
  document: { addEventListener() {}, getElementById: id => nodes[id] || null },
  CustomEvent: function (type, detail) { this.type = type; this.detail = detail; },
  FL_ACTS: {}, FL_VIEWS: {},
  announce: message => announcements.push(message),
  render() { throw Error('Choosing another Lift must not repaint Today.'); },
  pacerStop() { throw Error('Choosing another Lift must not stop the pacer.'); },
  esc: value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
});
function load(file) { vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file }); }
load('js/store.js');
/* Production loads Anthology before the Year corpora. The library must resolve
   those corpora at use time, without taking or rewriting an earlier snapshot. */
load('js/data-anthology.js'); load('js/anthology.js');
const initialSource = JSON.stringify(ctx.DAWN_QUOTES);
equal(ctx.dawnLibrary().length, ctx.DAWN_QUOTES.length, 'The source shelf works before legacy data loads');
['js/tracks.js', 'js/data-year.js', 'js/data-year-makers.js', 'js/data-year-classics.js', 'js/data-uplift.js', 'js/plan.js', 'js/ui-today.js'].forEach(load);
const originalData = vm.runInContext('JSON.stringify([Q,Q_MAKERS,Q_CLASSICS,UPLIFT])', ctx);
const uplift = vm.runInContext('UPLIFT', ctx);
const library = ctx.dawnLibrary(), byId = new Map(library.map(q => [q.id, q]));
equal(byId.size, library.length, 'Every Anthology destination has a unique ID');
equal(library.length, ctx.DAWN_QUOTES.length + 3 * 366 + uplift.length, 'All three Year tracks and the Lift join the existing Anthology');
for (const track of ctx.FL_TRACKS) {
  for (let m = 1; m <= 12; m++) for (const entry of track.q()[m]) {
    const row = byId.get(ctx.dawnYearId(track.id, m, entry[0]));
    ok(row && row.text === entry[1] && row.speaker === entry[2], 'Year links retain the original wording and attribution');
    equal(row.context, entry[4] || '', 'Year provenance notes survive the move');
  }
}
uplift.forEach((entry, index) => {
  const row = byId.get(ctx.dawnLiftId(index));
  ok(row && row.text === entry[0] && row.speaker === entry[1], 'Lift links retain the original wording and attribution');
});
let now = new Date(2028, 0, 1, 12);
ctx.flShiftedNow = () => new Date(now);
ctx.flToday = () => now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
ctx.FL.kept = { 'classics:1-1': 1 };
ctx.FL.byheart = { 'makers:2-2': 2 };
ctx.FL.workoutSets = { '2028-01-01': { fixture: { count: 3, updated: 1 } } };
ctx.FL.journal = { fixture: { text: 'A personal reflection.', d: '2028-01-01' } };
ctx.flSave = () => { throw Error('Rendering quotation shelves must not save personal records.'); };
for (const track of ctx.FL_TRACKS) {
  ctx.FL.prefs.track = track.id;
  const personalRecord = JSON.stringify(ctx.FL);
  for (let day = 1; day <= 366; day++) {
    const md = ctx.doyToMD(day);
    now = new Date(2028, md[0] - 1, md[1], 12);
    const entry = ctx.dayEntry(md[0], md[1]);
    const voice = ctx.todayVoice(md[0], md[1], entry);
    ok(voice.includes('href="#/anthology/' + ctx.dawnYearId(track.id, md[0], md[1]) + '"'), 'The dated voice opens its exact Anthology entry');
    if (entry.n) ok(voice.includes(ctx.esc(entry.n)), 'The dated voice still shows its provenance note');
    ctx.todayLiftDay();
    let preceding;
    for (const seed of [0, 1, 7, 31]) {
      ctx.liftSeed = seed;
      const pair = ctx.todayLiftQuotes(day), serial = JSON.stringify(pair);
      equal(pair.length, 2, 'Every date and track has exactly two lifts');
      const keys = pair.map(q => ctx.dawnNorm(q.text));
      ok(keys[0] !== keys[1] && !keys.includes(ctx.dawnNorm(entry.q)), 'Three readings do not repeat normalized wording');
      equal(JSON.stringify(ctx.todayLiftQuotes(day)), serial, 'A date and session seed deal a stable pair');
      ok(pair.every(q => byId.has(q.id) && byId.get(q.id).text === q.text), 'Both lifts open the same words in the Anthology');
      ok(pair.every(q => q.id.startsWith('lift-') || q.id.startsWith('year-classics-')), 'Today draws only from the original Lift and Classics shelves');
      const html = ctx.todayLiftLines(day);
      equal((html.match(/data-lift-id=/g) || []).length, 2, 'Exactly two Lift cards render');
      for (const q of pair) if (q.note) ok(html.includes(ctx.esc(q.note)), 'Lift cards preserve citation caveats');
      if (preceding) ok(preceding !== serial, 'Another selection changes the pair');
      preceding = serial;
    }
  }
  equal(JSON.stringify(ctx.FL), personalRecord, 'Reading Today never changes personal records');
}

/* The next lived day gets its original pair, including an already-open page.
   Pressing Another updates only the quotation container, preserving players. */
ctx.FL.prefs.track = 'philosophers';
now = new Date(2028, 9, 11, 12);
ctx.todayLiftDay(); ctx.liftSeed = 19;
now = new Date(2028, 9, 12, 12);
const nextDay = ctx.doyOf(10, 12);
ctx.todayLiftQuotes(nextDay);
equal(ctx.liftSeed, 0, 'A new lived day resets the Lift seed');
equal(ctx.liftDay, '2028-10-12', 'The Lift follows the new lived date');
nodes['today-lift-lines'] = { innerHTML: ctx.todayLiftLines(nextDay) };
nodes['today-films'] = Object.freeze({ innerHTML: '<iframe title="Ongoing workout"></iframe>' });
nodes['pacer-disc'] = Object.freeze({ running: true });
ctx.pacer = { on: true };
const recordBeforeRefresh = JSON.stringify(ctx.FL), oldPair = nodes['today-lift-lines'].innerHTML;
ctx.FL_ACTS.liftAgain();
equal(ctx.liftSeed, 1, 'Another advances the session selection');
ok(nodes['today-lift-lines'].innerHTML !== oldPair, 'Another updates the visible pair');
equal((nodes['today-lift-lines'].innerHTML.match(/data-lift-id=/g) || []).length, 2, 'Another keeps two lifts visible');
equal(nodes['today-films'].innerHTML, '<iframe title="Ongoing workout"></iframe>', 'The workout player remains untouched');
ok(ctx.pacer.on, 'The running pacer remains untouched');
equal(JSON.stringify(ctx.FL), recordBeforeRefresh, 'Another leaves saved records and preferences untouched');
equal(announcements.pop(), 'Two more lines.', 'The in-place refresh is announced');
delete nodes['today-lift-lines'];
ctx.FL_ACTS.liftAgain();
equal(ctx.liftSeed, 1, 'A stale Another action cannot change a hidden shelf');

/* Keep the original guided rhythm, with the voice first and the lift at the
   practice step. Stub unrelated teaching panels, not quotation rendering. */
Object.assign(ctx, {
  TURN_PROMPTS: ['A quiet moment.'],
  todayBreath: () => '<div data-test="breath"></div>',
  todayMove: () => '<div data-test="movement"></div>',
  todayFilms: () => '<iframe title="Workout"></iframe>',
  todayPractice: () => '<div data-test="practice"></div>',
  todayTeaching: () => '', todayIntentPanel: () => '', todaySortPanel: () => ''
});
const e = ctx.dayEntry(10, 12), count = (html, pattern) => (html.match(pattern) || []).length;
const full = ctx.todayPage(10, 12, e, nextDay, []);
equal(count(full, /class="qt"/g), 1, 'Whole-page Today contains one dated voice');
equal(count(full, /data-lift-id=/g), 2, 'Whole-page Today contains two lifts');
ok(full.includes('A lift for the day') && full.includes('href="#/anthology"'), 'Today preserves the Lift and leads to the full library');
ctx.todayStep = 0;
const start = ctx.todayGuided(10, 12, e, nextDay, []);
equal(count(start, /class="qt"/g), 1, 'Guided morning begins with the dated voice');
equal(count(start, /data-lift-id=/g), 0, 'Guided first step stays focused on one reading');
ctx.todayStep = 3;
const practice = ctx.todayGuided(10, 12, e, nextDay, []);
equal(count(practice, /class="qt"/g), 0, 'The practice step does not repeat the dated voice');
equal(count(practice, /data-lift-id=/g), 2, 'The guided practice step provides both lifts');
ok(practice.includes('data-test="practice"'), 'The practice remains beside the Lift');
equal(vm.runInContext('JSON.stringify([Q,Q_MAKERS,Q_CLASSICS,UPLIFT])', ctx), originalData, 'All original source records remain unchanged');
equal(JSON.stringify(ctx.DAWN_QUOTES), initialSource, 'Expanded source-led Anthology records remain unchanged');
equal(JSON.stringify(ctx.FL), recordBeforeRefresh, 'Rendering both morning modes preserves the personal record');
console.log('Today quotations: 366 dates across three tracks; ' + checks + ' checks passed.');
