const BasePage = require('./BasePage');

/**
 * Page object for Data Submission quick tool hover menu and views.
 */
class DataSubmissionPage extends BasePage {
  constructor(page) {
    super(page);
    this.dataSubmissionTab = page.locator('.data-submission-tab-width').first();
    this.leaderboardLink = page.locator('a.leaderboard-text');
    this.multiEntityLink = page.locator('a.multi-entity-text');
    this.multiCountryLink = page.locator('a.multi-country-text');
    this.dataGroupsTitle = page.getByText('Data Groups', { exact: true });
    this.assignedToYouTitle = page.getByText('Assigned To You', { exact: true });
    this.dataSubmissionTabHeader = page.locator('b.tab-header').filter({ hasText: /^Data Submission$/ });
    this.noTasksMessage = page.getByText(/no data submission task assigned to you/i);
  }

  async dismissHoverMenus() {
    await this.page.mouse.move(0, 0);
    await this.page.waitForTimeout(500);
  }

  async openDataSubmissionTabIfPresent() {
    if (await this.dataSubmissionTabHeader.isVisible().catch(() => false)) {
      await this.dismissHoverMenus();
      await this.dataSubmissionTabHeader.scrollIntoViewIfNeeded();
      await this.dataSubmissionTabHeader.click({ timeout: 30000 });
      await this.dataSubmissionTab.waitFor({ state: 'visible', timeout: 15000 });
    }
  }

  async hoverDataSubmission() {
    await this.dataSubmissionTab.waitFor({ state: 'visible', timeout: 15000 });
    await this.dataSubmissionTab.scrollIntoViewIfNeeded();
    await this.dataSubmissionTab.hover();
    await this.leaderboardLink.waitFor({ state: 'visible', timeout: 15000 });
  }

  async clickLeaderboardLink() {
    await this.hoverDataSubmission();
    await this.leaderboardLink.click();
    await this.page.waitForTimeout(2000);
    await this.page.mouse.move(0, 0);
  }

  async clickMultiEntityLink() {
    await this.hoverDataSubmission();
    await this.multiEntityLink.waitFor({ state: 'visible', timeout: 15000 });

    const className = await this.multiEntityLink.getAttribute('class');
    if (className?.includes('disabledClass')) {
      throw new Error('Multi-Entity link is disabled for this account');
    }

    await this.multiEntityLink.click();
    await this.page.mouse.move(0, 0);
  }

  async clickMultiCountryLink() {
    await this.hoverDataSubmission();
    await this.multiCountryLink.waitFor({ state: 'visible', timeout: 15000 });

    const className = await this.multiCountryLink.getAttribute('class');
    if (className?.includes('disabledClass')) {
      throw new Error('Multi-Country link is disabled for this account');
    }

    await this.multiCountryLink.click();
    await this.page.mouse.move(0, 0);
  }

  async selectDataGroupsView() {
    if (await this.dataGroupsTitle.isVisible().catch(() => false)) {
      return;
    }

    const viewByButton = this.page.locator('button').filter({ hasText: /^Company$|^Country$/ }).first();
    if (!(await viewByButton.isVisible().catch(() => false))) {
      return;
    }

    await this.page.mouse.move(0, 0);
    await viewByButton.scrollIntoViewIfNeeded();
    await viewByButton.click({ force: true });

    const dataGroupsOption = this.page
      .getByRole('menuitem', { name: 'Data Groups' })
      .or(this.page.getByText('Data Groups', { exact: true }));
    if (await dataGroupsOption.isVisible().catch(() => false)) {
      await dataGroupsOption.click({ force: true });
    }
  }

  get leaderboardViewTitle() {
    return this.dataGroupsTitle.or(this.assignedToYouTitle);
  }

  async waitForDataGroupsPage() {
    await this.selectDataGroupsView();
    await this.leaderboardViewTitle.first().waitFor({ state: 'visible', timeout: 30000 });
  }
}

module.exports = DataSubmissionPage;
