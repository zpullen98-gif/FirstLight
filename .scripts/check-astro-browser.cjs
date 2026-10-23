/* Run the actual astrology journey with invented, non-owner birth details.
   node .scripts/check-astro-browser.cjs [deployable root or URL] [artifact directory] */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/zpull/WorldTable/node_modules/playwright');
const axePath = 'C:/Users/zpull/WorldTable/node_modules/axe-core/axe.min.js';
const target = process.argv[2] || path.resolve(__dirname, '..');
const output = path.resolve(process.argv[3] || path.join(__dirname, '..', 'outputs', 'astro-browser'));
const name = /^https?:/.test(target) ? 'remote' : path.basename(target).toLowerCase() === 'light' ? 'public' : 'source';
const fixture = { date: '1990-06-15', time: '12:00', place: 'London, test fixture', lat: 51.5074, lon: -0.1278, zone: 'Europe/London', sys: 'whole', offset: null };
fs.mkdirSync(output, { recursive: true });
let browser, server, checks = 0;
const report = { target, checks: 0, screens: [], accessibility: [], errors: [] };
function ok(v, label) { assert.ok(v, label); checks++; }
function eq(a, b, label) { assert.deepEqual(a, b, label); checks++; }
async function baseURL() {
  if (/^https?:/.test(target)) return target.replace(/\/?$/, '/');
  const root = name === 'public' ? path.dirname(path.resolve(target)) : path.resolve(target);
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
  server = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://local.test').pathname); } catch { res.writeHead(400).end(); return; }
    const file = path.resolve(root, '.' + rel, rel.endsWith('/') ? 'index.html' : '');
    if (!(file === root || file.startsWith(root + path.sep)) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return 'http://127.0.0.1:' + server.address().port + (name === 'public' ? '/light/' : '/');
}
async function seed(context, birth = fixture) {
  await context.addInitScript(birth => {
    if (!localStorage.getItem('firstlight-v1')) localStorage.setItem('firstlight-v1', JSON.stringify({ v: 1,
      prefs: { onboarded: true, canonLines: 'off', todayMode: 'page', track: 'classics', dayEnd: 4, birth },
      kept: { 'classics:1-1': 1 }, byheart: { 'classics:1-1': 2 }, journal: { fixture: { d: '2026-10-01', text: 'Keep my words.', ref: 'journal:fixture' } }
    }));
  }, birth);
}
async function route(page, hash, selector) {
  await page.evaluate(hash => { location.hash = hash; }, hash);
  await page.waitForFunction(hash => location.hash === hash && flRoute.view === hash.split('/')[1] && (flRoute.arg || '') === hash.split('/').slice(2).join('/'), hash);
  if (selector) await page.locator(selector).first().waitFor();
}
async function monthReady(page, expected) {
  await page.locator('.astro-month').waitFor();
  await page.locator('.astro-phases').waitFor();
  if (expected) await page.waitForFunction(expected => document.getElementById('am-month')?.value === expected, expected);
}
async function screen(page, width, section, service) {
  await page.evaluate(service => { document.documentElement.setAttribute('data-service', service); window.dispatchEvent(new CustomEvent('oot:servicechange')); }, service);
  eq(await page.getAttribute('html', 'data-phase'), service, section + ' palette updates');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), section + ' fits ' + width + 'px');
  await page.evaluate(() => {
    const opening = document.querySelector('.astro-opening') || document.querySelector('#view h1');
    window.scrollTo(0, opening ? Math.max(0, opening.getBoundingClientRect().top + scrollY - 18) : 0);
  });
  const file = name + '-' + section + '-' + width + '-' + service + '.png';
  await page.screenshot({ path: path.join(output, file) }); report.screens.push(file);
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const audit = await axe.run(document.getElementById('view'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return audit.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })) }));
  });
  report.accessibility.push({ width, section, service, violations });
  eq(violations, [], section + ' accessible in ' + service + ' at ' + width + 'px');
}
(async () => {
  const base = await baseURL(); report.base = base;
  browser = await chromium.launch({ headless: true });
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: 'reduce', timezoneId: 'America/New_York' });
    await seed(context);
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    const requests = []; page.on('request', req => requests.push(req.url()));
    await page.goto(base + '?nosw&fresh=astro-check#/astro');
    await monthReady(page);
    const initialMonth = await page.locator('#am-month').inputValue();
    const untouched = await page.evaluate(() => JSON.stringify({ kept: FL.kept, byheart: FL.byheart, journal: FL.journal }));
    eq(await page.locator('.astro-main-nav a').count(), 3, 'Three clear astrology destinations');
    eq(await page.locator('.astro-big-three > *').count(), 3, 'Saved chart presents three main placements');
    for (const service of ['day', 'night']) await screen(page, width, 'monthly', service);
    await page.locator('#am-month').fill('2028-02');
    await page.locator('[data-act="astroChooseMonth"]').click();
    await monthReady(page, '2028-02');
    eq(await page.evaluate(() => location.hash), '#/astro/month/2028-02', 'Chosen month is a bookmarkable route');
    await page.getByRole('link', { name: 'Next month', exact: true }).click(); await monthReady(page, '2028-03');
    await page.getByRole('link', { name: 'Previous month', exact: true }).click(); await monthReady(page, '2028-02');
    ok(true, 'Previous and next month links preserve a clear calendar sequence');
    await page.evaluate(() => astroRefreshMonth());
    eq(await page.locator('#am-month').inputValue(), '2028-02', 'Automatic refresh preserves a deliberately chosen month');
    const phases = await page.locator('.astro-phases').innerText();
    ok(/Moon|Quarter/i.test(phases), 'Lunar phases are present for chosen month');
    await page.reload(); await monthReady(page, '2028-02');
    eq(await page.locator('.astro-big-three > *').count(), 3, 'Personal monthly guide restores after reload');
    await route(page, '#/astro/learn', '.astro-main-nav');
    await page.getByRole('heading', { name: 'The language of the sky', exact: true }).waitFor();
    await page.locator('summary').filter({ hasText: '6. Houses and angles' }).click();
    ok((await page.locator('#view').innerText()).includes('Whole Sign'), 'Learning reference explains house conventions');
    await page.locator('#view details').evaluateAll(rows => rows.forEach(row => { row.open = true; }));
    for (const service of ['day', 'night']) await screen(page, width, 'learning', service);
    await route(page, '#/chart', '#chart-result');
    eq(await page.locator('#b-date').inputValue(), fixture.date, 'Saved date restores in chart');
    ok((await page.locator('#chart-result').innerText()).includes('UTC+1'), 'Historical daylight-saving offset is visible');
    for (const service of ['day', 'night']) await screen(page, width, 'chart', service);
    await page.locator('#b-time').fill('');
    await page.getByRole('button', { name: 'Draw the chart', exact: true }).click();
    await page.locator('#chart-error').waitFor();
    eq(await page.locator('#chart-result').count(), 0, 'Missing time does not display a guessed chart');
    await page.locator('#b-time').fill(fixture.time);
    await page.getByRole('button', { name: 'Draw the chart', exact: true }).click();
    await page.locator('#chart-result').waitFor();
    await page.reload(); await page.locator('#chart-result').waitFor();
    ok(true, 'Saved birth chart recomputes after reload');
    eq(await page.evaluate(() => JSON.stringify({ kept: FL.kept, byheart: FL.byheart, journal: FL.journal })), untouched, 'Astrology journeys preserve learning and journal records');
    ok(!requests.some(url => url.includes(fixture.date) || url.includes(encodeURIComponent(fixture.place))), 'Birth details are not put in requests');
    await page.getByRole('button', { name: 'Forget my details', exact: true }).click();
    eq(await page.evaluate(() => FL.prefs.birth === undefined), true, 'Forget removes saved birth details');
    await route(page, '#/astro', '.astro-month'); await monthReady(page);
    eq(await page.locator('.astro-big-three').count(), 0, 'No personal placements after forgetting');
    eq(await page.locator('#am-month').inputValue(), initialMonth, 'Return to current month uses actual month');
    report['width' + width] = { navigation: 'passed', form: 'passed', storage: 'preserved' };
    await context.close();
  }

  const rollover = await browser.newContext({ timezoneId: 'America/New_York' }); await seed(rollover);
  const rolling = await rollover.newPage();
  await rolling.clock.install({ time: new Date('2026-11-01T07:59:00Z') });
  await rolling.goto(base + '?nosw&fresh=astro-rollover#/astro'); await monthReady(rolling, '2026-10');
  await rolling.clock.setSystemTime(new Date('2026-11-01T09:01:00Z'));
  await rolling.evaluate(() => astroRefreshMonth()); await monthReady(rolling, '2026-11');
  ok(true, 'Current month follows the saved day-boundary after month rollover');
  await rollover.close();

  const delayed = await browser.newContext(); await seed(delayed);
  let releaseEngine;
  const engineGate = new Promise(resolve => { releaseEngine = resolve; });
  await delayed.route('**/js/vendor/astronomy.js*', async route => { await engineGate; await route.continue(); });
  const delayedPage = await delayed.newPage(); delayedPage.on('pageerror', e => report.errors.push(e.message));
  await delayedPage.goto(base + '?nosw&fresh=astro-delayed-check#/astro', { waitUntil: 'domcontentloaded' });
  await delayedPage.locator('#astro-month-content[aria-busy="true"]').waitFor();
  await route(delayedPage, '#/astro/learn', '.astro-main-nav');
  releaseEngine();
  await delayedPage.waitForFunction(() => window.Astronomy && typeof FL_CITIES !== 'undefined');
  await delayedPage.getByRole('heading', { name: 'The language of the sky', exact: true }).waitFor();
  eq(await delayedPage.locator('#astro-month-content').count(), 0, 'Late ephemeris loading does not replace the page navigated to');
  await delayed.close();

  const recovery = await browser.newContext(); await seed(recovery, null);
  let failEngine = true;
  await recovery.route('**/js/vendor/astronomy.js*', route => failEngine ? route.abort('failed') : route.continue());
  const recoveryPage = await recovery.newPage(); recoveryPage.on('pageerror', e => report.errors.push(e.message));
  await recoveryPage.goto(base + '?nosw&fresh=astro-recovery-check#/astro');
  await recoveryPage.getByRole('heading', { name: 'The sky could not be prepared', exact: true }).waitFor();
  failEngine = false;
  await recoveryPage.locator('[data-act="astroRetry"]').click(); await monthReady(recoveryPage);
  eq(await recoveryPage.locator('.astro-big-three').count(), 0, 'Recovery without birth details does not invent personal placements');
  ok(true, 'A failed first library download can be retried without reloading');
  await recovery.close();

  const context = await browser.newContext(); await seed(context);
  const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(base + '?fresh=astro-offline-check#/astro'); await monthReady(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.waitForFunction(async () => {
    const files = ['js/vendor/astronomy.js', 'js/data-cities.js'];
    for (const file of files) if (!await caches.match(new URL(file + '?v=' + FL_TEXT_V, location.href).href, { ignoreSearch: true })) return false;
    return true;
  });
  ok(true, 'First astrology visit caches both lazy chart dependencies');
  await context.setOffline(true);
  await page.goto(base + '#/astro/month/2028-02'); await monthReady(page, '2028-02');
  eq(await page.locator('.astro-big-three > *').count(), 3, 'Personal monthly readings work offline');
  await route(page, '#/chart', '#chart-result'); ok(true, 'Saved chart works offline');
  await route(page, '#/astro/learn', '.astro-main-nav'); ok(true, 'Learning reference works offline');
  report.offline = 'passed';
  eq(report.errors, [], 'No browser script errors');
  console.log(name + ': ' + checks + ' astrology browser checks passed.');
})().catch(error => { report.failure = error.stack; console.error(error); process.exitCode = 1; }).finally(async () => {
  report.checks = checks;
  fs.writeFileSync(path.join(output, name + '-astro-browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
