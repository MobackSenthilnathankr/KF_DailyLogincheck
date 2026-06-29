#!/usr/bin/env node

const envConfig = require('../config/env.config');

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
    console.error(
      `Missing required GitHub Actions secrets: ${missing.join(', ')}\n` +
      'Add them under Settings → Secrets and variables → Actions.',
    );
    process.exit(1);
  }

  const smokeTargets = envConfig.getSmokeEnvironments();
  if (smokeTargets.length === 0) {
    console.error(
      'No smoke environments configured. Set SMOKE_ENVIRONMENTS and matching BASE_URL values.',
    );
    process.exit(1);
  }

  console.log(`CI validation passed. Running against: ${smokeTargets.map((t) => t.label).join(', ')}`);
}

validateCiSecrets();
