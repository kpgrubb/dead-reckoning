# Continuity review — Book One, all eleven Acts

Report only. No content was edited. Findings are ordered most severe first and each is marked
**CONFIRMED** (both conflicting places quoted, with file and line) or **SUSPECTED**.

Scope: every `<Scene stamp>` and MET reference in `content/act-0` … `content/act-10`, the Act
instrument datasets and their pinned tests, `docs/story-bible.md`, `docs/beat-sheet.md`,
`docs/curriculum-map.md`, `src/content/crew.ts`.

Counts: **19 CONFIRMED**, **6 SUSPECTED**, plus a documentation-drift schedule in §C.

---

## A. Timeline

### A1. CONFIRMED — the Ceres arrival clock breaks in half between `act-9/02` and `act-9/03`

The countdown to Ceres is stated eight times. Six of them resolve to **MET 215** and three to
**MET 234**, and the break falls exactly between Act IX module 02 and module 03.

The MET 215 clock:

- `content/act-8/03-loss-by-beneficiary.mdx:318` — scene stamp `MET 186/02:15`, location
  "`braking for Ceres at 5 mgee, wings out, twenty-nine days out`"; `:320` repeats it in prose:
  "Twenty-nine days to Ceres." → 215
- `content/act-8/04-dacres-stamp.mdx:454` — `MET 194/22:50`, "`braking at 5 mgee, three weeks from
  the Ceres approach`" → 215
- `content/act-8/04-dacres-stamp.mdx:492` — `MET 196/03:20`, "`braking at 5 mgee · Ceres in nineteen
  days`" → 215
- `content/act-9/01-the-slope-has-a-spread.mdx:75` — "two days of link time out of **eleven
  remaining before Ceres closes the geometry**" at `MET 204/07:20` → 215
- `content/act-9/02-one-tonne-per-tonne.mdx:292` — `MET 208/19:30`, "`Wardroom · five milligee for
  Ceres · seven days out`" → 215
- `docs/beat-sheet.md:174-175` (DS-21) — "`| 183 → 215 | Turn for Ceres … |`" and
  "`| 215–233 | Ceres; Halden Reach matches velocity in the approach (228); Inspectorate (231);
  refuel |`"

The MET 234 clock:

- `content/act-9/03-the-fuel-to-reach-kettle.mdx:368` — at `MET 213/09:15`: "Three weeks to Ceres."
  → 234
- `content/act-9/checkpoint.mdx:155` — at `MET 231/17:50`: "Three days to Ceres. Seventy-one from
  there to Callisto, and a hearing at the end of it." → 234, and 234 + 71 = 305
- `docs/story-bible.md:617` — "**MET 305** — seventy-one days from Ceres at 4 mgee. Adlinda Yards"

**Which is consistent with the rest of the book: MET 234.** Four independent reasons, none of which
depends on the disputed lines:

1. **Every Act IX scene from MET 204 to MET 231 is staged under way at five milligee.** The location
   strings read "`five milligee for Ceres`" at `act-9/01:49`, `01:280`, `02:75`, `02:292`, `03:88`,
   `03:336`, `04:77`, `04:301`, `checkpoint:27`, `checkpoint:55` and `checkpoint:131`. Under a MET
   215 arrival, the last five of those — MET 216, 217, 219, 228 and 231 — happen with the ship
   docked at Ceres. They do not read that way, and `checkpoint:93` is explicit: "`Bridge · matched
   velocity with CSV Halden Reach`". A tender does not *match velocity* with a hull alongside a
   berth.
2. **The Inspectorate boards afterwards.** `content/act-9/checkpoint.mdx:125`: "The cores are still
   in their racks when the Inspectorate's people come aboard **at Ceres**." That is after Achterberg's
   MET 231 transmission, so Ceres is still ahead at MET 231.
3. **The bible gives Act IX as MET 200–235** (`docs/story-bible.md:593`), which is an arrival at
   234/235 and leaves no room inside the Act for the eighteen-day Ceres stop DS-21 asserts
   (215 → 233).
4. **The physics forbids 215.** At `MET 181/06:24` *Nightjar* "runs at three tenths of a gravity …
   for eleven hours" (`content/act-8/02-forty-seconds.mdx:391`; DS-21 debits 117 km/s for it). At
   5 mgee — the acceleration every Act VIII and IX header states — killing 117 km/s alone takes
   **27.5 days**, i.e. to about MET 210, before she has covered a metre of the return. Arrival at
   215 is impossible; 234 is merely tight (see A2).

**Therefore the six MET 215 statements are what should change**, not modules 03/04/checkpoint. With
arrival at 234 the countdown becomes: MET 186 → 48 days; MET 194 → 40 days; MET 196 → 38 days;
MET 204 → 30 days; MET 208 → 26 days. DS-21's rows become `183 → 234` and `234 → 305`
(and `234–?` for the Ceres stop, which then has to shrink to nothing or the Epilogue's MET 305
moves).

Note that the user's framing — "the Epilogue's seventy-one days puts Ceres at MET 234" — is only
half the story: the Epilogue's 71 days is measured from **departure**, which DS-21 puts at 233, so
the Epilogue on its own is compatible with either date. What actually decides it is the five
under-way scenes at MET 216–231 and the 0.3 g escape burn.

### A2. CONFIRMED — the Act IX Δv budget does not fund the Act IX transit at either date

`docs/story-bible.md:597` ("**Pressure.** Delta-v: 118 km/s" at MET 203) and `docs/beat-sheet.md:174`
("`brake in at 5 mgee (≈ 252 total); ≈ 118 at MET 203`", column "`35 at Ceres`") cannot both hold with
the scene headers' five milligee:

- 5 mgee = 4.24 km/s per day. MET 204 → 234 is 30 days = **127 km/s**, more than the 118 she has.
- Spending the 252 km/s DS-21 debits over 183 → 215 (32 days) requires **9.3 mgee**, not 5.
- Spending 118 → 35 (83 km/s) at 5 mgee takes 19.6 days, landing at **MET 222.6** — neither 215
  nor 234.

Whatever date is adopted in A1, the 0.3 g eleven-hour run at MET 181 and the 5 mgee return are not
reconcilable with a 118 km/s budget. Either the escape burn shortens, the return acceleration rises,
or the Δv at MET 203 rises. Flagging for the Hard-SF reviewer; it is listed here because it is the
physical argument that settles A1.

### A3. CONFIRMED — `act-8/checkpoint` is stamped two days before the end of `act-8/04`, and shows Ebele holding a file that has not been sent

- `content/act-8/04-dacres-stamp.mdx:480` — `<Scene variant="transmission" stamp="MET 196/03:11 ·
  UNSCHEDULED" location="Uruk High · Bureau of Hulls · Senior Examiner O. Brandt, personal
  authority">` — Brandt sends the 900 fuel certifications.
- `content/act-8/checkpoint.mdx:22` — `<Scene stamp="MET 194/09:40" …>`, and `:48`
  `<Scene stamp="MET 194/14:05" …>`, in which `:64` reads
  `<Dialogue speaker="analyst" aside="He has Brandt's file open behind the log and has not opened
  the fuel column yet.">`

The checkpoint is read after module 04 but is stamped 38 hours before module 04's last two scenes,
and it has Brandt's file aboard **two days before Brandt sends it**.

### A4. CONFIRMED — Act III's distance-from-Callisto column runs backwards

Act II's scene headers advance correctly (computed from a 4 mgee brachistochrone):
`content/act-2/01-cause-by-owner.mdx:85` "`0.42 AU from Callisto`" (MET 31) →
`content/act-2/06-curvature.mdx:56` "`1.14 AU from Callisto`" (MET 44) →
`content/act-2/checkpoint.mdx:18` "`Bridge · 1.3 AU from Callisto · turnover`" (MET 46/19).

Act III then regresses and stays low for twelve scene headers:

- `content/act-3/01-who-was-asked.mdx:42` — `MET 54/09:20`, "`braking at 4 mgee · **0.61 AU from
  Callisto**`", whose own condensed line reads "Eight days past turnover"
- `content/act-3/02-drawing-the-sample.mdx:41` — 0.68 AU · `:214` — 0.68 AU
- `content/act-3/03-bias.mdx:47,67,228` — 0.70 / 0.74 / 0.79 AU
- `content/act-3/04-the-admiraltys-trial.mdx:66,96,247` — 0.81 AU
- `content/act-3/05-what-a-trial-can-say.mdx:45,98,130,280` — 0.84 / 0.86 / 0.86 / 0.89 AU

and then jumps by a factor of three inside the same Act:

- `content/act-3/checkpoint.mdx:21` — `MET 079/14:10`, "`Wardroom · **2.3 AU out**, braking at 4 mgee`"

The correct values on the Act I/II model are ≈1.78 AU at MET 54 rising to ≈2.5 AU at MET 79, which
is what the checkpoint and `docs/beat-sheet.md:170` ("`| 80 | Braking; Act III close | — | 21.5 min |`",
i.e. 2.59 AU) both say. The five module files are wrong; the checkpoint is right.

### A5. CONFIRMED — Valhalla's light-lag in `act-9/checkpoint` is three times canon, and contradicts the same scene's own prose

- `content/act-9/checkpoint.mdx:73` — "MET 222. The reply comes in **forty-three minutes** after the
  burst reaches Valhalla"
- `content/act-9/checkpoint.mdx:75` and `:87` — `<Dialogue speaker="ashbyhale" lag="Valhalla,
  Callisto · **71 minutes one way**">`
- `content/act-9/checkpoint.mdx:135` and `:141` — `lag="Valhalla, Callisto · **69 minutes one way**"`

Canon is `docs/story-bible.md:73` ("Callisto ↔ *Nightjar*, Mark 9 region | **21.6 min** | 43.2 min")
and `docs/beat-sheet.md:174-175` ("22 min", "21.8 min") at this MET. Forty-three minutes is the
*round trip* at 21.5 minutes each way, so the prose is right and all four `lag=` attributes are
wrong by a factor of ~3.2. Solberg is the light-lag literalist; this is the one number he cannot get
wrong.

### A6. CONFIRMED — MET 222 is three days later than "forty-three minutes after you send"

Both documents and the module agree the brief spools at MET 219:
`content/act-9/04-the-evidence-board.mdx:309` ("Solberg will spool at MET 219 and not a minute
earlier"), `content/act-9/checkpoint.mdx:55` ("Twenty-one minutes of spool at MET 219").
`content/act-9/checkpoint.mdx:73` then says the reply arrives "forty-three minutes after the burst
reaches Valhalla" — which puts it at MET 219, not MET 222. `docs/story-bible.md:605` has the same
error: "**MET 222** — Ashby-Hale, personally, 43 minutes after you send". Either the reply is
MET 219/11:55 or the 43 minutes is wrong.

### A7. CONFIRMED — `act-6/07` is stamped a day before `act-6/06`

Reading order is 06 → 07 → 08; the stamps run backwards:

- `content/act-6/06-errors-and-power.mdx:66` — `MET 140/01:20`; `:254` — `MET 140/05:50`
- `content/act-6/07-two-corridors.mdx:85` — `MET 139/11:05`; `:280` — `MET 139/19:40`
- `content/act-6/08-the-accusation.mdx:95` — `MET 140/06:40`

`docs/story-bible.md:539` puts beat 6 (Ferrante on the two errors, i.e. 6-06) at **MET 138**, before
6-07. The 6-06 stamps are the drifted pair and should move back to MET 138.

### A8. CONFIRMED — `act-3/checkpoint` runs 079 → 080 → 081 → 080

- `content/act-3/checkpoint.mdx:21` — `MET 079/14:10`
- `:43` — `MET 080/06:00`
- `:63` — `MET 081/09:14 · VALHALLA` (the Board's two-word reply)
- `:81` — `MET 080/22:40` (the Act's closing turn scene)

The closing scene is stamped 10h34m *before* the transmission that precedes it on the page.
Separately, `:21` at MET 079/14:10 is earlier than `content/act-3/05-what-a-trial-can-say.mdx:280`
(`MET 79/21:30`), which the learner reads first.

### A9. CONFIRMED — "aboard on the seventh" fits neither of the two arithmetics it sits between

- `content/act-9/01-the-slope-has-a-spread.mdx:291` (Solberg) — "I make it **forty-nine hours** of
  link … and the Ceres relay comes over the horizon for us at **MET 207** and stays. It will be
  aboard on the seventh."
- `content/act-9/03-the-fuel-to-reach-kettle.mdx:88` — at `MET 213/05:40`: "The relay archive came
  aboard **on the seventh** and Ebele has spent **four days** turning six weeks of state vectors per
  hull into nineteen masses"

The book's shorthand elsewhere drops the hundreds (`content/act-9/checkpoint.mdx:100`, Ostrow: "it
was issued **on the seventeenth**", at MET 228). On that convention "the seventh" is MET 207 — but
49 hours of link beginning at MET 207 ends at MET 209, and 207 + 4 days is 211, not 213. **"The
ninth" satisfies both.** Solberg is the character who reads timestamps back to the second; this is
his line twice.

### A10. CONFIRMED — the Prologue's checkpoint is stamped before the module it follows, and does not carry the turn the beat sheet specifies

- `content/act-0/03-tasking.mdx:220` — `<Scene stamp="MET 10/03:00" …>` the departure burn
- `content/act-0/checkpoint.mdx:14` — `<Scene stamp="MET 10/02:30" …>`, and the file ends at
  `<Checkpoint act="act-0" />` with no `PassGate` scene after it
- `docs/beat-sheet.md:191` — "It still ends on the departure burn: the `onPass` text is the torch
  lighting at **MET 10/03:00**."

As built, the torch lighting lives in module 03 and the checkpoint ends on Ferrier sliding a stylus
across a slate. The specified `onPass` turn does not exist.

### A11. SUSPECTED — a Ceres-office transmission arrives with a Valhalla-sized lag

`content/act-5/02-normal-revisited.mdx:53` — `lag="Register extract · **Ceres office** · received
MET 111/22:14, lag **19 min 04 s**"`. At MET 111 *Nightjar* is 0.42 AU from Ceres
(`docs/story-bible.md:74`: "Ceres ↔ *Nightjar*, Mark 9 region | **3.5 min**"). 19 min 04 s is 2.29 AU.
Defensible only if the extract was routed via Uruk or Valhalla, which the tag does not say.

### A12. SUSPECTED — MET stamp formats are mixed, including inside one Act

Two-digit in `act-0` (`MET 10/03:00`), `act-1` modules 01–02 (`MET 12/09:00`, `MET 13/08:40`),
`act-3` modules (`MET 54/09:20`) and `act-5`–`act-10`; three-digit from `act-1/03` onward
(`MET 015/07:40`), throughout `act-2`, and in `act-1/checkpoint` and `act-3/checkpoint`
(`MET 079/14:10`). `act-1` and `act-3` each switch format mid-Act. Cosmetic, but it is the most
visible thing on every scene header.

---

## B. The clue trail

The spine holds: each Act's revelation is reachable only through that Act's analysis, and the
Act-to-Act handoffs in §D are all statistical. Three places leak information the reader cannot have.

### B1. CONFIRMED — `act-8/02` hands the crew PROVIDENT's name and asset list 41 days early, and the four cover losses 13 days early

`content/act-8/02-forty-seconds.mdx:140-141`, at `MET 181/05:52`:

> `<Dialogue speaker="xo" aside="She has **PROVIDENT's asset list** open beside it and reads the two
> figures off the list rather than off the plot.">`
> Two branches and three ends. **PROVIDENT holds one tug and one depot on this side of the Belt, and
> the tug's four recorded kills were all Lane-side.**

Against:

- The four cover losses are identified at `content/act-8/04-dacres-stamp.mdx:454`, eleven days
  later: "`MET 194/22:50` … Ebele pulls the four hulls behind those findings: *Thessaly Ember*,
  *Kestrel Bough*, *Hygiea Promise*, *Long Fathom* … Ferrante … says they were not diverted."
  At MET 181 nobody aboard knows there *are* four kills, let alone that they were all Lane-side.
- The program's name and scope come from Ashby-Hale at MET 222 — except that
  `content/act-9/checkpoint.mdx:79` never uses the word: "What follows is eleven hundred words
  about an intercept in 2177 … eleven auxiliaries and a stockpile of cores". **"PROVIDENT" is never
  introduced to the crew anywhere in Book One.** It appears in content only at
  `act-8/02-forty-seconds.mdx:132,141` (MET 181) and in `act-10/01:130` and `act-10/02:35,51`
  (MET 319, 335), i.e. before it could be known and after, never at the moment it is learned.
- `docs/story-bible.md:575` frames the same tree without the leak: "Ebele's tree — a wrecker at
  Kettle at all, and on picket within slug range of the approach quarter".

The defect originates in the beat sheet: `docs/beat-sheet.md:136` (DS-17) writes the prior as
"P(a wrecker is at Kettle at all) = 0.75 (**PROVIDENT has one tug and one depot, and the tug's four
kills were all Lane-side**)". Fixing the module means re-deriving 0.75 from what the ship actually
has at MET 181 (eleven warm shapes docked and three standing off on the survey camera, the Register's
one unexplained wrecking pattern), and giving Ashby-Hale the word PROVIDENT at MET 222.

### B2. CONFIRMED — the tug *Patience* is named by the narration and by Rook's own log with no in-story identification

- `content/act-8/02-forty-seconds.mdx:346` is scrupulous — Solberg reports only "RF transient at
  06:01:44 ship time, bearing two-two-zero, range 2,100 kilometres. Single burst … It is inside the
  ship's own light-second." No transponder, no hull ID, no lidar return on the source.
- Forty-seven lines later, `:393`: "***Patience*** does not follow. A tug cannot."
- `content/act-8/03-loss-by-beneficiary.mdx:42`, in Rook's own log at `MET 183/04:10`: "***Patience***
  put a forty-millimetre slug through the mast blister at two thousand one hundred kilometres"

The name never enters the fiction. The bible (`:363`) keeps *Patience* and Vasque in the antagonist
layer, not in the crew's knowledge. Either the ship identifies the source — her lidar buffer took
fourteen returns at Kettle and three shapes were standing off — or both lines must say "the tug".

### B3. CONFIRMED — "Kettle" is named in narration 82 days before it reaches the ship

`content/act-4/01-random-or-not.mdx:104`, at MET 83/14, second person:

> "Nobody at **Kettle** sees you from 0.3 AU."

Kettle is found at `docs/story-bible.md:562` by Ebele's vector propagation in Act VII beat 7
(MET 165), and is first named in content in `content/act-7/07-the-inference-brief.mdx`. At MET 83 the
diversion has not even been witnessed (MET 104). The line should read "Nobody at the Ceres end" or
similar.

### B4. Earned reveals — no defect

Every other revelation is reachable from what the learner has just computed, and the big ones are
hedged correctly. Two worth recording as good practice because a fix elsewhere must not break them:
`content/act-1/07-how-hot-is-too-hot.mdx:220` plants Dacre's signature as data with "Nobody aboard
has any reason to note the name"; `content/act-8/02-forty-seconds.mdx:339` hedges the lidar list with
"Every name in that list **that the Register carries at all**, the Register carries as *unknown,
presumed lost*" — correct, because *Harpagia Sulcus* and *Marius Regio* are in-story diversions and
are not among the Register's 31.

---

## C. Documentation drift (confirmed and extended)

`docs/beat-sheet.md`'s module headers (§3) match the frontmatter `title` of every file on disk.
`docs/curriculum-map.md` does not. The drift is far wider than Act IX.

### C1. CONFIRMED — `docs/curriculum-map.md` filename column: 21 of 62 teaching modules are stale

| id | curriculum-map filename | actual file |
|---|---|---|
| act-1-04 | `content/act-1/04-center-and-spread.mdx` | `04-the-mean-in-the-gap.mdx` |
| act-1-06 | `content/act-1/06-two-fleets.mdx` | `06-lost-and-arrived.mdx` |
| act-1-07 | `content/act-1/07-the-normal-curve.mdx` | `07-how-hot-is-too-hot.mdx` |
| act-2-01 | `content/act-2/01-cross-tabulation.mdx` | `01-cause-by-owner.mdx` |
| act-2-02 | `content/act-2/02-burn-vs-mass.mdx` | `02-inferred-mass.mdx` |
| act-2-04 | `content/act-2/04-residuals.mdx` | `04-the-nineteen.mdx` |
| act-7-01 | `content/act-7/01-should-i-worry-about-error.mdx` | `01-twelve-is-a-margin.mdx` |
| act-7-03 | `content/act-7/03-testing-a-mean.mdx` | `03-within-a-day.mdx` |
| act-7-07 | `content/act-7/07-which-procedure.mdx` | `07-the-inference-brief.mdx` |
| act-8-01 | `content/act-8/01-are-my-results-unexpected.mdx` | `01-volatiles.mdx` |
| act-8-02 | `content/act-8/02-goodness-of-fit.mdx` | `02-forty-seconds.mdx` |
| act-8-03 | `content/act-8/03-two-way.mdx` | `03-loss-by-beneficiary.mdx` |
| act-8-04 | `content/act-8/04-independence.mdx` | `04-dacres-stamp.mdx` |
| act-9-01 | `content/act-9/01-do-those-points-align.mdx` | `01-the-slope-has-a-spread.mdx` |
| act-9-02 | `content/act-9/02-interval-for-the-slope.mdx` | `02-interval…` → `02-one-tonne-per-tonne.mdx` |
| act-9-03 | `content/act-9/03-testing-the-slope.mdx` | `03-the-fuel-to-reach-kettle.mdx` |
| act-9-04 | `content/act-9/04-selecting-the-procedure.mdx` | `04-the-evidence-board.mdx` |
| act-10-02 | `content/act-10/02-thread.mdx` | `02-provident.mdx` |

(`act-2-05`, `act-3-03`, `act-3-05`, `act-4-01`, `act-4-02`, `act-4-07`, `act-4-09`, `act-5-02`,
`act-6-04`, `act-6-05`, `act-6-06`, `act-6-07` have correct filenames but stale **titles** — see C2.)

### C2. CONFIRMED — `docs/curriculum-map.md` working titles: 19 are stale

The map's "working title" column against the on-disk frontmatter `title`:

| id | curriculum-map | on disk (and beat sheet) |
|---|---|---|
| act-1-04 | Center and Spread | The Mean in the Gap |
| act-1-06 | Two Fleets | Lost and Arrived |
| act-1-07 | The Normal Curve | How Hot Is Too Hot |
| act-2-01 | Cross-Tabulation | Cause by Owner |
| act-2-02 | Burn vs Mass | Inferred Mass |
| act-2-04 | Residuals | The Nineteen |
| act-2-05 | Leverage | The Bulk Hauler |
| act-2-06 | Curvature | Root Law |
| act-3-03 | Bias | Bored at Ceres |
| act-3-05 | What a Trial Can Say | The Escort Lottery |
| act-4-01 | Random or Not | Spring of '82 |
| act-4-02 | Rules of Chance | The Sweep Log |
| act-4-07 | Combining Systems | The Cellar's Margin |
| act-4-09 | Binomial Parameters | Thirty-One in Twenty-Six Hundred |
| act-5-02 | Normal, Revisited | One in Seven |
| act-6-04 | What the p-Value Means | At Least as Extreme |
| act-6-05 | Conclusion | Strike the Word |
| act-6-06 | Errors and Power | Paid in Hulls, Paid in People |
| **act-6-07** | **Two Corridors** | **Perrine and Everyone Else** |
| act-7-01 | Should I Worry About Error | Twelve Is a Margin |
| act-7-03 | Testing a Mean | Within a Day |
| act-7-07 | Which Procedure | The Inference Brief |
| act-8-01 | Are My Results Unexpected | Volatiles |
| act-8-02 | Goodness of Fit | Forty Seconds |
| act-8-03 | Two-Way | Loss by Beneficiary |
| act-8-04 | Independence | Dacre's Stamp |
| act-9-01 | Do Those Points Align | The Slope Has a Spread |
| act-9-02 | Interval for the Slope | One Tonne per Tonne |
| act-9-03 | Testing the Slope | The Fuel to Reach Kettle |
| act-9-04 | Selecting the Procedure | The Evidence Board |
| act-10-02 | Thread | Provident |

The `act-6-07` row is the one agents keep tripping over: the file is correctly named
`07-two-corridors.mdx`, but its title is "Perrine and Everyone Else" in both the frontmatter and
`docs/beat-sheet.md:772`, and the map's investigative-use note (`:472`) already describes the
Perrine-vs-other comparison, so only the title column is wrong.

Note also that the slug `two-corridors` now contradicts the module's own content: the
corridor-vs-corridor comparison was moved to `act-8-03/04` (`docs/curriculum-map.md:472`,
`docs/beat-sheet.md` decision 13), so the filename is the last trace of the old design.

### C3. CONFIRMED — both documents are missing two files that exist, and the module count is wrong

On disk: **62 teaching modules + 10 checkpoints = 72 files.**

- `content/act-0/00-standing-orders.mdx` (`id: act-0-00`, `kind: interlude`, title "Standing Orders")
  appears in **neither** `docs/curriculum-map.md` nor `docs/beat-sheet.md`.
- `content/act-0/checkpoint.mdx` (`id: act-0-checkpoint`, title "Release") is absent from
  `docs/curriculum-map.md`'s Act 0 table (`:48-52`, three rows, no checkpoint). It *is* in
  `docs/beat-sheet.md:191`, flagged as an amendment.
- `docs/curriculum-map.md:50` heads the section "### Act 0 — Prologue · "Shakedown" (**3 modules** ·
  60 min)"; there are five files.
- `docs/curriculum-map.md:699` — "**Grand total: 1,865 min = 31.1 h · 70 modules (61 teaching + 9
  checkpoints).**" Actual: 72 files, 62 teaching, 10 checkpoints.
- `docs/curriculum-map.md:39` — "`act-10-02` is the only `interlude`." `act-0-00` is also
  `kind: interlude`.

### C4. CONFIRMED — the story bible's Act VIII examiner numbers are the pre-change ones

- `docs/story-bible.md:583` — "Examiner × lost/not lost among Perrine departures: **Dacre signed 22
  of 900 and 17 of 19; expected 0.46**"
- `src/instruments/act-8/data.test.ts:170-183` — `expect(MANIFEST_N).toBe(412)`,
  `expect(DACRE_SIGNED).toBe(18)`, `expect(DACRE_DIVERTED).toBe(17)`,
  `expect(fmt(DACRE_DIVERTED_EXPECTED, 2)).toBe('0.83')`
- `content/act-8/04-dacres-stamp.mdx:120` — "the Bureau file that has been aboard since the outbound
  run: four hundred and twelve departures … **R. Dacre's name on eighteen of them**"
- `docs/beat-sheet.md:1246` records the change: "act-8-04 examiner data | Runs on DS-02's `examiner`
  (412: Dacre 18, 17 diverted; expected 0.83 < 5 …)"

**The module is right and the bible is stale.** Brandt's 900-record file does not reach the ship
until MET 196, eight days after the examiner table is run at MET 187; the 22-of-900 figure belongs to
Act IX (`src/instruments/act-9/data.test.ts:122` — `DACRE_SIGNED_900` = 22), where
`content/act-9/01-the-slope-has-a-spread.mdx:63` quotes it correctly.

### C5. CONFIRMED — `docs/beat-sheet.md` miscounts the Act IV purges

`docs/beat-sheet.md:177` lists seven purge starts (86/00, 88/06, 91/02, 95/12, 99/12, 102/15,
105/10) and then says "**Six purges** in 23 days". `src/instruments/act-4/data.ts:156` has seven
entries in `PURGE_STARTS` and `data.test.ts:133` pins `expect(PURGE_COUNT).toBe(7)`;
`content/act-4/01-random-or-not.mdx:101` renders `{fmtInt(PURGE_COUNT)}` = seven. The sentence is
wrong.

### C6. CONFIRMED — the bible's Act IV loiter is half its own length

`docs/story-bible.md:489` — "*Nightjar* kills her torch 0.42 AU from Ceres, on a heliocentric drift
that keeps her near the Mark 9 geometry for **twelve days**." The Act runs MET 83/11 → MET 106
(`src/instruments/act-4/data.ts:150,153`; `LOITER_DAYS` = 23), and `docs/beat-sheet.md:177` says
"Six purges in **23 days**".

### C7. CONFIRMED — `act-2/checkpoint`'s lag disagrees with DS-21

`content/act-2/checkpoint.mdx:88` (Solberg) — "Valhalla. **Twelve minutes out**, twelve back." at
MET 052. `docs/beat-sheet.md:169` — "`| 52 | 1.7 AU out (Act II close) | — | **14 min** |`".
1.7 AU × 8.317 = 14.1 min; twelve minutes is 1.44 AU. The scene header for that Act's turnover
(`:18`, "1.3 AU from Callisto") is correct, so the twelve is the outlier.

---

## D. The Act turns (plot constraint 5 / constraint 1)

All ten boundaries end on a turn whose answer requires the next Act's statistics. Deleting the
mathematics collapses the plot at every one of them. For the record:

| boundary | the turn | the statistics it makes necessary |
|---|---|---|
| 0 → I | `act-0/03-tasking.mdx:220` — the summary page's mean over 2,200 records of every severity; the records arrive at 02:50 | one-variable shape |
| I → II | `act-1/checkpoint.mdx:104` — "Two variables, not one." Ebele: thrust over mass against the Bureau's declared mass | regression and residuals |
| II → III | `act-2/checkpoint.mdx:111` — "The Board has answered a regression with a survey" | sampling design and bias |
| III → IV | `act-3/checkpoint.mdx:81` — "No survey puts eleven degrees and a plume vector on a memory" + the cellar's cost | probability, EV, binomial, geometric |
| IV → V | `act-4/checkpoint.mdx:81` — "One ship is an anecdote… what you do not have is the shape of ordinary" | sampling distributions |
| V → VI | `act-5/checkpoint.mdx:106` — "A hypothesis, stated before the arithmetic. A test with a name." | inference for proportions |
| VI → VII | `act-6/checkpoint.mdx:90` — "Your concern was a rate. The analysis is about means" | inference for means |
| VII → VIII | `act-7/checkpoint.mdx:103` — "What you do not have is a hull… Counts, and the categories they fall into" | chi-square |
| VIII → IX | `act-8/checkpoint.mdx:48` — "That is a line through nineteen points, and a slope with a standard error on it" | inference for slopes |
| IX → X | `act-9/checkpoint.mdx:152` — "the file holds no procedure that takes them as input" | the Bayesian seed |

**One qualification.** `docs/beat-sheet.md:203` writes act-0-01's own delete-the-math line as
"no later beat depends on this computation." The build order exempts the Prologue from assessed AP
content, so this is a declared exemption rather than a defect, but it is the one module in the book
where deleting the mathematics leaves the plot intact. The Prologue's turn is carried by act-0-03,
not by the Act 0 checkpoint (see A10).

---

## E. Crew voices and facts

Names, ranks and roles agree with `src/content/crew.ts` and `docs/story-bible.md` §4 throughout; the
only rank/name pairs used in content are `Captain Ostrow` ×15, `Lieutenant Oyelaran` ×3,
`Adjuster Renn` ×3, `Commodore Maalouf` ×2, `Commander Rook` ×2, `Captain Marsh` ×2 and one each of
`Vice Admiral Achterberg`, `Rear Admiral Ashby-Hale`, `Investigator Okafor-Reyes`, `Examiner Dacre`,
`Commander Lindqvist-Oduya`, `Captain Rook`. No further instance of the XO calling the learner
"Ensign" exists: all 60-odd "Ensign" addresses are to Ebele.

### E1. CONFIRMED — Ferrante uses the Chief's form of address

- `src/content/crew.ts:57` (engineer) — "Blunt in private, formal on deck; calls you **"Skipper"**
  when alone."; `docs/story-bible.md:198` — "Others call you *Captain* … or *sir*; **the Chief**
  calls you *Skipper* when no one else is on the deck."
- `content/act-10/01-consequences.mdx:208` — `<Dialogue speaker="medic">` … "She stands the whole
  watch, **Skipper**."

Sandoval uses "Skipper" 54 times; this is the only non-Sandoval instance in the book.

### E2. CONFIRMED — banned pattern #18 in `act-6/06`

`CLAUDE.md` #18: "A supporting character delivering a polished aphorism about Rook's inner state…
Give the character something to *do* and a fact to report."

`content/act-6/06-errors-and-power.mdx:236`, Ferrante:

> "That is defensible and **it is the choice I would expect from a man who has read the beneficiary
> column.** Put the reason in the brief in your own words, and do not let anybody call it the
> default."

The sentence is also #21 (it had landed at "defensible"). The alternative outcome at `:244` has a
milder version: "and you have paid for it in hulls you will never be able to count." Everything
Ferrante says before these two lines is exemplary — "Fifty-eight. That is four up on your last
standing pulse" (`:73`) is exactly the card. Only the two `<Outcome>` payoffs break it.

### E3. CONFIRMED — the Bureau is given a second name

- `content/act-1/07-how-hot-is-too-hot.mdx:220` — `location="**Bureau of Lane Certification** ·
  Uruk High …"`, and the body header at `:222`: "**BUREAU OF LANE CERTIFICATION** · URUK HIGH ·
  DEPARTURE CERTIFICATE (EXTRACT)"
- Canon, used everywhere else: `docs/story-bible.md:38` and `:765` "**Bureau of Hulls and Cargo**
  ("Hulls")"; `content/act-1/checkpoint.mdx:104`, `content/act-2/01-cause-by-owner.mdx:260`,
  `content/act-8/04-dacres-stamp.mdx:480,482`.

This is the reader's first sight of the agency whose stamp is the Act VIII and IX evidence.

### E4. SUSPECTED — Ferrier's address form wobbles twice in 55 uses

She addresses the learner as "Captain" 53 times, and then:
`content/act-5/01-why-the-reports-disagree.mdx:174` — "The last one is a number, **Commander**";
`content/act-10/01-consequences.mdx:171` — "**Sir.** Say the last part again with the population in
it, for the transcript." ("Sir" is Ebele's and Oyelaran's form; Ferrier's voice rule is "Uses your
rank in front of the crew".)

### E5. SUSPECTED — Ebele's address form wobbles twice in ~200 uses

`content/act-7/03-within-a-day.mdx:73` and `content/act-7/05-two-fleets-two-means.mdx:206` use
"Captain"; everywhere else he says "sir" (202 instances).

### E6. SUSPECTED — Ostrow courtesy-promotes the officer he is managing

`content/act-7/03-within-a-day.mdx:60` — "**Captain Rook.** The Board has completed its transit-time
analysis…" Ostrow's card (`src/content/crew.ts:114`) is "Correct, cordial, **always one rank above
you in the room**", and he uses "Commander" at `:85` and `:95`. "Captain" is defensible naval custom
for any CO, but it is the opposite of the characterisation, and from a serving CAPT it reads as
deference.

### E7. SUSPECTED — a new biographical detail for Ashby-Hale

`content/act-10/02-provident.mdx:51` — "read once by **a man who taught you gunnery**."
`docs/story-bible.md:336,356` has Ashby-Hale as Rook's CO on *Asgard* and Rook as a navigator by
trade. Harmless, but it is a fact about the protagonist's past invented in the last module.

---

## F. Dataset consistency across Acts

**This is the strongest part of the book and needs almost nothing.** The Act datasets are not
re-entered per Act; they are imported from one another, so the numbers cannot drift:
`src/instruments/act-5/data.ts:28-29` imports `nineteenProfiles` and the Register losses from Acts II
and I; `act-6/data.ts:45,57` imports from Acts I and V; `act-7/data.ts:57,69` from Acts II and V;
`act-8/data.ts:46-49` from Acts I, II, V and VI; `act-9/data.ts:39` from Act II.

Verified identical everywhere they are cited:

- **31 losses** — `act-1/data.test.ts:49` (`{unknown: 22, accident: 5, piracy: 4}`),
  `act-3/data.ts:815`, `act-4/data.test.ts:270,315`, `act-5/data.test.ts:66`,
  `act-6/data.test.ts:48`, `act-8/data.test.ts:74,153`.
- **2,612 transits** — `act-1/data.ts:478`, `act-4/data.test.ts:314`, `act-5/data.test.ts:57`
  (`LEDGER_N`), `act-6/data.test.ts:49`, `act-8/data.test.ts:111`.
- **The nineteen / 900 / 1,712 / 881** — `act-4/data.test.ts:316-317` (`[19, 881]`, `[12, 1700]`),
  `act-5/data.test.ts:68-69,96,154`, `act-6/data.test.ts:44-47`, `act-7/data.test.ts:152,190`,
  `act-8/data.test.ts:109-110`, `act-9/data.test.ts:62-66`. Act VII's nineteen are literally Act V's
  `divertedTransits`, which are Act II's `nineteenProfiles`.
- **412 departures** — `act-2/data.test.ts:85`, `act-8/data.test.ts:170`.
- **2,200 Register records** — `act-0/data.test.ts:118,207`, `act-1/data.test.ts:37`,
  `act-3/data.ts:816`.
- **Cargo mix 5/21/2/3 on 0.38/0.21/0.17/0.24** — `act-1/data.test.ts:100` and
  `act-8/data.test.ts:67-73` are the same array.
- **Refit set n = 12, nine of them among the nineteen** —
  `act-7/data.test.ts:55,59`; `content/act-7/04-before-and-after.mdx:319`.
- **Owner split** — Act I's `881 / 1095 / 605` arrived (`act-1/data.ts:484`) reconciles exactly with
  Act V's `{Perrine: 900, Mercantile: 1100, independent: 612}` (`act-5/data.ts:74`) given 19/5/7
  losses, and 900/2612 = 34.5% matches `docs/story-bible.md:43` ("34% of Lane transits").

The only dataset discrepancies found are C4 (bible vs module on Dacre) and the prose roundings
below, which are inside the "may round for prose" allowance but are worth a glance:

### F1. SUSPECTED — two prose roundings of pinned dataset values

`content/act-4/08-pings.mdx:312` — "thirty-one hulls in **two thousand six hundred** transits"
(2,612 elsewhere, e.g. `content/act-8/checkpoint.mdx:48` "two thousand six hundred and twelve").
`content/act-0/03-tasking.mdx:171` — "the Board's page describes **two thousand** incidents" (2,200).
Both are in dialogue and both are defensible as speech, but neither is pinned by a `data.test.ts`
assertion on that exact word form, which is what `CLAUDE.md`'s spelled-out-numbers rule asks for.

---

## G. Book One resolves; Book Two is seeded

### G1. The mystery resolves. The *case* does not get its disposition on the page.

The proof closes properly: `content/act-9/checkpoint.mdx:147-153` states the fourteen findings, the
fuel interval, the Kettle slope, and the limit sentence ("it does not establish who gave the order,
and it does not establish why"), and `content/act-10/01-consequences.mdx` re-audits all of it under
hostile review. That is Book One's argument, finished.

**CONFIRMED — but five of the bible's own Epilogue outcomes are nowhere in the content.**
`docs/story-bible.md:620-624` specifies MET 307 (Inspectorate; **Ashby-Hale resigns his commission**;
**Ostrow charged with four counts of conspiracy to murder**; **Dacre with fraud**; **Vasque at
large**; eighty-seven come home), MET 315 (**the Assembly votes to keep Kettle**; **Tharsis repaid**;
**the Provident Fund placed under Inspectorate trusteeship**) and MET 327 (**promotion**). The
Epilogue is two modules, at MET 319 and MET 335, and a grep of `content/act-10/` for `Ashby`,
`Ostrow`, `resign`, `charged`, `Assembly`, `Fund`, `pension` and `trustee` returns nothing but
`act-10/02:83`'s passing "the Assembly will want an answer inside the year". The last the reader
hears of Ostrow is Achterberg's MET 231 line that he "is relieved"
(`content/act-9/checkpoint.mdx:136`); Ashby-Hale's fate is never stated at all, and his last
appearance is "I did not ask."

The promotion is referred to but never shown — `content/act-10/02-provident.mdx:35` ("Eight days
after the promotion") and `:37` ("Eight days with four rings on the cuff"). Two or three paragraphs
in `act-10-01`'s closing scene would close the institutional story; as built, the book ends with the
antagonists' dispositions off-page.

### G2. CONFIRMED — two of the three Book Two hooks are not planted

`docs/story-bible.md:826-828` names three. Only the third is on the page.

1. **Vasque and *Patience*** — "Vasque" appears **nowhere in `content/`**. *Patience* appears twice,
   in Act VIII, and is never said to have escaped. The reader finishes Book One not knowing a wrecker
   is loose.
2. **Kettle, kept** — nothing in `content/act-10/` says what became of Kettle, the eleven auxiliaries
   or the stockpile. `act-10/02:51` refers to "eighty-seven in a depot for six years" in the past
   tense and stops there.
3. **The intercept** — fully and well planted. `content/act-10/02-provident.mdx:35,51,83` puts the
   2177 assessment and the new Phobos signature on the desk, computes P(hostile | signature) at both
   base rates (`src/instruments/act-10/data.test.ts:37-40`: 0.9 / 0.05 / 0.02 / 0.20), and Achterberg
   closes on the right question. It is seeded and **not** paid off — exactly as the contract requires.

---

## H. Fix order suggested

1. A1 (pick MET 234, change six places) and A2 (re-balance the Act IX Δv) together — they are one
   edit to DS-21 plus five prose countdowns.
2. B1 and B2 — remove PROVIDENT's name and asset list from MET 181, give the name to Ashby-Hale at
   MET 222, and de-name the tug in two places.
3. A3, A7, A8, A10 — four stamp reorderings; A3 also needs the "Brandt's file" aside moved.
4. A4 and A5 — twelve scene-header distances in Act III, four `lag=` attributes in Act IX.
5. C1–C7 — documentation only; C4 and C5 are documents disagreeing with correct code.
6. B3, E1, E2, E3, A6, A9 — single-line edits.
7. G1 and G2 — the only findings that need new prose rather than a correction.
