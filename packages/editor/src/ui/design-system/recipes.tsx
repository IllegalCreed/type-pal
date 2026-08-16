import {
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from 'react'
import { type DsControlSize, type DsTabItem, DsTabs, DsTextInput, dsClasses } from './controls.js'

export type DsWorkbenchKind = 'object' | 'media' | 'script' | 'table'

export function DsWorkbench(props: {
  kind: DsWorkbenchKind
  list?: ReactNode
  main: ReactNode
  inspector?: ReactNode
  label: string
}) {
  return (
    <section className={`ds-workbench ds-workbench--${props.kind}`} aria-label={props.label}>
      {props.list ? <aside className="ds-workbench__list">{props.list}</aside> : null}
      <main className="ds-workbench__main">{props.main}</main>
      {props.inspector ? (
        <aside className="ds-workbench__inspector">{props.inspector}</aside>
      ) : null}
    </section>
  )
}

/**
 * 对象型工作台的唯一标题配方。领域页面只提供内容槽位，不得覆写结构或字号。
 */
export function DsObjectHero(props: {
  eyebrow: ReactNode
  title: ReactNode
  objectId?: ReactNode
  summary?: ReactNode
  media?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header
      className={dsClasses('ds-object-hero', props.className)}
      data-has-media={props.media ? 'true' : 'false'}
    >
      {props.media ? <div className="ds-object-hero__media">{props.media}</div> : null}
      <div className="ds-object-hero__body">
        <p className="ds-object-hero__eyebrow">{props.eyebrow}</p>
        <h1 className="ds-object-hero__title">{props.title}</h1>
        {props.objectId ? <code className="ds-object-hero__id">{props.objectId}</code> : null}
        {props.summary ? <p className="ds-object-hero__summary">{props.summary}</p> : null}
      </div>
      {props.meta || props.actions ? (
        <div className="ds-object-hero__aside">
          {props.meta ? <div className="ds-object-hero__meta">{props.meta}</div> : null}
          {props.actions ? <div className="ds-object-hero__actions">{props.actions}</div> : null}
        </div>
      ) : null}
    </header>
  )
}

/** 目录中的完整宽度对象行；选中态固定为方角面 + 左侧强调线。 */
export const DsCatalogRow = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> & {
    selected?: boolean
    leading?: ReactNode
    title: ReactNode
    meta?: ReactNode
    trailing?: ReactNode
  }
>(function DsCatalogRow(props, ref) {
  const { selected = false, leading, title, meta, trailing, className, ...buttonProps } = props
  return (
    <button
      type="button"
      {...buttonProps}
      ref={ref}
      className={dsClasses('ds-catalog-row', className)}
      aria-pressed={selected}
      data-selected={selected || undefined}
    >
      {leading ? <span className="ds-catalog-row__leading">{leading}</span> : null}
      <span className="ds-catalog-row__body">
        <strong className="ds-catalog-row__title">{title}</strong>
        {meta ? <span className="ds-catalog-row__meta">{meta}</span> : null}
      </span>
      {trailing ? <span className="ds-catalog-row__trailing">{trailing}</span> : null}
    </button>
  )
})

/**
 * 目录中的分组标题。一级分组可承载新增等集合动作，二级分组只负责给同类对象建立清晰层级。
 */
export function DsCatalogGroupHeader(props: {
  title: ReactNode
  count?: number
  level?: 'primary' | 'secondary'
  actions?: ReactNode
  className?: string
}) {
  const level = props.level ?? 'primary'
  return (
    <div
      className={dsClasses(
        'ds-catalog-group-header',
        `ds-catalog-group-header--${level}`,
        props.className,
      )}
      data-level={level}
    >
      {level === 'primary' ? (
        <h3 className="ds-catalog-group-header__title">{props.title}</h3>
      ) : (
        <h4 className="ds-catalog-group-header__title">{props.title}</h4>
      )}
      {props.count === undefined ? null : (
        <span className="ds-catalog-group-header__count">{props.count}</span>
      )}
      <span className="ds-catalog-group-header__spacer" />
      {props.actions ? (
        <span className="ds-catalog-group-header__actions">{props.actions}</span>
      ) : null}
    </div>
  )
}

/**
 * 目录栏的统一搜索入口。外层配方负责为焦点环预留安全边距，并保证控件能随窄侧栏收缩。
 */
export const DsCatalogFilter = forwardRef<
  HTMLInputElement,
  Omit<ComponentPropsWithoutRef<typeof DsTextInput>, 'size'>
>(function DsCatalogFilter(props, ref) {
  return (
    <div className="ds-catalog-filter">
      <DsTextInput {...props} ref={ref} size="compact" />
    </div>
  )
})

/**
 * Inspector 中可跳转的引用行。领域页面只提供标题、说明与定位路径，
 * hover / focus / disabled 等交互状态由设计系统统一负责。
 */
export const DsReferenceRow = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> & {
    title: ReactNode
    detail?: ReactNode
    path?: ReactNode
  }
>(function DsReferenceRow(props, ref) {
  const { title, detail, path, className, ...buttonProps } = props
  return (
    <button
      type="button"
      {...buttonProps}
      ref={ref}
      className={dsClasses('ds-reference-row', className)}
    >
      <strong className="ds-reference-row__title">{title}</strong>
      {detail ? <span className="ds-reference-row__detail">{detail}</span> : null}
      {path ? <code className="ds-reference-row__path">{path}</code> : null}
    </button>
  )
})

export function DsReferenceList(props: { children: ReactNode; className?: string }) {
  return <div className={dsClasses('ds-reference-list', props.className)}>{props.children}</div>
}

/**
 * 有序编辑行的固定序号标记。它与 compact 控件同高，但不承担按钮或状态标签语义。
 */
export function DsSequenceIndex(props: {
  value: string | number
  accessibleLabel?: string
  decorative?: boolean
  className?: string
}) {
  return (
    <span
      className={dsClasses('ds-sequence-index', props.className)}
      aria-hidden={props.decorative || undefined}
    >
      <span aria-hidden="true">{props.value}</span>
      {!props.decorative ? (
        <span className="ds-visually-hidden">
          {props.accessibleLabel ?? `第 ${props.value} 项`}
        </span>
      ) : null}
    </span>
  )
}

/** 中央编辑区的结构化任务分组。 */
export function DsWorkbenchSection(props: {
  title: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <section className={dsClasses('ds-workbench-section', props.className)}>
      <header className="ds-workbench-section__header">
        <div className="ds-workbench-section__heading">
          {props.eyebrow ? <p className="ds-workbench-section__eyebrow">{props.eyebrow}</p> : null}
          <h2 className="ds-workbench-section__title">{props.title}</h2>
          {props.description ? (
            <p className="ds-workbench-section__description">{props.description}</p>
          ) : null}
        </div>
        {props.actions ? (
          <div className="ds-workbench-section__actions">{props.actions}</div>
        ) : null}
      </header>
      <div className={dsClasses('ds-workbench-section__content', props.contentClassName)}>
        {props.children}
      </div>
    </section>
  )
}

/** Inspector 的唯一带 padding 分区，避免说明和操作贴边。 */
export function DsInspectorSection(props: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={dsClasses('ds-inspector-section', props.className)}>
      <header className="ds-inspector-section__header">
        <h2 className="ds-inspector-section__title">{props.title}</h2>
        {props.actions}
      </header>
      {props.description ? (
        <p className="ds-inspector-section__description">{props.description}</p>
      ) : null}
      <div className="ds-inspector-section__content">{props.children}</div>
    </section>
  )
}

export interface DsInspectorTabItem extends DsTabItem {
  panel: ReactNode
}

/**
 * 长 Inspector 的固定分区骨架：标题由页面外壳持有，Tabs 固定，只有当前面板滚动。
 */
export function DsInspectorTabs(props: {
  id: string
  label: string
  items: readonly DsInspectorTabItem[]
  activeId: string
  onChange: (id: string) => void
  size?: DsControlSize
  className?: string
}) {
  return (
    <section className={dsClasses('ds-inspector-tabs', props.className)}>
      <DsTabs
        label={props.label}
        items={props.items}
        activeId={props.activeId}
        onChange={props.onChange}
        size={props.size}
        variant="inspector"
        idPrefix={props.id}
      />
      <div className="ds-inspector-tabs__panels">
        {props.items.map((item) => (
          <div
            key={item.id}
            id={`${props.id}-panel-${item.id}`}
            className="ds-inspector-tabs__panel"
            role="tabpanel"
            aria-labelledby={`${props.id}-tab-${item.id}`}
            tabIndex={0}
            hidden={item.id !== props.activeId}
          >
            {item.panel}
          </div>
        ))}
      </div>
    </section>
  )
}
