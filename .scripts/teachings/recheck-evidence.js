/* The Teachings, an operator tool: find every survivor's evidence again, by
   machine, before a batch lands.

   node .scripts/teachings/recheck-evidence.js <plan> <n>
   node .scripts/teachings/recheck-evidence.js --selftest

   For every candidate alive in the batch (lib.status), the commentator's own
   words in its evidence are string-matched against the source it says it
   opened:
     via "packet"    the cached packet for the day's chapters (no network),
                     read as it stands: it is OCR, and holds no markup
     via "webfetch"  the url, fetched once into .scripts/.cache/teachings/web/
                     (one request at a time), then matched; an HTML page is
                     read without its tags, and its entities decoded
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
   evidence keeps every character and loses only its punctuation. Nothing is
   stripped as markup here. Packet text is OCR, and a stray "<" can stand far
   from the next ">": on Gita day 18 they are 252,115 characters apart
   (Śaṅkara's "S§<ttvic" at 18.9, Telang's "O >ou"), and one /<[^>]+>/ took
   all of Rāmānuja and Madhva with it. */
function squash(s) {
  return String(s || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}
/* A fetched page's words. Only a page that says it is HTML loses its markup
   (an archive.org _djvu.txt download is OCR, like a packet), and only real
   tags: "<" then a name or "/name", ending at the first ">" before any
   other "<". Tags may span lines, as HTML's do. Entities are decoded;
   accented letters are composed, and any other named entity is a space. */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  ndash: '–', mdash: '—', hellip: '…', szlig: 'ß', aelig: 'æ', AElig: 'Æ', oelig: 'œ', OElig: 'Œ', eth: 'ð', thorn: 'þ' };
const MARK = { acute: '\u0301', grave: '\u0300', circ: '\u0302', uml: '\u0308', tilde: '\u0303', cedil: '\u0327', ring: '\u030A', macr: '\u0304' };
function isHtml(t) { return /<(!doctype\s+html|html|head|body)\b/i.test(String(t || '').slice(0, 4000)); }
function pageText(t) {
  if (!isHtml(t)) return String(t || '');
  return String(t)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<\/?[a-zA-Z][^<>]*>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') { const c = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ' '; }
      if (ENT[e]) return ENT[e];
      const a = e.match(/^([a-zA-Z])(acute|grave|circ|uml|tilde|cedil|ring|macr)$/);
      return a ? (a[1] + MARK[a[2]]).normalize('NFC') : ' ';
    });
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

/* One candidate's evidence, looked for in each source it says it opened, in
   order, until every piece is found in one of them. */
async function recheck(plan, d, ev) {
  const opened = ev.opened || [];
  const want = pieces(ev.words);
  if (!want.length) return { status: 'NOT FOUND', detail: 'no evidence words of four or more letters to match' };
  let result = { status: 'NOT FOUND', detail: '' };
  const tried = [];
  for (const o of opened.length ? opened : [{ via: 'packet' }]) {
    let hay = '';
    try {
      hay = o.via === 'packet' ? packetText(plan, d) : pageText(await webText(o.url));
    } catch (e) { tried.push((o.url || o.via) + ': ' + e.message); result = { status: 'UNREACHABLE', detail: tried.join('; ') }; continue; }
    const H = squash(hay);
    const missing = want.filter(p => H.indexOf(p) < 0);
    if (!missing.length) return { status: 'FOUND', via: o.via, url: o.url || '' };
    tried.push((o.url || o.via) + ': ' + missing.length + ' of ' + want.length + ' pieces not found');
    result = { status: 'NOT FOUND', detail: tried.join('; ') };
  }
  return result;
}

async function main() {
  const argv = process.argv.slice(2);
  const plan = argv[0], n = +argv[1];
  const ni = argv.indexOf('--name'), name = ni > -1 ? argv[ni + 1] : null;
  if (!plan || !n) { console.error('usage: node .scripts/teachings/recheck-evidence.js <plan> <n> [--name dry] | --selftest'); process.exit(1); }
  const st = lib.status(plan, n, name);
  const B = lib.batchRef(plan, n, name);
  const out = {};
  const counts = { FOUND: 0, 'NOT FOUND': 0, UNREACHABLE: 0 };
  for (const d of Object.keys(st.days).map(Number)) {
    const rec = st.days[d];
    for (const s of [rec.primary, rec.standby]) {
      if (!s || s.state !== 'alive') continue;
      const v = s.final;
      /* a course day's evidence is in the packet of the line's own work and day */
      const at = require('./corpus').isCourse(plan) ? require('./corpus').locateCourse(plan, d, v.key || '', v.ref) : null;
      const result = await recheck(at && at.exact ? at.work : plan, at && at.exact ? at.pd : d, v.evidence || {});
      out[s.id] = Object.assign({ d, who: v.by, afterRefutation: !!s.afterRefutation }, result);
      counts[result.status]++;
      console.log('  ' + result.status.padEnd(11) + ' ' + s.id + ' (' + (v.by || '?') + ')' + (result.detail ? ': ' + result.detail : ''));
    }
  }
  const f = path.join(B.dir, 'recheck.json');
  fs.writeFileSync(f, JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log('\n  ' + counts.FOUND + ' found, ' + counts['NOT FOUND'] + ' not found, ' + counts.UNREACHABLE + ' unreachable; written to ' + path.relative(lib.ROOT, f).replace(/\\/g, '/'));
}
/* ---------------------------------------------------------------- selftest */
async function selftest() {
  const failures = [];
  let held = 0;
  const has = (hay, words) => pieces(words).every(p => squash(hay).indexOf(p) > -1);
  const check = (name, ok, why) => { if (ok) { held++; console.log('  ok   ' + name); } else failures.push(name + (why ? ': ' + why : '')); };

  /* OCR brackets are text: day 18's shape, and the Katha's, where the stray
     "<" opens a word, as a real tag would, and runs 2,000 characters */
  const far = 'It is deemed to be S§<ttvic. ' + 'Filler of the commentary. '.repeat(10000) +
    'it would be inconsistent to say that all duties should be absolutely abandoned. ' + 'Learn from me, O >ou of mighty arms !';
  check('a stray "<" and a far ">" in OCR delete nothing', has(far, 'it would be inconsistent to say that all duties should be absolutely abandoned'));
  const katha = 'be my prostration <as you have been living in my house fasting for three nights (or the Dvyamushyayana> will recognise you';
  check('an OCR "<" before a word is not a tag', has(katha, 'as you have been living in my house fasting for three nights'));
  check('OCR text is never read as a page', pageText(far) === far && pageText(katha) === katha);

  /* a page's markup goes, its words stay: tags within a word and across a
     line, entities, accents, a script's text */
  const page = '<!DOCTYPE html>\n<html><head><title>t</title><style>p { color: red }</style></head><body>\n' +
    '<p>it would be <i>in</i>consis<a\n href="/x" class="note">tent</a> to say that all duties should be &ldquo;absolutely&rdquo; abandoned &amp; renounced; ' +
    'the caf&eacute; don&#8217;t &#x15A;a&#7749;kara</p><!-- a comment decoy --><script>var s = "a script decoy";</script></body></html>';
  const pt = pageText(page);
  check('a page loses its tags, even across a line', has(pt, 'it would be inconsistent to say that all duties should be “absolutely” abandoned & renounced') && !/href|class/.test(pt), JSON.stringify(pt));
  check('a page’s entities are decoded', has(pt, 'the café don’t Śaṅkara'), JSON.stringify(pt));
  check('a page’s scripts, styles and comments are not its words', !/decoy|color/.test(pt), JSON.stringify(pt));
  check('evidence splits on an ellipsis', pieces('first words here … second words there').length === 2);

  /* the real packet: Madhva on Gita 18.66 lies between Sankara's stray "<"
     at 18.9 and Telang's ">" in chapter 18, and must be FOUND */
  const madhva = 'In the light of the foregoing teaching and the conclusion of the work it would be inconsistent to say that all duties should be absolutely abandoned. In fact Sri Krishna could not then urge Arjuna to fight.';
  const missing = packetsFor('gita', 18).filter(p => p.missing);
  if (missing.length) failures.push('the Gita day 18 packet is not cached (' + missing.map(p => p.missing).join(', ') + '): run fetch-commentary.js for the gita first');
  else {
    const raw = packetText('gita', 18);
    const at = raw.indexOf('it would be inconsistent to say that all duties should be absolutely abandoned');
    check('Gita day 18 still holds the quote between a stray "<" and a ">"',
      at > -1 && raw.lastIndexOf('<', at) > -1 && raw.indexOf('>', at) > -1, 'at ' + at);
    const r = await recheck('gita', 18, { words: madhva, opened: [{ via: 'packet' }] });
    check('Gita day 18, Madhva on 18.66: ' + r.status, r.status === 'FOUND', r.detail);
  }

  console.log('\n  selftest: ' + held + ' assertions held' + (failures.length ? ', ' + failures.length + ' FAILED:\n    ' + failures.join('\n    ') : '.'));
  return failures.length ? 1 : 0;
}

if (require.main === module) {
  const run = process.argv[2] === '--selftest' ? selftest().then(code => process.exit(code)) : main();
  run.catch(e => { console.error('recheck-evidence: ' + e.message); process.exit(1); });
}

module.exports = { squash, pieces, pageText, recheck };
