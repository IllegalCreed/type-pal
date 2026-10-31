/** Freezes Date.now in milliseconds; the caller owns restoration, including failed assertions. */
import { vi } from 'vitest'
export function freezeMenuClock(ms = 0): () => void {
  const spy = vi.spyOn(Date, 'now').mockReturnValue(ms)
  return () => spy.mockRestore()
}
