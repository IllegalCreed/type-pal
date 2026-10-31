/** Test host owns the boot counter's fetch/clock/DOM fixture; no product rendering is mocked. */
import { vi } from 'vitest'
import { getLanguage, useFallbackLanguage } from '../../localization/language.js'
import { restoreBootFetch } from '../boot-loading.js'

export function createBootLoadingHost() {
  const previousLanguage = getLanguage()
  const previousHtmlLanguage = document.documentElement.lang
  vi.useFakeTimers()
  useFallbackLanguage('zh-CN')
  const transport = vi.fn<typeof fetch>(async () => new Response('{}'))
  vi.stubGlobal('fetch', transport)

  async function advanceRenderFrame(): Promise<void> {
    await vi.advanceTimersByTimeAsync(16)
  }

  async function close(): Promise<void> {
    try {
      restoreBootFetch()
      // Clear the module's pending-render flag before restoring the clock and removing nodes.
      await advanceRenderFrame()
    } finally {
      vi.clearAllTimers()
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
      vi.useRealTimers()
      document.body.replaceChildren()
      // The boot listener is already detached, so language restoration cannot enqueue its render.
      useFallbackLanguage(previousLanguage)
      document.documentElement.lang = previousHtmlLanguage
    }
  }

  return { transport, advanceRenderFrame, close }
}

/** Only the counter IDs are represented,not the complete index.html host. */
export function mountBootOverlay(): void {
  document.body.innerHTML = `
    <div id="boot-loading">
      <div id="boot-loading-bar"><div id="boot-loading-fill"></div></div>
      <div id="boot-loading-status">正在加载…</div>
    </div>`
}

export function mountProgressNodes(opts: { fill?: boolean; status?: boolean } = {}): void {
  const fill = opts.fill === false ? '' : '<div id="boot-loading-fill"></div>'
  const status = opts.status === false ? '' : '<div id="boot-loading-status">正在加载…</div>'
  document.body.innerHTML = `<div id="boot-loading">${fill}${status}</div>`
}
