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
 * Everything on the page that Tab can land on. Counted from the DOM rather than by pressing Tab
 * hundreds of times: the point of A1 is the size of the number, and the number is what regresses.
 */
async function tabStops(page: Page): Promise<number> {
  return page.evaluate(() => {
    const candidates = document.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, summary, [tabindex], audio[controls], video[controls], iframe',
    )
    let n = 0
    for (const el of candidates) {
      const ti = el.getAttribute('tabindex')
      if (ti !== null && Number(ti) < 0) continue
      if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') continue
      if (el.closest('[inert], [aria-hidden="true"], .visually-hidden')) continue
      const box = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.display === 'none') continue
      if (box.width === 0 && box.height === 0 && el.tagName !== 'INPUT') continue
      n++
    }
    return n
  })
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
// Defect reproductions — each is expected to fail until the matching finding is fixed.
//
// `test.fail()` is scope-wide: one call annotates every test in the enclosing describe, which is
// why the findings that have been fixed live in their own describe below rather than having their
// `test.fail()` line deleted in place.
// =================================================================================================

test.describe('defects found by the QA review', () => {
  test.fail(true, 'Open findings: A2 Ostrow contrast, A5 no skip link, A6 document title')

  // A11Y-2
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

  // A11Y-4
  test('each route has its own document title', async ({ page }) => {
    await openGates(page)
    await page.goto('/')
    const map = await page.title()
    await page.goto('/#/module/act-3-02')
    await expect(page.locator('.dr-module__title')).toBeVisible({ timeout: 20_000 })
    expect(await page.title()).not.toBe(map)
  })

  // A11Y-7
  test('a keyboard user can skip the header navigation', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-0-01')
    await expect(page.locator('.dr-module__title')).toBeVisible({ timeout: 20_000 })
    await page.keyboard.press('Tab')
    const first = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim().toLowerCase())
    expect(first).toContain('skip')
  })
})

// =================================================================================================
// Findings closed since the review. These pass and must keep passing.
// =================================================================================================

test.describe('B1 · a second device does not destroy saved progress', () => {
  // Closed by `pendingRemote` in src/store/sync.ts: a device never writes over a saved copy it
  // has not taken. The spec's `test.fail()` was left behind when the fix landed.
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
})

test.describe('A1 · the draggable scatter is one tab stop', () => {
  test('a chart must not take hundreds of Tab presses to pass', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-2-02')
    await expect(page.locator('circle.dr-mark--draggable').first()).toBeVisible({ timeout: 20_000 })
    expect(await page.locator('circle.dr-mark--draggable').count()).toBe(412)
    const stops = await page.locator('circle.dr-mark--draggable[tabindex="0"]').count()
    expect(stops).toBeLessThanOrEqual(2)

    // The whole page, not just the chart. 463 tab stops before the fix, 412 of them the scatter's
    // points. Pin the total so the series can never quietly go back to one tab stop per point.
    expect(await tabStops(page)).toBeLessThan(80)
  })

  test('the scatter keeps its nudge keys and gains a way to walk the series', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-2-02')
    const dots = page.locator('circle.dr-mark--draggable')
    await expect(dots.first()).toBeVisible({ timeout: 20_000 })
    const r = () => page.locator('.dr-readout').filter({ hasText: 'r · t' }).first().innerText()
    const chartStatus = page.locator('.dr-panel__status').filter({ hasText: /MANIFEST|POINTS MOVED/ })

    // A plain arrow key still moves the focused point, and r still follows it. The review drove
    // r from 0.990 to 0.988 this way; one 1 % step on one of 412 points does not show at three
    // decimals, so take the Shift step the contract also promises.
    await dots.first().focus()
    const before = await r()
    await page.keyboard.press('ArrowUp')
    await expect(chartStatus).toContainText('POINTS MOVED')
    for (let i = 0; i < 8; i++) await page.keyboard.press('Shift+ArrowUp')
    expect(await r()).not.toBe(before)

    // A modified arrow key walks to the next point instead, and the tab stop follows it.
    await page.keyboard.press('Alt+ArrowRight')
    await expect(dots.nth(1)).toBeFocused()
    expect(await dots.nth(1).getAttribute('tabindex')).toBe('0')
    expect(await dots.nth(0).getAttribute('tabindex')).toBe('-1')

    // The selection is spoken.
    await expect(page.locator('.dr-chart [role="status"]').first()).toContainText('Point 2 of 412')

    // Escape leaves the plot rather than leaving focus on a point.
    await page.keyboard.press('Escape')
    await expect(dots.nth(1)).not.toBeFocused()
  })
})

test.describe('A4 · passing a mission beat is announced', () => {
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

    // Exactly one live region owns the verdict: the failure path must not double up with it.
    expect(await beat.locator('[role="status"], [aria-live]').count()).toBe(1)

    // The gate below says it has opened, but does not read the revealed scene aloud.
    const gateNote = page.locator('.visually-hidden[role="status"]').filter({ hasText: 'sealed section below' })
    await expect(gateNote).toHaveCount(1)
    expect((await gateNote.innerText()).length).toBeLessThan(120)
  })
})

test.describe('A7 · authored tables scroll instead of the page', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  /** Every module the review named under A7. */
  const TABLE_MODULES = ['act-0-02', 'act-1-02', 'act-2-01', 'act-2-05', 'act-3-02', 'act-3-05', 'act-6-06', 'act-7-07', 'act-8-03', 'act-8-04', 'act-9-01', 'act-9-02', 'act-9-03']

  for (const id of TABLE_MODULES) {
    test(`${id}: no visible table forces the page to scroll sideways at 375 px`, async ({ page }) => {
      await openGates(page)
      await page.goto(`/#/module/${id}`)
      await expect(page.locator('.dr-module__title')).toBeVisible({ timeout: 20_000 })
      // Tables inside <Briefing> lay out a beat after the MDX chunk resolves.
      await expect(page.locator('table').first()).toBeVisible({ timeout: 20_000 })
      await page.waitForTimeout(1500)
      const offenders = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        const out: string[] = []
        for (const t of Array.from(document.querySelectorAll('table'))) {
          if (t.closest('.visually-hidden')) continue
          let scroller = false
          let n = t.parentElement
          while (n && n !== document.body) {
            const ox = getComputedStyle(n).overflowX
            if (ox === 'auto' || ox === 'scroll') { scroller = true; break }
            n = n.parentElement
          }
          const over = t.getBoundingClientRect().right - vw
          if (!scroller && over > 0) out.push(`${t.className || '(no class)'} in ${t.closest('[class]')?.parentElement?.className ?? '?'} overflows by ${Math.round(over)}px`)
        }
        return out
      })
      expect(offenders).toEqual([])
    })
  }

  test('a table that overflows is reachable and scrollable by keyboard', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-9-02')
    await expect(page.locator('table').first()).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1500)

    const wrap = page.locator('.dr-table-wrap[tabindex="0"]').first()
    await expect(wrap).toBeVisible()
    // It has a name, so a screen-reader user knows what they have landed in.
    expect(await wrap.getAttribute('aria-label')).toBeTruthy()

    await wrap.focus()
    await expect(wrap).toBeFocused()
    const from = await wrap.evaluate((el) => el.scrollLeft)
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(300)
    expect(await wrap.evaluate((el) => el.scrollLeft)).toBeGreaterThan(from)
  })

  test('a table that fits does not become a pointless tab stop', async ({ page }) => {
    await openGates(page)
    await page.goto('/#/module/act-9-02')
    await expect(page.locator('table').first()).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1500)
    const pointless = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.dr-table-wrap[tabindex="0"]')].filter((el) => el.scrollWidth - el.clientWidth <= 1).length,
    )
    expect(pointless).toBe(0)
  })
})

test.describe('A3 · module heading levels', () => {
  // The module sections (<Briefing>, <Drill>, <MissionBeat>, <LogEntry>, …) now render their panel
  // label as an h2 and the instrument sub-heads as h3, so the h1 -> h4 jump is gone from the
  // component side. Content-authored headings remain a later pass.
  for (const id of ['act-5-03', 'act-0-01', 'act-2-02', 'act-9-02']) {
    test(`${id}: headings do not skip a level`, async ({ page }) => {
      await openGates(page)
      await page.goto(`/#/module/${id}`)
      await expect(page.locator('.dr-module h2').first()).toBeVisible({ timeout: 20_000 })
      const levels = await page.$$eval('.dr-module h1, .dr-module h2, .dr-module h3, .dr-module h4, .dr-module h5, .dr-module h6', (ns) =>
        ns.map((n) => Number(n.tagName[1])),
      )
      expect(levels[0]).toBe(1)
      const skips = levels.filter((lvl, i) => i > 0 && lvl > levels[i - 1] + 1)
      expect(skips).toEqual([])
    })
  }
})
