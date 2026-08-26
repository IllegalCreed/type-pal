import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

type DsFloatingPlacement = 'top' | 'bottom'
type DsFloatingWidth = 'anchor' | 'content'
type DsFloatingAlign = 'start' | 'center' | 'end'

interface DsFloatingLayout {
  placement: DsFloatingPlacement
  style: CSSProperties
}

export function resolveDsPortalHost(anchor: HTMLElement | null): Element {
  return (
    anchor?.closest(
      'dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]',
    ) ?? document.body
  )
}

/**
 * Top-level anchored surface used by controls that must escape scrolling panels.
 * Native modal dialogs live in the browser top layer, so a layer anchored inside one must portal
 * back into that dialog instead of document.body; z-index cannot cross the top-layer boundary.
 * It owns geometry and optional light-dismiss only; tooltip/listbox/menu semantics stay with callers.
 */
export function DsFloatingLayer(props: {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  layerRef: RefObject<HTMLDivElement | null>
  className: string
  maxHeight?: number
  gap?: number
  width?: DsFloatingWidth
  align?: DsFloatingAlign
  dismissOnPointerDown?: boolean
  ariaHidden?: boolean
  onDismiss: () => void
  children: ReactNode
}) {
  const { anchorRef, layerRef, onDismiss, open } = props
  const [layout, setLayout] = useState<DsFloatingLayout | null>(null)
  const gap = props.gap ?? 4
  const maxHeight = props.maxHeight ?? 360
  const widthMode = props.width ?? 'anchor'
  const align = props.align ?? 'start'
  const dismissOnPointerDown = props.dismissOnPointerDown ?? true

  const updateLayout = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const viewportGap = 8
    const viewportWidthLimit = Math.max(0, viewportWidth - viewportGap * 2)
    const layerRect = layerRef.current?.getBoundingClientRect()
    const measuredContentWidth = Math.max(0, layerRect?.width ?? 0)
    const width = Math.min(
      widthMode === 'anchor' ? rect.width : measuredContentWidth || viewportWidthLimit,
      viewportWidthLimit,
    )
    const desiredLeft =
      align === 'center'
        ? rect.left + rect.width / 2 - width / 2
        : align === 'end'
          ? rect.right - width
          : rect.left
    const left = Math.min(
      Math.max(viewportGap, desiredLeft),
      Math.max(viewportGap, viewportWidth - viewportGap - width),
    )
    const below = viewportHeight - rect.bottom - gap - viewportGap
    const above = rect.top - gap - viewportGap
    const measuredContentHeight = Math.max(0, layerRect?.height ?? 0)
    const desiredHeight = measuredContentHeight || Math.min(180, maxHeight)
    const placement: DsFloatingPlacement =
      below < Math.min(maxHeight, desiredHeight) && above > below ? 'top' : 'bottom'
    const available = placement === 'top' ? above : below
    const availableHeight = Math.max(0, Math.min(maxHeight, available))
    const style: CSSProperties = {
      left,
      width: widthMode === 'anchor' ? width : undefined,
      maxWidth: widthMode === 'content' ? viewportWidthLimit : undefined,
      maxHeight: availableHeight,
      visibility: width > 0 ? 'visible' : 'hidden',
    }
    if (placement === 'top') style.bottom = viewportHeight - rect.top + gap
    else style.top = rect.bottom + gap
    setLayout({ placement, style })
  }, [align, anchorRef, gap, layerRef, maxHeight, widthMode])

  useLayoutEffect(() => {
    if (!open) {
      setLayout(null)
      return
    }
    updateLayout()

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (anchorRef.current?.contains(target) || layerRef.current?.contains(target)) return
      onDismiss()
    }
    const onViewportChange = () => updateLayout()
    const onScroll = (event: Event) => {
      const target = event.target
      if (target instanceof Node && layerRef.current?.contains(target)) return
      updateLayout()
    }
    if (dismissOnPointerDown) document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('resize', onViewportChange)
    document.addEventListener('scroll', onScroll, true)
    window.visualViewport?.addEventListener('resize', onViewportChange)
    window.visualViewport?.addEventListener('scroll', onViewportChange)
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            updateLayout()
          })
    if (anchorRef.current) observer?.observe(anchorRef.current)
    if (layerRef.current) observer?.observe(layerRef.current)
    return () => {
      if (dismissOnPointerDown) document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('resize', onViewportChange)
      document.removeEventListener('scroll', onScroll, true)
      window.visualViewport?.removeEventListener('resize', onViewportChange)
      window.visualViewport?.removeEventListener('scroll', onViewportChange)
      observer?.disconnect()
    }
  }, [anchorRef, dismissOnPointerDown, layerRef, onDismiss, open, updateLayout])

  if (!open || typeof document === 'undefined') return null
  const portalHost = resolveDsPortalHost(anchorRef.current)
  return createPortal(
    <div
      ref={props.layerRef}
      className={props.className}
      data-placement={layout?.placement ?? 'bottom'}
      aria-hidden={props.ariaHidden || undefined}
      style={layout?.style ?? { visibility: 'hidden' }}
    >
      {props.children}
    </div>,
    portalHost,
  )
}
