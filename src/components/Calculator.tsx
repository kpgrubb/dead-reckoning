/**
 * <Calculator> — TI-84 Plus CE keystrokes for the procedure the module just taught.
 *
 * Deliberately outside the fiction: this is the learner at a desk with the calculator they will
 * have in the exam, not the commanding officer at a console. Keep the voice plain and imperative.
 *
 *   <Calculator title="One-variable statistics">
 *     <Calculator.Step keys={['STAT', '1:Edit']}>Type the six values into L1.</Calculator.Step>
 *     <Calculator.Step keys={['STAT', '▸ CALC', '1:1-Var Stats']} note="List: L1, FreqList: blank">
 *       Run it, then arrow down for the five-number summary.
 *     </Calculator.Step>
 *     <Calculator.Read label="x̄" value="12.8">the sample mean</Calculator.Read>
 *     <Calculator.Watch>Sx is the sample SD (÷ n−1). σx divides by n — not what AP wants here.</Calculator.Watch>
 *   </Calculator>
 *
 * `keys` renders each token as a key cap. Use the calculator's own labels, including the menu
 * numbers ("1:Edit", "2:2-SampTTest"), so the learner can match them on the device. Arrow keys are
 * written ▸ ◂ ▴ ▾; 2nd/ALPHA prefixes are their own tokens.
 */
import type { ReactNode } from 'react'
import { Panel } from './Panel'
import './calculator.css'

export interface CalculatorProps {
  /** What the sequence accomplishes, e.g. "One-variable statistics". */
  title: string
  /** Override the model line in the header. */
  model?: string
  children: ReactNode
}

export function Calculator({ title, model = 'TI-84 PLUS CE', children }: CalculatorProps) {
  return (
    <Panel label={`ON THE CALCULATOR · ${title}`} status={model} tone="engineering" className="dr-calc84">
      <ol className="dr-calc84__steps">{children}</ol>
    </Panel>
  )
}

function Keys({ keys }: { keys: readonly string[] }) {
  return (
    <span className="dr-calc84__keys">
      {keys.map((k, i) => (
        <span key={i}>
          {i > 0 && <span className="dr-calc84__arrow" aria-hidden="true">›</span>}
          <kbd className={`dr-calc84__key ${/^\d+:/.test(k) ? 'is-menu' : ''} ${k === '2nd' || k === 'ALPHA' ? 'is-mod' : ''}`}>{k}</kbd>
        </span>
      ))}
    </span>
  )
}

Calculator.Step = ({ keys, note, children }: { keys?: readonly string[]; note?: string; children: ReactNode }) => (
  <li className="dr-calc84__step">
    {keys && keys.length > 0 && <Keys keys={keys} />}
    <div className="dr-calc84__what">{children}</div>
    {note && <div className="dr-calc84__note">{note}</div>}
  </li>
)

/**
 * A value to read off the screen once the command has run. Children are optional, but give at
 * least the first `Read` in a run a gloss — a column of bare screen chips looks unfinished.
 */
Calculator.Read = ({ label, value, children }: { label: string; value?: string; children?: ReactNode }) => (
  <li className="dr-calc84__step dr-calc84__step--read">
    <span className="dr-calc84__screen">
      {label}
      {value !== undefined && <span className="dr-calc84__screen-value">={value}</span>}
    </span>
    {children && <div className="dr-calc84__what">{children}</div>}
  </li>
)

/** The trap on this screen — the wrong row, the wrong divisor, the wrong tail. */
Calculator.Watch = ({ children }: { children: ReactNode }) => (
  <li className="dr-calc84__step dr-calc84__step--watch">
    <span className="dr-calc84__watch-tag">WATCH</span>
    <div className="dr-calc84__what">{children}</div>
  </li>
)
