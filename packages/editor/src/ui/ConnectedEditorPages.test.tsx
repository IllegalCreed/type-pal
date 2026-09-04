// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpdateActorCommand } from '../core/commands.js'
import { type EditorState, EditSession } from '../core/edit-session.js'
import type { EditorDerivedData } from '../core/editor-derived-contract.js'
import type {
  EditorDerivedStore,
  EditorDerivedStoreSnapshot,
} from '../core/editor-derived-store.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
  createProjectReferenceSource,
} from '../core/project-reference.js'
import {
  type ScriptEditorState,
  ScriptEditSession,
  UpdateSharedScriptMetadataCommand,
} from '../core/script-editor.js'
import { ConnectedActorMode, ConnectedDataMode } from './ConnectedEditorPages.js'

const probes = vi.hoisted(() => ({
  actor: vi.fn(),
  data: vi.fn(),
}))

vi.mock('./ActorMode.js', () => ({
  ActorMode: (props: unknown) => {
    probes.actor(props)
    return <div data-testid="actor-mode" />
  },
}))

vi.mock('./DataMode.js', () => ({
  DataMode: (props: unknown) => {
    probes.data(props)
    return <div data-testid="data-mode" />
  },
}))

type ReferenceProbe = {
  referenceIndex?: ReturnType<typeof createProjectReferenceIndex>
  referenceStatus?: string
  projectReferenceIndex?: ReturnType<typeof createProjectReferenceIndex>
  projectReferenceStatus?: string
}

function editorState(): EditorState {
  return {
    manifest: {
      id: 'test',
      name: 'Test',
      contentVersion: 19,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      entryPoints: [
        {
          id: 'main',
          label: '开始',
          scene: 'scene',
          startWorld: { party: ['hero'], money: 0, inventory: [] },
        },
      ],
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [],
    actors: [{ id: 'hero', name: 'actor.hero', spriteId: 'sprite.hero' }],
    skills: [],
    levelUp: {},
    items: [],
    locale: { 'actor.hero': '主角' },
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

function scriptState(): ScriptEditorState {
  return {
    scenes: [],
    items: [],
    sharedScripts: {
      sample: { name: '示例', self: 'none', body: [] },
    },
  }
}

function derivedData(referenceCount: number): EditorDerivedData {
  return {
    statusIssues: [],
    projectIssues: [],
    projectReferences: buildProjectReferenceSnapshot(
      Array.from({ length: referenceCount }, (_, index) => ({
        target: { kind: 'actor' as const, id: 'hero' },
        source: createProjectReferenceSource(
          { kind: 'project-part' as const, id: `source-${index}` },
          `来源 ${index}`,
        ),
        relation: { kind: 'actor-use' as const, use: 'entry-point-party' as const },
        where: `source[${index}]`,
        locator: { kind: 'unavailable' as const, reason: '测试只读来源' },
        deletePolicy: 'block' as const,
      })),
    ),
    assetDiagnostics: [],
  }
}

function controlledDerivedStore(initial: EditorDerivedStoreSnapshot): EditorDerivedStore & {
  publish: (snapshot: EditorDerivedStoreSnapshot) => void
} {
  let snapshot = initial
  const listeners = new Set<() => void>()
  return {
    start: () => () => {},
    retry: () => {},
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    publish: (next) => {
      snapshot = next
      for (const listener of listeners) listener()
    },
  }
}

describe('ConnectedEditorPages reference snapshots', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    let frame = 0
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = ++frame
      queueMicrotask(() => callback(0))
      return id
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    probes.actor.mockClear()
    probes.data.mockClear()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  const flush = async (): Promise<void> =>
    act(async () => new Promise<void>((resolve) => setTimeout(resolve, 0)))

  test('store-only publish refreshes both connectors and session revisions fail closed until caught up', async () => {
    const mainSession = new EditSession(editorState())
    const scriptSession = new ScriptEditSession(scriptState())
    const store = controlledDerivedStore({
      status: 'current',
      revision: { mainHistoryVersion: 0, scriptHistoryVersion: 0 },
      data: derivedData(1),
    })
    const currentIndex = () => createProjectReferenceIndex(derivedData(0).projectReferences)

    await act(async () =>
      root.render(
        <>
          <ConnectedActorMode
            derivedStore={store}
            scriptSession={scriptSession}
            session={mainSession}
            assetBase={{} as never}
            assetReader={{} as never}
            getCurrentReferenceIndex={currentIndex}
          />
          <ConnectedDataMode
            derivedStore={store}
            scriptSession={scriptSession}
            session={mainSession}
            tab="poison"
            tabBar={null}
            assetBase={{} as never}
            assetReader={{} as never}
            audioResolver={{} as never}
            getCurrentProjectReferenceIndex={currentIndex}
            onOpenProjectReference={() => {}}
            onJumpToEvent={() => {}}
          />
        </>,
      ),
    )
    await flush()

    const latestActor = () => probes.actor.mock.calls.at(-1)?.[0] as ReferenceProbe
    const latestData = () => probes.data.mock.calls.at(-1)?.[0] as ReferenceProbe
    const actorReferences = () =>
      latestActor().referenceIndex?.referencesTo({ kind: 'actor', id: 'hero' }).length
    const dataReferences = () =>
      latestData().projectReferenceIndex?.referencesTo({ kind: 'actor', id: 'hero' }).length
    expect([latestActor().referenceStatus, actorReferences()]).toEqual(['current', 1])
    expect([latestData().projectReferenceStatus, dataReferences()]).toEqual(['current', 1])

    await act(async () => {
      store.publish({
        status: 'current',
        revision: { mainHistoryVersion: 0, scriptHistoryVersion: 0 },
        data: derivedData(2),
      })
    })
    await flush()
    expect([actorReferences(), dataReferences()]).toEqual([2, 2])

    await act(async () => {
      mainSession.dispatch(new UpdateActorCommand('hero', { name: 'actor.hero.updated' }))
    })
    expect([latestActor().referenceStatus, latestData().projectReferenceStatus]).toEqual([
      'stale',
      'stale',
    ])

    await act(async () => {
      store.publish({
        status: 'current',
        revision: { mainHistoryVersion: 1, scriptHistoryVersion: 0 },
        data: derivedData(3),
      })
    })
    await flush()
    expect([latestActor().referenceStatus, actorReferences()]).toEqual(['current', 3])
    expect([latestData().projectReferenceStatus, dataReferences()]).toEqual(['current', 3])

    await act(async () => {
      scriptSession.dispatch(new UpdateSharedScriptMetadataCommand('sample', { name: '已修改' }))
    })
    expect([latestActor().referenceStatus, latestData().projectReferenceStatus]).toEqual([
      'stale',
      'stale',
    ])

    await act(async () => {
      store.publish({
        status: 'current',
        revision: { mainHistoryVersion: 1, scriptHistoryVersion: 1 },
        data: derivedData(4),
      })
    })
    await flush()
    expect([latestActor().referenceStatus, actorReferences()]).toEqual(['current', 4])
    expect([latestData().projectReferenceStatus, dataReferences()]).toEqual(['current', 4])
  })
})
