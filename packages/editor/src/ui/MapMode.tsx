/** 地图模式：ProjectMap 的 N 视觉层、实例高度与独立碰撞层编辑器。 */
import type { AssetCatalogV1, MapIndexV1, SceneDef, StampTemplate } from '@type-pal/content'
import { mapInstanceHeight, mapInstanceTilesetId, nextMapAssetIdentity } from '@type-pal/content'
import type {
  AssetBase,
  LatticePos,
  ProjectMap,
  ProjectMapCollisionEdit,
  ProjectMapTileEdit,
} from '@type-pal/reforge'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  isLatticeInside,
  latticeCenter,
  latticeInMapRect,
  nextProjectMapLayerId,
  paintProjectMapCollision,
  paintProjectMapTiles,
  pixelToLattice,
  projectMapStampPlacements,
} from '@type-pal/reforge'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  AddProjectMapLayerCommand,
  ApplyProjectMapPatchCommand,
  CreateMapAssetCommand,
  DeleteMapAssetCommand,
  DuplicateMapAssetCommand,
  MoveProjectMapLayerCommand,
  mapAssetSceneReferences,
  RemoveProjectMapLayerCommand,
  RenameMapAssetCommand,
  ResizeProjectMapCommand,
  UpdateProjectMapLayerCommand,
} from '../core/commands.js'
import type { EditorState, EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { type IsometricBrushSize, isometricBrushPoints } from '../core/isometric-brush.js'
import { floodFillIsometricTiles } from '../core/isometric-fill.js'
import type { ProjectMapPatch } from '../core/map-patch.js'
import { ProjectMapPatchError } from '../core/map-patch.js'
import {
  changeMapSelection,
  changeStampPlacementSelection,
  createMapWorkspaceState,
  gridPointKey,
  hitTestMapContent,
  isMapSelectionDrag,
  type MapCellSelectionInput,
  type MapHitCandidate,
  type MapSelection,
  mapSelectionBounds,
  mapWorkspaceDocument,
  mapWorkspaceReducer,
  type SelectionChangeMode,
  selectAllMapContent,
  selectionForGridPoints,
  selectionForStampPlacementGridPoints,
  selectionModeFromModifiers,
  stampPlacementAllMemberSelection,
  visualSlotKey,
} from '../core/map-selection.js'
import {
  captureMapClipboard,
  type IsometricNudgeDirection,
  type MapCellClipboard,
  type MapLayerMapping,
  type MapTransformConflictPolicy,
  type MapTransformPlan,
  nudgeIsometricLattice,
  planMapDelete,
  planMapMove,
  planMapPaste,
} from '../core/map-transform.js'
import {
  EditStampPlacementCommand,
  TransformStampPlacementsCommand,
  UngroupStampPlacementsCommand,
} from '../core/stamp-group-command.js'
import {
  captureStampGroupClipboard,
  planStampGroupDelete,
  planStampGroupMove,
  planStampGroupPaste,
  type StampGroupClipboard,
  type StampGroupTransformPlan,
} from '../core/stamp-group-transform.js'
import {
  inspectStampStructureImpact,
  type StampStructureOperation,
  type StampStructureResolutionOptions,
} from '../core/stamp-lifecycle.js'
import { buildStampPlacementIndex, floodFillStampPlacementTiles } from '../core/stamp-ownership.js'
import { planStampPlacement, type StampLayerMapping } from '../core/stamp-placement.js'
import { PlaceStampCommand } from '../core/stamp-placement-command.js'
import {
  DsButton,
  DsCatalogControls,
  DsCatalogRow,
  DsCheckbox,
  DsInspectorSection,
  DsInspectorTabs,
  DsPropertyGrid,
  DsPropertyRow,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
} from './design-system/index.js'
import { IsometricEditorCanvas } from './IsometricEditorCanvas.js'
import { IsometricEditorSurface } from './IsometricEditorSurface.js'
import { IsometricEditorToolbar } from './IsometricEditorToolbar.js'
import { IsometricViewportStatus } from './IsometricViewportStatus.js'
import { drawIsometricMapBase, type IsometricMapBaseCache } from './isometric-map-render.js'
import { LayerPaintContext, LayerStackControls } from './LayerStackControls.js'
import { MapSelectionInspector } from './MapSelectionInspector.js'
import { MapStampPalette } from './MapStampPalette.js'
import { drawMapSelectionOverlay } from './map-selection-overlay.js'
import { StampPlacementSelectionInspector } from './StampPlacementSelectionInspector.js'
import { StampTemplateDialog } from './StampTemplateDialog.js'
import {
  mapBoxOf,
  type StageAssets,
  useSceneAssets,
  useStageSize,
  useViewZoomPan,
} from './scene-stage.js'
import { drawStampPlacementOverlay } from './stamp-placement-overlay.js'
import { drawStampPlacementSelectionOverlay } from './stamp-placement-selection-overlay.js'
import { CurrentPaintTileButton, TilePalettePicker } from './TilePickerGrid.js'

const DEFAULT_COLS = 24
const DEFAULT_ROWS = 24
/** 当前地图层承接组合底层，其余局部层按组合顺序向上落到相邻地图层。 */
function stampMappingsFromActiveLayer(
  template: StampTemplate | undefined,
  map: ProjectMap | undefined,
  activeLayerId: string,
): StampLayerMapping[] {
  if (!template || !map) return []
  const start = map.layers.findIndex((layer) => layer.id === activeLayerId)
  if (start < 0) return []
  return template.layers.flatMap((layer, offset) => {
    const target = map.layers[start + offset]
    return target ? [{ layerSlotId: layer.id, targetLayerId: target.id }] : []
  })
}

type MapTool =
  | 'pan'
  | 'select'
  | 'stamp'
  | 'eyedropper'
  | 'brush'
  | 'rect'
  | 'fill'
  | 'erase'
  | 'collision'
type CollisionPaint = 'set' | 'clear'
type StrokeEdit =
  | { kind: 'tile'; edit: ProjectMapTileEdit }
  | { kind: 'collision'; edit: ProjectMapCollisionEdit }

type MapTransformIntent =
  | {
      kind: 'paste'
      clipboard: MapCellClipboard | StampGroupClipboard
      anchor: LatticePos
      layerMappings: readonly MapLayerMapping[]
    }
  | {
      kind: 'move'
      selection: MapSelection
      anchor: LatticePos
      includeCollision: boolean
      layerMappings: readonly MapLayerMapping[]
      stampClipboard?: StampGroupClipboard
      stampBaseMap?: ProjectMap
    }

type MapCandidate =
  | { kind: 'cell'; candidate: MapHitCandidate }
  | {
      kind: 'stamp-placement'
      placementId: string
      ref: { row: number; col: number }
      layerId?: string
      layerName: string
      sourceName: string
      locked: boolean
    }

interface MapCandidateMenu {
  candidates: MapCandidate[]
}

interface MapCanvasContextMenu {
  x: number
  y: number
}

type MapInspectorTab = 'properties' | 'draw' | 'references'

interface StampStructureIntent {
  operation: StampStructureOperation
  mapRevision: number
  map: ProjectMap
  placementIds: string[]
}

function isStampGroupTransform(intent: MapTransformIntent): boolean {
  return intent.kind === 'paste'
    ? intent.clipboard.kind === 'stamp-placements'
    : intent.selection.kind === 'stamp-placements'
}

function tileEditsPatch(_map: ProjectMap, edits: readonly ProjectMapTileEdit[]): ProjectMapPatch {
  return {
    visual: edits.flatMap((edit) => [
      { channel: 'tileId' as const, ref: edit, value: edit.tileId },
      { channel: 'tilesetId' as const, ref: edit, value: edit.tilesetId },
      { channel: 'height' as const, ref: edit, value: edit.height },
    ]),
    collision: [],
  }
}

export function MapMode(props: {
  scene: SceneDef
  scenes: SceneDef[]
  session: EditSession
  assetBase: AssetBase
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  projectMaps: EditorState['maps']
  mapIndex: MapIndexV1
  selectedMapId?: string
  onSelectMap: (id: string | undefined) => void
  onOpenScene: (id: string) => void
  /** tileset 注册表（供地图逐格来源索引解析与瓦片面板切换）。 */
  tilesets: readonly import('@type-pal/reforge').TilesetDef[]
  stamps: readonly StampTemplate[]
  onOpenStampLibrary?: (id?: string) => void
  navigation?: React.ReactNode
  onRequestInspectorOpen?: () => void
  onWorkspaceNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
  const {
    scene,
    scenes,
    session,
    assetBase,
    assetCatalog,
    assetReader,
    projectMaps,
    mapIndex,
    selectedMapId,
    onSelectMap,
    onOpenScene,
    tilesets,
    stamps,
    onOpenStampLibrary,
    navigation,
    onRequestInspectorOpen,
    onWorkspaceNotice,
  } = props
  const mapId =
    (selectedMapId && mapIndex.maps.some((asset) => asset.id === selectedMapId)
      ? selectedMapId
      : scene.mapId) ?? ''
  const subscribeSession = useMemo(() => (fn: () => void) => session.subscribe(fn), [session])
  const getSessionVersion = useMemo(() => () => session.getVersion(), [session])
  useSyncExternalStore(subscribeSession, getSessionVersion)
  const selectedAsset = mapIndex.maps.find((asset) => asset.id === mapId)
  const currentProjectMaps = session.getState().maps
  const liveMap: ProjectMap | undefined = currentProjectMaps[mapId] ?? projectMaps[mapId]
  const mapRevision = session.getMapRevision(mapId)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inspectorRef = useRef<HTMLDivElement>(null)
  const size = useStageSize(wrapRef, 120)
  const { view, viewRef, setView } = useViewZoomPan({
    canvasRef,
    initial: { zoom: 1, panX: 0, panY: 0 },
  })
  const [showGrid, setShowGrid] = useState(true)
  const [showCollision, setShowCollision] = useState(true)
  const [tool, setTool] = useState<MapTool>('pan')
  const [inspectorTab, setInspectorTab] = useState<MapInspectorTab>('properties')
  const [drawPanelVisited, setDrawPanelVisited] = useState(false)
  const [activeStampId, setActiveStampId] = useState<string>()
  const [stampHoverAnchor, setStampHoverAnchor] = useState<LatticePos>()
  const [recentStampIds, setRecentStampIds] = useState<string[]>([])
  const [collisionPaint, setCollisionPaint] = useState<CollisionPaint>('set')
  const [selectedTile, setSelectedTile] = useState(0)
  const [selectedTilesetId, setSelectedTilesetId] = useState(
    () => liveMap?.tilesetRefs[0] ?? tilesets[0]?.id ?? '',
  )
  const [paintHeight, setPaintHeight] = useState(0)
  const [viewHeight, setViewHeight] = useState(0)
  const [brushSize, setBrushSize] = useState<IsometricBrushSize>(1)
  const [focusEnabled, setFocusEnabled] = useState(true)
  const [activeLayerId, setActiveLayerId] = useState('floor')
  const [mapQuery, setMapQuery] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string>()
  const [workspace, dispatchWorkspace] = useReducer(
    mapWorkspaceReducer,
    undefined,
    createMapWorkspaceState,
  )
  const workspaceMap = mapWorkspaceDocument(workspace, mapId)
  const hiddenLayerIds = useMemo(
    () => new Set(workspaceMap.hiddenLayerIds),
    [workspaceMap.hiddenLayerIds],
  )
  const lockedLayerIds = useMemo(
    () => new Set(workspaceMap.lockedLayerIds),
    [workspaceMap.lockedLayerIds],
  )
  const selection = workspaceMap.selection
  const stampPlacementIndex = useMemo(
    () => (liveMap ? buildStampPlacementIndex(liveMap) : undefined),
    [liveMap],
  )
  const ownedVisualSlotKeys = stampPlacementIndex?.visualOwnerByKey
  const ownedGridPointKeys = stampPlacementIndex?.collisionOwnerByKey
  const stampGroupEditPlacementId = workspaceMap.stampGroupEditContext?.placementId
  const stampGroupEditSelection = workspaceMap.stampGroupEditContext?.selection
  const activeStamp = stamps.find((stamp) => stamp.id === activeStampId)
  const stampMappings = useMemo(
    () => stampMappingsFromActiveLayer(activeStamp, liveMap, activeLayerId),
    [activeLayerId, activeStamp, liveMap],
  )
  const [selectionPreview, setSelectionPreview] = useState<MapSelection>()
  const selectionPreviewRef = useRef<MapSelection | undefined>(undefined)
  const [includeCollision, setIncludeCollision] = useState(false)
  const [clipboard, setClipboard] = useState<MapCellClipboard | StampGroupClipboard>()
  const [transformIntent, setTransformIntent] = useState<MapTransformIntent>()
  const [transformTargetLocked, setTransformTargetLocked] = useState(false)
  const [transformOverwriteIntent, setTransformOverwriteIntent] = useState<MapTransformIntent>()
  const transformConflictAdjustRef = useRef<HTMLButtonElement>(null)
  const [candidateMenu, setCandidateMenu] = useState<MapCandidateMenu>()
  const candidateMenuRef = useRef<HTMLDivElement>(null)
  const [canvasContextMenu, setCanvasContextMenu] = useState<MapCanvasContextMenu>()
  const canvasContextMenuRef = useRef<HTMLDivElement>(null)
  const [workspaceNotice, setWorkspaceNotice] = useState<
    { kind: 'info' | 'error'; message: string } | undefined
  >()
  const [stampDialogOpen, setStampDialogOpen] = useState(false)
  const [stampStructureIntent, setStampStructureIntent] = useState<StampStructureIntent>()
  const stampStructureReturnFocusRef = useRef<HTMLElement | null>(null)
  const stampStructureCancelRef = useRef<HTMLButtonElement>(null)
  const mapNameInputRef = useRef<HTMLInputElement>(null)
  const selectedMapRowRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (selection.kind !== 'cells') setStampDialogOpen(false)
  }, [selection.kind])
  useEffect(() => {
    if (!activeStampId || activeStamp) return
    setActiveStampId(undefined)
    setStampHoverAnchor(undefined)
    setTool((current) => (current === 'stamp' ? 'select' : current))
  }, [activeStamp, activeStampId])
  const strokeRef = useRef<Map<string, StrokeEdit>>(new Map())
  const hoverRef = useRef<LatticePos | null>(null)
  const coordinateHoverRef = useRef<LatticePos | null>(null)
  const [hoverPoint, setHoverPoint] = useState<LatticePos | null>(null)
  const panRef = useRef<{ sx: number; sy: number; panX: number; panY: number } | null>(null)
  const paintingRef = useRef(false)
  const rectAnchorRef = useRef<LatticePos | null>(null)
  const cancelPointerInteractionRef = useRef<() => void>(() => undefined)
  const stampSessionRef = useRef(session)
  const selectionDragRef = useRef<{
    scope: 'map' | 'stamp-group'
    pointerId: number
    startClient: { x: number; y: number }
    startWorld: { wx: number; wy: number }
    mode: SelectionChangeMode
    base: MapSelection
    placementId?: string
    dragging: boolean
  } | null>(null)
  useEffect(() => {
    if (stampSessionRef.current === session) return
    stampSessionRef.current = session
    // 同 manifest.id 的另一工程副本仍会换 EditSession；图章作者态绝不能借 mapId/stampId 串过去。
    setTool('pan')
    setInspectorTab('properties')
    setDrawPanelVisited(false)
    setActiveStampId(undefined)
    setStampHoverAnchor(undefined)
    setRecentStampIds([])
    setSelectionPreview(undefined)
    selectionPreviewRef.current = undefined
    setTransformIntent(undefined)
    setTransformTargetLocked(false)
    setTransformOverwriteIntent(undefined)
    setCandidateMenu(undefined)
    setCanvasContextMenu(undefined)
    setClipboard(undefined)
    setStampDialogOpen(false)
    setStampStructureIntent(undefined)
    stampStructureReturnFocusRef.current = null
    setPendingDeleteId(undefined)
    setWorkspaceNotice(undefined)
    strokeRef.current.clear()
    paintingRef.current = false
    rectAnchorRef.current = null
    panRef.current = null
    selectionDragRef.current = null
    hoverRef.current = null
    coordinateHoverRef.current = null
    setHoverPoint(null)
    // mapId / placementId 在不同工程副本中可能相同；选择、隐藏/锁定与组内上下文都必须按会话隔离。
    dispatchWorkspace({ type: 'reset' })
  }, [session])
  const [paintTick, setPaintTick] = useState(0)
  const [basePaintTick, setBasePaintTick] = useState(0)
  const baseCanvasCacheRef = useRef<IsometricMapBaseCache | undefined>(undefined)
  const selectionCanvasCacheRef = useRef<
    | {
        canvas: HTMLCanvasElement
        map: ProjectMap
        tilesets: StageAssets['tilesets']
        selection: MapSelection
        selectionPreview: MapSelection | undefined
        transformPlan: MapTransformPlan | undefined
        width: number
        height: number
        zoom: number
        panX: number
        panY: number
        basePaintTick: number
        hiddenKey: string
        lockedKey: string
        showCollision: boolean
        stampGroupEditPlacementId: string | undefined
        stampGroupEditSelection: MapSelection | undefined
        activeLayerId: string
      }
    | undefined
  >(undefined)
  const { status, err, loadedRef } = useSceneAssets({
    canvasRef,
    assetBase,
    mapId,
    spriteAssets: [],
    projectMaps: currentProjectMaps,
    mapIndex,
    tilesets,
    authoringTilesetIds: tilesets.map(({ id }) => id),
    assetCatalog,
    assetReader,
  })
  const loadedAssets = status === 'ready' ? loadedRef.current : null
  const selectedTiles = useMemo(
    () =>
      loadedAssets?.tilesets.get(selectedTilesetId) ??
      new Map<number, import('@type-pal/reforge').RleFrame>(),
    [loadedAssets?.tilesets, selectedTilesetId],
  )
  const activeTool: MapTool = liveMap ? tool : 'pan'
  const activeLayer = liveMap?.layers.find((layer) => layer.id === activeLayerId)
  const activePaintHeight = paintHeight
  const activeViewHeight = viewHeight
  const activeLayerHidden = activeLayer ? hiddenLayerIds.has(activeLayer.id) : false
  const activeLayerLocked = activeLayer ? lockedLayerIds.has(activeLayer.id) : false
  const activeLayerReadOnly = !activeLayer || activeLayerHidden || activeLayerLocked
  const mapHasReadOnlyLayer = hiddenLayerIds.size > 0 || lockedLayerIds.size > 0
  const selectionHasReadOnlyLayer = useMemo(
    () =>
      selection.kind === 'cells' &&
      selection.visualSlots.some(
        (ref) => hiddenLayerIds.has(ref.layerId) || lockedLayerIds.has(ref.layerId),
      ),
    [selection, hiddenLayerIds, lockedLayerIds],
  )
  const canSaveSelectionAsStamp = useMemo(() => {
    if (!liveMap || selection.kind !== 'cells') return false
    const layers = new Map(liveMap.layers.map((layer) => [layer.id, layer] as const))
    return selection.visualSlots.some(
      (ref) => layers.get(ref.layerId)?.tiles[ref.row]?.[ref.col] != null,
    )
  }, [liveMap, selection])

  useEffect(() => onWorkspaceNotice?.(workspaceNotice), [workspaceNotice, onWorkspaceNotice])

  const focusFirstCandidate = useCallback((): void => {
    const menu = candidateMenuRef.current
    const first = menu?.querySelector<HTMLButtonElement>('button[role="option"]:not(:disabled)')
    ;(first ?? menu?.querySelector<HTMLButtonElement>('button:last-of-type'))?.focus()
  }, [])

  useEffect(() => {
    if (!candidateMenu) return
    focusFirstCandidate()
  }, [candidateMenu, focusFirstCandidate])

  useEffect(() => {
    if (!canvasContextMenu) return
    const frame = requestAnimationFrame(() =>
      canvasContextMenuRef.current
        ?.querySelector<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)')
        ?.focus({ preventScroll: true }),
    )
    const close = (event: PointerEvent): void => {
      if (!canvasContextMenuRef.current?.contains(event.target as Node))
        setCanvasContextMenu(undefined)
    }
    document.addEventListener('pointerdown', close)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', close)
    }
  }, [canvasContextMenu])

  useLayoutEffect(() => {
    if (!canvasContextMenu) return
    const viewport = wrapRef.current
    const menu = canvasContextMenuRef.current
    if (!viewport || !menu) return
    const nextX = Math.max(
      8,
      Math.min(viewport.clientWidth - menu.offsetWidth - 8, canvasContextMenu.x),
    )
    const nextY = Math.max(
      8,
      Math.min(viewport.clientHeight - menu.offsetHeight - 8, canvasContextMenu.y),
    )
    if (nextX !== canvasContextMenu.x || nextY !== canvasContextMenu.y)
      setCanvasContextMenu({ x: nextX, y: nextY })
  }, [canvasContextMenu])

  useEffect(() => {
    if (stampStructureIntent) stampStructureCancelRef.current?.focus({ preventScroll: true })
  }, [stampStructureIntent])

  useEffect(() => {
    if (transformOverwriteIntent) transformConflictAdjustRef.current?.focus({ preventScroll: true })
  }, [transformOverwriteIntent])

  const maxMapHeight = useMemo(() => {
    if (!liveMap) return 15
    let max = 0
    for (const layer of liveMap.layers)
      for (const row of layer.heights ?? []) for (const height of row) max = Math.max(max, height)
    return Math.max(15, max + 1, paintHeight, viewHeight)
  }, [liveMap, paintHeight, viewHeight])

  useEffect(() => {
    if (!mapId) return
    void session.ensureMapLoaded(mapId).catch(() => undefined)
  }, [mapId, session])

  useEffect(() => {
    if (!liveMap) return
    if (!liveMap.layers.some((layer) => layer.id === activeLayerId))
      setActiveLayerId(liveMap.layers[0]?.id ?? '')
  }, [liveMap, activeLayerId])

  useEffect(() => {
    const fallback = liveMap?.tilesetRefs[0] ?? tilesets[0]?.id ?? ''
    if (!tilesets.some(({ id }) => id === selectedTilesetId)) setSelectedTilesetId(fallback)
  }, [liveMap, selectedTilesetId, tilesets])

  useEffect(() => {
    if (selectedTiles.size > 0 && !selectedTiles.has(selectedTile))
      setSelectedTile(selectedTiles.keys().next().value ?? 0)
  }, [selectedTile, selectedTiles])

  useEffect(() => {
    void mapId
    setPendingDeleteId(undefined)
    setWorkspaceNotice(undefined)
    setSelectionPreview(undefined)
    selectionPreviewRef.current = undefined
    setCandidateMenu(undefined)
    setCanvasContextMenu(undefined)
    setTransformIntent(undefined)
    setTransformTargetLocked(false)
    setTransformOverwriteIntent(undefined)
    setClipboard((current) => (current?.kind === 'stamp-placements' ? undefined : current))
    setStampStructureIntent(undefined)
    stampStructureReturnFocusRef.current = null
    strokeRef.current.clear()
    hoverRef.current = null
    setStampHoverAnchor(undefined)
    panRef.current = null
    paintingRef.current = false
    rectAnchorRef.current = null
    selectionDragRef.current = null
    baseCanvasCacheRef.current = undefined
    selectionCanvasCacheRef.current = undefined
  }, [mapId])

  useEffect(() => {
    if (liveMap && mapId) dispatchWorkspace({ type: 'clip-map', mapId, map: liveMap })
  }, [liveMap, mapId])

  const lastFitMap = useRef<unknown>(null)
  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    if (!loaded || loaded.map === lastFitMap.current) return
    lastFitMap.current = loaded.map
    const box = mapBoxOf(loaded.map, undefined)
    const width = Math.max(1, box.maxX - box.minX)
    const height = Math.max(1, box.maxY - box.minY)
    const zoom = Math.max(0.05, Math.min(size.w / width, size.h / height, 3))
    setView({
      zoom,
      panX: box.minX - (size.w / zoom - width) / 2,
      panY: box.minY - (size.h / zoom - height) / 2,
    })
  }, [status, size, loadedRef, setView])

  const planTransform = useCallback(
    (
      intent: MapTransformIntent,
      conflictPolicy: MapTransformConflictPolicy,
    ): MapTransformPlan | StampGroupTransformPlan | undefined => {
      if (!liveMap) return undefined
      const permission = {
        hiddenLayerIds: workspaceMap.hiddenLayerIds,
        lockedLayerIds: workspaceMap.lockedLayerIds,
      }
      if (intent.kind === 'paste') {
        if (intent.clipboard.kind === 'stamp-placements')
          return planStampGroupPaste({
            mapId,
            map: liveMap,
            mapRevision,
            clipboard: intent.clipboard,
            targetAnchor: intent.anchor,
            permission,
            conflictPolicy,
          })
        return planMapPaste(liveMap, intent.clipboard, intent.anchor, {
          layerMappings: intent.layerMappings,
          conflictPolicy,
          collisionAuthorityLayerId: activeLayerId,
        })
      }
      if (intent.selection.kind === 'stamp-placements')
        return planStampGroupMove({
          mapId,
          map: liveMap,
          mapRevision,
          placementIds: intent.selection.placementIds,
          targetAnchor: intent.anchor,
          permission,
          conflictPolicy,
          clipboard: intent.stampClipboard,
          expectedMap: intent.stampBaseMap,
        })
      return planMapMove(
        liveMap,
        intent.selection,
        intent.anchor,
        {
          includeCollision: intent.includeCollision,
          collisionAuthorityLayerId: activeLayerId,
          layerMappings: intent.layerMappings,
          conflictPolicy,
        },
        mapId,
      )
    },
    [
      activeLayerId,
      liveMap,
      mapId,
      mapRevision,
      workspaceMap.hiddenLayerIds,
      workspaceMap.lockedLayerIds,
    ],
  )

  const transformPlan = useMemo(
    () => (transformIntent ? planTransform(transformIntent, 'reject') : undefined),
    [transformIntent, planTransform],
  )
  const availableStampTileIds = useMemo(
    () =>
      new Map(
        [...(loadedAssets?.tilesets ?? [])].map(([id, frames]) => [id, new Set(frames.keys())]),
      ),
    [loadedAssets?.tilesets],
  )
  const stampPlan = useMemo(
    () =>
      activeTool === 'stamp' && liveMap && activeStamp && stampHoverAnchor
        ? planStampPlacement({
            mapId,
            map: liveMap,
            mapRevision,
            template: activeStamp,
            anchor: stampHoverAnchor,
            mappings: stampMappings,
            permission: {
              hiddenLayerIds: workspaceMap.hiddenLayerIds,
              lockedLayerIds: workspaceMap.lockedLayerIds,
            },
            placementBaseHeight: activePaintHeight,
            availableTileIdsByTileset: availableStampTileIds,
            conflictPolicy: 'reject',
          })
        : undefined,
    [
      activeStamp,
      activeTool,
      activePaintHeight,
      availableStampTileIds,
      liveMap,
      mapId,
      mapRevision,
      stampHoverAnchor,
      stampMappings,
      workspaceMap.hiddenLayerIds,
      workspaceMap.lockedLayerIds,
    ],
  )
  const transformIsStampGroup = transformIntent
    ? isStampGroupTransform(transformIntent)
    : selection.kind === 'stamp-placements'
  const transformIncludesCollision = transformIsStampGroup
    ? true
    : transformIntent
      ? transformIntent.kind === 'paste'
        ? transformIntent.clipboard.kind === 'cells' &&
          transformIntent.clipboard.collision.kind === 'included'
        : transformIntent.includeCollision
      : includeCollision
  const transformPermissionForPlan = useCallback(
    (
      plan: MapTransformPlan | StampGroupTransformPlan,
      intent: MapTransformIntent,
    ): string | undefined => {
      const stampGroup = isStampGroupTransform(intent)
      if (!stampGroup && activeLayerHidden) return '当前活动层已隐藏，不能提交变换。'
      if (!stampGroup && activeLayerLocked) return '当前活动层已锁定，不能提交变换。'
      const hidden = plan.requiredWritableLayerIds.find((id) => hiddenLayerIds.has(id))
      if (hidden) return `变换涉及隐藏图层 "${hidden}"，不能提交。`
      const locked = plan.requiredWritableLayerIds.find((id) => lockedLayerIds.has(id))
      if (locked) return `变换涉及锁定图层 "${locked}"，不能提交。`
      return undefined
    },
    [activeLayerHidden, activeLayerLocked, hiddenLayerIds, lockedLayerIds],
  )
  const transformPermissionMessage = useMemo(() => {
    if (!transformPlan || !transformIntent) return undefined
    return transformPermissionForPlan(transformPlan, transformIntent)
  }, [transformPlan, transformIntent, transformPermissionForPlan])

  useEffect(() => {
    // size 与 paintTick 是命令式 canvas 的显式重绘触发器。
    void size
    void paintTick
    if (status !== 'ready') return
    const loaded = loadedRef.current
    const ctx = canvasRef.current?.getContext('2d')
    if (!loaded || !ctx) return
    const base = liveMap ?? loaded.map
    const strokes = [...strokeRef.current.values()]
    const tileEdits = strokes.flatMap((item) => (item.kind === 'tile' ? [item.edit] : []))
    const collisionEdits = strokes.flatMap((item) => (item.kind === 'collision' ? [item.edit] : []))
    let map = base
    if (liveMap) {
      map = paintProjectMapTiles(liveMap, tileEdits)
      map = paintProjectMapCollision(map, collisionEdits)
    }
    const { zoom, panX, panY } = view
    const hiddenKey = JSON.stringify([...hiddenLayerIds].sort())
    const lockedKey = JSON.stringify([...lockedLayerIds].sort())
    baseCanvasCacheRef.current = drawIsometricMapBase(
      ctx,
      {
        map,
        assets: loaded,
        view,
        showGrid,
        showCollision,
        hiddenLayerIds,
        ...(focusEnabled && activeLayer
          ? { focus: { layerId: activeLayer.id, height: activeViewHeight } }
          : {}),
        revision: basePaintTick,
      },
      baseCanvasCacheRef.current,
    )

    const selectionCached = selectionCanvasCacheRef.current
    const selectionOverlayChanged =
      !selectionCached ||
      selectionCached.map !== map ||
      selectionCached.tilesets !== loaded.tilesets ||
      selectionCached.selection !== selection ||
      selectionCached.selectionPreview !== selectionPreview ||
      selectionCached.transformPlan !== transformPlan ||
      selectionCached.width !== ctx.canvas.width ||
      selectionCached.height !== ctx.canvas.height ||
      selectionCached.zoom !== zoom ||
      selectionCached.panX !== panX ||
      selectionCached.panY !== panY ||
      selectionCached.basePaintTick !== basePaintTick ||
      selectionCached.hiddenKey !== hiddenKey ||
      selectionCached.lockedKey !== lockedKey ||
      selectionCached.showCollision !== showCollision ||
      selectionCached.stampGroupEditPlacementId !== stampGroupEditPlacementId ||
      selectionCached.stampGroupEditSelection !== stampGroupEditSelection ||
      selectionCached.activeLayerId !== activeLayerId
    let selectionCanvas = selectionCached?.canvas
    if (selectionOverlayChanged) {
      selectionCanvas ??= document.createElement('canvas')
      selectionCanvas.width = ctx.canvas.width
      selectionCanvas.height = ctx.canvas.height
      const overlayContext = selectionCanvas.getContext('2d')
      if (overlayContext) {
        if (selection.kind === 'stamp-placements')
          drawStampPlacementSelectionOverlay(overlayContext, {
            map,
            placementIds: selection.placementIds,
            view,
            hiddenLayerIds,
            lockedLayerIds,
            showCollision,
            editingPlacementId: stampGroupEditPlacementId,
            editingSelection:
              selectionPreview?.kind === 'cells' || selectionPreview?.kind === 'none'
                ? selectionPreview
                : stampGroupEditSelection,
            activeLayerId,
          })
        else if (selectionPreview)
          drawMapSelectionOverlay(overlayContext, selectionPreview, view, {
            tone: 'preview',
          })
        else drawMapSelectionOverlay(overlayContext, selection, view)
        if (transformPlan) {
          drawMapSelectionOverlay(overlayContext, transformPlan.nextSelection, view, {
            tone: 'preview',
          })
          if (transformPlan.conflicts.length > 0) {
            const visualSlots = transformPlan.conflicts.flatMap((conflict) =>
              conflict.channel === 'visual' && 'layerId' in conflict.ref ? [conflict.ref] : [],
            )
            const gridPoints = transformPlan.conflicts.map(({ ref }) => ({
              row: ref.row,
              col: ref.col,
            }))
            drawMapSelectionOverlay(
              overlayContext,
              {
                kind: 'cells',
                visualSlots,
                gridPoints,
                hitScope: workspaceMap.hitScope,
              },
              view,
              { tone: 'conflict' },
            )
          }
        }
      }
      selectionCanvasCacheRef.current = {
        canvas: selectionCanvas,
        map,
        tilesets: loaded.tilesets,
        selection,
        selectionPreview,
        transformPlan,
        width: ctx.canvas.width,
        height: ctx.canvas.height,
        zoom,
        panX,
        panY,
        basePaintTick,
        hiddenKey,
        lockedKey,
        showCollision,
        stampGroupEditPlacementId,
        stampGroupEditSelection,
        activeLayerId,
      }
    }
    if (selectionCanvas) ctx.drawImage(selectionCanvas, 0, 0)

    if (stampPlan)
      drawStampPlacementOverlay(ctx, {
        plan: stampPlan,
        tilesets: loaded.tilesets,
        palette: loaded.palette,
        view,
      })

    const hover = hoverRef.current
    if (hover && activeTool !== 'pan' && activeTool !== 'stamp') {
      ctx.save()
      ctx.strokeStyle =
        activeTool === 'erase' || (activeTool === 'collision' && collisionPaint === 'clear')
          ? 'rgba(255,90,90,0.95)'
          : activeTool === 'collision'
            ? 'rgba(255,70,70,0.95)'
            : 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1.5
      const hoverPoints =
        activeTool === 'brush' && liveMap
          ? isometricBrushPoints(hover, brushSize).filter((point) =>
              isLatticeInside(liveMap, point),
            )
          : [hover]
      for (const point of hoverPoints) {
        const center = latticeCenter(point)
        const cx = (center.x - panX) * zoom
        const cy = (center.y - panY) * zoom
        ctx.beginPath()
        ctx.moveTo(cx, cy - 8 * zoom)
        ctx.lineTo(cx + 16 * zoom, cy)
        ctx.lineTo(cx, cy + 8 * zoom)
        ctx.lineTo(cx - 16 * zoom, cy)
        ctx.closePath()
        ctx.stroke()
      }
      ctx.restore()
    }
  }, [
    status,
    view,
    size,
    showGrid,
    showCollision,
    liveMap,
    paintTick,
    basePaintTick,
    activeTool,
    collisionPaint,
    hiddenLayerIds,
    lockedLayerIds,
    focusEnabled,
    activeLayer,
    activeViewHeight,
    brushSize,
    loadedRef,
    selection,
    selectionPreview,
    transformPlan,
    stampPlan,
    workspaceMap.hitScope,
    stampGroupEditPlacementId,
    stampGroupEditSelection,
    activeLayerId,
  ])

  const toWorld = (
    event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>,
  ): { wx: number; wy: number } => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    const current = viewRef.current
    return {
      wx: ((event.clientX - rect.left) * (canvas.width / rect.width)) / current.zoom + current.panX,
      wy:
        ((event.clientY - rect.top) * (canvas.height / rect.height)) / current.zoom + current.panY,
    }
  }

  const editFor = (pos: LatticePos): StrokeEdit | null => {
    if (activeLayerReadOnly) return null
    if (activeTool === 'collision') {
      if (
        stampGroupEditPlacementId &&
        stampPlacementIndex?.collisionOwnerByKey.get(gridPointKey(pos)) !==
          stampGroupEditPlacementId
      )
        return null
      return {
        kind: 'collision',
        edit: { ...pos, value: collisionPaint === 'set' ? 1 : 0 },
      }
    }
    if (!activeLayer) return null
    if (
      stampGroupEditPlacementId &&
      stampPlacementIndex?.visualOwnerByKey.get(
        visualSlotKey({ ...pos, layerId: activeLayer.id }),
      ) !== stampGroupEditPlacementId
    )
      return null
    return {
      kind: 'tile',
      edit: {
        ...pos,
        layerId: activeLayer.id,
        tileId: activeTool === 'erase' ? null : selectedTile,
        tilesetId: activeTool === 'erase' ? null : selectedTilesetId,
        height: activeTool === 'erase' ? 0 : activePaintHeight,
      },
    }
  }

  const rememberStroke = (item: StrokeEdit): void => {
    const edit = item.edit
    const key =
      item.kind === 'tile'
        ? `tile:${item.edit.layerId}:${edit.col}:${edit.row}`
        : `collision:${edit.col}:${edit.row}`
    strokeRef.current.set(key, item)
  }

  const paintAt = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!liveMap) return
    const { wx, wy } = toWorld(event)
    const pos = pixelToLattice(wx, wy)
    if (!isLatticeInside(liveMap, pos)) return
    const points = activeTool === 'brush' ? isometricBrushPoints(pos, brushSize) : [pos]
    for (const point of points) {
      if (!isLatticeInside(liveMap, point)) continue
      const item = editFor(point)
      if (item) rememberStroke(item)
    }
    setBasePaintTick((tick) => tick + 1)
    setPaintTick((tick) => tick + 1)
  }

  const rectStrokeTo = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const anchor = rectAnchorRef.current
    if (!anchor || !liveMap) return
    const { wx, wy } = toWorld(event)
    const end = pixelToLattice(wx, wy)
    const startCenter = latticeCenter(anchor)
    const endCenter = latticeCenter(end)
    strokeRef.current.clear()
    for (const pos of latticeInMapRect(
      liveMap,
      startCenter.x,
      startCenter.y,
      endCenter.x,
      endCenter.y,
    )) {
      const item = editFor(pos)
      if (item) rememberStroke(item)
    }
    setBasePaintTick((tick) => tick + 1)
    setPaintTick((tick) => tick + 1)
  }

  const selectionInputAt = (wx: number, wy: number): MapCellSelectionInput => {
    if (!liveMap) return { visualSlots: [], gridPoints: [], hitScope: workspaceMap.hitScope }
    const loaded = loadedRef.current
    const point = loaded
      ? (() => {
          const hit = hitTestMapContent(liveMap, loaded.tilesets, wx, wy, {
            activeLayerId,
            hiddenLayerIds,
            lockedLayerIds,
          })
          return hit.primary
            ? { row: hit.primary.ref.row, col: hit.primary.ref.col }
            : hit.logicalPoint
        })()
      : pixelToLattice(wx, wy)
    return selectionForGridPoints(liveMap, [point], {
      activeLayerId,
      hitScope: workspaceMap.hitScope,
      hiddenLayerIds,
      lockedLayerIds,
      excludedVisualSlotKeys: ownedVisualSlotKeys,
      excludedGridPointKeys: ownedGridPointKeys,
    })
  }

  const stampGroupSelectionInputAt = (
    wx: number,
    wy: number,
    placementId: string,
  ): MapCellSelectionInput => {
    if (!liveMap) return { visualSlots: [], gridPoints: [], hitScope: 'active-layer' as const }
    const loaded = loadedRef.current
    let point = pixelToLattice(wx, wy)
    if (loaded) {
      const hit = hitTestMapContent(liveMap, loaded.tilesets, wx, wy, {
        activeLayerId,
        hiddenLayerIds,
        lockedLayerIds,
      })
      const candidates = [hit.primary, ...hit.candidates].filter(
        (candidate): candidate is MapHitCandidate => candidate !== undefined,
      )
      const member = candidates.find((candidate) => {
        if (candidate.ref.layerId !== activeLayerId || !candidate.selectable) return false
        if (candidate !== hit.primary && !candidate.pixelHit) return false
        return (
          stampPlacementIndex?.visualOwnerByKey.get(visualSlotKey(candidate.ref)) === placementId
        )
      })
      point = member ? { row: member.ref.row, col: member.ref.col } : { ...hit.logicalPoint }
    }
    return selectionForStampPlacementGridPoints(
      liveMap,
      stampPlacementIndex?.byId.get(placementId),
      [point],
      activeLayerId,
    )
  }

  const directStampHitAt = (
    wx: number,
    wy: number,
  ): { placementId: string; layerId?: string } | undefined => {
    if (!liveMap || !stampPlacementIndex) return undefined
    const loaded = loadedRef.current
    if (!loaded) return undefined
    const hit = hitTestMapContent(liveMap, loaded.tilesets, wx, wy, {
      activeLayerId,
      hiddenLayerIds,
      lockedLayerIds,
    })
    const seen = new Set<string>()
    if (hit.primary?.selectable) {
      const key = visualSlotKey(hit.primary.ref)
      seen.add(key)
      const placementId = stampPlacementIndex.visualOwnerByKey.get(key)
      if (placementId) return { placementId, layerId: hit.primary.ref.layerId }
      if (hit.primary.tileId !== null) return undefined
    }
    // 非活动层只有真实像素命中才可抢占普通逻辑槽；逻辑重叠的歧义留给 Alt 候选。
    for (const candidate of hit.candidates) {
      const key = visualSlotKey(candidate.ref)
      if (seen.has(key) || !candidate.selectable || !candidate.pixelHit) continue
      seen.add(key)
      const placementId = stampPlacementIndex.visualOwnerByKey.get(key)
      if (placementId) return { placementId, layerId: candidate.ref.layerId }
    }
    if (
      showCollision &&
      !activeLayerReadOnly &&
      (!hit.primary?.selectable || hit.primary.tileId === null)
    ) {
      const placementId = stampPlacementIndex.collisionOwnerByKey.get(
        gridPointKey(hit.logicalPoint),
      )
      if (placementId) return { placementId, layerId: activeLayerId }
    }
    return undefined
  }

  const candidateRowsAt = (wx: number, wy: number): MapCandidate[] => {
    if (!liveMap) return []
    const loaded = loadedRef.current
    if (!loaded) return []
    const hit = hitTestMapContent(liveMap, loaded.tilesets, wx, wy, {
      activeLayerId,
      hiddenLayerIds,
      lockedLayerIds,
    })
    const rows: MapCandidate[] = []
    const seenPlacements = new Set<string>()
    for (const candidate of hit.candidates) {
      const placementId = stampPlacementIndex?.visualOwnerByKey.get(visualSlotKey(candidate.ref))
      if (!placementId) {
        rows.push({ kind: 'cell', candidate })
        continue
      }
      if (seenPlacements.has(placementId)) continue
      seenPlacements.add(placementId)
      const placement = stampPlacementIndex?.byId.get(placementId)
      rows.push({
        kind: 'stamp-placement',
        placementId,
        ref: { row: candidate.ref.row, col: candidate.ref.col },
        layerId: candidate.ref.layerId,
        layerName: candidate.layerName,
        sourceName: placement?.sourceStampName ?? placementId,
        locked: candidate.locked,
      })
    }
    if (showCollision) {
      const placementId = stampPlacementIndex?.collisionOwnerByKey.get(
        gridPointKey(hit.logicalPoint),
      )
      if (placementId && !seenPlacements.has(placementId)) {
        const placement = stampPlacementIndex?.byId.get(placementId)
        rows.push({
          kind: 'stamp-placement',
          placementId,
          ref: { ...hit.logicalPoint },
          layerId: activeLayerId,
          layerName: '碰撞通道',
          sourceName: placement?.sourceStampName ?? placementId,
          locked: activeLayerReadOnly,
        })
      }
    }
    return rows
  }

  const updateSelectionDrag = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const drag = selectionDragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !liveMap) return
    const currentClient = { x: event.clientX, y: event.clientY }
    if (!drag.dragging && isMapSelectionDrag(drag.startClient, currentClient)) drag.dragging = true
    const points = drag.dragging
      ? latticeInMapRect(
          liveMap,
          drag.startWorld.wx,
          drag.startWorld.wy,
          toWorld(event).wx,
          toWorld(event).wy,
        )
      : undefined
    const input =
      drag.scope === 'stamp-group' && drag.placementId
        ? points
          ? selectionForStampPlacementGridPoints(
              liveMap,
              stampPlacementIndex?.byId.get(drag.placementId),
              points,
              activeLayerId,
            )
          : stampGroupSelectionInputAt(drag.startWorld.wx, drag.startWorld.wy, drag.placementId)
        : points
          ? selectionForGridPoints(liveMap, points, {
              activeLayerId,
              hitScope: workspaceMap.hitScope,
              hiddenLayerIds,
              lockedLayerIds,
              excludedVisualSlotKeys: ownedVisualSlotKeys,
              excludedGridPointKeys: ownedGridPointKeys,
            })
          : selectionInputAt(drag.startWorld.wx, drag.startWorld.wy)
    const next = changeMapSelection(drag.base, input, drag.mode)
    selectionPreviewRef.current = next
    setSelectionPreview(next)
    setPaintTick((tick) => tick + 1)
  }

  const notifyWorkspace = (kind: 'info' | 'error', message: string): void => {
    setWorkspaceNotice({ kind, message })
  }

  const activateInspectorTab = (nextTab: MapInspectorTab): void => {
    setInspectorTab(nextTab)
    if (nextTab === 'draw') setDrawPanelVisited(true)
    if (nextTab !== 'properties') setCandidateMenu(undefined)
    onRequestInspectorOpen?.()
  }

  const openPaintTilePicker = (): void => {
    activateInspectorTab('draw')
    requestAnimationFrame(() => {
      const selected = inspectorRef.current?.querySelector<HTMLButtonElement>(
        '.tile-picker-item.is-selected',
      )
      selected?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
      selected?.focus({ preventScroll: true })
    })
  }

  const activateMapTool = (nextTool: MapTool): void => {
    const cancelledTransform = Boolean(transformIntent)
    const clearedSelection =
      nextTool === 'pan' &&
      (selection.kind !== 'none' || Boolean(selectionPreview) || Boolean(stampGroupEditPlacementId))
    if (nextTool === 'pan') {
      selectionPreviewRef.current = undefined
      setSelectionPreview(undefined)
      dispatchWorkspace({ type: 'clear-selection', mapId })
    }
    setTool(nextTool)
    setTransformIntent(undefined)
    setTransformTargetLocked(false)
    setTransformOverwriteIntent(undefined)
    setCandidateMenu(undefined)
    if (cancelledTransform)
      setWorkspaceNotice({
        kind: 'info',
        message: nextTool === 'pan' ? '已取消地图变换预览并清空选区。' : '已取消地图变换预览。',
      })
    else if (clearedSelection)
      setWorkspaceNotice({ kind: 'info', message: '已切换到平移；地图内容选区已清空。' })
  }

  const pickStamp = useCallback(
    (id: string): void => {
      const template = stamps.find((candidate) => candidate.id === id)
      if (!template || !liveMap) return
      if (stampGroupEditPlacementId) {
        setWorkspaceNotice({
          kind: 'error',
          message: '当前正在组合内编辑；请先按 Esc 退出，再选择待放置组合。',
        })
        canvasRef.current?.focus({ preventScroll: true })
        return
      }
      setActiveStampId(id)
      setInspectorTab('draw')
      setDrawPanelVisited(true)
      onRequestInspectorOpen?.()
      setTool('stamp')
      setTransformIntent(undefined)
      setTransformTargetLocked(false)
      setTransformOverwriteIntent(undefined)
      setCandidateMenu(undefined)
      setCanvasContextMenu(undefined)
      const hover = coordinateHoverRef.current
      setStampHoverAnchor(hover && isLatticeInside(liveMap, hover) ? hover : undefined)
      setWorkspaceNotice({
        kind: 'info',
        message:
          template.layers.length === 1
            ? `已选择组合“${template.name}”；锚点将跟随鼠标，单击放置到当前图层。`
            : `已选择组合“${template.name}”；当前图层承接底层，其余 ${template.layers.length - 1} 层自动向上对应。`,
      })
      canvasRef.current?.focus({ preventScroll: true })
    },
    [liveMap, onRequestInspectorOpen, stampGroupEditPlacementId, stamps],
  )

  const cancelStampTool = useCallback((): void => {
    setTool('select')
    setStampHoverAnchor(undefined)
    setWorkspaceNotice({ kind: 'info', message: '已退出组合放置；模板与普通地图选区仍保留。' })
    canvasRef.current?.focus({ preventScroll: true })
  }, [])

  const commitStamp = (targetAnchor = stampHoverAnchor): void => {
    if (!activeStamp || !targetAnchor) {
      notifyWorkspace('error', '请先选择组合并把鼠标移到地图目标位置。')
      return
    }
    const currentMap = session.getState().maps[mapId]
    const loaded = loadedRef.current
    if (!currentMap || !loaded) {
      notifyWorkspace('error', '地图或瓦片资源尚未载入。')
      return
    }
    const currentTemplate =
      session.getState().stamps.find((candidate) => candidate.id === activeStamp.id) ?? activeStamp
    const revision = session.getMapRevision(mapId)
    const freshPlan = planStampPlacement({
      mapId,
      map: currentMap,
      mapRevision: revision,
      template: currentTemplate,
      anchor: targetAnchor,
      mappings: stampMappings,
      permission: {
        hiddenLayerIds: workspaceMap.hiddenLayerIds,
        lockedLayerIds: workspaceMap.lockedLayerIds,
      },
      placementBaseHeight: activePaintHeight,
      availableTileIdsByTileset: new Map(
        [...loaded.tilesets].map(([id, frames]) => [id, new Set(frames.keys())]),
      ),
      conflictPolicy: 'overwrite',
    })
    if (!freshPlan.canApply) {
      notifyWorkspace(
        'error',
        freshPlan.issues[0]?.message ??
          (freshPlan.conflicts.length ? '当前位置不能覆盖现有内容。' : '当前组合不能放置。'),
      )
      return
    }
    try {
      session.dispatchAtMapRevision(mapId, freshPlan.mapRevision, new PlaceStampCommand(freshPlan))
      setRecentStampIds((current) =>
        [activeStamp.id, ...current.filter((id) => id !== activeStamp.id)].slice(0, 12),
      )
      notifyWorkspace(
        'info',
        `已放置组合“${activeStamp.name}”（${freshPlan.placement.id}）；矩阵与组身份可一步撤销。`,
      )
    } catch (cause) {
      notifyWorkspace('error', cause instanceof Error ? cause.message : String(cause))
    }
  }

  const openActiveStampLibrary = useCallback((): void => {
    onOpenStampLibrary?.(activeStampId)
  }, [activeStampId, onOpenStampLibrary])

  const closeCandidateMenu = (returnFocus = true): void => {
    setCandidateMenu(undefined)
    if (returnFocus) canvasRef.current?.focus({ preventScroll: true })
  }

  const enterStampGroupEdit = (placementId: string): void => {
    const current = session.getState().maps[mapId]
    if (!current || !buildStampPlacementIndex(current).byId.has(placementId)) {
      notifyWorkspace('error', '放置组已被删除，请重新选择。')
      return
    }
    dispatchWorkspace({
      type: 'set-selection',
      mapId,
      selection: { kind: 'stamp-placements', placementIds: [placementId] },
    })
    dispatchWorkspace({
      type: 'enter-stamp-group-edit',
      mapId,
      placementId,
      selection: stampPlacementAllMemberSelection(
        buildStampPlacementIndex(current).byId.get(placementId),
      ),
    })
    setCandidateMenu(undefined)
    notifyWorkspace('info', '已进入组内编辑；视觉修改仅作用于当前活动层，Esc 退出组内。')
    canvasRef.current?.focus({ preventScroll: true })
  }

  const exitStampGroupEdit = (): void => {
    dispatchWorkspace({ type: 'exit-stamp-group-edit', mapId })
    notifyWorkspace('info', '已退出组内编辑；完整放置组选区仍保留。')
    canvasRef.current?.focus({ preventScroll: true })
  }

  const explainReadOnlySelection = (): boolean => {
    if (!activeLayer) {
      notifyWorkspace('error', '当前没有可写活动层。')
      return true
    }
    if (activeLayerHidden) {
      notifyWorkspace('error', '当前活动层已隐藏，不能修改地图内容。')
      return true
    }
    if (activeLayerLocked) {
      notifyWorkspace('error', '当前活动层已锁定，不能修改地图内容。')
      return true
    }
    if (selectionHasReadOnlyLayer) {
      notifyWorkspace('error', '选区含隐藏或锁定图层成员，整笔操作已拒绝。')
      return true
    }
    return false
  }

  const dispatchMapPatch = (
    patch: ProjectMapPatch,
    requiredWritableLayerIds: readonly string[],
    label: string,
  ): 'changed' | 'unchanged' | 'error' => {
    try {
      const writableLayerIds = new Set(requiredWritableLayerIds)
      if (activeLayerId) writableLayerIds.add(activeLayerId)
      const changed = session.dispatch(
        new ApplyProjectMapPatchCommand(
          mapId,
          patch,
          {
            hiddenLayerIds: workspaceMap.hiddenLayerIds,
            lockedLayerIds: workspaceMap.lockedLayerIds,
            requiredWritableLayerIds: [...writableLayerIds],
          },
          label,
        ),
      )
      notifyWorkspace('info', changed ? `${label}；可撤销。` : `${label}：内容没有变化。`)
      return changed ? 'changed' : 'unchanged'
    } catch (error) {
      const message =
        error instanceof ProjectMapPatchError
          ? error.issues.map((issue) => issue.message).join('；')
          : error instanceof Error
            ? error.message
            : String(error)
      notifyWorkspace('error', message)
      return 'error'
    }
  }

  const dispatchStampGroupEdit = (input: {
    placementId: string
    patch: ProjectMapPatch
    removeVisualSlots?: readonly import('../core/map-selection.js').VisualSlotRef[]
    removeGridPoints?: readonly import('../core/map-selection.js').GridPointRef[]
    label: string
  }): 'changed' | 'unchanged' | 'error' => {
    const currentMap = session.getState().maps[mapId]
    if (!currentMap) {
      notifyWorkspace('error', '地图尚未载入。')
      return 'error'
    }
    try {
      const revision = session.getMapRevision(mapId)
      const changed = session.dispatchAtMapRevision(
        mapId,
        revision,
        new EditStampPlacementCommand({
          mapId,
          map: currentMap,
          placementId: input.placementId,
          activeLayerId,
          patch: input.patch,
          permission: {
            hiddenLayerIds: workspaceMap.hiddenLayerIds,
            lockedLayerIds: workspaceMap.lockedLayerIds,
          },
          ...(input.removeVisualSlots ? { removeVisualSlots: input.removeVisualSlots } : {}),
          ...(input.removeGridPoints ? { removeGridPoints: input.removeGridPoints } : {}),
          label: input.label,
        }),
      )
      notifyWorkspace(
        'info',
        changed ? `${input.label}；组身份同步更新，可撤销。` : `${input.label}：内容没有变化。`,
      )
      return changed ? 'changed' : 'unchanged'
    } catch (error) {
      notifyWorkspace('error', error instanceof Error ? error.message : String(error))
      return 'error'
    }
  }

  const ungroupStampPlacements = (placementIds: readonly string[]): void => {
    const currentMap = session.getState().maps[mapId]
    if (!currentMap) return
    try {
      const revision = session.getMapRevision(mapId)
      const changed = session.dispatchAtMapRevision(
        mapId,
        revision,
        new UngroupStampPlacementsCommand({
          mapId,
          map: currentMap,
          placementIds,
          permission: {
            hiddenLayerIds: workspaceMap.hiddenLayerIds,
            lockedLayerIds: workspaceMap.lockedLayerIds,
          },
        }),
      )
      if (changed) {
        dispatchWorkspace({ type: 'clear-selection', mapId })
        notifyWorkspace(
          'info',
          `已解组 ${placementIds.length} 个放置组；瓦片、高度与碰撞值保持不变，可撤销。`,
        )
      }
      canvasRef.current?.focus({ preventScroll: true })
    } catch (error) {
      notifyWorkspace('error', error instanceof Error ? error.message : String(error))
    }
  }

  const copyMapSelection = (): MapCellClipboard | StampGroupClipboard | undefined => {
    if (stampGroupEditPlacementId) {
      notifyWorkspace('error', '当前正在组内编辑；请先按 Esc 退出，再复制完整放置组合。')
      return undefined
    }
    if (!liveMap) return undefined
    const next =
      selection.kind === 'stamp-placements'
        ? captureStampGroupClipboard(mapId, liveMap, selection.placementIds, 'copy')
        : captureMapClipboard(mapId, liveMap, selection, includeCollision)
    if (!next) {
      notifyWorkspace('error', '请先选择要复制的地图内容。')
      return undefined
    }
    setClipboard(next)
    notifyWorkspace(
      'info',
      next.kind === 'stamp-placements'
        ? `已复制 ${next.placements.length} 个完整放置组合；视觉、高度和碰撞将始终一起粘贴。`
        : `已复制 ${next.visual.length} 个视觉实例${next.collision.kind === 'included' ? `和 ${next.collision.cells.length} 个碰撞格点` : ''}。`,
    )
    return next
  }

  const deleteMapSelection = (afterDelete?: () => void): void => {
    if (stampGroupEditPlacementId) {
      notifyWorkspace('error', '当前正在组内编辑；请先按 Esc 退出，再删除完整放置组合。')
      return
    }
    if (!liveMap) return
    if (selection.kind === 'stamp-placements') {
      try {
        const revision = session.getMapRevision(mapId)
        const plan = planStampGroupDelete({
          mapId,
          map: liveMap,
          mapRevision: revision,
          placementIds: selection.placementIds,
          permission: {
            hiddenLayerIds: workspaceMap.hiddenLayerIds,
            lockedLayerIds: workspaceMap.lockedLayerIds,
          },
        })
        if (!plan.canApply) {
          notifyWorkspace('error', plan.issues[0]?.message ?? '放置组合不能删除。')
          return
        }
        const changed = session.dispatchAtMapRevision(
          mapId,
          revision,
          new TransformStampPlacementsCommand(plan),
        )
        if (changed) {
          dispatchWorkspace({ type: 'clear-selection', mapId })
          notifyWorkspace(
            'info',
            `已删除 ${selection.placementIds.length} 个完整放置组合（始终包含碰撞）；可一步撤销。`,
          )
          afterDelete?.()
        }
      } catch (error) {
        notifyWorkspace('error', error instanceof Error ? error.message : String(error))
      }
      return
    }
    if (explainReadOnlySelection()) return
    const plan = planMapDelete(liveMap, selection, includeCollision, activeLayerId)
    if (!plan.canApply) {
      notifyWorkspace('error', plan.issues[0]?.message ?? '选区没有可删除内容。')
      return
    }
    if (
      dispatchMapPatch(
        plan.patch,
        plan.requiredWritableLayerIds,
        includeCollision ? '删除选区（含碰撞）' : '删除选区',
      ) === 'changed'
    ) {
      dispatchWorkspace({ type: 'clear-selection', mapId })
      afterDelete?.()
    }
  }

  const cutMapSelection = (): void => {
    if (stampGroupEditPlacementId) {
      notifyWorkspace('error', '当前正在组内编辑；请先按 Esc 退出，再变换完整放置组合。')
      return
    }
    if (!liveMap) return
    if (selection.kind === 'stamp-placements') {
      notifyWorkspace('error', '整组剪切会把移动拆成两步历史；请使用“移动”保留原放置组 ID。')
      return
    }
    const next = captureMapClipboard(mapId, liveMap, selection, includeCollision)
    if (!next) {
      notifyWorkspace('error', '请先选择要剪切的地图内容。')
      return
    }
    deleteMapSelection(() => {
      setClipboard(next)
      notifyWorkspace('info', '已剪切选区；内容与碰撞（如启用）在同一步撤销。')
    })
  }

  const beginPaste = (source = clipboard): void => {
    if (stampGroupEditPlacementId) {
      notifyWorkspace('error', '当前正在组内编辑；请先按 Esc 退出，再粘贴普通地图内容。')
      return
    }
    if (!source || !liveMap) {
      notifyWorkspace('error', '地图剪贴板为空。')
      return
    }
    if (source.kind === 'cells' && activeLayerReadOnly) {
      explainReadOnlySelection()
      return
    }
    const hover = hoverRef.current
    const anchor = hover && isLatticeInside(liveMap, hover) ? hover : source.sourceAnchor
    setTool('select')
    setCandidateMenu(undefined)
    setTransformIntent({ kind: 'paste', clipboard: source, anchor, layerMappings: [] })
    setTransformTargetLocked(false)
    setTransformOverwriteIntent(undefined)
    setInspectorTab('properties')
    onRequestInspectorOpen?.()
    canvasRef.current?.focus({ preventScroll: true })
    notifyWorkspace('info', '粘贴预览：移动鼠标定位，在画布上单击放下。')
  }

  const beginMove = (layerMappings: readonly MapLayerMapping[] = []): void => {
    if (stampGroupEditPlacementId) {
      notifyWorkspace('error', '当前正在组内编辑；请先按 Esc 退出，再移动完整放置组合。')
      return
    }
    if (!liveMap || selection.kind === 'none') {
      notifyWorkspace('error', '请先选择要移动的地图内容。')
      return
    }
    if (selection.kind === 'cells' && explainReadOnlySelection()) return
    const captured =
      selection.kind === 'stamp-placements'
        ? captureStampGroupClipboard(mapId, liveMap, selection.placementIds, 'preserve')
        : captureMapClipboard(mapId, liveMap, selection, includeCollision)
    if (!captured) {
      notifyWorkspace('error', '选区没有可移动内容。')
      return
    }
    setTool('select')
    setCandidateMenu(undefined)
    setTransformIntent({
      kind: 'move',
      selection: structuredClone(selection),
      anchor: captured.sourceAnchor,
      includeCollision: selection.kind === 'stamp-placements' ? true : includeCollision,
      layerMappings,
      ...(selection.kind === 'stamp-placements'
        ? { stampClipboard: captured as StampGroupClipboard, stampBaseMap: liveMap }
        : {}),
    })
    setTransformTargetLocked(false)
    setTransformOverwriteIntent(undefined)
    setInspectorTab('properties')
    onRequestInspectorOpen?.()
    canvasRef.current?.focus({ preventScroll: true })
    notifyWorkspace('info', '移动预览：移动鼠标定位，在画布上单击放下；方向键可按菱形相邻格微调。')
  }

  const commitTransform = (
    conflictPolicy: MapTransformConflictPolicy,
    intent = transformIntent,
  ): void => {
    if (!intent) return
    const plan = planTransform(intent, conflictPolicy)
    if (!plan) {
      setTransformTargetLocked(false)
      return
    }
    const permissionMessage = transformPermissionForPlan(plan, intent)
    if (permissionMessage) {
      notifyWorkspace('error', permissionMessage)
      setTransformTargetLocked(false)
      return
    }
    if (!plan.canApply) {
      const message =
        plan.issues[0]?.message ??
        (plan.conflicts.length
          ? `目标有 ${plan.conflicts.length} 处冲突；请选择覆盖或取消。`
          : '当前变换不能提交。')
      notifyWorkspace('error', message)
      setTransformTargetLocked(false)
      return
    }
    if ('placementSelection' in plan) {
      try {
        const changed = session.dispatchAtMapRevision(
          mapId,
          plan.mapRevision,
          new TransformStampPlacementsCommand(plan),
        )
        if (changed) {
          dispatchWorkspace({ type: 'set-selection', mapId, selection: plan.placementSelection })
          if (
            intent.kind === 'paste' &&
            intent.clipboard.kind === 'stamp-placements' &&
            intent.clipboard.identity === 'preserve'
          )
            setClipboard({ ...intent.clipboard, identity: 'copy' })
          notifyWorkspace(
            'info',
            `${plan.kind === 'move' ? '已移动' : '已复制'} ${plan.upsertPlacements.length} 个完整放置组合（始终包含碰撞）；可一步撤销。`,
          )
        }
        setTransformIntent(undefined)
        setTransformTargetLocked(false)
        setTransformOverwriteIntent(undefined)
        canvasRef.current?.focus({ preventScroll: true })
      } catch (error) {
        setTransformTargetLocked(false)
        notifyWorkspace('error', error instanceof Error ? error.message : String(error))
      }
      return
    }
    const includesCollision = isStampGroupTransform(intent)
      ? true
      : intent.kind === 'paste'
        ? intent.clipboard.kind === 'cells' && intent.clipboard.collision.kind === 'included'
        : intent.includeCollision
    const channelLabel = includesCollision ? '含碰撞' : '仅视觉'
    const label =
      intent.kind === 'paste'
        ? `粘贴地图选区（${channelLabel}）`
        : `移动地图选区（${channelLabel}）`
    const result = dispatchMapPatch(plan.patch, plan.requiredWritableLayerIds, label)
    if (result === 'changed') {
      dispatchWorkspace({ type: 'set-selection', mapId, selection: plan.nextSelection })
      setTransformIntent(undefined)
      setTransformTargetLocked(false)
      setTransformOverwriteIntent(undefined)
      canvasRef.current?.focus({ preventScroll: true })
    } else if (result === 'unchanged') {
      setTransformIntent(undefined)
      setTransformTargetLocked(false)
      setTransformOverwriteIntent(undefined)
      canvasRef.current?.focus({ preventScroll: true })
    }
  }

  const requestTransformDrop = (intent = transformIntent): void => {
    if (!intent) return
    setTransformIntent(intent)
    setTransformTargetLocked(true)
    setTransformOverwriteIntent(undefined)
    const plan = planTransform(intent, 'reject')
    if (!plan) {
      setTransformTargetLocked(false)
      return
    }
    const permissionMessage = transformPermissionForPlan(plan, intent)
    if (permissionMessage) {
      notifyWorkspace('error', permissionMessage)
      setTransformTargetLocked(false)
      return
    }
    if (plan.issues.length > 0) {
      notifyWorkspace('error', plan.issues[0]?.message ?? '当前目标位置不能使用。')
      setTransformTargetLocked(false)
      return
    }
    if (plan.conflicts.length > 0) {
      const overwritePlan = planTransform(intent, 'overwrite')
      const overwritePermission = overwritePlan
        ? transformPermissionForPlan(overwritePlan, intent)
        : undefined
      if (overwritePlan?.canApply && !overwritePermission) {
        setTransformOverwriteIntent(intent)
        return
      }
      notifyWorkspace(
        'error',
        overwritePermission ??
          overwritePlan?.issues[0]?.message ??
          '目标内容不能被覆盖；请选择其他位置。',
      )
      setTransformTargetLocked(false)
      return
    }
    commitTransform('reject', intent)
  }

  const returnToTransformAdjustment = (): void => {
    setTransformOverwriteIntent(undefined)
    setTransformTargetLocked(false)
    canvasRef.current?.focus({ preventScroll: true })
    notifyWorkspace('info', '已保留变换预览；请重新选择目标位置。')
  }

  const confirmTransformOverwrite = (): void => {
    const intent = transformOverwriteIntent
    if (!intent) return
    setTransformOverwriteIntent(undefined)
    commitTransform('overwrite', intent)
  }

  const repeatMapSelection = (): void => {
    if (stampGroupEditPlacementId) {
      notifyWorkspace('error', '当前正在组内编辑；请先按 Esc 退出，再重复普通地图内容。')
      return
    }
    if (!liveMap) {
      notifyWorkspace('error', '地图尚未载入。')
      return
    }
    if (selection.kind === 'cells' && explainReadOnlySelection()) return
    const source =
      selection.kind === 'cells'
        ? captureMapClipboard(mapId, liveMap, selection, includeCollision)
        : selection.kind === 'stamp-placements'
          ? captureStampGroupClipboard(mapId, liveMap, selection.placementIds, 'copy')
          : clipboard
    if (!source) {
      notifyWorkspace('error', '当前选区和地图剪贴板都没有可重复内容。')
      return
    }
    setClipboard(source)
    const bounds = mapSelectionBounds(selection)
    const sourceRefs =
      source.kind === 'stamp-placements'
        ? source.placements.flatMap((placement) => [
            ...placement.visual.map(({ sourceRef }) => sourceRef),
            ...placement.collision.map(({ sourceRef }) => sourceRef),
          ])
        : []
    const maxSourceCol = sourceRefs.reduce(
      (maximum, ref) => Math.max(maximum, ref.col),
      source.sourceAnchor.col,
    )
    const anchor = bounds
      ? { row: bounds.minRow, col: Math.min((liveMap?.width ?? 1) - 1, bounds.maxCol + 1) }
      : {
          ...source.sourceAnchor,
          col: source.kind === 'stamp-placements' ? maxSourceCol + 1 : source.sourceAnchor.col + 1,
        }
    setTool('select')
    setTransformIntent({ kind: 'paste', clipboard: source, anchor, layerMappings: [] })
    setTransformTargetLocked(true)
    setTransformOverwriteIntent(undefined)
    setInspectorTab('properties')
    onRequestInspectorOpen?.()
    canvasRef.current?.focus({ preventScroll: true })
    notifyWorkspace('info', '重复预览已建立；可用菱形方向按钮微调，再确认位置。')
  }

  const moveSelectionToLayer = (targetLayerId: string): void => {
    if (selection.kind !== 'cells') return
    const sourceLayerIds = [...new Set(selection.visualSlots.map((ref) => ref.layerId))]
    beginMove(sourceLayerIds.map((sourceLayerId) => ({ sourceLayerId, targetLayerId })))
  }

  const adjustTransform = (direction: IsometricNudgeDirection): void => {
    setTransformTargetLocked(true)
    setTransformIntent((current) =>
      current
        ? {
            ...current,
            anchor: nudgeIsometricLattice(current.anchor, direction),
          }
        : current,
    )
  }

  const cancelTransform = (): void => {
    setTransformIntent(undefined)
    setTransformTargetLocked(false)
    setTransformOverwriteIntent(undefined)
    canvasRef.current?.focus({ preventScroll: true })
    notifyWorkspace('info', '已取消地图变换预览。')
  }

  const onDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (event.button === 0) setCanvasContextMenu(undefined)
    event.currentTarget.focus()
    if (event.button !== 0 && event.button !== 1) return
    if (liveMap) {
      const { wx, wy } = toWorld(event)
      const point = pixelToLattice(wx, wy)
      const next = isLatticeInside(liveMap, point) ? point : null
      coordinateHoverRef.current = next
      setHoverPoint(next)
    }
    if (transformIntent && event.button === 0 && liveMap) {
      const { wx, wy } = toWorld(event)
      const anchor = pixelToLattice(wx, wy)
      if (isLatticeInside(liveMap, anchor)) {
        hoverRef.current = anchor
        requestTransformDrop({ ...transformIntent, anchor })
      }
      return
    }
    if (activeTool === 'stamp' && event.button === 0 && liveMap) {
      const { wx, wy } = toWorld(event)
      const anchor = pixelToLattice(wx, wy)
      hoverRef.current = anchor
      setStampHoverAnchor(anchor)
      commitStamp(anchor)
      return
    }
    if (activeTool === 'select' && event.button === 0 && liveMap) {
      const { wx, wy } = toWorld(event)
      const stampHit = directStampHitAt(wx, wy)
      if (stampGroupEditPlacementId) {
        setCandidateMenu(undefined)
        if (event.altKey) {
          notifyWorkspace('error', '组内编辑不打开外部候选；请先按 Esc 退出。')
          return
        }
        if (stampHit && stampHit.placementId !== stampGroupEditPlacementId) {
          notifyWorkspace('error', '组内编辑已隔离；请先按 Esc 退出，再选择其他地图内容。')
          return
        }
        event.currentTarget.setPointerCapture(event.pointerId)
        selectionDragRef.current = {
          scope: 'stamp-group',
          placementId: stampGroupEditPlacementId,
          pointerId: event.pointerId,
          startClient: { x: event.clientX, y: event.clientY },
          startWorld: { wx, wy },
          mode: selectionModeFromModifiers(event),
          base: stampGroupEditSelection ?? { kind: 'none' },
          dragging: false,
        }
        updateSelectionDrag(event)
        return
      }
      if (event.altKey) {
        const candidates = candidateRowsAt(wx, wy)
        setCandidateMenu({ candidates })
        setInspectorTab('properties')
        onRequestInspectorOpen?.()
        notifyWorkspace(
          'info',
          candidates.length
            ? `当前位置有 ${candidates.length} 个候选；请选择明确目标。`
            : '当前位置没有可选候选。',
        )
        return
      }
      setCandidateMenu(undefined)
      if (stampHit) {
        const mode = selectionModeFromModifiers(event)
        const next = changeStampPlacementSelection(selection, [stampHit.placementId], mode)
        if (stampHit.layerId) setActiveLayerId(stampHit.layerId)
        dispatchWorkspace({
          type: 'change-stamp-selection',
          mapId,
          placementIds: [stampHit.placementId],
          mode,
        })
        notifyWorkspace(
          'info',
          next.kind === 'stamp-placements'
            ? `已选择 ${next.placementIds.length} 个完整放置组；Enter 或双击进入单组编辑。`
            : '放置组选区已清空。',
        )
        return
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      selectionDragRef.current = {
        scope: 'map',
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        startWorld: { wx, wy },
        mode: selectionModeFromModifiers(event),
        base: selection,
        dragging: false,
      }
      updateSelectionDrag(event)
      return
    }
    if (activeTool !== 'pan' && event.button === 0 && liveMap) {
      if (activeLayerReadOnly) {
        notifyWorkspace(
          'error',
          activeLayerHidden ? '当前活动层已隐藏，不能写入。' : '当前活动层已锁定，不能写入。',
        )
        return
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      if (activeTool === 'eyedropper') {
        if (!activeLayer) return
        const { wx, wy } = toWorld(event)
        const pos = pixelToLattice(wx, wy)
        if (!isLatticeInside(liveMap, pos)) return
        const tileId = activeLayer.tiles[pos.row]?.[pos.col]
        if (tileId === null || tileId === undefined) return
        const sampledHeight = mapInstanceHeight(activeLayer, pos.row, pos.col)
        const sampledTilesetId = mapInstanceTilesetId(liveMap, activeLayer, pos.row, pos.col)
        setSelectedTile(tileId)
        if (sampledTilesetId) setSelectedTilesetId(sampledTilesetId)
        setPaintHeight(sampledHeight)
        setViewHeight(sampledHeight)
        setTool('brush')
        return
      }
      if (activeTool === 'fill') {
        if (!activeLayer) return
        const { wx, wy } = toWorld(event)
        const start = pixelToLattice(wx, wy)
        if (
          !stampGroupEditPlacementId &&
          stampPlacementIndex?.visualOwnerByKey.has(
            visualSlotKey({ layerId: activeLayer.id, ...start }),
          )
        ) {
          notifyWorkspace('error', '此视觉槽属于放置组合；请先进入组合内编辑或先解组。')
          return
        }
        const edits = stampGroupEditPlacementId
          ? floodFillStampPlacementTiles(
              liveMap,
              stampGroupEditPlacementId,
              activeLayer.id,
              start,
              selectedTile,
              selectedTilesetId,
              activePaintHeight,
            )
          : floodFillIsometricTiles({
              start,
              isInside: (point) => isLatticeInside(liveMap, point),
              sampleAt: (point) => {
                const tileId = activeLayer.tiles[point.row]?.[point.col]
                return tileId === undefined
                  ? undefined
                  : {
                      tileId,
                      tilesetId: mapInstanceTilesetId(liveMap, activeLayer, point.row, point.col),
                      height: mapInstanceHeight(activeLayer, point.row, point.col),
                    }
              },
            }).flatMap((point) =>
              activeLayer.tiles[point.row]?.[point.col] === selectedTile &&
              mapInstanceTilesetId(liveMap, activeLayer, point.row, point.col) ===
                selectedTilesetId &&
              mapInstanceHeight(activeLayer, point.row, point.col) === activePaintHeight
                ? []
                : [
                    {
                      ...point,
                      layerId: activeLayer.id,
                      tileId: selectedTile,
                      tilesetId: selectedTilesetId,
                      height: activePaintHeight,
                    },
                  ],
            )
        if (edits.length > 0) {
          const patch = tileEditsPatch(liveMap, edits)
          if (stampGroupEditPlacementId)
            dispatchStampGroupEdit({
              placementId: stampGroupEditPlacementId,
              patch,
              label: '填充组内当前层成员',
            })
          else dispatchMapPatch(patch, [activeLayer.id], '填充地图区域')
        }
        return
      }
      paintingRef.current = true
      if (activeTool === 'rect') {
        const { wx, wy } = toWorld(event)
        rectAnchorRef.current = pixelToLattice(wx, wy)
        rectStrokeTo(event)
      } else {
        paintAt(event)
      }
      return
    }
    if (activeTool !== 'pan' || (event.button !== 0 && event.button !== 1)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const current = viewRef.current
    panRef.current = {
      sx: event.clientX,
      sy: event.clientY,
      panX: current.panX,
      panY: current.panY,
    }
  }

  const onMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (liveMap) {
      const { wx, wy } = toWorld(event)
      const point = pixelToLattice(wx, wy)
      const next = isLatticeInside(liveMap, point) ? point : null
      const previous = coordinateHoverRef.current
      if (previous?.row !== next?.row || previous?.col !== next?.col) {
        coordinateHoverRef.current = next
        setHoverPoint(next)
      }
    }
    if (selectionDragRef.current) {
      if (selectionDragRef.current.pointerId !== event.pointerId) return
      updateSelectionDrag(event)
      return
    }
    if (transformIntent && liveMap && !transformTargetLocked && !transformOverwriteIntent) {
      const { wx, wy } = toWorld(event)
      const pos = pixelToLattice(wx, wy)
      if (isLatticeInside(liveMap, pos)) {
        hoverRef.current = pos
        if (pos.row !== transformIntent.anchor.row || pos.col !== transformIntent.anchor.col)
          setTransformIntent((current) => (current ? { ...current, anchor: pos } : current))
        setPaintTick((tick) => tick + 1)
      }
      return
    }
    if (activeTool === 'stamp' && liveMap) {
      const { wx, wy } = toWorld(event)
      const pos = pixelToLattice(wx, wy)
      const previous = hoverRef.current
      if (!previous || previous.col !== pos.col || previous.row !== pos.row) {
        hoverRef.current = pos
        setStampHoverAnchor(pos)
      }
      return
    }
    if (paintingRef.current) {
      if (activeTool === 'rect') rectStrokeTo(event)
      else paintAt(event)
      return
    }
    const pan = panRef.current
    const canvas = canvasRef.current
    if (pan && canvas) {
      const scale = canvas.width / canvas.getBoundingClientRect().width / viewRef.current.zoom
      setView((current) => ({
        ...current,
        panX: pan.panX - (event.clientX - pan.sx) * scale,
        panY: pan.panY - (event.clientY - pan.sy) * scale,
      }))
      return
    }
    if (activeTool !== 'pan') {
      const { wx, wy } = toWorld(event)
      const pos = pixelToLattice(wx, wy)
      const previous = hoverRef.current
      if (!previous || previous.col !== pos.col || previous.row !== pos.row) {
        hoverRef.current = pos
        setPaintTick((tick) => tick + 1)
      }
    }
  }

  const onUp = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const selectionDrag = selectionDragRef.current
    if (selectionDrag && selectionDrag.pointerId !== event.pointerId) return
    if (selectionDrag) {
      updateSelectionDrag(event)
      const next = selectionPreviewRef.current ?? selectionDrag.base
      if (selectionDrag.scope === 'stamp-group' && next.kind !== 'stamp-placements')
        dispatchWorkspace({ type: 'set-stamp-group-selection', mapId, selection: next })
      else dispatchWorkspace({ type: 'set-selection', mapId, selection: next })
      selectionDragRef.current = null
      selectionPreviewRef.current = undefined
      setSelectionPreview(undefined)
      notifyWorkspace(
        'info',
        selectionDrag.scope === 'stamp-group'
          ? next.kind === 'cells'
            ? `组内已选择 ${next.visualSlots.length} 个视觉成员、${next.gridPoints.length} 个碰撞成员。`
            : '组内 cells 选区已清空；完整 placement 仍保持选中。'
          : next.kind === 'cells'
            ? `已选择 ${next.visualSlots.length} 个视觉槽、${next.gridPoints.length} 个格点。`
            : '选区已清空。',
      )
    }
    if (paintingRef.current) {
      paintingRef.current = false
      rectAnchorRef.current = null
      const items = [...strokeRef.current.values()]
      strokeRef.current.clear()
      const tileEdits = items.flatMap((item) => (item.kind === 'tile' ? [item.edit] : []))
      const collisionEdits = items.flatMap((item) => (item.kind === 'collision' ? [item.edit] : []))
      if (stampGroupEditPlacementId) {
        if (tileEdits.length > 0)
          dispatchStampGroupEdit({
            placementId: stampGroupEditPlacementId,
            patch: tileEditsPatch(liveMap!, tileEdits),
            ...(activeTool === 'erase' ? { removeVisualSlots: tileEdits } : {}),
            label: activeTool === 'erase' ? '擦除组内视觉成员' : '绘制组内视觉成员',
          })
        if (collisionEdits.length > 0)
          dispatchStampGroupEdit({
            placementId: stampGroupEditPlacementId,
            patch: {
              visual: [],
              collision: collisionEdits.map((edit) => ({ ref: edit, value: edit.value })),
            },
            label: collisionPaint === 'set' ? '标记组内碰撞' : '清除组内碰撞值',
          })
      } else {
        if (tileEdits.length > 0 && liveMap)
          dispatchMapPatch(tileEditsPatch(liveMap, tileEdits), [activeLayerId], '绘制地图瓦片')
        if (collisionEdits.length > 0)
          dispatchMapPatch(
            {
              visual: [],
              collision: collisionEdits.map((edit) => ({ ref: edit, value: edit.value })),
            },
            [activeLayerId],
            collisionPaint === 'set' ? '标记地图碰撞' : '清除地图碰撞',
          )
      }
      setBasePaintTick((tick) => tick + 1)
    }
    panRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // 指针已由浏览器释放。
    }
  }

  const cancelPointerInteraction = (): void => {
    selectionDragRef.current = null
    selectionPreviewRef.current = undefined
    setSelectionPreview(undefined)
    if (paintingRef.current || strokeRef.current.size > 0) {
      paintingRef.current = false
      rectAnchorRef.current = null
      strokeRef.current.clear()
      setBasePaintTick((tick) => tick + 1)
    }
    panRef.current = null
    setPaintTick((tick) => tick + 1)
  }
  cancelPointerInteractionRef.current = cancelPointerInteraction

  useEffect(() => {
    const onBlur = (): void => cancelPointerInteractionRef.current()
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [])

  const onLeave = (): void => {
    coordinateHoverRef.current = null
    setHoverPoint(null)
    if (selectionDragRef.current || transformIntent) return
    if (!hoverRef.current) return
    hoverRef.current = null
    if (activeTool === 'stamp') setStampHoverAnchor(undefined)
    setPaintTick((tick) => tick + 1)
  }

  const createMap = (): void => {
    const identity = nextMapAssetIdentity(mapIndex, 'map')
    const tileset = selectedTilesetId || liveMap?.tilesetRefs[0] || tilesets[0]?.id || 'tileset-001'
    const map = buildBlankProjectMap(DEFAULT_COLS, DEFAULT_ROWS, tileset)
    session.dispatch(new CreateMapAssetCommand({ ...identity, name: '新地图' }, map))
    onSelectMap(identity.id)
    setActiveLayerId('floor')
    setTool('brush')
  }

  const duplicateMap = (): void => {
    if (!selectedAsset || !liveMap) return
    const identity = nextMapAssetIdentity(mapIndex, `${selectedAsset.id}-copy`)
    session.dispatch(
      new DuplicateMapAssetCommand(selectedAsset.id, {
        ...identity,
        name: `${selectedAsset.name} 副本`,
      }),
    )
    onSelectMap(identity.id)
  }

  const renameMap = (): void => {
    if (!selectedAsset) return
    mapNameInputRef.current?.focus()
    mapNameInputRef.current?.select()
  }

  const deleteMap = (): void => {
    if (!selectedAsset) return
    const references = mapAssetSceneReferences(scenes, selectedAsset.id)
    if (references.length) return
    if (pendingDeleteId !== selectedAsset.id) {
      setPendingDeleteId(selectedAsset.id)
      return
    }
    const index = mapIndex.maps.findIndex((asset) => asset.id === selectedAsset.id)
    const nextId = mapIndex.maps[index + 1]?.id ?? mapIndex.maps[index - 1]?.id
    session.dispatch(new DeleteMapAssetCommand(selectedAsset.id))
    dispatchWorkspace({ type: 'remove-map', mapId: selectedAsset.id })
    setPendingDeleteId(undefined)
    onSelectMap(nextId)
  }

  const addLayer = (): void => {
    if (!liveMap) return
    const id = nextProjectMapLayerId(liveMap)
    const layer = buildProjectMapLayer(liveMap, id, `图层 ${liveMap.layers.length + 1}`)
    session.dispatch(new AddProjectMapLayerCommand(mapId, layer))
    setActiveLayerId(id)
  }

  const closeStampStructureDialog = (returnFocus = true): void => {
    setStampStructureIntent(undefined)
    if (!returnFocus) return
    const target = stampStructureReturnFocusRef.current
    stampStructureReturnFocusRef.current = null
    window.setTimeout(() => target?.focus({ preventScroll: true }), 0)
  }

  const stampStructureCommand = (
    operation: StampStructureOperation,
    options: StampStructureResolutionOptions,
  ) => {
    switch (operation.kind) {
      case 'remove-layer':
        return new RemoveProjectMapLayerCommand(mapId, operation.layerId, options)
      case 'resize':
        return new ResizeProjectMapCommand(mapId, operation.width, operation.height, options)
    }
  }

  const finishStampStructureOperation = (
    operation: StampStructureOperation,
    beforeMap: ProjectMap,
  ): void => {
    setCandidateMenu(undefined)
    if (operation.kind !== 'remove-layer') return
    const removedIndex = beforeMap.layers.findIndex((layer) => layer.id === operation.layerId)
    const nextMap = session.getState().maps[mapId]
    if (!nextMap || nextMap.layers.some((layer) => layer.id === activeLayerId)) return
    const nextIndex = Math.max(0, Math.min(removedIndex - 1, nextMap.layers.length - 1))
    setActiveLayerId(nextMap.layers[nextIndex]?.id ?? '')
  }

  const requestStampStructureOperation = (
    operation: StampStructureOperation,
    returnFocus: HTMLElement,
  ): void => {
    const currentMap = session.getState().maps[mapId]
    if (!currentMap) return
    const revision = session.getMapRevision(mapId)
    const impact = inspectStampStructureImpact(currentMap, operation)
    if (impact.placementIds.length > 0) {
      stampStructureReturnFocusRef.current = returnFocus
      setStampStructureIntent({
        operation,
        mapRevision: revision,
        map: currentMap,
        placementIds: impact.placementIds,
      })
      return
    }
    try {
      const changed = session.dispatchAtMapRevision(
        mapId,
        revision,
        stampStructureCommand(operation, { expectedMap: currentMap }),
      )
      if (changed) finishStampStructureOperation(operation, currentMap)
    } catch (error) {
      notifyWorkspace('error', error instanceof Error ? error.message : String(error))
    }
  }

  const confirmStampStructureOperation = (resolution: 'ungroup' | 'delete-groups'): void => {
    const intent = stampStructureIntent
    const currentMap = session.getState().maps[mapId]
    if (!intent || !currentMap) return
    const revision = session.getMapRevision(mapId)
    if (revision !== intent.mapRevision || currentMap !== intent.map) {
      const impact = inspectStampStructureImpact(currentMap, intent.operation)
      if (impact.placementIds.length === 0) closeStampStructureDialog()
      else
        setStampStructureIntent({
          ...intent,
          mapRevision: revision,
          map: currentMap,
          placementIds: impact.placementIds,
        })
      notifyWorkspace('error', '地图已变化，影响清单已刷新；请重新确认，本次未执行。')
      return
    }
    try {
      const changed = session.dispatchAtMapRevision(
        mapId,
        intent.mapRevision,
        stampStructureCommand(intent.operation, {
          resolution,
          permission: {
            hiddenLayerIds: workspaceMap.hiddenLayerIds,
            lockedLayerIds: workspaceMap.lockedLayerIds,
          },
          expectedMap: intent.map,
        }),
      )
      if (changed) {
        finishStampStructureOperation(intent.operation, intent.map)
        notifyWorkspace(
          'info',
          `${resolution === 'ungroup' ? '已解组' : '已删除'} ${intent.placementIds.length} 个受影响组合并完成结构操作；可一步撤销。`,
        )
      }
      closeStampStructureDialog()
    } catch (error) {
      notifyWorkspace('error', error instanceof Error ? error.message : String(error))
    }
  }

  const removeLayer = (): void => {
    if (!liveMap || !activeLayer || liveMap.layers.length <= 1) return
    if (activeLayerReadOnly) {
      explainReadOnlySelection()
      return
    }
    requestStampStructureOperation(
      { kind: 'remove-layer', layerId: activeLayer.id },
      document.activeElement instanceof HTMLElement ? document.activeElement : canvasRef.current!,
    )
  }

  const moveLayer = (offset: -1 | 1): void => {
    if (!liveMap || !activeLayer) return
    if (activeLayerReadOnly) {
      explainReadOnlySelection()
      return
    }
    const index = liveMap.layers.findIndex((layer) => layer.id === activeLayer.id)
    session.dispatch(new MoveProjectMapLayerCommand(mapId, activeLayer.id, index + offset))
  }

  const toggleLayerVisible = (layerId: string): void => {
    setCandidateMenu(undefined)
    dispatchWorkspace({ type: 'toggle-hidden-layer', mapId, layerId })
  }

  const toggleLayerLocked = (layerId: string): void => {
    setCandidateMenu(undefined)
    dispatchWorkspace({ type: 'toggle-locked-layer', mapId, layerId })
  }

  const loaded = status === 'ready' ? loadedRef.current : null
  const normalizedQuery = mapQuery.trim().toLocaleLowerCase()
  const filteredAssets = mapIndex.maps.filter(
    (asset) =>
      !normalizedQuery ||
      asset.id.toLocaleLowerCase().includes(normalizedQuery) ||
      asset.name.toLocaleLowerCase().includes(normalizedQuery),
  )

  useEffect(() => {
    void selectedMapId
    void normalizedQuery
    selectedMapRowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedMapId, normalizedQuery])

  const selectedReferences = selectedAsset ? mapAssetSceneReferences(scenes, selectedAsset.id) : []
  const selectCandidate = (row: MapCandidate): void => {
    if (stampGroupEditPlacementId) {
      closeCandidateMenu()
      notifyWorkspace('error', '组内编辑已隔离；请先按 Esc 退出，再选择其他地图内容。')
      return
    }
    if (row.kind === 'stamp-placement') {
      const placement = liveMap
        ? buildStampPlacementIndex(liveMap).byId.get(row.placementId)
        : undefined
      if (!placement) {
        closeCandidateMenu()
        notifyWorkspace('error', '放置组已被删除，请重新选择。')
        return
      }
      if (row.layerId && liveMap?.layers.some((layer) => layer.id === row.layerId))
        setActiveLayerId(row.layerId)
      dispatchWorkspace({
        type: 'set-selection',
        mapId,
        selection: { kind: 'stamp-placements', placementIds: [row.placementId] },
      })
      closeCandidateMenu()
      notifyWorkspace(
        'info',
        `已确认完整放置组“${placement.sourceStampName ?? placement.id}” (${placement.id})${row.locked ? '；命中成员所在层已锁定，当前只读。' : '。'}`,
      )
      return
    }
    const candidate = row.candidate
    const currentLayer = liveMap?.layers.find((layer) => layer.id === candidate.ref.layerId)
    if (!currentLayer) {
      closeCandidateMenu()
      notifyWorkspace('error', '候选所属图层已被删除，请重新选择。')
      return
    }
    if (hiddenLayerIds.has(currentLayer.id) || lockedLayerIds.has(currentLayer.id)) {
      closeCandidateMenu()
      notifyWorkspace(
        'error',
        `图层 "${currentLayer.name}" 当前已${hiddenLayerIds.has(currentLayer.id) ? '隐藏' : '锁定'}，不能选中写入。`,
      )
      return
    }
    setActiveLayerId(candidate.ref.layerId)
    dispatchWorkspace({
      type: 'set-selection',
      mapId,
      selection: {
        kind: 'cells',
        visualSlots: [candidate.ref],
        gridPoints: [{ row: candidate.ref.row, col: candidate.ref.col }],
        hitScope: workspaceMap.hitScope,
      },
    })
    closeCandidateMenu()
    notifyWorkspace(
      'info',
      `已确认 ${currentLayer.name} · r${candidate.ref.row}:c${candidate.ref.col}${candidate.tileId === null ? ' · 空槽' : ` · tile #${candidate.tileId} · H${candidate.height}`}`,
    )
  }

  const onCandidateMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeCandidateMenu()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    const options = [
      ...(candidateMenuRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="option"]:not(:disabled)',
      ) ?? []),
    ]
    if (options.length === 0) return
    const current = options.indexOf(document.activeElement as HTMLButtonElement)
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : event.key === 'ArrowUp'
            ? current < 0
              ? options.length - 1
              : (current - 1 + options.length) % options.length
            : current < 0
              ? 0
              : (current + 1) % options.length
    options[nextIndex]?.focus()
  }

  const openCanvasContextMenu = (clientX?: number, clientY?: number): void => {
    if (transformIntent) return
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const requestedX = clientX === undefined ? rect.width / 2 : clientX - rect.left
    const requestedY = clientY === undefined ? rect.height / 2 : clientY - rect.top
    setCandidateMenu(undefined)
    setCanvasContextMenu({
      x: Math.max(8, Math.min(rect.width - 212, requestedX)),
      y: Math.max(8, Math.min(rect.height - 292, requestedY)),
    })
  }

  const onCanvasContextMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setCanvasContextMenu(undefined)
      canvasRef.current?.focus({ preventScroll: true })
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const items = [
      ...(canvasContextMenuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role^="menuitem"]:not(:disabled)',
      ) ?? []),
    ]
    if (!items.length) return
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowUp'
            ? current < 0
              ? items.length - 1
              : (current - 1 + items.length) % items.length
            : current < 0
              ? 0
              : (current + 1) % items.length
    items[nextIndex]?.focus()
  }

  const onCanvasKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>): void => {
    const command = event.metaKey || event.ctrlKey
    if (
      !transformIntent &&
      (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
    ) {
      event.preventDefault()
      event.stopPropagation()
      openCanvasContextMenu()
      return
    }
    if (!command && !event.altKey && event.key.toLowerCase() === 'v' && !transformIntent) {
      event.preventDefault()
      event.stopPropagation()
      activateMapTool('select')
      notifyWorkspace('info', '已切换到地图内容选择工具。')
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (activeTool === 'stamp') cancelStampTool()
      else if (selectionDragRef.current || selectionPreview) cancelPointerInteraction()
      else if (transformIntent) cancelTransform()
      else if (canvasContextMenu) setCanvasContextMenu(undefined)
      else if (candidateMenu) setCandidateMenu(undefined)
      else if (stampGroupEditPlacementId) exitStampGroupEdit()
      else dispatchWorkspace({ type: 'clear-selection', mapId })
      return
    }
    if (activeTool === 'stamp' && event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      commitStamp()
      return
    }
    if (transformIntent) {
      if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        requestTransformDrop()
        return
      }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault()
        event.stopPropagation()
        if (event.key === 'ArrowLeft') adjustTransform('left')
        else if (event.key === 'ArrowRight') adjustTransform('right')
        else if (event.key === 'ArrowUp') adjustTransform('up')
        else if (event.key === 'ArrowDown') adjustTransform('down')
        return
      }
      if (
        (command && ['a', 'c', 'x', 'v'].includes(event.key.toLowerCase())) ||
        event.key === 'Delete' ||
        event.key === 'Backspace'
      ) {
        event.preventDefault()
        event.stopPropagation()
        notifyWorkspace('error', '请先提交或取消当前变换预览。')
        return
      }
    }
    if (stampGroupEditPlacementId && command && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      event.stopPropagation()
      if (!liveMap) return
      const next = stampPlacementAllMemberSelection(
        stampPlacementIndex?.byId.get(stampGroupEditPlacementId),
      )
      dispatchWorkspace({ type: 'set-stamp-group-selection', mapId, selection: next })
      notifyWorkspace(
        'info',
        next.kind === 'cells'
          ? `已全选当前放置组：${next.visualSlots.length} 个视觉成员、${next.gridPoints.length} 个碰撞成员。`
          : '当前放置组没有可选成员。',
      )
      return
    }
    if (
      stampGroupEditPlacementId &&
      ((command && ['c', 'x', 'v'].includes(event.key.toLowerCase())) ||
        event.key === 'Delete' ||
        event.key === 'Backspace')
    ) {
      event.preventDefault()
      event.stopPropagation()
      notifyWorkspace('error', '当前正在组内编辑；请先按 Esc 退出，再使用普通选区或变换命令。')
      return
    }
    if (
      event.key === 'Enter' &&
      selection.kind === 'stamp-placements' &&
      !stampGroupEditPlacementId
    ) {
      event.preventDefault()
      event.stopPropagation()
      if (selection.placementIds.length === 1) enterStampGroupEdit(selection.placementIds[0]!)
      else notifyWorkspace('error', '多组选区不能同时进入组内；请先只保留一个放置组。')
      return
    }
    if (command && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      event.stopPropagation()
      if (!liveMap) return
      const next = selectAllMapContent(liveMap, {
        activeLayerId,
        hitScope: workspaceMap.hitScope,
        hiddenLayerIds,
        lockedLayerIds,
        excludedVisualSlotKeys: ownedVisualSlotKeys,
        excludedGridPointKeys: ownedGridPointKeys,
      })
      dispatchWorkspace({ type: 'set-selection', mapId, selection: next })
      notifyWorkspace(
        'info',
        next.kind === 'cells'
          ? `已全选当前作用域：${next.visualSlots.length} 个非空视觉槽、${next.gridPoints.length} 个非零碰撞格。`
          : '当前作用域没有可全选内容。',
      )
      return
    }
    if (command && event.key.toLowerCase() === 'c') {
      event.preventDefault()
      event.stopPropagation()
      copyMapSelection()
      return
    }
    if (command && event.key.toLowerCase() === 'x') {
      event.preventDefault()
      event.stopPropagation()
      cutMapSelection()
      return
    }
    if (command && event.key.toLowerCase() === 'v') {
      event.preventDefault()
      event.stopPropagation()
      beginPaste()
      return
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selection.kind !== 'none') {
      event.preventDefault()
      event.stopPropagation()
      deleteMapSelection()
      return
    }
  }

  const cursor =
    activeTool === 'pan'
      ? 'grab'
      : transformIntent
        ? 'copy'
        : activeTool === 'stamp'
          ? 'copy'
          : activeTool === 'select'
            ? 'default'
            : 'crosshair'
  const activeLayerName = activeLayer?.name ?? '未选图层'
  const toolbarHint = !liveMap
    ? '地图载入中'
    : activeTool === 'pan'
      ? `${activeLayerName} · 平移`
      : activeTool === 'stamp'
        ? activeStamp
          ? stampMappings.length < activeStamp.layers.length
            ? `${activeStamp.name} · 当前层上方还缺 ${activeStamp.layers.length - stampMappings.length} 个可用图层`
            : stampPlan?.issues.length
              ? `${activeStamp.name} · ${stampPlan.issues[0]?.message ?? '当前位置不可放置'}`
              : stampPlan?.conflicts.length
                ? `${activeStamp.name} · 将覆盖 ${stampPlan.conflicts.length} 处普通内容 · 点击放置到 ${activeLayerName}`
                : `${activeStamp.name} · 锚点跟随鼠标 · 点击放置到 ${activeLayerName}${activeStamp.layers.length > 1 ? ' 起的图层栈' : ''}`
          : '请先从绘制面板选择组合'
        : activeLayerReadOnly
          ? `${activeLayerName} · ${activeLayerHidden ? '已隐藏' : '已锁定'} · 只读`
          : activeTool === 'select'
            ? `${activeLayerName} · ${workspaceMap.hitScope === 'active-layer' ? '活动层选择' : '跨层选择'} · Shift 追加 / Ctrl⌘ 切换追加或移除 / Alt 候选`
            : activeTool === 'eyedropper'
              ? `${activeLayerName} · 取样瓦片与实例高度`
              : activeTool === 'collision'
                ? `${collisionPaint === 'set' ? '标记' : '清除'}碰撞`
                : `${activeLayerName} · 高度 ${activePaintHeight} · ${activeTool === 'fill' ? '填充' : activeTool === 'rect' ? '矩形' : activeTool === 'erase' ? '擦除' : '笔刷'}`

  return (
    <>
      <div className="outliner map-outliner">
        {navigation}
        <DsCatalogControls
          title="地图"
          count={mapIndex.maps.length}
          unit="张"
          actions={[{ id: 'create-map', label: '新建地图', icon: 'add', onClick: createMap }]}
          overflowActions={[
            {
              id: 'duplicate-map',
              label: '复制地图',
              disabled: !selectedAsset || !liveMap,
              onClick: duplicateMap,
            },
            {
              id: 'rename-map',
              label: '重命名地图',
              disabled: !selectedAsset,
              onClick: renameMap,
            },
            {
              id: 'delete-map',
              label: pendingDeleteId === selectedAsset?.id ? '确认删除地图' : '删除地图',
              title:
                selectedReferences.length > 0
                  ? `仍被 ${selectedReferences.length} 个场景使用，不能删除`
                  : pendingDeleteId === selectedAsset?.id
                    ? '再次点击确认删除'
                    : '删除地图',
              danger: true,
              disabled: !selectedAsset || !liveMap || selectedReferences.length > 0,
              onClick: deleteMap,
            },
          ]}
          search={{
            value: mapQuery,
            onChange: (event) => setMapQuery(event.target.value),
            placeholder: '搜索名称或 ID',
            'aria-label': '搜索地图',
          }}
        />
        <div className="map-asset-list">
          {filteredAssets.map((asset) => {
            const references = mapAssetSceneReferences(scenes, asset.id)
            return (
              <DsCatalogRow
                key={asset.id}
                ref={asset.id === selectedAsset?.id ? selectedMapRowRef : undefined}
                title={asset.name}
                meta={`${asset.id} · ${references.length} 处使用`}
                selected={asset.id === selectedAsset?.id}
                onClick={() => onSelectMap(asset.id)}
              />
            )
          })}
          {filteredAssets.length === 0 ? (
            <div className="map-list-empty">
              {mapIndex.maps.length === 0 ? '还没有工程地图' : '没有匹配地图'}
            </div>
          ) : null}
        </div>
        {liveMap ? (
          <LayerStackControls
            items={[...liveMap.layers].reverse().map((layer) => {
              const index = liveMap.layers.findIndex((candidate) => candidate.id === layer.id)
              return {
                id: layer.id,
                name: layer.name,
                hidden: hiddenLayerIds.has(layer.id),
                locked: lockedLayerIds.has(layer.id),
                canMoveUp: index < liveMap.layers.length - 1,
                canMoveDown: index > 0,
              }
            })}
            activeId={activeLayerId}
            onSelect={setActiveLayerId}
            onAdd={addLayer}
            onDelete={removeLayer}
            onToggleVisible={toggleLayerVisible}
            onToggleLocked={toggleLayerLocked}
            onMove={(_id, direction) => moveLayer(direction === 'up' ? 1 : -1)}
            deleteDisabled={liveMap.layers.length <= 1 || activeLayerReadOnly}
            footer={
              activeLayer ? (
                <LayerPaintContext
                  layerName={activeLayer.name}
                  focusEnabled={focusEnabled}
                  viewHeight={activeViewHeight}
                  maxViewHeight={maxMapHeight}
                  rangeId="map-view-height"
                  onToggleFocus={() => setFocusEnabled((enabled) => !enabled)}
                  onViewHeightChange={setViewHeight}
                />
              ) : undefined
            }
          />
        ) : (
          <p className="hint2 map-readonly-hint">正在载入可编辑地图…</p>
        )}
      </div>

      <IsometricEditorSurface
        className="center map-center"
        viewportRef={wrapRef}
        toolbar={
          <IsometricEditorToolbar
            activeTool={activeTool === 'stamp' ? undefined : activeTool}
            onToolChange={activateMapTool}
            disabledTools={{
              select: !liveMap,
              eyedropper: !liveMap || activeLayerReadOnly,
              brush: !liveMap || activeLayerReadOnly,
              rect: !liveMap || activeLayerReadOnly,
              fill: !liveMap || activeLayerReadOnly,
              erase: !liveMap || activeLayerReadOnly,
              collision: !liveMap || activeLayerReadOnly,
            }}
            selectionOptions={
              <>
                <DsCheckbox
                  size="compact"
                  label="跨层"
                  title="下一次点击/框选作用于所有可见且未锁图层；已有选区保持不变"
                  checked={workspaceMap.hitScope === 'visible-unlocked-layers'}
                  onChange={(event) => {
                    dispatchWorkspace({
                      type: 'set-hit-scope',
                      mapId,
                      hitScope: event.target.checked ? 'visible-unlocked-layers' : 'active-layer',
                    })
                    notifyWorkspace(
                      'info',
                      event.target.checked
                        ? '已启用跨层选择；已有选区保持不变。'
                        : '已切回活动层选择；已有选区保持不变。',
                    )
                  }}
                />
                <DsCheckbox
                  size="compact"
                  label="包含碰撞"
                  title={
                    selection.kind === 'stamp-placements'
                      ? '完整组合始终包含碰撞'
                      : '复制、剪切、移动、重复和删除同时作用于碰撞层'
                  }
                  checked={transformIncludesCollision}
                  disabled={selection.kind === 'stamp-placements' || Boolean(transformIntent)}
                  onChange={(event) => setIncludeCollision(event.target.checked)}
                />
              </>
            }
            paintTileControl={
              <CurrentPaintTileButton
                tilesetId={selectedTilesetId || undefined}
                tilesetName={tilesets.find(({ id }) => id === selectedTilesetId)?.name}
                tileId={selectedTile}
                frame={selectedTiles.get(selectedTile)}
                palette={loadedAssets?.palette}
                onOpenPicker={openPaintTilePicker}
              />
            }
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            paintHeight={activePaintHeight}
            maxPaintHeight={maxMapHeight}
            paintHeightDisabled={activeLayerReadOnly}
            onPaintHeightChange={setPaintHeight}
            collisionPaint={collisionPaint}
            onCollisionPaintChange={setCollisionPaint}
            showGrid={showGrid}
            onShowGridChange={setShowGrid}
            showCollision={showCollision}
            onShowCollisionChange={setShowCollision}
          />
        }
      >
        {status === 'error' && (
          <div className="boot">
            <div className="err">地图渲染失败: {err}</div>
          </div>
        )}
        <IsometricEditorCanvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={cancelPointerInteraction}
          onLostPointerCapture={() => {
            if (selectionDragRef.current || paintingRef.current || panRef.current)
              cancelPointerInteraction()
          }}
          onPointerLeave={onLeave}
          onClick={() => {
            // Chromium 可在 Alt+pointerdown 后才完成 canvas 的原生焦点默认动作；
            // 候选列表移入右侧后仍需在 click 任务结束后恢复首项焦点。
            if (candidateMenuRef.current) window.setTimeout(focusFirstCandidate, 0)
          }}
          onDoubleClick={(event) => {
            if (activeTool !== 'select' || !liveMap) return
            const { wx, wy } = toWorld(event)
            const hit = directStampHitAt(wx, wy)
            if (stampGroupEditPlacementId) {
              if (hit && hit.placementId !== stampGroupEditPlacementId)
                notifyWorkspace('error', '组内编辑已隔离；请先按 Esc 退出，再选择其他地图内容。')
              return
            }
            if (hit) enterStampGroupEdit(hit.placementId)
          }}
          onKeyDown={onCanvasKeyDown}
          onContextMenu={(event) => {
            event.preventDefault()
            openCanvasContextMenu(event.clientX, event.clientY)
          }}
          label="地图内容编辑画布"
          data-map-canvas="true"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor,
            touchAction: 'none',
          }}
        />
        {canvasContextMenu ? (
          <div
            ref={canvasContextMenuRef}
            className="map-canvas-context-menu"
            role="menu"
            aria-label="地图选区操作"
            style={{ left: canvasContextMenu.x, top: canvasContextMenu.y }}
            onKeyDown={onCanvasContextMenuKeyDown}
          >
            <div className="map-canvas-context-menu__section">选区</div>
            {[
              {
                id: 'copy',
                label: '复制',
                shortcut: '⌘C',
                disabled: selection.kind === 'none' || Boolean(stampGroupEditPlacementId),
                run: () => copyMapSelection(),
              },
              {
                id: 'cut',
                label: '剪切',
                shortcut: '⌘X',
                disabled:
                  selection.kind === 'none' ||
                  (selection.kind === 'cells' &&
                    (activeLayerReadOnly || selectionHasReadOnlyLayer)) ||
                  Boolean(stampGroupEditPlacementId),
                run: cutMapSelection,
              },
              {
                id: 'paste',
                label: '粘贴',
                shortcut: '⌘V',
                disabled:
                  !clipboard ||
                  (clipboard.kind === 'cells' && activeLayerReadOnly) ||
                  Boolean(stampGroupEditPlacementId),
                run: () => beginPaste(),
              },
              {
                id: 'move',
                label: '移动',
                disabled:
                  selection.kind === 'none' ||
                  (selection.kind === 'cells' &&
                    (activeLayerReadOnly || selectionHasReadOnlyLayer)) ||
                  Boolean(stampGroupEditPlacementId),
                run: () => beginMove(),
              },
              {
                id: 'repeat',
                label: '重复',
                disabled:
                  (selection.kind === 'none' && !clipboard) ||
                  ((selection.kind === 'cells' ||
                    (selection.kind === 'none' && clipboard?.kind === 'cells')) &&
                    activeLayerReadOnly) ||
                  (selection.kind === 'cells' && selectionHasReadOnlyLayer) ||
                  Boolean(stampGroupEditPlacementId),
                run: repeatMapSelection,
              },
              {
                id: 'save-as-stamp',
                label: '保存为组合…',
                disabled: !canSaveSelectionAsStamp,
                run: () => setStampDialogOpen(true),
              },
              {
                id: 'delete',
                label: '删除',
                shortcut: 'Delete',
                danger: true,
                disabled:
                  selection.kind === 'none' ||
                  (selection.kind === 'cells' &&
                    (activeLayerReadOnly || selectionHasReadOnlyLayer)) ||
                  Boolean(stampGroupEditPlacementId),
                run: () => deleteMapSelection(),
              },
            ].map((item) => (
              <DsButton
                key={item.id}
                role="menuitem"
                size="compact"
                variant={item.danger ? 'danger' : 'quiet'}
                className={`ds-menu-item${item.danger ? ' map-canvas-context-menu__danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  setCanvasContextMenu(undefined)
                  item.run()
                }}
              >
                <span>{item.label}</span>
                {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
              </DsButton>
            ))}
          </div>
        ) : null}
        <IsometricViewportStatus
          context={toolbarHint}
          zoom={view.zoom}
          pointer={hoverPoint}
          loading={status === 'loading'}
        />
      </IsometricEditorSurface>

      <div ref={inspectorRef} className="inspector inspector--tabbed map-inspector">
        <div className="insp-head">
          <div className="what">地图</div>
          <div className="who">{selectedAsset?.name || mapId || '未选择'}</div>
        </div>
        <DsInspectorTabs
          id="map-inspector"
          label="地图右侧面板"
          activeId={inspectorTab}
          onChange={(id) => activateInspectorTab(id as MapInspectorTab)}
          items={[
            {
              id: 'properties',
              label: '属性',
              panel: (
                <div className="map-inspector-panel map-properties-panel">
                  {candidateMenu ? (
                    <section
                      ref={candidateMenuRef}
                      className="map-candidate-menu"
                      aria-label="重叠地图内容候选"
                      onKeyDown={onCandidateMenuKeyDown}
                    >
                      <div className="map-candidate-title">当前位置候选（面板顺序）</div>
                      <div className="map-candidate-options" role="listbox" aria-label="候选列表">
                        {candidateMenu.candidates.length ? (
                          candidateMenu.candidates.map((row) => {
                            if (row.kind === 'stamp-placement')
                              return (
                                <button
                                  type="button"
                                  key={`stamp:${row.placementId}`}
                                  role="option"
                                  className="stamp-group-candidate"
                                  aria-selected={
                                    selection.kind === 'stamp-placements' &&
                                    selection.placementIds.includes(row.placementId)
                                  }
                                  onClick={() => selectCandidate(row)}
                                >
                                  <span aria-hidden="true">{row.locked ? '🔒' : '◆'}</span>
                                  <span>{row.layerName}</span>
                                  <code title={`${row.sourceName} · ${row.placementId}`}>
                                    {row.sourceName} · {row.placementId} · r{row.ref.row}:c
                                    {row.ref.col}
                                  </code>
                                  <span>整组</span>
                                </button>
                              )
                            const candidate = row.candidate
                            return (
                              <button
                                type="button"
                                key={`cell:${candidate.ref.layerId}:${candidate.ref.row}:${candidate.ref.col}`}
                                role="option"
                                disabled={!candidate.selectable}
                                aria-selected={
                                  selection.kind === 'cells' &&
                                  selection.visualSlots.some(
                                    (ref) =>
                                      ref.layerId === candidate.ref.layerId &&
                                      ref.row === candidate.ref.row &&
                                      ref.col === candidate.ref.col,
                                  )
                                }
                                onClick={() => selectCandidate(row)}
                              >
                                <span aria-hidden="true">{candidate.locked ? '🔒' : '◇'}</span>
                                <span>{candidate.layerName}</span>
                                <code>
                                  r{candidate.ref.row}:c{candidate.ref.col} ·{' '}
                                  {candidate.tileId === null
                                    ? '空槽'
                                    : `#${candidate.tileId} H${candidate.height}`}
                                </code>
                                <span>{candidate.pixelHit ? '像素' : '逻辑格'}</span>
                              </button>
                            )
                          })
                        ) : (
                          <span className="hint2">没有候选</span>
                        )}
                      </div>
                      <button type="button" className="tool" onClick={() => closeCandidateMenu()}>
                        关闭候选
                      </button>
                    </section>
                  ) : null}
                  {transformIntent && transformPlan ? (
                    <fieldset
                      className="map-transform-bar"
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          event.stopPropagation()
                          cancelTransform()
                        } else if (event.key.startsWith('Arrow')) {
                          event.preventDefault()
                          event.stopPropagation()
                          if (event.key === 'ArrowLeft') adjustTransform('left')
                          else if (event.key === 'ArrowRight') adjustTransform('right')
                          else if (event.key === 'ArrowUp') adjustTransform('up')
                          else if (event.key === 'ArrowDown') adjustTransform('down')
                        }
                      }}
                    >
                      <legend>地图变换预览</legend>
                      <strong>{transformIntent.kind === 'paste' ? '粘贴预览' : '移动预览'}</strong>
                      <span>
                        锚点 r{transformIntent.anchor.row}:c{transformIntent.anchor.col}
                        {transformIncludesCollision ? ' · 含碰撞' : ' · 仅视觉'}
                        {transformTargetLocked ? ' · 目标已锁定' : ' · 单击画布放下'}
                        {transformPlan.issues.length
                          ? ` · ${transformPlan.issues[0]?.message}`
                          : transformPermissionMessage
                            ? ` · ${transformPermissionMessage}`
                            : transformPlan.conflicts.length
                              ? ` · ${transformPlan.conflicts.length} 处覆盖冲突`
                              : ' · 可提交'}
                      </span>
                      {transformIntent.kind === 'move' ? (
                        <fieldset className="map-transform-nudge">
                          <legend className="map-a11y-legend">微调移动目标</legend>
                          <button
                            type="button"
                            className="mini"
                            aria-label="沿倾斜地图坐标向上移动（屏幕右上）"
                            title="上：移动到右上相邻菱形格"
                            onClick={() => adjustTransform('up')}
                          >
                            ↗
                          </button>
                          <button
                            type="button"
                            className="mini"
                            aria-label="沿倾斜地图坐标向下移动（屏幕左下）"
                            title="下：移动到左下相邻菱形格"
                            onClick={() => adjustTransform('down')}
                          >
                            ↙
                          </button>
                          <button
                            type="button"
                            className="mini"
                            aria-label="沿倾斜地图坐标向左移动（屏幕左上）"
                            title="左：移动到左上相邻菱形格"
                            onClick={() => adjustTransform('left')}
                          >
                            ↖
                          </button>
                          <button
                            type="button"
                            className="mini"
                            aria-label="沿倾斜地图坐标向右移动（屏幕右下）"
                            title="右：移动到右下相邻菱形格"
                            onClick={() => adjustTransform('right')}
                          >
                            ↘
                          </button>
                        </fieldset>
                      ) : null}
                      <div className="map-transform-actions">
                        <button
                          type="button"
                          className="tool"
                          disabled={
                            transformPlan.issues.length > 0 || Boolean(transformPermissionMessage)
                          }
                          onClick={() => requestTransformDrop()}
                        >
                          确认位置
                        </button>
                        <button type="button" className="tool" onClick={cancelTransform}>
                          取消
                        </button>
                      </div>
                    </fieldset>
                  ) : null}
                  {selection.kind === 'cells' && liveMap ? (
                    <MapSelectionInspector
                      key={mapId}
                      map={liveMap}
                      selection={selection}
                      activeLayerId={activeLayerId}
                      hiddenLayerIds={hiddenLayerIds}
                      lockedLayerIds={lockedLayerIds}
                      tilesets={loaded?.tilesets}
                      palette={loaded?.palette}
                      editingBlockedReason={
                        transformIntent
                          ? '正在预览地图变换；请先提交或取消后再修改选区。'
                          : undefined
                      }
                      notice={workspaceNotice}
                      onPatch={(patch, requiredLayerIds, label) => {
                        dispatchMapPatch(patch, requiredLayerIds, label)
                      }}
                      onValidationError={(message) => notifyWorkspace('error', message)}
                      onMoveToLayer={moveSelectionToLayer}
                      onClearSelection={() => dispatchWorkspace({ type: 'clear-selection', mapId })}
                    />
                  ) : selection.kind === 'stamp-placements' && liveMap ? (
                    <StampPlacementSelectionInspector
                      map={liveMap}
                      placementIds={selection.placementIds}
                      activeLayerId={activeLayerId}
                      hiddenLayerIds={hiddenLayerIds}
                      lockedLayerIds={lockedLayerIds}
                      tilesets={loaded?.tilesets}
                      palette={loaded?.palette}
                      editingPlacementId={stampGroupEditPlacementId}
                      editingSelection={stampGroupEditSelection}
                      editingBlockedReason={
                        transformIntent
                          ? '正在预览组合变换；请先提交或取消后再编辑或解组。'
                          : undefined
                      }
                      notice={workspaceNotice}
                      onEnterEdit={enterStampGroupEdit}
                      onExitEdit={exitStampGroupEdit}
                      onUngroup={ungroupStampPlacements}
                      onOpenSource={onOpenStampLibrary}
                      onEdit={(input) => {
                        dispatchStampGroupEdit(input)
                        canvasRef.current?.focus({ preventScroll: true })
                      }}
                      onValidationError={(message) => notifyWorkspace('error', message)}
                    />
                  ) : (
                    <div className="section map-properties-section" data-ds-density="compact">
                      <DsInspectorSection title="地图">
                        {selectedAsset ? (
                          <DsPropertyGrid>
                            <DsPropertyRow label="名称" labelFor="map-properties-name">
                              <input
                                id="map-properties-name"
                                ref={mapNameInputRef}
                                key={`${selectedAsset?.id}:${selectedAsset?.name}`}
                                className="in"
                                aria-label="地图名称"
                                defaultValue={selectedAsset?.name ?? ''}
                                onBlur={(event) => {
                                  const name = event.target.value.trim()
                                  if (selectedAsset && name && name !== selectedAsset.name)
                                    session.dispatch(
                                      new RenameMapAssetCommand(selectedAsset.id, name),
                                    )
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') event.currentTarget.blur()
                                }}
                              />
                            </DsPropertyRow>
                            <DsPropertyRow label="ID">
                              <span className="mono map-file">{selectedAsset?.id ?? mapId}</span>
                            </DsPropertyRow>
                            <DsPropertyRow label="尺寸">
                              {/* 左上锚定裁剪/扩展;失焦或回车提交,一次 = 一步撤销(缩图裁掉的内容 undo 可回) */}
                              <span className="size-edit">
                                <input
                                  key={`w:${liveMap?.width}`}
                                  className="in mono"
                                  type="number"
                                  aria-label="地图宽度"
                                  min={1}
                                  max={256}
                                  defaultValue={liveMap?.width ?? 0}
                                  disabled={mapHasReadOnlyLayer}
                                  title={
                                    mapHasReadOnlyLayer
                                      ? '地图含隐藏或锁定层，不能调整尺寸'
                                      : '宽(格);1-256,左上锚定'
                                  }
                                  onBlur={(event) => {
                                    const w = Math.max(
                                      1,
                                      Math.min(256, Math.floor(event.target.valueAsNumber)),
                                    )
                                    if (liveMap && Number.isFinite(w) && w !== liveMap.width)
                                      requestStampStructureOperation(
                                        { kind: 'resize', width: w, height: liveMap.height },
                                        event.currentTarget,
                                      )
                                    if (liveMap) event.currentTarget.value = String(liveMap.width)
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') event.currentTarget.blur()
                                  }}
                                />
                                ×
                                <input
                                  key={`h:${liveMap?.height}`}
                                  className="in mono"
                                  type="number"
                                  aria-label="地图高度"
                                  min={1}
                                  max={256}
                                  defaultValue={liveMap?.height ?? 0}
                                  disabled={mapHasReadOnlyLayer}
                                  title={
                                    mapHasReadOnlyLayer
                                      ? '地图含隐藏或锁定层，不能调整尺寸'
                                      : '高(格);1-256,左上锚定'
                                  }
                                  onBlur={(event) => {
                                    const h = Math.max(
                                      1,
                                      Math.min(256, Math.floor(event.target.valueAsNumber)),
                                    )
                                    if (liveMap && Number.isFinite(h) && h !== liveMap.height)
                                      requestStampStructureOperation(
                                        { kind: 'resize', width: liveMap.width, height: h },
                                        event.currentTarget,
                                      )
                                    if (liveMap) event.currentTarget.value = String(liveMap.height)
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') event.currentTarget.blur()
                                  }}
                                />
                              </span>
                            </DsPropertyRow>
                            <DsPropertyRow label="图层">
                              <span className="mono">{liveMap?.layers.length ?? 0}</span>
                            </DsPropertyRow>
                            <DsPropertyRow label="文件">
                              <span className="mono map-file">
                                {selectedAsset?.path ?? '(索引缺失)'}
                              </span>
                            </DsPropertyRow>
                          </DsPropertyGrid>
                        ) : (
                          <>
                            <p className="hint2">当前场景引用的地图没有索引条目。</p>
                            <button type="button" className="tool" onClick={createMap}>
                              ＋ 新建地图
                            </button>
                          </>
                        )}
                      </DsInspectorSection>
                      {selectedAsset && activeLayer ? (
                        <DsInspectorSection title="选中图层">
                          <DsPropertyGrid>
                            <DsPropertyRow label="名称" labelFor="map-active-layer-name">
                              <input
                                id="map-active-layer-name"
                                key={`${activeLayer.id}:${activeLayer.name}`}
                                className="in"
                                aria-label="图层名称"
                                defaultValue={activeLayer.name}
                                disabled={activeLayerReadOnly}
                                onBlur={(event) => {
                                  const name = event.target.value.trim()
                                  if (name && name !== activeLayer.name)
                                    session.dispatch(
                                      new UpdateProjectMapLayerCommand(mapId, activeLayer.id, {
                                        name,
                                      }),
                                    )
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') event.currentTarget.blur()
                                }}
                              />
                            </DsPropertyRow>
                            <DsPropertyRow label="ID">
                              <span className="mono">{activeLayer.id}</span>
                            </DsPropertyRow>
                          </DsPropertyGrid>
                        </DsInspectorSection>
                      ) : null}
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'draw',
              label: '绘制',
              panel: (
                <div className="map-inspector-panel map-draw-panel">
                  <section className="map-draw-section map-draw-tiles-section">
                    <div className="pane-h map-draw-section__head map-tiles-head">
                      <span className="t">瓦片</span>
                      {liveMap && loaded ? (
                        <span className="hint2">
                          #{selectedTile} · H{activePaintHeight} · {selectedTiles.size} 块
                        </span>
                      ) : null}
                    </div>
                    {inspectorTab === 'draw' && liveMap && loaded ? (
                      <TilePalettePicker
                        tilesetAriaLabel="绘制瓦片集"
                        tilesetOptions={tilesets.map(({ id, name, category }) => ({
                          value: id,
                          label: `${name}（${category}）`,
                        }))}
                        selectedTilesetId={selectedTilesetId}
                        onSelectTileset={setSelectedTilesetId}
                        ariaLabel="瓦片列表"
                        entries={[...selectedTiles.entries()].sort((a, b) => a[0] - b[0])}
                        palette={loaded.palette}
                        selectedTileId={selectedTile}
                        onPick={(id) => {
                          setSelectedTile(id)
                          activateMapTool('brush')
                          canvasRef.current?.focus({ preventScroll: true })
                        }}
                      />
                    ) : (
                      <p className="hint2 map-panel-empty">正在载入瓦片…</p>
                    )}
                  </section>
                  <section className="map-draw-section map-draw-combinations-section">
                    <div className="pane-h map-draw-section__head">
                      <span className="t">组合</span>
                      <span className="hint2">{stamps.length} 项</span>
                    </div>
                    <div className="map-draw-combination-body">
                      {drawPanelVisited && liveMap ? (
                        <div className="map-combination-browser">
                          <MapStampPalette
                            stamps={stamps}
                            tilesets={tilesets}
                            assetCatalog={assetCatalog}
                            assetReader={assetReader}
                            assetBase={assetBase}
                            activeStampId={activeStampId}
                            recentStampIds={recentStampIds}
                            onPick={pickStamp}
                            onOpenLibrary={onOpenStampLibrary ? openActiveStampLibrary : undefined}
                          />
                        </div>
                      ) : (
                        <p className="hint2 map-panel-empty">正在载入组合库…</p>
                      )}
                    </div>
                  </section>
                </div>
              ),
            },
            {
              id: 'references',
              label: '引用',
              count: selectedAsset ? selectedReferences.length : undefined,
              panel: (
                <div className="map-inspector-panel map-references-panel">
                  <section className="section" data-ds-density="compact">
                    <h4>使用场景</h4>
                    {selectedAsset ? (
                      <DsReferencePanel
                        state={selectedReferences.length ? 'ready' : 'empty'}
                        count={{ kind: 'exact', value: selectedReferences.length }}
                        impact={{
                          kind: 'blocking',
                          description: selectedReferences.length
                            ? '这些场景绑定了当前地图；先处理绑定关系再移除地图。'
                            : '尚未绑定场景，地图保存并重开后仍会保留。',
                        }}
                      >
                        {selectedReferences.length ? (
                          <DsReferenceList>
                            {selectedReferences.map((sceneId) => (
                              <DsReferenceRow
                                key={sceneId}
                                title={`场景 ${sceneId}`}
                                detail="使用当前地图"
                                action={{
                                  label: '打开 ↗',
                                  ariaLabel: `打开场景 ${sceneId}`,
                                  onActivate: () => onOpenScene(sceneId),
                                }}
                              />
                            ))}
                          </DsReferenceList>
                        ) : null}
                      </DsReferencePanel>
                    ) : (
                      <p className="hint2">选择一张地图查看引用。</p>
                    )}
                  </section>
                </div>
              ),
            },
          ]}
        />
      </div>
      {stampDialogOpen && selection.kind === 'cells' && liveMap ? (
        <StampTemplateDialog
          map={liveMap}
          selection={selection}
          stamps={stamps}
          session={session}
          onClose={() => setStampDialogOpen(false)}
          onSaved={(id, mode) => {
            notifyWorkspace(
              'info',
              mode === 'create' ? `已创建组合 “${id}”。` : `已用当前选区更新组合 “${id}”。`,
            )
          }}
        />
      ) : null}
      {transformOverwriteIntent ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="stamp-lifecycle-dialog map-transform-conflict-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="map-transform-conflict-title"
            aria-describedby="map-transform-conflict-description"
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return
              event.preventDefault()
              event.stopPropagation()
              returnToTransformAdjustment()
            }}
          >
            <h2 id="map-transform-conflict-title">目标位置已有地图内容</h2>
            <p id="map-transform-conflict-description">
              目标位置有 {transformPlan?.conflicts.length ?? 0} 处内容冲突。覆盖后，现有内容将被
              {transformOverwriteIntent.kind === 'move' ? '移动内容' : '粘贴内容'}
              替换；本次操作仍可一步撤销。
            </p>
            <div className="stamp-lifecycle-actions">
              <button
                ref={transformConflictAdjustRef}
                type="button"
                onClick={returnToTransformAdjustment}
              >
                返回调整
              </button>
              <button type="button" className="danger" onClick={confirmTransformOverwrite}>
                {transformOverwriteIntent.kind === 'move' ? '覆盖并移动' : '覆盖并粘贴'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {stampStructureIntent ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="stamp-lifecycle-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stamp-lifecycle-title"
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return
              event.preventDefault()
              closeStampStructureDialog()
            }}
          >
            <h2 id="stamp-lifecycle-title">结构操作会影响已放置组合</h2>
            <p>
              当前操作会破坏 {stampStructureIntent.placementIds.length} 个放置组合的完整性。
              可以先解组并保留普通地图内容，或删除这些整组内容后继续。
            </p>
            <ul className="stamp-lifecycle-list">
              {projectMapStampPlacements(stampStructureIntent.map)
                .filter((placement) => stampStructureIntent.placementIds.includes(placement.id))
                .map((placement) => (
                  <li key={placement.id}>
                    <strong>{placement.sourceStampName ?? '未命名组合'}</strong>
                    <span className="mono">{placement.id}</span>
                  </li>
                ))}
            </ul>
            <div className="stamp-lifecycle-actions">
              <button
                ref={stampStructureCancelRef}
                type="button"
                onClick={() => closeStampStructureDialog()}
              >
                取消
              </button>
              <button type="button" onClick={() => confirmStampStructureOperation('ungroup')}>
                先解组 {stampStructureIntent.placementIds.length} 个组合并继续
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => confirmStampStructureOperation('delete-groups')}
              >
                删除 {stampStructureIntent.placementIds.length} 个组合并继续
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
