/* The Teachings: the batch bookkeeping every script shares.

   A batch's work folder, .scripts/teachings/work/<plan>-<NN>/, holds
     brief.json, todo.json               written by prep-batch.js
     proposals-<lane>.json               the proposing agents
     verdicts/<id>.json                  the verifiers
     refutations/<id>.json               the refuters
     reverify/<id>.json                  the fresh verifiers on every refutation
     batch.json, SOURCES-<plan>-<NN>.md  the editor
     critic-1.json                       the critic's first reading
     revise/<id>.json, revrefute/<id>.json   a revision of a questioned survivor, and its refuter
     critic.json                         the critic's second reading, after revisions
     recheck.json, rulings.json          the operator (recheck-evidence.js; by hand)
   Candidate ids are <plan>-<NN>-d<ddd>-p (the primary) and -s (the standby).

   status() reads the folder and says, for every day, what is alive: a
   candidate survives when its verdict passes (VERIFIED, CORRECTED, or HEDGE
   naming a conduit) and either no refuter broke it or a fresh verifier
   passed it again after the refutation. Two failures are death. The
   survivor's final form is the re-verifier's when there is one, else the
   verifier's (a CORRECTED verdict carries the corrected entry). */
'use strict';
const fs = require('fs');
const path = require('path');
const corpus = require('./corpus');

const ROOT = path.join(__dirname, '..', '..');
const WORK = path.join(__dirname, 'work');
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'batches.json'), 'utf8'));
const SENSITIVE = JSON.parse(fs.readFileSync(path.join(__dirname, 'sensitive.json'), 'utf8'));
const PASS = ['VERIFIED', 'CORRECTED', 'HEDGE'];

function nn(n) { return String(n).padStart(2, '0'); }
function batchName(plan, n) { return plan + '-' + nn(n); }
function batchDir(plan, n) { return path.join(WORK, batchName(plan, n)); }
function candId(plan, n, d, role) { return batchName(plan, n) + '-d' + String(d).padStart(3, '0') + '-' + role; }

function batchDays(plan, n) {
  const size = CFG.size[plan];
  if (!size) throw new Error('no batch size for ' + plan);
  const N = corpus.rt().planDays(plan);
  const a = (n - 1) * size + 1, b = Math.min(n * size, N);
  if (a > N || n < 1) throw new Error(plan + ' has no batch ' + n + ' (' + Math.ceil(N / size) + ' batches of ' + size + ')');
  const out = [];
  for (let d = a; d <= b; d++) out.push(d);
  return out;
}

/* Which of a plan's days hold a sensitive passage. */
function sensitiveDays(plan, days) {
  const marks = SENSITIVE[plan] || [];
  if (!marks.length) return [];
  return days.filter(d => {
    const U = corpus.dayOf(plan, d).units;
    return marks.some(m => {
      if (plan === 'quran') {
        const mm = String(m).match(/^(\d+):(\d+)(?:-(\d+))?$/);
        const s = +mm[1], a0 = +mm[2], a1 = mm[3] ? +mm[3] : a0;
        return U.some(u => { const r = u.short.match(/^(\d+):(\d+)$/); return r && +r[1] === s && +r[2] >= a0 && +r[2] <= a1; });
      }
      if (plan === 'veda') return U.some(u => u.ref.indexOf('Rig Veda ' + m + '.') === 0);
      return U.some(u => u.ref.indexOf(m + ':') === 0);
    });
  });
}

/* Lanes: consecutive ordinary days, laneDays to an agent, and the sensitive
   days two to an agent in their own lanes. */
function lanesOf(plan, days) {
  const sens = new Set(sensitiveDays(plan, days));
  const per = CFG.laneDays[plan] || 6, sPer = CFG.sensitiveLaneDays || 2;
  const lanes = [];
  const ordinary = days.filter(d => !sens.has(d)), sensitive = days.filter(d => sens.has(d));
  for (let i = 0; i < ordinary.length; i += per) lanes.push({ key: 'L' + (lanes.length + 1), days: ordinary.slice(i, i + per), sensitive: false });
  for (let i = 0; i < sensitive.length; i += sPer) lanes.push({ key: 'S' + (lanes.filter(l => l.sensitive).length + 1), days: sensitive.slice(i, i + sPer), sensitive: true });
  return lanes;
}

function readJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } }
function readDirJSON(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(f => { const j = readJSON(path.join(dir, f)); if (j) out[f.slice(0, -5)] = j; });
  return out;
}

/* Every proposal on disk, by id. */
function proposals(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir).filter(f => /^proposals-.+\.json$/.test(f)).forEach(f => {
    const j = readJSON(path.join(dir, f));
    ((j && j.days) || []).forEach(day => ['primary', 'standby'].forEach(role => {
      const c = day[role];
      if (c && c.id) out[c.id] = Object.assign({ d: day.d, role: role, lane: j.lane }, c);
    }));
  });
  return out;
}

function passes(v) { return !!(v && PASS.includes(v.verdict) && (v.verdict !== 'HEDGE' || v.hedge)); }

/* One candidate's state: pending, alive or dead, and its final form. A
   survivor the critic questioned may be revised (revise/<id>.json, a
   CORRECTED verdict by a fresh agent) and the revision attacked
   (revrefute/<id>.json); the revision replaces the survivor's form only if
   its refuter cleared it. A refuted revision leaves the survivor as it was. */
function stateOf(id, V, R, RV, REV, RR) {
  const v = V[id], r = R[id], rv = RV[id];
  let s;
  if (!v) return { id, state: 'unverified' };
  if (!passes(v)) return { id, state: 'dead', why: 'verdict ' + v.verdict, final: null };
  if (!r) return { id, state: 'unrefuted', final: v };
  if (r.refuted === false) s = { id, state: 'alive', final: v };
  else if (!rv) return { id, state: 'refuted', final: null };
  else if (passes(rv)) s = { id, state: 'alive', final: rv, afterRefutation: true };
  else return { id, state: 'dead', why: 'refuted, then ' + rv.verdict + ' on re-verification', final: null };
  const re = REV && REV[id], rr = RR && RR[id];
  if (re && re.verdict === 'CORRECTED' && passes(re)) {
    if (!rr) s.revision = 'unrefuted';
    else if (rr.refuted === false) { s.final = re; s.revision = 'kept'; }
    else s.revision = 'refuted';
  }
  return s;
}

/* A batch: plan-NN, or a named dry run (plan-<name>, its days from its brief). */
function batchRef(plan, n, name) {
  if (!name) return { plan, n, name: batchName(plan, n), dir: batchDir(plan, n), days: batchDays(plan, n), dry: false };
  const dir = path.join(WORK, plan + '-' + name);
  const brief = readJSON(path.join(dir, 'brief.json'));
  if (!brief) throw new Error('no brief for the dry run ' + plan + '-' + name + ': run prep-batch.js with --name first');
  return { plan, n, name: plan + '-' + name, dir, days: brief.days.map(x => x.d), dry: true };
}
function idOf(B, d, role) { return B.name + '-d' + String(d).padStart(3, '0') + '-' + role; }

function status(plan, n, name) {
  const B = batchRef(plan, n, name);
  const dir = B.dir;
  const days = B.days;
  const P = proposals(dir);
  const V = readDirJSON(path.join(dir, 'verdicts'));
  const R = readDirJSON(path.join(dir, 'refutations'));
  const RV = readDirJSON(path.join(dir, 'reverify'));
  const REV = readDirJSON(path.join(dir, 'revise'));
  const RR = readDirJSON(path.join(dir, 'revrefute'));
  const blocked = readJSON(path.join(dir, 'blocked.json')) || {};
  const lanes = lanesOf(plan, days);
  const out = { plan, batch: B.name, dry: B.dry, days: {}, lanesMissing: [], daysMissing: [], needVerdict: [], needRefute: [], needReverify: [], needRevRefute: [], needStandby: [], standbyMissing: [], alive: 0, dead: 0, blocked: Object.keys(blocked).map(Number) };
  lanes.forEach(l => { if (!fs.existsSync(path.join(dir, 'proposals-' + l.key + '.json'))) out.lanesMissing.push(l.key); });
  days.forEach(d => {
    const pid = idOf(B, d, 'p'), sid = idOf(B, d, 's');
    const rec = { d, primary: P[pid] ? stateOf(pid, V, R, RV, REV, RR) : null, standby: P[sid] ? stateOf(sid, V, R, RV, REV, RR) : null };
    if (!P[pid]) out.daysMissing.push(d);
    [rec.primary, rec.standby].forEach(s => {
      if (!s) return;
      if (s.state === 'unrefuted') out.needRefute.push(s.id);
      if (s.state === 'refuted') out.needReverify.push(s.id);
      if (s.revision === 'unrefuted') out.needRevRefute.push(s.id);
    });
    if (rec.primary && rec.primary.state === 'unverified') out.needVerdict.push(pid);
    if (rec.primary && rec.primary.state === 'dead') {
      if (!P[sid]) out.standbyMissing.push(d);
      else if (rec.standby.state === 'unverified') out.needStandby.push(sid);
    }
    rec.survivor = [rec.primary, rec.standby].find(s => s && s.state === 'alive') || null;
    if (rec.survivor) out.alive++;
    else if (rec.primary && rec.primary.state === 'dead' && (!rec.standby || rec.standby.state === 'dead')) out.dead++;
    out.days[d] = rec;
  });
  out.hasBatch = fs.existsSync(path.join(dir, 'batch.json'));
  out.proposals = P;
  return out;
}

/* The entry a survivor would land as: only these fields, exactly as the
   verdict (or re-verdict) that kept it alive gives them. */
const ENTRY_FIELDS = ['key', 'ref', 'at', 's', 'by', 'by2', 'hedge', 'src'];
function entryOf(final) {
  const e = {};
  ENTRY_FIELDS.forEach(k => { if (final[k] !== undefined && final[k] !== null && final[k] !== '') e[k] = final[k]; });
  return e;
}

module.exports = { ROOT, WORK, CFG, SENSITIVE, PASS, nn, batchName, batchDir, candId, batchDays, batchRef, idOf, sensitiveDays, lanesOf, readJSON, readDirJSON, proposals, passes, stateOf, status, entryOf, ENTRY_FIELDS };
