import { isDeepStrictEqual as same } from 'node:util'
import {
  BATTLE_FOUNDATION_LIMITS,
  projectBattleBusinessTrace,
  validateBattleTrace,
} from './battle-trace-contract.mjs'

const finding = (rule, expected, actual) => ({ domain: 'business', rule, expected, actual })
const omitted = new Set(['order', 'seq', 'atMs', 'source', 'engine', 'scenarioId', 'runId'])
const native = (entry) =>
  Object.fromEntries(Object.entries(entry).filter(([key]) => !omitted.has(key)))
const nativeRound = ({ clockMs: _clockMs, ...entry }) => native(entry)
const firstDifference = (left, right) => {
  for (let i = 0; i < Math.max(left.length, right.length); i++)
    if (!same(left[i], right[i]))
      return { index: i, first: left[i] ?? null, second: right[i] ?? null }
  return null
}

function checkedPair(first, second, scenario, repeat) {
  const validations = [first, second].map((trace) => validateBattleTrace(trace, scenario))
  const findings = validations.flatMap((result, index) =>
    result.findings.map((entry) => ({
      ...entry,
      engine: [first, second][index]?.engine,
      recording: index,
    })),
  )
  if (
    !findings.length &&
    (repeat
      ? first.engine !== second.engine || first.runId === second.runId
      : first.engine !== 'game' || second.engine !== 'reforge')
  )
    findings.push(
      finding(
        'independent-run-identity',
        repeat ? 'two distinct same-engine runs' : 'game then reforge',
        [first.engine, first.runId, second.engine, second.runId],
      ),
    )
  return { validations, findings }
}

/** Cross-engine acceptance concerns semantic commands and effective state, not native damage rolls. */
export function compareBattleTraces(game, reforge, scenario) {
  const { validations, findings } = checkedPair(game, reforge, scenario, false)
  const result = {
    kind: 'battle-cross-engine-comparison',
    scenarioId: scenario?.id,
    status: 'rejected',
    validations,
    findings,
    notAccepted: [...BATTLE_FOUNDATION_LIMITS],
  }
  if (findings.length) return result
  const left = projectBattleBusinessTrace(game),
    right = projectBattleBusinessTrace(reforge)
  for (const key of ['start', 'commands', 'actions', 'rounds', 'terminal'])
    if (!same(left[key], right[key])) {
      findings.push(finding(`cross-engine-${key}`, left[key], right[key]))
      break
    }
  const semanticKeys = new Set([
    'turn',
    'actorId',
    'actorSide',
    'kind',
    'targetId',
    'itemId',
    'skillId',
    'guard',
    'before',
    'after',
    ...omitted,
  ])
  result.rawActionDifferences = game.actions.flatMap((entry, actionIndex) => {
    const extra = (value) =>
      Object.fromEntries(Object.entries(value).filter(([key]) => !semanticKeys.has(key)))
    const first = extra(entry),
      second = extra(reforge.actions[actionIndex])
    return same(first, second)
      ? []
      : [{ actionIndex, game: first, reforge: second, accepted: false }]
  })
  result.randomObservation = {
    scope: 'recording-only; draw allocation parity is not accepted',
    gameCalls: game.randomDraws.length,
    reforgeCalls: reforge.randomDraws.length,
    firstValueDifference: firstDifference(
      game.randomDraws.map((entry) => entry.value),
      reforge.randomDraws.map((entry) => entry.value),
    ),
  }
  result.status = findings.length ? 'rejected' : 'passed'
  return result
}

/** Repetition is strict for one engine's business facts, native action facts and random sequence. */
export function compareBattleRepeats(first, second, scenario) {
  const { validations, findings } = checkedPair(first, second, scenario, true)
  const result = {
    kind: 'battle-repeat-comparison',
    scenarioId: scenario?.id,
    engine: first?.engine,
    status: 'rejected',
    validations,
    findings,
    notAccepted: [...BATTLE_FOUNDATION_LIMITS],
  }
  if (findings.length) return result
  for (const [rule, left, right] of [
    ['repeat-business', projectBattleBusinessTrace(first), projectBattleBusinessTrace(second)],
    ['repeat-native-actions', first.actions.map(native), second.actions.map(native)],
    [
      'repeat-native-rounds',
      (first.rounds ?? []).map(nativeRound),
      (second.rounds ?? []).map(nativeRound),
    ],
    [
      'repeat-random-draws',
      first.randomDraws.map(({ index, value, source, purpose, queue }) => ({
        index,
        value,
        source,
        purpose,
        queue,
      })),
      second.randomDraws.map(({ index, value, source, purpose, queue }) => ({
        index,
        value,
        source,
        purpose,
        queue,
      })),
    ],
  ])
    if (!same(left, right)) {
      findings.push(finding(rule, left, right))
      break
    }
  result.status = findings.length ? 'rejected' : 'passed'
  return result
}
