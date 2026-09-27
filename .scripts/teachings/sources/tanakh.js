/* The Teachings: the Tanakh commentaries, one packet per chapter.

   const tanakh = require('./sources/tanakh');
   await tanakh.build({ get, CACHE, packetsOnly });

   Writes .scripts/.cache/teachings/tanakh/<slug>.json, the slug of the app's
   chapter label ("genesis-22", "psalm-23", "2-samuel-12", "song-of-songs-2"),
   929 in all:
     { plan: 'tanakh', ch: '<slug>', sources: [{ id, name, edition, url, licence, note?, segs: [{ base, comm }] }] }
   Sources in this order: rashi, ibn-ezra, radak, ramban, rashbam, sforno,
   metzudat-david, then midrash (one source per Rabbah that has a paragraph on
   the chapter, named "Genesis Rabbah" and so on; a stub named "the Midrash"
   when none has).

   A seg is one comment. Its base is "[<Book> <c>:<v>] " and the comment's
   lemma (the dibur hamatchil) when it has one; for the Midrash, "[<Book> <c>:<v>]
   Genesis Rabbah 56:4" (or "[Genesis 22:7 to 22:8] ..." for a paragraph on a run
   of verses). Numbered books are written "I Samuel", "II Kings", "I Chronicles":
   packet.js --verse takes the first number in the bracket, so "1 Samuel 3:4"
   would read as verse 1. The Psalms are "Psalm". comm is the Hebrew, then on a
   new line "English (<translator>, <year>, <licence>): " and the English, when a
   paired English exists; else the Hebrew alone.

   Source (tested 2026-09-27): Sefaria's own export, as JSON per version.
     Pinned by the immutable git commit of Sefaria/Sefaria-Export-Archive
     3f1013631fdfe452e953a93a2c5f921319e394ed (the export of 2026-03-23, when the
     export still lived in git), fetched from raw.githubusercontent.com. Every
     file is checked against its git blob sha1 and size in tanakh-lock.json. The
     one file that commit lacks, Ramban on Exodus in Hebrew ("On Your Way"), is
     fetched from the live export bucket by its object generation and checked by
     its md5; the bucket is overwritten monthly, so if that generation is gone
     the archive's "On Your Way New" is used instead (the same text but for three
     comments at Exodus 6:2 to 6:3, which it runs together).
     The Hebrew Tanakh ("Tanach with Text Only", same commit) is read too, but only
     as the verse grid and for the lemma check; it never enters a packet.
   What each commentator is, per book (the archive's file names):
     rashi       Torah: Rosenbaum and Silbermann 1929-34, Hebrew and English, public
                 domain (Numbers in Hebrew: its "corrected vocalization" copy).
                 Joshua: Metsudah 1997; Judges to II Kings: the Metsudah Tanach
                 (Judges and Samuel in Hebrew: "On Your Way"); the Megillot: the
                 Metsudah Five Megillot 2001; all CC-BY. The rest: Hebrew "On Your
                 Way" (public domain), English Judaica Press, A. J. Rosenberg (CC-BY).
     ibn-ezra    Torah: Hebrew "On Your Way", English Strickman and Silver (CC-BY-NC).
                 Isaiah: Friedlander, Hebrew 1877 and English 1873 (public domain).
                 The Twelve, Psalms, Job, Daniel, the Megillot: Hebrew only (Daat,
                 Wikisource, Kol Sason 1840; Habakkuk's full text is the one titled
                 "<b>Ibn Ezra on Habakkuk</b>- Daat", the plain "Daat" file is a stub).
     radak       Genesis: Hebrew Presburg 1842, English Munk (CC-BY). Prophets and
                 Chronicles: Hebrew "Radak on Nach" (no licence stated), English only
                 for Chronicles, Berger 2007 (CC-BY-NC). Psalms: Hebrew Leipzig 1883
                 for Psalms 1 to 41 and Furth 1843 for 42 to 150, English Finch 1919
                 (public domain; Psalms 1 to 10, 15 to 17, 19, 22, 24 only).
     ramban      Hebrew "On Your Way" (the name varies by book), English Chavel (CC-BY).
     rashbam     Hebrew Daat, English Munk (CC-BY).
     sforno      Torah: Hebrew "On Your Way", English Munk (CC-BY). Song of Songs:
                 Hebrew Warsaw 1875 only. Sefaria has nothing more of his.
     metzudat-david  Hebrew "On Your Way" only; none on Ruth, Lamentations, Esther.
     midrash     The ten Rabbot: Hebrew "Midrash Rabbah -- TE" (Torat Emet), English
                 "The Sefaria Midrash Rabbah, 2022" (CC-BY), the same paragraph grid.
   Coverage rules (each stated in the source's note where it applies): no Rashi on
   Chronicles (not his); Rashi on Job stops at 40:20, where an editor's note says
   what follows is not his; no Ibn Ezra on Proverbs, Ezra or Nehemiah (Sefaria and
   modern scholarship give them to Moses Kimhi); Ibn Ezra on Exodus is the long
   commentary; his second recension on Esther is not used.

   Cutting. A commentary file is text[chapter][verse][comment]; a complex one
   keeps that under the key "" beside "Introduction" (not used). The English is
   paired with the Hebrew comment by comment when the verse has the same number
   of comments in both; otherwise the verse's English is its own seg after the
   Hebrew ("English ... for the whole verse"). Footnotes (<sup class=
   "footnote-marker"> and <i class="footnote">, nested <i> inside) are dropped;
   a Hebrew parenthesis that is an editor's remark (עיין, וצ"ע, הגהה, נ"א, ...)
   becomes "[editor: ...]"; the parentheses that give a reference are the printers'
   and stay as they are. Fixes to Sefaria's filing (MOVES, LUMPED): Radak on
   Isaiah 36:30 is on 37:30; Radak on Psalms 28:15 (Leipzig) is on 38:15; Rashi's
   second reading of Deuteronomy 32 and his midrashic reading of Proverbs 30:15-31,
   printed at 32:43 and 30:31 with the verse numbers inline ("(לג)"), go to their
   verses, with that said in the base. Ibn Ezra reads the Song of Songs three
   times; his "הפעם הא'/הב'/הג'" headers become "(first/second/third reading)".
   The Midrash: a Rabbah paragraph goes on the verses Sefaria's links give it (the
   links API, one call per Rabbah chapter and per Petichta node, 249 calls, cached
   as tanakh-links-*.json and not pinned): its curated "midrash" links first
   (the verse the paragraph expounds, from any Rabbah); then, from the book's own
   Rabbah only, its citation links from the parashot that expound the chapter:
   those with curated links into it, or with a paragraph linked there that
   opens on it (the first "(Ruth 1:2)" in its English's first 400 characters,
   else the first "(רות א, ב)" in its Hebrew's); and the Petichta's, on chapter
   1. Any other citation is a prooftext and is left out (curated links are
   sparse outside Genesis and Exodus: Ruth 1 has one, on 1:14). A
   paragraph is printed once, on its contiguous run of verses around the curated
   one; its other verses in the chapter get a one-line pointer seg. The Song of
   Songs and Ecclesiastes Rabbah are divided by the book's own chapter and verse,
   and are placed by that division, without links.
   A chapter over WORD_CAP words keeps every commentator, but its longest Hebrew
   and English parts are cut, longest first, to their first 400 words and "[…]"
   until it fits. That is not enough for 75 chapters (68 in the Torah, Song of
   Songs 1, 2 and 4, Lamentations 1, Ecclesiastes 1 and 7, Esther 1; genesis-1
   stays at 94,041 words): packet.js prints such a day as an index and it is read
   with --verse. Further steps can be added to TRIM_STEPS (measured 2026-09-27:
   [400, 250] leaves 58 over, [400, 250, 150] 37, [400, 250, 150, 100, 60] 8).
   The lemma check (a comment's lemma found in its verse) reports, never blocks. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SHA = '3f1013631fdfe452e953a93a2c5f921319e394ed';
const RAW = 'https://raw.githubusercontent.com/Sefaria/Sefaria-Export-Archive/' + SHA + '/';
const BLOB = 'https://github.com/Sefaria/Sefaria-Export-Archive/blob/' + SHA + '/';
const GCS = 'https://storage.googleapis.com/sefaria-export/';
const LINKS_API = 'https://www.sefaria.org/api/links/';
const LOCK_FILE = path.join(__dirname, 'tanakh-lock.json');
const WORD_CAP = 25000, TRIM_STEPS = [400];

/* [Sefaria's title, the app's label, section] */
const BOOKS = [
  ['Genesis', 'Genesis', 'Torah'], ['Exodus', 'Exodus', 'Torah'], ['Leviticus', 'Leviticus', 'Torah'], ['Numbers', 'Numbers', 'Torah'],
  ['Deuteronomy', 'Deuteronomy', 'Torah'], ['Joshua', 'Joshua', 'Prophets'], ['Judges', 'Judges', 'Prophets'], ['I Samuel', '1 Samuel', 'Prophets'],
  ['II Samuel', '2 Samuel', 'Prophets'], ['I Kings', '1 Kings', 'Prophets'], ['II Kings', '2 Kings', 'Prophets'], ['Isaiah', 'Isaiah', 'Prophets'],
  ['Jeremiah', 'Jeremiah', 'Prophets'], ['Ezekiel', 'Ezekiel', 'Prophets'], ['Hosea', 'Hosea', 'Prophets'], ['Joel', 'Joel', 'Prophets'],
  ['Amos', 'Amos', 'Prophets'], ['Obadiah', 'Obadiah', 'Prophets'], ['Jonah', 'Jonah', 'Prophets'], ['Micah', 'Micah', 'Prophets'],
  ['Nahum', 'Nahum', 'Prophets'], ['Habakkuk', 'Habakkuk', 'Prophets'], ['Zephaniah', 'Zephaniah', 'Prophets'], ['Haggai', 'Haggai', 'Prophets'],
  ['Zechariah', 'Zechariah', 'Prophets'], ['Malachi', 'Malachi', 'Prophets'], ['Psalms', 'Psalm', 'Writings'], ['Proverbs', 'Proverbs', 'Writings'],
  ['Job', 'Job', 'Writings'], ['Song of Songs', 'Song of Songs', 'Writings'], ['Ruth', 'Ruth', 'Writings'], ['Lamentations', 'Lamentations', 'Writings'],
  ['Ecclesiastes', 'Ecclesiastes', 'Writings'], ['Esther', 'Esther', 'Writings'], ['Daniel', 'Daniel', 'Writings'], ['Ezra', 'Ezra', 'Writings'],
  ['Nehemiah', 'Nehemiah', 'Writings'], ['I Chronicles', '1 Chronicles', 'Writings'], ['II Chronicles', '2 Chronicles', 'Writings']
];
const SECTION = {}, APP = {}, FROM_APP = {};
BOOKS.forEach(([s, a, sec]) => { SECTION[s] = sec; APP[s] = a; FROM_APP[a] = s; });
/* the book as a seg label writes it: roman numerals, and "Psalm" */
const LABEL = b => APP[b].replace(/^1 /, 'I ').replace(/^2 /, 'II ');
const TORAH = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'];
const EARLY = ['Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings'];
const TWELVE = ['Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'];
const LATER = ['Isaiah', 'Jeremiah', 'Ezekiel', ...TWELVE];
const MEGILLOT = ['Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther'];

const ORDER = ['rashi', 'ibn-ezra', 'radak', 'ramban', 'rashbam', 'sforno', 'metzudat-david'];
const NAME = { rashi: 'Rashi', 'ibn-ezra': 'Ibn Ezra', radak: 'Radak', ramban: 'Ramban', rashbam: 'Rashbam', sforno: 'Sforno', 'metzudat-david': 'Metzudat David' };
const DIR = id => id === 'metzudat-david' ? 'Acharonim on Tanakh/Metzudat David' : 'Rishonim on Tanakh/' + NAME[id];

/* versionTitles as the export names its files (a few differ from the title inside) */
const V = {
  RS: "Pentateuch with Rashi's commentary by M. Rosenbaum and A.M. Silbermann, 1929-1934",
  RS_NUM: "Pentateuch with Rashi's commentary by M. Rosenbaum and A.M. Silbermann -- corrected vocalization",
  OYW: 'On Your Way',
  METS_JOSH: 'The Book of Joshua, Metsudah Publications, 1997',
  METS_TANACH: 'The Metsudah Tanach series, Lakewood, N.J',
  METS5: 'The Metsudah Five Megillot, Lakewood, N.J., 2001',
  JP: 'The Judaica Press complete Tanach with Rashi, translated by A. J. Rosenberg',
  STRICKMAN: "Ibn Ezra's commentary on the Pentateuch, tran. and annot. by H. Norman Strickman and Arthur M. Silver. Menorah Pub., 1988-2004",
  FRIED_HE: 'Ibn Ezra on Isaiah, by M. Friedlander; Society of Hebrew Literature, London 1877',
  FRIED_EN: 'Commentary of Ibn Ezra on Isaiah - trans. by M. Friedlander, 1873',
  MUNK: 'Eliyahu Munk, HaChut Hameshulash',
  PRESBURG: 'Presburg  A. Schmid, 1842',
  NACH: 'Radak on Nach',
  LEIPZIG: 'The Psalms with Qimchi’s Longer Commentary, Leipzig, 1883',
  FURTH: 'Derekh Mesilah, Furth 1843',
  FINCH: 'R. David Kimhi on the first book of Psalms, Translated by R.G. Finch, London, 1919',
  BERGER: 'The Commentary of Radak to Chronicles A Translation with Introduction and Supercommentary, by Yitzhak Berger, Brown University, 2007',
  CHAVEL: 'Commentary on the Torah by Ramban Nachmanides. Translated and annotated by Charles B. Chavel. New York, Shilo Pub. House, 1971-1976',
  TE: 'Midrash Rabbah -- TE',
  MR2022: 'The Sefaria Midrash Rabbah, 2022',
  TEXT: 'Tanach with Text Only'
};
/* the English editions: who, for the "English (...)" tag */
const EN = {
  rs: { ver: V.RS, who: 'M. Rosenbaum and A. M. Silbermann, 1929 to 1934' },
  metsJosh: { ver: V.METS_JOSH, who: 'Metsudah Publications, 1997' },
  metsTanach: { ver: V.METS_TANACH, who: 'the Metsudah Tanach, Lakewood N.J.' },
  mets5: { ver: V.METS5, who: 'the Metsudah Five Megillot, 2001' },
  jp: { ver: V.JP, who: 'A. J. Rosenberg, Judaica Press' },
  strickman: { ver: V.STRICKMAN, who: 'H. Norman Strickman and Arthur M. Silver, 1988 to 2004' },
  friedlander: { ver: V.FRIED_EN, who: 'M. Friedlander, 1873' },
  munk: { ver: V.MUNK, who: 'Eliyahu Munk, HaChut Hameshulash' },
  finch: { ver: V.FINCH, who: 'R. G. Finch, 1919' },
  berger: { ver: V.BERGER, who: 'Yitzhak Berger, 2007' },
  chavel: { ver: V.CHAVEL, who: 'Charles B. Chavel, 1971 to 1976' },
  mr2022: { ver: V.MR2022, who: 'The Sefaria Midrash Rabbah, 2022' }
};

const cpath = (id, book, lang, ver) => `json/Tanakh/${DIR(id)}/${SECTION[book]}/${NAME[id]} on ${book}/${lang}/${ver}.json`;
const tpath = book => `json/Tanakh/${SECTION[book]}/${book}/Hebrew/${V.TEXT}.json`;
const rpath = (r, lang) => `json/Midrash/Aggadah/Midrash Rabbah/${r}/${lang}/${lang === 'Hebrew' ? V.TE : V.MR2022}.json`;

/* one spec per commentator and book: he is [{ ver, from, to }] (chapters), en a key of EN */
function specs() {
  const S = [];
  const add = (id, book, he, en, extra) => S.push(Object.assign({ id, book, he: [].concat(he).map(x => typeof x === 'string' ? { ver: x } : x), en: en || null }, extra || {}));
  TORAH.forEach(b => add('rashi', b, b === 'Numbers' ? V.RS_NUM : V.RS, 'rs'));
  add('rashi', 'Joshua', V.METS_JOSH, 'metsJosh');
  ['Judges', 'I Samuel', 'II Samuel'].forEach(b => add('rashi', b, V.OYW, 'metsTanach'));
  add('rashi', 'I Kings', V.METS_TANACH + ' ', 'metsTanach');          // the file name has a trailing space
  add('rashi', 'II Kings', V.METS_TANACH, 'metsTanach');
  [...LATER, 'Psalms', 'Proverbs', 'Job', 'Daniel', 'Ezra', 'Nehemiah'].forEach(b => add('rashi', b, V.OYW, 'jp'));
  MEGILLOT.forEach(b => add('rashi', b, V.METS5, 'mets5'));

  TORAH.forEach(b => add('ibn-ezra', b, V.OYW, 'strickman'));
  add('ibn-ezra', 'Isaiah', V.FRIED_HE, 'friedlander');
  const daat = { Hosea: 'Ibn Ezra on Hosea -- Daat', Joel: 'Ibn Ezra on Joel -- Daat', Amos: 'Ibn Ezra on Amos -- Daat', Obadiah: 'Ibn Ezra on Obadiah -- Daat',
    Jonah: 'Ibn Ezra on Jonah -- Daat', Micah: 'Ibn Ezra on Micah -- Daat', Nahum: 'Ibn Ezra on Nahum -- Daat', Habakkuk: 'bIbn Ezra on Habakkukb- Daat',
    Zephaniah: 'Ibn Ezra on Zephaniah -- Daat', Haggai: 'Ibn Ezra on Haggai -- Daat', Zechariah: 'Ibn Ezra on Zecharia -- Daat', Malachi: 'Ibn Ezra on Malachi -- Daat',
    Psalms: 'Ibn Ezra on Psalms -- Daat', Job: 'Ibn Ezra on Job -- Daat', Daniel: 'Ibn Ezra on Daniel - Daat', Ruth: 'Ibn Ezra on Ruth -- Daat',
    'Song of Songs': "Ibn Ezra's commentary on the Canticles", Lamentations: 'Ibn Ezra on Lamentations -- Wikisource', Ecclesiastes: 'Wikisource',
    Esther: 'Kol Sason, Krotoschin, 1840' };
  Object.entries(daat).forEach(([b, v]) => add('ibn-ezra', b, v, null));
  ['Proverbs', 'Ezra', 'Nehemiah'].forEach(b => add('ibn-ezra', b, [], null, { excluded: 'Not included: the commentary printed as Ibn Ezra’s on ' + b + ' is by Moses Kimhi, as Sefaria’s own record of it says (authors: Moses Kimhi, Ibn Ezra) and modern scholarship holds.' }));

  add('radak', 'Genesis', V.PRESBURG, 'munk');
  [...EARLY, ...LATER].forEach(b => add('radak', b, V.NACH, null));
  add('radak', 'Psalms', [{ ver: V.LEIPZIG, from: 1, to: 41 }, { ver: V.FURTH, from: 42, to: 150 }], 'finch');
  ['I Chronicles', 'II Chronicles'].forEach(b => add('radak', b, V.NACH, 'berger'));

  const rbHe = { Genesis: V.OYW, Exodus: V.OYW, Leviticus: 'On Your Way New', Numbers: 'On Your Way New', Deuteronomy: 'On Your Way new' };
  TORAH.forEach(b => add('ramban', b, rbHe[b], 'chavel'));
  const rsHe = { Genesis: 'daat', Exodus: 'Rashbam on Torah -- Daat', Leviticus: 'Rashbam on Leviticus - Daat', Numbers: 'Rashbam on Numbers -- Daat', Deuteronomy: 'Rashbam on Deuteronomy -- Daat' };
  TORAH.forEach(b => add('rashbam', b, rsHe[b], 'munk'));
  TORAH.forEach(b => add('sforno', b, V.OYW, 'munk'));
  add('sforno', 'Song of Songs', 'Chamesh Megillot, Warsaw 1875', null);

  [...EARLY, ...LATER, 'Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ecclesiastes', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles']
    .forEach(b => add('metzudat-david', b, V.OYW, null));
  ['I Chronicles', 'II Chronicles'].forEach(b => add('rashi', b, [], null, { excluded: 'Not included: the commentary printed as Rashi’s on Chronicles is not his (a later northern French commentary under his name).' }));
  return S;
}

/* the ten Rabbot: [Sefaria's title, the name used here, the book, placed by] */
const RABBOT = [
  ['Bereshit Rabbah', 'Genesis Rabbah', 'Genesis', 'links'], ['Shemot Rabbah', 'Exodus Rabbah', 'Exodus', 'links'],
  ['Vayikra Rabbah', 'Leviticus Rabbah', 'Leviticus', 'links'], ['Bamidbar Rabbah', 'Numbers Rabbah', 'Numbers', 'links'],
  ['Devarim Rabbah', 'Deuteronomy Rabbah', 'Deuteronomy', 'links'], ['Shir HaShirim Rabbah', 'Song of Songs Rabbah', 'Song of Songs', 'structure'],
  ['Ruth Rabbah', 'Ruth Rabbah', 'Ruth', 'links'], ['Eikhah Rabbah', 'Lamentations Rabbah', 'Lamentations', 'links'],
  ['Kohelet Rabbah', 'Ecclesiastes Rabbah', 'Ecclesiastes', 'structure'], ['Esther Rabbah', 'Esther Rabbah', 'Esther', 'links']
];
const RAB_OF = {}; RABBOT.forEach(r => { RAB_OF[r[2]] = r[0]; });

/* Sefaria's filing, corrected. MOVES: a comment keyed to a verse that does not
   exist, whose lemma is in the verse given. LUMPED: comments on several verses
   printed under one, each new verse marked "(לג)"; from the first mark on, a
   comment goes to its mark's verse, or to the next verse or the one after if
   its lemma is there and not in the mark's verse. */
const MOVES = [
  { id: 'radak', book: 'Isaiah', from: [36, 30], to: [37, 30] },
  { id: 'radak', book: 'Psalms', from: [28, 15], to: [38, 15] }
];
const LUMPED = [
  { id: 'rashi', book: 'Deuteronomy', at: [32, 43], tag: 'Rashi’s second reading of the Song, printed at 32:43' },
  { id: 'rashi', book: 'Proverbs', at: [30, 31], tag: 'the midrashic reading of 30:15 to 30:31, printed at 30:31' }
];
const JOB_RASHI_ENDS = [40, 20];

/* ------------------------------------------------------------ fetching and the lock */
const enc = p => p.split('/').map(encodeURIComponent).join('/');
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function cacheName(p) {
  const parts = p.split('/');
  const tail = parts.slice(-3, -1).join(' ');
  return 'tanakh-' + slug(tail).slice(0, 60) + '-' + crypto.createHash('sha1').update(p).digest('hex').slice(0, 10) + '.json';
}
const gitBlob = buf => crypto.createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex');
const md5b64 = buf => crypto.createHash('md5').update(buf).digest('base64');

async function fetchText(h, url, file) {
  if (h.packetsOnly) {
    const f = path.join(h.CACHE, 'src', file);
    if (!fs.existsSync(f)) throw new Error(file + ' is not cached (run without --packets first)');
    return fs.readFileSync(f, 'utf8');
  }
  return h.get(url, file);
}
async function loadFile(h, lock, p, log) {
  const L = lock.files[p];
  if (!L) throw new Error('tanakh-lock.json has no entry for ' + p);
  const file = cacheName(p);
  let text, url, page, pin;
  if (L.gcs) {
    url = GCS + enc(p) + '?generation=' + L.generation;
    try { text = await fetchText(h, url, file); }
    catch (e) {
      if (!L.fallback || !/HTTP 404|not cached/.test(e.message)) throw e;
      log.push(p + ': generation ' + L.generation + ' is gone from the bucket, so the archive’s ' + L.fallback.split('/').pop() + ' is used');
      return Object.assign(await loadFile(h, lock, L.fallback, log), { fellBackFrom: p });
    }
    const buf = Buffer.from(text, 'utf8');
    if (buf.length !== L.size || md5b64(buf) !== L.md5)
      throw new Error(p + ': ' + buf.length + ' bytes, md5 ' + md5b64(buf) + ', but the lock says ' + L.size + ' and ' + L.md5 + '; delete .scripts/.cache/teachings/src/' + file + ' and fetch again');
    page = url; pin = 'Sefaria-Export bucket object generation ' + L.generation + ' (the export of ' + (L.exported || '2026-09-01') + ')';
  } else {
    url = RAW + enc(p);
    text = await fetchText(h, url, file);
    const buf = Buffer.from(text, 'utf8');
    if (buf.length !== L.size || gitBlob(buf) !== L.blob)
      throw new Error(p + ': ' + buf.length + ' bytes, git blob ' + gitBlob(buf) + ', but the lock says ' + L.size + ' and ' + L.blob + '; delete .scripts/.cache/teachings/src/' + file + ' and fetch again');
    page = BLOB + enc(p); pin = 'Sefaria-Export-Archive commit ' + SHA.slice(0, 7) + ' (Sefaria’s export of 2026-03-23)';
  }
  return { path: p, json: JSON.parse(text), url: page, pin };
}

/* ------------------------------------------------------------ cleaning */
function fixMalformed(s) {
  /* Radak on Psalms 17:8 (Leipzig): a footnote whose text ran into the class
     attribute, "<i class="footnote NOTE</i>. MORE">"; the NOTE is the footnote.
     The Midrash Rabbah 2022 English: a translator's "<variant reading: ...>" that an
     HTML parser turned into attributes ("<variant reading:="" shooters="">").
     Friedlander's Isaiah: a marker printed "sup&gt;9", "&lt;underline&gt;", and
     "&lt;ara/&gt;" where the Arabic was lost. Strickman's Genesis 20:16: a footnote
     whose "<i " and marker were lost, leaving ' class="footnote">'. */
  return s.replace(/<i class="footnote ([^"<]*?)<\/i>([^"]*)">/g, (m, note, rest) => '<i class="footnote">' + note + '</i>' + rest + '<i>')
    .replace(/(?<!<i )class="footnote">/g, '<i class="footnote">')
    .replace(/=""/g, '').replace(/(?:&lt;)?sup&gt;\d+/g, '').replace(/&lt;\/?underline&gt;/g, '').replace(/&lt;ara\/&gt;/g, '[Arabic]').replace(/&lt;(?=<sup)/g, '');
}
function stripFootnotes(s) {
  s = fixMalformed(String(s)).replace(/<sup class="footnote-marker">[\s\S]*?<\/sup>/g, '');
  let out = '', i = 0;
  while (i < s.length) {
    const k = s.indexOf('<i class="footnote"', i);
    if (k < 0) { out += s.slice(i); break; }
    out += s.slice(i, k);
    let depth = 0, j = k;
    while (j < s.length) {
      if (s.startsWith('<i', j) && /[\s>]/.test(s[j + 2] || '')) { depth++; j = s.indexOf('>', j) + 1 || s.length; continue; }
      if (s.startsWith('</i>', j)) { depth--; j += 4; if (depth === 0) break; continue; }
      j++;
    }
    i = j;
  }
  return out;
}
const TAGS = /<\/?(?:b|i|br|small|big|span|em|strong|sup|sub|u|p|div|img|font)(?:\s[^<>]*)?\/?>|<a\s+href[^>]*>|<\/a>/gi;
const ENT = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>', '&thinsp;': ' ', '&ndash;': '–', '&mdash;': '—' };
const EDITOR = /^\s*(?:ו?עיין|ו?עי?['׳]\s|ו?צ["״]ע|הגה["״]?ה|נ["״]א|ס["״]א|כ?צ["״]ל|ע["״]כ|גי['׳]|גירס|בדפוס|דפוס|בכ["״]י|כ["״]י\s|כך שמעתי|מהר["״]ז)|וצ["״]ע|הגה["״]?ה|ל['׳] רש["״]י|אינו ל['׳]/;
function clean(raw, hebrew) {
  let s = stripFootnotes(raw).replace(/<br\s*\/?>/gi, '\n').replace(TAGS, '');
  s = s.replace(/&[a-z]+;|&#39;/gi, m => ENT[m.toLowerCase()] ?? m).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (m, x) => String.fromCodePoint(parseInt(x, 16)))
    .replace(TAGS, '');                            // tags that were escaped ("&lt;i&gt;")
  s = s.replace(/[\u200E\u200F\u202A-\u202E]/g, '').replace(/([\u0591-\u05C7])\1+/g, '$1');
  if (hebrew) s = s.replace(/\(([^()]{1,400})\)/g, (m, inner) => EDITOR.test(inner) ? '[editor: ' + inner.trim() + ']' : m);
  return s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
const words = s => (String(s).match(/\S+/g) || []).length;
const PASS = { 'א': 'first reading', 'ב': 'second reading', 'ג': 'third reading' };
/* the lemma: a leading <b>...</b>, else a short opening phrase ended by "." or ":" */
function lemmaOf(raw) {
  let s = stripFootnotes(raw).replace(/^\s+/, '');
  let pass = '';
  const pm = s.replace(TAGS, '').match(/^\s*הפעם ה([אבג])['׳]/);
  if (pm) { pass = PASS[pm[1]]; s = s.replace(/^\s*(?:<[^>]+>)*\s*הפעם ה[אבג]['׳]\s*/, ''); }
  s = s.replace(/^(\s*(?:<[^>]+>)*)\s*\([\u05D0-\u05EA]{1,3}\)\s*/, '$1');      // an inline verse mark, "(טז)"
  let lem = '';
  const b = s.match(/^\s*<b>([\s\S]*?)<\/b>/);
  if (b) lem = b[1];
  else {
    const t = s.replace(TAGS, '');
    const m = t.match(/^([^.:\u05C3\n]{1,70}?)(?:[.:\u05C3]|\s[-–—](?=\s))/);
    if (m && words(m[1]) <= 6 && t.length > m[0].length + 3) lem = m[1];
  }
  lem = clean(lem, true).replace(/[.:\u05C3,;\s]+$/, '').replace(/^[\s—–-]+/, '');
  if (words(lem) > 12) lem = '';
  return { lemma: lem, pass };
}

/* ------------------------------------------------------------ Hebrew matching (the lemma check) */
const nz = s => String(s).replace(/<[^>]+>/g, ' ').replace(/[\u0591-\u05AF\u05BD\u05BF\u05C1\u05C2\u05C4-\u05C7]/g, '').replace(/[\u05B0-\u05BC]/g, '')
  .replace(/\u05BE/g, ' ').replace(/[^\u05D0-\u05EA\s'"״׳]/g, ' ').replace(/\s+/g, ' ').trim();
/* a word's skeleton: no quote marks, no vav or yod after the first letter (full
   and defective spellings meet: הנפילים and הנפלים) */
const skel = w => w.replace(/['"״׳]/g, '').replace(/(?!^)[וי]/g, '');
const lemmaWords = lem => nz(String(lem).split(',')[0]).split(' ').map(w => w.replace(/['"״׳]/g, '')).filter(w => w && !/^(וגו|וגומר|וכו|כו|גו)$/.test(w))
  .map(w => (w === 'ה' || w === 'יי') ? 'יהוה' : w.replace(/^אלקים$/, 'אלהים')).filter(w => w.length >= 2).slice(0, 3).map(skel);
function inVerse(lw, verse) {
  if (!verse || !lw.length) return false;
  const T = new Set(nz(verse).split(' ').map(skel));
  const TA = [...T];
  const hit = lw.filter(w => T.has(w) || TA.some(x => x.length > 2 && w.length > 2 && (x.endsWith(w) || w.endsWith(x)))).length;
  return hit >= Math.min(2, lw.length);
}
const HEB_NUM = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90, 'ק': 100 };
const heNum = s => [...s].reduce((a, c) => a + (HEB_NUM[c] || 0), 0);

/* ------------------------------------------------------------ the app's chapters */
function appChapters() {
  const corpus = require('../corpus');
  const out = [], seen = new Set();
  for (let d = 1; d <= 400; d++) {
    let day;
    try { day = corpus.dayOf('tanakh', d); } catch (e) { break; }
    if (!day || !day.units) break;
    day.units.forEach(u => {
      if (u.kind !== 'verse' || seen.has(u.ch)) return;
      seen.add(u.ch);
      const m = String(u.ch).match(/^(.+) (\d+)$/);
      if (!m || !FROM_APP[m[1]]) throw new Error('the app’s chapter "' + u.ch + '" names no known book');
      out.push({ label: u.ch, slug: slug(u.ch), book: FROM_APP[m[1]], c: +m[2], day: d });
    });
  }
  return out;
}

/* ------------------------------------------------------------ commentary arrays */
const body = t => Array.isArray(t) ? t : (t && Array.isArray(t[''])) ? t[''] : null;
const segList = x => (Array.isArray(x) ? x : x ? [x] : []).filter(s => typeof s === 'string' && s.replace(/<[^>]+>/g, '').trim());

/* the Hebrew and English of one spec as grid[c][v] = { he: [raw], en: [raw], moved: [...] } */
function specGrid(spec, heFiles, enFile, GRID, rep) {
  const grid = {};
  const cell = (c, v) => { grid[c] = grid[c] || {}; return (grid[c][v] = grid[c][v] || { he: [], en: [], moved: [] }); };
  heFiles.forEach(({ file, from, to }) => {
    const t = body(file.json.text);
    if (!t) throw new Error(spec.id + ' on ' + spec.book + ': the Hebrew has no verse grid');
    t.forEach((ch, ci) => {
      if ((from && ci + 1 < from) || (to && ci + 1 > to)) return;
      (ch || []).forEach((vs, vi) => { const L = segList(vs); if (L.length) cell(ci + 1, vi + 1).he.push(...L); });
    });
  });
  if (enFile) {
    const t = body(enFile.json.text);
    (t || []).forEach((ch, ci) => (ch || []).forEach((vs, vi) => { const L = segList(vs); if (L.length) cell(ci + 1, vi + 1).en.push(...L); }));
  }
  for (const m of MOVES.filter(m => m.id === spec.id && m.book === spec.book)) {
    const a = grid[m.from[0]] && grid[m.from[0]][m.from[1]];
    if (!a) throw new Error(spec.id + ' on ' + spec.book + ' ' + m.from.join(':') + ' is empty: Sefaria has fixed it, drop its MOVES entry');
    const b = cell(m.to[0], m.to[1]);
    b.he.push(...a.he); b.en.push(...a.en);
    delete grid[m.from[0]][m.from[1]];
    rep.fixes.push(NAME[spec.id] + ' on ' + spec.book + ' ' + m.from.join(':') + ' moved to ' + m.to.join(':'));
  }
  return grid;
}
/* LUMPED: split one verse's comments to the verses they mark */
function unlump(spec, grid, HEB, rep) {
  for (const L of LUMPED.filter(x => x.id === spec.id && x.book === spec.book)) {
    const [c, v] = L.at, x = grid[c] && grid[c][v];
    const mk = s => (stripFootnotes(s).replace(TAGS, '').match(/^\s*\(([\u05D0-\u05EA]{1,3})\)/) || [])[1];
    const first = x ? x.he.findIndex(s => mk(s)) : -1;
    if (first < 0) throw new Error(spec.book + ' ' + c + ':' + v + ': no inline verse marks any more: drop its LUMPED entry');
    const paired = x.en.length === x.he.length;
    const keepHe = x.he.slice(0, first), keepEn = paired ? x.en.slice(0, first) : x.en;
    let cur = v, moved = 0;
    for (let i = first; i < x.he.length; i++) {
      const m = mk(x.he[i]);
      if (m) cur = heNum(m);
      else {
        const lw = lemmaWords(lemmaOf(x.he[i]).lemma);
        if (!inVerse(lw, HEB[spec.book][c - 1][cur - 1]))
          for (const d of [1, 2]) if (cur + d <= v && inVerse(lw, HEB[spec.book][c - 1][cur + d - 1])) { cur += d; break; }
      }
      if (cur < 1 || cur > v) throw new Error(spec.book + ' ' + c + ':' + v + ': an inline mark points outside the passage (' + cur + ')');
      if (cur === v) { keepHe.push(x.he[i]); if (paired) keepEn.push(x.en[i]); continue; }
      const g = grid[c][cur] = grid[c][cur] || { he: [], en: [], moved: [] };
      g.moved.push({ he: x.he[i], en: paired ? x.en[i] : null, tag: L.tag });
      moved++;
    }
    x.he = keepHe; x.en = keepEn;
    rep.fixes.push(NAME[spec.id] + ' on ' + spec.book + ' ' + c + ':' + v + ': ' + moved + ' comments sent to the verses they mark' + (paired ? '' : ' (the English stays on ' + v + ', whole)'));
  }
}

/* ------------------------------------------------------------ Midrash links */
function parseTanakhRef(ref, GRID) {
  const m = String(ref).match(/^(.+?) (\d+)(?::(\d+))?(?:-(\d+)(?::(\d+))?)?$/);
  if (!m || !GRID[m[1]]) return { skip: 'other' };
  if (!m[3]) return { skip: 'chapter-level' };
  const book = m[1], c1 = +m[2], v1 = +m[3];
  let c2 = c1, v2 = v1;
  if (m[5]) { c2 = +m[4]; v2 = +m[5]; } else if (m[4]) v2 = +m[4];
  const out = [];
  for (let c = c1; c <= c2; c++) {
    const n = GRID[book][c - 1];
    if (!n) return { skip: 'off the grid' };
    for (let v = c === c1 ? v1 : 1; v <= (c === c2 ? v2 : n); v++) { if (v > n) return { skip: 'off the grid' }; out.push([c, v]); }
  }
  return { book, verses: out };
}
function parseRabbahRef(ref, r) {
  let m = String(ref).match(/^(.+?), Petichta (\d+)$/);
  if (m && m[1] === r) return { node: 'Petichta', ch: 0, p: +m[2], key: 'Petichta ' + m[2] };
  m = String(ref).match(/^(.+?) (\d+):(\d+)$/);
  if (m && m[1] === r) return { node: '', ch: +m[2], p: +m[3], key: m[2] + ':' + m[3] };
  return null;
}

/* ------------------------------------------------------------ build */
async function build(h) {
  const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  if (lock.archive !== SHA) throw new Error('tanakh-lock.json is for archive commit ' + lock.archive + ', not ' + SHA);
  const log = [];
  const rep = { fixes: [], mismatchVerses: {}, orphans: [], links: { calls: 0, skipped: {} }, lemma: {}, coverage: {}, sizes: [], trimmed: [], overCap: [], unplaced: {} };

  /* the verse grid, from the Hebrew Tanakh */
  const GRID = {}, HEB = {};
  for (const [b] of BOOKS) {
    const f = await loadFile(h, lock, tpath(b), log);
    HEB[b] = f.json.text;
    GRID[b] = f.json.text.map(ch => ch.length);
  }
  const chapters = appChapters();
  if (chapters.length !== 929) throw new Error('the app has ' + chapters.length + ' Tanakh chapters, expected 929');
  for (const [b] of BOOKS) {
    const mine = chapters.filter(x => x.book === b).map(x => x.c);
    if (mine.length !== GRID[b].length || mine.some((c, i) => c !== i + 1)) throw new Error(b + ': the app’s chapters (' + mine.length + ') do not match Sefaria’s (' + GRID[b].length + ')');
  }

  /* the commentaries */
  const S = specs();
  const built = {};                 // built[id][book] = { spec, grid, heFiles, enFile }
  for (const spec of S) {
    built[spec.id] = built[spec.id] || {};
    if (spec.excluded) { built[spec.id][spec.book] = { spec }; continue; }
    const heFiles = [];
    for (const x of spec.he) heFiles.push({ file: await loadFile(h, lock, cpath(spec.id, spec.book, 'Hebrew', x.ver), log), from: x.from, to: x.to });
    const enFile = spec.en ? await loadFile(h, lock, cpath(spec.id, spec.book, 'English', EN[spec.en].ver), log) : null;
    const grid = specGrid(spec, heFiles, enFile, GRID, rep);
    unlump(spec, grid, HEB, rep);
    Object.keys(grid).map(Number).filter(c => c > GRID[spec.book].length)
      .forEach(c => rep.orphans.push(NAME[spec.id] + ' on ' + spec.book + ' chapter ' + c + ' (no such chapter; left out)'));
    built[spec.id][spec.book] = { spec, grid, heFiles, enFile };
  }

  /* the Rabbot, and their links */
  const RB = {};
  for (const [r, name, book, how] of RABBOT) {
    const he = await loadFile(h, lock, rpath(r, 'Hebrew'), log), en = await loadFile(h, lock, rpath(r, 'English'), log);
    const nodes = Array.isArray(he.json.text) ? { '': he.json.text } : he.json.text;
    const enNodes = Array.isArray(en.json.text) ? { '': en.json.text } : en.json.text;
    RB[r] = { r, name, book, how, he, en, nodes, enNodes, links: [] };
    if (how !== 'links') continue;
    const refs = nodes[''].map((_, i) => [r.replace(/ /g, '_') + '.' + (i + 1), String(i + 1)]);
    if (nodes.Petichta) refs.push([r.replace(/ /g, '_') + ',_Petichta', 'petichta']);
    for (const [ref, tag] of refs) {
      const raw = await fetchText(h, LINKS_API + ref + '?with_text=0', 'tanakh-links-' + slug(r) + '-' + tag + '.json');
      rep.links.calls++;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error('links for ' + ref + ': ' + raw.slice(0, 120));
      arr.forEach(l => {
        if (l.category !== 'Tanakh') return;
        const t = parseTanakhRef(l.ref, GRID);
        if (t.skip) { if (t.skip !== 'other') rep.links.skipped[t.skip] = (rep.links.skipped[t.skip] || 0) + 1; return; }
        (l.anchorRefExpanded && l.anchorRefExpanded.length ? l.anchorRefExpanded : [l.anchorRef]).forEach(a => {
          const P = parseRabbahRef(a, r);
          if (!P) { rep.links.skipped['rabbah side not a paragraph'] = (rep.links.skipped['rabbah side not a paragraph'] || 0) + 1; return; }
          t.verses.forEach(([c, v]) => RB[r].links.push({ book: t.book, c, v, typed: l.type === 'midrash', P }));
        });
      });
    }
  }
  const rabText = (R, P, en) => {
    const n = (en ? R.enNodes : R.nodes)[P.node];
    if (!n) return '';
    const x = P.node === 'Petichta' ? n[P.p - 1] : (n[P.ch - 1] || [])[P.p - 1];
    return typeof x === 'string' ? x : '';
  };
  /* the chapter of its own book a paragraph opens on: the first "(Genesis 22:7)"
     in the English's first 400 characters, else the first "(בראשית כב, ז)" in the
     Hebrew's */
  const HE_BOOK = { Genesis: 'בראשית', Exodus: 'שמות', Leviticus: 'ויקרא', Numbers: 'במדבר', Deuteronomy: 'דברים', 'Song of Songs': 'שיר השירים', Ruth: 'רות', Lamentations: 'איכה', Ecclesiastes: 'קהלת', Esther: 'אסתר' };
  const opensMemo = new Map();
  function opensOn(R, P) {
    const k = R.r + '|' + P.key;
    if (opensMemo.has(k)) return opensMemo.get(k);
    let ch = null;
    const en = clean(rabText(R, P, true), false).slice(0, 400);
    const m = en.match(new RegExp('\\(' + R.book + ' (\\d+):(\\d+)'));
    if (m) ch = +m[1];
    else {
      const he = clean(rabText(R, P, false), true).slice(0, 400);
      const q = he.match(new RegExp('\\(' + HE_BOOK[R.book] + ' ([\\u05D0-\\u05EA"\'״׳]{1,5}), ?[\\u05D0-\\u05EA"\'״׳]{1,5}\\)'));
      if (q) ch = heNum(q[1].replace(/["'״׳]/g, ''));
    }
    opensMemo.set(k, ch);
    return ch;
  }
  /* the Midrash per chapter: { [r]: [{ P, verses:Set, typed:Set }] } */
  function midrashFor(book, c) {
    const out = [];
    for (const R of Object.values(RB)) {
      if (R.how === 'structure') {
        if (R.book !== book) continue;
        const ch = R.nodes[''][c - 1] || [];
        const items = [];
        ch.forEach((vs, vi) => (vs || []).forEach((x, pi) => {
          if (typeof x === 'string' && x.trim()) items.push({ P: { node: '', ch: c, v: vi + 1, p: pi + 1, key: c + ':' + (vi + 1) + ':' + (pi + 1), deep: true }, run: [vi + 1, vi + 1], also: [] });
        }));
        if (items.length) out.push({ R, items, how: 'structure' });
        continue;
      }
      const L = R.links.filter(l => l.book === book && l.c === c);
      if (!L.length) continue;
      const own = RAB_OF[book] === R.r;
      const typedParashot = new Set(L.filter(l => l.typed).map(l => l.P.node === 'Petichta' ? 'P' : l.P.ch));
      const byKey = new Map();
      L.forEach(l => { const k = l.P.key; if (!byKey.has(k)) byKey.set(k, { P: l.P, typed: new Set(), cited: new Set() }); (l.typed ? byKey.get(k).typed : byKey.get(k).cited).add(l.v); });
      const items = [];
      /* a citation link of the own Rabbah counts when the paragraph stands in a
         parasha that expounds this chapter (it has curated links into it, or one
         of its paragraphs linked here opens on it: that paragraph's first
         quotation of its own book is in this chapter), or is a Petichta and this
         is chapter 1; any other is a prooftext and is left out */
      const parOf = P => P.node === 'Petichta' ? 'P' : P.ch;
      const expounds = new Set(typedParashot);
      for (const it of byKey.values()) if (it.P.node !== 'Petichta' && opensOn(R, it.P) === c) expounds.add(parOf(it.P));
      for (const it of byKey.values()) {
        const par = parOf(it.P);
        const take = it.typed.size || (own && (expounds.has(par) || (it.P.node === 'Petichta' && c === 1)));
        if (!take) continue;
        const all = [...new Set([...it.typed, ...it.cited])].sort((a, b) => a - b);
        const anchor = it.typed.size ? Math.min(...it.typed) : all[0];
        let a = anchor, z = anchor;
        while (all.includes(a - 1)) a--;
        while (all.includes(z + 1)) z++;
        items.push({ P: it.P, run: [a, z], also: all.filter(v => v < a || v > z), typed: it.typed.size > 0 });
      }
      if (items.length) out.push({ R, items, how: 'links', own });
    }
    return out;
  }

  /* ---- packets */
  const dir = path.join(h.CACHE, 'tanakh');
  fs.mkdirSync(dir, { recursive: true });
  const placed = {};                // Rabbah paragraphs placed somewhere
  const cov = (id, b) => { rep.coverage[id] = rep.coverage[id] || {}; return (rep.coverage[id][b] = rep.coverage[id][b] || { verses: 0, comments: 0, withEnglish: 0, of: GRID[b].reduce((x, y) => x + y, 0) }); };
  const lem = (id, b) => { rep.lemma[id] = rep.lemma[id] || {}; return (rep.lemma[id][b] = rep.lemma[id][b] || { n: 0, hit: 0, near: 0, miss: [] }); };
  const licOf = f => {
    const l = f && f.json.license;
    if (!l || /unknown/i.test(l)) return 'no licence stated by Sefaria for this digitisation (the text itself is centuries old)';
    return /public domain/i.test(l) ? 'public domain' : l;
  };
  const enTag = (spec, enFile) => 'English (' + EN[spec.en].who + ', ' + licOf(enFile) + '): ';

  for (const ch of chapters) {
    const { book, c } = ch;
    const nV = GRID[book][c - 1];
    const lab = (a, b) => '[' + LABEL(book) + ' ' + c + ':' + a + (b && b !== a ? ' to ' + c + ':' + b : '') + '] ';
    const sources = [];
    for (const id of ORDER) {
      const B = built[id] && built[id][book];
      if (!B) continue;
      const spec = B.spec;
      if (spec.excluded) { sources.push({ id, name: NAME[id], edition: '—', url: 'https://www.sefaria.org/' + NAME[id].replace(/ /g, '_') + '_on_' + book.replace(/ /g, '_'), licence: '—', note: spec.excluded, parts: [] }); continue; }
      const notes = [];
      const heFile = (B.heFiles.find(x => (!x.from || c >= x.from) && (!x.to || c <= x.to)) || B.heFiles[0]).file;
      const parts = [];               // { base, he, en, tag }
      const row = B.grid[c] || {};
      let englishHere = 0, stopAt = null;
      if (id === 'rashi' && book === 'Job' && c >= JOB_RASHI_ENDS[0]) {
        stopAt = c === JOB_RASHI_ENDS[0] ? JOB_RASHI_ENDS[1] : 0;
        notes.push('Rashi’s own commentary on Job ends at 40:20, where an editor’s note says “from here on it is not Rashi’s wording” (the [editor: …] at 40:20); the comments printed from 40:21 on are left out.');
      }
      for (const v of Object.keys(row).map(Number).sort((a, b) => a - b)) {
        const x = row[v];
        if (stopAt !== null && v > stopAt) continue;
        if (v > nV) { rep.orphans.push(NAME[id] + ' on ' + book + ' ' + c + ':' + v + ' (' + x.he.length + ' comments, no such verse; left out)'); continue; }
        const paired = x.en.length && x.en.length === x.he.length;
        x.he.forEach((raw, i) => {
          const L = lemmaOf(raw);
          if (!L.lemma) {             // "lemma, gloss" (Presburg's Radak, Daat): taken only when the words are in the verse
            const cm = clean(raw, true).match(/^([^,.:\u05C3\n]{2,60}),/);
            if (cm && words(cm[1]) <= 7 && inVerse(lemmaWords(cm[1]), HEB[book][c - 1][v - 1])) L.lemma = cm[1].trim();
          }
          const st = lem(id, book); const lw = lemmaWords(L.lemma);
          if (lw.length && !L.pass) {
            st.n++;
            if (inVerse(lw, HEB[book][c - 1][v - 1])) st.hit++;
            else if ([-1, 1].some(d => inVerse(lw, HEB[book][c - 1][v - 1 + d]))) st.near++;
            else if (st.miss.length < 400) st.miss.push(c + ':' + v + ' ' + L.lemma);
          }
          parts.push({ base: lab(v) + (L.pass ? '(' + L.pass + ') ' : '') + L.lemma, he: clean(raw, true), en: paired ? clean(x.en[i], false) : '', tag: paired ? enTag(spec, B.enFile) : '' });
          if (paired) englishHere++;
        });
        if (x.en.length && !paired) {
          const e = x.en.map(s => clean(s, false)).join('\n');
          const lm = x.he.length ? '' : (x.en[0].match(/^\s*<b>([\s\S]*?)<\/b>/) || ['', ''])[1].replace(/<[^>]+>/g, '').trim();
          parts.push({ base: lab(v) + lm, he: '', en: e, tag: 'English (' + EN[spec.en].who + ', ' + licOf(B.enFile) + (x.he.length ? '), for the whole verse (the translation divides its comments differently from the Hebrew): ' : '): ') });
          englishHere++;
          rep.mismatchVerses[NAME[id] + ' on ' + book] = (rep.mismatchVerses[NAME[id] + ' on ' + book] || 0) + 1;
        }
        x.moved.forEach(m => {
          const L = lemmaOf(m.he);
          parts.push({ base: lab(v) + '(' + m.tag + ') ' + L.lemma, he: clean(m.he, true), en: m.en ? clean(m.en, false) : '', tag: m.en ? enTag(spec, B.enFile) : '' });
        });
        const cv = cov(id, book); cv.verses++; cv.comments += x.he.length + x.moved.length; cv.withEnglish += x.en.length ? 1 : 0;
      }
      if (MOVES.some(m => m.id === id && m.book === book && m.to[0] === c)) notes.push(MOVES.filter(m => m.id === id && m.book === book && m.to[0] === c).map(m => 'Sefaria files a comment of his under ' + m.from.join(':') + ', a verse that does not exist; its lemma is in ' + m.to.join(':') + ', where it is given.').join(' '));
      LUMPED.filter(L => L.id === id && L.book === book && L.at[0] === c).forEach(L => notes.push('Comments marked “(' + L.tag + ')” are printed in the editions after ' + L.at.join(':') + ' with the verse numbers inline; each is given here on its own verse.'));
      if (id === 'ibn-ezra' && book === 'Exodus') notes.push('This is Ibn Ezra’s long commentary on Exodus, the one in the Mikraot Gedolot; his short commentary is a separate work and is not in this packet.');
      if (id === 'ibn-ezra' && book === 'Esther') notes.push('Ibn Ezra wrote on Esther twice; this is the text of the Mikraot Gedolot tradition (Kol Sason, 1840). The other recension is not in this packet.');
      if (id === 'ibn-ezra' && book === 'Song of Songs') notes.push('Ibn Ezra reads the Song three times: the words, the plain sense of the story, and its meaning for Israel. His headings הפעם הא׳, הב׳, הג׳ are shown as (first reading), (second reading), (third reading).');
      if (id === 'rashbam' && book === 'Genesis' && !parts.length) notes.push('His commentary on the opening chapters of Genesis survives only in part.');
      if (!spec.en) notes.push('Hebrew only: Sefaria has no complete English of ' + NAME[id] + ' on ' + book + '.');
      else if (parts.length && !englishHere) notes.push('The English (' + EN[spec.en].who + ') does not cover this chapter: Hebrew only here.');
      if (!parts.length && stopAt !== 0) notes.push('No comment on this chapter in this edition.');
      if (parts.some(p => /\[editor: /.test(p.he))) notes.push('[editor: …] marks an editor’s parenthetical remark in the Hebrew; the parentheses giving a scripture reference are the printers’.');
      if (heFile.fellBackFrom) notes.push('The bucket copy pinned in the lock is gone, so the archive’s “On Your Way New” is used; it runs Exodus 6:2 and 6:3 together.');
      const heV = heFile.json.versionTitle, enV = B.enFile ? B.enFile.json.versionTitle : null;
      sources.push({
        id, name: NAME[id],
        edition: heFile.pin + ': Sefaria’s “' + NAME[id] + ' on ' + book + '”, Hebrew “' + heV + '”' + (enV ? ', English “' + enV + '”' : ''),
        url: heFile.url,
        licence: 'Hebrew: ' + licOf(heFile) + (B.enFile ? '; English: ' + licOf(B.enFile) : ''),
        note: notes.join(' '), parts
      });
    }

    /* the Midrash */
    const mids = midrashFor(book, c);
    if (!mids.length) {
      const own = RAB_OF[book];
      sources.push({ id: 'midrash', name: own ? RB[own].name : 'the Midrash', edition: own ? RB[own].he.pin : '—', url: own ? RB[own].he.url : 'https://www.sefaria.org/texts/Midrash', licence: '—',
        note: own ? 'No paragraph of ' + RB[own].name + ' is linked to this chapter in Sefaria’s links.'
          : 'The Midrash Rabbah has no volume on ' + APP[book] + ', and no Rabbah paragraph is linked here as expounding it. Other collections (Midrash Tehillim, the Mekhilta, Sifra, Sifre) are not in the packets and not on the roster.', parts: [] });
    }
    for (const M of mids) {
      const R = M.R, parts = [];
      M.items.sort((a, b) => a.run[0] - b.run[0] || (b.typed ? 1 : 0) - (a.typed ? 1 : 0) || String(a.P.key).localeCompare(String(b.P.key), 'en', { numeric: true }));
      for (const it of M.items) {
        const P = it.P;
        const heRaw = P.deep ? ((R.nodes[''][P.ch - 1] || [])[P.v - 1] || [])[P.p - 1] : rabText(R, P, false);
        const enRaw = P.deep ? (((R.enNodes[''] || [])[P.ch - 1] || [])[P.v - 1] || [])[P.p - 1] : rabText(R, P, true);
        if (!heRaw && !enRaw) continue;
        const ref = R.name + (P.node === 'Petichta' ? ', Petichta ' + P.p : ' ' + P.key);
        placed[R.r + '|' + P.key] = true;
        parts.push({ base: lab(it.run[0], it.run[1]) + ref, he: heRaw ? clean(heRaw, true) : '', en: enRaw ? clean(enRaw, false) : '', tag: 'English (' + EN.mr2022.who + ', ' + licOf(R.en) + '): ' });
        it.also.forEach(v => parts.push({ base: lab(v) + ref, he: '', en: '', tag: '', pointer: '(see ' + ref + ', printed under ' + LABEL(book) + ' ' + c + ':' + it.run[0] + (it.run[1] !== it.run[0] ? ' to ' + c + ':' + it.run[1] : '') + ')' }));
      }
      parts.sort((a, b) => { const va = +a.base.match(/:(\d+)/)[1], vb = +b.base.match(/:(\d+)/)[1]; return va - vb; });
      const note = M.how === 'structure'
        ? R.name + ' is divided by the book’s own chapter and verse; each paragraph is given on the verse Sefaria files it under.'
        : 'Placed by Sefaria’s links: first its curated “midrash” links (the verse a paragraph expounds)'
          + (M.own ? ', then its citation links from the parashot that expound this chapter (those with curated links into it, or with a paragraph that opens on it, by its first quotation of ' + APP[book] + '), and from the Petichta on chapter 1; a citation from elsewhere is only a prooftext and is left out' : '')
          + '. A paragraph is printed once, on its run of verses; a seg that reads “(see …)” points to it from another verse it cites.';
      sources.push({ id: 'midrash', name: R.name, edition: R.he.pin + ': Sefaria’s “' + R.r + '”, Hebrew “' + R.he.json.versionTitle + '” (Torat Emet), English “' + R.en.json.versionTitle + '”',
        url: R.he.url, licence: 'Hebrew: ' + licOf(R.he) + '; English: ' + licOf(R.en), note, parts });
    }

    /* the word cap: trim the longest parts, 400 words first, shorter only if that is not enough */
    const all = sources.flatMap(s => s.parts);
    const count = () => all.reduce((a, p) => a + words(p.base) + words(p.he) + words(p.en) + words(p.tag) + words(p.pointer || ''), 0);
    let total = count(), trimTo = 0;
    const before = total;
    if (total > WORD_CAP) {
      for (const L of TRIM_STEPS) {
        const pieces = [];
        all.forEach(p => ['he', 'en'].forEach(k => { const n = words(p[k]); if (n > L) pieces.push({ p, k, n }); }));
        pieces.sort((a, b) => b.n - a.n);
        for (const x of pieces) {
          if (total <= WORD_CAP) break;
          x.p[x.k] = x.p[x.k].replace(/\s+\[…\]$/, '').split(/\s+/).slice(0, L).join(' ') + ' […]';
          total -= x.n - L - 1;
          trimTo = L;
        }
        total = count();
        if (total <= WORD_CAP) break;
      }
      rep.trimmed.push(ch.slug + ' ' + before + '→' + total + ' (' + trimTo + ')');
      if (total > WORD_CAP) rep.overCap.push(ch.slug + ' ' + total);
    }
    const packet = {
      plan: 'tanakh', ch: ch.slug,
      sources: sources.map(s => {
        const o = { id: s.id, name: s.name, edition: s.edition, url: s.url, licence: s.licence };
        const trimmedHere = s.parts.some(p => /\s\[…\]$/.test(p.he) || /\s\[…\]$/.test(p.en));
        const note = [s.note, trimmedHere ? 'This chapter’s commentary runs past ' + WORD_CAP + ' words, so its longest comments are cut, the Hebrew and the English each, to their first ' + trimTo + ' words, marked […]; the full text is at the url.' : ''].filter(Boolean).join(' ');
        if (note) o.note = note;
        o.segs = s.parts.map(p => ({ base: p.base.replace(/\s+$/, ' '), comm: p.pointer || [p.he, p.en ? p.tag + p.en : ''].filter(Boolean).join('\n') }));
        return o;
      })
    };
    fs.writeFileSync(path.join(dir, ch.slug + '.json'), JSON.stringify(packet, null, 1), 'utf8');
    rep.sizes.push({ slug: ch.slug, words: total, before });
  }

  /* Rabbah paragraphs never placed */
  for (const R of Object.values(RB)) {
    let n = 0, un = 0;
    const walk = (node, key) => (R.nodes[node] || []).forEach((a, i) => {
      if (node === 'Petichta') { if (typeof a === 'string' && a.trim()) { n++; if (!placed[R.r + '|Petichta ' + (i + 1)]) un++; } return; }
      (a || []).forEach((b, j) => {
        if (Array.isArray(b)) b.forEach((x, k) => { if (typeof x === 'string' && x.trim()) { n++; if (!placed[R.r + '|' + (i + 1) + ':' + (j + 1) + ':' + (k + 1)]) un++; } });
        else if (typeof b === 'string' && b.trim()) { n++; if (!placed[R.r + '|' + (i + 1) + ':' + (j + 1)]) un++; }
      });
    });
    Object.keys(R.nodes).forEach(k => walk(k));
    rep.unplaced[R.name] = un + ' of ' + n;
  }

  /* summary */
  const W = rep.sizes.map(s => s.words).sort((a, b) => a - b), q = p => W[Math.min(W.length - 1, Math.floor(p * W.length))];
  console.log('  tanakh: ' + chapters.length + ' packets written to .scripts/.cache/teachings/tanakh/ (words per packet: median ' + q(0.5) + ', 90th percentile ' + q(0.9) + ', max ' + W[W.length - 1]
    + '; ' + rep.trimmed.length + ' trimmed to the ' + WORD_CAP + '-word cap' + (rep.overCap.length ? ', ' + rep.overCap.length + ' still over it' : '') + ')');
  console.log('  links: ' + rep.links.calls + ' calls; skipped ' + JSON.stringify(rep.links.skipped) + '; Rabbah paragraphs not placed on any chapter: ' + Object.entries(rep.unplaced).map(([k, v]) => k + ' ' + v).join(', '));
  console.log('  fixes: ' + rep.fixes.join('; '));
  if (rep.orphans.length) console.log('  left out (no such verse): ' + rep.orphans.join('; '));
  const mm = Object.entries(rep.mismatchVerses);
  if (mm.length) console.log('  verses whose English divides differently (given whole): ' + mm.map(([k, v]) => k + ' ' + v).join(', '));
  const lemmaLines = [];
  for (const [id, byBook] of Object.entries(rep.lemma)) {
    let n = 0, hit = 0, near = 0;
    Object.values(byBook).forEach(x => { n += x.n; hit += x.hit; near += x.near; });
    const worst = Object.entries(byBook).filter(([, x]) => x.n >= 30 && (x.n - x.hit - x.near) / x.n > 0.2).map(([b, x]) => b + ' ' + Math.round(100 * (x.n - x.hit - x.near) / x.n) + '%');
    lemmaLines.push(NAME[id] + ' ' + (n ? Math.round(100 * hit / n) : 0) + '% in their verse, ' + (n ? (100 * near / n).toFixed(1) : 0) + '% next door' + (worst.length ? ' (most misses: ' + worst.join(', ') + ')' : ''));
  }
  console.log('  lemma check (reports only): ' + lemmaLines.join('; '));
  if (log.length) console.log('  ' + log.join('\n  '));
  return rep;
}

/* every file the build reads, for the lock */
function files() {
  const out = new Set();
  BOOKS.forEach(([b]) => out.add(tpath(b)));
  specs().forEach(s => { if (s.excluded) return; s.he.forEach(x => out.add(cpath(s.id, s.book, 'Hebrew', x.ver))); if (s.en) out.add(cpath(s.id, s.book, 'English', EN[s.en].ver)); });
  RABBOT.forEach(([r]) => { out.add(rpath(r, 'Hebrew')); out.add(rpath(r, 'English')); });
  return [...out];
}

module.exports = { build, files, cacheName, SHA, _test: { clean, stripFootnotes, lemmaOf, lemmaWords, inVerse, parseTanakhRef, specs } };
