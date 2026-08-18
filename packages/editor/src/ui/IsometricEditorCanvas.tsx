import type { ProjectMap } from '@type-pal/content'
import { Canvas2DRenderer, type Palette, type RleFrame } from '@type-pal/reforge'
import {
  type CanvasHTMLAttributes,
  type ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import {
  drawIsometricMapBase,
  type IsometricMapBaseCache,
} from './isometric-map-render.js'
import type { StageView } from './scene-stage.js'

export interface IsometricEditorCanvasScene {
  map: ProjectMap
  tiles: Map<number, RleFrame>
  palette: Palette
  view: StageView
  showGrid: boolean
  showCollision: boolean
  hiddenLayerIds?: ReadonlySet<string>
  focus?: { layerId: string; height?: number; dimAlpha?: number }
  revision?: number
}

export interface IsometricEditorCanvasProps
  extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'aria-label'> {
  label: string
  /** Canonical map viewport. Stamp drafts enter through a transient ProjectMap adapter. */
  scene?: IsometricEditorCanvasScene
  /** Domain-specific selection/hover/anchor overlay, painted after the shared cached base. */
  drawOverlay?: (context: CanvasRenderingContext2D) => void
}

/** 地图与组合编辑器共用的完整等距画布；缓存、裁剪、瓦片渲染与网格只有这一套。 */
export const IsometricEditorCanvas = forwardRef(function IsometricEditorCanvas(
  props: IsometricEditorCanvasProps,
  ref: ForwardedRef<HTMLCanvasElement>,
) {
  const { label, className, style, scene, drawOverlay, ...canvasProps } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseCacheRef = useRef<IsometricMapBaseCache | undefined>(undefined)
  const rendererRef = useRef<
    | {
        context: CanvasRenderingContext2D
        tiles: Map<number, RleFrame>
        palette: Palette
        renderer: Canvas2DRenderer
      }
    | undefined
  >(undefined)
  useImperativeHandle(ref, () => canvasRef.current!, [])

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context || !scene) return
    // Lightweight jsdom contexts may omit the native back-reference; interaction tests do not paint.
    if (!(context as CanvasRenderingContext2D & { canvas?: HTMLCanvasElement }).canvas) return
    if (
      rendererRef.current?.context !== context ||
      rendererRef.current.tiles !== scene.tiles ||
      rendererRef.current.palette !== scene.palette
    )
      rendererRef.current = {
        context,
        tiles: scene.tiles,
        palette: scene.palette,
        renderer: new Canvas2DRenderer(context, scene.palette, scene.tiles),
      }
    baseCacheRef.current = drawIsometricMapBase(
      context,
      {
        map: scene.map,
        assets: { renderer: rendererRef.current.renderer, tiles: scene.tiles },
        view: scene.view,
        showGrid: scene.showGrid,
        showCollision: scene.showCollision,
        hiddenLayerIds: scene.hiddenLayerIds,
        focus: scene.focus,
        revision: scene.revision,
      },
      baseCacheRef.current,
    )
    drawOverlay?.(context)
  }, [scene, drawOverlay, props.width, props.height])

  return (
    <canvas
      {...canvasProps}
      ref={canvasRef}
      className={`isometric-editor-canvas${className ? ` ${className}` : ''}`}
      tabIndex={props.tabIndex ?? 0}
      aria-label={label}
      data-isometric-editor-canvas="true"
      style={{ display: 'block', touchAction: 'none', ...style }}
    />
  )
})
