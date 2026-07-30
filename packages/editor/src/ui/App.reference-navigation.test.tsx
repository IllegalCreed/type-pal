// @vitest-environment jsdom

import type { ItemData, SceneDef } from '@type-pal/content'
import type { LoadedProject } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type EditorState, EditSession } from '../core/edit-session.js'
import type { ItemReference } from '../core/item-references.js'
import type { EditorStateV5 } from '../core/project-io-v5.js'
import {
  type CanonicalScriptReferenceV5,
  type ScriptEditorStateV5,
  ScriptV5EditSession,
} from '../core/script-v5-editor.js'
import { App } from './App.js'

const probes = vi.hoisted(() => ({
  dataMode: vi.fn(),
  sceneWorkspace: vi.fn(),
}))

vi.mock('./DataMode.js', () => ({
  DataMode: (props: unknown) => {
    probes.dataMode(props)
    return <div data-testid="data-mode" />
  },
}))

vi.mock('./CanonicalSceneScriptWorkspaceV5.js', () => ({
  CanonicalSceneScriptWorkspaceV5: (props: unknown) => {
    probes.sceneWorkspace(props)
    return <div data-testid="scene-script-workspace" />
  },
}))

vi.mock('./SceneCanvas.js', () => ({
  SceneCanvas: () => <div data-testid="scene-canvas" />,
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
          script: { chunk: '__script-v5-runtime', id: 'item:289:use' },
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
      contentVersion: 4,
      entryScene: 's047',
      content: {},
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
      assets: { catalog: 'assets/index.json', roles: {} },
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
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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

function canonicalState(): ScriptEditorStateV5 {
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
    migrationSidecars: [],
  }
}

function itemReference(
  source: 'scene' | 'item',
  reference: Extract<CanonicalScriptReferenceV5, { kind: 'command' }>,
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

const itemPrivateReference: Extract<CanonicalScriptReferenceV5, { kind: 'command' }> = {
  kind: 'command',
  path: 'items.289.use.effects[0].script.body[1].itemId',
  locator: {
    kind: 'command',
    owner: { kind: 'item-private-script', itemId: '289', ability: 'use', scriptId: 'use' },
    container: { kind: 'body' },
    commandPath: '1',
  },
}

const sceneReference: Extract<CanonicalScriptReferenceV5, { kind: 'command' }> = {
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
  focusReference?: { reference: CanonicalScriptReferenceV5; revision: number }
}

describe('App item reference navigation', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    window.history.replaceState({}, '', '/?module=item&page=item&object=289')
    window.localStorage.clear()
    probes.dataMode.mockClear()
    probes.sceneWorkspace.mockClear()
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
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const renderApp = async (): Promise<void> => {
    const shell = shellState()
    const canonical = canonicalState()
    const source = {
      readText: vi.fn(async () => ''),
      readJson: vi.fn(async () => ({})),
      readBytes: vi.fn(async () => new ArrayBuffer(0)),
      urlFor: vi.fn(async () => 'about:blank'),
    }
    const project = {
      source,
      assetBase: {},
    } as unknown as LoadedProject
    const baseState = {
      ...shell,
      manifest: {
        ...shell.manifest,
        contentVersion: 9,
        minimumSaveVersion: 8,
      },
      ...canonical,
      migrationRegistry: {},
    } as unknown as EditorStateV5
    await act(async () =>
      root.render(
        <App
          session={new EditSession(shell)}
          project={project}
          scriptV5={{ baseState, session: new ScriptV5EditSession(canonical) }}
        />,
      ),
    )
  }

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
  })
})
