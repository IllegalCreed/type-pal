import type { AuthorScriptLibrary, MapIndexV1 } from '@type-pal/content'
import type { ProjectMap, TilesetDef } from '@type-pal/reforge'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  AddSharedScriptCommand,
  DeleteSharedScriptCommand,
  type ScriptEditorState,
  type ScriptEditSession,
  UpdateSharedScriptCommand,
  UpdateSharedScriptMetadataCommand,
  type SharedScriptMetadataPatch,
} from '../core/script-editor.js'
import {
  CanonicalScriptBodyEditor,
  CanonicalScriptDialog,
  type CanonicalScriptEditorContext,
} from './ScriptEditor.js'
import {
  DsButton,
  DsCatalogControls,
  DsCatalogRow,
  DsCatalogWorkspace,
  DsDraftTextArea,
  DsDraftTextInput,
  DsField,
  DsHelpTip,
  DsObjectHero,
  DsSelect,
  DsTag,
  DsTextInput,
} from './design-system/index.js'

type AuthorSharedScript = AuthorScriptLibrary[string]

function nextScriptId(name: string, state: ScriptEditorState): string {
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

export function CanonicalSharedScriptTab(props: {
  tabBar: React.ReactNode
  state: ScriptEditorState
  session: ScriptEditSession
  context: CanonicalScriptEditorContext
  projectId: string
  projectMaps: Record<string, ProjectMap>
  mapIndex: MapIndexV1
  tilesets: readonly TilesetDef[]
  leaderSpriteId?: string
  focusScriptId?: string
  focusCommandPath?: string
  focusRevision?: number
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
  const [newIdEdited, setNewIdEdited] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState('')
  const createFormId = useId()
  const createNameId = useId()
  const createScriptId = useId()
  const createErrorId = useId()
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const createNameInputRef = useRef<HTMLInputElement>(null)
  const createScriptIdInputRef = useRef<HTMLInputElement>(null)
  const createWasOpenRef = useRef(false)
  const selected = props.state.sharedScripts[selectedId]
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

  useEffect(() => {
    if (createOpen) {
      createWasOpenRef.current = true
      createNameInputRef.current?.focus()
      return
    }
    if (createWasOpenRef.current) {
      createWasOpenRef.current = false
      createButtonRef.current?.focus()
    }
  }, [createOpen])

  useEffect(() => {
    if (!createOpen || !createError) return
    const target = newName.trim() ? createScriptIdInputRef.current : createNameInputRef.current
    target?.focus()
  }, [createError, createOpen, newName])

  const dispatch = (
    command: Parameters<ScriptEditSession['dispatch']>[0],
    onFailure?: (message: string) => void,
  ): boolean => {
    try {
      props.session.dispatch(command)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      onFailure?.(message)
      props.onError?.(message)
      return false
    }
  }

  const select = (id: string): void => {
    setSelectedId(id)
    props.onSelectedScriptId?.(id || undefined)
  }

  const updateMetadata = (patch: SharedScriptMetadataPatch): void => {
    if (selectedId) dispatch(new UpdateSharedScriptMetadataCommand(selectedId, patch))
  }

  const updateBody = (body: AuthorSharedScript['body']): void => {
    if (selectedId) dispatch(new UpdateSharedScriptCommand(selectedId, { body }))
  }

  const closeCreate = (): void => {
    setCreateOpen(false)
    setCreateError('')
  }

  const openCreate = (): void => {
    setNewName('')
    setNewId('')
    setNewIdEdited(false)
    setCreateError('')
    setCreateOpen(true)
  }

  const createScript = (): void => {
    const name = newName.trim()
    if (!name) {
      setCreateError('请输入脚本名称。')
      return
    }
    const id = newId.trim() || nextScriptId(name, props.state)
    setCreateError('')
    if (
      dispatch(
        new AddSharedScriptCommand(id, {
          name,
          self: 'none',
          body: [],
        }),
        (message) => {
          setCreateError(message)
        },
      )
    ) {
      closeCreate()
      select(id)
    }
  }

  const deleteSelectedScript = (): void => {
    if (!selected || !window.confirm(`删除“${selected.name}”？存在引用时会阻断；成功后仍可撤销。`))
      return
    if (dispatch(new DeleteSharedScriptCommand(selectedId))) {
      const next = ids.find((id) => id !== selectedId) ?? ''
      select(next)
    }
  }

  return (
    <>
      <DsCatalogWorkspace
        label="可复用脚本目录"
        className="outliner shared-script-outliner canonical-shared-script-outliner"
        contentClassName="shared-list"
        header={
          <>
            {props.tabBar}
            <DsCatalogControls
              title="可复用脚本"
              count={ids.length}
              unit="项"
              actions={[
                {
                  id: 'create-shared-script',
                  label: '新建可复用脚本',
                  icon: 'add',
                  buttonRef: createButtonRef,
                  onClick: openCreate,
                },
              ]}
              search={{
                'aria-label': '搜索可复用脚本',
                placeholder: '搜索名称或稳定 id…',
                value: filter,
                onChange: (event) => setFilter(event.target.value),
              }}
            />
          </>
        }
      >
          {shown.map((id) => {
            const script = props.state.sharedScripts[id]!
            return (
              <DsCatalogRow
                key={id}
                selected={id === selectedId}
                title={script.name}
                meta={<code>{id}</code>}
                onClick={() => select(id)}
              />
            )
          })}
          {!shown.length ? <div className="insp-empty">没有匹配的可复用脚本</div> : null}
      </DsCatalogWorkspace>

      <div className="canvas-wrap data-body shared-script-main canonical-shared-script-main">
        {selected ? (
          <>
            <DsObjectHero
              eyebrow="可复用脚本"
              title={selected.name}
              objectId={selectedId}
              summary="项目级脚本正文；需要地图语境时，请从真实场景调用位置进入预览。"
              meta={
                <DsTag tone="neutral">
                  {selected.self === 'none'
                    ? '无 self'
                    : selected.self === 'required'
                      ? 'self 必需'
                      : 'self 可选'}
                </DsTag>
              }
              actions={
                <DsButton
                  size="compact"
                  variant="danger"
                  icon="delete"
                  onClick={deleteSelectedScript}
                >
                  删除脚本
                </DsButton>
              }
            />
            <div className="canonical-shared-script-editor-scroll">
              <CanonicalScriptBodyEditor
                label="正文"
                body={selected.body}
                context={{ ...props.context, hasImplicitSelf: selected.self === 'required' }}
                onError={props.onError}
                onChange={updateBody}
                focusCommandPath={
                  props.focusScriptId === selectedId ? props.focusCommandPath : undefined
                }
                focusRevision={props.focusScriptId === selectedId ? props.focusRevision : undefined}
              />
            </div>
          </>
        ) : (
          <div className="insp-empty">新建一个可复用脚本</div>
        )}
      </div>

      <aside className="inspector shared-script-inspector canonical-shared-script-inspector">
        {selected ? (
          <div className="section shared-meta">
            <h4>作者元数据</h4>
            <DsField label="显示名" className="v-field">
              {(field) => (
                <DsDraftTextInput
                  {...field}
                  name="shared-script-display-name"
                  autoComplete="off"
                  draftKey={`shared-script:${selectedId}:name`}
                  syncToken={props.session.getHistoryVersion()}
                  value={selected.name}
                  validate={(value) => (value.trim() ? undefined : '显示名不能为空。')}
                  onCommit={(value) => {
                    const name = value.trim()
                    if (name !== selected.name) updateMetadata({ name })
                  }}
                />
              )}
            </DsField>
            <DsField label="说明" className="v-field">
              {(field) => (
                <DsDraftTextArea
                  {...field}
                  draftKey={`shared-script:${selectedId}:description`}
                  syncToken={props.session.getHistoryVersion()}
                  value={selected.description ?? ''}
                  onCommit={(description) =>
                    updateMetadata({ description: description || undefined })
                  }
                />
              )}
            </DsField>
            <DsField label="self 契约" className="v-field">
              {(field) => (
                <DsSelect
                  {...field}
                  aria-label="self 契约"
                  value={selected.self}
                  options={[
                    { value: 'none', label: '不使用' },
                    { value: 'optional', label: '可选' },
                    { value: 'required', label: '必须提供' },
                  ]}
                  onValueChange={(value) =>
                    updateMetadata({ self: value as AuthorSharedScript['self'] })
                  }
                />
              )}
            </DsField>
            <p className="hint">
              stable ScriptId 创建后保持不变；调用方只保存这个 id，显示名可随时修改。
            </p>
          </div>
        ) : (
          <div className="insp-empty">没有选中的共享脚本</div>
        )}
      </aside>

      {createOpen ? (
        <CanonicalScriptDialog
          title="新建可复用脚本"
          className="canonical-shared-script-create-dialog"
          onClose={closeCreate}
          footer={
            <>
              <DsButton onClick={closeCreate}>取消</DsButton>
              <DsButton type="submit" variant="primary" form={createFormId}>
                创建脚本
              </DsButton>
            </>
          }
        >
          <form
            id={createFormId}
            className="canonical-shared-script-create-form"
            onSubmit={(event) => {
              event.preventDefault()
              createScript()
            }}
          >
            <label className="v-field" htmlFor={createNameId}>
              <span className="lb">脚本名称</span>
              <DsTextInput
                ref={createNameInputRef}
                id={createNameId}
                name="shared-script-name"
                autoComplete="off"
                placeholder="例如：打开藏宝箱…"
                aria-describedby={createError ? createErrorId : undefined}
                aria-invalid={Boolean(createError && !newName.trim())}
                value={newName}
                onChange={(event) => {
                  const value = event.target.value
                  setNewName(value)
                  setCreateError('')
                  if (!newIdEdited) setNewId(value.trim() ? nextScriptId(value, props.state) : '')
                }}
              />
            </label>
            <div className="v-field">
              <span className="canonical-shared-script-create-label">
                <label className="lb" htmlFor={createScriptId}>
                  稳定 ID
                </label>
                <DsHelpTip label="稳定 ID">
                  用于其他脚本引用，创建后保持不变。通常保留自动生成的值即可。
                </DsHelpTip>
              </span>
              <DsTextInput
                ref={createScriptIdInputRef}
                id={createScriptId}
                monospace
                name="shared-script-id"
                autoComplete="off"
                spellCheck={false}
                translate="no"
                placeholder="shared/user/open-chest…"
                aria-describedby={createError ? createErrorId : undefined}
                aria-invalid={Boolean(createError && newName.trim())}
                value={newId}
                onChange={(event) => {
                  setNewId(event.target.value)
                  setNewIdEdited(Boolean(event.target.value))
                  setCreateError('')
                }}
              />
            </div>
            {createError ? (
              <p id={createErrorId} className="cf-err" role="alert">
                {createError}
              </p>
            ) : null}
          </form>
        </CanonicalScriptDialog>
      ) : null}
    </>
  )
}
