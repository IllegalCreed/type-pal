/**
 * WorldSpriteLibrary 合法挂载宿主：真实 EditSession + EditorAssetReader + AssetBase。
 * 不 mock SpriteResourceViewer / SpriteUploadWizard；不使用 as never 资产桥。
 */
import { type AssetBase, type FileSource, loadStandardPalette } from '@type-pal/reforge'
import { act, type ComponentProps, useEffect, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { loadEditorSprite } from '../core/sprite-assets.js'
import { WorldSpriteLibrary } from '../ui/WorldSpriteLibrary.js'
import type { WorldSpriteProject } from './world-sprite-project.js'

export type Notice = { kind: 'info' | 'error'; message: string } | undefined

interface WorldSpriteLocation {
  view: 'definition' | 'asset'
  objectId?: string
  actionId?: string
}

type LibraryProps = ComponentProps<typeof WorldSpriteLibrary>
type LibraryBindings = Pick<
  LibraryProps,
  'onOpenReference' | 'onJumpAutomaticScriptInstance' | 'onRequestSave' | 'canonical'
> & {
  references?: Pick<LibraryProps, 'referenceStatus' | 'referenceIndex' | 'getCurrentReferenceIndex'>
}

export interface MountedWorldSpriteLibrary {
  project: WorldSpriteProject
  session: EditSession
  reader: EditorAssetReader
  notices: Notice[]
  battleDomainCalls: number[]
  host: HTMLDivElement
  root: Root
  focusHistory: Array<{ view: 'definition' | 'asset'; objectId?: string }>
  navigate: (location: WorldSpriteLocation) => Promise<void>
}

function Harness(props: {
  session: EditSession
  assetBase: AssetBase
  reader: EditorAssetReader
  location: WorldSpriteLocation
  bindings?: LibraryBindings
  notices: Notice[]
  battleDomainCalls: number[]
  focusHistory: Array<{ view: 'definition' | 'asset'; objectId?: string }>
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const [location, setLocation] = useState(props.location)
  useEffect(() => setLocation(props.location), [props.location])
  const references: NonNullable<LibraryBindings['references']> = props.bindings?.references ?? {
    referenceIndex: collectCurrentProjectReferenceIndex(current),
    referenceStatus: 'current',
    getCurrentReferenceIndex: collectCurrentProjectReferenceIndex,
  }
  return (
    <WorldSpriteLibrary
      definitions={current.sprites}
      catalog={current.assetCatalog}
      assetBase={props.assetBase}
      assetReader={props.reader}
      session={props.session}
      tabBar={null}
      view={location.view}
      focusObjectId={location.objectId}
      focusActionId={location.actionId}
      onViewChange={(view, objectId) => {
        // DataMode's view callback replaces the route and drops any previous action selection.
        setLocation({ view, objectId })
        props.focusHistory.push({ view, objectId })
      }}
      onObjectFocus={(objectId) =>
        setLocation((current) =>
          current.objectId === objectId ? current : { ...current, objectId },
        )
      }
      onActionFocus={(objectId, actionId) =>
        setLocation({ view: 'definition', objectId, actionId })
      }
      onBattleDomain={() => props.battleDomainCalls.push(Date.now())}
      referenceIndex={references.referenceIndex}
      referenceStatus={references.referenceStatus}
      getCurrentReferenceIndex={references.getCurrentReferenceIndex}
      onOpenReference={props.bindings?.onOpenReference}
      onJumpAutomaticScriptInstance={props.bindings?.onJumpAutomaticScriptInstance}
      onRequestSave={props.bindings?.onRequestSave}
      canonical={props.bindings?.canonical}
      onStatusNotice={(notice) => props.notices.push(notice)}
    />
  )
}

export async function mountWorldSpriteLibrary(
  project: WorldSpriteProject,
  input: {
    view?: 'definition' | 'asset'
    focus?: string
    actionId?: string
    source?: FileSource
    bindings?: LibraryBindings
    /** Pending-state tests retain the read gate and release it inside their own act. */
    waitForResource?: boolean
  } = {},
): Promise<MountedWorldSpriteLibrary> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const session = new EditSession(project.state)
  const reader = createEditorAssetReader(input.source ?? project.source, () => session.getState())
  const notices: Notice[] = []
  const battleDomainCalls: number[] = []
  const focusHistory: Array<{
    view: 'definition' | 'asset'
    objectId?: string
  }> = []
  const mounted = {
    project,
    session,
    reader,
    notices,
    battleDomainCalls,
    host,
    root,
    focusHistory,
    navigate: (location: WorldSpriteLocation) =>
      act(async () => {
        root.render(
          <Harness
            session={session}
            assetBase={project.assetBase}
            reader={reader}
            location={location}
            bindings={input.bindings}
            notices={notices}
            battleDomainCalls={battleDomainCalls}
            focusHistory={focusHistory}
          />,
        )
      }),
  } satisfies MountedWorldSpriteLibrary
  try {
    await mounted.navigate({
      view: input.view ?? 'definition',
      objectId: input.focus,
      actionId: input.actionId,
    })
    if (input.waitForResource !== false) {
      const asset =
        input.view === 'asset'
          ? input.focus
          : project.state.sprites.find((entry) => entry.id === input.focus)?.asset
      if (asset) await waitForWorldSpriteResource(mounted, asset)
    }
  } catch (error) {
    await unmountWorldSpriteLibrary(mounted)
    throw error
  }
  return mounted
}

/** Await real sprite decode and palette IO; act flushes the viewer's proof/frames callbacks. */
export async function waitForWorldSpriteResource(
  mounted: MountedWorldSpriteLibrary,
  asset: string,
): Promise<void> {
  await act(async () => {
    await Promise.all([
      loadEditorSprite(mounted.reader, asset),
      loadStandardPalette(mounted.project.assetBase),
    ])
  })
}

export async function unmountWorldSpriteLibrary(mounted: MountedWorldSpriteLibrary): Promise<void> {
  try {
    await act(async () => mounted.root.unmount())
  } finally {
    mounted.host.remove()
  }
}
