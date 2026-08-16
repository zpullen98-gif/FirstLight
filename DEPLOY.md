# Deploying First Light

Target: `https://zpullen98-gif.github.io/FirstLight/`, deploy-from-branch, no build.

## Before every deploy

1. `node .scripts/check-syntax.js` — must print clean. It also verifies `sw.js` and
   `index.html` agree on the file list.
2. Bump `?v=N` on any changed asset URL in `index.html`.
3. **Bump `CACHE` in `sw.js`** — `firstlight-v1` → `firstlight-v2`. Skipping this is
   why a deploy "doesn't show up": the old cache keeps serving the old files.
4. Load `http://127.0.0.1:8633/?nosw` and click through all eight views.
5. Stop the server, reload, click through again. Anything that breaks is a file
   missing from `ASSETS`.

## First-time setup

```bash
cd C:/Users/zpull/FirstLight
git init -b main
git add -A
git commit -m "First Light — Phase 1: a real app"
gh repo create FirstLight --public --source=. --push
```

Then in the repository's **Settings → Pages**, set Source to *Deploy from a branch*,
branch `main`, folder `/ (root)`. There is no workflow file and no `docs/` folder —
the repo root is the site.

Branch is **`main`**. The sibling repos disagree (`BartendersLedger` is `main`,
`SommeliersCodex` is `master`) and that inconsistency has cost time before.

`.nojekyll` is at the root. It is empty and it is free insurance: without it, GitHub
Pages runs Jekyll, which ignores files and directories beginning with an underscore.

## After the first deploy — verify the shared origin

`zpullen98-gif.github.io` is **one origin** for every project on the account, and
Cache Storage is per-origin. `sw.js` only deletes cache keys beginning `firstlight-`
for exactly this reason.

Confirm it held:

1. Load `https://zpullen98-gif.github.io/FirstLight/` and let the worker install.
2. Go offline.
3. Load `https://zpullen98-gif.github.io/SommeliersCodex/` and
   `https://zpullen98-gif.github.io/BartendersLedger/`.

Both must still work offline. If either does not, the reap is too broad — fix it
before deploying again, and re-visit each sibling online to rebuild its cache.

## If something breaks

| Symptom | Cause |
|---|---|
| Changes don't appear after deploy | `CACHE` not bumped in `sw.js` |
| Works online, breaks offline | File in `index.html` but not in `sw.js`'s `ASSETS` |
| Blank page, "X is not defined" | Load order wrong in `index.html`, or a syntax error earlier in the chain — run `check-syntax.js` |
| A sibling PWA lost its offline mode | Cache reap not prefix-filtered to `firstlight-` |
| Fonts fall back to Georgia | `fonts/*.woff2` missing; `cache.addAll` rejects *wholesale* if one file 404s, so the worker never installs at all |
| Styles load but nothing renders | `registry.js` not loading before the `ui-*.js` files |
| Old behaviour persists after a hard reload | bfcache restored the old JS heap — try a unique query string, `?fresh=1` |
| Scripture fails but the app works | Expected until Phase 2 — the text is external and not yet cached |

## Icons

Regenerate with the script in the scratchpad if the palette ever changes; it needs no
image library. Sizes shipped: `icon.svg`, 192, 512, maskable-512, apple-touch-180.
The maskable keeps everything inside a 40%-radius safe zone, because the platform may
crop to a circle inscribed in 80% of the canvas.
