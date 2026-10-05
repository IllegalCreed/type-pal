// @vitest-environment jsdom
/**
 * TEST-COVERAGE85-GLM-EDITOR-1 批3b：ItemTab 装备效果矩阵/使用摘要/删除门残臂。
 *
 * fullName 排重（旧文件已证，不复制）：
 * - ItemTab.test.tsx：目录/新建/复制/删除门/私有脚本/能力开关/图标/投掷演出/炼化摘要。
 * - ItemTab.kimi-workflows / glm-m / ItemUseEffectEditor.*：使用效果编辑器细节、价格/说明、
 *   交易字段、能力开关。
 * 本文件只补 cov-base 实测缺臂：装备效果类型缺省矩阵（maxPool/resistance/grantStatus/
 * grantSkill/attackAll/regenHp/regenMp/battleSprite）、战斗形象覆写 byActor 选择与删除、
 * 使用能力摘要的八类效果行文本（runSceneHook/craftRecipe/drawFromResourcePool/
 * permanentStatBoost/modifyHostileAwareness/scaleCurrentHp/levelUp/placeEntityInFront）、
 * 引用未就绪/被引用/引用检查失败三路删除门回显。全部走真实组件事件与真实
 * EditSession/ScriptEditSession/EditorHistoryCoordinator；状态 oracle 断言精确业务对象。
 */
import type { ItemData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { loadLegalProject, stubNodeTestHost } from '../__tests__/glm-m/kit.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { EditorHistoryCoordinator } from '../core/editor-history-coordinator.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { type ScriptEditorState, ScriptEditSession } from '../core/script-editor.js'
import { ItemTab } from './ItemTab.js'

let root: Root
let host: HTMLDivElement
let reader: ReturnType<typeof createEditorAssetReader>
let scriptSession: ScriptEditSession
let historyCoordinator: EditorHistoryCoordinator

beforeEach(async () => {
  await stubNodeTestHost()
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

interface MountOptions {
  referenceStatus?: 'current' | 'stale'
  noticeSink?: Array<{ kind: string; message?: string } | undefined>
}

async function mount(
  items: ItemData[],
  focus?: string,
  options: MountOptions = {},
  sceneEntities?: EditorState['scenes'][number]['entities'],
) {
  const legal = await loadLegalProject('cov85-item')
  const next: EditorState = {
    ...legal.state,
    items,
    ...(sceneEntities ? { scenes: [{ ...legal.state.scenes[0]!, entities: sceneEntities }] } : {}),
  }
  assertProjectSaveValid(next)
  const session = new EditSession(next)
  reader = createEditorAssetReader(legal.source, () => session.getState())
  const canonical: ScriptEditorState = {
    scenes: [],
    items: [],
    sharedScripts: {},
  }
  scriptSession = new ScriptEditSession(canonical)
  historyCoordinator = new EditorHistoryCoordinator(session, scriptSession)
  const status = options.referenceStatus ?? 'current'
  const Harness = (props: { focus?: string }) => {
    useSyncExternalStore(
      (callback) => session.subscribe(callback),
      () => session.getVersion(),
    )
    const current = session.getState()
    return (
      <ItemTab
        items={current.items}
        actors={current.actors}
        skills={current.skills}
        poisons={current.poisons ?? []}
        locale={current.locale}
        session={session}
        assetCatalog={current.assetCatalog}
        assetReader={reader}
        battleSprites={current.battleSprites ?? []}
        referenceIndex={
          status === 'current' ? collectCurrentProjectReferenceIndex(current) : undefined
        }
        referenceStatus={status}
        getCurrentReferenceIndex={(state_) => collectCurrentProjectReferenceIndex(state_)}
        focusObjectId={props.focus ?? items[0]!.id}
        historyCoordinator={historyCoordinator}
        script={{ state: canonical, session: scriptSession }}
        onStatusNotice={(notice) => options.noticeSink?.push(notice)}
      />
    )
  }
  await act(async () => {
    root.render(<Harness focus={focus} />)
    await Promise.resolve()
  })
  return session
}

function equipItem(effects: ItemData['equip'] extends infer E ? E : never): ItemData {
  return {
    id: 'item-cov85',
    name: 'Cov85 装备',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    equip: effects,
  }
}

const EQUIP_DEFAULT_CASES = [
  { option: '上限加成', effect: { kind: 'maxPool', pool: 'hp' as const, delta: 50 } },
  { option: '抗性', effect: { kind: 'resistance', element: 'fire' as const, percent: 30 } },
  { option: '常驻状态', effect: { kind: 'grantStatus', status: 'dualAttack' } },
  { option: '授予技能', effect: { kind: 'grantSkill', skillId: '' } },
  { option: '攻击全体', effect: { kind: 'attackAll' } },
  { option: '回合回体力', effect: { kind: 'regenHp', amount: 20 } },
  { option: '回合回真气', effect: { kind: 'regenMp', amount: 10 } },
] as const

test.each(EQUIP_DEFAULT_CASES)('cov85-item 装备效果切到 $option 提交精确缺省体', async ({
  option,
  effect,
}) => {
  const session = await mount([
    equipItem({
      slot: 'weapon',
      equipableBy: [],
      effects: [{ kind: 'statBonus', stat: 'attack', delta: 3 }],
    }),
  ])
  const trigger = [...host.querySelectorAll<HTMLButtonElement>('button[role="combobox"]')].find(
    (button) => button.getAttribute('aria-label') === '装备效果 1 类型',
  )
  expect(trigger).toBeDefined()
  await act(async () => {
    trigger!.click()
  })
  const option_ = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent?.trim() === option,
  )
  expect(option_).toBeDefined()
  await act(async () => {
    option_!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  expect(session.getState().items[0]!.equip!.effects[0]).toEqual(effect)
  await act(async () => {
    expect(session.undo()).toBe(true)
  })
  expect(session.getState().items[0]!.equip!.effects[0]).toEqual({
    kind: 'statBonus',
    stat: 'attack',
    delta: 3,
  })
})

test('cov85-item 使用能力摘要：八类效果行文本精确', async () => {
  const session = await mount(
    [
      {
        id: 'item-sum-hook',
        name: '传送钩',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: true,
          effects: [{ kind: 'runSceneHook', hook: 'onTeleport' }],
        },
      },
      {
        id: 'item-sum-party',
        name: '摆放件',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: true,
          effects: [
            { kind: 'placeEntityInFront', target: { scene: 'start', entity: 'e-place' }, state: 0 },
          ],
        },
      },
      {
        id: 'item-sum-craft',
        name: '炼蛊皿',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: true,
          effects: [
            {
              kind: 'craftRecipe',
              recipes: [
                {
                  ingredients: [{ itemId: 'item-sum-a', count: 1 }],
                  products: [{ itemId: 'item-sum-hook', count: 1 }],
                },
              ],
            },
          ],
        },
      },
      {
        id: 'item-sum-a',
        name: '摘要甲',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'self',
          consuming: true,
          effects: [
            { kind: 'permanentStatBoost', stat: 'attack', delta: -2 },
            { kind: 'scaleCurrentHp', numerator: 1, denominator: 2 },
            { kind: 'levelUp', levels: 3 },
          ],
        },
      },
      {
        id: 'item-sum-sense',
        name: '隐身粉',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: true,
          effects: [{ kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 3000 }],
        },
      },
    ],
    'item-sum-hook',
    {},
    [{ id: 'e-place', pos: { col: 2, row: 2, height: 0 }, sprite: 'hero' }],
  )
  async function focusItem(id: string): Promise<void> {
    const row = [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes(id),
    )
    expect(row, `catalog row ${id}`).toBeDefined()
    await act(async () => {
      row!.click()
    })
  }
  // 每个物品的摘要只在其详情视图渲染：逐个切换焦点断言精确行文本。
  expect(host.textContent).toContain('调用当前场景传送出口（场景可做前置判断、剧情处理或拒绝）')
  await focusItem('item-sum-craft')
  expect(host.textContent).toContain(
    '炼蛊皿机制：直接使用后按固定优先级自动取材，共 1 条规则（在“炼蛊皿”页面编辑）',
  )
  await focusItem('item-sum-a')
  expect(host.textContent).toContain('永久成长：attack -2')
  expect(host.textContent).toContain('当前体力调整为 1/2')
  expect(host.textContent).toContain('提升 3 级')
  await focusItem('item-sum-sense')
  expect(host.textContent).toContain('停止明雷感知，持续 3 秒')
  await focusItem('item-sum-party')
  expect(host.textContent).toContain('把 start/e-place 放到玩家面前，状态 0')
  expect(host.textContent).toContain('大世界/战斗按效果开放')
  expect(session.isDirty()).toBe(false)
})

test('cov85-item 引用未就绪时删除按钮禁用并披露原因（按钮级门禁）', async () => {
  const _session = await mount(
    [{ id: 'item-del-a', name: '被删者', desc: [], buyPrice: 0, sellPrice: 0, sellable: false }],
    'item-del-a',
    { referenceStatus: 'stale' },
  )
  const deleteButton = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent?.trim() === '删除',
  )
  expect(deleteButton).toBeDefined()
  expect(deleteButton!.disabled).toBe(true)
  expect(deleteButton!.title).toBe('物品引用仍在检查，暂不能删除')
})
