/**
 * NavFixDisplay — the navigator's six dead-reckoning fixes against Callisto's beacon (act-0-01).
 *
 * Two stacked parts: the LOGGED run (six values, table visible, no summary — the learner computes the
 * mean and range for the mission beat) and a <Sim> that re-runs the six-fix procedure on the learner's
 * seed so they can watch single fixes scatter ±300 km while the run means huddle near beacon truth.
 */
import { useState } from 'react'
import type { Rng } from '@/lib/rng'
import { max, mean, min, range } from '@/lib/stats'
import { fmt } from '@/lib/stats/format'
import { Panel } from '@/components/Panel'
import { Sim } from '@/components/Sim'
import { Dotplot, Histogram, Legend, Readout, ReadoutRow, seriesColor } from '@/instruments/shared'
import { drawFixErrors, loggedFixRun, type FixRun } from './data'
import './act-0.css'

const DOMAIN: [number, number] = [-400, 400]
/** Above this many runs the means switch from a dotplot to a histogram (no per-point DOM growth). */
const HISTOGRAM_AFTER = 60
const STEP_RUNS = 25

export interface NavFixDisplayProps {
  run?: FixRun
}

export function NavFixDisplay({ run = loggedFixRun }: NavFixDisplayProps = {}) {
  const [runs, setRuns] = useState<number[][]>([])

  const onRun = (rng: Rng) => setRuns((prev) => [...prev, drawFixErrors(rng)])
  const onStep = (rng: Rng) => {
    const batch: number[][] = []
    for (let i = 0; i < STEP_RUNS; i++) batch.push(drawFixErrors(rng))
    setRuns((prev) => [...prev, ...batch])
  }
  const onReset = () => setRuns([])

  const current = runs.length > 0 ? runs[runs.length - 1] : null
  const means = runs.map((r) => mean(r))
  const allFixes = runs.flat()
  const curMean = current ? mean(current) : NaN
  const curRange = current ? range(current) : NaN
  const curLargest = current ? Math.max(Math.abs(min(current)), Math.abs(max(current))) : NaN

  const liveText = current
    ? `Run ${runs.length}: six fixes ${current.map((v) => fmt(v, 0)).join(', ')} km; mean ${fmt(curMean, 1)} km, range ${fmt(curRange, 0)} km. Spread of run means so far ${fmt(range(means), 0)} km.`
    : 'No runs yet. Re-run the procedure.'

  return (
    <div className="dr-navfix">
      <Panel tone="sensor" label="NAV · DEAD-RECKONING FIXES · LOGGED RUN" status={run.met} led="on">
        <div className="dr-navfix__logged">
          <Dotplot
            values={run.fixes}
            domain={DOMAIN}
            label="along-track fix error (km)"
            ariaLabel={`Dotplot of the six logged dead-reckoning fix errors, ${run.label}`}
            description="Six along-track fix errors in kilometres against beacon truth at zero. The values are listed in the table below the plot."
            showTable
          />
        </div>
        <p className="dr-muted dr-navfix__caption">Six fixes, first cold hour. Beacon truth is 0 km; positive = ahead of truth.</p>
      </Panel>

      <Sim
        tone="sensor"
        label="NAV · RE-RUN THE SIX-FIX PROCEDURE"
        seedKey="act-0-01/nav-fix"
        runLabel="RE-RUN SIX FIXES"
        stepLabel={`RUN ×${STEP_RUNS}`}
        onRun={onRun}
        onStep={onStep}
        onReset={onReset}
        liveText={liveText}
      >
        {current ? (
          <Dotplot
            values={current}
            domain={DOMAIN}
            label="along-track fix error (km) · this run"
            color={seriesColor(0)}
            references={[{ x: curMean, label: 'mean', color: 'reference' }]}
            ariaLabel={`Dotplot of the six fixes from run ${runs.length}`}
            description={`Six simulated fix errors with a reference line at their mean, ${fmt(curMean, 1)} km.`}
          />
        ) : (
          <p className="dr-muted">No runs yet. Re-run the procedure.</p>
        )}

        <ReadoutRow>
          <Readout label="MEAN" value={current ? fmt(curMean, 1) : '—'} units="km" tone="sensor" stale={!current} />
          <Readout label="RANGE" value={current ? fmt(curRange, 0) : '—'} units="km" stale={!current} />
          <Readout label="LARGEST |FIX|" value={current ? fmt(curLargest, 0) : '—'} units="km" stale={!current} />
          <Readout label="RUNS" value={runs.length} stale={!current} />
        </ReadoutRow>

        <h4 className="dr-act0-heading">MEANS OF EVERY RUN SO FAR</h4>
        {current &&
          (runs.length > HISTOGRAM_AFTER ? (
            <Histogram
              values={means}
              binWidth={20}
              domain={DOMAIN}
              label="run mean (km)"
              color={seriesColor(1)}
              references={[{ x: 0, label: 'beacon truth', color: 'reference' }]}
              ariaLabel={`Histogram of the means of ${runs.length} runs`}
              description="Means of every re-run so far, binned 20 km wide, with beacon truth at zero."
            />
          ) : (
            <Dotplot
              values={means}
              domain={DOMAIN}
              label="run mean (km)"
              color={seriesColor(1)}
              references={[{ x: 0, label: 'beacon truth', color: 'reference' }]}
              ariaLabel={`Dotplot of the means of ${runs.length} runs`}
              description="Means of every re-run so far, with beacon truth at zero."
            />
          ))}
        {!current && <p className="dr-muted">No runs yet.</p>}

        <ReadoutRow>
          <Readout label="SPREAD OF SINGLE FIXES" value={current ? fmt(range(allFixes), 0) : '—'} units="km" stale={!current} />
          <Readout label="SPREAD OF RUN MEANS" value={current ? fmt(range(means), 0) : '—'} units="km" tone="sensor" stale={!current} />
        </ReadoutRow>

        <Legend
          items={[
            { label: 'single fixes (this run)', color: seriesColor(0), shape: 'dot' },
            { label: 'run means', color: seriesColor(1), shape: 'dot' },
          ]}
        />
      </Sim>
    </div>
  )
}
