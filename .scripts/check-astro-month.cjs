/* Local monthly ephemeris gate. All birth data below are synthetic fixtures.
   Run: node .scripts/check-astro-month.cjs [deployable First Light root] */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const ctx = vm.createContext({ console, Date, Intl, Math, Map, Set, Number, window: {} });
for (const file of ['js/vendor/astronomy.js', 'js/astro-chart.js', 'js/astro-month.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
let checks = 0;
function ok(value, label) { assert.ok(value, label); checks++; }
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks++; }
function throws(fn, label) { assert.throws(fn, label); checks++; }
const A = ctx.window.Astronomy;
const natal = ctx.computeChart({ utc: new Date('2000-01-01T12:00:00Z'), lat: 51.5, lon: 0, houseSystem: 'whole' });
const original = JSON.stringify(natal);
const month = ctx.astroMonthBuild(2026, 10, natal, { zone: 'UTC' });
equal(month.start.toISOString(), '2026-10-01T00:00:00.000Z', 'UTC start boundary');
equal(month.end.toISOString(), '2026-11-01T00:00:00.000Z', 'UTC exclusive end boundary');
equal(JSON.stringify(natal), original, 'Calculating a month never mutates a natal chart');
ok(month.events.length > 10, 'Real fixture has computed personal aspects');
equal(month.highlights.length, 8, 'At most eight editorial highlights, all results retained');
ok(month.highlights.every(e => month.events.includes(e)), 'Highlights refer to full events rather than rewritten claims');
equal(month.positions.length, 9, 'Nine transiting bodies; fast lunar transits excluded');
ok(month.events.some(e => e.natal === 'Moon'), 'Natal Moon remains part of personal aspects');
ok(month.events.some(e => e.natal === 'Ascendant' || e.natal === 'Midheaven'), 'Natal angles participate');
ok(month.events.every(e => e.transit !== 'Moon'), 'Moon quarter markers replace overwhelming daily Moon aspect lists');

function checkMonth(result) {
  for (const list of [result.events, result.phases, result.ingresses, result.stations]) {
    ok(list.every((event, i) => +event.utc >= +result.start && +event.utc < +result.end && (!i || +list[i - 1].utc <= +event.utc)), 'All event lists are chronological and within their half-open month');
  }
  const unique = new Set();
  for (const event of result.events) {
    const lon = ctx.geoLon(event.transit, event.utc);
    const residual = Math.abs(Math.abs(ctx.astroMonthDelta(lon, event.natalLon)) - event.angle);
    ok(residual < 0.00001, `${event.transit} ${event.aspect} ${event.natal} is a refined hit, not a daily nearest sample`);
    equal(ctx.houseOf(lon, natal.cusps), event.house, 'Personal event house uses supplied natal cusps');
    const key = `${event.transit}|${event.natal}|${event.aspect}|${Math.round(+event.utc / 1000)}`;
    ok(!unique.has(key), 'Station subdivision does not duplicate the same aspect'); unique.add(key);
  }
  for (const phase of result.phases) {
    ok(Math.abs(ctx.astroMonthDelta(A.MoonPhase(phase.utc), phase.angle)) < 0.001, 'Phase event matches independent phase function');
    equal(ctx.signOf(ctx.geoLon('Moon', phase.utc)).name, phase.sign.name, 'Moon phase sign is computed at event time');
  }
  for (const event of result.ingresses) {
    const before = ctx.signOf(ctx.geoLon(event.body, new Date(+event.utc - 120000)));
    const after = ctx.signOf(ctx.geoLon(event.body, new Date(+event.utc + 120000)));
    equal(event.from, before.name, 'Ingress begins in its reported sign');
    equal(event.to, after.name, 'Ingress enters its reported sign');
    ok(before.i !== after.i, 'An ingress is an actual crossing');
    ok(Math.abs(ctx.astroMonthDelta(ctx.geoLon(event.body, event.utc), Math.round(event.lon / 30) * 30)) < 0.00001, 'Ingress longitude is refined');
  }
  for (const event of result.stations) {
    const speed = time => ctx.astroMonthDelta(ctx.geoLon(event.body, new Date(time + 3600000)), ctx.geoLon(event.body, new Date(time - 3600000)));
    const before = speed(+event.utc - 86400000), after = speed(+event.utc + 86400000);
    ok(before * after < 0, 'A reported station changes direction on surrounding days');
    equal(event.direction, after < 0 ? 'retrograde' : 'direct', 'Station direction is the direction after the turn');
  }
}
checkMonth(month);
equal(month.phases.length, 4, 'October fixture has four quarter phases');
ok(month.stations.some(e => e.body === 'Mercury' && e.direction === 'retrograde'), 'Real retrograde station is found');
ok(month.ingresses.some(e => e.body === 'Venus' && e.retro), 'Retrograde sign re-entry is retained');

const repeatNatal = JSON.parse(original);
repeatNatal.points.find(p => p.name === 'Sun').lon = 230;
const repeated = ctx.astroMonthBuild(2026, 10, repeatNatal, { zone: 'UTC' }).events.filter(e => e.transit === 'Mercury' && e.natal === 'Sun' && e.angle === 0);
equal(repeated.length, 2, 'A real retrograde loop retains both Mercury crossings of a synthetic natal degree');
ok(!repeated[0].retro && repeated[1].retro, 'Repeated passes retain direct then retrograde direction');

const leap = ctx.astroMonthBuild(2028, 2, natal, { zone: 'UTC' });
equal((+leap.end - +leap.start) / 86400000, 29, 'Leap February has all 29 real days');
checkMonth(leap);
const blue = ctx.astroMonthBuild(2026, 5, natal, { zone: 'UTC' });
equal(blue.phases.filter(e => e.angle === 180).length, 2, 'A month with two full moons retains both');
ok(blue.phases.length > 4, 'Calendar months are not incorrectly capped at four phases');
checkMonth(blue);
const general = ctx.astroMonthBuild(2026, 10, null, { zone: 'UTC' });
equal(general.events.length, 0, 'Without a natal chart, no personal events are invented');
ok(general.phases.length && general.phases.every(e => e.house === null), 'General sky works without invented houses');

const marchNY = ctx.astroMonthBounds(2026, 3, 'America/New_York');
equal(marchNY.start.toISOString(), '2026-03-01T05:00:00.000Z', 'Local-zone month begins before daylight-saving change');
equal(marchNY.end.toISOString(), '2026-04-01T04:00:00.000Z', 'Local-zone month ends after daylight-saving change');
equal((+marchNY.end - +marchNY.start) / 3600000, 743, 'DST month is not assumed to be a whole number of 24-hour days');
equal(ctx.astroMonthBounds(2028, 2, 'Pacific/Auckland').start.toISOString(), '2028-01-31T11:00:00.000Z', 'Eastern zones keep their local calendar month');
equal(ctx.astroMonthBounds(2200, 12, 'UTC').end.toISOString(), '2201-01-01T00:00:00.000Z', 'Final supported month has its proper exclusive boundary');
equal(ctx.astroMonthBounds(2015, 11, 'America/Havana').start.toISOString(), '2015-11-01T04:00:00.000Z', 'Repeated month-start midnight chooses the first occurrence');
equal(ctx.astroMonthBounds(2023, 10, 'America/Asuncion').start.toISOString(), '2023-10-01T04:00:00.000Z', 'Skipped month-start midnight begins at the first real instant (01:00 local)');
equal(ctx.astroMonthBounds(2012, 4, 'America/Havana').start.toISOString(), '2012-04-01T05:00:00.000Z', 'A historical first-day spring transition does not prevent opening the month');
equal(ctx.astroMonthBounds(2011, 12, 'Pacific/Apia').end.toISOString(), '2011-12-31T10:00:00.000Z', 'Date-line change preserves the next civil-month boundary');
throws(() => ctx.localToUTC('America/Havana', 2015, 11, 1, 0, 0), 'Birth-time fold remains rejected even though calendar boundaries support it');
throws(() => ctx.localToUTC('America/Asuncion', 2023, 10, 1, 0, 0), 'Birth-time gap remains rejected even though calendar boundaries support it');
for (const args of [[1699, 1], [2201, 1], [2026, 0], [2026, 13], [2026.5, 2], [2026, 2.5], ['2026', 2], [NaN, 2]]) {
  throws(() => ctx.astroMonthBounds(...args, 'UTC'), 'Malformed month is rejected, not normalised');
}
throws(() => ctx.astroMonthBounds(2026, 1, 'Not/AZone'), 'Invalid calendar zone is rejected');
throws(() => ctx.astroMonthBuild(2026, 1, { points: [] }, { zone: 'UTC' }), 'Incomplete natal input is rejected');
const invalid = JSON.parse(original); invalid.points[0].lon = NaN;
throws(() => ctx.astroMonthBuild(2026, 1, invalid, { zone: 'UTC' }), 'Non-finite natal longitude is rejected');

/* Independent US Naval Observatory UTC phase table, read 23 October 2026:
   https://aa.usno.navy.mil/calculated/moon/phases?date=2026-10-01&nump=8&format=p
   Rounded USNO minutes and this lightweight ephemeris need not agree to seconds;
   two minutes is an explicit accuracy tolerance, not an assertion of exact time. */
const referencePhases = [
  ['Last Quarter', '2026-10-03T13:25:00Z'], ['New Moon', '2026-10-10T15:50:00Z'],
  ['First Quarter', '2026-10-18T16:12:00Z'], ['Full Moon', '2026-10-26T04:12:00Z'],
  ['Last Quarter', '2026-11-01T20:28:00Z'], ['New Moon', '2026-11-09T07:02:00Z'],
  ['First Quarter', '2026-11-17T11:48:00Z'], ['Full Moon', '2026-11-24T14:53:00Z']
];
const autumnPhases = month.phases.concat(ctx.astroMonthBuild(2026, 11, natal, { zone: 'UTC' }).phases);
equal(autumnPhases.length, referencePhases.length, 'Independent reference and calculation cover the same eight autumn quarter phases');
referencePhases.forEach(([name, iso], index) => {
  equal(autumnPhases[index].name, name, 'Independent phase sequence agrees');
  ok(Math.abs(+autumnPhases[index].utc - +new Date(iso)) < 120000, 'Phase estimate is within two minutes of the USNO reference');
});

/* Analytic orbits exercise wrap, boundary and near-station double crossings
   independently from the astronomical fixtures. */
const realGeo = ctx.geoLon;
const start = +new Date('2030-01-01T00:00:00Z'), end = start + 31 * 86400000;
ctx.geoLon = (body, date) => ctx.norm360(359 + (+date - start) / 86400000);
let track = ctx.astroMonthTrack('Sun', start, end);
let crossings = ctx.astroMonthCrossings(track, 0);
equal(crossings.length, 1, 'Zero-degree Aries wrap yields one crossing, not a false opposition');
ok(Math.abs(crossings[0] - (start + 86400000)) < 1000, 'Wrap crossing has the analytically correct time');
equal(ctx.astroMonthCrossings(track, 359).length, 1, 'An exact month-start crossing is included');
equal(ctx.astroMonthCrossings(track, 30).length, 0, 'An exact next-month-start crossing is excluded');

const turn = start + 15.123 * 86400000;
ctx.geoLon = (body, date) => 40 - Math.pow((+date - turn) / 86400000, 2) / 20;
track = ctx.astroMonthTrack('Mercury', start, end);
crossings = ctx.astroMonthCrossings(track, 40 - 0.00001);
equal(crossings.length, 2, 'Station refinement catches two hits less than six hours apart');
ok(crossings[0] < turn && crossings[1] > turn, 'Close repeated hits straddle the true station');
for (const time of crossings) ok(Math.abs(ctx.geoLon('Mercury', new Date(time)) - 39.99999) < 0.000001, 'Close station hit has a true longitude residual');
ctx.geoLon = realGeo;

ctx.astroMonthMemo.length = 0;
const first = ctx.astroMonthBuild(2026, 10, natal, { zone: 'UTC' });
const second = ctx.astroMonthBuild(2026, 10, natal, { zone: 'UTC' });
equal(first, second, 'Repeated rendering reuses in-memory calculation');
const equalHouses = ctx.computeChart({ utc: new Date('2000-01-01T12:00:00Z'), lat: 51.5, lon: 0, houseSystem: 'equal' });
const changed = ctx.astroMonthBuild(2026, 10, equalHouses, { zone: 'UTC' });
ok(changed !== first, 'Changing natal house system invalidates month cache');
equal(JSON.stringify(changed.events.map(e => [+e.utc, e.transit, e.natal, e.aspect])), JSON.stringify(first.events.map(e => [+e.utc, e.transit, e.natal, e.aspect])), 'House convention does not alter astronomical aspect times');
ctx.astroMonthMemo.length = 0;
equal(JSON.stringify(ctx.astroMonthBuild(2026, 10, natal, { zone: 'UTC' })), JSON.stringify(first), 'Fresh calculation is deterministic');
console.log(`Monthly astrology: ${checks} checks passed; synthetic fixtures only.`);
