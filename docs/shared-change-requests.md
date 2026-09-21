# Shared-component change requests (orchestrator backlog)

Act Teams do not edit `src/instruments/shared/**`, `src/components/**`, `src/design/**` or `src/store/**`. They file requests here via their reports. The orchestrator batches them — normally in Phase 5, or earlier when an Act is blocked.

Status: `open` · `done` · `declined` (with reason).

| # | From | Request | Status |
|---|---|---|---|
| 1 | Act I instruments | `Dotplot` should accept `colors?: readonly string[]` (per point) or `series?: number[]` like `Scatter`, so a grouped dotplot can live in one plot instead of three stacked ones. | open |
| 2 | Act I instruments | `Dotplot` should accept `editable?: readonly number[]` (indices) so "only this point may move" doesn't need a diff-and-reject wrapper on `onValuesChange`. | open |
| 3 | Act I instruments | `ChartSurface` doesn't forward `maxRows` to `DataTable`; `RiemannArea` slices its fallback table to 40 rows by hand. Add a `tableMaxRows` passthrough. | open |
| 4 | Act I instruments | `Stemplot` (Act I's `_ui.tsx`, not shared) has no split stems, forcing a coarse leaf unit on wide-range data. If a later Act needs split stems, promote it to `shared` with that option. | open |
| 5 | Assessment Designer | Persist mission-beat consults in the progress store rather than sessionStorage. | done (`recordConsult` in `src/store/progress.ts`) |

## Notes
- Requests 1–3 are additive props with no behavioural change to existing callers; safe to land between waves.
- When a request is actioned, update the status here and tell the Acts that depend on it.
