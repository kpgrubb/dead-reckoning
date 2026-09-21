import { test, expect, type Page } from '@playwright/test'

/**
 * The act-0-01 mission beat asks for the mean of the six logged dead-reckoning fixes. The MDX computes it
 * as `mean(loggedFixRun.fixes)` from the seeded dataset; the NAV instrument lists those six values in its
 * visible data table, so the test derives the answer the same way — from the same six values — to one decimal.
 */
async function loggedRunMean(page: Page): Promise<string> {
  const cells = page.locator('.dr-navfix__logged table tbody tr td:nth-child(2)')
  await expect(cells).toHaveCount(6)
  const values = (await cells.allTextContents()).map((t) => Number(t.replace('−', '-')))
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return mean.toFixed(1)
}

test.describe('smoke', () => {
  test('mission map lists modules and opens the first one', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Mission Map' })).toBeVisible()
    const first = page.locator('.dr-map__module-link').first()
    await expect(first).toBeVisible()
    await first.click()
    await expect(page.locator('.dr-module__title')).toBeVisible()
  })

  test('a module renders scene, drill and mission beat; wrong answer debriefs; right answer unseals', async ({ page }) => {
    await page.goto('/#/module/act-0-01')
    await expect(page.locator('.dr-scene').first()).toBeVisible()
    await expect(page.locator('.dr-drill').first()).toBeVisible()
    const beat = page.locator('.dr-beat')
    await expect(beat).toBeVisible()
    await expect(page.locator('.dr-gated')).toBeVisible()
    await beat.locator('input').fill('999')
    await beat.getByRole('button', { name: 'COMMIT' }).click()
    await expect(beat.locator('.dr-beat__debrief')).toBeVisible()
    await beat.locator('input').fill(await loggedRunMean(page))
    await beat.getByRole('button', { name: 'COMMIT' }).click()
    await expect(beat.locator('.dr-beat__outcome')).toBeVisible()
    await expect(page.locator('.dr-gated')).toHaveCount(0)
    await expect(page.locator('.dr-logentry')).toBeVisible()
    await page.getByRole('button', { name: /MARK COMPLETE/ }).click()
  })

  test('ship log accumulates entries and search works', async ({ page }) => {
    await page.goto('/#/module/act-0-01')
    await page.locator('.dr-beat input').fill(await loggedRunMean(page))
    await page.locator('.dr-beat').getByRole('button', { name: 'COMMIT' }).click()
    await expect(page.locator('.dr-logentry')).toBeVisible()
    await page.goto('/#/log')
    await expect(page.locator('.dr-log__entry')).toHaveCount(1)
    await page.getByPlaceholder(/standard deviation/).fill('zzzz-no-match')
    await expect(page.locator('.dr-log__entry')).toHaveCount(0)
  })

  test('settings toggle high contrast and condensed density', async ({ page }) => {
    await page.goto('/#/settings')
    await page.getByLabel('High contrast').check()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast')
    await page.getByLabel(/Condensed/).check()
    await page.goto('/#/module/act-0-01')
    await expect(page.locator('.dr-scene__condensed').first()).toBeVisible()
  })
})
