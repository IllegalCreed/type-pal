// @vitest-environment jsdom
import type { SpriteDef } from '@type-pal/content'
import type { LoadedWorldSprite, RleFrame } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { SpriteFrames } from './SpriteFrames.js'

const mocks = vi.hoisted(() => ({
  loadSprite: vi.fn(),
  loadPalette: vi.fn(),
  bakeFrame: vi.fn(),
}))

vi.mock('../core/sprite-assets.js', () => ({ loadEditorSprite: mocks.loadSprite }))
vi.mock('@type-pal/reforge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@type-pal/reforge')>()),
  loadStandardPalette: mocks.loadPalette,
  bakeFrame: mocks.bakeFrame,
}))

function frame(width = 20, height = 30): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height),
    opaque: new Uint8Array(width * height),
  }
}

function loadedSprite(frameCount: number): LoadedWorldSprite {
  const frames = Array.from({ length: frameCount }, () => frame())
  return {
    frames,
    anchorX: 10,
    anchorY: 30,
    profile: 'canonical',
    decode: { declaredSlots: frameCount, trailingSentinel: false, skippedLegacyTailSlots: 0 },
  }
}

const definition: SpriteDef = {
  id: 'sprite.hero',
  label: '主角行走精灵',
  asset: 'sprite.hero.asset',
  layout: { kind: 'directional', framesPerDir: 3 },
  poses: {
    wave: {
      label: '挥手',
      order: 1,
      steps: [
        { frame: 12, durationMs: 120 },
        { frame: 13, durationMs: 180 },
      ],
      loopFrom: 0,
    },
  },
}

describe('SpriteFrames embedded preview', () => {
  let host: HTMLDivElement
  let root: Root
  let contextSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      imageSmoothingEnabled: true,
    } as unknown as CanvasRenderingContext2D)
    mocks.loadSprite.mockReset().mockResolvedValue(loadedSprite(14))
    mocks.loadPalette.mockReset().mockResolvedValue({ colors: [], cycles: [] })
    mocks.bakeFrame.mockReset().mockImplementation((source: RleFrame) => {
      const canvas = document.createElement('canvas')
      canvas.width = source.width
      canvas.height = source.height
      return canvas
    })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    contextSpy.mockRestore()
    host.remove()
  })

  test('复用共享 embedded 动作架展示四向与命名动作，不渲染旧预览皮肤', async () => {
    await act(async () => {
      root.render(
        <SpriteFrames
          sprite={definition}
          assetBase={{} as never}
          assetReader={
            {
              record: () => ({ sha256: 'sprite-sha' }),
            } as never
          }
        />,
      )
    })

    const shelf = host.querySelector<HTMLElement>(
      '.semantic-frame-shelf--embedded[data-presentation="embedded"]',
    )!
    expect(shelf).not.toBeNull()
    expect(shelf.getAttribute('aria-label')).toBe('四向行走与动作帧预览')
    expect(shelf.querySelector(':scope > header')).toBeNull()
    expect(shelf.querySelector('.semantic-frame-group-head')).toBeNull()
    expect([...shelf.querySelectorAll('.semantic-frame-row-label b')].map((node) => node.textContent)).toEqual(
      ['下 · 行走', '左 · 行走', '上 · 行走', '右 · 行走', '挥手'],
    )
    expect(shelf.querySelectorAll('.semantic-frame-row')).toHaveLength(5)
    expect(shelf.textContent).toContain('#0 为站立帧')
    expect(shelf.textContent).toContain('#3 为站立帧')
    expect(shelf.textContent).toContain('#6 为站立帧')
    expect(shelf.textContent).toContain('#9 为站立帧')
    expect(shelf.textContent).toContain('循环动作 · 第 1 步开始循环')
    const rows = shelf.querySelectorAll('.semantic-frame-row')
    for (const row of [...rows].slice(0, 4)) {
      expect(row.querySelectorAll('.sprite-frame-cell')).toHaveLength(4)
      expect(row.querySelectorAll('.sprite-frame-cell.animated')).toHaveLength(1)
    }
    expect(rows[4]?.querySelectorAll('.sprite-frame-cell')).toHaveLength(3)
    expect(shelf.querySelectorAll('button,input,select,textarea')).toHaveLength(0)
    expect(host.querySelector('.sprite-frames > .toolbar')).toBeNull()
    expect(host.querySelector('.frames-preview')).toBeNull()
    expect(host.querySelector('.dirgroup')).toBeNull()
    expect(host.querySelector('.fcell')).toBeNull()
    expect(host.querySelector('.posegroup')).toBeNull()
  })
})
