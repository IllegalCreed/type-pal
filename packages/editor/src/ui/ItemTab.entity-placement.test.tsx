// @vitest-environment jsdom
/**
 * 实体放置效果通过真实 ItemTab、作者 loader、sceneIndex 和保存门验证。
 * 分别观察失效实体修复、跳过空场景的默认目标、无实体时的错误与零提交。
 * 失效地址可被 loader 装载，但保存门拒绝；不把损坏引用当成合法保存数据。
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
import { pickCombobox, stubNodeTestHost } from '../__tests__/glm-m/kit.js'
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

/** 空 start 场景排在前面；第二场景提供两个实体以区分默认选择与手动修复。 */
const placementEntities = [
  { id: 'e1', sprite: 'hero', pos: { col: 1, row: 1, height: 0 } },
  { id: 'e2', sprite: 'hero', pos: { col: 2, row: 2, height: 0 } },
]

function plainItem(id: string, name: string, use: ItemData['use']): unknown {
  return { id, name, desc: [], buyPrice: 0, sellPrice: 0, sellable: false, use }
}

interface PlacementRig {
  session: EditSession
  notices: Array<{ kind: 'info' | 'error'; message: string } | undefined>
}

let root: Root
let host: HTMLDivElement
let historyCoordinator: EditorHistoryCoordinator | undefined

/** 作者文件经 loader 和壳投影装载；每次挂载独立会话和历史协调器。 */
async function mountItemTab(options: {
  items: unknown[]
  sceneRes?: boolean
  focus: string
}): Promise<PlacementRig> {
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
      entities: structuredClone(placementEntities),
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
  historyCoordinator = new EditorHistoryCoordinator(session, scriptSession)
  const notices: PlacementRig['notices'] = []
  const PlacementHarness = () => {
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
    root.render(<PlacementHarness />)
    await Promise.resolve()
  })
  return { session, notices }
}

function selectTrigger(ariaLabel: string): HTMLButtonElement {
  const node = host.querySelector<HTMLButtonElement>(`button[aria-label="${ariaLabel}"]`)
  expect(node, `combobox ${ariaLabel}`).not.toBeNull()
  return node!
}

function useSpec(session: EditSession, itemId: string): ItemData['use'] {
  const item = session.getState().items.find((candidate) => candidate.id === itemId)
  expect(item, `物品 ${itemId}`).toBeDefined()
  return item!.use
}

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  await stubNodeTestHost()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    try {
      historyCoordinator?.dispose()
    } finally {
      historyCoordinator = undefined
      host.remove()
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    }
  }
})

describe('ItemTab 实体放置引用', () => {
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
    expect(selectTrigger('目标场景').textContent).toContain('客舍 · scene-res')
    expect(selectTrigger('目标场景').textContent).not.toContain('⚠')
    expect(selectTrigger('目标实体').textContent).toContain('⚠ ghost-e')

    await pickCombobox(selectTrigger('目标实体'), 'e2 · 精灵 hero')
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
    expect(selectTrigger('目标实体').textContent).toContain('e2 · 精灵 hero')
    expect(selectTrigger('目标实体').textContent).not.toContain('⚠')

    act(() => {
      expect(session.undo()).toBe(true)
    })
    expect(useSpec(session, 'talisman-r1')?.effects[0]).toEqual(staleEffect)
    expect(() => assertProjectSaveValid(session.getState())).toThrow(
      '指向不存在的实体 "scene-res/ghost-e"',
    )
    expect(selectTrigger('目标实体').textContent).toContain('⚠ ghost-e')
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

    await pickCombobox(selectTrigger('效果 1 类型'), '把场景实体放到玩家面前')
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

    await pickCombobox(selectTrigger('效果 1 类型'), '把场景实体放到玩家面前')
    expect(notices).toEqual([{ kind: 'error', message: '项目没有场景实体，无法创建放置实体效果' }])
    expect(session.getHistoryVersion()).toBe(before)
    expect(useSpec(session, 'charm-r5')).toEqual(initial)
    assertProjectSaveValid(session.getState())
  })
})
