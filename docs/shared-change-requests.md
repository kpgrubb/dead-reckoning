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

## Cross-Act continuity items (for the Phase 4 Continuity Editor unless flagged urgent)

| # | Raised by | Item | Status |
|---|---|---|---|
| C1 | Act II (2-01 writer) | **DS-01 loss subtable splits the 12 non-Perrine losses the other way from the beat sheet.** Beat sheet §3 act-2-01 says Perrine 19 (unknown 19) · Mercantile 7 (accident 4, unknown 3) · independent 5 (piracy 4, accident 1). Runtime `lossCounts` is `[[0,0,19],[4,0,1],[1,4,2]]` → Perrine 19 · **Mercantile 5** · **independent 7**. Both reproduce the marginals (unknown 22 / accident 5 / piracy 4, total 31) and both satisfy the narrative claims (unknown is modal for Perrine; accident modal for Mercantile; every piracy an independent), so no module is wrong as built — every Act II number is read from the data at runtime. But the doc and the data must agree before anyone hard-codes 7/5. **Resolution: change the data to match the doc** (DS-01 owner_class is Act I's `src/instruments/act-1/data.ts`), then have Acts II/III/VI re-run their data tests. Deferred to Phase 4 so it lands once, after the Acts that consume DS-01 are built. | open |

## Notes
- Requests 1–3 are additive props with no behavioural change to existing callers; safe to land between waves.
- When a request is actioned, update the status here and tell the Acts that depend on it.
