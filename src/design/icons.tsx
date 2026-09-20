/**
 * Original SVG iconography — simple 1.5px stroke line icons on a 24-unit grid, currentColor.
 * No third-party icon sets. Every icon is decorative by default (aria-hidden) unless a `title` is
 * given, in which case it becomes an accessible image.
 */
import type { SVGProps } from 'react'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number
  /** Accessible name; omit for decorative use. */
  title?: string
}

function Icon({ size = 18, title, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      className="dr-icon"
      {...rest}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  )
}

/** The corvette, seen from above: a narrow hull with a single drive bell. */
export const IconShip = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2.5 15 9v8l-3 3-3-3V9z" />
    <path d="M9 13H5.5L4 16h5M15 13h3.5L20 16h-5" />
    <path d="M10.5 20.5h3" />
  </Icon>
)

/** Sensor: an arc sweep with a contact. */
export const IconSensor = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 12 4 6.5" />
    <path d="M4 12a8 8 0 0 1 8-8" />
    <path d="M7.5 12a4.5 4.5 0 0 1 4.5-4.5" />
    <circle cx={12} cy={12} r={1.25} fill="currentColor" stroke="none" />
    <path d="M12 20a8 8 0 0 0 8-8" strokeDasharray="2 2.5" />
  </Icon>
)

/** Heat: a sink gauge with rising level. */
export const IconHeat = (p: IconProps) => (
  <Icon {...p}>
    <rect x={9} y={3} width={6} height={13} rx={3} />
    <path d="M12 8v8" />
    <circle cx={12} cy={18.5} r={2.5} />
    <path d="M18 5h2M18 9h2M18 13h2" />
  </Icon>
)

/** Alert: a hard-edged triangle, not a rounded warning glyph. */
export const IconAlert = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 21 19.5H3z" />
    <path d="M12 9.5v4.5" />
    <circle cx={12} cy={16.6} r={0.6} fill="currentColor" stroke="none" />
  </Icon>
)

/** Checkpoint: a gate/waypoint marker. */
export const IconCheckpoint = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 21V4h11l-2 3.5 2 3.5H5" />
    <path d="M9 21h-4" />
    <path d="M17 15l2 2 3-4" />
  </Icon>
)

/** Log: bound pages with rule lines. */
export const IconLog = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v15.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5Z" />
    <path d="M9 8h6M9 11.5h6M9 15h4" />
    <path d="M4.5 17.5h14" />
  </Icon>
)

/** Lock: sealed content. */
export const IconLock = (p: IconProps) => (
  <Icon {...p}>
    <rect x={5} y={10.5} width={14} height={10} rx={1.5} />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <path d="M12 14.5v2.5" />
  </Icon>
)

/** Complete: a bracketed tick. */
export const IconComplete = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4H4v16h3M17 4h3v16h-3" />
    <path d="m8 12.5 3 3 5-6" />
  </Icon>
)

/** Play / run. */
export const IconPlay = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4.5v15l12-7.5z" />
  </Icon>
)

/** Step: one increment. */
export const IconStep = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 5v14l9-7z" />
    <path d="M18 5v14" />
  </Icon>
)

/** Reset: a broken loop arrow. */
export const IconReset = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
    <path d="M4.5 4.5v4h4" />
  </Icon>
)

/** Pause. */
export const IconPause = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5v14M16 5v14" />
  </Icon>
)

/** Map: the mission map — a route with three waypoints. */
export const IconMap = (p: IconProps) => (
  <Icon {...p}>
    <circle cx={5} cy={18} r={2} />
    <circle cx={12} cy={7} r={2} />
    <circle cx={19} cy={15} r={2} />
    <path d="M6.5 16.5 10.6 8.6M13.6 8.4l4 5.2" />
  </Icon>
)

/** Settings: a slider rack. */
export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
    <circle cx={9} cy={7} r={1.75} fill="var(--dr-bg-1)" />
    <circle cx={15} cy={12} r={1.75} fill="var(--dr-bg-1)" />
    <circle cx={7} cy={17} r={1.75} fill="var(--dr-bg-1)" />
  </Icon>
)

/** Chevrons. */
export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
)
export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
)
export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)

/** Info. */
export const IconInfo = (p: IconProps) => (
  <Icon {...p}>
    <circle cx={12} cy={12} r={8.5} />
    <path d="M12 11v5" />
    <circle cx={12} cy={8} r={0.6} fill="currentColor" stroke="none" />
  </Icon>
)

/** Seed: a die face — reproducible randomness. */
export const IconSeed = (p: IconProps) => (
  <Icon {...p}>
    <rect x={4} y={4} width={16} height={16} rx={2} />
    <circle cx={8.5} cy={8.5} r={1} fill="currentColor" stroke="none" />
    <circle cx={15.5} cy={8.5} r={1} fill="currentColor" stroke="none" />
    <circle cx={12} cy={12} r={1} fill="currentColor" stroke="none" />
    <circle cx={8.5} cy={15.5} r={1} fill="currentColor" stroke="none" />
    <circle cx={15.5} cy={15.5} r={1} fill="currentColor" stroke="none" />
  </Icon>
)

/** Table / data. */
export const IconTable = (p: IconProps) => (
  <Icon {...p}>
    <rect x={4} y={5} width={16} height={14} rx={1} />
    <path d="M4 10h16M4 14.5h16M10 10v9" />
  </Icon>
)

/** Chart: a tactical plot. */
export const IconChart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4v16h16" />
    <path d="M7.5 15.5 11 10l3 3 4.5-6" />
  </Icon>
)

/** Drill / target. */
export const IconDrill = (p: IconProps) => (
  <Icon {...p}>
    <circle cx={12} cy={12} r={8} />
    <circle cx={12} cy={12} r={4} />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </Icon>
)

/** Intel: a folder tab. */
export const IconIntel = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 6.5h6l2 2h9v10.5h-17z" />
    <path d="M3.5 12h17" />
  </Icon>
)

/** Engineering: a wrench-free gauge. */
export const IconEngineering = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 16a8 8 0 0 1 16 0" />
    <path d="M12 16l3.5-5" />
    <circle cx={12} cy={16} r={1.25} fill="currentColor" stroke="none" />
    <path d="M4 19.5h16" />
  </Icon>
)

/** Clock / mission elapsed time. */
export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx={12} cy={12} r={8.5} />
    <path d="M12 7.5V12l3 2" />
  </Icon>
)

/** Drag handle. */
export const IconDrag = (p: IconProps) => (
  <Icon {...p}>
    <circle cx={9} cy={7} r={0.9} fill="currentColor" stroke="none" />
    <circle cx={15} cy={7} r={0.9} fill="currentColor" stroke="none" />
    <circle cx={9} cy={12} r={0.9} fill="currentColor" stroke="none" />
    <circle cx={15} cy={12} r={0.9} fill="currentColor" stroke="none" />
    <circle cx={9} cy={17} r={0.9} fill="currentColor" stroke="none" />
    <circle cx={15} cy={17} r={0.9} fill="currentColor" stroke="none" />
  </Icon>
)

/** Search. */
export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx={10.5} cy={10.5} r={6} />
    <path d="m15 15 5 5" />
  </Icon>
)

/** Tone-to-icon mapping for panel headers. */
export const toneIcons = {
  tactical: IconChart,
  sensor: IconSensor,
  engineering: IconEngineering,
  intel: IconIntel,
  log: IconLog,
  alert: IconAlert,
  default: IconInfo,
} as const

/** Everything, for the style reference. */
export const allIcons = {
  IconShip,
  IconSensor,
  IconHeat,
  IconAlert,
  IconCheckpoint,
  IconLog,
  IconLock,
  IconComplete,
  IconPlay,
  IconStep,
  IconPause,
  IconReset,
  IconMap,
  IconSettings,
  IconChevronRight,
  IconChevronLeft,
  IconChevronDown,
  IconInfo,
  IconSeed,
  IconTable,
  IconChart,
  IconDrill,
  IconIntel,
  IconEngineering,
  IconClock,
  IconDrag,
  IconSearch,
} as const
