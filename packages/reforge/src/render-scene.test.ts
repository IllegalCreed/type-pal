import { describe, expect, test, vi } from 'vitest'
import { renderSceneFrame } from './render-scene.js'

test('renderSceneFrame:clear → save → scale(worldScale) → renderScene(args) → restore,且关平滑', () => {
  const calls: string[] = []
  let smoothing: boolean | undefined
  const ctx = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    scale: (x: number, y: number) => calls.push(`scale:${x},${y}`),
    set imageSmoothingEnabled(v: boolean) {
      smoothing = v
    },
  } as unknown as CanvasRenderingContext2D
  const renderScene = vi.fn(() => calls.push('renderScene'))
  const renderer = {
    clear: () => calls.push('clear'),
    renderScene,
  } as unknown as Parameters<typeof renderSceneFrame>[1]
  const map = {} as never
  const room = { col: 0, row: 0, cols: 1, rows: 1 }
  const camera = { x: 0, y: 0 }
  const sprites: never[] = []
  renderSceneFrame(ctx, renderer, { map, room, camera, sprites, worldScale: 4 })
  expect(calls).toEqual(['clear', 'save', 'scale:4,4', 'renderScene', 'restore'])
  expect(renderScene).toHaveBeenCalledWith(map, room, camera, sprites)
  expect(smoothing).toBe(false)
})
