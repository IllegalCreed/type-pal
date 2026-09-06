// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { bootGame } from './main.js'
import type { LoadedCurrentProject } from './project-loader.js'
import { parseShopTrialParameters, runShopTrial } from './shop-trial.js'

const probes = vi.hoisted(() => ({
  draw: vi.fn(),
  world: vi.fn(() => {
    throw new Error('world boot forbidden')
  }),
  projection: vi.fn(() => {
    throw new Error('scene projection forbidden')
  }),
  save: vi.fn(() => {
    throw new Error('save store forbidden')
  }),
  assets: vi.fn(async () => ({})),
}))
vi.mock('./engine-chrome/registry.js', async (original) => ({
  ...(await original<object>()),
  assertEngineChromeComplete: vi.fn(),
}))
vi.mock('./menu/menu-box.js', async (original) => ({
  ...(await original<object>()),
  loadMenuAssets: probes.assets,
}))
vi.mock('./text/glyph.js', async (original) => ({
  ...(await original<object>()),
  loadGlyphs: vi.fn(async () => ({})),
}))
vi.mock('./menu/shop-box.js', async (original) => ({
  ...(await original<object>()),
  drawShop: probes.draw,
}))
vi.mock('./runtime-project-view.js', async (original) => ({
  ...(await original<object>()),
  runtimeProjectView: probes.projection,
}))
vi.mock('@type-pal/content', async (original) => ({
  ...(await original<object>()),
  buildWorld: probes.world,
}))
vi.mock('./save/store.js', async (original) => ({
  ...(await original<object>()),
  IndexedDbSaveStore: probes.save,
  MemorySaveStore: probes.save,
}))

let frames: Map<number, FrameRequestCallback>
let openDb: ReturnType<typeof vi.fn>
const project = () =>
  ({
    manifest: { id: 'shop-project' },
    shops: [{ id: 0, items: ['a', 'a'] }],
    items: { a: { id: 'a', name: '药', desc: [], buyPrice: 50, sellPrice: 7, sellable: true } },
    locale: { 'menu.system.no': '否', 'menu.system.yes': '是' },
    imageCache: {},
    get authorContent() {
      throw new Error('scene access forbidden')
    },
  }) as unknown as LoadedCurrentProject

beforeEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = '<canvas id="screen"></canvas>'
  history.replaceState(null, '', '/')
  frames = new Map()
  let id = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.set(++id, cb)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key))
  openDb = vi.fn(() => {
    throw new Error('IndexedDB access forbidden')
  })
  vi.stubGlobal('indexedDB', { open: openDb })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    save() {},
    restore() {},
    setTransform() {},
    fillRect() {},
  } as unknown as CanvasRenderingContext2D)
})
afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
function tick(key?: string) {
  if (key) window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }))
  const next = frames.entries().next().value
  if (next) {
    frames.delete(next[0])
    next[1](100)
  }
}

describe('isolated shop trial', () => {
  test('strict parameters distinguish id0 from no trial and reject other boot modes', () => {
    expect(parseShopTrialParameters(new URLSearchParams())).toBeUndefined()
    expect(parseShopTrialParameters(new URLSearchParams('shop-trial=0&money=0'))).toEqual({
      shopId: 0,
      money: 0,
    })
    for (const query of [
      'shop-trial=&money=0',
      'shop-trial=-1&money=0',
      'shop-trial=0',
      'shop-trial=0&money=1.5',
      'shop-trial=0&money=NaN',
      'shop-trial=0&money=9007199254740992',
      'shop-trial=0&money=0&money=1',
      'shop-trial=0&shop-trial=1&money=0',
    ])
      expect(() => parseShopTrialParameters(new URLSearchParams(query))).toThrow()
    for (const key of [
      'scene',
      'entry',
      'battle',
      'skill',
      'e2e-load',
      'gallery',
      'battle-preview',
      'menu',
      'party',
      'give',
      'field',
    ])
      expect(() =>
        parseShopTrialParameters(new URLSearchParams(`shop-trial=0&money=0&${key}=x`)),
      ).toThrow()
  })
  test.each([
    'project',
    'workspace',
  ] as const)('real bootGame buys with %s scope, never creates save/world/scenes, and disposes input/frame', async (kind) => {
    history.replaceState(
      null,
      '',
      `/play.html?shop-trial=0&money=100${kind === 'workspace' ? '&save-workspace=11111111-1111-4111-8111-111111111111' : ''}`,
    )
    const inputProject = project()
    const run = bootGame(
      inputProject,
      kind === 'workspace'
        ? {
            kind,
            projectId: inputProject.manifest.id,
            workspaceId: '11111111-1111-4111-8111-111111111111',
          }
        : { kind, projectId: inputProject.manifest.id },
    )
    await vi.waitFor(() => expect(frames.size).toBe(1))
    tick('Enter')
    tick('ArrowRight')
    tick('Enter')
    expect(probes.draw.mock.lastCall?.[2]).toMatchObject({
      money: 50,
      inventory: [{ itemId: 'a', count: 1 }],
    })
    tick('ArrowDown')
    tick('Enter')
    tick('ArrowRight')
    tick('Enter')
    expect(probes.draw.mock.lastCall?.[2]).toMatchObject({
      money: 0,
      inventory: [{ itemId: 'a', count: 2 }],
    })
    tick('Enter')
    expect(probes.draw.mock.lastCall?.[1].phase).toBe('list')
    tick('Escape')
    await run
    expect(document.querySelector('[role="status"]')?.textContent).toContain('试买已结束')
    expect(frames.size).toBe(0)
    const calls = probes.draw.mock.calls.length
    tick('Enter')
    expect(probes.draw).toHaveBeenCalledTimes(calls)
    expect(openDb).not.toHaveBeenCalled()
    expect(probes.save).not.toHaveBeenCalled()
    expect(probes.world).not.toHaveBeenCalled()
    expect(probes.projection).not.toHaveBeenCalled()
  })
  test('boot rejects a mismatched or missing scope before any world, assets or storage work', async () => {
    await expect(bootGame(project(), { kind: 'project', projectId: 'wrong' })).rejects.toThrow(
      '当前项目',
    )
    await expect(bootGame(project(), undefined as never)).rejects.toThrow('存档')
    expect(probes.world).not.toHaveBeenCalled()
    expect(probes.projection).not.toHaveBeenCalled()
    expect(probes.assets).not.toHaveBeenCalled()
    expect(probes.save).not.toHaveBeenCalled()
    expect(openDb).not.toHaveBeenCalled()
  })
  test('missing shops/items fail before assets; empty stock exits and pagehide stops rendering', async () => {
    await expect(runShopTrial(project(), { shopId: 9, money: 0 })).rejects.toThrow(/不存在/)
    const missing = project()
    missing.shops = [{ id: 0, items: ['missing'] }]
    await expect(runShopTrial(missing, { shopId: 0, money: 0 })).rejects.toThrow(/物品/)
    expect(probes.assets).not.toHaveBeenCalled()
    const empty = project()
    empty.shops = [{ id: 0, items: [] }]
    const run = runShopTrial(empty, { shopId: 0, money: 0 })
    await vi.waitFor(() => expect(frames.size).toBe(1))
    tick('ArrowDown')
    expect(probes.draw.mock.lastCall?.[1].cursor).toBe(0)
    window.dispatchEvent(new Event('pagehide'))
    await run
    expect(frames.size).toBe(0)
  })
  test('draw errors also dispose frame and keyboard listener', async () => {
    probes.draw.mockImplementationOnce(() => {
      throw new Error('draw failed')
    })
    const run = runShopTrial(project(), { shopId: 0, money: 0 })
    const failed = expect(run).rejects.toThrow('draw failed')
    await vi.waitFor(() => expect(frames.size).toBe(1))
    tick()
    await failed
    expect(frames.size).toBe(0)
  })
})
