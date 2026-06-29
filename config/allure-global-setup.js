const { cleanResults } = require('../scripts/allure-report');

module.exports = async () => {
  cleanResults();
};
