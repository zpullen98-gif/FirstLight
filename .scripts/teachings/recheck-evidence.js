/* The Teachings, an operator tool: find every survivor's evidence again, by
   machine, before a batch lands.

   node .scripts/teachings/recheck-evidence.js <plan> <n>

   For every candidate alive in the batch (lib.status), the commentator's own
   words in its evidence are string-matched against the source it says it
   opened:
     via "packet"    the cached packet for the day's chapters (no network)
     via "webfetch"  the url, fetched once into .scripts/.cache/teachings/web/
                     (one request at a time), then matched
   Matching ignores whitespace, punctuation and case, and splits the words on
   an ellipsis: every piece must be found. Each result is FOUND, NOT FOUND or
   UNREACHABLE, written to work/<plan>-<NN>/recheck.json. land-batch.js
   refuses a NOT FOUND or UNREACHABLE entry unless rulings.json rules on it. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const lib = require('./lib');
const { packetsFor } = require('./packet');
const { CACHE } = require('./fetch-commentary');

const UA = 'FirstLightBuild/1.0 (https://zpullen98-gif.github.io/; a personal study app; one request at a time)';

/* Letters and digits only, lower case: CJK characters are letters, so Chinese
   evidence keeps every character and loses only its punctuation. */
function squash(s) {
  return String(s || '').normalize('NFKC').toLowerCase().replace(/<[^>]+>/g, ' ').replace(/[^\p{L}\p{N}]+/gu, '');
}
function pieces(words) {
  return String(words || '').split(/…|\.\.\.|\[\s*…\s*\]/).map(squash).filter(p => p.length >= 4);
}
function packetText(plan, d) {
  return packetsFor(plan, d).map(p => (p.sources || []).map(s =>
    [s.title || '', (s.segs || []).map(x => x.base + x.comm).join(''), s.notes || ''].join(' ')).join(' ')).join(' ');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function webText(url) {
  const dir = path.join(CACHE, 'web');
  const f = path.join(dir, crypto.createHash('sha1').update(url).digest('hex').slice(0, 16) + '.txt');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  fs.mkdirSync(dir, { recursive: true });
  await sleep(1500);
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const t = await res.text();
  fs.writeFileSync(f, t, 'utf8');
  return t;
}

async function main() {
  const argv = process.argv.slice(2);
  const plan = argv[0], n = +argv[1];
  const ni = argv.indexOf('--name'), name = ni > -1 ? argv[ni + 1] : null;
  if (!plan || !n) { console.error('usage: node .scripts/teachings/recheck-evidence.js <plan> <n> [--name dry]'); process.exit(1); }
  const st = lib.status(plan, n, name);
  const B = lib.batchRef(plan, n, name);
  const out = {};
  const counts = { FOUND: 0, 'NOT FOUND': 0, UNREACHABLE: 0 };
  for (const d of Object.keys(st.days).map(Number)) {
    const rec = st.days[d];
    for (const s of [rec.primary, rec.standby]) {
      if (!s || s.state !== 'alive') continue;
      const v = s.final, ev = v.evidence || {};
      const opened = ev.opened || [];
      const want = pieces(ev.words);
      let result = { status: 'NOT FOUND', detail: '' };
      if (!want.length) result = { status: 'NOT FOUND', detail: 'no evidence words of four or more letters to match' };
      else {
        const tried = [];
        for (const o of opened.length ? opened : [{ via: 'packet' }]) {
          let hay = '';
          try {
            hay = o.via === 'packet' ? packetText(plan, d) : await webText(o.url);
          } catch (e) { tried.push((o.url || o.via) + ': ' + e.message); result = { status: 'UNREACHABLE', detail: tried.join('; ') }; continue; }
          const H = squash(hay);
          const missing = want.filter(p => H.indexOf(p) < 0);
          if (!missing.length) { result = { status: 'FOUND', via: o.via, url: o.url || '' }; break; }
          tried.push((o.url || o.via) + ': ' + missing.length + ' of ' + want.length + ' pieces not found');
          result = { status: 'NOT FOUND', detail: tried.join('; ') };
        }
      }
      out[s.id] = Object.assign({ d, who: v.by, afterRefutation: !!s.afterRefutation }, result);
      counts[result.status]++;
      console.log('  ' + result.status.padEnd(11) + ' ' + s.id + ' (' + (v.by || '?') + ')' + (result.detail ? ': ' + result.detail : ''));
    }
  }
  const f = path.join(B.dir, 'recheck.json');
  fs.writeFileSync(f, JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log('\n  ' + counts.FOUND + ' found, ' + counts['NOT FOUND'] + ' not found, ' + counts.UNREACHABLE + ' unreachable; written to ' + path.relative(lib.ROOT, f).replace(/\\/g, '/'));
}
main().catch(e => { console.error('recheck-evidence: ' + e.message); process.exit(1); });
