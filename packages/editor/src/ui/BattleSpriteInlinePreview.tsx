import type { AssetId, BattleSpriteDef, BattleSpriteProfileKind } from '@type-pal/content'
import type { AssetBase, Palette, RleFrame } from '@type-pal/reforge'
import {
  BattleSpriteAssetCache,
  bakeFrame,
  loadBattleSpriteDefinition,
  loadStandardPalette,
} from '@type-pal/reforge'
import { type DragEvent as ReactDragEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  RawFrameInspector,
  type SemanticFrameGroup,
  SemanticFrameShelf,
  type SpriteFrameView,
} from './SpriteFrameWorkbench.js'

import { drawFootAlignedFrame } from './sprite-frame-canvas.js'

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

export interface BattleSpriteResourceSnapshot {
  frames: readonly RleFrame[]
  palette: Palette
  baked: readonly HTMLCanvasElement[]
}

interface LoadedPreview {
  asset: AssetId
  revision: string
  frames: HTMLCanvasElement[]
}

function FrameThumbnail(props: { frame: HTMLCanvasElement; index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) drawFootAlignedFrame(canvas, props.frame, 82, 72, 2)
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
      <span className="battle-frame-caption">
        <b>#{props.index}</b>
        <span>
          {props.frame.width}×{props.frame.height}
        </span>
      </span>
    </figure>
  )
}

export function BattleSpriteInlinePreview(props: {
  definition?: BattleSpriteDef
  /** 无用途配置的帧源也可直接预览，避免伪造 summon profile。 */
  asset?: AssetId
  label?: string
  expected?: BattleSpriteProfileKind
  assetBase: AssetBase
  assetReader: EditorAssetReader
  frameMs?: number
  /** 角色页已有完整动作架时可隐藏重复的单帧主画布。 */
  showPrimaryPreview?: boolean
  /** 资源库使用中心栏宽布局；缺省保持技能等处的紧凑预览。 */
  layout?: 'compact' | 'library'
  onFrameSelect?: (index: number) => void
  playAllFrames?: boolean
  onLoaded?: (proof: BattleSpritePreviewProof | undefined) => void
  onResourceLoaded?: (snapshot: BattleSpriteResourceSnapshot | undefined) => void
  semanticGroups?: readonly SemanticFrameGroup[]
  semanticPresentation?: 'full' | 'embedded'
  consumerCount?: number
  onDefinitionSelect?: (id: string) => void
  onRawAppend?: () => void
  onRawReplace?: (index: number) => void
  onRawDelete?: (index: number) => void
  onRawFrameDragStart?: (event: ReactDragEvent<HTMLButtonElement>, index: number) => void
  rawEditorBusy?: boolean
  rawEditorMessage?: string
  rawEditorMessageKind?: 'info' | 'error'
  rawEditorPanel?: React.ReactNode
  /** 资源库外层已经提供固定标题时，内部只渲染可滚动的帧编辑内容。 */
  showHero?: boolean
}) {
  const [cache] = useState(() => new BattleSpriteAssetCache(4))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loadedPreview, setLoadedPreview] = useState<LoadedPreview | null>()
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const [selectedRawFrame, setSelectedRawFrame] = useState(0)

  const asset = props.definition?.asset ?? props.asset
  const label = props.definition?.label ?? props.label ?? asset
  const definitionId = props.definition?.id
  const showPrimaryPreview = props.showPrimaryPreview !== false
  let revision: string | undefined
  let recordError = ''
  if (asset) {
    try {
      revision = props.assetReader.record(asset, 'battle-sprite').sha256
    } catch (reason) {
      recordError = reason instanceof Error ? reason.message : String(reason)
    }
  }

  // 加载和绘制 effect 可在同一次提交执行，旧资源的帧不可画回已清空的画布。
  const currentPreview =
    loadedPreview?.asset === asset && loadedPreview?.revision === revision
      ? loadedPreview
      : undefined
  const frames = loadedPreview === null ? null : currentPreview?.frames

  useEffect(() => {
    let alive = true
    props.onLoaded?.(undefined)
    props.onResourceLoaded?.(undefined)
    setLoadedPreview(undefined)
    setError('')
    setTick(0)
    const context = canvasRef.current?.getContext('2d')
    context?.clearRect(0, 0, WIDTH, HEIGHT)
    if (!asset || !revision) {
      setLoadedPreview(null)
      if (recordError) setError(recordError)
      return () => {
        alive = false
      }
    }
    const spritePromise =
      props.definition && props.layout !== 'library'
        ? loadBattleSpriteDefinition(
            cache,
            props.assetReader,
            props.definition,
            props.expected ?? props.definition.profile.kind,
          ).then((loaded) => loaded.sprite)
        : cache.load(props.assetReader, asset)
    void Promise.all([spritePromise, loadStandardPalette(props.assetBase)])
      .then(([sprite, palette]) => {
        if (!alive) return
        const baked = sprite.frames.map((frame) => bakeFrame(frame, palette))
        setLoadedPreview({ asset, revision, frames: baked })
        setSelectedRawFrame((index) => Math.min(index, baked.length - 1))
        props.onResourceLoaded?.({ frames: sprite.frames, palette, baked })
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
        props.onResourceLoaded?.(undefined)
        setError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => {
      alive = false
    }
  }, [
    asset,
    cache,
    props.assetBase,
    props.assetReader,
    props.definition,
    props.expected,
    props.onLoaded,
    props.onResourceLoaded,
    props.layout,
    recordError,
    revision,
  ])

  const sequence = useMemo(() => {
    if (!frames?.length) return []
    if (props.playAllFrames) return frames.map((_, index) => index)
    if (!props.definition) return [0]
    const profile = props.definition.profile
    if (profile.kind === 'player-fighter') return [profile.frames.idle]
    if (profile.kind === 'enemy')
      return Array.from({ length: profile.idle.count }, (_, index) => profile.idle.start + index)
    return [0]
  }, [frames, props.definition, props.playAllFrames])

  useEffect(() => {
    if (sequence.length <= 1) return
    const timer = window.setInterval(() => setTick((value) => value + 1), props.frameMs ?? 200)
    return () => window.clearInterval(timer)
  }, [props.frameMs, sequence.length])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frames?.length || !sequence.length) return
    const image = frames[sequence[tick % sequence.length] ?? 0]
    if (image) drawFootAlignedFrame(canvas, image, WIDTH, HEIGHT, 2)
  }, [frames, sequence, tick])

  const frameViews: SpriteFrameView[] = useMemo(
    () =>
      (frames ?? []).map((frame) => ({ canvas: frame, width: frame.width, height: frame.height })),
    [frames],
  )

  if (props.layout === 'library') {
    if (frames === undefined)
      return (
        <div
          className={`insp-empty sprite-resource-load-state${error ? ' error' : ''}`}
          role={error ? 'alert' : 'status'}
        >
          {error || '加载战斗精灵原始帧…'}
        </div>
      )
    if (frames === null || error)
      return (
        <div className="insp-empty sprite-resource-load-state error" role="alert">
          {error || '战斗精灵源文件不存在'}
        </div>
      )
    const selectFrame = (index: number): void => {
      setSelectedRawFrame(index)
      props.onFrameSelect?.(index)
    }
    return (
      <div className="battle-sprite-resource-workbench">
        <RawFrameInspector
          label={label ?? asset ?? '战斗精灵'}
          asset={asset ?? ''}
          frames={frameViews}
          selectedFrame={selectedRawFrame}
          consumerCount={props.consumerCount ?? 0}
          onSelect={selectFrame}
          onAppend={props.onRawAppend}
          onReplace={props.onRawReplace ? () => props.onRawReplace?.(selectedRawFrame) : undefined}
          onDelete={props.onRawDelete ? () => props.onRawDelete?.(selectedRawFrame) : undefined}
          onFrameDragStart={props.onRawFrameDragStart}
          busy={props.rawEditorBusy}
          editorMessage={props.rawEditorMessage}
          editorMessageKind={props.rawEditorMessageKind}
          editorPanel={props.rawEditorPanel}
          showHero={props.showHero}
        />
        <SemanticFrameShelf
          frames={frameViews}
          groups={props.semanticGroups ?? []}
          onGroupSelect={props.onDefinitionSelect}
          onFrameSelect={selectFrame}
        />
      </div>
    )
  }

  return (
    <div className="battle-sprite-preview">
      {showPrimaryPreview ? (
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          role="img"
          aria-label={label ? `${label}战斗精灵动画预览` : '战斗精灵预览'}
        />
      ) : null}
      {frames === undefined && !error && <div className="hint2">加载战斗精灵…</div>}
      {frames === null && <div className="hint2">战斗精灵源文件不存在</div>}
      {error && (
        <div className="err" role="status" aria-live="polite">
          {error}
        </div>
      )}
      {frames?.length ? (
        <>
          {showPrimaryPreview ? (
            <div className="hint2">
              {label}
              {definitionId ? ` · ${definitionId}` : ''} · {frames.length} 帧
            </div>
          ) : null}
          {props.semanticGroups?.length ? (
            <SemanticFrameShelf
              frames={frameViews}
              groups={props.semanticGroups}
              presentation={props.semanticPresentation}
              onGroupSelect={props.onDefinitionSelect}
            />
          ) : null}
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
