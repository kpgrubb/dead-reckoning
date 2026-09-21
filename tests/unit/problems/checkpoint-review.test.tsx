/**
 * Regression: the post-submit review must show the attempt that was actually graded.
 *
 * Submitting appends to `record.attempts`, which bumps the attempt count. The runner used to
 * memoise its generated items on that count, so after submit the review re-rendered with the NEXT
 * attempt's parameters while the CONFIRMED/MISSED marks, answer keys and worked solutions came from
 * the attempt just graded — items appeared to change under a correct mark. Reported by Act 0.
 *
 * The assertions compare the *rendered* item text across the submit boundary rather than matching
 * generator prompts (whose Markdown/KaTeX does not survive rendering as a literal substring).
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CheckpointRunner } from '@/components/Checkpoint'
import type { CheckpointSpec } from '@/lib/problems/checkpoints'
import { useProgress } from '@/store/progress'

const spec: CheckpointSpec = {
  act: 'act-0',
  title: 'Review integrity',
  briefing: 'Prove the review shows the graded attempt.',
  items: [
    { id: 'q1', generator: 'act-0/fix-error-mean', review: ['act-0-01'] },
    { id: 'q2', generator: 'act-0/resistant-center', review: ['act-0-01'] },
  ],
  onPass: 'Certified.',
  onFail: 'Again.',
  est_minutes: 5,
}

/**
 * Visible text of the first checkpoint item, minus its heading and per-item state word
 * (OPEN → ANSWERED → CONFIRMED/MISSED changes across the submit boundary and is not the question).
 */
function itemOneText(): string {
  const raw = (screen.getByRole('region', { name: /Item 1 of 2/ }).textContent ?? '').replace(/\s+/g, ' ').trim()
  return raw.replace(/^Item \d+ of \d+[^A-Za-z]*(?:OPEN|ANSWERED|CONFIRMED|MISSED)/, '').trim()
}

describe('<CheckpointRunner> post-submit review', () => {
  beforeEach(() => {
    useProgress.getState().resetAll()
    sessionStorage.clear()
  })

  it('keeps the graded attempt on screen after submit, and reseeds only on retry', () => {
    render(
      <MemoryRouter>
        <CheckpointRunner spec={spec} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'BEGIN' }))
    const during = itemOneText()
    expect(during).not.toHaveLength(0)

    fireEvent.change(screen.getByLabelText('Answer to item 1'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'SUBMIT CHECKPOINT' }))
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT ANYWAY/i }))

    // The graded attempt is still the one on screen: the question text is unchanged, and the
    // review has added a verdict to it.
    const after = itemOneText()
    expect(after).toContain(during)
    expect(screen.getByRole('region', { name: /Item 1 of 2/ }).textContent).toMatch(/CONFIRMED|MISSED/)
    expect(useProgress.getState().checkpoints['act-0'].attempts).toHaveLength(1)

    // Retry draws fresh parameters.
    fireEvent.click(screen.getByRole('button', { name: /RETRY/ }))
    expect(itemOneText()).not.toBe(during)
  })
})
