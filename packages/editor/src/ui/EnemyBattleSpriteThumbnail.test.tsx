// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { expectedBattleRgb } from '../__tests__/battle-sprite-pixel-oracle.js'
import {
  type BattleSpriteProject,
  buildExternalReplace,
  enemyProfile,
  loadBattleSpriteProject,
} from '../__tests__/battle-sprite-project.js'
import { installBrowserHardwarePorts } from '../__tests__/bitmap-test-port.js'
import { isBlank, opaqueBounds, pixelAt } from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { gatedFileSource } from '../__tests__/gated-file-source.js'
import { unmountHost } from '../__tests__/react-host-cleanup.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import {
  EnemyBattleSpriteThumbnail,
  EnemyBattleSpriteThumbnailCache,
} from './EnemyBattleSpriteThumbnail.js'

const assets = ['battle-sprite.authored.a', 'battle-sprite.authored.b', 'battle-sprite.authored.c']

/** Layout is the only stubbed thumbnail input. Bytes, decode and Canvas2D stay real. */
class ThumbnailVisibility implements IntersectionObserver {
  static instances: ThumbnailVisibility[] = []

  readonly root = null
  readonly rootMargin: string
  readonly scrollMargin = '0px'
  readonly thresholds = [0]
  private target?: Element

  constructor(
    private readonly notify: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.rootMargin = options?.rootMargin ?? '0px'
    ThumbnailVisibility.instances.push(this)
  }

  observe(target: Element): void {
    this.target = target
  }

  unobserve(target: Element): void {
    if (this.target === target) this.disconnect()
  }

  disconnect(): void {
    this.target = undefined
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  reveal(): void {
    const target = this.target
    if (!target) throw new Error('The thumbnail has no observed canvas')
    const bounds = target.getBoundingClientRect()
    this.notify(
      [
        {
          boundingClientRect: bounds,
          intersectionRatio: 1,
          intersectionRect: bounds,
          isIntersecting: true,
          rootBounds: null,
          target,
          time: 0,
        },
      ],
      this,
    )
  }

  get observing(): boolean {
    return this.target !== undefined
  }
}

let project: BattleSpriteProject
let host: HTMLDivElement
let root: Root
let restoreAct: () => void

beforeEach(async () => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  ThumbnailVisibility.instances = []
  vi.stubGlobal('IntersectionObserver', ThumbnailVisibility)
  project = await loadBattleSpriteProject(
    'enemy-thumbnails',
    assets.map((asset, index) => ({
      asset,
      label: asset,
      frameCount: 3,
      colorPicks: [index, 3, 4],
      definitions: [
        { id: `enemy-${index}`, label: `Enemy ${index}`, profile: enemyProfile(1, 1, 1) },
      ],
    })),
  )
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    if (root) await unmountHost({ host, root })
  } finally {
    restoreAct()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})

function sprite(index: number) {
  const asset = assets[index]!
  const definition = project.state.battleSprites.find((candidate) => candidate.asset === asset)!
  const { path, sha256: revision, encoded } = project.seeded.get(asset)!
  return { asset, definition, path, revision, encoded }
}

test('缩略图等到可见才读，目录和标题都绘出待机首帧', async () => {
  const gate = gatedFileSource(project.source)
  const reader = createEditorAssetReader(gate.source, () => project.state)
  const cache = new EnemyBattleSpriteThumbnailCache()
  const { asset, definition, path, revision } = sprite(0)
  const props = { definition, assetBase: project.assetBase, assetReader: reader, revision, cache }
  await act(async () => {
    root.render(
      <>
        <EnemyBattleSpriteThumbnail {...props} />
        <EnemyBattleSpriteThumbnail {...props} placement="hero" />
      </>,
    )
  })
  const [catalog, hero] = [...host.querySelectorAll('canvas')]
  expect(catalog).toMatchObject({ width: 36, height: 36 })
  expect(hero).toMatchObject({ width: 56, height: 56 })
  expect(catalog!.getAttribute('aria-hidden')).toBe('true')
  expect(hero!.dataset.placement).toBe('hero')
  expect(gate.calls).toEqual([])
  expect(isBlank(catalog!)).toBe(true)

  await act(async () => {
    for (const visibility of ThumbnailVisibility.instances) visibility.reveal()
    await cache.load(project.assetBase, reader, definition, revision)
  })
  expect(ThumbnailVisibility.instances.map((visibility) => visibility.observing)).toEqual([
    false,
    false,
  ])
  expect(gate.completed).toEqual([path])
  expect(opaqueBounds(catalog!)).toEqual({ minX: 10, maxX: 25, minY: 20, maxY: 35, count: 256 })
  expect(opaqueBounds(hero!)).toEqual({ minX: 20, maxX: 35, minY: 40, maxY: 55, count: 256 })
  expect(pixelAt(catalog!, 12, 30)).toEqual([...expectedBattleRgb(project, asset, 0), 255])
  expect(pixelAt(hero!, 24, 47)).toEqual([...expectedBattleRgb(project, asset, 0), 255])
})

test('缓存分辨帧源版本、记住最近使用项，并随工程释放', async () => {
  const session = new EditSession(project.state)
  const reader = createEditorAssetReader(project.source, () => session.getState())
  const cache = new EnemyBattleSpriteThumbnailCache(2)
  const load = ({ definition, revision }: ReturnType<typeof sprite>) =>
    cache.load(project.assetBase, reader, definition, revision)
  const [a, b, c] = [sprite(0), sprite(1), sprite(2)]
  const first = load(a)
  expect(load(a)).toBe(first)
  const oldCanvas = await first
  expect(oldCanvas).not.toBeNull()
  const oldB = load(b)
  await oldB
  expect(load(a)).toBe(first)
  await load(c)
  const reloadedB = load(b)
  expect(reloadedB).not.toBe(oldB)
  expect(await reloadedB).not.toBeNull()

  const { command, encoded } = await buildExternalReplace(
    session,
    reader,
    project.palette,
    a.asset,
    3,
    9,
  )
  session.dispatch(command)
  const updated = load({ ...a, revision: encoded.sha256 })
  expect(updated).not.toBe(first)
  const newCanvas = await updated
  expect(pixelAt(oldCanvas!, 0, 0)).toEqual([200, 84, 68, 255])
  expect(pixelAt(newCanvas!, 0, 0)).toEqual([70, 118, 52, 255])
  cache.clear()
  const afterClear = load({ ...a, revision: encoded.sha256 })
  expect(afterClear).not.toBe(updated)
  expect(await afterClear).not.toBeNull()
})

test('帧源读取失败后，同一登记版本可重试并绘出合法字节', async () => {
  const a = sprite(0)
  const reader = createEditorAssetReader(project.source, () => project.state)
  const cache = new EnemyBattleSpriteThumbnailCache()
  project.disk.set(a.path, new ArrayBuffer(1))
  const failed = cache.load(project.assetBase, reader, a.definition, a.revision)
  await expect(failed).resolves.toBeNull()
  project.disk.set(a.path, a.encoded.bytes.slice(0))
  const recovered = await cache.load(project.assetBase, reader, a.definition, a.revision)
  expect(pixelAt(recovered!, 0, 0)).toEqual([...expectedBattleRgb(project, a.asset, 0), 255])
})

test('切换敌人后，迟到的旧源帧仍然属于原敌人', async () => {
  const gate = gatedFileSource(project.source)
  const reader = createEditorAssetReader(gate.source, () => project.state)
  const cache = new EnemyBattleSpriteThumbnailCache()
  const a = sprite(0)
  const b = sprite(1)
  const hold = gate.gate(a.path)
  const show = async ({ definition, revision }: typeof a) => {
    await act(async () =>
      root.render(
        <EnemyBattleSpriteThumbnail
          definition={definition}
          revision={revision}
          assetBase={project.assetBase}
          cache={cache}
          assetReader={reader}
        />,
      ),
    )
  }
  try {
    await show(a)
    await act(async () => ThumbnailVisibility.instances[0]!.reveal())
    expect(gate.calls).toEqual([a.path])
    expect(gate.completed).toEqual([])
    const aPending = cache.load(project.assetBase, reader, a.definition, a.revision)

    await show(b)
    const canvas = host.querySelector('canvas')!
    const bPixel = [...expectedBattleRgb(project, b.asset, 0), 255]
    await waitForReact(() => expect(pixelAt(canvas, 18, 30)).toEqual(bPixel))
    expect(gate.completed).toEqual([b.path])

    await act(async () => {
      hold.resolve()
      const old = await aPending
      expect(pixelAt(old!, 0, 0)).toEqual([...expectedBattleRgb(project, a.asset, 0), 255])
    })
    expect(gate.completed).toEqual([b.path, a.path])
    expect(pixelAt(canvas, 18, 30)).toEqual(bPixel)
  } finally {
    hold.resolve()
  }
})
