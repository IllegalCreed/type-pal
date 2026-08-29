import type {
  AssetCatalogV1,
  SpriteActionDef,
  SpriteActionReference,
  SpriteActionStep,
  SpriteDef,
} from '@type-pal/content'
import { Fragment, type DragEvent as ReactDragEvent, useEffect, useMemo, useRef } from 'react'
import { type SpriteLayoutEditProof, UpdateSpriteCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { sortedSpriteActions } from '../core/sprite-actions.js'
import {
  DsButton,
  DsCatalogRow,
  DsCheckbox,
  DsControlGroup,
  DsDraftNumberInput,
  DsDraftTextInput,
  DsField,
  DsFieldGroup,
  DsFieldMeasure,
  DsInspectorSection,
  DsOverflowText,
  DsPropertyGrid,
  DsPropertyRow,
  DsReorderCollection,
  DsReorderItem,
  DsReorderMoveButton,
  DsSelect,
  DsPressable,
  reorderDsItems,
  type DsReorderIntent,
  useDsReorderKeys,
} from './design-system/index.js'
import { SpriteFrameCanvas, type SpriteFrameView } from './SpriteFrameWorkbench.js'
import { SPRITE_FRAME_DRAG_MIME } from './SpriteResourceViewer.js'

interface RawFrameDragPayload {
  asset: string
  frame: number
}

function parseDragPayload<T>(event: ReactDragEvent, mime: string): T | undefined {
  const raw = event.dataTransfer.getData(mime)
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

function sortedActions(sprite: SpriteDef): Array<[string, SpriteActionDef]> {
  return sortedSpriteActions(sprite).map(({ id, action }) => [id, action])
}

function nextActionId(sprite: SpriteDef): string {
  const ids = new Set(Object.keys(sprite.poses ?? {}))
  if (!ids.has('action')) return 'action'
  for (let suffix = 2; ; suffix++) {
    const candidate = `action-${suffix}`
    if (!ids.has(candidate)) return candidate
  }
}

function firstSoundAsset(catalog: AssetCatalogV1): string | undefined {
  return Object.entries(catalog.assets).find(([, record]) => record.kind === 'sound')?.[0]
}

function StepDurationInput(props: {
  id: string
  draftKey: string
  syncToken: number
  value: number
  disabled?: boolean
  onCommit: (value: number) => void | boolean
}) {
  return (
    <DsDraftNumberInput
      id={props.id}
      draftKey={props.draftKey}
      syncToken={props.syncToken}
      disabled={props.disabled}
      min={1}
      step={10}
      integer
      value={props.value}
      onCommit={(value) => {
        if (value === undefined || value === props.value) return false
        return props.onCommit(value)
      }}
    />
  )
}

export function SpriteActionEditor(props: {
  definition: SpriteDef
  catalog: AssetCatalogV1
  proof: SpriteLayoutEditProof | undefined
  frames: readonly SpriteFrameView[]
  selectedSourceFrame: number
  references: readonly SpriteActionReference[]
  session: EditSession
  selectedActionId?: string
  onSelectedActionChange?: (actionId: string | undefined) => void
  onOpenReferences?: (actionId: string) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
  const actions = useMemo(() => sortedActions(props.definition), [props.definition])
  const selectedEntry =
    actions.find(([actionId]) => actionId === props.selectedActionId) ?? actions[0]
  const actionId = selectedEntry?.[0]
  const action = selectedEntry?.[1]
  const stepReorderKeys = useDsReorderKeys(action?.steps ?? [], (step) => JSON.stringify(step))
  const historyVersion = props.session.getHistoryVersion()
  const lastSeenHistoryVersionRef = useRef(historyVersion)
  const locallyOwnedHistoryVersionRef = useRef<number | undefined>(undefined)
  const actionNumber = actionId ? actions.findIndex(([id]) => id === actionId) : -1
  const actionReferences = actionId
    ? props.references.filter(
        (reference) => reference.sprite === props.definition.id && reference.action === actionId,
      )
    : []
  useEffect(() => {
    if (!actions.some(([candidate]) => candidate === props.selectedActionId))
      props.onSelectedActionChange?.(actions[0]?.[0])
  }, [actions, props.onSelectedActionChange, props.selectedActionId])
  useEffect(() => {
    if (lastSeenHistoryVersionRef.current === historyVersion) return
    const locallyOwned = locallyOwnedHistoryVersionRef.current === historyVersion
    lastSeenHistoryVersionRef.current = historyVersion
    locallyOwnedHistoryVersionRef.current = undefined
    if (!locallyOwned) stepReorderKeys.reset()
  }, [historyVersion, stepReorderKeys.reset])

  const reportError = (reason: unknown): void =>
    props.onStatusNotice?.({
      kind: 'error',
      message: reason instanceof Error ? reason.message : String(reason),
    })

  const commitPoses = (poses: Record<string, SpriteActionDef> | undefined): boolean => {
    if (!props.proof) {
      reportError('源帧尚未读取完成，不能编辑动作。')
      return false
    }
    try {
      if (
        !props.session.dispatch(
          new UpdateSpriteCommand(
            props.definition.id,
            { poses: poses && Object.keys(poses).length ? poses : undefined },
            props.proof,
          ),
        )
      ) {
        reportError('精灵用途定义已变化，请重新选择后再编辑。')
        return false
      }
      locallyOwnedHistoryVersionRef.current = props.session.getHistoryVersion()
      props.onStatusNotice?.(undefined)
      return true
    } catch (reason) {
      reportError(reason)
      return false
    }
  }

  const updateAction = (transform: (current: SpriteActionDef) => SpriteActionDef): boolean => {
    if (!actionId || !action) return false
    const nextAction = transform(action)
    if (JSON.stringify(nextAction) === JSON.stringify(action)) return false
    return commitPoses({
      ...props.definition.poses,
      [actionId]: nextAction,
    })
  }

  const reorderActions = (intent: DsReorderIntent): boolean => {
    const next = reorderDsItems(actions, intent)
    if (next === actions) return false
    return commitPoses(
      Object.fromEntries(next.map(([id, candidate], order) => [id, { ...candidate, order }])),
    )
  }

  const createAction = (): void => {
    const id = nextActionId(props.definition)
    const created = commitPoses({
      ...Object.fromEntries(
        actions.map(([actionKey, candidate], order) => [actionKey, { ...candidate, order }]),
      ),
      [id]: {
        label: `动作 ${actions.length + 1}`,
        order: actions.length,
        steps: [
          {
            frame:
              props.selectedSourceFrame >= 0 && props.selectedSourceFrame < props.frames.length
                ? props.selectedSourceFrame
                : 0,
            durationMs: 250,
          },
        ],
      },
    })
    if (created) props.onSelectedActionChange?.(id)
  }

  const deleteAction = (): void => {
    if (!actionId || !action || actionReferences.length) return
    if (!window.confirm(`删除预制动作“${action.label}”（${actionId}）？`)) return
    commitPoses(
      Object.fromEntries(
        actions
          .filter(([id]) => id !== actionId)
          .map(([id, candidate], order) => [id, { ...candidate, order }]),
      ),
    )
  }

  const insertStep = (step: SpriteActionStep, targetIndex: number): void => {
    updateAction((current) => {
      const loopStep = current.loopFrom === undefined ? undefined : current.steps[current.loopFrom]
      const steps = [...current.steps]
      steps.splice(Math.max(0, Math.min(targetIndex, steps.length)), 0, step)
      const next = { ...current, steps }
      if (loopStep) next.loopFrom = steps.indexOf(loopStep)
      return next
    })
  }

  const reorderSteps = (intent: DsReorderIntent): boolean => {
    const reorderedKeys = reorderDsItems(stepReorderKeys.keys, intent)
    const loopKey =
      action?.loopFrom === undefined ? undefined : stepReorderKeys.keys[action.loopFrom]
    const changed = updateAction((current) => {
      const steps = reorderDsItems(current.steps, intent)
      if (steps === current.steps) return current
      const next = { ...current, steps: [...steps] }
      if (loopKey) next.loopFrom = reorderedKeys.indexOf(loopKey)
      return next
    })
    if (changed) stepReorderKeys.move(intent)
    return changed
  }

  const removeStep = (index: number): void => {
    updateAction((current) => {
      if (current.steps.length <= 1) return current
      const steps = current.steps.filter((_, position) => position !== index)
      const next = { ...current, steps }
      if (current.loopFrom !== undefined) {
        if (index < current.loopFrom) next.loopFrom = current.loopFrom - 1
        else if (index === current.loopFrom) next.loopFrom = Math.min(index, steps.length - 1)
      }
      return next
    })
  }

  const acceptDrop = (event: ReactDragEvent, targetIndex: number): void => {
    event.preventDefault()
    const frame = parseDragPayload<RawFrameDragPayload>(event, SPRITE_FRAME_DRAG_MIME)
    if (frame) {
      if (
        frame.asset !== props.definition.asset ||
        !Number.isInteger(frame.frame) ||
        frame.frame < 0 ||
        frame.frame >= props.frames.length
      ) {
        reportError('只能把当前源帧容器中的有效帧拖入动作。')
        return
      }
      insertStep({ frame: frame.frame, durationMs: 250 }, targetIndex)
      return
    }
  }

  const sounds = Object.entries(props.catalog.assets).filter(
    ([, record]) => record.kind === 'sound',
  )

  return (
    <DsInspectorSection
      title="预制动作"
      description="动作保存在精灵库；场景只引用稳定 ActionId。"
      className="sprite-action-editor"
      actions={
        <DsButton size="compact" variant="secondary" disabled={!props.proof} onClick={createAction}>
          新增动作
        </DsButton>
      }
    >
      {actions.length ? (
        <DsReorderCollection
          adoptionId="asset/sprite-action-definitions"
          scopeKey={`sprite:${props.definition.id}:actions`}
          entries={actions.map(([id, candidate]) => ({ key: id, label: candidate.label }))}
          revision={props.session.getHistoryVersion()}
          disabled={!props.proof}
          onReorder={reorderActions}
        >
          <div className="ds-inspector-choice-list" role="group" aria-label="选择预制动作">
            {actions.map(([id, candidate]) => (
              <DsReorderItem itemKey={id} contentClassName="sprite-action-catalog-content" key={id}>
                <DsCatalogRow
                  selected={id === actionId}
                  title={candidate.label}
                  meta={id}
                  trailing={
                    <span>
                      {candidate.loopFrom === undefined ? '单次' : '循环'} ·{' '}
                      {candidate.steps.length} 步
                    </span>
                  }
                  onClick={() => props.onSelectedActionChange?.(id)}
                />
                <span className="sprite-action-catalog-actions">
                  <DsReorderMoveButton itemKey={id} direction="backward" />
                  <DsReorderMoveButton itemKey={id} direction="forward" />
                </span>
              </DsReorderItem>
            ))}
          </div>
        </DsReorderCollection>
      ) : (
        <p className="ds-inspector-inline-empty">
          尚无预制动作。新增后，可把中间“全部源帧”中的帧拖到时间线。
        </p>
      )}

      {action && actionId ? (
        <div className="sprite-action-detail">
          <DsPropertyGrid>
            <DsPropertyRow label="名称" labelFor="sprite-action-name">
              <DsDraftTextInput
                id="sprite-action-name"
                name="sprite-action-name"
                autoComplete="off"
                size="compact"
                draftKey={`sprite:${props.definition.id}:action:${actionId}:label`}
                syncToken={props.session.getHistoryVersion()}
                disabled={!props.proof}
                value={action.label}
                validate={(value) => (value.trim() ? undefined : '动作名称不能为空。')}
                onCommit={(value) => {
                  const label = value.trim()
                  if (!label || label === action.label) return false
                  return updateAction((current) => ({ ...current, label }))
                }}
              />
            </DsPropertyRow>
            <DsPropertyRow label="ActionId" help="稳定引用身份，显示顺序变化不会改变它。">
              <DsOverflowText as="code" className="ds-inspector-readonly" translate="no">
                {actionId}
              </DsOverflowText>
            </DsPropertyRow>
            <DsPropertyRow label="播放">
              <DsCheckbox
                label="循环播放"
                size="compact"
                checked={action.loopFrom !== undefined}
                onChange={(event) =>
                  updateAction((current) => {
                    const next = { ...current }
                    if (event.target.checked) next.loopFrom = 0
                    else delete next.loopFrom
                    return next
                  })
                }
              />
            </DsPropertyRow>
            {action.loopFrom !== undefined ? (
              <DsPropertyRow label="循环起点" labelFor="sprite-action-loop-from">
                <DsSelect
                  id="sprite-action-loop-from"
                  size="compact"
                  value={String(action.loopFrom)}
                  options={action.steps.map((_, index) => ({
                    value: String(index),
                    label: `第 ${index + 1} 步`,
                  }))}
                  onValueChange={(value) =>
                    updateAction((current) => ({
                      ...current,
                      loopFrom: Number(value),
                    }))
                  }
                />
              </DsPropertyRow>
            ) : null}
          </DsPropertyGrid>

          <div className="sprite-action-timeline-head">
            <div>
              <b>动作 #{actionNumber} · 帧时间线</b>
              <span>从中间原始帧池拖入；拖动步骤可换序</span>
            </div>
            <DsButton
              disabled={
                props.selectedSourceFrame < 0 || props.selectedSourceFrame >= props.frames.length
              }
              onClick={() =>
                insertStep(
                  { frame: props.selectedSourceFrame, durationMs: 250 },
                  action.steps.length,
                )
              }
              size="compact"
              variant="secondary"
            >
              ＋ 追加已选 #{props.selectedSourceFrame}
            </DsButton>
          </div>
          <DsReorderCollection
            adoptionId="asset/sprite-action-steps"
            scopeKey={`sprite:${props.definition.id}:action:${actionId}:steps`}
            entries={action.steps.map((step, index) => ({
              key: stepReorderKeys.keys[index]!,
              label: `第 ${index + 1} 步，帧 ${step.frame}`,
            }))}
            revision={props.session.getHistoryVersion()}
            disabled={!props.proof}
            onReorder={reorderSteps}
          >
            <ol className="sprite-action-timeline">
              {action.steps.map((step, index) => {
                const reorderKey = stepReorderKeys.keys[index]!
                return (
                  <Fragment key={reorderKey}>
                    <li
                      className="sprite-action-drop-boundary"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => acceptDrop(event, index)}
                    >
                      <DsPressable
                        type="button"
                        aria-label={`在第 ${index + 1} 步之前插入已选源帧 ${props.selectedSourceFrame}`}
                        disabled={
                          props.selectedSourceFrame < 0 ||
                          props.selectedSourceFrame >= props.frames.length
                        }
                        onClick={() =>
                          insertStep({ frame: props.selectedSourceFrame, durationMs: 250 }, index)
                        }
                      >
                        ＋ 在此插入 #{props.selectedSourceFrame}
                      </DsPressable>
                    </li>
                    <DsReorderItem as="li" itemKey={reorderKey}>
                      <div
                        className={`sprite-action-step${action.loopFrom === index ? ' loop-start' : ''}`}
                      >
                        <SpriteFrameCanvas
                          source={props.frames[step.frame]?.canvas}
                          width={56}
                          height={56}
                          maxScale={2}
                          label={`动作 ${action.label} 第 ${index + 1} 步，源帧 ${step.frame}`}
                        />
                        <DsFieldGroup className="sprite-action-step-fields">
                          <b>
                            {action.loopFrom === index ? '↻ ' : ''}帧 #{step.frame}
                          </b>
                          <DsField
                            id={`sprite-action-step-${actionNumber}-${reorderKey}-duration`}
                            label="停留"
                          >
                            {(field) => (
                              <DsFieldMeasure measure="short-number">
                                <DsControlGroup
                                  control={
                                    <StepDurationInput
                                      id={field.id}
                                      draftKey={`sprite:${props.definition.id}:action:${actionId}:step:${reorderKey}:durationMs`}
                                      syncToken={props.session.getHistoryVersion()}
                                      value={step.durationMs}
                                      disabled={!props.proof}
                                      onCommit={(durationMs) =>
                                        updateAction((current) => ({
                                          ...current,
                                          steps: current.steps.map((candidate, position) =>
                                            position === index
                                              ? { ...candidate, durationMs }
                                              : candidate,
                                          ),
                                        }))
                                      }
                                    />
                                  }
                                  actions={<span>ms</span>}
                                />
                              </DsFieldMeasure>
                            )}
                          </DsField>
                        </DsFieldGroup>
                        <div className="sprite-action-step-buttons">
                          <DsReorderMoveButton itemKey={reorderKey} direction="backward" />
                          <DsReorderMoveButton itemKey={reorderKey} direction="forward" />
                          <DsButton
                            className="icon-only danger-action"
                            aria-label={`删除第 ${index + 1} 步`}
                            disabled={action.steps.length <= 1}
                            onClick={() => removeStep(index)}
                            size="compact"
                            variant="secondary"
                          >
                            ×
                          </DsButton>
                        </div>
                        <DsFieldGroup className="sprite-action-cues">
                          {(step.cues ?? []).map((cue, cueIndex) => (
                            <DsField
                              key={`${cueIndex}:${cue.asset}`}
                              id={`sprite-action-step-${actionNumber}-${reorderKey}-cue-${cueIndex}`}
                              label="音效"
                            >
                              {(field) => (
                                <DsControlGroup
                                  control={
                                    <DsSelect
                                      id={field.id}
                                      size="compact"
                                      aria-label={`第 ${index + 1} 步第 ${cueIndex + 1} 个音效`}
                                      value={cue.asset}
                                      options={sounds.map(([asset, record]) => ({
                                        value: asset,
                                        label: record.label ?? asset,
                                        description: asset,
                                      }))}
                                      onValueChange={(value) =>
                                        updateAction((current) => ({
                                          ...current,
                                          steps: current.steps.map((candidate, position) => {
                                            if (position !== index) return candidate
                                            const cues = [...(candidate.cues ?? [])]
                                            cues[cueIndex] = { kind: 'sound', asset: value }
                                            return { ...candidate, cues }
                                          }),
                                        }))
                                      }
                                    />
                                  }
                                  actions={
                                    <DsButton
                                      className="icon-only danger-action"
                                      aria-label="移除同步音效"
                                      onClick={() =>
                                        updateAction((current) => ({
                                          ...current,
                                          steps: current.steps.map((candidate, position) => {
                                            if (position !== index) return candidate
                                            const cues = (candidate.cues ?? []).filter(
                                              (_, position) => position !== cueIndex,
                                            )
                                            const next = { ...candidate }
                                            if (cues.length) next.cues = cues
                                            else delete next.cues
                                            return next
                                          }),
                                        }))
                                      }
                                      size="compact"
                                      variant="secondary"
                                    >
                                      ×
                                    </DsButton>
                                  }
                                />
                              )}
                            </DsField>
                          ))}
                          <DsButton
                            data-ds-add-picker-deferred="asset/sprite-step-sound-cue-append-default"
                            disabled={!firstSoundAsset(props.catalog)}
                            onClick={() => {
                              const asset = firstSoundAsset(props.catalog)
                              if (!asset) return
                              updateAction((current) => ({
                                ...current,
                                steps: current.steps.map((candidate, position) =>
                                  position === index
                                    ? {
                                        ...candidate,
                                        cues: [...(candidate.cues ?? []), { kind: 'sound', asset }],
                                      }
                                    : candidate,
                                ),
                              }))
                            }}
                            size="compact"
                            variant="secondary"
                          >
                            ＋ 同步音效
                          </DsButton>
                        </DsFieldGroup>
                      </div>
                    </DsReorderItem>
                  </Fragment>
                )
              })}
              <li
                className="sprite-action-drop-end"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => acceptDrop(event, action.steps.length)}
              >
                <span>拖到这里追加源帧</span>
                <DsPressable
                  type="button"
                  disabled={
                    props.selectedSourceFrame < 0 ||
                    props.selectedSourceFrame >= props.frames.length
                  }
                  onClick={() =>
                    insertStep(
                      { frame: props.selectedSourceFrame, durationMs: 250 },
                      action.steps.length,
                    )
                  }
                >
                  ＋ 追加已选 #{props.selectedSourceFrame}
                </DsPressable>
              </li>
            </ol>
          </DsReorderCollection>

          <div className="sprite-action-footer">
            {actionReferences.length ? (
              <DsButton
                onClick={() => props.onOpenReferences?.(actionId)}
                size="compact"
                variant="secondary"
                icon="open"
              >
                查看 {actionReferences.length} 个引用
              </DsButton>
            ) : (
              <span className="hint2">当前动作尚未被场景引用。</span>
            )}
            <span className="spacer" />
            <DsButton
              className="danger-action"
              disabled={actionReferences.length > 0}
              title={actionReferences.length ? '存在引用，先到“使用位置”处理引用' : undefined}
              onClick={deleteAction}
              size="compact"
              variant="secondary"
            >
              删除动作
            </DsButton>
          </div>
        </div>
      ) : null}
    </DsInspectorSection>
  )
}
