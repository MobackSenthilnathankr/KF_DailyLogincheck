const BasePage = require('./BasePage');
const envConfig = require('../config/env.config');

const LOGIN_ROUTE_POLL_MS = 200;
const LOGIN_ROUTE_TIMEOUT_MS = 30 * 1000;

/** @enum {string} */
const PostLoginRoute = {
  ADMIN_CLIENT_LIST: 'ADMIN_CLIENT_LIST',
  STANDARD_PAY_HOME: 'STANDARD_PAY_HOME',
  CLASSIC_SEARCH: 'CLASSIC_SEARCH',
};

/**
 * Page object for Korn Ferry Talent Suite login and post-login navigation.
 * Converted from the Java Selenium LoginPage (login, client selection, open Pay).
 */
class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.emailInput = page.locator('#email-input');
    this.passwordInput = page.locator('input[type="password"]');
    this.emailTypeInput = page.locator('input[type="email"]');
    this.signInButton = page.locator('#submit-button');
    this.submitButton = page.locator('input[type="submit"], button[type="submit"]');
    this.cookieAcceptButton = page.locator('#truste-consent-button');
    this.goBackButton = page.locator('#go-back');
    this.languageButton = page.locator('#languageSelection_button');
    this.payProductTile = page.locator('[data-testid="Pay"]');
    this.pageLoadSpinner = page.locator('[data-testid="kf-loader"]');
    this.classicSearchInput = page.locator('#search-client-input input');
    this.adminClientSearchInput = page.getByPlaceholder(/search by client name or pams id/i);
    this.clientsTable = page.locator('table');
    this.clientsHeading = page.getByRole('heading', { name: 'Clients', exact: true });
    this.noDataMessage = page.getByText(/no data available/i);
    this.yourProductsHeading = page.getByText('Your Products', { exact: true });
    this.clientSearchInputs = page.locator(
      '#search-client-input input, input[placeholder*="Client Name" i], input[placeholder*="PAMS" i]',
    );
    this.deliveryAccessOnlyLabel = page.getByText(/Delivery Access only/i);
    this.clientListAccessTypeHeader = page.locator(
      'xpath=//th[contains(normalize-space(),"Access Type")] | //*[contains(@class,"table")]//*[contains(normalize-space(),"Access Type")]',
    );
    this.primaryClientBadge = page.getByText(/Primary Client/i);
    this.primaryClientLinks = [
      page.locator('xpath=//tr[.//*[contains(normalize-space(),"Primary Client")]]//a[1]'),
      page.locator('xpath=//*[contains(normalize-space(),"Primary Client")]/ancestor::tr[1]//a[1]'),
      page.locator('xpath=//*[contains(normalize-space(),"Primary Client")]/ancestor::*[@role="row"][1]//a[1]'),
      page.locator(
        'xpath=//*[contains(normalize-space(),"Primary Client")]/ancestor::*[contains(@class,"row") or contains(@class,"Row")][1]//a[1]',
      ),
      page.locator(
        'xpath=//*[contains(normalize-space(),"Primary Client")]/ancestor::*[contains(@class,"table") or contains(@class,"grid")][1]//a[1]',
      ),
    ];
  }

  /**
   * Opens the application URL for the configured environment.
   */
  async launchApp() {
    const url = (this.baseUrl || this.resolveEnvironmentUrl()).replace(/\/$/, '');
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    console.log(`Launched at ${url}`);
  }

  /** @deprecated Use launchApp() — kept for backward compatibility */
  async open() {
    await this.goto('/login');
  }

  resolveEnvironmentUrl() {
    const urls = {
      dev: process.env.DEV_URL || process.env.BASE_URL_DEV,
      test: process.env.TEST_URL,
      stage: process.env.BASE_URL_STAGE || process.env.STAGE_URL,
      staging: process.env.BASE_URL_STAGE || process.env.STAGE_URL,
      prod_us: process.env.BASE_URL_PROD_US || process.env.PROD_US_URL,
      produs: process.env.BASE_URL_PROD_US || process.env.PROD_US_URL,
      prod_eu: process.env.BASE_URL_PROD_EU || process.env.PROD_EU_URL,
      prodeu: process.env.BASE_URL_PROD_EU || process.env.PROD_EU_URL,
      prodhk: process.env.PROD_HK_URL,
    };
    const key = (envConfig.environment || 'dev').toLowerCase();
    return urls[key] || envConfig.baseUrl;
  }

  async acceptAllCookies() {
    await this.cookieAcceptButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.cookieAcceptButton.click();
  }

  /**
   * Step 1 of login: accept cookies, enter email, submit.
   * @param {string} [username]
   */
  async userLogin(username = envConfig.username) {
    await this.acceptAllCookies();
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.emailInput.fill(username);
    await this.signInButton.click();
  }

  /**
   * Step 2 of login: enter password and submit.
   * @param {string} [password]
   */
  async userPassword(password = envConfig.password) {
    await this.passwordInput.waitFor({ state: 'visible', timeout: 35000 });
    await this.passwordInput.fill(password).catch(() => {});
    const submit = this.signInButton.or(this.submitButton).first();
    await submit.click();
    await this.page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 35000 });
  }

  /**
   * Full credential login (email step + password step).
   * @param {string} email
   * @param {string} password
   */
  async loginWithCredentials(email, password) {
    await this.userLogin(email);
    await this.userPassword(password);
  }

  /**
   * Try login with the primary user, then fallback user(s) on failure.
   * Call launchApp() before this for the first attempt.
   * @param {string[]} usernames
   * @param {string} password
   * @returns {Promise<string>} username that succeeded
   */
  async loginWithFallbackUsers(usernames, password) {
    const uniqueUsers = [...new Set(usernames.filter(Boolean))];
    const errors = [];

    for (let index = 0; index < uniqueUsers.length; index += 1) {
      const username = uniqueUsers[index];
      const isRetry = index > 0;

      try {
        if (isRetry) {
          console.log(`Retrying login with fallback user: ${username}`);
          await this.launchApp();
        }

        await this.userLogin(username);
        await this.userPassword(password);
        await this.navigateToClientAndOpenPay();

        if (isRetry) {
          console.log(`Login succeeded with fallback user: ${username}`);
        }

        return username;
      } catch (error) {
        const message = error.message.split('\n')[0];
        errors.push(`${username}: ${message}`);
        console.log(`Login failed for ${username}: ${message}`);
      }
    }

    throw new Error(`All login attempts failed:\n${errors.join('\n')}`);
  }

  /**
   * Detect post-login route, select client when required, and open Pay.
   */
  async navigateToClientAndOpenPay() {
    const route = await this.waitForPostLoginRoute();
    console.log(`Post-login route detected: ${route}`);
    await this.selectClientIfNeeded(route);
    await this.openPayApplication();
  }

  async waitForPostLoginRoute() {
    const deadline = Date.now() + LOGIN_ROUTE_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const route = await this.detectPostLoginRoute();
      if (route) {
        return route;
      }
      await this.page.waitForTimeout(LOGIN_ROUTE_POLL_MS);
    }

    const route = await this.detectPostLoginRoute();
    if (route) {
      return route;
    }

    throw new Error(`Post-login page did not load within ${LOGIN_ROUTE_TIMEOUT_MS / 1000}s`);
  }

  async detectPostLoginRoute() {
    const url = this.page.url();

    if (await this.isAdminClientListPage()) {
      return PostLoginRoute.ADMIN_CLIENT_LIST;
    }

    if (await this.isClassicClientSearchPage()) {
      return PostLoginRoute.CLASSIC_SEARCH;
    }

    if (await this.isPayProductHomeReady()) {
      return PostLoginRoute.STANDARD_PAY_HOME;
    }

    if (url.includes('/client')) {
      return PostLoginRoute.ADMIN_CLIENT_LIST;
    }

    return null;
  }

  async isAdminClientListPage() {
    const url = this.page.url();
    if (url.includes('/client')) {
      return true;
    }
    if (await this.clientsHeading.isVisible().catch(() => false)) {
      return true;
    }
    if (await this.adminClientSearchInput.isVisible().catch(() => false)) {
      return true;
    }
    if (await this.isPayProductHomeReady()) {
      return false;
    }
    return (await this.deliveryAccessOnlyLabel.count() > 0)
      && (await this.clientListAccessTypeHeader.count() > 0);
  }

  async isClassicClientSearchPage() {
    if (await this.isAdminClientListPage()) {
      return false;
    }
    return this.classicSearchInput.count().then((count) => count > 0);
  }

  /**
   * @param {string} route
   */
  async selectClientIfNeeded(route) {
    if (route === PostLoginRoute.STANDARD_PAY_HOME) {
      console.log('Standard user login — Pay home ready, skipping client selection');
      return;
    }

    if (route === PostLoginRoute.ADMIN_CLIENT_LIST) {
      console.log('Admin login — client list detected');
      await this.enableDeliveryAccessOnlyIfPresent();
      if (await this.selectPrimaryClientFromList()) {
        await this.waitUntilLeftClientListPage();
        return;
      }
      if (await this.selectClientFromAdminList()) {
        await this.waitUntilLeftClientListPage();
        return;
      }
      if (await this.selectClientByConfiguredName()) {
        await this.waitUntilLeftClientListPage();
        return;
      }
      throw new Error(
        'On client list page but could not select a client. Set TEST_CLIENT_NAME or TEST_PAMS_ID in .env',
      );
    }

    if (route === PostLoginRoute.CLASSIC_SEARCH) {
      console.log('Classic home — selecting client from search');
      const selected = await this.selectClientByConfiguredName();
      if (!selected && (await this.isClientListPage())) {
        throw new Error('Could not select configured client before opening Pay');
      }
    }
  }

  async isPayProductHomeReady() {
    const count = await this.payProductTile.count();
    if (count === 0) {
      return false;
    }
    return this.payProductTile.first().isVisible().catch(() => false);
  }

  async isClientListPage() {
    return this.isAdminClientListPage();
  }

  getConfiguredClientSearchTerm() {
    const clientName = envConfig.clientName?.trim();
    const pamsId = envConfig.pamsId?.trim();
    if (pamsId) {
      return { searchTerm: pamsId, displayName: clientName || pamsId };
    }
    if (clientName) {
      return { searchTerm: clientName, displayName: clientName };
    }
    return null;
  }

  requireConfiguredClientSearchTerm() {
    const configured = this.getConfiguredClientSearchTerm();
    if (!configured) {
      throw new Error(
        'TEST_CLIENT_NAME or TEST_PAMS_ID is required when the client selection page is shown',
      );
    }
    return configured;
  }

  async waitUntilLeftClientListPage() {
    await this.page.waitForFunction(
      () => {
        const onClient = window.location.href.includes('/client');
        if (onClient) {
          return false;
        }
        const payTile = document.querySelector('[data-testid="Pay"]');
        const yourProducts = Array.from(document.querySelectorAll('*')).some(
          (el) => el.textContent?.trim() === 'Your Products',
        );
        return Boolean(payTile || yourProducts);
      },
      { timeout: 30000, polling: LOGIN_ROUTE_POLL_MS },
    );
    await this.yourProductsHeading.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  }

  async enableDeliveryAccessOnlyIfPresent() {
    const labelCount = await this.deliveryAccessOnlyLabel.count();
    if (labelCount === 0) {
      return;
    }

    const toggleLocators = [
      this.page.locator(
        'xpath=//*[contains(normalize-space(),"Delivery Access only")]/following-sibling::*[@role="switch" or contains(@class,"switch") or contains(@class,"toggle")][1]',
      ),
      this.page.locator(
        'xpath=//*[contains(normalize-space(),"Delivery Access only")]/parent::*//*[@role="switch" or contains(@class,"switch") or contains(@class,"toggle") or contains(@class,"slide-toggle")][1]',
      ),
      this.page.locator(
        'xpath=//*[contains(normalize-space(),"Delivery Access only")]/ancestor::*[contains(@class,"filter") or contains(@class,"toggle")][1]//*[@role="switch" or contains(@class,"switch") or contains(@class,"toggle")][1]',
      ),
      this.page.locator(
        'xpath=//*[contains(normalize-space(),"Delivery Access only")]/following::*[@role="switch"][1]',
      ),
      this.page.locator('xpath=//label[contains(normalize-space(),"Delivery Access only")]/..//input[@type="checkbox"]'),
    ];

    for (const toggle of toggleLocators) {
      if (await toggle.count() === 0) {
        continue;
      }
      const element = toggle.first();
      if (!(await this.isToggleEnabled(element))) {
        await this.scrollAndClick(element);
        console.log("Enabled 'Delivery Access only' filter on client list");
      }
      return;
    }

    const label = this.deliveryAccessOnlyLabel.first();
    const siblingToggle = label.locator('xpath=./following-sibling::*[1] | ./parent::*//*[@role="switch"][1]');
    if (await siblingToggle.count() > 0) {
      const toggle = siblingToggle.first();
      if (!(await this.isToggleEnabled(toggle))) {
        await this.scrollAndClick(toggle);
        console.log("Enabled 'Delivery Access only' via sibling toggle");
      }
      return;
    }

    await this.scrollAndClick(label);
  }

  /**
   * @param {import('@playwright/test').Locator} element
   */
  async scrollAndClick(element) {
    await element.scrollIntoViewIfNeeded();
    await element.click().catch(async () => {
      await element.click({ force: true });
    });
  }

  /**
   * @param {import('@playwright/test').Locator} toggle
   */
  async isToggleEnabled(toggle) {
    const ariaChecked = await toggle.getAttribute('aria-checked');
    if (ariaChecked != null) {
      return ariaChecked.toLowerCase() === 'true';
    }
    const checked = await toggle.getAttribute('checked');
    if (checked != null) {
      return checked.toLowerCase() === 'true';
    }
    const clazz = await toggle.getAttribute('class');
    return clazz != null && /checked|active|mat-checked/.test(clazz);
  }

  async selectPrimaryClientFromList() {
    if (await this.primaryClientBadge.count() === 0) {
      console.log('No Primary Client badge on client list — trying configured client next');
      return false;
    }

    try {
      let clientLink = await this.findPrimaryClientLink();
      if (!clientLink) {
        await this.primaryClientBadge.first().waitFor({ state: 'attached', timeout: 10000 });
        clientLink = await this.findPrimaryClientLink();
      }
      if (!clientLink) {
        console.warn('Primary Client badge found but client link was not located');
        return false;
      }
      const clientText = (await clientLink.innerText()).trim();
      await this.scrollAndClick(clientLink);
      console.log(`Selected primary client from list: ${clientText}`);
      return true;
    } catch (error) {
      console.warn(`Primary Client selection failed: ${error.message}`);
      return false;
    }
  }

  async selectClientFromAdminList() {
    if (!(await this.isAdminClientListPage())) {
      return false;
    }

    const configured = this.getConfiguredClientSearchTerm();
    if (!configured) {
      return false;
    }

    const { searchTerm, displayName } = configured;
    await this.adminClientSearchInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.clientsTable.waitFor({ state: 'visible', timeout: 15000 });
    await this.adminClientSearchInput.fill(searchTerm);
    await this.page.waitForTimeout(2000);

    if (await this.noDataMessage.isVisible().catch(() => false)) {
      throw new Error(`No client found for: ${searchTerm}`);
    }

    const namedLink = this.page.getByRole('link', { name: displayName, exact: true });
    if (await namedLink.count() > 0) {
      await this.scrollAndClick(namedLink.first());
      console.log(`Selected client from admin list by name: ${displayName}`);
      return true;
    }

    const clientLink = this.clientsTable.locator('tbody tr a').first();
    await clientLink.waitFor({ state: 'visible', timeout: 15000 });
    const clientText = (await clientLink.innerText()).trim();
    await this.scrollAndClick(clientLink);
    console.log(`Selected first client from admin list after search: ${clientText}`);
    return true;
  }

  async findPrimaryClientLink() {
    for (const locator of this.primaryClientLinks) {
      const count = await locator.count();
      for (let i = 0; i < count; i += 1) {
        const link = locator.nth(i);
        try {
          if (await link.isVisible()) {
            const text = (await link.innerText()).trim();
            if (text) {
              return link;
            }
          }
        } catch {
          // try next match
        }
      }
    }
    return null;
  }

  async selectClientByConfiguredName() {
    if (await this.isAdminClientListPage()) {
      return this.selectClientFromAdminList();
    }

    const configured = this.getConfiguredClientSearchTerm();
    if (!configured) {
      if (await this.isClassicClientSearchPage()) {
        this.requireConfiguredClientSearchTerm();
      }
      console.log('No client search UI and no client configured; assuming client already in context');
      return true;
    }

    const { searchTerm, displayName } = configured;

    if (await this.classicSearchInput.count() > 0) {
      const searchBox = this.classicSearchInput.first();
      await searchBox.clear();
      await searchBox.fill(searchTerm);
      const clientOption = this.page.getByText(displayName, { exact: true }).first();
      await clientOption.waitFor({ state: 'visible', timeout: 35000 });
      await this.scrollAndClick(clientOption);
      console.log(`Selected client from classic search: ${displayName}`);
      return true;
    }

    const tableLinkLocators = [
      this.page.locator(`xpath=//tr//a[normalize-space()="${displayName}"]`),
      this.page.getByRole('link', { name: displayName, exact: true }),
      this.page.locator(`xpath=//*[contains(@class,"row")]//a[normalize-space()="${displayName}"]`),
    ];

    for (const locator of tableLinkLocators) {
      if (await locator.count() > 0) {
        await this.scrollAndClick(locator.first());
        console.log(`Selected client from table by name: ${displayName}`);
        return true;
      }
    }

    return false;
  }

  async openPayApplication() {
    if (await this.isClientListPage()) {
      throw new Error('Still on client list page — client was not selected before opening Pay');
    }

    const payReady = await this.isPayProductHomeReady();
    const payTile = this.payProductTile.first();
    await payTile.waitFor({ state: 'visible', timeout: payReady ? 10000 : 35000 });
    await payTile.waitFor({ state: 'attached' });
    await this.scrollAndClick(payTile);
  }
}

module.exports = LoginPage;
