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
  latticeInRect,
  nextProjectMapLayerId,
  paintProjectMapCollision,
  paintProjectMapTiles,
  pixelToLattice,
  renderSceneFrame,
} from '@type-pal/reforge'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  AddProjectMapLayerCommand,
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
import {
  drawGridBlocked,
  mapBoxOf,
  useSceneAssets,
  useStageSize,
  useViewZoomPan,
} from './scene-stage.js'

const DEFAULT_COLS = 24
const DEFAULT_ROWS = 24

type MapTool = 'pan' | 'eyedropper' | 'brush' | 'rect' | 'fill' | 'erase' | 'collision'
type CollisionPaint = 'set' | 'clear'
type StrokeEdit =
  | { kind: 'tile'; edit: ProjectMapTileEdit }
  | { kind: 'collision'; edit: ProjectMapCollisionEdit }

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
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Set<string>>(() => new Set())
  const mapNameInputRef = useRef<HTMLInputElement>(null)
  const selectedMapRowRef = useRef<HTMLButtonElement>(null)
  const strokeRef = useRef<Map<string, StrokeEdit>>(new Map())
  const hoverRef = useRef<LatticePos | null>(null)
  const [paintTick, setPaintTick] = useState(0)
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
    setHiddenLayerIds(new Set())
    setPendingDeleteId(undefined)
    strokeRef.current.clear()
  }, [mapId])

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
    const room = { col: 0, row: 0, cols: map.width, rows: map.height }
    const { zoom, panX, panY } = view
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
    activeTool,
    collisionPaint,
    hiddenLayerIds,
    focusEnabled,
    activeLayer,
    currentHeight,
    loadedRef,
  ])

  const panRef = useRef<{ sx: number; sy: number; panX: number; panY: number } | null>(null)
  const paintingRef = useRef(false)
  const rectAnchorRef = useRef<{ wx: number; wy: number } | null>(null)

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
    setPaintTick((tick) => tick + 1)
  }

  const rectStrokeTo = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const anchor = rectAnchorRef.current
    if (!anchor || !liveMap) return
    const { wx, wy } = toWorld(event)
    strokeRef.current.clear()
    for (const pos of latticeInRect(anchor.wx, anchor.wy, wx, wy)) {
      if (!isLatticeInside(liveMap, pos)) continue
      const item = editFor(pos)
      if (item) rememberStroke(item)
    }
    setPaintTick((tick) => tick + 1)
  }

  const onDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId)
    if (activeTool !== 'pan' && event.button === 0 && liveMap) {
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
    const current = viewRef.current
    panRef.current = {
      sx: event.clientX,
      sy: event.clientY,
      panX: current.panX,
      panY: current.panY,
    }
  }

  const onMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
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
    }
    panRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // 指针已由浏览器释放。
    }
  }

  const onLeave = (): void => {
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
    const index = liveMap.layers.findIndex((layer) => layer.id === activeLayer.id)
    const next = liveMap.layers[index - 1] ?? liveMap.layers[index + 1]
    session.dispatch(new RemoveProjectMapLayerCommand(mapId, activeLayer.id))
    setActiveLayerId(next?.id ?? '')
    setHiddenLayerIds((current) => {
      const copy = new Set(current)
      copy.delete(activeLayer.id)
      return copy
    })
  }

  const moveLayer = (offset: -1 | 1): void => {
    if (!liveMap || !activeLayer) return
    const index = liveMap.layers.findIndex((layer) => layer.id === activeLayer.id)
    session.dispatch(new MoveProjectMapLayerCommand(mapId, activeLayer.id, index + offset))
  }

  const toggleLayerVisible = (layerId: string): void => {
    setHiddenLayerIds((current) => {
      const copy = new Set(current)
      if (copy.has(layerId)) copy.delete(layerId)
      else copy.add(layerId)
      return copy
    })
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
  const cursor = activeTool === 'pan' ? 'grab' : 'crosshair'
  const activeLayerName = activeLayer?.name ?? '未选图层'
  const toolbarHint = !liveMap
    ? '地图载入中'
    : activeTool === 'pan'
      ? `${activeLayerName} · 平移`
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
                disabled={liveMap.layers.length <= 1}
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
                        disabled={index === liveMap.layers.length - 1}
                        title="上移图层"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="mini"
                        onClick={() => moveLayer(-1)}
                        disabled={index === 0}
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
                    setTool('brush')
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
              onClick={() => setTool('pan')}
              title="平移画布"
            >
              ✋ 平移
            </button>
          </div>
          <div className="tool-group">
            <button
              type="button"
              className={`tool${activeTool === 'eyedropper' ? ' active' : ''}`}
              onClick={() => setTool('eyedropper')}
              disabled={!liveMap}
              title="从当前图层取样瓦片与实例高度"
            >
              ◉ 取样
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'brush' ? ' active' : ''}`}
              onClick={() => setTool('brush')}
              disabled={!liveMap}
              title="画选中瓦片"
            >
              🖌 笔刷
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'rect' ? ' active' : ''}`}
              onClick={() => setTool('rect')}
              disabled={!liveMap}
              title="矩形铺瓦"
            >
              ▭ 矩形
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'fill' ? ' active' : ''}`}
              onClick={() => setTool('fill')}
              disabled={!liveMap}
              title="填充连通区域"
            >
              🪣 填充
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'erase' ? ' active' : ''}`}
              onClick={() => setTool('erase')}
              disabled={!liveMap}
              title="擦除瓦片"
            >
              ⌫ 擦除
            </button>
          </div>
          <div className="tool-group">
            <button
              type="button"
              className={`tool${activeTool === 'collision' ? ' active' : ''}`}
              onClick={() => setTool('collision')}
              disabled={!liveMap}
              title="绘制独立碰撞层"
            >
              ⛔ 碰撞
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'collision' && collisionPaint === 'set' ? ' active' : ''}`}
              onClick={() => {
                setCollisionPaint('set')
                setTool('collision')
              }}
              disabled={!liveMap}
              title="标记阻挡"
            >
              标记
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'collision' && collisionPaint === 'clear' ? ' active' : ''}`}
              onClick={() => {
                setCollisionPaint('clear')
                setTool('collision')
              }}
              disabled={!liveMap}
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
            onPointerLeave={onLeave}
            onContextMenu={(event) => event.preventDefault()}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor,
              touchAction: 'none',
            }}
          />
        </div>
      </div>

      <div className="inspector">
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
                    title="宽(格);1-256,左上锚定"
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
                    title="高(格);1-256,左上锚定"
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
                          activeLayer.heights?.some((row) => row.some((height) => height !== 0)) ??
                          false
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
                      disabled={activeLayer.depthMode === 'flat'}
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
      </div>
    </>
  )
}
