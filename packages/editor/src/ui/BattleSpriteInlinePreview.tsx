import { DsPressable } from './design-system/index.js'
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

function FrameThumbnail(props: {
  frame: HTMLCanvasElement
  index: number
  labels?: readonly string[]
  selected?: boolean
  onSelect?: (index: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (context) drawCentered(context, props.frame, 82, 72, 2)
  }, [props.frame])
  const content = (
    <>
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
      {props.labels?.length ? (
        <small className="battle-frame-labels">{props.labels.join(' · ')}</small>
      ) : null}
    </>
  )
  if (props.onSelect)
    return (
      <DsPressable
        type="button"
        className={`battle-frame-thumb${props.selected ? ' selected' : ''}`}
        aria-pressed={props.selected}
        aria-label={`选择战斗精灵第 ${props.index} 帧${props.labels?.length ? `，当前标记 ${props.labels.join('、')}` : ''}`}
        onClick={() => props.onSelect?.(props.index)}
      >
        {content}
      </DsPressable>
    )
  return <figure className="battle-frame-thumb">{content}</figure>
}

export function BattleSpriteInlinePreview(props: {
  definition?: BattleSpriteDef
  /** 无用途配置的帧源也可直接预览，避免伪造 summon profile。 */
  asset?: AssetId
  label?: string
  /** 草稿用途可只覆盖显示身份，避免为了改标签而重新解码同一帧源。 */
  displayId?: string
  expected?: BattleSpriteProfileKind
  assetBase: AssetBase
  assetReader: EditorAssetReader
  frameMs?: number
  frameSequence?: readonly number[]
  /** 命名动作身份；变化时从首帧重新播放，避免复用上一动作 tick。 */
  sequenceKey?: string
  /** 只展示完整逐帧平铺，不把互不相干的帧自动串成动作。 */
  showAllFrames?: boolean
  /** 角色页已有完整动作架时可隐藏重复的单帧主画布。 */
  showPrimaryPreview?: boolean
  /** 资源库使用中心栏宽布局；缺省保持技能等处的紧凑预览。 */
  layout?: 'compact' | 'library'
  activeFrames?: readonly number[]
  frameLabels?: Readonly<Record<number, readonly string[]>>
  onFrameSelect?: (index: number) => void
  playAllFrames?: boolean
  onLoaded?: (proof: BattleSpritePreviewProof | undefined) => void
  onResourceLoaded?: (snapshot: BattleSpriteResourceSnapshot | undefined) => void
  semanticGroups?: readonly SemanticFrameGroup[]
  semanticPresentation?: 'full' | 'embedded'
  activeDefinitionId?: string
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
  const cacheRef = useRef(new BattleSpriteAssetCache(4))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frames, setFrames] = useState<HTMLCanvasElement[] | null>()
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const [selectedRawFrame, setSelectedRawFrame] = useState(0)

  const asset = props.definition?.asset ?? props.asset
  const label = props.definition?.label ?? props.label ?? asset
  const displayId = props.displayId ?? props.definition?.id
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

  useEffect(() => {
    let alive = true
    props.onLoaded?.(undefined)
    props.onResourceLoaded?.(undefined)
    setFrames(undefined)
    setError('')
    setTick(0)
    const context = canvasRef.current?.getContext('2d')
    context?.clearRect(0, 0, WIDTH, HEIGHT)
    if (!asset || !revision) {
      setFrames(null)
      if (recordError) setError(recordError)
      return () => {
        alive = false
      }
    }
    const spritePromise =
      props.definition && props.layout !== 'library'
        ? loadBattleSpriteDefinition(
            cacheRef.current,
            props.assetReader,
            props.definition,
            props.expected ?? props.definition.profile.kind,
          ).then((loaded) => loaded.sprite)
        : cacheRef.current.load(props.assetReader, asset)
    void Promise.all([spritePromise, loadStandardPalette(props.assetBase)])
      .then(([sprite, palette]) => {
        if (!alive) return
        const baked = sprite.frames.map((frame) => bakeFrame(frame, palette))
        setFrames(baked)
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
    if (props.frameSequence) return [...props.frameSequence]
    if (props.playAllFrames) return frames.map((_, index) => index)
    if (!props.definition) return [0]
    const profile = props.definition.profile
    if (profile.kind === 'player-fighter') return [profile.frames.idle]
    if (profile.kind === 'enemy')
      return Array.from({ length: profile.idle.count }, (_, index) => profile.idle.start + index)
    return props.playAllFrames ? frames.map((_, index) => index) : [0]
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

  const frameViews: SpriteFrameView[] = (frames ?? []).map((frame) => ({
    canvas: frame,
    width: frame.width,
    height: frame.height,
  }))

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
              {displayId ? ` · ${displayId}` : ''} · {frames.length} 帧
            </div>
          ) : null}
          {props.semanticGroups?.length ? (
            <SemanticFrameShelf
              frames={frameViews}
              groups={props.semanticGroups}
              presentation={props.semanticPresentation}
              onGroupSelect={props.onDefinitionSelect}
              onFrameSelect={props.onFrameSelect}
            />
          ) : null}
          {props.showAllFrames || props.playAllFrames ? (
            <section className="battle-frame-grid" aria-label="逐帧预览">
              {frames.map((frame, index) => (
                <FrameThumbnail
                  key={index}
                  frame={frame}
                  index={index}
                  labels={props.frameLabels?.[index]}
                  selected={props.activeFrames?.includes(index)}
                  onSelect={props.onFrameSelect}
                />
              ))}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
