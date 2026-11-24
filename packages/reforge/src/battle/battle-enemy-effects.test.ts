import { expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { expectDefined } from '../defined.js'
import { applyEnemyEffect, createBattleState } from './battle-core.js'

test('transform replaces the appearance only after it resolves a target definition', () => {
  const source = wfEnemy('source', { health: 30 })
  const target = wfEnemy('target', { health: 60 })
  const roster = { players: [wfPlayer('hero')], enemySlots: [source] }
  const effect = { kind: 'transform', enemyId: target.id } as const
  const missing = createBattleState(roster)
  const registered = createBattleState({ ...roster, enemiesById: { target } })

  expect(applyEnemyEffect(missing, 0, effect)).toEqual({ outcome: 'failed', kind: 'transform' })
  expect(missing.enemies[0]).toMatchObject({ def: source, scriptOwnerDef: source, hp: 30 })
  expect(applyEnemyEffect(registered, 0, effect)).toMatchObject({
    outcome: 'succeeded',
    kind: 'transform',
  })
  expect(registered.enemies[0]).toMatchObject({ def: target, scriptOwnerDef: source, hp: 30 })
})

test('a lone enemy must have two hit points before it can divide', () => {
  const newBattle = (health: number) =>
    createBattleState({
      players: [wfPlayer('hero')],
      enemySlots: [wfEnemy('lone', { health })],
    })
  const effect = { kind: 'divide', copies: 1 } as const
  const oneHitPoint = newBattle(1)
  const twoHitPoints = newBattle(2)

  expect(applyEnemyEffect(oneHitPoint, 0, effect)).toEqual({ outcome: 'failed', kind: 'divide' })
  expect(oneHitPoint.enemies[0]?.hp).toBe(1)
  expect(oneHitPoint.enemies[1]).toBeNull()
  expect(applyEnemyEffect(twoHitPoints, 0, effect)).toEqual({
    outcome: 'succeeded',
    kind: 'divide',
    spawnedIdxs: [1],
  })
  expect(twoHitPoints.enemies.slice(0, 2).map((enemy) => enemy?.hp)).toEqual([1, 1])
})

test('a defeated caller cannot summon into a free slot', () => {
  const summoner = wfEnemy('summoner')
  const ally = wfEnemy('ally')
  const newBattle = () =>
    createBattleState({
      players: [wfPlayer('hero')],
      enemySlots: [summoner, null],
      enemiesById: { ally },
    })
  const summon = { kind: 'summon', enemyId: ally.id, count: 1 } as const
  const living = newBattle()
  const defeated = newBattle()
  expectDefined(defeated.enemies[0]).hp = 0

  expect(applyEnemyEffect(living, 0, summon)).toEqual({
    outcome: 'succeeded',
    kind: 'summon',
    spawnedIdxs: [1],
  })
  expect(living.enemies[1]?.def).toBe(ally)
  expect(applyEnemyEffect(defeated, 0, summon)).toEqual({ outcome: 'failed', kind: 'summon' })
  expect(defeated.enemies[1]).toBeNull()
})
