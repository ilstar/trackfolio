// Shared helpers used across views
window.WorklogUtils = (() => {
  const parseDate = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const fmtDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const sameDay = (a, b) => fmtDate(a) === fmtDate(b);
  const dayOfWeek = (date) => date.getDay(); // 0 = Sun
  const monthName = (i) => ['January','February','March','April','May','June','July','August','September','October','November','December'][i];
  const monthShort = (i) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i];
  const dayName = (i) => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i];
  const dayShort = (i) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i];

  const groupByDate = (entries) => {
    const m = new Map();
    for (const e of entries) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date).push(e);
    }
    return m;
  };

  const buildDateRange = (entries, today) => {
    if (!entries.length) return [fmtDate(today)];
    const dates = entries.map(e => parseDate(e.date));
    let min = dates[0];
    let max = today;
    for (const d of dates) {
      if (d < min) min = d;
      if (d > max) max = d;
    }
    const start = new Date(min);
    start.setDate(start.getDate() - 2);
    const out = [];
    const cursor = new Date(max);
    while (cursor >= start) {
      out.push(fmtDate(cursor));
      cursor.setDate(cursor.getDate() - 1);
    }
    return out;
  };

  const groupByWeek = (dateStrs) => {
    const weeks = [];
    let cur = null;
    for (const ds of dateStrs) {
      const d = parseDate(ds);
      const dow = (d.getDay() + 6) % 7; // Mon=0
      const monday = new Date(d);
      monday.setDate(d.getDate() - dow);
      const key = fmtDate(monday);
      if (!cur || cur.key !== key) {
        cur = { key, monday, dates: [] };
        weeks.push(cur);
      }
      cur.dates.push(ds);
    }
    return weeks;
  };

  const groupByMonth = (dateStrs) => {
    const months = [];
    let cur = null;
    for (const ds of dateStrs) {
      const d = parseDate(ds);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!cur || cur.key !== key) {
        cur = { key, year: d.getFullYear(), month: d.getMonth(), dates: [] };
        months.push(cur);
      }
      cur.dates.push(ds);
    }
    return months;
  };

  const relativeLabel = (dateStr, today) => {
    const d = parseDate(dateStr);
    const diff = Math.round((today - d) / (24*60*60*1000));
    if (diff < 0) return null;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 14) return 'Last week';
    return null;
  };

  const getProject = (id, projects) => projects.find(p => p.id === id);

  return {
    parseDate, fmtDate, sameDay, dayOfWeek, monthName, monthShort, dayName, dayShort,
    groupByDate, buildDateRange, groupByWeek, groupByMonth, relativeLabel, getProject,
  };
})();
