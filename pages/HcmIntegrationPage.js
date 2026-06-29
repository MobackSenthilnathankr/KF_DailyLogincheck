const BasePage = require('./BasePage');
const {
  getHcmPageHeading,
  getHcmVendorCards,
  getHcmCancelButton,
} = require('./locators/payLocators');

/**
 * Page object for the Automated HCM Data Integration interest list page.
 */
class HcmIntegrationPage extends BasePage {
  constructor(page) {
    super(page);
    this.pageHeading = getHcmPageHeading(page);
    this.joinedPageHeading = page.getByText(/joined the list/i);
    this.connectionStatus = page.getByText(/Connection requested/i);
    this.connectionCards = getHcmVendorCards(page);
    this.cancelButton = getHcmCancelButton(page);
    this.hrSystemCards = this.connectionCards.filter({
      hasNot: this.connectionStatus,
    });
  }

  async waitForHcmPage() {
    await this.page.waitForURL(/HRIS-Connections/, { timeout: 30000 });
    await this.pageHeading.waitFor({ state: 'visible', timeout: 30000 });
  }

  async isReturningUser() {
    return this.joinedPageHeading.isVisible().catch(() => false);
  }

  async clickRandomHrSystemCard() {
    const cards = this.hrSystemCards;
    await cards.first().waitFor({ state: 'visible', timeout: 15000 });

    const count = await cards.count();
    if (count === 0) {
      throw new Error('No selectable HR system cards found on HCM join page');
    }

    const startIndex = Math.floor(Math.random() * count);
    let lastError;

    for (let attempt = 0; attempt < count; attempt += 1) {
      const card = cards.nth((startIndex + attempt) % count);

      try {
        await card.scrollIntoViewIfNeeded();
        await card.click({ timeout: 10000 });
        await this.cancelButton.waitFor({ state: 'visible', timeout: 10000 });
        return;
      } catch (error) {
        lastError = error;
        await this.page.keyboard.press('Escape').catch(() => {});
      }
    }

    throw lastError || new Error('No HR system card opened the interest form');
  }

  async clickCancel() {
    await this.cancelButton.click();
    await this.cancelButton.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Verifies the HCM page for first-time join or returning users.
   */
  async completeInterestListFlow() {
    if (await this.isReturningUser()) {
      await this.connectionCards.first().waitFor({ state: 'visible', timeout: 15000 });
      await this.connectionStatus.first().waitFor({ state: 'visible', timeout: 15000 });
      return;
    }

    await this.clickRandomHrSystemCard();
    await this.clickCancel();
  }
}

module.exports = HcmIntegrationPage;
