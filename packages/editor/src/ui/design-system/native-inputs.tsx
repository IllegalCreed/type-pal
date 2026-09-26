import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { classes } from './control-utils.js'

/** 由领域动作按钮触发的隐藏文件选择器；统一隔离原生 file input。 */
export const DsFileInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function DsFileInput(props, ref) {
    return <input {...props} ref={ref} type="file" hidden />
  },
)

/** Visible, keyboard-focusable file picker. Product pages own only the file semantics. */
export const DsFilePicker = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'hidden' | 'className' | 'children'> & {
    label: ReactNode
    description?: ReactNode
    className?: string
  }
>(function DsFilePicker({ label, description, className, disabled, ...inputProps }, ref) {
  return (
    <label className={classes('ds-file-picker', disabled && 'is-disabled', className)}>
      <span className="ds-file-picker__label">{label}</span>
      {description ? <small className="ds-file-picker__description">{description}</small> : null}
      <input {...inputProps} ref={ref} type="file" disabled={disabled} />
    </label>
  )
})

/** 时间轴、缩放等连续数值控件的 canonical range 边界。 */
export const DsRangeInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function DsRangeInput({ className, ...props }, ref) {
    return (
      <input {...props} ref={ref} className={classes('ds-range-input', className)} type="range" />
    )
  },
)

/** 浏览器原生取色语义的 canonical 外观；业务页只提供颜色值与离散 change 回调。 */
export const DsColorInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'style'>
>(function DsColorInput({ className, ...props }, ref) {
  return (
    <input {...props} ref={ref} className={classes('ds-color-input', className)} type="color" />
  )
})
