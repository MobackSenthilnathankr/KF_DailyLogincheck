const BasePage = require('./BasePage');
const { getPayDashboardRoot, getDashboardProductCard } = require('./locators/payLocators');

/**
 * Page object for the Korn Ferry Pay home page.
 */
class PayHomePage extends BasePage {
  constructor(page) {
    super(page);
    this.dashboardLink = page
      .getByRole('link', { name: 'Dashboard', exact: true })
      .or(page.getByRole('button', { name: 'Dashboard', exact: true }))
      .or(page.getByText('Dashboard', { exact: true }));

    this.singleJobPricingCard = getDashboardProductCard(page, /single job pricing/i);
    this.singleJobPricingLink = this.singleJobPricingCard
      .getByRole('link', { name: /click here to access our single job pricing app/i })
      .or(this.singleJobPricingCard.getByText(/click here to access our single job pricing app/i));

    this.hcmIntegrationCard = getDashboardProductCard(page, /Automated HCM Data Integration/i);
    this.hcmJoinInterestListButton = this.hcmIntegrationCard.getByRole('button', {
      name: /join interest list/i,
    });

    this.countryLinks = getPayDashboardRoot(page)
      .locator('.secondary-country a')
      .filter({ hasNotText: /Level & Function|Model Job Match & Level/ })
      .or(
        page
          .locator('.secondary-country a')
          .filter({ hasNotText: /Level & Function|Model Job Match & Level/ }),
      );

    this.fallbackCountries = ['United States of America', 'Australia'];
  }

  async waitForPayHome() {
    await this.page.waitForURL(/pay\.kornferrytalent/, { timeout: 30000 });
    await this.dashboardLink.first().waitFor({ state: 'visible', timeout: 60000 });
  }

  async clickDashboard() {
    await this.dashboardLink.first().click();
    await this.page.waitForURL(/newBeta|pay\/payh/, { timeout: 30000 });
    await this.dashboardLink.first().waitFor({ state: 'visible', timeout: 30000 });
  }

  async openSingleJobPricing() {
    await this.singleJobPricingCard.scrollIntoViewIfNeeded();
    await this.singleJobPricingLink.click();
    await this.page.waitForURL(/sjpr\/pricing-selection/, { timeout: 30000 });
  }

  async openHcmJoinInterestList() {
    await this.ensureOnPayDashboard();
    await this.hcmIntegrationCard.waitFor({ state: 'visible', timeout: 30000 });
    await this.hcmIntegrationCard.scrollIntoViewIfNeeded();
    await this.hcmJoinInterestListButton.click();
    await this.page.waitForURL(/HRIS-Connections/, { timeout: 30000 });
  }

  isOnMainPayDashboard() {
    return /newBeta|pay\/payh/.test(this.page.url());
  }

  getExpectedPayHostname() {
    try {
      return new URL(this.baseUrl).hostname.replace(/^home\./, 'pay.');
    } catch {
      return 'pay.kornferrytalent';
    }
  }

  isOnExpectedPayEnvironment() {
    try {
      return new URL(this.page.url()).hostname === this.getExpectedPayHostname();
    } catch {
      return false;
    }
  }

  async navigateToMainPayDashboard() {
    const payOrigin = `https://${this.getExpectedPayHostname()}`;
    await this.page.goto(`${payOrigin}/app/payh/#/payh/pay/newBeta`, {
      waitUntil: 'domcontentloaded',
    });
    await this.waitForPayHome();
  }

  async clickRandomCountry() {
    await this.countryLinks.first().waitFor({ state: 'visible', timeout: 30000 });
    const count = await this.countryLinks.count();
    const randomIndex = Math.floor(Math.random() * count);
    await this.clickCountryLink(this.countryLinks.nth(randomIndex));
  }

  async clickCountryByName(countryName) {
    const countryLink = this.countryLinks.filter({ hasText: new RegExp(`^${countryName}$`) });
    await countryLink.first().waitFor({ state: 'attached', timeout: 30000 });
    await countryLink.first().scrollIntoViewIfNeeded();
    await countryLink.first().waitFor({ state: 'visible', timeout: 10000 });
    await this.clickCountryLink(countryLink.first());
  }

  async returnToDashboard() {
    await this.clickDashboard();
    await this.waitForPayHome();
    await this.countryLinks.first().scrollIntoViewIfNeeded();
  }

  /**
   * Navigate back to the Pay dashboard from SJP, HCM, or market pages.
   */
  async ensureOnPayDashboard() {
    if (!this.isOnExpectedPayEnvironment()) {
      throw new Error('Unable to return to Pay dashboard');
    }

    try {
      await this.waitForPayHome();
      if (this.isOnMainPayDashboard()) {
        return;
      }
    } catch {
      // Continue recovery below.
    }

    if (await this.dashboardLink.first().isVisible().catch(() => false)) {
      await this.clickDashboard();
      return;
    }

    if (this.page.url().includes('pay.kornferrytalent')) {
      await this.navigateToMainPayDashboard();
      return;
    }

    throw new Error('Unable to return to Pay dashboard');
  }

  async clickCountryLink(countryLink) {
    await countryLink.scrollIntoViewIfNeeded();
    await countryLink.click();
    await this.page.waitForURL(/market\/\d+\/reports/, { timeout: 30000 });
  }
}

module.exports = PayHomePage;
