/**
 * HeatSinkGauge — the lithium sink ("the cellar") as a stealth budget (act-0-02; reused in Act IV).
 *
 * The learner picks a cold profile and a window, runs the sink, and watches the measured curve wander
 * off the design line run to run. The Chief never quotes hours without a ±: the readouts show the
 * projected endurance with its SD and, after two runs, the run-to-run spread.
 *
 * Physics lives in data.ts (`simulateColdRun`, `enduranceSdHours`, `designSinkPct`); the pure
 * projection `projectRun` is exported and unit-tested.
 */
import { useState } from 'react'
import { line, scaleLinear } from 'd3'
import type { Rng } from '@/lib/rng'
import { max, mean, min } from '@/lib/stats'
import { fmt } from '@/lib/stats/format'
import { Sim } from '@/components/Sim'
import { ChartSurface, HReferenceLine, Legend, PlotClip, Readout, ReadoutRow, ReferenceLine, Segmented, Slider, XAxis, YAxis, chartTheme, semanticColor, seriesColor, useChartFrame } from '@/instruments/shared'
import { PROFILES, PROFILE_ORDER, SINK_CAPACITY_GJ, designSinkPct, enduranceSdHours, simulateColdRun, type ProfileName } from './data'
import './act-0.css'

export interface SinkSample {
  h: number
  pct: number
}

export interface RunProjection {
  /** Sink % consumed per hour over the window. */
  drainPerH: number
  /** Hours a 0 → 100 % fill would last at this run's drain rate. */
  projectedEnduranceH: number
  /** Sink % at the end of the window. */
  endPct: number
  /** Hour of the first sample at 100 %, or null if the window ended short of saturation. */
  saturatedAtH: number | null
}

/** Project one run's endurance from its hourly samples: drain = (end − start) / hours; endurance = 100 / drain. */
// oxlint-disable-next-line react/only-export-components -- the contract exports this pure helper beside the gauge
export function projectRun(samples: readonly SinkSample[], hours: number, startPct: number): RunProjection {
  const endPct = samples.length > 0 ? samples[samples.length - 1].pct : startPct
  const drainPerH = hours > 0 ? (endPct - startPct) / hours : NaN
  const projectedEnduranceH = 100 / drainPerH
  const sat = samples.find((s) => s.pct >= 100)
  return { drainPerH, projectedEnduranceH, endPct, saturatedAtH: sat ? sat.h : null }
}

interface SinkRun {
  loadKw: number
  samples: SinkSample[]
  hours: number
  startPct: number
}

const GHOSTS = 12
const STEP_RUNS = 10

export interface HeatSinkGaugeProps {
  initialProfile?: ProfileName
  initialHours?: number
  startPct?: number
  label?: string
  seedKey?: string
}

export function HeatSinkGauge({ initialProfile = 'Quiet', initialHours = 40, startPct = 4, label = 'ENGINEERING · SINK CAPACITY GAUGE', seedKey = 'act-0-02/sink' }: HeatSinkGaugeProps = {}) {
  const [profile, setProfile] = useState<ProfileName>(initialProfile)
  const [hours, setHours] = useState(initialHours)
  const [runs, setRuns] = useState<SinkRun[]>([])

  const p = PROFILES[profile]

  const draw = (rng: Rng): SinkRun => ({ ...simulateColdRun(rng, p, hours, startPct), hours, startPct })
  const onRun = (rng: Rng) => {
    const r = draw(rng)
    setRuns((prev) => [...prev, r])
  }
  const onStep = (rng: Rng) => {
    const batch: SinkRun[] = []
    for (let i = 0; i < STEP_RUNS; i++) batch.push(draw(rng))
    setRuns((prev) => [...prev, ...batch])
  }
  const onReset = () => setRuns([])
  /** A new profile is a different physics: the old runs would pollute the run-to-run spread and the ghosts. */
  const onProfileChange = (next: ProfileName) => {
    if (next === profile) return
    setProfile(next)
    setRuns([])
  }

  const current = runs.length > 0 ? runs[runs.length - 1] : null
  const proj = current ? projectRun(current.samples, current.hours, current.startPct) : null
  const sdH = current ? enduranceSdHours(SINK_CAPACITY_GJ, current.loadKw, p.loadSdKw) : NaN
  const projections = runs.map((r) => projectRun(r.samples, r.hours, r.startPct).projectedEnduranceH)
  const hoursRemaining = proj ? (100 - proj.endPct) / proj.drainPerH : NaN
  const windowFits = proj ? proj.saturatedAtH === null : null

  // ---- chart ----
  const frame = useChartFrame({ height: 260, yLabel: true })
  const xMax = Math.max(hours, p.designMeanH) * 1.05
  const x = scaleLinear().domain([0, xMax]).range([0, frame.innerWidth])
  const y = scaleLinear().domain([0, 100]).range([frame.innerHeight, 0])
  const path = line<SinkSample>()
    .x((d) => x(d.h))
    .y((d) => y(d.pct))
  const designPath = path([
    { h: 0, pct: startPct },
    { h: xMax, pct: designSinkPct(p, xMax, startPct) },
  ])
  const ghosts = runs.slice(Math.max(0, runs.length - 1 - GHOSTS), Math.max(0, runs.length - 1))
  const table = {
    columns: ['hour', 'sink % of capacity'],
    rows: current ? current.samples.map((s) => [s.h, Number(s.pct.toPrecision(5))]) : [],
    caption: current ? `Run ${runs.length} · ${profile} · ${current.hours} h window` : 'No run yet',
  }
  const anchorFor = (px: number) => (px > frame.innerWidth * 0.7 ? 'end' : 'start')

  const liveText = proj
    ? `${profile} profile, ${current!.hours} hour window. Projected endurance ${fmt(proj.projectedEnduranceH, 1)} plus or minus ${fmt(sdH, 1)} hours. ${
        windowFits ? `The window fits with ${fmt(hoursRemaining, 1)} hours remaining.` : `The sink saturated at ${fmt(proj.saturatedAtH ?? 0, 0)} hours; the window does not fit.`
      }`
    : 'No run yet. Run the sink cold.'

  const controls = (
    <div className="dr-controls">
      <Segmented<ProfileName> label="Cold profile" value={profile} options={PROFILE_ORDER.map((n) => ({ value: n, label: `${n} · ${PROFILES[n].loadKw} kW` }))} onChange={onProfileChange} />
      <Slider label="Cold window" value={hours} min={4} max={120} step={1} units="h" onChange={setHours} />
    </div>
  )

  return (
    <Sim tone="engineering" label={label} seedKey={seedKey} runLabel="RUN COLD" stepLabel={`RUN ×${STEP_RUNS}`} controls={controls} onRun={onRun} onStep={onStep} onReset={onReset} liveText={liveText}>
      <ChartSurface
        frame={frame}
        ariaLabel={`Sink capacity used versus hours cold, ${profile} profile`}
        description="Sink percentage of capacity against hours cold. A dashed design line rises from the start level at the design rate; a red line marks saturation at 100 percent; vertical lines mark the cold window and the Chief's working figure. Each run draws a measured curve; earlier runs are ghosted."
        table={table}
        className="dr-sink__chart"
      >
        <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
          <YAxis scale={y} width={frame.innerWidth} ticks={[0, 25, 50, 75, 100]} label="sink % of capacity" />
          <PlotClip frame={frame}>
            {designPath && <path d={designPath} fill="none" stroke={semanticColor('null')} strokeWidth={chartTheme.stroke.reference} strokeDasharray={chartTheme.dash} />}
            {ghosts.map((r, i) => {
              const d = path(r.samples)
              return d ? <path key={i} className="dr-mark dr-mark--line" d={d} fill="none" stroke={seriesColor(4)} strokeWidth={1} opacity={0.35} /> : null
            })}
            {current && (
              <path className="dr-mark dr-mark--line" d={path(current.samples) ?? ''} fill="none" stroke={semanticColor('alt')} strokeWidth={2} />
            )}
          </PlotClip>
          <HReferenceLine y={y(100)} width={frame.innerWidth} label="SATURATED" color={semanticColor('rejected')} dashed={false} />
          <ReferenceLine x={x(p.workingH)} height={frame.innerHeight} label="Chief: −1 SD" anchor={anchorFor(x(p.workingH))} />
          <ReferenceLine x={x(hours)} height={frame.innerHeight} label="window" color={semanticColor('observed')} dashed={false} anchor={anchorFor(x(hours))} />
          <XAxis scale={x} height={frame.innerHeight} label="hours cold" />
        </g>
      </ChartSurface>

      <Legend
        items={[
          { label: 'this run (measured)', color: semanticColor('alt'), shape: 'line' },
          { label: 'earlier runs', color: seriesColor(4), shape: 'line', muted: true },
          { label: 'design line', color: semanticColor('null'), shape: 'dashed' },
          { label: 'saturation', color: semanticColor('rejected'), shape: 'line' },
          { label: 'cold window', color: semanticColor('observed'), shape: 'line' },
          { label: "Chief's working figure", color: chartTheme.color.reference, shape: 'dashed' },
        ]}
      />

      <ReadoutRow>
        <Readout label="THIS RUN LOAD" value={current ? fmt(current.loadKw, 0) : '—'} units="kW" tone="engineering" stale={!current} />
        <Readout label="PROJECTED ENDURANCE" value={proj ? `${fmt(proj.projectedEnduranceH, 1)} ± ${fmt(sdH, 1)}` : '—'} units="h" tone="engineering" stale={!proj} />
        {proj && proj.saturatedAtH !== null ? (
          <Readout label="HOURS REMAINING" value={`saturated at ${fmt(proj.saturatedAtH, 0)} h`} tone="alert" />
        ) : (
          <Readout label="HOURS REMAINING" value={proj ? fmt(hoursRemaining, 1) : '—'} units="h" stale={!proj} />
        )}
        <Readout label="DESIGN ENDURANCE" value={fmt(p.designMeanH, 1)} units="h" />
        <Readout label="CHIEF'S WORKING FIGURE" value={fmt(p.workingH, 0)} units="h" />
      </ReadoutRow>

      {runs.length >= 2 && (
        <>
          <h4 className="dr-act0-heading">RUN TO RUN</h4>
          <ReadoutRow>
            <Readout label="MEAN PROJECTED ENDURANCE" value={fmt(mean(projections), 1)} units="h" tone="engineering" />
            <Readout label="RANGE OF PROJECTED ENDURANCES" value={`${fmt(min(projections), 1)}–${fmt(max(projections), 1)}`} units="h" />
            <Readout label="RUNS" value={runs.length} />
          </ReadoutRow>
        </>
      )}
      {!current && <p className="dr-muted">No run yet. Run the sink cold.</p>}
    </Sim>
  )
}
