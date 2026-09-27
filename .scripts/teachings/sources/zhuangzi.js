/* The Teachings: the Zhuangzi commentaries, one packet per chapter.

   const zhuangzi = require('./sources/zhuangzi');
   await zhuangzi.build({ get, wsUrl, wsPage, CACHE, packetsOnly });

   Writes .scripts/.cache/teachings/zhuangzi/<NN>.json for chapters 1 to 33:
     { plan: 'zhuangzi', ch, sources: [{ id, name, edition, url, licence, note?, segs?, notes? }] }
   In the Guo Xiang segs each base starts with the Giles paragraphs it answers,
   "[2.12 to 2.15] " or "[2.12] ", and a note on the chapter title has the base
   "[2 title] " + the title. packet.js --verse reads that label.

   Sources (tested 2026-09-26):
     Guo Xiang  zh.wikisource 南華真經註疏/卷一..卷三十五, the Zhengtong Daozang
                edition (DZ0745) with Cheng Xuanying's 疏, pinned in JUAN. A
                chapter opens "==內篇逍遙遊第一==" (juan 3 and 8 carry on
                chapters 2 and 6; from juan 10 on, juan n is chapter n-2). Guo
                is a line "{{*|〔註〕...}}" (juan 1-2) or "{{*|〔注〕...}}" (3-35);
                Cheng is "{{annotation|〔疏〕...}}", and is dropped; both follow
                the base text they gloss. A comment before any base text is on
                the chapter title. The juan's own header lines (書名, 河南郭象注,
                唐西華法師成玄英疏) are dropped.
                Checked against Kanripo KR5c0139 (the same edition, the 涵芬樓
                print, commit 28088c9): the two agree to within one to three
                commented runs a chapter and 0.3% of Guo's 56.5k characters.
                Known slips, handled here: one 注 without its marker (the 齊物論
                title note, juan 2) and one "［註〕"; in juan 8 a 注 left open
                and closed after the next 疏 ("}}}}"), so each template is
                closed at the end of its own line; the 逍遙遊 title note printed
                after the first sentence (TITLE_NOTE_MOVED).
     Legge      SBE 39 (books I to XVII) and SBE 40 (XVIII to XXXIII), 1891,
                archive.org sacredbooksofchi01oxfo and sacredbooksofchi02oxfo,
                the OCR _djvu.txt. A book runs from "BOOK <roman>." to the next
                (SBE 39 stops at the transliteration table, SBE 40 at the
                Thai-shang tractate); pages break at the running heads, and a
                page's footnotes are its paragraphs from the first that opens
                with a note mark (a digit, ^, \, -, ', * or a lone letter, then
                two spaces). The Introduction's "Brief Notices of the Different
                Books" (SBE 39) gives each book a notice, found by its heading
                "Book <roman>.  <title>".

   Alignment. Giles' paragraphs (the plan's blocks, less the notes in
   zhuangzi-notes.json, the Argument and the "* * *" breaks) are aligned to
   the sentences of the base text (cut after 。？！) in order: each paragraph
   takes none to eight consecutive sentences, a sentence Giles leaves out may
   be skipped, and the cost is the squared log ratio of English words to
   Chinese characters (the ratio fitted per chapter, 1.2 to 1.45) less a bonus
   for each name or number both sides share (LEX). A run's label spans every
   paragraph that took one of its sentences; a paragraph that took none (a
   fragment Giles cut off with a note) joins both neighbours' runs; a run no
   paragraph took is labelled from its neighbours. Checked by hand on chapters
   1, 2 and 18: right, or one or two sentences off at a boundary. */
'use strict';
const fs = require('fs');
const path = require('path');
const A = require('../../plans/atoms');

const WS_LICENCE = 'public domain text; transcription CC BY-SA 4.0 (Wikisource)';
const JUAN = [['卷一', 6351652], ['卷二', 5978516], ['卷三', 6364018], ['卷四', 6353040], ['卷五', 7907034], ['卷六', 6353768], ['卷七', 6011742],
  ['卷八', 6354439], ['卷九', 6364291], ['卷十', 6364673], ['卷十一', 6355259], ['卷十二', 7907033], ['卷十三', 7907032], ['卷十四', 6356578],
  ['卷十五', 6356924], ['卷十六', 6365115], ['卷十七', 6357396], ['卷十八', 6365330], ['卷十九', 7907030], ['卷二十', 5978526], ['卷二十一', 7907029],
  ['卷二十二', 5978310], ['卷二十三', 7907028], ['卷二十四', 7907027], ['卷二十五', 6359136], ['卷二十六', 7907021], ['卷二十七', 5978511],
  ['卷二十八', 5978513], ['卷二十九', 7907026], ['卷三十', 5985055], ['卷三十一', 6005747], ['卷三十二', 6006980], ['卷三十三', 6011291],
  ['卷三十四', 7907025], ['卷三十五', 6366211]];
/* runs carrying Guo's 注, per chapter, at the pinned revisions (a guard) */
const EXPECT_ZHU = [50, 233, 51, 169, 122, 188, 65, 42, 24, 39, 133, 162, 107, 123, 48, 51, 119, 33, 85, 95, 77, 138, 152, 162, 143, 76, 65, 3, 3, 0, 1, 83, 135];
/* Wikisource prints the note on 逍遙遊's title after the chapter's first
   sentence; the Daozang print (KR5c0138/0139) has it on the title. */
const TITLE_NOTE_MOVED = { 1: '夫小大雖殊' };
const SBE = {
  39: { id: 'sacredbooksofchi01oxfo', file: 'sbe39-sacredbooksofchi01oxfo_djvu.txt', stop: /TRANSLITERATION\s+OF\s+ORIENTAL/ },
  40: { id: 'sacredbooksofchi02oxfo', file: 'sbe40-sacredbooksofchi02oxfo_djvu.txt', stop: /THE\s+THAI-SHANG/ }
};
Object.values(SBE).forEach(v => { v.url = 'https://archive.org/download/' + v.id + '/' + v.id + '_djvu.txt'; v.page = 'https://archive.org/details/' + v.id; });

const pad = n => String(n).padStart(2, '0');
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII', 'XXXIII'];
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function cnNum(s) { if (s.indexOf('十') < 0) return CN[s]; const [a, b] = s.split('十'); return (a ? CN[a] : 1) * 10 + (b ? CN[b] : 0); }
function wikitext(raw) {
  const j = JSON.parse(raw);
  if (!j.parse || typeof j.parse.wikitext !== 'string') throw new Error('no wikitext in the response');
  return j.parse.wikitext;
}
const clean = s => s.replace(/-\{([^}]*)\}-/g, '$1').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '').trim();

/* ------------------------------------------------------------- Guo Xiang */
const JUAN_HEAD = /^(南華真經[註注]疏卷之[一二三四五六七八九十]+|河南郭象[註注]|唐?西華法師成玄英疏)$/;
function zhushu(raws) {
  const ch = {}, slips = [];
  let cur = null;
  raws.forEach((raw, ji) => {
    let w = wikitext(raw);
    const oi = w.match(/<onlyinclude>([\s\S]*)<\/onlyinclude>/);
    if (oi) w = oi[1];
    let seg = null, surplus = 0;
    for (const line of w.split('\n')) {
      let l = line.trim();
      if (!l || JUAN_HEAD.test(l) || /^\{\{(Novel|footer)/.test(l) || /^<\/?onlyinclude>$/.test(l)) continue;
      const o = (l.match(/\{\{/g) || []).length, c = (l.match(/\}\}/g) || []).length;
      if (o > c && /^\{\{(\*|annotation)\|/.test(l)) { l += '}}'.repeat(o - c); surplus += o - c; slips.push(JUAN[ji][0] + ': a template left open, closed at its own line'); }
      else if (c > o && surplus) { const k = Math.min(surplus, c - o); for (let i = 0; i < k; i++) l = l.replace(/\}\}$/, ''); surplus -= k; }
      const h = l.match(/^==\s*((內篇|外篇|雜篇).+?第([一二三四五六七八九十]+))\s*==$/);
      if (h) { cur = cnNum(h[3]); ch[cur] = { title: h[1], juan: [ji], segs: [] }; seg = null; continue; }
      if (/^=/.test(l)) throw new Error(JUAN[ji][0] + ': an unknown heading ' + l);
      if (!cur) throw new Error(JUAN[ji][0] + ': text before the first chapter heading: ' + l.slice(0, 20));
      if (ch[cur].juan.indexOf(ji) < 0) ch[cur].juan.push(ji);
      let m;
      if ((m = l.match(/^\{\{\*\|([\s\S]*)\}\}$/))) {
        let t = clean(m[1]);
        const mk = t.match(/^[〔［[(（]\s*[註注]\s*[〕］\])）]/);
        if (mk) t = t.slice(mk[0].length); else slips.push(JUAN[ji][0] + ': a 注 without its marker (' + t.slice(0, 8) + '…)');
        if (!seg) { seg = { base: '', zhu: [], title: true, juan: ji }; ch[cur].segs.push(seg); }
        seg.zhu.push(t);
      } else if (/^\{\{annotation\|[\s\S]*\}\}$/.test(l)) {
        if (!seg) { seg = { base: '', zhu: [], title: true, juan: ji }; ch[cur].segs.push(seg); }
        seg.shu = true;                                   // Cheng Xuanying: dropped, but it closes the run
      } else if (/\{\{|\}\}|<|〔[註注疏]〕/.test(l)) {
        throw new Error(JUAN[ji][0] + ': a line the parser does not know: ' + l.slice(0, 40));
      } else {
        if (!seg || seg.zhu.length || seg.shu || seg.title) { seg = { base: '', zhu: [], juan: ji }; ch[cur].segs.push(seg); }
        seg.base += clean(l);
      }
    }
    if (surplus) throw new Error(JUAN[ji][0] + ': ' + surplus + ' template closer(s) never found');
  });
  for (const [n, head] of Object.entries(TITLE_NOTE_MOVED)) {
    const c = ch[n], s = c && c.segs[0];
    if (!s || s.title || s.zhu.length !== 1 || !s.zhu[0].startsWith(head)) throw new Error('chapter ' + n + ': the title note "' + head + '" is no longer after the first sentence; drop TITLE_NOTE_MOVED');
    c.segs.unshift({ base: '', zhu: s.zhu, title: true, juan: s.juan });
    s.zhu = [];
  }
  return { ch, slips };
}

/* ------------------------------------------------------------- alignment */
const LEX = [
  [/Chuang Tz/, /莊子|莊周/], [/Hui Tz/, /惠子|惠施/], [/Confucius|Chung Ni/, /孔子|仲尼|丘/], [/Lao Tz|Lao Tan/, /老聃|老子/],
  [/\bYao\b/, /堯/], [/\bShun\b/, /舜/], [/\bY[üu]\b/, /禹/], [/Huang Ti|Yellow Emperor/, /黃帝/], [/Lieh Tz/, /列子|列禦寇/],
  [/Yen Hui|\bHui\b/, /顏回|回/], [/Tz[ŭu] Kung/, /子貢|賜/], [/Tz[ŭu] Lu/, /子路|由/], [/Hs[üu] Yu/, /許由/], [/Chien Wu/, /肩吾/],
  [/Lien Shu/, /連叔/], [/Chieh Y[üu]/, /接輿/], [/\bSung\b/, /宋/], [/Ch'u\b/, /楚/], [/\bWei\b/, /魏|衛/], [/Y[üu]eh\b/, /越/],
  [/\bWu\b/, /吳/], [/\bLu\b/, /魯/], [/Ch'i\b/, /齊/], [/P'[êe]ng Tsu/, /彭祖/], [/T'ang/, /湯/], [/wind/, /風/],
  [/gourd/, /瓠/], [/tree/, /樹|木|樗|椿/], [/ninety thousand/, /九萬/], [/three thousand/, /三千/], [/five hundred/, /五百/],
  [/eight thousand/, /八千/], [/six months/, /六月/], [/three months/, /三月/], [/fifteen days/, /旬有五日/], [/Tz[ŭu] Ch'i/, /子綦/],
  [/Tz[ŭu] Yu\b/, /子游/], [/Nan-kuo/, /南郭/], [/monkey/, /狙/], [/butterfly/, /胡蝶|蝴蝶/], [/dream/, /夢/], [/Chao Wen/, /昭文|昭氏/],
  [/Wang Ni|Wang I\b/, /王倪/], [/Nieh Ch|Yeh Ch'[üu]eh/, /齧缺/], [/Ch[üu] Ch'iao/, /瞿鵲/], [/Ch'ang Wu/, /長梧/], [/Li Chi/, /麗之姬|麗姬/],
  [/penumbra|shadow/, /罔兩|景/], [/music|pipes|flute/, /籟/], [/cook|Prince Hui|Wên Hui/, /庖丁|文惠君/], [/Prince/, /王|君|公/]
];
const cjk = s => (s.match(/[㐀-鿿\u{20000}-\u{2ffff}]/gu) || []).length;
function gilesUnits(n, notes) {
  const c = A.loadPart('zhuangzi', 'all')[n - 1];
  let end = c.b.findIndex(b => b.length === 1 && b[0].trim() === '_INDEX_');
  if (end < 0) end = c.b.length;
  const out = [];
  c.b.forEach((b, k) => {
    if (!k || k >= end || (notes[n] || []).includes(k) || /^_?Argument_?\s*:/.test(b[0]) || /^\*\s+\*/.test(b[0])) return;
    const t = b.join(' ').replace(/_/g, '');
    out.push({ k, t, w: (t.match(/\S+/g) || []).length });
  });
  return out;
}
function align(E, C, K = 8) {
  const cl = C.map(s => cjk(s.base));
  const r = E.reduce((a, e) => a + e.w, 0) / cl.reduce((a, b) => a + b, 0);
  const anchorsE = E.map(e => LEX.map(([en]) => en.test(e.t)));
  const m = E.length, q = C.length, INF = 1e9;
  const D = Array.from({ length: m + 1 }, () => new Array(q + 1).fill(INF));
  const P = Array.from({ length: m + 1 }, () => new Array(q + 1).fill(null));
  D[0][0] = 0;
  for (let i = 0; i <= m; i++) for (let j = 0; j <= q; j++) {
    const d0 = D[i][j];
    if (d0 >= INF) continue;
    if (j < q) { const c = d0 + 1.5 + cl[j] / 40; if (c < D[i][j + 1]) { D[i][j + 1] = c; P[i][j + 1] = [i, j, 'skip']; } }
    if (i < m) {
      const c0 = d0 + 0.4 + E[i].w / 15;
      if (c0 < D[i + 1][j]) { D[i + 1][j] = c0; P[i + 1][j] = [i, j, 'none']; }
      let len = 0, txt = '';
      for (let k = 1; k <= K && j + k <= q; k++) {
        len += cl[j + k - 1]; txt += C[j + k - 1].base;
        let cost = Math.pow(Math.log((E[i].w + 2) / (r * len + 2)), 2) * 4 + 0.2 * (k - 1);
        LEX.forEach(([, zh], x) => { const inE = anchorsE[i][x], inC = zh.test(txt); if (inE && inC) cost -= 1.2; else if (inE !== inC) cost += 0.4; });
        const c = d0 + cost;
        if (c < D[i + 1][j + k]) { D[i + 1][j + k] = c; P[i + 1][j + k] = [i, j, 'take']; }
      }
    }
  }
  const map = E.map(() => []);
  for (let i = m, j = q; i || j;) {
    const [pi, pj, op] = P[i][j];
    if (op === 'take') for (let x = j - 1; x >= pj; x--) map[pi].unshift(x);
    i = pi; j = pj;
  }
  return { map, r };
}
/* labels for a chapter's runs: [<ch>.<a> to <ch>.<b>] */
function labels(n, segs, notes) {
  const E = gilesUnits(n, notes), C = [];
  segs.forEach((s, si) => {
    if (s.title) return;
    const parts = s.base.match(/[^。？！]+[。？！」』]*|[。？！」』]+/g) || [s.base];
    parts.forEach(p => C.push({ base: p, seg: si }));
  });
  const { map, r } = align(E, C);
  const got = segs.map(() => new Set());
  E.forEach((e, i) => map[i].forEach(x => got[C[x].seg].add(e.k)));
  E.forEach((e, i) => {
    if (map[i].length) return;
    let p = i - 1; while (p >= 0 && !map[p].length) p--;
    let q = i + 1; while (q < E.length && !map[q].length) q++;
    if (p >= 0) got[C[map[p][map[p].length - 1]].seg].add(e.k);
    if (q < E.length) got[C[map[q][0]].seg].add(e.k);
  });
  const lab = got.map(g => g.size ? [Math.min(...g), Math.max(...g)] : null);
  const guessed = [];
  segs.forEach((s, si) => {
    if (s.title || lab[si]) return;
    let p = si - 1; while (p >= 0 && !lab[p]) p--;
    let q = si + 1; while (q < segs.length && !lab[q]) q++;
    const a = p >= 0 && lab[p] ? lab[p][1] : (q < segs.length ? lab[q][0] : 1);
    const b = q < segs.length && lab[q] ? lab[q][0] : a;
    lab[si] = [Math.min(a, b), Math.max(a, b)];
    guessed.push(si);
  });
  return { lab, ratio: r, fragments: E.filter((e, i) => !map[i].length).length, guessed: guessed.length };
}

/* ------------------------------------------------------------- Legge */
const romanOf = tok => tok.replace(/[.,:;]+$/, '').replace(/H/g, 'II').replace(/[l1|]/g, 'I').replace(/L$/, 'I');
function sbeBooks(text, stop) {
  const L = text.replace(/\r/g, '').split('\n');
  const heads = [];
  L.forEach((l, i) => { const m = l.match(/^BOOK\s+([IVXL]+)\.[\s.]*$/); if (m) heads.push({ n: ROMAN.indexOf(m[1]), i }); });
  if (!heads.length) throw new Error('Legge: no BOOK headings');
  let end = L.findIndex((l, i) => i > heads[heads.length - 1].i && stop.test(l));
  if (end < 0) end = L.length;
  return heads.map((h, k) => ({ n: h.n, lines: L.slice(h.i, k + 1 < heads.length ? heads[k + 1].i : end) }));
}
/* running heads, OCR'd every which way: "166 THE TEXTS OF TAOISM. BK, I.",
   "t82 the texts of TAOISM. BK. H.", "^6 THE TEX-TS OF TAOISM. BK. XX.",
   "PT. I, SECT. I. THE WRITINGS OF A'WANG-3ZE. 165", "THE WRITINGS OP^ ...",
   and "BK. VII." alone on its line */
const RUNNING = /TEX-?TS\s+OF\s+T\S{0,4}ISM|WRITINGS\s+O\S{0,2}\s|^\s*BK[.,]\s*[IVXLvixl]+[.,]?\s*$/i;
const MARK = /^(\d{1,2}|[\^\\'*-]|[a-z])\s{2,}\S/;
const tidy = p => p.replace(/(\w)-\s*\n\s*(?=[a-z])/g, '$1').replace(/\s+/g, ' ').trim();
/* A footnote opens with a note mark. A digit, ^, \ or - is sure; ' and *
   also open Legge's quotations, so a paragraph opening with them is a note
   only in the footnotes' small type: its full lines average 55 characters or
   more (measured on both volumes: the notes' median 62.5, 5th percentile
   56.8; the text's median 49.4, 95th percentile 52.3). A one-line paragraph
   is a note when a note follows it, or nothing does. */
function noteStart(paras, j) {
  const p = paras[j];
  if (!MARK.test(p)) return false;
  if (/^(\d{1,2}|[\^\\-])\s/.test(p)) return true;
  const lines = p.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (lines.length > 1) { const full = lines.slice(0, -1); return full.reduce((a, l) => a + l.length, 0) / full.length >= 55; }
  return j === paras.length - 1 || noteStart(paras, j + 1);
}
function footnotes(book) {
  const pages = [[]];
  book.lines.forEach(l => { if (RUNNING.test(l) && l.length < 90) pages.push([]); else pages[pages.length - 1].push(l); });
  const notes = [];
  pages.forEach(pg => {
    const paras = pg.join('\n').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const first = paras.findIndex((p, j) => j > 0 && noteStart(paras, j));
    if (first < 0) return;
    let cur = null;
    for (let j = first; j < paras.length; j++) {
      const p = paras[j];
      if (/^\[\d+\]\s+[A-Z]\s*\d*$/.test(p) || /^[A-Z]\s+\d\s*$/.test(p)) continue;   // sheet signatures: "[40] B", "M 2"
      if (MARK.test(p)) { cur = tidy(p); notes.push(cur); } else if (cur) notes[notes.length - 1] = cur = cur + ' ' + tidy(p);
    }
  });
  return notes;
}
/* the Introduction's brief notice of each book (SBE 39) */
function briefNotices(text) {
  const L = text.replace(/\r/g, '').split('\n');
  const at = [];
  let from = 0;
  for (let n = 1; n <= 33; n++) {
    let hit = -1;
    for (let i = from; i < L.length; i++) {
      const m = L[i].match(/^Book\s+(\S+)\s{2,}\S/);
      if (m && romanOf(m[1]) === ROMAN[n]) { hit = i; break; }
      if (/^BOOK\s+I\.\s*$/.test(L[i])) break;              // the translation begins: stop looking
    }
    at.push(hit);
    if (hit >= 0) from = hit + 1;
  }
  const endAll = L.findIndex((l, i) => i > Math.max(...at) && /WRITINGS\s+OF/.test(l));
  const out = {}, failed = [];
  at.forEach((i, k) => {
    if (i < 0) { failed.push(k + 1); return; }
    const next = at.slice(k + 1).find(x => x >= 0);
    const lines = L.slice(i, next != null ? next : endAll)
      .filter(l => !/BRIEF\s+NOTICES\s+OF/.test(l) && !/^\s*\d{1,3}\s*$/.test(l) && !/^\s*[A-Z]\s+\d\s*$/.test(l) && !/^\s*THE\s*$/.test(l) && !/^\s*\[\d+\]/.test(l));
    const t = tidy(lines.join('\n'));
    if (t.length < 150 || t.length > 8000) failed.push(k + 1); else out[k + 1] = t;
  });
  return { out, failed };
}

/* ------------------------------------------------------------- build */
async function build(h) {
  const load = (url, file) => h.packetsOnly ? Promise.resolve(fs.readFileSync(path.join(h.CACHE, 'src', file), 'utf8')) : h.get(url, file);
  const notesFile = path.join(__dirname, '..', 'zhuangzi-notes.json');
  if (!fs.existsSync(notesFile)) throw new Error('zhuangzi-notes.json is missing: run node .scripts/teachings/zhuangzi-notes.js');
  const notes = JSON.parse(fs.readFileSync(notesFile, 'utf8'));

  const raws = [];
  for (const [, id] of JUAN) raws.push(await load(h.wsUrl(id), 'zhuangzi-zhushu-' + id + '.json'));
  const sbe39 = await load(SBE[39].url, SBE[39].file);
  const sbe40 = await load(SBE[40].url, SBE[40].file);

  const { ch, slips } = zhushu(raws);
  const books = [...sbeBooks(sbe39, SBE[39].stop), ...sbeBooks(sbe40, SBE[40].stop)];
  if (books.map(b => b.n).join() !== Array.from({ length: 33 }, (_, i) => i + 1).join()) throw new Error('Legge: books found ' + books.map(b => b.n).join(','));
  const brief = briefNotices(sbe39);

  const dir = path.join(h.CACHE, 'zhuangzi');
  fs.mkdirSync(dir, { recursive: true });
  const report = { sizes: [], fragments: 0, guessed: 0, legge: [] };
  for (let n = 1; n <= 33; n++) {
    const c = ch[n];
    if (!c) throw new Error('Guo Xiang: chapter ' + n + ' not found');
    const zhuRuns = c.segs.filter(s => s.zhu.length).length;
    if (zhuRuns !== EXPECT_ZHU[n - 1]) throw new Error('Guo Xiang: chapter ' + n + ' has ' + zhuRuns + ' commented runs, expected ' + EXPECT_ZHU[n - 1]);
    const L = labels(n, c.segs, notes);
    report.fragments += L.fragments; report.guessed += L.guessed;
    const segs = c.segs.map((s, si) => ({
      base: s.title ? '[' + n + ' title] ' + c.title
        : '[' + n + '.' + L.lab[si][0] + (L.lab[si][1] !== L.lab[si][0] ? ' to ' + n + '.' + L.lab[si][1] : '') + '] ' + s.base,
      comm: s.zhu.join(' / ')
    }));
    const jn = c.juan.map(j => JUAN[j]);
    const noteParts = ['The [n.a to n.b] labels align the Chinese to Giles’ paragraphs by length and names; they are close, not certain: confirm a line by its opening words before citing Guo Xiang on it.'];
    if (jn.length > 1) {
      const second = c.segs.findIndex(s => s.juan === c.juan[1]);
      noteParts.push('This chapter runs over two juan: ' + jn[0][0] + ' (revision ' + jn[0][1] + ', the url above) and, from the run labelled ' + segs[second].base.match(/^\[[^\]]+\]/)[0] + ', ' + jn[1][0] + ' (revision ' + jn[1][1] + ', ' + h.wsPage(jn[1][1]) + ').');
    }
    if (TITLE_NOTE_MOVED[n]) noteParts.push('Wikisource prints Guo Xiang’s note on the chapter title (' + TITLE_NOTE_MOVED[n] + '…) after the first sentence; it is given here on the title, where the Daozang print has it.');
    if (!zhuRuns) noteParts.push('Guo Xiang has no commentary on this chapter in the received text.');
    else if (zhuRuns < 5) noteParts.push('Guo Xiang comments on this chapter only ' + ['', 'once', 'twice', 'three times', 'four times'][zhuRuns] + ' in the received text.');

    const b = books[n - 1];
    const fn = footnotes(b);
    const vol = n <= 17 ? 39 : 40;
    const parts = [];
    if (brief.out[n]) parts.push('Brief notice of Book ' + ROMAN[n] + ' (SBE 39, Introduction):\n' + brief.out[n]);
    fn.forEach(t => parts.push('Note:\n' + t));
    report.legge.push(n + ':' + fn.length + (brief.out[n] ? '' : ' (no notice)'));

    const packet = {
      plan: 'zhuangzi', ch: n,
      sources: [
        { id: 'guo-xiang', name: 'Guo Xiang',
          edition: 'zh.wikisource 南華真經註疏 ' + jn.map(j => j[0]).join(' and ') + ' (the Zhengtong Daozang edition, DZ0745), revision' + (jn.length > 1 ? 's ' : ' ') + jn.map(j => j[1]).join(' and ') + '; Cheng Xuanying’s 疏 left out',
          url: h.wsPage(jn[0][1]), licence: WS_LICENCE, note: noteParts.join(' '), segs },
        { id: 'legge-sbe39', name: 'Legge’s notes',
          edition: 'James Legge, The Texts of Taoism, SBE 39 and 40 (1891), archive.org sacredbooksofchi01oxfo and 02oxfo, OCR',
          url: SBE[vol].page, licence: 'public domain',
          note: 'OCR text. Book ' + ROMAN[n] + ' is in SBE ' + vol + '. The footnotes follow in page order for the whole book; their numbers are lost, the Chinese in them is mostly garbled, and a few neighbours run together.',
          notes: parts.join('\n\n') }
      ]
    };
    const out = JSON.stringify(packet, null, 1);
    fs.writeFileSync(path.join(dir, pad(n) + '.json'), out, 'utf8');
    report.sizes.push(n + ':' + Math.round(Buffer.byteLength(out) / 1024) + 'k');
  }
  console.log('  zhuangzi: 33 packets written to .scripts/.cache/teachings/zhuangzi/ (Guo Xiang in ' + EXPECT_ZHU.reduce((a, x) => a + x, 0) + ' runs)');
  console.log('  sizes: ' + report.sizes.join(' '));
  console.log('  alignment: ' + report.fragments + ' Giles fragments joined to their neighbours, ' + report.guessed + ' runs labelled from their neighbours');
  console.log('  Legge footnotes per book: ' + report.legge.join(' '));
  if (brief.failed.length) console.log('  Legge: no clean brief notice for books ' + brief.failed.join(', '));
  if (slips.length) console.log('  source slips handled: ' + slips.join('; '));
  return report;
}

module.exports = { build };
