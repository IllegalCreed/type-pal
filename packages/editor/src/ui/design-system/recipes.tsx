import {
  type ButtonHTMLAttributes,
  Children,
  type ComponentPropsWithoutRef,
  createContext,
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
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
import { DsIcon } from './icons.js'

export type DsWorkbenchKind = 'object' | 'media' | 'script' | 'table'

const DsInspectorContext = createContext(false)

/** 真实 Inspector 外壳；业务页面不得自行写 data-ds-inspector-host。 */
export function DsInspectorHost(props: {
  as?: 'div' | 'aside' | 'section'
  className?: string
  children: ReactNode
  hostRef?: Ref<HTMLElement>
  'aria-label'?: string
}) {
  const Element = props.as ?? 'div'
  return (
    <DsInspectorContext.Provider value>
      <Element
        ref={props.hostRef as never}
        className={props.className}
        aria-label={props['aria-label']}
        data-ds-inspector-host=""
      >
        {props.children}
      </Element>
    </DsInspectorContext.Provider>
  )
}

/** 把 Inspector 属性内容安全桥接到真实 Inspector DOM host。 */
export function DsInspectorPortal(props: { host: HTMLElement; children: ReactNode }) {
  if (!props.host.closest('[data-ds-inspector-host]'))
    throw new Error('DsInspectorPortal target must be inside a DsInspector host')
  return createPortal(
    <DsInspectorContext.Provider value>{props.children}</DsInspectorContext.Provider>,
    props.host,
  )
}

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
        <DsInspectorContext.Provider value>
          <aside className="ds-workbench__inspector" data-ds-inspector-host="">
            {props.inspector}
          </aside>
        </DsInspectorContext.Provider>
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

/**
 * 对象工作区的固定滚动壳。Hero 固定在中央列顶部，长内容只能由内部 content 持有滚动。
 * 领域页面可追加 className 做背景或宽度布局，但不得另建并列的 overflow owner。
 */
export function DsObjectWorkspace(props: {
  label: string
  hero?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <section className={dsClasses('ds-object-workspace', props.className)} aria-label={props.label}>
      {props.hero}
      <div className={dsClasses('ds-object-workspace__content', props.contentClassName)}>
        {props.children}
      </div>
    </section>
  )
}

/** 目录中的完整宽度对象行；选中态固定为方角面 + 左侧强调线。 */
export const DsCatalogRow = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> & {
    selected?: boolean
    level?: 'primary' | 'secondary'
    density?: 'compact' | 'standard'
    leading?: ReactNode
    title: ReactNode
    meta?: ReactNode
    trailing?: ReactNode
  }
>(function DsCatalogRow(props, ref) {
  const {
    selected = false,
    level = 'primary',
    density = 'standard',
    leading,
    title,
    meta,
    trailing,
    className,
    ...buttonProps
  } = props
  return (
    <button
      type="button"
      {...buttonProps}
      ref={ref}
      className={dsClasses('ds-catalog-row', `ds-catalog-row--${level}`, className)}
      aria-pressed={buttonProps.role === 'option' ? undefined : selected}
      aria-selected={buttonProps.role === 'option' ? selected : undefined}
      data-selected={selected || undefined}
      data-level={level}
      data-density={density}
      data-leading={leading ? 'present' : 'none'}
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
 * 目录中的分组列表。负责滚动收缩、分组间节奏和空分组文案，业务页只提供分类语义。
 */
export function DsCatalogGroupList(props: { label: string; children: ReactNode }) {
  return (
    <nav className="ds-catalog-group-list" aria-label={props.label}>
      {props.children}
    </nav>
  )
}

export function DsCatalogGroupEmpty(props: { children: ReactNode }) {
  return <p className="ds-catalog-group-list__empty">{props.children}</p>
}

type DsSizedRecipeElement = ReactElement<{ size?: DsControlSize }>

function assertRecipeOwnsDensity(children: ReactNode, owner: string): void {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const childProps = child.props as { children?: ReactNode; size?: DsControlSize }
    if (Object.hasOwn(childProps, 'size')) throw new Error(`density 只能由 ${owner} 设置`)
    if (childProps.children !== undefined) assertRecipeOwnsDensity(childProps.children, owner)
  })
}

function withRecipeDensity(
  element: DsSizedRecipeElement,
  density: DsControlSize,
  owner: string,
): DsSizedRecipeElement {
  assertRecipeOwnsDensity(element, owner)
  return cloneElement(element, { size: density })
}

/**
 * 选择/输入与尾部文字动作的唯一同行配方。density 只能在父级选一次，业务槽位不得自行覆写。
 */
export function DsInlineComposer(props: {
  density: DsControlSize
  control: DsSizedRecipeElement
  action: DsSizedRecipeElement
  className?: string
}) {
  return (
    <div className={dsClasses('ds-inline-composer', props.className)} data-density={props.density}>
      <div className="ds-inline-composer__layout">
        <div className="ds-inline-composer__control">
          {withRecipeDensity(props.control, props.density, 'DsInlineComposer')}
        </div>
        <div className="ds-inline-composer__action">
          {withRecipeDensity(props.action, props.density, 'DsInlineComposer')}
        </div>
      </div>
    </div>
  )
}

/**
 * 有序/可删除重复项的公共表面。领域 class 只决定列语义；尺寸档、边框和节奏由本配方持有。
 */
export function DsRepeatRow(props: {
  density: DsControlSize
  children: ReactNode
  className?: string
}) {
  assertRecipeOwnsDensity(props.children, 'DsRepeatRow')
  return (
    <div className={dsClasses('ds-repeat-row', props.className)} data-density={props.density}>
      {props.children}
    </div>
  )
}

/** 数值字段的有界宽度；窄容器中仍允许收缩到可用宽度。 */
export function DsFieldMeasure(props: {
  measure: 'short-number'
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={dsClasses(
        'ds-field-measure',
        `ds-field-measure--${props.measure}`,
        props.className,
      )}
      data-measure={props.measure}
    >
      {props.children}
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

export interface DsCatalogControlsProps extends ComponentPropsWithoutRef<typeof DsListHeader> {
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

type DsLocatorRowAction =
  | {
      href: string
      ariaLabel?: string
      target?: string
      rel?: string
      onActivate?: never
    }
  | {
      onActivate: () => void
      ariaLabel?: string
      href?: never
      target?: never
      rel?: never
    }

/** Reference 与 Diagnostic 共用的唯一定位行根节点；业务语义仍由各自公开配方持有。 */
function DsLocatorRowFrame(props: {
  action?: DsLocatorRowAction
  className: string
  content: ReactNode
}) {
  if (props.action && 'href' in props.action)
    return (
      <a
        className={props.className}
        data-actionable="true"
        href={props.action.href}
        target={props.action.target}
        rel={props.action.rel}
        aria-label={props.action.ariaLabel}
      >
        {props.content}
      </a>
    )
  if (props.action)
    return (
      <button
        type="button"
        className={props.className}
        data-actionable="true"
        aria-label={props.action.ariaLabel}
        onClick={props.action.onActivate}
      >
        {props.content}
      </button>
    )
  return <article className={props.className}>{props.content}</article>
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
        {props.action ? <DsIcon name="open" /> : null}
        {props.action?.label ?? (props.action ? '打开' : (props.status?.label ?? '只读'))}
      </span>
    </>
  )
  const className = dsClasses('ds-reference-row', props.className)
  return <DsLocatorRowFrame action={props.action} className={className} content={content} />
}

export function DsReferenceList(props: {
  children: ReactNode
  className?: string
  initialVisibleCount?: number
}) {
  const entries = Children.toArray(props.children)
  const initialVisibleCount = props.initialVisibleCount ?? 12
  const identity = [
    initialVisibleCount,
    entries.map((entry) => (isValidElement(entry) ? entry.key : null)).join('\0'),
  ].join('\0')
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

export type DsDiagnosticPanelState = 'ready' | 'clear' | 'partial' | 'failure'

export type DsDiagnosticCount =
  | { kind: 'exact'; errors: number; warnings: number }
  | { kind: 'at-least'; errors: number; warnings: number }
  | { kind: 'unknown' }

function diagnosticCountLabel(count: DsDiagnosticCount | undefined): string {
  if (!count || count.kind === 'unknown') return '数量未知'
  const prefix = count.kind === 'at-least' ? '至少 ' : ''
  return `${prefix}${count.errors} 个错误 · ${count.warnings} 个警告`
}

function diagnosticPanelSummary(
  state: DsDiagnosticPanelState,
  count: DsDiagnosticCount | undefined,
): string {
  if (state === 'clear') return '未发现诊断问题'
  if (state === 'partial') return `诊断结果不完整 · ${diagnosticCountLabel(count)}`
  if (state === 'failure') return '无法完成诊断'
  return diagnosticCountLabel(count)
}

/** 诊断面的唯一状态摘要；收集、严重度和定位语义仍由领域页面持有。 */
export function DsDiagnosticPanel(props: {
  state: DsDiagnosticPanelState
  count?: DsDiagnosticCount
  statusOwner?: 'panel' | 'external'
  summary?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
  label?: string
  live?: boolean
}) {
  const errors = props.count && props.count.kind !== 'unknown' ? props.count.errors : 0
  const warnings = props.count && props.count.kind !== 'unknown' ? props.count.warnings : 0
  const live = props.live ?? true
  const statusIsExternal =
    props.statusOwner === 'external' && props.state === 'ready' && props.count?.kind === 'exact'
  const tone =
    props.state === 'failure' || errors > 0
      ? 'error'
      : props.state === 'partial' || warnings > 0
        ? 'warning'
        : props.state === 'clear'
          ? 'success'
          : 'neutral'
  return (
    <section
      className={dsClasses('ds-diagnostic-panel', props.className)}
      data-state={props.state}
      aria-label={props.label ?? '诊断'}
    >
      {statusIsExternal ? null : (
        <div
          className={dsClasses('ds-status', tone !== 'neutral' && `ds-status--${tone}`)}
          role={live ? (tone === 'error' ? 'alert' : 'status') : undefined}
          aria-live={live ? (tone === 'error' ? 'assertive' : 'polite') : undefined}
        >
          <span className="ds-diagnostic-panel__status">
            <span className="ds-diagnostic-panel__meta">
              <DsTag
                tone={tone === 'error' ? 'danger' : tone === 'warning' ? 'warning' : 'neutral'}
              >
                {props.state === 'clear'
                  ? '正常'
                  : props.state === 'partial'
                    ? '结果不完整'
                    : props.state === 'failure'
                      ? '检查失败'
                      : '诊断'}
              </DsTag>
              <span className="ds-diagnostic-panel__count">
                {diagnosticCountLabel(props.count)}
              </span>
            </span>
            <strong className="ds-diagnostic-panel__summary">
              {props.summary ?? diagnosticPanelSummary(props.state, props.count)}
            </strong>
            {props.description ? (
              <span className="ds-diagnostic-panel__description">{props.description}</span>
            ) : null}
          </span>
          {props.action}
        </div>
      )}
      {props.children ? <div className="ds-diagnostic-panel__body">{props.children}</div> : null}
    </section>
  )
}

export type DsDiagnosticSeverity = 'error' | 'warning'

export type DsDiagnosticRowAction =
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

/** 单条诊断。严重度文本始终可见；不能定位的条目保持静态 article。 */
export function DsDiagnosticRow(props: {
  severity: DsDiagnosticSeverity
  title: ReactNode
  code?: ReactNode
  detail?: ReactNode
  path?: ReactNode
  action?: DsDiagnosticRowAction
  statusLabel?: ReactNode
  className?: string
}) {
  const content = (
    <>
      <span className="ds-diagnostic-row__content">
        <span className="ds-diagnostic-row__labels">
          <DsTag tone={props.severity === 'error' ? 'danger' : 'warning'}>
            {props.severity === 'error' ? '错误' : '警告'}
          </DsTag>
        </span>
        <strong className="ds-diagnostic-row__title">{props.title}</strong>
        {props.code ? <code className="ds-diagnostic-row__code">{props.code}</code> : null}
        {props.detail ? <span className="ds-diagnostic-row__detail">{props.detail}</span> : null}
        {props.path ? <code className="ds-diagnostic-row__path">{props.path}</code> : null}
      </span>
      <span className="ds-diagnostic-row__trailing">
        {props.action ? <DsIcon name="open" /> : null}
        {props.action?.label ?? (props.action ? '跳转' : (props.statusLabel ?? '仅提示'))}
      </span>
    </>
  )
  return (
    <DsLocatorRowFrame
      action={props.action}
      className={dsClasses(
        'ds-diagnostic-row',
        `ds-diagnostic-row--${props.severity}`,
        props.className,
      )}
      content={content}
    />
  )
}

/** 诊断列表统一持有 list/listitem 语义与可选的渐进展开。 */
export function DsDiagnosticList(props: {
  children: ReactNode
  className?: string
  layout?: 'stack' | 'adaptive-grid'
  initialVisibleCount?: number
  pageSize?: number
  onViewAll?: () => void
  viewAllLabel?: ReactNode
  allowShowAll?: boolean
}) {
  const entries = Children.toArray(props.children)
  const initialVisibleCount = Math.max(0, props.initialVisibleCount ?? entries.length)
  const pageSize = Math.max(1, (props.pageSize ?? initialVisibleCount) || 1)
  const identity = [
    initialVisibleCount,
    entries.map((entry) => (isValidElement(entry) ? entry.key : null)).join('\0'),
  ].join('\0')
  const [pagination, setPagination] = useState({ identity, visibleCount: initialVisibleCount })
  const visibleCount =
    pagination.identity === identity ? pagination.visibleCount : initialVisibleCount
  const visible = entries.slice(0, visibleCount)
  const hiddenCount = Math.max(0, entries.length - visible.length)
  const allowShowAll = props.allowShowAll ?? true
  const canCollapse = !props.onViewAll && allowShowAll && visible.length > initialVisibleCount
  return (
    <div
      className={dsClasses(
        'ds-diagnostic-list',
        props.layout === 'adaptive-grid' && 'ds-diagnostic-list--adaptive-grid',
        props.className,
      )}
    >
      <ul className="ds-diagnostic-list__items">
        {visible.map((entry, index) => (
          <li
            className="ds-diagnostic-list__item"
            key={isValidElement(entry) && entry.key != null ? entry.key : index}
          >
            {entry}
          </li>
        ))}
      </ul>
      {entries.length > initialVisibleCount ? (
        <div className="ds-diagnostic-list__pagination">
          <span className="ds-diagnostic-list__progress" role="status" aria-live="polite">
            {hiddenCount > 0
              ? `已显示 ${visible.length} / ${entries.length} 项`
              : `已显示全部 ${entries.length} 项`}
          </span>
          <span className="ds-diagnostic-list__actions">
            {props.onViewAll && hiddenCount > 0 ? (
              <DsButton size="compact" variant="quiet" onClick={props.onViewAll}>
                {props.viewAllLabel ?? `查看全部 ${entries.length} 项`}
              </DsButton>
            ) : null}
            {!props.onViewAll && hiddenCount > 0 ? (
              <>
                <DsButton
                  size="compact"
                  variant="quiet"
                  onClick={() =>
                    setPagination({
                      identity,
                      visibleCount: Math.min(entries.length, visibleCount + pageSize),
                    })
                  }
                >
                  继续显示 {Math.min(pageSize, hiddenCount)} 项
                </DsButton>
                {allowShowAll ? (
                  <DsButton
                    size="compact"
                    variant="quiet"
                    onClick={() => setPagination({ identity, visibleCount: entries.length })}
                  >
                    显示全部
                  </DsButton>
                ) : null}
              </>
            ) : null}
            {canCollapse ? (
              <DsButton
                size="compact"
                variant="quiet"
                onClick={() => setPagination({ identity, visibleCount: initialVisibleCount })}
              >
                收起至前 {initialVisibleCount} 项
              </DsButton>
            ) : null}
          </span>
        </div>
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

/**
 * Inspector 基本信息的统一双列属性表。领域页面只提供值或控件，不再自行拼接标签列与信息卡。
 */
export function DsPropertyGrid(props: { children: ReactNode; className?: string }) {
  const inInspector = useContext(DsInspectorContext)
  const elementRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (
      import.meta.env.DEV &&
      elementRef.current &&
      !elementRef.current.closest('[data-ds-inspector-host]')
    )
      throw new Error('DsPropertyGrid must render under a real Inspector DOM host')
  }, [])
  if (import.meta.env.DEV && !inInspector)
    throw new Error('DsPropertyGrid must render inside a real DsInspector host')
  return (
    <div ref={elementRef} className={dsClasses('ds-property-grid', props.className)}>
      {props.children}
    </div>
  )
}

/** Inspector 属性表中的单行；帮助文字跟随对应值，不另起一套表单布局。 */
export function DsPropertyRow(props: {
  label: ReactNode
  children: ReactNode
  help?: ReactNode
  labelFor?: string
  className?: string
}) {
  const label = props.labelFor ? (
    <label className="ds-property-row__label" htmlFor={props.labelFor}>
      {props.label}
    </label>
  ) : (
    <span className="ds-property-row__label">{props.label}</span>
  )
  return (
    <div
      className={dsClasses('ds-property-row', props.className)}
      data-property-label={typeof props.label === 'string' ? props.label : undefined}
    >
      {label}
      <div className="ds-property-row__value">
        {props.children}
        {props.help ? <p className="ds-property-row__help">{props.help}</p> : null}
      </div>
    </div>
  )
}

/** 主工作区和对话框的只读信息列表；不借用 Inspector 的 60px 属性轨。 */
export function DsReadoutList(props: { children: ReactNode; className?: string }) {
  return (
    <dl className={dsClasses('ds-readout-list', props.className)} data-ds-readout-list="">
      {props.children}
    </dl>
  )
}

/** 只读信息行；宽容器共享 96px 名称轨，窄于 480px 整行上下排列。 */
export function DsReadoutRow(props: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={dsClasses('ds-readout-row', props.className)}>
      <dt className="ds-readout-row__label">{props.label}</dt>
      <dd className="ds-readout-row__value">{props.children}</dd>
    </div>
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
    <DsInspectorContext.Provider value>
      <section
        className={dsClasses('ds-inspector-tabs', props.className)}
        data-ds-inspector-host=""
      >
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
    </DsInspectorContext.Provider>
  )
}
