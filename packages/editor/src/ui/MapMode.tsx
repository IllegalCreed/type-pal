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
  encodeTileLayer0,
  MAX_LAYER0_TILE,
  paintCells,
  pixelToTile,
  renderSceneFrame,
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

type MapTool = 'pan' | 'brush' | 'erase'

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
      title={disabled ? `#${idx}(超 layer0 编码上限,暂不可画)` : `#${idx}`}
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
  const [tool, setTool] = useState<MapTool>('pan')
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
    drawGridBlocked(ctx, map, room, { zoom, panX, panY }, { grid: showGrid, blocked: false })
    // hover 菱形(笔刷/擦除):子格中心 h=0→(32c,16r) / h=1→(32c+16,16r+8),半径 16/8
    const hov = hoverRef.current
    if (hov && activeTool !== 'pan') {
      const cx = (hov.col * 32 + hov.h * 16 - panX) * zoom
      const cy = (hov.row * 16 + hov.h * 8 - panY) * zoom
      ctx.save()
      ctx.strokeStyle = activeTool === 'erase' ? 'rgba(255,90,90,0.95)' : 'rgba(255,255,255,0.9)'
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
  }, [status, view, size, showGrid, scene.map, liveMap, paintTick, activeTool, loadedRef])

  // ── 画布交互:笔刷/擦除画子格;pan 工具或中/右键 = 平移 ──────────────────
  const panRef = useRef<{ sx: number; sy: number; panX: number; panY: number } | null>(null)
  const paintingRef = useRef(false)

  const toWorld = (e: React.PointerEvent<HTMLCanvasElement>): { wx: number; wy: number } => {
    const c = e.currentTarget
    const r = c.getBoundingClientRect()
    const v = viewRef.current
    return {
      wx: ((e.clientX - r.left) * (c.width / r.width)) / v.zoom + v.panX,
      wy: ((e.clientY - r.top) * (c.height / r.height)) / v.zoom + v.panY,
    }
  }

  const paintAt = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const base = liveMap
    if (!base) return
    const { wx, wy } = toWorld(e)
    const { col, row, h } = pixelToTile(wx, wy)
    if (col < 0 || col >= base.width || row < 0 || row >= base.height) return
    const word = activeTool === 'erase' ? 0 : encodeTileLayer0(selectedTile)
    const key = `${col},${row},${h}`
    const cur = strokeRef.current.get(key)
    if (cur && cur.word === word) return
    strokeRef.current.set(key, { col, row, h, word })
    setPaintTick((t) => t + 1)
  }

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    if (activeTool !== 'pan' && e.button === 0 && liveMap) {
      paintingRef.current = true
      paintAt(e)
      return
    }
    const v = viewRef.current
    panRef.current = { sx: e.clientX, sy: e.clientY, panX: v.panX, panY: v.panY }
  }
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (paintingRef.current) {
      paintAt(e)
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

  return (
    <>
      {/* 左栏:own = tile 面板(W7c-1);reuse = 只读提示。 */}
      <div className="outliner">
        <div className="pane-h">
          <span className="t">{own ? '瓦片' : '地图工具'}</span>
          {own && loaded ? <span className="hint2">#{selectedTile}</span> : null}
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
                  disabled={idx > MAX_LAYER0_TILE}
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

      <div className="center">
        <div className="toolbar">
          <button
            type="button"
            className={`tool${activeTool === 'pan' ? ' active' : ''}`}
            onClick={() => setTool('pan')}
            title="平移画布(笔刷态按中/右键拖也可平移)"
          >
            ✋ 平移
          </button>
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
            className={`tool${activeTool === 'erase' ? ' active' : ''}`}
            onClick={() => setTool('erase')}
            disabled={!own}
            title={own ? '擦除子格(写回空)' : '复用原版地图只读'}
          >
            ⌫ 擦除
          </button>
          <span className="sep" />
          <label className={`vtog${showGrid ? ' on' : ''}`}>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />{' '}
            网格
          </label>
          <span className="spacer" />
          <span style={{ color: 'var(--faint)', fontSize: 11 }}>
            {own
              ? activeTool === 'pan'
                ? '自有地图 · 左栏选瓦片开画'
                : '拖动作画 · 中/右键平移 · 一笔 = 一步撤销'
              : '复用原版地图(只读)'}
          </span>
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
                笔刷以菱形子格为单位;拖一笔 = 一步撤销。矩形 / 填充 / 双层 / 碰撞笔刷 = W7c
                后续。
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
