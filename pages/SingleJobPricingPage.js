const BasePage = require('./BasePage');

/**
 * Page object for the Single Job Pricing selection page.
 */
class SingleJobPricingPage extends BasePage {
  constructor(page) {
    super(page);
    this.downloadJobModel = page.getByText('Download Job Model', { exact: true });
    this.jobPricingHeading = page.getByRole('heading', { name: /job pricing/i });
  }

  async waitForPricingPage() {
    await this.page.waitForURL(/sjpr\/pricing-selection/, { timeout: 30000 });
    await this.downloadJobModel.waitFor({ state: 'visible', timeout: 30000 });
  }
}

module.exports = SingleJobPricingPage;
