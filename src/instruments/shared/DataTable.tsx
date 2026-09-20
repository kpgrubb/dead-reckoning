/**
 * Accessible data-table fallback rendered by every chart primitive (visually hidden by default).
 */
export interface TableRows {
  columns: string[]
  rows: (string | number)[][]
  caption?: string
}

export interface DataTableProps extends TableRows {
  id?: string
  className?: string
  /** Cap rendered rows (large simulations); a final row notes the truncation. */
  maxRows?: number
}

export function DataTable({ id, columns, rows, caption, className, maxRows = 500 }: DataTableProps) {
  const shown = rows.length > maxRows ? rows.slice(0, maxRows) : rows
  return (
    <table id={id} className={['dr-table', className].filter(Boolean).join(' ')}>
      {caption && <caption className="dr-table__caption">{caption}</caption>}
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={`${c}-${i}`} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {shown.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{typeof c === 'number' ? formatCell(c) : c}</td>
            ))}
          </tr>
        ))}
        {rows.length > maxRows && (
          <tr>
            <td colSpan={columns.length} className="dr-table__note">
              … {rows.length - maxRows} more rows not shown
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

function formatCell(v: number): string {
  if (!Number.isFinite(v)) return '—'
  if (Number.isInteger(v)) return String(v)
  const s = Number(v.toPrecision(6)).toString()
  return s.replace(/^-/, '−')
}
