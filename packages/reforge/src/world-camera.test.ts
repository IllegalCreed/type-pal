import type { GridPos } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import type { SceneViewBounds } from './active-scene.js'
import { WorldCamera } from './world-camera.js'

function fixture() {
  let player: GridPos = { col: 20, row: 10, height: 0 }
  let bounds: SceneViewBounds = { minX: -1000, minY: -1000, maxX: 2000, maxY: 2000 }
  const camera = new WorldCamera(
    () => player,
    () => bounds,
  )
  camera.update()
  return {
    camera,
    player(next: GridPos) {
      player = next
    },
    bounds(next: SceneViewBounds) {
      bounds = next
    },
  }
}

describe('WorldCamera ownership', () => {
  test('reads replacement player and bounds live while keeping the public position identity', () => {
    const f = fixture(),
      position = f.camera.position
    expect(position).toEqual({ x: 0, y: 128 })
    f.player({ col: 40, row: 10, height: 9 })
    f.camera.update()
    expect(f.camera.position).toBe(position)
    expect(position).toEqual({ x: 320, y: 288 })
    f.bounds({ minX: -32, minY: -40, maxX: 128, maxY: 96 })
    f.camera.update()
    expect(position).toEqual({ x: -32, y: -40 })
  })

  test('clamps both edges without changing the retained relative offset', async () => {
    const f = fixture()
    f.bounds({ minX: 0, minY: 0, maxX: 640, maxY: 400 })
    const done = f.camera.pan(1000, -1000, 1, new AbortController().signal)
    f.camera.advance(16)
    await done
    expect(f.camera.position).toEqual({ x: 320, y: 0 })
    expect(f.camera.offset).toEqual({ x: 1000, y: -1000 })
    f.bounds({ minX: -2000, minY: -2000, maxX: 4000, maxY: 4000 })
    f.camera.update()
    expect(f.camera.position).toEqual({ x: 1000, y: -872 })
  })

  test('snap uses target-minus-player and preserves the offset during subsequent player motion', () => {
    const f = fixture()
    f.camera.snap({ col: 25, row: 12, height: 5 })
    expect(f.camera.offset).toEqual({ x: 48, y: 56 })
    expect(f.camera.position).toEqual({ x: 48, y: 184 })
    f.player({ col: 21, row: 10, height: 0 })
    f.camera.update()
    expect(f.camera.position).toEqual({ x: 64, y: 192 })
    f.camera.snap()
    expect(f.camera.offset).toEqual({ x: 0, y: 0 })
    expect(f.camera.position).toEqual({ x: 16, y: 136 })
  })

  test('pan advances on render steps, retaining the minimum step and rounded elapsed time', async () => {
    const f = fixture()
    let finished = false
    const done = f.camera.pan(3, -2, 4, new AbortController().signal).then(() => {
      finished = true
    })
    expect(f.camera.offset).toEqual({ x: 0, y: 0 })
    f.camera.advance(0)
    expect(f.camera.offset).toEqual({ x: 3, y: -2 })
    f.camera.advance(24)
    expect(f.camera.offset).toEqual({ x: 9, y: -6 })
    await Promise.resolve()
    expect(finished).toBe(false)
    f.camera.advance(1000)
    expect(f.camera.offset).toEqual({ x: 12, y: -8 })
    expect(f.camera.position).toEqual({ x: 12, y: 120 })
    await done
    expect(finished).toBe(true)
    f.camera.advance(1000)
    expect(f.camera.offset).toEqual({ x: 12, y: -8 })
  })

  test('replacement resolves the old waiter and starts from the current displacement', async () => {
    const f = fixture(),
      old = new AbortController(),
      next = new AbortController()
    const first = f.camera.pan(5, 2, 8, old.signal)
    f.camera.advance(16)
    let nextDone = false
    const second = f.camera.pan(-2, 3, 2, next.signal).then(() => {
      nextDone = true
    })
    await first
    old.abort()
    f.camera.advance(16)
    expect(f.camera.offset).toEqual({ x: 3, y: 5 })
    await Promise.resolve()
    expect(nextDone).toBe(false)
    f.camera.advance(16)
    await second
    expect(f.camera.offset).toEqual({ x: 1, y: 8 })
  })

  test('pre-aborted request rejects without settling or replacing the running pan', async () => {
    const f = fixture(),
      dead = new AbortController()
    let finished = false
    const first = f.camera.pan(4, 6, 2, new AbortController().signal).then(() => {
      finished = true
    })
    dead.abort()
    await expect(f.camera.pan(99, 99, 9, dead.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(finished).toBe(false)
    f.camera.advance(32)
    await first
    expect(f.camera.offset).toEqual({ x: 8, y: 12 })
  })

  test('mid-pan abort rejects once, detaches its listener and freezes the partial displacement', async () => {
    const f = fixture(),
      controller = new AbortController()
    const detach = vi.spyOn(controller.signal, 'removeEventListener')
    const outcome = f.camera.pan(4, 6, 8, controller.signal).catch((error: unknown) => error)
    f.camera.advance(32)
    controller.abort()
    expect(await outcome).toMatchObject({ name: 'AbortError' })
    expect(detach).toHaveBeenCalledTimes(1)
    expect(detach.mock.calls[0]?.[0]).toBe('abort')
    f.camera.advance(1000)
    expect(f.camera.offset).toEqual({ x: 8, y: 12 })
    expect(f.camera.position).toEqual({ x: 8, y: 140 })
  })

  test('reset resolves the waiter and clears offset but leaves pixel position until host update', async () => {
    const f = fixture(),
      controller = new AbortController()
    const detach = vi.spyOn(controller.signal, 'removeEventListener')
    const done = f.camera.pan(5, 4, 9, controller.signal)
    f.camera.advance(16)
    expect(f.camera.position).toEqual({ x: 5, y: 132 })
    f.camera.reset()
    expect(f.camera.offset).toEqual({ x: 0, y: 0 })
    expect(f.camera.position).toEqual({ x: 5, y: 132 })
    await done
    expect(detach).toHaveBeenCalledTimes(1)
    controller.abort()
    f.camera.advance(1000)
    expect(f.camera.position).toEqual({ x: 5, y: 132 })
    f.camera.update()
    expect(f.camera.position).toEqual({ x: 0, y: 128 })
  })

  test('snap during a pan does not silently cancel the original pan track', async () => {
    const f = fixture()
    const done = f.camera.pan(2, 3, 2, new AbortController().signal)
    f.camera.advance(16)
    f.camera.snap({ col: 30, row: 10, height: 0 })
    expect(f.camera.offset).toEqual({ x: 160, y: 80 })
    f.camera.advance(16)
    await done
    expect(f.camera.offset).toEqual({ x: 4, y: 6 })
  })

  test('zero-frame pan settles on advancement without adding a displacement', async () => {
    const f = fixture()
    f.camera.snap({ col: 21, row: 10, height: 0 })
    let finished = false
    const done = f.camera.pan(10, 20, 0, new AbortController().signal).then(() => {
      finished = true
    })
    await Promise.resolve()
    expect(finished).toBe(false)
    f.camera.advance(16)
    await done
    expect(f.camera.offset).toEqual({ x: 16, y: 8 })
  })

  test('an abort during listener registration cannot leave a pending motion behind', async () => {
    const f = fixture(),
      controller = new AbortController()
    const add = controller.signal.addEventListener.bind(controller.signal)
    vi.spyOn(controller.signal, 'addEventListener').mockImplementation((...args) => {
      controller.abort()
      add(...args)
    })
    await expect(f.camera.pan(3, 4, 5, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    f.camera.advance(1000)
    expect(f.camera.offset).toEqual({ x: 0, y: 0 })
  })
})
