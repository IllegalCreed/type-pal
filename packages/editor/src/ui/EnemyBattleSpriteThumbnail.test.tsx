// @vitest-environment jsdom

import type { BattleSpriteDef } from '@type-pal/content'
import type { AssetBase, RleFrame } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  EnemyBattleSpriteThumbnail,
  EnemyBattleSpriteThumbnailCache,
} from './EnemyBattleSpriteThumbnail.js'

const mocks = vi.hoisted(() => ({
  bakeFrame: vi.fn(),
  clear: vi.fn(),
  loadDefinition: vi.fn(),
  loadPalette: vi.fn(),
  prune: vi.fn(),
}))

vi.mock('@type-pal/reforge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@type-pal/reforge')>()),
  BattleSpriteAssetCache: class {
    clear = mocks.clear
    prune = mocks.prune
  },
  bakeFrame: mocks.bakeFrame,
  loadBattleSpriteDefinition: mocks.loadDefinition,
  loadStandardPalette: mocks.loadPalette,
}))

function frame(id: number): RleFrame {
  return {
    width: 12 + id,
    height: 18 + id,
    pixels: new Uint8Array((12 + id) * (18 + id)),
    opaque: new Uint8Array((12 + id) * (18 + id)),
  }
}

function definition(id = 'battle.enemy.a', start = 2): BattleSpriteDef {
  return {
    id,
    label: id,
    asset: `${id}.asset`,
    profile: {
      kind: 'enemy',
      idle: { start, count: 1 },
      magic: { start: start + 1, count: 0 },
      attack: { start: start + 1, count: 0 },
      idleTicksPerFrame: 1,
      actTicksPerFrame: 0,
    },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, reject, resolve }
}

class TestIntersectionObserver {
  static instances: TestIntersectionObserver[] = []

  readonly root = null
  readonly rootMargin = '120px'
  readonly thresholds = [0]
  private target?: Element

  constructor(
    private readonly callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {
    TestIntersectionObserver.instances.push(this)
  }

  disconnect = vi.fn()
  observe = vi.fn((target: Element) => {
    this.target = target
  })
  takeRecords = vi.fn(() => [])
  unobserve = vi.fn()

  intersect(): void {
    if (!this.target) throw new Error('observer target was not registered')
    this.callback(
      [
        {
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 1,
          intersectionRect: {} as DOMRectReadOnly,
          isIntersecting: true,
          rootBounds: null,
          target: this.target,
          time: 0,
        },
      ],
      this as unknown as IntersectionObserver,
    )
  }
}

const base = {} as AssetBase
const reader = { projectId: 'test-project' } as EditorAssetReader
const palette = { colors: [], cycles: [] }

describe('EnemyBattleSpriteThumbnail', () => {
  let host: HTMLDivElement
  let root: Root
  let contextSpy: ReturnType<typeof vi.spyOn>
  const clearRect = vi.fn()
  const drawImage = vi.fn()
  const context = {
    clearRect,
    drawImage,
    imageSmoothingEnabled: true,
  } as unknown as CanvasRenderingContext2D

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    TestIntersectionObserver.instances = []
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver)
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    clearRect.mockReset()
    drawImage.mockReset()
    context.imageSmoothingEnabled = true
    contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
    mocks.bakeFrame.mockReset().mockImplementation(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 12
      canvas.height = 18
      return canvas
    })
    mocks.clear.mockReset()
    mocks.loadDefinition.mockReset().mockResolvedValue({
      sprite: { frames: [frame(0), frame(1), frame(2), frame(3)] },
    })
    mocks.loadPalette.mockReset().mockResolvedValue(palette)
    mocks.prune.mockReset()
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    contextSpy.mockRestore()
    host.remove()
    vi.unstubAllGlobals()
  })

  test('only loads a visible row and bakes the declared idle.start frame', async () => {
    const cache = new EnemyBattleSpriteThumbnailCache()
    await act(async () => {
      root.render(
        <EnemyBattleSpriteThumbnail
          definition={definition()}
          assetBase={base}
          assetReader={reader}
          revision="revision-a"
          cache={cache}
        />,
      )
    })

    const canvas = host.querySelector<HTMLCanvasElement>('.enemy-battle-sprite-thumbnail')!
    expect(canvas).toMatchObject({ width: 36, height: 36 })
    expect(canvas.dataset.placement).toBe('catalog')
    expect(canvas.getAttribute('aria-hidden')).toBe('true')
    expect(mocks.loadDefinition).not.toHaveBeenCalled()
    expect(mocks.loadPalette).not.toHaveBeenCalled()

    await act(async () => {
      TestIntersectionObserver.instances[0]!.intersect()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(TestIntersectionObserver.instances[0]!.disconnect).toHaveBeenCalledOnce()
    expect(mocks.loadDefinition).toHaveBeenCalledWith(
      expect.anything(),
      reader,
      definition(),
      'enemy',
    )
    expect(mocks.prune).toHaveBeenCalledWith(new Set(['battle.enemy.a.asset']))
    expect(mocks.bakeFrame).toHaveBeenCalledOnce()
    expect(mocks.bakeFrame).toHaveBeenCalledWith(
      expect.objectContaining({ width: 14, height: 20 }),
      palette,
    )
    expect(drawImage).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), 6, 0, 24, 36)
    expect(context.imageSmoothingEnabled).toBe(false)
  })

  test('uses the same derived cache for catalog and hero placements', async () => {
    const cache = new EnemyBattleSpriteThumbnailCache()
    await act(async () => {
      root.render(
        <>
          <EnemyBattleSpriteThumbnail
            definition={definition()}
            assetBase={base}
            assetReader={reader}
            revision="revision-a"
            cache={cache}
          />
          <EnemyBattleSpriteThumbnail
            definition={definition()}
            assetBase={base}
            assetReader={reader}
            revision="revision-a"
            cache={cache}
            placement="hero"
          />
        </>,
      )
    })

    const [catalog, hero] = [
      ...host.querySelectorAll<HTMLCanvasElement>('.enemy-battle-sprite-thumbnail'),
    ]
    expect(catalog).toMatchObject({ width: 36, height: 36 })
    expect(hero).toMatchObject({ width: 56, height: 56 })
    expect(hero?.dataset.placement).toBe('hero')

    await act(async () => {
      for (const observer of TestIntersectionObserver.instances) observer.intersect()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mocks.loadDefinition).toHaveBeenCalledOnce()
    expect(mocks.loadPalette).toHaveBeenCalledOnce()
    expect(mocks.bakeFrame).toHaveBeenCalledOnce()
    expect(drawImage).toHaveBeenCalledTimes(2)
  })

  test('shares a bounded derived cache, keys revisions, and releases project resources', async () => {
    const cache = new EnemyBattleSpriteThumbnailCache(2)
    const a = definition('battle.enemy.a')
    const b = definition('battle.enemy.b')
    const c = definition('battle.enemy.c')

    const first = cache.load(base, reader, a, 'revision-a')
    const duplicate = cache.load(base, reader, a, 'revision-a')
    expect(duplicate).toBe(first)
    await Promise.all([first, duplicate])
    expect(mocks.loadDefinition).toHaveBeenCalledTimes(1)
    expect(mocks.bakeFrame).toHaveBeenCalledTimes(1)

    await cache.load(base, reader, a, 'revision-b')
    expect(mocks.loadDefinition).toHaveBeenCalledTimes(2)
    expect(mocks.loadPalette).toHaveBeenCalledTimes(1)

    await cache.load(base, reader, b, 'revision-a')
    await cache.load(base, reader, c, 'revision-a')
    await cache.load(base, reader, a, 'revision-a')
    expect(mocks.loadDefinition).toHaveBeenCalledTimes(5)

    cache.clear()
    await cache.load(base, reader, a, 'revision-a')
    expect(mocks.clear).toHaveBeenCalledOnce()
    expect(mocks.loadDefinition).toHaveBeenCalledTimes(6)
    expect(mocks.loadPalette).toHaveBeenCalledTimes(2)
  })

  test('evicts a failed derived entry so the same revision can retry', async () => {
    const cache = new EnemyBattleSpriteThumbnailCache()
    mocks.loadDefinition
      .mockRejectedValueOnce(new Error('temporary read failure'))
      .mockResolvedValueOnce({ sprite: { frames: [frame(0), frame(1), frame(2)] } })

    await expect(cache.load(base, reader, definition(), 'revision-a')).resolves.toBeNull()
    await expect(cache.load(base, reader, definition(), 'revision-a')).resolves.not.toBeNull()
    expect(mocks.loadDefinition).toHaveBeenCalledTimes(2)
    expect(mocks.bakeFrame).toHaveBeenCalledOnce()
  })

  test('never paints a late frame from the previously bound enemy', async () => {
    const pendingA = deferred<{ sprite: { frames: RleFrame[] } }>()
    const pendingB = deferred<{ sprite: { frames: RleFrame[] } }>()
    const a = definition('battle.enemy.a', 1)
    const b = definition('battle.enemy.b', 2)
    const frameA = frame(10)
    const frameB = frame(20)
    mocks.loadDefinition.mockImplementation((_cache, _reader, value: BattleSpriteDef) =>
      value.id === a.id ? pendingA.promise : pendingB.promise,
    )
    mocks.bakeFrame.mockImplementation((value: RleFrame) => {
      const canvas = document.createElement('canvas')
      canvas.width = 12
      canvas.height = 18
      canvas.dataset.frame = value === frameA ? 'a' : 'b'
      return canvas
    })
    const cache = new EnemyBattleSpriteThumbnailCache()

    await act(async () => {
      root.render(
        <EnemyBattleSpriteThumbnail
          definition={a}
          assetBase={base}
          assetReader={reader}
          revision="revision-a"
          cache={cache}
        />,
      )
    })
    await act(async () => TestIntersectionObserver.instances[0]!.intersect())
    await act(async () => {
      root.render(
        <EnemyBattleSpriteThumbnail
          definition={b}
          assetBase={base}
          assetReader={reader}
          revision="revision-b"
          cache={cache}
        />,
      )
    })

    await act(async () => {
      pendingB.resolve({ sprite: { frames: [frame(0), frame(1), frameB] } })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect((drawImage.mock.calls[0]?.[0] as HTMLCanvasElement).dataset.frame).toBe('b')

    await act(async () => {
      pendingA.resolve({ sprite: { frames: [frame(0), frameA] } })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(drawImage).toHaveBeenCalledOnce()
  })
})
