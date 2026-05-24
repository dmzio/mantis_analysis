import { chromium } from 'playwright';
import { createServer } from 'http-server';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const samplesDir = path.resolve(projectRoot, '../samples/sessions');

function sessionFileHandle(name) {
  return {
    name: `data/${name}`,
    mimeType: 'application/json',
    buffer: fs.readFileSync(path.join(samplesDir, name))
  };
}

async function expectNoOverflow(page, selector, label) {
  const { scrollWidth, clientWidth } = await page.evaluate(sel => {
    const target = document.querySelector(sel);
    const el = target || document.body;
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  }, selector);
  if (scrollWidth > clientWidth) {
    throw new Error(`Horizontal overflow detected for ${label} (${scrollWidth} > ${clientWidth})`);
  }
}

async function expectNoClippedWideChildren(page, selector, label) {
  const offenders = await page.evaluate(sel => {
    const root = document.querySelector(sel);
    if (!root) return [];
    const rootRect = root.getBoundingClientRect();
    return Array.from(root.querySelectorAll('*'))
      .map(el => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          className: String(el.className || ''),
          left: rect.left,
          right: rect.right,
          width: rect.width
        };
      })
      .filter(item => item.width > 1 && (item.left < rootRect.left - 1 || item.right > rootRect.right + 1))
      .slice(0, 10);
  }, selector);
  if (offenders.length) {
    throw new Error(`Clipped wide children detected for ${label}: ${JSON.stringify(offenders, null, 2)}`);
  }
}

async function expectClickable(page, selector, label) {
  try {
    await page.locator(selector).first().click({ trial: true, timeout: 3000 });
  } catch (err) {
    throw new Error(`Clickable target blocked for ${label}: ${err.message}`);
  }
}

async function main() {
  const server = createServer({ root: distDir });
  const PORT = await new Promise((resolve, reject) => {
    server.server.on('error', reject);
    server.listen(0, '127.0.0.1', err => {
      if (err) {
        reject(err);
        return;
      }
      const address = server.server.address();
      if (!address || typeof address !== 'object') {
        reject(new Error('Unable to determine preview port'));
        return;
      }
      resolve(address.port);
    });
  });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    await page.goto(`http://localhost:${PORT}/`);
    await page.locator('input[type="file"]').setInputFiles([
      sessionFileHandle('11111027.json'),
      sessionFileHandle('11111942.json')
    ]);
    await page.waitForURL('**/dashboard');

    await expectNoOverflow(page, 'body', 'dashboard body');
    await expectNoOverflow(page, '.dashboard-page', 'dashboard grid');
    await expectNoOverflow(page, '.session-listing .p-datatable-wrapper', 'dashboard session table');
    await expectNoClippedWideChildren(page, '.dashboard-page', 'dashboard grid');
    await expectClickable(page, '[data-testid="session-table"] tbody tr .session-listing__link', 'dashboard session link');

    await page.locator('[data-testid="session-table"] tbody tr .session-listing__link').first().click();
    await page.waitForURL('**/session/**');

    await expectNoOverflow(page, 'body', 'session body');
    await expectNoOverflow(page, '.session-view', 'session tab content');
    await expectNoOverflow(page, '.session-sidebar-content .p-datatable-wrapper', 'session shot list');

    await page.setViewportSize({ width: 430, height: 760 });
    await page.goto(`http://localhost:${PORT}/`);
    await page.locator('input[type="file"]').setInputFiles([
      sessionFileHandle('11111027.json'),
      sessionFileHandle('11111942.json')
    ]);
    await page.waitForURL('**/dashboard');
    await page.locator('.loading-overlay').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});

    await expectNoOverflow(page, 'body', 'mobile dashboard body');
    await expectNoOverflow(page, '.dashboard-page', 'mobile dashboard grid');
    await expectNoClippedWideChildren(page, '.dashboard-page', 'mobile dashboard grid');
    await expectClickable(page, '[data-testid="session-table"] tbody tr .session-listing__link', 'mobile dashboard session link');

    console.log('Layout check passed: no horizontal overflow detected.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
