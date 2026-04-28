const { test, expect } = require('playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
  });
  await page.reload();
});

test('renders the default columns view and switches between tabs', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Timeline' })).toHaveClass(/is-on/);
  await expect(page.locator('.wlCol-root')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Trackfolio' })).toBeVisible();
  await expect(page.getByText('Atlas Migration')).toBeVisible();

  await page.getByRole('button', { name: 'Activity' }).click();
  await expect(page.locator('.wlC-root')).toBeVisible();
  await expect(page.getByRole('button', { name: 'All projects' })).toBeVisible();

  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.getByLabel('Rename Atlas Migration')).toBeVisible();
});

test('keeps timeline width compact by default and persists full-screen preference', async ({ page }) => {
  const views = page.locator('.views');
  const fullScreen = page.getByRole('checkbox', { name: 'Full screen' });

  await expect(page.locator('.wlCol-root')).toBeVisible();
  await expect(views).not.toHaveClass(/views--full/);
  await expect(fullScreen).not.toBeChecked();

  await fullScreen.check();
  await expect(views).toHaveClass(/views--full/);

  await page.reload();
  await expect(page.locator('.wlCol-root')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Full screen' })).toBeChecked();
  await expect(page.locator('.views')).toHaveClass(/views--full/);
});

test('keeps the Monday divider below day rows with no accent stripe', async ({ page }) => {
  await page.getByRole('button', { name: 'Day' }).click();

  const mondayAxis = page.locator('.wlCol-axis.is-monday:not(.is-week):not(.is-month-start)').first();
  await expect(mondayAxis).toBeVisible();

  const mondayStyles = await mondayAxis.evaluate(el => {
    const before = window.getComputedStyle(el, '::before');
    const axis = window.getComputedStyle(el);
    return {
      beforeDisplay: before.display,
      beforeContent: before.content,
      borderTopWidth: axis.borderTopWidth,
      borderBottomWidth: axis.borderBottomWidth,
    };
  });

  expect(mondayStyles.beforeDisplay).toBe('none');
  expect(mondayStyles.beforeContent).toBe('none');
  expect(mondayStyles.borderTopWidth).toBe('0px');
  expect(mondayStyles.borderBottomWidth).toBe('1px');

  await page.getByRole('button', { name: 'Week' }).click();

  const weekAxis = page.locator('.wlCol-axis.is-week.is-monday').first();
  await expect(weekAxis).toBeVisible();

  const weekStyles = await weekAxis.evaluate(el => {
    const before = window.getComputedStyle(el, '::before');
    return {
      beforeDisplay: before.display,
      beforeContent: before.content,
    };
  });

  expect(weekStyles.beforeDisplay).toBe('none');
  expect(weekStyles.beforeContent).toBe('none');
});

test('adds a new entry from the columns view', async ({ page }) => {
  await page.getByRole('button', { name: /New entry/ }).click();
  await expect(page.locator('.wlCol-dialog').getByText('New entry', { exact: true })).toBeVisible();

  await page.getByPlaceholder('What happened?').fill('Wrote the first browser test.');
  await page.getByPlaceholder('Project (optional)').fill('Atlas Migration');
  await page.getByRole('button', { name: /^Save/ }).click();

  await expect(page.getByText('Wrote the first browser test.')).toBeVisible();

  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('worklog.data')));
  expect(saved.entries.some(entry => entry.text === 'Wrote the first browser test.')).toBe(true);
});

test('hides and unhides a project', async ({ page }) => {
  await page.getByRole('button', { name: 'Projects' }).click();

  const atlasRow = page.locator('[data-project-id="p1"]');
  await expect(atlasRow).toBeVisible();
  await atlasRow.getByRole('button', { name: 'Hide' }).click();
  await expect(atlasRow).toBeHidden();
  await expect(page.getByText('4 visible · 1 hidden')).toBeVisible();

  await page.getByRole('button', { name: 'Hidden' }).click();
  await expect(atlasRow).toBeVisible();
  await atlasRow.getByRole('button', { name: 'Unhide' }).click();
  await expect(atlasRow).toBeHidden();

  await page.getByRole('button', { name: 'Visible' }).click();
  await expect(atlasRow).toBeVisible();
  await expect(page.getByText('5 visible · 0 hidden')).toBeVisible();
});

test('switches tabs and time scale with keyboard shortcuts', async ({ page }) => {
  await expect(page.locator('.wlCol-root')).toBeVisible();

  await page.keyboard.press('2');
  await expect(page.getByRole('button', { name: 'Activity' })).toHaveClass(/is-on/);
  await expect(page.locator('.wlC-root')).toBeVisible();

  await page.keyboard.press('d');
  await expect(page.getByRole('button', { name: 'Day' })).toHaveClass(/is-on/);

  await page.keyboard.press('w');
  await expect(page.getByRole('button', { name: 'Week' })).toHaveClass(/is-on/);

  await page.keyboard.press('3');
  await expect(page.getByRole('button', { name: 'Projects', exact: true })).toHaveClass(/is-on/);
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

  await page.keyboard.press('1');
  await expect(page.getByRole('button', { name: 'Timeline' })).toHaveClass(/is-on/);
  await expect(page.locator('.wlCol-root')).toBeVisible();
});

test('shows and closes keyboard shortcut help', async ({ page }) => {
  await expect(page.locator('.wlCol-root')).toBeVisible();
  await page.keyboard.press('?');

  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(help).toBeVisible();
  await expect(help.getByText('Timeline')).toBeVisible();
  await expect(help.getByText('Day view')).toBeVisible();
  await expect(help.getByText('New entry')).toHaveCount(2);

  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
});

test('does not run app shortcuts while typing', async ({ page }) => {
  await expect(page.locator('.wlCol-root')).toBeVisible();
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  const rename = page.getByLabel('Rename Atlas Migration');
  await rename.focus();
  await rename.press('End');
  await page.keyboard.press('1');

  await expect(page.getByRole('button', { name: 'Projects', exact: true })).toHaveClass(/is-on/);
  await expect(rename).toHaveValue('Atlas Migration1');

  await page.getByRole('button', { name: 'Timeline' }).click();
  await page.keyboard.press('/');
  await expect(page.locator('.wlCol-dialog').getByText('New entry', { exact: true })).toBeVisible();

  const entryText = page.getByPlaceholder('What happened?');
  await page.keyboard.press('2');
  await page.keyboard.press('?');

  await expect(page.getByRole('button', { name: 'Timeline' })).toHaveClass(/is-on/);
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveCount(0);
  await expect(entryText).toHaveValue('2?');
});

test('keeps the existing new-entry shortcut', async ({ page }) => {
  await expect(page.locator('.wlCol-root')).toBeVisible();
  await page.keyboard.press('/');
  await expect(page.locator('.wlCol-dialog').getByText('New entry', { exact: true })).toBeVisible();
});
