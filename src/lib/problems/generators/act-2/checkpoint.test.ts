/**
 * The Act II checkpoint spec: valid, 10 items per the curriculum-map blueprint, exactly one display
 * item (q3, the scatterplot), one weighted interpretation item (q2), every item instantiates and
 * grades its own answer across several seeds and attempts.
 */
import { describe, expect, it } from 'vitest'
import { buildCheckpointProblems, scoreCheckpoint, validateCheckpointSpec } from '@/lib/problems/checkpoints'
import type { Response } from '@/lib/problems/types'
import { act2Checkpoint } from '@/lib/problems/checkpoints/act-2'

describe('act-2 checkpoint', () => {
  it('is a valid spec with the blueprint mix', () => {
    expect(validateCheckpointSpec(act2Checkpoint)).toEqual([])
    expect(act2Checkpoint.items).toHaveLength(10)
    expect(act2Checkpoint.threshold).toBe(0.8)
    expect(act2Checkpoint.est_minutes).toBe(20)
    expect(act2Checkpoint.items.every((i) => i.debrief && i.review.length > 0)).toBe(true)
    expect(act2Checkpoint.items.find((i) => i.id === 'q2')?.weight).toBe(1.5)
    // Every teaching module in the Act is reviewed by at least one item.
    const reviewed = new Set(act2Checkpoint.items.flatMap((i) => i.review))
    for (const m of ['act-2-01', 'act-2-02', 'act-2-03', 'act-2-04', 'act-2-05', 'act-2-06']) expect(reviewed.has(m)).toBe(true)
  })

  it('builds fresh problems with exactly one display item and grades a perfect attempt at 100%', () => {
    for (const seed of [1, 7, 42, 9001]) {
      for (const attempt of [0, 1]) {
        const problems = buildCheckpointProblems(act2Checkpoint, seed, attempt)
        const display = Object.values(problems).filter((p) => p.answer.type === 'display')
        expect(display).toHaveLength(1)
        expect(problems.q3.answer.type).toBe('display')
        const kinds = new Set(Object.values(problems).map((p) => (p.answer.type === 'display' ? p.answer.question.type : p.answer.type)))
        expect(kinds.has('choice')).toBe(true)
        expect(kinds.has('numeric')).toBe(true)
        expect(kinds.has('interpretation')).toBe(true)
        const responses: Record<string, Response> = {}
        for (const [id, p] of Object.entries(problems)) {
          const q = p.answer.type === 'display' ? p.answer.question : p.answer
          responses[id] = q.type === 'numeric' ? String(q.value) : q.type === 'choice' ? q.correct : q.type === 'multi' ? q.correct : q.exemplar
        }
        const s = scoreCheckpoint(act2Checkpoint, problems, responses)
        expect(s.score).toBe(1)
        expect(s.passed).toBe(true)
      }
    }
  })
})
