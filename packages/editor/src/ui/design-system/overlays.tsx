// biome-ignore-all lint/a11y/noRedundantRoles: jsdom does not expose native dialog roles, while consumers and tests rely on an explicit public dialog contract.
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react'
import { DsIconButton } from './controls.js'

let documentScrollLockCount = 0
let documentOverflowBeforeLock = ''

function acquireDocumentScrollLock(): () => void {
  if (documentScrollLockCount === 0) {
    documentOverflowBeforeLock = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  documentScrollLockCount += 1
  let released = false
  return () => {
    if (released) return
    released = true
    documentScrollLockCount = Math.max(0, documentScrollLockCount - 1)
    if (documentScrollLockCount === 0) {
      document.body.style.overflow = documentOverflowBeforeLock
      documentOverflowBeforeLock = ''
    }
  }
}

function canRestoreFocus(element: HTMLElement | null): element is HTMLElement {
  if (!element?.isConnected || element.closest('[inert]')) return false
  if (element === document.body || element === document.documentElement) return false
  const ownerDialog = element.closest('dialog')
  if (ownerDialog && !ownerDialog.open) return false
  if (element.getAttribute('aria-disabled') === 'true') return false
  if ('disabled' in element && Boolean((element as HTMLButtonElement).disabled)) return false
  return true
}

interface DialogOpenCycle {
  opener: HTMLElement | null
  releaseScroll: () => void
  initialFocusFrame: number | null
  initialFocusScheduled: boolean
  finished: boolean
}

function useDialogState(
  ref: RefObject<HTMLDialogElement | null>,
  open: boolean,
  onClose: () => void,
  fallbackFocusRef?: RefObject<HTMLElement | null>,
) {
  const openRef = useRef(open)
  const onCloseRef = useRef(onClose)
  const fallbackFocusRefRef = useRef(fallbackFocusRef)
  const cycleRef = useRef<DialogOpenCycle | null>(null)
  const lastExternalOpenerRef = useRef<HTMLElement | null>(null)
  const restoreFocusFrameRef = useRef<number | null>(null)
  const pendingControlledCloseEventsRef = useRef(0)
  openRef.current = open
  onCloseRef.current = onClose
  fallbackFocusRefRef.current = fallbackFocusRef

  const cancelFrame = (frame: number | null) => {
    if (frame != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
  }

  const finishCycle = useCallback((restoreFocus: boolean) => {
    const cycle = cycleRef.current
    if (!cycle || cycle.finished) return
    cycle.finished = true
    cancelFrame(cycle.initialFocusFrame)
    cycle.initialFocusFrame = null
    cycle.releaseScroll()
    cycleRef.current = null
    if (!restoreFocus) return
    cancelFrame(restoreFocusFrameRef.current)
    restoreFocusFrameRef.current = requestAnimationFrame(() => {
      restoreFocusFrameRef.current = null
      const target = canRestoreFocus(cycle.opener)
        ? cycle.opener
        : canRestoreFocus(fallbackFocusRefRef.current?.current ?? null)
          ? (fallbackFocusRefRef.current?.current ?? null)
          : null
      target?.focus()
    })
  }, [])

  const startCycle = useCallback((dialog: HTMLDialogElement) => {
    cancelFrame(restoreFocusFrameRef.current)
    restoreFocusFrameRef.current = null
    if (cycleRef.current) finishCycle(false)
    const activeElement = document.activeElement as HTMLElement | null
    const externalOpener =
      activeElement && !dialog.contains(activeElement) && activeElement !== document.body
        ? activeElement
        : lastExternalOpenerRef.current
    if (externalOpener) lastExternalOpenerRef.current = externalOpener
    const cycle: DialogOpenCycle = {
      opener: externalOpener,
      releaseScroll: acquireDocumentScrollLock(),
      initialFocusFrame: null,
      initialFocusScheduled: false,
      finished: false,
    }
    cycleRef.current = cycle
  }, [finishCycle])

  const scheduleInitialFocus = useCallback((dialog: HTMLDialogElement) => {
    const cycle = cycleRef.current
    if (!cycle || cycle.finished || cycle.initialFocusScheduled) return
    cycle.initialFocusScheduled = true
    cycle.initialFocusFrame = requestAnimationFrame(() => {
      cycle.initialFocusFrame = null
      if (cycle.finished || cycleRef.current !== cycle || !dialog.open) return
      const target =
        dialog.querySelector<HTMLElement>('[autofocus]') ??
        dialog.querySelector<HTMLElement>(
          '.ds-overlay__body input, .ds-overlay__body select, .ds-overlay__body textarea',
        ) ??
        dialog.querySelector<HTMLElement>('.ds-overlay__body button') ??
        dialog.querySelector<HTMLElement>('.ds-overlay__footer button') ??
        dialog.querySelector<HTMLElement>('.ds-overlay__header button')
      target?.focus()
    })
  }, [])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleClose = () => {
      if (pendingControlledCloseEventsRef.current > 0) {
        pendingControlledCloseEventsRef.current -= 1
        return
      }
      finishCycle(true)
      if (openRef.current) onCloseRef.current()
    }
    dialog.addEventListener('close', handleClose)
    return () => {
      dialog.removeEventListener('close', handleClose)
      finishCycle(true)
    }
  }, [finishCycle, ref])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) {
      if (!cycleRef.current) startCycle(dialog)
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal()
        else dialog.setAttribute('open', '')
      }
      scheduleInitialFocus(dialog)
      return
    }
    if (dialog.open) {
      if (typeof dialog.close === 'function') {
        pendingControlledCloseEventsRef.current += 1
        dialog.close()
      } else dialog.removeAttribute('open')
    }
    finishCycle(true)
  }, [finishCycle, open, ref, scheduleInitialFocus, startCycle])

  const requestClose = useCallback(() => {
    const dialog = ref.current
    if (!dialog) return
    if (typeof dialog.requestClose === 'function') dialog.requestClose()
    else onCloseRef.current()
  }, [ref])

  return requestClose
}

export function DsDialog(props: {
  open: boolean
  role?: 'dialog' | 'alertdialog'
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  closeLabel?: string
  className?: string
  dismissible?: boolean
  ariaBusy?: boolean
  fallbackFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const instanceId = useId().replace(/:/g, '')
  const titleId = `ds-dialog-${instanceId}-title`
  const descriptionId = props.description ? `ds-dialog-${instanceId}-description` : undefined
  const dismissible = props.dismissible ?? true
  const requestClose = useDialogState(ref, props.open, props.onClose, props.fallbackFocusRef)
  return (
    <dialog
      ref={ref}
      role={props.role ?? 'dialog'}
      className={`ds-dialog${props.className ? ` ${props.className}` : ''}`}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-label={props.title}
      aria-modal="true"
      aria-busy={props.ariaBusy || undefined}
      onCancel={(event) => {
        event.preventDefault()
        if (dismissible) props.onClose()
      }}
    >
      <header className="ds-overlay__header">
        <h2 id={titleId} className="ds-card__title">
          {props.title}
        </h2>
        <span className="ds-spacer" />
        {dismissible ? (
          <DsIconButton label={props.closeLabel ?? '关闭'} icon="close" onClick={requestClose} />
        ) : null}
      </header>
      <div className="ds-overlay__body">
        {props.description ? (
          <p id={descriptionId} className="ds-field__help">
            {props.description}
          </p>
        ) : null}
        {props.children}
      </div>
      {props.footer ? <footer className="ds-overlay__footer">{props.footer}</footer> : null}
    </dialog>
  )
}

export function DsDrawer(props: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const instanceId = useId().replace(/:/g, '')
  const titleId = `ds-drawer-${instanceId}-title`
  const requestClose = useDialogState(ref, props.open, props.onClose)
  return (
    <dialog
      ref={ref}
      role="dialog"
      className="ds-drawer"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        props.onClose()
      }}
    >
      <header className="ds-overlay__header">
        <h2 id={titleId} className="ds-card__title">
          {props.title}
        </h2>
        <span className="ds-spacer" />
        <DsIconButton label="关闭" icon="close" onClick={requestClose} />
      </header>
      <div className="ds-overlay__body">{props.children}</div>
    </dialog>
  )
}
