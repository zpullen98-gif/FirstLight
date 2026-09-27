/* The Teachings: where a batch stands, read from its files.

   node .scripts/teachings/status.js <plan> <n> [--name dry] [--json]

   For every day: the primary's and the standby's state (unverified,
   unrefuted, refuted, alive, dead) and, for the survivor, the entry it would
   land as, exactly as the verdict that kept it alive gives it. The editor
   selects from this and changes nothing but straight quotes to curly. */
'use strict';
const lib = require('./lib');

const args = process.argv.slice(2);
const plan = args[0], n = +args[1];
const ni = args.indexOf('--name'), name = ni > -1 ? args[ni + 1] : null;
if (!plan || !n) { console.error('usage: node .scripts/teachings/status.js <plan> <n> [--name dry] [--json]'); process.exit(1); }
const st = lib.status(plan, n, name);
const days = Object.keys(st.days).map(Number).sort((a, b) => a - b).map(d => {
  const r = st.days[d];
  const s = x => x ? { id: x.id, state: x.state, why: x.why || '', afterRefutation: !!x.afterRefutation, revision: x.revision || '' } : null;
  return { d, primary: s(r.primary), standby: s(r.standby), survivor: r.survivor ? Object.assign({ id: r.survivor.id }, lib.entryOf(r.survivor.final)) : null };
});
if (args.includes('--json')) {
  console.log(JSON.stringify({ plan, batch: st.batch, alive: st.alive, dead: st.dead, todo: { lanesMissing: st.lanesMissing, needVerdict: st.needVerdict, needRefute: st.needRefute, needReverify: st.needReverify, needRevRefute: st.needRevRefute, needStandby: st.needStandby, standbyMissing: st.standbyMissing }, days }, null, 1));
} else {
  console.log(st.batch + ': ' + st.alive + ' days with a survivor, ' + st.dead + ' with none');
  days.forEach(x => console.log('  day ' + String(x.d).padStart(3) + '  p ' + (x.primary ? x.primary.state : 'none').padEnd(10) + ' s ' + (x.standby ? x.standby.state : 'none').padEnd(10) +
    (x.survivor ? '  ' + x.survivor.id + ' (' + x.survivor.by + ')' + (x.primary && x.primary.revision ? ' revision ' + x.primary.revision : '') : '  no survivor')));
  console.log('  todo: ' + JSON.stringify({ lanesMissing: st.lanesMissing, needVerdict: st.needVerdict.length, needRefute: st.needRefute.length, needReverify: st.needReverify.length, needStandby: st.needStandby.length, standbyMissing: st.standbyMissing }));
}
