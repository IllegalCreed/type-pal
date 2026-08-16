import { type ReactNode, useEffect, useRef } from 'react'
import { DsIconButton } from './controls.js'

function useDialogState(
  ref: React.RefObject<HTMLDialogElement | null>,
  open: boolean,
  onClose: () => void,
) {
  const returnFocusRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement as HTMLElement | null
      dialog.showModal()
      requestAnimationFrame(() => {
        const target = dialog.querySelector<HTMLElement>('[autofocus], button, input, select, textarea')
        target?.focus()
      })
    } else if (!open && dialog.open) dialog.close()
  }, [open, ref])
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const close = () => {
      onClose()
      requestAnimationFrame(() => returnFocusRef.current?.focus())
    }
    dialog.addEventListener('close', close)
    return () => dialog.removeEventListener('close', close)
  }, [onClose, ref])
}

export function DsDialog(props: {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  closeLabel?: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = `${props.title.replace(/\s+/g, '-')}-dialog-title`
  useDialogState(ref, props.open, props.onClose)
  return (
    <dialog
      ref={ref}
      className="ds-dialog"
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
        <DsIconButton label={props.closeLabel ?? '关闭'} icon="close" onClick={props.onClose} />
      </header>
      <div className="ds-overlay__body">
        {props.description ? <p className="ds-field__help">{props.description}</p> : null}
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
  const titleId = `${props.title.replace(/\s+/g, '-')}-drawer-title`
  useDialogState(ref, props.open, props.onClose)
  return (
    <dialog
      ref={ref}
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
        <DsIconButton label="关闭" icon="close" onClick={props.onClose} />
      </header>
      <div className="ds-overlay__body">{props.children}</div>
    </dialog>
  )
}
