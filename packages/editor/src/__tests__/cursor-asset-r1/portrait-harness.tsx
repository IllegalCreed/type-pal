/**
 * PortraitEditor 合法挂载：真实 EditSession + PNG 立绘字节，不 mock 产品组件。
 */
import type { ActorDef, AssetId, AssetRecordV1 } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { UpsertAssetCommand } from '../../core/asset-commands.js'
import { UpdateActorCommand } from '../../core/commands.js'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import { PortraitEditor } from '../../ui/PortraitEditor.js'
import type { LegalProject } from './kit.js'

export interface MountedPortraitEditor {
  legal: LegalProject
  session: EditSession
  reader: EditorAssetReader
  host: HTMLDivElement
  root: Root
  actorId: string
}

function Harness(props: { session: EditSession; reader: EditorAssetReader; actorId: string }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const state = props.session.getState()
  const actor = state.actors.find((entry) => entry.id === props.actorId)
  if (!actor) return <div data-testid="actor-missing">actor removed</div>
  return (
    <PortraitEditor
      actor={actor}
      session={props.session}
      catalog={state.assetCatalog}
      reader={props.reader}
    />
  )
}

export function portraitRecord(id: AssetId, label: string, sha256: string): AssetRecordV1 {
  return {
    kind: 'portrait',
    path: `assets/authored/portraits/${id}.png`,
    mediaType: 'image/png',
    bytes: 64,
    sha256,
    label,
    origin: { kind: 'authored' },
  }
}

export async function mountPortraitEditor(
  legal: LegalProject,
  input: {
    portraitAssets?: Array<{ id: AssetId; label: string; png: ArrayBuffer; sha256: string }>
    actorPatch?: Partial<Pick<ActorDef, 'portraits'>>
  } = {},
): Promise<MountedPortraitEditor> {
  const session = new EditSession(structuredClone(legal.state))
  for (const asset of input.portraitAssets ?? []) {
    session.dispatch(
      new UpsertAssetCommand(
        asset.id,
        portraitRecord(asset.id, asset.label, asset.sha256),
        asset.png,
      ),
    )
  }
  const actorId = session.getState().actors[0]!.id
  if (input.actorPatch) {
    session.dispatch(new UpdateActorCommand(actorId, input.actorPatch))
  }
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(<Harness session={session} reader={reader} actorId={actorId} />)
    await Promise.resolve()
  })
  return { legal, session, reader, host, root, actorId }
}

export async function unmountPortraitEditor(mounted: MountedPortraitEditor): Promise<void> {
  await act(async () => mounted.root.unmount())
  mounted.host.remove()
}

/** 经 EditorAssetReader 读真实 PNG 字节 → createImageBitmap → Canvas2D 采样（不依赖 jsdom img onload）。 */
export async function decodePortraitCenterRgb(
  reader: EditorAssetReader,
  asset: AssetId,
): Promise<[number, number, number]> {
  const bytes = await reader.readBytes(asset, 'portrait')
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('离屏 canvas 无 2d')
    context.drawImage(bitmap, 0, 0)
    const data = context.getImageData(0, 0, 1, 1).data
    return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0]
  } finally {
    bitmap.close()
  }
}
