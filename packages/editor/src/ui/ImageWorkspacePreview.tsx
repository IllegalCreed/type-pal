import type { AssetId } from '@type-pal/content'
import { type AssetBase, loadStandardPalette } from '@type-pal/reforge'
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
  type WheelEvent,
} from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { StaticImageKind } from '../core/static-image.js'
import { DsZoomToolbar } from './design-system/index.js'
import { colorizeIndexedBattlePixels } from './indexed-battle-preview.js'
import {
  clampMediaPreviewZoom,
  fitMediaPreviewZoom,
  MEDIA_PREVIEW_MAX_ZOOM,
  MEDIA_PREVIEW_MIN_ZOOM,
  stepMediaPreviewZoom,
} from './media-preview-viewport.js'

export function ImageWorkspacePreview(props: {
  assetId: AssetId
  kind: StaticImageKind
  reader: EditorAssetReader
  assetBase: AssetBase
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const panGesture = useRef<{
    pointerId: number
    clientX: number
    clientY: number
    scrollLeft: number
    scrollTop: number
  } | null>(null)
  const [error, setError] = useState('')
  const [size, setSize] = useState<{ width: number; height: number }>()
  const [fit, setFit] = useState(true)
  const [fitZoom, setFitZoom] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [panning, setPanning] = useState(false)
  useEffect(() => {
    let alive = true
    setError('')
    setSize(undefined)
    void Promise.all([
      props.reader.readBytes(props.assetId, props.kind),
      props.kind === 'battle-background' ? loadStandardPalette(props.assetBase) : undefined,
    ])
      .then(async ([bytes, palette]) => {
        if (!alive) return
        const record = props.reader.record(props.assetId, props.kind)
        const bitmap = await createImageBitmap(new Blob([bytes], { type: record.mediaType }))
        try {
          if (!alive) return
          if (props.kind === 'battle-background' && (bitmap.width !== 320 || bitmap.height !== 200))
            throw new Error(`战场背景必须是 320×200，实际 ${bitmap.width}×${bitmap.height}`)
          const canvas = canvasRef.current
          if (!canvas) return
          canvas.width = bitmap.width
          canvas.height = bitmap.height
          const context = canvas.getContext('2d', { willReadFrequently: true })
          if (!context) throw new Error('浏览器无法创建图片预览画布')
          context.imageSmoothingEnabled = false
          context.drawImage(bitmap, 0, 0)
          if (palette) {
            const image = context.getImageData(0, 0, canvas.width, canvas.height)
            const invalidPixel = colorizeIndexedBattlePixels(image.data, palette.colors)
            if (invalidPixel !== undefined)
              throw new Error(`像素 ${invalidPixel} 不是有效的项目战场背景`)
            context.putImageData(image, 0, 0)
          }
          setSize({ width: canvas.width, height: canvas.height })
        } finally {
          bitmap.close()
        }
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause))
      })
    return () => {
      alive = false
    }
  }, [props.assetBase, props.assetId, props.kind, props.reader])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !size) return
    const update = (): void => {
      setFitZoom(
        fitMediaPreviewZoom({
          viewportWidth: stage.clientWidth,
          viewportHeight: stage.clientHeight,
          mediaWidth: size.width,
          mediaHeight: size.height,
        }),
      )
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [size])

  const renderedZoom = fit ? fitZoom : zoom

  const applyZoom = (value: number, anchor?: { clientX: number; clientY: number }): void => {
    const next = clampMediaPreviewZoom(value)
    const stage = stageRef.current
    const canvas = canvasRef.current
    const stageRect = stage?.getBoundingClientRect()
    const canvasRect = canvas?.getBoundingClientRect()
    const clientX = anchor?.clientX ?? (stageRect ? stageRect.left + stageRect.width / 2 : 0)
    const clientY = anchor?.clientY ?? (stageRect ? stageRect.top + stageRect.height / 2 : 0)
    const relativeX = canvasRect?.width ? (clientX - canvasRect.left) / canvasRect.width : 0.5
    const relativeY = canvasRect?.height ? (clientY - canvasRect.top) / canvasRect.height : 0.5
    setFit(false)
    setZoom(next)
    if (!stage || !canvas) return
    window.requestAnimationFrame(() => {
      const nextCanvasRect = canvas.getBoundingClientRect()
      stage.scrollLeft += nextCanvasRect.left + relativeX * nextCanvasRect.width - clientX
      stage.scrollTop += nextCanvasRect.top + relativeY * nextCanvasRect.height - clientY
    })
  }

  const fitPreview = (): void => {
    setFit(true)
    window.requestAnimationFrame(() => stageRef.current?.scrollTo({ left: 0, top: 0 }))
  }

  const onWheel = (event: WheelEvent<HTMLElement>): void => {
    event.preventDefault()
    applyZoom(renderedZoom * Math.exp(-event.deltaY * 0.0015), {
      clientX: event.clientX,
      clientY: event.clientY,
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      applyZoom(stepMediaPreviewZoom(renderedZoom, 1))
    } else if (event.key === '-') {
      event.preventDefault()
      applyZoom(stepMediaPreviewZoom(renderedZoom, -1))
    } else if (event.key === '0') {
      event.preventDefault()
      applyZoom(1)
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault()
      fitPreview()
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLElement>): void => {
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

  const onPointerMove = (event: PointerEvent<HTMLElement>): void => {
    const gesture = panGesture.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    event.currentTarget.scrollLeft = gesture.scrollLeft - (event.clientX - gesture.clientX)
    event.currentTarget.scrollTop = gesture.scrollTop - (event.clientY - gesture.clientY)
  }

  const endPan = (event: PointerEvent<HTMLElement>): void => {
    if (panGesture.current?.pointerId !== event.pointerId) return
    panGesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    setPanning(false)
  }

  return (
    <div className="image-workspace-preview">
      <div className="image-preview-toolbar">
        <span className="image-preview-size">
          {size ? `${size.width} × ${size.height}` : '读取图片…'}
        </span>
        <span className="spacer" />
        <DsZoomToolbar
          label="图片预览缩放"
          value={clampMediaPreviewZoom(renderedZoom)}
          fitted={fit}
          min={MEDIA_PREVIEW_MIN_ZOOM}
          max={MEDIA_PREVIEW_MAX_ZOOM}
          onChange={applyZoom}
          onStep={(direction) => applyZoom(stepMediaPreviewZoom(renderedZoom, direction))}
          onFit={fitPreview}
          onActualSize={() => applyZoom(1)}
        />
      </div>
      <section
        ref={stageRef}
        className={`image-preview-stage${fit ? ' fit' : ' zoomed'}${panning ? ' panning' : ''}`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: This named scroll/zoom region already supports F/0 and pointer navigation; keyboard users must be able to focus it.
        tabIndex={0}
        aria-label="图片预览；滚轮缩放，放大后拖拽平移，按 F 适合窗口，按 0 恢复原始大小"
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div
          className="image-preview-surface"
          style={
            size
              ? {
                  width: `max(100%, ${size.width * renderedZoom + 48}px)`,
                  height: `max(100%, ${size.height * renderedZoom + 48}px)`,
                }
              : undefined
          }
        >
          <canvas
            ref={canvasRef}
            className={!size || error ? 'hidden' : undefined}
            style={
              size
                ? {
                    width: `${size.width * renderedZoom}px`,
                    height: `${size.height * renderedZoom}px`,
                  }
                : undefined
            }
          />
        </div>
        {error ? <div className="cf-err image-preview-error">{error}</div> : null}
      </section>
    </div>
  )
}
