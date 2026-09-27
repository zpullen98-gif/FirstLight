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

/* A packet per chapter, numbered: the Tao's chapter, the Dhammapada's, the
   Gita's, the Analects' book. The Upanishads' packets are per section and
   named by its slug ("isa-upanishad", "katha-upanishad-1-2",
   "kena-upanishad-3"), keyed on the day's verse units only (a peace chant
   carries no section). */
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
/* Plans whose chapters are named, not numbered alone: the Bible's and the
   Tanakh's ("genesis-20", "psalm-23", "1-samuel-3") and the Rig Veda's
   hymns ("rig-veda-1-164") share numbers across books, so their packets are
   keyed on the chapter's slug, as the Upanishads' sections are. */
const SLUGGED = { upanishads: 1, bible: 1, tanakh: 1, veda: 1 };
function chaptersOf(plan, d) {
  const set = [];
  corpus.dayOf(plan, d).units.forEach(u => {
    let k;
    if (SLUGGED[plan]) { if (u.kind !== 'verse') return; k = slug(u.ch); }
    else { const m = String(u.ch).match(/(\d+)$/); if (!m) return; k = +m[1]; }
    if (!set.includes(k)) set.push(k);
  });
  return set;
}
function packetFile(plan, ch) { return path.join(CACHE, plan, (typeof ch === 'number' ? String(ch).padStart(2, '0') : ch) + '.json'); }
function packetsFor(plan, d) {
  return chaptersOf(plan, d).map(ch => {
    const f = packetFile(plan, ch);
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { plan, ch, missing: f };
  });
}

/* --verse <n>: only the segs whose label covers that verse. A seg's label is
   its base's opening bracket: "[2.47]", "[1.20 to 1.22]", "[Katha 1.2.20]",
   "[7.18]" (the Analects), "[2:255]" and "[2:21 to 2:22]" (the Qur'an); the
   last number is the verse. */
function covers(base, verse) {
  const m = String(base).match(/^\[([^\]]+)\]/);
  if (!m) return false;
  const want = String(verse).split(/[.:]/).map(Number);
  const nums = s => (s.match(/\d+(?:[.:]\d+)*/) || [''])[0].split(/[.:]/).map(Number);
  const parts = m[1].split(/\s+to\s+/);
  const a = nums(parts[0]), b = parts[1] ? nums(parts[1]) : a;
  const cmp = (x, y) => { for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  const w = want.length < a.length ? a.slice(0, a.length - want.length).concat(want) : want;
  return cmp(a, w) <= 0 && cmp(w, b) <= 0;
}
function render(p, verse) {
  if (p.missing) return '(no packet for chapter ' + p.ch + ': ' + p.missing + ')';
  const out = ['######## chapter ' + p.ch + (verse ? ', only the commentary on ' + verse : '')];
  p.sources.forEach(s => {
    out.push('\n=== ' + s.name + (s.title ? ' (chapter title: ' + s.title + ')' : '') + ' ===');
    out.push('edition: ' + s.edition);
    out.push('cite as: ' + s.url + '   licence: ' + s.licence);
    if (s.note) out.push('NOTE: ' + s.note);
    if (s.segs) {
      const segs = verse ? s.segs.filter(x => covers(x.base, verse)) : s.segs;
      if (verse && !segs.length) out.push('  (nothing on ' + verse + ' in this source)');
      segs.forEach(x => {
        if (x.base) out.push('  [text]       ' + x.base);
        if (x.comm) out.push('  [commentary] ' + x.comm);
      });
    }
    if (s.notes) out.push(verse ? '  (notes and whole-chapter texts are printed without --verse)' : s.notes);
  });
  return out.join('\n');
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const [plan, dayArg] = argv;
  const vi = argv.indexOf('--verse'), verse = vi > -1 ? argv[vi + 1] : null;
  if (!plan || !dayArg) { console.error('usage: node .scripts/teachings/packet.js <plan> <day> [--verse <n>, e.g. 2.47 or 1.2.20]'); process.exit(1); }
  const day = corpus.dayOf(plan, +dayArg);
  console.log(plan + ', day ' + day.d + ': ' + day.label + '\n');
  console.log(packetsFor(plan, +dayArg).map(p => render(p, verse)).join('\n\n'));
}

module.exports = { chaptersOf, packetFile, packetsFor };
