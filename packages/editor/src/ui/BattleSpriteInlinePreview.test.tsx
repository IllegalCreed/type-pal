// @vitest-environment jsdom

import type { BattleSpriteDef } from '@type-pal/content'
import type { RleFrame } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { BattleSpriteInlinePreview } from './BattleSpriteInlinePreview.js'

const mocks = vi.hoisted(() => ({
  loadDefinition: vi.fn(),
  loadAsset: vi.fn(),
  loadPalette: vi.fn(),
  bakeFrame: vi.fn(),
}))

vi.mock('@type-pal/reforge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@type-pal/reforge')>()),
  BattleSpriteAssetCache: class {
    load = mocks.loadAsset
  },
  loadBattleSpriteDefinition: mocks.loadDefinition,
  loadStandardPalette: mocks.loadPalette,
  bakeFrame: mocks.bakeFrame,
}))

const definition: BattleSpriteDef = {
  id: 'player-fighter-0',
  label: '李逍遥',
  asset: 'battle-sprite.pal.player.000',
  profile: {
    kind: 'player-fighter',
    frames: {
      idle: 0,
      dying: 1,
      dead: 2,
      defend: 3,
      hurt: 4,
      preMagic: 5,
      magic: 6,
      attackWindup: 7,
      attackRush: 8,
      attackStrike: 9,
      steal: 10,
    },
    castEffectBase: 15,
    attackEffectBase: 0,
  },
}

function frame(width: number, height: number): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height),
    opaque: new Uint8Array(width * height),
  }
}

describe('BattleSpriteInlinePreview', () => {
  let host: HTMLDivElement
  let root: Root
  let contextSpy: ReturnType<typeof vi.spyOn>
  const drawImage = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    drawImage.mockReset()
    contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      drawImage,
      imageSmoothingEnabled: true,
    } as unknown as CanvasRenderingContext2D)
    const frames = Array.from({ length: 11 }, () => frame(57, 66))
    mocks.loadDefinition.mockReset().mockResolvedValue({ sprite: { frames } })
    mocks.loadAsset.mockReset().mockResolvedValue({ frames })
    mocks.loadPalette.mockReset().mockResolvedValue({ colors: [], cycles: [] })
    mocks.bakeFrame.mockReset().mockImplementation(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 57
      canvas.height = 66
      return canvas
    })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    contextSpy.mockRestore()
    host.remove()
    vi.useRealTimers()
  })

  test('资源库布局完整平铺帧，并保持主画布和缩略画布比例', async () => {
    await act(async () => {
      root.render(
        <BattleSpriteInlinePreview
          definition={definition}
          expected="player-fighter"
          assetBase={{} as never}
          assetReader={{ record: () => ({ sha256: 'a'.repeat(64) }) } as never}
          frameSequence={[7, 8, 9, 0]}
          sequenceKey="attack"
          showAllFrames
          layout="library"
          semanticGroups={[
            {
              id: definition.id,
              label: definition.label,
              typeLabel: '玩家战斗',
              active: true,
              rows: [
                {
                  id: 'attack',
                  label: '普通攻击',
                  frames: [7, 8, 9, 0],
                  playbackFrames: [7, 8, 9, 0],
                },
              ],
            },
          ]}
          onRawFrameDragStart={vi.fn()}
        />,
      )
    })

    expect(host.querySelector('.battle-sprite-resource-workbench')).not.toBeNull()

    const main = host.querySelector<HTMLCanvasElement>('canvas[aria-label="李逍遥 第 0 帧"]')
    expect(main).toMatchObject({ width: 220, height: 220 })

    const thumbnails = host.querySelectorAll<HTMLButtonElement>(
      '.sprite-resource-frame-grid button[aria-label^="选择源帧 "]',
    )
    expect(thumbnails).toHaveLength(11)
    expect(thumbnails[0]?.draggable).toBe(true)
    expect(host.querySelector('.semantic-frame-row')?.textContent).toContain('普通攻击')

    for (const call of drawImage.mock.calls) {
      const source = call[0] as HTMLCanvasElement
      const drawWidth = call[3] as number
      const drawHeight = call[4] as number
      expect(drawWidth / drawHeight).toBeCloseTo(source.width / source.height, 8)
    }
  })
})
