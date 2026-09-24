/**
 * INTEL · CATEGORICAL PROCEDURE SELECTOR (act-8-04).
 *
 * The categorical analogue of Act VII's selector, with two leaves that Act VII had no use for.
 * Seven endings:
 *
 *   one-prop      one sample, one two-category outcome, read against a published figure
 *   two-prop      two separately drawn samples, one two-category outcome
 *   gof           one sample, one categorical variable, read against a claimed distribution
 *   homogeneity   several separately drawn samples, one categorical variable
 *   independence  one sample, two categorical variables recorded on every unit
 *   simulate      the table is right and the expected counts are not: simulate the null
 *   census        the file is the whole population, so there is nothing to infer to
 *
 * Two modes. TREE walks the questions one at a time and explains a wrong turn at the turn without
 * advancing. PICK hands the learner all seven leaves for one question and grades the choice,
 * naming the branch the question should have taken.
 *
 * Nothing numeric lives here. Each question carries the four structural facts the tree asks about
 * and the sentence that justifies its ending; the leaf is derived from those facts rather than
 * written down a second time, so a question cannot disagree with its own answer.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { Readout, Segmented } from '@/instruments/shared'
import { fmtInt } from '@/lib/stats'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

export type CategoricalLeaf = 'one-prop' | 'two-prop' | 'gof' | 'homogeneity' | 'independence' | 'simulate' | 'census'

export const LEAF_LABEL: Record<CategoricalLeaf, string> = {
  'one-prop': 'One-proportion z-test',
  'two-prop': 'Two-proportion z-test',
  gof: 'χ² goodness of fit',
  homogeneity: 'χ² test of homogeneity',
  independence: 'χ² test of independence',
  simulate: 'Conditions fail: simulate the null',
  census: 'A census: describe it, no inference',
}

export interface CategoricalQuestion {
  id: string
  /** The question as the office asks it. */
  question: string
  /** One line naming the units, the variables and how they were collected. */
  structure: string
  /** Sample from a larger population, or every unit there is. */
  frame: 'sample' | 'census'
  /** How many groups were drawn separately. */
  samples: 'one' | 'several'
  /** How many categorical variables are recorded on each unit (only asked of a single sample). */
  variables?: 'one' | 'two'
  /** What a single sample's single variable is read against (only asked on that branch). */
  benchmark?: 'one-proportion' | 'whole-distribution'
  /** How many categories the outcome has (only asked of several samples). */
  outcome?: 'two' | 'more'
  /** Whether every expected count clears five. Only asked where the ending is a χ² test. */
  expectedOk: boolean
  /** Why the ending is the ending, in the office's own terms. */
  because: string
}

/** The ending each question's structure forces. Derived, never stated twice. */
export function leafOf(q: CategoricalQuestion): CategoricalLeaf {
  if (q.frame === 'census') return 'census'
  const chi: CategoricalLeaf =
    q.samples === 'several' ? (q.outcome === 'two' ? 'two-prop' : 'homogeneity') : q.variables === 'two' ? 'independence' : q.benchmark === 'one-proportion' ? 'one-prop' : 'gof'
  const isChi = chi === 'gof' || chi === 'homogeneity' || chi === 'independence'
  if (isChi && !q.expectedOk) return 'simulate'
  return chi
}

/**
 * The seven questions the panel cycles. The failed-condition leaf is carried by a Ceres dock audit
 * rather than by the Bureau file 8-04's own beat is about.
 */
export const CATEGORICAL_QUESTIONS: readonly CategoricalQuestion[] = [
  {
    id: 'cargo-mix',
    question:
      'The Lane Authority publishes the declared cargo mix of everything that sails the corridor. The 31 hulls the Register carries as lost are a small part of that traffic, drawn from it by whatever sank them. **Do the lost hulls carry the cargo the corridor carries?**',
    structure: 'One group of 31 hulls, one categorical variable recorded on each (cargo class), read against a published set of proportions.',
    frame: 'sample',
    samples: 'one',
    variables: 'one',
    benchmark: 'whole-distribution',
    expectedOk: true,
    because: 'One sample, one categorical variable, and a whole claimed distribution to read it against. That is goodness of fit, and the degrees of freedom are one fewer than the categories.',
  },
  {
    id: 'loss-beneficiary',
    question:
      'Every transit in the Ledger carries two facts: whether the hull arrived, and who the insured beneficiary would be if it did not. **Does whether a hull is lost depend on who collects?**',
    structure: 'One sample of 2,612 transits, with two categorical variables recorded on each transit.',
    frame: 'sample',
    samples: 'one',
    variables: 'two',
    expectedOk: true,
    because: 'One sample classified two ways. Nobody drew a Perrine group and a not-Perrine group; the transits arrived as one file and the beneficiary column was already in it. That is independence.',
  },
  {
    id: 'corridor-cause',
    question:
      "The Board's rebuttal sets the Lane's losses beside the Mars–Belt corridor's and says the two look alike. Each corridor's losses were assembled separately, by a different office, out of a different body of traffic. **Are the cause codes distributed the same way in the two corridors?**",
    structure: 'Two separately assembled groups of losses, one categorical variable (cause code) recorded in each.',
    frame: 'sample',
    samples: 'several',
    outcome: 'more',
    expectedOk: true,
    because: 'Two groups that were never one file, and one variable measured in both. The row totals were fixed by whoever assembled each corridor, not by chance, so the test is homogeneity.',
  },
  {
    id: 'office-classification',
    question:
      'Two claims offices wrote every finding on the Lane between them. **Do Uruk and Ceres classify losses differently?**',
    structure: 'Every loss there is on the corridor in six years: 31 rows, with the classifying office and the finding on each.',
    frame: 'census',
    samples: 'one',
    variables: 'two',
    expectedOk: true,
    because:
      'These 31 are not a sample of the losses. They are the losses. There is no wider population for the answer to generalise to and no sampling variability for a P-value to be about, so the honest report is a table of counts and percentages with the difference described in words.',
  },
  {
    id: 'dock-audit',
    question:
      "A Ceres dock audit pulled 260 outbound manifests and recorded, for each, whether the seal was broken on arrival and which of the four gantry crews loaded it. One crew loaded nine of the 260 and three of those nine came in broken. **Is seal failure associated with the crew that loaded?**",
    structure: 'One sample of 260 manifests, two categorical variables on each, and one row total of nine against a break rate of about four percent.',
    frame: 'sample',
    samples: 'one',
    variables: 'two',
    expectedOk: false,
    because:
      'The design says independence and the arithmetic says the chi-square reference curve does not apply: nine manifests times a four percent break rate expects well under one broken seal in that cell. Shuffle the broken-seal labels at random among the 260 several thousand times, count how often the small crew collects three or more, and report that share as the P-value.',
  },
  {
    id: 'boarding-rate',
    question:
      'The Authority publishes a six percent amendment rate for filed manifests. A cutter on patrol boarded 240 hulls drawn at random from the corridor and recorded, for each, whether the manifest had been amended. **Is the true amendment rate above the published figure?**',
    structure: 'One random sample of 240 boardings, one two-category outcome on each, read against a single published proportion.',
    frame: 'sample',
    samples: 'one',
    variables: 'one',
    benchmark: 'one-proportion',
    expectedOk: true,
    because: 'One sample, a yes/no outcome, and one published number to read it against. A single proportion has one z-test; goodness of fit on two categories would return the square of that z and answer a two-sided question nobody asked.',
  },
  {
    id: 'two-bureau-offices',
    question:
      'The Bureau of Hulls certifies fuel loads at Uruk High and at Ceres. Independent random samples of 180 certifications from each office were pulled and each was recorded as flagged or clean on re-inspection. **Do the two offices differ in flag rate?**',
    structure: 'Two independent random samples of certifications, one two-category outcome recorded in each.',
    frame: 'sample',
    samples: 'several',
    outcome: 'two',
    expectedOk: true,
    because:
      'Two separately drawn samples and a yes/no outcome, so the parameter is a difference of proportions and the two-proportion z-test states its direction. A 2×2 homogeneity test on the same counts returns the square of that z and cannot be one-sided.',
  },
]

type StepKey = 'frame' | 'samples' | 'variables' | 'benchmark' | 'outcome' | 'counts'

interface Step {
  key: StepKey
  question: string
  options: { value: string; label: string }[]
}

const WRONG_TURN: Record<string, string> = {
  'frame:sample':
    'Every unit the question is about is already in this file. Nothing was left out and nothing was drawn, so there is no sampling variability for a P-value to describe and no wider population for the conclusion to reach.',
  'frame:census': 'This file is a sample from a larger body of units, and the question is about that larger body. A census would need every unit the conclusion is about to be in the file already.',
  'samples:one': 'These groups were assembled separately, each from its own body of units. The row totals were fixed by whoever did the assembling, so they are not one sample split afterwards by a column.',
  'samples:several':
    'One file arrived and the columns were already in it. Sorting a single sample by one of its own columns afterwards does not make two samples: nobody decided in advance how many rows each group would have.',
  'variables:one': 'Two things were recorded on each unit here, and the question asks whether one of them is related to the other. A single variable has no second variable to be associated with.',
  'variables:two': 'One thing was recorded on each unit, and the comparison in the question is against something published rather than against a second column of this file.',
  'benchmark:one-proportion': 'The claim covers the whole distribution across the categories, not one of them. Testing a single category throws away the rest of the table.',
  'benchmark:whole-distribution': 'There is one published number here and a yes/no outcome. A two-category goodness-of-fit test answers a two-sided question, and the one that was asked has a direction.',
  'counts:ok': 'Go back and look at the smallest expected count. Below five, the chi-square curve is the wrong reference distribution and the P-value read off it is not a P-value.',
  'counts:fail': 'Every expected count in this table clears five, so the chi-square approximation holds and the ordinary procedure applies. Simulation is what you reach for when it does not.',
  'outcome:two': 'The outcome recorded here has more than two categories, so there is no single proportion to difference. Two groups and three or more categories is a 2×3 table.',
  'outcome:more': 'The outcome recorded here is a yes or a no. Two groups and two categories is a difference of proportions, and the z-test states its direction where a 2×2 chi-square cannot.',
}

function stepsFor(q: CategoricalQuestion): Step[] {
  const out: Step[] = [
    {
      key: 'frame',
      question: 'Is this file a sample, or is it every unit the question is about?',
      options: [
        { value: 'sample', label: 'a sample drawn from something larger' },
        { value: 'census', label: 'every unit there is' },
      ],
    },
  ]
  if (q.frame === 'census') return out

  out.push({
    key: 'samples',
    question: 'How many groups were drawn separately?',
    options: [
      { value: 'one', label: 'one group, classified afterwards' },
      { value: 'several', label: 'two or more groups, each drawn on its own' },
    ],
  })

  if (q.samples === 'one') {
    out.push({
      key: 'variables',
      question: 'How many categorical variables were recorded on each unit?',
      options: [
        { value: 'one', label: 'one' },
        { value: 'two', label: 'two' },
      ],
    })
    if (q.variables === 'one') {
      out.push({
        key: 'benchmark',
        question: 'What is the observed distribution read against?',
        options: [
          { value: 'one-proportion', label: 'a single published proportion' },
          { value: 'whole-distribution', label: 'a claimed distribution over all the categories' },
        ],
      })
    }
  } else {
    out.push({
      key: 'outcome',
      question: 'How many categories does the recorded outcome have?',
      options: [
        { value: 'two', label: 'two' },
        { value: 'more', label: 'three or more' },
      ],
    })
  }

  const chiBranch = q.samples === 'several' ? q.outcome === 'more' : q.variables === 'two' || q.benchmark === 'whole-distribution'
  if (chiBranch) {
    out.push({
      key: 'counts',
      question: 'Does every expected count clear five?',
      options: [
        { value: 'ok', label: 'yes, every one of them' },
        { value: 'fail', label: 'no, at least one is below five' },
      ],
    })
  }
  return out
}

function correctAnswer(q: CategoricalQuestion, key: StepKey): string {
  switch (key) {
    case 'frame':
      return q.frame
    case 'samples':
      return q.samples
    case 'variables':
      return q.variables ?? 'one'
    case 'benchmark':
      return q.benchmark ?? 'whole-distribution'
    case 'outcome':
      return q.outcome ?? 'more'
    case 'counts':
      return q.expectedOk ? 'ok' : 'fail'
  }
}

/** Why a chosen leaf is not this question's leaf, in the terms the tree would have used. */
function whyNot(q: CategoricalQuestion, picked: CategoricalLeaf): string {
  const want = leafOf(q)
  if (picked === want) return q.because
  if (want === 'census') return WRONG_TURN['frame:sample']
  if (picked === 'census') return WRONG_TURN['frame:census']
  if (want === 'simulate') {
    return `The structure does point at a chi-square table. ${WRONG_TURN['counts:ok']}`
  }
  if (picked === 'simulate') return WRONG_TURN['counts:fail']
  const multiSample = (l: CategoricalLeaf) => l === 'two-prop' || l === 'homogeneity'
  if (multiSample(picked) !== multiSample(want)) return multiSample(picked) ? WRONG_TURN['samples:several'] : WRONG_TURN['samples:one']
  if (picked === 'two-prop' || want === 'two-prop') return want === 'two-prop' ? WRONG_TURN['outcome:more'] : WRONG_TURN['outcome:two']
  if (picked === 'independence' || want === 'independence') return want === 'independence' ? WRONG_TURN['variables:one'] : WRONG_TURN['variables:two']
  if (picked === 'one-prop' || want === 'one-prop') return want === 'one-prop' ? WRONG_TURN['benchmark:whole-distribution'] : WRONG_TURN['benchmark:one-proportion']
  return q.because
}

type Mode = 'tree' | 'pick' | 'reference'

export interface CategoricalProcedureSelectorProps {
  questions?: readonly CategoricalQuestion[]
  mode?: Mode
  label?: string
  tone?: PanelTone
}

export function CategoricalProcedureSelector({
  questions = CATEGORICAL_QUESTIONS,
  mode: mode0 = 'tree',
  label = 'INTEL · CATEGORICAL PROCEDURE SELECTOR',
  tone = 'intel',
}: CategoricalProcedureSelectorProps = {}) {
  const [mode, setMode] = useState<Mode>(mode0)

  /* ---- Tree ---- */
  const [treeIndex, setTreeIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [turnError, setTurnError] = useState<string | null>(null)
  const q = questions[Math.min(treeIndex, questions.length - 1)]
  const steps = useMemo(() => stepsFor(q), [q])
  const answered = steps.filter((s) => answers[s.key] !== undefined)
  const complete = answered.length === steps.length

  const answerStep = (step: Step, value: string) => {
    if (value !== correctAnswer(q, step.key)) {
      setTurnError(WRONG_TURN[`${step.key}:${value}`] ?? 'Not this one. Read the structure line again.')
      return
    }
    setTurnError(null)
    setAnswers((prev) => ({ ...prev, [step.key]: value }))
  }

  const resetTree = (index: number) => {
    setTreeIndex(index)
    setAnswers({})
    setTurnError(null)
  }

  /* ---- Pick ---- */
  const [pickIndex, setPickIndex] = useState(0)
  const [picked, setPicked] = useState<CategoricalLeaf | null>(null)
  const [graded, setGraded] = useState<CategoricalLeaf | null>(null)
  const [score, setScore] = useState({ right: 0, asked: 0 })
  const item = questions[Math.min(pickIndex, questions.length - 1)]

  const gradePick = () => {
    if (!picked) return
    setGraded(picked)
    setScore((s) => ({ right: s.right + (picked === leafOf(item) ? 1 : 0), asked: s.asked + 1 }))
  }

  const nextPick = () => {
    setPickIndex((i) => (i + 1) % questions.length)
    setPicked(null)
    setGraded(null)
  }

  const status = mode === 'pick' ? `NAME IT · ${fmtInt(score.right)}/${fmtInt(score.asked)} CORRECT` : mode === 'tree' ? `TREE · ${fmtInt(answered.length)}/${fmtInt(steps.length)}` : 'REFERENCE'

  return (
    <Panel
      label={label}
      status={status}
      tone={tone}
      led={mode === 'pick' && graded !== null && graded !== leafOf(item) ? 'warn' : 'on'}
      ariaLabel="Categorical procedure selector: a graded decision tree over categorical questions"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Mode>
            label="mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'tree', label: 'walk the tree' },
              { value: 'pick', label: 'name the procedure' },
              { value: 'reference', label: 'reference matrix' },
            ]}
          />
        </div>

        {mode === 'tree' && (
          <>
            <div className="dr-controls">
              <Segmented<string> label="question" value={q.id} onChange={(v) => resetTree(questions.findIndex((x) => x.id === v))} options={questions.map((x, i) => ({ value: x.id, label: `${i + 1}` }))} />
            </div>
            <Note>{q.question}</Note>
            <Note tone="muted">Structure: {q.structure}</Note>

            <ol style={{ margin: 0, paddingLeft: 'var(--dr-sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--dr-sp-3)' }}>
              {steps.map((step, i) => {
                const done = answers[step.key] !== undefined
                if (i > answered.length) return null
                return (
                  <li key={step.key}>
                    <Subhead>{step.question}</Subhead>
                    {done ? (
                      <Readout label="answered" value={step.options.find((o) => o.value === answers[step.key])?.label ?? answers[step.key]} size="sm" />
                    ) : (
                      <div className="dr-controls" role="group" aria-label={step.question}>
                        {step.options.map((o) => (
                          <button key={o.value} type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => answerStep(step, o.value)}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>

            {turnError && (
              <Note tone="alert" live>
                {turnError}
              </Note>
            )}

            {complete && (
              <section aria-label="What the tree named">
                <ReadoutGrid>
                  <Readout label="procedure" value={LEAF_LABEL[leafOf(q)]} tone="intel" live />
                </ReadoutGrid>
                <Note tone="ok" live>
                  {q.because}
                </Note>
                <div className="dr-controls">
                  <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => resetTree((treeIndex + 1) % questions.length)}>
                    NEXT QUESTION
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {mode === 'pick' && (
          <>
            <Subhead>
              Question {fmtInt(pickIndex + 1)} of {fmtInt(questions.length)}
            </Subhead>
            <Note>{item.question}</Note>
            <Note tone="muted">Structure: {item.structure}</Note>

            <div className="dr-controls" role="group" aria-label="Choose a procedure">
              {(Object.keys(LEAF_LABEL) as CategoricalLeaf[]).map((leaf) => (
                <button
                  key={leaf}
                  type="button"
                  className="dr-btn dr-btn--ghost dr-btn--sm"
                  aria-pressed={picked === leaf}
                  style={picked === leaf ? { color: 'var(--dr-fg-0)', borderColor: 'var(--dr-violet)' } : undefined}
                  onClick={() => setPicked(leaf)}
                >
                  {LEAF_LABEL[leaf]}
                </button>
              ))}
            </div>
            <div className="dr-controls">
              <button type="button" className="dr-btn dr-btn--primary dr-btn--sm" onClick={gradePick} disabled={!picked}>
                GRADE THIS ONE
              </button>
              <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={nextPick}>
                NEXT QUESTION
              </button>
            </div>

            <ReadoutGrid>
              <Readout label="correct so far" value={`${fmtInt(score.right)} / ${fmtInt(score.asked)}`} tone="intel" size="sm" live />
            </ReadoutGrid>

            {graded && (
              <Note tone={graded === leafOf(item) ? 'ok' : 'alert'} live>
                {graded === leafOf(item) ? `Correct: ${LEAF_LABEL[leafOf(item)]}. ${item.because}` : `Not ${LEAF_LABEL[graded]}. ${whyNot(item, graded)} The procedure is ${LEAF_LABEL[leafOf(item)]}.`}
              </Note>
            )}
          </>
        )}

        {mode === 'reference' && (
          <section aria-label="Reference matrix">
            <Subhead>How the data were collected → the procedure</Subhead>
            <KeyTable
              caption="Every row but the last two is settled before a single count is read"
              ariaLabel="Reference matrix of data collection, structure, procedure and degrees of freedom"
              columns={['how the data were collected', 'what is on each unit', 'procedure', 'df']}
              rows={[
                ['one random sample', 'one two-category outcome, against a published proportion', LEAF_LABEL['one-prop'], 'none (z)'],
                ['two independent random samples', 'one two-category outcome in each', LEAF_LABEL['two-prop'], 'none (z)'],
                ['one random sample', 'one categorical variable, against a claimed distribution', LEAF_LABEL.gof, 'k − 1'],
                ['two or more separately drawn samples', 'one categorical variable in each', LEAF_LABEL.homogeneity, '(r − 1)(c − 1)'],
                ['one random sample', 'two categorical variables on every unit', LEAF_LABEL.independence, '(r − 1)(c − 1)'],
                ['any of the above, with an expected count below five', 'the table is right; the reference curve is not', LEAF_LABEL.simulate, 'none'],
                ['every unit there is', 'whatever was recorded', LEAF_LABEL.census, 'none'],
              ]}
            />
            <Note>
              The first three rows of that table are answered by reading the collection rule, and the arithmetic of homogeneity and independence is identical once the counts are in. What separates
              them is which totals were fixed before any data existed.
            </Note>
            <Note tone="warn">
              The last two rows are the ones a calculator will not protect you from. It will run a χ² test on a table expecting 0.8 in a cell and print a P-value, and it will run one on a population
              and print a P-value for a question about sampling that nobody sampled.
            </Note>
          </section>
        )}
      </div>
    </Panel>
  )
}
