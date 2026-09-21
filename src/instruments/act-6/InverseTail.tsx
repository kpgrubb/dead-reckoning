/**
 * INTEL · INVERSE TAIL (calc briefing `tails-and-inverse-functions`) — area in, cutoff out.
 *
 * Two axes, one idea. The learner sets the central area C and the panel returns the cutoff that
 * encloses it: z* in the normal mode, t* in the t mode with a df slider beside it. Nothing is drawn
 * from a table of critical values — z* is `zStar(C)` (the standard normal quantile at (1 + C)/2) and
 * t* is `t.quantile((1 + C)/2, df)`, which is the same inversion performed on a heavier-tailed
 * curve. Sliding df upward walks t* down onto z*, which is the only honest reason the two tables in
 * the back of a textbook have a last row that agrees.
 *
 * Small on purpose: one curve (two in t mode), one shaded middle, two cutoffs, four readouts.
 */
import { useState } from 'react'
import { Panel } from '@/components/Panel'
import { DensityCurve, Readout, Segmented, Slider, type Curve, type ShadeRegion } from '@/instruments/shared'
import { fmt, fmtPct, normal, t, zStar } from '@/lib/stats'
import { Note, ReadoutGrid, stackStyle } from './_ui'

type Mode = 'z' | 't'

const DOMAIN: [number, number] = [-4.4, 4.4]

export interface InverseTailProps {
  /** Central area on load. */
  confidence?: number
  /** Degrees of freedom on load (t mode). */
  df?: number
  mode?: Mode
}

export function InverseTail({ confidence: c0 = 0.95, df: df0 = 8, mode: mode0 = 'z' }: InverseTailProps = {}) {
  const [mode, setMode] = useState<Mode>(mode0)
  const [confidence, setConfidence] = useState(c0)
  const [df, setDf] = useState(df0)

  const tail = (1 - confidence) / 2
  const cumulative = (1 + confidence) / 2
  const zCut = zStar(confidence)
  const tCut = t.quantile(cumulative, df)
  const cut = mode === 'z' ? zCut : tCut

  const curves: Curve[] =
    mode === 'z'
      ? [{ pdf: (x) => normal.pdf(x), label: 'standard normal', color: 'fit' }]
      : [
          { pdf: (x) => t.pdf(x, df), label: `t, df ${fmt(df, 0)}`, color: 'fit' },
          { pdf: (x) => normal.pdf(x), label: 'standard normal', color: 'null', dashed: true },
        ]

  const shade: ShadeRegion[] = [{ from: -cut, to: cut, color: 'shade', label: `central area ${fmtPct(confidence, 0)}` }]

  const label = mode === 'z' ? 'z*' : 't*'
  const description = `A ${mode === 'z' ? 'standard normal' : `t distribution with ${fmt(df, 0)} degrees of freedom, drawn over the standard normal for comparison`} with the central ${fmtPct(confidence, 0)} of its area shaded. The cutoff that encloses that area is ${label} = ${fmt(cut, 4)}: the two tails outside it carry ${fmt(tail, 4)} each, and the cumulative area up to the cutoff is ${fmt(cumulative, 4)}. ${mode === 't' ? `The normal cutoff for the same area is ${fmt(zCut, 4)}, so t* exceeds z* by ${fmt(tCut - zCut, 4)}; raising the degrees of freedom shrinks that gap toward zero.` : `Read the same curve the other way and the area below ${fmt(cut, 4)} is ${fmt(normal.cdf(cut), 4)}.`}`

  return (
    <Panel
      label="INTEL · INVERSE TAIL"
      status={`${label} = ${fmt(cut, 3)}`}
      tone="intel"
      led="on"
      ariaLabel="Inverse tail: set a central area and read back the cutoff that encloses it, for the normal and the t distributions"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Mode>
            label="curve"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'z', label: 'normal · z*' },
              { value: 't', label: 't · t*' },
            ]}
          />
          <Slider label="central area C" value={Math.round(confidence * 100)} min={50} max={99} step={1} onChange={(v) => setConfidence(v / 100)} format={(v) => `${v}%`} />
          {mode === 't' && <Slider label="degrees of freedom" value={df} min={1} max={200} step={1} onChange={setDf} format={(v) => fmt(v, 0)} />}
        </div>

        <ReadoutGrid>
          <Readout label="area in · central C" value={fmt(confidence, 4)} size="sm" live />
          <Readout label="one tail · (1 − C)/2" value={fmt(tail, 4)} size="sm" live />
          <Readout label="cumulative · (1 + C)/2" value={fmt(cumulative, 4)} size="sm" live />
          <Readout label={`cutoff out · ${label}`} value={fmt(cut, 4)} tone="intel" live />
          {mode === 't' && <Readout label="t* − z*" value={fmt(tCut - zCut, 4)} tone={tCut - zCut > 0.05 ? 'alert' : 'intel'} size="sm" live />}
        </ReadoutGrid>

        <DensityCurve
          curves={curves}
          domain={DOMAIN}
          shade={shade}
          references={[
            { x: -cut, label: `−${label} ${fmt(-cut, 3)}`, color: 'rejected' },
            { x: cut, label: `${label} ${fmt(cut, 3)}`, color: 'rejected' },
          ]}
          xLabel={mode === 'z' ? 'standard deviations from the centre (z)' : 'standardized distance (t)'}
          height={230}
          ariaLabel={`Density curve with the central ${fmtPct(confidence, 0)} shaded and the cutoffs marked`}
          description={description}
        />

        <Note tone="muted" live>
          {mode === 'z' ? (
            <>
              The curve answers in both directions. Given a cutoff it returns an area; given an area it returns the cutoff, and the second is the inverse of the first. Ask for the central{' '}
              {fmtPct(confidence, 0)} and the machine solves Φ(z) = {fmt(cumulative, 4)} for z, which is {fmt(cut, 4)}. That is the whole of where 1.96 comes from — not a table, an inverse.
            </>
          ) : (
            <>
              Same inversion, heavier tails. With {fmt(df, 0)} degrees of freedom you have to go out to {fmt(tCut, 4)} to enclose {fmtPct(confidence, 0)}, against {fmt(zCut, 4)} on the
              normal — a difference of {fmt(tCut - zCut, 4)}, and it is the price of having estimated the spread from the sample instead of knowing it. Run df up and the gap closes: at df ={' '}
              {fmt(200, 0)} it is {fmt(t.quantile(cumulative, 200) - zCut, 4)}.
            </>
          )}
        </Note>
      </div>
    </Panel>
  )
}
