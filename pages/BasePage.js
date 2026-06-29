const envConfig = require('../config/env.config');

/**
 * Base page object — shared navigation and utility methods for all pages.
 */
class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.baseUrl = envConfig.baseUrl;
  }

  async goto(path = '/') {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  /**
   * @param {string} baseUrl
   */
  setBaseUrl(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getTitle() {
    return this.page.title();
  }

  async getCurrentUrl() {
    return this.page.url();
  }

  async takeScreenshot(name) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}

module.exports = BasePage;
