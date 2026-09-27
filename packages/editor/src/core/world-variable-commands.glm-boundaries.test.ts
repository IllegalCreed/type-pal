/**
 * TEST-GLM-STATE-COMMANDS-1 D04：world-variable-commands 残差。
 * 去重：world-variable-commands.test.ts 六例（barrel/错误形状、create+undo/redo、同值 no-op、
 * 引用阻断与零引用可删、canonical fail-closed、redo 重验）、commands-world.boundaries.test.ts
 * 六例（重复 id 幂等、零值保真、缺目标 no-op、invert 占用拒绝、删后往返深快照）——
 * 本文件只补冻结池内：Update 缺席 id/二次 apply 首轮 previous/undo 时变量缺席表仅插回该键、
 * Delete 二次 apply 首轮快照往返一致、未 apply invert 原引用。业务正例基座为正式空白项目
 * （保存门自证）；worldVariables 缺席表的防御轴单列于文末防御 describe。
 */
import { describe, expect, test } from 'vitest'
import {
  defensiveDefinitionStateWithout,
  expectInputsUnchanged,
  legalDefinitionState,
  realRefs,
} from './__tests__/glm-state-commands-d.js'
import {
  AddWorldVariableCommand,
  DeleteWorldVariableCommand,
  UpdateWorldVariableCommand,
} from './world-variable-commands.js'

const flag = (name: string, initial = false) => ({
  kind: 'flag' as const,
  name,
  description: '',
  initial,
})

describe('D04 world-variable-commands 残差', () => {
  test('Add：合法项目空 registry 注册成功；invert 移除该键', async () => {
    const s0 = await legalDefinitionState({ worldVariables: {} })
    const cmd = new AddWorldVariableCommand('score', flag('分数', false))
    const next = cmd.apply(s0)
    expect(next.worldVariables!.score).toEqual(flag('分数', false))
    const undone = cmd.invert(next)
    expect(undone.worldVariables).toEqual({})
    expectInputsUnchanged(() => cmd.apply(s0), [s0])
  })

  test('Update：缺席 id apply 原引用；未 apply invert 原引用', async () => {
    const s0 = await legalDefinitionState({ worldVariables: { score: flag('分数', false) } })
    const missing = new UpdateWorldVariableCommand('gone', flag('改名'))
    expect(missing.apply(s0)).toBe(s0)
    expect(missing.invert(s0)).toBe(s0)
    expectInputsUnchanged(() => missing.apply(s0), [s0])
  })

  test('Update：二次 apply 保持首轮 previous（undo 回首次前）', async () => {
    const s0 = await legalDefinitionState({ worldVariables: { score: flag('分数', false) } })
    const cmd = new UpdateWorldVariableCommand('score', flag('分数', true))
    const s1 = cmd.apply(s0)
    const s2 = cmd.apply(s1)
    expect(s2.worldVariables!.score!.initial).toBe(true)
    expect(cmd.invert(s2).worldVariables!.score).toEqual(flag('分数', false))
  })

  test('Delete：二次 apply 首轮快照往返一致；未 apply invert 原引用（真实索引）', async () => {
    const s0 = await legalDefinitionState({ worldVariables: { score: flag('分数', true) } })
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
})

describe('D04 world-variable-commands 防御轴（有意缺表）', () => {
  test('Update 与 Delete：worldVariables 表缺席 → 仅插回该键/原引用', async () => {
    const bare = await defensiveDefinitionStateWithout(['worldVariables'])
    const missing = new UpdateWorldVariableCommand('gone', flag('改名'))
    expect(missing.apply(bare)).toBe(bare)
    expect(new DeleteWorldVariableCommand('gone', realRefs).invert(bare)).toBe(bare)
    const s0 = await legalDefinitionState({ worldVariables: { score: flag('分数') } })
    const update = new UpdateWorldVariableCommand('score', flag('改名'))
    const applied = update.apply(s0)
    const tableless: typeof s0 = { ...applied, worldVariables: undefined }
    const undone = update.invert(tableless)
    expect(Object.keys(undone.worldVariables!)).toEqual(['score'])
    expect(undone.worldVariables!.score).toEqual(flag('分数'))
    const del = new DeleteWorldVariableCommand('score', realRefs)
    const removed = del.apply(s0)
    const delTableless: typeof s0 = { ...removed, worldVariables: undefined }
    const delUndone = del.invert(delTableless)
    expect(Object.keys(delUndone.worldVariables!)).toEqual(['score'])
  })
})
