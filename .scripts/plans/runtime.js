/* The Readings: the app's own plan functions, run in node.

   The build labels its report and the gate checks labels and migration
   with the very functions the reader's browser will run, not with copies.
   data-canon.js declares top-level const, which is a lexical global: it is
   invisible from a second vm.Script. So the five files are joined into ONE
   script, with stubs for the store (FL, flSave, flToday, flShiftedNow), and
   the functions are handed back from inside it.

   loadRuntime(opts)
     opts.plans        an FL_PLANS object to use instead of js/data-plans.js
     opts.noPlans      load without any FL_PLANS (plan.js must not throw)
     opts.today        what flToday() answers (default '2026-09-26')
     opts.patch        [[from, to], ...] replacements in plan.js (the gate's
                       selftest uses them to break the migration on purpose)
   returns { planDef, planDays, ..., FL (getter), setFL(obj), saves() } */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const C = require('./config');

const EXPORTS = ['planDef', 'planDays', 'planDay', 'planAtom', 'planLabelRange', 'planDayLabel',
  'planState', 'planToday', 'planProgress', 'planMarkRead', 'planBeginAgain', 'planCarry',
  'planCarryAll', 'planCarryMerge', 'planImport', 'planCount', 'courseDays', 'courseReady', 'planLength', 'hallById'];

function read(rel) { return fs.readFileSync(path.join(C.ROOT, rel), 'utf8'); }

function loadRuntime(opts) {
  opts = opts || {};
  const today = opts.today || '2026-09-26';
  let plansSrc;
  if (opts.noPlans) plansSrc = '';
  else if (opts.plans) plansSrc = 'var FL_PLANS = ' + JSON.stringify(opts.plans) + ';';
  else plansSrc = read('js/data-plans.js');

  const stubs =
    'var FL = { canon: {}, readings: {} };\n' +
    'var __saves = 0;\n' +
    'function flSave() { __saves++; }\n' +
    'function flToday() { return ' + JSON.stringify(today) + '; }\n' +
    'function flShiftedNow() { return new Date(' + JSON.stringify(today + 'T09:00:00') + '); }\n';
  const tail = '\n;__rt.fns = {' + EXPORTS.map(n => n + ': (typeof ' + n + ' === "function" ? ' + n + ' : null)').join(', ') + '};\n' +
    '__rt.getFL = function () { return FL; };\n' +
    '__rt.setFL = function (x) { FL = x; };\n' +
    '__rt.saves = function () { return __saves; };\n' +
    '__rt.plans = function () { return typeof FL_PLANS === "undefined" ? undefined : FL_PLANS; };\n';
  let planSrc = read('js/plan.js');
  (opts.patch || []).forEach(pr => {
    if (planSrc.indexOf(pr[0]) < 0) throw new Error('runtime patch: not found in plan.js: ' + pr[0]);
    planSrc = planSrc.split(pr[0]).join(pr[1]);
  });
  const src = [stubs, read('js/data-canon.js'), read('js/data-library.js'), read('js/data-traditions.js'),
    plansSrc, planSrc, tail].join('\n');

  const ctx = { __rt: {}, console: console };
  vm.createContext(ctx);
  new vm.Script(src, { filename: 'first-light-runtime.js' }).runInContext(ctx);
  const rt = Object.assign({}, ctx.__rt.fns);
  Object.defineProperty(rt, 'FL', { get: () => ctx.__rt.getFL() });
  rt.setFL = ctx.__rt.setFL;
  rt.saves = ctx.__rt.saves;
  rt.FL_PLANS = ctx.__rt.plans();
  return rt;
}

module.exports = { loadRuntime };
