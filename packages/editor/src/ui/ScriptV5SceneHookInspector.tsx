import type { NamedSceneHookV5 } from '@type-pal/content'
import { useEffect, useMemo, useState } from 'react'
import {
  AddSceneHookV5Command,
  CopySceneHookV5Command,
  DeleteSceneHookV5Command,
  RenameSceneHookV5Command,
  type SceneHookSlotV5,
  type ScriptEditorCommandV5,
  type ScriptEditorStateV5,
  SetSceneHookInitialV5Command,
  sceneHookReferencesV5,
  UpdateSceneHookV5Command,
} from '../core/script-v5-editor.js'
import {
  type CanonicalScriptEditorContextV5,
  CanonicalScriptFlowEditorV5,
} from './CanonicalScriptEditorV5.js'

function defaultHook(label: string): NamedSceneHookV5 {
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

export function ScriptV5SceneHookInspector(props: {
  state: ScriptEditorStateV5
  sceneId: string
  slot: SceneHookSlotV5
  onSlotChange?: (slot: SceneHookSlotV5) => void
  selectedHookId?: string
  onSelectHook?: (hookId: string | undefined) => void
  onDispatch: (command: ScriptEditorCommandV5) => void
  onOpenReference?: (path: string) => void
  onError?: (message: string) => void
  editorContext?: CanonicalScriptEditorContextV5
}) {
  const scene = props.state.scenes.find((candidate) => candidate.id === props.sceneId)
  const channel = scene?.hooks?.[props.slot]
  const variants = channel?.variants ?? {}
  const entries = useMemo(
    () =>
      Object.entries(variants).sort(
        ([leftId, left], [rightId, right]) =>
          left.order - right.order || leftId.localeCompare(rightId),
      ),
    [variants],
  )
  const selectedId =
    (props.selectedHookId && variants[props.selectedHookId]
      ? props.selectedHookId
      : entries[0]?.[0]) ?? ''
  const selected = variants[selectedId]
  const references = selected
    ? sceneHookReferencesV5(props.state, props.sceneId, props.slot, selectedId)
    : []
  const [newId, setNewId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [renameId, setRenameId] = useState(selectedId)
  const [copyId, setCopyId] = useState(selectedId ? `${selectedId}-copy` : '')
  const [labelDraft, setLabelDraft] = useState(selected?.label ?? '')

  useEffect(() => {
    setRenameId(selectedId)
    setCopyId(selectedId ? `${selectedId}-copy` : '')
    setLabelDraft(selected?.label ?? '')
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

  if (!scene)
    return (
      <section className="script-v5-behavior-inspector empty" aria-label="场景 Hook">
        <p>场景不存在：{props.sceneId}</p>
      </section>
    )

  return (
    <section
      className="script-v5-behavior-inspector script-v5-hook-inspector"
      aria-label="场景 Hook"
    >
      <header className="script-v5-behavior-heading">
        <div>
          <h4>场景 Hook</h4>
          <code>{props.sceneId}</code>
        </div>
        <div className="script-v5-channel-tabs" role="tablist" aria-label="场景 Hook 通道">
          {(['onEnter', 'onTeleport'] as const).map((slot) => (
            <button
              key={slot}
              type="button"
              role="tab"
              aria-selected={props.slot === slot}
              className={props.slot === slot ? 'active' : ''}
              onClick={() => props.onSlotChange?.(slot)}
            >
              {slot === 'onEnter' ? '进入场景' : '传送出口'}
            </button>
          ))}
        </div>
        <span>{entries.length} 个具名变体</span>
      </header>

      {channel ? (
        <label className="script-v5-hook-initial">
          <span className="field-label">默认 Hook</span>
          <select
            className="in"
            aria-label="默认 Hook"
            value={channel.initial ?? ''}
            onChange={(event) =>
              dispatch(
                new SetSceneHookInitialV5Command(
                  props.sceneId,
                  props.slot,
                  event.target.value || undefined,
                ),
              )
            }
          >
            <option value="">不自动运行</option>
            {entries.map(([id, hook]) => (
              <option key={id} value={id}>
                {hook.label} · {id}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="script-v5-behavior-layout">
        <div className="script-v5-behavior-list">
          {entries.length ? (
            entries.map(([id, value]) => {
              const refCount = sceneHookReferencesV5(
                props.state,
                props.sceneId,
                props.slot,
                id,
              ).length
              return (
                <button
                  key={id}
                  type="button"
                  className={id === selectedId ? 'active' : ''}
                  aria-pressed={id === selectedId}
                  onClick={() => props.onSelectHook?.(id)}
                >
                  <span>{value.label}</span>
                  <code>{id}</code>
                  <small>{refCount} 个引用</small>
                </button>
              )
            })
          ) : (
            <p className="script-v5-empty-copy">当前通道还没有 Hook。</p>
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
                  new AddSceneHookV5Command(props.sceneId, props.slot, id, defaultHook(label)),
                )
              ) {
                setNewId('')
                setNewLabel('')
                props.onSelectHook?.(id)
              }
            }}
          >
            <strong>新增 Hook</strong>
            <input
              className="in mono"
              aria-label="新 Hook 稳定 id"
              placeholder="稳定 id"
              value={newId}
              onChange={(event) => setNewId(event.target.value)}
            />
            <input
              className="in"
              aria-label="新 Hook 名称"
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
                  aria-label="Hook 业务名称"
                  value={labelDraft}
                  onChange={(event) => setLabelDraft(event.target.value)}
                />
                <button
                  type="button"
                  disabled={!labelDraft.trim() || labelDraft === selected.label}
                  onClick={() =>
                    dispatch(
                      new UpdateSceneHookV5Command(props.sceneId, props.slot, selectedId, {
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
                    new RenameSceneHookV5Command(props.sceneId, props.slot, selectedId, nextId),
                  )
                )
                  props.onSelectHook?.(nextId)
              }}
            >
              <span className="field-label">稳定 id</span>
              <div className="script-v5-inline-edit">
                <input
                  className="in mono"
                  aria-label="Hook 稳定 id"
                  value={renameId}
                  onChange={(event) => setRenameId(event.target.value)}
                />
                <button type="submit" disabled={!renameId.trim() || renameId.trim() === selectedId}>
                  改名并重写引用
                </button>
              </div>
            </form>

            <div className="script-v5-flow-summary script-v5-hook-flow">
              <div className="script-v5-section-heading">
                <strong>{selected.flow.kind === 'stages' ? '阶段流' : '具名状态机'}</strong>
                <span>
                  {selected.flow.kind === 'stages'
                    ? `${selected.flow.stages.length} 个阶段 · 初始 ${selected.flow.initial}`
                    : `${Object.keys(selected.flow.machine.states).length} 个状态 · 初始 ${selected.flow.machine.initial}`}
                </span>
              </div>
              <CanonicalScriptFlowEditorV5
                flow={selected.flow}
                context={props.editorContext}
                onError={props.onError}
                onChange={(flow) =>
                  dispatch(
                    new UpdateSceneHookV5Command(props.sceneId, props.slot, selectedId, { flow }),
                  )
                }
              />
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
                          {reference.kind === 'initial'
                            ? '默认 Hook'
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
                    dispatch(new CopySceneHookV5Command(props.sceneId, props.slot, selectedId, id))
                  )
                    props.onSelectHook?.(id)
                }}
              >
                <input
                  className="in mono"
                  aria-label="Hook 副本稳定 id"
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
                    : '删除当前具名 Hook'
                }
                onClick={() => {
                  if (
                    dispatch(new DeleteSceneHookV5Command(props.sceneId, props.slot, selectedId))
                  ) {
                    const next = entries.find(([id]) => id !== selectedId)?.[0]
                    props.onSelectHook?.(next)
                  }
                }}
              >
                删除 Hook
              </button>
            </div>
          </div>
        ) : (
          <div className="script-v5-behavior-detail empty">
            <p>先新增一个具名 Hook，再编辑正文与控制流。</p>
          </div>
        )}
      </div>
    </section>
  )
}
