/**
 * TACTICAL · ERROR AND POWER EXPLORER (act-6-06) — the two sampling distributions a two-proportion
 * test lives between, drawn on one axis in the units the test is actually about: the difference in
 * sample loss rates, p̂₁ − p̂₂.
 *
 *   the null curve      centred at 0, spread se₀ (POOLED at the rate the alternative implies) — the
 *                       world H₀ describes. The area beyond the cutoff is α: the false alarms.
 *   the alternative     centred at p₁ − p₂, spread seA (UNPOOLED) — the world you are afraid is
 *                       true. The area BELOW the cutoff is β: the misses. The area above it is power.
 *   the cutoff          a slider on α, keyboard-operable, which moves the rejection cutoff and
 *                       re-shades all three regions at once. Lower α, smaller α tail, bigger β.
 *   n and effect size   n₁ scales n₂ with it, so the whole comparison grows; p₁ moves against a
 *                       fixed p₂, so the gap the test is being asked to catch grows or shrinks.
 *   the power curve     power as a function of p₁, one series per α option, with the two named
 *                       alternatives marked — the price of α, read across every effect size at once.
 *
 * ── Props (stable) ──────────────────────────────────────────────────────────────────────────────
 *
 *   p1, p2        the alternative the panel opens on. Default ALTERNATIVE_DOUBLING (0.021 vs 0.007),
 *                 the difference specified before the test.
 *   n1, n2        group sizes. Default the Ledger's PERRINE_TRANSITS / OTHER_TRANSITS (900 / 1,712);
 *                 the n slider moves n₁ and holds n₂/n₁ at the ratio it started with.
 *   alpha         significance level on load. Default 0.05.
 *   alphaOptions  the α values the summary table and the power curve price. Default ALPHA_OPTIONS.
 *   alternatives  the named alternatives the table and the curve mark. Default: the difference
 *                 specified before the test, and the Board's "comparable corridors".
 *   label, tone   Panel header and ship-system tone.
 *
 * Nothing here is typed in. Every number comes from `powerTwoProportion` / `powerAgainst` /
 * `powerCurveTwoProp` in `@/instruments/act-6/data`, which are themselves assembled from
 * `@/lib/stats`. No randomness: the panel is deterministic.
 */
import { useMemo, useState } from 'react'
import { line as d3Line, scaleLinear } from 'd3'
import { Panel, type PanelTone } from '@/components/Panel'
import {
  ChartSurface,
  DensityCurve,
  Legend,
  PlotClip,
  Readout,
  ReferenceLine,
  Slider,
  XAxis,
  YAxis,
  chartTheme,
  semanticColor,
  seriesColor,
  useChartFrame,
  type LegendItem,
} from '@/instruments/shared'
import { fmt, fmtInt, fmtPct, normal } from '@/lib/stats'
import {
  ALPHA_OPTIONS,
  ALTERNATIVE_COMPARABLE,
  ALTERNATIVE_DOUBLING,
  OTHER_TRANSITS,
  PERRINE_TRANSITS,
  powerAgainst,
  powerCurveTwoProp,
  powerTwoProportion,
} from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

export interface NamedAlternative {
  /** How the wardroom refers to it. */
  label: string
  p1: number
  p2: number
}

/** The two alternatives 6-06 prices: the one you specified, and the one the Board will offer. */
export const NAMED_ALTERNATIVES: readonly NamedAlternative[] = [
  { label: 'the difference specified before the test', p1: ALTERNATIVE_DOUBLING.p1, p2: ALTERNATIVE_DOUBLING.p2 },
  { label: 'the Board’s “comparable corridors”', p1: ALTERNATIVE_COMPARABLE.p1, p2: ALTERNATIVE_COMPARABLE.p2 },
] as const

/** Range of the power curve's horizontal axis, in loss rate per transit. */
const CURVE_FROM = 0.007
const CURVE_TO = 0.035
const CURVE_STEPS = 56

export interface PowerExplorerProps {
  /** The alternative rate for group 1 on load. Default `ALTERNATIVE_DOUBLING.p1`. */
  p1?: number
  /** The alternative rate for group 2, held fixed by the effect-size slider. Default `ALTERNATIVE_DOUBLING.p2`. */
  p2?: number
  /** Group sizes on load. Defaults: the Ledger's 900 and 1,712. */
  n1?: number
  n2?: number
  /** Significance level on load. Default 0.05. */
  alpha?: number
  /** The α values the summary table and the power curve price. Default `ALPHA_OPTIONS`. */
  alphaOptions?: readonly number[]
  /** Named alternatives marked on the curve and listed in the table. */
  alternatives?: readonly NamedAlternative[]
  label?: string
  tone?: PanelTone
}

export function PowerExplorer({
  p1: p1Initial = ALTERNATIVE_DOUBLING.p1,
  p2 = ALTERNATIVE_DOUBLING.p2,
  n1: n1Initial = PERRINE_TRANSITS,
  n2: n2Initial = OTHER_TRANSITS,
  alpha: alphaInitial = 0.05,
  alphaOptions = ALPHA_OPTIONS,
  alternatives = NAMED_ALTERNATIVES,
  label = 'TACTICAL · ERRORS AND POWER',
  tone = 'tactical',
}: PowerExplorerProps = {}) {
  /* α is held as a percentage so the slider lands exactly on 0.05 and 0.01. */
  const [alphaPct, setAlphaPct] = useState(alphaInitial * 100)
  const [n1, setN1] = useState(n1Initial)
  /* p₁ is held in losses per thousand transits, which is how the wardroom says it out loud. */
  const [perThousand, setPerThousand] = useState(p1Initial * 1000)

  const alpha = alphaPct / 100
  const p1 = perThousand / 1000
  const ratio = n2Initial / n1Initial
  const n2 = Math.max(10, Math.round(n1 * ratio))

  const result = useMemo(() => powerTwoProportion({ p1, n1, p2, n2, alpha, alt: 'greater' }), [p1, n1, p2, n2, alpha])
  const { power, beta, rejectAbove, se0, seA } = result
  const delta = p1 - p2

  /* ---- Geometry of the two curves ---- */
  const domain = useMemo<[number, number]>(() => [Math.min(-4 * se0, delta - 4 * seA), Math.max(4 * se0, delta + 4 * seA)], [se0, seA, delta])
  const nullPdf = useMemo(() => (v: number) => normal.pdf(v, 0, se0), [se0])
  const altPdf = useMemo(() => (v: number) => normal.pdf(v, delta, seA), [delta, seA])

  const curveDescription =
    `Two sampling distributions of the difference in sample loss rates on one axis. The null distribution is centred at 0 with a pooled standard error of ${fmt(se0, 5)}; ` +
    `the alternative distribution is centred at ${fmt(delta, 5)} with an unpooled standard error of ${fmt(seA, 5)}. ` +
    `The test rejects when the observed difference exceeds ${fmt(rejectAbove, 5)}. The area beyond that cutoff under the null curve is α = ${fmt(alpha, 3)}; ` +
    `the area below it under the alternative curve is β = ${fmt(beta, 3)}; the area beyond it under the alternative curve is the power, ${fmt(power, 3)}. ` +
    `Group sizes are ${fmtInt(n1)} and ${fmtInt(n2)}. The data table gives the two densities across the axis.`

  /* ---- The power curve, at the Ledger's own sample sizes ---- */
  const curves = useMemo(() => alphaOptions.map((a) => ({ alpha: a, points: powerCurveTwoProp(a, CURVE_FROM, CURVE_TO, CURVE_STEPS) })), [alphaOptions])
  const frame = useChartFrame({ height: 240, yLabel: true })
  const cx = useMemo(() => scaleLinear().domain([CURVE_FROM, CURVE_TO]).range([0, frame.innerWidth]), [frame.innerWidth])
  const cy = useMemo(() => scaleLinear().domain([0, 1]).range([frame.innerHeight, 0]), [frame.innerHeight])
  const lineGen = useMemo(
    () =>
      d3Line<{ p1: number; power: number }>()
        .x((d) => cx(d.p1))
        .y((d) => cy(d.power)),
    [cx, cy],
  )

  const curveTable = useMemo(
    () => ({
      columns: ['p₁ · loss rate per transit', ...alphaOptions.map((a) => `power at α = ${fmt(a, 2)}`)],
      rows: curves[0].points
        .filter((_, i) => i % 4 === 0)
        .map((pt, i) => [fmt(pt.p1, 4), ...curves.map((c) => fmt(c.points[i * 4].power, 3))] as (string | number)[]),
      caption: `Power of the one-sided two-proportion z-test against p₂ = ${fmt(ALTERNATIVE_DOUBLING.p2, 3)}, at ${fmtInt(PERRINE_TRANSITS)} and ${fmtInt(OTHER_TRANSITS)} transits`,
    }),
    [curves, alphaOptions],
  )

  const curveLegend: LegendItem[] = [
    ...alphaOptions.map((a, i) => ({ label: `α = ${fmt(a, 2)}`, color: seriesColor(i), shape: 'line' as const })),
    ...alternatives.map((alt) => ({ label: `${alt.label} · p₁ = ${fmt(alt.p1, 3)}`, color: semanticColor('reference'), shape: 'dashed' as const })),
  ]

  const curveDescriptionText =
    `Power curves for the one-sided two-proportion z-test, plotted against the first group's true loss rate, with everyone else held at ${fmt(ALTERNATIVE_DOUBLING.p2, 3)} and the Ledger's own ${fmtInt(PERRINE_TRANSITS)} and ${fmtInt(OTHER_TRANSITS)} transits. ` +
    curves
      .map((c) => `At α = ${fmt(c.alpha, 2)} the power runs from ${fmt(c.points[0].power, 3)} at p₁ = ${fmt(CURVE_FROM, 3)} to ${fmt(c.points[c.points.length - 1].power, 3)} at p₁ = ${fmt(CURVE_TO, 3)}.`)
      .join(' ') +
    ` ${alternatives.map((alt) => `${alt.label} sits at p₁ = ${fmt(alt.p1, 3)}.`).join(' ')}`

  /* ---- The fallback table: what each α buys against each named alternative ---- */
  const summaryRows = alternatives.flatMap((alt) =>
    alphaOptions.map((a) => {
      const r = powerAgainst({ p1: alt.p1, p2: alt.p2 }, a)
      return [alt.label, `${fmt(alt.p1, 3)} vs ${fmt(alt.p2, 3)}`, fmt(a, 2), fmt(r.rejectAbove, 5), fmt(r.beta, 3), fmt(r.power, 3)]
    }),
  )

  const lowPower = power < 0.5

  return (
    <Panel
      label={label}
      status={`α = ${fmt(alpha, 3)} · POWER ${fmtPct(power, 1)}`}
      tone={tone}
      led={lowPower ? 'warn' : 'on'}
      ariaLabel="Type I and Type II error and power explorer"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Slider label="α — the rejection cutoff" value={alphaPct} min={0.5} max={10} step={0.5} onChange={setAlphaPct} format={(v) => fmt(v / 100, 3)} />
          <Slider label="transits in the first group (n₁, n₂ in proportion)" value={n1} min={150} max={3000} step={10} onChange={setN1} format={fmtInt} />
          <Slider label="the alternative’s rate p₁ (losses per thousand transits)" value={perThousand} min={8} max={40} step={0.5} onChange={setPerThousand} format={(v) => fmt(v / 1000, 4)} />
        </div>

        <ReadoutGrid>
          <Readout label="α · Type I error rate" value={fmt(alpha, 3)} tone="alert" live />
          <Readout label="β · Type II error rate" value={fmt(beta, 3)} tone="alert" live />
          <Readout label="power · 1 − β" value={fmt(power, 3)} tone={lowPower ? 'alert' : 'tactical'} live />
          <Readout label="difference needed to reject" value={fmt(rejectAbove, 5)} size="sm" live />
        </ReadoutGrid>
        <ReadoutGrid>
          <Readout label="the alternative’s difference p₁ − p₂" value={fmt(delta, 5)} size="sm" live />
          <Readout label="SE under H₀ (pooled)" value={fmt(se0, 5)} size="sm" live />
          <Readout label="SE under Hₐ (unpooled)" value={fmt(seA, 5)} size="sm" live />
          <Readout label="n₁ · n₂" value={`${fmtInt(n1)} · ${fmtInt(n2)}`} size="sm" live />
        </ReadoutGrid>

        <DensityCurve
          curves={[
            { pdf: nullPdf, label: 'H₀ · no difference, pooled SE', color: 'null' },
            { pdf: altPdf, label: `Hₐ · a difference of ${fmt(delta, 4)}, unpooled SE`, color: 'alt', dashed: true },
          ]}
          domain={domain}
          shade={[
            { from: rejectAbove, to: domain[1], curve: 0, color: 'shadeRejected', label: `α = ${fmt(alpha, 3)}` },
            { from: domain[0], to: rejectAbove, curve: 1, color: 'shadeCaution', label: `β = ${fmt(beta, 3)}` },
            { from: rejectAbove, to: domain[1], curve: 1, color: 'shadeAlt', label: `power = ${fmt(power, 3)}` },
          ]}
          references={[{ x: rejectAbove, label: `reject above ${fmt(rejectAbove, 4)}`, color: 'observed' }]}
          xLabel="difference in sample loss rates, p̂₁ − p̂₂"
          height={300}
          ariaLabel="Null and alternative sampling distributions of the difference in sample proportions, with the alpha, beta and power regions shaded"
          description={curveDescription}
        />

        <Note tone={lowPower ? 'alert' : 'muted'} live>
          The cutoff sits at a difference of {fmt(rejectAbove, 5)} — {fmt(rejectAbove * 100, 3)} percentage points. Anything above it is called evidence; anything below it is not. Under H₀ that
          happens {fmt(alpha, 3)} of the time, and those are false alarms. If the truth is instead {fmt(p1, 4)} against {fmt(p2, 4)}, the test lands below the cutoff {fmt(beta, 3)} of the time
          and the difference goes unreported: that is β, and it is the error that is paid in hulls.
        </Note>

        <Note tone="warn">
          Power is <strong>1 − β</strong>, not 1 − α. Here 1 − α = {fmt(1 - alpha, 3)} and the power is {fmt(power, 3)}; the two have nothing to do with one another. α is a property of the
          test alone, fixed before any data exist. Power is a property of the test <em>and</em> a specific alternative <em>and</em> the sample sizes — move any of the three sliders and it
          moves.
        </Note>

        <section aria-label="Power curve">
          <Subhead>What each α buys, across every effect size</Subhead>
          <ChartSurface
            frame={frame}
            ariaLabel="Power curves at each significance level against the first group's true loss rate"
            description={curveDescriptionText}
            table={curveTable}
            footer={<Legend items={curveLegend} ariaLabel="Power curve key" />}
          >
            <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
              <YAxis scale={cy} width={frame.innerWidth} ticks={5} label="power" grid />
              <PlotClip frame={frame}>
                {curves.map((c, i) => (
                  <path
                    key={c.alpha}
                    className="dr-mark dr-mark--line"
                    d={lineGen(c.points) ?? ''}
                    fill="none"
                    stroke={seriesColor(i)}
                    strokeWidth={chartTheme.stroke.line}
                    strokeLinejoin="round"
                  >
                    <title>{`power at α = ${fmt(c.alpha, 2)}`}</title>
                  </path>
                ))}
              </PlotClip>
              {alternatives.map((alt) => (
                <ReferenceLine key={alt.label} x={cx(alt.p1)} height={frame.innerHeight} label={fmt(alt.p1, 3)} color={semanticColor('reference')} />
              ))}
              <XAxis scale={cx} height={frame.innerHeight} label="the first group’s true loss rate p₁" format={(v) => fmt(v, 3)} />
            </g>
          </ChartSurface>
          <Note>
            Both curves climb from left to right, because a bigger difference is easier to catch, and the lower α runs underneath the higher one everywhere — that gap is the price of the
            stricter cutoff, paid in detections you will not make. At {fmt(ALTERNATIVE_COMPARABLE.p1, 3)} against {fmt(ALTERNATIVE_COMPARABLE.p2, 3)} both curves are on the floor: against a
            difference that small, this Ledger is very nearly blind, and no choice of α repairs it.
          </Note>
        </section>

        <section aria-label="What each significance level buys">
          <Subhead>The price list</Subhead>
          <KeyTable
            caption={`One-sided two-proportion z-test on ${fmtInt(PERRINE_TRANSITS)} and ${fmtInt(OTHER_TRANSITS)} transits`}
            ariaLabel="Alpha, beta and power at each significance level against each named alternative"
            columns={['alternative', 'p₁ vs p₂', 'α', 'difference needed to reject', 'β', 'power']}
            rows={summaryRows}
            emphasisRow={0}
          />
          <Note>
            Read the first two rows against each other. The same data, the same alternative, and fourteen points of power between them — that is the whole of what α costs. Read the last two
            and note that α buys nothing at all: against a difference of one tenth of a point, the test misses more than nine times in ten either way.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
