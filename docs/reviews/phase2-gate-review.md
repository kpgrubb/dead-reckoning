# Phase 2 Gate Review — `docs/beat-sheet.md`

Reviewer: fresh gate agent (no prior sight of drafts). Documents read in full: `docs/build-order.md`, `CLAUDE.md`, `docs/beat-sheet.md`; `docs/story-bible.md`, `docs/curriculum-map.md` (§5–§8), `docs/ap-coverage.md` as reference. Arithmetic re-derived with SciPy (scratchpad, not committed); every number below that is not the sheet's own is my computation.

## Verdict: **PASS WITH REQUIRED FIXES**

The spine holds: each Act's revelation is reachable only through its unit's method, the Act turns genuinely need the next unit, the agency ledger is a real no-branch design, and the tone card is right. The sheet is not buildable as-is because (1) the dataset registry's generating stories contradict the headline numbers they must reproduce in three places that span Act Teams, (2) the heat and transit physics that the "stealth is costly" mechanic rests on do not close in Acts III, IV and VIII, and (3) four mission beats hand the learner a number a character or an earlier module already gave them. Six Blocking items are Showrunner work on the sheet and registry (about a day); nothing requires re-plotting.

---

## Blocking (fix in the beat sheet / registry before any Act Team starts)

### B1 · DS-09 / DS-11 / DS-02 generating story contradicts every Act V and VII target (owner: Showrunner; affects Acts II, V, VI, VII, VIII)
**What is wrong.** DS-09 generates the nineteen's delay as `2.8 + N(0, 0.9)` (SD 0.9 d) while every quoted statistic assumes the nineteen have SD ≈ 2.7 d: 7-03 "s ≈ 2.7, t ≈ 4.6"; 7-05/7-06 lost-vs-surviving t ≈ 4.5 and (1.5, 4.1) imply SE 0.62 = 2.7/√19; 5-02 "one of them is above the 6.2-day cutoff" (under SD 0.9, P(any of 19 > 6.2) = 19 × 0.00008 ≈ 0.002; under SD 2.66 the expected number above is 1.9). With SD 0.9 the lost-vs-surviving two-sample t is ≈ 11.6, not 4.5, and Act VII's contrast collapses. DS-11 already uses `u_hull + shift + N(0, 0.9)` for the same hulls — the two registries disagree with each other.
**Second half.** DS-09 says the nineteen "filed 2.8 mgee ... so the Authority never flagged them", but DS-01 gives each of the nineteen a profile-deviation advisory at Mark 9; and DS-11's uprate (+4.1% thrust, 612 kN) on a hull 7.5% over declared gives a = 2.90 mgee → ≈ 1.2 d late, not 2.8 d (thrust-limited at 588 kN, 7.5% over → 2.79 mgee → 2.6 d). One hidden-mass fraction, one thrust, one delay: the sheet currently has two of each.
**Fix.** (a) DS-09 diverted: `mark9_delay = u_hull + 2.8 + N(0, 0.9)` (the hull files its usual profile, is thrust-limited below it, receives DS-01's routine late-check-in advisory; delete "filed 2.8 / never flagged"). This makes 5-02 (≈ 2 of 19 above the cutoff), 5-03 (z 4.5 with σ), 7-03 (t 4.5 with s), 7-05 (≈ (1.3, 3.9)), 7-06 (t ≈ 4.2) and DS-11 all consistent. (b) State one physical model in §2: h ~ U(0.06, 0.09); un-uprated diverted hulls 2.75–2.83 mgee → 2.2–3.2 d late; the nine uprated diverted hulls carry more (h ≈ 0.10–0.12 so a ≈ 2.79 at 612 kN) **or** the paired shift for them is ≈ 1.2–1.9 d (the bible's original "1.9 days") and the nineteen's mean delay becomes ≈ 2.3 d. Either is fine; pick one and propagate to DS-02 residual band, 2-04, 2-06, 5-02/03, 7-03/04/05/06 targets.

### B2 · The Lane-standard fuel fraction is not a constant, and Acts II and IX assume it is (owner: Showrunner; Acts II, IX)
**What is wrong.** DS-02 and DS-16 generate honest fuel as `0.215 × declared (1 ± 0.01)` for departures across 2178–84. The same Ledger (DS-09, used in 2-06) has `lane_length_AU` 2.4–8.0 and t9 ∝ √d. Δv = 2√(d·a) also scales with √d: 206 km/s at 2.4 AU (fraction 0.186), 242 at 3.33 (0.215), 375 at 8 AU (0.313). An honest six-year fuel dataset therefore scatters from 0.19 to 0.31 by departure date; "the 881 honest bracket 0.215 ± 0.0004" cannot happen, and 9-03's regression of excess fuel on Kettle Δv is confounded with season (Δv_K also moves with the geometry). A Hard-SF or Math Auditor rejects 9-02/9-03 on this alone.
**Fix.** Define per-departure `f_lane = 1 − e^(−2√(d·a_nom)/vₑ)` from the Ledger's lane length (the Bureau certifies fuel against the plotted profile for that departure); honest `fuel = f_lane × declared (1 ± 0.01)`. 9-02: regress fuel on *required Lane fuel* (slope 1.00 honest, ≈ 1.19 for the nineteen; interval excludes 1) — or keep "fuel on declared mass" but restrict DS-16's usable window to a single Close Season band (d ≈ 3.2–3.5 AU) and say so. 9-03: excess fraction = fuel/declared − f_lane(d); slope on Δv_K stays ≈ 0.00082 with the season removed. Add f_lane to the glossary (#35) and to bible §2.3. Also 2-06: the fuel-vs-mass "non-curve" then has a date-dependent slope — the module can keep its lesson by fitting fuel on required-Lane-fuel.

### B3 · Heat-sink and approach physics do not close in Acts IV and VIII (owner: Showrunner with Act IV/VIII leads)
**Act IV.** Torch off MET 83/11:00 at sink 6%; Watch endurance 64 h, Quiet 108 h. The sheet has the ship "cold" through 4-01…4-07 (MET 83–89), "sink 31%" at MET 87 (impossible from 6% at MET 83 on any profile without a purge in between), a "first window (62 h cold)" at MET 91, a purge at MET 95, and a "second window MET 98–106" — 192 h on a 64-h profile — inside which *Marius Regio* is met at 104/03:50 and cold-tracked 30 h "at the edge of Watch".
**Fix.** Add a one-line sink ledger per Act IV module (MET, profile, sink %). A consistent version: MET 83/11 torch off, Quiet drift with purges at ~MET 86 and ~MET 91; window 1 (Watch) MET 88/12 → 91/02; purge MET 95 (4-09); window 2 (Watch) opens MET 102/18; *Marius Regio* at 104/03:50 (34 h in); tracked to MET 105/10 (64 h); purge MET 106. 4-05's "sink 31%" becomes "sink 31% and rising, 24 h into Watch". Change 4-10's header to "MET 102–106".
**Act VIII.** "Fourteen days cold-coasting … sink at 71% on Quiet" is 230 GJ against a 68-GJ post-refit sink (99 h Quiet). And the terminal geometry contradicts itself: 60,000 km "ahead" at MET 180 and 38,000 km at 181/05:30 is a 0.8 km/s closing rate, but 0.2–0.35 AU in 14 days is ~30 km/s ballistic, and any braking burn is a torch a picket sees at 100 AU.
**Fix.** (a) The approach is a *flyby*: undock burn (visible, but 0.3 AU from Kettle), 14-day coast at ~30 km/s, closest approach ≈ 38,000 km; the lidar window is ~12 min inside 40,000 km — 8-02's timings compress (60,000 km is ~12 min before the dwell, not seven hours; move 8-01's "eleven warm shapes" to the survey camera at ~1 million km, MET 180/22:00, which fits the bible's camera range). (b) State that the last purge ends ~3–4 days out (≥ 8 million km; below the civilian-sensor purge range of 2.6 million km is *not* achievable — so state that Kettle's picket carries civilian-grade sensors, which is also why it needs the lamp to find a cold hull) and give the resulting sink % at the dwell. (c) DS-17 "slug 38,000 km / ~60 km/s ≈ 10 min" contradicts the bible's *Patience* at 2,100 km and ten-minute flight (= 3.5 km/s, a plausible coilgun figure); correct DS-17 to 2,100 km / 3.5 km/s, and state the cold-RCS authority that makes a ten-minute-warned unguided slug undodgeable (≤ ~200 N on 3,200 t moves the hull < 6 m in 600 s) — otherwise the Hard-SF auditor asks why the ship did not sidestep.

### B4 · Transit geometry: the 73-vs-77-day discrepancy, the turnover, and light-lag (owner: Showrunner; Acts I–III)
**73 vs 77.** 4 mgee brachistochrone over 2.6 AU = 72.9 d, 247 km/s (bible §3, §8); over 2.91 AU (= 3.33 AU Lane at MET 0 − 0.42 AU to Mark 9) = 77.1 d, 261 km/s. The bible's 73 d and 247 km/s are mutually consistent *only* for 2.6 AU — which is the Lane length at arrival (3.33 − 0.88 × 83/270 ≈ 3.06 AU, minus 0.42 = 2.64 AU), not at departure. **Fix:** keep MET 83 and 73 d; in bible §2.1 label "Callisto ↔ Mark 9 region ≈ 2.6 AU" as *path length at arrival (Lane ≈ 3.06 AU at MET 83)* and strike any 77-day figure.
**Turnover.** A constant-acceleration brachistochrone flips at the midpoint: MET 10/03 → 83/11 flips at **MET 46/19**, not MET 80. Act III's header ("turnover at MET 80"), the Act III closing turn and 3-05's "MET 74–79 … turnover" must move; the flip belongs in Act II between 2-06 (MET 44) and the checkpoint (MET 48). "Under thrust there is down" stays true throughout.
**Light-lag.** At MET 30 the ship is 0.39 AU from Callisto: lag 3.3 min, not "twenty minutes" (act-1-checkpoint, bible Act I beat 6). At MET 52: ≈ 14 min. At MET 80: ≈ 21.6 min. At Ceres, MET 138 (6-08): Jupiter–Ceres ≈ 2.88 AU → 24 min, not 21 (the 21.6 figure is the Mark 9 geometry). MET 219/222's 21/43 min are correct. Add a lag column to the §2 ledger by MET.

### B5 · Delete-the-math failures that cross Act Teams (owner: Showrunner)
- **act-5-04 pre-computes act-6-04.** 5-04's mission beat asks P(a difference ≥ 0.014 arises by chance) ≈ 0.001 — that *is* the Act VI p-value (z = 3.14), computed on the observed difference the learner has held since 4-04 (19/900 vs 12/1,712). "Eight in ten thousand" is then not earned in Act VI. **Fix:** 5-04's beat uses the inverse question ("what gap between two owner classes would be a 1-in-100 event under a common rate?" ≈ 0.0104) or a hypothetical gap; the observed difference is not touched until 6-03.
- **act-4-03 repeats act-2-01.** 2-01's beat already has the learner compute P(unknown | Perrine) and P(Perrine | unknown) and say which the Board quoted. 4-03 asks the same two numbers from the same table. **Fix:** keep 4-03's Register example but change the reversal — e.g. the Board's "consistent with transponder faults": P(gradual fade | unknown) vs P(unknown | gradual fade), or P(Uruk | piracy) = 1 vs P(piracy | Uruk); or make 4-03 sweep-log-only with the staff paper as drill context. Also 4-03's quoted "eighty-four percent of Perrine-flag incidents coded unknown" contradicts DS-01 (19 of 19 = 100%); define the Board's denominator or change the figure.
- **act-1-02 repeats act-0-03.** 0-03's beat is the relative frequency of *unknown* among losses (≈ 0.71); 1-02's Situation "restores the denominator … unknown becomes 71%". **Fix:** 0-03's beat = losses as a fraction of the 2,200 records (1.4%) only; 1-02 owns the 71% and the truncated-axis distortion.
- **act-7-03 repeats act-5-03.** Same nineteen, same mean 2.8, same SE 0.62, z 4.6 → t 4.6; the only new content is s for σ, and the clue ("the nineteen were slow") was stated in 2-06 and 5-03. **Fix:** make 7-03's mission beat the *dismantling of Ostrow's pooling*: reproduce his 0.25 d (all Perrine vs all others), then show what a mixture of 19 at +2.8 among 900 must average (≈ +0.06 + 0.2) and the power his comparison had to see it (~none) — that is new, and it is the rebuttal the Board actually made with numbers.

### B6 · Global writing rule missing: Situations print the mission-beat answer (owner: Showrunner; one line in §6)
Because §2's numbers are "targets the seeded datasets must reproduce", the Situations quote them before the beat asks for them: 4-07 (Sandoval states 19.6 kW, 0.17, 0.02 — the entire beat), 4-08 (0.79, 0.68), 4-09, 5-02, 5-03, 5-04, 5-05, 6-02 (both endpoints), 6-04 (z, p), 6-07 ((0.4, 2.4)), 7-02–7-06, 8-01 (40.8), 8-04, 9-02, 9-03. The learner types back a number a character said. **Fix:** add to §6: "Situations pose the question and may quote a *character's* wrong or partial number; the correct target never appears in prose before the `<MissionBeat>`; Briefing worked examples use a different in-world case." Then 1-04 (Ebele announces "two piles" before the learner draws anything) and 7-04 (Sandoval announces the 8.9 h sink loss) are fixed by the same rule — see Required.

---

## Required (fix during Phase 3 by the owning Act Team)

### Prologue / Act I
- **act-0-01** — Delete-the-math fails (a mean reported to a tug master changes nothing in the case). Acceptable because build-order §3 exempts the Prologue from assessed AP content, but the block's line overclaims ("without it the ±300 km … would be an assertion"). Reword to "establishes the error budget the crew will quote"; do not claim plot dependence.
- **act-0-02 / DS-05** — "Measured 64 h" is not a measurement of the mean: 78 GJ / 320 kW = 67.7 h with SD ≈ 4.2 h from the variance rule, so 64 h is design − 1 SD and 60 h is − 2 SD, which is exactly what makes 4-07's P ≈ 0.17 / 0.02 come out. Recast DS-05's "design → measured" columns as "design mean → Chief's working figure (mean − 1 SD)" and drop "the design curve is ~5% optimistic" for Watch (keep it for Quiet if wanted). Otherwise 0-02 and 4-07 teach two incompatible models of the same number.
- **act-1-04** — The revelation is handed: Ebele's dotplot and his line "two piles" precede the learner's work; the beat then asks for median/IQR. Fix: Ebele reports only "mean 3.4 h"; the learner's instrument (dotplot/histogram) produces the two piles; the choice beat ("honest summary of a bimodal variable") stays.
- **act-1-06** — "Lost vs arrived on mark" compares `mark_last` (losses) with advisory `mark` (2,169 non-loss records): apples to oranges (every arrived hull's last contact is Mark 12). Fix: compare the losses' marks with the *all-incident* mark distribution (the Board's flat histogram) as the honest baseline, and use `hull_age` and `declared_cargo_value` (from DS-09) for lost vs arrived.
- **DS-01 (Act I lead)** — 2,169 advisories `U(1,12)` plus 31 losses at 8.5 give a mean of **6.53**, not 7.1; no seed tunes 2,169 uniform draws 9 SE upward. Fix: change the Board's figure to **6.5** in bible/map/sheet (three edits; "spread along the Lane" becomes literally true of the uniform) — or generate advisories with mean 7.08 (e.g. `U(2.2, 12)`) and accept a less flat histogram. Also gradual `time_to_silence ~ U(3, 8)` h reproduces the stated 3.4 h mean (`U(3, 9)` gives 3.7).
- **DS-19** — 1-04 and 1-05 (MET 19, 21) use "all sixty" contacts that DS-19 completes only at MET 27; set "60 by MET 19". 1-04's "drags the fleet's mean up by half a point" is 9.2/60 = 0.15 points; make it "a sixth of a point", or use the MET 15 eleven-contact set (0.84 points).
- **act-1-checkpoint** — "Solberg counts twenty minutes out": 3.3 min at MET 30 (B4).

### Act II
- **act-2-05** — The Board's "r² = 0.98 for the Lane's mass agreement" cannot come from the Act I summary page (the Bureau file arrived at MET 30; the Board's next message is MET 52). Fix: the Bureau's cover note quotes its routine QA r² and omits s.
- **act-2-06** — "80 to 110 days over 2.4 to 8 AU" is wrong for t9: 0.75 × 2√(d/a) = 61 to 111 d (full transit 81–148 d). Correct the range. Fuel-on-mass here inherits B2.
- **act-2-02** — The "lend the Eyes" gated decision exists only in §4's ledger; put it in the 2-02 block (kind, options, outcome text) or the Writer will not build it.
- **act-2-checkpoint / Act II header** — Insert the turnover at MET ≈ 46/19 (B4).

### Act III
- **Act III header, act-3-05** — Remove "turnover at MET 80" (B4).
- **act-3-05** — The clue line "Escorts are not the explanation" overclaims from p ≈ 0.3 — the module's own listed misconception ("reading 'no evidence' as 'no effect'"). Rewrite: "No evidence, at this size, that escorts change advisory rates; and no affordable trial could see a 1%-per-transit loss." Specify the p-value's sidedness: exact permutation on DS-04b gives **0.23 one-sided / 0.46 two-sided** (924 relabellings); "≈ 0.3" fits neither cleanly. Put the "order the lottery" decision in the block (it is only in the Dataset line and §4).
- **DS-03b** — "6 of 40 turning late" is defined for the SRS only; give the counts (and Sulcus nonresponse) for the stratified (n = 45) and cluster (~42) designs so 3-03's numeric beat is specifiable for all three.

### Act IV
- **act-4-05** — The Watch/Quiet decision that 4-10 depends on ("set in 4-05's gated scene") is absent from the 4-05 block. Add it (kind decision; Quiet → 4-10 fails with Oyelaran's debrief).
- **act-4-06** — The stated saturation probabilities do not follow from the stated (E, SD): near 62 ± 9 gives P(> 64) = **0.41** (sheet: 0.25); middle 58 ± 4 gives **0.067** (sheet: 0.006); far ≈ 0 ✓. Retune (e.g. near 60 ± 6 → 0.25; middle 54 ± 4 → 0.006) or publish the three pmfs explicitly and drop the normal reading.
- **act-4-07** — Sandoval's Situation gives the full answer (B6). She says "Variances add, Ensign" and stops; the learner computes 19.6 and 0.17.
- **DS-06** — The picket model's range bands (0.05 / 0.10 / 0.15 AU) with P(detect | covered, cold) = 0.35 contradict bible §2.5: a cold *Nightjar* is detectable naval-grade only inside 3.7 million km = 0.025 AU. Either rescale the bands (0.01 / 0.02 / 0.04 AU with 0.35 / 0.15 / 0.02) or make the loiter risk what it physically is — the 2.6-h purge, visible naval-grade at 0.55 AU — and give the picket a position relative to the loiter points.
- **act-4-03** — B5; also the "84%" figure.
- **Act IV sink ledger** — B3.
- **act-4-01** — "about once in a hundred runs": my simulation of 31 uniform dates over 2,190 d gives P(max 30-day cluster ≥ 5) ≈ **0.019**. Say "about two in a hundred" or let the instrument's count speak (the beat already accepts the run's tolerance).

### Act V
- **act-5-01** — The bible (Act V beat 1) still says the Board's statistic is "the maximum 90-day loss count from whichever cutter saw least"; the sheet says "the lower of the two cutters' observed rates". Log the change in §5 and edit the bible; the sheet's version is the better lesson (min of two p̂ is biased low by construction).
- **act-5-02** — "One of them is above the cutoff" follows from B1's fix (expected ≈ 2 of 19); leave the count to the seed and say "one or two".
- **act-5-04** — B5.
- **act-5-05** — "Close Season" is used as a yearly unit here and in 6-01/6-02/6-04 ("a hundred Close Seasons", "n per Close Season ≈ 435") while the glossary defines it as the short-passage part of a ~5-year cycle. Define the unit once (e.g. "a season of 435 transits") or use "year".

### Act VI
- **act-6-02** — "How many transits to shrink the margin below 0.2 points — three Close Seasons": n = 1.96² p̂(1 − p̂)/0.002² ≈ **11,300** transits, i.e. ~8,650 more ≈ 20 years at 435/yr. For "three seasons" (~1,300 more transits) the achievable margin is ≈ 0.35 points. Change the target or the time.
- **act-6-06** — Give the power targets so the Problem Author has them: one-sided, n = 900/1,712, alternative 0.021 vs 0.007: power ≈ **0.76 at α = 0.01**, **0.90 at α = 0.05**; against a "consistent with comparable corridors" gap (e.g. 0.012 vs 0.011) power ≈ α. The learner's α decision then has a visible price.
- **act-6-08** — Ceres ↔ Valhalla lag at MET 138 is ≈ 24 min, not 21 (B4); the "four minutes after arrival" reply survives either.
- **Act VI opening / 6-07 / 6-08** — Marsh "stays four hours" at MET 127 but is in the wardroom at MET 136 and "leaving at MET 140". Pick one.

### Act VII
- **act-7-03** — B5.
- **act-7-04 / DS-12 / DS-05** — Two incompatible refit losses: DS-05 Watch 64 → 59 h (−5 h); DS-12 "Watch loss 8.9 ± 1.0 h". 68 → 59 is 9 h only against the *design* mean. Either post-refit Watch = 55 h or define the loss against design and say so in Sandoval's line. Also the sink finding ("shortened, on purpose") is handed by Sandoval in the Situation (B6): make the eight-profile paired t (8.9 ± 1.0 h) the beat's second numeric so the learner earns the line.
- **act-7-05 / 7-06** — Targets after B1: lost-vs-surviving difference ≈ 2.6 d (the honest Perrine +0.2 offset), interval ≈ (1.3, 3.9), t ≈ 4.2, Welch df ≈ 18. Note 7-06 is the test dual to 7-05's second interval (same numbers); acceptable for CED 7.8/7.9 but the block should say so rather than claim a second finding.
- **act-7-07** — The Kettle vector is Ebele's nav propagation, not the learner's statistics; the Act's turn is therefore handed. Acceptable (the vector exists only because 4-10's window caught it), but state it honestly in the delete-the-math line and make the learner do the procedure-selection *before* the vector scene, not after.
- **Act VII opening** — Ceres (MET 140) → *Halden Reach* 0.2 AU sunward (MET 152) in 12 days needs ≈ 11 mgee and 114 km/s; the bible's "economical cruise 3–10 mgee" and the Δv ledger should agree. Add a Δv ledger to §2 (263 at MET 110 → refuel 518 at Ceres [900·ln(3200/1800) = 518, not 510] → 118 at MET 203 is not derivable from any listed burns).

### Act VIII
- **DS-17 / act-8-02** — The tree given to the learner yields P(round) = 0.30 × 0.12 = **0.036** for a 40-s dwell, yet the book's sentence is "the outcome was in the thirty percent" and the beat grades the learner on "0.30 either way". Reconcile: the learner's tree must produce 0.30 as P(a picket can respond inside the four-minute torch window); delete the 0.10/0.12 leaf and make the debrief's discovery the rules of engagement (fire on illumination), not a probability factor. As written the learner's correctly computed odds were 3.6%, and 10-01's "you know what thirty percent feels like" is about a number the learner never computed.
- **act-8-02** — The order ("You order a forty-second dwell") and the blister approval are narrated; the dwell is the decision beat but the learner never issues the order. Require the learner to state the computed 0.30 and select the order (the `<MissionBeat kind="decision">` already exists — put the order in it). The loss is fixed by the bible; what must be the learner's is the number they signed before it.
- **act-8-04** — The examiner × diverted table (22 of 900; 17 of 19) needs DS-16, which arrives at MET 196 — the *end* of the module. Fix: run 8-04's examiner table on DS-02's `examiner` column (412 departures: Dacre on 17 of 19 diverted vs a handful of the 393 others; expected count still < 5; same simulation lesson), and let Brandt's 900 confirm it in 9-01's Situation. Or move Brandt to MET 186.
- **Act VIII header, 8-01, 8-02** — Approach physics and timings (B3).

### Act IX
- **DS-16 / 9-02 / 9-03** — B2.
- **act-9-01** — "SE(b) 0.009 for the nineteen" is not reproducible: DS-16's generating story has no measurement noise on the nineteen, so the residual spread comes only from h and Δv_K variation (s ≈ 80 t, √Sₓₓ ≈ 15,900 → SE ≈ **0.005**). Add the honest 1% noise to the nineteen's fuel (giving ≈ 0.006) or change the target; the "larger than the honest 0.003" point survives either way.
- **act-9-03** — Physical β₀: the diverted hulls are thrust-limited, so their Lane Δv is 2√(d·2.79 mgee) ≈ 234 km/s, not 242; β₀ = (1 + h)e^(−(234 + Δv_K)/1000)/1000 ≈ 0.00083 (unchanged to two figures) and the 9-02 slope target moves 0.257 → ≈ 0.250. State the operating point once in §2 and derive both from it. The one-sided test against β = 0 and the two-sided test against β₀ should be named as such in the beat (the sheet's misconception line already warns about halving output p).
- **act-9-04** — The evidence board "grades the assembled case" with no answer key. Give the Instrument Builder the finding → procedure → limitation table (it is the Act's checkpoint q8/q9 content).

### Epilogue
- **act-10-01** — "the power the case had against the difference it found" is observed (post-hoc) power, a known misuse. Phrase as "against the difference you specified in 6-06 before the test".

---

## Advisory

- **Originality.** No borrowed names, ships or tech; no "Belters". Two echoes to watch: "Belt-plain" as a dialect label for Marsh (use "Ceres-plain" or drop the label), and the Mars-strongest-navy / Earth-old-money / Ceres-trading-hub configuration, which is Expanse-adjacent in structure though not in name. The Jovian Compact protagonist faction and the Provident Fund mechanism are original and carry the book.
- **Tone.** Clean. Humour is dry and about time or paperwork (Solberg, Ferrier's "Exact is a word for things you computed"). The Board is rendered, not mocked. The learner is corrected through Ebele throughout; Ferrier's debrief lines to the CO are XO-questioning, not teaching. Watch 1-04's "Which hull took 3.4 hours?" and 5-05's "Think about what that means" — both are one word from lecturing; fine as written.
- **The loss and agency.** Oyelaran's death is scripted (no option avoids it), which the bible locks. The learner's ownership is the computed 0.30 and the signed order (see 8-02 Required). 6-06's "some errors are paid in people" and Ferrante's "Thirty percent is not small" land only if the learner typed 0.30 — B6 and the DS-17 fix are what make the loss a consequence rather than a cutscene.
- **act-3-03.** The Act's plot-moving clue ("turning late") is testimony delivered by Marsh and six masters regardless of design; the statistics govern its evidentiary weight, not its existence. Acceptable for Unit 3; the delete-the-math line should say "would be anecdote" (it does) and not more.
- **act-4-04 / 6-03.** The Ledger's `owner_class = Perrine` already gives 19/900 in 4-04; DS-10's "beneficiary" adds a label, not a number. Make DS-10 add something the Ledger cannot: the beneficiary chain Perrine Holdings → Service Provident Fund (which the learner's own pension sits in) — that is the institutional turn, and it is currently in the bible but not in any beat.
- **act-4-09 / 5-05.** The two-baseline sentence ("under 1.1% unremarkable; under 0.5% five SE out") is computed in 4-09 and re-narrated in 5-05's Situation. Cut it from 5-05 or make 5-05 reference 4-09's log entry.
- **act-5-03.** The mark test on the nineteen (mean 9.3 vs 6.5, z 3.8) is post-selected: the nineteen were picked partly by their late marks in Act I. Use the 31 (mean ≈ 8.7, z ≈ 3.7) for the mark axis, or have Ferrier name the selection.
- **act-2-05.** "Leverage > 4/n" is a non-AP rule of thumb; AP 2.8 needs only qualitative high-leverage / influential. Keep it in the Briefing's Caution, not the drills.
- **act-4-09.** The 10% condition is listed under 4.11 in `ap-coverage.md` but appears only in 4-08's drills; add it to 4-09's concept line.
- **act-7-01, 9-01, 6-01, 4-02, 4-05, 8-03** are tool/chain modules with no case-state change. They are CED framing topics (7.1, 9.1, 6.1, 4.3–4.4, 4.7, 8.4–8.5) and earn their place; their delete-the-math lines should say "chain" rather than claim a revelation.
- **Bible §3.** Full-tank Δv is 518 km/s (900 · ln(3200/1800)), not 510.
- **DS-08.** All four binomial claims verified (0.28 / 0.06 / 0.85 / 0.43); P(X = 0 | 380, 0.0119) = 0.011 confirms decision 9's *Tindr* correction.
- **DS-14, DS-15, DS-16 (Dacre), DS-11, DS-09 two-proportion, 5-04/5-05 SDs, 1-07, DS-07, 4-08/4-10, 10-02** — all verified to the stated precision (χ² 40.8 / 16.9 / 10.0; z 3.16, p 0.00078; CI (0.0039, 0.0243); hypergeometric P < 10⁻²⁸; paired t 4.1 vs two-sample 1.8; posteriors 0.27 / 0.82).
- **Misconception hygiene.** No module teaches p as P(H₀), "accept H₀", CLT-normalises-the-population, or bias-for-variability; 6-04/6-05/5-03/3-03 explicitly drill against each. 6-01's "10% condition (the Close Seasons to come)" is an odd framing of a finite-population condition for a census-as-process; let the Instructor phrase it as "the process could produce far more than ten times these transits".
- **Session fit.** All 61 modules are 20–30 min; nine checkpoints 20–25; total 31 h 05 (inside 25–35 h). Every module names one manipulable instrument. No filler found; 4-10 is the only module whose scene load (eight days of story) risks running long — the Writer should keep the Situation under 700 words.

---

## AP coverage spot-check (10 modules against `docs/ap-coverage.md` / CED)

| Module | Topics claimed | Taught by the described beat? | Conclusion-in-context drill present? |
|---|---|---|---|
| act-1-07 | 1.10 | Yes — z, percentiles, aX + b, empirical rule, normal areas all in beat/drills | Yes (percentile/z rubric) |
| act-2-05 | 2.8 | Yes — r², s, output, leverage/influence | Yes (`rSquaredInterpretation`) |
| act-3-03 | 3.4 | Yes — all bias types, direction, bias vs variability | Yes (`samplingBiasIdentification`) |
| act-4-06 | 4.8 | Yes — E, SD of a RV, decision use | Yes (`expectedValueInterpretation`) |
| act-4-09 | 4.11 | Mostly — mean/SD/shape; **10% condition missing** from block | Yes |
| act-5-03 | 5.3, 5.7 | Yes — CLT, μ, σ/√n, conditions, misconception | Yes |
| act-6-06 | 6.7 | Yes — Type I/II, power drivers, α choice | Yes (errors in context) |
| act-7-07 | 7.10 | Yes — selection, four-step, communication; bootstrap is beyond CED (enrichment, fine) | Yes (four-step rubric) |
| act-8-03 | 8.4, 8.5 | Yes — expected counts, homogeneity vs independence by design, df | Yes (hypotheses rubric) |
| act-9-03 | 9.4, 9.5 | Yes — test for β incl. non-zero null; "does not prove" | Yes (two rubrics) |

Every inference module (6-01 → 9-04) carries at least one interpretation rubric and the checkpoints VI–IX each carry ≥ 3 INT items (map §5). Coverage is complete at plan level; the nine "light" topics are as `ap-coverage.md` describes.

---

## Buildability — blocks a sub-agent could not build without asking

| Module | Gap |
|---|---|
| act-2-02 | "Lend the Eyes" gated decision not in block |
| act-3-02 | Which "6 of 40 / nonresponse" counts for stratified and cluster (DS-03b) |
| act-3-05 | "Order the lottery" decision not in block; p-value sidedness |
| act-4-05 | Watch/Quiet decision not in block |
| act-4-06 | Option distributions (pmf or parameters) that yield the stated P(saturate) |
| act-4-01…4-10 | Sink % and profile per module (heat ledger) |
| act-6-06 | Power targets |
| act-8-02 | Tree that yields 0.30 as the learner's number; dwell order as the learner's action; flyby timings |
| act-8-04 | Which dataset carries `examiner` at MET 186 |
| act-9-04 | Evidence-board answer key |
| all | Rule that Situations do not print beat targets (B6) |
| all | Speaker keys for Ostrow / Lindqvist-Oduya / Renn / Okafor-Reyes / Achterberg / Maalouf / Halvorsen — §5.18 leaves it to the orchestrator; decide before Phase 3 so seven modules do not diverge |

---

## Internal consistency (checked; only defects listed)

- Names/ranks: consistent across bible, sheet, map (Rook Cdr; Ferrier Lt Cdr; Oyelaran Lt; Ebele Ens; Sandoval CPO; Solberg Lt jg; Ferrante Surg-Lt; Ostrow Capt outranks Rook ✓). Oyelaran appears in no block after 8-02 ✓; Halvorsen from Act IX ✓; Marsh at Ceres only ✓ (but see the four-hours note).
- MET is monotonic across all 70 blocks ✓. Defects: turnover MET 80 (B4); Act IV windows exceed endurance (B3); Act VIII 14-day cold (B3); DS-19 sixty contacts at MET 19 vs 27.
- Sizes reused consistently: 31 / 2,612 / 900 / 1,712 / 412 / 260 / 212 / 12 / 14 ✓; 19 + 4 + 8 = 31 ✓; Uruk 23 / Ceres 8 ✓; 22 / 5 / 4 ✓; 34% = 900/2,612 ✓; frame 260 = 34% Perrine ✓.
- Headline numbers across bible / sheet / map: agree except (a) the paired shift (bible §7.1 and Act VII beat 4 still say 1.9 d; sheet 2.1/2.8 — B1 decides), (b) 5-01's Board statistic (bible "max 90-day count", sheet "min of two rates"), (c) *Halden Reach* refit loss 5 h vs 8.9 h (DS-05 vs DS-12), (d) DS-17 slug 60 km/s vs bible 2,100 km / 10 min.
- §7 time budget re-added: 1,665 + 200 = 1,865 min ✓; 61 + 9 = 70 ✓.

---

## Per-Act table

| Act | Modules reviewed | Delete-the-math | Note |
|---|---|---|---|
| Prologue | 0-01, 0-02, 0-03 | 0-01 **fail** (exempt by build-order §3); 0-02 pass; 0-03 pass | 0-02/DS-05 "measured 64" needs the design-minus-1-SD framing |
| I | 1-01…1-07, cp | 1-01 pass; 1-02 **fail** (repeats 0-03); 1-03 pass; 1-04 **fail as written** (handed by Ebele); 1-05 pass; 1-06 pass (mark comparison must be redefined); 1-07 pass | DS-01 mean 7.1 not producible; lag at MET 30 |
| II | 2-01…2-06, cp | 2-01 pass; 2-02 pass (chain); 2-03 pass (chain); 2-04 pass; 2-05 pass; 2-06 pass | B2 (fuel fraction), t9 range, Board's r² provenance, turnover insertion |
| III | 3-01…3-05, cp | 3-01 pass; 3-02 pass (decision); 3-03 pass (weak: testimony is handed, stats weigh it); 3-04 pass; 3-05 pass (clue line overclaims) | Turnover at MET 80 must go |
| IV | 4-01…4-10, cp | 4-01 pass; 4-02 chain; 4-03 **fail** (repeats 2-01); 4-04 pass; 4-05 chain; 4-06 pass (decision; numbers wrong); 4-07 **fail as written** (handed by Sandoval); 4-08 chain; 4-09 pass; 4-10 pass | Heat ledger; DS-06 ranges; missing 4-05 decision |
| V | 5-01…5-05, cp | 5-01 pass; 5-02 pass; 5-03 pass; 5-04 **fail** (pre-empts 6-04); 5-05 pass (weak, duplicates 5-03's z) | B1 targets; bible mismatch on 5-01's statistic |
| VI | 6-01…6-08, cp | 6-01 chain; 6-02 pass; 6-03 pass (weak: numbers known from 4-04); 6-04 pass *after* 5-04 fix; 6-05 pass; 6-06 pass (decision); 6-07 pass; 6-08 pass | Sample-size claim; power targets; lag 24 min; Marsh timing |
| VII | 7-01…7-07, cp | 7-01 chain; 7-02 pass (weak); 7-03 **fail** (repeats 5-03); 7-04 pass (sink clue handed); 7-05 pass; 7-06 pass (dual of 7-05); 7-07 pass (decision; vector is nav) | Refit-loss 5 h vs 8.9 h; B1 uprate physics; Δv ledger |
| VIII | 8-01…8-04, cp | 8-01 pass; 8-02 pass (tree must yield 0.30; order must be the learner's); 8-03 chain; 8-04 pass (examiner data timing) | B3 approach physics; DS-17 slug |
| IX | 9-01…9-04, cp | 9-01 chain; 9-02 pass; 9-03 pass; 9-04 pass (decision) | B2; SE(b) target; β₀ operating point; board answer key |
| Epilogue | 10-01, 10-02 | 10-01 pass; 10-02 exempt (interlude; posteriors verified) | Observed-power phrasing |

Counts: Blocking 6 · Required 41 (Prologue/I 8, II 4, III 3, IV 7, V 4, VI 4, VII 5, VIII 4, IX 4, Epilogue 1 — cross-Act items counted once under the Act that owns the module) · Advisory 17.
