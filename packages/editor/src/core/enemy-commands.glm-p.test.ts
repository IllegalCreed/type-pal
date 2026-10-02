// @vitest-environment node
/**
 * TEST-GLM-WAVE-P-1 P04（enemy-commands.glm-p）：敌人编辑命令族的缺席臂、
 * 字段增删撤销与构造期快照合同（P04 首批）。
 * 去重（真实旧 fullName 锚）：
 * - enemy-commands.test.ts › C02 enemy command family › keeps enemy constructors on the old
 *   commands barrel and patches on first apply（已证 barrel 身份、label 与既有字段 patch/undo 主链）；
 *   本文件核 withEnemy 替换语义、未命中/缺席表守卫、缺席 id 命令臂、可选字段整键删除撤销与
 *   构造期快照——旧集未断言轴。
 * - battle-data-delete-commands.test.ts › fail closed while references exist 等（已证删除门禁）；
 *   本文件不碰 DeleteEnemyCommand。
 * 合法输入：完整 EnemyDef typed 夹具（无强转）；命令为公开构造器。
 */
import type { EnemyDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { pEditorState } from '../__tests__/glm-p/kit.js'
import type { EditorState } from './edit-session.js'
import { AddEnemyCommand, UpdateEnemyCommand, withEnemy } from './enemy-commands.js'

function enemy(id: string): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: `battle.${id}`,
    yPosOffset: 0,
    stats: {
      health: 10,
      level: 1,
      exp: 1,
      cash: 1,
      attackStrength: 5,
      magicStrength: 0,
      defense: 0,
      dexterity: 5,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 5 },
    sounds: {},
  }
}

function stateWith(...enemies: EnemyDef[]): EditorState {
  return pEditorState({ enemies })
}

describe('P04-G04 withEnemy 替换语义与守卫', () => {
  test('中位替换：其余条目同引用、替换槽为传入对象本身、原数组不变', () => {
    const a = enemy('enemy-a')
    const b = enemy('enemy-b')
    const c = enemy('enemy-c')
    const state = stateWith(a, b, c)
    const next = { ...b, yPosOffset: 9 }
    const out = withEnemy(state, 'enemy-b', next)
    expect(out).not.toBe(state)
    expect(out.enemies).toHaveLength(3)
    expect(out.enemies?.[0]).toBe(a)
    expect(out.enemies?.[1]).toBe(next)
    expect(out.enemies?.[2]).toBe(c)
    expect(state.enemies?.[1]?.yPosOffset).toBe(0)
  })

  test('未命中 id 与 enemies 表缺席 → 返回同一 state 引用', () => {
    const state = stateWith(enemy('enemy-a'))
    expect(withEnemy(state, 'ghost', enemy('ghost'))).toBe(state)
    const empty = pEditorState()
    expect(withEnemy(empty, 'enemy-a', enemy('enemy-a'))).toBe(empty)
  })
})

describe('P04-G05 UpdateEnemyCommand 缺席臂、字段增删撤销与构造期快照', () => {
  test('缺席 id：apply 与 invert 均原引用返回', () => {
    const state = stateWith(enemy('enemy-a'))
    const command = new UpdateEnemyCommand('ghost', { yPosOffset: 3 })
    expect(command.apply(state)).toBe(state)
    expect(command.invert(state)).toBe(state)
  })

  test('patch 新增可选字段 onDefeated：apply 增键；invert 整键删除（恢复对象不含键）', () => {
    const original = enemy('enemy-a')
    const state = stateWith(original)
    const command = new UpdateEnemyCommand('enemy-a', { onDefeated: [{ kind: 'clearDialog' }] })
    const applied = command.apply(state)
    expect(applied.enemies?.[0]?.onDefeated).toEqual([{ kind: 'clearDialog' }])
    const restored = command.invert(applied)
    expect(restored.enemies?.[0]).toEqual(original)
    expect('onDefeated' in (restored.enemies?.[0] as EnemyDef)).toBe(false)
  })

  test('构造期快照：构造后修改入参 patch 对象不影响命令行为', () => {
    const state = stateWith(enemy('enemy-a'))
    const patch = { yPosOffset: 5 }
    const command = new UpdateEnemyCommand('enemy-a', patch)
    patch.yPosOffset = 99
    expect(command.apply(state).enemies?.[0]?.yPosOffset).toBe(5)
  })

  test('AddEnemyCommand invert 按 id 精确移除，保留其余条目原引用', () => {
    const a = enemy('enemy-a')
    const state = stateWith(a)
    const command = new AddEnemyCommand(enemy('enemy-b'))
    const applied = command.apply(state)
    expect(applied.enemies?.map((entry) => entry.id)).toEqual(['enemy-a', 'enemy-b'])
    const restored = command.invert(applied)
    expect(restored.enemies).toHaveLength(1)
    expect(restored.enemies?.[0]).toBe(a)
  })
})
