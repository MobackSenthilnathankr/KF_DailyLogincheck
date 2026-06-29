const { generateReport, hasResults } = require('../scripts/allure-report');

module.exports = async () => {
  if (!hasResults()) {
    return;
  }

  const status = generateReport();
  if (status !== 0) {
    console.warn('Allure report generation failed.');
  }
};
