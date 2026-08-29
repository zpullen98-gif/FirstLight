/* Parse every js/*.js without executing it.

   ~20 files share one global scope and load in a fixed order, so a stray apostrophe
   in data-year.js surfaces at runtime as "MONTHS is not defined" three files later.
   This finds the real error, in the real file, at the real line.

   Usage: node .scripts/check-syntax.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsDir = path.join(__dirname, '..', 'js');
let failed = 0, checked = 0;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name.endsWith('.js') ? [p] : [];
  });
}

for (const file of walk(jsDir).sort()) {
  const rel = path.relative(path.join(__dirname, '..'), file);
  const src = fs.readFileSync(file, 'utf8');
  try {
    /* Compiles and throws on a syntax error, but never runs the code — so no
       browser globals are needed and nothing has side effects. */
    new vm.Script(src, { filename: rel });
    checked++;
  } catch (err) {
    failed++;
    console.error('\n  ' + rel);
    console.error('    ' + err.message);
    if (err.stack) {
      const line = err.stack.split('\n').find(l => l.includes(rel));
      if (line) console.error('    ' + line.trim());
    }
  }
}

/* The service worker and the shell's script tags must agree, or the app works
   online and breaks offline — the failure mode that is hardest to notice. */
const swSrc = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const htmlSrc = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const inSW = new Set((swSrc.match(/'\.\/js\/[^']+'/g) || []).map(s => s.slice(3, -1)));
const inHTML = new Set((htmlSrc.match(/src="(js\/[^"?]+)/g) || []).map(s => s.slice(5)));

const missingFromSW = [...inHTML].filter(f => !inSW.has(f));
const missingFromHTML = [...inSW].filter(f => !inHTML.has(f));

if (missingFromSW.length) {
  failed++;
  console.error('\n  sw.js is missing files that index.html loads (these break offline):');
  missingFromSW.forEach(f => console.error('    ' + f));
}
if (missingFromHTML.length) {
  console.warn('\n  sw.js precaches files index.html does not load (harmless, but dead weight):');
  missingFromHTML.forEach(f => console.warn('    ' + f));
}

/* Every ASSETS entry must exist on disk — a renamed icon or font typo becomes
   a precache 404 that nothing else catches (script tags have index parity;
   fonts and icons do not). */
const assetsBlock = (swSrc.match(/const ASSETS = \[([\s\S]*?)\];/) || [null, ''])[1];
for (const m of assetsBlock.match(/'\.\/[^']+'/g) || []) {
  const rel = m.slice(3, -1);
  if (!rel) continue;
  if (!fs.existsSync(path.join(__dirname, '..', rel))) {
    failed++;
    console.error('\n  sw.js ASSETS names a file that does not exist: ' + rel);
  }
}

/* The two halves of the texts-cache contract must agree: FL_TEXT_V stamps the
   request URLs, TEXT_CACHE names where they land. */
const tvMatch = swSrc.match(/firstlight-texts-v(\d+)/);
const storeSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'text-store.js'), 'utf8');
const fvMatch = storeSrc.match(/FL_TEXT_V\s*=\s*(\d+)/);
if (tvMatch && fvMatch && tvMatch[1] !== fvMatch[1]) {
  failed++;
  console.error('\n  TEXT_CACHE is firstlight-texts-v' + tvMatch[1] +
    ' but FL_TEXT_V is ' + fvMatch[1] + ' — the texts cache contract is split.');
}

/* A committed content change without a CACHE bump is a deploy installed
   clients never receive. Anchor = the last commit touching sw.js (bumps live
   there); uncommitted work is exempt — the bump belongs in the same commit.
   Skipped cleanly where git is unavailable. */
try {
  const cp = require('child_process');
  const run = (cmd) => cp.execSync(cmd, { cwd: path.join(__dirname, '..'), encoding: 'utf8' }).trim();
  const bumpCommit = run('git log -n 1 --format=%H -- sw.js');
  if (bumpCommit) {
    const cacheNow = (swSrc.match(/CACHE = '([^']+)'/) || [])[1];
    const cacheThen = (run('git show ' + bumpCommit + ':sw.js').match(/CACHE = '([^']+)'/) || [])[1];
    if (cacheNow && cacheNow === cacheThen) {
      const cached = new Set([...(assetsBlock.match(/'\.\/[^']+'/g) || [])].map(x => x.slice(3, -1)));
      cached.add('index.html');
      const changed = run('git diff --name-only ' + bumpCommit + ' HEAD').split('\n').filter(Boolean);
      const stale = changed.filter(f => cached.has(f));
      if (stale.length) {
        failed++;
        console.error('\n  committed since the last sw.js change but CACHE is still "' + cacheNow +
          '": ' + stale.join(', ') + ' — installed clients will never receive this.');
      }
    }
  }
} catch (e) { /* no git here — the other checks still hold the line */ }

if (failed) {
  console.error('\n' + failed + ' problem(s) across ' + (checked + failed) + ' files.\n');
  process.exit(1);
}
console.log(checked + ' js files parse clean; sw.js and index.html agree.');
