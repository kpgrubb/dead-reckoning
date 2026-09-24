/**
 * TACTICAL · PICKET MODEL (act-8-02) — DS-17, the tree the learner signs before ordering the dwell.
 *
 * Two branch probabilities, both draggable, and three leaves whose products move with them:
 *
 *   P(a wrecker is at Kettle at all)                                    0.75 as signed
 *   P(on picket, cold, in the approach quarter | one is there)          0.40 as signed
 *
 * The product of the two is P(a picket can respond inside the time it takes *Nightjar* to light her
 * torch). Dragging either branch moves that readout and the two it competes with, so the learner can
 * see what the order costs at other people's estimates as well as at the signed one.
 *
 * The tree has **no detection leaf**. It answers whether a picket is in a position to respond and
 * stops; what a picket would respond to is not modelled here, and the panel says so.
 *
 * The approach physics along the bottom (slug flight, torch from Watch, cold translation) are read
 * from `@/instruments/act-8/data`, which computes them. Nothing here is typed in.
 */
import { useState } from 'react'
import { Panel } from '@/components'
import type { PanelTone } from '@/components/Panel'
import { Readout, Slider } from '@/instruments/shared'
import { fmt, fmtInt, fmtPct } from '@/lib/stats'
import {
  COLD_DISPLACEMENT_M,
  PATIENCE_RANGE_KM,
  P_ON_PICKET_GIVEN_PRESENT,
  P_WRECKER_PRESENT,
  SLUG_FLIGHT_MIN,
  TORCH_FROM_WATCH_MIN,
} from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

export interface PicketTreeProps {
  label?: string
  tone?: PanelTone
}

interface Leaf {
  path: string
  gloss: string
  probability: number
  responds: boolean
}

const W = 640
const H = 250

export function PicketTree({ label = 'TACTICAL · PICKET MODEL', tone = 'tactical' }: PicketTreeProps = {}) {
  const [present, setPresent] = useState(P_WRECKER_PRESENT)
  const [onPicket, setOnPicket] = useState(P_ON_PICKET_GIVEN_PRESENT)

  const signed = Math.abs(present - P_WRECKER_PRESENT) < 1e-9 && Math.abs(onPicket - P_ON_PICKET_GIVEN_PRESENT) < 1e-9
  const canRespond = present * onPicket

  const leaves: Leaf[] = [
    { path: 'wrecker at Kettle · on picket in the approach quarter', gloss: 'cold, inside slug range of the track', probability: present * onPicket, responds: true },
    { path: 'wrecker at Kettle · covering another quarter', gloss: 'one tug covers one quarter of the sky', probability: present * (1 - onPicket), responds: false },
    { path: 'no wrecker at Kettle', gloss: 'the tug is Lane-side, where its four kills were', probability: 1 - present, responds: false },
  ]
  const total = leaves.reduce((s, l) => s + l.probability, 0)

  // Tree geometry: root, two first-level nodes, three leaves.
  const rootX = 24
  const midX = 250
  const leafX = 470
  const yRoot = H / 2
  const yPresent = 70
  const yAbsent = 196
  const leafY = [34, 112, yAbsent]

  const edge = (x1: number, y1: number, x2: number, y2: number, live: boolean) => (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={live ? 'var(--dr-phosphor)' : 'var(--dr-line-strong)'}
      strokeWidth={live ? 2 : 1.25}
      style={{ transition: 'stroke var(--dr-dur) linear' }}
    />
  )

  const node = (x: number, y: number, live: boolean) => <circle cx={x} cy={y} r={4} fill={live ? 'var(--dr-phosphor)' : 'var(--dr-steel-dim)'} />

  const branchLabel = (x: number, y: number, text: string, live: boolean) => (
    <text x={x} y={y} fontFamily="var(--dr-font-mono)" fontSize="11" fill={live ? 'var(--dr-phosphor)' : 'var(--dr-fg-2)'}>
      {text}
    </text>
  )

  return (
    <Panel
      label={label}
      status={`P(respond) ${fmt(canRespond, 3)}${signed ? ' · as signed' : ' · off the signed model'}`}
      tone={tone}
      led={signed ? 'on' : 'warn'}
      ariaLabel="Picket model: the two branch probabilities, the three leaves and the chance a picket can respond"
    >
      <div style={stackStyle}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          role="img"
          aria-label={`Probability tree with two branches and three leaves. A wrecker is at Kettle with probability ${fmt(present, 2)}; given that, it is on picket in the approach quarter with probability ${fmt(onPicket, 2)}. The three leaf probabilities are ${leaves.map((l) => `${l.path}, ${fmt(l.probability, 4)}`).join('; ')}. One leaf responds, and its probability is ${fmt(canRespond, 4)}.`}
          style={{ maxWidth: '100%', overflow: 'visible' }}
        >
          {edge(rootX, yRoot, midX, yPresent, true)}
          {edge(rootX, yRoot, midX, yAbsent, false)}
          {edge(midX, yPresent, leafX, leafY[0], true)}
          {edge(midX, yPresent, leafX, leafY[1], false)}
          {edge(midX, yAbsent, leafX, leafY[2], false)}

          {node(rootX, yRoot, true)}
          {node(midX, yPresent, true)}
          {node(midX, yAbsent, false)}
          {leafY.map((y, i) => (
            <g key={i}>{node(leafX, y, i === 0)}</g>
          ))}

          {branchLabel(rootX + 18, yRoot - 44, `wrecker present  ${fmt(present, 2)}`, true)}
          {branchLabel(rootX + 18, yRoot + 52, `none  ${fmt(1 - present, 2)}`, false)}
          {branchLabel(midX + 14, yPresent - 26, `on picket, approach quarter  ${fmt(onPicket, 2)}`, true)}
          {branchLabel(midX + 14, yPresent + 38, `elsewhere  ${fmt(1 - onPicket, 2)}`, false)}

          {leaves.map((l, i) => (
            <text key={l.path} x={leafX + 12} y={leafY[i] + 4} fontFamily="var(--dr-font-mono)" fontSize="12" fill={l.responds ? 'var(--dr-phosphor)' : 'var(--dr-fg-1)'}>
              {fmt(l.probability, 4)}
              {l.responds ? '  ← responds' : ''}
            </text>
          ))}
        </svg>

        <div className="dr-controls">
          <Slider label="P(a wrecker is at Kettle)" value={present} min={0} max={1} step={0.01} onChange={setPresent} format={(v) => fmt(v, 2)} />
          <Slider label="P(on picket in the approach quarter | present)" value={onPicket} min={0} max={1} step={0.01} onChange={setOnPicket} format={(v) => fmt(v, 2)} />
          <button
            type="button"
            className="dr-btn dr-btn--ghost dr-btn--sm"
            onClick={() => {
              setPresent(P_WRECKER_PRESENT)
              setOnPicket(P_ON_PICKET_GIVEN_PRESENT)
            }}
            disabled={signed}
          >
            THE SIGNED MODEL
          </button>
        </div>

        <ReadoutGrid>
          <Readout label="P(a picket can respond)" value={fmt(canRespond, 3)} tone="alert" live />
          <Readout label="that as a percentage" value={fmtPct(canRespond, 0)} size="sm" live />
          <Readout label="P(nothing answers)" value={fmt(1 - canRespond, 3)} size="sm" live />
          <Readout label="leaves sum to" value={fmt(total, 3)} size="sm" live />
        </ReadoutGrid>

        <section aria-label="The three paths and their probabilities">
          <Subhead>Every path the model contains</Subhead>
          <KeyTable
            ariaLabel="Picket model: each path through the tree, how its probability is multiplied out, and whether a picket on that path can respond"
            caption={`Three paths, ${signed ? 'at the signed estimates' : 'at the estimates now on the sliders'}`}
            columns={['path', 'why', 'probability', 'can respond']}
            rows={leaves.map((l) => [l.path, l.gloss, fmt(l.probability, 4), l.responds ? 'yes' : 'no'])}
            emphasisRow={0}
          />
        </section>

        <Note tone="warn">
          There is no detection branch in this tree. It asks whether a picket is in a position to answer inside the {fmtInt(TORCH_FROM_WATCH_MIN)} minutes a scrammed reactor needs, and stops there. What a picket would answer <em>to</em> is not in the model.
        </Note>

        <section aria-label="The approach physics the model sits inside">
          <Subhead>What the clock does, whichever leaf it is</Subhead>
          <ReadoutGrid>
            <Readout label={`slug flight from ${fmtInt(PATIENCE_RANGE_KM)} km`} value={fmt(SLUG_FLIGHT_MIN, 1)} units="min" size="sm" />
            <Readout label="torch from Watch" value={fmtInt(TORCH_FROM_WATCH_MIN)} units="min" size="sm" />
            <Readout label="cold translation over that flight" value={fmt(COLD_DISPLACEMENT_M, 1)} units="m" size="sm" />
            <Readout label="picket range at closest approach" value={fmtInt(PATIENCE_RANGE_KM)} units="km" size="sm" />
          </ReadoutGrid>
        </section>
      </div>
    </Panel>
  )
}
