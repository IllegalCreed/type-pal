/**
 * TEST-GLM-STATE-COMMANDS-1 B02：poison-commands 残差。
 * 去重：commands.test.ts 三例（patch 名/ticks、undefined 删键清 lethalWith、AddPoison
 * 追加/重复 id 不动）、poison-commands.test.ts（barrel 身份 + 缺省 common）、
 * battle-data-delete-commands.test.ts 六例（真实引用拒删、原索引删还原、缺目标跳过、
 * oracle 失败零写、redo 重验）——本文件只补冻结池内：缺席表/缺席 id 三向 no-op、
 * patch 原缺席键 invert 无 phantom、构造期深拷贝、AddPoison 缺席表追加与未添加 invert、
 * DeletePoison 二次 apply 首轮快照、未 apply invert、undo 重占用恰抛、缺席表插回。
 */
import { describe, expect, test } from 'vitest'
import {
  baseCommandState,
  deepSnapshot,
  expectExactError,
  expectInputsUnchanged,
  mkPoison,
  realRefs,
} from './__tests__/glm-state-commands-b.js'
import type { PoisonPatch } from './poison-commands.js'
import { AddPoisonCommand, DeletePoisonCommand, UpdatePoisonCommand } from './poison-commands.js'

const noPoisons: ReturnType<typeof baseCommandState> = (() => {
  const state = baseCommandState()
  delete (state as { poisons?: unknown }).poisons
  return state
})()

describe('B02 poison-commands 残差', () => {
  test('UpdatePoison：poisons 缺席 → apply 原引用；未 apply invert 原引用', () => {
    const cmd = new UpdatePoisonCommand(551, { name: '改' })
    expect(cmd.apply(noPoisons)).toBe(noPoisons)
    expect(cmd.invert(noPoisons)).toBe(noPoisons)
    expectInputsUnchanged(() => cmd.apply(noPoisons), [noPoisons])
  })

  test('UpdatePoison：缺席 id apply 原引用；apply 后 id 消失 invert 原引用', () => {
    const s0 = baseCommandState({ poisons: [mkPoison(551)] })
    const cmd = new UpdatePoisonCommand(999, { name: '改' })
    expect(cmd.apply(s0)).toBe(s0)
    const applied = new UpdatePoisonCommand(551, { name: '改' }).apply(s0)
    const vanished: typeof s0 = { ...applied, poisons: [] }
    expect(new UpdatePoisonCommand(551, { name: '改' }).invert(vanished)).toBe(vanished)
  })

  test('UpdatePoison：patch 键原就缺席 → apply/invert 均不产生 phantom undefined 键', () => {
    const s0 = baseCommandState({ poisons: [mkPoison(551)] })
    const patch: PoisonPatch = { counters: undefined }
    const cmd = new UpdatePoisonCommand(551, patch)
    const s1 = cmd.apply(s0)
    expect('counters' in s1.poisons![0]!).toBe(false)
    const restored = cmd.invert(s1)
    expect('counters' in restored.poisons![0]!).toBe(false)
    expectInputsUnchanged(() => cmd.apply(s0), [s0, patch])
  })

  test('UpdatePoison：构造期深拷贝嵌套 patch——构造后改源不泄漏，apply 不别名', () => {
    const s0 = baseCommandState({ poisons: [mkPoison(551)] })
    const patch: PoisonPatch = { playerTicks: [{ hpDelta: -77 }] }
    const cmd = new UpdatePoisonCommand(551, patch)
    patch.playerTicks![0]!.hpDelta = -999
    const s1 = cmd.apply(s0)
    expect(s1.poisons![0]!.playerTicks).toEqual([{ hpDelta: -77 }])
    expect(s1.poisons![0]!.playerTicks![0]).not.toBe(patch.playerTicks![0])
    expect(cmd.invert(s1).poisons![0]!.playerTicks).toEqual([{ hpDelta: -10 }])
  })

  test('AddPoison：poisons 缺席 → 追加缺省毒 + invert 清回空表', () => {
    const cmd = new AddPoisonCommand(1000, '试验毒')
    const s1 = cmd.apply(noPoisons)
    expect(s1.poisons).toHaveLength(1)
    expect(s1.poisons![0]).toMatchObject({ id: 1000, name: '试验毒', curability: 'common' })
    expect(cmd.invert(s1).poisons).toEqual([])
  })

  test('AddPoison：重复 id apply no-op 原引用；未添加 invert 内容不变', () => {
    const s0 = baseCommandState({ poisons: [mkPoison(551)] })
    const cmd = new AddPoisonCommand(551, '重复')
    expect(cmd.apply(s0)).toBe(s0)
    const afterUndo = cmd.invert(s0)
    expect(afterUndo.poisons).toHaveLength(1)
    expect(afterUndo.poisons![0]).toEqual(s0.poisons![0])
    expectInputsUnchanged(() => cmd.apply(s0), [s0])
  })

  test('DeletePoison：poisons 缺席 apply 原引用；未 apply invert 原引用', () => {
    const cmd = new DeletePoisonCommand(551, realRefs)
    expect(cmd.apply(noPoisons)).toBe(noPoisons)
    expect(cmd.invert(noPoisons)).toBe(noPoisons)
  })

  test('DeletePoison：删除中位元素按原索引恢复；二次 apply 保持首轮快照（真实引用索引）', () => {
    const s0 = baseCommandState({
      poisons: [mkPoison(551), mkPoison(556, '鹤顶红'), mkPoison(557)],
    })
    const cmd = new DeletePoisonCommand(556, realRefs)
    const s1 = cmd.apply(s0)
    expect(s1.poisons!.map((poison) => poison.id)).toEqual([551, 557])
    expect(cmd.invert(s1).poisons!.map((poison) => poison.id)).toEqual([551, 556, 557])
    const s2 = cmd.apply(s0)
    expect(s2.poisons!.map((poison) => poison.id)).toEqual([551, 557])
    expect(cmd.invert(s2).poisons!.map((poison) => poison.id)).toEqual([551, 556, 557])
  })

  test('DeletePoison：undo 时 id 已被占用恰抛（整串 message）；缺席表 invert 仍插回', () => {
    const s0 = baseCommandState({ poisons: [mkPoison(551), mkPoison(556)] })
    const cmd = new DeletePoisonCommand(556, realRefs)
    const removed = cmd.apply(s0)
    const reoccupied = new AddPoisonCommand(556, '占位').apply(removed)
    expectExactError(() => cmd.invert(reoccupied), '无法撤销删除：毒 id 已被占用 556')
    const bare: typeof s0 = { ...removed, poisons: undefined }
    expect(cmd.invert(bare).poisons!.map((poison) => poison.id)).toEqual([556])
    const snap = deepSnapshot(removed)
    expect(removed).toEqual(snap)
  })
})
