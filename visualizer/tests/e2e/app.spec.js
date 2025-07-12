import { test, expect } from "@playwright/test";
import { createServer } from "http-server";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let server;

test.beforeAll(async () => {
  server = createServer({ root: "dist" });
  await new Promise(r => server.listen(8765, r));
});

test.afterAll(async () => {
  if (server) server.close();
});

test("home page loads", async ({ page }) => {
  await page.goto("http://localhost:8765/");
  await expect(page).toHaveTitle(/MantisX Session Visualizer/);
});

test("dashboard lists sessions", async ({ page }) => {
  await page.goto("http://localhost:8765/");
  const samples = ["11111027.json", "11111942.json"].map(f => ({
    name: `data/${f}`,
    mimeType: "application/json",
    buffer: fs.readFileSync(path.resolve(__dirname, "../../../samples/sessions/" + f))
  }));
  await page.locator('input[type="file"]').setInputFiles(samples);
  await expect(page).toHaveURL(/\/dashboard$/);
  const rows = page.locator('[data-testid="session-table"] tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('10');
  await expect(rows.nth(1)).toContainText('7');
  await expect(rows.nth(0)).toContainText('May');

  await expect(page.locator('body')).toHaveClass(/p-dark/);
  await page.locator('[data-testid="theme-toggle"]').click();
  await expect(page.locator('body')).not.toHaveClass(/p-dark/);
  await expect(page.evaluate(() => localStorage.getItem('darkMode'))).resolves.toBe('false');

  const stored = await page.evaluate(() => localStorage.getItem('data_folder'));
  expect(stored).not.toBeNull();

  // reset via menubar
  await page.locator('ul[role="menubar"] >> text=Reset data').click();
  await expect(page).toHaveURL('http://localhost:8765/');
  await expect(page.evaluate(() => localStorage.getItem('data_folder'))).resolves.toBeNull();
});

test("visualizer theming and controls", async ({ page }) => {
  await page.goto("http://localhost:8765/");
  const sample = {
    name: "data/11111027.json",
    mimeType: "application/json",
    buffer: fs.readFileSync(path.resolve(__dirname, "../../../samples/sessions/11111027.json"))
  };
  await page.locator('input[type="file"]').setInputFiles([sample]);
  await page.locator('[data-testid="session-table"] tbody tr button').first().click();
  await expect(page).toHaveURL(/\/session\//);

  const playBtn = page.locator('[data-testid="play-btn"]');
  await expect(playBtn).toBeVisible();
  await expect(page.locator('.trace-controls')).toBeVisible();
  await expect(playBtn.locator('.material-icons')).toHaveText('play_arrow');
  await playBtn.click();

  const svgBgDark = await page.evaluate(() => getComputedStyle(document.querySelector('.trace-visualizer svg')).backgroundColor);
  const shotColorDark = await page.evaluate(() => getComputedStyle(document.querySelector('[data-marker="shot"]')).fill);
  await page.locator('[data-testid="theme-toggle"]').click();
  const svgBgLight = await page.evaluate(() => getComputedStyle(document.querySelector('.trace-visualizer svg')).backgroundColor);
  const shotColorLight = await page.evaluate(() => getComputedStyle(document.querySelector('[data-marker="shot"]')).fill);
  expect(svgBgDark).not.toBe(svgBgLight);
  expect(shotColorDark).not.toBe(shotColorLight);

  // open shot details
  await page.locator('[data-testid="shot-table"] tbody tr button').first().click();
  await expect(page).toHaveURL(/\/session\/\d+\/shot\/\d+/);
  await expect(page.locator('[data-testid="breadcrumb"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="shot-details"]').first()).toBeVisible();
});

test('shot list formats numbers', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  const sample = {
    name: 'data/formatting.json',
    mimeType: 'application/json',
    buffer: fs.readFileSync(path.resolve(__dirname, 'sample/formatting.json'))
  };
  await page.locator('input[type="file"]').setInputFiles([sample]);
  await page.locator('[data-testid="session-table"] tbody tr button').first().click();
  const row = page.locator('[data-testid="shot-table"] tbody tr').first();
  await expect(row).toContainText('25');
  const header = page.locator('[data-testid="shot-table"] thead');
  await expect(header).toContainText('L₁s, mm');
});
