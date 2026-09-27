/* The Teachings: the Rig Veda commentaries, one packet per hymn.

   const veda = require('./sources/veda');
   await veda.build({ get, CACHE, packetsOnly });

   Writes .scripts/.cache/teachings/veda/rig-veda-<m>-<h>.json for all 1,028
   hymns: { plan: 'veda', ch: 'rig-veda-<m>-<h>', sources: [...] }. A seg's
   base opens with its label, "[1.164 introduction] ", "[1.164.46] " or
   "[1.164.45 to 1.164.46] ", which packet.js --verse reads.

   Everything is pinned in veda-lock.json beside this file: each Wikisource
   page's revision and its sha1, each archive.org file's sha1 (from the item's
   /metadata); a file whose sha1 differs stops the build. Tested 2026-09-27.

   Numbering. The app (Griffith, as the sacred-texts edition prints him)
   puts the Valakhilya last in Book 8, so its 8.49 to 8.92 are the standard
   8.60 to 8.103 and its 8.93 to 8.103 the standard 8.49 to 8.59 (stdOf); the
   sources use the standard numbers, and every label is the app's. Griffith
   prints 1.65 to 1.70 as couplets (PAIRED). Where Sayana's count of a hymn's
   verses differs from the app's the packet says so, and build() reports it.

     sayana    Sanskrit Wikisource, "ऋग्वेदः सूक्तं <m>.<h>" (Devanagari digits),
               each page at the revision pinned in the lock (1,019 pages carry
               the template {{सायणभाष्यम्|...}}: every hymn but the Valakhilya,
               plus 8.56 and 8.58, whose commentary Cowell says Sayana did not
               write, so it is marked doubtful). Fetched by revid, 50 a request.
               Inside the template: the hymn's introduction (viniyoga,
               anukramani), then per verse the accented samhita line(s) ending
               "॥N", the accented pada text, the unaccented pada text, then the
               commentary. Paragraphs are told apart by the accent marks (samhita)
               and the ratio of dandas to words (pada text); everything else is
               commentary. A page's slips (a verse printed twice, a wrong number)
               are mended in order and named in the packet's note. The
               {{टिप्पणी|...}} block after the template (a modern contributor's
               notes) is never read.
     wilson    H. H. Wilson, Rig-Veda-Sanhita, 6 vols (1850 to 1888; vol. 1 in its
               1866 second edition; vol. 4 seen through the press by Cowell, 5 ed.
               Cowell and Webster, 6 ed. Webster), the Princeton scans
               rigvedasanhitc0<n>wils: the hOCR (line and word boxes, type size),
               on the pages the item's page list keeps (the scan repeats a few
               leaves). Hymn headings "SUKTA ii. (NNN.)" are found by the longest
               increasing run of their OCR'd numbers in each mandala, then by
               the one bracket between two found neighbours that reads right, or
               by the introductions; all 1,017 are found. The translation is set
               larger than the introductions and notes (x_size 58 to 66 against
               41 to 54). A verse opens with an indented line (the marginal
               "Varga" set aside); the openings are numbered 1..N against
               Sayana's count by the best agreement with the numbers the OCR
               read. A page's notes (lettered in vols. 1 to 3, numbered in 4 to
               6) meet the marks in the page's verse lines: where there are as
               many marks as notes they pair in order; else a mark whose letter
               survived pins its note, and a note left between two pinned ones
               gets a seg labelled with the verses between them.
     griffith-notes  R. T. H. Griffith, The Hymns of the Rigveda, 2nd ed., 2 vols
               (1896 and 1897, the edition of the app's text; the first edition
               of 1889 to 1892 words many verses differently), archive.org
               in.ernet.dli.2015.104118 (Books 1 to 6) and 104119 (7 to 10), the
               _djvu.txt. Each hymn is found by its first verse under a "HYMN n."
               heading (the numbers are too garbled to trust), or by the first
               verse alone; its verse lines are the ones that share most of their
               letters with the app's text; the rest, less the running heads, are
               notes, "N Word: gloss", each given to the hymn (this one or one of
               the three before, whose notes can follow the next heading) whose
               verse holds its lead words.
     yaska     Lakshman Sarup, The Nighantu and the Nirukta (Lahore, 1920 to 1929),
               archive.org nighantuniruktao00yask (the Columbia film of the set):
               its "List of quotations occurring in the Nirukta, arranged in the
               order of the Samhitas" (RV part) maps a verse to its Nirukta
               section; the section's English is cut from Sarup's translation
               where its end marks ("(Here ends the ... section.)") read or can be
               counted, less each page's footnotes; else the seg names the page.
               GRETIL's Nirukta (CC BY-NC-SA) is not used; its section counts
               per chapter were taken once, as numbers (SECS). */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const A = require('../../plans/atoms');

const LOCK = require('./veda-lock.json');
const COUNTS = [191, 43, 62, 58, 87, 75, 104, 103, 114, 191];
const VALAKHILYA = h => h >= 49 && h <= 59;               // in mandala 8
const DOUBTFUL = { '8.56': 1, '8.58': 1 };
const sha1 = s => crypto.createHash('sha1').update(s, 'utf8').digest('hex');
const DEV = n => String(n).replace(/\d/g, d => '०१२३४५६७८९'[d]);
const undev = s => s.replace(/[०-९]/g, c => '०१२३४५६७८९'.indexOf(c));
const slug = (m, h) => 'rig-veda-' + m + '-' + h;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------ fetching */
async function load(h, url, file) {
  if (h.packetsOnly) {
    const f = path.join(h.CACHE, 'src', file);
    if (!fs.existsSync(f)) throw new Error('veda: ' + file + ' is not cached; run without --packets first');
    return fs.readFileSync(f, 'utf8');
  }
  for (let k = 1; ; k++) {
    try { return await h.get(url, file); }
    catch (e) {   // archive.org's data servers now and then answer 500 or 502: try again
      if (k >= 4 || !/HTTP 5\d\d/.test(e.message)) throw e;
      console.log('  ' + file + ': ' + e.message.replace(/ from .*/, '') + ', retrying');
      await sleep(10000 * k);
    }
  }
}
/* an archive.org file, checked against the sha1 its metadata listed */
async function iaFile(h, id, name, file) {
  const pin = LOCK.archive[name];
  if (!pin) throw new Error('veda: no pin for ' + name);
  const text = await load(h, 'https://archive.org/download/' + id + '/' + encodeURIComponent(name), file);
  const got = sha1(text);
  if (got !== pin) throw new Error('veda: ' + file + ' has sha1 ' + got + ', the pin is ' + pin + ' (archive.org rebuilt the file?)');
  return text;
}
const details = (id, leaf) => 'https://archive.org/details/' + id + (leaf ? '/page/n' + leaf + '/mode/1up' : '');

/* The app numbers Book 8 as the sacred-texts edition of Griffith does: the
   Valakhilya (the standard 8.49 to 8.59) come last, as 8.93 to 8.103, so the
   app's 8.49 to 8.92 are the standard 8.60 to 8.103. Every other hymn keeps
   its number. The sources (Sayana, Wilson, Sarup) use the standard numbers. */
function stdOf(m, h) {
  if (m !== 8 || h < 49) return h;
  return h <= 92 ? h + 11 : h - 44;
}
/* Griffith prints 1.65 to 1.70 as couplets: the app's verse k is the standard
   2k-1 and 2k. Elsewhere a verse keeps its number. */
const PAIRED = { '1.65': 1, '1.66': 1, '1.67': 1, '1.68': 1, '1.69': 1, '1.70': 1 };
const appVerse = (key, v) => PAIRED[key] ? Math.ceil(v / 2) : v;

/* The app's hymns: Griffith's verses, the count every source is held to. */
function appHymns() {
  const out = {};
  for (let m = 1; m <= 10; m++) {
    const d = A.loadPart('rigveda', String(m).padStart(2, '0'));
    if (d.hymns.length !== COUNTS[m - 1]) throw new Error('veda: the app has ' + d.hymns.length + ' hymns in mandala ' + m);
    d.hymns.forEach(hy => { out[m + '.' + hy.h] = { m, h: hy.h, v: hy.v }; });
  }
  return out;
}

/* ------------------------------------------------------------- Sayana */
const SA_TITLE = (m, h) => 'ऋग्वेदः सूक्तं ' + DEV(m) + '.' + DEV(h);
const SA_PAGE = (m, h, revid) => 'https://sa.wikisource.org/w/index.php?title=' + encodeURIComponent(SA_TITLE(m, h).replace(/ /g, '_')) + '&oldid=' + revid;
function saUrl(revids) {
  const u = new URL('https://sa.wikisource.org/w/api.php');
  Object.entries({ action: 'query', prop: 'revisions', revids: revids.join('|'), rvprop: 'ids|sha1|content', rvslots: 'main',
    format: 'json', formatversion: '2', maxlag: '5' }).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}
const ACC = /[॒॑᳚᳑᳒]/;
function saKind(p) {
  const q = p.replace(/॥\s*[०-९\d]+\s*॥?\s*$/, ' ');        // the closing ॥N counts for neither
  const words = q.split(/\s+/).filter(w => w && w !== '।' && w !== '॥');
  const dandas = (q.match(/।/g) || []).length;
  const pada = words.length > 0 && (dandas / words.length > 0.45 || (p.length < 120 && /ऽ/.test(p) && dandas / words.length > 0.3));
  if (ACC.test(p) && !pada && p.length <= 300) return 'S';        // a long accented paragraph is prose quoting the verse
  return pada ? 'P' : 'C';
}
function saBody(wt) {
  const m = wt.match(/\{\{\s*सायणभाष्यम्\s*\|/);          // "{{सायणभाष्यम्|" or "{{सायणभाष्यम् |"
  if (!m) return null;
  const i = m.index;
  let d = 0, j = i;
  for (; j < wt.length; j++) {
    if (wt.startsWith('{{', j)) { d++; j++; } else if (wt.startsWith('}}', j)) { d--; j++; if (d === 0) break; }
  }
  return wt.slice(i + m[0].length, j - 1);
}
function saClean(s) {
  return s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1')
    .replace(/'''?/g, '').replace(/<[^>]+>/g, ' ').replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();
}
function saSplit(wt) {
  const body = saBody(wt);
  if (body === null) return null;
  const paras = body.split(/\n\s*\n/).map(p => p.trim())
    .filter(p => /[ऀ-ॿ]/.test(p))                       // not "Padapatha Devanagari Accented"
    .map(p => ({ p, k: saKind(p), n: (undev(p).match(/॥\s*(\d+)\s*॥?\s*$/) || [])[1] }));
  /* A verse's head is a run of samhita and pada paragraphs; the prose after it
     is the commentary. A dvipada head (1.65 to 1.70) carries two verses, one
     comment. Blocks keep the page's order: { nums (as printed), samhita, comm[] } */
  const out = { intro: [], blocks: [] };
  let cur = null, head = [];
  const close = () => {
    if (!head.length) return;
    const S = head.filter(y => y.k === 'S'), nums = head.filter(y => y.n).map(y => +y.n);
    const sNums = S.filter(y => y.n).map(y => +y.n);
    /* pada lines alone that repeat the verse in hand: moved there by a stray line */
    if (!S.length && cur && nums.every(n => cur.nums.includes(n))) { head = []; return; }
    if (nums.length) { cur = { nums: sNums.length ? sNums : [nums[0]], samhita: S.map(y => saClean(y.p)).join(' '), comm: [] }; out.blocks.push(cur); }
    head = [];
  };
  for (const x of paras) {
    if (x.k === 'S' || x.k === 'P') { head.push(x); continue; }
    close();
    const t = saClean(x.p);
    if (!t) continue;
    if (!cur) out.intro.push(t); else cur.comm.push(t);
  }
  close();
  return out;
}
/* Number the blocks: a printed number more than four past the last, or not
   past it, is a slip of the page (3.5 prints its last verse twice, once as
   "॥२५"); a block that repeats the one before is dropped; one that skips
   numbers covers them ("[10.90.1 to 10.90.4]": the page gives verses 2 to 4
   no block of their own and comments on them under 1). */
function saNumber(s) {
  const out = [], slips = [];
  let last = 0;
  for (const b of s.blocks) {
    const prev = out[out.length - 1];
    if (prev && b.samhita && b.samhita === prev.samhita) {
      if (b.comm.length) prev.comm.push(...b.comm);
      slips.push('a repeated block (printed ' + b.nums.join(', ') + ')');
      continue;
    }
    let a = Math.min(...b.nums), z = Math.max(...b.nums);
    if (!(a > last && a <= last + 4 && z - a < 4)) { slips.push('printed ' + b.nums.join(', ') + ' after ' + last); z = last + 1 + Math.max(0, Math.min(3, z - a)); a = last + 1; }
    if (prev && a > last + 1) prev.to = a - 1;
    out.push({ from: a, to: z, samhita: b.samhita, comm: b.comm.slice() });
    last = z;
  }
  return { segs: out, slips };
}
async function sayanaAll(h) {
  const keys = Object.keys(LOCK.sayana);
  const out = {};
  for (let i = 0; i < keys.length; i += 50) {
    const batch = keys.slice(i, i + 50), revids = batch.map(k => LOCK.sayana[k][0]);
    const file = 'veda-sayana-' + String(i / 50).padStart(2, '0') + '-' + sha1(revids.join(',')).slice(0, 10) + '.json';
    const j = JSON.parse(await load(h, saUrl(revids), file));
    const byRev = {};
    (j.query && j.query.pages || []).forEach(p => (p.revisions || []).forEach(r => { byRev[r.revid] = { title: p.title, content: r.slots.main.content, sha1: r.sha1 }; }));
    for (const k of batch) {
      const [revid, pin] = LOCK.sayana[k];
      const r = byRev[revid];
      if (!r) throw new Error('veda: Sayana ' + k + ': revision ' + revid + ' is not in ' + file);
      if (sha1(r.content) !== pin) throw new Error('veda: Sayana ' + k + ' (revision ' + revid + ') has sha1 ' + sha1(r.content) + ', the pin is ' + pin);
      const [m, hy] = k.split('.').map(Number);
      if (r.title !== SA_TITLE(m, hy)) throw new Error('veda: revision ' + revid + ' is "' + r.title + '", not ' + SA_TITLE(m, hy));
      const s = saSplit(r.content);
      if (!s) throw new Error('veda: Sayana ' + k + ' (revision ' + revid + ') has no {{सायणभाष्यम्}}');
      out[k] = { revid, intro: s.intro, ...saNumber(s) };
    }
  }
  return out;
}

/* ------------------------------------------------------------- Wilson */
const WILSON = [null,
  { id: 'rigvedasanhitc01wils', year: '1866, the second edition of the 1850 volume' },
  { id: 'rigvedasanhitc02wils', year: '1854' },
  { id: 'rigvedasanhitc03wils', year: '1857' },
  { id: 'rigvedasanhitc04wils', year: '1866', ed: 'E. B. Cowell' },
  { id: 'rigvedasanhitc05wils', year: '1888', ed: 'E. B. Cowell and W. F. Webster' },
  { id: 'rigvedasanhitc06wils', year: '1888', ed: 'W. F. Webster' }];
const BIG = 56;                    // x_size: the translation is set at 58 to 66, the notes and introductions at 41 to 54
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unent = s => s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] || m));
/* hOCR to lines: { leaf, par, x0, y0, xs, words: [{ x0, t }], text } in reading order */
function hocrLines(html) {
  const out = [];
  const starts = [];
  const pageRe = /<div class="ocr_page" id="page_(\d+)"/g;
  let m;
  while ((m = pageRe.exec(html))) starts.push([m.index, +m[1]]);
  let par = 0;
  starts.forEach(([at, leaf], i) => {
    const chunk = html.slice(at, i + 1 < starts.length ? starts[i + 1][0] : html.length);
    const re = /<p class="ocr_par"[^>]*>|<span class="ocr_line"[^>]*title="bbox (\d+) (\d+) (\d+) (\d+); x_size ([\d.]+)[^"]*"[^>]*>([\s\S]*?)<\/span>\s*(?=<span class="ocr_line"|<\/p>)/g;
    let x;
    while ((x = re.exec(chunk))) {
      if (x[0].startsWith('<p')) { par++; continue; }
      const words = [...x[6].matchAll(/<span class="ocrx_word"[^>]*title="bbox (\d+) \d+ \d+ \d+[^"]*"[^>]*>([^<]*)<\/span>/g)]
        .map(w => ({ x0: +w[1], t: unent(w[2]).trim() })).filter(w => w.t);
      if (!words.length) continue;
      out.push({ leaf, par, x0: +x[1], y0: +x[2], xs: +x[5], words, text: words.map(w => w.t).join(' ') });
    }
  });
  return out;
}
const HROMAN = /^[IVXLCYlHUTtrGgOo1|!\s]+$/;
function roman(s) {
  if (!s) return null;
  s = s.replace(/\s+/g, '').replace(/[Hh]/g, 'II').replace(/[Uu]/g, 'II').replace(/[GgOo]/g, 'C')
    .replace(/[Yy]/g, 'V').replace(/[l1|!Ttri]/g, 'I').toUpperCase().replace(/[^IVXLC]/g, '');
  if (!s) return null;
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let t = 0;
  for (let i = 0; i < s.length; i++) { const a = v[s[i]], b = v[s[i + 1]] || 0; t += a < b ? -a : a; }
  return t;
}
const W_INTRO = /^(The|This|In this)\s+(deit|Rishi|Riski|Kishi|Sukta|S\S{1,3}kta|hymn|Hymn|metre|first|second|third|author|R\S?shi)/;
const W_HEAD = /^[^A-Za-z0-9]*[SR^][^\s]{2,8}?\s*([IVXLYlHTtri1|!Uv]+(?:\s[IVXLYlTr]+)?)?\s?[.,]?\s*(?:[({]([^)}]{1,14})[)}]?)?(\s*\S{0,10}$|\s+MA\S+\.?\s+I\.?$)/;
/* Hymn headings, every volume in turn: "SUKTA ii. (NNN.)". The OCR garbles
   both the word (StfKTA, S6kta, SiJkta, ^<JKTA) and the numerals (Y for V,
   l or T for I, H or U for II, O or G for C), so within a mandala the
   headings are taken as the longest increasing run of their bracketed
   numbers (a clean numeral counts double), the unbracketed ones between two
   of those are numbered in order, and a hymn still missing is found by the
   one bracket between its neighbours that reads as its number, or by its
   introduction ("The deity is ..."). */
function wilsonAnchors(vols) {
  const segs = { 1: [] };
  let mandala = 1;
  vols.forEach((v, vi) => {
    if (!v) return;
    const L = v.lines;
    for (let i = 0; i < v.end; i++) {
      const t = L[i].text.trim();
      if (t.length > 48) continue;
      const tm = t.replace(/^M\s*A\s*N\s*\S{0,3}\s*A\s*L\s*A/, 'MANDALA');
      let m = tm.match(/^MA\S{0,4}ALA\.?\s+([IVXYL1l]+)\b/);
      if (m && !/KTA/i.test(t)) { const n = roman(m[1]); if (n === mandala + 1) { mandala = n; segs[n] = []; } continue; }
      m = t.match(W_HEAD);
      if (!m) continue;
      const sw = t.replace(/^[^A-Za-z0-9^]*/, '').slice(0, 8);
      const isS = /^[SR^]\S{0,4}(?:[kKxX]\S?[tT][aA]|icta|kta)/i.test(sw);
      const par = m[2] && HROMAN.test(m[2].replace(/\.$/, '')) ? m[2].replace(/\.$/, '') : null;
      if (!isS && !(par && /^S/.test(sw))) continue;
      const abs = par ? roman(par) : null;
      if (abs === 1 && roman(m[1]) === 1 && mandala < 10 && segs[mandala].length >= COUNTS[mandala - 1] - 5) { mandala++; segs[mandala] = []; }
      segs[mandala].push({ vol: vi, i, abs: abs && abs <= COUNTS[mandala - 1] ? abs : null, clean: !!par && /^[IVXLC]+$/.test(par.replace(/\s/g, '')), local: roman(m[1]), noPar: !par });
    }
  });
  const out = {}, missing = [];
  for (let M = 1; M <= 10; M++) {
    const c = segs[M] || [], N = COUNTS[M - 1];
    let seenPar = false;               // the first anuvaka prints no bracket: its local number is the hymn's
    for (const x of c) { if (!x.noPar && x.abs > 1) seenPar = true; if (!seenPar && x.abs === null && x.local) { x.abs = x.local; x.clean = x.local === 1; } }
    const n = c.length, best = new Array(n).fill(0), prev = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (c[i].abs === null) continue;
      const w = c[i].clean ? 2 : 1;
      best[i] = w;
      for (let j = 0; j < i; j++) if (c[j].abs !== null && c[j].abs < c[i].abs && best[j] + w > best[i]) { best[i] = best[j] + w; prev[i] = j; }
    }
    let bi = n ? best.indexOf(Math.max(...best)) : -1;
    const chosen = new Set();
    while (bi >= 0) { chosen.add(bi); bi = prev[bi]; }
    const val = new Array(n).fill(null);
    for (const i of chosen) val[i] = c[i].abs;
    const an = [-1, ...[...chosen].sort((a, b) => a - b), n];
    for (let k = 0; k < an.length - 1; k++) {
      const a = an[k], b = an[k + 1], va = a < 0 ? 0 : val[a], vb = b >= n ? N + 1 : val[b], between = b - a - 1;
      if (between > 0 && between === vb - va - 1) for (let t = 1; t <= between; t++) val[a + t] = va + t;
    }
    const got = {};
    c.forEach((x, i) => { if (val[i] !== null) got[val[i]] = { vol: x.vol, i: x.i }; });
    for (let h = 1; h <= N; h++) {
      if (got[h] || (M === 8 && VALAKHILYA(h))) continue;
      let a = h - 1; while (a > 0 && !got[a]) a--;
      let b = h + 1; while (b <= N && !got[b]) b++;
      if (!got[a] || !got[b] || got[a].vol !== got[b].vol) continue;
      const L = vols[got[a].vol].lines;
      /* one short line between the neighbours whose bracket reads as h */
      const br = [];
      for (let i = got[a].i + 1; i < got[b].i; i++) {
        const t = L[i].text.trim(), q = t.match(/[({]([IVXLCYlHUTtrGgOo1|!ivxc\s]{1,14})\.?[)}]/);
        if (t.length <= 40 && q && roman(q[1]) === h) br.push(i);
      }
      if (br.length === 1 && b - a === 2) { got[h] = { vol: got[a].vol, i: br[0], how: 'bracket' }; continue; }
      const ic = [];
      for (let i = got[a].i + 1; i < got[b].i - 1; i++) if (W_INTRO.test(L[i].text.trim()) && L[i - 1].text.trim().length < 40) ic.push(i - 1);
      if (ic.length === b - a - 1) ic.forEach((i, k) => { got[a + 1 + k] = { vol: got[a].vol, i, how: 'introduction' }; });
    }
    for (let h = 1; h <= N; h++) {
      if (M === 8 && VALAKHILYA(h)) continue;
      if (got[h]) out[M + '.' + h] = got[h]; else missing.push(M + '.' + h);
    }
  }
  return { anchors: out, missing };
}

/* A volume: its hOCR lines on the book's own pages (the scan repeats a few
   leaves, 56 and 57 in vol. 1 among them, which the page list leaves out),
   and where the translation ends (the index of Suktas; Appendix I of vol. 5,
   the Valakhilya, is Cowell's own and not Sayana's). */
async function wilsonLoad(h, n) {
  const id = WILSON[n].id;
  const html = await iaFile(h, id, id + '_hocr.html', 'veda-' + id + '_hocr.html');
  const pages = JSON.parse(await iaFile(h, id, id + '_page_numbers.json', 'veda-' + id + '_page_numbers.json')).pages;
  const idx = {};
  pages.forEach((p, i) => { idx[p.leafNum] = i; });
  const lines = hocrLines(html).filter(l => idx[l.leaf] !== undefined);
  let end = lines.findIndex(l => /^\s*INDEX\s+OF\s+THE\s+S/.test(l.text));
  if (end < 0) end = lines.length;
  const app = lines.findIndex(l => /^\s*APPENDIX\s+I\.?\s*$/.test(l.text));
  if (app > 0 && app < end) end = app;
  return { lines, end, idx };
}

/* Page furniture: running heads ("FIRST ASHTAKA — FIRST ADHYAYA. 5",
   "RIG-VEDA SANHITA."), section heads (ANUVAKA, ADHYAYA, MANDALA), page
   numbers, the other page's edge caught in the scan (lines far right of the
   column) and specks. */
const W_FURN = /A\S{0,2}SH\S{0,2}T\S{0,2}KA|AD\S{0,2}H?Y\S{0,2}YA|SAN\S{0,2}H?I\S{0,2}T|AN\S{0,2}[UV]\S{0,2}V\S{0,2}KA|MA\S{0,3}ALA\b|^\W*INDEX\b/;   // set in capitals: "Mandala" in a note is text
function wFurniture(lines, end) {
  const byLeaf = {};
  lines.forEach((l, i) => { if (i < end) (byLeaf[l.leaf] = byLeaf[l.leaf] || []).push(i); });
  const furn = new Array(lines.length).fill(false);
  for (const idx of Object.values(byLeaf)) {
    const xs = idx.filter(i => lines[i].text.length >= 40).map(i => lines[i].x0).sort((a, b) => a - b);
    const med = xs.length ? xs[xs.length >> 1] : 0;
    for (const i of idx) {
      const t = lines[i].text, letters = (t.match(/[A-Za-z]/g) || []).length, up = (t.match(/[A-Z]/g) || []).length;
      if (letters < 3 || (xs.length && lines[i].x0 > med + 900)
        || (t.length < 60 && W_FURN.test(t))
        || (t.length < 40 && up >= 4 && up / letters > 0.75)) furn[i] = true;
    }
  }
  return furn;
}
/* A verse line's first word, less the marginal "Varga xiv." set beside it.
   "Varga", as the OCR reads it (Vargai., Yargaii., Vareaii., Var?a), never Varuna or various */
const VARGA = /^[VY]ar(?![uiy])[a-z?]{1,3}[ivxlcynIVXLC.]*$/;
const MARGIN_NUM = /^[ivxlcyn]{2,7}\.$/i;              // a Varga's number set alone in the margin ("xxxv.")
function wLead(l, margin) {
  let k = 0;
  if (margin !== undefined && l.x0 < margin - 30) {             // marginalia to the left of the column, however garbled
    while (k < l.words.length && l.words[k].x0 < margin - 10) k++;
    if (k >= l.words.length) k = 0;
  } else if (VARGA.test(l.words[0].t)) { k = 1; if (l.words[1] && l.words[1].t.length <= 8 && /\.$/.test(l.words[1].t) && !/^\d/.test(l.words[1].t)) k = 2; }
  else if (margin !== undefined && MARGIN_NUM.test(l.words[0].t) && l.words[0].x0 < margin - 30 && l.words.length > 1) k = 1;
  return k < l.words.length ? k : 0;
}
/* where the line's text starts: the line's box, or the first word after the marginal Varga */
const wX = (l, margin) => { const k = wLead(l, margin); return k ? l.words[k].x0 : l.x0; };
function wText(t) {
  return t.replace(/\s+[VY]ar(?![uiy])[a-z?]{1,3}\S{0,8}(\s+[ivxlcyIVXLCn]{1,8}\.?)?\s*$/, '')
    .replace(/^\s*[VY]ar(?![uiy])[a-z?]{1,3}\S{0,8}(\s+[ivxlcyIVXLCn]{1,8}\.)?\s+/, '')
    .replace(/^\s*[ivxlcyn]{2,7}\.\s+(?=[0-9lIOS]{1,3}[.,*'"]\s)/i, '');
}
/* Note marks set in the verse: a letter or figure after the punctuation
   (",a" ".d" ",6"), a figure or sign against the word ("wealth3", "Agni,*",
   "Narasansa/"), a quote after the punctuation (',"'). Each is returned with
   its place in the page's sequence when the OCR kept it: the letter in the
   lettered volumes (a is 1), the figure in the numbered ones; else null. */
const W_NOTE_MARK = /^\s*(?:[a-hA-H]|\d{1,2}|[*^°§†‡'"‘’“”/]{1,2})\s+\S/;
function wMarks(t, lettered) {
  const out = [];
  const ws = t.split(/\s+/);
  ws.forEach((w, i) => {
    const m = w.match(/^(.*?[A-Za-z])([)\],.;:!?]*)([*^°§†‡/'"‘’“”0-9a-h]{1,3})$/);
    if (m) {
      const [, , punct, mk] = m;
      if (/^[a-h]$/.test(mk)) { if (punct) out.push(lettered ? mk.charCodeAt(0) - 96 : null); return; }
      if (/^[a-h]+$/.test(mk)) return;                                   // an ordinary word
      if (/^\d{1,2}$/.test(mk)) { out.push(lettered ? null : +mk); return; }
      if (/^['"‘’“”]+$/.test(mk) && !punct) return;                     // a closing quote
      out.push(null);
      return;
    }
    if (i && /^[)\],.;:!?]*[*^°§†‡'"’”]{1,3}$/.test(w) && /[A-Za-z]/.test(ws[i - 1])) out.push(null);   // "wind ;*"
  });
  return out;
}
const pctl = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
function joinLines(ls) {
  return ls.map(s => s.trim()).filter(Boolean).reduce((acc, s) => {
    if (!acc) return s;
    return /[a-z]-$/.test(acc) && /^[a-z]/.test(s) ? acc.slice(0, -1) + s : acc + ' ' + s;
  }, '').replace(/\s+/g, ' ').trim();
}
const wClean = t => t.replace(/([A-Za-z)\]][,.;:!?])[a-h0-9]{1,2}(?=\s|$)/g, '$1').replace(/([A-Za-z][,.;:!?)]?)[*^°§†‡/]+(?=\s|$)/g, '$1')
  .replace(/([a-z]{2,}[,.;:!?)]?)\d{1,2}(?=\s|$)/g, '$1').replace(/\s[*^°§†‡](?=\s)/g, '').replace(/\s+/g, ' ').trim();

/* One volume's hymns: introduction, verses (numbered against the expected
   count), and the notes, given to verses page by page. */
function wilsonVolume(vol, v, keys, anchors, expect) {
  const L = v.lines, furn = wFurniture(L, v.end);
  keys.forEach(k => { const i = anchors[k].i; furn[i] = true; });
  /* the hymn each line belongs to */
  const owner = new Array(L.length).fill(null);
  keys.forEach((k, n) => { const a = anchors[k].i, z = n + 1 < keys.length ? anchors[keys[n + 1]].i : v.end; for (let i = a; i < z; i++) owner[i] = k; });
  /* margins per page, for big and small type */
  const marg = {};
  L.forEach((l, i) => {
    if (furn[i] || l.text.length < 8 || i >= v.end) return;
    const m = marg[l.leaf] = marg[l.leaf] || { big: [], small: [] };
    (l.xs >= BIG ? m.big : m.small).push(wX(l));
  });
  /* the left edge most lines keep (flush, not indented), the leftmost on a tie */
  const edge = xs => {
    if (!xs.length) return 0;
    const b = {};
    xs.forEach(x => { const k = Math.round(x / 15); b[k] = (b[k] || 0) + 1; });
    const top = Math.max(...Object.values(b));
    const k = Math.min(...Object.keys(b).map(Number).filter(q => b[q] === top));
    return pctl(xs.filter(x => Math.abs(x / 15 - k) <= 1), 0.5);
  };
  for (const m of Object.values(marg)) { m.b = edge(m.big); m.s = edge(m.small); }
  const out = {};
  keys.forEach(k => out[k] = { vol, leaf: L[anchors[k].i].leaf, intro: [], verses: [], notes: [], problems: [] });
  /* introductions: the small lines right after the heading (set with a
     hanging indent), up to the first verse line or the first note (an
     indented paragraph opening with its mark, "a ", "1 ", "* ") */
  const intro = new Set();
  keys.forEach(k => {
    let lastPar = -1;
    for (let i = anchors[k].i + 1; i < L.length && owner[i] === k; i++) {
      if (furn[i]) continue;
      const l = L[i];
      if (l.xs >= BIG) break;
      const m = marg[l.leaf] || { s: l.x0 };
      if (l.par !== lastPar && lastPar !== -1 && l.x0 - m.s >= 20 && W_NOTE_MARK.test(l.text)) break;
      intro.add(i); out[k].intro.push(l.text); lastPar = l.par;
    }
  });
  /* verses */
  const label = new Array(L.length).fill(null);
  keys.forEach(k => {
    const N = expect[k];
    const big = [];
    for (let i = anchors[k].i + 1; i < L.length && owner[i] === k; i++) if (!furn[i] && L[i].xs >= BIG) big.push(i);
    const starts = [];
    big.forEach((i, j) => {
      const l = L[i], m = marg[l.leaf] || { b: l.x0 }, w = l.words[wLead(l, m.b)].t;
      const indent = wX(l, m.b) - m.b;
      const nm = w.match(/^([0-9lIOS]{1,3})[.,*'"]$/);
      const num = nm ? +nm[1].replace(/[lI]/g, '1').replace(/O/g, '0').replace(/S/g, '5') : null;
      const first = j === 0 || L[big[j - 1]].par !== l.par;
      if ((indent >= 25 && indent < 400) || (num !== null && first) || j === 0) starts.push({ j, num });
    });
    if (!big.length) { out[k].problems.push('no verse lines found'); return; }
    /* each opening is a verse or runs on (an indented line inside a verse):
       the best numbering 1..N, a read number agreeing scoring highest */
    const K = starts.length, NEG = -1e9;
    const dp = Array.from({ length: K + 1 }, () => new Array(N + 1).fill(NEG)), from = Array.from({ length: K + 1 }, () => new Array(N + 1).fill(null));
    dp[0][0] = 0;
    for (let i = 0; i < K; i++) for (let v0 = 0; v0 <= N; v0++) {
      if (dp[i][v0] === NEG) continue;
      const num = starts[i].num;
      if (v0 > 0) { const sc = dp[i][v0] + (num === null ? 0 : -3); if (sc > dp[i + 1][v0]) { dp[i + 1][v0] = sc; from[i + 1][v0] = [v0, null]; } }
      for (let a = v0 + 1; a <= Math.min(N, v0 + 4); a++) {
        const sc = dp[i][v0] - (a - v0 - 1) * 2 + (num === a ? 3 : num === null ? 1 : -2);
        if (sc > dp[i + 1][a]) { dp[i + 1][a] = sc; from[i + 1][a] = [v0, a]; }
      }
    }
    let bv = 0;
    for (let v0 = 1; v0 <= N; v0++) if (dp[K][v0] - (N - v0) * 2 > dp[K][bv] - (N - bv) * 2) bv = v0;
    const assign = new Array(K).fill(null);
    for (let i = K, v0 = bv; i > 0; i--) { const [pv, a] = from[i][v0]; assign[i - 1] = a; v0 = pv; }
    const segs = [];
    let last = 0;
    starts.forEach((s, n) => {
      const a = assign[n];
      if (a === null) return;
      if (segs.length && a > last + 1) segs[segs.length - 1].to = a - 1;
      segs.push({ from: a, to: a, j: s.j });
      last = a;
    });
    if (!segs.length) { out[k].problems.push('no verse openings found'); return; }
    if (last < N) { segs[segs.length - 1].to = N; out[k].problems.push('verses ' + (last + 1) + ' to ' + N + ' not found apart'); }
    const gaps = segs.filter(s => s.to > s.from);
    if (gaps.length) out[k].problems.push('run together: ' + gaps.map(s => s.from + ' to ' + s.to).join(', '));
    segs.forEach((s, n) => {
      const idx = big.slice(s.j, n + 1 < segs.length ? segs[n + 1].j : big.length);
      idx.forEach(i => { label[i] = { k, from: s.from, to: s.to }; });
      const lineText = i => { const l = L[i], m = marg[l.leaf]; return wText(l.words.slice(wLead(l, m ? m.b : undefined)).map(w => w.t).join(' ')); };
      const text = joinLines(idx.map(lineText)).replace(/^([0-9lIOSL]{1,3})[.,*'"]?\s+(?=\S)/, '');
      out[k].verses.push({ from: s.from, to: s.to, text: wClean(text), leaf: L[idx[0]].leaf });
    });
  });
  /* Notes, page by page. A page's notes are lettered (vols. 1 to 3) or
     numbered (4 to 6) from a or 1, in the order of their marks in the verse
     text above them. Where the marks the OCR kept are as many as the notes,
     the n-th note goes to the n-th mark's verse; otherwise a mark whose letter
     or figure survived pins its note, and a note left between two pinned ones
     is given the verses between them ("[1.17.1 to 1.17.4]"). */
  const lettered = vol <= 3;
  const pages = {};
  const introLb = {};
  keys.forEach(k => { introLb[k] = { k, from: 0, to: 0 }; });
  L.forEach((l, i) => {
    if (i >= v.end || furn[i] || owner[i] === null) return;
    const p = pages[l.leaf] = pages[l.leaf] || { marks: [], vseq: [], notes: [] };
    if (l.xs >= BIG || intro.has(i)) {
      const lb = intro.has(i) ? introLb[owner[i]] : label[i];     // a note on the introduction is the hymn's
      if (!lb) return;
      if (!p.vseq.length || p.vseq[p.vseq.length - 1] !== lb) p.vseq.push(lb);
      for (const ord of wMarks(wText(l.text), lettered)) p.marks.push({ lb, ord });
      return;
    }
    const m = marg[l.leaf] || { s: l.x0 };
    if (p.lastPar !== l.par) p.notes.push({ lines: [l.text], opens: l.x0 - m.s >= 20, k: owner[i] });
    else p.notes[p.notes.length - 1].lines.push(l.text);
    p.lastPar = l.par;
  });
  /* a note carried over the page (its first paragraph there has no indent)
     goes on where the last one went */
  let carry = [], lastLb = null;
  const stats = { pages: 0, byCount: 0, pinned: 0, ranged: 0 };
  const put = (lbs, text, leaf, exact) => {
    const made = [];
    const hymns = [...new Set(lbs.map(x => x.k))];
    hymns.forEach(k => {
      const mine = lbs.filter(x => x.k === k);
      const o = { from: Math.min(...mine.map(x => x.from)), to: Math.max(...mine.map(x => x.to)), text, leaf, exact: exact && hymns.length === 1, other: hymns.length > 1 ? hymns.filter(x => x !== k) : null };
      out[k].notes.push(o);
      made.push(o);
    });
    return made;
  };
  for (const leaf of Object.keys(pages).map(Number).sort((a, b) => a - b)) {
    const p = pages[leaf];
    const notes = [];
    for (const n of p.notes) {
      const text = joinLines(n.lines);
      if (!n.opens && notes.length) { notes[notes.length - 1].text = joinLines([notes[notes.length - 1].text, text]); continue; }
      if (!n.opens && carry.length) { carry.forEach(t => { t.text = joinLines([t.text, text]); }); continue; }
      notes.push({ text, leaf, k: n.k });
    }
    if (p.vseq.length) lastLb = p.vseq[p.vseq.length - 1];
    if (!notes.length) continue;
    stats.pages++;
    const K = notes.length, M = p.marks;
    const pin = new Array(K).fill(null);
    if (M.length === K && M.every((x, n) => x.ord === null || x.ord === n + 1)) { M.forEach((x, n) => { pin[n] = x.lb; }); stats.byCount++; }
    else {
      /* the marks whose letter or figure survived, in increasing order */
      let lastOrd = 0;
      for (const x of M) if (x.ord !== null && x.ord > lastOrd && x.ord <= K) { pin[x.ord - 1] = x.lb; lastOrd = x.ord; }
    }
    const vseq = p.vseq.length ? p.vseq : (lastLb ? [lastLb] : [{ k: notes[0].k, from: 1, to: 1 }]);
    carry = [];
    notes.forEach((n, x) => {
      if (pin[x]) { carry = put([pin[x]], n.text, leaf, true); if (M.length !== K) stats.pinned++; return; }
      let a = x - 1; while (a >= 0 && !pin[a]) a--;
      let z = x + 1; while (z < K && !pin[z]) z++;
      const ia = a >= 0 ? vseq.indexOf(pin[a]) : 0, iz = z < K ? vseq.indexOf(pin[z]) : vseq.length - 1;
      const span = vseq.slice(Math.max(0, ia), Math.max(ia, iz) + 1);
      carry = put(span.length ? span : vseq, n.text, leaf, span.length === 1);
      stats.ranged += span.length === 1 ? 0 : 1;
    });
  }
  return { hymns: out, stats };
}

/* ----------------------------------------------------- Griffith's notes */
const GRIFFITH = [
  { id: 'in.ernet.dli.2015.104118', name: '2015.104118.Hymns-Of-The-Rigveda-Voli_djvu.txt', vol: 1, year: '1896', books: [1, 6] },
  { id: 'in.ernet.dli.2015.104119', name: '2015.104119.Hymns-Of-The-Rigveda-Volii_djvu.txt', vol: 2, year: '1897', books: [7, 10] }];
const letters = s => String(s).toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
/* running heads ("2 THE HYMNS OF [BOOK I.", "HYMN 164.] THE RIGVEDA. 293", as
   the OCR mangles them: "TILE HYMNS OP", "THE R1GVEDA", "RIG Y ETA") */
const G_FURN = /^\s*(\d{1,3}\s+)?T\S{1,3}\s+H\S{3,5}\s+O[FP]\b|^\s*(\d{1,3}\s+)?T\S{1,3}\s+\S{4,7}\s+O[FP]\s*\[|T\S{1,3}\s+\S{0,3}[IGR1]{1,3}\s?[VY]\s?\S{1,2}[DT]\S{0,2}A\s*\.?\s*[\d\]]*\s*$|^\s*HYMN\s+\d+\.\S?\s*$|^\s*\[?\s*BOOK\s+[IVXL1t]+\.?\s*$|^\s*[[(]?\s*V\s?[AĀ]\s?LA/i;
const G_NOTE = /^\s*[‘'"*^]?\s*([0-9]{1,3}|[lI])\s+([^:]{1,90}?)\s*:/;
/* One volume: each hymn found by the first words of its first verse (the
   app's text is this edition's), its verse lines known by the app's words,
   and every other line a note: "N Word: gloss" opens one, a line without a
   number carries it on; notes for the hymn before can follow a heading on
   the same page, so a note goes to the hymn whose verse N holds its lead
   word, or else to the hymn still collecting notes in order. */
function griffithVolume(text, hymns) {
  let L = text.split(/\r?\n/).map(s => s.replace(/\s+$/, '')).filter(s => s.trim());
  /* the hymns end where the appendices and the index of hymns begin (the
     index quotes each hymn's first words) */
  const firstBook = L.findIndex(l => /BOOK\s+THE\s+\S+/.test(l));
  const stop = L.findIndex((l, i) => i > firstBook && /^\s*(APPENDIX\s+I\b|INDEX\s+OF\s+H)/.test(l));
  if (stop > 0) L = L.slice(0, stop);
  const N = L.map(letters);
  const out = {}, problems = [];
  const shingles = (t, k) => { const o = []; for (let i = 0; i + k <= t.length; i += 2) o.push(t.slice(i, i + k)); return o; };
  const share = (t, vtext) => { const sh = shingles(t, 6); if (!sh.length) return vtext.indexOf(t) >= 0 ? 1 : 0; return sh.filter(x => vtext.indexOf(x) >= 0).length / sh.length; };
  const inText = (t, vtext) => share(t, vtext) >= 0.5;
  /* every "HYMN <n>." heading, in order (the OCR misreads some numbers, so
     a hymn is known by the first verse under its heading, not the number) */
  const heads = [];
  L.forEach((l, i) => { if (/^\s*[‘'"]?\s*HYMN\s+[IVXLCYl1T]+\s?[.,:]?/i.test(l) && l.length < 60) heads.push(i); });
  let hp = 0;
  const starts = [];
  for (const hy of hymns) {
    if (!hy.v.length) { out[hy.key] = { notes: [], missing: 'the app prints no verses' }; continue; }
    const v1 = letters(hy.v[0]).slice(0, 60);
    let found = -1;
    for (let q = hp; q < Math.min(heads.length, hp + 12) && found < 0; q++) {
      const under = N.slice(heads[q], heads[q] + 5).join('');
      if (share(v1, under) >= 0.5) found = q;
    }
    if (found >= 0) { starts.push({ key: hy.key, li: heads[found], hy }); hp = found + 1; continue; }
    /* the heading lost to the OCR: the first verse itself, before the next heading found */
    const from = starts.length ? starts[starts.length - 1].li + 1 : 0, to = Math.min(L.length - 1, from + 1500, hp + 3 < heads.length ? heads[hp + 3] : L.length - 1);
    let li = -1;
    for (let i = from; i < to && li < 0; i++) if (N[i].length >= 12 && share(v1.slice(0, 40), N[i] + (N[i + 1] || '')) >= 0.6) li = i;
    if (li < 0) { problems.push(hy.key); out[hy.key] = { notes: [], missing: 'not found in the scan' }; continue; }
    starts.push({ key: hy.key, li, hy });
    while (hp < heads.length && heads[hp] <= li) hp++;
  }
  const notes = [];
  starts.forEach((s, n) => {
    const end = n + 1 < starts.length ? starts[n + 1].li : L.length;
    const vtext = letters(s.hy.v.join(' '));
    const prevText = n ? letters(starts[n - 1].hy.v.join(' ')) : '';
    s.notes = [];
    for (let i = s.li; i < end; i++) {
      const raw = L[i], t = N[i];
      if (G_FURN.test(raw) || /^\s*[‘'"]?\s*H\S{2,3}\s+[IVXLCYT1l ]+\s?[.,]/.test(raw) || t.length < 3) continue;
      const num = raw.match(/^\s*[‘'"*^]?\s*([0-9]{1,3})\s+(?=\S)/);
      const body = num ? letters(raw.slice(num[0].length)) : t;
      const m = raw.match(G_NOTE);
      /* a numbered line reading like a note ("N Word: gloss") is a note even
         where its lead words come from the verse */
      const sv = Math.max(share(body, vtext), prevText && i - s.li < 60 ? share(body, prevText) : 0);
      if (sv >= 0.7 || (!m && sv >= 0.5)) continue;                          // a verse line
      if (m) notes.push({ region: n, v: m[1] === 'l' || m[1] === 'I' ? 1 : +m[1], lemma: m[2], lines: [raw.trim()] });
      else if (num && +num[1] >= 1 && +num[1] <= 60 && /^\s*\S+\s+[A-Z‘'"(]/.test(raw)) notes.push({ region: n, v: +num[1], lemma: raw.slice(num[0].length).split(/\s+/).slice(0, 4).join(' '), lines: [raw.trim()] });
      else if (notes.length && notes[notes.length - 1].region >= n - 1) notes[notes.length - 1].lines.push(raw.trim());
      else notes.push({ region: n, v: null, lemma: '', lines: [raw.trim()] });
    }
  });
  /* give each note its hymn: the one (this region's or the one before) whose
     verse N holds the note's lead word; else the one before while it is
     still collecting notes in order and this region has none yet */
  const lastV = {}, has = {};
  let open = -1;
  for (const nt of notes) {
    /* a short hymn can sit whole on a page, so the notes of the three
       hymns before may still come under this one's heading */
    const cands = [nt.region - 3, nt.region - 2, nt.region - 1, nt.region].filter(r => r >= 0 && r >= open);
    /* the verse of hymn r that holds the note's lead words: its own number
       first, else (the OCR reads 3 as 8) any verse that holds them whole */
    const fits = r => {
      const hy = starts[r].hy, v = nt.v;
      if (v === null) return 0;
      const lw = letters(nt.lemma);
      if (v >= 1 && v <= hy.v.length) {
        const vt = letters(hy.v[v - 1]);
        if (lw.length >= 3 && vt.indexOf(lw.slice(0, 12)) >= 0) return v;
        const sh = shingles(lw.slice(0, 24), 4);
        if (sh.length >= 2 && sh.filter(x => vt.indexOf(x) >= 0).length / sh.length >= 0.6) return v;
      }
      if (lw.length >= 10) { const j = hy.v.findIndex(t => letters(t).indexOf(lw.slice(0, 16)) >= 0); if (j >= 0) return j + 1; }
      return 0;
    };
    let r = cands.find(c => fits(c));
    if (r !== undefined) nt.v = fits(r);
    else {
      r = cands.find(c => c < nt.region && nt.v !== null && nt.v > (lastV[c] || 0) && nt.v <= starts[c].hy.v.length
        && !cands.some(d => d > c && has[d]));
      if (r === undefined) r = nt.region;
    }
    open = Math.max(open, r);
    if (nt.v !== null) lastV[r] = nt.v;
    has[r] = true;
    starts[r].notes.push(nt);
  }
  for (const s of starts) {
    out[s.key] = { notes: s.notes.map(nt => ({ v: nt.v, text: joinLines(nt.lines) })) };
  }
  return { hymns: out, problems };
}

/* --------------------------------------------------------------- Yaska */
const SARUP = { id: 'nighantuniruktao00yask', name: 'nighantuniruktao00yask_djvu.txt' };
const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth',
  'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth'];
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50 }, TENTHS = { twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50 };
function lev(a, b) {
  const d = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } }
  return d[b.length];
}
function nearest(w, table, div) {
  let best = null, bd = 99, second = 99;
  for (const [k, v] of table) { const x = lev(w, k); if (x < bd) { second = bd; bd = x; best = v; } else if (x < second) second = x; }
  return bd <= Math.max(1, Math.floor(w.length / div)) && second > bd ? best : null;
}
/* "(Here ends the eighteenth section.)", the ordinal as the OCR left it
   ("sectloti", "ttveittieih", "Uveniy -first", "tv:eidy-ei(jJdh") */
function ordinal(s) {
  const ws = s.toLowerCase().replace(/[^a-z\- ]/g, '').split(/[- ]+/).filter(Boolean);
  const units = ORD.map((w, i) => [w, i]).slice(1);
  if (ws.length === 1) return nearest(ws[0], units.concat(Object.entries(TENTHS)), 3);
  if (ws.length >= 2) { const t = nearest(ws.slice(0, -1).join(''), Object.entries(TENS), 2), u = nearest(ws[ws.length - 1], units.slice(0, 9), 3); return t && u ? t + u : null; }
  return null;
}
/* the ordinal of a section's end line, or undefined if the line is not one */
function sectionEnd(l) {
  const m = l.match(/Here\s+ends\s+t\S{1,3}\s+(.+)$/);
  if (!m) return undefined;
  const ws = m[1].trim().split(/\s+/);
  while (ws.length > 1 && /^([.(\[{]?s\S*|to|a\.?\)?|\S*ion\S*|\S*ioa\S*|\S*[)}\]]|[.,:;]+)$/i.test(ws[ws.length - 1])) ws.pop();
  return ordinal(ws.join(' '));
}
/* Sarup's list of the Rig Veda's stanzas quoted in the Nirukta, in the order
   of the Samhita: pairs of lines "hymn. stanza" / "chapter. section", the
   mandala changing where the hymn numbers start again (an unreadable pair is
   dropped; the Book headings are too garbled to trust) */
function sarupList(L) {
  const a = L.findIndex(l => /LIST\s+OF\s+QUOTATIONS\s+OCCURRING\s+IN\s+THE/.test(l));
  const z = L.findIndex((l, i) => i > a && /Atharva\s+Veda/.test(l));
  if (a < 0 || z < 0) throw new Error('veda: Sarup’s list of quotations not found');
  const nums = [];
  for (const raw of L.slice(a, z)) {
    const l = raw.trim().replace(/G/g, '6').replace(/[Il]/g, '1').replace(/O/g, '0').replace(/\*/g, '');
    const m = l.match(/^(\d{1,3})\s*[.,]?\s+(\d{1,3})(?:\s*[-–]\s*\d+)?\s*(?:;.*)?$/) || l.match(/^(\d{1,3})\.(\d{1,3})$/);
    if (m) nums.push([+m[1], +m[2]]);
  }
  const map = {};
  let M = 1, lastH = 0, dropped = 0;
  for (let i = 0; i + 1 < nums.length;) {
    const [h, v] = nums[i], [c, s] = nums[i + 1];
    if (!(c >= 1 && c <= 14 && s >= 1 && s <= 50)) { i++; dropped++; continue; }
    if (h < lastH - 20 && M < 10) M++;
    if (h > COUNTS[M - 1]) { i++; dropped++; continue; }
    lastH = h;
    (map[M + '.' + h + '.' + v] = map[M + '.' + h + '.' + v] || []).push(c + '.' + s);
    i += 2;
  }
  return { map, dropped };
}
/* Sarup's English, chapter by chapter ("CHAPTER I" to "CHAPTER XII", up to
   his exegetical notes): a section runs to its "(Here ends the n-th
   section.)"; it is cut only where that line and the one before it both
   read cleanly. Each page's head carries its first and last sections
   ("[7.17" ... "7.21]") beside the printed page number, which says where
   a section that is not cut can be read. */
function sarupSections(L) {
  const a = L.findIndex((l, i) => /^\s*CHAPTER\s+I\s*$/.test(l) && L.slice(Math.max(0, i - 6), i).some(x => /THE\s+NIRUKTA/.test(x)));
  const z = L.findIndex((l, i) => i > a && /EXEGETICAL\s+AND\s+CRITICAL\s+NOTES/.test(l));
  if (a < 0 || z < 0) throw new Error('veda: Sarup’s translation not found');
  /* chapters: the "CHAPTER <n>" headings (the OCR lost VIII's), or a marker
     that counts from one again; per chapter the end markers, read or not */
  const chapters = [];
  let cur = null;
  const heads = [], nums = [];
  for (let i = a; i < z; i++) {
    const l = L[i];
    if (/^\s*CHAPTER\s+[IVXL1]+\s*\]?\s*$/.test(l)) { cur = { start: i, marks: [] }; chapters.push(cur); continue; }
    if (/^\s*\d{1,3}\s*$/.test(l)) { nums.push({ i, n: +l.trim() }); continue; }
    const hd = l.match(/^\s*\[\s*(\d{1,2})\s*[.,]\s*([0-9lI]{1,2})\s*$/);
    if (hd) { heads.push({ ch: +hd[1], sec: +hd[2].replace(/[lI]/g, '1'), i }); continue; }
    const n = sectionEnd(l);
    if (n === undefined || !cur) continue;
    const last = cur.marks.length ? cur.marks[cur.marks.length - 1] : null;
    if (n !== null && n <= 2 && cur.marks.length >= 10) { cur = { start: last.i, marks: [] }; chapters.push(cur); }
    cur.marks.push({ i, n });
  }
  const SECS = [0, 20, 28, 22, 27, 28, 36, 31, 22, 43, 47, 50, 46];     // the sections of chapters 1 to 12 (as numbered in Sarup's text)
  const secs = {};
  chapters.forEach((c, ci) => {
    const ch = ci + 1, K = SECS[ch] || 0, M = c.marks;
    if (M.length === K) M.forEach((mk, x) => { mk.n = x + 1; });           // every marker there: count them
    else {
      /* an unread marker between two read ones takes the number between them,
         when the count of markers agrees */
      const known = [{ x: -1, n: 0 }].concat(M.map((mk, x) => ({ x, n: mk.n })).filter(k => k.n !== null));
      for (let k = 0; k + 1 < known.length; k++) {
        const p = known[k], q = known[k + 1];
        if (q.n - p.n === q.x - p.x) for (let x = p.x + 1; x < q.x; x++) M[x].n = p.n + (x - p.x);
      }
    }
    M.forEach((mk, x) => {
      if (mk.n === null) return;
      if (x ? M[x - 1].n === mk.n - 1 : mk.n === 1) secs[ch + '.' + mk.n] = { from: (x ? M[x - 1].i : c.start) + 1, to: mk.i };
    });
  });
  const pages = heads.map(h => {
    const near = nums.filter(p => Math.abs(p.i - h.i) <= 12 && p.n >= 1 && p.n <= 400).sort((x, y) => Math.abs(x.i - h.i) - Math.abs(y.i - h.i))[0];
    return { ch: h.ch, sec: h.sec, page: near ? near.n : null, i: h.i };
  });
  const text = k => {
    const s = secs[k];
    if (!s) return null;
    /* less the page furniture and each page's footnotes (from the first line
       opening with a note mark to the page's end) */
    const keep = [];
    let foot = false;
    for (const l of L.slice(s.from, s.to + 1)) {
      if (!l.trim()) continue;
      const brk = /^\s*\d{1,3}\s*$/.test(l) || /^\s*\[?\s*\d{1,2}\s*[.,]\s*[0-9lI]{1,2}\s*\]?\s*$/.test(l) || (l.trim().length < 30 && l === l.toUpperCase());
      if (brk) { foot = false; continue; }
      if (/^\s*(\d{1,2}|[*^'"‘’§†]{1,2})\s+\S/.test(l) && !/^\s*\d{1,2}\s+[a-z]/.test(l)) foot = true;
      if (!foot) keep.push(l);
    }
    return joinLines(keep).replace(/\s*\(\s*Here\s+ends\s+.*$/, '');
  };
  /* the page whose head's range holds the section (the head's number and the page's) */
  const where = k => {
    const [c, s] = k.split('.').map(Number);
    let hit = null, top = 0;
    for (const p of pages.filter(p => p.ch === c)) {
      if (p.sec < top) continue;                    // a head the OCR cut short ("[7. 2" for [7.21)
      top = p.sec;
      if (p.sec <= s) hit = p; else break;
    }
    return hit && hit.page ? 'p. ' + hit.page : null;
  };
  return { text, where, count: Object.keys(secs).length, chapters: chapters.length };
}

/* ------------------------------------------------------------- packets */
const WS_LICENCE = 'public domain text; transcription CC BY-SA 4.0 (Wikisource)';
const range = (m, h, a, b) => '[' + m + '.' + h + '.' + a + (b > a ? ' to ' + m + '.' + h + '.' + b : '') + '] ';
/* whose hand a hymn of Wilson's translation is in (Cowell's preface to vol. 5,
   Webster's to vol. 6) */
function wilsonHand(m, std) {
  if (m <= 5 || (m === 6 && std <= 61)) return 'Wilson’s own translation and notes';
  if (m <= 7 || (m === 8 && std <= 20)) return 'Wilson’s translation (he died in 1860 while vol. 4 was printing; Cowell saw it through the press)';
  if (m === 8 && std < 44) return 'Wilson’s translation, edited by Cowell';
  if (m === 8) return 'Cowell’s translation: Wilson’s manuscript breaks off in the middle of 8.44 and Cowell finished the Mandala himself' + (std === 44 ? ' (this hymn is part Wilson’s, part Cowell’s)' : '');
  if (m === 9) return 'Wilson’s rough notes for Mandala 9, revised and completed by Webster; notes in [square brackets] are Webster’s, not Wilson’s';
  return 'Wilson’s manuscript translation of Mandala 10, edited by Webster; notes in [square brackets] are Webster’s, not Wilson’s';
}

async function build(h) {
  const t0 = Date.now();
  const app = appHymns();
  const report = { countDiff: [], wilsonProblems: [], sayanaSlips: [], sayanaNoComm: [], griffithMissing: [], sizes: [] };

  /* Sayana */
  const S = await sayanaAll(h);
  const expect = {};                                  // each standard hymn's verse count: Sayana's where he has it
  for (const a of Object.values(app)) {
    const sk = a.m + '.' + stdOf(a.m, a.h), s = S[sk];
    expect[sk] = PAIRED[a.m + '.' + a.h] ? a.v.length : s ? s.segs[s.segs.length - 1].to : a.v.length;
  }

  /* Wilson */
  const vols = [null];
  for (let n = 1; n <= 6; n++) vols.push(await wilsonLoad(h, n));
  const wa = wilsonAnchors(vols);
  if (wa.missing.length) throw new Error('veda: Wilson’s heading not found for ' + wa.missing.join(', '));
  const W = {}, wstats = { pages: 0, byCount: 0, pinned: 0, ranged: 0 };
  for (let n = 1; n <= 6; n++) {
    const keys = Object.keys(wa.anchors).filter(k => wa.anchors[k].vol === n);
    const r = wilsonVolume(n, vols[n], keys, wa.anchors, expect);
    Object.assign(W, r.hymns);
    for (const k in wstats) wstats[k] += r.stats[k];
  }

  /* Griffith */
  const G = {};
  for (const g of GRIFFITH) {
    const text = await iaFile(h, g.id, g.name, 'veda-' + g.id + '_djvu.txt');
    const hymns = Object.entries(app).filter(([k, a]) => a.m >= g.books[0] && a.m <= g.books[1]).map(([k, a]) => ({ key: k, h: a.h, v: a.v }));
    const r = griffithVolume(text, hymns);
    for (const [k, v] of Object.entries(r.hymns)) G[k] = { ...v, g };
  }

  /* Yaska */
  const NL = (await iaFile(h, SARUP.id, SARUP.name, 'veda-' + SARUP.id + '_djvu.txt')).split(/\r?\n/);
  const Y = sarupList(NL), YS = sarupSections(NL);

  /* one packet a hymn */
  const dir = path.join(h.CACHE, 'veda');
  fs.mkdirSync(dir, { recursive: true });
  const cover = { sayana: 0, wilson: 0, griffith: 0, yaska: 0, yaskaCut: 0 };
  for (const a of Object.values(app)) {
    const { m, h: hy } = a, key = m + '.' + hy, std = stdOf(m, hy), sk = m + '.' + std;
    const moved = std !== hy ? 'The app numbers this hymn ' + key + ' (it prints the Valakhilya last, as the sacred-texts Griffith does); the standard number, which ' + 'this source uses, is ' + sk + '. ' : '';
    const vl = n => appVerse(key, n);
    const sources = [];

    /* 1. Sayana */
    const s = S[sk];
    if (s) {
      cover.sayana++;
      const notes = [moved.trim()].filter(Boolean);
      if (DOUBTFUL[sk]) notes.push('Doubtful: this is a Valakhilya hymn, and Cowell (Wilson vol. 5, p. 97) says Sayana takes no notice of them; the commentary printed here may be a later hand’s.');
      if (PAIRED[key]) notes.push('Sayana numbers the verses 1 to ' + s.segs[s.segs.length - 1].to + '; Griffith (the app) prints them as couplets, so the app’s verse k is Sayana’s 2k-1 and 2k, and each seg is labelled with the app’s number.');
      const last = s.segs[s.segs.length - 1].to;
      if (!PAIRED[key] && last !== a.v.length) { notes.push('Sayana counts ' + last + ' verses, the app (Griffith) ' + a.v.length + '; the labels are Sayana’s numbers, which may run ahead of the app’s after the verse Griffith leaves out or joins.'); report.countDiff.push(key + (moved ? ' (std ' + sk + ')' : '') + ': Sayana ' + last + ', app ' + a.v.length); }
      if (s.slips.length) { notes.push('The page numbers some verses wrongly (' + s.slips.join('; ') + '); the segs follow the page’s order.'); report.sayanaSlips.push(sk + ': ' + s.slips.join('; ')); }
      const bare = s.segs.filter(x => !x.comm.length).map(x => x.from + (x.to > x.from ? ' to ' + x.to : ''));
      if (bare.length) { notes.push('The page gives no commentary under verse ' + bare.join(', ') + ' (Sayana often passes over a refrain already explained).'); report.sayanaNoComm.push(sk + ': ' + bare.join(', ')); }
      const segs = [];
      if (s.intro.length) segs.push({ base: '[' + key + ' introduction] ', comm: s.intro.join(' ') });
      for (const x of s.segs) segs.push({ base: range(m, hy, vl(x.from), vl(x.to)) + x.samhita, comm: x.comm.join(' ') });
      sources.push({ id: 'sayana', name: 'Sāyaṇa (Sanskrit)',
        edition: 'Vedārthaprakāśa, sa.wikisource ' + SA_TITLE(m, std) + ', revision ' + s.revid + ' (the printed edition is not named on the page)',
        url: SA_PAGE(m, std, s.revid), licence: WS_LICENCE, note: notes.join(' ').trim() || undefined, segs });
    } else {
      sources.push({ id: 'sayana', name: 'Sāyaṇa (Sanskrit)', edition: 'Vedārthaprakāśa, sa.wikisource ' + SA_TITLE(m, std),
        url: 'https://sa.wikisource.org/wiki/' + encodeURIComponent(SA_TITLE(m, std).replace(/ /g, '_')), licence: WS_LICENCE,
        note: (moved + 'This is a Valakhilya hymn (the standard 8.49 to 8.59): Sayana did not comment on the Valakhilya, and the page prints no commentary.').trim(), segs: [] });
    }

    /* 2. Wilson */
    const w = W[sk];
    if (w) {
      cover.wilson++;
      const V = WILSON[w.vol];
      const idx = vols[w.vol].idx[w.leaf];
      const notes = [moved.trim(), 'Hand: ' + wilsonHand(m, std) + '.'].filter(Boolean);
      if (w.problems.length) { notes.push('The scan does not part every verse: ' + w.problems.join('; ') + ' (those segs carry a range).'); report.wilsonProblems.push(sk + ': ' + w.problems.join('; ')); }
      const ranged = w.notes.filter(n => !n.exact);
      if (ranged.length) notes.push(ranged.length + ' of Wilson’s ' + w.notes.length + ' notes here stand in segs labelled with the verses printed on their page, because their marks are not legible in the scan; the note belongs to one of those verses.');
      if (w.notes.some(n => n.other)) notes.push('A note marked "(page shared)" was printed on a page with the next or last hymn and may belong to it.');
      const segs = [];
      const introNotes = w.notes.filter(n => n.exact && n.from === 0).map(n => n.text);
      if (w.intro.length || introNotes.length) segs.push({ base: '[' + key + ' introduction] ' + joinLines(w.intro), comm: introNotes.join('\n') });
      for (const x of w.verses) {
        const mine = w.notes.filter(n => n.exact && n.from === x.from).map(n => n.text);
        segs.push({ base: range(m, hy, x.from, x.to) + x.text, comm: mine.join('\n') });   // Wilson prints 1.65 to 1.70 in couplets too
      }
      for (const n of ranged) {
        const a0 = Math.max(1, n.from), z0 = Math.max(a0, n.to);
        segs.push({ base: range(m, hy, a0, z0) + '(a note printed with ' + (z0 > a0 ? 'these verses' : 'this verse') + (n.from === 0 ? ' and the introduction' : '') + (n.other ? ', page shared with ' + n.other.join(', ') : '') + ')', comm: n.text });
      }
      sources.push({ id: 'wilson', name: 'Wilson’s translation, which follows Sāyaṇa',
        edition: 'H. H. Wilson, Rig-Veda-Sanhitá, vol. ' + w.vol + ' (' + V.year + '; vols 4 to 6 ed. Cowell and Webster), archive.org ' + V.id + ' (OCR)',
        url: details(V.id) + (idx !== undefined ? '/page/n' + idx + '/mode/1up' : ''), licence: 'public domain', note: notes.join(' ').trim(), segs });
    } else {
      sources.push({ id: 'wilson', name: 'Wilson’s translation, which follows Sāyaṇa', edition: 'H. H. Wilson, Rig-Veda-Sanhitá, vol. 5 (1888), Appendix I',
        url: details(WILSON[5].id), licence: 'public domain',
        note: (moved + 'Not in Wilson’s translation: the Valakhilya hymns are in vol. 5’s Appendix I, Cowell’s own version, which cannot follow Sayana (he has no commentary on them).').trim(), segs: [] });
    }

    /* 3. Griffith's notes */
    const g = G[key];
    if (g && g.g && !g.missing) {
      if (g.notes.length) cover.griffith++;
      sources.push({ id: 'griffith-notes', name: 'Griffith’s notes',
        edition: 'R. T. H. Griffith, The Hymns of the Rigveda, 2nd ed., vol. ' + g.g.vol + ' (' + g.g.year + '; the edition of the app’s text), archive.org ' + g.g.id + ' (OCR)',
        url: details(g.g.id), licence: 'public domain',
        note: g.notes.length ? undefined : 'Griffith prints no note on this hymn (or the OCR lost it).',
        notes: g.notes.map(n => 'Note on ' + (n.v === null ? 'the hymn' : n.v) + ': ' + n.text.replace(/^\s*[‘'"*^]?\s*\d{1,3}\s+/, '')).join('\n') });
    } else {
      report.griffithMissing.push(key + (g && g.missing ? ' (' + g.missing + ')' : ''));
      const gv = GRIFFITH[m <= 6 ? 0 : 1];
      sources.push({ id: 'griffith-notes', name: 'Griffith’s notes', edition: 'R. T. H. Griffith, The Hymns of the Rigveda, 2nd ed., vol. ' + gv.vol + ' (' + gv.year + '), archive.org ' + gv.id + ' (OCR)',
        url: details(gv.id), licence: 'public domain', note: 'This hymn was not found in the scan (' + (g && g.missing ? g.missing : 'not found') + '); its notes are not in this packet.', notes: '' });
    }

    /* 4. Yaska */
    const ysegs = [];
    const nv = Math.max(expect[sk] || 0, a.v.length);
    for (let v = 1; v <= nv; v++) {
      for (const sec of Y.map[sk + '.' + v] || []) {
        const t = YS.text(sec), where = YS.where(sec);
        ysegs.push({ base: range(m, hy, vl(v), vl(v)) + 'Nirukta ' + sec + (t ? '' : ' (Sarup’s English translation' + (where ? ', ' + where : '') + '; not cut from the scan, read it there)'), comm: t || '' });
        cover.yaskaCut += t ? 1 : 0;
      }
    }
    if (ysegs.length) cover.yaska++;
    sources.push({ id: 'yaska', name: 'Yāska, Nirukta',
      edition: 'Lakshman Sarup, The Nighantu and the Nirukta (1920 to 1921), archive.org ' + SARUP.id + ' (OCR); verses found by Sarup’s list of quotations',
      url: details(SARUP.id), licence: 'public domain',
      note: ysegs.length ? (moved.trim() || undefined) : 'Sarup’s list of quotations shows no verse of this hymn in the Nirukta (the OCR of the list loses a few entries).', segs: ysegs });

    const packet = { plan: 'veda', ch: slug(m, hy), sources };
    const json = JSON.stringify(packet, null, 1);
    fs.writeFileSync(path.join(dir, slug(m, hy) + '.json'), json, 'utf8');
    report.sizes.push([key, json.length]);
  }
  const sz = report.sizes.map(x => x[1]).sort((x, y) => x - y);
  console.log('  veda: ' + report.sizes.length + ' packets written to .scripts/.cache/teachings/veda/ in ' + Math.round((Date.now() - t0) / 1000) + 's');
  console.log('    Sayana ' + cover.sayana + ' hymns; Wilson ' + cover.wilson + ' (notes: ' + wstats.byCount + ' pages matched mark for mark, ' + wstats.pinned + ' notes pinned by their letter, ' + wstats.ranged + ' given a range); Griffith notes on ' + cover.griffith + ' hymns (' + report.griffithMissing.length + ' not found in the scan); Yaska on ' + cover.yaska + ' hymns (' + cover.yaskaCut + ' sections cut)');
  console.log('    packet size: median ' + sz[sz.length >> 1] + ' chars, largest ' + sz[sz.length - 1] + ' (' + report.sizes.find(x => x[1] === sz[sz.length - 1])[0] + '), total ' + sz.reduce((p, q) => p + q, 0));
  return report;
}

module.exports = { build, stdOf, appVerse, PAIRED, saSplit, saNumber, sayanaAll, appHymns, iaFile, load, LOCK, hocrLines, wilsonAnchors, wilsonVolume, wilsonLoad, WILSON, griffithVolume, GRIFFITH, sarupList, sarupSections, sectionEnd, ordinal, SARUP };
