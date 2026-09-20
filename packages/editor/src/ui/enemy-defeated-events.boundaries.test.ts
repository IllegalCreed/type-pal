/**
 * TEST-EDITOR-SCRIPT-HELPERS-1 S07：奖励可编辑区间与替换（ui/enemy-defeated-events.ts）。
 * 既有 enemy-defeated-events.test 已覆盖唯一顶层 giveItem/多奖励不可编辑/空 else 语义/
 * 摘要——不重复。本文件：默认 count 1、100% 无 skip 不吞前条、合法相邻 chance→stop 保护
 * 仍可编辑且区间含保护、替换重建分支/保留对白/无 current 追加、删唯一奖励返回 undefined、
 * 实际输入数组不变。
 */
import { describe, expect, test } from 'vitest'
import type { PresentableEnemyDefeatedCommand } from './enemy-defeated-events.js'
import {
  findEditableEnemyDefeatedItemReward,
  replaceEditableEnemyDefeatedItemReward,
} from './enemy-defeated-events.js'

const give = (itemId: string, count?: number): PresentableEnemyDefeatedCommand =>
  ({
    kind: 'giveItem',
    itemId,
    ...(count === undefined ? {} : { count }),
  }) as PresentableEnemyDefeatedCommand
const chanceStop = (skip: number): PresentableEnemyDefeatedCommand =>
  ({
    kind: 'branch',
    cond: { kind: 'chance', percent: skip },
    then: [{ kind: 'stopScript' }],
  }) as PresentableEnemyDefeatedCommand
const dialog: PresentableEnemyDefeatedCommand = {
  kind: 'dialog',
  character: 'actor.x',
  text: '拿到东西了',
} as unknown as PresentableEnemyDefeatedCommand

describe('S07 findEditableEnemyDefeatedItemReward 区间', () => {
  test('默认 count 1；100% 无 skip 的 startIndex 不吞前条；合法 chance→stop 保护区间含保护与对白', () => {
    expect(findEditableEnemyDefeatedItemReward([give('item-a')])).toEqual({
      startIndex: 0,
      endIndex: 1,
      itemId: 'item-a',
      count: 1, // 缺省 count
      probability: 100,
    })
    const guarded = [chanceStop(30), give('item-b', 2), dialog]
    expect(findEditableEnemyDefeatedItemReward(guarded)).toEqual({
      startIndex: 0, // 含保护分支
      endIndex: 3, // 分支 + give + 对白
      itemId: 'item-b',
      count: 2,
      probability: 70,
      dialog,
    })
    // 前置普通 branch → 不可安全编辑（现有合同）；非 branch 前条不吞
    const withPlainBranch = [
      { kind: 'branch', cond: { kind: 'chance', percent: 50 }, then: [dialog] },
      give('item-c'),
    ] as PresentableEnemyDefeatedCommand[]
    expect(findEditableEnemyDefeatedItemReward(withPlainBranch)).toBeUndefined()
  })
})

describe('S07 replaceEditableEnemyDefeatedItemReward 替换', () => {
  test('无 current 追加到尾；概率<100 重建 chance→stop；保留原对白；输入数组不变', () => {
    const empty: PresentableEnemyDefeatedCommand[] = []
    const appended = replaceEditableEnemyDefeatedItemReward(empty, undefined, {
      itemId: 'item-x',
      count: 3,
      probability: 80,
    })
    expect(appended).toEqual([chanceStop(20), give('item-x', 3)])

    const guarded = [chanceStop(30), give('item-b', 2), dialog]
    const snapshot = structuredClone(guarded)
    const current = findEditableEnemyDefeatedItemReward(guarded)!
    const replaced = replaceEditableEnemyDefeatedItemReward(guarded, current, {
      itemId: 'item-y',
      count: 5,
      probability: 100,
    })
    expect(replaced).toEqual([give('item-y', 5), dialog]) // 100% 无分支、对白保留
    expect(structuredClone(guarded)).toEqual(snapshot) // 实际输入不变
  })
  test('next=undefined 删唯一奖励区间；删空返回 undefined', () => {
    const guarded = [chanceStop(30), give('item-b', 2), dialog]
    const current = findEditableEnemyDefeatedItemReward(guarded)!
    const removed = replaceEditableEnemyDefeatedItemReward(guarded, current, undefined)
    expect(removed).toBeUndefined() // 删空整段 → undefined（合同：不留空数组壳）
    expect(replaceEditableEnemyDefeatedItemReward([give('a')], undefined, undefined)).toEqual(
      [give('a')], // 无 current 且无 next：原样（不去删别人的）
    )
    const emptied = replaceEditableEnemyDefeatedItemReward(
      [give('a')],
      { startIndex: 0, endIndex: 1, itemId: 'a', count: 1, probability: 100 },
      undefined,
    )
    expect(emptied).toBeUndefined() // 删空 → undefined
  })
})
