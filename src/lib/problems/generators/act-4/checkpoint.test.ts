/**
 * The Act IV checkpoint spec: valid, 12 items per the curriculum-map blueprint, exactly one display
 * item (q12, the geometric pmf), one weighted interpretation item (q8), every item instantiates and
 * grades its own answer across several seeds and attempts.
 */
import { describe, expect, it } from 'vitest'
import { buildCheckpointProblems, scoreCheckpoint, validateCheckpointSpec } from '@/lib/problems/checkpoints'
import type { Response } from '@/lib/problems/types'
import { act4Checkpoint } from '@/lib/problems/checkpoints/act-4'

describe('act-4 checkpoint', () => {
  it('is a valid spec with the blueprint mix', () => {
    expect(validateCheckpointSpec(act4Checkpoint)).toEqual([])
    expect(act4Checkpoint.items).toHaveLength(12)
    expect(act4Checkpoint.threshold).toBe(0.8)
    expect(act4Checkpoint.est_minutes).toBe(25)
    expect(act4Checkpoint.items.every((i) => i.debrief && i.review.length > 0)).toBe(true)
    expect(act4Checkpoint.items.find((i) => i.id === 'q8')?.weight).toBe(1.5)
    // Every teaching module in the Act is reviewed by at least one item.
    const reviewed = new Set(act4Checkpoint.items.flatMap((i) => i.review))
    for (const m of ['act-4-01', 'act-4-02', 'act-4-03', 'act-4-04', 'act-4-05', 'act-4-06', 'act-4-07', 'act-4-08', 'act-4-09', 'act-4-10']) {
      expect(reviewed.has(m), `${m} is not reviewed by any checkpoint item`).toBe(true)
    }
  })

  it('builds fresh problems with exactly one display item and grades a perfect attempt at 100%', () => {
    for (const seed of [1, 7, 42, 9001]) {
      for (const attempt of [0, 1]) {
        const problems = buildCheckpointProblems(act4Checkpoint, seed, attempt)
        const display = Object.values(problems).filter((p) => p.answer.type === 'display')
        expect(display).toHaveLength(1)
        expect(problems.q12.answer.type).toBe('display')
        const kinds = new Set(Object.values(problems).map((p) => (p.answer.type === 'display' ? p.answer.question.type : p.answer.type)))
        expect(kinds.has('choice')).toBe(true)
        expect(kinds.has('numeric')).toBe(true)
        expect(kinds.has('interpretation')).toBe(true)
        const responses: Record<string, Response> = {}
        for (const [id, p] of Object.entries(problems)) {
          const q = p.answer.type === 'display' ? p.answer.question : p.answer
          responses[id] = q.type === 'numeric' ? String(q.value) : q.type === 'choice' ? q.correct : q.type === 'multi' ? q.correct : q.exemplar
        }
        const s = scoreCheckpoint(act4Checkpoint, problems, responses)
        expect(s.score).toBe(1)
        expect(s.passed).toBe(true)
      }
    }
  })
})
