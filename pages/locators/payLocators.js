/**
 * Shared, scoped locators for Korn Ferry Pay dashboard and HCM pages.
 * Uses region-scoped queries first, then falls back to page-level selectors.
 */

/**
 * @param {import('@playwright/test').Page} page
 */
function getPayDashboardRoot(page) {
  return page.locator('main, kfpayh-home, [class*="dashboard"], [class*="pay-home"]').first();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} productPattern
 */
function getDashboardProductCard(page, productPattern) {
  const cardLocator = '.card-content, .card';
  const scopedCard = getPayDashboardRoot(page)
    .locator(cardLocator)
    .filter({ hasText: productPattern })
    .first();
  const pageCard = page.locator(cardLocator).filter({ hasText: productPattern }).first();

  return scopedCard.or(pageCard);
}

/**
 * @param {import('@playwright/test').Page} page
 */
function getHcmPageHeading(page) {
  return page.getByRole('heading', {
    name: /Join the Automated HCM Data Integration Beta Trial/i,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function getHcmVendorCards(page) {
  const heading = getHcmPageHeading(page);
  const scopedCards = page
    .locator('main, section, article, [class*="content"], [class*="container"]')
    .filter({ has: heading })
    .locator('.card')
    .filter({ has: page.locator('.card-body') });
  const pageCards = page.locator('.card').filter({ has: page.locator('.card-body') });

  return scopedCards.or(pageCards);
}

/**
 * @param {import('@playwright/test').Page} page
 */
function getHcmCancelButton(page) {
  return page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .or(page.getByRole('button', { name: 'Cancel', exact: true }));
}

module.exports = {
  getPayDashboardRoot,
  getDashboardProductCard,
  getHcmPageHeading,
  getHcmVendorCards,
  getHcmCancelButton,
};
