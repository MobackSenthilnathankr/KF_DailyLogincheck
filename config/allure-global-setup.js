const { cleanResults } = require('../scripts/allure-report');
const envConfig = require('./env.config');

function validateCiSecrets() {
  if (!process.env.CI) {
    return;
  }

  const missing = [];
  if (!envConfig.username?.trim()) {
    missing.push('TEST_USERNAME');
  }
  if (!envConfig.password?.trim()) {
    missing.push('TEST_PASSWORD');
  }

  if (missing.length > 0) {
    missing.forEach((secret) => {
      console.error(`::error title=Missing GitHub secret::${secret} is not set.`);
    });
    throw new Error(
      `Missing required GitHub Actions secrets: ${missing.join(', ')}. ` +
      'Configure them under Settings → Secrets and variables → Actions.',
    );
  }

  const smokeTargets = envConfig.getSmokeEnvironments();
  if (smokeTargets.length === 0) {
    throw new Error(
      'No smoke environments configured. Set SMOKE_ENVIRONMENTS and matching BASE_URL values.',
    );
  }
}

module.exports = async () => {
  validateCiSecrets();
  cleanResults();
};
