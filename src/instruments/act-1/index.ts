/**
 * Act I instruments — the ship systems the learner operates in "Signatures".
 *
 *   RegisterBrowser         1-01  intel        the Lane Authority Incident File, filtered and classified
 *   DisplayIntegrityPanel   1-02  intel        the Board's chart, with every dial it could have turned
 *   DistributionBuilder     1-03  sensor       sixty plumes as dotplot / histogram / stemplot
 *   OutlierExplorer         1-04  sensor       one point dragged out; which summaries follow it
 *   BoxplotBuilder          1-05  sensor       the five-number board and the 1.5×IQR fences
 *   ComparativeDisplay      1-06  intel        the lost against a baseline, on one scale
 *   NormalExplorer          1-07  sensor       the fleet's normal model, cutoffs, areas, units
 *   RiemannArea             calc  engineering  the area under the curve, one rectangle at a time
 *   DecisionEcho            —     —            renders a later debrief only for the decision taken
 *
 * Datasets live in `./data` (read-only); every statistic comes from `@/lib/stats`.
 */
export { RegisterBrowser, type RegisterBrowserProps } from './RegisterBrowser'
export { DisplayIntegrityPanel, type DisplayIntegrityPanelProps } from './DisplayIntegrityPanel'
export { DistributionBuilder, type DistributionBuilderProps } from './DistributionBuilder'
export { OutlierExplorer, type OutlierExplorerProps } from './OutlierExplorer'
export { BoxplotBuilder, type BoxplotBuilderProps } from './BoxplotBuilder'
export { ComparativeDisplay, type ComparativeDisplayProps } from './ComparativeDisplay'
export { NormalExplorer, type NormalExplorerProps } from './NormalExplorer'
export { RiemannArea, type RiemannAreaProps } from './RiemannArea'
export { DecisionEcho, type DecisionEchoProps } from './DecisionEcho'
export { CheckpointGate, type CheckpointGateProps } from './CheckpointGate'
