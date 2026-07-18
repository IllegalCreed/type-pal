/** 地图模式：ProjectMapV2 的 N 视觉层、实例高度与独立碰撞层编辑器。 */
import type { MapIndexV1, SceneDef } from '@type-pal/content'
import { mapInstanceHeight, nextMapAssetIdentity } from '@type-pal/content'
import type {
  AssetBase,
  LatticePos,
  Palette,
  ProjectMapCollisionEdit,
  ProjectMapTileEdit,
  ProjectMapV2,
} from '@type-pal/reforge'
import {
  bakeFrame,
  buildBlankProjectMap,
  buildProjectMapLayer,
  floodFillProjectMapTiles,
  isLatticeInside,
  latticeCenter,
  latticeInMapRect,
  nextProjectMapLayerId,
  paintProjectMapCollision,
  paintProjectMapTiles,
  pixelToLattice,
  renderSceneFrame,
} from '@type-pal/reforge'
import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  AddProjectMapLayerCommand,
  ApplyProjectMapPatchCommand,
  CreateMapAssetCommand,
  DeleteMapAssetCommand,
  DuplicateMapAssetCommand,
  MoveProjectMapLayerCommand,
  mapAssetSceneReferences,
  PaintCollisionCommand,
  PaintTilesCommand,
  RemoveProjectMapLayerCommand,
  RenameMapAssetCommand,
  ResizeProjectMapCommand,
  SetProjectMapTilesetCommand,
  UpdateProjectMapLayerCommand,
} from '../core/commands.js'
import type { EditorState, EditSession } from '../core/edit-session.js'
import type { ProjectMapPatch } from '../core/map-patch.js'
import { ProjectMapPatchError } from '../core/map-patch.js'
import {
  changeMapSelection,
  createMapWorkspaceState,
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
  selectionModeFromModifiers,
} from '../core/map-selection.js'
import {
  captureMapClipboard,
  type MapCellClipboard,
  type MapLayerMapping,
  type MapTransformConflictPolicy,
  type MapTransformPlan,
  planMapDelete,
  planMapMove,
  planMapPaste,
} from '../core/map-transform.js'
import { MapSelectionInspector } from './MapSelectionInspector.js'
import { drawMapSelectionOverlay } from './map-selection-overlay.js'
import {
  drawGridBlocked,
  mapBoxOf,
  type StageAssets,
  useSceneAssets,
  useStageSize,
  useViewZoomPan,
} from './scene-stage.js'

const DEFAULT_COLS = 24
const DEFAULT_ROWS = 24

function visibleMapRoom(
  map: ProjectMapV2,
  tiles: StageAssets['tiles'],
  canvas: HTMLCanvasElement,
  view: { zoom: number; panX: number; panY: number },
): { col: number; row: number; cols: number; rows: number } {
  let maxTileWidth = 32
  let maxTileHeight = 16
  for (const frame of tiles.values()) {
    maxTileWidth = Math.max(maxTileWidth, frame.width)
    maxTileHeight = Math.max(maxTileHeight, frame.height)
  }
  const worldWidth = canvas.width / view.zoom
  const worldHeight = canvas.height / view.zoom
  const firstCol = Math.max(0, Math.floor((view.panX - maxTileWidth - 16) / 32))
  const lastCol = Math.min(map.width, Math.ceil((view.panX + worldWidth + maxTileWidth + 16) / 32))
  const firstRow = Math.max(0, Math.floor((view.panY - maxTileHeight - 8) / 16))
  const lastRow = Math.min(
    map.height,
    Math.ceil((view.panY + worldHeight + maxTileHeight + 8) / 16),
  )
  return {
    col: firstCol,
    row: firstRow,
    cols: Math.max(0, lastCol - firstCol),
    rows: Math.max(0, lastRow - firstRow),
  }
}

type MapTool = 'pan' | 'select' | 'eyedropper' | 'brush' | 'rect' | 'fill' | 'erase' | 'collision'
type CollisionPaint = 'set' | 'clear'
type StrokeEdit =
  | { kind: 'tile'; edit: ProjectMapTileEdit }
  | { kind: 'collision'; edit: ProjectMapCollisionEdit }

type MapTransformIntent =
  | {
      kind: 'paste'
      clipboard: MapCellClipboard
      anchor: LatticePos
      layerMappings: readonly MapLayerMapping[]
    }
  | {
      kind: 'move'
      selection: MapSelection
      anchor: LatticePos
      includeCollision: boolean
      layerMappings: readonly MapLayerMapping[]
    }

interface MapCandidateMenu {
  x: number
  y: number
  candidates: MapHitCandidate[]
}

const TileThumb = memo(function TileThumb(props: {
  idx: number
  frame: Parameters<typeof bakeFrame>[0]
  palette: Palette
  selected: boolean
  onPick: (idx: number) => void
}) {
  const { idx, frame, palette, selected, onPick } = props
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bakeFrame(frame, palette), 0, 0)
  }, [frame, palette])
  return (
    <button
      type="button"
      className={`tile-thumb${selected ? ' sel' : ''}`}
      title={`瓦片 #${idx}`}
      onClick={() => onPick(idx)}
    >
      <canvas ref={ref} width={frame.width} height={frame.height} />
    </button>
  )
})

export function MapMode(props: {
  scene: SceneDef
  scenes: SceneDef[]
  session: EditSession
  assetBase: AssetBase
  projectMaps: EditorState['maps']
  mapIndex: MapIndexV1
  selectedMapId?: string
  onSelectMap: (id: string | undefined) => void
  onOpenScene: (id: string) => void
  /** tileset 注册表(W7B:绑定下拉 + ProjectMapV2.tilesetId 解析)。 */
  tilesets: readonly import('@type-pal/reforge').TilesetDef[]
  /** 上传未保存的 tileset 字节(内存优先)。 */
  tilesetBlobs: Record<string, ArrayBuffer>
  navigation?: React.ReactNode
  onWorkspaceNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
  const {
    scene,
    scenes,
    session,
    assetBase,
    projectMaps,
    mapIndex,
    selectedMapId,
    onSelectMap,
    onOpenScene,
    tilesets,
    tilesetBlobs,
    navigation,
    onWorkspaceNotice,
  } = props
  const mapId =
    (selectedMapId && mapIndex.maps.some((asset) => asset.id === selectedMapId)
      ? selectedMapId
      : scene.mapId) ?? ''
  const selectedAsset = mapIndex.maps.find((asset) => asset.id === mapId)
  const liveMap: ProjectMapV2 | undefined = projectMaps[mapId]
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const size = useStageSize(wrapRef, 120)
  const { view, viewRef, setView } = useViewZoomPan({
    canvasRef,
    initial: { zoom: 1, panX: 0, panY: 0 },
  })
  const [showGrid, setShowGrid] = useState(true)
  const [showCollision, setShowCollision] = useState(true)
  const [tool, setTool] = useState<MapTool>('pan')
  const [collisionPaint, setCollisionPaint] = useState<CollisionPaint>('set')
  const [selectedTile, setSelectedTile] = useState(0)
  const [currentHeight, setCurrentHeight] = useState(0)
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
  const [selectionPreview, setSelectionPreview] = useState<MapSelection>()
  const selectionPreviewRef = useRef<MapSelection | undefined>(undefined)
  const [includeCollision, setIncludeCollision] = useState(false)
  const [clipboard, setClipboard] = useState<MapCellClipboard>()
  const [transformIntent, setTransformIntent] = useState<MapTransformIntent>()
  const [candidateMenu, setCandidateMenu] = useState<MapCandidateMenu>()
  const candidateMenuRef = useRef<HTMLDivElement>(null)
  const [workspaceNotice, setWorkspaceNotice] = useState<
    { kind: 'info' | 'error'; message: string } | undefined
  >()
  const mapNameInputRef = useRef<HTMLInputElement>(null)
  const selectedMapRowRef = useRef<HTMLButtonElement>(null)
  const strokeRef = useRef<Map<string, StrokeEdit>>(new Map())
  const hoverRef = useRef<LatticePos | null>(null)
  const panRef = useRef<{ sx: number; sy: number; panX: number; panY: number } | null>(null)
  const paintingRef = useRef(false)
  const rectAnchorRef = useRef<{ wx: number; wy: number } | null>(null)
  const cancelPointerInteractionRef = useRef<() => void>(() => undefined)
  const selectionDragRef = useRef<{
    pointerId: number
    startClient: { x: number; y: number }
    startWorld: { wx: number; wy: number }
    mode: SelectionChangeMode
    base: MapSelection
    dragging: boolean
  } | null>(null)
  const [paintTick, setPaintTick] = useState(0)
  const [basePaintTick, setBasePaintTick] = useState(0)
  const baseCanvasCacheRef = useRef<
    | {
        canvas: HTMLCanvasElement
        map: ProjectMapV2
        liveMap: ProjectMapV2 | undefined
        width: number
        height: number
        zoom: number
        panX: number
        panY: number
        showGrid: boolean
        showCollision: boolean
        hiddenKey: string
        focusEnabled: boolean
        activeLayerId: string | undefined
        currentHeight: number
        basePaintTick: number
        renderer: StageAssets['renderer']
        tiles: StageAssets['tiles']
      }
    | undefined
  >(undefined)
  const selectionCanvasCacheRef = useRef<
    | {
        canvas: HTMLCanvasElement
        map: ProjectMapV2
        tiles: StageAssets['tiles']
        selection: MapSelection
        selectionPreview: MapSelection | undefined
        transformPlan: MapTransformPlan | undefined
        width: number
        height: number
        zoom: number
        panX: number
        panY: number
        basePaintTick: number
      }
    | undefined
  >(undefined)
  const { status, err, loadedRef } = useSceneAssets({
    canvasRef,
    assetBase,
    mapId,
    spriteNums: [],
    projectMaps,
    mapIndex,
    tilesets,
    tilesetBlobs,
  })
  const activeTool: MapTool = liveMap ? tool : 'pan'
  const activeLayer = liveMap?.layers.find((layer) => layer.id === activeLayerId)
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

  const maxMapHeight = useMemo(() => {
    if (!liveMap) return 15
    let max = 0
    for (const layer of liveMap.layers)
      for (const row of layer.heights ?? []) for (const height of row) max = Math.max(max, height)
    return Math.max(15, max + 1, currentHeight)
  }, [liveMap, currentHeight])

  const activeLayerIndex = liveMap?.layers.findIndex((layer) => layer.id === activeLayerId) ?? -1

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
    if (activeLayer?.depthMode === 'flat') setCurrentHeight(0)
  }, [activeLayer?.depthMode])

  useEffect(() => {
    void mapId
    setPendingDeleteId(undefined)
    setWorkspaceNotice(undefined)
    setSelectionPreview(undefined)
    selectionPreviewRef.current = undefined
    setCandidateMenu(undefined)
    setTransformIntent(undefined)
    strokeRef.current.clear()
    hoverRef.current = null
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
    ): MapTransformPlan | undefined => {
      if (!liveMap) return undefined
      if (intent.kind === 'paste')
        return planMapPaste(liveMap, intent.clipboard, intent.anchor, {
          layerMappings: intent.layerMappings,
          conflictPolicy,
          collisionAuthorityLayerId: activeLayerId,
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
    [liveMap, activeLayerId, mapId],
  )

  const transformPlan = useMemo(
    () => (transformIntent ? planTransform(transformIntent, 'reject') : undefined),
    [transformIntent, planTransform],
  )
  const transformIncludesCollision = transformIntent
    ? transformIntent.kind === 'paste'
      ? transformIntent.clipboard.collision.kind === 'included'
      : transformIntent.includeCollision
    : includeCollision
  const transformPermissionMessage = useMemo(() => {
    if (!transformPlan) return undefined
    if (activeLayerHidden) return '当前活动层已隐藏，不能提交变换。'
    if (activeLayerLocked) return '当前活动层已锁定，不能提交变换。'
    const hidden = transformPlan.requiredWritableLayerIds.find((id) => hiddenLayerIds.has(id))
    if (hidden) return `变换涉及隐藏图层 "${hidden}"，不能提交。`
    const locked = transformPlan.requiredWritableLayerIds.find((id) => lockedLayerIds.has(id))
    if (locked) return `变换涉及锁定图层 "${locked}"，不能提交。`
    return undefined
  }, [transformPlan, activeLayerHidden, activeLayerLocked, hiddenLayerIds, lockedLayerIds])

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
    const room = visibleMapRoom(map, loaded.tiles, ctx.canvas, view)
    const hiddenKey = JSON.stringify([...hiddenLayerIds].sort())
    const cached = baseCanvasCacheRef.current
    const baseChanged =
      !cached ||
      cached.liveMap !== liveMap ||
      cached.width !== ctx.canvas.width ||
      cached.height !== ctx.canvas.height ||
      cached.zoom !== zoom ||
      cached.panX !== panX ||
      cached.panY !== panY ||
      cached.showGrid !== showGrid ||
      cached.showCollision !== showCollision ||
      cached.hiddenKey !== hiddenKey ||
      cached.focusEnabled !== focusEnabled ||
      cached.activeLayerId !== activeLayer?.id ||
      cached.currentHeight !== currentHeight ||
      cached.basePaintTick !== basePaintTick ||
      cached.renderer !== loaded.renderer ||
      cached.tiles !== loaded.tiles
    if (baseChanged) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      renderSceneFrame(ctx, loaded.renderer, {
        map,
        room,
        camera: { x: panX, y: panY },
        sprites: [],
        worldScale: zoom,
        layers: {
          hiddenLayerIds: [...hiddenLayerIds],
          ...(focusEnabled && activeLayer
            ? { focusLayerId: activeLayer.id, focusHeight: currentHeight, dimAlpha: 0.22 }
            : { showAll: true }),
        },
      })
      drawGridBlocked(
        ctx,
        map,
        room,
        { zoom, panX, panY },
        { grid: showGrid, blocked: showCollision },
      )
      const cacheCanvas = cached?.canvas ?? document.createElement('canvas')
      cacheCanvas.width = ctx.canvas.width
      cacheCanvas.height = ctx.canvas.height
      const cacheContext = cacheCanvas.getContext('2d')
      cacheContext?.drawImage(ctx.canvas, 0, 0)
      baseCanvasCacheRef.current = {
        canvas: cacheCanvas,
        map,
        liveMap,
        width: ctx.canvas.width,
        height: ctx.canvas.height,
        zoom,
        panX,
        panY,
        showGrid,
        showCollision,
        hiddenKey,
        focusEnabled,
        activeLayerId: activeLayer?.id,
        currentHeight,
        basePaintTick,
        renderer: loaded.renderer,
        tiles: loaded.tiles,
      }
    } else {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      ctx.drawImage(cached.canvas, 0, 0)
    }

    const selectionCached = selectionCanvasCacheRef.current
    const selectionOverlayChanged =
      !selectionCached ||
      selectionCached.map !== map ||
      selectionCached.tiles !== loaded.tiles ||
      selectionCached.selection !== selection ||
      selectionCached.selectionPreview !== selectionPreview ||
      selectionCached.transformPlan !== transformPlan ||
      selectionCached.width !== ctx.canvas.width ||
      selectionCached.height !== ctx.canvas.height ||
      selectionCached.zoom !== zoom ||
      selectionCached.panX !== panX ||
      selectionCached.panY !== panY ||
      selectionCached.basePaintTick !== basePaintTick
    let selectionCanvas = selectionCached?.canvas
    if (selectionOverlayChanged) {
      selectionCanvas ??= document.createElement('canvas')
      selectionCanvas.width = ctx.canvas.width
      selectionCanvas.height = ctx.canvas.height
      const overlayContext = selectionCanvas.getContext('2d')
      if (overlayContext) {
        if (selectionPreview)
          drawMapSelectionOverlay(overlayContext, map, selectionPreview, loaded.tiles, view, {
            tone: 'preview',
            dashed: true,
            showImageBounds: true,
          })
        else
          drawMapSelectionOverlay(overlayContext, map, selection, loaded.tiles, view, {
            showImageBounds: true,
          })
        if (transformPlan) {
          drawMapSelectionOverlay(
            overlayContext,
            map,
            transformPlan.nextSelection,
            loaded.tiles,
            view,
            { tone: 'preview', dashed: true, showImageBounds: true },
          )
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
              map,
              {
                kind: 'cells',
                visualSlots,
                gridPoints,
                hitScope: workspaceMap.hitScope,
              },
              loaded.tiles,
              view,
              { tone: 'conflict', dashed: true },
            )
          }
        }
      }
      selectionCanvasCacheRef.current = {
        canvas: selectionCanvas,
        map,
        tiles: loaded.tiles,
        selection,
        selectionPreview,
        transformPlan,
        width: ctx.canvas.width,
        height: ctx.canvas.height,
        zoom,
        panX,
        panY,
        basePaintTick,
      }
    }
    if (selectionCanvas) ctx.drawImage(selectionCanvas, 0, 0)

    const hover = hoverRef.current
    if (hover && activeTool !== 'pan') {
      const center = latticeCenter(hover)
      const cx = (center.x - panX) * zoom
      const cy = (center.y - panY) * zoom
      ctx.save()
      ctx.strokeStyle =
        activeTool === 'erase' || (activeTool === 'collision' && collisionPaint === 'clear')
          ? 'rgba(255,90,90,0.95)'
          : activeTool === 'collision'
            ? 'rgba(255,70,70,0.95)'
            : 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx, cy - 8 * zoom)
      ctx.lineTo(cx + 16 * zoom, cy)
      ctx.lineTo(cx, cy + 8 * zoom)
      ctx.lineTo(cx - 16 * zoom, cy)
      ctx.closePath()
      ctx.stroke()
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
    focusEnabled,
    activeLayer,
    currentHeight,
    loadedRef,
    selection,
    selectionPreview,
    transformPlan,
    workspaceMap.hitScope,
  ])

  const toWorld = (event: React.PointerEvent<HTMLCanvasElement>): { wx: number; wy: number } => {
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
      return {
        kind: 'collision',
        edit: { ...pos, value: collisionPaint === 'set' ? 1 : 0 },
      }
    }
    if (!activeLayer) return null
    return {
      kind: 'tile',
      edit: {
        ...pos,
        layerId: activeLayer.id,
        tileId: activeTool === 'erase' ? null : selectedTile,
        height: activeTool === 'erase' ? 0 : currentHeight,
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
    const item = editFor(pos)
    if (!item) return
    rememberStroke(item)
    setBasePaintTick((tick) => tick + 1)
    setPaintTick((tick) => tick + 1)
  }

  const rectStrokeTo = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const anchor = rectAnchorRef.current
    if (!anchor || !liveMap) return
    const { wx, wy } = toWorld(event)
    strokeRef.current.clear()
    for (const pos of latticeInMapRect(liveMap, anchor.wx, anchor.wy, wx, wy)) {
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
          const hit = hitTestMapContent(liveMap, loaded.tiles, wx, wy, {
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
    })
  }

  const updateSelectionDrag = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const drag = selectionDragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !liveMap) return
    const currentClient = { x: event.clientX, y: event.clientY }
    if (!drag.dragging && isMapSelectionDrag(drag.startClient, currentClient)) drag.dragging = true
    const input = drag.dragging
      ? selectionForGridPoints(
          liveMap,
          latticeInMapRect(
            liveMap,
            drag.startWorld.wx,
            drag.startWorld.wy,
            toWorld(event).wx,
            toWorld(event).wy,
          ),
          {
            activeLayerId,
            hitScope: workspaceMap.hitScope,
            hiddenLayerIds,
            lockedLayerIds,
          },
        )
      : selectionInputAt(drag.startWorld.wx, drag.startWorld.wy)
    const next = changeMapSelection(drag.base, input, drag.mode)
    selectionPreviewRef.current = next
    setSelectionPreview(next)
    setPaintTick((tick) => tick + 1)
  }

  const notifyWorkspace = (kind: 'info' | 'error', message: string): void => {
    setWorkspaceNotice({ kind, message })
  }

  const activateMapTool = (nextTool: MapTool): void => {
    const cancelledTransform = Boolean(transformIntent)
    setTool(nextTool)
    setTransformIntent(undefined)
    setCandidateMenu(undefined)
    if (cancelledTransform) setWorkspaceNotice({ kind: 'info', message: '已取消地图变换预览。' })
  }

  const closeCandidateMenu = (): void => {
    setCandidateMenu(undefined)
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

  const copyMapSelection = (): MapCellClipboard | undefined => {
    if (!liveMap) return undefined
    const next = captureMapClipboard(mapId, liveMap, selection, includeCollision)
    if (!next) {
      notifyWorkspace('error', '请先选择要复制的地图内容。')
      return undefined
    }
    setClipboard(next)
    notifyWorkspace(
      'info',
      `已复制 ${next.visual.length} 个视觉实例${next.collision.kind === 'included' ? `和 ${next.collision.cells.length} 个碰撞格点` : ''}。`,
    )
    return next
  }

  const deleteMapSelection = (afterDelete?: () => void): void => {
    if (!liveMap) return
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
    if (!liveMap) return
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
    if (!source || !liveMap) {
      notifyWorkspace('error', '地图剪贴板为空。')
      return
    }
    if (activeLayerReadOnly) {
      explainReadOnlySelection()
      return
    }
    const hover = hoverRef.current
    const anchor = hover && isLatticeInside(liveMap, hover) ? hover : source.sourceAnchor
    setTool('select')
    setCandidateMenu(undefined)
    setTransformIntent({ kind: 'paste', clipboard: source, anchor, layerMappings: [] })
    canvasRef.current?.focus({ preventScroll: true })
    notifyWorkspace('info', '粘贴预览：移动鼠标选择锚点，检查冲突后提交。')
  }

  const beginMove = (layerMappings: readonly MapLayerMapping[] = []): void => {
    if (!liveMap || selection.kind !== 'cells') {
      notifyWorkspace('error', '请先选择要移动的地图内容。')
      return
    }
    if (explainReadOnlySelection()) return
    const captured = captureMapClipboard(mapId, liveMap, selection, includeCollision)
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
      includeCollision,
      layerMappings,
    })
    canvasRef.current?.focus({ preventScroll: true })
    notifyWorkspace('info', '移动预览：移动鼠标或方向键改变目标，Enter/提交确认。')
  }

  const commitTransform = (conflictPolicy: MapTransformConflictPolicy): void => {
    if (!transformIntent) return
    const plan = planTransform(transformIntent, conflictPolicy)
    if (!plan) return
    if (transformPermissionMessage) {
      notifyWorkspace('error', transformPermissionMessage)
      return
    }
    if (!plan.canApply) {
      const message =
        plan.issues[0]?.message ??
        (plan.conflicts.length
          ? `目标有 ${plan.conflicts.length} 处冲突；请选择覆盖或取消。`
          : '当前变换不能提交。')
      notifyWorkspace('error', message)
      return
    }
    const channelLabel = transformIncludesCollision ? '含碰撞' : '仅视觉'
    const label =
      transformIntent.kind === 'paste'
        ? `粘贴地图选区（${channelLabel}）`
        : `移动地图选区（${channelLabel}）`
    const result = dispatchMapPatch(plan.patch, plan.requiredWritableLayerIds, label)
    if (result === 'changed') {
      dispatchWorkspace({ type: 'set-selection', mapId, selection: plan.nextSelection })
      setTransformIntent(undefined)
      canvasRef.current?.focus({ preventScroll: true })
    } else if (result === 'unchanged') {
      setTransformIntent(undefined)
      canvasRef.current?.focus({ preventScroll: true })
    }
  }

  const repeatMapSelection = (): void => {
    if (!liveMap) {
      notifyWorkspace('error', '地图尚未载入。')
      return
    }
    if (selection.kind === 'cells' && explainReadOnlySelection()) return
    const source =
      selection.kind === 'cells'
        ? captureMapClipboard(mapId, liveMap, selection, includeCollision)
        : clipboard
    if (!source) {
      notifyWorkspace('error', '当前选区和地图剪贴板都没有可重复内容。')
      return
    }
    setClipboard(source)
    const bounds = mapSelectionBounds(selection)
    const anchor = bounds
      ? { row: bounds.minRow, col: Math.min((liveMap?.width ?? 1) - 1, bounds.maxCol + 1) }
      : { ...source.sourceAnchor, col: source.sourceAnchor.col + 1 }
    setTool('select')
    setTransformIntent({ kind: 'paste', clipboard: source, anchor, layerMappings: [] })
    canvasRef.current?.focus({ preventScroll: true })
    notifyWorkspace('info', '重复预览已建立；确认目标无冲突后提交。')
  }

  const moveSelectionToLayer = (targetLayerId: string): void => {
    if (selection.kind !== 'cells') return
    const sourceLayerIds = [...new Set(selection.visualSlots.map((ref) => ref.layerId))]
    beginMove(sourceLayerIds.map((sourceLayerId) => ({ sourceLayerId, targetLayerId })))
  }

  const adjustTransform = (dRow: number, dCol: number): void => {
    setTransformIntent((current) =>
      current
        ? {
            ...current,
            anchor: {
              row: current.anchor.row + dRow,
              col: current.anchor.col + dCol,
            },
          }
        : current,
    )
  }

  const cancelTransform = (): void => {
    setTransformIntent(undefined)
    canvasRef.current?.focus({ preventScroll: true })
    notifyWorkspace('info', '已取消地图变换预览。')
  }

  const onDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    event.currentTarget.focus()
    if (event.button !== 0 && event.button !== 1) return
    if (transformIntent && event.button === 0 && liveMap) {
      const { wx, wy } = toWorld(event)
      const anchor = pixelToLattice(wx, wy)
      if (isLatticeInside(liveMap, anchor))
        setTransformIntent((current) => (current ? { ...current, anchor } : current))
      return
    }
    if (activeTool === 'select' && event.button === 0 && liveMap) {
      const { wx, wy } = toWorld(event)
      if (event.altKey) {
        const loaded = loadedRef.current
        if (!loaded) return
        const hit = hitTestMapContent(liveMap, loaded.tiles, wx, wy, {
          activeLayerId,
          hiddenLayerIds,
          lockedLayerIds,
        })
        const rect = event.currentTarget.getBoundingClientRect()
        const rawX = event.clientX - rect.left
        const rawY = event.clientY - rect.top
        const menuWidth = Math.min(390, Math.max(0, rect.width - 24))
        const menuHeight = Math.min(360, Math.max(0, rect.height - 24))
        setCandidateMenu({
          x: Math.max(4, Math.min(rawX, rect.width - menuWidth - 12)),
          y: Math.max(4, Math.min(rawY, rect.height - menuHeight - 12)),
          candidates: hit.candidates,
        })
        notifyWorkspace(
          'info',
          hit.candidates.length
            ? `当前位置有 ${hit.candidates.length} 个候选；请选择明确目标。`
            : '当前位置没有可选候选。',
        )
        return
      }
      setCandidateMenu(undefined)
      event.currentTarget.setPointerCapture(event.pointerId)
      selectionDragRef.current = {
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
        setSelectedTile(tileId)
        setCurrentHeight(mapInstanceHeight(activeLayer, pos.row, pos.col))
        setTool('brush')
        return
      }
      if (activeTool === 'fill') {
        if (!activeLayer) return
        const { wx, wy } = toWorld(event)
        const start = pixelToLattice(wx, wy)
        const edits = floodFillProjectMapTiles(
          liveMap,
          activeLayer.id,
          start,
          selectedTile,
          currentHeight,
        )
        if (edits.length > 0) session.dispatch(new PaintTilesCommand(mapId, edits))
        return
      }
      paintingRef.current = true
      if (activeTool === 'rect') {
        rectAnchorRef.current = toWorld(event)
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
    if (selectionDragRef.current) {
      if (selectionDragRef.current.pointerId !== event.pointerId) return
      updateSelectionDrag(event)
      return
    }
    if (transformIntent && liveMap) {
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
      dispatchWorkspace({ type: 'set-selection', mapId, selection: next })
      selectionDragRef.current = null
      selectionPreviewRef.current = undefined
      setSelectionPreview(undefined)
      notifyWorkspace(
        'info',
        next.kind === 'cells'
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
      if (tileEdits.length > 0) session.dispatch(new PaintTilesCommand(mapId, tileEdits))
      if (collisionEdits.length > 0)
        session.dispatch(new PaintCollisionCommand(mapId, collisionEdits))
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
    if (selectionDragRef.current || transformIntent) return
    if (!hoverRef.current) return
    hoverRef.current = null
    setPaintTick((tick) => tick + 1)
  }

  const createMap = (): void => {
    const identity = nextMapAssetIdentity(mapIndex, 'map')
    const tileset = liveMap?.tilesetId ?? tilesets[0]?.id ?? 'tileset-001'
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

  const removeLayer = (): void => {
    if (!liveMap || !activeLayer || liveMap.layers.length <= 1) return
    if (activeLayerReadOnly) {
      explainReadOnlySelection()
      return
    }
    const index = liveMap.layers.findIndex((layer) => layer.id === activeLayer.id)
    const next = liveMap.layers[index - 1] ?? liveMap.layers[index + 1]
    session.dispatch(new RemoveProjectMapLayerCommand(mapId, activeLayer.id))
    setCandidateMenu(undefined)
    setActiveLayerId(next?.id ?? '')
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
  const selectCandidate = (candidate: MapHitCandidate): void => {
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

  const onCanvasKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>): void => {
    const command = event.metaKey || event.ctrlKey
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
      if (selectionDragRef.current || selectionPreview) cancelPointerInteraction()
      else if (transformIntent) setTransformIntent(undefined)
      else if (candidateMenu) setCandidateMenu(undefined)
      else dispatchWorkspace({ type: 'clear-selection', mapId })
      return
    }
    if (transformIntent) {
      if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        commitTransform('reject')
        return
      }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault()
        event.stopPropagation()
        if (event.key === 'ArrowLeft') adjustTransform(0, -1)
        else if (event.key === 'ArrowRight') adjustTransform(0, 1)
        else if (event.key === 'ArrowUp') adjustTransform(-2, 0)
        else if (event.key === 'ArrowDown') adjustTransform(2, 0)
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
    if (command && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      event.stopPropagation()
      if (!liveMap) return
      const next = selectAllMapContent(liveMap, {
        activeLayerId,
        hitScope: workspaceMap.hitScope,
        hiddenLayerIds,
        lockedLayerIds,
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
    if ((event.key === 'Delete' || event.key === 'Backspace') && selection.kind === 'cells') {
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
        : activeTool === 'select'
          ? 'default'
          : 'crosshair'
  const activeLayerName = activeLayer?.name ?? '未选图层'
  const toolbarHint = !liveMap
    ? '地图载入中'
    : activeTool === 'pan'
      ? `${activeLayerName} · 平移`
      : activeLayerReadOnly
        ? `${activeLayerName} · ${activeLayerHidden ? '已隐藏' : '已锁定'} · 只读`
        : activeTool === 'select'
          ? `${activeLayerName} · ${workspaceMap.hitScope === 'active-layer' ? '活动层选择' : '跨层选择'} · Shift 增选 / Ctrl⌘ 减选 / Alt 候选`
          : activeTool === 'eyedropper'
            ? `${activeLayerName} · 取样瓦片与实例高度`
            : activeTool === 'collision'
              ? `${collisionPaint === 'set' ? '标记' : '清除'}碰撞`
              : `${activeLayerName} · 高度 ${currentHeight} · ${activeTool === 'fill' ? '填充' : activeTool === 'rect' ? '矩形' : activeTool === 'erase' ? '擦除' : '笔刷'}`

  return (
    <>
      <div className="outliner map-outliner">
        {navigation}
        <div className="pane-h map-assets-head">
          <span className="t">地图</span>
          <span className="spacer" />
          <button type="button" className="mini" onClick={createMap} title="新建地图">
            ＋
          </button>
          <button
            type="button"
            className="mini"
            onClick={duplicateMap}
            disabled={!selectedAsset || !liveMap}
            title="复制地图"
          >
            ⧉
          </button>
          <button
            type="button"
            className="mini"
            onClick={renameMap}
            disabled={!selectedAsset}
            title="重命名地图"
          >
            ✎
          </button>
          <button
            type="button"
            className="mini danger"
            onClick={deleteMap}
            disabled={!selectedAsset || !liveMap || selectedReferences.length > 0}
            title={
              selectedReferences.length > 0
                ? `仍被 ${selectedReferences.length} 个场景使用，不能删除`
                : pendingDeleteId === selectedAsset?.id
                  ? '再次点击确认删除'
                  : '删除地图'
            }
          >
            {pendingDeleteId === selectedAsset?.id ? '✓' : '−'}
          </button>
        </div>
        <input
          className="in map-search"
          value={mapQuery}
          onChange={(event) => setMapQuery(event.target.value)}
          placeholder="搜索名称或 ID"
          aria-label="搜索地图"
        />
        <div className="map-asset-list">
          {filteredAssets.map((asset) => {
            const references = mapAssetSceneReferences(scenes, asset.id)
            return (
              <button
                type="button"
                key={asset.id}
                ref={asset.id === selectedAsset?.id ? selectedMapRowRef : undefined}
                className={`map-asset-row${asset.id === selectedAsset?.id ? ' sel' : ''}`}
                onClick={() => onSelectMap(asset.id)}
                title={`${asset.name} (${asset.id})`}
              >
                <span className="map-asset-name">{asset.name}</span>
                <span className="map-asset-id">{asset.id}</span>
                <span className="map-asset-uses">{references.length}</span>
              </button>
            )
          })}
          {filteredAssets.length === 0 ? (
            <div className="map-list-empty">
              {mapIndex.maps.length === 0 ? '还没有工程地图' : '没有匹配地图'}
            </div>
          ) : null}
        </div>
        <div className="pane-h">
          <span className="t">图层</span>
          <span className="spacer" />
          {liveMap ? (
            <>
              <button type="button" className="mini" onClick={addLayer} title="新增图层">
                ＋
              </button>
              <button
                type="button"
                className="mini"
                onClick={removeLayer}
                disabled={liveMap.layers.length <= 1 || activeLayerReadOnly}
                title="删除选中图层"
              >
                −
              </button>
            </>
          ) : null}
        </div>
        {liveMap ? (
          <div className="map-layer-list">
            {[...liveMap.layers].reverse().map((layer) => {
              const index = liveMap.layers.findIndex((candidate) => candidate.id === layer.id)
              return (
                <div
                  key={layer.id}
                  className={`map-layer-row${layer.id === activeLayerId ? ' sel' : ''}`}
                >
                  <button
                    type="button"
                    className={`layer-eye${hiddenLayerIds.has(layer.id) ? ' off' : ''}`}
                    onClick={() => toggleLayerVisible(layer.id)}
                    title={hiddenLayerIds.has(layer.id) ? '显示图层' : '隐藏图层'}
                    aria-label={hiddenLayerIds.has(layer.id) ? '显示图层' : '隐藏图层'}
                  >
                    👁
                  </button>
                  <button
                    type="button"
                    className={`layer-lock${lockedLayerIds.has(layer.id) ? ' on' : ''}`}
                    onClick={() => toggleLayerLocked(layer.id)}
                    title={lockedLayerIds.has(layer.id) ? '解锁图层' : '锁定图层'}
                    aria-label={lockedLayerIds.has(layer.id) ? '解锁图层' : '锁定图层'}
                    aria-pressed={lockedLayerIds.has(layer.id)}
                  >
                    {lockedLayerIds.has(layer.id) ? '🔒' : '◇'}
                  </button>
                  <button
                    type="button"
                    className="layer-name"
                    onClick={() => setActiveLayerId(layer.id)}
                    title={`${layer.name} (${layer.id})`}
                  >
                    <span>{layer.name}</span>
                    <span className="layer-badge">
                      {layer.depthMode === 'height' ? '高度' : '平面'}
                    </span>
                  </button>
                  {layer.id === activeLayerId ? (
                    <span className="layer-order">
                      <button
                        type="button"
                        className="mini"
                        onClick={() => moveLayer(1)}
                        disabled={activeLayerReadOnly || index === liveMap.layers.length - 1}
                        title="上移图层"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="mini"
                        onClick={() => moveLayer(-1)}
                        disabled={activeLayerReadOnly || index === 0}
                        title="下移图层"
                      >
                        ↓
                      </button>
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="hint2 map-readonly-hint">正在载入可编辑地图…</p>
        )}
        <div className="pane-h map-tiles-head">
          <span className="t">瓦片</span>
          {liveMap && loaded ? (
            <span className="hint2">
              {activeLayerName} #{selectedTile} · H{currentHeight}
            </span>
          ) : null}
        </div>
        {liveMap && loaded ? (
          <div className="tile-grid">
            {[...loaded.tiles.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([idx, frame]) => (
                <TileThumb
                  key={idx}
                  idx={idx}
                  frame={frame}
                  palette={loaded.palette}
                  selected={idx === selectedTile}
                  onPick={(id) => {
                    setSelectedTile(id)
                    activateMapTool('brush')
                  }}
                />
              ))}
          </div>
        ) : null}
      </div>

      <div className="center map-center">
        <div className="toolbar map-toolbar">
          <div className="tool-group">
            <button
              type="button"
              className={`tool${activeTool === 'pan' ? ' active' : ''}`}
              onClick={() => activateMapTool('pan')}
              title="平移画布"
            >
              ✋ 平移
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'select' ? ' active' : ''}`}
              onClick={() => {
                activateMapTool('select')
              }}
              disabled={!liveMap}
              title="选择地图已有内容 (V)；Shift 增选，Ctrl/⌘ 减选，Alt 候选"
              aria-label="选择地图内容"
              aria-pressed={activeTool === 'select'}
            >
              ⛶ 选择
            </button>
          </div>
          <div className="tool-group">
            <label
              className={`vtog${workspaceMap.hitScope === 'visible-unlocked-layers' ? ' on' : ''}`}
              title="开启后，下一次点击/框选作用于所有可见且未锁图层；已有选区保持不变"
            >
              <input
                type="checkbox"
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
              跨层选择
            </label>
            <label
              className={`vtog${transformIncludesCollision ? ' on' : ''}`}
              title="移动、复制、剪切、粘贴、重复、删除时显式包含独立碰撞通道"
            >
              <input
                type="checkbox"
                checked={transformIncludesCollision}
                disabled={Boolean(transformIntent)}
                onChange={(event) => setIncludeCollision(event.target.checked)}
              />
              变换含碰撞
            </label>
          </div>
          <div className="tool-group map-transform-tools">
            <button
              type="button"
              className="tool"
              disabled={selection.kind !== 'cells' || Boolean(transformIntent)}
              onClick={() => copyMapSelection()}
              title="复制选区 (Ctrl/⌘+C)"
            >
              复制
            </button>
            <button
              type="button"
              className="tool"
              disabled={
                selection.kind !== 'cells' ||
                activeLayerReadOnly ||
                selectionHasReadOnlyLayer ||
                Boolean(transformIntent)
              }
              onClick={cutMapSelection}
              title="剪切选区 (Ctrl/⌘+X)"
            >
              剪切
            </button>
            <button
              type="button"
              className="tool"
              disabled={!clipboard || activeLayerReadOnly || Boolean(transformIntent)}
              onClick={() => beginPaste()}
              title="粘贴预览 (Ctrl/⌘+V)"
            >
              粘贴
            </button>
            <button
              type="button"
              className="tool"
              disabled={
                selection.kind !== 'cells' ||
                activeLayerReadOnly ||
                selectionHasReadOnlyLayer ||
                Boolean(transformIntent)
              }
              onClick={() => beginMove()}
              title="移动选区；通过鼠标或方向键定位"
            >
              移动…
            </button>
            <button
              type="button"
              className="tool"
              disabled={
                (selection.kind !== 'cells' && !clipboard) ||
                activeLayerReadOnly ||
                (selection.kind === 'cells' && selectionHasReadOnlyLayer) ||
                Boolean(transformIntent)
              }
              onClick={repeatMapSelection}
              title="重复选区到相邻位置"
            >
              重复
            </button>
            <button
              type="button"
              className="tool danger"
              disabled={
                selection.kind !== 'cells' ||
                activeLayerReadOnly ||
                selectionHasReadOnlyLayer ||
                Boolean(transformIntent)
              }
              onClick={() => deleteMapSelection()}
              title="删除选区 (Delete)"
            >
              删除
            </button>
          </div>
          <div className="tool-group">
            <button
              type="button"
              className={`tool${activeTool === 'eyedropper' ? ' active' : ''}`}
              onClick={() => activateMapTool('eyedropper')}
              disabled={!liveMap || activeLayerReadOnly}
              title="从当前图层取样瓦片与实例高度"
            >
              ◉ 取样
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'brush' ? ' active' : ''}`}
              onClick={() => activateMapTool('brush')}
              disabled={!liveMap || activeLayerReadOnly}
              title="画选中瓦片"
            >
              🖌 笔刷
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'rect' ? ' active' : ''}`}
              onClick={() => activateMapTool('rect')}
              disabled={!liveMap || activeLayerReadOnly}
              title="矩形铺瓦"
            >
              ▭ 矩形
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'fill' ? ' active' : ''}`}
              onClick={() => activateMapTool('fill')}
              disabled={!liveMap || activeLayerReadOnly}
              title="填充连通区域"
            >
              🪣 填充
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'erase' ? ' active' : ''}`}
              onClick={() => activateMapTool('erase')}
              disabled={!liveMap || activeLayerReadOnly}
              title="擦除瓦片"
            >
              ⌫ 擦除
            </button>
          </div>
          <div className="tool-group">
            <button
              type="button"
              className={`tool${activeTool === 'collision' ? ' active' : ''}`}
              onClick={() => activateMapTool('collision')}
              disabled={!liveMap || activeLayerReadOnly}
              title="绘制独立碰撞层"
            >
              ⛔ 碰撞
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'collision' && collisionPaint === 'set' ? ' active' : ''}`}
              onClick={() => {
                setCollisionPaint('set')
                activateMapTool('collision')
              }}
              disabled={!liveMap || activeLayerReadOnly}
              title="标记阻挡"
            >
              标记
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'collision' && collisionPaint === 'clear' ? ' active' : ''}`}
              onClick={() => {
                setCollisionPaint('clear')
                activateMapTool('collision')
              }}
              disabled={!liveMap || activeLayerReadOnly}
              title="清除阻挡"
            >
              清除
            </button>
          </div>
          <div className="tool-group">
            <label className={`vtog${showGrid ? ' on' : ''}`}>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(event) => setShowGrid(event.target.checked)}
              />{' '}
              网格
            </label>
            <label className={`vtog${showCollision ? ' on' : ''}`}>
              <input
                type="checkbox"
                checked={showCollision}
                onChange={(event) => setShowCollision(event.target.checked)}
              />{' '}
              碰撞
            </label>
          </div>
          <span className="spacer" />
          <span className="map-toolbar-hint">{toolbarHint}</span>
        </div>
        <div className="viewport" ref={wrapRef}>
          <div className="canvas-note">
            {Math.round(view.zoom * 100)}%{status === 'loading' ? ' · 载入中…' : ''}
          </div>
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
                  if (event.key === 'ArrowLeft') adjustTransform(0, -1)
                  else if (event.key === 'ArrowRight') adjustTransform(0, 1)
                  else if (event.key === 'ArrowUp') adjustTransform(-2, 0)
                  else if (event.key === 'ArrowDown') adjustTransform(2, 0)
                }
              }}
            >
              <legend className="map-a11y-legend">地图变换预览</legend>
              <strong>{transformIntent.kind === 'paste' ? '粘贴预览' : '移动预览'}</strong>
              <span role="status" aria-live="polite">
                锚点 r{transformIntent.anchor.row}:c{transformIntent.anchor.col}
                {transformIncludesCollision ? ' · 含碰撞' : ' · 仅视觉'}
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
                  <button type="button" className="mini" onClick={() => adjustTransform(-2, 0)}>
                    ↑
                  </button>
                  <button type="button" className="mini" onClick={() => adjustTransform(2, 0)}>
                    ↓
                  </button>
                  <button type="button" className="mini" onClick={() => adjustTransform(0, -1)}>
                    ←
                  </button>
                  <button type="button" className="mini" onClick={() => adjustTransform(0, 1)}>
                    →
                  </button>
                </fieldset>
              ) : null}
              <button
                type="button"
                className="tool"
                disabled={
                  transformPlan.issues.length > 0 ||
                  transformPlan.conflicts.length > 0 ||
                  Boolean(transformPermissionMessage)
                }
                onClick={() => commitTransform('reject')}
              >
                提交
              </button>
              {transformPlan.conflicts.length > 0 &&
              transformPlan.issues.length === 0 &&
              !transformPermissionMessage ? (
                <button
                  type="button"
                  className="tool danger"
                  onClick={() => commitTransform('overwrite')}
                >
                  覆盖并提交
                </button>
              ) : null}
              <button type="button" className="tool" onClick={cancelTransform}>
                取消
              </button>
            </fieldset>
          ) : null}
          {liveMap && activeLayer ? (
            <fieldset className="map-focus-nav" aria-label="地图图层与高度导航">
              <button
                type="button"
                className={`map-focus-toggle${focusEnabled ? ' active' : ''}`}
                onClick={() => setFocusEnabled((enabled) => !enabled)}
                title={focusEnabled ? '关闭聚焦，全部正常显示' : '开启聚焦，其他瓦片变暗'}
                aria-label={focusEnabled ? '关闭聚焦' : '开启聚焦'}
              >
                ◉
              </button>
              <label className="map-focus-axis">
                <span>层</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, liveMap.layers.length - 1)}
                  step={1}
                  value={Math.max(0, activeLayerIndex)}
                  onChange={(event) => {
                    const layer = liveMap.layers[Number(event.target.value)]
                    if (layer) setActiveLayerId(layer.id)
                  }}
                  onWheel={(event) => {
                    event.preventDefault()
                    const nextIndex = Math.max(
                      0,
                      Math.min(
                        liveMap.layers.length - 1,
                        activeLayerIndex + (event.deltaY < 0 ? 1 : -1),
                      ),
                    )
                    const layer = liveMap.layers[nextIndex]
                    if (layer) setActiveLayerId(layer.id)
                  }}
                  title={`聚焦图层：${activeLayer.name}`}
                />
                <output>{activeLayerIndex + 1}</output>
              </label>
              <label className="map-focus-axis">
                <span>高</span>
                <input
                  type="range"
                  min={0}
                  max={maxMapHeight}
                  step={1}
                  value={currentHeight}
                  disabled={activeLayer.depthMode === 'flat'}
                  onChange={(event) => setCurrentHeight(Number(event.target.value))}
                  onWheel={(event) => {
                    event.preventDefault()
                    if (activeLayer.depthMode === 'flat') return
                    setCurrentHeight((height) =>
                      Math.max(0, Math.min(maxMapHeight, height + (event.deltaY < 0 ? 1 : -1))),
                    )
                  }}
                  title={
                    activeLayer.depthMode === 'flat'
                      ? '平面图层的实例高度固定为 0'
                      : `聚焦并写入实例高度：${currentHeight}`
                  }
                />
                <output>{currentHeight}</output>
              </label>
            </fieldset>
          ) : null}
          {status === 'error' && (
            <div className="boot">
              <div className="err">地图渲染失败: {err}</div>
            </div>
          )}
          <canvas
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
              // Chromium 可在 Alt+pointerdown 后才完成 canvas 的原生焦点默认动作，
              // 覆盖候选菜单 effect 的首项聚焦。click 任务结束后再聚焦一次才是稳定顺序。
              if (candidateMenuRef.current) window.setTimeout(focusFirstCandidate, 0)
            }}
            onKeyDown={onCanvasKeyDown}
            onContextMenu={(event) => event.preventDefault()}
            tabIndex={0}
            aria-label="地图内容编辑画布"
            data-map-canvas="true"
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor,
              touchAction: 'none',
            }}
          />
          {candidateMenu ? (
            <div
              ref={candidateMenuRef}
              className="map-candidate-menu"
              style={{ left: candidateMenu.x, top: candidateMenu.y }}
              role="dialog"
              aria-label="重叠地图内容候选"
              onKeyDown={onCandidateMenuKeyDown}
            >
              <div className="map-candidate-title">当前位置候选（面板顺序）</div>
              <div className="map-candidate-options" role="listbox" aria-label="候选列表">
                {candidateMenu.candidates.length ? (
                  candidateMenu.candidates.map((candidate) => (
                    <button
                      type="button"
                      key={`${candidate.ref.layerId}:${candidate.ref.row}:${candidate.ref.col}`}
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
                      onClick={() => selectCandidate(candidate)}
                    >
                      <span>{candidate.locked ? '🔒' : '◇'}</span>
                      <span>{candidate.layerName}</span>
                      <code>
                        r{candidate.ref.row}:c{candidate.ref.col} ·{' '}
                        {candidate.tileId === null
                          ? '空槽'
                          : `#${candidate.tileId} H${candidate.height}`}
                      </code>
                      <span>{candidate.pixelHit ? '像素' : '逻辑格'}</span>
                    </button>
                  ))
                ) : (
                  <span className="hint2">没有候选</span>
                )}
              </div>
              <button type="button" className="tool" onClick={closeCandidateMenu}>
                关闭
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="inspector">
        {selection.kind === 'cells' && liveMap ? (
          <MapSelectionInspector
            key={mapId}
            map={liveMap}
            selection={selection}
            activeLayerId={activeLayerId}
            hiddenLayerIds={hiddenLayerIds}
            lockedLayerIds={lockedLayerIds}
            editingBlockedReason={
              transformIntent ? '正在预览地图变换；请先提交或取消后再修改选区。' : undefined
            }
            notice={workspaceNotice}
            onPatch={(patch, requiredLayerIds, label) => {
              dispatchMapPatch(patch, requiredLayerIds, label)
            }}
            onValidationError={(message) => notifyWorkspace('error', message)}
            onMoveToLayer={moveSelectionToLayer}
            onClearSelection={() => dispatchWorkspace({ type: 'clear-selection', mapId })}
          />
        ) : selection.kind === 'stamp-placement' ? (
          <div className="insp-empty">图章放置组选区由 W7G 接入；W8 不会猜测或拆散成员。</div>
        ) : (
          <div className="section">
            <h4>地图</h4>
            {selectedAsset ? (
              <>
                <div className="field">
                  <span className="field-label">名称</span>
                  <input
                    ref={mapNameInputRef}
                    key={`${selectedAsset?.id}:${selectedAsset?.name}`}
                    className="in"
                    defaultValue={selectedAsset?.name ?? ''}
                    onBlur={(event) => {
                      const name = event.target.value.trim()
                      if (selectedAsset && name && name !== selectedAsset.name)
                        session.dispatch(new RenameMapAssetCommand(selectedAsset.id, name))
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur()
                    }}
                  />
                </div>
                <div className="field">
                  <span className="field-label">ID</span>
                  <span className="mono map-file">{selectedAsset?.id ?? mapId}</span>
                </div>
                <div className="field">
                  <span className="field-label">尺寸</span>
                  {/* 左上锚定裁剪/扩展;失焦或回车提交,一次 = 一步撤销(缩图裁掉的内容 undo 可回) */}
                  <span className="size-edit">
                    <input
                      key={`w:${liveMap?.width}`}
                      className="in mono"
                      type="number"
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
                        const w = Math.max(1, Math.min(256, Math.floor(event.target.valueAsNumber)))
                        if (liveMap && Number.isFinite(w) && w !== liveMap.width)
                          session.dispatch(new ResizeProjectMapCommand(mapId, w, liveMap.height))
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
                        const h = Math.max(1, Math.min(256, Math.floor(event.target.valueAsNumber)))
                        if (liveMap && Number.isFinite(h) && h !== liveMap.height)
                          session.dispatch(new ResizeProjectMapCommand(mapId, liveMap.width, h))
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur()
                      }}
                    />
                  </span>
                </div>
                <div className="field">
                  <span className="field-label">图层</span>
                  <span className="mono">{liveMap?.layers.length ?? 0}</span>
                </div>
                <div className="field">
                  <span className="field-label">文件</span>
                  <span className="mono map-file">{selectedAsset?.path ?? '(索引缺失)'}</span>
                </div>
                <div className="field">
                  <span className="field-label">瓦片集</span>
                  <select
                    className="in"
                    title="换本图用的瓦片集(库条目;换绑不重映射瓦片索引)"
                    value={liveMap?.tilesetId ?? ''}
                    disabled={!liveMap}
                    onChange={(e) => {
                      if (e.target.value && liveMap)
                        session.dispatch(new SetProjectMapTilesetCommand(mapId, e.target.value))
                    }}
                  >
                    {liveMap && !tilesets.some((t) => t.id === liveMap.tilesetId) && (
                      <option value={liveMap.tilesetId}>缺失条目({liveMap.tilesetId})</option>
                    )}
                    {tilesets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}({t.category})
                      </option>
                    ))}
                  </select>
                </div>
                {activeLayer ? (
                  <>
                    <h4>选中图层</h4>
                    <div className="field">
                      <span className="field-label">名称</span>
                      <input
                        key={`${activeLayer.id}:${activeLayer.name}`}
                        className="in"
                        defaultValue={activeLayer.name}
                        disabled={activeLayerReadOnly}
                        onBlur={(event) => {
                          const name = event.target.value.trim()
                          if (name && name !== activeLayer.name)
                            session.dispatch(
                              new UpdateProjectMapLayerCommand(mapId, activeLayer.id, { name }),
                            )
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur()
                        }}
                      />
                    </div>
                    <div className="field">
                      <span className="field-label">ID</span>
                      <span className="mono">{activeLayer.id}</span>
                    </div>
                    <div className="field">
                      <span className="field-label">深度</span>
                      <select
                        className="in"
                        value={activeLayer.depthMode}
                        disabled={activeLayerReadOnly}
                        onChange={(event) =>
                          session.dispatch(
                            new UpdateProjectMapLayerCommand(mapId, activeLayer.id, {
                              depthMode: event.target.value as 'flat' | 'height',
                            }),
                          )
                        }
                      >
                        <option
                          value="flat"
                          disabled={
                            activeLayer.heights?.some((row) =>
                              row.some((height) => height !== 0),
                            ) ?? false
                          }
                        >
                          平面
                        </option>
                        <option value="height">按实例高度参与遮挡</option>
                      </select>
                    </div>
                    <div className="field">
                      <span className="field-label">笔刷高度</span>
                      <input
                        className="in mono"
                        type="number"
                        min={0}
                        max={255}
                        value={currentHeight}
                        disabled={activeLayerReadOnly || activeLayer.depthMode === 'flat'}
                        onChange={(event) =>
                          setCurrentHeight(
                            Math.max(0, Math.min(255, Math.floor(event.target.valueAsNumber || 0))),
                          )
                        }
                      />
                    </div>
                  </>
                ) : null}
                <h4>使用场景</h4>
                {selectedReferences.length ? (
                  <div className="map-reference-list">
                    {selectedReferences.map((sceneId) => (
                      <button
                        type="button"
                        key={sceneId}
                        className="linked-value-open map-reference"
                        onClick={() => onOpenScene(sceneId)}
                        title={`打开场景 ${sceneId}`}
                      >
                        <span>{sceneId}</span>
                        <span>↗</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="hint2">尚未绑定场景，保存重开后仍会保留。</p>
                )}
              </>
            ) : (
              <>
                <p className="hint2">当前场景引用的地图没有索引条目。</p>
                <button type="button" className="tool" onClick={createMap}>
                  ＋ 新建地图
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
