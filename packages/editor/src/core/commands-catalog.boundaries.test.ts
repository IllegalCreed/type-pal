/**
 * TEST-EDITOR-LOGIC-COVERAGE-1 A2/A3：人物与战斗数据目录命令边界（commands.ts:1795-2615）。
 * 既有 actor-commands/item-commands/battle-data-delete-commands.test.ts 已覆盖主体 CRUD；
 * 本文件补：缺目标 no-op/抛错分界、CopyActor 伴随 levelUp、invert 被占用拒绝、
 * apply→invert→reapply 往返与独立深快照、未触域保持。
 */
import { describe, expect, test } from 'vitest'
import { baseState, deepSnapshot } from './__tests__/glm-editor-logic-fixtures.js'
import {
  AddActorCommand,
  AddEnemyCommand,
  CopyActorCommand,
  DeleteActorCommand,
  UpdateEnemyCommand,
} from './commands.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

const actor = (id: string) => ({
  id,
  name: `name.${id}`,
  spriteId: 'sprite.shared',
})

function state(): EditorState {
  return baseState({
    actors: [actor('a1')],
    levelUp: { a1: [{ level: 2, skillId: '300' }] },
    locale: { 'name.a1': '甲', 'name.a2': '乙' },
    sprites: [
      {
        id: 'sprite.shared',
        asset: 'sprite.shared.png',
        label: '共享',
        layout: { kind: 'static' },
      },
    ],
  })
}

describe('AddActorCommand · 边界', () => {
  test('重复 id 抛错且状态不变（assertActorCanBeAdded 现行合同）', () => {
    const s0 = state()
    const before = deepSnapshot(s0)
    expect(() => new AddActorCommand(actor('a1')).apply(s0)).toThrow(/已存在/)
    expect(s0).toEqual(before)
  })
  test('指定插入位置与 invert 精确移除；reapply 回到同一位置', () => {
    const command = new AddActorCommand(actor('a2'), 0)
    const s1 = command.apply(state())
    expect(s1.actors.map((a) => a.id)).toEqual(['a2', 'a1'])
    const s2 = command.invert(s1)
    expect(s2.actors.map((a) => a.id)).toEqual(['a1'])
    const s3 = command.apply(s2)
    expect(s3.actors.map((a) => a.id)).toEqual(['a2', 'a1'])
    expect(s2.levelUp).toEqual({ a1: [{ level: 2, skillId: '300' }] }) // levelUp 不被 Add 触碰
  })
})

describe('CopyActorCommand · 边界', () => {
  test('复制含 levelUp 伴随表；invert 一并清理；源与共享资源 id 引用保持', () => {
    const command = new CopyActorCommand('a1', 'a2', 'name.a2')
    const s1 = command.apply(state())
    expect(s1.actors.map((a) => a.id)).toEqual(['a1', 'a2'])
    expect(s1.actors[1]!.spriteId).toBe('sprite.shared') // 共享资源按 id 引用不复制
    expect(s1.levelUp.a2).toEqual([{ level: 2, skillId: '300' }])
    expect(s1.levelUp.a1).toEqual([{ level: 2, skillId: '300' }]) // 源不动
    const s2 = command.invert(s1)
    expect(s2.actors.map((a) => a.id)).toEqual(['a1'])
    expect(s2.levelUp).not.toHaveProperty('a2')
  })
  test('缺来源抛错且状态不变', () => {
    const s0 = state()
    expect(() => new CopyActorCommand('ghost', 'a9', 'name.a9').apply(s0)).toThrow(
      /复制来源人物不存在：ghost/,
    )
    expect(s0.actors).toHaveLength(1)
  })
})

describe('DeleteActorCommand · 边界', () => {
  test('缺目标 no-op；invert 被占用显式拒绝（现行合同）', () => {
    const s0 = state()
    expect(new DeleteActorCommand('ghost', collectCurrentProjectReferenceIndex).apply(s0)).toBe(s0)
    const command = new DeleteActorCommand('a1', collectCurrentProjectReferenceIndex)
    const s1 = command.apply(s0)
    expect(s1.actors).toEqual([])
    const occupied: EditorState = { ...s1, actors: [actor('a1')] }
    expect(() => command.invert(occupied)).toThrow(/无法撤销删除：人物 id 已被占用 a1/)
  })
  test('被场景实体引用时删除阻断（真实引用守卫经 current provider）', () => {
    const s0 = baseState({
      actors: [actor('a1')],
      scenes: [
        {
          id: 's',
          mapId: 'map-s',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [{ id: 'e1', actor: 'a1', pos: { col: 1, row: 1, height: 0 } }],
        },
      ],
    })
    expect(() =>
      new DeleteActorCommand('a1', collectCurrentProjectReferenceIndex).apply(s0),
    ).toThrow(/仍被 \d+ 处引用/)
  })
})

describe('AddEnemyCommand / UpdateEnemyCommand · 边界', () => {
  test('Add 唯一 ID 追加并可撤销；Update 缺目标 no-op 且状态不变；patch invert 只回滚 patch 键', () => {
    const enemy = {
      id: 'enemy-x',
      name: 'name.enemy-x',
      ai: { resistanceToSorcery: 0, rules: [] },
      battleSprite: 'bs.x',
      yPosOffset: 0,
      stats: {},
      sounds: {},
    }
    const s0 = { ...baseState(), enemies: [enemy] } as unknown as EditorState
    // 合法唯一 ID 新增（调用方 EnemyTab.tsx:743-752 保证新 ID 唯一后进入；重复 ID 不是受支持合同）
    const second = { ...enemy, id: 'enemy-y', name: 'name.enemy-y' }
    const command = new AddEnemyCommand(second as never)
    const s1 = command.apply(s0)
    expect(s1.enemies).toHaveLength(2)
    expect(s1.enemies?.[1]?.id).toBe('enemy-y')
    expect(s0.enemies).toHaveLength(1) // 输入不变
    const undone = command.invert(s1)
    expect(undone.enemies?.map((e) => e.id)).toEqual(['enemy-x']) // undo 精确移除新增
    // Update 缺目标 no-op
    const s2 = new UpdateEnemyCommand('ghost', { yPosOffset: 3 }).apply(s0)
    expect(s2).toBe(s0)
    // patch invert 只回滚 patch 命中的键
    const updateCommand = new UpdateEnemyCommand('enemy-x', { yPosOffset: 5 })
    const s3 = updateCommand.apply(s0)
    expect(s3.enemies![0]!.yPosOffset).toBe(5)
    expect(s3.enemies?.[0]?.id).toBe('enemy-x') // 未 patch 的键不动
    const s4 = updateCommand.invert(s3)
    expect(s4.enemies?.[0]?.yPosOffset).toBe(0)
  })
})
