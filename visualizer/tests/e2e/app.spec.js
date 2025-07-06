import { test, expect } from "@playwright/test";
import { createServer } from "http-server";

test.beforeAll(async ({}, workerInfo) => {
  workerInfo.server = createServer({ root: "dist" });
  await new Promise(r => workerInfo.server.listen(8765, r));
});

test.afterAll(async ({}, workerInfo) => {
  workerInfo.server.close();
});

test("home page loads", async ({ page }) => {
  await page.goto("http://localhost:8765/index.html");
  await expect(page).toHaveTitle(/MantisX Session Visualizer/);
});
