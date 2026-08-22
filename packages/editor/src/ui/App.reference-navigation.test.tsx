// @vitest-environment jsdom

import type { ItemData, SceneDef } from '@type-pal/content'
import type { LoadedCurrentProject } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type EditorState, EditSession } from '../core/edit-session.js'
import type { ItemReference } from '../core/item-references.js'
import { mergeEditorProjectionWithCurrentAuthorState } from '../core/script-editor-projection.js'
import {
  type CanonicalScriptReference,
  type ScriptEditorState,
  ScriptEditSession,
} from '../core/script-editor.js'
import { createLocalWorkspaceContext } from '../core/workspace-context.js'
import { App } from './App.js'

const probes = vi.hoisted(() => ({
  dataMode: vi.fn(),
  sceneWorkspace: vi.fn(),
  sceneCanvas: vi.fn(),
}))
const nativeScrollIntoView = HTMLElement.prototype.scrollIntoView
const testWorkspace = createLocalWorkspaceContext(
  'test',
  'local-directory',
  '11111111-1111-4111-8111-111111111111',
)

vi.mock('./DataMode.js', () => ({
  DataMode: (props: unknown) => {
    probes.dataMode(props)
    return <div data-testid="data-mode" />
  },
}))

vi.mock('./SceneScriptWorkspace.js', () => ({
  CanonicalSceneScriptWorkspace: (props: unknown) => {
    probes.sceneWorkspace(props)
    return <div data-testid="scene-script-workspace" />
  },
}))

vi.mock('./SceneCanvas.js', () => ({
  SceneCanvas: (props: unknown) => {
    probes.sceneCanvas(props)
    return <div data-testid="scene-canvas" />
  },
}))

function shellItem(): ItemData {
  return {
    id: '289',
    name: '石钥匙',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'scene',
      consuming: false,
      effects: [
        {
          kind: 'runScript',
          script: { chunk: '__author-script-runtime', id: 'item:289:use' },
        },
      ],
    },
  }
}

function shellScene(): SceneDef {
  return {
    id: 's047',
    mapId: 'm047',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e760',
        sprite: 'npc',
        pos: { col: 1, row: 1, height: 0 },
        facing: 'down',
        pages: [{ trigger: { on: 'interact', range: 1, stages: [] } }],
      },
    ],
  } as SceneDef
}

function shellState(): EditorState {
  return {
    manifest: {
      id: 'test',
      name: 'Test',
      contentVersion: 17,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's047',
          startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
        },
      ],
    },
    scenes: [shellScene()],
    actors: [],
    skills: [],
    levelUp: {},
    items: [shellItem()],
    locale: {},
    sprites: [],
    battleSprites: [],
    enemies: [],
    enemyTeams: [],
    battleFields: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
    shops: [],
    poisons: [],
    ambiences: [],
  } as unknown as EditorState
}

function canonicalState(): ScriptEditorState {
  return {
    scenes: [
      {
        id: 's047',
        mapId: 'm047',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'e760',
            sprite: 'npc',
            pos: { col: 1, row: 1, height: 0 },
            behaviors: {
              trigger: {
                default: {
                  label: '默认触发行为',
                  order: 0,
                  flow: {
                    kind: 'stages',
                    initial: 'initial',
                    stages: [
                      {
                        id: 'initial',
                        body: [
                          { kind: 'setFlag', flag: 'before-item', value: true },
                          { kind: 'giveItem', itemId: '289', count: 1 },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
    ],
    items: [
      {
        id: '289',
        name: '石钥匙',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'itemPrivateScript',
              script: {
                id: 'use',
                label: '石钥匙使用',
                body: [
                  { kind: 'setFlag', flag: 'before-lose', value: true },
                  { kind: 'loseItem', itemId: '289', count: 1 },
                ],
              },
            },
          ],
        },
      },
    ],
    sharedScripts: {},
  }
}

function itemReference(
  source: 'scene' | 'item',
  reference: Extract<CanonicalScriptReference, { kind: 'command' }>,
): ItemReference {
  return {
    itemId: '289',
    access: source === 'scene' ? 'reward' : 'lose',
    source,
    label: '石钥匙',
    where: reference.path,
    detail: source === 'scene' ? '获得 ×1' : '失去 ×1',
    locator: { kind: 'canonical-script', reference },
  }
}

const itemPrivateReference: Extract<CanonicalScriptReference, { kind: 'command' }> = {
  kind: 'command',
  path: 'items.289.use.effects[0].script.body[1].itemId',
  locator: {
    kind: 'command',
    owner: { kind: 'item-private-script', itemId: '289', ability: 'use', scriptId: 'use' },
    container: { kind: 'body' },
    commandPath: '1',
  },
}

const sceneReference: Extract<CanonicalScriptReference, { kind: 'command' }> = {
  kind: 'command',
  path: 'scenes.s047.entities.e760.behaviors.trigger.default.flow.stages.initial.body[1].itemId',
  locator: {
    kind: 'command',
    owner: {
      kind: 'entity-behavior',
      sceneId: 's047',
      entityId: 'e760',
      channel: 'trigger',
      behaviorId: 'default',
    },
    container: { kind: 'step', stepId: 'initial', section: 'body' },
    commandPath: '1',
  },
}

type DataModeProbe = {
  onOpenItemReference: (reference: ItemReference) => void
  focusItemPrivateScript?: {
    itemId: string
    ability: 'use' | 'throw'
    scriptId: string
    commandPath: string
    revision: number
  }
}

type SceneWorkspaceProbe = {
  selectedEntityId?: string | null
  focusReference?: { reference: CanonicalScriptReference; revision: number }
}

type SceneCanvasProbe = {
  placingEntity: boolean
  selectedEntityId: string | null
  selectedTriggerActivation?: { on: 'interact' | 'touch'; range?: number }
  onAddAt: (cell: { col: number; row: number }) => void
  onClearSelection: () => void
}

function button(text: string, root: ParentNode = document): HTMLButtonElement {
  const match = [...root.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  if (!match) throw new Error(`button not found: ${text}`)
  return match
}

describe('App item reference navigation', () => {
  let host: HTMLDivElement
  let root: Root
  let renderedScriptSession: ScriptEditSession

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    window.history.replaceState({}, '', '/?module=item&page=item&object=289')
    window.localStorage.clear()
    probes.dataMode.mockClear()
    probes.sceneWorkspace.mockClear()
    probes.sceneCanvas.mockClear()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    )
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    if (nativeScrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        writable: true,
        value: nativeScrollIntoView,
      })
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
    }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const renderApp = async (
    shell = shellState(),
    canonical = canonicalState(),
  ): Promise<EditSession> => {
    shell.manifest = {
      ...shell.manifest,
      contentVersion: 17,
      minimumSaveVersion: 8,
    } as EditorState['manifest']
    const source = {
      readText: vi.fn(async () => ''),
      readJson: vi.fn(async () => ({})),
      readBytes: vi.fn(async () => new ArrayBuffer(0)),
      urlFor: vi.fn(async () => 'about:blank'),
    }
    const project = {
      source,
      assetBase: {},
      manifest: shell.manifest,
      authorContent: { items: canonical.items, sharedScripts: canonical.sharedScripts },
      worldVariables: shell.worldVariables ?? {},
    } as unknown as LoadedCurrentProject
    const session = new EditSession(shell)
    renderedScriptSession = new ScriptEditSession(canonical)
    await act(async () =>
      root.render(
        <App
          session={session}
          project={project}
          script={{ session: renderedScriptSession }}
          workspace={testWorkspace}
        />,
      ),
    )
    return session
  }

  test('入口页无 object 时使用非首项直接启动入口', async () => {
    window.history.replaceState({}, '', '/?module=project&page=entrypoint')
    const shell = shellState()
    shell.manifest = {
      ...shell.manifest,
      defaultEntryId: 'direct',
      entryPoints: [
        shell.manifest.entryPoints[0],
        {
          id: 'direct',
          label: '直接入口',
          scene: 's047',
          startWorld: { party: [], money: 7, learnedSkills: {}, inventory: [] },
        },
      ],
    }
    await renderApp(shell)

    expect(host.querySelector('.project-center h1')?.textContent).toBe('直接入口')
  })

  test('入口页显式 object 优先于直接启动入口', async () => {
    window.history.replaceState({}, '', '/?module=project&page=entrypoint&object=main')
    const shell = shellState()
    shell.manifest = {
      ...shell.manifest,
      defaultEntryId: 'direct',
      entryPoints: [
        shell.manifest.entryPoints[0],
        {
          id: 'direct',
          label: '直接入口',
          scene: 's047',
          startWorld: { party: [], money: 7, learnedSkills: {}, inventory: [] },
        },
      ],
    }
    await renderApp(shell)

    expect(host.querySelector('.project-center h1')?.textContent).toBe('主要入口')
  })

  test('当前物品的私有引用可重复产生新定位令牌并显示成功位置', async () => {
    await renderApp()
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenItemReference

    await act(async () => openReference(itemReference('item', itemPrivateReference)))
    const first = probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe
    expect(first.focusItemPrivateScript).toMatchObject({
      itemId: '289',
      ability: 'use',
      scriptId: 'use',
      commandPath: '1',
    })
    const firstRevision = first.focusItemPrivateScript!.revision
    expect(window.location.search).toContain('module=item')
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      '已定位到：物品“石钥匙”（289） / 使用脚本 / 第 2 条指令',
    )

    await act(async () => openReference(itemReference('item', itemPrivateReference)))
    const second = probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe
    expect(second.focusItemPrivateScript?.revision).toBeGreaterThan(firstRevision)
  })

  test('场景引用会同时切换场景、实体、脚本抽屉和精确指令', async () => {
    await renderApp()
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenItemReference

    await act(async () => openReference(itemReference('scene', sceneReference)))

    expect(window.location.search).toContain('module=scene')
    expect(window.location.search).toContain('page=workspace')
    expect(window.location.search).toContain('object=s047')
    const workspace = probes.sceneWorkspace.mock.calls.at(-1)?.[0] as SceneWorkspaceProbe
    expect(workspace.selectedEntityId).toBe('e760')
    expect(workspace.focusReference?.reference).toEqual(sceneReference)
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      '场景 s047 / 实体 e760 / 交互脚本“默认触发行为” / 步骤 1 / 脚本正文 / 第 2 条指令',
    )

    const toolbar = host.querySelector<HTMLElement>('.toolbar')!
    await act(async () => button('脚本', toolbar).click())
    const addEntity = host.querySelector<HTMLButtonElement>('[aria-label="添加实体"]')!
    await act(async () => addEntity.click())
    expect((probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).placingEntity).toBe(true)

    await act(async () => openReference(itemReference('scene', sceneReference)))
    expect(host.querySelector('[data-testid="scene-script-workspace"]')).not.toBeNull()
    await act(async () => button('脚本', toolbar).click())
    expect((probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).placingEntity).toBe(
      false,
    )
  })

  test('场景地图控件标明缺失引用并可换绑、启用复制与打开新地图', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const shell = shellState()
    shell.mapIndex.maps = [{ id: 'm048', name: '测试地图 48', path: 'content/maps/m048.json' }]
    const session = await renderApp(shell)
    const field = host.querySelector<HTMLElement>('.scene-map-field')!
    const trigger = field.querySelector<HTMLButtonElement>('[role="combobox"]')!
    const openMap = field.querySelector<HTMLButtonElement>('[aria-label="打开地图 m047"]')!
    const copyAndBind = button('复制并绑定', field)

    expect(trigger.classList).toContain('ds-select')
    expect(trigger.getAttribute('aria-invalid')).toBe('true')
    expect(trigger.textContent).toContain('m047 (缺失)')
    expect(openMap.classList).toContain('ds-icon-button--secondary')
    expect(copyAndBind.disabled).toBe(true)

    await act(async () => trigger.click())
    const listbox = document.getElementById(trigger.getAttribute('aria-controls')!)!
    const replacement = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.includes('测试地图 48'),
    )!
    await act(async () => replacement.click())

    expect(session.getState().scenes[0]?.mapId).toBe('m048')
    const reboundTrigger = field.querySelector<HTMLButtonElement>('[role="combobox"]')!
    expect(reboundTrigger.getAttribute('aria-invalid')).toBeNull()
    expect(button('复制并绑定', field).disabled).toBe(false)

    const reboundOpen = field.querySelector<HTMLButtonElement>('[aria-label="打开地图 m048"]')!
    await act(async () => reboundOpen.click())
    expect(window.location.search).toContain('module=map')
    expect(window.location.search).toContain('object=m048')
  })

  test('场景目录按落点和实体类型分组，并只从各组标题新增对象', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const shell = shellState()
    const scene = shell.scenes[0]!
    scene.entities.push(
      {
        id: 'e-actor',
        actor: 'li-xiaoyao',
        pos: { col: 2, row: 2, height: 0 },
        facing: 'down',
        pages: [],
      } as (typeof scene.entities)[number],
      {
        id: 'e-zone',
        zone: true,
        pos: { col: 3, row: 3, height: 0 },
        facing: 'down',
        pages: [],
      } as (typeof scene.entities)[number],
    )
    const session = await renderApp(shell)
    const tree = host.querySelector<HTMLElement>('.outliner .tree')!
    const headers = [...tree.querySelectorAll<HTMLElement>('.ds-catalog-group-header')]
    const headerByTitle = (title: string) =>
      headers.find(
        (header) => header.querySelector('.ds-catalog-group-header__title')?.textContent === title,
      )!

    expect(headerByTitle('落点').dataset.level).toBe('primary')
    expect(headerByTitle('实体').dataset.level).toBe('primary')
    expect(
      headerByTitle('实体').querySelector('.ds-catalog-group-header__count')?.textContent,
    ).toBe('3')
    for (const title of ['预制人物', '自定义实体', '触发区']) {
      expect(headerByTitle(title).dataset.level).toBe('secondary')
      expect(
        headerByTitle(title).querySelector('.ds-catalog-group-header__count')?.textContent,
      ).toBe('1')
    }

    const addEntry = headerByTitle('落点').querySelector<HTMLButtonElement>(
      '[aria-label="新建命名落点"]',
    )!
    const addEntity =
      headerByTitle('实体').querySelector<HTMLButtonElement>('[aria-label="添加实体"]')!
    expect(addEntry.classList).toContain('ds-icon-button--secondary')
    expect(addEntity.classList).toContain('ds-icon-button--secondary')
    expect(addEntry.className).toBe(addEntity.className)
    expect(addEntry.getAttribute('aria-pressed')).toBeNull()
    expect(addEntity.getAttribute('aria-pressed')).toBeNull()
    expect(host.querySelector('.toolbar [aria-label="添加实体"]')).toBeNull()

    await act(async () => addEntry.click())
    expect(Object.keys(session.getState().scenes[0]?.entries ?? {})).toHaveLength(1)

    await act(async () => addEntity.click())
    expect(addEntity.getAttribute('aria-pressed')).toBeNull()
    expect(host.querySelector('.insp-head .what')?.textContent).toBe('添加实体')
  })

  test('触发区目录、画布和属性面板共用 current page 的方式与范围', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const shell = shellState()
    shell.scenes[0]!.entities.push({
      id: 'e-zone',
      zone: true,
      pos: { col: 3, row: 3, height: 0 },
      pages: [
        {
          id: 'default',
          label: '默认模式',
          trigger: 'default',
          triggerActivation: { on: 'interact', range: 2 },
        },
        {
          id: 'alternate',
          label: '备用模式',
          trigger: 'alternate',
          triggerActivation: { on: 'touch', range: 3 },
        },
        {
          id: 'inactive',
          label: '未绑定行为',
          triggerActivation: { on: 'touch', range: 5 },
        },
      ],
      initialPage: 'default',
    } as never)
    const canonical = canonicalState()
    canonical.scenes[0]!.entities.push({
      id: 'e-zone',
      zone: true,
      pos: { col: 3, row: 3, height: 0 },
      pages: [
        {
          id: 'default',
          label: '默认模式',
          trigger: 'default',
          triggerActivation: { on: 'interact', range: 2 },
        },
        {
          id: 'alternate',
          label: '备用模式',
          trigger: 'alternate',
          triggerActivation: { on: 'touch', range: 3 },
        },
        {
          id: 'inactive',
          label: '未绑定行为',
          triggerActivation: { on: 'touch', range: 5 },
        },
      ],
      initialPage: 'default',
      behaviors: {
        trigger: {
          default: {
            label: '默认触发行为',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'initial',
              stages: [{ id: 'initial', body: [] }],
            },
          },
          alternate: {
            label: '备用触发行为',
            order: 1,
            flow: {
              kind: 'stages',
              initial: 'initial',
              stages: [{ id: 'initial', body: [] }],
            },
          },
        },
      },
    })
    await renderApp(shell, canonical)

    const tree = host.querySelector<HTMLElement>('.outliner .tree')!
    const zoneRow = button('e-zone', tree)
    expect(zoneRow.textContent).toContain('交互 · 2 格')
    await act(async () => zoneRow.click())
    expect(
      (probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).selectedTriggerActivation,
    ).toEqual({ on: 'interact', range: 2 })

    const pageSelect = host.querySelector<HTMLButtonElement>(
      '[role="combobox"][aria-label="选择实体页"]',
    )!
    await act(async () => pageSelect.click())
    const pageListbox = document.getElementById(pageSelect.getAttribute('aria-controls')!)!
    const alternatePage = [...pageListbox.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.includes('备用模式'),
    )!
    await act(async () => alternatePage.click())
    expect(button('e-zone', tree).textContent).toContain('触碰 · 3 格')
    expect(
      (probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).selectedTriggerActivation,
    ).toEqual({ on: 'touch', range: 3 })

    const range = host.querySelector<HTMLInputElement>('[aria-label="实体页触发范围（格）"]')!
    expect(range.value).toBe('3')
    const triggerGrid = range.closest('.ds-property-grid')
    expect(triggerGrid).not.toBeNull()
    expect(
      host
        .querySelector('[role="combobox"][aria-label="实体页触发方式"]')
        ?.closest('.ds-property-grid'),
    ).toBe(triggerGrid)
    expect(
      host.querySelector('[data-property-label="预制动作"]')?.closest('.ds-property-grid'),
    ).toBe(triggerGrid)
    expect(
      [...triggerGrid!.querySelectorAll<HTMLElement>('.ds-property-row')].map(
        (row) => row.dataset.propertyLabel,
      ),
    ).toEqual(['实体页', '触发方式', '触发半径', '预制动作'])
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      valueSetter.call(range, '4')
      range.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(button('e-zone', tree).textContent).toContain('触碰 · 4 格')
    expect(
      (probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).selectedTriggerActivation,
    ).toEqual({ on: 'touch', range: 4 })

    const triggerMode = host.querySelector<HTMLButtonElement>(
      '[role="combobox"][aria-label="实体页触发方式"]',
    )!
    await act(async () => triggerMode.click())
    const listbox = document.getElementById(triggerMode.getAttribute('aria-controls')!)!
    const interact = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find((option) =>
      option.textContent?.includes('交互（按键）'),
    )!
    await act(async () => interact.click())
    expect(button('e-zone', tree).textContent).toContain('交互 · 4 格')
    expect(
      (probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).selectedTriggerActivation,
    ).toEqual({ on: 'interact', range: 4 })

    const currentPageSelect = host.querySelector<HTMLButtonElement>(
      '[role="combobox"][aria-label="选择实体页"]',
    )!
    await act(async () => currentPageSelect.click())
    const currentPageListbox = document.getElementById(
      currentPageSelect.getAttribute('aria-controls')!,
    )!
    const inactivePage = [
      ...currentPageListbox.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((option) => option.textContent?.includes('未绑定行为'))!
    await act(async () => inactivePage.click())
    expect(button('e-zone', tree).textContent).toContain('未启用')
    expect(
      (probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).selectedTriggerActivation,
    ).toBeUndefined()
    expect(
      host.querySelector<HTMLButtonElement>('[role="combobox"][aria-label="实体页触发方式"]')!
        .disabled,
    ).toBe(true)
  })

  test('新建触发区把渲染投影与 canonical 页作为一次历史写入并可无损保存', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const session = await renderApp()
    const tree = host.querySelector<HTMLElement>('.outliner .tree')!
    await act(async () => tree.querySelector<HTMLButtonElement>('[aria-label="添加实体"]')!.click())
    const inspector = host.querySelector<HTMLElement>('.inspector')!
    await act(async () => button('触发区', inspector).click())
    await act(async () => button('交互', inspector).click())
    await act(async () =>
      (probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).onAddAt({ col: 8, row: 9 }),
    )

    const shellEntity = session
      .getState()
      .scenes[0]!.entities.find((entity) => entity.id === 'entity-1')!
    const canonicalEntity = renderedScriptSession
      .getState()
      .scenes[0]!.entities.find((entity) => entity.id === 'entity-1')!
    expect(shellEntity).toMatchObject({ zone: true, pos: { col: 8, row: 9, height: 0 } })
    expect(canonicalEntity).toMatchObject({
      zone: true,
      initialPage: 'default',
      pages: [
        {
          id: 'default',
          trigger: 'default',
          triggerActivation: { on: 'interact', range: 1 },
        },
      ],
    })
    const merged = mergeEditorProjectionWithCurrentAuthorState(
      renderedScriptSession.getState(),
      session.getState(),
    )
    expect(
      (merged.scenes[0] as unknown as ScriptEditorState['scenes'][number]).entities.find(
        (entity) => entity.id === 'entity-1',
      )?.pages?.[0]?.triggerActivation,
    ).toEqual({ on: 'interact', range: 1 })
    expect(button('entity-1', tree).textContent).toContain('交互 · 1 格')

    await act(async () =>
      host.querySelector<HTMLButtonElement>('[title="删除选中对象（Del）"]')!.click(),
    )
    expect(session.getState().scenes[0]!.entities.some((entity) => entity.id === 'entity-1')).toBe(
      false,
    )
    expect(
      renderedScriptSession
        .getState()
        .scenes[0]!.entities.some((entity) => entity.id === 'entity-1'),
    ).toBe(false)

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="撤销"]')!.click())
    expect(session.getState().scenes[0]!.entities.some((entity) => entity.id === 'entity-1')).toBe(
      true,
    )
    expect(
      renderedScriptSession
        .getState()
        .scenes[0]!.entities.some((entity) => entity.id === 'entity-1'),
    ).toBe(true)
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="重做"]')!.click())
    expect(session.getState().scenes[0]!.entities.some((entity) => entity.id === 'entity-1')).toBe(
      false,
    )
    expect(
      renderedScriptSession
        .getState()
        .scenes[0]!.entities.some((entity) => entity.id === 'entity-1'),
    ).toBe(false)

    await act(async () => tree.querySelector<HTMLButtonElement>('[aria-label="添加实体"]')!.click())
    await act(async () => button('触发区', host.querySelector('.inspector')!).click())
    await act(async () => button('交互', host.querySelector('.inspector')!).click())
    await act(async () =>
      (probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).onAddAt({ col: 10, row: 11 }),
    )
    expect(session.getState().scenes[0]!.entities.at(-1)?.id).toBe('entity-1')
    expect(renderedScriptSession.getState().scenes[0]!.entities.at(-1)?.id).toBe('entity-1')
  })

  test('场景直接操作移除伪工具，并统一放置、清选择、Esc 与脚本面板优先级', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const shell = shellState()
    shell.scenes.push({ ...shellScene(), id: 's048', mapId: 'm048', entities: [] })
    const session = await renderApp(shell)
    const tree = host.querySelector<HTMLElement>('.outliner .tree')!
    const toolbar = host.querySelector<HTMLElement>('.toolbar')!
    const entity = button('e760', tree)
    const addEntity = tree.querySelector<HTMLButtonElement>('[aria-label="添加实体"]')!
    const canvas = () => probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe

    expect(toolbar.textContent).not.toContain('选择/移动')
    expect(toolbar.textContent).not.toContain('正在放置实体')
    expect(canvas().placingEntity).toBe(false)

    await act(async () => entity.click())
    expect(canvas().selectedEntityId).toBe('e760')

    await act(async () => addEntity.click())
    expect(canvas().placingEntity).toBe(true)
    expect(toolbar.querySelector('[role="status"]')?.textContent).toContain('正在放置实体')
    expect(button('取消放置', toolbar)).toBeDefined()
    expect(
      toolbar.querySelector<HTMLButtonElement>('[title="删除选中对象（Del）"]')?.disabled,
    ).toBe(true)
    await act(async () =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }),
      ),
    )
    expect(session.getState().scenes[0]?.entities).toHaveLength(1)

    await act(async () => button('取消放置', toolbar).click())
    expect(canvas().placingEntity).toBe(false)
    expect(canvas().selectedEntityId).toBe('e760')

    await act(async () => addEntity.click())
    await act(async () => button('触发区', host.querySelector('.inspector')!).click())
    await act(async () => canvas().onAddAt({ col: 4, row: 5 }))
    expect(canvas().placingEntity).toBe(false)
    expect(session.getState().scenes[0]?.entities).toHaveLength(2)
    const placedEntityId = session.getState().scenes[0]?.entities.at(-1)?.id

    await act(async () => addEntity.click())
    await act(async () =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    )
    expect(canvas().placingEntity).toBe(false)
    expect(canvas().selectedEntityId).toBe(placedEntityId)

    await act(async () =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    )
    expect(canvas().selectedEntityId).toBeNull()

    await act(async () => entity.click())
    await act(async () => canvas().onClearSelection())
    expect(canvas().selectedEntityId).toBeNull()

    await act(async () => entity.click())
    const sceneMenuTrigger = [...host.querySelectorAll<HTMLButtonElement>('.ds-menu-trigger')].find(
      (trigger) => trigger.textContent === '场景',
    )!
    await act(async () => sceneMenuTrigger.click())
    const sceneMenuItem = host.querySelector<HTMLElement>('.ds-menu-popover [role="menuitem"]')!
    sceneMenuItem.focus()
    await act(async () =>
      sceneMenuItem.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    )
    expect(host.querySelector('.ds-menu-popover')).toBeNull()
    expect(canvas().selectedEntityId).toBe('e760')

    const consumedEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    consumedEscape.preventDefault()
    await act(async () => window.dispatchEvent(consumedEscape))
    expect(canvas().selectedEntityId).toBe('e760')

    const input = document.createElement('input')
    host.append(input)
    await act(async () =>
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    )
    expect(canvas().selectedEntityId).toBe('e760')
    input.remove()

    await act(async () => addEntity.click())
    expect(canvas().placingEntity).toBe(true)
    await act(async () => button('脚本', toolbar).click())
    expect(host.querySelector('[data-testid="scene-script-workspace"]')).not.toBeNull()
    expect(toolbar.textContent).not.toContain('正在放置实体')
    await act(async () => button('脚本', toolbar).click())
    expect(canvas().placingEntity).toBe(false)

    await act(async () => addEntity.click())
    const sceneTrigger = host.querySelector<HTMLButtonElement>('[aria-label="切换编辑场景"]')!
    await act(async () => sceneTrigger.click())
    const sceneListbox = document.getElementById(sceneTrigger.getAttribute('aria-controls')!)!
    const sceneOption = [
      ...sceneListbox.querySelectorAll<HTMLButtonElement>('[role="option"]'),
    ].find((option) => option.textContent?.includes('s048'))!
    await act(async () => sceneOption.click())
    expect(canvas().placingEntity).toBe(false)
    expect(canvas().selectedEntityId).toBeNull()
  })

  test('命名落点引用使用 canonical 面板与真实按钮语义', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const shell = shellState()
    const scene = shell.scenes[0]!
    scene.entries = {
      'door-west': {
        label: '西门',
        pos: { col: 4, row: 5, height: 0 },
        facing: 'left',
      },
    }
    scene.onEnter = [
      {
        body: [{ kind: 'loadScene', scene: 's047', entryId: 'door-west' }],
      },
    ] as typeof scene.onEnter

    await renderApp(shell)
    await act(async () => button('西门', host.querySelector('.outliner')!).click())

    const panel = host.querySelector<HTMLElement>('.ds-reference-panel')!
    const row = panel.querySelector<HTMLElement>('.ds-reference-row')!
    expect(panel.textContent).toContain('1 处引用')
    expect(row.tagName).toBe('BUTTON')
    expect(row.getAttribute('aria-disabled')).toBeNull()
    expect(row.textContent).toContain('s047 进场脚本')
  })

  test('content17 场景脚本进入 canonical 工作区而不是 legacy stages 抽屉', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const canonical = canonicalState()
    canonical.scenes[0]!.entities[0]!.behaviors!.trigger!.default!.flow = {
      kind: 'stages',
      initial: 'initial',
      stages: [
        {
          id: 'initial',
          body: [
            {
              kind: 'dialog',
              cue: {
                identity: { kind: 'narration' },
                rows: [{ text: '新的身份化对话' }],
              },
            } as never,
          ],
        },
      ],
    }
    const shell = shellState()
    shell.manifest = {
      ...shell.manifest,
      contentVersion: 17,
      minimumSaveVersion: 8,
      content: { ...shell.manifest.content, sharedScripts: 'content/shared-scripts.json' },
    } as EditorState['manifest']
    shell.scenes = structuredClone(canonical.scenes) as unknown as EditorState['scenes']
    shell.items = structuredClone(canonical.items) as unknown as EditorState['items']
    shell.sharedScripts = structuredClone(
      canonical.sharedScripts,
    ) as unknown as EditorState['sharedScripts']
    const project = {
      source: {
        readText: vi.fn(async () => ''),
        readJson: vi.fn(async () => ({})),
        readBytes: vi.fn(async () => new ArrayBuffer(0)),
        urlFor: vi.fn(async () => 'about:blank'),
      },
      assetBase: {},
      manifest: shell.manifest,
      authorContent: { items: canonical.items, sharedScripts: canonical.sharedScripts },
      worldVariables: shell.worldVariables ?? {},
    } as unknown as LoadedCurrentProject

    await act(async () =>
      root.render(
        <App
          session={new EditSession(shell)}
          project={project}
          script={{ session: new ScriptEditSession(canonical) }}
          workspace={testWorkspace}
        />,
      ),
    )
    const openScript = [...host.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('脚本'),
    )
    expect(openScript).toBeDefined()
    await act(async () => openScript!.click())

    expect(probes.sceneWorkspace).toHaveBeenCalled()
    const workspace = probes.sceneWorkspace.mock.calls.at(-1)?.[0] as {
      state: ScriptEditorState
    }
    expect(workspace.state.scenes[0]!.entities[0]!.behaviors!.trigger!.default!.flow).toMatchObject(
      {
        kind: 'stages',
        stages: [{ body: [{ kind: 'dialog', cue: { identity: { kind: 'narration' } } }] }],
      },
    )
  })

  test('content17 保存合并保留 shell 空间改动与 canonical 身份对话', () => {
    const canonical = canonicalState()
    canonical.scenes[0]!.entities[0]!.behaviors!.trigger!.default!.flow = {
      kind: 'stages',
      initial: 'initial',
      stages: [
        {
          id: 'initial',
          body: [
            {
              kind: 'dialog',
              cue: {
                identity: { kind: 'unbound', speaker: '掌柜' },
                rows: [{ text: '客官请进' }],
              },
            } as never,
          ],
        },
      ],
    }
    const shell = shellState()
    shell.manifest = {
      ...shell.manifest,
      contentVersion: 17,
      minimumSaveVersion: 8,
    } as EditorState['manifest']
    shell.scenes = structuredClone(canonical.scenes) as unknown as EditorState['scenes']
    shell.scenes[0]!.entry.pos = { col: 9, row: 8, height: 0 }
    const shellBehavior = (shell.scenes[0] as unknown as ScriptEditorState['scenes'][number])
      .entities[0]!.behaviors!.trigger!.default!
    shellBehavior.flow = {
      kind: 'stages',
      initial: 'initial',
      stages: [{ id: 'initial', body: [] }],
    }

    const merged = mergeEditorProjectionWithCurrentAuthorState(canonical, shell)
    expect(merged.manifest.contentVersion).toBe(17)
    expect(merged.scenes[0]!.entry.pos).toEqual({ col: 9, row: 8, height: 0 })
    expect(
      (merged.scenes[0] as unknown as ScriptEditorState['scenes'][number]).entities[0]!.behaviors!
        .trigger!.default!.flow,
    ).toMatchObject({
      stages: [
        {
          body: [
            {
              kind: 'dialog',
              cue: { identity: { kind: 'unbound', speaker: '掌柜' } },
            },
          ],
        },
      ],
    })
  })
})
