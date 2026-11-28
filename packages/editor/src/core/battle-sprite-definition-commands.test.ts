import type { EnemyDef } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  decodeBattleAsset,
  enemyProfile,
  loadBattleSpriteProject,
} from '../__tests__/battle-sprite-project.js'
import {
  RemoveBattleSpriteDefinitionCommand,
  SetEnemyBattleSpriteCommand,
  UpdateBattleSpriteDefinitionCommand,
} from './commands.js'
import { EditSession } from './edit-session.js'
import { AddEnemyCommand } from './enemy-commands.js'
import { assertProjectSaveValid } from './project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

const ENEMY_ASSET = 'battle-sprite.authored.test-enemies'
const references = collectCurrentProjectReferenceIndex

async function loadDefinitions(name: string) {
  const project = await loadBattleSpriteProject(name, [
    {
      asset: ENEMY_ASSET,
      label: '小妖源帧',
      frameCount: 4,
      definitions: [
        { id: 'forest-ghost', label: '林间小妖', profile: enemyProfile(1, 0, 1) },
        { id: 'water-ghost', label: '水中小妖', profile: enemyProfile(2, 0, 2) },
      ],
    },
  ])
  return { project, session: new EditSession(project.state) }
}

test('rename on a current definition uses label-only validation and replays the same edit', async () => {
  const { project, session } = await loadDefinitions('rename battle definition')
  const missing = new UpdateBattleSpriteDefinitionCommand('absent-definition', { label: '未登记' })
  expect(missing.invert(project.state)).toBe(project.state)
  expect(session.dispatch(missing)).toBe(false)
  expect(session.getHistoryVersion()).toBe(0)

  const previous = project.state.battleSprites.find(({ id }) => id === 'forest-ghost')!
  expect(
    session.dispatch(new UpdateBattleSpriteDefinitionCommand(previous.id, { label: '山间小妖' })),
  ).toBe(true)
  expect(session.getState().battleSprites.find(({ id }) => id === previous.id)).toEqual({
    ...previous,
    label: '山间小妖',
  })
  expect(session.undo()).toBe(true)
  expect(session.getState().battleSprites.find(({ id }) => id === previous.id)).toEqual(previous)
  expect(session.redo()).toBe(true)
  expect(session.getState().battleSprites.find(({ id }) => id === previous.id)?.label).toBe(
    '山间小妖',
  )
})

test('changing a player definition to an enemy requires a current proof and current references', async () => {
  const { project, session } = await loadDefinitions('change battle profile')
  const starter = project.state.battleSprites.find(({ id }) => id === 'starter-fighter')!
  const record = project.state.assetCatalog.assets[starter.asset]!
  const decoded = await decodeBattleAsset(project, project.state, starter.asset)
  const proof = {
    asset: starter.asset,
    sha256: record.sha256,
    actualFrameCount: decoded.frames.length,
  }
  const patch = { profile: enemyProfile(1, 0, 0) }
  const stale = project.state.assetCatalog.assets[ENEMY_ASSET]!
  expect(() =>
    session.dispatch(
      new UpdateBattleSpriteDefinitionCommand(
        starter.id,
        patch,
        { ...proof, sha256: stale.sha256 },
        references,
      ),
    ),
  ).toThrow('战斗精灵 ABI 证明缺失或已过期')
  expect(() =>
    session.dispatch(new UpdateBattleSpriteDefinitionCommand(starter.id, patch, proof)),
  ).toThrow('无法读取 current-author 引用索引')
  expect(() =>
    session.dispatch(new UpdateBattleSpriteDefinitionCommand(starter.id, patch, proof, references)),
  ).toThrow(/starter-fighter.*profile.*actors/)
  expect(session.getState()).toBe(project.state)
  expect(session.getHistoryVersion()).toBe(0)
})

test('removing an unused definition restores its position while keeping the shared frames', async () => {
  const { project, session } = await loadDefinitions('remove battle definition')
  const absent = new RemoveBattleSpriteDefinitionCommand('absent-definition', references)
  expect(absent.invert(project.state)).toBe(project.state)
  expect(session.dispatch(absent)).toBe(false)
  expect(
    session.dispatch(new RemoveBattleSpriteDefinitionCommand('forest-ghost', references)),
  ).toBe(true)
  expect(session.getState().battleSprites.map(({ id }) => id)).toEqual([
    'starter-fighter',
    'water-ghost',
  ])
  expect(session.getState().assetCatalog).toBe(project.state.assetCatalog)
  expect(session.undo()).toBe(true)
  expect(session.getState().battleSprites.map(({ id }) => id)).toEqual([
    'starter-fighter',
    'forest-ghost',
    'water-ghost',
  ])
  expect(session.redo()).toBe(true)
  expect(session.getState().battleSprites.map(({ id }) => id)).toEqual([
    'starter-fighter',
    'water-ghost',
  ])
})

test('enemy binding accepts only enemy profiles and undoes real selections in reverse order', async () => {
  const { session } = await loadDefinitions('bind enemy battle definition')
  const actor: EnemyDef = {
    id: 'ghost',
    name: 'name.ghost',
    battleSprite: 'forest-ghost',
    yPosOffset: 0,
    stats: {
      health: 50,
      level: 1,
      exp: 5,
      cash: 5,
      attackStrength: 20,
      magicStrength: 10,
      defense: 10,
      dexterity: 10,
      fleeRate: 10,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 5 },
    sounds: {},
  }
  expect(session.dispatch(new AddEnemyCommand(actor))).toBe(true)
  const before = session.getState()
  assertProjectSaveValid(before)
  const absent = new SetEnemyBattleSpriteCommand('absent-enemy', 'water-ghost')
  expect(absent.invert(before)).toBe(before)
  expect(session.dispatch(absent)).toBe(false)
  expect(() =>
    session.dispatch(new SetEnemyBattleSpriteCommand(actor.id, 'starter-fighter')),
  ).toThrow('敌人只能引用 enemy profile：starter-fighter')
  expect(session.getState()).toBe(before)
  const boundSprite = () =>
    session.getState().enemies?.find(({ id }) => id === actor.id)?.battleSprite

  expect(session.dispatch(new SetEnemyBattleSpriteCommand(actor.id, 'water-ghost'))).toBe(true)
  expect(boundSprite()).toBe('water-ghost')
  expect(session.dispatch(new SetEnemyBattleSpriteCommand(actor.id, 'forest-ghost'))).toBe(true)
  expect(boundSprite()).toBe('forest-ghost')
  expect(session.undo()).toBe(true)
  expect(boundSprite()).toBe('water-ghost')
  expect(session.undo()).toBe(true)
  expect(boundSprite()).toBe('forest-ghost')
  expect(session.redo()).toBe(true)
  expect(boundSprite()).toBe('water-ghost')
  expect(session.redo()).toBe(true)
  expect(boundSprite()).toBe('forest-ghost')
  assertProjectSaveValid(session.getState())
})
