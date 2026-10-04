// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, test, vi } from 'vitest'
import { SemanticFrameShelf, type SpriteFrameView } from './SpriteFrameWorkbench.js'

test('动态预览在缺帧步骤绘制第0帧，并在单次动作终点停止排队', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let now = 0
  vi.spyOn(window.performance, 'now').mockImplementation(() => now)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const frames: SpriteFrameView[] = ['#f00', '#0f0'].map((color) => {
    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 8
    const context = canvas.getContext('2d')
    if (!context) throw new Error('真实 canvas 2D 上下文不可用')
    context.fillStyle = color
    context.fillRect(0, 0, 8, 8)
    return { canvas, width: 8, height: 8 }
  })
  try {
    await act(async () => {
      root.render(
        <SemanticFrameShelf
          frames={frames}
          groups={[
            {
              id: 'preview',
              label: '预览',
              typeLabel: '动态',
              rows: [
                {
                  id: 'action',
                  label: '动作',
                  frames: [1, 9],
                  playbackSteps: [
                    { frame: 1, holdMs: 20 },
                    { frame: 9, holdMs: 30 },
                  ],
                },
              ],
            },
          ]}
        />,
      )
    })
    const preview = host.querySelector<HTMLCanvasElement>('.animated canvas')
    if (!preview) throw new Error('动态预览画布未挂载')
    const context = preview.getContext('2d')
    if (!context) throw new Error('动态预览 2D 上下文不可用')
    expect([...context.getImageData(30, 50, 1, 1).data]).toEqual([0, 255, 0, 255])
    const draw = vi.spyOn(context, 'drawImage')
    expect(vi.getTimerCount()).toBe(1)

    now = 20
    await act(async () => vi.advanceTimersByTimeAsync(20))
    expect(draw).toHaveBeenCalledOnce()
    expect(draw.mock.calls[0]?.[0]).toBe(frames[0]?.canvas)
    expect([...context.getImageData(30, 50, 1, 1).data]).toEqual([255, 0, 0, 255])
    expect(vi.getTimerCount()).toBe(1)

    now = 50
    await act(async () => vi.advanceTimersByTimeAsync(30))
    expect(draw).toHaveBeenCalledTimes(2)
    expect(draw.mock.calls[1]?.[0]).toBe(frames[0]?.canvas)
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  }
})
