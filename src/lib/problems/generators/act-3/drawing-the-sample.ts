/**
 * act-3-02 · Drawing the Sample — drills. AP 3.3: simple random, stratified, cluster and systematic
 * samples; reading a line of random digits; what varies within a group and what varies between groups;
 * what each design buys and what it costs in link time.
 *
 *   act-3/identify-method       choice    name the design from a described procedure
 *   act-3/srs-random-digits     numeric   read two-digit labels off a random-digit line
 *   act-3/stratify-or-cluster   choice    stratify or cluster, and why — from the structure of the variation
 *   act-3/design-justification  interp    defend a design: method, fit to the goal, cost, trade-off
 *   act-3/sampling-cost         numeric   link-hours a design costs, or the n a budget buys
 *
 * Nothing here reuses the Act's own survey plan (40 / 15-per-stratum / 6 convoys against the 260-master
 * frame). Every framing is another corridor, another register, another squadron.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { fmt, fmtInt } from '@/lib/stats/format'
import { OWNERS } from '@/instruments/act-3/data'
import { designJustification, type SampleMethod } from './_rubrics'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

interface Corridor {
  lane: string
  office: string
  port: string
  /** The cluster unit on this corridor. */
  group: string
  groups: string
}

const CORRIDORS: readonly Corridor[] = [
  { lane: 'the Adrastea feeder lane', office: 'the Adrastea Lane Office', port: 'Adrastea Transfer', group: 'convoy', groups: 'convoys' },
  { lane: 'the Thebe–Amalthea shuttle run', office: 'the Thebe Yard traffic office', port: 'Thebe Yards', group: 'berth block', groups: 'berth blocks' },
  { lane: 'the Elara transfer corridor', office: 'the Elara Station berth office', port: 'Elara Station', group: 'convoy', groups: 'convoys' },
  { lane: 'the Carme outer loop', office: 'the Carme relay office', port: 'Carme Relay', group: 'sailing group', groups: 'sailing groups' },
] as const

const RESERVED_COUNTS = new Set([212, 260, 924, 88, 110, 62, 40])
const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — name the sampling method
// ---------------------------------------------------------------------------------------------

type Method = 'SRS' | 'stratified' | 'cluster' | 'systematic' | 'convenience' | 'voluntary response'

const METHOD_NAME: Record<Method, string> = {
  SRS: 'A simple random sample',
  stratified: 'A stratified random sample',
  cluster: 'A cluster sample',
  systematic: 'A systematic sample',
  convenience: 'A convenience sample',
  'voluntary response': 'A voluntary response sample',
}

interface MethodBits {
  /** The described procedure. */
  procedure: string
  /** "what that method would have looked like here", per wrong option. */
  wouldHaveBeen: Record<Method, string>
}

function methodBits(m: Method, c: Corridor, n: number, N: number, k: number, step: number): MethodBits {
  const perClass = Math.round(n / 3)
  const wouldHaveBeen: Record<Method, string> = {
    SRS: `A simple random sample would have numbered all ${fmtInt(N)} masters on the register and drawn ${fmtInt(n)} labels at random, so that every group of ${fmtInt(n)} masters was equally likely.`,
    stratified: `A stratified sample would have split the register by owner class — ${OWNERS.join(', ')} — and drawn a separate random sample, about ${fmtInt(perClass)}, from **every** class.`,
    cluster: `A cluster sample would have numbered the ${c.groups}, drawn ${fmtInt(k)} of them at random and contacted **every** master in the chosen ${c.groups}.`,
    systematic: `A systematic sample would have picked a random start in the first ${fmtInt(step)} entries of the register and then taken every ${fmtInt(step)}th entry down the list.`,
    convenience: `A convenience sample would have taken whoever was easiest to reach — the masters already on the link, or the ones berthed nearest the office.`,
    'voluntary response': `A voluntary response sample would have posted a notice and taken whoever chose to answer it.`,
  }
  const procedure: Record<Method, string> = {
    SRS: `${c.office} numbered all ${fmtInt(N)} masters on ${c.lane}'s register from 1 to ${fmtInt(N)}, ran a random-digit line down the list, and contacted the first ${fmtInt(n)} distinct labels it produced.`,
    stratified: `${c.office} split ${c.lane}'s register of ${fmtInt(N)} masters into three lists — ${OWNERS.join(', ')} — and drew ${fmtInt(perClass)} names at random from each of the three.`,
    cluster: `${c.office} numbered the ${fmtInt(Math.max(8, Math.round(N / 7)))} ${c.groups} running ${c.lane} this quarter, drew ${fmtInt(k)} of them at random, and contacted every master in those ${fmtInt(k)} ${c.groups}.`,
    systematic: `${c.office} took ${c.lane}'s register of ${fmtInt(N)} masters in berth order, picked a random start among the first ${fmtInt(step)} entries, and then contacted every ${fmtInt(step)}th master down the list.`,
    convenience: `A clerk at ${c.port} worked down the masters already holding an open link to the office and kept asking until ${fmtInt(n)} of them had answered, because they were the quickest to reach.`,
    'voluntary response': `${c.office} posted the four questions on ${c.port}'s dock board with a return address, and used the ${fmtInt(n)} replies that came back.`,
  }
  return { procedure: procedure[m], wouldHaveBeen }
}

export const identifyMethod = defineGenerator({
  id: 'act-3/identify-method',
  label: 'Name the sampling method',
  ap_topics: ['3.3'],
  skills: ['1'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const methods: Method[] = ['SRS', 'stratified', 'cluster', 'systematic', 'convenience', 'voluntary response']
    const m = pickContext(rng, methods)
    const { n, N, k, step } = retry(
      rng,
      (r) => {
        const n = 3 * r.int(9, 25)
        const N = n * r.int(5, 11)
        return { n, N, k: r.int(4, 9), step: Math.max(4, Math.round(N / n)) }
      },
      ({ n, N, step }) => !reservedCount(n) && !reservedCount(N) && step >= 4 && step <= 12,
    )
    const bits = methodBits(m, c, n, N, k, step)
    const distractors = rng.shuffle(methods.filter((x) => x !== m)).slice(0, 3)
    const cands: Candidate[] = [
      { text: METHOD_NAME[m], correct: true, why: null },
      ...distractors.map((d) => ({ text: METHOD_NAME[d], correct: false, why: bits.wouldHaveBeen[d] })),
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${bits.procedure}\n\nWhich sampling method is this?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Three questions separate the four random designs: were the units divided into groups first; was a sample taken from **every** group or only from **some** groups; and was the selection random at all.',
        'Splitting the register into groups is not by itself stratification. Stratified draws from every group; cluster draws some whole groups and takes everyone inside them. If nobody was chosen by a random mechanism, the design is convenience or voluntary response, and the difference is who did the choosing.',
      ],
      solution: `**${METHOD_NAME[m]}.**\n\n${bits.wouldHaveBeen[m]} That is what was done here.\n\nThe four random designs differ only in *what* gets randomized:\n\n- **Simple random** — labels, drawn straight from the whole list.\n- **Stratified** — a separate random draw inside **every** group, so each group is certain to appear.\n- **Cluster** — a random draw of whole **groups**, with everyone inside the chosen groups contacted.\n- **Systematic** — one random start, then a fixed step down the list.\n\nConvenience and voluntary response randomize nothing: in the first the investigator picks whoever is easiest, in the second the units pick themselves.`,
      misconception: '"Stratified" used for any design that mentions groups. Stratification requires a draw from *every* stratum; drawing some whole groups instead is a cluster sample, and the two behave very differently.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — read the random-digit line
// ---------------------------------------------------------------------------------------------

interface DigitWalk {
  digits: number[]
  /** One entry per pair read, in order. */
  steps: { pair: string; label: number; status: 'selected' | 'out of range' | 'repeat'; ordinal?: number }[]
  selected: number[]
}

function walkDigits(rng: Rng, N: number, k: number): DigitWalk {
  const digits: number[] = []
  const steps: DigitWalk['steps'] = []
  const selected: number[] = []
  while (selected.length < k && steps.length < 30) {
    const a = rng.int(0, 9)
    const b = rng.int(0, 9)
    digits.push(a, b)
    const label = 10 * a + b
    const pair = `${a}${b}`
    if (label < 1 || label > N) steps.push({ pair, label, status: 'out of range' })
    else if (selected.includes(label)) steps.push({ pair, label, status: 'repeat' })
    else {
      selected.push(label)
      steps.push({ pair, label, status: 'selected', ordinal: selected.length })
    }
  }
  // Two spare pairs so the line does not stop exactly on the answer.
  for (let i = 0; i < 2; i++) digits.push(rng.int(0, 9), rng.int(0, 9))
  return { digits, steps, selected }
}

function groupDigits(digits: readonly number[]): string {
  const s = digits.join('')
  return (s.match(/.{1,5}/g) ?? [s]).join(' ')
}

export const srsRandomDigits = defineGenerator({
  id: 'act-3/srs-random-digits',
  label: 'A simple random sample from random digits',
  ap_topics: ['3.3'],
  skills: ['3'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const askPairs = rng.bool()
    const { N, k, walk } = retry(
      rng,
      (r) => {
        const N = r.int(40, 99)
        const k = r.int(3, 5)
        return { N, k, walk: walkDigits(r, N, k) }
      },
      // At least one pair must be thrown away, or the drill never exercises the skip rules.
      ({ k, walk }) => walk.selected.length === k && walk.steps.length > k && walk.steps.length <= 18,
    )
    const line = groupDigits(walk.digits)
    const pairsNeeded = walk.steps.length
    const kth = walk.selected[k - 1]
    const ordinalWord = ['first', 'second', 'third', 'fourth', 'fifth'][k - 1]
    const tableRows = walk.steps
      .map((s, i) => `| ${i + 1} | ${s.pair} | ${s.status === 'selected' ? `hull ${s.label} — the ${['1st', '2nd', '3rd', '4th', '5th'][(s.ordinal ?? 1) - 1]} selected` : s.status === 'repeat' ? `${s.label} — already chosen, skip` : `${s.label} — outside 01–${fmtInt(N)}, skip`} |`)
      .join('\n')
    const walkTable = `| pair | digits | what happens |\n| --- | --- | --- |\n${tableRows}`
    const setup = `${c.office} has numbered the ${fmtInt(N)} hulls on ${c.lane}'s register **01** through **${String(N).padStart(2, '0')}** and will take a simple random sample of ${fmtInt(k)} of them. Read the random-digit line below in **two-digit pairs, left to right**. A pair that is outside 01–${String(N).padStart(2, '0')} is skipped; a pair that repeats a hull already chosen is skipped.\n\n\`${line}\``

    if (askPairs) {
      return {
        prompt: `${setup}\n\nHow many pairs must be read before the sample of ${fmtInt(k)} hulls is complete? Give a whole number of pairs.`,
        answer: numericAnswer(pairsNeeded, 'count'),
        hints: [
          'Every pair is read, but not every pair selects. Count the pairs you *read*, including the ones you throw away — the wasted reads are exactly what makes a two-digit scheme expensive when N is small.',
          `Work along the line: ${walk.steps.slice(0, 3).map((s) => s.pair).join(', ')}, … and stop at the pair that produces the ${ordinalWord} distinct hull in 01–${String(N).padStart(2, '0')}.`,
          `Count the rows of the walk up to and including the ${ordinalWord} selection.`,
        ],
        solution: `${walkTable}\n\nThe ${ordinalWord} hull is chosen on pair number **${fmt(pairsNeeded, 0)}**, so ${fmt(pairsNeeded, 0)} pairs must be read. The sample is {${walk.selected.join(', ')}}.\n\nOf the ${fmt(pairsNeeded, 0)} pairs read, ${fmtInt(walk.steps.filter((s) => s.status === 'out of range').length)} fell outside 01–${String(N).padStart(2, '0')} and ${fmtInt(walk.steps.filter((s) => s.status === 'repeat').length)} repeated a hull already chosen.`,
        misconception: 'Counting only the pairs that selected a hull. The question asks how far down the line you must read, and the skipped pairs were read too.',
      }
    }
    return {
      prompt: `${setup}\n\nWhich hull number is the **${ordinalWord}** one selected? Give the hull number.`,
      answer: numericAnswer(kth, 'count'),
      hints: [
        'Split the line into two-digit pairs before you do anything else, then apply the two skip rules in order: out of range first, then already chosen.',
        `The first pairs are ${walk.steps.slice(0, 3).map((s) => s.pair).join(', ')}, … Keep a running list of the hulls chosen so far so you can spot a repeat.`,
        `Work down to the ${ordinalWord} distinct label in 01–${String(N).padStart(2, '0')}.`,
      ],
      solution: `${walkTable}\n\nThe sample, in the order drawn, is {${walk.selected.join(', ')}}, so the ${ordinalWord} hull selected is **${fmt(kth, 0)}**.\n\nThe two skip rules are what make this a *simple random* sample: skipping out-of-range pairs keeps every hull equally likely, and skipping repeats makes it a sample without replacement of ${fmtInt(k)} distinct hulls.`,
      misconception: 'Counting a skipped pair as a selection — usually a repeat, which looks like a hull number because it is one. A hull already in the sample cannot be selected twice.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — stratify or cluster?
// ---------------------------------------------------------------------------------------------

export const stratifyOrCluster = defineGenerator({
  id: 'act-3/stratify-or-cluster',
  label: 'Stratify or cluster?',
  ap_topics: ['3.3'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const stratifyIsRight = rng.bool()
    const { N, nGroups, n } = retry(
      rng,
      (r) => {
        const nGroups = r.int(14, 44)
        const N = nGroups * r.int(5, 9)
        return { N, nGroups, n: 3 * r.int(8, 22) }
      },
      ({ N, n }) => !reservedCount(N) && !reservedCount(n) && n < N / 3,
    )
    const structure = stratifyIsRight
      ? `Owner class runs the variable: ${OWNERS[0]} masters answer almost alike, ${OWNERS[1]} masters answer almost alike, independents answer almost alike — but the three classes answer very differently from one another. The ${fmtInt(nGroups)} ${c.groups}, by contrast, are mixed: each one carries a little of every class, so one ${c.group} looks much like the next.`
      : `The ${fmtInt(nGroups)} ${c.groups} are mixed: each one carries a little of every owner class, every hull age and every cargo, so one ${c.group} looks much like the next and much like the corridor as a whole. What varies is *inside* a ${c.group}, not between ${c.groups}.`
    const goal = stratifyIsRight
      ? `an estimate that is precise for the corridor **and** reportable for each owner class separately`
      : `the cheapest usable estimate for the corridor, given that a whole ${c.group} shares one tight-beam link`
    const cands: Candidate[] = [
      {
        text: `**Stratified**, by owner class — because the classes differ from one another while masters within a class are alike, so sampling every class removes the between-class variation from the estimate.`,
        correct: stratifyIsRight,
        why: stratifyIsRight ? null : `Stratifying by owner class buys nothing here: the ${c.groups} are already mixed, so no grouping in this problem separates high answers from low ones. You would pay for three separate draws and get the precision of one.`,
      },
      {
        text: `**Cluster**, by ${c.group} — because each ${c.group} is a miniature of the corridor, so a few whole ${c.groups} stand in for the whole register at a fraction of the link cost.`,
        correct: !stratifyIsRight,
        why: !stratifyIsRight ? null : `A cluster sample here is a gamble on which classes happen to be aboard the ${c.groups} you draw. When the groups differ from one another, drawing a few whole groups can miss a class entirely — which is the one thing the goal says you may not do.`,
      },
      {
        text: `**Stratified**, by ${c.group} — because ${c.groups} are the natural grouping on this corridor and every one of them should be represented.`,
        correct: false,
        why: `Stratifying on a variable that does not separate the responses costs you the extra draws and buys you no precision. Strata are worth having only when units are alike *within* a stratum and the strata differ *between* them.`,
      },
      {
        text: `**Cluster**, by owner class — because the three classes partition the register, so drawing one or two classes whole is cheaper than drawing from all three.`,
        correct: false,
        why: `Taking whole owner classes is the worst of both worlds: the classes are exactly the thing that differs, so dropping one throws the estimate off by however much that class differs. A cluster is only safe when it is a miniature of the population.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${c.office} must estimate a share for the ${fmtInt(N)} masters on ${c.lane}'s register, using about ${fmtInt(n)} contacts. The register is organised into ${fmtInt(nGroups)} ${c.groups}, and every master carries one of three owner classes (${OWNERS.join(', ')}).\n\n${structure}\n\nThe stated goal is ${goal}.\n\nWhich design fits, and why?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'One rule, two halves. **Stratify** when units are alike *within* a group and the groups differ from one another — you sample every group and remove that between-group difference from the estimate. **Cluster** when each group is a miniature of the population — you draw a few whole groups and save the travel.',
        `Ask which grouping in this problem actually separates high answers from low ones. Then ask whether the design draws from *every* group of that kind or only from *some* of them.`,
      ],
      solution: `**${options[correct]}**\n\nThe structure of the variation chooses the design:\n\n| if … | then | because |\n| --- | --- | --- |\n| units alike **within** a group, groups **differ** | stratify, sample every group | the between-group difference is removed from the estimate rather than left in it |\n| each group is a **miniature** of the population | cluster, draw whole groups | one group already contains the variation, so a few groups carry it cheaply |\n\nHere ${stratifyIsRight ? 'owner class is the variable that separates the answers, and the ' + c.groups + ' do not — so owner class is the stratifying variable and the ' + c.groups + ' are useless as strata.' : 'nothing separates one ' + c.group + ' from another: each is a miniature of the register, which is precisely the condition that makes clustering safe and cheap.'}`,
      misconception: 'Choosing stratified because the problem mentions groups. The grouping only helps if it lines up with the variation — and stratifying means drawing from *every* stratum, not from a favourite one.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Interpretation — defend the design
// ---------------------------------------------------------------------------------------------

/** Link-time model for this corridor: a first contact costs `first` minutes, a shared follow-up `follow`. */
const LINK = { first: 55, follow: 20 } as const

const JUSTIFY_METHODS: readonly SampleMethod[] = ['SRS', 'stratified', 'cluster']

export const designJustificationDrill = defineGenerator({
  id: 'act-3/design-justification',
  label: 'Defend the design you chose',
  ap_topics: ['3.3'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const method = pickContext(rng, JUSTIFY_METHODS)
    const d = retry(
      rng,
      (r) => {
        const N = r.int(230, 620)
        const perStratum = r.int(12, 22)
        const nSrs = 3 * r.int(11, 20)
        const kClusters = r.int(5, 9)
        const perCluster = r.int(5, 8)
        return { N, perStratum, nSrs, kClusters, perCluster }
      },
      ({ N, nSrs, perStratum, kClusters, perCluster }) =>
        !reservedCount(N) && !reservedCount(nSrs) && !reservedCount(3 * perStratum) && kClusters * perCluster >= 28 && kClusters * perCluster <= 64,
    )
    const { N, perStratum, nSrs, kClusters, perCluster } = d
    const nStrat = 3 * perStratum
    const nClust = kClusters * perCluster
    const minutes =
      method === 'cluster'
        ? kClusters * LINK.first + kClusters * (perCluster - 1) * LINK.follow
        : (method === 'stratified' ? nStrat : nSrs) * LINK.first
    const hours = minutes / 60
    const n = method === 'cluster' ? nClust : method === 'stratified' ? nStrat : nSrs
    const costBasis =
      method === 'cluster'
        ? `${fmtInt(kClusters)} first contacts at ${LINK.first} minutes and ${fmtInt(kClusters * (perCluster - 1))} follow-ups at ${LINK.follow} minutes on the shared link`
        : `${fmtInt(n)} contacts at ${LINK.first} minutes each`
    const benefit =
      method === 'cluster'
        ? `takes ${fmtInt(kClusters)} whole ${c.groups} and asks everyone aboard them, sharing one tight-beam link per ${c.group}`
        : method === 'stratified'
          ? `draws ${fmtInt(perStratum)} masters from each of the three owner classes, so ${OWNERS.join(', ')} masters are all in the sample in known numbers`
          : `gives each of the ${fmtInt(N)} masters on the register the same chance of selection, with no structure imposed on the draw`
    const goal =
      method === 'cluster'
        ? 'the cheapest usable estimate for the corridor'
        : method === 'stratified'
          ? 'an estimate that holds for all three owner classes'
          : 'an unbiased estimate for the register with the simplest possible defence of the draw'
    const tradeoff =
      method === 'cluster'
        ? `masters in one ${c.group} see the same stretch of the corridor, so their answers are correlated and the estimate is noisier than ${fmtInt(nClust)} independent contacts would be`
        : method === 'stratified'
          ? `more link time than a cluster sample of ${fmtInt(kClusters)} ${c.groups} would cost, and it needs an owner class recorded against every name on the register`
          : `it can miss a small owner class entirely by luck of the draw, and it costs full link time for every contact`
    const answer = designJustification({ method, benefit, goal, hours, costBasis, tradeoff })
    return {
      prompt: `${c.office} will survey ${c.lane}'s register of ${fmtInt(N)} masters. Comms costs are fixed: **${LINK.first} minutes** of tight-beam link for a first contact, and **${LINK.follow} minutes** for each further master reached on a link already open to the same ${c.group}.\n\nThree plans are costed:\n\n| design | contacts | link time |\n| --- | --- | --- |\n| simple random sample | ${fmtInt(nSrs)} | ${fmt((nSrs * LINK.first) / 60, 1)} h |\n| stratified by owner class, ${fmtInt(perStratum)} per class | ${fmtInt(nStrat)} | ${fmt((nStrat * LINK.first) / 60, 1)} h |\n| cluster, ${fmtInt(kClusters)} ${c.groups} of ${fmtInt(perCluster)} | ${fmtInt(nClust)} | ${fmt((kClusters * LINK.first + kClusters * (perCluster - 1) * LINK.follow) / 60, 1)} h |\n\nThe goal you have been given is **${goal}**. You choose the **${method === 'SRS' ? 'simple random' : method}** sample.\n\nIn two or three sentences, defend it: name the method, say why it suits that goal, state what it costs in link time, and name the trade-off you are accepting.`,
      answer,
      hints: [
        'A design defence has four moving parts and each is one clause: what you did, what it buys for *this* goal, what it costs, and what you gave up to get it. A defence with no cost in it is a wish, not a plan.',
        `Your design contacts ${fmtInt(n)} masters. Price it from the table — ${costBasis} — and then say what the *other* two designs would have bought you instead.`,
      ],
      solution: `**${answer.exemplar}**\n\n$$\\text{link time} = ${method === 'cluster' ? `${kClusters} \\times ${LINK.first} + ${kClusters * (perCluster - 1)} \\times ${LINK.follow}` : `${n} \\times ${LINK.first}`} = ${fmtInt(minutes)}\\text{ min} = ${fmt(hours, 1)}\\text{ h}$$\n\nThe commonest incomplete answer names the method and stops. The method alone is not a justification: the same three words defend a good plan and a bad one. What distinguishes them is the fit to the stated goal and the price.`,
      misconception: 'Defending a design by describing it. A justification has to connect the design to the *stated goal* and to price it — otherwise no one can tell whether you chose it or it chose you.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Numeric — link-hours, or the n a budget buys
// ---------------------------------------------------------------------------------------------

export const samplingCost = defineGenerator({
  id: 'act-3/sampling-cost',
  label: 'What the design costs in link time',
  ap_topics: ['3.3'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const askHours = rng.bool()
    const d = retry(
      rng,
      (r) => {
        const first = 5 * r.int(8, 14)
        const follow = 5 * r.int(3, 5)
        const k = r.int(5, 10)
        const per = r.int(4, 9)
        const budgetHours = r.int(18, 46)
        return { first, follow, k, per, budgetHours }
      },
      ({ first, follow, k, per, budgetHours }) => follow < first - 15 && k * per >= 26 && !reservedCount(k * per) && Math.floor((budgetHours * 60) / first) >= 12,
    )
    const { first, follow, k, per, budgetHours } = d

    if (askHours) {
      const minutes = k * first + k * (per - 1) * follow
      const hours = minutes / 60
      return {
        prompt: `On ${c.lane} a tight-beam contact costs **${fmtInt(first)} minutes** of link time. Once a link is open to a ${c.group}, each further master reached on that same link costs only **${fmtInt(follow)} minutes**.\n\n${c.office} plans a cluster sample: **${fmtInt(k)} ${c.groups}** drawn at random, **${fmtInt(per)} masters** contacted in each.\n\nHow many hours of link time does the plan cost? Give your answer in hours to one decimal place.`,
        answer: numericAnswer(hours, 'other', { digits: 1, units: 'hours' }),
        hints: [
          'Each cluster costs one full contact plus a run of cheap follow-ups. Count the two kinds of contact separately before you convert anything to hours.',
          `Full contacts: one per ${c.group}, so ${fmtInt(k)} of them at ${fmtInt(first)} minutes. Follow-ups: ${fmtInt(per)} − 1 = ${fmtInt(per - 1)} in each of the ${fmtInt(k)} ${c.groups}, at ${fmtInt(follow)} minutes.`,
          `$(${k} \\times ${first} + ${k * (per - 1)} \\times ${follow}) / 60$, to one decimal place.`,
        ],
        solution: `$$${k} \\times ${first} + ${k}(${per} - 1) \\times ${follow} = ${fmtInt(k * first)} + ${fmtInt(k * (per - 1) * follow)} = ${fmtInt(minutes)}\\text{ minutes}$$\n\n$$\\frac{${minutes}}{60} = ${fmt(hours, 2)}\\text{ h}$$\n\n**${fmt(hours, 1)} hours** for ${fmtInt(k * per)} contacts. The same ${fmtInt(k * per)} masters drawn as a simple random sample would cost ${fmtInt(k * per)} full contacts — ${fmt((k * per * first) / 60, 1)} hours — because no two of them would share a link. That saving is the whole argument for clustering, and the price of it is that masters in one ${c.group} give correlated answers.`,
        misconception: `Charging the follow-up rate to every master in a ${c.group} and forgetting that the first contact on each link is a full-price one, or charging full price to all ${fmtInt(k * per)}.`,
      }
    }
    const budgetMin = budgetHours * 60
    const nAffordable = Math.floor(budgetMin / first)
    return {
      prompt: `On ${c.lane} a tight-beam contact costs **${fmtInt(first)} minutes** of link time, and a simple random sample gives no two masters a shared link — every contact is charged in full.\n\n${c.office} can spare **${fmtInt(budgetHours)} hours** of link time.\n\nHow many masters can a simple random sample contact within that budget? Give a whole number of masters.`,
      answer: numericAnswer(nAffordable, 'count'),
      hints: [
        'Put the budget and the unit cost in the same units before dividing, and remember that a part-finished contact buys nothing.',
        `${fmtInt(budgetHours)} hours is ${fmtInt(budgetMin)} minutes, and each contact costs ${fmtInt(first)} of them.`,
        `$\\lfloor ${budgetMin} / ${first} \\rfloor$.`,
      ],
      solution: `$$${budgetHours} \\times 60 = ${fmtInt(budgetMin)}\\text{ minutes}, \\qquad \\frac{${budgetMin}}{${first}} = ${fmt(budgetMin / first, 2)}$$\n\nA fraction of a contact is not a contact, so the budget buys **${fmt(nAffordable, 0)} masters**.\n\nA cluster design over ${fmtInt(k)} ${c.groups} would stretch the same budget much further — each shared follow-up costs ${fmtInt(follow)} minutes instead of ${fmtInt(first)} — at the cost of a noisier estimate, because masters in one ${c.group} are not independent of each other.`,
      misconception: 'Rounding the quotient up. Link time is a hard budget: you can only pay for whole contacts, so the count is rounded *down*.',
    }
  },
})
