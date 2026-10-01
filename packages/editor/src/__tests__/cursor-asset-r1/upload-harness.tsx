/**
 * C03 合法挂载宿主：真实 EditSession + EditorAssetReader + AssetBase 上的
 * SpriteUploadWizard / SpriteResourceViewer / BattleSpriteUploader。
 * 不 mock 任何产品组件；不使用 as never 资产桥。
 */
import type { AssetId } from '@type-pal/content'
import type { AssetBase, FileSource } from '@type-pal/reforge'
import { act, type ReactNode, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import { BattleSpriteUploader } from '../../ui/BattleSpriteUploader.js'
import type { SpriteFrameView } from '../../ui/SpriteFrameWorkbench.js'
import {
  type SpriteResourceLoadProof,
  SpriteResourceViewer,
} from '../../ui/SpriteResourceViewer.js'
import { SpriteUploadWizard } from '../../ui/SpriteUploadWizard.js'
import type { LegalProject } from './kit.js'
import type { CursorSpriteProject } from './sprite-fixtures.js'

export type Notice = { kind: 'info' | 'error'; message: string } | undefined

interface ProjectLike {
  state: LegalProject['state']
  assetBase: AssetBase
  source: FileSource
}

// ─────────────────────────── SpriteUploadWizard ───────────────────────────

export interface WizardScope {
  session: EditSession
  assetBase: AssetBase
}

export interface MountedWizard {
  host: HTMLDivElement
  root: Root
  scope: WizardScope
  /** onDone 回调实参按序记录（含 null）。 */
  done: Array<string | null>
  /** 受控宿主：换 scope（等价外壳换项目/会话）。 */
  setScope(next: WizardScope): Promise<void>
  /** 受控宿主：写入 sprites prop 的覆盖（模拟宿主传入过期 sprites 列表）。 */
  setSpritesOverride(next: WizardSpritesOverride): Promise<void>
}

export type WizardSpritesOverride = 'live' | 'empty'

interface WizardController {
  setScope?: (next: WizardScope) => void
  setOverride?: (next: WizardSpritesOverride) => void
}

function WizardHarness(props: {
  initial: WizardScope
  done: Array<string | null>
  controller: WizardController
}) {
  const [scope, setScope] = useState(props.initial)
  const [override, setOverride] = useState<WizardSpritesOverride>('live')
  props.controller.setScope = setScope
  props.controller.setOverride = setOverride
  useSyncExternalStore(
    (callback) => scope.session.subscribe(callback),
    () => scope.session.getVersion(),
  )
  return (
    <SpriteUploadWizard
      sprites={override === 'empty' ? [] : [...scope.session.getState().sprites]}
      assetBase={scope.assetBase}
      session={scope.session}
      onDone={(id) => props.done.push(id)}
    />
  )
}

export async function mountWizard(
  project: ProjectLike,
  input: { assetBase?: AssetBase; session?: EditSession } = {},
): Promise<MountedWizard> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const done: Array<string | null> = []
  const controller: WizardController = {}
  const scope: WizardScope = {
    session: input.session ?? new EditSession(project.state),
    assetBase: input.assetBase ?? project.assetBase,
  }
  await act(async () => {
    root.render(<WizardHarness initial={scope} done={done} controller={controller} />)
    await Promise.resolve()
  })
  const mounted: MountedWizard = {
    host,
    root,
    scope,
    done,
    async setScope(next) {
      mounted.scope = next
      await act(async () => {
        controller.setScope?.(next)
        // 新 scope 的色盘读取经内存目录多段 I/O；在 act 内让出宏任务直至其落地，避免越界更新告警。
        for (let turn = 0; turn < 8; turn++) await new Promise((resolve) => setTimeout(resolve, 0))
      })
    },
    async setSpritesOverride(next) {
      await act(async () => controller.setOverride?.(next))
    },
  }
  return mounted
}

export async function unmountHost(mounted: { host: HTMLElement; root: Root }): Promise<void> {
  await act(async () => mounted.root.unmount())
  mounted.host.remove()
}

// ─────────────────────────── SpriteResourceViewer ───────────────────────────

export interface MountedViewer {
  host: HTMLDivElement
  root: Root
  project: CursorSpriteProject
  session: EditSession
  reader: EditorAssetReader
  proofs: Array<SpriteResourceLoadProof | undefined>
  framesLog: Array<readonly SpriteFrameView[]>
  notices: Notice[]
  selectedLog: number[]
  definitionSelects: string[]
  actionSelects: Array<[string, string]>
  setAsset(asset: AssetId, label: string): Promise<void>
  setFrame(frame: number): Promise<void>
}

interface ViewerController {
  setTarget?: (next: { asset: AssetId; label: string }) => void
  setFrame?: (frame: number) => void
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
      onSelectedFrameChange={(next) => {
        props.onSelectedFrameChange(next)
        if (props.controlledFrame) setFrame(next)
      }}
      enableFrameDrag={props.enableFrameDrag}
    />
  )
}

export async function mountViewer(
  project: CursorSpriteProject,
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
  await act(async () => {
    root.render(
      <ViewerHarness
        session={session}
        assetBase={input.assetBase ?? project.assetBase}
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
    await Promise.resolve()
  })
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
    async setAsset(asset, label) {
      await act(async () => {
        controller.setTarget?.({ asset, label })
        await Promise.resolve()
      })
    },
    async setFrame(frame) {
      await act(async () => controller.setFrame?.(frame))
    },
  }
}

// ─────────────────────────── BattleSpriteUploader ───────────────────────────

export interface MountedUploader {
  host: HTMLDivElement
  root: Root
  applies: Array<{ blob: ArrayBuffer; frameCount: number }>
  cancels: number[]
  /** 受控宿主：让下一次 onApply 返回由测试持有的 promise。 */
  setApply(impl: (blob: ArrayBuffer, frameCount: number) => void | Promise<void>): void
  setAssetBase(next: AssetBase): Promise<void>
}

interface UploaderController {
  setBase?: (next: AssetBase) => void
}

function UploaderHarness(props: {
  initial: AssetBase
  controller: UploaderController
  onApply: (blob: ArrayBuffer, frameCount: number) => void | Promise<void>
  onCancel: () => void
}) {
  const [base, setBase] = useState(props.initial)
  props.controller.setBase = setBase
  return <BattleSpriteUploader assetBase={base} onApply={props.onApply} onCancel={props.onCancel} />
}

export async function mountUploader(
  assetBase: AssetBase,
  impl?: (blob: ArrayBuffer, frameCount: number) => void | Promise<void>,
): Promise<MountedUploader> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const applies: MountedUploader['applies'] = []
  const cancels: number[] = []
  const controller: UploaderController = {}
  let current = impl
  const onApply = (blob: ArrayBuffer, frameCount: number): void | Promise<void> => {
    applies.push({ blob, frameCount })
    return current?.(blob, frameCount)
  }
  await act(async () => {
    root.render(
      <UploaderHarness
        initial={assetBase}
        controller={controller}
        onApply={onApply}
        onCancel={() => cancels.push(Date.now())}
      />,
    )
    await Promise.resolve()
  })
  return {
    host,
    root,
    applies,
    cancels,
    setApply(next) {
      current = next
    },
    async setAssetBase(next) {
      await act(async () => controller.setBase?.(next))
    },
  }
}
