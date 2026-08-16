/* First Light — Settings.

   Three jobs: let the reader see and correct what the app believes about their sky,
   choose how the palette behaves, and get their record out of the device. The last
   one matters most — localStorage is per-origin and does not survive a new phone, a
   cleared cache, or a change of hosting. A year of mornings has to be portable. */

FL_ACTS.setTheme = function (el) {
  FL.prefs.theme = el.value;
  flSave(true);
  sunApply();
  render();
};

FL_ACTS.useLocation = function () {
  sunAskLocation().then(function () {
    toast('Location set. Sunrise and sunset are now yours.');
    render();
  }).catch(function (err) {
    toast(err && err.code === 1
      ? 'Location permission was declined — the app will keep estimating from your time zone.'
      : 'Could not read a location just now.');
  });
};

FL_ACTS.clearLocation = function () {
  delete FL.prefs.lat; delete FL.prefs.lon;
  flSave(true); sunApply(); render();
  toast('Back to estimating from your time zone.');
};

FL_ACTS.exportRecord = function () {
  var blob = new Blob([flExport()], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = flExportFilename();
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  /* Revoke late: Safari has been known to cancel the download if the URL dies
     before it has finished reading the blob. */
  setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  announce('Record exported.');
};

FL_ACTS.importRecord = function () {
  var input = document.getElementById('fl-import');
  if (input) input.click();
};

FL_ACTS.importChosen = function (el) {
  var file = el.files && el.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var added = flImport(String(reader.result));
      var bits = [];
      if (added.days) bits.push(added.days + ' mornings');
      if (added.kept) bits.push(added.kept + ' kept voices');
      if (added.journal) bits.push(added.journal + ' journal entries');
      if (added.checks) bits.push(added.checks + ' goals');
      toast(bits.length ? 'Merged in ' + bits.join(', ') + '.' : 'That record held nothing new — everything in it was already here.');
      render();
    } catch (err) {
      toast('That file could not be read as a First Light record.');
      console.warn(err);
    }
  };
  reader.readAsText(file);
  el.value = '';   // so choosing the same file twice still fires
};

FL_VIEWS.settings = {
  label: 'Settings',
  title: 'Settings',
  render: function () {
    var sky = sunDescribe();
    var theme = FL.prefs.theme || 'auto';
    var opt = function (v, t) {
      return '<option value="' + v + '"' + (theme === v ? ' selected' : '') + '>' + t + '</option>';
    };

    var located = sky.exact
      ? '<p class="px">Using your location: ' + sky.lat.toFixed(2) + '°, ' + sky.lon.toFixed(2) + '°.</p>' +
        '<button class="keep" data-act="clearLocation">Forget it</button>'
      : '<p class="px">Estimating from your time zone — longitude about ' + sky.lon.toFixed(0) + '°, ' +
        'latitude assumed 40°. Good enough to know whether it is dark; not exact.</p>' +
        '<button class="keep" data-act="useLocation">Use my location</button>';

    var times = sky.polar
      ? '<p class="px" style="color:var(--faint)">At your latitude the sun does not rise or set today. ' +
        'The palette follows the sun’s height instead, which still works.</p>'
      : '<div class="astrorow"><span class="k">First light</span> ' + esc(sky.dawn) +
        '</div><div class="astrorow"><span class="k">Sunrise</span> ' + esc(sky.sunrise) +
        '</div><div class="astrorow"><span class="k">Sunset</span> ' + esc(sky.sunset) +
        '</div><div class="astrorow"><span class="k">Last light</span> ' + esc(sky.dusk) + '</div>';

    var totalKept = Object.keys(FL.kept).length;
    var totalChecks = Object.keys(FL.checks).length;

    return '' +
      '<div class="kick">The workings</div><h1>Settings</h1>' +

      '<div class="label">Light</div>' +
      '<div class="card">' +
        '<p class="px" style="margin-bottom:10px">The app follows your sky by default — night before first light, ' +
        'warm through sunrise, plain by day, cooler at dusk. You can hold it at one instead.</p>' +
        '<select class="sel" data-change="setTheme" aria-label="Palette">' +
          opt('auto', 'Follow the sun') + opt('firstlight', 'Always first light') +
          opt('day', 'Always day') + opt('dusk', 'Always dusk') + opt('night', 'Always night') +
        '</select>' +
        '<div class="astrorow" style="margin-top:12px"><span class="k">Right now</span> ' +
          esc(sky.phase) + ' · ' + esc(sky.season) + '</div>' +
        times +
      '</div>' +

      '<div class="label">Where you are</div>' +
      '<div class="card">' + located +
        '<p class="vidnote" style="margin-top:10px">Used only on this device, only to compute the hour of the sun. ' +
        'It is never sent anywhere — there is nowhere for it to be sent.</p>' +
      '</div>' +

      '<div class="label">Your record</div>' +
      '<div class="card">' +
        '<div class="astrorow"><span class="k">Mornings</span> ' + FL.days.length + '</div>' +
        '<div class="astrorow"><span class="k">Current streak</span> ' + flStreak() + '</div>' +
        '<div class="astrorow"><span class="k">Longest streak</span> ' + flLongestStreak() + '</div>' +
        '<div class="astrorow"><span class="k">Kept voices</span> ' + totalKept + '</div>' +
        '<div class="astrorow"><span class="k">Goals checked</span> ' + totalChecks + '</div>' +
        '<p class="px" style="margin:14px 0 10px;color:var(--faint)">Everything lives on this device only. ' +
        'Export before you change phones, clear your browser, or do anything you might regret.</p>' +
        '<button class="btn" data-act="exportRecord">Export</button> ' +
        '<button class="keep" data-act="importRecord">Import a backup</button>' +
        '<input type="file" id="fl-import" accept="application/json,.json" class="sr-only" data-change="importChosen">' +
        '<p class="vidnote" style="margin-top:10px">Importing merges — it adds what is missing and never deletes what is here.</p>' +
      '</div>' +

      '<p class="mintro" style="margin-top:30px">First Light keeps nothing about you anywhere but this device.</p>';
  }
};
