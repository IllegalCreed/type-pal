/**
 * 演出预览画布(v0)—— 事件模式内嵌:播放/暂停/单步/重置/倍速 + 对话条。
 * 渲染复用 reforge renderSceneFrame;演出态来自 Playback.view(overlay,不碰编辑数据)。
 * 帧下标语义与引擎一致:定帧(setEntityFrame)优先 → 走帧(anim) → 站立;玩家 gesture 优先。
 * 相机跟随玩家(贴游戏观感;编辑自由视角归布置模式)。
 */

import type {
  ActorDef,
  BaseAuthorCommand,
  Command,
  Locale,
  MapIndexV1,
  SceneDef,
  BaseScriptFlow,
  ScriptStage,
  BaseScriptLibrary,
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
import type { Playback } from '../core/playback.js'
import { playProjectQuery } from '../core/play-url.js'
import { DsButton, DsSelect, DsTag, DsToolbar } from './design-system/index.js'
import {
  drawGridBlocked,
  drawTriggerHighlight,
  useSceneAssets,
  useStageSize,
  useViewZoomPan,
} from './scene-stage.js'

const DEFAULT_ZOOM = 2

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
  flow: BaseScriptFlow,
  sharedScripts: BaseScriptLibrary,
): string[] {
  const out = new Set<string>()
  const visitedShared = new Set<string>()
  const walk = (commands: readonly BaseAuthorCommand[]): void => {
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
  /** 内容项目 id；本地试玩另带 workspaceId，只有不带 workspace 时才明确走 HTTP dev。 */
  projectId: string
  workspaceId?: string
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
  canonicalFlow?: BaseScriptFlow
  canonicalSharedScripts?: BaseScriptLibrary
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
    projectId,
    workspaceId,
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
      `play.html?${playProjectQuery(projectId, workspaceId)}&scene=${encodeURIComponent(scene.id)}${pos}`,
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
              label: mode === 'running' ? '暂停' : mode === 'paused' ? '继续' : '播放',
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
              execute: () => {
                if (mode === 'idle' || mode === 'done') {
                  if (startPlayback) startPlayback(true)
                  else playback.play(sourceKey, stages, { paused: true })
                } else playback.step()
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
              {mode === 'running'
                ? '播放中'
                : mode === 'paused'
                  ? '已暂停'
                  : mode === 'done'
                    ? '播放完毕'
                    : '就绪'}
            </DsTag>
          </div>
        }
      />
      <div ref={wrapRef} className="preview-stage">
        <canvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          style={{ cursor: 'grab', touchAction: 'none' }}
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
        {view.zoom !== DEFAULT_ZOOM || view.panX !== 0 || view.panY !== 0 ? (
          <DsButton
            size="compact"
            variant="secondary"
            className="preview-recenter"
            title="回正:恢复跟随镜头与默认缩放"
            onClick={() => setView({ zoom: DEFAULT_ZOOM, panX: 0, panY: 0 })}
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
              <DsButton size="compact" variant="secondary" onClick={() => playback.confirmDialog()}>
                继续 ▾
              </DsButton>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
