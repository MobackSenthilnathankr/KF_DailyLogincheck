const BasePage = require('./BasePage');

/**
 * Page object for the Multi-Country Data Submission popup flow.
 */
class MultiCountrySubmissionPage extends BasePage {
  constructor(page) {
    super(page);
    this.popupTitle = page.getByText('Multi-Country Data Submission', { exact: true });
    this.continueButton = page.getByRole('button', { name: /^Continue$/i });
    this.cancelButton = page.getByRole('button', { name: /^Cancel$/i });
  }

  async waitForPopup() {
    await this.popupTitle.waitFor({ state: 'visible', timeout: 30000 });
  }

  async clickContinue() {
    await this.continueButton.click();
  }

  async clickCancel() {
    await this.cancelButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.cancelButton.click();
  }
}

module.exports = MultiCountrySubmissionPage;
