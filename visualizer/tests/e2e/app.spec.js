import { test, expect } from "@playwright/test";
import { createServer } from "http-server";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let server;
const sessionSamplePath = file => path.resolve(__dirname, "../../../samples/sessions/", file);

async function setTraceInput(page, filePayloads) {
  await page.evaluate(() => {
    const input = document.querySelector('input[type="file"]');
    if (input) {
      input.removeAttribute('webkitdirectory');
      input.removeAttribute('directory');
    }
  });
  await page.locator('input[type="file"]').setInputFiles(filePayloads);
}

async function uploadSessions(page, files) {
  const samples = files.map(f => ({
    name: `data/${f}`,
    mimeType: "application/json",
    buffer: fs.readFileSync(sessionSamplePath(f))
  }));
  await setTraceInput(page, samples);
}

function manyShotSessionPayload(baseFile, shotCount) {
  const payload = JSON.parse(fs.readFileSync(sessionSamplePath(baseFile), "utf8"));
  const session = payload.session;
  const sourceShots = session.shots || [];
  session.pk = 90000001;
  session.shot_count = shotCount;
  session.shots = Array.from({ length: shotCount }, (_, index) => ({
    ...sourceShots[index % sourceShots.length],
    pk: 9000000100 + index,
    session_pk: session.pk
  }));
  return {
    name: `data/many-${baseFile}`,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload))
  };
}

async function expectNoHorizontalOverflow(page, selector, label) {
  const { scrollWidth, clientWidth } = await page.evaluate(sel => {
    const target = document.querySelector(sel);
    const el = target || document.body;
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  }, selector);
  expect(scrollWidth, `Horizontal overflow detected for ${label}`).toBeLessThanOrEqual(clientWidth);
}

async function expectNoClippedWideChildren(page, selector, label) {
  const clipped = await page.evaluate(sel => {
    const root = document.querySelector(sel);
    if (!root) return [];
    const rootRect = root.getBoundingClientRect();
    return Array.from(root.querySelectorAll('*'))
      .map(el => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          className: String(el.className || ''),
          left: rect.left,
          right: rect.right,
          width: rect.width
        };
      })
      .filter(item => item.width > 1 && (item.left < rootRect.left - 1 || item.right > rootRect.right + 1))
      .slice(0, 10);
  }, selector);
  expect(clipped, `Clipped wide children detected for ${label}`).toEqual([]);
}

test.beforeAll(async () => {
  server = createServer({ root: "dist" });
  await new Promise(r => server.listen(8765, '127.0.0.1', r));
});

test.afterAll(async () => {
  if (!server) return;
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 1000);
    server?.close(() => {
      clearTimeout(timer);
      resolve();
    });
  }).catch(() => {});
  server = null;
});

test("home page loads", async ({ page }) => {
  await page.goto("http://localhost:8765/");
  await expect(page).toHaveTitle(/MantisX Session Visualizer/);
});

test("dashboard lists sessions", async ({ page }) => {
  await page.goto("http://localhost:8765/");
  await uploadSessions(page, ["11111027.json", "11111942.json"]);
  await expect(page).toHaveURL(/#\/dashboard$/);
  const rows = page.locator('[data-testid="session-table"] tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('10');
  await expect(rows.nth(1)).toContainText('7');
  await expect(rows.nth(0)).toContainText('May');
  const headerRow = page.locator('[data-testid="session-table"] thead tr');
  await expect(headerRow).toContainText('Hold (s)');
  await expect(headerRow).toContainText('Δpull (mm)');
  await expect(headerRow).not.toContainText('Post max (mm)');
  const percentCell = page.locator('[data-testid="metric-percent10"]').first();
  await expect(percentCell).toHaveAttribute('title', /median .*IQR/);
  const tableWrapper = page.locator('[data-testid="session-table"]');
  await expect(tableWrapper).toBeVisible();
  const [scrollWidth, clientWidth] = await Promise.all([
    tableWrapper.evaluate(el => el.scrollWidth),
    tableWrapper.evaluate(el => el.clientWidth)
  ]);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  const hasHorizontalOverflow = await page.evaluate(() => {
    const main = document.querySelector('.dashboard-page__charts');
    const container = document.querySelector('.session-scatter-plots');
    if (!main || !container) return false;
    return container.scrollWidth > main.clientWidth;
  });
  expect(hasHorizontalOverflow).toBe(false);
  const chartCards = page.locator('[data-testid^="chart-"]');
  await expect(chartCards).toHaveCount(6);
  await expect(page.locator('[data-testid="mean-pull-vector-timeline"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="chart-deltaPull"]')).toBeVisible();

  await rows.nth(0).locator('.session-listing__link--date').hover();
  const preview = page.locator('[data-testid="session-preview-card"]');
  await expect(preview).toBeVisible();
  await expect(preview).toContainText(/ISSF Open Training|Open Training/);
  await expect(preview).toContainText(/shots/);

  await expect(page.locator('body')).toHaveClass(/p-dark/);
  await page.locator('[data-testid="theme-toggle"]').click();
  await expect(page.locator('body')).not.toHaveClass(/p-dark/);
  await expect(page.evaluate(() => localStorage.getItem('darkMode'))).resolves.toBe('false');

  const stored = await page.evaluate(() => localStorage.getItem('data_folder'));
  expect(stored).not.toBeNull();

  // reset via menubar
  await page.locator('ul[role="menubar"] >> text=Reset data').click();
  await expect(page).toHaveURL('http://localhost:8765/#/');
  await expect(page.evaluate(() => localStorage.getItem('data_folder'))).resolves.toBeNull();
});

test("dashboard session navigation reuses loaded data without a global reload", async ({ page }) => {
  await page.goto("http://localhost:8765/");
  await uploadSessions(page, ["11111027.json", "11111942.json"]);
  await expect(page).toHaveURL(/#\/dashboard$/);

  await page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first().click();
  await expect(page).toHaveURL(/#\/session\/\d+$/);
  await expect(page.locator('[data-testid="loading-overlay"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="session-loading"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="shot-table"] tbody tr')).not.toHaveCount(0);
  await expect(page.locator('text=Session Stats')).toBeVisible();
});

test("direct cached session route renders without visiting dashboard first", async ({ page }) => {
  await page.goto("http://localhost:8765/");
  await uploadSessions(page, ["11111027.json"]);
  const sessionHref = await page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first().getAttribute('href');
  expect(sessionHref).toBeTruthy();

  const sessionUrl = new URL(sessionHref, page.url()).toString();
  await page.goto(sessionUrl);
  await expect(page).toHaveURL(/#\/session\/\d+$/);
  await expect(page.locator('[data-testid="data-access-prompt"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="shot-table"] tbody tr')).not.toHaveCount(0);
  await expect(page.locator('[data-testid="vector-pull"]')).toBeVisible();
});

test("direct session route without cached data shows inline data access prompt", async ({ page }) => {
  await page.goto("http://localhost:8765/#/session/31183492");
  await expect(page.locator('[data-testid="data-access-prompt"]')).toBeVisible();
  await expect(page.locator('[data-testid="data-access-prompt"]')).toContainText('Select');
  await expect(page).toHaveURL(/#\/session\/31183492$/);
});

test("direct cached shot route renders after reload", async ({ page }) => {
  await page.goto("http://localhost:8765/");
  await uploadSessions(page, ["11111027.json"]);
  await page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first().click();
  await page.locator('[data-testid="shot-table"] tbody tr .session-shotlist__link').first().click();
  const shotUrl = page.url();
  expect(shotUrl).toMatch(/#\/session\/\d+\/shot\/\d+/);

  await page.goto(shotUrl);
  await expect(page.locator('[data-testid="data-access-prompt"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="shot-details"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="shot-mode-select"]')).toBeVisible();
});

test("visualizer theming and controls", async ({ page }) => {
  await page.goto("http://localhost:8765/");
  await uploadSessions(page, ["11111027.json"]);
  await page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first().click();
  await expect(page).toHaveURL(/#\/session\//);

  const playBtn = page.locator('[data-testid="play-btn"]');
  await expect(playBtn).toBeVisible();
  await expect(page.locator('.trace-controls')).toBeVisible();
  await expect(playBtn.locator('.material-icons')).toHaveText('replay');
  await playBtn.click();
  await expect(playBtn.locator('.material-icons')).toHaveText('pause');

  const stageHandle = await page.waitForSelector('.trace-stage');
  const svgBgDark = await stageHandle.evaluate(el => getComputedStyle(el).backgroundColor);
  const shotColorDark = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--marker-shot').trim());
  await page.locator('[data-testid="theme-toggle"]').click();
  await expect(page.locator('body')).not.toHaveClass(/p-dark/);
  const svgBgLight = await stageHandle.evaluate(el => getComputedStyle(el).backgroundColor);
  const shotColorLight = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--marker-shot').trim());
  expect(svgBgDark).not.toBe(svgBgLight);
  expect(shotColorDark).not.toBe(shotColorLight);

  // open shot details
  await page.locator('[data-testid="shot-table"] tbody tr .session-shotlist__link').first().click();
  await expect(page).toHaveURL(/#\/session\/\d+\/shot\/\d+/);
  await expect(page.locator('[data-testid="breadcrumb"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="shot-details"]').first()).toBeVisible();
});

test("many-shot trace uses density mode by default", async ({ page }) => {
  await page.goto("http://localhost:8765/");
  await setTraceInput(page, [manyShotSessionPayload("11111027.json", 24)]);
  await page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first().click();
  await expect(page).toHaveURL(/#\/session\//);

  await expect(page.locator('[data-testid="trace-mode-density"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-testid="trace-mode-detail"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.trace-legend')).toContainText('brighter areas');

  await page.locator('[data-testid="trace-mode-detail"]').click();
  await expect(page.locator('[data-testid="trace-mode-detail"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-testid="trace-mode-density"]')).toHaveAttribute('aria-pressed', 'false');
});

test('averages view renders plots', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await uploadSessions(page, ['11111027.json']);
  await page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first().click();
  await page.locator('text=Averages').click();
  const layout = page.locator('.shot-layout');
  await expect(layout.locator('text=Shot timeline')).toBeVisible();
  await expect(layout.locator('text=Score progression')).toBeVisible();
  await expect(layout.locator('text=Shot cadence')).toBeVisible();
  await expect(layout.locator('text=Aiming stability vs aiming time')).toBeVisible();
  await expect(layout.locator('text=Pre-shot displacement vs aiming time')).toBeVisible();
  await expect(layout.locator('text=Post-shot stability vs aiming time')).toBeVisible();
  await expect(layout.locator('text=Aiming stability over session time')).toBeVisible();
  await expect(layout.locator('canvas')).toHaveCount(10);
});

test('[layout] averages tab exposes all plots through vertical scrolling', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await uploadSessions(page, ['11111027.json']);
  await page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first().click();
  await page.locator('text=Averages').click();
  const panel = page.locator('.session-view .p-tabview-panel, .session-view .p-tabpanel').filter({ has: page.locator('.shot-layout') }).first();
  await expect(panel.locator('text=Absolute deviation')).toBeVisible();
  const scrollState = await panel.evaluate(el => ({
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight,
    overflowY: getComputedStyle(el).overflowY
  }));
  expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);
  expect(['auto', 'scroll']).toContain(scrollState.overflowY);
  await expect(panel.locator('text=Shot Summary')).toBeInViewport();

  await panel.evaluate(el => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(panel.locator('text=Aiming stability over session time')).toBeInViewport();
});

test('[layout] dashboard and session pages never scroll sideways', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await uploadSessions(page, ['11111027.json', '11111942.json']);
  await expect(page).toHaveURL(/#\/dashboard$/);

  await expectNoHorizontalOverflow(page, 'body', 'dashboard body');
  await expectNoHorizontalOverflow(page, '.dashboard-page', 'dashboard grid');
  await expectNoHorizontalOverflow(page, '.session-listing .p-datatable-wrapper', 'session listing');

  await page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first().click();
  await expect(page).toHaveURL(/#\/session\/\d+/);

  await expectNoHorizontalOverflow(page, 'body', 'session body');
  await expectNoHorizontalOverflow(page, '.session-view', 'session tabs');
  await expectNoHorizontalOverflow(page, '.session-sidebar-content .p-datatable-wrapper', 'shot list');
});

test('[layout] dashboard remains usable on mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 760 });
  await page.goto('http://localhost:8765/');
  await uploadSessions(page, ['11111027.json', '11111942.json']);
  await expect(page).toHaveURL(/#\/dashboard$/);
  await expectNoHorizontalOverflow(page, 'body', 'mobile dashboard body');
  await expectNoClippedWideChildren(page, '.dashboard-page', 'mobile dashboard grid');
  const firstLink = page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first();
  await expect(firstLink).toBeVisible();
  await firstLink.click();
  await expect(page).toHaveURL(/#\/session\/\d+/);
});

test('[layout] session stats keeps horizontal grid without photo', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await uploadSessions(page, ['11111027.json']);
  await page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first().click();
  const visuals = page.locator('.session-stats__visuals');
  await expect(visuals).toHaveClass(/session-stats__visuals--no-photo/);
  await expect(page.locator('.session-stats__visual-item--photo')).toHaveCount(0);

  const [spreadBox, traceBox, wrapBox] = await Promise.all([
    page.locator('.session-stats__visual-item--spread').boundingBox(),
    page.locator('.session-stats__visual-item--trace').boundingBox(),
    visuals.boundingBox()
  ]);
  expect(spreadBox).not.toBeNull();
  expect(traceBox).not.toBeNull();
  expect(wrapBox).not.toBeNull();
  if (!spreadBox || !traceBox || !wrapBox) {
    throw new Error('Failed to measure session stats layout');
  }
  expect(Math.abs(spreadBox.y - traceBox.y)).toBeLessThan(40);
  expect(traceBox.x).toBeGreaterThan(spreadBox.x + spreadBox.width - 24);
  expect(spreadBox.width).toBeLessThan(wrapBox.width * 0.7);
});

test('[layout] session stats content scrolls vertically without panel overlap', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await uploadSessions(page, ['11111027.json']);
  await page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first().click();
  await expect(page).toHaveURL(/#\/session\/\d+/);

  const panel = page.locator('.session-view .p-tabview-panel, .session-view .p-tabpanel').filter({ has: page.locator('.session-stats') }).first();
  await expect(panel.locator('.session-vector-plots')).toBeVisible();

  const layout = await panel.evaluate(el => {
    const visuals = el.querySelector('.session-stats__visuals');
    const vectors = el.querySelector('.session-vector-plots');
    const stats = el.querySelector('.session-stats');
    if (!visuals || !vectors || !stats) {
      return null;
    }
    const visualsRect = visuals.getBoundingClientRect();
    const vectorsRect = vectors.getBoundingClientRect();
    const statsRect = stats.getBoundingClientRect();
    const statsStyle = getComputedStyle(stats);
    return {
      panelClientHeight: el.clientHeight,
      panelScrollHeight: el.scrollHeight,
      panelOverflowY: getComputedStyle(el).overflowY,
      statsOverflowY: statsStyle.overflowY,
      visualsBottom: visualsRect.bottom,
      vectorsTop: vectorsRect.top,
      vectorsLeft: vectorsRect.left,
      vectorsRight: vectorsRect.right,
      vectorsBottom: vectorsRect.bottom,
      statsLeft: statsRect.left,
      statsRight: statsRect.right,
      statsBottom: statsRect.bottom
    };
  });
  expect(layout).not.toBeNull();
  if (!layout) {
    throw new Error('Failed to measure session stats layout');
  }
  expect(layout.panelScrollHeight).toBeGreaterThan(layout.panelClientHeight);
  expect(['auto', 'scroll']).toContain(layout.panelOverflowY);
  expect(layout.statsOverflowY).toBe('hidden');
  expect(layout.vectorsTop).toBeGreaterThanOrEqual(layout.visualsBottom - 1);
  expect(layout.vectorsLeft).toBeGreaterThanOrEqual(layout.statsLeft - 1);
  expect(layout.vectorsRight).toBeLessThanOrEqual(layout.statsRight + 1);
  expect(layout.vectorsBottom).toBeLessThanOrEqual(layout.statsBottom + 1);

  await panel.evaluate(el => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(panel.locator('[data-testid="vector-postShot"]')).toBeInViewport();
});

test('shot list formats numbers', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await uploadSessions(page, ['11111027.json']);
  await page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first().click();
  const row = page.locator('[data-testid="shot-table"] tbody tr').first();
  await expect(row.locator('td').first()).toContainText('#1');
  const header = page.locator('[data-testid="shot-table"] thead');
  await expect(header).toContainText('L₁s, mm');
});
