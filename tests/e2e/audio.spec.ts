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

  test('switches to General Quarters on a checkpoint page and restores the ambient track on leave', async ({ page }) => {
    await page.goto('/')
    const group = page.getByRole('group', { name: 'Ambient audio' })
    await group.getByRole('button', { name: 'Next track' }).click()
    await expect(group.locator('.dr-audio__track')).toContainText('Ceres Approach')
    // Paused: opening the checkpoint pre-selects GQ without starting playback.
    await page.goto('/#/module/act-0-checkpoint')
    await expect(group.locator('.dr-audio__track')).toContainText('General Quarters')
    await expect(group.locator('.dr-audio__gq')).toBeVisible()
    await expect(group.getByRole('button', { name: 'Play ambient audio' })).toHaveAttribute('aria-pressed', 'false')
    // Leave: previous ambient track comes back.
    await page.goto('/#/')
    await expect(group.locator('.dr-audio__track')).toContainText('Ceres Approach')
    await expect(group.locator('.dr-audio__gq')).toHaveCount(0)
  })

  test('a manual skip during a checkpoint wins; GQ is not in the skip rotation', async ({ page }) => {
    await page.goto('/#/module/act-0-checkpoint')
    const group = page.getByRole('group', { name: 'Ambient audio' })
    await expect(group.locator('.dr-audio__track')).toContainText('General Quarters')
    await group.getByRole('button', { name: 'Next track' }).click()
    await expect(group.locator('.dr-audio__track')).toContainText('Running Cold')
    await group.getByRole('button', { name: 'Next track' }).click()
    await expect(group.locator('.dr-audio__track')).toContainText('Ceres Approach')
    await group.getByRole('button', { name: 'Next track' }).click()
    await expect(group.locator('.dr-audio__track')).toContainText('Running Cold') // never GQ
    await page.goto('/#/')
    await expect(group.locator('.dr-audio__track')).toContainText('Running Cold') // not yanked back to the pre-checkpoint track
  })

  test('with the checkpoint switch off, no auto-switch happens', async ({ page }) => {
    await page.goto('/#/settings')
    await page.getByLabel(/Switch to General Quarters/).uncheck()
    await page.goto('/#/module/act-0-checkpoint')
    const group = page.getByRole('group', { name: 'Ambient audio' })
    await expect(page.locator('.dr-checkpoint')).toBeVisible()
    await expect(group.locator('.dr-audio__track')).toContainText('Running Cold')
    await expect(group.locator('.dr-audio__gq')).toHaveCount(0)
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
