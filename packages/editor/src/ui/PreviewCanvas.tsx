/**
 * 演出预览画布(v0)—— 事件模式内嵌:播放/暂停/单步/重置/倍速 + 对话条。
 * 渲染复用 reforge renderSceneFrame;演出态来自 Playback.view(overlay,不碰编辑数据)。
 * 帧下标语义与引擎一致:定帧(setEntityFrame)优先 → 走帧(anim) → 站立;玩家 gesture 优先。
 * 相机跟随玩家(贴游戏观感;编辑自由视角归布置模式)。
 */

import type {
  ActorDef,
  Command,
  EntityDef,
  Locale,
  SceneDef,
  ScriptStage,
  SpriteDef,
} from '@type-pal/content'
import { gridToPixel, lookupText, resolveEntitySpriteId, spriteScreenY } from '@type-pal/content'
import type { AssetBase, LoadedSprite, SpriteDraw } from '@type-pal/reforge'
import {
  Canvas2DRenderer,
  idleFrameIndex,
  loadPalette,
  loadSprite,
  loadTilemap,
  loadTileset,
  renderSceneFrame,
  walkFrameIndex,
} from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Playback } from '../core/playback.js'

const ZOOM = 3

/** 菱形格顶点(D16:格中心 ±16 横 / ±8 纵;世界像素 → 画布 = (w − camera) × ZOOM)。 */
function diamondPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  camera: { x: number; y: number },
): void {
  const sx = (wx: number): number => (wx - camera.x) * ZOOM
  const sy = (wy: number): number => (wy - camera.y) * ZOOM
  ctx.beginPath()
  ctx.moveTo(sx(cx), sy(cy - 8))
  ctx.lineTo(sx(cx + 16), sy(cy))
  ctx.lineTo(sx(cx), sy(cy + 8))
  ctx.lineTo(sx(cx - 16), sy(cy))
  ctx.closePath()
}

/**
 * 选中事件的触发点/面高亮:owner 格金色描边(呼吸)+ 触发范围淡金面
 * (range = max(trigger.range, interact?1:0),切比雪夫盒 —— 与引擎 findTrigger 同源)。
 * zone/隐藏实体无精灵,此标记是它们在预览里唯一的可见形态;ghost = 隐藏实体淡显。
 */
function drawTriggerHighlight(
  ctx: CanvasRenderingContext2D,
  e: EntityDef,
  camera: { x: number; y: number },
  now: number,
  ghost = false,
): void {
  const t = e.pages?.[0]?.trigger
  const range = t ? Math.max(t.range ?? 0, t.on === 'interact' ? 1 : 0) : 0
  const breath = 0.55 + 0.35 * Math.sin(now / 280)
  const alpha = ghost ? 0.35 : 1
  ctx.save()
  // 范围面(不含中心格,淡金填充)
  if (range > 0) {
    ctx.fillStyle = `rgba(255, 203, 113, ${0.2 * alpha})`
    ctx.strokeStyle = `rgba(255, 214, 90, ${0.35 * alpha})`
    ctx.lineWidth = 1
    for (let dc = -range; dc <= range; dc++) {
      for (let dr = -range; dr <= range; dr++) {
        if (dc === 0 && dr === 0) continue
        const p = gridToPixel({ col: e.pos.col + dc, row: e.pos.row + dr, height: 0 })
        diamondPath(ctx, p.x, p.y, camera)
        ctx.fill()
        ctx.stroke()
      }
    }
  }
  // 中心格:填充 + 呼吸描边
  const c = gridToPixel({ col: e.pos.col, row: e.pos.row, height: 0 })
  diamondPath(ctx, c.x, c.y, camera)
  ctx.fillStyle = `rgba(255, 203, 113, ${0.28 * alpha})`
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = `rgba(255, 214, 90, ${breath * alpha})`
  ctx.stroke()
  // 中心十字销(zone/隐藏实体无精灵时的锚点视觉)
  const sx = (c.x - camera.x) * ZOOM
  const sy = (c.y - camera.y) * ZOOM
  ctx.strokeStyle = `rgba(255, 235, 170, ${0.9 * alpha})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(sx - 5, sy)
  ctx.lineTo(sx + 5, sy)
  ctx.moveTo(sx, sy - 5)
  ctx.lineTo(sx, sy + 5)
  ctx.stroke()
  ctx.restore()
}

/** 收集脚本树里 setActorSprite 引用的精灵 id(预载,防换装闪帧)。 */
function collectActorSprites(stages: readonly ScriptStage[]): string[] {
  const out = new Set<string>()
  const walk = (cmds: readonly Command[]): void => {
    for (const c of cmds) {
      if (c.kind === 'setActorSprite') out.add(c.sprite)
      if (c.kind === 'branch') {
        walk(c.then)
        if (c.else) walk(c.else)
      }
      if (c.kind === 'startBattle') {
        if (c.onLose) walk(c.onLose)
        if (c.onFlee) walk(c.onFlee)
      }
      if (c.kind === 'confirm') walk(c.onNo)
      if (c.kind === 'setEntityAuto' || c.kind === 'setEntityTrigger')
        for (const st of c.stages) walk(st.body)
    }
  }
  for (const st of stages) walk(st.body)
  return [...out]
}

export function PreviewCanvas(props: {
  scene: SceneDef
  stages: readonly ScriptStage[]
  sourceKey: string
  /** 当前源的触发实体(未播时镜头对准它;onEnter 源 undefined = 对准玩家)。 */
  focusEntityId: string | undefined
  sprites: SpriteDef[]
  actorsById: Record<string, ActorDef>
  leaderSpriteId: string | undefined
  assetBase: AssetBase
  locale: Locale
  playback: Playback
}) {
  const {
    scene,
    stages,
    sourceKey,
    focusEntityId,
    sprites,
    actorsById,
    leaderSpriteId,
    assetBase,
    locale,
    playback,
  } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 640, h: 360 })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [err, setErr] = useState('')
  const loadedRef = useRef<{
    renderer: Canvas2DRenderer
    map: Awaited<ReturnType<typeof loadTilemap>>
    spritesByNum: Map<number, LoadedSprite>
  } | null>(null)
  // UI 重渲由宿主(EventMode)订阅 playback.onUi 驱动:父重渲 → 本组件(未 memo)必重渲,
  // 控制条/对话条读到最新 playback 状态;canvas 本体由 rAF 自绘,不依赖 React。

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(80, Math.floor(r.width)), h: Math.max(80, Math.floor(r.height)) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const spriteById = useMemo(() => new Map(sprites.map((s) => [s.id, s])), [sprites])
  const entityDef = (e: SceneDef['entities'][number]): SpriteDef | undefined => {
    const sid = resolveEntitySpriteId(e, actorsById)
    return sid ? spriteById.get(sid) : undefined
  }
  // 预载:全部实体(含 hidden,演出会显形)+ 玩家 + 换装表
  // biome-ignore lint/correctness/useExhaustiveDependencies: entityDef 为 spriteById/actorsById 纯派生
  const spriteNums = useMemo(() => {
    const nums = new Set<number>()
    const lead = leaderSpriteId ? spriteById.get(leaderSpriteId) : undefined
    if (lead) nums.add(lead.spriteNum)
    for (const e of scene.entities) {
      const d = entityDef(e)
      if (d) nums.add(d.spriteNum)
    }
    for (const sid of collectActorSprites(stages)) {
      const d = spriteById.get(sid)
      if (d) nums.add(d.spriteNum)
    }
    return [...nums]
  }, [scene, stages, spriteById, leaderSpriteId])

  const mapNum = scene.map.reuseOriginalMap
  const paletteId = scene.paletteId ?? 0
  const spriteNumsKey = spriteNums.join(',')
  // biome-ignore lint/correctness/useExhaustiveDependencies: spriteNums 以 key 串比较(同 SceneCanvas 惯例)
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    let alive = true
    setStatus('loading')
    void (async () => {
      try {
        const [map, tiles, palette] = await Promise.all([
          loadTilemap(assetBase, mapNum),
          loadTileset(assetBase, mapNum),
          loadPalette(assetBase, paletteId),
        ])
        const entries = await Promise.all(
          spriteNums.map(async (n) => [n, await loadSprite(assetBase, n)] as const),
        )
        if (!alive) return
        loadedRef.current = {
          renderer: new Canvas2DRenderer(ctx, palette, tiles),
          map,
          spritesByNum: new Map(entries),
        }
        setStatus('ready')
      } catch (e) {
        if (alive) {
          setErr(e instanceof Error ? e.message : String(e))
          setStatus('error')
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [assetBase, mapNum, paletteId, spriteNumsKey])

  // rAF:tick 演出 + 合成一帧
  // biome-ignore lint/correctness/useExhaustiveDependencies: entityDef/spriteById 纯派生;rAF 每帧读最新
  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!loaded || !canvas || !ctx) return
    const { renderer, map, spritesByNum } = loaded
    let raf = 0
    let last = performance.now()
    const leadDef = leaderSpriteId ? spriteById.get(leaderSpriteId) : undefined
    // 相机中心(世界像素):向兴趣点平滑趋近;首帧直达(免开场长飘)
    let cam: { x: number; y: number } | null = null

    /** 镜头目标:播放中 = Playback.poi(命令即导演);未播 = 选中源的触发实体(看得见主体)。 */
    const camTarget = (): { x: number; y: number } => {
      const v = playback.view
      if (playback.poi) {
        const g = playback.poiPos()
        return gridToPixel(g)
      }
      if (focusEntityId) {
        const e = scene.entities.find((x) => x.id === focusEntityId)
        if (e) return gridToPixel(e.pos)
      }
      return gridToPixel(v.player.pos)
    }

    const frame = (now: number): void => {
      const dt = Math.min(100, now - last)
      last = now
      playback.tick(dt)
      const v = playback.view

      const draws: SpriteDraw[] = []
      // 实体(overlay 合成)
      for (const e of scene.entities) {
        const ov = v.entity.get(e.id)
        const hidden = ov?.hidden ?? e.hidden ?? false
        if (hidden) continue
        const def = entityDef(e)
        const sp = def ? spritesByNum.get(def.spriteNum) : undefined
        if (!def || !sp) continue
        const pos = ov?.pos ?? e.pos
        const facing = ov?.facing ?? e.facing ?? 'down'
        const fi =
          ov?.frame !== undefined
            ? idleFrameIndex(def.layout, facing) + ov.frame
            : ov?.anim !== undefined
              ? walkFrameIndex(def.layout, facing, ov.anim)
              : idleFrameIndex(def.layout, facing)
        const f = sp.frames[fi] ?? sp.frames[0]
        if (!f) continue
        const p = gridToPixel(pos)
        draws.push({
          frame: f,
          worldX: p.x,
          worldY: spriteScreenY(pos),
          anchorX: Math.floor(f.width / 2),
          anchorY: f.height,
          baseYBias: e.zBias,
        })
      }
      // 玩家(gesture/换装)
      const pdefBase = v.player.spriteId ? spriteById.get(v.player.spriteId) : undefined
      const pdef = pdefBase ?? leadDef
      const psp = pdef ? spritesByNum.get(pdef.spriteNum) : undefined
      if (pdef && psp) {
        const fi =
          v.player.gesture != null
            ? idleFrameIndex(pdef.layout, v.player.facing) + v.player.gesture
            : idleFrameIndex(pdef.layout, v.player.facing)
        const f = psp.frames[fi] ?? psp.frames[0]
        if (f) {
          const p = gridToPixel(v.player.pos)
          draws.push({
            frame: f,
            worldX: p.x,
            worldY: spriteScreenY(v.player.pos),
            anchorX: Math.floor(f.width / 2),
            anchorY: f.height,
          })
        }
      }
      // 相机:向兴趣点平滑趋近(帧率无关 lerp;首帧直达)
      const tgt = camTarget()
      if (!cam) cam = { ...tgt }
      else {
        const k = 1 - Math.exp(-dt / 160)
        cam.x += (tgt.x - cam.x) * k
        cam.y += (tgt.y - cam.y) * k
      }
      const camera = { x: cam.x - size.w / ZOOM / 2, y: cam.y - size.h / ZOOM / 2 }
      const room = scene.map.room ?? { col: 0, row: 0, cols: map.width, rows: map.height }
      renderSceneFrame(ctx, renderer, { map, room, camera, sprites: draws, worldScale: ZOOM })
      // 触发点/面高亮:选中事件的 owner 格描边 + 触发范围面(range 切比雪夫盒,引擎 findTrigger 同源)。
      // zone 实体无精灵,这是它在预览里唯一的可见形态。
      if (focusEntityId) {
        const e = scene.entities.find((x) => x.id === focusEntityId)
        if (e && !(v.entity.get(e.id)?.hidden ?? e.hidden)) {
          drawTriggerHighlight(ctx, e, camera, now)
        } else if (e) {
          drawTriggerHighlight(ctx, e, camera, now, /* ghost= */ true) // 隐藏实体:淡显位置仍可寻
        }
      }
      // 淡幕
      if (v.fadeBlack > 0) {
        ctx.save()
        ctx.globalAlpha = v.fadeBlack
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.restore()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [status, scene, size.w, size.h, playback, spriteById, leaderSpriteId, focusEntityId])

  const v = playback.view
  const mode = playback.mode
  const dlg = v.dialog
  const speaker = dlg?.line.speaker ? lookupText(dlg.line.speaker, locale) : null
  const text = dlg ? lookupText(dlg.line.text, locale) : null

  return (
    <div className="preview-wrap">
      <div className="preview-bar">
        <span className="t">▶ 演出预览</span>
        <button
          type="button"
          className="pv-btn"
          onClick={() => {
            if (mode === 'running') playback.pause()
            else if (mode === 'paused') playback.resume()
            else playback.play(sourceKey, stages, { ownerId: focusEntityId })
          }}
        >
          {mode === 'running' ? '⏸ 暂停' : mode === 'paused' ? '▶ 继续' : '▶ 播放'}
        </button>
        <button
          type="button"
          className="pv-btn"
          onClick={() =>
            mode === 'idle' || mode === 'done'
              ? playback.play(sourceKey, stages, { paused: true })
              : playback.step()
          }
        >
          ⏭ 单步
        </button>
        <button
          type="button"
          className="pv-btn"
          onClick={() => playback.stop()}
          disabled={mode === 'idle'}
        >
          ⏹ 重置
        </button>
        <select
          className="pv-speed"
          value={String(playback.speed)}
          onChange={(e) => {
            playback.speed = Number(e.target.value)
          }}
        >
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="2">2×</option>
          <option value="4">4×</option>
        </select>
        <button
          type="button"
          className="pv-btn"
          title="真引擎里跳到事件现场试玩(X5;读磁盘工程,改动须先 💾 保存;需 reforge dev:pal 在跑)"
          onClick={() => {
            // 落点:触发实体邻格(下方一格 —— touch range≥1 走近即触发,interact 面对面按空格);
            // onEnter 源无实体 → 不带 pos,走场景入口。
            const e = focusEntityId ? scene.entities.find((x) => x.id === focusEntityId) : undefined
            const pos = e ? `&pos=${e.pos.col},${e.pos.row + 1}&facing=up` : ''
            window.open(`http://${location.hostname}:6051/?scene=${scene.id}${pos}`, '_blank')
          }}
        >
          🎮 引擎试玩
        </button>
        <span className="spacer" />
        <span className="pv-mode">
          {mode === 'running'
            ? '播放中'
            : mode === 'paused'
              ? '已暂停(单步可用)'
              : mode === 'done'
                ? '播放完毕'
                : '就绪'}
        </span>
      </div>
      <div ref={wrapRef} className="preview-stage">
        <canvas ref={canvasRef} width={size.w} height={size.h} />
        {status === 'loading' ? <div className="preview-tip">加载资产…</div> : null}
        {status === 'error' ? <div className="preview-tip err">{err}</div> : null}
        {dlg ? (
          <div className="preview-dialog">
            {speaker ? <span className="spk">{speaker}</span> : null}
            <span className="txt">{text}</span>
            <button type="button" className="pv-btn" onClick={() => playback.confirmDialog()}>
              继续 ▾
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
