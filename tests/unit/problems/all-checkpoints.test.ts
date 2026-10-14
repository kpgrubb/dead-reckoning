/**
 * Sweep every registered checkpoint, the way `all-generators.test.ts` sweeps every generator.
 *
 * The gap this closes: `checkpoints.test.ts` exercises the runner against a hand-built fixture, so
 * nothing ever looked at the ten specs that actually ship. `validateCheckpointSpec` already knows
 * how to catch an item naming an unwritten generator — it just had no caller. Act VI's checkpoint
 * reached master naming four generators that did not exist, and the only symptom was a throw at
 * render, which is why `act-6-checkpoint` sat in the render test's UNFINISHED set for weeks.
 *
 * Building over several attempts matters as much as validating: a spec can validate and still
 * throw on attempt 2 if a generator rejects the draw its seed produces.
 */
import { describe, expect, it } from 'vitest'
import { allCheckpoints, buildCheckpointProblems, scoreCheckpoint, validateCheckpointSpec } from '@/lib/problems/checkpoints'
import type { Response } from '@/lib/problems/types'

/** The model answer for each item, in the shape the grader expects. Mirrors checkpoints.test.ts. */
function correctResponses(problems: ReturnType<typeof buildCheckpointProblems>): Record<string, Response> {
  const out: Record<string, Response> = {}
  for (const [id, p] of Object.entries(problems)) {
    const q = p.answer.type === 'display' ? p.answer.question : p.answer
    if (q.type === 'numeric') out[id] = String(q.value)
    else if (q.type === 'choice') out[id] = q.correct
    else if (q.type === 'multi') out[id] = q.correct
    else out[id] = q.exemplar
  }
  return out
}

const ATTEMPTS = [1, 2, 3]
const LEARNER_SEEDS = [1, 20_260_101]

const checkpoints = allCheckpoints()

describe('every registered checkpoint', () => {
  it('finds the Act checkpoints', () => {
    expect(checkpoints.length).toBeGreaterThan(0)
  })

  for (const spec of checkpoints) {
    describe(spec.act, () => {
      it('is a valid spec', () => {
        expect(validateCheckpointSpec(spec), `${spec.act} (${spec.title})`).toEqual([])
      })

      it('builds every item on each attempt, with fresh parameters', () => {
        for (const learnerSeed of LEARNER_SEEDS) {
          const prompts = new Set<string>()
          for (const attempt of ATTEMPTS) {
            const problems = buildCheckpointProblems(spec, learnerSeed, attempt)
            expect(Object.keys(problems).sort(), `${spec.act} attempt ${attempt}: item ids`).toEqual(spec.items.map((i) => i.id).sort())
            for (const item of spec.items) {
              const p = problems[item.id]
              expect(p, `${spec.act} attempt ${attempt}: item "${item.id}" did not build`).toBeTruthy()
              expect(p.prompt?.trim(), `${spec.act} attempt ${attempt}: item "${item.id}" has an empty prompt`).toBeTruthy()
            }
            prompts.add(spec.items.map((i) => problems[i.id].prompt).join('|'))
          }
          // A retry is supposed to draw new parameters, which is the whole reason attempts are seeded.
          expect(prompts.size, `${spec.act}: ${ATTEMPTS.length} attempts produced ${prompts.size} distinct papers`).toBeGreaterThan(1)
        }
      })

      it('passes when every item is answered correctly', () => {
        const problems = buildCheckpointProblems(spec, 1, 1)
        const score = scoreCheckpoint(spec, problems, correctResponses(problems))
        expect(score.missed.map((m) => m.itemId), `${spec.act}: model answers were marked wrong`).toEqual([])
        expect(score.passed, `${spec.act}: a fully correct attempt scored ${score.score}`).toBe(true)
      })
    })
  }
})
