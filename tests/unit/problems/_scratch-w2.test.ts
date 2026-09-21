import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { manifest, massFit, honestManifest, residualPct, NICHOLSON_REGIO_INDEX, CYRENE_ORE_INDEX } from '@/instruments/act-2/data'
import { linearRegression, max, min } from '@/lib/stats'

it('prints act-2 w2 numbers', () => {
  const above5 = manifest.map((d, i) => i).filter((i) => residualPct(i) > 5)
  const above5Lost = above5.filter((i) => manifest[i].laterLost)
  const lost = manifest.filter((d) => d.laterLost)
  const t = honestManifest[137]
  const proving = {
    declared: [14.8, 16.2, 17.5, 18.9, 20.4, 22.1, 23.6, 25.3],
    fuel: [2.79, 2.96, 3.31, 3.48, 3.84, 4.05, 4.44, 4.68],
  }
  const pf = linearRegression(proving.declared, proving.fuel)
  const out = {
    massFit: { slope: massFit.slope, intercept: massFit.intercept, r: massFit.r, r2: massFit.r2, s: massFit.s, sx: massFit.sx, sy: massFit.sy, xMean: massFit.xMean, yMean: massFit.yMean },
    target137: { hull: t.hull, owner: t.ownerClass, declared: t.declaredMass, inferred: t.inferredMass, predicted: massFit.predict(t.declaredMass), laterLost: t.laterLost },
    nicholson: { i: NICHOLSON_REGIO_INDEX, ...manifest[NICHOLSON_REGIO_INDEX], resid: massFit.residuals[NICHOLSON_REGIO_INDEX], pct: residualPct(NICHOLSON_REGIO_INDEX), predicted: massFit.predict(manifest[NICHOLSON_REGIO_INDEX].declaredMass) },
    cyrene: { i: CYRENE_ORE_INDEX, declared: manifest[CYRENE_ORE_INDEX].declaredMass, predicted: massFit.predict(60000) },
    counts: { above5: above5.length, above5Lost: above5Lost.length, lost: lost.length, lostInBand: lost.length - above5Lost.length, n: manifest.length, honest: honestManifest.length },
    pctRange: { lo: min(above5.map((i) => residualPct(i))), hi: max(above5.map((i) => residualPct(i))) },
    declaredRangeAll: [min(manifest.map((d) => d.declaredMass)), max(manifest.map((d) => d.declaredMass))],
    secondLargestDeclared: [...manifest.map((d) => d.declaredMass)].sort((a, b) => b - a)[1],
    provingFit: { slope: pf.slope, intercept: pf.intercept, r: pf.r, r2: pf.r2, s: pf.s, sse: pf.sse, predict20: pf.predict(20) },
  }
  writeFileSync('C:/Users/grubb/AppData/Local/Temp/claude/C--Users-grubb/71b796da-1809-4837-90a2-af97b9121aaf/scratchpad/act2-w2-numbers.json', JSON.stringify(out, null, 1))
})
