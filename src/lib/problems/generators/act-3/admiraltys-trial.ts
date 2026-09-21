/**
 * act-3-04 · The Admiralty's Trial — drills. AP 3.5, 3.6: experimental units, factors, levels,
 * treatments and the response; comparison, random assignment, control, replication and blinding;
 * confounding; completely randomized vs randomized block vs matched pairs.
 *
 *   act-3/units-factors-response  choice   units, factor(s) and levels, treatments, response — as one reading
 *   act-3/explain-confound        interp   name the lurking variable, the mechanism, the consequence
 *   act-3/choose-design           choice   completely randomized / randomized block / matched pairs, with the reason
 *   act-3/blocking-rationale      choice   which variable to block on, and why
 *   act-3/control-replication     choice   which principle the trial is missing, and what it would have bought
 *
 * The Board's own trial (14 escorted transits, zero incidents, owner confounded with escort) belongs
 * to the mission beats. Every trial here is another yard, another squadron, another fit.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, pickContext, retry } from '@/lib/problems/generate'
import { fmtInt } from '@/lib/stats/format'
import { confoundExplanation } from './_rubrics'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

interface Yard {
  yard: string
  lane: string
  squadron: string
}

const YARDS: readonly Yard[] = [
  { yard: 'Amalthea Yards', lane: 'the Adrastea feeder lane', squadron: 'the Tindr escort squadron' },
  { yard: 'Thebe Yards', lane: 'the Thebe–Amalthea shuttle run', squadron: 'the Vantage patrol group' },
  { yard: 'Osiris Yards', lane: 'the Elara transfer corridor', squadron: 'the Meridian squadron' },
  { yard: 'Adlinda Yards', lane: 'the Carme outer loop', squadron: 'the Tindr escort squadron' },
] as const

const RESERVED_COUNTS = new Set([212, 260, 924, 88, 110, 62, 40])
const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — units, factors, levels, treatments, response
// ---------------------------------------------------------------------------------------------

interface TrialSpec {
  /** The described trial. */
  description: (y: Yard, n: number) => string
  units: string
  unitsWrong: string
  factorLevels: string
  treatments: string
  response: string
  lurkingAsResponse: string
  levelsAsFactors: string
}

const TRIAL_SPECS: readonly TrialSpec[] = [
  {
    description: (y, n) => `${y.yard} has ${fmtInt(n)} transits booked on ${y.lane} this quarter. Each transit is assigned by lot to one of three radiator coatings — the standard grey, a new high-emissivity black, or a two-layer composite — and the yard records the peak heat-sink load reached on each transit. Hull age and owner class are recorded but not used in the assignment.`,
    units: `the ${'{n}'} transits`,
    unitsWrong: 'the crews flying the transits',
    factorLevels: 'one factor, radiator coating, at three levels (standard grey, high-emissivity black, two-layer composite)',
    treatments: 'the three coatings themselves',
    response: 'peak heat-sink load on the transit',
    lurkingAsResponse: 'hull age',
    levelsAsFactors: 'three factors — grey, black and composite',
  },
  {
    description: (y, n) => `${y.squadron} runs ${fmtInt(n)} convoy legs on ${y.lane}. Each leg is assigned by lot to a cutter escort or to no escort, and independently to a tight or a loose formation spacing. The squadron counts off-nominal advisories filed on each leg. The tonnage carried on each leg is logged but plays no part in the assignment.`,
    units: `the ${'{n}'} convoy legs`,
    unitsWrong: 'the cutters of the squadron',
    factorLevels: 'two factors — escort (present or absent) and formation spacing (tight or loose) — each at two levels',
    treatments: 'the four combinations of escort and spacing',
    response: 'off-nominal advisories filed on the leg',
    lurkingAsResponse: 'tonnage carried',
    levelsAsFactors: 'four factors — escorted-tight, escorted-loose, unescorted-tight and unescorted-loose',
  },
  {
    description: (y, n) => `${y.yard} takes the ${fmtInt(n)} hulls in its refit queue and assigns each by lot either to the new transponder repeater or to the existing single unit. Every hull then flies two scheduled transits on ${y.lane}, and the yard counts the minutes of transponder dropout logged across the two. The hulls' ages are on file but were not used in the assignment.`,
    units: `the ${'{n}'} hulls in the refit queue`,
    unitsWrong: 'the two scheduled transits each hull flies',
    factorLevels: 'one factor, transponder fit, at two levels (new repeater, existing single unit)',
    treatments: 'the two fits',
    response: 'minutes of transponder dropout logged over the two transits',
    lurkingAsResponse: 'hull age',
    levelsAsFactors: 'two factors — the new repeater and the existing unit',
  },
] as const

export const unitsFactorsResponse = defineGenerator({
  id: 'act-3/units-factors-response',
  label: 'Units, factors, levels, treatments, response',
  ap_topics: ['3.5'],
  skills: ['1'],
  generate(rng) {
    const y = pickContext(rng, YARDS)
    const s = pickContext(rng, TRIAL_SPECS)
    const n = retry(rng, (r) => 4 * r.int(6, 22), (v) => !reservedCount(v))
    const units = s.units.replace('{n}', fmtInt(n))
    const cands: Candidate[] = [
      {
        text: `Units: ${units}. Factor and levels: ${s.factorLevels}. Treatments: ${s.treatments}. Response: ${s.response}.`,
        correct: true,
        why: null,
      },
      {
        text: `Units: ${s.unitsWrong}. Factor and levels: ${s.factorLevels}. Treatments: ${s.treatments}. Response: ${s.response}.`,
        correct: false,
        why: `Everything but the units. The experimental unit is whatever the *assignment* was made to, one draw at a time — ${units}. ${s.unitsWrong.charAt(0).toUpperCase()}${s.unitsWrong.slice(1)} were never assigned anything, so they cannot be the units.`,
      },
      {
        text: `Units: ${units}. Factor and levels: ${s.levelsAsFactors}. Treatments: ${s.treatments}. Response: ${s.response}.`,
        correct: false,
        why: `Levels counted as factors. A **factor** is the variable being manipulated; its **levels** are the settings it is set to. Here the correct reading is ${s.factorLevels}.`,
      },
      {
        text: `Units: ${units}. Factor and levels: ${s.factorLevels}. Treatments: ${s.treatments}. Response: ${s.lurkingAsResponse}.`,
        correct: false,
        why: `${s.lurkingAsResponse.charAt(0).toUpperCase()}${s.lurkingAsResponse.slice(1)} is recorded, but it is not the response: it was fixed before the trial began and nothing done in the trial could change it. The response is the outcome measured *after* the treatment — ${s.response}.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${s.description(y, n)}\n\nWhich reading of the design is correct?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Four questions, in this order. What was assigned to, one draw at a time? — those are the units. What was manipulated? — that is the factor, and its settings are its levels. What combination does a unit actually receive? — that is a treatment. What was measured afterwards? — that is the response.',
        'A variable that was already fixed before the trial began (an age, an owner, a tonnage) cannot be the response, however carefully it was recorded. And the number of treatments is the number of level-combinations, not the number of factors.',
      ],
      solution: `**${options[correct]}**\n\n| part | here |\n| --- | --- |\n| experimental units | ${units} |\n| factor(s) and levels | ${s.factorLevels} |\n| treatments | ${s.treatments} |\n| response | ${s.response} |\n\nThe two traps are next to each other. A **factor** is a knob; its **levels** are the positions of that knob; a **treatment** is one setting of every knob at once. And a variable measured before the treatment — ${s.lurkingAsResponse} here — is a *characteristic of the units*, useful for blocking, never the response.`,
      misconception: 'Naming the levels as factors (so a one-factor trial appears to have three), or naming a pre-existing characteristic of the units as the response.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — explain the confound
// ---------------------------------------------------------------------------------------------

interface ConfoundScenario {
  lurking: string
  treatment: string
  treatmentNoun: string
  response: string
  mechanism: (y: Yard) => string
  trial: (y: Yard, a: number, b: number) => string
}

const CONFOUND_SCENARIOS: readonly ConfoundScenario[] = [
  {
    lurking: 'hull age',
    treatment: 'the high-emissivity radiator refit',
    treatmentNoun: 'refit',
    response: 'peak heat-sink load',
    mechanism: (y) => `${y.yard} fitted the new radiators to the newest hulls in the queue first, so every refitted hull was also a young hull with a fresh drive and clean ducting`,
    trial: (y, a, b) => `${y.yard} compared ${fmtInt(a)} hulls carrying the new high-emissivity radiator refit against ${fmtInt(b)} hulls on the standard grey, and found the refitted hulls ran a markedly lower peak heat-sink load on ${y.lane}.`,
  },
  {
    lurking: 'owner class',
    treatment: 'the cutter escort',
    treatmentNoun: 'escort',
    response: 'off-nominal advisory count',
    mechanism: (y) => `${y.squadron} sent its cutters to the convoys that asked for one, and the houses that asked were the large Mercantile operators who also run the newest hulls on the best-charted legs of ${y.lane}`,
    trial: (y, a, b) => `${y.squadron} compared ${fmtInt(a)} escorted convoy legs against ${fmtInt(b)} unescorted legs over the same quarter, and found the escorted legs filed markedly fewer off-nominal advisories.`,
  },
  {
    lurking: 'time of season',
    treatment: 'the tight formation order',
    treatmentNoun: 'order',
    response: 'off-nominal advisory count',
    mechanism: (y) => `The tight formation order came into force halfway through the season, so every leg flown under it was also a late-season leg, run in the quieter traffic and steadier debris conditions of ${y.lane}'s close season`,
    trial: (y, a, b) => `${y.squadron} compared the ${fmtInt(a)} legs flown under the tight formation order against the ${fmtInt(b)} legs flown before it, and found the tight-order legs filed markedly fewer off-nominal advisories.`,
  },
  {
    lurking: 'crew experience',
    treatment: 'the new docking protocol',
    treatmentNoun: 'protocol',
    response: 'mean berthing time',
    mechanism: (y) => `${y.yard} trained its senior crews on the new protocol first and let the junior crews carry on with the old one, so protocol and crew experience arrived together on every berthing`,
    trial: (y, a, b) => `${y.yard} compared ${fmtInt(a)} berthings run under the new docking protocol against ${fmtInt(b)} run under the old, and found the new-protocol berthings markedly faster.`,
  },
] as const

export const explainConfound = defineGenerator({
  id: 'act-3/explain-confound',
  label: 'Explain the confound',
  ap_topics: ['3.5', '3.6'],
  skills: ['4'],
  generate(rng) {
    const y = pickContext(rng, YARDS)
    const s = pickContext(rng, CONFOUND_SCENARIOS)
    const { a, b } = retry(
      rng,
      (r) => ({ a: r.int(11, 46), b: r.int(11, 46) }),
      ({ a, b }) => Math.abs(a - b) >= 3 && ![a, b].some(reservedCount),
    )
    const mechanism = s.mechanism(y)
    const answer = confoundExplanation({ lurking: s.lurking, treatment: s.treatment, treatmentNoun: s.treatmentNoun, response: s.response, mechanism })
    return {
      prompt: `${s.trial(y, a, b)} The bulletin credits ${s.treatment}.\n\nNothing was assigned by lot. ${mechanism}.\n\nIn two or three sentences, explain why the comparison cannot support the bulletin's claim: name the lurking variable, say how it came to travel with ${s.treatment}, and say what follows for the difference in ${s.response}. Write it in context.`,
      answer,
      hints: [
        'A confound is not "another thing that matters". It is a variable that is *lined up with the treatment* — it changes exactly when the treatment changes — so the two arrive at the response together and no arithmetic on this data can pull them apart.',
        `Read the second paragraph again and ask what else was true of every unit that got ${s.treatment}, and false of every unit that did not. Name that variable, then state the consequence in the form "the difference could be X rather than the ${s.treatmentNoun}, and this design cannot tell which".`,
        `Do not credit the ${s.treatmentNoun} with any part of the difference — that is exactly the claim the design cannot support. Note also that the fix is a design fix: assigning the ${s.treatmentNoun} by lot would have broken the link.`,
      ],
      solution: `**${answer.exemplar}**\n\nThe repair is not more data, it is a different design. Assigning ${s.treatment} **by lot** to the ${fmtInt(a + b)} units would have scattered ${s.lurking} roughly evenly between the two groups, so that the only systematic difference left between them was the one the trial imposed. That is the whole purpose of random assignment, and it is the one thing this trial never did.`,
      misconception: `Listing ${s.lurking} as "another factor to consider" while still crediting ${s.treatment}. If the two cannot be separated, neither one may be credited — the observed difference belongs to both or to neither.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — which design?
// ---------------------------------------------------------------------------------------------

type DesignKind = 'completely randomized' | 'randomized block' | 'matched pairs'

interface DesignScenario {
  right: DesignKind
  goal: (y: Yard, n: number) => string
  correctText: (n: number) => string
  whyCRD: string
  whyBlock: string
  whyPairs: string
}

const DESIGN_SCENARIOS: readonly DesignScenario[] = [
  {
    right: 'matched pairs',
    goal: (y, n) => `${y.yard} wants to compare the new high-emissivity radiator coating against the standard grey. It has ${fmtInt(n)} hulls, and each hull can fly the same run twice this quarter — once on each coating, in an order decided by a coin.`,
    correctText: (n) => `**Matched pairs**: fly each of the ${fmtInt(n)} hulls twice, once on each coating, with the order of the two runs randomized *within* the hull.`,
    whyCRD: `A completely randomized design would put half the hulls on each coating and throw away the best control available: a hull's own duct geometry, drive condition and cargo pattern. Hull-to-hull differences would sit on top of the coating difference as noise.`,
    whyBlock: `Blocking on some third variable is a weaker version of what is on offer. The tightest possible block here is a block of size two — the same hull — and that block has a name: matched pairs.`,
    whyPairs: '',
  },
  {
    right: 'randomized block',
    goal: (y, n) => `${y.squadron} wants to compare escorted and unescorted convoy legs on ${y.lane}. It has ${fmtInt(n)} legs booked. Advisory counts are known to run far higher on the outer legs (Marks 8–12) than on the inner ones, and each leg can be flown only once.`,
    correctText: (n) => `**Randomized block**: split the ${fmtInt(n)} legs into inner-Mark and outer-Mark blocks, then assign escort by lot *within each block*.`,
    whyCRD: `A completely randomized design is valid but wasteful here. A known source of variation — inner versus outer Marks — would be left in the comparison as noise, and a bad draw could load the escorted group with outer legs.`,
    whyBlock: '',
    whyPairs: `Matched pairs needs each unit to receive both treatments, or a natural pairing of two nearly identical units. A leg is flown once and cannot be flown again unescorted, so there is nothing to pair.`,
  },
  {
    right: 'completely randomized',
    goal: (y, n) => `${y.yard} wants to compare three radiator coatings on ${fmtInt(n)} transits booked for ${y.lane}. The transits are closely alike — same class of hull, same Marks, same quarter — and nothing recorded about them is known to be related to heat-sink load.`,
    correctText: (n) => `**Completely randomized**: assign all ${fmtInt(n)} transits to the three coatings by one lot, roughly equal numbers each.`,
    whyCRD: '',
    whyBlock: `Blocking costs something and buys nothing unless the blocking variable is related to the response. Here nothing recorded is known to be related to heat-sink load, so blocks would simply complicate the assignment.`,
    whyPairs: `Matched pairs needs each unit to take both treatments, or a natural pairing. A transit takes one coating and is flown once, and with three coatings there is no pair to form.`,
  },
  {
    right: 'randomized block',
    goal: (y, n) => `${y.yard} wants to compare the new docking protocol against the old across ${fmtInt(n)} berthings. Berthing time depends heavily on which crew is on the deck, and each crew will work several berthings this quarter.`,
    correctText: () => `**Randomized block**: treat each crew as a block, and assign protocol by lot to that crew's berthings *within* the block.`,
    whyCRD: `A completely randomized design is valid but leaves crew-to-crew variation — the largest known source of variation in berthing time — sitting inside the comparison as noise.`,
    whyBlock: '',
    whyPairs: `Matched pairs would need the berthings paired one-to-one. Each crew works several berthings, so the natural structure is a block per crew rather than a pair.`,
  },
] as const

const DESIGN_LABEL: Record<DesignKind, string> = {
  'completely randomized': '**Completely randomized**',
  'randomized block': '**Randomized block**',
  'matched pairs': '**Matched pairs**',
}

export const chooseDesign = defineGenerator({
  id: 'act-3/choose-design',
  label: 'Which experimental design?',
  ap_topics: ['3.6'],
  skills: ['1', '4'],
  generate(rng) {
    const y = pickContext(rng, YARDS)
    const s = pickContext(rng, DESIGN_SCENARIOS)
    const n = retry(rng, (r) => 6 * r.int(5, 14), (v) => !reservedCount(v))
    const wrongText: Record<DesignKind, string> = {
      'completely randomized': `**Completely randomized**: ignore the structure and assign all ${fmtInt(n)} units to the treatments by one lot.`,
      'randomized block': `**Randomized block**: group the units first, then assign treatments by lot within each group.`,
      'matched pairs': `**Matched pairs**: pair the units (or run each unit under both treatments) and randomize within the pair.`,
    }
    const whyWrong: Record<DesignKind, string> = {
      'completely randomized': s.whyCRD,
      'randomized block': s.whyBlock,
      'matched pairs': s.whyPairs,
    }
    const kinds: DesignKind[] = ['completely randomized', 'randomized block', 'matched pairs']
    const cands: Candidate[] = kinds.map((k) =>
      k === s.right
        ? { text: s.correctText(n), correct: true, why: null }
        : { text: wrongText[k], correct: false, why: whyWrong[k] },
    )
    cands.push({
      text: `Compare the units that already use each treatment, and skip the assignment step — the groups are large enough that differences will average out.`,
      correct: false,
      why: 'Groups that form themselves never average out: whatever made a unit end up in its group travels with it into the comparison. Random assignment is not a formality, it is the only thing that makes the two groups comparable in every respect but one.',
    })
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${s.goal(y, n)}\n\nWhich design should be used, and why?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two questions decide it. Can a single unit take **both** treatments (or is there a natural pairing of two near-identical units)? If so, matched pairs — the tightest control there is. If not: is there a variable known to be related to the response that you could group on? If so, block on it; if not, a completely randomized design is the right answer, not a lazy one.',
        'Blocking is not free — it is worth its cost only when the blocking variable actually drives the response. And "the units already differ, so compare them as they are" is never one of the three answers.',
      ],
      solution: `**${options[correct]}** — ${DESIGN_LABEL[s.right]}.\n\n| design | use it when | what it buys |\n| --- | --- | --- |\n| completely randomized | the units are alike, or nothing known is related to the response | the simplest valid comparison |\n| randomized block | a known variable is related to the response and not affected by the treatment | that variable's variation is removed from the comparison |\n| matched pairs | one unit can take both treatments, or two units pair naturally | the tightest control of all — the unit is its own comparison |\n\nEvery one of the three randomizes; they differ only in *what the randomization is done within*. All three are experiments, and all three license a causal reading. The design that does **not** randomize is not a fourth option — it is an observational study with a confound waiting in it.`,
      misconception: 'Treating blocking as always better. Blocking on a variable unrelated to the response costs complexity and buys nothing; and where one unit can take both treatments, matched pairs beats both of the others.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — what to block on
// ---------------------------------------------------------------------------------------------

interface BlockScenario {
  setting: (y: Yard, n: number) => string
  treatment: string
  response: string
  /** Related to the response, not affected by the treatment. */
  right: string
  rightWhy: string
  /** The response itself, or a variable measured after the treatment. */
  responseLike: string
  /** Recorded, but unrelated to the response. */
  irrelevant: string
  /** Affected by the treatment. */
  downstream: string
}

const BLOCK_SCENARIOS: readonly BlockScenario[] = [
  {
    setting: (y, n) => `${y.yard} will assign ${fmtInt(n)} transits on ${y.lane} to one of two radiator coatings and measure the peak heat-sink load on each.`,
    treatment: 'radiator coating',
    response: 'peak heat-sink load',
    right: 'hull class, because heavy freighters run far hotter than light ones whatever coating they carry',
    rightWhy: 'Hull class is strongly related to heat-sink load, it is fixed before the trial, and no coating can change it. Grouping on it removes hull-class variation from the comparison instead of leaving it in as noise.',
    responseLike: 'the peak heat-sink load recorded on the transit',
    irrelevant: "the initial letter of the master's surname",
    downstream: 'the radiator surface temperature measured during the transit',
  },
  {
    setting: (y, n) => `${y.squadron} will assign ${fmtInt(n)} convoy legs on ${y.lane} to escorted or unescorted and count the off-nominal advisories filed on each.`,
    treatment: 'escort',
    response: 'advisory count',
    right: 'the Mark band of the leg, because advisory rates are known to run far higher on the outer Marks than the inner ones',
    rightWhy: 'Mark band is strongly related to advisory count, it is fixed by the schedule before any assignment, and an escort cannot change which Marks a leg crosses. Grouping on it removes that variation from the comparison.',
    responseLike: 'the number of advisories the leg filed',
    irrelevant: 'the alphabetical position of the lead hull in the register',
    downstream: 'the formation spacing the convoy actually held, which the escort itself changes',
  },
  {
    setting: (y, n) => `${y.yard} will assign ${fmtInt(n)} berthings to the new docking protocol or the old and time each one.`,
    treatment: 'docking protocol',
    response: 'berthing time',
    right: 'the crew on the deck, because berthing time varies more between crews than between anything else recorded',
    rightWhy: 'Crew is strongly related to berthing time, it is settled by the roster before the trial, and the protocol does not change who is on the deck. Blocking by crew removes the largest known source of variation.',
    responseLike: 'the time the berthing took',
    irrelevant: 'the berth number the hull was allocated at random',
    downstream: 'the number of thruster corrections used on approach, which the protocol itself changes',
  },
] as const

export const blockingRationale = defineGenerator({
  id: 'act-3/blocking-rationale',
  label: 'What to block on',
  ap_topics: ['3.6'],
  skills: ['1', '4'],
  generate(rng) {
    const y = pickContext(rng, YARDS)
    const s = pickContext(rng, BLOCK_SCENARIOS)
    const n = retry(rng, (r) => 4 * r.int(8, 25), (v) => !reservedCount(v))
    const cands: Candidate[] = [
      { text: `Block on **${s.right}**.`, correct: true, why: null },
      {
        text: `Block on **${s.responseLike}** — group the units by how they turn out, so that like is compared with like.`,
        correct: false,
        why: `That is the response. Blocks must be formed **before** the treatments are assigned, from what is already true of the units. Grouping units by their outcome and then comparing outcomes inside those groups guarantees a meaningless answer.`,
      },
      {
        text: `Block on **${s.irrelevant}** — any grouping of the units makes the comparison tighter.`,
        correct: false,
        why: `Blocking on a variable unrelated to ${s.response} buys nothing. It costs a more complicated assignment and a more complicated analysis, and removes no variation, because there is none associated with that variable to remove.`,
      },
      {
        text: `Block on **${s.downstream}** — it is measured on every unit and it clearly matters.`,
        correct: false,
        why: `It matters, but ${s.treatment} changes it. A blocking variable must be unaffected by the treatment; grouping on something the treatment moves mixes part of the treatment effect into the blocks and hides it.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${s.setting(y, n)}\n\nThe trial will be blocked before ${s.treatment} is assigned by lot within each block. Which variable should the blocks be formed on?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'A blocking variable must pass three tests: it is known **before** the assignment, it is **related to the response**, and it is **not affected by the treatment**. Check the candidates against all three, in that order.',
        `The response here is ${s.response}. Any candidate that *is* the response, or that the ${s.treatment} can move, fails the third test — and any candidate unrelated to the response fails the second.`,
      ],
      solution: `**Block on ${s.right}.**\n\n${s.rightWhy}\n\nThe three failures on the list are the three standard ones:\n\n- Blocking on the **response** (${s.responseLike}) — blocks have to exist before the units are treated, and this one does not exist until afterwards.\n- Blocking on something **irrelevant** (${s.irrelevant}) — costs complexity, removes no variation.\n- Blocking on something the **treatment changes** (${s.downstream}) — buries part of the effect you are trying to measure inside the block structure.\n\nBlocking never changes what a comparison *means*; it changes how precisely you can see it. The treatment is still assigned at random — within each block.`,
      misconception: 'Blocking on the response, or on anything measured after the treatment. A block is a property of the units as they were before anything was done to them.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — which principle is missing?
// ---------------------------------------------------------------------------------------------

type Principle = 'comparison' | 'random assignment' | 'control' | 'replication' | 'blinding'

interface MissingScenario {
  missing: Principle
  trial: (y: Yard, n: number) => string
  bought: string
}

const MISSING_SCENARIOS: readonly MissingScenario[] = [
  {
    missing: 'comparison',
    trial: (y, n) => `${y.yard} fitted the new high-emissivity coating to all ${fmtInt(n)} hulls in the queue, flew them, and reported that the mean peak heat-sink load came in below the class table figure.`,
    bought: 'a group flown on the standard coating over the same quarter, so the new coating could be measured against something that experienced the same traffic, debris and schedule',
  },
  {
    missing: 'random assignment',
    trial: (y, n) => `${y.yard} offered the new coating to any master who wanted it; ${fmtInt(n)} took it up and the rest flew on the standard grey. The two groups were compared at the end of the quarter.`,
    bought: 'two groups alike in every respect but the coating, so that whatever made a master volunteer — a hot-running hull, a careful operator, a wealthy house — was scattered evenly instead of piling up on one side',
  },
  {
    missing: 'control',
    trial: (y, n) => `${y.squadron} flew ${fmtInt(n)} legs with the new formation order and compared them against the fleet-wide advisory figure published three seasons ago.`,
    bought: 'a comparison group flown under the old order in the same quarter, so that the season, the traffic and the debris conditions were held fixed across the comparison instead of drifting between it',
  },
  {
    missing: 'replication',
    trial: (y, n) => `${y.yard} flew exactly one transit on the new coating and one on the standard, and reported the difference between the two heat-sink loads. (${fmtInt(n)} further transits were available but not used.)`,
    bought: 'enough units on each treatment for the difference between the groups to be distinguishable from the difference between any two transits, which is large even when nothing is done differently',
  },
  {
    missing: 'blinding',
    trial: (y, n) => `${y.yard} assigned ${fmtInt(n)} berthings by lot to the new docking protocol or the old. The same deck officer ran every berthing, knew which protocol was in force, and read the stopwatch.`,
    bought: 'a timer who did not know which protocol was in force, so that the measurement could not be shaded — consciously or not — by which answer the yard was hoping for',
  },
] as const

const PRINCIPLE_TEXT: Record<Principle, string> = {
  comparison: '**Comparison** — there is no second group to measure the treatment against.',
  'random assignment': '**Random assignment** — the groups were not formed by lot, so they may differ in more than the treatment.',
  control: '**Control** — the comparison is made against conditions that were not held fixed.',
  replication: '**Replication** — there are too few units per treatment to separate the effect from ordinary unit-to-unit variation.',
  blinding: '**Blinding** — someone who could influence the measurement knew which treatment each unit received.',
}

export const controlReplication = defineGenerator({
  id: 'act-3/control-replication',
  label: 'Which principle is missing?',
  ap_topics: ['3.5'],
  skills: ['1', '4'],
  generate(rng) {
    const y = pickContext(rng, YARDS)
    const s = pickContext(rng, MISSING_SCENARIOS)
    const n = retry(rng, (r) => r.int(14, 64), (v) => !reservedCount(v))
    const others = rng.shuffle((['comparison', 'random assignment', 'control', 'replication', 'blinding'] as Principle[]).filter((p) => p !== s.missing)).slice(0, 2)
    const cands: Candidate[] = [
      { text: PRINCIPLE_TEXT[s.missing], correct: true, why: null },
      ...others.map((p) => ({
        text: PRINCIPLE_TEXT[p],
        correct: false,
        why: `Read the trial again: ${p === 'comparison' ? 'there is a second group here' : p === 'random assignment' ? 'the assignment described is by lot' : p === 'control' ? 'the comparison conditions described are the same for both groups' : p === 'replication' ? 'there are plenty of units on each treatment' : 'nobody who could shade the measurement is said to know the assignment'}. The defect is elsewhere.`,
      })),
      {
        text: `**Control** — there is no group left untreated, and a trial needs a group that receives nothing.`,
        correct: false,
        why: 'This is the common misreading of "control". A control group is the group that receives the *baseline* condition, and the baseline is very often the standard treatment rather than nothing at all — the standard coating, the old protocol, the existing fit. What "control" requires is that everything except the treatment be held fixed across the comparison, not that one group be left alone.',
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${s.trial(y, n)}\n\nWhich principle of experimental design is missing, and what would it have bought?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Run the checklist against the description, one item at a time: is there a second group (comparison); was the assignment made by lot (random assignment); is everything but the treatment held fixed across the groups (control); are there enough units per treatment (replication); could anyone shade the measurement (blinding)?',
        'Do not stop at the first thing that feels wrong. The question asks which principle is missing *and* what it would have bought — so the right option is the one whose absence explains why this particular result cannot be read as a treatment effect.',
      ],
      solution: `**${PRINCIPLE_TEXT[s.missing]}**\n\nWhat it would have bought: ${s.bought}.\n\nOne correction worth keeping. A **control group** is not "the group that gets nothing" — it is the group held at the baseline condition, and in a working trial the baseline is usually the *existing* fit, order or protocol. Comparing a new coating against no coating at all would answer a question nobody asked.`,
      misconception: 'Reading "control group" as "untreated group". A control receives the standard condition, and what control really demands is that everything other than the treatment be held fixed across the comparison.',
    }
  },
})
