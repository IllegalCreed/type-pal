import { describe, it, expect } from 'vitest'
import type { Tilemap } from '@type-pal/shared'
import { presentFrame, type PresentContext } from './present.js'
import { createFramebuffer } from './framebuffer.js'
import { createInitialGameState } from '../core/game-state.js'

function flatMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

describe('presentFrame', () => {
  it('无 dialogBox → 不画对话框,不抛错', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    const ctx: PresentContext = {
      tilemap: flatMap(3, 3),
      tileImages: { get: () => undefined },
      partySprite: { width: 1, height: 1, indices: new Uint8Array([0]), opaque: new Uint8Array([0]), anchorX: 0, anchorY: 0 },
      npcSprites: new Map(),
    }
    const ok = () => presentFrame(fb, gs, ctx)
    expect(ok).not.toThrow()
  })

  it('有 dialogBox → 帧缓冲被对话框覆盖', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    gs.dialogBox = { text: '你好', style: 'center' }
    const ctx: PresentContext = {
      tilemap: flatMap(3, 3),
      tileImages: { get: () => undefined },
      partySprite: { width: 1, height: 1, indices: new Uint8Array([0]), opaque: new Uint8Array([0]), anchorX: 0, anchorY: 0 },
      npcSprites: new Map(),
    }
    presentFrame(fb, gs, ctx)
    const someBorderPixel = Array.from(fb.indices).some((i) => i === 255)
    expect(someBorderPixel).toBe(true)
  })
})
