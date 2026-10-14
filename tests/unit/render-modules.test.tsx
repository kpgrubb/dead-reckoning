/**
 * Render every content module and assert nothing leaked.
 *
 * The gap this closes: `tsc`, `vite build` and the content lint all pass on modules that are broken
 * on screen. Four separate defect classes reached the reader that way — exports swallowed into a
 * markdown paragraph, `{fmt(...)}` inside `$…$` typeset as literal source, Markdown table rows
 * emitted from a JSX expression, and a KaTeX parse error from a term key in a superscript. Two Act
 * VIII teams each built a throwaway harness and each caught a further render-only defect, which is
 * the argument for having one permanently.
 *
 * This is a smoke test, not a content review: it renders each module and looks for the fingerprints
 * of a failed interpolation or a failed formula.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MDXProvider } from '@mdx-js/react'
import type { ComponentType } from 'react'
import { mdxComponents } from '@/components'
import { ModuleContext } from '@/components/ModuleContext'
import { modules, loadModule } from '@/content/registry'
import { fmt } from '@/lib/stats'
import type { ModuleMeta } from '@/content/schema'

/** Fingerprints of an expression that reached the DOM as text instead of being evaluated. */
const LEAKS: { label: string; re: RegExp }[] = [
  { label: 'unevaluated formatter call', re: /\bfmt(?:Int|Pct|P)?\s*\([^)]*\)/ },
  { label: 'unevaluated template placeholder', re: /\$\{/ },
  { label: 'raw Markdown table row', re: /\|\s*-{2,}\s*\|/ },
  { label: 'undefined in prose', re: /\bundefined\b/ },
  { label: 'NaN in prose', re: /\bNaN\b/ },
  // <Drill> degrades to a muted panel rather than throwing when it cannot find its generator, so a
  // module can ship with dead drills and nothing goes red. act-9/02 reached master with six.
  { label: 'unregistered drill generator', re: /is not registered/ },
]

/** A numeric beat seen during a render, with the precision it grades at. */
interface RecordedBeat {
  id: string
  answer: number
  digits: number
}

/**
 * Wrap <MissionBeat> so a render reports which numeric answers the module asks the learner to
 * produce. The component still renders normally; this only observes.
 *
 * Only beats that declare `digits` are recorded, because the display precision is what makes a
 * figure on the page the *answer* rather than a neighbouring quantity. That leaves beats which let
 * `answerKind` supply the precision outside the net; inferring it from the tolerance policy in
 * `src/lib/problems/grade.ts` is the obvious next widening, and it will find more.
 */
function recordingComponents(sink: RecordedBeat[]) {
  const Real = mdxComponents.MissionBeat as ComponentType<Record<string, unknown>>
  function Recording(props: Record<string, unknown>) {
    if (props.kind === 'numeric' && typeof props.answer === 'number' && typeof props.digits === 'number') {
      sink.push({ id: String(props.id), answer: props.answer, digits: props.digits })
    }
    return <Real {...props} />
  }
  return { ...mdxComponents, MissionBeat: Recording }
}

function renderModule(meta: ModuleMeta, Body: ComponentType, sink: RecordedBeat[] = []) {
  return render(
    <MemoryRouter>
      <ModuleContext.Provider value={{ meta, registerBeat: () => {} }}>
        <MDXProvider components={recordingComponents(sink)}>
          <Body />
        </MDXProvider>
      </ModuleContext.Provider>
    </MemoryRouter>,
  )
}

/**
 * Leaks the Phase 4 audit judged acceptable, each with the reason. A entry here is a decision, not
 * an exemption to be added when the test goes red — removing the display would cost more teaching
 * than the leak costs assessment. Keyed `moduleId:beatId`.
 *
 * Every entry below is a beat whose answer is a figure the module's own instrument exists to draw.
 * The remedies that cleared the other two dozen — open the instrument somewhere the beat does not
 * ask for, state a comparison in percentage points rather than four decimals, move the display
 * below the gate — all fail here, because what leaks is not a default or a convenience but the
 * thing the display is for. The test is still doing its job on these: if an instrument stops
 * showing one of them, the entry becomes dead and should be deleted.
 */
const ACCEPTED_LEAKS: Record<string, string> = {
  // `act-8-02:act-8-02-p` and `act-4-02:act-4-02-detects` were here and have been deleted. Neither
  // beat declares `digits`, so the sweep never evaluated either one, and act-4/02's panel has since
  // been opened on a round rate anyway. An entry the net cannot act on is not a decision; it reads
  // like one, which is worse. Beats without `digits` are outside this net — see the note on the
  // recorder.
  'act-6-06:act-6-06-power-05': 'The module is the power curve. Power at the named alternative is a marked point on it, in the legend, in the curve\'s data table and in the alpha comparator; a curve a learner cannot read is not a power curve.',
  'act-7-03:act-7-03-se': 'OSTROW_SE is the horizontal scale of both curves in the pooling explorer and the divisor behind the rejection cutoff; the panel cannot describe either distribution without printing it, and the beat\'s own hint says the panel reports it.',
  'act-7-04:act-7-04-dbar': 'The explorer\'s point is that d̄ is the same number paired or unpaired and only the standard error moves. Withholding the mean in either reading removes the comparison the module is built on.',
  'act-7-06:act-7-06-statistic': 'The side-by-side table — one estimate, one standard error, two questions — is the module\'s subject, and t is one of its six rows.',
  'act-8-01:act-8-01-expected': 'The expected column is what a goodness-of-fit display displays. The statistic beat downstream also needs the column stated as its own input.',
  'act-8-02:act-8-02-picket': 'A probability tree\'s leaves are the products along its paths. The beat asks for the leaf the tree is drawn to show.',
  'act-8-03:act-8-03-expected': 'The answer is the smallest expected count, which is exactly what the Large Counts condition line names. A two-way panel that will not state its conditions is not an AP display.',
  'act-9-01:act-9-01-spread': 'SD(b) across the standard run is the one number the sampling-distribution simulator exists to produce, and the yardstick the next beat reads SE(b) against.',
  'act-9-01:act-9-01-se': 'SE Coef is a column of every regression printout and the beat says to read it off the output table. Removing it would make <RegressionOutputPanel> something no statistics package prints.',
  'act-9-03:act-9-03-t': 'Likewise the T column, and this module teaches that the printed T is a two-sided test against zero — the lesson needs the printed value in front of the learner.',
}

/**
 * The accepted entries the sweep actually saw leak. Anything in ACCEPTED_LEAKS that is not in here
 * by the end of the sweep is a dismissal nobody is paying for any more, and the last test deletes
 * the excuse by going red: an accepted list is only honest while every line in it is still true.
 */
const confirmedAccepted = new Set<string>()

/** Every number in a run of text, with its sign, its value and how many decimals it was printed to. */
const NUMBER = /[−-]?\d[\d,]*(?:\.\d+)?/g

function numbersIn(text: string): { value: number; decimals: number }[] {
  const out: { value: number; decimals: number }[] = []
  for (const m of text.matchAll(NUMBER)) {
    const value = Number(m[0].replace(/,/g, '').replace('−', '-'))
    if (!Number.isFinite(value)) continue
    const dot = m[0].indexOf('.')
    out.push({ value, decimals: dot < 0 ? 0 : m[0].length - dot - 1 })
  }
  return out
}

/**
 * The page as the learner reads it, minus the drills.
 *
 * A `<Drill>` is a seeded generator run: its parameters are drawn by `src/lib/rng.ts` and owe
 * nothing to the module's dataset, so a drill figure that matches a beat's answer is a collision,
 * not a leak — and an unstable one, since retuning a generator would move it. Two of the sweep's
 * original hits were exactly that (act-5/04's `p = 0.0104`, act-9/02's `(1.0530, 1.0713)`), each a
 * different quantity that happened to round the same way. Everything the module itself writes —
 * scenes, Briefing, Calculator, every instrument, and the beat prompts — stays in the net.
 */
function legibleText(container: HTMLElement): string {
  const copy = container.cloneNode(true) as HTMLElement
  for (const drill of Array.from(copy.querySelectorAll('.dr-drill'))) drill.remove()
  return (copy.textContent ?? '').replace(/\s+/g, ' ')
}

/**
 * Modules that cannot render yet because their Act is unfinished. Each entry is debt, not an
 * exemption: delete it when the Act is completed, and the module joins the sweep. Empty is the
 * correct state; add to it only with an Act that is mid-build, and say why.
 */
const UNFINISHED = new Set<string>()

describe('every content module renders', () => {
  it('has modules to render', () => {
    expect(modules.length).toBeGreaterThan(0)
  })

  for (const meta of modules.filter((m) => !UNFINISHED.has(m.id))) {
    it(`${meta.id} renders without throwing or leaking`, async () => {
      // React logs render errors rather than always throwing; treat any of them as a failure.
      const errors: string[] = []
      const spy = vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void errors.push(String(a[0])))
      try {
        const mod = await loadModule(meta)
        const beats: RecordedBeat[] = []
        const { container } = renderModule(meta, mod.default as ComponentType, beats)

        const text = (container.textContent ?? '').replace(/\s+/g, ' ')
        for (const { label, re } of LEAKS) {
          const hit = re.exec(text)
          expect(hit ? `${label}: "${hit[0]}"` : null, `${meta.id} (${meta.path}) — ${label}`).toBeNull()
        }

        /**
         * No numeric beat's answer may be legible before it is answered. Nothing is answered in
         * this render, so <Gated> blocks and Success/Failure children are absent and the DOM is
         * exactly what the learner sees while working. The Phase 4 audit found this in six modules
         * including act-4/09, whose own comment claimed its numbers appeared nowhere before the gate.
         *
         * A number on the page is the answer when it is printed to at least the precision the beat
         * grades at and rounds, at that precision, to the same signed value. Matching values rather
         * than the formatted substring is both stricter and looser than a string search, on purpose:
         *
         *  - Looser, because "2.69" inside the residual 2.69735 is a different quantity (it rounds
         *    to 2.70), and "1250" inside 21250.7 is not a number on the page at all. Four of the
         *    sweep's first hits were that shape — act-2/04, act-2/06, act-7/03's −0.25357 and
         *    act-7/04's 61.86 — and every one of them was a substring, never a display of the
         *    answer. Requiring the printed decimals to reach the graded precision is what drops
         *    them, and it is the same rule that lets a coarser display stand: a lane interval
         *    quoted to a tenth of a percentage point is not a four-decimal proportion.
         *  - Stricter, because a display at *finer* precision hands the answer over just as
         *    completely. The string search missed act-7/03's SE printed as 0.1107, act-7/05's
         *    0.4086 and act-9/01's 0.04381; the value comparison catches them.
         *
         * An answer whose rounded form carries fewer than three digits is skipped: at that
         * precision agreement is not evidence.
         */
        const answerText = numbersIn(legibleText(container))
        for (const beat of beats) {
          const shown = fmt(beat.answer, beat.digits)
          if (shown.replace(/[^0-9]/g, '').length < 3) continue
          const key = `${meta.id}:${beat.id}`
          const leaked = answerText.find((n) => n.decimals >= beat.digits && fmt(n.value, beat.digits) === shown)
          if (ACCEPTED_LEAKS[key]) {
            if (leaked) confirmedAccepted.add(key)
            continue
          }
          expect(leaked ? `"${shown}" is on the page before ${beat.id} is answered` : null, `${meta.id} (${meta.path}) — gated answer leak`).toBeNull()
        }
        // KaTeX renders a .katex-error span rather than throwing when a formula will not parse.
        expect(container.querySelectorAll('.katex-error').length, `${meta.id}: KaTeX parse error`).toBe(0)
        expect(errors.join(' | ').slice(0, 400), `${meta.id}: console errors during render`).toBe('')
      } finally {
        spy.mockRestore()
        cleanup()
      }
    })
  }

  // Runs last, after every module above has been swept.
  it('every accepted leak is still a leak', () => {
    const dead = Object.keys(ACCEPTED_LEAKS).filter((k) => !confirmedAccepted.has(k))
    expect(dead, 'ACCEPTED_LEAKS entries whose answer no longer reaches the page — delete them').toEqual([])
  })
})
