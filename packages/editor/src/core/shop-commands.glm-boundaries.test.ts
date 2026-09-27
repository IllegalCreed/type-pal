/**
 * TEST-GLM-STATE-COMMANDS-1 D01：shop-commands 残差。
 * 去重：shop-lifecycle.test.ts 五例（barrel+nextShopId 溢出、首店 manifest 登记+非法身份、
 * copy 快照与 redo、删除原序恢复+最后商店+redo 重验、provider 失败不授权删除）、
 * project-io.test.ts「shop create/copy/stock/delete save and reopen…」——本文件只补冻结池内：
 * UpdateShop 缺席 id no-op、二次 apply 首轮旧货单、AddShop 首登 manifest 的 undo→再 apply
 * 保持首轮、DuplicateShop 来源缺席恰抛与未 apply invert 原引用、DeleteShop 缺席 id。
 * 业务正例基座为正式空白项目（保存门自证）；shops 缺席表的防御轴单列于文末防御 describe。
 */
import { describe, expect, test } from 'vitest'
import {
  deepSnapshot,
  defensiveDefinitionStateWithout,
  expectExactError,
  expectInputsUnchanged,
  legalDefinitionState,
  mkShop,
  realRefs,
} from './__tests__/glm-state-commands-d.js'
import {
  AddShopCommand,
  DeleteShopCommand,
  DuplicateShopCommand,
  UpdateShopCommand,
} from './shop-commands.js'

describe('D01 shop-commands 残差', () => {
  test('UpdateShop：缺席 id apply 原引用；未 apply invert 原引用', async () => {
    const s0 = await legalDefinitionState({ shops: [mkShop(0)] })
    const missing = new UpdateShopCommand(9, ['item-1'])
    expect(missing.apply(s0)).toBe(s0)
    expect(missing.invert(s0)).toBe(s0)
    expectInputsUnchanged(() => missing.apply(s0), [s0])
  })

  test('UpdateShop：二次 apply 保持首轮旧货单（undo 回首次前）；旁店铺同引用保留', async () => {
    const s0 = await legalDefinitionState({ shops: [mkShop(0), mkShop(1)] })
    const cmd = new UpdateShopCommand(0, ['新货'])
    const s1 = cmd.apply(s0)
    expect(s1.shops!.find((shop) => shop.id === 0)!.items).toEqual(['新货'])
    expect(s1.shops!.find((shop) => shop.id === 1)).toBe(s0.shops!.find((shop) => shop.id === 1))
    const s2 = cmd.apply(s1)
    expect(cmd.invert(s2).shops!.find((shop) => shop.id === 0)!.items).toEqual([])
  })

  test('AddShop：manifest 首次登记 + undo 原引用还原；undo→再 apply 保持首轮 manifest', async () => {
    const s0 = await legalDefinitionState({ shops: [] })
    const cmd = new AddShopCommand(0)
    const s1 = cmd.apply(s0)
    expect(s1.shops).toEqual([mkShop(0)])
    expect(s1.manifest.content.shops).toBe('content/shops.json')
    const undone = cmd.invert(s1)
    expect(undone.shops).toEqual([])
    expect(undone.manifest).toBe(s0.manifest)
    const s2 = cmd.apply(undone)
    expect(s2.shops).toEqual([mkShop(0)])
    expect(cmd.invert(s2).manifest).toBe(s0.manifest)
    expectInputsUnchanged(() => cmd.apply(s0), [s0])
  })

  test('DuplicateShop：来源缺席恰抛（整串）；未 apply invert 原引用', async () => {
    const s0 = await legalDefinitionState({ shops: [mkShop(0)] })
    const snap = deepSnapshot(s0)
    expectExactError(() => new DuplicateShopCommand(9, 1).apply(s0), '商店 9 不存在')
    expect(new DuplicateShopCommand(9, 1).invert(s0)).toBe(s0)
    expect(s0).toEqual(snap)
  })

  test('DeleteShop：缺席 id apply 原引用；未 apply invert 原引用（真实引用索引）', async () => {
    const s0 = await legalDefinitionState({ shops: [mkShop(0)] })
    const cmd = new DeleteShopCommand(9, realRefs)
    expect(cmd.apply(s0)).toBe(s0)
    expect(new DeleteShopCommand(9, realRefs).invert(s0)).toBe(s0)
    const deleter = new DeleteShopCommand(0, realRefs)
    const removed = deleter.apply(s0)
    expect(removed.shops).toEqual([])
    expect(deleter.invert(removed).shops!.map((shop) => shop.id)).toEqual([0])
  })
})

describe('D01 shop-commands 防御轴（有意缺表）', () => {
  test('UpdateShop 与 DeleteShop：shops 表缺席 → apply/invert 原引用', async () => {
    const bare = await defensiveDefinitionStateWithout(['shops'])
    const missing = new UpdateShopCommand(0, ['item-1'])
    expect(missing.apply(bare)).toBe(bare)
    const cmd = new DeleteShopCommand(0, realRefs)
    expect(cmd.apply(bare)).toBe(bare)
    expect(cmd.invert(bare)).toBe(bare)
  })
})
