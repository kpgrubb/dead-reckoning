/**
 * The interpretation rubric for act-10-01's mission beat — the answer given on the record at
 * Valhalla. Pure function returning an `InterpretationAnswer`; the exemplar passes its own rubric
 * (beats.test.ts).
 *
 * The beat asks for four things the hearing asks for, and they are the four this course has drilled
 * since MET 140:
 *   · the Type I error for this ship's test, in context, with what it costs;
 *   · the Type II error, likewise;
 *   · which of the two the level you set accepted more risk of;
 *   · the scope of the finding, and one limitation you would concede before a reviewer names it.
 *
 * Forbidden: that the case was proven, that failing to reject establishes a null, and that a
 * P-value is the probability the null is true. Those three are the sentences the Board's counsel
 * would most like to hear a naval officer say on a transcript.
 */
import { contextGroup } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { fmt } from '@/lib/stats'

const TYPE_I_DEFINITION: RubricPhrase[] = [
  /\btype\s*(?:i|1)\b(?!\s*i)[^.;]{0,150}\breject\w*[^.;]{0,70}\b(?:true|correct)\b/,
  /\btype\s*(?:i|1)\b(?!\s*i)[^.;]{0,150}\btrue\b[^.;]{0,50}\breject/,
  /\breject\w*[^.;]{0,60}\btrue\b[^.;]{0,70}\btype\s*(?:i|1)\b(?!\s*i)/,
  /\btype\s*(?:i|1)\b(?!\s*i)[^.;]{0,150}\bfalse (?:alarm|positive)\b/,
]

const TYPE_II_DEFINITION: RubricPhrase[] = [
  /\btype\s*(?:ii|2)\b[^.;]{0,150}\bnot reject\b/,
  /\bnot reject\b[^.;]{0,70}\bfalse\b[^.;]{0,70}\btype\s*(?:ii|2)\b/,
  /\btype\s*(?:ii|2)\b[^.;]{0,150}\bmiss\w*/,
  /\btype\s*(?:ii|2)\b[^.;]{0,150}\bfalse negative\b/,
]

const FORBIDDEN: ForbiddenPhrase[] = [
  {
    phrase: /\b(?:prove[dsn]?|proven|proof)\b/,
    label: 'Claims the case was proved',
    why: 'No test proves anything, and this is the one word a hostile reviewer is waiting for. The file carries evidence about rates, tables and differences. Say what the evidence is about and how strong it is, and let a court do the proving.',
  },
  {
    phrase: /\bnot reject\b[^.;]{0,45}\b(?:means|mean|proves|shows|establishes|so)\b[^.;]{0,35}\bnull\b[^.;]{0,25}\btrue\b/,
    label: 'Treats failing to reject as establishing the null',
    why: 'Failing to reject leaves the null standing as an unrefuted possibility. A Type II error is precisely the case where it should not have been left standing, and from the P-value alone the two are indistinguishable.',
  },
  {
    phrase: /\bprobability\b[^.;]{0,40}\bnull\b[^.;]{0,25}\btrue\b/,
    label: 'Reads the P-value as the probability the null is true',
    why: 'A P-value is computed inside the world the null describes: it is the probability of data this extreme if the null holds, not a probability about the null.',
  },
  {
    phrase: 'accept null',
    label: 'Accepts the null',
    why: 'We never accept a null. The available verdicts are reject and fail to reject.',
  },
]

export interface HearingArgs {
  /** The level the officer actually set, before the data. */
  alpha: number
  /** What a false alarm costs, in one clause. */
  typeIConsequence: string
  /** What a miss costs, in one clause. */
  typeIIConsequence: string
  /** The parameter the test is about. */
  parameter: string
  /** The population the test is about. */
  population: string
}

/**
 * The α that was set decides which error the officer accepted more risk of, so the group that
 * checks for it is built from the level rather than hard-coded: 0.01 buys down false alarms and
 * pays in misses; 0.05 is the other way round.
 */
export function hearingRubric({ alpha, typeIConsequence, typeIIConsequence, parameter, population }: HearingArgs): InterpretationAnswer {
  const strict = alpha <= 0.01
  const acceptedMore = strict ? 'the miss' : 'the false alarm'
  const boughtDown = strict ? 'false alarms' : 'misses'
  const alphaText = fmt(alpha, 2)

  const required: RubricGroup[] = [
    {
      label: 'Defines the Type I error for this test: rejecting a true null — a false alarm',
      phrasings: TYPE_I_DEFINITION,
      polarity: 'any',
      feedback: 'A Type I error here is rejecting the null when it is true: reporting that Perrine-beneficiary hulls are lost at a higher rate when in fact the two classes are lost at the same rate.',
    },
    {
      label: 'Defines the Type II error for this test: failing to reject a false null — a miss',
      phrasings: TYPE_II_DEFINITION,
      polarity: 'any',
      feedback: 'A Type II error is failing to reject the null when it is false: writing insufficient evidence although the rates really do differ.',
    },
    {
      label: 'Prices at least one of the two errors in this context',
      phrasings: [
        'accusation',
        'accuse',
        'scandal',
        'never command',
        'hearing',
        'insurer',
        'pension',
        'next nineteen',
        'nineteen hulls',
        'more hulls',
        'unreported',
        'go on',
        'crews',
        'diversion continue',
        'keep running',
        'more crews',
        'more people',
      ],
      polarity: 'any',
      minMatches: 1,
      feedback: `Attach a price. A false alarm means ${typeIConsequence}. A miss means ${typeIIConsequence}. An error with no consequence beside it is a definition and not an answer.`,
    },
    {
      label: `Says which error the level you set (α = ${alphaText}) accepted more risk of`,
      phrasings: [
        new RegExp(`\\balpha\\b[^.;]{0,60}${alphaText.replace('.', '\\.')}`),
        new RegExp(`${alphaText.replace('.', '\\.')}[^.;]{0,60}\\balpha\\b`),
        new RegExp(`\\b(?:chose|chosen|set|setting|adopted|signed)\\b[^.;]{0,50}${alphaText.replace('.', '\\.')}`),
        new RegExp(`${alphaText.replace('.', '\\.')}[^.;]{0,60}\\b(?:before|in advance|beforehand)\\b`),
        strict ? /\bone in a hundred\b/ : /\bone in twenty\b/,
      ],
      polarity: 'any',
      minMatches: 1,
      feedback: `Name the level and say what it bought. At α = ${alphaText} you bought down ${boughtDown} and accepted more risk of ${acceptedMore}, and that trade was made before the register was opened.`,
    },
    contextGroup('Names the scope: what the finding is about, and whom', [parameter, population], {
      minMatches: 2,
      feedback: `Say what and whom: the ${parameter} of ${population}. A finding with no population attached is a finding a reviewer can move.`,
    }),
    {
      label: 'Concedes one limitation of a named finding before a reviewer names it',
      phrasings: [
        'declared cargo',
        'declared',
        'manifest say',
        'cause code',
        'office word',
        'classification',
        'twelve hull',
        'one yard',
        'not random sample',
        'expected count',
        'large count',
        'same rows',
        'same data',
        'restate',
        'square of',
        'conditions not hold',
        'conditions fail',
        'does not apply',
        'permutation',
        'observational',
        'not causal',
        'not cause',
        'narrowly',
        'signature on a certificate',
      ],
      polarity: 'any',
      minMatches: 1,
      feedback:
        'Name one thing you would not defend, and say why. The cargo finding is about declared cargo. The corridor finding is about cause codes an office wrote. The uprate is twelve hulls the yard chose. The examiner table’s expected counts are below one, so no chi-square applies to it. Conceding one of those first is cheaper than being shown it.',
    },
  ]

  const exemplar =
    `A Type I error on this ship's test is rejecting a true null: reporting that Perrine-beneficiary hulls are lost at a higher rate than everyone else when the true ${parameter} of ${population} is the same for both, which would mean this ship accused an insurer and a pension fund on a false alarm, and a hearing about whether a vessel like this one should exist. ` +
    `A Type II error is failing to reject a false null: writing not enough evidence although the rates really differ, which means the diversions go unreported and the next nineteen hulls go the way the first nineteen did. ` +
    `I set alpha at ${alphaText} before the register was opened, so I bought down ${boughtDown} and accepted more risk of ${acceptedMore}, and I would set it there again. ` +
    `The finding is about the ${parameter} of ${population} and about nothing wider than that. ` +
    `The one I would concede first is the cargo table: it is about declared cargo off a manifest, and the case is that the manifests were false.`

  return { type: 'interpretation', required, forbidden: FORBIDDEN, exemplar, minWords: 60 }
}
