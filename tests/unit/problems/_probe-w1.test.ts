import { describe, it } from 'vitest'
import { lossCounts, lossTwoWay, OWNER_CLASSES, CLASSIFICATIONS, manifest } from '@/instruments/act-2/data'
import { correlation } from '@/lib/stats'

describe('probe', () => {
  it('prints', () => {
    console.log('OWNER_CLASSES', OWNER_CLASSES)
    console.log('CLASSIFICATIONS', CLASSIFICATIONS)
    console.log('lossCounts', JSON.stringify(lossCounts))
    console.log('rowTotals', lossTwoWay.rowTotals, 'colTotals', lossTwoWay.colTotals, 'total', lossTwoWay.total)
    console.log('rowCond', JSON.stringify(lossTwoWay.rowConditional))
    console.log('colCond', JSON.stringify(lossTwoWay.colConditional))
    const xs = manifest.map((d) => d.declaredMass)
    const ys = manifest.map((d) => d.inferredMass)
    console.log('n', manifest.length, 'r', correlation(xs, ys))
  })
})
