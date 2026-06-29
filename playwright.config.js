// @ts-check

const { defineConfig } = require('@playwright/test');

require('dotenv').config();

const envConfig = require('./config/env.config');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./config/allure-global-setup'),
  globalTeardown: require.resolve('./config/allure-global-teardown'),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report', title: 'Login check' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['allure-playwright', {
      resultsDir: 'allure-results',
      detail: true,
      suiteTitle: true,
      environmentInfo: {
        node_version: process.version,
        environment: envConfig.environment,
        base_url: envConfig.baseUrl,
        username: envConfig.username,
      },
    }],
  ],

  use: {
    baseURL: envConfig.baseUrl,
    headless: envConfig.keepBrowserOpen ? false : envConfig.headless,
    launchOptions: {
      slowMo: envConfig.slowMo,
      args: process.env.CI ? ['--no-sandbox'] : ['--start-maximized'],
    },
    viewport: null,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },

  projects: [
    {
      name: 'chrome',
      use: {
        channel: 'chrome',
        viewport: null,
        deviceScaleFactor: undefined,
      },
    },
  ],

  outputDir: 'test-results/artifacts',
});
