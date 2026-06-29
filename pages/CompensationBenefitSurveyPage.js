const BasePage = require('./BasePage');

/**
 * Page object for the Compensation and Benefit survey section.
 */
class CompensationBenefitSurveyPage extends BasePage {
  constructor(page) {
    super(page);
    this.surveyTitle = page.getByRole('heading', {
      name: 'Compensation and Benefit survey',
      level: 2,
    });
  }

  async waitForSurveyPage() {
    await this.surveyTitle.waitFor({ state: 'visible', timeout: 30000 });
  }

  async ensureOnSurveyPage(leaderboardPage, globalNavPage, onboardingPage) {
    if (await this.surveyTitle.isVisible().catch(() => false)) {
      return;
    }

    await leaderboardPage.ensureOnLeaderboardPage(globalNavPage, onboardingPage);
    await leaderboardPage.clickCompensationSurvey();
    await this.waitForSurveyPage();
  }
}

module.exports = CompensationBenefitSurveyPage;
