/**
 * C05 合法挂载宿主：SpriteActionEditor / SpriteActionEditorDialog 以真实 EditSession、
 * 真实引用索引、真实 reader 解码的 proof 与 bakeFrame 画布挂载；回调只记录，不替换业务核心。
 */
import type { SpriteActionDef, SpriteDef } from '@type-pal/content'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { SpriteLayoutEditProof } from '../../core/commands.js'
import type { EditorDerivedStatus } from '../../core/editor-derived-contract.js'
import { collectCurrentProjectReferenceIndex } from '../../core/project-reference-adapters.js'
import { DsInspectorHost } from '../../ui/design-system/index.js'
import { SpriteActionEditor } from '../../ui/SpriteActionEditor.js'
import { SpriteActionEditorDialog } from '../../ui/SpriteActionEditorDialog.js'
import type { SpriteFrameView } from '../../ui/SpriteFrameWorkbench.js'
import { C05_SPRITE, type C05Open } from './c05-action-fixtures.js'

export type Notice = { kind: 'info' | 'error'; message: string } | undefined
export type MutationResult = { ok: boolean; reason?: unknown }

// ───────────────────────── 独立动作编辑器 ─────────────────────────

export interface EditorOptions {
  selectedSourceFrame?: number
  selectedActionId?: string
  mode?: 'create' | 'edit'
  restrictActionId?: string
  /** null = 不传 proof（源帧未读取完成）。 */
  proof?: SpriteLayoutEditProof | null
  referenceStatus?: EditorDerivedStatus
  onCommitPoses?: (poses: Record<string, SpriteActionDef> | undefined) => boolean
  onRequestCreate?: () => void
  onBeforeContextChange?: () => boolean
  frames?: readonly SpriteFrameView[]
}

export interface MountedEditor {
  open: C05Open
  host: HTMLDivElement
  root: Root
  notices: Notice[]
  mutations: MutationResult[]
  openedReferences: string[]
  selections: Array<string | undefined>
  setOptions: (next: Partial<EditorOptions>) => Promise<void>
}

function EditorHarness(props: {
  open: C05Open
  options: EditorOptions
  recorder: Pick<MountedEditor, 'notices' | 'mutations' | 'openedReferences' | 'selections'>
}) {
  const { open, options, recorder } = props
  useSyncExternalStore(
    (callback) => open.session.subscribe(callback),
    () => open.session.getVersion(),
  )
  const current = open.session.getState()
  const definition = current.sprites.find((sprite) => sprite.id === C05_SPRITE)!
  const [selected, setSelected] = useState<string | undefined>(options.selectedActionId)
  const references = collectCurrentProjectReferenceIndex(current)
    .referencesTo({ kind: 'world-sprite', id: definition.id })
    .filter((edge) => edge.relation.kind === 'world-sprite-action-use')
  return (
    <DsInspectorHost>
      <SpriteActionEditor
        definition={definition}
        catalog={current.assetCatalog}
        proof={options.proof === null ? undefined : (options.proof ?? open.proof)}
        frames={options.frames ?? open.frames}
        selectedSourceFrame={options.selectedSourceFrame ?? 2}
        references={references}
        referenceStatus={options.referenceStatus ?? 'current'}
        getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
        session={open.session}
        selectedActionId={selected}
        mode={options.mode}
        restrictActionId={options.restrictActionId}
        onCommitPoses={options.onCommitPoses}
        onRequestCreate={options.onRequestCreate}
        onBeforeContextChange={options.onBeforeContextChange}
        onSelectedActionChange={(id) => {
          recorder.selections.push(id)
          setSelected(id)
        }}
        onOpenReferences={(id) => recorder.openedReferences.push(id)}
        onMutationResult={(result) => recorder.mutations.push(result)}
        onStatusNotice={(notice) => recorder.notices.push(notice)}
      />
    </DsInspectorHost>
  )
}

export async function mountActionEditor(
  open: C05Open,
  initial: EditorOptions = {},
): Promise<MountedEditor> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let options: EditorOptions = { ...initial }
  const mounted: MountedEditor = {
    open,
    host,
    root,
    notices: [],
    mutations: [],
    openedReferences: [],
    selections: [],
    setOptions: async (next) => {
      options = { ...options, ...next }
      await render()
    },
  }
  const render = async (): Promise<void> => {
    await act(async () => {
      root.render(<EditorHarness open={open} options={options} recorder={mounted} />)
      await Promise.resolve()
    })
  }
  await render()
  return mounted
}

export async function unmountActionEditor(mounted: MountedEditor): Promise<void> {
  await act(async () => mounted.root.unmount())
  mounted.host.remove()
}

// ───────────────────────── 动作弹窗 ─────────────────────────

export interface DialogOptions {
  initialMode?: 'create' | 'edit'
  selectedActionId?: string
  selectedSourceFrame?: number
  referenceStatus?: EditorDerivedStatus
  /** 模拟 liveProof 与打开时不一致（create 模式 scopeConflict）。 */
  liveProofSha256?: string
}

export interface MountedDialog {
  open: C05Open
  host: HTMLDivElement
  root: Root
  closes: number[]
  selectionChanges: Array<string | undefined>
  sourceFrameChanges: number[]
  createRequests: number[]
  openedReferences: string[]
  saves: number[]
  notices: Notice[]
  /** 外部（弹窗之外）把 live 定义替换为当前 session 状态：模拟库在 session 变化后重渲染。 */
  rerender: () => Promise<void>
  setOptions: (next: Partial<DialogOptions>) => Promise<void>
}

function DialogHarness(props: {
  open: C05Open
  options: DialogOptions
  opening: SpriteDef
  recorder: MountedDialog
}) {
  const { open, options, opening, recorder } = props
  useSyncExternalStore(
    (callback) => open.session.subscribe(callback),
    () => open.session.getVersion(),
  )
  const current = open.session.getState()
  const live = current.sprites.find((sprite) => sprite.id === opening.id)
  const [selectedFrame, setSelectedFrame] = useState(options.selectedSourceFrame ?? 2)
  const [selectedActionId, setSelectedActionId] = useState<string | undefined>(
    options.selectedActionId,
  )
  const references = collectCurrentProjectReferenceIndex(current)
    .referencesTo({ kind: 'world-sprite', id: opening.id })
    .filter((edge) => edge.relation.kind === 'world-sprite-action-use')
  const liveProof =
    options.liveProofSha256 !== undefined
      ? { ...open.proof, sha256: options.liveProofSha256 }
      : open.proof
  return (
    <SpriteActionEditorDialog
      definition={opening}
      liveDefinition={live}
      catalog={current.assetCatalog}
      proof={open.proof}
      liveProof={liveProof}
      frames={open.frames}
      selectedSourceFrame={selectedFrame}
      references={references}
      referenceStatus={options.referenceStatus ?? 'current'}
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      session={open.session}
      initialMode={options.initialMode ?? 'edit'}
      selectedActionId={selectedActionId}
      onSelectedActionChange={(id) => {
        recorder.selectionChanges.push(id)
        setSelectedActionId(id)
      }}
      onSelectedSourceFrameChange={(frame) => {
        recorder.sourceFrameChanges.push(frame)
        setSelectedFrame(frame)
      }}
      onRequestCreate={() => recorder.createRequests.push(Date.now())}
      onOpenReferences={(id) => recorder.openedReferences.push(id)}
      onRequestSave={() => recorder.saves.push(Date.now())}
      onClose={() => recorder.closes.push(Date.now())}
      onStatusNotice={(notice) => recorder.notices.push(notice)}
    />
  )
}

export async function mountActionDialog(
  open: C05Open,
  options: DialogOptions = {},
): Promise<MountedDialog> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const opening = structuredClone(
    open.session.getState().sprites.find((sprite) => sprite.id === C05_SPRITE)!,
  )
  let dialogOptions: DialogOptions = { ...options }
  const recorder: MountedDialog = {
    open,
    host,
    root,
    closes: [],
    selectionChanges: [],
    sourceFrameChanges: [],
    createRequests: [],
    openedReferences: [],
    saves: [],
    notices: [],
    rerender: async () => undefined,
    setOptions: async () => undefined,
  }
  const renderDialog = async (): Promise<void> => {
    await act(async () => {
      root.render(
        <DialogHarness open={open} options={dialogOptions} opening={opening} recorder={recorder} />,
      )
      await Promise.resolve()
    })
  }
  recorder.rerender = renderDialog
  recorder.setOptions = async (next) => {
    dialogOptions = { ...dialogOptions, ...next }
    await renderDialog()
  }
  await renderDialog()
  return recorder
}

export async function unmountActionDialog(mounted: MountedDialog): Promise<void> {
  await act(async () => mounted.root.unmount())
  mounted.host.remove()
}
