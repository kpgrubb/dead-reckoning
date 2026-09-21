/**
 * MassScatter (act-2-02) — inferred mass against declared mass for the 412 Bureau departures.
 * Points drag; r follows. A units toggle (tonnes / kilotonnes / plume TW) shows that a linear
 * rescaling of y leaves r untouched — and that plume power, which folds in each hull's Mark 2
 * acceleration, is a different variable, not a rescaling. The fit line is locked until 2-03.
 */
import { useCallback, useMemo, useState } from 'react'
import { Panel } from '@/components'
import { Scatter, Segmented, Readout, ReadoutRow, Legend, padDomain, seriesColor, type ScatterPoint } from '@/instruments/shared'
import { correlation, linearRegression, fmt, fmtInt } from '@/lib/stats'
import { manifest } from './data'
import './act2.css'

type Units = 't' | 'kt' | 'TW'
const UNIT_OPTIONS = [
  { value: 't', label: 'tonnes' },
  { value: 'kt', label: 'kilotonnes' },
  { value: 'TW', label: 'plume TW' },
] as const
const UNIT_LABEL: Record<Units, string> = { t: 'inferred mass (t)', kt: 'inferred mass (kt)', TW: 'plume power (TW)' }

interface MassPoint {
  x: number
  /** Inferred mass in tonnes (the drag target; display units derive from it). */
  y: number
  hull: string
  laterLost: boolean
}

/** Per-point y multiplier: tonnes → display units. TW uses each hull's own plumePower/inferredMass ratio at load. */
const TW_RATIO = manifest.map((d) => d.plumePower / d.inferredMass)
function factor(units: Units, i: number): number {
  if (units === 't') return 1
  if (units === 'kt') return 1 / 1000
  return TW_RATIO[i]
}

const INITIAL: MassPoint[] = manifest.map((d) => ({ x: d.declaredMass, y: d.inferredMass, hull: d.hull, laterLost: d.laterLost }))
const R_ORIGINAL = correlation(
  INITIAL.map((p) => p.x),
  INITIAL.map((p) => p.y),
)
const X_DOMAIN = padDomain([Math.min(...INITIAL.map((p) => p.x)), Math.max(...INITIAL.map((p) => p.x))], 0.08)

export interface MassScatterProps {
  /** Draw the least-squares line and its equation. Default false — the line is locked until 2-03. */
  showLine?: boolean
}

export function MassScatter({ showLine = false }: MassScatterProps) {
  const [pts, setPts] = useState<MassPoint[]>(INITIAL)
  const [units, setUnits] = useState<Units>('t')
  const [colourLost, setColourLost] = useState(false)

  const xs = useMemo(() => pts.map((p) => p.x), [pts])
  const ysT = useMemo(() => pts.map((p) => p.y), [pts])
  const ysShown = useMemo(() => pts.map((p, i) => p.y * factor(units, i)), [pts, units])

  const display = useMemo<ScatterPoint[]>(
    () => pts.map((p, i) => ({ x: p.x, y: ysShown[i], series: colourLost && p.laterLost ? 1 : 0, label: p.hull })),
    [pts, ysShown, colourLost],
  )
  const yDomain = useMemo<[number, number]>(() => {
    const ys = INITIAL.map((p, i) => p.y * factor(units, i))
    return padDomain([Math.min(...ys), Math.max(...ys)], 0.1)
  }, [units])

  const onPointsChange = useCallback(
    (next: ScatterPoint[]) => {
      setPts((prev) => prev.map((p, i) => ({ ...p, x: next[i].x, y: next[i].y / factor(units, i) })))
    },
    [units],
  )

  const r = correlation(xs, ysShown)
  const rAll: Record<Units, number> = {
    t: correlation(xs, ysT),
    kt: correlation(
      xs,
      pts.map((p, i) => p.y * factor('kt', i)),
    ),
    TW: correlation(
      xs,
      pts.map((p, i) => p.y * factor('TW', i)),
    ),
  }
  const fit = showLine ? linearRegression(xs, ysShown) : null
  const deltaR = rAll.t - R_ORIGINAL
  const moved = pts.some((p, i) => p.x !== INITIAL[i].x || p.y !== INITIAL[i].y)
  const lostCount = INITIAL.filter((p) => p.laterLost).length

  return (
    <Panel label="SENSOR · INFERRED MASS vs DECLARED" tone="sensor" status={`n = ${fmtInt(pts.length)} · ${moved ? 'POINTS MOVED' : 'MANIFEST'}`}>
      <div className="dr-controls">
        <Segmented label="UNITS" value={units} options={UNIT_OPTIONS} onChange={setUnits} />
        <label className="dr-act2__check">
          <input type="checkbox" checked={colourLost} onChange={(e) => setColourLost(e.target.checked)} />
          show later-lost ({lostCount} hulls, off by default)
        </label>
        <div className="dr-act2__buttons">
          <button type="button" className="dr-btn dr-btn--sm" onClick={() => setPts(INITIAL)} disabled={!moved}>
            RESET POINTS
          </button>
        </div>
      </div>

      <Scatter
        points={display}
        onPointsChange={onPointsChange}
        fitLine={showLine}
        xDomain={X_DOMAIN}
        yDomain={yDomain}
        xLabel="declared mass (t)"
        yLabel={UNIT_LABEL[units]}
        height={340}
        ariaLabel={`Scatterplot of ${UNIT_LABEL[units]} against declared mass for ${pts.length} Bureau departures`}
        description="Scatterplot of inferred mass against declared mass for 412 Bureau departures; strong positive linear association."
      />
      {colourLost && (
        <Legend
          items={[
            { label: 'still on the Ledger', color: seriesColor(0), shape: 'dot' },
            { label: 'later lost (in the Register)', color: seriesColor(1), shape: 'dot' },
          ]}
        />
      )}

      <ReadoutRow>
        <Readout label={`r · ${units}`} value={fmt(r, 3)} tone="sensor" live />
        <Readout label="n" value={fmtInt(pts.length)} size="sm" />
        <Readout label="Δr since reset" value={(deltaR >= 0 ? '+' : '') + fmt(deltaR, 3)} size="sm" stale={!moved} />
        {fit && <Readout label={`equation (${units})`} value={fit.equation(units === 'TW' ? 5 : 3)} size="sm" tone="sensor" />}
        {fit && <Readout label="r²" value={fmt(fit.r2, 3)} size="sm" tone="sensor" />}
      </ReadoutRow>
      <p className="dr-act2__note">
        r in tonnes <strong>{fmt(rAll.t, 3)}</strong> · in kilotonnes <strong>{fmt(rAll.kt, 3)}</strong> · in plume TW <strong>{fmt(rAll.TW, 3)}</strong>. Dividing every y by 1,000 changes nothing about the
        cloud's shape: r is unit-free. Plume power is a different variable — it multiplies each hull's mass by its own Mark 2 acceleration — so its r is not a rescaling and can move.
      </p>
    </Panel>
  )
}
