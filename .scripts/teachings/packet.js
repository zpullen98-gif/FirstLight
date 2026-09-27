/* The Teachings, an agent tool: the commentary packet for one day.

   node .scripts/teachings/packet.js <plan> <day>

   Prints, for each chapter the day's passage covers, every cached source:
   the commentary's own words beside the base text it comments on, with the
   edition and the url a verifier cites as evidence (via "packet"). The
   packets are fetched once by the operator (fetch-commentary.js); an agent
   never fetches them itself. A source the packet does not hold may still be
   opened on the web, and then evidence cites that url (via "webfetch"). */
'use strict';
const fs = require('fs');
const path = require('path');
const corpus = require('./corpus');
const { CACHE } = require('./fetch-commentary');

function chaptersOf(plan, d) {
  const set = [];
  corpus.dayOf(plan, d).units.forEach(u => {
    const m = String(u.ch).match(/(\d+)$/);
    if (m && !set.includes(+m[1])) set.push(+m[1]);
  });
  return set;
}
function packetFile(plan, ch) { return path.join(CACHE, plan, String(ch).padStart(2, '0') + '.json'); }
function packetsFor(plan, d) {
  return chaptersOf(plan, d).map(ch => {
    const f = packetFile(plan, ch);
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { plan, ch, missing: f };
  });
}

function render(p) {
  if (p.missing) return '(no packet for chapter ' + p.ch + ': ' + p.missing + ')';
  const out = ['######## chapter ' + p.ch];
  p.sources.forEach(s => {
    out.push('\n=== ' + s.name + (s.title ? ' (chapter title: ' + s.title + ')' : '') + ' ===');
    out.push('edition: ' + s.edition);
    out.push('cite as: ' + s.url + '   licence: ' + s.licence);
    if (s.note) out.push('NOTE: ' + s.note);
    if (s.segs) s.segs.forEach(x => {
      if (x.base) out.push('  [text]       ' + x.base);
      if (x.comm) out.push('  [commentary] ' + x.comm);
    });
    if (s.notes) out.push(s.notes);
  });
  return out.join('\n');
}

if (require.main === module) {
  const [plan, dayArg] = process.argv.slice(2);
  if (!plan || !dayArg) { console.error('usage: node .scripts/teachings/packet.js <plan> <day>'); process.exit(1); }
  const day = corpus.dayOf(plan, +dayArg);
  console.log(plan + ', day ' + day.d + ': ' + day.label + '\n');
  console.log(packetsFor(plan, +dayArg).map(render).join('\n\n'));
}

module.exports = { chaptersOf, packetFile, packetsFor };
