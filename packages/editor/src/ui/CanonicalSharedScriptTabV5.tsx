import type { MapIndexV1, ScriptFlowV5, ScriptStage, SharedAuthorScriptV5 } from '@type-pal/content'
import type { ProjectMap, TilesetDef } from '@type-pal/reforge'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Playback } from '../core/playback.js'
import {
  AddSharedScriptV5Command,
  DeleteSharedScriptV5Command,
  type ScriptEditorStateV5,
  type ScriptV5EditSession,
  UpdateSharedScriptV5Command,
} from '../core/script-v5-editor.js'
import {
  CanonicalHelpTipV5,
  CanonicalScriptBodyEditorV5,
  CanonicalScriptDialogV5,
  type CanonicalScriptEditorContextV5,
} from './CanonicalScriptEditorV5.js'
import { PreviewCanvas } from './PreviewCanvas.js'

const EMPTY_STAGES: readonly ScriptStage[] = []

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
  const pairedScenes = useMemo(
    () =>
      props.context.shellScenes.flatMap((shell) => {
        const canonical = props.state.scenes.find((candidate) => candidate.id === shell.id)
        return canonical ? [{ shell, canonical }] : []
      }),
    [props.context.shellScenes, props.state.scenes],
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
  const [testSceneId, setTestSceneId] = useState(pairedScenes[0]?.shell.id ?? '')
  const [testEntityId, setTestEntityId] = useState('')
  const previewScene =
    pairedScenes.find((candidate) => candidate.shell.id === testSceneId) ?? pairedScenes[0]
  const previewFlow = useMemo<ScriptFlowV5 | undefined>(
    () =>
      selected
        ? {
            kind: 'stages',
            initial: 'preview',
            stages: [
              {
                id: 'preview',
                body: [{ kind: 'callScript', script: selectedId }],
              },
            ],
          }
        : undefined,
    [selected, selectedId],
  )
  const previewSourceKey = previewScene
    ? `canonical:shared:${selectedId}:${previewScene.shell.id}:${testEntityId || 'none'}`
    : `canonical:shared:${selectedId}:none:none`
  const playback = useMemo(
    () =>
      previewScene
        ? new Playback(
            previewScene.shell,
            undefined,
            new Map(props.state.items.map((item) => [item.id, item.name])),
          )
        : undefined,
    [previewScene, props.state.items],
  )
  const [, setUiTick] = useState(0)
  const [nameDraft, setNameDraft] = useState(selected?.name ?? '')
  const shown = ids.filter((id) => {
    const script = props.state.sharedScripts[id]
    const needle = filter.trim().toLowerCase()
    return (
      !needle || id.toLowerCase().includes(needle) || script?.name.toLowerCase().includes(needle)
    )
  })
  const previewEntities = useMemo(
    () =>
      previewScene?.shell.entities.filter((entity) =>
        previewScene.canonical.entities.some((candidate) => candidate.id === entity.id),
      ) ?? [],
    [previewScene],
  )
  const previewSelfReady = selected?.self !== 'required' || Boolean(testEntityId)
  const previewReady = Boolean(
    selected &&
      previewScene &&
      previewFlow &&
      playback &&
      props.context.assetBase &&
      previewSelfReady,
  )

  useEffect(() => {
    if (props.focusScriptId && props.state.sharedScripts[props.focusScriptId]) {
      setSelectedId(props.focusScriptId)
      return
    }
    if (!selectedId || !props.state.sharedScripts[selectedId]) setSelectedId(ids[0] ?? '')
  }, [ids, props.focusScriptId, props.state.sharedScripts, selectedId])

  useEffect(() => setNameDraft(selected?.name ?? ''), [selected?.name])

  useEffect(() => {
    if (!pairedScenes.length) {
      setTestSceneId('')
      return
    }
    if (!pairedScenes.some((candidate) => candidate.shell.id === testSceneId))
      setTestSceneId(pairedScenes[0]!.shell.id)
  }, [pairedScenes, testSceneId])

  useEffect(() => {
    if (!previewScene || selected?.self === 'none') {
      setTestEntityId('')
      return
    }
    if (testEntityId && previewEntities.some((candidate) => candidate.id === testEntityId)) return
    setTestEntityId(selected?.self === 'required' ? (previewEntities[0]?.id ?? '') : '')
  }, [previewEntities, previewScene, selected?.self, testEntityId])

  useEffect(() => {
    if (!playback) return
    playback.onUi = () => setUiTick((value) => value + 1)
    return () => playback.stop()
  }, [playback])

  useEffect(() => {
    void previewSourceKey
    void selected?.body
    void selected?.self
    void props.state.sharedScripts
    playback?.stop()
  }, [playback, previewSourceKey, props.state.sharedScripts, selected?.body, selected?.self])

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

  const dispatch = (
    command: Parameters<ScriptV5EditSession['dispatch']>[0],
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

  const update = (patch: Partial<SharedAuthorScriptV5>): void => {
    if (selectedId) dispatch(new UpdateSharedScriptV5Command(selectedId, patch))
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
      createNameInputRef.current?.focus()
      return
    }
    const id = newId.trim() || nextScriptId(name, props.state)
    setCreateError('')
    if (
      dispatch(
        new AddSharedScriptV5Command(id, {
          name,
          self: 'none',
          body: [],
        }),
        (message) => {
          setCreateError(message)
          createScriptIdInputRef.current?.focus()
        },
      )
    ) {
      closeCreate()
      select(id)
    }
  }

  return (
    <>
      <div className="outliner shared-script-outliner canonical-shared-script-outliner">
        {props.tabBar}
        <div className="pane-h">
          <span className="t">可复用脚本</span>
          <span className="count">{ids.length}</span>
          <span className="spacer" />
          <button
            ref={createButtonRef}
            type="button"
            className="mini"
            aria-label="新建可复用脚本"
            title="新建可复用脚本"
            onClick={openCreate}
          >
            ＋
          </button>
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
                  ? '不需要调用实体'
                  : selected.self === 'required'
                    ? '必须提供调用实体'
                    : '可选调用实体'}
              </span>
            </div>
            {pairedScenes.length ? (
              <div className="canonical-shared-preview-toolbar">
                <label className="shared-scene-context">
                  <span>预览场景</span>
                  <select
                    className="in"
                    value={previewScene?.shell.id ?? ''}
                    onChange={(event) => {
                      setTestSceneId(event.target.value)
                      setTestEntityId('')
                    }}
                  >
                    {pairedScenes.map(({ shell }) => (
                      <option key={shell.id} value={shell.id}>
                        {shell.id}
                      </option>
                    ))}
                  </select>
                </label>
                {selected.self !== 'none' && previewScene ? (
                  <label className="shared-scene-context entity">
                    <span>调用实体</span>
                    <select
                      className="in"
                      value={testEntityId}
                      onChange={(event) => setTestEntityId(event.target.value)}
                    >
                      {selected.self === 'optional' ? <option value="">不指定</option> : null}
                      {previewEntities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.id}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <span className="spacer" />
                <CanonicalHelpTipV5 label="共享脚本预览">
                  预览直接运行当前 V5
                  脚本，不会写回工程。脚本若依赖当前场景或调用实体，可在这里切换测试上下文。
                </CanonicalHelpTipV5>
              </div>
            ) : (
              <div className="shared-context-callout">
                当前工程没有同时存在于场景数据与脚本数据中的场景，暂时不能预览。
              </div>
            )}
            {previewScene && selected.self === 'required' && !testEntityId ? (
              <div className="shared-context-callout">
                这个脚本要求调用实体；当前测试场景没有可用实体，无法开始预览。
              </div>
            ) : null}
            {previewReady && previewScene && previewFlow && playback && props.context.assetBase ? (
              <div className="shared-preview canonical-shared-preview">
                <PreviewCanvas
                  scene={previewScene.shell}
                  stages={EMPTY_STAGES}
                  sourceKey={previewSourceKey}
                  projectId={props.projectId}
                  focusEntityId={testEntityId || undefined}
                  sprites={[...(props.context.sprites ?? [])]}
                  actorsById={props.context.actors ?? {}}
                  leaderSpriteId={props.leaderSpriteId}
                  assetBase={props.context.assetBase}
                  assetCatalog={props.context.assetCatalog}
                  assetReader={props.context.assetReader}
                  projectMaps={props.projectMaps}
                  mapIndex={props.mapIndex}
                  tilesets={props.tilesets}
                  locale={props.context.locale}
                  playback={playback}
                  canonicalFlow={previewFlow}
                  canonicalSharedScripts={props.state.sharedScripts}
                  startPlayback={(paused) =>
                    playback.playCanonical(previewSourceKey, previewFlow, {
                      scene: previewScene.canonical,
                      sharedScripts: props.state.sharedScripts,
                      ...(selected.self !== 'none' && testEntityId
                        ? {
                            self: {
                              scene: previewScene.shell.id,
                              entity: testEntityId,
                            },
                            ownerId: testEntityId,
                          }
                        : {}),
                      timing: 'interactive',
                      paused,
                    })
                  }
                  sceneFraming={!testEntityId}
                />
              </div>
            ) : null}
            <CanonicalScriptBodyEditorV5
              label={`${selected.name} · 正文`}
              body={selected.body}
              context={{ ...props.context, hasImplicitSelf: selected.self === 'required' }}
              onError={props.onError}
              onChange={(body) => update({ body })}
              focusCommandPath={
                props.focusScriptId === selectedId ? props.focusCommandPath : undefined
              }
              focusRevision={props.focusScriptId === selectedId ? props.focusRevision : undefined}
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

      {createOpen ? (
        <CanonicalScriptDialogV5
          title="新建可复用脚本"
          className="canonical-shared-script-create-dialog"
          onClose={closeCreate}
          footer={
            <>
              <button type="button" className="btn" onClick={closeCreate}>
                取消
              </button>
              <button type="submit" className="btn primary" form={createFormId}>
                创建脚本
              </button>
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
              <input
                ref={createNameInputRef}
                id={createNameId}
                className="in"
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
                <CanonicalHelpTipV5 label="稳定 ID">
                  用于其他脚本引用，创建后保持不变。通常保留自动生成的值即可。
                </CanonicalHelpTipV5>
              </span>
              <input
                ref={createScriptIdInputRef}
                id={createScriptId}
                className="in mono"
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
        </CanonicalScriptDialogV5>
      ) : null}
    </>
  )
}
