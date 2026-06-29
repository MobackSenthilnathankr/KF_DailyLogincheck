const BasePage = require('./BasePage');

/**
 * Page object for the global navigation menu (hamburger).
 */
class GlobalNavPage extends BasePage {
  constructor(page) {
    super(page);
    this.menuButton = page.getByTestId('global-nav-menu-btn');
    this.exploreToolsSection = page.getByText('Explore tools and features', { exact: true });
    this.organizationDataLink = page
      .getByTestId(/^nav-menu-item/)
      .filter({ hasText: 'Organization Data' });
  }

  async openMenu() {
    await this.menuButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.menuButton.click();
    await this.exploreToolsSection.waitFor({ state: 'visible', timeout: 10000 });
  }

  async openOrganizationData() {
    await this.openMenu();
    await this.organizationDataLink.click();
    await this.page.waitForURL(/onboarding/, { timeout: 60000 });
  }
}

module.exports = GlobalNavPage;
