const { test, expect } = require('playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
  });
  await page.reload();
});

test('renders the default columns view and switches between tabs', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Project columns' })).toHaveClass(/is-on/);
  await expect(page.locator('.wlCol-root')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Worklog' })).toBeVisible();
  await expect(page.getByText('Atlas Migration')).toBeVisible();

  await page.getByRole('button', { name: 'Feed' }).click();
  await expect(page.locator('.wlC-root')).toBeVisible();
  await expect(page.getByRole('button', { name: 'All projects' })).toBeVisible();

  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.getByLabel('Rename Atlas Migration')).toBeVisible();
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
