// @vitest-environment jsdom
/**
 * TEST-EDITOR-ALCHEMY-BOUNDARIES-1（B1–B10 有限清单）炼蛊/灵葫机制页边界合同。
 * 去重锚点（existing-proof，本文件不重复包装）：
 * - ItemAlchemyTab.test.tsx:117 current+index 精确引用数与 checking/stale/failed 标签、
 *   current 缺 referenceIndex 降级「检查失败」；:176 唯一配方/档位禁删原因；:241/:353
 *   双机制布局；:434 增删档单命令；:501 数量步进；:534 重排 no-op/undo；:600 配方
 *   物品/数量/删除单命令；:645 复合配方 fail-loud；:669 非 owner 深链；:688 零/多
 *   owner 与重复 effect；:731 奖励单缺引用明示。
 * - glm-data-authoring：maxRoll 直改扩缩、canonical owner 自动回报与 onOpenItem 身份。
 * - glm-m：「添加对应关系」落账、灵葫 unavailable 提交/清空删键。
 * - glm-leaf-wave：appendCraftRecipe 纯函数既有输入域、行级列表、consuming=false 自材料。
 * - item-alchemy(.boundaries).test.ts：core find/mutate/resize 拒绝与隔离、同值 no-dispatch。
 * 本文件新增合同：B2 真实已删除深链、B4 材料/产物多处缺引用去重、B5 会话权威拒绝传播、
 * B6 crafting 提示 trim/清空、B7 消耗者唯一材料门、B8 999 档上限、B9 草稿身份切换、
 * B10 拒绝收尾与跳转降级。B1/B3 为 existing-proof 裁决，见证据 contract-ledger。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AddItemCommand, DeleteItemCommand, UpdateItemCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { findItemAlchemyEffect } from '../core/item-alchemy.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  type BoundaryHost,
  blurField,
  buttonByText,
  controlByLabel,
  craftVessel,
  createBoundaryHost,
  destroyBoundaryHost,
  dispatchInAct,
  fillAndBlur,
  mountSurface,
  plainItem,
  rerenderSurface,
  seedSession,
  spiritGourd,
  typeDraft,
  undoInAct,
} from './__tests__/item-alchemy-boundaries/kit.js'
import { appendCraftRecipe } from './ItemAlchemyEditors.js'

let boundary: BoundaryHost
let host: HTMLDivElement

beforeEach(async () => {
  boundary = await createBoundaryHost()
  host = boundary.host
})

afterEach(async () => {
  await destroyBoundaryHost(boundary)
})

function craftEffect(session: EditSession, itemId: string) {
  const owner = session.getState().items.find((item) => item.id === itemId)
  expect(owner, `craft owner ${itemId}`).toBeDefined()
  return findItemAlchemyEffect(owner!, 'crafting')!.effect
}

function poolEffect(session: EditSession, itemId: string) {
  const owner = session.getState().items.find((item) => item.id === itemId)
  expect(owner, `pool owner ${itemId}`).toBeDefined()
  return findItemAlchemyEffect(owner!, 'spirit-gourd')!.effect
}

describe('TEST-EDITOR-ALCHEMY-BOUNDARIES-1 机制页边界', () => {
  test('B2 深链指向真实已删除物品：精确 deleted 空态，不自动跳 owner、不派生第二 owner、零写', async () => {
    const vessel = craftVessel('vessel-b2', '炼蛊皿', [
      {
        ingredients: [{ itemId: 'material-b2', count: 1 }],
        products: [{ itemId: 'product-b2', count: 1 }],
      },
    ])
    const session = await seedSession([
      plainItem('material-b2', '毒蛇卵'),
      plainItem('product-b2', '蛊'),
      vessel,
      plainItem('plain-b2', '普通物品'),
    ])
    const onObjectFocus = vi.fn()
    await mountSurface(boundary, {
      session,
      surface: 'crafting',
      focus: 'plain-b2',
      onObjectFocus,
    })

    // 公开命令真实删除深链目标（canonical owner 不受影响）。
    const removed = await dispatchInAct(
      session,
      new DeleteItemCommand('plain-b2', (current) => collectCurrentProjectReferenceIndex(current)),
    )
    expect(removed).toBe(true)

    expect(host.querySelector('.ds-empty-state__title')?.textContent).toBe('机制承载物品已被删除')
    expect(host.querySelector('.ds-empty-state p')?.textContent).toBe(
      '深链目标 plain-b2 已不在当前物品表。',
    )
    expect(host.querySelector('.ds-object-hero')).toBeNull()
    expect(host.querySelector('.insp-head .who')?.textContent).toBe('机制未就绪')
    // focus 恒真值：自动回报被抑制，不跳 owner；页面也不生成第二 owner。
    expect(onObjectFocus).not.toHaveBeenCalled()
    expect(session.getHistoryVersion()).toBe(1)
    const owners = session
      .getState()
      .items.filter((item) => findItemAlchemyEffect(item, 'crafting') !== undefined)
    expect(owners.map((item) => item.id)).toEqual(['vessel-b2'])
  })

  test('B4 材料/产物多处缺同一引用：Inspector 缺失集合去重，配方不被自动修复且零写', async () => {
    const vessel = craftVessel('vessel-b4', '炼蛊皿', [
      {
        ingredients: [{ itemId: 'ghost-b4', count: 1 }],
        products: [{ itemId: 'product-b4', count: 1 }],
      },
      {
        ingredients: [{ itemId: 'ghost-b4', count: 1 }],
        products: [{ itemId: 'ghost-b4', count: 1 }],
      },
      {
        ingredients: [{ itemId: 'material-b4', count: 1 }],
        products: [{ itemId: 'phantom-b4', count: 1 }],
      },
    ])
    const session = await seedSession([
      plainItem('material-b4', '毒蛇卵'),
      plainItem('product-b4', '蛊'),
      vessel,
    ])
    const before = structuredClone(craftEffect(session, 'vessel-b4'))

    await mountSurface(boundary, { session, surface: 'crafting', focus: 'vessel-b4' })

    const missingRow = [...host.querySelectorAll<HTMLElement>('.ds-property-row')].find((row) =>
      row.textContent?.includes('缺失引用'),
    )!
    expect(missingRow.textContent!.replace('缺失引用', '').trim()).toBe('ghost-b4、phantom-b4')
    // 材料/产物 combobox 对缺引用 id 显示稳定 id 警告（crafting caller；gourd 已由旧 :731 证）。
    expect(host.querySelector('[aria-label="配方 1 材料物品"]')?.textContent).toContain(
      '⚠ 未找到 ghost-b4',
    )
    expect(host.querySelector('[aria-label="配方 3 产物物品"]')?.textContent).toContain(
      '⚠ 未找到 phantom-b4',
    )
    // 只读呈现：原配方不被自动修复，零派发。
    expect(session.getHistoryVersion()).toBe(0)
    expect(craftEffect(session, 'vessel-b4')).toEqual(before)
  })

  test('B5 草稿提交以最新会话为准：目标 effect 已被公开命令移除时精确拒绝并传播，不吞错不误派发', async () => {
    const vessel = craftVessel('vessel-b5', '炼蛊皿', [
      {
        ingredients: [{ itemId: 'material-b5', count: 1 }],
        products: [{ itemId: 'product-b5', count: 1 }],
      },
    ])
    const session = await seedSession([
      plainItem('material-b5', '毒蛇卵'),
      plainItem('product-b5', '蛊'),
      vessel,
    ])
    const onStatusNotice =
      vi.fn<(notice: { kind: 'info' | 'error'; message: string } | undefined) => void>()
    // 静态快照挂载（合法 prop 形态：机制页自身不订阅 session），渲染停留在 strip 前。
    await mountSurface(boundary, {
      session,
      surface: 'crafting',
      focus: 'vessel-b5',
      subscribe: false,
      onStatusNotice,
    })

    // 公开命令把目标 effect 换成非炼蛊 effect：会话权威已变化，props 快照未刷新。
    expect(
      session.dispatch(
        new UpdateItemCommand('vessel-b5', {
          use: { target: 'scene', consuming: false, effects: [{ kind: 'healHp', amount: 1 }] },
        }),
      ),
    ).toBe(true)
    expect(session.getHistoryVersion()).toBe(1)

    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '材料不足提示'), '不足提示')

    expect(host.querySelector('p[role="alert"]')?.textContent).toBe(
      '物品 vessel-b5 缺 craftRecipe effect',
    )
    expect(onStatusNotice).toHaveBeenCalledTimes(1)
    expect(onStatusNotice).toHaveBeenCalledWith({
      kind: 'error',
      message: '物品 vessel-b5 缺 craftRecipe effect',
    })
    // 拒绝即终止：不误派发、不改写会话里的最新 owner 数据。
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().items.find((item) => item.id === 'vessel-b5')!.use).toEqual({
      target: 'scene',
      consuming: false,
      effects: [{ kind: 'healHp', amount: 1 }],
    })
  })

  test('B6 crafting 材料不足提示：trim 提交、清空删键、单命令历史边界可精确撤销', async () => {
    const baseRecipe = {
      ingredients: [{ itemId: 'material-b6', count: 1 }],
      products: [{ itemId: 'product-b6', count: 1 }],
    }
    const session = await seedSession([
      plainItem('material-b6', '毒蛇卵'),
      plainItem('product-b6', '蛊'),
      craftVessel('vessel-b6', '炼蛊皿', [baseRecipe]),
    ])
    await mountSurface(boundary, { session, surface: 'crafting', focus: 'vessel-b6' })
    const field = controlByLabel<HTMLInputElement>(host, '材料不足提示')

    await fillAndBlur(field, '  原料不足  ')
    expect(craftEffect(session, 'vessel-b6')).toEqual({
      kind: 'craftRecipe',
      recipes: [baseRecipe],
      unavailableMessage: '原料不足',
    })
    expect(session.getHistoryVersion()).toBe(1)
    assertProjectSaveValid(session.getState())

    await fillAndBlur(field, '')
    expect(craftEffect(session, 'vessel-b6').unavailableMessage).toBeUndefined()
    expect(session.getHistoryVersion()).toBe(2)

    expect(undoInAct(session)).toBe(true)
    expect(craftEffect(session, 'vessel-b6').unavailableMessage).toBe('原料不足')
  })

  test('B7 消耗者唯一材料门：仅 owner 自身时纯函数与 UI 双层禁用，物品数组公开变化后恢复合法追加', async () => {
    const vessel = craftVessel(
      'vessel-b7',
      '炼蛊皿',
      [
        {
          ingredients: [{ itemId: 'vessel-b7', count: 1 }],
          products: [{ itemId: 'vessel-b7', count: 1 }],
        },
      ],
      true,
    )
    const session = await seedSession([vessel])
    await mountSurface(boundary, { session, surface: 'crafting', focus: 'vessel-b7' })

    // 纯函数层：consuming 面排除 owner 作材料，唯一物品不构成合法缺省配方。
    expect(
      appendCraftRecipe(
        craftEffect(session, 'vessel-b7'),
        session.getState().items,
        'vessel-b7',
        true,
      ),
    ).toBeUndefined()
    // UI 层：追加按钮禁用（不点禁用按钮冒充执行）。
    expect(buttonByText(host, '添加对应关系').disabled).toBe(true)
    expect(session.getHistoryVersion()).toBe(0)

    // 物品数组公开变化：AddItemCommand 引入非 owner 材料 → 恢复合法追加并真实落账。
    expect(
      await dispatchInAct(session, new AddItemCommand(plainItem('material-b7', '毒蛇卵'))),
    ).toBe(true)
    const appendAfter = buttonByText(host, '添加对应关系')
    expect(appendAfter.disabled).toBe(false)
    await act(async () => {
      appendAfter.click()
    })
    const effect = craftEffect(session, 'vessel-b7')
    expect(effect.recipes).toHaveLength(2)
    expect(effect.recipes[1]).toEqual({
      ingredients: [{ itemId: 'material-b7', count: 1 }],
      products: [{ itemId: 'vessel-b7', count: 1 }],
    })
    expect(session.getHistoryVersion()).toBe(2)
  })

  test('B8 灵葫 999 档上限：追加禁用零历史漂移，合法降档后恢复可追加且同步克隆末档', async () => {
    const rewards = Array.from({ length: 999 }, (_, index) => ({
      itemId: 'reward-b8',
      count: index + 1,
    }))
    const session = await seedSession([
      plainItem('reward-b8', '行军丹'),
      spiritGourd('gourd-b8', '紫金葫芦', 999, rewards),
    ])
    await mountSurface(boundary, { session, surface: 'spirit-gourd', focus: 'gourd-b8' })
    assertProjectSaveValid(session.getState())

    expect(buttonByText(host, '增加消耗值').disabled).toBe(true)
    expect(session.getHistoryVersion()).toBe(0)

    // 合法降档（真实字段提交链）：追加恢复，追加档克隆降档后的末档。
    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '单次最高消耗'), '3')
    expect(poolEffect(session, 'gourd-b8').rewards).toEqual(rewards.slice(0, 3))
    const appendAfter = buttonByText(host, '增加消耗值')
    expect(appendAfter.disabled).toBe(false)
    await act(async () => {
      appendAfter.click()
    })
    const grown = poolEffect(session, 'gourd-b8')
    expect(grown.maxRoll).toBe(4)
    expect(grown.rewards).toEqual([...rewards.slice(0, 3), { itemId: 'reward-b8', count: 3 }])
    expect(session.getHistoryVersion()).toBe(2)
  })

  test('B9 草稿身份切换：外部版本推进丢弃在途草稿不落账，surface 切换不串旧提示/数量', async () => {
    const session = await seedSession([
      plainItem('material-b9', '毒蛇卵'),
      plainItem('product-b9', '蛊'),
      craftVessel('vessel-b9', '炼蛊皿', [
        {
          ingredients: [{ itemId: 'material-b9', count: 1 }],
          products: [{ itemId: 'product-b9', count: 1 }],
        },
      ]),
      spiritGourd('gourd-b9', '紫金葫芦', 3, [
        { itemId: 'reward-a-b9', count: 1 },
        { itemId: 'reward-b-b9', count: 1 },
        { itemId: 'reward-c-b9', count: 1 },
      ]),
    ])
    await mountSurface(boundary, { session, surface: 'crafting', focus: 'vessel-b9' })

    const craftField = controlByLabel<HTMLInputElement>(host, '材料不足提示')
    await typeDraft(craftField, '途中草稿')
    expect(craftField.value).toBe('途中草稿')

    // 公开命令推进事务版本：在途草稿随身份(source)变化被丢弃，不提交、不串写。
    expect(
      await dispatchInAct(session, new UpdateItemCommand('vessel-b9', { name: '外部改名' })),
    ).toBe(true)
    expect(craftField.value).toBe('')
    await blurField(craftField)
    expect(session.getHistoryVersion()).toBe(1)
    expect(craftEffect(session, 'vessel-b9').unavailableMessage).toBeUndefined()

    // 公开切换 surface：新机制页字段回到自身 canonical，不携带旧草稿，零写。
    await rerenderSurface(boundary, { session, surface: 'spirit-gourd', focus: 'gourd-b9' })
    const gourdField = controlByLabel<HTMLInputElement>(host, '不可用提示')
    expect(gourdField.value).toBe('')
    expect(controlByLabel<HTMLInputElement>(host, '单次最高消耗').value).toBe('3')
    await blurField(gourdField)
    expect(session.getHistoryVersion()).toBe(1)
  })

  test('B10 拒绝收尾与跳转降级：无 onOpenItem 不渲染跳转按钮，拒绝后恢复提交精确落账', async () => {
    const vessel = craftVessel('vessel-b10', '炼蛊皿', [
      {
        ingredients: [{ itemId: 'material-b10', count: 1 }],
        products: [{ itemId: 'product-b10', count: 1 }],
      },
    ])
    const session = await seedSession([
      plainItem('material-b10', '毒蛇卵'),
      plainItem('product-b10', '蛊'),
      vessel,
    ])
    const restoredUse = structuredClone(vessel.use)

    // 跳转降级：合法 prop 形态缺 onOpenItem → hero 仍标识 owner，但不渲染跳转按钮，零写。
    await mountSurface(boundary, {
      session,
      surface: 'crafting',
      focus: 'vessel-b10',
      subscribe: false,
    })
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('炼蛊皿 · vessel-b10')
    expect(
      [...host.querySelectorAll('button')].some(
        (button) => button.textContent?.trim() === '打开承载物品',
      ),
    ).toBe(false)
    expect(session.getHistoryVersion()).toBe(0)

    // 合法失效路径：公开命令移除目标 effect 后草稿提交被拒，零额外写。
    expect(
      session.dispatch(
        new UpdateItemCommand('vessel-b10', {
          use: { target: 'scene', consuming: false, effects: [{ kind: 'healHp', amount: 1 }] },
        }),
      ),
    ).toBe(true)
    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '材料不足提示'), '失效提交')
    expect(session.getHistoryVersion()).toBe(1)

    // 错误恢复：恢复 effect 后的重新提交精确落账一条命令。
    expect(session.dispatch(new UpdateItemCommand('vessel-b10', { use: restoredUse }))).toBe(true)
    await rerenderSurface(boundary, {
      session,
      surface: 'crafting',
      focus: 'vessel-b10',
      subscribe: false,
    })
    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '材料不足提示'), '恢复提示')
    expect(session.getHistoryVersion()).toBe(3)
    expect(craftEffect(session, 'vessel-b10').unavailableMessage).toBe('恢复提示')
  })
})
