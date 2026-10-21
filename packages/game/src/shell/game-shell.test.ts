import { afterEach, expect, it, vi } from 'vitest'
import { createGameShell } from './game-shell.js'

afterEach(() => {
  delete document.documentElement.dataset.tpLayout
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('fits the complete framebuffer through mobile resize and restores the chosen desktop scale', () => {
  const mediaEvents = new EventTarget()
  let mobile = false
  const media: Pick<MediaQueryList, 'matches' | 'addEventListener'> = {
    get matches() {
      return mobile
    },
    addEventListener: mediaEvents.addEventListener.bind(mediaEvents),
  }
  vi.stubGlobal('matchMedia', () => media)
  let resize = () => {}
  vi.stubGlobal(
    'ResizeObserver',
    class implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = () => callback([], this)
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )
  let width = 375
  let height = 667
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(0, 0, width, height),
  )
  const registrations = vi.spyOn(window, 'addEventListener')
  const canvas = document.createElement('canvas')
  canvas.id = 'screen'
  document.body.append(canvas)
  try {
    const shell = createGameShell(canvas)
    expect([canvas.style.width, canvas.style.height]).toEqual(['960px', '600px'])
    shell.setScale(125)
    mobile = true
    mediaEvents.dispatchEvent(new Event('change'))
    expect(document.documentElement.dataset.tpLayout).toBe('mobile')
    expect([canvas.style.width, canvas.style.height, canvas.style.position]).toEqual([
      '375px',
      '234.375px',
      'static',
    ])
    width = 844
    height = 390
    resize()
    expect([canvas.style.width, canvas.style.height]).toEqual(['624px', '390px'])
    mobile = false
    mediaEvents.dispatchEvent(new Event('change'))
    expect(document.documentElement.dataset.tpLayout).toBe('desktop')
    expect([canvas.style.width, canvas.style.height, canvas.style.position]).toEqual([
      '1200px',
      '750px',
      'fixed',
    ])
  } finally {
    // The shell is page-scoped in production; this host owns its temporary page listeners.
    for (const [type, listener, options] of registrations.mock.calls) {
      window.removeEventListener(type, listener, options)
    }
  }
})
