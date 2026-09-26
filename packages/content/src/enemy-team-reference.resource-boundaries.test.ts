import { expect, test } from 'vitest'
import { resourceSnapshot } from './__tests__/codex-resource-contract-fixtures.js'
import { collectEnemyTeamTaggedReferences } from './enemy-team-reference.js'
import { type Command, checkCommands } from './script.js'

// Exported content API; no active production consumer currently calls this helper.
// These pin its documented leaf-scanner contract, not editor delete protection.
test('enemy-team leaf scanner preserves repeated identities and exact nested traversal order', () => {
  const input: Command[] = [
    {
      kind: 'branch',
      cond: { kind: 'chance', percent: 50 },
      then: [
        {
          kind: 'startBattle',
          enemyTeamId: 'team.a',
          onLose: [{ kind: 'startBattle', enemyTeamId: 'team.b' }],
        },
      ],
      else: [{ kind: 'startBattle', enemyTeamId: 'team.a' }],
    },
  ]
  checkCommands(input, 'body')
  const before = resourceSnapshot(input)
  expect(collectEnemyTeamTaggedReferences(input, 'body')).toEqual([
    { enemyTeamId: 'team.a', kind: 'start-battle', where: 'body[0].then[0].enemyTeamId' },
    { enemyTeamId: 'team.b', kind: 'start-battle', where: 'body[0].then[0].onLose[0].enemyTeamId' },
    { enemyTeamId: 'team.a', kind: 'start-battle', where: 'body[0].else[0].enemyTeamId' },
  ])
  expect(input).toEqual(before)
})

test('enemy-team scanner ignores unrelated same-name fields and malformed leaves without hiding valid siblings', () => {
  const good = { kind: 'startBattle', enemyTeamId: 'team.real' }
  checkCommands([good], 'good')
  // Unknown JSON boundary, not a claim that malformed commands pass the canonical guard.
  const input = {
    entries: [
      null,
      4,
      false,
      'team.fake',
      { enemyTeamId: 'team.fake' },
      { kind: 'wait', enemyTeamId: 'team.fake' },
      { kind: 'startBattle', enemyTeamId: '' },
      { kind: 'startBattle', enemyTeamId: 4 },
      good,
    ],
  }
  const before = resourceSnapshot(input)
  expect(collectEnemyTeamTaggedReferences(input, 'root')).toEqual([
    { enemyTeamId: 'team.real', kind: 'start-battle', where: 'root.entries[8].enemyTeamId' },
  ])
  expect(input).toEqual(before)
})
