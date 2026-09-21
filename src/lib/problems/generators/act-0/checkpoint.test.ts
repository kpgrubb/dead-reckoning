/**
 * The Prologue checkpoint spec: valid, ten items, exactly one display item (q9), one weighted
 * interpretation item (q10), every item instantiates and grades its own answer at 100 %.
 */
import { describe, expect, it } from 'vitest'
import { buildCheckpointProblems, scoreCheckpoint, validateCheckpointSpec } from '@/lib/problems/checkpoints'
import type { Response } from '@/lib/problems/types'
import { act0Checkpoint } from '@/lib/problems/checkpoints/act-0'

describe('act-0 checkpoint', () => {
  it('is a valid spec with the Prologue mix', () => {
    expect(validateCheckpointSpec(act0Checkpoint)).toEqual([])
    expect(act0Checkpoint.items).toHaveLength(10)
    expect(act0Checkpoint.threshold).toBe(0.8)
    expect(act0Checkpoint.items.every((i) => i.debrief && i.review.length > 0)).toBe(true)
    expect(act0Checkpoint.items.find((i) => i.id === 'q10')?.weight).toBe(1.5)
    // Every item reviews a Prologue module.
    expect(act0Checkpoint.items.every((i) => i.review.every((m) => /^act-0-0[123]$/.test(m)))).toBe(true)
    expect(new Set(act0Checkpoint.items.flatMap((i) => i.review))).toEqual(new Set(['act-0-01', 'act-0-02', 'act-0-03']))
  })

  it('builds fresh problems with exactly one display item and grades a perfect attempt at 100%', () => {
    for (const seed of [1, 7, 42, 9001]) {
      for (const attempt of [0, 1]) {
        const problems = buildCheckpointProblems(act0Checkpoint, seed, attempt)
        const display = Object.values(problems).filter((p) => p.answer.type === 'display')
        expect(display).toHaveLength(1)
        expect(problems.q9.answer.type).toBe('display')
        const kinds = new Set(Object.values(problems).map((p) => (p.answer.type === 'display' ? p.answer.question.type : p.answer.type)))
        expect(kinds.has('choice')).toBe(true)
        expect(kinds.has('numeric')).toBe(true)
        expect(kinds.has('interpretation')).toBe(true)
        const responses: Record<string, Response> = {}
        for (const [id, p] of Object.entries(problems)) {
          const q = p.answer.type === 'display' ? p.answer.question : p.answer
          responses[id] = q.type === 'numeric' ? String(q.value) : q.type === 'choice' ? q.correct : q.type === 'multi' ? q.correct : q.exemplar
        }
        const s = scoreCheckpoint(act0Checkpoint, problems, responses)
        expect(s.score).toBe(1)
        expect(s.passed).toBe(true)
      }
    }
  })
})
