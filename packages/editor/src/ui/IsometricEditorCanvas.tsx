import { type CanvasHTMLAttributes, type ForwardedRef, forwardRef } from 'react'

export interface IsometricEditorCanvasProps
  extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'aria-label'> {
  label: string
}

/** 地图与组合编辑器共用的可聚焦等距画布外壳。绘制数据由各自 adapter 提供。 */
export const IsometricEditorCanvas = forwardRef(function IsometricEditorCanvas(
  props: IsometricEditorCanvasProps,
  ref: ForwardedRef<HTMLCanvasElement>,
) {
  const { label, className, style, ...canvasProps } = props
  return (
    <canvas
      {...canvasProps}
      ref={ref}
      className={`isometric-editor-canvas${className ? ` ${className}` : ''}`}
      tabIndex={props.tabIndex ?? 0}
      aria-label={label}
      data-isometric-editor-canvas="true"
      style={{ display: 'block', touchAction: 'none', ...style }}
    />
  )
})
