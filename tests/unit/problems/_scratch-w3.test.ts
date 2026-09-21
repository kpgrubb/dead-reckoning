import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { manifest, massFit, massFitWithout, CYRENE_ORE_INDEX, fuelOnDeclaredFit, fuelOnRequiredFit, ledgerSample, t9LogLogFit, meanDaysResidual, daysResidual } from '@/instruments/act-2/data'
import { linearRegression, transformedRegression, compareTransforms, mean, sd } from '@/lib/stats'

it('prints act-2 numbers', () => {
  const cy = CYRENE_ORE_INDEX
  const w = massFitWithout(cy)
  const n = manifest.length
  const out: Record<string, unknown> = {
    n,
    massFit: { slope: massFit.slope, intercept: massFit.intercept, r: massFit.r, r2: massFit.r2, s: massFit.s, seSlope: massFit.seSlope, seIntercept: massFit.seIntercept },
    without: { slope: w.slope, intercept: w.intercept, r2: w.r2, s: w.s },
    cyrene: { ...manifest[cy], resid: massFit.residuals[cy], lev: massFit.leverage[cy], cook: massFit.cooks[cy], cut: 4 / n, stdRes: massFit.standardizedResiduals[cy] },
    maxLevOther: Math.max(...massFit.leverage.filter((_, i) => i !== cy)),
    fuelDeclared: { slope: fuelOnDeclaredFit.slope, intercept: fuelOnDeclaredFit.intercept, r: fuelOnDeclaredFit.r, r2: fuelOnDeclaredFit.r2, s: fuelOnDeclaredFit.s },
    fuelRequired: { slope: fuelOnRequiredFit.slope, intercept: fuelOnRequiredFit.intercept, r: fuelOnRequiredFit.r, r2: fuelOnRequiredFit.r2, s: fuelOnRequiredFit.s },
    loglog: { slope: t9LogLogFit.fit.slope, intercept: t9LogLogFit.fit.intercept, r2: t9LogLogFit.r2, s: t9LogLogFit.fit.s, predict4: t9LogLogFit.predict(4.0), predict24: t9LogLogFit.predict(2.4), predict8: t9LogLogFit.predict(8) },
    meanResidLost: meanDaysResidual((t) => t.laterLost),
    meanResidRest: meanDaysResidual((t) => !t.laterLost),
    lostCount: ledgerSample.filter((t) => t.laterLost).length,
    t9range: [Math.min(...ledgerSample.map((t) => t.t9)), Math.max(...ledgerSample.map((t) => t.t9))],
    dRange: [Math.min(...ledgerSample.map((t) => t.laneLengthAU)), Math.max(...ledgerSample.map((t) => t.laneLengthAU))],
    compare: compareTransforms(ledgerSample.map((t) => t.laneLengthAU), ledgerSample.map((t) => t.t9)),
  }
  const xs = ledgerSample.map((t) => t.laneLengthAU)
  const ys = ledgerSample.map((t) => t.t9)
  const raw = linearRegression(xs, ys)
  // raw residual pattern: mean residual by thirds of x
  const order = xs.map((x, i) => i).sort((a, b) => xs[a] - xs[b])
  const third = Math.floor(order.length / 3)
  const thirds = [order.slice(0, third), order.slice(third, 2 * third), order.slice(2 * third)]
  out.rawThirds = thirds.map((idx) => mean(idx.map((i) => raw.residuals[i])))
  out.rawFit = { slope: raw.slope, intercept: raw.intercept, r2: raw.r2, s: raw.s }
  const ll = t9LogLogFit
  out.llThirds = thirds.map((idx) => mean(idx.map((i) => ll.fit.residuals[i])))
  // raw-fit mean residual of later-lost vs rest
  out.rawLost = mean(ledgerSample.filter((t) => t.laterLost).map((t) => t.t9 - raw.predict(t.laneLengthAU)))
  out.rawRest = mean(ledgerSample.filter((t) => !t.laterLost).map((t) => t.t9 - raw.predict(t.laneLengthAU)))
  out.llDaysSd = sd(ledgerSample.map((t) => daysResidual(ll, t)))
  const ly = transformedRegression(xs, ys, 'logy')
  const lx = transformedRegression(xs, ys, 'logx')
  out.lyThirds = thirds.map((idx) => mean(idx.map((i) => ly.fit.residuals[i])))
  out.lxThirds = thirds.map((idx) => mean(idx.map((i) => lx.fit.residuals[i])))
  // fuel: lost hull residuals on the required fit
  out.fuelLostMeanResid = mean(manifest.filter((d) => d.laterLost).map((d, _i) => d.fuelLoaded - fuelOnRequiredFit.predict(d.requiredFuel)))
  out.fuelRestMeanResid = mean(manifest.filter((d) => !d.laterLost).map((d) => d.fuelLoaded - fuelOnRequiredFit.predict(d.requiredFuel)))
  out.declaredRange = [Math.min(...manifest.map((d) => d.declaredMass)), Math.max(...manifest.filter((d) => d.hull !== 'Cyrene Ore').map((d) => d.declaredMass))]
  writeFileSync('C:/Users/grubb/AppData/Local/Temp/claude/C--Users-grubb/71b796da-1809-4837-90a2-af97b9121aaf/scratchpad/act2-numbers.json', JSON.stringify(out, null, 1))
})
