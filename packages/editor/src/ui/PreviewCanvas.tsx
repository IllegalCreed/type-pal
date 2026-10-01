/**
 * 演出预览画布(v0)—— 事件模式内嵌:播放/暂停/单步/重置/倍速 + 对话条。
 * 渲染复用 reforge renderSceneFrame;演出态来自 Playback.view(overlay,不碰编辑数据)。
 * 帧下标语义与引擎一致:定帧(setEntityFrame)优先 → 走帧(anim) → 站立;玩家 gesture 优先。
 * 相机跟随玩家(贴游戏观感;编辑自由视角归布置模式)。
 */

import type {
  ActorDef,
  AuthorCommand,
  AuthorScriptFlow,
  AuthorScriptLibrary,
  Command,
  FlowCursor,
  Locale,
  MapIndexV1,
  SceneDef,
  ScriptStage,
  SpriteDef,
  TriggerActivation,
} from '@type-pal/content'
import { gridToPixel, lookupText, resolveEntitySpriteId, spriteScreenY } from '@type-pal/content'
import type { AssetBase, ProjectMap, SpriteDraw } from '@type-pal/reforge'
import {
  actualFrameIndex,
  idleFrameIndex,
  renderSceneFrame,
  walkFrameIndex,
} from '@type-pal/reforge'
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { type EditorPlayIdentity, playProjectQuery } from '../core/play-url.js'
import type { Playback } from '../core/playback.js'
import { previewFlowCursor, previewStepLabel } from '../core/script-flow-preview.js'
import {
  collectScriptMovementPreview,
  type ScriptMovementPreview,
} from '../core/script-movement-preview.js'
import { DsButton, DsSelect, DsTag, DsToolbar } from './design-system/index.js'
import {
  drawGridBlocked,
  drawTriggerHighlight,
  useSceneAssets,
  useStageSize,
  useViewZoomPan,
} from './scene-stage.js'

const DEFAULT_ZOOM = 2
const ROUTE_COLORS = ['#78d8ff', '#ffbf69', '#b2ef8e', '#d6a4ff', '#ff91bc', '#71e5cc']

/** Keep numbered nodes clear of the legend and the viewport edge. */
export function fitScriptMovementPreview(
  preview: ScriptMovementPreview,
  size: { w: number; h: number },
): { center: { x: number; y: number }; zoom: number } | undefined {
  const points = preview.tracks.flatMap((track) => track.nodes.map((node) => gridToPixel(node.pos)))
  if (!points.length) return undefined
  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  const zoom = Math.max(
    0.04,
    Math.min(
      DEFAULT_ZOOM,
      Math.max(1, size.w - 48) / Math.max(1, maxX - minX),
      Math.max(1, size.h - 90) / Math.max(1, maxY - minY),
    ),
  )
  return { center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 - 21 / zoom }, zoom }
}

/** Use the renderer's actual camera and scale; route dots mark logical map coordinates. */
export function drawScriptMovementPreview(
  ctx: Pick<
    CanvasRenderingContext2D,
    | 'save'
    | 'restore'
    | 'lineJoin'
    | 'lineCap'
    | 'setLineDash'
    | 'beginPath'
    | 'moveTo'
    | 'lineTo'
    | 'strokeStyle'
    | 'lineWidth'
    | 'stroke'
    | 'closePath'
    | 'arc'
    | 'fillStyle'
    | 'fill'
    | 'font'
    | 'textAlign'
    | 'textBaseline'
    | 'fillText'
  >,
  preview: ScriptMovementPreview,
  camera: { x: number; y: number },
  zoom: number,
): void {
  if (preview.tracks.length === 0) return
  const screenPoint = (pos: import('@type-pal/content').GridPos) => {
    const pixel = gridToPixel(pos)
    return { x: (pixel.x - camera.x) * zoom, y: (pixel.y - camera.y) * zoom }
  }
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const [index, track] of preview.tracks.entries()) {
    const color = ROUTE_COLORS[index % ROUTE_COLORS.length] ?? '#78d8ff'
    for (const segment of track.segments) {
      const from = screenPoint(segment.from.pos)
      const to = screenPoint(segment.to.pos)
      ctx.setLineDash(segment.conditional ? [6, 4] : [])
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.strokeStyle = '#10151ce6'
      ctx.lineWidth = 5
      ctx.stroke()
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.stroke()
    }
    for (const node of track.nodes) {
      const point = screenPoint(node.pos)
      const radius = node.kind === 'start' ? 4 : 9
      ctx.setLineDash(node.conditional ? [3, 2] : [])
      ctx.beginPath()
      if (node.kind === 'teleport') {
        ctx.moveTo(point.x, point.y - radius - 2)
        ctx.lineTo(point.x + radius + 2, point.y)
        ctx.lineTo(point.x, point.y + radius + 2)
        ctx.lineTo(point.x - radius - 2, point.y)
        ctx.closePath()
      } else ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = node.conditional ? '#152536' : color
      ctx.fill()
      ctx.strokeStyle = node.conditional ? color : '#10151c'
      ctx.lineWidth = 2
      ctx.stroke()
      if (node.number !== undefined) {
        ctx.setLineDash([])
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = node.conditional ? color : '#10151c'
        ctx.fillText(String(node.number), point.x, point.y + 0.5)
      }
    }
  }
  ctx.restore()
}

/** 收集脚本树里所有 world-sprite 语义 id（含换装、appearance 与编外跟随者）。 */
function collectScriptSprites(stages: readonly ScriptStage[]): string[] {
  const out = new Set<string>()
  const walk = (cmds: readonly Command[]): void => {
    for (const c of cmds) {
      if (c.kind === 'setActorSprite') out.add(c.sprite)
      if (c.kind === 'setActorAppearance' && c.spriteId) out.add(c.spriteId)
      if (c.kind === 'setFollowers') for (const sprite of c.sprites) out.add(sprite)
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
        for (const st of c.stages ?? []) walk(st.body)
    }
  }
  for (const st of stages) walk(st.body)
  return [...out]
}

function collectCanonicalScriptSprites(
  flow: AuthorScriptFlow,
  sharedScripts: AuthorScriptLibrary,
): string[] {
  const out = new Set<string>()
  const visitedShared = new Set<string>()
  const walk = (commands: readonly AuthorCommand[]): void => {
    for (const command of commands) {
      if (command.kind === 'setActorSprite') out.add(command.sprite)
      if (command.kind === 'setActorAppearance' && command.spriteId) out.add(command.spriteId)
      if (command.kind === 'setFollowers') for (const sprite of command.sprites) out.add(sprite)
      if (command.kind === 'branch') {
        walk(command.then)
        walk(command.else ?? [])
      } else if (command.kind === 'confirm') {
        walk(command.onNo)
      } else if (command.kind === 'startBattle') {
        walk(command.onLose ?? [])
        walk(command.onFlee ?? [])
      } else if (command.kind === 'loop') {
        walk(command.body)
      } else if (command.kind === 'teleportOut') {
        walk(command.onFail ?? [])
      } else if (command.kind === 'callScript' && !visitedShared.has(command.script)) {
        visitedShared.add(command.script)
        const shared = sharedScripts[command.script]
        if (shared) walk(shared.body)
      }
    }
  }
  if (flow.kind === 'stages') {
    for (const stage of flow.stages) {
      walk(stage.entry?.prepare ?? [])
      walk(stage.body)
    }
  } else {
    for (const state of Object.values(flow.machine.states)) {
      walk(state.entry?.prepare ?? [])
      walk(state.body)
    }
  }
  return [...out]
}

export function PreviewCanvas(props: {
  scene: SceneDef
  stages: readonly ScriptStage[]
  sourceKey: string
  /** Content transport and workspace save identity are supplied together, never guessed here. */
  playIdentity: EditorPlayIdentity
  /** 当前源的触发实体(未播时镜头对准它;onEnter 源 undefined = 对准玩家)。 */
  focusEntityId: string | undefined
  /** 焦点实体当前 canonical 页的静态触发方式，用于共享黄色范围高亮。 */
  focusTriggerActivation?: TriggerActivation
  sprites: SpriteDef[]
  actorsById: Record<string, ActorDef>
  leaderSpriteId: string | undefined
  assetBase: AssetBase
  assetCatalog: import('@type-pal/content').AssetCatalogV1
  assetReader: import('../core/editor-asset-reader.js').EditorAssetReader
  /** 自有地图实时副本(键 = 稳定 map id);own 场景从此渲染(不落磁盘)。 */
  projectMaps: Record<string, ProjectMap>
  mapIndex: MapIndexV1
  /** tileset 注册表。 */
  tilesets: readonly import('@type-pal/reforge').TilesetDef[]
  locale: Locale
  playback: Playback
  /** 当前作者态入口：直接启动原始 flow；缺省使用运行时投影的 stages。 */
  startPlayback?: (paused: boolean) => void
  canonicalFlow?: AuthorScriptFlow
  canonicalCursor?: FlowCursor
  canonicalSceneEntry?: boolean
  canonicalSharedScripts?: AuthorScriptLibrary
  /** 网格/禁入/透视叠加(与布置模式同一开关;共享层绘制)。 */
  layers?: { grid: boolean; blocked: boolean; ghosts?: boolean }
  /** 无活动脚本源时的底部提示(地图仍照常渲染;缺省 = 不显示)。 */
  hint?: string
  /** 纯浏览(无活动源)时相机框住场景内容而非玩家 —— 进场点可能在空区(s119),别对着黑。 */
  sceneFraming?: boolean
}) {
  const {
    scene,
    stages,
    sourceKey,
    playIdentity,
    focusEntityId,
    focusTriggerActivation,
    sprites,
    actorsById,
    leaderSpriteId,
    assetBase,
    assetCatalog,
    assetReader,
    projectMaps,
    mapIndex,
    tilesets,
    locale,
    playback,
    startPlayback,
    canonicalFlow,
    canonicalCursor,
    canonicalSceneEntry,
    canonicalSharedScripts,
    layers,
    hint,
    sceneFraming,
  } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const confirmNoRef = useRef<HTMLButtonElement>(null)
  // Playback 是可变控制器，speed 本身不发 React 更新；选择器用本地视图态保持受控值同步。
  const [previewSpeed, setPreviewSpeed] = useState(playback.speed)
  useEffect(() => setPreviewSpeed(playback.speed), [playback])
  // UI 重渲由宿主订阅 playback.onUi 驱动:父重渲 → 本组件(未 memo)必重渲,
  // 控制条/对话条读到最新 playback 状态;canvas 本体由 rAF 自绘,不依赖 React。
  // 共享层:容器自适应 + 视图态(滚轮缩放;pan = 相对导演相机的偏移,拖拽累积)
  const size = useStageSize(wrapRef, 80)
  const { view, viewRef, setView } = useViewZoomPan({
    canvasRef,
    initial: { zoom: DEFAULT_ZOOM, panX: 0, panY: 0 },
    centerAnchor: true,
  })
  const panDragRef = useRef<{ sx: number; sy: number; panX: number; panY: number } | null>(null)
  const movementPreview = useMemo(
    () =>
      canonicalFlow
        ? collectScriptMovementPreview({
            scene,
            flow: canonicalFlow,
            cursor: canonicalCursor,
            sceneEntry: canonicalSceneEntry,
            sharedScripts: canonicalSharedScripts,
            self: focusEntityId ? { scene: scene.id, entity: focusEntityId } : undefined,
          })
        : { tracks: [], notes: [] },
    [
      scene,
      canonicalFlow,
      canonicalCursor,
      canonicalSceneEntry,
      canonicalSharedScripts,
      focusEntityId,
    ],
  )
  const [framedMovement, setFramedMovement] = useState<ScriptMovementPreview>()
  const routeFramed = framedMovement === movementPreview
  const routeFrame = useMemo(
    () => fitScriptMovementPreview(movementPreview, size),
    [movementPreview, size],
  )
  const movementStepLabel = canonicalFlow
    ? previewStepLabel(canonicalFlow, previewFlowCursor(canonicalFlow, canonicalCursor))
    : '当前步骤'

  const spriteById = useMemo(() => new Map(sprites.map((s) => [s.id, s])), [sprites])
  const entityDef = (e: SceneDef['entities'][number]): SpriteDef | undefined => {
    const sid = resolveEntitySpriteId(e, actorsById)
    return sid ? spriteById.get(sid) : undefined
  }
  // 预载:全部实体(含 hidden,演出会显形)+ 玩家 + 换装表
  // biome-ignore lint/correctness/useExhaustiveDependencies: entityDef 为 spriteById/actorsById 纯派生
  const spriteAssets = useMemo(() => {
    const assets = new Set<string>()
    const lead = leaderSpriteId ? spriteById.get(leaderSpriteId) : undefined
    if (lead) assets.add(lead.asset)
    for (const e of scene.entities) {
      const d = entityDef(e)
      if (d) assets.add(d.asset)
    }
    const scriptSprites =
      canonicalFlow && canonicalSharedScripts
        ? collectCanonicalScriptSprites(canonicalFlow, canonicalSharedScripts)
        : collectScriptSprites(stages)
    for (const sid of scriptSprites) {
      const d = spriteById.get(sid)
      if (d) assets.add(d.asset)
    }
    return [...assets]
  }, [canonicalFlow, canonicalSharedScripts, scene, stages, spriteById, leaderSpriteId])
  const { status, err, loadedRef } = useSceneAssets({
    canvasRef,
    assetBase,
    mapId: scene.mapId,
    spriteAssets,
    projectMaps,
    mapIndex,
    tilesets,
    assetCatalog,
    assetReader,
  })

  // rAF:tick 演出 + 合成一帧
  // biome-ignore lint/correctness/useExhaustiveDependencies: entityDef/spriteById 纯派生;rAF 每帧读最新
  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!loaded || !canvas || !ctx) return
    const { renderer, map, spritesByAsset } = loaded
    let raf = 0
    let last = performance.now()
    const leadDef = leaderSpriteId ? spriteById.get(leaderSpriteId) : undefined
    // 相机中心(世界像素):向兴趣点平滑趋近;首帧直达(免开场长飘)
    let cam: { x: number; y: number } | null = null

    /** 镜头目标:播放中 = Playback.poi(命令即导演);未播 = 选中源的触发实体(看得见主体)。 */
    const camTarget = (): { x: number; y: number } => {
      if (routeFramed && routeFrame) return routeFrame.center
      const v = playback.view
      if (playback.poi) {
        const g = playback.poiPos()
        return gridToPixel(g)
      }
      if (focusEntityId) {
        const e = scene.entities.find((x) => x.id === focusEntityId)
        if (e) return gridToPixel(e.pos)
      }
      // 纯浏览(无源无焦点)→ 对准场景**内容**:进场点/几何中心都可能在空区(s119 进场点在右下角黑区,
      // 建筑只占整图一小块),唯一可靠的"内容在哪"= 实体(NPC/物件)所在 → 取质心。无实体才退回房间中心。
      if (sceneFraming) {
        const es = scene.entities
        if (es.length) {
          let sc = 0
          let sr = 0
          for (const e of es) {
            sc += e.pos.col
            sr += e.pos.row
          }
          return gridToPixel({ col: sc / es.length, row: sr / es.length, height: 0 })
        }
        const room = { col: 0, row: 0, cols: map.width, rows: map.height }
        return gridToPixel({
          col: room.col + room.cols / 2,
          row: room.row + room.rows / 2,
          height: 0,
        })
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
        const ghost = hidden && !!layers?.ghosts // 透视:隐藏实体半透明可见(剧情后期出场的 NPC)
        if (hidden && !ghost) continue
        const def = entityDef(e)
        const sp = def ? spritesByAsset.get(def.asset) : undefined
        if (!def || !sp) continue
        const pos = ov?.pos ?? e.pos
        const facing = ov?.facing ?? e.facing ?? 'down'
        const fi =
          ov?.frame !== undefined
            ? actualFrameIndex(
                idleFrameIndex(def.layout, facing, sp.frames.length) + ov.frame,
                sp.frames.length,
              )
            : ov?.anim !== undefined
              ? walkFrameIndex(def.layout, facing, ov.anim, sp.frames.length)
              : idleFrameIndex(def.layout, facing, sp.frames.length)
        const f = sp.frames[fi]
        if (!f) continue
        const p = gridToPixel(pos)
        draws.push({
          frame: f,
          worldX: p.x,
          worldY: spriteScreenY(pos),
          anchorX: Math.floor(f.width / 2),
          anchorY: f.height,
          baseYBias: e.zBias,
          ...(ghost ? { alpha: 0.45 } : {}),
        })
      }
      // 玩家(gesture/换装)
      const pdefBase = v.player.spriteId ? spriteById.get(v.player.spriteId) : undefined
      const pdef = pdefBase ?? leadDef
      const psp = pdef ? spritesByAsset.get(pdef.asset) : undefined
      if (pdef && psp) {
        const fi =
          v.player.gesture != null
            ? actualFrameIndex(
                idleFrameIndex(pdef.layout, v.player.facing, psp.frames.length) + v.player.gesture,
                psp.frames.length,
              )
            : idleFrameIndex(pdef.layout, v.player.facing, psp.frames.length)
        const f = psp.frames[fi]
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
      // 相机 = 导演(POI 平滑趋近)+ 用户偏移(拖拽/缩放,共享视图态);首帧直达
      const tgt = camTarget()
      if (!cam) cam = { ...tgt }
      else {
        const k = 1 - Math.exp(-dt / 160)
        cam.x += (tgt.x - cam.x) * k
        cam.y += (tgt.y - cam.y) * k
      }
      const { zoom, panX, panY } = viewRef.current
      const camera = {
        x: cam.x - size.w / zoom / 2 + panX,
        y: cam.y - size.h / zoom / 2 + panY,
      }
      const room = { col: 0, row: 0, cols: map.width, rows: map.height }
      renderSceneFrame(ctx, renderer, {
        map,
        room,
        camera,
        sprites: draws,
        worldScale: zoom,
      })
      // 网格/禁入叠加(与布置模式同开关同画法;共享层)
      if (layers) drawGridBlocked(ctx, map, room, { zoom, panX: camera.x, panY: camera.y }, layers)
      // 触发点/面高亮:选中事件的 owner 格描边 + 触发范围面(range 切比雪夫盒,引擎 findTrigger 同源)。
      // zone 实体无精灵,这是它在预览里唯一的可见形态。
      if (focusEntityId) {
        const e = scene.entities.find((x) => x.id === focusEntityId)
        if (e && !(v.entity.get(e.id)?.hidden ?? e.hidden)) {
          drawTriggerHighlight(ctx, e, camera, viewRef.current.zoom, now, {
            activation: focusTriggerActivation,
          })
        } else if (e) {
          drawTriggerHighlight(ctx, e, camera, viewRef.current.zoom, now, {
            activation: focusTriggerActivation,
            ghost: true,
          }) // 隐藏实体:淡显位置仍可寻
        }
      }
      drawScriptMovementPreview(ctx, movementPreview, camera, zoom)
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
  }, [
    status,
    scene,
    size.w,
    size.h,
    playback,
    spriteById,
    leaderSpriteId,
    focusEntityId,
    focusTriggerActivation,
    layers,
    sceneFraming,
    tilesets,
    movementPreview,
    routeFramed,
    routeFrame,
  ])

  const v = playback.view
  const mode = playback.mode
  const dlg = v.dialog
  const activeConfirm = v.confirm
  const shownCue = dlg?.cue ?? (activeConfirm ? v.heldDialog : undefined)
  const speaker = shownCue?.speaker ? lookupText(shownCue.speaker, locale) : null
  const text = shownCue ? shownCue.rows.map((row) => lookupText(row.text, locale)).join('\n') : null
  useEffect(() => {
    if (activeConfirm) confirmNoRef.current?.focus()
  }, [activeConfirm])
  const handleConfirmKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!activeConfirm) return
    if (
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight'
    ) {
      event.preventDefault()
      playback.toggleConfirm()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      playback.submitConfirm()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      playback.answerConfirm(false)
    }
  }
  const openEngineTrial = (): void => {
    // 落点:触发实体邻格(下方一格 —— touch range≥1 走近即触发,interact 面对面按空格);
    // onEnter 源无实体 → 不带 pos,走场景入口。
    const entity = focusEntityId
      ? scene.entities.find((candidate) => candidate.id === focusEntityId)
      : undefined
    const pos = entity ? `&pos=${entity.pos.col},${entity.pos.row + 1}&facing=up` : ''
    window.open(
      `play.html?${playProjectQuery(playIdentity)}&scene=${encodeURIComponent(scene.id)}${pos}`,
      '_blank',
    )
  }

  return (
    <div className="preview-wrap">
      <DsToolbar
        label="演出预览控制"
        size="compact"
        groups={[
          [
            {
              id: 'preview-play',
              label: mode === 'running' ? '暂停' : mode === 'paused' ? '恢复播放' : '播放',
              icon: mode === 'running' ? 'pause' : 'play',
              execute: () => {
                if (mode === 'running') playback.pause()
                else if (mode === 'paused') playback.resume()
                else if (startPlayback) startPlayback(false)
                else playback.play(sourceKey, stages, { ownerId: focusEntityId })
              },
            },
            {
              id: 'preview-step',
              label: '单步',
              icon: 'skip-forward',
              disabled: playback.view.confirm !== null,
              disabledReason: playback.view.confirm ? '请先选择“是”或“否”' : undefined,
              execute: () => {
                if (mode === 'idle' || mode === 'done') {
                  if (startPlayback) startPlayback(true)
                  else playback.play(sourceKey, stages, { paused: true, ownerId: focusEntityId })
                }
                playback.step()
              },
            },
            {
              id: 'preview-reset',
              label: '重置',
              icon: 'stop',
              disabled: mode === 'idle',
              disabledReason: mode === 'idle' ? '尚未开始播放' : undefined,
              execute: () => playback.stop(),
            },
            {
              id: 'preview-engine-trial',
              label: '引擎试玩',
              icon: 'open',
              execute: openEngineTrial,
            },
          ],
        ]}
        trailing={
          <div className="preview-toolbar__trailing">
            <div className="preview-toolbar__speed">
              <DsSelect
                aria-label="预览速度"
                size="compact"
                value={String(previewSpeed)}
                options={[
                  { value: '0.5', label: '0.5×' },
                  { value: '1', label: '1×' },
                  { value: '2', label: '2×' },
                  { value: '4', label: '4×' },
                ]}
                onValueChange={(value) => {
                  const nextSpeed = Number(value)
                  playback.speed = nextSpeed
                  setPreviewSpeed(nextSpeed)
                }}
              />
            </div>
            <DsTag tone="neutral">
              {playback.view.confirm
                ? '等待选择'
                : mode === 'running'
                  ? '播放中'
                  : mode === 'paused'
                    ? '已暂停'
                    : mode === 'done'
                      ? '播放完毕'
                      : '就绪'}
            </DsTag>
            {playback.stepNumber > 0 && (
              <DsTag tone="neutral">
                {mode === 'done'
                  ? `共执行 ${playback.stepNumber} 条`
                  : `当前第 ${playback.stepNumber} 条指令`}
              </DsTag>
            )}
          </div>
        }
      />
      <div ref={wrapRef} className="preview-stage">
        <canvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          className="preview-canvas--interactive"
          onPointerDown={(e) => {
            panDragRef.current = {
              sx: e.clientX,
              sy: e.clientY,
              panX: viewRef.current.panX,
              panY: viewRef.current.panY,
            }
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              /* 边缘指针忽略 */
            }
          }}
          onPointerMove={(e) => {
            const pd = panDragRef.current
            if (!pd) return
            const { zoom } = viewRef.current
            setView((v) => ({
              ...v,
              panX: pd.panX - (e.clientX - pd.sx) / zoom,
              panY: pd.panY - (e.clientY - pd.sy) / zoom,
            }))
          }}
          onPointerUp={() => {
            panDragRef.current = null
          }}
        />
        {movementPreview.tracks.length > 0 || movementPreview.notes.length > 0 ? (
          <div
            className="preview-route-legend"
            role="note"
            aria-label="移动轨迹"
            title={movementPreview.notes.join('\n') || '节点编号为编排顺序，起点取作者场景位置。'}
          >
            <div className="preview-route-heading">
              <span>移动轨迹 · {movementStepLabel} · 编排参考，非避障路径</span>
              {routeFrame ? (
                <DsButton
                  size="compact"
                  variant="secondary"
                  onClick={() => {
                    setFramedMovement(movementPreview)
                    setView({ zoom: routeFrame.zoom, panX: 0, panY: 0 })
                  }}
                >
                  显示完整轨迹
                </DsButton>
              ) : null}
            </div>
            <div className="preview-route-targets">
              {movementPreview.tracks.map((track, index) => {
                const target = track.target
                const entity =
                  target.kind === 'entity'
                    ? scene.entities.find((candidate) => candidate.id === target.address.entity)
                    : undefined
                const actor = entity && 'actor' in entity ? actorsById[entity.actor] : undefined
                const label =
                  track.target.kind === 'party'
                    ? '主角队伍'
                    : actor
                      ? lookupText(actor.name, locale)
                      : track.target.address.entity
                return (
                  <span key={index} style={{ color: ROUTE_COLORS[index % ROUTE_COLORS.length] }}>
                    ● {label}
                  </span>
                )
              })}
              {movementPreview.tracks.some((track) =>
                track.nodes.some((node) => node.conditional),
              ) ? (
                <span>虚线：条件 / 循环 / 动态</span>
              ) : null}
              {movementPreview.tracks.some((track) =>
                track.nodes.some((node) => node.kind === 'teleport'),
              ) ? (
                <span>◇ 瞬移 / 摆位</span>
              ) : null}
            </div>
            {movementPreview.notes[0] ? <div>{movementPreview.notes[0]}</div> : null}
          </div>
        ) : null}
        {routeFramed || view.zoom !== DEFAULT_ZOOM || view.panX !== 0 || view.panY !== 0 ? (
          <DsButton
            size="compact"
            variant="secondary"
            className="preview-recenter"
            title="回正:恢复跟随镜头与默认缩放"
            onClick={() => {
              setFramedMovement(undefined)
              setView({ zoom: DEFAULT_ZOOM, panX: 0, panY: 0 })
            }}
          >
            ⌖ 回正 {Math.round((view.zoom / DEFAULT_ZOOM) * 100)}%
          </DsButton>
        ) : null}
        {status === 'loading' ? <div className="preview-tip">加载资产…</div> : null}
        {status === 'error' ? <div className="preview-tip err">{err}</div> : null}
        {status === 'ready' && hint ? <div className="preview-tip hint">{hint}</div> : null}
        {shownCue || v.confirm ? (
          <div className="preview-dialog">
            {speaker ? <span className="spk">{speaker}</span> : null}
            {text ? <span className="txt">{text}</span> : null}
            {v.confirm ? (
              <fieldset className="preview-confirm-actions">
                <legend className="visually-hidden">脚本二选一</legend>
                <DsButton
                  ref={confirmNoRef}
                  size="compact"
                  variant={v.confirm.selectedYes ? 'secondary' : 'primary'}
                  onKeyDown={handleConfirmKeyDown}
                  onClick={() => playback.answerConfirm(false)}
                >
                  否
                </DsButton>
                <DsButton
                  size="compact"
                  variant={v.confirm.selectedYes ? 'primary' : 'secondary'}
                  onKeyDown={handleConfirmKeyDown}
                  onClick={() => playback.answerConfirm(true)}
                >
                  是
                </DsButton>
              </fieldset>
            ) : (
              <DsButton
                size="compact"
                variant="secondary"
                onClick={() => {
                  if (mode === 'paused') playback.step()
                  else playback.confirmDialog()
                }}
              >
                下一句
              </DsButton>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
