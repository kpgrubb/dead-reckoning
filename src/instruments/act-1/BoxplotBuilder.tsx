/**
 * SENSOR · FIVE-NUMBER BOARD (act-1-05) — a draggable dotplot sitting directly above the box it
 * produces. The five-number summary, the 1.5×IQR fences and the outlier list are computed by
 * `@/lib/stats` and handed to the shared `Boxplot`, so the box on screen is the course's box.
 *
 * Hide the dots and the box is all that is left: the learner sees exactly what a boxplot conceals.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components/Panel'
import { Boxplot, Dotplot, Segmented, Readout, ReadoutRow, seriesColor } from '@/instruments/shared'
import { fiveNumber, fmt, fmtInt, outliers } from '@/lib/stats'
import { ratioPct, timeToSilence } from './data'
import { KeyTable, Note, Subhead, stackStyle } from './_ui'

export interface BoxplotBuilderProps {
  /** Which batch opens: the sixty plume ratios or the thirty-one times to silence. */
  dataset?: 'ratio' | 'silence'
}

type Dataset = 'ratio' | 'silence'
type Dots = 'show' | 'hide'

interface DatasetSpec {
  values: number[]
  name: string
  group: string
  units: string
  axis: string
  digits: number
  step: number
  domain: [number, number]
  note: string
}

const SPEC: Record<Dataset, DatasetSpec> = {
  ratio: {
    values: ratioPct,
    name: 'plume ratio',
    group: 'sixty contacts',
    units: '% of expectation',
    axis: 'plume power as a percent of the class-table expectation',
    digits: 2,
    step: 0.1,
    domain: [88, 126],
    note: 'One contact sits beyond the upper fence. The fence is a rule for flagging, not a verdict: it says look again, not lying.',
  },
  silence: {
    values: timeToSilence,
    name: 'time to silence',
    group: 'thirty-one losses',
    units: 'h',
    axis: 'hours from first transponder degradation to loss of signal',
    digits: 2,
    step: 0.01,
    domain: [0, 16],
    note: 'No value here is beyond a fence, and the box is nearly as wide as the range — because the batch is two piles with a gap in the middle, and a box cannot show a gap.',
  },
}

export function BoxplotBuilder({ dataset: initialDataset = 'ratio' }: BoxplotBuilderProps) {
  const [dataset, setDataset] = useState<Dataset>(initialDataset)
  const [dots, setDots] = useState<Dots>('show')
  const [edited, setEdited] = useState<Record<Dataset, number[]>>({ ratio: ratioPct.slice(), silence: timeToSilence.slice() })

  const spec = SPEC[dataset]
  const logged = spec.values
  const values = edited[dataset]
  const d = spec.digits
  const touched = values.some((v, i) => v !== logged[i])

  const setValues = (next: number[]) => setEdited((s) => ({ ...s, [dataset]: next }))
  const reset = () => setEdited((s) => ({ ...s, [dataset]: SPEC[dataset].values.slice() }))

  /* The course's five numbers, fences and outliers — the box is drawn from these, not recomputed. */
  const five = useMemo(() => fiveNumber(values), [values])
  const fence = useMemo(() => outliers(values), [values])
  const iqrValue = five.q3 - five.q1
  const inside = useMemo(() => values.filter((v) => v >= fence.lowFence && v <= fence.highFence).sort((a, b) => a - b), [values, fence.lowFence, fence.highFence])
  const boxStats = {
    min: five.min,
    q1: five.q1,
    median: five.median,
    q3: five.q3,
    max: five.max,
    outliers: fence.values.slice().sort((a, b) => a - b),
    whiskerLo: inside.length ? inside[0] : five.q1,
    whiskerHi: inside.length ? inside[inside.length - 1] : five.q3,
    n: values.length,
  }
  const outlierIndices = values.map((v, i) => (v < fence.lowFence || v > fence.highFence ? i : -1)).filter((i) => i >= 0)

  return (
    <Panel label="SENSOR · FIVE-NUMBER BOARD" status={touched ? 'BATCH EDITED' : `${fmtInt(values.length)} VALUES · AS LOGGED`} tone="sensor" led={touched ? 'warn' : 'on'}>
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Dataset>
            label="dataset"
            value={dataset}
            onChange={setDataset}
            options={[
              { value: 'ratio', label: `plume ratio · ${ratioPct.length}` },
              { value: 'silence', label: `time to silence · ${timeToSilence.length}` },
            ]}
          />
          <Segmented<Dots>
            label="overlay dotplot"
            value={dots}
            onChange={setDots}
            options={[
              { value: 'show', label: 'show the dots' },
              { value: 'hide', label: 'box only' },
            ]}
          />
          <button type="button" className="dr-btn dr-btn--primary" onClick={reset} disabled={!touched}>
            RESET TO LOGGED VALUES
          </button>
        </div>

        <ReadoutRow>
          <Readout label="min" value={fmt(five.min, d)} units={spec.units} size="sm" />
          <Readout label="Q1" value={fmt(five.q1, d)} units={spec.units} tone="sensor" live />
          <Readout label="median" value={fmt(five.median, d)} units={spec.units} tone="sensor" live />
          <Readout label="Q3" value={fmt(five.q3, d)} units={spec.units} tone="sensor" live />
          <Readout label="max" value={fmt(five.max, d)} units={spec.units} size="sm" />
          <Readout label="IQR" value={fmt(iqrValue, d)} units={spec.units} tone="sensor" live />
        </ReadoutRow>
        <ReadoutRow>
          <Readout label="lower fence · Q1 − 1.5·IQR" value={fmt(fence.lowFence, d)} units={spec.units} size="sm" />
          <Readout label="upper fence · Q3 + 1.5·IQR" value={fmt(fence.highFence, d)} units={spec.units} size="sm" />
          <Readout label="beyond a fence" value={fmtInt(fence.values.length)} tone={fence.values.length > 0 ? 'alert' : 'sensor'} live />
        </ReadoutRow>

        {dots === 'show' ? (
          <Dotplot
            values={values}
            domain={spec.domain}
            step={spec.step}
            color={seriesColor(0)}
            highlight={outlierIndices}
            onValuesChange={setValues}
            height={190}
            label={spec.axis}
            ariaLabel={`Dotplot of ${spec.name} for ${values.length} records, above the boxplot of the same values`}
            description={`One dot per record. Dots are draggable: focus one and press the left or right arrow key (Shift for ten steps) to move a value and watch the quartiles, the fences and the whiskers follow. ${fence.values.length} value${fence.values.length === 1 ? ' is' : 's are'} beyond a fence. The data table lists every value.`}
          />
        ) : (
          <Note tone="warn">The dots are hidden. Everything the box does not draw — the gap, the second pile, the shape — is hidden with them.</Note>
        )}

        <Boxplot
          groups={[{ name: spec.group, stats: boxStats, color: seriesColor(0) }]}
          domain={spec.domain}
          showFences
          label={spec.axis}
          height={140}
          ariaLabel={`Boxplot of ${spec.name} for ${values.length} records with the 1.5 times IQR fences drawn`}
          description={`Five-number summary: minimum ${fmt(five.min, d)}, Q1 ${fmt(five.q1, d)}, median ${fmt(five.median, d)}, Q3 ${fmt(five.q3, d)}, maximum ${fmt(five.max, d)} ${spec.units}. IQR ${fmt(iqrValue, d)}. Fences at ${fmt(fence.lowFence, d)} and ${fmt(fence.highFence, d)}; ${fence.values.length} value${fence.values.length === 1 ? '' : 's'} beyond them.`}
        />

        <section aria-label="Five-number summary table">
          <Subhead>Five-number summary · n = {fmtInt(values.length)}</Subhead>
          <KeyTable
            ariaLabel="Five-number summary and fences"
            caption={`${spec.name} · ${spec.units}`}
            columns={['min', 'Q1', 'median', 'Q3', 'max', 'IQR', 'lower fence', 'upper fence', 'beyond']}
            rows={[[fmt(five.min, d), fmt(five.q1, d), fmt(five.median, d), fmt(five.q3, d), fmt(five.max, d), fmt(iqrValue, d), fmt(fence.lowFence, d), fmt(fence.highFence, d), fmtInt(fence.values.length)]]}
          />
        </section>

        <Note>{spec.note}</Note>
        {fence.values.length > 0 && (
          <Note tone="alert" live>
            Beyond a fence: {fence.values.slice().sort((a, b) => a - b).map((v) => fmt(v, d)).join(', ')} {spec.units}.
          </Note>
        )}
        {touched && <Note tone="warn">The batch has been edited. RESET TO LOGGED VALUES puts the logged numbers back.</Note>}
      </div>
    </Panel>
  )
}
