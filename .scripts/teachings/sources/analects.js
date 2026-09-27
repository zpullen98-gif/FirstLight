/* The Teachings: the Analects commentaries, cut to Legge's 499 chapters.

   const analects = require('./sources/analects');
   await analects.build({ get, wsUrl, wsPage, CACHE, packetsOnly });

   Writes one packet per BOOK (the plan's days are Legge's books) to
   .scripts/.cache/teachings/analects/<NN>.json, shaped like the Tao packets:
     { plan: 'analects', ch: <book>, sources: [{ id, name, edition, url, licence, note?, segs?, notes? }] }
   In segs the first base of each Legge chapter starts "[<book>.<chapter>] ",
   and a book's preface is a seg whose base is "[<book> preface]".

   Sources (tested 2026-09-26):
     Zhu Xi   zh.wikisource 四書章句集註/論語集注卷一..卷十 (two books a juan).
              Each book is "==學而第一==", each chapter a paragraph, the
              commentary {{annotate|...}} after the words it glosses.
     He Yan   books 1 to 6: zh.wikisource 論語集解/01..03, proofread, notes
              {{*|...}}; books 7 to 20: 論語註疏/卷07..卷20, the text in
              {{yw|...}}, the 集解 notes in （...） between them, and Xing
              Bing's 疏 in paragraphs of their own, which are dropped. The 註疏
              text was converted from simplified characters (誌 for 志, 複 for
              復 and the like); about 1 to 2% of its note characters are wrong.
     Legge    The Chinese Classics vol. 1 (2nd ed. 1893), archive.org
              chineseclassics01legg, the OCR _djvu.txt. Each book's notes
              begin "Heading of this Book"; each chapter's note begins
              "<n>. <summary in small capitals>".
     Anchor   Gutenberg #4094: Legge's own Chinese text with his chapter
              markers 【第N章】, which numbers the chapters.

   Neither commentary divides the book as Legge does, and Wikisource's
   paragraphs differ again (Zhu Xi: books 10 and 18; He Yan: books 5, 6, 7, 9,
   10, 11, 14, 15, 17). So nothing is cut by the source's paragraphs: each
   book's base text is aligned to Legge's Chinese, chapter by chapter (the
   first 12 characters of each chapter, found by edit distance near where the
   previous chapter's length puts it), and a text run that straddles a
   boundary is split there. Variant folding (爲/為, 誌/志 ...) is used only to
   align; the packet holds the source's own characters.

   Legge's notes (tested 2026-09-26: all 499 chapters and the 20 book
   headings found). The notes run from each head to the next head in the
   text; the page's running heads, its Chinese text and its translation
   (known by word triples from Gutenberg #4094's English) are dropped.
     Heads the generic OCR fixes find (a comma or hyphen for the full stop, a
     stray mark before the number, 8 read for 3, a head in a long line where
     two columns were read as one): 13.27, 17.11, 17.25, 5.22, 14.23 to 14.26,
     14.30 (read 80), 14.39 (read 89), 19.3 (read 8).
     Heads by override (LEGGE_HEAD_AT): 4.8 (read "B."), 9.2 (head lost).
     Pages where the OCR read the two note columns out of order or line by
     line across both, so a note may hold its neighbour's lines or lose its
     own: 1.12-13, 4.8-11, 5.11-12, 5.14-15, 9.1-2, 12.12-13, 12.18-19,
     14.6-7, 14.22-26, 14.40-41. build() returns the list; each packet's
     Legge "note" names the ones in its book.
   Legge's notes are OCR text: the Chinese inside them is often lost. */
'use strict';
const fs = require('fs');
const path = require('path');

const COUNTS = [16, 24, 26, 26, 27, 28, 37, 21, 30, 18, 25, 24, 30, 47, 41, 14, 26, 11, 25, 3];
const ZX = [2598582, 2063643, 2281474, 2285801, 2018280, 2358541, 2412885, 2304542, 2560458, 2611553]; // 卷一..卷十
const ZX_JUAN = '一二三四五六七八九十';
const ZS = [2632876, 2402352, 2402627, 2268334, 2085298, 2632031, 2268335, 7904524, 2030329, 2626406,
  1375235, 2063705, 2371796, 2371072, 7904695, 2268333, 432755, 2067764, 432753, 2112907]; // 論語註疏/卷01..卷20
const JJ = [2270598, 2270600, 2270601]; // 論語集解/01..03 (books 1-2, 3-4, 5-6)
const PG = { url: 'https://www.gutenberg.org/cache/epub/4094/pg4094.txt', file: 'pg4094.txt' };
const LEGGE = { url: 'https://archive.org/download/chineseclassics01legg/chineseclassics01legg_djvu.txt', file: 'chineseclassics01legg_djvu.txt' };
const WS_LICENCE = 'public domain text; transcription CC BY-SA 4.0 (Wikisource)';

/* Heads the OCR mangled past the generic fixes: '<book>.<chapter>': the text that starts the note. */
const LEGGE_HEAD_AT = {
  '4.8': 'B. \n\n\nIMPORTANCE OF KNOWING THE BIQHT', // "8." read as "B.", its summary on a line of its own
  '9.2': 'old and new, say that the chapter shows the' // the head is lost; the note's body starts here, its columns merged
};

/* ------------------------------------------------------------ small tools */
const pad = n => String(n).padStart(2, '0');
function wikitext(raw) {
  const j = JSON.parse(raw);
  if (!j.parse || typeof j.parse.wikitext !== 'string') throw new Error('no wikitext in the response');
  return j.parse.wikitext;
}
/* the end of the template that opens at i, braces matched by depth */
function tmplEnd(p, i) {
  let d = 0;
  for (let j = i; j < p.length; j++) {
    if (p.startsWith('{{', j)) { d++; j++; continue; }
    if (p.startsWith('}}', j)) { d--; j++; if (d === 0) return j + 1; }
  }
  return p.length;
}
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

/* --------------------------------------------- alignment (folding only here) */
const FOLD = { 爲: '為', 説: '說', 衞: '衛', 敎: '教', 衆: '眾', 吿: '告', 羣: '群', 歿: '沒', 旣: '既', 卽: '即', 鄕: '鄉', 絶: '絕',
  汙: '污', 閒: '間', 于: '於', 歟: '與', 彊: '強', 强: '強', 李: '季', 嘆: '歎', 誌: '志', 複: '復', 尽: '盡', 屍: '尸', 灶: '竈',
  太: '大', 悌: '弟', 脩: '修', 游: '遊', 晳: '皙', 棄: '弃', 盖: '蓋', 裏: '裡', 巳: '已', 己: '已', 飯: '飰', 異: '异', 爾: '尔',
  並: '并', 竝: '并', 啟: '啓', 慚: '慙', 途: '塗', 涂: '塗', 恆: '恒', 災: '灾', 菑: '灾', 疏: '疎', 蔬: '疎', 汎: '泛', 愠: '慍' };
const ISCJK = c => /[㐀-鿿豈-﫿\u{20000}-\u{2FFFF}〓]/u.test(c);
const fold = c => FOLD[c] || c;
const foldStr = s => [...s].filter(ISCJK).map(fold).join('');

/* Legge's Chinese, numbered his way, from Gutenberg #4094 */
const PG_MISSING = [[3, '王孫賈問曰'], [5, '顏淵季路侍'], [7, '子曰、仁遠乎哉'], [8, '子曰、如有周公之才'], [12, '李康子患盜'], [13, '子曰、善人為邦百年']];
function leggeChinese(pg) {
  const lines = pg.replace(/\r/g, '').split('\n');
  const CJKline = /[㐀-鿿豈-﫿]/;
  const books = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^BOOK [IVXL]+\./.test(l) && CJKline.test(lines[i - 1] || '')) { cur = { zh: '' }; books.push(cur); continue; }
    if (!cur) continue;
    if (l.startsWith('*** END')) break;
    if (CJKline.test(l)) cur.zh += l.trim();
  }
  if (books.length !== 20) throw new Error('Gutenberg #4094: found ' + books.length + ' books, not 20');
  return books.map((b, bi) => {
    // eight characters Big5 lacked are described in parentheses: a wildcard
    let zh = b.zh.replace(/[(（][^)）]*[)）]/g, '〓').replace(/【[^】]*節】/g, '');
    for (const [bk, key] of PG_MISSING) if (bk === bi + 1) {
      const i = zh.indexOf(key);
      if (i < 0) throw new Error('Gutenberg #4094: no "' + key + '" in book ' + bk);
      zh = zh.slice(0, i) + '【補章】' + zh.slice(i);
    }
    const chs = zh.split(/【[^】]*章】/).filter((s, k) => k > 0 || s.trim()); // numbered by position: 4.9 is labelled 八
    if (chs.length !== COUNTS[bi]) throw new Error('Gutenberg #4094: book ' + (bi + 1) + ' has ' + chs.length + ' chapters, not ' + COUNTS[bi]);
    return chs.map(c => [...foldStr(c)]);
  });
}

/* edit distance of key against S from p, the end free */
function dist(S, p, key) {
  const m = key.length, n = Math.min(S.length - p, m + 3);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const eq = key[i - 1] === S[p + j - 1] || key[i - 1] === '〓';
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (eq ? 0 : 1));
    }
    prev = cur;
  }
  return Math.min(...prev);
}
/* segs: [{ t: 'base'|'note', s }] in reading order for one book.
   Returns { chapters: [[seg...]] (Legge's), intro: [notes before any text], worst, splits } */
function alignBook(legge, segs) {
  const S = [], ptr = [];
  segs.forEach((g, gi) => {
    if (g.t !== 'base') return;
    let raw = 0;
    for (const c of g.s) { if (ISCJK(c)) { S.push(fold(c)); ptr.push([gi, raw]); } raw += c.length; }
  });
  const cuts = [0], dists = [0];
  for (let k = 1; k < legge.length; k++) {
    const key = legge[k].slice(0, 12), prev = cuts[k - 1], expect = prev + legge[k - 1].length;
    const hi = Math.min(S.length - 1, expect + Math.max(80, legge[k - 1].length));
    let best = 1e9, bp = -1;
    for (let p = prev + 1; p <= hi; p++) {
      const d = dist(S, p, key);
      if (d < best || (d === best && Math.abs(p - expect) < Math.abs(bp - expect))) { best = d; bp = p; }
    }
    cuts.push(bp); dists.push(best);
  }
  const chapterOf = np => { let k = 0; while (k + 1 < cuts.length && cuts[k + 1] <= np) k++; return k; };
  const bySeg = new Map();
  ptr.forEach(([gi, raw], np) => { if (!bySeg.has(gi)) bySeg.set(gi, []); bySeg.get(gi).push([np, raw]); });
  const out = legge.map(() => []), intro = [], splits = [];
  let last = -1;
  segs.forEach((g, gi) => {
    const idx = g.t === 'base' ? bySeg.get(gi) : null;
    if (!idx) { (last < 0 ? intro : out[last]).push(g); return; }
    let k0 = chapterOf(idx[0][0]), from = 0;
    for (const [np, raw] of idx) {
      const k = chapterOf(np);
      if (k === k0) continue;
      // snap back over a lead-in of one or two characters Legge lacks (孔子曰 for 子曰)
      let at = raw;
      const m = g.s.slice(from, raw).match(/[^，。：；？！、「」『』“”‘’《》\s]*$/);
      if (m && [...m[0]].filter(ISCJK).length <= 2) at = raw - m[0].length;
      if (at > from) out[k0].push({ ...g, s: g.s.slice(from, at) });
      splits.push(k + 1);
      from = at; k0 = k;
    }
    out[k0].push({ ...g, s: g.s.slice(from) });
    last = k0;
  });
  return { chapters: out, intro, worst: Math.max(...dists), splits };
}

/* ------------------------------------------------------------------ Zhu Xi */
function zhuClean(s) {
  return s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '')
    .replace(/\{\{[Pp]roperNoun\|([^{}|]*)\}\}/g, '$1')
    .replace(/-\{([^}]*)\}-/g, '$1')
    .replace(/'''?/g, '')
    .replace(/[①-⑳]/g, '') // ①..⑳, the transcription's footnote marks
    .replace(/[\s　]+/g, '');
}
/* one juan -> [{ title, intro, segs }] per book */
function zhuXi(wt) {
  const books = [];
  const parts = wt.split(/^==([^=].*?)==\s*$/m);
  for (let k = 1; k < parts.length; k += 2) {
    const title = parts[k].trim();
    if (title === '全覽') continue;
    const book = { title, intro: [], segs: [] };
    for (const p of parts[k + 1].split(/\n[ \t　]*\n/).map(x => x.trim()).filter(Boolean)) {
      const ss = [];
      let i = 0, buf = '';
      const push = () => { const s = zhuClean(buf); if (s) ss.push({ t: 'base', s }); buf = ''; };
      while (i < p.length) {
        if (p.startsWith('{{annotate|', i)) {
          push();
          const e = tmplEnd(p, i);
          const s = zhuClean(p.slice(i + 11, e - 2));
          if (s) ss.push({ t: 'note', s });
          i = e; continue;
        }
        buf += p[i++];
      }
      push();
      if (ss.some(x => x.t === 'base')) { book.segs.push(...ss); continue; }
      // a paragraph of commentary alone: Zhu's preface to the book, or the transcription's footnote (①...)
      const raw = p.replace(/\s/g, '');
      if (!book.segs.length && !/^\{\{annotate\|[①-⑳]/.test(raw)) book.intro.push(ss.map(x => x.s).join(''));
    }
    books.push(book);
  }
  return books;
}

/* ------------------------------------------------------------------ He Yan */
/* 論語集解/0N -> [{ title, intro, segs }] per book */
function jijie(wt) {
  const books = [];
  const parts = wt.split(/^==([^=].*?)==\s*$/m);
  for (let k = 1; k < parts.length; k += 2) {
    const book = { title: parts[k].trim(), intro: [], segs: [] };
    for (const p of parts[k + 1].split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)) {
      if (p.startsWith('{{') && !p.startsWith('{{*|')) continue; // navigation and licence templates
      const ss = [];
      let i = 0, buf = '';
      const push = () => { const s = buf.replace(/-\{([^}]*)\}-/g, '$1').trim(); if (s) ss.push({ t: 'base', s }); buf = ''; };
      while (i < p.length) {
        if (p.startsWith('{{*|', i)) { push(); const e = tmplEnd(p, i); ss.push({ t: 'note', s: p.slice(i + 4, e - 2).trim() }); i = e; continue; }
        buf += p[i++];
      }
      push();
      if (!ss.some(x => x.t === 'base') && !book.segs.length) book.intro.push(ss.map(x => x.s).join(''));
      else book.segs.push(...ss);
    }
    books.push(book);
  }
  return books;
}
/* 論語註疏/卷NN -> segs for its one book (the 疏 dropped) */
function zhushu(wt) {
  const body = wt.replace(/^\{\{Header[\s\S]*?\}\}\n/, '');
  const noteOf = s => s
    .replace(/\{\{Font color\|[^|]*\|text=([\s\S]*?)\}\}/g, '$1')
    .replace(/\{\{\*\|([\s\S]*?)\}\}/g, '$1')
    .replace(/<\/?br\s*\/?>/g, '')
    .replace(/^[\s　○（(]+|[\s　○）)]+$/g, '').trim();
  const segs = [];
  for (let p of body.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)) {
    if (!/\{\{yw\|/.test(p)) continue; // 疏, headings, links, the footer
    if (/^　*(疏|\{\{CBox\|疏|\{\{\*\|【疏】|\{\{\*\|\{\{CBox|\{\{deepPink)/.test(p)) continue; // a 疏 with a stray {{yw}} in it (卷11)
    p = p.split(/\n(?=疏|　*\{\{CBox|\{\{\*\|【疏】|\{\{deepPink)/)[0]; // a 疏 glued to its chapter (卷11)
    let i = 0, between = '';
    const flush = () => { const n = noteOf(between); if (n) segs.push({ t: 'note', s: n }); between = ''; };
    while (i < p.length) {
      if (p.startsWith('{{yw|', i)) {
        flush();
        const e = tmplEnd(p, i);
        const s = p.slice(i + 5, e - 2).replace(/^[）)]/, '').trim(); // 卷04: a note's ） fell inside the next {{yw}}
        if (s) segs.push({ t: 'base', s });
        i = e; continue;
      }
      between += p[i++];
    }
    flush();
  }
  return segs;
}

/* ------------------------------------------------------ into packet segs */
function packetSegs(book, chapters, preface) {
  const out = [];
  if (preface) out.push({ base: '[' + book + ' preface]', comm: preface });
  const silent = [];
  chapters.forEach((segs, k) => {
    const tag = '[' + book + '.' + (k + 1) + '] ';
    let cur = null, first = true, noted = false;
    for (const g of segs) {
      if (g.t === 'base') {
        if (cur && !cur.comm) { cur.base += g.s; continue; }
        cur = { base: (first ? tag : '') + g.s, comm: '' }; first = false; out.push(cur);
      } else {
        if (!cur) { cur = { base: tag, comm: '' }; first = false; out.push(cur); }
        cur.comm += g.s; noted = true;
      }
    }
    if (first) out.push({ base: tag, comm: '' });
    if (!noted) silent.push(book + '.' + (k + 1));
  });
  return { segs: out, silent };
}

/* ---------------------------------------------------------- Legge's notes */
const COL_JUNK = /^[•*·■'"‘`^]\s?/;
function leggeNotes(djvu, pg) {
  const pairs = englishPairs(pg);
  const T = djvu.replace(/\r/g, '').replace(/[ \t]{2,}/g, ' ');
  const heads = [...T.matchAll(/\n[ \t]*(?:The )?H\S{4,7} [o0][fp] th\S{1,3} [BD]\S{2,3}k/gi)].map(m => m.index + 1);
  if (heads.length !== 20) throw new Error('Legge (1893): found ' + heads.length + ' "Heading of this Book", not 20');
  const title = T.lastIndexOf('Title of', heads[0]);
  const end = T.indexOf('THE GREAT LEARNING', heads[19]);
  if (end < 0) throw new Error('Legge (1893): no end of the Analects');

  // every line that could open a chapter's note
  const lines = [];
  for (let off = 0, i = 0; off < T.length; i++) {
    const nl = T.indexOf('\n', off), e = nl < 0 ? T.length : nl;
    lines.push({ at: off, l: T.slice(off, e) });
    off = e + 1;
  }
  const lineHeads = [];
  for (const { at, l } of lines) {
    if (at < heads[0] || at >= end) continue;
    const m = l.replace(COL_JUNK, '').match(/^(\d{1,2}) ?[.,\-] ?([A-Z].*)$/);
    if (!m || l.length > 62 || /\b(said|asked|replied|answered)\b/.test(m[2].slice(0, 45))) continue;
    if (isTranslation(T.slice(at, at + 120), pairs)) continue; // a numbered section of the translation
    lineHeads.push({ raw: m[1], at, caps: /[A-Z]{3,}[ ,]+[A-Z]{2,}[ ,]+[A-Z]{2,}/.test(T.slice(at, at + 260)) });
  }
  const MAXGAP = 15000; // no note, with the pages it crosses, runs longer than this
  const books = [], report = { fixed: [], absent: [], outOfOrder: [] };
  for (let b = 0; b < 20; b++) {
    const lo = heads[b], hi = b < 19 ? heads[b + 1] : end;
    const inBook = lineHeads.filter(h => h.at > lo && h.at < hi);
    const pos = {};
    // pass 1: a line that opens with the chapter's number, near where the last one ended
    let prev = lo;
    for (let n = 1; n <= COUNTS[b]; n++) {
      const c = inBook.filter(h => +h.raw === n);
      const after = c.filter(h => h.at > prev && h.at < prev + MAXGAP);
      let pick = after[0];
      if (pick && !pick.caps && after[1] && after[1].caps && after[1].at - pick.at < 1500) pick = after[1];
      if (!pick) pick = c.filter(h => h.at > prev - 2500 && h.at <= prev).pop(); // the page's columns read the other way
      if (pick) { pos[n] = pick.at; prev = Math.max(prev, pick.at); }
    }
    // pass 2: the OCR's usual slips, looked for only between the neighbours
    for (let n = 1; n <= COUNTS[b]; n++) {
      if (pos[n] != null) continue;
      const key = b + 1 + '.' + n;
      // strictly between the nearest heads found on either side
      let a = lo, z = hi;
      for (let k = n - 1; k >= 1; k--) if (pos[k] != null) { a = pos[k]; break; }
      for (let k = n + 1; k <= COUNTS[b]; k++) if (pos[k] != null) { z = pos[k]; break; }
      if (a > z) [a, z] = [z, a];
      const used = new Set(Object.values(pos));
      if (LEGGE_HEAD_AT[key]) {
        const i = T.indexOf(LEGGE_HEAD_AT[key], a);
        if (i > a && i < z) { pos[n] = i; report.fixed.push(key + ' (override)'); continue; }
      }
      const eight = String(n).replace(/3/g, '8');
      // a head the line filter refused (a long line where two columns were read as one), or in mid-line
      const midLine = (num, slack = 0) => {
        const re = new RegExp('(?:^|[ \\n])' + num + ' ?[.,] ?[A-Z][a-zA-Z]', 'g');
        re.lastIndex = Math.max(lo, a - slack) + 1;
        let m;
        while ((m = re.exec(T)) && m.index < Math.min(hi, z + slack)) {
          const at = m.index + 1, ls = T.lastIndexOf('\n', at) + 1;
          const lineTxt = T.slice(ls, T.indexOf('\n', at));
          if (used.has(at) || /\b(said|asked|replied|answered)\b/.test(T.slice(at, at + 60)) || /^Chap/.test(lineTxt)) continue;
          if (isTranslation(T.slice(at, at + 120), pairs)) continue;
          return at;
        }
        return -1;
      };
      let got = midLine(String(n));
      if (got > 0) { pos[n] = got; report.fixed.push(key + ' (mid-line or long line)'); continue; }
      if (eight !== String(n)) {
        const c = inBook.find(h => h.raw === eight && h.at > a && h.at < z && !used.has(h.at));
        got = c ? c.at : midLine(eight);
        if (got > 0) { pos[n] = got; report.fixed.push(key + ' (read ' + eight + ')'); continue; }
      }
      // last, a little before or after the neighbours: the columns were read the other way
      got = midLine(String(n), 2500);
      if (got > 0) { pos[n] = got; report.fixed.push(key + ' (mid-line, out of place)'); continue; }
      report.absent.push(key);
    }
    for (let n = 2; n <= COUNTS[b]; n++) if (pos[n] != null && pos[n - 1] != null && pos[n] < pos[n - 1]) report.outOfOrder.push((b + 1) + '.' + n);
    // a head found in mid-line or by an override sits where the columns were merged or swapped
    report.fixed.filter(f => f.startsWith((b + 1) + '.') && /mid-line|override/.test(f)).forEach(f => {
      const k = f.split(' ')[0];
      if (!report.outOfOrder.includes(k)) report.outOfOrder.push(k);
    });
    // cut: each note runs from its head to the next head in the text
    const marks = Object.entries(pos).map(([n, at]) => ({ n: +n, at })).sort((x, y) => x.at - y.at);
    const firstAt = marks.length ? marks[0].at : hi;
    const notes = {};
    marks.forEach((mk, i) => { notes[mk.n] = tidy(T.slice(mk.at, i + 1 < marks.length ? marks[i + 1].at : hi), pairs); });
    const headingNote = tidy(T.slice(b === 0 && title > heads[0] - 6000 ? title : lo, firstAt), pairs);
    books.push({ heading: headingNote, notes });
  }
  return { books, report };
}
/* Legge's English, as word triples, to know his translation when a page repeats it */
function englishPairs(pg) {
  const t = pg.replace(/\r/g, '');
  const from = t.indexOf('CONFUCIAN ANALECTS.'), to = t.indexOf('*** END');
  const words = t.slice(from, to).split('\n').filter(l => !/[㐀-鿿]/.test(l)).join(' ').toLowerCase().match(/[a-z]+/g) || [];
  const set = new Set();
  for (let i = 2; i < words.length; i++) set.add(words[i - 2] + ' ' + words[i - 1] + ' ' + words[i]);
  return set;
}
function isTranslation(para, triples) {
  const w = para.toLowerCase().replace(/-\n/g, '').match(/[a-z]+/g) || [];
  if (w.length < 6) return false;
  let hit = 0;
  for (let i = 2; i < w.length; i++) if (triples.has(w[i - 2] + ' ' + w[i - 1] + ' ' + w[i])) hit++;
  return hit / (w.length - 2) >= 0.6; // the translation scores 0.77 to 0.94, a note under 0.5
}
/* drop the page furniture from a stretch of the djvu text, then join its lines */
function tidy(chunk, pairs) {
  const paras = chunk.split(/\n[ \t]*\n/);
  const keep = [];
  paras.forEach((para, pi) => {
    const ls = para.split('\n').map(l => l.trim()).filter(Boolean);
    if (!ls.length) return;
    if (/^Chap(ter)?\.?\s+[IVXLY1l]+/i.test(ls[0])) return; // the translation
    const good = ls.filter(l => {
      if (/^\s*\d{1,3}\s*$/.test(l)) return false; // page number
      if (/^\[?\s*(BK|EK|CH)\s*[.,]/i.test(l) || /^CONF\S*\s+ANALECTS/i.test(l) || /^VOL\.\s+I\b/.test(l)) return false; // running heads
      if (/^BOOK\s+[IVXL]+\.\s/.test(l)) return false; // a book's title
      const cjk = (l.match(/[㐀-鿿豈-﫿]/g) || []).length, lat = (l.match(/[A-Za-z]/g) || []).length;
      if (cjk >= 2 && cjk >= lat) return false; // the page's Chinese text
      if (l.replace(/\s/g, '').length <= 3 && !/[a-z]{2}/.test(l)) return false; // OCR crumbs
      return true;
    });
    if (!good.length) return;
    // the translation carried over a page (never the note's own head, which may echo it);
    // a short run that quotes Chinese is a note (the OCR reads Legge's dash as 一)
    const words = (good.join(' ').match(/[A-Za-z]+/g) || []).length;
    const quotes = /[㐀-鿿]/.test(good.join('').replace(/一/g, ''));
    if (pi > 0 && pairs && words >= 6 && !(words < 12 && quotes) && isTranslation(good.join('\n'), pairs)) return;
    keep.push(good.join('\n'));
  });
  return keep.join('\n')
    .replace(/(\w)[-¬]\n(?=[a-z])/g, '$1')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------- build */
async function build(h) {
  const load = (url, file) => h.packetsOnly ? Promise.resolve(fs.readFileSync(path.join(h.CACHE, 'src', file), 'utf8')) : h.get(url, file);
  const pg = await load(PG.url, PG.file);
  const zxRaw = [];
  for (const id of ZX) zxRaw.push(await load(h.wsUrl(id), 'analects-zx-' + id + '.json'));
  const jjRaw = [];
  for (const id of JJ) jjRaw.push(await load(h.wsUrl(id), 'analects-hy-' + id + '.json'));
  const zsRaw = {};
  for (let b = 7; b <= 20; b++) zsRaw[b] = await load(h.wsUrl(ZS[b - 1]), 'analects-hy-' + ZS[b - 1] + '.json');
  const djvu = await load(LEGGE.url, LEGGE.file);

  const L = leggeChinese(pg);
  const zhu = [];
  zxRaw.forEach(r => zhu.push(...zhuXi(wikitext(r))));
  const jj = [];
  jjRaw.forEach(r => jj.push(...jijie(wikitext(r))));
  if (zhu.length !== 20) throw new Error('Zhu Xi: ' + zhu.length + ' books, not 20');
  if (jj.length !== 6) throw new Error('論語集解: ' + jj.length + ' books, not 6');
  const lg = leggeNotes(djvu, pg);

  const dir = path.join(h.CACHE, 'analects');
  fs.mkdirSync(dir, { recursive: true });
  const summary = { zhuSilent: [], heSilent: [], worst: { zhu: 0, he: 0 }, splits: { zhu: [], he: [] }, sizes: {}, legge: lg.report };
  for (let b = 1; b <= 20; b++) {
    const z = alignBook(L[b - 1], zhu[b - 1].segs);
    const heSegs = b <= 6 ? jj[b - 1].segs : zhushu(wikitext(zsRaw[b]));
    const y = alignBook(L[b - 1], heSegs);
    if (z.worst > 3 || y.worst > 3) throw new Error('book ' + b + ' did not align (edit distance ' + Math.max(z.worst, y.worst) + ')');
    summary.worst.zhu = Math.max(summary.worst.zhu, z.worst); summary.worst.he = Math.max(summary.worst.he, y.worst);
    z.splits.forEach(k => summary.splits.zhu.push(b + '.' + k)); y.splits.forEach(k => summary.splits.he.push(b + '.' + k));
    const zs = packetSegs(b, z.chapters, zhu[b - 1].intro.join('') + z.intro.map(g => g.s).join(''));
    const hePreface = (b <= 6 ? jj[b - 1].intro.join('') : '') + y.intro.map(g => g.s).join('');
    const ys = packetSegs(b, y.chapters, hePreface);
    summary.zhuSilent.push(...zs.silent); summary.heSilent.push(...ys.silent);

    const juan = ZX_JUAN[Math.ceil(b / 2) - 1], zxId = ZX[Math.ceil(b / 2) - 1];
    const heId = b <= 6 ? JJ[Math.ceil(b / 2) - 1] : ZS[b - 1];
    const lb = lg.books[b - 1];
    const notes = ['Note on ' + b + ' heading:\n' + lb.heading];
    for (let n = 1; n <= COUNTS[b - 1]; n++) if (lb.notes[n] != null) notes.push('Note on ' + b + '.' + n + ':\n' + lb.notes[n]);
    const lAbsent = lg.report.absent.filter(k => k.startsWith(b + '.'));
    const lOrder = lg.report.outOfOrder.filter(k => k.startsWith(b + '.')).sort((x, y) => +x.split('.')[1] - +y.split('.')[1]);
    const lNote = [lAbsent.length ? 'The OCR gives no note for ' + lAbsent.join(', ') + '.' : '',
      lOrder.length ? 'On the pages of ' + lOrder.join(', ') + ' the OCR read the two note columns out of order or line by line across both: those notes may hold lines of their neighbours, or lose their own to them.' : ''].filter(Boolean).join(' ');

    const packet = {
      plan: 'analects', ch: b,
      sources: [
        { id: 'zhu-xi', name: 'Zhu Xi', edition: 'zh.wikisource 四書章句集註/論語集注卷' + juan + ', revision ' + zxId,
          url: h.wsPage(zxId), licence: WS_LICENCE, segs: zs.segs,
          note: zs.silent.length ? 'Zhu Xi has no note on ' + zs.silent.join(', ') + '.' : '' },
        { id: 'he-yan', name: 'He Yan',
          edition: b <= 6
            ? 'zh.wikisource 論語集解/' + pad(Math.ceil(b / 2)) + ' (He Yan’s 集解 alone, proofread; used for books 1 to 6), revision ' + heId
            : 'zh.wikisource 論語註疏/卷' + pad(b) + ' (the 集解 notes only; Xing Bing’s 疏 dropped), revision ' + heId,
          url: h.wsPage(heId), licence: WS_LICENCE, segs: ys.segs,
          note: [ys.silent.length ? 'He Yan has no note on ' + ys.silent.join(', ') + ' in this text.' : '',
            b > 6 ? 'This text was converted from simplified characters and has slips (誌 for 志, 複 for 復 and the like).' : ''].filter(Boolean).join(' ') },
        { id: 'legge-cc1', name: 'Legge’s notes',
          edition: 'James Legge, The Chinese Classics vol. 1 (2nd ed. 1893), archive.org chineseclassics01legg, OCR text',
          url: 'https://archive.org/details/chineseclassics01legg', licence: 'public domain', note: lNote, notes: notes.join('\n\n') }
      ]
    };
    const file = path.join(dir, pad(b) + '.json');
    fs.writeFileSync(file, JSON.stringify(packet, null, 1), 'utf8');
    summary.sizes[b] = fs.statSync(file).size;
  }
  console.log('  analects: 20 packets written to .scripts/.cache/teachings/analects/'
    + ' (Legge’s notes: ' + (499 - lg.report.absent.length) + ' of 499 chapters'
    + (lg.report.absent.length ? '; none for ' + lg.report.absent.join(', ') : '') + ')');
  return summary;
}

module.exports = { build, COUNTS, _test: { leggeChinese, alignBook, zhuXi, jijie, zhushu, leggeNotes, tidy, packetSegs } };
