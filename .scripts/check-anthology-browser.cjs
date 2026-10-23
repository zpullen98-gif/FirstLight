/* Exercise the real reading journey, not a replica of its implementation.
   node .scripts/check-anthology-browser.cjs [deployable root or URL] [artifact directory]
   Local roots run on an isolated ephemeral HTTP server, including offline checks. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/zpull/WorldTable/node_modules/playwright');
const axePath = 'C:/Users/zpull/WorldTable/node_modules/axe-core/axe.min.js';
const target = process.argv[2] || path.resolve(__dirname, '..');
const output = path.resolve(process.argv[3] || path.join(__dirname, '..', 'outputs', 'anthology-browser'));
const name = /^https?:/.test(target) ? 'remote' : path.basename(target).toLowerCase() === 'light' ? 'public' : 'source';
fs.mkdirSync(output, { recursive: true });
let server, browser, checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const report = { target, checks: 0, screens: [], accessibility: [], errors: [] };
async function baseURL() {
  if (/^https?:/.test(target)) return target.replace(/\/?$/, '/');
  const root = name === 'public' ? path.dirname(path.resolve(target)) : path.resolve(target);
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
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
async function route(page, hash, locator) {
  await page.evaluate(hash => { location.hash = hash; }, hash);
  await page.waitForFunction(hash => location.hash === hash && flRoute.arg === hash.slice('#/anthology/'.length), hash).catch(async error => {
    if (!hash.startsWith('#/anthology/')) await page.waitForFunction(hash => location.hash === hash, hash);
    else throw error;
  });
  if (locator) await page.locator(locator).first().waitFor();
}
async function seed(context) {
  await context.addInitScript(() => {
    if (!localStorage.getItem('firstlight-v1')) localStorage.setItem('firstlight-v1', JSON.stringify({ v: 1,
      prefs: { onboarded: true, canonLines: 'off', todayMode: 'page', track: 'classics' },
      kept: { 'classics:1-1': 1 }, byheart: { 'classics:1-1': 2 }, journal: { fixture: { d: '2026-10-01', text: 'Keep my words.', ref: 'journal:fixture' } }
    }));
  });
}
async function screen(page, width, section, service) {
  await page.evaluate(service => { document.documentElement.setAttribute('data-service', service); window.dispatchEvent(new CustomEvent('oot:servicechange')); }, service);
  equal(await page.getAttribute('html', 'data-phase'), service, section + ' responds to service palette');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), section + ' fits ' + width + 'px');
  await page.evaluate(() => { const opening = document.querySelector('.dawn-opening'); window.scrollTo(0, opening.getBoundingClientRect().top + scrollY - 20); });
  const file = name + '-' + section + '-' + width + '-' + service + '.png';
  await page.screenshot({ path: path.join(output, file) });
  report.screens.push(file);
  await page.addScriptTag({ path: axePath });
  const audit = await page.evaluate(async () => {
    const result = await axe.run(document.getElementById('view'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })) }));
  });
  report.accessibility.push({ width, section, service, violations: audit });
  equal(audit, [], section + ' accessible at ' + width + 'px in ' + service);
}
(async () => {
  const base = await baseURL(); report.base = base;
  browser = await chromium.launch({ headless: true });
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
    await seed(context);
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(base + '?nosw&fresh=anthology-reading-check#/anthology');
    await page.locator('.dawn-reading').waitFor();
    const saved = await page.evaluate(() => JSON.stringify(FL));
    const today = await page.evaluate(() => dawnReadingToday());
    equal(await page.locator('.dawn-main-nav a').count(), 3, 'Three clear Anthology doors');
    equal(await page.locator('.dawn-reading-parts a').count(), 3, 'Three daily readings');
    equal(await page.locator('.dawn-reading [data-quote-id]').count(), 4, 'First reading displays four quotes');
    const ids = [];
    for (let part = 1; part <= 3; part++) {
      await page.locator('.dawn-reading-parts a').nth(part - 1).click();
      await page.waitForFunction(part => flRoute.arg.endsWith('/' + part), part);
      equal(await page.locator('.dawn-reading [data-quote-id]').count(), 4, 'Reading ' + part + ' displays four');
      ids.push(...await page.locator('.dawn-reading [data-quote-id]').evaluateAll(rows => rows.map(q => q.dataset.quoteId)));
    }
    equal(new Set(ids).size, 12, 'Twelve distinct quote entries across the day');
    equal(await page.evaluate(ids => new Set(ids.map(id => dawnNorm(dawnById(id).text))).size, ids), 12, 'No repeated wording within a day');
    equal(await page.evaluate(() => JSON.stringify(FL)), saved, 'Browsing three readings changes no personal record');
    const sourceLink = page.locator('.dawn-reading .dawn-permalink').first();
    const sourceHref = await sourceLink.getAttribute('href');
    await sourceLink.click();
    await page.locator('.dawn-card details[open]').waitFor();
    equal(await page.locator('.dawn-card').getAttribute('data-quote-id'), sourceHref.split('/').pop(), 'Quote opens exact source record');
    await page.getByRole('link', { name: 'Return to your place', exact: true }).click();
    await page.locator('.dawn-reading').waitFor();
    equal(await page.locator('.dawn-reading [data-quote-id]').evaluateAll(rows => rows.map(q => q.dataset.quoteId)), ids.slice(8), 'Return restores exact third reading');
    for (const service of ['day', 'night']) await screen(page, width, 'daily', service);

    await route(page, '#/anthology/calendar/2028-02', '.dawn-calendar-day');
    equal(await page.locator('.dawn-calendar-day').count(), 29, 'Leap February has 29 days');
    equal(await page.locator('.dawn-months a').count(), 12, 'All twelve months are visible');
    await page.getByRole('link', { name: 'Next month', exact: true }).click();
    await page.getByRole('heading', { name: 'March 2028', exact: true }).waitFor();
    equal(await page.locator('.dawn-calendar-day').count(), 31, 'Next month opens March');
    await page.getByRole('link', { name: 'Previous month', exact: true }).click();
    await page.getByRole('heading', { name: 'February 2028', exact: true }).waitFor();
    await page.locator('#dawn-year').fill('2027');
    await page.getByRole('button', { name: 'Open year', exact: true }).click();
    await page.getByRole('heading', { name: 'February 2027', exact: true }).waitFor();
    equal(await page.locator('.dawn-calendar-day').count(), 28, 'Year picker preserves month and recalculates February');
    for (const service of ['day', 'night']) await screen(page, width, 'calendar', service);
    await page.locator('#dawn-date').fill('2028-02-29');
    await page.getByRole('button', { name: 'Read date', exact: true }).click();
    await page.getByRole('heading', { name: '29 February 2028', exact: true }).waitFor();
    await page.locator('[data-act="dawnMarkReading"]').click();
    equal(await page.locator('[data-act="dawnMarkReading"]').getAttribute('aria-pressed'), 'true', 'Explicit read mark saves');
    await route(page, '#/anthology/calendar/2028-02', '.dawn-calendar-day');
    const leapLink = page.locator('.dawn-calendar-day[href="#/anthology/read/2028-02-29/1"]');
    ok((await leapLink.getAttribute('aria-label')).includes('1 of 3'), 'Calendar exposes partial reading progress');
    await leapLink.click(); await page.locator('.dawn-reading').waitFor();
    await page.locator('[data-act="dawnMarkReading"]').click();
    equal(await page.locator('[data-act="dawnMarkReading"]').getAttribute('aria-pressed'), 'false', 'Read mark can be undone');
    const afterTick = await page.evaluate(() => { const record = JSON.parse(JSON.stringify(FL)); delete record.anthologyRead; return record; });
    const beforeTick = JSON.parse(saved); delete beforeTick.anthologyRead;
    equal(afterTick, beforeTick, 'Read marks do not change vault, journal, settings or other records');

    await route(page, '#/anthology/library', '#dawn-search');
    equal(await page.locator('.dawn-grid [data-quote-id]').count(), 12, 'Library starts with twelve cards');
    await page.locator('#dawn-collection').selectOption('year-makers');
    ok((await page.locator('#dawn-result-count').textContent()).includes('366'), 'All original Makers entries remain available');
    await page.locator('#dawn-collection').selectOption('all');
    await page.locator('#dawn-search').fill('Chaucer');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    ok(await page.locator('.dawn-grid [data-quote-id]').count() > 0, 'Unified library searches writers and original citations');
    const first = page.locator('.dawn-grid .dawn-permalink').first();
    const href = await first.getAttribute('href');
    await first.click(); await page.locator('.dawn-card details[open]').waitFor();
    await page.goBack(); await page.locator('#dawn-search').waitFor();
    equal(await page.locator('#dawn-search').inputValue(), 'Chaucer', 'Browser Back restores query');
    await page.waitForFunction(href => document.activeElement.getAttribute('href') === href, href);
    ok(true, 'Browser Back restores the quotation link focus');
    for (const service of ['day', 'night']) await screen(page, width, 'library', service);
    await page.locator('#dawn-search').fill('<script>nothing-matches-this');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByText('No quotations match.', { exact: false }).waitFor();
    equal(await page.locator('#view script').count(), 0, 'Hostile search text is escaped');
    await page.getByRole('button', { name: 'Clear search & filters', exact: true }).click();
    equal(await page.locator('#dawn-search').inputValue(), '', 'Clear search recovers full shelf');
    equal(await page.evaluate(() => document.activeElement.id), 'dawn-search', 'Clear search restores input focus');
    await page.getByRole('button', { name: 'Show more quotations', exact: true }).click();
    equal(await page.locator('.dawn-grid [data-quote-id]').count(), 24, 'Progressive library reveals next twelve');
    for (const old of ['#/anthology/cast', '#/anthology/person-sacagawea', '#/anthology/writers', '#/anthology/writer-geoffrey-chaucer', '#/poets/chaucer/canterbury']) {
      await page.evaluate(hash => { location.hash = hash; }, old);
      await page.waitForFunction(hash => location.hash === hash && document.getElementById('view').textContent.length > 100, old);
      ok(!(await page.locator('#view').textContent()).includes('This page did not open'), old + ' remains accessible');
    }
    await page.evaluate(() => { location.hash = '#/poets/chaucer'; });
    await page.locator('#poet-query').waitFor();
    const poemLink = page.locator('.dawn-card .dawn-permalink').first();
    const poemHref = await poemLink.getAttribute('href');
    await poemLink.click(); await page.locator('.dawn-card details[open]').waitFor();
    equal(await page.getByRole('link', { name: 'Return to your place', exact: true }).getAttribute('href'), '#/poets/chaucer', 'Poets quote remembers the study route');
    await page.getByRole('link', { name: 'Return to your place', exact: true }).click();
    await page.locator('#poet-query').waitFor();
    await page.waitForFunction(href => document.activeElement.getAttribute('href') === href, poemHref);
    ok(true, 'Return to the Poets Study restores quotation link focus');
    await page.locator('.dawn-card .dawn-permalink').first().click();
    await page.locator('.dawn-card details[open]').waitFor();
    await page.goBack(); await page.locator('#poet-query').waitFor();
    await page.waitForFunction(href => document.activeElement.getAttribute('href') === href, poemHref);
    ok(true, 'Browser Back from a quote restores the Poets Study focus');
    await route(page, '#/anthology/read/2027-02-29/1', '.dawn-main-nav');
    await page.getByText('That reading date is not available.', { exact: false }).waitFor();
    await page.evaluate(() => { location.hash = '#/today'; });
    await page.locator('[data-lift-id]').first().waitFor();
    equal(await page.locator('.qt').count(), 1, 'Today retains the dated voice');
    equal(await page.locator('[data-lift-id]').count(), 2, 'Today retains its two lifts');
    report['width' + width] = { dailyQuotes: ids.length, grouping: [4, 4, 4], today, navigation: 'passed', calendar: 'passed', records: 'preserved' };
    await context.close();
  }

  const context = await browser.newContext(); await seed(context);
  const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(base + '?fresh=anthology-offline-check#/anthology');
  await page.locator('.dawn-reading').waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.waitForFunction(async () => {
    const names = (await caches.keys()).filter(key => /^(firstlight|oot-light)-v\d+$/.test(key));
    for (const key of names) {
      const rows = await (await caches.open(key)).keys();
      if (['js/anthology-calendar.js', 'js/ui-anthology.js', 'js/ui-canterbury.js'].every(file => rows.some(r => r.url.endsWith('/' + file)))) return true;
    }
    return false;
  });
  await context.setOffline(true);
  await page.goto(base + '#/anthology/calendar/2028-02'); await page.locator('.dawn-calendar-day').first().waitFor();
  equal(await page.locator('.dawn-calendar-day').count(), 29, 'Year calendar opens offline');
  await page.locator('.dawn-calendar-day[href="#/anthology/read/2028-02-29/1"]').click();
  await page.locator('.dawn-reading').waitFor();
  equal(await page.locator('.dawn-reading [data-quote-id]').count(), 4, 'Reading cards open offline');
  await route(page, '#/anthology/library', '#dawn-search');
  equal(await page.locator('.dawn-grid [data-quote-id]').count(), 12, 'Full library is available offline');
  report.offline = 'passed';
  equal(report.errors, [], 'No browser script errors');
  report.checks = checks;
  console.log(name + ': ' + checks + ' browser checks passed.');
})().catch(error => { report.failure = error.stack; console.error(error); process.exitCode = 1; }).finally(async () => {
  report.checks = checks;
  fs.writeFileSync(path.join(output, name + '-browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
