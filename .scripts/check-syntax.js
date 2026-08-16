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

if (failed) {
  console.error('\n' + failed + ' problem(s) across ' + (checked + failed) + ' files.\n');
  process.exit(1);
}
console.log(checked + ' js files parse clean; sw.js and index.html agree.');
