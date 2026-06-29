const { test: base } = require('@playwright/test');
const envConfig = require('../../config/env.config');

/**
 * Worker-scoped browser context and page shared across all smoke tests in this file.
 * Prevents Playwright from opening a new browser after each failed test.
 */
const test = base.extend({
  sharedContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      await use(context);
      if (!envConfig.keepBrowserOpen) {
        await context.close();
      }
    },
    { scope: 'worker' },
  ],

  sharedPage: [
    async ({ sharedContext }, use) => {
      const page = await sharedContext.newPage();
      await use(page);
    },
    { scope: 'worker' },
  ],
});

module.exports = { test, expect: base.expect };
