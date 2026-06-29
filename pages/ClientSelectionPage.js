const BasePage = require('./BasePage');

/**
 * Page object for the Clients screen shown after login for multi-client users.
 */
class ClientSelectionPage extends BasePage {
  constructor(page) {
    super(page);
    this.clientListHeading = page.getByRole('heading', { name: 'Clients', exact: true });
    this.clientSearchInput = page.getByPlaceholder(/search by client name or pams id/i);
    this.clientsTable = page.locator('table');
    this.noDataMessage = page.getByText(/no data available/i);
  }

  isOnClientSelectionPage() {
    return /\/client\/?$/.test(new URL(this.page.url()).pathname);
  }

  async isClientListPresent() {
    if (!this.isOnClientSelectionPage()) {
      return false;
    }

    try {
      await this.clientSearchInput.waitFor({ state: 'visible', timeout: 60000 });
      await this.clientsTable.waitFor({ state: 'visible', timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  async searchClients(searchTerm) {
    await this.clientSearchInput.fill(searchTerm);
    await this.page.waitForTimeout(2000);
  }

  async clickFirstClientInTable() {
    const clientLink = this.clientsTable.locator('tbody tr a').first();
    await clientLink.waitFor({ state: 'visible', timeout: 15000 });
    await clientLink.click();
    await this.waitForHomePage();
  }

  async waitForHomePage() {
    await this.page.getByText('Your Products', { exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  }

  async searchAndSelectByPamsId(pamsId) {
    if (!pamsId) {
      throw new Error('TEST_PAMS_ID is required when the client selection page is shown');
    }

    await this.searchClients(pamsId);

    if (await this.noDataMessage.isVisible().catch(() => false)) {
      throw new Error(`No client found for PAMS ID: ${pamsId}`);
    }

    await this.clickFirstClientInTable();
  }

  async selectClientByPamsIdIfPresent(pamsId) {
    if (!this.isOnClientSelectionPage()) {
      return false;
    }

    if (!(await this.isClientListPresent())) {
      throw new Error('Client selection page did not finish loading');
    }

    await this.searchAndSelectByPamsId(pamsId);
    return true;
  }
}

module.exports = ClientSelectionPage;
