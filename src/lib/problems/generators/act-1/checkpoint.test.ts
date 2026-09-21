/**
 * The Act I checkpoint spec: valid, 11 items per the curriculum-map blueprint, exactly one display
 * item (q5), one weighted interpretation item (q9), every item instantiates and grades its own answer.
 */
import { describe, expect, it } from 'vitest'
import { buildCheckpointProblems, scoreCheckpoint, validateCheckpointSpec } from '@/lib/problems/checkpoints'
import type { Response } from '@/lib/problems/types'
import { act1Checkpoint } from '@/lib/problems/checkpoints/act-1'

describe('act-1 checkpoint', () => {
  it('is a valid spec with the blueprint mix', () => {
    expect(validateCheckpointSpec(act1Checkpoint)).toEqual([])
    expect(act1Checkpoint.items).toHaveLength(11)
    expect(act1Checkpoint.threshold).toBe(0.8)
    expect(act1Checkpoint.items.every((i) => i.debrief && i.review.length > 0)).toBe(true)
    expect(act1Checkpoint.items.find((i) => i.id === 'q9')?.weight).toBe(1.5)
  })

  it('builds fresh problems with exactly one display item and grades a perfect attempt at 100%', () => {
    for (const seed of [1, 7, 42, 9001]) {
      for (const attempt of [0, 1]) {
        const problems = buildCheckpointProblems(act1Checkpoint, seed, attempt)
        const display = Object.values(problems).filter((p) => p.answer.type === 'display')
        expect(display).toHaveLength(1)
        expect(problems.q5.answer.type).toBe('display')
        const kinds = new Set(Object.values(problems).map((p) => (p.answer.type === 'display' ? p.answer.question.type : p.answer.type)))
        expect(kinds.has('choice')).toBe(true)
        expect(kinds.has('numeric')).toBe(true)
        expect(kinds.has('interpretation')).toBe(true)
        const responses: Record<string, Response> = {}
        for (const [id, p] of Object.entries(problems)) {
          const q = p.answer.type === 'display' ? p.answer.question : p.answer
          responses[id] = q.type === 'numeric' ? String(q.value) : q.type === 'choice' ? q.correct : q.type === 'multi' ? q.correct : q.exemplar
        }
        const s = scoreCheckpoint(act1Checkpoint, problems, responses)
        expect(s.score).toBe(1)
        expect(s.passed).toBe(true)
      }
    }
  })
})
