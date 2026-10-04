// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1（ItemAlchemyTab）：maxRoll 直改与机制页身份合同。
 * 去重（旧证据锚点）：
 * - ItemAlchemyTab.test.tsx（12 例）已证机制摘要计数、唯一配方/档位禁删原因、双机制布局、
 *   「增加消耗值」按钮增删档位、数量步进器、reorder、配方物品/数量/删除、
 *   复合材料 fail-loud、深链非 owner 空态、零/多 owner fail-loud、缺失奖励引用。
 * - ItemAlchemyTab.glm-m.test.tsx 已证「添加对应关系」落账、不可用提示提交/清空删键。
 * - ItemAlchemyTab.glm-leaf-wave.test.tsx 已证 appendCraftRecipe 纯函数、行级列表编辑。
 * - DataMode.item-alchemy.test.tsx 已证双 surface 经 DataMode 挂载。
 * 缺口（本文件）：
 * 1. 「单次最高消耗」字段直改（resizeResourcePoolEffect 经真实提交链）——旧测只用
 *    「增加消耗值」按钮（maxRoll+1 + 克隆末档），字段直接输入 4/1 的扩张补档与截断
 *    裁剪从未经 UI 证明；奖励行数与 maxRoll 严格同步是本机制的核心不变量。
 * 2. 机制页身份合同——无深链挂载时 canonical owner 自动回报 onObjectFocus（深链回路
 *    建立），与「打开承载物品」按钮把 owner id 传出 onOpenItem；两者全旧测零命中。
 * 底座为真实 blank 项目（保存门自证）。
 */
import type { ItemData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import type { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { findItemAlchemyEffect } from '../core/item-alchemy.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import {
  createDataBattleHost,
  type DataBattleHost,
  destroyDataBattleHost,
  fillAndBlur,
  undoInAct,
} from './__tests__/glm-data-battle-kit.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { CraftingAlchemyTab, SpiritGourdAlchemyTab } from './ItemAlchemyTab.js'

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(async () => {
  const mounted = await createDataBattleHost()
  host = mounted.host
  root = mounted.root
})

afterEach(async () => {
  await destroyDataBattleHost({ host, root } satisfies DataBattleHost)
})

function plain(id: string, name: string): ItemData {
  return { id, name, desc: [], buyPrice: 0, sellPrice: 0, sellable: false }
}

interface Seeded {
  session: EditSession
  ownerItemId: string
}

/** 订阅 session 版本：提交后按当前 canonical 重渲染（draft 域需要新鲜 syncToken）。 */
function SessionSurface(props: {
  session: EditSession
  ownerItemId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenItem?: (id: string) => void
  surface: 'crafting' | 'spirit-gourd'
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const Surface = props.surface === 'crafting' ? CraftingAlchemyTab : SpiritGourdAlchemyTab
  return (
    <Surface
      items={props.session.getState().items}
      session={props.session}
      focusObjectId={props.ownerItemId}
      onObjectFocus={props.onObjectFocus}
      onOpenItem={props.onOpenItem}
    />
  )
}

async function mountSurface(
  session: EditSession,
  surface: 'crafting' | 'spirit-gourd',
  props: {
    ownerItemId?: string
    onObjectFocus?: (id: string | undefined) => void
    onOpenItem?: (id: string) => void
  },
): Promise<void> {
  await act(async () => {
    root.render(
      <SessionSurface
        session={session}
        surface={surface}
        ownerItemId={props.ownerItemId}
        onObjectFocus={props.onObjectFocus}
        onOpenItem={props.onOpenItem}
      />,
    )
    await Promise.resolve()
  })
}

/** 紫金葫芦合法项目：maxRoll=2，两档奖励（行军丹/还神丹）。 */
async function gourdSession(): Promise<Seeded> {
  const legal = await loadLegalUiProject('glm-data-battle-gourd')
  const items: ItemData[] = [
    plain('reward-a', '行军丹'),
    plain('reward-b', '还神丹'),
    {
      ...plain('pool-c', '紫金葫芦'),
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'drawFromResourcePool',
            resource: 'collectValue',
            maxRoll: 2,
            rewards: [
              { itemId: 'reward-a', count: 1 },
              { itemId: 'reward-b', count: 2 },
            ],
          },
        ],
      },
    },
  ]
  const state = { ...legal.state, items }
  assertProjectSaveValid(state)
  return { session: new EditSession(state), ownerItemId: 'pool-c' }
}

/** 炼蛊皿合法项目：单一 canonical owner。 */
async function craftSession(): Promise<Seeded> {
  const legal = await loadLegalUiProject('glm-data-battle-craft')
  const items: ItemData[] = [
    plain('material-c', '毒蛇卵'),
    plain('product-c', '蛊'),
    {
      ...plain('vessel-c', '炼蛊皿'),
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'craftRecipe',
            recipes: [
              {
                ingredients: [{ itemId: 'material-c', count: 1 }],
                products: [{ itemId: 'product-c', count: 1 }],
              },
            ],
          },
        ],
      },
    },
  ]
  const state = { ...legal.state, items }
  assertProjectSaveValid(state)
  return { session: new EditSession(state), ownerItemId: 'vessel-c' }
}

function poolEffect(session: EditSession, itemId: string) {
  return findItemAlchemyEffect(
    session.getState().items.find((item) => item.id === itemId)!,
    'spirit-gourd',
  )!.effect
}

describe('TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1 ItemAlchemyTab', () => {
  test('「单次最高消耗」直改：扩张克隆末档补齐、截断裁剪保序，单命令可精确撤销', async () => {
    const seeded = await gourdSession()
    await mountSurface(seeded.session, 'spirit-gourd', { ownerItemId: seeded.ownerItemId })
    expect(host.querySelectorAll('.item-alchemy-reward-row')).toHaveLength(2)
    expect(poolEffect(seeded.session, 'pool-c')).toEqual({
      kind: 'drawFromResourcePool',
      resource: 'collectValue',
      maxRoll: 2,
      rewards: [
        { itemId: 'reward-a', count: 1 },
        { itemId: 'reward-b', count: 2 },
      ],
    })
    const historyAtMount = seeded.session.getHistoryVersion()

    // 扩张 2→4：奖励行数与 maxRoll 严格同步，新增两档为末档深拷贝（count 保留）。
    const maxRollInput = host.querySelector<HTMLInputElement>(
      'input[aria-label="单次最高灵葫值消耗"]',
    )
    if (!maxRollInput) throw new Error('maxRoll input not found')
    await fillAndBlur(maxRollInput, '4')
    expect(seeded.session.getHistoryVersion()).toBe(historyAtMount + 1)
    expect(poolEffect(seeded.session, 'pool-c')).toEqual({
      kind: 'drawFromResourcePool',
      resource: 'collectValue',
      maxRoll: 4,
      rewards: [
        { itemId: 'reward-a', count: 1 },
        { itemId: 'reward-b', count: 2 },
        { itemId: 'reward-b', count: 2 },
        { itemId: 'reward-b', count: 2 },
      ],
    })
    expect(host.querySelectorAll('.item-alchemy-reward-row')).toHaveLength(4)
    assertProjectSaveValid(seeded.session.getState())

    // 截断 4→1：保留首档，后续档位裁剪。
    await fillAndBlur(maxRollInput, '1')
    expect(seeded.session.getHistoryVersion()).toBe(historyAtMount + 2)
    expect(poolEffect(seeded.session, 'pool-c')).toEqual({
      kind: 'drawFromResourcePool',
      resource: 'collectValue',
      maxRoll: 1,
      rewards: [{ itemId: 'reward-a', count: 1 }],
    })
    expect(host.querySelectorAll('.item-alchemy-reward-row')).toHaveLength(1)
    assertProjectSaveValid(seeded.session.getState())

    // undo 链精确还原：先回扩张态，再回初始两档。
    expect(undoInAct(seeded.session)).toBe(true)
    expect(poolEffect(seeded.session, 'pool-c').rewards).toHaveLength(4)
    expect(undoInAct(seeded.session)).toBe(true)
    expect(poolEffect(seeded.session, 'pool-c')).toEqual({
      kind: 'drawFromResourcePool',
      resource: 'collectValue',
      maxRoll: 2,
      rewards: [
        { itemId: 'reward-a', count: 1 },
        { itemId: 'reward-b', count: 2 },
      ],
    })
    expect(host.querySelectorAll('.item-alchemy-reward-row')).toHaveLength(2)
  })

  test('机制页身份：无深链挂载自动回报 canonical owner，「打开承载物品」传出 owner id', async () => {
    const seeded = await craftSession()
    const onObjectFocus = vi.fn()
    const onOpenItem = vi.fn()
    await mountSurface(seeded.session, 'crafting', { onObjectFocus, onOpenItem })

    // 无深链挂载：useEffect 自动回报 canonical owner，为父级建立深链回路。
    expect(onObjectFocus).toHaveBeenCalledTimes(1)
    expect(onObjectFocus).toHaveBeenCalledWith('vessel-c')
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('炼蛊皿 · vessel-c')

    // 打开承载物品：把 owner id 传出（跳转物品页的真实回调）。
    const openButton = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '打开承载物品',
    )
    if (!openButton) throw new Error('open carrier item button not found')
    await act(async () => {
      openButton.click()
    })
    expect(onOpenItem).toHaveBeenCalledTimes(1)
    expect(onOpenItem).toHaveBeenCalledWith('vessel-c')

    // 深链到位后不再自动回报（focus 分支抑制重复上报）。
    await act(async () => {
      root.render(
        <SessionSurface
          session={seeded.session}
          surface="crafting"
          ownerItemId="vessel-c"
          onObjectFocus={onObjectFocus}
          onOpenItem={onOpenItem}
        />,
      )
    })
    expect(onObjectFocus).toHaveBeenCalledTimes(1)
    expect(seeded.session.getHistoryVersion()).toBe(0)
  })
})
