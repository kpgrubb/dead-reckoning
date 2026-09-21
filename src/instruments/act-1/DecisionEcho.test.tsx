import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DecisionEcho } from './DecisionEcho'
import { useProgress } from '@/store/progress'

const BEAT = 'act-1-03-trust'

beforeEach(() => {
  useProgress.getState().resetAll()
})

describe('<DecisionEcho>', () => {
  it('renders nothing while the decision is still open', () => {
    render(
      <DecisionEcho beat={BEAT} option="Trust Oyelaran">
        <p>She was right about the plume.</p>
      </DecisionEcho>,
    )
    expect(screen.queryByText(/right about the plume/)).toBeNull()
  })

  it('renders the children once the learner has made that call', () => {
    useProgress.setState({ decisions: { [BEAT]: 'Trust Oyelaran' } })
    render(
      <DecisionEcho beat={BEAT} option="Trust Oyelaran">
        <p>She was right about the plume.</p>
      </DecisionEcho>,
    )
    expect(screen.getByText(/right about the plume/)).toBeInTheDocument()
  })

  it('stays silent when a different option was chosen, and negate inverts that', () => {
    useProgress.setState({ decisions: { [BEAT]: 'Trust the class table' } })
    render(
      <>
        <DecisionEcho beat={BEAT} option="Trust Oyelaran">
          <p>matched</p>
        </DecisionEcho>
        <DecisionEcho beat={BEAT} option="Trust Oyelaran" negate>
          <p>not matched</p>
        </DecisionEcho>
      </>,
    )
    expect(screen.queryByText('matched')).toBeNull()
    expect(screen.getByText('not matched')).toBeInTheDocument()
  })

  it('negate still renders nothing while undecided', () => {
    render(
      <DecisionEcho beat={BEAT} option="Trust Oyelaran" negate>
        <p>not matched</p>
      </DecisionEcho>,
    )
    expect(screen.queryByText('not matched')).toBeNull()
  })
})
