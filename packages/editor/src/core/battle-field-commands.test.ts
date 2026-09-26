/**
 * ARCH-F2 战场命令族拆分同证测试。
 *
 * 锁两件事,不重复 commands.test.ts D24 块的完整行为矩阵:
 * 1. 旧入口 commands.js 的战场族公开符号与新模块 battle-field-commands.js 是**同一构造器/绑定**;
 * 2. 经新模块直接入口的 apply/invert/引用阻断/输入深保真行为与拆分前合同一致。
 */
import type { EntityDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  AddBattleFieldCommand,
  BATTLE_FIELDS_PATH,
  BattleFieldInUseError,
  CopyBattleFieldCommand,
  DeleteBattleFieldCommand,
  nextBattleFieldId,
  UpdateBattleFieldCommand,
} from './battle-field-commands.js'
import * as oldEntry from './commands.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

const zeros = () => ({ wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 })
const field24 = (): import('@type-pal/content').BattleFieldDef => ({
  id: 24,
  screenWave: 0,
  magicEffect: zeros(),
})
const currentReferences = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

const ent = (id: string): EntityDef => ({
  id,
  pos: { col: 1, row: 1, height: 0 },
  sprite: 'ghost',
})

/** 与 commands.test.ts st() 同形的最小 EditorState。 */
function st(): EditorState {
  return {
    manifest: {
      id: 'test',
      name: 'Test',
      contentVersion: 20,
      defaultEntryId: 'main',
      content: { maps: 'content/maps/index.json' },
      assets: {
        catalog: 'assets/index.json',
        roles: {},
      },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
    },
    scenes: [
      {
        id: 's',
        mapId: 'map-s',
        entry: {} as never,
        entities: [ent('a'), ent('b')],
      },
    ],
    sceneIndex: {
      version: 1,
      scenes: [{ id: 's', name: '场景 s', path: 'content/scenes/s.json' }],
    },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as never
}

function stF(): EditorState {
  const base = st() as EditorState & { battleFields: import('@type-pal/content').BattleFieldDef[] }
  base.battleFields = [field24()]
  return base
}

describe('战场命令族拆分:旧出口与新模块同一绑定', () => {
  test('四命令、BattleFieldInUseError、nextBattleFieldId、BATTLE_FIELDS_PATH 同一构造器/值', () => {
    expect(oldEntry.AddBattleFieldCommand).toBe(AddBattleFieldCommand)
    expect(oldEntry.CopyBattleFieldCommand).toBe(CopyBattleFieldCommand)
    expect(oldEntry.DeleteBattleFieldCommand).toBe(DeleteBattleFieldCommand)
    expect(oldEntry.UpdateBattleFieldCommand).toBe(UpdateBattleFieldCommand)
    expect(oldEntry.BattleFieldInUseError).toBe(BattleFieldInUseError)
    expect(oldEntry.nextBattleFieldId).toBe(nextBattleFieldId)
    expect(oldEntry.BATTLE_FIELDS_PATH).toBe(BATTLE_FIELDS_PATH)
  })

  test('instanceof 双向可识别(旧入口实例 vs 新模块类,反之亦然)', () => {
    const viaOld = new oldEntry.AddBattleFieldCommand(field24())
    const viaNew = new AddBattleFieldCommand(field24())
    expect(viaOld).toBeInstanceOf(AddBattleFieldCommand)
    expect(viaNew).toBeInstanceOf(oldEntry.AddBattleFieldCommand)
  })
})

describe('战场命令族拆分:新模块直接入口行为同证', () => {
  test('first-create 原子登记 manifest + undo 精确还原;构造后改输入不影响命令(深保真)', () => {
    const s0 = st()
    const field = field24()
    const cmd = new AddBattleFieldCommand(field)
    field.magicEffect.fire = 9 // 构造后篡改输入,命令必须持有克隆
    const s1 = cmd.apply(s0)
    expect(s1.battleFields).toEqual([field24()])
    expect(s1.manifest.content.battleFields).toBe(BATTLE_FIELDS_PATH)
    expect(s0.battleFields).toBeUndefined()
    expect(s0.manifest.content.battleFields).toBeUndefined()
    expect(nextBattleFieldId(s1.battleFields!)).toBe(25)
    const back = cmd.invert(s1)
    expect(back.battleFields).toBeUndefined()
    expect(back.manifest).toEqual(s0.manifest)
  })

  test('update patch/invert 还原、源不变;构造后改 patch 不影响命令;非法五行在边界拒绝', () => {
    const s0 = stF()
    const patch = { name: '熔岩', magicEffect: { ...zeros(), fire: 3 } }
    const cmd = new UpdateBattleFieldCommand(24, patch)
    patch.name = '构造后篡改'
    const s1 = cmd.apply(s0)
    expect(s1.battleFields![0]!.name).toBe('熔岩')
    expect(s1.battleFields![0]!.magicEffect.fire).toBe(3)
    expect(s0.battleFields![0]!.name).toBeUndefined() // 源不变
    const back = cmd.invert(s1)
    expect(back.battleFields![0]!.name).toBeUndefined()
    expect(back.battleFields![0]!.magicEffect.fire).toBe(0)
    expect(() =>
      new UpdateBattleFieldCommand(24, {
        magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0 } as never,
      }).apply(s0),
    ).toThrow('缺键 "earth"')
  })

  test('复制共享资源引用且整体可逆,id 冲突拒绝', () => {
    const s0 = stF()
    s0.manifest.content.battleFields = BATTLE_FIELDS_PATH
    s0.battleFields![0] = {
      ...s0.battleFields![0]!,
      name: '原战场',
      background: 'battle-field.bg.24',
    }
    const copy = new CopyBattleFieldCommand(24, 25)
    const s1 = copy.apply(s0)
    expect(s1.battleFields![1]).toEqual({ ...s0.battleFields![0], id: 25 })
    expect(s1.battleFields![1]!.background).toBe('battle-field.bg.24') // 资源引用共享
    expect(copy.invert(s1).battleFields).toEqual(s0.battleFields)
    expect(() => new CopyBattleFieldCommand(24, 25).apply(s1)).toThrow('id 已存在')
  })

  test('未引用可删、删空保留已声明空表、undo 原位还原;系统默认字段删除被阻断', () => {
    const s0 = stF()
    s0.manifest.content.battleFields = BATTLE_FIELDS_PATH
    s0.battleFields = [
      ...s0.battleFields!,
      { id: 25, name: '可删除', screenWave: 1, magicEffect: zeros() },
    ]
    const remove25 = new DeleteBattleFieldCommand(25, currentReferences)
    const s1 = remove25.apply(s0)
    expect(s1.battleFields!.map((field) => field.id)).toEqual([24])
    expect(remove25.invert(s1).battleFields).toEqual(s0.battleFields)
    const empty = new DeleteBattleFieldCommand(25, currentReferences).apply({
      ...s0,
      battleFields: [s0.battleFields[1]!],
    })
    expect(empty.battleFields).toEqual([])
    expect(empty.manifest.content.battleFields).toBe(BATTLE_FIELDS_PATH)

    try {
      new DeleteBattleFieldCommand(24, currentReferences).apply(stF())
      throw new Error('预期引用阻断')
    } catch (error) {
      expect(error).toBeInstanceOf(BattleFieldInUseError)
      expect(error).toBeInstanceOf(oldEntry.BattleFieldInUseError) // 错误身份经旧入口同样可辨
    }
  })
})
