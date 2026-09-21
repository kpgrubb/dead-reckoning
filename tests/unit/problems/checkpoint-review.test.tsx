/**
 * Regression: the post-submit review must show the attempt that was actually graded.
 *
 * Submitting appends to `record.attempts`, which bumps the attempt count. The runner used to
 * memoise its generated items on that count, so after submit the review re-rendered with the NEXT
 * attempt's parameters while the CONFIRMED/MISSED marks, answer keys and worked solutions came from
 * the attempt just graded — items appeared to change under a correct mark. Reported by Act 0.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CheckpointRunner } from '@/components/Checkpoint'
import { buildCheckpointProblems, type CheckpointSpec } from '@/lib/problems/checkpoints'
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

describe('<CheckpointRunner> post-submit review', () => {
  beforeEach(() => {
    useProgress.getState().resetAll()
    sessionStorage.clear()
  })

  it('keeps the graded attempt on screen after submit, and reseeds only on retry', () => {
    const learnerSeed = useProgress.getState().learnerSeed
    const attempt0 = buildCheckpointProblems(spec, learnerSeed, 0)
    const attempt1 = buildCheckpointProblems(spec, learnerSeed, 1)
    // The generators must actually differ between attempts, or this test proves nothing.
    expect(attempt1.q1.prompt).not.toBe(attempt0.q1.prompt)

    render(
      <MemoryRouter>
        <CheckpointRunner spec={spec} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'BEGIN' }))
    expect(screen.getByText(attempt0.q1.prompt.split('\n')[0].slice(0, 40), { exact: false })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Answer to item 1'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'SUBMIT CHECKPOINT' }))
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT ANYWAY/i }))

    // Still the graded attempt's items — not attempt 1's.
    expect(screen.getByText(attempt0.q1.prompt.split('\n')[0].slice(0, 40), { exact: false })).toBeInTheDocument()
    expect(screen.queryByText(attempt1.q1.prompt.split('\n')[0].slice(0, 40), { exact: false })).toBeNull()
    expect(useProgress.getState().checkpoints['act-0'].attempts).toHaveLength(1)

    // Retry advances to the next attempt's parameters.
    fireEvent.click(screen.getByRole('button', { name: /RETRY/ }))
    expect(screen.getByText(attempt1.q1.prompt.split('\n')[0].slice(0, 40), { exact: false })).toBeInTheDocument()
  })
})
