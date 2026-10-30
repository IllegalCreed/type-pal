// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, test, vi } from 'vitest'
import { SpriteSourceFramePicker } from './SpriteFrameWorkbench.js'

test.each([
  'animation-frame',
  'timeout',
] as const)('source picker releases queued %s focus work when unmounted', async (scheduler) => {
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'],
  })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  if (scheduler === 'timeout') vi.stubGlobal('requestAnimationFrame', undefined)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <SpriteSourceFramePicker
          frames={[
            { canvas: undefined, width: 8, height: 8 },
            { canvas: undefined, width: 8, height: 8 },
          ]}
          selectedFrame={0}
          onSelect={() => undefined}
        />,
      ),
    )
    const button = host.querySelector<HTMLButtonElement>('[data-source-frame-index="1"]')
    if (!button) throw new Error('source frame picker was not mounted')
    await act(async () => button.click())
    expect(vi.getTimerCount()).toBe(1)
    await act(async () => root.render(null))
    // The live picker owns this queued work, even though a null DOM ref would
    // prevent its late callback from focusing a detached element.
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    try {
      await act(async () => root.unmount())
    } finally {
      host.remove()
      vi.unstubAllGlobals()
      vi.useRealTimers()
    }
  }
})
