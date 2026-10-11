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
 * 本文件新增合同：B2 真实已删除深链、B4 材料/产物多处缺引用去重、
 * B6 crafting 提示 trim/清空、B7 消耗者唯一材料门、B8 999 档上限、B9 草稿身份切换。
 * B5 静态快照与 B10 不可达拒绝路径撤回；独立裁决见共同证据 codex-review.md。
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
  seedSession,
  spiritGourd,
  typeDraft,
  undoInAct,
} from './__tests__/item-alchemy-boundaries/kit.js'

let boundary: BoundaryHost
let host: HTMLDivElement
const tierCapTitle = 'B8 灵葫 999 档上限：追加禁用零历史漂移，合法降档后恢复可追加且同步克隆末档'
let tierCapFixture:
  | { session: EditSession; rewards: { itemId: string; count: number }[] }
  | undefined

beforeEach(async ({ task }) => {
  boundary = await createBoundaryHost()
  host = boundary.host
  tierCapFixture = undefined
  if (task.name === tierCapTitle) {
    // 完整 999 行真实 UI 是合同输入夹具；初始化与下面的业务动作使用 runner 各自的默认期限。
    // 不模拟组件、核心或 DOM，不更改超时配置；afterEach 照常卸载整棵真实组件树。
    const rewards = Array.from({ length: 999 }, (_, index) => ({
      itemId: 'reward-b8',
      count: index + 1,
    }))
    const session = await seedSession([
      plainItem('reward-b8', '行军丹'),
      spiritGourd('gourd-b8', '紫金葫芦', 999, rewards),
    ])
    await mountSurface(boundary, { session, surface: 'spirit-gourd', focus: 'gourd-b8' })
    tierCapFixture = { session, rewards }
  }
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
      '\u26a0 未找到 ghost-b4',
    )
    expect(host.querySelector('[aria-label="配方 3 产物物品"]')?.textContent).toContain(
      '\u26a0 未找到 phantom-b4',
    )
    // 只读呈现：原配方不被自动修复，零派发。
    expect(session.getHistoryVersion()).toBe(0)
    expect(craftEffect(session, 'vessel-b4')).toEqual(before)
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

  test('B7 仅消耗者 owner 时追加禁用，公开补材料后恢复合法追加', async () => {
    const vessel = craftVessel(
      'vessel-b7',
      '炼蛊皿',
      [
        {
          ingredients: [{ itemId: 'material-b7', count: 1 }],
          products: [{ itemId: 'vessel-b7', count: 1 }],
        },
      ],
      true,
    )
    const session = await seedSession([vessel])
    await mountSurface(boundary, { session, surface: 'crafting', focus: 'vessel-b7' })

    // 未解析材料引用属于损坏内容域；schema 合法，不以自身材料绕过守卫。
    // 真实 UI：追加按钮禁用（不点禁用按钮冒充执行）。
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

  test(tierCapTitle, async () => {
    if (!tierCapFixture) throw new Error('999 档真实 UI 夹具未初始化')
    const { session, rewards } = tierCapFixture
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

  test('B9 外部版本推进丢弃在途草稿，不落账', async () => {
    const session = await seedSession([
      plainItem('material-b9', '毒蛇卵'),
      plainItem('product-b9', '蛊'),
      craftVessel('vessel-b9', '炼蛊皿', [
        {
          ingredients: [{ itemId: 'material-b9', count: 1 }],
          products: [{ itemId: 'product-b9', count: 1 }],
        },
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
  })
})
