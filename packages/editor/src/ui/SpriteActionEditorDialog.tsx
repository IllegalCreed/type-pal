import type { AssetCatalogV1, SpriteActionDef, SpriteDef } from '@type-pal/content'
import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { type SpriteLayoutEditProof, UpdateSpriteCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { ProjectReferenceEdge } from '../core/project-reference.js'
import type { CurrentProjectReferenceIndexProvider } from '../core/project-reference-adapters.js'
import { nextSpriteActionId, sortedSpriteActions } from '../core/sprite-actions.js'
import { DsButton, DsDialog } from './design-system/index.js'
import { SpriteActionEditor } from './SpriteActionEditor.js'
import { type SpriteFrameView, SpriteSourceFramePicker } from './SpriteFrameWorkbench.js'

interface CreateSnapshot {
  actionId: string
  baselineHistoryVersion: number
  baselinePoses: Record<string, SpriteActionDef>
  initialPoses: Record<string, SpriteActionDef>
  definitionId: string
  asset: string
  proofRevision: string
}

function normalizedPoses(definition: SpriteDef): Record<string, SpriteActionDef> {
  return Object.fromEntries(
    sortedSpriteActions(definition).map(({ id, action }, order) => [id, { ...action, order }]),
  )
}

function createSnapshot(
  definition: SpriteDef,
  proof: SpriteLayoutEditProof,
  selectedSourceFrame: number,
  frameCount: number,
  historyVersion: number,
): CreateSnapshot {
  const baselinePoses = structuredClone(definition.poses ?? {})
  const actionId = nextSpriteActionId(definition)
  const ordered = normalizedPoses(definition)
  const frame =
    selectedSourceFrame >= 0 && selectedSourceFrame < frameCount ? selectedSourceFrame : 0
  const initialPoses = {
    ...ordered,
    [actionId]: {
      label: `动作 ${Object.keys(ordered).length + 1}`,
      order: Object.keys(ordered).length,
      steps: [{ frame, durationMs: 250 }],
    },
  }
  return {
    actionId,
    baselineHistoryVersion: historyVersion,
    baselinePoses,
    initialPoses,
    definitionId: definition.id,
    asset: definition.asset,
    proofRevision: proof.sha256,
  }
}

export function SpriteActionEditorDialog(props: {
  definition: SpriteDef
  liveDefinition?: SpriteDef
  catalog: AssetCatalogV1
  proof: SpriteLayoutEditProof
  liveProof?: SpriteLayoutEditProof
  frames: readonly SpriteFrameView[]
  selectedSourceFrame: number
  references: readonly ProjectReferenceEdge[]
  referenceStatus: EditorDerivedStatus
  getCurrentReferenceIndex: CurrentProjectReferenceIndexProvider
  session: EditSession
  initialMode: 'create' | 'edit'
  selectedActionId?: string
  onSelectedActionChange: (actionId: string | undefined) => void
  onSelectedSourceFrameChange: (frame: number) => void
  onRequestCreate: () => void
  onOpenReferences: (actionId: string) => void
  onRequestSave?: () => void
  onClose: () => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const composingRef = useRef(false)
  const mutationRejectedRef = useRef(false)
  const openingScopeRef = useRef({
    definitionId: props.definition.id,
    asset: props.definition.asset,
    proofRevision: props.proof.sha256,
  })
  const [mode, setMode] = useState(props.initialMode)
  const [createdDefinition, setCreatedDefinition] = useState<SpriteDef | undefined>()
  const [selectedActionId, setSelectedActionId] = useState(
    props.initialMode === 'create'
      ? undefined
      : (props.selectedActionId ?? sortedSpriteActions(props.definition)[0]?.id),
  )
  const [snapshot] = useState(() =>
    createSnapshot(
      props.definition,
      props.proof,
      props.selectedSourceFrame,
      props.frames.length,
      props.session.getHistoryVersion(),
    ),
  )
  const [localPoses, setLocalPoses] = useState(snapshot.initialPoses)
  const [error, setError] = useState('')
  const [scopeConflict, setScopeConflict] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const dirtyCreate = JSON.stringify(localPoses) !== JSON.stringify(snapshot.initialPoses)
  const liveDefinition =
    props.liveDefinition?.id === snapshot.definitionId &&
    props.liveDefinition.asset === snapshot.asset
      ? props.liveDefinition
      : undefined
  const liveHasCreatedAction = !!liveDefinition?.poses?.[snapshot.actionId]
  const editorDefinition = useMemo<SpriteDef>(
    () =>
      mode === 'create'
        ? { ...props.definition, poses: localPoses }
        : liveHasCreatedAction
          ? liveDefinition
          : (createdDefinition ?? liveDefinition ?? props.definition),
    [createdDefinition, liveDefinition, liveHasCreatedAction, localPoses, mode, props.definition],
  )
  const editorActionId = mode === 'create' ? snapshot.actionId : selectedActionId

  useEffect(() => {
    const opening = openingScopeRef.current
    if (
      opening.definitionId === props.liveDefinition?.id &&
      opening.asset === props.liveDefinition.asset &&
      opening.proofRevision === props.liveProof?.sha256
    )
      return
    if (mode === 'create') {
      setScopeConflict(true)
      setError('精灵用途或源资源已变化；请放弃当前新动作后重新打开。')
      return
    }
    props.onClose()
  }, [mode, props.liveDefinition, props.liveProof, props.onClose])

  useEffect(() => {
    if (mode !== 'edit' || props.selectedActionId === undefined) return
    setSelectedActionId(props.selectedActionId)
  }, [mode, props.selectedActionId])

  useEffect(() => {
    if (!createdDefinition || !liveDefinition) return
    if (
      JSON.stringify(createdDefinition.poses ?? {}) === JSON.stringify(liveDefinition.poses ?? {})
    )
      setCreatedDefinition(undefined)
  }, [createdDefinition, liveDefinition])

  const reportError = (message: string): void => {
    setError(message)
    props.onStatusNotice?.({ kind: 'error', message })
  }

  const handleEditorNotice = (
    notice: { kind: 'info' | 'error'; message: string } | undefined,
  ): void => {
    if (notice?.kind === 'error') setError(notice.message)
    else if (!scopeConflict) setError('')
    props.onStatusNotice?.(notice)
  }

  const flushFocusedField = (): boolean => {
    if (composingRef.current) {
      reportError('正在输入文字，请先完成输入再继续。')
      return false
    }
    const active = document.activeElement
    if (
      active instanceof HTMLElement &&
      rootRef.current?.contains(active) &&
      active.matches('input, textarea, select, [contenteditable="true"]')
    ) {
      mutationRejectedRef.current = false
      flushSync(() => active.blur())
    }
    if (mutationRejectedRef.current) {
      reportError('当前修改未能提交，请先重新核对。')
      return false
    }
    const invalid = rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (invalid) {
      reportError('请先修正无效字段。')
      invalid.focus()
      return false
    }
    return true
  }

  const requestClose = (): void => {
    if (!flushFocusedField()) return
    if (mode === 'create' && dirtyCreate) {
      setDiscardOpen(true)
      return
    }
    props.onClose()
  }

  const selectAction = (actionId: string | undefined): void => {
    setSelectedActionId(actionId)
    if (mode === 'edit') props.onSelectedActionChange(actionId)
  }

  const commitLocalPoses = (poses: Record<string, SpriteActionDef> | undefined): boolean => {
    setLocalPoses(poses ?? {})
    if (!scopeConflict) {
      setError('')
      props.onStatusNotice?.(undefined)
    }
    return true
  }

  const commitEditPoses = (poses: Record<string, SpriteActionDef> | undefined): boolean => {
    const current = props.session
      .getState()
      .sprites.find((candidate) => candidate.id === snapshot.definitionId)
    if (!current || current.asset !== snapshot.asset) return false
    const changed = props.session.dispatch(
      new UpdateSpriteCommand(
        current.id,
        { poses: poses && Object.keys(poses).length ? poses : undefined },
        props.proof,
        props.getCurrentReferenceIndex,
      ),
    )
    if (changed)
      setCreatedDefinition({
        ...current,
        poses: poses && Object.keys(poses).length ? structuredClone(poses) : undefined,
      })
    return changed
  }

  const handleMutationResult = (result: { ok: boolean; reason?: unknown }): void => {
    mutationRejectedRef.current = !result.ok
    if (result.ok) {
      if (!scopeConflict) {
        setError('')
        props.onStatusNotice?.(undefined)
      }
      return
    }
    reportError(
      result.reason instanceof Error
        ? result.reason.message
        : typeof result.reason === 'string'
          ? result.reason
          : '当前动作修改未能提交。',
    )
  }

  const confirmCreate = (): void => {
    if (!flushFocusedField()) return
    if (scopeConflict) {
      reportError('精灵用途或源资源已变化，新动作尚未创建；请放弃草稿后重新打开。')
      return
    }
    const current = props.session
      .getState()
      .sprites.find((candidate) => candidate.id === snapshot.definitionId)
    const record = props.session.getState().assetCatalog.assets[snapshot.asset]
    if (
      !current ||
      current.asset !== snapshot.asset ||
      props.session.getHistoryVersion() !== snapshot.baselineHistoryVersion ||
      JSON.stringify(current.poses ?? {}) !== JSON.stringify(snapshot.baselinePoses) ||
      current.poses?.[snapshot.actionId] ||
      record?.kind !== 'sprite' ||
      props.proof.asset !== snapshot.asset ||
      record.sha256 !== snapshot.proofRevision
    ) {
      reportError('项目已变化，新动作尚未创建；请保留当前内容并重新核对。')
      rootRef.current?.querySelector<HTMLInputElement>('[name="sprite-action-name"]')?.focus()
      return
    }
    try {
      const changed = props.session.dispatch(
        new UpdateSpriteCommand(
          current.id,
          { poses: localPoses },
          props.proof,
          props.getCurrentReferenceIndex,
        ),
      )
      if (!changed) {
        reportError('精灵用途定义已变化，新动作尚未创建。')
        return
      }
      setMode('edit')
      setCreatedDefinition({ ...current, poses: structuredClone(localPoses) })
      setSelectedActionId(snapshot.actionId)
      props.onSelectedActionChange(snapshot.actionId)
      props.onStatusNotice?.({ kind: 'info', message: '预制动作已创建，可继续编辑。' })
      setError('')
    } catch (reason) {
      reportError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const openReferences = (actionId: string): void => {
    if (!flushFocusedField()) return
    props.onOpenReferences(actionId)
  }

  useEffect(() => {
    const onSave = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLocaleLowerCase() !== 's') return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (mode === 'create') {
        reportError('请先创建动作，再保存项目。')
        rootRef.current?.querySelector<HTMLInputElement>('[name="sprite-action-name"]')?.focus()
        return
      }
      if (flushFocusedField()) props.onRequestSave?.()
    }
    window.addEventListener('keydown', onSave, true)
    return () => window.removeEventListener('keydown', onSave, true)
  })

  return (
    <>
      <DsDialog
        open
        title={mode === 'create' ? '新建预制动作' : '编辑预制动作'}
        className="sprite-action-dialog"
        closeLabel={mode === 'create' ? '关闭新动作编辑器' : '完成动作编辑'}
        onClose={requestClose}
        footer={
          mode === 'create' ? (
            <>
              <DsButton variant="secondary" onClick={requestClose}>
                取消
              </DsButton>
              <DsButton variant="primary" onClick={confirmCreate}>
                创建动作
              </DsButton>
            </>
          ) : (
            <DsButton variant="primary" onClick={requestClose}>
              完成
            </DsButton>
          )
        }
      >
        <div
          ref={rootRef}
          className="sprite-action-dialog-content"
          onCompositionStart={() => {
            composingRef.current = true
          }}
          onCompositionEnd={() => {
            composingRef.current = false
          }}
        >
          {error ? (
            <p className="sprite-action-dialog-error" role="alert">
              {error}
            </p>
          ) : null}
          <section className="sprite-action-source" aria-label="动作源帧">
            <header>
              <strong>源帧选择</strong>
              <span>点击或使用方向键选择；也可拖入下方步骤边界。</span>
            </header>
            <SpriteSourceFramePicker
              asset={props.definition.asset}
              frames={props.frames}
              selectedFrame={props.selectedSourceFrame}
              onSelect={props.onSelectedSourceFrameChange}
              transferEnabled
              ariaLabel="动作源帧选择"
              presentation="rail"
            />
          </section>
          <SpriteActionEditor
            definition={editorDefinition}
            catalog={props.catalog}
            proof={props.proof}
            frames={props.frames}
            selectedSourceFrame={props.selectedSourceFrame}
            references={props.references}
            referenceStatus={props.referenceStatus}
            getCurrentReferenceIndex={props.getCurrentReferenceIndex}
            session={props.session}
            selectedActionId={editorActionId}
            mode={mode}
            restrictActionId={mode === 'create' ? snapshot.actionId : undefined}
            onCommitPoses={mode === 'create' ? commitLocalPoses : commitEditPoses}
            onRequestCreate={props.onRequestCreate}
            onSelectedActionChange={selectAction}
            onOpenReferences={openReferences}
            onBeforeContextChange={flushFocusedField}
            onMutationResult={handleMutationResult}
            onStatusNotice={handleEditorNotice}
          />
        </div>
      </DsDialog>
      <DsDialog
        open={discardOpen}
        role="alertdialog"
        title="放弃新动作？"
        description="尚未创建的动作内容将丢失；项目不会写入任何命令。"
        onClose={() => setDiscardOpen(false)}
        footer={
          <>
            <DsButton variant="secondary" onClick={() => setDiscardOpen(false)}>
              继续编辑
            </DsButton>
            <DsButton variant="danger" onClick={props.onClose}>
              放弃新动作
            </DsButton>
          </>
        }
      >
        <p>确认放弃当前新动作草稿。</p>
      </DsDialog>
    </>
  )
}
