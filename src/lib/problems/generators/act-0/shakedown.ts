/**
 * Prologue drill: reference generator demonstrating the framework. Reads a small log of
 * dead-reckoning position fixes and asks for the mean error. Numbers come from @/lib/stats.
 */
import type { ProblemGenerator } from '@/lib/problems/types'
import { retry } from '@/lib/problems/generate'
import { mean, median } from '@/lib/stats/descriptive'
import { fmt } from '@/lib/stats/format'

export const shakedownFixError: ProblemGenerator = {
  id: 'act-0/fix-error-mean',
  label: 'Dead-reckoning fix error',
  ap_topics: ['1.7'],
  skills: ['2'],
  generate(rng) {
    const { errs } = retry(
      rng,
      (r) => {
        const n = r.int(5, 7)
        const errs = Array.from({ length: n }, () => Math.round(r.normal(12, 4) * 10) / 10)
        return { errs }
      },
      // Reject draws with negative "errors" (magnitudes) or ties that make the median ambiguous to read.
      ({ errs }) => errs.every((e) => e > 0) && new Set(errs).size === errs.length,
    )
    const m = mean(errs)
    const med = median(errs)
    const ask = rng.bool(0.6) ? 'mean' : 'median'
    const value = ask === 'mean' ? m : med
    return {
      prompt: `During the shakedown run the navigation officer logged the position error (km) of ${errs.length} consecutive dead-reckoning fixes against the beacon solution:\n\n${errs.map((e) => fmt(e, 1)).join(', ')}\n\nReport the **${ask}** fix error to one decimal place.`,
      answer: { type: 'numeric', value, tolerance: 0.05, units: 'km', digits: 1 },
      hints: [
        ask === 'mean' ? 'The mean is the sum divided by the count.' : 'Sort the values first. The median is the middle value (or the mean of the two middle values).',
        ask === 'mean' ? `Sum = ${fmt(errs.reduce((a, b) => a + b, 0), 1)}; divide by ${errs.length}.` : `Sorted: ${errs.slice().sort((a, b) => a - b).map((e) => fmt(e, 1)).join(', ')}.`,
      ],
      solution:
        ask === 'mean'
          ? `$\\bar{x} = \\dfrac{${errs.map((e) => fmt(e, 1)).join(' + ')}}{${errs.length}} = \\dfrac{${fmt(errs.reduce((a, b) => a + b, 0), 1)}}{${errs.length}} = ${fmt(m, 2)}$, so the mean fix error is **${fmt(m, 1)} km**.`
          : `Sorted: ${errs.slice().sort((a, b) => a - b).map((e) => fmt(e, 1)).join(', ')}. With $n = ${errs.length}$ the median is ${errs.length % 2 ? 'the middle value' : 'the mean of the two middle values'}: **${fmt(med, 1)} km**.`,
      misconception: ask === 'median' ? 'A common slip is to take the middle of the *unsorted* list. Sort first.' : undefined,
    }
  },
}
