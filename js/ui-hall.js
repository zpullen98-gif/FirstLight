/* First Light — the year's readings.

   The practice half of the Library: five canons, each read through in 366 days.
   The Library is for wandering; this is for the discipline of a book a day.

   Reachable at #/hall and from the Library, but hidden from the top nav — one door
   to the religious section, not two. Everything it renders now comes from the local
   text via reading.js; nothing here touches the network. */

var hallMonth = new Date().getMonth() + 1;
var hallOpen = null;      // day-of-year currently expanded
var hallSaving = {};      // canonId -> true while a download is running

FL_ACTS.hallPick = function (el) { hallMonth = +el.getAttribute('data-m'); render(); };

FL_ACTS.readPassage = function (el) {
  var doy = +el.getAttribute('data-doy');
  var canon = el.getAttribute('data-canon');
  var box = document.getElementById('read-' + doy);
  if (!box) return;
  var longLabel = !!el.getAttribute('data-long');

  if (hallOpen === doy) {
    hallOpen = null;
    box.classList.add('hide');
    el.textContent = longLabel ? 'Read the full passage' : 'Read';
    return;
  }
  if (hallOpen !== null) {
    var prev = document.getElementById('read-' + hallOpen);
    var prevBtn = document.getElementById('readbtn-' + hallOpen);
    if (prev) prev.classList.add('hide');
    if (prevBtn) prevBtn.textContent = prevBtn.getAttribute('data-long') ? 'Read the full passage' : 'Read';
  }
  hallOpen = doy;
  box.classList.remove('hide');
  el.textContent = 'Hide the passage';

  if (readHasLocally(canon, doy)) { box.innerHTML = readRender(canon, doy); return; }

  box.innerHTML = '<p class="loadnote">Opening…</p>';
  readLoad(canon, doy).then(function () {
    if (hallOpen === doy) { box.innerHTML = readRender(canon, doy); announce('Passage opened.'); }
  }).catch(function () {
    /* No navigator.onLine check: it reports true on a captive portal and true again
       when the machine is online but this app's host is not, which is the usual
       case. One sentence that is true either way, and a next step that works both. */
    box.innerHTML = '<p class="loadnote">This book is not on the device yet and cannot be reached ' +
      'right now. Save it once while you have a connection and it stays for good.</p>';
  });
};

FL_ACTS.saveCanon = function (el) {
  var canon = el.getAttribute('data-canon');
  if (hallSaving[canon]) return;
  hallSaving[canon] = true;
  var bar = document.getElementById('save-' + canon);
  el.disabled = true;
  readSaveCanon(canon, function (done, total) {
    if (bar) bar.textContent = 'Saving… ' + done + ' of ' + total;
  }).then(function (r) {
    hallSaving[canon] = false;
    if (bar) {
      bar.textContent = r.failed.length
        ? r.loaded + ' of ' + (r.loaded + r.failed.length) + ' saved; the rest could not be reached.'
        : 'Held here — always available.';
    }
    announce('Saved for offline.');
    render();
  }).catch(function () {
    hallSaving[canon] = false;
    if (bar) bar.textContent = 'That did not finish. Try again with a connection.';
    el.disabled = false;
  });
};

FL_ACTS.forgetCanon = function (el) {
  var canon = el.getAttribute('data-canon');
  var w = readWorkOf(canon);
  FLTextForget(w).then(function (n) {
    toast('Removed ' + n + (n === 1 ? ' file' : ' files') + ' from this device.');
    render();
  });
};

FL_VIEWS.hall = {
  label: 'The year’s readings',
  title: 'The Year’s Readings',
  hidden: true,        // reached from the Library; the nav has one religious door
  render: function (canonId) {
    if (!canonId || !hallById(canonId)) {
      return '<a class="keep" style="margin-bottom:20px" href="#/library">← The Library</a>' +
        '<div class="kick">Five canons, one year each</div>' +
        '<h1>The Year’s Readings</h1>' +
        '<p class="note">A book a day, straight through, for three hundred and sixty-six days. The Library is for wandering; this is the discipline.</p>' +
        HALL_YEARS.map(function (h) {
          var ready = readWorkReady(h[0]);
          return '<div class="canon"><p class="pt">' + esc(h[1]) + '</p>' +
            '<div class="ds">' + esc(h[2]) + '</div>' +
            '<p class="cep">“' + esc(h[5]) + '”</p>' +
            '<div class="ds" style="margin-bottom:8px">' + esc(h[6]) + '</div>' +
            '<p class="ct">' + esc(h[3]) + '</p>' +
            (ready ? '' : '<p class="ct" style="margin-top:8px;color:var(--accent)">This text is still being prepared.</p>') +
            '<div style="margin-top:12px"><a class="keep" href="#/hall/' + h[0] + '">Enter the year</a></div>' +
          '</div>';
        }).join('');
    }

    var h = hallById(canonId);
    var now = new Date(), doy = doyOf(now.getMonth() + 1, now.getDate());
    var verse = POOLS[canonId][(now.getDate() - 1) % 31];
    var ready = readWorkReady(canonId);

    var chips = MONTHS.map(function (mo, i) {
      return '<button class="mchip' + ((i + 1) === hallMonth ? ' on' : '') + '" data-act="hallPick" data-m="' + (i + 1) + '"' +
             ' aria-pressed="' + ((i + 1) === hallMonth) + '">' + esc(mo[0].slice(0, 3)) + '</button>';
    }).join('');

    var start = doyOf(hallMonth, 1), rows = [];
    for (var dd = 1; dd <= MLEN[hallMonth - 1]; dd++) {
      var rowDoy = start + dd - 1;
      var leapNote = doySkipped(rowDoy) ? ' <span class="ds">· leap day only</span>' : '';
      /* A filled dot means the text for that day is already on the device. One glyph
         per row is what would have made the artifact's dead Rig Veda path obvious on
         the first morning instead of never. */
      var dot = ready
        ? '<span class="heldot' + (readHasLocally(canonId, rowDoy) ? ' on' : '') + '" title="' +
          (readHasLocally(canonId, rowDoy) ? 'on this device' : 'not saved yet') + '"></span>'
        : '';
      rows.push('<div class="dayrow"><div class="dn">' + dd + '</div><div>' +
        '<p class="dq" style="font-style:normal;font-family:var(--sans);font-size:14px">' +
          dot + esc(h[4][rowDoy - 1]) + leapNote + '</p>' +
        (ready ? '<button class="readmini" id="readbtn-' + rowDoy + '" data-act="readPassage" data-doy="' + rowDoy +
          '" data-canon="' + canonId + '">Read</button>' : '') +
        '<div class="readbox hide" id="read-' + rowDoy + '"></div>' +
      '</div></div>');
    }

    return '' +
      '<a class="keep" style="margin-bottom:20px" href="#/hall">← All five</a>' +
      '<div class="canon"><p class="pt">' + esc(h[1]) + '</p><div class="ds">' + esc(h[2]) + '</div>' +
        '<p class="cep">“' + esc(h[5]) + '”</p><div class="ds">' + esc(h[6]) + '</div>' +
        '<p class="ct" style="margin-top:10px"><span style="color:var(--accent)">Core teachings:</span> ' + esc(h[8]) + '</p>' +
        '<div class="label" style="margin-top:18px">Today’s reading · ' +
          esc(now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })) + '</div>' +
        '<p class="px" style="font-weight:600">' + esc(h[4][doy - 1]) + '</p>' +
        (ready
          ? '<button class="keep" id="readbtn-' + doy + '" data-act="readPassage" data-doy="' + doy +
            '" data-canon="' + canonId + '" data-long="1">Read the full passage</button>'
          : '<p class="loadnote">This text is still being prepared.</p>') +
        '<div class="readbox hide" id="read-' + doy + '"></div>' +
        '<div class="label" style="margin-top:18px">Verse of the day</div>' +
        '<p class="cep">“' + esc(verse[0]) + '”</p><div class="ds">' + esc(verse[1]) + '</div>' +
      '</div>' +
      (ready ? '<div class="card" id="canon-store-' + canonId + '"><p class="loadnote" id="save-' + canonId + '">Checking what is on this device…</p></div>' : '') +
      '<div class="label">The year’s readings</div>' +
      '<div class="months">' + chips + '</div><div>' + rows.join('') + '</div>';
  },

  after: function (canonId) {
    if (!canonId || !readWorkReady(canonId)) return;
    var host = document.getElementById('canon-store-' + canonId);
    if (!host) return;
    readCanonState(canonId).then(function (st) {
      if (!st.ready) return;
      if (st.whole) {
        host.innerHTML = '<p class="px" id="save-' + canonId + '">Held here — always available.</p>' +
          '<div class="ds" style="margin-top:6px">' + st.total + (st.total === 1 ? ' file' : ' files') +
          ' · ' + FLBytes(st.bytes) + '</div>' +
          '<button class="keep" data-act="forgetCanon" data-canon="' + canonId + '">Remove from this device</button>';
      } else {
        host.innerHTML = '<p class="px" id="save-' + canonId + '">' +
          (st.have ? st.have + ' of ' + st.total + ' saved so far.' : 'Not saved to this device yet.') + '</p>' +
          '<div class="ds" style="margin-top:6px">' + FLBytes(st.bytes) + ' · a few seconds</div>' +
          '<button class="keep" data-act="saveCanon" data-canon="' + canonId + '">Save the whole year for offline</button>';
      }
    });
  }
};
