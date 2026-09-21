/**
 * Act VI story components — the decisions the Act records, and the two register displays that
 * appear in more than one module.
 *
 * Structural rule (beat sheet §4): decisions colour flavour text and nothing else. No Act VI
 * decision changes which datasets exist, which modules run, or what any beat's answer is.
 *
 *   act-6-03-register        whose copy of the claims register you take (Renn's / Okafor-Reyes's)
 *   act-6-06-alpha           α for the accusation: 0.05 or 0.01 — read back by 6-08 and the Epilogue
 *   act-6-08-flag-secretary  whether the Flag Secretary is copied on the transmission
 */
import type { ReactNode } from 'react'
import { useProgress } from '@/store/progress'
import { fmt, fmtInt } from '@/lib/stats'
import { KeyTable } from './_ui'
import { OTHER_TRANSITS, PERRINE_HOLDINGS, PERRINE_TRANSITS, beneficiaryTable, beneficiaryTally, claims } from './data'

export const DECISION_IDS = {
  register: 'act-6-03-register',
  alpha: 'act-6-06-alpha',
  flagSecretary: 'act-6-08-flag-secretary',
} as const

export function useDecision(id: string): string | undefined {
  return useProgress((s) => s.decisions[id])
}

export type Match = 'renn' | 'okafor' | 'alpha05' | 'alpha01' | 'copy' | 'no-copy' | 'undecided'

function matches(id: string, choice: string | undefined, is: Match): boolean {
  if (is === 'undecided') return !choice
  if (id === DECISION_IDS.register) {
    const renn = !!choice && /renn/i.test(choice)
    return is === 'renn' ? renn : is === 'okafor' ? !!choice && !renn : false
  }
  if (id === DECISION_IDS.alpha) {
    const strict = !!choice && /0\.01\b/.test(choice)
    return is === 'alpha01' ? strict : is === 'alpha05' ? !strict : false
  }
  if (id === DECISION_IDS.flagSecretary) {
    const copied = !choice || /\bcopy\b/i.test(choice)
    return is === 'copy' ? copied : is === 'no-copy' ? !copied : false
  }
  return false
}

/** Render children only when the recorded decision matches. Undecided α reads as the default 0.05. */
export function Decided({ id, is, children }: { id: string; is: Match; children?: ReactNode }) {
  return matches(id, useDecision(id), is) ? <>{children}</> : null
}

/**
 * The significance level the learner set in 6-06. Before that beat — and in 6-05, where the
 * conclusion is written at the conventional level — this is 0.05, which is what the module says.
 */
export function useChosenAlpha(): number {
  const choice = useDecision(DECISION_IDS.alpha)
  return choice && /0\.01\b/.test(choice) ? 0.01 : 0.05
}

/** Inline: "α = 0.01". Use inside prose so later modules quote the learner's own decision. */
export function ChosenAlpha({ prefix = 'α = ' }: { prefix?: string }) {
  const alpha = useChosenAlpha()
  return (
    <span className="dr-mono">
      {prefix}
      {fmt(alpha, alpha < 0.05 ? 3 : 2)}
    </span>
  )
}

/** DS-10 as the Ceres office prints it — an extract, sorted so the beneficiary column speaks. */
export function ClaimsRegisterTable({ rows = 12 }: { rows?: number }) {
  const sorted = [...claims].sort((a, b) => a.date_paid.localeCompare(b.date_paid))
  const shown = sorted.slice(0, rows)
  return (
    <KeyTable
      caption={`Authority claims office, Ceres · settled claims, 2178–2184 · ${fmtInt(claims.length)} rows (${fmtInt(shown.length)} shown)`}
      ariaLabel="Claims register extract: hull, policy holder, beneficiary, insurer, payout and settlement date"
      columns={['hull', 'policy holder', 'beneficiary', 'insurer', 'payout (M₵)', 'paid']}
      rows={shown.map((c) => [c.hull, c.policy_holder, c.beneficiary, c.insurer, fmt(c.payout, 1), c.date_paid])}
    />
  )
}

/** Who was paid, and how often — the display 6-03 opens on. */
export function BeneficiaryTally() {
  return (
    <KeyTable
      caption="Beneficiaries named on the thirty-one settled claims"
      ariaLabel="Beneficiaries of the thirty-one settled loss claims, with hulls and total paid"
      columns={['beneficiary', 'hulls', 'paid (M₵)']}
      rows={beneficiaryTally.map((b) => [b.beneficiary, fmtInt(b.hulls), fmt(b.paid, 0)])}
      emphasisRow={0}
    />
  )
}

/** The 2×2 the accusation is built on: beneficiary class against outcome, over 2,612 transits. */
export function BeneficiaryTwoWay() {
  const [perrine, other] = beneficiaryTable
  return (
    <KeyTable
      caption={`Transit Ledger 2178 → MET 0 · ${fmtInt(PERRINE_TRANSITS + OTHER_TRANSITS)} transits by beneficiary class and outcome`}
      ariaLabel="Two-way table of beneficiary class against outcome for every Lane transit in the Ledger"
      columns={['beneficiary', 'lost', 'arrived', 'transits']}
      rows={[
        [PERRINE_HOLDINGS, fmtInt(perrine.lost), fmtInt(perrine.arrived), fmtInt(perrine.transits)],
        ['all other beneficiaries', fmtInt(other.lost), fmtInt(other.arrived), fmtInt(other.transits)],
        ['total', fmtInt(perrine.lost + other.lost), fmtInt(perrine.arrived + other.arrived), fmtInt(perrine.transits + other.transits)],
      ]}
      emphasisRow={2}
    />
  )
}

/** Renders its children only once the Act VI checkpoint has been passed. */
export function PassGate({ act = 'act-6', children, fallback }: { act?: string; children: ReactNode; fallback?: ReactNode }) {
  const passed = useProgress((s) => !!s.checkpoints[act]?.passed)
  if (passed) return <>{children}</>
  return fallback ? <>{fallback}</> : null
}
