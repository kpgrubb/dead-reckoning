/**
 * Content schema — the contract between MDX modules and the app shell.
 *
 * Every file under `content/act-N/` is an MDX micro-module with this frontmatter (see CLAUDE.md §7).
 * The Vite plugin `plugins/content-manifest.ts` surfaces it as `virtual:content-manifest`.
 */

/** Act numbering: 0 = Prologue, 1–9 = AP Units 1–9, 10 = Epilogue. */
export type ActNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type ModuleKind = 'module' | 'checkpoint' | 'interlude'

export interface ModuleFrontmatter {
  /** Unique id, e.g. "act-4-03". Checkpoints: "act-4-checkpoint". Prologue: "act-0-01". */
  id: string
  act: ActNumber
  title: string
  /** Defaults to "module". Checkpoints render the Act assessment; interludes are story-only. */
  kind?: ModuleKind
  /** College Board CED topic codes, e.g. ["4.10", "4.11"]. Empty for story-only modules. */
  ap_topics?: string[]
  /** Learning objectives in learner-facing language. */
  objectives?: string[]
  /** Module ids that must be complete before this unlocks. */
  prereqs?: string[]
  /** Estimated minutes for a focused session. */
  est_minutes: number
  /** Id of a calc briefing topic (see src/lib/calc/topics.ts) or null. */
  calc_briefing?: string | null
  /** One-line teaser for the mission map. */
  summary?: string
}

/** Manifest entry: frontmatter plus the root-relative path used to lazy-load the module body. */
export interface ModuleMeta extends ModuleFrontmatter {
  path: string
}

export const ACT_TITLES: Record<ActNumber, { code: string; title: string; apUnit: string | null }> = {
  0: { code: 'PROLOGUE', title: 'Shakedown', apUnit: null },
  1: { code: 'ACT I', title: 'Signatures', apUnit: 'Unit 1 · Exploring One-Variable Data' },
  2: { code: 'ACT II', title: 'Manifests', apUnit: 'Unit 2 · Exploring Two-Variable Data' },
  3: { code: 'ACT III', title: 'Testimony', apUnit: 'Unit 3 · Collecting Data' },
  4: { code: 'ACT IV', title: 'Running Cold', apUnit: 'Unit 4 · Probability, Random Variables & Distributions' },
  5: { code: 'ACT V', title: 'Noise Floor', apUnit: 'Unit 5 · Sampling Distributions' },
  6: { code: 'ACT VI', title: 'Accusation', apUnit: 'Unit 6 · Inference for Proportions' },
  7: { code: 'ACT VII', title: 'Halden Reach', apUnit: 'Unit 7 · Inference for Means' },
  8: { code: 'ACT VIII', title: 'Kettle', apUnit: 'Unit 8 · Chi-Square' },
  9: { code: 'ACT IX', title: 'Intent', apUnit: 'Unit 9 · Inference for Slopes' },
  10: { code: 'EPILOGUE', title: 'Provident', apUnit: null },
}
