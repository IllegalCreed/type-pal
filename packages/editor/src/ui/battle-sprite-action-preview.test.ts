import { expect, test } from 'vitest'
import { enemyProfile, playerProfile } from '../__tests__/battle-sprite-project.js'
import {
  battleSpriteActionsForProfile,
  battleSpriteSemanticGroup,
} from './battle-sprite-action-preview.js'

test('player preview appends the ready pose to attacks and casts but leaves an absent steal slot empty', () => {
  const group = battleSpriteSemanticGroup(
    {
      id: 'fighter',
      label: '队员',
      asset: 'battle-sprite.authored.fighter',
      profile: playerProfile(),
    },
    10,
    true,
  )
  const byId = new Map(group.rows.map((row) => [row.id, row]))
  expect(group.active).toBe(true)
  expect(byId.get('fighter:attack')).toMatchObject({
    frames: [7, 8, 9, 0],
    frameMs: 140,
    loopFrom: 0,
  })
  expect(byId.get('fighter:cast')).toMatchObject({ frames: [5, 6, 0], frameMs: 180, loopFrom: 0 })
  expect(byId.get('fighter:defend')?.frames).toEqual([3])
  expect(byId.get('fighter:steal')?.frames).toEqual([])
  expect(byId.get('fighter:steal')?.loopFrom).toBeUndefined()
  const withSteal = battleSpriteActionsForProfile(playerProfile({ steal: 10 }), 11)
  expect(withSteal.find(({ key }) => key === 'steal')).toMatchObject({
    frames: [10, 0],
    frameMs: 160,
  })
})

test('enemy preview keeps the pre-attack frame and changes a zero-tick action to its last pose', () => {
  const normal = battleSpriteActionsForProfile(enemyProfile(2, 1, 2, { idle: 5, act: 2 }), 5)
  expect(normal.map(({ key, frames, frameMs }) => [key, frames, frameMs])).toEqual([
    ['待机', [0, 1], 200],
    ['施法', [2], 80],
    ['攻击', [2, 3, 4], 80],
  ])
  const zero = battleSpriteActionsForProfile(enemyProfile(2, 1, 2, { act: 0 }), 5)
  expect(zero.find(({ key }) => key === '施法')).toMatchObject({ frames: [2], frameMs: 40 })
  expect(zero.find(({ key }) => key === '攻击')).toMatchObject({ frames: [4], frameMs: 40 })
})

test('an imported enemy declaration wider than the RLE address space uses only actual frame slots', () => {
  const actions = battleSpriteActionsForProfile(enemyProfile(2 ** 32, 1, 1), 4)
  expect(actions.map(({ key, frames }) => [key, frames])).toEqual([
    ['待机', [0, 1, 2, 3]],
    ['施法', []],
    ['攻击', []],
  ])
})

test('summon preview traverses all decoded frames without imposing the skill timing', () => {
  expect(battleSpriteActionsForProfile({ kind: 'summon' }, 0)).toEqual([])
  expect(battleSpriteActionsForProfile({ kind: 'summon' }, 3)).toEqual([
    {
      key: 'summon-all',
      label: '召唤现身',
      frames: [0, 1, 2],
      frameMs: 200,
      timing: '这里只预览帧序；实际播放节奏由技能决定',
    },
  ])
})
