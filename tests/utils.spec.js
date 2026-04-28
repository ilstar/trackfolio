const { test, expect } = require('playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(window.WorklogUtils))).toBe(true);
});

test('formats and compares local dates without timezone drift', async ({ page }) => {
  const result = await page.evaluate(() => {
    const U = window.WorklogUtils;
    const date = U.parseDate('2026-04-05');

    return {
      roundTrip: U.fmtDate(date),
      sameDay: U.sameDay(date, new Date(2026, 3, 5, 23, 59)),
      differentDay: U.sameDay(date, new Date(2026, 3, 6)),
      dayOfWeek: U.dayOfWeek(date),
      monthName: U.monthName(date.getMonth()),
      monthShort: U.monthShort(date.getMonth()),
      dayName: U.dayName(date.getDay()),
      dayShort: U.dayShort(date.getDay()),
    };
  });

  expect(result).toEqual({
    roundTrip: '2026-04-05',
    sameDay: true,
    differentDay: false,
    dayOfWeek: 0,
    monthName: 'April',
    monthShort: 'Apr',
    dayName: 'Sunday',
    dayShort: 'Sun',
  });
});

test('builds date ranges from entries with today and future entries', async ({ page }) => {
  const result = await page.evaluate(() => {
    const U = window.WorklogUtils;
    const today = U.parseDate('2026-04-10');

    return {
      empty: U.buildDateRange([], today),
      withEntries: U.buildDateRange([
        { date: '2026-04-08' },
        { date: '2026-04-13' },
      ], today),
    };
  });

  expect(result.empty).toEqual(['2026-04-10']);
  expect(result.withEntries).toEqual([
    '2026-04-13',
    '2026-04-12',
    '2026-04-11',
    '2026-04-10',
    '2026-04-09',
    '2026-04-08',
    '2026-04-07',
    '2026-04-06',
  ]);
});

test('groups dates and entries by date, week, and month', async ({ page }) => {
  const result = await page.evaluate(() => {
    const U = window.WorklogUtils;
    const byDate = U.groupByDate([
      { id: 'a', date: '2026-04-10' },
      { id: 'b', date: '2026-04-10' },
      { id: 'c', date: '2026-04-09' },
    ]);

    return {
      byDate: Array.from(byDate, ([date, entries]) => [date, entries.map(e => e.id)]),
      byWeek: U.groupByWeek([
        '2026-04-12',
        '2026-04-11',
        '2026-04-06',
        '2026-04-05',
      ]).map(week => ({
        key: week.key,
        monday: U.fmtDate(week.monday),
        dates: week.dates,
      })),
      byMonth: U.groupByMonth([
        '2026-05-01',
        '2026-04-30',
        '2026-04-01',
        '2026-03-31',
      ]).map(month => ({
        key: month.key,
        year: month.year,
        month: month.month,
        dates: month.dates,
      })),
    };
  });

  expect(result.byDate).toEqual([
    ['2026-04-10', ['a', 'b']],
    ['2026-04-09', ['c']],
  ]);
  expect(result.byWeek).toEqual([
    {
      key: '2026-04-06',
      monday: '2026-04-06',
      dates: ['2026-04-12', '2026-04-11', '2026-04-06'],
    },
    {
      key: '2026-03-30',
      monday: '2026-03-30',
      dates: ['2026-04-05'],
    },
  ]);
  expect(result.byMonth).toEqual([
    {
      key: '2026-4',
      year: 2026,
      month: 4,
      dates: ['2026-05-01'],
    },
    {
      key: '2026-3',
      year: 2026,
      month: 3,
      dates: ['2026-04-30', '2026-04-01'],
    },
    {
      key: '2026-2',
      year: 2026,
      month: 2,
      dates: ['2026-03-31'],
    },
  ]);
});

test('labels relative dates and finds projects', async ({ page }) => {
  const result = await page.evaluate(() => {
    const U = window.WorklogUtils;
    const today = U.parseDate('2026-04-10');
    const projects = [
      { id: 'p1', name: 'Atlas Migration' },
      { id: 'p2', name: 'Billing v3' },
    ];

    return {
      future: U.relativeLabel('2026-04-11', today),
      today: U.relativeLabel('2026-04-10', today),
      yesterday: U.relativeLabel('2026-04-09', today),
      daysAgo: U.relativeLabel('2026-04-07', today),
      lastWeek: U.relativeLabel('2026-04-01', today),
      older: U.relativeLabel('2026-03-20', today),
      project: U.getProject('p2', projects),
      missingProject: U.getProject('missing', projects) || null,
    };
  });

  expect(result).toEqual({
    future: null,
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: '3 days ago',
    lastWeek: 'Last week',
    older: null,
    project: { id: 'p2', name: 'Billing v3' },
    missingProject: null,
  });
});
