import { test, expect } from "@playwright/test";
import { createServer } from "http-server";

test.beforeAll(async ({}, workerInfo) => {
  workerInfo.server = createServer({ root: ".." });
  await new Promise(r => workerInfo.server.listen(8765, r));
});

test.afterAll(async ({}, workerInfo) => {
  workerInfo.server.close();
});

test("home page renders", async ({ page }) => {
  await page.goto("http://localhost:8765/visualize_session.html");
  await expect(page.getByText(/Visualizer/)).toBeVisible();
});
