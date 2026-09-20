/**
 * Instrument controls: Slider, NumberField, Segmented, Readout, Legend. Styled as bridge controls,
 * keyboard-operable, each with a mono label and a live value readout.
 */
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'

/* ---------- Slider ---------- */
export interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  units?: string
  onChange: (v: number) => void
  format?: (v: number) => string
  disabled?: boolean
  /** Show min/max under the track. */
  showRange?: boolean
  className?: string
}

export function Slider({ label, value, min, max, step = 1, units, onChange, format, disabled, showRange = true, className }: SliderProps) {
  const id = useId()
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0
  const shown = format ? format(value) : String(value)
  return (
    <div className={['dr-slider', className].filter(Boolean).join(' ')}>
      <div className="dr-slider__head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="dr-slider__value" aria-live="off">
          {shown}
          {units && <span className="dr-slider__value-units">{units}</span>}
        </output>
      </div>
      <input
        id={id}
        className="dr-slider__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${shown}${units ? ' ' + units : ''}`}
        style={{ ['--dr-slider-fill' as string]: `${pct}%` }}
      />
      {showRange && (
        <div className="dr-slider__ticks" aria-hidden="true">
          <span>{format ? format(min) : min}</span>
          <span>{format ? format(max) : max}</span>
        </div>
      )}
    </div>
  )
}

/* ---------- NumberField ---------- */
export interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  units?: string
  /** Show −/+ stepper buttons. */
  stepper?: boolean
  disabled?: boolean
  className?: string
}

export function NumberField({ label, value, onChange, min, max, step = 1, units, stepper = true, disabled, className }: NumberFieldProps) {
  const id = useId()
  const [text, setText] = useState<string | null>(null)
  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))
  const invalid = text !== null && !Number.isFinite(Number(text))
  const commit = () => {
    if (text === null) return
    const n = Number(text)
    if (Number.isFinite(n)) onChange(clamp(n))
    setText(null)
  }
  const nudge = (d: number) => onChange(clamp(Number((value + d * step).toPrecision(12))))
  return (
    <div className={['dr-numfield', className].filter(Boolean).join(' ')}>
      <div className="dr-numfield__head">
        <label htmlFor={id}>{label}</label>
        {units && <span className="dr-numfield__value">{units}</span>}
      </div>
      <div className="dr-numfield__wrap">
        {stepper && (
          <button type="button" className="dr-numfield__step" aria-label={`Decrease ${label}`} onClick={() => nudge(-1)} disabled={disabled || (min !== undefined && value <= min)}>
            −
          </button>
        )}
        <input
          id={id}
          className="dr-numfield__input"
          type="text"
          inputMode="decimal"
          value={text ?? String(value)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              nudge(e.shiftKey ? 10 : 1)
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              nudge(e.shiftKey ? -10 : -1)
            }
          }}
        />
        {stepper && (
          <button type="button" className="dr-numfield__step" aria-label={`Increase ${label}`} onClick={() => nudge(1)} disabled={disabled || (max !== undefined && value >= max)}>
            +
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------- Segmented ---------- */
export interface SegmentedOption<T extends string> {
  value: T
  label: string
  disabled?: boolean
}

export interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (v: T) => void
  disabled?: boolean
  className?: string
}

/** Radio-group semantics; arrow keys move selection. */
export function Segmented<T extends string>({ label, value, options, onChange, disabled, className }: SegmentedProps<T>) {
  const id = useId()
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = options.findIndex((o) => o.value === value)
    let next = idx
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % options.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + options.length) % options.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = options.length - 1
    else return
    e.preventDefault()
    const opt = options[next]
    if (opt && !opt.disabled) {
      onChange(opt.value)
      const btn = (e.currentTarget.querySelectorAll('[role="radio"]')[next] as HTMLElement | undefined)
      btn?.focus()
    }
  }
  return (
    <div className={['dr-seg', className].filter(Boolean).join(' ')}>
      <div className="dr-seg__head">
        <span id={`${id}-label`}>{label}</span>
      </div>
      <div className="dr-seg__group" role="radiogroup" aria-labelledby={`${id}-label`} onKeyDown={onKey}>
        {options.map((o) => {
          const checked = o.value === value
          return (
            <button key={o.value} type="button" role="radio" aria-checked={checked} tabIndex={checked ? 0 : -1} className="dr-seg__btn" disabled={disabled || o.disabled} onClick={() => onChange(o.value)}>
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Readout ---------- */
export interface ReadoutProps {
  label: string
  value: ReactNode
  units?: string
  tone?: 'default' | 'tactical' | 'sensor' | 'engineering' | 'intel' | 'log' | 'alert'
  size?: 'sm' | 'md' | 'lg'
  /** Grey the value (e.g. before a run). */
  stale?: boolean
  /** Announce changes to screen readers. */
  live?: boolean
  className?: string
}

export function Readout({ label, value, units, tone = 'default', size = 'md', stale, live = false, className }: ReadoutProps) {
  return (
    <div className={['dr-readout', `dr-readout--${tone}`, `dr-readout--${size}`, stale ? 'is-stale' : '', className].filter(Boolean).join(' ')} aria-live={live ? 'polite' : undefined}>
      <span className="dr-readout__label">{label}</span>
      <span className="dr-readout__value">
        {value}
        {units && <span className="dr-readout__units">{units}</span>}
      </span>
    </div>
  )
}

/** Horizontal group of readouts. */
export function ReadoutRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={['dr-readout-row', className].filter(Boolean).join(' ')}>{children}</div>
}

/* ---------- Legend ---------- */
export interface LegendItem {
  label: string
  /** Colour token, e.g. seriesColor(0) or semanticColor('null'). */
  color: string
  shape?: 'square' | 'line' | 'dot' | 'dashed' | 'area'
  /** Optional value shown after the label. */
  value?: string
  muted?: boolean
}

export function Legend({ items, className, ariaLabel = 'Legend' }: { items: readonly LegendItem[]; className?: string; ariaLabel?: string }) {
  return (
    <ul className={['dr-legend', className].filter(Boolean).join(' ')} aria-label={ariaLabel}>
      {items.map((it, i) => (
        <li key={i} className={['dr-legend__item', it.muted ? 'is-muted' : ''].filter(Boolean).join(' ')}>
          <Swatch color={it.color} shape={it.shape ?? 'square'} />
          <span>{it.label}</span>
          {it.value && <span className="dr-legend__value">{it.value}</span>}
        </li>
      ))}
    </ul>
  )
}

function Swatch({ color, shape }: { color: string; shape: NonNullable<LegendItem['shape']> }) {
  return (
    <svg className="dr-legend__swatch" viewBox="0 0 14 14" aria-hidden="true">
      {shape === 'square' && <rect x={1} y={1} width={12} height={12} rx={2} fill={color} />}
      {shape === 'area' && <rect x={1} y={1} width={12} height={12} rx={2} fill={color} fillOpacity={0.35} stroke={color} />}
      {shape === 'line' && <line x1={0} x2={14} y1={7} y2={7} stroke={color} strokeWidth={2} />}
      {shape === 'dashed' && <line x1={0} x2={14} y1={7} y2={7} stroke={color} strokeWidth={2} strokeDasharray="3 2" />}
      {shape === 'dot' && <circle cx={7} cy={7} r={4} fill={color} />}
    </svg>
  )
}
