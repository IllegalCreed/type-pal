import { act } from 'react'
import type { Root } from 'react-dom/client'

/** Release resource observers and remove the fixture node even when unmount fails. */
export async function unmountHost(mounted: {
  host: HTMLElement
  root: Root
  restoreResourceObservers?: () => void
}): Promise<void> {
  try {
    await act(async () => mounted.root.unmount())
  } finally {
    mounted.restoreResourceObservers?.()
    mounted.host.remove()
  }
}
