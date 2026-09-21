/**
 * SENSOR · SWEEP OUTCOME SPACE (act-4-02) — the sweep log as a sample space.
 *
 * One entry in the Eyes' log ends exactly one of four ways: a thermal contact, an optical contact, an
 * RF contact, or nothing. Four outcomes, mutually exclusive, exhaustive; their relative frequencies
 * are the areas of a unit bar. The learner builds events A and B by selecting outcomes and reads the
 * union, the intersection and the complement live.
 *
 * The teaching move is the addition rule. Select disjoint outcomes and P(A ∪ B) equals P(A) + P(B);
 * select overlapping ones and it does not, and the overcounted area is drawn and named − P(A ∩ B).
 * Ebele's error — adding two overlapping events and reporting a number above one — is one click away.
 *
 * The second mode is the complement tool: over k sweeps at a per-sweep detection probability p, the
 * chance of at least one detection is 1 − (1 − p)^k, computed as `binomial.atLeast(1, k, p)`, against
 * the wrong answer k·p, which leaves the sample space entirely past k = 1/p.
 */
import { useMemo, useState } from 'react'
import { line as d3Line, scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
import {
  ChartSurface,
  HReferenceLine,
  Legend,
  PlotClip,
  Readout,
  ReadoutRow,
  Segmented,
  Slider,
  XAxis,
  YAxis,
  chartTheme,
  semanticColor,
  seriesColor,
  useChartFrame,
} from '@/instruments/shared'
import { binomial, fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats'
import { P_SWEEP_DETECTS, SWEEP_COUNT, SWEEP_OUTCOMES, sweepOutcomeCounts, sweepOutcomeProbs, type SweepOutcome } from './data'
import { Note, ProbabilityBar, Subhead, oneIn, stackStyle, wideGridStyle } from './_ui'

export interface EventSpacePanelProps {
  /** Which mode the panel opens on. */
  mode?: Mode
  /** Per-sweep detection probability for the two-sweeps mode. */
  perSweepP?: number
  /** Window length, in sweeps, for the two-sweeps mode. */
  sweepsInWindow?: number
  /** Outcomes initially in event A. */
  eventA?: readonly SweepOutcome[]
  /** Outcomes initially in event B. */
  eventB?: readonly SweepOutcome[]
}

type Mode = 'events' | 'window'

const MODE_OPTIONS = [
  { value: 'events', label: 'one sweep' },
  { value: 'window', label: 'two sweeps and more' },
] as const

const MAX_SWEEPS = 40
const ROW_H = 22
const ROW_GAP = 14

/** Event membership as a set of outcome names. */
type EventSet = Record<SweepOutcome, boolean>

function setOf(outcomes: readonly SweepOutcome[]): EventSet {
  return { thermal: outcomes.includes('thermal'), optical: outcomes.includes('optical'), RF: outcomes.includes('RF'), nothing: outcomes.includes('nothing') }
}
function probOf(e: EventSet): number {
  return SWEEP_OUTCOMES.reduce((s, o) => s + (e[o] ? sweepOutcomeProbs[o] : 0), 0)
}
function nameOf(e: EventSet): string {
  const picked = SWEEP_OUTCOMES.filter((o) => e[o])
  if (picked.length === 0) return 'nothing selected'
  if (picked.length === SWEEP_OUTCOMES.length) return 'every outcome'
  return picked.join(' or ')
}

export function EventSpacePanel({
  mode: modeProp = 'events',
  perSweepP = P_SWEEP_DETECTS,
  sweepsInWindow = 8,
  eventA = ['thermal', 'optical', 'RF'],
  eventB = ['thermal'],
}: EventSpacePanelProps = {}) {
  const [mode, setMode] = useState<Mode>(modeProp)
  const [a, setA] = useState<EventSet>(() => setOf(eventA))
  const [b, setB] = useState<EventSet>(() => setOf(eventB))
  const [k, setK] = useState(sweepsInWindow)
  const [p, setP] = useState(perSweepP)

  /* ---- Event arithmetic, straight off the four areas ---- */
  const inter: EventSet = { thermal: a.thermal && b.thermal, optical: a.optical && b.optical, RF: a.RF && b.RF, nothing: a.nothing && b.nothing }
  const union: EventSet = { thermal: a.thermal || b.thermal, optical: a.optical || b.optical, RF: a.RF || b.RF, nothing: a.nothing || b.nothing }
  const pA = probOf(a)
  const pB = probOf(b)
  const pAnd = probOf(inter)
  const pOr = probOf(union)
  const naiveSum = pA + pB
  const disjoint = pAnd === 0

  /* ---- Geometry: the unit bar, then A, B and the union under it ---- */
  const frame = useChartFrame({ height: 232, margin: { top: 12, right: 12, bottom: 34, left: 78 } })
  const xs = useMemo(() => scaleLinear().domain([0, 1]).range([0, frame.innerWidth]), [frame.innerWidth])
  const spans = useMemo(
    () =>
      SWEEP_OUTCOMES.map((o, i) => {
        const from = SWEEP_OUTCOMES.slice(0, i).reduce((s, prev) => s + sweepOutcomeProbs[prev], 0)
        return { outcome: o, i, from, to: from + sweepOutcomeProbs[o] }
      }),
    [],
  )

  const rowY = (row: number) => row * (ROW_H + ROW_GAP)
  const rowLabel = (row: number, text: string) => (
    <text x={-8} y={rowY(row) + ROW_H / 2} dy="0.32em" textAnchor="end" fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
      {text}
    </text>
  )

  const eventTable = useMemo(
    () => ({
      columns: ['outcome', 'count', 'relative frequency', 'in A', 'in B'],
      rows: [
        ...SWEEP_OUTCOMES.map((o) => [o, sweepOutcomeCounts[o], fmt(sweepOutcomeProbs[o], 4), a[o] ? 'yes' : 'no', b[o] ? 'yes' : 'no'] as (string | number)[]),
        ['total', SWEEP_COUNT, fmt(SWEEP_OUTCOMES.reduce((s, o) => s + sweepOutcomeProbs[o], 0), 3), fmt(pA, 4), fmt(pB, 4)] as (string | number)[],
      ],
      caption: `Sweep log outcome space, ${fmtInt(SWEEP_COUNT)} entries. Four mutually exclusive outcomes; the relative frequencies sum to 1.000.`,
    }),
    [a, b, pA, pB],
  )

  /* ---- The window mode ---- */
  const ks = useMemo(() => Array.from({ length: MAX_SWEEPS }, (_, i) => i + 1), [])
  const pNone = binomial.pmf(0, k, p)
  const pAtLeastOne = binomial.atLeast(1, k, p)
  const wrong = k * p
  const crossAt = Math.ceil(1 / p)

  const wFrame = useChartFrame({ height: 268, yLabel: true })
  const wx = useMemo(() => scaleLinear().domain([1, MAX_SWEEPS]).range([0, wFrame.innerWidth]), [wFrame.innerWidth])
  const wy = useMemo(() => scaleLinear().domain([0, 1.45]).range([wFrame.innerHeight, 0]), [wFrame.innerHeight])
  const rightPath = useMemo(
    () => d3Line<number>().x((v) => wx(v)).y((v) => wy(binomial.atLeast(1, v, p)))(ks) ?? '',
    [ks, wx, wy, p],
  )
  const nonePath = useMemo(
    () => d3Line<number>().x((v) => wx(v)).y((v) => wy(binomial.pmf(0, v, p)))(ks) ?? '',
    [ks, wx, wy, p],
  )
  const wrongPath = useMemo(
    () => d3Line<number>().x((v) => wx(v)).y((v) => wy(v * p))(ks) ?? '',
    [ks, wx, wy, p],
  )
  const windowTable = useMemo(
    () => ({
      columns: ['sweeps k', 'P(no detection) = (1 − p)^k', 'P(at least one)', 'k · p'],
      rows: ks.map((v) => [v, fmt(binomial.pmf(0, v, p), 4), fmt(binomial.atLeast(1, v, p), 4), fmt(v * p, 4)] as (string | number)[]),
      caption: `Per-sweep detection probability p = ${fmt(p, 4)}. The right column is the wrong answer; it passes 1 at k = ${crossAt}.`,
    }),
    [ks, p, crossAt],
  )

  const toggle = (which: 'a' | 'b', o: SweepOutcome) => {
    const set = which === 'a' ? setA : setB
    set((prev) => ({ ...prev, [o]: !prev[o] }))
  }

  return (
    <Panel
      label="SENSOR · SWEEP OUTCOME SPACE"
      tone="sensor"
      led="on"
      status={`n = ${fmtInt(SWEEP_COUNT)} sweeps`}
    >
      <div style={stackStyle}>
        <Segmented<Mode> label="mode" value={mode} options={MODE_OPTIONS} onChange={setMode} />

        {mode === 'events' ? (
          <>
            <fieldset className="dr-controls" style={{ border: '1px solid var(--dr-line)', borderRadius: 'var(--dr-radius)', padding: 'var(--dr-sp-3)' }}>
              <legend style={{ fontFamily: 'var(--dr-font-mono)', fontSize: 'var(--dr-fs-2xs)', letterSpacing: 'var(--dr-track-label)', textTransform: 'uppercase', color: 'var(--dr-fg-2)' }}>build the events</legend>
              {(['a', 'b'] as const).map((which) => (
                <div key={which} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dr-sp-1)' }}>
                  <span style={{ fontFamily: 'var(--dr-font-mono)', fontSize: 'var(--dr-fs-2xs)', letterSpacing: 'var(--dr-track-label)', textTransform: 'uppercase', color: 'var(--dr-fg-2)' }}>event {which.toUpperCase()}</span>
                  {SWEEP_OUTCOMES.map((o) => (
                    <label key={o} style={{ display: 'flex', gap: 'var(--dr-sp-2)', alignItems: 'center', fontFamily: 'var(--dr-font-mono)', fontSize: 'var(--dr-fs-xs)', color: 'var(--dr-fg-1)' }}>
                      <input type="checkbox" checked={(which === 'a' ? a : b)[o]} onChange={() => toggle(which, o)} aria-label={`${o} in event ${which.toUpperCase()}`} />
                      {o}
                    </label>
                  ))}
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dr-sp-2)', alignSelf: 'end' }}>
                <button
                  type="button"
                  className="dr-btn dr-btn--sm"
                  onClick={() => {
                    setA(setOf(['thermal', 'optical', 'RF']))
                    setB(setOf(['nothing']))
                  }}
                >
                  DISJOINT PAIR
                </button>
                <button
                  type="button"
                  className="dr-btn dr-btn--sm dr-btn--warn"
                  onClick={() => {
                    setA(setOf(['thermal', 'nothing']))
                    setB(setOf(['optical', 'nothing']))
                  }}
                >
                  OVERLAPPING PAIR
                </button>
              </div>
            </fieldset>

            <ChartSurface
              frame={frame}
              ariaLabel={`Sweep outcome space partitioned into four mutually exclusive outcomes by relative frequency, with event A (${nameOf(a)}), event B (${nameOf(b)}) and their union drawn beneath it`}
              description={`The top bar is the whole sample space: thermal ${fmtPct(sweepOutcomeProbs.thermal, 1)}, optical ${fmtPct(sweepOutcomeProbs.optical, 1)}, RF ${fmtPct(sweepOutcomeProbs.RF, 1)}, nothing ${fmtPct(sweepOutcomeProbs.nothing, 1)}. Event A covers ${fmt(pA, 4)} of it, event B covers ${fmt(pB, 4)}, they share ${fmt(pAnd, 4)}, and their union is ${fmt(pOr, 4)}. The data table gives every outcome's count, relative frequency and membership.`}
              table={eventTable}
              footer={
                <Legend
                  items={[
                    { label: 'event A', color: seriesColor(0), shape: 'area' },
                    { label: 'event B', color: seriesColor(1), shape: 'area' },
                    { label: 'A ∩ B · counted twice by a bare sum', color: semanticColor('rejected'), shape: 'area' },
                    { label: 'A ∪ B', color: semanticColor('fit'), shape: 'area' },
                  ]}
                  ariaLabel="Event key"
                />
              }
            >
              <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
                <PlotClip frame={frame}>
                  {spans.map((s) => (
                    <g key={s.outcome}>
                      <rect x={xs(s.from)} y={rowY(0)} width={Math.max(1, xs(s.to) - xs(s.from))} height={ROW_H} fill={seriesColor(s.i)} fillOpacity={chartTheme.mark.alpha} stroke={chartTheme.color.surface} strokeWidth={1}>
                        <title>{`${s.outcome}: ${sweepOutcomeCounts[s.outcome]} of ${SWEEP_COUNT}, ${fmt(sweepOutcomeProbs[s.outcome], 4)}`}</title>
                      </rect>
                      {xs(s.to) - xs(s.from) > 44 && (
                        <text x={(xs(s.from) + xs(s.to)) / 2} y={rowY(0) + ROW_H / 2} dy="0.32em" textAnchor="middle" fill={chartTheme.color.ring} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                          {s.outcome} {fmtPct(sweepOutcomeProbs[s.outcome], 1)}
                        </text>
                      )}
                    </g>
                  ))}
                  {spans.map((s) =>
                    a[s.outcome] ? <rect key={`a-${s.outcome}`} x={xs(s.from)} y={rowY(1)} width={Math.max(1, xs(s.to) - xs(s.from))} height={ROW_H} fill={seriesColor(0)} fillOpacity={0.6} stroke={chartTheme.color.surface} strokeWidth={1} /> : null,
                  )}
                  {spans.map((s) =>
                    b[s.outcome] ? <rect key={`b-${s.outcome}`} x={xs(s.from)} y={rowY(2)} width={Math.max(1, xs(s.to) - xs(s.from))} height={ROW_H} fill={seriesColor(1)} fillOpacity={0.6} stroke={chartTheme.color.surface} strokeWidth={1} /> : null,
                  )}
                  {spans.map((s) =>
                    union[s.outcome] ? (
                      <rect
                        key={`u-${s.outcome}`}
                        x={xs(s.from)}
                        y={rowY(3)}
                        width={Math.max(1, xs(s.to) - xs(s.from))}
                        height={ROW_H}
                        fill={inter[s.outcome] ? semanticColor('rejected') : semanticColor('fit')}
                        fillOpacity={0.6}
                        stroke={chartTheme.color.surface}
                        strokeWidth={1}
                      >
                        <title>{inter[s.outcome] ? `${s.outcome}: in both A and B` : `${s.outcome}: in the union`}</title>
                      </rect>
                    ) : null,
                  )}
                </PlotClip>
                {rowLabel(0, 'all sweeps')}
                {rowLabel(1, `A ${fmt(pA, 3)}`)}
                {rowLabel(2, `B ${fmt(pB, 3)}`)}
                {rowLabel(3, `A ∪ B ${fmt(pOr, 3)}`)}
                <XAxis scale={xs} height={frame.innerHeight} ticks={5} format={(v) => fmt(v, 2)} label="proportion of the 1,400 logged sweeps" />
              </g>
            </ChartSurface>

            <ReadoutRow>
              <Readout label="P(A)" value={fmt(pA, 4)} tone="sensor" live />
              <Readout label="P(B)" value={fmt(pB, 4)} tone="sensor" live />
              <Readout label="P(A ∩ B)" value={fmt(pAnd, 4)} tone={disjoint ? 'default' : 'alert'} live />
              <Readout label="P(A ∪ B)" value={fmt(pOr, 4)} tone="sensor" live />
              <Readout label="P(A) + P(B)" value={fmt(naiveSum, 4)} tone={naiveSum > 1 ? 'alert' : 'default'} live />
              <Readout label="P(not A)" value={fmt(1 - pA, 4)} size="sm" live />
            </ReadoutRow>

            <div style={wideGridStyle}>
              <ProbabilityBar value={pA} label={`A · ${nameOf(a)}`} complementLabel="not A" color={seriesColor(0)} />
              <ProbabilityBar value={pB} label={`B · ${nameOf(b)}`} complementLabel="not B" color={seriesColor(1)} />
              <ProbabilityBar value={pOr} label="A ∪ B" complementLabel="neither" color={semanticColor('fit')} />
            </div>

            {disjoint ? (
              <Note tone="ok" live>
                A and B share no outcome, so they cannot both happen on one sweep. Mutually exclusive: P(A ∪ B) = P(A) + P(B) = {fmt(pA, 4)} + {fmt(pB, 4)} = {fmt(pOr, 4)}. The addition rule is only this simple here, and only because the shared area is zero.
              </Note>
            ) : (
              <Note tone="alert" live>
                A and B share {fmt(pAnd, 4)} of the space — {SWEEP_OUTCOMES.filter((o) => inter[o]).join(' and ')}. Adding them gives {fmt(naiveSum, 4)}
                {naiveSum > 1 ? ', which is not a probability at all: no event can cover more of the space than the space holds. ' : ', which overstates the union. '}
                The shared area was counted in both terms. Subtract it once: P(A ∪ B) = {fmt(pA, 4)} + {fmt(pB, 4)} − {fmt(pAnd, 4)} = {fmt(pOr, 4)}.
              </Note>
            )}
            <Note>
              Four outcomes, one sweep, exactly one of them every time. The relative frequencies sum to {fmt(SWEEP_OUTCOMES.reduce((s, o) => s + sweepOutcomeProbs[o], 0), 3)} because they have to. P(a sweep detects anything) = {fmt(P_SWEEP_DETECTS, 4)}, which is the complement of the nothing bar and nothing more.
            </Note>
          </>
        ) : (
          <>
            <div className="dr-controls">
              <Slider label="window length" value={k} min={1} max={MAX_SWEEPS} step={1} units="sweeps" onChange={setK} />
              <Slider label="per-sweep detection probability p" value={p} min={0.01} max={0.5} step={0.005} onChange={setP} format={(v) => fmt(v, 3)} />
              <button type="button" className="dr-btn dr-btn--sm" onClick={() => setP(P_SWEEP_DETECTS)}>
                LOG RATE {fmt(P_SWEEP_DETECTS, 3)}
              </button>
            </div>

            <ReadoutRow>
              <Readout label="sweeps k" value={fmtInt(k)} tone="sensor" live />
              <Readout label="P(no detection) = (1 − p)^k" value={fmt(pNone, 4)} tone="sensor" live />
              <Readout label="P(at least one)" value={fmt(pAtLeastOne, 4)} tone="sensor" live />
              <Readout label="that is" value={oneIn(1 - pAtLeastOne)} size="sm" live />
              <Readout label="k · p — the wrong answer" value={fmt(wrong, 4)} tone={wrong > 1 ? 'alert' : 'default'} live />
            </ReadoutRow>

            <ChartSurface
              frame={wFrame}
              ariaLabel={`Probability of at least one detection against window length in sweeps, at a per-sweep probability of ${fmt(p, 3)}, with the incorrect k times p line for comparison`}
              description={`Over k sweeps the chance of no detection is (1 − p) to the power k and the chance of at least one is its complement. At k = ${k} those are ${fmt(pNone, 4)} and ${fmt(pAtLeastOne, 4)}. The straight line k·p is the common error; it crosses 1 at k = ${crossAt} and keeps climbing, which no probability can do. The data table gives all three columns for every k from 1 to ${MAX_SWEEPS}.`}
              table={windowTable}
              footer={
                <Legend
                  items={[
                    { label: 'P(at least one detection)', color: semanticColor('fit'), shape: 'line' },
                    { label: 'P(no detection) = (1 − p)^k', color: semanticColor('null'), shape: 'line' },
                    { label: 'k · p — leaves the sample space', color: semanticColor('rejected'), shape: 'dashed' },
                    { label: 'ceiling · 1', color: semanticColor('reference'), shape: 'dashed' },
                  ]}
                  ariaLabel="Window key"
                />
              }
            >
              <g transform={`translate(${wFrame.margin.left},${wFrame.margin.top})`}>
                <YAxis scale={wy} width={wFrame.innerWidth} ticks={5} format={(v) => fmt(v, 2)} label="probability" />
                <PlotClip frame={wFrame}>
                  <path d={wrongPath} fill="none" stroke={semanticColor('rejected')} strokeWidth={chartTheme.stroke.line} strokeDasharray={chartTheme.dash} />
                  <path d={nonePath} fill="none" stroke={semanticColor('null')} strokeWidth={chartTheme.stroke.line} />
                  <path d={rightPath} fill="none" stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />
                  <line x1={wx(k)} x2={wx(k)} y1={0} y2={wFrame.innerHeight} stroke={semanticColor('observed')} strokeWidth={chartTheme.stroke.reference} strokeDasharray={chartTheme.dash} />
                  <circle cx={wx(k)} cy={wy(pAtLeastOne)} r={5} fill={semanticColor('fit')} stroke={chartTheme.color.ring} strokeWidth={chartTheme.mark.ring} paintOrder="stroke" />
                </PlotClip>
                <HReferenceLine y={wy(1)} width={wFrame.innerWidth} label="1" color={semanticColor('reference')} />
                <XAxis scale={wx} height={wFrame.innerHeight} ticks={8} label="sweeps in the window (k)" />
              </g>
            </ChartSurface>

            <div style={wideGridStyle}>
              <ProbabilityBar value={pAtLeastOne} label={`at least one detection in ${fmtInt(k)} sweeps`} complementLabel="the window passes clean" color={semanticColor('fit')} />
              <ProbabilityBar value={Math.min(1, wrong)} label={`k · p = ${fmt(wrong, 3)}${wrong > 1 ? ' — off the end of the bar' : ''}`} color={semanticColor('rejected')} />
            </div>

            <Note tone={wrong > 1 ? 'alert' : 'warn'} live>
              Over {fmtInt(k)} sweeps at p = {fmt(p, 3)}: the window passes clean with probability {fmt(pNone, 4)}, so something is seen with probability {fmt(pAtLeastOne, 4)} — {fmtP(pAtLeastOne)}. Adding p to itself {fmtInt(k)} times gives {fmt(wrong, 4)}
              {wrong > 1 ? `, which is not a probability. The sum passes 1 at k = ${crossAt} and keeps going.` : `, already above the truth, and it passes 1 at k = ${crossAt}.`} Sweeps do not add. Their failures multiply, and the answer is the complement of all of them failing.
            </Note>
            <Note>
              Written out: P(at least one) = 1 − P(none) = 1 − (1 − p)^k. Compute the "none" leg and take the complement. It is one subtraction and it never leaves the sample space.
            </Note>
          </>
        )}

        <section aria-label="Sweep outcome frequencies">
          <Subhead>The log, {fmtInt(SWEEP_COUNT)} entries</Subhead>
          <Note>
            thermal {fmtInt(sweepOutcomeCounts.thermal)} · optical {fmtInt(sweepOutcomeCounts.optical)} · RF {fmtInt(sweepOutcomeCounts.RF)} · nothing {fmtInt(sweepOutcomeCounts.nothing)}. Relative frequencies {fmt(sweepOutcomeProbs.thermal, 4)}, {fmt(sweepOutcomeProbs.optical, 4)}, {fmt(sweepOutcomeProbs.RF, 4)}, {fmt(sweepOutcomeProbs.nothing, 4)}; they total {fmt(SWEEP_OUTCOMES.reduce((s, o) => s + sweepOutcomeProbs[o], 0), 3)}.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
