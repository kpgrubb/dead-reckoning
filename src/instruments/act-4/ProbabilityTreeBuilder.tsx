/**
 * INTEL · CONDITIONAL TREE (act-4-03) — a two-stage tree the learner edits, and then reverses.
 *
 * Stage one is the condition the ship is in, or the fade pattern a hull showed. Stage two is what
 * happened given that. Each leaf carries the joint P(A ∩ B) = P(A)·P(B | A); the four joints sum to
 * one. Any stage whose branches do not sum to one is flagged and its joints are void — the discipline
 * is the instrument.
 *
 * REVERSE recomputes the tree from the other end: pick a second-stage outcome and read
 * P(first | second) = joint ÷ the second-stage marginal, with the numerator and denominator written
 * out. That is the whole module. The Board's staff paper reports P(no loss | gradual fade) = 0.84.
 * The question a hostile reader asks is P(gradual fade | loss) = 0.61. Same table. Different question.
 * Neither number is the other one turned around.
 *
 * Presets come from `data.ts`: the Register's fades (DS-01) and the being-seen model (DS-06).
 */
import { useMemo, useState, type KeyboardEvent } from 'react'
import { Panel } from '@/components/Panel'
import { ChartSurface, Legend, Readout, ReadoutRow, Segmented, Slider, chartTheme, semanticColor, seriesColor, useChartFrame } from '@/instruments/shared'
import { fmt, fmtP, fmtPct, twoWay } from '@/lib/stats'
import {
  FADE_COLS,
  FADE_ROWS,
  GRADUAL_TOTAL,
  LOITER_DAYS,
  LOSS_TOTAL,
  P_GRADUAL_GIVEN_LOSS,
  P_NO_LOSS_GIVEN_GRADUAL,
  P_SEEN_PER_PASS_COLD,
  P_SEEN_PER_PASS_PURGING,
  PURGE_HOURS_TOTAL,
  fadeCounts,
} from './data'
import { Note, Subhead, stackStyle } from './_ui'

export type TreePreset = 'fades' | 'seen'

export interface ProbabilityTreeBuilderProps {
  /** Which two-stage model the tree opens on. */
  preset?: TreePreset
  /** Prior that the pass finds the ship purging, in the being-seen preset. Defaults to the Act's purge duty cycle. */
  purgeShare?: number
  /** Index of the second-stage outcome the reversed reading conditions on. */
  reverseOn?: number
}

interface Tree {
  first: [string, string]
  second: [string, string]
  p1: [number, number]
  p2: [[number, number], [number, number]]
}

const PRESET_OPTIONS = [
  { value: 'fades', label: "the Register's fades" },
  { value: 'seen', label: 'the being-seen model' },
] as const

/** The Act's purge duty cycle: hours with the wings out over the whole loiter. */
export const PURGE_DUTY_CYCLE = PURGE_HOURS_TOTAL / (LOITER_DAYS * 24)

const TOL = 1e-9

function fadesTree(): Tree {
  const tw = twoWay(fadeCounts, { rows: [...FADE_ROWS], cols: [...FADE_COLS] })
  return {
    first: [FADE_ROWS[0], FADE_ROWS[1]],
    second: [FADE_COLS[0], FADE_COLS[1]],
    p1: [tw.marginalRows[0], tw.marginalRows[1]],
    p2: [
      [tw.rowConditional[0][0], tw.rowConditional[0][1]],
      [tw.rowConditional[1][0], tw.rowConditional[1][1]],
    ],
  }
}

function seenTree(purgeShare: number): Tree {
  return {
    first: ['cold', 'purging'],
    second: ['seen', 'not seen'],
    p1: [1 - purgeShare, purgeShare],
    p2: [
      [P_SEEN_PER_PASS_COLD, 1 - P_SEEN_PER_PASS_COLD],
      [P_SEEN_PER_PASS_PURGING, 1 - P_SEEN_PER_PASS_PURGING],
    ],
  }
}

function treeFor(preset: TreePreset, purgeShare: number): Tree {
  return preset === 'fades' ? fadesTree() : seenTree(purgeShare)
}

/** A probability cell that lets the learner type freely and commits on Enter or blur. */
function PInput({ label, value, onChange, invalid }: { label: string; value: number; onChange: (v: number) => void; invalid?: boolean }) {
  const [text, setText] = useState<string | null>(null)
  const commit = () => {
    if (text === null) return
    const n = Number(text)
    if (Number.isFinite(n)) onChange(Math.min(1, Math.max(0, n)))
    setText(null)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const step = (e.shiftKey ? 0.1 : 0.01) * (e.key === 'ArrowUp' ? 1 : -1)
      setText(null)
      onChange(Math.min(1, Math.max(0, Number((value + step).toPrecision(12)))))
    }
  }
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      aria-invalid={invalid || undefined}
      value={text ?? fmt(value, 4)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={onKey}
    />
  )
}

export function ProbabilityTreeBuilder({ preset: presetProp = 'fades', purgeShare: purgeProp = PURGE_DUTY_CYCLE, reverseOn = 0 }: ProbabilityTreeBuilderProps = {}) {
  const [preset, setPresetState] = useState<TreePreset>(presetProp)
  const [purgeShare, setPurgeShareState] = useState(purgeProp)
  const [tree, setTree] = useState<Tree>(() => treeFor(presetProp, purgeProp))
  const [reversed, setReversed] = useState(false)
  const [target, setTarget] = useState(String(reverseOn))

  const setPreset = (p: TreePreset) => {
    setPresetState(p)
    setTree(treeFor(p, purgeShare))
    setTarget('0')
  }
  const setPurgeShare = (v: number) => {
    setPurgeShareState(v)
    if (preset === 'seen') setTree(seenTree(v))
  }
  const restore = () => {
    setTree(treeFor(preset, purgeShare))
  }

  /* ---- Validity: every stage's branches must sum to 1 ---- */
  const sum1 = tree.p1[0] + tree.p1[1]
  const sum2 = [tree.p2[0][0] + tree.p2[0][1], tree.p2[1][0] + tree.p2[1][1]] as const
  const ok1 = Math.abs(sum1 - 1) <= TOL
  const ok2 = [Math.abs(sum2[0] - 1) <= TOL, Math.abs(sum2[1] - 1) <= TOL] as const
  const valid = ok1 && ok2[0] && ok2[1]

  /* ---- Joints and the second-stage marginals ---- */
  const joints = useMemo(
    () => [
      [tree.p1[0] * tree.p2[0][0], tree.p1[0] * tree.p2[0][1]],
      [tree.p1[1] * tree.p2[1][0], tree.p1[1] * tree.p2[1][1]],
    ],
    [tree],
  )
  const jointTotal = joints[0][0] + joints[0][1] + joints[1][0] + joints[1][1]
  const marginal2 = [joints[0][0] + joints[1][0], joints[0][1] + joints[1][1]]
  const j = Number(target)
  const denom = marginal2[j]
  const reverse = [denom > 0 ? joints[0][j] / denom : NaN, denom > 0 ? joints[1][j] / denom : NaN]

  /* ---- The tree itself ---- */
  const frame = useChartFrame({ height: 268, margin: { top: 18, right: 132, bottom: 18, left: 58 } })
  const leafY = [0, 1, 2, 3].map((i) => ((i + 0.5) * frame.innerHeight) / 4)
  const nodeY = [(leafY[0] + leafY[1]) / 2, (leafY[2] + leafY[3]) / 2]
  const rootX = 0
  const nodeX = frame.innerWidth * 0.38
  const leafX = frame.innerWidth * 0.78

  const leaves = ([0, 1] as const).flatMap((i) =>
    ([0, 1] as const).map((c) => ({
      i,
      c,
      y: leafY[i * 2 + c],
      label: `${tree.first[i]} ∩ ${tree.second[c]}`,
      joint: joints[i][c],
    })),
  )

  const table = {
    columns: ['path', 'P(first stage)', 'P(second | first)', 'joint P(first ∩ second)', 'P(second)', 'P(first | second)'],
    rows: leaves.map((l) => [
      l.label,
      fmt(tree.p1[l.i], 4),
      fmt(tree.p2[l.i][l.c], 4),
      fmt(l.joint, 4),
      fmt(marginal2[l.c], 4),
      marginal2[l.c] > 0 ? fmt(l.joint / marginal2[l.c], 4) : '—',
    ] as (string | number)[]),
    caption: `Two-stage tree. The four joints sum to ${fmt(jointTotal, 4)}; each joint is the product along its path, and the reversed conditional is the joint divided by the second-stage marginal.`,
  }

  const edge = (x1: number, y1: number, x2: number, y2: number, ok: boolean, key: string) => (
    <path key={key} className="dr-tree__edge" d={`M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`} stroke={ok ? chartTheme.color.axis : semanticColor('rejected')} strokeWidth={chartTheme.stroke.line} fill="none" />
  )

  const headline =
    preset === 'fades'
      ? `P(${FADE_COLS[1]} | ${FADE_ROWS[0]}) = ${fmt(P_NO_LOSS_GIVEN_GRADUAL, 4)} · P(${FADE_ROWS[0]} | ${FADE_COLS[0]}) = ${fmt(P_GRADUAL_GIVEN_LOSS, 4)}`
      : `P(seen) = ${fmt(marginal2[0], 4)}`

  return (
    <Panel label="INTEL · CONDITIONAL TREE" tone="intel" led={valid ? 'on' : 'alert'} status={valid ? headline : 'BRANCHES DO NOT SUM TO 1'}>
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<TreePreset> label="model" value={preset} options={PRESET_OPTIONS} onChange={setPreset} />
          {preset === 'seen' && (
            <Slider label="prior · the pass finds her purging" value={purgeShare} min={0} max={0.5} step={0.005} onChange={setPurgeShare} format={(v) => fmt(v, 3)} />
          )}
          <button type="button" className="dr-btn dr-btn--sm" onClick={restore}>
            RESTORE PRESET
          </button>
          <button type="button" className="dr-btn dr-btn--sm dr-btn--primary" aria-pressed={reversed} onClick={() => setReversed((r) => !r)}>
            REVERSE
          </button>
        </div>

        <section aria-label="Branch probabilities">
          <Subhead>Branches · every stage must sum to 1</Subhead>
          <table className="dr-pgrid">
            <caption>editable probabilities</caption>
            <thead>
              <tr>
                <th scope="col">stage</th>
                <th scope="col">{tree.second[0]}</th>
                <th scope="col">{tree.second[1]}</th>
                <th scope="col">sum</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">first stage · P({tree.first[0]}), P({tree.first[1]})</th>
                <td>
                  <PInput label={`P(${tree.first[0]})`} value={tree.p1[0]} invalid={!ok1} onChange={(v) => setTree({ ...tree, p1: [v, tree.p1[1]] })} />
                </td>
                <td>
                  <PInput label={`P(${tree.first[1]})`} value={tree.p1[1]} invalid={!ok1} onChange={(v) => setTree({ ...tree, p1: [tree.p1[0], v] })} />
                </td>
                <td className={ok1 ? 'is-total' : 'is-total is-invalid'}>{fmt(sum1, 4)}</td>
              </tr>
              {([0, 1] as const).map((i) => (
                <tr key={i}>
                  <th scope="row">
                    given {tree.first[i]} · P({tree.second[0]} | {tree.first[i]}), P({tree.second[1]} | {tree.first[i]})
                  </th>
                  {([0, 1] as const).map((c) => (
                    <td key={c}>
                      <PInput
                        label={`P(${tree.second[c]} given ${tree.first[i]})`}
                        value={tree.p2[i][c]}
                        invalid={!ok2[i]}
                        onChange={(v) => {
                          const next = tree.p2.map((r) => [...r]) as [[number, number], [number, number]]
                          next[i][c] = v
                          setTree({ ...tree, p2: next })
                        }}
                      />
                    </td>
                  ))}
                  <td className={ok2[i] ? 'is-total' : 'is-total is-invalid'}>{fmt(sum2[i], 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!valid && (
            <Note tone="alert" live>
              A stage whose branches do not sum to 1 is not a model of anything. The joints below are void until it does. Sums read {fmt(sum1, 4)}, {fmt(sum2[0], 4)}, {fmt(sum2[1], 4)}.
            </Note>
          )}
        </section>

        <ChartSurface
          frame={frame}
          className="dr-tree"
          ariaLabel={`Two-stage probability tree: ${tree.first[0]} or ${tree.first[1]}, then ${tree.second[0]} or ${tree.second[1]}, with the four joint probabilities at the leaves`}
          description={`From the root the first stage splits into ${tree.first[0]} with probability ${fmt(tree.p1[0], 4)} and ${tree.first[1]} with probability ${fmt(tree.p1[1], 4)}. Each branch splits again into ${tree.second[0]} and ${tree.second[1]}. Each leaf carries the product along its path. The four joints sum to ${fmt(jointTotal, 4)}. The data table gives every path, its joint and its reversed conditional.`}
          table={table}
          footer={<Legend items={[{ label: 'path probability', color: chartTheme.color.axis, shape: 'line' }, { label: `joint P(first ∩ second) · total ${fmt(jointTotal, 3)}`, color: seriesColor(0), shape: 'square' }, { label: reversed ? `conditioned on ${tree.second[j]}` : 'press REVERSE to condition the other way', color: semanticColor('observed'), shape: 'dot', muted: !reversed }]} ariaLabel="Tree key" />}
        >
          <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
            {([0, 1] as const).map((i) => edge(rootX, frame.innerHeight / 2, nodeX, nodeY[i], ok1, `e1-${i}`))}
            {([0, 1] as const).flatMap((i) => ([0, 1] as const).map((c) => edge(nodeX, nodeY[i], leafX, leafY[i * 2 + c], ok2[i], `e2-${i}-${c}`)))}
            <circle cx={rootX} cy={frame.innerHeight / 2} r={5} fill={chartTheme.color.axis} />
            <text x={rootX - 8} y={frame.innerHeight / 2} dy="0.32em" textAnchor="end" fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
              all
            </text>
            {([0, 1] as const).map((i) => (
              <g key={`n-${i}`}>
                <circle cx={nodeX} cy={nodeY[i]} r={5} fill={seriesColor(i)} />
                <text x={(rootX + nodeX) / 2} y={(frame.innerHeight / 2 + nodeY[i]) / 2 - 6} textAnchor="middle" fill={ok1 ? chartTheme.color.label : semanticColor('rejected')} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                  {tree.first[i]} {fmt(tree.p1[i], 3)}
                </text>
              </g>
            ))}
            {leaves.map((l) => (
              <g key={`l-${l.i}-${l.c}`} className="dr-tree__leaf">
                <text x={(nodeX + leafX) / 2} y={(nodeY[l.i] + l.y) / 2 - 5} textAnchor="middle" fill={ok2[l.i] ? chartTheme.color.label : semanticColor('rejected')} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                  {tree.second[l.c]} {fmt(tree.p2[l.i][l.c], 3)}
                </text>
                <circle cx={leafX} cy={l.y} r={4} fill={reversed && l.c === j ? semanticColor('observed') : seriesColor(l.i)} />
                <text x={leafX + 8} y={l.y} dy="0.32em" fill={chartTheme.color.title} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                  {valid ? fmt(l.joint, 4) : '—'}
                </text>
                <text x={leafX + 8} y={l.y + 12} dy="0.32em" fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                  {l.label}
                </text>
              </g>
            ))}
          </g>
        </ChartSurface>

        <ReadoutRow>
          <Readout label="joints sum to" value={fmt(jointTotal, 4)} tone={Math.abs(jointTotal - 1) <= 1e-9 ? 'intel' : 'alert'} live />
          <Readout label={`P(${tree.second[0]})`} value={valid ? fmt(marginal2[0], 4) : '—'} tone="intel" live />
          <Readout label={`P(${tree.second[1]})`} value={valid ? fmt(marginal2[1], 4) : '—'} size="sm" live />
          <Readout label={`P(${tree.second[0]} | ${tree.first[0]})`} value={fmt(tree.p2[0][0], 4)} size="sm" />
          <Readout label={`P(${tree.second[1]} | ${tree.first[0]})`} value={fmt(tree.p2[0][1], 4)} size="sm" />
        </ReadoutRow>

        {reversed && (
          <section aria-label="Reversed conditional">
            <Subhead>Reversed · conditioning on the second stage</Subhead>
            <Segmented
              label="condition on"
              value={target}
              options={[
                { value: '0', label: tree.second[0] },
                { value: '1', label: tree.second[1] },
              ]}
              onChange={setTarget}
            />
            <ReadoutRow>
              <Readout label={`P(${tree.first[0]} | ${tree.second[j]})`} value={valid ? fmt(reverse[0], 4) : '—'} tone="intel" live />
              <Readout label={`P(${tree.first[1]} | ${tree.second[j]})`} value={valid ? fmt(reverse[1], 4) : '—'} tone="intel" live />
              <Readout label="numerator · joint" value={valid ? fmt(joints[0][j], 4) : '—'} size="sm" live />
              <Readout label={`denominator · P(${tree.second[j]})`} value={valid ? fmt(denom, 4) : '—'} size="sm" live />
            </ReadoutRow>
            <Note tone="ok" live>
              P({tree.first[0]} | {tree.second[j]}) = P({tree.first[0]} ∩ {tree.second[j]}) ÷ P({tree.second[j]}) = {fmt(joints[0][j], 4)} ÷ {fmt(denom, 4)} = {fmt(reverse[0], 4)}. The numerator is one leaf; the denominator is the column that leaf sits in. Turning the conditioning around does not turn the number around — it divides by a different total.
            </Note>
          </section>
        )}

        {preset === 'fades' ? (
          <Note>
            The Board's staff paper reads P({FADE_COLS[1]} | {FADE_ROWS[0]}) = {fmtPct(P_NO_LOSS_GIVEN_GRADUAL, 1)} — {fadeCounts[0][1]} of {GRADUAL_TOTAL} gradual fades resolved without a loss. True, and answering a question nobody asked. Condition the other way and P({FADE_ROWS[0]} | {FADE_COLS[0]}) = {fmtPct(P_GRADUAL_GIVEN_LOSS, 1)}: {fadeCounts[0][0]} of the {LOSS_TOTAL} losses began as a gradual fade. Same {fadeCounts[0][0]} hulls in the numerator. Different denominator. {fmtP(P_NO_LOSS_GIVEN_GRADUAL)} and {fmtP(P_GRADUAL_GIVEN_LOSS)} are answers to different questions and neither is the complement of the other.
          </Note>
        ) : (
          <Note>
            A close pass finds her cold with probability {fmt(tree.p1[0], 3)} and purging with probability {fmt(tree.p1[1], 3)}. Cold, the pass detects her once in fifty; purging, three times in five. Overall P(seen) = {fmt(marginal2[0], 4)}. Reverse it: given that a pass did see something, P(purging | seen) = {fmt(marginal2[0] > 0 ? joints[1][0] / marginal2[0] : NaN, 4)}. The wings are out {fmtPct(tree.p1[1], 1)} of the time and account for most of the detections. That is the heat plan's whole argument in one number.
          </Note>
        )}
      </div>
    </Panel>
  )
}
