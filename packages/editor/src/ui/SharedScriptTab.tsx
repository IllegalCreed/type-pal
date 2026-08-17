import {
  type ActorDef,
  type AssetCatalogV1,
  type BattleSpriteDef,
  type Command,
  type DialogueCueV14,
  getScriptBody,
  type Locale,
  type MapIndexV1,
  type SceneDef,
  type ScriptChunkV1,
  type ScriptIndexV1,
  type ScriptStage,
  type SharedScriptMetaV1,
  type SpriteDef,
  upgradeDialogueTreeV13ToV14,
} from '@type-pal/content'
import {
  type AssetBase,
  type AudioAssetReader,
  MemoryScriptResolver,
  type ProjectMap,
  type TilesetDef,
} from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CompositeCommand,
  DeleteAuthoredScriptCommand,
  UpdateLocaleCommand,
  UpdateScriptBodyCommand,
  UpsertAuthoredScriptCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { Playback } from '../core/playback.js'
import { analyzeScriptContext } from '../core/script-context.js'
import {
  getCommandAt,
  insertAfterAt,
  insertAtHead,
  moveAt,
  parsePath,
  removeAt,
  updateCommandAt,
} from '../core/script-edit.js'
import {
  buildInternalScriptCatalog,
  type InternalScriptCatalogEntry,
} from '../core/script-library-catalog.js'
import { createScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { buildScriptReferenceIndex, type ScriptReferenceEntry } from '../core/script-references.js'
import { createAuthoredScriptCall, createAuthoredScriptId } from '../core/shared-script.js'
import { defaultActionTargetForEntity } from '../core/sprite-actions.js'
import { CommandForm } from './CommandForm.js'
import { DsListHeader } from './design-system/index.js'
import { PreviewCanvas } from './PreviewCanvas.js'
import { type RowAction, ScriptTree } from './ScriptTree.js'
import { soundAssets } from './SoundPicker.js'

const EMPTY_BODY: readonly Command[] = []
const EMPTY_LIBRARY: Record<string, SharedScriptMetaV1> = {}

const BASE_INSERTS: {
  label: string
  requiresItem?: boolean
  make: (defaultItemId?: string) => Command
}[] = [
  {
    label: '💬 对话',
    make: () => ({ kind: 'dialog', cue: { rows: [{ text: '(新对话)' }] } }),
  },
  { label: '⏱ 等待', make: () => ({ kind: 'wait', ms: 200 }) },
  { label: '🚩 设开关', make: () => ({ kind: 'setFlag', flag: 'my-flag', value: true }) },
  { label: '🔢 设数值', make: () => ({ kind: 'setVar', var: 'my-var', value: 1 }) },
  {
    label: '🎁 获得物品',
    requiresItem: true,
    make: (defaultItemId) => ({ kind: 'giveItem', itemId: defaultItemId! }),
  },
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

export function resolveSharedScriptEditingId(
  internalTrail: readonly string[],
  selectedInternalId: string,
  selectedAuthoredId: string,
): string {
  return internalTrail.at(-1) || selectedInternalId || selectedAuthoredId
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
  battleSprites: readonly BattleSpriteDef[]
  assetBase: AssetBase
  assetCatalog: AssetCatalogV1
  audioResolver: AudioAssetReader
  assetReader: EditorAssetReader
  projectMaps: Record<string, ProjectMap>
  mapIndex: MapIndexV1
  tilesets: readonly TilesetDef[]
  projectId: string
  focusScriptId?: string
  focusScriptRevision?: number
  focusCommandPath?: string
  onJumpToEvent: (sceneId: string, sourceKey: string) => void
  onSelectedScriptId?: (id: string | undefined) => void
  onOpenSound?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  onOpenSpriteAction?: (spriteId: string, actionId: string) => void
  /** canonical v5 工程不向作者暴露 legacy 分片/迁移内部实现。 */
  showMigrationInternals?: boolean
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
    assetReader,
    projectMaps,
    mapIndex,
    tilesets,
    projectId,
    focusScriptId,
    focusCommandPath,
    onOpenSound,
    onOpenImage,
    focusScriptRevision,
    onJumpToEvent,
    onSelectedScriptId,
    showMigrationInternals = true,
  } = props
  const editorState = session.getState()
  const items = editorState.items
  const scriptReferences = useMemo(
    () =>
      createScriptReferenceCatalog({
        locale,
        items,
        skills: editorState.skills,
        actors,
        sprites,
        battleSprites: props.battleSprites,
        ambiences: editorState.ambiences ?? [],
        mapIndex,
        assetCatalog,
        scriptIndex,
      }),
    [
      actors,
      assetCatalog,
      editorState.ambiences,
      editorState.skills,
      items,
      locale,
      mapIndex,
      props.battleSprites,
      scriptIndex,
      sprites,
    ],
  )
  const library = scriptIndex?.library ?? EMPTY_LIBRARY
  const authoredIds = useMemo(() => Object.keys(library).sort(), [library])
  const internalCatalog = useMemo(
    () => (showMigrationInternals ? buildInternalScriptCatalog(scriptChunks, library) : []),
    [library, scriptChunks, showMigrationInternals],
  )
  const internalById = useMemo(
    () =>
      Object.fromEntries(internalCatalog.map((entry) => [entry.id, entry])) as Record<
        string,
        InternalScriptCatalogEntry
      >,
    [internalCatalog],
  )
  const [catalogMode, setCatalogMode] = useState<'authored' | 'internal'>('authored')
  const [filter, setFilter] = useState('')
  const initialSelectedId =
    focusScriptId && library[focusScriptId] ? focusScriptId : (authoredIds[0] ?? '')
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  const [selectedInternalId, setSelectedInternalId] = useState('')
  const [internalTrail, setInternalTrail] = useState<string[]>([])
  const editingScriptId = resolveSharedScriptEditingId(
    internalTrail,
    selectedInternalId,
    selectedId,
  )
  const editingInternalEntry = editingScriptId ? internalById[editingScriptId] : undefined
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const lastAppliedScriptFocusRef = useRef<string | undefined>(undefined)
  const lastAppliedFocusRevisionRef = useRef<number | undefined>(undefined)
  const [insertFor, setInsertFor] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [references, setReferences] = useState<ScriptReferenceEntry[] | null>(null)
  const [diagnosticWarnings, setDiagnosticWarnings] = useState<string[]>([])
  const [testSceneId, setTestSceneId] = useState('')
  const [testEntityId, setTestEntityId] = useState('')
  const selectScript = (id: string): void => {
    setCatalogMode('authored')
    setSelectedId(id)
    setSelectedInternalId('')
    setInternalTrail([])
    onSelectedScriptId?.(id || undefined)
  }
  const selectInternalScript = (id: string): void => {
    if (!showMigrationInternals) return
    setCatalogMode('internal')
    setSelectedInternalId(id)
    setInternalTrail([])
    setSelectedPath(null)
    setInsertFor(null)
  }

  useEffect(() => {
    if (focusScriptRevision == null) return
    if (focusScriptId && library[focusScriptId]) {
      const token = `${focusScriptId}\u0000${focusScriptRevision}\u0000${focusCommandPath ?? ''}`
      if (lastAppliedScriptFocusRef.current === token) return
      lastAppliedScriptFocusRef.current = token
      setCatalogMode('authored')
      setSelectedId(focusScriptId)
      setSelectedInternalId('')
      setInternalTrail([])
      setSelectedPath(null)
      setInsertFor(null)
    }
  }, [focusCommandPath, focusScriptId, focusScriptRevision, library])
  useEffect(() => {
    if (selectedId && library[selectedId]) return
    const id = authoredIds[0] ?? ''
    setSelectedId(id)
    if (!selectedInternalId) onSelectedScriptId?.(id || undefined)
  }, [authoredIds, library, onSelectedScriptId, selectedId, selectedInternalId])
  useEffect(() => {
    if (!selectedInternalId || internalById[selectedInternalId]) return
    setSelectedInternalId(internalCatalog[0]?.id ?? '')
  }, [internalById, internalCatalog, selectedInternalId])
  useEffect(() => {
    if (showMigrationInternals) return
    setCatalogMode('authored')
    setSelectedInternalId('')
    setInternalTrail([])
  }, [showMigrationInternals])
  // biome-ignore lint/correctness/useExhaustiveDependencies: 编辑目标改变时必须清空对应的临时面板状态。
  useEffect(() => {
    setSelectedPath(null)
    setInsertFor(null)
    setReferences(null)
    setDiagnosticWarnings([])
    setMessage('')
  }, [editingScriptId, selectedId])

  const shownIds = authoredIds.filter((id) => {
    const meta = library[id]
    if (!meta) return false
    const needle = filter.trim().toLowerCase()
    return !needle || id.toLowerCase().includes(needle) || meta.name.toLowerCase().includes(needle)
  })
  const shownInternal = internalCatalog.filter((entry) => {
    const needle = filter.trim().toLowerCase()
    return (
      !needle ||
      entry.id.toLowerCase().includes(needle) ||
      entry.title.toLowerCase().includes(needle) ||
      entry.callers.some((caller) => caller.toLowerCase().includes(needle))
    )
  })
  const meta = library[selectedId]
  const rootBody = scriptIndex
    ? (getScriptBody(scriptIndex, scriptChunks, selectedId) ?? EMPTY_BODY)
    : EMPTY_BODY
  const body = scriptIndex
    ? (getScriptBody(scriptIndex, scriptChunks, editingScriptId) ?? EMPTY_BODY)
    : EMPTY_BODY
  const stages = useMemo<ScriptStage[]>(() => [{ body: [...body] }], [body])
  useEffect(() => {
    if (
      focusScriptRevision == null ||
      lastAppliedFocusRevisionRef.current === focusScriptRevision ||
      !focusCommandPath ||
      selectedId !== focusScriptId ||
      !getCommandAt(stages, parsePath(focusCommandPath))
    )
      return
    lastAppliedFocusRevisionRef.current = focusScriptRevision
    setSelectedPath(focusCommandPath)
    setInsertFor(null)
  }, [focusCommandPath, focusScriptId, focusScriptRevision, selectedId, stages])
  const selectedCommand = selectedPath ? getCommandAt(stages, parsePath(selectedPath)) : undefined
  const selectedTargetId = commandScriptTargetId(selectedCommand)
  const actorsById = useMemo(
    () => Object.fromEntries(actors.map((actor) => [actor.id, actor])) as Record<string, ActorDef>,
    [actors],
  )
  const leaderSpriteId = actorsById[editorState.manifest.startWorld.party[0] ?? '']?.spriteId
  const contextRootId = selectedInternalId || selectedId
  const contextAnalysis = useMemo(
    () => analyzeScriptContext(scriptIndex, scriptChunks, contextRootId),
    [contextRootId, scriptChunks, scriptIndex],
  )
  const needsSceneContext =
    contextAnalysis.needsScene || Boolean(!selectedInternalId && meta && meta.self !== 'none')
  const testScene = testSceneId ? scenes.find((scene) => scene.id === testSceneId) : undefined
  const formScene = testScene ?? scenes[0]
  const selectedTestEntity = testScene?.entities.find(
    (entity) => entity.id === (testEntityId || testScene.entities[0]?.id),
  )
  const firstActionTarget = defaultActionTargetForEntity(selectedTestEntity, actorsById, sprites)

  useEffect(() => {
    if (!testScene) return
    if (testEntityId && testScene.entities.some((entity) => entity.id === testEntityId)) return
    setTestEntityId(testScene.entities[0]?.id ?? '')
  }, [testEntityId, testScene])

  const playback = useMemo(() => {
    if (!needsSceneContext || !testScene) return null
    const resolver = scriptIndex ? new MemoryScriptResolver(scriptIndex, scriptChunks) : undefined
    return new Playback(testScene, resolver, new Map(items.map((item) => [item.id, item.name])))
  }, [items, needsSceneContext, scriptChunks, scriptIndex, testScene])
  const previousPlayback = useRef<Playback | null>(null)
  const [, setUiTick] = useState(0)
  useEffect(() => {
    previousPlayback.current?.stop()
    previousPlayback.current = playback
    if (playback) playback.onUi = () => setUiTick((tick) => tick + 1)
    return () => playback?.stop()
  }, [playback])
  // biome-ignore lint/correctness/useExhaustiveDependencies: 钻取目标切换时必须停止仍指向旧脚本的预览。
  useEffect(() => {
    previousPlayback.current?.stop()
  }, [editingScriptId])

  const dispatchBody = (nextStages: readonly ScriptStage[]): void => {
    if (!editingScriptId) return
    session.dispatch(new UpdateScriptBodyCommand(editingScriptId, nextStages[0]?.body ?? []))
  }
  const insertCommands = (commands: readonly Command[]): void => {
    if (!insertFor || !editingScriptId) return
    let next = stages
    let at = parsePath(insertFor)
    const authoredCommands =
      editorState.manifest.contentVersion === 15
        ? (upgradeDialogueTreeV13ToV14(commands) as unknown as readonly Command[])
        : commands
    for (const command of authoredCommands) {
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
  const openReferences = (targetId = editingScriptId): void => {
    if (!targetId) return
    const diagnostics = buildScriptReferenceIndex(session.getState())
    setReferences(diagnostics.references.get(targetId) ?? [])
    setDiagnosticWarnings(diagnostics.warnings.filter((warning) => warning.includes(targetId)))
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
    session.dispatch(new UpsertAuthoredScriptCommand(selectedId, next, rootBody))
  }
  const openScriptTarget = (id: string): void => {
    if (library[id]) {
      selectScript(id)
      return
    }
    if (!showMigrationInternals || !scriptIndex || !getScriptBody(scriptIndex, scriptChunks, id)) {
      setMessage(`脚本目标不存在或尚未载入：${id}`)
      return
    }
    setInternalTrail((current) => {
      const existing = current.indexOf(id)
      return existing >= 0 ? current.slice(0, existing + 1) : [...current, id]
    })
    setSelectedPath(null)
    setInsertFor(null)
    setMessage('')
  }

  return (
    <>
      <div className="outliner data-outliner shared-outliner">
        {tabBar}
        <DsListHeader
          title="脚本库"
          count={catalogMode === 'authored' ? authoredIds.length : internalCatalog.length}
          unit="项"
          actions={catalogMode === 'authored'
            ? [{
                id: 'create-shared-script',
                label: '新建可复用脚本',
                icon: '＋',
                onClick: () => createScript(),
              }]
            : undefined}
        />
        <div className="shared-catalog-tabs" role="tablist" aria-label="脚本类型">
          <button
            type="button"
            role="tab"
            aria-selected={catalogMode === 'authored'}
            className={catalogMode === 'authored' ? 'active' : ''}
            onClick={() => {
              const id = selectedId || authoredIds[0]
              if (id) selectScript(id)
              else setCatalogMode('authored')
            }}
          >
            可复用脚本 <span>{authoredIds.length}</span>
          </button>
          {showMigrationInternals ? (
            <button
              type="button"
              role="tab"
              aria-selected={catalogMode === 'internal'}
              className={catalogMode === 'internal' ? 'active' : ''}
              onClick={() => {
                const id = selectedInternalId || internalCatalog[0]?.id
                if (id) selectInternalScript(id)
                else setCatalogMode('internal')
              }}
            >
              迁移内部实现 <span>{internalCatalog.length}</span>
            </button>
          ) : null}
        </div>
        <input
          className="in"
          placeholder={catalogMode === 'authored' ? '搜索名称或 id…' : '搜索地址、调用方或 id…'}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <p className="shared-catalog-note">
          {catalogMode === 'authored'
            ? '这里只列可命名、可独立调用的项目脚本；结构化物品能力留在物品工作台。'
            : '迁移器为旧版跳转与回环生成的控制流片段；可审查实现，但不是作者公共 API。'}
        </p>
        <div className="sprite-list">
          {catalogMode === 'authored'
            ? shownIds.map((id) => (
                <button
                  type="button"
                  key={id}
                  className={`arow${!selectedInternalId && selectedId === id ? ' sel' : ''}`}
                  onClick={() => selectScript(id)}
                >
                  <span className="face shared-script-icon">↪</span>
                  <span className="nm">
                    {library[id]?.name ?? id}
                    <small>{id.slice('shared/user/'.length)}</small>
                  </span>
                </button>
              ))
            : shownInternal.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  className={`arow${selectedInternalId === entry.id ? ' sel' : ''}`}
                  onClick={() => selectInternalScript(entry.id)}
                >
                  <span className="face shared-script-icon internal">⌘</span>
                  <span className="nm">
                    {entry.title}
                    <small>
                      {entry.scope === 'item' ? '物品控制流' : '场景控制流'} ·{' '}
                      {entry.callers.length} 个直接调用方
                    </small>
                  </span>
                </button>
              ))}
          {catalogMode === 'authored' && !shownIds.length ? (
            <div className="insp-empty">没有匹配的可复用脚本</div>
          ) : null}
          {catalogMode === 'internal' && !shownInternal.length ? (
            <div className="insp-empty">没有匹配的迁移内部实现</div>
          ) : null}
        </div>
      </div>

      <div
        className={`canvas-wrap data-body shared-script-main${
          needsSceneContext && testScene && playback ? ' with-preview' : ''
        }`}
      >
        {editingScriptId && formScene ? (
          <>
            <div className="shared-workbench-head">
              <div className="shared-workbench-title">
                <span className={`shared-kind-badge${editingInternalEntry ? ' internal' : ''}`}>
                  {editingInternalEntry ? '迁移内部实现' : '可复用脚本'}
                </span>
                <strong>{editingInternalEntry?.title ?? meta?.name ?? editingScriptId}</strong>
                <code title={editingScriptId}>{editingScriptId}</code>
              </div>
              {internalTrail.length ? (
                <button
                  type="button"
                  className="mini-txt"
                  title="返回调用方"
                  onClick={() => {
                    setInternalTrail((current) => current.slice(0, -1))
                    setSelectedPath(null)
                    setInsertFor(null)
                  }}
                >
                  ← 返回调用方
                </button>
              ) : null}
              <span className="spacer" />
              {needsSceneContext ? (
                <label className="shared-scene-context">
                  <span>场景分支预览</span>
                  <select
                    className="in"
                    value={testSceneId}
                    onChange={(event) => {
                      setTestSceneId(event.target.value)
                      setTestEntityId('')
                    }}
                  >
                    <option value="">选择实际场景后显示地图…</option>
                    {scenes.map((scene) => (
                      <option key={scene.id} value={scene.id}>
                        {scene.id}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className="shared-context-free">位置无关脚本 · 无需地图预览</span>
              )}
              {needsSceneContext && testScene && !selectedInternalId && meta?.self !== 'none' ? (
                <label className="shared-scene-context entity">
                  <span>self</span>
                  <select
                    className="in"
                    value={testEntityId}
                    onChange={(event) => setTestEntityId(event.target.value)}
                  >
                    <option value="">不指定</option>
                    {testScene.entities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.id}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            {needsSceneContext && !testScene ? (
              <div className="shared-context-callout">
                此脚本的完整调用链包含实体、坐标、面向判断或场景切换。选择一个真实场景后才显示地图；不选择时仍可编辑全部逻辑。
              </div>
            ) : null}
            {needsSceneContext && testScene && playback ? (
              <div className="shared-preview">
                <PreviewCanvas
                  scene={testScene}
                  stages={stages}
                  sourceKey={`shared:${editingScriptId}`}
                  projectId={projectId}
                  focusEntityId={meta?.self === 'none' ? undefined : testEntityId || undefined}
                  sprites={sprites}
                  actorsById={actorsById}
                  leaderSpriteId={leaderSpriteId}
                  assetBase={assetBase}
                  assetCatalog={assetCatalog}
                  assetReader={assetReader}
                  projectMaps={projectMaps}
                  mapIndex={mapIndex}
                  tilesets={tilesets}
                  locale={locale}
                  playback={playback}
                  sceneFraming={!testEntityId}
                />
              </div>
            ) : null}
            <div className="shared-edit-row">
              <div className="shared-tree">
                <ScriptTree
                  stages={stages}
                  locale={locale}
                  scenes={scenes}
                  actors={actorsById}
                  references={scriptReferences}
                  activePath={playback?.activePath ?? null}
                  selectedPath={selectedPath}
                  focusRevision={focusScriptRevision}
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
                      {BASE_INSERTS.filter((entry) => !entry.requiresItem || items.length).map(
                        (entry) => (
                          <button
                            type="button"
                            className="pv-btn"
                            key={entry.label}
                            onClick={() => insertCommands([entry.make(items[0]?.id)])}
                          >
                            {entry.label}
                          </button>
                        ),
                      )}
                      {soundAssets(assetCatalog)[0] ? (
                        <button
                          type="button"
                          className="pv-btn"
                          onClick={() =>
                            insertCommands([
                              {
                                kind: 'playSound',
                                asset: soundAssets(assetCatalog)[0]!.id,
                              },
                            ])
                          }
                        >
                          🔊 播放音效
                        </button>
                      ) : null}
                      {firstActionTarget && testScene?.entities.length ? (
                        <>
                          <button
                            type="button"
                            className="pv-btn"
                            onClick={() =>
                              insertCommands([
                                {
                                  kind: 'playEntityAction',
                                  entity: testEntityId || testScene.entities[0]!.id,
                                  sprite: firstActionTarget.sprite.id,
                                  action: firstActionTarget.action.id,
                                  loop: true,
                                  wait: false,
                                },
                              ])
                            }
                          >
                            ▶️ 播放预制动作
                          </button>
                          <button
                            type="button"
                            className="pv-btn"
                            onClick={() =>
                              insertCommands([
                                {
                                  kind: 'stopEntityAction',
                                  entity: testEntityId || testScene.entities[0]!.id,
                                  reset: true,
                                },
                              ])
                            }
                          >
                            ⏹️ 停止预制动作
                          </button>
                        </>
                      ) : null}
                    </div>
                    {firstActionTarget && selectedTestEntity ? (
                      <p className="cf-warn">
                        共享脚本会保存固定实体 {selectedTestEntity.id}
                        ；它不会自动改写为其它场景的“自身”。
                      </p>
                    ) : null}
                    {authoredIds.filter((id) => id !== selectedId).length ? (
                      <>
                        <div className="cf-group">调用可复用脚本</div>
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
                      scene={formScene}
                      locale={locale}
                      assetCatalog={assetCatalog}
                      audioResolver={audioResolver}
                      assetReader={assetReader}
                      scenes={scenes}
                      assetBase={assetBase}
                      actors={actorsById}
                      battleSprites={props.battleSprites}
                      sprites={sprites}
                      ambiences={session.getState().ambiences ?? []}
                      shops={session.getState().shops ?? []}
                      references={scriptReferences}
                      scriptIndex={scriptIndex}
                      hasImplicitSelf={!selectedInternalId && meta?.self === 'required'}
                      onOpenScript={selectedTargetId ? openScriptTarget : undefined}
                      onOpenSound={onOpenSound}
                      onOpenImage={onOpenImage}
                      onOpenBattleSprite={props.onOpenBattleSprite}
                      onOpenSpriteAction={props.onOpenSpriteAction}
                      onDialogueSpeakerOverrideChange={(text) => {
                        const path = parsePath(selectedPath)
                        const cue = (selectedCommand as { cue?: DialogueCueV14 }).cue
                        if (!cue || !('identity' in cue) || cue.identity.kind !== 'actor') return
                        const currentKey = cue.identity.speakerOverride
                        const scriptKey = editingScriptId.replace(/[^A-Za-z0-9_-]+/g, '-')
                        const pathKey = selectedPath.replace(/[^A-Za-z0-9_-]+/g, '-')
                        const localeKey = currentKey ?? `dlg.actor.shared.${scriptKey}.${pathKey}`
                        const identity = { ...cue.identity }
                        if (text) identity.speakerOverride = localeKey
                        else delete identity.speakerOverride
                        const nextCommand = {
                          ...(selectedCommand as object),
                          cue: { ...cue, identity },
                        } as unknown as Command
                        const out = updateCommandAt(stages, path, nextCommand)
                        if (out === stages) return
                        const edit = new UpdateScriptBodyCommand(
                          editingScriptId,
                          out[0]?.body ?? [],
                        )
                        session.dispatch(
                          text
                            ? new CompositeCommand('修改人物称谓', [
                                new UpdateLocaleCommand(localeKey, text),
                                edit,
                              ])
                            : edit,
                        )
                      }}
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
          <div className="insp-empty">
            {showMigrationInternals
              ? '新建可复用脚本，或从“迁移内部实现”查看旧版控制流'
              : '新建一个可复用脚本'}
          </div>
        )}
      </div>

      <div className="inspector shared-script-inspector">
        {editingScriptId ? (
          <>
            <div className="insp-head">
              <div className="who">
                <strong>{editingInternalEntry?.title ?? meta?.name ?? '脚本'}</strong>
                <code>{editingScriptId}</code>
              </div>
            </div>
            {editingInternalEntry ? (
              <div className="section shared-internal-meta">
                <h4>迁移内部实现</h4>
                <dl className="shared-facts">
                  <div>
                    <dt>类型</dt>
                    <dd>
                      {editingInternalEntry.scope === 'item' ? '物品脚本控制流' : '场景脚本控制流'}
                    </dd>
                  </div>
                  <div>
                    <dt>原版入口</dt>
                    <dd>
                      {editingInternalEntry.sourceAddress === undefined
                        ? '未解析'
                        : `L_${editingInternalEntry.sourceAddress}`}
                    </dd>
                  </div>
                  <div>
                    <dt>直接调用方</dt>
                    <dd>{editingInternalEntry.callers.length}</dd>
                  </div>
                </dl>
                <p className="shared-internal-explain">
                  这是迁移器为旧版跳转或回环保留的实现片段，不是可独立命名和复用的作者公共
                  API。命令体可维护；稳定 id、归属与删除权由迁移管线管理。
                </p>
                {editingInternalEntry.callers.length ? (
                  <div className="shared-caller-list">
                    {editingInternalEntry.callers.map((caller) => (
                      <span key={caller}>{caller}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : meta ? (
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
                    onClick={() => createScript({ meta, body: rootBody })}
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
                        openReferences(selectedId)
                      }
                    }}
                  >
                    🗑 删除
                  </button>
                </div>
              </div>
            ) : null}
            <div className="section">
              <h4>调用位置</h4>
              <button
                type="button"
                className="mini-txt"
                onClick={() => openReferences(editingScriptId)}
              >
                ↻ 扫描调用位置
              </button>
              {references?.length === 0 ? <p className="hint">没有直接调用方</p> : null}
              {references?.map((entry) => (
                <button
                  type="button"
                  className="shared-ref"
                  key={referenceKey(entry)}
                  disabled={
                    entry.caller.type === 'global' ||
                    (entry.caller.type === 'script' &&
                      !library[entry.caller.scriptId] &&
                      !internalById[entry.caller.scriptId])
                  }
                  onClick={() => {
                    if (entry.caller.type === 'script') {
                      if (library[entry.caller.scriptId]) selectScript(entry.caller.scriptId)
                      else if (internalById[entry.caller.scriptId])
                        selectInternalScript(entry.caller.scriptId)
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
          <div className="insp-empty">选择或新建脚本</div>
        )}
      </div>
    </>
  )
}
