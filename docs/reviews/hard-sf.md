# Hard-SF audit — Book One

Scope: every light-lag figure, heat/thermodynamic figure, transit/delta-v figure, detection range and
unit in `content/act-*/**.mdx`, `src/instruments/act-*/data.ts`, and the §2 hard-science ledger in
`docs/story-bible.md`. Findings are ordered most severe first. **CONFIRMED** means the arithmetic was
done; **SUSPECTED** means the judgement rests on an assumption stated in the finding.

**Prohibited technology: nothing found.** No aliens, no FTL, no artificial gravity other than thrust
(`content/act-0/00-standing-orders.mdx:61` says so in-world and the book keeps the promise), no
reactionless drive, no inertial damping, no instantaneous comms. Every sensor result in the book is
produced by an aperture, a bolometer, a lidar or a transponder, and the one place the text could have
cheated — the Act VIII hull identification — is explicitly paid for with an active lidar ping that
gives the ship away. The "magic" failures below are all arithmetic, not invention.

## Constants used throughout

1 AU = 1.495979 × 10¹¹ m; c = 2.997925 × 10⁸ m/s, so 1 AU = 8.317 light-minutes (agrees with §2.2).
1 mgee = 0.00981 m/s² (the ledger's own definition). Brachistochrone: `t = 2√(d/a)`, `Δv = a·t = 2√(d·a)`,
peak speed `Δv/2`. Radiometry: detection range `R = √(P / 4πF)` with the ledger's thresholds
F_naval = 10⁻¹⁶ W/m², F_civil = 10⁻¹⁴ W/m².

*Nightjar*'s outbound track (the spine of every Act I–III distance): torch at MET 10/03:00, 4 mgee,
73 days, turnover at MET 46/15. Path length `a·t²/4` = **2.609 AU**, Δv = `a·t` = **247.5 km/s**,
light-lag at arrival **21.70 min**. All three match §2.1/§2.2, so the model is right and the
deviations below are errors in individual scenes.

---

## 1. Act IX checkpoint: light-lag to Valhalla given as 71 and 69 minutes — CONFIRMED

`content/act-9/checkpoint.mdx:75`, `:87` — `lag="Valhalla, Callisto · 71 minutes one way"`
`content/act-9/checkpoint.mdx:135`, `:141` — `lag="Valhalla, Callisto · 69 minutes one way"`

**As written:** 71 min one way (MET 222), 69 min one way (MET 231).
**Correct:** **≈ 21.9 min** and **≈ 21.5 min**.

Working. §1.2 and §2.1 put the Jupiter–Ceres separation at 3.33 AU at MET 0 falling to the Epilogue
value by MET 305; interpolating, the separation at MET 222 is ≈ 2.63 AU and at MET 231 ≈ 2.59 AU.
2.63 × 8.317 = 21.9 min; 2.59 × 8.317 = 21.5 min. 71 minutes is 8.54 AU — more than the *maximum*
Jupiter–Ceres separation of 7.97 AU (5.20 + 2.77), so the figure is not merely wrong for this date, it
is unreachable at any date in the cycle.

This contradicts the same file three ways: the scene condensation at `:55` says "**Twenty-one minutes**
of spool" and "forty-three minutes after the burst reaches Valhalla" (a 21.5-min one-way), and
`docs/story-bible.md:604` fixes the transmission at "21 minutes". **Content layer at fault**; the
condensation is right and the four `lag` props are wrong.

## 2. §2.3 transit table: twelve of thirteen velocity entries are low by a factor of √2 — CONFIRMED

`docs/story-bible.md:85–90` (the "Distance × acceleration" table).

Every cell outside the 3.33 AU / 3 mgee cell gives `√2 · √(d·a)` — i.e. `Δv/√2`, which is neither the
delta-v nor the peak speed — because the Δv was computed with half the distance:
`2√((d/2)·a)` instead of `2√(d·a)`.

| Cell | As written | Correct Δv | (peak speed) |
|---|---|---|---|
| 0.1 AU, 3 mgee | 16.9 d · 30 km/s | 16.5 d · **42.0** | 21.0 |
| 0.1 AU, 10 mgee | 9.2 d · 54 | 9.04 d · **76.6** | 38.3 |
| 0.1 AU, 0.05 g | 4.1 d · 121 | 4.04 d · **171.3** | 85.7 |
| 0.1 AU, 0.3 g | 1.7 d · 297 | 1.65 d · **419.7** | 209.8 |
| 0.5 AU, 3 mgee | 37.7 d · 66 | 36.9 d · **93.8** | 46.9 |
| 0.5 AU, 10 mgee | 20.6 d · 121 | 20.21 d · **171.3** | 85.7 |
| 0.5 AU, 0.05 g | 9.2 d · 271 | 9.04 d · **383.1** | 191.5 |
| 0.5 AU, 0.3 g | 3.7 d · 664 | 3.69 d · **938.4** | 469.2 |
| 1 AU, 3 mgee | 52.2 d · 94 | 52.19 d · **132.7** | 66.4 |
| 1 AU, 10 mgee | 28.6 d · 171 | 28.58 d · **242.3** | 121.1 |
| 1 AU, 0.05 g | 12.7 d · 383 | 12.78 d · **541.8** | 270.9 |
| 1 AU, 0.3 g | 5.2 d · 938 | 5.22 d · **1327.0** | 663.5 |
| 3.33 AU, 3 mgee | 95.3 d · 242 (peak 121) | 95.2 d · 242.2 (peak 121.1) — **correct** | |
| 3.33 AU, 10 mgee | 52 d · 313 | 52.16 d · **442.1** | 221.0 |

The transit-time column is sound (≤ 2.5% rounding). **Ledger layer at fault, and only the ledger.**
Every prose and data-layer use of the brachistochrone is correct and was computed from the formula,
not the table: `src/instruments/act-2/data.ts:31` (`laneDeltaV = 2√(d·a)`) and `:36`
(`transitDays = 2√(d/a)`) are right; Act V's "0.4 AU, fifteen days at fifteen milligee, a hundred and
eighty-eight kilometres a second" (`content/act-5/checkpoint.mdx:49`) computes to 14.76 d and
187.7 km/s — exact; Act VII's "ten days at 10 mgee" to a tender 0.12 AU away computes to 9.90 d and
83.9 km/s; Act VII's "two point eight hours at three-tenths of a gravity puts thirty kilometres a
second under the keel" (`content/act-7/checkpoint.mdx:89`) computes to 29.7 km/s. Fix the table before
it is used; it is a loaded gun pointed at Book Two.

## 3. Purge detectability by civilian sensors: 2.6 million km should be 8.18 million km — CONFIRMED

`docs/story-bible.md:144`; `src/instruments/act-4/data.ts:125` (`PURGE_CIVILIAN_KM = 2.6e6`);
`src/instruments/act-8/data.ts:259` (`PURGE_CIVILIAN_LIMIT_KM = 2_600_000`).

The ledger's other three radiometric pairs are internally exact and all use the same 100:1 threshold
ratio between naval and civilian sensitivity, which makes the range ratio exactly 10:1:

- 0.29 TW freighter plume: naval R = √(2.9×10¹¹ / 4π·10⁻¹⁶) = 1.519 × 10¹³ m = **101.5 AU** (ledger: ~100 AU); civilian = **10.15 AU** (ledger: ~10 AU). Ratio 10 ✓
- Cold hull, 17.6 kW: naval = 3.742 × 10⁹ m = **3.74 million km** (ledger: 3.7); civilian = **374,000 km** (ledger: 370,000). Ratio 10 ✓
- Purge, 8.4 MW: naval = 8.176 × 10¹⁰ m = **0.547 AU** (ledger: 0.55 ✓); civilian = 8.176 × 10⁹ m = **8.18 million km**. Ledger says 2.6 million km. **Ratio 31.6 = √1000 ✗**

2.6 million km is what you get from an 8.4 MW source against a 10⁻¹³ W/m² threshold — a civilian
sensor ten times worse than the one used everywhere else in §2.5.

**This one is load-bearing for the plot.** `docs/story-bible.md:573` and the Act VIII approach rest on
"three purges on the way, the last ending MET 179/12, 4.5 million km out — beyond any civilian-grade
sensor, and Kettle's sensors are civilian-grade." At 4.5 million km an 8.4 MW purge delivers
8.4×10⁶ / (4π · (4.5×10⁹)²) = **3.30 × 10⁻¹⁴ W/m², 3.3 times the civilian threshold**. Kettle sees the
last purge, and *Nightjar* arrives expected. Either the ledger's purge-civilian figure moves to
8.2 million km (and the last purge must be pushed past ~9 million km, i.e. about 3.4 days earlier at
30 km/s), or the ship's radiators must dump at ≈ 0.85 MW while purging — which breaks the 2.6-hour
purge. **Ledger layer at fault; two data files inherit it.**

## 4. Kettle cannot be both 3.41 AU from the Sun and 0.14 AU off the Lane's Ceres end — CONFIRMED

`docs/story-bible.md:63`, `:775`; used in prose at `content/act-7/07-the-inference-brief.mdx:374`
("something at three point four one astronomical units") and `content/act-7/checkpoint.mdx:85`
("0.24 AU from a rock").

Working. Put Jupiter at (5.20, 0) AU and Ceres at 2.77 AU and −35° at MET 0; Ceres gains 47.9°/yr, so
at MET 100 Ceres is at relative longitude −21.9°, i.e. (2.570, −1.033), and the Lane is the chord
between them. Parameterise the chord by `s` (Mark 1 = 0, Mark 12 = 1); heliocentric radius along it is
`r²(s) = 27.04 − 27.352 s + 7.983 s²`. Then:

- Mark 9 (s = 0.875): **r = 2.98 AU**, 0.42 AU from Ceres (matches §2.1's Mark table ✓).
- Mark 9.4 (s = 0.906): **r = 2.97 AU**.
- The Lane only reaches r = 3.41 AU at **s = 0.711 — Mark 7.5, about 0.82 AU from Ceres.**

A body at 3.41 AU heliocentric is therefore **at least 0.44 AU** from Mark 9.4 (the radial difference
3.41 − 2.97), and cannot be 0.14 AU "off the Lane's Ceres end" at any longitude. The same arithmetic
kills Act VII's coast: *Halden Reach* sits 0.12 AU sunward of the Ceres approach, so a 0.24 AU run
cannot reach a 3.41 AU body either.

Correct figure: for the 0.14 AU offset and the 14-day/30 km/s coast to survive, **Kettle's heliocentric
radius must be ≈ 2.9–3.1 AU**, not 3.41. 3.41 AU is the number that appears in prose, so changing the
ledger to ~3.0 AU and leaving one prose line to fix is the cheaper repair. **Ledger layer at fault.**

Two consequences ride on this: §2.5's parasol arithmetic is quoted "at 3.4 AU, sunlight is 118 W/m²",
but the Act IV loiter happens at r ≈ 2.97 AU where sunlight is 1361/2.97² = **154 W/m²** and 600 m² of
dark hull absorbs **92 kW**, not 70 kW (SUSPECTED, since it depends on which way finding 4 is fixed);
and `content/act-4/01-random-or-not.mdx:103`'s "Nobody at Kettle sees you from 0.3 AU" should read
0.45 AU or more, which only makes the stealth case stronger.

## 5. The slug that kills Oyelaran cannot reach her — CONFIRMED

`src/instruments/act-8/data.ts:268–271` (`PATIENCE_RANGE_KM = 2_100`, `SLUG_SPEED_KMS = 3.5`,
`SLUG_FLIGHT_MIN = 2100/3.5/60 = 10.0`); prose at `content/act-8/02-forty-seconds.mdx:360`
("Forty millimetre at three and a half a second. Slug's inside ten") and
`content/act-8/03-loss-by-beneficiary.mdx:42`.

*Nightjar* is on a ballistic flyby at **30 km/s** relative to Kettle (`FLYBY_SPEED_KMS = 30`, and the
whole fourteen-minute lidar window is derived from it: half-chord √(40000² − 38000²) = 12,490 km,
2 × 12,490 / 30 = 833 s = 13.9 min — that calculation is correct). *Patience* is a cold picket at
Kettle; a tug that "cannot follow" an 0.3 g run is not comoving at 30 km/s.

A projectile fired from a stationary platform at a target crossing at 30 km/s must carry **at least
30 km/s of its own velocity in the cross-range direction**, at any lead angle. A 3.5 km/s slug has no
intercept solution at all. Worse, the straight-line reading the text invites — 2,100 km ÷ 3.5 km/s =
10 min — is a miss by 18,000 km, because that is how far *Nightjar* travels in those ten minutes.

Working for the fix. With a perpendicular stand-off `b` = 2,100 km and target speed 30 km/s, the
intercept time is `t = b / √(v² − 30²)`. To keep the ten-minute flight that the whole scene is built on,
**v_slug ≈ 30.2 km/s** (t = 605 s, slug path 18,122 km) — a near-tail-chase and dramatically the right
answer, since the round only barely runs the ship down. At 35 km/s the flight collapses to 116 s and
at 40 km/s to 80 s. Recommended: `SLUG_SPEED_KMS = 30.2` with the dialogue changed from "three and a
half a second" to "thirty a second", and Ferrier's line kept ("Slug's inside ten"). **Data layer at
fault, prose inherits.** The rest of the scene survives untouched: `COLD_DISPLACEMENT_M` =
½ (200 N / 3.2×10⁶ kg)(600 s)² = 11.25 m, "a sixth of the hull's length" ✓, and the 22-minute torch
light-off still loses the race.

## 6. Act III scene headers put *Nightjar* three times closer to Callisto than her own light-lag does — CONFIRMED

| File:line | As written | Correct |
|---|---|---|
| `content/act-3/01-who-was-asked.mdx:42`, `:176` (MET 54) | 0.61 AU from Callisto | **1.80 AU** |
| `content/act-3/02-drawing-the-sample.mdx:41`, `:214` (MET 57) | 0.68 AU | **1.96 AU** |
| `content/act-3/03-bias.mdx:47` (MET 59) | 0.70 AU | **2.05 AU** |
| `content/act-3/03-bias.mdx:67` (MET 61) | 0.74 AU | **2.15 AU** |
| `content/act-3/03-bias.mdx:228` (MET 70) | 0.79 AU | **2.46 AU** |
| `content/act-3/04-the-admiraltys-trial.mdx:66`, `:96`, `:247` (MET 72) | 0.81 AU | **2.50 AU** |
| `content/act-3/05-what-a-trial-can-say.mdx:45` (MET 74) | 0.84 AU | **2.53 AU** |
| `content/act-3/05-what-a-trial-can-say.mdx:98`, `:130` (MET 75) | 0.86 AU | **2.55 AU** |
| `content/act-3/05-what-a-trial-can-say.mdx:280` (MET 79) | 0.89 AU | **2.60 AU** |

Working: distance under the 4 mgee / 73-day profile from MET 10/03:00, accelerating to turnover at
MET 46/15 (peak 123.2 km/s) then braking. The run is 2.609 AU long end to end, and
`content/act-2/checkpoint.mdx:18` correctly labels turnover "1.3 AU from Callisto" — so by MET 54 the
ship can only be *further* than 1.3 AU, and 0.61 AU is on the wrong side of a figure the book already
states. The Act III values look like the pre-turnover ramp restarted at zero.

They also contradict the light-lag given in the same scenes, which is roughly right: 14 min 32 s at
MET 54 (true 14 min 58 s), 15 min 20 s at MET 57 (true 16 min 16 s), 19 min 52 s at MET 74 (true
21 min 04 s), 21.5 min at MET 80 (true 21.6 ✓). A reader who divides 14 min 32 s by 8.317 gets 1.75 AU
and reads 0.61 AU in the header of the same scene. **Content layer at fault; the lag figures are the
ones to keep.**

Related, same Act: `content/act-3/checkpoint.mdx:21` says "2.3 AU out" at MET 79 and `:43` says
"2.2 AU out" at MET 80 — low by 0.3 AU and **decreasing while the ship is still outbound**. Both
should read **2.60 AU**.

## 7. Jupiter–Ceres at 2.35 AU in the Epilogue is closer than the two bodies can get — CONFIRMED

`docs/story-bible.md:62` ("≈ 2.35 AU at MET ~305"), inherited by `:72` ("Epilogue 19.5 min").

With the ledger's own Sun–Jupiter = 5.20 AU and Sun–Ceres = 2.77 AU, the minimum possible separation
is **5.20 − 2.77 = 2.43 AU**, which §1.2 itself states ("swings between about 2.4 AU and 8 AU").
2.35 AU is below the floor.

Correct figure. At MET 0 the relative longitude is 35°, giving
√(5.20² + 2.77² − 2·5.20·2.77·cos 35°) = **3.334 AU** ✓ (exact agreement with the ledger's 3.33, so the
model is the ledger's own). After 305 days at 47.9°/yr the relative longitude is −5.0°, giving
**2.453 AU** — one-way light time **20.4 min**, not 19.5.

Same section, `docs/story-bible.md:29`: the separation cycle is given as "~5-year" but §2.1 gives
Ceres' gain on Jupiter as 47.9°/yr, which is a **7.5-year** synodic period (360/47.9). 7.5 years is
also what the real orbital periods give (1/(1/4.60 − 1/11.86) = 7.51 yr). The 5-year figure is wrong;
the 48°/yr figure is right.

Knock-on: the Epilogue's "seventy-one days from Ceres at 4 mgee" (`docs/story-bible.md:617`) covers
`a t²/4` = **2.468 AU** — which fits the corrected 2.45 AU separation better than the 2.35 it was
written against. Fixing the ledger improves the prose.

## 8. Eleven hours at 0.3 g spends 116.5 km/s and breaks the ledger's own rule — CONFIRMED

`content/act-8/03-loss-by-beneficiary.mdx:42` ("ran at a third of a gee for eleven hours"), `:58`;
`content/act-8/02-forty-seconds.mdx:391`; `docs/story-bible.md:581`.

Δv = 0.3 × 9.81 × 11 × 3600 = **116.5 km/s** — 22% of *Nightjar*'s full-tank 518 km/s, spent in one
burn to escape a salvage tug. It then has to be cancelled: she ends the burn at 30 + 116.5 =
**146.5 km/s** away from Kettle and must null all of it to make Ceres, so the escape costs **≈ 263 km/s
round trip, more than half a full tank**, and more than the entire 247 km/s Callisto-to-Mark-9 voyage.

This is precisely the thing §2.3 forbids: "**Nobody cruises at 0.3 g.** Tactical acceleration is for
minutes to hours (1 hour at 0.3 g = 10.6 km/s). It buys a dodge or an intercept, not a voyage."
Eleven hours is a voyage. One hour at 0.3 g gives 10.6 km/s — already more than a tug can answer, since
*Patience* is established as unable to follow at all.

Recommended: **one hour** (10.6 km/s), or ninety minutes (15.9 km/s). The scene loses nothing: the
wings are out and the ship is a beacon either way, and the eleven hours of weight on the crew can
become eleven hours of coasting with the radiators out.

Minor, same thread: at MET 181 `SHIP_MASS_T = 3_200` (`src/instruments/act-8/data.ts:279`) is the
*full wet* mass. After 247 km/s outbound, a Ceres refuel, 84 km/s to *Halden Reach* and 30 km/s of
coast burn, she is nearer 2,400 t, which makes the cold-gas displacement 15 m rather than 11.25 m.
Still "a sixth of the hull's length"; still hopeless. SUSPECTED, cosmetic.

## 9. The Prologue puts the ship in two places 46× apart, and neither is reachable — CONFIRMED

`content/act-0/03-tasking.mdx:24` — scene location "Jovian space · **0.9 light-seconds** from Valhalla",
condensation "arrives **forty-one seconds** out", and `lag="41 s"` at `:34`, `:38`, `:209`.
`docs/story-bible.md:425` backs the 41 s.

0.9 light-seconds = 270,000 km. 41 light-seconds = **12.29 million km**. The two differ by a factor of
45.6 in the same scene header.

41 light-seconds is not reachable. At MET 8 *Nightjar* has not lit her torch — the departure burn is
MET 10/03:00 (`docs/story-bible.md:427`), and the Prologue's three runs are cold and ballistic. 12.29
million km in 8 days is a mean speed of **17.8 km/s**, i.e. 17.8 km/s of delta-v she has not spent;
her cold thrusters (≤ 200 N on 3,200 t) give 0.043 km/s over the whole eight days.
0.9 light-seconds needs **0.39 km/s**, which a yard tug can plausibly impart at the slip.

Keep **0.9 light-seconds / 3 s**, or move the ship out under a short torch burn the Prologue does not
currently have. **Ledger and content both at fault** (the ledger's 41 s is the source).

Note on the shakedown itself (SUSPECTED): at 270,000 km, a cold *Nightjar* radiating 17.6 kW puts
1.9 × 10⁻¹¹ W/m² on a Callisto telescope — roughly 1,900× a naval-grade threshold. Callisto would have
her from hour zero, and the Prologue's "Callisto's telescopes find you at 61 h when the skin loop lags"
needs her far enough out that only the *warming* skin crosses threshold. For a 0.8 m-class naval
aperture that is ≈ 4–5 million km (13–17 light-seconds); for the much larger fixed observatory at
Valhalla it is further still. The scene works as written only if Valhalla's telescopes are treated as
far less capable than *Nightjar*'s own Eyes, which is the opposite of what §2.6 implies.

## 10. "A fifth of a per cent an hour" on Quiet — CONFIRMED

`content/act-4/01-random-or-not.mdx:101` and `:310`.

**As written:** Quiet fills the sink at about 0.2 %/h. **Correct: 0.88 %/h** — call it "nine-tenths of
a per cent an hour."

Working: Quiet is 190 kW (`PROFILE_LOAD_KW.quiet`), the sink holds 78 GJ. 190 kW × 3600 s = 0.684 GJ/h;
0.684 / 78 = **0.877 %/h**. `pctPerHour` in `src/instruments/act-4/data.ts:65` computes exactly this.
The sentence contradicts itself: it goes on to say "so Quiet runs {QUIET_MEASURED_HOURS} hours", and
108 hours implies 100/108 = 0.93 %/h, not 0.2 %/h — 0.2 %/h would be 500 hours. **Prose layer at
fault; the data is right.**

## 11. A Ceres-office transmission given a 19-minute lag from the Mark 9 region — CONFIRMED

`content/act-5/02-normal-revisited.mdx:53` and `:207` —
`lag="Register extract · Ceres office · … lag 19 min 04 s"`.

**As written:** 19 min 04 s. **Correct: ≈ 3 min 20 s** (3.5 min at the ledger's 0.42 AU).

Working. The same two scene headers in that module say "coasting cold in the Mark 9 region · 0.4 AU
from Ceres"; 0.4 × 8.317 = 3.33 min. §2.2 lists "Ceres ↔ *Nightjar*, Mark 9 region | **3.5 min**"
explicitly. 19 min 04 s is 2.29 AU — further than Callisto would be if the ship were at Ceres.
**Content layer at fault.**

## 12. The parasol is 400 m² where the ledger needs ≥ 600 m² — CONFIRMED

`content/act-4/01-random-or-not.mdx:94` ("Parasol out, four hundred square metres of it") vs
`docs/story-bible.md:133` ("600 m² of dark hull would otherwise absorb ~70 kW").

A parasol must shade at least the sun-side projected area it is protecting. 600 m² of hull behind a
400 m² screen leaves 200 m² in sunlight absorbing 200 × 118 = **23.6 kW** at 3.4 AU, or 200 × 154 =
**30.8 kW** at the Mark 9 region's true 2.97 AU (see finding 4) — a third to a half again on top of the
70 kW skin loop, which would cut Watch endurance from 67.7 h to about 54 h and break the Act IV ledger.
**Correct: 600 m² or more.** Content layer at fault.

## 13. "Twelve days" of heliocentric drift against a twenty-three-day loiter, in the same module — CONFIRMED (internal) / SUSPECTED (the orbital estimate)

`content/act-4/01-random-or-not.mdx:96` ("a heliocentric drift that holds the Mark 9 geometry for
**twelve days** without a gram of reaction mass") against `:101` ("**Twenty-three days**, Skipper. That
is the whole of it"), `:106`, and `content/act-4/checkpoint.mdx:29` ("Twenty-three days"). The ledger
(`docs/story-bible.md:489`) says twelve. The sink ledger (`src/instruments/act-4/data.ts`) runs
MET 83/11 → MET 106/00 = **22.5 days** with seven purges, so the Act is built on 23 and the drift
claim is the odd one out.

Why twelve is the physically defensible number. At Mark 9 the ship is at r ≈ 2.98 AU (finding 4), where
the circular period is 5.15 yr; Ceres at 2.77 AU has a 4.60 yr period. Over 23 days the two sweep
4.40° and 4.93° of true anomaly respectively — a relative drift of 0.53°, about **0.026 AU
(3.9 million km)** at that radius. Over twelve days it is 0.014 AU (2.0 million km). The loiter's own
close-pass band is 2.6 million km, so the geometry degrades out of usefulness at roughly the
twelve-day mark and is badly stale by day 23. Either shorten the loiter to the ledger's twelve days,
or give the Chief a station-keeping burn to account for — which is a better scene, because it is
delta-v she has to sign for.

## 14. Detection probability per close pass ignores range, and every pass is outside the stated civilian range — CONFIRMED

`src/instruments/act-4/data.ts:427` (`P_SEEN_PER_PASS_COLD = 0.02`), `:429`
(`P_SEEN_PER_PASS_PURGING = 0.6`), `:484` (`range_km: r.uniform(0.4, 2.6) × 1e6`), `:423`
(`CLOSE_PASS_KM = 2.6e6`).

Each close pass carries a `range_km` drawn uniformly over 0.4–2.6 million km, and then `pDetect`
**ignores it entirely**: 0.02 cold, 0.60 purging, flat. Against §2.5's civilian cold-detection range of
370,000 km, the flux from a 17.6 kW cold hull is:

| Range | Flux (W/m²) | × civilian threshold (10⁻¹⁴) |
|---|---|---|
| 370,000 km (ledger limit) | 1.02 × 10⁻¹⁴ | 1.02 |
| 400,000 km (nearest pass drawn) | 8.75 × 10⁻¹⁵ | 0.88 |
| 1,000,000 km | 1.40 × 10⁻¹⁵ | 0.14 |
| 2,600,000 km (furthest pass drawn) | 2.07 × 10⁻¹⁶ | 0.021 |

So 2% is a defensible number at the near edge of the band and absurd at the far edge, where the signal
is one-fiftieth of threshold — and the model prices them identically. Act IV's §2.4 note ("Detection is
coverage × sensitivity × integration time — which is why it is a probability, not a switch") licenses
a probability, but not a probability independent of the one variable the dataset records.

**Recommended:** make `pDetect` a function of range — e.g. `p = p₀ · min(1, (R₀/R)²)` with
R₀ = 370,000 km — or shrink `CLOSE_PASS_KM` to ~500,000 km so that a "close pass" means a pass that
could actually see her. **Data layer at fault.** The purging figure of 0.6 is sound: at 2.6 million km
an 8.4 MW purge is 9.9× the civilian threshold.

## 15. Act II scene headers drift 10–30% short of the ship's own track — CONFIRMED

| File:line | MET | As written | Correct |
|---|---|---|---|
| `content/act-2/01-cause-by-owner.mdx:85`, `:250` | 32 | 0.42 AU | **0.49 AU** |
| `content/act-2/02-inferred-mass.mdx:35`, `:171` | 32/10:20 | 0.46 AU | **0.49 AU** |
| `content/act-2/03-line-of-best-fit.mdx:45` | ~38 | 0.56 AU | **0.76 AU** |
| `content/act-2/04-the-nineteen.mdx:47` | ~40 | 0.66 AU | **0.87 AU** |
| `content/act-2/05-leverage.mdx:49` | ~44 | 0.86 AU | **1.12 AU** |
| `content/act-2/06-curvature.mdx:56` | ~46 | 1.14 AU | **1.26 AU** |
| `content/act-2/checkpoint.mdx:18` | 46/19 | 1.3 AU · turnover | **1.316 AU — correct** |

Act I's headers (0.005 → 0.39 AU, MET 12–30) are all within ~7% of the track and need no change; the
drift starts at MET 32 and closes again at turnover. `content/act-2/02-inferred-mass.mdx:37` pairs its
0.46 AU with "Callisto is **three minutes fifty** out", which is self-consistent with 0.46 AU but 29%
short of the true **4 min 03 s** at 0.487 AU. Act II's two checkpoint lags are right (twelve minutes at
MET 48, true 11.7; fourteen minutes at MET 52, true 13.9). **Content layer at fault.**

## 16. "Growing by about two seconds every hour" — CONFIRMED

`content/act-1/05-five-numbers.mdx:213`, MET 21/09:41.

**As written:** the one-way lag to Callisto grows ~2 s per hour. **Correct: 0.46 s per hour** (11 s per
day).

Working: lag growth rate = v/c. At MET 21.4 the ship has been under 4 mgee for 11.3 days, so
v = 0.03924 × 975,000 s = 38.2 km/s; 38,200 / 2.998×10⁸ = 1.27 × 10⁻⁴ s per second = **0.459 s/h**.
Two seconds an hour would need 167 km/s, more than her peak speed of 123 km/s at turnover. Suggested
line: "growing by about half a second an hour."

## 17. "Rising about sixteen seconds a day" — CONFIRMED

`content/act-3/01-who-was-asked.mdx:54`, MET 54/09:20.

**As written:** 16 s/day. **Correct: 28 s/day.**

Working: at MET 54 the ship is 7.8 days past turnover and braking, v = 123.2 − 0.03924 × 671,000 s =
**97.4 km/s**; 97,400 / 2.998 × 10⁸ × 86,400 = **28.1 s/day**. 16 s/day corresponds to 55.5 km/s, which
the ship does not reach until MET 68.

## 18. §2.3 diversion cost: "+31 km/s … That is 3.1% more propellant" — CONFIRMED (unit error)

`docs/story-bible.md:108`.

31 km/s of extra braking, loaded at Uruk High on top of a 242 km/s Lane burn at v_e = 1,000 km/s, costs

  Δfuel/m = e^(−242/1000) × 31/1000 = 0.785 × 0.031 = **0.0243 — 2.4% of departure mass.**

As a fraction of the fuel already aboard (f_lane = 0.215) that is **11.3% more propellant**, not 3.1%.
§7's "a fuel load about 3% above the Lane standard for the *declared* mass" is the correct framing and
the two sentences are describing the same thing in incompatible units. The Act IX slope confirms the
11% reading: 1.111 (extra Δv) × 1.06 (hidden mass) = **1.178**, which is the ≈ 1.17 fitted slope the
Act is built on. Recommended wording: "≈ +31 km/s, which is 2.4% of departure mass in extra propellant
— about a ninth again on top of the Lane standard."

The surrounding rocket-equation work is correct and should be left alone: f_lane(2.4) = 0.186,
f_lane(3.33) = 0.215, f_lane(8) = 0.313 all check exactly, as does Act IX's marginal fuel fraction
e^(−0.234)/1000 = 0.00079 (`src/instruments/act-9/data.ts:380` computes it hull by hull from the
correct derivative of `1 − e^(−Δv/v_e)`).

## 19. Kettle delta-v and Lane length are drawn as independent random numbers — CONFIRMED

`src/instruments/act-2/data.ts:242` (`laneLengthAU = r.uniform(2.4, 3.6)` / `uniform(3.6, 6.0)`),
`:245` (`dvKettle = r.uniform(24, 38)`), `:249` (departure date derived separately from the loss date).

Both quantities are determined by the same two-body geometry on the departure date: the Jupiter–Ceres
separation and the Mark-9.4-to-Kettle delta-v are smooth, periodic functions of the date with a
7.5-year period (finding 7). In the generated data they are **i.i.d. uniform and mutually independent**,
so two hulls departing a fortnight apart can be given Lane lengths of 2.5 and 3.5 AU and Kettle
delta-vs of 24 and 38 km/s. No orbital mechanics produces that.

This matters because Act IX's proof is explicitly *"the excess fuel tracks the Kettle Δv **for each
departure date**"* (`docs/story-bible.md:404`). A learner who plots `dvKettle` against `departureDate`
sees white noise where the in-world nav software must produce a curve, and the most natural hostile
question in the Act — "how would Uruk have known that number six years out?" — has no answer in the
data. **Data layer at fault.** Fix: derive both from the departure date through the relative-longitude
model in finding 7, with a small residual for plot and ephemeris error. The regression's slope and
t-statistic survive: the signal is in the excess-fuel construction at `:307`, which is correct.

## 20. Sink working-fluid temperature at hour 60 — SUSPECTED

`src/instruments/act-4/data.ts:745` (`SINK_TEMP = { mean: 240, sd: 9, units: '°C' }`), used in
`content/act-4/05-distribution-of-a-cold-run.mdx:109`, `:112`, `:204`.

The ledger's lithium enthalpy ladder (20 °C solid → ~250 °C liquid, 1.3 MJ/kg) checks out exactly:
c_p,solid 3.58 kJ/kg·K × 160.5 K = 575 kJ/kg; latent heat 432 kJ/kg; c_p,liquid 4.39 × 69.5 = 305 kJ/kg;
total **1,312 kJ/kg**, and 60 t × 1.312 MJ/kg = **78.7 GJ** ✓. Using that ladder to map fill to
temperature:

| Sink fill | Temperature |
|---|---|
| 88.6% (hour 60 of a run from empty) | **216 °C** |
| 91.3% (hour 60 of Act IV's window 2, which starts at 5.35%) | **224 °C** |
| 96.7% | 240 °C |

So 240 °C is the hour-63 figure, not the hour-60 one. More awkward: with SD 9 °C, "240 at hour sixty"
puts **13% probability above the 250 °C top of the usable range** at hour 60 of a profile the Chief
works to 64 hours — the sink would be saturating one run in eight well before her limit, which the Act
IV ledger (`ledgerIssues`, "the cellar never saturates") rules out. Marked SUSPECTED because the
percent-to-temperature mapping is stated nowhere; if the sink's 100% is defined as something below the
250 °C ceiling the figure can be rescued. Suggested: mean 224 °C, or state the mapping in §2.5.

## 21. Smaller items

- **Purge duration is fixed at 2.6 h regardless of how full the sink is.** `PURGE_HOURS = 2.6` is
  applied to every purge in `src/instruments/act-4/data.ts:178`, but the Act IV ledger purges from
  59%, 50%, 97%, 96%, 87%, 69% and 97%. 2.6 h is the *full*-purge figure (95% of 78 GJ ÷ 9,360 s =
  7.9 MW, matching the ledger's 8.4 MW wings at 620 K — 1,100 m² × σ × 620⁴ × ε0.91 = 8.39 MW ✓).
  A 50% purge dumps 35 GJ, which at 8.4 MW takes **1.2 h**, or 2.6 h with the wings run at 500 K.
  Pick one and say which; as written the ship is a beacon for twice as long as it needs to be on five
  of seven purges. CONFIRMED arithmetic, low severity — and the shorter purges are free stealth.
- **How bright a purge is, stated three ways.** `content/act-4/02-rules-of-chance.mdx:254` says "the
  brightest thing inside **half** an astronomical unit"; `content/act-4/04-independence.mdx:75` says
  "inside a **quarter** of an astronomical unit"; §2.5 says naval-grade at **0.55 AU**. Half is right.
  CONFIRMED, trivial.
- **`content/act-4/09-binomial-parameters.mdx:60`: "The bridge comes up eight degrees while the
  radiators are out."** Reads backwards — a purge is the ship *shedding* heat. It is defensible if the
  purge loop runs 240 °C lithium through plumbing that passes the bridge, but nothing says so, and the
  intuitive reading is that the author has heat flowing the wrong way. SUSPECTED; one clause of
  plumbing fixes it.
- **Act VIII coast: "fourteen days" is fifteen.** `content/act-7/checkpoint.mdx:85` undocks at
  MET 166/04:00 and burns 2.8 h; closest approach is MET 181/06:00 — **14.97 days** of coast, so the
  distance covered at 30 km/s is **0.259 AU**, not the stated 0.24 AU. CONFIRMED, trivial, and note
  that 0.24 AU is independently impossible under finding 4.
- **Act V's tank reading.** 518 − 247.5 = 270.5 km/s should remain after the outbound run, but
  `content/act-5/checkpoint.mdx:51` says "Two hundred and sixty-three kilometres a second in the
  tanks" at MET 118, and Act IV insists the loiter used "not a gram of reaction mass". The missing
  8 km/s is presumably the moves between loiter points (`content/act-4/06-the-heat-ledger.mdx:80`,
  "off the bundle by two hundred thousand kilometres"), which is plausible but never said. SUSPECTED;
  one line from the Chief closes it, and it is the same line finding 13 wants.
- The remaining Ceres-era lags all check out and need no change: 2.9 AU / 24 minutes at MET 133–140
  (true 2.90 AU, 24.1 min), 24 minutes at *Halden Reach* MET 152–165 (true 23.3–23.5), 22 minutes at
  Kettle MET 190–196 (true 22.5), 41 seconds in the Prologue *once finding 9 is settled*, 25 s each
  way to a freighter 0.05 AU off, 0.13 s to Kettle at 38,000 km, and "no lag" at 400 m.

---

## What was checked and found sound

Recorded only because a later pass should not re-derive it: the lithium sink's capacity, endurance
table and post-refit shortfall (78 GJ ÷ 190/320/670 kW = 114.0 / 67.7 / 32.3 h; 68 GJ gives 99.4 /
59.0 / 28.2 h; the 8.7-hour Watch loss matches the Chief's "nine hours, give or take one"); the
radiator area/temperature/purge-rate triangle; all four Lane mark-table entries; the Lane fuel
fraction and every rocket-equation figure in Acts II and IX; the inferred-mass mechanism (588 kN,
0.294 TW, 21,583 t from F/a, an 8% residual); the 14-minute lidar window at 38,000 km; the cold-gas
displacement; the 4 mgee outbound track's time, distance, delta-v and arrival lag; and the naval/civil
detection ranges for plumes and cold hulls.
