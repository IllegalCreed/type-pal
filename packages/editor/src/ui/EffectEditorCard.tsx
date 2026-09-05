import {
  createContext,
  type ReactNode,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { type DsControlSize, DsIconButton } from './design-system/controls.js'
import { DsReorderItem, DsReorderMoveButton } from './design-system/reorder.js'

export interface EffectEditorPreview {
  label: string
  content: ReactNode
}

type PendingRemovalFocus = {
  itemKey?: string
}

type EffectEditorChainContextValue = {
  remove: (trigger: HTMLButtonElement, label: string, onRemove: () => void) => void
}

const EffectEditorChainContext = createContext<EffectEditorChainContextValue | null>(null)

function focusTargetInItem(item: HTMLElement | undefined): HTMLElement | null {
  if (!item) return null
  return (
    item.querySelector<HTMLElement>(
      '[data-effect-editor-kind] select:not(:disabled), [data-effect-editor-kind] [role=combobox]:not([aria-disabled="true"]), [data-effect-editor-kind] button:not(:disabled), [data-effect-editor-kind] input:not(:disabled)',
    ) ?? item.querySelector<HTMLElement>('[data-ds-reorder-handle]:not(:disabled)')
  )
}

/**
 * Persistent owner for one effect chain. Besides the visible grouping it owns deletion focus recovery
 * and the polite announcement that must survive after the removed card unmounts.
 */
export function EffectEditorChain(props: {
  family: string
  label: string
  dataSide?: string
  children: ReactNode
}) {
  const rootRef = useRef<HTMLElement>(null)
  const [pendingFocus, setPendingFocus] = useState<PendingRemovalFocus | null>(null)
  const [announcement, setAnnouncement] = useState<{ id: number; text: string } | null>(null)
  const nextAnnouncementId = useRef(1)

  useLayoutEffect(() => {
    if (!pendingFocus) return
    const root = rootRef.current
    if (!root) return
    const item = pendingFocus.itemKey
      ? [...root.querySelectorAll<HTMLElement>('[data-ds-reorder-item][data-item-key]')].find(
          (candidate) => candidate.dataset.itemKey === pendingFocus.itemKey,
        )
      : undefined
    const target =
      focusTargetInItem(item) ??
      root.querySelector<HTMLElement>('[data-effect-editor-add]:not(:disabled)')
    target?.focus()
    setPendingFocus(null)
  }, [pendingFocus])

  const remove: EffectEditorChainContextValue['remove'] = (trigger, label, onRemove) => {
    const item = trigger.closest<HTMLElement>('[data-ds-reorder-item][data-item-key]')
    const nextKey = (item?.nextElementSibling as HTMLElement | null)?.dataset.itemKey
    const previousKey = (item?.previousElementSibling as HTMLElement | null)?.dataset.itemKey
    onRemove()
    setPendingFocus({ itemKey: nextKey ?? previousKey })
    setAnnouncement({
      id: nextAnnouncementId.current++,
      text: `${label} 已删除。`,
    })
  }

  return (
    <EffectEditorChainContext.Provider value={{ remove }}>
      <section
        ref={rootRef}
        className="effect-editor-chain"
        aria-label={props.label}
        data-effect-editor-chain="true"
        data-effect-editor-family={props.family}
        data-side={props.dataSide}
      >
        {props.children}
        <span className="ds-reorder-live" aria-live="polite" aria-atomic="true">
          {announcement ? <span key={announcement.id}>{announcement.text}</span> : null}
        </span>
      </section>
    </EffectEditorChainContext.Provider>
  )
}

/**
 * Shared domain card for "choose an effect type, then edit that type's dependent parameters".
 * Business mutation, validation and draft ownership intentionally stay in the host editor.
 */
export function EffectEditorCard(props: {
  itemKey: string
  label: string
  density: DsControlSize
  effectKind: string
  kindControl: ReactNode
  children: ReactNode
  onRemove: () => void
  removeDisabled?: boolean
  removeTitle?: string
  fieldsLayout?: 'default' | 'item' | 'skill' | 'equipment' | 'casualty'
  bodyLabel?: string
  preview?: EffectEditorPreview
}) {
  const chain = useContext(EffectEditorChainContext)
  if (!chain) throw new Error('EffectEditorCard must be rendered inside EffectEditorChain')
  const id = useId()
  const headingId = `${id}-heading`
  const fieldsHeadingId = `${id}-fields-heading`

  return (
    <DsReorderItem
      as="li"
      itemKey={props.itemKey}
      layout="overlay"
      className="effect-editor-card-item"
    >
      <section
        className="effect-editor-card"
        aria-labelledby={headingId}
        data-effect-editor-card="true"
        data-effect-editor-key={props.itemKey}
        data-effect-kind={props.effectKind}
        data-density={props.density}
        data-has-preview={props.preview ? 'true' : 'false'}
      >
        <div className="effect-editor-card__editor">
          <header className="effect-editor-card__header" data-effect-editor-header="true">
            <h3 id={headingId} className="effect-editor-card__title">
              {props.label}
            </h3>
            <div className="effect-editor-card__kind" data-effect-editor-kind="true">
              {props.kindControl}
            </div>
            <span className="effect-editor-card__spacer" aria-hidden="true" />
            {/* biome-ignore lint/a11y/useSemanticElements: Named command/menu group, not a form fieldset. */}
            <span
              className="effect-editor-card__actions ds-control-group__actions"
              role="group"
              aria-label={`${props.label}排序与删除`}
              data-effect-editor-actions="true"
            >
              <DsReorderMoveButton
                itemKey={props.itemKey}
                direction="backward"
                label={`上移${props.label}`}
              />
              <DsReorderMoveButton
                itemKey={props.itemKey}
                direction="forward"
                label={`下移${props.label}`}
              />
              <DsIconButton
                size="compact"
                variant="danger"
                icon="delete"
                label={`删除${props.label}`}
                title={props.removeTitle}
                disabled={props.removeDisabled}
                onClick={(event) => chain.remove(event.currentTarget, props.label, props.onRemove)}
              />
            </span>
          </header>
          <section className="effect-editor-card__body" aria-labelledby={fieldsHeadingId}>
            <h4
              id={fieldsHeadingId}
              className={props.bodyLabel ? 'effect-editor-card__body-title' : 'ds-visually-hidden'}
            >
              {props.bodyLabel ?? '效果参数'}
            </h4>
            <div
              className="effect-editor-card__fields"
              data-effect-editor-fields="true"
              data-effect-fields-layout={props.fieldsLayout ?? 'default'}
            >
              {props.children ?? (
                <span className="effect-editor-card__empty-parameters">此效果无需设置参数</span>
              )}
            </div>
          </section>
        </div>
        {props.preview ? (
          <figure className="effect-editor-card__preview" data-effect-editor-preview="true">
            <figcaption>{props.preview.label}</figcaption>
            {props.preview.content}
          </figure>
        ) : null}
      </section>
    </DsReorderItem>
  )
}
