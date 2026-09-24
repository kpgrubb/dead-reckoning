/**
 * The Act VII checkpoint spec: every generator it names must exist and every item must build and
 * grade. The curriculum map's blueprint (§5) fixes the mix, so the shape is asserted too.
 */
import { describe, expect, it } from 'vitest'
import { buildCheckpointProblems, scoreCheckpoint, validateCheckpointSpec } from '@/lib/problems/checkpoints'
import type { Response } from '@/lib/problems/types'
import { act7Checkpoint as spec } from './act-7'

describe('act-7 checkpoint spec', () => {
  it('is valid — every generator id is registered', () => {
    expect(validateCheckpointSpec(spec)).toEqual([])
  })

  it('has the blueprint’s eleven items, three interpretations and exactly one display', () => {
    expect(spec.items).toHaveLength(11)
    expect(spec.items.map((i) => i.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11'])
    expect(spec.threshold).toBe(0.8)
    expect(spec.est_minutes).toBe(25)

    const problems = buildCheckpointProblems(spec, 4242, 0)
    const kinds = Object.values(problems).map((p) => p.answer.type)
    expect(kinds.filter((k) => k === 'display')).toHaveLength(1)
    expect(kinds.filter((k) => k === 'interpretation').length).toBeGreaterThanOrEqual(3)
    expect(kinds.filter((k) => k === 'numeric').length).toBeGreaterThanOrEqual(3)
    expect(kinds.filter((k) => k === 'choice').length).toBeGreaterThanOrEqual(3)
  })

  it('every item reviews an Act VII module and carries a debrief line', () => {
    for (const item of spec.items) {
      expect(item.review.length, item.id).toBeGreaterThan(0)
      for (const id of item.review) expect(id, item.id).toMatch(/^act-7-0[1-7]$/)
      expect(item.debrief, item.id).toBeTruthy()
    }
  })

  it('scores a perfect attempt as a pass and an empty attempt as a fail', () => {
    const problems = buildCheckpointProblems(spec, 99, 0)
    const all: Record<string, Response> = {}
    for (const [id, p] of Object.entries(problems)) {
      const q = p.answer.type === 'display' ? p.answer.question : p.answer
      if (q.type === 'numeric') all[id] = String(q.value)
      else if (q.type === 'choice') all[id] = q.correct
      else if (q.type === 'multi') all[id] = q.correct
      else all[id] = q.exemplar
    }
    const full = scoreCheckpoint(spec, problems, all)
    expect(full.score).toBe(1)
    expect(full.passed).toBe(true)

    const none = scoreCheckpoint(spec, problems, {})
    expect(none.passed).toBe(false)
    expect(none.missed.length).toBe(11)
  })

  it('reseeds every attempt', () => {
    const a = buildCheckpointProblems(spec, 7, 0)
    const b = buildCheckpointProblems(spec, 7, 1)
    expect(a.q2.prompt).not.toBe(b.q2.prompt)
  })
})
