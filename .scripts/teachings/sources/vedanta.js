/* The Teachings: the Vedanta commentaries, for the Gita and the Upanishads.

   const vedanta = require('./sources/vedanta');
   await vedanta.gita({ get, CACHE, packetsOnly });
   await vedanta.upanishads({ get, CACHE, packetsOnly });

   Only public-domain English books, all archive.org OCR text (_djvu.txt), the
   file name taken from the item's metadata (both cached under src/, keyed on
   the identifier). Tested 2026-09-26.

   GITA: one packet per chapter, .scripts/.cache/teachings/gita/<NN>.json
     shankara  A. Mahadeva Sastri (2nd ed. 1901), three scans of the one edition:
               A bhagavadgitwith00agoog (the text used), B bhagavadgitawith00maharich,
               C in.ernet.dli.2015.283011. Chapters "<ORDINAL> DISCOURSE."; each verse
               a paragraph "NN." (or "20-22." for Sastri's groups) followed by the
               commentary. A heading A's OCR lost is found again by the words of B's
               or C's heading; three are misprinted in the book itself and found by
               SASTRI_FIX (6.41 printed "40.", 9.8 unnumbered, 10.41 printed "42.").
               Dropped: running heads, page footnotes, notes ending "(A)" (Anandagiri's
               gloss, not Sankara), Sastri's one-line side headings. A last paragraph
               ending ":" or "," is Sankara's lead-in to the next verse and moves there.
               Sankara does not comment on 1.1 to 2.10: those segs carry the verse only,
               and what Sastri prints after 2.10 is Sankara's introduction to 2.11.
     ramanuja  A. Govindacharya (1898), archive.org gita-bhasya (tesseract OCR; the
               Google scan sribhagavadgtwi00rmgoog is far worse). Chapters "LECTURE
               <Roman>"; each verse opens "NN. 'verse'", after a line of Sanskrit
               opening words the OCR turns to noise ending "&c."; that line is what
               finds a heading whose number the OCR garbled. Page footnotes are
               numbered too, so a numbered line counts only after such a line or when
               it opens a quotation. Ramanuja comments on chapter 1 in groups.
     madhva    S. Subba Rau (1906), india.history.resource.91865 (the Edelmann scan's
               OCR ran a Hindi model over English and is noise). Each verse's
               translation ends "(N)" at the end of a line ("(26 and 27)", "(31-35)");
               "V." paragraphs comment, "A." paragraphs raise the objection that leads
               into the next verse (moved there). Chapter 13 prints Arjuna's question
               as 13.1, so printed 13.n is 13.(n-1). Pages 169 to 180 are not in the
               scan (7.11 to 7.28, and the start of 7.29).
     telang    K. T. Telang, SBE 8 (1882), bhagavadgtwi00tela: no verse numbers, so each
               chapter's text whole ("Chapter I." to the next), page furniture dropped.

   UPANISHADS: one packet per section, .scripts/.cache/teachings/upanishads/<slug>.json
     shankara  S. Sitarama Sastri. Isa and Kena: the 1905 volume 1, two scans
               (UpanishadsAndSriSankarasCommentaryVol.1 used, upanishadssrisan00sita for
               what it lost); each English verse ends "(N)", then "Com."; the Kena is
               numbered 1 to 34 straight through (8, 5, 12, 9). Katha: the 1928 second
               edition kathaandprasnaup029591mbp ("PART I" to "PART VI" are 1.1 to 2.3),
               and for what its scan lacks the 1898 volume 2 in.ernet.dli.2015.57559,
               whose verses carry no numbers (numbered by aligning their words to 1928).
     madhva    S. C. Vasu, SBH vol. 1, the ABBYY copy
               sacredbooksofthehindusvol01upanishadsisatomandukyawithmadhwabhashya_202002:
               per mantra a "Mantra N." heading, gloss, the translation "N. ... -M."
               (M Vasu's running count; in the Katha it skips 98, so it ends at 120),
               then sometimes "MADHVA'S COMMENTARY." up to Vasu's "Note.-". Only those
               mantras make segs; square brackets in Madhva's words are Vasu's.
     sri-bhasya  G. Thibaut, SBE 48 (1904), in.ernet.dli.2015.45311 and 168717: which
               verses of the section the Sri Bhasya cites ("Ka. Up. I, 2, 23"; Thibaut
               numbers the Katha's vallis 1 to 6 through both chapters). */
'use strict';
const fs = require('fs');
const path = require('path');

const GITA_COUNTS = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 34, 27, 20, 24, 28, 78];
const KATHA_COUNTS = [29, 25, 17, 15, 15, 18];
const KENA_COUNTS = [8, 5, 12, 9];
const KATHA_PARTS = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3'];
const ORD = ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH', 'EIGHTEENTH'];
const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII'];

const IA = {
  sastriA: 'bhagavadgitwith00agoog', sastriB: 'bhagavadgitawith00maharich', sastriC: 'in.ernet.dli.2015.283011',
  govind: 'gita-bhasya', subba: 'india.history.resource.91865', telang: 'bhagavadgtwi00tela',
  vol1: 'UpanishadsAndSriSankarasCommentaryVol.1', vol1b: 'upanishadssrisan00sita',
  katha28: 'kathaandprasnaup029591mbp', katha98: 'in.ernet.dli.2015.57559',
  vasu: 'sacredbooksofthehindusvol01upanishadsisatomandukyawithmadhwabhashya_202002',
  sbe48: 'in.ernet.dli.2015.45311', sbe48b: 'in.ernet.dli.2015.168717'
};
const details = id => 'https://archive.org/details/' + id;

/* ------------------------------------------------------------ fetching */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function load(h, url, file) {
  if (h.packetsOnly) return fs.readFileSync(path.join(h.CACHE, 'src', file), 'utf8');
  for (let k = 1; ; k++) {
    try { return await h.get(url, file); }
    catch (e) {   // archive.org's data servers now and then answer 500 or 502: try again
      if (k >= 4 || !/HTTP 5\d\d/.test(e.message)) throw e;
      console.log('  ' + file + ': ' + e.message.replace(/ from .*/, '') + ', retrying');
      await sleep(10000 * k);
    }
  }
}
async function djvu(h, prefix, id) {
  const file = prefix + '-' + id + '_djvu.txt';
  if (h.packetsOnly) return load(h, null, file);
  const meta = JSON.parse(await load(h, 'https://archive.org/metadata/' + id, prefix + '-' + id + '_meta.json'));
  const f = (meta.files || []).find(x => /_djvu\.txt$/.test(x.name));
  if (!f) throw new Error(id + ': the item has no _djvu.txt');
  return load(h, 'https://archive.org/download/' + id + '/' + encodeURIComponent(f.name), file);
}

/* ------------------------------------------------------------- helpers */
const norm = t => t.split(/\r?\n/).map(l => l.replace(/[ \t ]+/g, ' ').trim());
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const ordinal = w => { let best = -1, bd = 3; ORD.forEach((o, n) => { const x = lev(w, o); if (x < bd && x <= (o.length > 6 ? 2 : 1)) { bd = x; best = n; } }); return best + 1; };
/* chapter anchors: the last matching line before the next chapter's (skips a table of contents) */
function pickAnchors(anchors, n, total) {
  const pick = Array(n + 1).fill(null); let lim = total;
  for (let ch = n; ch >= 1; ch--) { const c = anchors.filter(a => a.ch === ch && a.i < lim); if (c.length) { pick[ch] = c[c.length - 1].i; lim = pick[ch]; } }
  return pick;
}
const letters = s => s.toLowerCase().replace(/[^a-z]/g, '');
function dice(a, b) {
  const grams = s => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const A = grams(a), B = grams(b); let hit = 0, n = 0;
  for (const [k, v] of A) { hit += Math.min(v, B.get(k) || 0); n += v; }
  for (const v of B.values()) n += v;
  return n ? 2 * hit / n : 0;
}
/* lines to paragraphs: blank lines split; a sentence broken by a page is joined again */
function paragraphs(lines) {
  const P = []; let cur = [];
  for (const l of lines) { if (!l) { if (cur.length) P.push(cur.join('\n')), cur = []; } else cur.push(l); }
  if (cur.length) P.push(cur.join('\n'));
  const out = [];
  for (let p of P) {
    p = p.replace(/(\w)[-¬]\n(\w)/g, '$1$2').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!p) continue;
    const prev = out[out.length - 1];
    // joined when the break falls mid-sentence: the next starts lower-case, or the last ends on a word or a comma
    if (prev && !/[.?!:;"”’)\]]\s*$/.test(prev) && (/^[a-z(]/.test(p) || /[a-z,-]$/.test(prev))) out[out.length - 1] = prev.replace(/-$/, '') + (/-$/.test(prev) ? '' : ' ') + p;
    else out.push(p);
  }
  return out;
}
const wordCount = s => (String(s || '').match(/\S+/g) || []).length;
/* verses with no comment of their own, followed by the verse whose comment covers them */
function groupNote(segs, who, skip) {
  const lab = x => (x.base.match(/^\[([^\]]+)\]/) || [])[1] || '';
  const runs = []; let run = [];
  for (const x of segs) {
    if (skip && skip(lab(x))) { run = []; continue; }
    if (!x.comm) run.push(lab(x));
    else { if (run.length) runs.push(run.join(', ') + ' with ' + lab(x)); run = []; }
  }
  if (run.length) runs.push(run.join(', ') + ' (no comment of its own before the end of the section)');
  return runs.length ? who + ' comments on some verses together with a later one, in whose segment the comment stands: ' + runs.join('; ') + '.' : '';
}
function writePacket(h, plan, name, packet) {
  const dir = path.join(h.CACHE, plan);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(packet, null, 1), 'utf8');
  return packet.sources.reduce((a, s) => a + (s.segs || []).reduce((b, x) => b + wordCount(x.base) + wordCount(x.comm), 0) + wordCount(s.notes), 0);
}

/* ================================================================ GITA */

/* ---- Sankara: Mahadeva Sastri ---- */
const S_HEAD = /^[.|!\]\['"“‘*]?\s*([0-9IilSOg]{1,2}|[0-9Iil] [0-9])\s*(?:[-–—,&]\s*([0-9IilSOg]{1,2}))?\s*[.,:;]?\s*[*†‡"“‘'(]{0,3}\s*([A-Z].*)$/;
const S_HEAD2 = /^\s*([0-9IilSOg]{1,2})\s*(?:[-–—,&]\s*([0-9IilSOg]{1,2}))?\s*[.,:;]\s*[\^*†‡"“‘'(]{1,4}\s*[\^*†‡"“‘'(]{0,4}\s*([A-Za-z].*)$/;   // "18-19. ^^ '^ho is the same"
const S_NOTHEAD =/BHAGAVAD|G[IiÎî]T[AÂ]\.?\s*\[|\[\s*D[il1]s|\]\s*[A-Z-]{4,}|^\S{1,8}\s*[\]J}]\s*[.,]?\s*[A-Z][A-Za-z -]{3,}[.,]?\s+\S{1,4}\s*$/i;
const sNum = s => +s.replace(/ /g, '').replace(/[Iil]/g, '1').replace(/g/g, '9').replace(/S/g, '5').replace(/O/g, '0');
function sastriHeads(raw) {
  const L = norm(raw);
  const anchors = [];
  L.forEach((l, i) => {
    if (l !== l.toUpperCase()) return;
    const w = l.replace(/[^A-Z0-9 ]/g, ' ').replace(/ +/g, ' ').trim().split(' ');
    for (let k = 0; k + 1 < w.length; k++) if (lev(w[k + 1], 'DISCOURSE') <= 2) { const ch = ordinal(w[k]); if (ch) anchors.push({ ch, i }); }
  });
  const pick = pickAnchors(anchors, 18, L.length);
  const cands = [];
  L.forEach((l, i) => {
    const m = l.match(S_HEAD) || l.match(S_HEAD2); if (!m || S_NOTHEAD.test(l)) return;
    const a = sNum(m[1]), b = m[2] ? sNum(m[2]) : a;
    if (!isNaN(a) && !isNaN(b) && b >= a && b - a <= 4) cands.push({ i, a, b });
  });
  // a chapter heading the OCR lost: the "1." that follows the last verses of the chapter before
  for (let c = 2; c <= 18; c++) if (pick[c] === null && pick[c - 1] !== null) {
    let hi = pick.slice(c + 1).find(p => p !== null) ?? L.length, seen = false;
    for (const x of cands) { if (x.i <= pick[c - 1] || x.i >= hi) continue; if (x.b >= GITA_COUNTS[c - 2] - 3) seen = true; else if (seen && x.a === 1) { pick[c] = x.i - 1; break; } }
  }
  return { L, heads: chainHeads(cands, pick, GITA_COUNTS, 3), pick };
}
/* per chapter, the longest run of headings in order (gaps of up to `gap` verses),
   each number at its earliest line after the one before: commentary that
   enumerates points ("4. In the following discussion") cannot break the run */
function chainHeads(cands, pick, counts, gap) {
  const heads = [];
  for (let c = 1; c < pick.length; c++) {
    if (pick[c] === null) continue;
    const end = pick.slice(c + 1).find(p => p !== null) ?? Infinity;
    const cs = cands.filter(x => x.i > pick[c] && x.i < end && x.b <= counts[c - 1]);
    const dp = cs.map(x => x.a <= gap ? x.b - x.a + 1 : -Infinity), prev = cs.map(() => -1);
    for (let k = 0; k < cs.length; k++) for (let j = 0; j < k; j++) {
      if (cs[j].b < cs[k].a && cs[k].a - cs[j].b <= gap && dp[j] + cs[k].b - cs[k].a + 1 > dp[k]) { dp[k] = dp[j] + cs[k].b - cs[k].a + 1; prev[k] = j; }
    }
    let best = -1; cs.forEach((x, k) => { if (dp[k] > -Infinity && (best < 0 || dp[k] > dp[best])) best = k; });
    const chain = []; for (let k = best; k >= 0; k = prev[k]) chain.unshift(cs[k]);
    let lo = pick[c];
    for (const x of chain) {
      const first = cs.find(y => y.a === x.a && y.b === x.b && y.i > lo && y.i <= x.i) || x;
      heads.push({ c, a: first.a, b: first.b, i: first.i }); lo = first.i;
    }
  }
  return heads;
}
/* 1901 misprints, the same in all three scans: found by their words */
const SASTRI_FIX = {
  '6.41': /^\S{0,3}\s*4[0O]\s*[.,;:]\s+Having attained to the worlds/,
  '9.8': /^Resorting to My Prak/,
  '10.41': /^4[2Z]\s*[.,;:]\s+Whatever being is glorious/,     // taken as 10.42 until relabelled
  '10.42': /^4[2Z]\s*[.,;:]\s+But,? of what avail/
};
const headLetters = l => letters(l.replace(/^[^A-Za-z]*/, '')).slice(0, 40);
function sastriMerge(A, others) {
  const has = (P, c, v) => P.heads.find(h => h.c === c && h.a <= v && v <= h.b);
  const inserted = [];
  for (let c = 1; c <= 18; c++) for (let v = 1; v <= GITA_COUNTS[c - 1]; v++) {
    if (has(A, c, v)) continue;
    const prev = A.heads.filter(h => h.c === c && h.b < v).pop();
    const next = A.heads.find(h => h.c === c && h.a > v) || A.heads.find(h => h.c > c);
    const lo = prev ? prev.i + 1 : (A.pick[c] ?? 0), hi = next ? next.i : A.L.length;
    let at = -1, b = v;
    const fix = SASTRI_FIX[c + '.' + v];
    if (fix) {
      // a misprinted number may have been taken for the next verse: relabel that heading
      const wrong = A.heads.find(x => x.c === c && x.i >= lo && x.i <= hi && fix.test(A.L[x.i]));
      if (wrong) { wrong.a = wrong.b = v; inserted.push(c + '.' + v + ' (relabelled)'); continue; }
      for (let i = lo; i < hi; i++) if (fix.test(A.L[i])) { at = i; break; }
    }
    else for (const O of others) {
      const oh = has(O, c, v); if (!oh || oh.a !== v) continue;
      const want = headLetters(O.L[oh.i]);
      let best = -1, bs = 0.6;
      for (let i = lo; i < hi; i++) { const d = dice(headLetters(A.L[i]), want); if (d > bs) { bs = d; best = i; } }
      if (best >= 0) { at = best; b = oh.b; break; }
    }
    if (at >= 0) { A.heads.push({ c, a: v, b, i: at }); A.heads.sort((x, y) => x.i - y.i); inserted.push(c + '.' + v); }
  }
  return inserted;
}
const S_RUN = [/BHAGAVAD|G[IiÎî]T[AÂ]\.?\s*\[|\[\s*D[il1]s/i, /^\S{0,4}\d+\s*[-—–^]+\s*\S{1,4}[\]\)}]\.?\s+[A-Z]/, /^\S{0,6}\d+\s*[-—–^]+\s*\S{1,4}[\]\)}]\s*$/,
  /^\S{0,4}\d+\s*\.?\s*[\]\)}]\.?\s+[A-Z][A-Z .-]{4,}\S*\s*$/, /^\d{1,3}\s*$/, /^.{1,3}$/, /^(?=(?:[^A-Z]*[A-Z]){4})[^a-z]{4,40}$/,
  /^\S{0,4}\s*THE\s+B\S+\s*[.,]?\s*[\[(]\s*D\S{1,3}/i, /[\[(]\s*D[a-z$]{1,2}\s*[.,;]?\s*[IVXLlf1]{1,5}\s*[.,]?\s*$/];   // "THE Bil^iiVAEf-atTA, [Drs; If."
const S_FOOT = /^([*†‡+♦§¶•]|[ftiJI1]\s+[A-Z‘'"(]|\|\|?\s)/;
function sastriClean(lines) {
  const run = l => S_RUN.some(r => r.test(l));
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (run(l)) continue;
    if (S_FOOT.test(l) && i > 0 && !lines[i - 1]) {   // a page's footnotes: up to the next running head
      let j = i + 1, hit = -1;
      while (j < lines.length && j < i + 32) { if (lines[j].length > 3 && run(lines[j])) { hit = j; break; } j++; }
      if (hit > 0) { i = hit; continue; }
    }
    out.push(l);
  }
  const P = paragraphs(out).filter(p => !/\(\s*A\s*\.?\s*\)\s*[.,]?\s*$/.test(p));
  // Sastri's side headings: a short line of its own, no colon, no speaker
  const body = P.filter((p, k) => k === 0 || !(p.split(' ').length <= 8 && /^[A-Z]/.test(p) && !/[:;,?]/.test(p) && !/\b(said|says)\b/.test(p)));
  const verse = body.shift() || '';
  return { verse, ...leadOff(body, 350) };
}
/* the commentator's lead-in to the next verse: short last paragraphs ending ":" or ","
   ("The reply follows :"), never the whole of a verse's commentary */
function leadOff(body, max) {
  const lead = [];
  while (body.length > 1 && /[:,—-]\s*$/.test(body[body.length - 1]) && body[body.length - 1].length <= max) lead.unshift(body.pop());
  const k = body.length - 1;
  if (k >= 0 && !lead.length && /[:,—-]\s*$/.test(body[k])) {
    // else split off the last paragraph's last sentence when that sentence is the lead-in
    const m = body[k].match(/^([\s\S]*[.?!"”’)])\s+([^.?!]{8,250}[:,—-])\s*$/);
    if (m) { body[k] = m[1]; lead.push(m[2]); }
  }
  return { comm: body.join('\n\n'), lead: lead.join('\n\n') };
}
/* heads -> segs. A segment ends at the next heading, or at the next chapter's
   heading line: what lies between that line and the chapter's first verse is
   the commentator's introduction to the chapter, and opens that verse's comm. */
function segsBy(L, heads, pick, cut, stripNum, silent) {
  const out = {}; for (let c = 1; c <= 18; c++) out[c] = [];
  let carry = '', carryBase = '';
  heads.forEach((h, k) => {
    const nx = heads[k + 1];
    const chEnd = nx && nx.c !== h.c && pick[nx.c] != null && pick[nx.c] > h.i && pick[nx.c] < nx.i ? pick[nx.c] : -1;
    const x = cut(L.slice(h.i, chEnd >= 0 ? chEnd : nx ? nx.i : L.length));
    let verse = x.verse.replace(stripNum, '');
    if (carryBase) { verse = carryBase + ' ' + verse; carryBase = ''; }
    let comm = [carry, x.comm].filter(Boolean).join('\n\n').replace(/^[.,;:\s]+/, '');
    let lead = x.lead;
    // a speaker's line ("Arjuna said :") belongs to the next verse's text
    const sp = lead.match(/(?:^|\n\n)([A-Z][\w' .-]{0,30}\bsaid\s*:?)\s*$/i);
    if (sp) { carryBase = sp[1].replace(/\s*:?\s*$/, ':'); lead = lead.slice(0, sp.index).trim(); }
    if (chEnd >= 0) {
      const intro = cut(['', ...L.slice(chEnd + 1, nx.i)]);
      lead = [lead, intro.verse, intro.comm, intro.lead].filter(Boolean).join('\n\n');
    }
    if (silent && silent(h)) { carry = silent(h) === 'carry' ? [comm, lead].filter(Boolean).join('\n\n') : lead; comm = ''; }
    else carry = lead;
    // a verse whose heading was not found is inside this segment: say so in the label
    const upto = Math.max(h.b, nx && nx.c === h.c ? nx.a - 1 : GITA_COUNTS[h.c - 1]);
    const from = k && heads[k - 1].c === h.c ? h.a : 1;   // a lost first verse is in the chapter's introduction, at the head of this comm
    const label = from === upto ? h.c + '.' + from : h.c + '.' + from + ' to ' + h.c + '.' + upto;
    out[h.c].push({ base: '[' + label + '] ' + verse, comm });
  });
  return out;
}
/* Sankara begins at 2.11: what Sastri prints after 2.10 is his introduction to 2.11 */
const sastriSegs = A => segsBy(A.L, A.heads, A.pick, sastriClean, /^[^A-Za-z0-9]{0,4}(?:[0-9IilSOg]{1,2}|[0-9Iil] [0-9])\s*(?:[-–—,&]\s*[0-9IilSOg]{1,2})?\s*[.,:;]?\s*(?:[\^*†‡"“‘'(]{1,4}\s*)?/,
  h => h.c === 1 ? 'drop' : h.c === 2 && h.b <= 10 ? (h.b === 10 ? 'carry' : 'drop') : false);

/* ---- Ramanuja: Govindacharya ---- */
const G_PRAT = /&\s*[ceé¢]\b|&[ceé¢]|\bs[ce][.,]\s*$|&¢|[a-z]c[.,]\)?\s*$|&\s*[.,]?\s*$|&[a-z]{1,2}[.,]\s*$/;
const G_RUN = /BHAGAVAD|COMMENTARY|\(Lec|\[Lec|YOGA[.,]?\s+\d+\s*$|^\d+-\d+\s*[.)\]}]\s*([A-Z‘'][A-Z‘' -]{3,}|$)/i;
const G_TOK = /^[(\[]?([§$£]?[0-9IilSOgZot]{1,3})(?:\s*[-–—,&]\s*([0-9IilSOgot]{1,2}))?\s*[.,:;°*']{0,3}\s*[*]?\s*/;
const gNum = s => { s = s.replace(/^[§$£]/, '5').replace(/[Iilt]/g, '1').replace(/g/g, '9').replace(/S/g, '5').replace(/[Oo]/g, '0').replace(/Z/g, '2'); return /^\d+$/.test(s) ? +s : NaN; };
function govindHeads(raw) {
  const L = norm(raw);
  const anchors = [];
  L.forEach((l, i) => {
    const r = l.match(/^LECTURE\s+([IVXl]+)[.,]?$/);
    if (r) { const k = ROM.indexOf(r[1].replace(/l/g, 'I')); if (k >= 0) anchors.push({ ch: k + 1, i }); return; }
    const m = l.replace(/^THE\s+/, '').match(/^([A-Za-z]+)\s+([A-Za-z]+)[.,]?$/);
    if (m && m[1] === m[1].toUpperCase() && lev(m[2].toUpperCase(), 'LECTURE') <= 2) { const ch = ordinal(m[1].toUpperCase()); if (ch) anchors.push({ ch, i }); }
  });
  const pick = pickAnchors(anchors, 18, L.length);
  const k1 = L.findIndex((l, i) => i > (pick[1] ?? 0) && /^1\.\s+Dhrit/.test(l));   // chapter 1 opens after Ramanuja's introduction
  if (k1 > 0) pick[1] = k1 - 1;
  let c = 0, last = 0; const heads = [];
  for (let i = 0; i < L.length; i++) {
    for (let ch = c + 1; ch <= 18; ch++) if (pick[ch] === i) { c = ch; last = 0; }
    if (!c || !L[i] || G_RUN.test(L[i])) continue;
    let p = i - 1; while (p > 0 && !L[p]) p--;
    const afterPrat = G_PRAT.test(L[p]);
    const m = L[i].match(G_TOK); if (!m) continue;
    let rest = L[i].slice(m[0].length);
    if (!rest) { let j = i + 1; while (j < L.length && j < i + 14 && !L[j]) j++; rest = L[j] || ''; }
    if (!afterPrat && !/^[‘'"“]/.test(rest)) continue;
    if (!/^[‘'"“(]?\s*[A-Z(‘'"“]/.test(rest)) continue;
    let a = gNum(m[1]), b = m[2] ? gNum(m[2]) : a;
    if (a >= 100 && a % 100 > last && a % 100 <= last + 3) { a %= 100; if (!m[2]) b = a; }   // "127," for 27
    if (!(a > last && a <= last + 3)) { if (afterPrat && isNaN(a)) { a = last + 1; b = a; } else continue; }
    if (isNaN(b) || b < a || b - a > 4) b = a;
    if (b > GITA_COUNTS[c - 1]) continue;
    heads.push({ c, a, b, i }); last = b;
  }
  return { L, heads, pick };
}
function govindClean(lines) {
  const garbage = l => G_PRAT.test(l) && (l.match(/[a-z]{3,}/g) || []).length <= 1 || /^[^a-z]{0,40}&[ce]/.test(l);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (G_RUN.test(l) || /^\d{1,3}\s*$/.test(l) || /^.{1,3}$/.test(l) || garbage(l)) continue;
    if (i > 0 && !lines[i - 1] && /^[t1-9]\s*[.,]\s+\S/.test(l) && i > 2) {   // numbered page footnotes, up to the running head or the segment's end
      let j = i + 1, hit = -1;
      while (j < lines.length && j < i + 30) { if (G_RUN.test(lines[j])) { hit = j; break; } j++; }
      if (hit > 0) { i = hit; continue; }
      if (lines.length - i < 12) break;
    }
    out.push(l);
  }
  const P = paragraphs(out);
  const verse = P.shift() || '';
  return { verse, ...leadOff(P, 400) };
}
const govindSegs = G => segsBy(G.L, G.heads, G.pick, govindClean, /^[(\[]?[§$£]?[0-9IilSOgZot]{1,3}\s*(?:[-–—,&]\s*[0-9IilSOgot]{1,2})?\s*[.,:;°*']{0,3}\s*/);

/* ---- Madhva: Subba Rau ---- */
const M_MARK = /\(\s*([0-9IilSOo]{1,2})(?:\s*(?:[-–—&,]|and)\s*([0-9IilSOo]{1,2}))?\s*[.,:;+\-]?\s*[)|\]]?\s*[.,;:]?\s*$/;
const M_XREF = /\b(verse|verses|Sutra|Ch|p)\.?\s*\(\s*\S+\s*$/i;
const M_RUN = /^(?=.{0,50}$).{0,14}\bT[HIl]\S{0,2}\s+B\S{1,3}AGAVAD\s+G\S{1,4}A\b|^\d{1,3}\s*$|^.{1,3}$|^[\[(]?\s*a[dp]h?\S*\s*\.?\s*$/i;   // "vit. ] THE BHAGAVAD GITA, 193"
const M_MISSING = new Set(Array.from({ length: 18 }, (_, k) => '7.' + (11 + k)));   // pages 169 to 180
const mNum = s => +s.replace(/[Iil]/g, '1').replace(/S/g, '5').replace(/[Oo]/g, '0');
function subbaSegs(raw) {
  const L = norm(raw);
  const counts = GITA_COUNTS.slice(); counts[12] = 35;
  const anchors = [];
  L.forEach((l, i) => {
    const m = l.toUpperCase().replace(/[^A-Z ]/g, ' ').trim().match(/^([A-Z]+)\s+([A-Z]+)$/);
    if (m && l === l.toUpperCase() && lev(m[2], 'ADHYAYA') <= 2) { const ch = ordinal(m[1]); if (ch) anchors.push({ ch, i }); }
  });
  const pick = pickAnchors(anchors, 18, L.length);
  if (pick.some((p, k) => k && p === null)) throw new Error('Subba Rau: chapter headings not found: ' + pick.map((p, k) => k && p === null ? k : '').filter(Boolean).join(', '));
  const paraStart = i => { while (i > 0 && L[i - 1]) i--; return i; };
  const heads = [];
  for (let ch = 1; ch <= 18; ch++) {
    const end = ch < 18 ? pick[ch + 1] : L.length;
    const cand = [];
    for (let i = pick[ch]; i < end; i++) {
      const m = L[i].match(M_MARK); if (!m || M_XREF.test(L[i])) continue;
      const n = mNum(m[1]), n2 = m[2] ? mNum(m[2]) : n;
      if (n >= 1 && n <= counts[ch - 1]) cand.push({ i, n, b: n2 > n && n2 <= n + 6 ? Math.min(n2, counts[ch - 1]) : n });
    }
    const gap = ch === 7 ? 20 : 8;
    const dp = cand.map(() => 1), prev = cand.map(() => -1);
    for (let k = 0; k < cand.length; k++) for (let j = 0; j < k; j++) if (cand[j].b < cand[k].n && cand[k].n - cand[j].b <= gap && dp[j] + 1 > dp[k]) { dp[k] = dp[j] + 1; prev[k] = j; }
    let best = -1; for (let k = 0; k < cand.length; k++) if (best < 0 || dp[k] > dp[best]) best = k;
    const chain = []; for (let k = best; k >= 0; k = prev[k]) chain.unshift(cand[k]);
    let lo = pick[ch] + 1;
    for (const x of chain) {
      const first = cand.find(y => y.n === x.n && y.i >= lo && y.i <= x.i) || x;
      const floor = Math.max(heads.length ? heads[heads.length - 1].mark + 1 : 0, pick[ch] + 1);
      let s = Math.max(paraStart(first.i), floor);
      // a marker on a paragraph of its own ("° (36—39)"): the verse is the paragraph above
      if (L.slice(s, first.i + 1).join(' ').replace(M_MARK, '').replace(/[^A-Za-z]/g, '').length < 12) {
        let t = s - 1; while (t > floor && !L[t]) t--;
        if (t > floor && L[t]) s = Math.max(paraStart(t), floor);
      }
      // a verse broken by the page: up over the running head while the text runs on
      // a verse broken by the page or by a stray blank line (the scan's paragraphs are unreliable): when the
      // verse would open in mid-sentence, go up to the line after the last finished sentence, eight lines at most
      let above = s - 1; while (above > floor && (!L[above] || M_RUN.test(L[above]))) above--;
      if (/^[a-z(,;]/.test(L[s] || '') || (above > floor && !M_MARK.test(L[above]) && !/[.?!:;]["'”’)]?\s*$/.test(L[above]))) {
        let t = s - 1, n = 0, top = s;
        while (t > floor && n < 8) {
          if (!L[t] || M_RUN.test(L[t])) { t--; continue; }
          if (M_MARK.test(L[t]) || /[.?!:]["'”’)]?\s*$/.test(L[t])) break;
          top = t; n++; t--;
        }
        if (t > floor && n < 8) s = top;
      }
      heads.push({ c: ch, n: first.n, b: first.b, mark: first.i, s }); lo = first.i + 1;
    }
  }
  // printed number -> standard verse(s); a verse whose marker the OCR lost is inside the segment before
  const std = (c, n) => c === 13 ? n - 1 : n;
  const out = {}; for (let c = 1; c <= 18; c++) out[c] = [];
  let carry = '';
  heads.forEach((h, k) => {
    const nx = heads[k + 1];
    const end = nx ? (nx.c !== h.c ? pick[nx.c] : nx.s) : L.length;
    let upto = h.b;
    if (nx && nx.c === h.c) upto = Math.max(h.b, nx.n - 1);
    else if (!nx || nx.c !== h.c) upto = Math.max(h.b, (h.c === 13 ? 35 : GITA_COUNTS[h.c - 1]));
    while (upto > h.b && M_MISSING.has(h.c + '.' + std(h.c, upto))) upto--;
    const afterGap = M_MISSING.has(h.c + '.' + std(h.c, h.n - 1));
    const lines = L.slice(h.s, end).filter(l => !M_RUN.test(l));
    const markAt = lines.findIndex(l => M_MARK.test(l));
    const verseP = paragraphs(lines.slice(0, markAt + 1));
    const rest = paragraphs(lines.slice(markAt + 1));
    const lead = [];
    if (nx && nx.c === h.c) while (rest.length && /^A\s*[.,]\s/.test(rest[rest.length - 1])) lead.unshift(rest.pop());
    let verse = verseP.join(' ').replace(/\s*\(\s*[0-9IilSOo]{1,2}(?:\s*(?:[-–—&,]|and)\s*[0-9IilSOo]{1,2})?\s*[.,:;+\-]?\s*[)|\]]?\s*[.,;:]?\s*$/, '');
    let comm = [carry, ...rest].filter(Boolean).join('\n\n');
    if (afterGap) { comm = [verse, comm].filter(Boolean).join('\n\n'); verse = '(the translation is on a page missing from the scan)'; }
    carry = lead.join('\n\n');
    if (nx && nx.c !== h.c) {   // the next chapter's introduction opens its first verse's comm
      carry = paragraphs(L.slice(pick[nx.c] + 1, nx.s).filter(l => !M_RUN.test(l))).join('\n\n');
      if (lead.length) comm = [comm, ...lead].join('\n\n');
    }
    let label;
    if (h.c === 13 && h.n === 1) label = '13, Arjuna’s question before 13.1 (Madhva’s text; not in the 700-verse count)';
    else { const a = std(h.c, h.n), z = std(h.c, upto); label = a === z ? h.c + '.' + a : h.c + '.' + a + ' to ' + h.c + '.' + z; }
    out[h.c].push({ base: '[' + label + '] ' + verse, comm });
  });
  return out;
}

/* ---- Telang: whole chapters ---- */
function telangChapters(raw) {
  const L = norm(raw);
  const at = [];
  let from = 0;
  for (let c = 1; c <= 18; c++) {
    const re = new RegExp('^Chapter\\s+' + ROM[c - 1].replace(/I/g, '[I1l]') + '\\s*[.,]?$');
    const i = L.findIndex((l, k) => k > from && re.test(l));
    if (i < 0) throw new Error('Telang: "Chapter ' + ROM[c - 1] + '." not found');
    at.push(i); from = i;
  }
  const endAll = L.findIndex((l, k) => k > at[17] && /^SANATSUG\S*\.?$/.test(l));
  if (endAll < 0) throw new Error('Telang: the end of chapter 18 not found');
  const run = l => /^\d{0,3}\s*B[IH]{1,2}AGAVADG\S*\.?\s*\d{0,3}$/i.test(l) || /^CHAPTER\s+[IVXLT1l]+\s*[,.]\s*\S{1,4}\s*[.,]?\s*\S{0,6}$/i.test(l) || /^\d{1,3}\s*$/.test(l) || /^.{1,2}$/.test(l);
  const out = {};
  for (let c = 1; c <= 18; c++) out[c] = paragraphs(L.slice(at[c - 1] + 1, c < 18 ? at[c] : endAll).filter(l => !run(l))).join('\n\n');
  return out;
}

async function gita(h) {
  const A = sastriHeads(await djvu(h, 'gita-sankara', IA.sastriA));
  const B = sastriHeads(await djvu(h, 'gita-sankara', IA.sastriB));
  const C = sastriHeads(await djvu(h, 'gita-sankara', IA.sastriC));
  const G = govindHeads(await djvu(h, 'gita-ramanuja', IA.govind));
  const subbaRaw = await djvu(h, 'gita-madhva', IA.subba);
  const telRaw = await djvu(h, 'gita-telang', IA.telang);

  const found = A.heads.length;
  const inserted = sastriMerge(A, [B, C]);
  const sk = sastriSegs(A), rm = govindSegs(G), md = subbaSegs(subbaRaw), tl = telangChapters(telRaw);
  const words = [];
  for (let c = 1; c <= 18; c++) {
    const packet = {
      plan: 'gita', ch: c,
      sources: [
        { id: 'shankara', name: 'Śaṅkara (Advaita)',
          edition: 'A. Mahadeva Sastri, The Bhagavad-Gita with the Commentary of Sri Sankaracharya, 2nd ed. (1901), archive.org ' + IA.sastriA + ' (with ' + IA.sastriB + ' and ' + IA.sastriC + ' for headings its OCR lost) (OCR)',
          url: details(IA.sastriA), licence: 'public domain', segs: sk[c],
          note: [c === 1 || c === 2 ? 'Śaṅkara does not comment on 1.1 to 2.10; his introduction to 2.11 stands at the head of 2.11’s commentary.' : '',
            groupNote(sk[c], 'Śaṅkara', l => /^(1\.|2\.([1-9]|10)\b)/.test(l))].filter(Boolean).join(' ') },
        { id: 'ramanuja', name: 'Rāmānuja (Viśiṣṭādvaita)',
          edition: 'A. Govindacharya, Sri Bhagavad-Gita with Sri Ramanujacharya’s Visishtadvaita Commentary (1898), archive.org ' + IA.govind + ' (OCR)',
          url: details(IA.govind), licence: 'public domain', segs: rm[c],
          note: c === 1 ? 'Rāmānuja comments on chapter 1 in groups of verses, not verse by verse; Govindacharya prints its verse numbers apart from the verses, so 1.4 to 1.47 is one segment.' : groupNote(rm[c], 'Rāmānuja') },
        { id: 'madhva', name: 'Madhva (Dvaita)',
          edition: 'S. Subba Rau, The Bhagavad-Gita, translated with the commentary of Sri Madhwacharya (1906), archive.org ' + IA.subba + ' (OCR)',
          url: details(IA.subba), licence: 'public domain', segs: md[c],
          note: c === 7 ? 'pages missing from the scan: 169 to 180 (7.11 to 7.28, and the translation of 7.29)'
            : c === 13 ? 'Subba Rau prints Arjuna’s question as 13.1; his 13.n is 13.(n-1) here.' : '' },
        { id: 'telang-sbe8', name: 'Telang’s translation',
          edition: 'K. T. Telang, The Bhagavadgita, SBE 8 (1882), archive.org ' + IA.telang + ' (OCR)',
          url: details(IA.telang), licence: 'public domain', notes: tl[c] }
      ]
    };
    words.push(writePacket(h, 'gita', String(c).padStart(2, '0'), packet));
  }
  console.log('  gita: 18 packets written to .scripts/.cache/teachings/gita/ (Sastri: ' + found + ' headings in ' + IA.sastriA + ', ' + inserted.length + ' found again)');
  return { words, sastriInserted: inserted };
}

/* ========================================================== UPANISHADS */

/* ---- Sankara: Sitarama Sastri, "(N)" editions (1905 vol. 1, 1928 Katha) ---- */
const U_MARK = /\(\s*([0-9IilSOo]{1,2})(?:\s*[-–&,]\s*([0-9IilSOo]{1,2}))?\s*[.,:;+\-]?\s*[)|\]]\s*[.,;:]?\s*$/;
const U_COM = /^[^a-zA-Z ]{0,2}[CGOQ0][o0a][mnrw]{1,2}[a-z]{0,9}\s*[.,:;]?\s*[-—–~^]|^[^a-zA-Z ]{0,2}[CGOQ0][o0a][mnrw]{1,2}[a-z]{0,9}\s*[.,:;]\s*[A-Z‘'"]/;   // "Com.—", OCR "Gom", "Oom", "Cow.", "Cam."
const U_COM_LABEL = /^[^a-zA-Z ]{0,2}[CGOQ0][o0a][mnrw]{1,2}[a-z]{0,9}\s*[.,:;]?\s*[-—–~^]*\s*/;
const U_RUN = /OPAN\S*\s*[.,]?\s*\d*\s*[-.,]?\s*$|S[RI]I\s+S[AÄ]NKARA'?S?\s+C\S*\.?\s*\d*\s*[-.,]?\s*$|^\d{1,3}[-.,]?$|^.{1,2}$/i;
const uGarbage = l => {
  if (!l) return true;
  const ns = l.replace(/\s/g, ''), lt = (l.match(/[A-Za-z]/g) || []).length / ns.length;
  const sym = (l.match(/[\\^|%*$#@{}\[\]~<>®■«»¥°¬]/g) || []).length;
  return sym >= 2 || lt < 0.6 || (ns.length < 12 && !/[a-z]{3}/.test(l)) || (/\bI[IH1l|]{1,3}\s*$/.test(l) && lt < 0.9 && !/[a-z]{3,}\s[a-z]{3,}\s[a-z]{3,}/.test(l));
};
const uNum = s => +s.replace(/[Iil]/g, '1').replace(/S/g, '5').replace(/[Oo]/g, '0');
/* parts: [{from, to, count}] line ranges; returns [{part, n, b, s}] (s = the verse paragraph's first line) */
function markerHeads(L, parts) {
  const heads = [];
  parts.forEach((p, k) => {
    const cand = [];
    for (let i = p.from; i < p.to; i++) { const m = L[i].match(U_MARK); if (!m) continue; const n = uNum(m[1]), n2 = m[2] ? uNum(m[2]) : n; if (n >= 1 && n <= p.count) cand.push({ i, n, b: n2 >= n && n2 <= n + 3 ? n2 : n }); }
    const dp = cand.map(() => 1), prev = cand.map(() => -1);
    for (let a = 0; a < cand.length; a++) for (let b = 0; b < a; b++) if (cand[b].b < cand[a].n && cand[a].n - cand[b].b <= 6 && dp[b] + 1 > dp[a]) { dp[a] = dp[b] + 1; prev[a] = b; }
    let best = -1; for (let a = 0; a < cand.length; a++) if (best < 0 || dp[a] > dp[best]) best = a;
    const chain = []; for (let a = best; a >= 0; a = prev[a]) chain.unshift(cand[a]);
    let lo = p.from;
    for (const c of chain) {
      const first = cand.find(x => x.n === c.n && x.i >= lo && x.i <= c.i) || c;
      let s = first.i;
      if (/^\(\s*\S{1,3}\s*\)\s*[.,;:]?$/.test(L[s])) while (s - 1 > lo && !L[s - 1]) s--;   // "( 8 )" on a line of its own
      heads.push({ part: k + 1, n: first.n, b: first.b, s: verseStart(L, s, lo) }); lo = first.i + 1;
    }
  });
  return heads;
}
/* the first line of the verse paragraph that holds line s */
function verseStart(L, s, lo) {
  for (;;) {
    while (s - 1 >= lo && L[s - 1] && !uGarbage(L[s - 1]) && !U_RUN.test(L[s - 1]) && !U_MARK.test(L[s - 1]) && !U_COM.test(L[s - 1])) s--;
    // a verse broken by the page or a stray blank line: carry on up if the line above does not end a sentence,
    // and the part above is short and opens right after the Sanskrit verse or a finished sentence
    // (else a page the scan lacks would glue on another verse's commentary)
    let t = s - 1; while (t > lo && (!L[t] || U_RUN.test(L[t]))) t--;
    if (!/^[a-z(]/.test(L[s] || '')) break;   // only a sentence that runs on
    if (!(t > lo && t < s - 1 && !/[.?!:;)"'’”]\s*$/.test(L[t]) && !uGarbage(L[t]) && !U_MARK.test(L[t]) && !U_COM.test(L[t]))) break;
    let u = t, lines = 1;   // the part above: up over lines that do not end a sentence (blank lines too), five at most
    for (;;) {
      let v = u - 1; while (v > lo && !L[v]) v--;
      if (v <= lo || uGarbage(L[v]) || U_RUN.test(L[v]) || U_MARK.test(L[v]) || U_COM.test(L[v]) || /^.{1,2}$/.test(L[v]) || /[.?!]["'’”)]?\s*$/.test(L[v]) || ++lines > 5) break;
      u = v;
    }
    let g = u - 1; while (g > lo && (!L[g] || /^.{1,2}$/.test(L[g]))) g--;
    if (g > lo && L[g] && lines <= 5 && !U_RUN.test(L[g]) && (uGarbage(L[g]) || U_MARK.test(L[g]) || /[.?!]["'’”)]?\s*$/.test(L[g]))) s = u; else break;
    if (s - 1 <= lo) break;
  }
  return s;
}
/* "Com."-label edition (1898): the k-th label of a part opens verse k (numbered later by alignment) */
function labelHeads(L, parts) {
  const heads = [];
  parts.forEach((p, k) => {
    for (let i = p.from; i < p.to; i++) {
      if (!U_COM.test(L[i])) continue;
      // the verse is the paragraph just above the label
      let j = i - 1; while (j > p.from && (!L[j] || U_RUN.test(L[j]))) j--;
      let s = j; while (s - 1 > p.from && L[s - 1] && !uGarbage(L[s - 1]) && !U_RUN.test(L[s - 1]) && !U_COM.test(L[s - 1])) s--;
      if (heads.length && heads[heads.length - 1].label >= s) s = i;   // no verse of its own
      heads.push({ part: k + 1, s, label: i });
    }
  });
  return heads;
}
/* a segment's lines -> verse and commentary */
function uCut(lines) {
  const keep = lines.filter(l => !l || (!U_RUN.test(l) && !uGarbage(l)));
  let k = keep.findIndex(l => U_COM.test(l));
  const labelled = k >= 0;
  let verseL, commL;
  if (k >= 0) { verseL = keep.slice(0, k); commL = keep.slice(k); commL[0] = commL[0].replace(U_COM_LABEL, ''); }
  else {
    k = keep.findIndex(l => U_MARK.test(l));
    if (k < 0) { k = keep.findIndex((l, i) => i > 0 && !l && keep[i - 1]); if (k < 0) k = keep.length; k--; }   // no label, no number: the first paragraph
    verseL = keep.slice(0, k + 1); commL = keep.slice(k + 1);
  }
  const verse = paragraphs(verseL).join(' ').replace(/\s*\(\s*[0-9IilSOo]{1,2}(?:\s*[-–&,]\s*[0-9IilSOo]{1,2})?\s*[.,:;+\-]?\s*[)|\]]\s*[.,;:]?\s*$/, '')
    .replace(/^.{0,30}?[Ii1l|]{2}\s*\S{1,4}\s*[Ii1l|]{2}\s+(?=[A-Z‘'"(])/, '');   // the Sanskrit verse's "|| N ||" glued to the English
  // a short paragraph with hardly an English word in it is the next verse's Sanskrit, read as Roman letters
  const comm = paragraphs(commL).filter(p => !(p.length < 40 && (p.match(/\b[a-z]{3,}\b/g) || []).length < 2)).join('\n\n');
  return { verse, comm, labelled };
}
/* a verse the primary scan lost: its first words, from the other scan, found again in the primary */
function findAgain(L, lo, hi, want) {
  let best = -1, bs = 0.6;
  for (let i = lo; i < hi; i++) { if (!L[i] || uGarbage(L[i])) continue; const d = dice(letters(L[i] + ' ' + (L[i + 1] || '')).slice(0, 50), want); if (d > bs) { bs = d; best = i; } }
  return best;
}
const firstWords = (L, s) => letters(L[s] + ' ' + (L[s + 1] || '')).slice(0, 50);
/* one Upanishad from two scans: primary P (text used) and fallback F; heads carry part and n */
function mergeScans(P, F, counts, keyOf) {
  const segs = {}, from = {}, recovered = [];
  const byKey = (X, part, n) => X.heads.find(h => h.part === part && h.n <= n && n <= (h.b || h.n));
  for (let part = 1; part <= counts.length; part++) for (let n = 1; n <= counts[part - 1]; n++) {
    if (byKey(P, part, n)) continue;
    const fh = byKey(F, part, n); if (!fh || fh.n !== n) continue;
    const prev = P.heads.filter(h => h.part === part && (h.b || h.n) < n).pop(), next = P.heads.find(h => (h.part === part && h.n > n) || h.part > part);
    const hi = next ? next.s : P.parts[part - 1].to;
    const lo = prev ? prev.s + 1 : P.parts[part - 1].from;
    let at = findAgain(P.L, lo, hi, firstWords(F.L, fh.s));
    if (at >= 0) at = verseStart(P.L, at, lo);
    // found only if it opens a verse, not a commentary (a page the scan lacks leaves the words elsewhere)
    if (at >= 0 && uCut(P.L.slice(at, hi)).verse.length > 20) { P.heads.push({ part, n, b: n, s: at }); P.heads.sort((x, y) => x.s - y.s); recovered.push(keyOf(part, n)); }
  }
  const cutFrom = (X, k) => { const h = X.heads[k], nx = X.heads[k + 1], pe = X.parts[h.part - 1].to; return uCut(X.L.slice(h.s, nx && nx.s < pe ? nx.s : pe)); };
  const fsegs = {};
  F.heads.forEach((h, k) => { if (h.n) fsegs[h.part + '.' + h.n] = { ...cutFrom(F, k), b: h.b || h.n }; });
  P.heads.forEach((h, k) => {
    const key = h.part + '.' + h.n, s = { ...cutFrom(P, k), b: h.b || h.n }, f = fsegs[key];
    from[key] = 'P';
    // a part the primary scan lacks (a page missing): the fallback's words for that part
    if (f && !s.verse && f.verse) { s.verse = f.verse; from[key] = 'P+F'; }
    if (f && f.labelled && !s.labelled && s.comm.length < 40 && f.comm.length > s.comm.length) { s.comm = f.comm; from[key] = 'P+F'; }
    segs[key] = s;
  });
  for (const [key, f] of Object.entries(fsegs)) {        // still missing: the fallback's own words
    const [part, n] = key.split('.').map(Number);
    if (segs[key] || byKey(P, part, n)) continue;
    segs[key] = f; from[key] = 'F';
  }
  return { segs, from, recovered };
}
/* Sankara's introduction: from "Sri Sankara's Introduction" to the first verse */
function introOf(L, from, to) {
  const lines = L.slice(from + 1, to).filter(l => !l || (!U_RUN.test(l) && !uGarbage(l)));
  return paragraphs(lines).filter(p => p.length > 60).join('\n\n');
}

/* ---- Madhva: Vasu, SBH vol. 1 ---- */
const V_HEAD = /^[^A-Za-z]{0,2}M[au]n[tl]r[au]\s*[.,]?\s+([0-9IiljSOotn <]{1,4})\s*[.,]?\s*$/;
const V_TRANS = /^[^A-Za-z0-9]{0,2}([0-9IiljSOo]{1,2})\s*(?:[.,]\s*[—–-]?\s*["“'‘(]?[A-Z]|[—–]\s*["“'‘(]?[A-Za-z])/;
const V_HEADS = /^[^A-Za-z]{0,2}M[au]n[tl]r[au]s\s+([0-9IiljSOotn]{1,3})\s+(?:and|&)\s+([0-9IiljSOotn]{1,3})\s*[.,]?\s*$/;   // "Mantras 7 and 8."
const V_MADHVA = /^MAD[HIY]\S*\s*['’`]?S\s+COMMENTARY/i;
const V_STOP = /^Note\s*[.,]?\s*[—-]|^[^A-Za-z]{0,2}M[au]n[tl]r[au]\s*[.,]?\s+\S{1,4}\s*[.,]?\s*$|^MAD[HIY]\S*\s*['’`]?S\s+SALUTATION|^Peace chant|^(First|Second|Third|Fourth|Fifth|Sixth)\s+([VY]a[l1i]{2}i|Khanda)/i;
const V_RUN = /UPAN[IT1]\S*\s*[.,]?\s*\d*$|^[IV1l]+\s+[VY]ALL\S*\s*,?\s*\d*\s*\.?$|^[IV1l]+\s+KHA\S+\s*,?\s*\d*\s*\.?$|^\d{1,3}$|^.{1,2}$/i;
const vNum = s => { s = s.replace(/\s/g, '').replace(/[Iilj]/g, '1').replace(/S/g, '8').replace(/[Oo]/g, '0').replace(/^t0$/, '10').replace(/^n$/, '11').replace(/^t/, '1').replace(/</g, '1'); return /^\d+$/.test(s) ? +s : NaN; };
function vasuUpanishad(L, from, to, counts, name) {
  const ORDW = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
  let part = 1, last = 0;
  const mantras = [], opening = [];
  let cur = null;
  // a mantra opens at its "Mantra N." heading (the OCR's number is checked against the order),
  // or at a translation "N. ..." whose heading the OCR lost
  const open = n => {
    if (n === 1 && last >= 3 && part < counts.length) { part++; last = 0; }
    if (!(n > last && n <= last + 3)) n = last + 1;
    if (n > counts[part - 1]) throw new Error('Vasu, ' + name + ': mantra ' + n + ' beyond the ' + counts[part - 1] + ' of part ' + part);
    cur = { part, n, trans: '', madhva: '' }; mantras.push(cur); last = n;
  };
  for (let i = from; i < to; i++) {
    const l = L[i];
    const pv = l.toLowerCase().match(/^(first|second|third|fourth|fifth|sixth)\s+([vy]a[l1i]{2}i|khanda)\s*[.,]?$/);
    if (pv) { const k = ORDW.indexOf(pv[1]) + 1; if (k > part) { part = k; last = 0; } continue; }
    const hm = l.match(V_HEAD);
    if (hm) { open(vNum(hm[1])); continue; }
    const h2 = l.match(V_HEADS);
    if (h2) { open(vNum(h2[1])); const b = vNum(h2[2]); if (b > cur.n && b <= counts[part - 1]) { cur.b = b; last = b; } continue; }
    if (V_MADHVA.test(l)) {
      const block = [];
      let j = i + 1;
      for (; j < to && !V_STOP.test(L[j]) && !V_MADHVA.test(L[j]) && !(V_TRANS.test(L[j]) && !L[j - 1]); j++) if (!V_RUN.test(L[j])) block.push(L[j]);
      const text = paragraphs(block).join('\n\n');
      if (cur) cur.madhva = [cur.madhva, text].filter(Boolean).join('\n\n'); else opening.push(text);
      i = j - 1; continue;
    }
    // Vasu's translation: a paragraph "N. ..." ending "—M." (his running count)
    const tm = l.match(V_TRANS);
    if (tm) {
      const n = vNum(tm[1]);
      const prevOk = !L[i - 1] || V_HEAD.test(L[i - 1]);
      let j = i; const para = [];
      while (j < to && L[j] && !V_MADHVA.test(L[j]) && !V_STOP.test(L[j])) { para.push(L[j]); j++; }
      const text = paragraphs(para).join(' ');
      const dashEnd = /[—–-]\s*\S{1,6}\s*$/.test(text);
      const trans = text.replace(/^[^A-Za-z0-9]{0,2}[0-9IiljSOo]{1,2}\s*[.,]\s*[—–-]?\s*/, '').replace(/\s*[—–-]\s*\S{1,6}\s*$/, '');
      if (cur && !cur.trans && (n === cur.n || (prevOk && dashEnd && (isNaN(n) || !(n > last && n <= last + 3))))) cur.trans = trans;
      else if (prevOk && (n === last + 1 || (n > last && n <= last + 3 && dashEnd))) { open(n); cur.trans = trans; }
      else continue;
      i = j - 1;
    }
  }
  const got = counts.map((c, k) => mantras.filter(m => m.part === k + 1).length);
  const lastN = counts.map((c, k) => Math.max(0, ...mantras.filter(m => m.part === k + 1).map(m => m.n)));
  lastN.forEach((n, k) => { if (n !== counts[k]) throw new Error('Vasu, ' + name + ': part ' + (k + 1) + ' ends at mantra ' + n + ', the standard count is ' + counts[k]); });
  return { mantras, opening: opening.join('\n\n'), got };
}

/* ---- the Sri Bhasya's citations (SBE 48) ---- */
function sbe48Cites(texts) {
  const fix = s => s.replace(/[il|]/g, '1').replace(/[oO]/g, '0').replace(/a/g, '2').replace(/[sS]/g, '5').replace(/[jJ]/g, '1');
  const roman = s => ({ I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, 1: 1, 11: 2, 111: 3, Ill: 3, IL: 2, Il: 2 })[s.replace(/\s/g, '')];
  const res = { katha: new Set(), isa: new Set(), kena: new Set() };
  for (let t of texts) {
    t = t.replace(/-\s*\n\s*/g, '').replace(/\s+/g, ' ');
    const cut = t.search(/INDEX OF QUOTATIONS\.?\s*A[i1]/); if (cut > 0) t = t.slice(0, cut);
    for (const m of t.matchAll(/K[aâ]\.?\s*Up\.?\s*,?\s*(I{1,2}|1{1,2}|Il|IL)\s*[,;.]\s*([1-6ilIa%])\s*[,;.]\s*([0-9ilIoOa%]{1,2})\b/g)) {
      const A = roman(m[1]), V = +fix(m[2]), n = +fix(m[3]);
      if (!A || !V || !n) continue;
      const valli = A === 2 && V > 3 ? V - 3 : V, adh = A === 2 && V > 3 ? 2 : A;   // Thibaut: II, 4-6 = 2.1-2.3
      if (adh === 1 && valli > 3) continue;
      const c = KATHA_COUNTS[(adh - 1) * 3 + valli - 1];
      if (c && n <= c) res.katha.add(adh + '.' + valli + '.' + n);
    }
    for (const m of t.matchAll(/[IÎ][sś][aâ]?\.?\s*Up\.?\s*,?\s*([0-9ilo]{1,2})\b/g)) { const n = +fix(m[1]); if (n >= 1 && n <= 18) res.isa.add(String(n)); }
    for (const m of t.matchAll(/Ke(?:na)?[.,]?\s*Up\.?\s*,?\s*(IV|III|Ill|II|I|1)\s*[,;.]\s*([0-9ilo]{1,2})\b/g)) { const k = roman(m[1]) || 3, n = +fix(m[2]); if (n >= 1 && n <= KENA_COUNTS[k - 1]) res.kena.add(k + '.' + n); }
  }
  const sort = s => [...s].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return { katha: sort(res.katha), isa: sort(res.isa), kena: sort(res.kena) };
}

/* ---- the sections ---- */
function sections() {
  const out = [{ slug: 'isa-upanishad', up: 'isa', part: 1, label: n => 'Isa ' + n, count: 18 }];
  KATHA_PARTS.forEach((p, k) => out.push({ slug: 'katha-upanishad-' + p.replace('.', '-'), up: 'katha', part: k + 1, label: n => 'Katha ' + p + '.' + n, count: KATHA_COUNTS[k] }));
  KENA_COUNTS.forEach((c, k) => out.push({ slug: 'kena-upanishad-' + (k + 1), up: 'kena', part: k + 1, label: n => 'Kena ' + (k + 1) + '.' + n, count: c }));
  return out;
}

async function upanishads(h) {
  const v1 = norm(await djvu(h, 'upan-sankara', IA.vol1));
  const v1b = norm(await djvu(h, 'upan-sankara', IA.vol1b));
  const k28 = norm(await djvu(h, 'upan-sankara', IA.katha28));
  const k98 = norm(await djvu(h, 'upan-sankara', IA.katha98));
  const vasu = norm(await djvu(h, 'upan-madhva', IA.vasu));
  const sbe = [await djvu(h, 'upan-sribhasya', IA.sbe48), await djvu(h, 'upan-sribhasya', IA.sbe48b)];

  /* Sankara, Isa and Kena: the 1905 volume, "Sri Sankara's Introduction" opens each */
  const intros = L => L.map((l, i) => /Sankara.?s +Introduction/i.test(l) ? i : -1).filter(i => i >= 0);
  const vol = L => { const at = intros(L); if (at.length < 3) throw new Error('Sitarama Sastri vol. 1: the introductions not found'); return { isa: { from: at[0], to: at[1], count: 18 }, kena: { from: at[1], to: at[2], count: 34 } }; };
  const V1 = vol(v1), V1b = vol(v1b);
  const scan = (L, p) => ({ L, parts: [p], heads: markerHeads(L, [p]) });
  const isaP = scan(v1, V1.isa), kenaP = scan(v1, V1.kena);
  const isa = mergeScans(isaP, scan(v1b, V1b.isa), [18], (p, n) => 'Isa ' + n);
  const kena = mergeScans(kenaP, scan(v1b, V1b.kena), [34], (p, n) => 'Kena ' + n);
  const kenaStd = n => { let k = 0; while (n > KENA_COUNTS[k]) { n -= KENA_COUNTS[k]; k++; } return [k + 1, n]; };

  /* Sankara, Katha: 1928 (numbered) and 1898 (numbered here by aligning its verses to 1928's) */
  const kathaParts = (L, lo, hi) => {
    const P = []; for (let i = lo; i < hi; i++) if (/^P[AÄ]RT\s+[IVX1l]+\s*[.,]?$/.test(L[i])) P.push(i);
    const starts = [lo, ...P.filter(i => i > lo + 400)].slice(0, 6);
    if (starts.length !== 6) throw new Error('Katha: ' + starts.length + ' parts found, expected 6');
    return starts.map((s, k) => ({ from: s, to: k < 5 ? starts[k + 1] : hi, count: KATHA_COUNTS[k] }));
  };
  const k28from = k28.findIndex(l => /ANNIE BESANT/.test(l)), k28to = k28.findIndex((l, i) => i > k28from && /Here ends the Kath/i.test(l));
  const k98from = k98.findIndex(l => /Kathopanishad ?is begun/i.test(l)), k98to = k98.findIndex((l, i) => i > k98from && /Here ends the Kath/i.test(l));
  if (k28from < 0 || k28to < 0 || k98from < 0 || k98to < 0) throw new Error('Katha: the bounds of the text not found');
  const K28 = { L: k28, parts: kathaParts(k28, k28from, k28to) }; K28.heads = markerHeads(k28, K28.parts);
  // 2.2.11 prints no "(11)" in 1928: found by its words
  const KATHA_FIX = { '5.11': /^As the sun, the eye of all the world/ };
  for (const [key, re] of Object.entries(KATHA_FIX)) {
    const [part, n] = key.split('.').map(Number);
    if (K28.heads.some(x => x.part === part && x.n === n)) continue;
    const p = K28.parts[part - 1]; const at = k28.findIndex((l, i) => i >= p.from && i < p.to && re.test(l));
    if (at >= 0) { K28.heads.push({ part, n, b: n, s: at }); K28.heads.sort((x, y) => x.s - y.s); }
  }
  const K98 = { L: k98, parts: kathaParts(k98, k98from, k98to) };
  const lab = labelHeads(k98, K98.parts);
  const tri = (L, s, e) => letters(L.slice(s, e).filter(l => l && !uGarbage(l)).join(' ')).slice(0, 160);
  const ref28 = K28.heads.map((x, k) => ({ part: x.part, n: x.n, t: tri(k28, x.s, K28.heads[k + 1] ? K28.heads[k + 1].s : k28to).slice(0, 120) }));
  lab.forEach(x => { const t = tri(k98, x.s, x.label); if (t.length < 30) return; let best = null, bs = 0.55; for (const r of ref28) { if (r.part !== x.part) continue; const d = dice(t, r.t.slice(0, t.length)); if (d > bs) { bs = d; best = r; } } if (best) x.n = best.n; });
  for (let part = 1; part <= 6; part++) {   // keep the aligned numbers that run in order (the longest such run)
    const xs = lab.filter(x => x.part === part && x.n);
    const dp = xs.map(() => 1), pv = xs.map(() => -1);
    for (let a = 0; a < xs.length; a++) for (let b = 0; b < a; b++) if (xs[b].n < xs[a].n && dp[b] + 1 > dp[a]) { dp[a] = dp[b] + 1; pv[a] = b; }
    let best = -1; xs.forEach((x, a) => { if (best < 0 || dp[a] > dp[best]) best = a; });
    const keep = new Set(); for (let a = best; a >= 0; a = pv[a]) keep.add(xs[a]);
    xs.forEach(x => { if (!keep.has(x)) delete x.n; });
  }
  lab.forEach((x, k) => {   // between two aligned neighbours, a gap as wide as the run of labels numbers them in order
    if (x.n) return;
    let a = k - 1; while (a >= 0 && !lab[a].n && lab[a].part === x.part) a--;
    let c = k + 1; while (c < lab.length && !lab[c].n && lab[c].part === x.part) c++;
    const A = a >= 0 && lab[a].part === x.part ? lab[a] : null, C = c < lab.length && lab[c].part === x.part ? lab[c] : null;
    const partStart = lab.findIndex(y => y.part === x.part);
    if (A && C && C.n - A.n === c - a) x.n = A.n + (k - a);
    else if (!A && C && C.n - (c - k) === k - partStart + 1) x.n = C.n - (c - k);
    else if (A && !C && A.n + (c - a - 1) === KATHA_COUNTS[x.part - 1]) x.n = A.n + (k - a);   // the run ends the part
  });
  K98.heads = lab.filter(x => x.n).map(x => ({ part: x.part, n: x.n, b: x.n, s: x.s }));
  const katha = mergeScans(K28, K98, KATHA_COUNTS, (p, n) => 'Katha ' + KATHA_PARTS[p - 1] + '.' + n);

  /* Madhva (Vasu) */
  const vIsa = vasu.findIndex(l => /^ISAVASYA-UPANISAD\.?\s*$/.test(l));
  const vKena = vasu.findIndex((l, i) => i > vIsa && /^KENA UPANISAD/.test(l));
  const vKatha = vasu.findIndex((l, i) => i > vKena && /^KATHA UPANISAD\.?\s*$/.test(l));
  const vEnd = vasu.findIndex((l, i) => i > vKatha && /Alphabetical Index/i.test(l));
  if ([vIsa, vKena, vKatha, vEnd].some(x => x < 0)) throw new Error('Vasu: the bounds of the Isa, Kena or Katha not found');
  const mIsa = vasuUpanishad(vasu, vIsa, vKena, [18], 'Isa');
  const mKena = vasuUpanishad(vasu, vKena, vKatha, KENA_COUNTS, 'Kena');
  const mKatha = vasuUpanishad(vasu, vKatha, vEnd, KATHA_COUNTS, 'Katha');

  const cites = sbe48Cites(sbe);

  /* packets */
  const SK_ED = {
    isa: 'S. Sitarama Sastri, The Upanishads and Sri Sankara’s Commentary, vol. 1 (1905 printing), archive.org ' + IA.vol1 + ' (and ' + IA.vol1b + ' where its OCR lost a verse) (OCR)',
    kena: 'S. Sitarama Sastri, The Upanishads and Sri Sankara’s Commentary, vol. 1 (1905 printing; the pada-bhāṣya), archive.org ' + IA.vol1 + ' (and ' + IA.vol1b + ' where its OCR lost a verse) (OCR)',
    katha: 'S. Sitarama Sastri, The Katha and Prasna Upanishads and Sri Sankara’s Commentary, 2nd ed. (1928), archive.org ' + IA.katha28 + ' (and the 1898 edition, ' + IA.katha98 + ', where the 1928 scan lacks a verse) (OCR)'
  };
  const words = {}, gaps = { shankara: [], madhva: [] };
  for (const sec of sections()) {
    const sk = [], md = [];
    let intro = '';
    if (sec.up === 'isa') {
      intro = introOf(v1, V1.isa.from, isaP.heads[0] ? isaP.heads[0].s : V1.isa.to);
      for (let n = 1; n <= 18; n++) { const s = isa.segs['1.' + n]; if (s) sk.push({ base: '[' + sec.label(n) + (s.b > n ? ' to ' + s.b : '') + '] ' + s.verse, comm: s.comm }); else gaps.shankara.push(sec.label(n)); }
    } else if (sec.up === 'kena') {
      if (sec.part === 1) intro = introOf(v1, V1.kena.from, kenaP.heads[0] ? kenaP.heads[0].s : V1.kena.to);
      for (let N = 1; N <= 34; N++) {
        const [k, n] = kenaStd(N); if (k !== sec.part) continue;
        const s = kena.segs['1.' + N];
        if (s) { const [k2, n2] = kenaStd(s.b); sk.push({ base: '[' + sec.label(n) + (s.b > N ? ' to ' + k2 + '.' + n2 : '') + '] ' + s.verse, comm: s.comm }); } else gaps.shankara.push(sec.label(n));
      }
    } else {
      for (let n = 1; n <= sec.count; n++) { const s = katha.segs[sec.part + '.' + n]; if (s) sk.push({ base: '[' + sec.label(n) + (s.b > n ? ' to ' + KATHA_PARTS[sec.part - 1] + '.' + s.b : '') + '] ' + s.verse, comm: s.comm }); else gaps.shankara.push(sec.label(n)); }
    }
    if (intro && sk.length) sk.unshift({ base: '[' + (sec.up === 'isa' ? 'Isa' : 'Kena') + ', Śaṅkara’s introduction]', comm: intro });
    const M = sec.up === 'isa' ? mIsa : sec.up === 'kena' ? mKena : mKatha;
    if (M.opening && sec.part === 1) md.push({ base: '[' + (sec.up === 'isa' ? 'Isa' : sec.up === 'kena' ? 'Kena' : 'Katha') + ', Madhva’s opening, before the first mantra]', comm: M.opening });
    for (const m of M.mantras) if (m.part === sec.part && m.madhva) md.push({ base: '[' + sec.label(m.n) + (m.b ? ' to ' + sec.label(m.b).replace(/^\S+ /, '') : '') + '] ' + (m.trans || '(Vasu’s translation of this mantra is not legible in the OCR)'), comm: m.madhva });
    const cited = sec.up === 'isa' ? cites.isa : sec.up === 'kena' ? cites.kena.filter(x => x.startsWith(sec.part + '.')).map(x => 'Kena ' + x)
      : cites.katha.filter(x => x.startsWith(KATHA_PARTS[sec.part - 1] + '.')).map(x => 'Katha ' + x);
    const packet = {
      plan: 'upanishads', ch: sec.slug,
      sources: [
        { id: 'shankara', name: 'Śaṅkara (Advaita)', edition: SK_ED[sec.up], url: details(sec.up === 'katha' ? IA.katha28 : IA.vol1), licence: 'public domain', segs: sk,
          note: groupNote(sk.filter(x => !/introduction\]/.test(x.base)), 'Śaṅkara') },
        { id: 'madhva', name: 'Madhva (Dvaita)', edition: 'S. C. Vasu, The Sacred Books of the Hindus vol. 1 (1909 to 1911), archive.org ' + IA.vasu + ' (OCR)',
          url: details(IA.vasu), licence: 'public domain', segs: md,
          note: 'Only the mantras Madhva comments on; the text is Vasu’s translation, and square brackets inside Madhva’s words are Vasu’s.' },
        { id: 'sri-bhasya', name: 'the Śrī Bhāṣya (Rāmānuja): verses of this section it treats', edition: 'G. Thibaut, The Vedanta-Sutras with the Commentary by Ramanuja, SBE 48 (1904), archive.org ' + IA.sbe48 + ' and ' + IA.sbe48b + ' (OCR)',
          url: details(IA.sbe48), licence: 'public domain',
          notes: (cited.length ? 'Cited: ' + (sec.up === 'isa' ? cited.map(x => 'Isa ' + x) : cited).join(', ') + '.' : 'No verse of this section found cited.') + ' Partial: quotations the scan missed are not listed.' }
      ]
    };
    words[sec.slug] = writePacket(h, 'upanishads', sec.slug, packet);
  }
  console.log('  upanishads: ' + sections().length + ' packets written to .scripts/.cache/teachings/upanishads/'
    + (gaps.shankara.length ? ' (Śaṅkara missing: ' + gaps.shankara.join(', ') + ')' : ''));
  return { words, gaps, recovered: { isa: isa.recovered, kena: kena.recovered, katha: katha.recovered },
    fromFallback: { isa: Object.keys(isa.from).filter(k => isa.from[k] === 'F'), kena: Object.keys(kena.from).filter(k => kena.from[k] === 'F'), katha: Object.keys(katha.from).filter(k => katha.from[k] === 'F') },
    vasuCounts: { isa: mIsa.got, kena: mKena.got, katha: mKatha.got } };
}

module.exports = { gita, upanishads, GITA_COUNTS, KATHA_COUNTS, KENA_COUNTS, IA,
  _test: { norm, uGarbage, verseStart, sastriHeads, govindHeads, subbaSegs, telangChapters, markerHeads, labelHeads, uCut, vasuUpanishad, sbe48Cites } };
