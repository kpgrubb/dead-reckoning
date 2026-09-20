/**
 * Two-way tables (AP Unit 2 categorical analysis; reused by chi-square procedures).
 *   const tw = twoWay([[35, 15], [20, 30]], { rows: ['Compact', 'Independent'], cols: ['Lost', 'Arrived'] })
 *   tw.rowTotals            → [50, 50]
 *   tw.rowConditional[0]    → [0.7, 0.3]   (distribution of column variable within row 0)
 *   tw.marginalCols         → [0.55, 0.45]
 *   expectedCounts(table)   → expected cell counts under independence: rowTotal·colTotal/total
 */

export interface TwoWayLabels {
  rows?: string[]
  cols?: string[]
}

export interface TwoWayTable {
  table: number[][]
  rows: string[]
  cols: string[]
  rowTotals: number[]
  colTotals: number[]
  total: number
  /** Joint distribution: cell / grand total. */
  joint: number[][]
  /** Marginal distribution of the row variable. */
  marginalRows: number[]
  /** Marginal distribution of the column variable. */
  marginalCols: number[]
  /** rowConditional[i][j] = cell / rowTotal[i]  — distribution of the column variable given row i. */
  rowConditional: number[][]
  /** colConditional[j][i] = cell / colTotal[j]  — distribution of the row variable given column j. */
  colConditional: number[][]
  /** Expected counts under independence. */
  expected: number[][]
}

function validate(table: readonly (readonly number[])[]): void {
  if (table.length === 0 || table[0].length === 0) throw new RangeError('twoWay: table must have at least one row and one column')
  const w = table[0].length
  for (const row of table) {
    if (row.length !== w) throw new RangeError('twoWay: ragged table')
    for (const v of row) if (!(v >= 0) || !Number.isFinite(v)) throw new RangeError(`twoWay: counts must be non-negative finite numbers, got ${v}`)
  }
}

export function rowTotals(table: readonly (readonly number[])[]): number[] {
  return table.map((r) => r.reduce((a, b) => a + b, 0))
}

export function colTotals(table: readonly (readonly number[])[]): number[] {
  const out = new Array<number>(table[0].length).fill(0)
  for (const r of table) for (let j = 0; j < r.length; j++) out[j] += r[j]
  return out
}

export function grandTotal(table: readonly (readonly number[])[]): number {
  return rowTotals(table).reduce((a, b) => a + b, 0)
}

/** Expected counts under independence/homogeneity: (row total × column total) / grand total. */
export function expectedCounts(table: readonly (readonly number[])[]): number[][] {
  validate(table)
  const rt = rowTotals(table)
  const ct = colTotals(table)
  const n = rt.reduce((a, b) => a + b, 0)
  if (n === 0) throw new RangeError('expectedCounts: table total is zero')
  return rt.map((r) => ct.map((c) => (r * c) / n))
}

export function twoWay(table: readonly (readonly number[])[], labels: TwoWayLabels = {}): TwoWayTable {
  validate(table)
  const t = table.map((r) => r.slice())
  const rt = rowTotals(t)
  const ct = colTotals(t)
  const n = rt.reduce((a, b) => a + b, 0)
  if (n === 0) throw new RangeError('twoWay: table total is zero')
  const rows = labels.rows ?? t.map((_, i) => `Row ${i + 1}`)
  const cols = labels.cols ?? t[0].map((_, j) => `Col ${j + 1}`)
  return {
    table: t,
    rows,
    cols,
    rowTotals: rt,
    colTotals: ct,
    total: n,
    joint: t.map((r) => r.map((v) => v / n)),
    marginalRows: rt.map((v) => v / n),
    marginalCols: ct.map((v) => v / n),
    rowConditional: t.map((r, i) => r.map((v) => (rt[i] === 0 ? NaN : v / rt[i]))),
    colConditional: ct.map((c, j) => t.map((r) => (c === 0 ? NaN : r[j] / c))),
    expected: rt.map((r) => ct.map((c) => (r * c) / n)),
  }
}

/** Conditional distribution of one variable given a level of the other. */
export function conditional(table: readonly (readonly number[])[], given: 'row' | 'col', index: number): number[] {
  const tw = twoWay(table)
  return given === 'row' ? tw.rowConditional[index] : tw.colConditional[index]
}

/** Largest absolute difference between any two conditional distributions (a plain "association" gauge). */
export function maxConditionalDifference(table: readonly (readonly number[])[], given: 'row' | 'col' = 'row'): number {
  const tw = twoWay(table)
  const dists = given === 'row' ? tw.rowConditional : tw.colConditional
  let m = 0
  for (let a = 0; a < dists.length; a++)
    for (let b = a + 1; b < dists.length; b++)
      for (let k = 0; k < dists[a].length; k++) m = Math.max(m, Math.abs(dists[a][k] - dists[b][k]))
  return m
}
