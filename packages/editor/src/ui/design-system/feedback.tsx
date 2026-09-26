import type { ReactNode } from 'react'
import { classes } from './control-utils.js'

export function DsStatus(props: {
  tone?: 'neutral' | 'success' | 'warning' | 'error'
  children: ReactNode
  action?: ReactNode
}) {
  const tone = props.tone ?? 'neutral'
  return (
    <div
      className={classes('ds-status', tone !== 'neutral' && `ds-status--${tone}`)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span>{props.children}</span>
      {props.action}
    </div>
  )
}

export function DsEmptyState(props: {
  title: string
  description: string
  action?: ReactNode
  layout?: 'card' | 'embedded'
}) {
  const layout = props.layout ?? 'card'
  return (
    <section
      className={classes('ds-empty-state', layout === 'embedded' && 'ds-empty-state--embedded')}
      data-layout={layout}
    >
      {layout === 'embedded' ? (
        <h4 className="ds-card__title ds-empty-state__title">{props.title}</h4>
      ) : (
        <h2 className="ds-card__title ds-empty-state__title">{props.title}</h2>
      )}
      <p>{props.description}</p>
      {props.action}
    </section>
  )
}

