/**
 * 角色精灵帧预览。
 * 源帧、布局与命名动作的权威编辑面位于大世界精灵资源库。
 */

import type { SpriteDef } from '@type-pal/content'
import type { AssetBase, LoadedSprite } from '@type-pal/reforge'
import {
  actualFrameIndex,
  bakeFrame,
  deriveStepCycle,
  loadStandardPalette,
} from '@type-pal/reforge'
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { loadEditorSprite } from '../core/sprite-assets.js'

const DIRS = ['down', 'left', 'up', 'right'] as const
const DIR_LABEL: Record<string, string> = { down: '下', left: '左', up: '上', right: '右' }
const DIR_COLOR: Record<string, string> = {
  down: '#4c9aff',
  left: '#58b37a',
  up: '#e2b340',
  right: '#c792ea',
}

/**
 * 动画预览格：按帧序 order 定时轮播。
 * 节拍与引擎同源；系统要求减少动态效果时固定展示首帧。
 */
function AnimCell(props: {
  canvases: (HTMLCanvasElement | undefined)[]
  order: number[]
  msPerFrame: number
  maxW: number
  maxH: number
  scale: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { canvases, order, msPerFrame, maxW, maxH, scale } = props
  const cw = Math.max(1, Math.round(maxW * scale))
  const ch = Math.max(1, Math.round(maxH * scale))
  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || order.length === 0) return
    canvas.width = cw
    canvas.height = ch
    let frameIndex = 0
    const draw = (): void => {
      context.clearRect(0, 0, cw, ch)
      const requested = order[frameIndex % order.length] ?? 0
      const source = canvases[actualFrameIndex(requested, canvases.length)]
      if (source) {
        context.imageSmoothingEnabled = false
        const width = source.width * scale
        const height = source.height * scale
        context.drawImage(source, (cw - width) / 2, ch - height, width, height)
      }
      frameIndex++
    }
    draw()
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || order.length === 1)
      return
    const timer = setInterval(draw, Math.max(60, msPerFrame))
    return () => clearInterval(timer)
  }, [canvases, order, msPerFrame, cw, ch, scale])
  return <canvas ref={ref} className="fcell-canvas" />
}

/** 每帧在统一包围盒内底对齐居中，避免不同尺寸的源帧被裁切。 */
function FrameCell(props: {
  canvas: HTMLCanvasElement | undefined
  maxW: number
  maxH: number
  scale: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { canvas, maxW, maxH, scale } = props
  const cw = Math.max(1, Math.round(maxW * scale))
  const ch = Math.max(1, Math.round(maxH * scale))
  useEffect(() => {
    const target = ref.current
    const context = target?.getContext('2d')
    if (!target || !context) return
    target.width = cw
    target.height = ch
    context.clearRect(0, 0, cw, ch)
    if (!canvas) return
    context.imageSmoothingEnabled = false
    const width = canvas.width * scale
    const height = canvas.height * scale
    context.drawImage(canvas, (cw - width) / 2, ch - height, width, height)
  }, [canvas, cw, ch, scale])
  return <canvas ref={ref} className="fcell-canvas" />
}

function SpriteFrameTile(props: {
  variant?: 'default' | 'standing' | 'missing'
  style?: CSSProperties
  label: string
  children: ReactNode
}) {
  if (props.variant === 'missing')
    return (
      <div className="fcell frame-missing" style={props.style} role="img" aria-label={props.label}>
        {props.children}
      </div>
    )
  if (props.variant === 'standing')
    return (
      <div className="fcell stand" style={props.style} role="img" aria-label={props.label}>
        {props.children}
      </div>
    )
  return (
    <div className="fcell" style={props.style} role="img" aria-label={props.label}>
      {props.children}
    </div>
  )
}

export function SpriteFrames(props: {
  sprite: SpriteDef
  assetBase: AssetBase
  assetReader: EditorAssetReader
}) {
  const { sprite, assetBase, assetReader } = props
  const record = assetReader.record(sprite.asset, 'sprite')
  const revision = record.sha256
  const [loadedResult, setLoadedResult] = useState<{
    sprite: LoadedSprite
    revision: string
  } | null>(null)
  const loaded = loadedResult?.revision === revision ? loadedResult.sprite : null
  const [baked, setBaked] = useState<HTMLCanvasElement[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    void revision
    let alive = true
    setLoadedResult(null)
    setBaked([])
    setError('')
    void (async () => {
      try {
        const [loadedSprite, palette] = await Promise.all([
          loadEditorSprite(assetReader, sprite.asset),
          loadStandardPalette(assetBase),
        ])
        if (!alive) return
        setLoadedResult({ sprite: loadedSprite, revision })
        setBaked(loadedSprite.frames.map((frame) => bakeFrame(frame, palette)))
      } catch (caught) {
        if (alive) setError(caught instanceof Error ? caught.message : String(caught))
      }
    })()
    return () => {
      alive = false
    }
  }, [assetBase, assetReader, sprite.asset, revision])

  if (error)
    return (
      <div className="insp-empty sprite-frames-empty sprite-frames-empty--error">
        精灵加载失败：{error}
      </div>
    )
  if (!loaded) return <div className="insp-empty sprite-frames-empty">载入精灵 {sprite.asset}…</div>

  const total = loaded.frames.length
  const maxW = baked.length ? Math.max(...baked.map((canvas) => canvas.width)) : 1
  const maxH = baked.length ? Math.max(...baked.map((canvas) => canvas.height)) : 1
  const layout = sprite.layout
  const framesPerDirection = layout.kind === 'directional' ? layout.framesPerDir : 0
  const walkFrameCount = framesPerDirection * 4
  const declaredDemand = Math.max(
    layout.kind === 'directional'
      ? layout.framesPerDir * 4
      : layout.kind === 'loop'
        ? layout.frameCount
        : 1,
    ...Object.values(sprite.poses ?? {}).flatMap((action) =>
      action.steps.map((step) => step.frame + 1),
    ),
  )

  return (
    <div className="sprite-frames">
      <div className="toolbar">
        <span className="sprite-frames-title">{sprite.label}</span>
        <span className="hint sprite-frames-summary">
          {sprite.asset} · {total} 帧 · {layoutDesc(layout)}
        </span>
      </div>
      <div className="frames-preview">
        {declaredDemand > total ? (
          <div className="pose-form sprite-layout-debt" role="status">
            历史布局声明需要 {declaredDemand} 帧，资源实际 {total} 帧；缺失槽按运行时真值回退第 0
            帧，请前往资源库修复。
          </div>
        ) : null}
        {layout.kind === 'directional' ? (
          <>
            {DIRS.map((direction, directionIndex) => (
              <div key={direction} className="dirgroup">
                <div className="gh">
                  <span className="chip" style={{ background: DIR_COLOR[direction] }} />
                  {DIR_LABEL[direction]}({direction})
                  <code>
                    帧 {directionIndex * framesPerDirection}–
                    {directionIndex * framesPerDirection + framesPerDirection - 1} · 站立 ={' '}
                    {directionIndex * framesPerDirection}
                  </code>
                </div>
                <div className="cells">
                  <div
                    className="fcell"
                    role="img"
                    aria-label={`${DIR_LABEL[direction]}向走路动画预览`}
                  >
                    <span className="fidx">▶</span>
                    <AnimCell
                      canvases={baked}
                      order={deriveStepCycle(framesPerDirection).map(
                        (position) => directionIndex * framesPerDirection + position,
                      )}
                      msPerFrame={100}
                      maxW={maxW}
                      maxH={maxH}
                      scale={2}
                    />
                    <span className="ftag">走</span>
                  </div>
                  {Array.from({ length: framesPerDirection }, (_, frameOffset) => {
                    const frame = directionIndex * framesPerDirection + frameOffset
                    const missing = frame >= total
                    return (
                      <SpriteFrameTile
                        key={frame}
                        variant={missing ? 'missing' : frameOffset === 0 ? 'standing' : 'default'}
                        style={{
                          borderColor: `color-mix(in srgb, ${DIR_COLOR[direction]} 45%, var(--line))`,
                        }}
                        label={
                          missing
                            ? `帧 ${frame} 缺失，运行时回退第 0 帧`
                            : `${DIR_LABEL[direction]}向第 ${frameOffset + 1} 帧，帧号 ${frame}${frameOffset === 0 ? '，站立帧' : ''}`
                        }
                      >
                        <span className="fidx">{frame}</span>
                        <FrameCell
                          canvas={baked[actualFrameIndex(frame, total)]}
                          maxW={maxW}
                          maxH={maxH}
                          scale={2}
                        />
                        <span className="ftag">
                          {missing ? '缺失→0' : frameOffset === 0 ? '站立' : `迈${frameOffset}`}
                        </span>
                      </SpriteFrameTile>
                    )
                  })}
                </div>
              </div>
            ))}
            {total > walkFrameCount ? (
              <div className="dirgroup">
                <div className="gh">
                  <span className="chip sprite-frames-action-chip" />
                  动作帧
                  <code>
                    帧 {walkFrameCount}–{total - 1} · 命名/引用见下方姿势
                  </code>
                </div>
                <div className="cells sprite-frames-wrapped-cells">
                  {Array.from({ length: total - walkFrameCount }, (_, offset) => {
                    const frame = walkFrameCount + offset
                    return (
                      <SpriteFrameTile key={frame} label={`动作帧 ${frame}`}>
                        <span className="fidx">{frame}</span>
                        <FrameCell canvas={baked[frame]} maxW={maxW} maxH={maxH} scale={2} />
                      </SpriteFrameTile>
                    )
                  })}
                </div>
              </div>
            ) : null}
            <div className="walk-preview">
              步序预览 {DIR_LABEL.down}：[ {deriveStepCycle(framesPerDirection).join(', ')} ] ·
              与引擎同源 sprite-anim
            </div>
          </>
        ) : (
          <div className="cells sprite-frames-wrapped-cells">
            {layout.kind === 'loop' ? (
              <div className="fcell" role="img" aria-label="循环动画预览">
                <span className="fidx">▶</span>
                <AnimCell
                  canvases={baked}
                  order={Array.from({ length: layout.frameCount }, (_, frame) => frame)}
                  msPerFrame={250}
                  maxW={maxW}
                  maxH={maxH}
                  scale={2}
                />
                <span className="ftag">循环</span>
              </div>
            ) : null}
            {loaded.frames.map((_, frame) => (
              <SpriteFrameTile key={frame} label={`帧 ${frame}`}>
                <span className="fidx">{frame}</span>
                <FrameCell canvas={baked[frame]} maxW={maxW} maxH={maxH} scale={2} />
              </SpriteFrameTile>
            ))}
          </div>
        )}

        <div className="posegroup">
          <div className="posehead">
            <span className="t">特殊动作 · 命名姿势</span>
            <span className="why">绝对帧号（无分方向）· 脚本按名字引用</span>
          </div>
          <div className="poselist">
            {Object.entries(sprite.poses ?? {}).map(([actionId, action]) => (
              <div key={actionId} className="posecard">
                <div className="pc-head">
                  <b>{action.label}</b>
                </div>
                <div className="pf">
                  <AnimCell
                    canvases={baked}
                    order={action.steps.map((step) => step.frame)}
                    msPerFrame={action.steps[0]?.durationMs ?? 250}
                    maxW={maxW}
                    maxH={maxH}
                    scale={1.3}
                  />
                  {action.steps.map((step, index) => (
                    <FrameCell
                      key={`${index}:${step.frame}`}
                      canvas={baked[actualFrameIndex(step.frame, total)]}
                      maxW={maxW}
                      maxH={maxH}
                      scale={1.3}
                    />
                  ))}
                </div>
                <span className="pmode">
                  ▶ {action.loopFrom === undefined ? '单次' : '循环'} · 帧{' '}
                  {action.steps.map((step) => step.frame).join(',')}
                </span>
              </div>
            ))}
            {Object.keys(sprite.poses ?? {}).length === 0 ? (
              <span className="hint">（暂无命名姿势）</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function layoutDesc(layout: SpriteDef['layout']): string {
  if (layout.kind === 'directional') return `行走 4 向 × ${layout.framesPerDir}`
  if (layout.kind === 'loop') return `循环 ${layout.frameCount} 帧`
  return '默认定格 #0'
}
