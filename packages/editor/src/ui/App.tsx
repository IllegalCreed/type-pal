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
  BattleSpriteDefinitionReference,
  EnemyTeamDef,
  EntityDef,
  GridPos,
  HostileBehavior,
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
  type LoadedProject,
  type ProjectMap,
  type TilesetDef,
} from '@type-pal/reforge'
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  AddEntityCommand,
  AddSceneCommand,
  BindSceneMapCommand,
  CreateMapAssetCommand,
  CreateScriptSourceCommand,
  DeleteEntityCommand,
  DeleteSceneEntryCommand,
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
import {
  createPlacedEntity,
  DEFAULT_ZONE_RANGE,
  type EntityPlacement,
  type EntityPlacementMode,
  entityShapeLabel,
} from '../core/entity-placement.js'
import { exportProjectZip } from '../core/export-zip.js'
import { saveHandle } from '../core/handle-store.js'
import { type Opened, openExistingProject, pickDir, saveProjectAs } from '../core/open-actions.js'
import { collectEditorStatusIssues } from '../core/project-diagnostics.js'
import { serializeProjectWithMapCopies, writeProject } from '../core/project-io.js'
import {
  findSceneEntryReferences,
  type SceneEntryReferenceEntry,
} from '../core/script-references.js'
import type { StampSelectionSource } from '../core/stamp-template.js'
import type { SpriteAutomaticScriptInstanceSite } from '../core/world-sprite-behavior.js'
import { ActorMode } from './ActorMode.js'
import { DataMode } from './DataMode.js'
import { EntityPageAnimationEditor } from './EntityPageAnimationEditor.js'
import {
  decodeEditorLocation,
  defaultEditorLocation,
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
import { MapMode } from './MapMode.js'
import { ModuleNav, ModuleSubnav } from './ModuleNav.js'
import { MusicPicker } from './MusicPicker.js'
import {
  PanelResizeHandle,
  useStoredPanelBoolean,
  useStoredPanelNumber,
} from './PanelResizeHandle.js'
import { type ProjectSaveActivity, ProjectSaveDialog } from './ProjectSaveDialog.js'
import { ProjectWorkbenchTab } from './ProjectWorkbenchTab.js'
import { clampPanelSize, fitSidePanelWidths } from './panel-layout.js'
import { type SceneAnchorSelection, SceneCanvas, type Tool } from './SceneCanvas.js'
import { ScriptDrawer } from './ScriptDrawer.js'
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
const MODULE_NAV_COLLAPSED_WIDTH = 52
const MODULE_NAV_EXPANDED_WIDTH = 136
const MODULE_NAV_COMPACT_BREAKPOINT = 860
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
  project: LoadedProject
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
  const state = session.getState()
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
  const [tool, setTool] = useState<Tool>('select')
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
    setTool('select')
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
  const selectSceneEntry = (
    selection: Extract<SceneSelection, { kind: 'default-entry' | 'named-entry' }>,
  ): void => {
    setSelected(selection)
    setTool('select')
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
      setTool('select')
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
      setTool('select')
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
  const openSharedScript = (id: string): void => {
    if (!state.scriptIndex?.library?.[id]) return
    setSharedScriptFocus(undefined)
    applyEditorLocation(editorLinks.sharedScript(id))
  }
  const openScriptReference = (id: string, commandPath?: string): void => {
    if (state.scriptIndex?.library?.[id]) {
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
    setTool('select')
    setDrawer({
      open: true,
      src: null,
      internalScriptId: id,
      commandPath: commandPath ?? null,
      focusRevision: nextPreciseFocusRevision(),
    })
  }
  const statusIssues = useMemo(() => collectEditorStatusIssues(state), [state])
  // C0:实体经 actor⊕sprite 解析;玩家精灵 = party[0] → ActorDef.spriteId(与引擎同路径)
  const actorsById = useMemo(
    () => Object.fromEntries(state.actors.map((a) => [a.id, a])) as Record<string, ActorDef>,
    [state.actors],
  )
  const leaderSpriteId = actorsById[state.manifest.startWorld.party[0] ?? '']?.spriteId
  const [projMenu, setProjMenu] = useState(false)
  const [bodyWidth, setBodyWidth] = useState(0)
  const [moduleNavCollapsed, setModuleNavCollapsed] = useStoredPanelBoolean(
    'type-pal:editor:module-nav-collapsed',
    false,
  )
  const [outlinerWidth, setOutlinerWidth] = useStoredPanelNumber(
    'type-pal:editor:outliner-width',
    OUTLINER_DEFAULT_WIDTH,
  )
  const [inspectorWidth, setInspectorWidth] = useStoredPanelNumber(
    'type-pal:editor:inspector-width',
    INSPECTOR_DEFAULT_WIDTH,
  )
  const [outlinerCollapsed, setOutlinerCollapsed] = useStoredPanelBoolean(
    'type-pal:editor:outliner-collapsed',
    false,
  )
  const [inspectorCollapsed, setInspectorCollapsed] = useStoredPanelBoolean(
    'type-pal:editor:inspector-collapsed',
    false,
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
  const moduleNavForcedCompact = layoutWidth < MODULE_NAV_COMPACT_BREAKPOINT
  const moduleNavCompact = moduleNavCollapsed || moduleNavForcedCompact
  const moduleNavWidth = moduleNavCompact ? MODULE_NAV_COLLAPSED_WIDTH : MODULE_NAV_EXPANDED_WIDTH
  const requestedOutlinerWidth = outlinerCollapsed
    ? 0
    : clampPanelSize(outlinerWidth, OUTLINER_MIN_WIDTH, OUTLINER_MAX_WIDTH)
  const requestedInspectorWidth = inspectorCollapsed
    ? 0
    : clampPanelSize(inspectorWidth, INSPECTOR_MIN_WIDTH, INSPECTOR_MAX_WIDTH)
  const fittedPanels = fitSidePanelWidths({
    available: layoutWidth - moduleNavWidth - CENTER_MIN_WIDTH,
    left: requestedOutlinerWidth,
    right: requestedInspectorWidth,
    leftMin: outlinerCollapsed ? 0 : OUTLINER_MIN_WIDTH,
    rightMin: inspectorCollapsed ? 0 : INSPECTOR_MIN_WIDTH,
  })
  const visibleOutlinerWidth = fittedPanels.left
  const visibleInspectorWidth = fittedPanels.right
  const outlinerResizeMax = Math.min(
    OUTLINER_MAX_WIDTH,
    Math.max(
      OUTLINER_MIN_WIDTH,
      layoutWidth - moduleNavWidth - CENTER_MIN_WIDTH - visibleInspectorWidth,
    ),
  )
  const inspectorResizeMax = Math.min(
    INSPECTOR_MAX_WIDTH,
    Math.max(
      INSPECTOR_MIN_WIDTH,
      layoutWidth - moduleNavWidth - CENTER_MIN_WIDTH - visibleOutlinerWidth,
    ),
  )
  const bodyStyle = {
    '--module-nav-width': `${moduleNavWidth}px`,
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
  const openEditorModule = (moduleId: EditorModuleId): void => {
    const remembered = moduleLocations[moduleId] ?? defaultEditorLocation(moduleId)
    const subpage = editorSubpage(remembered)
    const next =
      subpage.kind === 'scene'
        ? { ...remembered, objectId: placeSceneId }
        : subpage.kind === 'map'
          ? { ...remembered, ...(defaultMapId ? { objectId: defaultMapId } : {}) }
          : remembered
    applyEditorLocation(next)
  }
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
  const moduleSubnav = <ModuleSubnav location={location} onNavigate={openEditorSubpage} />
  const objectTargetMissing = editorObjectTargetMissing(state, location)

  const reconcileLocationAfterHistory = useCallback((): void => {
    const current = locationRef.current
    if (editorObjectTargetMissing(session.getState(), current)) {
      const next = { ...current }
      delete next.objectId
      applyEditorLocation(next, 'replace')
    }
  }, [applyEditorLocation, session])
  const undo = useCallback((): void => {
    if (session.undo()) reconcileLocationAfterHistory()
  }, [reconcileLocationAfterHistory, session])
  const redo = useCallback((): void => {
    if (session.redo()) reconcileLocationAfterHistory()
  }, [reconcileLocationAfterHistory, session])

  const selEntity =
    selected.kind === 'entity' ? scene?.entities.find((e) => e.id === selected.id) : undefined
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
      if (saveInFlightRef.current) return
      const t = e.target as HTMLElement | null
      const typing =
        t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        activeSubpage.kind === 'scene' &&
        selEntity &&
        scene &&
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
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session, scene, selEntity, activeSubpage.kind, redo, undo])

  if (!scene && activeSubpage.kind !== 'project') {
    return (
      <div className="boot">
        <div className="boot-entry-error">
          <div className="err">入口场景 "{state.manifest.entryScene}" 不在 scenes</div>
          <p>工程仍可修复；请重新选择默认入口（不经过标题菜单）的起始场景。</p>
          <button
            type="button"
            className="tool"
            onClick={() =>
              applyEditorLocation({ module: 'project', subpage: 'entrypoint' }, 'replace')
            }
          >
            打开“入口与开局”修复
          </button>
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
    setTool('select')
  }
  const deleteSelected = (): void => {
    if (!selEntity) return
    session.dispatch(new DeleteEntityCommand(scene.id, selEntity.id))
    setSelected(SCENE_SELECTION)
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
      const removePaths = [...session.getDeletedMapPaths(), ...session.getDeletedAssetPaths()]
      setSaveErr('')
      setSaveActivity({ phase: 'preparing' })
      // 先让原生 modal 进入 top layer，再开始可能较重的全工程序列化。
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      const files = await serializeProjectWithMapCopies(savedState, project.source, {
        // HTTP 工程第一次选择本地目录时没有可复制的源目录，必须从 FileSource
        // 把 catalog 的全部二进制一并物化，不能只写本会话新增的 assetBlobs。
        includeAssetCopies: rememberDirectory,
      })
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
    setProjMenu(false)
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
    setProjMenu(false)
    setSaveActivity({ phase: 'saving-as' })
    try {
      const savedState = session.getState()
      const removePaths = [...session.getDeletedMapPaths(), ...session.getDeletedAssetPaths()]
      const sourceDir = dirHandleRef.current ?? undefined
      // 必须在点击调用栈内同步启动，File System Access 的目录选择器才保有用户激活。
      const operation = saveProjectAs(
        () =>
          serializeProjectWithMapCopies(savedState, project.source, {
            includeAssetCopies: !sourceDir,
          }),
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

  return (
    <div className="editor" aria-busy={saveActivity !== null ? true : undefined}>
      <div className="topbar" inert={saveActivity !== null ? true : undefined}>
        <div className="proj-menu-wrap">
          <button
            type="button"
            className="tbtn"
            onClick={() => setProjMenu((v) => !v)}
            title="工程"
          >
            📁 工程 ▾
          </button>
          {projMenu && (
            <>
              <button
                type="button"
                className="proj-menu-scrim"
                aria-label="关闭工程菜单"
                onClick={() => setProjMenu(false)}
              />
              <div className="proj-menu">
                <button
                  type="button"
                  onClick={() => {
                    setProjMenu(false)
                    props.onBackToPicker?.()
                  }}
                >
                  ✨ 新建工程…
                </button>
                <button type="button" onClick={() => void runProj(openExistingProject)}>
                  📂 打开工程…
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProjMenu(false)
                    const cur = state.manifest.name
                    const next = window
                      .prompt('工程名称(标题显示名;文件夹与 id 不变):', cur)
                      ?.trim()
                    if (next && next !== cur) session.dispatch(new RenameProjectCommand(next))
                  }}
                >
                  ✏️ 重命名工程…
                </button>
                <button
                  type="button"
                  disabled={exporting || saveActivity !== null}
                  onClick={() => void saveAs()}
                >
                  📦 另存为…
                </button>
                <button
                  type="button"
                  disabled={!dirHandleRef.current || exporting || saveActivity !== null}
                  title={
                    dirHandleRef.current
                      ? '把工程文件夹原样打包下载(读磁盘;未保存改动不入包)'
                      : '需先打开/保存本地工程(dev 种子工程无文件夹)'
                  }
                  onClick={() => {
                    setProjMenu(false)
                    const dir = dirHandleRef.current
                    if (!dir) return
                    if (
                      session.isDirty() &&
                      !window.confirm(
                        '有未保存改动 —— 导出读的是磁盘,这些改动不会进 zip。仍要导出吗?(建议先 💾 保存)',
                      )
                    )
                      return
                    setExporting(true)
                    setSaveErr('')
                    void exportProjectZip(dir, state.manifest.id)
                      .catch((e: unknown) => setSaveErr(e instanceof Error ? e.message : String(e)))
                      .finally(() => setExporting(false))
                  }}
                >
                  {exporting ? '🗜 打包中…' : '🗜 导出 zip…'}
                </button>
              </div>
            </>
          )}
        </div>
        <div className="proj">
          {state.manifest.name}
          <span className="kind">{state.manifest.id}</span>
        </div>
        <div className="spacer" />
        <button
          type="button"
          className="tbtn"
          disabled={!session.canUndo()}
          onClick={undo}
          title="撤销"
        >
          ↺ 撤销
        </button>
        <button
          type="button"
          className="tbtn"
          disabled={!session.canRedo()}
          onClick={redo}
          title="重做"
        >
          ↻ 重做
        </button>
        <button
          type="button"
          className="save"
          disabled={!session.isDirty() || saveActivity !== null || exporting}
          onClick={() => void save()}
          title="保存改动到工程文件夹(增量,只写变化;打开工程后直接写回,不再选路径)"
        >
          {saveActivity ? '💾 保存中…' : '💾 保存'}
          {session.isDirty() && !saveActivity ? <span className="dot">●</span> : null}
        </button>
      </div>

      <div
        ref={bodyRef}
        inert={saveActivity !== null ? true : undefined}
        className={`body${moduleNavCompact ? ' module-nav-compact' : ''}${outlinerCollapsed ? ' outliner-collapsed' : ''}${inspectorCollapsed ? ' inspector-collapsed' : ''}`}
        style={bodyStyle}
      >
        <ModuleNav
          activeModule={location.module}
          compact={moduleNavCompact}
          forcedCompact={moduleNavForcedCompact}
          onModule={openEditorModule}
          onToggle={() => setModuleNavCollapsed((value) => !value)}
        />

        {objectTargetMissing ? (
          <MissingEditorTarget
            moduleLabel={activeModule.label}
            objectId={location.objectId!}
            navigation={moduleSubnav}
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
            navigation={moduleSubnav}
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
            navigation={moduleSubnav}
            focusActorId={location.objectId}
            onActorFocus={(id) => focusCurrentObject(id)}
            onOpenSprite={(id) => applyEditorLocation(editorLinks.actorSprite(id))}
            onOpenBattleSprite={(id) => applyEditorLocation(editorLinks.battleSprite(id))}
            assetCatalog={state.assetCatalog}
            assetReader={assetReader}
            onOpenSound={(id) => applyEditorLocation(editorLinks.sound(id))}
            onOpenImage={(id) => applyEditorLocation(editorLinks.image(id))}
            onOpenStartSettings={() =>
              applyEditorLocation({ module: 'project', subpage: 'entrypoint' })
            }
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
            tabBar={moduleSubnav}
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
            tabBar={moduleSubnav}
            tab={activeSubpage.dataPage}
            focusObjectId={location.objectId}
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
            onJumpWorldSpriteReference={jumpToWorldSpriteReference}
            onJumpWorldSpriteActionReference={jumpToWorldSpriteActionReference}
            onJumpWorldSpriteAutomaticScriptInstance={jumpToWorldSpriteAutomaticScriptInstance}
            onJumpBattleSpriteReference={jumpToBattleSpriteReference}
          />
        ) : (
          <>
            <div className="outliner">
              {moduleSubnav}
              <div className="pane-h">
                <span className="t">场景</span>
                <span className="spacer" />
                <button
                  type="button"
                  className="mini"
                  title="在进场点添加实体"
                  onClick={() => addAt({ col: scene.entry.pos.col, row: scene.entry.pos.row })}
                >
                  ＋
                </button>
              </div>
              <select
                className="in scene-switch"
                value={placeSceneId}
                onChange={(e) => switchPlaceScene(e.target.value)}
                title="切换编辑场景"
              >
                {state.scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}
                    {s.id === state.manifest.entryScene ? '(入口)' : ''} · {s.entities.length} 实体
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="tool"
                title="新建场景(复用当前场景的地图与进场点起步,建后在属性里改)"
                onClick={() => {
                  const id = window.prompt('新场景 id(kebab-case):', '')?.trim()
                  if (!id) return
                  if (state.scenes.some((sc) => sc.id === id)) {
                    window.alert(`场景 "${id}" 已存在`)
                    return
                  }
                  session.dispatch(new AddSceneCommand(id, scene.mapId, scene.entry))
                  switchPlaceScene(id)
                }}
              >
                ＋ 新建场景
              </button>
              <div className="tree">
                <button
                  type="button"
                  className={`node${selected.kind === 'scene' ? ' sel' : ''}`}
                  onClick={() => setSelected(SCENE_SELECTION)}
                >
                  <span className="ico">🗺️</span>
                  <span>{scene.id}</span>
                </button>
                <div className="node-group-head">
                  <span>落点</span>
                  <button
                    type="button"
                    className="mini"
                    title="新建命名落点"
                    aria-label="新建命名落点"
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
                  >
                    ＋
                  </button>
                </div>
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
                {scene.entities.map((e) => (
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
              <div className="layers">
                <div className="t">图层 / 显隐</div>
                <label className="lrow">
                  <input
                    type="checkbox"
                    checked={canvasLayers.base}
                    onChange={(e) => setCanvasLayers({ ...canvasLayers, base: e.target.checked })}
                  />{' '}
                  地板
                </label>
                <label className="lrow">
                  <input
                    type="checkbox"
                    checked={canvasLayers.cover}
                    onChange={(e) => setCanvasLayers({ ...canvasLayers, cover: e.target.checked })}
                  />{' '}
                  高物(墙·家具)
                </label>
                <label className="lrow">
                  <input
                    type="checkbox"
                    checked={canvasLayers.entries}
                    onChange={(e) =>
                      setCanvasLayers({ ...canvasLayers, entries: e.target.checked })
                    }
                  />{' '}
                  落点
                </label>
                <label className="lrow">
                  <input
                    type="checkbox"
                    checked={canvasLayers.entities}
                    onChange={(e) =>
                      setCanvasLayers({ ...canvasLayers, entities: e.target.checked })
                    }
                  />{' '}
                  实体
                </label>
                <label
                  className="lrow"
                  title="初始隐藏的实体(剧情后期才出场)画成半透明幽灵,可点选编排;游戏内不渲染"
                >
                  <input
                    type="checkbox"
                    checked={canvasLayers.ghosts}
                    onChange={(e) => setCanvasLayers({ ...canvasLayers, ghosts: e.target.checked })}
                  />{' '}
                  隐藏实体(透视)
                </label>
                <label className="lrow">
                  <input
                    type="checkbox"
                    checked={canvasLayers.grid}
                    onChange={(e) => setCanvasLayers({ ...canvasLayers, grid: e.target.checked })}
                  />{' '}
                  网格
                </label>
                <label className="lrow">
                  <input
                    type="checkbox"
                    checked={canvasLayers.blocked}
                    onChange={(e) =>
                      setCanvasLayers({ ...canvasLayers, blocked: e.target.checked })
                    }
                  />{' '}
                  禁入
                </label>
              </div>
            </div>

            <div className="center">
              <div className="toolbar">
                <button
                  type="button"
                  className={`tool${tool === 'select' ? ' active' : ''}`}
                  onClick={() => setTool('select')}
                  disabled={drawer.open}
                  title="选择 / 拖动移位"
                >
                  ↖ 选择/移动
                </button>
                <button
                  type="button"
                  className={`tool${tool === 'add' ? ' active' : ''}`}
                  onClick={() => setTool('add')}
                  disabled={drawer.open}
                  title="点画布放新实体"
                >
                  ＋ 添加实体
                </button>
                <button
                  type="button"
                  className="tool"
                  onClick={deleteSelected}
                  disabled={!selEntity}
                  title="删除选中(Del)"
                >
                  🗑 删除
                </button>
                <span className="sep" />
                <button
                  type="button"
                  className={`tool${drawer.open ? ' active' : ''}`}
                  onClick={() =>
                    setDrawer((drawerState) => ({
                      open: !drawerState.open,
                      src: drawerState.src,
                      internalScriptId: null,
                      commandPath: null,
                      focusRevision: drawerState.focusRevision,
                    }))
                  }
                  title="底部脚本抽屉:本场景 onEnter/实体触发/巡逻 就地编 + 预览"
                >
                  📜 脚本
                </button>
                <span className="spacer" />
                <span className="toolbar-hint">
                  {tool === 'add' ? '点画布放实体' : '拖动移位 · Del 删除'}
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
                  tool={tool}
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
                  onClose={() =>
                    setDrawer({
                      open: false,
                      src: null,
                      internalScriptId: null,
                      commandPath: null,
                      focusRevision: drawer.focusRevision,
                    })
                  }
                />
              )}
            </div>

            <div className="inspector">
              {tool === 'add' ? (
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
                <EntityInspector
                  entity={selEntity}
                  session={session}
                  sceneId={scene.id}
                  locale={state.locale}
                  actorsById={actorsById}
                  enemyTeams={state.enemyTeams ?? []}
                  sprites={state.sprites}
                  assetBase={project.assetBase}
                  assetReader={assetReader}
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
                  onDelete={deleteSelected}
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
                  onOpenMap={(mapId) => applyEditorLocation(editorLinks.map(mapId))}
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
          toggleDirection={outlinerCollapsed ? 'right' : 'left'}
          toggleLabel={outlinerCollapsed ? '展开左侧面板' : '收起左侧面板'}
          onToggle={() => setOutlinerCollapsed((value) => !value)}
          onReset={() => setOutlinerWidth(OUTLINER_DEFAULT_WIDTH)}
          onResize={(delta) =>
            setOutlinerWidth(
              clampPanelSize(visibleOutlinerWidth + delta, OUTLINER_MIN_WIDTH, outlinerResizeMax),
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
          toggleDirection={inspectorCollapsed ? 'left' : 'right'}
          toggleLabel={inspectorCollapsed ? '展开右侧面板' : '收起右侧面板'}
          onToggle={() => setInspectorCollapsed((value) => !value)}
          onReset={() => setInspectorWidth(INSPECTOR_DEFAULT_WIDTH)}
          onResize={(delta) =>
            setInspectorWidth(
              clampPanelSize(
                visibleInspectorWidth - delta,
                INSPECTOR_MIN_WIDTH,
                inspectorResizeMax,
              ),
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
          {saveErr ? `保存失败: ${saveErr}` : session.isDirty() ? '未保存改动' : '已保存'}
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
  navigation: React.ReactNode
  onClear: () => void
}) {
  return (
    <>
      <div className="outliner">
        {props.navigation}
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

/** 敌队 id 约定 `team-<N>` → N(引擎 enemyTeamsById[`team-${team}`] 查询键);不合约定返回 undefined。 */
function parseTeamNum(id: string | undefined): number | undefined {
  const m = id?.match(/^team-(\d+)$/)
  return m ? Number(m[1]) : undefined
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
      ? `角色 · ${selectedActor ? lookupText(selectedActor.name, locale) : '未选择'}`
      : mode === 'sprite'
        ? `资源 · ${selectedSprite?.label || selectedSprite?.id || '未选择'}`
        : `${triggerOn === 'touch' ? '触碰' : '交互'} · ${zoneRanges[triggerOn]} 格`
  return (
    <>
      <div className="insp-head">
        <div className="what">添加实体</div>
        <div className="who">{summary}</div>
      </div>
      <div className="section">
        <fieldset className="place-segments">
          <legend className="place-control-legend">实体形态</legend>
          <button
            type="button"
            className={visibleMode ? 'active' : ''}
            aria-pressed={visibleMode}
            onClick={() => onModeChange(mode === 'actor' ? 'actor' : 'sprite')}
          >
            精灵
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
            <fieldset className="place-segments secondary">
              <legend className="place-control-legend">精灵来源</legend>
              <button
                type="button"
                className={mode === 'actor' ? 'active' : ''}
                aria-pressed={mode === 'actor'}
                onClick={() => onModeChange('actor')}
              >
                角色
              </button>
              <button
                type="button"
                className={mode === 'sprite' ? 'active' : ''}
                aria-pressed={mode === 'sprite'}
                onClick={() => onModeChange('sprite')}
              >
                精灵资源
              </button>
            </fieldset>
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
                    <span className="sub">角色 · {actor.id}</span>
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
                    资源 · {KIND_ICON[s.layout.kind] ?? ''} {s.asset}
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

function EntityInspector(props: {
  entity: EntityDef
  session: EditSession
  sceneId: string
  locale: Locale
  actorsById: Record<string, ActorDef>
  /** 敌队清单(B9 敌对行为 team 下拉;id 约定 team-<N>,引擎按 N 查)。 */
  enemyTeams: EnemyTeamDef[]
  /** 精灵注册表(sprite 来源实体换外观下拉)。 */
  sprites: SpriteDef[]
  assetBase: AssetBase
  assetReader: EditorAssetReader
  /** 跳事件模式定位此实体的触发/巡逻脚本(E2)。 */
  onJumpToEvent: (sceneId: string, srcKey: string) => void
  /** 从动作引用跳转时精确打开对应实体页。 */
  focusPageIndex?: number
  focusPageRevision?: number
  onPageFocusConsumed?: (revision: number) => void
  onOpenSpriteAction?: (spriteId: string, actionId: string) => void
  onDelete: () => void
}) {
  const {
    entity,
    session,
    sceneId,
    locale,
    actorsById,
    enemyTeams,
    sprites,
    assetBase,
    assetReader,
    onJumpToEvent,
    focusPageIndex,
    focusPageRevision,
    onPageFocusConsumed,
    onOpenSpriteAction,
    onDelete,
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
  const dispatchHostile = (h: HostileBehavior | undefined): void => {
    session.dispatch(new UpdateEntityCommand(sceneId, entity.id, { hostile: h }))
  }
  /** hostile 子字段更新(整对象替换;undefined 值的键显式删,保 JSON 落盘干净)。 */
  const setHostile = (patch: Partial<HostileBehavior>): void => {
    if (!entity.hostile) return
    const next: HostileBehavior = { ...entity.hostile, ...patch }
    if (patch.chase === undefined && 'chase' in patch) delete next.chase
    if (patch.respawnSeconds === undefined && 'respawnSeconds' in patch) delete next.respawnSeconds
    if (patch.onLose === undefined && 'onLose' in patch) delete next.onLose
    dispatchHostile(next)
  }
  return (
    <>
      <div className="insp-head">
        <div className="what">选中实体</div>
        <div className="who">
          {actorName ?? entity.id}
          {actorName && <code style={{ color: 'var(--faint)', fontSize: 11 }}> {entity.id}</code>}
        </div>
      </div>
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
          <div className="field">
            <span className="field-label">角色</span>
            <div className="in pick">
              <span>{actorName ?? entity.actor}</span>
              <span className="meta">→ {spriteId ?? '(未解析)'}</span>
            </div>
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
          <div>
            <input
              type="checkbox"
              checked={entity.collide === true}
              onChange={(e) =>
                session.dispatch(
                  new UpdateEntityCommand(sceneId, entity.id, { collide: e.target.checked }),
                )
              }
            />{' '}
            阻挡通行
          </div>
        </div>
        <div className="field">
          <span className="field-label">初始显隐</span>
          <div title="隐藏 = 游戏里初始不出现(剧情脚本 setEntityState 可显形);编辑器「隐藏实体(透视)」图层仍半透明可见">
            <input
              type="checkbox"
              checked={entity.hidden === true}
              onChange={(e) =>
                session.dispatch(
                  new UpdateEntityCommand(sceneId, entity.id, {
                    hidden: e.target.checked ? true : undefined,
                  }),
                )
              }
            />{' '}
            初始隐藏(待剧情出场)
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
          <div>
            <input
              type="checkbox"
              checked={!!entity.hostile}
              onChange={(e) =>
                dispatchHostile(
                  e.target.checked ? { team: parseTeamNum(enemyTeams[0]?.id) ?? 1 } : undefined,
                )
              }
            />{' '}
            遇敌开战(触碰即 startBattle)
          </div>
        </div>
        {entity.hostile && (
          <>
            <div className="field">
              <span className="field-label">敌队</span>
              <select
                className="in"
                value={String(entity.hostile.team)}
                onChange={(e) => setHostile({ team: Number(e.target.value) })}
              >
                {/* 约定 id=team-<N>,引擎按 N 查 enemyTeamsById[`team-${N}`];当前值兜底防悬空 */}
                {!enemyTeams.some((t) => parseTeamNum(t.id) === entity.hostile!.team) && (
                  <option value={String(entity.hostile.team)}>
                    team-{entity.hostile.team} (缺数据)
                  </option>
                )}
                {enemyTeams
                  .map((t) => ({ t, n: parseTeamNum(t.id) }))
                  .filter((x): x is { t: EnemyTeamDef; n: number } => x.n !== undefined)
                  .map(({ t, n }) => (
                    <option key={t.id} value={String(n)}>
                      {t.id}({t.members.length} 敌)
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <span className="field-label">追逐</span>
              <div>
                <input
                  type="checkbox"
                  checked={!!entity.hostile.chase}
                  onChange={(e) =>
                    setHostile({
                      chase: e.target.checked ? { range: 6, speed: 2 } : undefined,
                    })
                  }
                />{' '}
                见人就追(不勾 = 原地怪)
              </div>
            </div>
            {entity.hostile.chase && (
              <div className="posrow">
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
                <div className="cell">
                  <span>穿障</span>
                  <input
                    type="checkbox"
                    checked={entity.hostile.chase.floating === true}
                    onChange={(e) => {
                      const chase = { ...entity.hostile!.chase!, floating: true }
                      if (!e.target.checked) delete (chase as { floating?: boolean }).floating
                      setHostile({ chase })
                    }}
                  />
                </div>
              </div>
            )}
            <div className="field">
              <span className="field-label">重生秒</span>
              <input
                className="in mono"
                type="number"
                placeholder="(空=不复活)"
                value={entity.hostile.respawnSeconds ?? ''}
                onChange={(e) =>
                  setHostile({
                    respawnSeconds: Number.isFinite(e.target.valueAsNumber)
                      ? e.target.valueAsNumber
                      : undefined,
                  })
                }
              />
            </div>
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
            {Array.isArray(entity.hostile.onLose) && (
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
            )}
          </>
        )}
      </div>
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
  onOpenMap: (mapId: string) => void
}) {
  const { scene, session, assetCatalog, audioResolver, maps, projectMaps, tilesets, onOpenMap } =
    props
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
            <div className="linked-control">
              <select
                id={mapSelectId}
                className="in"
                value={mapId}
                onChange={(event) =>
                  event.target.value &&
                  session.dispatch(new BindSceneMapCommand(scene.id, event.target.value))
                }
              >
                {!currentAsset && <option value={mapId}>{mapId} (缺失)</option>}
                {maps.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.id})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="linked-value-open"
                title="在地图模块打开"
                aria-label={`打开地图 ${mapId}`}
                onClick={() => onOpenMap(mapId)}
              >
                ↗
              </button>
            </div>
            <div className="scene-map-actions">
              <button type="button" className="scene-map-action" onClick={createAndBind}>
                <span aria-hidden="true">＋</span>
                创建并绑定
              </button>
              <button
                type="button"
                className="scene-map-action"
                disabled={!currentAsset}
                onClick={() => void duplicateAndBind()}
              >
                <span aria-hidden="true">⧉</span>
                复制并绑定
              </button>
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
      </div>
      <div className="insp-empty">点左侧落点或实体查看属性。工具栏「+ 添加实体」→ 点画布放。</div>
    </>
  )
}

function sceneEntryReferenceLabel(reference: SceneEntryReferenceEntry): string {
  return `${reference.caller.label}${reference.path || '/'}`
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
        <h4>脚本引用 ({references.length})</h4>
        {references.length ? (
          <div className="entry-reference-list">
            {references.map((reference, index) => {
              const canOpen = reference.caller.type !== 'global'
              return (
                <button
                  type="button"
                  className="ref-row"
                  key={`${sceneEntryReferenceLabel(reference)}:${index}`}
                  disabled={!canOpen}
                  onClick={() => {
                    if (reference.caller.type === 'scene')
                      onJumpToEvent(reference.caller.sceneId, reference.caller.sourceKey)
                    else if (reference.caller.type === 'script')
                      onOpenScript(reference.caller.scriptId)
                  }}
                >
                  <span className="rw read">引用</span>
                  <span className="src">{sceneEntryReferenceLabel(reference)}</span>
                  <span className="det">打开</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="hint2">当前没有脚本引用此落点。</div>
        )}
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
