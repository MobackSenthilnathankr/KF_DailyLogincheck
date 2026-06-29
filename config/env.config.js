require('dotenv').config();

const DEFAULT_ENV_URLS = {
  qa: 'https://home.kornferrytalent-qa.com',
  dev: 'https://home.kornferrytalent-dev.com',
  stage: 'https://home.kornferrytalent-stage.com',
  prod_us: 'https://home.kornferrytalent.com',
  prod_eu: 'https://home.kornferrytalent.eu',
};

function normalizeEnvName(envName) {
  return envName.trim().toLowerCase().replace(/-/g, '_');
}

const envConfig = {
  baseUrl: process.env.BASE_URL || DEFAULT_ENV_URLS.qa,
  baseUrlDev: process.env.BASE_URL_DEV || process.env.DEV_URL || DEFAULT_ENV_URLS.dev,
  baseUrlStage: process.env.BASE_URL_STAGE || process.env.STAGE_URL || DEFAULT_ENV_URLS.stage,
  baseUrlProdUs: process.env.BASE_URL_PROD_US || process.env.PROD_US_URL || DEFAULT_ENV_URLS.prod_us,
  baseUrlProdEu: process.env.BASE_URL_PROD_EU || process.env.PROD_EU_URL || DEFAULT_ENV_URLS.prod_eu,
  username: process.env.TEST_USERNAME || '',
  fallbackUsername: process.env.TEST_USERNAME_FALLBACK || 'clm.user.two@testkfy.com',
  password: process.env.TEST_PASSWORD || '',
  passwordProdUs: process.env.TEST_PASSWORD_PROD_US || process.env.TEST_PASSWORD_PROD || '',
  passwordProdEu: process.env.TEST_PASSWORD_PROD_EU || process.env.TEST_PASSWORD_PROD || '',
  pamsId: process.env.TEST_PAMS_ID || '',
  clientName: process.env.TEST_CLIENT_NAME || '',
  environment: process.env.ENV || 'dev',
  headless: process.env.HEADLESS !== 'false',
  slowMo: Number(process.env.SLOW_MO) || 0,
  keepBrowserOpen: process.env.KEEP_BROWSER_OPEN === 'true',
  smokeEnvironments: process.env.SMOKE_ENVIRONMENTS || 'qa,dev,stage,prod_us,prod_eu',
  scenarioRetries: Number(process.env.SCENARIO_RETRY_COUNT) || 1,

  getSmokeEnvironments() {
    const urlByKey = {
      qa: process.env.BASE_URL || DEFAULT_ENV_URLS.qa,
      dev: process.env.BASE_URL_DEV || process.env.DEV_URL || DEFAULT_ENV_URLS.dev,
      stage: process.env.BASE_URL_STAGE || process.env.STAGE_URL || DEFAULT_ENV_URLS.stage,
      staging: process.env.BASE_URL_STAGE || process.env.STAGE_URL || DEFAULT_ENV_URLS.stage,
      prod_us: this.baseUrlProdUs,
      produs: this.baseUrlProdUs,
      prod_eu: this.baseUrlProdEu,
      prodeu: this.baseUrlProdEu,
    };

    return this.smokeEnvironments
      .split(',')
      .map((name) => normalizeEnvName(name))
      .filter(Boolean)
      .map((name) => ({
        name,
        label: name.toUpperCase(),
        baseUrl: urlByKey[name],
      }))
      .filter((target) => {
        if (!target.baseUrl) {
          console.warn(`Skipping unknown or unconfigured smoke environment: ${target.name}`);
          return false;
        }
        return true;
      });
  },

  /**
   * Allure suite name that preserves SMOKE_ENVIRONMENTS order in reports.
   * @param {number} index
   * @param {string} label
   */
  getEnvironmentSuiteName(index, label) {
    return `${String(index + 1).padStart(2, '0')} - ${label}`;
  },

  getCredentialsForEnvironment(envName) {
    const name = normalizeEnvName(envName);

    if (name === 'prod_us' || name === 'produs') {
      return {
        username: this.username,
        password: this.passwordProdUs,
      };
    }

    if (name === 'prod_eu' || name === 'prodeu') {
      return {
        username: this.username,
        password: this.passwordProdEu,
      };
    }

    return {
      username: this.username,
      password: this.password,
    };
  },

  getLoginAttemptsForEnvironment(envName) {
    const { username, password } = this.getCredentialsForEnvironment(envName);
    const usernames = [username];

    if (this.fallbackUsername && this.fallbackUsername !== username) {
      usernames.push(this.fallbackUsername);
    }

    return { usernames, password };
  },
};

module.exports = envConfig;
