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
  await expect(page.locator('[data-testid="session-table"]')).toContainText('11111027');
  await expect(page.locator('[data-testid="session-table"]')).toContainText('11111942');

  const stored = await page.evaluate(() => localStorage.getItem('data_folder'));
  expect(stored).not.toBeNull();

  // reset via menubar
  await page.locator('ul[role="menubar"] >> text=Reset data').click();
  await expect(page).toHaveURL('http://localhost:8765/');
  await expect(page.evaluate(() => localStorage.getItem('data_folder'))).resolves.toBeNull();
});
