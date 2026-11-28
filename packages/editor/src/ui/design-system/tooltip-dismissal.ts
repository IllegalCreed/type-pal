import { useEffect } from 'react'

/** A visible tooltip consumes Escape before the browser can dismiss its enclosing dialog. */
export function useTooltipDismissal(open: boolean, dismiss: (dismissed: true) => void): void {
  useEffect(() => {
    if (!open) return
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      dismiss(true)
    }
    document.addEventListener('keydown', dismissOnEscape)
    return () => document.removeEventListener('keydown', dismissOnEscape)
  }, [open, dismiss])
}
