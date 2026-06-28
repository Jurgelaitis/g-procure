/* ============================================================================
 * G-Procure  shared/workdays.js   (v1.0)
 * Vienas tiesos saltinis darbo dienu skaiciavimui ir LR svenciu dienoms.
 * Velykos skaiciuojamos computus algoritmu -> kalendorius niekada nepasensta.
 * ========================================================================== */
(function (root) {
  "use strict";
  function isoLocal(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }
  function easterSunday(year) {
    var a = year % 19, b = Math.floor(year / 100), c = year % 100;
    var d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }
  function nthWeekdayOfMonth(year, monthIdx, weekday, n) {
    var d = new Date(year, monthIdx, 1);
    var shift = (7 + weekday - d.getDay()) % 7;
    d.setDate(1 + shift + (n - 1) * 7);
    return d;
  }
  var FIXED = ["01-01","02-16","03-11","05-01","06-24","07-06","08-15","11-01","11-02","12-24","12-25","12-26"];
  var _cache = {};
  function holidaysForYear(year) {
    if (_cache[year]) return _cache[year];
    var set = new Set();
    for (var j = 0; j < FIXED.length; j++) set.add(year + "-" + FIXED[j]);
    var es = easterSunday(year);
    var em = new Date(es.getFullYear(), es.getMonth(), es.getDate() + 1);
    set.add(isoLocal(es)); set.add(isoLocal(em));
    set.add(isoLocal(nthWeekdayOfMonth(year, 4, 0, 1)));
    set.add(isoLocal(nthWeekdayOfMonth(year, 5, 0, 1)));
    _cache[year] = set;
    return set;
  }
  function isHoliday(d) { return holidaysForYear(d.getFullYear()).has(isoLocal(d)); }
  function isWorkday(d) { var dow = d.getDay(); return dow !== 0 && dow !== 6 && !isHoliday(d); }
  function addWorkdays(date, days) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var dir = days >= 0 ? 1 : -1, target = Math.abs(days), added = 0;
    while (added < target) { d.setDate(d.getDate() + dir); if (isWorkday(d)) added++; }
    return d;
  }
  function fmtDate(d) { if (!(d instanceof Date)) d = new Date(d); if (isNaN(d)) return ""; return isoLocal(d); }
  root.GP_WORKDAYS = {
    version: "1.0", isoLocal: isoLocal, fmtDate: fmtDate, easterSunday: easterSunday,
    holidaysForYear: holidaysForYear, isHoliday: isHoliday, isWorkday: isWorkday, addWorkdays: addWorkdays
  };
})(typeof window !== "undefined" ? window : this);
