// @vitest-environment jsdom

import type { AssetId } from '@type-pal/content'
import type { LoadedWorldSprite, RleFrame } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { SpriteResourceViewer } from './SpriteResourceViewer.js'

const mocks = vi.hoisted(() => ({
  loadSprite: vi.fn(),
  loadPalette: vi.fn(),
  bakeFrame: vi.fn(),
}))

vi.mock('../core/sprite-assets.js', () => ({
  loadEditorSprite: mocks.loadSprite,
}))

vi.mock('@type-pal/reforge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@type-pal/reforge')>()),
  loadStandardPalette: mocks.loadPalette,
  bakeFrame: mocks.bakeFrame,
}))

function frame(width: number, height: number): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height),
    opaque: new Uint8Array(width * height),
  }
}

function sprite(frames: RleFrame[]): LoadedWorldSprite {
  return {
    frames,
    anchorX: Math.floor((frames[0]?.width ?? 0) / 2),
    anchorY: frames[0]?.height ?? 0,
    profile: 'canonical',
    decode: { declaredSlots: frames.length, trailingSentinel: false, skippedLegacyTailSlots: 0 },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

describe('SpriteResourceViewer', () => {
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
    mocks.loadSprite.mockReset()
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

  test('一次解码后显示真实帧数、全部帧及可切换的大图', async () => {
    mocks.loadSprite.mockResolvedValue(sprite([frame(22, 50), frame(24, 48), frame(20, 46)]))
    const onLoaded = vi.fn()

    await act(async () => {
      root.render(
        <SpriteResourceViewer
          assetBase={{} as never}
          assetReader={{} as never}
          asset={'sprite.test' as AssetId}
          revision="sha-a"
          label="测试精灵"
          consumers={[
            { id: 'a', label: '用途 A', asset: 'sprite.test', layout: { kind: 'static' } },
            { id: 'b', label: '用途 B', asset: 'sprite.test', layout: { kind: 'static' } },
          ]}
          session={{} as never}
          onLoaded={onLoaded}
        />,
      )
    })

    expect(host.querySelector('.sprite-resource-frame-count')?.textContent).toContain('3 帧')
    expect(
      host.querySelectorAll<HTMLButtonElement>(
        '.sprite-resource-frame-grid [aria-label^="选择源帧 "]',
      ),
    ).toHaveLength(3)
    expect(host.textContent).toContain('22 × 50 px')
    expect(host.textContent).toContain('由 2 个用途共享')
    expect(host.textContent).toContain('＋ 追加帧…')
    expect(host.textContent).toContain('替换当前帧…')
    expect(host.textContent).toContain('删除当前帧')
    const raw = host.querySelector('.sprite-raw-inspector')!
    const semantics = host.querySelector('.semantic-frame-shelf')!
    expect(raw.compareDocumentPosition(semantics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(onLoaded).toHaveBeenCalledWith({
      asset: 'sprite.test',
      revision: 'sha-a',
      actualFrameCount: 3,
    })

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="下一帧"]')?.click()
    })
    expect(host.querySelector('canvas[aria-label="测试精灵 第 1 帧"]')).not.toBeNull()
    expect(host.textContent).toContain('24 × 48 px')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label^="选择源帧 2，"]')?.click()
    })
    expect(host.querySelector('canvas[aria-label="测试精灵 第 2 帧"]')).not.toBeNull()
    expect(host.textContent).toContain('20 × 46 px')
    expect(mocks.loadSprite).toHaveBeenCalledTimes(1)
    expect(mocks.loadPalette).toHaveBeenCalledTimes(1)
  })

  test('快速切换资源时不会显示较晚返回的旧资源', async () => {
    const oldLoad = deferred<LoadedWorldSprite>()
    const nextLoad = deferred<LoadedWorldSprite>()
    mocks.loadSprite.mockImplementation((_reader: unknown, asset: AssetId) =>
      asset === 'sprite.old' ? oldLoad.promise : nextLoad.promise,
    )

    await act(async () => {
      root.render(
        <SpriteResourceViewer
          assetBase={{} as never}
          assetReader={{} as never}
          asset={'sprite.old' as AssetId}
          revision="old-sha"
          label="旧资源"
          consumers={[]}
          session={{} as never}
        />,
      )
    })
    await act(async () => {
      root.render(
        <SpriteResourceViewer
          assetBase={{} as never}
          assetReader={{} as never}
          asset={'sprite.next' as AssetId}
          revision="next-sha"
          label="新资源"
          consumers={[]}
          session={{} as never}
        />,
      )
    })
    await act(async () => oldLoad.resolve(sprite([frame(9, 9), frame(8, 8)])))
    expect(host.textContent).toContain('正在解析帧资源 sprite.next')
    expect(host.textContent).not.toContain('2 帧')

    await act(async () => nextLoad.resolve(sprite([frame(30, 40)])))
    expect(host.textContent).toContain('新资源')
    expect(host.textContent).toContain('1 帧')
    expect(host.textContent).not.toContain('旧资源')
  })

  test('多帧源容器的默认布局只解释 #0，其它帧可组成独立循环动作', async () => {
    mocks.loadSprite.mockResolvedValue(
      sprite([frame(14, 21), frame(14, 21), frame(14, 21), frame(14, 21)]),
    )

    await act(async () => {
      root.render(
        <SpriteResourceViewer
          assetBase={{} as never}
          assetReader={{} as never}
          asset={'sprite.pal.008' as AssetId}
          revision="sha-candle"
          label="蜡烛源帧"
          consumers={[
            {
              id: 'sprite-8',
              label: '原精灵 8',
              asset: 'sprite.pal.008',
              layout: { kind: 'static' },
              poses: {
                flame: {
                  label: '火焰',
                  steps: [
                    { frame: 1, durationMs: 200 },
                    { frame: 2, durationMs: 200 },
                    { frame: 3, durationMs: 200 },
                  ],
                  loopFrom: 0,
                },
              },
            },
          ]}
          session={{} as never}
        />,
      )
    })

    expect(host.querySelector('.sprite-resource-frame-count')?.textContent).toContain('4 帧')
    expect(host.querySelector('.semantic-frame-shelf')?.textContent).toContain('默认显示')
    expect(host.querySelector('.semantic-frame-shelf')?.textContent).toContain('默认使用 #0')
    expect(host.querySelector('.semantic-frame-shelf')?.textContent).toContain('火焰')
    const semanticShelf = host.querySelector('.semantic-frame-shelf')!
    expect(semanticShelf.querySelectorAll('.semantic-frame-row')).toHaveLength(2)
    expect(
      semanticShelf.querySelectorAll('.semantic-frame-row .sprite-frame-cell.animated'),
    ).toHaveLength(1)
    const semanticFrames = [
      ...host.querySelectorAll<HTMLButtonElement>('.semantic-frame-row button.sprite-frame-cell'),
    ]
    expect(semanticFrames.map((cell) => cell.getAttribute('aria-label'))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('源帧 0'),
        expect.stringContaining('源帧 1'),
        expect.stringContaining('源帧 2'),
        expect.stringContaining('源帧 3'),
      ]),
    )
    expect(host.querySelector('.semantic-frame-group-head')?.textContent).toContain('默认定格')
    expect(host.querySelector('.semantic-frame-group-head')?.textContent).not.toContain('静物')
    expect(host.querySelector('.instance-behavior-shelf')).toBeNull()
  })
})
