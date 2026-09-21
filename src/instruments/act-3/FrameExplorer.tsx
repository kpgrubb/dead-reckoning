/**
 * FrameExplorer (act-3-01) — "Who was asked."
 *
 * A unit map of all 400 masters active on the Lane this Close Season, one mark per master. The
 * learner highlights a layer — the population, the Lane frame (the 260 on the schedule at MET 57),
 * the Authority's Ceres frame, the 212 who answered its notice, the learner's own Lane sample, or
 * everyone unreachable — and reads what that layer covers and what it misses.
 *
 * The lesson is in the two coverage readouts: the Ceres survey reaches masters who are *not* on the
 * Lane at all and misses most of the frame it is being quoted about, and neither hull that later
 * diverted is in it — by construction, not by accident.
 *
 * Every count comes from `./data` (POPULATION, LANE_FRAME, ownerMix, countBy); nothing is typed in.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components'
import { ChartSurface, Legend, Readout, ReadoutRow, Segmented, useChartFrame, chartTheme, seriesColor } from '@/instruments/shared'
import { fmtInt, fmtPct } from '@/lib/stats'
import { HARPAGIA, LANE_FRAME, MARIUS, OWNERS, POPULATION, STATUS_LABEL, SURVEY_RUNS, countBy, ownerMix, type Master, type Owner, type Status, type SurveyRun } from './data'
import './act3.css'

export type FrameLayer = 'population' | 'frame' | 'ceres-frame' | 'ceres-sample' | 'lane-sample' | 'unreachable'
export type ColourBy = 'status' | 'owner'

const LAYER_OPTIONS = [
  { value: 'population', label: 'population' },
  { value: 'frame', label: 'Lane frame' },
  { value: 'ceres-frame', label: 'Ceres frame' },
  { value: 'ceres-sample', label: 'Ceres sample' },
  { value: 'lane-sample', label: 'Lane sample' },
  { value: 'unreachable', label: 'unreachable' },
] as const

const COLOUR_OPTIONS = [
  { value: 'status', label: 'status' },
  { value: 'owner', label: 'owner class' },
] as const

const LAYER_LABEL: Record<FrameLayer, string> = {
  population: 'population · every master active on the Lane this Close Season',
  frame: 'the Lane frame · the schedule at MET 57',
  'ceres-frame': 'the Authority’s frame · masters who called at the Ceres dock office',
  'ceres-sample': 'the Authority’s sample · masters who answered the posted notice',
  'lane-sample': 'your sample · the masters Solberg raised on tight-beam',
  unreachable: 'unreachable from the Lane schedule · docked, laid up or lost',
}

const STATUS_ORDER: readonly Status[] = ['transit', 'docked-ceres', 'docked-uruk', 'laid-up', 'lost'] as const

/** Display order: statuses in bands, owners in blocks inside each band. Computed once. */
const GRID: readonly Master[] = [...POPULATION].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || OWNERS.indexOf(a.owner) - OWNERS.indexOf(b.owner) || a.id - b.id)

const COLS = 25
const ROWS = Math.ceil(GRID.length / COLS)

function membership(layer: FrameLayer, sampleIds: ReadonlySet<number>): (m: Master) => boolean {
  switch (layer) {
    case 'population':
      return () => true
    case 'frame':
      return (m) => m.inLaneFrame
    case 'ceres-frame':
      return (m) => m.inCeresFrame
    case 'ceres-sample':
      return (m) => m.ceresRespondent
    case 'lane-sample':
      return (m) => sampleIds.has(m.id)
    case 'unreachable':
      return (m) => !m.inLaneFrame
  }
}

export interface FrameExplorerProps {
  /** The learner's survey as it ran under their chosen design (act-3-02). Defaults to the SRS run. */
  run?: SurveyRun
}

export function FrameExplorer({ run = SURVEY_RUNS.srs }: FrameExplorerProps) {
  const [layer, setLayer] = useState<FrameLayer>('population')
  const [colourBy, setColourBy] = useState<ColourBy>('status')

  const sampleIds = useMemo(() => new Set(run.sample.map((m) => m.id)), [run])
  const inLayer = useMemo(() => membership(layer, sampleIds), [layer, sampleIds])
  const members = useMemo(() => POPULATION.filter(inLayer), [inLayer])

  const n = members.length
  const mix = useMemo(() => ownerMix(members), [members])
  const byStatus = useMemo(() => countBy(members, (m) => m.status), [members])
  const offFrame = useMemo(() => members.filter((m) => !m.inLaneFrame).length, [members])
  const missedFrame = useMemo(() => LANE_FRAME.filter((m) => !inLayer(m)).length, [inLayer])
  const sulcus = useMemo(() => members.filter((m) => m.sulcus).length, [members])
  const diverted = useMemo(() => members.filter((m) => m.hull === HARPAGIA || m.hull === MARIUS).length, [members])

  const colourOf = (m: Master) => (colourBy === 'status' ? seriesColor(STATUS_ORDER.indexOf(m.status)) : seriesColor(OWNERS.indexOf(m.owner)))

  const frame = useChartFrame({ height: 300, margin: { top: 10, right: 10, bottom: 10, left: 10 } })
  const cell = Math.min(frame.innerWidth / COLS, frame.innerHeight / ROWS)
  const size = Math.max(3, cell - chartTheme.mark.gap)
  const originX = (frame.innerWidth - cell * COLS) / 2
  const originY = (frame.innerHeight - cell * ROWS) / 2

  const table = useMemo(() => {
    const rows: (string | number)[][] = STATUS_ORDER.map((s) => {
      const band = members.filter((m) => m.status === s)
      const bm = ownerMix(band)
      return [STATUS_LABEL[s], bm.Perrine, bm.Mercantile, bm.independent, band.length]
    })
    rows.push(['Total', mix.Perrine, mix.Mercantile, mix.independent, n])
    return { columns: ['status', ...OWNERS.map((o) => String(o)), 'total'], rows, caption: `${LAYER_LABEL[layer]} — ${fmtInt(n)} of ${fmtInt(POPULATION.length)} masters, by status and owner class` }
  }, [members, mix, n, layer])

  const legendItems = colourBy === 'status' ? STATUS_ORDER.map((s, i) => ({ label: STATUS_LABEL[s], color: seriesColor(i), value: fmtInt(byStatus[s] ?? 0) })) : OWNERS.map((o: Owner, i) => ({ label: o, color: seriesColor(i), value: fmtInt(mix[o]) }))

  const description = `Unit map of all ${POPULATION.length} masters, one square each, ordered by status and owner class. ${fmtInt(n)} squares are lit: ${LAYER_LABEL[layer]}. Of those, ${fmtInt(offFrame)} are not on the Lane schedule, and ${fmtInt(missedFrame)} of the ${fmtInt(LANE_FRAME.length)} scheduled masters are outside this layer.`

  return (
    <Panel label="INTEL · THE FRAME" status={`${fmtInt(n)} / ${fmtInt(POPULATION.length)} LIT`} tone="intel" led="on">
      <div className="dr-controls">
        <Segmented label="HIGHLIGHT" value={layer} options={LAYER_OPTIONS} onChange={setLayer} />
        <Segmented label="COLOUR BY" value={colourBy} options={COLOUR_OPTIONS} onChange={setColourBy} />
      </div>

      <ChartSurface frame={frame} ariaLabel={`Fleet unit map of ${POPULATION.length} masters, highlighting ${LAYER_LABEL[layer]}`} description={description} table={table} footer={<Legend items={legendItems} ariaLabel={colourBy === 'status' ? 'status legend' : 'owner class legend'} />}>
        <g transform={`translate(${frame.margin.left + originX},${frame.margin.top + originY})`}>
          {GRID.map((m, i) => {
            const lit = inLayer(m)
            return (
              <rect
                key={m.id}
                className="dr-mark"
                x={(i % COLS) * cell + (cell - size) / 2}
                y={Math.floor(i / COLS) * cell + (cell - size) / 2}
                width={size}
                height={size}
                rx={1}
                fill={lit ? colourOf(m) : 'var(--dr-bg-3)'}
                fillOpacity={lit ? chartTheme.mark.alpha : 1}
                stroke={lit ? 'none' : 'var(--dr-line)'}
                strokeWidth={lit ? 0 : 1}
              >
                <title>{`${m.hull} · ${m.owner} · ${STATUS_LABEL[m.status]}${lit ? '' : ' · not in this layer'}`}</title>
              </rect>
            )
          })}
        </g>
      </ChartSurface>

      <ReadoutRow>
        <Readout label="in this layer" value={fmtInt(n)} units={`of ${fmtInt(POPULATION.length)}`} tone="intel" live />
        <Readout label="share of the fleet" value={fmtPct(n / POPULATION.length, 1)} live />
        <Readout label="in this layer, not in the Lane frame" value={fmtInt(offFrame)} tone={offFrame > 0 ? 'alert' : 'default'} live />
        <Readout label="in the Lane frame, missed by this layer" value={fmtInt(missedFrame)} units={`of ${fmtInt(LANE_FRAME.length)}`} tone={missedFrame > 0 ? 'alert' : 'default'} live />
      </ReadoutRow>
      <ReadoutRow>
        {OWNERS.map((o) => (
          <Readout key={o} label={o} value={fmtInt(mix[o])} units={n ? fmtPct(mix[o] / n, 0) : '—'} size="sm" live />
        ))}
        <Readout label="Sulcus (Perrine) masters" value={fmtInt(sulcus)} size="sm" live />
        <Readout label="hulls that later diverted" value={`${fmtInt(diverted)} of 2`} units={`${HARPAGIA}, ${MARIUS}`} size="sm" tone={diverted === 0 ? 'alert' : 'default'} live />
      </ReadoutRow>

      <p className="dr-act3__note">
        <strong>{LAYER_LABEL[layer]}.</strong> A frame is the list you could have drawn from. Switch between <strong>Ceres frame</strong> and <strong>Lane frame</strong>: they barely overlap, and neither hull that later turned late is in the Authority&rsquo;s survey at all — not because it refused, but because it never called at the dock office. Enlarging a sample drawn from the wrong list moves neither of the two coverage readouts.
      </p>
    </Panel>
  )
}
