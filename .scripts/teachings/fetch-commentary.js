/* The Teachings, an operator tool: fetch the commentaries once, cache them,
   and cut them into one packet per chapter for the agents to read.

   node .scripts/teachings/fetch-commentary.js <plan>        fetch what is missing, then (re)write the packets
   node .scripts/teachings/fetch-commentary.js <plan> --packets   rewrite the packets from the cache only

   Raw sources go to .scripts/.cache/teachings/src/ (git ignores .cache), one
   request at a time, a second apart at least, honouring Retry-After and
   maxlag, and never fetched twice (a UTF-16 source is decoded by get's
   optional third argument and cached as UTF-8). Packets go to
   .scripts/.cache/teachings/<plan>/<chapter>.json:
     { plan, ch, sources: [{ id, name, edition, url, licence, title?, segs?: [{ base, comm }], notes? }] }
   Evidence a verifier takes from a packet cites the packet source's url, and
   recheck-evidence.js string-matches the words against the same packet.

   Sources per plan (tested 2026-09-26; see the plan's roster.json entries):
     tao  Wang Bi       zh.wikisource "道德經 (王弼本)", revision 2354026 (the 華亭張氏
                        edition): one page, chapters "==N章==", commentary lines ":{{*|...}}"
          Heshang Gong  zh.wikisource "老子河上公章句/上" revision 2019760 (chapters 1 to
                        37) and ".../德經" revision 1552800 (38 to 81): headings are the
                        chapter titles, numbered by order (never by title: 淳風 is both
                        17 and 57); the same commentary lines
          Legge's notes SBE 39 (1891), archive.org sacredbooksofchi01oxfo _djvu.txt (OCR),
                        cut chapter by chapter against Gutenberg #216 (Legge's
                        translation without notes) as the anchor
     pali (one packet per chapter of the Dhammapada, the plan's 26 days)
          dhp-commentary the Dhammapada-atthakatha in the Chattha Sangayana text (Vipassana
                        Research Institute), GitHub VipassanaTech/tipitaka-xml romn/s0502a.att.xml
                        at commit 60c7fb3 (UTF-16LE): "subhead" = story, "hangnum" + "gatha*" =
                        verse, the explanation runs from the verse to the Gathapariyosane-type
                        formula. LICENCE CAVEAT: VRI makes these files free for NON-COMMERCIAL use
                        only, with attribution; they cannot sit behind a paid boundary
          burlingame    E. W. Burlingame, Buddhist Legends, HOS 28 to 30 (1921), archive.org
                        buddhistlegends01budd, 02budd, 03budd _djvu.txt (the Princeton scans; the
                        Toronto ...burluoft OCR is far worse): the stories, found by their
                        "<Roman>. <n>." headings in the CST's order (the numbering is the same).
                        He omits the verbal glosses except on 324, 354 and 415
          Muller's notes SBE 10 (1881), archive.org dhammapadacollection01ml _djvu.txt (OCR):
                        verses and notes share the "N." shape, told apart against the app's own
                        Muller text (plans/atoms.js)
   Other plans are added here as their batches come (the plan's order of work). */
'use strict';
const fs = require('fs');
const path = require('path');

const CACHE = path.join(__dirname, '..', '.cache', 'teachings');
const SRC = path.join(CACHE, 'src');
const UA = 'FirstLightBuild/1.0 (https://zpullen98-gif.github.io/; a personal study app; one request at a time)';

const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastAt = 0;
async function get(url, file, decode) {
  const f = path.join(SRC, file);
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  fs.mkdirSync(SRC, { recursive: true });
  for (let attempt = 1; attempt <= 6; attempt++) {
    const wait = lastAt + 1500 - Date.now();
    if (wait > 0) await sleep(wait);
    lastAt = Date.now();
    let res;
    try { res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' }); }
    catch (e) { console.log('  ' + file + ': ' + e.message + ', retrying'); await sleep(5000 * attempt); continue; }
    if (res.status === 429 || res.status === 503) {
      const ra = +(res.headers.get('retry-after') || 0);
      console.log('  ' + file + ': ' + res.status + ', waiting ' + Math.max(ra, 5 * attempt) + 's');
      await sleep(1000 * Math.max(ra, 5 * attempt));
      continue;
    }
    if (!res.ok) throw new Error(file + ': HTTP ' + res.status + ' from ' + url);
    const text = decode ? decode(Buffer.from(await res.arrayBuffer())) : await res.text();
    if (/"code"\s*:\s*"maxlag"/.test(text)) { console.log('  ' + file + ': maxlag, waiting'); await sleep(10000); continue; }
    fs.writeFileSync(f, text, 'utf8');
    console.log('  fetched ' + file + ' (' + text.length + ' chars)');
    return text;
  }
  throw new Error(file + ': gave up after six attempts');
}

function wsUrl(oldid) {
  const u = new URL('https://zh.wikisource.org/w/api.php');
  Object.entries({ action: 'parse', oldid: String(oldid), prop: 'wikitext', format: 'json', formatversion: '2', maxlag: '5' })
    .forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}
function wsPage(oldid) { return 'https://zh.wikisource.org/w/index.php?oldid=' + oldid; }

/* ---------------------------------------------------------------- the Tao */
const TAO = {
  wangbi: { oldid: 2354026, file: 'tao-wangbi-2354026.json' },
  hsg: [{ oldid: 2019760, file: 'tao-hsg-2019760.json', from: 1 }, { oldid: 1552800, file: 'tao-hsg-1552800.json', from: 38 }],
  legge: { url: 'https://archive.org/download/sacredbooksofchi01oxfo/sacredbooksofchi01oxfo_djvu.txt', file: 'sbe39-sacredbooksofchi01oxfo_djvu.txt' },
  pg216: { url: 'https://www.gutenberg.org/cache/epub/216/pg216.txt', file: 'pg216.txt' }
};

const clean = s => s.replace(/-\{([^}]*)\}-/g, '$1').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '').trim();
/* A chapter body as [{ base, comm }]: every commentary line is ":{{*|...}}" on
   its own line and follows the text it comments on. */
function segs(body) {
  const out = [];
  let cur = null;
  for (const raw of body.split('\n')) {
    const l = raw.trim();
    if (!l) continue;
    const m = l.match(/^:\{\{\*\|([\s\S]*)\}\}$/);
    if (m) { const c = clean(m[1]); if (!cur) { cur = { base: '', comm: '' }; out.push(cur); } cur.comm += c; cur = null; }
    else if (l.startsWith('{{') || l.startsWith('<big') || l.startsWith(':')) continue;
    else { if (!cur) { cur = { base: '', comm: '' }; out.push(cur); } cur.base += clean(l); }
  }
  return out;
}
const CN = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
function cnNum(s) {
  const TEN = '十';
  if (s.indexOf(TEN) < 0) return CN[s];
  const [a, b] = s.split(TEN);
  return (a ? CN[a] : 1) * 10 + (b ? CN[b] : 0);
}
function wikitext(raw) {
  const j = JSON.parse(raw);
  if (!j.parse || typeof j.parse.wikitext !== 'string') throw new Error('no wikitext in the response');
  return j.parse.wikitext;
}

function taoWangBi(raw) {
  const wt = wikitext(raw);
  const heads = [...wt.matchAll(/^==([一二三四五六七八九十]+)章==\s*$/gm)];
  const out = {};
  heads.forEach((h, i) => {
    let body = wt.slice(h.index + h[0].length, i + 1 < heads.length ? heads[i + 1].index : wt.length);
    const stop = body.search(/^=[^=]/m);
    if (stop >= 0) body = body.slice(0, stop);
    out[cnNum(h[1])] = segs(body);
  });
  return out;
}
function taoHsg(raws) {
  const out = {};
  raws.forEach(({ raw, from }) => {
    const wt = wikitext(raw);
    const hs = [...wt.matchAll(/^==([^=\n]+)==\s*$/gm)];
    hs.forEach((h, i) => {
      out[from + i] = { title: h[1].trim(), segs: segs(wt.slice(h.index + h[0].length, i + 1 < hs.length ? hs[i + 1].index : wt.length)) };
    });
  });
  return out;
}

/* Legge's notes: the djvu text between the end of a chapter's translation
   and the start of the next, located by Gutenberg #216's own words. */
function taoLegge(djvu, pgText) {
  const words = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const pg = pgText.split(/\r?\n/);
  const pgStart = pg.findIndex(l => /^Ch\. 1\. 1\. /.test(l));
  const pgEnd = pg.findIndex(l => /\*\*\* END OF THE PROJECT/.test(l));
  const pgCh = {};
  let cur = 0;
  for (const l of pg.slice(pgStart, pgEnd)) {
    const m = l.match(/^(?:Ch\. )?(\d{1,2})\.(?: |$)/);
    if (m && +m[1] === cur + 1 && (/^(?:Ch\. )?\d{1,2}\. 1\. /.test(l) || /^\d{1,2}\.$/.test(l) || cur + 1 > 5)) { cur++; pgCh[cur] = []; }
    if (cur && !/^PART \d/.test(l.trim())) pgCh[cur].push(l);
  }
  const pgWords = {};
  for (let n = 1; n <= 81; n++) pgWords[n] = words(pgCh[n].join(' ').replace(/^(?:Ch\. )?\d{1,2}\. (?:1\. )?/, ''));
  const L = djvu.split(/\r?\n/);
  const s = L.findIndex(l => /^Ch\.\s+1\.\s+[1iIl]\s?\.\s/.test(l.trim()));
  const e = L.findIndex((l, i) => i > s && /^\s*(THE\s+)?WRITINGS\s+OF/.test(l));
  const isHead = l => /^\s*$/.test(l) || /^\s*\d{1,3}\s*$/.test(l)
    || /^\s*CH[.,]\s+[IVXLCxl]+[.,]?\s*\.?\s*(THE\s+TAO.*)?$/.test(l)
    || /^\s*(\d{1,3}\s+)?THE\s+TEXTS\s+OF\s+T/.test(l)
    || /^\s*THE\s+TAO\s+TEH\s+\S+\.?\s*\d*\s*$/.test(l)
    || /^\s*PT\.\s+I+\.?/.test(l) || /^\s*PART\s+II?\.\s*$/.test(l)
    || (l.trim().length < 60 && /TEXTS\s+OF\s+T\S*ISM|T\S{1,3}\s+TAO\s+TEH\s+\S+|TAO\s+TEH\s+[A-Z']{3,5}\b/i.test(l))
    || /^\s*[A-Z]{1,2}\s?\d\s*$/.test(l) || /^\s*THE\s*$/.test(l);
  const body = L.slice(s, e).filter(l => !isHead(l));
  const W = [], WL = [];
  let carry = '';
  body.forEach((l, i) => {
    const t = words(l);
    if (carry && t.length) t[0] = carry + t[0];
    carry = /[¬-]\s*$/.test(l) && t.length ? t.pop() : '';
    for (const w of t) { W.push(w); WL.push(i); }
  });
  const find = (seq, from, K) => {
    seq = seq.slice(0, K || 6);
    for (let p = Math.max(0, from); p + seq.length <= W.length; p++) {
      let hit = 0;
      for (let k = 0; k < seq.length; k++) if (W[p + k] === seq[k]) hit++;
      if (hit >= seq.length - 2) return p;
    }
    return -1;
  };
  const startW = [], endW = [];
  let from = 0;
  for (let n = 1; n <= 81; n++) {
    const pw = pgWords[n];
    startW[n] = find(pw, from);
    const tail = pw.slice(-6);
    endW[n] = find(tail, startW[n] + Math.floor(pw.length * 0.6));
    if (endW[n] >= 0) endW[n] += tail.length - 1;
    from = endW[n] > 0 ? endW[n] + 1 : startW[n] + 1;
  }
  const tidy = t => t.replace(/¬\n/g, '').replace(/(\w)-\s*\n(?=[a-z])/g, '$1').replace(/[ \t]{2,}/g, ' ').replace(/\s*\n\s*/g, ' ').trim();
  const out = {}, probs = [];
  for (let n = 1; n <= 81; n++) {
    const noteLine = WL[endW[n]] + 1;
    const nextLine = n < 81 ? WL[startW[n + 1]] : body.length;
    let notes = tidy(body.slice(noteLine, nextLine).join('\n'));
    /* the OCR turns the Chinese title at the head of each note into noise:
       drop whatever comes before the first quotation mark */
    const q = notes.search(/['‘"]/);
    if (q > 0 && q < 12) notes = notes.slice(q);
    out[n] = notes;
    if (startW[n] < 0 || endW[n] < 0 || notes.length < 60) probs.push(n);
  }
  if (probs.length) throw new Error('Legge’s notes did not split cleanly at chapters ' + probs.join(', '));
  return out;
}

async function tao(packetsOnly) {
  const wbRaw = packetsOnly ? fs.readFileSync(path.join(SRC, TAO.wangbi.file), 'utf8') : await get(wsUrl(TAO.wangbi.oldid), TAO.wangbi.file);
  const hsRaws = [];
  for (const h of TAO.hsg) hsRaws.push({ raw: packetsOnly ? fs.readFileSync(path.join(SRC, h.file), 'utf8') : await get(wsUrl(h.oldid), h.file), from: h.from });
  const djvu = packetsOnly ? fs.readFileSync(path.join(SRC, TAO.legge.file), 'utf8') : await get(TAO.legge.url, TAO.legge.file);
  const pg = packetsOnly ? fs.readFileSync(path.join(SRC, TAO.pg216.file), 'utf8') : await get(TAO.pg216.url, TAO.pg216.file);

  const wb = taoWangBi(wbRaw), hs = taoHsg(hsRaws), lg = taoLegge(djvu, pg);
  const dir = path.join(CACHE, 'tao');
  fs.mkdirSync(dir, { recursive: true });
  const thin = [];
  for (let ch = 1; ch <= 81; ch++) {
    if (!wb[ch] || !hs[ch]) throw new Error('chapter ' + ch + ' missing from ' + (!wb[ch] ? 'Wang Bi' : 'Heshang Gong'));
    const wbComm = wb[ch].reduce((a, x) => a + x.comm.length, 0);
    if (!wbComm) thin.push(ch);
    const packet = {
      plan: 'tao', ch,
      sources: [
        { id: 'wang-bi', name: 'Wang Bi', edition: 'zh.wikisource 道德經 (王弼本), the 華亭張氏 edition, revision ' + TAO.wangbi.oldid,
          url: wsPage(TAO.wangbi.oldid), licence: 'public domain text; transcription CC BY-SA 4.0 (Wikisource)', segs: wb[ch],
          note: wbComm ? '' : 'Wang Bi has no commentary on this chapter in the received text.' },
        { id: 'heshang-gong', name: 'the Heshang Gong commentary', title: hs[ch].title,
          edition: 'zh.wikisource 老子河上公章句, revision ' + (ch <= 37 ? TAO.hsg[0].oldid : TAO.hsg[1].oldid) + ' (a normalised text; the Sibu congkan Song edition differs in places)',
          url: wsPage(ch <= 37 ? TAO.hsg[0].oldid : TAO.hsg[1].oldid), licence: 'public domain text; transcription CC BY-SA 4.0 (Wikisource)', segs: hs[ch].segs },
        { id: 'legge-sbe39', name: 'Legge’s notes', edition: 'James Legge, The Texts of Taoism, SBE 39 (1891), archive.org sacredbooksofchi01oxfo, OCR text',
          url: 'https://archive.org/details/sacredbooksofchi01oxfo', licence: 'public domain', notes: lg[ch] }
      ]
    };
    fs.writeFileSync(path.join(dir, String(ch).padStart(2, '0') + '.json'), JSON.stringify(packet, null, 1), 'utf8');
  }
  console.log('  tao: 81 packets written to .scripts/.cache/teachings/tao/' + (thin.length ? ' (Wang Bi silent on chapters ' + thin.join(', ') + ')' : ''));
}

/* ------------------------------------------------------ the Dhammapada */
const DHP_SHA = '60c7fb31b82f7a379372cb32d52fd9f9ffe13365';
const PALI = {
  cst: { url: 'https://raw.githubusercontent.com/VipassanaTech/tipitaka-xml/' + DHP_SHA + '/romn/s0502a.att.xml',
    page: 'https://github.com/VipassanaTech/tipitaka-xml/blob/' + DHP_SHA + '/romn/s0502a.att.xml',
    file: 'dhp-cst-s0502a.att-' + DHP_SHA.slice(0, 7) + '.utf8.xml' },
  legends: [1, 2, 3].map(n => {
    const id = 'buddhistlegends0' + n + 'budd';
    return { id, url: 'https://archive.org/download/' + id + '/' + id + '_djvu.txt', file: 'hos' + (27 + n) + '-' + id + '_djvu.txt' };
  }),
  muller: { url: 'https://archive.org/download/dhammapadacollection01ml/dhammapadacollection01ml_djvu.txt', file: 'sbe10-dhammapadacollection01ml_djvu.txt' }
};
const utf16 = buf => buf.toString('utf16le').replace(/^﻿/, '');
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI'];
const letters = s => s.toLowerCase().replace(/[^a-z]/g, '');
function dice(a, b) {
  const grams = s => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const A = grams(a), B = grams(b);
  let hit = 0, n = 0;
  for (const [k, v] of A) { hit += Math.min(v, B.get(k) || 0); n += v; }
  for (const v of B.values()) n += v;
  return n ? 2 * hit / n : 0;
}
const wordCount = s => (s.match(/\S+/g) || []).length;
const verseLabel = nums => { const a = Math.min(...nums), z = Math.max(...nums); return a === z ? String(a) : a + ' to ' + z; };

/* The app's chapters (the plan's days) with their verses; "58-59" style
   labels are one entry in the app and two verses in the sources. */
function dhpChapters() {
  const A = require('../plans/atoms');
  return A.loadPart('dhammapada', 'all').map((c, i) => {
    const verses = [], ref = {};
    c.v.forEach(([label, text]) => {
      const [a, b] = String(label).split(/\s*[–-]\s*/).map(Number);
      for (let n = a; n <= (b || a); n++) { verses.push(n); ref[n] = text; }
    });
    return { ch: i + 1, title: c.title, verses, ref };
  });
}

/* The Pali: stories ("subhead", numbered within the vagga like Burlingame's),
   verse groups (consecutive printed verses), and each group's explanation. */
function paliCst(xml) {
  const GATHA = /^gatha/;
  const NUMLEAD = /^(\d{1,3})\.\s*‘‘/;
  const END = /^(Gāthā|Desanā|Dhammadesanā)(pariyosāne|vasāne)/;
  const paras = [];
  for (const m of xml.matchAll(/<p rend="([a-z0-9]+)"(?: n="([^"]*)")?>([\s\S]*?)<\/p>/g))
    paras.push({ rend: m[1], n: m[2], text: m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() });
  const stories = [];
  let vagga = 0, cur = null;
  for (const p of paras) {
    if (p.rend === 'chapter') { vagga = parseInt(p.text, 10); cur = null; continue; }
    if (p.rend === 'subhead' && vagga) {
      const k = p.text.match(/^(\d+)\.\s*(.+)$/);                        // Nigamanakatha has no number
      cur = k ? { book: vagga, n: +k[1], title: k[2], paras: [] } : null;
      if (cur) stories.push(cur);
      continue;
    }
    if (cur) cur.paras.push(p);
  }
  if (stories.length !== 305) throw new Error('CST: ' + stories.length + ' stories, expected 305');
  const groups = [];
  for (const s of stories) {
    const P = s.paras;
    let blocks = [];
    for (let i = 0; i < P.length; i++) {
      let num, from, to;
      if (P[i].rend === 'hangnum') {
        num = +P[i].n; from = to = i + 1;
        // Dhp 74: the first line after the number is tagged bodytext
        if (P[from] && !GATHA.test(P[from].rend) && P[from + 1] && GATHA.test(P[from + 1].rend)) to++;
      } else if (NUMLEAD.test(P[i].text) && P[i + 1] && GATHA.test(P[i + 1].rend)) {
        // Dhp 2: the number sits inline in a bodytext paragraph
        num = +P[i].text.match(NUMLEAD)[1]; from = i; to = i + 1;
      } else continue;
      while (to < P.length && GATHA.test(P[to].rend)) to++;
      if (to === from) continue;
      blocks.push({ num, at: i, end: to, lines: P.slice(from, to).map(p => p.text.replace(/^\d{1,3}\.\s*/, '')) });
      i = to - 1;
    }
    // a verse printed twice in one story (Dhp 1): the first printing only heads the story
    blocks = blocks.filter((b, k) => !blocks.slice(k + 1).some(x => x.num === b.num));
    const mine = [];
    for (const b of blocks) {
      const g = mine[mine.length - 1];
      if (g && g.end === b.at) { g.blocks.push(b); g.end = b.end; } else mine.push({ blocks: [b], at: b.at, end: b.end });
    }
    mine.forEach((g, k) => {
      const stop = k + 1 < mine.length ? mine[k + 1].at : P.length;
      const gloss = [];
      for (let i = g.end; i < stop; i++) {
        if (P[i].rend === 'centre' || END.test(P[i].text)) break;
        gloss.push(P[i].text);
      }
      g.comm = gloss.join(' ');
    });
    // Dhp 206 to 207: the explanation is only "Tasma hi -", which leads into 208; the one after 208 covers all three
    mine.forEach((g, k) => { if (g.comm.length < 40 && mine[k + 1]) g.comm = (g.comm + ' ' + mine[k + 1].comm).trim(); });
    for (const g of mine) {
      const nums = g.blocks.map(b => b.num);
      const verse = nums.length > 1 ? g.blocks.map(b => '(' + b.num + ') ' + b.lines.join(' / ')).join(' ') : g.blocks[0].lines.join(' / ');
      if (!g.comm) throw new Error('CST: no explanation after Dhammapada ' + verseLabel(nums));
      groups.push({ book: s.book, story: s.n, nums, base: 'Dhammapada ' + verseLabel(nums) + ': ' + verse, comm: g.comm });
    }
    s.verses = [...new Set(mine.flatMap(g => g.blocks.map(b => b.num)))].sort((x, y) => x - y);
    delete s.paras;
  }
  const seen = new Set(groups.flatMap(g => g.nums));
  const miss = [];
  for (let n = 1; n <= 423; n++) if (!seen.has(n)) miss.push(n);
  if (miss.length) throw new Error('CST: no verse block for Dhammapada ' + miss.join(', '));
  return { stories, groups };
}

/* Burlingame (Princeton djvu text). Page furniture comes as short paragraphs:
   even pages "146" / "Book 1, Story 1. Dhammapada 1" / "[N.l. 31-", odd pages
   "-N. 1.1117]" / the running title / "151". Footnotes open "1 Cf. ..." just
   above the furniture, or carry a citation. */
const BL = {
  head: /^\s*([IVXLlJ1|HmniygrL]{1,6})\s*[.,]?\s*([0-9nIlLgS]{1,2})(?:\s*[.,]\s*|\s{2,})(["'“]?[A-Z].*)$/,
  page: /^\s*[0-9]{1,3}\s*$/,
  even: /B[o0]{2}[kh]\s+.{1,10}St[o0]ry.{0,14}Dham/i,
  dhp: /^\s*Dham\S{0,4}pada\s+[0-9IlS\-–, ]{1,12}\s*$/,
  nref: /^\s*[-.]?\s*\[?\s*N\s*[.,]\s*\S{1,3}\s*[.,]?\s*[0-9A-Za-z ]{0,12}[-\]]/,
  foot: /^\s*(?:[0-9]{1,2}|[*†‡§])\s+(?![a-h]\s*\.\s)\S/,
  biblio: /Text:\s*N\b|\bCf\.|Parallels?:|J[aā]taka\s+\d|Vinaya|D[iī]gha|Majjhima|Sa[mṃ]yutta|A[nṅ]guttara|Introduction,\s*§|\bHOS\b|Commentary,\s+[ivxlc]+\b|\b[ivx]+\.\s*\d+\s*[-:]\s*\d+|^\s*\S+\s+Literally\b|^\s*\S+\s+See\s/,
  verse: /^\s*[-'‘’.]?\s*([0-9]{1,3})\s*[.,]\s+\S/
};
// Stories that the commentary itself tells by pointing at another verse's story
const BL_POINTERS = { 'XX.3': '277', 'XX.4': '277', 'XX.11': '114', 'XX.12': '113', 'XXI.7': '73 to 74', 'XXIII.1': '21 to 23',
  'XXIV.12': '181', 'XXVI.14': '348', 'XXVI.18': '69', 'XXVI.28': '410', 'XXVI.29': '98', 'XXVI.36': '417' };
const caps = s => { const c = (s.match(/[A-Z]/g) || []).length, l = (s.match(/[a-z]/g) || []).length; return c >= 4 && l * 3 <= c; };
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
function titleCase(s) {
  return s.replace(/[\s^»*'`i1-9]+$/, '').trim().split(/\s+/).map((w, i) => {
    const lw = w.toLowerCase();
    return i && SMALL.has(lw) ? lw : lw.replace(/^([^a-z]*)([a-z])/, (m, p, c) => p + c.toUpperCase());
  }).join(' ');
}
function blHeadings(L, list, vol) {
  const start = L.findIndex(l => /^\s*BOOK\s+[IVXL]+\.\s/.test(l));
  let end = L.findIndex((l, i) => i > start && /^\s*(DATE\s+DUE|PRINTED\s+IN\s+U.*|Epilogue)\s*$/i.test(l));
  if (start < 0) throw new Error('Burlingame vol. ' + vol + ': no BOOK heading');
  if (end < 0) end = L.length;
  const at = list.map(() => -1);
  let pos = start;
  list.forEach((s, k) => {
    const re = new RegExp('^\\s*' + ROMAN[s.book].replace(/I/g, '[I1l|]') + '\\s*[.,]\\s*' + s.n + '\\s*[.,]\\s*["\'\\u201c]?[A-Z]');
    for (let i = pos; i < end; i++) if (re.test(L[i])) { at[k] = i; pos = i + 1; break; }
  });
  // OCR-damaged headings ("n.  3.", "Xin.  7.", "VII.  I."): the one heading-shaped line
  // between the neighbours whose story number reads right
  const num = t => t === 'n' ? 11 : +t.replace(/[IlL]/g, '1').replace(/S/g, '5').replace(/g/g, '2');
  list.forEach((s, k) => {
    if (at[k] >= 0) return;
    const lo = (at.slice(0, k).filter(x => x >= 0).pop() ?? start) + 1;
    const hi = at.slice(k + 1).find(x => x >= 0) ?? end;
    const cands = [];
    for (let i = lo; i < hi; i++) { const m = L[i].match(BL.head); if (m && num(m[2]) === s.n && caps(m[3])) cands.push(i); }
    if (cands.length !== 1) throw new Error('Burlingame: heading of story ' + ROMAN[s.book] + '.' + s.n + (cands.length ? ' is ambiguous' : ' not found'));
    at[k] = cands[0];
  });
  at.forEach((x, k) => { if (k && x <= at[k - 1]) throw new Error('Burlingame: story headings out of order at ' + ROMAN[list[k].book] + '.' + list[k].n); });
  return list.map((s, k) => ({ s, from: at[k], to: k + 1 < list.length ? at[k + 1] : end }));
}
function blClean(lines) {
  lines = lines.filter(l => !(BL.even.test(l) && /\[\s*N|Dham\S{0,4}pada\s+\S+\s*$/.test(l)));  // a running head glued to text
  const P = []; let cur = [];
  for (const l of lines) { if (l.trim() === '') { if (cur.length) P.push(cur), cur = []; } else cur.push(l.replace(/\s+$/, '')); }
  if (cur.length) P.push(cur);
  const furn = l => BL.page.test(l) || BL.even.test(l) || BL.dhp.test(l) || BL.nref.test(l);
  const kind = P.map(p => (p.length <= 2 && p.every(furn)) ? 'furn' : 'text');
  P.forEach((p, i) => {            // the running title: one short line beside the furniture
    const t = p[0].trim();
    if (kind[i] === 'text' && p.length === 1 && [i - 2, i - 1, i + 1, i + 2].some(j => kind[j] === 'furn')
      && t.length < 90 && !/[.:;,]$/.test(t) && !BL.verse.test(t)) kind[i] = 'furn';
  });
  for (let i = P.length - 1; i >= 0; i--) {
    if (kind[i] !== 'text' || !BL.foot.test(P[i][0])) continue;
    let j = i + 1; while (j < P.length && kind[j] === 'foot') j++;
    if (j >= P.length || kind[j] === 'furn' || BL.biblio.test(P[i].join(' '))) kind[i] = 'foot';
  }
  P.forEach((p, i) => {            // a footnote carried over the page: no marker, but a citation, beside the furniture
    const t = p.join(' ');
    if (kind[i] === 'text' && t.length < 500 && !/[“”]/.test(t) && BL.biblio.test(t) && !BL.verse.test(p[0])
      && [kind[i - 1], kind[i + 1]].some(k => k === 'furn' || k === 'foot')) kind[i] = 'foot';
  });
  const out = [];
  P.forEach((p, i) => {
    if (kind[i] !== 'text') return;
    const isVerse = BL.verse.test(p[0]) && p.join(' ').length < 400;
    let text = p.join('\n').replace(/(\w)-\n\s*(\w)/g, '$1$2').replace(/\s*\n\s*/g, isVerse ? '\n' : ' ').replace(/ {2,}/g, ' ').trim()
      .replace(/([A-Za-z.,;:?!’”)])\d{1,2}(?=[\s,.;:)]|$)/g, '$1');   // footnote numbers stuck to words
    const prev = out[out.length - 1];
    if (prev && !isVerse && !prev.verse && /^[a-z]/.test(text) && !/[.!?:”"’']$/.test(prev.text)) {
      prev.text += (/-$/.test(prev.text) ? '' : ' ') + text;          // a sentence broken by the page
      return;
    }
    out.push({ text, verse: isVerse });
  });
  return out;
}
function blStories(vols, cstStories) {
  const digitish = n => String(n).split('').map(d => ({ 1: '[1Il|]', 0: '[0O]', 3: '[3S]', 5: '[5S]', 8: '[8S]' })[d] || d).join('');
  const out = [];
  vols.forEach((raw, vi) => {
    const L = raw.split(/\r?\n/);
    const list = cstStories.filter(s => (s.book <= 2 ? 0 : s.book <= 12 ? 1 : 2) === vi);
    for (const { s, from, to } of blHeadings(L, list, 28 + vi)) {
      // the heading, and its second line when the title runs over
      let body = from + 1, title = L[from].replace(/^\s*\S+\s*[.,]?\s*\S+?\s*[.,]\s*/, '');
      const m = L[from].match(BL.head); if (m) title = m[3];
      let j = body;                                  // the second line may follow a blank line ("WIFE 1")
      while (j < to && !L[j].trim() && j - body < 2) j++;
      if (j < to && /^\s*["'“]?[A-Z][A-Z'’”"\-,.?!\s]*[A-Z?!”"][\s\d^»*'i]*$/.test(L[j]) && L[j].trim().length < 60) { title += ' ' + L[j].trim(); body = j + 1; }
      const paras = blClean(L.slice(body, to).filter(l => !/^\s*BOOK\s+[IVXL]+\.\s/.test(l)));
      const key = ROMAN[s.book] + '.' + s.n;
      const last = {};
      for (const v of s.verses) {
        const re = new RegExp('^\\s*[-\'\\u2018\\u2019.]?\\s*' + digitish(v) + '\\s*[.,]\\s+\\S');
        paras.forEach((p, i) => { if (re.test(p.text)) last[v] = i; });
        if (last[v] === undefined) throw new Error('Burlingame: story ' + key + ' does not print Dhammapada ' + v);
      }
      out.push({ key, book: s.book, n: s.n, vol: vi + 1, verses: s.verses, title: titleCase(title.replace(/\s+/g, ' ').replace(/(\w)- (?=[A-Za-z])/g, '$1-')), paras: paras.map(p => p.text), last });
    }
  });
  return out;
}
/* Over BL_MAX words: the first BL_HEAD, then the BL_BEFORE words before the
   last printing of the story's verse(s), the printing, and BL_AFTER words
   after it. Set so a day's packet stays readable by one agent with others
   (chapter 1 went from about 20,000 words at 1,500/300/900/200). */
const BL_MAX = 800, BL_HEAD = 150, BL_BEFORE = 450, BL_AFTER = 150;
function blAbridge(st, lost) {
  const P = st.paras, wc = P.map(wordCount), total = wc.reduce((a, b) => a + b, 0);
  if (total <= BL_MAX) return { text: P.join('\n\n'), abridged: false };
  const idx = Object.values(st.last).sort((a, b) => a - b);
  let vFrom = idx[idx.length - 1];
  for (let k = idx.length - 2; k >= 0 && idx[k] >= vFrom - 6; k--) vFrom = idx[k];     // the whole final block
  let vTo = idx[idx.length - 1];
  while (vTo + 1 < P.length && vTo - idx[idx.length - 1] < 4 && P[vTo + 1].length < 200 && !/^[a-z]/.test(P[vTo + 1])) vTo++;
  const before = k => wc.slice(0, k).reduce((a, b) => a + b, 0);
  const cut = (a, z) => {
    const parts = []; let w = 0;
    P.forEach((p, i) => {
      const lo = Math.max(a, w), hi = Math.min(z, w + wc[i]);
      if (lo < hi) { const ws = [...p.matchAll(/\S+/g)]; parts.push(p.slice(ws[lo - w].index, ws[hi - w - 1].index + ws[hi - w - 1][0].length)); }
      w += wc[i];
    });
    return parts.join('\n\n');
  };
  const a2 = Math.max(BL_HEAD, before(vFrom) - BL_BEFORE), z2 = Math.min(total, before(vTo + 1) + BL_AFTER);
  const text = (a2 <= BL_HEAD ? [cut(0, z2)] : [cut(0, BL_HEAD), '[…]', cut(a2, z2)]).concat(z2 < total ? ['[…]'] : []).join('\n\n');
  for (const [v, i] of Object.entries(st.last)) {
    const w = before(i);
    if (!(w < BL_HEAD || (w >= a2 && w < z2))) lost.push(st.key + ' (Dhammapada ' + v + ')');
  }
  return { text, abridged: true };
}

/* Muller's notes: page footnotes keyed "N." like the verses themselves. A
   numbered paragraph that reads like the app's verse N is the verse; any other
   is a note; an unnumbered one continues the last note unless it is the tail
   of the last verse (a verse broken by the page). */
function paliMuller(djvu, ref) {
  const L = djvu.split(/\r?\n/);
  const a = L.findIndex(l => /^\s*CHAPTER\s+I\.\s*$/.test(l));
  const z = L.findIndex((l, i) => i > a && /^\s*INDEX\.?\s*$/.test(l));
  if (a < 0 || z < 0) throw new Error('SBE 10: the translation’s bounds not found');
  const FURN = [/^\s*DHAM\s*MA\s*PA\s*DA\.?\s*(CHAP\.?\s*[IVXL]+\.?)?\s*$/i, /^\s*\d{1,3}\s+DHAMMAPADA\.?.*$/i, /^\s*DHAMMAPADA\.?\s+CHAP.*\d{1,3}\s*$/i,
    /^\s*CHAPTER\s+[IVXL]+\.?\s*$/, /^\s*[0-9]{1,3}\s*$/, /^\s*[A-Z][A-Z\s\-,.']{3,40}\.\s*[0-9]{0,3}\s*$/, /^\s*B\s*2?\s*$/, /^\s*\[\d+\]\s*$/];
  const paras = []; let cur = [];
  for (const l of L.slice(a, z)) {
    if (FURN.some(r => r.test(l))) { if (cur.length) paras.push(cur), cur = []; continue; }
    // notes often follow one another with no blank line: a numbered line starts a paragraph
    if (/^\s*\d{1,3}(\s*[-,]\s*\d{1,3})?\s*[.,]\s+\S/.test(l) && cur.length) paras.push(cur), cur = [];
    if (l.trim() === '') { if (cur.length) paras.push(cur), cur = []; } else cur.push(l.trim());
  }
  if (cur.length) paras.push(cur);
  const NUM = /^\s*[^A-Za-z0-9'"(]{0,6}\s*([0-9Ilt](?: ?[0-9Il]){0,2})(?:\s*[-,]\s*([0-9Ilt](?: ?[0-9Il]){0,2}))?\s*[.,]\s+(.*)$/;
  const toN = s => +s.replace(/[Ilt]/g, '1').replace(/ /g, '');
  const notes = new Map(); const seen = new Set();
  let lastVerse = 0, lastNote = null;
  for (const p of paras) {
    const text = p.join(' ').replace(/(\w)- (\w)/g, '$1$2').replace(/\s+/g, ' ');
    const m = text.match(NUM);
    if (m) {
      const n = toN(m[1]), n2 = m[2] ? toN(m[2]) : n;
      const got = letters(m[3]).slice(0, 120);
      if (ref[n] && n >= lastVerse && dice(got, letters(ref[n]).slice(0, got.length)) >= 0.55) { seen.add(n); lastVerse = n; continue; }
      if (n >= 1 && n <= 423 && n2 >= n && n2 - n < 12) {
        const key = n + '-' + n2;
        if (!notes.has(key)) notes.set(key, { a: n, z: n2, text: '' });
        notes.get(key).text = (notes.get(key).text + ' ' + m[3]).trim();
        lastNote = key;
        continue;
      }
    }
    // the tail of the last verse, broken by the page: not a note
    const tl = letters(text), r0 = ref[lastVerse] ? letters(ref[lastVerse]) : '';
    if (r0 && dice(tl.slice(0, 80), r0.slice(Math.max(0, r0.length - tl.length)).slice(0, 80)) >= 0.5) continue;
    // a verse whose number the OCR garbled ('6"/.' for 67, "loi." for 101): it opens like one of the next few verses
    let hidden = 0;
    for (let n = lastVerse + 1; n <= lastVerse + 6 && !hidden; n++) {
      if (!ref[n]) continue;
      const r = letters(ref[n]).slice(0, 80);
      for (let k = 0; k <= 8 && !hidden; k++) if (dice(tl.slice(k, k + r.length), r) >= 0.6) hidden = n;
    }
    if (hidden) { seen.add(hidden); lastVerse = hidden; continue; }
    if (lastNote) notes.get(lastNote).text += ' ' + text;
  }
  // a verse the OCR hid from the matcher lands among the notes: take it out again
  const dropped = [];
  for (const [key, nt] of notes) {
    const got = letters(nt.text).slice(0, 120);
    if (ref[nt.a] && dice(got, letters(ref[nt.a]).slice(0, got.length)) >= 0.55) { notes.delete(key); dropped.push(verseLabel([nt.a, nt.z])); }
  }
  return { notes: [...notes.values()].sort((x, y) => x.a - y.a), verses: seen.size, dropped };
}

async function pali(packetsOnly) {
  const load = (src, decode) => packetsOnly ? fs.readFileSync(path.join(SRC, src.file), 'utf8') : get(src.url, src.file, decode);
  const xml = await load(PALI.cst, utf16);
  const vols = [];
  for (const v of PALI.legends) vols.push(await load(v));
  const djvu = await load(PALI.muller);

  const chapters = dhpChapters();
  if (chapters.length !== 26) throw new Error('the app has ' + chapters.length + ' Dhammapada chapters, expected 26');
  const chOf = {}, ref = {};
  chapters.forEach(c => c.verses.forEach(n => { chOf[n] = c.ch; ref[n] = c.ref[n]; }));
  const cst = paliCst(xml);
  const stories = blStories(vols, cst.stories);
  const ml = paliMuller(djvu, ref);

  const dir = path.join(CACHE, 'pali');
  fs.mkdirSync(dir, { recursive: true });
  const lost = [], abridged = [];
  for (const c of chapters) {
    const segs = cst.groups.filter(g => chOf[Math.min(...g.nums)] === c.ch);
    const mine = stories.filter(s => chOf[s.verses[0]] === c.ch);
    const notes = ml.notes.filter(n => chOf[n.a] === c.ch);
    const hasSeg = new Set(segs.flatMap(g => g.nums)), hasStory = new Set(mine.flatMap(s => s.verses));
    const gap = c.verses.filter(n => !hasSeg.has(n) || !hasStory.has(n));
    if (gap.length) throw new Error('chapter ' + c.ch + ': no ' + (gap.some(n => !hasSeg.has(n)) ? 'Pali explanation' : 'Burlingame story') + ' for Dhammapada ' + gap.join(', '));
    const told = mine.map(s => {
      const ab = blAbridge(s, lost);
      if (ab.abridged) abridged.push(s.key);
      const see = BL_POINTERS[s.key] ? ' (see Dhammapada ' + BL_POINTERS[s.key] + ')' : '';
      if (see && !/same|similar|so also goes|related (in detail|at length)|contained in/i.test(s.paras.join(' '))) throw new Error('Burlingame: story ' + s.key + ' no longer reads as a pointer');
      return 'Story ' + s.key + ' (Dhammapada ' + verseLabel(s.verses) + '), ' + s.title + see
        + (ab.abridged ? ' (abridged here; the whole story is in Burlingame’s volume)' : '') + '\n' + ab.text;
    });
    const vol = c.ch <= 2 ? 1 : c.ch <= 12 ? 2 : 3;
    const packet = {
      plan: 'pali', ch: c.ch,
      sources: [
        { id: 'dhp-commentary', name: 'the Theravāda commentary (Pali)',
          edition: 'Chaṭṭha Saṅgāyana text, Vipassana Research Institute, s0502a.att.xml, commit ' + DHP_SHA.slice(0, 7),
          url: PALI.cst.page, licence: 'free for non-commercial use, with attribution to the Vipassana Research Institute',
          segs: segs.map(g => ({ base: g.base, comm: g.comm })) },
        { id: 'burlingame', name: 'the Theravāda commentary, the stories in Burlingame’s translation',
          edition: 'E. W. Burlingame, Buddhist Legends, Harvard Oriental Series 28 to 30 (1921), archive.org buddhistlegends0' + vol + 'budd (OCR)',
          url: 'https://archive.org/details/buddhistlegends0' + vol + 'budd', licence: 'public domain', notes: told.join('\n\n') },
        { id: 'muller-sbe10', name: 'Müller’s notes',
          edition: 'F. Max Müller, The Dhammapada, SBE 10 (1881), archive.org dhammapadacollection01ml (OCR)',
          url: 'https://archive.org/details/dhammapadacollection01ml', licence: 'public domain',
          notes: notes.map(n => 'Note on ' + verseLabel([n.a, n.z]) + ': ' + n.text).join('\n\n') }
      ]
    };
    fs.writeFileSync(path.join(dir, String(c.ch).padStart(2, '0') + '.json'), JSON.stringify(packet, null, 1), 'utf8');
  }
  console.log('  pali: 26 packets written to .scripts/.cache/teachings/pali/ (' + cst.groups.length + ' Pali verse groups, '
    + stories.length + ' Burlingame stories, ' + abridged.length + ' abridged; Müller: ' + ml.notes.length + ' notes, '
    + ml.verses + ' of 423 verses recognised in the scan)');
  if (lost.length) console.log('  abridging dropped an earlier printing of: ' + lost.join(', '));
  if (ml.dropped.length) console.log('  Müller: set aside as verses, not notes: ' + ml.dropped.join(', '));
}

/* plans whose builders live in sources/<name>.js take the shared helpers */
const analects = (packetsOnly) => require('./sources/analects').build({ get, wsUrl, wsPage, CACHE, packetsOnly });
const vedanta = require('./sources/vedanta');
const gita = (packetsOnly) => vedanta.gita({ get, CACHE, packetsOnly });
const upanishads = (packetsOnly) => vedanta.upanishads({ get, CACHE, packetsOnly });
const zhuangzi = (packetsOnly) => require('./sources/zhuangzi').build({ get, wsUrl, wsPage, CACHE, packetsOnly });
const quran = (packetsOnly) => require('./sources/quran').build({ get, CACHE, packetsOnly });
const bible = (packetsOnly) => require('./sources/bible').build({ get, CACHE, packetsOnly });
const PLANS = { tao, pali, analects, gita, upanishads, zhuangzi, quran, bible };

async function main() {
  const [plan, flag] = process.argv.slice(2);
  if (!PLANS[plan]) { console.error('usage: node .scripts/teachings/fetch-commentary.js <plan> [--packets]; plans ready: ' + Object.keys(PLANS).join(', ')); process.exit(1); }
  await PLANS[plan](flag === '--packets');
}
if (require.main === module) main().catch(e => { console.error('fetch-commentary: ' + e.message); process.exit(1); });

module.exports = { CACHE, SRC };
