import {
  cloneElement,
  isValidElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { classes } from './control-utils.js'
import { DsFloatingLayer } from './floating-layer.js'

export function DsTooltip(props: { label: string; shortcut?: string; children: ReactNode }) {
  const tooltipId = useId()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const pointerInitiatedFocus = useRef(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const open = !dismissed && (hovered || focused)
  const description = props.shortcut ? `${props.label} · ${props.shortcut}` : props.label
  const child = isValidElement<{ 'aria-describedby'?: string }>(props.children)
    ? cloneElement(props.children, {
        'aria-describedby': classes(props.children.props['aria-describedby'], tooltipId),
      })
    : props.children

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
      {/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper only delegates hover/focus from the wrapped native control; it is not a separate interaction target. */}
      <span
        ref={anchorRef}
        className="ds-tooltip"
        onMouseEnter={() => {
          setDismissed(false)
          setHovered(true)
        }}
        onMouseLeave={() => setHovered(false)}
        onPointerDownCapture={() => {
          pointerInitiatedFocus.current = true
          setDismissed(true)
          setHovered(false)
          setFocused(false)
        }}
        onFocusCapture={() => {
          if (pointerInitiatedFocus.current) return
          setDismissed(false)
          setFocused(true)
        }}
        onBlurCapture={() => {
          pointerInitiatedFocus.current = false
          setFocused(false)
        }}
      >
        {child}
        <span id={tooltipId} role="tooltip" className="ds-visually-hidden">
          {description}
        </span>
      </span>
      <DsFloatingLayer
        open={open}
        anchorRef={anchorRef}
        layerRef={layerRef}
        className="ds-tooltip__bubble"
        width="content"
        align="center"
        maxHeight={280}
        gap={6}
        dismissOnPointerDown={false}
        ariaHidden
        onDismiss={() => setDismissed(true)}
      >
        {description}
      </DsFloatingLayer>
    </>
  )
}

/**
 * Low-frequency conceptual help and static invariants. Current state, validation, recoverable
 * blocking reasons and next actions must remain visible content instead of being hidden here.
 */
export function DsHelpTip(props: { label: string; children: ReactNode }) {
  const tooltipId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [dismissed, setDismissed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const open = !dismissed && (hovered || focused)

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
      <span className={`ds-help-tip${open ? ' is-open' : ''}`}>
        <button
          ref={buttonRef}
          type="button"
          aria-label={`${props.label}说明`}
          aria-describedby={tooltipId}
          onMouseEnter={() => {
            setHovered(true)
            setDismissed(false)
          }}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => {
            setFocused(true)
            setDismissed(false)
          }}
          onBlur={() => setFocused(false)}
        >
          <span aria-hidden="true">?</span>
        </button>
        <span id={tooltipId} role="tooltip" className="ds-visually-hidden">
          {props.children}
        </span>
      </span>
      <DsFloatingLayer
        open={open}
        anchorRef={buttonRef}
        layerRef={tooltipRef}
        className="ds-help-tooltip is-open"
        width="content"
        align="center"
        maxHeight={360}
        gap={7}
        dismissOnPointerDown={false}
        ariaHidden
        onDismiss={() => setDismissed(true)}
      >
        {props.children}
      </DsFloatingLayer>
    </>
  )
}
