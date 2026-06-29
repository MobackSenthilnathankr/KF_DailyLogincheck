const BasePage = require('./BasePage');

/**
 * Page object for Pay market reports (country market overview and interactive reports).
 */
class MarketReportsPage extends BasePage {
  constructor(page) {
    super(page);
    this.loadingMask = page.locator('kfpayh-mask');
    this.interactiveReportsTab = page
      .locator('a')
      .filter({ hasText: /^Interactive Reports$/ });
    this.viewRewardBenchmarkingLink = page.getByText(/^View Reward Benchmarking$/).first();
  }

  async waitForMarketPage() {
    await this.page.waitForURL(/market\/\d+\/reports/, { timeout: 30000 });
    await this.loadingMask.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  }

  async openInteractiveReports() {
    await this.loadingMask.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.interactiveReportsTab.last().click({ force: true });
    await this.viewRewardBenchmarkingLink.waitFor({ state: 'visible', timeout: 30000 });
  }

  async openViewRewardBenchmarking() {
    await this.viewRewardBenchmarkingLink.click();
    await this.page.waitForURL(/REWARD_SNAPSHOT/, { timeout: 60000 });
  }

  async openRewardBenchmarkingReport() {
    await this.waitForMarketPage();
    await this.openInteractiveReports();
    await this.openViewRewardBenchmarking();
  }
}

module.exports = MarketReportsPage;
