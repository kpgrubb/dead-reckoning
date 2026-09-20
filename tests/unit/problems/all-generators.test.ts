/**
 * Sweeps every registered generator across many seeds. This is the Math Auditor's first line of
 * defense: any generator that throws, produces a non-finite answer, drifts between solution and
 * answer, or emits malformed items fails here with the seed that reproduces it.
 *
 * Run: npx vitest run tests/unit/problems/all-generators.test.ts
 */
import { describe, expect, it } from 'vitest'
import { Rng } from '@/lib/rng'
import { allGenerators, generatorSource } from '@/lib/problems/registry'
import { validateGeneratorDefinition, validateInstance } from '@/lib/problems/validate'
import { grade } from '@/lib/problems/grade'
import { answerText } from '@/lib/problems/grade'

const SEEDS = 200

const generators = allGenerators()

describe('generator registry', () => {
  it('has generators registered', () => {
    expect(generators.length).toBeGreaterThan(0)
  })
  it('ids are unique and well-formed', () => {
    const ids = generators.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const g of generators) expect(validateGeneratorDefinition(g), `${g.id} (${generatorSource(g.id)})`).toEqual([])
  })
})

describe.each(generators.map((g) => [g.id, g] as const))('%s', (id, g) => {
  it(`instantiates cleanly across ${SEEDS} seeds`, () => {
    const failures: string[] = []
    const kinds = new Set<string>()
    for (let seed = 1; seed <= SEEDS; seed++) {
      let issues: string[]
      try {
        const rng = new Rng(seed * 7919 + 13)
        const p = g.generate(rng)
        issues = validateInstance(p)
        kinds.add(p.answer.type === 'display' ? `display:${p.answer.question.type}` : p.answer.type)
        // The reveal text must be renderable and, for gradeable types, the answer must grade itself.
        expect(answerText(p.answer)).toBeTruthy()
        const q = p.answer.type === 'display' ? p.answer.question : p.answer
        if (q.type === 'numeric') expect(grade(p.answer, String(q.value)).correct).toBe(true)
        if (q.type === 'choice') expect(grade(p.answer, q.correct).correct).toBe(true)
        if (q.type === 'multi') expect(grade(p.answer, q.correct).correct).toBe(true)
        if (q.type === 'interpretation') expect(grade(p.answer, q.exemplar).correct).toBe(true)
      } catch (e) {
        issues = [`threw: ${(e as Error).message}`]
      }
      if (issues.length) failures.push(`seed ${seed}: ${issues.join(' · ')}`)
      if (failures.length >= 5) break
    }
    expect(failures, `${id} (${generatorSource(id)})\n${failures.join('\n')}`).toEqual([])
    expect(kinds.size, 'generator produced no instances').toBeGreaterThan(0)
  })

  it('is deterministic for a given seed', () => {
    const a = g.generate(new Rng(424242))
    const b = g.generate(new Rng(424242))
    expect(JSON.stringify(a, replacer)).toBe(JSON.stringify(b, replacer))
  })
})

function replacer(_k: string, v: unknown) {
  return v instanceof RegExp ? v.source : v
}
