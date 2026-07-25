import type { SharedAuthorScriptV5 } from '@type-pal/content'
import { useEffect, useMemo, useState } from 'react'
import {
  AddSharedScriptV5Command,
  DeleteSharedScriptV5Command,
  type ScriptEditorStateV5,
  type ScriptV5EditSession,
  UpdateSharedScriptV5Command,
} from '../core/script-v5-editor.js'
import {
  CanonicalScriptBodyEditorV5,
  type CanonicalScriptEditorContextV5,
} from './CanonicalScriptEditorV5.js'

function nextScriptId(name: string, state: ScriptEditorStateV5): string {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'script'
  let id = `shared/user/${slug}`
  let index = 2
  while (state.sharedScripts[id]) id = `shared/user/${slug}-${index++}`
  return id
}

export function CanonicalSharedScriptTabV5(props: {
  tabBar: React.ReactNode
  state: ScriptEditorStateV5
  session: ScriptV5EditSession
  context: CanonicalScriptEditorContextV5
  focusScriptId?: string
  onSelectedScriptId?: (id: string | undefined) => void
  onError?: (message: string) => void
}) {
  const ids = useMemo(
    () => Object.keys(props.state.sharedScripts).sort(),
    [props.state.sharedScripts],
  )
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState(
    props.focusScriptId && props.state.sharedScripts[props.focusScriptId]
      ? props.focusScriptId
      : (ids[0] ?? ''),
  )
  const [newName, setNewName] = useState('')
  const [newId, setNewId] = useState('')
  const selected = props.state.sharedScripts[selectedId]
  const [nameDraft, setNameDraft] = useState(selected?.name ?? '')
  const shown = ids.filter((id) => {
    const script = props.state.sharedScripts[id]
    const needle = filter.trim().toLowerCase()
    return (
      !needle || id.toLowerCase().includes(needle) || script?.name.toLowerCase().includes(needle)
    )
  })

  useEffect(() => {
    if (props.focusScriptId && props.state.sharedScripts[props.focusScriptId]) {
      setSelectedId(props.focusScriptId)
      return
    }
    if (!selectedId || !props.state.sharedScripts[selectedId]) setSelectedId(ids[0] ?? '')
  }, [ids, props.focusScriptId, props.state.sharedScripts, selectedId])

  useEffect(() => setNameDraft(selected?.name ?? ''), [selected?.name])

  const dispatch = (command: Parameters<ScriptV5EditSession['dispatch']>[0]): boolean => {
    try {
      props.session.dispatch(command)
      return true
    } catch (error) {
      props.onError?.(error instanceof Error ? error.message : String(error))
      return false
    }
  }

  const select = (id: string): void => {
    setSelectedId(id)
    props.onSelectedScriptId?.(id || undefined)
  }

  const update = (patch: Partial<SharedAuthorScriptV5>): void => {
    if (selectedId) dispatch(new UpdateSharedScriptV5Command(selectedId, patch))
  }

  return (
    <>
      <div className="outliner shared-script-outliner canonical-shared-script-outliner">
        {props.tabBar}
        <div className="pane-h">
          <span className="t">可复用脚本</span>
          <span className="count">{ids.length}</span>
        </div>
        <div className="shared-toolbar">
          <input
            className="in"
            placeholder="搜索名称或稳定 id…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
        <div className="shared-list">
          {shown.map((id) => {
            const script = props.state.sharedScripts[id]!
            return (
              <button
                type="button"
                key={id}
                className={id === selectedId ? 'active' : ''}
                onClick={() => select(id)}
              >
                <strong>{script.name}</strong>
                <code>{id}</code>
                <small>{script.body.length} 条顶层指令</small>
              </button>
            )
          })}
          {!shown.length ? <div className="insp-empty">没有匹配的可复用脚本</div> : null}
        </div>
        <form
          className="canonical-shared-script-create"
          onSubmit={(event) => {
            event.preventDefault()
            const name = newName.trim() || '新共享脚本'
            const id = newId.trim() || nextScriptId(name, props.state)
            if (
              dispatch(
                new AddSharedScriptV5Command(id, {
                  name,
                  self: 'none',
                  body: [],
                }),
              )
            ) {
              setNewName('')
              setNewId('')
              select(id)
            }
          }}
        >
          <strong>新建脚本</strong>
          <input
            className="in"
            aria-label="新共享脚本名称"
            placeholder="业务名称"
            value={newName}
            onChange={(event) => {
              setNewName(event.target.value)
              if (!newId) setNewId(nextScriptId(event.target.value, props.state))
            }}
          />
          <input
            className="in mono"
            aria-label="新共享脚本稳定 id"
            placeholder="shared/user/..."
            value={newId}
            onChange={(event) => setNewId(event.target.value)}
          />
          <button type="submit">＋ 新建</button>
        </form>
      </div>

      <div className="canvas-wrap data-body shared-script-main canonical-shared-script-main">
        {selected ? (
          <>
            <div className="shared-workbench-head">
              <div className="shared-workbench-title">
                <span className="shared-kind-badge">可复用脚本</span>
                <strong>{selected.name}</strong>
                <code>{selectedId}</code>
              </div>
              <span className="spacer" />
              <span className="shared-context-free">
                {selected.self === 'none'
                  ? '位置无关'
                  : selected.self === 'required'
                    ? '必须提供 self'
                    : '可选 self'}
              </span>
            </div>
            <CanonicalScriptBodyEditorV5
              label={`${selected.name} · 正文`}
              body={selected.body}
              context={{ ...props.context, hasImplicitSelf: selected.self === 'required' }}
              onError={props.onError}
              onChange={(body) => update({ body })}
            />
          </>
        ) : (
          <div className="insp-empty">新建一个可复用脚本</div>
        )}
      </div>

      <aside className="inspector shared-script-inspector canonical-shared-script-inspector">
        {selected ? (
          <>
            <div className="insp-head">
              <div className="who">
                <strong>{selected.name}</strong>
                <code>{selectedId}</code>
              </div>
            </div>
            <div className="section shared-meta">
              <h4>作者元数据</h4>
              <label className="v-field">
                <span className="lb">显示名</span>
                <span className="canonical-shared-meta-edit">
                  <input
                    className="in"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!nameDraft.trim() || nameDraft.trim() === selected.name}
                    onClick={() => update({ name: nameDraft.trim() })}
                  >
                    保存
                  </button>
                </span>
              </label>
              <label className="v-field">
                <span className="lb">说明</span>
                <textarea
                  className="in cf-ta"
                  value={selected.description ?? ''}
                  onChange={(event) => update({ description: event.target.value || undefined })}
                />
              </label>
              <label className="v-field">
                <span className="lb">self 契约</span>
                <select
                  className="in"
                  value={selected.self}
                  onChange={(event) =>
                    update({
                      self: event.target.value as SharedAuthorScriptV5['self'],
                    })
                  }
                >
                  <option value="none">不使用</option>
                  <option value="optional">可选</option>
                  <option value="required">必须提供</option>
                </select>
              </label>
              <p className="hint">
                stable ScriptId 创建后保持不变；调用方只保存这个 id，显示名可随时修改。
              </p>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (dispatch(new DeleteSharedScriptV5Command(selectedId))) {
                    const next = ids.find((id) => id !== selectedId) ?? ''
                    select(next)
                  }
                }}
              >
                删除共享脚本
              </button>
            </div>
          </>
        ) : (
          <div className="insp-empty">没有选中的共享脚本</div>
        )}
      </aside>
    </>
  )
}
