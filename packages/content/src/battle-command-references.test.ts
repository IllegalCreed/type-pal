import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import { type AuthorCommand, checkAuthorCommands } from './author-script.js'
import { collectCommandTargetReferences } from './command-target-reference.js'

function startBattle(
  enemyTeamId: string,
  fieldId: number,
): Extract<AuthorCommand, { kind: 'startBattle' }> {
  return { kind: 'startBattle', enemyTeamId, fieldId }
}

test('battle target references preserve each authored position, including repeated targets', () => {
  const body: AuthorCommand[] = [
    {
      kind: 'branch',
      cond: { kind: 'flag', flag: 'challenge', is: true },
      then: [startBattle('guard', 24)],
      else: [startBattle('guard', 24)],
    },
    {
      kind: 'loop',
      mode: 'while',
      cond: { kind: 'flag', flag: 'challenge', is: true },
      body: [startBattle('watch', 25)],
    },
    { kind: 'confirm', onYes: [], onNo: [startBattle('brigand', 26)] },
    {
      ...startBattle('patrol', 27),
      onLose: [startBattle('reinforcements', 28)],
      onFlee: [startBattle('pursuit', 29)],
    },
    { kind: 'teleportOut', onFail: [startBattle('ambush', 30)] },
  ]
  checkAuthorCommands(body, 'body')
  const before = deepSnapshot(body)

  const targets = [
    ['body[0].then[0]', 'guard', 24],
    ['body[0].else[0]', 'guard', 24],
    ['body[1].body[0]', 'watch', 25],
    ['body[2].onNo[0]', 'brigand', 26],
    ['body[3]', 'patrol', 27],
    ['body[3].onLose[0]', 'reinforcements', 28],
    ['body[3].onFlee[0]', 'pursuit', 29],
    ['body[4].onFail[0]', 'ambush', 30],
  ] as const
  expect(collectCommandTargetReferences(body, 'body')).toEqual(
    targets.flatMap(([commandPath, enemyTeamId, fieldId]) => [
      {
        target: { kind: 'enemy-team', id: enemyTeamId },
        relation: 'start-battle',
        where: `${commandPath}.enemyTeamId`,
      },
      {
        target: { kind: 'battle-field', id: fieldId },
        relation: 'start-battle',
        where: `${commandPath}.fieldId`,
      },
    ]),
  )
  expect(body).toEqual(before)
})

test('unvalidated battle data does not create false targets or hide a valid sibling', () => {
  const valid = startBattle('guard', 24)
  checkAuthorCommands([valid], 'body')
  const draft: unknown[] = [
    null,
    4,
    false,
    'unrelated',
    { enemyTeamId: 'unrelated', fieldId: 24 },
    { kind: 'wait', enemyTeamId: 'unrelated', fieldId: 24 },
    { kind: 'startBattle', enemyTeamId: '', fieldId: -1 },
    { kind: 'startBattle', enemyTeamId: 4, fieldId: 1.5 },
    valid,
  ]
  const before = deepSnapshot(draft)
  expect(collectCommandTargetReferences(draft, 'draft')).toEqual([
    {
      target: { kind: 'enemy-team', id: 'guard' },
      relation: 'start-battle',
      where: 'draft[8].enemyTeamId',
    },
    {
      target: { kind: 'battle-field', id: 24 },
      relation: 'start-battle',
      where: 'draft[8].fieldId',
    },
  ])
  expect(draft).toEqual(before)
})
