import { expect, test as base } from '@playwright/test'
import { dedicationSessionKey } from '../../src/lib/dedication.ts'

// Existing feature cases represent a returning visit. Dedicated welcome tests use the base fixture.
export const test = base.extend({
  page: async ({ page }, run) => {
    await page.addInitScript((key) => {
      try { sessionStorage.setItem(key, '1') } catch (error) {
        if (!(error instanceof DOMException)) throw error
      }
    }, dedicationSessionKey)
    await page.addLocatorHandler(page.locator('.dedication-dialog'), async () => {
      await page.locator('.dedication-enter').click()
    })
    await run(page)
  },
})
export { expect }
