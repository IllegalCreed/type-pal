/**
 * 编辑器外壳。B1.1 壳/渲染 · B1.2 选中/编辑 · B1.3 工具(拖动/添加/删除)。
 * 五区布局照 docs/phase2/editor/mockups/place-mode.html 定稿。
 *
 * 状态源:EditSession(useSyncExternalStore)。选中/工具是 UI 局部 state。
 * 一切编辑走 dispatch(Command) → 自动 undo/redo + 置脏 + 重渲染。
 */

import type {
  ActorDef,
  AssetCatalogV1,
  BattleFieldDef,
  BattleSpriteDefinitionReference,
  EnemyTeamDef,
  EntityDef,
  GridPos,
  HostileBehavior,
  HostileBehaviorV13,
  Locale,
  MapAssetDefV1,
  SceneDef,
  SceneEntryPoint,
  SpriteActionReference,
  SpriteDef,
  SpriteDefinitionReference,
} from '@type-pal/content'
import {
  isActorEntity,
  lookupText,
  nextMapAssetIdentity,
  resolveEntitySpriteId,
} from '@type-pal/content'
import {
  type AssetBase,
  buildBlankProjectMap,
  idleFrameIndex,
  type LoadedProjectV15,
  type ProjectMap,
  type TilesetDef,
} from '@type-pal/reforge'
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ActorReference } from '../core/actor-references.js'
import type { BattleDataReference } from '../core/battle-data-references.js'
import type { BlockingBattleFieldReference } from '../core/battle-field-references.js'
import {
  AddEntityCommand,
  AddSceneCommand,
  BindSceneMapCommand,
  CreateMapAssetCommand,
  CreateScriptSourceCommand,
  DeleteEntityCommand,
  DeleteSceneEntryCommand,
  DetachActorEntityCommand,
  DuplicateMapAssetCommand,
  MoveEntityCommand,
  RenameProjectCommand,
  SetEntitySpriteCommand,
  UpdateEntityCommand,
  UpdateSceneCommand,
  UpsertSceneEntryCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { EditorHistoryCoordinator } from '../core/editor-history-coordinator.js'
import type { BlockingEnemyTeamReference } from '../core/enemy-team-references.js'
import {
  createPlacedEntity,
  DEFAULT_ZONE_RANGE,
  type EntityPlacement,
  type EntityPlacementMode,
  entityShapeLabel,
} from '../core/entity-placement.js'
import { exportProjectZip } from '../core/export-zip.js'
import { saveHandle } from '../core/handle-store.js'
import type { ItemReference } from '../core/item-references.js'
import { type Opened, openExistingProject, pickDir, saveProjectAs } from '../core/open-actions.js'
import { collectEditorStatusIssues } from '../core/project-diagnostics.js'
import { serializeProjectWithMapCopies, writeProject } from '../core/project-io.js'
import {
  mergeEditorShellWithCurrentCanonicalScripts,
  projectActiveScriptEditorStateV5,
} from '../core/project-io-v5.js'
import { createScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import {
  findSceneEntryReferences,
  type SceneEntryReferenceEntry,
} from '../core/script-references.js'
import {
  type CanonicalScriptReferenceV5,
  canonicalScriptReferenceDestinationExistsV5,
  describeCanonicalScriptReferenceV5,
  type ScriptEditorStateV5,
  type ScriptV5EditSession,
  SetEntityHostileOnLoseV5Command,
  SetEntityPageBehaviorV5Command,
} from '../core/script-v5-editor.js'
import type { StampSelectionSource } from '../core/stamp-template.js'
import type { SpriteAutomaticScriptInstanceSite } from '../core/world-sprite-behavior.js'
import { ActorMode } from './ActorMode.js'
import { createEditorAppCommandRegistry, requireEditorAppCommand } from './app-command-registry.js'
import {
  closeSceneScriptPanelState,
  createEditorLayoutCommands,
  type EditorLayoutCommandHandlers,
  executeEditorLayoutShortcut,
  toggleSceneScriptPanelState,
} from './app-layout-commands.js'
import { BattleFieldPicker } from './BattleFieldPicker.js'
import { CanonicalSceneScriptWorkspaceV5 } from './CanonicalSceneScriptWorkspaceV5.js'
import {
  CanonicalHostileOnLoseEditorV5,
  type CanonicalScriptEditorContextV5,
} from './CanonicalScriptEditorV5.js'
import { DataMode } from './DataMode.js'
import type { DsMenuDefinition } from './design-system/index.js'
import {
  DsButton,
  DsCatalogGroupHeader,
  DsCatalogRow,
  DsCheckbox,
  DsControlGroup,
  DsIconButton,
  DsInspectorTabs,
  DsListHeader,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsSelect,
} from './design-system/index.js'
import { EditorAppHeader } from './EditorAppHeader.js'
import { EntityPageAnimationEditor } from './EntityPageAnimationEditor.js'
import {
  decodeEditorLocation,
  defaultEditorLocation,
  EDITOR_MODULES,
  type EditorLocation,
  type EditorModuleId,
  editorLinks,
  editorLocationHref,
  editorModule,
  editorSubpage,
  normalizeEditorLocation,
  sameEditorLocation,
} from './editor-navigation.js'
import { editorObjectTargetMissing } from './editor-target.js'
import { LifecycleCommandPanelV13 } from './LifecycleCommandPanelV13.js'
import { MapMode } from './MapMode.js'
import { MusicPicker } from './MusicPicker.js'
import {
  PanelResizeHandle,
  useStoredPanelBoolean,
  useStoredPanelNumber,
} from './PanelResizeHandle.js'
import { type ProjectSaveActivity, ProjectSaveDialog } from './ProjectSaveDialog.js'
import { ProjectWorkbenchTab } from './ProjectWorkbenchTab.js'
import { clampPanelSize, fitSidePanelWidths } from './panel-layout.js'
import { type SceneAnchorSelection, SceneCanvas } from './SceneCanvas.js'
import { ScriptDrawer } from './ScriptDrawer.js'
import { ScriptV5BehaviorInspector } from './ScriptV5BehaviorInspector.js'
import { disposeSoundPreview } from './SoundPicker.js'
import { SpriteImageViewer, SpriteThumb } from './SpriteThumb.js'

type SceneSelection =
  | { kind: 'scene' }
  | { kind: 'default-entry' }
  | { kind: 'named-entry'; id: string }
  | { kind: 'entity'; id: string }

const SCENE_SELECTION: SceneSelection = { kind: 'scene' }
const DEFAULT_ENTRY_SELECTION: Extract<SceneSelection, { kind: 'default-entry' }> = {
  kind: 'default-entry',
}
const CENTER_MIN_WIDTH = 260
const OUTLINER_DEFAULT_WIDTH = 194
const OUTLINER_MIN_WIDTH = 140
const OUTLINER_MAX_WIDTH = 420
const INSPECTOR_DEFAULT_WIDTH = 290
const INSPECTOR_MIN_WIDTH = 220
const INSPECTOR_MAX_WIDTH = 620
function sceneEntryOutlineLabel(entry: SceneEntryPoint): string {
  const label = entry.label?.trim()
  if (!label) return '未命名落点'
  return /^原版(?:传送点|落点) \(-?\d+,\s*-?\d+,\s*-?\d+\)$/.test(label) ? '原版落点' : label
}

interface StoredEditorNavigation {
  last?: EditorLocation
  modules?: Partial<Record<EditorModuleId, EditorLocation>>
  scroll?: Record<string, { outliner: number; center: number; inspector: number }>
}

function newEntityId(existing: EntityDef[]): string {
  const ids = new Set(existing.map((e) => e.id))
  let n = 1
  while (ids.has(`entity-${n}`)) n++
  return `entity-${n}`
}

function newSceneEntryId(scene: SceneDef): string {
  let index = 1
  while (scene.entries?.[`entry-${index}`]) index++
  return `entry-${index}`
}

function editorNavigationKey(projectId: string): string {
  return `type-pal:editor:navigation:${projectId}`
}

function readStoredEditorNavigation(projectId: string): StoredEditorNavigation {
  try {
    const raw = window.localStorage.getItem(editorNavigationKey(projectId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoredEditorNavigation
    const modules = Object.fromEntries(
      Object.entries(parsed.modules ?? {}).map(([id, location]) => [
        id,
        normalizeEditorLocation(location),
      ]),
    ) as Partial<Record<EditorModuleId, EditorLocation>>
    return {
      ...(parsed.last ? { last: normalizeEditorLocation(parsed.last) } : {}),
      modules,
      scroll: parsed.scroll ?? {},
    }
  } catch {
    return {}
  }
}

function initialEditorLocation(stored: StoredEditorNavigation): EditorLocation {
  const params = new URLSearchParams(window.location.search)
  if (params.has('module') || params.has('page') || params.has('object')) {
    return decodeEditorLocation(window.location.search)
  }
  return normalizeEditorLocation(stored.last)
}

function scrollKey(location: EditorLocation): string {
  return `${location.module}:${location.subpage}`
}

export function App(props: {
  session: EditSession
  project: LoadedProjectV15
  scriptV5?: {
    session: ScriptV5EditSession
  }
  /** 启动屏打开/克隆得到的工程目录句柄(P4):保存直接写回此夹,不再首存选夹。 */
  initialDir?: FileSystemDirectoryHandle
  /** 「工程」菜单切到别的工程(打开/另存为)→ 上抛 main 重建 session。 */
  onOpened?: (o: Opened) => void
  /** 「工程」菜单「新建工程」→ 回启动屏。 */
  onBackToPicker?: () => void
}) {
  const { session, project } = props
  const subscribe = useMemo(() => (cb: () => void) => session.subscribe(cb), [session])
  const getVersion = useMemo(() => () => session.getVersion(), [session])
  useSyncExternalStore(subscribe, getVersion) // 任一变化(含 markSaved / undo)都重渲染
  const scriptV5Session = props.scriptV5?.session
  const historyCoordinator = useMemo(
    () => (scriptV5Session ? new EditorHistoryCoordinator(session, scriptV5Session) : undefined),
    [scriptV5Session, session],
  )
  const subscribeScriptV5 = useMemo(
    () => (cb: () => void) => scriptV5Session?.subscribe(cb) ?? (() => undefined),
    [scriptV5Session],
  )
  const getScriptV5Version = useMemo(
    () => () => scriptV5Session?.getVersion() ?? 0,
    [scriptV5Session],
  )
  useSyncExternalStore(subscribeScriptV5, getScriptV5Version)
  const state = session.getState()
  const storedScriptV5State = scriptV5Session?.getState()
  const scriptV5State = storedScriptV5State
    ? projectActiveScriptEditorStateV5(storedScriptV5State, state.items)
    : undefined
  const editorDirty = session.isDirty() || (scriptV5Session?.isDirty() ?? false)
  const assetReader = useMemo(
    () => createEditorAssetReader(project.source, () => session.getState()),
    [project.source, session],
  )
  useEffect(
    () => () => {
      void disposeSoundPreview(assetReader)
    },
    [assetReader],
  )
  const audioResolver = assetReader
  const bodyRef = useRef<HTMLDivElement>(null)
  const storedNavigationRef = useRef(readStoredEditorNavigation(state.manifest.id))
  const [location, setLocation] = useState<EditorLocation>(() =>
    initialEditorLocation(storedNavigationRef.current),
  )
  const locationRef = useRef(location)
  const [moduleLocations, setModuleLocations] = useState<
    Partial<Record<EditorModuleId, EditorLocation>>
  >(() => ({ ...storedNavigationRef.current.modules, [location.module]: location }))
  const moduleLocationsRef = useRef(moduleLocations)
  const scrollPositionsRef = useRef(storedNavigationRef.current.scroll ?? {})
  const navigationStorageKey = editorNavigationKey(state.manifest.id)
  const [workspaceNotice, setWorkspaceNotice] = useState<
    { kind: 'info' | 'error'; message: string } | undefined
  >()
  const [stampSelectionSource, setStampSelectionSource] = useState<StampSelectionSource>()
  const captureStampSelection = useCallback((source: StampSelectionSource | undefined) => {
    setStampSelectionSource(source)
  }, [])
  useEffect(() => {
    void session
    setStampSelectionSource(undefined)
  }, [session])

  const persistNavigation = useCallback(
    (last: EditorLocation): void => {
      try {
        window.localStorage.setItem(
          navigationStorageKey,
          JSON.stringify({
            last,
            modules: moduleLocationsRef.current,
            scroll: scrollPositionsRef.current,
          } satisfies StoredEditorNavigation),
        )
      } catch {
        // 隐私模式或存储禁用时，URL 与当前会话状态仍可工作。
      }
    },
    [navigationStorageKey],
  )

  const captureScroll = useCallback((current: EditorLocation): void => {
    const body = bodyRef.current
    if (!body) return
    const outliner = body.querySelector<HTMLElement>(':scope > .outliner')
    const center = body.querySelector<HTMLElement>(':scope > .center, :scope > .data-body')
    const inspector = body.querySelector<HTMLElement>(':scope > .inspector')
    scrollPositionsRef.current[scrollKey(current)] = {
      outliner: outliner?.scrollTop ?? 0,
      center: center?.scrollTop ?? 0,
      inspector: inspector?.scrollTop ?? 0,
    }
  }, [])

  const applyEditorLocation = useCallback(
    (input: EditorLocation, historyMode: 'push' | 'replace' | 'none' = 'push'): void => {
      const next = normalizeEditorLocation(input)
      const current = locationRef.current
      const pageChanged = current.module !== next.module || current.subpage !== next.subpage
      if (pageChanged) {
        captureScroll(current)
        setWorkspaceNotice(undefined)
      }

      if (!sameEditorLocation(current, next)) {
        locationRef.current = next
        setLocation(next)
        const nextModules = { ...moduleLocationsRef.current, [next.module]: next }
        moduleLocationsRef.current = nextModules
        setModuleLocations(nextModules)
      }
      persistNavigation(next)

      if (historyMode !== 'none') {
        const href = editorLocationHref(next, window.location.href)
        if (historyMode === 'push') window.history.pushState({ editorLocation: next }, '', href)
        else window.history.replaceState({ editorLocation: next }, '', href)
      }
    },
    [captureScroll, persistNavigation],
  )

  useEffect(() => {
    window.history.replaceState(
      { editorLocation: locationRef.current },
      '',
      editorLocationHref(locationRef.current, window.location.href),
    )
    persistNavigation(locationRef.current)
  }, [persistNavigation])

  useEffect(() => {
    const onPopState = (): void =>
      applyEditorLocation(decodeEditorLocation(window.location.search), 'none')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [applyEditorLocation])

  const activeScrollKey = scrollKey(location)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = scrollPositionsRef.current[activeScrollKey]
      const body = bodyRef.current
      if (!saved || !body) return
      const outliner = body.querySelector<HTMLElement>(':scope > .outliner')
      const center = body.querySelector<HTMLElement>(':scope > .center, :scope > .data-body')
      const inspector = body.querySelector<HTMLElement>(':scope > .inspector')
      if (outliner) outliner.scrollTop = saved.outliner
      if (center) center.scrollTop = saved.center
      if (inspector) inspector.scrollTop = saved.inspector
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeScrollKey])

  const [selected, setSelected] = useState<SceneSelection>(SCENE_SELECTION)
  const [placingEntity, setPlacingEntity] = useState(false)
  const [scriptV5Channel, setScriptV5Channel] = useState<'trigger' | 'auto'>('trigger')
  const [selectedBehaviorV5, setSelectedBehaviorV5] = useState<string>()
  const [selectedPageV5, setSelectedPageV5] = useState<string>()
  // 布置模式左栏统一管理画布内容层与辅助叠加层的显隐。
  const [canvasLayers, setCanvasLayers] = useState({
    base: true,
    cover: true,
    entities: true,
    grid: false,
    blocked: false,
    entries: true,
    ghosts: true, // 显隐透视:隐藏实体半透明(编辑器默认开;游戏内不渲染)
  })
  const [placeSceneId, setPlaceSceneId] = useState<string>(() => {
    const target = location.objectId
    return target && state.scenes.some((scene) => scene.id === target)
      ? target
      : state.manifest.entryScene
  })
  // 放置 palette:add 工具态右栏选择可见实体来源或触发区参数。
  const [placeMode, setPlaceMode] = useState<EntityPlacementMode>('sprite')
  const [placeActorId, setPlaceActorId] = useState<string>(state.actors[0]?.id ?? '')
  const [placeSpriteId, setPlaceSpriteId] = useState<string>(state.sprites[0]?.id ?? '')
  const [placeZoneRanges, setPlaceZoneRanges] = useState({
    touch: DEFAULT_ZONE_RANGE.touch,
    interact: DEFAULT_ZONE_RANGE.interact,
  })
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(props.initialDir ?? null)
  /** 首存中断时尚未升级为工程句柄；保留尝试目录，重选同一目录时才能续用实际磁盘恢复快照。 */
  const saveAttemptDirRef = useRef<FileSystemDirectoryHandle | null>(props.initialDir ?? null)
  // 上次落盘快照(rel → 内容字符串):增量保存只写变化文件(P3)。首存后建立。
  const snapshotRef = useRef<Map<string, string> | null>(null)
  const [saveErr, setSaveErr] = useState('')
  const [saveActivity, setSaveActivity] = useState<ProjectSaveActivity | null>(null)
  // React state 只负责展示；同步 ref 才能在首个 await 前防住双击和并发工程 IO。
  const saveInFlightRef = useRef(false)
  const [exporting, setExporting] = useState(false) // A5 导出 zip 进行中

  useEffect(() => {
    if (
      location.module === 'scene' &&
      location.subpage === 'workspace' &&
      location.objectId &&
      state.scenes.some((candidate) => candidate.id === location.objectId)
    ) {
      setPlaceSceneId(location.objectId)
    }
  }, [location, state.scenes])

  // 布置模式当前编辑场景(可切;默认入口)。切场景重置选中 —— 实体属于场景。
  const scene = (state.scenes.find((s) => s.id === placeSceneId) ??
    state.scenes.find((s) => s.id === state.manifest.entryScene))!
  const switchPlaceScene = (id: string): void => {
    setPlaceSceneId(id)
    setSelected(SCENE_SELECTION)
    setPlacingEntity(false)
    const current = locationRef.current
    if (current.module === 'scene' && current.subpage === 'workspace') {
      applyEditorLocation({ ...current, objectId: id }, 'replace')
    }
  }
  // N5 引用跳转:变量页/物品页点引用 → 事件模式定位到 场景+脚本源。
  // 底部脚本抽屉(audit §6 Step2:场景模式内嵌脚本编辑,独立事件模式已退役)
  const [drawer, setDrawer] = useState<{
    open: boolean
    src: string | null
    internalScriptId: string | null
    commandPath: string | null
    focusRevision: number
  }>({
    open: false,
    src: null,
    internalScriptId: null,
    commandPath: null,
    focusRevision: 0,
  })
  const preciseFocusRevisionRef = useRef(0)
  const nextPreciseFocusRevision = (): number => {
    preciseFocusRevisionRef.current += 1
    return preciseFocusRevisionRef.current
  }
  const [sharedScriptFocus, setSharedScriptFocus] = useState<{
    id: string
    path: string
    revision: number
  }>()
  const [entityPageFocus, setEntityPageFocus] = useState<{
    sceneId: string
    entityId: string
    pageIndex: number
    revision: number
  }>()
  const [canonicalReferenceFocus, setCanonicalReferenceFocus] = useState<{
    reference: CanonicalScriptReferenceV5
    revision: number
  }>()
  const [itemPrivateScriptFocus, setItemPrivateScriptFocus] = useState<{
    itemId: string
    ability: 'use' | 'throw'
    scriptId: string
    commandPath: string
    revision: number
  }>()
  const [entityHostileFocus, setEntityHostileFocus] = useState<{
    sceneId: string
    entityId: string
    commandPath: string
    revision: number
  }>()
  const [canonicalPageFocus, setCanonicalPageFocus] = useState<{
    sceneId: string
    entityId: string
    pageId: string
    channel: 'trigger' | 'auto'
    behaviorId?: string
    revision: number
  }>()
  const selectSceneEntry = (
    selection: Extract<SceneSelection, { kind: 'default-entry' | 'named-entry' }>,
  ): void => {
    setSelected(selection)
    setPlacingEntity(false)
    setDrawer({
      open: false,
      src: null,
      internalScriptId: null,
      commandPath: null,
      focusRevision: drawer.focusRevision,
    })
  }
  /** 「去编辑脚本」统一入口(检查器按钮/数据模式引用跳转):回场景模式+定位场景+展开抽屉。 */
  const jumpToEvent = (
    sceneId: string,
    srcKey: string,
    commandPath?: string,
    pageIndex = 0,
  ): void => {
    setPlaceSceneId(sceneId)
    applyEditorLocation(editorLinks.scene(sceneId))
    // 源列跟随选中 → 跳转须同步选中目标(实体源选实体,场景级源选场景节点)
    const entityId = srcKey.split(':')[0]
    setSelected(
      srcKey.startsWith('__') || !entityId ? SCENE_SELECTION : { kind: 'entity', id: entityId },
    )
    const drawerSource =
      pageIndex > 0 && /:(trigger|auto)$/.test(srcKey) ? `${srcKey}@${pageIndex}` : srcKey
    setDrawer({
      open: true,
      src: drawerSource,
      internalScriptId: null,
      commandPath: commandPath ?? null,
      focusRevision: nextPreciseFocusRevision(),
    })
  }
  const jumpToBattleSpriteReference = (reference: BattleSpriteDefinitionReference): void => {
    const [domain, id] = reference.site.split(':')
    if (!id) return
    if (domain === 'actor') applyEditorLocation(editorLinks.actor(id))
    else if (domain === 'enemy') applyEditorLocation(editorLinks.enemy(id))
    else if (domain === 'item') applyEditorLocation(editorLinks.item(id))
    else if (domain === 'skill') applyEditorLocation(editorLinks.skill(id))
    else if (domain === 'scene') {
      setPlaceSceneId(id)
      applyEditorLocation(editorLinks.scene(id))
    } else if (domain === 'script') {
      const payload = reference.site.slice('script:'.length)
      const separator = payload.indexOf(':')
      const scriptId = separator >= 0 ? payload.slice(separator + 1) : ''
      if (scriptId) openScriptReference(scriptId)
    } else
      setWorkspaceNotice({
        kind: 'info',
        message: `引用位置 ${reference.where} 当前没有可编辑的持久内容页。`,
      })
  }
  const jumpToWorldSpriteReference = (reference: SpriteDefinitionReference): void => {
    const [domain, id, entityKind, entityId] = reference.site.split(':')
    if (!id) return
    if (domain === 'actor') applyEditorLocation(editorLinks.actor(id))
    else if (domain === 'enemy') applyEditorLocation(editorLinks.enemy(id))
    else if (domain === 'scene') {
      setPlaceSceneId(id)
      applyEditorLocation(editorLinks.scene(id))
      setSelected(
        entityKind === 'entity' && entityId ? { kind: 'entity', id: entityId } : SCENE_SELECTION,
      )
      setPlacingEntity(false)
      setDrawer({
        open: false,
        src: null,
        internalScriptId: null,
        commandPath: null,
        focusRevision: drawer.focusRevision,
      })
    } else if (domain === 'script') {
      const payload = reference.site.slice('script:'.length)
      const separator = payload.indexOf(':')
      const scriptId = separator >= 0 ? payload.slice(separator + 1) : ''
      if (scriptId) openScriptReference(scriptId)
    } else
      setWorkspaceNotice({
        kind: 'info',
        message: `使用位置 ${reference.where} 当前没有可编辑的持久内容页。`,
      })
  }
  const jumpToWorldSpriteActionReference = (reference: SpriteActionReference): void => {
    const locator = reference.locator
    if (!locator) {
      setWorkspaceNotice({
        kind: 'info',
        message: `动作引用 ${reference.where} 来自只读兼容数据，当前没有可编辑的精确位置。`,
      })
      return
    }
    if (locator.kind === 'page-animation') {
      const revision = nextPreciseFocusRevision()
      setPlaceSceneId(locator.sceneId)
      applyEditorLocation(editorLinks.scene(locator.sceneId))
      setSelected({ kind: 'entity', id: locator.entityId })
      setPlacingEntity(false)
      setInspectorCollapsed(false)
      setEntityPageFocus({ ...locator, revision })
      setDrawer({
        open: false,
        src: null,
        internalScriptId: null,
        commandPath: null,
        focusRevision: revision,
      })
      return
    }
    if (locator.kind === 'scene-command') {
      jumpToEvent(locator.sceneId, locator.sourceKey, locator.path, locator.pageIndex ?? 0)
      return
    }
    openScriptReference(locator.scriptId, locator.path)
  }
  const jumpToWorldSpriteAutomaticScriptInstance = (
    site: SpriteAutomaticScriptInstanceSite,
  ): void => jumpToEvent(site.sceneId, `${site.entityId}:auto`)
  const openSharedScript = useCallback(
    (id: string): void => {
      if (!scriptV5State?.sharedScripts[id] && !state.scriptIndex?.library?.[id]) return
      setSharedScriptFocus(undefined)
      applyEditorLocation(editorLinks.sharedScript(id))
    },
    [applyEditorLocation, scriptV5State?.sharedScripts, state.scriptIndex?.library],
  )
  const openScriptReference = (id: string, commandPath?: string): void => {
    if (scriptV5State?.sharedScripts[id] || state.scriptIndex?.library?.[id]) {
      if (commandPath)
        setSharedScriptFocus({
          id,
          path: commandPath,
          revision: nextPreciseFocusRevision(),
        })
      else setSharedScriptFocus(undefined)
      applyEditorLocation(editorLinks.sharedScript(id))
      return
    }
    const sceneId = /^scene\/([^/]+)\//.exec(id)?.[1]
    const targetScene = state.scenes.find((candidate) => candidate.id === sceneId)
    if (!sceneId || !targetScene) return
    const entityRoot = /\/entity-([^/]+)\/page-(\d+)\/(trigger|auto)(?:\/|$)/.exec(id)
    const entityId = entityRoot?.[1] ?? id.split('/').find((part) => /^e\d+$/.test(part))
    setPlaceSceneId(sceneId)
    applyEditorLocation(editorLinks.scene(sceneId))
    setSelected(
      entityId && targetScene.entities.some((entity) => entity.id === entityId)
        ? { kind: 'entity', id: entityId }
        : SCENE_SELECTION,
    )
    setPlacingEntity(false)
    setDrawer({
      open: true,
      src: null,
      internalScriptId: id,
      commandPath: commandPath ?? null,
      focusRevision: nextPreciseFocusRevision(),
    })
  }
  const openCanonicalReference = (reference: CanonicalScriptReferenceV5): void => {
    if (!scriptV5State || !canonicalScriptReferenceDestinationExistsV5(scriptV5State, reference)) {
      setWorkspaceNotice({
        kind: 'error',
        message: '引用位置已变化，请重新打开方案详情。',
      })
      return
    }
    const revision = nextPreciseFocusRevision()
    const locator = reference.locator
    setWorkspaceNotice(undefined)
    const confirmReferenceLocation = (): void =>
      setWorkspaceNotice({
        kind: 'info',
        message: `已定位到：${describeCanonicalScriptReferenceV5(scriptV5State, reference)}。`,
      })

    if (locator.kind === 'entity-page') {
      const targetScene = state.scenes.find((candidate) => candidate.id === locator.sceneId)
      const targetEntity = targetScene?.entities.find(
        (candidate) => candidate.id === locator.entityId,
      )
      const canonicalEntity = scriptV5State.scenes
        .find((candidate) => candidate.id === locator.sceneId)
        ?.entities.find((candidate) => candidate.id === locator.entityId)
      const pageIndex =
        canonicalEntity?.pages?.findIndex((candidate) => candidate.id === locator.pageId) ?? -1
      const page = canonicalEntity?.pages?.[pageIndex]
      if (!targetScene || !targetEntity || pageIndex < 0 || !page) {
        setWorkspaceNotice({
          kind: 'error',
          message: '引用所在的场景、实体或页面已不存在。',
        })
        return
      }
      setPlaceSceneId(locator.sceneId)
      applyEditorLocation(editorLinks.scene(locator.sceneId))
      setSelected({ kind: 'entity', id: locator.entityId })
      setPlacingEntity(false)
      setInspectorCollapsed(false)
      setSelectedPageV5(locator.pageId)
      setScriptV5Channel(locator.channel)
      setSelectedBehaviorV5(page[locator.channel])
      setCanonicalPageFocus({
        sceneId: locator.sceneId,
        entityId: locator.entityId,
        pageId: locator.pageId,
        channel: locator.channel,
        behaviorId: page[locator.channel],
        revision,
      })
      setEntityPageFocus({
        sceneId: locator.sceneId,
        entityId: locator.entityId,
        pageIndex,
        revision,
      })
      setCanonicalReferenceFocus(undefined)
      setDrawer({
        open: false,
        src: null,
        internalScriptId: null,
        commandPath: null,
        focusRevision: revision,
      })
      confirmReferenceLocation()
      return
    }

    if (locator.kind === 'scene-hook-initial') {
      setPlaceSceneId(locator.sceneId)
      applyEditorLocation(editorLinks.scene(locator.sceneId))
      setSelected(SCENE_SELECTION)
      setPlacingEntity(false)
      setCanonicalReferenceFocus({ reference, revision })
      setDrawer({
        open: true,
        src: null,
        internalScriptId: null,
        commandPath: null,
        focusRevision: revision,
      })
      confirmReferenceLocation()
      return
    }

    const owner = locator.owner
    if (owner.kind === 'shared-script') {
      setCanonicalReferenceFocus(undefined)
      setSharedScriptFocus({
        id: owner.scriptId,
        path: locator.commandPath,
        revision,
      })
      applyEditorLocation(editorLinks.sharedScript(owner.scriptId))
      confirmReferenceLocation()
      return
    }
    if (owner.kind === 'item-private-script') {
      setCanonicalReferenceFocus(undefined)
      setItemPrivateScriptFocus({
        itemId: owner.itemId,
        ability: owner.ability,
        scriptId: owner.scriptId,
        commandPath: locator.commandPath,
        revision,
      })
      applyEditorLocation(editorLinks.item(owner.itemId))
      confirmReferenceLocation()
      return
    }

    setPlaceSceneId(owner.sceneId)
    applyEditorLocation(editorLinks.scene(owner.sceneId))
    setPlacingEntity(false)
    if (owner.kind === 'entity-hostile-on-lose') {
      setSelected({ kind: 'entity', id: owner.entityId })
      setInspectorCollapsed(false)
      setEntityHostileFocus({
        sceneId: owner.sceneId,
        entityId: owner.entityId,
        commandPath: locator.commandPath,
        revision,
      })
      setCanonicalReferenceFocus(undefined)
      setDrawer({
        open: false,
        src: null,
        internalScriptId: null,
        commandPath: null,
        focusRevision: revision,
      })
      confirmReferenceLocation()
      return
    }
    setSelected(
      owner.kind === 'entity-behavior' ? { kind: 'entity', id: owner.entityId } : SCENE_SELECTION,
    )
    setCanonicalReferenceFocus({ reference, revision })
    setDrawer({
      open: true,
      src: null,
      internalScriptId: null,
      commandPath: null,
      focusRevision: revision,
    })
    confirmReferenceLocation()
  }
  const openItemReference = (reference: ItemReference): void => {
    const locator = reference.locator
    if (!locator) {
      setWorkspaceNotice({
        kind: 'info',
        message: reference.unavailableReason ?? `${reference.where} 当前没有可编辑的精确位置。`,
      })
      return
    }
    switch (locator.kind) {
      case 'canonical-script':
        openCanonicalReference(locator.reference)
        return
      case 'scene-script':
        jumpToEvent(locator.sceneId, locator.sourceKey, locator.commandPath, locator.pageIndex ?? 0)
        return
      case 'shared-script':
        openScriptReference(locator.scriptId, locator.commandPath)
        return
      case 'shop':
        applyEditorLocation(editorLinks.shop(locator.shopId))
        return
      case 'actor':
        applyEditorLocation(editorLinks.actor(locator.actorId))
        return
      case 'skill':
        applyEditorLocation(editorLinks.skill(locator.skillId))
        return
      case 'enemy':
        applyEditorLocation(editorLinks.enemy(locator.enemyId))
        return
      case 'poison':
        applyEditorLocation(editorLinks.poison(locator.poisonId))
        return
      case 'entry-point':
        applyEditorLocation(editorLinks.entryPoint(locator.entryPointId))
        return
      case 'item':
        applyEditorLocation(editorLinks.item(locator.itemId))
        return
    }
  }
  const openActorReference = (reference: ActorReference): void => {
    const locator = reference.locator
    if (!locator) {
      setWorkspaceNotice({
        kind: 'info',
        message: reference.unavailableReason ?? `${reference.where} 当前没有可编辑的精确位置。`,
      })
      return
    }
    switch (locator.kind) {
      case 'scene-entity':
        setPlaceSceneId(locator.sceneId)
        setSelected({ kind: 'entity', id: locator.entityId })
        applyEditorLocation(editorLinks.scene(locator.sceneId))
        return
      case 'scene':
        setPlaceSceneId(locator.sceneId)
        applyEditorLocation(editorLinks.scene(locator.sceneId))
        return
      case 'shared-script':
        openScriptReference(locator.scriptId)
        return
      case 'entry-point':
        applyEditorLocation(editorLinks.entryPoint(locator.entryPointId))
        return
      case 'actor':
        applyEditorLocation(editorLinks.actor(locator.actorId))
        return
      case 'item':
        applyEditorLocation(editorLinks.item(locator.itemId))
        return
      case 'enemy':
        applyEditorLocation(editorLinks.enemy(locator.enemyId))
        return
    }
  }
  const openBattleDataReference = (reference: BattleDataReference): void => {
    const locator = reference.locator
    if (!locator) {
      setWorkspaceNotice({
        kind: 'info',
        message: `${reference.where} 当前没有可编辑的精确位置。`,
      })
      return
    }
    switch (locator.kind) {
      case 'actor':
        applyEditorLocation(editorLinks.actor(locator.actorId))
        return
      case 'entry-point':
        applyEditorLocation(editorLinks.entryPoint(locator.entryPointId))
        return
      case 'item':
        applyEditorLocation(editorLinks.item(locator.itemId))
        return
      case 'skill':
        applyEditorLocation(editorLinks.skill(locator.skillId))
        return
      case 'enemy':
        applyEditorLocation(editorLinks.enemy(locator.enemyId))
        return
      case 'poison':
        applyEditorLocation(editorLinks.poison(locator.poisonId))
        return
    }
  }
  const openBattleFieldReference = (reference: BlockingBattleFieldReference): void => {
    const locator = reference.locator
    if (!locator) {
      setWorkspaceNotice({ kind: 'info', message: reference.label })
      return
    }
    if (locator.kind === 'canonical-script') {
      openCanonicalReference(locator.reference)
      return
    }
    setPlaceSceneId(locator.sceneId)
    applyEditorLocation(editorLinks.scene(locator.sceneId))
    setPlacingEntity(false)
    setSelected(
      locator.kind === 'scene-entity' ? { kind: 'entity', id: locator.entityId } : SCENE_SELECTION,
    )
    setInspectorCollapsed(false)
  }
  const openEnemyTeamReference = (reference: BlockingEnemyTeamReference): void => {
    const locator = reference.locator
    if (!locator) {
      setWorkspaceNotice({ kind: 'info', message: reference.label })
      return
    }
    if (locator.kind === 'canonical-script') {
      openCanonicalReference(locator.reference)
      return
    }
    setPlaceSceneId(locator.sceneId)
    applyEditorLocation(editorLinks.scene(locator.sceneId))
    setPlacingEntity(false)
    setSelected({ kind: 'entity', id: locator.entityId })
    setInspectorCollapsed(false)
  }
  const statusIssues = useMemo(
    () => collectEditorStatusIssues(state, scriptV5State),
    [scriptV5State, state],
  )
  // C0:实体经 actor⊕sprite 解析;玩家精灵 = party[0] → ActorDef.spriteId(与引擎同路径)
  const actorsById = useMemo(
    () => Object.fromEntries(state.actors.map((a) => [a.id, a])) as Record<string, ActorDef>,
    [state.actors],
  )
  const canonicalScriptEditorContextV5 = useMemo<CanonicalScriptEditorContextV5 | undefined>(() => {
    if (!scriptV5State) return undefined
    return {
      state: scriptV5State,
      currentSceneId: scene.id,
      shellScenes: state.scenes,
      locale: state.locale,
      assetCatalog: state.assetCatalog,
      audioResolver,
      assetReader,
      assetBase: project.assetBase,
      actors: actorsById,
      battleSprites: state.battleSprites,
      battleFields: state.battleFields ?? [],
      enemyTeams: state.enemyTeams ?? [],
      sprites: state.sprites,
      ambiences: state.ambiences ?? [],
      shops: state.shops ?? [],
      hasImplicitSelf: true,
      references: createScriptReferenceCatalog({
        locale: state.locale,
        items: state.items,
        skills: state.skills,
        actors: state.actors,
        sprites: state.sprites,
        battleSprites: state.battleSprites,
        ambiences: state.ambiences ?? [],
        mapIndex: state.mapIndex,
        assetCatalog: state.assetCatalog,
        authorScripts: Object.entries(scriptV5State.sharedScripts).map(([id, script]) => ({
          id,
          name: script.name,
        })),
      }),
      onOpenScript: openSharedScript,
      onOpenSound: (id) => applyEditorLocation(editorLinks.sound(id)),
      onOpenImage: (id) => applyEditorLocation(editorLinks.image(id)),
      onOpenBattleSprite: (id) => applyEditorLocation(editorLinks.battleSprite(id)),
      onOpenBattleField: (id) => applyEditorLocation(editorLinks.battleField(id)),
      onOpenSpriteAction: (spriteId, actionId) =>
        applyEditorLocation(editorLinks.worldSpriteAction(spriteId, actionId)),
    }
  }, [
    actorsById,
    assetReader,
    audioResolver,
    project.assetBase,
    scene.id,
    scriptV5State,
    state.actors,
    state.ambiences,
    state.assetCatalog,
    state.battleSprites,
    state.battleFields,
    state.enemyTeams,
    state.items,
    state.locale,
    state.mapIndex,
    state.scenes,
    state.shops,
    state.skills,
    state.sprites,
    applyEditorLocation,
    openSharedScript,
  ])
  const leaderSpriteId = actorsById[state.manifest.startWorld.party[0] ?? '']?.spriteId
  const [bodyWidth, setBodyWidth] = useState(0)
  const [outlinerWidth, setOutlinerWidth] = useStoredPanelNumber(
    'type-pal:editor:layout-v2:outliner-width',
    OUTLINER_DEFAULT_WIDTH,
    { min: OUTLINER_MIN_WIDTH, max: OUTLINER_MAX_WIDTH },
  )
  const [inspectorWidth, setInspectorWidth] = useStoredPanelNumber(
    'type-pal:editor:layout-v2:inspector-width',
    INSPECTOR_DEFAULT_WIDTH,
    { min: INSPECTOR_MIN_WIDTH, max: INSPECTOR_MAX_WIDTH },
  )
  const [outlinerCollapsed, setOutlinerCollapsed] = useStoredPanelBoolean(
    'type-pal:editor:layout-v2:outliner-collapsed',
    false,
  )
  const [inspectorCollapsed, setInspectorCollapsed] = useStoredPanelBoolean(
    'type-pal:editor:layout-v2:inspector-collapsed',
    false,
  )
  const scriptPanelAvailable = location.module === 'scene' && location.subpage === 'workspace'
  const toggleOutliner = useCallback(
    () => setOutlinerCollapsed((collapsed) => !collapsed),
    [setOutlinerCollapsed],
  )
  const toggleInspector = useCallback(
    () => setInspectorCollapsed((collapsed) => !collapsed),
    [setInspectorCollapsed],
  )
  const toggleScriptPanel = useCallback(() => {
    if (!scriptPanelAvailable) return
    if (!drawer.open) setPlacingEntity(false)
    setDrawer(toggleSceneScriptPanelState)
  }, [drawer.open, scriptPanelAvailable])
  const resetPanelLayout = useCallback(() => {
    setOutlinerWidth(OUTLINER_DEFAULT_WIDTH)
    setInspectorWidth(INSPECTOR_DEFAULT_WIDTH)
    setOutlinerCollapsed(false)
    setInspectorCollapsed(false)
    setDrawer(closeSceneScriptPanelState)
  }, [setInspectorCollapsed, setInspectorWidth, setOutlinerCollapsed, setOutlinerWidth])
  const layoutCommandHandlers = useMemo<EditorLayoutCommandHandlers>(
    () => ({
      toggleOutliner,
      toggleScriptPanel,
      toggleInspector,
      resetLayout: resetPanelLayout,
    }),
    [resetPanelLayout, toggleInspector, toggleOutliner, toggleScriptPanel],
  )

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const syncWidth = (): void => setBodyWidth(body.clientWidth)
    syncWidth()
    const observer = new ResizeObserver(syncWidth)
    observer.observe(body)
    return () => observer.disconnect()
  }, [])

  const layoutWidth = bodyWidth || 1280
  const requestedOutlinerWidth = outlinerCollapsed
    ? 0
    : clampPanelSize(outlinerWidth, OUTLINER_MIN_WIDTH, OUTLINER_MAX_WIDTH)
  const requestedInspectorWidth = inspectorCollapsed
    ? 0
    : clampPanelSize(inspectorWidth, INSPECTOR_MIN_WIDTH, INSPECTOR_MAX_WIDTH)
  const fittedPanels = fitSidePanelWidths({
    available: layoutWidth - CENTER_MIN_WIDTH,
    left: requestedOutlinerWidth,
    right: requestedInspectorWidth,
    leftMin: outlinerCollapsed ? 0 : OUTLINER_MIN_WIDTH,
    rightMin: inspectorCollapsed ? 0 : INSPECTOR_MIN_WIDTH,
  })
  const visibleOutlinerWidth = fittedPanels.left
  const visibleInspectorWidth = fittedPanels.right
  const outlinerResizeMax = Math.min(
    OUTLINER_MAX_WIDTH,
    Math.max(OUTLINER_MIN_WIDTH, layoutWidth - CENTER_MIN_WIDTH - visibleInspectorWidth),
  )
  const inspectorResizeMax = Math.min(
    INSPECTOR_MAX_WIDTH,
    Math.max(INSPECTOR_MIN_WIDTH, layoutWidth - CENTER_MIN_WIDTH - visibleOutlinerWidth),
  )
  const bodyStyle = {
    '--outliner-width': `${visibleOutlinerWidth}px`,
    '--inspector-width': `${visibleInspectorWidth}px`,
  } as CSSProperties

  const activeModule = editorModule(location.module)
  const activeSubpage = editorSubpage(location)
  const sceneMapId = scene?.mapId
  const defaultMapId =
    (location.module === 'map' &&
    location.objectId &&
    state.mapIndex.maps.some((asset) => asset.id === location.objectId)
      ? location.objectId
      : undefined) ??
    sceneMapId ??
    state.mapIndex.maps[0]?.id
  useEffect(() => {
    const ids = new Set<string>()
    if (scene?.mapId) ids.add(scene.mapId)
    if (location.module === 'map' && location.objectId) ids.add(location.objectId)
    for (const id of ids) void session.ensureMapLoaded(id).catch(() => undefined)
  }, [location.module, location.objectId, scene?.mapId, session])
  const openEditorSubpage = (next: EditorLocation): void => {
    const subpage = editorSubpage(next)
    applyEditorLocation(
      subpage.kind === 'scene'
        ? { ...next, objectId: placeSceneId }
        : subpage.kind === 'map'
          ? { ...next, ...(defaultMapId ? { objectId: defaultMapId } : {}) }
          : next,
    )
  }
  const focusCurrentObject = (objectId: string | undefined): void => {
    const current = locationRef.current
    const next = { ...current }
    if (objectId) next.objectId = objectId
    else delete next.objectId
    applyEditorLocation(next, 'replace')
  }
  const objectTargetMissing = editorObjectTargetMissing(
    state,
    location,
    scriptV5State?.sharedScripts,
  )
  const historyOwnerRef = useRef<'legacy' | 'v5'>('legacy')
  useEffect(() => {
    let version = session.getHistoryVersion()
    return session.subscribe(() => {
      const next = session.getHistoryVersion()
      if (next !== version) historyOwnerRef.current = 'legacy'
      version = next
    })
  }, [session])
  useEffect(() => {
    if (!scriptV5Session) return undefined
    let version = scriptV5Session.getHistoryVersion()
    return scriptV5Session.subscribe(() => {
      const next = scriptV5Session.getHistoryVersion()
      if (next !== version) historyOwnerRef.current = 'v5'
      version = next
    })
  }, [scriptV5Session])

  const reconcileLocationAfterHistory = useCallback((): void => {
    const current = locationRef.current
    if (
      editorObjectTargetMissing(
        session.getState(),
        current,
        scriptV5Session?.getState().sharedScripts,
      )
    ) {
      const next = { ...current }
      delete next.objectId
      applyEditorLocation(next, 'replace')
    }
  }, [applyEditorLocation, scriptV5Session, session])
  const undo = useCallback((): void => {
    if (historyCoordinator?.undo()) {
      reconcileLocationAfterHistory()
      return
    }
    const preferred = historyOwnerRef.current
    if (preferred === 'v5' && scriptV5Session?.undo()) return
    if (session.undo()) {
      reconcileLocationAfterHistory()
      return
    }
    scriptV5Session?.undo()
  }, [historyCoordinator, reconcileLocationAfterHistory, scriptV5Session, session])
  const redo = useCallback((): void => {
    if (historyCoordinator?.redo()) {
      reconcileLocationAfterHistory()
      return
    }
    const preferred = historyOwnerRef.current
    if (preferred === 'v5' && scriptV5Session?.redo()) return
    if (session.redo()) {
      reconcileLocationAfterHistory()
      return
    }
    scriptV5Session?.redo()
  }, [historyCoordinator, reconcileLocationAfterHistory, scriptV5Session, session])

  const selEntity =
    selected.kind === 'entity' ? scene?.entities.find((e) => e.id === selected.id) : undefined
  const canonicalEntityV5 = scriptV5State?.scenes
    .find((candidate) => candidate.id === scene?.id)
    ?.entities.find((candidate) => candidate.id === selEntity?.id)
  const canonicalPageV5 =
    canonicalEntityV5?.pages?.find((page) => page.id === selectedPageV5) ??
    canonicalEntityV5?.pages?.find((page) => page.id === canonicalEntityV5.initialPage) ??
    canonicalEntityV5?.pages?.[0]
  const selectedScriptOwnerKey = `${scene?.id ?? ''}\u0000${selEntity?.id ?? ''}`
  useEffect(() => {
    void selectedScriptOwnerKey
    setSelectedPageV5(undefined)
    setSelectedBehaviorV5(undefined)
  }, [selectedScriptOwnerKey])
  useEffect(() => {
    if (
      !canonicalPageFocus ||
      canonicalPageFocus.sceneId !== scene?.id ||
      canonicalPageFocus.entityId !== selEntity?.id
    )
      return
    setSelectedPageV5(canonicalPageFocus.pageId)
    setScriptV5Channel(canonicalPageFocus.channel)
    setSelectedBehaviorV5(canonicalPageFocus.behaviorId)
    setCanonicalPageFocus(undefined)
  }, [canonicalPageFocus, scene?.id, selEntity?.id])
  const selectedNamedEntryId = selected.kind === 'named-entry' ? selected.id : undefined
  const selectedAnchor: SceneAnchorSelection | null =
    selected.kind === 'default-entry'
      ? { kind: 'default' }
      : selected.kind === 'named-entry'
        ? { kind: 'named', id: selected.id }
        : null
  const selectedEntryReferences = useMemo(
    () =>
      scene && selectedNamedEntryId
        ? findSceneEntryReferences(state, scene.id, selectedNamedEntryId)
        : [],
    [state, scene, selectedNamedEntryId],
  )

  // 删除键:选中实体时删(在输入框里打字不触发)。
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || saveInFlightRef.current) return
      const t = e.target as HTMLElement | null
      const typing =
        t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')
      if (e.key === 'Escape' && scriptPanelAvailable && !drawer.open) {
        if (placingEntity) {
          e.preventDefault()
          setPlacingEntity(false)
          return
        }
        if (!typing && selected.kind !== 'scene') {
          e.preventDefault()
          setSelected(SCENE_SELECTION)
          return
        }
      }
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        activeSubpage.kind === 'scene' &&
        selEntity &&
        scene &&
        !placingEntity &&
        !typing
      ) {
        e.preventDefault()
        session.dispatch(new DeleteEntityCommand(scene.id, selEntity.id))
        setSelected(SCENE_SELECTION)
        return
      }
      // undo/redo 快捷键(⌘/Ctrl+Z,+Shift=redo;输入框内不劫持)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !typing) {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (!typing && executeEditorLayoutShortcut(e, layoutCommandHandlers)) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    session,
    scene,
    selEntity,
    selected,
    placingEntity,
    drawer.open,
    scriptPanelAvailable,
    activeSubpage.kind,
    layoutCommandHandlers,
    redo,
    undo,
  ])

  if (!scene && activeSubpage.kind !== 'project') {
    return (
      <div className="boot">
        <div className="boot-entry-error">
          <div className="err">入口场景 "{state.manifest.entryScene}" 不在 scenes</div>
          <p>工程仍可修复；请重新选择默认入口（不经过标题菜单）的起始场景。</p>
          <DsButton
            variant="secondary"
            onClick={() =>
              applyEditorLocation({ module: 'project', subpage: 'entrypoint' }, 'replace')
            }
          >
            打开“入口与开局”修复
          </DsButton>
        </div>
      </div>
    )
  }

  const moveEntity = (id: string, cell: { col: number; row: number }): void => {
    const ent = scene.entities.find((e) => e.id === id)
    if (ent)
      session.dispatch(
        new MoveEntityCommand(scene.id, id, {
          col: cell.col,
          row: cell.row,
          height: ent.pos.height,
        }),
      )
  }
  const addAt = (cell: { col: number; row: number }): void => {
    const id = newEntityId(scene.entities)
    let placement: EntityPlacement | undefined
    if (placeMode === 'actor') {
      const actorId = placeActorId || state.actors[0]?.id
      if (actorId) placement = { mode: 'actor', actorId }
    } else if (placeMode === 'sprite') {
      const spriteId = placeSpriteId || state.sprites[0]?.id
      if (spriteId) placement = { mode: 'sprite', spriteId }
    } else if (placeMode === 'touch-zone') {
      placement = { mode: placeMode, range: placeZoneRanges.touch }
    } else {
      placement = { mode: placeMode, range: placeZoneRanges.interact }
    }
    if (!placement) return
    session.dispatch(
      new AddEntityCommand(
        scene.id,
        createPlacedEntity(id, { col: cell.col, row: cell.row, height: 0 }, placement),
      ),
    )
    setSelected({ kind: 'entity', id })
    setPlacingEntity(false)
  }
  const deleteSelected = (): void => {
    if (!selEntity) return
    session.dispatch(new DeleteEntityCommand(scene.id, selEntity.id))
    setSelected(SCENE_SELECTION)
  }
  const sceneEntityGroups = (['预制人物', '自定义实体', '触发区'] as const).map((title) => ({
    title,
    entities: scene.entities.filter((entity) => entityShapeLabel(entity) === title),
  }))
  const serializeEditorSnapshot = (
    shellState: ReturnType<EditSession['getState']>,
    scriptState: ScriptEditorStateV5 | undefined,
    includeAssetCopies: boolean,
  ): Promise<Record<string, unknown>> => {
    if (!props.scriptV5 || !scriptState)
      return serializeProjectWithMapCopies(shellState, project.source, {
        includeAssetCopies,
      })
    return serializeProjectWithMapCopies(
      mergeEditorShellWithCurrentCanonicalScripts(scriptState, shellState),
      project.source,
      { includeAssetCopies },
    )
  }
  // 保存:File System Access + 增量(快照-diff,只写变化;P3)。首次弹选文件夹并把句柄存
  // IndexedDB(工程标识 = manifest.id;将来「打开本地/最近工程」= P4 复用)。
  const save = async (): Promise<void> => {
    if (saveInFlightRef.current || exporting) return
    saveInFlightRef.current = true
    setSaveActivity({ phase: 'choosing-directory' })
    try {
      let dir = dirHandleRef.current
      let rememberDirectory = false
      if (!dir) {
        dir = await pickDir()
        if (!dir) return
        const previousAttempt = saveAttemptDirRef.current
        const resumesInterruptedAttempt = previousAttempt
          ? await dir.isSameEntry(previousAttempt)
          : false
        if (!resumesInterruptedAttempt) snapshotRef.current = null
        saveAttemptDirRef.current = dir
        rememberDirectory = true
      }
      const savedState = session.getState()
      const savedScriptState = scriptV5Session?.getState()
      const savedScriptVersion = scriptV5Session?.getVersion()
      const removePaths = [...session.getDeletedMapPaths(), ...session.getDeletedAssetPaths()]
      setSaveErr('')
      setSaveActivity({ phase: 'preparing' })
      // 先让原生 modal 进入 top layer，再开始可能较重的全工程序列化。
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      // HTTP 工程第一次选择本地目录时没有可复制的源目录，必须从 FileSource
      // 把 catalog 的全部二进制一并物化，不能只写本会话新增的 assetBlobs。
      const files = await serializeEditorSnapshot(savedState, savedScriptState, rememberDirectory)
      let lastPercent = -1
      setSaveActivity({ phase: 'writing', completed: 0, total: 0 })
      // 即使是首存也传空 Map：writeProject 会把每个已成功 close 的路径记进实际磁盘恢复快照。
      // 中断后该 Map 留在 ref 中，下次保存/撤销才能清理已写但未发布的新 blob。
      const recoverySnapshot = snapshotRef.current ?? new Map<string, string>()
      snapshotRef.current = recoverySnapshot
      snapshotRef.current = await writeProject(dir, files, {
        prevSnapshot: recoverySnapshot,
        removePaths,
        onProgress: ({ completed, total }) => {
          const percent = total > 0 ? Math.floor((completed / total) * 100) : 0
          if (percent === lastPercent && completed < total) return
          lastPercent = percent
          setSaveActivity({ phase: 'writing', completed, total })
        },
      })
      // 若保存期间仍有后台 hydrate/command 生成新 state，磁盘只是开始时快照，不能误清 dirty。
      if (session.getState() === savedState) session.markSaved()
      if (
        scriptV5Session &&
        savedScriptVersion !== undefined &&
        scriptV5Session.getVersion() === savedScriptVersion
      )
        scriptV5Session.markSaved()
      if (rememberDirectory) {
        // 只有完整 writeProject 成功后才把目录升级为后续增量保存目标。若素材 fetch /
        // hash 校验 / 写盘中途失败，下一次仍按 HTTP 首存全量物化，不能提交半闭包工程。
        dirHandleRef.current = dir
        saveAttemptDirRef.current = dir
        void saveHandle(savedState.manifest.id, dir.name, dir).catch((error: unknown) =>
          console.warn('[project] 工程已保存，但最近工程句柄登记失败', error),
        )
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return // 用户取消选择器
      // writeProject 已原地更新恢复快照；保留它供下次恢复/清理。
      setSaveErr(e instanceof Error ? e.message : String(e))
    } finally {
      saveInFlightRef.current = false
      setSaveActivity(null)
    }
  }

  // 「工程」菜单(P4 native-app 手感:新建 / 打开别的 / 另存为)。切工程 → 上抛 main 重建 session。
  const runProj = async (fn: () => Promise<Opened | null>): Promise<void> => {
    try {
      const o = await fn()
      if (o) props.onOpened?.(o)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setSaveErr(e instanceof Error ? e.message : String(e))
    }
  }

  const saveAs = async (): Promise<void> => {
    if (saveInFlightRef.current || exporting) return
    saveInFlightRef.current = true
    setSaveActivity({ phase: 'saving-as' })
    try {
      const savedState = session.getState()
      const savedScriptState = scriptV5Session?.getState()
      const removePaths = [...session.getDeletedMapPaths(), ...session.getDeletedAssetPaths()]
      const sourceDir = dirHandleRef.current ?? undefined
      // 必须在点击调用栈内同步启动，File System Access 的目录选择器才保有用户激活。
      const operation = saveProjectAs(
        () => serializeEditorSnapshot(savedState, savedScriptState, !sourceDir),
        sourceDir,
        removePaths,
      )
      const opened = await operation
      if (opened) props.onOpened?.(opened)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setSaveErr(e instanceof Error ? e.message : String(e))
    } finally {
      saveInFlightRef.current = false
      setSaveActivity(null)
    }
  }

  const renameProject = (): void => {
    const current = state.manifest.name
    const next = window.prompt('工程名称（文件夹与 id 不变）：', current)?.trim()
    if (next && next !== current) session.dispatch(new RenameProjectCommand(next))
  }

  const exportZip = (): void => {
    const dir = dirHandleRef.current
    if (!dir) return
    if (
      editorDirty &&
      !window.confirm('有未保存改动，导出只读取磁盘内容。仍要导出吗？（建议先保存）')
    )
      return
    setExporting(true)
    setSaveErr('')
    void exportProjectZip(dir, state.manifest.id)
      .catch((error: unknown) => setSaveErr(error instanceof Error ? error.message : String(error)))
      .finally(() => setExporting(false))
  }

  const commands = createEditorAppCommandRegistry([
    {
      id: 'file.new',
      label: '新建工程…',
      icon: 'open',
      enabled: props.onBackToPicker !== undefined,
      scope: 'global',
      defaultPlacement: 'common',
      execute: () => props.onBackToPicker?.(),
    },
    {
      id: 'file.open',
      label: '打开工程…',
      icon: 'open',
      enabled: saveActivity === null,
      scope: 'global',
      defaultPlacement: 'common',
      execute: () => void runProj(openExistingProject),
    },
    {
      id: 'file.rename',
      label: '重命名工程…',
      icon: 'more',
      enabled: saveActivity === null,
      scope: 'global',
      execute: renameProject,
    },
    {
      id: 'file.save-as',
      label: '另存为…',
      icon: 'save',
      enabled: saveActivity === null && !exporting,
      scope: 'global',
      execute: () => void saveAs(),
    },
    {
      id: 'file.export',
      label: exporting ? '正在导出…' : '导出 ZIP…',
      icon: 'copy',
      enabled: Boolean(dirHandleRef.current) && saveActivity === null && !exporting,
      disabledReason: dirHandleRef.current ? undefined : '请先打开或保存本地工程',
      busy: exporting,
      scope: 'global',
      execute: exportZip,
    },
    {
      id: 'edit.undo',
      label: '撤销',
      icon: 'undo',
      shortcut: '⌘Z',
      enabled: session.canUndo() || (scriptV5Session?.canUndo() ?? false),
      scope: 'global',
      defaultPlacement: 'fixed',
      execute: undo,
    },
    {
      id: 'edit.redo',
      label: '重做',
      icon: 'redo',
      shortcut: '⇧⌘Z',
      enabled: session.canRedo() || (scriptV5Session?.canRedo() ?? false),
      scope: 'global',
      defaultPlacement: 'fixed',
      execute: redo,
    },
    {
      id: 'file.save',
      label: saveActivity ? '正在保存…' : '保存',
      icon: 'save',
      shortcut: '⌘S',
      enabled: editorDirty && saveActivity === null && !exporting,
      busy: saveActivity !== null,
      scope: 'global',
      defaultPlacement: 'fixed',
      execute: () => void save(),
    },
    ...createEditorLayoutCommands(layoutCommandHandlers, {
      outlinerVisible: !outlinerCollapsed,
      scriptPanelAvailable,
      scriptPanelVisible: drawer.open,
      inspectorVisible: !inspectorCollapsed,
    }),
  ])

  const commandItem = (id: string) => {
    const command = requireEditorAppCommand(commands, id)
    return {
      id: command.id,
      label: command.label,
      shortcut: command.shortcut,
      disabled: !command.enabled || command.busy,
      icon: command.id.startsWith('view.') ? command.icon : undefined,
      checked: command.pressed,
      onSelect: command.execute,
    }
  }
  const moduleMenus: DsMenuDefinition[] = EDITOR_MODULES.map((module) => ({
    id: `module.${module.id}`,
    label: module.id === 'project' ? '项目设置' : module.label,
    visibility: 'wide-medium',
    items: module.subpages.map((subpage) => {
      const next: EditorLocation =
        location.module === module.id && location.subpage === subpage.id
          ? location
          : { module: module.id, subpage: subpage.id }
      return {
        id: `${module.id}.${subpage.id}`,
        label: subpage.label,
        href: editorLocationHref(next, window.location.href),
        current: location.module === module.id && location.subpage === subpage.id,
      }
    }),
  }))
  const navigationMenu: DsMenuDefinition = {
    id: 'navigation',
    label: '导航',
    visibility: 'narrow',
    layout: 'section-grid',
    items: EDITOR_MODULES.flatMap((module) =>
      module.subpages.map((subpage) => ({
        id: `navigation.${module.id}.${subpage.id}`,
        label: subpage.label,
        section: module.id === 'project' ? '项目设置' : module.label,
        href: editorLocationHref(
          location.module === module.id && location.subpage === subpage.id
            ? location
            : { module: module.id, subpage: subpage.id },
          window.location.href,
        ),
        current: location.module === module.id && location.subpage === subpage.id,
      })),
    ),
  }
  const menus: DsMenuDefinition[] = [
    {
      id: 'file',
      label: '文件',
      items: [
        commandItem('file.new'),
        commandItem('file.open'),
        commandItem('file.rename'),
        commandItem('file.save'),
        commandItem('file.save-as'),
        commandItem('file.export'),
      ],
    },
    {
      id: 'edit',
      label: '编辑',
      items: [commandItem('edit.undo'), commandItem('edit.redo')],
    },
    {
      id: 'view',
      label: '视图',
      items: [
        commandItem('view.toggle-outliner'),
        commandItem('view.toggle-script-panel'),
        commandItem('view.toggle-inspector'),
        commandItem('view.reset-layout'),
      ],
    },
    ...moduleMenus,
    navigationMenu,
  ]

  const onHeaderNavigate = (event: React.MouseEvent<HTMLAnchorElement>, href: string): void => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    event.preventDefault()
    const url = new URL(href, window.location.href)
    openEditorSubpage(decodeEditorLocation(url.search))
  }

  useEffect(() => {
    document.title = `${state.manifest.name} · type-pal 编辑器`
  }, [state.manifest.name])

  return (
    <div className="editor ds-form-scope" aria-busy={saveActivity !== null ? true : undefined}>
      <EditorAppHeader
        projectName={state.manifest.name}
        menus={menus}
        commands={commands}
        toolbarCommandGroups={[
          ['view.toggle-outliner', 'view.toggle-script-panel', 'view.toggle-inspector'],
          ['edit.undo', 'edit.redo', 'file.save'],
        ]}
        onNavigate={onHeaderNavigate}
      />

      <div
        ref={bodyRef}
        tabIndex={-1}
        aria-label={`${activeSubpage.label}工作区`}
        inert={saveActivity !== null ? true : undefined}
        className={`body${outlinerCollapsed ? ' outliner-collapsed' : ''}${inspectorCollapsed ? ' inspector-collapsed' : ''}`}
        style={bodyStyle}
      >
        {objectTargetMissing ? (
          <MissingEditorTarget
            moduleLabel={activeModule.label}
            objectId={location.objectId!}
            onClear={() => focusCurrentObject(undefined)}
          />
        ) : activeSubpage.kind === 'map' ? (
          <MapMode
            scene={scene}
            scenes={state.scenes}
            session={session}
            assetBase={project.assetBase}
            assetCatalog={state.assetCatalog}
            assetReader={assetReader}
            projectMaps={state.maps}
            mapIndex={state.mapIndex}
            selectedMapId={defaultMapId}
            onSelectMap={(id) =>
              applyEditorLocation(
                id ? editorLinks.map(id) : { module: 'map', subpage: 'workspace' },
                'replace',
              )
            }
            onOpenScene={(id) => {
              setPlaceSceneId(id)
              applyEditorLocation(editorLinks.scene(id))
            }}
            tilesets={state.tilesets ?? []}
            stamps={state.stamps}
            onOpenStampLibrary={(id) => applyEditorLocation(editorLinks.stamp(id))}
            onStampSelectionChange={captureStampSelection}
            onRequestInspectorOpen={() => setInspectorCollapsed(false)}
            onWorkspaceNotice={setWorkspaceNotice}
          />
        ) : activeSubpage.kind === 'actor' ? (
          <ActorMode
            actors={state.actors}
            sprites={state.sprites}
            battleSprites={state.battleSprites}
            items={Object.fromEntries(state.items.map((i) => [i.id, i]))}
            skills={Object.fromEntries(state.skills.map((sk) => [sk.id, sk]))}
            locale={state.locale}
            assetBase={project.assetBase}
            session={session}
            levelUp={state.levelUp}
            startSkills={state.manifest.startWorld.learnedSkills}
            focusActorId={location.objectId}
            focusSection={location.actionId}
            onActorFocus={(id) => focusCurrentObject(id)}
            onSectionChange={(section) => {
              const actorId = location.objectId ?? state.actors[0]?.id
              if (actorId) applyEditorLocation(editorLinks.actor(actorId, section), 'replace')
            }}
            onOpenSprite={(id) => applyEditorLocation(editorLinks.actorSprite(id))}
            onOpenBattleSprite={(id) => applyEditorLocation(editorLinks.battleSprite(id))}
            assetCatalog={state.assetCatalog}
            assetReader={assetReader}
            onOpenSound={(id) => applyEditorLocation(editorLinks.sound(id))}
            onOpenImage={(id) => applyEditorLocation(editorLinks.image(id))}
            onOpenStartSettings={() =>
              applyEditorLocation({ module: 'project', subpage: 'entrypoint' })
            }
            onOpenActorReference={openActorReference}
          />
        ) : activeSubpage.kind === 'project' && activeSubpage.projectPage ? (
          <ProjectWorkbenchTab
            page={activeSubpage.projectPage}
            manifest={state.manifest}
            scenes={state.scenes}
            actors={state.actors}
            items={state.items}
            skills={state.skills}
            locale={state.locale}
            assetCatalog={state.assetCatalog}
            session={session}
            editorState={state}
            focusObjectId={location.objectId}
            onObjectFocus={focusCurrentObject}
            onOpenLocation={applyEditorLocation}
            assetReader={assetReader}
          />
        ) : activeSubpage.kind === 'data' && activeSubpage.dataPage ? (
          <DataMode
            itemList={state.items}
            sprites={state.sprites}
            battleSprites={state.battleSprites}
            skills={Object.fromEntries(state.skills.map((sk) => [sk.id, sk]))}
            items={Object.fromEntries(state.items.map((i) => [i.id, i]))}
            locale={state.locale}
            assetBase={project.assetBase}
            session={session}
            enemies={state.enemies ?? []}
            enemyTeams={state.enemyTeams ?? []}
            assetCatalog={state.assetCatalog}
            assetReader={assetReader}
            audioResolver={audioResolver}
            tilesets={state.tilesets ?? []}
            tilesetBlobs={state.tilesetBlobs}
            stamps={state.stamps}
            mapIndex={state.mapIndex}
            stampSelectionSource={stampSelectionSource}
            onStatusNotice={setWorkspaceNotice}
            scriptV5={
              scriptV5Session && scriptV5State
                ? { state: scriptV5State, session: scriptV5Session }
                : undefined
            }
            historyCoordinator={historyCoordinator}
            battleFields={state.battleFields ?? []}
            poisons={state.poisons ?? []}
            ambiences={state.ambiences ?? []}
            shops={state.shops ?? []}
            scenes={state.scenes}
            manifest={state.manifest}
            actors={state.actors}
            skillList={state.skills}
            onJumpToEvent={jumpToEvent}
            focusScriptId={activeSubpage.dataPage === 'scripts' ? location.objectId : undefined}
            focusScriptRevision={
              sharedScriptFocus && sharedScriptFocus.id === location.objectId
                ? sharedScriptFocus.revision
                : 0
            }
            focusScriptCommandPath={
              sharedScriptFocus && sharedScriptFocus.id === location.objectId
                ? sharedScriptFocus.path
                : undefined
            }
            tabBar={null}
            tab={activeSubpage.dataPage}
            focusObjectId={location.objectId}
            focusItemPrivateScript={
              itemPrivateScriptFocus?.itemId === location.objectId
                ? itemPrivateScriptFocus
                : undefined
            }
            focusActionId={location.actionId}
            onObjectFocus={focusCurrentObject}
            spriteDomain={location.domain}
            spriteView={location.view}
            onSpriteLocation={(domain, view, objectId, actionId) =>
              applyEditorLocation(
                {
                  module: 'asset',
                  subpage: 'sprite',
                  domain,
                  view,
                  ...(objectId ? { objectId } : {}),
                  ...(actionId ? { actionId } : {}),
                },
                'replace',
              )
            }
            onOpenSound={(id) => applyEditorLocation(editorLinks.sound(id))}
            onOpenImage={(id) => applyEditorLocation(editorLinks.image(id))}
            onOpenMap={(id) => applyEditorLocation(editorLinks.map(id))}
            onOpenTileset={(id) => applyEditorLocation(editorLinks.tileset(id))}
            onOpenStamp={(id) => applyEditorLocation(editorLinks.stamp(id))}
            onOpenBattleSprite={(id) => applyEditorLocation(editorLinks.battleSprite(id))}
            onOpenBattleField={(id) => applyEditorLocation(editorLinks.battleField(id))}
            onOpenBattleFieldReference={openBattleFieldReference}
            onOpenEnemyTeamReference={openEnemyTeamReference}
            onOpenEnemy={(id) => applyEditorLocation(editorLinks.enemy(id))}
            onOpenEnemyTeam={(id) => applyEditorLocation(editorLinks.enemyTeam(id))}
            onOpenBattleDataReference={openBattleDataReference}
            onOpenScript={openScriptReference}
            onOpenItemReference={openItemReference}
            onOpenProjectIssues={() =>
              applyEditorLocation({ module: 'project', subpage: 'advanced' })
            }
            onJumpWorldSpriteReference={jumpToWorldSpriteReference}
            onJumpWorldSpriteActionReference={jumpToWorldSpriteActionReference}
            onJumpWorldSpriteAutomaticScriptInstance={jumpToWorldSpriteAutomaticScriptInstance}
            onJumpBattleSpriteReference={jumpToBattleSpriteReference}
          />
        ) : (
          <>
            <div className="outliner">
              <DsListHeader
                title="场景"
                count={state.scenes.length}
                unit="个"
                actions={[
                  {
                    id: 'create-scene',
                    label: '新建场景',
                    icon: '＋',
                    onClick: () => {
                      const id = window.prompt('新场景 id(kebab-case):', '')?.trim()
                      if (!id) return
                      if (state.scenes.some((candidate) => candidate.id === id)) {
                        window.alert(`场景 "${id}" 已存在`)
                        return
                      }
                      session.dispatch(new AddSceneCommand(id, scene.mapId, scene.entry))
                      switchPlaceScene(id)
                    },
                  },
                ]}
              />
              <div className="scene-switch">
                <DsSelect
                  size="compact"
                  value={placeSceneId}
                  options={state.scenes.map((candidate) => ({
                    value: candidate.id,
                    label: `${candidate.id}${
                      candidate.id === state.manifest.entryScene ? '(入口)' : ''
                    } · ${candidate.entities.length} 实体`,
                  }))}
                  aria-label="切换编辑场景"
                  title="切换编辑场景"
                  searchable
                  onValueChange={switchPlaceScene}
                />
              </div>
              <div className="tree">
                <DsCatalogRow
                  selected={selected.kind === 'scene'}
                  leading={<span aria-hidden="true">🗺️</span>}
                  title={scene.id}
                  meta={`${scene.entities.length} 个实体`}
                  onClick={() => setSelected(SCENE_SELECTION)}
                />
                <DsCatalogGroupHeader
                  title="落点"
                  count={1 + Object.keys(scene.entries ?? {}).length}
                  actions={
                    <DsIconButton
                      size="compact"
                      variant="secondary"
                      icon="add"
                      label="新建命名落点"
                      onClick={() => {
                        const id = newSceneEntryId(scene)
                        session.dispatch(
                          new UpsertSceneEntryCommand(scene.id, id, {
                            label: `落点 ${Object.keys(scene.entries ?? {}).length + 1}`,
                            pos: { ...scene.entry.pos },
                            facing: scene.entry.facing,
                          }),
                        )
                        selectSceneEntry({ kind: 'named-entry', id })
                      }}
                    />
                  }
                />
                <button
                  type="button"
                  className={`node child${selected.kind === 'default-entry' ? ' sel' : ''}`}
                  onClick={() => selectSceneEntry(DEFAULT_ENTRY_SELECTION)}
                >
                  <span className="ico">📍</span>
                  <span>默认落点</span>
                  <span className="k">落点</span>
                </button>
                {Object.entries(scene.entries ?? {}).map(([id, entry]) => (
                  <button
                    type="button"
                    key={id}
                    className={`node child${
                      selected.kind === 'named-entry' && selected.id === id ? ' sel' : ''
                    }`}
                    onClick={() => selectSceneEntry({ kind: 'named-entry', id })}
                  >
                    <span className="ico">◇</span>
                    <span className="node-label">{sceneEntryOutlineLabel(entry)}</span>
                    <span className="k">落点</span>
                  </button>
                ))}
                <DsCatalogGroupHeader
                  title="实体"
                  count={scene.entities.length}
                  actions={
                    <DsIconButton
                      size="compact"
                      variant="secondary"
                      icon="add"
                      label="添加实体"
                      disabled={drawer.open}
                      onClick={() => setPlacingEntity(true)}
                    />
                  }
                />
                {sceneEntityGroups.map((group) =>
                  group.entities.length === 0 ? null : (
                    <div className="scene-entity-group" key={group.title}>
                      <DsCatalogGroupHeader
                        title={group.title}
                        count={group.entities.length}
                        level="secondary"
                      />
                      {group.entities.map((e) => (
                        <button
                          type="button"
                          key={e.id}
                          className={`node child${
                            selected.kind === 'entity' && selected.id === e.id ? ' sel' : ''
                          }`}
                          onClick={() => setSelected({ kind: 'entity', id: e.id })}
                        >
                          <span className="ico">
                            {isActorEntity(e) ? '👤' : 'sprite' in e ? '📦' : '⬚'}
                          </span>
                          <span>{e.id}</span>
                          <span
                            className="k"
                            title={
                              isActorEntity(e)
                                ? `角色来源：${actorsById[e.actor] ? lookupText(actorsById[e.actor]!.name, state.locale) : e.actor}`
                                : 'sprite' in e
                                  ? `资源来源：${state.sprites.find((sprite) => sprite.id === e.sprite)?.label || e.sprite}`
                                  : '无外观触发区'
                            }
                          >
                            {entityShapeLabel(e)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ),
                )}
              </div>
              <div className="layers">
                <div className="t">图层 / 显隐</div>
                <div className="layer-toggle-list">
                  <DsCheckbox
                    size="compact"
                    label="地板"
                    checked={canvasLayers.base}
                    onChange={(event) =>
                      setCanvasLayers({ ...canvasLayers, base: event.currentTarget.checked })
                    }
                  />
                  <DsCheckbox
                    size="compact"
                    label="高物（墙、家具）"
                    checked={canvasLayers.cover}
                    onChange={(event) =>
                      setCanvasLayers({ ...canvasLayers, cover: event.currentTarget.checked })
                    }
                  />
                  <DsCheckbox
                    size="compact"
                    label="落点"
                    checked={canvasLayers.entries}
                    onChange={(event) =>
                      setCanvasLayers({ ...canvasLayers, entries: event.currentTarget.checked })
                    }
                  />
                  <DsCheckbox
                    size="compact"
                    label="实体"
                    checked={canvasLayers.entities}
                    onChange={(event) =>
                      setCanvasLayers({ ...canvasLayers, entities: event.currentTarget.checked })
                    }
                  />
                  <DsCheckbox
                    size="compact"
                    label="禁入"
                    checked={canvasLayers.blocked}
                    onChange={(event) =>
                      setCanvasLayers({ ...canvasLayers, blocked: event.currentTarget.checked })
                    }
                  />
                  <div title="初始隐藏的实体（剧情后期才出场）画成半透明幽灵，可点选编排；游戏内不渲染">
                    <DsCheckbox
                      size="compact"
                      label="隐藏实体（透视）"
                      checked={canvasLayers.ghosts}
                      onChange={(event) =>
                        setCanvasLayers({ ...canvasLayers, ghosts: event.currentTarget.checked })
                      }
                    />
                  </div>
                  <DsCheckbox
                    size="compact"
                    label="网格"
                    checked={canvasLayers.grid}
                    onChange={(event) =>
                      setCanvasLayers({ ...canvasLayers, grid: event.currentTarget.checked })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="center">
              <div className="toolbar">
                {placingEntity ? (
                  <>
                    <span className="toolbar-status" role="status">
                      正在放置实体
                    </span>
                    <DsButton
                      size="compact"
                      variant="secondary"
                      onClick={() => setPlacingEntity(false)}
                    >
                      取消放置
                    </DsButton>
                    <span className="sep" />
                  </>
                ) : null}
                <DsButton
                  size="compact"
                  variant="danger"
                  onClick={deleteSelected}
                  disabled={!selEntity || placingEntity}
                  title="删除选中(Del)"
                >
                  🗑 删除
                </DsButton>
                <span className="sep" />
                <DsButton
                  size="compact"
                  variant="quiet"
                  aria-pressed={drawer.open}
                  onClick={toggleScriptPanel}
                  title="底部脚本抽屉:本场景 onEnter/实体触发/巡逻 就地编 + 预览"
                >
                  📜 脚本
                </DsButton>
                <span className="toolbar-hint">
                  {placingEntity ? '点画布放实体 · Esc 取消' : '点击选择 · 拖动移位 · Esc 取消选择'}
                </span>
              </div>
              {!drawer.open ? (
                <SceneCanvas
                  scene={scene}
                  sprites={state.sprites}
                  actorsById={actorsById}
                  leaderSpriteId={leaderSpriteId}
                  assetBase={project.assetBase}
                  assetCatalog={state.assetCatalog}
                  assetReader={assetReader}
                  projectMaps={state.maps}
                  mapIndex={state.mapIndex}
                  tilesets={state.tilesets ?? []}
                  selectedEntityId={selEntity?.id ?? null}
                  selectedAnchor={selectedAnchor}
                  placingEntity={placingEntity}
                  layers={canvasLayers}
                  onSelectEntity={(id) => setSelected({ kind: 'entity', id })}
                  onMoveEntity={moveEntity}
                  onSelectAnchor={(anchor) =>
                    setSelected(
                      anchor.kind === 'default'
                        ? DEFAULT_ENTRY_SELECTION
                        : { kind: 'named-entry', id: anchor.id },
                    )
                  }
                  onMoveAnchor={(anchor, cell) => {
                    if (anchor.kind === 'default') {
                      session.dispatch(
                        new UpdateSceneCommand(scene.id, {
                          entry: {
                            pos: { ...scene.entry.pos, ...cell },
                            facing: scene.entry.facing,
                          },
                        }),
                      )
                      return
                    }
                    const entry = scene.entries?.[anchor.id]
                    if (entry)
                      session.dispatch(
                        new UpsertSceneEntryCommand(scene.id, anchor.id, {
                          ...entry,
                          pos: { ...entry.pos, ...cell },
                        }),
                      )
                  }}
                  onAddAt={addAt}
                  onClearSelection={() => setSelected(SCENE_SELECTION)}
                />
              ) : scriptV5Session && scriptV5State ? (
                <CanonicalSceneScriptWorkspaceV5
                  scene={scene}
                  state={scriptV5State}
                  selectedEntityId={selEntity?.id ?? null}
                  locale={state.locale}
                  sprites={state.sprites}
                  actorsById={actorsById}
                  leaderSpriteId={leaderSpriteId}
                  assetBase={project.assetBase}
                  projectMaps={state.maps}
                  mapIndex={state.mapIndex}
                  tilesets={state.tilesets ?? []}
                  assetCatalog={state.assetCatalog}
                  assetReader={assetReader}
                  projectId={state.manifest.id}
                  layers={{
                    grid: canvasLayers.grid,
                    blocked: canvasLayers.blocked,
                    ghosts: canvasLayers.ghosts,
                  }}
                  editorContext={canonicalScriptEditorContextV5}
                  onDispatch={(command) => scriptV5Session.dispatch(command)}
                  onOpenReference={openCanonicalReference}
                  focusReference={canonicalReferenceFocus}
                  onError={(message) => setWorkspaceNotice({ kind: 'error', message })}
                />
              ) : (
                <ScriptDrawer
                  scene={scene}
                  scenes={state.scenes}
                  locale={state.locale}
                  selectedEntityId={selEntity?.id ?? null}
                  focusSrcKey={drawer.src}
                  focusInternalScriptId={drawer.internalScriptId}
                  focusCommandPath={drawer.commandPath}
                  focusCommandRevision={drawer.focusRevision}
                  sprites={state.sprites}
                  actorsById={actorsById}
                  battleSprites={state.battleSprites}
                  leaderSpriteId={leaderSpriteId}
                  assetBase={project.assetBase}
                  projectMaps={state.maps}
                  mapIndex={state.mapIndex}
                  tilesets={state.tilesets ?? []}
                  session={session}
                  assetCatalog={state.assetCatalog}
                  audioResolver={audioResolver}
                  assetReader={assetReader}
                  projectId={state.manifest.id}
                  ambiences={state.ambiences ?? []}
                  shops={state.shops ?? []}
                  layers={{
                    grid: canvasLayers.grid,
                    blocked: canvasLayers.blocked,
                    ghosts: canvasLayers.ghosts,
                  }}
                  onOpenScript={openSharedScript}
                  onOpenSound={(id) => applyEditorLocation(editorLinks.sound(id))}
                  onOpenImage={(id) => applyEditorLocation(editorLinks.image(id))}
                  onOpenBattleSprite={(id) => applyEditorLocation(editorLinks.battleSprite(id))}
                  onOpenSpriteAction={(spriteId, actionId) =>
                    applyEditorLocation(editorLinks.worldSpriteAction(spriteId, actionId))
                  }
                />
              )}
            </div>

            <div className={`inspector${!placingEntity && selEntity ? ' inspector--tabbed' : ''}`}>
              {placingEntity ? (
                <PlacePalette
                  actors={state.actors}
                  sprites={state.sprites}
                  locale={state.locale}
                  mode={placeMode}
                  selectedActorId={placeActorId}
                  selectedSpriteId={placeSpriteId}
                  zoneRanges={placeZoneRanges}
                  assetBase={project.assetBase}
                  assetReader={assetReader}
                  onModeChange={setPlaceMode}
                  onActorPick={setPlaceActorId}
                  onSpritePick={setPlaceSpriteId}
                  onZoneRangeChange={(on, range) =>
                    setPlaceZoneRanges((current) => ({ ...current, [on]: range }))
                  }
                />
              ) : selEntity ? (
                <SceneEntityInspectorTabs
                  key={`${scene.id}:${selEntity.id}`}
                  entity={selEntity}
                  locale={state.locale}
                  actorsById={actorsById}
                  properties={
                    <EntityInspector
                      entity={selEntity}
                      session={session}
                      sceneId={scene.id}
                      locale={state.locale}
                      actorsById={actorsById}
                      enemyTeams={state.enemyTeams ?? []}
                      battleFields={state.battleFields ?? []}
                      sprites={state.sprites}
                      assetBase={project.assetBase}
                      assetReader={assetReader}
                      canonicalScriptV5={!!scriptV5Session}
                      onJumpToEvent={jumpToEvent}
                      focusPageIndex={
                        entityPageFocus?.sceneId === scene.id &&
                        entityPageFocus.entityId === selEntity.id
                          ? entityPageFocus.pageIndex
                          : undefined
                      }
                      focusPageRevision={
                        entityPageFocus?.sceneId === scene.id &&
                        entityPageFocus.entityId === selEntity.id
                          ? entityPageFocus.revision
                          : undefined
                      }
                      onPageFocusConsumed={(revision) =>
                        setEntityPageFocus((current) =>
                          current?.revision === revision ? undefined : current,
                        )
                      }
                      onOpenSpriteAction={(spriteId, actionId) =>
                        applyEditorLocation(editorLinks.worldSpriteAction(spriteId, actionId))
                      }
                      onOpenActor={(actorId) => applyEditorLocation(editorLinks.actor(actorId))}
                      onOpenBattleField={(fieldId) =>
                        applyEditorLocation(editorLinks.battleField(fieldId))
                      }
                      onDelete={deleteSelected}
                      showHeader={false}
                    />
                  }
                  lifecycle={
                    <LifecycleCommandPanelV13
                      session={session}
                      sceneId={scene.id}
                      entityId={selEntity.id}
                    />
                  }
                  behavior={
                    scriptV5Session && scriptV5State && !drawer.open ? (
                      <div className="section script-v5-entity-section">
                        {canonicalEntityV5?.hostile ? (
                          <CanonicalHostileOnLoseEditorV5
                            value={canonicalEntityV5.hostile.onLose}
                            context={
                              canonicalScriptEditorContextV5
                                ? {
                                    ...canonicalScriptEditorContextV5,
                                    currentEntityId: selEntity.id,
                                  }
                                : undefined
                            }
                            focusCommandPath={
                              entityHostileFocus?.sceneId === scene.id &&
                              entityHostileFocus.entityId === selEntity.id
                                ? entityHostileFocus.commandPath
                                : undefined
                            }
                            focusRevision={
                              entityHostileFocus?.sceneId === scene.id &&
                              entityHostileFocus.entityId === selEntity.id
                                ? entityHostileFocus.revision
                                : undefined
                            }
                            onChange={(onLose) =>
                              scriptV5Session.dispatch(
                                new SetEntityHostileOnLoseV5Command(
                                  { scene: scene.id, entity: selEntity.id },
                                  onLose,
                                ),
                              )
                            }
                            onError={(message) => setWorkspaceNotice({ kind: 'error', message })}
                          />
                        ) : null}
                        {canonicalEntityV5 && canonicalPageV5 ? (
                          <div className="script-v5-page-binding">
                            <label>
                              <span className="field-label">实体页</span>
                              <select
                                className="in"
                                value={canonicalPageV5.id}
                                onChange={(event) => setSelectedPageV5(event.target.value)}
                              >
                                {(canonicalEntityV5.pages ?? []).map((page) => (
                                  <option key={page.id} value={page.id}>
                                    {page.label} · {page.id}
                                    {page.id === canonicalEntityV5.initialPage ? '（初始）' : ''}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {(['trigger', 'auto'] as const).map((channel) => {
                              const registry = canonicalEntityV5.behaviors?.[channel] ?? {}
                              return (
                                <label key={channel}>
                                  <span className="field-label">
                                    {channel === 'trigger' ? '触发行为槽' : '自动行为槽'}
                                  </span>
                                  <select
                                    className="in"
                                    value={canonicalPageV5[channel] ?? ''}
                                    onChange={(event) =>
                                      scriptV5Session.dispatch(
                                        new SetEntityPageBehaviorV5Command(
                                          { scene: scene.id, entity: selEntity.id },
                                          canonicalPageV5.id,
                                          channel,
                                          event.target.value || undefined,
                                        ),
                                      )
                                    }
                                  >
                                    <option value="">显式无行为</option>
                                    {Object.entries(registry)
                                      .sort(
                                        ([leftId, left], [rightId, right]) =>
                                          left.order - right.order || leftId.localeCompare(rightId),
                                      )
                                      .map(([id, behavior]) => (
                                        <option key={id} value={id}>
                                          {behavior.label} · {id}
                                        </option>
                                      ))}
                                  </select>
                                </label>
                              )
                            })}
                          </div>
                        ) : null}
                        <div
                          className="script-v5-channel-tabs"
                          role="tablist"
                          aria-label="行为通道"
                        >
                          {(['trigger', 'auto'] as const).map((channel) => (
                            <button
                              key={channel}
                              type="button"
                              role="tab"
                              aria-selected={scriptV5Channel === channel}
                              className={scriptV5Channel === channel ? 'active' : ''}
                              onClick={() => {
                                setScriptV5Channel(channel)
                                setSelectedBehaviorV5(undefined)
                              }}
                            >
                              {channel === 'trigger' ? '触发行为' : '自动行为'}
                            </button>
                          ))}
                        </div>
                        <ScriptV5BehaviorInspector
                          state={scriptV5State}
                          target={{ scene: scene.id, entity: selEntity.id }}
                          channel={scriptV5Channel}
                          selectedBehaviorId={selectedBehaviorV5}
                          onSelectBehavior={setSelectedBehaviorV5}
                          onDispatch={(command) => scriptV5Session.dispatch(command)}
                          editorContext={canonicalScriptEditorContextV5}
                          onOpenReference={openCanonicalReference}
                          onOpenFlow={(behaviorId) =>
                            setWorkspaceNotice({
                              kind: 'info',
                              message: `已选择 ${scriptV5Channel} 行为 ${behaviorId}；正文编辑器将在此 canonical 槽内打开。`,
                            })
                          }
                          onError={(message) => setWorkspaceNotice({ kind: 'error', message })}
                        />
                      </div>
                    ) : undefined
                  }
                />
              ) : selected.kind === 'default-entry' ? (
                <EntryInspector scene={scene} session={session} />
              ) : selected.kind === 'named-entry' && scene.entries?.[selected.id] ? (
                <NamedEntryInspector
                  key={`${scene.id}:${selected.id}`}
                  scene={scene}
                  entryId={selected.id}
                  entry={scene.entries[selected.id]!}
                  references={selectedEntryReferences}
                  session={session}
                  onJumpToEvent={jumpToEvent}
                  onOpenScript={openScriptReference}
                  onDelete={() => {
                    try {
                      session.dispatch(new DeleteSceneEntryCommand(scene.id, selected.id))
                      setSelected(SCENE_SELECTION)
                    } catch (error) {
                      window.alert(error instanceof Error ? error.message : String(error))
                    }
                  }}
                />
              ) : (
                <SceneInspector
                  scene={scene}
                  session={session}
                  assetCatalog={state.assetCatalog}
                  audioResolver={audioResolver}
                  maps={state.mapIndex.maps}
                  projectMaps={state.maps}
                  tilesets={state.tilesets ?? []}
                  battleFields={state.battleFields ?? []}
                  onOpenMap={(mapId) => applyEditorLocation(editorLinks.map(mapId))}
                  onOpenBattleField={(fieldId) =>
                    applyEditorLocation(editorLinks.battleField(fieldId))
                  }
                />
              )}
            </div>
          </>
        )}

        <PanelResizeHandle
          orientation="vertical"
          className="app-outliner-resizer"
          value={visibleOutlinerWidth}
          min={outlinerCollapsed ? 0 : OUTLINER_MIN_WIDTH}
          max={outlinerCollapsed ? 0 : outlinerResizeMax}
          resizeLabel="调整左侧面板宽度"
          disabled={outlinerCollapsed}
          onReset={() => setOutlinerWidth(OUTLINER_DEFAULT_WIDTH)}
          onResize={(delta) =>
            setOutlinerWidth((current) =>
              clampPanelSize(current + delta, OUTLINER_MIN_WIDTH, outlinerResizeMax),
            )
          }
        />
        <PanelResizeHandle
          orientation="vertical"
          className="app-inspector-resizer"
          value={visibleInspectorWidth}
          min={inspectorCollapsed ? 0 : INSPECTOR_MIN_WIDTH}
          max={inspectorCollapsed ? 0 : inspectorResizeMax}
          resizeLabel="调整右侧面板宽度"
          disabled={inspectorCollapsed}
          onReset={() => setInspectorWidth(INSPECTOR_DEFAULT_WIDTH)}
          onResize={(delta) =>
            setInspectorWidth((current) =>
              clampPanelSize(current - delta, INSPECTOR_MIN_WIDTH, inspectorResizeMax),
            )
          }
        />
      </div>

      <div className="valbar" inert={saveActivity !== null ? true : undefined}>
        {statusIssues.length > 0 ? (
          <>
            <span className="pill warn">⚠ {statusIssues.length} 项待处理</span>
            <span className="msg">
              {statusIssues
                .slice(0, 2)
                .map((i) => i.message)
                .join(' · ')}
            </span>
          </>
        ) : (
          <span className="pill" style={{ color: 'var(--ok)' }}>
            ✓ 引用与工程诊断无问题
          </span>
        )}
        {workspaceNotice ? (
          <span className="valbar-status" role="status" aria-live="polite">
            <span className={`pill${workspaceNotice.kind === 'error' ? ' warn' : ''}`}>
              {workspaceNotice.kind === 'error' ? '⚠' : 'ⓘ'} {activeSubpage.label}
            </span>
            <span className="msg">{workspaceNotice.message}</span>
          </span>
        ) : null}
        <span className="spacer" />
        <span
          role={saveErr ? 'alert' : undefined}
          style={{ color: saveErr ? 'var(--err)' : 'var(--faint)', fontSize: 11 }}
        >
          {saveErr ? `保存失败: ${saveErr}` : editorDirty ? '未保存改动' : '已保存'}
        </span>
      </div>

      {saveActivity && saveActivity.phase !== 'choosing-directory' ? (
        <ProjectSaveDialog activity={saveActivity} />
      ) : null}
    </div>
  )
}

function MissingEditorTarget(props: {
  moduleLabel: string
  objectId: string
  onClear: () => void
}) {
  return (
    <>
      <div className="outliner">
        <div className="pane-h">
          <span className="t">{props.moduleLabel}</span>
        </div>
      </div>
      <div className="center missing-editor-target">
        <strong>目标不存在</strong>
        <code>{props.objectId}</code>
        <button type="button" className="tool" onClick={props.onClear}>
          打开当前页面
        </button>
      </div>
      <div className="inspector">
        <div className="insp-empty">引用目标可能已删除或尚未载入。</div>
      </div>
    </>
  )
}

const KIND_ICON: Record<string, string> = { directional: '🚶', static: '🪑', loop: '🔥' }

/** 放置 palette:表现形态与外观来源分开，四种模式都落回现有 EntityRef。 */
function PlacePalette(props: {
  actors: ActorDef[]
  sprites: SpriteDef[]
  locale: Locale
  mode: EntityPlacementMode
  selectedActorId: string
  selectedSpriteId: string
  zoneRanges: { touch: number; interact: number }
  assetBase: AssetBase
  assetReader: EditorAssetReader
  onModeChange: (mode: EntityPlacementMode) => void
  onActorPick: (id: string) => void
  onSpritePick: (id: string) => void
  onZoneRangeChange: (on: 'touch' | 'interact', range: number) => void
}) {
  const {
    actors,
    sprites,
    locale,
    mode,
    selectedActorId,
    selectedSpriteId,
    zoneRanges,
    assetBase,
    assetReader,
    onModeChange,
    onActorPick,
    onSpritePick,
    onZoneRangeChange,
  } = props
  const [filter, setFilter] = useState('')
  const spriteById = new Map(sprites.map((sprite) => [sprite.id, sprite]))
  const visibleMode = mode === 'actor' || mode === 'sprite'
  const triggerOn = mode === 'interact-zone' ? 'interact' : 'touch'
  const selectedActor = actors.find((actor) => actor.id === selectedActorId)
  const selectedSprite = sprites.find((sprite) => sprite.id === selectedSpriteId)
  const shownSprites = sprites.filter(
    (s) => !filter || s.id.includes(filter) || s.label.includes(filter) || s.asset.includes(filter),
  )
  const shownActors = actors.filter((actor) => {
    if (!filter) return true
    const name = lookupText(actor.name, locale)
    return actor.id.includes(filter) || actor.spriteId.includes(filter) || name.includes(filter)
  })
  const summary =
    mode === 'actor'
      ? `预制人物 · ${selectedActor ? lookupText(selectedActor.name, locale) : '未选择'}`
      : mode === 'sprite'
        ? `自定义实体 · ${selectedSprite?.label || selectedSprite?.id || '未选择'}`
        : `触发区 · ${triggerOn === 'touch' ? '触碰' : '交互'} · ${zoneRanges[triggerOn]} 格`
  return (
    <>
      <div className="insp-head">
        <div className="what">添加实体</div>
        <div className="who">{summary}</div>
      </div>
      <div className="section">
        <fieldset className="place-segments">
          <legend className="place-control-legend">创建方式</legend>
          <button
            type="button"
            className={mode === 'actor' ? 'active' : ''}
            aria-pressed={mode === 'actor'}
            onClick={() => onModeChange('actor')}
          >
            预制人物
          </button>
          <button
            type="button"
            className={mode === 'sprite' ? 'active' : ''}
            aria-pressed={mode === 'sprite'}
            onClick={() => onModeChange('sprite')}
          >
            自定义实体
          </button>
          <button
            type="button"
            className={!visibleMode ? 'active' : ''}
            aria-pressed={!visibleMode}
            onClick={() => onModeChange(mode === 'interact-zone' ? 'interact-zone' : 'touch-zone')}
          >
            触发区
          </button>
        </fieldset>

        {visibleMode ? (
          <>
            <input
              className="in"
              aria-label="过滤可见实体来源"
              placeholder="过滤名称、ID 或精灵号"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </>
        ) : (
          <>
            <fieldset className="place-segments secondary">
              <legend className="place-control-legend">触发方式</legend>
              <button
                type="button"
                className={triggerOn === 'touch' ? 'active' : ''}
                aria-pressed={triggerOn === 'touch'}
                onClick={() => onModeChange('touch-zone')}
              >
                触碰
              </button>
              <button
                type="button"
                className={triggerOn === 'interact' ? 'active' : ''}
                aria-pressed={triggerOn === 'interact'}
                onClick={() => onModeChange('interact-zone')}
              >
                交互
              </button>
            </fieldset>
            <label className="place-range-field">
              <span>范围</span>
              <input
                className="in mono"
                type="number"
                min={0}
                max={99}
                value={zoneRanges[triggerOn]}
                onChange={(event) => {
                  if (Number.isFinite(event.target.valueAsNumber))
                    onZoneRangeChange(triggerOn, Math.max(0, event.target.valueAsNumber))
                }}
              />
              <span>格</span>
            </label>
          </>
        )}

        {mode === 'actor' && (
          <div className="palette-list">
            {shownActors.map((actor) => {
              const sprite = spriteById.get(actor.spriteId)
              return (
                <button
                  type="button"
                  key={actor.id}
                  className={`palette-row${actor.id === selectedActorId ? ' sel' : ''}`}
                  onClick={() => onActorPick(actor.id)}
                >
                  {sprite ? (
                    <SpriteThumb
                      assetBase={assetBase}
                      assetReader={assetReader}
                      asset={sprite.asset}
                      revision={assetReader.record(sprite.asset, 'sprite').sha256}
                      label={sprite.label || sprite.id}
                    />
                  ) : (
                    <span className="sprite-thumb-placeholder" aria-hidden="true" />
                  )}
                  <span className="nm">
                    {lookupText(actor.name, locale)}
                    <span className="sub">预制人物 · {actor.id}</span>
                  </span>
                </button>
              )
            })}
            {shownActors.length === 0 && <div className="insp-empty">(无匹配)</div>}
          </div>
        )}

        {mode === 'sprite' && (
          <div className="palette-list">
            {shownSprites.map((s) => (
              <button
                type="button"
                key={s.id}
                className={`palette-row${s.id === selectedSpriteId ? ' sel' : ''}`}
                onClick={() => onSpritePick(s.id)}
              >
                <SpriteThumb
                  assetBase={assetBase}
                  assetReader={assetReader}
                  asset={s.asset}
                  revision={assetReader.record(s.asset, 'sprite').sha256}
                  label={s.label || s.id}
                />
                <span className="nm">
                  {s.label || s.id}
                  <span className="sub">
                    自定义实体 · {KIND_ICON[s.layout.kind] ?? ''} {s.asset}
                  </span>
                </span>
              </button>
            ))}
            {shownSprites.length === 0 && <div className="insp-empty">(无匹配)</div>}
          </div>
        )}
      </div>
    </>
  )
}

function SceneEntityInspectorTabs(props: {
  entity: EntityDef
  locale: Locale
  actorsById: Record<string, ActorDef>
  properties: ReactNode
  lifecycle: ReactNode
  behavior?: ReactNode
}) {
  const id = useId()
  const [activeId, setActiveId] = useState('properties')
  const actorName =
    isActorEntity(props.entity) && props.actorsById[props.entity.actor]
      ? lookupText(props.actorsById[props.entity.actor]!.name, props.locale)
      : undefined
  const items = [
    { id: 'properties', label: '属性', panel: props.properties },
    { id: 'lifecycle', label: '生命周期', panel: props.lifecycle },
    ...(props.behavior ? [{ id: 'behavior', label: '行为', panel: props.behavior }] : []),
  ]

  useEffect(() => {
    if (activeId === 'behavior' && !props.behavior) setActiveId('properties')
  }, [activeId, props.behavior])

  return (
    <div className="scene-entity-inspector">
      <div className="insp-head">
        <div className="what">选中实体</div>
        <div className="who">
          {actorName ?? props.entity.id}
          {actorName ? <code> {props.entity.id}</code> : null}
        </div>
      </div>
      <DsInspectorTabs
        id={`${id}-scene-entity`}
        label="实体属性分区"
        items={items}
        activeId={activeId}
        onChange={setActiveId}
      />
    </div>
  )
}

function EntityInspector(props: {
  entity: EntityDef
  session: EditSession
  sceneId: string
  locale: Locale
  actorsById: Record<string, ActorDef>
  /** 敌队清单(B9 敌对行为 team 下拉;id 约定 team-<N>,引擎按 N 查)。 */
  enemyTeams: EnemyTeamDef[]
  battleFields: readonly BattleFieldDef[]
  /** 精灵注册表(sprite 来源实体换外观下拉)。 */
  sprites: SpriteDef[]
  assetBase: AssetBase
  assetReader: EditorAssetReader
  /** v5 canonical 脚本由独立具名行为检查器编辑，禁止兼容壳重新创建 legacy stage。 */
  canonicalScriptV5?: boolean
  /** 跳事件模式定位此实体的触发/巡逻脚本(E2)。 */
  onJumpToEvent: (sceneId: string, srcKey: string) => void
  /** 从动作引用跳转时精确打开对应实体页。 */
  focusPageIndex?: number
  focusPageRevision?: number
  onPageFocusConsumed?: (revision: number) => void
  onOpenSpriteAction?: (spriteId: string, actionId: string) => void
  onOpenActor?: (actorId: string) => void
  onOpenBattleField?: (fieldId: number) => void
  onDelete: () => void
  showHeader?: boolean
}) {
  const {
    entity,
    session,
    sceneId,
    locale,
    actorsById,
    enemyTeams,
    battleFields,
    sprites,
    assetBase,
    assetReader,
    canonicalScriptV5,
    onJumpToEvent,
    focusPageIndex,
    focusPageRevision,
    onPageFocusConsumed,
    onOpenSpriteAction,
    onOpenActor,
    onOpenBattleField,
    onDelete,
    showHeader = true,
  } = props
  const [spriteViewerOpen, setSpriteViewerOpen] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  // 实体的中文显示名:actor 实体解引用到角色名(entity.actor 是 id 引用),否则回落实体 id。
  const actorName =
    isActorEntity(entity) && actorsById[entity.actor]
      ? lookupText(actorsById[entity.actor]!.name, locale)
      : undefined
  const setPos = (patch: Partial<GridPos>): void => {
    session.dispatch(new MoveEntityCommand(sceneId, entity.id, { ...entity.pos, ...patch }))
  }
  const spriteId = resolveEntitySpriteId(entity, actorsById)
  const spriteDef = spriteId ? sprites.find((sprite) => sprite.id === spriteId) : undefined
  const pageCount = Math.max(1, entity.pages?.length ?? 0)
  const hostileV13 = entity.hostile as HostileBehaviorV13 | undefined
  useEffect(() => {
    if (!entity.id) return
    setPageIndex((current) =>
      current >= 0 && current < Math.max(1, entity.pages?.length ?? 0) ? current : 0,
    )
  }, [entity.id, entity.pages?.length])
  useEffect(() => {
    if (focusPageRevision == null || focusPageIndex == null) return
    if (focusPageIndex < 0 || focusPageIndex >= Math.max(1, entity.pages?.length ?? 0)) return
    setPageIndex(focusPageIndex)
    onPageFocusConsumed?.(focusPageRevision)
  }, [entity.pages?.length, focusPageIndex, focusPageRevision, onPageFocusConsumed])
  const setPageAnimation = (
    animation: NonNullable<EntityDef['pages']>[number]['animation'],
  ): void => {
    const pages = structuredClone(entity.pages ?? [])
    while (pages.length <= pageIndex) pages.push({})
    const page = { ...pages[pageIndex] }
    if (animation) page.animation = animation
    else delete page.animation
    pages[pageIndex] = page
    const nextPages = pages.every((candidate) => Object.keys(candidate).length === 0)
      ? undefined
      : pages
    session.dispatch(new UpdateEntityCommand(sceneId, entity.id, { pages: nextPages }))
  }
  const facing = entity.facing ?? 'down'
  const dispatchHostile = (h: unknown): void => {
    session.dispatch(new UpdateEntityCommand(sceneId, entity.id, { hostile: h as HostileBehavior }))
  }
  /** hostile 子字段更新(整对象替换;undefined 值的键显式删,保 JSON 落盘干净)。 */
  const setHostile = (patch: Record<string, unknown>): void => {
    if (!entity.hostile) return
    const next = { ...(entity.hostile as unknown as Record<string, unknown>), ...patch }
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete next[key]
    }
    dispatchHostile(next)
  }
  return (
    <>
      {showHeader ? (
        <div className="insp-head">
          <div className="what">选中实体</div>
          <div className="who">
            {actorName ?? entity.id}
            {actorName && <code> {entity.id}</code>}
          </div>
        </div>
      ) : null}
      <div className="section">
        <h4>
          页面默认动作 <span className="hint2">动作资产在精灵库定义</span>
        </h4>
        {pageCount > 1 ? (
          <div className="field">
            <span className="field-label">实体页</span>
            <select
              className="in"
              aria-label="选择实体页"
              value={pageIndex}
              onChange={(event) => setPageIndex(Number(event.target.value))}
            >
              {Array.from({ length: pageCount }, (_, index) => (
                <option key={index} value={index}>
                  第 {index + 1} 页
                  {entity.pages?.[index]?.state === undefined
                    ? ''
                    : ` · state=${entity.pages[index]!.state}`}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <EntityPageAnimationEditor
          page={entity.pages?.[pageIndex]}
          pageIndex={pageIndex}
          sprite={spriteDef}
          onChange={setPageAnimation}
          onOpenAction={onOpenSpriteAction}
        />
      </div>
      <div className="section">
        <h4>外观 / 交互</h4>
        {spriteDef && (
          <div className="field entity-preview-field">
            <span className="field-label">预览</span>
            <div className="entity-sprite-preview">
              <SpriteThumb
                assetBase={assetBase}
                assetReader={assetReader}
                asset={spriteDef.asset}
                revision={assetReader.record(spriteDef.asset, 'sprite').sha256}
                frameIndex={idleFrameIndex(spriteDef.layout, facing)}
                size={80}
                label={spriteDef.label || spriteDef.id}
                align="center"
              />
              <button
                type="button"
                className="entity-preview-zoom"
                aria-label={`放大查看 ${spriteDef.label || spriteDef.id}`}
                title="放大查看"
                onClick={() => setSpriteViewerOpen(true)}
              >
                <span className="preview-zoom-icon" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        {/* actor 引用只读解算外观;普通 sprite 实体可换精灵;朝向暂只读。 */}
        {isActorEntity(entity) ? (
          <div className="field actor-entity-source">
            <span className="field-label">预制人物（共享身份与资源）</span>
            <div className="in pick actor-entity-source-row">
              <span>{actorName ?? entity.actor}</span>
              <span className="meta">→ {spriteId ?? '(未解析)'}</span>
              <button
                type="button"
                className="mini"
                aria-label={`打开人物 ${entity.actor}`}
                title="在人物库打开"
                onClick={() => onOpenActor?.(entity.actor)}
              >
                ↗
              </button>
            </div>
            <p className="hint">位置、朝向、碰撞、显隐、页面脚本和敌对配置只属于当前场景实例。</p>
            <button
              type="button"
              className="tool"
              onClick={() => session.dispatch(new DetachActorEntityCommand(sceneId, entity.id))}
            >
              解除人物关联，保留当前精灵
            </button>
          </div>
        ) : 'sprite' in entity ? (
          <div className="field">
            <span className="field-label">精灵</span>
            <select
              className="in"
              value={entity.sprite}
              onChange={(e) =>
                session.dispatch(new SetEntitySpriteCommand(sceneId, entity.id, e.target.value))
              }
            >
              {!sprites.some((sp) => sp.id === entity.sprite) && (
                <option value={entity.sprite}>{entity.sprite} (缺)</option>
              )}
              {sprites.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.label || sp.id} · {sp.asset}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="field">
            <span className="field-label">触发区</span>
            <div className="in pick">
              <span>无外观</span>
              <span className="meta">触发器 / 脚本锚</span>
            </div>
          </div>
        )}
        <div className="field">
          <span className="field-label">朝向</span>
          <div className="in pick">
            <span>{facing}</span>
            <span className="meta">C1 可编</span>
          </div>
        </div>
        <div className="field">
          <span className="field-label">碰撞</span>
          <DsCheckbox
            label="阻挡通行"
            checked={entity.collide === true}
            onChange={(event) =>
              session.dispatch(
                new UpdateEntityCommand(sceneId, entity.id, {
                  collide: event.currentTarget.checked,
                }),
              )
            }
          />
        </div>
        <div className="field">
          <span className="field-label">初始显隐</span>
          <div title="隐藏 = 游戏里初始不出现(剧情脚本 setEntityState 可显形);编辑器「隐藏实体(透视)」图层仍半透明可见">
            <DsCheckbox
              label="初始隐藏（待剧情出场）"
              checked={entity.hidden === true}
              onChange={(event) =>
                session.dispatch(
                  new UpdateEntityCommand(sceneId, entity.id, {
                    hidden: event.currentTarget.checked ? true : undefined,
                  }),
                )
              }
            />
          </div>
        </div>
      </div>
      <div className="section">
        <h4>
          位置<span className="b2"> · 菱形轴</span>
        </h4>
        <div className="posrow">
          <div className="cell">
            <span>col</span>
            <input
              className="in mono"
              type="number"
              value={entity.pos.col}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) && setPos({ col: e.target.valueAsNumber })
              }
            />
          </div>
          <div className="cell">
            <span>row</span>
            <input
              className="in mono"
              type="number"
              value={entity.pos.row}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) && setPos({ row: e.target.valueAsNumber })
              }
            />
          </div>
          <div className="cell">
            <span>height</span>
            <input
              className="in mono"
              type="number"
              value={entity.pos.height}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) &&
                setPos({ height: e.target.valueAsNumber })
              }
            />
          </div>
        </div>
      </div>
      <div className="section">
        <h4>
          敌对行为<span className="b2"> · B9 数据驱动</span>
        </h4>
        <div className="field">
          <span className="field-label">敌对</span>
          <DsCheckbox
            label="遇敌开战（触碰即开始战斗）"
            checked={!!entity.hostile}
            onChange={(event) =>
              dispatchHostile(
                event.currentTarget.checked
                  ? {
                      enemyTeamId: enemyTeams[0]?.id ?? 'missing-enemy-team',
                      onVictory: { kind: 'remove' },
                      onPlayerFlee: { kind: 'remain' },
                    }
                  : undefined,
              )
            }
          />
        </div>
        {entity.hostile && (
          <>
            <div className="field">
              <span className="field-label">敌队</span>
              <select
                className="in"
                value={entity.hostile.enemyTeamId}
                onChange={(e) => setHostile({ enemyTeamId: e.target.value })}
              >
                {!enemyTeams.some((team) => team.id === entity.hostile!.enemyTeamId) && (
                  <option value={entity.hostile.enemyTeamId}>
                    {entity.hostile.enemyTeamId} (缺数据)
                  </option>
                )}
                {enemyTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.id}({team.slots.length} 槽)
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <span className="field-label">战场</span>
              <BattleFieldPicker
                value={entity.hostile.battleFieldId}
                fields={battleFields}
                unsetLabel="跟随场景默认战场"
                ariaLabel="敌对实体战场"
                onOpen={onOpenBattleField}
                onChange={(battleFieldId) => setHostile({ battleFieldId })}
              />
            </div>
            <div className="field">
              <span className="field-label">追逐</span>
              <DsCheckbox
                label="见人就追（不勾为原地怪）"
                checked={!!entity.hostile.chase}
                onChange={(event) =>
                  setHostile({
                    chase: event.currentTarget.checked ? { range: 6, speed: 2 } : undefined,
                  })
                }
              />
            </div>
            {entity.hostile.chase && (
              <div className="hostile-chase-options">
                <div className="posrow hostile-chase-metrics">
                  <div className="cell">
                    <span>range 格</span>
                    <input
                      className="in mono"
                      type="number"
                      value={entity.hostile.chase.range}
                      onChange={(e) =>
                        Number.isFinite(e.target.valueAsNumber) &&
                        setHostile({
                          chase: { ...entity.hostile!.chase!, range: e.target.valueAsNumber },
                        })
                      }
                    />
                  </div>
                  <div className="cell">
                    <span>speed</span>
                    <input
                      className="in mono"
                      type="number"
                      value={entity.hostile.chase.speed}
                      onChange={(e) =>
                        Number.isFinite(e.target.valueAsNumber) &&
                        setHostile({
                          chase: { ...entity.hostile!.chase!, speed: e.target.valueAsNumber },
                        })
                      }
                    />
                  </div>
                </div>
                <DsCheckbox
                  size="compact"
                  label="追击时忽略地形与阻挡实体"
                  checked={entity.hostile.chase.floating === true}
                  onChange={(event) => {
                    const chase = { ...entity.hostile!.chase!, floating: true }
                    if (!event.currentTarget.checked)
                      delete (chase as { floating?: boolean }).floating
                    setHostile({ chase })
                  }}
                />
              </div>
            )}
            <>
              <div className="field">
                <span className="field-label">胜利后</span>
                <select
                  className="in"
                  value={hostileV13?.onVictory.kind ?? 'remove'}
                  onChange={(e) => {
                    const kind = e.target.value as HostileBehaviorV13['onVictory']['kind']
                    if (kind === 'hide')
                      setHostile({
                        onVictory: {
                          kind,
                          ticks:
                            hostileV13?.onVictory.kind === 'hide'
                              ? hostileV13.onVictory.ticks
                              : 800,
                        },
                      })
                    else setHostile({ onVictory: { kind } })
                  }}
                >
                  <option value="remove">隐藏后从场景移除</option>
                  <option value="hide">隐藏后离屏重现</option>
                  <option value="remain">保持原样</option>
                </select>
              </div>
              {hostileV13?.onVictory.kind === 'hide' ? (
                <div className="field">
                  <span className="field-label">胜利隐藏 ticks</span>
                  <input
                    className="in mono"
                    type="number"
                    min={1}
                    step={1}
                    value={hostileV13.onVictory.ticks}
                    onChange={(e) => {
                      const ticks = e.target.valueAsNumber
                      if (Number.isSafeInteger(ticks) && ticks > 0)
                        setHostile({ onVictory: { kind: 'hide', ticks } })
                    }}
                  />
                </div>
              ) : null}
              <div className="field">
                <span className="field-label">逃跑后</span>
                <select
                  className="in"
                  value={hostileV13?.onPlayerFlee.kind ?? 'remain'}
                  onChange={(e) => {
                    const kind = e.target.value as HostileBehaviorV13['onPlayerFlee']['kind']
                    if (kind === 'suspend')
                      setHostile({
                        onPlayerFlee: {
                          kind,
                          ticks:
                            hostileV13?.onPlayerFlee.kind === 'suspend'
                              ? hostileV13.onPlayerFlee.ticks
                              : 15,
                        },
                      })
                    else setHostile({ onPlayerFlee: { kind } })
                  }}
                >
                  <option value="remain">保持原样</option>
                  <option value="suspend">短暂暂停自动行为</option>
                </select>
              </div>
              {hostileV13?.onPlayerFlee.kind === 'suspend' ? (
                <div className="field">
                  <span className="field-label">逃跑暂停 ticks</span>
                  <input
                    className="in mono"
                    type="number"
                    min={1}
                    step={1}
                    value={hostileV13.onPlayerFlee.ticks}
                    onChange={(e) => {
                      const ticks = e.target.valueAsNumber
                      if (Number.isSafeInteger(ticks) && ticks > 0)
                        setHostile({ onPlayerFlee: { kind: 'suspend', ticks } })
                    }}
                  />
                </div>
              ) : null}
            </>
            {!canonicalScriptV5 ? (
              <>
                <div className="field">
                  <span className="field-label">战败</span>
                  <select
                    className="in"
                    value={Array.isArray(entity.hostile.onLose) ? 'custom' : ''}
                    onChange={(e) =>
                      setHostile({ onLose: e.target.value === 'custom' ? [] : undefined })
                    }
                  >
                    <option value="">游戏结束(渐红读档,默认)</option>
                    <option value="custom">自定义指令(剧情战输了也继续)</option>
                  </select>
                </div>
                {Array.isArray(entity.hostile.onLose) ? (
                  <textarea
                    className="in cf-ta"
                    key={`${entity.id}-onlose`}
                    defaultValue={JSON.stringify(entity.hostile.onLose, null, 2)}
                    placeholder='[{ "kind": "dialog", ... }] — Command[] JSON'
                    onBlur={(e) => {
                      try {
                        const v = JSON.parse(e.target.value) as HostileBehavior['onLose']
                        if (Array.isArray(v)) setHostile({ onLose: v })
                      } catch {
                        /* 解析失败不落盘;失焦保持原文供修 */
                      }
                    }}
                    spellCheck={false}
                  />
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>
      {!canonicalScriptV5 ? (
        <div className="section">
          <h4>
            行为脚本 <span className="hint2">底部抽屉就地编(E2/E4)</span>
          </h4>
          {/* 一眼徽标 + 单入口(创建/切换动作在抽屉头部,不重复) */}
          <div className="lrow" style={{ gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--dim)', fontSize: 12 }}>
              {entity.pages?.[pageIndex]?.trigger
                ? `🔗 ${entity.pages[pageIndex]!.trigger!.on === 'interact' ? '交互' : '触碰'}·${entity.pages[pageIndex]!.trigger!.stages.length}段`
                : null}
              {entity.pages?.[pageIndex]?.auto
                ? ` 🔁 巡逻·${entity.pages[pageIndex]!.auto!.stages.length}段`
                : null}
              {!entity.pages?.[pageIndex]?.trigger && !entity.pages?.[pageIndex]?.auto
                ? '(无脚本)'
                : null}
            </span>
            {entity.pages?.[pageIndex]?.trigger || entity.pages?.[pageIndex]?.auto ? (
              <button
                type="button"
                className="mini-txt"
                onClick={() =>
                  onJumpToEvent(
                    sceneId,
                    entity.pages?.[pageIndex]?.trigger
                      ? `${entity.id}:trigger${pageIndex === 0 ? '' : `@${pageIndex}`}`
                      : `${entity.id}:auto${pageIndex === 0 ? '' : `@${pageIndex}`}`,
                  )
                }
              >
                📜 编辑脚本
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="mini-txt"
                  onClick={() => {
                    session.dispatch(
                      new CreateScriptSourceCommand(sceneId, {
                        kind: 'trigger',
                        entityId: entity.id,
                        ...(pageIndex === 0 ? {} : { pageIndex }),
                      }),
                    )
                    onJumpToEvent(
                      sceneId,
                      `${entity.id}:trigger${pageIndex === 0 ? '' : `@${pageIndex}`}`,
                    )
                  }}
                >
                  ＋触发
                </button>
                <button
                  type="button"
                  className="mini-txt"
                  onClick={() => {
                    session.dispatch(
                      new CreateScriptSourceCommand(sceneId, {
                        kind: 'auto',
                        entityId: entity.id,
                        ...(pageIndex === 0 ? {} : { pageIndex }),
                      }),
                    )
                    onJumpToEvent(
                      sceneId,
                      `${entity.id}:auto${pageIndex === 0 ? '' : `@${pageIndex}`}`,
                    )
                  }}
                >
                  ＋巡逻
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
      <div className="section" style={{ borderBottom: 0 }}>
        <button type="button" className="tool" style={{ color: 'var(--err)' }} onClick={onDelete}>
          🗑 删除此实体
        </button>
      </div>
      {spriteViewerOpen && spriteDef && (
        <SpriteImageViewer
          assetBase={assetBase}
          assetReader={assetReader}
          asset={spriteDef.asset}
          revision={assetReader.record(spriteDef.asset, 'sprite').sha256}
          frameIndex={idleFrameIndex(spriteDef.layout, facing)}
          label={spriteDef.label || spriteDef.id}
          onClose={() => setSpriteViewerOpen(false)}
        />
      )}
    </>
  )
}

/**
 * 进场点 inspector —— 队伍**正常走进**本场景的出生格 + 朝向(scene.entry)。
 * 坐标可数字直填,也可画布拖红针(两条路都走 UpdateSceneCommand,入 undo)。
 * 与「命名入口」(别处 loadScene 指定落点)、「传送出口/引路蜂土灵珠」(onTeleport 脚本把你送出去)
 * 是**三条独立线**,别混:这里只管「正常进来落哪」。
 */
function EntryInspector(props: { scene: SceneDef; session: EditSession }) {
  const { scene, session } = props
  const facings: SceneDef['entry']['facing'][] = ['down', 'up', 'left', 'right']
  const patch = (
    next: Partial<{
      col: number
      row: number
      height: number
      facing: SceneDef['entry']['facing']
    }>,
  ): void => {
    session.dispatch(
      new UpdateSceneCommand(scene.id, {
        entry: {
          pos: {
            col: next.col ?? scene.entry.pos.col,
            row: next.row ?? scene.entry.pos.row,
            height: next.height ?? scene.entry.pos.height ?? 0,
          },
          facing: next.facing ?? scene.entry.facing,
        },
      }),
    )
  }
  return (
    <>
      <div className="insp-head">
        <div className="what">选中进场点</div>
        <div className="who">📍 {scene.id}</div>
      </div>
      <div className="section">
        <h4>
          进场点 <span className="hint2">队伍走进本场景的出生格 + 朝向</span>
        </h4>
        <div className="field">
          <span className="field-label">坐标</span>
          <div className="row" style={{ gap: 6 }}>
            <input
              className="in mono entry-n"
              type="number"
              title="列 col"
              value={scene.entry.pos.col}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) && patch({ col: e.target.valueAsNumber })
              }
            />
            <input
              className="in mono entry-n"
              type="number"
              title="行 row"
              value={scene.entry.pos.row}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) && patch({ row: e.target.valueAsNumber })
              }
            />
            <input
              className="in mono entry-n"
              type="number"
              title="高度 height"
              value={scene.entry.pos.height ?? 0}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) && patch({ height: e.target.valueAsNumber })
              }
            />
          </div>
        </div>
        <div className="field">
          <span className="field-label">朝向</span>
          <select
            className="in"
            value={scene.entry.facing}
            onChange={(e) => patch({ facing: e.target.value as SceneDef['entry']['facing'] })}
          >
            {facings.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="insp-empty" style={{ marginTop: 8 }}>
          也可直接在画布上拖动红色菱形标记改坐标。这是「正常走进来」的落点;引路蜂/土灵珠把队伍送去哪,
          由本场景的<b>传送出口</b>脚本(📜 脚本模式)决定,和这里无关。
        </div>
      </div>
    </>
  )
}

function SceneInspector(props: {
  scene: SceneDef
  session: EditSession
  assetCatalog: AssetCatalogV1
  audioResolver: import('@type-pal/reforge').AudioAssetReader
  maps: MapAssetDefV1[]
  projectMaps: Record<string, ProjectMap>
  tilesets: readonly TilesetDef[]
  battleFields: readonly BattleFieldDef[]
  onOpenMap: (mapId: string) => void
  onOpenBattleField: (fieldId: number) => void
}) {
  const {
    scene,
    session,
    assetCatalog,
    audioResolver,
    maps,
    projectMaps,
    tilesets,
    battleFields,
    onOpenMap,
    onOpenBattleField,
  } = props
  const mapId = scene.mapId
  const currentAsset = maps.find((asset) => asset.id === mapId)
  const mapSelectId = `scene-map-${scene.id}`
  const musicSelectId = `scene-music-${scene.id}`

  const createAndBind = (): void => {
    const { id, path } = nextMapAssetIdentity({ version: 1, maps }, scene.id)
    const tileset = projectMaps[scene.mapId]?.tilesetId ?? tilesets[0]?.id ?? 'starter'
    session.dispatch(
      new CreateMapAssetCommand(
        { id, name: `${scene.id} 地图`, path },
        buildBlankProjectMap(24, 24, tileset),
      ),
    )
    session.dispatch(new BindSceneMapCommand(scene.id, id))
    onOpenMap(id)
  }

  const duplicateAndBind = async (): Promise<void> => {
    if (!currentAsset) return
    try {
      await session.ensureMapLoaded(mapId)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error))
      return
    }
    const { id, path } = nextMapAssetIdentity({ version: 1, maps }, `${mapId}-copy`)
    session.dispatch(
      new DuplicateMapAssetCommand(mapId, {
        id,
        name: `${currentAsset.name} 副本`,
        path,
      }),
    )
    session.dispatch(new BindSceneMapCommand(scene.id, id))
    onOpenMap(id)
  }
  return (
    <>
      <div className="insp-head">
        <div className="what">选中场景</div>
        <div className="who">{scene.id}</div>
      </div>
      <div className="section">
        <h4>场景</h4>
        <div className="field scene-map-field">
          <label className="field-label" htmlFor={mapSelectId}>
            地图
          </label>
          <div className="scene-map-control">
            <DsControlGroup
              control={
                <DsSelect
                  id={mapSelectId}
                  value={mapId}
                  invalid={!currentAsset}
                  options={[
                    ...(!currentAsset ? [{ value: mapId, label: `${mapId} (缺失)` }] : []),
                    ...maps.map((asset) => ({
                      value: asset.id,
                      label: `${asset.name} (${asset.id})`,
                    })),
                  ]}
                  onValueChange={(nextMapId) => {
                    if (nextMapId) {
                      session.dispatch(new BindSceneMapCommand(scene.id, nextMapId))
                    }
                  }}
                />
              }
              actions={
                <DsIconButton
                  label={`打开地图 ${mapId}`}
                  title="在地图模块打开"
                  icon="open"
                  variant="secondary"
                  onClick={() => onOpenMap(mapId)}
                />
              }
            />
            <div className="scene-map-actions">
              <DsButton variant="secondary" icon="add" onClick={createAndBind}>
                创建并绑定
              </DsButton>
              <DsButton
                variant="secondary"
                icon="copy"
                disabled={!currentAsset}
                onClick={() => void duplicateAndBind()}
              >
                复制并绑定
              </DsButton>
            </div>
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={musicSelectId}>
            音乐
          </label>
          <MusicPicker
            id={musicSelectId}
            value={scene.music}
            onChange={(music) => session.dispatch(new UpdateSceneCommand(scene.id, { music }))}
            catalog={assetCatalog}
            resolver={audioResolver}
            allowUnset
            allowStop
          />
        </div>
        <div className="field">
          <span className="field-label">默认战场</span>
          <BattleFieldPicker
            value={scene.battleFieldId}
            fields={battleFields}
            unsetLabel="项目默认战场 #024"
            ariaLabel="场景默认战场"
            onOpen={onOpenBattleField}
            onChange={(battleFieldId) =>
              session.dispatch(new UpdateSceneCommand(scene.id, { battleFieldId }))
            }
          />
        </div>
      </div>
      <div className="insp-empty">点左侧落点或实体查看属性；从“实体”分组新增后，点画布放置。</div>
    </>
  )
}

function sceneEntryReferenceIdentity(reference: SceneEntryReferenceEntry): string {
  const caller = reference.caller
  const owner =
    caller.type === 'scene'
      ? `${caller.sceneId}:${caller.sourceKey}`
      : caller.type === 'script'
        ? caller.scriptId
        : caller.sourceKey
  return `${caller.type}:${owner}:${reference.path}`
}

function NamedEntryInspector(props: {
  scene: SceneDef
  entryId: string
  entry: SceneEntryPoint
  references: SceneEntryReferenceEntry[]
  session: EditSession
  onJumpToEvent: (sceneId: string, sourceKey: string) => void
  onOpenScript: (scriptId: string) => void
  onDelete: () => void
}) {
  const { scene, entryId, entry, references, session, onJumpToEvent, onOpenScript, onDelete } =
    props
  const [labelDraft, setLabelDraft] = useState(entry.label ?? '')
  useEffect(() => setLabelDraft(entry.label ?? ''), [entry.label])
  const patch = (next: Partial<SceneEntryPoint>): void => {
    session.dispatch(
      new UpsertSceneEntryCommand(scene.id, entryId, {
        ...entry,
        ...next,
        pos: next.pos ? { ...next.pos } : { ...entry.pos },
      }),
    )
  }
  const facings: SceneDef['entry']['facing'][] = ['down', 'up', 'left', 'right']
  return (
    <>
      <div className="insp-head">
        <div className="what">选中命名落点</div>
        <div className="who">◇ {entry.label || entryId}</div>
      </div>
      <div className="section">
        <h4>落点属性</h4>
        <div className="field">
          <label className="field-label" htmlFor={`entry-label-${scene.id}-${entryId}`}>
            名称
          </label>
          <input
            id={`entry-label-${scene.id}-${entryId}`}
            className="in"
            value={labelDraft}
            placeholder="未命名落点"
            onChange={(event) => setLabelDraft(event.target.value)}
            onBlur={(event) => {
              const label = event.currentTarget.value.trim()
              if (label !== (entry.label ?? '')) patch({ label: label || undefined })
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
        </div>
        <div className="field">
          <span className="field-label">稳定 ID</span>
          <code className="entry-stable-id">{entryId}</code>
        </div>
        <div className="field">
          <span className="field-label">坐标</span>
          <div className="entry-coordinate-grid">
            {(['col', 'row', 'height'] as const).map((axis) => (
              <label key={axis}>
                <span>{axis === 'height' ? 'h' : axis}</span>
                <input
                  className="in mono"
                  type="number"
                  value={entry.pos[axis] ?? 0}
                  onChange={(event) => {
                    if (!Number.isFinite(event.target.valueAsNumber)) return
                    patch({ pos: { ...entry.pos, [axis]: event.target.valueAsNumber } })
                  }}
                  onWheel={(event) => event.currentTarget.blur()}
                />
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`entry-facing-${scene.id}-${entryId}`}>
            朝向
          </label>
          <select
            id={`entry-facing-${scene.id}-${entryId}`}
            className="in"
            value={entry.facing ?? ''}
            onChange={(event) => {
              const facing = event.target.value as SceneDef['entry']['facing'] | ''
              patch({ facing: facing || undefined })
            }}
          >
            <option value="">继承进入前朝向</option>
            {facings.map((facing) => (
              <option key={facing} value={facing}>
                {facing}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="section">
        <h4>脚本引用</h4>
        <DsReferencePanel
          state={references.length ? 'ready' : 'empty'}
          count={{ kind: 'exact', value: references.length }}
          impact={{
            kind: 'blocking',
            description: references.length
              ? '先处理全部脚本引用，才能删除此命名落点。'
              : '当前没有脚本引用此落点。',
          }}
        >
          {references.length ? (
            <DsReferenceList>
              {references.map((reference) => {
                const canOpen = reference.caller.type !== 'global'
                return (
                  <DsReferenceRow
                    key={sceneEntryReferenceIdentity(reference)}
                    title={reference.caller.label}
                    detail={reference.path || '/'}
                    labels={[{ label: '脚本引用' }]}
                    action={
                      canOpen
                        ? {
                            label: '打开 ↗',
                            onActivate: () => {
                              if (reference.caller.type === 'scene')
                                onJumpToEvent(reference.caller.sceneId, reference.caller.sourceKey)
                              else if (reference.caller.type === 'script')
                                onOpenScript(reference.caller.scriptId)
                            },
                          }
                        : undefined
                    }
                    status={
                      canOpen
                        ? undefined
                        : {
                            label: '只读',
                            reason: '全局调用当前没有可编辑的持久内容页。',
                          }
                    }
                  />
                )
              })}
            </DsReferenceList>
          ) : null}
        </DsReferencePanel>
      </div>
      <div className="section" style={{ borderBottom: 0 }}>
        <button
          type="button"
          className="tool danger-action"
          disabled={references.length > 0}
          title={
            references.length ? `仍有 ${references.length} 处脚本引用，不能删除` : '删除此落点'
          }
          onClick={onDelete}
        >
          🗑 删除此落点
        </button>
      </div>
    </>
  )
}
