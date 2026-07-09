/**
 * 地图模式(W7)—— 自有地图编辑器。
 *
 * W7a-5 地基:显示场景地图 + 「新建空白自有地图」;复用原版 = 只读(原始数据不可改)。
 * W7c-1 绘制:tile 面板(左栏,tileset 缩略图点选)+ 笔刷/擦除(照 RPG Maker/Tiled 惯例)。
 * 子格模型:笔刷以**错排菱形子格**为单位(pixelToTile 四分法,与引擎渲染/碰撞同源);
 * 拖一笔 = 一条 PaintTilesCommand = 一步 undo;拖动中 stroke 走本地预览(paintCells 临时图),
 * 松手才入命令 —— 撤销粒度对,拖动零卡顿。矩形/填充/双层/碰撞笔刷 = W7c 后续。
 *
 * 画布用共享 scene-stage 钩子自绘;渲染读 state.maps 实时态(液态图,非磁盘)。
 */
import type { SceneDef } from '@type-pal/content'
import { isReuseMap, mapRoom, reuseMapNum } from '@type-pal/content'
import type { AssetBase, Palette, SubTileEdit, Tilemap } from '@type-pal/reforge'
import {
  bakeFrame,
  buildBlankOwnMap,
  COLLISION_MASK,
  encodeTileLayer0,
  encodeTileLayer1,
  floodFillSubTiles,
  LAYER0_TILE_MASK,
  LAYER1_CLEAR_MASK,
  LAYER1_TILE_MASK,
  MAX_LAYER0_TILE,
  MAX_LAYER1_TILE,
  paintCells,
  pixelToTile,
  renderSceneFrame,
  subTilesInRect,
} from '@type-pal/reforge'
import { memo, useEffect, useRef, useState } from 'react'
import { CreateOwnMapCommand, PaintTilesCommand } from '../core/commands.js'
import type { EditorState, EditSession } from '../core/edit-session.js'
import {
  drawGridBlocked,
  mapBoxOf,
  useSceneAssets,
  useStageSize,
  useViewZoomPan,
} from './scene-stage.js'

/** 新建空白自有地图的默认尺寸(格)。W7c 出尺寸编辑/裁剪后可改。 */
const DEFAULT_COLS = 24
const DEFAULT_ROWS = 24

type MapTool = 'pan' | 'brush' | 'rect' | 'fill' | 'erase' | 'collision'
type PaintLayer = 0 | 1
type CollisionPaint = 'set' | 'clear'

/** 单个瓦片缩略图(memo:frame/palette 不变不重烤;选中态只改 className)。 */
const TileThumb = memo(function TileThumb(props: {
  idx: number
  frame: Parameters<typeof bakeFrame>[0]
  palette: Palette
  selected: boolean
  disabled: boolean
  onPick: (idx: number) => void
}) {
  const { idx, frame, palette, selected, disabled, onPick } = props
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cvs = ref.current
    const ctx = cvs?.getContext('2d')
    if (!cvs || !ctx) return
    ctx.clearRect(0, 0, cvs.width, cvs.height)
    ctx.drawImage(bakeFrame(frame, palette), 0, 0)
  }, [frame, palette])
  return (
    <button
      type="button"
      className={`tile-thumb${selected ? ' sel' : ''}`}
      title={disabled ? `#${idx}(超当前图层编码上限,暂不可画)` : `#${idx}`}
      disabled={disabled}
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
  const ownPath = own ? (scene.map as { ownMap: string }).ownMap : ''
  const liveMap: Tilemap | undefined = own ? ownMaps[ownPath] : undefined
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
  const [paintLayer, setPaintLayer] = useState<PaintLayer>(0)
  const [collisionPaint, setCollisionPaint] = useState<CollisionPaint>('set')
  const [selectedTile, setSelectedTile] = useState(0)
  // stroke(拖一笔的子格集)+ hover(笔刷落点预览):ref 存数据,tick 触发重画
  const strokeRef = useRef<Map<string, SubTileEdit>>(new Map())
  const hoverRef = useRef<{ col: number; row: number; h: 0 | 1 } | null>(null)
  const [paintTick, setPaintTick] = useState(0)
  const { status, err, loadedRef } = useSceneAssets({
    canvasRef,
    assetBase,
    sceneMap: scene.map,
    spriteNums: [],
    ownMaps,
  })
  const activeTool: MapTool = own ? tool : 'pan' // 复用图只读:强制平移
  const maxSelectableTile = paintLayer === 0 ? MAX_LAYER0_TILE : MAX_LAYER1_TILE

  useEffect(() => {
    if (selectedTile > maxSelectableTile) setSelectedTile(maxSelectableTile)
  }, [selectedTile, maxSelectableTile])

  // 换图 → 居中适配一次。绑 loaded.map 对象身份(而非 sceneMapKey):key 在磁盘加载前就变
  // (撤销/建图),会拿旧图 box 误 fit 并抢先认领新 key;loaded.map 只在真载入新图才换对象,稳。
  // 画笔改 liveMap 不换 loaded.map → 不重 fit(画一笔不跳视图)。
  const lastFitMap = useRef<unknown>(null)
  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    if (!loaded || loaded.map === lastFitMap.current) return
    lastFitMap.current = loaded.map
    const box = mapBoxOf(loaded.map, mapRoom(scene.map))
    const bw = Math.max(1, box.maxX - box.minX)
    const bh = Math.max(1, box.maxY - box.minY)
    const zoom = Math.max(0.05, Math.min(size.w / bw, size.h / bh, 3))
    setView({
      zoom,
      panX: box.minX - (size.w / zoom - bw) / 2,
      panY: box.minY - (size.h / zoom - bh) / 2,
    })
  }, [status, size, scene.map, loadedRef, setView])

  // 绘制:底图(实时 liveMap ⊕ stroke 预览,无精灵)+ 网格 + hover 菱形。
  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    const ctx = canvasRef.current?.getContext('2d')
    if (!loaded || !ctx) return
    const base = liveMap ?? loaded.map
    const strokeEdits = [...strokeRef.current.values()]
    const map = strokeEdits.length > 0 ? paintCells(base, strokeEdits) : base
    const room = mapRoom(scene.map) ?? { col: 0, row: 0, cols: map.width, rows: map.height }
    const { zoom, panX, panY } = view
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    renderSceneFrame(ctx, loaded.renderer, {
      map,
      room,
      camera: { x: panX, y: panY },
      sprites: [],
      worldScale: zoom,
    })
    drawGridBlocked(
      ctx,
      map,
      room,
      { zoom, panX, panY },
      { grid: showGrid, blocked: showCollision },
    )
    // hover 菱形(笔刷/擦除):子格中心 h=0→(32c,16r) / h=1→(32c+16,16r+8),半径 16/8
    const hov = hoverRef.current
    if (hov && activeTool !== 'pan') {
      const cx = (hov.col * 32 + hov.h * 16 - panX) * zoom
      const cy = (hov.row * 16 + hov.h * 8 - panY) * zoom
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
    loadedRef,
  ])

  // ── 画布交互:笔刷/擦除逐子格,矩形拖对角,填充点一下;pan 工具或中/右键 = 平移 ──
  const panRef = useRef<{ sx: number; sy: number; panX: number; panY: number } | null>(null)
  const paintingRef = useRef(false)
  const rectAnchorRef = useRef<{ wx: number; wy: number } | null>(null)

  const toWorld = (e: React.PointerEvent<HTMLCanvasElement>): { wx: number; wy: number } => {
    const c = e.currentTarget
    const r = c.getBoundingClientRect()
    const v = viewRef.current
    return {
      wx: ((e.clientX - r.left) * (c.width / r.width)) / v.zoom + v.panX,
      wy: ((e.clientY - r.top) * (c.height / r.height)) / v.zoom + v.panY,
    }
  }

  const editForSubTile = (p: { col: number; row: number; h: 0 | 1 }): SubTileEdit => {
    if (activeTool === 'collision') {
      return {
        ...p,
        word: collisionPaint === 'set' ? COLLISION_MASK : 0,
        mask: COLLISION_MASK,
      }
    }
    if (activeTool === 'erase') {
      return {
        ...p,
        word: 0,
        mask: paintLayer === 0 ? LAYER0_TILE_MASK : LAYER1_CLEAR_MASK,
      }
    }
    return paintLayer === 0
      ? { ...p, word: encodeTileLayer0(selectedTile), mask: LAYER0_TILE_MASK }
      : { ...p, word: encodeTileLayer1(selectedTile), mask: LAYER1_TILE_MASK }
  }

  const paintAt = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const base = liveMap
    if (!base) return
    const { wx, wy } = toWorld(e)
    const { col, row, h } = pixelToTile(wx, wy)
    if (col < 0 || col >= base.width || row < 0 || row >= base.height) return
    const edit = editForSubTile({ col, row, h })
    const key = `${col},${row},${h}`
    const cur = strokeRef.current.get(key)
    if (cur && cur.word === edit.word && cur.mask === edit.mask) return
    strokeRef.current.set(key, edit)
    setPaintTick((t) => t + 1)
  }

  /** 矩形预览:锚点→当前点 AABB 内子格整批重算进 stroke(拖动中每 move 重建)。 */
  const rectStrokeTo = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const anchor = rectAnchorRef.current
    if (!anchor) return
    const { wx, wy } = toWorld(e)
    strokeRef.current.clear()
    for (const p of subTilesInRect(anchor.wx, anchor.wy, wx, wy)) {
      strokeRef.current.set(`${p.col},${p.row},${p.h}`, editForSubTile(p))
    }
    setPaintTick((t) => t + 1)
  }

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    if (activeTool !== 'pan' && e.button === 0 && liveMap) {
      if (activeTool === 'fill') {
        // 填充:点一下即整笔命令(BFS 同 word 连通区),不走 stroke
        const { wx, wy } = toWorld(e)
        const start = pixelToTile(wx, wy)
        if (
          start.col >= 0 &&
          start.col < liveMap.width &&
          start.row >= 0 &&
          start.row < liveMap.height
        ) {
          const fill = editForSubTile(start)
          const edits = floodFillSubTiles(liveMap, start, fill.word, fill.mask)
          if (edits.length > 0) session.dispatch(new PaintTilesCommand(ownPath, edits))
        }
        return
      }
      paintingRef.current = true
      if (activeTool === 'rect') {
        rectAnchorRef.current = toWorld(e)
        rectStrokeTo(e)
      } else {
        paintAt(e)
      }
      return
    }
    const v = viewRef.current
    panRef.current = { sx: e.clientX, sy: e.clientY, panX: v.panX, panY: v.panY }
  }
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (paintingRef.current) {
      if (activeTool === 'rect') rectStrokeTo(e)
      else paintAt(e)
      return
    }
    const p = panRef.current
    const c = canvasRef.current
    if (p && c) {
      const scale = c.width / c.getBoundingClientRect().width / viewRef.current.zoom
      setView((v) => ({
        ...v,
        panX: p.panX - (e.clientX - p.sx) * scale,
        panY: p.panY - (e.clientY - p.sy) * scale,
      }))
      return
    }
    if (activeTool !== 'pan') {
      const { wx, wy } = toWorld(e)
      const t = pixelToTile(wx, wy)
      const h = hoverRef.current
      if (!h || h.col !== t.col || h.row !== t.row || h.h !== t.h) {
        hoverRef.current = t
        setPaintTick((v) => v + 1)
      }
    }
  }
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (paintingRef.current) {
      paintingRef.current = false
      rectAnchorRef.current = null
      const edits = [...strokeRef.current.values()]
      strokeRef.current.clear()
      if (edits.length > 0) session.dispatch(new PaintTilesCommand(ownPath, edits))
      // 命令落地后 liveMap 换新对象 → 重画;本地预览与命令产物一致,无闪烁
    }
    panRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* 指针已释放 */
    }
  }
  const onLeave = (): void => {
    if (hoverRef.current) {
      hoverRef.current = null
      setPaintTick((v) => v + 1)
    }
  }

  const createOwnMap = (): void => {
    const rel = `content/maps/${scene.id}.json`
    const borrow = reuseMapNum(scene.map) ?? 1 // 蹭原版号的 tileset(W7b 前无独立 tileset 库)
    const tilemap = buildBlankOwnMap(DEFAULT_COLS, DEFAULT_ROWS, `tileset/${borrow}.rle`)
    session.dispatch(
      new CreateOwnMapCommand(scene.id, rel, tilemap, {
        col: Math.floor(DEFAULT_COLS / 2),
        row: Math.floor(DEFAULT_ROWS / 2),
        height: 0,
      }),
    )
    setTool('brush') // 建完即画
  }

  const loaded = status === 'ready' ? loadedRef.current : null
  const cursor = activeTool === 'pan' ? 'grab' : 'crosshair'
  const paintLayerLabel = paintLayer === 0 ? '下层' : '上层'
  const toolbarHint = !own
    ? '复用原版地图(只读)'
    : activeTool === 'pan'
      ? '自有地图 · 左栏选瓦片开画'
      : activeTool === 'collision'
        ? `${collisionPaint === 'set' ? '标记' : '清除'}碰撞 · 中/右键平移 · 一笔 = 一步撤销`
        : activeTool === 'fill'
          ? `点一下填充连通区 · ${paintLayerLabel} · 中/右键平移`
          : `${activeTool === 'rect' ? '拖对角铺矩形' : '拖动作画'} · ${paintLayerLabel} · 中/右键平移 · 一笔 = 一步撤销`

  return (
    <>
      {/* 左栏:own = tile 面板(W7c-1);reuse = 只读提示。 */}
      <div className="outliner">
        <div className="pane-h">
          <span className="t">{own ? '瓦片' : '地图工具'}</span>
          {own && loaded ? (
            <span className="hint2">
              {paintLayerLabel} #{selectedTile}
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
                  disabled={idx > maxSelectableTile}
                  onPick={(i) => {
                    setSelectedTile(i)
                    setTool('brush') // 选瓦即入笔刷(RPG Maker 惯例)
                  }}
                />
              ))}
          </div>
        ) : (
          <p className="hint2" style={{ padding: '8px 10px', lineHeight: 1.6 }}>
            当前复用原版地图(只读)。右栏新建自有地图后,这里出瓦片面板。
          </p>
        )}
      </div>

      <div className="center map-center">
        <div className="toolbar map-toolbar">
          <div className="tool-group">
            <button
              type="button"
              className={`tool${activeTool === 'pan' ? ' active' : ''}`}
              onClick={() => setTool('pan')}
              title="平移画布(笔刷态按中/右键拖也可平移)"
            >
              ✋ 平移
            </button>
          </div>
          <div className="tool-group">
            <button
              type="button"
              className={`tool${paintLayer === 0 ? ' active' : ''}`}
              onClick={() => setPaintLayer(0)}
              disabled={!own}
              title={own ? '绘制 layer0(下层)' : '复用原版地图只读'}
            >
              下层
            </button>
            <button
              type="button"
              className={`tool${paintLayer === 1 ? ' active' : ''}`}
              onClick={() => setPaintLayer(1)}
              disabled={!own}
              title={own ? '绘制 layer1(上层装饰)' : '复用原版地图只读'}
            >
              上层
            </button>
          </div>
          <div className="tool-group">
            <button
              type="button"
              className={`tool${activeTool === 'brush' ? ' active' : ''}`}
              onClick={() => setTool('brush')}
              disabled={!own}
              title={own ? '画选中瓦片(左栏选)' : '复用原版地图只读,先新建自有地图'}
            >
              🖌 笔刷
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'rect' ? ' active' : ''}`}
              onClick={() => setTool('rect')}
              disabled={!own}
              title={own ? '矩形铺瓦(拖对角,松手落笔)' : '复用原版地图只读'}
            >
              ▭ 矩形
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'fill' ? ' active' : ''}`}
              onClick={() => setTool('fill')}
              disabled={!own}
              title={own ? '填充连通同瓦区(点一下)' : '复用原版地图只读'}
            >
              🪣 填充
            </button>
            <button
              type="button"
              className={`tool${activeTool === 'erase' ? ' active' : ''}`}
              onClick={() => setTool('erase')}
              disabled={!own}
              title={own ? '擦除子格(写回空)' : '复用原版地图只读'}
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
              title={own ? '绘制碰撞禁入位(bit13)' : '复用原版地图只读'}
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
              title={own ? '碰撞笔刷:标记禁入格' : '复用原版地图只读'}
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
              title={own ? '碰撞笔刷:清除禁入格' : '复用原版地图只读'}
            >
              清除
            </button>
          </div>
          <div className="tool-group">
            <label className={`vtog${showGrid ? ' on' : ''}`}>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />{' '}
              网格
            </label>
            <label className={`vtog${showCollision ? ' on' : ''}`}>
              <input
                type="checkbox"
                checked={showCollision}
                onChange={(e) => setShowCollision(e.target.checked)}
              />{' '}
              碰撞
            </label>
          </div>
          <span className="spacer" />
          <span className="map-toolbar-hint">{toolbarHint}</span>
        </div>
        <div className="viewport" ref={wrapRef}>
          <div className="canvas-note">
            滚轮缩放 · {activeTool === 'pan' ? '拖动平移' : '左键作画'} ·{' '}
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
            onContextMenu={(e) => e.preventDefault()}
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
                <label>类型</label>
                <span className="mono">自有地图</span>
              </div>
              <div className="field">
                <label>尺寸</label>
                <span className="mono">
                  {liveMap ? `${liveMap.width} × ${liveMap.height}` : '—'}
                </span>
              </div>
              <div className="field">
                <label>文件</label>
                <span className="mono" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                  {ownPath}
                </span>
              </div>
              <p className="hint2">
                笔刷/矩形/填充以菱形子格为单位;下层/上层绘制与碰撞笔刷互不覆盖;一笔 = 一步撤销。
                图尺寸编辑 = W7c 后续。
              </p>
            </>
          ) : (
            <>
              <div className="field">
                <label>类型</label>
                <span className="mono">复用原版 {reuseMapNum(scene.map)}(只读)</span>
              </div>
              <p className="hint2">
                原版地图不可改。要自己画,先新建一张空白自有地图({DEFAULT_COLS}×{DEFAULT_ROWS},
                借用原版 {reuseMapNum(scene.map) ?? 1} 的 tileset),建后即可用绘制工具作画。
              </p>
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
