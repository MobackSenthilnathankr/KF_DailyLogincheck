const BasePage = require('./BasePage');

/**
 * Page object for the data collection leaderboard page.
 */
class LeaderboardPage extends BasePage {
  constructor(page) {
    super(page);
    this.onboardingLink = page.getByText('Onboarding', { exact: true });
    this.dataSubmissionLink = page.getByText('Data Submission', { exact: true });
    this.compensationSurveyLink = page.getByText('Compensation and Benefit survey', {
      exact: true,
    });
    this.surveyTitle = page.getByRole('heading', {
      name: 'Compensation and Benefit survey',
      level: 2,
    });
  }

  isOnLeaderboardPage() {
    return /leaderboard|pdct/i.test(this.page.url());
  }

  async dismissHoverMenus() {
    await this.page.mouse.move(0, 0);
    await this.page.waitForTimeout(500);
  }

  async waitForLeaderboardPage() {
    await this.page.waitForURL(/leaderboard|pdct/, { timeout: 60000 });
    await this.onboardingLink.first().waitFor({ state: 'visible', timeout: 30000 });
    await this.dataSubmissionLink.first().waitFor({ state: 'visible', timeout: 30000 });
    await this.compensationSurveyLink.first().waitFor({ state: 'visible', timeout: 30000 });
  }

  async ensureOnLeaderboardPage(globalNavPage, onboardingPage) {
    if (this.isOnLeaderboardPage()) {
      await this.waitForLeaderboardPage();
      return;
    }

    await globalNavPage.openOrganizationData();
    await onboardingPage.waitForOnboardingPage();
    await onboardingPage.clickLeaderboard();
    await this.waitForLeaderboardPage();
  }

  async clickCompensationSurvey() {
    if (await this.surveyTitle.isVisible().catch(() => false)) {
      return;
    }

    await this.dismissHoverMenus();
    const compensationTab = this.compensationSurveyLink.first();
    await compensationTab.waitFor({ state: 'visible', timeout: 30000 });
    await compensationTab.scrollIntoViewIfNeeded();
    await compensationTab.click({ timeout: 30000 });
  }
}

module.exports = LeaderboardPage;
