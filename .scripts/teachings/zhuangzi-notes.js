/* The Teachings, an operator tool: which of the Zhuangzi's baked blocks are
   Giles' apparatus, not the text.

   node .scripts/teachings/zhuangzi-notes.js           rebuild zhuangzi-notes.json
   node .scripts/teachings/zhuangzi-notes.js --check   fail if the file differs from a rebuild

   Giles' notes are ordinary blocks in js/texts/zhuangzi/all.js. In the
   Gutenberg source (#59709, cached at .scripts/.cache/zhuangzi.txt) they are
   the paragraphs indented by exactly one space. The source is cut here exactly
   as fetch-texts.js cuts it (chapters on "CHAPTER <roman>.", blocks on blank
   lines), every block is checked against the baked block of the same number,
   and the map { "<chapter>": [block numbers] } is written for corpus.js.

   Listed: every one-space paragraph except the _Argument_ (corpus.js knows it
   by its first word), plus the blocks in JUDGED below, which are Giles' too
   but are not indented by one space. Not listed: the INDEX after "_INDEX_"
   (not in the plan), and Zhuangzi's own verse, which Giles indents like his
   quotations (2.100, 5.73, 6.141, 22.44, 26.31, 32.22). */
'use strict';
const fs = require('fs');
const path = require('path');
const A = require('../plans/atoms');

const SRC = path.join(__dirname, '..', '.cache', 'zhuangzi.txt');
const OUT = path.join(__dirname, 'zhuangzi-notes.json');

/* Giles' blocks that are not one-space paragraphs, each read against its
   neighbours; the pattern is the block's first line, so a changed source
   fails loudly instead of listing the wrong block. */
const JUDGED = [
  // block    first line                                                 why it is Giles'
  ['6.7',    /^"Heaven from all creatures hides the book of Fate,$/,    'Pope, Essay on Man, quoted as the end of the one-space note 6.6'],
  ['22.80',  /^1\. Sovereign\s+and Subject\.$/,                          'the five relationships: the list the one-space note 22.79 ("classified as follows:--") introduces'],
  ['32.89',  /^Compounds for sins he feels inclined to$/,                'Butler, Hudibras: an English couplet set against the text 32.88'],
  ['32.113', /^And had he not high honour\?--$/,                         'Mrs. Alexander, The Burial of Moses, set against Chuang Tzu\'s funeral (32.112)'],
  ['32.114', /^And the dark rock pines like nodding plumes$/,            'the same poem, its second stanza'],
  ['32.115', /^_The Burial of Moses_ \(Mrs\. Alexander\)\.$/,            'the poem\'s attribution'],
  ['14.2',   /^\[This chapter is supplementary to ch\. v\.\]$/,          'Giles\' bracketed headnote'],
  ['18.2',   /^\[This chapter is supplementary to chapter vi\.\]$/,      'Giles\' bracketed headnote'],
  ['19.2',   /^\[This chapter is supplementary to chapter iii\.\]$/,     'Giles\' bracketed headnote'],
  ['20.2',   /^\[This chapter is supplementary to chapter iv\.\]$/,      'Giles\' bracketed headnote'],
  ['21.2',   /^\[This chapter is supplementary to chapter vi\.\]$/,      'Giles\' bracketed headnote'],
  ['22.2',   /^\[This chapter is supplementary to chapter vi\.\]$/,      'Giles\' bracketed headnote'],
  ['28.1',   /^\[Spurious\.\]$/,                                         'Giles\' bracketed headnote'],
  ['29.1',   /^\[Spurious\.\]$/,                                         'Giles\' bracketed headnote'],
  ['30.1',   /^\[Spurious\.\]$/,                                         'Giles\' bracketed headnote'],
  ['31.1',   /^\[Spurious\.\]$/,                                         'Giles\' bracketed headnote'],
  ['33.1',   /^\[Summary by early editors\.\]$/,                         'Giles\' bracketed headnote']
];

function sourceChapters() {
  if (!fs.existsSync(SRC)) throw new Error('no ' + SRC + ': run node .scripts/fetch-texts.js first');
  const raw = fs.readFileSync(SRC, 'utf8');
  const a = raw.indexOf('*** START OF TH'), b = raw.indexOf('*** END OF TH');
  const body = ((a > -1 && b > a) ? raw.slice(raw.indexOf('\n', a) + 1, b) : raw).replace(/\r\n/g, '\n');
  const parts = body.split(/^CHAPTER\s+([IVXLC]+)\.\s*$/m);
  const out = [];
  for (let i = 1; i < parts.length; i += 2)
    out.push(parts[i + 1].split(/\n\s*\n/).map(x => x.split('\n').filter(s => s.trim())).filter(x => x.length));
  if (out.length !== 33) throw new Error('the source has ' + out.length + ' chapters, expected 33');
  return out;
}

function build() {
  const src = sourceChapters(), baked = A.loadPart('zhuangzi', 'all');
  const judged = new Map(JUDGED.map(([ref, re]) => [ref, re]));
  const map = {}, seen = new Set(), count = { note: 0, judged: 0 };
  src.forEach((rb, ci) => {
    const n = ci + 1, bk = baked[ci];
    if (!bk || bk.n !== n || rb.length !== bk.b.length) throw new Error('chapter ' + n + ': the source has ' + rb.length + ' blocks, the baked text ' + (bk ? bk.b.length : 0));
    let end = bk.b.findIndex(x => x.length === 1 && x[0].trim() === '_INDEX_');
    if (end < 0) end = bk.b.length;
    map[n] = [];
    rb.forEach((blk, k) => {
      const t = blk.map(s => s.trim());
      if (JSON.stringify(t) !== JSON.stringify(bk.b[k])) throw new Error(n + '.' + k + ': the source and the baked block differ');
      if (k === 0 || k >= end) return;
      const ref = n + '.' + k;
      if (blk.every(l => /^ \S/.test(l))) {
        if (/^_Argument_/.test(t[0])) return;
        map[n].push(k); count.note++;
      } else if (judged.has(ref)) {
        if (!judged.get(ref).test(t[0])) throw new Error(ref + ' no longer opens as JUDGED expects: ' + t[0]);
        map[n].push(k); count.judged++; seen.add(ref);
      }
    });
  });
  const lost = JUDGED.map(j => j[0]).filter(r => !seen.has(r));
  if (lost.length) throw new Error('JUDGED blocks not found: ' + lost.join(', '));
  const json = '{\n' + Object.keys(map).map(n => '  "' + n + '": [' + map[n].join(', ') + ']').join(',\n') + '\n}\n';
  return { map, json, count };
}

if (require.main === module) {
  try {
    const { map, json, count } = build();
    const total = count.note + count.judged;
    if (process.argv.includes('--check')) {
      const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
      if (now !== json) { console.error('zhuangzi-notes: ' + OUT + ' differs from a rebuild; run without --check'); process.exit(1); }
      console.log('zhuangzi-notes: up to date (' + total + ' blocks)');
    } else {
      fs.writeFileSync(OUT, json, 'utf8');
      console.log('zhuangzi-notes: ' + total + ' blocks (' + count.note + ' one-space notes, ' + count.judged + ' judged) written to ' + path.relative(process.cwd(), OUT));
      console.log('  ' + Object.keys(map).map(n => n + ':' + map[n].length).join(' '));
    }
  } catch (e) { console.error('zhuangzi-notes: ' + e.message); process.exit(1); }
}

module.exports = { build, JUDGED };
