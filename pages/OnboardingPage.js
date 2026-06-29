const BasePage = require('./BasePage');

/**
 * Page object for the Organization Data onboarding landing page.
 */
class OnboardingPage extends BasePage {
  constructor(page) {
    super(page);
    this.welcomeTitle = page.getByText(/Welcome.*set up your organization/i);
    this.leaderboardLink = page.getByRole('link', { name: 'Leaderboard' });
  }

  async waitForOnboardingPage() {
    await this.page.waitForURL(/onboarding/, { timeout: 60000 });
    await this.leaderboardLink.waitFor({ state: 'visible', timeout: 30000 });
  }

  async clickLeaderboard() {
    await this.leaderboardLink.click();
    await this.page.waitForURL(/leaderboard/, { timeout: 60000 });
  }
}

module.exports = OnboardingPage;
