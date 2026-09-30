// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-M-1 M02（ItemAlchemyTab.glm-m）：炼化工作台提交/取消边界。
 * 去重：ItemAlchemyTab.test.tsx（12 例）/ glm-leaf-wave（appendCraftRecipe 纯函数、行级列表、
 * consume=false 自材料）/ DataMode.item-alchemy 已证双 surface 挂载、行级编辑、禁删、reorder、
 * fail-loud 形状；本文件只补：工作台「添加对应关系」按钮到真实会话的落账（旧只证纯函数）、
 * 紫金葫芦「不可用提示」提交与清空删键，两者均过保存门并单命令撤销。
 */

import type { ItemData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  buttonByText,
  controlByLabel,
  fillAndBlur,
  loadLegalProject,
  stubNodeTestHost,
} from '../__tests__/glm-m/kit.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { CraftingAlchemyTab, SpiritGourdAlchemyTab } from './ItemAlchemyTab.js'

/** 订阅 session 版本，提交后按当前 canonical 重渲染（draft 域需要新鲜 syncToken）。 */
function CraftSurface(props: { session: EditSession; itemId: string }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  return (
    <CraftingAlchemyTab
      items={props.session.getState().items}
      session={props.session}
      focusObjectId={props.itemId}
    />
  )
}

function GourdSurface(props: { session: EditSession; itemId: string }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  return (
    <SpiritGourdAlchemyTab
      items={props.session.getState().items}
      session={props.session}
      focusObjectId={props.itemId}
    />
  )
}

function plain(id: string, name: string): ItemData {
  return { id, name, desc: [], buyPrice: 0, sellPrice: 0, sellable: false }
}

async function legalCraftSession(): Promise<EditSession> {
  const { state } = await loadLegalProject('glm-wave-m-alchemy')
  const items: ItemData[] = [
    plain('material-m', '毒蛇卵'),
    plain('product-m', '蛊'),
    {
      ...plain('gourd-m', '炼蛊皿'),
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'craftRecipe',
            recipes: [
              {
                ingredients: [{ itemId: 'material-m', count: 1 }],
                products: [{ itemId: 'product-m', count: 1 }],
              },
            ],
          },
        ],
      },
    },
  ]
  const next = { ...state, items }
  assertProjectSaveValid(next)
  return new EditSession(next)
}

async function legalGourdSession(): Promise<EditSession> {
  const { state } = await loadLegalProject('glm-wave-m-gourd')
  const items: ItemData[] = [
    plain('reward-m', '行军丹'),
    {
      ...plain('pool-m', '紫金葫芦'),
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'drawFromResourcePool',
            resource: 'collectValue',
            maxRoll: 1,
            rewards: [{ itemId: 'reward-m', count: 1 }],
          },
        ],
      },
    },
  ]
  const next = { ...state, items }
  assertProjectSaveValid(next)
  return new EditSession(next)
}

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  await stubNodeTestHost()
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
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('M02 ItemAlchemyTab 提交边界', () => {
  test('「添加对应关系」经真实会话追加缺省配方：单命令落账，undo 精确移除', async () => {
    const session = await legalCraftSession()
    await act(async () => {
      root.render(<CraftSurface session={session} itemId="gourd-m" />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()
    const beforeRecipes = structuredClone(
      session.getState().items.find((item) => item.id === 'gourd-m')!.use!.effects,
    )
    expect(beforeRecipes).toHaveLength(1)

    await act(async () => buttonByText(host, '添加对应关系').click())
    const effects = session.getState().items.find((item) => item.id === 'gourd-m')!.use!.effects
    expect(effects[0]!.kind).toBe('craftRecipe')
    const recipes = (
      effects[0] as { recipes: Array<{ ingredients: unknown[]; products: unknown[] }> }
    ).recipes
    expect(recipes).toHaveLength(2)
    // 缺省配方 = 首个非自身物品为材料 + 首个物品为产物（appendCraftRecipe 同一真值）。
    expect(recipes[1]).toEqual({
      ingredients: [{ itemId: 'material-m', count: 1 }],
      products: [{ itemId: 'material-m', count: 1 }],
    })
    expect(session.getHistoryVersion()).toBe(before + 1)
    assertProjectSaveValid(session.getState())

    expect(session.undo()).toBe(true)
    expect(session.getState().items.find((item) => item.id === 'gourd-m')!.use!.effects).toEqual(
      beforeRecipes,
    )
  })

  test('紫金葫芦「不可用提示」blur 提交；清空回空串删除 unavailableMessage 键', async () => {
    const session = await legalGourdSession()
    await act(async () => {
      root.render(<GourdSurface session={session} itemId="pool-m" />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()

    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '不可用提示'), '  灵葫值不足  ')
    expect(
      session.getState().items.find((entry) => entry.id === 'pool-m')!.use!.effects[0],
    ).toEqual({
      kind: 'drawFromResourcePool',
      resource: 'collectValue',
      maxRoll: 1,
      rewards: [{ itemId: 'reward-m', count: 1 }],
      unavailableMessage: '灵葫值不足',
    })
    expect(session.getHistoryVersion()).toBe(before + 1)
    assertProjectSaveValid(session.getState())

    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '不可用提示'), '')
    const effect = session.getState().items.find((entry) => entry.id === 'pool-m')!.use!
      .effects[0] as Record<string, unknown>
    // 清空提交 undefined：序列化落盘不留键。
    expect(effect.unavailableMessage).toBeUndefined()
    expect(session.getHistoryVersion()).toBe(before + 2)

    expect(session.undo()).toBe(true)
    expect(
      (
        session.getState().items.find((entry) => entry.id === 'pool-m')!.use!.effects[0] as {
          unavailableMessage?: string
        }
      ).unavailableMessage,
    ).toBe('灵葫值不足')
  })
})
