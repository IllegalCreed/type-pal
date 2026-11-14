import { IDBFactory } from 'fake-indexeddb'
import { expect, onTestFinished, test, vi } from 'vitest'
import { legalLoadedAssets } from '../__tests__/asset-fixtures.js'
import { createInitialGameState } from '../core/game-state.js'
import { _resetLoadGameHandlerForTest } from '../core/menu/menu-driver.js'
import { Save } from '../core/save/api.js'
import { _resetDbConnectionForTest } from '../core/save/indexed-db.js'
import * as videos from './avi-player.js'
import { bootstrap } from './bootstrap.js'
import * as resources from './bootstrap-resources.js'
import * as loop from './main-loop.js'

test('the native load menu rejects corrupt cash and can still load the next slot', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  const registered = vi.spyOn(window, 'addEventListener')
  const documentListeners = vi.spyOn(document, 'addEventListener')
  let pendingFrame: FrameRequestCallback | undefined
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    pendingFrame = callback
    return 1
  })
  const start = vi.spyOn(loop, 'startRafLoop')
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 200
  document.body.append(canvas)
  onTestFinished(() => {
    start.mock.results[0]?.value?.()
    for (const args of registered.mock.calls) window.removeEventListener(...args)
    for (const args of documentListeners.mock.calls) document.removeEventListener(...args)
    _resetLoadGameHandlerForTest()
    _resetDbConnectionForTest()
    document.body.replaceChildren()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const saved = createInitialGameState({ x: 16, y: 8, facing: 'left' })
  saved.partyMembers = [0]
  saved.wNumScene = 1
  saved.wNumMusic = 16
  saved.dwCash = 22
  await Save.saveSlot(1, saved)
  await Save.saveSlot(2, saved)
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('type-pal', 2)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('save-slots', 'readwrite')
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error)
      const store = transaction.objectStore('save-slots')
      const request = store.get(1)
      request.onsuccess = () => {
        const corrupt: object = request.result
        store.put(Object.assign(corrupt, { gs: { ...saved, dwCash: 'corrupt' } }))
      }
    })
  } finally {
    db.close()
  }

  const assets = legalLoadedAssets('load menu')
  const frame = { width: 1, height: 1, indices: new Uint8Array([1]), opaque: new Uint8Array([1]) }
  assets.characterSprites.set(2, {
    frames: [frame],
    anchorX: 0,
    anchorY: 0,
  })
  assets.uiSpriteFrames = Array.from({ length: 47 }, () => frame)
  vi.spyOn(resources, 'startBootstrapResourceLoad').mockReturnValue({
    soundfontData: Promise.resolve(new ArrayBuffer(0)),
    soundfontSettled: Promise.resolve(),
    resourcesReady: Promise.resolve({
      assets,
      glyphs: undefined,
      dialogAssets: { portraitFrames: new Map(), iconFrames: new Map() },
    }),
  })
  vi.spyOn(videos, 'playAvi').mockResolvedValue(undefined)
  const fetch = vi.fn(async (url: string) => {
    if (url.startsWith('/extracted/data/palette/')) return Response.json(assets.palette)
    switch (url) {
      case '/extracted/lookup/languages.json':
        return Response.json({ languages: [] })
      case '/extracted/data/event-objects.json':
        return Response.json({ eventObjects: [], sceneRanges: {} })
      case '/extracted/events/all.json':
      case '/extracted/events/scene-000.json':
        return Response.json(assets.events)
      case '/extracted/data/scene/0.json':
        return Response.json({ mapNum: 1, eventObjects: [] })
      case '/extracted/data/tilemap/1.json':
        return Response.json(assets.tilemap)
      default:
        throw new Error(`Unexpected load menu fixture resource: ${url}`)
    }
  })
  vi.stubGlobal('fetch', fetch)
  await bootstrap(canvas)
  const gs = start.mock.calls[0]?.[0].gs
  if (!gs) throw new Error('The game loop was not started')
  await vi.waitFor(() => expect(gs.menuStack.at(-1)?.kind).toBe('opening'))
  let time = performance.now()
  function press(code: string): void {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true }))
    if (!pendingFrame) throw new Error('The game did not schedule a frame')
    time += 120
    pendingFrame(time)
    window.dispatchEvent(new KeyboardEvent('keyup', { code }))
  }

  press('ArrowDown')
  press('Enter')
  expect(gs.menuStack.at(-1)?.kind).toBe('save-slot')
  const active = { cash: gs.dwCash, track: gs.wNumMusic, scene: gs.wNumScene }
  press('Enter')
  await vi.waitFor(() => {
    expect(document.querySelector('.tp-toast-error') !== null || gs.mode === 'explore').toBe(true)
  })
  expect({ cash: gs.dwCash, track: gs.wNumMusic, scene: gs.wNumScene }).toEqual(active)
  expect(gs.menuStack.at(-1)?.kind).toBe('save-slot')
  expect(document.querySelector('.tp-toast-error')?.textContent).toContain('存档损坏')
  expect(fetch).not.toHaveBeenCalledWith('/extracted/data/scene/0.json')

  press('ArrowDown')
  press('Enter')
  await vi.waitFor(() => expect(gs.sceneLoading).toBe(false))
  expect(gs.mode).toBe('explore')
  expect(gs.menuStack).toEqual([])
  expect([gs.currentSaveSlot, gs.dwCash, gs.wNumMusic]).toEqual([2, 22, 16])
  expect(gs.party).toMatchObject({ x: 16, y: 8, facing: 'left' })
  expect(fetch).toHaveBeenCalledWith('/extracted/data/scene/0.json')
})
