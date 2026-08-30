/** 大世界精灵的统一源帧 + 语义动作工作台。 */

import type { AssetId, AssetRecordV1, SpriteActionDef, SpriteDef } from '@type-pal/content'
import {
  type AssetBase,
  bakeFrame,
  compressGzip,
  encodeSpriteChunk,
  type LoadedWorldSprite,
  loadStandardPalette,
  type Palette,
  quantizeToRleFrame,
  type RleFrame,
  sliceAtlasGrid,
} from '@type-pal/reforge'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { sha256Hex } from '../core/binary-signature.js'
import { ReplaceSpriteAssetCommand, type SpriteReplacementProof } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { loadEditorSprite } from '../core/sprite-assets.js'
import {
  DsButton,
  DsField,
  DsFileInput,
  DsNumberInput,
  DsObjectHero,
  DsTag,
} from './design-system/index.js'
import {
  RawFrameInspector,
  SemanticFrameShelf,
  type SpriteFrameView,
} from './SpriteFrameWorkbench.js'
import { worldSpriteSemanticGroups } from './world-sprite-action-preview.js'

export { worldSpriteSemanticGroups } from './world-sprite-action-preview.js'

export interface SpriteResourceLoadProof {
  asset: AssetId
  revision: string
  actualFrameCount: number
}

/** 原始帧拖入动作时间线时使用的稳定 MIME。 */
export const SPRITE_FRAME_DRAG_MIME = 'application/x-type-pal-sprite-frame'

interface LoadedSnapshot {
  asset: AssetId
  revision: string
  sprite: LoadedWorldSprite
  palette: Palette
  frames: SpriteFrameView[]
}

export interface WorldSpriteFrameDeletionPlan {
  repairs: NonNullable<SpriteReplacementProof['repairs']>
  consumerSnapshots: NonNullable<SpriteReplacementProof['consumerSnapshots']>
  changes: string[]
}

/**
 * 删任意物理帧时精确重排所有绝对帧号。
 * directional 的四向等长前缀无法靠删单帧保持结构，必须先改布局。
 */
export function planWorldSpriteFrameDeletion(
  consumers: readonly SpriteDef[],
  deletedIndex: number,
  previousFrameCount: number,
): WorldSpriteFrameDeletionPlan {
  if (!Number.isInteger(deletedIndex) || deletedIndex < 0 || deletedIndex >= previousFrameCount)
    throw new Error('待删除的源帧不存在')
  if (previousFrameCount <= 1) throw new Error('源帧容器至少必须保留 1 帧')
  const nextFrameCount = previousFrameCount - 1
  const repairs: NonNullable<SpriteReplacementProof['repairs']> = {}
  const consumerSnapshots: NonNullable<SpriteReplacementProof['consumerSnapshots']> = {}
  const changes: string[] = []

  for (const consumer of consumers) {
    if (consumer.layout.kind === 'directional' && deletedIndex < consumer.layout.framesPerDir * 4)
      throw new Error(
        `帧 #${deletedIndex} 属于“${consumer.label}”的四向行走结构；单独删除会打乱方向分组，请先在布局中调整每向帧数。`,
      )
    consumerSnapshots[consumer.id] = {
      layout: structuredClone(consumer.layout),
      ...(consumer.poses ? { poses: structuredClone(consumer.poses) } : {}),
    }
    const layout: SpriteDef['layout'] =
      consumer.layout.kind === 'loop'
        ? {
            ...consumer.layout,
            frameCount:
              deletedIndex < consumer.layout.frameCount && consumer.layout.frameCount > 1
                ? Math.min(nextFrameCount, consumer.layout.frameCount - 1)
                : Math.min(nextFrameCount, consumer.layout.frameCount),
          }
        : structuredClone(consumer.layout)
    if (
      consumer.layout.kind === 'loop' &&
      layout.kind === 'loop' &&
      layout.frameCount !== consumer.layout.frameCount
    )
      changes.push(
        `${consumer.label}：循环 ${consumer.layout.frameCount} → ${layout.frameCount} 帧`,
      )

    const poses: Record<string, SpriteActionDef> = {}
    for (const [actionId, action] of Object.entries(consumer.poses ?? {})) {
      const retained = action.steps.flatMap((step, position) =>
        step.frame === deletedIndex
          ? []
          : [
              {
                position,
                step: {
                  ...step,
                  frame: step.frame > deletedIndex ? step.frame - 1 : step.frame,
                },
              },
            ],
      )
      if (retained.length) {
        let loopFrom: number | undefined
        if (action.loopFrom !== undefined) {
          const firstLoopStep = retained.findIndex((entry) => entry.position >= action.loopFrom!)
          if (firstLoopStep >= 0) loopFrom = firstLoopStep
        }
        const nextAction: SpriteActionDef = {
          ...action,
          steps: retained.map((entry) => entry.step),
        }
        if (loopFrom === undefined) delete nextAction.loopFrom
        else nextAction.loopFrom = loopFrom
        poses[actionId] = nextAction
        const previousFrames = action.steps.map((step) => step.frame)
        const nextFrames = retained.map((entry) => entry.step.frame)
        if (nextFrames.join(',') !== previousFrames.join(',') || loopFrom !== action.loopFrom)
          changes.push(
            `${consumer.label}·${action.label}：[${previousFrames.join(', ')}] → [${nextFrames.join(', ')}]${action.loopFrom !== undefined && loopFrom === undefined ? '；循环段已移除' : ''}`,
          )
      } else changes.push(`${consumer.label}·${action.label}：动作随唯一帧一起移除`)
    }
    repairs[consumer.id] = {
      layout,
      ...(Object.keys(poses).length ? { poses } : {}),
    }
  }
  return { repairs, consumerSnapshots, changes }
}

async function fileToRgba(file: File): Promise<{ rgba: Uint8Array; w: number; h: number }> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2d context 不可用')
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  const data = context.getImageData(0, 0, canvas.width, canvas.height)
  return {
    rgba: new Uint8Array(data.data.buffer.slice(0)),
    w: canvas.width,
    h: canvas.height,
  }
}

export function SpriteResourceViewer(props: {
  assetBase: AssetBase
  assetReader: EditorAssetReader
  asset: AssetId
  revision: string
  label: string
  consumers: readonly SpriteDef[]
  activeDefinitionId?: string
  activeActionId?: string
  session: EditSession
  headerActions?: ReactNode
  onDefinitionSelect?: (id: string) => void
  onActionSelect?: (definitionId: string, actionId: string) => void
  onLoaded?: (proof: SpriteResourceLoadProof | undefined) => void
  onFramesLoaded?: (frames: readonly SpriteFrameView[]) => void
  onSelectedFrameChange?: (frame: number) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
  const [snapshot, setSnapshot] = useState<LoadedSnapshot | null>(null)
  const [selectedFrame, setSelectedFrame] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editorMessage, setEditorMessage] = useState('')
  const [editorMessageKind, setEditorMessageKind] = useState<'info' | 'error'>('info')
  const [appendDraft, setAppendDraft] = useState<{
    rgba: Uint8Array
    w: number
    h: number
    cols: number
    rows: number
  }>()
  const replaceFileRef = useRef<HTMLInputElement>(null)
  const appendFileRef = useRef<HTMLInputElement>(null)
  const previousAssetRef = useRef<AssetId | undefined>(undefined)
  const loaded =
    snapshot?.asset === props.asset && snapshot.revision === props.revision ? snapshot : undefined

  useEffect(() => {
    props.onSelectedFrameChange?.(selectedFrame)
  }, [props.onSelectedFrameChange, selectedFrame])

  useEffect(() => {
    let alive = true
    if (previousAssetRef.current !== props.asset) {
      setSelectedFrame(0)
    }
    previousAssetRef.current = props.asset
    setSnapshot(null)
    setError('')
    setEditorMessage('')
    setEditorMessageKind('info')
    setAppendDraft(undefined)
    props.onLoaded?.(undefined)
    props.onFramesLoaded?.([])
    void Promise.all([
      loadEditorSprite(props.assetReader, props.asset),
      loadStandardPalette(props.assetBase),
    ])
      .then(([sprite, palette]) => {
        if (!alive) return
        const frames = sprite.frames.map((frame) => ({
          canvas: bakeFrame(frame, palette),
          width: frame.width,
          height: frame.height,
        }))
        setSnapshot({
          asset: props.asset,
          revision: props.revision,
          sprite,
          palette,
          frames,
        })
        setSelectedFrame((index) => Math.min(index, sprite.frames.length - 1))
        props.onLoaded?.({
          asset: props.asset,
          revision: props.revision,
          actualFrameCount: sprite.frames.length,
        })
        props.onFramesLoaded?.(frames)
      })
      .catch((cause: unknown) => {
        if (!alive) return
        setError(cause instanceof Error ? cause.message : String(cause))
        props.onLoaded?.(undefined)
        props.onFramesLoaded?.([])
      })
    return () => {
      alive = false
      props.onLoaded?.(undefined)
      props.onFramesLoaded?.([])
    }
  }, [
    props.asset,
    props.assetBase,
    props.assetReader,
    props.onLoaded,
    props.onFramesLoaded,
    props.revision,
  ])

  const groups = useMemo(
    () =>
      worldSpriteSemanticGroups(props.consumers, props.activeDefinitionId, props.activeActionId),
    [props.activeActionId, props.activeDefinitionId, props.consumers],
  )

  const reportError = (reason: unknown): void => {
    const message = reason instanceof Error ? reason.message : String(reason)
    setEditorMessage(message)
    setEditorMessageKind('error')
    props.onStatusNotice?.({ kind: 'error', message })
  }

  const commitFrames = async (
    frames: RleFrame[],
    label: string,
    deletionPlan?: WorldSpriteFrameDeletionPlan,
  ): Promise<void> => {
    if (!loaded) return
    setBusy(true)
    setEditorMessage('')
    try {
      const currentState = props.session.getState()
      const record = currentState.assetCatalog.assets[props.asset]
      if (!record || record.kind !== 'sprite') throw new Error('当前精灵源资源已不在 catalog')
      const consumers = currentState.sprites.filter((candidate) => candidate.asset === props.asset)
      const shrinking = frames.length < loaded.sprite.frames.length
      const gzip = await compressGzip(encodeSpriteChunk(frames))
      const bytes = gzip.buffer.slice(
        gzip.byteOffset,
        gzip.byteOffset + gzip.byteLength,
      ) as ArrayBuffer
      const sha256 = await sha256Hex(bytes)
      const previousBytes = await props.assetReader.readBytes(props.asset, 'sprite')
      const nextRecord: AssetRecordV1 = {
        ...record,
        path: `assets/authored/sprites/${sha256}.rle`,
        bytes: bytes.byteLength,
        sha256,
        origin: { kind: 'authored' },
      }
      const proof: SpriteReplacementProof = {
        asset: props.asset,
        previousSha256: record.sha256,
        previousFrameCount: loaded.sprite.frames.length,
        nextFrameCount: frames.length,
        consumerIds: consumers.map((consumer) => consumer.id),
        ...(shrinking
          ? {
              repairs: deletionPlan?.repairs ?? {},
              consumerSnapshots: deletionPlan?.consumerSnapshots ?? {},
            }
          : {}),
      }
      props.session.dispatch(
        new ReplaceSpriteAssetCommand(
          consumers[0]?.id,
          props.asset,
          nextRecord,
          bytes,
          previousBytes,
          proof,
          label,
        ),
      )
      setEditorMessage(`${label}；可使用撤销恢复。`)
      setEditorMessageKind('info')
      props.onStatusNotice?.({ kind: 'info', message: `${label}；可撤销。` })
    } catch (reason) {
      reportError(reason)
    } finally {
      setBusy(false)
    }
  }

  const replaceSelected = async (file: File): Promise<void> => {
    if (!loaded) return
    const index = Math.min(selectedFrame, loaded.sprite.frames.length - 1)
    try {
      const { rgba, w, h } = await fileToRgba(file)
      const replacement = quantizeToRleFrame(rgba, w, h, loaded.palette)
      if (
        props.consumers.length &&
        !window.confirm(`替换源帧 #${index} 会同时影响 ${props.consumers.length} 个用途。继续吗？`)
      )
        return
      await commitFrames(
        loaded.sprite.frames.map((frame, frameIndex) =>
          frameIndex === index ? replacement : frame,
        ),
        `替换源帧 #${index}`,
      )
    } catch (reason) {
      reportError(reason)
    }
  }

  const appendFrames = async (): Promise<void> => {
    if (!loaded || !appendDraft) return
    if (appendDraft.w % appendDraft.cols !== 0 || appendDraft.h % appendDraft.rows !== 0) return
    try {
      const appended = sliceAtlasGrid(
        appendDraft.rgba,
        appendDraft.w,
        appendDraft.h,
        appendDraft.w / appendDraft.cols,
        appendDraft.h / appendDraft.rows,
      ).map((frame) => quantizeToRleFrame(frame.rgba, frame.width, frame.height, loaded.palette))
      if (
        props.consumers.length &&
        !window.confirm(
          `追加 ${appended.length} 帧会更新 ${props.consumers.length} 个用途共享的源帧容器。继续吗？`,
        )
      )
        return
      await commitFrames([...loaded.sprite.frames, ...appended], `追加源帧 ×${appended.length}`)
      setAppendDraft(undefined)
      setSelectedFrame(loaded.sprite.frames.length)
    } catch (reason) {
      reportError(reason)
    }
  }

  const deleteSelected = async (): Promise<void> => {
    if (!loaded || loaded.sprite.frames.length <= 1) return
    const index = Math.min(selectedFrame, loaded.sprite.frames.length - 1)
    try {
      const currentConsumers = props.session
        .getState()
        .sprites.filter((consumer) => consumer.asset === props.asset)
      const plan = planWorldSpriteFrameDeletion(
        currentConsumers,
        index,
        loaded.sprite.frames.length,
      )
      const impact = plan.changes.length
        ? `\n\n同步修复：\n${plan.changes.map((change) => `• ${change}`).join('\n')}`
        : ''
      if (!window.confirm(`删除源帧 #${index}？后续物理帧号会全部前移，操作可撤销。${impact}`))
        return
      await commitFrames(
        loaded.sprite.frames.filter((_, frameIndex) => frameIndex !== index),
        `删除源帧 #${index}`,
        plan,
      )
      const next = Math.min(index, loaded.sprite.frames.length - 2)
      setSelectedFrame(next)
    } catch (reason) {
      reportError(reason)
    }
  }

  const resourceHero = (
    <DsObjectHero
      eyebrow="大世界精灵"
      title={props.label}
      objectId={props.asset}
      summary="集中管理共享源帧、用途定义与预制动作。"
      meta={
        <DsTag tone={error ? 'danger' : 'neutral'}>
          {loaded
            ? `${loaded.frames.length} 帧 · ${props.consumers.length} 个用途定义`
            : error
              ? '加载失败'
              : '正在解析'}
        </DsTag>
      }
      actions={props.headerActions}
    />
  )

  if (error)
    return (
      <div className="sprite-resource-viewer ds-object-workspace">
        {resourceHero}
        <div className="sprite-resource-viewer-scroll ds-object-workspace__content">
          <div className="insp-empty sprite-resource-load-state error" role="alert">
            帧资源加载失败：{error}
          </div>
        </div>
      </div>
    )
  if (!loaded)
    return (
      <div className="sprite-resource-viewer ds-object-workspace">
        {resourceHero}
        <div className="sprite-resource-viewer-scroll ds-object-workspace__content">
          <div className="insp-empty sprite-resource-load-state" role="status">
            正在解析帧资源 {props.asset}…
          </div>
        </div>
      </div>
    )

  const appendPanel = appendDraft ? (
    <div className="sprite-raw-append-panel">
      <span>
        将 {appendDraft.w}×{appendDraft.h} 图片切为
      </span>
      <DsField label="列" className="sprite-raw-append-panel__field">
        {(field) => (
          <DsNumberInput
            {...field}
            size="compact"
            min={1}
            max={16}
            value={appendDraft.cols}
            onChange={(event) =>
              setAppendDraft({
                ...appendDraft,
                cols: Math.max(1, Math.floor(event.target.valueAsNumber) || 1),
              })
            }
          />
        )}
      </DsField>
      <span>×</span>
      <DsField label="行" className="sprite-raw-append-panel__field">
        {(field) => (
          <DsNumberInput
            {...field}
            size="compact"
            min={1}
            max={16}
            value={appendDraft.rows}
            onChange={(event) =>
              setAppendDraft({
                ...appendDraft,
                rows: Math.max(1, Math.floor(event.target.valueAsNumber) || 1),
              })
            }
          />
        )}
      </DsField>
      <span className="hint2">
        {appendDraft.w % appendDraft.cols === 0 && appendDraft.h % appendDraft.rows === 0
          ? `${appendDraft.cols * appendDraft.rows} 帧，每帧 ${appendDraft.w / appendDraft.cols}×${appendDraft.h / appendDraft.rows}`
          : '图片宽高必须能被行列整除'}
      </span>
      <span className="spacer" />
      <DsButton variant="secondary" onClick={() => setAppendDraft(undefined)}>
        取消
      </DsButton>
      <DsButton
        variant="primary"
        disabled={
          busy || appendDraft.w % appendDraft.cols !== 0 || appendDraft.h % appendDraft.rows !== 0
        }
        onClick={() => void appendFrames()}
      >
        确认追加
      </DsButton>
    </div>
  ) : null

  return (
    <div className="sprite-resource-viewer ds-object-workspace">
      {resourceHero}
      <div className="sprite-resource-viewer-scroll ds-object-workspace__content">
        <DsFileInput
          ref={replaceFileRef}
          className="sprite-hidden-file-input"
          accept="image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void replaceSelected(file)
          }}
        />
        <DsFileInput
          ref={appendFileRef}
          className="sprite-hidden-file-input"
          accept="image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            void fileToRgba(file)
              .then((image) => setAppendDraft({ ...image, cols: 1, rows: 1 }))
              .catch(reportError)
          }}
        />
        <RawFrameInspector
          label={props.label}
          asset={props.asset}
          frames={loaded.frames}
          selectedFrame={selectedFrame}
          consumerCount={props.consumers.length}
          onSelect={setSelectedFrame}
          onAppend={() => appendFileRef.current?.click()}
          onReplace={() => replaceFileRef.current?.click()}
          onDelete={() => void deleteSelected()}
          onFrameDragStart={(event, frame) => {
            event.dataTransfer.effectAllowed = 'copy'
            event.dataTransfer.setData(
              SPRITE_FRAME_DRAG_MIME,
              JSON.stringify({ asset: props.asset, frame }),
            )
          }}
          busy={busy}
          editorMessage={editorMessage}
          editorMessageKind={editorMessageKind}
          editorPanel={appendPanel}
          showHero={false}
        />
        <SemanticFrameShelf
          frames={loaded.frames}
          groups={groups}
          onGroupSelect={props.onDefinitionSelect}
          onActionSelect={props.onActionSelect}
          onFrameSelect={setSelectedFrame}
        />
      </div>
    </div>
  )
}
