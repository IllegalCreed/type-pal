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

interface DsFloatingLayout {
  placement: DsFloatingPlacement
  style: CSSProperties
}

/**
 * Top-level anchored surface used by controls that must escape scrolling panels.
 * It owns geometry and light-dismiss only; listbox/menu semantics stay with callers.
 */
export function DsFloatingLayer(props: {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  layerRef: RefObject<HTMLDivElement | null>
  className: string
  maxHeight?: number
  gap?: number
  onDismiss: () => void
  children: ReactNode
}) {
  const { anchorRef, layerRef, onDismiss, open } = props
  const [layout, setLayout] = useState<DsFloatingLayout | null>(null)
  const gap = props.gap ?? 4
  const maxHeight = props.maxHeight ?? 360

  const updateLayout = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const viewportGap = 8
    const width = Math.max(0, Math.min(rect.width, viewportWidth - viewportGap * 2))
    const left = Math.min(
      Math.max(viewportGap, rect.left),
      Math.max(viewportGap, viewportWidth - viewportGap - width),
    )
    const below = viewportHeight - rect.bottom - gap - viewportGap
    const above = rect.top - gap - viewportGap
    const placement: DsFloatingPlacement = below < 180 && above > below ? 'top' : 'bottom'
    const available = placement === 'top' ? above : below
    const availableHeight = Math.max(0, Math.min(maxHeight, available))
    const style: CSSProperties = {
      left,
      width,
      maxHeight: availableHeight,
      visibility: width > 0 ? 'visible' : 'hidden',
    }
    if (placement === 'top') style.bottom = viewportHeight - rect.top + gap
    else style.top = rect.bottom + gap
    setLayout({ placement, style })
  }, [anchorRef, gap, maxHeight])

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
    document.addEventListener('pointerdown', onPointerDown, true)
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
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('resize', onViewportChange)
      document.removeEventListener('scroll', onScroll, true)
      window.visualViewport?.removeEventListener('resize', onViewportChange)
      window.visualViewport?.removeEventListener('scroll', onViewportChange)
      observer?.disconnect()
    }
  }, [anchorRef, layerRef, onDismiss, open, updateLayout])

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div
      ref={props.layerRef}
      className={props.className}
      data-placement={layout?.placement ?? 'bottom'}
      style={layout?.style ?? { visibility: 'hidden' }}
    >
      {props.children}
    </div>,
    document.body,
  )
}
