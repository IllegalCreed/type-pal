// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1：ItemUseEffectEditor 场景/实体引用残差合同。
 *
 * 排重底账（既有证明，本文件不复制）：
 * - ItemUseEffectEditor.test.tsx:526 「场景实体效果显式保留失效引用…」：场景+实体双失效 ⚠ 保留、
 *   切场景取新场景首实体、无实体场景选项禁用（useState 回调层，未经真实 session/sceneIndex）。
 * - glm-ui-wave U1c:116/129/153/181：目标/菜单/battleOnly 提交、消耗自材料守卫、独占切换
 *   target 联动、解除状态末项 no-op（回调层）。
 * - kimi-workflows K10:187/299/381/435：链工作流、独占锁、可复用脚本 ref、解毒/施毒、投掷字段族
 *   （真实 EditSession；scenes 取 current.scenes，与 ItemTab.tsx:1866 同构）。
 * - glm-m M02:101/149：永久成长/明雷感知真实会话提交。
 * - entity-address-references.test.ts:167-216：item.use 的 placeEntityInFront 地址属实体引用
 *   collector 的受支持来源（core 层悬空检测 existing-proof；本文件只在真实 UI 修复流中作 oracle）。
 * - ItemAlchemyTab.boundary-contracts（已接收 B 批）B2/B4/B7 + 旧 :731：配方/奖励引用缺失的呈现
 *   与恢复属机制页；本编辑器对 craftRecipe/drawFromResourcePool 只读镜像 + 精确跳转
 *   （ItemUseEffectEditor.test.tsx:246 已证）——资源池/配方引用轴零新增。
 *
 * 夹具口径：物品与场景按作者文件种子经真实 loader 装载（loader 接受失效实体地址；仅编辑器
 * 保存门 collectMissingEntityAddressReferences 拒绝——损坏内容域与 B7 未解析材料同口径）。
 * 本文件只补三轴残差（真实 ItemTab caller）：
 * - R1 场景有效而实体引用失效：⚠ 实体选项保留、场景名经 sceneIndex 解析且无 ⚠、同场景改选
 *   实体修复、修复前后保存门红/绿极性翻转、单命令可撤销（ItemUseEffectEditor.tsx:813-833）。
 * - R3 healHp 转入 placeEntityInFront：默认目标跳过首个无实体场景取首个有实体场景、完整
 *   schema 单命令落库并联动 target→scene（ItemUseEffectEditor.tsx:276-286/945-957/906-932；
 *   独占塌缩与 scene 联动机制由 base:394/U1c:153 existing-proof）。
 * - R5 项目无可放置实体：类型选项经独占绕过仍提供（:962），选择失败经公开 onStatusNotice
 *   精确报错且零提交（:954-956 捕获臂 + :279 抛点）。
 */
import type { ItemData } from '@type-pal/content'
import {
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { stubNodeTestHost } from '../__tests__/glm-m/kit.js'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { EditorHistoryCoordinator } from '../core/editor-history-coordinator.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { toEditorState } from '../core/project-io.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { type ScriptEditorState, ScriptEditSession } from '../core/script-editor.js'
import { projectEditorItemShells } from '../core/script-editor-projection.js'
import { buildBlankProject } from '../core/seed.js'
import { ItemTab } from './ItemTab.js'

/** R1/R3 场景种子：blank 'start'（无实体，保持 index 首位）之后的第二场景，含两个实体。 */
const SCENE_RES_ENTITIES = [
  { id: 'e1', sprite: 'hero', pos: { col: 1, row: 1, height: 0 } },
  { id: 'e2', sprite: 'hero', pos: { col: 2, row: 2, height: 0 } },
]

function plainItem(id: string, name: string, use: ItemData['use']): unknown {
  return { id, name, desc: [], buyPrice: 0, sellPrice: 0, sellable: false, use }
}

interface ResidualRig {
  session: EditSession
  notices: Array<{ kind: 'info' | 'error'; message: string } | undefined>
}

let root: Root
let host: HTMLDivElement

/** 真实 ItemTab 装载（K10 rig 同构）：作者文件种子 → 真实 loader → 壳投影 → 会话 + 协调器。 */
async function mountItemTab(options: {
  items: unknown[]
  sceneRes?: boolean
  focus: string
}): Promise<ResidualRig> {
  const files = await buildBlankProject('glm-item-effect-residual')
  files['content/items.json'] = options.items
  if (options.sceneRes) {
    const index = files['content/scenes/index.json'] as {
      scenes: Array<{ id: string; name: string; path: string }>
    }
    index.scenes.push({ id: 'scene-res', name: '客舍', path: 'content/scenes/scene-res.json' })
    files['content/scenes/scene-res.json'] = {
      id: 'scene-res',
      mapId: 'start',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: structuredClone(SCENE_RES_ENTITIES),
    }
  }
  const source = fsaSource(memoryAuthorDirectory(files).dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  const state: EditorState = {
    ...toEditorState(project, scenes, maps, {}, []),
    items: projectEditorItemShells(project),
  }
  const session = new EditSession(state)
  const reader = createEditorAssetReader(source, () => session.getState())
  const canonical: ScriptEditorState = {
    scenes: structuredClone(scenes),
    items: structuredClone(project.authorContent.items),
    sharedScripts: structuredClone(project.authorContent.sharedScripts),
  }
  const scriptSession = new ScriptEditSession(canonical)
  const historyCoordinator = new EditorHistoryCoordinator(session, scriptSession)
  const notices: ResidualRig['notices'] = []
  const Harness = () => {
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
        referenceIndex={collectCurrentProjectReferenceIndex(current)}
        referenceStatus="current"
        getCurrentReferenceIndex={(state_) => collectCurrentProjectReferenceIndex(state_)}
        focusObjectId={options.focus}
        historyCoordinator={historyCoordinator}
        script={{ state: canonical, session: scriptSession }}
        onStatusNotice={(notice) => notices.push(notice)}
      />
    )
  }
  await act(async () => {
    root.render(<Harness />)
    await Promise.resolve()
  })
  return { session, notices }
}

function trigger(ariaLabel: string): HTMLButtonElement {
  const node = host.querySelector<HTMLButtonElement>(`button[aria-label="${ariaLabel}"]`)
  expect(node, `combobox ${ariaLabel}`).not.toBeNull()
  return node!
}

/** DsSelect 驱动（K10 chooseOption 同构）：aria-controls 域内按选项 label 精确匹配。 */
async function chooseOption(ariaLabel: string, label: string): Promise<void> {
  const node = trigger(ariaLabel)
  if (node.getAttribute('aria-expanded') !== 'true')
    await act(async () => {
      node.click()
    })
  const controls = node.getAttribute('aria-controls')
  const scope = (controls ? document.getElementById(controls) : null) ?? document
  const option = [...scope.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) =>
      candidate.querySelector('.ds-select-option__label')?.textContent === label ||
      candidate.textContent?.trim() === label,
  )
  expect(option, `下拉选项「${label}」`).toBeDefined()
  await act(async () => {
    option!.click()
  })
}

function useSpec(session: EditSession, itemId: string): ItemData['use'] {
  const item = session.getState().items.find((candidate) => candidate.id === itemId)
  expect(item, `物品 ${itemId}`).toBeDefined()
  return item!.use
}

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

describe('TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1 场景/实体引用残差', () => {
  test('R1 场景有效而实体失效：⚠ 实体保留、场景名经索引解析，同场景改选实体修复并翻转保存门极性', async () => {
    const staleEffect = {
      kind: 'placeEntityInFront' as const,
      target: { scene: 'scene-res', entity: 'ghost-e' },
      state: 2,
      unavailableMessage: '前方没有足够空间。',
    }
    const { session, notices } = await mountItemTab({
      focus: 'talisman-r1',
      sceneRes: true,
      items: [
        plainItem('talisman-r1', '召仆符', {
          target: 'scene',
          consuming: false,
          effects: [staleEffect],
        }),
      ],
    })

    // 失效态：loader 可装载，编辑器保存门精确拒绝；UI 只在实体轴呈现 ⚠，场景轴解析索引名。
    expect(() => assertProjectSaveValid(session.getState())).toThrow(
      '指向不存在的实体 "scene-res/ghost-e"',
    )
    expect(trigger('目标场景').textContent).toContain('客舍 · scene-res')
    expect(trigger('目标场景').textContent).not.toContain('⚠')
    expect(trigger('目标实体').textContent).toContain('⚠ ghost-e')

    await chooseOption('目标实体', 'e2 · 精灵 hero')
    expect(useSpec(session, 'talisman-r1')).toEqual({
      target: 'scene',
      consuming: false,
      effects: [
        {
          kind: 'placeEntityInFront',
          target: { scene: 'scene-res', entity: 'e2' },
          state: 2,
          unavailableMessage: '前方没有足够空间。',
        },
      ],
    })
    assertProjectSaveValid(session.getState())
    expect(trigger('目标实体').textContent).toContain('e2 · 精灵 hero')
    expect(trigger('目标实体').textContent).not.toContain('⚠')

    act(() => {
      expect(session.undo()).toBe(true)
    })
    expect(useSpec(session, 'talisman-r1')?.effects[0]).toEqual(staleEffect)
    expect(() => assertProjectSaveValid(session.getState())).toThrow(
      '指向不存在的实体 "scene-res/ghost-e"',
    )
    expect(trigger('目标实体').textContent).toContain('⚠ ghost-e')
    expect(notices).toEqual([])
  })

  test('R3 转入放置实体：默认目标跳过首个无实体场景，完整 schema 单命令落库并联动 scene 目标', async () => {
    const { session, notices } = await mountItemTab({
      focus: 'bell-r3',
      sceneRes: true,
      items: [
        plainItem('bell-r3', '召仆铃', {
          target: 'oneAlly',
          consuming: false,
          effects: [{ kind: 'healHp', amount: 30 }],
        }),
      ],
    })
    const before = session.getHistoryVersion()

    await chooseOption('效果 1 类型', '把场景实体放到玩家面前')
    expect(useSpec(session, 'bell-r3')).toEqual({
      target: 'scene',
      consuming: false,
      effects: [
        {
          kind: 'placeEntityInFront',
          target: { scene: 'scene-res', entity: 'e1' },
          state: 2,
          unavailableMessage: '前方没有足够空间。',
        },
      ],
    })
    expect(session.getHistoryVersion()).toBe(before + 1)
    assertProjectSaveValid(session.getState())

    act(() => {
      expect(session.undo()).toBe(true)
    })
    expect(useSpec(session, 'bell-r3')).toEqual({
      target: 'oneAlly',
      consuming: false,
      effects: [{ kind: 'healHp', amount: 30 }],
    })
    expect(notices).toEqual([])
  })

  test('R5 无可放置实体：类型选项仍提供放置实体，选择失败经公开 notice 精确报错且零提交', async () => {
    const { session, notices } = await mountItemTab({
      focus: 'charm-r5',
      items: [
        plainItem('charm-r5', '空置符', {
          target: 'oneAlly',
          consuming: false,
          effects: [{ kind: 'healHp', amount: 30 }],
        }),
      ],
    })
    const initial = structuredClone(useSpec(session, 'charm-r5'))
    const before = session.getHistoryVersion()

    await chooseOption('效果 1 类型', '把场景实体放到玩家面前')
    expect(notices).toEqual([{ kind: 'error', message: '项目没有场景实体，无法创建放置实体效果' }])
    expect(session.getHistoryVersion()).toBe(before)
    expect(useSpec(session, 'charm-r5')).toEqual(initial)
    assertProjectSaveValid(session.getState())
  })
})
