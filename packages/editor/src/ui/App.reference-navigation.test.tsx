// @vitest-environment jsdom

import type { ItemData, SceneDef } from '@type-pal/content'
import type { LoadedCurrentProject } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type EditorState, EditSession } from '../core/edit-session.js'
import type { ProjectReferenceEdge, ProjectReferenceTarget } from '../core/project-reference.js'
import {
  type CanonicalScriptReference,
  DeleteEntityBehaviorCommand,
  type ScriptCommandOwner,
  type ScriptEditorState,
  ScriptEditSession,
  UpdateEntityBehaviorCommand,
  UpdateSharedScriptCommand,
} from '../core/script-editor.js'
import { mergeEditorProjectionWithCurrentAuthorState } from '../core/script-editor-projection.js'
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
      contentVersion: 19,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's047',
          startWorld: { party: [], money: 0, inventory: [] },
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
): ProjectReferenceEdge {
  return {
    id: 0,
    target: { kind: 'item', id: '289' },
    source: {
      key: 'item-test-source',
      owner: { kind: 'project-part', id: 'item-test-source' },
      label: '石钥匙',
      deletedWith: [],
    },
    relation: { kind: 'item-use', access: source === 'scene' ? 'reward' : 'lose' },
    where: reference.path,
    detail: source === 'scene' ? '获得 ×1' : '失去 ×1',
    locator: { kind: 'canonical-script', reference },
    deletePolicy: 'replace-suggest',
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
  onOpenProjectReference: (reference: ProjectReferenceEdge) => void
  focusItemPrivateScript?: {
    itemId: string
    ability: 'use' | 'throw'
    scriptId: string
    commandPath?: string
    revision: number
  }
}

function projectObjectReference(object: ProjectReferenceTarget): ProjectReferenceEdge {
  return {
    id: 0,
    target: { kind: 'battle-field', id: '24' },
    source: {
      key: 'test-source',
      owner: { kind: 'project-part', id: 'test-source' },
      label: '测试引用',
      deletedWith: [],
    },
    relation: { kind: 'battle-field-use', use: 'scene-default' },
    where: 'test.reference',
    locator: { kind: 'object', object },
    deletePolicy: 'replace-suggest',
  }
}

function projectLocatorReference(locator: ProjectReferenceEdge['locator']): ProjectReferenceEdge {
  return { ...projectObjectReference({ kind: 'actor', id: 'hero' }), locator }
}

type SceneWorkspaceProbe = {
  selectedEntityId?: string | null
  selectedPageId?: string
  focusReference?: { reference: CanonicalScriptReference; revision: number }
  focusOwner?: {
    owner: Extract<ScriptCommandOwner, { kind: 'entity-behavior' | 'scene-hook' }>
    revision: number
  }
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

async function waitForAssertion(assertion: () => void): Promise<void> {
  let lastError: unknown
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      assertion()
      return
    } catch (error) {
      lastError = error
    }
    await act(async () => new Promise<void>((resolve) => setTimeout(resolve, 0)))
  }
  throw lastError
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
      contentVersion: 19,
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
    // The production diagnostics owner is asynchronous. Wait for the inline worker instead of
    // asserting against its intentional fail-closed "checking" frame.
    await act(async () => new Promise<void>((resolve) => setTimeout(resolve, 0)))
    return session
  }

  test('指令手册回收不存在的右侧面板与工具栏入口', async () => {
    window.history.replaceState({}, '', '/?module=story&page=events')
    await renderApp()

    const body = host.querySelector<HTMLElement>('section.body')!
    expect(body.classList).toContain('inspector-collapsed')
    expect(body.style.getPropertyValue('--inspector-width')).toBe('0px')
    expect(host.querySelector('.app-inspector-resizer')).toBeNull()
    expect(host.querySelector('header button[aria-label="Inspector"]')).toBeNull()
  })

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
          startWorld: { party: [], money: 7, inventory: [] },
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
          startWorld: { party: [], money: 7, inventory: [] },
        },
      ],
    }
    await renderApp(shell)

    expect(host.querySelector('.project-center h1')?.textContent).toBe('主要入口')
  })

  test('当前物品的私有引用可重复产生新定位令牌并显示成功位置', async () => {
    await renderApp()
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenProjectReference

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

  test('炼蛊配方与灵葫奖励引用分别跳到两个精确机制 route', async () => {
    await renderApp()
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenProjectReference

    await act(async () =>
      openReference(
        projectLocatorReference({
          kind: 'object',
          object: { kind: 'item', id: '289' },
          section: 'crafting',
        }),
      ),
    )
    expect(window.location.search).toContain('module=item')
    expect(window.location.search).toContain('page=crafting')
    expect(window.location.search).toContain('object=289')

    await act(async () =>
      openReference(
        projectLocatorReference({
          kind: 'object',
          object: { kind: 'item', id: '289' },
          section: 'spirit-gourd',
        }),
      ),
    )
    expect(window.location.search).toContain('page=spirit-gourd')
    expect(window.location.search).toContain('object=289')
  })

  test('单一炼化机制 route 在 toolbar、视图菜单和分隔条中都不伪造对象列表', async () => {
    window.history.replaceState({}, '', '/?module=item&page=crafting&object=289')
    await renderApp()

    const toolbar = host.querySelector<HTMLElement>('[role="toolbar"][aria-label="常用操作"]')!
    expect(toolbar.querySelector('button[aria-label="对象列表"]')).toBeNull()
    expect(host.querySelector('.app-outliner-resizer')).toBeNull()

    const view = [
      ...host.querySelectorAll<HTMLButtonElement>('[role="menubar"] [role="menuitem"]'),
    ].find((candidate) => candidate.textContent?.trim() === '视图')!
    await act(async () => view.click())
    const menu = document.querySelector<HTMLElement>('[role="menu"][aria-label="视图"]')!
    expect(menu.textContent).not.toContain('对象列表')
  })

  test('场景引用会同时切换场景、实体、脚本抽屉和精确指令', async () => {
    await renderApp()
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenProjectReference

    await act(async () => openReference(itemReference('scene', sceneReference)))

    expect(window.location.search).toContain('module=scene')
    expect(window.location.search).toContain('page=workspace')
    expect(window.location.search).toContain('object=s047')
    const workspace = probes.sceneWorkspace.mock.calls.at(-1)?.[0] as SceneWorkspaceProbe
    expect(workspace.selectedEntityId).toBe('e760')
    expect(workspace.focusReference?.reference).toEqual(sceneReference)
    expect(host.querySelector('.valbar-status')?.textContent).toContain(
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

  test('统一 scene/entity locator 会退出放置模式、展开检查器并验证目标仍存在', async () => {
    await renderApp()
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenProjectReference

    await act(async () => openReference(projectObjectReference({ kind: 'scene', id: 's047' })))
    const addEntity = host.querySelector<HTMLButtonElement>('[aria-label="添加实体"]')!
    await act(async () => addEntity.click())
    expect((probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).placingEntity).toBe(true)

    const inspectorToggle = host.querySelector<HTMLButtonElement>(
      'header button[aria-label="Inspector"]',
    )!
    await act(async () => inspectorToggle.click())
    expect(host.querySelector('section.body')?.classList).toContain('inspector-collapsed')

    await act(async () =>
      openReference(projectObjectReference({ kind: 'entity', sceneId: 's047', entityId: 'e760' })),
    )
    expect(window.location.search).toContain('object=s047')
    expect((probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).placingEntity).toBe(
      false,
    )
    expect((probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).selectedEntityId).toBe(
      'e760',
    )
    expect(host.querySelector('section.body')?.classList).not.toContain('inspector-collapsed')
  })

  test('统一 scene/entity locator 对过期目标明确报错且不误导航', async () => {
    await renderApp()
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenProjectReference

    await act(async () =>
      openReference(projectObjectReference({ kind: 'scene', id: 'missing-scene' })),
    )
    expect(window.location.search).toContain('module=item')
    expect(host.textContent).toContain('引用位置已变化：场景 missing-scene 不再存在')

    await act(async () =>
      openReference(
        projectObjectReference({ kind: 'entity', sceneId: 's047', entityId: 'missing-entity' }),
      ),
    )
    expect(window.location.search).toContain('module=item')
    expect(host.textContent).toContain('实体 missing-entity 不再存在')
  })

  test('统一 scene-page locator 按稳定 PageId 定位并拒绝过期页面', async () => {
    const shell = shellState()
    const canonical = canonicalState()
    const entity = canonical.scenes[0]!.entities[0]!
    entity.initialPage = 'animated'
    entity.pages = [{ id: 'animated', label: '动画页' }]
    await renderApp(shell, canonical)
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenProjectReference

    await act(async () =>
      openReference(
        projectLocatorReference({
          kind: 'scene-page',
          sceneId: 's047',
          entityId: 'e760',
          pageId: 'animated',
        }),
      ),
    )
    expect(window.location.search).toContain('module=scene')
    await act(async () => button('脚本', host.querySelector('.toolbar')!).click())
    expect(probes.sceneWorkspace.mock.calls.at(-1)?.[0]).toMatchObject({
      selectedEntityId: 'e760',
      selectedPageId: 'animated',
    })

    await act(async () =>
      openReference(
        projectLocatorReference({
          kind: 'scene-page',
          sceneId: 's047',
          entityId: 'e760',
          pageId: 'missing',
        }),
      ),
    )
    expect(host.textContent).toContain('实体页面 s047/e760/missing 不再存在')
  })

  test('统一对象 locator 对过期战斗数据来源明确报错且不误回退到首项', async () => {
    await renderApp()
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenProjectReference
    const missing = [
      [{ kind: 'skill', id: 'missing-skill' }, '技能 missing-skill'],
      [{ kind: 'enemy', id: 'missing-enemy' }, '敌人 missing-enemy'],
      [{ kind: 'poison', id: '999' }, '毒 999'],
      [{ kind: 'actor', id: 'missing-actor' }, '角色 missing-actor'],
      [{ kind: 'item', id: 'missing-item' }, '物品 missing-item'],
      [{ kind: 'enemy-team', id: 'missing-team' }, '敌队 missing-team'],
      [{ kind: 'entry-point', id: 'missing-entry' }, '入口 missing-entry'],
      [{ kind: 'shared-script', id: 'missing-script' }, '共享脚本 missing-script'],
    ] as const
    for (const [object, label] of missing) {
      await act(async () => openReference(projectObjectReference(object)))
      expect(window.location.search).toContain('module=item')
      expect(host.textContent).toContain(`引用位置已变化：${label} 不再存在`)
    }
  })

  test('统一战斗数据对象 locator 可导航到精确 skill/enemy/poison route', async () => {
    const shell = shellState()
    shell.skills = [
      {
        id: 'skill-a',
        name: '技能甲',
        desc: '',
        cost: {},
        usableOutsideBattle: false,
        target: 'oneEnemy',
        effects: [],
        animation: { effectSprite: 0 },
      },
    ]
    shell.enemies = [
      {
        id: 'enemy-a',
        name: '敌人甲',
        battleSprite: 'battle.enemy',
        yPosOffset: 0,
        stats: {} as never,
        ai: { resistanceToSorcery: 0 },
        sounds: {},
      },
    ]
    shell.poisons = [{ id: 9, name: '九号毒', curability: 'common', color: 0 }]
    await renderApp(shell)
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenProjectReference

    for (const [object, page, id] of [
      [{ kind: 'skill', id: 'skill-a' }, 'skill', 'skill-a'],
      [{ kind: 'enemy', id: 'enemy-a' }, 'enemy', 'enemy-a'],
      [{ kind: 'poison', id: '9' }, 'poison', '9'],
    ] as const) {
      await act(async () => openReference(projectObjectReference(object)))
      const location = new URL(window.location.href)
      expect(location.searchParams.get('page')).toBe(page)
      expect(location.searchParams.get('object')).toBe(id)
    }
  })

  test('统一 script-owner locator 验证并打开稳定实体行为 owner', async () => {
    const canonical = canonicalState()
    canonical.scenes[0]!.entities[0]!.behaviors!.trigger!.alternate = {
      label: '备用触发行为',
      order: 1,
      flow: {
        kind: 'stages',
        initial: 'initial',
        stages: [{ id: 'initial', body: [] }],
      },
    }
    await renderApp(shellState(), canonical)
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenProjectReference
    const owner = {
      kind: 'entity-behavior',
      sceneId: 's047',
      entityId: 'e760',
      channel: 'trigger',
      behaviorId: 'alternate',
    } as const

    await act(async () =>
      openReference(
        projectLocatorReference({
          kind: 'script-owner',
          owner: { ...owner, behaviorId: 'missing' },
        }),
      ),
    )
    expect(window.location.search).toContain('module=item')
    expect(host.textContent).toContain('实体行为 s047/e760/trigger/missing 不再存在')

    await act(async () => openReference(projectLocatorReference({ kind: 'script-owner', owner })))
    expect(window.location.search).toContain('module=scene')
    expect(window.location.search).toContain('object=s047')
    expect(probes.sceneWorkspace.mock.calls.at(-1)?.[0]).toMatchObject({
      selectedEntityId: 'e760',
      focusOwner: { owner },
    })
  })

  test('统一 object locator 保留人物工作区分区', async () => {
    const shell = shellState()
    shell.actors = [{ id: 'hero', name: 'actor.hero', spriteId: 'sprite.hero' }]
    await renderApp(shell)
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenProjectReference

    await act(async () =>
      openReference({
        ...projectObjectReference({ kind: 'actor', id: 'hero' }),
        locator: {
          kind: 'object',
          object: { kind: 'actor', id: 'hero' },
          section: 'relationships',
        },
      }),
    )

    const location = new URL(window.location.href)
    expect(location.searchParams.get('module')).toBe('actor')
    expect(location.searchParams.get('object')).toBe('hero')
    expect(location.searchParams.get('action')).toBe('relationships')
  })

  test('统一 script-owner locator 会定位物品的具体私有脚本', async () => {
    await renderApp()
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenProjectReference

    await act(async () =>
      openReference(
        projectLocatorReference({
          kind: 'script-owner',
          owner: {
            kind: 'item-private-script',
            itemId: '289',
            ability: 'use',
            scriptId: 'use',
          },
        }),
      ),
    )

    expect(probes.dataMode.mock.calls.at(-1)?.[0]).toMatchObject({
      focusItemPrivateScript: {
        itemId: '289',
        ability: 'use',
        scriptId: 'use',
      },
    })
  })

  test('统一引用定位在根组件未重渲染时仍读取最新 canonical owner', async () => {
    await renderApp()
    await act(async () => {
      renderedScriptSession.dispatch(
        new UpdateEntityBehaviorCommand({ scene: 's047', entity: 'e760' }, 'trigger', 'default', {
          label: '第一次修改',
        }),
      )
    })
    const openReference = (probes.dataMode.mock.calls.at(-1)?.[0] as DataModeProbe)
      .onOpenProjectReference
    await act(async () => {
      renderedScriptSession.dispatch(
        new DeleteEntityBehaviorCommand({ scene: 's047', entity: 'e760' }, 'trigger', 'default'),
      )
    })

    await act(async () =>
      openReference(
        projectLocatorReference({
          kind: 'script-owner',
          owner: {
            kind: 'entity-behavior',
            sceneId: 's047',
            entityId: 'e760',
            channel: 'trigger',
            behaviorId: 'default',
          },
        }),
      ),
    )

    expect(window.location.search).toContain('module=item')
    expect(host.textContent).toContain('实体行为 s047/e760/trigger/default 不再存在')
  })

  test('场景地图控件标明缺失引用并可换绑、启用复制与打开新地图', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const shell = shellState()
    shell.mapIndex.maps = [{ id: 'm048', name: '测试地图 48', path: 'content/maps/m048.json' }]
    const session = await renderApp(shell)
    const field = host.querySelector<HTMLElement>('[data-property-label="地图"]')!
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
        pages: [],
      } as (typeof scene.entities)[number],
    )
    const session = await renderApp(shell)
    const tree = host.querySelector<HTMLElement>('.outliner .tree')!
    expect(tree.querySelector<HTMLElement>(':scope > .ds-catalog-row')?.dataset.leading).toBe(
      'none',
    )
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
    const inspector = host.querySelector<HTMLElement>('.inspector')!
    const tablist = inspector.querySelector<HTMLElement>(
      '[role="tablist"][aria-label="实体属性分区"]',
    )!
    expect(
      [...tablist.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent?.trim()),
    ).toEqual(['属性', '行为', '引用 0'])
    expect(inspector.querySelector('[data-property-label="朝向"]')).toBeNull()
    const hiddenCheckbox = [
      ...inspector.querySelectorAll<HTMLLabelElement>('.ds-check-label'),
    ].find((label) => label.textContent?.includes('初始隐藏（待剧情出场）'))
    expect(hiddenCheckbox?.closest('[data-property-label="初始显隐"]')).not.toBeNull()
    expect(
      (probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).selectedTriggerActivation,
    ).toEqual({ on: 'interact', range: 2 })

    const pageSelect = host.querySelector<HTMLButtonElement>(
      '[data-property-label="实体页"] [role="combobox"]',
    )!
    await act(async () => pageSelect.click())
    const pageListbox = document.getElementById(pageSelect.getAttribute('aria-controls')!)!
    const alternatePage = [...pageListbox.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.includes('备用模式'),
    )!
    await act(async () => alternatePage.click())
    await act(async () => button('行为', tablist).click())
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
    ).toEqual(['触发方式', '触发半径', '预制动作'])
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    const historyBeforeRangeDraft = renderedScriptSession.getHistoryVersion()
    await act(async () => {
      range.focus()
      valueSetter.call(range, '4')
      range.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(renderedScriptSession.getHistoryVersion()).toBe(historyBeforeRangeDraft)
    expect(button('e-zone', tree).textContent).toContain('触碰 · 3 格')
    await act(async () => range.blur())
    expect(renderedScriptSession.getHistoryVersion()).toBe(historyBeforeRangeDraft + 1)
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
      '[data-property-label="实体页"] [role="combobox"]',
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
      host.querySelector<HTMLButtonElement>('[aria-label="删除实体 entity-1"]')!.click(),
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

  test('实体引用页与行尾删除使用同一阻断集合', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const shell = shellState()
    shell.worlds = [
      {
        id: 'world-main',
        party: [],
        inventory: [],
        review: { target: { scene: 's047', entity: 'e760' } },
      },
    ] as never
    const canonical = canonicalState()
    canonical.sharedScripts['shared/user/hide-e760'] = {
      name: '隐藏测试实体',
      self: 'none',
      body: [
        {
          kind: 'hideEntity',
          target: { scene: 's047', entity: 'e760' },
          ticks: 1,
        },
      ],
    }
    const session = await renderApp(shell, canonical)

    const tree = host.querySelector<HTMLElement>('.outliner .tree')!
    await act(async () => button('e760', tree).click())
    const deleteButton = host.querySelector<HTMLButtonElement>('[aria-label="删除实体 e760"]')!
    expect(deleteButton.disabled).toBe(true)
    await waitForAssertion(() =>
      expect(
        host.querySelector<HTMLButtonElement>('[aria-label="删除实体 e760"]')?.title,
      ).toContain('2 处引用'),
    )
    await act(async () =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }),
      ),
    )
    expect(session.getState().scenes[0]!.entities).toHaveLength(1)
    expect(renderedScriptSession.getState().scenes[0]!.entities).toHaveLength(1)
    expect(host.querySelector('.insp-head .what')?.textContent).toContain('选中实体')

    const tablist = host.querySelector<HTMLElement>('[role="tablist"][aria-label="实体属性分区"]')!
    const referenceTab = button('引用 2', tablist)
    await act(async () => referenceTab.click())
    const panel = host.querySelector<HTMLElement>('.entity-reference-section')!
    expect(panel.textContent).toContain('2 处引用会阻断删除')
    expect(panel.textContent).toContain('共享脚本 shared/user/hide-e760')
    const worldRow = [...panel.querySelectorAll<HTMLElement>('.ds-reference-row')].find((row) =>
      row.textContent?.includes('运行态/存档'),
    )!
    expect(worldRow.tagName).toBe('ARTICLE')
    expect(worldRow.querySelector('button')).toBeNull()
    expect(worldRow.textContent).toContain('只读')
    expect(worldRow.textContent).toContain('世界配置当前没有可编辑的精确内容页')

    await act(async () => button('打开', panel).click())
    const location = new URL(window.location.href)
    expect(location.searchParams.get('module')).toBe('story')
    expect(location.searchParams.get('page')).toBe('scripts')
    expect(location.searchParams.get('object')).toBe('shared/user/hide-e760')
  })

  test('普通场景实体可用中文方向选择器修改朝向并查看等距方向图', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const session = await renderApp()
    const tree = host.querySelector<HTMLElement>('.outliner .tree')!
    await act(async () => button('e760', tree).click())

    const facingSelect = host.querySelector<HTMLButtonElement>(
      '[data-property-label="朝向"] [role="combobox"]',
    )!
    expect(facingSelect.textContent).toContain('下')
    expect(facingSelect.textContent).toContain('屏幕左下')

    const help = host.querySelector<HTMLButtonElement>('[aria-label="场景实体朝向说明"]')!
    await act(async () => help.focus())
    const visualHelp = document.querySelector<HTMLElement>(
      '.ds-help-tooltip.is-open .entity-facing-help',
    )!
    const directionDiagram = visualHelp.querySelector<SVGElement>('svg[role="img"]')!
    expect(directionDiagram.getAttribute('aria-label')).toBe(
      '等距地图方向：左在左上，上在右上，下在左下，右在右下',
    )
    expect([...directionDiagram.querySelectorAll('text')].map((node) => node.textContent)).toEqual([
      '左',
      '上',
      '下',
      '右',
    ])
    expect(directionDiagram.querySelectorAll('path')).toHaveLength(1)
    expect(directionDiagram.querySelector('line, circle, ellipse')).toBeNull()

    await act(async () => facingSelect.click())
    const listbox = document.getElementById(facingSelect.getAttribute('aria-controls')!)!
    const left = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.includes('左') && option.textContent.includes('屏幕左上'),
    )!
    await act(async () => left.click())

    expect(session.getState().scenes[0]?.entities[0]?.facing).toBe('left')
    const updatedSelect = host.querySelector<HTMLButtonElement>(
      '[data-property-label="朝向"] [role="combobox"]',
    )!
    expect(updatedSelect.textContent).toContain('左')
    expect(updatedSelect.textContent).toContain('屏幕左上')
  })

  test('脚本会话清理最后引用后，删除守卫使用同一份合并快照', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const target = { scene: 's047', entity: 'e760' }
    const shell = shellState()
    ;(shell as EditorState & { sharedScripts: ScriptEditorState['sharedScripts'] }).sharedScripts =
      {
        'shared/user/hide-e760': {
          name: '隐藏测试实体',
          self: 'none',
          body: [{ kind: 'hideEntity', target, ticks: 1 }],
        },
      }
    const canonical = canonicalState()
    canonical.sharedScripts['shared/user/hide-e760'] = {
      name: '隐藏测试实体',
      self: 'none',
      body: [{ kind: 'hideEntity', target, ticks: 1 }],
    }
    const session = await renderApp(shell, canonical)
    const tree = host.querySelector<HTMLElement>('.outliner .tree')!

    await act(async () => button('e760', tree).click())
    expect(host.querySelector<HTMLButtonElement>('[aria-label="删除实体 e760"]')?.disabled).toBe(
      true,
    )

    await act(async () =>
      renderedScriptSession.dispatch(
        new UpdateSharedScriptCommand('shared/user/hide-e760', { body: [] }),
      ),
    )
    const deleteButton = host.querySelector<HTMLButtonElement>('[aria-label="删除实体 e760"]')!
    expect(deleteButton.disabled).toBe(false)
    await act(async () => deleteButton.click())

    expect(session.getState().scenes[0]!.entities).toHaveLength(0)
    expect(renderedScriptSession.getState().scenes[0]!.entities).toHaveLength(0)
    expect(document.activeElement).toBe(tree.querySelector('.ds-catalog-row'))
  })

  test('实体引用可跳转到物品来源', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const target = { scene: 's047', entity: 'e760' }
    const shell = shellState()
    shell.items[0]!.use!.effects = [{ kind: 'placeEntityInFront', target, state: 1 }] as never
    await renderApp(shell)
    const tree = host.querySelector<HTMLElement>('.outliner .tree')!

    await act(async () => button('e760', tree).click())
    await act(async () =>
      button(
        '引用 1',
        host.querySelector<HTMLElement>('[role="tablist"][aria-label="实体属性分区"]')!,
      ).click(),
    )
    const panel = host.querySelector<HTMLElement>('.entity-reference-section')!
    expect(panel.textContent).toContain('物品 289')
    await act(async () => button('打开', panel).click())

    const location = new URL(window.location.href)
    expect(location.searchParams.get('module')).toBe('item')
    expect(location.searchParams.get('page')).toBe('item')
    expect(location.searchParams.get('object')).toBe('289')
  })

  test('实体引用可跳转到敌人来源', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const target = { scene: 's047', entity: 'e760' }
    const shell = shellState()
    shell.enemies = [
      {
        id: 'enemy-1',
        name: 'enemy.enemy-1.name',
        battleSprite: 'battle.enemy-1',
        yPosOffset: 0,
        stats: {
          health: 1,
          level: 1,
          exp: 0,
          cash: 0,
          attackStrength: 1,
          magicStrength: 1,
          defense: 0,
          dexterity: 1,
          fleeRate: 0,
          physicalResistance: 0,
          poisonResistance: 0,
          elemResistance: [0, 0, 0, 0, 0],
          dualMove: false,
          collectValue: 0,
        },
        ai: { resistanceToSorcery: 0, rules: [] },
        sounds: {},
        onDefeated: [
          {
            kind: 'branch',
            cond: { kind: 'entityInScene', target },
            then: [],
          },
        ],
      },
    ] as never
    await renderApp(shell)
    const tree = host.querySelector<HTMLElement>('.outliner .tree')!

    await act(async () => button('e760', tree).click())
    await act(async () =>
      button(
        '引用 1',
        host.querySelector<HTMLElement>('[role="tablist"][aria-label="实体属性分区"]')!,
      ).click(),
    )
    const panel = host.querySelector<HTMLElement>('.entity-reference-section')!
    expect(panel.textContent).toContain('敌人 enemy-1')
    await act(async () => button('打开', panel).click())

    const location = new URL(window.location.href)
    expect(location.searchParams.get('module')).toBe('battle')
    expect(location.searchParams.get('page')).toBe('enemy')
    expect(location.searchParams.get('object')).toBe('enemy-1')
  })

  test('实体与命名落点的行尾按钮和 Delete 键共享可撤销删除路径', async () => {
    window.history.replaceState({}, '', '/?module=scene&page=workspace&object=s047')
    const shell = shellState()
    shell.scenes[0]!.entries = {
      camp: {
        label: '营地',
        pos: { col: 4, row: 5, height: 0 },
        facing: 'left',
      },
    }
    const session = await renderApp(shell)
    const tree = host.querySelector<HTMLElement>('.outliner .tree')!

    await act(async () => button('e760', tree).click())
    await act(async () =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }),
      ),
    )
    expect(session.getState().scenes[0]!.entities).toHaveLength(0)
    expect(renderedScriptSession.getState().scenes[0]!.entities).toHaveLength(0)
    expect(host.querySelector('[role="status"]')?.textContent).toContain('已删除实体 e760；可撤销')
    expect(
      (probes.sceneCanvas.mock.calls.at(-1)?.[0] as SceneCanvasProbe).selectedEntityId,
    ).toBeNull()
    expect(document.activeElement).toBe(tree.querySelector('.ds-catalog-row'))

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="撤销"]')!.click())
    expect(session.getState().scenes[0]!.entities).toHaveLength(1)
    expect(renderedScriptSession.getState().scenes[0]!.entities).toHaveLength(1)

    await act(async () => button('营地', tree).click())
    const namedEntryDelete = host.querySelector<HTMLButtonElement>(
      '[aria-label="删除命名落点 营地"]',
    )!
    expect(namedEntryDelete.parentElement?.closest('button')).toBeNull()
    namedEntryDelete.focus()
    expect(document.activeElement).toBe(namedEntryDelete)
    await act(async () => namedEntryDelete.click())
    expect(Object.keys(session.getState().scenes[0]!.entries ?? {})).toHaveLength(0)
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      '已删除命名落点 camp；可撤销',
    )
    expect(document.activeElement).toBe(tree.querySelector('.ds-catalog-row'))
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="撤销"]')!.click())
    expect(session.getState().scenes[0]!.entries?.camp?.label).toBe('营地')

    await act(async () => button('营地', tree).click())
    await act(async () =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }),
      ),
    )
    expect(session.getState().scenes[0]!.entries?.camp).toBeUndefined()
    expect(host.querySelector('.insp-head .what')?.textContent).toContain('选中场景')
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="撤销"]')!.click())
    expect(session.getState().scenes[0]!.entries?.camp?.label).toBe('营地')
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="重做"]')!.click())
    expect(session.getState().scenes[0]!.entries?.camp).toBeUndefined()
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
    expect(toolbar.querySelector('[title="删除选中对象（Del）"]')).toBeNull()
    expect(canvas().placingEntity).toBe(false)

    await act(async () => entity.click())
    expect(canvas().selectedEntityId).toBe('e760')

    await act(async () => addEntity.click())
    expect(canvas().placingEntity).toBe(true)
    expect(toolbar.querySelector('[role="status"]')?.textContent).toContain('正在放置实体')
    expect(button('取消放置', toolbar)).toBeDefined()
    expect(host.querySelector<HTMLButtonElement>('[aria-label="删除实体 e760"]')?.disabled).toBe(
      true,
    )
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
    const sceneMenuItem = document.querySelector<HTMLElement>('.ds-menu-popover [role="menuitem"]')!
    sceneMenuItem.focus()
    await act(async () =>
      sceneMenuItem.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    )
    expect(document.querySelector('.ds-menu-popover')).toBeNull()
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
    const canonical = canonicalState()
    canonical.scenes[0]!.hooks = {
      onEnter: {
        initial: 'entry-reference',
        variants: {
          'entry-reference': {
            label: '进场落点引用',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'start',
              stages: [
                {
                  id: 'start',
                  body: [{ kind: 'loadScene', scene: 's047', entryId: 'door-west' }],
                },
              ],
            },
          },
        },
      },
    }

    const session = await renderApp(shell, canonical)
    await act(async () => button('西门', host.querySelector('.outliner')!).click())

    const deleteButton = host.querySelector<HTMLButtonElement>('[aria-label="删除命名落点 西门"]')!
    expect(deleteButton.disabled).toBe(true)
    expect(deleteButton.title).toContain('1 处脚本引用')
    const panel = host.querySelector<HTMLElement>('.ds-reference-panel')!
    const row = panel.querySelector<HTMLElement>('.ds-reference-row')!
    expect(panel.textContent).toContain('1 处引用')
    expect(row.tagName).toBe('BUTTON')
    expect(row.getAttribute('aria-disabled')).toBeNull()
    expect(row.textContent).toContain('进场脚本 entry-reference')

    await act(async () => deleteButton.click())
    await act(async () =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }),
      ),
    )
    expect(session.getState().scenes[0]!.entries?.['door-west']).toBeDefined()
    expect(host.querySelector('.insp-head .what')?.textContent).toContain('选中命名落点')
    expect(host.querySelector('[role="status"]')?.textContent).not.toContain('已删除')
  })

  test('content19 场景脚本进入 canonical 工作区而不是 legacy stages 抽屉', async () => {
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
      contentVersion: 19,
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

  test('content19 保存合并保留 shell 空间改动与 canonical 身份对话', () => {
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
      contentVersion: 19,
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
    expect(merged.manifest.contentVersion).toBe(19)
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
