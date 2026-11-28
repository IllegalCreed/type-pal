import { useEffect, useRef } from 'react'
import {
  type CompleteFrameReader,
  type FrameAnimationDraft,
  resolveDraftFrame,
} from '../core/frame-animation-draft.js'

/** The canvas draws exactly one draft frame. Cleanup prevents an older decode from painting it. */
export function useFramePreviewCanvas(
  draft: FrameAnimationDraft | undefined,
  index: number,
  reader: CompleteFrameReader,
  onError: (cause: unknown) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!draft) return
    let alive = true
    void resolveDraftFrame(draft, index, reader)
      .then((rgba) => {
        const canvas = canvasRef.current
        if (!alive || !canvas) return
        canvas.width = draft.width
        canvas.height = draft.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('浏览器无法创建帧动画预览画布')
        const pixels = Uint8ClampedArray.from(rgba)
        context.putImageData(new ImageData(pixels, draft.width, draft.height), 0, 0)
      })
      .catch((cause: unknown) => {
        if (alive) onError(cause)
      })
    return () => {
      alive = false
    }
  }, [draft, index, reader, onError])
  return canvasRef
}
