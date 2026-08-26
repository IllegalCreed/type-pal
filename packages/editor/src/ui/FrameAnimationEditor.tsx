import { type AssetId, type AssetRecordV1, FRAME_SEQUENCE_MEDIA_TYPE } from '@type-pal/content'
import { type AssetBase, FrameSequenceReader, loadStandardPalette } from '@type-pal/reforge'
import {
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from 'react'
import { UpsertAssetCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { FrameAnimationEncodeFrame } from '../core/frame-animation-codec.js'
import {
  commitDraftHistory,
  createDraftHistory,
  deleteDraftFrames,
  draftDurationMs,
  frameSelectionAfterReorder,
  draftFrameDurationMs,
  draftFromFrameSequence,
  type FrameAnimationDraft,
  type FrameAnimationDraftFrame,
  type FrameAnimationDraftHistory,
  type FrameQuantization,
  insertDraftFrames,
  moveDraftFrame,
  quantizeCompleteFrame,
  redoDraftHistory,
  replaceDraftFrame,
  resolveDraftFrame,
  setDraftColorTreatment,
  setDraftDefaultFrameMs,
  setDraftFrameDuration,
  undoDraftHistory,
} from '../core/frame-animation-draft.js'
import { decodeFrameImages } from '../core/frame-animation-images.js'
import {
  encodeFrameAnimationInWorker,
  quantizeFrameAnimationInWorker,
} from '../core/frame-animation-worker-client.js'
import {
  DsButton,
  DsCheckbox,
  DsField,
  DsFileInput,
  DsIconButton,
  DsNumberInput,
  DsReorderCollection,
  DsReorderItem,
  DsReorderMoveButton,
  DsSelect,
  DsZoomToolbar,
  DsPressable,
  type DsReorderIntent,
  useDsReorderKeys,
} from './design-system/index.js'
import {
  clampMediaPreviewZoom,
  MEDIA_PREVIEW_MAX_ZOOM,
  MEDIA_PREVIEW_MIN_ZOOM,
  stepMediaPreviewZoom,
} from './media-preview-viewport.js'

export interface FrameAnimationMetadata {
  width: number
  height: number
  frameCount: number
  durationMs: number
  defaultFrameMs: number
  colorTreatment: 'preserve' | 'project-standard'
}

export interface FrameAnimationAsset {
  id: AssetId
  record: AssetRecordV1
}

const TIMELINE_ITEM_WIDTH = 108
let localFrameId = 0

function nextFrameId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  localFrameId++
  return `frame-${Date.now()}-${localFrameId}`
}

function drawFrame(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  rgba: Uint8Array,
): void {
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return
  const pixels = new Uint8ClampedArray(rgba.byteLength)
  pixels.set(rgba)
  context.putImageData(new ImageData(pixels, width, height), 0, 0)
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const source = new Uint8Array(bytes).buffer
  const digest = await crypto.subtle.digest('SHA-256', source)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function sourceArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function FrameThumbnail(props: {
  draft: FrameAnimationDraft
  index: number
  reader: FrameSequenceReader
  selected: boolean
  current: boolean
  visible: boolean
  reorderKey: string
  onSelect(event: React.MouseEvent): void
}) {
  const { draft, index, reader, selected, current, visible, reorderKey, onSelect } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!visible) return
    let alive = true
    void resolveDraftFrame(draft, index, reader).then((rgba) => {
      if (alive && canvasRef.current) drawFrame(canvasRef.current, draft.width, draft.height, rgba)
    })
    return () => {
      alive = false
    }
  }, [draft, index, reader, visible])
  return (
    <div className={`fa-frame${selected ? ' selected' : ''}${current ? ' current' : ''}`}>
      <DsPressable
        type="button"
        className="fa-frame-select"
        aria-label={`第 ${index + 1} 帧`}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {visible ? (
          <canvas ref={canvasRef} />
        ) : (
          <span className="fa-frame-placeholder" aria-hidden="true" />
        )}
        <span>{index + 1}</span>
      </DsPressable>
      <div className="fa-frame-actions">
        <DsReorderMoveButton itemKey={reorderKey} direction="backward" />
        <DsReorderMoveButton itemKey={reorderKey} direction="forward" />
      </div>
    </div>
  )
}

export function FrameAnimationEditor(props: {
  asset: FrameAnimationAsset
  reader: EditorAssetReader
  assetBase: AssetBase
  session: EditSession
  onMetadata(metadata?: FrameAnimationMetadata): void
  onDirtyChange?(dirty: boolean): void
}) {
  const { asset, reader, assetBase, session, onMetadata, onDirtyChange } = props
  const sequenceReader = useMemo(() => new FrameSequenceReader(reader, undefined, 64), [reader])
  const [history, setHistory] = useState<FrameAnimationDraftHistory | null>(null)
  const [baseline, setBaseline] = useState<FrameAnimationDraft | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedFrameIds, setSelectedFrameIds] = useState<ReadonlySet<string>>(() => new Set())
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(true)
  const [fit, setFit] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [renderedZoom, setRenderedZoom] = useState(1)
  const [panning, setPanning] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [quantization, setQuantization] = useState<FrameQuantization>('nearest')
  const [viewport, setViewport] = useState({ left: 0, width: 600 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewStageRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const insertRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const panGesture = useRef<{
    pointerId: number
    clientX: number
    clientY: number
    scrollLeft: number
    scrollTop: number
  } | null>(null)
  const selectionAnchor = useRef(0)

  const draft = history?.present
  const frameReorderKeys = useDsReorderKeys(draft?.frames ?? [], (frame) => frame.id)
  const dirty = Boolean(draft && baseline && draft !== baseline)
  const timelineReady = Boolean(draft)

  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])

  useEffect(() => {
    let alive = true
    setHistory(null)
    setBaseline(null)
    setSelectedIndex(0)
    setSelectedFrameIds(new Set())
    selectionAnchor.current = 0
    setPlaying(false)
    setFit(true)
    setZoom(1)
    setRenderedZoom(1)
    setPanning(false)
    panGesture.current = null
    setError('')
    const expectedRevision = asset.record.sha256
    sequenceReader.invalidate(asset.id)
    void sequenceReader.sequence(asset.id).then(
      ({ index }) => {
        if (!alive) return
        const next = draftFromFrameSequence(asset.id, index)
        setHistory(createDraftHistory(next))
        setBaseline(next)
        setSelectedFrameIds(new Set(next.frames[0] ? [next.frames[0].id] : []))
      },
      (cause: unknown) => {
        if (alive)
          setError(
            `${expectedRevision.slice(0, 8)}: ${cause instanceof Error ? cause.message : String(cause)}`,
          )
      },
    )
    return () => {
      alive = false
    }
  }, [asset.id, asset.record.sha256, sequenceReader])

  useEffect(() => {
    if (!draft) {
      onMetadata(undefined)
      return
    }
    onMetadata({
      width: draft.width,
      height: draft.height,
      frameCount: draft.frames.length,
      durationMs: draftDurationMs(draft),
      defaultFrameMs: draft.defaultFrameMs,
      colorTreatment: draft.colorTreatment,
    })
  }, [draft, onMetadata])

  useEffect(() => {
    if (!draft) return
    const validIds = new Set(draft.frames.map((frame) => frame.id))
    setSelectedFrameIds((current) => {
      const next = new Set([...current].filter((id) => validIds.has(id)))
      if (next.size === 0) {
        const fallback = draft.frames[Math.min(selectedIndex, draft.frames.length - 1)]
        if (fallback) next.add(fallback.id)
      }
      if (next.size === current.size && [...next].every((id) => current.has(id))) return current
      return next
    })
  }, [draft, selectedIndex])

  useEffect(() => {
    if (!draft) return
    const index = Math.min(selectedIndex, draft.frames.length - 1)
    if (index !== selectedIndex) {
      setSelectedIndex(index)
      return
    }
    let alive = true
    void resolveDraftFrame(draft, index, sequenceReader).then(
      (rgba) => {
        if (alive && canvasRef.current)
          drawFrame(canvasRef.current, draft.width, draft.height, rgba)
      },
      (cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause))
      },
    )
    return () => {
      alive = false
    }
  }, [draft, selectedIndex, sequenceReader])

  useEffect(() => {
    if (!draft) return
    const canvas = canvasRef.current
    if (!canvas) return
    const update = (): void => {
      const next = canvas.getBoundingClientRect().width / draft.width
      if (Number.isFinite(next) && next > 0)
        setRenderedZoom((current) => (Math.abs(current - next) < 0.001 ? current : next))
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [draft, fit, zoom])

  useEffect(() => {
    if (!playing || !draft) return
    const timer = window.setTimeout(
      () => {
        let next = selectedIndex
        if (selectedIndex < draft.frames.length - 1) next = selectedIndex + 1
        else if (loop) next = 0
        else {
          setPlaying(false)
          return
        }
        setSelectedIndex(next)
        const frame = draft.frames[next]
        if (frame) setSelectedFrameIds(new Set([frame.id]))
      },
      draftFrameDurationMs(draft, selectedIndex),
    )
    return () => window.clearTimeout(timer)
  }, [draft, loop, playing, selectedIndex])

  useEffect(() => {
    if (!timelineReady) return
    const element = timelineRef.current
    if (!element) return
    const update = (): void => setViewport({ left: element.scrollLeft, width: element.clientWidth })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [timelineReady])

  useEffect(() => {
    const element = timelineRef.current
    if (!element || selectedIndex < 0) return
    const start = selectedIndex * TIMELINE_ITEM_WIDTH
    const end = start + TIMELINE_ITEM_WIDTH
    if (start < element.scrollLeft) element.scrollTo({ left: start, behavior: 'auto' })
    else if (end > element.scrollLeft + element.clientWidth)
      element.scrollTo({ left: end - element.clientWidth, behavior: 'auto' })
  }, [selectedIndex])

  const commit = (next: FrameAnimationDraft): void => {
    setHistory((current) => (current ? commitDraftHistory(current, next) : current))
  }

  const travelHistory = (
    travel: (current: FrameAnimationDraftHistory) => FrameAnimationDraftHistory,
  ): void => {
    if (!history || !draft) return
    const activeId = draft.frames[selectedIndex]?.id
    const anchorId = draft.frames[selectionAnchor.current]?.id
    const next = travel(history)
    if (next === history) return
    setHistory(next)
    const activeIndex = activeId
      ? next.present.frames.findIndex((frame) => frame.id === activeId)
      : -1
    const anchorIndex = anchorId
      ? next.present.frames.findIndex((frame) => frame.id === anchorId)
      : -1
    const fallbackIndex = Math.min(selectedIndex, next.present.frames.length - 1)
    setSelectedIndex(activeIndex >= 0 ? activeIndex : fallbackIndex)
    selectionAnchor.current = anchorIndex >= 0 ? anchorIndex : fallbackIndex
  }

  const reorderFrames = (intent: DsReorderIntent): boolean => {
    if (!draft) return false
    const source = draft.frames[intent.fromIndex]
    if (!source) return false
    const next = moveDraftFrame(draft, intent.fromIndex, intent.toIndex)
    if (next === draft) return false
    frameReorderKeys.move(intent)
    commit(next)
    const selection = frameSelectionAfterReorder(next.frames, source.id, selectedFrameIds)
    if (selection.selectedFrameIds !== selectedFrameIds)
      setSelectedFrameIds(new Set(selection.selectedFrameIds))
    setSelectedIndex(selection.selectedIndex)
    selectionAnchor.current = selection.selectionAnchor
    return true
  }

  const applyPreviewZoom = (value: number, anchor?: { clientX: number; clientY: number }): void => {
    const next = clampMediaPreviewZoom(value)
    const stage = previewStageRef.current
    const canvas = canvasRef.current
    const stageRect = stage?.getBoundingClientRect()
    const canvasRect = canvas?.getBoundingClientRect()
    const clientX = anchor?.clientX ?? (stageRect ? stageRect.left + stageRect.width / 2 : 0)
    const clientY = anchor?.clientY ?? (stageRect ? stageRect.top + stageRect.height / 2 : 0)
    const relativeX = canvasRect?.width ? (clientX - canvasRect.left) / canvasRect.width : 0.5
    const relativeY = canvasRect?.height ? (clientY - canvasRect.top) / canvasRect.height : 0.5
    setFit(false)
    setZoom(next)
    if (!stage || !canvas || !stageRect) return
    window.requestAnimationFrame(() => {
      const nextCanvasRect = canvas.getBoundingClientRect()
      stage.scrollLeft += nextCanvasRect.left + relativeX * nextCanvasRect.width - clientX
      stage.scrollTop += nextCanvasRect.top + relativeY * nextCanvasRect.height - clientY
    })
  }

  const fitPreview = (): void => {
    setFit(true)
    window.requestAnimationFrame(() => {
      previewStageRef.current?.scrollTo({ left: 0, top: 0 })
    })
  }

  const onPreviewWheel = (event: WheelEvent<HTMLDivElement>): void => {
    event.preventDefault()
    const current = fit ? renderedZoom : zoom
    const factor = Math.exp(-event.deltaY * 0.0015)
    applyPreviewZoom(current * factor, { clientX: event.clientX, clientY: event.clientY })
  }

  const onPreviewKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const current = fit ? renderedZoom : zoom
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      applyPreviewZoom(stepMediaPreviewZoom(current, 1))
    } else if (event.key === '-') {
      event.preventDefault()
      applyPreviewZoom(stepMediaPreviewZoom(current, -1))
    } else if (event.key === '0') {
      event.preventDefault()
      applyPreviewZoom(1)
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault()
      fitPreview()
    }
  }

  const onPreviewPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (fit || event.button !== 0) return
    panGesture.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setPanning(true)
  }

  const onPreviewPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const gesture = panGesture.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    event.currentTarget.scrollLeft = gesture.scrollLeft - (event.clientX - gesture.clientX)
    event.currentTarget.scrollTop = gesture.scrollTop - (event.clientY - gesture.clientY)
  }

  const endPreviewPan = (event: PointerEvent<HTMLDivElement>): void => {
    if (panGesture.current?.pointerId !== event.pointerId) return
    panGesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    setPanning(false)
  }

  const activateFrame = (index: number): void => {
    if (!draft) return
    const frame = draft.frames[index]
    if (!frame) return
    setSelectedIndex(index)
    setSelectedFrameIds(new Set([frame.id]))
    selectionAnchor.current = index
  }

  const importImages = async (
    files: readonly File[],
    mode: 'insert' | 'replace',
  ): Promise<void> => {
    if (!draft || files.length === 0) return
    try {
      setBusy('正在读取完整帧…')
      setError('')
      const decoded = await decodeFrameImages(files)
      if (decoded[0]?.width !== draft.width || decoded[0]?.height !== draft.height)
        throw new Error(
          `图片尺寸 ${decoded[0]?.width}x${decoded[0]?.height}，应为 ${draft.width}x${draft.height}`,
        )
      let colors: readonly (readonly [number, number, number])[] | undefined
      if (draft.colorTreatment === 'project-standard')
        colors = (await loadStandardPalette(assetBase)).colors
      const frames: FrameAnimationDraftFrame[] = decoded.map((frame) => ({
        id: nextFrameId(),
        source: {
          kind: 'pixels',
          rgba: colors
            ? quantizeCompleteFrame(frame.rgba, frame.width, frame.height, colors, quantization)
            : frame.rgba,
        },
      }))
      if (mode === 'replace') {
        commit(replaceDraftFrame(draft, selectedIndex, frames[0]!.source))
      } else {
        commit(insertDraftFrames(draft, selectedIndex + 1, frames))
        setSelectedIndex(selectedIndex + 1)
        setSelectedFrameIds(new Set([frames[0]!.id]))
        selectionAnchor.current = selectedIndex + 1
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy('')
    }
  }

  const quantizeFrames = async (all: boolean): Promise<void> => {
    if (!draft) return
    try {
      setBusy(all ? '正在转换全部完整帧…' : '正在转换当前完整帧…')
      setError('')
      const colors = (await loadStandardPalette(assetBase)).colors
      const indices = all ? draft.frames.map((_frame, index) => index) : [selectedIndex]
      const sourceFrames: ArrayBuffer[] = []
      for (const index of indices) {
        const rgba = await resolveDraftFrame(draft, index, sequenceReader)
        sourceFrames.push(sourceArrayBuffer(rgba))
      }
      const quantized = await quantizeFrameAnimationInWorker({
        width: draft.width,
        height: draft.height,
        colors,
        mode: quantization,
        frames: sourceFrames,
      })
      let next = draft
      for (const [position, index] of indices.entries()) {
        next = replaceDraftFrame(next, index, {
          kind: 'pixels',
          rgba: quantized[position]!,
        })
      }
      commit(setDraftColorTreatment(next, 'project-standard'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy('')
    }
  }

  const save = async (): Promise<void> => {
    if (!draft || !dirty) return
    try {
      setBusy('正在后台压缩完整帧…')
      setError('')
      const needsSource = draft.frames.some(
        (frame) => frame.source.kind === 'asset' && frame.source.asset === asset.id,
      )
      const source = needsSource ? await reader.readBytes(asset.id, 'frame-animation') : undefined
      const previousBytes = source ?? (await reader.readBytes(asset.id, 'frame-animation'))
      const frames: FrameAnimationEncodeFrame[] = []
      for (let index = 0; index < draft.frames.length; index++) {
        const frame = draft.frames[index]!
        const duration = frame.durationMs === undefined ? {} : { durationMs: frame.durationMs }
        if (frame.source.kind === 'asset' && frame.source.asset === asset.id)
          frames.push({ sourceFrame: frame.source.frameIndex, ...duration })
        else {
          const rgba = await resolveDraftFrame(draft, index, sequenceReader)
          frames.push({ rgba: sourceArrayBuffer(rgba), ...duration })
        }
      }
      const encoded = await encodeFrameAnimationInWorker({
        width: draft.width,
        height: draft.height,
        defaultFrameMs: draft.defaultFrameMs,
        colorTreatment: draft.colorTreatment,
        ...(source === undefined ? {} : { source }),
        frames,
      })
      const hash = await sha256Hex(encoded)
      const record: AssetRecordV1 = {
        ...asset.record,
        path: `assets/authored/frame-animation/${hash}.tpfs`,
        mediaType: FRAME_SEQUENCE_MEDIA_TYPE,
        bytes: encoded.byteLength,
        sha256: hash,
        origin: { kind: 'authored', ref: asset.id },
      }
      session.dispatch(
        new UpsertAssetCommand(asset.id, record, sourceArrayBuffer(encoded), previousBytes),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy('')
    }
  }

  if (!draft) {
    return (
      <div className="fa-editor fa-loading">
        {error ? (
          <div className="cf-err">{error}</div>
        ) : (
          <div className="insp-empty">正在读取帧动画…</div>
        )}
      </div>
    )
  }

  const visibleStart = Math.max(0, Math.floor(viewport.left / TIMELINE_ITEM_WIDTH) - 3)
  const visibleEnd = Math.min(
    draft.frames.length,
    Math.ceil((viewport.left + viewport.width) / TIMELINE_ITEM_WIDTH) + 3,
  )
  const visible = new Set(
    Array.from(
      { length: Math.max(0, visibleEnd - visibleStart) },
      (_value, index) => visibleStart + index,
    ),
  )
  const selectedIndices = draft.frames
    .map((frame, index) => (selectedFrameIds.has(frame.id) ? index : -1))
    .filter((index) => index >= 0)
  const actionIndices = selectedIndices.length ? selectedIndices : [selectedIndex]

  const onFileInput = (event: ChangeEvent<HTMLInputElement>, mode: 'insert' | 'replace'): void => {
    const files = [...(event.target.files ?? [])]
    if (files.length) void importImages(files, mode)
    event.target.value = ''
  }

  return (
    <div className="fa-editor">
      <div className="fa-toolbar">
        <DsIconButton
          label="第一帧"
          icon="skip-back"
          variant="secondary"
          onClick={() => activateFrame(0)}
        />
        <DsIconButton
          label="上一帧"
          icon="chevron-left"
          variant="secondary"
          onClick={() => activateFrame(Math.max(0, selectedIndex - 1))}
        />
        <DsIconButton
          label={playing ? '暂停' : '播放'}
          icon={playing ? 'pause' : 'play'}
          variant="secondary"
          aria-pressed={playing}
          onClick={() => setPlaying((value) => !value)}
        />
        <DsIconButton
          label="下一帧"
          icon="chevron-right"
          variant="secondary"
          onClick={() => activateFrame(Math.min(draft.frames.length - 1, selectedIndex + 1))}
        />
        <DsIconButton
          label="最后一帧"
          icon="skip-forward"
          variant="secondary"
          onClick={() => activateFrame(draft.frames.length - 1)}
        />
        <DsCheckbox
          label="循环"
          checked={loop}
          onChange={(event) => setLoop(event.target.checked)}
        />
        <span className="fa-counter">
          {selectedIndex + 1} / {draft.frames.length}
          {selectedFrameIds.size > 1 ? ` · 已选 ${selectedFrameIds.size}` : ''}
        </span>
        <span className="spacer" />
        <DsZoomToolbar
          label="预览缩放"
          value={clampMediaPreviewZoom(fit ? renderedZoom : zoom)}
          fitted={fit}
          min={MEDIA_PREVIEW_MIN_ZOOM}
          max={MEDIA_PREVIEW_MAX_ZOOM}
          onChange={applyPreviewZoom}
          onStep={(direction) =>
            applyPreviewZoom(stepMediaPreviewZoom(fit ? renderedZoom : zoom, direction))
          }
          onFit={fitPreview}
          onActualSize={() => applyPreviewZoom(1)}
        />
        <DsIconButton
          label="撤销帧编辑"
          icon="undo"
          variant="secondary"
          disabled={!history.past.length || Boolean(busy)}
          onClick={() => travelHistory(undoDraftHistory)}
        />
        <DsIconButton
          label="重做帧编辑"
          icon="redo"
          variant="secondary"
          disabled={!history.future.length || Boolean(busy)}
          onClick={() => travelHistory(redoDraftHistory)}
        />
        <DsButton
          variant="primary"
          icon="save"
          disabled={!dirty}
          busy={Boolean(busy)}
          onClick={() => void save()}
        >
          保存动画
        </DsButton>
      </div>

      <div
        ref={previewStageRef}
        className={`fa-preview-stage${fit ? ' fit' : ' zoomed'}${panning ? ' panning' : ''}`}
        tabIndex={0}
        aria-label="帧动画预览；滚轮缩放，放大后拖拽平移，按 F 适合窗口，按 0 恢复原始大小"
        onWheel={onPreviewWheel}
        onKeyDown={onPreviewKeyDown}
        onPointerDown={onPreviewPointerDown}
        onPointerMove={onPreviewPointerMove}
        onPointerUp={endPreviewPan}
        onPointerCancel={endPreviewPan}
      >
        <div
          className="fa-preview-surface"
          style={
            fit
              ? undefined
              : {
                  width: `${draft.width * zoom + 32}px`,
                  height: `${draft.height * zoom + 32}px`,
                }
          }
        >
          <canvas
            ref={canvasRef}
            className={fit ? 'fit' : 'manual'}
            style={
              fit
                ? undefined
                : { width: `${draft.width * zoom}px`, height: `${draft.height * zoom}px` }
            }
          />
        </div>
      </div>

      <div className="fa-edit-bar">
        <DsButton variant="secondary" icon="add" onClick={() => insertRef.current?.click()}>
          插入图片
        </DsButton>
        <DsButton variant="secondary" onClick={() => replaceRef.current?.click()}>
          替换当前帧
        </DsButton>
        <DsButton
          variant="secondary"
          icon="copy"
          onClick={() => {
            const copies = actionIndices.map((index) => ({
              ...draft.frames[index]!,
              id: nextFrameId(),
            }))
            const at = Math.max(...actionIndices) + 1
            commit(insertDraftFrames(draft, at, copies))
            setSelectedIndex(at)
            setSelectedFrameIds(new Set(copies.map((frame) => frame.id)))
            selectionAnchor.current = at
          }}
        >
          复制选中帧
        </DsButton>
        <DsButton
          variant="danger"
          icon="delete"
          disabled={draft.frames.length <= actionIndices.length}
          onClick={() => {
            const next = deleteDraftFrames(draft, actionIndices)
            const nextIndex = Math.min(actionIndices[0] ?? selectedIndex, next.frames.length - 1)
            commit(next)
            setSelectedIndex(nextIndex)
            setSelectedFrameIds(new Set([next.frames[nextIndex]!.id]))
            selectionAnchor.current = nextIndex
          }}
        >
          删除选中帧
        </DsButton>
        <span className="fa-divider" />
        <DsField label="全局帧率" layout="inline" className="fa-edit-bar__field">
          {(field) => (
            <DsNumberInput
              {...field}
              min="0.1"
              step="0.1"
              defaultValue={(1000 / draft.defaultFrameMs).toFixed(2)}
              key={`fps-${draft.defaultFrameMs}`}
              onBlur={(event) => {
                const fps = Number(event.target.value)
                if (Number.isFinite(fps) && fps > 0)
                  commit(setDraftDefaultFrameMs(draft, 1000 / fps))
              }}
            />
          )}
        </DsField>
        <DsField label="当前帧时长（ms）" layout="inline" className="fa-edit-bar__field">
          {(field) => (
            <DsNumberInput
              {...field}
              min="1"
              placeholder={`${Math.round(draft.defaultFrameMs)} 默认`}
              value={draft.frames[selectedIndex]?.durationMs ?? ''}
              onChange={(event) => {
                const value = event.target.value
                const duration = Number(value)
                if (!value) commit(setDraftFrameDuration(draft, selectedIndex, undefined))
                else if (Number.isFinite(duration) && duration > 0)
                  commit(setDraftFrameDuration(draft, selectedIndex, duration))
              }}
            />
          )}
        </DsField>
        <span className="fa-divider" />
        <DsSelect
          aria-label="颜色转换方式"
          value={quantization}
          onValueChange={(value) => setQuantization(value as FrameQuantization)}
          options={[
            { value: 'nearest', label: '最近色' },
            { value: 'floyd-steinberg', label: '误差扩散' },
          ]}
        />
        <DsButton
          variant="secondary"
          disabled={Boolean(busy)}
          onClick={() => void quantizeFrames(false)}
        >
          当前帧贴合标准色彩
        </DsButton>
        <DsButton
          variant="secondary"
          disabled={Boolean(busy)}
          onClick={() => void quantizeFrames(true)}
        >
          全部贴合
        </DsButton>
        {busy ? <span className="fa-status">{busy}</span> : null}
      </div>

      <DsFileInput
        ref={insertRef}
        hidden
        multiple
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => onFileInput(event, 'insert')}
      />
      <DsFileInput
        ref={replaceRef}
        hidden
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => onFileInput(event, 'replace')}
      />

      <div className="fa-timeline-shell">
        <div className="fa-timeline-head">
          <strong>帧时间轴</strong>
          <span>{(draftDurationMs(draft) / 1000).toFixed(2)} 秒</span>
          <span>{draft.colorTreatment === 'project-standard' ? '项目标准色彩' : '保留原色'}</span>
        </div>
        <DsReorderCollection
          adoptionId="asset/frame-animation-timeline"
          scopeKey={`frame-animation:${asset.id}:${asset.record.sha256}`}
          entries={draft.frames.map((frame, index) => ({
            key: frameReorderKeys.keys[index]!,
            label: `第 ${index + 1} 帧`,
          }))}
          revision={draft}
          orientation="horizontal"
          disabled={Boolean(busy)}
          onReorder={reorderFrames}
        >
          <div
            ref={timelineRef}
            className="fa-timeline"
            onScroll={(event) =>
              setViewport({
                left: event.currentTarget.scrollLeft,
                width: event.currentTarget.clientWidth,
              })
            }
          >
            <div
              className="fa-track"
              style={{ width: Math.max(viewport.width, draft.frames.length * TIMELINE_ITEM_WIDTH) }}
            >
              {draft.frames.map((frame, index) => {
                const reorderKey = frameReorderKeys.keys[index]!
                return (
                  <div
                    className="fa-frame-position"
                    style={{ left: index * TIMELINE_ITEM_WIDTH }}
                    key={reorderKey}
                  >
                    <DsReorderItem itemKey={reorderKey} layout="overlay">
                      <FrameThumbnail
                        draft={draft}
                        index={index}
                        reader={sequenceReader}
                        selected={selectedFrameIds.has(frame.id)}
                        current={index === selectedIndex}
                        visible={visible.has(index)}
                        reorderKey={reorderKey}
                        onSelect={(event) => {
                          const frame = draft.frames[index]!
                          if (event.shiftKey) {
                            const from = Math.min(selectionAnchor.current, index)
                            const to = Math.max(selectionAnchor.current, index)
                            setSelectedFrameIds(
                              new Set(
                                draft.frames.slice(from, to + 1).map((candidate) => candidate.id),
                              ),
                            )
                            setSelectedIndex(index)
                            return
                          }
                          if (event.metaKey || event.ctrlKey) {
                            const next = new Set(selectedFrameIds)
                            if (next.has(frame.id) && next.size > 1) {
                              next.delete(frame.id)
                              const active = draft.frames.findIndex((candidate) =>
                                next.has(candidate.id),
                              )
                              setSelectedIndex(active >= 0 ? active : index)
                            } else {
                              next.add(frame.id)
                              setSelectedIndex(index)
                            }
                            setSelectedFrameIds(next)
                            selectionAnchor.current = index
                            return
                          }
                          activateFrame(index)
                        }}
                      />
                    </DsReorderItem>
                  </div>
                )
              })}
            </div>
          </div>
        </DsReorderCollection>
      </div>
      {error ? <div className="fa-error cf-err">{error}</div> : null}
    </div>
  )
}
