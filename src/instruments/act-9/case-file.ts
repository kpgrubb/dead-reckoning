/**
 * The case file — act-9-04's answer key.
 *
 * Fourteen findings, from Act I's two piles to the slope that closes Book One. Each carries the
 * procedure that produced it, the conclusion it is entitled to, and the limit the board requires
 * beside it. Transcribed verbatim from `docs/beat-sheet.md`, module block `act-9-04`; the order is
 * the beat sheet's order, which is the order the case was built in.
 *
 * Two rows name two procedures. Their `procedure` field is the first one listed; `EvidenceBoard`
 * accepts the second as well, because the row does.
 *
 * Nothing here is computed. It is a key, not a dataset: the numbers inside the conclusion strings
 * are the beat sheet's own words for findings whose figures are computed and asserted in the Act
 * that produced them.
 */

export type Procedure =
  | 'description'
  | 'regression-residuals'
  | 'bias-identification'
  | 'randomization-test'
  | 'simulation'
  | 'two-proportion-z'
  | 'one-sample-t-interval'
  | 'paired-t'
  | 'two-sample-t'
  | 'chi-square-gof'
  | 'chi-square-independence'
  | 'chi-square-homogeneity'
  | 'permutation'
  | 'observation'
  | 'slope-t-interval'
  | 'slope-t-test'

export interface Finding {
  id: string
  modules: string[]
  finding: string
  procedure: Procedure
  conclusion: string
  limit: string
}

export const PROCEDURE_LABEL: Record<Procedure, string> = {
  description: 'Description (dotplot, comparison)',
  'regression-residuals': 'Regression residuals',
  'bias-identification': 'Bias identification',
  'randomization-test': 'Randomization test',
  simulation: 'Simulation',
  'two-proportion-z': 'Two-proportion z-test, pooled',
  'one-sample-t-interval': 'One-sample t-interval',
  'paired-t': 'Paired t',
  'two-sample-t': 'Two-sample t (Welch)',
  'chi-square-gof': 'χ² goodness of fit',
  'chi-square-independence': 'χ² independence',
  'chi-square-homogeneity': 'χ² homogeneity',
  permutation: 'Simulation (permutation), not χ²',
  observation: 'None — observation',
  'slope-t-interval': 'Slope t-interval',
  'slope-t-test': 'Slope t-test (β = 0; β = β₀)',
}

/** Every procedure the board offers, in the order the course met them. */
export const ALL_PROCEDURES: readonly Procedure[] = [
  'description',
  'observation',
  'bias-identification',
  'regression-residuals',
  'simulation',
  'randomization-test',
  'permutation',
  'two-proportion-z',
  'one-sample-t-interval',
  'paired-t',
  'two-sample-t',
  'chi-square-gof',
  'chi-square-independence',
  'chi-square-homogeneity',
  'slope-t-interval',
  'slope-t-test',
]

export const CASE_FILE: readonly Finding[] = [
  {
    id: 'two-piles',
    modules: ['1-04', '1-06'],
    finding: 'Two piles; Mark 9–10 cluster',
    procedure: 'description',
    conclusion: 'Two processes; late and cheap',
    limit: 'Descriptive; no inference',
  },
  {
    id: 'nineteen-heavy-hulls',
    modules: ['2-04'],
    finding: 'Nineteen heavy hulls',
    procedure: 'regression-residuals',
    conclusion: 'Declared mass understated 6–13% for 19 lost hulls',
    limit: 'Instrument model; no cause',
  },
  {
    id: 'survey-bias-escort-trial',
    modules: ['3-03', '3-05'],
    finding: 'Survey bias; escort trial',
    procedure: 'bias-identification',
    conclusion: "Board's testimony and trial cannot support piracy or deterrence",
    limit: 'Small n; no claim about losses',
  },
  {
    id: 'clustered-dates',
    modules: ['4-01'],
    finding: 'Clustered dates',
    procedure: 'simulation',
    conclusion: 'Spring-2182 cluster rare under randomness',
    limit: 'Simulated; one statistic',
  },
  {
    id: 'perrine-loss-rate',
    modules: ['6-08'],
    finding: 'Perrine loss rate',
    procedure: 'two-proportion-z',
    conclusion: 'Perrine-beneficiary hulls lost at a higher rate (α as chosen)',
    limit: 'Large-counts passes at 10.7; snapshot; no cause',
  },
  {
    id: 'uprate-above-spec',
    modules: ['7-02'],
    finding: 'Uprate above spec',
    procedure: 'one-sample-t-interval',
    conclusion: 'Mean output above spec',
    limit: "Twelve hulls; a census of the program's refits",
  },
  {
    id: 'before-after',
    modules: ['7-04'],
    finding: 'Before/after',
    procedure: 'paired-t',
    conclusion: 'Uprated hulls slower after',
    limit: 'Nine of twelve are among the nineteen (not a random sample)',
  },
  {
    id: 'lost-vs-surviving-perrine',
    modules: ['7-05', '7-06'],
    finding: 'Lost vs surviving Perrine',
    procedure: 'two-sample-t',
    conclusion: 'Lost Perrine hulls later by 1.3–3.9 d',
    limit: 'The nineteen are the losses; no cause',
  },
  {
    id: 'cargo-mix',
    modules: ['8-02'],
    finding: 'Cargo mix',
    procedure: 'chi-square-gof',
    conclusion: "Lost hulls' declared cargo differs; volatiles over",
    limit: 'Declared, not actual, cargo',
  },
  {
    id: 'loss-by-beneficiary',
    modules: ['8-04'],
    finding: 'Loss × beneficiary; cause × corridor',
    procedure: 'chi-square-independence',
    conclusion: 'Loss depends on beneficiary; Lane classifications differ from Mars–Belt',
    limit: 'Association, not cause; corridor comparison assumes comparable reporting',
  },
  {
    id: 'dacres-stamp',
    modules: ['8-04'],
    finding: "Dacre's stamp",
    procedure: 'permutation',
    conclusion: '17 of 19 under one examiner is not chance',
    limit: 'Expected count < 5; simulation replaces χ²',
  },
  {
    id: 'fourteen-ids',
    modules: ['8-02'],
    finding: 'Fourteen IDs',
    procedure: 'observation',
    conclusion: 'The hulls exist and are at Kettle',
    limit: 'Evidence, not inference',
  },
  {
    id: 'fuel-per-required-tonne',
    modules: ['9-02'],
    finding: 'Fuel per required tonne',
    procedure: 'slope-t-interval',
    conclusion: 'Nineteen fuelled ≈ 17% over requirement',
    limit: 'Nineteen departures only',
  },
  {
    id: 'excess-fuel-vs-kettle-dv',
    modules: ['9-03'],
    finding: 'Excess fuel vs Kettle Δv',
    procedure: 'slope-t-test',
    conclusion: 'Premeditation at departure',
    limit: 'Cannot name who ordered it',
  },
]
