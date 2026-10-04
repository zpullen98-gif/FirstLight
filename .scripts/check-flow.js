/* Personal set counters, backup merge and common service integration.
   Run: node .scripts/check-flow.js [deployable First Light root] */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
function equal(actual, expected, message) { assert.equal(actual, expected, message); checks++; }
function make() {
  const saved = new Map(), events = {}, attrs = {}, nodes = {};
  const ctx = vm.createContext({ console, Date, Math, JSON, Number, String, Object, Array,
    setTimeout: () => 1, clearTimeout() {},
    localStorage: { getItem: k => saved.get(k) || null, setItem: (k, v) => saved.set(k, v) },
    window: { addEventListener: (n, fn) => { events[n] = fn; }, dispatchEvent() {} },
    document: { addEventListener() {}, visibilityState: 'visible', activeElement: null,
      documentElement: { getAttribute: n => attrs[n] || null, setAttribute: (n, v) => { attrs[n] = v; } },
      getElementById: id => nodes[id] || null, querySelector: () => null },
    getComputedStyle: () => ({ getPropertyValue: () => '#081510' }),
    CustomEvent: function (n, detail) { this.type = n; this.detail = detail; },
    FL_ACTS: {}, FL_VIEWS: {}, announce() {}, render() { throw Error('A counter must not repaint the video.'); },
    esc: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  });
  function load(file) { vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file }); }
  load('js/store.js'); load('js/data-body.js'); load('js/ui-today.js');
  let today = '2026-10-04'; ctx.flToday = () => today;
  return { ctx, saved, events, attrs, nodes, load, setDay: day => { today = day; } };
}
function counter(t, id = 'Z5DX8MYcl00') {
  const attrs = { 'data-set-video': id, 'data-set-day': t.ctx.flToday() };
  const parts = {};
  const host = {
    getAttribute: n => attrs[n], setAttribute: (n, v) => { attrs[n] = v; },
    querySelector: q => parts[q], contains: n => Object.values(parts).includes(n)
  };
  ['[data-set-count]', '[data-set-unit]', '[data-set-status]', '[data-op="add"]', '[data-op="undo"]', '[data-op="reset"]'].forEach(q => {
    parts[q] = { textContent: '', disabled: false, focus() { t.ctx.document.activeElement = this; } };
  });
  return { host, parts, click(op) {
    const button = parts['[data-op="' + op + '"]'];
    button.closest = () => host; button.getAttribute = n => n === 'data-op' ? op : null;
    t.ctx.document.activeElement = button; t.ctx.FL_ACTS.workoutSet(button);
  } };
}
const t = make(), c = counter(t);
const untouched = JSON.stringify({ sessions: t.ctx.FL.sessions, moves: t.ctx.FL.moves, journal: t.ctx.FL.journal, practice: t.ctx.FL.practice });
c.click('add'); c.click('add');
equal(t.ctx.todaySetRecord('2026-10-04', 'Z5DX8MYcl00').count, 2, 'Add a set counts only the selected workout');
equal(c.parts['[data-set-count]'].textContent, 2, 'The visible count updates without a whole-page render');
equal(JSON.parse(t.saved.get('firstlight-v1')).workoutSets['2026-10-04'].Z5DX8MYcl00.count, 2, 'Each tap is saved immediately');
c.click('undo');
equal(t.ctx.todaySetRecord('2026-10-04', 'Z5DX8MYcl00').count, 1, 'Undo reverses the last tap');
ok(c.parts['[data-op="undo"]'].disabled, 'Undo is one deliberate reversal');
c.click('reset');
equal(t.ctx.todaySetRecord('2026-10-04', 'Z5DX8MYcl00').count, 0, 'Reset retains a zero record');
equal(c.parts['[data-op="undo"]'].textContent, 'Undo reset', 'Reset offers an explicit recovery');
c.click('undo');
equal(t.ctx.todaySetRecord('2026-10-04', 'Z5DX8MYcl00').count, 1, 'Undo reset restores the prior count');
const second = counter(t, 'eAi7EAE6-cU'); second.click('add'); second.click('add');
equal(t.ctx.todaySetRecord('2026-10-04', 'Z5DX8MYcl00').count, 1, 'Video counts are independent');
const backup = t.ctx.flExport();
const fresh = make(); fresh.ctx.flImport(backup);
equal(fresh.ctx.todaySetRecord('2026-10-04', 'eAi7EAE6-cU').count, 2, 'A backup restores all video counters');
fresh.ctx.flImport(backup);
equal(fresh.ctx.todaySetRecord('2026-10-04', 'eAi7EAE6-cU').count, 2, 'Repeated import never doubles a count');
c.click('reset'); t.ctx.flImport(backup);
equal(t.ctx.todaySetRecord('2026-10-04', 'Z5DX8MYcl00').count, 0, 'An older backup cannot resurrect a reset');
const resetBackup = t.ctx.flExport(); fresh.ctx.flImport(resetBackup);
equal(fresh.ctx.todaySetRecord('2026-10-04', 'Z5DX8MYcl00').count, 0, 'A newer reset survives transfer to another device');
t.setDay('2026-10-05'); c.click('add');
equal(t.ctx.todaySetRecord('2026-10-05', 'Z5DX8MYcl00').count, 1, 'A video left open overnight starts the new day');
equal(t.ctx.todaySetRecord('2026-10-04', 'Z5DX8MYcl00').count, 0, 'A new day preserves the old day');
ok(c.parts['[data-set-status]'].textContent.startsWith('A new day.'), 'The rollover is explained');
equal(JSON.stringify({ sessions: t.ctx.FL.sessions, moves: t.ctx.FL.moves, journal: t.ctx.FL.journal, practice: t.ctx.FL.practice }), untouched, 'The counter never changes completion logs or personal writing');
t.ctx.flSave = () => false; c.click('add');
ok(c.parts['[data-set-status]'].textContent.includes('could not save'), 'Storage failure is visible in the counter');
t.ctx.FL.workoutSets['2026-10-05'].Z5DX8MYcl00.count = 999; c.click('add');
equal(t.ctx.todaySetRecord('2026-10-05', 'Z5DX8MYcl00').count, 999, 'The counter has a sensible bound');
ok(c.parts['[data-op="add"]'].disabled, 'The bound is visible');
const bad = counter(t, 'not-a-video'); bad.click('add');
equal(t.ctx.FL.workoutSets['2026-10-05']['not-a-video'], undefined, 'Unknown videos cannot make records');
t.ctx.flMergeWorkoutSets({ '2026-10-06': { Z5DX8MYcl00: { count: -1, updated: 100 } }, bad: {} });
equal(t.ctx.FL.workoutSets['2026-10-06'], undefined, 'Malformed backup counts are ignored');
const reloaded = make(); reloaded.saved.set('firstlight-v1', JSON.stringify(JSON.parse(resetBackup).record)); reloaded.ctx.flBoot();
equal(reloaded.ctx.todaySetRecord('2026-10-04', 'eAi7EAE6-cU').count, 2, 'A full boot restores counters');
t.ctx.vidCard = v => '<article data-kind="' + v.kind + '">' + v.id + '</article>';
for (let day = 1; day <= 366; day++) {
  const html = t.ctx.todayFilms(day);
  equal((html.match(/data-kind="yoga"/g) || []).length, 1, 'Every dated pair includes yoga');
  equal((html.match(/data-kind="workout"/g) || []).length, 1, 'Every dated pair includes a workout');
  equal((html.match(/class="workout-counter"/g) || []).length, 1, 'Every dated workout has a counter');
}
const before = t.ctx.todayFilms(42); t.ctx.vidSeed++;
ok(t.ctx.todayFilms(42) !== before, 'Another pair actually changes both choices');
t.load('js/sun.js'); t.ctx.FL.prefs.theme = 'dusk';
t.attrs['data-service'] = 'day'; equal(t.ctx.sunApply(), 'day', 'Day service overrides a legacy pinned solar palette');
t.attrs['data-service'] = 'night'; t.events['oot:servicechange']();
equal(t.attrs['data-phase'], 'night', 'Changing service repaints through the existing palette');
equal(t.ctx.FL.prefs.theme, 'dusk', 'The prior solar preference is retained');
delete t.attrs['data-service']; equal(t.ctx.sunApply(), 'dusk', 'Solar preference remains the fallback without the shared controller');
t.ctx.FL.prefs.dayEnd = 4;
equal(t.ctx.flDateKey(new Date(2026, 9, 5, 2)), '2026-10-04', 'The counter shares the existing shift-day boundary');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
vm.runInContext(app.slice(0, app.indexOf('/* Number keys')), t.ctx);
t.nodes.nav = { innerHTML: '' };
['today','year','vault','floor','astro','body','videos','reset','reflect','journal','life','library','hall','threads','search','settings'].forEach(k => { t.ctx.FL_VIEWS[k] = { label: k }; });
t.ctx.renderNav();
ok(t.nodes.nav.innerHTML.includes('>Today<span'), 'The way back to Today is visible');
for (const hint of ['Read &amp; explore', 'Move &amp; breathe', 'Reflect &amp; plan', 'Sacred readings']) ok(t.nodes.nav.innerHTML.includes(hint), 'Each tab explains its purpose');
t.ctx.flRoute = { view: 'videos' }; t.ctx.renderNav(); t.ctx.flRoute = { view: 'year' }; t.ctx.renderNav();
ok(t.nodes.nav.innerHTML.includes('href="#/videos"><span>Body'), 'Tabs keep the last room visited');
console.log('First Light flow: ' + checks + ' checks passed.');
