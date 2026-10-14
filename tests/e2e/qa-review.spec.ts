import { test, expect, type Page } from '@playwright/test'

/**
 * Specs written during the QA & accessibility review (docs/reviews/qa-accessibility.md).
 *
 * Two kinds live here:
 *   - Regression guards that PASS today and must keep passing.
 *   - `test.fail()` specs that reproduce a defect the review found. Playwright reports an
 *     expected failure while the bug is present and flips to "unexpected pass" the moment it is
 *     fixed, which is the signal to delete the `test.fail()` line.
 *
 * Nothing here touches the real sync service; `routeSync` stubs it in memory per test.
 */

/** Unlock every module so a spec can jump straight to the one it needs. */
async function openGates(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'dead-reckoning:settings',
      JSON.stringify({ state: { textSize: 'md', motion: 'system', theme: 'default', storyDensity: 'full', strictGating: false }, version: 1 }),
    )
  })
}

/** In-memory stand-in for textdb.dev. Returns a getter for whatever is currently "stored". */
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

/**
 * The question each checkpoint item is asking: its prompt and any data it shows, with the
 * per-item state word and everything from the answer field onwards removed, so that marks,
 * answer keys and worked solutions do not count as a change to the item itself.
 */
async function itemStems(page: Page): Promise<string[]> {
  return page.$$eval('.dr-checkpoint__item', (ns) =>
    ns.map((n) =>
      (n as HTMLElement).innerText
        .replace(/\b(OPEN|ANSWERED|CONFIRMED|MISSED)\b/g, ' ')
        .split(/\bANSWER\b/)[0]
        .replace(/\s+/g, ' ')
        .trim(),
    ),
  )
}

// =================================================================================================
// Regression guards — these pass and must keep passing
// =================================================================================================

test.describe('checkpoint review integrity', () => {
  test('the post-submit review shows the attempt that was graded, not the next one', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-0-checkpoint')
    await page.getByRole('button', { name: 'BEGIN', exact: true }).click()
    await expect(page.locator('.dr-checkpoint__item').first()).toBeVisible()

    const before = await itemStems(page)
    expect(before.length).toBeGreaterThan(5)

    await page.getByRole('button', { name: 'SUBMIT CHECKPOINT' }).click()
    await page.getByRole('button', { name: 'SUBMIT ANYWAY' }).click()
    await expect(page.locator('.dr-checkpoint__outcome')).toBeVisible({ timeout: 15_000 })

    // Every item still opens with the prompt and data the learner was actually marked on;
    // grading only appends marks, answer keys and worked solutions after it.
    const after = await itemStems(page)
    expect(after).toHaveLength(before.length)
    for (let i = 0; i < before.length; i++) {
      expect(after[i].startsWith(before[i]), `item ${i + 1} changed between submission and review`).toBe(true)
    }
  })

  test('retry regenerates the items with fresh parameters', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-0-checkpoint')
    await page.getByRole('button', { name: 'BEGIN', exact: true }).click()
    await expect(page.locator('.dr-checkpoint__item').first()).toBeVisible()
    const first = await itemStems(page)

    await page.getByRole('button', { name: 'SUBMIT CHECKPOINT' }).click()
    await page.getByRole('button', { name: 'SUBMIT ANYWAY' }).click()
    await expect(page.locator('.dr-checkpoint__outcome')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /RETRY/ }).click()
    await expect(page.locator('.dr-checkpoint__item').first()).toBeVisible()

    const second = await itemStems(page)
    expect(second.length).toBe(first.length)
    // Low-cardinality items (classify-this-variable, pick-a-filter) can legitimately redraw the
    // same variant — act-0 q10 does so about 11 % of the time, q4 about 8 %. What must never
    // happen is a generator that ignores the attempt number, so require the bulk to change.
    const changed = first.filter((t, i) => t !== second[i]).length
    expect(changed).toBeGreaterThanOrEqual(first.length - 2)
  })
})

test.describe('checkpoint audio takeover', () => {
  test('General Quarters takes over on a checkpoint and hands back afterwards', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-1-05')
    await expect(page.locator('.dr-audio')).toContainText('Running Cold')

    await page.goto('/#/module/act-1-checkpoint')
    await expect(page.locator('.dr-audio')).toContainText('General Quarters')
    await expect(page.locator('.dr-audio')).toHaveClass(/is-gq/)

    await page.goto('/#/module/act-2-01')
    await expect(page.locator('.dr-audio')).toContainText('Running Cold')
    await expect(page.locator('.dr-audio')).not.toHaveClass(/is-gq/)
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('every duration token is zero and a chart mark jumps to its final position', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-2-02')
    const dot = page.locator('circle.dr-mark--draggable').first()
    await expect(dot).toBeVisible({ timeout: 20_000 })

    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement)
      return ['--dr-dur-fast', '--dr-dur', '--dr-dur-slow', '--dr-scanline-alpha'].map((k) => cs.getPropertyValue(k).trim())
    })
    expect(tokens).toEqual(['0s', '0s', '0s', '0'])

    // Nudge a point; it must be at its final position well inside the normal 220 ms transition.
    await dot.focus()
    const from = await dot.evaluate((e) => e.getBoundingClientRect().top)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(25)
    const at25ms = await dot.evaluate((e) => e.getBoundingClientRect().top)
    await page.waitForTimeout(500)
    const settled = await dot.evaluate((e) => e.getBoundingClientRect().top)
    expect(at25ms).not.toBe(from)
    expect(Math.abs(at25ms - settled)).toBeLessThan(0.75)
  })
})

// =================================================================================================
// Defect reproductions — each is expected to fail until the matching finding is fixed
// =================================================================================================

test.describe('defects found by the QA review', () => {
  // BROKEN-1
  test.fail(true, 'Autosave overwrites the remote save with the new device\'s empty progress before LOAD')
  test('entering a passcode on a fresh device must not destroy the saved progress', async ({ page }) => {
    const remote = JSON.stringify({
      v: 1,
      savedAt: new Date().toISOString(),
      progress: {
        learnerSeed: 4242,
        completed: { 'act-0-00': { at: new Date().toISOString() }, 'act-0-01': { at: new Date().toISOString() } },
        beats: { 'act-0-01-fix-mean': { passed: true, attempts: 1, at: new Date().toISOString() } },
        drills: {},
        checkpoints: {},
        lastModule: 'act-0-01',
        decisions: {},
        consults: {},
      },
      log: {},
    })
    const stored = await routeSync(page, remote)
    await openGates(page)
    await page.goto('/')

    // The learner enters their passcode on a brand-new device...
    await page.getByRole('button', { name: 'PASSCODE' }).click()
    await page.getByLabel('Sync passcode').fill('HELIOS')
    await page.getByRole('button', { name: 'ENTER' }).click()
    await expect(page.getByRole('button', { name: 'HELIOS' })).toBeVisible()

    // ...then clicks into a module instead of pressing LOAD first.
    await page.goto('/#/module/act-0-00')
    await page.waitForTimeout(8000) // past the 4 s autosave debounce

    // Their saved progress must still be on the server.
    const payload = JSON.parse(stored() as string)
    expect(payload.progress.learnerSeed).toBe(4242)
    expect(Object.keys(payload.progress.beats)).toContain('act-0-01-fix-mean')
  })

  // A11Y-1
  test.fail(true, 'Each of the 412 scatter points is its own tab stop')
  test('a chart must not take hundreds of Tab presses to pass', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-2-02')
    await expect(page.locator('circle.dr-mark--draggable').first()).toBeVisible({ timeout: 20_000 })
    const stops = await page.locator('circle.dr-mark--draggable[tabindex="0"]').count()
    expect(stops).toBeLessThanOrEqual(2)
  })

  // A11Y-2
  test.fail(true, 'Ostrow\'s speaker tag uses --dr-alert-dim (#7f3430), 2.3:1 on the void')
  test('every speaker tag clears 4.5:1 against its background', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-7-03')
    const tag = page.locator('.dr-dialogue--ostrow .dr-dialogue__speaker').first()
    await expect(tag).toBeVisible({ timeout: 20_000 })
    const ratio = await tag.evaluate((el) => {
      const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
      const lum = ([r, g, b]: number[]) =>
        0.2126 * ((r / 255 <= 0.04045 ? r / 255 / 12.92 : ((r / 255 + 0.055) / 1.055) ** 2.4)) +
        0.7152 * ((g / 255 <= 0.04045 ? g / 255 / 12.92 : ((g / 255 + 0.055) / 1.055) ** 2.4)) +
        0.0722 * ((b / 255 <= 0.04045 ? b / 255 / 12.92 : ((b / 255 + 0.055) / 1.055) ** 2.4))
      let bg = 'rgba(0, 0, 0, 0)'
      let n: HTMLElement | null = el as HTMLElement
      while (n && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
        bg = getComputedStyle(n).backgroundColor
        n = n.parentElement
      }
      const [a, b2] = [lum(parse(getComputedStyle(el).color)), lum(parse(bg))].sort((x, y) => y - x)
      return (a + 0.05) / (b2 + 0.05)
    })
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  // A11Y-3
  test.fail(true, 'Modules jump h1 -> h4; nothing emits h2 or h3')
  test('module headings do not skip a level', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-5-03')
    await expect(page.locator('.dr-module h4').first()).toBeVisible({ timeout: 20_000 })
    const levels = await page.$$eval('.dr-module h1, .dr-module h2, .dr-module h3, .dr-module h4, .dr-module h5, .dr-module h6', (ns) =>
      ns.map((n) => Number(n.tagName[1])),
    )
    const skips = levels.filter((lvl, i) => i > 0 && lvl > levels[i - 1] + 1)
    expect(skips).toEqual([])
  })

  // A11Y-4
  test.fail(true, 'index.html\'s <title> is never updated by the router')
  test('each route has its own document title', async ({ page }) => {
    await openGates(page)
    await page.goto('/')
    const map = await page.title()
    await page.goto('/#/module/act-3-02')
    await expect(page.locator('.dr-module__title')).toBeVisible({ timeout: 20_000 })
    expect(await page.title()).not.toBe(map)
  })

  // A11Y-5
  test.fail(true, 'Passing a beat swaps the aria-live gate out for unannounced content')
  test('resolving a mission beat is announced to a screen reader', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-0-01')
    const beat = page.locator('#act-0-01-fix-mean')
    await expect(beat).toBeVisible({ timeout: 20_000 })

    const values = await page.$$eval('table tbody tr', (rows) => rows.map((r) => Number(r.cells[r.cells.length - 1].textContent!.trim())))
    const mean = values.reduce((a, c) => a + c, 0) / values.length
    await beat.locator('.dr-input').first().fill(mean.toFixed(1))
    await beat.getByRole('button', { name: 'COMMIT' }).click()
    await expect(beat.locator('.dr-beat__outcome')).toBeVisible()

    // The revealed outcome needs to live in a polite region, the way the debrief does.
    const announced = await beat.locator('.dr-beat__outcome').evaluate((el) => {
      let n: HTMLElement | null = el as HTMLElement
      while (n) {
        if (n.getAttribute('aria-live') || n.getAttribute('role') === 'status' || n.getAttribute('role') === 'alert') return true
        n = n.parentElement
      }
      return false
    })
    expect(announced).toBe(true)
  })

  // A11Y-6
  test.describe('narrow viewport', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test.fail(true, 'A 13-column briefing table is 886 px wide inside a 375 px viewport')
    test('no visible table forces the page to scroll sideways at 375 px', async ({ page }) => {
      await openGates(page)
      await page.goto('/#/module/act-9-02')
      await expect(page.locator('.dr-module__title')).toBeVisible({ timeout: 20_000 })
      // Markdown tables inside <Briefing> lay out a beat after the MDX chunk resolves.
      await expect(page.locator('table.dr-table').first()).toBeVisible({ timeout: 20_000 })
      await page.waitForTimeout(1500)
      const widest = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        let worst = 0
        for (const t of Array.from(document.querySelectorAll('table'))) {
          if (t.closest('.visually-hidden')) continue
          let scroller = false
          let n = t.parentElement
          while (n && n !== document.body) {
            const ox = getComputedStyle(n).overflowX
            if (ox === 'auto' || ox === 'scroll') { scroller = true; break }
            n = n.parentElement
          }
          if (!scroller) worst = Math.max(worst, t.getBoundingClientRect().right - vw)
        }
        return worst
      })
      expect(widest).toBeLessThanOrEqual(0)
    })
  })

  // A11Y-7
  test.fail(true, 'No skip link; the header is ~12 tab stops on every one of the 72 routes')
  test('a keyboard user can skip the header navigation', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-0-01')
    await expect(page.locator('.dr-module__title')).toBeVisible({ timeout: 20_000 })
    await page.keyboard.press('Tab')
    const first = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim().toLowerCase())
    expect(first).toContain('skip')
  })
})
