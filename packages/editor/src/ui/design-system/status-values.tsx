import type { HTMLAttributes } from 'react'
import { classes } from './control-utils.js'

export type DsTagTone = 'accent' | 'neutral' | 'warning' | 'danger'

/** Compact semantic status label. Object headers and catalog rows must not invent local badge skins. */
export function DsTag(
  props: HTMLAttributes<HTMLSpanElement> & {
    tone?: DsTagTone
    monospace?: boolean
  },
) {
  const { tone = 'accent', monospace = false, className, children, ...rest } = props
  return (
    <span
      {...rest}
      className={classes('ds-tag', `ds-tag--${tone}`, monospace && 'ds-tag--monospace', className)}
    >
      {children}
    </span>
  )
}

/** Keep the displayed value selectable in read-only property rows. */
export function DsReadonlyValue(
  props: HTMLAttributes<HTMLSpanElement> & {
    as?: 'span' | 'div'
    monospace?: boolean
  },
) {
  const { as: Element = 'span', monospace = false, className, ...rest } = props
  return (
    <Element
      {...rest}
      className={classes(
        'ds-readonly-value',
        monospace && 'ds-readonly-value--monospace',
        className,
      )}
    />
  )
}
