/**
 * Act V checkpoint audit — the curriculum map's blueprint for act-5-checkpoint (§5): nine items,
 * exactly one display, one weighted interpretation, every item naming the module it reviews, and a
 * spec that passes on exemplar answers and fails on blanks across several reseeded attempts.
 */
import { describe, expect, it } from 'vitest'
import { act5Checkpoint } from './act-5'
import { buildCheckpointProblems, scoreCheckpoint, validateCheckpointSpec } from '../checkpoints'
import type { Response } from '../types'

describe('act-5 checkpoint spec', () => {
  it('validates', () => {
    expect(validateCheckpointSpec(act5Checkpoint)).toEqual([])
  })
  it('has the blueprint shape: 9 items, exactly one display, one weighted interpretation', () => {
    expect(act5Checkpoint.items).toHaveLength(9)
    const ps = buildCheckpointProblems(act5Checkpoint, 42, 0)
    const kinds = Object.entries(ps).map(([id, p]) => `${id}:${p.answer.type}`)
    expect(kinds).toEqual([
      'q1:choice', 'q2:display', 'q3:numeric', 'q4:choice', 'q5:numeric',
      'q6:numeric', 'q7:numeric', 'q8:numeric', 'q9:interpretation',
    ])
    expect(act5Checkpoint.items.find((i) => i.id === 'q9')?.weight).toBe(1.5)
    expect(act5Checkpoint.threshold).toBe(0.8)
  })
  it('passes on exemplar answers and fails on blanks, over several attempts', () => {
    for (const attempt of [0, 1, 2, 3]) {
      const ps = buildCheckpointProblems(act5Checkpoint, 7, attempt)
      const good: Record<string, Response> = {}
      for (const [id, p] of Object.entries(ps)) {
        const q = p.answer.type === 'display' ? p.answer.question : p.answer
        good[id] = q.type === 'numeric' ? String(q.value) : q.type === 'choice' ? q.correct : q.type === 'multi' ? q.correct : q.exemplar
      }
      expect(scoreCheckpoint(act5Checkpoint, ps, good).passed).toBe(true)
      expect(scoreCheckpoint(act5Checkpoint, ps, {}).passed).toBe(false)
    }
  })
  it('every item names the module it reviews', () => {
    for (const i of act5Checkpoint.items) {
      expect(i.review.length).toBeGreaterThan(0)
      for (const m of i.review) expect(m).toMatch(/^act-5-0[1-5]$/)
      expect(i.debrief && i.debrief.length).toBeGreaterThan(40)
    }
  })
})
