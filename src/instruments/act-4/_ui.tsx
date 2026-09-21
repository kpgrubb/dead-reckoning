/**
 * Private presentational helpers for the Act IV instruments (not exported from the Act's index).
 *
 *   Note            a mono caption line under a chart or control row
 *   Subhead         a small uppercase section head inside a Panel
 *   KeyTable        a small mono table (pmfs, two-way tables, sample spaces, the sink ledger)
 *   ProbabilityBar  a horizontal 0–1 bar for a probability, with its complement
 *   SinkReadout     the cellar gauge every Act IV instrument can carry in its Panel status line
 *   oneIn           "1 in N" phrasing for a small probability
 *   pctBand         the tone a sink percentage should wear
 *
 * Numbers shown here are formatted only; every statistic is computed by the caller from `@/lib/stats`.
 */
import type { CSSProperties, ReactNode } from 'react'
import { chartTheme } from '@/instruments/shared'
import { fmt, fmtPct } from '@/lib/stats'
import './act-4.css'

/* ---------- Layout ---------- */

export const stackStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--dr-sp-3)' }
export const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--dr-sp-4)' }
export const wideGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--dr-sp-4)' }

export const subheadStyle: CSSProperties = {
  margin: 'var(--dr-sp-3) 0 var(--dr-sp-2)',
  fontFamily: 'var(--dr-font-mono)',
  fontSize: 'var(--dr-fs-2xs)',
  letterSpacing: 'var(--dr-track-label)',
  textTransform: 'uppercase',
  color: 'var(--dr-fg-2)',
}

export function Subhead({ children }: { children: ReactNode }) {
  return <h4 style={subheadStyle}>{children}</h4>
}

export type NoteTone = 'muted' | 'alert' | 'ok' | 'warn'

export function Note({ children, tone = 'muted', live = false }: { children: ReactNode; tone?: NoteTone; live?: boolean }) {
  const color = tone === 'alert' ? 'var(--dr-alert)' : tone === 'ok' ? 'var(--dr-phosphor)' : tone === 'warn' ? 'var(--dr-amber)' : 'var(--dr-fg-2)'
  return (
    <p className="dr-chart__caption" style={{ color }} aria-live={live ? 'polite' : undefined}>
      {children}
    </p>
  )
}

/* ---------- Key table ---------- */

export interface KeyTableProps {
  columns: readonly string[]
  rows: readonly (readonly ReactNode[])[]
  caption?: string
  ariaLabel?: string
  /** Index of a row to render emphasised (e.g. a TOTAL row). */
  emphasisRow?: number
  /** Indices of rows to render in the alert colour. */
  alertRows?: readonly number[]
}

export function KeyTable({ columns, rows, caption, ariaLabel, emphasisRow, alertRows }: KeyTableProps) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--dr-line)', borderRadius: 'var(--dr-radius)' }}>
      <table className="dr-table" aria-label={ariaLabel}>
        {caption && <caption className="dr-table__caption">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={i === emphasisRow ? { color: 'var(--dr-fg-0)', fontWeight: 600 } : alertRows?.includes(i) ? { color: 'var(--dr-alert)' } : undefined}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- Probability bar ---------- */

export interface ProbabilityBarProps {
  /** 0–1. */
  value: number
  label: string
  /** Label for the remaining area; omit to leave the complement unlabelled. */
  complementLabel?: string
  color?: string
  digits?: number
}

/** A 0–1 bar: the event in colour, its complement in the surface tone, both labelled. */
export function ProbabilityBar({ value, label, complementLabel, color = chartTheme.color.series[0], digits = 3 }: ProbabilityBarProps) {
  const pct = Math.min(100, Math.max(0, value * 100))
  return (
    <div className="dr-probbar">
      <div className="dr-probbar__head">
        <span className="dr-probbar__label">{label}</span>
        <span className="dr-probbar__value">{fmt(value, digits)}</span>
      </div>
      <div className="dr-probbar__track" role="img" aria-label={`${label}: ${fmtPct(value, 1)} of the sample space${complementLabel ? `; ${complementLabel}: ${fmtPct(1 - value, 1)}` : ''}`}>
        <div className="dr-probbar__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {complementLabel && (
        <div className="dr-probbar__foot">
          <span>{complementLabel}</span>
          <span>{fmt(1 - value, digits)}</span>
        </div>
      )}
    </div>
  )
}

/* ---------- The cellar ---------- */

export function pctBand(sinkPct: number): 'ok' | 'warn' | 'alert' {
  if (sinkPct >= 90) return 'alert'
  if (sinkPct >= 60) return 'warn'
  return 'ok'
}

/** The sink gauge as a Panel `status` string: "CELLAR 54%". */
export function sinkStatus(sinkPct: number): string {
  return `CELLAR ${fmt(sinkPct, 0)}%`
}

export interface SinkReadoutProps {
  sinkPct: number
  /** Optional MET stamp shown beside the gauge. */
  stamp?: string
  /** Optional profile name ("Watch", "Quiet", "purging"). */
  profile?: string
}

/** A thin cellar gauge for an instrument header: fill, percentage, and the profile burning it. */
export function SinkReadout({ sinkPct, stamp, profile }: SinkReadoutProps) {
  const band = pctBand(sinkPct)
  const color = band === 'alert' ? 'var(--dr-alert)' : band === 'warn' ? 'var(--dr-amber)' : 'var(--dr-phosphor)'
  return (
    <div className="dr-sink" role="img" aria-label={`Heat sink at ${fmt(sinkPct, 0)} percent${profile ? ` on ${profile}` : ''}${stamp ? ` at ${stamp}` : ''}`}>
      <span className="dr-sink__label">cellar</span>
      <span className="dr-sink__track">
        <span className="dr-sink__fill" style={{ width: `${Math.min(100, Math.max(0, sinkPct))}%`, background: color }} />
      </span>
      <span className="dr-sink__value" style={{ color }}>
        {fmt(sinkPct, 0)}%
      </span>
      {profile && <span className="dr-sink__profile">{profile}</span>}
      {stamp && <span className="dr-sink__stamp">{stamp}</span>}
    </div>
  )
}

/* ---------- Phrasing ---------- */

/** "1 in N" phrasing for a small probability. */
export function oneIn(p: number): string {
  if (!(p > 0) || !Number.isFinite(p)) return '—'
  const n = 1 / p
  if (n < 1.5) return '≈ 1 in 1'
  if (n >= 1e6) return `1 in ${(n / 1e6).toPrecision(2)} million`
  return `1 in ${Math.round(n).toLocaleString('en-US')}`
}

/** "about two in a hundred" — plain-language phrasing for a simulated probability. */
export function inAHundred(p: number): string {
  const per100 = p * 100
  if (per100 < 0.5) return `fewer than one run in two hundred`
  return `about ${Math.round(per100)} in a hundred`
}
