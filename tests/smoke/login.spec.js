const envConfig = require('../../config/env.config');
const fs = require('fs');
const path = require('path');
const { allure } = require('allure-playwright');
const { test, expect } = require('./smoke-fixtures');

const SMOKE_RESULTS_FILE = path.join(__dirname, '../../test-results/smoke-scenario-results.json');const LoginPage = require('../../pages/LoginPage');
const PayHomePage = require('../../pages/PayHomePage');
const SingleJobPricingPage = require('../../pages/SingleJobPricingPage');
const HcmIntegrationPage = require('../../pages/HcmIntegrationPage');
const MarketReportsPage = require('../../pages/MarketReportsPage');
const RewardBenchmarkingPage = require('../../pages/RewardBenchmarkingPage');
const GlobalNavPage = require('../../pages/GlobalNavPage');
const OnboardingPage = require('../../pages/OnboardingPage');
const LeaderboardPage = require('../../pages/LeaderboardPage');
const CompensationBenefitSurveyPage = require('../../pages/CompensationBenefitSurveyPage');
const DataSubmissionPage = require('../../pages/DataSubmissionPage');
const MultiEntitySubmissionPage = require('../../pages/MultiEntitySubmissionPage');
const MultiCountrySubmissionPage = require('../../pages/MultiCountrySubmissionPage');

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} baseUrl
 */
function createPageObjects(page, baseUrl) {
  const pages = {
    loginPage: new LoginPage(page),
    payHomePage: new PayHomePage(page),
    singleJobPricingPage: new SingleJobPricingPage(page),
    hcmIntegrationPage: new HcmIntegrationPage(page),
    marketReportsPage: new MarketReportsPage(page),
    rewardBenchmarkingPage: new RewardBenchmarkingPage(page),
    globalNavPage: new GlobalNavPage(page),
    onboardingPage: new OnboardingPage(page),
    leaderboardPage: new LeaderboardPage(page),
    compensationBenefitSurveyPage: new CompensationBenefitSurveyPage(page),
    dataSubmissionPage: new DataSubmissionPage(page),
    multiEntitySubmissionPage: new MultiEntitySubmissionPage(page),
    multiCountrySubmissionPage: new MultiCountrySubmissionPage(page),
  };

  Object.values(pages).forEach((pageObject) => pageObject.setBaseUrl(baseUrl));
  return pages;
}

/**
 * @param {ReturnType<typeof createPageObjects>} pages
 * @param {string} baseUrl
 */
function setPagesBaseUrl(pages, baseUrl) {
  Object.values(pages).forEach((pageObject) => pageObject.setBaseUrl(baseUrl));
}

function loadPersistedResults() {
  if (!fs.existsSync(SMOKE_RESULTS_FILE)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(SMOKE_RESULTS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * @param {string} envLabel
 * @param {{ title: string, status: string, error?: string }} result
 */
function persistScenarioResult(envLabel, result) {
  const allResults = loadPersistedResults();
  if (!allResults[envLabel]) {
    allResults[envLabel] = [];
  }

  const existingIndex = allResults[envLabel].findIndex((entry) => entry.title === result.title);
  if (existingIndex >= 0) {
    allResults[envLabel][existingIndex] = result;
  } else {
    allResults[envLabel].push(result);
  }

  fs.mkdirSync(path.dirname(SMOKE_RESULTS_FILE), { recursive: true });
  fs.writeFileSync(SMOKE_RESULTS_FILE, JSON.stringify(allResults, null, 2));
}

/**
 * @param {Array<{ title: string, status: string, error?: string }>} scenarioResults
 * @param {string} envLabel
 */
function createRunScenario(scenarioResults, envLabel) {
  /**
   * @param {string} title
   * @param {() => Promise<void>} scenario
   * @param {{ retries?: number, recover?: () => Promise<void> }} [options]
   */
  return async function runScenario(title, scenario, options = {}) {
    const canRetry = typeof options.recover === 'function';
    const maxAttempts = canRetry ? (options.retries ?? envConfig.scenarioRetries) + 1 : 1;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const stepName = attempt === 1 ? title : `${title} (retry ${attempt - 1})`;

      try {
        await test.step(stepName, async () => {
          if (attempt > 1) {
            await test.step('Recover starting position', options.recover);
          }
          await scenario();
        });

        const result = {
          title,
          status: attempt === 1 ? 'PASS' : 'PASS (after retry)',
        };
        scenarioResults.push(result);
        persistScenarioResult(envLabel, result);
        return true;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          console.log(`[RETRY] ${title} failed on attempt ${attempt}: ${error.message.split('\n')[0]}`);
        }
      }
    }

    const result = {
      title,
      status: 'FAIL',
      error: lastError.message,
    };
    scenarioResults.push(result);
    persistScenarioResult(envLabel, result);
    return false;
  };
}

/**
 * @param {string} envLabel
 * @param {Array<{ title: string, status: string, error?: string }>} scenarioResults
 */
function printScenarioSummary(envLabel, scenarioResults) {
  console.log(`\n========== Smoke Test Results (${envLabel}) ==========`);
  scenarioResults.forEach((result) => {
    console.log(`[${result.status}] ${result.title}`);
    if (result.error) {
      console.log(`       ${result.error.split('\n')[0]}`);
    }
  });

  const passed = scenarioResults.filter((result) => result.status === 'PASS').length;
  const failed = scenarioResults.filter((result) => result.status === 'FAIL').length;
  console.log(`\nTotal: ${scenarioResults.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('====================================================\n');
}

const LOGIN_SCENARIO_TITLE = 'should login with email and password';

/**
 * @param {ReturnType<typeof createPageObjects>} pages
 * @param {{ name: string, label: string, baseUrl: string }} envTarget
 */
async function reloginForEnvironment(pages, envTarget) {
  const { loginPage, payHomePage } = pages;
  const { usernames, password } = envConfig.getLoginAttemptsForEnvironment(envTarget.name);

  console.log(`[RECOVER] Re-logging in for ${envTarget.label}`);
  await loginPage.launchApp();
  await loginPage.loginWithFallbackUsers(usernames, password);
  await payHomePage.waitForPayHome();
}

/**
 * @param {ReturnType<typeof createPageObjects>} pages
 * @param {string} scenarioTitle
 * @param {{ name: string, label: string, baseUrl: string }} envTarget
 */
async function recoverBeforeScenario(pages, scenarioTitle, envTarget) {
  if (scenarioTitle === LOGIN_SCENARIO_TITLE) {
    return;
  }

  await test.step('Recover session for next scenario', async () => {
    const { payHomePage, leaderboardPage, globalNavPage, onboardingPage, compensationBenefitSurveyPage } =
      pages;

    try {
      if (scenarioTitle.includes('multi-country flow')) {
        await pages.dataSubmissionPage.openDataSubmissionTabIfPresent();
        await pages.dataSubmissionPage.hoverDataSubmission();
        return;
      }

      if (scenarioTitle.includes('data submission')) {
        await compensationBenefitSurveyPage.ensureOnSurveyPage(
          leaderboardPage,
          globalNavPage,
          onboardingPage,
        );
        return;
      }

      if (scenarioTitle.includes('Compensation and Benefit survey')) {
        await leaderboardPage.ensureOnLeaderboardPage(globalNavPage, onboardingPage);
        return;
      }

      await payHomePage.ensureOnPayDashboard();
    } catch (error) {
      console.log(
        `[RECOVER] Could not restore page state (${error.message.split('\n')[0]}), re-logging in`,
      );
      try {
        await reloginForEnvironment(pages, envTarget);
      } catch (reloginError) {
        console.log(`[RECOVER] Re-login failed: ${reloginError.message.split('\n')[0]}`);
      }
    }
  });
}

/**
 * @param {{ name: string, label: string, baseUrl: string }} envTarget
 */
function getSmokeScenarios(envTarget) {
  return [
    {
      title: 'should login with email and password',
      run: async (pages) => {
        const { loginPage, payHomePage } = pages;
        const { usernames, password } = envConfig.getLoginAttemptsForEnvironment(envTarget.name);

        await loginPage.launchApp();
        await loginPage.loginWithFallbackUsers(usernames, password);

        await payHomePage.waitForPayHome();
        await expect(payHomePage.dashboardLink.first()).toBeVisible();
      },
    },
    {
      title: 'should open Pay product and verify dashboard link',
      run: async (pages) => {
        const { payHomePage } = pages;
        await payHomePage.waitForPayHome();
        await expect(payHomePage.dashboardLink.first()).toBeVisible();
      },
    },
    {
      title: 'should open Single Job Pricing and verify Download Job Model',
      run: async (pages) => {
        const { payHomePage, singleJobPricingPage } = pages;
        await payHomePage.waitForPayHome();
        await payHomePage.openSingleJobPricing();
        await singleJobPricingPage.waitForPricingPage();
        await expect(singleJobPricingPage.downloadJobModel).toBeVisible();
        await payHomePage.ensureOnPayDashboard();
      },
      options: {
        recover: async (pages) => pages.payHomePage.ensureOnPayDashboard(),
      },
    },
    {
      title: 'should complete HCM integration interest list flow',
      run: async (pages) => {
        const { payHomePage, hcmIntegrationPage } = pages;
        await payHomePage.ensureOnPayDashboard();
        await payHomePage.openHcmJoinInterestList();
        await hcmIntegrationPage.waitForHcmPage();
        await hcmIntegrationPage.completeInterestListFlow();
        await payHomePage.clickDashboard();
        await expect(payHomePage.dashboardLink.first()).toBeVisible();
      },
      options: {
        recover: async (pages) => pages.payHomePage.ensureOnPayDashboard(),
      },
    },
    {
      title: 'should open Reward Benchmarking from random country and click filter',
      run: async (pages) => {
        const { payHomePage, marketReportsPage, rewardBenchmarkingPage } = pages;
        const verifyRewardBenchmarking = async () => {
          await marketReportsPage.openRewardBenchmarkingReport();
          await rewardBenchmarkingPage.waitForRewardBenchmarkingPage();
          await expect(rewardBenchmarkingPage.rewardBenchmarkingTitle.first()).toBeVisible();
          await expect(rewardBenchmarkingPage.filterButton).toBeVisible();
          await rewardBenchmarkingPage.clickFilter();
        };

        await payHomePage.waitForPayHome();
        await payHomePage.countryLinks.first().scrollIntoViewIfNeeded();

        let lastError;
        try {
          await test.step('Try random country', async () => {
            await payHomePage.clickRandomCountry();
            await verifyRewardBenchmarking();
          });
          return;
        } catch (error) {
          lastError = error;
        }

        await payHomePage.returnToDashboard();

        for (const country of payHomePage.fallbackCountries) {
          try {
            await test.step(`Retry with ${country}`, async () => {
              await payHomePage.clickCountryByName(country);
              await verifyRewardBenchmarking();
            });
            return;
          } catch (error) {
            lastError = error;
            await payHomePage.returnToDashboard();
          }
        }

        throw lastError;
      },
    },
    {
      title: 'should verify onboarding page and leaderboard navigation links',
      run: async (pages) => {
        const {
          rewardBenchmarkingPage,
          payHomePage,
          globalNavPage,
          onboardingPage,
          leaderboardPage,
        } = pages;
        await rewardBenchmarkingPage.dismissFilterPanel();
        await payHomePage.returnToDashboard();
        await globalNavPage.openOrganizationData();
        await onboardingPage.waitForOnboardingPage();
        if (await onboardingPage.welcomeTitle.isVisible().catch(() => false)) {
          await expect(onboardingPage.welcomeTitle).toBeVisible();
        }
        await expect(onboardingPage.leaderboardLink).toBeVisible();
        await onboardingPage.clickLeaderboard();
        await leaderboardPage.waitForLeaderboardPage();
        await expect(leaderboardPage.onboardingLink.first()).toBeVisible();
        await expect(leaderboardPage.dataSubmissionLink.first()).toBeVisible();
        await expect(leaderboardPage.compensationSurveyLink.first()).toBeVisible();
      },
    },
    {
      title: 'should open Compensation and Benefit survey and verify title',
      run: async (pages) => {
        const { leaderboardPage, globalNavPage, onboardingPage, compensationBenefitSurveyPage } = pages;
        await leaderboardPage.ensureOnLeaderboardPage(globalNavPage, onboardingPage);
        await leaderboardPage.clickCompensationSurvey();
        await compensationBenefitSurveyPage.waitForSurveyPage();
        await expect(compensationBenefitSurveyPage.surveyTitle).toBeVisible();
      },
    },
    {
      title: 'should complete data submission leaderboard and multi-entity flow',
      run: async (pages) => {
        const {
          compensationBenefitSurveyPage,
          leaderboardPage,
          globalNavPage,
          onboardingPage,
          dataSubmissionPage,
          multiEntitySubmissionPage,
        } = pages;
        await compensationBenefitSurveyPage.ensureOnSurveyPage(
          leaderboardPage,
          globalNavPage,
          onboardingPage,
        );
        await dataSubmissionPage.openDataSubmissionTabIfPresent();
        await dataSubmissionPage.clickLeaderboardLink();
        await dataSubmissionPage.waitForDataGroupsPage();
        await expect(dataSubmissionPage.leaderboardViewTitle.first()).toBeVisible();
        await dataSubmissionPage.clickMultiEntityLink();
        await multiEntitySubmissionPage.waitForPopup();
        await expect(multiEntitySubmissionPage.popupTitle).toBeVisible();
        await multiEntitySubmissionPage.clickContinue();
        await multiEntitySubmissionPage.waitForGroupMyTasksPage();
        await expect(multiEntitySubmissionPage.groupMyTasksTitle).toBeVisible();
        await multiEntitySubmissionPage.clickCancel();
      },
    },
    {
      title: 'should complete data submission multi-country flow',
      run: async (pages) => {
        const { dataSubmissionPage, multiCountrySubmissionPage } = pages;
        await dataSubmissionPage.clickMultiCountryLink();
        await multiCountrySubmissionPage.waitForPopup();
        await expect(multiCountrySubmissionPage.popupTitle).toBeVisible();
        await multiCountrySubmissionPage.clickContinue();
        await multiCountrySubmissionPage.clickCancel();
      },
    },
  ];
}

test.describe('Smoke Tests', () => {
  /** @type {ReturnType<typeof createPageObjects> | undefined} */
  let smokePages;

  test.beforeAll(async ({ sharedPage }) => {
    test.setTimeout(90 * 60 * 1000);
    if (fs.existsSync(SMOKE_RESULTS_FILE)) {
      fs.unlinkSync(SMOKE_RESULTS_FILE);
    }
    const smokeEnvironments = envConfig.getSmokeEnvironments();
    const initialBaseUrl = smokeEnvironments[0]?.baseUrl || envConfig.baseUrl;
    smokePages = createPageObjects(sharedPage, initialBaseUrl);
  });

  test.afterAll(async () => {
    const allResults = loadPersistedResults();
    for (const envTarget of envConfig.getSmokeEnvironments()) {
      printScenarioSummary(envTarget.label, allResults[envTarget.label] || []);
    }
  });

  for (const [envIndex, envTarget] of envConfig.getSmokeEnvironments().entries()) {
    const environmentSuite = envConfig.getEnvironmentSuiteName(envIndex, envTarget.label);

    test.describe(environmentSuite, () => {
      const scenarioResults = [];

      getSmokeScenarios(envTarget).forEach((scenario) => {
        test(`${scenario.title} @smoke`, async ({ sharedPage }, testInfo) => {
          test.setTimeout(15 * 60 * 1000);
          testInfo.annotations.push({
            type: 'environment',
            description: `${envTarget.label} | ${envTarget.baseUrl}`,
          });

          await allure.label('environment', envTarget.label);
          await allure.label('environmentOrder', String(envIndex + 1).padStart(2, '0'));

          if (!smokePages || smokePages.loginPage.page !== sharedPage) {
            smokePages = createPageObjects(sharedPage, envTarget.baseUrl);
          }

          setPagesBaseUrl(smokePages, envTarget.baseUrl);

          await recoverBeforeScenario(smokePages, scenario.title, envTarget);

          const runScenario = createRunScenario(scenarioResults, envTarget.label);
          const options = scenario.options
            ? {
                ...scenario.options,
                recover: scenario.options.recover
                  ? async () => scenario.options.recover(smokePages)
                  : undefined,
              }
            : undefined;

          const passed = await runScenario(scenario.title, () => scenario.run(smokePages), options);
          const failureMessage = scenarioResults.find((result) => result.title === scenario.title)?.error;

          expect.soft(passed, failureMessage || `${scenario.title} failed`).toBe(true);
        });
      });
    });
  }
});