const BasePage = require('./BasePage');

/**
 * Page object for the Reward Benchmarking interactive report.
 */
class RewardBenchmarkingPage extends BasePage {
  constructor(page) {
    super(page);
    this.rewardBenchmarkingTitle = page.getByText('Reward Benchmarking', { exact: true });
    this.filterButton = page
      .locator('kfpayh-report-filters-bar')
      .getByText('Filters', { exact: true });
  }

  async waitForRewardBenchmarkingPage() {
    await this.page.waitForURL(/REWARD_SNAPSHOT/, { timeout: 60000 });
    await this.rewardBenchmarkingTitle.first().waitFor({ state: 'visible', timeout: 60000 });
    await this.filterButton.waitFor({ state: 'visible', timeout: 30000 });
  }

  async clickFilter() {
    await this.filterButton.click();
  }

  async dismissFilterPanel() {
    await this.page.keyboard.press('Escape').catch(() => {});
    if (await this.filterButton.isVisible().catch(() => false)) {
      await this.filterButton.click().catch(() => {});
    }
  }
}

module.exports = RewardBenchmarkingPage;
