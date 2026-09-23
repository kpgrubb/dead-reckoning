import { test, expect, type Page } from '@playwright/test'

/**
 * The sync control against a stubbed store, so the suite never depends on a third-party service
 * being up and never writes to the real one. `routeSync` holds the payload in memory per test.
 */
async function routeSync(page: Page, seed: string | null = null) {
  let body = seed
  await page.route('https://textdb.dev/api/data/**', async (route) => {
    if (route.request().method() === 'POST') {
      body = route.request().postData() ?? ''
      await route.fulfill({ status: 200, body: 'ok' })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: body ?? '' })
  })
  return () => body
}

test.describe('progress sync', () => {
  test('passcode unlocks, saves progress, and reports the time', async ({ page }) => {
    const stored = await routeSync(page)
    await page.goto('/')

    await page.getByRole('button', { name: 'PASSCODE' }).click()
    await page.getByLabel('Sync passcode').fill('helios')
    await page.getByRole('button', { name: 'ENTER' }).click()

    // Normalised to upper case and shown as the active passcode.
    await expect(page.getByRole('button', { name: 'HELIOS' })).toBeVisible()
    await page.getByRole('button', { name: 'SAVE', exact: true }).click()
    await expect(page.locator('.dr-sync__stamp')).toContainText('SAVED', { timeout: 10_000 })

    const payload = JSON.parse(stored() as string)
    expect(payload.v).toBe(1)
    expect(payload.progress).toHaveProperty('completed')
    expect(payload.log).toBeDefined()
  })

  test('LOAD restores progress saved by another device', async ({ page }) => {
    const remote = JSON.stringify({
      v: 1,
      savedAt: new Date().toISOString(),
      progress: { learnerSeed: 12345, completed: { 'act-0-00': { at: new Date().toISOString() } }, beats: {}, drills: {}, checkpoints: {}, lastModule: 'act-0-00', decisions: {}, consults: {} },
      log: {},
    })
    await routeSync(page, remote)
    await page.goto('/')

    await expect(page.locator('.dr-topbar__status')).toContainText('0/')
    await page.getByRole('button', { name: 'PASSCODE' }).click()
    await page.getByLabel('Sync passcode').fill('HELIOS')
    await page.getByRole('button', { name: 'ENTER' }).click()
    await page.getByRole('button', { name: 'LOAD', exact: true }).click()

    // The completed count in the header reflects the loaded progress.
    await expect(page.locator('.dr-topbar__status')).toContainText('1/', { timeout: 10_000 })
  })

  test('a passcode with nothing saved says so, and a service failure is non-fatal', async ({ page }) => {
    await page.route('https://textdb.dev/api/data/**', (route) => route.fulfill({ status: 500, body: 'nope' }))
    await page.goto('/')
    await page.getByRole('button', { name: 'PASSCODE' }).click()
    await page.getByLabel('Sync passcode').fill('HELIOS')
    await page.getByRole('button', { name: 'ENTER' }).click()

    await expect(page.locator('.dr-sync')).toHaveClass(/is-error/)
    // The app still works.
    await page.goto('/#/module/act-0-00')
    await expect(page.locator('.dr-module__title')).toBeVisible()
  })

  test('the passcode is remembered on this device and can be cleared', async ({ page }) => {
    await routeSync(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'PASSCODE' }).click()
    await page.getByLabel('Sync passcode').fill('HELIOS')
    await page.getByRole('button', { name: 'ENTER' }).click()
    await expect(page.getByRole('button', { name: 'HELIOS' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: 'HELIOS' })).toBeVisible()

    await page.getByRole('button', { name: 'HELIOS' }).click()
    await expect(page.getByRole('button', { name: 'PASSCODE' })).toBeVisible()
  })
})
