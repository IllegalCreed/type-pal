import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import type { DsButtonVariant, DsControlSize } from './control-types.js'
import { classes } from './control-utils.js'
import { DsIcon, type DsIconName } from './icons.js'

/**
 * Unskinned semantic button for rich domain surfaces such as tiles, frames and tree rows.
 * Standard text/icon actions must use DsButton or DsIconButton instead.
 */
export const DsPressable = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function DsPressable({ type = 'button', className, ...props }, ref) {
    return (
      <button {...props} ref={ref} type={type} className={classes('ds-pressable', className)} />
    )
  },
)

export const DsButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: DsButtonVariant
    size?: DsControlSize
    icon?: DsIconName
    busy?: boolean
  }
>(function DsButton(props, ref) {
  const {
    variant = 'secondary',
    size = 'default',
    icon,
    busy = false,
    className,
    children,
    disabled,
    ...rest
  } = props
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={classes(
        'ds-button',
        `ds-button--${variant}`,
        size === 'compact' && 'ds-button--compact',
        className,
      )}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {icon ? <DsIcon name={icon} /> : null}
      <span>{busy ? '处理中' : children}</span>
    </button>
  )
})

export function DsActionLink(
  props: AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: DsButtonVariant
    size?: DsControlSize
    icon?: DsIconName
  },
) {
  const { variant = 'secondary', size = 'default', icon, className, children, ...rest } = props
  return (
    <a
      {...rest}
      className={classes(
        'ds-button',
        `ds-button--${variant}`,
        size === 'compact' && 'ds-button--compact',
        className,
      )}
    >
      {icon ? <DsIcon name={icon} /> : null}
      <span>{children}</span>
    </a>
  )
}
