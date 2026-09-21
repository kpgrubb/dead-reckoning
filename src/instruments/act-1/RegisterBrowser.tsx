/**
 * INTEL · REGISTER BROWSER (act-1-01) — the Lane Authority's Incident File as a filterable, sortable
 * table with a variable inspector, an office × classification two-way table and the Board's mark
 * histogram. The learner filters, classifies each column, and rebins the marks to see the Board's
 * flat picture turn into the Mark 9–10 pile.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components/Panel'
import { Segmented, Readout, ReadoutRow, seriesColor } from '@/instruments/shared'
import { countBy, describe, fmt, fmtInt, fmtPct, twoWay } from '@/lib/stats'
import { register, losses, LOSS_COLUMNS, REGISTER_COLUMNS, VARIABLE_TYPES, type LossRecord, type RegisterRecord, type VariableType } from './data'
import { EdgeHistogram, KeyTable, Note, Subhead, gridStyle, stackStyle } from './_ui'

export interface RegisterBrowserProps {
  /** Which subtable opens: the 31 losses (default) or all 2,200 records. */
  view?: 'losses' | 'all'
}

type View = 'losses' | 'all'
type OfficeFilter = 'all' | 'Uruk' | 'Ceres'
type ClassFilter = 'all' | 'accident' | 'piracy' | 'unknown'
type OwnerFilter = 'all' | 'Perrine' | 'Mercantile' | 'independent'
type SeverityFilter = 'all' | 'loss' | 'advisory' | 'dropout' | 'other'
type Guess = VariableType | 'unset'
type BinChoice = '4' | '11' | '22'

const PAGE = 60
const OFFICES = ['Uruk', 'Ceres'] as const
const CLASSES = ['accident', 'piracy', 'unknown'] as const

const TYPE_LABEL: Record<VariableType, string> = {
  categorical: 'categorical',
  'quantitative-discrete': 'quantitative · discrete',
  'quantitative-continuous': 'quantitative · continuous',
  identifier: 'identifier',
}

const GUESS_OPTIONS: readonly { value: Guess; label: string }[] = [
  { value: 'unset', label: 'unset' },
  { value: 'categorical', label: 'categorical' },
  { value: 'quantitative-discrete', label: 'quant · discrete' },
  { value: 'quantitative-continuous', label: 'quant · continuous' },
  { value: 'identifier', label: 'identifier' },
]

function cell(row: RegisterRecord, col: string): string | number | undefined {
  return (row as unknown as Record<string, string | number | undefined>)[col]
}

function fmtCell(v: string | number | undefined): string {
  if (v === undefined) return '—'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : fmt(v, Math.abs(v) < 1 ? 3 : 2)
  return v
}

/** Bin edges: k equal bins across Marks 1–12. */
function markEdges(k: number): number[] {
  return Array.from({ length: k + 1 }, (_, i) => Number((1 + (11 * i) / k).toFixed(4)))
}

export function RegisterBrowser({ view: initialView = 'losses' }: RegisterBrowserProps) {
  const [view, setView] = useState<View>(initialView)
  const [office, setOffice] = useState<OfficeFilter>('all')
  const [cls, setCls] = useState<ClassFilter>('all')
  const [owner, setOwner] = useState<OwnerFilter>('all')
  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [sortCol, setSortCol] = useState<string>('date')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [page, setPage] = useState(0)
  const [inspect, setInspect] = useState<string>(initialView === 'losses' ? 'classification' : 'kind')
  const [guesses, setGuesses] = useState<Record<string, Guess>>({})
  const [histView, setHistView] = useState<View>(initialView)
  const [binChoice, setBinChoice] = useState<BinChoice>('4')

  const columns: readonly string[] = view === 'losses' ? LOSS_COLUMNS : REGISTER_COLUMNS
  const inspectCol = columns.includes(inspect) ? inspect : columns[0]

  const filtered = useMemo(() => {
    const base: RegisterRecord[] = view === 'losses' ? register.filter((r) => r.severity === 'loss') : register
    return base.filter((r) => {
      if (office !== 'all' && r.office !== office) return false
      if (owner !== 'all' && r.owner_class !== owner) return false
      if (severity !== 'all' && r.severity !== severity) return false
      if (cls !== 'all') {
        if (r.severity !== 'loss') return false
        if ((r as LossRecord).classification !== cls) return false
      }
      return true
    })
  }, [view, office, owner, severity, cls])

  const sortedRows = useMemo(() => {
    const rows = filtered.slice()
    rows.sort((a, b) => {
      const va = cell(a, sortCol)
      const vb = cell(b, sortCol)
      if (va === undefined && vb === undefined) return 0
      if (va === undefined) return 1
      if (vb === undefined) return -1
      const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return c * sortDir
    })
    return rows
  }, [filtered, sortCol, sortDir])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = sortedRows.slice(safePage * PAGE, safePage * PAGE + PAGE)

  const onHeader = (col: string) => {
    setInspect(col)
    if (col === sortCol) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortCol(col)
      setSortDir(1)
    }
    setPage(0)
  }

  const changeView = (v: View) => {
    setView(v)
    setPage(0)
    if (v === 'losses' && (severity !== 'all' || !LOSS_COLUMNS.includes(sortCol as (typeof LOSS_COLUMNS)[number]))) {
      setSeverity('all')
      setSortCol('date')
    }
    if (v === 'all' && !REGISTER_COLUMNS.includes(sortCol as (typeof REGISTER_COLUMNS)[number])) setSortCol('date')
  }

  /* ---- Variable inspector ---- */
  const key = VARIABLE_TYPES[inspectCol]
  const guess = guesses[inspectCol] ?? 'unset'
  const inspectValues = useMemo(() => filtered.map((r) => cell(r, inspectCol)).filter((v): v is string | number => v !== undefined), [filtered, inspectCol])
  const inspectorBody = useMemo(() => {
    if (!key || inspectValues.length === 0) return null
    if (key.type === 'categorical') {
      const table = countBy(inspectValues.map(String))
      const total = table.reduce((s, r) => s + r.count, 0)
      const relSum = table.reduce((s, r) => s + r.relFreq, 0)
      return (
        <KeyTable
          ariaLabel={`Frequency table of ${inspectCol}`}
          caption={`${inspectCol} · n = ${fmtInt(total)}`}
          columns={[inspectCol, 'count', 'relative frequency']}
          rows={[...table.map((r) => [r.value, fmtInt(r.count), fmt(r.relFreq, 3)]), ['TOTAL', fmtInt(total), fmt(relSum, 3)]]}
          emphasisRow={table.length}
        />
      )
    }
    if (key.type === 'identifier') {
      const distinct = new Set(inspectValues.map(String)).size
      return (
        <ReadoutRow>
          <Readout label="rows" value={fmtInt(inspectValues.length)} size="sm" />
          <Readout label="distinct labels" value={fmtInt(distinct)} size="sm" />
        </ReadoutRow>
      )
    }
    const nums = inspectValues.filter((v): v is number => typeof v === 'number')
    if (nums.length < 2) return <Note>Fewer than two numeric values under this filter.</Note>
    const d = describe(nums)
    return (
      <ReadoutRow>
        <Readout label="n" value={fmtInt(d.n)} size="sm" />
        <Readout label="mean" value={fmt(d.mean, 2)} units={key.units} size="sm" tone="intel" />
        <Readout label="median" value={fmt(d.median, 2)} units={key.units} size="sm" tone="intel" />
        <Readout label="sd" value={fmt(d.sd, 2)} units={key.units} size="sm" />
        <Readout label="min" value={fmt(d.min, 2)} size="sm" />
        <Readout label="max" value={fmt(d.max, 2)} size="sm" />
      </ReadoutRow>
    )
  }, [key, inspectValues, inspectCol])

  /* ---- Office × classification ---- */
  const lossRows = useMemo(() => filtered.filter((r): r is LossRecord => r.severity === 'loss'), [filtered])
  const twoWayTable = useMemo(() => {
    const counts = OFFICES.map((o) => CLASSES.map((c) => lossRows.filter((l) => l.office === o && l.classification === c).length))
    if (counts.flat().every((c) => c === 0)) return null
    return twoWay(counts, { rows: [...OFFICES], cols: [...CLASSES] })
  }, [lossRows])

  /* ---- Mark histogram ---- */
  const k = Number(binChoice)
  const edges = useMemo(() => markEdges(k), [k])
  const histValues = useMemo(() => (histView === 'losses' ? register.filter((r) => r.severity === 'loss').map((r) => r.mark) : register.map((r) => r.mark)), [histView])
  const binLabel = edges.length <= 5 ? edges.slice(0, -1).map((e, i) => `${fmt(e, 2)}–${fmt(edges[i + 1], 2)}`).join(' · ') : `width ${fmt(11 / k, 2)}`

  const status = `${fmtInt(filtered.length)} OF ${fmtInt(view === 'losses' ? losses.length : register.length)} RECORDS`

  return (
    <Panel label="INTEL · REGISTER BROWSER" status={status} tone="intel" led="on">
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<View> label="subtable" value={view} onChange={changeView} options={[{ value: 'losses', label: `losses · ${losses.length}` }, { value: 'all', label: `all · ${fmtInt(register.length)}` }]} />
          <Segmented<OfficeFilter> label="office" value={office} onChange={(v) => { setOffice(v); setPage(0) }} options={[{ value: 'all', label: 'all' }, { value: 'Uruk', label: 'Uruk' }, { value: 'Ceres', label: 'Ceres' }]} />
          <Segmented<ClassFilter> label="classification" value={cls} onChange={(v) => { setCls(v); setPage(0) }} options={[{ value: 'all', label: 'all' }, { value: 'accident', label: 'accident' }, { value: 'piracy', label: 'piracy' }, { value: 'unknown', label: 'unknown' }]} />
          <Segmented<OwnerFilter> label="owner class" value={owner} onChange={(v) => { setOwner(v); setPage(0) }} options={[{ value: 'all', label: 'all' }, { value: 'Perrine', label: 'Perrine' }, { value: 'Mercantile', label: 'Mercantile' }, { value: 'independent', label: 'indep.' }]} />
          {view === 'all' && (
            <Segmented<SeverityFilter> label="severity" value={severity} onChange={(v) => { setSeverity(v); setPage(0) }} options={[{ value: 'all', label: 'all' }, { value: 'loss', label: 'loss' }, { value: 'advisory', label: 'advisory' }, { value: 'dropout', label: 'dropout' }, { value: 'other', label: 'other' }]} />
          )}
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--dr-line)', borderRadius: 'var(--dr-radius)', maxHeight: 360, overflowY: 'auto' }}>
          <table className="dr-table" aria-label={`Register ${view === 'losses' ? 'losses' : 'records'} table`}>
            <caption className="dr-table__caption">
              Showing {sortedRows.length === 0 ? 0 : safePage * PAGE + 1}–{Math.min(sortedRows.length, (safePage + 1) * PAGE)} of {fmtInt(sortedRows.length)} · click a header to sort and inspect
            </caption>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c} scope="col" aria-sort={sortCol === c ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" aria-pressed={inspectCol === c} onClick={() => onHeader(c)} style={inspectCol === c ? { color: 'var(--dr-violet)' } : undefined}>
                      {c}
                      {sortCol === c ? (sortDir === 1 ? ' ▲' : ' ▼') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.record_id}>
                  {columns.map((c) => (
                    <td key={c}>{fmtCell(cell(r, c))}</td>
                  ))}
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="dr-table__note">
                    No records match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div className="dr-controls" style={{ alignItems: 'center' }}>
            <button type="button" className="dr-btn dr-btn--ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>
              ◀ PREV
            </button>
            <span className="dr-chart__caption" style={{ margin: 0 }}>
              page {safePage + 1} of {pageCount} · {PAGE} rows per page
            </span>
            <button type="button" className="dr-btn dr-btn--ghost" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}>
              NEXT ▶
            </button>
          </div>
        )}

        <div style={gridStyle}>
          <section aria-label="Variable inspector">
            <Subhead>Variable inspector · {inspectCol}</Subhead>
            <div className="dr-controls">
              <Segmented<Guess> label="classify this column" value={guess} options={GUESS_OPTIONS} onChange={(g) => setGuesses((s) => ({ ...s, [inspectCol]: g }))} />
            </div>
            {key && guess !== 'unset' && (
              guess === key.type ? (
                <Note tone="ok" live>
                  CONFIRMED — {inspectCol} is {TYPE_LABEL[key.type]}
                  {key.units ? ` (${key.units})` : ''}. {key.note}
                </Note>
              ) : (
                <Note tone="alert" live>
                  REJECTED — {inspectCol} is not {TYPE_LABEL[guess]}. {key.note}
                </Note>
              )
            )}
            {key && guess === 'unset' && <Note>Choose a type. The Register answers with its column note.</Note>}
            {inspectorBody}
          </section>

          <section aria-label="Office by classification two-way table">
            <Subhead>Office × classification · current filter</Subhead>
            {twoWayTable ? (
              <KeyTable
                ariaLabel="Office by classification"
                caption={`losses under this filter · n = ${fmtInt(twoWayTable.total)} · cell = count (row %)`}
                columns={['office', ...CLASSES, 'n']}
                rows={[
                  ...twoWayTable.rows.map((o, i) => [o, ...CLASSES.map((_, j) => `${twoWayTable.table[i][j]} (${fmtPct(twoWayTable.rowConditional[i][j], 1)})`), fmtInt(twoWayTable.rowTotals[i])]),
                  ['TOTAL', ...twoWayTable.colTotals.map((c) => fmtInt(c)), fmtInt(twoWayTable.total)],
                ]}
                emphasisRow={twoWayTable.rows.length}
              />
            ) : (
              <Note>No classified losses under this filter — classification exists only for loss records.</Note>
            )}
          </section>
        </div>

        <section aria-label="Mark histogram">
          <Subhead>Mark histogram · the Board's axis</Subhead>
          <div className="dr-controls">
            <Segmented<View> label="records" value={histView} onChange={setHistView} options={[{ value: 'all', label: `all · ${fmtInt(register.length)}` }, { value: 'losses', label: `losses · ${losses.length}` }]} />
            <Segmented<BinChoice> label="bins" value={binChoice} onChange={setBinChoice} options={[{ value: '4', label: '4 · in threes' }, { value: '11', label: '11 · width 1' }, { value: '22', label: '22 · width 0.5' }]} />
          </div>
          <EdgeHistogram
            values={histValues}
            edges={edges}
            label="Lane mark at the record"
            color={seriesColor(histView === 'losses' ? 3 : 4)}
            ariaLabel={`Histogram of Lane marks for ${histView === 'losses' ? 'the 31 losses' : 'all 2,200 records'} in ${k} bins`}
            description={`Marks 1 to 12 in ${k} equal bins of width ${fmt(11 / k, 2)}, for ${histView === 'losses' ? 'the loss records only' : 'every Register record'}. The data table lists each bin's count and relative frequency.`}
          />
          <Note>
            Bins: {binLabel} · n = {fmtInt(histValues.length)}. Change the bin width and the record set, and watch what the same marks look like.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
