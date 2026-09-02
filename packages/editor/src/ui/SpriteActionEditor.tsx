import type {
  AssetCatalogV1,
  SpriteActionDef,
  SpriteActionReference,
  SpriteActionStep,
  SpriteDef,
} from '@type-pal/content'
import {
  Fragment,
  type DragEvent as ReactDragEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type SpriteLayoutEditProof, UpdateSpriteCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { nextSpriteActionId, sortedSpriteActions } from '../core/sprite-actions.js'
import {
  DsActionGroup,
  DsButton,
  DsCheckbox,
  DsControlGroup,
  DsDraftNumberInput,
  DsDraftTextInput,
  DsField,
  DsFieldGroup,
  DsFieldMeasure,
  DsIconButton,
  DsOverflowText,
  DsPressable,
  DsReorderCollection,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  DsSelect,
  DsTextInput,
  DsVirtualListbox,
  reorderDsItems,
  useDsReorderKeys,
} from './design-system/index.js'
import {
  inspectSpriteFrameDragPayload,
  SpriteFrameCanvas,
  type SpriteFrameView,
} from './SpriteFrameWorkbench.js'

function sortedActions(sprite: SpriteDef): Array<[string, SpriteActionDef]> {
  return sortedSpriteActions(sprite).map(({ id, action }) => [id, action])
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
  onCommit: (value: number) => undefined | boolean
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
  mode?: 'create' | 'edit'
  restrictActionId?: string
  onCommitPoses?: (poses: Record<string, SpriteActionDef> | undefined) => boolean
  onRequestCreate?: () => void
  onSelectedActionChange?: (actionId: string | undefined) => void
  onOpenReferences?: (actionId: string) => void
  onBeforeContextChange?: () => boolean
  onMutationResult?: (result: { ok: boolean; reason?: unknown }) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const directoryRef = useRef<HTMLElement>(null)
  const detailPaneRef = useRef<HTMLDivElement>(null)
  const detailHeadingRef = useRef<HTMLHeadingElement>(null)
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const [pendingDeleteFocus, setPendingDeleteFocus] = useState<'detail' | 'create' | undefined>()
  const [narrow, setNarrow] = useState(false)
  const [mobilePage, setMobilePage] = useState<'list' | 'detail'>(
    props.mode === 'create' ? 'detail' : 'list',
  )
  useEffect(() => {
    const query = window.matchMedia?.('(max-width: 720px)')
    if (!query) return
    const update = (): void => {
      if (query.matches) {
        const active = document.activeElement
        if (active instanceof Node && detailPaneRef.current?.contains(active))
          setMobilePage('detail')
        else if (active instanceof Node && directoryRef.current?.contains(active))
          setMobilePage('list')
      }
      setNarrow(query.matches)
    }
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  useEffect(() => {
    if (!narrow) return
    const focus = (): void => {
      if (mobilePage === 'list') searchRef.current?.focus()
      else if (props.mode !== 'create') detailHeadingRef.current?.focus()
    }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(focus)
    else window.setTimeout(focus, 0)
  }, [mobilePage, narrow, props.mode])
  const actionDeleteReasonId = useId()
  const actions = useMemo(() => sortedActions(props.definition), [props.definition])
  const directoryActions = props.restrictActionId
    ? actions.filter(([candidate]) => candidate === props.restrictActionId)
    : actions
  const selectedEntry =
    props.selectedActionId === undefined
      ? actions[0]
      : actions.find(([actionId]) => actionId === props.selectedActionId)
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
  const actionBlockedReason = !props.proof
    ? '源帧尚未读取完成，不能修改动作。'
    : actionReferences.length
      ? `当前动作有 ${actionReferences.length} 个引用，处理引用后才能删除。`
      : undefined
  useEffect(() => {
    if (props.selectedActionId === undefined) props.onSelectedActionChange?.(actions[0]?.[0])
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

  const rejectMutation = (reason: unknown): false => {
    reportError(reason)
    props.onMutationResult?.({ ok: false, reason })
    return false
  }

  const commitPoses = (poses: Record<string, SpriteActionDef> | undefined): boolean => {
    if (props.onCommitPoses) {
      const changed = props.onCommitPoses(poses)
      props.onMutationResult?.({ ok: changed, reason: changed ? undefined : '动作修改未能提交。' })
      return changed
    }
    if (!props.proof) {
      return rejectMutation('源帧尚未读取完成，不能编辑动作。')
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
        return rejectMutation('精灵用途定义已变化，请重新选择后再编辑。')
      }
      locallyOwnedHistoryVersionRef.current = props.session.getHistoryVersion()
      props.onStatusNotice?.(undefined)
      props.onMutationResult?.({ ok: true })
      return true
    } catch (reason) {
      return rejectMutation(reason)
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

  const moveCurrentAction = (delta: -1 | 1): boolean => {
    if (!actionId || actionNumber < 0) return false
    if (props.onBeforeContextChange?.() === false) return false
    const targetIndex = actionNumber + delta
    const next = reorderDsItems(actions, { fromIndex: actionNumber, toIndex: targetIndex })
    if (next === actions) return false
    return commitPoses(
      Object.fromEntries(next.map(([id, candidate], order) => [id, { ...candidate, order }])),
    )
  }

  const createAction = (): void => {
    if (props.onBeforeContextChange?.() === false) return
    if (props.onRequestCreate) {
      props.onRequestCreate()
      return
    }
    const id = nextSpriteActionId(props.definition)
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
    if (props.onBeforeContextChange?.() === false) return
    if (!window.confirm(`删除预制动作“${action.label}”（${actionId}）？`)) return
    const nextActionId = actions[actionNumber + 1]?.[0] ?? actions[actionNumber - 1]?.[0]
    if (
      commitPoses(
        Object.fromEntries(
          actions
            .filter(([id]) => id !== actionId)
            .map(([id, candidate], order) => [id, { ...candidate, order }]),
        ),
      )
    ) {
      setPendingDeleteFocus(nextActionId ? 'detail' : 'create')
      setMobilePage(nextActionId ? 'detail' : 'list')
      props.onSelectedActionChange?.(nextActionId)
    }
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
    const transfer = inspectSpriteFrameDragPayload(event.dataTransfer)
    if (transfer.kind === 'invalid') {
      reportError('源帧拖拽数据无效。')
      return
    }
    if (transfer.kind === 'payload') {
      const frame = transfer.value
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
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const shownActions = normalizedQuery
    ? directoryActions.filter(([id, candidate]) =>
        [id, candidate.label].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
      )
    : directoryActions
  const chooseAction = (id: string): void => {
    if (id !== actionId && props.onBeforeContextChange?.() === false) return
    props.onSelectedActionChange?.(id)
    setMobilePage('detail')
  }

  useEffect(() => {
    if (!pendingDeleteFocus) return
    const target =
      pendingDeleteFocus === 'detail' ? detailHeadingRef.current : createButtonRef.current
    if (!target) return
    setPendingDeleteFocus(undefined)
    target.focus()
  }, [pendingDeleteFocus])

  return (
    <section className="sprite-action-editor" aria-label="预制动作编辑器">
      <header className="sprite-action-editor-head">
        <div>
          <strong>预制动作</strong>
          <span>动作保存在精灵库；场景只引用稳定 ActionId。</span>
        </div>
        {props.mode === 'create' ? null : (
          <DsButton
            ref={createButtonRef}
            variant="secondary"
            disabled={!props.proof}
            onClick={createAction}
          >
            新建预制动作
          </DsButton>
        )}
      </header>
      <div className="sprite-action-editor-layout" data-mobile-page={mobilePage}>
        {!narrow || mobilePage === 'list' ? (
          <aside ref={directoryRef} className="sprite-action-directory" aria-label="预制动作目录">
            <DsTextInput
              ref={searchRef}
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={shownActions.length > 0}
              aria-label="搜索预制动作"
              placeholder="搜索名称或 ActionId"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Escape' || !query) return
                event.preventDefault()
                event.stopPropagation()
                setQuery('')
              }}
            />
            {shownActions.length ? (
              <DsVirtualListbox
                label="选择预制动作"
                items={shownActions}
                itemHeight={58}
                height={520}
                fill
                overscan={4}
                virtualizeAbove={50}
                keyboardOwnerRef={searchRef}
                getKey={([id]) => id}
                selectedKey={actionId}
                onSelect={([id]) => chooseAction(id)}
                renderItem={([id, candidate]) => (
                  <div className="sprite-action-option">
                    <strong>{candidate.label}</strong>
                    <code translate="no">{id}</code>
                    <span>
                      {candidate.loopFrom === undefined ? '单次' : '循环'} ·{' '}
                      {candidate.steps.length} 步
                    </span>
                  </div>
                )}
              />
            ) : actions.length ? (
              <p className="sprite-action-directory-empty">没有匹配的预制动作。</p>
            ) : (
              <p className="sprite-action-directory-empty">
                尚无预制动作。新建后可从源帧选择区添加动作步骤。
              </p>
            )}
          </aside>
        ) : null}

        {(!narrow || mobilePage === 'detail') && action && actionId ? (
          <div ref={detailPaneRef} className="sprite-action-detail sprite-action-detail-pane">
            <div className="sprite-action-current-head">
              <div>
                {narrow ? (
                  <DsButton
                    className="sprite-action-back"
                    variant="secondary"
                    onClick={() => {
                      if (actionId && !shownActions.some(([id]) => id === actionId)) setQuery('')
                      setMobilePage('list')
                    }}
                  >
                    返回动作列表
                  </DsButton>
                ) : null}
                <h3 ref={detailHeadingRef} tabIndex={-1}>
                  {action.label}
                </h3>
                <code translate="no">{actionId}</code>
              </div>
              {props.mode === 'create' ? null : (
                <DsActionGroup density="compact" className="sprite-action-current-actions">
                  <DsIconButton
                    label={`前移预制动作：${action.label}`}
                    icon="chevron-up"
                    variant="secondary"
                    disabled={!props.proof || actionNumber <= 0}
                    aria-describedby={!props.proof ? actionDeleteReasonId : undefined}
                    onClick={() => moveCurrentAction(-1)}
                  />
                  <DsIconButton
                    label={`后移预制动作：${action.label}`}
                    icon="chevron-down"
                    variant="secondary"
                    disabled={!props.proof || actionNumber >= actions.length - 1}
                    aria-describedby={!props.proof ? actionDeleteReasonId : undefined}
                    onClick={() => moveCurrentAction(1)}
                  />
                  <DsIconButton
                    label={`删除预制动作：${action.label}`}
                    icon="delete"
                    variant="danger"
                    disabled={!props.proof || actionReferences.length > 0}
                    aria-describedby={actionBlockedReason ? actionDeleteReasonId : undefined}
                    onClick={deleteAction}
                  />
                </DsActionGroup>
              )}
            </div>
            {actionBlockedReason ? (
              <div className="sprite-action-reference-block" id={actionDeleteReasonId}>
                <span>{actionBlockedReason}</span>
                {actionReferences.length ? (
                  <DsButton variant="secondary" onClick={() => props.onOpenReferences?.(actionId)}>
                    查看引用
                  </DsButton>
                ) : null}
              </div>
            ) : null}
            <DsFieldGroup className="sprite-action-fields">
              <DsField id="sprite-action-name" label="名称">
                {(field) => (
                  <DsDraftTextInput
                    autoFocus={props.mode === 'create'}
                    {...field}
                    name="sprite-action-name"
                    autoComplete="off"
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
                )}
              </DsField>
              <DsField label="ActionId" help="稳定引用身份，显示顺序变化不会改变它。">
                <DsOverflowText as="code" className="ds-inspector-readonly" translate="no">
                  {actionId}
                </DsOverflowText>
              </DsField>
              <DsField label="播放">
                <DsCheckbox
                  label="循环播放"
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
              </DsField>
              {action.loopFrom !== undefined ? (
                <DsField id="sprite-action-loop-from" label="循环起点">
                  {(field) => (
                    <DsSelect
                      {...field}
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
                  )}
                </DsField>
              ) : null}
            </DsFieldGroup>

            <div className="sprite-action-timeline-head">
              <div>
                <b>动作 #{actionNumber} · 帧时间线</b>
                <span>从上方源帧选择区拖入；拖动步骤可换序</span>
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
                          <DsActionGroup density="compact" className="sprite-action-step-buttons">
                            <DsReorderMoveButton itemKey={reorderKey} direction="backward" />
                            <DsReorderMoveButton itemKey={reorderKey} direction="forward" />
                            <DsIconButton
                              label={`删除第 ${index + 1} 步`}
                              icon="delete"
                              variant="danger"
                              disabled={action.steps.length <= 1}
                              onClick={() => removeStep(index)}
                            />
                          </DsActionGroup>
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
                                      <DsIconButton
                                        label={`移除第 ${index + 1} 步第 ${cueIndex + 1} 个同步音效`}
                                        icon="delete"
                                        variant="danger"
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
                                      />
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
                                          cues: [
                                            ...(candidate.cues ?? []),
                                            { kind: 'sound', asset },
                                          ],
                                        }
                                      : candidate,
                                  ),
                                }))
                              }}
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
          </div>
        ) : null}
      </div>
    </section>
  )
}
