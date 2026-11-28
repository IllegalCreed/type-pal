import type { AssetId } from '@type-pal/content'
import { type AssetBase, type FileSource, SpriteAssetCache } from '@type-pal/reforge'
import { act, type ReactNode, useCallback, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import type { SpriteFrameView } from '../ui/SpriteFrameWorkbench.js'
import { type SpriteResourceLoadProof, SpriteResourceViewer } from '../ui/SpriteResourceViewer.js'
import { unmountHost } from './react-host-cleanup.js'
import { PaletteReadObserver } from './sprite-palette-read-observer.js'
import type { WorldSpriteProject } from './world-sprite-project.js'

type Notice = { kind: 'info' | 'error'; message: string } | undefined

export interface MountedViewer {
  host: HTMLDivElement
  root: Root
  project: WorldSpriteProject
  session: EditSession
  reader: EditorAssetReader
  proofs: Array<SpriteResourceLoadProof | undefined>
  framesLog: Array<readonly SpriteFrameView[]>
  notices: Notice[]
  selectedLog: number[]
  definitionSelects: string[]
  actionSelects: Array<[string, string]>
  restoreResourceObservers(): void
  setAsset(asset: AssetId, label: string, waitForResource?: boolean): Promise<void>
  setFrame(frame: number): Promise<void>
}

interface ViewerController {
  setTarget?: (next: { asset: AssetId; label: string }) => void
  setFrame?: (frame: number) => void
}

const viewerResourceWaiters = new WeakMap<HTMLElement, (asset?: AssetId) => Promise<void>>()

/** Observe real IO; an explicit asset also waits for a released, retired selection. */
export async function waitForSpriteViewerResources(
  host: HTMLElement,
  asset?: AssetId,
): Promise<void> {
  const wait = viewerResourceWaiters.get(host)
  if (!wait) throw new Error('SpriteResourceViewer host is not mounted')
  await wait(asset)
}

function ViewerHarness(props: {
  session: EditSession
  assetBase: AssetBase
  reader: EditorAssetReader
  initial: { asset: AssetId; label: string }
  controlledFrame: boolean
  initialFrame: number
  controller: ViewerController
  onLoaded: (proof: SpriteResourceLoadProof | undefined) => void
  onFramesLoaded: (frames: readonly SpriteFrameView[]) => void
  onStatusNotice: (notice: Notice) => void
  onSelectedFrameChange: (frame: number) => void
  onDefinitionSelect: (id: string) => void
  onActionSelect: (definitionId: string, actionId: string) => void
  activeDefinitionId?: string
  activeActionId?: string
  headerActions?: ReactNode
  enableFrameDrag?: boolean
}) {
  const [target, setTarget] = useState(props.initial)
  const [frame, setFrame] = useState(props.initialFrame)
  props.controller.setTarget = setTarget
  props.controller.setFrame = setFrame
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const record = current.assetCatalog.assets[target.asset]
  const consumers = current.sprites.filter((entry) => entry.asset === target.asset)
  const handleSelectedFrame = useCallback(
    (next: number) => {
      props.onSelectedFrameChange(next)
      if (props.controlledFrame) setFrame(next)
    },
    [props.controlledFrame, props.onSelectedFrameChange],
  )
  if (!record) return <div data-testid="viewer-no-record">无 {target.asset}</div>
  return (
    <SpriteResourceViewer
      assetBase={props.assetBase}
      assetReader={props.reader}
      asset={target.asset}
      revision={record.sha256}
      label={target.label}
      consumers={consumers}
      activeDefinitionId={props.activeDefinitionId}
      activeActionId={props.activeActionId}
      session={props.session}
      headerActions={props.headerActions}
      onDefinitionSelect={props.onDefinitionSelect}
      onActionSelect={props.onActionSelect}
      onLoaded={props.onLoaded}
      onFramesLoaded={props.onFramesLoaded}
      onStatusNotice={props.onStatusNotice}
      selectedFrame={props.controlledFrame ? frame : undefined}
      onSelectedFrameChange={handleSelectedFrame}
      enableFrameDrag={props.enableFrameDrag}
    />
  )
}

export async function mountViewer(
  project: WorldSpriteProject,
  input: {
    asset: AssetId
    label: string
    source?: FileSource
    controlledFrame?: boolean
    initialFrame?: number
    session?: EditSession
    assetBase?: AssetBase
    activeDefinitionId?: string
    activeActionId?: string
    headerActions?: ReactNode
    enableFrameDrag?: boolean
    /** Pending-state tests release their IO gate before explicitly waiting. */
    waitForResource?: boolean
  },
): Promise<MountedViewer> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const session = input.session ?? new EditSession(project.state)
  const reader = createEditorAssetReader(input.source ?? project.source, () => session.getState())
  const proofs: MountedViewer['proofs'] = []
  const framesLog: MountedViewer['framesLog'] = []
  const notices: Notice[] = []
  const selectedLog: number[] = []
  const definitionSelects: string[] = []
  const actionSelects: Array<[string, string]> = []
  const controller: ViewerController = {}
  const originalBase = input.assetBase ?? project.assetBase
  const paletteReads = new PaletteReadObserver(originalBase)
  const assetBase: AssetBase = { ...originalBase, assetResolver: paletteReads }
  let currentAsset = input.asset
  const cacheLoad = vi.spyOn(SpriteAssetCache.prototype, 'load')
  const restoreResourceObservers = () => {
    viewerResourceWaiters.delete(host)
    cacheLoad.mockRestore()
  }
  viewerResourceWaiters.set(host, async (asset = currentAsset) => {
    await act(async () => {
      const sprites = cacheLoad.mock.results.flatMap((result, index) =>
        cacheLoad.mock.calls[index]?.[0] === reader &&
        cacheLoad.mock.calls[index]?.[1] === asset &&
        result.type === 'return'
          ? [result.value]
          : [],
      )
      // The real viewer catches rejections; callers must assert its error UI and callbacks.
      await Promise.allSettled([...sprites, ...paletteReads.reads])
    })
  })
  const onLoaded = (proof: SpriteResourceLoadProof | undefined): void => {
    proofs.push(proof)
  }
  const onFramesLoaded = (frames: readonly SpriteFrameView[]): void => {
    framesLog.push(frames)
  }
  const onStatusNotice = (notice: Notice): void => {
    notices.push(notice)
  }
  const onSelectedFrameChange = (frame: number): void => {
    selectedLog.push(frame)
  }
  const onDefinitionSelect = (id: string): void => {
    definitionSelects.push(id)
  }
  const onActionSelect = (definitionId: string, actionId: string): void => {
    actionSelects.push([definitionId, actionId])
  }
  try {
    await act(async () => {
      root.render(
        <ViewerHarness
          session={session}
          assetBase={assetBase}
          reader={reader}
          initial={{ asset: input.asset, label: input.label }}
          controlledFrame={input.controlledFrame ?? false}
          initialFrame={input.initialFrame ?? 0}
          controller={controller}
          onLoaded={onLoaded}
          onFramesLoaded={onFramesLoaded}
          onStatusNotice={onStatusNotice}
          onSelectedFrameChange={onSelectedFrameChange}
          onDefinitionSelect={onDefinitionSelect}
          onActionSelect={onActionSelect}
          activeDefinitionId={input.activeDefinitionId}
          activeActionId={input.activeActionId}
          headerActions={input.headerActions}
          enableFrameDrag={input.enableFrameDrag}
        />,
      )
    })
    if (input.waitForResource !== false) await waitForSpriteViewerResources(host)
  } catch (reason) {
    await unmountHost({ host, root, restoreResourceObservers })
    throw reason
  }
  return {
    host,
    root,
    project,
    session,
    reader,
    proofs,
    framesLog,
    notices,
    selectedLog,
    definitionSelects,
    actionSelects,
    restoreResourceObservers,
    async setAsset(asset, label, waitForResource = true) {
      currentAsset = asset
      await act(async () => {
        controller.setTarget?.({ asset, label })
      })
      if (waitForResource) await waitForSpriteViewerResources(host)
    },
    async setFrame(frame) {
      await act(async () => controller.setFrame?.(frame))
    },
  }
}
