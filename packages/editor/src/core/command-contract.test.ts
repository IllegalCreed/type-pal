/**
 * C00：Command 协议与 BattleDataInUseError 迁出同证。
 * 旧入口 commands.js 与新模块必须是同一类型/构造器；删除敌人仍抛同一错误身份。
 */
import { describe, expect, test } from 'vitest'
import { BattleDataInUseError } from './battle-data-command-errors.js'
import * as oldEntry from './commands.js'
import { DeleteEnemyCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import type { ProjectReferenceEdge } from './project-reference.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

function enemyState(): EditorState {
  return {
    manifest: {
      id: 'test',
      name: 'Test',
      contentVersion: 20,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
    },
    scenes: [],
    sceneIndex: { version: 1, scenes: [] },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    enemies: [
      {
        id: 'enemy-1',
        battleSprite: 'bs',
        yPosOffset: 0,
        stats: {
          hp: 1,
          attack: 1,
          defense: 1,
          dexterity: 1,
          exp: 0,
          cash: 0,
          level: 1,
          physicalResistance: 0,
          poisonResistance: 0,
          elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
          dualMove: false,
          collectValue: 0,
        },
        ai: { resistanceToSorcery: 5 },
        sounds: {},
      },
    ],
    enemyTeams: [{ id: 'team-1', slots: ['enemy-1'] }],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    stamps: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

describe('C00 command contract and battle-data error', () => {
  test('keeps BattleDataInUseError identity, message and references on the moved module', () => {
    expect(oldEntry.BattleDataInUseError).toBe(BattleDataInUseError)
    const references = [] as const satisfies readonly ProjectReferenceEdge[]
    const error = new BattleDataInUseError('敌人', 'enemy-1', references)
    expect(error.message).toBe('敌人 enemy-1 仍被 0 处引用')
    expect(error).toBeInstanceOf(oldEntry.BattleDataInUseError)
    expect(error.name).toBe('BattleDataInUseError')
    expect(error.references).toBe(references)
  })

  test('DeleteEnemy still throws the extracted error on first apply', () => {
    const command: oldEntry.Command = new DeleteEnemyCommand(
      'enemy-1',
      collectCurrentProjectReferenceIndex,
    )
    expect(command.label).toBe('删除敌人')
    try {
      command.apply(enemyState())
      throw new Error('预期引用阻断')
    } catch (error) {
      expect(error).toBeInstanceOf(BattleDataInUseError)
      expect(error).toBeInstanceOf(oldEntry.BattleDataInUseError)
      expect((error as BattleDataInUseError).message).toBe('敌人 enemy-1 仍被 1 处引用')
    }
  })
})
