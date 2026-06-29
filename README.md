# Playwright Automation Framework

A JavaScript end-to-end automation testing framework built with [Playwright](https://playwright.dev/) and the **Page Object Model (POM)** pattern.

## Project Structure

```
playwright-automation-framework/
├── config/
│   └── env.config.js       # Environment configuration loader
├── fixtures/
│   └── test-fixtures.js    # Custom test fixtures (page object injection)
├── pages/
│   ├── BasePage.js         # Base page with shared methods
│   ├── HomePage.js         # Home page object
│   └── DocsPage.js         # Docs page object
├── tests/
│   ├── smoke/              # Critical path tests (@smoke)
│   ├── regression/         # Full regression tests (@regression)
│   └── unit/               # Utility/helper tests
├── utils/
│   ├── helpers.js          # Shared helper functions
│   └── test-data.js        # Centralized test data
├── .env.example            # Environment variable template
├── playwright.config.js    # Playwright configuration
└── package.json
```

## Prerequisites

- **Node.js 18+** recommended (Node 16 supported with Playwright 1.38)
- npm

## Setup

```bash
cd playwright-automation-framework
npm install
npx playwright install
```

Copy the environment template and adjust values for your application:

```bash
copy .env.example .env
```

## Running Tests

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests (all browsers) |
| `npm run test:headed` | Run with visible browser |
| `npm run test:ui` | Open Playwright UI mode |
| `npm run test:debug` | Debug mode |
| `npm run test:chrome` | Chromium only |
| `npm run test:smoke` | Smoke tests only |
| `npm run test:regression` | Regression tests only |
| `npm run report` | Open HTML report |
| `npm run codegen` | Record new tests |

## Writing Tests

Use the custom fixture to get page objects injected automatically:

```javascript
const { test, expect } = require('../../fixtures/test-fixtures');

test('example test', async ({ homePage, page }) => {
  await homePage.open();
  await expect(page).toHaveTitle(/Playwright/);
});
```

### Adding a New Page Object

1. Create a class in `pages/` extending `BasePage`
2. Define locators in the constructor
3. Add page-specific action methods
4. Register the page in `fixtures/test-fixtures.js`

### Test Tags

- `@smoke` — critical path, run on every build
- `@regression` — broader coverage

## Configuration

Edit `.env` or set environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `https://playwright.dev` | Application URL |
| `HEADLESS` | `true` | Run browsers headless |
| `ENV` | `dev` | Environment name |

## CI/CD

A GitHub Actions workflow is included at `.github/workflows/playwright.yml`. It runs smoke tests on Chromium and uploads the HTML report as an artifact.
