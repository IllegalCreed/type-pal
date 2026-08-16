import {
  type ButtonHTMLAttributes,
  Children,
  type ComponentPropsWithoutRef,
  forwardRef,
  isValidElement,
  type ReactNode,
  useState,
} from 'react'
import {
  DsButton,
  type DsControlSize,
  DsListHeader,
  DsStatus,
  type DsTabItem,
  DsTabs,
  DsTag,
  type DsTagTone,
  DsTextInput,
  dsClasses,
} from './controls.js'

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

export interface DsCatalogControlsProps
  extends ComponentPropsWithoutRef<typeof DsListHeader> {
  search?: ComponentPropsWithoutRef<typeof DsCatalogFilter>
  scope?: ReactNode
  filters?: ReactNode
  className?: string
}

/**
 * 左侧目录标题与筛选区的唯一组合配方。领域页面保留筛选状态，只提供共享控件槽位。
 */
export function DsCatalogControls(props: DsCatalogControlsProps) {
  const { search, scope, filters, className, ...headerProps } = props
  const filterItems = Children.toArray(filters)
  const hasBody = Boolean(scope || search || filterItems.length > 0)

  return (
    <div className={dsClasses('ds-catalog-controls', className)}>
      <DsListHeader {...headerProps} />
      {hasBody ? (
        <div className="ds-catalog-controls__body">
          {scope ? <div className="ds-catalog-controls__scope">{scope}</div> : null}
          {search ? (
            <div className="ds-catalog-controls__search">
              <DsCatalogFilter {...search} />
            </div>
          ) : null}
          {filterItems.length > 0 ? (
            <div className="ds-catalog-controls__filters" data-filter-count={filterItems.length}>
              {Children.map(filters, (filter) => (
                <div className="ds-catalog-controls__filter">{filter}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export type DsReferenceCount =
  | { kind: 'exact'; value: number }
  | { kind: 'at-least'; value: number }
  | { kind: 'unknown' }

export type DsReferencePanelState = 'ready' | 'empty' | 'loading' | 'partial' | 'error'

export interface DsReferenceImpact {
  kind: 'blocking' | 'informational'
  description: ReactNode
  label?: string
}

function referenceCountLabel(count: DsReferenceCount | undefined): string {
  if (!count || count.kind === 'unknown') return '数量未知'
  return count.kind === 'at-least' ? `至少 ${count.value} 处` : `${count.value} 处`
}

function referencePanelSummary(
  state: DsReferencePanelState,
  count: DsReferenceCount | undefined,
  impact: DsReferenceImpact,
): string {
  if (state === 'empty') return '未发现引用'
  if (state === 'loading') return `正在检查引用 · ${referenceCountLabel(count)}`
  if (state === 'partial') return `引用结果不完整 · ${referenceCountLabel(count)}`
  if (state === 'error') return '无法完成引用检查'
  const countLabel = referenceCountLabel(count)
  return impact.kind === 'blocking'
    ? `${countLabel}引用会阻断删除`
    : `${countLabel}使用位置，仅供定位`
}

/** Inspector 引用面的唯一状态与影响摘要。业务删除、扫描和定位命令仍由领域页面持有。 */
export function DsReferencePanel(props: {
  state: DsReferencePanelState
  count?: DsReferenceCount
  impact: DsReferenceImpact
  summary?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
}) {
  const tone =
    props.state === 'error'
      ? 'error'
      : props.state === 'partial' ||
          (props.state === 'ready' &&
            props.impact.kind === 'blocking' &&
            props.count?.kind !== 'exact')
        ? 'warning'
        : props.state === 'empty'
          ? 'success'
          : props.state === 'ready' && props.impact.kind === 'blocking'
            ? 'warning'
            : 'neutral'
  const impactLabel =
    props.impact.label ?? (props.impact.kind === 'blocking' ? '阻断删除' : '仅供定位')
  return (
    <section className={dsClasses('ds-reference-panel', props.className)} data-state={props.state}>
      <DsStatus tone={tone} action={props.action}>
        <span className="ds-reference-panel__status">
          <span className="ds-reference-panel__meta">
            <DsTag tone={props.impact.kind === 'blocking' ? 'warning' : 'neutral'}>
              {impactLabel}
            </DsTag>
            <span className="ds-reference-panel__count">{referenceCountLabel(props.count)}</span>
          </span>
          <strong className="ds-reference-panel__summary">
            {props.summary ?? referencePanelSummary(props.state, props.count, props.impact)}
          </strong>
          <span className="ds-reference-panel__description">{props.impact.description}</span>
        </span>
      </DsStatus>
      {props.children ? <div className="ds-reference-panel__body">{props.children}</div> : null}
    </section>
  )
}

/** 仅在来源、影响或操作确实不同时分组；count 一律为该组 occurrence 总和。 */
export function DsReferenceGroup(props: {
  title: ReactNode
  count: number
  children: ReactNode
  className?: string
}) {
  return (
    <section className={dsClasses('ds-reference-group', props.className)}>
      <header className="ds-reference-group__header">
        <h4 className="ds-reference-group__title">{props.title}</h4>
        <span className="ds-reference-group__count">{props.count}</span>
      </header>
      {props.children}
    </section>
  )
}

export type DsReferenceRowAction =
  | {
      href: string
      label?: ReactNode
      ariaLabel?: string
      target?: string
      rel?: string
      onActivate?: never
    }
  | {
      onActivate: () => void
      label?: ReactNode
      ariaLabel?: string
      href?: never
      target?: never
      rel?: never
    }

export interface DsReferenceRowStatus {
  label: ReactNode
  reason?: ReactNode
  tone?: 'neutral' | 'warning'
}

export interface DsReferenceRowLabel {
  label: ReactNode
  tone?: DsTagTone
}

/**
 * Inspector 引用面的唯一行。可定位行使用真实 link/button；只读与不可定位行使用静态 article，
 * 禁止用 disabled button 伪装成状态。
 */
export function DsReferenceRow(props: {
  title: ReactNode
  detail?: ReactNode
  path?: ReactNode
  labels?: readonly DsReferenceRowLabel[]
  occurrenceCount?: number
  action?: DsReferenceRowAction
  status?: DsReferenceRowStatus
  className?: string
}) {
  const content = (
    <>
      <span className="ds-reference-row__content">
        {props.labels?.length ? (
          <span className="ds-reference-row__labels">
            {props.labels.map((entry, index) => (
              <DsTag key={index} tone={entry.tone ?? 'neutral'}>
                {entry.label}
              </DsTag>
            ))}
          </span>
        ) : null}
        <strong
          className="ds-reference-row__title"
          title={typeof props.title === 'string' ? props.title : undefined}
        >
          {props.title}
        </strong>
        {props.detail ? <span className="ds-reference-row__detail">{props.detail}</span> : null}
        {props.path ? (
          <code
            className="ds-reference-row__path"
            title={typeof props.path === 'string' ? props.path : undefined}
          >
            {props.path}
          </code>
        ) : null}
        {props.status?.reason ? (
          <span className="ds-reference-row__reason">{props.status.reason}</span>
        ) : null}
      </span>
      <span className="ds-reference-row__trailing" data-tone={props.status?.tone ?? 'neutral'}>
        {props.occurrenceCount && props.occurrenceCount > 1
          ? `${props.occurrenceCount} 次 · `
          : null}
        {props.action?.label ?? props.status?.label ?? '只读'}
      </span>
    </>
  )
  const className = dsClasses('ds-reference-row', props.className)
  if (props.action && 'href' in props.action)
    return (
      <a
        className={className}
        data-actionable="true"
        href={props.action.href}
        target={props.action.target}
        rel={props.action.rel}
        aria-label={props.action.ariaLabel}
      >
        {content}
      </a>
    )
  if (props.action)
    return (
      <button
        type="button"
        className={className}
        data-actionable="true"
        aria-label={props.action.ariaLabel}
        onClick={props.action.onActivate}
      >
        {content}
      </button>
    )
  return <article className={className}>{content}</article>
}

export function DsReferenceList(props: {
  children: ReactNode
  className?: string
  initialVisibleCount?: number
}) {
  const entries = Children.toArray(props.children)
  const initialVisibleCount = props.initialVisibleCount ?? 12
  const identity = entries.map((entry) => (isValidElement(entry) ? entry.key : null)).join('\0')
  const [expansion, setExpansion] = useState({ identity, expanded: false })
  const expanded = expansion.identity === identity && expansion.expanded
  const visible = expanded ? entries : entries.slice(0, initialVisibleCount)
  const hiddenCount = Math.max(0, entries.length - initialVisibleCount)
  return (
    <div className={dsClasses('ds-reference-list', props.className)}>
      {visible}
      {hiddenCount ? (
        <DsButton
          className="ds-reference-list__toggle"
          variant="quiet"
          size="compact"
          onClick={() => setExpansion({ identity, expanded: !expanded })}
        >
          {expanded ? '收起' : `显示其余 ${hiddenCount} 条`}
        </DsButton>
      ) : null}
    </div>
  )
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
