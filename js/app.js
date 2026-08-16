/* First Light — router, render loop, and boot.

   Loads last. Every ui-*.js file has already registered itself into FL_VIEWS by the
   time this runs, so the nav builds itself from that registry rather than from a
   list kept in two places.

   The artifact toggled a .hide class on seven <section> elements. That works until
   you want a URL: there was no way to link to the Vault, no back button, and an
   installed home-screen icon could only ever land on Today. This is a hash router
   writing into one <main>, which is the house pattern and also just what a reader
   expects a page to do. */

/* FL_VIEWS and FL_ACTS are declared in registry.js, which loads before the views. */

/* ——— escaping ———
   Every view builds HTML by string concatenation, so anything the reader typed —
   a journal entry, a city name — must pass through here. The artifact never
   interpolated user input, so it got away without one; this app has a journal. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ——— announcements and toasts ——— */
function announce(msg) {
  var el = document.getElementById('live');
  if (!el) return;
  /* Clearing first forces the change; setting the same text twice is otherwise
     silent in most screen readers. */
  el.textContent = '';
  setTimeout(function () { el.textContent = msg; }, 60);
}

var flToastTimer = null;
function toast(msg, ms) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('on');
  if (flToastTimer) clearTimeout(flToastTimer);
  flToastTimer = setTimeout(function () { el.classList.remove('on'); }, ms || 5200);
}

/* The one message the artifact could never send: your writing is not being saved. */
window.addEventListener('fl:storage', function (e) {
  if (e.detail && e.detail.state === 'fail') {
    toast('This device is refusing to save. Anything you write now will last only until you close the tab — try freeing space, or leaving private browsing.', 12000);
  }
});

/* ——— routing ———
   "#/hall/bible" -> {view:'hall', arg:'bible'} */
function parseHash() {
  var h = (location.hash || '').replace(/^#\/?/, '');
  var parts = h.split('/').filter(Boolean);
  var view = parts[0] || 'today';
  if (!FL_VIEWS[view]) view = 'today';
  /* Everything after the view is the argument, slashes included. Taking only
     parts[1] silently truncated "#/library/read/tao" to "read", so every reader
     route fell back to the shelf. */
  var rest = parts.slice(1).map(decodeURIComponent).join('/');
  return { view: view, arg: rest || null };
}
function go(view, arg) {
  location.hash = '#/' + view + (arg ? '/' + encodeURIComponent(arg) : '');
}

var flRoute = { view: 'today', arg: null };

function renderNav() {
  var nav = document.getElementById('nav');
  nav.innerHTML = Object.keys(FL_VIEWS).filter(function (k) {
    return !FL_VIEWS[k].hidden;
  }).map(function (k) {
    var v = FL_VIEWS[k];
    return '<a href="#/' + k + '"' + (k === flRoute.view ? ' aria-current="page"' : '') +
           '>' + esc(v.label) + '</a>';
  }).join('');
}

function render() {
  var v = FL_VIEWS[flRoute.view];
  var host = document.getElementById('view');
  try {
    host.innerHTML = v.render(flRoute.arg) || '';
  } catch (err) {
    /* A view that throws must not take the whole app down — the reader should still
       be able to navigate away from the broken one. */
    console.error('First Light: the ' + flRoute.view + ' view failed to render.', err);
    host.innerHTML = '<div class="kick">Something went wrong</div>' +
      '<h1>This page did not open</h1>' +
      '<p class="note">The rest of the app still works. If this keeps happening, the console has the detail.</p>';
  }
  renderNav();
  document.title = (v.title ? v.title + ' · ' : '') + 'First Light';
  if (v.after) { try { v.after(flRoute.arg); } catch (e) { console.error(e); } }
}

function navigate() {
  var next = parseHash();
  var viewChanged = next.view !== flRoute.view;
  flRoute = next;
  render();
  if (viewChanged) {
    window.scrollTo(0, 0);
    /* Move focus to the new content. Without this a keyboard or screen-reader user
       stays parked in the nav and has to tab through it again on every move. */
    var host = document.getElementById('view');
    host.focus({ preventScroll: true });
    announce((FL_VIEWS[flRoute.view].title || flRoute.view) + ' — loaded');
  }
}

window.addEventListener('hashchange', navigate);

/* ——— one delegated handler ———
   Views emit data-act attributes rather than inline onclick, so the markup carries
   no executable strings and re-rendering never leaves a dangling listener. */
document.addEventListener('click', function (e) {
  var el = e.target.closest ? e.target.closest('[data-act]') : null;
  if (!el) return;
  var act = el.getAttribute('data-act');
  if (!FL_ACTS[act]) return;
  e.preventDefault();
  FL_ACTS[act](el, e);
});
/* Checkboxes and selects need change, not click. */
document.addEventListener('change', function (e) {
  var el = e.target.closest ? e.target.closest('[data-change]') : null;
  if (!el) return;
  var act = el.getAttribute('data-change');
  if (FL_ACTS[act]) FL_ACTS[act](el, e);
});

/* ——— service worker ———
   ?nosw on the URL skips registration, which is how you debug a caching problem
   without fighting the cache to do it. */
var flReloading = false;

FL_ACTS.applyUpdate = function () {
  navigator.serviceWorker.getRegistration().then(function (reg) {
    if (reg && reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
  });
};

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.search.indexOf('nosw') !== -1) return;

  /* A new worker takes control only after skipWaiting; when it does, reload once so
     the page is running the code that matches the cache it is now being served. The
     guard matters — without it two tabs can bounce each other in a reload loop. */
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (flReloading) return;
    flReloading = true;
    location.reload();
  });

  navigator.serviceWorker.register('./sw.js').then(function (reg) {
    /* A worker may already be waiting from a previous visit, in which case
       'updatefound' has long since fired and will not fire again. */
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate();
    reg.addEventListener('updatefound', function () {
      var sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', function () {
        /* A controller means this is an update rather than the first install — only
           then is there anything for the reader to accept. */
        if (sw.state === 'installed' && navigator.serviceWorker.controller) offerUpdate();
      });
    });
  }).catch(function (e) {
    console.warn('First Light: service worker did not register.', e);
  });
}

function offerUpdate() {
  var el = document.getElementById('toast');
  if (!el) return;
  /* An update must never interrupt a morning. It waits behind a button, and the
     reader decides when. Saying "reload" and leaving it at that would be a lie: a
     plain reload does not activate a waiting worker. */
  el.innerHTML = 'A new version is ready. ' +
    '<button class="keep" style="margin:6px 0 0" data-act="applyUpdate">Load it now</button>';
  el.classList.add('on');
  if (flToastTimer) clearTimeout(flToastTimer);
}

/* ——— boot ——— */
(function boot() {
  flBoot();
  sunApply();
  flMarkDay();
  navigate();
  registerSW();

  /* A tab left open overnight should wake up on the right day. Without this the
     app still shows yesterday's voice at 9am because nothing told it to re-render. */
  var bootDay = flToday();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    sunApply();
    if (flToday() !== bootDay) { bootDay = flToday(); flMarkDay(); render(); }
  });
})();
