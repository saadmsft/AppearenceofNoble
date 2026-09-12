import { test as base, expect } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, runTest) => {
    await page.addLocatorHandler(page.locator('.dedication-dialog'), async (dialog) => {
      await dialog.getByRole('button').last().click()
    })
    await runTest(page)
  },
})

export { expect }
