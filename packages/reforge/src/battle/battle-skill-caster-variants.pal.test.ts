import { expect, test } from 'vitest'
import { enemyCast, palSkill, playerCast } from '../__tests__/battle-workflows/pal-skill-driver.js'

test.each([
  { id: '303', name: '回梦', status: 'sleep' },
  { id: '305', name: '鬼降', status: 'confused' },
] as const)('$name applies the current authored status and HP effect for each caster side', ({
  id,
  status,
}) => {
  const skill = palSkill(id)
  const fromPlayer = playerCast(skill, 100, 0)
  // PAL's current content gives player effects four turns and enemy effects three.
  // The end of the first turn consumes one turn on either side.
  expect(fromPlayer.enemies[0]).toMatchObject({ hp: 999, status: { [status]: 3 } })
  const fromEnemy = enemyCast(skill)
  expect(fromEnemy.players[0]).toMatchObject({ hp: 99, status: { [status]: 2 } })
})

test('夺魂 uses instant defeat when cast by either side', () => {
  const soul = palSkill('304')
  const fromPlayer = playerCast(soul, 100, 0)
  expect(fromPlayer.phase).toBe('won')
  expect(fromPlayer.enemies[0]?.hp).toBe(0)
  const fromEnemy = enemyCast(soul)
  expect(fromEnemy.phase).toBe('lost')
  expect(fromEnemy.players[0]?.hp).toBe(0)
})
