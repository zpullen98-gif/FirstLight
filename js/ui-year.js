/* First Light — The Year. All 366, month by month. */

var yearMonth = new Date().getMonth() + 1;

FL_ACTS.pickMonth = function (el) { yearMonth = +el.getAttribute('data-m'); render(); };

FL_VIEWS.year = {
  label: 'The Year',
  title: 'The Year',
  render: function () {
    var chips = MONTHS.map(function (mo, i) {
      return '<button class="mchip' + ((i + 1) === yearMonth ? ' on' : '') + '" data-act="pickMonth" data-m="' + (i + 1) + '"' +
             ' aria-pressed="' + ((i + 1) === yearMonth) + '">' + esc(mo[0].slice(0, 3)) + '</button>';
    }).join('');

    var rows = Q[yearMonth].map(function (e) {
      return '<div class="dayrow"><div class="dn">' + e[0] + '</div><div>' +
        '<p class="dq">“' + esc(e[1]) + '”</p>' +
        '<span class="ds">' + esc(e[2]) + ' · ' + esc(e[3]) + '</span> ' +
        provNote(e[4]) +
        keepButton(yearMonth, e[0], false) +
      '</div></div>';
    }).join('');

    return '' +
      '<div class="kick">The almanac</div>' +
      '<h1>A Year of Mornings</h1>' +
      '<p class="note">Three hundred sixty-six voices — one for every day of the year, including the leap day. Choose a month.</p>' +
      '<div class="months">' + chips + '</div>' +
      '<p class="mintro">' + esc(MONTHS[yearMonth - 1][1] + ' — ' + MONTHS[yearMonth - 1][2]) + '</p>' +
      '<div>' + rows + '</div>';
  }
};
