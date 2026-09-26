import type { ReactNode } from 'react'
import { classes } from './control-utils.js'

export function DsCard(props: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={classes('ds-card', props.className)}>
      {props.title || props.actions ? (
        <header className="ds-card__header">
          {props.title ? <h2 className="ds-card__title">{props.title}</h2> : null}
          <span className="ds-spacer" />
          {props.actions}
        </header>
      ) : null}
      {props.children}
    </section>
  )
}
