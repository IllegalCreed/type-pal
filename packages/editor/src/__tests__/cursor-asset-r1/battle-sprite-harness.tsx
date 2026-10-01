/**
 * BattleSpriteLibrary 合法挂载宿主：真实 EditSession + EditorAssetReader + AssetBase +
 * 真实 InlinePreview/Uploader。不 mock 任何产品组件；不用 as never 桥。
 * 宿主导航/引用状态用 `update()` 驱动，等价于 App 外壳给组件的受控 props。
 */
import type { AssetBase, FileSource } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
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
  /** 受控宿主 props 更新（深链、引用状态）。 */
  update(patch: Partial<HostNav>): Promise<void>
}

interface Controller {
  set?: (patch: Partial<HostNav>) => void
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
    await Promise.resolve()
  })
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
    async update(patch) {
      await act(async () => {
        controller.set?.(patch)
        await Promise.resolve()
      })
    },
  }
}

export async function unmountBattleSpriteLibrary(
  mounted: MountedBattleSpriteLibrary,
): Promise<void> {
  await act(async () => mounted.root.unmount())
  mounted.host.remove()
}
