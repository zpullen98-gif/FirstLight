/* The Teachings, an operator tool: fetch the commentaries once, cache them,
   and cut them into one packet per chapter for the agents to read.

   node .scripts/teachings/fetch-commentary.js <plan>        fetch what is missing, then (re)write the packets
   node .scripts/teachings/fetch-commentary.js <plan> --packets   rewrite the packets from the cache only

   Raw sources go to .scripts/.cache/teachings/src/ (git ignores .cache), one
   request at a time, a second apart at least, honouring Retry-After and
   maxlag, and never fetched twice. Packets go to
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
   Other plans are added here as their batches come (the plan's order of work). */
'use strict';
const fs = require('fs');
const path = require('path');

const CACHE = path.join(__dirname, '..', '.cache', 'teachings');
const SRC = path.join(CACHE, 'src');
const UA = 'FirstLightBuild/1.0 (https://zpullen98-gif.github.io/; a personal study app; one request at a time)';

const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastAt = 0;
async function get(url, file) {
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
    const text = await res.text();
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

const PLANS = { tao };

async function main() {
  const [plan, flag] = process.argv.slice(2);
  if (!PLANS[plan]) { console.error('usage: node .scripts/teachings/fetch-commentary.js <plan> [--packets]; plans ready: ' + Object.keys(PLANS).join(', ')); process.exit(1); }
  await PLANS[plan](flag === '--packets');
}
if (require.main === module) main().catch(e => { console.error('fetch-commentary: ' + e.message); process.exit(1); });

module.exports = { CACHE, SRC };
