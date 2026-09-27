/**
 * TEST-GLM-STATE-COMMANDS-1 D01：shop-commands 残差。
 * 去重：shop-lifecycle.test.ts 五例（barrel+nextShopId 溢出、首店 manifest 登记+非法身份、
 * copy 快照与 redo、删除原序恢复+最后商店+redo 重验、provider 失败不授权删除）、
 * project-io.test.ts「shop create/copy/stock/delete save and reopen…」——本文件只补冻结池内：
 * UpdateShop 缺席 id/缺席表三向 no-op、缺席表首次登记、二次 apply 首轮旧货单、
 * DuplicateShop 来源缺席恰抛与未 apply invert 原引用、AddShop 二次 apply 首轮 manifest。
 */
import { describe, expect, test } from 'vitest'
import {
  deepSnapshot,
  definitionState,
  expectExactError,
  expectInputsUnchanged,
  mkShop,
} from './__tests__/glm-state-commands-d.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import {
  AddShopCommand,
  DeleteShopCommand,
  DuplicateShopCommand,
  UpdateShopCommand,
} from './shop-commands.js'

const realRefs = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

describe('D01 shop-commands 残差', () => {
  test('UpdateShop：缺席 id 与缺席表 apply 原引用；未 apply invert 原引用', () => {
    const s0 = definitionState({ shops: [mkShop(0)] })
    const bare = definitionState()
    const missing = new UpdateShopCommand(9, ['item-1'])
    expect(missing.apply(s0)).toBe(s0)
    expect(missing.apply(bare)).toBe(bare)
    expect(missing.invert(s0)).toBe(s0)
    expectInputsUnchanged(() => missing.apply(s0), [s0])
  })

  test('UpdateShop：缺席表（shops 缺失键）apply 原引用；旁店铺同引用保留', () => {
    const bare: ReturnType<typeof definitionState> = definitionState()
    delete (bare as { shops?: unknown }).shops
    expect(new UpdateShopCommand(0, ['item-1']).apply(bare)).toBe(bare)
    const s0 = definitionState({ shops: [mkShop(0), mkShop(1, ['item-9'])] })
    const cmd = new UpdateShopCommand(0, ['item-1', 'item-2'])
    const next = cmd.apply(s0)
    expect(next.shops!.find((shop) => shop.id === 0)!.items).toEqual(['item-1', 'item-2'])
    expect(next.shops!.find((shop) => shop.id === 1)).toBe(s0.shops!.find((shop) => shop.id === 1))
    expect(cmd.invert(next).shops!.find((shop) => shop.id === 0)!.items).toEqual([])
  })

  test('UpdateShop：二次 apply 保持首轮旧货单（undo 回首次前）', () => {
    const s0 = definitionState({ shops: [mkShop(0, ['旧货'])] })
    const cmd = new UpdateShopCommand(0, ['新货'])
    const s1 = cmd.apply(s0)
    const s2 = cmd.apply(s1)
    expect(s2.shops!.find((shop) => shop.id === 0)!.items).toEqual(['新货'])
    expect(cmd.invert(s2).shops!.find((shop) => shop.id === 0)!.items).toEqual(['旧货'])
  })

  test('AddShop：shops 缺席 → 追加 + manifest 首次登记；undo→再 apply 保持首轮 manifest', () => {
    const bare: ReturnType<typeof definitionState> = definitionState()
    delete (bare as { shops?: unknown }).shops
    const cmd = new AddShopCommand(0)
    const s1 = cmd.apply(bare)
    expect(s1.shops).toEqual([mkShop(0)])
    expect(s1.manifest.content.shops).toBe('content/shops.json')
    const undone = cmd.invert(s1)
    expect(undone.shops).toEqual([])
    expect(undone.manifest).toBe(bare.manifest)
    const s2 = cmd.apply(undone)
    expect(s2.shops).toEqual([mkShop(0)])
    expect(cmd.invert(s2).manifest).toBe(bare.manifest)
    expectInputsUnchanged(() => cmd.apply(bare), [bare])
  })

  test('DuplicateShop：来源缺席恰抛（整串）；未 apply invert 原引用', () => {
    const s0 = definitionState({ shops: [mkShop(0, ['item-1'])] })
    const snap = deepSnapshot(s0)
    expectExactError(() => new DuplicateShopCommand(9, 1).apply(s0), '商店 9 不存在')
    expect(new DuplicateShopCommand(9, 1).invert(s0)).toBe(s0)
    expect(s0).toEqual(snap)
  })

  test('DeleteShop：缺席 id apply 原引用；未 apply invert 原引用（真实引用索引）', () => {
    const s0 = definitionState({ shops: [mkShop(0)] })
    const cmd = new DeleteShopCommand(9, realRefs)
    expect(cmd.apply(s0)).toBe(s0)
    expect(new DeleteShopCommand(9, realRefs).invert(s0)).toBe(s0)
    const deleter = new DeleteShopCommand(0, realRefs)
    const removed = deleter.apply(s0)
    expect(removed.shops).toEqual([])
    expect(deleter.invert(removed).shops!.map((shop) => shop.id)).toEqual([0])
  })
})
