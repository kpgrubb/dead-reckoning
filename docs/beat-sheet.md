# DEAD RECKONING — Book One · Beat Sheet

Owner: Showrunner. This is the single document every Act Team (Writer, Instructor, Instrument Builder, Problem Author) builds from. It merges `docs/story-bible.md` (plot, world, crew, hard-science ledger) with `docs/curriculum-map.md` (ids, topics, prerequisites, instruments, checkpoint blueprints) into one block per module. Where this sheet and the bible or map disagree, the **Decisions log (§5)** records the resolution and the bible/map have been edited to match. Where this sheet is silent, the bible governs story and the map governs curriculum.

Conventions: MET `day/hh:mm`. Module ids are the map's (`act-N-NN`, `act-N-checkpoint`). Dataset ids `DS-nn` refer to §2. "Rubric" names refer to templates in `docs/problem-authoring.md` §8 and the map's §7 names. Every mission-beat answer is computed by `@/lib/stats` at runtime; the numbers quoted here are the **targets the seeded datasets must reproduce**, not literals to type into `answer=`.

---

## 1. Series summary

**Premise.** 2184. Thirty-one freighters have vanished in six years on the Hundred-Day Lane, the helium-3 corridor between Jupiter and Ceres. The Lane Authority and the Admiralty Board of the Galilean Compact call it accidents, piracy and bad luck at a rate "consistent with comparable corridors." Under pressure from a Martian insurer, the Board sends its newest ship — CSV *Nightjar*, the Compact's one prototype low-emission corvette, a hull that can go cold for days by swallowing its own heat in sixty tonnes of lithium — to "observe and assess." It sends her under an officer it trusts to write the report it needs.

**Protagonist.** You are Commander Anselm Rook, 53, thirty-four years in the Compact Orbital Service, an institutionalist who believes chain of command is what makes a navy something other than a mob with ships. Twenty years ago on the cutter *Asgard* you wrote the Lane's baseline loss report; you have let the skill rust. The book is that skill re-sharpened under pressure. You are never taught; Ensign Ebele is, and you correct him.

**Hidden truth.** Nineteen Sulcus Freight hulls did not vanish. Each carried undeclared military hardware from Adlinda Yards in its trim-ballast tanks, declared as ammonia; each was fuelled at Uruk High for a diversion its master had not yet made; each rotated its brake plume eleven degrees between Mark 9 and Mark 10 and finished its burn at Kettle, a six-kilometre rock off the Lane's Ceres end, where it became an auxiliary in a fleet the Assembly never voted for. Four independent hulls were destroyed by a contracted tug so the Lane's losses would have bodies and a story. The program is PROVIDENT, named for the Service's own pension fund, which owns the freight line and collects the insurance. Its author is Rear Admiral Ashby-Hale, the man who gave you the ship. He is sincere about the war he thinks is coming. He did not ask about the four.

**Through-line.** Every revelation is earned by analysis. The Board's summary hides the pattern in a mean (Act I); the manifests lie and the residuals say so (II); the Board answers a regression with a survey and you have to show how the survey was taken (III); to witness a diversion you must budget heat as a random variable and buy the odds (IV); before you accuse you must know what noise looks like (V); the accusation is a two-proportion test you sign (VI); the Board's rebuttal is a means analysis you dismantle with the Board's own paired data (VII); the ledger of who and what is a chi-square, run on data a sensor officer died to collect (VIII); premeditation is a slope that cannot be innocent under any other story (IX). The Epilogue asks the one question none of those tools can answer — how much one message should change what you believe — and that is Book Two.

**The rule.** Delete the math and the plot no longer works. Every module block below carries a one-line test of that rule.

---

## 2. Dataset registry

Every in-world dataset, with provenance, variables, size, and the **generating story** Act Teams synthesize with seeded code (`Rng`, `seedFrom`) so the headline numbers reproduce and the same dataset is identical wherever it is reused. Snapshot rule: **all inference in Acts V–IX runs on the Register/Ledger snapshot at MET 0** (31 losses, 2,612 transits) — the Board's finding is tested on the Board's data. The two diversions witnessed during the story (*Harpagia Sulcus*, MET 59; *Marius Regio*, MET 104) are evidence, not sample. Every headline number below was re-derived with SciPy 1.18 after the Phase 2 gate review (§8); `data.ts` tests should reproduce them to the stated precision.

### DS-00 · The one physical model of the nineteen (all datasets derive from this)
- **Hidden mass.** Ten diverted hulls (not uprated) carry `h ~ U(0.06, 0.09)` of declared mass in undeclared hardware; the **nine uprated hulls** (DS-11) carry `h ~ U(0.10, 0.13)` — the uprate (+4.1% thrust, 612 kN vs 588) was done to carry more at the same acceleration. In DS-02 the nineteen therefore sit at **+6–13%** over declared (ten at +6–9, nine at +10–13).
- **Acceleration.** Every diverted hull files its usual profile and is **thrust-limited** below it: `a = 3.00 × (F/588)/(1 + h)` ≈ **2.75–2.84 mgee** for both groups (mean ≈ 2.79). It arrives at Mark 9 **+2.0 to +3.1 days** late against the nominal plot (mean **+2.6 d**, SD 0.3) and receives the Authority's routine profile-deviation advisory (DS-01) like any late hull. Its Lane Δv is `2√(d·a)` ≈ 234 km/s at 3.33 AU (not 242).
- **Fuel.** The Bureau certifies fuel against the plotted profile *for that departure*: **`f_lane(d) = 1 − e^(−2√(d·a_nom)/vₑ)`**, a_nom = 3.00 mgee, vₑ = 1,000 km/s — 0.186 at 2.4 AU, **0.215 at 3.33 AU**, 0.313 at 8 AU. Honest fuel = `f_lane(d) × declared × (1 + N(0, 0.010))`. Diverted fuel = `declared × (1 + h) × (1 − e^(−(Δv_L(d, a) + Δv_K)/vₑ)) × (1 + N(0, 0.010))`, with Δv_K from DS-16.
- **Inferred mass.** From a single Mark 2 fix (DS-02, Act II): `declared × (1 + h) × (1 + N(0, 0.020))`. From the whole accelerate-phase relay archive, reprocessed by Ebele in Act IX: `(1 + N(0, 0.005))` — six weeks of state vectors beat one fix.
- **Delay.** Every honest transit: `mark9_delay = u_hull + N(0, 0.9)` d, with the persistent per-hull filing offset `u_hull ~ N(0, 2.5)` (Perrine hulls `N(0.2, 2.5)`: they file a hair slow). Fleet SD **2.66 d**. Diverted: `u_hull + d_i + N(0, 0.9)`, d_i from the acceleration above.

### DS-01 · The Register (Lane Authority Incident Register; the Board's cover page calls it the Incident File)
- **Provenance / bias.** Compiled by the Lane Authority from transponder logs, cutter search reports and the classifying office's finding. Honest about *when* and *where*; dishonest about *why*, because classification is a reporting process: the **Uruk office** (Compact secondees under Ostrow) classifies Compact-flag hulls, the **Ceres office** classifies the rest.
- **Size.** 2,200 records, 2178-01 → 2184-03 (MET 0). Of these **31 are losses**; 2,169 are minor incidents (transponder dropouts, debris advisories, profile-deviation advisories, medical diversions).
- **Variables (all records).** `record_id`; `date`; `hull` (name); `hull_class` (Sulcus-Mk3 / Tessera-C / other); `owner`; `owner_class` (Perrine / Mercantile / independent); `severity` (loss / advisory / dropout / other); `mark` (fractional mark at the record, 1.0–12.0); `office` (Uruk / Ceres).
- **Loss subtable (31 rows).** `mark_last` (fractional mark at last contact); `time_to_silence` (hours from first transponder degradation to final loss of signal); `classification` (accident / piracy / unknown); `office`; `hull_age` (years); `declared_cargo_value` (M₵); `cargo_category` (He-3/D · volatiles · metals · manufactured & other); `beneficiary` (joined from DS-10 in Act VI).
- **Generating story.**
  - **19 diverted (Perrine/Sulcus hulls):** `mark_last ~ U(9.05, 9.65)` (mean ≈ 9.3, SD ≈ 0.17); `time_to_silence ~ U(3, 8)` h; classification **unknown**, office **Uruk**; cargo_category **volatiles** (all 19); declared value low (`U(18, 40)` M₵); hull_age unremarkable. Dates: 1 in 2178, 2 in 2179, 3 in 2180, 4 in 2181, 4 in 2182, 4 in 2183, 1 in 2184. Named: *Nicholson Regio* (2182-03-06), *Xibalba Sulcus* (2182-03-18), *Perrine Regio*, *Tiamat Sulcus*, *Galileo Regio*, *Barnard Regio*, *Uruk Sulcus*, *Dardanus Sulcus*, *Mysia Sulci*, *Phrygia Sulcus*, *Sippar Sulcus*, *Anshar Sulcus*, *Byblus Sulcus*, *Nun Sulci*, *Elam Sulci*, *Lakhmu Fossae*, *Zakar Sulcus*, *Kishar Sulcus*, *Bubastis Sulci*.
  - **4 cover losses (independents, wrecked by *Patience*):** *Kestrel Bough* 2182-02-24, *Thessaly Ember* 2182-03-08, *Hygiea Promise* 2182-03-21, *Long Fathom* 2182-06-02. `mark_last` ∈ {9.6, 9.9, 10.2, 10.5}; `time_to_silence` < 0.02 h (abrupt); classification **piracy**, office **Uruk**; cargo per Lane mix.
  - **8 genuine losses (reactor casualty, debris):** `mark_last ~ U(1, 12)` with rejection so at most one lands in [9, 10.5]; `time_to_silence` < 0.02 h; classification 5 **accident** + 3 **unknown**, office **Ceres**; cargo per Lane mix (DS-14).
  - **2,169 advisories:** `mark ~ U(1, 12)` — the Board's "spread along the Lane"; of these, **100 are gradual transponder degradations resolved without loss** (`severity = dropout`, `fade = gradual`) and the rest are debris advisories, profile-deviation advisories and medical diversions. The mean mark of **all 2,200 records is 6.5** (the Board's page quotes 6.5); the mean mark of the 31 losses alone is ≈ 8.5. Each of the 19 diverted hulls also has one *profile-deviation advisory* at Mark 9 (late check-in, +2–3 d), as any thrust-limited hull would.
- **Headline numbers.** Classification of the 31: unknown 22 (19 Uruk, 3 Ceres) · accident 5 (Ceres) · piracy 4 (Uruk). Uruk classified 23, Ceres 8. Losses are 31/2,200 = 1.4% of records. Time-to-silence: two piles — 12 abrupt (< 1 min), 19 gradual (3–8 h); the mean (≈ 3.4 h) sits in the gap. Gradual fades across all records: 119 (100 resolved dropouts + 19 losses) → P(loss | gradual fade) = 0.16, P(gradual fade | loss) = 0.61, P(no loss | gradual fade) = **0.84** — the Board's staff-paper figure (act-4-03). Mark-at-last-contact: 23 of 31 in [9, 10.5]. Tightest 30-day cluster of loss dates: **5** (2182-02-24 → 03-21: Kestrel Bough, Nicholson Regio, Thessaly Ember, Xibalba Sulcus, Hygiea Promise). Lost hulls' declared cargo value: median below the Lane median. Hull age: no difference.
- **Used by.** act-0-03, act-1-01, 1-02, 1-04, 1-05, 1-06, 2-01, 3-01, 3-03, 4-01, 4-03, 4-04, 4-09, 5-01, 6-02, 8-01/02/03/04, checkpoints I, II, IV, VIII.

### DS-02 · The Manifest file (Bureau departure certifications ⋈ relay-net Mark 2 telemetry)
- **Provenance / bias.** Bureau of Hulls and Cargo certifies each departure's declared mass, fuel load, drive model, examiner; the Authority relay net supplies the Mark 2 state vectors from which acceleration is derived. The Bureau's numbers are true to the tonne; the *declarations* they certify are the lie.
- **Size.** 412 departures (a routine Bureau sample across 2178–84), of which all 31 lost hulls are present (the request asked for them) plus 381 others in proportion to owner class.
- **Variables.** `hull`; `owner_class`; `drive` (Mk 3 / Tessera-C / other); `departure_date`; `lane_length_AU` (joined from DS-09); `declared_mass` (t, departure mass incl. propellant); `fuel_loaded` (t); `required_fuel` (t) = `f_lane(d) × declared` (the Bureau's own column: fuel the plotted profile needs for the declared mass); `examiner`; `accel_mark2` (mgee); `plume_power` (TW); `inferred_mass` (t) = thrust(plume, drive model)/accel; `later_lost` (bool).
- **Generating story.** Per DS-00. `declared_mass ~ U(14,000, 27,000)` for standard hulls; **one Mercantile bulk hauler, MV *Cyrene Ore*, at 60,000 t** (the leverage point). Honest: `inferred_mass = declared × (1 + N(0, 0.020))` — **residual SD 2.0% of declared mass** (s ≈ 400 t at 20,000 t); `fuel_loaded = required_fuel × (1 + N(0, 0.010))`. **The 19 diverted:** `inferred = declared × (1 + h) × (1 + N(0, 0.020))`, h per DS-00 (ten at 0.06–0.09, nine at 0.10–0.13); fuel per DS-00. The 12 other lost hulls are honest. **Examiner:** Dacre signed **18 of the 412 — 17 of the 19 diverted and 1 of the 393 others**; three other examiners sign the rest.
- **Headline numbers.** r(inferred, declared) ≈ 0.99; LSRL slope ≈ 1.00, intercept ≈ 0; the 19 sit at **+6–13%** (z ≈ 3–6.5 on the residual scale) and are the only points above +5%; no fan in the residual plot. *Cyrene Ore* is high-leverage (leverage > 4/n; a Briefing caution, not a drill rule) and not influential: with/without changes the slope in the third decimal. Fuel vs **required Lane fuel** is linear through the origin with slope 1.00 (fuel vs *declared mass* is not one line, because f_lane moves with the departure geometry — the 2-06 lesson); the 19's fuel points sit high (slope ≈ 1.17 on the 19 alone). The Bureau's cover note quotes its routine QA r² (0.98) and omits s.
- **Used by.** act-2-02, 2-03, 2-04, 2-05, 9-01, 9-02, checkpoint II, IX.

### DS-03 · Two surveys
- **DS-03a · Ceres dock survey (the Authority's).** Voluntary response; frame = masters who *arrived* at Ceres and answered a notice at the dock office; n = 212; Q4 leading ("Do you believe pirates operating from the Free Holds are responsible for recent Lane incidents?"): **94% yes**. Owner mix of respondents: Perrine 9%, Mercantile 61%, independent 30%. No Sulcus master who later diverted is in it, by construction.
- **DS-03b · Lane masters' survey (yours).** Frame = the Lane schedule, **260 masters in transit** at MET 57 (Perrine 88, Mercantile 110, independent 62). Design chosen by the learner: SRS n = 40; or stratified 15/15/15 (n = 45); or cluster by convoy (6 convoys of ~7, n ≈ 42). Responses generated per stratum: belief in piracy — independents 31%, Mercantile 48%, Perrine (responders) 100%; "seen a Sulcus hull turning late" (independents and Mercantile only) and Sulcus nonresponse, by design: **SRS** 6 of 40 turning-late; Sulcus 9 contacted, 2 answered ("no comment"), 7 silent. **Stratified** 7 of 45; Sulcus 15 contacted, 3 answered, 12 silent. **Cluster** 5 of 42; Sulcus 11 contacted, 2 answered, 9 silent (and a wider interval: clusters share a convoy's experience). Link-time cost per contact: 55 ± 15 min of Solberg's time; cluster contacts share a link (20 min each after the first).
- **Used by.** act-3-01, 3-02, 3-03, 3-05 (context), 6-08 (context), checkpoint III.

### DS-04 · The Admiralty escort trial and the *Asgard* lottery
- **DS-04a · Board's 2183 trial.** Two announced convoys (14 transits) escorted by *Tindr*; assignment by owner request (Mercantile houses asked; no Sulcus departures that month); zero incidents; conclusion "deterrence effective." Owner is perfectly confounded with escort; no unescorted control transits in the same window.
- **DS-04b · *Asgard* escort lottery (yours, MET 74–79).** 12 transits departing Mark 6–7 in one week; 6 escorted, chosen by lot (Solberg's random digits, logged). Response: **off-nominal advisories per transit** (the Register's minor-record count). Escorted: mean 1.5 (values {0,1,1,2,2,3}); unescorted: mean 2.2 ({1,1,2,2,3,4}). Difference −0.67; exact randomization distribution (all C(12,6) = 924 relabellings): **one-sided p = 0.23** (Ebele's directional claim), two-sided 0.46. Losses: none (a 1%-per-transit event cannot be seen in 12 transits — that is the lesson).
- **Used by.** act-3-04, 3-05, checkpoint III, 6-06 (power foreshadowing).

### DS-05 · The Chief's tables (sink endurance and subsystem loads)
- **Provenance.** *Nightjar*'s design book (Adlinda) and Sandoval's shakedown runs. Sink capacity **78 GJ** (21.7 MWh) as designed; **68 GJ after the *Halden Reach* refit**; skin loop 70 kW.
- **Cold profiles.** Endurance = capacity ÷ load, and the load is a random variable (below), so every endurance has an SD. The Chief's *working figure* is the design mean minus one SD; "in writing" is minus two.
  | Profile | Load | Design mean | SD | Chief's working figure | Post-refit design mean | Post-refit working |
  |---|---|---|---|---|---|---|
  | Quiet | 190 kW | 114 h (shakedown measured the Quiet curve ~5% optimistic → 108 h) | ~5 h | 103 h | 99 h | 94 h |
  | **Watch** | **320 kW** | **67.7 h** | **4.2 h** | **64 h** (60 h = −2 SD, "in writing") | **59 h** | **55 h** |
  | Standby | 670 kW | 32 h | ~1.5 h | 31 h | 28 h | 27 h |
  The refit shortened Watch by **8.9 h against the design mean** (68 → 59; DS-12); the Chief quotes both figures and says which.
- **Watch-profile subsystem loads (kW, mean ± SD, independent).** Life support 60 ± 6 · computing/sensor processing 110 ± 15 · comms 12 ± 3 · cryocooler (skin) loops 70 ± 8 · pumps & misc 40 ± 6 · hotel (16 people) 28 ± 4. Sum 320; **SD of the total √386 ≈ 19.6 kW**. Two wrong answers bracket it: Ebele's naive sum of SDs (42 kW, too pessimistic) and the yard's spec sheet, which quotes ±8 kW as if the six errors averaged out (too generous) — see act-4-07. P(load > 338.5 kW, i.e. saturation before 64 h) ≈ 0.17; P(> 361 kW, before 60 h) ≈ 0.02.
- **Purge:** 2.6 h with wings out, detectable by naval sensors at 0.55 AU. **Torch from cold: 4 min.** Cold *Nightjar* detectable naval-grade at 3.7 million km, civilian at 370,000 km.
- **Used by.** act-0-02, 4-05, 4-06, 4-07, 7-04 (drill context), 8-02, checkpoint IV.

### DS-06 · The Sweep log (own-ship)
- **Provenance.** The Eyes' scheduled one-degree sweeps; each entry: `sweep_id`, `MET`, `sector`, `dwell_s`, `range_band`, `detection` (bool), `mode` (thermal / optical / RF; mutually exclusive per entry), `sink_pct`. Clean but **scheduled**: detection = coverage × sensitivity × integration time. A detection triggers a focused re-sweep of the same sector, so consecutive sweeps are *not* independent.
- **Generating story (Act IV, ~1,400 sweeps over the loiter).** Base detection rate per sweep 0.06 (of anything: plumes, sunlit hulls); P(detection | previous sweep detected same sector) = 0.55; mode split thermal 0.70 / optical 0.22 / RF 0.08. **Picket-side model** (the one that matters): P(a Kettle-side picket's sweep covers *Nightjar* in a given hour) by range band — 0.05 AU: 0.030/h; 0.10 AU: 0.012/h; 0.15 AU: 0.004/h; P(detect | covered, cold) = 0.35. Per-sweep p for "a picket sweep catches you" at the middle loiter point ≈ 0.02.
- **Used by.** act-4-02, 4-03, 4-04, 4-05, 4-08, 4-10, checkpoint IV.

### DS-07 · Lane arrivals at Mark 9 (rates)
- All transits **1.19/day**; Perrine **0.41/day**; Mercantile 0.50/day; independents 0.28/day (from DS-09 over 2,190 days). Modeled as hourly Bernoulli trials (p = 0.0171/h for Perrine) — the binomial approximation to Poisson arrivals, taught as such. P(≥ 1 Perrine hull in a 68-h window) ≈ 0.69; expected 1.16, SD 1.07. Diversion rate per Perrine passage: unknown; the six-year rate is 19/900 ≈ 0.021; the last twelve months give 5/150 ≈ 0.033; the drills explore p ∈ [0.02, 0.10].
- **Used by.** act-4-06, 4-08, 4-10.

### DS-08 · Cutter reports and corridor baselines
- ***Asgard*:** 3 losses in 410 observed transits. ***Tindr*:** **1 in 380** (bible corrected from 0; see §5). Board's Lane figure 31/2,612 = **1.19%**. Board's comparison corridor: **Mars–Belt, 46 losses in 4,180 transits = 1.10%**. Rook's 2176 *Asgard* report: **13 in 2,580 = 0.50%** (Lane, 2168–76). The Board's preferred summary statistic in its rebuttal: "the lower of the two cutters' observed rates" (min of two p̂ — biased low).
- Under p = 0.0119: P(X ≤ 3 | 410) ≈ 0.28, P(X ≤ 1 | 380) ≈ 0.06 — both ordinary; under 0.005: 0.85 and 0.43.
- **Used by.** act-4-09, 5-01, 5-04, 6-02, 6-03, 8-03, checkpoint V.

### DS-09 · The Transit Ledger (relay-net archive of every Lane transit, 2178 → MET 0)
- **Provenance / bias.** Authority relay net; clean. One row per transit. 2,612 transits: **Perrine 900**, Mercantile 1,100, independent 612 (others = 1,712).
- **Variables.** `transit_id`; `hull`; `owner_class`; `drive`; `departure_date`; `lane_length_AU` at departure (2.4–8.0 across the cycle); `filed_accel` (mgee, within the Lane's permitted 2.7–3.3 band); `scheduled_t9` (d, = 0.75 × 2√(d/a_nominal)); `mark9_delay` (d, actual − scheduled against the nominal 3.00-mgee plot); `lost` (bool); `beneficiary` (Perrine / other, from DS-10 for lost hulls; owner's insurer otherwise).
- **Generating story.** Honest transit: `mark9_delay = u_hull + N(0, 0.9)`, where `u_hull ~ N(0, 2.5)` is a **persistent per-hull filing offset** (a hull that files 2.9 mgee is always ~1.2 d slow against the nominal plot; slow filing saves Δv, so owners do it). Fleet SD of delay ≈ **2.66 d**. Perrine's honest hulls file a hair slow: mean +0.2 d. **The 19 diverted transits:** `mark9_delay = 2.8 + N(0, 0.9)` (thrust-limited at ≈ 2.79 mgee by the hidden mass; their filed profile was 2.8, inside the band, so the Authority never flagged them). Transit time vs lane length follows `t9 ∝ √d` exactly (brachistochrone) — the Act II curvature dataset.
- **Headline numbers.** Loss rate Perrine 19/900 = 2.11% vs other 12/1,712 = 0.70%; pooled 31/2,612 = 1.187%; two-proportion **z ≈ 3.16, one-sided p ≈ 0.0008**; large-counts check 900 × 0.01187 = **10.7** (passes narrowly, on purpose). Two-proportion 95% interval for the difference: (0.004, 0.024). 2×2 chi-square (loss × beneficiary) ≈ 10.0, df 1 (= z²). P(one honest transit ≥ 2.8 d late) ≈ 0.15; P(mean of 19 honest ≥ 2.8) → z ≈ 4.6. Surviving Perrine (881) vs others (1,712) mean delay: difference ≈ 0.2 d, interval contains 0. Lost Perrine (19) vs surviving Perrine (881): difference ≈ 2.8 d, t ≈ 4.5, interval ≈ (1.5, 4.1) d. Ostrow's pooled "all Perrine vs all others": difference ≈ 0.25 d ("within a day").
- **Used by.** act-2-06, 4-09, 5-01…5-05, 6-01…6-08, 7-03, 7-05, 7-06, 7-07, 8-03, 8-04, checkpoints V–VIII.

### DS-10 · The Claims register (Authority claims office, Ceres)
- 31 rows: `hull`, `policy_holder`, **`beneficiary`**, `insurer` (Tharsis Mutual / Lunar Pool), `payout` (M₵), `date_paid`, `classification`. **Beneficiary Perrine Holdings on all 19 diverted hulls**; the other 12 name 11 owners. Tharsis Mutual has paid Perrine 2.1 B₵. Source is Okafor-Reyes (clean, two days late) or Adjuster Renn (fast; Martian fingerprints) — same rows either way.
- **Used by.** act-6-03…6-08, 8-03, 8-04.

### DS-11 · The Refit set (Adlinda uprate logs)
- **Provenance.** Twelve Sulcus hulls through a Mk 3 "drive uprate" 2181–83; Bureau post-refit output certification; the Ledger's `mark9_delay` for the run immediately before and after the uprate. Forwarded by Sandoval's old lead fitter because the Act VI report was "referred for review." Small, paired, honest.
- **Variables (12 rows).** `hull`; `refit_date`; `output_kN` post-refit (spec 588 kN); `delay_before` (d); `delay_after` (d); `among_19` (bool: 9 yes, 3 no).
- **Generating story.** `output_kN ~ N(612, 7)` (mean **+4.1% over spec**, s ≈ 1.2%). `delay_before = u_hull + N(0, 0.9)`, `u_hull ~ N(0, 2.5)`. `delay_after = u_hull + shift + N(0, 0.9)` with shift = **2.8** for the 9 diverted-on-the-next-run hulls and 0 for the 3 honest uprated hulls.
- **Headline numbers.** t-interval for mean output excludes spec (t ≈ 12). **Paired:** mean difference ≈ 2.1 d, SD of differences ≈ 1.8, t ≈ 4.1, df 11, p ≈ 0.001. **Two-sample on the same numbers:** t ≈ 1.8, p ≈ 0.08 — "nothing." Reject seeds where the paired p > 0.01 or the two-sample p < 0.05.
- **Used by.** act-7-01, 7-02, 7-04, 7-07, checkpoint VII.

### DS-12 · *Nightjar*'s own sink refit (8 matched cold profiles)
- Eight standard cold profiles (Quiet ×3, Watch ×4, Standby ×1) run by Sandoval before and after the *Halden Reach* refit; endurance in hours. Watch loss **8.9 ± 1.0 h** (paired; t ≈ 8 on the four Watch runs; the full set mixes profiles so differences are expressed as % of design). Drill context only (map §8 / bible §14.8).
- **Used by.** act-7-04 drills, act-8-02 (the table that is wrong by nine hours).

### DS-13 · Kettle: survey camera and Oyelaran's lidar buffer
- Survey camera at 60,000 km: 11 warm shapes docked, 3 standing off. Lidar at 38,000 km, 40-s dwell: **14 hull IDs** — *Marius Regio*, *Harpagia Sulcus*, *Nicholson Regio*, *Perrine Regio*, *Tiamat Sulcus*, *Xibalba Sulcus*, *Galileo Regio*, *Dardanus Sulcus*, *Sippar Sulcus*, *Byblus Sulcus*, *Nun Sulci*, *Zakar Sulcus*, *Kishar Sulcus*, *Bubastis Sulci* (12 of the 19 + the two in-story diversions). A 12-s dwell returns 9. Fields: `hull_id`, `range_km`, `bearing`, `state` (docked / standing off), `refit_visible` (bool). Cross-joins to DS-01 (all 14 are Register "unknown, presumed lost") and DS-10 (all 14 beneficiary Perrine).
- **Used by.** act-8-02 (gated scene), 8-03, 8-04, 9-04.

### DS-14 · Cargo mix (GOF table)
- Lane-wide declared cargo mix (from DS-09): **He-3/deuterium 0.38 · volatiles 0.21 · metals 0.17 · manufactured & other 0.24** (four categories — bible collapsed from five; see §5). Observed among the 31 lost: **He-3/D 5 · volatiles 21 · metals 2 · other 3**. Expected 11.8 / 6.5 / 5.3 / 7.4 (all ≥ 5). **χ² ≈ 40.8, df 3, p < 0.0001**; contributions: volatiles 32.3 (over, ×3.2), He-3/D 3.9 (under), other 2.7, metals 2.0.
- **Used by.** act-8-01, 8-02, checkpoint VIII.

### DS-15 · Mars–Belt corridor losses (Board's comparison corridor)
- 46 losses in 4,180 transits; classification **accident 22 · piracy 13 · unknown 11**. Lane: 5 / 4 / 22. Homogeneity χ² ≈ **16.9, df 2, p ≈ 0.0002**; Lane-unknown expected 13.3, observed 22 (71% vs 24% — "three times the unknown").
- **Used by.** act-8-03, 8-04.

### DS-16 · Brandt's file (Bureau fuel certifications, all 900 Perrine departures)
- **Provenance.** Senior Examiner Brandt, on her own authority; clean. `hull`; `departure_date`; `declared_mass` (t); `fuel_loaded` (t); `examiner` (Dacre / Voss / Amari / Penrose); `diverted` (19 flagged, by DS-13 ⋈ DS-01); for the 19, `dv_kettle` (km/s) = Δv from Mark 9.4 to rest at Kettle on that departure date, from the nav software: **U(24, 38)** across six years as the geometry moves.
- **Generating story.** Honest 881: `fuel = 0.215 × declared × (1 + N(0, 0.010))`. The 19: `fuel = declared × (1 + h) × (1 − e^(−(242 + dv_kettle)/1000))`, `h ~ U(0.06, 0.09)` (the same `h` as DS-02). **Examiner:** Dacre signed 22 of 900 — **17 of the 19 diverted and 5 honest**; the other three examiners signed 878 (2 diverted, 876 honest).
- **Headline numbers.** Fuel on declared mass, the 19: slope ≈ **0.257**, SE ≈ 0.009, df 17, 95% interval ≈ (0.238, 0.276) — **excludes 0.215**; the 881 honest: slope 0.215 ± 0.0004, brackets it. **Excess fuel fraction (fuel/declared − 0.215) on Kettle Δv, the 19: slope ≈ 0.00082 per km/s, SE ≈ 0.00012, t ≈ 7, p < 0.0001**; the rocket equation's marginal fuel per km/s at the Lane's 1,000 km/s exhaust and a ~270 km/s total burn is (1 + h̄)·e^(−0.273)/1000 ≈ **0.00082** (Ebele's first guess, 1/vₑ = 0.0010, is the slope at zero Δv). Examiner × diverted: expected Dacre-diverted 0.46 (< 5; chi-square invalid); permutation/hypergeometric P(≥ 17 of 19 on Dacre's 22) < 10⁻⁴ (simulated p reads 0 of 10,000).
- **Used by.** act-8-04 (examiner table), 9-01, 9-02, 9-03, 9-04, checkpoint IX.

### DS-17 · Kettle picket model (Ebele's tree, Act VIII)
- P(a wrecker is at Kettle at all) = 0.75 (PROVIDENT has one tug and one depot); P(cold and within slug range of the approach quarter | present) = 0.40; product **0.30** = P(a picket is positioned to respond). P(the picket sees *Nightjar* cold | positioned) = 0.10 for a 12-s dwell vs 0.12 for 40 s — but P(the picket sees the *lidar lamp* | positioned) = 1.0 for any dwell. The model the learner is given assumes the first; the debrief exposes the second. Slug flight 38,000 km / ~60 km/s ≈ 10 min; torch from cold 4 min.
- **Used by.** act-8-02, 10-01.

### DS-18 · Shakedown telemetry (Prologue)
- Six dead-reckoning fixes per cold run (position error, km; `N(0, 120)` per axis; six-fix mean and range re-run on demand); sink temperature vs time on three runs (design curve vs measured, ~5% optimistic); Callisto telescope detection at 61 h on Watch.
- **Used by.** act-0-01, 0-02.

### DS-19 · Drive-signature contact log (Act I)
- Oyelaran's Lane contacts MET 12–27: **60 plumes** (11 by MET 15). `contact_id`; `drive_family` (Mk 3 / Tessera-C / Mk 2); `pulse_hz`; `plume_TW`; `declared_mass` (from transponder); `expected_TW` (class table for that mass and profile); `ratio_pct` = plume/expected × 100; `accel_mgee`. Honest `ratio_pct ~ N(100, 2.8)`; class table's *rated* spread 3.5. **One hot contact: MV *Harpagia Sulcus*, Mk 3, ratio 109.2** (z ≈ 2.6 against the rated 3.5; z ≈ 3.3 against the fleet's own 2.8). Plume power by family is bimodal (Mk 3 ≈ 0.29 TW at 20 kt; Tessera-C ≈ 0.22 TW). *Harpagia Sulcus* goes transponder-dark at Mark 9.3 at MET 59 (Act III); if the Eyes were kept on the sweep in Act II, the log holds its plume vector change (≈ 11°, ± 0.5°, at 0.7 AU).
- **Used by.** act-1-03, 1-04, 1-05, 1-07, checkpoint I.

### DS-20 · The Phobos signature (Epilogue)
- One 2177 intercept (text); one 2184 drive signature at Phobos yards. Tree inputs: P(signature | heavy hull working up) = 0.90; P(signature | not) = 0.05; base rate of heavy-hull signatures at Phobos over ten years: 0.02 (Achterberg's number) or 0.20 (Ashby-Hale's implicit one). Posterior 0.27 vs 0.82.
- **Used by.** act-10-02.

---

## 3. Acts and modules

Block format: header line (id · title · minutes · AP topics · calc briefing) → crew / MET / location → **Situation** → **Concept** → **Instrument** → **Dataset** → **Drills** → **Mission beat** → **Clue** → **Log entry** → **Delete-the-math**.

### PROLOGUE · Shakedown (3 modules · 60 min)

**Opening.** MET 0/06:00, Adlinda Yards, Callisto. *Nightjar* leaves the slip under tug; the Chief reads the cellar at 4% and warming. Ferrier has been aboard nine days. Orders: three cold runs against Callisto's own telescopes, which know where to look. **Heat state:** hot, wings out, sink empty.
**Pressure.** The yard wants numbers; the Board wants a ship it can announce; the sink's design figures have never been tested with sixteen people breathing in her.
**Investigative question.** What does "cold" cost, and can the ship's own numbers be trusted before anyone else's?
**Closing turn.** MET 9: the Board's tasking arrives with a one-page summary of the Incident File — a mean (Mark 7.1, "spread along the Lane") and a conclusion. You ask for the records. 2,200 of them. To know whether the summary is honest you need the shape, not the centre.
**No checkpoint.** The Prologue ends on the departure burn (MET 10/03:00).

#### act-0-01 · Shakedown — 20 min · AP 1.1 · calc: —
Crew: xo, engineer, sensors (background) · MET 0/06:00–2/12:00 · Adlinda slip → Jovian space, under tug then 3 mgee.
**Situation.** You walk the ship: the cellar, the folded wings, the blister where Oyelaran is calibrating the Eyes on Jupiter's limb. Ferrier runs six dead-reckoning fixes against Callisto's beacon on the first cold hour; the six numbers disagree, and the tug master wants to know "the" error. Ferrier says the data says six things. You ask for the one number that summarizes where the ship thinks it is, and for the one that says how sure.
**Concept.** Variation is the normal condition of measurement, not a fault; a mean summarizes centre; a range is not a summary of centre. Population (all fixes the procedure could produce) vs sample (these six); parameter vs statistic. Misconception: "variation means something is wrong."
**Instrument.** Nav fix-error display (`<Plot>` dotplot + `<MonteCarlo task="normal-sample-mean">`): re-run six-fix sequences; watch the six points scatter and the mean wander less than any single fix.
**Dataset.** DS-18, fix errors `N(0, 120)` km per axis; six per run.
**Drills.** 4: mean of a small set; identify parameter vs statistic in ship telemetry; "which of these is a summary of centre"; re-run variation (numeric). No rubric drill (Prologue).
**Mission beat.** kind numeric — report the mean fix error of the seeded six-fix run to the tug master, with the range as a separate number. Wrong: Ferrier: "You gave him the spread as the position." Retry with a new run.
**Clue.** Nothing about the Lane yet; the ship's own dead-reckoning error (±300 km class) is established — the number that makes any ship on a published profile hittable.
**Log entry.** *Variation is data.* Mistake: reporting a range as if it were a centre.
**Delete-the-math.** Without the fix statistics there is no error budget; the ±300 km that kills freighters (§2.3) and lets a slug find a cold *Nightjar* (Act VIII) would be an assertion instead of a measurement.

#### act-0-02 · Heat Budget — 20 min · AP 1.2 · calc: —
Crew: engineer, xo, sensors · MET 2–5 · Jovian space, first and second cold runs (Quiet 40 h; Watch to 61 h).
**Situation.** First cold run, Quiet profile. Sandoval's live readout of sink temperature against the design curve: the curve is optimistic by about 5% and she logs it with a plus-or-minus. Second run, Watch: Callisto's telescopes find you at 61 h when the skin loop lags; Oyelaran says the Eyes would have found you at 50. Ferrier asks what the crew's estimate would be if the telescopes had been looking somewhere else. You have Ebele build the table: every quantity the ship logs on a cold run, and what kind of thing each is.
**Concept.** Individuals and variables; categorical vs quantitative; discrete vs continuous; units. The sink is the ship's governing resource and it is a quantitative, continuous variable with run-to-run variation. Misconceptions: hull numbers and cause codes are "numbers" but categorical; "continuous means any number" vs counts.
**Instrument.** Heat-sink capacity gauge (`<Sim>`): set the cold window and profile; watch capacity drain with run-to-run variation; hours-remaining readout with the Chief's ±. Reused as the cost display through Act IV.
**Dataset.** DS-05 (design vs measured) and DS-18 (three runs).
**Drills.** 4: classify telemetry variables; identify individuals in a run table; "the design curve promised 114 h — what is the measured shortfall as a percentage"; discrete vs continuous with units.
**Mission beat.** kind choice + numeric — classify four variables (profile, sink %, hours remaining, detection yes/no) and report the measured Watch endurance from the seeded run with its ± (the Chief accepts "64 ± 4"). Wrong: Sandoval goes silent and checks a gauge; retry.
**Clue.** The book's sink numbers are optimistic; the ship can hide for days, not weeks.
**Log entry.** *The sink is a variable, not a constant.* Mistake: treating a coded number as quantitative.
**Delete-the-math.** Without the measured shortfall there is no "call it sixty-four" in Act IV, no variance on the load, and the Chief's "past sixty I want it in writing" is theatre instead of arithmetic.

#### act-0-03 · Tasking — 20 min · AP 1.1, 1.3 · calc: —
Crew: comms, analyst, xo, medic, admiralty · MET 8/14:00–10/03:00 · Jovian space; departure burn at 4 mgee.
**Situation.** Solberg: "Valhalla. Forty-one seconds out." The Board directs *Nightjar* to the Lane, reporting through the Directorate of Lane Operations; signed Ashby-Hale personally; *Good hunting, Anselm.* Ferrante's fitness board. Ebele's first brief: the Incident File as one summary page — 31 hulls, six years, mean mark 7.1, "spread along the Lane," a table of classifications. You ask for the file. It is 2,200 records. He offers a summary by morning; you tell him you want the records, and while the file loads you have him compute what fraction of the *summary's* rows are actually losses.
**Concept.** Frequency and relative-frequency tables; what population the Register describes (Lane incidents as recorded by two offices) and what it does not (the Lane). Misconceptions: "the register is the population"; confusing count with proportion.
**Instrument.** Register browser (sortable/filterable table with a frequency-table panel that recomputes counts and relative frequencies on filter).
**Dataset.** DS-01, all 2,200 records, `severity` and `classification` columns.
**Drills.** 5: relative frequency from a filtered table; count vs proportion; identify the population a table describes; which filter changes the denominator; "the Board's page says 1.4% of records are losses — how many is that."
**Mission beat.** kind numeric — with the browser filtered to `severity = loss`, report the relative frequency of `classification = unknown` (≈ 0.71). Then a **decision** (flavour): accept the tasking as written, or query the reporting line. Query → the Board: "the line is correct"; Ferrier logs that it is unusual to bypass the Flag Secretary; Maalouf remembers in Act IX.
**Clue.** The summary page's mean is taken over 2,200 records of every severity; the 31 losses are 1.4% of it. Seven in ten losses are coded *unknown*.
**Log entry.** *A table is only as honest as its denominator.* Mistake: reading a count as a proportion.
**Delete-the-math.** Without the relative frequency on the loss-filtered table, the mean of 7.1 stands as the Board's finding and Act I has nothing to rebin.

---

### ACT I · Signatures (Unit 1 · 7 modules + checkpoint · 205 min)

**Opening.** MET 12. Twelve days out at 4 mgee, the Jovian system a bright smear astern; under thrust there is down. The Eyes log every plume on the Lane; the Incident File is open on the intel terminal; Ebele has made histograms and is proud of them. **Heat state:** hot, wings out; the sink does not matter yet.
**Pressure.** Light-lag to Valhalla lengthens daily; the Board expects a preliminary within thirty days; Oyelaran and Ebele argue about what a reading is.
**Investigative question.** What is the *shape* of the 31 losses — and is the Board's one number a description of it?
**Closing turn.** MET 30: the preliminary — two processes, one abrupt and coded piracy, one gradual and coded unknown, both concentrated late in the Lane — is answered in four hours: *noted; continue within the assigned profile.* The gradual-silence hulls are all Sulcus hulls that passed Bureau certification. If they were heavier than they said, the Lane's own telemetry would show it. That needs two variables.
**Checkpoint framing (act-1-checkpoint · "Signatures" · 20 min).** Ferrier reads the preliminary before Solberg sends it: "This goes out under the Captain's name. I want every display in it to survive a hostile reader." The checkpoint is her read-through; each missed item is a line she strikes and names the module. On pass: Solberg counts twenty minutes out. On fail: "It doesn't go tonight. Fix these first." Items per map §5 (q1–q11).

#### act-1-01 · Register of Losses — 25 min · AP 1.1, 1.2, 1.3 · calc: —
Crew: analyst, xo · MET 12/09:00 · Intel terminal, bridge.
**Situation.** Ebele's first display: a histogram of *mark* across all 2,200 records, binned in threes — flat, "spread along the Lane," exactly the Board's page. You have him filter to the 31 losses and describe each column before he draws anything: what is an individual here, what kind of variable is `classification`, `mark_last`, `time_to_silence`, `office`. He builds the frequency table of classification for the 31 and a second one by office. Ferrier: "Show me what thirty-one random accidents look like on that axis" — and the module ends with that request unanswered, on purpose.
**Concept.** Individuals, variables, types; frequency/relative-frequency tables for a categorical variable; the Register as a *recorded sample of a reporting process*, not the corridor. Misconceptions: coded numbers as quantitative; relative frequencies that fail to sum to 1 because a row is missing.
**Instrument.** Register browser + variable inspector: click a column, classify it, see its table; the office × classification table recomputes on filter.
**Dataset.** DS-01, loss subtable.
**Drills.** 5: variable classification; relative frequencies by office; population vs sample statements; parameter vs statistic; "which two filters give the Board's flat histogram."
**Mission beat.** kind numeric + choice — relative frequency of *unknown* among Uruk-classified losses (19/23 ≈ 0.83) vs Ceres-classified (3/8); then choose the correct description of what the Register is a sample of. Wrong: Ebele: "Yes, sir. That's — yes." Retry with reseeded office splits.
**Clue.** Uruk classified 23 of 31 and coded 19 of its 23 *unknown*; Ceres coded none *piracy*. Not yet proven: that this means anything beyond two offices' habits.
**Log entry.** *Know your individuals before you draw.* Mistake: a coded variable treated as a measurement.
**Delete-the-math.** Without the office × classification table the Uruk/Ceres asymmetry is never noticed; Act III's "classification is coming from Uruk" and Act VIII's supplementary tables have no seed.

#### act-1-02 · Cause Codes — 20 min · AP 1.4 · calc: —
Crew: analyst, xo, admiralty (the summary page) · MET 13 · Bridge.
**Situation.** The Board's summary page has a bar chart: *Incident classifications, 2178–84* — four tall bars for advisories, dropouts and faults, and *unknown* a sliver at 5%. Ebele restores the denominator: losses only. *Unknown* becomes 71%. Then he cannot resist a pie chart of the same thing, and a second chart with the axis starting at 60% to make his point louder. You make him take both down. Ferrier: "The honest chart is the one that survives the Board's staff."
**Concept.** Bar charts (counts, relative frequencies), when a pie is legitimate; how denominator, baseline, scale and bar area distort; comparing two categorical distributions side by side. Misconceptions: pies for non-part-of-whole data; reading a truncated axis as a proportional difference.
**Instrument.** Display-integrity panel: the Board's chart with adjustable denominator (all records / losses), baseline, axis scale, bar width; "restore honest axes" toggle; side-by-side bars Uruk vs Ceres.
**Dataset.** DS-01 (all records vs loss subtable; classification × office).
**Drills.** 5, one rubric (`compare-distributions`, categorical variant): identify the distortion; compute the honest relative frequency; side-by-side comparison in context; "which chart type fits this question."
**Mission beat.** kind choice + interpretation — pick the statement the Board's chart misrepresents, and write a two-sentence honest comparison of Uruk vs Ceres classifications (rubric: comparative language, proportions, context). Wrong: the Board's staff would have caught it; Ferrier names the distortion; retry.
**Clue.** The official *story* is piracy; the official *codes* are 4 piracy, 22 unknown. The story and the ledger disagree.
**Log entry.** *A chart's denominator is its first claim.* Mistake: comparing counts across groups of different size.
**Delete-the-math.** Without fixing the denominator the Board's "unknown is negligible" chart stands and the story-vs-codes gap never opens.

#### act-1-03 · Drive Signatures — 30 min · AP 1.5, 1.6 · calc: —
Crew: sensors, engineer, analyst · MET 15 · Sensor bay.
**Situation.** Oyelaran's first Lane contacts: eleven plumes, then sixty by the week's end. "Plume 0.29 terawatt, 61 hertz. Mk 3. It's a Sulcus hull." She reports one "confirmed Mk 3, on profile." You have Ebele plot plume power for all sixty: two humps, one per drive family. Then the ratio of plume to the class table's expectation for each hull's declared mass: one hump, and one point out on the right. Oyelaran says the class table is wrong. Sandoval says the class table has a spread for a reason. You ask what bin width Ebele used and make him show three.
**Concept.** Dotplots, stemplots, histograms; bin width; describing shape, centre, variability, unusual features (SOCS) in context. Misconceptions: "skewed left" read from the peak instead of the tail; histogram treated as a bar chart.
**Instrument.** Dotplot/histogram builder with draggable points and bin-width slider; stemplot toggle; group by drive family.
**Dataset.** DS-19 (60 contacts; `plume_TW` bimodal by family; `ratio_pct` unimodal with the hot contact).
**Drills.** 6, one rubric (`describe-distribution`): choose a bin width that shows the two families; describe `ratio_pct` in context with units; identify the unusual feature; stemplot read.
**Mission beat.** kind interpretation — describe the distribution of `ratio_pct` (shape, centre, spread, the unusual value) in context. Then a **decision** (flavour): trust the class table or Oyelaran. Debrief either way in 1-07.
**Clue.** One Sulcus hull, MV *Harpagia Sulcus*, runs ≈ 9% hot for its declared mass. Not yet proven: that "hot" means "heavy."
**Log entry.** *Shape first, then centre, then spread, then the thing that doesn't fit.* Mistake: describing the peak and calling it the skew.
**Delete-the-math.** Without the ratio histogram *Harpagia Sulcus* is one "confirmed" contact among sixty and nobody asks for its hull id; its disappearance in Act III is a line in a feed instead of a ship you flagged.

#### act-1-04 · The Mean in the Gap — 30 min · AP 1.7 · calc: —
Crew: analyst, sensors, xo · MET 19 · Bridge, intel terminal.
**Situation.** Time-to-silence. Ebele reports the mean transponder-degradation interval as 3.4 hours. The dotplot shows two piles: under a minute (twelve hulls) and three to nine hours (nineteen). "It's two piles, sir, and the mean is sitting in the gap." Back in the sensor bay the hot contact drags the fleet's mean ratio up by half a point while the median does not move. You make him compute all of it — mean, median, range, IQR, SD — twice, with and without *Harpagia*, and say which he would report to the Board and why.
**Concept.** Mean, median, range, IQR, SD in context; resistance; SD as typical distance from the mean, in units; n − 1 stated once. Misconceptions: "SD is the average deviation"; median as the middle of the graph; dividing by n.
**Instrument.** Outlier and skew explorer: drag one point out of the cluster; watch mean vs median and SD vs IQR diverge live.
**Dataset.** DS-01 `time_to_silence` (31) and DS-19 `ratio_pct` (60).
**Drills.** 6, one rubric (`standardDeviationInterpretation`): compute median/IQR; which statistics move when a point is dragged; SD interpretation in percent-of-expected; resistant vs non-resistant choice with justification.
**Mission beat.** kind numeric + choice — report the median and IQR of `time_to_silence`, and choose the honest summary of a bimodal variable (neither mean nor median alone; report the two piles). Wrong: Ferrier: "You just told the Board 3.4 hours. Which hull took 3.4 hours?" Retry.
**Clue.** Two processes: abrupt silence (12) and gradual fade (19). The Board's mean describes neither.
**Log entry.** *A centre is only a centre if there is one.* Mistake: reporting a mean for a two-humped variable.
**Delete-the-math.** Without median-vs-mean the "two processes" reading never forms; the preliminary at MET 27 has nothing to claim.

#### act-1-05 · Five Numbers — 25 min · AP 1.8 · calc: —
Crew: analyst, sensors · MET 21 · Sensor bay.
**Situation.** Ebele draws boxplots because he has learned them. The boxplot of `ratio_pct` puts *Harpagia Sulcus* beyond the upper fence, alone, and you have Oyelaran log the hull id and request its Bureau certification — the first thread. Then he draws a boxplot of `time_to_silence` and it looks like nothing at all: a box, two whiskers, no outliers. Two piles, and the box hides both. Oyelaran, quieter: "The Eyes wouldn't have shown me that either."
**Concept.** Five-number summary, modified boxplot, 1.5 × IQR rule; what a boxplot shows (spread, skew, outliers) and hides (modes, gaps). Misconceptions: "the box holds 50% of the range"; box width as sample size.
**Instrument.** Boxplot builder with draggable points and live fences; toggle to overlay the dotplot to see what the box conceals.
**Dataset.** DS-19 `ratio_pct` (flags *Harpagia*); DS-01 `time_to_silence` (the counter-example).
**Drills.** 5, numeric-only (map §7): five-number summary; upper fence and outlier count; read shape from a boxplot; "which of these dotplots produced this boxplot."
**Mission beat.** kind numeric — upper fence for `ratio_pct` and the number of contacts beyond it (one); then kind choice — which display would have revealed the two piles in `time_to_silence`. Wrong: reseed the contact log.
**Clue.** *Harpagia Sulcus* is a formal outlier; its hull id is requested. Not yet proven: why it is hot.
**Log entry.** *Fences flag; boxes hide.* Mistake: assuming a boxplot shows modes.
**Delete-the-math.** Without the fence there is no defensible reason to pull one hull's certification out of 412; Act II's request to the Bureau is a fishing expedition instead of a follow-up.

#### act-1-06 · Lost and Arrived — 25 min · AP 1.9 · calc: —
Crew: analyst, xo, medic · MET 23 · Wardroom.
**Situation.** Comparing distributions: the 31 lost hulls vs the transits that arrived, on mark, hull age, declared cargo value. Nothing on age. Cargo value of the lost hulls is *lower* than the Lane median — Ferrante, base rates first: "Pirates take the valuable ones. What do these people take?" Marks: the lost hulls' distribution is shifted late and tight; arrivals' last-advisory marks are spread. Ebele writes each comparison as two separate paragraphs; Ferrier makes him rewrite them as one.
**Concept.** Parallel boxplots, back-to-back stemplots, comparative histograms; a comparison addresses shape, centre, variability and unusual features *with comparative language*. Misconceptions: describing each group separately; "bigger box = more data."
**Instrument.** Comparative distribution display with group selector (lost / arrived) and variable selector (mark, age, value).
**Dataset.** DS-01 loss subtable vs the advisory records (as the arrived hulls' marks), plus `hull_age`, `declared_cargo_value` for both.
**Drills.** 5, one rubric (`compare-distributions`): compare lost vs arrived on value; choose the display for a stated comparison; comparative sentence with units.
**Mission beat.** kind interpretation — compare the mark-at-last-contact distributions of lost vs arrived hulls in context (rubric: comparative language, centre, spread, shape/outliers, context). Wrong: "That's two descriptions, Ensign, not a comparison."
**Clue.** Lost hulls cluster at Mark 9–10 and carry *cheaper* declared cargo than the Lane. Not yet proven: that either is more than coincidence.
**Log entry.** *A comparison is one sentence with "than" in it.* Mistake: two paragraphs.
**Delete-the-math.** Without the comparison the "late and cheap" pattern is never stated; Act VIII's GOF on cargo category has no descriptive precursor and Act IV's Mark 9 loiter has no rationale.

#### act-1-07 · How Hot Is Too Hot — 30 min · AP 1.10 · calc: area-under-a-curve
Crew: sensors, analyst, engineer · MET 25 · Sensor bay.
**Situation.** Back to *Harpagia Sulcus*. Under a normal model of honest plume ratios (mean 100, SD 2.8 from the fleet's own sixty), how rare is 109.2? Oyelaran computed z ≈ 2.6 against the class table's rated spread of 3.5; against the fleet's measured 2.8 it is 3.3. She says both numbers and, for the first time, a plus-or-minus. Sandoval converts the ratio to tonnes (a 9% hot plume on a 20,000-tonne declaration is 1,800 tonnes) and shows that a linear change of units leaves z alone. The Bureau's certification for *Harpagia* arrives at MET 26: declared 19,400 t; Examiner R. Dacre.
**Concept.** z-scores and percentiles; effects of aX + b on centre, spread, shape; empirical rule; normal-model areas; a density has no probability at a point. Misconceptions: "z only works for normal data"; empirical rule for every distribution; density height as probability.
**Instrument.** z-score / normal-area explorer: drag cutoffs, shade, read area; unit-conversion toggle (percent → tonnes).
**Dataset.** DS-19 (fleet ratio model; *Harpagia* at 109.2; the module's seeded hot contact draws ratio ≥ 108.5 so z > 3).
**Drills.** 6, one rubric (percentile/z interpretation in context): z and tail area; inverse (value from a proportion); mean and SD after unit conversion; empirical rule; percentile of a contact.
**Mission beat.** kind numeric — z-score of the seeded hot contact against the fleet model and the proportion of honest hulls that hot (P ≈ 0.0005). Debrief on the 1-03 decision: she was wrong to distrust the table, right to notice.
**Clue.** A one-in-two-thousand plume, on a hull certified by Examiner Dacre. Not yet proven: that hot means heavy (Act II) or that Dacre matters (Act VIII).
**Log entry.** *z is distance in SDs; area is probability.* Mistake: reading a density's height as a probability.
**Delete-the-math.** Without the tail area, "hot" is an adjective; the request to the Bureau for 412 certifications in Act II is not justified by one contact and Sandoval's "that's a cargo" has no number under it.

#### act-1-checkpoint · Checkpoint: Signatures — 20 min · AP 1.1–1.10
Ferrier's read-through of the preliminary (framing above). Items q1–q11 per map §5, including the DISP item (a histogram of drive-signature ratios to describe). On pass: Solberg sends; the Board's *noted* arrives four hours later; **decision** (flavour) — send the bimodality now or hold it (send: Ashby-Hale's Act IX line gains "I read your first note, you know"; hold: Ebele asks in Act II why you sat on it). On fail: in-story debrief naming modules; retry with new parameters.

---

### ACT II · Manifests (Unit 2 · 6 modules + checkpoint · 195 min)

**Opening.** MET 30. The Bureau of Hulls answers a routine request — 412 departure certifications: declared mass, fuel loaded, drive model, examiner's signature — and the relay net's transponder archive gives acceleration at Mark 2 for each. Sandoval explains inferred mass on a napkin: thrust over acceleration, plus or minus two percent. **Heat state:** hot, 4 mgee, wings out.
**Pressure.** The Board's *noted* sits in the log. Ebele wants to run every regression at once. The Eyes need four hours of every twelve for the sweep schedule and Oyelaran resents lending them to archive work.
**Investigative question.** Do the hulls weigh what they say they weigh?
**Closing turn.** MET 52: your report (nineteen hulls departed heavier than certified; recommend Inspectorate review of Bureau certifications; Sulcus not named) is answered in six hours: the Authority's crew survey and the 2183 escort trial "do not support a hypothesis of systematic manifest fraud"; the residuals "may reflect instrument variance." Attached: the survey summary and the trial report. The Board has answered a regression with a survey. To rebut it you must show how the survey was taken.
**Checkpoint framing (act-2-checkpoint · "Manifests" · 20 min).** Sandoval and Ferrier together, on the engineering deck: the Chief will not let "sixteen hundred tonnes" go up the chain on a napkin. "Show me the fit. Show me what it looks like without the ore hauler. Then I'll sign the mass." Items q1–q10 per map §5 (DISP: a scatterplot to describe). On pass: the report goes at MET 48. On fail: "Not with my name under it. Fix these."

#### act-2-01 · Cause by Owner — 30 min · AP 2.1, 2.2, 2.3 · calc: —
Crew: analyst, xo · MET 31 · Intel terminal.
**Situation.** Before the Bureau file is parsed, Ebele cross-tabulates the Register: classification × owner class for the 31. *Unknown* is the modal code for Perrine hulls; *accident* for everyone else; every *piracy* is an independent. He compares counts; Ferrier asks for conditional proportions because the groups are not the same size. Then he conditions the wrong way — P(Perrine | unknown) when the question was P(unknown | Perrine) — and you make him state both and say which the Board's summary quoted. It is descriptive, you tell him; the test is months away. He writes "association" and you let him.
**Concept.** Two-way tables; joint, marginal, conditional relative frequencies; segmented/mosaic bars; "appear associated" is a description, not an inference. Misconceptions: comparing counts across unequal groups; conditioning on the wrong variable.
**Instrument.** Two-way table explorer with segmented-bar and mosaic views; toggle row/column conditioning.
**Dataset.** DS-01 loss subtable: classification × owner_class (Perrine 19: unknown 19; Mercantile 7: accident 4, unknown 3; independent 5: piracy 4, accident 1).
**Drills.** 6, one rubric (association from conditional distributions, `contextGroup`): joint/marginal/conditional; segmented bar read; "which conditional answers this question"; association sentence in context.
**Mission beat.** kind numeric + interpretation — P(unknown | Perrine) and P(Perrine | unknown) from the seeded table, then one sentence on whether classification and owner appear associated, in context (no causal language). Wrong: Ferrier: "You conditioned on the answer."
**Clue.** Classification depends on owner class, descriptively; every *piracy* is an independent; every Perrine loss is *unknown*. Not yet proven: that owner *causes* anything (Act VIII).
**Log entry.** *Condition on the group you are asking about.* Mistake: P(A|B) for P(B|A).
**Delete-the-math.** Without the conditional table the beneficiary thread (Act VI) and the Uruk/Ceres thread (Act VIII) have no descriptive origin, and the Board's prosecutor's-fallacy staff paper (act-4-03) has nothing to be wrong about.

#### act-2-02 · Inferred Mass — 30 min · AP 2.4, 2.5 · calc: —
Crew: engineer, analyst, sensors · MET 32 · Engineering deck.
**Situation.** Scatterplot: inferred mass on declared mass, 412 points, r = 0.99. The Lane is honest, mostly. Ebele says the correlation "proves the Bureau's numbers cause the acceleration"; Sandoval says the *physics* causes the acceleration and the Bureau writes it down. Oyelaran wants the plume-power axis in terawatts instead of tonnes; Ebele shows r does not move. A few points sit above the cloud; nobody names them yet.
**Concept.** Scatterplot description (direction, form, strength, unusual features); r and its properties (unitless, symmetric, linear only, outlier-sensitive); correlation is not causation. Misconceptions: r = 0 means no relationship; r changes with units; strong r means linear.
**Instrument.** Scatterplot with draggable points and live r (regression line locked until 2-03).
**Dataset.** DS-02, `inferred_mass` vs `declared_mass`, all 412.
**Drills.** 6, one rubric (`correlationDescription`): describe the scatter in context; r after unit change; drag a point and watch r; which of four scatterplots has r ≈ 0.99; causation trap.
**Mission beat.** kind interpretation — describe the relationship between inferred and declared mass in context (direction, strength, form, unusual features), citing r. Wrong: "You said 'causes.'"
**Clue.** Strong linear agreement with a handful of points high. Not yet proven: which points, how far, whether it is instrument noise.
**Log entry.** *r measures linear association, nothing more.* Mistake: correlation as cause.
**Delete-the-math.** Without r the Board's "instrument variance" reply (MET 52) would be unanswerable — the strength of the honest relationship is what makes the exceptions exceptional.

#### act-2-03 · Line of Best Fit — 30 min · AP 2.6, 2.8 · calc: minimizing-squared-error
Crew: analyst, engineer, xo · MET 34 · Engineering deck.
**Situation.** You have Ebele state what the slope means in tonnes per tonne and why the intercept should be zero — an empty declaration should infer nothing. He drags a candidate line and watches the squares; the LSRL snaps to slope 1.00, intercept ≈ 0. Sandoval: "One point oh oh, give or take what?" — the first time anyone asks for the SE of a slope, and you tell her Act IX will answer it. Ebele predicts inferred mass for *Cyrene Ore* at 60,000 t and Ferrier asks whether the data go that far.
**Concept.** Least squares; b = r·sy/sx, a = ȳ − b·x̄, the line through (x̄, ȳ); slope and intercept interpretation with "predicted" and "on average"; extrapolation. Misconceptions: slope without "predicted"; physical reading of an intercept outside the data; x/y swapped.
**Instrument.** Least-squares "minimize the squares" visual: drag a line, squared residuals as areas, total; snap to LSRL.
**Dataset.** DS-02.
**Drills.** 6, one rubric (`slopeInterpretation`): compute the LSRL from summary stats; interpret slope in t/t; interpret the intercept and say whether it is meaningful; predict; extrapolation flag.
**Mission beat.** kind interpretation — interpret the slope of inferred on declared mass in context. Then kind numeric — predicted inferred mass for a seeded honest hull. Wrong: "Predicted, Ensign. On average. Say it."
**Clue.** The honest Lane infers 1.00 t per declared tonne. Not yet proven: anything about the points above the line.
**Log entry.** *A slope is a predicted change per unit of x.* Mistake: dropping "predicted."
**Delete-the-math.** Without the fitted line there is no "predicted" to subtract from; residuals (2-04) do not exist and the nineteen are just "high-ish."

#### act-2-04 · The Nineteen — 30 min · AP 2.7 · calc: —
Crew: analyst, xo, engineer · MET 36 · Bridge.
**Situation.** The residual plot. Nineteen points sit above the band at +6 to +9%; the rest scatter within ±2%. Ebele colours by `later_lost`: all nineteen are lost hulls. The other twelve lost hulls are in the band. Ferrier: "Tell me the nineteen aren't just big ships." Residual against declared mass shows no fan. Ebele wants to say the data are wrong; you tell him the *model* is fine and the *declarations* are wrong, and that the difference is the whole report.
**Concept.** Residual = actual − predicted; residual plots; patterns (curvature, fanning) mean the model is wrong, not the data; no pattern plus a cluster of large residuals means those individuals are wrong. Misconceptions: residual sign; "pattern means bad data."
**Instrument.** Scatterplot with live regression line and linked residual plot; hover a point to see its residual on both panels; colour by `later_lost`.
**Dataset.** DS-02 (the 19 at +6–9%).
**Drills.** 6, one rubric (`residualInterpretation`): compute a residual; interpret it (actual vs predicted, direction, tonnes); read a residual plot pattern; identify heteroscedasticity or its absence.
**Mission beat.** kind numeric + interpretation — residual for the seeded *Nicholson Regio* row (≈ +1,500 t) and its interpretation in context; then the count of hulls with residuals above +5% (19) and how many of them were later lost (19). Wrong: sign error → "You just said it was lighter."
**Clue.** Nineteen lost hulls departed 6–9% heavier than certified; the other twelve did not. Not yet proven: who falsified, why, where they went.
**Log entry.** *Residual = actual − predicted; its sign is a direction.* Mistake: predicted − actual.
**Delete-the-math.** This is the book's first hard fact; delete it and there is no "nineteen," no request to the Inspectorate, no reply from the Board, and no Act III.

#### act-2-05 · The Bulk Hauler — 25 min · AP 2.8 · calc: —
Crew: analyst, xo · MET 40 · Intel terminal.
**Situation.** MV *Cyrene Ore*, 60,000 t, sits alone at the top of the x-range. Ebele wants it gone because it is "distorting the fit." With and without: the slope moves in the third decimal, r² barely, s not at all. It is high-leverage and not influential. Then the Board's attachment from Act I: its summary quotes r² = 0.98 for "the Lane's mass agreement" and omits s — the number that says how far a hull can be off and still look ordinary. You have Ebele read a full computer-output table for the first time and write the equation from it.
**Concept.** r² and s in context; reading computer output; outliers, leverage, influence. Misconceptions: r² is r; s is the SD of y; deleting an inconvenient point.
**Instrument.** Influence explorer: drag one point across the x-range; slope, r², s respond; with/without toggle.
**Dataset.** DS-02 (with *Cyrene Ore*).
**Drills.** 6, one rubric (`rSquaredInterpretation`): interpret r² and s; equation from output; effect of removing the leverage point; which point is influential (drag).
**Mission beat.** kind interpretation — interpret s (≈ 400 t) in context and explain what the Board's r² without s conceals. Then a **decision** (flavour): keep or drop *Cyrene Ore* in the report. Keep is correct (not influential); drop → Ferrier: "Justify it or leave it."
**Clue.** The Board's own r² is honest; the missing s is the tell. Not yet proven: intent.
**Log entry.** *r² says how much; s says how far.* Mistake: r² mistaken for r.
**Delete-the-math.** Without s there is no yardstick for "+6–9% is not variance"; the Board's MET 52 line "instrument variance" would be a fair reading instead of a dodge.

#### act-2-06 · Root Law — 30 min · AP 2.9 · calc: logs-and-linearization
Crew: analyst, engineer, sensors · MET 44 · Engineering deck.
**Situation.** Fuel loaded vs declared mass first: Ebele tries a log transform to straighten a curve that is not there; you make him show the residual plot of the straight line already fits (fraction 0.215, through the origin), and file the fact that the nineteen's fuel points sit high too. (Act IX.) Then the real curve: time-to-Mark-9 vs Lane length at departure across six years of the Ledger — 80 to 110 days over 2.4 to 8 AU — bowed. A straight line's residuals blame the season. On log–log the slope is 0.50 and the brachistochrone falls out of the fit; now the residuals blame the hull. Sandoval: "Eight percent of twenty thousand tonnes is sixteen hundred tonnes. That's not a clerical error, Skipper. That's a cargo."
**Concept.** Recognizing non-linearity; log-y, log-x, log-log transformations; comparing models by residual plots and r²; back-transforming a prediction; interpreting a log-model slope as an exponent. Misconceptions: "r² high, done"; a log-model slope read in raw units.
**Instrument.** Transformation console: raw / log y / log x / log–log with linked residual plot and r².
**Dataset.** DS-09 (`scheduled_t9` + `mark9_delay` vs `lane_length_AU`, a 300-transit sample incl. the 19); DS-02 fuel vs declared (the non-curve).
**Drills.** 6, one rubric (interpret the log–log slope as a power): pick the transformation from residual plots; back-transform; recognise when no transform is needed; exponent interpretation.
**Mission beat.** kind numeric + choice — the log–log slope (≈ 0.50) and the back-transformed predicted transit time for a seeded 4.0 AU departure; choose the model whose residuals show no pattern. Then kind numeric — mean residual (days) of the 19 flagged hulls on the log–log fit (≈ +2.8) vs everyone else (≈ 0). Wrong: "Your straight line says every long-season ship is slow."
**Clue.** The nineteen were slow as well as heavy; the fuel points are high. Not yet proven: the slowness is significant (VII), the fuel is intent (IX).
**Log entry.** *Transform until the residuals have nothing left to say.* Mistake: interpreting a log-scale slope in raw units.
**Delete-the-math.** Without linearizing, the nineteen's lateness is confounded with departure geometry; Act V's delay variable and Act VII's paired shift have no honest baseline.

#### act-2-checkpoint · Checkpoint: Manifests — 20 min · AP 2.1–2.9
Sandoval's sign-off (framing above); q1–q10 per map §5. On pass: the report goes at MET 48; **decision** (flavour) — name Sulcus, or let the data name them (name → Ostrow's Act VII hostility is overt; Renn already knows in Act VI). On fail: the Chief's silence and a gauge; retry.

---

### ACT III · Testimony (Unit 3 · 5 modules + checkpoint · 165 min)

**Opening.** MET 52. The Board's attachments: the Authority's survey — 212 masters who answered a notice at the Ceres dock office; Q4, *Do you believe pirates operating from the Free Holds are responsible for recent Lane incidents?*, 94% yes — and the escort trial: two announced convoys with a cutter, zero incidents, "deterrence effective." **Heat state:** hot; turnover at MET 80.
**Pressure.** The Lane is 25 light-seconds wide where you are; masters are within tight-beam range for a day at a time; every survey contact costs Solberg an hour and the master's goodwill; Sulcus masters may not answer. At MET 59 the Authority feed reports MV *Harpagia Sulcus* — your hot contact — transponder-degraded at Mark 9.3; Uruk classifies it *unknown, presumed lost* in four hours. If the Eyes stayed on the sweep in Act II, Oyelaran has its plume vector change in the log at 0.7 AU: "Eleven degrees, maybe. At this range I would not put it in a report."
**Investigative question.** Do the data the Board is quoting tell the truth about the Lane's crews — and what would?
**Closing turn.** MET 80: turnover; the survey report is filed; the Board acknowledges in two words. "Turning late" is testimony. To see it you must be at Mark 9, cold, when a Sulcus hull passes — with 64 hours of Watch in the cellar, a picket that may be looking, and no idea when the next one comes.
**Checkpoint framing (act-3-checkpoint · "Testimony" · 20 min).** Ebele presents the survey report to you and Ferrier before it is filed; the checkpoint is his brief and your corrections. "Every claim about who was asked, how, and what that licenses." Items q1–q10 (DISP: randomization distribution). On pass: filed at MET 80. On fail: "It's a good survey badly described. Again."

#### act-3-01 · Who Was Asked — 25 min · AP 3.1, 3.2 · calc: —
Crew: analyst, xo, comms · MET 54 · Wardroom.
**Situation.** Ebele's autopsy of the Ceres survey: a Ceres frame (masters who *arrived*), voluntary response, a leading question. "It's not a sample of the Lane. It's a sample of who was bored at Ceres." He proposes to fix it by asking more masters at Ceres; Ferrier lets the silence do the work. You have him draw the population (Lane masters in transit this Close Season), the frame (the schedule, 260), and who is unreachable: docked, lost, or unwilling. Solberg prices a contact: fifty-five minutes, give or take fifteen.
**Concept.** Population, sample, sampling frame; survey vs observational study vs experiment and what each licenses; why the Register's crew statements cannot generalize. Misconceptions: "a big sample fixes a bad frame"; groups ≠ experiment.
**Instrument.** Frame explorer: a fleet population map; highlight population, frame, sample, unreachable units (docked / in transit / lost).
**Dataset.** DS-03a (the Ceres survey's respondents by owner class) and the DS-03b frame (260).
**Drills.** 5, one rubric (`scope-of-inference`, framing variant): identify population/frame/sample; study type; which population a stated conclusion applies to; frame defects.
**Mission beat.** kind choice + interpretation — identify the Ceres survey's population, frame and sample, and write the question the Lane masters' survey must answer and of whom. Wrong: "More masters at Ceres is more of the same frame."
**Clue.** The 94% is a number about Ceres dock volunteers. Not yet proven: what Lane masters actually believe or have seen.
**Log entry.** *The frame is the list you could have drawn from.* Mistake: enlarging a biased sample.
**Delete-the-math.** Without naming the frame, the Board's 94% stands as "the crews' testimony" and the MET 52 rebuttal holds.

#### act-3-02 · Drawing the Sample — 30 min · AP 3.3 · calc: —
Crew: analyst, comms, xo · MET 57 · Bridge.
**Situation.** Designing the survey. The schedule is a frame of 260 masters in transit: Perrine 88, Mercantile 110, independent 62. Options on the table: SRS of 40 (cheap, may miss Sulcus); stratified by owner class, 15 each (balanced, more link time); cluster by convoy (cheapest, correlated answers). Ebele runs each a thousand times against a fleet truth and stacks the estimates. You choose; Solberg builds the contact schedule against light-lag.
**Concept.** SRS, stratified, cluster, systematic; random digits; what varies within and between groups; strengths and costs. Misconceptions: "stratified = split into groups"; "random = haphazard."
**Instrument.** Sampling-method simulator on the 260-master frame: SRS / stratified by owner / cluster by convoy / systematic by hull number; the sample estimate vs fleet truth over repeated draws; link-time cost meter.
**Dataset.** DS-03b frame and cost model.
**Drills.** 6, one rubric (justify a design for a stated goal): implement an SRS with a random-digit table; identify the method from a description; stratified vs cluster by what varies where; cost/precision trade.
**Mission beat.** kind decision (learner's call: SRS / stratified / cluster) graded on the justification (interpretation rubric: names the method, why it suits the goal, the cost). All reach the same conclusion in 3-03; the debrief compares precision and link-time; cluster yields a wider interval Ebele has to explain in Act VI. Then a second **decision**: include Sulcus masters (nonresponse becomes evidence) or exclude (cleaner numbers; a reviewer's note in Act VII).
**Clue.** None yet; the instrument is being built.
**Log entry.** *Stratify to guarantee; cluster to save.* Mistake: sampling only some strata.
**Delete-the-math.** Without a probability design the masters' testimony (6 of 40 "turning late") is anecdote by construction and Ostrow's Act VII "self-selected witnesses" line is fair.

#### act-3-03 · Bored at Ceres — 30 min · AP 3.4 · calc: —
Crew: comms, marsh, analyst, xo · MET 61–70 · Comms station; tight-beam to *Thessaly Dawn* (lag 25 s each way).
**Situation.** The survey runs, master by master, Solberg counting the seconds. Captain Marsh of *Thessaly Dawn* answers in nine profane minutes: her brother's ship was *Thessaly Ember*; the Authority told her a rock, then pirates, never which. Six independent masters, unprompted, mention Sulcus hulls "turning late." Sulcus masters: nine contacted, two answered, both "no comment." Ebele wants to drop them; you make him record the nonresponse as data. Properly sampled, 31% of independent masters believe piracy. Ebele runs the bias demonstrator: volunteers-at-Ceres vs SRS, a thousand times each; one scatters around the truth, the other sits beside it.
**Concept.** Undercoverage, nonresponse, voluntary response, convenience, response bias (wording, interviewer); predicting direction; bias (systematic) vs sampling variability (random). Misconceptions: bias fixed by n; variability called bias; random selection cures response bias.
**Instrument.** Bias demonstrator: choose a mechanism (arrivals only, volunteers, leading wording); the distribution of the estimate shifts away from the truth while SRS scatters around it.
**Dataset.** DS-03a vs DS-03b results.
**Drills.** 6, one rubric (`samplingBiasIdentification`): name the bias and its direction in context; bias vs variability from a simulated pair; nonresponse as data.
**Mission beat.** kind interpretation — name the biases in the Ceres survey (frame, voluntary response, wording), the direction of each, and the consequence for the 94% (rubric: type, mechanism, direction, context). Then kind numeric — the seeded Lane survey's proportion believing piracy and the Sulcus nonresponse rate.
**Clue.** Testimony: six masters have seen Sulcus hulls turn late; Sulcus masters will not talk. Not yet proven: where the hulls go.
**Log entry.** *Bias is a direction; variability is a spread.* Mistake: a bigger biased sample.
**Delete-the-math.** Without direction-of-bias the Board's 94% and your 31% are just two numbers; the argument that the Register's cause proportions are biased, not noisy, cannot be made.

#### act-3-04 · The Admiralty's Trial — 30 min · AP 3.5, 3.6 · calc: —
Crew: xo, analyst · MET 72 · Wardroom.
**Situation.** The escort trial autopsied: announced; escorts assigned to convoys by owner request; no unescorted control transits in the same window; run in a month with no Sulcus departures. Ferrier rebuilds it on the design builder — units, treatment, response — presses randomize, and the confounding indicator that was red goes green. Then she designs the trial the Board should have run: unannounced escort assigned at random to transits, blocked by owner class — and notes it would take a Close Season and two cutters the Service does not have.
**Concept.** Experimental units, treatments, factors, levels, response; comparison, random assignment, control, replication, blinding; confounding; completely randomized vs randomized block vs matched pairs. Misconceptions: random sampling = random assignment; "control = untreated"; blocking on the response.
**Instrument.** Design builder / random-assignment simulator: drag hulls into treatment groups, block by owner or route, randomize; confounding indicator.
**Dataset.** DS-04a.
**Drills.** 6, one rubric (explain a confound in context): identify units/factor/levels/response; choose a design for a stated goal; explain how owner is confounded with escort; blocking rationale.
**Mission beat.** kind interpretation — explain how owner is confounded with escort in the Board's trial and why "zero incidents" cannot be attributed to escorts (rubric: names the lurking variable, the mechanism, the consequence). Then kind choice — the design Ferrier proposes and why blocking by owner.
**Clue.** The trial could not have found anything. Not yet proven: whether escorts matter at all.
**Log entry.** *Random assignment is what lets you say "because."* Mistake: confusing it with random sampling.
**Delete-the-math.** Without the design autopsy the Board's "deterrence effective" is a finding; the escort lottery (3-05) has no motive and the Board's MET 52 reply stands on its second leg.

#### act-3-05 · The Escort Lottery — 30 min · AP 3.7 · calc: —
Crew: xo, comms, analyst · MET 74–79 · Bridge; tight-beam to *Asgard* (lag ~4 min).
**Situation.** Added beat. As the Board's assessing officer you direct *Asgard*'s escort assignments for one week by lot — twelve transits at Mark 6–7, six escorted, Solberg's random digits logged. The response is the only one twelve transits can show: off-nominal advisories per transit. Escorted 1.5, unescorted 2.2. Ebele wants to call it "escorts reduce incidents by a third." You make him shuffle the labels 924 ways and see where −0.7 falls. It falls in the middle. Then the sentence that matters: this trial could not have seen a loss if there had been one; a one-in-a-hundred event needs hundreds of transits. Ostrow will call the lottery overreach in Act VII; Ferrier logs that you had the authority.
**Concept.** Random assignment → causal claims; random sampling → generalization; randomization distribution; statistical significance vs importance; scope of inference. Misconceptions: "significant = important"; "a difference exists, so it's real"; causal claims from observational data.
**Instrument.** Randomization test machine (randomization mode): re-shuffle treatment labels, build the distribution of group differences, locate the observed difference.
**Dataset.** DS-04b (or, if the learner declined the lottery in the **decision** at the top of the module, *Asgard*'s own six-transit pilot with the same structure).
**Drills.** 6, one rubric (`scope-of-inference`): significance from a randomization distribution; scope statements for four described studies; what the lottery can and cannot conclude.
**Mission beat.** kind numeric + interpretation — the randomization p-value for the seeded lottery (≈ 0.3) and the scope of inference: no evidence escorts change advisory rates; causal language licensed by assignment, generalization limited to that week's Mark 6–7 transits; *nothing about losses*. Wrong: "You just proved something with twelve ships."
**Clue.** Escorts are not the explanation, and no trial the Service can afford will say otherwise. Not yet proven: anything about where the hulls go.
**Log entry.** *Assignment licenses "because"; sampling licenses "in general."* Mistake: reading "no evidence" as "no effect."
**Delete-the-math.** Without the randomization distribution the −0.7 becomes a claim in the report; Ostrow's "overreach" would be earned, and the Act VI power discussion (6-06) loses its worked example of an underpowered study.

#### act-3-checkpoint · Checkpoint: Testimony — 20 min · AP 3.1–3.7
Ebele's brief, your corrections (framing above); q1–q10 per map §5. On pass: filed at MET 80; turnover; the Board's two-word acknowledgement. On fail: "Again."

---

### ACT IV · Running Cold (Unit 4 · 10 modules + checkpoint · 295 min)

**Opening.** MET 83/11:00. *Nightjar* kills her torch 0.42 AU from Ceres on a heliocentric drift that keeps her near the Mark 9 geometry for twelve days. Wings folded, parasol out, skin to 120 K. Sink at 6%. Forty plumes in the Eyes at once: the Ceres approach is the brightest sky on the Lane. **Heat state:** cold; Watch 64 h ± 4 (measured), Quiet 108 h; purge 2.6 h as a beacon.
**Pressure.** The cellar. Perrine hulls pass Mark 9 at 0.41 per day; you cannot stay cold long enough to be sure of one. Somewhere Kettle-side a picket may be sweeping.
**Investigative question.** Can you buy the odds of witnessing a diversion with heat you can afford — and what did the Board's probabilities actually say?
**Closing turn.** MET 104/03:50: MV *Marius Regio*, on profile at Mark 9.4, transponder degrading; "The plume did not stop. It turned." You cold-track it thirty hours and do not follow. The Board, MET 107: *A single off-profile manoeuvre is consistent with a navigational casualty.* Ferrier: "One ship is an anecdote." What would nineteen look like if nothing were wrong? You have to build the noise before you can hear the signal.
**Checkpoint framing (act-4-checkpoint · "Running Cold" · 25 min).** Before the second window, Sandoval and Ferrier want the heat plan on the record: every probability that goes into "how long, where, and what it costs." The checkpoint is the plan review; a wrong number is heat you do not have. Items q1–q12 per map §5 (DISP: geometric pmf). On pass: "I'll log the order. I want it noted I asked for the alternative." On fail: "Not on that arithmetic. Rework it."

#### act-4-01 · Spring of '82 — 25 min · AP 4.1, 4.2 · calc: —
Crew: analyst, xo · MET 83/14:00 · Intel terminal, cold.
**Situation.** While the ship settles into cold, Ebele runs a question Ferrier asked in Act I: what do thirty-one random losses look like? He simulates loss *dates* as uniform over six years, finds the tightest 30-day cluster in each run, and stacks that statistic ten thousand times. The Register's tightest cluster is five (24 Feb → 21 Mar 2182: *Kestrel Bough*, *Nicholson Regio*, *Thessaly Ember*, *Xibalba Sulcus*, *Hygiea Promise*). Under randomness, five or more in thirty days happens about once in a hundred runs. Ebele reports "one percent" as if it were exact; you make him give the simulation's count and its run size.
**Concept.** Randomness in the long run; streaks in short runs; designing a simulation (model, one trial, statistic); interpreting a simulated probability. Misconceptions: gambler's fallacy; "random = evenly spread"; a simulated estimate reported as exact.
**Instrument.** Clustering simulator: simulate loss times uniform over the period; compute the largest 30-day cluster; build its distribution; mark the Register's actual cluster.
**Dataset.** DS-01 loss dates.
**Drills.** 5, one rubric (interpret a simulated probability in context): design a trial; read a simulated distribution; streak questions; state the model.
**Mission beat.** kind numeric — the simulated P(max 30-day cluster ≥ 5) (≈ 0.01, tolerance from the run) and kind choice — the correct one-sentence interpretation. Wrong: "Exact is a word for things you computed, Ensign."
**Clue.** The losses cluster in time in a way chance rarely produces; spring 2182 is special. Not yet proven: why (Act VIII: the cover losses).
**Log entry.** *A simulation estimates; say how many runs.* Mistake: reading a short run as a pattern, or a pattern as a short run.
**Delete-the-math.** Without the clustering simulation, "spring 2182" is a date on a list; Act VIII's identification of the four cover losses has no temporal signature to match.

#### act-4-02 · The Sweep Log — 25 min · AP 4.3, 4.4 · calc: —
Crew: sensors, analyst · MET 84 · Sensor bay, cold.
**Situation.** Oyelaran's sweep log as a sample space: each sweep ends in exactly one of thermal detection, optical, RF, or nothing. Ebele adds P(thermal) + P(optical) and calls it "P(seen)." Correct, because the modes are mutually exclusive per entry — then he adds P(detection this sweep) + P(detection next sweep) for "P(seen in two sweeps)" and gets a number over one. Oyelaran: "The Eyes don't see anything twice, Ensign, but they can see nothing twice." The complement is the tool.
**Concept.** Sample space, events, probability as long-run relative frequency; complement; mutually exclusive events and the addition rule; probabilities from a two-way table. Misconceptions: mutually exclusive ≠ independent; P(A or B) = P(A) + P(B) always.
**Instrument.** Event-space panel: events as areas on the sweep log's outcome space; drag to overlap or separate; P(A ∪ B) reads live.
**Dataset.** DS-06 (mode split; per-sweep detection rate).
**Drills.** 6, numeric-only (map §7): complement of "no detection in a window"; addition rule for exclusive modes; two-way table probabilities; sample-space listing.
**Mission beat.** kind numeric — from the seeded sweep table, P(a sweep detects something) via the complement and P(thermal or optical). Wrong: a probability over 1 → Oyelaran, flat: "Say that number again."
**Clue.** None investigative; the machinery for "how likely is it that a picket sees us" begins.
**Log entry.** *Add only what cannot happen together.* Mistake: adding overlapping events.
**Delete-the-math.** Without complement-and-exclusivity the Act IV heat plan has no P(undetected) and the Act VIII decision has no denominator.

#### act-4-03 · Given That — 30 min · AP 4.5 · calc: —
Crew: analyst, xo, admiralty (staff paper) · MET 85 · Bridge, cold.
**Situation.** Two conditionals. From the sweep log: P(detected | cold) vs P(detected | warm) — the reason the ship exists, in a tree. From the Register: the Board's Act I staff paper quoted "eighty-four percent of Perrine-flag incidents were coded *unknown* — a classification pattern consistent with transponder faults" — P(unknown | Perrine) — when the question a hostile reader asks is P(Perrine | unknown): of the twenty-two *unknown* losses, nineteen. Ebele builds the tree both ways and reverses it. Ferrier: "The Board conditioned on the answer it wanted."
**Concept.** Conditional probability from tables and trees; general multiplication rule; reversing a conditioning and why the two numbers differ. Misconceptions: P(A|B) = P(B|A); wrong total.
**Instrument.** Probability tree builder: branches, probabilities, joint and reversed conditionals; branches must sum to 1.
**Dataset.** DS-06 (cold vs warm detection by range band); DS-01 (classification × owner).
**Drills.** 6, one rubric (interpret a conditional in context, `contextGroup`): conditional from a table; tree joint probability; reverse a conditional; identify which conditional a quoted sentence states.
**Mission beat.** kind numeric + choice — P(Perrine | unknown) from the seeded Register and the statement that correctly describes what the Board's sentence claims vs what it implies. Wrong: "You have just committed the Board's error in the Board's favour."
**Clue.** Nineteen of twenty-two *unknown* losses are Perrine hulls. Not yet proven: that this is more than a reporting habit.
**Log entry.** *P(A|B) is not P(B|A); the denominator is the "given."* Mistake: the prosecutor's fallacy.
**Delete-the-math.** Without the reversed conditional, the Board's staff paper is a fair description and the beneficiary line of Act VI has no rhetorical opening; and the Epilogue's Bayesian question (10-02) has no seed.

#### act-4-04 · Independence — 25 min · AP 4.6 · calc: —
Crew: sensors, analyst · MET 86 · Sensor bay, cold.
**Situation.** Ebele multiplies per-sweep detection probabilities across a window and Oyelaran stops him: a detection triggers a re-sweep of the same sector, so the next sweep is not the same coin. The log shows it — P(detect | previous detected) = 0.55 vs 0.06. Then the Register: P(lost | Perrine) = 0.021 vs P(lost) = 0.012. Not independent, descriptively. Ebele writes "losses depend on owner." You make him add "in this register," because the inference is Act VIII's.
**Concept.** Independence checks (P(A|B) = P(A); P(A ∩ B) = P(A)P(B)); multiplication rule for independent events; general addition rule; why independence fails in context. Misconceptions: independent = mutually exclusive; multiplying dependent probabilities; sample dependence read as population dependence.
**Instrument.** Independence checker: a two-way table with conditional vs marginal bars; edit cells until the variables are independent.
**Dataset.** DS-06 (consecutive-sweep table); DS-09 (loss × owner class).
**Drills.** 6, one rubric (independence in context): check independence from a table; general addition rule; multiplication for independent sweeps vs dependent; "what would independence mean here."
**Mission beat.** kind numeric + interpretation — P(lost | Perrine) and P(lost) from the seeded Ledger and one sentence on whether loss and owner appear independent, scoped to the register. Wrong: Ferrier: "You said 'are.' Say 'appear, in this file.'"
**Clue.** Loss is not independent of owner, descriptively. Not yet proven: inferentially (VIII).
**Log entry.** *Independent means the "given" changes nothing.* Mistake: confusing it with exclusive.
**Delete-the-math.** Without the dependence of consecutive sweeps, the binomial model in 4-08 is applied to the wrong trials and the picket odds are wrong; without loss × owner, Act VIII's independence test has no hypothesis to state.

#### act-4-05 · Distribution of a Cold Run — 25 min · AP 4.7 · calc: density-vs-mass
Crew: engineer, analyst · MET 87 · Engineering deck, cold; sink 31%.
**Situation.** The Chief's load budget as random variables. First the discrete one: hours of cold running required to cross a picket's sweep pattern, from the sweep log's coverage — a table of values and probabilities that must sum to one. Ebele's first table sums to 1.04. Then the continuous one: sink temperature at hour 60 as a density. He asks for P(temperature = exactly 240 °C) and Sandoval says "zero, and I'll show you why it's still the most likely number."
**Concept.** Discrete random variables; pmf as table/histogram; P(X = k), P(X ≤ k), P(X > k); continuous variables and probability as area under a density. Misconceptions: probabilities not summing to 1; ≥ vs > off-by-one; P(X = x) for continuous X.
**Instrument.** Distribution editor: editable pmf for "hours cold required" with cumulative view; continuous-density mode for sink temperature.
**Dataset.** DS-05, DS-06.
**Drills.** 5, numeric-only (map §7): P(X ≤ k) from a table; fix a table that does not sum to 1; discrete vs continuous; area under a density.
**Mission beat.** kind numeric — P(hours required > 64) from the seeded pmf (the probability the sink saturates before the sweep is crossed). Wrong: "Past sixty I want it in writing, and that number's how often I'd have to write it."
**Clue.** None investigative; the heat plan is being priced.
**Log entry.** *Mass at points; area over intervals.* Mistake: P(X = x) ≠ 0 for a continuous X.
**Delete-the-math.** Without P(X > capacity) the loiter decision (4-06) has no risk term and "we can stay cold long enough" is a hope.

#### act-4-06 · The Heat Ledger — 30 min · AP 4.8 · calc: expected-value-as-weighted-sum
Crew: analyst, xo, engineer · MET 88 · Bridge, cold.
**Situation.** Three loiter points. For each, Ebele has a distribution of sink-hours per 64-hour Watch window and the probability a Perrine hull passes within the Eyes' ID range: near (0.05 AU off the lane centre) E = 62 h, SD 9, P(saturate) ≈ 0.25, P(Perrine in range) 0.75, P(picket sweep grazes you) 0.22; middle E = 58, SD 4, P(saturate) ≈ 0.006, 0.55, 0.08; far E = 50, SD 3, ≈ 0, 0.35, 0.03. Expected diversions witnessed per sink-hour favours the near point. Its tail favours nothing. You choose. Ferrier logs the alternative.
**Concept.** Expected value as a weighted sum and long-run average; SD of a random variable; decisions under uncertainty — what "expected" does and does not promise. Misconceptions: expected value as the most likely outcome; SD of the values ignoring probabilities.
**Instrument.** Heat-budget expected-value planner: the distribution editor with live E[X], SD, and a patrol-option comparator (three routes, cost distributions, expected cost, P(exceed capacity)).
**Dataset.** DS-05, DS-06, DS-07.
**Drills.** 6, one rubric (`expectedValueInterpretation`): E[X] and SD from a pmf; compare two options; interpret E in context (long-run average, hours); "most likely" trap.
**Mission beat.** kind numeric + interpretation — expected sink-hours and P(saturate) for the seeded three options, interpreted; then kind **decision** — near / middle / far, graded on the arithmetic, not the choice. Near: on a seeded draw the sink saturates → Act V opens at 97% with an early purge (a near-miss, not a branch). Far: one fewer contact; *Marius Regio* arrives on the retry window. Middle: the book's default.
**Clue.** None yet; the ship is positioned.
**Log entry.** *Expected value is the average over many windows, not this one.* Mistake: choosing on E alone.
**Delete-the-math.** Without the expected-value comparison there is no reason *Nightjar* is at the middle point at MET 104, and the near-point near-miss in Act V is unmotivated.

#### act-4-07 · The Cellar's Margin — 30 min · AP 4.9 · calc: —
Crew: engineer, analyst · MET 89 · Engineering deck, cold.
**Situation.** Six subsystem loads, each with a mean and a spread: life support 60 ± 6, computing 110 ± 15, comms 12 ± 3, skin loops 70 ± 8, pumps 40 ± 6, hotel 28 ± 4. Ebele adds the SDs: 320 ± 42, "which is why the book says sixty-four, not sixty-eight." The yard's spec sheet says 320 ± 8, as if six errors averaged out. Sandoval: "Variances add, Ensign. Not sigmas, not sigmas over root six. Variances." √386 = 19.6 kW. 64 hours is 338 kW; P(load exceeds it) ≈ 0.17. Sixty hours is 361 kW; ≈ 0.02. "That's why past sixty I want it in writing."
**Concept.** Mean and SD of aX + b; sums and differences of independent random variables (variances add; SDs do not; the multiplier squares); independence required. Misconceptions: SDs add; variance of a difference subtracts; forgetting to square the multiplier.
**Instrument.** Random-variable combiner: two independent load distributions; drag means/SDs; the sum's distribution forms; its SD against the naive sum of SDs.
**Dataset.** DS-05 subsystem table.
**Drills.** 6, one rubric (interpret the SD of a sum in context): SD of a sum; SD of a difference; linear transformation (kW → hours); "which of three margins is right and why."
**Mission beat.** kind numeric — SD of the total Watch load (≈ 19.6 kW) and P(saturation before 64 h) from the seeded table; then kind choice — which margin (42 / 19.6 / 8) the yard should have quoted. Wrong: the Chief goes silent and checks a gauge.
**Clue.** The yard's margin was too generous by design or by carelessness; you do not know which yet (Act VII: a decision).
**Log entry.** *Variances add; standard deviations do not.* Mistake: adding sigmas.
**Delete-the-math.** Without the variance rule the Chief's "sixty-four, give or take four" is folklore; the Act VII discovery that the refit *shortened* the sink by nine hours has no baseline uncertainty to be judged against.

#### act-4-08 · Pings — 30 min · AP 4.10 · calc: —
Crew: sensors, analyst · MET 91 · Sensor bay, first window (62 h cold).
**Situation.** First window. The picket-side model: in a 64-hour Watch at the middle point, a Kettle-side picket's sweep pattern covers your sector about twelve times, each with p ≈ 0.02 of catching a cold hull. Number of detections in the window: binomial, if the sweeps are independent — Oyelaran makes Ebele say why the *picket's* scheduled sweeps are, when *Nightjar*'s re-sweeps were not. P(0 detections) = 0.98¹² ≈ 0.79. Then the arrivals: 64 hourly trials, p = 0.0171 of a Perrine hull, P(at least one) ≈ 0.68. Two Perrine hulls pass on profile. Purge, seen by nobody you can detect.
**Concept.** Binomial setting (BINS); P(X = k), cumulative; interpretation in context; the binomial as an approximation to arrivals. Misconceptions: sampling without replacement without the 10% check; ≤ vs <.
**Instrument.** Binomial explorer: n and p sliders, pmf bars, click-to-shade cumulative regions.
**Dataset.** DS-06 (picket per-sweep p), DS-07 (arrivals).
**Drills.** 6, numeric-only (map §7): P(X = k); P(X ≤ k); check the binomial conditions; P(0) for a planned crossing; 10% condition.
**Mission beat.** kind numeric — P(no picket detection in the seeded window) and P(at least one Perrine passage). Wrong: reseed; Oyelaran: "The Eyes would like that number to be right."
**Clue.** Two Perrine hulls on profile; nothing turned. Not yet proven: whether any will.
**Log entry.** *Binomial: fixed n, same p, independent, two outcomes.* Mistake: P(X ≤ k) for P(X < k).
**Delete-the-math.** Without the binomial, the picket odds in Act VIII (DS-17) are guesses and the first window's "purge, seen by nobody" has no probability attached to "nobody."

#### act-4-09 · Thirty-One in Twenty-Six Hundred — 25 min · AP 4.11 · calc: —
Crew: analyst, xo · MET 95 · Bridge, between windows; wings out, purging.
**Situation.** During the purge, with the ship a beacon, Ebele runs the Board's own numbers: 2,612 transits, 31 losses. Under the Board's baseline p = 0.011, mean 28.7, SD 5.3: 31 is 0.4 SD out — unremarkable. Under your 2176 baseline p = 0.005, mean 13.1, SD 3.6: 31 is 5 SD out. Ebele wants to say "surprising" from P(X = 31) alone; Ferrier makes him shade the tail. "The Board is not lying about the arithmetic. It is choosing the p."
**Concept.** Mean and SD of a binomial count; shape vs n and p; judging surprise from a tail, not a point. Misconceptions: np as the SD; surprise from P(X = k).
**Instrument.** Binomial explorer with mean ± 2 SD overlay and an observed-count marker.
**Dataset.** DS-08, DS-09 (n = 2,612; x = 31).
**Drills.** 6, one rubric (interpret "surprising under p" in context): mean and SD; z-like distance; tail probability; shape description; the two-baseline comparison.
**Mission beat.** kind numeric + interpretation — mean and SD of losses under each baseline, the tail probability P(X ≥ 31) under 0.005, and one sentence on which baseline makes 31 surprising and what that means for the Board's claim. Wrong: "You compared a point to a point."
**Clue.** The Lane's loss count is only unremarkable under a baseline borrowed from the roughest corridor in the system. Not yet proven: which baseline is legitimate (Act V).
**Log entry.** *μ = np; σ = √(np(1 − p)); surprise is a tail.* Mistake: np for the SD.
**Delete-the-math.** Without the binomial moments the baseline argument (Act V beat 5, Act VI margin) has no pre-inference form; the Board's "consistent with comparable corridors" cannot be shown to be a choice of p.

#### act-4-10 · Until First Contact — 25 min · AP 4.12 · calc: geometric-series
Crew: analyst, engineer, sensors, comms · MET 98–106 · Second window; MET 104/03:50 *Marius Regio*.
**Situation.** How long until the first diverting hull? Perrine hulls pass at 0.41/day; if one in fifty diverts, the expected wait is fifty hulls — four months; if one in ten, ten hulls — 24 days. Nobody knows the rate; Ebele's drill is the sensitivity. And the mirror question: sweeps until a picket first catches you, p = 0.02, mean 50 sweeps, P(X > 12) ≈ 0.79. You set the second window's length to a tail probability and Sandoval writes it in the log. Day 21 of the loiter, MET 104/03:50: MV *Marius Regio*, Mk 3, on profile at Mark 9.4. Transponder begins to degrade. Oyelaran, flat: "The plume did not stop. It turned." Eleven degrees. Still braking. Solberg times the fade: four hours until the Authority calls it lost. Thirty hours of cold-tracking at the edge of Watch, the Chief calling the cellar in hours-remaining. Ferrier asks whether you intend to follow. Following means lighting the torch. You do not.
**Concept.** Geometric setting; P(X = k); mean 1/p and SD; comparing geometric and binomial questions. Misconceptions: 1/p as the most likely value; pmf indexed from 0.
**Instrument.** Geometric explorer: p slider, pmf, cumulative "by trial k" shading, expected-trials marker.
**Dataset.** DS-07 (diversion rate scenarios), DS-06 (picket p).
**Drills.** 6, one rubric (interpret a geometric mean in context): P(first success on trial k); P(X > k); mean and SD; geometric vs binomial choice.
**Mission beat.** kind numeric + interpretation — expected number of Perrine passages (and days) to the first diversion at the seeded rate, and P(no picket detection through 12 sweeps); interpret the mean as a long-run average, not a forecast. Then a **decision** — follow *Marius Regio* or log the vector (follow: Board rebuke, 90 km/s gone, Ceres call tighter in Act VI; log: institutional; Ferrier's "one ship"). Watch vs Quiet was set in 4-05's gated scene; Quiet misses the rotation and the beat fails with a debrief from Oyelaran and a retry on Watch.
**Clue.** **You witnessed one.** Off-profile, eleven degrees, still decelerating, heading for nothing on the chart; vector logged. Not yet proven: that it is not one crooked crew; that it went anywhere in particular.
**Log entry.** *Geometric: trials until the first success; mean 1/p, and most waits are shorter than the mean.* Mistake: expecting the mean.
**Delete-the-math.** Without the geometric window-setting the ship is either cold too long (saturation) or warm when *Marius Regio* turns; the vector that points at Kettle in Act VII would not exist.

#### act-4-checkpoint · Checkpoint: Running Cold — 25 min · AP 4.1–4.12
The heat-plan review (framing above); q1–q12 per map §5. On pass: the second window is authorized and the *Marius Regio* scene stands; the MET 106 report goes with the binomial and geometric work attached — the odds that this was the only one, given nineteen. On fail: reworked before the wings fold.

---

### ACT V · Noise Floor (Unit 5 · 5 modules + checkpoint · 160 min)

**Opening.** MET 110. If the learner chose the near loiter point and the seeded draw saturated the sink, *Nightjar* opens at 97% with the wings out early and Oyelaran watching for anyone watching; otherwise at 41% and the Chief says so. The Board's rebuttal has arrived: a table — *the Lane, 1.19%; the Mars–Belt corridor, 1.1%* — and the cutters: *Asgard* 3 in 410, *Tindr* 1 in 380; "patrol data show no consistent anomaly." **Heat state:** post-purge, coasting; torch lit for Ceres at MET 124.
**Pressure.** 263 km/s left; consumables for 90 days; Ceres 0.4 AU away with fuel, the claims office, and a Martian adjuster who has asked to speak to the Compact's assessing officer.
**Investigative question.** What does honest variation look like — and is what you have seen inside it?
**Closing turn.** MET 124: the rate argument depends entirely on which null the Board is allowed to choose; the composition argument does not. The nineteen are not noise. To say so in a form the Service must answer you need a hypothesis, a test, a p-value and a sentence you would sign in front of a board of inquiry. Ceres: transponder on; everyone on the Lane, including Kettle, will know where *Nightjar* is. You go.
**Checkpoint framing (act-5-checkpoint · "Noise Floor" · 20 min).** Ferrier, before the torch lights: "Before you take this to Ceres, tell me what noise looks like. All of it. If you can't, you're about to accuse people with an anecdote." Items q1–q9 (DISP: a simulated sampling distribution). On pass: the Chief starts the torch. On fail: "Then we're not ready to be seen."

#### act-5-01 · Why the Reports Disagree — 30 min · AP 5.1, 5.4 · calc: —
Crew: analyst, xo · MET 110 · Intel terminal.
**Situation.** Ebele builds a sampling machine on the Ledger: draw 400-transit windows at random, count losses, stack. Three and one are both ordinary; the two cutters are not lying. Then the Board's statistic — "the lower of the two cutters' observed rates" — stacked the same way: it sits below the truth every time. "So the cutters aren't lying. Good. Now show me what the Board is doing with them." Ebele says the sampling distribution "is the distribution of the sample"; you make him say what one dot is.
**Concept.** Parameter vs statistic; the sampling distribution as the distribution of a statistic over all samples of size n; bias vs variability of an estimator; variability shrinks with n. Misconceptions: sampling distribution = sample distribution; "bias" for random error; larger n reduces bias.
**Instrument.** Sampling-distribution builder: repeated samples from the Ledger; stack any statistic (proportion, mean, min-of-two, max); compare its centre to the truth; n slider.
**Dataset.** DS-08, DS-09.
**Drills.** 6, one rubric (explain why two honest samples differ, in context): parameter/statistic; what one dot is; unbiased vs biased from a simulated stack; effect of n.
**Mission beat.** kind interpretation — explain in context why *Asgard* and *Tindr* honestly disagree and how much disagreement is expected at n ≈ 400 (rubric: sampling variability, statistic vs parameter, magnitude); then kind choice — is the Board's min-of-two statistic biased, and which way. Wrong: "That's the sample. Where's the distribution?"
**Clue.** The cutters are honest; the Board's summary statistic is biased low by construction. Not yet proven: the Lane rate.
**Log entry.** *A sampling distribution is made of statistics, one per sample.* Mistake: calling it the sample.
**Delete-the-math.** Without stacking the statistic, "the cutters disagree" reads as "someone is lying" — the conspiracy the book refuses — and the Board's min-of-two goes unchallenged.

#### act-5-02 · One in Seven — 25 min · AP 5.2 · calc: integral-as-accumulation
Crew: analyst, comms, xo · MET 113 · Bridge.
**Situation.** The normal, revisited, on the Ledger's honest transits: Mark-9 delay against the nominal plot is close to normal, mean 0, SD 2.7 days — days, not hours, because hulls file their own profile inside the Lane's band and old drives file slow. You find the cutoff above which only 1% of honest transits fall: 6.2 days. The nineteen average 2.8 days late. One of them is above the cutoff. Individually they are unremarkable: about one honest hull in seven is that late. Ferrier: "Then no single one of them is evidence. Say that first, so nobody says it for you." Solberg notes the Register has their Mark 9 check-ins to the second, and an advisory on each.
**Concept.** Normal probabilities and percentiles both directions; assessing normality (dotplot, normal probability plot); interpreting a normal-model probability as a long-run proportion. Misconceptions: the CLT makes the population normal; using the normal on a skewed variable without saying so.
**Instrument.** z-score / normal-area explorer in inverse mode (enter an area, read the cutoff) with a normal-probability-plot side panel.
**Dataset.** DS-09 honest delays; the 19's delays.
**Drills.** 6, one rubric (interpret a normal probability as a proportion in context): inverse-normal cutoff; P(one transit ≥ x); normality assessment from a probability plot; both directions.
**Mission beat.** kind numeric — the 99th-percentile delay cutoff and P(an honest transit is at least as late as the seeded nineteen's mean); kind choice — how many of the nineteen exceed the cutoff, and what that licenses (nothing, alone). Wrong: "You've just proved a ship was late."
**Clue.** Each of the nineteen is individually unremarkable. That is the point: the evidence is in the mean, and the mean needs the next module.
**Log entry.** *The CDF accumulates area; the inverse reads it backwards.* Mistake: judging a group by whether each member is extreme.
**Delete-the-math.** Without the individual-level probability the CLT lesson has no contrast; the learner would "see" nineteen late ships and not know that a hostile reviewer can show each one is ordinary.

#### act-5-03 · The Machine — 30 min · AP 5.3, 5.7 · calc: limits-and-the-clt
Crew: analyst, sensors, xo · MET 116 · Intel terminal.
**Situation.** The Central Limit Theorem machine on the Ledger's delays, n = 19: what the mean of nineteen honest transits looks like. SD 2.7/√19 = 0.62 days. The nineteen's mean, 2.8, is 4.6 SEs out; on the mark axis, mean 9.3 against 6.5 with SD 3.18/√19 = 0.73, it is 3.8. Ebele runs the machine on a skewed parent to see the shape form anyway, and on a Bernoulli parent for next week. Oyelaran watches the sampling distribution form and says, unprompted, that she had thought "normal" was a property of things and not of averages.
**Concept.** Mean and SD of x̄ (μ, σ/√n); conditions (normal parent or n ≥ 30); what the CLT says and does not; probabilities about a sample mean. Misconceptions: CLT normalizes the population; n ≥ 30 makes anything normal; σ/n.
**Instrument.** CLT machine: any parent (skewed delays, uniform marks, bimodal, Bernoulli), set n, watch the sampling distribution of x̄ form with SD shrinking as σ/√n.
**Dataset.** DS-09 (delay; mark under the uniform-on-[1,12] null).
**Drills.** 6, one rubric (explain what the CLT does and does not say, in context): SD of x̄; P(x̄ ≥ value); conditions; σ/n trap.
**Mission beat.** kind numeric + interpretation — the SD of the mean delay of 19 honest transits and P(x̄ ≥ the seeded nineteen's mean) (≈ 2 × 10⁻⁶); interpret in context. Wrong: σ/n → "Root n, Ensign. It's in the log."
**Clue.** The nineteen's mean lateness — and their mean mark — is not honest variation. Not yet proven: a formal decision rule (VI), who they belong to (VI), whether "late" is significant with s instead of σ (VII).
**Log entry.** *Averages are normal even when things are not; their spread is σ/√n.* Mistake: applying the theorem to individuals.
**Delete-the-math.** This is the beat that turns "late ships" into "not noise." Delete it and Act VI's accusation rests on a feeling and Ferrier will not sign it.

#### act-5-04 · Proportions in the Noise — 30 min · AP 5.5, 5.6 · calc: —
Crew: analyst, xo · MET 119 · Bridge.
**Situation.** The null model for the accusation, built before the accusation. One population, p = 0.0119, n = 900: the sampling distribution of p̂; conditions (900 × 0.0119 = 10.7 — passes narrowly, and Ferrier notes a hostile reviewer will see that too). Two populations with a *common* rate, n = 900 and 1,712: what the difference in sample loss proportions looks like when nothing is wrong. SD ≈ 0.0045. You do not run the test. Ferrier insists on seeing the noise before the signal, on the record.
**Concept.** Mean and SD of p̂; large counts and 10% conditions; mean and SD of p̂₁ − p̂₂ and its conditions; probabilities about proportions and differences. Misconceptions: p̂ for p in the SD when p is known; forgetting the 10% condition; SD of a difference as a difference of SDs.
**Instrument.** Proportion sampler: one or two populations with true rates; draw samples of n transits; stack p̂ or p̂₁ − p̂₂; normal overlay when conditions hold.
**Dataset.** DS-09 (n = 900 / 1,712; common p = 0.0119).
**Drills.** 6, one rubric (interpret P(p̂ ≥ value) in context): SD of p̂; large-counts check; SD of a difference; P(p̂₁ − p̂₂ ≥ d) under a common rate.
**Mission beat.** kind numeric — SD of p̂ for n = 900 at p = 0.0119 and SD of p̂₁ − p̂₂ under the common rate; then P(a difference at least 0.014 arises by chance) from the normal model (≈ 0.001 one-sided). Wrong: "You subtracted standard deviations."
**Clue.** A difference of 1.4 percentage points between owner classes would be rare under a common rate. Not yet proven: that the difference exists in the Lane (the register with beneficiaries arrives at Ceres).
**Log entry.** *SD of p̂ is √(p(1 − p)/n); differences add variances.* Mistake: p̂ where p₀ is given.
**Delete-the-math.** Without the two-population null there is no SE for Act VI's z, and the accusation cannot be written as a test.

#### act-5-05 · Differences in Means — 25 min · AP 5.8 · calc: —
Crew: analyst, engineer · MET 121 · Engineering deck.
**Situation.** The other null model, for a test you cannot yet run: how far the mean delay of Perrine transits could honestly differ from everyone else's — n = 900 and 1,712, σ = 2.7, SD of the difference 0.11 days. And for a small group: 19 against 881, SD 0.62. Sandoval, who has never been shown a sampling distribution, asks why the small group's spread is bigger and answers herself before Ebele can. Then the baseline: your own 2176 report — Ebele has never seen it — put the Lane at 0.5%. Under 1.1%, 31 in 2,612 is unremarkable; under 0.5%, five standard errors out. You write that sentence and stop, because the composition argument does not depend on it.
**Concept.** Mean and SD of x̄₁ − x̄₂; conditions; probabilities about a difference; why the variance of a difference adds. Misconceptions: SD of a difference subtracts; pooling without justification.
**Instrument.** Two-population CLT machine (difference mode): two parents, two n, the difference distribution forming; compare to √(σ₁²/n₁ + σ₂²/n₂).
**Dataset.** DS-09 (delays by owner class; DS-08 baselines).
**Drills.** 6, one rubric (interpret a probability about a difference in means): SD of x̄₁ − x̄₂; P(difference ≥ d); unequal n; conditions.
**Mission beat.** kind numeric — SD of the difference in mean delay for 19 vs 881 and P(a difference ≥ 2.8 d by chance) (≈ 3 × 10⁻⁶); then a **decision** (flavour) — adopt the Board's baseline or yours in the report (Board's: Act VI lands as "even on your numbers"; yours: Ostrow calls it self-citation). Wrong: "Subtracting variances gives you a smaller number than either. Think about what that means."
**Clue.** The rate argument depends on the null; the composition argument (Perrine vs others, lost vs surviving) does not. Not yet proven: anything formally.
**Log entry.** *Var(x̄₁ − x̄₂) = σ₁²/n₁ + σ₂²/n₂.* Mistake: subtracting.
**Delete-the-math.** Without this null model, Act VII's two-sample test has no reference and Ostrow's "within a day" cannot be dismantled with the Board's own SE.

#### act-5-checkpoint · Checkpoint: Noise Floor — 20 min · AP 5.1–5.8
Ferrier's "tell me what noise looks like" (framing above); q1–q9 per map §5. On pass: torch to Ceres; **decision** (flavour) — Ceres now or hold station for a second diversion (hold: consumables pressure in VI–VII, a second ambiguous contact). On fail: "Then we're not ready to be seen."

---

### ACT VI · Accusation (Unit 6 · 8 modules + checkpoint · 245 min)

**Opening.** MET 127. Ceres approach control, transponder on, forty plumes in the sky and half within a light-second. *Nightjar* takes fuel at the Compact consular berth. Captain Marsh comes aboard with a bottle and a grievance and stays four hours. Adjuster Halide Renn, Tharsis Mutual, asks for a meeting in the consulate: her syndicate has paid Perrine Holdings 2.1 billion over six years and would like to know why the Compact navy is only now curious. **Heat state:** hot, docked, visible to everyone.
**Pressure.** Solberg logs four transmissions from the consulate to Valhalla in the first six hours; none are yours. Renn offers the claims register; Okafor-Reyes of the Authority's Ceres office offers the same register, slower, through channels.
**Investigative question.** Can you state, with an honest margin and a test you would sign, that hulls insured to Perrine Holdings are lost at a higher rate than everyone else's?
**Closing turn.** MET 139/02:10: the reply is the first in the book signed *Ashby-Hale* personally. *Received. The Board will convene. Proceed to rendezvous with CSV Halden Reach for sink refit and resupply; Captain Ostrow will brief you on the Board's transit-time analysis, which addresses your concern.* Solberg: the timestamp is four minutes after your transmission arrived. The order takes you to a tender the faction controls; the analysis is about means, and it is wrong in a way you will have to demonstrate with the Board's own data.
**Checkpoint framing (act-6-checkpoint · "Accusation" · 25 min).** The four-step brief — state, plan, do, conclude — before it goes under your name and hull number. Ferrier reads it as the Board's counsel would. Items q1–q12 (DISP: a shaded normal curve). On pass: Solberg counts twenty-one minutes; the reply at MET 139. On fail: "This is what they'd do to it. Fix it before they can."

#### act-6-01 · Capture — 30 min · AP 6.1, 6.2 · calc: tails-and-inverse-functions
Crew: analyst, xo · MET 127 · Intel terminal, docked.
**Situation.** Before any number goes up the chain, you make Ebele show you what "95% confident" commits you to: a hundred Close Seasons, a hundred intervals, the ones that miss. He says the interval "has a 95% chance of containing the rate"; Ferrier asks him which interval, the one on the screen or the method. Conditions for the Lane's rate: random (the Ledger is a census of transits — Ferrier makes him say what "random" means for a process), 10% (the Close Seasons to come), large counts (31 and 2,581).
**Concept.** Interval = statistic ± margin from the sampling distribution; conditions for a one-proportion z-interval; confidence level as long-run capture rate. Misconceptions: "95% probability the parameter is in this interval"; "95% of the data"; wider = more precise.
**Instrument.** Confidence-interval capture simulator: 100 intervals, truth as a line, capture count; C and n sliders.
**Dataset.** DS-09 (p = 0.0119; n per Close Season ≈ 435).
**Drills.** 6, one rubric (`interpret-confidence-level`): capture rate; conditions check (`conditionsCheck`); z* from the inverse CDF; effect of C on width.
**Mission beat.** kind interpretation — interpret "95% confidence" for the Lane's loss rate (rubric: repeated samples / long run / % of intervals capture; forbidden: probability about this interval). Wrong: Ferrier: "Which interval?"
**Clue.** None yet; the discipline is being set.
**Log entry.** *Confidence is a property of the method, not of one interval.* Mistake: "95% chance the parameter is in here."
**Delete-the-math.** Without the capture demonstration the learner writes the forbidden sentence at MET 138, and the Board's counsel reads it aloud.

#### act-6-02 · Margin — 30 min · AP 6.2, 6.3 · calc: —
Crew: analyst, xo · MET 129 · Bridge.
**Situation.** The Lane's rate, 31 in 2,612, with an honest interval: (0.77%, 1.60%). It excludes 0.5%. It does not exclude 1.1%. You write both sentences. Ferrier: "Then that isn't the claim. Make the claim the data can carry." Ebele works out how many transits it would take to shrink the margin below 0.2 points — three Close Seasons — and you file that as the cost of the rate argument.
**Concept.** Constructing a one-proportion z-interval; interpreting it; margin vs n and C; sample size for a target margin; using an interval to judge a claim. Misconceptions: n increases confidence; interval contains 95% of p̂'s; interval proves a value.
**Instrument.** Margin planner: n and C sliders; the interval on a number line against the Board's baseline and yours; sample-size solver.
**Dataset.** DS-09, DS-08.
**Drills.** 6, one rubric (`confidenceIntervalInterpretation`): endpoints; interpretation; sample size for a margin; justify a claim from an interval.
**Mission beat.** kind numeric + interpretation — the seeded interval's endpoints and the interpretation in context; kind choice — which of two claims (rate exceeds 0.5% / rate exceeds 1.1%) the interval supports. Wrong: "You claimed the one the interval can't carry."
**Clue.** The rate argument beats your baseline and not the Board's. The claim must be about composition.
**Log entry.** *p̂ ± z*·√(p̂(1 − p̂)/n); say "true proportion."* Mistake: a sample-statistic interpretation.
**Delete-the-math.** Without the interval the report either overclaims the rate (and loses) or never turns to beneficiary; both kill Act VI.

#### act-6-03 · The Hypothesis — 25 min · AP 6.4 · calc: —
Crew: analyst, xo, comms · MET 131–133 · Intel terminal; the register arrives.
**Situation.** The claims register (from Okafor-Reyes through channels — or Renn's copy, the learner's call at the module's opening decision). Beneficiary of each lost hull's policy: nineteen, Perrine Holdings; twelve, eleven owners. Ebele builds the two-way table and says nothing for a while. Then the hypothesis: H₀, Perrine hulls are lost at the same rate as everyone else's; Hₐ, a higher rate. One-sided, chosen *before* the number, and you have him write down why. Conditions with the pooled proportion: 900 × 0.0119 = 10.7. Passes by seven-tenths of a hull. Ferrier makes a note that a hostile reviewer will see that too.
**Concept.** Hypotheses in words and symbols about a parameter; one- vs two-sided from the question; conditions with p₀ (one-sample) or the pooled p̂ (two-sample); what the standardized statistic measures. Misconceptions: hypotheses about p̂; choosing the alternative after the data; conditions with p̂ instead of p₀.
**Instrument.** Hypothesis console: pick the parameter, null value, direction; the null sampling distribution draws itself and the statistic locates the observed value.
**Dataset.** DS-10 joined to DS-09.
**Drills.** 6, one rubric (state hypotheses in context): hypotheses for described questions; direction from the question; conditions with p₀; what z measures.
**Mission beat.** kind choice + interpretation — the correct hypotheses (symbols and words) for the Perrine question and a one-sentence justification of one-sided; then kind numeric — the pooled proportion and the smallest expected count. Wrong: "You wrote p-hat."
**Clue.** Every diverted hull paid Perrine Holdings. Not yet proven: that the rate difference is beyond chance.
**Log entry.** *Hypotheses are about parameters, written before the data.* Mistake: p̂ in H₀.
**Delete-the-math.** Without the hypotheses in parameter language the accusation is a table, not a test; Ostrow's Act VII rebuttal ("lost ships are unusual") would be unanswerable.

#### act-6-04 · Eight in Ten Thousand — 25 min · AP 6.5 · calc: —
Crew: analyst, xo · MET 134 · Bridge.
**Situation.** z ≈ 3.2, p ≈ 0.0008. Ebele's first sentence: "there is a 0.08% chance the difference is due to chance." You strike it. On *Asgard* you would have written: assuming Perrine hulls are lost at the Lane rate, a gap this large would turn up about eight times in ten thousand Close Seasons. He reconciles the normal p with ten thousand simulated Close Seasons and gets nine. Ferrier asks whether the sentence would survive being read aloud in a hearing by someone who wants it to fail.
**Concept.** The p-value in context (assuming H₀, probability of a statistic at least as extreme); from the normal model and from simulation; what it is not. Misconceptions: P(H₀ true); "due to chance"; 1 − p = P(Hₐ); two-sided as one tail.
**Instrument.** p-value visualizer: null distribution with shaded tail(s); simulation-vs-normal toggle; one- vs two-sided toggle.
**Dataset.** DS-09 / DS-10 (19/900 vs 12/1,712).
**Drills.** 6, one rubric (`interpret-p-value`): p from z; simulated p; the sentence; the forbidden sentences; one vs two tails.
**Mission beat.** kind interpretation — interpret the seeded p-value in context (rubric: assuming H₀, at least as extreme, probability, context; forbidden: probability H₀ true, due to chance). Wrong: "That's the sentence they'd read out."
**Clue.** Eight in ten thousand. Not yet proven: a decision, a conclusion, by whom or why.
**Log entry.** *p is the probability of data this extreme if H₀ is true — not the probability H₀ is true.* Mistake: "due to chance."
**Delete-the-math.** Without the p-value there is no number under the accusation; and the exact sentence is the thing the book turns on at MET 138.

#### act-6-05 · Strike the Word — 25 min · AP 6.6 · calc: —
Crew: analyst, xo · MET 134/20:00 · Bridge.
**Situation.** Ebele's draft says the result "proves" Perrine hulls are being "targeted." You strike *proves* and *targeted*. What the data say: at α = 0.05 (α is set formally in 6-06; here the draft uses the default), p = 0.0008 < α, reject H₀; convincing evidence that hulls insured to Perrine Holdings are lost at a higher rate than other hulls on the Lane. What it does not say: by whom, or why. He asks whether the interval from 6-07 will agree; you tell him it must, and why.
**Concept.** Decision by p vs α; conclusion in context (reject / fail to reject; never accept); CI–test duality; how α is chosen and why decisions flip with it. Misconceptions: fail to reject = H₀ true; reject = Hₐ proven; conclusions without context.
**Instrument.** Decision console: α slider, p-value, decision indicator, a conclusion assembler graded live against the rubric; CI/test duality overlay.
**Dataset.** DS-09 / DS-10.
**Drills.** 6, one rubric (`significanceTestConclusion`): the conclusion; a fail-to-reject conclusion for a seeded weaker case; α flip; duality question.
**Mission beat.** kind interpretation — write the conclusion (rubric: decision, p vs α, evidence framing, direction, population and variable; forbidden: proves, accept, targeted/by whom). Wrong: "Strike the word."
**Clue.** Convincing evidence of a higher loss rate for Perrine-beneficiary hulls. Not yet proven: agency, intent, where the hulls are.
**Log entry.** *Reject or fail to reject; evidence for Hₐ in context; never "prove."* Mistake: "accept H₀."
**Delete-the-math.** The conclusion sentence is the report. Delete it and the MET 138 transmission is an opinion; Ashby-Hale's reply and Act VII do not follow.

#### act-6-06 · Paid in Hulls, Paid in People — 30 min · AP 6.7 · calc: —
Crew: medic, engineer, xo · MET 135 · Wardroom, off the record.
**Situation.** Ferrante, second person, on the cost of each error: Type I is your career and a Service scandal on a Martian adjuster's desk; Type II is the next nineteen hulls. You set α = 0.01 and write down why; Ebele computes the power of the two-proportion test against the difference you have seen, and against the difference the Board would call "consistent with comparable corridors." Sandoval, on the deck: some errors are paid in hulls and some in people, and you are about to find out which. The module tells the learner that in her voice and does not explain it.
**Concept.** Type I / Type II errors and consequences in context; power and its drivers (n, α, effect size); choosing α by consequences. Misconceptions: Type I always worse; power = 1 − α; smaller α is free.
**Instrument.** Type I / II error and power explorer: null and alternative on one axis; α cutoff draggable; shaded α, β, power; n and effect-size sliders.
**Dataset.** DS-09 (n = 900 / 1,712; alternatives 0.021 vs 0.007 and a smaller one).
**Drills.** 6, one rubric (describe Type I and Type II in context): errors in context; power for a seeded alternative; effect of n / α / effect size; α choice justified.
**Mission beat.** kind interpretation — state Type I and Type II for the Perrine test in context and their consequences; kind **decision** — α = 0.05 or 0.01, graded on the justification. 0.01 is quoted back with approval by Achterberg in the Epilogue.
**Clue.** The stakes, named. Not yet proven: anything new; this module is the book setting its price.
**Log entry.** *Type I: reject a true H₀; Type II: miss a false one; power is the chance of catching what is there.* Mistake: power = 1 − α.
**Delete-the-math.** Without the error analysis the Act VIII decision ("thirty percent is not small") is a tragedy without a ledger; the Epilogue's hearing (10-01) asks the learner to answer in these terms and there would be nothing to answer with.

#### act-6-07 · Perrine and Everyone Else — 25 min · AP 6.8, 6.9 · calc: —
Crew: analyst, xo, marsh · MET 136 · Bridge; Marsh in the wardroom.
**Situation.** The interval for the difference in loss rates, Perrine minus other: (0.4, 2.4) percentage points, unpooled SE, excludes zero. Ebele reads the sign backwards once. Marsh, from the hatch: "Percentage points of what?" and Ebele tells her: of ships. She does not say anything for a while either. The map's "suspect corridor vs control corridor" is retired here; the comparison the story needs is beneficiary class on the same Lane (the corridor comparison returns as homogeneity in Act VIII).
**Concept.** Two-proportion z-interval; conditions; interpretation including an interval containing 0; justifying a claim. Misconceptions: sign/order of subtraction; "contains 0 so equal."
**Instrument.** Difference-of-proportions panel: two sample panels (n, successes); the interval on a difference axis with 0 marked.
**Dataset.** DS-09 / DS-10.
**Drills.** 6, one rubric (interpret a difference interval in context): endpoints; conditions (four counts ≥ 10); interpretation; a seeded interval containing 0 and what it licenses.
**Mission beat.** kind numeric + interpretation — the seeded interval's endpoints and the interpretation (rubric: level, both endpoints, "true difference," order of subtraction, context). Wrong: "Which minus which?"
**Clue.** Perrine-beneficiary hulls are lost at between 0.4 and 2.4 points more per transit. Not yet proven: mechanism.
**Log entry.** *(p̂₁ − p̂₂) ± z*·√(p̂₁(1 − p̂₁)/n₁ + p̂₂(1 − p̂₂)/n₂), unpooled.* Mistake: the sign.
**Delete-the-math.** Without the interval the accusation has a p-value and no size; Renn's "why is the Compact navy only now curious" has no magnitude to answer with.

#### act-6-08 · The Accusation — 30 min · AP 6.10, 6.11 · calc: —
Crew: analyst, xo, comms, ashbyhale · MET 138–139 · Bridge; transmission to Valhalla (21 min).
**Situation.** The four-step brief: state (hypotheses, parameters), plan (two-proportion z-test, pooled, conditions with the 10.7 named), do (z ≈ 3.16, p ≈ 0.0008), conclude (at α = 0.01, convincing evidence; scope: transits on the Lane 2178–84, Register snapshot; not by whom, not why). Signed with your name and hull number, to the Board via Lane Operations, copy to the Flag Secretary (the learner's call). Solberg: twenty-one minutes. The reply at MET 139/02:10, signed Ashby-Hale: *Received. The Board will convene. Proceed to Halden Reach…* Timestamp four minutes after arrival. Marsh, leaving at MET 140: her brother's ship departed Uruk High two days behind *Nicholson Regio* in the spring of 2182; both classified at Uruk; only one ever called *piracy*. She wants to know what you're going to do.
**Concept.** Two-proportion z-test: hypotheses, pooled proportion, conditions, statistic, p-value, conclusion, scope of inference. Misconceptions: unpooled SE in the test; conclusions about the samples.
**Instrument.** Two-proportion test visualizer (p-value visualizer, two-proportion mode): pooled p̂ display; null distribution; shaded p.
**Dataset.** DS-09 / DS-10.
**Drills.** 6, two rubrics (`conditionsCheck`, `significanceTestConclusion`): pooled p̂; z; p; conditions with the pooled proportion; the conclusion; scope.
**Mission beat.** kind numeric (pooled p̂, z, p) + kind interpretation (the four-step conclusion with scope). Then **decisions** (flavour): whose register (Renn's — Ostrow: "a Martian adjuster's file"; Okafor-Reyes — two days, clean); copy the Flag Secretary (copy → Maalouf becomes the channel; the MET 170 message exists).
**Clue.** **First formal accusation, signed.** Not yet proven: that anyone in the Service knows; that the hulls survive; intent.
**Log entry.** *Pool under H₀; do not pool for the interval.* Mistake: unpooled SE in the test.
**Delete-the-math.** Without the signed test there is nothing for Ashby-Hale to answer at four minutes' notice; the order to *Halden Reach*, the Refit set and the loss all follow from this transmission.

#### act-6-checkpoint · Checkpoint: Accusation — 25 min · AP 6.1–6.11
The brief read as the Board's counsel would (framing above); q1–q12 per map §5. On pass: transmitted; the MET 139 reply. On fail: "This is what they'd do to it."

---

### ACT VII · Halden Reach (Unit 7 · 7 modules + checkpoint · 225 min)

**Opening.** MET 152. CSV *Halden Reach*, a 40,000-tonne Lane tender, holds station 0.2 AU sunward of the Ceres approach with her radiators glowing like a town. *Nightjar* docks in her lee. Commander Lindqvist-Oduya meets you at the lock, correct and unhappy. Captain Ostrow meets you in her wardroom with the Board's transit-time analysis: Perrine hulls' mean transit time is "within a day of the Lane mean, which is inconsistent with the hidden-mass hypothesis." He compared all Perrine transits to all others. He has not looked at the nineteen. **Heat state:** docked; the sink in the tender's hands for six days.
**Pressure.** Ostrow outranks you and is the Board's officer on the Lane. Ebele has been sent something: Sandoval's old lead fitter at Adlinda, hearing that the assessing officer's report has been "referred for review," has forwarded the Adlinda refit logs — twelve Sulcus hulls through a Mk 3 "drive uprate" 2181–83 — because the report was buried and she would rather it not be. The Refit set.
**Investigative question.** Were the diverted hulls *prepared* — and can the Board's own means analysis be shown wrong with the Board's own data?
**Closing turn.** MET 165–166: the inference brief goes via the tender's relay with a copy to Maalouf. *Marius Regio*'s vector from Act IV, propagated forward, intersects the orbit of a six-kilometre body at 3.41 AU the chart lists as a prospector's abandoned claim. Kettle. Fourteen days cold-coast, with a sink nine hours shorter than it was. *Nightjar* undocks on a resupply pretext; Ostrow's slate, forty seconds later: *You are directed to remain in company.* What you do not have is a hull — an identity at Kettle, a cargo category, a name matched to a shape. Categories. Counts.
**Checkpoint framing (act-7-checkpoint · "Halden Reach" · 25 min).** The inference brief before it goes into a relay Ostrow reads first: Ferrier and Sandoval, in *Nightjar*'s wardroom with the hatch shut. "He will read this looking for the one procedure you chose wrong." Items q1–q11 (DISP: two small-sample dotplots). On pass: sent at MET 165. On fail: "Then he'd have found it. Again."

#### act-7-01 · Twelve Is a Margin — 30 min · AP 7.1, 7.2 · calc: —
Crew: analyst, engineer, xo · MET 152 · *Nightjar* wardroom, docked.
**Situation.** The Refit set is twelve hulls. Ebele reaches for a normal-based margin; you make him build the t distribution first — simulate z with s in the denominator at n = 12 and watch the tails grow — and show why twelve is not thirty. He says "t is for small samples"; you correct him: t is for σ unknown, and it is always unknown. Sandoval: "Twelve is a margin, Ensign, not a fleet." Conditions: random (the yard's twelve are every uprate, a census of the program's refits — state it), 10%, normality with n = 12 (dotplot: no outliers, no strong skew).
**Concept.** Estimating σ by s changes the sampling distribution; t with n − 1 df; t vs normal as df grows; conditions for a one-sample t-interval. Misconceptions: "t for small n, z for large"; df = n.
**Instrument.** t vs normal comparator: df slider; overlaid densities; tail readout; simulation of z-with-s producing heavy tails.
**Dataset.** DS-11 (n = 12).
**Drills.** 6, one rubric (`conditionsCheck`, t-interval): t* vs z* at df 11; tail probabilities; conditions with a small-n dotplot; df.
**Mission beat.** kind numeric + choice — t* at 95% for df 11 vs z*, and the correct reason to use t. Wrong: "Because it's small" → "Because you don't know sigma. You never do."
**Clue.** None yet; the tool is being chosen honestly.
**Log entry.** *t replaces z when s replaces σ; df = n − 1.* Mistake: df = n.
**Delete-the-math.** Without the t distribution the reactor-output interval (7-02) is too narrow and Ostrow's counsel would throw it out on the first page.

#### act-7-02 · Reactor Output — 25 min · AP 7.2, 7.3 · calc: —
Crew: analyst, engineer · MET 155 · Engineering deck.
**Situation.** Bureau certifications for the twelve after refit: mean thrust 612 kN against the Mk 3 specification of 588 — 4.1% above spec, s ≈ 7 kN; the t-interval excludes spec by a wide margin. Uprated drives. Sandoval: "A freighter doesn't need four percent more torch unless it intends to carry more than it says." Ebele writes "95% of the reactors are above spec"; you strike it.
**Concept.** One-sample t-interval for a mean; interpretation; width vs n, C, s; n for a target margin; justifying a claim. Misconceptions: "95% of the individuals"; the interval is about x̄.
**Instrument.** CI capture simulator in t mode (small-n intervals capturing μ; compare with z) plus an interval builder from summary statistics.
**Dataset.** DS-11 `output_kN`.
**Drills.** 6, one rubric (`confidenceIntervalInterpretation`, mean): endpoints from summary stats; interpretation; n for a margin; claim justification.
**Mission beat.** kind numeric + interpretation — the seeded interval for mean post-refit output and its interpretation; kind choice — does it justify "the uprate raised output above spec." Wrong: "About the mean, Ensign. Not about the reactors."
**Clue.** The twelve were uprated ~4% above spec. Not yet proven: that uprate relates to the nineteen.
**Log entry.** *x̄ ± t*·s/√n; "true mean."* Mistake: "95% of the values."
**Delete-the-math.** Without the interval, "4.1% above spec" is a mean of twelve with no margin; the claim "prepared" has no first leg.

#### act-7-03 · The Nineteen Were Slow — 30 min · AP 7.4, 7.5 · calc: —
Crew: analyst, xo · MET 157 · Bridge.
**Situation.** The nineteen's Mark-9 delay against the profile's mean of zero: one-sample t, n = 19, mean 2.8, s ≈ 2.7, t ≈ 4.6, df 18, p < 0.001. Ebele wants the normal table because Act V used σ; you tell him Act V had the whole Lane's σ and this test has nineteen ships' s, and log it. The nineteen were slow. Ostrow's analysis averaged them into 900 honest transits and lost them — Ebele reproduces Ostrow's number (0.25 d) and yours side by side.
**Concept.** Hypotheses about a mean; conditions; t statistic, df, p-value; conclusion connected to the interval. Misconceptions: p from the normal table at small n; "reject so the mean is exactly the alternative."
**Instrument.** p-value visualizer in t mode (df-aware).
**Dataset.** DS-09 (the 19's delays; the 900 for Ostrow's pooled mean).
**Drills.** 6, two rubrics (`significanceTestConclusion`, `interpret-p-value`): hypotheses; t and p; conclusion; the pooled-mean trap.
**Mission beat.** kind numeric (t, df, p) + interpretation (conclusion in context: convincing evidence the mean Mark-9 delay of the nineteen diverted transits exceeds zero). Wrong: "You used z."
**Clue.** The nineteen were late by days, not by chance. Not yet proven: that lateness is tied to the uprate (7-04) or to *preparation* (7-04, 9-x).
**Log entry.** *t = (x̄ − μ₀)/(s/√n), df = n − 1.* Mistake: the normal table with s.
**Delete-the-math.** Without the one-sample test Ostrow's "within a day" stands as the Board's transit-time analysis; the brief has no answer to the one rebuttal the Board has made with numbers.

#### act-7-04 · Before and After — 30 min · AP 7.2, 7.4, 7.5 (paired) · calc: —
Crew: analyst, engineer, xo · MET 159–161 · Engineering deck; the sink comes back at MET 161.
**Situation.** The Refit set is paired: the same twelve hulls, Mark-9 delay on the run before the uprate and the run after. Treated as two samples — nothing: t ≈ 1.8, p ≈ 0.08. Treated as pairs — the differences — a shift of two days, t ≈ 4.1, p ≈ 0.001. Uprated drives, *slower* transits. Nine of the twelve are among the nineteen; the three that are not show no shift. Then the sink comes back: eight matched cold profiles against Sandoval's pre-refit runs; Watch loss 8.9 hours, give or take one. "They didn't break it, Skipper. They shortened it. That's a decision." You put it in writing to Lindqvist-Oduya, who reads it twice and says she was not told. That is the moment she starts keeping her own log.
**Concept.** Recognizing paired data; analyzing differences as one sample; t-interval and test for a mean difference with conditions on the differences; when pairing gains power. Misconceptions: two-sample on paired data; normality on the raw groups.
**Instrument.** Paired vs two-sample explorer: the same hulls before/after; toggle "paired" vs "two samples"; watch SE and p change.
**Dataset.** DS-11 (`delay_before`, `delay_after`); DS-12 for drills.
**Drills.** 6, two rubrics (`confidenceIntervalInterpretation` for a mean difference; `significanceTestConclusion`): paired t and interval on the Refit set; the sink's eight profiles as a second paired context; recognizing pairing from a design; conditions on differences.
**Mission beat.** kind numeric (mean difference, t, p) + kind choice (paired or two-sample, with the reason) + interpretation (conclusion in context). Wrong two-sample: "Same hulls, Ensign. Same hulls."
**Clue.** Hulls got slower after being uprated: heavier after than before. Nine of twelve are among the nineteen. **Your own sink has been shortened by nine hours, on purpose.** Not yet proven: where they went; who signs.
**Log entry.** *Paired data: analyze the differences as one sample.* Mistake: two-sample on pairs.
**Delete-the-math.** Without the paired analysis the Refit set shows "nothing" — literally, the two-sample p — and the Board's referral would have been correct; and the nine-hour sink finding is what makes the Kettle approach a knowingly degraded one.

#### act-7-05 · Two Fleets, Two Means — 25 min · AP 7.6, 7.7 · calc: —
Crew: analyst, xo · MET 163 · Bridge.
**Situation.** Two intervals, both honest. Perrine's surviving hulls (881) vs everyone else (1,712): the interval for the difference in mean delay *contains* zero — Ostrow is right about the honest Perrine hulls, and you say so in writing. Lost Perrine (19) vs surviving Perrine (881): (1.5, 4.1) days, does not contain zero. Ebele asks whether to pool the SDs; you tell him never, and that the df comes from the Engine or the conservative rule, and to say which.
**Concept.** Two-sample t-interval for μ₁ − μ₂; conditions; df (Welch or conservative); interpretation including an interval containing 0; justifying a claim. Misconceptions: pooling by default; "conservative df is more accurate."
**Instrument.** Difference-of-means panel: two dotplots with summary panels; interval on a difference axis; df display.
**Dataset.** DS-09 (delay by group).
**Drills.** 6, one rubric (interpret a difference-of-means interval in context): two seeded comparisons, one containing 0; conditions; df choice; claim justification.
**Mission beat.** kind numeric + interpretation — both seeded intervals and the two sentences: what the first licenses (no evidence honest Perrine hulls differ) and the second (lost Perrine hulls were later, by 1.5 to 4.1 days on average). Wrong: "You just accused the eight hundred and eighty-one."
**Clue.** The anomaly is owner-specific *and* subset-specific: the honest Perrine hulls are honest. Not yet proven: significance of the second comparison as a test (7-06).
**Log entry.** *Two independent samples: SE = √(s₁²/n₁ + s₂²/n₂); never pool.* Mistake: pooling.
**Delete-the-math.** Without the interval that contains zero, the brief overclaims against Perrine's honest crews and Ostrow's "you have shown lost ships were unusual" lands; without the second interval the lost/surviving split is an assertion.

#### act-7-06 · Transit Anomaly — 30 min · AP 7.8, 7.9 · calc: —
Crew: analyst, xo, ostrow (name) · MET 163/18:00 · *Halden Reach* wardroom.
**Situation.** The two-sample test: lost Perrine vs surviving Perrine, t ≈ 4.5, Welch df ≈ 18, p < 0.001; reject at 0.01. Two independent lines of evidence now: proportions (Act VI), means (Act VII). Ostrow, reading it: "You have shown that lost ships were unusual. Lost ships are unusual, Commander. That is why they were lost." You write the limit he is pointing at into the brief yourself — the test does not establish cause, and the nineteen are the losses, not a random sample of Perrine transits — and then you write what it does establish: the *direction* and the *timing* (before Mark 9, before they were lost).
**Concept.** Two-sample t-test: hypotheses, conditions, statistic, df, p, conclusion; what it does not establish. Misconceptions: conclusions about the samples; result as proof of intent.
**Instrument.** Two-sample t-test visualizer (p-value visualizer, two-sample mode): group dotplots; null t; shaded p.
**Dataset.** DS-09.
**Drills.** 6, two rubrics (`significanceTestConclusion`; `scope-of-inference`): the test; the conclusion; the scope statement; Ostrow's objection as a drill.
**Mission beat.** kind numeric (t, df, p) + interpretation (conclusion with the explicit limit: no causal claim; population = Perrine transits on the Lane 2178–84). Wrong: "Proves is the word he's waiting for."
**Clue.** Two independent lines of evidence. Not yet proven: where the hulls went; whether they exist; who signs.
**Log entry.** *Two-sample t: hypotheses about μ₁ − μ₂; Welch df; conclude in context; no cause.* Mistake: "the lost ships were slower" (samples) for "the mean delay of lost hulls exceeds…" (parameters).
**Delete-the-math.** Without the test, Ostrow's line is the last word; without the scope statement it is a fair one.

#### act-7-07 · The Inference Brief — 30 min · AP 7.10 · calc: —
Crew: analyst, xo, engineer, comms · MET 165–166 · Bridge; undocking at 166/04:00.
**Situation.** Every finding, its procedure, its conditions, its limits — bootstrapped where the conditions were thin (the nineteen's mean delay: a bootstrap interval beside the t-interval; they agree). The procedure selector grades each choice; Ebele picks a two-proportion test for a question about means and owns it. Then the decision: *Marius Regio*'s vector, propagated, meets a six-kilometre rock at 3.41 AU. Kettle. Fourteen days cold with a sink nine hours short. The brief goes via the tender's relay (Ostrow reads it first; you know he will) with a copy to Maalouf. *Nightjar* undocks on a resupply pretext Lindqvist-Oduya signs without reading. Ostrow's slate: *You are directed to remain in company.* Solberg: "That was not a Board transmission, sir."
**Concept.** Selecting the procedure (one-proportion, two-proportion, one-mean, paired, two-mean; interval vs test) from question and data structure; the four-step write-up; robustness via bootstrap when conditions are shaky. Misconceptions: choosing by number of groups alone; skipping conditions because the computer did it.
**Instrument.** Procedure selector (interactive decision tree that grades the choice) + bootstrap machine (resample the nineteen's delays; compare the bootstrap interval to t).
**Dataset.** DS-09, DS-10, DS-11 (all Act VI–VII findings).
**Drills.** 6, one rubric (four-step write-up graded on structure): select the procedure for five described questions; bootstrap vs t; conditions audit.
**Mission beat.** kind choice (procedure for each of four findings) + interpretation (one finding's four-step write-up). Then **decisions** (flavour): accept the refit or refuse (refuse → a "safety inspection" does the same thing; *Halden Reach*'s crew remember in Act IX); send the brief through the relay or hold it (hold → six days' slip); Kettle or wait for the Board (wait → Maalouf's MET 170 line; either way, Kettle).
**Clue.** The vector points at Kettle. Not yet proven: that anything is there.
**Log entry.** *Choose the procedure from the question and the data's structure; then state, plan, do, conclude.* Mistake: procedure by group count.
**Delete-the-math.** Without the assembled brief there is nothing for Maalouf to forward, nothing for Lindqvist-Oduya to read in Act IX, and nothing for Brandt's director to send down.

#### act-7-checkpoint · Checkpoint: Halden Reach — 25 min · AP 7.1–7.10
The brief before the relay (framing above); q1–q11 per map §5. On pass: sent; undock. On fail: "Then he'd have found it."

---

### ACT VIII · Kettle (Unit 8 · 4 modules + checkpoint · 135 min)

**Opening.** MET 180. Fourteen days cold-coasting on a ballistic line, parasol out, skin at 120 K, the Eyes folded and the refit array — which Oyelaran does not trust — doing the watch. Kettle is a dark lump 60,000 km ahead with eleven warm shapes docked to it and three standing off. The survey camera shows hulls. It cannot show names. **Heat state:** cold, Quiet, sink at 71% — the approach has cost more than the table promised because the table is wrong by nine hours. Torch from cold: four minutes.
**Pressure.** A picket is likely: Ebele's model puts P(a cold tug positioned within slug range of the approach quarter) at 0.30. The lidar is the only instrument that gives hull IDs, and the lidar is a lamp in a dark room.
**Investigative question.** Are the lost hulls here — and was the ledger written to hide them?
**Closing turn.** MET 196: Senior Examiner Odile Brandt, Bureau of Hulls, on her own authority, sends six years of fuel certifications for every Perrine departure. "The Bureau's stamp is the only thing on the Lane that isn't for sale, Commander." You can prove the hulls are at Kettle, that the ledger was written to hide them, that an examiner signed them out. You cannot yet prove the Compact end knew *before they sailed*. If the Δv to reach Kettle was loaded at Uruk High on each departure date, someone at Uruk High planned each diversion. That is a slope.
**Checkpoint framing (act-8-checkpoint · "Kettle" · 20 min).** MET 194, wings out, running: the log of what fourteen IDs prove. Ebele presents; you correct; Ferrier signs as witness. No one mentions the chair. Items q1–q9 (DISP: observed-vs-expected bars). On pass: the IDs go — now, or held for the regression (the learner's call). On fail: "Her data. Get it right."

#### act-8-01 · Volatiles — 30 min · AP 8.1, 8.2 · calc: —
Crew: analyst, sensors, xo · MET 180/22:00 · Intel terminal, cold.
**Situation.** While you wait for the geometry, Ebele runs the Register's declared cargo categories for the 31 lost hulls against the Lane's mix — He-3/deuterium 38%, volatiles 21%, metals 17%, manufactured and other 24%. Under "losses are random," the lost hulls' cargo mix should match the Lane's. Expected counts 11.8, 6.5, 5.3, 7.4 — all above five, and he checks them on the *expected* column after first checking the observed. Observed: 5, 21, 2, 3. Lost hulls over-declare *volatiles* by a factor of three. Ammonia is the cheapest heavy thing you can write on a manifest. Oyelaran, from the refit array's console: "The reference star reads eleven degrees warm. I want the blister."
**Concept.** GOF hypotheses in terms of a claimed distribution; expected counts n·pᵢ; conditions (random, 10%, expected ≥ 5); the statistic and df = k − 1. Misconceptions: percentages in the statistic; rounding expected counts; checking ≥ 5 on observed.
**Instrument.** Chi-square GOF visualizer: observed vs expected bars per category; per-category contributions; the statistic accumulating.
**Dataset.** DS-14.
**Drills.** 6, one rubric (`conditionsCheck`, chi-square): expected counts; conditions; statistic by hand for a small table; df; hypotheses.
**Mission beat.** kind numeric — the expected count for *volatiles* and the χ² statistic (≈ 40.8) with df. Wrong: expected counts rounded → "Point four of a hull is a hull, in this arithmetic."
**Clue.** The lost hulls' declared cargo is not the Lane's. Not yet proven: significance and which category (8-02).
**Log entry.** *Expected = n·pᵢ; χ² = Σ(O − E)²/E; df = k − 1.* Mistake: percentages instead of counts.
**Delete-the-math.** Without expected counts, "twenty-one volatiles" is a number without a comparison; the hidden truth's *what* (ammonia as ballast cover) is never reached.

#### act-8-02 · Forty Seconds — 25 min · AP 8.3 · calc: —
Crew: analyst, sensors, xo, engineer, comms, medic · MET 181/05:30–06:16 · Bridge, then the mast root.
**Situation.** The p-value from χ² with df 3: less than one in ten thousand. Conclusion: convincing evidence the lost hulls' declared cargo distribution differs from the Lane's; the largest contribution is *volatiles* (over), then He-3/deuterium (under). Ebele says "every category differs"; you strike it. Then the decision. 38,000 km. Oyelaran asks for the blister and the manual head. You approve. Ferrier reads you the model one more time: 0.30. You order a forty-second dwell. **Gated scene (after the beat):** 05:58, fourteen returns — *Marius Regio*, *Harpagia Sulcus*, *Nicholson Regio*, *Perrine Regio*, *Tiamat Sulcus*, ten more. Solberg: "RF transient, bearing two-two-zero, two thousand one hundred kilometres. Cold source." Ebele plots the cone. Sandoval: "Four minutes to light." Ferrier: "Slug's inside ten." 06:12: the frame rings once. The mast-head indicator goes grey. Ferrante is at the root hatch before you have said anything. He comes back up the ladder and tells you eight seconds, and then that the buffer is intact, because you are going to ask. You light the torch at 06:16 and run at 0.3 g with the wings out, and *Patience* does not follow because a tug cannot.
**Concept.** p-value from χ² with df; conclusion in context; identifying the largest contributors as the follow-up. Misconceptions: two-sided χ²; "reject means every category differs"; statistic size without df.
**Instrument.** Chi-square distribution panel: df slider; statistic marker; shaded upper tail; linked to the contribution bars. Plus the probability tree (from 4-03) for the dwell decision.
**Dataset.** DS-14; DS-17 (the dwell tree); DS-13 (gated).
**Drills.** 5, one rubric (`conclude-test`, chi-square variant with largest contributor): p from χ²; conclusion; contributions; df trap.
**Mission beat.** kind interpretation — the GOF conclusion in context naming the largest contributor. Then kind **decision** — dwell 40 s or 12 s, graded on computing P(a picket is positioned to respond) from the tree (0.30 either way, to two decimals). The round comes either way; the debrief (in 8-03's opening) is about what the model assumed: that the picket needed to see *you*, when it needed only to see the lamp.
**Clue.** **The lost hulls are at Kettle, with their names on them.** Not yet proven: that the classifications were manufactured (8-03/04); premeditation (IX).
**Log entry.** *χ² is one-tailed; reject says the distribution differs, not that every cell does.* Mistake: interpreting a large statistic without df.
**Delete-the-math.** Without the tree the dwell is a coin flip and her death is an accident; with it, the odds were computed correctly, the decision was defensible, and the outcome was in the thirty percent. "Thirty percent is not small." That sentence needs the number.

#### act-8-03 · Loss by Beneficiary — 30 min · AP 8.4, 8.5 · calc: —
Crew: analyst, xo, medic · MET 183–186 · Bridge; torch lit, wings out, done hiding.
**Situation.** The log, in your hand, past tense, one paragraph (bible §11, right/wrong 7). The Board's acknowledgement calls it an *incident*; you strike the word and send it back. Ferrante, once: what happened. Then Ebele works, because it is what there is to do. Loss × beneficiary across the 2,612 transits, one sample classified two ways: a test of independence; expected Perrine-lost 10.7. Cause code by corridor — the Lane's 31 vs the Mars–Belt corridor's 46, separate samples: homogeneity. He sets both up and states which is which and why; then df = (r − 1)(c − 1), and he writes rc − 1 first. The debrief on the dwell: the picket's rules of engagement were "fire on active illumination." The model was right about where the picket was. It was wrong about what the picket needed.
**Concept.** Expected counts in two-way tables (row × column / n); homogeneity vs independence by data-collection design; hypotheses; conditions; df. Misconceptions: the two tests swapped; df = rc − 1; expected counts that break the margins.
**Instrument.** Chi-square independence visualizer: two-way table with expected-count overlay; mosaic view; cell-contribution heat.
**Dataset.** DS-09 ⋈ DS-10 (2×2); DS-15 (2×3).
**Drills.** 6, one rubric (state hypotheses for the correct test in context): expected counts; homogeneity vs independence from a design description; df; conditions.
**Mission beat.** kind numeric (expected count for the Perrine-lost cell; df for each table) + kind choice (which test for each table, with the design reason). Wrong: "Two samples or one, Ensign. That's the whole question."
**Clue.** The tables are set. Not yet proven: the results (8-04).
**Log entry.** *Expected = (row total × column total)/n; independence for one sample, homogeneity for several.* Mistake: df = rc − 1.
**Delete-the-math.** Without the correctly framed hypotheses the corridor comparison the Board made in Act V cannot be turned against it, and the Perrine 2×2 is just Act VI again.

#### act-8-04 · Dacre's Stamp — 30 min · AP 8.6, 8.7 · calc: —
Crew: analyst, xo, medic, brandt (name), comms · MET 186–196 · Bridge; Brandt's message at MET 196.
**Situation.** Loss × beneficiary: χ² ≈ 10.0, df 1, p ≈ 0.002; the cell that drives it is *Perrine, lost* — and Ebele notes the statistic is the square of Act VI's z. Cause by corridor: χ² ≈ 16.9, df 2, p ≈ 0.0002; the Lane has three times the *unknown*. Classification × office for the 31: every *piracy* from Uruk — but expected counts fail and, Ebele realises, no test is needed: the 31 are all the losses there are; it is a description of a census. Examiner × lost among Perrine departures: Dacre signed 22 of 900 and 17 of 19; expected 0.46. He checks the condition twice. The χ² is invalid, and you make him say what that means and what to do instead: simulate the null — assign 19 losses at random among 900 departures ten thousand times and count how often 17 or more land on Dacre's 22. Zero of ten thousand. Then the four: the only non-Perrine hulls Uruk ever classified are *Thessaly Ember*, *Kestrel Bough*, *Hygiea Promise*, *Long Fathom* — twenty-three people, abrupt silence, the short pile in Act I's dotplot, the spring-2182 cluster from 4-01. Ferrante, reading over your shoulder: "Those weren't diverted." No. Those were the story. MET 196: Brandt.
**Concept.** Carrying out a two-way χ² test; conclusion in context; cells driving the result; selecting the categorical procedure (one-prop z / two-prop z / GOF / homogeneity / independence / simulation when conditions fail / no inference for a census). Misconceptions: association implies cause; significant = large; running χ² with expected counts below 5.
**Instrument.** Independence visualizer with the distribution panel; procedure selector (categorical mode) with the two extra leaves ("conditions fail → simulate" and "census → describe"); `<MonteCarlo>` on the examiner table via `permutationTestProportions`.
**Dataset.** DS-09 ⋈ DS-10; DS-15; DS-01 (office); DS-16 (examiner).
**Drills.** 6, two rubrics (`conclude-test` chi-square; procedure justification): statistic and p for a 2×2 and a 2×3; describe the association from contributions; select the procedure for four questions including one with a failed condition and one census.
**Mission beat.** kind numeric (χ², p for the beneficiary table) + interpretation (conclusion naming the driving cell) + kind choice (for the examiner table: run χ² / simulate / describe — correct: simulate) + kind numeric (the simulated p, accepted as "< 0.001"). Then **decision** (flavour): send the IDs now (*Halden Reach* ordered to intercept at once) or hold for the regression (same order, six days later).
**Clue.** Loss depends on beneficiary; the Lane's classifications are not the Mars–Belt corridor's; Uruk wrote every *piracy*; **Dacre's stamp is on 17 of 19**; the four are the cover. Not yet proven: premeditation at departure — Ostrow will say the crews went rogue at Mark 9.
**Log entry.** *When expected counts fail, do not run χ²: simulate the null or collapse cells; when you have the whole population, describe.* Mistake: reading significance as size.
**Delete-the-math.** Without the independence test the beneficiary link is Act VI restated; without the failed-condition simulation Dacre is one name on a list; without homogeneity the Board's corridor comparison survives. Brandt's file arrives *because* the brief named the Bureau's process — delete the tests and there is no brief for her director to read.

#### act-8-checkpoint · Checkpoint: Kettle — 20 min · AP 8.1–8.7
The log of what fourteen IDs prove (framing above); q1–q9 per map §5. On pass: the IDs go, now or later. On fail: "Her data. Get it right."

---

### ACT IX · Intent (Unit 9 · 4 modules + checkpoint · 140 min)

**Opening.** MET 203. *Nightjar* at 5 mgee toward Ceres, wings out, done hiding. Brandt's file open on the intel terminal. The mast head is a stump under a patch; the Eyes work; Petty Officer Halvorsen runs the sensor board and does not sit in her chair. Ferrier has moved the sensor watch to the bridge without asking you. *Halden Reach* has been ordered by Lane Operations to "rendezvous with and escort" *Nightjar* to Callisto. **Heat state:** hot; 118 km/s remaining.
**Pressure.** The Board has still not convened. Maalouf's last message was two lines. Ferrante reports that Ebele has not slept in a way that is now a medical matter, and that you have not either, and only one of you is his patient.
**Investigative question.** Was the fuel to divert loaded at Uruk High, on each departure date, before the stamp went on?
**Closing turn.** MET 231: the Inspectorate has opened proceedings; Ostrow is relieved; *Well done. I am sorry about Lieutenant Oyelaran.* Book One's proof is complete. What remains is what the institution does with it — and the one thing the numbers could not touch: whether the threat that justified all of it was real.
**Checkpoint framing (act-9-checkpoint · "Intent" · 25 min).** The evidence board before delivery to three addresses: Ferrier, Ebele, Sandoval, Solberg, Ferrante in the wardroom, the hatch open. "Say it back to me." Items q1–q9 (DISP: residual and normal-probability plots). On pass: the transmission at MET 219. On fail: "Not to the Inspectorate like that. They'll only read it once."

#### act-9-01 · The Slope Has a Spread — 30 min · AP 9.1 · calc: —
Crew: analyst, xo · MET 204 · Intel terminal.
**Situation.** Before you touch Brandt's data you make Ebele show the sampling distribution of a fitted slope: a true line (fuel = 0.215 × mass), honest noise, repeated samples of nineteen departures from the 881 honest Perrine hulls, the slopes stacking around 0.215 with SD ≈ 0.003. "So the slope has a spread." Yes. That is the whole of it. Then the conditions on Brandt's nineteen — linear by physics, independent departures, residuals near-normal, equal spread across mass — checked on the residual plot and a normal probability plot, not on fuel itself. He reads SE(b) from the output: 0.009 for the nineteen, larger than the honest 0.003 because the nineteen's residuals carry the spread of what they hid.
**Concept.** The population regression model (μᵧ = α + βx, σ); the sampling distribution of b (mean β, SD σ/(σₓ√n)); conditions for slope inference (LINE + random); SE of the slope from output. Misconceptions: "the slope is fixed because the data are"; conditions checked on y instead of residuals.
**Instrument.** Regression-slope sampling distribution simulator: a true line with noise; repeated samples; slopes stacked; n and σ sliders; output reader for SE(b).
**Dataset.** DS-16 (the 881 honest as population; the 19 for the output table).
**Drills.** 6, one rubric (`conditionsCheck`, slope): SD of b from the formula; read SE(b) from output; conditions from residual diagnostics; effect of n and σ.
**Mission beat.** kind numeric (the simulated SD of b at n = 19 and the SE(b) read from the seeded output) + kind choice (which conditions the seeded residual plots support). Wrong: "You checked normality on the fuel."
**Clue.** The tool is calibrated; a slope is a statistic with a standard error. Not yet proven: anything about the nineteen.
**Log entry.** *b varies from sample to sample; SE(b) = s/√Sₓₓ.* Mistake: conditions on y.
**Delete-the-math.** Without the sampling distribution of b, "0.257 is not 0.215" is a comparison of two numbers with no standard; Ostrow's counsel would say the Bureau rounds.

#### act-9-02 · 0.215 — 25 min · AP 9.2, 9.3 · calc: —
Crew: analyst, engineer, xo · MET 208 · Engineering deck.
**Situation.** Fuel loaded on declared mass, the nineteen. Physics fixes the Lane slope at 0.215 tonnes of propellant per declared tonne. The nineteen's fitted slope is 0.257; the 95% interval, df 17, excludes 0.215 by a wide margin. Residuals fine, no fan, no curve. Same regression on the 881 honest Perrine hulls: the interval brackets 0.215. Honest ships, honest fuel. Sandoval on why it is a slope and not an intercept: ballast tanks scale with hull; the extra is per tonne, not per ship. Ebele reads both intervals from computer output and writes df = n − 1 once.
**Concept.** t-interval for the slope (b ± t*·SE(b), df = n − 2) from output; interpretation; justifying a claim including against a physically required value; width vs n and residual spread. Misconceptions: df = n − 1; interval as a range of slopes in the data.
**Instrument.** Output reader (build the interval from a regression output table) + capture simulator in slope mode.
**Dataset.** DS-16 (the 19; the 881 as control).
**Drills.** 6, one rubric (interpret a slope interval and justify a claim): interval from output; df; claim vs a physical constant; the control regression.
**Mission beat.** kind numeric (the seeded interval's endpoints for the nineteen) + interpretation (rubric: level, endpoints, "true slope," units t/t, context; and the claim: excludes 0.215). Then kind numeric — the control interval for the 881 (contains 0.215). Wrong: df = 18 → "n minus two. You estimated two things."
**Clue.** The nineteen were fuelled for mass they did not declare — per tonne, systematically. Not yet proven: that the *extra* fuel is the Kettle Δv (intent).
**Log entry.** *b ± t*·SE(b), df = n − 2; a slope interval can be tested against a physical value.* Mistake: df = n − 1.
**Delete-the-math.** Without the interval against 0.215 the fuel finding is Act II's residuals again; the "control regression" on the 881 is what makes Brandt's stamp — not the Bureau's process — the target.

#### act-9-03 · The Fuel to Reach Kettle — 30 min · AP 9.4, 9.5 · calc: —
Crew: analyst, engineer, xo, comms · MET 213 · Bridge.
**Situation.** The variable that cannot be innocent. For each of the nineteen departure dates the nav software gives the Δv a hull at Mark 9.4 would need to arrive at rest at Kettle instead of Ceres — 24 to 38 km/s over six years as the Lane, Ceres and Kettle move. Under any innocent story — clerical error, petty under-declaration, rogue crews at Mark 9 — that number has nothing to do with how much fuel a hull loaded at Uruk High: β = 0. You regress excess fuel fraction (fuel ÷ declared mass − 0.215) on Kettle Δv. Slope ≈ 0.00082 per km/s, SE ≈ 0.00012, t ≈ 7, df 17, p < 0.0001. Ebele's first guess for the physical value is 1/vₑ = 0.0010; Sandoval: "At zero delta-v, Ensign. We're at two-seventy." The rocket equation's marginal fuel per km/s at the Lane's 1,000 km/s exhaust and a 270 km/s burn, carrying the hidden mass, is (1 + h)·e^(−0.273)/1000 ≈ 0.00082. The interval brackets it. **The excess fuel on each hull is the fuel to reach Kettle on the day it left.** Someone computed that number at Uruk High, nineteen times, before the stamp went on.
**Concept.** Hypotheses about β (β = 0, or β = β₀); conditions; t = (b − β₀)/SE(b), df = n − 2; p from output or by hand; conclusion; what a significant slope does and does not prove. Misconceptions: significant slope = cause; two-sided output p used unhalved for a one-sided test.
**Instrument.** p-value visualizer in slope mode with linked residual diagnostics; a second test against β₀ = 0.00082.
**Dataset.** DS-16 (the 19: excess fuel fraction, `dv_kettle`).
**Drills.** 6, two rubrics (`significanceTestConclusion` slope; `scope-of-inference`): hypotheses incl. a non-zero null; t and p from output; conclusion; what it does not prove; one- vs two-sided from output.
**Mission beat.** kind numeric (t, p for β = 0) + interpretation (conclusion in context: convincing evidence that, among the nineteen diverted departures, excess fuel fraction increases with the Kettle Δv on the departure date; scope: these nineteen departures; no claim of who ordered it). Then kind numeric — the test against the physical β₀ (fail to reject: the slope is consistent with the rocket equation). Wrong: "Proves who? Say what it proves."
**Clue.** **Premeditation at the Compact end.** Book One's proof is complete. Not proven: who gave the order, or why.
**Log entry.** *t = (b − β₀)/SE(b), df = n − 2; a slope can be tested against zero or against physics.* Mistake: causal language.
**Delete-the-math.** This is the beat the book is named for. Delete it and Ostrow's "the crews went rogue at Mark 9" is the Service's finding, and Ashby-Hale is never asked about *Thessaly Ember*.

#### act-9-04 · The Evidence Board — 30 min · AP 9.6 · calc: —
Crew: analyst, xo, comms, ashbyhale, lindqvist (name), ostrow (name), achterberg (name) · MET 216–231 · Wardroom; transmission at MET 219; *Halden Reach* at MET 228.
**Situation.** Every finding from Act I's two piles to this slope, each with its procedure, its conditions, its conclusion in context, and its limit. What the case proves: a pattern, an owner, a false ledger, a prepared fleet, a stockpile at Kettle, premeditation at the Compact end. What it does not: who gave the order, or why. You write that sentence yourself. Ferrier: "Say it back to me," and you do. Delivery, MET 219: three addresses, one transmission, 21 minutes — Board via Lane Operations, Flag Secretary, Inspectorate. Not the Authority; not Tharsis; not Marsh. MET 222, Ashby-Hale, 43 minutes after you send: *Anselm. You were always going to find it. I'd hoped you'd understand it when you did.* You ask about *Thessaly Ember* in a transmission you draft four times. *I did not ask.* MET 228: *Halden Reach* matches velocity; Ostrow orders the cores transferred; Lindqvist-Oduya, on an open channel, informs him that a Lane tender does not detain a Service hull on a liaison officer's order and that she has forwarded the brief under her own name. No one fires anything. MET 231: Achterberg's one sentence, and the unsigned line.
**Concept.** Selecting the inference procedure across proportions, means, chi-square, slopes; communicating the whole argument (procedure, conditions, result, conclusion, limitations); assessing a body of evidence built from multiple analyses without stacking p-values as if independent. Misconceptions: overclaiming cause; χ² for quantitative data; multiplying p-values.
**Instrument.** Unified procedure selector + case-file evidence board: place each finding with its procedure, conclusion and limits; the board grades the assembled case.
**Dataset.** All of DS-01…DS-16 (as findings).
**Drills.** 6, one rubric (limitations of an assembled case: causation, generalization, conditions): select the procedure for six questions across Units 6–9; place findings; identify the weakest link (the 10.7; the nineteen as a non-random sample); "what does the case not prove."
**Mission beat.** kind choice (procedure per finding) + interpretation (the limitations paragraph: what the case proves and does not; rubric: names cause as unproven, states the scope, names conditions that passed narrowly). Then **decisions**: delivery — Board only / Inspectorate + Board / broadcast (the book's frame rewards the middle; broadcast costs the promotion and gives Marsh her answer sooner; Board-only is forwarded by Maalouf anyway and the Epilogue notes you did not); the cores — transfer under protest / refuse (Lindqvist-Oduya's refusal covers both).
**Clue.** The case, assembled and bounded. The Inspectorate convenes.
**Log entry.** *A body of evidence is judged finding by finding: procedure, conditions, conclusion, limit.* Mistake: treating many p-values as one.
**Delete-the-math.** Without the evidence board's limits statement, Achterberg's Epilogue question ("which of your findings would survive a hostile review") has no answer, and the learner has claimed motive the data cannot carry — which Ashby-Hale's *I did not ask* is written to expose.

#### act-9-checkpoint · Checkpoint: Intent — 25 min · AP 9.1–9.6
"Say it back to me" (framing above); q1–q9 per map §5. On pass: MET 219, three addresses. On fail: "They'll only read it once."

---

### EPILOGUE · Provident (2 modules · 40 min)

**Opening.** MET 258. Adlinda Yards, Callisto, where the book began. *Nightjar* under tug into the same slip. The mast head is a stump. Fifteen people walk off her. **Heat state:** docked, cold in the ordinary sense.
**Beats between modules (Writer's scenes, not modules).** MET 260, the Inspectorate: Ashby-Hale resigns before he can be charged; Ostrow charged with four counts of conspiracy to murder; Dacre with fraud; Vasque at large with *Patience*; eighty-seven people come home from Kettle over the following year; nineteen families had held funerals. MET 268, the Assembly keeps Kettle in closed session — *The Compact does not return what it needs to those who would use it against us*; Tharsis Mutual repaid quietly over twenty years; the Provident Fund under Inspectorate trusteeship; your pension is in it. MET 280: Captain. *Nightjar* refit with the sink she was designed with; Ferrier is given *Asgard*; Ebele asks to stay; Sandoval wants it in writing that the new sink will be tested by someone not paid by the Provident Fund.

#### act-10-01 · Consequences — 20 min · AP 6.7 (revisited; cumulative review) · calc: —
Crew: achterberg (name), medic, xo · MET 272 · A windowless room at Valhalla.
**Situation.** Achterberg asks you, on the record, which of your findings would survive a hostile review, and which of your decisions you would make again. You answer in Type I and Type II terms because it is the only honest language for it: the α you chose, the power the case had against the difference it found, and the decision at 38,000 km — the probability computed correctly, the outcome in the thirty percent. She quotes your 0.01 back with approval if you chose it. Ferrante, afterwards: Oyelaran's mother asked him whether it was quick, and he told her the truth, and she thanked him.
**Concept.** Type I / Type II consequences revisited as the cost of the decisions made; the interpretation discipline across proportions, means, chi-square, slopes. Misconceptions: "the case was proven"; forgetting scope at the moment it matters.
**Instrument.** Log review console: the learner's own `<LogEntry>` blocks re-asked as mixed drills; the Type I/II explorer (from 6-06) reused on the case's key test.
**Dataset.** DS-09 / DS-10 (the accusation's test); the learner's log.
**Drills.** 6, one rubric (`conclude-test` or `interpret-interval`, drawn from all nine checkpoints' generators): cumulative review, reseeded.
**Mission beat.** kind interpretation — for the two-proportion result, state the Type I and Type II error in context, which you accepted more risk of by your α, and which finding you would *not* defend to a hostile reviewer and why (rubric: both errors named in context; scope; one limitation named). Wrong: "You said proven."
**Clue.** Resolution and its bill.
**Log entry.** *Every decision under uncertainty has two ways to be wrong; name both before you choose.* Mistake: claiming the case was proven.
**Delete-the-math.** Without the Type I/II accounting the hearing is a scene about feelings; the book's argument — that the decision was defensible *because* the odds were computed — cannot be stated.

#### act-10-02 · Thread — 20 min · AP 4.5 (revisited; Book Two seed) · kind: interlude · calc: —
Crew: achterberg (name) · MET 288 · Achterberg's office.
**Situation.** She puts the 2177 intercept on the table — the one message on which Ashby-Hale built PROVIDENT — and beside it a new one, from the Phobos yards: a drive signature that *could* be a heavy hull working up. She asks what it means. You say what P(this signature | a hostile working up) is: 0.9. She asks what P(a hostile working up | this signature) is, and what the base rate of heavy-hull signatures at Phobos has been over the last decade, and you realise you have never been asked that question in that order in thirty-four years. Neither, she says, had Ashby-Hale.
**Concept.** Reversing a conditional with a tree: P(hypothesis | evidence) from P(evidence | hypothesis) and a base rate; the question a p-value cannot answer. Misconception: base-rate neglect.
**Instrument.** Probability tree builder in prior → posterior mode.
**Dataset.** DS-20.
**Drills.** 4 (short set; interlude): posterior at base rates 0.02 and 0.20; the same evidence, two priors; identify which conditional a sentence states.
**Mission beat.** kind numeric — P(hostile | signature) at the base rate Achterberg gives (≈ 0.27) and at the one Ashby-Hale implicitly used (≈ 0.82). No failure flavour; the scene ends on the number.
**Clue.** The threat that justified PROVIDENT rests on one message and an unexamined prior. Book Two.
**Log entry.** *P(H | E) is not P(E | H); the base rate is the difference.* Mistake: neglecting it.
**Delete-the-math.** Exempt (interlude), but not empty: the two posteriors are the Book Two hook.

---

## 4. Agency ledger

Structural rule (bible §10): **no hard branches.** Decisions change flavour text, the register of later scenes and who says what — never which datasets exist, which Acts occur, or whether Oyelaran dies. Every decision beat is a `<MissionBeat kind="decision">` with `<Outcome option>` children; the graded part of a decision beat, where there is one, is the arithmetic that informs it, never the choice.

| Module | Decision | Options | What it colours later |
|---|---|---|---|
| act-0-03 | Query the reporting line | accept / query | Query: Ferrier logs it; Board: "the line is correct"; Maalouf notes in Act IX that you asked. |
| act-1-03 | Trust the class table or Oyelaran | table / Oyelaran | 1-07 debrief either way: wrong to distrust the table, right to notice; the contact was heavy. |
| act-1-checkpoint | Send the bimodality now | send / hold | Send: Ashby-Hale's Act IX line gains "I read your first note, you know." Hold: Ebele asks in Act II why you sat on it. |
| act-2-05 | Keep *Cyrene Ore* in the fit | keep / drop | Drop without justification → Ferrier: "Justify it or leave it"; the checkpoint DISP item uses the with/without pair. |
| act-2-checkpoint | Name Sulcus | name / let the data name them | Name: Ostrow's Act VII hostility is overt; Renn already knows in Act VI. |
| Act II (gated scene, 2-02) | Lend the Eyes to archive work | lend / keep the sweep | Lend: DS-19 has no *Harpagia* plume-vector entry at MET 59; Act IV's contact log is thinner; the near loiter point's EV is lower. Keep: Oyelaran's "eleven degrees, maybe" line at MET 59. |
| act-3-02 | Sampling design | SRS / stratified / cluster | Same conclusion; debrief compares precision and link-time; cluster yields a wider interval Ebele must explain in 6-02's drills. |
| act-3-02 | Include Sulcus masters | include / exclude | Include: nonresponse becomes evidence (8-04's "who would not talk"). Exclude: a reviewer's note in Act VII. |
| act-3-05 | Order the escort lottery | order / don't | Don't: 3-05 runs on *Asgard*'s six-transit pilot; Ostrow's "overreach" remark is dropped. |
| act-4-05 (gated) | Cold profile | Watch / Quiet | Quiet misses the plume rotation; 4-10's beat fails with an Oyelaran debrief; retry on Watch. |
| act-4-06 | Loiter point | near / middle / far | Near: fat tail; a seeded draw may saturate → Act V opens at 97% with an early purge. Far: one fewer contact; *Marius Regio* on the retry window. |
| act-4-10 | Follow *Marius Regio* | follow / log | Follow: Board rebuke, 90 km/s gone, Act VI's Ceres call tighter on fuel. Log: Ferrier's "one ship." |
| act-5-05 | Baseline in the report | Board's / yours | Board's: Act VI lands as "even on your numbers." Yours: Ostrow calls it self-citation. |
| act-5-checkpoint | Ceres now or hold | Ceres / hold | Hold: consumables pressure in VI–VII; a second ambiguous contact. |
| act-6-03 | Whose register | Renn's / Okafor-Reyes's | Renn's: faster; Ostrow: "a Martian adjuster's file." Okafor-Reyes: two days, clean. |
| act-6-06 | α | 0.05 / 0.01 | Either sets the stakes for VIII; 0.01 is quoted back by Achterberg with approval in 10-01. |
| act-6-08 | Copy the Flag Secretary | copy / don't | Copy: Maalouf becomes the channel; the MET 170 message exists. Don't: Act IX's delivery to the Inspectorate is colder. |
| act-7-07 | Accept the refit | accept / refuse | Refuse: a "safety inspection" does the same thing; *Halden Reach*'s crew remember (Act IX warmth). Act VIII uses the post-refit table either way. |
| act-7-07 | Send the brief through the tender's relay | send / hold | Hold: the Board's and Maalouf's reactions slip six days; Act IX's timeline compresses. |
| act-7-07 | Kettle or wait | Kettle / wait | Wait: Maalouf, MET 170, unsigned: *Proceed as your judgment dictates.* Either way, Kettle. |
| act-8-02 | Lidar dwell | 40 s / 12 s | 40 s: fourteen IDs. 12 s: nine IDs (8-03/04 run on nine; conditions thinner, Ebele says so). The round comes either way; the 8-03 debrief is about what the model assumed. |
| act-8-04 | Send the IDs | now / hold | Now: *Halden Reach* ordered to intercept at once. Hold: same order, six days later. |
| act-9-04 | Delivery | Board only / Inspectorate + Board / broadcast | Middle is the book's frame; broadcast costs the promotion and gives Marsh her answer sooner; Board-only is forwarded by Maalouf anyway and the Epilogue notes you did not. |
| act-9-04 | The cores | transfer under protest / refuse | Lindqvist-Oduya's refusal covers both; transfer means Ostrow reads it first. |

**How wrong analysis is acknowledged.** Every graded mission beat and checkpoint failure produces an in-story debrief — a named crew member walks the error in their own register (Ferrier: assumptions; Ebele: "Yes, sir. That's — yes."; Sandoval: silence and a gauge; Oyelaran: "Say that number again"; Ferrante: what it usually looks like) — and a retry with new seeded parameters. The log records the retry in one dry past-tense line ("Re-ran the residuals at the XO's request. She was right to ask."). Never "you failed"; the register is *this would not survive the Board; fix it before they see it.* Checkpoint debriefs name the modules to revisit.

---

## 5. Decisions log

Every open question from the bible (§14), the curriculum map (§8), and every conflict found in the weave, with the resolution and the edit applied. **Edits are surgical**: the bible's and map's structure, ids, prerequisites and instruments are untouched.

1. **act-6-08 large counts at 10.7 (bible §14.7b).** Keep 900/1,712 and 19/12. The narrow pass *is* the beat (Ferrier's note; the 9-04 "weakest link" drill). z ≈ 3.16, p ≈ 0.0008 are the right size for the story; raising Perrine to 1,100 would weaken the result to z ≈ 2.4 and break §1.2's 34%. No edit.
2. **act-8-04 examiner table, expected count 0.46 (bible §14.7a).** Option (b): the "conditions fail — what now" lesson, answered by **simulating the null** (`permutationTestProportions` / a `<MonteCarlo>` on random assignment of 19 losses among 900 departures), not by collapsing cells. Loss × beneficiary remains the module's χ² (conditions met). Classification × office is a census of the 31 and is *described*, not tested — a third "select the procedure" leaf. Map act-8-04 investigative-use line edited to say so.
3. **The Board's mean of 7.1.** Bible-internal conflict: the 31 losses cluster at Mark 9–10 (23 of 31), so their mean cannot be 7.1. Resolution: **7.1 is the mean over all 2,200 Register records** (every severity); the losses' mean is ≈ 8.5. This makes act-0-03/1-01's population lesson real. Bible Prologue Turn and Act I beat 1 edited (one clause each).
4. **Piracy count.** Bible §6/§7/§8 (four cover losses; "the only non-Perrine hulls Uruk ever classified are the four *piracy* losses") vs §8.1 ("piracy is 12 of 31") and Act III beat 5 ("all twelve *piracy* classifications"). Resolution: **piracy 4 (Uruk), unknown 22 (19 Uruk + 3 Ceres), accident 5 (Ceres)**; Uruk classified 23, Ceres 8. The twelve abrupt-silence hulls are the 4 cover losses + 8 genuine. Bible §8.1 act-1-02 note and Act III beat 5 edited; map act-1-02 investigative-use edited (the display lesson becomes the denominator, not "piracy looks negligible").
5. **act-1-05's boxplot.** A 1.5 × IQR fence cannot flag a bimodal pile (bible §8.1 said it flags the abrupt pile). Resolution: the boxplot that flags is on **plume-power ratio** (DS-19, the hot contact); time-to-silence is the counter-example of what a box hides. Matches the map. Bible §8.1 act-1-05 row edited.
6. **Inferred-mass precision.** Bible §2.4 gives ±3% and calls +8% a 2.7-SD residual; at that SD ~9 honest hulls of 393 would sit in the +6–9% band with the nineteen and Act II's residual plot would smear. Resolution: **honest residual SD 2.0% of declared mass** (±2%); +6–9% is 3–4.5 SD; expected honest hulls above +6% ≈ 0.5. Bible §2.4 (two numbers) and Act II opening ("plus or minus two percent") edited. Oyelaran's voice sample "plus or minus three percent" is untouched (it is the plume-power figure).
7. **Transit-time variable and the paired/two-sample contrast.** Bible Act V had honest time-to-Mark-9 SD 0.9 d and "every one of the nineteen above the 1% cutoff"; with that spread no two-sample analysis of the Refit set could "show nothing" as Act VII requires, and the CLT lesson would be unnecessary. Resolution: the variable is **Mark-9 delay against the nominal 3.00-mgee plot**; hulls file their own profile inside the Lane's 2.7–3.3 mgee band, giving a persistent per-hull offset (SD 2.5 d) plus run noise (0.9 d); fleet SD ≈ 2.66 d. Consequences, all verified: the nineteen (+2.8 d) are individually unremarkable (P ≈ 0.15 each) and collectively impossible (z ≈ 4.6) — a *better* Unit 5 lesson; paired t ≈ 4.1 vs two-sample t ≈ 1.8 on the Refit set; lost-vs-surviving Perrine t ≈ 4.5; Ostrow's pooled difference ≈ 0.25 d. The diverted hulls' filed 2.8-mgee profile is inside the band, which is *why* the Authority never flagged them. Bible Act V beats 2–3 and §7.1 row V edited; map act-5-02 investigative use edited.
8. **Mark null model.** "SE 0.79" implied a discrete uniform over integer marks; the Register records fractional marks. Resolution: continuous uniform on [1, 12], σ = 3.18, SE(19) = 0.73, z ≈ 3.8. Bible §7.1 row V and Act V beat 3 edited.
9. ***Tindr* 0 in 380.** Under the Board's own 1.19%, zero of 380 is a 1-in-100 event — not "ordinary," which is 5-01's lesson. Resolution: **1 in 380** (P ≈ 0.06 under 1.19%, 0.43 under 0.5%). Bible §7.1 row V and Act V opening edited.
10. **GOF categories.** Five categories with "mixed 10%" gives an expected count of 3.1 on n = 31, contradicting "all above five." Resolution: **four categories** (manufactured & other 24%), df 3, χ² ≈ 40.8; the largest contributors are volatiles (over) and He-3/D (under). Bible Act VIII beat 1 and module-coverage line edited.
11. **Act IX slope physics.** "0.00114 per km/s vs 1/900" mixes the freighter exhaust (1,000 km/s in §2.3) with *Nightjar*'s (900) and uses the zero-Δv derivative. Resolution: marginal fuel fraction per km/s at the operating point = (1 + h)·e^(−(242 + Δv)/1000)/1000 ≈ **0.00082**; the fitted slope (t ≈ 7) *brackets the physical value* — a second confirmation, and Ebele's 1/vₑ guess becomes a taught correction. Fuel-on-declared-mass slope for the 19 follows from the same physics: **0.257** (not 0.248). Bible §7.1 row IX, Act IX beats 2–3 and §14.4 edited.
12. **Which hulls are "the nineteen."** All inference uses the Register snapshot at MET 0 (31 losses / 2,612 transits); *Harpagia Sulcus* (MET 59, added beat — the Act I hot contact goes dark during Act III) and *Marius Regio* (MET 104) are witnessed evidence, not sample. Lidar returns 14 = 12 of the 19 + the two in-story hulls. Bible §7.1 row VIII edited.
13. **act-6-07/08 "suspect corridor vs control corridor" (map)** → Perrine-beneficiary vs other hulls on the Lane (bible). The corridor-vs-corridor comparison becomes the homogeneity test in 8-03/04 (Lane vs Mars–Belt, DS-15). Map edited.
14. **act-4-07 "the yard's margin (adding SDs) was too generous" (map).** Adding SDs is too *pessimistic*. Resolution: the yard quoted ±8 kW as if the six errors averaged out (too generous); Ebele adds SDs (too pessimistic); the answer is √Σσ² = 19.6 kW. Map edited.
15. **act-9-03 variable (map §8, bible §14.4).** Excess fuel fraction on Kettle Δv, as the bible chose; scope stated as "these nineteen departures." Map investigative-use line edited to name it.
16. **act-3-05 response variable.** Losses are 1%-per-transit events invisible in 12 transits; the lottery's response is *off-nominal advisories per transit* (DS-04b) and the module's second lesson is exactly that limitation (power, foreshadowing 6-06). No bible edit needed (the added beat is in §8.1).
17. **Titles.** Acts VII, VIII and the Epilogue are *Halden Reach*, *Kettle*, *Provident* (`ACT_TITLES`); checkpoints renamed to match. Map §0 table, Act headings, checkpoint rows and §5 headings edited. Module titles in this sheet supersede the map's working titles; ids and slugs are unchanged.
18. **Non-roster speakers.** Ostrow, Lindqvist-Oduya, Renn, Okafor-Reyes, Achterberg, Maalouf, Halvorsen are not in `crew.ts`; Act Teams use `<Dialogue name="…">` (no code change). If the orchestrator prefers roster keys, add `ostrow`, `lindqvist`, `renn`, `okafor`, `achterberg`, `maalouf`, `halvorsen` — a request, not an edit.
19. **Prologue modules.** Kept as `kind: module` with real delete-the-math lines (they are not interludes); act-10-02 is the only interlude.
20. **Checkpoint framings.** Each checkpoint is a review scene in the CO's own register (Ferrier / Sandoval / Ebele presenting), never a test; pass and fail lines are given in each Act header.

**Edits applied to `docs/story-bible.md`** (decision number in brackets): §2.4 inferred-mass precision and residual SD [6]; Prologue Turn [3]; Act I beat 1 [3]; Act II opening [6]; Act III beat 5 [4]; §7.1 rows V [7, 8, 9], VIII [12], IX [11]; Act V opening [9], beats 2–3 [7, 8]; Act VIII beat 1 and coverage line [10]; Act IX beats 2–3 [11]; §8.1 act-1-02 and act-1-05 rows [4, 5]; §14.4 [11]; §14.7 pointer to this log [1, 2].
**Edits applied to `docs/curriculum-map.md`:** §0 table and Act VII/VIII/Epilogue headings, checkpoint rows and §5 headings [17]; act-1-02 [4]; act-4-07 [14]; act-5-02 [7]; act-6-07, act-6-08 [13]; act-7-05 [7]; act-8-04 [2]; act-9-03 [15].

---

## 6. Tone & voice quick card

**Prose rules (bible §11, build-order §10).** Second person, present tense in scenes; the log past tense, first person, one paragraph, signed. Physical detail carries emotion — gauges, hands, timestamps, the lithium ticking; no one "feels a chill." Short sentences, exact nouns; glossary terms used once with context, then bare. Adverbs rationed ("quietly," "carefully," "suddenly" are defects). Nobody quips; humour is dry, rare, about time or paperwork, and no one laughs. The CO is never taught at — Ebele is, and the CO corrects him. Light-lag is said out loud; replies never arrive early. Death is stated once, plainly, by the one who saw it, and remembered in what people stop doing. The Board is never mocked; it is rendered exactly. Numbers carry their uncertainty when the Chief says them and lose it when the Board does. Violence is never spectacle: the frame rings once.

**Voice rules (three per speaker; `speaker` keys from `src/content/crew.ts`).**
- `xo` Ferrier — Short declaratives; "the data says" / "we don't know," never "I think." Answers with the question's assumptions ("Assuming the file is complete"). Never raises her voice; angrier means more precise. Tell: "Say it back to me."
- `sensors` Oyelaran — Units first, meaning second ("Plume 0.29 terawatt, 61 hertz. Mk 3."). "Confirmed" for things not confirmed; a flat "plus or minus" only when ordered. Calls the telescopes "the Eyes," as a crew member; gets quieter as the data gets stranger.
- `analyst` Ebele — Fast, complete sentences with numbers in them; starts explanations with "So." When corrected: "Yes, sir. That's — yes." then fixes it. Never blames the data; by Act VII asks "what's the sampling frame?" first.
- `engineer` Sandoval — Never a number without its ±. "The cellar" (sink), "the wings" (radiators), "the lady" (rarely); heat is a debt ("borrowing at three hundred kilowatts"). Blunt in private ("Skipper"), formal on deck; disagreement is silence and a gauge.
- `comms` Solberg — Every transmission announced with lag and timestamp; reads messages verbatim, opinion in one sentence if asked. No contractions on deck. Calls the Board "Valhalla"; dry humour about time only.
- `medic` Ferrante — Second person to you off the record ("You haven't slept"). Physical detail before judgement; never "fine." Base rates before the patient; answers moral questions with clinical ones; states each death once.
- `admiralty` The Board — Passive voice and nominalisations ("It is noted that…"; "The Board directs"). Never *loss*; always *incident*. Praise is a warning. Always ≥ 43 minutes away.
- `ashbyhale` — First person, warm, as a man who taught you. Never raises his voice; speaks of the Directorate Problem as settled fact. Does not mention the four: "I did not ask."
- `marsh` — Belt-plain, profane, exact about her own ship, contemptuous of paperwork. Her brother died on *Thessaly Ember*. Asks what you are going to do.
- `brandt` — Civil servant, sixty, exact; the Bureau's stamp is the one honest thing on the Lane. Acts on her own authority and says so.
- Non-roster (`name=`): **Ostrow** — courteous, superior, never threatens, cites regulations and "the Board's officer on the Lane"; **Lindqvist-Oduya** — correct, unhappy, keeps her own log, speaks on open channels when it matters; **Renn** — Martian, precise about money, amused by Compact manners; **Okafor-Reyes** — through channels, slow, careful, remembers his predecessor; **Achterberg** — one sentence at a time, asks questions in the right order; **Maalouf** — two lines, unsigned when it counts; **Halvorsen** — does not sit in the chair.

---

## 7. Time budget

| Act | Modules | Teaching min | Checkpoint min | Act total |
|---|---|---|---|---|
| Prologue · Shakedown | 3 | 60 | — | 60 |
| I · Signatures | 7 + cp | 185 | 20 | 205 |
| II · Manifests | 6 + cp | 175 | 20 | 195 |
| III · Testimony | 5 + cp | 145 | 20 | 165 |
| IV · Running Cold | 10 + cp | 270 | 25 | 295 |
| V · Noise Floor | 5 + cp | 140 | 20 | 160 |
| VI · Accusation | 8 + cp | 220 | 25 | 245 |
| VII · Halden Reach | 7 + cp | 200 | 25 | 225 |
| VIII · Kettle | 4 + cp | 115 | 20 | 135 |
| IX · Intent | 4 + cp | 115 | 25 | 140 |
| Epilogue · Provident | 2 | 40 | — | 40 |
| **Total** | **70** (61 teaching + 9 checkpoints) | **1,665** | **200** | **1,865 min = 31 h 05 min** |

Inside the 25–35 h contract with ~4 h headroom either side. Module minutes are the map's; nothing here changes them.
