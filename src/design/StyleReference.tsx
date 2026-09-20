/**
 * /style — the visual design system reference. Every token, panel tone, button, field, chart
 * primitive, dialogue speaker and icon, with both themes side by side and live contrast checks.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { Dialogue } from '@/components/Dialogue'
import { Plot } from '@/components/Plot'
import { CREW } from '@/content/crew'
import { Histogram, Dotplot, Boxplot, Scatter, DensityCurve, BarChart, Slider, NumberField, Segmented, Readout, ReadoutRow, Legend, seriesColor, semanticColor, type ScatterPoint } from '@/instruments/shared'
import { allIcons, IconAlert, IconComplete, IconPlay, IconReset, IconSensor, IconShip, IconStep } from './icons'
import './style-reference.css'

/* ---------- helpers ---------- */

function relLum(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function parseRgb(s: string): [number, number, number] | null {
  const m = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  const h = s.match(/^#([0-9a-f]{6})$/i)
  if (h) return [parseInt(h[1].slice(0, 2), 16), parseInt(h[1].slice(2, 4), 16), parseInt(h[1].slice(4, 6), 16)]
  return null
}
function contrast(a: string, b: string): number | null {
  const ra = parseRgb(a)
  const rb = parseRgb(b)
  if (!ra || !rb) return null
  const [hi, lo] = [relLum(ra), relLum(rb)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
function rgbToHex(s: string): string {
  const p = parseRgb(s)
  if (!p) return s
  return '#' + p.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')
}

/** Reads computed token values from a probe element so nested theme samples resolve correctly. */
function useTokens(names: readonly string[], deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [vals, setVals] = useState<Record<string, string>>({})
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const cs = getComputedStyle(el)
      const out: Record<string, string> = {}
      for (const n of names) {
        // Resolve through a probe: set color to the var and read the computed rgb.
        el.style.color = `var(${n})`
        out[n] = rgbToHex(getComputedStyle(el).color)
      }
      el.style.color = ''
      out['--dr-bg-0'] = rgbToHex(cs.getPropertyValue('--dr-bg-0').trim())
      setVals(out)
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { ref, vals }
}

const SURFACES = ['--dr-bg-0', '--dr-bg-1', '--dr-bg-2', '--dr-bg-3', '--dr-line', '--dr-line-strong', '--dr-line-rail']
const TEXT = ['--dr-fg-0', '--dr-fg-1', '--dr-fg-2']
const ACCENTS = ['--dr-phosphor', '--dr-cyan', '--dr-amber', '--dr-alert', '--dr-violet', '--dr-steel']
const DIM = ['--dr-phosphor-dim', '--dr-cyan-dim', '--dr-amber-dim', '--dr-alert-dim', '--dr-violet-dim', '--dr-steel-dim']
const SERIES = ['--dr-series-1', '--dr-series-2', '--dr-series-3', '--dr-series-4', '--dr-series-5', '--dr-series-alert']
const CHART = ['--dr-chart-grid', '--dr-chart-axis', '--dr-chart-null', '--dr-chart-alt', '--dr-chart-rejected', '--dr-chart-fit', '--dr-chart-residual', '--dr-chart-reference', '--dr-chart-observed']
const TONES: PanelTone[] = ['default', 'tactical', 'sensor', 'engineering', 'intel', 'log', 'alert']

/* ---------- sample data (deterministic) ---------- */
function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}
function gauss(rnd: () => number) {
  const u = Math.max(1e-12, rnd())
  const v = rnd()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
const rnd = lcg(0x3f2a)
const fixes = [11.2, 14.8, 9.6, 13.1, 12.4, 15.9, 12.9, 13.6, 10.8, 14.1, 12.2, 11.7, 22.4]
const sim = Array.from({ length: 5000 }, () => 12.5 + 2.5 * gauss(rnd))
const scatterBase: ScatterPoint[] = Array.from({ length: 24 }, (_, i) => {
  const x = 40 + i * 6 + rnd() * 4
  return { x: Number(x.toFixed(1)), y: Number((0.62 * x + 8 + gauss(rnd) * 6).toFixed(1)) }
})
const normalPdf = (mu: number, sd: number) => (x: number) => Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))
const tPdf3 = (x: number) => 0.3676 * (1 + (x * x) / 3) ** -2 // t with 3 df (constant precomputed for display only)

/* ---------- sections ---------- */

function Swatches({ title, names, tokens, bg }: { title: string; names: string[]; tokens: Record<string, string>; bg: string }) {
  return (
    <div className="dr-sr__group">
      <h3 className="dr-sr__h3">{title}</h3>
      <ul className="dr-sr__swatches">
        {names.map((n) => {
          const hex = tokens[n]
          const c = hex && bg ? contrast(hex, bg) : null
          const isText = TEXT.includes(n) || ACCENTS.includes(n)
          return (
            <li key={n} className="dr-sr__swatch">
              <span className="dr-sr__chip" style={{ background: `var(${n})` }} />
              <code className="dr-sr__token">{n}</code>
              <span className="dr-sr__hex">{hex ?? '…'}</span>
              {c !== null && (
                <span className={`dr-sr__contrast ${isText ? (c >= 4.5 ? 'is-pass' : 'is-fail') : c >= 3 ? 'is-pass' : 'is-dim'}`} title="Contrast against --dr-bg-0">
                  {c.toFixed(1)}:1{isText && c >= 7 ? ' AAA' : isText && c >= 4.5 ? ' AA' : ''}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PaletteSection({ theme }: { theme: 'default' | 'high-contrast' }) {
  const all = [...SURFACES, ...TEXT, ...ACCENTS, ...DIM, ...SERIES, ...CHART]
  const { ref, vals } = useTokens(all, [theme])
  const bg = vals['--dr-bg-0'] ?? ''
  return (
    <div className="dr-sr__theme" data-theme={theme}>
      <div ref={ref} className="dr-sr__probe" aria-hidden="true" />
      <div className="dr-sr__theme-head">
        <span className="dr-label">{theme === 'default' ? 'BRIDGE (DEFAULT)' : 'HIGH CONTRAST'}</span>
        <span className="dr-sr__hex">bg-0 {bg}</span>
      </div>
      <Swatches title="Surfaces" names={SURFACES} tokens={vals} bg={bg} />
      <Swatches title="Text" names={TEXT} tokens={vals} bg={bg} />
      <Swatches title="Readout accents (text-safe)" names={ACCENTS} tokens={vals} bg={bg} />
      <Swatches title="Dim accents (rails, borders)" names={DIM} tokens={vals} bg={bg} />
      <Swatches title="Chart mark series (validated)" names={SERIES} tokens={vals} bg={bg} />
      <Swatches title="Chart semantics" names={CHART} tokens={vals} bg={bg} />
    </div>
  )
}

function TypeSection() {
  return (
    <div className="dr-sr__grid2">
      <div>
        <h3 className="dr-sr__h3">Faces</h3>
        <p className="dr-sr__prose">Plex Serif carries the narrative. The corvette answers the helm like something that has been waiting a long time to be let out.</p>
        <p className="dr-sr__ui">Plex Sans carries the briefing. A range hides where most of the values sit; the first thing you want from a handful of numbers is a single number that stands for all of them.</p>
        <p className="dr-sr__mono">Plex Mono carries the readout. MET 014:22:07 · SEED 0x3F2A · x̄ = 13.02 km · σ = 2.51</p>
        <p className="dr-sr__mono">
          <em>Italic mono for asides</em> · <strong>600 for emphasis</strong>
        </p>
      </div>
      <div>
        <h3 className="dr-sr__h3">Scale (× --dr-text-scale)</h3>
        <ul className="dr-sr__type">
          {(['3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs', '2xs'] as const).map((s) => (
            <li key={s} style={{ fontSize: `var(--dr-fs-${s})` }}>
              <code className="dr-sr__token">--dr-fs-{s}</code> Dead reckoning
            </li>
          ))}
        </ul>
        <h3 className="dr-sr__h3">Spacing</h3>
        <ul className="dr-sr__space">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <li key={n}>
              <span className="dr-sr__space-bar" style={{ width: `var(--dr-sp-${n})` }} />
              <code className="dr-sr__token">--dr-sp-{n}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PanelsSection() {
  return (
    <div className="dr-sr__panels">
      {TONES.map((t) => (
        <Panel key={t} tone={t} label={`${t.toUpperCase()} · SAMPLE`} status="STATUS" led={t === 'alert' ? 'alert' : t === 'engineering' ? 'warn' : 'on'}>
          <p className="dr-sr__ui" style={{ margin: 0 }}>
            Tone <code>{t}</code>: {toneMeaning[t]}
          </p>
        </Panel>
      ))}
      <Panel tone="tactical" label="LED STATES" status="ON · BUSY · WARN · ALERT · OFF">
        <div className="dr-sr__leds">
          {(['on', 'busy', 'warn', 'alert', 'off'] as const).map((s) => (
            <span key={s} className="dr-sr__led-demo">
              <span className={`dr-led dr-led--${s}`} /> <code>{s}</code>
            </span>
          ))}
        </div>
      </Panel>
    </div>
  )
}
const toneMeaning: Record<PanelTone, string> = {
  default: 'neutral frame for prose and settings.',
  tactical: 'phosphor — the tactical plot, mission calls, simulations.',
  sensor: 'cyan — sensor arrays, data displays, plots.',
  engineering: 'amber — heat budgets, calc refreshers, caution.',
  intel: 'violet — briefings, drills, the intelligence terminal.',
  log: "steel — the ship's log, neutral reference.",
  alert: 'red — unresolved mission calls, hostile contacts, rejected nulls.',
}

function ControlsSection() {
  const [v, setV] = useState(25)
  const [n, setN] = useState(30)
  const [seg, setSeg] = useState<'srs' | 'strat' | 'cluster'>('srs')
  const [text, setText] = useState('')
  return (
    <div className="dr-sr__grid2">
      <div>
        <h3 className="dr-sr__h3">Buttons</h3>
        <div className="dr-sr__row">
          <button type="button" className="dr-btn dr-btn--primary">
            <IconPlay size={14} /> RUN
          </button>
          <button type="button" className="dr-btn">
            <IconStep size={14} /> STEP
          </button>
          <button type="button" className="dr-btn dr-btn--ghost">
            <IconReset size={14} /> RESET · NEW SEED
          </button>
          <button type="button" className="dr-btn dr-btn--danger">
            <IconAlert size={14} /> ABORT
          </button>
          <button type="button" className="dr-btn" disabled>
            DISABLED
          </button>
        </div>
        <h3 className="dr-sr__h3">Fields</h3>
        <label className="dr-field">
          <span className="dr-field__label">Answer (km)</span>
          <input className="dr-input dr-input--mono" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} placeholder="13.0" />
        </label>
        <label className="dr-field">
          <span className="dr-field__label">Conclusion in context</span>
          <textarea className="dr-input" rows={3} placeholder="Because the p-value is…" />
        </label>
        <fieldset className="dr-choices">
          <legend className="dr-field__label">Choice</legend>
          <label className="dr-choice">
            <input type="radio" name="sr-choice" defaultChecked /> <span>The mean is pulled toward the outlier.</span>
          </label>
          <label className="dr-choice">
            <input type="radio" name="sr-choice" /> <span>The median is pulled toward the outlier.</span>
          </label>
        </fieldset>
        <h3 className="dr-sr__h3">Feedback states</h3>
        <div className="dr-drill__result is-correct" role="status">
          <strong>CONFIRMED</strong> — within tolerance.
        </div>
        <div className="dr-drill__result is-wrong" role="status">
          <strong>REJECTED</strong> — check the divisor: n − 1, not n.
        </div>
        <div className="dr-gated">
          <span className="dr-gated__tag">SEALED</span> Resolve the mission call above to continue.
        </div>
      </div>
      <div>
        <h3 className="dr-sr__h3">Instrument controls</h3>
        <div className="dr-controls">
          <Slider label="Sample size" value={v} min={2} max={200} onChange={setV} units="n" />
          <NumberField label="Threshold" value={n} min={0} max={100} step={5} onChange={setN} units="MW" />
          <Segmented label="Sampling method" value={seg} onChange={setSeg} options={[{ value: 'srs', label: 'SRS' }, { value: 'strat', label: 'Stratified' }, { value: 'cluster', label: 'Cluster' }]} />
        </div>
        <h3 className="dr-sr__h3">Readouts</h3>
        <ReadoutRow>
          <Readout label="mean" value="13.02" units="km" tone="tactical" />
          <Readout label="sd" value="2.51" units="km" tone="sensor" />
          <Readout label="heat sink" value="71" units="%" tone="engineering" />
          <Readout label="p-value" value="0.0031" tone="alert" />
          <Readout label="n" value="—" stale />
          <Readout label="hero" value="0.952" size="lg" tone="tactical" />
        </ReadoutRow>
        <h3 className="dr-sr__h3">Legend</h3>
        <Legend items={[{ label: 'observed', color: seriesColor(0) }, { label: 'null model', color: semanticColor('null'), shape: 'dashed' }, { label: 'alternative', color: semanticColor('alt'), shape: 'line' }, { label: 'rejection region', color: semanticColor('shadeRejected'), shape: 'area' }, { label: 'fit', color: semanticColor('fit'), shape: 'line' }, { label: 'outlier', color: semanticColor('rejected'), shape: 'dot' }]} />
      </div>
    </div>
  )
}

function ChartsSection() {
  const [pts, setPts] = useState(scatterBase)
  const [vals, setVals] = useState(fixes)
  return (
    <div className="dr-sr__charts">
      <Panel tone="sensor" label="HISTOGRAM · 5,000 SIMULATED MEANS" status="BINNED · NORMAL OVERLAY" led="on">
        <Histogram values={sim} density curve={normalPdf(12.5, 2.5)} curveLabel="N(12.5, 2.5)" label="mean fix error (km)" references={[{ x: 16.2, label: 'observed 16.2' }]} highlight={{ from: 16.2, to: 30, label: 'rejection region' }} barsLabel="simulated means" ariaLabel="Histogram of 5,000 simulated mean fix errors with a normal curve overlay; values above 16.2 highlighted as the rejection region." />
      </Panel>
      <Panel tone="tactical" label="DOTPLOT · DRAG THE DOTS" status={`n = ${vals.length}`} led="on">
        <Dotplot values={vals} onValuesChange={setVals} step={0.1} label="fix error (km)" highlight={[12]} references={[{ x: vals.reduce((a, b) => a + b, 0) / vals.length, label: 'mean', color: 'reference' }]} ariaLabel="Editable dotplot of fix errors; one outlier highlighted; mean shown as a reference line." showTable />
      </Panel>
      <Panel tone="intel" label="BOXPLOT · TWO CORRIDORS" status="1.5×IQR · OUTLIERS" led="on">
        <Boxplot groups={[{ name: 'Corridor A', values: fixes }, { name: 'Corridor B', values: [8.1, 9.4, 9.9, 10.2, 10.8, 11.3, 11.9, 12.4, 13.0, 14.7] }]} label="fix error (km)" showFences ariaLabel="Side-by-side boxplots of fix errors for two corridors, with fences and an outlier in corridor A." />
      </Panel>
      <Panel tone="sensor" label="SCATTER · DRAG A POINT, WATCH THE FIT" status="LEAST SQUARES · RESIDUALS" led="on">
        <Scatter points={pts} onPointsChange={setPts} fitLine residuals xLabel="declared cargo mass (t)" yLabel="fuel burn (kg)" ariaLabel="Scatterplot of fuel burn against declared cargo mass with a least-squares line and residual segments; points are draggable." />
      </Panel>
      <Panel tone="engineering" label="DENSITY · NULL VS ALTERNATIVE" status="SHADED TAILS" led="warn">
        <DensityCurve curves={[{ pdf: normalPdf(0, 1), label: 'null N(0,1)', color: 'null', dashed: true }, { pdf: normalPdf(1.6, 1), label: 'alternative', color: 'alt' }]} domain={[-4, 5.5]} shade={[{ from: 1.96, to: 5.5, color: 'shadeRejected', label: 'α' }, { from: -4, to: 1.96, curve: 1, color: 'shadeAlt', label: 'β' }]} references={[{ x: 1.96, label: 'z* = 1.96' }]} xLabel="z" ariaLabel="Null and alternative normal curves; the rejection region above z = 1.96 is shaded red, the Type II region under the alternative shaded cyan." />
      </Panel>
      <Panel tone="tactical" label="DENSITY · t(3) VS NORMAL" status="HEAVY TAILS" led="on">
        <DensityCurve curves={[{ pdf: normalPdf(0, 1), label: 'normal', color: 'null', dashed: true }, { pdf: tPdf3, label: 't, df = 3', color: 'fit' }]} domain={[-4, 4]} shade={[{ from: -1, to: 1, curve: 1, label: '−1 to 1' }]} xLabel="t" ariaLabel="A t distribution with 3 degrees of freedom compared with the standard normal; the interval from minus one to one is shaded." />
      </Panel>
      <Panel tone="intel" label="BAR · CARGO CATEGORY" status="OBSERVED VS EXPECTED" led="on">
        <BarChart categories={['ore', 'volatiles', 'machinery', 'medical', 'other']} values={[41, 28, 17, 9, 5]} expected={[35, 30, 20, 10, 5]} highlight={[0]} label="cargo category" ariaLabel="Bar chart of observed cargo counts by category with expected counts marked; the ore category is highlighted." />
      </Panel>
      <Panel tone="log" label="BAR · HORIZONTAL" status="LONG LABELS" led="on">
        <BarChart horizontal categories={['Callisto departure corridor', 'Ganymede inner ring', 'Belt transfer window', 'Ceres approach']} values={[12, 7, 19, 4]} valueLabel="losses" ariaLabel="Horizontal bar chart of ship losses by corridor." />
      </Panel>
      <h3 className="dr-sr__h3 dr-sr__span">&lt;Plot spec=…&gt; — every DisplaySpec kind</h3>
      <Plot spec={{ kind: 'normal', mean: 100, sd: 15, shade: { from: 85, to: 115 } }} description="Normal model with mean 100 and standard deviation 15; the interval from 85 to 115 is shaded." />
      <Plot spec={{ kind: 'residual', points: scatterBase.map((p) => ({ x: p.x, resid: Number((p.y - (0.62 * p.x + 8)).toFixed(2)) })), xLabel: 'declared cargo mass (t)' }} description="Residual plot against declared cargo mass." tone="engineering" />
      <Plot spec={{ kind: 'table', columns: ['ship', 'declared (t)', 'burn (kg)', 'residual'], rows: [['Harrow', 142, 96.1, -3.2], ['Kestrel', 210, 141.8, 4.9], ['Tamsin', 88, 60.2, -1.1]] }} description="Table of three ships with declared mass, fuel burn and residual." showTable />
      <Plot spec={{ kind: 'bar', categories: ['A', 'B', 'C'], counts: [12, 30, 8], label: 'class' }} description="Bar chart of three classes." tone="intel" />
    </div>
  )
}

function DialogueSection() {
  return (
    <div className="dr-sr__dialogue">
      {Object.values(CREW).map((c) => (
        <Dialogue key={c.id} speaker={c.id} aside={c.role}>
          {c.voice}
        </Dialogue>
      ))}
    </div>
  )
}

function IconsSection() {
  return (
    <ul className="dr-sr__icons">
      {Object.entries(allIcons).map(([name, C]) => (
        <li key={name}>
          <C size={22} />
          <code className="dr-sr__token">{name.replace(/^Icon/, '')}</code>
        </li>
      ))}
    </ul>
  )
}

function ThemeSample({ theme }: { theme: 'default' | 'high-contrast' }) {
  return (
    <div className="dr-sr__theme dr-sr__theme--sample" data-theme={theme}>
      <div className="dr-sr__theme-head">
        <span className="dr-label">{theme === 'default' ? 'BRIDGE (DEFAULT)' : 'HIGH CONTRAST'}</span>
      </div>
      <Panel tone="sensor" label="SENSOR ARRAY · FIX ERROR" status="SEED 0x3F2A" led="on" icon={<IconSensor size={14} />}>
        <Dotplot values={fixes} label="fix error (km)" highlight={[12]} height={150} ariaLabel="Dotplot sample in this theme." />
        <ReadoutRow>
          <Readout label="mean" value="13.02" units="km" tone="tactical" size="sm" />
          <Readout label="outliers" value="1" tone="alert" size="sm" />
        </ReadoutRow>
        <div className="dr-sr__row">
          <button type="button" className="dr-btn dr-btn--primary">
            COMMIT
          </button>
          <button type="button" className="dr-btn">
            HINT 1/3
          </button>
        </div>
      </Panel>
      <Dialogue speaker="xo" aside="Not looking up from the plot.">
        Six fixes since departure, Commander. Errors between about ten and sixteen kilometers.
      </Dialogue>
      <Panel tone="alert" label="MISSION · YOUR CALL" status="ATTEMPTS 1" led="alert" icon={<IconAlert size={14} />}>
        <div className="dr-beat__debrief">
          <div className="dr-beat__debrief-tag">DEBRIEF — outside tolerance</div>
          <p style={{ margin: 0 }}>Six values. Add them, divide by six.</p>
        </div>
      </Panel>
    </div>
  )
}

/* ---------- page ---------- */

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} className="dr-sr__section" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="dr-sr__h2">
        <span className="dr-sr__h2-code">{id.toUpperCase()}</span> {title}
      </h2>
      {intro && <p className="dr-sr__intro">{intro}</p>}
      {children}
    </section>
  )
}

export function StyleReference() {
  const nav = useMemo(
    () => [
      ['palette', 'Palette'],
      ['type', 'Type'],
      ['panels', 'Panels'],
      ['controls', 'Controls'],
      ['charts', 'Charts'],
      ['dialogue', 'Dialogue'],
      ['icons', 'Icons'],
      ['themes', 'Themes'],
    ],
    [],
  )
  return (
    <div className="dr-sr">
      <header className="dr-sr__hero">
        <div className="dr-sr__hero-mark">
          <IconShip size={40} />
        </div>
        <div>
          <h1 className="dr-map__title">Style Reference</h1>
          <p className="dr-map__meta">Bridge instruments · light-on-dark · accents mean something · every colour via a token</p>
        </div>
        <nav className="dr-sr__nav" aria-label="Sections">
          {nav.map(([id, t]) => (
            <a key={id} href={`#/style#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ block: 'start' }) }}>
              {t}
            </a>
          ))}
        </nav>
      </header>

      <Section id="palette" title="Palette & contrast" intro="Readout accents are text-safe (≥ 4.5:1 on the void). Mark series are mid-lightness fills validated for colour-vision separation; text never wears a series colour. Contrast ratios are computed live from the rendered tokens.">
        <div className="dr-sr__themes">
          <PaletteSection theme="default" />
          <PaletteSection theme="high-contrast" />
        </div>
      </Section>

      <Section id="type" title="Typography & spacing" intro="Plex Serif for narrative prose, Plex Sans for UI and briefings, Plex Mono for readouts, labels and the log. The scale multiplies --dr-text-scale (learner text-size setting); chart type is fixed instrument type and does not scale.">
        <TypeSection />
      </Section>

      <Section id="panels" title="Panels & LEDs" intro="Every instrument, briefing and card sits in a Panel: corner brackets, a tone rail on the left, a mono caps label with an optional LED, and a status readout on the right.">
        <PanelsSection />
      </Section>

      <Section id="controls" title="Buttons, fields, instrument controls, readouts" intro="Primary = phosphor (confirm/run). Danger = red, reserved. Instrument controls carry a label and a live value readout and are fully keyboard-operable.">
        <ControlsSection />
      </Section>

      <Section id="charts" title="Chart primitives" intro="src/instruments/shared — Histogram, Dotplot, Boxplot, Scatter, DensityCurve, BarChart. Each renders a hidden data table, honours the motion tokens, and switches to canvas above 2,000 points. Drag the dots and the scatter points.">
        <ChartsSection />
      </Section>

      <Section id="dialogue" title="Dialogue speakers" intro="Speaker accent comes from src/content/crew.ts. Prose is Plex Serif; the speaker tag is mono caps in the accent.">
        <DialogueSection />
      </Section>

      <Section id="icons" title="Iconography" intro="Original 1.5px line icons on a 24-unit grid, currentColor. Decorative by default; pass `title` for an accessible name.">
        <IconsSection />
      </Section>

      <Section id="themes" title="Themes side by side" intro="High contrast is the same product with ≥ 7:1 body text, solid borders, brighter accents and no texture. Switch the whole app in Settings.">
        <div className="dr-sr__themes">
          <ThemeSample theme="default" />
          <ThemeSample theme="high-contrast" />
        </div>
        <p className="dr-sr__intro">
          <IconComplete size={14} /> Focus rings: tab through any control above — a two-tone ring (surface + focus colour) is visible on every surface in both themes.
        </p>
      </Section>
    </div>
  )
}

export default StyleReference
