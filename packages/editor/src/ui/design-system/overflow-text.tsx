import {
  type HTMLAttributes,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { DsFloatingLayer } from './floating-layer.js'

function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export type DsOverflowTextProps = Omit<
  HTMLAttributes<HTMLElement>,
  | 'children'
  | 'tabIndex'
  | 'aria-describedby'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'onFocus'
  | 'onBlur'
  | 'onKeyDown'
> & {
  as?: 'span' | 'code'
  children: string
}

/**
 * Selectable single-line information that reveals the same complete value only when it clips.
 * Do not use this for command labels or large catalog rows.
 */
export function DsOverflowText(props: DsOverflowTextProps) {
  const { as: Element = 'span', children, className, ...elementProps } = props
  const tooltipId = useId()
  const anchorRef = useRef<HTMLElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const clippedRef = useRef(false)
  const [clipped, setClipped] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const open = clipped && !dismissed && (hovered || focused)

  const measure = useCallback(() => {
    const node = anchorRef.current
    const next = Boolean(node && node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1)
    if (next === clippedRef.current) return
    clippedRef.current = next
    setClipped(next)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: a tag change replaces the observed DOM node even though access is through a stable ref.
  useLayoutEffect(() => {
    const node = anchorRef.current
    if (!node) return
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(node)
    if (!observer) window.addEventListener('resize', measure)

    let active = true
    const fonts = document.fonts
    const onFontsChanged = () => measure()
    fonts?.addEventListener('loadingdone', onFontsChanged)
    void fonts?.ready.then(() => {
      if (active) measure()
    })
    return () => {
      active = false
      observer?.disconnect()
      if (!observer) window.removeEventListener('resize', measure)
      fonts?.removeEventListener('loadingdone', onFontsChanged)
    }
  }, [Element, measure])

  // biome-ignore lint/correctness/useExhaustiveDependencies: new text must be measured even if the element's outer box does not resize.
  useLayoutEffect(() => {
    measure()
  }, [children, measure])

  useEffect(() => {
    if (!open) return
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setDismissed(true)
    }
    document.addEventListener('keydown', dismissOnEscape)
    return () => document.removeEventListener('keydown', dismissOnEscape)
  }, [open])

  return (
    <>
      <Element
        {...elementProps}
        ref={(node) => {
          anchorRef.current = node
        }}
        className={classes('ds-overflow-text', className)}
        tabIndex={clipped ? 0 : undefined}
        aria-describedby={clipped ? tooltipId : undefined}
        onMouseEnter={() => {
          setDismissed(false)
          setHovered(true)
        }}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => {
          setDismissed(false)
          setFocused(true)
        }}
        onBlur={() => setFocused(false)}
      >
        {children}
      </Element>
      {clipped ? (
        <span id={tooltipId} role="tooltip" className="ds-visually-hidden">
          {children}
        </span>
      ) : null}
      <DsFloatingLayer
        open={open}
        anchorRef={anchorRef}
        layerRef={layerRef}
        className="ds-tooltip__bubble ds-overflow-text__bubble"
        width="content"
        align="center"
        maxHeight={280}
        gap={6}
        dismissOnPointerDown={false}
        ariaHidden
        onDismiss={() => setDismissed(true)}
      >
        {children}
      </DsFloatingLayer>
    </>
  )
}
