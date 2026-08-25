import type {
  AssetCatalogV1,
  SpriteActionDef,
  SpriteActionReference,
  SpriteActionStep,
  SpriteDef,
} from '@type-pal/content'
import { Fragment, type DragEvent as ReactDragEvent, useEffect, useMemo, useState } from 'react'
import { type SpriteLayoutEditProof, UpdateSpriteCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import {
  DsButton,
  DsCatalogRow,
  DsCheckbox,
  DsInspectorSection,
  DsNumberInput,
  DsPropertyGrid,
  DsPropertyRow,
  DsSelect,
  DsTextInput,
  DsPressable,
} from './design-system/index.js'
import { SpriteFrameCanvas, type SpriteFrameView } from './SpriteFrameWorkbench.js'
import { SPRITE_FRAME_DRAG_MIME } from './SpriteResourceViewer.js'

const ACTION_STEP_DRAG_MIME = 'application/x-type-pal-sprite-action-step'

interface RawFrameDragPayload {
  asset: string
  frame: number
}

interface ActionStepDragPayload {
  sprite: string
  action: string
  index: number
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
  return Object.entries(sprite.poses ?? {}).sort(
    ([leftId, left], [rightId, right]) =>
      (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
      leftId.localeCompare(rightId),
  )
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
  value: number
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(props.value))
  useEffect(() => setDraft(String(props.value)), [props.value])
  const commit = (): void => {
    const value = Number(draft)
    if (!Number.isInteger(value) || value <= 0) {
      setDraft(String(props.value))
      return
    }
    if (value !== props.value) props.onCommit(value)
  }
  return (
    <DsNumberInput
      id={props.id}
      min={1}
      step={10}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          setDraft(String(props.value))
          event.currentTarget.blur()
        }
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
  const actionNumber = actionId ? actions.findIndex(([id]) => id === actionId) : -1
  const actionReferences = actionId
    ? props.references.filter(
        (reference) => reference.sprite === props.definition.id && reference.action === actionId,
      )
    : []
  const [labelDraft, setLabelDraft] = useState(action?.label ?? '')

  useEffect(() => {
    if (!actions.some(([candidate]) => candidate === props.selectedActionId))
      props.onSelectedActionChange?.(actions[0]?.[0])
  }, [actions, props.onSelectedActionChange, props.selectedActionId])

  useEffect(() => {
    void actionId
    setLabelDraft(action?.label ?? '')
  }, [action?.label, actionId])

  const reportError = (reason: unknown): void =>
    props.onStatusNotice?.({
      kind: 'error',
      message: reason instanceof Error ? reason.message : String(reason),
    })

  const commitPoses = (poses: Record<string, SpriteActionDef> | undefined): void => {
    if (!props.proof) {
      reportError('源帧尚未读取完成，不能编辑动作。')
      return
    }
    try {
      props.session.dispatch(
        new UpdateSpriteCommand(
          props.definition.id,
          { poses: poses && Object.keys(poses).length ? poses : undefined },
          props.proof,
        ),
      )
      props.onStatusNotice?.(undefined)
    } catch (reason) {
      reportError(reason)
    }
  }

  const updateAction = (transform: (current: SpriteActionDef) => SpriteActionDef): void => {
    if (!actionId || !action) return
    commitPoses({
      ...props.definition.poses,
      [actionId]: transform(structuredClone(action)),
    })
  }

  const createAction = (): void => {
    const id = nextActionId(props.definition)
    const order = Math.max(-1, ...actions.map(([, value]) => value.order ?? -1)) + 1
    commitPoses({
      ...props.definition.poses,
      [id]: {
        label: `动作 ${actions.length + 1}`,
        order,
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
    props.onSelectedActionChange?.(id)
  }

  const deleteAction = (): void => {
    if (!actionId || !action || actionReferences.length) return
    if (!window.confirm(`删除预制动作“${action.label}”（${actionId}）？`)) return
    const poses = { ...props.definition.poses }
    delete poses[actionId]
    commitPoses(poses)
  }

  const insertStep = (step: SpriteActionStep, targetIndex: number): void =>
    updateAction((current) => {
      const loopStep = current.loopFrom === undefined ? undefined : current.steps[current.loopFrom]
      const steps = [...current.steps]
      steps.splice(Math.max(0, Math.min(targetIndex, steps.length)), 0, step)
      const next = { ...current, steps }
      if (loopStep) next.loopFrom = steps.indexOf(loopStep)
      return next
    })

  const reorderStep = (sourceIndex: number, targetIndex: number): void =>
    updateAction((current) => {
      if (
        sourceIndex < 0 ||
        sourceIndex >= current.steps.length ||
        targetIndex < 0 ||
        targetIndex > current.steps.length
      )
        return current
      const loopStep = current.loopFrom === undefined ? undefined : current.steps[current.loopFrom]
      const steps = [...current.steps]
      const [moved] = steps.splice(sourceIndex, 1)
      if (!moved) return current
      const insertion = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
      steps.splice(insertion, 0, moved)
      const next = { ...current, steps }
      if (loopStep) next.loopFrom = steps.indexOf(loopStep)
      return next
    })

  const removeStep = (index: number): void =>
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
    const step = parseDragPayload<ActionStepDragPayload>(event, ACTION_STEP_DRAG_MIME)
    if (step && step.sprite === props.definition.id && step.action === actionId)
      reorderStep(step.index, targetIndex)
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
        <div className="ds-inspector-choice-list" role="group" aria-label="选择预制动作">
          {actions.map(([id, candidate], index) => (
            <DsCatalogRow
              key={id}
              selected={id === actionId}
              title={`#${index} · ${candidate.label}`}
              meta={id}
              trailing={`${candidate.loopFrom === undefined ? '单次' : '循环'} · ${candidate.steps.length} 步`}
              onClick={() => props.onSelectedActionChange?.(id)}
            />
          ))}
        </div>
      ) : (
        <p className="ds-inspector-inline-empty">
          尚无预制动作。新增后，可把中间“全部源帧”中的帧拖到时间线。
        </p>
      )}

      {action && actionId ? (
        <div className="sprite-action-detail">
          <DsPropertyGrid>
            <DsPropertyRow label="名称" labelFor="sprite-action-name">
              <DsTextInput
                id="sprite-action-name"
                name="sprite-action-name"
                autoComplete="off"
                size="compact"
                value={labelDraft}
                onChange={(event) => setLabelDraft(event.target.value)}
                onBlur={() => {
                  const label = labelDraft.trim()
                  if (!label) setLabelDraft(action.label)
                  else if (label !== action.label)
                    updateAction((current) => ({ ...current, label }))
                }}
              />
            </DsPropertyRow>
            <DsPropertyRow label="ActionId" help="稳定引用身份，显示顺序变化不会改变它。">
              <code className="ds-inspector-readonly" translate="no">
                {actionId}
              </code>
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
          <ol className="sprite-action-timeline">
            {action.steps.map((step, index) => (
              <Fragment key={`${index}:${step.frame}`}>
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
                <li
                  className={`sprite-action-step${action.loopFrom === index ? ' loop-start' : ''}`}
                >
                  <DsPressable
                    type="button"
                    className="sprite-action-drag-handle"
                    aria-label={`拖动第 ${index + 1} 步调整顺序`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData(
                        ACTION_STEP_DRAG_MIME,
                        JSON.stringify({ sprite: props.definition.id, action: actionId, index }),
                      )
                    }}
                  >
                    ≡
                  </DsPressable>
                  <SpriteFrameCanvas
                    source={props.frames[step.frame]?.canvas}
                    width={56}
                    height={56}
                    maxScale={2}
                    label={`动作 ${action.label} 第 ${index + 1} 步，源帧 ${step.frame}`}
                  />
                  <div className="sprite-action-step-fields">
                    <b>
                      {action.loopFrom === index ? '↻ ' : ''}帧 #{step.frame}
                    </b>
                    <label htmlFor={`sprite-action-step-${actionNumber}-${index}-duration`}>
                      停留
                      <StepDurationInput
                        id={`sprite-action-step-${actionNumber}-${index}-duration`}
                        value={step.durationMs}
                        onCommit={(durationMs) =>
                          updateAction((current) => ({
                            ...current,
                            steps: current.steps.map((candidate, position) =>
                              position === index ? { ...candidate, durationMs } : candidate,
                            ),
                          }))
                        }
                      />
                      ms
                    </label>
                  </div>
                  <div className="sprite-action-step-buttons">
                    <DsButton
                      className="icon-only"
                      aria-label={`第 ${index + 1} 步上移`}
                      disabled={index === 0}
                      onClick={() => reorderStep(index, index - 1)}
                      size="compact"
                      variant="secondary"
                    >
                      ↑
                    </DsButton>
                    <DsButton
                      className="icon-only"
                      aria-label={`第 ${index + 1} 步下移`}
                      disabled={index === action.steps.length - 1}
                      onClick={() => reorderStep(index, index + 2)}
                      size="compact"
                      variant="secondary"
                    >
                      ↓
                    </DsButton>
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
                  <div className="sprite-action-cues">
                    {(step.cues ?? []).map((cue, cueIndex) => (
                      <label key={`${cueIndex}:${cue.asset}`}>
                        音效
                        <DsSelect
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
                      </label>
                    ))}
                    <DsButton
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
                  </div>
                </li>
              </Fragment>
            ))}
            <li
              className="sprite-action-drop-end"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => acceptDrop(event, action.steps.length)}
            >
              <span>拖到这里追加源帧</span>
              <DsPressable
                type="button"
                disabled={
                  props.selectedSourceFrame < 0 || props.selectedSourceFrame >= props.frames.length
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
