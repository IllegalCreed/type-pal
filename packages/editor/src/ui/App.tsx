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
  AuthorEntityPage,
  AuthorSceneDef,
  BattleFieldDef,
  EnemyTeamDef,
  EntityDef,
  Facing,
  GridPos,
  HostileBehavior,
  Locale,
  MapAssetDefV1,
  RuntimeHostileBehavior,
  SceneDef,
  SceneEntryPoint,
  SpriteDef,
  TriggerActivation,
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
  type LoadedCurrentProject,
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
} from 'react'
import {
  AddEntityCommand,
  AddSceneCommand,
  BindSceneMapCommand,
  CreateMapAssetCommand,
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
import {
  createEditorDerivedStore,
  effectiveEditorDerivedStatus,
  isEditorDerivedSnapshotCurrent,
} from '../core/editor-derived-store.js'
import { EditorHistoryCoordinator } from '../core/editor-history-coordinator.js'
import {
  collectEntityAddressReferences,
  entityAddressReferenceBlocksDeletion,
} from '../core/entity-address-references.js'
import {
  activePageTriggerActivation,
  createCanonicalPlacedEntity,
  createPlacedEntity,
  DEFAULT_ZONE_RANGE,
  type EntityPlacement,
  type EntityPlacementMode,
  effectiveTriggerRange,
  entityShapeLabel,
  triggerActivationSummary,
} from '../core/entity-placement.js'
import { exportProjectZip } from '../core/export-zip.js'
import { type Opened, openExistingProject, pickDir, saveProjectAs } from '../core/open-actions.js'
import { serializeProjectWithMapCopies, writeProject } from '../core/project-io.js'
import {
  createProjectReferenceIndex,
  type ProjectReferenceEdge,
} from '../core/project-reference.js'
import { createCurrentProjectReferenceIndexProvider } from '../core/project-reference-adapters.js'
import {
  AddSceneEntityDefinitionCommand,
  type CanonicalScriptReference,
  canonicalScriptReferenceDestinationExists,
  DeleteSceneEntityDefinitionCommand,
  describeCanonicalScriptReference,
  type ScriptCommandOwner,
  type ScriptEditorState,
  type ScriptEditSession,
  SetEntityHostileOnLoseCommand,
  SetEntityPageBehaviorCommand,
  SetEntityPageTriggerActivationCommand,
} from '../core/script-editor.js'
import {
  mergeEditorProjectionWithCurrentAuthorState,
  projectActiveScriptEditorState,
} from '../core/script-editor-projection.js'
import { createScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import {
  buildCanonicalSceneEntryReferenceIndex,
  sceneEntryReferenceKey,
} from '../core/script-references.js'
import { findDefaultEntry } from '../core/startup-entries.js'
import type { WorkspaceContext } from '../core/workspace-context.js'
import { workspaceModeLabel } from '../core/workspace-context.js'
import {
  authorizeBoundWorkspaceTarget,
  authorizeFirstSaveTarget,
  preflightFirstSaveTarget,
  registerAuthorizedWorkspaceMutation,
  withAuthorizedWorkspaceMutation,
} from '../core/workspace-persistence.js'
import type { SpriteAutomaticScriptInstanceSite } from '../core/world-sprite-behavior.js'
import {
  createEditorAppCommandRegistry,
  type EditorAppCommand,
  executeEditorSaveShortcut,
  requireEditorAppCommand,
} from './app-command-registry.js'
import {
  closeSceneScriptPanelState,
  createEditorLayoutCommands,
  type EditorLayoutCommandHandlers,
  editorPanelToolbarCommandIds,
  executeEditorLayoutShortcut,
  toggleSceneScriptPanelState,
} from './app-layout-commands.js'
import { BattleFieldPicker } from './BattleFieldPicker.js'
import {
  ConnectedActorMode,
  ConnectedDataMode,
  ConnectedProjectWorkbench,
} from './ConnectedEditorPages.js'
import type { DsMenuDefinition } from './design-system/index.js'
import {
  DsButton,
  DsCatalogGroupHeader,
  DsCatalogRow,
  DsCheckbox,
  DsControlGroup,
  DsDraftNumberInput,
  DsDraftTextInput,
  DsFieldMeasure,
  DsIconButton,
  DsInspectorHost,
  DsInspectorSection,
  DsInspectorTabs,
  DsListHeader,
  DsNumberInput,
  DsPressable,
  DsPropertyGrid,
  DsPropertyRow,
  DsReadonlyValue,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsSelect,
  DsTextInput,
} from './design-system/index.js'
import { EditorAppHeader } from './EditorAppHeader.js'
import { EditorDiagnosticsBar } from './EditorDiagnosticsBar.js'
import { ENTITY_FACING_OPTIONS, EntityFacingHelpTip } from './EntityFacingHelp.js'
import { EntityPageAnimationFields } from './EntityPageAnimationEditor.js'
import {
  ACTOR_WORKSPACE_SECTIONS,
  type ActorWorkspaceSection,
  decodeEditorLocation,
  EDITOR_MODULES,
  type EditorLocation,
  type EditorModuleId,
  editorLinks,
  editorLocationHref,
  editorModule,
  editorSubpage,
  editorSubpageHasInspector,
  editorSubpageHasOutliner,
  normalizeEditorLocation,
  sameEditorLocation,
} from './editor-navigation.js'
import { editorObjectTargetMissing } from './editor-target.js'
import { MapMode } from './MapMode.js'
import { MusicPicker } from './MusicPicker.js'
import {
  PanelResizeHandle,
  useStoredPanelBoolean,
  useStoredPanelNumber,
} from './PanelResizeHandle.js'
import { type ProjectSaveActivity, ProjectSaveDialog } from './ProjectSaveDialog.js'
import { clampPanelSize, fitSidePanelWidths } from './panel-layout.js'
import { type SceneAnchorSelection, SceneCanvas } from './SceneCanvas.js'
import { CanonicalSceneScriptWorkspace } from './SceneScriptWorkspace.js'
import { ScriptBehaviorInspector } from './ScriptBehaviorInspector.js'
import { ScriptDrawer } from './ScriptDrawer.js'
import { CanonicalHostileOnLoseEditor, type CanonicalScriptEditorContext } from './ScriptEditor.js'
import { disposeSoundPreview } from './SoundPicker.js'
import { SpriteImageViewer, SpriteThumb } from './SpriteThumb.js'
import {
  shallowSelectorArrayEqual,
  useEditorDerivedSelector,
  useEditSessionSelector,
  useScriptEditSessionSelector,
} from './session-selector.js'

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

function initialCanonicalEntityPage(
  entity: AuthorSceneDef['entities'][number] | undefined,
): AuthorEntityPage | undefined {
  return entity?.pages?.find((page) => page.id === entity.initialPage) ?? entity?.pages?.[0]
}

interface StoredEditorNavigation {
  last?: EditorLocation
  modules?: Partial<Record<EditorModuleId, EditorLocation>>
  scroll?: Record<string, { outliner: number; center: number; inspector: number }>
}

function newEntityId(existing: readonly { id: string }[]): string {
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

/** C-gate ownership is explicit; unknown/future pages keep the legacy root subscription. */
export function editorPageOwnsSessionSubscription(location: EditorLocation): boolean {
  const subpage = editorSubpage(location)
  return (
    subpage.kind === 'actor' ||
    subpage.kind === 'project' ||
    (subpage.kind === 'data' &&
      (subpage.dataPage === 'item' ||
        subpage.dataPage === 'crafting' ||
        subpage.dataPage === 'spirit-gourd' ||
        subpage.dataPage === 'poison' ||
        subpage.dataPage === 'scripts'))
  )
}

export function App(props: {
  session: EditSession
  project: LoadedCurrentProject
  script: {
    session: ScriptEditSession
  }
  /** 启动屏打开/克隆得到的项目目录句柄(P4):保存直接写回此夹,不再首存选夹。 */
  initialDir?: FileSystemDirectoryHandle
  /** 会话级工作区身份；不写进 manifest，所有目录 mutation 都由它授权。 */
  workspace: WorkspaceContext
  /** `?ui_samples=1` 的强制约束会贯穿项目菜单打开路径。 */
  forceSandbox?: boolean
  /** 「项目」菜单切到别的项目(打开/另存为)→ 上抛 main 重建 session。 */
  onOpened?: (o: Opened) => void
  /** 「项目」菜单「新建项目」→ 回启动屏。 */
  onBackToPicker?: () => void
}) {
  const { session, project } = props
  const scriptSession = props.script.session
  const historyCoordinator = useMemo(
    () => new EditorHistoryCoordinator(session, scriptSession),
    [scriptSession, session],
  )
  const derivedStore = useMemo(
    () => createEditorDerivedStore({ mainSession: session, scriptSession }),
    [scriptSession, session],
  )
  useEffect(() => derivedStore.start(), [derivedStore])

  const bodyRef = useRef<HTMLDivElement>(null)
  const storedNavigationRef = useRef(readStoredEditorNavigation(props.workspace.workspaceId))
  const [location, setLocation] = useState<EditorLocation>(() =>
    initialEditorLocation(storedNavigationRef.current),
  )
  const locationRef = useRef(location)
  const [moduleLocations, setModuleLocations] = useState<
    Partial<Record<EditorModuleId, EditorLocation>>
  >(() => ({ ...storedNavigationRef.current.modules, [location.module]: location }))
  const moduleLocationsRef = useRef(moduleLocations)
  const scrollPositionsRef = useRef(storedNavigationRef.current.scroll ?? {})
  const selectorOwnedPage = editorPageOwnsSessionSubscription(location)

  // Connected pages subscribe inside their active workspace. The root keeps only chrome metadata;
  // map/scene and unknown future pages retain the full legacy version subscription.
  useEditSessionSelector(
    session,
    (snapshot) =>
      selectorOwnedPage
        ? ([
            'connected',
            snapshot.state.manifest.name,
            snapshot.dirty,
            snapshot.canUndo,
            snapshot.canRedo,
          ] as const)
        : (['legacy', snapshot.version] as const),
    shallowSelectorArrayEqual,
  )
  useScriptEditSessionSelector(
    scriptSession,
    (snapshot) =>
      selectorOwnedPage
        ? (['connected', snapshot.dirty, snapshot.canUndo, snapshot.canRedo] as const)
        : (['legacy', snapshot.version] as const),
    shallowSelectorArrayEqual,
  )
  const subscribedDerivedSnapshot = useEditorDerivedSelector(derivedStore, (snapshot) =>
    selectorOwnedPage ? undefined : snapshot,
  )
  const derivedSnapshot = subscribedDerivedSnapshot ?? derivedStore.getSnapshot()
  const derivedData =
    derivedSnapshot.status === 'current'
      ? derivedSnapshot.data
      : derivedSnapshot.status === 'stale' || derivedSnapshot.status === 'failed'
        ? derivedSnapshot.lastKnown?.data
        : undefined
  const scriptHistoryVersion = scriptSession?.getHistoryVersion() ?? 0
  const state = session.getState()
  const defaultEntry = findDefaultEntry(state.manifest)
  const storedScriptState = useMemo(() => {
    void scriptHistoryVersion
    return scriptSession?.getStateSnapshot()
  }, [scriptHistoryVersion, scriptSession])
  const scriptState = useMemo(
    () =>
      storedScriptState
        ? projectActiveScriptEditorState(storedScriptState, state.items)
        : undefined,
    [state.items, storedScriptState],
  )
  const editorDirty = session.isDirty() || (scriptSession?.isDirty() ?? false)
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
  const navigationStorageKey = editorNavigationKey(props.workspace.workspaceId)
  const [workspaceNotice, setWorkspaceNotice] = useState<
    { kind: 'info' | 'error'; message: string } | undefined
  >()
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
  const sceneOutlineRowRef = useRef<HTMLButtonElement>(null)
  const [placingEntity, setPlacingEntity] = useState(false)
  const [scriptChannel, setScriptChannel] = useState<'trigger' | 'auto'>('trigger')
  const [selectedBehavior, setSelectedBehavior] = useState<string>()
  const [selectedPage, setSelectedPage] = useState<string>()
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
      : (defaultEntry?.scene ?? '')
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
  /** 首存中断时尚未升级为项目句柄；保留尝试目录，重选同一目录时才能续用实际磁盘恢复快照。 */
  const saveAttemptDirRef = useRef<FileSystemDirectoryHandle | null>(props.initialDir ?? null)
  // 上次落盘快照(rel → 内容字符串):增量保存只写变化文件(P3)。首存后建立。
  const snapshotRef = useRef<Map<string, string> | null>(null)
  const [saveErr, setSaveErr] = useState('')
  const [saveActivity, setSaveActivity] = useState<ProjectSaveActivity | null>(null)
  // React state 只负责展示；同步 ref 才能在首个 await 前防住双击和并发项目 IO。
  const saveInFlightRef = useRef(false)
  const saveCommandRef = useRef<EditorAppCommand | null>(null)
  const [exporting, setExporting] = useState(false) // A5 导出 zip 进行中
  // Only a bound local handle may appear in a local-play URL. Unpersisted PAL/sandbox sessions
  // deliberately use the explicit HTTP fallback instead of emitting a guaranteed-dead workspace id.
  const playWorkspaceId = dirHandleRef.current ? props.workspace.workspaceId : undefined

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

  // 布置模式当前编辑场景(可切；初始取直接启动入口)。切场景重置选中 —— 实体属于场景。
  const scene = (state.scenes.find((s) => s.id === placeSceneId) ??
    state.scenes.find((s) => s.id === defaultEntry?.scene))!
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
    reference: CanonicalScriptReference
    revision: number
  }>()
  const [canonicalOwnerFocus, setCanonicalOwnerFocus] = useState<{
    owner: Extract<ScriptCommandOwner, { kind: 'entity-behavior' | 'scene-hook' }>
    revision: number
  }>()
  const [itemPrivateScriptFocus, setItemPrivateScriptFocus] = useState<{
    itemId: string
    ability: 'use' | 'throw'
    scriptId: string
    commandPath?: string
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
  const jumpToWorldSpriteAutomaticScriptInstance = (
    site: SpriteAutomaticScriptInstanceSite,
  ): void => jumpToEvent(site.sceneId, `${site.entityId}:auto`)
  const openSharedScript = useCallback(
    (id: string): void => {
      const currentState = session.getState()
      const currentScriptState = projectActiveScriptEditorState(
        scriptSession.getStateSnapshot(),
        currentState.items,
      )
      if (!currentScriptState.sharedScripts[id] && !currentState.scriptIndex?.library?.[id]) return
      setSharedScriptFocus(undefined)
      setCanonicalOwnerFocus(undefined)
      applyEditorLocation(editorLinks.sharedScript(id))
    },
    [applyEditorLocation, scriptSession, session],
  )
  const openScriptReference = (id: string, commandPath?: string): void => {
    const currentState = session.getState()
    const currentScriptState = projectActiveScriptEditorState(
      scriptSession.getStateSnapshot(),
      currentState.items,
    )
    setCanonicalOwnerFocus(undefined)
    if (currentScriptState.sharedScripts[id] || currentState.scriptIndex?.library?.[id]) {
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
    const targetScene = currentState.scenes.find((candidate) => candidate.id === sceneId)
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
  const openCanonicalReference = (reference: CanonicalScriptReference): void => {
    const currentState = session.getState()
    const currentScriptState = projectActiveScriptEditorState(
      scriptSession.getStateSnapshot(),
      currentState.items,
    )
    if (!canonicalScriptReferenceDestinationExists(currentScriptState, reference)) {
      setWorkspaceNotice({
        kind: 'error',
        message: '引用位置已变化，请重新打开方案详情。',
      })
      return
    }
    const revision = nextPreciseFocusRevision()
    const locator = reference.locator
    setWorkspaceNotice(undefined)
    setCanonicalOwnerFocus(undefined)
    const confirmReferenceLocation = (): void =>
      setWorkspaceNotice({
        kind: 'info',
        message: `已定位到：${describeCanonicalScriptReference(currentScriptState, reference)}。`,
      })

    if (locator.kind === 'entity-page') {
      const targetScene = currentState.scenes.find((candidate) => candidate.id === locator.sceneId)
      const targetEntity = targetScene?.entities.find(
        (candidate) => candidate.id === locator.entityId,
      )
      const canonicalEntity = currentScriptState.scenes
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
      setSelectedPage(locator.pageId)
      setScriptChannel(locator.channel)
      setSelectedBehavior(page[locator.channel])
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
  const openProjectSceneReference = (sceneId: string, entityId?: string): boolean => {
    const currentState = session.getState()
    const targetScene = currentState.scenes.find((candidate) => candidate.id === sceneId)
    if (!targetScene) {
      setWorkspaceNotice({
        kind: 'error',
        message: `引用位置已变化：场景 ${sceneId} 不再存在。`,
      })
      return false
    }
    if (entityId && !targetScene.entities.some((entity) => entity.id === entityId)) {
      setWorkspaceNotice({
        kind: 'error',
        message: `引用位置已变化：场景 ${sceneId} 中的实体 ${entityId} 不再存在。`,
      })
      return false
    }
    setPlaceSceneId(sceneId)
    setPlacingEntity(false)
    setSelected(entityId ? { kind: 'entity', id: entityId } : SCENE_SELECTION)
    setInspectorCollapsed(false)
    applyEditorLocation(editorLinks.scene(sceneId))
    return true
  }
  const rejectChangedProjectReference = (label: string, id: string): void =>
    setWorkspaceNotice({
      kind: 'error',
      message: `引用位置已变化：${label} ${id} 不再存在。`,
    })
  const openProjectReference = (reference: ProjectReferenceEdge): void => {
    const locator = reference.locator
    const currentState = session.getState()
    const currentScriptState = projectActiveScriptEditorState(
      scriptSession.getStateSnapshot(),
      currentState.items,
    )
    setWorkspaceNotice(undefined)
    setCanonicalOwnerFocus(undefined)
    if (locator.kind === 'canonical-script') {
      openCanonicalReference(locator.reference)
      return
    }
    if (locator.kind === 'legacy-script') {
      openScriptReference(locator.scriptId, locator.commandPath)
      return
    }
    if (locator.kind === 'scene-page') {
      const canonicalEntity = currentScriptState.scenes
        .find((scene) => scene.id === locator.sceneId)
        ?.entities.find((entity) => entity.id === locator.entityId)
      const pageIndex =
        canonicalEntity?.pages?.findIndex((page) => page.id === locator.pageId) ?? -1
      if (pageIndex < 0 || !openProjectSceneReference(locator.sceneId, locator.entityId)) {
        rejectChangedProjectReference(
          '实体页面',
          `${locator.sceneId}/${locator.entityId}/${locator.pageId}`,
        )
        return
      }
      const revision = nextPreciseFocusRevision()
      setSelectedPage(locator.pageId)
      setEntityPageFocus({
        sceneId: locator.sceneId,
        entityId: locator.entityId,
        pageIndex,
        revision,
      })
      setDrawer({
        open: false,
        src: null,
        internalScriptId: null,
        commandPath: null,
        focusRevision: revision,
      })
      return
    }
    if (locator.kind === 'script-owner') {
      const owner = locator.owner
      if (owner.kind === 'shared-script') {
        if (!currentScriptState.sharedScripts[owner.scriptId]) {
          rejectChangedProjectReference('共享脚本', owner.scriptId)
          return
        }
        openSharedScript(owner.scriptId)
        return
      }
      if (owner.kind === 'item-private-script') {
        const item = currentScriptState.items.find((candidate) => candidate.id === owner.itemId)
        const effects = owner.ability === 'use' ? item?.use?.effects : item?.throw?.effects
        if (
          !effects?.some(
            (effect) => effect.kind === 'itemPrivateScript' && effect.script.id === owner.scriptId,
          )
        ) {
          rejectChangedProjectReference('物品私有脚本', `${owner.itemId}/${owner.scriptId}`)
          return
        }
        setItemPrivateScriptFocus({
          itemId: owner.itemId,
          ability: owner.ability,
          scriptId: owner.scriptId,
          revision: nextPreciseFocusRevision(),
        })
        applyEditorLocation(editorLinks.item(owner.itemId))
        return
      }
      const canonicalScene = currentScriptState.scenes.find(
        (candidate) => candidate.id === owner.sceneId,
      )
      if (owner.kind === 'scene-hook') {
        if (!canonicalScene?.hooks?.[owner.slot]?.variants[owner.hookId]) {
          rejectChangedProjectReference(
            '场景脚本方案',
            `${owner.sceneId}/${owner.slot}/${owner.hookId}`,
          )
          return
        }
        if (!openProjectSceneReference(owner.sceneId)) return
        const revision = nextPreciseFocusRevision()
        setCanonicalReferenceFocus(undefined)
        setCanonicalOwnerFocus({ owner, revision })
        setDrawer({
          open: true,
          src: null,
          internalScriptId: null,
          commandPath: null,
          focusRevision: revision,
        })
        return
      }
      const canonicalEntity = canonicalScene?.entities.find(
        (candidate) => candidate.id === owner.entityId,
      )
      if (owner.kind === 'entity-behavior') {
        if (!canonicalEntity?.behaviors?.[owner.channel]?.[owner.behaviorId]) {
          rejectChangedProjectReference(
            '实体行为',
            `${owner.sceneId}/${owner.entityId}/${owner.channel}/${owner.behaviorId}`,
          )
          return
        }
        if (!openProjectSceneReference(owner.sceneId, owner.entityId)) return
        const revision = nextPreciseFocusRevision()
        setScriptChannel(owner.channel)
        setSelectedBehavior(owner.behaviorId)
        setCanonicalReferenceFocus(undefined)
        setCanonicalOwnerFocus({ owner, revision })
        setDrawer({
          open: true,
          src: null,
          internalScriptId: null,
          commandPath: null,
          focusRevision: revision,
        })
        return
      }
      if (!canonicalEntity?.hostile || !Array.isArray(canonicalEntity.hostile.onLose)) {
        rejectChangedProjectReference('敌对失败脚本', `${owner.sceneId}/${owner.entityId}`)
        return
      }
      if (!openProjectSceneReference(owner.sceneId, owner.entityId)) return
      const revision = nextPreciseFocusRevision()
      setCanonicalOwnerFocus(undefined)
      setEntityHostileFocus({
        sceneId: owner.sceneId,
        entityId: owner.entityId,
        commandPath: '',
        revision,
      })
      setDrawer({
        open: false,
        src: null,
        internalScriptId: null,
        commandPath: null,
        focusRevision: revision,
      })
      return
    }
    if (locator.kind === 'unavailable') {
      setWorkspaceNotice({ kind: 'info', message: locator.reason })
      return
    }

    const object = locator.object
    switch (object.kind) {
      case 'scene':
        openProjectSceneReference(object.id)
        return
      case 'entity':
        openProjectSceneReference(object.sceneId, object.entityId)
        return
      case 'entry-point':
        if (!currentState.manifest.entryPoints.some((entry) => entry.id === object.id)) {
          rejectChangedProjectReference('入口', object.id)
          return
        }
        applyEditorLocation(editorLinks.entryPoint(object.id))
        return
      case 'map':
        if (!currentState.mapIndex.maps.some((map) => map.id === object.id)) {
          rejectChangedProjectReference('地图', object.id)
          return
        }
        applyEditorLocation(editorLinks.map(object.id))
        return
      case 'shop':
        if (!(currentState.shops ?? []).some((shop) => String(shop.id) === object.id)) {
          rejectChangedProjectReference('商店', object.id)
          return
        }
        applyEditorLocation(editorLinks.shop(Number(object.id)))
        return
      case 'actor':
        if (!currentState.actors.some((actor) => actor.id === object.id)) {
          rejectChangedProjectReference('角色', object.id)
          return
        }
        applyEditorLocation(
          editorLinks.actor(
            object.id,
            ACTOR_WORKSPACE_SECTIONS.includes(locator.section as ActorWorkspaceSection)
              ? (locator.section as ActorWorkspaceSection)
              : undefined,
          ),
        )
        return
      case 'item':
        if (!currentState.items.some((item) => item.id === object.id)) {
          rejectChangedProjectReference('物品', object.id)
          return
        }
        applyEditorLocation(
          locator.section === 'crafting'
            ? editorLinks.itemCrafting(object.id)
            : locator.section === 'spirit-gourd'
              ? editorLinks.spiritGourd(object.id)
              : editorLinks.item(object.id),
        )
        return
      case 'skill':
        if (!currentState.skills.some((skill) => skill.id === object.id)) {
          rejectChangedProjectReference('技能', object.id)
          return
        }
        applyEditorLocation(editorLinks.skill(object.id))
        return
      case 'enemy':
        if (!(currentState.enemies ?? []).some((enemy) => enemy.id === object.id)) {
          rejectChangedProjectReference('敌人', object.id)
          return
        }
        applyEditorLocation(editorLinks.enemy(object.id))
        return
      case 'poison':
        if (!(currentState.poisons ?? []).some((poison) => String(poison.id) === object.id)) {
          rejectChangedProjectReference('毒', object.id)
          return
        }
        applyEditorLocation(editorLinks.poison(Number(object.id)))
        return
      case 'battle-field':
        if (!(currentState.battleFields ?? []).some((field) => String(field.id) === object.id)) {
          rejectChangedProjectReference('战场', object.id)
          return
        }
        applyEditorLocation(editorLinks.battleField(Number(object.id)))
        return
      case 'enemy-team':
        if (!(currentState.enemyTeams ?? []).some((team) => team.id === object.id)) {
          rejectChangedProjectReference('敌队', object.id)
          return
        }
        applyEditorLocation(editorLinks.enemyTeam(object.id))
        return
      case 'ambience':
        if (!(currentState.ambiences ?? []).some((ambience) => ambience.id === object.id)) {
          rejectChangedProjectReference('氛围', object.id)
          return
        }
        applyEditorLocation(editorLinks.ambience(object.id))
        return
      case 'world-variable':
        if (!currentState.worldVariables?.[object.id]) {
          rejectChangedProjectReference('世界变量', object.id)
          return
        }
        applyEditorLocation(editorLinks.variable(object.id))
        return
      case 'shared-script':
        if (!currentScriptState.sharedScripts[object.id]) {
          rejectChangedProjectReference('共享脚本', object.id)
          return
        }
        openSharedScript(object.id)
        return
      case 'tileset':
        if (!(currentState.tilesets ?? []).some((tileset) => tileset.id === object.id)) {
          rejectChangedProjectReference('瓦片集', object.id)
          return
        }
        applyEditorLocation(editorLinks.tileset(object.id))
        return
      case 'stamp':
        if (!currentState.stamps.some((stamp) => stamp.id === object.id)) {
          rejectChangedProjectReference('组合', object.id)
          return
        }
        applyEditorLocation(editorLinks.stamp(object.id))
        return
      case 'world-sprite':
        if (!currentState.sprites.some((sprite) => sprite.id === object.id)) {
          rejectChangedProjectReference('世界精灵', object.id)
          return
        }
        applyEditorLocation(editorLinks.actorSprite(object.id))
        return
      case 'world-sprite-action': {
        const worldSprite = currentState.sprites.find((sprite) => sprite.id === object.spriteId)
        if (!worldSprite) {
          rejectChangedProjectReference('世界精灵', object.spriteId)
          return
        }
        if (!worldSprite.poses?.[object.actionId]) {
          rejectChangedProjectReference('世界精灵动作', `${object.spriteId}/${object.actionId}`)
          return
        }
        applyEditorLocation(editorLinks.worldSpriteAction(object.spriteId, object.actionId))
        return
      }
      case 'battle-sprite':
        if (!currentState.battleSprites.some((sprite) => sprite.id === object.id)) {
          rejectChangedProjectReference('战斗精灵', object.id)
          return
        }
        applyEditorLocation(editorLinks.battleSprite(object.id))
        return
      case 'project':
        applyEditorLocation(editorLinks.project())
        return
      default:
        setWorkspaceNotice({
          kind: 'info',
          message: `引用位置 ${reference.where} 尚未接入统一导航。`,
        })
    }
  }
  // C0:实体经 actor⊕sprite 解析;玩家精灵 = party[0] → ActorDef.spriteId(与引擎同路径)
  const actorsById = useMemo(
    () => Object.fromEntries(state.actors.map((a) => [a.id, a])) as Record<string, ActorDef>,
    [state.actors],
  )
  const canonicalScriptEditorContext = useMemo<CanonicalScriptEditorContext | undefined>(() => {
    if (!scriptState) return undefined
    return {
      state: scriptState,
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
        poisons: state.poisons ?? [],
        sprites: state.sprites,
        battleSprites: state.battleSprites,
        ambiences: state.ambiences ?? [],
        mapIndex: state.mapIndex,
        assetCatalog: state.assetCatalog,
        authorScripts: Object.entries(scriptState.sharedScripts).map(([id, script]) => ({
          id,
          name: script.name,
        })),
      }),
      worldVariables: state.worldVariables,
      onOpenScript: openSharedScript,
      onOpenWorldVariable: (id) => applyEditorLocation(editorLinks.variable(id)),
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
    scriptState,
    state.actors,
    state.ambiences,
    state.assetCatalog,
    state.battleSprites,
    state.battleFields,
    state.enemyTeams,
    state.items,
    state.locale,
    state.mapIndex,
    state.poisons,
    state.scenes,
    state.shops,
    state.skills,
    state.sprites,
    state.worldVariables,
    applyEditorLocation,
    openSharedScript,
  ])
  const leaderSpriteId = actorsById[defaultEntry?.startWorld.party[0] ?? '']?.spriteId
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
  const outlinerAvailable = editorSubpageHasOutliner(editorSubpage(location))
  const inspectorAvailable = editorSubpageHasInspector(editorSubpage(location))
  const effectiveOutlinerCollapsed = outlinerCollapsed || !outlinerAvailable
  const effectiveInspectorCollapsed = inspectorCollapsed || !inspectorAvailable
  const toggleOutliner = useCallback(() => {
    if (outlinerAvailable) setOutlinerCollapsed((collapsed) => !collapsed)
  }, [outlinerAvailable, setOutlinerCollapsed])
  const toggleInspector = useCallback(() => {
    if (inspectorAvailable) setInspectorCollapsed((collapsed) => !collapsed)
  }, [inspectorAvailable, setInspectorCollapsed])
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
  const requestedOutlinerWidth = effectiveOutlinerCollapsed
    ? 0
    : clampPanelSize(outlinerWidth, OUTLINER_MIN_WIDTH, OUTLINER_MAX_WIDTH)
  const requestedInspectorWidth = effectiveInspectorCollapsed
    ? 0
    : clampPanelSize(inspectorWidth, INSPECTOR_MIN_WIDTH, INSPECTOR_MAX_WIDTH)
  const fittedPanels = fitSidePanelWidths({
    available: layoutWidth - CENTER_MIN_WIDTH,
    left: requestedOutlinerWidth,
    right: requestedInspectorWidth,
    leftMin: effectiveOutlinerCollapsed ? 0 : OUTLINER_MIN_WIDTH,
    rightMin: effectiveInspectorCollapsed ? 0 : INSPECTOR_MIN_WIDTH,
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
  const objectTargetMissing = editorObjectTargetMissing(state, location, scriptState?.sharedScripts)
  const historyOwnerRef = useRef<'main' | 'script'>('main')
  useEffect(() => {
    let version = session.getHistoryVersion()
    return session.subscribe(() => {
      const next = session.getHistoryVersion()
      if (next !== version) historyOwnerRef.current = 'main'
      version = next
    })
  }, [session])
  useEffect(() => {
    if (!scriptSession) return undefined
    let version = scriptSession.getHistoryVersion()
    return scriptSession.subscribe(() => {
      const next = scriptSession.getHistoryVersion()
      if (next !== version) historyOwnerRef.current = 'script'
      version = next
    })
  }, [scriptSession])

  const reconcileLocationAfterHistory = useCallback((): void => {
    const current = locationRef.current
    if (
      editorObjectTargetMissing(
        session.getState(),
        current,
        scriptSession?.getState().sharedScripts,
      )
    ) {
      const next = { ...current }
      delete next.objectId
      applyEditorLocation(next, 'replace')
    }
  }, [applyEditorLocation, scriptSession, session])
  const undo = useCallback((): void => {
    if (historyCoordinator?.undo()) {
      reconcileLocationAfterHistory()
      return
    }
    const preferred = historyOwnerRef.current
    if (preferred === 'script' && scriptSession?.undo()) return
    if (session.undo()) {
      reconcileLocationAfterHistory()
      return
    }
    scriptSession?.undo()
  }, [historyCoordinator, reconcileLocationAfterHistory, scriptSession, session])
  const redo = useCallback((): void => {
    if (historyCoordinator?.redo()) {
      reconcileLocationAfterHistory()
      return
    }
    const preferred = historyOwnerRef.current
    if (preferred === 'script' && scriptSession?.redo()) return
    if (session.redo()) {
      reconcileLocationAfterHistory()
      return
    }
    scriptSession?.redo()
  }, [historyCoordinator, reconcileLocationAfterHistory, scriptSession, session])

  const selEntity =
    selected.kind === 'entity' ? scene?.entities.find((e) => e.id === selected.id) : undefined
  const canonicalScene = scriptState?.scenes.find((candidate) => candidate.id === scene?.id)
  const canonicalEntity = canonicalScene?.entities.find(
    (candidate) => candidate.id === selEntity?.id,
  )
  const canonicalPage =
    canonicalEntity?.pages?.find((page) => page.id === selectedPage) ??
    canonicalEntity?.pages?.find((page) => page.id === canonicalEntity.initialPage) ??
    canonicalEntity?.pages?.[0]
  const canonicalPageIndex = Math.max(
    0,
    canonicalEntity?.pages?.findIndex((page) => page.id === canonicalPage?.id) ?? 0,
  )
  const selectedScriptOwnerKey = `${scene?.id ?? ''}\u0000${selEntity?.id ?? ''}`
  useEffect(() => {
    void selectedScriptOwnerKey
    setSelectedPage(undefined)
    setSelectedBehavior(undefined)
  }, [selectedScriptOwnerKey])
  useEffect(() => {
    if (
      !canonicalPageFocus ||
      canonicalPageFocus.sceneId !== scene?.id ||
      canonicalPageFocus.entityId !== selEntity?.id
    )
      return
    setSelectedPage(canonicalPageFocus.pageId)
    setScriptChannel(canonicalPageFocus.channel)
    setSelectedBehavior(canonicalPageFocus.behaviorId)
    setCanonicalPageFocus(undefined)
  }, [canonicalPageFocus, scene?.id, selEntity?.id])
  useEffect(() => {
    if (
      !entityPageFocus ||
      entityPageFocus.sceneId !== scene?.id ||
      entityPageFocus.entityId !== selEntity?.id
    )
      return
    const page = canonicalEntity?.pages?.[entityPageFocus.pageIndex]
    if (page) setSelectedPage(page.id)
    setEntityPageFocus(undefined)
  }, [canonicalEntity?.pages, entityPageFocus, scene?.id, selEntity?.id])
  const selectedNamedEntryId = selected.kind === 'named-entry' ? selected.id : undefined
  const sceneReferencesActive = activeSubpage.kind === 'scene'
  const projectReferenceIndex = useMemo(
    () =>
      derivedData?.projectReferences
        ? createProjectReferenceIndex(derivedData.projectReferences)
        : undefined,
    [derivedData?.projectReferences],
  )
  const currentProjectReferenceIndex = useMemo(
    () => createCurrentProjectReferenceIndexProvider(() => scriptSession.getStateSnapshot()),
    [scriptSession],
  )
  const canonicalBehaviorReferenceIndex = useMemo(
    () => new Map(derivedData?.canonicalBehaviorReferences ?? []),
    [derivedData?.canonicalBehaviorReferences],
  )
  const canonicalSceneHookReferenceIndex = useMemo(
    () => new Map(derivedData?.canonicalSceneHookReferences ?? []),
    [derivedData?.canonicalSceneHookReferences],
  )
  const currentDerivedRevision = {
    mainHistoryVersion: session.getHistoryVersion(),
    scriptHistoryVersion: scriptSession.getHistoryVersion(),
  }
  const derivedReferenceSnapshotCurrent = isEditorDerivedSnapshotCurrent(
    derivedSnapshot,
    currentDerivedRevision,
  )
  const effectiveDerivedStatus = effectiveEditorDerivedStatus(
    derivedSnapshot,
    currentDerivedRevision,
  )
  const selectedAnchor: SceneAnchorSelection | null =
    selected.kind === 'default-entry'
      ? { kind: 'default' }
      : selected.kind === 'named-entry'
        ? { kind: 'named', id: selected.id }
        : null
  const selectedEntryReferences = useMemo(
    () =>
      scene && selectedNamedEntryId && sceneReferencesActive
        ? (projectReferenceIndex?.deletionImpact({
            kind: 'scene-entry',
            sceneId: scene.id,
            entryId: selectedNamedEntryId,
          }).blockers ?? [])
        : [],
    [projectReferenceIndex, scene, sceneReferencesActive, selectedNamedEntryId],
  )
  const entryReferencesById = useMemo(
    () =>
      sceneReferencesActive
        ? new Map(
            Object.keys(scene.entries ?? {}).map((entryId) => [
              entryId,
              projectReferenceIndex?.deletionImpact({
                kind: 'scene-entry',
                sceneId: scene.id,
                entryId,
              }).blockers ?? [],
            ]),
          )
        : new Map<string, ProjectReferenceEdge[]>(),
    [projectReferenceIndex, scene, sceneReferencesActive],
  )
  const entityReferences = (entityId: string): ProjectReferenceEdge[] => {
    if (!sceneReferencesActive || !projectReferenceIndex) return []
    const target = { kind: 'entity', sceneId: scene.id, entityId } as const
    return projectReferenceIndex.deletionImpact(
      target,
      projectReferenceIndex.deletionScopeFor([target]),
    ).blockers
  }
  const selectedEntityReferences = selEntity ? entityReferences(selEntity.id) : []
  const canonicalEntitiesById = new Map(
    (canonicalScene?.entities ?? []).map((entity) => [entity.id, entity]),
  )
  const outlineTriggerActivation = (entityId: string): TriggerActivation | undefined => {
    const entity = canonicalEntitiesById.get(entityId)
    const page = entityId === selEntity?.id ? canonicalPage : initialCanonicalEntityPage(entity)
    return activePageTriggerActivation(page)
  }
  const deleteEntity = useCallback(
    (entityId: string): void => {
      if (placingEntity || !scene) return
      if (!derivedReferenceSnapshotCurrent) {
        setWorkspaceNotice({ kind: 'info', message: '正在刷新实体引用，请稍后再删除。' })
        return
      }
      const currentReferenceState = mergeEditorProjectionWithCurrentAuthorState(
        scriptSession.getStateSnapshot(),
        session.getState(),
      )
      const currentReferences = collectEntityAddressReferences(currentReferenceState).filter(
        (reference) =>
          entityAddressReferenceBlocksDeletion(reference, { scene: scene.id, entity: entityId }),
      )
      if (currentReferences.length) return
      historyCoordinator.dispatch(
        new DeleteSceneEntityDefinitionCommand(scene.id, entityId),
        new DeleteEntityCommand(scene.id, entityId, currentReferenceState),
      )
      setSelected(SCENE_SELECTION)
      setWorkspaceNotice({ kind: 'info', message: `已删除实体 ${entityId}；可撤销。` })
      requestAnimationFrame(() => sceneOutlineRowRef.current?.focus())
    },
    [
      derivedReferenceSnapshotCurrent,
      historyCoordinator,
      placingEntity,
      scene,
      scriptSession,
      session,
    ],
  )
  const deleteNamedEntry = useCallback(
    (entryId: string): void => {
      if (placingEntity || !scene.entries?.[entryId]) return
      if (!derivedReferenceSnapshotCurrent) {
        setWorkspaceNotice({ kind: 'info', message: '正在刷新脚本引用，请稍后再删除。' })
        return
      }
      const currentIndex = buildCanonicalSceneEntryReferenceIndex(scriptSession.getStateSnapshot())
      const references = currentIndex.get(sceneEntryReferenceKey(scene.id, entryId)) ?? []
      if (references.length) return
      session.dispatch(
        new DeleteSceneEntryCommand(scene.id, entryId, (_state, targetSceneId, targetEntryId) => {
          const fresh = buildCanonicalSceneEntryReferenceIndex(scriptSession.getStateSnapshot())
          return fresh.get(sceneEntryReferenceKey(targetSceneId, targetEntryId)) ?? []
        }),
      )
      setSelected(SCENE_SELECTION)
      setWorkspaceNotice({ kind: 'info', message: `已删除命名落点 ${entryId}；可撤销。` })
      requestAnimationFrame(() => sceneOutlineRowRef.current?.focus())
    },
    [derivedReferenceSnapshotCurrent, placingEntity, scene, scriptSession, session],
  )
  // 删除键与行尾动作共用同一删除入口；输入控件内不劫持。
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (executeEditorSaveShortcut(e, saveCommandRef.current)) return
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
        scene &&
        (selected.kind === 'entity' || selected.kind === 'named-entry') &&
        !placingEntity &&
        !typing
      ) {
        e.preventDefault()
        if (selected.kind === 'entity') deleteEntity(selected.id)
        else if (selected.kind === 'named-entry') deleteNamedEntry(selected.id)
        return
      }
      // undo/redo 快捷键(⌘/Ctrl+Z,+Shift=redo;输入框内不劫持)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !typing) {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (
        !typing &&
        executeEditorLayoutShortcut(e, layoutCommandHandlers, {
          outlinerAvailable,
          scriptPanelAvailable,
          inspectorAvailable,
        })
      ) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    scene,
    selected,
    placingEntity,
    drawer.open,
    scriptPanelAvailable,
    activeSubpage.kind,
    deleteEntity,
    deleteNamedEntry,
    layoutCommandHandlers,
    outlinerAvailable,
    inspectorAvailable,
    redo,
    undo,
  ])

  useEffect(() => {
    document.title = `${state.manifest.name} · type-pal 编辑器`
  }, [state.manifest.name])

  if (!scene && activeSubpage.kind !== 'project') {
    const invalidEntryTarget = defaultEntry?.scene ?? state.manifest.defaultEntryId
    return (
      <div className="boot">
        <div className="boot-entry-error">
          <div className="err">直接启动入口 "{invalidEntryTarget}" 无效</div>
          <p>项目仍可修复；请重新选择直接启动入口（不经过标题菜单）的起始场景。</p>
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
    const id = newEntityId([...scene.entities, ...(canonicalScene?.entities ?? [])])
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
    const pos = { col: cell.col, row: cell.row, height: 0 }
    historyCoordinator.dispatch(
      new AddSceneEntityDefinitionCommand(
        scene.id,
        createCanonicalPlacedEntity(id, pos, placement),
      ),
      new AddEntityCommand(scene.id, createPlacedEntity(id, pos, placement)),
    )
    setSelected({ kind: 'entity', id })
    setPlacingEntity(false)
  }
  const sceneEntityGroups = (['预制人物', '自定义实体', '触发区'] as const).map((title) => ({
    title,
    entities: scene.entities.filter((entity) => entityShapeLabel(entity) === title),
  }))
  const serializeEditorSnapshot = (
    shellState: ReturnType<EditSession['getState']>,
    scriptState: ScriptEditorState | undefined,
    includeAssetCopies: boolean,
  ): Promise<Record<string, unknown>> => {
    if (!scriptState) throw new Error('current 作者态缺失，拒绝序列化交互投影')
    return serializeProjectWithMapCopies(
      mergeEditorProjectionWithCurrentAuthorState(scriptState, shellState),
      project.source,
      { includeAssetCopies },
    )
  }
  // 保存:File System Access + 增量(快照-diff,只写变化;P3)。所有入口先经过 workspace
  // persistence policy，成功后才按 workspaceId 登记目录句柄。
  const save = async (): Promise<void> => {
    if (saveInFlightRef.current || exporting) return
    saveInFlightRef.current = true
    setSaveActivity({ phase: 'choosing-directory' })
    try {
      let dir = dirHandleRef.current
      let rememberDirectory = false
      let resumesInterruptedAttempt = false
      if (!dir) {
        if (
          props.workspace.mode === 'pal-development' &&
          !window.confirm(
            '当前是 PAL 开发基线模式。只有选择与本次启动快照一致的 projects/pal 目录才会获准写入；要继续吗？',
          )
        )
          return
        dir = await pickDir()
        if (!dir) return
        const previousAttempt = saveAttemptDirRef.current
        resumesInterruptedAttempt = previousAttempt ? await dir.isSameEntry(previousAttempt) : false
        if (!resumesInterruptedAttempt) snapshotRef.current = null
        saveAttemptDirRef.current = dir
        rememberDirectory = true
        // Early read-only proof gives immediate feedback after the picker. The same proof is run
        // again immediately before mutation below to close the serialize/fetch TOCTOU window.
        await preflightFirstSaveTarget(props.workspace, dir, { resumesInterruptedAttempt })
      }
      const savedState = session.getState()
      const savedScriptState = scriptSession?.getState()
      const savedScriptVersion = scriptSession?.getVersion()
      const removePaths = [...session.getDeletedMapPaths(), ...session.getDeletedAssetPaths()]
      setSaveErr('')
      setSaveActivity({ phase: 'preparing' })
      // 先让原生 modal 进入 top layer，再开始可能较重的全项目序列化。
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      // HTTP 项目第一次选择本地目录时没有可复制的源目录，必须从 FileSource
      // 把 catalog 的全部二进制一并物化，不能只写本会话新增的 assetBlobs。
      const files = await serializeEditorSnapshot(savedState, savedScriptState, rememberDirectory)
      let lastPercent = -1
      setSaveActivity({ phase: 'writing', completed: 0, total: 0 })
      // 即使是首存也传空 Map：writeProject 会把每个已成功 close 的路径记进实际磁盘恢复快照。
      // 中断后该 Map 留在 ref 中，下次保存/撤销才能清理已写但未发布的新 blob。
      const recoverySnapshot = snapshotRef.current ?? new Map<string, string>()
      snapshotRef.current = recoverySnapshot
      const target = rememberDirectory
        ? await authorizeFirstSaveTarget(props.workspace, dir, { resumesInterruptedAttempt })
        : await authorizeBoundWorkspaceTarget(props.workspace, dir)
      snapshotRef.current = await withAuthorizedWorkspaceMutation(target, async (mutation) => {
        const nextSnapshot = await writeProject(mutation, files, {
          prevSnapshot: recoverySnapshot,
          removePaths,
          onProgress: ({ completed, total }) => {
            const percent = total > 0 ? Math.floor((completed / total) * 100) : 0
            if (percent === lastPercent && completed < total) return
            lastPercent = percent
            setSaveActivity({ phase: 'writing', completed, total })
          },
        })
        // Registration stays under the same workspace mutation lock as the write. A competing
        // first-save therefore sees the binding before it can mutate an identical directory copy.
        await registerAuthorizedWorkspaceMutation(mutation, props.workspace, dir.name)
        return nextSnapshot
      })
      // 若保存期间仍有后台 hydrate/command 生成新 state，磁盘只是开始时快照，不能误清 dirty。
      if (session.getState() === savedState) session.markSaved()
      if (
        scriptSession &&
        savedScriptVersion !== undefined &&
        scriptSession.getVersion() === savedScriptVersion
      )
        scriptSession.markSaved()
      if (rememberDirectory) {
        // 只有完整 writeProject 成功后才把目录升级为后续增量保存目标。若素材 fetch /
        // hash 校验 / 写盘中途失败，下一次仍按 HTTP 首存全量物化，不能提交半闭包项目。
        dirHandleRef.current = dir
        saveAttemptDirRef.current = dir
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

  // 「项目」菜单(P4 native-app 手感:新建 / 打开别的 / 另存为)。切项目 → 上抛 main 重建 session。
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
      const savedScriptState = scriptSession?.getState()
      const removePaths = [...session.getDeletedMapPaths(), ...session.getDeletedAssetPaths()]
      const sourceDir = dirHandleRef.current ?? undefined
      // 必须在点击调用栈内同步启动，File System Access 的目录选择器才保有用户激活。
      const operation = saveProjectAs(
        props.workspace,
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
    const next = window.prompt('项目名称（文件夹与 ID 不变）：', current)?.trim()
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
      label: '新建项目',
      icon: 'open',
      enabled: props.onBackToPicker !== undefined,
      scope: 'global',
      defaultPlacement: 'common',
      execute: () => props.onBackToPicker?.(),
    },
    {
      id: 'file.open',
      label: '打开项目',
      icon: 'open',
      enabled: saveActivity === null,
      scope: 'global',
      defaultPlacement: 'common',
      execute: () => void runProj(() => openExistingProject({ forceSandbox: props.forceSandbox })),
    },
    {
      id: 'file.rename',
      label: '重命名项目',
      icon: 'more',
      enabled: saveActivity === null,
      scope: 'global',
      execute: renameProject,
    },
    {
      id: 'file.save-as',
      label: '另存为',
      icon: 'save',
      enabled: saveActivity === null && !exporting,
      scope: 'global',
      execute: () => void saveAs(),
    },
    {
      id: 'file.export',
      label: exporting ? '正在导出' : '导出 ZIP',
      icon: 'copy',
      enabled: Boolean(dirHandleRef.current) && saveActivity === null && !exporting,
      disabledReason: dirHandleRef.current ? undefined : '请先打开或保存本地项目',
      busy: exporting,
      scope: 'global',
      execute: exportZip,
    },
    {
      id: 'edit.undo',
      label: '撤销',
      icon: 'undo',
      shortcut: '⌘Z',
      enabled: session.canUndo() || (scriptSession?.canUndo() ?? false),
      scope: 'global',
      defaultPlacement: 'fixed',
      execute: undo,
    },
    {
      id: 'edit.redo',
      label: '重做',
      icon: 'redo',
      shortcut: '⇧⌘Z',
      enabled: session.canRedo() || (scriptSession?.canRedo() ?? false),
      scope: 'global',
      defaultPlacement: 'fixed',
      execute: redo,
    },
    {
      id: 'file.save',
      label: saveActivity
        ? '正在保存'
        : !dirHandleRef.current && props.workspace.mode === 'sandbox'
          ? '保存评审副本'
          : !dirHandleRef.current && props.workspace.mode === 'pal-development'
            ? '保存 PAL 开发基线'
            : '保存',
      icon: 'save',
      shortcut: '⌘S',
      enabled: editorDirty && saveActivity === null && !exporting,
      busy: saveActivity !== null,
      scope: 'global',
      defaultPlacement: 'fixed',
      execute: () => void save(),
    },
    ...createEditorLayoutCommands(layoutCommandHandlers, {
      outlinerAvailable,
      outlinerVisible: !effectiveOutlinerCollapsed,
      scriptPanelAvailable,
      scriptPanelVisible: drawer.open,
      inspectorAvailable,
      inspectorVisible: !effectiveInspectorCollapsed,
    }),
  ])
  const saveCommand = requireEditorAppCommand(commands, 'file.save')
  saveCommandRef.current = saveCommand

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
    label: module.label,
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
        section: module.label,
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
        ...(outlinerAvailable ? [commandItem('view.toggle-outliner')] : []),
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

  return (
    <div className="editor ds-form-scope" aria-busy={saveActivity !== null ? true : undefined}>
      <EditorAppHeader
        projectName={state.manifest.name}
        workspaceLabel={workspaceModeLabel(props.workspace)}
        menus={menus}
        commands={commands}
        toolbarCommandGroups={[
          editorPanelToolbarCommandIds({
            outlinerAvailable,
            scriptPanelAvailable,
            inspectorAvailable,
          }),
          ['edit.undo', 'edit.redo', 'file.save'],
        ]}
        onNavigate={onHeaderNavigate}
      />

      <section
        ref={bodyRef}
        tabIndex={-1}
        aria-label={`${activeSubpage.label}工作区`}
        inert={saveActivity !== null ? true : undefined}
        className={`body${effectiveOutlinerCollapsed ? ' outliner-collapsed' : ''}${effectiveInspectorCollapsed ? ' inspector-collapsed' : ''}`}
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
            referenceIndex={projectReferenceIndex}
            referenceStatus={effectiveDerivedStatus}
            getCurrentReferenceIndex={currentProjectReferenceIndex}
            onOpenReference={openProjectReference}
            tilesets={state.tilesets ?? []}
            stamps={state.stamps}
            onOpenStampLibrary={(id) => applyEditorLocation(editorLinks.stamp(id))}
            onRequestInspectorOpen={() => setInspectorCollapsed(false)}
            onWorkspaceNotice={setWorkspaceNotice}
          />
        ) : activeSubpage.kind === 'actor' ? (
          <ConnectedActorMode
            derivedStore={derivedStore}
            scriptSession={scriptSession}
            assetBase={project.assetBase}
            session={session}
            focusActorId={location.objectId}
            focusSection={location.actionId}
            onActorFocus={(id) => focusCurrentObject(id)}
            onSectionChange={(section) => {
              const actorId = location.objectId ?? session.getState().actors[0]?.id
              if (actorId) applyEditorLocation(editorLinks.actor(actorId, section), 'replace')
            }}
            onOpenSprite={(id) => applyEditorLocation(editorLinks.actorSprite(id))}
            onOpenBattleSprite={(id) => applyEditorLocation(editorLinks.battleSprite(id))}
            assetReader={assetReader}
            onOpenSound={(id) => applyEditorLocation(editorLinks.sound(id))}
            onOpenImage={(id) => applyEditorLocation(editorLinks.image(id))}
            getCurrentReferenceIndex={currentProjectReferenceIndex}
            onOpenActorReference={openProjectReference}
          />
        ) : activeSubpage.kind === 'project' && activeSubpage.projectPage ? (
          <ConnectedProjectWorkbench
            derivedStore={derivedStore}
            scriptSession={scriptSession}
            page={activeSubpage.projectPage}
            session={session}
            focusObjectId={location.objectId}
            onObjectFocus={focusCurrentObject}
            onOpenLocation={applyEditorLocation}
            assetReader={assetReader}
          />
        ) : activeSubpage.kind === 'data' && activeSubpage.dataPage ? (
          <ConnectedDataMode
            derivedStore={derivedStore}
            scriptSession={scriptSession}
            assetBase={project.assetBase}
            session={session}
            assetReader={assetReader}
            audioResolver={audioResolver}
            onStatusNotice={setWorkspaceNotice}
            onRequestSave={() => void save()}
            historyCoordinator={historyCoordinator}
            getCurrentProjectReferenceIndex={currentProjectReferenceIndex}
            onOpenProjectReference={openProjectReference}
            workspaceId={playWorkspaceId}
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
            onOpenEnemy={(id) => applyEditorLocation(editorLinks.enemy(id))}
            onOpenEnemyTeam={(id) => applyEditorLocation(editorLinks.enemyTeam(id))}
            onOpenScript={openScriptReference}
            onOpenWorldVariable={(id) => applyEditorLocation(editorLinks.variable(id))}
            onOpenCanonicalReference={openCanonicalReference}
            onOpenItem={(id) => applyEditorLocation(editorLinks.item(id))}
            onOpenItemAlchemy={(surface, itemId) =>
              applyEditorLocation(
                surface === 'crafting'
                  ? editorLinks.itemCrafting(itemId)
                  : editorLinks.spiritGourd(itemId),
              )
            }
            onOpenProjectIssues={() =>
              applyEditorLocation({ module: 'project', subpage: 'advanced' })
            }
            onJumpWorldSpriteAutomaticScriptInstance={jumpToWorldSpriteAutomaticScriptInstance}
          />
        ) : (
          <>
            <div className="outliner outliner--split">
              <DsListHeader
                title="场景"
                count={state.scenes.length}
                unit="个"
                actions={[
                  {
                    id: 'create-scene',
                    label: '新建场景',
                    icon: 'add',
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
                      candidate.id === defaultEntry?.scene ? '(直接启动)' : ''
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
                  ref={sceneOutlineRowRef}
                  selected={selected.kind === 'scene'}
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
                <DsPressable
                  type="button"
                  className={`node child${selected.kind === 'default-entry' ? ' sel' : ''}`}
                  onClick={() => selectSceneEntry(DEFAULT_ENTRY_SELECTION)}
                >
                  <span className="ico">📍</span>
                  <span>默认落点</span>
                  <span className="k">落点</span>
                </DsPressable>
                {Object.entries(scene.entries ?? {}).map(([id, entry]) => {
                  const references = entryReferencesById.get(id) ?? []
                  const selectedEntry = selected.kind === 'named-entry' && selected.id === id
                  return (
                    <div
                      key={id}
                      className={`scene-outline-action-row${selectedEntry ? ' selected' : ''}`}
                    >
                      <DsPressable
                        type="button"
                        className={`node child${selectedEntry ? ' sel' : ''}`}
                        onClick={() => selectSceneEntry({ kind: 'named-entry', id })}
                      >
                        <span className="ico">◇</span>
                        <span className="node-label">{sceneEntryOutlineLabel(entry)}</span>
                        <span className="k">落点</span>
                      </DsPressable>
                      <span className="scene-outline-row-actions">
                        <DsIconButton
                          size="compact"
                          variant="danger"
                          icon="delete"
                          label={`删除命名落点 ${sceneEntryOutlineLabel(entry)}`}
                          disabled={
                            placingEntity ||
                            !derivedReferenceSnapshotCurrent ||
                            references.length > 0
                          }
                          title={
                            placingEntity
                              ? '请先结束实体放置'
                              : !derivedReferenceSnapshotCurrent
                                ? '正在刷新脚本引用，暂不允许删除'
                                : references.length
                                  ? `仍有 ${references.length} 处脚本引用；请到引用区处理`
                                  : `删除命名落点 ${sceneEntryOutlineLabel(entry)}`
                          }
                          onClick={() => deleteNamedEntry(id)}
                        />
                      </span>
                    </div>
                  )
                })}
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
                      {group.entities.map((e) => {
                        const references = entityReferences(e.id)
                        const selectedEntity = selected.kind === 'entity' && selected.id === e.id
                        return (
                          <div
                            key={e.id}
                            className={`scene-outline-action-row${selectedEntity ? ' selected' : ''}`}
                          >
                            <DsPressable
                              type="button"
                              className={`node child${selectedEntity ? ' sel' : ''}`}
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
                                      : `无外观触发区 · ${triggerActivationSummary(
                                          outlineTriggerActivation(e.id),
                                        )}`
                                }
                              >
                                {'zone' in e
                                  ? triggerActivationSummary(outlineTriggerActivation(e.id))
                                  : entityShapeLabel(e)}
                              </span>
                            </DsPressable>
                            <span className="scene-outline-row-actions">
                              <DsIconButton
                                size="compact"
                                variant="danger"
                                icon="delete"
                                label={`删除实体 ${e.id}`}
                                disabled={
                                  placingEntity ||
                                  !derivedReferenceSnapshotCurrent ||
                                  references.length > 0
                                }
                                title={
                                  placingEntity
                                    ? '请先结束实体放置'
                                    : !derivedReferenceSnapshotCurrent
                                      ? '正在刷新实体引用，暂不允许删除'
                                      : references.length
                                        ? `仍有 ${references.length} 处引用；请到“引用”页处理`
                                        : `删除实体 ${e.id}`
                                }
                                onClick={() => deleteEntity(e.id)}
                              />
                            </span>
                          </div>
                        )
                      })}
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
                  selectedTriggerActivation={activePageTriggerActivation(canonicalPage)}
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
              ) : scriptSession && scriptState ? (
                <CanonicalSceneScriptWorkspace
                  scene={scene}
                  state={scriptState}
                  selectedEntityId={selEntity?.id ?? null}
                  selectedPageId={canonicalPage?.id}
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
                  workspaceId={playWorkspaceId}
                  layers={{
                    grid: canvasLayers.grid,
                    blocked: canvasLayers.blocked,
                    ghosts: canvasLayers.ghosts,
                  }}
                  editorContext={canonicalScriptEditorContext}
                  behaviorReferenceIndex={canonicalBehaviorReferenceIndex}
                  sceneHookReferenceIndex={canonicalSceneHookReferenceIndex}
                  onDispatch={(command) => scriptSession.dispatch(command)}
                  onOpenReference={openCanonicalReference}
                  focusReference={canonicalReferenceFocus}
                  focusOwner={canonicalOwnerFocus}
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
                  workspaceId={playWorkspaceId}
                  ambiences={state.ambiences ?? []}
                  shops={state.shops ?? []}
                  layers={{
                    grid: canvasLayers.grid,
                    blocked: canvasLayers.blocked,
                    ghosts: canvasLayers.ghosts,
                  }}
                  onOpenScript={openSharedScript}
                  onOpenWorldVariable={(id) => applyEditorLocation(editorLinks.variable(id))}
                  onOpenSound={(id) => applyEditorLocation(editorLinks.sound(id))}
                  onOpenImage={(id) => applyEditorLocation(editorLinks.image(id))}
                  onOpenBattleSprite={(id) => applyEditorLocation(editorLinks.battleSprite(id))}
                  onOpenSpriteAction={(spriteId, actionId) =>
                    applyEditorLocation(editorLinks.worldSpriteAction(spriteId, actionId))
                  }
                />
              )}
            </div>

            <DsInspectorHost
              className={`inspector${!placingEntity && selEntity ? ' inspector--tabbed' : ''}`}
            >
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
                  pages={canonicalEntity?.pages ?? []}
                  page={canonicalPage}
                  onPageChange={setSelectedPage}
                  properties={
                    <EntityInspector
                      panel="properties"
                      pageIndex={canonicalPageIndex}
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
                      canonicalPage={canonicalPage}
                      triggerSyncToken={scriptSession?.getHistoryVersion() ?? 0}
                      onTriggerActivationChange={(pageId, activation) =>
                        scriptSession?.dispatch(
                          new SetEntityPageTriggerActivationCommand(
                            { scene: scene.id, entity: selEntity.id },
                            pageId,
                            activation,
                          ),
                        )
                      }
                      onOpenSpriteAction={(spriteId, actionId) =>
                        applyEditorLocation(editorLinks.worldSpriteAction(spriteId, actionId))
                      }
                      onOpenActor={(actorId) => applyEditorLocation(editorLinks.actor(actorId))}
                      onOpenBattleField={(fieldId) =>
                        applyEditorLocation(editorLinks.battleField(fieldId))
                      }
                    />
                  }
                  behavior={
                    <>
                      <EntityInspector
                        panel="behavior"
                        pageIndex={canonicalPageIndex}
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
                        canonicalPage={canonicalPage}
                        triggerSyncToken={scriptSession?.getHistoryVersion() ?? 0}
                        onTriggerActivationChange={(pageId, activation) =>
                          scriptSession?.dispatch(
                            new SetEntityPageTriggerActivationCommand(
                              { scene: scene.id, entity: selEntity.id },
                              pageId,
                              activation,
                            ),
                          )
                        }
                        onOpenSpriteAction={(spriteId, actionId) =>
                          applyEditorLocation(editorLinks.worldSpriteAction(spriteId, actionId))
                        }
                        onOpenActor={(actorId) => applyEditorLocation(editorLinks.actor(actorId))}
                        onOpenBattleField={(fieldId) =>
                          applyEditorLocation(editorLinks.battleField(fieldId))
                        }
                      />
                      {scriptSession && scriptState && !drawer.open ? (
                        <DsInspectorSection title="脚本行为" className="script-entity-section">
                          {canonicalEntity?.hostile ? (
                            <CanonicalHostileOnLoseEditor
                              value={canonicalEntity.hostile.onLose}
                              context={
                                canonicalScriptEditorContext
                                  ? {
                                      ...canonicalScriptEditorContext,
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
                                scriptSession.dispatch(
                                  new SetEntityHostileOnLoseCommand(
                                    { scene: scene.id, entity: selEntity.id },
                                    onLose,
                                  ),
                                )
                              }
                              onError={(message) => setWorkspaceNotice({ kind: 'error', message })}
                            />
                          ) : null}
                          {canonicalEntity && canonicalPage ? (
                            <DsPropertyGrid className="script-page-binding">
                              {(['trigger', 'auto'] as const).map((channel) => {
                                const registry = canonicalEntity.behaviors?.[channel] ?? {}
                                const fieldId = `scene-entity-page-${scene.id}-${selEntity.id}-${canonicalPage.id}-${channel}`
                                return (
                                  <DsPropertyRow
                                    key={channel}
                                    label={channel === 'trigger' ? '触发行为槽' : '自动行为槽'}
                                    labelFor={fieldId}
                                  >
                                    <DsSelect
                                      id={fieldId}
                                      value={canonicalPage[channel] ?? ''}
                                      options={[
                                        { value: '', label: '显式无行为' },
                                        ...Object.entries(registry)
                                          .sort(
                                            ([leftId, left], [rightId, right]) =>
                                              left.order - right.order ||
                                              leftId.localeCompare(rightId),
                                          )
                                          .map(([id, behavior]) => ({
                                            value: id,
                                            label: behavior.label,
                                            description: id,
                                          })),
                                      ]}
                                      onValueChange={(value) =>
                                        scriptSession.dispatch(
                                          new SetEntityPageBehaviorCommand(
                                            { scene: scene.id, entity: selEntity.id },
                                            canonicalPage.id,
                                            channel,
                                            value || undefined,
                                          ),
                                        )
                                      }
                                    />
                                  </DsPropertyRow>
                                )
                              })}
                            </DsPropertyGrid>
                          ) : null}
                          <div className="script-channel-tabs" role="tablist" aria-label="行为通道">
                            {(['trigger', 'auto'] as const).map((channel) => (
                              <DsPressable
                                key={channel}
                                type="button"
                                role="tab"
                                aria-selected={scriptChannel === channel}
                                className={scriptChannel === channel ? 'active' : ''}
                                onClick={() => {
                                  setScriptChannel(channel)
                                  setSelectedBehavior(undefined)
                                }}
                              >
                                {channel === 'trigger' ? '触发行为' : '自动行为'}
                              </DsPressable>
                            ))}
                          </div>
                          <ScriptBehaviorInspector
                            state={scriptState}
                            target={{ scene: scene.id, entity: selEntity.id }}
                            channel={scriptChannel}
                            selectedBehaviorId={selectedBehavior}
                            onSelectBehavior={setSelectedBehavior}
                            onDispatch={(command) => scriptSession.dispatch(command)}
                            editorContext={canonicalScriptEditorContext}
                            referenceIndex={canonicalBehaviorReferenceIndex}
                            onOpenReference={openCanonicalReference}
                            onOpenFlow={(behaviorId) =>
                              setWorkspaceNotice({
                                kind: 'info',
                                message: `已选择 ${scriptChannel} 行为 ${behaviorId}；正文编辑器将在此 canonical 槽内打开。`,
                              })
                            }
                            onError={(message) => setWorkspaceNotice({ kind: 'error', message })}
                          />
                        </DsInspectorSection>
                      ) : null}
                    </>
                  }
                  references={
                    <EntityReferencePanel
                      references={selectedEntityReferences}
                      onOpen={openProjectReference}
                    />
                  }
                  referenceCount={selectedEntityReferences.length}
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
                  onOpenReference={openProjectReference}
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
            </DsInspectorHost>
          </>
        )}

        {outlinerAvailable ? (
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
        ) : null}
        {inspectorAvailable ? (
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
        ) : null}
      </section>

      <EditorDiagnosticsBar
        session={session}
        scriptSession={scriptSession}
        derivedStore={derivedStore}
        activePageLabel={activeSubpage.label}
        workspaceLabel={workspaceModeLabel(props.workspace)}
        workspaceNotice={workspaceNotice}
        saveError={saveErr}
        busy={saveActivity !== null}
      />

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
        <DsButton onClick={props.onClear} size="compact" variant="secondary">
          打开当前页面
        </DsButton>
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
  const zoneRangeId = useId()
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
          <DsPressable
            type="button"
            className={mode === 'actor' ? 'active' : ''}
            aria-pressed={mode === 'actor'}
            onClick={() => onModeChange('actor')}
          >
            预制人物
          </DsPressable>
          <DsPressable
            type="button"
            className={mode === 'sprite' ? 'active' : ''}
            aria-pressed={mode === 'sprite'}
            onClick={() => onModeChange('sprite')}
          >
            自定义实体
          </DsPressable>
          <DsPressable
            type="button"
            className={!visibleMode ? 'active' : ''}
            aria-pressed={!visibleMode}
            onClick={() => onModeChange(mode === 'interact-zone' ? 'interact-zone' : 'touch-zone')}
          >
            触发区
          </DsPressable>
        </fieldset>

        {visibleMode ? (
          <>
            <DsTextInput
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
              <DsPressable
                type="button"
                className={triggerOn === 'touch' ? 'active' : ''}
                aria-pressed={triggerOn === 'touch'}
                onClick={() => onModeChange('touch-zone')}
              >
                触碰
              </DsPressable>
              <DsPressable
                type="button"
                className={triggerOn === 'interact' ? 'active' : ''}
                aria-pressed={triggerOn === 'interact'}
                onClick={() => onModeChange('interact-zone')}
              >
                交互
              </DsPressable>
            </fieldset>
            <DsPropertyGrid>
              <DsPropertyRow label="范围" labelFor={zoneRangeId}>
                <DsFieldMeasure measure="short-number">
                  <DsControlGroup
                    control={
                      <DsNumberInput
                        id={zoneRangeId}
                        size="compact"
                        min={0}
                        max={99}
                        value={zoneRanges[triggerOn]}
                        onChange={(event) => {
                          if (Number.isFinite(event.target.valueAsNumber))
                            onZoneRangeChange(triggerOn, Math.max(0, event.target.valueAsNumber))
                        }}
                      />
                    }
                    actions={<span>格</span>}
                  />
                </DsFieldMeasure>
              </DsPropertyRow>
            </DsPropertyGrid>
          </>
        )}

        {mode === 'actor' && (
          <div className="palette-list">
            {shownActors.map((actor) => {
              const sprite = spriteById.get(actor.spriteId)
              return (
                <DsPressable
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
                </DsPressable>
              )
            })}
            {shownActors.length === 0 && <div className="insp-empty">(无匹配)</div>}
          </div>
        )}

        {mode === 'sprite' && (
          <div className="palette-list">
            {shownSprites.map((s) => (
              <DsPressable
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
              </DsPressable>
            ))}
            {shownSprites.length === 0 && <div className="insp-empty">(无匹配)</div>}
          </div>
        )}
      </div>
    </>
  )
}

function EntityReferencePanel(props: {
  references: readonly ProjectReferenceEdge[]
  onOpen: (reference: ProjectReferenceEdge) => void
}) {
  const { references, onOpen } = props
  return (
    <section className="section entity-reference-section">
      <DsReferencePanel
        state={references.length ? 'ready' : 'empty'}
        count={{ kind: 'exact', value: references.length }}
        impact={{
          kind: 'blocking',
          description: references.length
            ? '先处理全部外部引用，才能执行删除。'
            : '当前没有外部引用；删除操作可用。',
        }}
      >
        {references.length ? (
          <DsReferenceList>
            {references.map((reference) => {
              const unavailableReason =
                reference.locator.kind === 'unavailable' ? reference.locator.reason : undefined
              const canOpen = unavailableReason === undefined
              return (
                <DsReferenceRow
                  key={reference.id}
                  title={reference.source.label}
                  detail={reference.where || '/'}
                  labels={[{ label: '实体引用' }]}
                  action={
                    canOpen
                      ? {
                          label: '打开',
                          onActivate: () => onOpen(reference),
                        }
                      : undefined
                  }
                  status={
                    canOpen
                      ? undefined
                      : {
                          label: '只读',
                          reason: unavailableReason,
                        }
                  }
                />
              )
            })}
          </DsReferenceList>
        ) : null}
      </DsReferencePanel>
    </section>
  )
}

function SceneEntityInspectorTabs(props: {
  entity: EntityDef
  locale: Locale
  actorsById: Record<string, ActorDef>
  pages: readonly AuthorEntityPage[]
  page?: AuthorEntityPage
  onPageChange: (pageId: string) => void
  properties: ReactNode
  behavior: ReactNode
  references: ReactNode
  referenceCount: number
}) {
  const id = useId()
  const pageSelectId = `${id}-scene-entity-page`
  const [activeId, setActiveId] = useState('properties')
  const actorName =
    isActorEntity(props.entity) && props.actorsById[props.entity.actor]
      ? lookupText(props.actorsById[props.entity.actor]!.name, props.locale)
      : undefined
  const items = [
    { id: 'properties', label: '属性', panel: props.properties },
    { id: 'behavior', label: '行为', panel: props.behavior },
    {
      id: 'references',
      label: '引用',
      count: props.referenceCount,
      panel: props.references,
    },
  ]

  return (
    <DsInspectorHost className="scene-entity-inspector">
      <div className="insp-head">
        <div className="what">选中实体</div>
        <div className="who">
          {actorName ?? props.entity.id}
          {actorName ? <code> {props.entity.id}</code> : null}
        </div>
      </div>
      {props.pages.length > 1 && props.page ? (
        <DsPropertyGrid className="scene-entity-page-context">
          <DsPropertyRow label="实体页" labelFor={pageSelectId}>
            <DsSelect
              id={pageSelectId}
              size="compact"
              value={props.page.id}
              options={props.pages.map((page) => ({
                value: page.id,
                label: page.label,
                description: page.id,
              }))}
              onValueChange={props.onPageChange}
            />
          </DsPropertyRow>
        </DsPropertyGrid>
      ) : null}
      <DsInspectorTabs
        id={`${id}-scene-entity`}
        label="实体属性分区"
        items={items}
        activeId={activeId}
        onChange={setActiveId}
      />
    </DsInspectorHost>
  )
}

function EntityInspector(props: {
  panel: 'properties' | 'behavior'
  pageIndex: number
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
  /** 当前脚本作者真值中的实体页；触发方式/范围只能写这里，不能写 renderer 投影。 */
  canonicalPage?: AuthorEntityPage
  /** Script history owns canonical trigger activation fields. */
  triggerSyncToken: number
  onTriggerActivationChange?: (pageId: string, activation: TriggerActivation | undefined) => void
  onOpenSpriteAction?: (spriteId: string, actionId: string) => void
  onOpenActor?: (actorId: string) => void
  onOpenBattleField?: (fieldId: number) => void
}) {
  const {
    panel,
    pageIndex,
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
    canonicalPage,
    triggerSyncToken,
    onTriggerActivationChange,
    onOpenSpriteAction,
    onOpenActor,
    onOpenBattleField,
  } = props
  const [spriteViewerOpen, setSpriteViewerOpen] = useState(false)
  const syncToken = session.getHistoryVersion()
  const entityFieldPrefix = useId()
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
  const canonicalTriggerBound = Boolean(canonicalPage?.trigger)
  const hostile = entity.hostile as RuntimeHostileBehavior | undefined
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
  const facing = 'zone' in entity ? 'down' : (entity.facing ?? 'down')
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
      {panel === 'behavior' ? (
        <div className="section">
          <h4>
            触发与动画 <span className="hint2">动作资源在精灵库定义</span>
          </h4>
          <DsPropertyGrid>
            {canonicalPage && onTriggerActivationChange ? (
              <>
                <DsPropertyRow
                  label="触发方式"
                  help={
                    canonicalTriggerBound
                      ? undefined
                      : '当前页尚未绑定触发行为；请先在“行为”页选择触发行为槽。'
                  }
                >
                  <DsSelect
                    size="compact"
                    aria-label="实体页触发方式"
                    value={
                      canonicalTriggerBound
                        ? (canonicalPage.triggerActivation?.on ?? 'disabled')
                        : 'disabled'
                    }
                    disabled={!canonicalTriggerBound}
                    options={[
                      { value: 'disabled', label: '不触发' },
                      { value: 'interact', label: '交互（按键）' },
                      { value: 'touch', label: '触碰（自动）' },
                    ]}
                    onValueChange={(value) => {
                      if (value === 'disabled') {
                        onTriggerActivationChange(canonicalPage.id, undefined)
                        return
                      }
                      const on = value as TriggerActivation['on']
                      onTriggerActivationChange(canonicalPage.id, {
                        on,
                        range: Math.max(
                          canonicalPage.triggerActivation?.range ?? DEFAULT_ZONE_RANGE[on],
                          DEFAULT_ZONE_RANGE[on],
                        ),
                      })
                    }}
                  />
                </DsPropertyRow>
                {canonicalTriggerBound && canonicalPage.triggerActivation ? (
                  <DsPropertyRow label="触发半径">
                    <DsDraftNumberInput
                      size="compact"
                      aria-label="实体页触发范围（格）"
                      draftKey={`scene:${sceneId}:entity:${entity.id}:page:${canonicalPage.id}:trigger-range`}
                      syncToken={triggerSyncToken}
                      min={0}
                      step={1}
                      integer
                      normalize={Math.round}
                      value={effectiveTriggerRange(canonicalPage.triggerActivation)}
                      onCommit={(value) => {
                        const range = Math.max(0, value ?? 0)
                        if (range === effectiveTriggerRange(canonicalPage.triggerActivation!))
                          return
                        onTriggerActivationChange(canonicalPage.id, {
                          ...canonicalPage.triggerActivation!,
                          range,
                        })
                      }}
                    />
                  </DsPropertyRow>
                ) : null}
              </>
            ) : null}
            <EntityPageAnimationFields
              page={entity.pages?.[pageIndex]}
              sprite={spriteDef}
              onChange={setPageAnimation}
              onOpenAction={onOpenSpriteAction}
              draftScope={`scene:${sceneId}:entity:${entity.id}:page:${canonicalPage?.id ?? pageIndex}:animation`}
              syncToken={session.getHistoryVersion()}
            />
          </DsPropertyGrid>
        </div>
      ) : null}
      {panel === 'properties' ? (
        <>
          <div className="section">
            <h4>外观 / 交互</h4>
            <DsPropertyGrid>
              {spriteDef && (
                <DsPropertyRow label="预览" className="entity-preview-field">
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
                    <DsPressable
                      type="button"
                      className="entity-preview-zoom"
                      aria-label={`放大查看 ${spriteDef.label || spriteDef.id}`}
                      title="放大查看"
                      onClick={() => setSpriteViewerOpen(true)}
                    >
                      <span className="preview-zoom-icon" aria-hidden="true" />
                    </DsPressable>
                  </div>
                </DsPropertyRow>
              )}
              {/* actor 引用只读解算外观；普通 sprite 实体可换精灵；朝向属于场景实例。 */}
              {isActorEntity(entity) ? (
                <DsPropertyRow
                  label="预制人物"
                  className="actor-entity-source"
                  help="共享人物身份与资源；位置、朝向、碰撞、显隐、页面脚本和敌对配置只属于当前场景实例。"
                >
                  <DsReadonlyValue as="div" className="pick actor-entity-source-row">
                    <span>{actorName ?? entity.actor}</span>
                    <span className="meta">→ {spriteId ?? '(未解析)'}</span>
                    <DsIconButton
                      label={`打开人物 ${entity.actor}`}
                      title="在人物库打开"
                      icon="open"
                      onClick={() => onOpenActor?.(entity.actor)}
                      size="compact"
                      variant="secondary"
                    />
                  </DsReadonlyValue>
                  <DsButton
                    onClick={() =>
                      session.dispatch(new DetachActorEntityCommand(sceneId, entity.id))
                    }
                    size="compact"
                    variant="secondary"
                  >
                    解除人物关联，保留当前精灵
                  </DsButton>
                </DsPropertyRow>
              ) : 'sprite' in entity ? (
                <DsPropertyRow label="精灵" labelFor={`${entityFieldPrefix}-sprite`}>
                  <DsSelect
                    id={`${entityFieldPrefix}-sprite`}
                    searchable="auto"
                    value={entity.sprite}
                    options={[
                      ...(!sprites.some((sprite) => sprite.id === entity.sprite)
                        ? [{ value: entity.sprite, label: `${entity.sprite}（缺失）` }]
                        : []),
                      ...sprites.map((sprite) => ({
                        value: sprite.id,
                        label: sprite.label || sprite.id,
                        description: `${sprite.id} · ${sprite.asset}`,
                      })),
                    ]}
                    onValueChange={(value) =>
                      session.dispatch(new SetEntitySpriteCommand(sceneId, entity.id, value))
                    }
                  />
                </DsPropertyRow>
              ) : (
                <DsPropertyRow label="触发区">
                  <DsReadonlyValue as="div" className="pick">
                    <span>无外观</span>
                    <span className="meta">触发器 / 脚本锚</span>
                  </DsReadonlyValue>
                </DsPropertyRow>
              )}
              {'zone' in entity ? null : (
                <DsPropertyRow label="朝向" labelFor={`${entityFieldPrefix}-facing`}>
                  <DsControlGroup
                    control={
                      <DsSelect
                        id={`${entityFieldPrefix}-facing`}
                        value={facing}
                        options={ENTITY_FACING_OPTIONS}
                        onValueChange={(value) =>
                          session.dispatch(
                            new UpdateEntityCommand(sceneId, entity.id, {
                              facing: value as Facing,
                            }),
                          )
                        }
                      />
                    }
                    actions={<EntityFacingHelpTip />}
                  />
                </DsPropertyRow>
              )}
              <DsPropertyRow label="碰撞">
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
              </DsPropertyRow>
              <DsPropertyRow label="初始显隐">
                <DsCheckbox
                  title="隐藏 = 游戏里初始不出现（剧情脚本 setEntityState 可显形）；编辑器「隐藏实体（透视）」图层仍半透明可见"
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
              </DsPropertyRow>
            </DsPropertyGrid>
          </div>
          <div className="section">
            <h4>
              位置<span className="b2"> · 菱形轴</span>
            </h4>
            <DsPropertyGrid>
              <DsPropertyRow label="坐标">
                <div className="posrow">
                  <label className="cell" htmlFor={`${entityFieldPrefix}-pos-col`}>
                    <span>col</span>
                    <DsDraftNumberInput
                      id={`${entityFieldPrefix}-pos-col`}
                      draftKey={`scene:${sceneId}:entity:${entity.id}:pos:col`}
                      syncToken={syncToken}
                      value={entity.pos.col}
                      onCommit={(col) => {
                        if (col !== undefined && col !== entity.pos.col) setPos({ col })
                      }}
                    />
                  </label>
                  <label className="cell" htmlFor={`${entityFieldPrefix}-pos-row`}>
                    <span>row</span>
                    <DsDraftNumberInput
                      id={`${entityFieldPrefix}-pos-row`}
                      draftKey={`scene:${sceneId}:entity:${entity.id}:pos:row`}
                      syncToken={syncToken}
                      value={entity.pos.row}
                      onCommit={(row) => {
                        if (row !== undefined && row !== entity.pos.row) setPos({ row })
                      }}
                    />
                  </label>
                  <label className="cell" htmlFor={`${entityFieldPrefix}-pos-height`}>
                    <span>height</span>
                    <DsDraftNumberInput
                      id={`${entityFieldPrefix}-pos-height`}
                      draftKey={`scene:${sceneId}:entity:${entity.id}:pos:height`}
                      syncToken={syncToken}
                      value={entity.pos.height}
                      onCommit={(height) => {
                        if (height !== undefined && height !== entity.pos.height) setPos({ height })
                      }}
                    />
                  </label>
                </div>
              </DsPropertyRow>
            </DsPropertyGrid>
          </div>
        </>
      ) : null}
      {panel === 'behavior' ? (
        <>
          <div className="section">
            <h4>
              敌对行为<span className="b2"> · B9 数据驱动</span>
            </h4>
            <DsPropertyGrid>
              <DsPropertyRow label="敌对">
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
              </DsPropertyRow>
              {entity.hostile && (
                <>
                  <DsPropertyRow label="敌队" labelFor={`${entityFieldPrefix}-enemy-team`}>
                    <DsSelect
                      id={`${entityFieldPrefix}-enemy-team`}
                      searchable="auto"
                      value={entity.hostile.enemyTeamId}
                      options={[
                        ...(!enemyTeams.some((team) => team.id === entity.hostile!.enemyTeamId)
                          ? [
                              {
                                value: entity.hostile.enemyTeamId,
                                label: `${entity.hostile.enemyTeamId}（缺数据）`,
                              },
                            ]
                          : []),
                        ...enemyTeams.map((team) => ({
                          value: team.id,
                          label: team.id,
                          description: `${team.slots.length} 槽`,
                        })),
                      ]}
                      onValueChange={(value) => setHostile({ enemyTeamId: value })}
                    />
                  </DsPropertyRow>
                  <DsPropertyRow label="战场" labelFor={`${entityFieldPrefix}-battle-field`}>
                    <BattleFieldPicker
                      id={`${entityFieldPrefix}-battle-field`}
                      value={entity.hostile.battleFieldId}
                      fields={battleFields}
                      unsetLabel="跟随场景默认战场"
                      ariaLabel="敌对实体战场"
                      onOpen={onOpenBattleField}
                      onChange={(battleFieldId) => setHostile({ battleFieldId })}
                    />
                  </DsPropertyRow>
                  <DsPropertyRow label="追逐">
                    <DsCheckbox
                      label="见人就追（不勾为原地怪）"
                      checked={!!entity.hostile.chase}
                      onChange={(event) =>
                        setHostile({
                          chase: event.currentTarget.checked ? { range: 6, speed: 2 } : undefined,
                        })
                      }
                    />
                  </DsPropertyRow>
                  {entity.hostile.chase && (
                    <>
                      <DsPropertyRow label="追逐参数">
                        <div className="posrow hostile-chase-metrics">
                          <label className="cell" htmlFor={`${entityFieldPrefix}-chase-range`}>
                            <span>range 格</span>
                            <DsDraftNumberInput
                              id={`${entityFieldPrefix}-chase-range`}
                              draftKey={`scene:${sceneId}:entity:${entity.id}:hostile:chase:range`}
                              syncToken={syncToken}
                              value={entity.hostile.chase.range}
                              onCommit={(range) => {
                                if (range !== undefined && range !== entity.hostile!.chase!.range)
                                  setHostile({
                                    chase: { ...entity.hostile!.chase!, range },
                                  })
                              }}
                            />
                          </label>
                          <label className="cell" htmlFor={`${entityFieldPrefix}-chase-speed`}>
                            <span>speed</span>
                            <DsDraftNumberInput
                              id={`${entityFieldPrefix}-chase-speed`}
                              draftKey={`scene:${sceneId}:entity:${entity.id}:hostile:chase:speed`}
                              syncToken={syncToken}
                              value={entity.hostile.chase.speed}
                              onCommit={(speed) => {
                                if (speed !== undefined && speed !== entity.hostile!.chase!.speed)
                                  setHostile({
                                    chase: { ...entity.hostile!.chase!, speed },
                                  })
                              }}
                            />
                          </label>
                        </div>
                      </DsPropertyRow>
                      <DsPropertyRow label="寻路">
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
                      </DsPropertyRow>
                    </>
                  )}
                  <>
                    <DsPropertyRow label="胜利后" labelFor={`${entityFieldPrefix}-victory`}>
                      <DsSelect
                        id={`${entityFieldPrefix}-victory`}
                        value={hostile?.onVictory.kind ?? 'remove'}
                        options={[
                          { value: 'remove', label: '隐藏后从场景移除' },
                          { value: 'hide', label: '隐藏后离屏重现' },
                          { value: 'remain', label: '保持原样' },
                        ]}
                        onValueChange={(value) => {
                          const kind = value as RuntimeHostileBehavior['onVictory']['kind']
                          if (kind === 'hide')
                            setHostile({
                              onVictory: {
                                kind,
                                ticks:
                                  hostile?.onVictory.kind === 'hide'
                                    ? hostile.onVictory.ticks
                                    : 800,
                              },
                            })
                          else setHostile({ onVictory: { kind } })
                        }}
                      />
                    </DsPropertyRow>
                    {hostile?.onVictory.kind === 'hide' ? (
                      <DsPropertyRow
                        label="胜利隐藏 ticks"
                        labelFor={`${entityFieldPrefix}-victory-ticks`}
                      >
                        <DsDraftNumberInput
                          id={`${entityFieldPrefix}-victory-ticks`}
                          draftKey={`scene:${sceneId}:entity:${entity.id}:hostile:on-victory:ticks`}
                          syncToken={syncToken}
                          min={1}
                          step={1}
                          integer
                          value={hostile.onVictory.ticks}
                          onCommit={(ticks) => {
                            if (
                              ticks !== undefined &&
                              Number.isSafeInteger(ticks) &&
                              ticks > 0 &&
                              ticks !==
                                (hostile?.onVictory.kind === 'hide'
                                  ? hostile.onVictory.ticks
                                  : undefined)
                            )
                              setHostile({ onVictory: { kind: 'hide', ticks } })
                          }}
                        />
                      </DsPropertyRow>
                    ) : null}
                    <DsPropertyRow label="逃跑后" labelFor={`${entityFieldPrefix}-flee`}>
                      <DsSelect
                        id={`${entityFieldPrefix}-flee`}
                        value={hostile?.onPlayerFlee.kind ?? 'remain'}
                        options={[
                          { value: 'remain', label: '保持原样' },
                          { value: 'suspend', label: '短暂暂停自动行为' },
                        ]}
                        onValueChange={(value) => {
                          const kind = value as RuntimeHostileBehavior['onPlayerFlee']['kind']
                          if (kind === 'suspend')
                            setHostile({
                              onPlayerFlee: {
                                kind,
                                ticks:
                                  hostile?.onPlayerFlee.kind === 'suspend'
                                    ? hostile.onPlayerFlee.ticks
                                    : 15,
                              },
                            })
                          else setHostile({ onPlayerFlee: { kind } })
                        }}
                      />
                    </DsPropertyRow>
                    {hostile?.onPlayerFlee.kind === 'suspend' ? (
                      <DsPropertyRow
                        label="逃跑暂停 ticks"
                        labelFor={`${entityFieldPrefix}-flee-ticks`}
                      >
                        <DsDraftNumberInput
                          id={`${entityFieldPrefix}-flee-ticks`}
                          draftKey={`scene:${sceneId}:entity:${entity.id}:hostile:on-player-flee:ticks`}
                          syncToken={syncToken}
                          min={1}
                          step={1}
                          integer
                          value={hostile.onPlayerFlee.ticks}
                          onCommit={(ticks) => {
                            if (
                              ticks !== undefined &&
                              Number.isSafeInteger(ticks) &&
                              ticks > 0 &&
                              ticks !==
                                (hostile?.onPlayerFlee.kind === 'suspend'
                                  ? hostile.onPlayerFlee.ticks
                                  : undefined)
                            )
                              setHostile({ onPlayerFlee: { kind: 'suspend', ticks } })
                          }}
                        />
                      </DsPropertyRow>
                    ) : null}
                  </>
                </>
              )}
            </DsPropertyGrid>
          </div>
        </>
      ) : null}
      {panel === 'properties' && spriteViewerOpen && spriteDef && (
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
  const inspectorId = useId()
  const syncToken = session.getHistoryVersion()
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
        <DsPropertyGrid>
          <DsPropertyRow label="坐标">
            <div className="row entry-coordinate-row">
              <label className="entry-n" htmlFor={`${inspectorId}-col`}>
                <span>col</span>
                <DsDraftNumberInput
                  id={`${inspectorId}-col`}
                  draftKey={`scene:${scene.id}:default-entry:col`}
                  syncToken={syncToken}
                  value={scene.entry.pos.col}
                  onCommit={(col) => {
                    if (col !== undefined && col !== scene.entry.pos.col) patch({ col })
                  }}
                />
              </label>
              <label className="entry-n" htmlFor={`${inspectorId}-row`}>
                <span>row</span>
                <DsDraftNumberInput
                  id={`${inspectorId}-row`}
                  draftKey={`scene:${scene.id}:default-entry:row`}
                  syncToken={syncToken}
                  value={scene.entry.pos.row}
                  onCommit={(row) => {
                    if (row !== undefined && row !== scene.entry.pos.row) patch({ row })
                  }}
                />
              </label>
              <label className="entry-n" htmlFor={`${inspectorId}-height`}>
                <span>height</span>
                <DsDraftNumberInput
                  id={`${inspectorId}-height`}
                  draftKey={`scene:${scene.id}:default-entry:height`}
                  syncToken={syncToken}
                  value={scene.entry.pos.height ?? 0}
                  onCommit={(height) => {
                    if (height !== undefined && height !== (scene.entry.pos.height ?? 0))
                      patch({ height })
                  }}
                />
              </label>
            </div>
          </DsPropertyRow>
          <DsPropertyRow label="朝向" labelFor={`${inspectorId}-facing`}>
            <DsSelect
              id={`${inspectorId}-facing`}
              value={scene.entry.facing}
              options={facings.map((facing) => ({ value: facing, label: facing }))}
              onValueChange={(value) => patch({ facing: value as SceneDef['entry']['facing'] })}
            />
          </DsPropertyRow>
        </DsPropertyGrid>
        <div className="insp-empty ds-empty-state--offset">
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
  const battleFieldSelectId = `scene-battle-field-${scene.id}`

  const createAndBind = (): void => {
    const { id, path } = nextMapAssetIdentity({ version: 1, maps }, scene.id)
    const tileset = projectMaps[scene.mapId]?.tilesetRefs[0] ?? tilesets[0]?.id ?? 'starter'
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
        <DsPropertyGrid>
          <DsPropertyRow label="地图" labelFor={mapSelectId}>
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
          </DsPropertyRow>
          <DsPropertyRow label="音乐" labelFor={musicSelectId}>
            <MusicPicker
              id={musicSelectId}
              value={scene.music}
              onChange={(music) => session.dispatch(new UpdateSceneCommand(scene.id, { music }))}
              catalog={assetCatalog}
              resolver={audioResolver}
              allowUnset
              allowStop
            />
          </DsPropertyRow>
          <DsPropertyRow label="默认战场" labelFor={battleFieldSelectId}>
            <BattleFieldPicker
              id={battleFieldSelectId}
              value={scene.battleFieldId}
              fields={battleFields}
              unsetLabel="项目默认战场 #024"
              ariaLabel="场景默认战场"
              onOpen={onOpenBattleField}
              onChange={(battleFieldId) =>
                session.dispatch(new UpdateSceneCommand(scene.id, { battleFieldId }))
              }
            />
          </DsPropertyRow>
        </DsPropertyGrid>
      </div>
      <div className="insp-empty">点左侧落点或实体查看属性；从“实体”分组新增后，点画布放置。</div>
    </>
  )
}

function NamedEntryInspector(props: {
  scene: SceneDef
  entryId: string
  entry: SceneEntryPoint
  references: ProjectReferenceEdge[]
  session: EditSession
  onOpenReference: (reference: ProjectReferenceEdge) => void
}) {
  const { scene, entryId, entry, references, session, onOpenReference } = props
  const syncToken = session.getHistoryVersion()
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
        <DsPropertyGrid>
          <DsPropertyRow label="名称" labelFor={`entry-label-${scene.id}-${entryId}`}>
            <DsDraftTextInput
              id={`entry-label-${scene.id}-${entryId}`}
              draftKey={`scene:${scene.id}:named-entry:${entryId}:label`}
              syncToken={syncToken}
              value={entry.label ?? ''}
              placeholder="未命名落点"
              onCommit={(value) => {
                const label = value.trim()
                if (label !== (entry.label ?? '')) patch({ label: label || undefined })
              }}
            />
          </DsPropertyRow>
          <DsPropertyRow label="稳定 ID">
            <code className="entry-stable-id" translate="no">
              {entryId}
            </code>
          </DsPropertyRow>
          <DsPropertyRow label="坐标">
            <div className="entry-coordinate-grid">
              {(['col', 'row', 'height'] as const).map((axis) => (
                <label key={axis} htmlFor={`entry-${axis}-${scene.id}-${entryId}`}>
                  <span>{axis === 'height' ? 'h' : axis}</span>
                  <DsDraftNumberInput
                    id={`entry-${axis}-${scene.id}-${entryId}`}
                    draftKey={`scene:${scene.id}:named-entry:${entryId}:pos:${axis}`}
                    syncToken={syncToken}
                    value={entry.pos[axis] ?? 0}
                    onCommit={(value) => {
                      if (value === undefined || value === (entry.pos[axis] ?? 0)) return
                      patch({ pos: { ...entry.pos, [axis]: value } })
                    }}
                  />
                </label>
              ))}
            </div>
          </DsPropertyRow>
          <DsPropertyRow label="朝向" labelFor={`entry-facing-${scene.id}-${entryId}`}>
            <DsSelect
              id={`entry-facing-${scene.id}-${entryId}`}
              value={entry.facing ?? ''}
              options={[
                { value: '', label: '继承进入前朝向' },
                ...facings.map((facing) => ({ value: facing, label: facing })),
              ]}
              onValueChange={(value) => {
                const facing = value as SceneDef['entry']['facing'] | ''
                patch({ facing: facing || undefined })
              }}
            />
          </DsPropertyRow>
        </DsPropertyGrid>
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
                const unavailableReason =
                  reference.locator.kind === 'unavailable' ? reference.locator.reason : undefined
                const canOpen = unavailableReason === undefined
                return (
                  <DsReferenceRow
                    key={reference.id}
                    title={reference.source.label}
                    detail={reference.where || '/'}
                    labels={[{ label: '脚本引用' }]}
                    action={
                      canOpen
                        ? {
                            label: '打开',
                            onActivate: () => onOpenReference(reference),
                          }
                        : undefined
                    }
                    status={
                      canOpen
                        ? undefined
                        : {
                            label: '只读',
                            reason: unavailableReason,
                          }
                    }
                  />
                )
              })}
            </DsReferenceList>
          ) : null}
        </DsReferencePanel>
      </div>
    </>
  )
}
