import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import type { DsControlSize } from './control-types.js'
import { classes } from './control-utils.js'

export type DsFormControlAppearance = {
  invalid?: boolean
  size?: DsControlSize
  monospace?: boolean
}

export const DsTextInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'style' | 'size'> & DsFormControlAppearance
>(function DsTextInput(props, ref) {
  const {
    className,
    invalid,
    size = 'default',
    monospace = false,
    'aria-invalid': ariaInvalid,
    ...rest
  } = props
  return (
    <input
      {...rest}
      ref={ref}
      className={classes(
        'ds-input',
        size === 'compact' && 'ds-input--compact',
        monospace && 'ds-control--monospace',
        className,
      )}
      aria-invalid={invalid || ariaInvalid || undefined}
    />
  )
})

export const DsTextArea = forwardRef<
  HTMLTextAreaElement,
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> & DsFormControlAppearance
>(function DsTextArea(
  props: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> & DsFormControlAppearance,
  ref,
) {
  const {
    className,
    invalid,
    size = 'default',
    monospace = false,
    'aria-invalid': ariaInvalid,
    ...rest
  } = props
  return (
    <textarea
      {...rest}
      ref={ref}
      className={classes(
        'ds-textarea',
        size === 'compact' && 'ds-textarea--compact',
        monospace && 'ds-control--monospace',
        className,
      )}
      aria-invalid={invalid || ariaInvalid || undefined}
    />
  )
})
