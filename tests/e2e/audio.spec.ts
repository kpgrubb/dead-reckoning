import { test, expect } from '@playwright/test'

test.describe('ambient audio player', () => {
  test('is off on first load, toggles play/pause, skips tracks, mutes', async ({ page }) => {
    await page.goto('/')
    const group = page.getByRole('group', { name: 'Ambient audio' })
    await expect(group).toBeVisible()
    const play = group.getByRole('button', { name: 'Play ambient audio' })
    await expect(play).toHaveAttribute('aria-pressed', 'false')
    await expect(group.locator('.dr-audio__track')).toContainText('Running Cold')

    await play.click()
    // Either playback starts (button becomes Pause) or the browser refuses (status shows BLOCKED and button stays Play).
    const pause = group.getByRole('button', { name: 'Pause ambient audio' })
    await expect(group.locator('.dr-audio__btn--play[aria-pressed="true"], .dr-audio__blocked').first()).toBeVisible()
    if (await pause.isVisible()) {
      await expect(pause).toHaveAttribute('aria-pressed', 'true')
      await expect(group).toHaveClass(/is-playing/)
      await pause.click()
      await expect(group.getByRole('button', { name: 'Play ambient audio' })).toBeVisible()
    }

    await group.getByRole('button', { name: 'Next track' }).click()
    await expect(group.locator('.dr-audio__track')).toContainText('Ceres Approach')
    await group.getByRole('button', { name: 'Next track' }).click()
    await expect(group.locator('.dr-audio__track')).toContainText('Running Cold') // loops
    await group.getByRole('button', { name: 'Previous track' }).click()
    await expect(group.locator('.dr-audio__track')).toContainText('Ceres Approach')

    const mute = group.getByRole('button', { name: 'Mute ambient audio' })
    await mute.click()
    await expect(group.getByRole('button', { name: 'Unmute ambient audio' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('volume and track persist across reload; playing does not', async ({ page }) => {
    await page.goto('/')
    const group = page.getByRole('group', { name: 'Ambient audio' })
    const slider = group.getByRole('slider', { name: 'Volume' })
    await slider.fill('25')
    await expect(slider).toHaveValue('25')
    await group.getByRole('button', { name: 'Next track' }).click()
    await expect(group.locator('.dr-audio__track')).toContainText('Ceres Approach')

    await page.reload()
    const group2 = page.getByRole('group', { name: 'Ambient audio' })
    await expect(group2.getByRole('slider', { name: 'Volume' })).toHaveValue('25')
    await expect(group2.locator('.dr-audio__track')).toContainText('Ceres Approach')
    await expect(group2.getByRole('button', { name: 'Play ambient audio' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('keeps state across route changes and can be hidden from Settings', async ({ page }) => {
    await page.goto('/')
    const group = page.getByRole('group', { name: 'Ambient audio' })
    await group.getByRole('button', { name: 'Next track' }).click()
    await page.getByRole('link', { name: 'SHIP’S LOG' }).click()
    await expect(page.getByRole('group', { name: 'Ambient audio' }).locator('.dr-audio__track')).toContainText('Ceres Approach')

    await page.goto('/#/settings')
    const fs = page.getByRole('group', { name: 'Ambient audio' }).filter({ has: page.getByText('Show the COMMS') })
    await fs.getByRole('checkbox').first().uncheck()
    await expect(page.locator('.dr-topbar .dr-audio')).toHaveCount(0)
    await fs.getByRole('checkbox').first().check()
    await expect(page.locator('.dr-topbar .dr-audio')).toHaveCount(1)
  })
})
