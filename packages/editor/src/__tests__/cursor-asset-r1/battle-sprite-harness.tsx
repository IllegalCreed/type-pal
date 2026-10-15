/**
 * BattleSpriteLibrary 合法挂载宿主：真实 EditSession + EditorAssetReader + AssetBase +
 * 真实 InlinePreview/Uploader。不 mock 任何产品组件；不用 as never 桥。
 * 宿主导航/引用状态用 `update()` 驱动，等价于 App 外壳给组件的受控 props。
 */
import { type AssetBase, BattleSpriteAssetCache, type FileSource } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { vi } from 'vitest'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../../core/editor-derived-contract.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectReferenceIndex,
} from '../../core/project-reference-adapters.js'
import { BattleSpriteLibrary } from '../../ui/BattleSpriteLibrary.js'
import type { CursorBattleProject } from './battle-sprite-fixtures.js'

export type Notice = { kind: 'info' | 'error'; message: string } | undefined
export type NavView = 'definition' | 'asset'

export interface HostNav {
  view: NavView
  focus: string | undefined
  referenceStatus: EditorDerivedStatus
  omitReferenceIndex: boolean
  liveReferences: CurrentProjectReferenceIndexProvider
}

export interface MountedBattleSpriteLibrary {
  project: CursorBattleProject
  session: EditSession
  reader: EditorAssetReader
  notices: Notice[]
  worldDomainCalls: number[]
  viewHistory: Array<{ view: NavView; objectId?: string }>
  focusHistory: Array<string | undefined>
  host: HTMLDivElement
  root: Root
  restoreResourceObservers(): void
  /** 受控宿主 props 更新（深链、引用状态）。 */
  update(patch: Partial<HostNav>): Promise<void>
}

interface Controller {
  set?: (patch: Partial<HostNav>) => void
}

const resourceWaiters = new WeakMap<HTMLElement, () => Promise<void>>()

/** Wait for the preview's actual cache/palette calls; never start a substitute decode. */
export async function waitForBattleSpriteResources(host: HTMLElement): Promise<void> {
  const wait = resourceWaiters.get(host)
  if (!wait) throw new Error('BattleSpriteLibrary host is not mounted')
  await wait()
}

function Harness(props: {
  session: EditSession
  assetBase: AssetBase
  reader: EditorAssetReader
  initial: HostNav
  controller: Controller
  notices: Notice[]
  worldDomainCalls: number[]
  viewHistory: Array<{ view: NavView; objectId?: string }>
  focusHistory: Array<string | undefined>
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const [nav, setNav] = useState<HostNav>(props.initial)
  props.controller.set = (patch) => setNav((current) => ({ ...current, ...patch }))
  const current = props.session.getState()
  return (
    <BattleSpriteLibrary
      definitions={current.battleSprites}
      catalog={current.assetCatalog}
      assetBase={props.assetBase}
      assetReader={props.reader}
      session={props.session}
      tabBar={null}
      view={nav.view}
      focusObjectId={nav.focus}
      onViewChange={(next, objectId) => {
        setNav((state) => ({ ...state, view: next, focus: objectId }))
        props.viewHistory.push({ view: next, objectId })
      }}
      onObjectFocus={(id) => {
        setNav((state) => ({ ...state, focus: id }))
        props.focusHistory.push(id)
      }}
      onWorldDomain={() => props.worldDomainCalls.push(Date.now())}
      referenceIndex={
        nav.omitReferenceIndex ? undefined : collectCurrentProjectReferenceIndex(current)
      }
      referenceStatus={nav.referenceStatus}
      getCurrentReferenceIndex={nav.liveReferences}
      onStatusNotice={(notice) => props.notices.push(notice)}
    />
  )
}

export async function mountBattleSpriteLibrary(
  project: CursorBattleProject,
  input: Partial<Pick<HostNav, 'view' | 'focus' | 'referenceStatus' | 'liveReferences'>> & {
    source?: FileSource
    /** Custom sources may intentionally hold IO; opt in after releasing their gate. */
    waitForResource?: boolean
  } = {},
): Promise<MountedBattleSpriteLibrary> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const session = new EditSession(project.state)
  const reader = createEditorAssetReader(input.source ?? project.source, () => session.getState())
  const notices: Notice[] = []
  const worldDomainCalls: number[] = []
  const viewHistory: Array<{ view: NavView; objectId?: string }> = []
  const focusHistory: Array<string | undefined> = []
  const controller: Controller = {}
  // Default spies call through unchanged. The component owns its cache instance, so observe
  // the returned promises instead of decoding a second copy that could finish first.
  const cacheLoad = vi.spyOn(BattleSpriteAssetCache.prototype, 'load')
  const paletteRead = vi.spyOn(project.assetBase.assetResolver, 'readRoleText')
  resourceWaiters.set(host, async () => {
    await act(async () => {
      const sprites = cacheLoad.mock.results.flatMap((result, index) =>
        cacheLoad.mock.calls[index]?.[0] === reader && result.type === 'return'
          ? [result.value]
          : [],
      )
      const palettes = paletteRead.mock.results.flatMap((result, index) =>
        paletteRead.mock.calls[index]?.[0] === 'visual.standardColorTable' &&
        result.type === 'return'
          ? [result.value]
          : [],
      )
      // Rejections are rendered by the real preview catch; callers must assert that UI.
      await Promise.allSettled([...sprites, ...palettes])
    })
  })
  try {
    await act(async () => {
      root.render(
        <Harness
          session={session}
          assetBase={project.assetBase}
          reader={reader}
          initial={{
            view: input.view ?? 'definition',
            focus: input.focus,
            referenceStatus: input.referenceStatus ?? 'current',
            omitReferenceIndex: false,
            liveReferences:
              input.liveReferences ?? ((state) => collectCurrentProjectReferenceIndex(state)),
          }}
          controller={controller}
          notices={notices}
          worldDomainCalls={worldDomainCalls}
          viewHistory={viewHistory}
          focusHistory={focusHistory}
        />,
      )
    })
    if (input.waitForResource ?? input.source === undefined)
      await waitForBattleSpriteResources(host)
  } catch (reason) {
    try {
      await act(async () => root.unmount())
    } finally {
      resourceWaiters.delete(host)
      cacheLoad.mockRestore()
      paletteRead.mockRestore()
      host.remove()
    }
    throw reason
  }
  return {
    project,
    session,
    reader,
    notices,
    worldDomainCalls,
    viewHistory,
    focusHistory,
    host,
    root,
    restoreResourceObservers() {
      resourceWaiters.delete(host)
      cacheLoad.mockRestore()
      paletteRead.mockRestore()
    },
    async update(patch) {
      await act(async () => {
        controller.set?.(patch)
      })
    },
  }
}

export async function unmountBattleSpriteLibrary(
  mounted: MountedBattleSpriteLibrary,
): Promise<void> {
  try {
    await act(async () => mounted.root.unmount())
  } finally {
    mounted.restoreResourceObservers()
    mounted.host.remove()
  }
}
