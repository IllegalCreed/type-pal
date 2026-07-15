import {
  type ActorDef,
  type AssetCatalogV1,
  type Command,
  getScriptBody,
  type Locale,
  type MapIndexV1,
  type SceneDef,
  type ScriptChunkV1,
  type ScriptIndexV1,
  type ScriptStage,
  type SharedScriptMetaV1,
  type SpriteDef,
} from '@type-pal/content'
import {
  type AssetBase,
  type AudioAssetReader,
  MemoryScriptResolver,
  type ProjectMapV2,
  type TilesetDef,
} from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DeleteAuthoredScriptCommand,
  UpdateScriptBodyCommand,
  UpsertAuthoredScriptCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { Playback } from '../core/playback.js'
import {
  getCommandAt,
  insertAfterAt,
  insertAtHead,
  moveAt,
  parsePath,
  removeAt,
  updateCommandAt,
} from '../core/script-edit.js'
import { buildScriptReferenceIndex, type ScriptReferenceEntry } from '../core/script-references.js'
import { createAuthoredScriptCall, createAuthoredScriptId } from '../core/shared-script.js'
import { CommandForm } from './CommandForm.js'
import { PreviewCanvas } from './PreviewCanvas.js'
import { type RowAction, ScriptTree } from './ScriptTree.js'

const EMPTY_BODY: readonly Command[] = []
const EMPTY_LIBRARY: Record<string, SharedScriptMetaV1> = {}

const BASE_INSERTS: { label: string; make: () => Command }[] = [
  {
    label: '💬 对话',
    make: () => ({ kind: 'dialog', cue: { rows: [{ text: '(新对话)' }] } }),
  },
  { label: '⏱ 等待', make: () => ({ kind: 'wait', ms: 200 }) },
  { label: '🚩 设开关', make: () => ({ kind: 'setFlag', flag: 'my-flag', value: true }) },
  { label: '🔢 设数值', make: () => ({ kind: 'setVar', var: 'my-var', value: 1 }) },
  { label: '🎁 给物品', make: () => ({ kind: 'giveItem', itemId: '0' }) },
]

function commandScriptTargetId(command: Command | undefined): string | undefined {
  if (!command) return undefined
  if (command.kind === 'callScript' || command.kind === 'jumpScript') return command.ref.id
  if (
    command.kind === 'setEntityAuto' ||
    command.kind === 'setEntityTrigger' ||
    command.kind === 'setSceneOnEnter' ||
    command.kind === 'setSceneOnTeleport'
  )
    return command.script?.id
  return undefined
}

function sourceLabel(entry: ScriptReferenceEntry): string {
  return `${entry.caller.label}${entry.path || '/'} · ${entry.kind}`
}

function referenceKey(entry: ScriptReferenceEntry): string {
  const caller =
    entry.caller.type === 'script'
      ? `script:${entry.caller.scriptId}`
      : entry.caller.type === 'scene'
        ? `scene:${entry.caller.sceneId}:${entry.caller.sourceKey}`
        : `global:${entry.caller.sourceKey}`
  return `${caller}:${entry.path}:${entry.kind}:${entry.target.id}`
}

export function SharedScriptTab(props: {
  tabBar: React.ReactNode
  session: EditSession
  scriptIndex?: ScriptIndexV1
  scriptChunks: Record<string, ScriptChunkV1>
  scenes: SceneDef[]
  locale: Locale
  sprites: SpriteDef[]
  actors: ActorDef[]
  assetBase: AssetBase
  assetCatalog: AssetCatalogV1
  audioResolver: AudioAssetReader
  projectMaps: Record<string, ProjectMapV2>
  mapIndex: MapIndexV1
  tilesets: readonly TilesetDef[]
  tilesetBlobs: Record<string, ArrayBuffer>
  projectId: string
  focusScriptId?: string
  focusScriptRevision?: number
  onJumpToEvent: (sceneId: string, sourceKey: string) => void
  onSelectedScriptId?: (id: string | undefined) => void
}) {
  const {
    tabBar,
    session,
    scriptIndex,
    scriptChunks,
    scenes,
    locale,
    sprites,
    actors,
    assetBase,
    assetCatalog,
    audioResolver,
    projectMaps,
    mapIndex,
    tilesets,
    tilesetBlobs,
    projectId,
    focusScriptId,
    focusScriptRevision,
    onJumpToEvent,
    onSelectedScriptId,
  } = props
  const library = scriptIndex?.library ?? EMPTY_LIBRARY
  const authoredIds = useMemo(() => Object.keys(library).sort(), [library])
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState(
    focusScriptId && library[focusScriptId] ? focusScriptId : (authoredIds[0] ?? ''),
  )
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [insertFor, setInsertFor] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [references, setReferences] = useState<ScriptReferenceEntry[] | null>(null)
  const [diagnosticWarnings, setDiagnosticWarnings] = useState<string[]>([])
  const [testSceneId, setTestSceneId] = useState(scenes[0]?.id ?? '')
  const [testEntityId, setTestEntityId] = useState('')
  const selectScript = (id: string): void => {
    setSelectedId(id)
    onSelectedScriptId?.(id || undefined)
  }

  useEffect(() => {
    if (focusScriptRevision == null) return
    if (focusScriptId && library[focusScriptId]) setSelectedId(focusScriptId)
  }, [focusScriptId, focusScriptRevision, library])
  useEffect(() => {
    if (selectedId && library[selectedId]) return
    setSelectedId(authoredIds[0] ?? '')
  }, [authoredIds, library, selectedId])
  // biome-ignore lint/correctness/useExhaustiveDependencies: 选中稳定 id 改变时必须清空对应的临时面板状态。
  useEffect(() => {
    setSelectedPath(null)
    setInsertFor(null)
    setReferences(null)
    setDiagnosticWarnings([])
    setMessage('')
  }, [selectedId])

  const shownIds = authoredIds.filter((id) => {
    const meta = library[id]
    if (!meta) return false
    const needle = filter.trim().toLowerCase()
    return !needle || id.toLowerCase().includes(needle) || meta.name.toLowerCase().includes(needle)
  })
  const meta = library[selectedId]
  const body = scriptIndex
    ? (getScriptBody(scriptIndex, scriptChunks, selectedId) ?? EMPTY_BODY)
    : EMPTY_BODY
  const stages = useMemo<ScriptStage[]>(() => [{ body: [...body] }], [body])
  const selectedCommand = selectedPath ? getCommandAt(stages, parsePath(selectedPath)) : undefined
  const selectedTargetId = commandScriptTargetId(selectedCommand)
  const actorsById = useMemo(
    () => Object.fromEntries(actors.map((actor) => [actor.id, actor])) as Record<string, ActorDef>,
    [actors],
  )
  const leaderSpriteId = actorsById[session.getState().manifest.startWorld.party[0] ?? '']?.spriteId
  const testScene = scenes.find((scene) => scene.id === testSceneId) ?? scenes[0]

  useEffect(() => {
    if (!testScene) return
    if (testEntityId && testScene.entities.some((entity) => entity.id === testEntityId)) return
    setTestEntityId(testScene.entities[0]?.id ?? '')
  }, [testEntityId, testScene])
  useEffect(() => {
    if (meta?.self !== 'required' || testScene?.entities.length) return
    const usable = scenes.find((scene) => scene.entities.length)
    if (usable) setTestSceneId(usable.id)
  }, [meta?.self, scenes, testScene])

  const playback = useMemo(() => {
    if (!testScene) return null
    const resolver = scriptIndex ? new MemoryScriptResolver(scriptIndex, scriptChunks) : undefined
    return new Playback(testScene, resolver)
  }, [scriptChunks, scriptIndex, testScene])
  const previousPlayback = useRef<Playback | null>(null)
  const [, setUiTick] = useState(0)
  useEffect(() => {
    previousPlayback.current?.stop()
    previousPlayback.current = playback
    if (playback) playback.onUi = () => setUiTick((tick) => tick + 1)
    return () => playback?.stop()
  }, [playback])

  const dispatchBody = (nextStages: readonly ScriptStage[]): void => {
    if (!selectedId) return
    session.dispatch(new UpdateScriptBodyCommand(selectedId, nextStages[0]?.body ?? []))
  }
  const insertCommands = (commands: readonly Command[]): void => {
    if (!insertFor || !selectedId) return
    let next = stages
    let at = parsePath(insertFor)
    for (const command of commands) {
      const last = at[at.length - 1] as number
      if (last === -1) {
        next = insertAtHead(next, at[0] as number, command)
        at = [at[0] as number, 0]
      } else {
        next = insertAfterAt(next, at, command)
        at = [...at.slice(0, -1), last + 1]
      }
    }
    dispatchBody(next)
    setSelectedPath(at.join('/'))
    setInsertFor(null)
  }
  const onRowAction = (path: string, action: RowAction): void => {
    if (action === 'insert') {
      setInsertFor(path)
      return
    }
    const parsed = parsePath(path)
    const next =
      action === 'remove'
        ? removeAt(stages, parsed)
        : moveAt(stages, parsed, action === 'up' ? -1 : 1)
    if (next === stages) return
    dispatchBody(next)
    setSelectedPath(null)
  }
  const openReferences = (): void => {
    const diagnostics = buildScriptReferenceIndex(session.getState())
    setReferences(diagnostics.references.get(selectedId) ?? [])
    setDiagnosticWarnings(diagnostics.warnings.filter((warning) => warning.includes(selectedId)))
    if (diagnostics.errors.length) setMessage(`工程另有 ${diagnostics.errors.length} 个脚本错误`)
  }
  const createScript = (source?: { meta: SharedScriptMetaV1; body: readonly Command[] }): void => {
    const name = source ? `${source.meta.name} 副本` : '新共享脚本'
    const id = createAuthoredScriptId(name, Object.keys(library))
    session.dispatch(
      new UpsertAuthoredScriptCommand(
        id,
        source ? { ...source.meta, name } : { name, self: 'none' },
        source?.body ?? [],
      ),
    )
    selectScript(id)
  }
  const updateMeta = (patch: Partial<SharedScriptMetaV1>): void => {
    if (!meta || !selectedId) return
    const next = { ...meta, ...patch }
    if (!next.name.trim()) {
      setMessage('显示名不能为空')
      return
    }
    session.dispatch(new UpsertAuthoredScriptCommand(selectedId, next, body))
  }

  return (
    <>
      <div className="outliner data-outliner shared-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">共享脚本</span>
          <span className="spacer" />
          <button
            type="button"
            className="mini"
            title="新建共享脚本"
            onClick={() => createScript()}
          >
            ＋
          </button>
        </div>
        <input
          className="in"
          placeholder="搜索名称或 id…"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <div className="sprite-list">
          {shownIds.map((id) => (
            <button
              type="button"
              key={id}
              className={`arow${selectedId === id ? ' sel' : ''}`}
              onClick={() => selectScript(id)}
            >
              <span className="face shared-script-icon">↪</span>
              <span className="nm">
                {library[id]?.name ?? id}
                <small>{id.slice('shared/user/'.length)}</small>
              </span>
            </button>
          ))}
          {!shownIds.length ? <div className="insp-empty">没有匹配的作者脚本</div> : null}
        </div>
      </div>

      <div className="canvas-wrap data-body shared-script-main">
        {selectedId && testScene && playback ? (
          <>
            <div className="shared-context toolbar">
              <span className="t">测试上下文</span>
              <select
                className="in"
                value={testScene.id}
                onChange={(event) => setTestSceneId(event.target.value)}
              >
                {scenes.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.id}
                  </option>
                ))}
              </select>
              {meta?.self !== 'none' ? (
                <select
                  className="in"
                  value={testEntityId}
                  onChange={(event) => setTestEntityId(event.target.value)}
                >
                  <option value="">不指定 self</option>
                  {testScene.entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.id}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <div className="shared-preview">
              <PreviewCanvas
                scene={testScene}
                stages={stages}
                sourceKey={`shared:${selectedId}`}
                projectId={projectId}
                focusEntityId={meta?.self === 'none' ? undefined : testEntityId || undefined}
                sprites={sprites}
                actorsById={actorsById}
                leaderSpriteId={leaderSpriteId}
                assetBase={assetBase}
                projectMaps={projectMaps}
                mapIndex={mapIndex}
                tilesets={tilesets}
                tilesetBlobs={tilesetBlobs}
                locale={locale}
                playback={playback}
                sceneFraming={!testEntityId}
              />
            </div>
            <div className="shared-edit-row">
              <div className="shared-tree">
                <ScriptTree
                  stages={stages}
                  locale={locale}
                  scriptIndex={scriptIndex}
                  scenes={scenes}
                  activePath={playback.activePath ?? null}
                  selectedPath={selectedPath}
                  onSelect={(path) => {
                    setSelectedPath(path)
                    setInsertFor(null)
                  }}
                  onRowAction={onRowAction}
                />
              </div>
              <div className="shared-command-form">
                {insertFor ? (
                  <div className="section">
                    <h4>插入指令</h4>
                    <div className="cf-insert">
                      {BASE_INSERTS.map((entry) => (
                        <button
                          type="button"
                          className="pv-btn"
                          key={entry.label}
                          onClick={() => insertCommands([entry.make()])}
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>
                    {authoredIds.filter((id) => id !== selectedId).length ? (
                      <>
                        <div className="cf-group">调用共享脚本</div>
                        <div className="cf-insert">
                          {authoredIds
                            .filter((id) => id !== selectedId)
                            .map((id) => (
                              <button
                                type="button"
                                className="pv-btn"
                                key={id}
                                onClick={() => {
                                  if (!scriptIndex) return
                                  insertCommands([createAuthoredScriptCall(scriptIndex, id)])
                                }}
                              >
                                ↪ {library[id]?.name ?? id}
                              </button>
                            ))}
                        </div>
                      </>
                    ) : null}
                    <button type="button" className="pv-btn" onClick={() => setInsertFor(null)}>
                      取消
                    </button>
                  </div>
                ) : selectedCommand && selectedPath ? (
                  <div className="section">
                    <h4>
                      编辑指令 <span className="cf-path">{selectedPath}</span>
                    </h4>
                    <CommandForm
                      cmd={selectedCommand}
                      scene={testScene}
                      locale={locale}
                      assetCatalog={assetCatalog}
                      audioResolver={audioResolver}
                      scenes={scenes}
                      assetBase={assetBase}
                      actors={actorsById}
                      ambiences={session.getState().ambiences ?? []}
                      shops={session.getState().shops ?? []}
                      scriptIndex={scriptIndex}
                      hasImplicitSelf={meta?.self === 'required'}
                      onOpenScript={
                        selectedTargetId && library[selectedTargetId] ? selectScript : undefined
                      }
                      onChange={(next) => {
                        const out = updateCommandAt(stages, parsePath(selectedPath), next)
                        if (out !== stages) dispatchBody(out)
                      }}
                    />
                  </div>
                ) : (
                  <div className="insp-empty">选择一条指令进行编辑</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="insp-empty">新建共享脚本后即可编辑和预览</div>
        )}
      </div>

      <div className="inspector shared-script-inspector">
        {selectedId ? (
          <>
            <div className="insp-head">
              <div className="who">
                <strong>{meta?.name ?? '共享脚本'}</strong>
                <code>{selectedId}</code>
              </div>
            </div>
            {meta ? (
              <div className="section shared-meta">
                <h4>作者元数据</h4>
                <label className="v-field">
                  <span className="lb">显示名</span>
                  <input
                    className="in"
                    defaultValue={meta.name}
                    key={`${selectedId}:name:${meta.name}`}
                    onBlur={(event) => updateMeta({ name: event.target.value.trim() })}
                  />
                </label>
                <label className="v-field">
                  <span className="lb">说明</span>
                  <textarea
                    className="in cf-ta"
                    defaultValue={meta.description ?? ''}
                    key={`${selectedId}:desc:${meta.description ?? ''}`}
                    onBlur={(event) =>
                      updateMeta({ description: event.target.value.trim() || undefined })
                    }
                  />
                </label>
                <label className="v-field">
                  <span className="lb">self 契约</span>
                  <select
                    className="in"
                    value={meta.self}
                    onChange={(event) =>
                      updateMeta({ self: event.target.value as SharedScriptMetaV1['self'] })
                    }
                  >
                    <option value="none">不使用</option>
                    <option value="optional">可选</option>
                    <option value="required">必须提供</option>
                  </select>
                </label>
                <div className="shared-actions">
                  <button
                    type="button"
                    className="mini-txt"
                    title="复制共享脚本"
                    onClick={() => createScript({ meta, body })}
                  >
                    ⧉ 复制
                  </button>
                  <button
                    type="button"
                    className="mini-txt danger"
                    title="删除共享脚本"
                    onClick={() => {
                      try {
                        session.dispatch(new DeleteAuthoredScriptCommand(selectedId))
                        selectScript('')
                      } catch (error) {
                        setMessage(error instanceof Error ? error.message : String(error))
                        openReferences()
                      }
                    }}
                  >
                    🗑 删除
                  </button>
                </div>
              </div>
            ) : null}
            <div className="section">
              <h4>引用</h4>
              <button type="button" className="mini-txt" onClick={openReferences}>
                ↻ 刷新引用
              </button>
              {references?.length === 0 ? <p className="hint">没有直接调用方</p> : null}
              {references?.map((entry) => (
                <button
                  type="button"
                  className="shared-ref"
                  key={referenceKey(entry)}
                  disabled={
                    entry.caller.type === 'global' ||
                    (entry.caller.type === 'script' && !library[entry.caller.scriptId])
                  }
                  onClick={() => {
                    if (entry.caller.type === 'script') {
                      if (library[entry.caller.scriptId]) selectScript(entry.caller.scriptId)
                      return
                    }
                    if (entry.caller.type === 'scene')
                      onJumpToEvent(entry.caller.sceneId, entry.caller.sourceKey)
                  }}
                >
                  {sourceLabel(entry)}
                </button>
              ))}
              {diagnosticWarnings.map((warning) => (
                <p className="cf-err" key={warning}>
                  {warning}
                </p>
              ))}
            </div>
            {message ? (
              <div className="section">
                <p className="cf-err">{message}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="insp-empty">选择或新建共享脚本</div>
        )}
      </div>
    </>
  )
}
