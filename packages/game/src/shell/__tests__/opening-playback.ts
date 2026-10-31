/** Test-only ownership of opening players, their real Window listeners and fake timers. */
import { expect, vi } from 'vitest'

type Outcome = { ok: true } | { ok: false; error: unknown }
interface Playback {
  outcome?: Outcome
}
interface Listener {
  type: string
  callback: EventListenerOrEventListenerObject
  capture: boolean
}

export function createOpeningPlaybackOwner() {
  const players = new Map<Promise<void>, Playback>()
  const listeners: Listener[] = []
  const add = window.addEventListener.bind(window)
  const remove = window.removeEventListener.bind(window)
  const addSpy = vi
    .spyOn(window, 'addEventListener')
    .mockImplementation((type, callback, options) => {
      add(type, callback, options)
      if (!callback || (type !== 'keydown' && type !== 'tp-modal-action')) return
      const capture = typeof options === 'boolean' ? options : (options?.capture ?? false)
      if (
        !listeners.some(
          (item) => item.type === type && item.callback === callback && item.capture === capture,
        )
      ) {
        listeners.push({ type, callback, capture })
      }
    })
  const removeSpy = vi
    .spyOn(window, 'removeEventListener')
    .mockImplementation((type, callback, options) => {
      remove(type, callback, options)
      const capture = typeof options === 'boolean' ? options : (options?.capture ?? false)
      const index = listeners.findIndex(
        (item) => item.type === type && item.callback === callback && item.capture === capture,
      )
      if (index >= 0) listeners.splice(index, 1)
    })

  function track(promise: Promise<void>): Promise<void> {
    const player: Playback = {}
    players.set(promise, player)
    // Observe rejection immediately; the caller still receives and awaits the original Promise.
    void promise.then(
      () => {
        player.outcome = { ok: true }
      },
      (error: unknown) => {
        player.outcome = { ok: false, error }
      },
    )
    return promise
  }

  function rethrowFailure(player: Playback): void {
    if (player.outcome && !player.outcome.ok) throw player.outcome.error
  }

  async function finishSplash(promise: Promise<void>, code: string): Promise<void> {
    const player = players.get(promise)
    if (!player) throw new Error('Opening player is not owned by this test')
    await Promise.resolve()
    rethrowFailure(player)
    expect(player.outcome, 'Splash must remain active until the skip key').toBeUndefined()
    window.dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true }))
    // A broken skip must fail within a finite window, rather than draining an endless loop.
    await vi.advanceTimersByTimeAsync(2500)
    rethrowFailure(player)
    expect(player.outcome, 'Skip must finish the actual opening player').toBeDefined()
    await promise
  }

  async function close(): Promise<void> {
    let pending = -1
    let remaining: string[] = []
    let timers = -1
    let failedPlayer: Playback | undefined
    try {
      for (const code of ['Space', 'Escape', 'KeyQ']) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true }))
      }
      if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(2500)
      pending = [...players.values()].filter((player) => !player.outcome).length
      remaining = listeners.map((item) => `${item.type}:${item.capture}`)
      timers = vi.isFakeTimers() ? vi.getTimerCount() : 0
      failedPlayer = [...players.values()].find((player) => player.outcome && !player.outcome.ok)
    } finally {
      // Capture leaks before forced disposal, then release the host even when the oracle fails.
      for (const item of listeners) remove(item.type, item.callback, item.capture)
      listeners.length = 0
      players.clear()
      if (vi.isFakeTimers()) vi.clearAllTimers()
      addSpy.mockRestore()
      removeSpy.mockRestore()
    }
    if (failedPlayer) rethrowFailure(failedPlayer)
    expect(pending, 'Owned opening players must settle before teardown').toBe(0)
    expect(remaining, 'Opening players must remove their actual Window listeners').toEqual([])
    expect(timers, 'Opening players must release their timers').toBe(0)
  }

  return { track, finishSplash, close }
}
