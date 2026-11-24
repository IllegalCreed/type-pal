import { expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { makeWfSession } from '../__tests__/battle-workflows/session-driver.js'
import { expectDefined } from '../defined.js'
import { BattleSession } from './battle-session.js'

test.each([
  {
    condition: 'a missing player appearance slot',
    replaceIds: ([playerSprite]: readonly string[]) => [expectDefined(playerSprite)],
    message: 'BattleSession playerBaseDefinitionIds 长度 1 != players 2',
  },
  {
    condition: 'an unregistered player appearance',
    replaceIds: ([playerSprite]: readonly string[]) => [
      expectDefined(playerSprite),
      'battle-sprite.missing',
    ],
    message: '本场 battle sprite readiness 缺定义 "battle-sprite.missing"',
  },
])('rejects $condition at session assembly', async ({ replaceIds, message }) => {
  const players = [wfPlayer('p1'), wfPlayer('p2')]
  const enemies = [wfEnemy('e1')]
  const { assets, session } = makeWfSession({ players, enemies })
  try {
    expect(session.debugPlayers().map(({ roleId }) => roleId)).toEqual(['p1', 'p2'])
    expect(
      () =>
        new BattleSession(
          players,
          enemies,
          { ...assets, playerBaseDefinitionIds: replaceIds(assets.playerBaseDefinitionIds) },
          (id) => id,
          () => 0,
        ),
    ).toThrow(message)
  } finally {
    const closed = session.done.catch(() => undefined)
    session.cancel()
    await closed
  }
})
