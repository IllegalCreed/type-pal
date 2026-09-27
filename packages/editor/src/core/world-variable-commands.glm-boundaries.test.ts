/**
 * TEST-GLM-STATE-COMMANDS-1 D04：world-variable-commands 残差。
 * 去重：world-variable-commands.test.ts 六例（barrel/错误形状、create+undo/redo、同值 no-op、
 * 引用阻断与零引用可删、canonical fail-closed、redo 重验）、commands-world.boundaries.test.ts
 * 六例（重复 id 幂等、零值保真、缺目标 no-op、invert 占用拒绝、删后往返深快照）——
 * 本文件只补冻结池内：Add/Update/Delete 在 worldVariables 缺席表下的追加/插回、
 * Update/Delete 二次 apply 首轮捕获、Delete 未 apply invert 原引用。
 */
import { describe, expect, test } from 'vitest'
import { definitionState, expectInputsUnchanged } from './__tests__/glm-state-commands-d.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import {
  AddWorldVariableCommand,
  DeleteWorldVariableCommand,
  UpdateWorldVariableCommand,
} from './world-variable-commands.js'

const realRefs = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

const flag = (name: string, initial = false) => ({
  kind: 'flag' as const,
  name,
  description: '',
  initial,
})

const bareVariables = (): EditorState => {
  const state = definitionState()
  delete (state as { worldVariables?: unknown }).worldVariables
  return state
}

describe('D04 world-variable-commands 残差', () => {
  test('Add：worldVariables 缺席 → 注册成功；invert 清回空表', () => {
    const bare = bareVariables()
    const cmd = new AddWorldVariableCommand('score', flag('分数', false))
    const next = cmd.apply(bare)
    expect(next.worldVariables!.score).toEqual(flag('分数', false))
    const undone = cmd.invert(next)
    expect(undone.worldVariables).toEqual({})
    expectInputsUnchanged(() => cmd.apply(bare), [bare])
  })

  test('Update：缺席 id apply 原引用；二次 apply 保持首轮 previous（undo 回首次前）', () => {
    const s0 = definitionState({
      worldVariables: { score: flag('分数', false) },
    })
    const missing = new UpdateWorldVariableCommand('gone', flag('改名'))
    expect(missing.apply(s0)).toBe(s0)
    expect(missing.invert(s0)).toBe(s0)
    const cmd = new UpdateWorldVariableCommand('score', flag('分数', true))
    const s1 = cmd.apply(s0)
    const s2 = cmd.apply(s1)
    expect(s2.worldVariables!.score!.initial).toBe(true)
    expect(cmd.invert(s2).worldVariables!.score).toEqual(flag('分数', false))
  })

  test('Update：undo 时变量缺席表 → 仅插回该键', () => {
    const s0 = definitionState({ worldVariables: { score: flag('分数') } })
    const cmd = new UpdateWorldVariableCommand('score', flag('改名'))
    const applied = cmd.apply(s0)
    const bare: typeof applied = { ...applied, worldVariables: undefined }
    const undone = cmd.invert(bare)
    expect(Object.keys(undone.worldVariables!)).toEqual(['score'])
    expect(undone.worldVariables!.score).toEqual(flag('分数'))
  })

  test('Delete：二次 apply 首轮快照往返一致；未 apply invert 原引用（真实索引）', () => {
    const s0 = definitionState({ worldVariables: { score: flag('分数', true) } })
    const cmd = new DeleteWorldVariableCommand('score', realRefs)
    expect(new DeleteWorldVariableCommand('gone', realRefs).invert(s0)).toBe(s0)
    const s1 = cmd.apply(s0)
    expect(s1.worldVariables!.score).toBeUndefined()
    const restored = cmd.invert(s1)
    expect(restored.worldVariables!.score).toEqual(flag('分数', true))
    const s2 = cmd.apply(s0)
    expect(cmd.invert(s2).worldVariables!.score).toEqual(flag('分数', true))
    expectInputsUnchanged(() => cmd.apply(s0), [s0])
  })

  test('Delete：undo 时变量缺席表 → 仅插回该键', () => {
    const s0 = definitionState({ worldVariables: { score: flag('分数') } })
    const cmd = new DeleteWorldVariableCommand('score', realRefs)
    const removed = cmd.apply(s0)
    const bare: typeof removed = { ...removed, worldVariables: undefined }
    const undone = cmd.invert(bare)
    expect(Object.keys(undone.worldVariables!)).toEqual(['score'])
    expect(undone.worldVariables!.score).toEqual(flag('分数'))
  })
})
