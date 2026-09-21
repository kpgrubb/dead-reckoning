/**
 * SENSOR · OUTLIER EXPLORER (act-1-04) — one point, dragged. The learner takes a single value out of
 * the batch and watches which summaries follow it and which do not: the mean and the standard
 * deviation chase the dragged point, the median and the IQR barely notice. A with / without toggle
 * sets the dragged point aside entirely.
 *
 * Only one point may leave its logged value at a time; RESET puts it back.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components/Panel'
import { Dotplot, Segmented, Readout, ReadoutRow, seriesColor } from '@/instruments/shared'
import { describe, fmt, fmtInt, iqr, mean, median, range as rangeOf, sd } from '@/lib/stats'
import { harpagia, harpagiaIndex, ratioPct, timeToSilence } from './data'
import { Note, stackStyle } from './_ui'

export interface OutlierExplorerProps {
  /** Which batch opens: the sixty plume ratios or the thirty-one times to silence. */
  dataset?: 'ratio' | 'silence'
}

type Dataset = 'ratio' | 'silence'
type Scope = 'with' | 'without'

interface DatasetSpec {
  values: number[]
  name: string
  units: string
  axis: string
  digits: number
  step: number
  /** Drag range — wider than the data, so a point can be pulled well clear of the batch. */
  domain: [number, number]
  /** The point the instrument hands the learner first. */
  defaultIndex: number
  note: string
}

const silenceMaxIndex = timeToSilence.reduce((best, v, i) => (v > timeToSilence[best] ? i : best), 0)

const SPEC: Record<Dataset, DatasetSpec> = {
  ratio: {
    values: ratioPct,
    name: 'plume ratio',
    units: '% of expectation',
    axis: 'plume power as a percent of the class-table expectation',
    digits: 2,
    step: 0.1,
    domain: [88, 126],
    defaultIndex: harpagiaIndex,
    note: `The dot in alert colour is contact ${harpagia.contact_id}, the one running hot. Drag it back into the pack and watch what the mean does.`,
  },
  silence: {
    values: timeToSilence,
    name: 'time to silence',
    units: 'h',
    axis: 'hours from first transponder degradation to loss of signal',
    digits: 2,
    step: 0.01,
    domain: [0, 16],
    defaultIndex: silenceMaxIndex,
    note: 'Two processes in one batch: a dozen losses that went silent inside a minute, nineteen that faded over hours. Drag any point; the flagged one is the slowest fade on the Register.',
  },
}

interface StatRow {
  key: string
  label: string
  value: number
  base: number
  resistant: boolean
}

export function OutlierExplorer({ dataset: initialDataset = 'ratio' }: OutlierExplorerProps) {
  const [dataset, setDataset] = useState<Dataset>(initialDataset)
  const [scope, setScope] = useState<Scope>('with')
  const [edited, setEdited] = useState<Record<Dataset, number[]>>({ ratio: ratioPct.slice(), silence: timeToSilence.slice() })
  const [selected, setSelected] = useState<Record<Dataset, number>>({ ratio: SPEC.ratio.defaultIndex, silence: SPEC.silence.defaultIndex })

  const spec = SPEC[dataset]
  const logged = spec.values
  const values = edited[dataset]
  const index = selected[dataset]
  const d = spec.digits
  const moved = values[index] !== logged[index]

  /* Only one point may deviate from the log at a time: a drag on a second point is ignored. */
  const onValuesChange = (next: number[]) => {
    const changed = next.findIndex((v, i) => v !== values[i])
    if (changed < 0) return
    const othersMoved = values.some((v, i) => i !== changed && v !== logged[i])
    if (othersMoved) return
    setSelected((s) => ({ ...s, [dataset]: changed }))
    setEdited((s) => ({ ...s, [dataset]: next }))
  }
  const reset = () => {
    setEdited((s) => ({ ...s, [dataset]: SPEC[dataset].values.slice() }))
    setSelected((s) => ({ ...s, [dataset]: SPEC[dataset].defaultIndex }))
  }

  /** The batch the summaries are computed from: everything, or everything but the dragged point. */
  const shown = useMemo(() => (scope === 'without' ? values.filter((_, i) => i !== index) : values.slice()), [values, index, scope])
  const baseShown = useMemo(() => (scope === 'without' ? logged.filter((_, i) => i !== index) : logged.slice()), [logged, index, scope])

  const summary = useMemo(() => describe(shown), [shown])
  const baseSummary = useMemo(() => describe(baseShown), [baseShown])

  const rows: StatRow[] = [
    { key: 'mean', label: 'mean', value: mean(shown), base: mean(baseShown), resistant: false },
    { key: 'median', label: 'median', value: median(shown), base: median(baseShown), resistant: true },
    { key: 'range', label: 'range', value: rangeOf(shown), base: rangeOf(baseShown), resistant: false },
    { key: 'iqr', label: 'IQR', value: iqr(shown), base: iqr(baseShown), resistant: true },
    { key: 'sd', label: 'SD', value: sd(shown), base: sd(baseShown), resistant: false },
  ]

  /** A summary counts as "moved" once it has shifted by more than 1% of the logged range. */
  const threshold = 0.01 * baseSummary.range
  const flagged = rows.filter((r) => Math.abs(r.value - r.base) > threshold)

  const dragged = values[index]
  const loggedValue = logged[index]

  return (
    <Panel label="SENSOR · OUTLIER EXPLORER" status={moved ? 'ONE VALUE MOVED' : `${fmtInt(logged.length)} VALUES · AS LOGGED`} tone="sensor" led={moved ? 'warn' : 'on'}>
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
          <Segmented<Scope>
            label="the dragged point"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'with', label: 'with' },
              { value: 'without', label: 'set aside' },
            ]}
          />
          <button type="button" className="dr-btn dr-btn--primary" onClick={reset} disabled={!moved}>
            RESET TO LOGGED VALUE
          </button>
        </div>

        <ReadoutRow>
          <Readout label="n in the summary" value={fmtInt(summary.n)} size="sm" />
          <Readout label="dragged value" value={fmt(dragged, d)} units={spec.units} tone={moved ? 'alert' : 'sensor'} live />
          <Readout label="logged value" value={fmt(loggedValue, d)} units={spec.units} size="sm" />
        </ReadoutRow>

        <ReadoutRow>
          {rows.map((r) => (
            <Readout key={r.key} label={r.label} value={fmt(r.value, d)} units={spec.units} tone={Math.abs(r.value - r.base) > threshold ? 'alert' : 'sensor'} live />
          ))}
        </ReadoutRow>
        <ReadoutRow>
          {rows.map((r) => (
            <Readout key={r.key} label={`Δ ${r.label}`} value={`${r.value - r.base >= 0 ? '+' : '−'}${fmt(Math.abs(r.value - r.base), d)}`} units={spec.units} size="sm" stale={Math.abs(r.value - r.base) <= threshold} />
          ))}
        </ReadoutRow>

        <Dotplot
          values={values}
          domain={spec.domain}
          step={spec.step}
          color={seriesColor(0)}
          highlight={[index]}
          references={[
            { x: mean(shown), label: `mean ${fmt(mean(shown), d)}`, color: 'reference' },
            { x: median(shown), label: `median ${fmt(median(shown), d)}`, color: 'observed' },
          ]}
          onValuesChange={onValuesChange}
          height={230}
          label={spec.axis}
          ariaLabel={`Dotplot of ${spec.name} for ${values.length} records, with the mean and median marked`}
          description={`One dot per record at its ${spec.name} in ${spec.units}. The highlighted dot is draggable: focus it and press the left or right arrow key (Shift for ten steps). The mean line is at ${fmt(mean(shown), d)} and the median line at ${fmt(median(shown), d)}. The data table lists every value.`}
        />

        <Note>{spec.note}</Note>
        {moved ? (
          <Note tone={flagged.some((r) => !r.resistant) ? 'alert' : 'warn'} live>
            Moved by more than 1% of the logged range: {flagged.length ? flagged.map((r) => r.label).join(', ') : 'nothing yet'}. The resistant summaries — median and IQR — are built from position in the sorted list, so one value's size cannot reach them.
          </Note>
        ) : (
          <Note>Drag the highlighted dot out of the batch. Only one value may leave the log at a time; RESET puts it back.</Note>
        )}
        {scope === 'without' && (
          <Note tone="warn">
            The dragged point is set aside: the summaries above are computed from {fmtInt(summary.n)} of {fmtInt(values.length)} values. Setting a value aside is a decision to be reported, not a way to make it stop counting.
          </Note>
        )}
      </div>
    </Panel>
  )
}
