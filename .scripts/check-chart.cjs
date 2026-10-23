/* Synthetic natal records only. Never place the owner's birth details here.
   Exercises civil-time transitions, validation, saved chart restoration and
   loading recovery using the same calculation and view files as the app. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const Astronomy = require(path.join(root, 'js/vendor/astronomy.js'));
let count = 0;
function check(label, fn) { fn(); count++; }
const fields = {};
const listeners = {};
const ctx = vm.createContext({
  Date, Intl, Math, Number, JSON, Promise, setTimeout, clearTimeout,
  window: { Astronomy, innerWidth: 390 },
  FL: { prefs: {} }, FL_ACTS: {}, FL_VIEWS: {}, FL_CITIES: [['Test City','Test',51.5,0,0]], FL_ZONES: ['Europe/London'],
  document: { getElementById: id => fields[id] || null, addEventListener: (kind, fn) => { listeners[kind] = fn; } },
  esc: v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  flSave: () => true, render: () => {}, announce: () => {}, toast: () => {},
  flRoute: { view: 'chart' }, FL_TEXT_V: 3
});
for (const file of ['astro-chart.js','astro-wheel.js','ui-chart.js']) {
  vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'), ctx, { filename: file });
}
const birth = { date:'2000-06-15', time:'14:30', lat:51.5, lon:0, zone:'Europe/London', sys:'whole' };
const resolve = change => ctx.birthUTC(Object.assign({}, birth, change));
check('summer daylight time', () => assert.equal(resolve().utc.toISOString(), '2000-06-15T13:30:00.000Z'));
check('winter standard time', () => assert.equal(resolve({date:'2000-01-15'}).usedOffset, 0));
check('fractional zone', () => assert.equal(resolve({zone:'Asia/Kathmandu'}).usedOffset, 5.75));
check('explicit zero offset', () => assert.equal(resolve({offset:0}).utc.toISOString(), '2000-06-15T14:30:00.000Z'));
check('blank restores automatic zone', () => assert.equal(resolve({offset:''}).usedOffset, 1));
check('manual override is labelled', () => assert.equal(resolve({offset:-4,zone:'Invalid/Place'}).offsetOverride, true));
check('spring gap rejected', () => assert.throws(() => resolve({date:'2024-03-10',time:'02:30',zone:'America/New_York'}), /did not occur/));
check('autumn fold rejected', () => assert.throws(() => resolve({date:'2024-11-03',time:'01:30',zone:'America/New_York'}), /occurred twice/));
check('fold explicit earlier instant', () => assert.equal(resolve({date:'2024-11-03',time:'01:30',zone:'America/New_York',offset:-4}).utc.toISOString(), '2024-11-03T05:30:00.000Z'));
check('fold explicit later instant', () => assert.equal(resolve({date:'2024-11-03',time:'01:30',zone:'America/New_York',offset:-5}).utc.toISOString(), '2024-11-03T06:30:00.000Z'));
check('half-hour gap rejected', () => assert.throws(() => resolve({date:'2024-10-06',time:'02:15',zone:'Australia/Lord_Howe'}), /did not occur/));
check('half-hour fold rejected', () => assert.throws(() => resolve({date:'2024-04-07',time:'01:45',zone:'Australia/Lord_Howe'}), /occurred twice/));
check('skipped civil day rejected', () => assert.throws(() => resolve({date:'2011-12-30',time:'12:00',zone:'Pacific/Apia'}), /did not occur/));
check('midnight does not advance date', () => assert.equal(resolve({date:'2000-01-01',time:'00:00',zone:'UTC'}).utc.toISOString(), '2000-01-01T00:00:00.000Z'));
check('leap day valid', () => assert.equal(resolve({date:'2000-02-29'}).utc.getUTCDate(), 29));
for (const [label, change] of [
  ['invalid leap day',{date:'2001-02-29'}], ['calendar rollover',{date:'2000-04-31'}],
  ['unknown time',{time:''}], ['invalid hour',{time:'24:30'}], ['invalid minute',{time:'12:60'}],
  ['invalid zone',{zone:'Not/AZone'}], ['no zone',{zone:''}],
  ['invalid offset',{offset:'bad'}], ['offset out of bounds',{offset:15}], ['year outside support',{date:'1600-01-01'}]
]) check(label, () => assert.throws(() => resolve(change)));
for (const [label, change] of [
  ['no latitude',{lat:null}], ['string latitude',{lat:'51.5'}], ['north pole',{lat:90}],
  ['longitude out of bounds',{lon:181}], ['infinite latitude',{lat:Infinity}], ['unsupported houses',{sys:'other'}]
]) check(label, () => assert.throws(() => ctx.chartFromBirth(Object.assign({}, birth, change))));
check('valid chart has finite placements', () => {
  const c = ctx.chartFromBirth(birth);
  assert.equal(c.points.length, 12); assert.equal(c.cusps.length, 12);
  c.points.forEach(p => { assert.ok(Number.isFinite(p.lon)); assert.ok(p.house >= 1 && p.house <= 12); });
  assert.equal(c.usedOffset, 1); assert.equal(c.offsetOverride, false);
});
check('MC house uses actual house system', () => {
  const c = { asc:10, mc:300, cusps:ctx.housesWhole(10), points:[] };
  assert.match(ctx.chartTable(c), /Aquarius<\/td><td>11<\/td>/);
});
check('saved birth computes automatically', () => {
  ctx.FL.prefs.birth = Object.assign({}, birth);
  const html = ctx.FL_VIEWS.chart.render();
  assert.ok(ctx.chartResult); assert.match(html, /id="chart-result"/);
  assert.match(html, /id="b-lat"/); assert.match(html, /id="b-lon"/); assert.match(html, /id="b-zone"/);
  assert.equal(ctx.chartResult.utc.toISOString(), '2000-06-15T13:30:00.000Z');
});
check('saved incomplete birth never guesses noon', () => {
  ctx.FL.prefs.birth = Object.assign({}, birth, {time:''});
  const html = ctx.FL_VIEWS.chart.render();
  assert.equal(ctx.chartResult, null); assert.match(html, /known birth time/);
});
check('cleared offset remains cleared when choosing a city', () => {
  ctx.FL.prefs.birth = Object.assign({}, birth, {offset:-5});
  fields['b-offset'] = {value:''}; fields['b-date'] = {value:'2002-08-12'}; fields['b-time'] = {value:'04:45'};
  ctx.FL_ACTS.pickCity({getAttribute: () => '0'});
  assert.equal(ctx.FL.prefs.birth.offset, null);
  assert.equal(ctx.FL.prefs.birth.date, '2002-08-12'); assert.equal(ctx.FL.prefs.birth.time,'04:45');
});
check('clear input is retained as a draft', () => {
  fields['b-time'].value = '';
  ctx.FL_ACTS.chartDraft();
  assert.equal(ctx.FL.prefs.birth.time, '');
});
check('forget clears chart and validation state', () => {
  ctx.chartError = 'old error'; ctx.FL_ACTS.chartForget();
  assert.equal(ctx.FL.prefs.birth, undefined); assert.equal(ctx.chartResult, null); assert.equal(ctx.chartError, null);
});
(async function () {
  let attempt = 0;
  ctx.window.Astronomy = null;
  ctx.document.createElement = () => ({remove() {}});
  ctx.document.head = { appendChild(s) {
    attempt++;
    if (attempt === 1) queueMicrotask(() => s.onerror());
    else queueMicrotask(() => { ctx.window.Astronomy = Astronomy; s.onload(); });
  }};
  await assert.rejects(ctx.chartEnsureLoaded());
  assert.equal(ctx.chartLoading, null); count++;
  await ctx.chartEnsureLoaded();
  assert.equal(attempt, 2); assert.equal(ctx.window.Astronomy, Astronomy); count++;
  console.log('Chart checks passed: ' + count + ' (synthetic records, DST gaps/folds, form state, restoration, retry).');
})().catch(e => { console.error(e); process.exitCode = 1; });
