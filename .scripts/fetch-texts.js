/* Bake the scripture library into committed js/texts/*.js files.

   THIS IS AN AUTHORING TOOL, NOT A BUILD STEP. Run it by hand when a text is added
   or a source changes; its output is committed like any other data file. The app
   never runs it and never calls these upstreams.

   Why bake at all: the app originally fetched every passage live, per day, from four
   services. That breaks offline, and doing it in bulk breaks the sources' terms —
   bible-api.com caps 15 requests per 30 seconds and asks users not to download
   whole bibles; Sefaria directs bulk users to its exports. Every source used here is
   one the publisher offers for exactly this purpose, and every text is public domain.

   Usage:
     node .scripts/fetch-texts.js            # everything not already present
     node .scripts/fetch-texts.js bible      # one work
     node .scripts/fetch-texts.js --force    # refetch even if present

   Sources, and why each:
     bible    getbible.net v2      whole WEB in one request
     tanakh   Sefaria API v3       one request per book (39); their bulk-friendly path
     quran    alquran.cloud        whole Pickthall in one request
     dhammapada/gita/tao/analects/zhuangzi/upanishads
              Project Gutenberg    one plain-text request each
     rigveda  sacred-texts.com     1,028 hymn pages, crawled once at 1/sec
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'js', 'texts');
const CACHE = path.join(__dirname, '.cache');       // raw downloads, gitignored
const UA = 'FirstLight/1.0 (offline reading app; one-time text bake; contact via repo)';

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const only = args.filter(a => !a.startsWith('--'));

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Set by get() so callers can skip their politeness delay on a cache hit. Re-baking
   the Rig Veda after a parser change otherwise sleeps five seconds per hymn against
   files already on disk — eighty-five minutes to touch nothing. */
let lastFromCache = false;

async function get(url, { json = false, cacheKey = null, retries = 4 } = {}) {
  const cf = cacheKey ? path.join(CACHE, cacheKey) : null;
  if (cf && fs.existsSync(cf) && !FORCE) {
    const raw = fs.readFileSync(cf, 'utf8');
    lastFromCache = true;
    return json ? JSON.parse(raw) : raw;
  }
  lastFromCache = false;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip' } });
      /* A 429 is not an ordinary transient error and the usual doubling is too
         impatient for it — Wikimedia kept refusing through five escalating retries
         during the first Rig Veda crawl. Honour Retry-After when it is offered, and
         otherwise stand down for two minutes, which is what actually clears it. */
      if (res.status === 429) {
        const ra = parseInt(res.headers.get('retry-after') || '0', 10);
        await sleep(ra > 0 ? (ra + 2) * 1000 : 120000);
        throw new Error('HTTP 429');
      }
      if (res.status >= 500) throw new Error('HTTP ' + res.status);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      /* An empty body that parses cleanly is how Wikimedia and archive.org report
         throttling. Treat it as a failure, never as data. */
      if (!text || text.length < 40) throw new Error('suspiciously empty response');
      /* Wikimedia also throttles with a 200 and a plain-English sentence where JSON
         was expected. Name it, so the backoff below is obviously the right response
         rather than a mysterious parse error. */
      if (/^You are making too many requests/i.test(text)) throw new Error('rate-limited by the API');
      if (cf) fs.writeFileSync(cf, text);
      return json ? JSON.parse(text) : text;
    } catch (e) {
      lastErr = e;
      const wait = Math.min(30000, 1200 * Math.pow(2, attempt)) * (0.8 + Math.random() * 0.4);
      if (attempt < retries) await sleep(wait);
    }
  }
  throw lastErr;
}

/* ——— output ———
   One file per part, each a single call into the registry. Classic scripts, injected
   on demand; nothing here is precached by the service worker. */
function emit(work, part, payload, meta) {
  const dir = path.join(OUT, work);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, part + '.js');
  const body = 'FLTextPut(' + JSON.stringify(work) + ',' + JSON.stringify(part) + ',' +
               JSON.stringify(payload) + ');\n';
  fs.writeFileSync(file, body, 'utf8');
  return { part, bytes: Buffer.byteLength(body), ...(meta || {}) };
}

function manifest(work, data) {
  fs.writeFileSync(path.join(OUT, work, 'index.json'), JSON.stringify(data, null, 1), 'utf8');
}

const pad = n => String(n).padStart(2, '0');
const clean = s => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/* ═══════════════════════ THE BIBLE — World English Bible ═══════════════════════ */
async function bible() {
  console.log('  fetching the whole WEB in one request…');
  const all = await get('https://api.getbible.net/v2/web.json', { json: true, cacheKey: 'web-bible.json' });
  /* The whole-bible file is {translation, lang, …, books:[…]} — not a map of books.
     Reading it as a map yields metadata strings and a silent zero-book result. */
  const books = (all.books || []).filter(b => b && b.name && Array.isArray(b.chapters));
  if (books.length !== 66) throw new Error('expected 66 books, got ' + books.length);

  const idx = [];
  let chapters = 0, verses = 0;
  books.forEach((b, i) => {
    const ch = b.chapters.map(c => c.verses.map(v => clean(v.text)));
    chapters += ch.length;
    ch.forEach(c => { verses += c.length; });
    const r = emit('bible', pad(i + 1), { book: b.name, ch });
    idx.push({ part: pad(i + 1), book: b.name, chapters: ch.length, bytes: r.bytes });
  });
  manifest('bible', {
    title: 'The Bible', translation: 'World English Bible', license: 'Public domain',
    source: 'getbible.net', books: idx
  });
  return { books: books.length, chapters, verses };
}

/* ═══════════════════════ THE TANAKH — JPS 1917 via Sefaria ═══════════════════════ */
const TANAKH_ORDER = [
  ['Genesis','Torah'],['Exodus','Torah'],['Leviticus','Torah'],['Numbers','Torah'],['Deuteronomy','Torah'],
  ['Joshua','Prophets'],['Judges','Prophets'],['I Samuel','Prophets'],['II Samuel','Prophets'],
  ['I Kings','Prophets'],['II Kings','Prophets'],['Isaiah','Prophets'],['Jeremiah','Prophets'],
  ['Ezekiel','Prophets'],['Hosea','Prophets'],['Joel','Prophets'],['Amos','Prophets'],['Obadiah','Prophets'],
  ['Jonah','Prophets'],['Micah','Prophets'],['Nahum','Prophets'],['Habakkuk','Prophets'],
  ['Zephaniah','Prophets'],['Haggai','Prophets'],['Zechariah','Prophets'],['Malachi','Prophets'],
  ['Psalms','Writings'],['Proverbs','Writings'],['Job','Writings'],['Song of Songs','Writings'],
  ['Ruth','Writings'],['Lamentations','Writings'],['Ecclesiastes','Writings'],['Esther','Writings'],
  ['Daniel','Writings'],['Ezra','Writings'],['Nehemiah','Writings'],['I Chronicles','Writings'],
  ['II Chronicles','Writings']
];
const JPS = 'The Holy Scriptures: A New Translation (JPS 1917)';

async function tanakh() {
  const idx = [];
  let chapters = 0, verses = 0;
  for (let i = 0; i < TANAKH_ORDER.length; i++) {
    const [book, part] = TANAKH_ORDER[i];
    process.stdout.write('  ' + (i + 1) + '/' + TANAKH_ORDER.length + ' ' + book + '           \r');
    const url = 'https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(book) +
                '?version=english|' + encodeURIComponent(JPS);
    const j = await get(url, { json: true, cacheKey: 'tanakh-' + pad(i + 1) + '.json' });
    const v = j.versions && j.versions[0];
    if (!v || !Array.isArray(v.text)) throw new Error('no JPS text for ' + book);
    const ch = v.text.map(c => (Array.isArray(c) ? c : [c]).map(clean).filter(Boolean));
    chapters += ch.length;
    ch.forEach(c => { verses += c.length; });
    const r = emit('tanakh', pad(i + 1), { book, section: part, ch });
    idx.push({ part: pad(i + 1), book, section: part, chapters: ch.length, bytes: r.bytes });
    if (!lastFromCache) await sleep(700);   // polite; Sefaria asks bulk users to use their exports
  }
  process.stdout.write('                                          \r');
  manifest('tanakh', {
    title: 'The Hebrew Bible', translation: JPS, license: 'Public domain',
    source: 'Sefaria', books: idx
  });
  return { books: idx.length, chapters, verses };
}

/* ═══════════════════════ THE QUR'AN — Pickthall ═══════════════════════ */
async function quran() {
  console.log('  fetching the whole Pickthall in one request…');
  const j = await get('https://api.alquran.cloud/v1/quran/en.pickthall', { json: true, cacheKey: 'quran.json' });
  const surahs = j.data.surahs;
  if (surahs.length !== 114) throw new Error('expected 114 surahs, got ' + surahs.length);
  let ayahs = 0;
  const idx = [];
  surahs.forEach(s => {
    ayahs += s.ayahs.length;
    idx.push({ n: s.number, name: s.englishName, translation: s.englishNameTranslation,
               arabic: s.name, revelation: s.revelationType, ayahs: s.ayahs.length });
  });
  /* Small enough to ship whole — 114 files would be 114 network round trips for a
     text that fits comfortably in one. */
  const payload = surahs.map(s => ({
    n: s.number, name: s.englishName, tr: s.englishNameTranslation, ar: s.name,
    rev: s.revelationType, v: s.ayahs.map(a => clean(a.text))
  }));
  const r = emit('quran', 'all', payload);
  manifest('quran', {
    title: "The Qur'an", translation: 'Pickthall', license: 'Public domain',
    source: 'alquran.cloud', whole: true, bytes: r.bytes, surahs: idx
  });
  return { surahs: surahs.length, ayahs };
}

/* ═══════════════════════ Project Gutenberg plain-text works ═══════════════════════ */
async function gutenberg(id, cacheKey) {
  const raw = await get('https://www.gutenberg.org/cache/epub/' + id + '/pg' + id + '.txt',
                        { cacheKey });
  /* Strip the licence header and footer. The markers have been stable for years, but
     fall back to the whole file rather than returning nothing if they move. */
  const a = raw.indexOf('*** START OF TH');
  const b = raw.indexOf('*** END OF TH');
  const body = (a > -1 && b > a) ? raw.slice(raw.indexOf('\n', a) + 1, b) : raw;
  return body.replace(/\r\n/g, '\n');
}

/* Strip a page to plain lines. */
function lines(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#\d+;/g, '')
    .split('\n').map(s => s.trim()).filter(Boolean);
}

/* ═══════════════════════ THE RIG VEDA — Griffith ═══════════════════════
   1,028 hymns, one page each, crawled at roughly one per second. This is the only
   text in the library without a bulk source, and it is why this script exists as an
   authoring tool rather than something the app does: the crawl runs once, here, and
   the result is committed. The app never touches sacred-texts.com.

   The artifact's Rig Veda reader was entirely dead — it requested a Wikisource title
   that does not exist, so every Veda day in a year of use returned nothing, hidden
   behind a generic error. */
const RV_MANDALAS = [191, 43, 62, 58, 87, 75, 104, 103, 114, 191];

/* Wikisource, not sacred-texts.com. sacred-texts returns 403 to any non-browser
   User-Agent, and forging one to get around a block the operator clearly intended is
   not a thing to do for a convenience. Wikisource publishes the same Griffith
   translation and offers an API built for programmatic reading; Wikimedia's etiquette
   asks for a descriptive User-Agent and a modest rate, which is what this sends.

   The title pattern matters: "The Rig Veda/Mandala 1/Hymn 1" — what the artifact
   requested — does not exist and never did. Griffith is filed under "The Hymns of
   the Rigveda/Book N/Hymn M". Note the vocabulary shift: the URL says Book, the
   tradition says Mandala. Only the request is translated; the app says Mandala. */
const ENT = s => s
  .replace(/&#160;|&nbsp;/g, ' ').replace(/&#91;/g, '[').replace(/&#93;/g, ']')
  .replace(/&#8203;/g, '').replace(/&quot;/g, '"').replace(/&#39;|&#039;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/* Wikisource renders these proofread pages as structured poetry, and the structure is
   the only reliable handle. Stripping tags and reading line-by-line looks like it
   works and does not: the page opens with previous/next navigation, so hymn 40 picks
   up a heading reading "Hymn 39", and Griffith's footnote markers sit INSIDE the
   verse lines, so "[2]" lands mid-sentence and also parses as a verse number.

   So: read only .ws-poem-stanza blocks, take the number from .ws-poem-versenum, and
   drop <sup class="reference"> first. Verse 1 carries no versenum span — it is
   implied — which is why the counter falls back to position. */
function parseHymn(html) {
  const h = String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<sup[^>]*class="[^"]*reference[^"]*"[\s\S]*?<\/sup>/gi, '');

  const verses = [];
  const re = /<div class="ws-poem-stanza"[^>]*>([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(h))) {
    const block = m[1];
    const nm = block.match(/<span class="ws-poem-versenum">\s*(\d+)/);
    const text = ENT(block.replace(/<span class="ws-poem-versenum">[\s\S]*?<\/span>/, '')
                          .replace(/<[^>]+>/g, ' '))
                 .replace(/\s+/g, ' ').trim();
    if (!text) continue;
    verses.push({ n: nm ? +nm[1] : verses.length + 1, t: text });
  }

  /* Not every book was proofread the same way. Books 1–4 use the poem templates
     above; Book 5 onward is plain numbered prose with no poem markup at all, so the
     structured pass finds nothing. Fall back to reading "N. Text" lines.

     Anchor on the FIRST line that looks like verse 1 rather than trying to identify
     the header container: the page opens with previous/next navigation ("← Hymn 39
     … Hymn 41 →") and a Wikidata id, none of which match a numbered verse. Anchoring
     on the header markup instead is what produced the off-by-one heading earlier. */
  if (!verses.length) {
    const ls = ENT(h.replace(/<[^>]+>/g, '\n')).split('\n').map(s => s.trim()).filter(Boolean);

    /* Anchor on the LAST translator credit. Three different verse formats appear
       across the ten books — "1. COME thou" (Book 5), "1 YE Asvins" with no period
       (Book 1 Hymn 3), and the poem templates handled above — so anchoring on the
       shape of verse one is unreliable. The credit line sits immediately before the
       text in every plain-format page, and after the whole navigation header, which
       is what keeps "Hymn 39" out of Hymn 40. */
    let start = -1;
    for (let i = 0; i < ls.length; i++) if (/^Ralph\s+T\.?\s*H\.?\s+Griffith$/i.test(ls[i])) start = i;
    if (start > -1) {
      let cur = null;
      for (let i = start + 1; i < ls.length; i++) {
        const l = ls[i];
        if (/^(Retrieved from|Categor|This page was|←|→|About Wikisource)/i.test(l)) break;
        const vm = l.match(/^(\d{1,3})\.?\s+(.+)$/);
        if (vm) { cur = { n: +vm[1], t: vm[2] }; verses.push(cur); }
        else if (cur) cur.t += ' ' + l;
      }
      verses.forEach(v => { v.t = v.t.replace(/\s+/g, ' ').trim(); });
    }
  }

  /* The deity the hymn addresses — "Agni.", "Indra." — sits in a centred heading
     between the "HYMN I." rule and the poem. Nice to have, never load-bearing. */
  let deity = '';
  const head = h.indexOf('HYMN');
  if (head > -1) {
    const after = ENT(h.slice(head, head + 900).replace(/<[^>]+>/g, '\n'))
      .split('\n').map(s => s.trim()).filter(Boolean);
    for (let i = 1; i < after.length && i < 8; i++) {
      var cand = after[i];
      /* Reject ALL-CAPS lines. The first hymn of every mandala is preceded by the
         volume and book headings — "THE HYMNS OF THE RIGVEDA", "BOOK THE FIRST" —
         and without this guard hymn 1.1's deity reads "BOOK THE FIRST" instead of
         "Agni". Deity names are title case. */
      if (cand === cand.toUpperCase()) continue;
      if (/^[A-Z][A-Za-zāīūṛṇśṣḥṃñ' -]{2,40}\.?$/.test(cand) && !/^HYMN/i.test(cand)) {
        deity = cand.replace(/\.$/, ''); break;
      }
    }
  }
  return { deity, verses };
}

async function rigveda() {
  const idx = [];
  const failures = [];
  let hymnTotal = 0, verseTotal = 0;
  for (let m = 1; m <= 10; m++) {
    const hymns = [];
    for (let h = 1; h <= RV_MANDALAS[m - 1]; h++) {
      hymnTotal++;
      process.stdout.write('  mandala ' + m + '  hymn ' + h + '/' + RV_MANDALAS[m - 1] +
                           '   (' + hymnTotal + '/1028)        \r');
      const title = 'The Hymns of the Rigveda/Book ' + m + '/Hymn ' + h;
      /* maxlag is Wikimedia's own courtesy knob: it asks the API to refuse rather
         than add load when their replicas are lagging. Combined with the delay below
         and the backoff in get(), this keeps a 1,028-page crawl inside their
         etiquette. It still tripped the limiter at ~1 request/second during testing,
         which is why the pause is nearly two. */
      const url = 'https://en.wikisource.org/w/api.php?action=parse&page=' +
                  encodeURIComponent(title) + '&prop=text&format=json&formatversion=2&maxlag=5';
      const j = await get(url, { json: true, cacheKey: 'rv-' + pad(m) + '-' + String(h).padStart(3, '0') + '.json' });
      const parsed = (j.parse && j.parse.text) ? parseHymn(j.parse.text) : null;
      /* Wikimedia throttles with a well-formed response carrying nothing, so an
         empty parse is never data. But do not abandon a thirty-minute crawl over one
         odd page either: record it, keep going, and report the list at the end so
         the stragglers can be chased deliberately. */
      if (!parsed || !parsed.verses.length) {
        /* One real gap exists: Griffith exiled RV 1.179 — the Agastya and Lopāmudrā
           dialogue — to an appendix and rendered part of it in Latin, on Victorian
           grounds of decency, so the page carries an editor's note instead of a
           translation. Carry the note through rather than leaving a blank hymn: the
           reader is owed the reason, and the omission is itself worth knowing. */
        var note = '';
        if (j.parse && j.parse.text) {
          var nl = lines(j.parse.text).filter(function (l) { return /^\(/.test(l) && l.length > 30; });
          if (nl.length) note = nl[0].replace(/^\(|\)$/g, '').trim();
        }
        failures.push(m + '.' + h);
        hymns.push({ h, deity: '', v: [], note: note });
      } else {
        verseTotal += parsed.verses.length;
        hymns.push({ h, deity: parsed.deity, v: parsed.verses.map(v => v.t) });
      }
      /* Five seconds when we actually hit the network — 1.8s still earned a 429
         after fourteen hymns. Nothing at all on a cache hit, so re-baking after a
         parser change is instant instead of another eighty-five minutes. */
      if (!lastFromCache) await sleep(5000);
    }
    emit('rigveda', pad(m), { mandala: m, hymns });
    idx.push({ part: pad(m), mandala: m, hymns: hymns.length });
  }
  process.stdout.write('                                                        \r');
  manifest('rigveda', {
    title: 'The Rig Veda', translation: 'Ralph T. H. Griffith, 1896',
    license: 'Public domain', source: 'Wikisource', books: idx
  });
  if (failures.length) console.log('\n  ⚠ ' + failures.length + ' hymns yielded no verses: ' + failures.join(' '));
  return { mandalas: 10, hymns: hymnTotal, verses: verseTotal, empty: failures.length };
}

/* ═══════════════════════ THE DHAMMAPADA — Müller ═══════════════════════
   Gutenberg's plain text, which is cleaner than the Wikisource page the artifact
   scraped and does not need the paired-verse workaround: here the pairs are already
   separate lines. Verified against the canonical 423. */
async function dhammapada() {
  const body = await gutenberg(2017, 'dhammapada.txt');
  const ls = body.split('\n').map(s => s.trim());
  const chapters = [];
  let cur = null;
  let curVerse = null;
  for (const l of ls) {
    if (!l) { curVerse = null; continue; }
    /* Body headings read "Chapter I. The Twin-Verses" — title on the same line, and
       in ROMAN numerals. The table of contents at the top of the file uses Arabic
       ("Chapter 24: Thirst"), so requiring Roman is what keeps the TOC from being
       parsed as twenty-six empty chapters. */
    const ch = l.match(/^Chapter\s+([IVXLC]+)[.:]?\s*(.*)$/i);
    if (ch) { cur = { title: ch[2].replace(/\.$/, '').trim(), v: [] }; chapters.push(cur); curVerse = null; continue; }
    /* The second group is the whole game. Müller sets nine verse PAIRS as a single
       paragraph — "58, 59. As on a heap of rubbish…" — and a pattern that requires
       the digits to be followed directly by a period silently drops all eighteen.
       That is exactly the bug the artifact shipped: 405 of 423, with the missing
       verses rendering as "(verse unavailable)". */
    const m = l.match(/^(\d{1,3})(?:\s*[,–—-]\s*(\d{1,3}))?\.\s+(.*)$/);
    if (m && cur) {
      const from = +m[1], to = m[2] ? +m[2] : null;
      curVerse = { n: from, to: to, t: m[3] };
      cur.v.push(curVerse);
      continue;
    }
    if (curVerse) curVerse.t += ' ' + l;
  }
  /* Count the numbers covered, not the paragraphs: a pair is one paragraph and two
     verses, so paragraph-counting would report 414 and look like a different bug. */
  const all = chapters.flatMap(c => c.v);
  const covered = all.reduce((s, v) => s + (v.to ? v.to - v.n + 1 : 1), 0);
  if (covered !== 423) throw new Error('expected 423 verses, covered ' + covered + ' in ' + all.length + ' paragraphs');
  emit('dhammapada', 'all', chapters.map(c => ({
    title: c.title,
    v: c.v.map(x => [x.to ? x.n + '–' + x.to : x.n, x.t.replace(/\s+/g, ' ').trim()])
  })));
  manifest('dhammapada', {
    title: 'The Dhammapada', translation: 'F. Max Müller, 1881',
    license: 'Public domain', source: 'Project Gutenberg', whole: true,
    chapters: chapters.map(c => ({ title: c.title, verses: c.v.length }))
  });
  return { chapters: chapters.length, verses: all.length };
}

/* ═══════════════════════ prose and verse works ═══════════════════════
   The Bible, Tanakh, Qur'an and Rig Veda are verse-addressed: every line has a
   canonical number and the reading plans point at them. These four are not read that
   way, so they are stored as chapters of blank-line-separated blocks, each block
   keeping its own line breaks.

   Keeping the lines rather than joining them into paragraphs matters: Arnold's Gita
   and the poem sections of Legge's Tao Te Ching are verse, and flattening them into
   prose would silently destroy the lineation the translator chose. The renderer
   decides how to set each block by its average line length. */
function blocksOf(text) {
  return text.split(/\n\s*\n/)
    .map(b => b.split('\n').map(s => s.trim()).filter(Boolean))
    .filter(b => b.length);
}

/* The Bhagavad Gita — Sir Edwin Arnold, "The Song Celestial". 18 chapters. */
async function gita() {
  const body = await gutenberg(2388, 'gita.txt');
  /* Some chapter headings are indented and some are not; anchoring hard to column
     zero finds only the first and returns the whole poem as one chapter. The $ is
     what keeps "HERE ENDETH CHAPTER I. OF THE BHAGAVAD-GITA" from matching. */
  const parts = body.split(/^[ \t]*CHAPTER\s+([IVXLC]+)[ \t]*$/m);
  const chapters = [];
  for (let i = 1; i < parts.length; i += 2) {
    chapters.push({ n: chapters.length + 1, b: blocksOf(parts[i + 1]) });
  }
  if (chapters.length !== 18) throw new Error('expected 18 chapters, got ' + chapters.length);
  emit('gita', 'all', chapters);
  manifest('gita', {
    title: 'The Bhagavad Gita', translation: 'Sir Edwin Arnold, 1885',
    license: 'Public domain', source: 'Project Gutenberg', whole: true,
    chapters: chapters.map(c => ({ n: c.n, blocks: c.b.length }))
  });
  return { chapters: chapters.length, blocks: chapters.reduce((s, c) => s + c.b.length, 0) };
}

/* The Zhuangzi — Herbert Giles. 33 chapters. */
async function zhuangzi() {
  const body = await gutenberg(59709, 'zhuangzi.txt');
  const parts = body.split(/^CHAPTER\s+([IVXLC]+)\.\s*$/m);
  const chapters = [];
  for (let i = 1; i < parts.length; i += 2) {
    chapters.push({ n: chapters.length + 1, b: blocksOf(parts[i + 1]) });
  }
  if (chapters.length !== 33) throw new Error('expected 33 chapters, got ' + chapters.length);
  emit('zhuangzi', 'all', chapters);
  manifest('zhuangzi', {
    title: 'The Zhuangzi', translation: 'Herbert A. Giles, 1889',
    license: 'Public domain', source: 'Project Gutenberg', whole: true,
    chapters: chapters.map(c => ({ n: c.n, blocks: c.b.length }))
  });
  return { chapters: chapters.length, blocks: chapters.reduce((s, c) => s + c.b.length, 0) };
}

/* The Tao Te Ching — James Legge. 81 chapters across two parts. */
async function tao() {
  let body = await gutenberg(216, 'tao.txt');

  /* Legge labels only the first chapter "Ch. 1."; every one after it opens bare, as
     the chapter number followed by section 1 — "2. 1. All in the world know…". So
     there is exactly one "Ch." in the file, and splitting on it yields one chapter
     containing the whole book.

     The handle is the doubled number: a chapter opens "N. 1. ", a section inside a
     chapter opens with a single "N. ". Normalise chapter 1 to the same shape, strip
     the PART headings that would otherwise land mid-chapter, then walk the matches
     and check the numbers actually run 1 to 81 — which is the real proof that this
     found chapters rather than sentences that happen to start with a numeral. */
  body = body.replace(/^Ch\.\s*1\.\s*/m, '1. ').replace(/^PART\s+\d+\.\s*$/gm, '');

  /* Most chapters open "N. 1. …", but five (6, 11, 21, 24, 68) are entirely verse
     and open with the number alone on its line — which is also exactly how a verse
     SECTION inside a chapter opens. The two are indistinguishable by shape.

     What does distinguish them is order: the chapters run 1 to 81 with nothing
     skipped and nothing repeated. So walk the expected number forward, and for each
     take the first line-start occurrence of it after the previous chapter, requiring
     a blank line before it. A section numbered 3 inside chapter 1 cannot be mistaken
     for chapter 3, because by then the scan is already looking for chapter 2. */
  const marks = [];
  let pos = 0;
  for (let n = 1; n <= 81; n++) {
    /* The number alone is not enough to tell a chapter from a section: chapter 1
       contains a section numbered 2, and a scan looking for "2." finds that first,
       swallowing chapter 2 into chapter 1. Legge's typography is what separates
       them — chapters are preceded by a BLANK LINE GAP of two, sections by one — so
       require \n\n\n. Chapter 1 is matched at the very start of the body instead. */
    const re = n === 1
      ? new RegExp('^[ \\t]*1\\.(\\s)', 'm')
      : new RegExp('\\n\\n\\n+[ \\t]*' + n + '\\.(\\s)', 'g');
    re.lastIndex = pos;
    const m = re.exec(body);
    if (!m) throw new Error('could not find the start of chapter ' + n);
    const at = m.index + (m[0].length - m[0].replace(/^\n+/, '').length);
    marks.push({ n: n, at: at, end: at + String(n).length + 1 });
    pos = marks[marks.length - 1].end;
  }

  const chapters = marks.map((mk, i) => ({
    n: mk.n,
    b: blocksOf(body.slice(mk.end, i + 1 < marks.length ? marks[i + 1].at : undefined))
  }));
  if (chapters.length !== 81) throw new Error('expected 81 chapters, got ' + chapters.length);
  const empty = chapters.filter(c => !c.b.length).map(c => c.n);
  if (empty.length) throw new Error('empty chapters: ' + empty.join(', '));
  emit('tao', 'all', chapters);
  manifest('tao', {
    title: 'The Tao Te Ching', translation: 'James Legge, 1891',
    license: 'Public domain', source: 'Project Gutenberg', whole: true,
    chapters: chapters.map(c => ({ n: c.n, blocks: c.b.length }))
  });
  return { chapters: chapters.length, blocks: chapters.reduce((s, c) => s + c.b.length, 0) };
}

/* The Analects — James Legge. 20 books, each of numbered chapters. Legge prints the
   first as "CHAPTER I." and the rest as "CHAP. II." onward, so the pattern has to
   accept both or every book collapses to a single chapter. */
async function analects() {
  const body = await gutenberg(3330, 'analects.txt');
  const bookParts = body.split(/^BOOK\s+([IVXLC]+)\.\s*(.*)$/m);
  const books = [];
  for (let i = 1; i < bookParts.length; i += 3) {
    const title = (bookParts[i + 1] || '').trim();
    const chunks = bookParts[i + 2].split(/^\s*CHAP(?:TER)?\.?\s+([IVXLC]+)\.\s*/m);
    const chapters = [];
    for (let k = 1; k < chunks.length; k += 2) {
      chapters.push({ n: chapters.length + 1, b: blocksOf(chunks[k + 1]) });
    }
    if (chapters.length) books.push({ n: books.length + 1, title, ch: chapters });
  }
  if (books.length !== 20) throw new Error('expected 20 books, got ' + books.length);
  emit('analects', 'all', books);
  manifest('analects', {
    title: 'The Analects', translation: 'James Legge, 1893',
    license: 'Public domain', source: 'Project Gutenberg', whole: true,
    chapters: books.map(b => ({ n: b.n, title: b.title, chapters: b.ch.length }))
  });
  return { books: books.length, chapters: books.reduce((s, b) => s + b.ch.length, 0) };
}

/* Three Upanishads — Swami Paramananda.

   NOT "the Upanishads". Paramananda's volume carries three: Isa, Katha and Kena.
   Shipping it under the general title would misrepresent it, so the library calls it
   what it is. They are, at least, three of the most quoted — Isa is the shortest and
   most anthologised, Katha holds the Nachiketa dialogue and "the Self is not born,
   nor does it die", and Kena is the one about that which the mind cannot think.

   His commentary is kept rather than stripped. It is interleaved with the verses by
   design — the book is "translated and commentated" — and a reader coming to the
   Upanishads cold is better served by it than by bare aphorisms. The manifest names
   the arrangement so nobody mistakes the commentary for scripture.

   Wikisource was checked first for Müller's fuller Sacred Books of the East set; its
   Upanishads are scattered redirect stubs rather than transcribed texts. */
async function upanishads() {
  const body = await gutenberg(3283, 'upanishads.txt');
  const ls = body.split('\n');
  const names = ['Isa', 'Katha', 'Kena'];

  /* Each title appears twice — once heading the introduction, once heading the text.
     Take the LAST occurrence, which is where the Upanishad itself begins. */
  const starts = names.map(n => {
    let at = -1;
    ls.forEach((l, i) => { if (new RegExp('^\\s{10,}' + n + '-Upanishad\\s*$').test(l)) at = i; });
    return { name: n, at };
  });
  if (starts.some(s => s.at < 0)) throw new Error('could not locate all three Upanishads');
  starts.sort((a, b) => a.at - b.at);

  const chapters = starts.map((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].at : ls.length;
    const text = ls.slice(s.at + 1, end).join('\n');
    return { n: i + 1, title: s.name + '-Upanishad', b: blocksOf(text) };
  });

  const blocks = chapters.reduce((t, c) => t + c.b.length, 0);
  if (chapters.length !== 3 || blocks < 100) {
    throw new Error('parsed ' + chapters.length + ' upanishads / ' + blocks + ' blocks — too few');
  }

  emit('upanishads', 'all', chapters);
  manifest('upanishads', {
    title: 'Three Upanishads',
    translation: 'Swami Paramananda — Isa, Katha and Kena, with his commentary',
    license: 'Public domain', source: 'Project Gutenberg', whole: true,
    chapters: chapters.map(c => ({ n: c.n, title: c.title, blocks: c.b.length }))
  });
  return { upanishads: chapters.length, blocks };
}

module.exports = { get, emit, manifest, gutenberg, clean, pad, sleep, lines, parseHymn, OUT };

/* ═══════════════════════ runner ═══════════════════════ */
const WORKS = { bible, tanakh, quran, dhammapada, rigveda, gita, zhuangzi, tao, analects, upanishads };

/* Guard the runner: without it, `require`-ing this file to reuse a helper silently
   re-runs every fetch in the library. */
if (require.main !== module) return;

(async () => {
  const names = only.length ? only : Object.keys(WORKS);
  for (const name of names) {
    if (!WORKS[name]) { console.log('unknown work: ' + name); continue; }
    const t0 = Date.now();
    console.log('\n' + name);
    try {
      const stats = await WORKS[name]();
      const dir = path.join(OUT, name);
      const total = fs.readdirSync(dir).filter(f => f.endsWith('.js'))
        .reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
      console.log('  ✓ ' + JSON.stringify(stats) +
                  '  →  ' + (total / 1048576).toFixed(2) + ' MB in ' +
                  fs.readdirSync(dir).filter(f => f.endsWith('.js')).length + ' files' +
                  '  (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
    } catch (e) {
      console.error('  ✗ ' + name + ' failed: ' + e.message);
      process.exitCode = 1;
    }
  }
})();
