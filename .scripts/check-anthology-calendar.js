/* Actual library and Gregorian dates: the explicit Anthology reading journey.
   Run: node .scripts/check-anthology-calendar.js [deployable First Light root] */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
function equal(actual, expected, message) { assert.equal(actual, expected, message); checks++; }
const ctx = vm.createContext({ console, Date, Math, JSON, Number, String, Object, Array, Set,
  setTimeout() {}, clearTimeout() {},
  window: { addEventListener() {}, dispatchEvent() {} }, document: { addEventListener() {} },
  FL_ACTS: {}, FL_VIEWS: {} });
function load(file) { vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file }); }
load('js/store.js'); load('js/anthology.js'); load('js/plan.js'); load('js/anthology-calendar.js');
const realSave = ctx.flSave;
equal(ctx.dawnReadingPlan('2026-01-01').length, 0, 'Lazy reading plan is empty before any quotation data loads');
['js/data-year.js', 'js/data-year-makers.js', 'js/data-year-classics.js', 'js/data-uplift.js', 'js/tracks.js', 'js/data-anthology.js'].forEach(load);
const library = ctx.dawnLibrary(), lookup = new Map(library.map(q => [q.id, q]));
const originalData = vm.runInContext('JSON.stringify([Q,Q_MAKERS,Q_CLASSICS,UPLIFT,DAWN_QUOTES])', ctx);
ctx.FL.prefs = { track: 'makers', canonLines: 'off', dayEnd: 6 };
ctx.FL.kept = { 'makers:1-1': 1 };
ctx.FL.journal = { private: { text: 'Keep this personal record intact.' } };
ctx.FL.anthologyRead = {};
const beforeRecord = JSON.stringify(ctx.FL);
ctx.flSave = () => { throw Error('Reading and browsing must not write progress.'); };
equal(library.length, 2387, 'The complete current library enters the journey');
equal(ctx.dawnReadingSections.length, 3, 'Three short reading sections');
ok(ctx.dawnReadingSections.every(section => section.title && section.prompt), 'Each short reading has an editorial invitation');
const years = [2026, 2028], yearPlans = {};
for (const year of years) {
  const seen = new Set(), months = [], plans = [];
  for (let month = 0; month < 12; month++) {
    const collections = new Set();
    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
      const key = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const reading = ctx.dawnReadingPlan(key);
      equal(reading.length, 12, key + ' has twelve selections');
      equal(new Set(reading.map(q => ctx.dawnNorm(q.text))).size, 12, key + ' does not repeat the same wording');
      for (const q of reading) {
        ok(lookup.has(q.id), key + ' uses an existing quotation ID');
        equal(JSON.stringify(q), JSON.stringify(lookup.get(q.id)), q.id + ' retains its complete original source/provenance record');
        if (!q.legacy) ok(ctx.DAWN_QUOTES.includes(q), q.id + ' retains the actual original source object');
        seen.add(q.id); collections.add(q.collection);
      }
      plans.push(reading.map(q => q.id));
    }
    months.push(collections.size);
  }
  equal(plans.length, year === 2028 ? 366 : 365, year + ' has exactly its real calendar dates');
  equal(seen.size, library.length, year + ' reaches every original record, including all editions');
  ok(months.every(count => count === 14), year + ' spreads all fourteen collections into every month');
  yearPlans[year] = plans;
}
equal(JSON.stringify(ctx.dawnReadingPlan('2026-10-23')), JSON.stringify(ctx.dawnReadingPlan('2026-10-23')), 'Revisiting a date is deterministic');
const stable = JSON.stringify(ctx.dawnReadingPlan('2026-03-01'));
ctx.dawnReadingCache = null;
equal(JSON.stringify(ctx.dawnReadingPlan('2026-03-01')), stable, 'A fresh cache has the same reading');
equal(JSON.stringify(ctx.dawnReadingPlan('2028-03-01')), stable, 'A dated slot stays the same in common and leap years');
ok(new Set(yearPlans[2026].flat()).size < yearPlans[2026].flat().length, 'The annual plan revisits records rather than claiming 4,380 unique quotes');
ok(library.filter(q => q.kind === 'tradition' || q.kind === 'account' || q.kind === 'portrayal').every(q => yearPlans[2026].some(day => day.includes(q.id))), 'Explicit Anthology includes the labelled tradition/account/portrayal shelves');
equal(JSON.stringify(ctx.FL), beforeRecord, 'Generating and browsing a year does not change any personal state');
equal(vm.runInContext('JSON.stringify([Q,Q_MAKERS,Q_CLASSICS,UPLIFT,DAWN_QUOTES])', ctx), originalData, 'Every original quotation dataset is unchanged');
for (const key of ['', '2026-2-03', '2026-02-29', '1900-02-29', '2100-02-29', '2026-04-31', '2026-00-10', '2026-13-10', '2026-01-00', '1899-12-31', '2101-01-01', '2026-01-01T12:00:00Z', null, 20260101]) {
  equal(ctx.dawnReadingDate(key), null, String(key) + ' is rejected rather than normalised');
  equal(ctx.dawnReadingPlan(key).length, 0, String(key) + ' has no accidental reading');
}
for (const key of ['1900-01-01', '2000-02-29', '2026-03-08', '2026-11-01', '2026-12-31', '2027-01-01', '2028-02-29', '2100-12-31']) {
  const date = ctx.dawnReadingDate(key);
  ok(date && date.getHours() === 12, key + ' is a local-noon date');
  equal(ctx.dawnReadingKey(date), key, key + ' round-trips without UTC or shift-clock movement');
}
equal(ctx.dawnReadingKey(new Date('invalid')), '', 'Invalid dates do not produce a key');
equal(ctx.dawnReadingKey(null), '', 'Missing dates do not produce a key');
const originalTZ = process.env.TZ;
for (const zone of ['America/New_York', 'Europe/London', 'Pacific/Auckland', 'Pacific/Honolulu']) {
  process.env.TZ = zone;
  for (const key of ['2026-01-01', '2026-03-08', '2026-11-01', '2026-12-31', '2028-02-29']) {
    equal(ctx.dawnReadingKey(ctx.dawnReadingDate(key)), key, zone + ' keeps the selected civil date');
    equal(ctx.dawnReadingPlan(key).length, 12, zone + ' has a complete reading');
  }
  const early = new Date(2026, 9, 23, 2, 0, 0);
  equal(ctx.dawnReadingKey(early), '2026-10-23', zone + ' does not shift a selected date at 2am');
  ctx.flToday = () => ctx.flDateKey(early);
  equal(ctx.dawnReadingToday(), '2026-10-22', zone + ' Today alone honours the 6am shift boundary');
}
if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ;
let saves = 0;
ctx.flSave = immediate => { ok(immediate === true, 'Completion saves immediately'); saves++; return true; };
const key = '2026-10-23', mark = ctx.dawnReadingMarkKey(key, 0);
ok(/^2026-10-23:p1:[0-9a-f]{8}$/.test(mark), 'Completion keys include date, reading position and a content fingerprint');
ok(new Set([0, 1, 2].map(part => ctx.dawnReadingMarkKey(key, part))).size === 3, 'The three readings have separate completion keys');
ok(ctx.dawnReadingMarkKey('2027-10-23', 0) !== mark, 'A new calendar year has its own completion record');
equal(ctx.dawnReadingDone(key, 0), false, 'Reading begins unmarked');
equal(ctx.dawnReadingToggle(key, 0), true, 'An explicit mark reports a successful save');
equal(ctx.FL.anthologyRead[mark].done, 1, 'Only the chosen reading is marked');
const markedAt = ctx.FL.anthologyRead[mark].updated;
ok(Number.isFinite(markedAt) && markedAt > 0, 'A completion retains its edit time for backup merging');
equal(ctx.dawnReadingDone(key, 0), true, 'Saved progress is available to the calendar');
equal(ctx.dawnReadingDone(key, 1), false, 'The next reading does not inherit completion');
equal(ctx.dawnReadingToggle(key, 0), true, 'An explicit undo reports a successful save');
equal(ctx.dawnReadingDone(key, 0), false, 'Undo unmarks only that reading');
equal(ctx.FL.anthologyRead[mark].done, 0, 'Undo retains a tombstone so an older backup cannot revive progress');
ok(ctx.FL.anthologyRead[mark].updated > markedAt, 'Undo has a strictly newer edit even within the same millisecond');
equal(saves, 2, 'Only explicit mark and undo saved');
ctx.flSave = () => false;
equal(ctx.dawnReadingToggle(key, 0), false, 'A failed save is reported honestly');
equal(ctx.dawnReadingDone(key, 0), false, 'A failed save restores the previous unmarked state');
ctx.FL.anthologyRead[mark] = { done: 1, updated: markedAt };
equal(ctx.dawnReadingToggle(key, 0), false, 'A failed undo is reported honestly');
equal(ctx.dawnReadingDone(key, 0), true, 'A failed undo restores the previous completed state');
ctx.flSave = () => { throw Error('Storage fixture failure'); };
equal(ctx.dawnReadingToggle(key, 0), false, 'A thrown save failure returns false');
equal(ctx.dawnReadingDone(key, 0), true, 'A thrown failure also restores the old completion');
delete ctx.FL.anthologyRead;
equal(ctx.dawnReadingToggle(key, 0), false, 'Failure with an older record does not pretend to save');
ok(!Object.hasOwn(ctx.FL, 'anthologyRead'), 'Failure restores even a previously absent additive field');
ctx.localStorage = { getItem() { throw Error('Denied read'); }, setItem() { throw Error('Denied write'); } };
ctx.flMem[ctx.FL_KEY] = JSON.stringify(ctx.FL);
const previousFallback = ctx.flMem[ctx.FL_KEY];
ctx.flStorageBroken = true;
ctx.flSave = realSave;
equal(ctx.dawnReadingToggle(key, 0), false, 'The real persistence layer reports a denied write');
equal(ctx.flMem[ctx.FL_KEY], previousFallback, 'A failed save also restores the memory fallback snapshot');
ok(!Object.hasOwn(ctx.FL, 'anthologyRead'), 'The real denied save leaves the additive field absent as before');
delete ctx.flMem[ctx.FL_KEY];
equal(ctx.dawnReadingToggle(key, 0), false, 'Denied save without a prior fallback is also reported');
ok(!Object.hasOwn(ctx.flMem, ctx.FL_KEY), 'A failed save does not leave a newly-created phantom fallback tick');
for (const part of [-1, 3, 0.5, '0', null]) {
  equal(ctx.dawnReadingMarkKey(key, part), '', 'Invalid reading position is rejected');
  equal(ctx.dawnReadingToggle(key, part), false, 'Invalid reading position writes nothing');
}
equal(ctx.dawnReadingToggle('2026-02-29', 0), false, 'A nonexistent date cannot acquire progress');
const selected = ctx.dawnReadingPlan(key)[0], source = ctx.DAWN_QUOTES.find(q => q.id === selected.id);
/* Use a source-led selection if the first daily slot happens to be a legacy one. */
const sourceEntry = source || ctx.dawnReadingPlan(key).find(q => !q.legacy);
const part = Math.floor(ctx.dawnReadingPlan(key).findIndex(q => q.id === sourceEntry.id) / 4);
const priorMark = ctx.dawnReadingMarkKey(key, part), oldId = sourceEntry.id;
sourceEntry.id = oldId + '-replacement-fixture';
ok(ctx.dawnReadingPlan(key).some(q => q.id === sourceEntry.id), 'Same-length source ID replacement invalidates the lazy plan');
ok(ctx.dawnReadingMarkKey(key, part) !== priorMark, 'A changed assigned ID cannot inherit the old completion key');
sourceEntry.id = oldId;
equal(ctx.dawnReadingMarkKey(key, part), priorMark, 'Restoring the original records restores their deterministic plan');
ctx.DAWN_QUOTES.push({ id: 'append-fixture', text: 'An appended test quotation only.', collection: 'history', speaker: 'Fixture' });
ok(ctx.dawnReadingBuild().total === library.length + 1, 'Adding a quote invalidates the cache');
ok(ctx.dawnReadingBuild().days.some(day => day.some(q => q.id === 'append-fixture')), 'An appended quote enters the complete reading journey');
ctx.DAWN_QUOTES.pop();
equal(ctx.dawnReadingBuild().total, library.length, 'Removing the fixture restores the original plan');
equal(vm.runInContext('JSON.stringify([Q,Q_MAKERS,Q_CLASSICS,UPLIFT,DAWN_QUOTES])', ctx), originalData, 'All fixtures leave original content untouched');

/* Exercise the actual export/import and persistence layer, not a second merge
   implementation inside the gate. The surrounding personal record is sacred. */
const durable = new Map();
ctx.localStorage = { getItem: name => durable.has(name) ? durable.get(name) : null, setItem: (name, value) => durable.set(name, String(value)) };
ctx.flSave = realSave;
ctx.flStorageBroken = false;
ctx.FL.anthologyRead = {};
ctx.FL.prefs.migratedFl2 = 1;
ctx.FL.days = ['2026-10-20', '2026-10-22'];
ctx.FL.checks = { 'g-2-1': 1 };
ctx.FL.practice = { '2026-10-22': 1 };
ctx.FL.workoutSets = { '2026-10-22': { abcdefghijk: { count: 3, updated: 100 } } };
ctx.FL.byheart = { 'classics:2-2': 2 };
const otherState = () => JSON.stringify(Object.fromEntries(Object.entries(ctx.FL).filter(([name]) => name !== 'anthologyRead')));
const otherBefore = otherState();
const mark2 = ctx.dawnReadingMarkKey(key, 1), mark3 = ctx.dawnReadingMarkKey(key, 2);
const importMarks = rows => ctx.flImport(JSON.stringify({ app: 'First Light', schema: 1, record: { anthologyRead: rows } }));
ctx.FL.anthologyRead[mark] = { done: 0, updated: 200 };
importMarks({ [mark]: { done: 1, updated: 100 } });
equal(ctx.FL.anthologyRead[mark].done, 0, 'Importing an older completed backup cannot resurrect an undone reading');
equal(ctx.FL.anthologyRead[mark].updated, 200, 'An older backup retains the local undo timestamp');
importMarks({ [mark]: { done: 1, updated: 300 } });
equal(ctx.FL.anthologyRead[mark].done, 1, 'A genuinely newer completion replaces an older undo');
importMarks({ [mark]: { done: 0, updated: 300 } });
equal(ctx.FL.anthologyRead[mark].done, 0, 'An equal-time conflict favours undo');
importMarks({ [mark]: { done: 1, updated: 300 } });
equal(ctx.FL.anthologyRead[mark].done, 0, 'Import order cannot reverse the equal-time undo decision');
importMarks({ [mark]: { done: 1, updated: 400 } });
importMarks({ [mark]: { done: 0, updated: 350 } });
equal(ctx.FL.anthologyRead[mark].done, 1, 'An older undo cannot erase a newer completion');
importMarks({ [mark2]: { done: 1, updated: 150 }, [mark3]: { done: 0, updated: 250, extra: 'Do not copy extra fields' } });
equal(ctx.FL.anthologyRead[mark2].done, 1, 'A separate reading joins the current progress');
equal(JSON.stringify(ctx.FL.anthologyRead[mark3]), '{"done":0,"updated":250}', 'Imported records retain only the supported completion shape');
equal(otherState(), otherBefore, 'Progress-only imports preserve every other personal field');

const obsoleteMark = '2025-10-23:p1:deadbeef';
importMarks({ [obsoleteMark]: { done: 1, updated: 500 } });
ok(ctx.FL.anthologyRead[obsoleteMark], 'An older edition fingerprint is retained for backups without reassigning its meaning');
equal(ctx.dawnReadingDone('2025-10-23', 0), false, 'An older edition fingerprint does not mark the current assigned reading');
const beforeMalformed = JSON.stringify(ctx.FL.anthologyRead);
for (const bucket of [null, false, 42, 'invalid', []]) {
  importMarks(bucket);
  equal(JSON.stringify(ctx.FL.anthologyRead), beforeMalformed, 'Malformed progress buckets cannot replace current progress');
}
const malformedKeys = [
  'not-a-reading', '__proto__', 'constructor', ' ' + mark, mark + ' ',
  '2026-10-23:p0:12345678', '2026-10-23:p4:12345678', '2026-10-23:p1:1234567', '2026-10-23:p1:123456789',
  '2026-10-23:p1:ABCDEF12', '2026-2-03:p1:12345678', '2026-02-29:p1:12345678',
  '1900-02-29:p1:12345678', '2100-02-29:p1:12345678', '2026-04-31:p1:12345678',
  '2026-00-01:p1:12345678', '2026-13-01:p1:12345678', '2026-01-00:p1:12345678',
  '1899-12-31:p1:12345678', '2101-01-01:p1:12345678'
];
for (const badKey of malformedKeys) {
  importMarks({ [badKey]: { done: 1, updated: 1000 } });
  equal(JSON.stringify(ctx.FL.anthologyRead), beforeMalformed, 'Invalid completion key is rejected: ' + badKey);
}
const badRows = [null, [], 1, true, '1', {}, { updated: 1000 }, { done: 2, updated: 1000 },
  { done: -1, updated: 1000 }, { done: '1', updated: 1000 }, { done: true, updated: 1000 },
  { done: 1, updated: 0 }, { done: 1, updated: -1 }, { done: 1, updated: 1.5 },
  { done: 1, updated: '1000' }, { done: 1, updated: Number.MAX_SAFE_INTEGER + 1 },
  { done: 1, updated: NaN }, { done: 1, updated: Infinity }];
for (const badRow of badRows) {
  importMarks({ [mark]: badRow });
  equal(JSON.stringify(ctx.FL.anthologyRead), beforeMalformed, 'Malformed progress row does not replace a valid local record');
}
const decoratedArray = [];
decoratedArray.done = 1; decoratedArray.updated = 1000;
ctx.flMergeAnthologyRead({ [mark]: decoratedArray });
equal(JSON.stringify(ctx.FL.anthologyRead), beforeMalformed, 'Even a decorated array cannot enter the record through the merge helper');
ctx.flMergeAnthologyRead(Object.create({ [mark]: { done: 0, updated: 1000 } }));
equal(JSON.stringify(ctx.FL.anthologyRead), beforeMalformed, 'Inherited object fields are ignored by the merge helper');
equal(otherState(), otherBefore, 'Malformed imports leave the rest of the personal record unchanged');

const exported = ctx.flExport(), exportedRecord = JSON.parse(exported).record;
equal(JSON.stringify(exportedRecord.anthologyRead), beforeMalformed, 'Export includes completed readings and undo tombstones exactly');
equal(JSON.stringify(JSON.parse(durable.get(ctx.FL_KEY)).anthologyRead), beforeMalformed, 'Real imports persist the merged progress in the existing storage key');
/* Loading only the existing store simulates a fresh device. The calendar helpers
   remain in the same global scope and therefore read the newly created record. */
load('js/store.js');
ctx.flImport(exported);
equal(JSON.stringify(ctx.FL.anthologyRead), beforeMalformed, 'An export restores all progress on a fresh record');
equal(otherState(), otherBefore, 'An export restores all preceding personal records and preferences');
ok(ctx.dawnReadingDone(key, 0) && ctx.dawnReadingDone(key, 1) && !ctx.dawnReadingDone(key, 2), 'Restored marks and undo tombstones are correctly reported by the daily reader');
ctx.FL.anthologyRead = {};
ctx.flBoot();
equal(JSON.stringify(ctx.FL.anthologyRead), beforeMalformed, 'A subsequent boot reads the persisted Anthology progress');
equal(otherState(), otherBefore, 'A subsequent boot preserves other personal records');
console.log('Dawn Anthology calendar: ' + library.length + ' records, common/leap year coverage, ' + checks + ' checks passed.');
