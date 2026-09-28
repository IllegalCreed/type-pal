// @vitest-environment jsdom
import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { frameEditor } from './__tests__/frame-editor-fixture.js'

describe('Frame editor viewport input contracts', () => {
  test('keyboard and toolbar zoom update actual canvas size; fit recenters the scroll region', async () => {
    const f = await frameEditor()
    await f.ready()
    f.geometry()
    await f.resize()
    expect(f.host.querySelector('output')?.textContent).toBe('400%')
    await f.key('0')
    expect(f.canvas().style.width).toBe('2px')
    expect(f.button('1:1').getAttribute('aria-pressed')).toBe('true')
    await f.key('+')
    expect(f.canvas().style.width).toBe('2.5px')
    await f.key('-')
    expect(f.canvas().style.width).toBe('2px')
    await f.click('放大')
    expect(f.canvas().style.width).toBe('2.5px')
    await f.click('缩小')
    expect(f.canvas().style.width).toBe('2px')
    await f.flushRaf()
    f.stage().scrollLeft = 25
    f.stage().scrollTop = 15
    await f.key('F')
    await f.flushRaf()
    expect(f.button('适合').getAttribute('aria-pressed')).toBe('true')
    expect([f.stage().scrollLeft, f.stage().scrollTop]).toEqual([0, 0])
    expect(f.canvas().style.width).toBe('')
    f.draftOnly()
  })

  test('wheel keeps the pointer-relative pixel anchored and clamps zoom at both ends', async () => {
    const f = await frameEditor()
    await f.ready()
    f.geometry()
    await f.resize()
    await act(async () =>
      f.stage().dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: -Math.log(2) / 0.0015,
          clientX: 124,
          clientY: 62,
        }),
      ),
    )
    await f.flushRaf()
    expect(f.canvas().style.width).toBe('16px')
    expect([f.stage().scrollLeft, f.stage().scrollTop]).toEqual([4, 2])
    expect(f.button('放大').disabled).toBe(true)
    await act(async () =>
      f.stage().dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100000 })),
    )
    expect(f.canvas().style.width).toBe('0.5px')
    expect(f.button('缩小').disabled).toBe(true)
    f.draftOnly()
  })

  test('only the captured left pointer pans manual zoom and cancellation releases ownership', async () => {
    const f = await frameEditor()
    await f.ready()
    await f.pointer('pointerdown', { pointerId: 1, button: 0, clientX: 50, clientY: 60 })
    expect(f.captures.get(f.stage())).toBeUndefined()
    await f.key('0')
    await f.pointer('pointerdown', { pointerId: 2, button: 2, clientX: 50, clientY: 60 })
    expect(f.captures.get(f.stage())).toBeUndefined()
    f.stage().scrollLeft = 20
    f.stage().scrollTop = 30
    await f.pointer('pointerdown', { pointerId: 7, button: 0, clientX: 50, clientY: 60 })
    expect(f.captures.get(f.stage())).toEqual(new Set([7]))
    expect(f.stage().classList.contains('panning')).toBe(true)
    await f.pointer('pointermove', { pointerId: 8, clientX: 70, clientY: 80 })
    expect([f.stage().scrollLeft, f.stage().scrollTop]).toEqual([20, 30])
    await f.pointer('pointermove', { pointerId: 7, clientX: 65, clientY: 55 })
    expect([f.stage().scrollLeft, f.stage().scrollTop]).toEqual([5, 35])
    await f.pointer('pointerup', { pointerId: 8 })
    expect(f.captures.get(f.stage())).toEqual(new Set([7]))
    await f.pointer('pointercancel', { pointerId: 7 })
    expect(f.captures.get(f.stage())).toEqual(new Set())
    expect(f.stage().classList.contains('panning')).toBe(false)
    await f.pointer('pointermove', { pointerId: 7, clientX: 80, clientY: 90 })
    expect([f.stage().scrollLeft, f.stage().scrollTop]).toEqual([5, 35])
    f.draftOnly()
  })
})
