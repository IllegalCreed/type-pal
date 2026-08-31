// @vitest-environment jsdom
import type { ItemData } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type EditorState, EditSession } from '../core/edit-session.js'
import { findItemAlchemyEffect } from '../core/item-alchemy.js'
import { CraftingAlchemyTab, SpiritGourdAlchemyTab } from './ItemAlchemyTab.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

function plain(id: string, name = id): ItemData {
  return {
    id,
    name,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  }
}

function palItems(): ItemData[] {
  const ingredients = [
    ['117', '毒蛇卵'],
    ['118', '毒蝎卵'],
    ['119', '毒蟾卵'],
    ['120', '蜘蛛卵'],
    ['121', '蜈蚣卵'],
  ] as const
  const rewards = [
    ['100', '行军丹'],
    ['105', '还神丹'],
    ['95', '还魂香'],
    ['112', '试炼果'],
    ['72', '舍利子'],
    ['131', '蜂王蜜'],
    ['97', '孟婆汤'],
    ['102', '蟠果'],
    ['111', '灵葫仙丹'],
  ] as const
  return [
    ...ingredients.map(([id, name]) => plain(id, name)),
    plain('148', '蛊'),
    ...rewards.map(([id, name]) => plain(id, name)),
    {
      ...plain('268', '炼蛊皿'),
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'craftRecipe',
            recipes: ingredients.map(([itemId]) => ({
              ingredients: [{ itemId, count: 1 }],
              products: [{ itemId: '148', count: 1 }],
            })),
          },
        ],
      },
    },
    {
      ...plain('270', '紫金葫芦'),
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'drawFromResourcePool',
            resource: 'collectValue',
            maxRoll: 9,
            rewards: rewards.map(([itemId]) => ({ itemId, count: 1 })),
          },
        ],
      },
    },
  ]
}

function session(items = palItems()): EditSession {
  return new EditSession({
    items,
    maps: {},
    mapIndex: { version: 1, maps: [] },
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState)
}

describe('[reorder-family:item-alchemy-details] 双炼化工作台', () => {
  test('炼蛊皿是单一机制工作台，五条配方以材料到产物和运行时优先级呈现', async () => {
    const edit = session()
    await act(async () =>
      root.render(
        <CraftingAlchemyTab items={edit.getState().items} session={edit} focusObjectId="268" />,
      ),
    )

    expect(host.querySelector('.outliner')).toBeNull()
    expect(host.textContent).not.toContain('添加炼蛊皿')
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('炼蛊皿')
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('炼蛊皿 · 268')
    expect(host.textContent).toContain('游戏中只需使用炼蛊皿，不选择原材料')
    expect(host.textContent).toContain('每条规则固定一项材料和一项产物')
    expect(host.querySelector('.item-alchemy-list-card h2')?.textContent).toBe('自动取材规则')
    const recipeRows = [...host.querySelectorAll('.item-alchemy-recipe-row')]
    expect(recipeRows).toHaveLength(5)
    expect(recipeRows.every((row) => row.querySelectorAll('[role="combobox"]').length === 2)).toBe(
      true,
    )
    expect(recipeRows.every((row) => row.querySelectorAll('input').length === 2)).toBe(true)
    recipeRows.forEach((row, index) => {
      const fieldLabels = [...row.querySelectorAll<HTMLLabelElement>('.ds-field__label')]
      expect(fieldLabels.map((label) => label.textContent?.trim())).toEqual([
        '材料',
        '材料数量',
        '产物',
        '产物数量',
      ])
      for (const label of fieldLabels) {
        expect(label.htmlFor).not.toBe('')
        expect(row.contains(document.getElementById(label.htmlFor))).toBe(true)
      }
      const recipeNumber = index + 1
      for (const kind of ['材料', '产物']) {
        const input = row.querySelector<HTMLInputElement>(
          `[aria-label="配方 ${recipeNumber} ${kind}数量"]`,
        )!
        expect(input.type).toBe('number')
        expect(input.closest('.ds-number-stepper')).not.toBeNull()
        expect(
          row.querySelector<HTMLButtonElement>(
            `button[aria-label="减少配方 ${recipeNumber} ${kind}数量"]`,
          )?.disabled,
        ).toBe(true)
        expect(
          row.querySelector(`button[aria-label="增加配方 ${recipeNumber} ${kind}数量"]`),
        ).not.toBeNull()
      }
    })
    expect(host.textContent).not.toMatch(/添加材料|添加产物/)
    expect(host.querySelector('button[aria-label^="删除材料"]')).toBeNull()
    expect(host.querySelector('button[aria-label^="删除产物"]')).toBeNull()
    expect(host.textContent).toContain('添加对应关系')
    expect(
      [...host.querySelectorAll('.item-alchemy-recipe-row__identity > span')].map(
        (entry) => entry.textContent,
      ),
    ).toEqual([
      '优先级 1 · 首个材料充足的配方生效',
      '优先级 2 · 首个材料充足的配方生效',
      '优先级 3 · 首个材料充足的配方生效',
      '优先级 4 · 首个材料充足的配方生效',
      '优先级 5 · 首个材料充足的配方生效',
    ])
    expect(host.querySelector('[aria-label="配方 1 材料物品"]')?.textContent).toContain('毒蛇卵')
    expect(host.querySelector('[aria-label="配方 1 产物物品"]')?.textContent).toContain('蛊')
    expect(
      host
        .querySelector('.item-alchemy-list-card .ds-workbench-section__content')
        ?.getAttribute('data-content-layout'),
    ).toBe('list')
    expect(
      host
        .querySelector('.item-alchemy-form-card .ds-workbench-section__content')
        ?.getAttribute('data-content-layout'),
    ).toBe('form')
    await verifyInspectorTabs(host, '炼蛊皿检查器', ['摘要', '公式'])
    const formulaTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (tab) => tab.textContent?.trim() === '公式',
    )!
    await act(async () => formulaTab.click())
    expect(host.textContent).toContain('包袱中直接使用炼蛊皿；没有第二步原材料选择')
    expect(host.textContent).toContain('毒蛇卵、毒蝎卵、毒蟾卵、蜘蛛卵、蜈蚣卵')
  })

  test('紫金葫芦逐行显示消耗 1..9 灵葫值与奖励，不出现商店价格文案', async () => {
    const edit = session()
    await act(async () =>
      root.render(
        <SpiritGourdAlchemyTab items={edit.getState().items} session={edit} focusObjectId="270" />,
      ),
    )

    const rows = [...host.querySelectorAll('.item-alchemy-reward-row')]
    expect(host.querySelector('.outliner')).toBeNull()
    expect(host.textContent).not.toContain('添加紫金葫芦')
    expect(host.querySelector('.item-alchemy-form-card')?.textContent).not.toContain('资源变量')
    expect(host.querySelector('.item-alchemy-form-card')?.textContent).not.toContain('collectValue')
    const sourceRow = [...host.querySelectorAll<HTMLElement>('.ds-property-row')].find((row) =>
      row.textContent?.includes('资源来源'),
    )!
    expect(sourceRow.querySelector('input, textarea, [role="combobox"]')).toBeNull()
    expect(sourceRow.querySelector('code')?.textContent).toBe('collectValue')
    expect(rows).toHaveLength(9)
    expect(rows.every((row) => row.querySelector('.ds-sequence-index') === null)).toBe(true)
    expect(rows.map((row) => row.querySelector('.item-alchemy-reward-cost')?.textContent)).toEqual(
      Array.from({ length: 9 }, (_, index) => `实际扣除 ${index + 1} 灵葫值`),
    )
    expect(
      rows.map((row, index) =>
        row
          .querySelector(`[aria-label="实际扣除 ${index + 1} 灵葫值的奖励物品"]`)
          ?.textContent?.trim(),
      ),
    ).toEqual([
      '行军丹100',
      '还神丹105',
      '还魂香95',
      '试炼果112',
      '舍利子72',
      '蜂王蜜131',
      '孟婆汤97',
      '蟠果102',
      '灵葫仙丹111',
    ])
    expect(host.textContent).not.toMatch(/买价|售价/)
    const formulaTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (tab) => tab.textContent?.trim() === '公式',
    )!
    await act(async () => formulaTab.click())
    expect(host.textContent).toContain('N 不是虚拟排序号或价格字段')
  })

  test('增加与删除实际消耗值各产生一条可撤销命令，并严格同步长度', async () => {
    const edit = session()
    const render = async () => {
      await act(async () =>
        root.render(
          <SpiritGourdAlchemyTab
            items={edit.getState().items}
            session={edit}
            focusObjectId="270"
          />,
        ),
      )
    }
    await render()
    const before = edit.getHistoryVersion()
    const add = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '增加消耗值',
    )!
    await act(async () => add.click())
    expect(edit.getHistoryVersion()).toBe(before + 1)
    let pool = findItemAlchemyEffect(
      edit.getState().items.find((item) => item.id === '270')!,
      'spirit-gourd',
    )!.effect
    expect(pool.maxRoll).toBe(10)
    expect(pool.rewards).toHaveLength(10)
    expect(edit.undo()).toBe(true)
    pool = findItemAlchemyEffect(
      edit.getState().items.find((item) => item.id === '270')!,
      'spirit-gourd',
    )!.effect
    expect(pool).toMatchObject({ maxRoll: 9 })
    expect(edit.redo()).toBe(true)
    expect(edit.undo()).toBe(true)
    await render()
    expect(host.querySelector('button[aria-label^="移除 "]')).toBeNull()

    const beforeDelete = edit.getHistoryVersion()
    const removeFourth = host.querySelector<HTMLButtonElement>(
      'button[aria-label="删除实际扣除 4 灵葫值的奖励"]',
    )!
    await act(async () => removeFourth.click())
    expect(edit.getHistoryVersion()).toBe(beforeDelete + 1)
    pool = findItemAlchemyEffect(
      edit.getState().items.find((item) => item.id === '270')!,
      'spirit-gourd',
    )!.effect
    expect(pool.maxRoll).toBe(8)
    expect(pool.rewards.map((reward) => reward.itemId)).toEqual([
      '100',
      '105',
      '95',
      '72',
      '131',
      '97',
      '102',
      '111',
    ])
    expect(edit.undo()).toBe(true)
    expect(
      findItemAlchemyEffect(
        edit.getState().items.find((item) => item.id === '270')!,
        'spirit-gourd',
      )!.effect.rewards,
    ).toHaveLength(9)
  })

  test('[reorder-family:item-alchemy-details] 配方与灵葫奖励移动都满足 no-op 0 命令、有效移动 1 命令和 undo/redo', async () => {
    const edit = session()
    await act(async () =>
      root.render(
        <CraftingAlchemyTab items={edit.getState().items} session={edit} focusObjectId="268" />,
      ),
    )
    const beforeCraft = edit.getHistoryVersion()
    const upFirstRecipe = host.querySelector<HTMLButtonElement>('button[aria-label="上移配方 1"]')!
    expect(upFirstRecipe.disabled).toBe(true)
    await act(async () => upFirstRecipe.click())
    expect(edit.getHistoryVersion()).toBe(beforeCraft)
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="下移配方 1"]')!.click(),
    )
    expect(edit.getHistoryVersion()).toBe(beforeCraft + 1)
    expect(
      findItemAlchemyEffect(
        edit.getState().items.find((item) => item.id === '268')!,
        'crafting',
      )!.effect.recipes.map((recipe) => recipe.ingredients[0]?.itemId),
    ).toEqual(['118', '117', '119', '120', '121'])
    expect(edit.undo()).toBe(true)
    expect(
      findItemAlchemyEffect(edit.getState().items.find((item) => item.id === '268')!, 'crafting')!
        .effect.recipes[0]?.ingredients[0]?.itemId,
    ).toBe('117')
    expect(edit.redo()).toBe(true)
    expect(edit.undo()).toBe(true)

    await act(async () =>
      root.render(
        <SpiritGourdAlchemyTab items={edit.getState().items} session={edit} focusObjectId="270" />,
      ),
    )
    const beforeReward = edit.getHistoryVersion()
    const upFirstReward = host.querySelector<HTMLButtonElement>(
      'button[aria-label="上移实际扣除 1 灵葫值的奖励"]',
    )!
    expect(upFirstReward.disabled).toBe(true)
    await act(async () => upFirstReward.click())
    expect(edit.getHistoryVersion()).toBe(beforeReward)
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('button[aria-label="下移实际扣除 1 灵葫值的奖励"]')!
        .click(),
    )
    expect(edit.getHistoryVersion()).toBe(beforeReward + 1)
    expect(
      findItemAlchemyEffect(
        edit.getState().items.find((item) => item.id === '270')!,
        'spirit-gourd',
      )!
        .effect.rewards.slice(0, 2)
        .map((reward) => reward.itemId),
    ).toEqual(['105', '100'])
    expect(edit.undo()).toBe(true)
    expect(
      findItemAlchemyEffect(
        edit.getState().items.find((item) => item.id === '270')!,
        'spirit-gourd',
      )!.effect.rewards[0]?.itemId,
    ).toBe('100')
    expect(edit.redo()).toBe(true)
  })

  test('配方物品、数量与删除分别保持单命令并可撤销', async () => {
    const edit = session()
    await act(async () =>
      root.render(
        <CraftingAlchemyTab items={edit.getState().items} session={edit} focusObjectId="268" />,
      ),
    )

    const material = host.querySelector<HTMLButtonElement>('[aria-label="配方 1 材料物品"]')!
    const beforePicker = edit.getHistoryVersion()
    await act(async () => material.click())
    const poisonEgg = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.includes('毒蝎卵'),
    )!
    await act(async () => poisonEgg.click())
    expect(edit.getHistoryVersion()).toBe(beforePicker + 1)
    expect(
      findItemAlchemyEffect(edit.getState().items.find((item) => item.id === '268')!, 'crafting')!
        .effect.recipes[0]?.ingredients[0]?.itemId,
    ).toBe('118')
    expect(edit.undo()).toBe(true)

    const beforeCount = edit.getHistoryVersion()
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="增加配方 1 材料数量"]')!.click(),
    )
    expect(edit.getHistoryVersion()).toBe(beforeCount + 1)
    expect(
      findItemAlchemyEffect(edit.getState().items.find((item) => item.id === '268')!, 'crafting')!
        .effect.recipes[0]?.ingredients[0]?.count,
    ).toBe(2)
    expect(edit.undo()).toBe(true)

    const beforeDelete = edit.getHistoryVersion()
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除配方 2"]')!.click(),
    )
    expect(edit.getHistoryVersion()).toBe(beforeDelete + 1)
    expect(
      findItemAlchemyEffect(edit.getState().items.find((item) => item.id === '268')!, 'crafting')!
        .effect.recipes,
    ).toHaveLength(4)
    expect(edit.undo()).toBe(true)
  })

  test('复合材料或多产物 shape 明确 fail-loud，不截断成第一项也不产生命令', async () => {
    const items = palItems()
    const vessel = items.find((item) => item.id === '268')!
    const craft = findItemAlchemyEffect(vessel, 'crafting')!.effect
    craft.recipes[0]!.ingredients.push({ itemId: '118', count: 1 })
    craft.recipes[0]!.products.push({ itemId: '117', count: 1 })
    const edit = session(items)
    const before = edit.getHistoryVersion()

    await act(async () =>
      root.render(
        <CraftingAlchemyTab items={edit.getState().items} session={edit} focusObjectId="268" />,
      ),
    )

    expect(host.textContent).toContain('炼蛊 owner 268 的规则 1 必须恰有 1 项材料和 1 项产物')
    expect(host.textContent).toContain('当前为 2 项材料、2 项产物')
    expect(host.querySelector('.item-alchemy-recipe-list')).toBeNull()
    expect(host.querySelector('[aria-label="配方 1 材料物品"]')).toBeNull()
    expect(edit.getHistoryVersion()).toBe(before)
    expect(craft.recipes[0]!.ingredients).toHaveLength(2)
    expect(craft.recipes[0]!.products).toHaveLength(2)
  })

  test('深链 owner 仍在但 effect 缺席时显示精确空态，不跳到其他 owner', async () => {
    const items = palItems()
    const plainOwner = plain('plain-owner', '普通容器')
    items.push(plainOwner)
    const edit = session(items)
    await act(async () =>
      root.render(
        <CraftingAlchemyTab
          items={edit.getState().items}
          session={edit}
          focusObjectId="plain-owner"
        />,
      ),
    )
    expect(host.textContent).toContain('目标不是炼蛊皿机制 owner')
    expect(host.textContent).toContain('机制页不会生成第二个 owner')
    expect(host.querySelector('.ds-object-hero')).toBeNull()
  })

  test('零 owner 与多 owner 都 fail-loud，不退化成机制对象列表', async () => {
    const withoutVessel = palItems().filter((item) => item.id !== '268')
    let edit = session(withoutVessel)
    await act(async () =>
      root.render(<CraftingAlchemyTab items={edit.getState().items} session={edit} />),
    )
    expect(host.textContent).toContain('项目缺少炼蛊皿机制')
    expect(host.querySelector('.outliner')).toBeNull()

    const duplicateOwner = plain('duplicate-vessel', '第二个炼蛊 owner')
    duplicateOwner.use = {
      target: 'scene',
      consuming: false,
      effects: [
        {
          kind: 'craftRecipe',
          recipes: [
            {
              ingredients: [{ itemId: '117', count: 1 }],
              products: [{ itemId: '148', count: 1 }],
            },
          ],
        },
      ],
    }
    edit = session([...palItems(), duplicateOwner])
    await act(async () =>
      root.render(<CraftingAlchemyTab items={edit.getState().items} session={edit} />),
    )
    expect(host.textContent).toContain('炼蛊皿机制检测到 2 个 owner')
    expect(host.textContent).toContain('不会把多个物品伪装成机制列表')
    expect(host.querySelector('.outliner')).toBeNull()

    const duplicateEffectItems = palItems()
    const vessel = duplicateEffectItems.find((item) => item.id === '268')!
    vessel.use!.effects.push(structuredClone(vessel.use!.effects[0]!))
    edit = session(duplicateEffectItems)
    await act(async () =>
      root.render(<CraftingAlchemyTab items={edit.getState().items} session={edit} />),
    )
    expect(host.textContent).toContain('物品 268 重复 2 个 craftRecipe effect')
  })

  test('奖励物品引用丢失时在机制 Inspector 明示稳定 id', async () => {
    const items = palItems()
    const gourd = items.find((item) => item.id === '270')!
    const pool = findItemAlchemyEffect(gourd, 'spirit-gourd')!.effect
    pool.rewards[3] = { itemId: 'missing-reward', count: 1 }
    const edit = session(items)
    await act(async () =>
      root.render(
        <SpiritGourdAlchemyTab items={edit.getState().items} session={edit} focusObjectId="270" />,
      ),
    )
    expect(host.textContent).toContain('missing-reward')
    expect(host.querySelector('[aria-label="实际扣除 4 灵葫值的奖励物品"]')?.textContent).toContain(
      '⚠ 未找到 missing-reward',
    )
  })
})
