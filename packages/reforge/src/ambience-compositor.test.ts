import { describe, expect, test, vi } from 'vitest'
import { compositeAmbienceTint } from './ambience-compositor.js'

function contextSpy() {
  const calls: string[] = []
  return {
    calls,
    context: {
      save: vi.fn(() => calls.push('save')),
      restore: vi.fn(() => calls.push('restore')),
      fillRect: vi.fn((x, y, width, height) => calls.push(`fill:${x},${y},${width},${height}`)),
      set globalCompositeOperation(value: string) {
        calls.push(`op:${value}`)
      },
      set fillStyle(value: string | CanvasGradient | CanvasPattern) {
        calls.push(`style:${String(value)}`)
      },
    } as unknown as CanvasRenderingContext2D,
  }
}

describe('compositeAmbienceTint', () => {
  test.each([
    { label: '纯白', tint: [255, 255, 255] as const },
    { label: '近白蓝通道', tint: [255, 255, 254] as const },
    { label: '近白红通道', tint: [254, 255, 255] as const },
  ])('skips canonical identity tint: $label', ({ tint }) => {
    const spy = contextSpy()
    compositeAmbienceTint(spy.context, tint, 320, 200)
    expect(spy.calls).toEqual([])
  })

  test('uses the runtime multiply sequence over the complete frame', () => {
    const spy = contextSpy()
    compositeAmbienceTint(spy.context, [117, 229, 255], 320, 200)
    expect(spy.calls).toEqual([
      'save',
      'op:multiply',
      'style:rgb(117,229,255)',
      'fill:0,0,320,200',
      'restore',
    ])
  })
})
