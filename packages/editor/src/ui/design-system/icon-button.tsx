import { type ButtonHTMLAttributes, forwardRef } from 'react'
import type { DsButtonVariant, DsControlSize } from './control-types.js'
import { classes } from './control-utils.js'
import { DsTooltip } from './help-tips.js'
import { DsIcon, type DsIconName } from './icons.js'

export const DsIconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
    label: string
    icon: DsIconName
    shortcut?: string
    variant?: Extract<DsButtonVariant, 'secondary' | 'quiet' | 'danger'>
    size?: DsControlSize
  }
>(function DsIconButton(props, ref) {
  const {
    label,
    icon,
    shortcut,
    variant = 'quiet',
    size = 'default',
    className,
    ...buttonProps
  } = props
  return (
    <DsTooltip label={label} shortcut={shortcut}>
      <button
        ref={ref}
        type="button"
        {...buttonProps}
        className={classes(
          'ds-icon-button',
          `ds-icon-button--${variant}`,
          size === 'compact' && 'ds-icon-button--compact',
          className,
        )}
        aria-label={label}
      >
        <DsIcon name={icon} />
      </button>
    </DsTooltip>
  )
})
