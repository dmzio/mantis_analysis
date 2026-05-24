import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import router from '../../src/router';

describe('static deployment settings', () => {
  it('builds assets for the repository Pages path by default', () => {
    const config = readFileSync(resolve(__dirname, '../../vite.config.ts'), 'utf8');

    expect(config).toContain("base: process.env.VITE_BASE_PATH ?? './'");
  });

  it('uses hash URLs so routed pages reload from static hosting', () => {
    expect(router.options.history.createHref('/dashboard')).toBe('#/dashboard');
  });
});
