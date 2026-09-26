import { type InputHTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import type { DsControlSize } from './control-types.js'
import { classes } from './control-utils.js'
import type { DsOption } from './select.js'

export function DsCheckbox(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'style' | 'size'> & {
    label: ReactNode
    indeterminate?: boolean
    size?: DsControlSize
    className?: string
  },
) {
  const { label, indeterminate = false, size = 'default', className, ...inputProps } = props
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <label
      className={classes(
        'ds-check-label',
        size === 'compact' && 'ds-check-label--compact',
        className,
      )}
    >
      <input
        {...inputProps}
        ref={ref}
        type="checkbox"
        className="ds-check-control"
        aria-checked={indeterminate ? 'mixed' : inputProps.checked}
      />
      <span>{label}</span>
    </label>
  )
}

export function DsRadioGroup(props: {
  name: string
  label: string
  options: readonly DsOption[]
  value?: string
  disabled?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <fieldset className="ds-radio-group">
      <legend className="ds-field__label">{props.label}</legend>
      {props.options.map((option) => (
        <label className="ds-radio-label" key={option.value}>
          <input
            className="ds-radio-control"
            type="radio"
            name={props.name}
            value={option.value}
            checked={props.value === option.value}
            disabled={props.disabled || option.disabled}
            onChange={() => props.onChange?.(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

/**
 * Enables or disables one independent setting immediately.
 * Keep `label` stable and self-describing; never reduce it to state-only copy such as “已启用”.
 */
export function DsSwitch(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'style'> & {
    label: ReactNode
    className?: string
  },
) {
  const { label, className, ...inputProps } = props
  return (
    <label className={classes('ds-switch-label', className)}>
      <input
        {...inputProps}
        type="checkbox"
        role="switch"
        aria-checked={inputProps.checked ?? inputProps.defaultChecked ?? false}
      />
      <span className="ds-switch-control" aria-hidden="true" />
      <span>{label}</span>
    </label>
  )
}

