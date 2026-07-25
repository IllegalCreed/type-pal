import type {
  EntityAddress,
  NamedEntityBehaviorV5,
  Selection,
  StateTransitionV5,
} from '@type-pal/content'
import { useEffect, useMemo, useState } from 'react'
import {
  AddEntityBehaviorV5Command,
  behaviorReferencesV5,
  CopyEntityBehaviorV5Command,
  DeleteEntityBehaviorV5Command,
  presentSelectionV5,
  RenameEntityBehaviorV5Command,
  type ScriptEditorCommandV5,
  type ScriptEditorStateV5,
  stateTransitionExecutionLabelV5,
  UpdateEntityBehaviorV5Command,
} from '../core/script-v5-editor.js'
import {
  type CanonicalScriptEditorContextV5,
  CanonicalScriptFlowEditorV5,
} from './CanonicalScriptEditorV5.js'

type BehaviorChannelV5 = 'trigger' | 'auto'

function entityOf(state: ScriptEditorStateV5, target: EntityAddress) {
  const scene = state.scenes.find((candidate) => candidate.id === target.scene)
  return scene?.entities.find((candidate) => candidate.id === target.entity)
}

function defaultBehavior(label: string): NamedEntityBehaviorV5 {
  return {
    label,
    order: 0,
    flow: {
      kind: 'stages',
      initial: 'start',
      stages: [{ id: 'start', body: [] }],
    },
  }
}

function transitionSummary(transition: StateTransitionV5): string {
  switch (transition.kind) {
    case 'stay':
      return '保持当前状态'
    case 'restart':
      return '回到初始状态'
    case 'continue':
    case 'advance':
    case 'to':
      return `转到 ${transition.state}`
    case 'branch':
      return '按条件分派'
    case 'commandOutcome':
      return `按命令 ${transition.commandId} 的结果分派`
  }
}

export function BehaviorSelectionEditorV5(props: {
  selection: Selection<string>
  behaviors: Readonly<Record<string, NamedEntityBehaviorV5>>
  onChange: (selection: Selection<string>) => void
  label?: string
}) {
  const entries = useMemo(
    () =>
      Object.entries(props.behaviors).sort(
        ([leftId, left], [rightId, right]) =>
          left.order - right.order || leftId.localeCompare(rightId),
      ),
    [props.behaviors],
  )
  const value =
    props.selection.kind === 'inherit'
      ? '__inherit'
      : props.selection.kind === 'disabled'
        ? '__disabled'
        : props.selection.value
  const danglingValue =
    props.selection.kind === 'use' && props.behaviors[props.selection.value] === undefined
      ? props.selection.value
      : undefined
  const presentation = presentSelectionV5(props.selection, (id) => {
    const behavior = props.behaviors[id]
    return behavior ? `${behavior.label} · ${id}` : `${id}（引用失效）`
  })

  return (
    <label className="script-v5-selection">
      <span className="field-label">{props.label ?? '活动行为'}</span>
      <select
        className="in"
        aria-label={props.label ?? '活动行为'}
        value={value}
        onChange={(event) => {
          if (event.target.value === '__inherit') props.onChange({ kind: 'inherit' })
          else if (event.target.value === '__disabled') props.onChange({ kind: 'disabled' })
          else props.onChange({ kind: 'use', value: event.target.value })
        }}
      >
        <option value="__inherit">继承静态定义</option>
        <option value="__disabled">显式禁用</option>
        {danglingValue ? <option value={danglingValue}>{danglingValue}（引用失效）</option> : null}
        {entries.map(([id, behavior]) => (
          <option key={id} value={id}>
            {behavior.label} · {id}
          </option>
        ))}
      </select>
      <small className={`script-v5-selection-status ${presentation.tone}`}>
        {presentation.label}
      </small>
    </label>
  )
}

export function ScriptV5BehaviorInspector(props: {
  state: ScriptEditorStateV5
  target: EntityAddress
  channel: BehaviorChannelV5
  selectedBehaviorId?: string
  onSelectBehavior?: (behaviorId: string) => void
  onDispatch: (command: ScriptEditorCommandV5) => void
  onOpenReference?: (path: string) => void
  onOpenFlow?: (behaviorId: string) => void
  onError?: (message: string) => void
  editorContext?: CanonicalScriptEditorContextV5
}) {
  const entity = entityOf(props.state, props.target)
  const registry = entity?.behaviors?.[props.channel] ?? {}
  const entries = useMemo(
    () =>
      Object.entries(registry).sort(
        ([leftId, left], [rightId, right]) =>
          left.order - right.order || leftId.localeCompare(rightId),
      ),
    [registry],
  )
  const selectedId =
    (props.selectedBehaviorId && registry[props.selectedBehaviorId]
      ? props.selectedBehaviorId
      : entries[0]?.[0]) ?? ''
  const selected = registry[selectedId]
  const references = selected
    ? behaviorReferencesV5(props.state, props.target, props.channel, selectedId)
    : []
  const [newId, setNewId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [renameId, setRenameId] = useState(selectedId)
  const [copyId, setCopyId] = useState(selectedId ? `${selectedId}-copy` : '')
  const [labelDraft, setLabelDraft] = useState(selected?.label ?? '')
  const [flowEditorOpen, setFlowEditorOpen] = useState(false)

  useEffect(() => {
    setRenameId(selectedId)
    setCopyId(selectedId ? `${selectedId}-copy` : '')
    setLabelDraft(selected?.label ?? '')
    setFlowEditorOpen(false)
  }, [selectedId, selected?.label])

  const dispatch = (command: ScriptEditorCommandV5): boolean => {
    try {
      props.onDispatch(command)
      return true
    } catch (error) {
      props.onError?.(error instanceof Error ? error.message : String(error))
      return false
    }
  }

  if (!entity)
    return (
      <section className="script-v5-behavior-inspector empty" aria-label="具名行为">
        <p>
          实体不存在：{props.target.scene}/{props.target.entity}
        </p>
      </section>
    )

  return (
    <section className="script-v5-behavior-inspector" aria-label="具名行为">
      <header className="script-v5-behavior-heading">
        <div>
          <h4>{props.channel === 'trigger' ? '触发行为' : '自动行为'}</h4>
          <code>
            {props.target.scene}/{props.target.entity}
          </code>
        </div>
        <span>{entries.length} 个具名槽</span>
      </header>

      <div className="script-v5-behavior-layout">
        <div className="script-v5-behavior-list">
          {entries.length ? (
            entries.map(([id, value]) => {
              const refCount = behaviorReferencesV5(
                props.state,
                props.target,
                props.channel,
                id,
              ).length
              return (
                <button
                  key={id}
                  type="button"
                  className={id === selectedId ? 'active' : ''}
                  aria-pressed={id === selectedId}
                  onClick={() => props.onSelectBehavior?.(id)}
                >
                  <span>{value.label}</span>
                  <code>{id}</code>
                  <small>{refCount} 个引用</small>
                </button>
              )
            })
          ) : (
            <p className="script-v5-empty-copy">当前通道还没有行为。</p>
          )}

          <form
            className="script-v5-create-behavior"
            onSubmit={(event) => {
              event.preventDefault()
              const id = newId.trim()
              const label = newLabel.trim() || id
              if (
                id &&
                dispatch(
                  new AddEntityBehaviorV5Command(
                    props.target,
                    props.channel,
                    id,
                    defaultBehavior(label),
                  ),
                )
              ) {
                setNewId('')
                setNewLabel('')
                props.onSelectBehavior?.(id)
              }
            }}
          >
            <strong>新增行为</strong>
            <input
              className="in mono"
              aria-label="新行为稳定 id"
              placeholder="稳定 id"
              value={newId}
              onChange={(event) => setNewId(event.target.value)}
            />
            <input
              className="in"
              aria-label="新行为名称"
              placeholder="业务名称（可后补）"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
            />
            <button type="submit" disabled={!newId.trim()}>
              ＋ 新增
            </button>
          </form>
        </div>

        {selected ? (
          <div className="script-v5-behavior-detail">
            <div className="field">
              <span className="field-label">业务名称</span>
              <div className="script-v5-inline-edit">
                <input
                  className="in"
                  aria-label="行为业务名称"
                  value={labelDraft}
                  onChange={(event) => setLabelDraft(event.target.value)}
                />
                <button
                  type="button"
                  disabled={!labelDraft.trim() || labelDraft === selected.label}
                  onClick={() =>
                    dispatch(
                      new UpdateEntityBehaviorV5Command(props.target, props.channel, selectedId, {
                        label: labelDraft.trim(),
                      }),
                    )
                  }
                >
                  保存名称
                </button>
              </div>
            </div>

            <form
              className="field"
              onSubmit={(event) => {
                event.preventDefault()
                const nextId = renameId.trim()
                if (
                  nextId &&
                  nextId !== selectedId &&
                  dispatch(
                    new RenameEntityBehaviorV5Command(
                      props.target,
                      props.channel,
                      selectedId,
                      nextId,
                    ),
                  )
                )
                  props.onSelectBehavior?.(nextId)
              }}
            >
              <span className="field-label">稳定 id</span>
              <div className="script-v5-inline-edit">
                <input
                  className="in mono"
                  aria-label="行为稳定 id"
                  value={renameId}
                  onChange={(event) => setRenameId(event.target.value)}
                />
                <button type="submit" disabled={!renameId.trim() || renameId.trim() === selectedId}>
                  改名并重写引用
                </button>
              </div>
            </form>

            <div className="script-v5-flow-summary">
              <div className="script-v5-section-heading">
                <strong>{selected.flow.kind === 'stages' ? '阶段流' : '具名状态机'}</strong>
                <span>
                  {selected.flow.kind === 'stages'
                    ? `${selected.flow.stages.length} 个阶段 · 初始 ${selected.flow.initial}`
                    : `${Object.keys(selected.flow.machine.states).length} 个状态 · 初始 ${selected.flow.machine.initial}`}
                </span>
              </div>
              <button
                type="button"
                aria-expanded={flowEditorOpen}
                onClick={() => {
                  setFlowEditorOpen((open) => !open)
                  props.onOpenFlow?.(selectedId)
                }}
              >
                {flowEditorOpen ? '收起正文与控制流' : '编辑正文与控制流'}
              </button>
              {selected.flow.kind === 'stateMachine' ? (
                <ol>
                  {Object.entries(selected.flow.machine.states).map(([id, state]) => (
                    <li key={id}>
                      <code>{id}</code>
                      <span>{state.label}</span>
                      <small>
                        {transitionSummary(state.next)} ·{' '}
                        {stateTransitionExecutionLabelV5(state.next)}
                      </small>
                    </li>
                  ))}
                </ol>
              ) : (
                <ol>
                  {selected.flow.stages.map((stage) => (
                    <li key={stage.id}>
                      <code>{stage.id}</code>
                      <span>{stage.body.length} 条指令</span>
                      <small>{stage.next ? `接 ${stage.next}` : '本次激活结束'}</small>
                    </li>
                  ))}
                </ol>
              )}
              {flowEditorOpen ? (
                <CanonicalScriptFlowEditorV5
                  flow={selected.flow}
                  context={props.editorContext}
                  onError={props.onError}
                  onChange={(flow) =>
                    dispatch(
                      new UpdateEntityBehaviorV5Command(props.target, props.channel, selectedId, {
                        flow,
                      }),
                    )
                  }
                />
              ) : null}
            </div>

            <div className="script-v5-reference-list">
              <div className="script-v5-section-heading">
                <strong>引用</strong>
                <span>{references.length} 处</span>
              </div>
              {references.length ? (
                <ul>
                  {references.map((reference) => (
                    <li key={`${reference.kind}:${reference.path}`}>
                      <button type="button" onClick={() => props.onOpenReference?.(reference.path)}>
                        <span>
                          {reference.kind === 'page'
                            ? '实体页'
                            : reference.kind === 'command'
                              ? '切换指令'
                              : '迁移兼容账'}
                        </span>
                        <code>{reference.path}</code>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>没有外部引用，可以安全删除。</p>
              )}
            </div>

            <div className="script-v5-behavior-actions">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  const id = copyId.trim()
                  if (
                    id &&
                    dispatch(
                      new CopyEntityBehaviorV5Command(props.target, props.channel, selectedId, id),
                    )
                  )
                    props.onSelectBehavior?.(id)
                }}
              >
                <input
                  className="in mono"
                  aria-label="行为副本稳定 id"
                  value={copyId}
                  onChange={(event) => setCopyId(event.target.value)}
                />
                <button type="submit" disabled={!copyId.trim()}>
                  复制
                </button>
              </form>
              <button
                type="button"
                className="danger"
                disabled={references.length > 0}
                title={
                  references.length
                    ? `仍有 ${references.length} 个引用，先处理引用后再删除`
                    : '删除当前具名行为'
                }
                onClick={() => {
                  if (
                    dispatch(
                      new DeleteEntityBehaviorV5Command(props.target, props.channel, selectedId),
                    )
                  ) {
                    const next = entries.find(([id]) => id !== selectedId)?.[0]
                    if (next) props.onSelectBehavior?.(next)
                  }
                }}
              >
                删除行为
              </button>
            </div>
          </div>
        ) : (
          <div className="script-v5-behavior-detail empty">
            <p>先新增一个具名行为，再编辑正文。</p>
          </div>
        )}
      </div>
    </section>
  )
}
