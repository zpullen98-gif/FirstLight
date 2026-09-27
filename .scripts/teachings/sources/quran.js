/* The Teachings: the Qur'an commentaries, in Arabic, one packet per surah.

   const quran = require('./sources/quran');
   await quran.build({ get, CACHE, packetsOnly });

   Writes .scripts/.cache/teachings/quran/<NN>.json (01.json ... 114.json):
     { plan: 'quran', ch: <surah>, sources: [{ id, name, edition, url, licence, note?, segs: [{ base, comm }] }] }
   A seg is one comment. Its base is only the label "[2:255] " or, for one
   comment on a run of ayahs, "[2:21 to 2:22] " (the app prints Pickthall's
   English itself). A surah's introduction, where it can be told apart from
   the comment on ayah 1, is its own seg "[2:0 introduction] ".

   Sources (tested 2026-09-26):
     al-Tabari, Ibn Kathir, al-Qurtubi, the Jalalayn
              Tarteel's Quranic Universal Library (QUL) text as republished by
              spa5k/tafsir_api, pinned at commit 9ae590a (= tag v1.2.1), one
              file per surah from jsDelivr: 4 x 114 = 456 requests. Each file is
              [{ text, ayah, surah }]: plain text, paragraphs split by blank
              lines, the Qur'an quoted in ﴿...﴾, the editors' footnotes inline
              as [[...]] (sometimes nested; four stray "]]" and one "[[" never
              closed, all in al-Qurtubi, are logged and handled).
              One comment on a passage is repeated on every ayah it covers:
              a run of consecutive ayahs with byte-identical text is ONE seg
              labelled with the run (runs never cross a surah; checked on the
              whole text). An ayah the source has no text for is left out and
              named in the source's note: al-Qurtubi 17:30 (the entry is only
              the editor's note that the comment is lost from the manuscripts)
              and 226 ayahs of the Jalalayn (219 given bare, as the ayah alone,
              which Tanzil's text confirms; 4 printed with the ayah before, so
              that seg's range takes them in; 3 missing from this text), plus
              1:1, whose entry is only the surah's introduction. al-Tabari, Ibn
              Kathir and al-Qurtubi otherwise cover all 6,236 ayahs (a gate).
     al-Wahidi, Asbab al-Nuzul
              OpenITI 0475AH, 0468IbnAhmadWahidiNaysaburi.AsbabNuzul.Shamela0011314-ara1
              (al-Humaydan's edition, the "cleaned" version, footnotes already
              gone) at commit cc9beb0: one request. Sections "### | سورة ...";
              an occasion starts at a paragraph "(n) - قوله تعالى: {...} {21} ."
              (the editor's ayah numbers in braces, or in a "[107، 108]" line
              after it); a heading without numbers is placed by finding its
              quoted words in the surah. What stands before a section's first
              heading, or a section with none, is a "[<s>:1 to <s>:<n> whole
              surah] " seg (the range lets packet.js --verse find it). The
              book's own chapters on the first and the last revelation and on
              the basmala go to 96:1-5 and 74:1-5, 2:281 and 9:128-129, and 1:1.
     for matching only (never in a packet)
              the Qur'an's Arabic, fawazahmed0/quran-api ara-quransimple at
              commit 47ca096 (Unlicense): places unnumbered Asbab headings and
              checks numbered ones; Tanzil's ar.jalalayn (non-commercial): tells
              whether an ayah the Jalalayn leaves bare is really bare there too.

   What is stripped from every comment: the [[...]] footnotes, bracketed
   citations ("[الأنبياء: ٣٢]", "[٢٠: ٦٣]", "[غافر ١٧]", al-Qurtubi's passage
   headers "[سورة البقرة (2): الآيات 21 الى 22]"), Shakir's hadith numbers at a
   paragraph's start in al-Tabari ("٢٢٥- ", and the later volumes' "⁕ "),
   stray footnote digits (a numeral stuck to a word, ") ٢ (", "«١»", "@ ١-٢٤٠", and in
   al-Tabari a bare "(٣)" outside a quotation), and "* *" separator lines. The
   vocalisation and the ﴿...﴾ quotations stay as they are; al-Qurtubi's "(٣)"
   after a quoted verse is the verse's number and stays. Paragraphs are joined
   by "\n". A comment is never shortened.

   Introductions (ayah 1's entry): al-Tabari has none in this text. Ibn Kathir:
   from the "تفسير سورة ..." (or "سورة ...") heading to the first separator after
   it (a basmala line or "* *"). al-Qurtubi: everything before the first line
   that is the basmala. The Jalalayn: a first paragraph "سورة ... [مكية ...]".
   Where no such mark is found the introduction stays in the ayah-1 comment
   and the packet's note says so. The QUL text of Ibn Kathir prints the end of
   his comment on 1:7 at the head of 2:1; those paragraphs go back to 1:7. */
'use strict';
const fs = require('fs');
const path = require('path');

const SHA = '9ae590abdaaa38462f4f91cc141903aa6f72cc23';
const CDN = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@' + SHA + '/tafsir/';
const OPENITI_SHA = 'cc9beb0d9645e8cdce892556423b9926a127054f';
const ASBAB_PATH = 'data/0468IbnAhmadWahidiNaysaburi/0468IbnAhmadWahidiNaysaburi.AsbabNuzul/0468IbnAhmadWahidiNaysaburi.AsbabNuzul.Shamela0011314-ara1';
const ASBAB = {
  url: 'https://raw.githubusercontent.com/OpenITI/0475AH/' + OPENITI_SHA + '/' + ASBAB_PATH,
  page: 'https://github.com/OpenITI/0475AH/blob/' + OPENITI_SHA + '/' + ASBAB_PATH,
  file: 'quran-asbab-wahidi-openiti-' + OPENITI_SHA.slice(0, 7) + '.txt'
};
const QTEXT = { url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@47ca096b0976443ba2eab2e45cdf0fb4096a2610/editions/ara-quransimple.json',
  file: 'quran-text-ara-quransimple-47ca096.json' };
const TANZIL = { url: 'https://tanzil.net/trans/?transID=ar.jalalayn&type=txt-2', file: 'quran-tanzil-ar.jalalayn.txt' };

/* ayahs per surah (the Kufan count, 6236), as spa5k's data/ayah_data.json */
const COUNTS = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52,
  52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6];

const QUL_EDITION = ', the Tarteel QUL text via spa5k/tafsir_api commit ' + SHA.slice(0, 7) + ' (2026), editors’ footnotes removed';
const QUL_LICENCE = 'the classical text is public domain; digitisation by Tarteel (QUL), no licence stated; short excerpts with attribution';
const EDS = [
  { id: 'tabari', name: 'al-Tabari', slug: 'ar-tafsir-al-tabari', book: 'Jāmiʿ al-bayān ʿan taʾwīl āy al-Qurʾān' },
  { id: 'ibn-kathir', name: 'Ibn Kathir', slug: 'ar-tafsir-ibn-kathir', book: 'Tafsīr al-Qurʾān al-ʿAẓīm' },
  { id: 'qurtubi', name: 'al-Qurtubi', slug: 'ar-tafseer-al-qurtubi', book: 'al-Jāmiʿ li-aḥkām al-Qurʾān' },
  { id: 'jalalayn', name: 'the Jalalayn', slug: 'ar-tafsir-al-jalalayn', book: 'Tafsīr al-Jalālayn (al-Maḥallī and al-Suyūṭī)' }
];
const FULL = ['tabari', 'ibn-kathir', 'qurtubi'];   // every ayah must be covered

/* ------------------------------------------------------------ fetching */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function load(h, url, file) {
  if (h.packetsOnly) return fs.readFileSync(path.join(h.CACHE, 'src', file), 'utf8');
  for (let k = 1; ; k++) {
    try { return await h.get(url, file); }
    catch (e) {   // a CDN's 5xx now and then: try again, more slowly each time
      if (k >= 4 || !/HTTP 5\d\d/.test(e.message)) throw e;
      console.log('  ' + file + ': ' + e.message.replace(/ from .*/, '') + ', retrying');
      await sleep(10000 * k);
    }
  }
}

/* ------------------------------------------------------------ Arabic tools */
const pad = n => String(n).padStart(2, '0');
const label = (s, a, b) => '[' + s + ':' + a + (b && b !== a ? ' to ' + s + ':' + b : '') + '] ';
/* letters only, for matching: no vowels, one alif, ya for alif maqsura, ha for ta marbuta */
const nz = s => String(s).replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[^ء-ي]+/g, ' ').trim();
const BASMALA = 'بسم الله الرحمن الرحيم';
const DIG = '[0-9٠-٩]';

/* [[...]] footnotes, nested ones too. A stray "]]" is dropped; a "[[" never
   closed takes the rest of its paragraph with it (both logged). */
function stripNotes(t, log, where) {
  let out = '', depth = 0;
  for (let i = 0; i < t.length; i++) {
    if (t.startsWith('[[', i)) { depth++; i++; continue; }
    if (t.startsWith(']]', i)) {
      if (depth) { depth--; i++; continue; }
      log.push(where + ': a stray "]]" dropped'); i++; continue;
    }
    if (depth && t[i] === '\n' && t[i + 1] === '\n' && !t.slice(i).includes(']]')) {
      log.push(where + ': an unclosed "[[" cut at the end of its paragraph');
      depth = 0;
    }
    if (!depth) out += t[i];
  }
  if (depth) log.push(where + ': an unclosed "[[" at the end of the entry dropped');
  return out;
}

/* a bracket that only cites: ends in a number, a few words at most */
function isCitation(inner) {
  const c = inner.replace(/["“”]/g, '').trim().replace(/[\s(),،.;؛]+$/, '');   // "[النجم: ٥٣،]", "[الزمر: ٣ (]", '[الطلاق "١٢"]'
  if (!c || c.length > 70 || c.includes('﴿')) return false;
  if (!new RegExp(DIG + '$').test(c) && !/^سورة/.test(c)) return false;
  if (/مكيه|مدنيه|اياتها/.test(nz(c))) return false;              // the Jalalayn's surah headings, not citations
  if (!new RegExp(DIG).test(c)) return false;
  return (c.match(/[ء-ي][ء-ي\u064B-\u065F\u0670]*/g) || []).length <= 7;
}
function stripCitations(t) {
  t = t.replace(/\[([^\[\]\n]{1,70})\]/g, (m, inner) => isCitation(inner) ? '' : m);
  // a citation whose "[" was printed as "]": `"..."] البقرة: ٢١٧]`
  t = t.replace(new RegExp('\\][ \\t]*[\\u0621-\\u064A\\u064B-\\u065F\\u0670 ]{2,30}[:：][ \\t]*' + DIG + '+(?:[ \\t]*[-–،,][ \\t]*' + DIG + '+)*[ \\t]*\\]?', 'g'), '');
  // and one whose "]" was never printed, or printed as "[": `[البقرة: ٢٦ ﴿...﴾`, `[آل عمران: ٣ ٤ [.`
  t = t.replace(new RegExp('\\[[ \\t]*[\\u0621-\\u064A\\u064B-\\u065F\\u0670 ]{2,30}[:：][ \\t]*' + DIG + '+(?:[ \\t]*[-–،,]?[ \\t]*' + DIG + '+)*'
    + '(?:[ \\t]*\\[(?=[ \\t]*[.،,:؛\\n]|$))?(?![ \\t]*[\\]0-9\\u0660-\\u0669])', 'g'), '');
  return t;
}
/* al-Tabari's "(٣)" outside a quotation is a footnote mark */
function stripParenMarks(t) {
  let out = '', inQ = 0, inB = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '﴿') inQ++; else if (c === '﴾' && inQ) inQ--;
    else if (c === '{') inB = 1; else if (c === '}' || c === '\n') inB = 0;
    if (c === '(' && !inQ && !inB) {
      const m = t.slice(i).match(new RegExp('^\\(\\s*' + DIG + '{1,3}\\s*\\)'));
      if (m) { i += m[0].length - 1; continue; }
    }
    out += c;
  }
  return out;
}
function clean(raw, ed, log, where) {
  let t = stripNotes(raw, [], where);             // a no-op where edSegs has already done it (and logged)
  t = t.replace(new RegExp('\\s?«\\s*' + DIG + '{1,3}\\s*»', 'g'), '');                             // "«١»", before the brackets: "[قد «١» ]"
  t = stripCitations(t);
  t = t.replace(new RegExp('@\\s*' + DIG + '+\\s*-\\s*' + DIG + '+', 'g'), '')                    // "@ ١-٢٤٠"
    .replace(new RegExp('\\)\\s*' + DIG + '{1,3}\\s*\\(', 'g'), ' ')                                  // ") ٢ ("
    .replace(/([ء-ي][\u064B-\u065F\u0670]*[ء-ي][\u064B-\u065F\u0670]*)[٠-٩]+(?![٠-٩])/g, '$1'); // a numeral stuck to a word
  if (ed === 'tabari') {
    t = t.replace(new RegExp('(^|\\n)[ \\t]*(?:' + DIG + '+[ \\t]*[-–]?|⁕)[ \\t]*(?=\\S)', 'g'), '$1');   // "٢٢٥- " / "٣١٦ " / "⁕ "
    t = stripParenMarks(t);
  }
  return t.split(/\n{2,}/)
    .map(p => p.replace(/[ \t\u00A0]+/g, ' ').replace(/ *\n */g, '\n').trim())   // a line break inside a paragraph (a verse's lines) stays
    .filter(p => p && !/^[*\s.،,:؛]+$/.test(p))
    .join('\n');
}

/* ------------------------------------------------------------ introductions */
/* a line that is the basmala, perhaps with a short invocation after it ("(رب يسر وأعن)") */
const isBasmalaLine = p => { const n = nz(p); return !p.includes('﴿') && n.startsWith(BASMALA) && n.length <= BASMALA.length + 16 && !/سوره/.test(n); };
const isStars = p => /^\s*\*[\s*]*$/.test(p);
const isTitle = p => { const n = nz(p); return /^(تفسير )?(سوره|سورتي) /.test(n) && n.length < 90 && !p.includes('﴿'); };
const isInvocation = p => { const n = nz(p); return n.startsWith(BASMALA) && !isBasmalaLine(p) && n.length < 160 && !p.includes('﴿'); };

/* Each takes ayah 1's paragraphs (footnotes already out) and returns
   { status: 'split' | 'none' | 'unmarked', spill, intro, rest }:
   'none' when the entry starts with the comment itself, 'unmarked' when an
   introduction may be there but no mark shows where it ends. */
const NONE = P => ({ status: 'none', spill: [], intro: [], rest: P });
const UNMARKED = (P, spill) => ({ status: 'unmarked', spill: spill || [], intro: [], rest: P });

/* Ibn Kathir: [the end of the previous surah, misplaced] [basmala or invocation]
   "تفسير سورة ..." (or "سورة ...") ... then a basmala line or "* *" */
function ikIntro(P, s) {
  if (s === 1) return UNMARKED(P);
  const f = P.findIndex(p => isTitle(p) || isBasmalaLine(p) || isInvocation(p));
  if (f < 0) return UNMARKED(P);
  const Q = P.slice(f);
  const t = Q.findIndex(isTitle);
  const spill = f > 0 && t >= 0 && t <= 2 ? P.slice(0, f) : [];
  const body = spill.length ? Q : P;
  if (t < 0 || t > 3) {                                            // no title: an introduction only before a basmala line
    const b = body.findIndex(isBasmalaLine);
    if (b === 0) return { status: 'none', spill, intro: [], rest: body.slice(1) };
    if (b > 0 && b <= 6 && body.slice(0, b).every(p => !p.includes('﴿'))) return { status: 'split', spill, intro: body.slice(0, b), rest: body.slice(b + 1) };
    return UNMARKED(body, spill);
  }
  const e = Q.findIndex((p, i) => i > t && (isBasmalaLine(p) || isStars(p)));
  if (e < 0) return UNMARKED(Q, spill);
  return { status: 'split', spill, intro: Q.slice(0, e).filter(p => !isBasmalaLine(p)), rest: Q.slice(e + 1) };
}
/* al-Qurtubi: the introduction, then the basmala line(s), then the passage's
   ayahs and his masa'il */
function qurtubiIntro(P, s) {
  if (s === 1) return NONE(P);                                     // 1:1 is the basmala itself
  const b = P.findIndex(isBasmalaLine);
  if (b === 0) { let r = 0; while (r < P.length && isBasmalaLine(P[r])) r++; return { status: 'none', spill: [], intro: [], rest: P.slice(r) }; }
  if (b < 0) return UNMARKED(P);
  let r = b; while (r < P.length && isBasmalaLine(P[r])) r++;
  return { status: 'split', spill: [], intro: P.slice(0, b), rest: P.slice(r) };
}
/* the Jalalayn: a first paragraph '"سورة البقرة" مدنية ...' or 'سورة يس [ مكية ... ]' */
function jalalaynIntro(P) {
  if (!P.length || P[0].includes('﴿') || !/^سوره /.test(nz(P[0]))) return NONE(P);
  return { status: 'split', spill: [], intro: [P[0]], rest: P.slice(1) };
}

/* ------------------------------------------------------------ the tafsirs */
function edSegs(ed, s, arr, log) {
  const n = COUNTS[s - 1];
  const by = {};
  for (const a of arr) { if (a.surah !== s) throw new Error(ed.id + ' ' + s + '.json holds surah ' + a.surah); by[a.ayah] = a.text; }
  const runs = [];
  for (let a = 1; a <= n;) {
    if (!by[a]) { a++; continue; }
    let b = a; while (b + 1 <= n && by[b + 1] === by[a]) b++;
    runs.push({ a, b, raw: by[a] });
    a = b + 1;
  }
  const out = { segs: [], intro: null, spill: [], introNotSplit: false, introOnly: false, missing: [], notesOnly: [] };
  for (let a = 1; a <= n; a++) if (!by[a]) out.missing.push(a);
  runs.forEach((r, k) => {
    const where = ed.id + ' ' + s + ':' + r.a;
    let text = stripNotes(r.raw, log, where);
    if (k === 0 && r.a === 1 && ed.id !== 'tabari') {
      const P = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
      const cut = ed.id === 'ibn-kathir' ? ikIntro(P, s) : ed.id === 'qurtubi' ? qurtubiIntro(P, s) : jalalaynIntro(P);
      out.spill = cut.spill;
      const introClean = cut.intro.length ? clean(cut.intro.join('\n\n'), ed.id, [], where) : '';
      const restClean = clean(cut.rest.join('\n\n'), ed.id, [], where);
      if (cut.status === 'split' && introClean && (restClean || ed.id === 'jalalayn')) {
        out.intro = introClean;
        if (!restClean) out.introOnly = true;
        text = cut.rest.join('\n\n');
      } else {
        text = cut.status === 'none' || cut.spill.length ? cut.rest.join('\n\n') : text;
        out.introNotSplit = cut.status !== 'none';
      }
    }
    const comm = clean(text, ed.id, log, where);
    if (comm) out.segs.push({ a: r.a, b: r.b, comm });
    else for (let a = r.a; a <= r.b; a++) { out.missing.push(a); if (!(a === 1 && out.introOnly)) out.notesOnly.push(a); }   // only an editor's footnote
  });
  out.missing.sort((x, y) => x - y);
  return out;
}

/* ------------------------------------------------------------ al-Wahidi */
const SURAH_NAMES = [
  ['الفاتحة', 'فاتحة الكتاب'], ['البقرة'], ['آل عمران'], ['النساء'], ['المائدة'], ['الأنعام'], ['الأعراف'], ['الأنفال'], ['التوبة', 'براءة'], ['يونس'],
  ['هود'], ['يوسف'], ['الرعد'], ['إبراهيم'], ['الحجر'], ['النحل'], ['الإسراء', 'بني إسرائيل', 'سبحان'], ['الكهف'], ['مريم'], ['طه'],
  ['الأنبياء'], ['الحج'], ['المؤمنون', 'المؤمنين'], ['النور'], ['الفرقان'], ['الشعراء'], ['النمل'], ['القصص'], ['العنكبوت'], ['الروم'],
  ['لقمان'], ['السجدة', 'تنزيل السجدة', 'ألم تنزيل'], ['الأحزاب'], ['سبأ'], ['فاطر', 'الملائكة'], ['يس'], ['الصافات'], ['ص'], ['الزمر'], ['غافر', 'المؤمن'],
  ['فصلت', 'حم السجدة'], ['الشورى', 'حم عسق'], ['الزخرف'], ['الدخان'], ['الجاثية'], ['الأحقاف'], ['محمد', 'القتال'], ['الفتح'], ['الحجرات'], ['ق'],
  ['الذاريات'], ['الطور'], ['النجم'], ['القمر'], ['الرحمن'], ['الواقعة'], ['الحديد'], ['المجادلة'], ['الحشر'], ['الممتحنة'],
  ['الصف'], ['الجمعة'], ['المنافقون', 'المنافقين'], ['التغابن'], ['الطلاق'], ['التحريم'], ['الملك', 'تبارك'], ['القلم', 'ن'], ['الحاقة'], ['المعارج', 'سأل سائل'],
  ['نوح'], ['الجن'], ['المزمل'], ['المدثر'], ['القيامة'], ['الإنسان', 'الدهر', 'هل أتى'], ['المرسلات'], ['النبأ', 'عم'], ['النازعات'], ['عبس'],
  ['التكوير'], ['الانفطار'], ['المطففين'], ['الانشقاق'], ['البروج'], ['الطارق'], ['الأعلى'], ['الغاشية'], ['الفجر'], ['البلد'],
  ['الشمس'], ['الليل'], ['الضحى'], ['الشرح', 'ألم نشرح', 'الانشراح'], ['التين'], ['العلق', 'اقرأ'], ['القدر'], ['البينة', 'لم يكن'], ['الزلزلة', 'إذا زلزلت', 'الزلزال'], ['العاديات'],
  ['القارعة'], ['التكاثر'], ['العصر'], ['الهمزة'], ['الفيل'], ['قريش'], ['الماعون', 'أرأيت'], ['الكوثر'], ['الكافرون'], ['النصر'],
  ['المسد', 'تبت'], ['الإخلاص'], ['الفلق'], ['الناس']
];
const SURAH_BY_NAME = new Map();
SURAH_NAMES.forEach((ns, i) => ns.forEach(nm => SURAH_BY_NAME.set(nz(nm), i + 1)));
/* the book's own chapters that stand before the Fatiha */
const ASBAB_FRONT = [
  { head: /^القول في أول ما نزل/, at: [[96, 1, 5], [74, 1, 5]] },
  { head: /^القول في آخر ما نزل/, at: [[2, 281, 281], [9, 128, 129]] },
  { head: /^القول في آية التسمية/, at: [[1, 1, 1]] },
  { head: /^مقدمة المؤلف/, at: [] }
];

function asbabTidy(p) {
  p = p.replace(/PageV\d+P\d+/g, ' ').replace(/\bms\d+\b/g, ' ')
    .replace(/^\s*(?:\(\s*\d+\s*\)\s*-\s*|\[\s*\d+\s*\]\s*)/, '');             // the editor's running counters
  return stripCitations(p)                                                     // "[471]", "[1: 5]"
    .replace(/\(\s*\d{1,3}\s*\)/g, '')                                         // footnote marks (the notes are gone)
    .replace(new RegExp('\\{\\s*' + DIG + '[0-9\\u0660-\\u0669،,\\s\\-–]*\\}', 'g'), '')   // "{21}", "{1، 2}"
    .replace(/[ \t]+/g, ' ').replace(/\s+([.،,])/g, '$1').replace(/^[\s.]+|\s+$/g, '').replace(/^\.$/, '');
}
const numList = s => s.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x0660).split(/[^0-9]+/).filter(Boolean).map(Number);

function asbabParse(raw, quranText, log) {
  const L = raw.replace(/\r/g, '').split('\n');
  const paras = [];
  for (const l of L) {
    if (/^### \|/.test(l)) {
      const h = l.replace(/^### \|\s*/, '').trim();
      if (/^\.+$/.test(h)) { paras.push({ glitch: true }); continue; }    // "....." : a markup slip, not a section
      paras.push({ head: h });
    } else if (/^# /.test(l)) paras.push({ p: l.slice(2) });
    else if (/^~~/.test(l)) { const last = paras[paras.length - 1]; if (last && last.p !== undefined) last.p += ' ' + l.slice(2); }
  }
  /* sections: surah number, or a front chapter */
  const sections = [];
  let cur = null;
  for (const x of paras) {
    if (x.head) {
      const front = ASBAB_FRONT.find(f => f.head.test(x.head));
      if (front) { cur = { front, head: x.head, paras: [] }; sections.push(cur); continue; }
      const nm = nz(x.head.replace(/^سورة\s+/, ''));
      const s = SURAH_BY_NAME.get(nm);
      if (!s) throw new Error('Asbab: no surah is named "' + x.head + '"');
      cur = { s, head: x.head, paras: [] }; sections.push(cur); continue;
    }
    if (x.glitch) { if (cur) cur.paras.push({ glitch: true }); continue; }
    if (!cur) continue;
    const t = x.p.replace(/PageV\d+P\d+/g, ' ').replace(/\bms\d+\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (t) cur.paras.push({ t });
  }
  let last = 0;
  for (const sec of sections) if (sec.s) { if (sec.s <= last) throw new Error('Asbab: section ' + sec.head + ' out of order'); last = sec.s; }
  for (const f of ASBAB_FRONT) if (!sections.some(sec => sec.front === f)) throw new Error('Asbab: the opening chapter ' + f.head + ' is gone');
  if (!sections.some(sec => sec.paras.some(x => x.t && /^المعوذتان/.test(x.t)))) throw new Error('Asbab: the Mu’awwidhatayn paragraph is gone');

  /* the Qur'an's words, for placing a heading */
  const Q = {};
  for (const v of quranText) {
    let t = v.text;
    if (v.verse === 1 && v.chapter !== 1 && v.chapter !== 9) { const w = t.split(/\s+/); if (nz(w.slice(0, 4).join(' ')) === BASMALA) t = w.slice(4).join(' '); }
    Q[v.chapter + ':' + v.verse] = ' ' + nz(t) + ' ';
  }
  const findAyah = (s, words, from) => {
    if (words.length < 2) return null;
    /* the longest opening of the quote found in one ayah decides (openings
       repeat: "وإذا طلقتم النساء فبلغن أجلهن" is 2:231 and 2:232); a quote may
       run over two ayahs, so down to two words. Returns { a, k } (k words matched). */
    for (let k = Math.min(words.length, 12); k >= 2; k--) {
      const needle = ' ' + words.slice(0, k).join(' ') + ' ';
      const hits = [];
      for (let a = 1; a <= COUNTS[s - 1]; a++) if (Q[s + ':' + a].includes(needle)) hits.push(a);
      if (hits.length) return { a: hits.find(a => a >= (from || 1)) || hits[0], k };
    }
    return null;
  };
  const quoteWords = t => {
    const m = t.match(/\{([^}]*[ء-ي][^}]*)(?:\}|$)/) || t.match(/(?:قوله|وقوله)(?:\s*تعالى|\s*عز وجل|\s*-\s*عز وجل\s*-)?\s*:?\s*([^.{[(]{6,80})/);
    return m ? nz(m[1]).split(' ').filter(Boolean) : [];
  };
  const HEAD = /^(?:\(\s*\d+\s*\)\s*-\s*|\[\s*\d+\s*\]\s*)?(?:و?قوله|وقال الله|قال الله تعالى)/;
  const NUMS_ONLY = new RegExp('^\\[\\s*' + DIG + '[0-9\\u0660-\\u0669،,\\s\\-–:]*\\]\\s*\\.?$');

  const occ = [];      // { s, a, b, whole?, front?, paras: [] }
  let mu = null;       // the Mu'awwidhatayn, printed together inside al-Ikhlas' section
  for (const sec of sections) {
    if (sec.front) {
      for (const [s, a, b] of sec.front.at) occ.push({ s, a, b, front: true, paras: [sec.head].concat(sec.paras.filter(x => x.t).map(x => x.t)) });
      continue;
    }
    const s = sec.s, n = COUNTS[s - 1];
    let o = { s, a: 1, b: n, whole: true, paras: [] };
    occ.push(o);
    const P = sec.paras;
    for (let i = 0; i < P.length; i++) {
      const x = P[i];
      if (x.glitch) continue;
      if (/^المعوذتان/.test(x.t)) {                                  // 113 and 114, one occasion for both
        mu = o = { s: 113, a: 1, b: 5, s2: 114, b2: 6, paras: [x.t] };
        occ.push(o);
        continue;
      }
      if (mu && o === mu) { o.paras.push(x.t); continue; }
      if (HEAD.test(x.t) && x.t.length < 700) {
        let nums = null;
        const groups = [...x.t.matchAll(new RegExp('\\{\\s*(' + DIG + '[0-9\\u0660-\\u0669،,\\s\\-–]*)\\}', 'g'))];   // braces with digits: always the editor's ayah numbers
        if (groups.length) nums = numList(groups[groups.length - 1][1]);
        let j = i + 1;
        while (j < P.length && P[j].glitch) j++;
        if (!nums && j < P.length && NUMS_ONLY.test(P[j].t)) { nums = numList(P[j].t); P[j] = { glitch: true }; }
        const toEnd = x.t.length < 200 && /إلى آخر السورة/.test(x.t);
        const w = quoteWords(x.t);
        const counter = /^(?:\(\s*\d+\s*\)\s*-|\[\s*\d+\s*\])/.test(x.t);
        if (nums && nums.length) {
          let a = Math.min(...nums), b = toEnd ? n : Math.max(...nums);
          if (a < 1 || b > n) throw new Error('Asbab: heading "' + x.t.slice(0, 60) + '" names ayahs ' + nums.join(',') + ' outside surah ' + s);
          const f = findAyah(s, w, a);
          if (f && (f.a < a - 1 || f.a > b + 1)) {
            if (f.k >= 5) { log.push('Asbab ' + s + ':' + a + ': the heading quotes ' + f.k + ' words of ' + s + ':' + f.a + ' only; placed there, not at the editor’s ' + nums.join(', ')); a = b = f.a; }
            else log.push('Asbab ' + s + ':' + a + ': the heading’s opening words also stand in ' + s + ':' + f.a + ' (kept at the editor’s number)');
          }
          o = { s, a, b, paras: [x.t] }; occ.push(o); continue;
        }
        const f = findAyah(s, w, o.whole ? 1 : o.a);
        if (f && (counter || o.whole || f.a < o.a || f.a > o.b)) {
          log.push('Asbab ' + s + ': a heading with no ayah number placed at ' + s + ':' + f.a + (toEnd ? ' to the end' : '') + ' by its words ("' + x.t.slice(0, 50) + '")');
          o = { s, a: f.a, b: toEnd ? n : f.a, paras: [x.t] }; occ.push(o); continue;
        }
        if (counter && !f) log.push('Asbab ' + s + ': a numbered heading not placed, kept with ' + (o.whole ? 'the surah' : s + ':' + o.a) + ' ("' + x.t.slice(0, 50) + '")');
      }
      o.paras.push(x.t);
    }
  }
  return occ.map(o => ({ ...o, text: o.paras.map(asbabTidy).filter(p => p && nz(p) !== BASMALA).join('\n') })).filter(o => o.text)
    .sort((x, y) => x.s - y.s || (y.whole ? 1 : 0) - (x.whole ? 1 : 0) || x.a - y.a || x.b - y.b);
}

/* ------------------------------------------------------------ Jalalayn gaps */
function tanzilLines(raw) {
  const m = {};
  for (const l of raw.split(/\r?\n/)) { const x = l.match(/^(\d+)\|(\d+)\|(.*)$/); if (x) m[x[1] + ':' + x[2]] = x[3]; }
  if (Object.keys(m).length !== 6236) throw new Error('Tanzil ar.jalalayn: ' + Object.keys(m).length + ' lines, not 6236');
  return m;
}

/* ------------------------------------------------------------ build */
async function build(h) {
  const log = [];
  const asbabRaw = await load(h, ASBAB.url, ASBAB.file);
  const tanzil = tanzilLines(await load(h, TANZIL.url, TANZIL.file));
  const qjson = JSON.parse(await load(h, QTEXT.url, QTEXT.file));
  if (!qjson.quran || qjson.quran.length !== 6236) throw new Error('Qur’an text: ' + (qjson.quran || []).length + ' ayahs, not 6236');
  const raw = {};
  for (const ed of EDS) {
    raw[ed.id] = [];
    for (let s = 1; s <= 114; s++) raw[ed.id][s] = JSON.parse(await load(h, CDN + ed.slug + '/' + s + '.json', 'quran-' + ed.id + '-' + s + '.json'));
  }

  const asbab = asbabParse(asbabRaw, qjson.quran, log);
  const per = {};                       // per[s][edId] = edSegs result
  for (let s = 1; s <= 114; s++) {
    per[s] = {};
    for (const ed of EDS) per[s][ed.id] = edSegs(ed, s, raw[ed.id][s], log);
  }
  /* Ibn Kathir: paragraphs printed at the head of a surah's first entry that
     belong to the previous surah's last comment */
  const spills = [];
  for (let s = 2; s <= 114; s++) {
    for (const ed of EDS) {
      const r = per[s][ed.id];
      if (!r.spill.length) continue;
      const prev = per[s - 1][ed.id].segs;
      const lastSeg = prev[prev.length - 1];
      const extra = clean(r.spill.join('\n\n'), ed.id, log, ed.id + ' ' + s + ':1');
      lastSeg.comm += '\n' + extra;
      spills.push({ ed: ed.id, from: s, to: (s - 1) + ':' + lastSeg.b, chars: extra.length });
      log.push(ed.id + ' ' + s + ':1: ' + r.spill.length + ' paragraphs (' + extra.length + ' chars) moved back to ' + (s - 1) + ':' + lastSeg.b);
    }
  }
  /* the Jalalayn's missing ayahs. Tanzil's line tells a bare ayah (only the
     ayah, in «...») from a glossed one; a glossed one whose first quoted words
     stand in the entry just before is printed there, and that seg's range
     takes it in */
  const jGaps = {};
  for (let s = 1; s <= 114; s++) {
    const r = per[s].jalalayn, g = { bare: [], merged: [], lost: [], introOnly: [] };
    for (const a of r.missing) {
      if (a === 1 && r.introOnly) { g.introOnly.push(a); continue; }
      const line = tanzil[s + ':' + a] || '';
      if (nz(line.replace(/«[^»]*»/g, ' ')).replace(/\s/g, '').length < 3) { g.bare.push(a); continue; }
      const lemma = nz((line.match(/«([^»]+)»/) || ['', ''])[1]).split(' ').slice(0, 3).join(' ');
      const prev = r.segs.filter(x => x.b < a).pop();
      if (prev && prev.b === a - 1 && lemma.length > 3 && nz(prev.comm).includes(lemma)) { prev.b = a; g.merged.push(a); continue; }
      g.lost.push(a);
    }
    jGaps[s] = g;
  }

  /* coverage of the three full commentaries */
  const uncovered = [];
  for (let s = 1; s <= 114; s++) for (const id of FULL) {
    const cov = new Set();
    per[s][id].segs.forEach(g => { for (let a = g.a; a <= g.b; a++) cov.add(a); });
    for (let a = 1; a <= COUNTS[s - 1]; a++) if (!cov.has(a) && !per[s][id].notesOnly.includes(a)) uncovered.push(id + ' ' + s + ':' + a);
  }
  if (uncovered.length) throw new Error('no comment for ' + uncovered.slice(0, 20).join(', ') + (uncovered.length > 20 ? ' and ' + (uncovered.length - 20) + ' more' : ''));

  const dir = path.join(h.CACHE, 'quran');
  fs.mkdirSync(dir, { recursive: true });
  const summary = { sizes: {}, spills, introNotSplit: {}, jalalaynGaps: jGaps, asbab: asbab.length, log };
  const range = (s, xs) => xs.map(a => s + ':' + a).join(', ');
  for (let s = 1; s <= 114; s++) {
    const n = COUNTS[s - 1];
    const sources = EDS.map(ed => {
      const r = per[s][ed.id];
      const segs = [];
      if (r.intro) segs.push({ base: '[' + s + ':0 introduction] ', comm: r.intro });
      r.segs.forEach(g => segs.push({ base: label(s, g.a, g.b), comm: g.comm }));
      const notes = [];
      if (r.segs.some(g => g.b > g.a) && ed.id !== 'jalalayn') notes.push('A seg labelled with a range is one comment on the whole passage; this text gives no finer division.');
      if (r.notesOnly.length && ed.id !== 'jalalayn') notes.push('No comment on ' + range(s, r.notesOnly) + ': the Tarteel entry holds only an editor’s footnote'
        + (ed.id === 'qurtubi' && s === 17 ? ', which says his comment on 17:30 is lost from the manuscripts' : '') + '.');
      if (r.introNotSplit) { notes.push('The surah’s introduction is not marked off in this text; it stands at the head of the comment on ' + s + ':1.'); (summary.introNotSplit[ed.id] = summary.introNotSplit[ed.id] || []).push(s); }
      spills.filter(x => x.ed === ed.id && x.from === s + 1).forEach(x => notes.push('The end of this comment on ' + x.to + ' is printed at the head of ' + (s + 1) + ':1 in the Tarteel text; it is put back here.'));
      if (ed.id === 'jalalayn') {
        const g = jGaps[s];
        if (g.introOnly.length) notes.push('The Jalalayn’s entry for ' + range(s, g.introOnly) + ' is the surah’s introduction only; it has no gloss of its own there.');
        if (g.bare.length) notes.push('No comment on ' + range(s, g.bare) + ' (the Jalalayn gives the ayah alone).');
        if (g.merged.length) notes.push('The gloss on ' + range(s, g.merged) + ' is printed with the ayah before it (that seg’s range includes it).');
        if (g.lost.length) notes.push('No comment on ' + range(s, g.lost) + ' in the Tarteel text, though other editions of the Jalalayn gloss it.');
      }
      return { id: ed.id, name: ed.name, edition: ed.book + QUL_EDITION, url: CDN + ed.slug + '/' + s + '.json', licence: QUL_LICENCE, note: notes.join(' '), segs };
    });
    const mine = asbab.filter(o => o.s === s);
    const shared = asbab.find(o => o.s2 === s);    // al-Nas: its occasion is al-Falaq's, in packet 113 (the same day)
    const aNotes = [];
    if (shared) aNotes.push('al-Wahidi gives al-Falaq and al-Nas one occasion together: the seg "[' + shared.s + ':1 to ' + s + ':' + n + ']" in the packet for surah ' + shared.s + '.');
    else if (!mine.length) aNotes.push('al-Wahidi gives no occasion of revelation for this surah.');
    if (mine.some(o => o.front)) aNotes.push('A seg that opens with "القول في ..." is one of the book’s opening chapters, placed on the ayahs it is about.');
    if (mine.some(o => o.s2)) aNotes.push('al-Wahidi gives al-Falaq and al-Nas one occasion together (this seg covers both).');
    sources.push({
      id: 'wahidi', name: 'al-Wahidi, Asbab al-Nuzul',
      edition: 'Asbāb nuzūl al-Qurʾān, ed. ʿIṣām al-Ḥumaydān (Dār al-Iṣlāḥ, 2nd ed. 1992), OpenITI ' + path.basename(ASBAB_PATH) + ' at commit ' + OPENITI_SHA.slice(0, 7) + ' (the cleaned text; the editor’s footnotes removed)',
      url: ASBAB.page, licence: 'public domain text; OpenITI digitisation, CC BY-NC-SA 4.0', note: aNotes.join(' '),
      segs: mine.map(o => ({ base: o.s2 ? '[' + o.s + ':1 to ' + o.s2 + ':' + o.b2 + '] ' : o.whole ? '[' + s + ':1 to ' + s + ':' + n + ' whole surah] ' : label(o.s, o.a, o.b), comm: o.text }))
    });
    const packet = { plan: 'quran', ch: s, sources };
    const file = path.join(dir, pad(s) + '.json');
    fs.writeFileSync(file, JSON.stringify(packet, null, 1), 'utf8');
    summary.sizes[s] = fs.statSync(file).size;
  }
  const total = Object.values(summary.sizes).reduce((x, y) => x + y, 0);
  const jb = Object.values(jGaps).reduce((x, g) => x + g.bare.length, 0), jm = Object.values(jGaps).reduce((x, g) => x + g.merged.length, 0), jl = Object.values(jGaps).reduce((x, g) => x + g.lost.length, 0);
  console.log('  quran: 114 packets written to .scripts/.cache/teachings/quran/ (' + (total / 1048576).toFixed(1) + ' MB; al-Wahidi ' + asbab.length
    + ' occasions; the Jalalayn bare on ' + jb + ' ayahs, merged on ' + jm + ', lost on ' + jl + (spills.length ? '; ' + spills.length + ' spill moved back' : '') + ')');
  if (log.length) console.log('  quran: ' + log.length + ' repairs and placements logged (build() returns them)');
  return summary;
}

module.exports = { build, COUNTS, _test: { clean, stripNotes, stripCitations, edSegs, asbabParse, ikIntro, qurtubiIntro, jalalaynIntro, nz } };
