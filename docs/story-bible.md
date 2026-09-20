# DEAD RECKONING — Book One · Story Bible

Binding reference for every Act Team, the Showrunner, and the Continuity / Hard-SF auditors. Where this document and a module disagree, the module is wrong. Where this document and `CLAUDE.md` disagree, `CLAUDE.md` wins and this file gets fixed.

Conventions used here: **MET** = mission elapsed time from *Nightjar*'s departure from Adlinda Yards, written `MET 104/07:20` (day/hh:mm). Story epoch is **2184**. Ship's log entries are past tense; scenes are second person, present tense.

---

## 1. World

### 1.1 The map, 2184

A hundred and fifty-eight years after the first permanent settlement on Callisto, the solar system has four powers that matter and a great many places that do not.

**The Terrestrial Union (Earth–Luna).** Old money, old law, most of the people. The Union does not project force past Mars any more; it projects *insurance*. The Lunar Assurance Pool underwrites roughly a third of all deep-space hulls and can end a shipping line by declining to renew.

**The Martian Directorate.** The only power with a real navy: forty-odd warships, three of them heavy. Mars needs Jovian helium-3 for its fusion economy and buys it at prices it publicly calls extortionate. Every Compact officer over forty has sat through a staff college lecture titled *The Directorate Problem*. The lecture's conclusion never changes: if Mars decides it wants the Jovian system, the Compact cannot stop it — only make it expensive.

**The Ceres Mercantile Council ("the Mercantile").** The Belt's trading polity, run from Ceres. Not a state so much as a permanent negotiation among shipping houses, refineries and banks. The Mercantile owns the Belt end of the Lane and half the Lane Authority's board. It cares about throughput. Around it, scattered through the Belt, are the **Free Holds** — independent stations on minor bodies (Hygiea Hold, Davida Hold, Interamnia) that answer to nobody and sell salvage, fuel and discretion.

**The Galilean Compact ("the Compact").** Our faction. Formally the *Compact of Galilean Settlements*, chartered 2119: Ganymede (population 1.9 million, capital **Uruk**, dug into Uruk Sulcus), Callisto (740,000; the naval and industrial moon, lowest radiation, seat of the Admiralty Board at **Valhalla**, shipyards at **Adlinda**), and a scatter of stations at Europa's exclusion perimeter and the Jupiter atmospheric skimmer platforms. The Compact is small, rich in one thing (helium-3 and deuterium skimmed from Jupiter), and governed by an **Assembly** at Uruk that funds its navy grudgingly. Compact citizens call themselves *moonside*; inner-system people call them *Galileans* when polite and *skimmers* when not.

The Compact's founding argument, taught to schoolchildren: *We are kept independent by distance, by being useful, and by the Service.* The distance is shrinking every decade as drives improve. The usefulness depends on Mars not deciding to take the fuel instead of buying it. That leaves the Service.

### 1.2 The Hundred-Day Lane

Helium-3 leaves Jupiter for the Belt and the inner system along the **Jovian–Ceres Transit Lane** — universally *the Lane*, or *the Hundred-Day Lane* for the standard freighter passage. It is not a road. It is a managed *set of transfer geometries* between Jupiter and Ceres, re-plotted every thirty days as the two bodies move, with a mandated continuous-thrust profile (three milligee brachistochrone, turnover at midpoint), mandated transponder check-ins at twelve **marks** (Mark 1 departure … Mark 6 turnover … Mark 12 arrival), and a relay net of tracking satellites in heliocentric orbits that keeps the marks in line-of-sight. A ship on the Lane is *scheduled*: its position at any hour is predictable to a few hundred kilometres from the published profile.

The Lane opened in 2168. Because Ceres orbits faster than Jupiter, their separation swings between about 2.4 AU and 8 AU over a ~5-year cycle. Traffic concentrates in the **Close Season**, when the passage is shortest. The story takes place in a Close Season; the separation at MET 0 is 3.33 AU and shrinks to about 2.5 AU by the Epilogue.

**Outbound (Jupiter → Ceres):** helium-3 and deuterium (high value, low mass; the cargo the whole Lane exists for), ammonia and nitrogen volatiles (bulk, cheap, heavy), radiation-hardened electronics from Callisto. **Inbound (Ceres → Jupiter):** refined metals, machine parts, pharmaceuticals, people.

**Who does what on the Lane:**

| Institution | Seat | Function | Lean |
|---|---|---|---|
| **Lane Authority** (Jovian–Ceres Transit Lane Authority) | Ceres, with a Jovian office at Uruk | Plots the profile, runs the relay net, mandates transponders, logs check-ins, *classifies incidents* (accident / piracy / unknown) and publishes the Incident File | Board split Mercantile / Compact / insurers. The Uruk office is staffed by Compact secondees. |
| **Bureau of Hulls and Cargo** ("Hulls") | Uruk High (Ganymede orbital) | Compact civil agency. Certifies each departing hull's manifest, **declared mass**, **fuel load** and reactor output. Its stamp is what the insurers pay against. | Four Senior Examiners. Honest, under-staffed, proud. |
| **Compact Orbital Service** (the Service, COS) | Admiralty Board at Valhalla, Callisto | The navy. Eleven hulls: two aging Lane cutters (*Asgard*, *Tindr*), four missile boats, three tenders, one training hull, and *Nightjar*. Runs the Lane patrol and conducts searches when a hull goes missing. | The Board's **Directorate of Lane Operations** owns everything Lane-side. |
| **Service Inspectorate** | Valhalla | The Service's internal police; reports to the Assembly's Naval Committee, not to the Board. Small, slow, feared. | Vice Admiral Seren Achterberg. |
| **Tharsis Mutual** | Mars | Martian underwriting syndicate; insures most Compact-flag hulls on the Lane | Has paid out on 31 losses in six years and is threatening a 40% premium rise. |
| **Lunar Assurance Pool** | Luna | Underwrites Mercantile and independent hulls | Quiet, patient, litigious. |
| **Sulcus Freight** | Uruk | The Compact's flag carrier; 34% of Lane transits; hulls named for Ganymede's regiones and sulci | Majority-owned by **Perrine Holdings**, which is owned by the **Service Provident Fund** — the Service's own pension and benevolent fund. Every Compact officer's pension sits in it. |

### 1.3 The problem as officially stated

Thirty-one hulls have gone missing on the Lane since 2178. The Lane Authority's published finding, endorsed by the Admiralty Board: a mix of reactor casualties, debris strikes and piracy out of the Free Holds, at a loss rate "consistent with comparable deep-space corridors." The Assembly's Lane Committee, under pressure from Tharsis Mutual, has asked the Service for an independent naval assessment. The Board has sent its newest ship.

---

## 2. Hard-science ledger

The Hard-SF and Continuity auditors hold every module to these numbers. Modules may round for prose ("a bit under two days") but may not contradict. Derived quantities use the relations stated; if a module needs a number not here, compute it from these and add it to this table in the same pass.

### 2.1 Geometry at epoch

| Quantity | Value | Notes |
|---|---|---|
| Sun–Jupiter | 5.20 AU | |
| Sun–Ceres | 2.77 AU | |
| Ceres heliocentric longitude relative to Jupiter | −35° at MET 0 (Ceres trailing) | Ceres gains ~48°/yr on Jupiter, so it passes "behind" Jupiter to "ahead" during the story |
| Jupiter–Ceres separation | **3.33 AU** at MET 0 → **2.45 AU** at MET ~270 | Lane length. Close Season. |
| **Kettle** (the Cache; see §7) | Sun 3.41 AU; **0.14 AU** off the Lane's Ceres end at MET 100 | An invented 6-km C-type, provisional designation 2077 QK₄, named by the prospector who filed and abandoned it |
| Callisto ↔ *Nightjar* at Mark 9 region (Lane inner quarter) | ~2.6 AU | |
| Ceres ↔ *Nightjar* at Mark 9 region | ~0.42 AU | |

### 2.2 Light-lag (1 AU = 8.317 min)

| Path | One-way | Round trip |
|---|---|---|
| Jupiter ↔ Ceres (MET 0) | 27.7 min | 55.4 min |
| Jupiter ↔ Ceres (Epilogue) | 20.4 min | 40.8 min |
| Callisto ↔ *Nightjar*, Mark 9 region | **21.6 min** | 43.2 min + staff delay. A question to the Board and its answer take at least 45 minutes and, in practice, hours to days. |
| Ceres ↔ *Nightjar*, Mark 9 region | 3.5 min | 7 min |
| *Nightjar* ↔ a freighter 0.05 AU away | 25 s | 50 s. Conversation is possible, stilted. |
| *Nightjar* ↔ Kettle at 38,000 km | 0.13 s | Effectively real time |
| Earth ↔ Jupiter | 35–52 min | Earth is irrelevant to tactical time |

Writing rule: **comms counts the minutes out loud.** A reply that arrives "too fast" is a continuity defect.

### 2.3 Transit times and delta-v

Constant-acceleration brachistochrone (accelerate to midpoint, flip, decelerate): time `t = 2·√(d/a)`, delta-v `Δv = 2·√(d·a)`, peak speed `a·t/2`. 1 AU = 1.496 × 10¹¹ m; 1 g = 9.81 m/s²; 1 milligee (mgee) = 0.00981 m/s².

| Distance | 3 mgee (Lane standard) | 10 mgee (0.01 g) | 0.05 g | 0.3 g (tactical) |
|---|---|---|---|---|
| 0.1 AU | 16.9 d · 30 km/s | 9.2 d · 54 km/s | 4.1 d · 121 km/s | 1.7 d · 297 km/s |
| 0.5 AU | 37.7 d · 66 km/s | 20.6 d · 121 km/s | 9.2 d · 271 km/s | 3.7 d · 664 km/s |
| 1 AU | 52.2 d · 94 km/s | 28.6 d · 171 km/s | 12.7 d · 383 km/s | 5.2 d · 938 km/s |
| **3.33 AU (the Lane)** | **95.3 d · 242 km/s** (peak 121 km/s) | 52 d · 313 km/s | — | — |

Consequences the prose must respect:
- **Nobody cruises at 0.3 g.** Tactical acceleration is for minutes to hours (1 hour at 0.3 g = 10.6 km/s). It buys a dodge or an intercept, not a voyage.
- The Lane profile costs a freighter 242 km/s. With a 1,000 km/s exhaust, that is a 21.5% propellant fraction (rocket equation, `m₀/m₁ = e^(Δv/vₑ)`). **The Lane-standard fuel fraction is 0.215 of declared departure mass.** This ratio is the spine of Acts II and IX.
- A ship's position under the published profile is knowable to ~300 km. This is why a wrecker can hit a freighter with an unguided slug.

**Lane marks by time and distance** (τ = fraction of scheduled transit; distance fraction `s = 2τ²` before turnover, `1 − 2(1−τ)²` after):

| Mark | τ | Distance from Jupiter | Speed | Notes |
|---|---|---|---|---|
| 1 | 0 | 0 | 0 | Departure, Uruk High |
| 3 | 0.25 | 12.5% | 60 km/s | |
| 6 | 0.50 | 50% | 121 km/s | Turnover ("flip") |
| 9 | 0.75 | 87.5% (0.42 AU from Ceres) | 60 km/s | **Where the diversions happen** |
| 10 | 0.833 | 94.4% (0.19 AU from Ceres) | 40 km/s | Ceres approach; densest sky on the Lane |
| 12 | 1 | 100% | 0 | Arrival, Ceres |

**Diversion cost.** A freighter at Mark 9.4 (≈55 km/s, 0.35 AU from Ceres) that rotates its brake burn ~11° and continues braking off-profile can arrive at rest relative to Kettle instead of Ceres for **≈ +31 km/s** over the Lane standard. That is 3.1% more propellant. Its fuel must have been loaded at Uruk High. (Act IX.)

### 2.4 Drives and drive signatures

Fusion torches (D–³He, with some D–D) are the standard deep-space drive. Exhaust velocity 900–1,100 km/s. The Compact's **Adlinda Mk 3** (freighters) and **Mk 4** (*Nightjar*) are D–³He; Mercantile hulls mostly run the **Tessera** family.

A **drive signature** is a set of measurable quantities, not a mystical fingerprint:

| Measurable | How | Precision (naval-grade, 0.3 AU) |
|---|---|---|
| Plume power (W) | Bolometric flux × 4πR², with R from transponder/parallax | ±3% |
| Plume temperature / spectrum | IR spectrum; D–³He is cleaner (fewer neutrons, less bremsstrahlung X-ray) than D–D | classifies drive family |
| **Pulse rate** | Fusion torches pulse; each design has a characteristic frequency (Mk 3: 61 Hz; Mk 4: 88 Hz; Tessera-C: 40 Hz) | identifies drive model |
| Thrust vector | Plume geometry and Doppler | ±0.5° |
| Acceleration | From successive state vectors (transponder-derived on the Lane) | ±0.5% |
| **Inferred mass** | `m = F/a`, with F from drive model + plume power | **±3%** |

Example: a Sulcus-class hull, Mk 3 drive, 3.00 mgee profile, nominal 20,000 t. Thrust 588 kN, jet power ≈ 0.29 TW. If the plume reads 0.29 TW but the acceleration is 2.78 mgee, the inferred mass is 21,600 t — **8% heavier than declared**, a 2.7-SD residual. This is the Act II mechanism.

**Torches are not stealthy.** A 0.29 TW freighter plume is detectable by a naval telescope (in-band threshold ~10⁻¹⁶ W/m²) at ~100 AU and by civilian nav sensors (~10⁻¹⁴ W/m²) at ~10 AU. A thrusting ship is visible to everyone who is looking. *Nobody* is looking everywhere. Detection is coverage × sensitivity × integration time — which is why it is a probability, not a switch (Act IV).

### 2.5 *Nightjar*'s thermal budget — what "cold" means

A ship in sunlight, with people and computers inside, makes heat. In vacuum, heat leaves only by radiation, and anything warm radiates in the infrared. **Stealth is therefore a heat-storage problem**: how long can the hull swallow its own heat and hold its skin near the temperature of the sky?

*Nightjar*'s answer is a **60-tonne lithium heat sink** (usable 1.3 MJ/kg between 20 °C solid and ~250 °C liquid, including the latent heat of melting) — **≈ 78 GJ, 21.7 MWh** — plus a decoupled, multilayer-insulated outer skin held at **120 K** by cryocooler loops that pump skin heat inward into the sink, plus a deployable sun-side **parasol** (at 3.4 AU sunlight is 118 W/m²; 600 m² of dark hull would otherwise absorb ~70 kW).

Cold means: fusion torch off; reactor scrammed; power from the fuel-cell bank ("the cellars"); radiator wings folded into the hull; all waste heat into the lithium.

| Cold profile | Internal load | Skin loop | Total into sink | **Endurance (design)** | **After Act VII refit** |
|---|---|---|---|---|---|
| **Quiet** — life support, passive sensors, minimal computing | 120 kW | 70 kW | 190 kW | **114 h (4.8 d)** | 99 h |
| **Watch** — full passive suite, tracking and analysis | 250 kW | 70 kW | 320 kW | **68 h** | **59 h** |
| **Standby** — as Watch plus torch pre-heat and weapon capacitors charged | 600 kW | 70 kW | 670 kW | **32 h** | 28 h |

- Sink temperature is monitored as a percentage of capacity. The Chief speaks in **hours remaining ± the uncertainty of the load estimate** (subsystem loads are random variables; their sum has a variance — Act IV).
- **Purging** the sink requires deploying the radiator wings (1,100 m² at ~620 K, ~8.4 MW). A full purge takes **2.6 hours**, during which *Nightjar* is a beacon: detectable by naval sensors at ~0.55 AU and civilian ones at ~2.6 million km. Purge, or thrust, and you are seen. Everyone on board knows this.
- **Lighting the torch from cold takes four minutes.** A cold ship is a ballistic object, and its path is exactly predictable. This is the sentence that kills Dagny Oyelaran.
- The skin at 120 K still radiates ~17.6 kW. Detection ranges for cold *Nightjar*: naval-grade ~3.7 million km (0.025 AU); civilian ~370,000 km; nav radar (her faceted, absorbent hull has RCS ≈ 1 m²) under ~2,000 km. Cold is not invisible. Cold is *small*.

### 2.6 Sensors and ranges (summary)

| Sensor | Type | Practical figure |
|---|---|---|
| "The Eyes" — 4 × 0.8 m cooled IR telescopes | Passive | Torch plumes system-wide; cold hull at 3.7 million km; one-degree fields, so coverage is scheduled (sweeps) |
| Wide-field survey camera | Passive optical | Sunlit hulls to ~1 million km at 3.4 AU |
| Passive RF ("ears") | Passive | Transponders and comms leakage to ~0.5 AU |
| **Lidar** | **Active**, 2 kW | Hull-shape returns to ~50,000 km; unambiguous hull ID at <40,000 km with ≥30 s dwell. **Every receiver in the illuminated volume knows instantly.** |
| Nav radar | Active | Debris and docking; never used cold |

### 2.7 Ship's physics that prose must get right

- No sound in vacuum; strikes are felt through the frame, heard through the hull.
- Under thrust there is "down" (toward the drive). Cold and coasting, there is none; the crew is on tethers and the coffee is in bulbs.
- Accelerations of 3–5 mgee are *felt* as a faint lean, not as weight.
- Decompression: a 40 mm slug through a sensor blister kills by pressure loss in seconds; there is no fire in vacuum.
- Time signatures on every transmission. Comms reads them.

---

## 3. The ship

**CSV *Nightjar*** (Compact Service Vessel), hull number **CX-1**, *Nightjar*-class low-emission corvette, prototype and sole example. Laid down at Adlinda Yards 2179, commissioned 2183. Named for the bird that survives by sitting still and looking like the ground.

| | |
|---|---|
| Length / beam | 62 m / 14 m; faceted, radar-absorbent skin; no external protrusions when cold except the folding sensor mast |
| Dry mass | 1,800 t (of which 60 t lithium sink, 110 t radiator wings and plumbing) |
| Propellant | 1,400 t D–³He slush; **wet mass 3,200 t** |
| Drive | Adlinda Mk 4 torch, exhaust 900 km/s, pulse 88 Hz; **max 0.3 g** (tactical), economical cruise 3–10 mgee |
| Delta-v, full tanks | **510 km/s** (`900 × ln(3200/1800)`) |
| Power, cold | Fuel-cell bank, 700 kW peak |
| Sensors | The Eyes (4 × 0.8 m cooled IR), survey camera, passive RF, lidar, nav radar (§2.6) |
| Armament | 2 × 40 mm coilguns (kinetic); 8 × cold-launch interceptors. She is a picket, not a warship. |
| Crew | **16**: 7 officers, 9 ratings (3 engineering, 2 sensor techs, 1 comms tech, 1 medic's mate, 2 general) |
| Endurance | 200 days consumables; sink profiles per §2.5 |

**Why the Compact built her.** Compact doctrine is *see first, be unseen, then be somewhere else*. The Service cannot match Mars hull for hull; it can, in theory, park a cold picket in the Jovian approaches, cue the missile boats, and vanish. *Nightjar* is the proof that a hull can loiter cold for days and still fight. She was funded through the Adlinda Yards "radiator research" line — money that, as Act IX establishes, came from the Provident Fund, which is to say from PROVIDENT. The ship that exposes the program was bought by it.

**Her limits.** She cannot thrust and hide. She cannot hide for more than five days. She cannot chase a torch without lighting her own. Her delta-v is generous for a corvette and hopeless for a voyage — the Lane costs a freighter 242 km/s; *Nightjar* riding out to the Mark 9 region at 4 mgee spends 247 km/s and must refuel at Ceres under the Compact's consular contract. Every burn is a question about whether she can get home.

**Her interior.** Bridge (six stations, tactical plot forward), sensor bay aft of it with the mast root and the **blister** (a two-person pressurised observation and manual-lidar station at the mast head), engineering deck with the sink vault ("the cellar"), wardroom, twelve cabins and a sick bay with two beds. The ship is quiet cold: fans off, pumps on minimum, the lithium ticking as it expands.

---

## 4. Crew

Seven recurring officers plus the Board as a voice. Ranks are Service ranks. Voice rules are binding for `<Dialogue>`; the two sample lines show the register.

### 4.1 `you` — Commander Anselm Rook, CO
See §5. Never quoted directly except in orders and log entries. Others call you *Captain* (custom for any CO) or *sir*; the Chief calls you *Skipper* when no one else is on the deck.

### 4.2 `xo` — Lieutenant Commander Tamsin Ferrier, Executive Officer
41. Ganymede-born, navigator by trade, second-in-command of the cutter *Tindr* before *Nightjar*. Passed the Command Course top of her year; has never been given a hull. Wants: to be right, and then to be given a ship. Loyal to you in the way a good navigator is loyal to a chart — she checks it.

*Statistical role:* **the null hypothesis, embodied.** She asks what you would expect to see if you were wrong. She distrusts a pattern until someone has shown her what noise looks like.

Voice rules:
1. Short declaratives. She does not use "I think" — she says "the data says" or "we don't know."
2. Answers a question with the question's assumptions: "Assuming the file is complete."
3. Never raises her voice; when angry, gets more precise.
4. Uses your rank in front of the crew, your name never.
5. Her tell: "Say it back to me" when she wants a decision on the record.

> "One ship is an anecdote, Captain. Tell me what nineteen would look like if nothing were wrong, and then tell me why this isn't that."

> "I'll log the order. I want it noted I asked for the alternative."

### 4.3 `sensors` — Lieutenant Dagny Oyelaran, Sensor Officer
34. Callisto-born, daughter of a Valhalla telescope technician; grew up inside instruments. Best passive-sensor operator in the Service, and knows it. Wants the array to be perfect and treats a calibration as a personal promise. Her flaw is not arrogance; it is faith. A reading is a fact to her until it is proven otherwise, and she is impatient with people who will not act on facts.

*Statistical role:* **over-trusts instruments.** She reports a point estimate as a truth; she must be pushed to state an uncertainty. She learns, slowly, and the learning does not save her.

Voice rules:
1. Reports in the instrument's units first, then the meaning: "Plume 0.29 terawatt, 61 hertz. Mk 3. It's a Sulcus hull."
2. No hedging words unless ordered to hedge; then a flat "plus or minus three percent."
3. Calls the telescopes "the Eyes" and refers to them as a crew member.
4. Says "confirmed" for things that are not confirmed.
5. Gets quieter when the data gets stranger.

> "Contact's dark. Transponder stopped at Mark nine point four. The plume did not stop. It turned."

> "The refit array reads eleven degrees warmer than the Eyes on the same star. One of them is lying and I know which."

**Dies Act VIII, MET 181.** See §4.10.

### 4.4 `analyst` — Ensign Cassius "Cass" Ebele, Intelligence Analyst
23. Uruk, first posting. Assembly scholarship, statistics and signals; sharp, fast, and green. Wants to matter; quietly terrified of being the one who gets it wrong. He does get it wrong — samples the convenient ships, reads a mean as a truth, confuses a sampling distribution with a population — and he owns it every time, which is why you keep him.

*Statistical role:* **makes sampling errors and learns.** He is the learner's mirror: his mistakes are the ones the drills test.

Voice rules:
1. Talks fast, in complete sentences, with numbers in them.
2. Says "so" at the start of an explanation; you have told him to stop; he has not.
3. When corrected: "Yes, sir. That's — yes." Then fixes it.
4. Never blames the data.
5. By Act VII he has started asking "what's the sampling frame?" before anyone else does.

> "So the Authority survey is two hundred and twelve masters — but it's whoever answered a notice at the Ceres dock. It's not a sample of the Lane, it's a sample of who was bored at Ceres."

> "I pulled the mean. I shouldn't have pulled the mean. It's two piles, sir, and the mean is sitting in the gap between them."

### 4.5 `engineer` — Chief Petty Officer Marguerite Sandoval, Chief Engineer
57. Thirty-six years in the Service, twenty-two of them at Adlinda, where she was lead fitter on *Nightjar*'s sink. She knows the ship as a body. Wants the ship to come home; nothing else. Has buried shipmates and does not discuss it.

*Statistical role:* **speaks in margins of error.** Every number she gives has a plus-or-minus attached, and she is offended when people drop it.

Voice rules:
1. Never gives a number without its uncertainty: "Sixty-one hours, give or take four."
2. Uses "the cellar" for the sink, "the wings" for the radiators, "the lady" for the ship — sparingly.
3. Blunt with you in private; formal on the deck.
4. Speaks of heat as a debt: "We're borrowing at three hundred kilowatts."
5. Her tell: she goes silent and starts checking a gauge when she disagrees.

> "The book says sixty-eight hours on Watch. The book was written by people who weren't sitting on the cellar. Call it sixty-four, and if you go past sixty I'll want it in writing."

> "They didn't break the sink, Skipper. They shortened it. Nine hours, give or take one. That's not a fault. That's a decision."

### 4.6 `comms` — Lieutenant (junior grade) Kiran Solberg, Communications and Signals
29. Europa perimeter stations; a childhood of talking to people forty minutes away. Precise, literal, unhurried. Wants the log to be perfect. Counts light-lag out loud because someone has to.

*Statistical role:* **the timekeeper of independence.** He is the one who notices that two "independent" reports share a source, that a reply came too fast to be a reply, that the Board's timestamps are out of order.

Voice rules:
1. Every transmission is announced with its lag: "Board, Valhalla. Twenty-one minutes out. Timestamp is genuine."
2. Reads messages verbatim, then, if asked, gives his opinion in one sentence.
3. Does not use contractions on the deck.
4. Dry humour, rare, always about time.
5. Refers to the Board as "Valhalla."

> "Valhalla's reply is timestamped four minutes after our transmission arrived. Someone had the answer written before the question."

> "If we send now, the earliest anyone can have an opinion about it is 15:40. I would use the interval."

### 4.7 `medic` — Surgeon-Lieutenant Aldo Ferrante, Ship's Surgeon
47. Uruk General, then the Service because the Service paid his debts. Dry, observant, unimpressed by rank. Reads people the way Oyelaran reads hulls, and is right about them more often. Wants: not to lose anyone; failing that, to be honest about why.

*Statistical role:* **base rates and conditions.** He talks about what is *usual* in a population before he talks about the patient. He is also the one who says, after the loss, what the odds meant.

Voice rules:
1. Speaks in the second person to you when off the record: "You haven't slept."
2. Physical detail before judgement: notes hands, colour, breathing.
3. Never says "fine."
4. Answers moral questions with clinical ones.
5. Present at every death in the book. Says what happened, plainly, once.

> "Thirty percent is not small. You have sat in that chair for thirty years; you know what thirty percent feels like when it comes in."

> "She was conscious for about eight seconds. I don't say that to help. I say it because you'll ask, and you should have it from me."

### 4.8 `admiralty` — The Board (Admiralty Board, Valhalla)
Voice of the institution. Transmissions are drafted by staff, signed by the **Flag Secretary, Commodore Ines Maalouf**, and carry the Board's authority whether or not any admiral read them. Sometimes Rear Admiral Ashby-Hale signs personally; the register changes when he does (§6). Always at least 43 minutes away. Formal, delayed, evasive: acknowledges without answering; instructs without explaining.

Voice rules:
1. Passive voice and nominalisations: "It is noted that…" "The assessment is under review."
2. Never uses the word *loss*; uses *incident*.
3. Orders come as "The Board directs."
4. Praise is a warning.

> "The Board notes the commanding officer's observation regarding the distribution of incident marks and directs that observation continue within the assigned profile."

### 4.9 Additional recurring voices (new keys)

**`ashbyhale` — Rear Admiral Corvin Ashby-Hale**, Director of Lane Operations. §6. Speaks in the first person, warmly, as a man who taught you.
> "Anselm. You were always going to find it. I'd hoped you'd understand it when you did."

**`marsh` — Captain Yevgenia Marsh**, master of the independent hauler *Thessaly Dawn*. Her brother Piet was master of *Thessaly Ember*, one of the four cover losses. Belt-plain, profane, precise about her own ship and contemptuous of everyone's paperwork. Your window into the Lane's crews (Acts III, VI, VIII).
> "Your Authority told me my brother hit a rock. Then it told me he was pirated. It never told me which, and it never told me why the two Sulcus ships ahead of him that week got home."

**`brandt` — Senior Examiner Odile Brandt**, Bureau of Hulls and Cargo, Uruk High. Sixty, civil servant, keeper of the fuel certifications. Has suspected her colleague Dacre for two years and had no one to tell. Sends the Act IX records at professional cost.
> "The Bureau's stamp is the only thing on the Lane that isn't for sale, Commander. I would like that to still be true after you've read these."

### 4.10 The loss

**Lieutenant Dagny Oyelaran dies at MET 181/06:12, in the mast blister, when a 40 mm coilgun slug from the tug *Patience* takes the mast head off *Nightjar* at 38,000 km from Kettle.**

Why she is in the blister: the array installed at Halden Reach (Act VII) reads warm and she does not trust it; the Eyes are folded for the cold approach; the only instrument she trusts for the hull-ID lidar is the manual head in the blister. She asks to man it. You approve. That is the first decision.

Why the round comes: you order the lidar ping to identify the hulls at Kettle. You computed the odds in Act IV and refined them in Act VIII: a picket is likely somewhere; a 40-second dwell gives an unambiguous ID and roughly a thirty-percent chance the picket is positioned to respond before you can light the torch. You take it. That is the second decision. *Patience*, cold at 2,100 km off your quarter, has orders to fire only on active illumination. The slug takes ten minutes to arrive. Solberg reads the RF spike; Ebele plots the cone; the Chief cannot light the torch in under four minutes and the slug does not care. Ferrante is at the mast root when the blister goes. He tells you eight seconds.

Why it is not spectacle: no fire, no scream over the intercom, no last words. The frame rings once. The blister is gone. Her lidar returns — fourteen hull IDs — are already in the buffer. Act VIII's chi-square is run on her data. The narrative does not let the learner off: the odds were computed correctly, the decision was defensible, the outcome was in the thirty percent. "Thirty percent is not small."

Her body is not recovered. The Service records her as lost in the line of duty; the Board's first draft calls it an *incident*. You strike the word.

---

## 5. The protagonist

**Commander Anselm Rook**, 53. Born Valhalla, Callisto, son of a yard welder and a schoolteacher. Entered the Service at 19; 34 years. Navigator on the tenders; XO and then CO of the cutter *Asgard* on the Lane, 2172–2176, where his 2176 patrol report established the Lane's baseline loss rate (0.5%) that the Board now prefers to forget. Passed over for captain twice — the second time, he is fairly sure, because the report was inconvenient. Spent 2177–2183 at Adlinda as the Service's build liaison for *Nightjar*; knows her plumbing better than her doctrine. Given command of her in 2183 by Ashby-Hale, who was his CO on *Asgard* twenty years ago and whom he would have followed anywhere.

**What he believes.** That the Service is the only reason the Compact exists as anything but a Martian fuelling station. That chain of command is not a preference but the thing that makes a navy something other than a mob with ships. That an officer's job is to tell his superiors the truth in the form they can act on, and then to obey. That institutions are made of people and are therefore corruptible, and are still worth more than the people who corrupt them.

**Why he was given the ship.** He thinks: because he knows her. Ashby-Hale thinks: because Rook writes careful reports and careful men write the reports the Board needs. Both are true. Neither man understands the other's reason until Act IX.

**The arc.** Rook is not tempted to burn anything down. His temptation is the opposite — to accept the Board's account because the Board is the Board, to stop at the point where the numbers become an accusation against the people who made him. Each Act asks him to serve the institution by doing the one thing the institution's officers have stopped doing: look at the data honestly and put his name on it. He never goes around the chain. He goes *through* it, with a copy to the body that exists to police it, and he pays for it.

**What it costs.** His pension is in the Provident Fund. His mentor is the man he reports. His sensor officer is dead by a decision he made with the odds in front of him. And at the end, the Assembly keeps the Cache, quietly, because the threat was real; the Service absorbs its own crime; and he is promoted to captain of a ship he no longer entirely trusts himself to command. Institutionalists do not get clean endings. They get the institution, slightly better, and the bill.

**Rendering him.** Second person. He is never described from outside; the reader learns him through what he notices (gauges, hands, timestamps), what he refuses to say, and what he writes in the log. He is competent: the text never explains statistics *to* him — it frames the work as an old skill re-sharpened under pressure, something he did on *Asgard* twenty years ago and has let rust.

---

## 6. Antagonist structure

There is no villain who wants money. There is a faction inside the Service that decided, in 2177, that the Compact would lose a war it could not avoid, and that the Assembly would never pay to prevent it. They call the program **PROVIDENT**, after the fund that finances it. They are not wrong about the war. They are wrong about everything after that.

### 6.1 The layers

**The Board faction.** **Rear Admiral Corvin Ashby-Hale**, 61, Director of Lane Operations. Commanded *Asgard* when Rook was his XO. The most respected flag officer in the Service; the one the Assembly's Naval Committee trusts. Author of the staff-college lecture *The Directorate Problem*. In 2177 he obtained (he says) an intercept indicating the Martian Directorate was building lift for a Jovian expedition inside ten years. The Assembly's Naval Committee declined to fund a fleet on one intercept. Ashby-Hale built one anyway. Motive: institutional survival, sincerely held. Method: the Provident Fund buys Sulcus Freight through Perrine Holdings; selected Sulcus hulls carry undeclared dense cargo (reactor cores, coilgun barrels, missile bodies fabricated at Adlinda under the same "radiator research" line) out of the Jovian system as ballast; the hulls "vanish" and go to Kettle, where they are converted to auxiliaries; the insurance paid by Tharsis Mutual and the Lunar Pool to Perrine Holdings funds the next round. *Let Mars pay for the ships that stop Mars.* He has told himself he did not order the four cover losses. He did not ask.

**The operational layer.** **Captain Lucan Ostrow**, 49, Lane Liaison Officer — the Service's secondee to the Lane Authority's Uruk office. Runs PROVIDENT day to day: chooses hulls, times the diversions to the Ceres-approach traffic peak, controls which incidents the Uruk office classifies as *piracy* (the four cover losses — so the Lane has bodies and a story) and which as *unknown, presumed lost* (the diversions — so nobody investigates). Directs the cutters' searches so they look along the Lane and not off it. Hired the contractor. Ordered the four attritions in 2181–82 when an Authority analyst at Ceres began asking why Perrine hulls were over-represented in claims; the analyst was reassigned. Ostrow is the layer where the program crossed from fraud into murder, and he knows it, and he has decided that the war will make it retrospectively necessary. He comes out to Halden Reach in Act VII to manage you personally.

**The field layer.**
- **Senior Examiner Reinholt Dacre**, Bureau of Hulls, certifies the diverted hulls' manifests and fuel loads. He signs 22 of 900 Perrine departures and 17 of the 19 diverted ones. His signature is in the data (Act VIII).
- The **Sulcus masters and crews** of the nineteen hulls: Compact citizens, many ex-Service, sworn into PROVIDENT at Kettle. Some volunteered. Some found out at Mark 9 and were given a choice that was not one. Their families were told they were lost; the Provident Fund pays the pensions. Eighty-seven people are at Kettle at MET 181.
- **Jory Vasque**, master of the Davida-registered salvage tug *Patience*, PROVIDENT's picket and wrecker. A coilgun for "debris clearance." Four hulls, twenty-three dead, on Ostrow's contract. Escapes at the end of Act VIII. Book Two.
- **Commander Petra Lindqvist-Oduya**, CO of the tender *Halden Reach*. Not in the faction; follows Ostrow's orders because he outranks her, until Act IX, when she reads your regression and does not.

### 6.2 Why their tradecraft is statistically discoverable

Every layer of PROVIDENT was designed to survive *a search*, not *a distribution*. The Lane's official data (transponder marks, incident classifications, claims register, Bureau certifications) was never falsified — it was *ignored*, because the people who would have read it were the people running the program. The traces:

| What they did | Where it shows | Act |
|---|---|---|
| Diverted at the same point (Mark 9–10, in the Ceres-approach crowd) | Mark-at-last-contact is bimodal, not uniform | I |
| Faded transponders over hours (a "failing unit" story) vs. the cover losses' abrupt silence | Time-to-silence has two clusters | I |
| Loaded dense undeclared cargo | Inferred mass exceeds declared; positive residuals for 19 hulls | II |
| Sold the piracy story through a dock survey and an announced convoy | Voluntary-response bias; confounded design | III |
| Diverted where the sky is crowded | A cold picket at Mark 9 sees one | IV |
| Compared the Lane to a worse corridor | Baseline choice; sampling variability of small counts | V |
| Perrine as beneficiary on every diverted hull | Two-proportion test: Perrine hulls lost at 2.1% vs 0.7% | VI |
| Uprated drives for extra mass (the Adlinda Refit set); shortened your sink | t-interval on post-refit reactor output vs spec; paired t on the same hulls' transit times before/after uprate; two-sample t lost vs surviving Perrine hulls | VII |
| Declared the ballast as "volatiles"; classified at Uruk; Dacre's stamp | Chi-square GOF and independence | VIII |
| **Fuelled the diversion at Uruk High before departure** | Slope of fuel vs. mass for diverted hulls exceeds the Lane standard; excess fuel tracks the Kettle Δv for each departure date | IX |

---

## 7. The hidden truth

Between 2178 and 2184, nineteen Sulcus Freight hulls departed Uruk High on the Lane carrying, in their trim-ballast tanks, undeclared military hardware fabricated at Adlinda Yards — reactor cores, coilgun barrels, interceptor bodies — declared on their manifests as bulk ammonia and water. Senior Examiner Dacre certified the manifests and a fuel load about 3% above the Lane standard for the *declared* mass: enough to carry the hidden mass and to divert. Each hull flew the Lane normally to turnover and into the braking phase. Between Mark 9 and Mark 10, in the densest traffic on the Lane, each rotated its brake plume about eleven degrees off-profile, let its transponder "degrade" over several hours in a way the Uruk office would later record as a failing unit, and finished its braking burn not at Ceres but at rest relative to **Kettle**, a six-kilometre carbonaceous body 0.14 AU off the Lane's Ceres end that a prospector had filed and abandoned in 2077. No one saw the plumes turn because no one at the Ceres end records the vectors of a hundred plumes a week, and the Compact cutters that searched were directed by Captain Ostrow to search *along* the Lane. At Kettle the hulls were stripped of their cargo, refitted as auxiliaries, and crewed by the same masters and crews, sworn to the program under the Service's oath; their families received the Provident Fund's pension and a line in the Incident File reading *unknown, presumed lost*. Tharsis Mutual and the Lunar Assurance Pool paid Perrine Holdings — the Provident Fund's shell — full hull and cargo value on each, and the money bought the next hull's cargo. Four independent hulls with no link to Perrine were destroyed by the tug *Patience* between 2181 and 2182 on Ostrow's contract, classified *piracy* by the Uruk office, so that the Lane's losses would have bodies, a story, and a mix of owners. Twenty-three people died in them. The program's author, Rear Admiral Ashby-Hale, believes the Martian Directorate will move on the Jovian system within the decade and that the Assembly will not fund its defence; he has built, at Kettle, a fleet of eleven armed auxiliaries and a stockpile of cores, paid for by Martian insurers, to meet it. He sent *Nightjar* to the Lane to produce a naval report confirming piracy and justifying a patrol budget, commanded by an officer he trusted to write it. Everything he did left a trace in a distribution.

### 7.1 The clue trail

Rule of the book: *delete the math and the plot no longer works.* Each Act's revelation is available **only** through the analysis named. The right-hand columns are the contract with the Curriculum Architect.

| Act | AP unit | Dataset the learner gets | Analysis performed (primary method) | What it reveals | What it does NOT yet prove | Decision it forces |
|---|---|---|---|---|---|---|
| **Prologue** | — | Shakedown telemetry: sink temperature vs. time on three cold runs | Reading ship displays; the sink as a resource (no AP content assessed) | What "cold" costs; the crew; why the ship exists | — | Accept the Lane tasking as written, or query it (flavour) |
| **I** | 1 · One-variable data | The Lane Authority Incident File: 31 losses × {mark at last contact, time-to-silence, hull age, declared cargo value, classification}; class table of drive signatures for *Nightjar*'s first Lane contacts | Dotplots/histograms/boxplots; shape–centre–spread; comparing distributions (lost vs. all transits); z-scores against the class table; percentiles; identifying outliers | Mark-at-last-contact for the 31 is not spread along the Lane — a cluster at Mark 9–10; time-to-silence is bimodal (abrupt < 1 min vs. gradual 3–9 h): **two processes**. The Board's summary used a mean (7.1) that describes neither. | That either process is anything but two kinds of accident | Flag the bimodality to Valhalla now, or hold until you have more (Board replies "noted" either way; flavour) |
| **II** | 2 · Two-variable data | 412 departures (Bureau sample): declared mass, fuel loaded, drive model; beacon-derived acceleration at Mark 2 → inferred mass | Scatterplot, r, LSRL of inferred mass on declared mass; residual plot; interpreting slope/intercept; influential points; log transform for the fuel–mass relation | 19 of the 31 lost hulls have residuals +6–9% (heavier than declared) — **falsified manifests on a subset**; the other 12 scatter normally | Who falsified; why; where the hulls went | Report the residuals up the chain (you do; the Board's reply cites a survey and an experiment → Act III) |
| **III** | 3 · Collecting data | The Authority's crew survey (voluntary response, n = 212 at Ceres docks, 94% "piracy"); the Board's announced-escort "experiment"; the Lane transit schedule as a sampling frame | Identify sampling bias (voluntary response, nonresponse, wording); design an SRS / stratified sample of masters by owner class via tight-beam; identify confounding and lack of control in the escort experiment; design a randomised, unannounced version | Properly sampled, 31% of independent masters believe piracy; 6 of 40 report Sulcus hulls "turning late"; the escort experiment could not have found anything; classification is coming from Uruk | Anything about where the hulls go | Choose the sampling design (cost in transmission time vs. precision); include or exclude Sulcus masters (nonresponse risk) |
| **IV** | 4 · Probability & distributions | Sink endurance tables with load uncertainties; Lane arrival rates at Mark 9 (1.2 transits/day; 0.41 Perrine/day); a detection model (P(sweep covers you per hour) by range) | Probability rules; conditional probability; binomial (Perrine hulls in a 68-h window; sensor sweeps that catch you); geometric (wait to first Perrine hull); expected value of three loiter points; normal model for sink margin; mean/variance of a sum of subsystem loads | **You witness one**: MV *Marius Regio* goes transponder-dark at Mark 9.4 at MET 104/03:50, rotates its plume 11°, keeps braking off-profile. You cold-track it 30 h. | That this is not one crooked crew; that it went anywhere in particular | Where to loiter (EV vs. sink cost); whether to break cold and follow (you do not) |
| **V** | 5 · Sampling distributions | Cutter reports (*Asgard* 3/410, *Tindr* 0/380); the Board's baseline (Mars–Belt corridor 1.1%) vs. your own 2176 baseline (0.5%); the 19 heavy hulls' marks | Sampling distribution of p̂ and x̄; CLT machine; simulate patrol windows under each baseline; z for a sample mean (mean mark of the 19 = 9.3 vs. 6.5 under "anywhere," SE 0.79) | Cutter disagreement is expected variation — no conspiracy needed to explain *that*; the Lane's overall rate looks unremarkable under the Board's baseline and extreme under yours; the 19's mark clustering is 3.5 SE out | Formal test; who the 19 belong to | Which baseline to adopt in your report; go to Ceres for the claims register (fuel + evidence) or hold station |
| **VI** | 6 · Inference for proportions | The Authority's claims register (beneficiary of each lost hull's policy); transit counts by beneficiary class (Perrine 900; other 1,712) | One-proportion z-interval and z-test vs. 0.005; **two-proportion z-test Perrine 19/900 vs. other 12/1,712** (z ≈ 3.2, p ≈ 0.0008); conditions; Type I/II errors, power — the cost of a false accusation vs. a missed one | Perrine-beneficiary hulls are lost at three times the rate of everyone else; chance is not a credible explanation. **First formal accusation.** | That anyone in the Service knows; that the hulls survive; intent | To whom to send it: Board / Inspectorate / Assembly / Authority (all reach Ashby-Hale at different lags; flavour) |
| **VII** | 7 · Inference for means | The **Refit set** (Adlinda uprate logs: 12 Sulcus hulls, post-refit certified reactor output, time-to-Mark-9 on the run before and after); time-to-Mark-9 for Perrine lost vs surviving hulls; *Nightjar*'s own sink endurance on 8 matched profiles before/after the Halden Reach refit (narrative, drill context) | t distribution and t-interval (12 hulls' output 4.1% above spec); one-sample t (the 19's time-to-Mark-9 vs the profile mean); **paired t** on the Refit set (1.9 days slower after uprate); two-sample t-interval and test (lost vs surviving Perrine); the Board's pooled "exoneration" dismantled; procedure selection and bootstrap check | The diverted hulls were *prepared*; your own tender has shortened your leash; Ostrow is aboard | Where the hulls went; whether they exist; who signs | Accept the refit (doctrine) or refuse; proceed to Kettle with a degraded sink |
| **VIII** | 8 · Chi-square | Oyelaran's lidar returns (14 of 19 hulls identified at Kettle); declared cargo categories of the 31 vs. the Lane mix; loss × beneficiary across 2,612 transits; cause code by corridor (Lane vs Mars–Belt); classification × investigating office; examiner × lost/not lost among Perrine departures | **χ² goodness-of-fit** (lost hulls over-declare "volatiles"); **χ² independence** (loss is not independent of beneficiary; the driving cell is *Perrine, lost*); **χ² homogeneity** (the Lane's cause-code mix differs from the Mars–Belt corridor's); supplementary tables: classification depends on office; Dacre's stamp over-represented | The lost hulls are at Kettle; the classifications were manufactured at Uruk; Dacre's stamp; the four "piracy" losses are the only non-Perrine hulls Uruk classified — the cover losses | Premeditation at departure (the hulls could have been hijacked en route) | Ping duration; send the IDs now or hold for the regression |
| **IX** | 9 · Inference for slopes | Brandt's Bureau fuel certifications for all 900 Perrine departures (19 diverted flagged): fuel loaded vs. declared mass; for each departure date, the Δv from Mark 9.4 to rest at Kettle (24–38 km/s, from the nav software) | **CI for slope**: for the 19, fuel on declared mass, slope ≈ 0.248, interval excludes the physical 0.215 (the 881 honest Perrine hulls bracket it); **t-test for slope**: excess fuel fraction on Kettle Δv, H₀: β = 0 under every innocent story; slope ≈ 0.00114 per km/s vs the rocket-equation 1/900; conditions (LINE), residuals | The fuel to divert was loaded at Uruk High and certified, and it was the fuel to reach Kettle *on the day each hull left* — **intent at the Compact end** | — (Book One's proof is complete) | How to deliver: Board only / Inspectorate + Board / broadcast. The confrontation at Halden Reach. |
| **Epilogue** | — | One intercept from 2177 | None available — the question is Bayesian | The threat that justified PROVIDENT rests on one message | What it means | The Inspector-General asks you: how much should one message change what you believe? |

---

## 8. Act-by-act plot

Timeline anchor: **MET 0 = 2184-03-11, 06:00 Valhalla time**, *Nightjar* clears Adlinda Yards. Outbound to the Mark 9 region at 4 mgee: 73 days. Acts I–III are desk work under way; Acts IV–IX happen in the Lane's inner quarter and at Kettle; the Epilogue is at Callisto.

Each Act below gives: opening situation · pressure · beats · the turn · learner decisions. "Decision" beats are `<MissionBeat kind="decision">` with `<Outcome>` flavour; they never branch the plot.

### Prologue — *Shakedown* (MET 0–10)

**Opening.** Adlinda Yards, Callisto. *Nightjar* leaves the slip under tug, the Chief on the engineering deck reading the sink at 4% and warming. The crew is new to each other; Ferrier has been aboard nine days. Your orders are a shakedown in Jovian space: three cold runs against Callisto's own telescopes, which know where to look.

**Pressure.** The yard wants numbers. The Board wants a ship it can announce. The sink's design figures have never been tested with sixteen people breathing in her.

**Beats.**
1. MET 0/06:00 — Departure. You walk the ship: the cellar, the wings folded, the blister at the mast head where Oyelaran is already calibrating the Eyes against Jupiter's limb.
2. MET 2 — First cold run, Quiet profile, 40 h. The Chief's live readout of sink temperature against the design curve; the curve is optimistic by about 5%. She logs it with a plus-or-minus.
3. MET 5 — Second run, Watch profile. Callisto's telescopes find you at 61 h when the skin loop lags. Oyelaran says the Eyes would have found you at 50. Ferrier asks what the crew's estimate would be if the telescopes had been looking somewhere else.
4. MET 8/14:00 — Orders arrive, 41 seconds out (Callisto is close). The Board directs *Nightjar* to the Lane: "observe and assess the incident pattern; report through the Directorate of Lane Operations." Signed Ashby-Hale personally. A courtesy line: *Good hunting, Anselm.*
5. MET 9 — Ferrante's fitness board; Ebele's first brief: the Incident File, 31 hulls, six years, delivered as a single summary page with a mean and a conclusion. You ask for the file itself. It is 2,200 records. Ebele says he'll have a summary by morning. You tell him you want the records.
6. MET 10/03:00 — Departure burn for the Lane at 4 mgee. Under thrust there is down again.

**Turn.** The summary page's mean (Mark 7.1, "spread along the Lane") is the Board's finding. The records are the Act I dataset. To know whether the summary is honest you need to see the shape of the thing, not its centre.

**Decisions.** Accept tasking as written, or query the reporting line (through Lane Operations only) — the Board replies that the line is correct; Ferrier notes for the log that it is unusual for a naval assessment to bypass the Flag Secretary.

### Act I — *Signatures* (MET 12–30) · Unit 1

**Opening.** Twelve days out, four milligee, the Jovian system a bright smear astern. The Eyes are logging every plume on the Lane; the Incident File is open on the intel terminal. Ebele has made histograms and is proud of them.

**Pressure.** Light-lag to Valhalla lengthens daily. The Board expects a preliminary within thirty days. The crew is still forming; Oyelaran and Ebele argue about what a reading is.

**Beats.**
1. MET 12 — Ebele's first display: a histogram of *mark at last contact* for the 31, binned in threes, showing nothing. You have him rebin by mark. The Mark 9–10 pile appears. Ferrier: "Show me what thirty-one random accidents look like on that axis."
2. MET 15 — Oyelaran's first Lane contacts: eleven plumes, drive family and pulse rate; she has a class table of plume power for each drive model and reports one Sulcus hull "confirmed Mk 3, on profile." You have her compute z-scores against the class table; one contact is 2.6 SD hot for its class. She says the class table is wrong. Sandoval says the class table has a spread for a reason.
3. MET 19 — Time-to-silence. Ebele reports the mean transponder-degradation interval as 3.4 hours. The dotplot shows two piles: under a minute (twelve hulls), three to nine hours (nineteen). "It's two piles, sir, and the mean is sitting in the gap." Boxplots by classification: the *piracy* hulls are all in the abrupt pile.
4. MET 23 — Comparing distributions: lost hulls vs. all transits on hull age, cargo value, owner. Nothing on age. Cargo value of the lost hulls is *lower* than the Lane median — a surprise; pirates would take the valuable ones.
5. MET 27 — You draft the preliminary. Ferrier reads it and asks you to say what you are claiming: two processes, one abrupt and classified piracy, one gradual and unclassified, both concentrated late in the Lane. Not an accusation. A shape.
6. MET 30 — Solberg sends it. Twenty minutes out, twenty back. The Board's reply comes in four hours: *noted; continue within the assigned profile.*

**Turn.** The gradual-silence hulls are the interesting ones, and every one of them is a Sulcus hull that passed Bureau certification. If they were heavier than they said, the Lane's own telemetry would show it. That needs two variables, not one.

**Decisions.** Send the bimodality now or hold (Board: "noted" either way; if sent, Ashby-Hale's Act IX line "you were always going to find it" gains an edge). Trust the class table or Oyelaran (the debrief shows the 2.6-SD contact was real and heavy — she was wrong to distrust the table, right to notice).

### Act II — *Manifests* (MET 30–52) · Unit 2

**Opening.** The Bureau of Hulls answers a routine request for departure certifications — 412 records, declared mass and fuel load, Examiner's signature, drive model. The relay net's transponder archive gives acceleration at Mark 2 for each. Sandoval explains inferred mass on a napkin: thrust over acceleration, plus or minus three percent.

**Pressure.** The Board's "noted" sits in the log. Ebele wants to run every regression at once. The Eyes need four hours of every twelve for the sweep schedule and Oyelaran resents lending them to archive work.

**Beats.**
1. MET 32 — Scatterplot: inferred mass on declared mass, 412 points. Correlation 0.99; the Lane is honest, mostly. Slope near 1, intercept near zero. You have Ebele state what the slope means in tonnes per tonne and why the intercept should be zero.
2. MET 36 — The residual plot. Nineteen points sit above the band at +6 to +9%. All nineteen are lost hulls. The other twelve lost hulls are in the band. Ferrier: "Tell me the nineteen aren't just big ships." They are not; residual against declared mass shows no fan.
3. MET 40 — Fuel loaded vs. declared mass: the honest relation is proportional (fraction 0.215). Ebele tries a log transform to straighten a curve that isn't there; you make him show why a straight line already fits. The nineteen's fuel points sit high too. He notes it; you file it. (It returns in Act IX.)
4. MET 44 — Sandoval on the engineering deck: eight percent of twenty thousand tonnes is sixteen hundred tonnes. "That's not a clerical error, Skipper. That's a cargo."
5. MET 48 — The report. You write it as an institutionalist: nineteen hulls departed heavier than certified; the Bureau's process or the owners' declarations are compromised; recommend Inspectorate review of Bureau certifications. You do not name Sulcus. Ferrier asks why. You say the data names them; you don't have to.
6. MET 52 — The Board's reply, six hours in the drafting: the Lane Authority's crew survey and the 2183 escort trial "do not support a hypothesis of systematic manifest fraud"; the residuals "may reflect instrument variance." Attached: the survey summary and the trial report.

**Turn.** The Board has answered a regression with a survey. To rebut it you have to show how the survey was taken — and design one that could actually answer the question.

**Decisions.** Name Sulcus in the report or let the data name them (flavour: naming them makes Ostrow's Act VII hostility more overt). Lend the Eyes to the archive or keep the sweep (flavour: Oyelaran's contact log is thinner in Act IV if you take the Eyes).

### Act III — *Testimony* (MET 52–80) · Unit 3

**Opening.** The survey: 212 masters who answered a notice at the Ceres dock office. Question 4: *Do you believe pirates operating from the Free Holds are responsible for recent Lane incidents?* 94% yes. The escort trial: two announced convoys with a cutter, zero incidents, conclusion "deterrence effective."

**Pressure.** The Lane is 25 light-seconds wide where you are; masters are within tight-beam range for a day at a time. Every survey contact costs Solberg an hour of link time and the master's goodwill. Sulcus masters may not answer at all.

**Beats.**
1. MET 54 — Ebele's autopsy of the survey: voluntary response, a Ceres frame (only masters who *arrived*), a leading question. "It's a sample of who was bored at Ceres." He proposes to fix it by asking more masters at Ceres. Ferrier lets the silence do the work.
2. MET 57 — Designing the sample. The Lane schedule is a frame of 260 masters in transit. Options: SRS of 40 (cheap, may miss Sulcus); stratified by owner class (Perrine / Mercantile / independent), 15 each (balanced, more link time); cluster by convoy (cheap, correlated). You choose; the module walks the tradeoff. Solberg builds the contact schedule against light-lag.
3. MET 61–70 — The survey runs, master by master. Captain Marsh of *Thessaly Dawn* answers in nine profane minutes; her brother's ship was *Thessaly Ember*; the Authority told her a rock, then pirates. Six independent masters, unprompted, mention Sulcus hulls "turning late." Sulcus masters: nine contacted, two answered, both "no comment." Ebele wants to drop them; you make him record the nonresponse as data.
4. MET 72 — The escort trial autopsied: announced, un-randomised, no control transits, run in a month with no Sulcus departures. Ferrier designs the trial the Board should have run — unannounced escort assigned at random to transits — and notes it would take a Close Season and two cutters the Service doesn't have.
5. MET 76 — Cross-tab from the survey and the Incident File: who classified what. All twelve *piracy* classifications came from the Uruk office; Ceres classified its eight as accidents or unknown.
6. MET 80 — Turnover. *Nightjar* flips and begins braking toward the Mark 9 region. You file the survey report. The Board acknowledges in two words.

**Turn.** "Turning late" is testimony. To see it you must be at Mark 9, cold, when a Sulcus hull passes — and you have 68 hours of Watch in the cellar, a picket that may be looking, and no idea when the next one comes.

**Decisions.** Sampling design (SRS / stratified / cluster) — all reach the same conclusion; the debrief compares precision and cost. Include Sulcus masters (nonresponse becomes evidence) or exclude (cleaner numbers, a hole in the report).

### Act IV — *Running Cold* (MET 83–110) · Unit 4

**Opening.** MET 83/11:00. *Nightjar* kills her torch 0.42 AU from Ceres, on a heliocentric drift that keeps her near the Mark 9 geometry for twelve days. Wings folded. Sink at 6%. The Ceres approach is the brightest sky on the Lane: forty plumes in the Eyes at once.

**Pressure.** The cellar. Watch profile gives 68 hours give or take four; Quiet gives 114 but you cannot track. A purge is 2.6 hours as a beacon. Perrine hulls pass Mark 9 at 0.41 per day; you cannot stay cold long enough to be sure of one.

**Beats.**
1. MET 83 — The Chief's load budget as random variables: six subsystems, each with a mean and a spread; the total's mean and standard deviation; the probability the sink saturates before 64 hours. You set the profile.
2. MET 86 — Three loiter points. Ebele computes for each: expected Perrine transits per window (Poisson-ish arrivals, taught through binomial approximation), probability of at least one, and — from the sweep model — probability a Kettle-side picket sees you. Expected value of "diversions witnessed" per unit of sink. The near point is best and most exposed. You choose the middle one. Ferrier logs the alternative.
3. MET 91 — First window, 62 hours cold. Two Perrine hulls pass on profile. Geometric distribution: expected wait to the first *diverting* hull if one in four diverts (you don't know the rate; the drill teaches the sensitivity). Purge, seen by nobody you can detect. Second window.
4. MET 104/03:50 — MV *Marius Regio*, Mk 3, on profile, at Mark 9.4. Transponder begins to degrade. Oyelaran, flat: "The plume did not stop. It turned." Eleven degrees. Still braking. Solberg times the transponder fade: it will be four hours before the Authority calls it lost.
5. MET 104–105 — You cold-track *Marius Regio* for thirty hours at the edge of Watch, the Chief calling the cellar in hours-remaining. Ebele plots the vector: off-profile, still decelerating, heading for nothing on the chart. Ferrier asks whether you intend to follow. Following means lighting the torch. You do not.
6. MET 106 — Purge. Report: one observed off-profile diversion, vector logged. You add the geometric and binomial work: the odds that this was the only one, given the nineteen. Board reply, MET 107: *A single off-profile manoeuvre is consistent with a navigational casualty.*

**Turn.** Ferrier is the one who says it. "One ship is an anecdote." The Board says the same thing in worse prose. What would nineteen look like if nothing were wrong? You have to build the noise before you can hear the signal.

**Decisions.** Watch vs. Quiet profile (flavour: Quiet misses *Marius Regio*'s plume rotation; the debrief lets you re-run). Loiter point (EV framing; the near point yields a second, ambiguous sighting and a picket sweep that grazes you). Follow or log (log is the institutional choice; following triggers a Board rebuke and burns 90 km/s you need at Ceres).

**Module coverage (act-4-01…10).** 4-01 Ebele simulates loss *dates* as uniform over six years and finds the Register's tightest 30-day cluster (five losses, spring 2182 — the cover-loss season) is rare under randomness. 4-02/4-03/4-04 use the **Sweep log**: the Board's summary quoted P(coded accident | Perrine) when the question was P(Perrine | coded unknown); consecutive sweeps are not independent (a detection triggers a re-sweep). 4-05/4-06/4-07 are the Chief's cellar (beats 1–2). 4-08/4-09/4-10 are the windows (beat 3). The fat-tailed near loiter point *can* saturate the sink on a seeded draw; Act V opens by absorbing that as a near-miss purge.

### Act V — *Noise Floor* (MET 110–125) · Unit 5

**Opening.** MET 110. If the learner chose the near loiter point, *Nightjar* opens the Act at 97% sink, purging early with the wings out and Oyelaran watching for anyone watching; if not, she opens at 41% and the Chief says so. Either way the Board's rebuttal has arrived: a table of loss rates — *the Lane, 1.19%; the Mars–Belt corridor, 1.1%* — and a line from the two Lane cutters' reports: *Asgard*, 3 losses in 410 escorted or observed transits; *Tindr*, 0 in 380. "Patrol data show no consistent anomaly."

**Pressure.** *Nightjar* has 263 km/s left and consumables for 90 days. Ceres is 0.4 AU away and has fuel, the Authority's claims office, and a Martian insurance adjuster who has asked, through the consulate, to speak to the Compact's assessing officer. Ferrier does not like being asked for.

**Beats.**
1. MET 110 — Why the reports disagree. Ebele builds a sampling-distribution machine on the Register: draw 400-transit windows at random, count losses. Three and zero are both ordinary. The Board's preferred statistic — the *maximum* 90-day loss count from whichever cutter saw least — is biased low, and Ebele shows it by stacking the statistic. Ferrier: "So the cutters aren't lying. Good. Now show me what the Board is doing with them."
2. MET 113 — The normal, revisited. Time-to-Mark-9 across the Lane's honest transits is close to normal (mean 71.5 days, SD 0.9 days for Mk 3 hulls on the standard profile). You find the cutoff above which only 1% of honest transits fall. Every one of the nineteen heavy hulls is above it. Solberg notes the Register has their Mark 9 check-ins to the second.
3. MET 116 — The Machine. Ebele runs the CLT on the Register's transit times with n = 19: what a mean of nineteen honest transits looks like, and where the nineteen sit (z ≈ 3.5 on the mark axis; further on the time axis). Oyelaran watches the sampling distribution form and says, unprompted, that she had thought "normal" was a property of things and not of averages.
4. MET 119 — Proportions in the noise. Two-population sampler: what the *difference* in loss proportions between two owner classes looks like under a common rate. This is the null model for the accusation. You do not run the test yet. Ferrier insists on seeing the noise before the signal, on the record.
5. MET 121 — The baseline. The Board's 1.1% is the Mars–Belt corridor, the roughest in the system. Your own 2176 patrol report — you dig it out of the ship's archive; Ebele has never seen it — put the Lane at 0.5% (13 in 2,580). Under 1.1%, 31 in 2,612 is unremarkable; under 0.5%, it is five standard errors out. The rate argument depends entirely on which null the Board is allowed to choose. You write that sentence and stop, because the composition argument does not.
6. MET 124 — Decision: Ceres. Fuel, the claims register, the adjuster. Ferrier logs that entering Ceres approach control means transponder-on, which means everyone on the Lane, including Kettle, will know where *Nightjar* is. You go. The Chief starts the torch.

**Turn.** You know what noise looks like now. The nineteen are not noise. To say so in a form the Service must answer, you need a hypothesis, a test, a p-value and a sentence you would sign in front of a board of inquiry.

**Decisions.** Adopt the Board's baseline or yours in the report (flavour: adopting the Board's makes the Act VI two-proportion result land harder as "even on your numbers"). Ceres now, or hold station for a second diversion (holding costs consumables; the near-miss on sink margin is the debrief's example of a fat tail).

**Module coverage (act-5-01…05).** 5-01 beat 1; 5-02 beat 2; 5-03 beat 3; 5-04 beat 4; 5-05 the two-population machine on transit times (Perrine vs others), the null model Act VII will test against.

### Act VI — *Accusation* (MET 125–140) · Unit 6

**Opening.** MET 127. Ceres approach control, transponder on, 40 plumes in the sky and half of them within a light-second. *Nightjar* takes fuel at the Compact consular berth. Captain Marsh comes aboard with a bottle and a grievance and stays four hours. **Adjuster Halide Renn**, Tharsis Mutual, asks for a meeting in the consulate and says, in a Martian accent that makes Ferrier's jaw set, that her syndicate has paid Perrine Holdings 2.1 billion over six years and would like to know why the Compact navy is only now curious.

**Pressure.** Ceres is the one place on the Lane where everyone can see you and everyone can send a message. Solberg logs four transmissions from the Compact consulate to Valhalla in the first six hours; none of them are yours. Renn offers the claims register. Taking it from a Martian is a thing a Compact officer does not do. The Authority's Ceres office — **Nnamdi Okafor-Reyes**, the investigator whose predecessor was reassigned in 2182 — offers the same register, slower, through channels.

**Beats.**
1. MET 127 — Capture. Before any number goes up the chain, you make Ebele show you what "95% confident" commits you to: a hundred intervals from a hundred Close Seasons, and the ones that miss.
2. MET 129 — Margin. The Lane's loss rate, 31 in 2,612, with an honest interval: it excludes 0.5%. It does not exclude 1.1%. You write both sentences. Ferrier: "Then that isn't the claim. Make the claim the data can carry."
3. MET 131 — The register arrives (from Okafor-Reyes, through channels; Renn's copy sits unopened in the consulate safe, or opened — the learner's call). Beneficiary of each lost hull's policy. Nineteen: Perrine Holdings. Twelve: eleven owners. Ebele builds the two-way table and says nothing for a while.
4. MET 133 — The hypothesis. H₀: Perrine hulls are lost at the same rate as everyone else's. Hₐ: at a higher rate. One-sided, chosen *before* the number, and you have Ebele write down why. Conditions, with the pooled proportion: 900 × 0.0119 = 10.7 — the large-counts condition passes by seven-tenths of a hull, and Ferrier makes a note that a hostile reviewer will see that too.
5. MET 134 — The p-value and the sentence. z ≈ 3.2, p ≈ 0.0008. Ebele's first draft says the result "proves" Perrine hulls are being targeted. You strike *proves* and *targeted*. What the data say: convincing evidence that hulls insured to Perrine Holdings are lost at a higher rate than other hulls on the Lane. What it does not say: by whom, or why.
6. MET 135 — Errors and power. Ferrante, off the record, on the cost of each error: Type I is your career and a Service scandal on a Martian adjuster's desk; Type II is the next nineteen hulls. You choose α = 0.01 and write down why. The module tells the learner, in the Chief's voice, that some errors are paid in hulls and some in people, and that they are about to find out which.
7. MET 138 — The accusation. A four-step brief — state, plan, do, conclude — signed with your name and hull number, to the Board via Lane Operations, with a copy to the Flag Secretary. Solberg counts it out: 21 minutes. The reply, MET 139/02:10, is the first in the book signed *Ashby-Hale* personally: *Anselm. Received. The Board will convene. Proceed to rendezvous with CSV Halden Reach at the attached coordinates for sink refit and resupply; Captain Ostrow will brief you on the Board's transit-time analysis, which addresses your concern.* Solberg: the reply's timestamp is four minutes after your transmission arrived at Valhalla.
8. MET 140 — Marsh, leaving: her brother's ship departed Uruk High two days behind *Nicholson Regio* in the spring of 2182. Both were classified at Uruk. Only one of them was ever called *piracy*. She wants to know what you're going to do. You tell her you have reported it. She looks at you the way Ferrier does.

**Turn.** The report has been received and answered with an order and an analysis. The order takes you to a tender the faction controls. The analysis is about *means* — transit times — and it is wrong in a way you will have to demonstrate with the Board's own data before anyone above Ashby-Hale reads yours.

**Decisions.** Take Renn's register (faster; a Martian's fingerprints on your evidence — Ostrow uses it against you in Act VII) or Okafor-Reyes's (two days slower; clean). Copy the Flag Secretary or not (copying is doctrine; it is also how Maalouf becomes your channel to the Inspectorate in Act IX). α at 0.05 or 0.01 (the debrief in 6-06 is where the stakes for Act VIII are set: "some errors are paid in people").

**Module coverage (act-6-01…08).** 6-01 beat 1; 6-02 beat 2; 6-03 beat 4; 6-04/6-05 beat 5; 6-06 beat 6; 6-07 the interval for the difference (Perrine − other) on the way to beat 7; 6-08 beat 7.

### Act VII — *Halden Reach* (MET 140–175) · Unit 7

**Opening.** MET 152. CSV *Halden Reach*, a 40,000-tonne Lane tender, holds station 0.2 AU sunward of the Ceres approach with her radiators glowing like a town. *Nightjar* docks in her lee. Commander Lindqvist-Oduya meets you at the lock, correct and unhappy. Captain Ostrow meets you in her wardroom with a data slate and the Board's transit-time analysis, which shows — he says — that Perrine hulls' mean transit time is "within a day of the Lane mean, which is inconsistent with the hidden-mass hypothesis." He has compared all Perrine transits to all other transits. He has not looked at the nineteen.

**Pressure.** Your sink is in *Halden Reach*'s hands for six days. Ostrow outranks you and is the Board's officer on the Lane. Ebele, quietly, has been sent something: Sandoval's old lead fitter at Adlinda, hearing through the yard grapevine that the assessing officer's report has been "referred for review," has forwarded the Adlinda refit logs — twelve Sulcus hulls that went through a Mk 3 "drive uprate" in 2181–83 — because the report was buried and she would rather it not be. That is the **Refit set**.

**Beats.**
1. MET 152 — Should you worry about error. The Refit set is twelve hulls. Ebele reaches for a normal-based margin; you make him build the t distribution first and show why twelve is not thirty. Sandoval, on the deck: "Twelve is a margin, Ensign, not a fleet."
2. MET 155 — Reactor output. Bureau certifications for the twelve after refit: mean output 4.1% above the Mk 3 specification; the t-interval excludes spec. Uprated drives. A freighter does not need an uprated drive unless it intends to carry more than it says.
3. MET 157 — Testing a mean. The nineteen's time-to-Mark-9 against the Lane's published mean for the profile: one-sample t, small n, and Ebele wants the normal table. You correct him and log it. The nineteen were slow. Ostrow's analysis averaged them into 900 honest transits and lost them.
4. MET 159 — Before and after. The Refit set is paired: the same twelve hulls, time-to-Mark-9 on the run before the uprate and the run after. Treated as two samples, nothing. Treated as pairs — the differences — a shift of 1.9 days, t large, p tiny. Uprated drives, *slower* transits. They were heavier after the refit than before. Nine of the twelve are among the nineteen.
5. MET 161 — The sink comes back. The Chief runs the eight matched cold profiles the yard specified against her own pre-refit runs: mean loss on Watch, 8.9 hours, give or take one. "They didn't break it, Skipper. They shortened it. That's a decision." You put it in writing to Lindqvist-Oduya, who reads it twice and says she was not told the refit changed the sink specification. That is the moment she starts keeping her own log.
6. MET 163 — Two fleets, two means, and the transit anomaly. Perrine's surviving hulls vs everyone else's: a two-sample t-interval for the difference in time-to-Mark-9 that *contains* zero — Ostrow is right about the honest Perrine hulls, and you say so in writing. The lost Perrine hulls vs the surviving Perrine hulls: the interval does not contain zero, and the test rejects. Two lines of evidence now: proportions (Act VI), means (Act VII). Ostrow, reading it in the wardroom: "You have shown that lost ships were unusual. Lost ships are unusual, Commander. That is why they were lost."
7. MET 165 — Which procedure. The inference brief: every finding, its procedure, its conditions, its limits, bootstrapped where the conditions were thin. Sent to the Board via *Halden Reach*'s relay (Ostrow reads it first; you know he will) with a copy to the Flag Secretary. Then the decision. *Marius Regio*'s off-profile vector from Act IV, propagated forward with Ebele's nav work, intersects the orbit of a six-kilometre body at 3.41 AU that the chart lists as a prospector's abandoned claim. Kettle. Fourteen days cold-coast from *Halden Reach*, with a sink nine hours shorter than it was.
8. MET 166/04:00 — *Nightjar* undocks on a resupply pretext Lindqvist-Oduya signs without reading, which you both understand. Ostrow's message, 40 seconds after separation: *You are directed to remain in company.* Solberg: "That was not a Board transmission, sir. That was Captain Ostrow's slate."

**Turn.** You know the diverted hulls were prepared, slowed and lost; you know where the vector points. What you do not have is a *hull* — an identity at Kettle, a cargo category, a name in the claims register matched to a shape in the lidar. Categories. Counts. Whether what is at Kettle is independent of who owns it.

**Decisions.** Accept the refit (doctrine; the sink is shortened, and the learner knows it going in) or refuse it (Ostrow logs insubordination; the sink is untouched; *Halden Reach*'s crew remember which you chose in Act IX — flavour only; the Act VIII approach uses the post-refit table either way, because the learner who refused is ordered to accept a "safety inspection" that does the same thing). Send the brief through *Halden Reach*'s relay or hold it until clear (holding delays the Board's reaction — and Maalouf's — by six days). Proceed to Kettle or return to Ceres and wait for the Board (the wait is the institutional choice; the narrative gives it a MET 170 message from Maalouf, unsigned by the Board: *The Board has not convened. Proceed as your judgment dictates.* Either way, Kettle.)

**Module coverage (act-7-01…07).** In beat order: 7-01 beat 1; 7-02 beat 2; 7-03 beat 3; 7-04 beat 4 (the sink refit in beat 5 is the paired drill's second context); 7-05 and 7-06 beat 6; 7-07 beat 7.

### Act VIII — *Kettle* (MET 175–200) · Unit 8

**Opening.** MET 180. Fourteen days cold-coasting on a ballistic line, parasol out, skin at 120 K, the Eyes folded and the refit array — which Oyelaran does not trust — doing the watch. Kettle is a dark lump 60,000 km ahead with eleven warm shapes docked to it and three more standing off. The survey camera shows hulls. It cannot show names.

**Pressure.** Sink at 71% on Quiet; the approach has cost more than the table promised because the table is wrong by nine hours. A picket is likely: Ebele's Act IV sweep model, updated for Kettle, puts the probability that a cold tug is within ten light-seconds of *Nightjar*'s quarter at 0.3. The lidar is the only instrument that will give hull IDs, and the lidar is a lamp in a dark room.

**Beats.**
1. MET 180/22:00 — Are my results unexpected. While you wait for the geometry, Ebele runs the Register's declared cargo categories for the 31 lost hulls against the Lane's mix (He-3/deuterium 38%, volatiles 21%, metals 17%, manufactured 14%, mixed 10%): expected counts, all above five, statistic large, df 4. Lost hulls over-declare *volatiles* by a factor of three. Ammonia is the cheapest heavy thing you can write on a manifest.
2. MET 181/05:30 — The decision. 38,000 km. Oyelaran asks for the blister and the manual head; the refit array reads eleven degrees warm on a reference star and she will not put fourteen hull IDs on it. You approve. Ferrier reads you the sweep model's number one more time. You order a forty-second dwell.
3. MET 181/05:58 — Fourteen returns. *Marius Regio*. *Nicholson Regio*. *Perrine Regio*. *Tiamat Sulcus*. Ten more. Hulls the Register calls *unknown, presumed lost*, docked to a rock, with their names still stencilled on them. Solberg: "RF transient, bearing two-two-zero, two thousand one hundred kilometres. Cold source." Ebele plots the cone. Sandoval: "Four minutes to light." Ferrier: "Slug's inside ten."
4. MET 181/06:12 — The frame rings once. The blister is gone. Ferrante is at the mast root. Eight seconds. The lidar buffer is intact. You light the torch at 06:16 and run at 0.3 g with the wings out, a beacon to everyone in the Belt, and *Patience* does not follow because a tug cannot.
5. MET 183 — The ship's log, in your hand, past tense, one paragraph. The Board's acknowledgement calls it an *incident*. You strike the word and send it back.
6. MET 185–190 — Two-way. Ebele works because it is what there is to do. Loss outcome × beneficiary across the 2,612 transits: independence, expected counts, df 1, statistic large; the cell that drives it is *Perrine, lost*. Cause code by corridor — Lane vs Mars–Belt, separate samples: homogeneity; the Lane has three times the *unknown*. Classification × investigating office for the 31: every *piracy* from Uruk. Examiner × lost/not lost among Perrine departures: Dacre signed 22 of 900 and 17 of 19; expected 0.46; the statistic is absurd and Ebele checks the condition twice because one expected count is below five, and you make him say what that means and use the exact procedure the Engine provides.
7. MET 192 — The four. The only non-Perrine hulls Uruk ever classified are the four *piracy* losses: *Thessaly Ember*, *Kestrel Bough*, *Hygiea Promise*, *Long Fathom*. Twenty-three people. Abrupt silence, all four, in the Act I dotplot's short pile, in the spring of 2182 when a Ceres analyst had started asking about Perrine. Ferrante, reading over your shoulder: "Those weren't diverted." No. Those were the story.
8. MET 196 — Brandt. A message from Uruk High, not through any channel you used: Senior Examiner Odile Brandt, Bureau of Hulls, has read the assessing officer's brief (Maalouf sent it to the Bureau's director, who sent it down) and is sending, on her own authority, six years of fuel certifications for every Perrine departure. "The Bureau's stamp is the only thing on the Lane that isn't for sale, Commander." Nine hundred records, 19 flagged.

**Turn.** You can prove the hulls are at Kettle, that the ledger was written to hide them, and that a Bureau examiner signed them out. You cannot yet prove the Compact end *knew before they sailed* — Ostrow will say the crews went rogue at Mark 9 and the Service found out afterward. The proof of premeditation is in the fuel: if the Δv to reach Kettle was loaded at Uruk High, on each departure date, then someone at Uruk High planned each diversion. That is a slope.

**Decisions.** Dwell 40 s at 38,000 km (fourteen IDs; the round comes) or 12 s (nine IDs; the round comes; the debrief discusses what the model assumed about the picket's rules of engagement — that it would need to *see* you, when in fact it needed only to see the lamp). Send the IDs immediately (Ostrow and Ashby-Hale know within an hour; *Halden Reach* is ordered to intercept — Act IX's confrontation is at the tender) or hold them for the regression (the same order comes six days later; flavour).

**Module coverage (act-8-01…04).** 8-01 beat 1 (setup); 8-02 beat 1 (conclusion: contributions from *volatiles* and *mixed*); 8-03 beat 6 (independence vs homogeneity, correctly framed); 8-04 beat 6 (carrying out; examiner table; procedure selection). The loss falls between 8-02 and 8-03, as the curriculum map requires.

### Act IX — *Intent* (MET 200–235) · Unit 9

**Opening.** MET 203. *Nightjar* at 5 mgee toward Ceres, wings out, done hiding. Brandt's file open on the intel terminal. The mast head is a stump under a patch; the Eyes work; Oyelaran's second, Petty Officer Halvorsen, runs the sensor board and does not sit in her chair. Ferrier has moved the sensor watch to the bridge without asking you. *Halden Reach* has been ordered by Lane Operations — Ostrow's hand, Ashby-Hale's authority — to "rendezvous with and escort" *Nightjar* to Callisto.

**Pressure.** Delta-v: 118 km/s. The Board has still not convened. Maalouf's last message was two lines. Ferrante reports that Ebele has not slept in a way that is now a medical matter, and that you have not either, and that only one of you is his patient because the other outranks him.

**Beats.**
1. MET 204 — Do those points align. Before you touch Brandt's data you make Ebele show the sampling distribution of a fitted slope: a true line, noise, repeated samples of nineteen voyages, the slopes stacking. Standard error of a slope, from output, in units. "So the slope has a spread." Yes. That is the whole of it.
2. MET 208 — Interval for the slope. Fuel loaded on declared mass, the nineteen. Physics fixes the Lane slope at 0.215 t/t. The nineteen's fitted slope is 0.248; the 95% interval excludes 0.215. Residuals fine, no fan, no curve; nineteen points, df 17. They were fuelled for mass they did not declare — and ballast tanks scale with hull, so the extra is a slope, not an intercept. Same regression on the 881 surviving Perrine hulls: interval brackets 0.215. Honest ships, honest fuel.
3. MET 213 — Testing the slope: the variable that cannot be innocent. For each of the nineteen departure dates, the nav software gives the Δv a hull at Mark 9.4 would need to arrive at rest at Kettle instead of Ceres — it varies from 24 to 38 km/s over six years as the Lane, Ceres and Kettle move. Under any innocent story — clerical error, petty under-declaration, rogue crews — that number has *nothing to do with* how much fuel a hull loaded at Uruk High: β = 0. You regress excess fuel fraction (fuel ÷ declared mass − 0.215) on Kettle Δv. Slope 0.00114 per km/s, SE small, t ≈ 6, p < 0.001. The rocket equation says fuel fraction per km/s at 900 km/s exhaust is 1/900 = 0.00111. **The excess fuel on each hull is the fuel to reach Kettle on the day it left.** Someone computed that number at Uruk High, nineteen times, before the stamp went on.
4. MET 216 — Selecting the procedure. The evidence board: every finding from Act I's two piles to this slope, each with its procedure, its conditions, its conclusion in context, and its limit. What the case proves: a pattern, an owner, a false ledger, a prepared fleet, a stockpile at Kettle, and premeditation at the Compact end. What it does not prove: who gave the order, or why. You write that sentence yourself. Ferrier reads it and says, "Say it back to me," and you do.
5. MET 219 — Delivery. To the Board via Lane Operations, as ordered. To the Flag Secretary, as doctrine. To the Service Inspectorate, as the regulation you have never once invoked in thirty-four years permits any officer to do when the chain of command is the subject. Three addresses, one transmission, 21 minutes. Not to the Authority. Not to Tharsis Mutual. Not to Marsh. Ferrier asks why not. Because it is the Service's to answer for, and if you give it to Mars, the Service will answer for that instead.
6. MET 222 — Ashby-Hale, personally, 43 minutes after you send: he answered the moment it arrived. First person. Warm. *Anselm. You were always going to find it. I'd hoped you'd understand it when you did.* The intercept. The Directorate Problem. Eleven auxiliaries and a stockpile that the Assembly would never have paid for, bought with Martian money, crewed by Compact citizens, for the war he believes is coming. He does not mention the four. You ask him, in a transmission you draft four times, whether he knew about *Thessaly Ember*. The reply takes three hours. *I did not ask.*
7. MET 228 — *Halden Reach*. The tender matches velocity and Ostrow orders *Nightjar* to stand down and transfer her data cores. Lindqvist-Oduya has read the brief; she has also read the sink memo, and her own log. She informs Captain Ostrow, on an open channel her comms officer has helpfully left open, that a Lane tender does not detain a Service hull on the order of a liaison officer, and that she has forwarded the same brief to the Inspectorate under her own name. Ostrow, on the wardroom camera, sits down. No one fires anything. It is the most institutional scene in the book and the Showrunner should keep it that way.
8. MET 231 — The Inspectorate convenes. Vice Admiral Achterberg's transmission is one sentence: *The Inspectorate has opened proceedings; Commander Rook will return to Callisto with all data and all officers; Captain Ostrow is relieved and will be conveyed by CSV Halden Reach.* Then, a separate line, unsigned: *Well done. I am sorry about Lieutenant Oyelaran.*

**Turn.** Book One's proof is complete. What remains is what the institution does with it — and the one thing the numbers could not touch: whether the threat that justified all of it was real.

**Decisions.** Delivery: Board only (Maalouf forwards to the Inspectorate anyway, six days later, and the Epilogue notes you did not); Inspectorate + Board (the institutionalist choice; the book's frame); broadcast to the Authority / Tharsis (the Epilogue's Assembly hearing is harder, Marsh gets her answer sooner, and Rook is not promoted — flavour, and the closest the book comes to a judgment about the learner's choice). At *Halden Reach*: transfer the cores under protest (they are copied, not lost) or refuse (Lindqvist-Oduya's refusal covers you either way).

**Module coverage (act-9-01…04).** 9-01 beat 1; 9-02 beat 2; 9-03 beat 3; 9-04 beat 4.

### Epilogue — *Provident* (MET 258–290)

**Opening.** MET 258. Adlinda Yards, Callisto, where the book began. *Nightjar* under tug into the same slip. The mast head is a stump. Fifteen people walk off her.

**Beats.**
1. MET 260 — The Inspectorate. Two weeks of testimony in a windowless room at Valhalla. Ashby-Hale resigns his commission before he can be charged; Ostrow is charged with four counts of conspiracy to murder and will be tried in the Assembly's court; Dacre with fraud; Vasque is at large with *Patience* somewhere in the Free Holds. Eighty-seven people come home from Kettle over the following year; nineteen families had held funerals.
2. MET 268 — The Assembly. The Naval Committee, in closed session, reads the Inspectorate's finding and the intercept, and votes to keep Kettle. Eleven auxiliaries and a stockpile of cores, already paid for, in a Close Season when the Directorate has moved two heavy hulls to Phobos. First Delegate Vail says, in the only public line: *The Compact does not return what it needs to those who would use it against us.* Tharsis Mutual is repaid, quietly, over twenty years. The Provident Fund is placed under Inspectorate trusteeship. Your pension is in it.
3. MET 272 — Consequences (act-10-01). Achterberg asks you, on the record, which of your findings would survive a hostile review, and which of your decisions you would make again. You answer in Type I and Type II terms because it is the only honest language for it. Ferrante, afterwards, tells you that Oyelaran's mother asked him whether it was quick, and he told her the truth, and she thanked him.
4. MET 280 — Promotion. Captain. *Nightjar*, refit with the sink she was designed with, and a second hull of her class authorised. Ferrier is given *Asgard*. Ebele asks to stay. Sandoval says she would like it in writing that the new sink will be tested by someone who was not paid by the Provident Fund.
5. MET 288 — Thread (act-10-02). Achterberg's office. She puts the 2177 intercept on the table — the one message on which Ashby-Hale built PROVIDENT — and beside it a new one, received that week from the Phobos yards: a drive signature that *could* be a heavy hull working up. She asks you what it means. You say what P(this signature | a hostile working up) is; she asks what P(a hostile working up | this signature) is, and what the base rate of heavy-hull signatures at Phobos has been over the last decade, and you realise you have never been asked that question in that order in thirty-four years. Neither, she says, had Ashby-Hale.

**Book Two hook.** See §12.

### 8.1 Module coverage for the Prologue and Acts I–IV

The curriculum map gives the Prologue 3 modules, Act I 7, Act II 6, Act III 5 and Act IV 10 (plus checkpoints). Beats above map as follows; where a module needs a beat not listed above, it is added here.

| Module | Beat / data | Note |
|---|---|---|
| act-0-01 Shakedown | Prologue beat 1–2; six dead-reckoning nav fixes per run, re-run | Ferrier runs the fixes; the spread is the lesson |
| act-0-02 Heat Budget | Prologue beat 2–3; the sink gauge | The Chief's first plus-or-minus |
| act-0-03 Tasking | Prologue beat 5; the Register's summary page and its frequency table | You ask for the records |
| act-1-01 Register of Losses | Act I beat 1; variables of the Register | |
| act-1-02 Cause Codes | Act I beat 1; the Board's bar chart of causes with a truncated axis | Ebele restores the axis; *piracy* is 12 of 31, *unknown* is 19 |
| act-1-03 Drive Signatures | Act I beat 2; plume power by drive family, the hot contact | |
| act-1-04 Center and Spread | Act I beat 2–3; the hot contact pulls the mean; time-to-silence mean vs median | |
| act-1-05 Five Numbers | Act I beat 3; boxplot of time-to-silence; the 1.5 × IQR fence flags the abrupt pile | Hull ids requested — first thread |
| act-1-06 Two Fleets | Act I beat 4; lost hulls vs all transits on mark, cargo value, age | Lost hulls' mark distribution shifted late and tight |
| act-1-07 The Normal Curve | Act I beat 2 revisited; z for the hot contact against the class table (z ≈ 2.6; the module's seeded contact is > 3) | Calc: area under a curve |
| act-2-01 Cross-Tabulation | Act II opening; the Register's cause × beneficiary as a two-way table, descriptive only | *Unknown* is the modal code for Perrine, *accident* for everyone else |
| act-2-02 Burn vs Mass | Act II beat 1; the Manifest file scatter | |
| act-2-03 Line of Best Fit | Act II beat 1; slope in t/t, intercept ≈ 0 and why | Calc: minimising squared error |
| act-2-04 Residuals | Act II beat 2; the nineteen | |
| act-2-05 Leverage | Act II beat 2–3; one 60,000-t bulk hauler at the top of the x-range; with/without | The Board's report quotes r² and omits s |
| act-2-06 Curvature | Act II beat 3 extended; time-to-Mark-9 vs distance-at-departure across Close Seasons follows `t ∝ √d`; log–log linearises; the nineteen sit above the line | Calc: logs and linearisation |
| act-3-01 Who Was Asked | Act III beat 1; the Crew Survey's frame | |
| act-3-02 Drawing the Sample | Act III beat 2 | |
| act-3-03 Bias | Act III beat 1 and 3; direction of bias in the Authority survey | |
| act-3-04 The Admiralty's Trial | Act III beat 4; escorts assigned by owner request — owner confounded with escort | |
| act-3-05 What a Trial Can Say | **Added beat, MET 74–79:** as the Board's assessing officer you direct *Asgard*'s escort assignments for three weeks by lot — twelve transits, six escorted at random. Randomisation test on the observed difference: not larger than chance. Escorts are not the explanation. | Small, honest, on your own authority; Ostrow later cites it as overreach |
| act-4-01 Random or Not | Act IV coverage note; loss dates clustering simulation | The spring-2182 cluster |
| act-4-02 Rules of Chance | Sweep log; thermal vs radar detection as mutually exclusive modes in one sweep | |
| act-4-03 Given That | The Board's wrong conditional: P(coded accident | Perrine) vs P(Perrine | coded unknown) | The prosecutor's fallacy, in a staff paper |
| act-4-04 Independence | Consecutive sweeps not independent; loss not independent of beneficiary (descriptive) | Precursor to Act VIII |
| act-4-05 Distribution of a Cold Run | Act IV beat 1; hours cold required to cross a sweep as a random variable; sink temperature as a density | Calc: density vs mass |
| act-4-06 The Heat Ledger | Act IV beat 2; three loiter points as heat-cost distributions | Calc: expected value as weighted sum |
| act-4-07 Combining Systems | Act IV beat 1; six subsystem loads, the total's SD, the yard's margin that added SDs | |
| act-4-08 Pings | Act IV beat 3; n sweeps, P(0 detections) for a window | |
| act-4-09 Binomial Parameters | 31 losses in 2,612 under p = 0.005 and under 0.011 — surprising under one, not the other | Pre-inference version of Act VI |
| act-4-10 Until First Contact | Act IV beat 3; sweeps until first detection; wait until first Perrine hull | Calc: geometric series |

---

## 9. Recurring datasets (names and provenance)

The curriculum map's five recurring datasets, with their in-world names and why each is biased or clean.

| Curriculum name | In-world name | Provenance | What is wrong with it |
|---|---|---|---|
| **the Register** | the Lane Authority **Incident Register** ("the Register"; the Board's cover page calls it the Incident File) | Compiled by the Authority from transponder logs, cutter search reports and the classifying office's finding; 2,200 records for 31 losses, 2178–84 | Classification is a *reporting process*: Uruk classifies Compact-flag hulls, Ceres the rest; Uruk's codes are Ostrow's. The Register is honest about *when* and *where*, dishonest about *why*. |
| **the Manifest file** | the **Bureau departure certifications** joined to the relay net's **Mark 2 telemetry** | Bureau of Hulls (declared mass, fuel loaded, drive model, examiner) + Authority relay net (state vectors → acceleration) | The Bureau's numbers are true to the tonne; the *declarations* they certify are the lie. Dacre's stamp. |
| **the Crew Survey** | the **Lane masters' survey** (yours) vs the **Ceres dock survey** (the Authority's) | Yours: designed in Act III, run by Solberg over tight-beam, n = 40–45 with recorded nonresponse. Theirs: voluntary response at the Ceres dock office, n = 212 | Theirs: frame (arrivals only), voluntary response, leading wording. Yours: Sulcus nonresponse, which you keep as data. |
| **the Sweep log** | *Nightjar*'s **sweep log** | The Eyes' scheduled one-degree sweeps and every detection, own-ship, with sink state at each entry | Clean but *scheduled*: a sweep is coverage × sensitivity × time, so detection is a probability, and consecutive sweeps are not independent. |
| **the Refit set** | the **Adlinda uprate logs** | Twelve Sulcus hulls' Mk 3 "drive uprate" refits 2181–83, with the Bureau's post-refit output certification and the Register's time-to-Mark-9 for the run before and after; forwarded by Sandoval's old lead fitter in Act VII because the Act VI report was buried | Small (n = 12), paired by hull, and the single most damning honest dataset in the book. |
| *(Act IX)* | **Brandt's file** | Six years of Bureau fuel certifications for every Perrine departure, 900 records, sent by Senior Examiner Brandt on her own authority | Clean. That is the point. |

---

## 10. Agency ledger

Every place the learner makes a call, what it changes, and how the narrative acknowledges a wrong analysis. Structural rule: **no hard branches.** Decisions change flavour text, the register of later scenes, and who says what — never which datasets exist, which Acts occur, or whether Oyelaran dies. Wrong analysis at a mission beat or checkpoint produces an **in-story debrief** (a named crew member walks the error, the module names itself for revisiting) and a **retry with new seeded parameters**; the log records that a retry happened in one dry line ("Re-ran the residuals at the XO's request. She was right to ask.").

| Act | Decision beat | Options | How the narrative responds |
|---|---|---|---|
| Prologue | Query the reporting line | Accept / query | Query: Ferrier logs it; the Board replies "the line is correct." Acknowledged in Act IX when Maalouf notes you asked. |
| I | Send the bimodality now | Send / hold | Send: Ashby-Hale's Act IX line gains "I read your first note, you know." Hold: Ebele asks in Act II why you sat on it. |
| I | Trust the class table or Oyelaran on the hot contact | Table / Oyelaran | Debrief either way: she was wrong to distrust the table, right to notice; the contact was heavy. |
| II | Name Sulcus in the report | Name / let the data name them | Name: Ostrow's Act VII hostility is overt; Renn in Act VI already knows. |
| II | Lend the Eyes to archive work | Lend / keep the sweep | Lend: Act IV's contact log is thinner, one loiter point's EV lower. |
| III | Sampling design | SRS / stratified / cluster | All reach the same conclusion; debrief compares precision and link-time cost; cluster yields a wider interval Ebele has to explain. |
| III | Include Sulcus masters | Include / exclude | Include: nonresponse becomes evidence (Act VIII). Exclude: a reviewer's note in Act VII. |
| III | Order the escort lottery | Order / don't | Don't: 3-05 uses *Asgard*'s own six-transit pilot instead; Ostrow's overreach remark is dropped. |
| IV | Cold profile | Watch / Quiet | Quiet misses the plume rotation; the beat fails, debrief with Oyelaran, retry on Watch. |
| IV | Loiter point | Near / middle / far | Near: fat tail; a seeded draw may saturate the sink → Act V opens on a near-miss purge. Far: one fewer contact; no *Marius Regio* until the retry. |
| IV | Follow *Marius Regio* | Follow / log | Follow: Board rebuke, 90 km/s gone, Act VI's Ceres call is tighter on fuel. Log: institutional; Ferrier's "one ship." |
| V | Baseline in the report | Board's / yours | Board's: Act VI lands as "even on your numbers." Yours: Ostrow calls it self-citation. |
| V | Ceres now or hold | Ceres / hold | Hold: consumables pressure in VI–VII; a second ambiguous contact. |
| VI | Whose register | Renn's / Okafor-Reyes's | Renn's: faster; Ostrow: "a Martian adjuster's file." Okafor-Reyes: two days, clean. |
| VI | Copy the Flag Secretary | Copy / don't | Copy: Maalouf becomes the channel; the MET 170 message exists. Don't: Act IX delivery to the Inspectorate is colder. |
| VI | α | 0.05 / 0.01 | 6-06 debrief sets the stakes for VIII in either case; 0.01 is quoted back at you by Achterberg in the Epilogue with approval. |
| VII | Accept the refit | Accept / refuse | Refuse: a "safety inspection" does the same thing; *Halden Reach*'s crew remember you refused (Act IX warmth). |
| VII | Send the brief through the tender's relay | Send / hold | Hold: the Board's and Maalouf's reactions slip six days; Act IX's timeline compresses. |
| VII | Kettle or Ceres | Kettle / wait | Wait: Maalouf's "proceed as your judgment dictates." Either way, Kettle. |
| VIII | Lidar dwell | 40 s / 12 s | 40 s: fourteen IDs. 12 s: nine IDs (the χ² runs on nine; conditions thinner, Ebele says so). The round comes either way; the debrief is about what the sweep model assumed. |
| VIII | Send the IDs now | Now / hold | Now: *Halden Reach* is ordered to intercept at once. Hold: same order, six days later. |
| IX | Delivery | Board only / Inspectorate + Board / broadcast | The book's frame rewards the middle; broadcast costs the promotion and gives Marsh her answer sooner; Board-only is forwarded by Maalouf anyway and the Epilogue notes you did not. |
| IX | The cores | Transfer under protest / refuse | Lindqvist-Oduya's refusal covers both; transfer means Ostrow reads it first. |

**Checkpoint debriefs** (one per Act, in-story): each is a scene in which the XO, the analyst or the Chief walks the learner through what was wrong and names the modules, framed as the CO reviewing his own work before it goes up the chain. Never a teacher. Never "you failed." The register is: *this would not survive the Board; fix it before they see it.*

---

## 11. Tone guide

One page. Sentence-level rules, then eight right/wrong pairs demonstrating build-order §10.

**Rules.**
1. Second person, present tense in scenes; the log in past tense, first person, one paragraph, signed.
2. Physical detail carries emotion. Gauges, hands, timestamps, the lithium ticking. No one "feels a chill."
3. Military cadence is short sentences and exact nouns, not jargon. If a term is in the glossary, use it once and let context carry it.
4. Adverbs are rationed. "Quietly," "carefully," "suddenly" are defects.
5. Nobody quips. Humour is dry, rare, and about time or paperwork, and no one laughs at it.
6. The learner is never taught *at*. Statistics is a skill the CO had on *Asgard* and is re-sharpening; Ebele is the one being taught, and the CO corrects him.
7. Light-lag is real and is said out loud. Replies do not arrive early.
8. Death is stated once, plainly, by the person who saw it. It is not described a second time. It is remembered in what people stop doing (no one sits in her chair).
9. The Board is never mocked. It is rendered exactly, which is worse.
10. Numbers in prose carry their uncertainty when the Chief says them and lose it when the Board does.

**Right / wrong.**

| | Wrong | Right |
|---|---|---|
| 1. Opening a scene | *You feel a knot of dread as the sensor officer suddenly shouts that the freighter has mysteriously vanished from the display!* | *The transponder line on the plot goes from green to amber. Oyelaran does not look up. "Contact's degrading. Mark nine point four." The plume is still there.* |
| 2. The Board | *The Admiralty, those cowardly bureaucrats, once again brushed off your findings with meaningless corporate-speak.* | *The reply is eleven lines. It notes your observation. It directs continued observation within the assigned profile. Solberg reads the timestamp aloud, then reads it again.* |
| 3. Teaching | *Remember, a p-value is the probability of seeing data this extreme if the null hypothesis is true! Let's review what that means.* | *Ebele's draft says the result "proves" it. You strike the word. On* Asgard *you would have written: assuming Perrine hulls are lost at the Lane rate, a gap this large would turn up about eight times in ten thousand Close Seasons. Write that.* |
| 4. Humour | *"Well, at least the coffee's still hot!" the Chief joked, breaking the tension.* | *"If we send now," Solberg says, "the earliest anyone can have an opinion about it is fifteen-forty." He does not say what you should do with the interval.* |
| 5. The Chief | *"The heat sink is at critical levels, Captain! We have to purge now or we'll all die!"* | *"Cellar's at ninety-one. Call it six hours on Watch, give or take one. Past sixty I want it in writing."* |
| 6. Death | *The blister exploded in a shower of sparks as Dagny screamed her last words over the comm, and you wept for your fallen comrade.* | *The frame rings once. The mast-head indicator goes grey. Ferrante is at the root hatch before you have said anything. He comes back up the ladder and tells you eight seconds, and then he tells you the buffer is intact, because you are going to ask.* |
| 7. The log | *Captain's Log: Today was a hard day. We lost Dagny and I don't know how to go on, but the mission must continue.* | *LOG · MET 183/02:00. Lieutenant Dagny Oyelaran, sensor officer, was killed at 06:12 on the 181st day by a kinetic round fired from an unregistered tug during a lidar identification I ordered. Fourteen hull identities were recovered from her buffer. The Board's acknowledgement describes an incident. I have struck the word and returned it. — A. Rook, Cdr., CX-1.* |
| 8. Ashby-Hale | *"You fool, Rook! You've ruined everything! I'll see you court-martialled for this!"* | *"Anselm. You were always going to find it. I'd hoped you'd understand it when you did." He looks older on the slate than he did at the yard, and the lag makes it worse: you have forty-three minutes to decide what to ask him, and you use them.* |

---

## 12. Glossary

In-world terms. Writers use each once with context and thereafter bare.

**Institutions and places**
1. **Galilean Compact / the Compact** — Compact of Galilean Settlements (Ganymede, Callisto, Europa perimeter, Jupiter skimmer platforms). Chartered 2119. Our faction.
2. **Assembly** — the Compact's legislature, at Uruk. Funds the Service through its **Naval Committee**.
3. **Uruk** — Ganymede's capital, in Uruk Sulcus. **Uruk High** is its orbital, where the Bureau certifies departures.
4. **Valhalla** — Callisto basin; seat of the Admiralty Board. "Valhalla" in comms = the Board.
5. **Adlinda / Adlinda Yards** — Callisto naval yard; built *Nightjar*; performed the uprate refits.
6. **Compact Orbital Service / the Service / COS** — the Compact's navy. Eleven hulls.
7. **Admiralty Board / the Board** — the Service's flag command. Its **Directorate of Lane Operations** owns everything on the Lane.
8. **Flag Secretary** — Commodore Maalouf; signs Board transmissions; not in the faction.
9. **Service Inspectorate** — the Service's internal police, reporting to the Assembly's Naval Committee. Vice Admiral Achterberg.
10. **Service Provident Fund** — the Service's pension and benevolent fund. Owns Perrine Holdings. Every officer's pension.
11. **Perrine Holdings** — Callisto-registered holding company; the Fund's shell; majority owner of Sulcus Freight; *beneficiary* on every diverted hull's policy.
12. **Sulcus Freight** — the Compact's flag carrier; 34% of Lane transits; hulls named for Ganymede regiones and sulci.
13. **Bureau of Hulls and Cargo / Hulls / the Bureau** — Compact civil agency certifying manifests, declared mass, fuel load and reactor output at Uruk High. Four Senior Examiners.
14. **Lane Authority** — Jovian–Ceres Transit Lane Authority; seated at Ceres with a Jovian office at Uruk. Runs the relay net; classifies incidents; publishes the Register.
15. **Uruk office / Ceres office** — the Authority's two classifying offices. Uruk is staffed by Compact secondees under Ostrow.
16. **Terrestrial Union** — Earth–Luna. Insurance, law, distance.
17. **Martian Directorate / the Directorate** — Mars. The only real navy. **The Directorate Problem**: the staff-college lecture on why the Compact cannot win.
18. **Ceres Mercantile Council / the Mercantile** — the Belt's trading polity.
19. **Free Holds** — independent Belt stations (Hygiea Hold, Davida Hold, Interamnia). *Patience* is Davida-registered.
20. **Tharsis Mutual** — Martian underwriting syndicate; insures most Compact-flag hulls; Adjuster Halide Renn.
21. **Lunar Assurance Pool** — Earth/Luna underwriters of Mercantile and independent hulls.
22. **PROVIDENT** — Ashby-Hale's covert program: hulls, cargo and money diverted to Kettle.
23. **Kettle** — 2077 QK₄, a 6-km C-type at 3.41 AU, 0.14 AU off the Lane's Ceres end; PROVIDENT's depot. "The Cache" in Ostrow's messages.

**The Lane**
24. **The Lane / the Hundred-Day Lane** — Jovian–Ceres Transit Lane; a managed set of transfer geometries with a mandated 3-mgee brachistochrone profile.
25. **Close Season** — the part of the ~5-year Jupiter–Ceres cycle when the passage is shortest and traffic peaks. The book is set in one.
26. **Mark (1–12)** — the twelve mandated transponder check-ins, by fraction of scheduled transit. **Mark 6** = turnover. **Mark 9–10** = the Ceres approach, where diversions happen.
27. **Profile** — the published thrust schedule a Lane ship must fly. *On profile / off profile.*
28. **Turnover / flip** — the mid-transit rotation from accelerating to braking.
29. **Relay net** — the Authority's tracking satellites that keep the marks in line of sight and log state vectors.
30. **Transponder** — mandated identity-and-state broadcast. *Transponder-dark* = it has stopped.
31. **Time-to-silence** — the Register's field for how long a transponder degraded before final loss of signal. Bimodal.
32. **Classification** — the Authority's finding on an incident: *accident*, *piracy*, *unknown (presumed lost)*.
33. **Beneficiary** — the party paid on a hull's insurance policy; the Act VI variable.
34. **Declared mass / inferred mass** — what the manifest says vs. what thrust-over-acceleration says.
35. **Lane-standard fuel fraction** — 0.215 of declared departure mass; the physical slope.
36. **Uprate** — Adlinda's Mk 3 drive refit that raised certified output ~4%.

**The ship**
37. **CSV** — Compact Service Vessel. **CX-1** — *Nightjar*'s hull number.
38. **Corvette (low-emission)** — *Nightjar*'s type: a picket built to loiter cold.
39. **Cold / running cold** — torch off, reactor scrammed, wings folded, skin at 120 K, all heat into the sink.
40. **The sink / the cellar** — 60 t of lithium; 21.7 MWh of heat storage. Reported as % of capacity or hours remaining.
41. **Quiet / Watch / Standby** — the three cold profiles (114 / 68 / 32 h design; 99 / 59 / 28 h after the refit).
42. **Purge** — deploying the wings to dump the sink; 2.6 h as a beacon.
43. **The wings** — the radiator panels, 1,100 m², ~620 K when purging.
44. **Parasol** — the deployable sun-side shade.
45. **The cellars** — the fuel-cell bank that powers the ship cold. (Distinct from *the cellar*, the sink; the crew find this less confusing than outsiders do.)
46. **The Eyes** — the four 0.8-m cooled IR telescopes.
47. **Sweep** — a scheduled one-degree pass of the Eyes; the unit of the sweep log.
48. **The blister** — the two-person pressurised station at the mast head with the manual lidar. Where Oyelaran dies.
49. **The mast** — *Nightjar*'s folding sensor mast.
50. **Torch** — the Adlinda Mk 4 fusion drive. *Light the torch* — four minutes from cold.
51. **Plume** — a torch's exhaust; the thing everyone can see.
52. **Drive signature** — plume power, spectrum, pulse rate, vector; identifies drive model and yields inferred mass.
53. **Pulse rate** — a torch's characteristic fusion pulse frequency (Mk 3: 61 Hz; Mk 4: 88 Hz; Tessera-C: 40 Hz).
54. **Dead reckoning** — position from known velocity and time, without a fix; what a cold ship's navigation is.
55. **Slug** — a coilgun kinetic round. 40 mm. Unpowered, cold, invisible.
56. **Wrecker** — a tug used to disable ships with a slug; *Patience*.
57. **Tender** — a Service support ship; *Halden Reach*, 40,000 t.
58. **Cutter** — the Service's two aging Lane patrol hulls, *Asgard* and *Tindr*.

**Usage**
59. **MET** — mission elapsed time, `MET 104/07:20`.
60. **Moonside** — Compact citizens' word for themselves. **Skimmer** — the inner-system slur.

---

## 13. Book Two hooks

Book One resolves: the hulls are found, the ledger is exposed, the fuel proves premeditation, Ostrow is charged, Ashby-Hale resigns, the Service absorbs its crime and the Assembly keeps the fleet it never voted for. Three threads are left deliberately open, and the third is the spine of Book Two.

1. **Vasque and *Patience*.** At large in the Free Holds with a coilgun and four hulls' worth of knowledge about who paid her. Someone will want her silent; someone else will want her testimony.
2. **Kettle, kept.** Eleven auxiliaries and a stockpile that the Assembly now owns and the Directorate now knows about. The Compact has, in effect, a second navy that the Inspectorate polices and the Board covets.
3. **The intercept.** PROVIDENT rested on one 2177 message that Ashby-Hale read as *Mars is coming*. Book One's tools cannot evaluate it: every test in Acts VI–IX asks *how likely is this data if the null is true*; the Inspector-General's question in the Epilogue is *how likely is the hypothesis, given this data, and given what we knew before* — and the new Phobos signature makes it urgent. Book Two opens with Captain Rook ordered to take *Nightjar* and her sister hull toward Mars-side to *update* — and teaches, from the first module, that the same evidence moves a belief a different distance depending on where the belief started. The seeded lesson in act-10-02: P(hostile | signature) is not P(signature | hostile), and the base rate of heavy-hull signatures at Phobos is the number nobody in the Board ever asked for. Neither had Ashby-Hale.

Continuity commitments for Book Two: Ferrier commands *Asgard*; Ebele stays; Sandoval tests the new sink; Halvorsen has the sensor board and still does not sit in the chair; Ferrante's report on the CO's sleep is on file; the Provident Fund is under trusteeship; Marsh got her answer and is not satisfied by it.

---

## 14. Answers to the Curriculum Architect

Responding to `docs/curriculum-map.md` §8 and to the module list.

1. **Dataset names and provenance** — §9 above. In-world: *the Register* (Authority Incident Register; the Board calls its cover page the Incident File), *the Manifest file* (Bureau certifications joined to Mark 2 telemetry), *the Crew Survey* (the learner's Lane masters' survey vs. the Authority's Ceres dock survey), *the Sweep log* (own-ship), *the Refit set* (Adlinda uprate logs, 12 Sulcus hulls, paired by hull), plus *Brandt's file* for Act IX. Each carries the bias the map needs: the Register's classification is a reporting process (Uruk vs Ceres); the Ceres survey is voluntary response with a Ceres-only frame; the Refit set is small and paired.

2. **Act IV route consequence** — accepted. The near loiter point (act-4-06's fat-tailed option) can saturate the sink on a seeded draw; Act V's opening scene absorbs it as an early purge at 97% with Oyelaran watching for watchers. No branch.

3. **Act VI hinge and the Refit set** — accepted and specified. The Act VI report is answered (MET 139) with an order to *Halden Reach* and a bogus means analysis; the Refit set reaches Ebele in Act VII *because* the report was "referred for review" — Sandoval's old lead fitter at Adlinda sends the uprate logs. The Board never "buries" it in so many words; it refers it, which is the same thing said in the passive voice.

4. **The act-9-03 variable** — chosen: **excess fuel fraction** (fuel loaded ÷ declared mass − 0.215) regressed on the **Δv required to reach Kettle from Mark 9.4 on each hull's departure date** (24–38 km/s across six years as the geometry moves; the nav software supplies it). Under every innocent story the population slope is zero. Observed slope ≈ 0.00114 per km/s against the rocket-equation prediction 1/900 ≈ 0.00111. Conditions: nineteen independent departures, linear by construction, residuals homoscedastic; this is a random sample only in the sense that the 19 are all diverted hulls — the module should state the scope of inference as "these nineteen departures" and let 9-04 handle what that limits. act-9-02's interval uses fuel loaded on declared mass, slope 0.248 vs the physical 0.215; the 881 honest Perrine hulls bracket 0.215 as the control regression.

5. **Crew loss placement** — Oyelaran dies at MET 181, between act-8-02 and act-8-03 (§4.10, §8 Act VIII). act-6-06 sets the stakes in Ferrante's and the Chief's voices: "some errors are paid in hulls and some in people."

6. **Titles** — Acts VII, VIII and the Epilogue are retitled *Halden Reach*, *Kettle*, *Provident* in `ACT_TITLES`; module ids and slugs untouched. Module working titles are yours; the Showrunner may rename in the beat sheet.

7. **Two small requests back.**
   - act-8-04's examiner table (Dacre: 17 of 19 diverted vs 5 of 881 honest) has an expected count below 5. I have written the beat so Ebele *notices* and the module must either (a) collapse to a 2×2 with the condition met by pooling the other three examiners, or (b) use it as the "conditions fail — what now" lesson. Your call; the scene supports either.
   - act-6-08's large-counts condition passes narrowly (900 × 0.0119 = 10.7). I have made that a beat (Ferrier notes a hostile reviewer will see it). If you would rather the numbers pass comfortably, raise Perrine's transit count to 1,100 (19/1,100 = 1.7% vs 12/1,512 = 0.8%; z ≈ 2.4, p ≈ 0.008) — the story does not care which, but §1.2's "34% of transits" and the Act VI numbers must be changed together.

8. **One deviation from the build order to flag.** Build-order §3 suggested Act VII's paired comparison be "ships before/after refit" and I have kept that as primary (the Refit set); *Nightjar*'s own sink refit is a second, narrative paired dataset (8 profiles) that the Act Team may use for drills but should not be the assessed mission beat. Act VIII's independence test is "loss × beneficiary," per your act-8-04; "classification × office" and "examiner × loss" are additional tables the scene provides for drills and the checkpoint's DISP item.

