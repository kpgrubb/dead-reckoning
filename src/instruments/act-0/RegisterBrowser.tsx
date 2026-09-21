/**
 * RegisterBrowser — the Lane Authority Incident Register, filterable and tabulated (act-0-03).
 *
 * The Board's summary page quotes one mean over 2,200 records "of every severity". The learner filters
 * by severity / office / owner class / year and watches the denominator change: the frequency panel
 * recomputes counts and relative frequencies over the records in view, and the record table pages
 * through them. `children` render below the frequency panel (Act I drops a variable inspector there).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { fmt } from '@/lib/stats/format'
import { Panel } from '@/components/Panel'
import { BarChart, Readout, ReadoutRow, Segmented } from '@/instruments/shared'
import {
  OFFICE_ORDER,
  OWNER_ORDER,
  REGISTER_COLUMNS,
  SEVERITY_ORDER,
  filterRegister,
  register,
  registerFrequency,
  type HullClass,
  type Office,
  type OwnerClass,
  type RecordKind,
  type RegisterRecord,
  type Severity,
} from './data'
import './act-0.css'

type TabulateColumn = 'severity' | 'office' | 'owner_class' | 'kind' | 'hull_class'
type SortKey = keyof RegisterRecord
type SortDir = 'asc' | 'desc'
type YearOption = 'all' | '2178' | '2179' | '2180' | '2181' | '2182' | '2183' | '2184'

const YEARS: YearOption[] = ['all', '2178', '2179', '2180', '2181', '2182', '2183', '2184']
const KIND_ORDER: RecordKind[] = ['loss', 'transponder dropout', 'debris advisory', 'profile deviation', 'medical diversion']
const HULL_CLASS_ORDER: HullClass[] = ['Sulcus-Mk3', 'Tessera-C', 'other']

const TABULATE_OPTIONS: { value: TabulateColumn; label: string }[] = [
  { value: 'severity', label: 'severity' },
  { value: 'office', label: 'office' },
  { value: 'owner_class', label: 'owner class' },
  { value: 'kind', label: 'record type' },
  { value: 'hull_class', label: 'hull class' },
]

function frequencyOf(records: readonly RegisterRecord[], column: TabulateColumn) {
  switch (column) {
    case 'severity':
      return registerFrequency(records, column, SEVERITY_ORDER)
    case 'office':
      return registerFrequency(records, column, OFFICE_ORDER)
    case 'owner_class':
      return registerFrequency(records, column, OWNER_ORDER)
    case 'kind':
      return registerFrequency(records, column, KIND_ORDER)
    case 'hull_class':
      return registerFrequency(records, column, HULL_CLASS_ORDER)
  }
}

function compareRecords(a: RegisterRecord, b: RegisterRecord, key: SortKey): number {
  if (key === 'date' || key === 'day') return a.day - b.day
  const av = a[key]
  const bv = b[key]
  if (typeof av === 'number' && typeof bv === 'number') return av - bv
  return String(av ?? '').localeCompare(String(bv ?? ''))
}

function cell(r: RegisterRecord, key: SortKey): string {
  const v = r[key]
  if (key === 'mark') return fmt(r.mark, 2)
  return v === null || v === undefined ? '—' : String(v)
}

export interface RegisterBrowserProps {
  records?: RegisterRecord[]
  pageSize?: number
  label?: string
  children?: ReactNode
  onFilteredChange?: (records: RegisterRecord[]) => void
}

export function RegisterBrowser({ records = register, pageSize = 25, label = 'INTEL · LANE AUTHORITY INCIDENT REGISTER', children, onFilteredChange }: RegisterBrowserProps = {}) {
  const [severity, setSeverity] = useState<Severity | 'all'>('all')
  const [office, setOffice] = useState<Office | 'all'>('all')
  const [ownerClass, setOwnerClass] = useState<OwnerClass | 'all'>('all')
  const [year, setYear] = useState<YearOption>('all')
  const [tabulate, setTabulate] = useState<TabulateColumn>('severity')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)

  const filtered = useMemo(
    () => filterRegister(records, { severity, office, owner_class: ownerClass, year: year === 'all' ? 'all' : Number(year) }),
    [records, severity, office, ownerClass, year],
  )
  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return filtered.slice().sort((a, b) => dir * compareRecords(a, b, sortKey) || a.record_id.localeCompare(b.record_id))
  }, [filtered, sortKey, sortDir])
  const freq = useMemo(() => frequencyOf(filtered, tabulate), [filtered, tabulate])

  useEffect(() => {
    onFilteredChange?.(filtered)
  }, [filtered, onFilteredChange])

  const shown = filtered.length
  const total = records.length
  const pageCount = Math.max(1, Math.ceil(shown / pageSize))
  const pageIdx = Math.min(page, pageCount - 1)
  const from = shown === 0 ? 0 : pageIdx * pageSize + 1
  const to = Math.min(shown, (pageIdx + 1) * pageSize)
  const pageRows = sorted.slice(pageIdx * pageSize, pageIdx * pageSize + pageSize)

  const withReset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(0)
  }
  const resetFilters = () => {
    setSeverity('all')
    setOffice('all')
    setOwnerClass('all')
    setYear('all')
    setPage(0)
  }
  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const tabLabel = TABULATE_OPTIONS.find((o) => o.value === tabulate)?.label ?? tabulate
  const categories = freq.map((f) => f.value)
  const counts = freq.map((f) => f.count)

  return (
    <Panel tone="intel" label={label} status={`${shown} OF ${total} RECORDS`} className="dr-register">
      <p className="visually-hidden" aria-live="polite">
        {shown} of {total} records in view
      </p>

      <div className="dr-controls">
        <Segmented<Severity | 'all'> label="Severity" value={severity} options={[{ value: 'all', label: 'all' }, ...SEVERITY_ORDER.map((s) => ({ value: s, label: s }))]} onChange={withReset(setSeverity)} />
        <Segmented<Office | 'all'> label="Office" value={office} options={[{ value: 'all', label: 'all' }, ...OFFICE_ORDER.map((o) => ({ value: o, label: o }))]} onChange={withReset(setOffice)} />
        <Segmented<OwnerClass | 'all'> label="Owner class" value={ownerClass} options={[{ value: 'all', label: 'all' }, ...OWNER_ORDER.map((o) => ({ value: o, label: o }))]} onChange={withReset(setOwnerClass)} />
        <Segmented<YearOption> label="Year" value={year} options={YEARS.map((y) => ({ value: y, label: y }))} onChange={withReset(setYear)} />
        <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={resetFilters}>
          RESET FILTERS
        </button>
      </div>

      <section className="dr-register__freq" aria-label="Frequency panel">
        <div className="dr-controls">
          <Segmented<TabulateColumn> label="Tabulate" value={tabulate} options={TABULATE_OPTIONS} onChange={setTabulate} />
        </div>
        <div className="dr-register__freq-grid">
          <div className="dr-table-wrap">
            <table className="dr-table">
              <caption className="dr-table__caption">Frequency table · N = {shown} records in view</caption>
              <thead>
                <tr>
                  <th scope="col">Value</th>
                  <th scope="col">Count</th>
                  <th scope="col">Relative frequency</th>
                </tr>
              </thead>
              <tbody>
                {freq.map((f) => (
                  <tr key={f.value}>
                    <td>{f.value}</td>
                    <td>{f.count}</td>
                    <td>{shown > 0 ? fmt(f.relFreq, 3) : '—'}</td>
                  </tr>
                ))}
                <tr className="dr-register__total">
                  <td>Total</td>
                  <td>{shown}</td>
                  <td>{shown > 0 ? fmt(1, 3) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <BarChart
            categories={categories}
            values={counts}
            horizontal
            label={tabLabel}
            valueLabel="count"
            ariaLabel={`Bar chart of record counts by ${tabLabel} over the ${shown} records in view`}
            description={`Counts of each ${tabLabel} value among the records currently in view. Total ${shown}.`}
          />
        </div>
        <ReadoutRow>
          <Readout label="RECORDS IN VIEW" value={shown} tone="intel" />
          <Readout label="DENOMINATOR" value={shown} tone="intel" />
          <Readout label="SHARE OF ALL 2,200" value={fmt(shown / total, 3)} />
        </ReadoutRow>
      </section>

      {children}

      <section className="dr-register__records" aria-label="Record table">
        <div className="dr-table-wrap">
          <table className="dr-table dr-register__table">
            <caption className="dr-table__caption">Records in view · sorted by {REGISTER_COLUMNS.find((c) => c.key === sortKey)?.label ?? sortKey} {sortDir === 'asc' ? 'ascending' : 'descending'}</caption>
            <thead>
              <tr>
                {REGISTER_COLUMNS.map((c) => {
                  const active = c.key === sortKey
                  return (
                    <th key={c.key} scope="col" aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      <button type="button" className="dr-register__sort" onClick={() => onSort(c.key)} aria-label={`Sort by ${c.label}${active ? (sortDir === 'asc' ? ', currently ascending' : ', currently descending') : ''}`}>
                        {c.label}
                        <span className="dr-register__sort-mark" aria-hidden="true">
                          {active ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </span>
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.record_id}>
                  {REGISTER_COLUMNS.map((c) => (
                    <td key={c.key}>{cell(r, c.key)}</td>
                  ))}
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={REGISTER_COLUMNS.length} className="dr-table__note">
                    No records match the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="dr-register__pager">
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setPage(Math.max(0, pageIdx - 1))} disabled={pageIdx === 0}>
            PREV
          </button>
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setPage(Math.min(pageCount - 1, pageIdx + 1))} disabled={pageIdx >= pageCount - 1}>
            NEXT
          </button>
          <span className="dr-register__pager-text">
            rows {from}–{to} of {shown}
          </span>
        </div>
      </section>
    </Panel>
  )
}
