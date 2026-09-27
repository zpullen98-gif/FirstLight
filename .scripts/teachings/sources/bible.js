/* The Teachings: what the Fathers say on each chapter of the Bible.

   const bible = require('./sources/bible');
   await bible.build({ get, CACHE, packetsOnly });

   Writes one packet per chapter of the WEB (1,189, numbered as the WEB and the
   KJV) to .scripts/.cache/teachings/bible/<slug>.json ("genesis-20",
   "psalm-23", "song-of-songs-2", "1-samuel-3"):
     { plan: 'bible', ch: <slug>, sources: [{ id, name, edition, url, licence, note?, segs, notes? }] }
   The first source is { id: 'index' }: a one-paragraph summary of the chapter's
   coverage. Every other source is ONE roster Father (roster.json
   plans.bible.commentators; ids as there), with all his passages on the
   chapter. Each seg's base is "[<Book> <c>:<v>] " or "[<Book> <c>:<a> to <c>:<b>] "
   (the verses the passage treats) followed by the citation in words, and its
   comm is the passage: the Father's own words, never a note of the editors.

   Sources (all tested 2026-09-26; only public-domain translations printed
   1841 to 1900, and Henry's of 1706 to 1714):
     CCEL ThML   the ANF and NPNF volumes that hold a roster Father (27 of the 37:
                 anf01 Irenaeus, anf05 Hippolytus and Cyprian, anf06 Gregory
                 Thaumaturgus, anf07 Victorinus, npnf101-108 Augustine, 109-114
                 Chrysostom, npnf204-210 Athanasius, Gregory of Nyssa, Jerome,
                 Gregory Nazianzen, Basil, Hilary, Ambrose, npnf212-213 Leo,
                 Gregory the Great, Ephrem). https://ccel.org/ccel/s/schaff/<vol>.xml.
                 The other ten hold no roster Father (Clement, Tertullian, Origen,
                 the apocrypha, the historians, Cassian, the councils) and are not
                 fetched. ccel.org asks for 10 s between requests (robots.txt).
       units     a continuous commentary is cut into units by the volume's
                 <scripCom> markers (a start verse; the unit runs to the next
                 marker's start), by passage titles ("Galatians 1:1--3"), or by
                 the tables below (Augustine's Psalms by title, CCEL numbering them
                 as the English Bible does; Psalm 119 by its Hebrew letters;
                 Basil's Hexaemeron; Hilary's three psalms; the Metaphrase).
       verses    a cursor inside the unit: a lemma paragraph (a short quotation,
                 or one opening with a quotation) moves it forward to the verse its
                 reference names (inline, or a footnote that is only the
                 reference) or, failing that, to the verse its words match (the
                 WEB's words, with a small stoplist and stemmer); every other
                 paragraph takes the cursor's verse.
       notes     never printed. A footnote that is only a scripture reference
                 identifies a quotation and counts as that paragraph's reference;
                 any longer footnote is the editor's and is dropped whole.
       citations every paragraph of a roster Father that quotes the chapter
                 (outside his own commentary on the book) is a candidate.
     Catena      Aquinas, Catena Aurea (Oxford 1841 to 1845): Matthew and Mark from
                 CCEL catena1 and catena2 (ThML, verse lines class "scripture");
                 Luke and John from isidore.co english/CALuke.htm and CAJohn.htm
                 (CCEL has no Luke or John: catena3 and catena4 are 404). Only the
                 roster Fathers' extracts are kept; the rest are counted.
     Moralia     Gregory the Great, Morals on the Book of Job (Oxford 1844 to 1850),
                 lectionarycentral.com GregoryMoralia/Book01..35.html (windows-1252).
                 "Ver. N." lemmas in the Vulgate's numbering; the chapter comes from
                 MORALIA below and the verse-number resets; Job 39 to 41 are mapped
                 to the English numbering (the translators' "[E.V. ...]" wins).
     Cyril       Cyril of Alexandria on John (LFC 43, Pusey 1874; LFC 48, Randell
                 1885), tertullian.org/fathers/cyril_on_john_NN_bookN.htm
                 ("public domain - copy freely"). Lemmas "<p>NN <i>...</i>"; Books 7
                 and 8 survive only in fragments.
     Henry       Matthew Henry, CCEL mhc1 to mhc6 (ThML): the fallback, Genesis to
                 Acts only (Romans on were finished by others after his death),
                 used only when a chapter's Fathers come to under about 250 words.

   Selection per chapter (about 3,000 words of Fathers at most):
     1. continuous commentary: up to two Fathers, BOOK_PRIORITY's first and then
        any other in the roster's order, about 900 words each: an 80-word
        excerpt from the first paragraph on each of the verses he says most on
        (single verses before ranges; the second Father's verses already covered
        by the first count less), then second paragraphs while words remain;
     2. the Catena's roster Fathers for the Gospels: about 600 words, up to
        1,500 less the commentary's words when there is little commentary; each
        verse group in turn, Fathers not yet printed first;
     3. 3 to 5 citations from other works: at most one per work, ranked by the
        roster's order, then by how many of the chapter's verses they quote; a
        paragraph over 250 words is cut to the sentences round its reference;
        the label is the run of verses holding the first verse it names;
     4. Matthew Henry (his chapter introduction and his section on the verse the
        Fathers quote most) when 1 to 3 come to under 250 words and the book is
        Genesis to Acts.
   The index's notes say who comments, what the Catena left out (by name), how
   many citing paragraphs exist, and whether Henry was added.

   Not cut cleanly: Augustine's Tractates and sermons often quote a verse
   without a reference, so their labels fall back to the tractate's range when
   the quotation does not match the WEB's words; Hilary's psalm homilies carry
   no verse references (whole-psalm labels); Chrysostom's first paragraph in a
   homily takes the homily's first verse. Three Cyril lemmas (1:30, 8:34, 18:17)
   match the WEB weakly (build() reports them). */
'use strict';
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------ the books */
const BOOKS = [['Gen', 'Genesis'], ['Exod', 'Exodus'], ['Lev', 'Leviticus'], ['Num', 'Numbers'], ['Deut', 'Deuteronomy'],
  ['Josh', 'Joshua'], ['Judg', 'Judges'], ['Ruth', 'Ruth'], ['1Sam', '1 Samuel'], ['2Sam', '2 Samuel'], ['1Kgs', '1 Kings'],
  ['2Kgs', '2 Kings'], ['1Chr', '1 Chronicles'], ['2Chr', '2 Chronicles'], ['Ezra', 'Ezra'], ['Neh', 'Nehemiah'],
  ['Esth', 'Esther'], ['Job', 'Job'], ['Ps', 'Psalm'], ['Prov', 'Proverbs'], ['Eccl', 'Ecclesiastes'], ['Song', 'Song of Songs'],
  ['Isa', 'Isaiah'], ['Jer', 'Jeremiah'], ['Lam', 'Lamentations'], ['Ezek', 'Ezekiel'], ['Dan', 'Daniel'], ['Hos', 'Hosea'],
  ['Joel', 'Joel'], ['Amos', 'Amos'], ['Obad', 'Obadiah'], ['Jonah', 'Jonah'], ['Mic', 'Micah'], ['Nah', 'Nahum'],
  ['Hab', 'Habakkuk'], ['Zeph', 'Zephaniah'], ['Hag', 'Haggai'], ['Zech', 'Zechariah'], ['Mal', 'Malachi'],
  ['Matt', 'Matthew'], ['Mark', 'Mark'], ['Luke', 'Luke'], ['John', 'John'], ['Acts', 'Acts'], ['Rom', 'Romans'],
  ['1Cor', '1 Corinthians'], ['2Cor', '2 Corinthians'], ['Gal', 'Galatians'], ['Eph', 'Ephesians'], ['Phil', 'Philippians'],
  ['Col', 'Colossians'], ['1Thess', '1 Thessalonians'], ['2Thess', '2 Thessalonians'], ['1Tim', '1 Timothy'],
  ['2Tim', '2 Timothy'], ['Titus', 'Titus'], ['Phlm', 'Philemon'], ['Heb', 'Hebrews'], ['Jas', 'James'], ['1Pet', '1 Peter'],
  ['2Pet', '2 Peter'], ['1John', '1 John'], ['2John', '2 John'], ['3John', '3 John'], ['Jude', 'Jude'], ['Rev', 'Revelation']];
const NAME = {}, CODE_OF = {}, ORDER = {};
BOOKS.forEach(([c, n], i) => { NAME[c] = n; CODE_OF[n.toLowerCase()] = c; ORDER[c] = i; });
const HENRY_LAST = ORDER.Acts; // Henry wrote Genesis to Acts himself
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* The WEB as the app has it: WEB[code][c] = [verse texts]. */
let WEB = null;
function web() {
  if (WEB) return WEB;
  const corpus = require('../corpus');
  const A = corpus.atomsOf('bible');
  WEB = {};
  for (let ai = 0; ai < A.atoms.length; ai++) {
    const us = corpus.unitsOfAtom('bible', ai);
    const m = us[0].ch.match(/^(.*) (\d+)$/);
    const code = CODE_OF[m[1].toLowerCase()];
    if (!code) throw new Error('bible: unknown book ' + m[1]);
    (WEB[code] = WEB[code] || [null])[+m[2]] = us.map(u => u.txt);
  }
  return WEB;
}
const nCh = b => web()[b].length - 1;
const nV = (b, c) => (web()[b] && web()[b][c]) ? web()[b][c].length : 0;

/* ------------------------------------------------------------ roster */
const ROSTER = require('../roster.json');
const FATHERS = ROSTER.plans.bible.commentators.filter(id => id !== 'matthew-henry');
const RANK = {}; FATHERS.forEach((id, i) => { RANK[id] = i; });
const CNAME = { augustine: 'Augustine', chrysostom: 'Chrysostom', jerome: 'Jerome', 'gregory-great': 'Gregory the Great',
  basil: 'Basil', ambrose: 'Ambrose', 'cyril-alexandria': 'Cyril of Alexandria', athanasius: 'Athanasius', irenaeus: 'Irenaeus',
  ephrem: 'Ephrem', 'leo-great': 'Leo the Great', hilary: 'Hilary', 'gregory-nyssa': 'Gregory of Nyssa',
  'gregory-nazianzus': 'Gregory Nazianzen', cyprian: 'Cyprian', bede: 'Bede', hippolytus: 'Hippolytus', victorinus: 'Victorinus',
  'gregory-thaumaturgus': 'Gregory Thaumaturgus', 'matthew-henry': 'Matthew Henry' };
const rosterName = id => (ROSTER.people[id] && ROSTER.people[id].name) || CNAME[id] || id;

/* The continuous commentators, first two with material on the chapter win. */
const BOOK_PRIORITY = {
  Gen: ['basil', 'augustine'], Job: ['gregory-great'], Ps: ['augustine', 'hilary'], Eccl: ['gregory-thaumaturgus'], Dan: ['hippolytus'],
  Matt: ['chrysostom', 'augustine'], Mark: ['augustine'], Luke: ['augustine'],
  John: ['augustine', 'cyril-alexandria', 'chrysostom'], '1John': ['augustine'], Rev: ['victorinus'], default: ['chrysostom', 'augustine']
};
const CAP = { total: 3000, commentary: 900, catena: 600, catenaFill: 1500, excerpt: 80, citeMin: 40, citeMax: 250, citeCount: 5, citeFloor: 3, para: 260, henryUnder: 250, henryIntro: 250, henrySection: 600 };

/* ------------------------------------------------------------ text tools */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function unent(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1));
    return ENT[e.toLowerCase()] != null ? ENT[e.toLowerCase()] : m;
  });
}
const strip = h => unent(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
/* square brackets the editors added: references, page numbers, "so Vulg.", "ed. note" */
function dropBrackets(t) {
  t = t.replace(/\s*\[ed\.? ?note[^\]]*\]/gi, '');
  for (let i = 0; i < 2; i++) t = t.replace(/\s*\[([^\[\]]{0,400})\]/g, (m, x) => /\d|ed\. ?note|\bVulg\b|LXX|E\. ?V\.|\bsic\b|^\s*[ivxlc]+\.?\s*$|—\s?[A-Z]\.?\s*$/i.test(x) ? '' : m);
  return t.replace(/\s*\((?:ver|vers|verse|verses)\.?\s*\d+[^)]{0,20}\)/gi, '')
    .replace(/\s*\(\s*(?:cf\.\s*|see\s*|comp\.\s*)?(?:[123] )?[A-Z][a-z]+\.?\s+[ivxlc]+\.\s*\d+[^()]{0,30}\)/g, '').replace(/\s+([,.;:])/g, '$1').replace(/\s+/g, ' ').trim();
}
const words = s => (String(s).match(/\S+/g) || []).length;
/* cut to about n words at a sentence end, marking the cut */
function cut(t, n) {
  const w = t.split(/\s+/);
  if (w.length <= n) return t;
  const head = w.slice(0, n).join(' ');
  const m = head.match(/^[\s\S]*[.?!;][”’"')]?(?=\s|$)/);
  const s = m && words(m[0]) >= n * 0.5 ? m[0] : head;
  return s.replace(/[,;:]$/, '') + ' …';
}
const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
function roman(s) {
  s = String(s).toLowerCase(); let t = 0;
  for (let i = 0; i < s.length; i++) { const a = ROMAN[s[i]], b = ROMAN[s[i + 1]]; if (!a) return NaN; t += b > a ? -a : a; }
  return t;
}
const num = s => /^\d+$/.test(s) ? +s : roman(s);

/* word matching against the WEB */
const STOP = new Set(('a an and are as at be been but by for from he her him his i in into is it its me my not of on or our shall '
  + 'should so that the thee their them then there they thou thy thine this to unto up upon us was we were which who whom will with '
  + 'ye you your hath doth art hast shalt wilt o oh also even all no nor what when where why how let lo behold have has had do did '
  + 'say said saith says one if than these those any may might can could would every out over').split(' '));
const stem = w => w.length > 4 ? w.replace(/(eth|est|ing|ed|es|s)$/, '') : w;
const toks = s => (String(s).toLowerCase().replace(/[’']/g, '').match(/[a-z]+/g) || []).filter(w => !STOP.has(w)).map(stem);
const VT = {};
function vset(b, c, v) {
  const k = b + c + ':' + v;
  if (!VT[k]) VT[k] = new Set(toks(web()[b][c][v - 1]));
  return VT[k];
}
/* the verse in [lo, hi] whose words a quotation shares best (share >= 0.6, two words at least) */
function bestVerse(q, b, lo, hi) {
  const Q = [...new Set(toks(q))];
  if (Q.length < 2) return null;
  let best = null;
  for (let c = lo[0]; c <= hi[0] && c <= nCh(b); c++) {
    const v0 = c === lo[0] ? Math.max(1, lo[1]) : 1, v1 = c === hi[0] && hi[1] ? Math.min(hi[1], nV(b, c)) : nV(b, c);
    for (let v = v0; v <= v1; v++) {
      const V = vset(b, c, v);
      let k = 0;
      for (const t of Q) if (V.has(t)) k++;
      const sc = k / Q.length;
      if (k >= 2 && (!best || sc > best.sc)) best = { c, v, sc };
    }
  }
  return best && best.sc >= 0.6 ? best : null;
}
const firstQuote = t => { const m = t.match(/^(?:\d{1,3}\.\s*)?(?:[A-Z][a-z]+[,;:]?\s){0,3}[“"‘]([^”"’]{6,500})[”"’]/); return m ? m[1] : null; };

/* references: parsed="|Matt|5|3|0|0;|Luke|6|20|0|0" */
function parsed(p) {
  const out = [];
  String(p).split(';').forEach(part => {
    const x = part.replace(/^\|/, '').split('|');
    const b = x[0], c = +x[1], v = +x[2] || 0;
    if (!NAME[b] || !web()[b] || !(c >= 1 && c <= nCh(b))) return;
    if (v > nV(b, c)) return; // the Septuagint's additions and the like
    let c2 = +x[3] || c, v2 = +x[4] || 0;
    if (c2 < c || c2 > nCh(b)) c2 = c;
    if (!v2) v2 = c2 === c ? v : nV(b, c2);
    if (v2 > nV(b, c2)) v2 = nV(b, c2);
    out.push({ b, c, v, c2, v2 });
  });
  return out;
}
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1];
function label(b, c1, v1, c2, v2) {
  return c1 === c2 && v1 === v2 ? '[' + NAME[b] + ' ' + c1 + ':' + v1 + ']' : '[' + NAME[b] + ' ' + c1 + ':' + v1 + ' to ' + c2 + ':' + v2 + ']';
}
function prevVerse(b, c, v) { return v > 1 ? [c, v - 1] : c > 1 ? [c - 1, nV(b, c - 1)] : [c, v]; }

/* passage titles: "Galatians 1:1--3", "Ephesians 4.31", "Philippians 2:1-4", "1 Thessalonians 5:19-22" */
const TITLE_BOOK = (() => { const m = {}; BOOKS.forEach(([c, n]) => { m[n.toLowerCase()] = c; }); m.psalms = 'Ps'; m.apocalypse = 'Rev'; return m; })();
function passageTitle(t) {
  const m = String(t).trim().match(/^((?:[123] )?[A-Za-z]+(?: of Songs)?)\.? (\d+)[:.](\d+)(?:\s*(?:-|--|–|,)\s*(\d+))?\.?$/);
  if (!m) return null;
  const b = TITLE_BOOK[m[1].toLowerCase()];
  if (!b || !web()[b]) return null;
  const c = +m[2], v = +m[3], v2 = m[4] ? +m[4] : v;
  if (!(c >= 1 && c <= nCh(b) && v >= 1 && v <= nV(b, c))) return null;
  return { b, c, v, c2: c, v2: Math.min(v2, nV(b, c)) };
}

/* ------------------------------------------------------------ fetching */
const CCEL = 'https://ccel.org/ccel/';
function loader(h) {
  return async (url, file, decode) => {
    const f = path.join(h.CACHE, 'src', file);
    if (h.packetsOnly) {
      if (!fs.existsSync(f)) throw new Error('bible: ' + file + ' is not cached; run without --packets first');
      return fs.readFileSync(f, 'utf8');
    }
    if (!fs.existsSync(f) && /^https:\/\/(www\.)?ccel\.org\//.test(url)) await sleep(10000); // robots.txt: Crawl-delay 10
    return h.get(url, file, decode);
  };
}
const cp1252 = buf => new TextDecoder('windows-1252').decode(buf);

/* ------------------------------------------------------------ the CCEL volumes */
/* fathers: div id -> roster id ('' = the whole volume; the deepest match wins).
   skip: div ids whose subtree is not the Father's. work: the div level that
   names the work in a citation (per div1 id, or the volume's default). */
const VOLS = {
  anf01: { ed: 'ANF', no: 1, fathers: { ix: 'irenaeus' }, work: { '': 2 } },
  anf05: { ed: 'ANF', no: 5, fathers: { iii: 'hippolytus', iv: 'cyprian' }, skip: ['iii.v', 'iv.iii', 'iv.vi', 'iv.vii'], work: { iii: 4, iv: 3 } },
  anf06: { ed: 'ANF', no: 6, fathers: { iii: 'gregory-thaumaturgus' }, skip: ['iii.iv'], work: { '': 3 } },
  anf07: { open: true, ed: 'ANF', no: 7, fathers: { vi: 'victorinus' }, work: { '': 2 } },
  npnf101: { ed: 'NPNF1', no: 1, fathers: { '': 'augustine' }, work: { '': 1 } },
  npnf102: { ed: 'NPNF1', no: 2, fathers: { '': 'augustine' }, work: { '': 1 } },
  npnf103: { ed: 'NPNF1', no: 3, fathers: { '': 'augustine' }, work: { '': 2 } },
  npnf104: { ed: 'NPNF1', no: 4, fathers: { '': 'augustine' }, work: { '': 2 } },
  npnf105: { ed: 'NPNF1', no: 5, fathers: { '': 'augustine' }, work: { '': 1 } },
  npnf106: { ed: 'NPNF1', no: 6, fathers: { '': 'augustine' }, work: { '': 1 } },
  npnf107: { open: true, ed: 'NPNF1', no: 7, fathers: { '': 'augustine' }, work: { '': 1 } },
  npnf108: { ed: 'NPNF1', no: 8, fathers: { '': 'augustine' }, work: { '': 1 } },
  npnf109: { ed: 'NPNF1', no: 9, fathers: { '': 'chrysostom' }, work: { '': 1 } },
  npnf110: { open: true, ed: 'NPNF1', no: 10, fathers: { '': 'chrysostom' }, work: { '': 1 } },
  npnf111: { open: true, ed: 'NPNF1', no: 11, fathers: { '': 'chrysostom' }, work: { '': 1 } },
  npnf112: { open: true, ed: 'NPNF1', no: 12, fathers: { '': 'chrysostom' }, work: { '': 1 } },
  npnf113: { open: true, ed: 'NPNF1', no: 13, fathers: { '': 'chrysostom' }, work: { '': 2 } },
  npnf114: { open: true, ed: 'NPNF1', no: 14, fathers: { '': 'chrysostom' }, work: { '': 1 } },
  npnf204: { ed: 'NPNF2', no: 4, fathers: { '': 'athanasius' }, skip: ['viii', 'ix'], work: { '': 1 } },
  npnf205: { ed: 'NPNF2', no: 5, fathers: { '': 'gregory-nyssa' }, work: { '': 2 } },
  npnf206: { ed: 'NPNF2', no: 6, fathers: { '': 'jerome' }, work: { '': 2 } },
  npnf207: { ed: 'NPNF2', no: 7, fathers: { iii: 'gregory-nazianzus', iv: 'gregory-nazianzus' }, work: { '': 2 } },
  npnf208: { ed: 'NPNF2', no: 8, fathers: { '': 'basil' }, work: { '': 1 } },
  npnf209: { ed: 'NPNF2', no: 9, fathers: { ii: 'hilary' }, work: { '': 2 } },
  npnf210: { ed: 'NPNF2', no: 10, fathers: { '': 'ambrose' }, work: { '': 2 } },
  npnf212: { ed: 'NPNF2', no: 12, fathers: { ii: 'leo-great', iii: 'gregory-great' }, work: { '': 2 } },
  npnf213: { ed: 'NPNF2', no: 13, fathers: { ii: 'gregory-great', 'iii.iv': 'ephrem', 'iii.v': 'ephrem', 'iii.vi': 'ephrem', 'iii.vii': 'ephrem', 'iii.viii': 'ephrem' }, work: { '': 2 } }
};
const SERIES = { ANF: 'Ante-Nicene Fathers', NPNF1: 'Nicene and Post-Nicene Fathers, Series 1', NPNF2: 'Nicene and Post-Nicene Fathers, Series 2' };
const CCEL_LICENCE = 'public domain text (printed 1885 to 1900); the CCEL edition is for personal, educational or non-profit use';
/* divisions that are the editors', not the Father's */
const EDITORIAL = /^(Title Pages?|Series Title|Second Title|Table of Contents|Contents|Indexes?\b|Index of|Subject Ind|Credits|Dedication|Advertisement|Genealogical|Chronological|Comparative Table|Prolegomena|Editor|Translator|Editorial|Prefatory Note|General Introduction|General Literature|Bibliograph|Elucidation|Introductory|Introduction|Note\b|Notes\b|Additional Note|Excursus|Chief Events|Works on Analytical|Dates of Treatises|St\. Chrysostom as a Homilist|Preface to the American|Preface to Volume|Preface to the Oxford|The Opinion of St\. Augustin|Life of S\.|Life of St\.|A Sketch|Regula Pastoralis \(Notes\)|Registrum Epistolarum \(Notes\)|Synopsis|Analysis|Argument of)/i;
/* a letter written TO the Father, or by another, inside his collection */
const NOT_HIS = /^(From (?!the\b)[A-Z]|Letter from|Reply of|Rescript|Epistle of [A-Z][a-z]+ to|Letter of [A-Z][a-z]+ to)|\bto (Leo|Augustin|Augustine|Basil|Jerome|Gregory|Athanasius|Ambrose|Chrysostom)\b/i;

/* the continuous commentaries' names in a citation: work title -> short name */
const COMM_WORKS = [
  [/Expositions? on the Book of Psalms/i, 'Expositions on the Psalms'], [/^The Homilies of St\. John Chrysostom\.?$/i, 'Homilies on Matthew'],
  [/Tractates on the Gospel/i, 'Tractates on John'], [/Homilies on the First Epistle of John/i, 'Homilies on 1 John'],
  [/on the Gospel of St\. John/i, 'Homilies on John'], [/Epistle to the Hebrews/i, 'Homilies on Hebrews'],
  [/Acts of the Apostles/i, 'Homilies on Acts'], [/Epistle to the Romans/i, 'Homilies on Romans'],
  [/First Corinthians/i, 'Homilies on 1 Corinthians'], [/Second Corinthians/i, 'Homilies on 2 Corinthians'],
  [/Commentary on Galatians/i, 'Commentary on Galatians'], [/^Homilies on (Ephesians|Philippians|Colossians|Titus|Philemon)/i, null],
  [/Homilies on First Thessalonians/i, 'Homilies on 1 Thessalonians'], [/Homilies on 2 Thessalonians/i, 'Homilies on 2 Thessalonians'],
  [/Homilies on 1 Timothy/i, 'Homilies on 1 Timothy'], [/Homilies on 2 Timothy/i, 'Homilies on 2 Timothy'],
  [/Sermon on the Mount/i, 'On the Sermon on the Mount'], [/Harmony of the Gospels/i, 'Harmony of the Gospels'],
  [/Sermons on Selected Lessons/i, 'Sermons on New Testament Lessons'], [/Hex.meron/i, 'Hexaemeron'],
  [/Homilies on Psalms/i, 'Homilies on the Psalms'], [/Metaphrase of the Book of Ecclesiastes/i, 'Metaphrase of Ecclesiastes'],
  [/Commentary on the Apocalypse/i, 'Commentary on the Apocalypse']
];
function tidyTitle(t) {
  return String(t || '').replace(/\s+/g, ' ').replace(/^\s*(The|A)\s+/, '').replace(/^(Ephraim Syrus|Aphrahat):\s*/, '')
    .replace(/([^(])\s*\([^()]*\)\.?\s*$/, '$1').replace(/ of (St\.?|S\.) (John Chrysostom|Augustin|Jerome|Gregory the Great|Basil|Ambrose|Leo)\b/, '')
    .replace(/^St\.? Augustin:? /, '').replace(/[.:,;]\s*$/, '').trim();
}
function divLabel(d) {
  const st = (d.short || '').trim();
  if (st && st.length <= 40 && !/^(Title|Preface|Introduct)/i.test(st) && st !== d.title) return tidyTitle(st);
  if (d.type && d.n && !/^[ivxlc]+$/.test(d.n)) return d.type + ' ' + d.n;
  if (d.type && d.n) return d.type + ' ' + d.n;
  if (d.ord && /^(Homily|Chapter|Sermon|Tractate|Lecture|Discourse)$/i.test(d.type)) return d.type + ' ' + d.ord;
  const t = tidyTitle(d.title);
  return t && t.length <= 50 ? t : '';
}
/* the number of the unit a commentary paragraph belongs to: Homily XV -> 15 */
function unitNumber(d) {
  for (const s of [d.short, d.title]) {
    const m = String(s || '').match(/^(?:Homily|Tractate|Sermon|Psalm|Chapter|Book|Lecture|Discourse|Oration|Letter|Epistle)\s+([IVXLCDM]+|\d+)\b/i);
    if (m) return num(m[1]);
  }
  if (d.type && d.n && /^([IVXLCDM]+|\d+)$/.test(d.n)) return num(d.n);
  if (d.ord && /^(Homily|Chapter|Sermon|Tractate|Lecture|Discourse)$/i.test(d.type)) return d.ord;
  return null;
}

/* One CCEL ThML volume as paragraphs:
   { id, cls, page, path: [div...], text, inl: [refs], nts: [refs], coms: [markers before it] } */
function thml(xml) {
  const i0 = xml.indexOf('<ThML.body');
  let body = i0 < 0 ? xml : xml.slice(i0);
  body = body.replace(/<note\b[\s\S]*?<\/note>/g, n => {
    const refs = [...n.matchAll(/<scripRef\b[^>]*?parsed="([^"]*)"/g)].map(m => m[1]);
    if (!refs.length) return ' ';
    const rest = strip(n.replace(/<scripRef\b[\s\S]*?<\/scripRef>/g, ' '))
      .replace(/\b(LXX|Vulg|A\.\s?V|R\.\s?V|cf|Cf|comp|Comp|See|see|ver|vers|and|so|ff|Heb|Gr|Lat|also|etc|&c)\b\.?/g, '')
      .replace(/[\s.,;:()\[\]\-–—0-9*]/g, '');
    return rest.length <= 12 ? ' \u0001' + refs.join(';') + '\u0002 ' : ' ';
  });
  const year = (xml.slice(0, 30000).match(/<published>[^<]*?(1[6-9]\d\d)/) || [])[1] || '';
  const out = [], stack = [], root = { kids: {} };
  let page = '', coms = [];
  const attr = (a, k) => { const m = a.match(new RegExp('\\b' + k + '="([^"]*)"')); return m ? unent(m[1]) : ''; };
  const re = /<div(\d)\b([^>]*)>|<\/div(\d)>|<pb\b([^>]*?)\/?>|<scripCom\b([^>]*?)\/?>|<p\b([^>]*)>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(body))) {
    if (m[1]) {
      const lvl = +m[1];
      while (stack.length && stack[stack.length - 1].lvl >= lvl) stack.pop();
      const d = { lvl, id: attr(m[2], 'id'), title: attr(m[2], 'title').trim(), short: attr(m[2], 'shorttitle').trim(), type: attr(m[2], 'type'), n: attr(m[2], 'n'), kids: {} };
      const parent = stack.length ? stack[stack.length - 1] : root;
      if (d.type) { parent.kids[d.type] = (parent.kids[d.type] || 0) + 1; d.ord = parent.kids[d.type]; }
      stack.push(d);
    } else if (m[3]) {
      const lvl = +m[3];
      while (stack.length && stack[stack.length - 1].lvl >= lvl) stack.pop();
    } else if (m[4] != null) {
      page = attr(m[4], 'n') || page;
    } else if (m[5] != null) {
      coms.push({ passage: attr(m[5], 'passage'), parsed: attr(m[5], 'parsed'), type: attr(m[5], 'type'), path: stack.slice() });
    } else {
      let html = m[7];
      for (const c of html.matchAll(/<scripCom\b([^>]*?)\/?>/g)) coms.push({ passage: attr(c[1], 'passage'), parsed: attr(c[1], 'parsed'), type: attr(c[1], 'type'), path: stack.slice() });
      const lead = html.match(/^\s*(?:<[^>]+>\s*)*?<pb\b([^>]*?)\/?>/);
      if (lead) page = attr(lead[1], 'n') || page;
      const pgStart = page;
      for (const p of html.matchAll(/<pb\b([^>]*?)\/?>/g)) page = attr(p[1], 'n') || page;
      /* a parenthesis holding only references is the editors': it becomes the references' marks */
      html = html.replace(/\(\s*((?:<scripRef\b[^>]*>[\s\S]*?<\/scripRef>[^()<]{0,14})+)\)/g, (x, inner) => ' ' + [...inner.matchAll(/parsed="([^"]*)"/g)].map(y => '\u0003' + y[1] + '\u0004').join(' ') + ' ');
      html = html.replace(/<scripRef\b[^>]*?parsed="([^"]*)"[^>]*>([\s\S]*?)<\/scripRef>/g, (x, p, inner) => inner + ' \u0003' + p + '\u0004 ');
      html = html.replace(/\u0001([^\u0002]*)\u0002/g, ' \u0003$1\u0005 ');
      const raw = strip(html);
      const marks = [];
      let text = '', last = 0;
      for (const mm of raw.matchAll(/\s*\u0003([^\u0004\u0005]*)([\u0004\u0005])\s*/g)) {
        text += raw.slice(last, mm.index) + ' '; last = mm.index + mm[0].length;
        marks.push({ p: mm[1], note: mm[2] === '\u0005', w: words(text) });
      }
      text = (text + raw.slice(last)).replace(/\s+/g, ' ').trim();
      const inl = marks.filter(x => !x.note).map(x => x.p).join(';');
      const nts = marks.filter(x => x.note).map(x => x.p).join(';');
      if (!text && !coms.length) continue;
      out.push({ id: attr(m[6], 'id'), cls: attr(m[6], 'class'), page: pgStart, path: stack.slice(), text, inl, nts, marks, coms });
      coms = [];
    }
  }
  return { paras: out, year };
}

function fatherOf(vol, pth) {
  const V = VOLS[vol];
  let f = V.fathers[''] || null;
  for (const d of pth) if (V.fathers[d.id]) f = V.fathers[d.id];
  return f;
}
function excluded(vol, pth) {
  const V = VOLS[vol];
  for (let i = 0; i < pth.length; i++) {
    const d = pth[i];
    if ((V.skip || []).includes(d.id)) return true;
    if (i === 0 && pth.length > 1 && /^Title Pages?\.?$/i.test(d.title)) continue; // npnf209 files Hilary under "Title Page"
    if (EDITORIAL.test(d.title) || (d.short && EDITORIAL.test(d.short))) return true;
    if (i === 0 && /^Prefaces?\.?$|^Preface\b/i.test(d.title)) return true;
    if (NOT_HIS.test(d.title)) return true;
    if (vol === 'npnf206' && pth[0].id === 'v' && i === 1 && !/^To\b/i.test(d.title)) return true; // Jerome's letters: his own are "To ..."
  }
  return false;
}
function workLevel(vol, pth) {
  const W = VOLS[vol].work;
  return (pth[0] && W[pth[0].id]) || W[''] || 1;
}

/* the special units: a range from a division's title or a table */
const HEXAEMERON = { 'viii.ii': [1, 1, 1, 1], 'viii.iii': [1, 2, 1, 5], 'viii.iv': [1, 6, 1, 8], 'viii.v': [1, 9, 1, 10], 'viii.vi': [1, 11, 1, 13],
  'viii.vii': [1, 14, 1, 19], 'viii.viii': [1, 20, 1, 21], 'viii.ix': [1, 20, 1, 23], 'viii.x': [1, 24, 1, 26] };
function titleUnit(vol, pth) {
  for (let i = pth.length - 1; i >= 0; i--) {
    const d = pth[i];
    if (vol === 'npnf108') {
      const pm = d.title.match(/^Psalm ([IVXLC]+)\b/);
      if (pm) { const n = roman(pm[1]); return { b: 'Ps', c: n, v: 1, c2: n, v2: nV('Ps', n), key: d.id, unit: n }; }
      const parent = pth[i - 1];
      if (parent && /^Psalm CXIX\b/.test(parent.title)) {
        const k = roman(d.id.split('.').pop());
        if (k >= 1 && k <= 22) return { b: 'Ps', c: 119, v: 8 * k - 7, c2: 119, v2: 8 * k, key: d.id, unit: 119 };
      }
    }
    if (vol === 'npnf208' && HEXAEMERON[d.id]) { const r = HEXAEMERON[d.id]; return { b: 'Gen', c: r[0], v: r[1], c2: r[2], v2: r[3], key: d.id, unit: Object.keys(HEXAEMERON).indexOf(d.id) + 1 }; }
    if (vol === 'npnf209') {
      const hm = d.title.match(/^Homily on Psalm ([IVXLC]+)\.?\s*(?:\(([IVXLC]+)\.?\))?/);
      if (hm) { const n = roman(hm[2] || hm[1]); return { b: 'Ps', c: n, v: 1, c2: n, v2: nV('Ps', n), key: d.id, unit: n }; }
    }
    if (vol === 'anf06' && pth.some(x => /Metaphrase of the Book of Ecclesiastes/.test(x.title))) {
      const cm = d.title.match(/^Chapter ([IVXL]+)\./);
      if (cm) { const n = roman(cm[1]); if (n <= 12) return { b: 'Eccl', c: n, v: 1, c2: n, v2: nV('Eccl', n), key: d.id, unit: n }; }
    }
    if (/^npnf11[0-4]$|^npnf106$/.test(vol)) {
      const p = passageTitle(d.title);
      if (p) return Object.assign(p, { key: d.id, open: true });
    }
  }
  return null;
}
/* Hippolytus' exegetical fragments and his Christ and Antichrist: a unit over the whole book */
const HIPPO_BOOKS = [[/^On Genesis/, 'Gen'], [/^On Numbers/, 'Num'], [/^On the Psalms/, 'Ps'], [/^On Proverbs/, 'Prov'], [/^On the Song of Songs/, 'Song'],
  [/^On Isaiah/, 'Isa'], [/^On Daniel/, 'Dan'], [/^On Matthew/, 'Matt'], [/^On Luke/, 'Luke']];
function hippoUnit(pth) {
  for (const d of pth) for (const [re, b] of HIPPO_BOOKS) if (re.test(d.title)) return { b, c: 1, v: 1, c2: nCh(b), v2: nV(b, nCh(b)), key: d.id, whole: true };
  return null;
}

/* ------------------------------------------------------------ the store */
/* COMM[b][c][father] = [{ lab:[c1,v1,c2,v2], cite, text, url, edition, key, lemma }]
   CITE[b][c] = [{ father, work, verses:Set, lab, cite, text, url, edition, w }] (40 to 250 words)
   CITED[b][c] = count of paragraphs quoting the chapter (any length); HITS[b][c][v] = count by verse */
const COMM = {}, CITE = {}, CITED = {}, HITS = {}, WORKS_OF = {};
const at3 = (o, a, b, c, mk) => { o[a] = o[a] || {}; o[a][b] = o[a][b] || {}; if (c === undefined) return o[a][b]; o[a][b][c] = o[a][b][c] || mk(); return o[a][b][c]; };
function addComm(b, c, f, rec) { at3(COMM, b, c, f, () => []).push(rec); (WORKS_OF[f] = WORKS_OF[f] || new Set()).add(b); }

function ccelUrl(author, vol, divId, pid) { return CCEL + author + '/' + vol + '/' + vol + '.' + divId + '.html' + (pid ? '#' + pid : ''); }

/* Cut one volume: commentary units (cursor), and citation candidates. */
function ingestVolume(vol, xml, report) {
  const V = VOLS[vol];
  const { paras, year } = thml(xml);
  const edition = SERIES[V.ed] + ' vol. ' + V.no + (year ? ' (' + year + ')' : '') + ', ccel.org ' + vol;
  const edShort = V.ed + ' ' + V.no;
  /* markers, in order, with their ranges opened to the next marker of the same book */
  const markers = [];
  paras.forEach((p, i) => p.coms.forEach(cm => {
    let r = cm.parsed ? parsed(cm.parsed)[0] : null;
    if (!r && cm.passage) r = passageTitle(cm.passage.replace(/^Gal\b\.?/, 'Galatians').replace(/^Eph\b\.?/, 'Ephesians'));
    if (!r) return;
    const whole = !r.v; // a whole chapter ("Matthew 5", Augustine on the Sermon on the Mount)
    if (whole) r = { b: r.b, c: r.c, v: 1, c2: r.c2, v2: nV(r.b, r.c2) };
    markers.push({ i, r, path: cm.path, type: cm.type, whole });
  }));
  markers.forEach((mk, k) => {
    const nx = markers[k + 1];
    mk.end = [mk.r.c2, mk.r.v2];
    /* a homily series runs on to the next homily's first verse; a collection of sermons does not */
    if (V.open && !mk.whole && nx && nx.r.b === mk.r.b && cmp([nx.r.c, nx.r.v], [mk.r.c, mk.r.v]) > 0 && nx.r.c - mk.r.c <= 1) {
      const pv = prevVerse(mk.r.b, nx.r.c, nx.r.v);
      if (cmp(pv, mk.end) > 0) mk.end = pv;
    }
    mk.divId = (mk.path[mk.path.length - 1] || {}).id || '';
  });
  let mi = 0, cur = null, cursor = null, curKey = null, sec = null, secDiv = null;
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    while (mi < markers.length && markers[mi].i <= i) {
      const mk = markers[mi++];
      cur = { b: mk.r.b, lo: [mk.r.c, mk.r.v], hi: mk.end, key: 'm' + mi, divDepth: mk.path.length, divId: mk.divId, unit: null };
      cursor = null;
    }
    const f = fatherOf(vol, p.path);
    if (!f || excluded(vol, p.path)) continue;
    const deep = p.path[p.path.length - 1] || {};
    if (deep.id !== secDiv) { sec = null; secDiv = deep.id; }
    const sm = p.text.match(/^(\d{1,3})\.\s/);
    if (sm) sec = +sm[1];
    /* the unit: a title or table beats a marker; a marker ends with its division */
    let unit = titleUnit(vol, p.path);
    if (unit) unit = { b: unit.b, lo: [unit.c, unit.v], hi: unit.open ? null : [unit.c2, unit.v2], key: unit.key, unit: unit.unit, open: unit.open, v2: [unit.c2, unit.v2] };
    else if (vol === 'anf05') { const hu = hippoUnit(p.path); if (hu) unit = { b: hu.b, lo: [1, 1], hi: [hu.c2, hu.v2], key: hu.key, whole: true }; }
    if (!unit && cur) {
      if (p.path.length < cur.divDepth || !p.path.some(d => d.id === cur.divId)) cur = null;
      else unit = cur;
    }
    if (unit && unit.open) { /* a passage title: open to the next title's start in the same work */
      if (!OPEN_END.has(vol + unit.key)) OPEN_END.set(vol + unit.key, openEnd(vol, paras, i, unit));
      unit.hi = OPEN_END.get(vol + unit.key);
    }
    if (isHeading(p.text, deep)) continue;
    const refs = parsed(p.inl), nrefs = parsed(p.nts);
    const allRefs = refs.concat(nrefs);
    const wcount = words(p.text);
    const work = workDiv(vol, p.path);
    if (unit) {
      if (curKey !== unit.key) { cursor = null; curKey = unit.key; }
      const inR = r => r.b === unit.b && cmp([r.c, r.v || 1], unit.lo) >= 0 && cmp([r.c, r.v || 1], unit.hi) <= 0 && r.v;
      const q = firstQuote(p.text);
      const quoteOnly = q && words(p.text.replace(/^(?:\d{1,3}\.\s*)?/, '').replace(/[“"‘][^”"’]*[”"’]/, '')) < 4;
      const lemmaLike = quoteOnly || (q && wcount <= 70) || /^(\d{1,3}\.\s*)?(Ver(se)?s?\.?\s*\d)/i.test(p.text);
      const inl = refs.filter(inR), ntr = nrefs.filter(inR);
      let hit = null;
      if (inl.length && !unit.whole) hit = inl;
      else if (lemmaLike && ntr.length) hit = ntr;
      else if (unit.whole && allRefs.filter(inR).length) hit = allRefs.filter(inR);
      let own = allRefs.some(inR);
      if (hit) {
        const a = hit.reduce((x, r) => cmp([r.c, r.v], x) < 0 ? [r.c, r.v] : x, [hit[0].c, hit[0].v]);
        const z = hit.reduce((x, r) => cmp([r.c2, r.v2], x) > 0 ? [r.c2, r.v2] : x, [hit[0].c2, hit[0].v2]);
        if (unit.whole || !cursor || cmp(a, cursor.slice(0, 2)) >= 0) cursor = [a[0], a[1], z[0], z[1]];
      } else if (q && (lemmaLike || /^(\d{1,3}\.\s*)?[“"‘]/.test(p.text))) {
        const bv = bestVerse(q, unit.b, cursor ? [cursor[0], cursor[1]] : unit.lo, unit.hi);
        if (bv && (!cursor || cmp([bv.c, bv.v], cursor.slice(0, 2)) >= 0)) { cursor = [bv.c, bv.v, bv.c, bv.v]; own = true; }
      }
      if (unit.whole && !hit) { /* a fragment with no reference of its own: only if it follows one */ if (!cursor) continue; }
      const lab = cursor || [unit.lo[0], unit.lo[1], unit.hi[0], unit.hi[1]];
      const text = dropBrackets(p.text.replace(/^\d{1,3}\.\s*/, ''));
      if (!text) continue;
      const cn = commName(work, p.path, f);
      const un = unit.unit != null ? unit.unit : unitOfPath(p.path, workLevel(vol, p.path));
      const cite = CNAME[f] + ', ' + (cn ? cn + (un != null ? ' ' + un + (sec ? '.' + sec : '') : (sec ? ' §' + sec : '')) : genericCite(work, p.path, vol, sec))
        + ', ' + edShort + ':' + (p.page || '?');
      const rec = { lab, cite, text, url: ccelUrl('schaff', vol, deep.id, p.id), edition, key: vol + ':' + (work ? work.id : '') + ':' + unit.key, lemma: !!quoteOnly, own, w: words(text) };
      addComm(unit.b, lab[0], f, rec);
      if (lab[2] !== lab[0]) for (let c = lab[0] + 1; c <= lab[2]; c++) addComm(unit.b, c, f, Object.assign({}, rec, { lab: [c, 1, c, lab[3] && c === lab[2] ? lab[3] : nV(unit.b, c)] }));
      report.comm[f] = (report.comm[f] || 0) + 1;
    }
    /* citations: every chapter this paragraph quotes, outside its own commentary's book */
    if (!allRefs.length) continue;
    const byCh = {};
    allRefs.forEach(r => {
      if (!r.v) return;
      if (unit && r.b === unit.b) return;
      const k = r.b + ' ' + r.c;
      (byCh[k] = byCh[k] || { b: r.b, c: r.c, vs: new Set() });
      byCh[k].vs.add(r.v);
      for (let v = r.v + 1; v <= (r.c2 === r.c ? r.v2 : nV(r.b, r.c)); v++) byCh[k].vs.add(v);
    });
    const keys = Object.keys(byCh);
    if (!keys.length) continue;
    const text = dropBrackets(p.text.replace(/^\d{1,3}\.\s*/, ''));
    const w = words(text);
    const cite = CNAME[f] + ', ' + genericCite(work, p.path, vol, sec) + ', ' + edShort + ':' + (p.page || '?');
    keys.forEach(k => {
      const { b, c, vs } = byCh[k];
      const mk = (p.marks || []).find(x => parsed(x.p).some(r => r.b === b && r.c === c && r.v));
      const first = mk ? parsed(mk.p).find(r => r.b === b && r.c === c && r.v) : null;
      CITED[b] = CITED[b] || {}; CITED[b][c] = (CITED[b][c] || 0) + 1;
      vs.forEach(v => { const hh = at3(HITS, b, c); hh[v] = (hh[v] || 0) + 1; });
      if (w < CAP.citeMin) return;
      const sv = [...vs].sort((x, y) => x - y);
      /* the run of neighbouring verses that holds the first one referred to */
      const runs = []; sv.forEach(v => { const r = runs[runs.length - 1]; if (r && v - r[1] <= 1) r[1] = v; else runs.push([v, v]); });
      const run = (first && runs.find(r => first.v >= r[0] && first.v <= r[1])) || runs[0];
      at3(CITE, b, c, undefined);
      /* a longer paragraph is cut, at print time, to the sentences round the quotation */
      (CITE[b][c].list = CITE[b][c].list || []).push({ father: f, work: vol + ':' + (work ? work.id : deep.id), verses: sv.length, vs: sv,
        lab: [c, run[0], c, run[1]], cite, text, url: ccelUrl('schaff', vol, deep.id, p.id), edition, w: Math.min(w, CAP.citeMax), long: w > CAP.citeMax, at: mk ? mk.w : null });
    });
  }
}
/* the sentences of a long paragraph round the one that shares most words with the verses it quotes */
function windowAround(text, b, c, vs, max, at) {
  const sents = text.match(/[^.?!]+(?:[.?!]+[”’"')\]]*\s*|$)/g) || [text];
  let bi = 0;
  if (at != null) {
    let n = 0;
    for (let i = 0; i < sents.length; i++) { n += words(sents[i]); bi = i; if (n >= Math.max(1, at)) break; }
  } else {
    const V = new Set();
    vs.forEach(v => vset(b, c, v).forEach(t => V.add(t)));
    let best = -1;
    sents.forEach((x, i) => { let k = 0; new Set(toks(x)).forEach(t => { if (V.has(t)) k++; }); if (k > best) { best = k; bi = i; } });
  }
  let lo = bi, hi = bi, n = words(sents[bi]);
  for (let turn = 0; turn < 200; turn++) {
    const l = lo > 0 ? words(sents[lo - 1]) : Infinity, r = hi < sents.length - 1 ? words(sents[hi + 1]) : Infinity;
    const takeLeft = (bi - lo) <= (hi - bi) ? l : Infinity;
    if (takeLeft !== Infinity && n + takeLeft <= max) { lo--; n += takeLeft; continue; }
    if (r !== Infinity && n + r <= max) { hi++; n += r; continue; }
    if (l !== Infinity && n + l <= max) { lo--; n += l; continue; }
    break;
  }
  let out = sents.slice(lo, hi + 1).join('').trim();
  if (words(out) > max + 40) out = cut(out, max).replace(/ …$/, '');
  return (lo > 0 ? '… ' : '') + out + (hi < sents.length - 1 || /[^.?!”’"')\]]$/.test(out) ? ' …' : '');
}
/* the editors' headings and summaries: a paragraph that repeats its division's title, or reads as one */
function isHeading(t, d) {
  const ti = String(d.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const tt = t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (ti && (tt === ti || (ti.length > 12 && tt.startsWith(ti.slice(0, 30))))) return true;
  if (words(t) > 45) return false;
  if (/^(On the words of|On the Words|Homily|Tractate|Sermon|Lecture|Chapter|Psalm|Book|Letter|Epistle|Oration|Discourse|Argument)\b[^.]*\.?\s*$/i.test(t)) return true;
  if (/^(On the words of|On the Words of)/i.test(t)) return true;
  return /^(Chapter|Homily|Sermon|Tractate|Book|Letter|Epistle)\s+[IVXLC\d]+\.?\s*[—–-]/.test(t);
}
const OPEN_END = new Map();
function openEnd(vol, paras, i, unit) {
  /* the next passage title after this unit's division, in the same book */
  for (let j = i + 1; j < paras.length; j++) {
    const d = paras[j].path[paras[j].path.length - 1];
    if (!d || d.id === unit.key) continue;
    const t = titleUnit(vol, paras[j].path);
    if (t && t.key !== unit.key) {
      if (t.b === unit.b && cmp([t.c, t.v], unit.lo) > 0 && t.c - unit.lo[0] <= 1) { const pv = prevVerse(unit.b, t.c, t.v); return cmp(pv, unit.v2) > 0 ? pv : unit.v2; }
      break;
    }
  }
  return unit.v2;
}
function workDiv(vol, pth) { const L = workLevel(vol, pth); return pth.find(d => d.lvl === L) || pth[pth.length - 1] || null; }
function commName(work, pth, f) {
  for (const d of pth) for (const [re, nm] of COMM_WORKS) if (re.test(d.title)) return nm || tidyTitle(d.title);
  return null;
}
function unitOfPath(pth, L) {
  for (let i = pth.length - 1; i >= 0 && pth[i].lvl > L; i--) { const n = unitNumber(pth[i]); if (n != null && !isNaN(n)) return n; }
  return null;
}
function genericCite(work, pth, vol, sec) {
  const L = workLevel(vol, pth);
  const cn = commName(work, pth);
  let wt = cn || (work ? (tidyTitle(work.title) || tidyTitle(work.short)) : '');
  if (!cn && work && /^(To|Letter|Epistle)\b/i.test(work.title) && /^[IVXLCDM]+$/.test(work.n || '')) wt = 'Letter ' + work.n + ', ' + wt.replace(/^(Letter|Epistle)\s+[IVXLCDM]+\.?:?\s*/i, '');
  const locs = pth.filter(d => d.lvl > L).map(divLabel).filter(x => x && x !== wt);
  let s = wt.length > 70 ? cutTitle(wt) : wt;
  if (locs.length) s += (s ? ', ' : '') + locs.join(', ');
  if (sec) s += ' §' + sec;
  return s || vol;
}
const cutTitle = t => { const a = t.split(/[.;:](?![^(]*\))/)[0]; return a.length <= 70 ? a : a.slice(0, 70).replace(/\s+\S*$/, '') + '…'; };

/* ------------------------------------------------------------ the Catena */
/* a speaker's tag -> roster id (null: not on the roster; the tag is counted) */
const CATENA_NAMES = /^(pseudo-?\s?\w+|psuedo-?\s?\w+|chrysol(?:ogus)?|chrys(?:ostom)?|chyrs|aug(?:ustine)?|jerome|hier|greg(?:ory)?(?:\.?\s?(?:nyss|naz)\w*)?|nyss\w*|naz\w*|hil(?:ary)?|ambrosiaster|ambros[e]?|ambrose|bede|beda|leo|cyprian|cyril(?: of alexandria)?|basil|athan(?:asius)?|origen|origin|orig|theophyl(?:act)?|theophlyact|remig(?:ius)?|raban(?:us)?|alcuin|haymo|gloss(?:\.?\s?(?:ord|interlin|ap\.? anselm|non occ)\w*)?|isidore(?: peleus\w*)?|damascen(?:us|e)|damas|severian(?:us)?|cassian|euseb(?:ius)?|titus(?: bost\w*)?|maxim(?:us)?|max|epiphan(?:ius)?|didymus|dionysius|dion|theodotus|anselm|greek ex(?:positor)?|anon\w*|victor(?: antioch\w*)?|apollinaris|photius|theodor(?:us|e)|severus|ammonius|gennadius|chromatius|eusebius|josephus|nemesius|alex(?:ander)?)$/i;
function catenaFather(tag) {
  const t = tag.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
  if (/^ps(e|u)u?do/.test(t)) return null;
  if (/^chrysol/.test(t)) return null;
  if (/^(chrys|chyrs)/.test(t)) return 'chrysostom';
  if (/^aug/.test(t)) return 'augustine';
  if (/^(jerome|hier)/.test(t)) return 'jerome';
  if (/^(greg ?nyss|nyss)/.test(t)) return 'gregory-nyssa';
  if (/^(greg ?naz|naz)/.test(t)) return 'gregory-nazianzus';
  if (/^greg/.test(t)) return 'gregory-great';
  if (/^hil/.test(t)) return 'hilary';
  if (/^ambrosiaster/.test(t)) return null;
  if (/^ambros/.test(t)) return 'ambrose';
  if (/^(bede|beda)/.test(t)) return 'bede';
  if (/^leo/.test(t)) return 'leo-great';
  if (/^cyprian/.test(t)) return 'cyprian';
  if (/^cyril/.test(t)) return 'cyril-alexandria';
  if (/^basil/.test(t)) return 'basil';
  if (/^athan/.test(t)) return 'athanasius';
  return null;
}
function catenaTagGroup(tag) {
  const t = tag.replace(/\./g, '').trim().toLowerCase();
  if (/^ps(e|u)u?do/.test(t)) return 'Pseudo-';
  if (/^gloss/.test(t)) return 'the Gloss';
  if (/^theophl?y/.test(t)) return 'Theophylact';
  if (/^orig/.test(t)) return 'Origen';
  if (/^remig/.test(t)) return 'Remigius';
  if (/^raban/.test(t)) return 'Rabanus';
  if (/^greek ex/.test(t)) return 'Greek Ex.';
  return t.replace(/\b\w/g, x => x.toUpperCase());
}
/* CATENA[b][c] = [{ lo, hi, father|null, tag, ref, text, page, url }] */
const CATENA = {};
const CATENA_VOL = { Matt: 1, Mark: 2, Luke: 3, John: 4 };
const CATENA_ED = {
  Matt: { ed: 'Catena Aurea, Commentary on the Four Gospels collected out of the Works of the Fathers by S. Thomas Aquinas, vol. 1, St. Matthew (Oxford: J. H. Parker, 1841), ccel.org catena1', licence: CCEL_LICENCE },
  Mark: { ed: 'Catena Aurea … by S. Thomas Aquinas, vol. 2, St. Mark (Oxford: J. H. Parker, 1842), ccel.org catena2', licence: CCEL_LICENCE },
  Luke: { ed: 'Catena Aurea … by S. Thomas Aquinas, vol. 3, St. Luke (Oxford: J. H. Parker, 1843), isidore.co aquinas/english/CALuke.htm', licence: 'public domain (Oxford translation, 1843)' },
  John: { ed: 'Catena Aurea … by S. Thomas Aquinas, vol. 4, St. John (Oxford: J. H. Parker, 1845), isidore.co aquinas/english/CAJohn.htm', licence: 'public domain (Oxford translation, 1845)' }
};
function catenaCcel(xml, b, work) {
  const { paras } = thml(xml);
  let c = 0, grp = null, inScript = false, speaker = null, last = null;
  for (const p of paras) {
    const d = p.path.find(x => /^Chapter \d+$/.test(x.title));
    if (!d) continue;
    const cc = +d.title.split(' ')[1];
    if (cc !== c) { c = cc; grp = null; speaker = null; last = null; }
    if (p.cls === 'scripture') {
      const m = p.text.match(/^(\d+)[a-z]?\.\s/);
      if (!m) continue;
      const v = +m[1];
      if (!inScript || !grp) grp = { lo: v, hi: v }; else { grp.lo = Math.min(grp.lo, v); grp.hi = Math.max(grp.hi, v); }
      inScript = true;
      continue;
    }
    inScript = false;
    if (!grp || p.cls !== 'normal') continue;
    let t = p.text;
    const sm = t.match(/^([^:]{1,90}?):\s*/);
    let tag = null, ref = '';
    if (sm) {
      const parts = sm[1].split(',');
      const name = parts[0].trim().replace(/\.$/, '');
      if (CATENA_NAMES.test(name)) { tag = parts[0].trim(); ref = parts.slice(1).join(',').trim(); t = t.slice(sm[0].length); }
    }
    t = dropBrackets(t);
    if (!t) continue;
    if (tag) { speaker = tag; last = { b, c, lo: grp.lo, hi: grp.hi, father: catenaFather(tag), tag, ref, text: t, page: p.page, url: CCEL + 'aquinas/' + work + '/' + work + '.' + d.id + '.html#' + p.id }; at3(CATENA, b, c, undefined); (CATENA[b][c].list = CATENA[b][c].list || []).push(last); }
    else if (last && last.lo === grp.lo) last.text += ' ' + t;
    else if (speaker) { last = { b, c, lo: grp.lo, hi: grp.hi, father: catenaFather(speaker), tag: speaker, ref: '', text: t, page: p.page, url: CCEL + 'aquinas/' + work + '/' + work + '.' + d.id + '.html#' + p.id }; at3(CATENA, b, c, undefined); (CATENA[b][c].list = CATENA[b][c].list || []).push(last); }
  }
}
function catenaIsidore(html, b, url) {
  const blocks = html.split(/<p\b[^>]*>/i);
  let c = 0, grp = null, inScript = false, speaker = null;
  for (const raw of blocks) {
    const ch = raw.match(/CHAPTER ([IVXLC]+)\s*</);
    if (ch) { c = roman(ch[1]); grp = null; speaker = null; inScript = false; continue; }
    if (!c) continue;
    if (/color:\s*#ff0000/i.test(raw)) {
      const t = strip(raw);
      const m = t.match(/^(\d+)[a-z]?\.\s/);
      if (m) { const v = +m[1]; if (!inScript || !grp) grp = { lo: v, hi: v }; else { grp.lo = Math.min(grp.lo, v); grp.hi = Math.max(grp.hi, v); } inScript = true; }
      continue;
    }
    if (!grp) continue;
    inScript = false;
    const parts = raw.split(/<b>([^<]{1,40})<\/b>\s*[.;:,]?/i);
    for (let k = 0; k < parts.length; k++) {
      if (k % 2 === 1) { speaker = parts[k].trim(); continue; }
      const t = dropBrackets(strip(parts[k])).replace(/^[A-Z]{1,5}\.\s+/, '');
      if (!t || !speaker || words(t) < 3) continue;
      if (!CATENA_NAMES.test(speaker.replace(/\.$/, ''))) { /* not a speaker: a heading inside the text */ }
      at3(CATENA, b, c, undefined);
      (CATENA[b][c].list = CATENA[b][c].list || []).push({ b, c, lo: grp.lo, hi: grp.hi, father: catenaFather(speaker), tag: speaker, ref: '', text: t, page: '', url: url + '#' + c });
    }
  }
}

/* ------------------------------------------------------------ the Moralia */
/* Vulgate chapters each book covers [start chapter, start verse, end chapter]; books 1 to 4 read their verses three times */
const MORALIA = [null, [1, 1, 1], [1, 6, 1], [2, 1, 2], [3, 1, 3], [3, 20, 5], [5, 3, 5], [6, 1, 6], [6, 27, 8], [9, 1, 10], [11, 1, 12],
  [12, 6, 14], [14, 5, 15], [16, 1, 17], [18, 1, 19], [20, 1, 21], [22, 1, 24], [24, 20, 26], [27, 1, 28], [28, 21, 29], [29, 21, 30],
  [31, 1, 31], [31, 24, 31], [32, 1, 33], [33, 22, 34], [34, 19, 34], [34, 31, 36], [36, 22, 37], [38, 1, 38], [38, 12, 38], [38, 34, 39],
  [39, 9, 39], [39, 34, 40], [40, 15, 41], [41, 13, 41], [42, 1, 42]];
const VULG_LEN = { 39: 35, 40: 28, 41: 25 };
function jobEnglish(c, v) {
  if (c === 39 && v >= 31) return [40, v - 30];
  if (c === 40) return v <= 19 ? [40, v + 5] : [41, v - 19];
  if (c === 41) return [41, Math.min(v + 9, 34)];
  return [c, v];
}
const MORALIA_URL = n => 'https://www.lectionarycentral.com/GregoryMoralia/Book' + String(n).padStart(2, '0') + '.html';
const MORALIA_ED = 'Gregory the Great, Morals on the Book of Job, translated with notes and indices (Oxford: J. H. Parker, Library of the Fathers, 1844 to 1850), lectionarycentral.com GregoryMoralia';
function moralia(book, html, report) {
  const [c0, v0, cEnd] = MORALIA[book];
  const multi = book <= 4;
  const text = unent(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<p\b[^>]*>/gi, ' ¶ ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ');
  const bi = text.search(/\bBOOK [IVXL]+\.\s/);
  const body = bi >= 0 ? text.slice(bi) : text;
  let c = c0, v = v0, vmax = v0, ev = null, sec = null;
  const runs = [];
  const push = (t, s) => { t = t.replace(/\s+/g, ' ').trim(); if (!t) return; const e = ev || jobEnglish(c, v); runs.push({ c: e[0], v: e[1], v2: e[2] || e[1], sec: s, text: t }); };
  /* walk: paragraph breaks, "Ver. N." lemmas, "[E.V. ...]" markers; section numbers split the runs */
  const tokRe = /Ver\.\s?(\d+)\.\s|\[E\.\s?V\.\s*([^\]]*)\]|¶/g;
  let pos = 0, buf = '', t;
  const flush = () => { const parts = buf.split(/(?:^|\s)(\d{1,3})\.\s(?=[A-Z‘“'"(])/);
    for (let k = 0; k < parts.length; k++) { if (k % 2 === 1) { sec = +parts[k]; continue; } push(dropBrackets(parts[k].replace(/¶/g, ' ')), sec); } buf = ''; };
  while ((t = tokRe.exec(body))) {
    buf += body.slice(pos, t.index); pos = tokRe.lastIndex;
    if (t[1]) {
      flush();
      const n = +t[1];
      const len = VULG_LEN[c] || nV('Job', c);
      if (!multi && n < v && c < cEnd && ((n <= 8 && vmax >= 0.6 * len) || (vmax >= len - 2 && n <= v - 5))) { c++; vmax = 0; }
      v = n; vmax = Math.max(vmax, n); ev = null;
      /* the lemma runs to the end of its paragraph, or to the next bracket */
      const rest = body.slice(pos);
      const stop = rest.search(/¶|\[/);
      pos += stop < 0 ? rest.length : stop;
      tokRe.lastIndex = pos;
    } else if (t[2] != null) {
      const x = t[2].replace(/\s+/g, ' ');
      const two = x.match(/^(\d+)[,.]\s*(\d+)/), one = x.match(/^(\d+)(?:\.?\s*and\s*(\d+))?/);
      const base = jobEnglish(c, v);
      if (two) ev = [+two[1], +two[2]]; else if (one) ev = [base[0], +one[1], one[2] ? +one[2] : +one[1]];
    } else { buf += ' '; }
  }
  buf += body.slice(pos); flush();
  if (c !== cEnd) report.moralia.push('Book ' + book + ' ended in chapter ' + c + ', not ' + cEnd);
  const url = MORALIA_URL(book);
  runs.forEach(r => {
    if (r.c < 1 || r.c > 42 || r.v > nV('Job', r.c)) return;
    if (words(r.text) < 12) return;
    addComm('Job', r.c, 'gregory-great', { lab: [r.c, r.v, r.c, Math.min(r.v2, nV('Job', r.c))], cite: 'Gregory the Great, Morals on Job, Book ' + book + (r.sec ? ' §' + r.sec : ''),
      text: r.text, url, edition: MORALIA_ED, key: 'moralia:' + book, lemma: false, w: words(r.text) });
  });
}

/* ------------------------------------------------------------ Cyril on John */
const CYRIL_URL = n => 'https://www.tertullian.org/fathers/cyril_on_john_' + String(n).padStart(2, '0') + '_book' + n + '.htm';
const CYRIL_ED = 'Cyril of Alexandria, Commentary on the Gospel according to S. John, Library of the Fathers 43 (P. E. Pusey, 1874) and 48 (T. Randell, 1885), tertullian.org';
function cyril(files, report) {
  let c = 1, v = 0;
  for (let n = 1; n <= 12; n++) {
    const html = files[n];
    const toc = {};
    for (const m of html.matchAll(/<a href="#C(\d+)">([\s\S]*?)<\/a>/gi)) {
      const t = strip(m[2]); const w = t.match(/on the words,?\s*(.*)$/i);
      if (w) { const bv = bestVerse(w[1], 'John', [c, 1], [Math.min(c + 1, 21), nV('John', Math.min(c + 1, 21))]); if (bv) toc[m[1]] = [bv.c, bv.v]; }
    }
    let page = '', cur = null, last = null;
    const blocks = html.split(/<p\b[^>]*>/i).slice(1);
    for (const raw of blocks) {
      const pg = [...raw.matchAll(/\|(\d{1,3})\b/g)];
      const anchor = raw.match(/NAME="C(\d+)"/i);
      if (anchor && toc[anchor[1]]) { [c, v] = toc[anchor[1]]; cur = [c, v]; }
      let t = strip(raw).replace(/\|\d{1,3}\b/g, ' ').replace(/\s+/g, ' ').trim();
      const pageHere = page;
      if (pg.length) page = pg[pg.length - 1][1];
      if (!t) continue;
      const fr = t.match(/^(?:ch\.\s*)?([xvil]{1,6})\.\s*(\d{1,2})\b[,.\s]/i);
      const lem = /<i>/i.test(raw.slice(0, 60)) && t.match(/^(\d{1,2})\s+(\S[\s\S]*)$/);
      if (fr && roman(fr[1]) >= 1 && roman(fr[1]) <= 21 && /^(ch\.\s*)?[xvil]+\.\s*\d/i.test(t) && words(t) < 60) {
        c = roman(fr[1]); v = +fr[2]; cur = [c, v];
        const rest = t.replace(/^(?:ch\.\s*)?[xvil]+\.\s*[\d,\s]+/i, '');
        const bv = rest && bestVerse(rest, 'John', [c, v], [c, nV('John', c)]);
        if (bv) cur = [c, bv.v];
        continue;
      }
      if (lem && words(t) < 90) {
        const nn = +lem[1];
        const sj = lem[2].match(/^S\. John ([xvil]+)\.\s*(\d+)[,\s\d]*/i); // "S. John ix. 2, 3 And His disciples ..."
        let cand = sj ? [[roman(sj[1]), +sj[2]]] : [[c, nn]];
        if (!sj) { if (nn < v || (v === 0 && c === 1 && nn > 28)) cand = [[c + 1, nn], [c, nn]]; else cand.push([c + 1, nn]); }
        const score = (cc, vv) => {
          if (cc < 1 || cc > 21 || vv < 1 || vv > nV('John', cc)) return -1;
          const V = vset('John', cc, vv), Q = [...new Set(toks(lem[2]))];
          return Q.length ? Q.filter(x => V.has(x)).length / Q.length : 0;
        };
        let best = null;
        for (const [cc, vv] of cand) { const sc = score(cc, vv); if (sc >= 0 && (!best || sc > best.sc)) best = { cc, vv, sc }; }
        /* Pusey's numbers now and then differ from the English Bible's: look a few verses either side */
        if (!sj && (!best || best.sc < 0.5)) for (const cc of [c, c + 1]) for (let d = -3; d <= 3; d++) {
          const sc = score(cc, nn + d);
          if (sc >= 0.5 && (!best || sc > best.sc + 0.2)) best = { cc, vv: nn + d, sc };
        }
        if (best) { if (best.sc < 0.3) report.cyrilWeak.push('Book ' + n + ': ' + best.cc + ':' + best.vv + ' "' + lem[2].slice(0, 40) + '"'); c = best.cc; v = best.vv; cur = [c, v]; }
        continue;
      }
      if (!cur || words(t) < 12) continue;
      if (/^(CHAPTER|OUR FATHER|ON THE|BOOK [IVX]+|Archbishop|\[Translated)/.test(t)) continue;
      const vol = n < 6 || (n === 6 && +pageHere >= 649) ? 43 : 48;
      const text = dropBrackets(t);
      if (last && last.lab[0] === cur[0] && last.lab[1] === cur[1] && last.w < 120) { last.text += ' ' + text; last.w = words(last.text); continue; }
      last = { lab: [cur[0], cur[1], cur[0], cur[1]], cite: 'Cyril of Alexandria, Commentary on John, Book ' + n + ', LFC ' + vol + (pageHere ? ':' + pageHere : ''),
        text, url: CYRIL_URL(n), edition: CYRIL_ED, key: 'cyril:' + n, lemma: false, w: words(text) };
      addComm('John', cur[0], 'cyril-alexandria', last);
    }
  }
}

/* ------------------------------------------------------------ Matthew Henry */
/* HENRY[b][c] = { intro, sections: [{ lo, hi, text }], url, vol } */
const HENRY = {};
const HENRY_BOOK = t => { const x = t.replace(/^First /, '1 ').replace(/^Second /, '2 ').replace(/^Psalms$/, 'Psalm').replace(/^Song of Solomon$/, 'Song of Songs'); return CODE_OF[x.toLowerCase()] || null; };
function henry(xml, n) {
  const { paras } = thml(xml);
  let secs = null, curSec = null, key = null;
  for (const p of paras) {
    const bd = p.path.find(d => d.lvl === 1), cd = p.path.find(d => d.lvl === 2 && /^Chapter [IVXLC]+$/.test(d.title));
    if (!bd || !cd) continue;
    const b = HENRY_BOOK(bd.title);
    if (!b || ORDER[b] > HENRY_LAST) continue;
    const c = roman(cd.title.split(' ')[1]);
    if (key !== b + c) { key = b + c; secs = at3(HENRY, b, c, undefined); secs.intro = ''; secs.sections = []; secs.url = CCEL + 'henry/mhc' + n + '/mhc' + n + '.' + cd.id + '.html'; secs.vol = n; curSec = null; }
    for (const cm of p.coms) {
      const r = cm.parsed ? parsed(cm.parsed)[0] : null;
      if (r && r.v && r.b === b && r.c === c) { curSec = { lo: r.v, hi: r.c2 === c ? r.v2 : nV(b, c), text: '' }; secs.sections.push(curSec); }
    }
    const t = dropBrackets(p.text);
    if (!t) continue;
    if (curSec) curSec.text += (curSec.text ? ' ' : '') + t; else secs.intro += (secs.intro ? ' ' : '') + t;
  }
}

/* ------------------------------------------------------------ choosing */
/* spread a Father's commentary over the chapter: labels evenly, first substantive paragraph of each, then seconds */
/* A Father's commentary on the chapter, about budget words: the verses he says most on first
   (those another Father already covers count half), a short excerpt from each, then second
   paragraphs while words remain; printed in reading order. */
function pickCommentary(recs, budget, avoid) {
  const byLab = new Map();
  recs.filter(r => !r.lemma && r.w >= 8).forEach(r => { const k = r.lab.join(':'); if (!byLab.has(k)) byLab.set(k, { recs: [], words: 0, lab: r.lab }); const g = byLab.get(k); g.recs.push(r); g.words += r.w; });
  if (!byLab.size) return [];
  byLab.forEach(g => { if (g.lab[0] !== g.lab[2] || g.lab[3] - g.lab[1] > 3) g.recs.sort((x, y) => (y.own ? 1 : 0) - (x.own ? 1 : 0)); });
  const slots = Math.max(1, Math.floor(budget / CAP.excerpt));
  const per = Math.max(CAP.excerpt, Math.min(CAP.para, Math.floor(budget / Math.min(slots, byLab.size))));
  const score = g => Math.sqrt(g.words) * (avoid && avoid.has(g.lab[0] + ':' + g.lab[1]) ? 0.4 : 1) * (g.lab[0] === g.lab[2] && g.lab[1] === g.lab[3] ? 1 : g.lab[3] - g.lab[1] > 6 || g.lab[0] !== g.lab[2] ? 0.3 : 0.6);
  const chosen = [...byLab.values()].sort((x, y) => score(y) - score(x) || cmp(x.lab, y.lab)).slice(0, slots);
  const out = []; let used = 0;
  for (let pass = 0; pass < 4 && used < budget - 40; pass++) {
    for (const g of chosen) {
      const r = g.recs[pass];
      if (!r) continue;
      const left = budget - used;
      if (left < 40) break;
      const text = cut(r.text, Math.min(pass ? CAP.para : per, left));
      out.push({ r, text }); used += words(text);
    }
  }
  const idx = new Map(recs.map((r, i) => [r, i]));
  out.sort((x, y) => idx.get(x.r) - idx.get(y.r));
  const merged = [];
  for (const o of out) {
    const pv = merged[merged.length - 1];
    if (pv && pv.r.cite === o.r.cite && pv.r.lab.join() === o.r.lab.join() && idx.get(o.r) === pv.last + 1) { pv.text += ' ' + o.text; pv.last = idx.get(o.r); }
    else merged.push({ r: o.r, text: o.text, last: idx.get(o.r) });
  }
  return merged.map(o => ({ r: o.r, text: o.text }));
}

function packet(b, c, report) {
  const name = NAME[b] + ' ' + c, sl = slug(name);
  const src = new Map(); // father -> { segs, editions:Set, urls:[], notes:[] }
  const add = (f, lab, cite, text, url, edition, extraNote) => {
    if (!src.has(f)) src.set(f, { segs: [], editions: new Set(), urls: [], notes: [] });
    const s = src.get(f);
    s.segs.push({ base: label(b, lab[0], lab[1], lab[2], lab[3]) + ' ' + cite, comm: text });
    s.editions.add(edition); s.urls.push(url);
    if (extraNote && !s.notes.includes(extraNote)) s.notes.push(extraNote);
    return words(text);
  };
  let total = 0;
  /* 1. continuous commentary */
  const comm = (COMM[b] && COMM[b][c]) || {};
  const has = f => comm[f] && comm[f].some(r => !r.lemma && r.w >= 8);
  const listed = BOOK_PRIORITY[b] || BOOK_PRIORITY.default;
  const prio = listed.filter(has).concat(Object.keys(comm).filter(f => !listed.includes(f) && has(f)).sort((x, y) => RANK[x] - RANK[y]));
  const commFathers = prio.slice(0, 2);
  const commOthers = Object.keys(comm).filter(f => !commFathers.includes(f) && comm[f].some(r => !r.lemma));
  const covered = new Set();
  commFathers.forEach(f => {
    pickCommentary(comm[f], CAP.commentary, covered).forEach(o => { covered.add(o.r.lab[0] + ':' + o.r.lab[1]); total += add(f, o.r.lab, o.r.cite, o.text, o.r.url, o.r.edition); });
  });
  const commWords = total;
  /* 2. the Catena, for the Gospels */
  let catUsed = 0, catKept = 0, catAll = 0; const left = {};
  const cat = (CATENA[b] && CATENA[b][c] && CATENA[b][c].list) || [];
  if (cat.length) {
    catAll = cat.length;
    cat.forEach(x => { if (!x.father) { const g = catenaTagGroup(x.tag); left[g] = (left[g] || 0) + 1; } });
    const roster = cat.filter(x => x.father);
    catKept = roster.length;
    const budget = Math.min(CAP.total - total, Math.max(CAP.catena, CAP.catenaFill - commWords));
    const groups = new Map();
    roster.forEach(x => { const k = x.lo + '-' + x.hi; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); });
    const keys = [...groups.keys()];
    const seen = new Set(), picked = new Set();
    for (let pass = 0; pass < 4 && catUsed < budget; pass++) {
      for (const k of keys) {
        if (catUsed >= budget - 30) break;
        const g = groups.get(k);
        const x = g.find(y => !picked.has(y) && (pass > 1 || (!commFathers.includes(y.father) && (pass > 0 || !seen.has(y.father)))));
        if (!x) continue;
        picked.add(x); seen.add(x.father);
        const text = cut(x.text, Math.min(200, budget - catUsed));
        x._text = text;
        catUsed += words(text);
      }
    }
    const ed = CATENA_ED[b];
    cat.filter(x => picked.has(x)).forEach(x => {
      const cite = CNAME[x.father] + (x.ref ? ', ' + x.ref : '') + ', in the Catena Aurea on ' + NAME[b] + ' ' + c + ' (Oxford, vol. ' + CATENA_VOL[b] + (x.page ? ' p. ' + x.page : '') + ')';
      total += add(x.father, [c, x.lo, c, x.hi], cite, x._text, x.url, ed.ed,
        'Its Catena Aurea extracts are Aquinas’s excerpts, in the Oxford translation; where no work is named the Catena does not name it.');
    });
  }
  /* 3. citations from other works */
  const cands = ((CITE[b] && CITE[b][c] && CITE[b][c].list) || []).filter(x => !(commFathers.includes(x.father) && comm[x.father] && comm[x.father].some(r => r.key.startsWith(x.work))));
  cands.sort((x, y) => RANK[x.father] - RANK[y.father] || y.verses - x.verses || (x.long ? 1 : 0) - (y.long ? 1 : 0) || Math.abs(x.w - 150) - Math.abs(y.w - 150));
  const usedWork = new Set(), perFather = {}; const cites = [];
  for (let pass = 0; pass < 2; pass++) {
    for (const x of cands) {
      if (cites.length >= CAP.citeCount) break;
      if (usedWork.has(x.work) || cites.some(y => y.x === x)) continue;
      if ((perFather[x.father] || 0) >= (pass === 0 ? 1 : 2)) continue;
      const text = x.long ? windowAround(x.text, b, c, x.vs, 200, x.at) : x.text, w = words(text);
      if (total + w > CAP.total && cites.length >= CAP.citeFloor) continue;
      if (total + w > CAP.total + 250) continue;
      cites.push({ x, text }); usedWork.add(x.work); perFather[x.father] = (perFather[x.father] || 0) + 1; total += w;
    }
  }
  cites.forEach(({ x, text }) => add(x.father, x.lab, x.cite, text, x.url, x.edition));
  /* 4. Henry, when the Fathers are thin and he wrote the book himself */
  let henryAdded = false;
  if (total < CAP.henryUnder && ORDER[b] <= HENRY_LAST && HENRY[b] && HENRY[b][c]) {
    const H = HENRY[b][c];
    const hits = (HITS[b] && HITS[b][c]) || {};
    let top = 0, topV = 0; Object.keys(hits).forEach(v => { if (hits[v] > top) { top = hits[v]; topV = +v; } });
    const sec = H.sections.find(s => topV >= s.lo && topV <= s.hi) || H.sections[0];
    const s = { segs: [], editions: new Set(['An Exposition of the Old and New Testaments (1706 to 1714), ccel mhc' + H.vol]), urls: [H.url], notes: [] };
    if (H.intro) s.segs.push({ base: label(b, c, 1, c, nV(b, c)) + ' Matthew Henry, Exposition, ' + NAME[b] + ' ' + c + ', introduction', comm: cut(dropBrackets(H.intro), CAP.henryIntro) });
    if (sec && sec.text) s.segs.push({ base: label(b, c, sec.lo, c, sec.hi) + ' Matthew Henry, Exposition, ' + NAME[b] + ' ' + c + ':' + sec.lo + (sec.hi !== sec.lo ? '-' + sec.hi : ''), comm: cut(sec.text, CAP.henrySection) });
    if (s.segs.length) {
      s.notes.push('A Protestant commentator of 1706 to 1714, not a Father: used here because the Fathers say little on this chapter'
        + (topV ? '; his section is the one on ' + c + ':' + topV + ', the verse they quote most.' : '.'));
      src.set('matthew-henry', s); henryAdded = true;
    }
  }
  /* the sources, in order: commentary Fathers, Catena Fathers, citation Fathers, Henry */
  const order = [...src.keys()].sort((x, y) => {
    const t = f => f === 'matthew-henry' ? 3 : commFathers.includes(f) ? 0 : (cat.some(z => z.father === f && z._text) ? 1 : 2);
    return t(x) - t(y) || (RANK[x] || 0) - (RANK[y] || 0);
  });
  const sources = order.map(f => {
    const s = src.get(f);
    const isH = f === 'matthew-henry';
    return { id: f, name: rosterName(f), edition: [...s.editions].join('; '), url: s.urls[0],
      licence: isH ? 'public domain (1706 to 1714); the CCEL edition is for personal, educational or non-profit use' : licenceFor(s.editions),
      note: s.notes.join(' '), segs: s.segs };
  });
  /* the index */
  const cited = (CITED[b] && CITED[b][c]) || 0;
  const leftTxt = Object.keys(left).sort((x, y) => left[y] - left[x]).map(k => k + ' ' + left[k]).join(', ');
  const fw = sources.filter(s => s.id !== 'matthew-henry').reduce((a, s) => a + s.segs.reduce((z, g) => z + words(g.comm), 0), 0);
  const notes = [
    commFathers.length ? 'Continuous commentary on ' + name + ': ' + commFathers.map(f => CNAME[f]).join(' and ') + '.' : 'No Father on the roster comments on ' + name + ' verse by verse in these sources.',
    commOthers.length ? 'Also commenting, not printed here: ' + commOthers.map(f => CNAME[f]).join(', ') + '.' : '',
    cat.length ? 'Catena Aurea: ' + catAll + ' extracts on this chapter, ' + catKept + ' by roster Fathers, ' + cat.filter(x => x._text).length + ' printed; left out as not on the roster: ' + (catAll - catKept) + (leftTxt ? ' (' + leftTxt + ')' : '') + '.' : '',
    cited + ' paragraph' + (cited === 1 ? '' : 's') + ' of the roster Fathers quote this chapter elsewhere; ' + cites.length + ' printed (at most one per work; a paragraph over 250 words is cut to the sentences round its quotation).',
    'Fathers’ words in this packet: about ' + fw + '.',
    henryAdded ? 'Matthew Henry was added because the Fathers come to under ' + CAP.henryUnder + ' words here.' : (fw < CAP.henryUnder && ORDER[b] > HENRY_LAST ? 'Matthew Henry is not used after Acts (others finished his Romans to Revelation).' : '')
  ].filter(Boolean).join(' ');
  report.words.push(fw); if (!fw) report.empty.push(name); if (henryAdded) report.henry.push(name);
  return { plan: 'bible', ch: sl, sources: [{ id: 'index', name: 'what the Fathers cover here', edition: '(a summary of this packet)', url: '(none: a summary, not evidence)', licence: 'n/a', notes }].concat(sources) };
}
function licenceFor(eds) {
  const e = [...eds];
  const other = e.filter(x => !/ccel\.org/.test(x));
  if (!other.length) return CCEL_LICENCE;
  if (other.some(x => /tertullian/.test(x))) return 'public domain (tertullian.org: copy freely)' + (other.length < e.length ? '; ' + CCEL_LICENCE : '');
  if (other.some(x => /lectionarycentral/.test(x))) return 'public domain (Oxford translation, 1844 to 1850)' + (other.length < e.length ? '; ' + CCEL_LICENCE : '');
  return 'public domain (Oxford translation, 1841 to 1845)' + (other.length < e.length ? '; ' + CCEL_LICENCE : '');
}

/* ------------------------------------------------------------ build */
async function build(h) {
  const load = loader(h);
  const report = { comm: {}, moralia: [], cyrilWeak: [], words: [], empty: [], henry: [], sizes: [] };
  web();
  for (const vol of Object.keys(VOLS)) {
    const xml = await load('https://ccel.org/ccel/s/schaff/' + vol + '.xml', 'bible-' + vol + '.xml');
    ingestVolume(vol, xml, report);
  }
  catenaCcel(await load('https://ccel.org/ccel/a/aquinas/catena1.xml', 'bible-catena1.xml'), 'Matt', 'catena1');
  catenaCcel(await load('https://ccel.org/ccel/a/aquinas/catena2.xml', 'bible-catena2.xml'), 'Mark', 'catena2');
  catenaIsidore(await load('https://isidore.co/aquinas/english/CALuke.htm', 'bible-catena-luke.htm'), 'Luke', 'https://isidore.co/aquinas/english/CALuke.htm');
  catenaIsidore(await load('https://isidore.co/aquinas/english/CAJohn.htm', 'bible-catena-john.htm'), 'John', 'https://isidore.co/aquinas/english/CAJohn.htm');
  for (let n = 1; n <= 35; n++) moralia(n, await load(MORALIA_URL(n), 'bible-moralia-' + String(n).padStart(2, '0') + '.html', cp1252), report);
  const cy = {};
  for (let n = 1; n <= 12; n++) cy[n] = await load(CYRIL_URL(n), 'bible-cyril-john-' + String(n).padStart(2, '0') + '.htm');
  cyril(cy, report);
  for (let n = 1; n <= 6; n++) henry(await load('https://ccel.org/ccel/h/henry/mhc' + n + '.xml', 'bible-mhc' + n + '.xml'), n);

  const dir = path.join(h.CACHE, 'bible');
  fs.mkdirSync(dir, { recursive: true });
  let count = 0;
  for (const [b] of BOOKS) for (let c = 1; c <= nCh(b); c++) {
    const p = packet(b, c, report);
    const file = path.join(dir, p.ch + '.json');
    fs.writeFileSync(file, JSON.stringify(p, null, 1), 'utf8');
    report.sizes.push(fs.statSync(file).size);
    count++;
  }
  console.log('  bible: ' + count + ' packets written to .scripts/.cache/teachings/bible/ (' + report.empty.length + ' with no roster Father, '
    + report.henry.length + ' with Matthew Henry)');
  return report;
}

module.exports = { build, BOOKS, _test: { thml, parsed, passageTitle, bestVerse, catenaFather, jobEnglish, label, cut, dropBrackets, moralia, cyril, ingestVolume, titleUnit, excluded, fatherOf, COMM, CITE, CATENA, HENRY } };
