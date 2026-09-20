/**
 * Chart theme — the single place charts learn colours, fonts, margins and mark specs.
 *
 * Everything is expressed as CSS custom properties (`var(--dr-…)`) so SVG marks re-theme with the
 * page (default ↔ high-contrast) without re-rendering. Canvas renderers cannot read `var()`, so they
 * call `resolveToken()` once per draw to get the computed colour.
 *
 * Semantic slots (use these, not raw series indices, when the meaning is known):
 *   null       reference / null-hypothesis distribution           (steel)
 *   alt        alternative / observed sample                       (cyan)
 *   rejected   rejection region, hostile track, rejected null      (red)
 *   fit        least-squares line, model curve                     (phosphor)
 *   residual   residual bars / deviations                          (amber)
 *   reference  mean / zero / threshold lines                       (steel)
 *   observed   observed statistic marker                           (amber)
 *   shade      shaded probability area                             (phosphor wash)
 */
import { scaleOrdinal } from 'd3'

export const SERIES_COUNT = 5

/** Categorical mark colours in fixed order. Slot 5 (steel) is the neutral reference slot. */
export const seriesTokens = [
  'var(--dr-series-1)',
  'var(--dr-series-2)',
  'var(--dr-series-3)',
  'var(--dr-series-4)',
  'var(--dr-series-5)',
] as const

export type SemanticColor =
  | 'null'
  | 'alt'
  | 'rejected'
  | 'fit'
  | 'residual'
  | 'reference'
  | 'observed'
  | 'shade'
  | 'shadeAlt'
  | 'shadeRejected'
  | 'shadeCaution'
  | 'selected'

export const semanticTokens: Record<SemanticColor, string> = {
  null: 'var(--dr-chart-null)',
  alt: 'var(--dr-chart-alt)',
  rejected: 'var(--dr-chart-rejected)',
  fit: 'var(--dr-chart-fit)',
  residual: 'var(--dr-chart-residual)',
  reference: 'var(--dr-chart-reference)',
  observed: 'var(--dr-chart-observed)',
  shade: 'var(--dr-chart-shade)',
  shadeAlt: 'var(--dr-chart-shade-alt)',
  shadeRejected: 'var(--dr-chart-shade-rejected)',
  shadeCaution: 'var(--dr-chart-shade-caution)',
  selected: 'var(--dr-chart-selected)',
}

export const chartTheme = {
  font: {
    mono: 'var(--dr-font-mono)',
    ui: 'var(--dr-font-ui)',
  },
  fontSize: {
    tick: 11,
    label: 12,
    readout: 13,
  },
  color: {
    surface: 'var(--dr-chart-surface)',
    grid: 'var(--dr-chart-grid)',
    axis: 'var(--dr-chart-axis)',
    tick: 'var(--dr-chart-tick)',
    label: 'var(--dr-chart-label)',
    title: 'var(--dr-chart-title)',
    ring: 'var(--dr-chart-ring)',
    series: seriesTokens,
    ...semanticTokens,
  },
  /** Default plot margins (px). Left grows when a y-axis label is present. */
  margin: { top: 12, right: 14, bottom: 40, left: 46 },
  marginWithYLabel: { top: 12, right: 14, bottom: 40, left: 62 },
  stroke: {
    line: 2,
    hair: 1,
    fit: 2,
    reference: 1,
  },
  mark: {
    /** Dot radius (≥ 4 → 8px marker). */
    dotR: 4,
    /** Surface ring width around dots. */
    ring: 2,
    /** Gap between adjacent bars, in surface colour. */
    gap: 2,
    /** Cap on bar thickness — never fill the slot. */
    barMax: 28,
    /** Rounded data-end radius on bars. */
    barRadius: 2,
    /** Mark fill alpha (1 in high contrast). */
    alpha: 'var(--dr-chart-mark-alpha)',
  },
  /** Above this many points, dot/scatter renderers switch from per-point SVG to canvas. */
  canvasThreshold: 2000,
  /** Dash pattern for reference lines. */
  dash: '4 3',
} as const

/** Series colour by index (wraps past the categorical set — avoid; fold extra series into "other"). */
export function seriesColor(i: number): string {
  return seriesTokens[((i % SERIES_COUNT) + SERIES_COUNT) % SERIES_COUNT]
}

/** D3 ordinal scale over the series tokens — feed it category names. */
export function seriesScale(domain?: readonly string[]) {
  const s = scaleOrdinal<string, string>().range([...seriesTokens])
  if (domain) s.domain([...domain])
  return s
}

/** Semantic colour by slot name. */
export function semanticColor(slot: SemanticColor): string {
  return semanticTokens[slot]
}

const tokenCache = new WeakMap<Element, Map<string, string>>()

/**
 * Resolve a `var(--dr-…)` (or bare `--dr-…`) token to its computed colour string for canvas drawing.
 * Cached per element until `invalidateTokenCache()` — call that when the theme changes.
 */
export function resolveToken(token: string, el?: Element | null): string {
  if (typeof window === 'undefined') return token
  const name = token.startsWith('var(') ? token.slice(4, -1).trim() : token
  const target = el ?? document.documentElement
  let cache = tokenCache.get(target)
  if (!cache) {
    cache = new Map()
    tokenCache.set(target, cache)
  }
  const hit = cache.get(name)
  if (hit) return hit
  const v = getComputedStyle(target).getPropertyValue(name).trim()
  const out = v || token
  cache.set(name, out)
  return out
}

export function invalidateTokenCache(el?: Element | null) {
  if (el) tokenCache.delete(el)
  else if (typeof document !== 'undefined') tokenCache.delete(document.documentElement)
}

/** Current motion duration in ms for a token (`--dr-dur`, `--dr-dur-fast`, `--dr-dur-slow`). 0 under reduced motion. */
export function motionDuration(token: '--dr-dur' | '--dr-dur-fast' | '--dr-dur-slow' = '--dr-dur'): number {
  if (typeof window === 'undefined') return 0
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return 0
  return v.endsWith('ms') ? n : n * 1000
}

/** Convenience: SVG text attributes for tick labels. */
export const tickTextProps = {
  fill: chartTheme.color.tick,
  fontFamily: chartTheme.font.mono,
  fontSize: chartTheme.fontSize.tick,
} as const

/** Convenience: SVG text attributes for axis titles. */
export const labelTextProps = {
  fill: chartTheme.color.label,
  fontFamily: chartTheme.font.ui,
  fontSize: chartTheme.fontSize.label,
} as const
