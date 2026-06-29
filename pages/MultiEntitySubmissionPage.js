const BasePage = require('./BasePage');

/**
 * Page object for the Multi-Entity Data Submission popup flow.
 */
class MultiEntitySubmissionPage extends BasePage {
  constructor(page) {
    super(page);
    this.popupTitle = page.getByText('Multi-Entity Data Submission', { exact: true });
    this.continueButton = page.getByRole('button', { name: /^Continue$/i });
    this.cancelButton = page.getByRole('button', { name: /^Cancel$/i });
    this.groupMyTasksTitle = page.getByText('Group My Tasks', { exact: true });
  }

  async waitForPopup() {
    await this.popupTitle.waitFor({ state: 'visible', timeout: 30000 });
  }

  async clickContinue() {
    await this.continueButton.click();
  }

  async waitForGroupMyTasksPage() {
    await this.groupMyTasksTitle.waitFor({ state: 'visible', timeout: 30000 });
  }

  async clickCancel() {
    await this.cancelButton.click();
  }
}

module.exports = MultiEntitySubmissionPage;
