/** 地图模式(W7D)：OwnMap v1 的 N 视觉层与独立碰撞层编辑器。 */
import type { SceneDef } from '@type-pal/content'
import { isReuseMap, mapRoom, pixelToGrid, reuseMapNum } from '@type-pal/content'
import type {
  AssetBase,
  LatticePos,
  OwnMap,
  OwnMapCollisionEdit,
  OwnMapTileEdit,
  Palette,
} from '@type-pal/reforge'
import {
  bakeFrame,
  buildBlankOwnMap,
  buildOwnMapLayer,
  floodFillOwnMapTiles,
  isLatticeInside,
  latticeCenter,
  latticeInRect,
  nextOwnMapLayerId,
  paintOwnMapCollision,
  paintOwnMapTiles,
  pixelToLattice,
  renderSceneFrame,
} from '@type-pal/reforge'
import { memo, useEffect, useRef, useState } from 'react'
import {
  AddOwnMapLayerCommand,
  CreateOwnMapCommand,
  MoveOwnMapLayerCommand,
  PaintCollisionCommand,
  PaintTilesCommand,
  RemoveOwnMapLayerCommand,
  UpdateOwnMapLayerCommand,
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

type MapTool = 'pan' | 'brush' | 'rect' | 'fill' | 'erase' | 'collision'
type CollisionPaint = 'set' | 'clear'
type StrokeEdit =
  | { kind: 'tile'; edit: OwnMapTileEdit }
  | { kind: 'collision'; edit: OwnMapCollisionEdit }

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
  session: EditSession
  assetBase: AssetBase
  ownMaps: EditorState['maps']
}) {
  const { scene, session, assetBase, ownMaps } = props
  const own = !isReuseMap(scene.map)
  const ownPath = isReuseMap(scene.map) ? '' : scene.map.ownMap
  const liveMap: OwnMap | undefined = own ? ownMaps[ownPath] : undefined
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
  const [activeLayerId, setActiveLayerId] = useState('floor')
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Set<string>>(() => new Set())
  const strokeRef = useRef<Map<string, StrokeEdit>>(new Map())
  const hoverRef = useRef<LatticePos | null>(null)
  const [paintTick, setPaintTick] = useState(0)
  const { status, err, loadedRef } = useSceneAssets({
    canvasRef,
    assetBase,
    sceneMap: scene.map,
    spriteNums: [],
    ownMaps,
  })
  const activeTool: MapTool = own && liveMap ? tool : 'pan'
  const activeLayer = liveMap?.layers.find((layer) => layer.id === activeLayerId)

  useEffect(() => {
    if (!liveMap) return
    if (!liveMap.layers.some((layer) => layer.id === activeLayerId))
      setActiveLayerId(liveMap.layers[0]?.id ?? '')
  }, [liveMap, activeLayerId])

  useEffect(() => {
    setHiddenLayerIds(new Set())
    strokeRef.current.clear()
  }, [ownPath])

  const lastFitMap = useRef<unknown>(null)
  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    if (!loaded || loaded.map === lastFitMap.current) return
    lastFitMap.current = loaded.map
    const box = mapBoxOf(loaded.map, mapRoom(scene.map))
    const width = Math.max(1, box.maxX - box.minX)
    const height = Math.max(1, box.maxY - box.minY)
    const zoom = Math.max(0.05, Math.min(size.w / width, size.h / height, 3))
    setView({
      zoom,
      panX: box.minX - (size.w / zoom - width) / 2,
      panY: box.minY - (size.h / zoom - height) / 2,
    })
  }, [status, size, scene.map, loadedRef, setView])

  useEffect(() => {
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
      map = paintOwnMapTiles(liveMap, tileEdits)
      map = paintOwnMapCollision(map, collisionEdits)
    }
    const room = mapRoom(scene.map) ?? { col: 0, row: 0, cols: map.width, rows: map.height }
    const { zoom, panX, panY } = view
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    renderSceneFrame(ctx, loaded.renderer, {
      map,
      room,
      camera: { x: panX, y: panY },
      sprites: [],
      worldScale: zoom,
      layers: { hiddenOwnLayerIds: [...hiddenLayerIds] },
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
    scene.map,
    liveMap,
    paintTick,
    activeTool,
    collisionPaint,
    hiddenLayerIds,
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
      if (activeTool === 'fill') {
        if (!activeLayer) return
        const { wx, wy } = toWorld(event)
        const start = pixelToLattice(wx, wy)
        const edits = floodFillOwnMapTiles(liveMap, activeLayer.id, start, selectedTile)
        if (edits.length > 0) session.dispatch(new PaintTilesCommand(ownPath, edits))
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
      if (tileEdits.length > 0) session.dispatch(new PaintTilesCommand(ownPath, tileEdits))
      if (collisionEdits.length > 0)
        session.dispatch(new PaintCollisionCommand(ownPath, collisionEdits))
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

  const createOwnMap = (): void => {
    const rel = `content/maps/${scene.id}.json`
    const borrow = reuseMapNum(scene.map) ?? 1
    const map = buildBlankOwnMap(DEFAULT_COLS, DEFAULT_ROWS, `tileset/${borrow}.rle`)
    const center = pixelToGrid(Math.floor(DEFAULT_COLS / 2) * 32, Math.floor(DEFAULT_ROWS / 2) * 16)
    session.dispatch(
      new CreateOwnMapCommand(scene.id, rel, map, {
        col: center.col,
        row: center.row,
        height: 0,
      }),
    )
    setActiveLayerId('floor')
    setTool('brush')
  }

  const addLayer = (): void => {
    if (!liveMap) return
    const id = nextOwnMapLayerId(liveMap)
    const layer = buildOwnMapLayer(liveMap, id, `图层 ${liveMap.layers.length + 1}`)
    session.dispatch(new AddOwnMapLayerCommand(ownPath, layer))
    setActiveLayerId(id)
  }

  const removeLayer = (): void => {
    if (!liveMap || !activeLayer || liveMap.layers.length <= 1) return
    const index = liveMap.layers.findIndex((layer) => layer.id === activeLayer.id)
    const next = liveMap.layers[index - 1] ?? liveMap.layers[index + 1]
    session.dispatch(new RemoveOwnMapLayerCommand(ownPath, activeLayer.id))
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
    session.dispatch(new MoveOwnMapLayerCommand(ownPath, activeLayer.id, index + offset))
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
  const cursor = activeTool === 'pan' ? 'grab' : 'crosshair'
  const activeLayerName = activeLayer?.name ?? '未选图层'
  const toolbarHint = !own
    ? '复用原版地图(只读)'
    : activeTool === 'pan'
      ? `${activeLayerName} · 平移`
      : activeTool === 'collision'
        ? `${collisionPaint === 'set' ? '标记' : '清除'}碰撞`
        : `${activeLayerName} · ${activeTool === 'fill' ? '填充' : activeTool === 'rect' ? '矩形' : activeTool === 'erase' ? '擦除' : '笔刷'}`

  return (
    <>
      <div className="outliner map-outliner">
        <div className="pane-h">
          <span className="t">{own ? '图层' : '地图工具'}</span>
          <span className="spacer" />
          {own && liveMap ? (
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
        {own && liveMap ? (
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
                    className="layer-eye"
                    onClick={() => toggleLayerVisible(layer.id)}
                    title={hiddenLayerIds.has(layer.id) ? '显示图层' : '隐藏图层'}
                    aria-label={hiddenLayerIds.has(layer.id) ? '显示图层' : '隐藏图层'}
                  >
                    {hiddenLayerIds.has(layer.id) ? '○' : '●'}
                  </button>
                  <button
                    type="button"
                    className="layer-name"
                    onClick={() => setActiveLayerId(layer.id)}
                    title={`${layer.name} (${layer.id})`}
                  >
                    <span>{layer.name}</span>
                    {layer.occlude ? <span className="layer-badge">遮挡</span> : null}
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
          <p className="hint2 map-readonly-hint">当前复用原版地图(只读)。</p>
        )}
        <div className="pane-h map-tiles-head">
          <span className="t">瓦片</span>
          {own && loaded ? (
            <span className="hint2">
              {activeLayerName} #{selectedTile}
            </span>
          ) : null}
        </div>
        {own && loaded ? (
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
              className={`tool${activeTool === 'brush' ? ' active' : ''}`}
              onClick={() => setTool('brush')}
              disabled={!own}
              title="画选中瓦片"
            >
              🖌 笔刷
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'rect' ? ' active' : ''}`}
              onClick={() => setTool('rect')}
              disabled={!own}
              title="矩形铺瓦"
            >
              ▭ 矩形
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'fill' ? ' active' : ''}`}
              onClick={() => setTool('fill')}
              disabled={!own}
              title="填充连通区域"
            >
              🪣 填充
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'erase' ? ' active' : ''}`}
              onClick={() => setTool('erase')}
              disabled={!own}
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
              disabled={!own}
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
              disabled={!own}
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
              disabled={!own}
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
          {own ? (
            <>
              <div className="field">
                <label>尺寸</label>
                <span className="mono">
                  {liveMap ? `${liveMap.width} × ${liveMap.height}` : '—'}
                </span>
              </div>
              <div className="field">
                <label>图层</label>
                <span className="mono">{liveMap?.layers.length ?? 0}</span>
              </div>
              <div className="field">
                <label>文件</label>
                <span className="mono map-file">{ownPath}</span>
              </div>
              {activeLayer ? (
                <>
                  <h4>选中图层</h4>
                  <div className="field">
                    <label>名称</label>
                    <input
                      key={`${activeLayer.id}:${activeLayer.name}`}
                      className="in"
                      defaultValue={activeLayer.name}
                      onBlur={(event) => {
                        const name = event.target.value.trim()
                        if (name && name !== activeLayer.name)
                          session.dispatch(
                            new UpdateOwnMapLayerCommand(ownPath, activeLayer.id, { name }),
                          )
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur()
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>ID</label>
                    <span className="mono">{activeLayer.id}</span>
                  </div>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={activeLayer.occlude}
                      onChange={(event) =>
                        session.dispatch(
                          new UpdateOwnMapLayerCommand(ownPath, activeLayer.id, {
                            occlude: event.target.checked,
                          }),
                        )
                      }
                    />
                    遮挡角色
                  </label>
                </>
              ) : null}
            </>
          ) : (
            <>
              <div className="field">
                <label>类型</label>
                <span className="mono">复用原版 {reuseMapNum(scene.map)}(只读)</span>
              </div>
              <button type="button" className="tool" onClick={createOwnMap}>
                ＋ 新建空白自有地图
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
