// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, test, vi } from 'vitest'
import { openC05 } from '../__tests__/cursor-asset-r1/c05-action-fixtures.js'
import {
  colorCensus,
  opaqueBounds,
  requireRealCanvas2d,
} from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { installBrowserHardwarePorts } from '../__tests__/cursor-asset-r1/frame-editor-ports.js'
import { SpriteFrameCanvas } from './SpriteFrameWorkbench.js'

test('SpriteFrameCanvas 绘制真实 bakeFrame 的非透明像素与透明留白', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    installBrowserHardwarePorts()
    requireRealCanvas2d()
    const open = await openC05('frame-canvas-pixels')
    act(() => {
      root.render(
        <SpriteFrameCanvas
          source={open.frames[0]?.canvas}
          width={64}
          height={64}
          maxScale={4}
          label="帧0"
        />,
      )
    })
    const canvas = host.querySelector('canvas')
    if (!canvas) throw new Error('frame canvas not mounted')
    const census = colorCensus(canvas)
    // The fixture's solid 8px frame scales to 32px: centered at x16, with a 4px bottom gap.
    // Its [216,32,32] source quantizes to palette RGB [200,84,68].
    expect(opaqueBounds(canvas)).toEqual({ minX: 16, maxX: 47, minY: 28, maxY: 59, count: 1024 })
    expect([...census.opaque]).toEqual(['200,84,68,255'])
    expect(census.transparent).toBe(3072)
    expect(census.translucent).toBe(0)
  } finally {
    try {
      await act(async () => root.unmount())
    } finally {
      host.remove()
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    }
  }
})
