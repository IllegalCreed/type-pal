import { useEffect, useRef } from 'react'

interface DisposableTransport {
  dispose(): void
}

/** Each mounted player owns its transport. StrictMode can replay effects for the same instance. */
export function useOwnedAudioTransport(transport: DisposableTransport): void {
  const active = useRef<{ transport: DisposableTransport } | undefined>(undefined)
  useEffect(() => {
    const previous = active.current
    if (previous && previous.transport !== transport) previous.transport.dispose()

    const lease = { transport }
    active.current = lease
    return () => {
      // Replay reclaims the same transport before this microtask. Replacement disposes the old one above.
      queueMicrotask(() => {
        if (active.current !== lease) return
        active.current = undefined
        transport.dispose()
      })
    }
  }, [transport])
}
