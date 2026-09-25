import type { HTMLAttributes } from 'react'

function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

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

/** Read-only value chrome for property rows; unlike a disabled input, its text stays selectable. */
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
