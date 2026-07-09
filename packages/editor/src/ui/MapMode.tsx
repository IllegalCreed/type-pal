/**
 * 地图模式(W7)—— 自有地图编辑器。
 *
 * W7a-5:显示当前场景地图 + 「新建空白自有地图」入口。复用原版地图 = 只读(原始数据不可改),
 * 须先新建一张自有地图才能画。新图借用当前复用图的 tileset(蹭原版号;W7b 出独立 tileset 库)。
 * 绘制工具(选 tile / 笔刷 / 矩形 / 填充 / 擦除 / 双层 / 碰撞笔刷)= W7c(照 RPG Maker/Tiled 惯例)。
 *
 * 画布用共享 scene-stage 钩子(缩放/平移/资产/网格)自绘,不复用 SceneCanvas
 * —— 将来 paint 交互与实体布置交互完全不同,自持画布为 W7c 铺路。
 */
import type { SceneDef } from '@type-pal/content'
import { isReuseMap, mapRoom, reuseMapNum } from '@type-pal/content'
import { type AssetBase, buildBlankOwnMap, renderSceneFrame } from '@type-pal/reforge'
import { useEffect, useRef, useState } from 'react'
import { CreateOwnMapCommand } from '../core/commands.js'
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

export function MapMode(props: {
  scene: SceneDef
  session: EditSession
  assetBase: AssetBase
  ownMaps: EditorState['maps']
}) {
  const { scene, session, assetBase, ownMaps } = props
  const own = !isReuseMap(scene.map)
  const ownPath = own ? (scene.map as { ownMap: string }).ownMap : ''
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const size = useStageSize(wrapRef, 120)
  const { view, viewRef, setView } = useViewZoomPan({
    canvasRef,
    initial: { zoom: 1, panX: 0, panY: 0 },
  })
  const [showGrid, setShowGrid] = useState(true)
  const { status, err, loadedRef } = useSceneAssets({
    canvasRef,
    assetBase,
    sceneMap: scene.map,
    spriteNums: [],
    ownMaps,
  })

  // 换图 → 居中适配一次。绑 loaded.map 对象身份(而非 sceneMapKey):key 在磁盘加载前就变
  // (撤销/建图),会拿旧图 box 误 fit 并抢先认领新 key;loaded.map 只在真载入新图才换对象,稳。
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

  // 绘制:底图(无精灵)+ 网格叠加。view/尺寸/网格变即重画。
  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    const ctx = canvasRef.current?.getContext('2d')
    if (!loaded || !ctx) return
    const { renderer, map } = loaded
    const room = mapRoom(scene.map) ?? { col: 0, row: 0, cols: map.width, rows: map.height }
    const { zoom, panX, panY } = view
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    renderSceneFrame(ctx, renderer, {
      map,
      room,
      camera: { x: panX, y: panY },
      sprites: [],
      worldScale: zoom,
    })
    drawGridBlocked(ctx, map, room, { zoom, panX, panY }, { grid: showGrid, blocked: false })
  }, [status, view, size, showGrid, scene.map, loadedRef])

  // 拖拽平移(整张画布;无实体交互,任意拖 = 平移)。
  const panRef = useRef<{ sx: number; sy: number; panX: number; panY: number } | null>(null)
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const v = viewRef.current
    panRef.current = { sx: e.clientX, sy: e.clientY, panX: v.panX, panY: v.panY }
  }
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const p = panRef.current
    const c = canvasRef.current
    if (!p || !c) return
    const scale = c.width / c.getBoundingClientRect().width / viewRef.current.zoom
    setView((v) => ({
      ...v,
      panX: p.panX - (e.clientX - p.sx) * scale,
      panY: p.panY - (e.clientY - p.sy) * scale,
    }))
  }
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    panRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* 指针已释放 */
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
  }

  return (
    <>
      {/* 左栏(outliner 列):W7c 起放 tile 面板 / 笔刷工具;现为占位。 */}
      <div className="outliner">
        <div className="pane-h">
          <span className="t">地图工具</span>
        </div>
        <p className="hint2" style={{ padding: '8px 10px', lineHeight: 1.6 }}>
          {own
            ? 'tile 面板 + 笔刷 / 矩形 / 填充 / 擦除 / 双层 / 碰撞笔刷 = W7c(照 RPG Maker / Tiled 惯例)。'
            : '当前复用原版地图(只读)。右栏新建自有地图后,这里出绘制工具。'}
        </p>
      </div>

      <div className="center">
        <div className="toolbar">
          <span className="tool" style={{ pointerEvents: 'none' }}>
            🗺️ 地图
          </span>
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
            {own ? '自有地图 · 绘制工具即将到来(W7c)' : '复用原版地图(只读)'}
          </span>
        </div>
        <div className="viewport" ref={wrapRef}>
          <div className="canvas-note">
            滚轮缩放 · 拖动平移 · {Math.round(view.zoom * 100)}%
            {status === 'loading' ? ' · 载入中…' : ''}
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
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor: 'grab',
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
                <label>文件</label>
                <span className="mono" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                  {ownPath}
                </span>
              </div>
              <p className="hint2">
                绘制工具(选 tile / 笔刷 / 矩形 / 填充 / 擦除 / 双层 / 碰撞笔刷)= W7c。
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
