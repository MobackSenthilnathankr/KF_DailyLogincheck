const BasePage = require('./BasePage');

/**
 * Page object for the Korn Ferry Talent Suite home page after login.
 */
class HomePage extends BasePage {
  constructor(page) {
    super(page);
    this.yourProductsHeading = page.getByText('Your Products', { exact: true });
    this.payProductIcon = page.getByTestId('Pay');
  }

  async waitForHomePage() {
    await this.page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30000 });
    await this.yourProductsHeading.waitFor({ state: 'visible', timeout: 30000 });
  }

  async openPayProduct() {
    await this.payProductIcon.click();
  }
}

module.exports = HomePage;
