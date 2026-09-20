import { beforeEach, describe, expect, it } from 'vitest'
import { buildCheckpointProblems, checkpointSeed, clearDraft, draftKey, loadDraft, saveDraft, scoreCheckpoint, validateCheckpointSpec, type CheckpointSpec } from '@/lib/problems/checkpoints'
import { answerText } from '@/lib/problems/grade'
import type { Response } from '@/lib/problems/types'

const spec: CheckpointSpec = {
  act: 'act-0',
  title: 'Shakedown certification',
  briefing: 'Prove the pipeline.',
  items: [
    { id: 'q1', generator: 'act-0/fix-error-mean', review: ['act-0-01'] },
    { id: 'q2', generator: 'act-0/resistant-center', review: ['act-0-01'], weight: 2, debrief: 'The XO taps the outlier.' },
    { id: 'q3', generator: 'act-0/dotplot-shape', review: ['act-0-01'] },
    { id: 'q4', generator: 'act-0/sd-in-context', review: ['act-0-01'] },
  ],
  onPass: 'Certified.',
  onFail: 'Back to the simulator.',
  est_minutes: 15,
}

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

describe('validateCheckpointSpec', () => {
  it('accepts a good spec and flags problems', () => {
    expect(validateCheckpointSpec(spec)).toEqual([])
    expect(validateCheckpointSpec({ ...spec, act: 'one' })[0]).toMatch(/act must/)
    expect(validateCheckpointSpec({ ...spec, items: [...spec.items, { id: 'q1', generator: 'act-0/fix-error-mean', review: ['x'] }] })).toContainEqual(expect.stringMatching(/duplicate item id/))
    expect(validateCheckpointSpec({ ...spec, items: [{ id: 'z', generator: 'act-9/nope', review: [] }] })).toHaveLength(2)
    expect(validateCheckpointSpec({ ...spec, threshold: 1.5 })).toContainEqual(expect.stringMatching(/threshold/))
  })
})

describe('build & score', () => {
  it('builds fresh problems per attempt, deterministically', () => {
    const a = buildCheckpointProblems(spec, 123, 0)
    const b = buildCheckpointProblems(spec, 123, 0)
    const c = buildCheckpointProblems(spec, 123, 1)
    expect(Object.keys(a)).toEqual(['q1', 'q2', 'q3', 'q4'])
    expect(a.q1.prompt).toBe(b.q1.prompt)
    expect(a.q1.prompt).not.toBe(c.q1.prompt)
    expect(checkpointSeed(1, 'act-0', 'q1', 0)).not.toBe(checkpointSeed(1, 'act-0', 'q1', 1))
  })
  it('scores with weights, threshold, missed list and answered count', () => {
    const problems = buildCheckpointProblems(spec, 99, 0)
    const all = correctResponses(problems)
    const full = scoreCheckpoint(spec, problems, all)
    expect(full.score).toBe(1)
    expect(full.passed).toBe(true)
    expect(full.missed).toEqual([])
    expect(full.answered).toBe(4)
    expect(full.total).toBe(4)

    const partial = scoreCheckpoint(spec, problems, { q1: all.q1, q3: all.q3, q4: 'nonsense' })
    // q2 (weight 2) missing, q4 wrong → earned 2 of 5
    expect(partial.score).toBeCloseTo(2 / 5)
    expect(partial.passed).toBe(false)
    expect(partial.missed.map((m) => m.itemId)).toEqual(['q2', 'q4'])
    expect(partial.answered).toBe(3)
    expect(partial.results.q4.rubric).toBeDefined()

    const none = scoreCheckpoint(spec, problems, {})
    expect(none.score).toBe(0)
    expect(none.answered).toBe(0)
    expect(none.missed).toHaveLength(4)
    expect(answerText(problems.q2.answer)).toBe('The median')
  })
  it('honors a custom threshold', () => {
    const problems = buildCheckpointProblems(spec, 5, 0)
    const all = correctResponses(problems)
    const s = scoreCheckpoint({ ...spec, threshold: 0.5 }, problems, { q1: all.q1, q2: all.q2 })
    expect(s.score).toBeCloseTo(3 / 5)
    expect(s.passed).toBe(true)
  })
})

describe('drafts', () => {
  beforeEach(() => sessionStorage.clear())
  it('round-trips through sessionStorage, keyed by learner seed and attempt', () => {
    expect(loadDraft('act-0', 1, 0)).toBeNull()
    saveDraft('act-0', 1, 0, { q1: '12.3', q2: 1, q3: [0, 2] })
    expect(sessionStorage.getItem(draftKey('act-0'))).toBeTruthy()
    expect(loadDraft('act-0', 1, 0)).toEqual({ q1: '12.3', q2: 1, q3: [0, 2] })
    expect(loadDraft('act-0', 2, 0)).toBeNull()
    expect(loadDraft('act-0', 1, 1)).toBeNull()
    clearDraft('act-0')
    expect(loadDraft('act-0', 1, 0)).toBeNull()
  })
  it('tolerates corrupt storage', () => {
    sessionStorage.setItem(draftKey('act-0'), '{not json')
    expect(loadDraft('act-0', 1, 0)).toBeNull()
  })
})
