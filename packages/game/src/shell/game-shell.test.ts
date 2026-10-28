import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { getLanguage, useFallbackLanguage } from '../localization/language.js'
import { createGameShell } from './game-shell.js'
import { KeyboardInputSource } from './input.js'
import { setInputRotated } from './input-rotation.js'
import { setTouchControlsVisible } from './touch-preference.js'

let previousLanguage = getLanguage()
let previousDocumentLanguage: string | null
beforeEach(() => {
  previousLanguage = getLanguage()
  previousDocumentLanguage = document.documentElement.getAttribute('lang')
})

afterEach(() => {
  delete document.documentElement.dataset.tpLayout
  document.body.replaceChildren()
  // A production shell lives for the page. After removing our temporary page, a real
  // language notification lets its subscriber observe disconnection and unsubscribe.
  useFallbackLanguage(getLanguage() === 'en' ? 'zh-CN' : 'en')
  useFallbackLanguage(previousLanguage)
  if (previousDocumentLanguage === null) document.documentElement.removeAttribute('lang')
  else document.documentElement.setAttribute('lang', previousDocumentLanguage)
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

it('connects real touch actions and gates them through visibility and the tools panel', () => {
  const events = new EventTarget()
  vi.stubGlobal(
    'matchMedia',
    () =>
      ({
        matches: true,
        addEventListener: events.addEventListener.bind(events),
      }) satisfies Pick<MediaQueryList, 'matches' | 'addEventListener'>,
  )
  vi.stubGlobal(
    'ResizeObserver',
    class implements ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )
  // Browser scheduling is a host boundary; the real touch adapter/input source remain connected.
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  const windowListeners = vi.spyOn(window, 'addEventListener')
  const documentListeners = vi.spyOn(document, 'addEventListener')
  setTouchControlsVisible(true)
  const canvas = document.createElement('canvas')
  document.body.append(canvas)
  const input = new KeyboardInputSource(window)
  try {
    const shell = createGameShell(canvas)
    shell.connect(input)
    const confirm = document.querySelector<HTMLButtonElement>('.tp-touch-confirm')
    const actions = document.querySelector<HTMLElement>('.tp-touch-actions')
    if (!confirm || !actions) throw new Error('Virtual controls missing')
    confirm.setPointerCapture = vi.fn()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
    input.nextSnapshot(1)
    confirm.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, button: 0 }),
    )
    setTouchControlsVisible(false)
    expect(actions.hidden).toBe(true)
    expect([...input.nextSnapshot(2).held]).toEqual(['Confirm'])
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' }))
    confirm.click()
    expect([...input.nextSnapshot(3).pressed]).toEqual([])
    expect([...input.nextSnapshot(4).held]).toEqual([])
    setTouchControlsVisible(true)
    expect(actions.hidden).toBe(false)
    confirm.click()
    expect([...input.nextSnapshot(5).pressed]).toEqual(['Confirm'])
    shell.setToolsOpen(true)
    confirm.click()
    expect([...input.nextSnapshot(6).pressed]).toEqual([])
    shell.setToolsOpen(false)
    confirm.click()
    expect([...input.nextSnapshot(7).pressed]).toEqual(['Confirm'])
  } finally {
    input.detach()
    for (const [type, listener, options] of windowListeners.mock.calls)
      window.removeEventListener(type, listener, options)
    for (const [type, listener, options] of documentListeners.mock.calls)
      document.removeEventListener(type, listener, options)
    localStorage.removeItem('tp-touch-controls')
  }
})

it('mounts the remembered rotated pad and updates its real touch routing on setting changes', () => {
  const events = new EventTarget()
  vi.stubGlobal(
    'matchMedia',
    () =>
      ({
        matches: true,
        addEventListener: events.addEventListener.bind(events),
      }) satisfies Pick<MediaQueryList, 'matches' | 'addEventListener'>,
  )
  vi.stubGlobal(
    'ResizeObserver',
    class implements ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  const windowListeners = vi.spyOn(window, 'addEventListener')
  const documentListeners = vi.spyOn(document, 'addEventListener')
  setInputRotated(true)
  const canvas = document.createElement('canvas')
  document.body.append(canvas)
  const input = new KeyboardInputSource(window)
  try {
    createGameShell(canvas).connect(input)
    const pad = document.querySelector<HTMLElement>('.tp-dpad')!
    pad.setPointerCapture = vi.fn()
    vi.spyOn(pad, 'getBoundingClientRect').mockReturnValue(new DOMRect(16, 400, 150, 150))
    expect(pad.dataset.rotated).toBe('true')
    expect(pad.style.getPropertyValue('--tp-input-rotation')).toBe('45deg')
    const point = (type: string): void => {
      pad.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 4,
          button: 0,
          clientX: 136,
          clientY: 435,
        }),
      )
    }
    point('pointerdown')
    expect([...input.nextSnapshot(1).held]).toEqual(['Up'])
    setInputRotated(false)
    expect(pad.dataset.rotated).toBe('false')
    expect(pad.style.getPropertyValue('--tp-input-rotation')).toBe('0deg')
    expect([...input.nextSnapshot(2).held]).toEqual([])
    point('pointermove')
    expect([...input.nextSnapshot(3).held]).toEqual([])
    point('pointerup')
    point('pointerdown')
    // The same upper-right coordinate follows the original dominant horizontal axis.
    expect([...input.nextSnapshot(4).held]).toEqual(['Right'])
    expect(
      [...document.querySelectorAll('.tp-touch-actions button')].map((b) => b.textContent),
    ).toEqual(['确认', '取消'])
  } finally {
    input.detach()
    for (const [type, listener, options] of windowListeners.mock.calls)
      window.removeEventListener(type, listener, options)
    for (const [type, listener, options] of documentListeners.mock.calls)
      document.removeEventListener(type, listener, options)
    localStorage.removeItem('tp-input-rotation')
  }
})
