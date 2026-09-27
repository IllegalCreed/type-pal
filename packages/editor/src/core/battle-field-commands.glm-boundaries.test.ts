/**
 * TEST-GLM-STATE-COMMANDS-1 D03：battle-field-commands 残差。
 * 去重：battle-field-commands.test.ts 六例（barrel/instanceof、first-create 原子登记+undo+
 * 构造深保真、update patch/invert+非法五行、复制共享引用+id 冲突、未引用可删+删空保留空表+
 * 默认字段删除被阻断）、commands.test.ts「UpdateBattleField:patch name/magicEffect」——
 * 本文件只补冻结池内：nextBattleFieldId 溢出恰抛、Add/Copy/Delete/Update 未 apply invert 原引用、
 * Copy 来源缺席恰抛、Delete 缺席 id/缺席表原引用、Update 缺席 id/二次 apply 首轮捕获/
 * undefined 删键还原/undo 时字段消失原引用。
 */

import { DEFAULT_BATTLE_FIELD_ID } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  definitionState,
  expectExactError,
  expectInputsUnchanged,
  mkField,
} from './__tests__/glm-state-commands-d.js'
import {
  AddBattleFieldCommand,
  CopyBattleFieldCommand,
  DeleteBattleFieldCommand,
  nextBattleFieldId,
  UpdateBattleFieldCommand,
} from './battle-field-commands.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

const realRefs = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

const bareFields = (): EditorState => {
  const state = definitionState()
  delete (state as { battleFields?: unknown }).battleFields
  return state
}

describe('D03 battle-field-commands 残差', () => {
  test('nextBattleFieldId：空表 → DEFAULT_BATTLE_FIELD_ID；溢出整串恰抛', () => {
    expect(nextBattleFieldId([])).toBe(DEFAULT_BATTLE_FIELD_ID)
    expect(nextBattleFieldId([mkField(0)])).toBe(1)
    expectExactError(
      () => nextBattleFieldId([mkField(Number.MAX_SAFE_INTEGER)]),
      '无法分配新的战场 id：已超出安全整数范围',
    )
  })

  test('AddBattleField：未 apply invert 原引用；缺席表首次创建 manifest 原子登记 + undo 还原', () => {
    const bare = bareFields()
    expect(new AddBattleFieldCommand(mkField(7)).invert(bare)).toBe(bare)
    const cmd = new AddBattleFieldCommand(mkField(7))
    const next = cmd.apply(bare)
    expect(next.battleFields).toEqual([mkField(7)])
    expect(next.manifest.content.battleFields).toBe('content/battle-fields.json')
    const undone = cmd.invert(next)
    expect(undone.manifest.content.battleFields).toBeUndefined()
    expect(undone.battleFields).toBeUndefined()
    expectInputsUnchanged(() => cmd.apply(bare), [bare])
  })

  test('CopyBattleField：来源缺席恰抛（整串）；未 apply invert 原引用', () => {
    const s0 = definitionState({ battleFields: [mkField(0)] })
    const snap = structuredClone(s0)
    expectExactError(() => new CopyBattleFieldCommand(9, 1).apply(s0), '复制失败：找不到战场 9')
    expect(new CopyBattleFieldCommand(9, 1).invert(s0)).toBe(s0)
    expect(s0).toEqual(snap)
  })

  test('DeleteBattleField：缺席 id 与缺席表 apply 原引用；未 apply invert 原引用（真实索引）', () => {
    const bare = bareFields()
    const s0 = definitionState({ battleFields: [mkField(0), mkField(7)] })
    const cmd = new DeleteBattleFieldCommand(9, realRefs)
    expect(cmd.apply(s0)).toBe(s0)
    expect(cmd.apply(bare)).toBe(bare)
    expect(new DeleteBattleFieldCommand(9, realRefs).invert(s0)).toBe(s0)
  })

  test('UpdateBattleField：缺席 id apply 原引用；二次 apply 首轮 oldPatch；可选键 undefined 删键与还原', () => {
    const s0 = definitionState({ battleFields: [mkField(7)] })
    const missing = new UpdateBattleFieldCommand(9, { name: 'x' })
    expect(missing.apply(s0)).toBe(s0)
    expect(missing.invert(s0)).toBe(s0)
    const named = new UpdateBattleFieldCommand(7, { name: '熔岩' }).apply(s0)
    const cmd = new UpdateBattleFieldCommand(7, { name: undefined, screenWave: 3 })
    const s1 = cmd.apply(named)
    expect('name' in s1.battleFields![0]!).toBe(false)
    expect(s1.battleFields![0]!.screenWave).toBe(3)
    const s2 = cmd.apply(s1)
    expect(cmd.invert(s2).battleFields![0]).toEqual({ ...mkField(7), name: '熔岩' })
    expectInputsUnchanged(() => cmd.apply(s0), [s0])
  })

  test('UpdateBattleField：undo 时字段消失原引用', () => {
    const s0 = definitionState({ battleFields: [mkField(7)] })
    const applied = new UpdateBattleFieldCommand(7, { name: '熔岩' }).apply(s0)
    const vanished: typeof applied = { ...applied, battleFields: [] }
    expect(new UpdateBattleFieldCommand(7, { name: 'x' }).invert(vanished)).toBe(vanished)
  })
})
