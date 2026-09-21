/**
 * SENSOR · DISTRIBUTION BUILDER (act-1-03) — Oyelaran's sixty Lane plumes as three displays of the
 * same sixty numbers. The learner switches variable (plume power / ratio to the class table), switches
 * display (dotplot / histogram / stemplot), changes the bin width, splits the batch by drive family —
 * and drags a dot to watch the histogram and the stemplot follow it.
 *
 * Every statistic is computed by `@/lib/stats`; the shared primitives only lay the marks out.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Panel } from '@/components/Panel'
import { Dotplot, Histogram, Segmented, Slider, Readout, ReadoutRow, Legend, seriesColor, padDomain, type LegendItem } from '@/instruments/shared'
import { describe, fmt, fmtInt } from '@/lib/stats'
import { contacts, harpagiaIndex, plumeTW, ratioPct, type DriveFamily } from './data'
import { Note, Stemplot, Subhead, gridStyle, stackStyle, type StemSpec } from './_ui'

export interface DistributionBuilderProps {
  /** Which of the two measured variables opens. */
  variable?: 'plume_TW' | 'ratio_pct'
}

type Variable = 'plume_TW' | 'ratio_pct'
type Display = 'dotplot' | 'histogram' | 'stemplot'
type Grouping = 'all' | 'family'

interface VariableSpec {
  /** Readout / prose name. */
  name: string
  units: string
  /** x-axis title. */
  axis: string
  digits: number
  /** Drag + arrow-key snap. */
  step: number
  bin: { min: number; max: number; step: number; initial: number }
  stem: StemSpec
  stemUnits: string
}

const SPEC: Record<Variable, VariableSpec> = {
  plume_TW: {
    name: 'plume power',
    units: 'TW',
    axis: 'measured plume power (TW)',
    digits: 3,
    step: 0.001,
    bin: { min: 0.005, max: 0.05, step: 0.005, initial: 0.02 },
    stem: { stemUnit: 0.01, leafUnit: 0.001 },
    stemUnits: 'TW',
  },
  ratio_pct: {
    name: 'plume ratio',
    units: '% of expectation',
    axis: 'plume power as a percent of the class-table expectation',
    digits: 1,
    step: 0.1,
    bin: { min: 0.5, max: 5, step: 0.5, initial: 2 },
    stem: { stemUnit: 1, leafUnit: 0.1 },
    stemUnits: '%',
  },
}

const FAMILIES: readonly DriveFamily[] = ['Mk 3', 'Tessera-C', 'Mk 2']
const FAMILY_COLOR: Record<DriveFamily, string> = { 'Mk 3': seriesColor(1), 'Tessera-C': seriesColor(0), 'Mk 2': seriesColor(3) }

/** Row indices of each drive family in the contact log — fixed, so drags map back to the log. */
const FAMILY_ROWS: Record<DriveFamily, number[]> = {
  'Mk 3': contacts.map((c, i) => (c.drive_family === 'Mk 3' ? i : -1)).filter((i) => i >= 0),
  'Tessera-C': contacts.map((c, i) => (c.drive_family === 'Tessera-C' ? i : -1)).filter((i) => i >= 0),
  'Mk 2': contacts.map((c, i) => (c.drive_family === 'Mk 2' ? i : -1)).filter((i) => i >= 0),
}

const LOGGED: Record<Variable, number[]> = { plume_TW: plumeTW, ratio_pct: ratioPct }

export function DistributionBuilder({ variable: initialVariable = 'ratio_pct' }: DistributionBuilderProps) {
  const [variable, setVariable] = useState<Variable>(initialVariable)
  const [display, setDisplay] = useState<Display>('dotplot')
  const [grouping, setGrouping] = useState<Grouping>('all')
  const [binWidth, setBinWidth] = useState<number>(SPEC[initialVariable].bin.initial)
  const [edited, setEdited] = useState<Record<Variable, number[]>>({ plume_TW: plumeTW.slice(), ratio_pct: ratioPct.slice() })

  const spec = SPEC[variable]
  const values = edited[variable]
  const logged = LOGGED[variable]
  const touched = values.some((v, i) => v !== logged[i])

  const changeVariable = (v: Variable) => {
    setVariable(v)
    setBinWidth(SPEC[v].bin.initial)
  }
  const setValues = (next: number[]) => setEdited((s) => ({ ...s, [variable]: next }))
  const reset = () => setEdited((s) => ({ ...s, [variable]: LOGGED[variable].slice() }))

  const summary = useMemo(() => describe(values), [values])
  const domain = useMemo<[number, number]>(() => padDomain([summary.min, summary.max], 0.06), [summary.min, summary.max])

  const legend: LegendItem[] = FAMILIES.map((f) => ({
    label: f,
    color: FAMILY_COLOR[f],
    shape: 'dot',
    value: `n = ${FAMILY_ROWS[f].length}`,
  }))

  const d = spec.digits
  const groupNote =
    grouping === 'family'
      ? `Split by drive family, the single lumpy batch separates: the Mk 3 hulls push a heavier plume than the Tessera-C hulls, and the six Mk 2 independents sit between them. One distribution, three processes.`
      : `All ${fmtInt(values.length)} contacts in one batch. Split by drive family to see whether the shape is one process or several.`

  /* ---- Displays ---- */

  const dotplotFor = (rows: readonly number[], label: string, color: string) => (
    <Dotplot
      values={rows.map((i) => values[i])}
      domain={domain}
      step={spec.step}
      color={color}
      highlight={rows.includes(harpagiaIndex) ? [rows.indexOf(harpagiaIndex)] : undefined}
      references={[
        { x: summary.mean, label: `mean ${fmt(summary.mean, d)}`, color: 'reference' },
        { x: summary.median, label: `median ${fmt(summary.median, d)}`, color: 'observed' },
      ]}
      onValuesChange={(next) => {
        const merged = values.slice()
        rows.forEach((row, k) => {
          merged[row] = next[k]
        })
        setValues(merged)
      }}
      height={grouping === 'family' ? 150 : 220}
      label={spec.axis}
      ariaLabel={`Dotplot of ${spec.name} for ${label}, ${rows.length} contacts`}
      description={`One dot per contact at its ${spec.name} in ${spec.units}. Dots are draggable: focus one and press the left or right arrow key (Shift for ten steps) to move it and watch the mean, the median and the other displays follow. Mean ${fmt(summary.mean, d)}, median ${fmt(summary.median, d)}. The data table lists every value.`}
    />
  )

  const histogramFor = (rows: readonly number[], label: string, color: string) => (
    <Histogram
      values={rows.map((i) => values[i])}
      binWidth={binWidth}
      domain={domain}
      color={color}
      height={grouping === 'family' ? 170 : 260}
      label={spec.axis}
      ariaLabel={`Histogram of ${spec.name} for ${label}, ${rows.length} contacts, bin width ${fmt(binWidth, d)}`}
      description={`Counts of ${label} in bins of width ${fmt(binWidth, d)} ${spec.units} across ${spec.axis}. The data table lists each bin and its count.`}
    />
  )

  const stemplotFor = (rows: readonly number[], label: string) => (
    <Stemplot
      spec={spec.stem}
      right={rows.map((i) => values[i])}
      rightLabel={`${label} · leaves`}
      units={spec.stemUnits}
      caption={`${label} · n = ${rows.length}`}
    />
  )

  const allRows = values.map((_, i) => i)

  let body: ReactNode
  if (grouping === 'all') {
    body = display === 'dotplot' ? dotplotFor(allRows, 'all sixty contacts', seriesColor(0)) : display === 'histogram' ? histogramFor(allRows, 'all sixty contacts', seriesColor(0)) : stemplotFor(allRows, 'all sixty contacts')
  } else {
    body = (
      <div style={display === 'stemplot' ? gridStyle : stackStyle}>
        {FAMILIES.map((f) => (
          <div key={f}>
            <Subhead>
              {f} · n = {FAMILY_ROWS[f].length}
            </Subhead>
            {display === 'dotplot' ? dotplotFor(FAMILY_ROWS[f], f, FAMILY_COLOR[f]) : display === 'histogram' ? histogramFor(FAMILY_ROWS[f], f, FAMILY_COLOR[f]) : stemplotFor(FAMILY_ROWS[f], f)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <Panel label="SENSOR · DISTRIBUTION BUILDER" status={touched ? 'LOG EDITED' : `${fmtInt(values.length)} CONTACTS`} tone="sensor" led={touched ? 'warn' : 'on'}>
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Variable>
            label="variable"
            value={variable}
            onChange={changeVariable}
            options={[
              { value: 'plume_TW', label: 'plume power · TW' },
              { value: 'ratio_pct', label: 'ratio · % of class table' },
            ]}
          />
          <Segmented<Display>
            label="display"
            value={display}
            onChange={setDisplay}
            options={[
              { value: 'dotplot', label: 'dotplot' },
              { value: 'histogram', label: 'histogram' },
              { value: 'stemplot', label: 'stemplot' },
            ]}
          />
          <Segmented<Grouping>
            label="group by drive family"
            value={grouping}
            onChange={setGrouping}
            options={[
              { value: 'all', label: 'one batch' },
              { value: 'family', label: 'by family' },
            ]}
          />
          {display === 'histogram' && <Slider label="bin width" value={binWidth} min={spec.bin.min} max={spec.bin.max} step={spec.bin.step} units={spec.units} onChange={setBinWidth} format={(v) => fmt(v, d)} />}
          <button type="button" className="dr-btn dr-btn--primary" onClick={reset} disabled={!touched}>
            RESET TO LOGGED VALUES
          </button>
        </div>

        <ReadoutRow>
          <Readout label="n" value={fmtInt(summary.n)} size="sm" />
          <Readout label="mean" value={fmt(summary.mean, d)} units={spec.units} tone="sensor" live />
          <Readout label="median" value={fmt(summary.median, d)} units={spec.units} tone="sensor" live />
          <Readout label="min" value={fmt(summary.min, d)} units={spec.units} size="sm" />
          <Readout label="max" value={fmt(summary.max, d)} units={spec.units} size="sm" />
        </ReadoutRow>

        {body}

        {grouping === 'family' && <Legend items={legend} ariaLabel="Drive families" />}

        {display === 'dotplot' && <Note>Drag a dot, or focus one and press ← / → (Shift for ten steps). The mean line moves with it; the median line mostly does not.</Note>}
        {display === 'histogram' && (
          <Note>
            Bin width {fmt(binWidth, d)} {spec.units}. Widen the bins until the shape is one hump; narrow them until every contact is its own spike. Neither picture is wrong — both are the same sixty numbers.
          </Note>
        )}
        {display === 'stemplot' && <Note>A stem-and-leaf keeps every value: the leaves are the data, truncated to the leaf unit, not a summary of it.</Note>}
        <Note tone={grouping === 'family' ? 'ok' : 'muted'}>{groupNote}</Note>
        {touched && <Note tone="warn">The log has been edited. RESET TO LOGGED VALUES puts the Eyes' numbers back.</Note>}
      </div>
    </Panel>
  )
}
