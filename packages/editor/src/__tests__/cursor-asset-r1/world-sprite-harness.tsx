/**
 * WorldSpriteLibrary 合法挂载宿主：真实 EditSession + EditorAssetReader + AssetBase。
 * 不 mock SpriteResourceViewer / SpriteUploadWizard；不使用 as never 资产桥。
 */
import type { AssetBase, FileSource } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import { collectCurrentProjectReferenceIndex } from '../../core/project-reference-adapters.js'
import { WorldSpriteLibrary } from '../../ui/WorldSpriteLibrary.js'
import type { CursorSpriteProject } from './sprite-fixtures.js'

export type Notice = { kind: 'info' | 'error'; message: string } | undefined

export interface MountedWorldSpriteLibrary {
  project: CursorSpriteProject
  session: EditSession
  reader: EditorAssetReader
  notices: Notice[]
  battleDomainCalls: number[]
  host: HTMLDivElement
  root: Root
  focusHistory: Array<{ view: 'definition' | 'asset'; objectId?: string }>
}

function Harness(props: {
  session: EditSession
  assetBase: AssetBase
  reader: EditorAssetReader
  initialView: 'definition' | 'asset'
  initialFocus?: string
  initialActionId?: string
  notices: Notice[]
  battleDomainCalls: number[]
  focusHistory: Array<{ view: 'definition' | 'asset'; objectId?: string }>
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const [view, setView] = useState<'definition' | 'asset'>(props.initialView)
  const [focus, setFocus] = useState<string | undefined>(props.initialFocus)
  const [actionId, setActionId] = useState<string | undefined>(props.initialActionId)
  return (
    <WorldSpriteLibrary
      definitions={current.sprites}
      catalog={current.assetCatalog}
      assetBase={props.assetBase}
      assetReader={props.reader}
      session={props.session}
      tabBar={null}
      view={view}
      focusObjectId={focus}
      focusActionId={actionId}
      onViewChange={(next, objectId) => {
        setView(next)
        setFocus(objectId)
        props.focusHistory.push({ view: next, objectId })
      }}
      onObjectFocus={setFocus}
      onActionFocus={(_spriteId, nextAction) => setActionId(nextAction)}
      onBattleDomain={() => props.battleDomainCalls.push(Date.now())}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      onStatusNotice={(notice) => props.notices.push(notice)}
    />
  )
}

export async function mountWorldSpriteLibrary(
  project: CursorSpriteProject,
  input: {
    view?: 'definition' | 'asset'
    focus?: string
    actionId?: string
    source?: FileSource
  } = {},
): Promise<MountedWorldSpriteLibrary> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const session = new EditSession(project.state)
  const reader = createEditorAssetReader(input.source ?? project.source, () => session.getState())
  const notices: Notice[] = []
  const battleDomainCalls: number[] = []
  const focusHistory: Array<{ view: 'definition' | 'asset'; objectId?: string }> = []
  await act(async () => {
    root.render(
      <Harness
        session={session}
        assetBase={project.assetBase}
        reader={reader}
        initialView={input.view ?? 'definition'}
        initialFocus={input.focus}
        initialActionId={input.actionId}
        notices={notices}
        battleDomainCalls={battleDomainCalls}
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
    battleDomainCalls,
    host,
    root,
    focusHistory,
  }
}

export async function unmountWorldSpriteLibrary(mounted: MountedWorldSpriteLibrary): Promise<void> {
  await act(async () => mounted.root.unmount())
  mounted.host.remove()
}
