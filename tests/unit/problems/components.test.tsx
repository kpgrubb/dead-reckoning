import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Drill } from '@/components/Drill'
import { CheckpointRunner } from '@/components/Checkpoint'
import { Gated, MissionBeat, Success, Failure, consultedBeats } from '@/components/MissionBeat'
import { buildCheckpointProblems, draftKey, type CheckpointSpec } from '@/lib/problems/checkpoints'
import { drillSeed } from '@/lib/problems/generate'
import { instantiate } from '@/lib/problems/registry'
import { standardDeviationInterpretation } from '@/lib/problems/rubrics'
import { useProgress } from '@/store/progress'
import { fmt } from '@/lib/stats/format'

function numericValue(answer: { type: string }): number {
  const q = (answer as { type: 'display'; question: { type: string; value: number } }).type === 'display' ? (answer as { question: { value: number } }).question : (answer as { value: number })
  return q.value
}

beforeEach(() => {
  useProgress.getState().resetAll()
  sessionStorage.clear()
})

describe('<Drill>', () => {
  it('grades, reveals the readout after two wrong attempts, and tracks progress', () => {
    render(<Drill generator="act-0/fix-error-mean" count={2} />)
    expect(screen.getByText(/0\/2 confirmed/)).toBeInTheDocument()
    const first = screen.getByRole('region', { name: /Problem 1/ })
    const input = within(first).getByLabelText('Answer to problem 1')
    const check = within(first).getByRole('button', { name: 'CHECK' })

    fireEvent.change(input, { target: { value: '999' } })
    fireEvent.click(check)
    expect(within(first).getByText('REJECTED', { selector: 'strong' })).toBeInTheDocument()
    expect(within(first).queryByRole('button', { name: 'READ INSTRUMENT' })).toBeNull()
    fireEvent.change(input, { target: { value: '998' } })
    fireEvent.click(check)
    fireEvent.click(within(first).getByRole('button', { name: 'READ INSTRUMENT' }))
    expect(within(first).getByText('INSTRUMENT READOUT')).toBeInTheDocument()

    // Compute the true answer the same way the component does and confirm it.
    const learnerSeed = useProgress.getState().learnerSeed
    const p = instantiate('act-0/fix-error-mean', drillSeed(learnerSeed, 'standalone', 'act-0/fix-error-mean', 0, 0))
    fireEvent.change(input, { target: { value: fmt(numericValue(p.answer), 1) } })
    fireEvent.click(check)
    expect(within(first).getAllByText('CONFIRMED').length).toBeGreaterThan(0)
    expect(screen.getByText(/1\/2 confirmed/)).toBeInTheDocument()
    expect(input).toBeDisabled()

    // Hints and worked solution
    fireEvent.click(within(first).getByRole('button', { name: 'WORKED SOLUTION' }))
    expect(within(first).getByText(/WORKED SOLUTION · answer:/)).toBeInTheDocument()
    const second = screen.getByRole('region', { name: /Problem 2/ })
    fireEvent.click(within(second).getByRole('button', { name: /HINT 1\/2/ }))
    expect(within(second).getByText('HINT 1')).toBeInTheDocument()
    expect(useProgress.getState().drills['standalone/act-0/fix-error-mean/0'].correct).toBe(1)
  })

  it('renders the display panel and choice input for display items', () => {
    render(<Drill generator="act-0/dotplot-shape" count={1} />)
    expect(screen.getByText('INTERPRET THIS DISPLAY')).toBeInTheDocument()
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.getAllByRole('radio').length).toBe(3)
  })

  it('shows an alert for an unknown generator', () => {
    render(<Drill generator="act-9/nope" />)
    expect(screen.getByText(/not registered/)).toBeInTheDocument()
  })
})

const spec: CheckpointSpec = {
  act: 'act-0',
  title: 'Shakedown certification',
  briefing: 'Prove the **pipeline**.',
  items: [
    { id: 'q1', generator: 'act-0/fix-error-mean', review: ['act-0-01'] },
    { id: 'q2', generator: 'act-0/resistant-center', review: ['act-0-01'], debrief: 'The XO taps the outlier.' },
    { id: 'q3', generator: 'act-0/dotplot-shape', review: ['act-0-01', 'act-0-99'] },
  ],
  onPass: 'Certified.',
  onFail: 'Back to the **simulator**.',
  est_minutes: 15,
}

function renderCheckpoint() {
  return render(
    <MemoryRouter>
      <CheckpointRunner spec={spec} />
    </MemoryRouter>,
  )
}

describe('<CheckpointRunner>', () => {
  it('runs an attempt: confirm on unanswered, debrief with links, retry reseeds, pass marks complete', () => {
    renderCheckpoint()
    expect(screen.getByText(/≈ 15 MIN/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'BEGIN' }))
    expect(screen.getByRole('progressbar', { name: 'Items answered' })).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByRole('region', { name: /Item 1 of 3/ })).toBeInTheDocument()
    expect(screen.getByText('INTERPRET THIS DISPLAY')).toBeInTheDocument()

    // Draft persistence
    fireEvent.change(screen.getByLabelText('Answer to item 1'), { target: { value: '5' } })
    expect(sessionStorage.getItem(draftKey('act-0'))).toContain('"q1":"5"')
    expect(screen.getByRole('progressbar', { name: 'Items answered' })).toHaveAttribute('aria-valuenow', '1')

    // Submit with unanswered items → confirmation
    fireEvent.click(screen.getByRole('button', { name: 'SUBMIT CHECKPOINT' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('2 items unanswered')
    fireEvent.click(screen.getByRole('button', { name: 'KEEP WORKING' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'SUBMIT CHECKPOINT' }))
    fireEvent.click(screen.getByRole('button', { name: 'SUBMIT ANYWAY' }))

    // Debrief
    expect(screen.getByText(/SCORE 0% — BELOW THRESHOLD/)).toBeInTheDocument()
    const debrief = screen.getByRole('region', { name: 'Debrief' })
    expect(within(debrief).getByText('simulator')).toBeInTheDocument()
    expect(within(debrief).getByText('The XO taps the outlier.')).toBeInTheDocument()
    const links = within(debrief).getAllByRole('link')
    expect(links.some((l) => l.getAttribute('href') === '/module/act-0-01')).toBe(true)
    expect(links.some((l) => l.textContent?.includes('act-0-99'))).toBe(true)
    expect(sessionStorage.getItem(draftKey('act-0'))).toBeNull()
    expect(screen.getAllByText(/WORKED SOLUTION/).length).toBe(3)
    expect(useProgress.getState().checkpoints['act-0'].attempts).toHaveLength(1)
    expect(useProgress.getState().checkpoints['act-0'].attempts[0].missed).toHaveLength(3)
    expect(useProgress.getState().completed.standalone).toBeUndefined()

    // Retry with fresh parameters, answer everything correctly
    fireEvent.click(screen.getByRole('button', { name: 'RETRY · NEW PARAMETERS' }))
    const learnerSeed = useProgress.getState().learnerSeed
    const problems = buildCheckpointProblems(spec, learnerSeed, 1)
    fireEvent.change(screen.getByLabelText('Answer to item 1'), { target: { value: String(numericValue(problems.q1.answer)) } })
    const q2 = problems.q2.answer as { type: 'choice'; correct: number }
    fireEvent.click(within(screen.getByRole('region', { name: /Item 2 of 3/ })).getAllByRole('radio')[q2.correct])
    const q3 = (problems.q3.answer as { type: 'display'; question: { correct: number } }).question
    fireEvent.click(within(screen.getByRole('region', { name: /Item 3 of 3/ })).getAllByRole('radio')[q3.correct])
    expect(screen.getByRole('progressbar', { name: 'Items answered' })).toHaveAttribute('aria-valuenow', '3')
    fireEvent.click(screen.getByRole('button', { name: 'SUBMIT CHECKPOINT' }))
    expect(screen.getByText(/SCORE 100% — PASSED/)).toBeInTheDocument()
    expect(screen.getByText('Certified.')).toBeInTheDocument()
    expect(useProgress.getState().checkpoints['act-0'].passed).toBe(true)
    expect(useProgress.getState().completed.standalone).toBeDefined()
  })

  it('resumes an in-progress draft', () => {
    sessionStorage.setItem(draftKey('act-0'), JSON.stringify({ attemptNo: 0, learnerSeed: useProgress.getState().learnerSeed, responses: { q1: '7' }, savedAt: 'x' }))
    renderCheckpoint()
    expect(screen.getByText(/Resumed your in-progress attempt/)).toBeInTheDocument()
    expect(screen.getByLabelText('Answer to item 1')).toHaveValue('7')
  })
})

describe('<MissionBeat kind="interpretation">', () => {
  const rubric = standardDeviationInterpretation({ sd: 2.4, variable: 'transit time', units: 'hours', population: 'corridor freighters', mean: 31.6 })
  function renderBeat() {
    return render(
      <>
        <MissionBeat id="test-beat" kind="interpretation" prompt="Interpret s." hint="Typical distance from the mean." {...rubric}>
          <Success>The XO nods.</Success>
          <Failure>The XO frowns.</Failure>
        </MissionBeat>
        <Gated by="test-beat">SEALED CONTENT REVEALED</Gated>
      </>,
    )
  }
  it('shows per-group feedback on a partial answer, passes on the exemplar, logs consults, opens the gate', () => {
    renderBeat()
    expect(screen.queryByText('SEALED CONTENT REVEALED')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'CONSULT' }))
    expect(screen.getByText('Typical distance from the mean.')).toBeInTheDocument()
    expect(consultedBeats()).toContain('test-beat')

    const box = screen.getByLabelText(/Mission call/)
    fireEvent.change(box, { target: { value: 'All transit times are within 2.4 hours of the mean.' } })
    fireEvent.click(screen.getByRole('button', { name: 'COMMIT' }))
    expect(screen.getByText('The XO frowns.')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Rubric' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Unsupported claims' })).toHaveTextContent('Treats the SD as a bound')

    fireEvent.change(box, { target: { value: rubric.exemplar } })
    fireEvent.click(screen.getByRole('button', { name: 'COMMIT' }))
    expect(screen.getByText('The XO nods.')).toBeInTheDocument()
    expect(screen.getByText('SEALED CONTENT REVEALED')).toBeInTheDocument()
    expect(useProgress.getState().beats['test-beat'].attempts).toBe(2)
  })
})
