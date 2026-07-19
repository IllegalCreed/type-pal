import type { AssetId, BattleSpriteDef, BattleSpriteProfileKind } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import {
  BattleSpriteAssetCache,
  bakeFrame,
  loadBattleSpriteDefinition,
  loadStandardPalette,
} from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'

const WIDTH = 180
const HEIGHT = 150

export interface BattleSpritePreviewFrame {
  index: number
  width: number
  height: number
}

/** 解码证明必须与当前 AssetId + catalog SHA 绑定，不能跨资源复用裸帧数。 */
export interface BattleSpritePreviewProof {
  asset: AssetId
  sha256: string
  actualFrameCount: number
  frames: readonly BattleSpritePreviewFrame[]
}

function drawCentered(
  context: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  width: number,
  height: number,
  maxScale: number,
): void {
  context.clearRect(0, 0, width, height)
  context.imageSmoothingEnabled = false
  const scale = Math.min((width - 8) / image.width, (height - 8) / image.height, maxScale)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  context.drawImage(image, (width - drawWidth) / 2, height - 4 - drawHeight, drawWidth, drawHeight)
}

function FrameThumbnail(props: { frame: HTMLCanvasElement; index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (context) drawCentered(context, props.frame, 82, 72, 2)
  }, [props.frame])
  return (
    <figure className="battle-frame-thumb">
      <canvas
        ref={canvasRef}
        width={82}
        height={72}
        role="img"
        aria-label={`战斗精灵第 ${props.index} 帧预览`}
      />
      <figcaption>
        <b>#{props.index}</b>
        <span>
          {props.frame.width}×{props.frame.height}
        </span>
      </figcaption>
    </figure>
  )
}

export function BattleSpriteInlinePreview(props: {
  definition?: BattleSpriteDef
  expected: BattleSpriteProfileKind
  assetBase: AssetBase
  assetReader: EditorAssetReader
  frameMs?: number
  frameSequence?: readonly number[]
  /** 命名动作身份；变化时从首帧重新播放，避免复用上一动作 tick。 */
  sequenceKey?: string
  playAllFrames?: boolean
  onLoaded?: (proof: BattleSpritePreviewProof | undefined) => void
}) {
  const cacheRef = useRef(new BattleSpriteAssetCache(4))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frames, setFrames] = useState<HTMLCanvasElement[] | null>()
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  const asset = props.definition?.asset
  let revision: string | undefined
  let recordError = ''
  if (asset) {
    try {
      revision = props.assetReader.record(asset, 'battle-sprite').sha256
    } catch (reason) {
      recordError = reason instanceof Error ? reason.message : String(reason)
    }
  }

  useEffect(() => {
    let alive = true
    props.onLoaded?.(undefined)
    setFrames(undefined)
    setError('')
    setTick(0)
    const context = canvasRef.current?.getContext('2d')
    context?.clearRect(0, 0, WIDTH, HEIGHT)
    if (!props.definition || !asset || !revision) {
      setFrames(null)
      if (recordError) setError(recordError)
      return () => {
        alive = false
      }
    }
    void Promise.all([
      loadBattleSpriteDefinition(
        cacheRef.current,
        props.assetReader,
        props.definition,
        props.expected,
      ),
      loadStandardPalette(props.assetBase),
    ])
      .then(([loaded, palette]) => {
        if (!alive) return
        const baked = loaded.sprite.frames.map((frame) => bakeFrame(frame, palette))
        setFrames(baked)
        props.onLoaded?.({
          asset,
          sha256: revision,
          actualFrameCount: baked.length,
          frames: baked.map((frame, index) => ({
            index,
            width: frame.width,
            height: frame.height,
          })),
        })
      })
      .catch((reason: unknown) => {
        if (!alive) return
        props.onLoaded?.(undefined)
        setError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => {
      alive = false
    }
  }, [
    asset,
    props.assetBase,
    props.assetReader,
    props.definition,
    props.expected,
    props.onLoaded,
    recordError,
    revision,
  ])

  const sequence = useMemo(() => {
    if (!frames?.length || !props.definition) return []
    if (props.frameSequence) return [...props.frameSequence]
    if (props.playAllFrames) return frames.map((_, index) => index)
    const profile = props.definition.profile
    if (profile.kind === 'player-fighter') return [profile.frames.idle]
    if (profile.kind === 'enemy')
      return Array.from({ length: profile.idle.count }, (_, index) => profile.idle.start + index)
    return frames.map((_, index) => index)
  }, [frames, props.definition, props.frameSequence, props.playAllFrames])
  useEffect(() => {
    if (props.sequenceKey === undefined) return
    setTick(0)
  }, [props.sequenceKey])

  useEffect(() => {
    if (sequence.length <= 1) return
    const timer = window.setInterval(() => setTick((value) => value + 1), props.frameMs ?? 200)
    return () => window.clearInterval(timer)
  }, [props.frameMs, sequence.length])

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context || !frames?.length || !sequence.length) return
    const image = frames[sequence[tick % sequence.length] ?? 0]
    if (image) drawCentered(context, image, WIDTH, HEIGHT, 2)
  }, [frames, sequence, tick])

  return (
    <div className="fire-preview ef-inline-preview battle-sprite-preview">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label={props.definition ? `${props.definition.label}战斗精灵动画预览` : '战斗精灵预览'}
      />
      {frames === undefined && !error && <div className="hint2">加载战斗精灵…</div>}
      {frames === null && <div className="hint2">战斗精灵定义不存在</div>}
      {error && (
        <div className="err" role="status" aria-live="polite">
          {error}
        </div>
      )}
      {frames?.length ? (
        <>
          <div className="hint2">
            {props.definition?.label} · {props.definition?.id} · {frames.length} 帧
          </div>
          {props.playAllFrames ? (
            <section className="battle-frame-grid" aria-label="逐帧预览">
              {frames.map((frame, index) => (
                <FrameThumbnail key={index} frame={frame} index={index} />
              ))}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
