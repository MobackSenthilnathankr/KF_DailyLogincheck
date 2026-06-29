const envConfig = require('../config/env.config');

const testData = {
  login: {
    validEmail: process.env.TEST_USERNAME || 'kfpay_automation@testfky.com',
    invalidEmail: 'invalid@example.com',
  },
  client: {
    pamsId: envConfig.pamsId,
    name: envConfig.clientName,
  },
  users: {
    validUser: {
      username: process.env.TEST_USERNAME || 'kfpay_automation@testfky.com',
      password: process.env.TEST_PASSWORD || '',
    },
    invalidUser: {
      username: 'invalid@example.com',
      password: 'wrong_password',
    },
  },
};

module.exports = testData;
