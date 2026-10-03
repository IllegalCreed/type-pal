/**
 * C08 TilesetTab 合法挂载：blank 项目 + 真实 EditSession / EditorAssetReader。
 */
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { EditSession } from '../../core/edit-session.js'
import type { EditorAssetReader } from '../../core/editor-asset-reader.js'
import type { ProjectReferenceEdge } from '../../core/project-reference.js'
import { TilesetTab } from '../../ui/TilesetTab.js'
import { openC08Session } from './c08-fixtures.js'

export interface MountedTilesetTab {
  session: EditSession
  reader: EditorAssetReader
  host: HTMLDivElement
  root: Root
  focusLog: Array<string | undefined>
  openedReferences: ProjectReferenceEdge[]
  cleanup(): Promise<void>
}

function Harness(props: {
  session: EditSession
  reader: EditorAssetReader
  assetBase: import('@type-pal/reforge').AssetBase
  focusObjectId?: string
  focusLog: Array<string | undefined>
  openedReferences: ProjectReferenceEdge[]
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const state = props.session.getState()
  return (
    <TilesetTab
      tilesets={state.tilesets ?? []}
      assetCatalog={state.assetCatalog}
      assetReader={props.reader}
      assetBase={props.assetBase}
      session={props.session}
      mapIndex={state.mapIndex}
      focusObjectId={props.focusObjectId}
      onObjectFocus={(id) => props.focusLog.push(id)}
      onOpenReference={(reference) => props.openedReferences.push(reference)}
    />
  )
}

export async function mountTilesetTab(
  name: string,
  options: { focusObjectId?: string } = {},
): Promise<MountedTilesetTab> {
  const { legal, session, reader } = await openC08Session(name)
  const host = document.createElement('div')
  host.style.width = '960px'
  host.style.height = '720px'
  document.body.append(host)
  const root = createRoot(host)
  const focusLog: Array<string | undefined> = []
  const openedReferences: ProjectReferenceEdge[] = []
  await act(async () => {
    root.render(
      <Harness
        session={session}
        reader={reader}
        assetBase={legal.assetBase}
        focusObjectId={options.focusObjectId}
        focusLog={focusLog}
        openedReferences={openedReferences}
      />,
    )
    await Promise.resolve()
  })
  return {
    session,
    reader,
    host,
    root,
    focusLog,
    openedReferences,
    async cleanup() {
      await act(async () => root.unmount())
      host.remove()
    },
  }
}
