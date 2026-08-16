/* First Light — The Vault. Everything kept, gathered for rehearsal. */

FL_ACTS.release = function (el) {
  var m = +el.getAttribute('data-m'), d = +el.getAttribute('data-d');
  delete FL.kept[trackKey(m, d)];
  flSave();
  announce('Released from your vault.');
  render();
};

FL_VIEWS.vault = {
  label: 'Vault',
  title: 'The Vault',
  render: function () {
    var prefix = (FL.prefs.track || 'philosophers') + ':';
    var keys = Object.keys(FL.kept).filter(function (k) { return k.indexOf(prefix) === 0; });

    /* Keys arrive in insertion order, which is the order they were kept. Sorting by
       date reads better here — the Vault is a shelf, not a log. */
    keys.sort(function (a, b) {
      var A = a.slice(prefix.length).split('-').map(Number);
      var B = b.slice(prefix.length).split('-').map(Number);
      return doyOf(A[0], A[1]) - doyOf(B[0], B[1]);
    });

    var head = '<div class="kick">Kept words</div><h1>The Vault</h1>';

    if (!keys.length) {
      return head + '<p class="note" style="margin-top:30px">Nothing kept yet. ' +
        'When a voice in the almanac strikes you, choose “Keep” — it will wait for you here.</p>';
    }

    var body = keys.map(function (k) {
      var md = k.slice(prefix.length).split('-').map(Number);
      var m = md[0], d = md[1];
      var e = dayEntry(m, d);
      return '<div class="q"><p class="qt">“' + esc(e.q) + '”</p>' +
        '<span class="qs">' + esc(e.s) + '</span>' +
        '<span class="qtr">' + esc(e.t) + ' · ' + esc(MONTHS[m - 1][0]) + ' ' + d + '</span><br>' +
        '<button class="keep on" data-act="release" data-m="' + m + '" data-d="' + d + '">Release</button></div>';
    }).join('');

    return head +
      '<p class="note">' + keys.length + (keys.length === 1 ? ' voice' : ' voices') +
      ' you have chosen to keep from the year’s almanac.</p>' + body;
  }
};
