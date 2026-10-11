// @vitest-environment jsdom
import {
  gridToPixel,
  spriteDefinitionFrameDemand,
  validateAssetCatalog,
  validateAuthorScenes,
  validateCurrentManifestStartup,
  validateProjectMap,
  validateSceneIndex,
  validateSprites,
  validateTilesets,
} from '@type-pal/content'
import { encodeSpriteChunk } from '@type-pal/shared'
import { afterEach, expect, test, vi } from 'vitest'
import assetsJson from '../../../projects/pal/assets/index.json' with { type: 'json' }
import innMapJson from '../../../projects/pal/content/maps/map-010.json' with { type: 'json' }
import roomsMapJson from '../../../projects/pal/content/maps/map-012.json' with { type: 'json' }
import sceneIndexJson from '../../../projects/pal/content/scenes/index.json' with { type: 'json' }
import roomsJson from '../../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import innJson from '../../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import spritesJson from '../../../projects/pal/content/sprites.json' with { type: 'json' }
import tilesetsJson from '../../../projects/pal/content/tilesets.json' with { type: 'json' }
import manifestJson from '../../../projects/pal/manifest.json' with { type: 'json' }
import { chromePng, installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { advance, state } from './__tests__/runtime-shell/scenarios.js'
import { compressGzip } from './assets.js'
import type { DialogueSlotObservation } from './dialog/dialog-box.js'
import type { FileSource } from './file-source.js'
import { sha256Bytes } from './hash.js'
import { loadAllScenes, loadCurrentProjectFrom, loadScene } from './project-loader.js'
import type { CurrentSavePayload } from './save/types.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})
// Dynamic relative values keep Vite from turning filesystem test inputs into browser asset URLs.
const projectRelative = '../../../projects/pal/'
const fontRelative = '../../../data/raw/unifont-cn.bdf'
const root = new URL(projectRelative, import.meta.url)
const font = new URL(fontRelative, import.meta.url)
const { readFile } = await vi.importActual<{
  readFile(path: URL, encoding: 'utf8'): Promise<string>
  readFile(path: URL): Promise<Uint8Array>
}>('node:fs/promises')
type Case = 'wine' | 'wrong-position' | 'kitchen' | 'serve' | 'opening' | 'inn'

async function project(caseId: Case, wineCount = 1) {
  // These external image bytes are not a pixel oracle. Preserve stable IDs/kinds
  // while supplying complete PNG input and matching metadata without ignored PAL assets.
  const imageBytes = chromePng()
  const imageHash = await sha256Bytes(imageBytes)
  const catalog = validateAssetCatalog(structuredClone(assetsJson))
  const binaryInputs = new Map<string, Uint8Array<ArrayBuffer>>()
  const spriteDemands = new Map<string, number>()
  for (const sprite of validateSprites(structuredClone(spritesJson)))
    spriteDemands.set(
      sprite.asset,
      Math.max(spriteDemands.get(sprite.asset) ?? 0, spriteDefinitionFrameDemand(sprite)),
    )
  for (const [asset, demand] of spriteDemands) {
    const record = catalog.assets[asset]
    if (!record || record.kind !== 'sprite') throw new Error('sprite IO record missing')
    const bytes = await compressGzip(
      encodeSpriteChunk(
        Array.from({ length: demand }, () => ({
          width: 1,
          height: 1,
          pixels: new Uint8Array([2]),
          opaque: new Uint8Array([1]),
        })),
      ),
    )
    record.path = `assets/authored/runtime-shell/sprites/${binaryInputs.size}.rle`
    record.bytes = bytes.byteLength
    record.sha256 = await sha256Bytes(bytes)
    record.origin = {
      kind: 'authored',
      ref: 'canonical sprite IO fixture matching declared frame demand',
    }
    binaryInputs.set(record.path, Uint8Array.from(bytes))
  }
  const tileDemands = new Map<string, number>()
  for (const map of [validateProjectMap(innMapJson), validateProjectMap(roomsMapJson)])
    for (const layer of map.layers)
      for (const [rowIndex, row] of layer.tiles.entries())
        for (const [col, tile] of row.entries()) {
          if (tile === null || tile < 0) continue
          const id = map.tilesetRefs[layer.sources[rowIndex]?.[col] ?? 0]
          if (!id) throw new Error('map tileset IO reference missing')
          tileDemands.set(id, Math.max(tileDemands.get(id) ?? 0, tile + 1))
        }
  for (const tileset of validateTilesets(tilesetsJson)) {
    const demand = tileDemands.get(tileset.id)
    if (!demand) continue
    const record = catalog.assets[tileset.asset]
    if (!record || record.kind !== 'tileset') throw new Error('tileset IO record missing')
    const bytes = await compressGzip(
      encodeSpriteChunk(
        Array.from({ length: demand }, () => ({
          width: 32,
          height: 16,
          pixels: new Uint8Array(512),
          opaque: new Uint8Array(512),
        })),
      ),
    )
    record.path = `assets/authored/runtime-shell/tiles/${binaryInputs.size}.rle`
    record.bytes = bytes.byteLength
    record.sha256 = await sha256Bytes(bytes)
    record.origin = {
      kind: 'authored',
      ref: 'canonical tile IO fixture covering real map frame IDs',
    }
    binaryInputs.set(record.path, Uint8Array.from(bytes))
  }
  const colorTable = {
    colors: Array.from({ length: 256 }, (_, value) => [value, value, value]),
    cycles: [],
  }
  const colorBytes = new TextEncoder().encode(JSON.stringify(colorTable))
  const colorAsset = catalog.assets[manifestJson.assets.roles['visual.standardColorTable']]
  if (!colorAsset || colorAsset.kind !== 'color-table')
    throw new Error('standard color role missing')
  colorAsset.path = 'assets/authored/runtime-shell/colors.json'
  colorAsset.bytes = colorBytes.byteLength
  colorAsset.sha256 = await sha256Bytes(colorBytes)
  colorAsset.origin = { kind: 'authored', ref: 'complete grayscale IO fixture' }
  const imagePaths = new Set<string>()
  for (const record of Object.values(catalog.assets)) {
    if (
      record.mediaType !== 'image/png' ||
      !['face', 'portrait', 'item-icon', 'battle-background'].includes(record.kind)
    )
      continue
    record.bytes = imageBytes.byteLength
    record.sha256 = imageHash
    record.path = `assets/authored/runtime-shell/${imagePaths.size}.png`
    record.origin = { kind: 'authored', ref: 'runtime-shell chromePng IO fixture' }
    imagePaths.add(record.path)
  }
  const scenes = validateAuthorScenes(structuredClone([roomsJson, innJson]))
  // Only these two complete scene definitions belong to this isolated integration case.
  // Keep real paths/IDs and all other resource catalogs; the production loader still validates
  // every indexed scene. An executed reference to any other scene must fail, never use a dummy.
  const sceneIndex = validateSceneIndex({
    ...sceneIndexJson,
    scenes: sceneIndexJson.scenes.filter((entry) => scenes.some((scene) => scene.id === entry.id)),
  })
  const manifest = validateCurrentManifestStartup(structuredClone(manifestJson)).manifest
  const current =
    caseId === 'kitchen' || caseId === 'serve' || caseId === 'opening' ? 's001' : 's003'
  manifest.defaultEntryId = 'meal-test'
  manifest.entryPoints = [
    {
      id: 'meal-test',
      label: '004 isolated normal-input entry',
      scene: current,
      startWorld: {
        party: ['li-xiaoyao'],
        money: 0,
        inventory:
          caseId === 'wine' || caseId === 'wrong-position'
            ? [{ itemId: '272', count: wineCount }]
            : [],
      },
    },
  ]
  const visible =
    caseId === 'inn'
      ? ['e54', 'e55', 'e56', 'e59', 'e60', 'e61']
      : caseId === 'kitchen'
        ? ['e19', 'e20']
        : caseId === 'serve'
          ? ['e15', 'e26']
          : ['e62']
  for (const scene of scenes) {
    if (caseId === 'opening' && scene.id === 's001') {
      scene.music = null
      continue
    }
    // Isolate the authored body from unrelated inn plots, retaining every canonical definition,
    // address and original map/asset. This is a normal-input integration case, not formal route E2E.
    delete scene.hooks
    scene.music = null
    for (const entity of scene.entities) {
      entity.hidden = scene.id !== current || !visible.includes(entity.id)
      if (caseId !== 'inn' && entity.id !== 'e62' && !(caseId === 'kitchen' && entity.id === 'e19'))
        for (const page of entity.pages ?? []) delete page.auto
    }
  }
  const entry = scenes.find((scene) => scene.id === current)!
  if (caseId !== 'opening')
    entry.entry = {
      pos:
        caseId === 'inn'
          ? { col: 127, row: 45, height: 0 }
          : caseId === 'kitchen'
            ? { col: 92, row: 52, height: 0 }
            : caseId === 'serve'
              ? { col: 108, row: 30, height: 0 }
              : { col: caseId === 'wrong-position' ? 134 : 137, row: 74, height: 0 },
      facing: 'up',
    }
  if (caseId === 'kitchen')
    entry.entities.find((entity) => entity.id === 'e20')!.pages![0]!.trigger = 'take-dishes'
  if (caseId === 'serve')
    entry.hooks = {
      onEnter: {
        initial: 'setup',
        variants: {
          setup: {
            label: 'Existing persistent tray precondition',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'once',
              stages: [
                {
                  id: 'once',
                  body: [
                    { kind: 'setActorAppearance', actor: 'li-xiaoyao', spriteId: 'sprite-208' },
                  ],
                  next: { kind: 'complete' },
                },
              ],
            },
          },
        },
      },
    }
  const documents = new Map<string, unknown>([
    ['assets/index.json', catalog],
    [colorAsset.path, colorTable],
    ['manifest.json', manifest],
    ['content/scenes/index.json', sceneIndex],
    ...scenes.map((scene) => [`content/scenes/${scene.id}.json`, scene] as const),
  ])
  const delivered: Array<{ path: string; actual: unknown; before: unknown }> = []
  const source: FileSource = {
    async readText(path) {
      if (documents.has(path)) return JSON.stringify(documents.get(path))
      try {
        return await readFile(new URL(path, root), 'utf8')
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
          throw new DOMException(path, 'NotFoundError')
        throw error
      }
    },
    async readJson<T>(path: string): Promise<T> {
      const actual = JSON.parse(await source.readText(path))
      delivered.push({ path, actual, before: structuredClone(actual) })
      return actual
    },
    async readBytes(path) {
      const binary = binaryInputs.get(path)
      if (binary) return binary.slice().buffer
      if (imagePaths.has(path)) return imageBytes.slice().buffer
      if (path === colorAsset.path) return colorBytes.slice().buffer
      return Uint8Array.from(await readFile(new URL(path, root))).buffer
    },
    async urlFor(path) {
      return new URL(path, root).href
    },
  }
  return {
    source,
    scenes,
    assertPristine: () => {
      for (const { path, actual, before } of delivered) expect(actual, path).toEqual(before)
      expect(
        [
          ...new Set(
            delivered
              .filter(
                ({ path }) =>
                  path.startsWith('content/scenes/') && path !== 'content/scenes/index.json',
              )
              .map(({ path }) => path),
          ),
        ].sort(),
      ).toEqual(['content/scenes/s001.json', 'content/scenes/s003.json'])
    },
  }
}

async function boot(caseId: Case, wineCount = 1, query = '', restore?: CurrentSavePayload) {
  host = await installShellHost(query)
  const h = host
  const present = h.frame
  let realNow = 0
  vi.spyOn(performance, 'now').mockImplementation(() => realNow)
  h.frame = async (dt = 100) => {
    realNow += dt
    await present(dt)
    // These external IO records are not a pixel oracle. Bound unused per-frame draw logs.
    h.draws.length = 0
  }
  vi.stubGlobal(
    'ImageData',
    class {
      readonly colorSpace = 'srgb'
      constructor(
        readonly data: Uint8ClampedArray,
        readonly width: number,
        readonly height: number,
      ) {}
    },
  )
  const contextFor = vi.mocked(HTMLCanvasElement.prototype.getContext).getMockImplementation()
  if (!contextFor) throw new Error('external Canvas IO adapter missing')
  const sizedCanvases = new WeakSet<HTMLCanvasElement>()
  // Extend external Canvas IO only. Script/menu/state assertions never use these blank pixels
  // as a visual oracle; the actual PAL map exercises the production foreground-mask path.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    kind,
  ) {
    const context = contextFor.call(this, kind)
    if (kind === '2d' && context) {
      Reflect.set(context, 'getTransform', () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }))
      // Private image/mask canvases are sized through these properties, never DOM attributes.
      // Forward each write through native validation; avoid jsdom reparsing the same dimensions
      // for every tile blit. Keep the user-facing screen element's native DOM contract intact.
      if (this.id !== 'screen' && !sizedCanvases.has(this)) {
        for (const dimension of ['width', 'height'] as const) {
          const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, dimension)
          if (!descriptor?.get || !descriptor.set) throw new Error('native canvas size missing')
          const read = descriptor.get,
            write = descriptor.set
          let size: unknown = read.call(this)
          if (typeof size !== 'number') throw new Error('native canvas size invalid')
          Object.defineProperty(this, dimension, {
            configurable: true,
            get: () => size,
            set: (value: unknown) => {
              write.call(this, value)
              size = read.call(this)
              if (typeof size !== 'number') throw new Error('native canvas size invalid')
            },
          })
        }
        sizedCanvases.add(this)
      }
    }
    return context
  })
  const { ENGINE_CHROME } = await import('./engine-chrome/registry.js')
  if (restore)
    h.overrides.set('/carried.save.json', async () => new Response(JSON.stringify(restore)))
  // Use the actual bundled font and production BDF parser, never a fabricated glyph table.
  h.overrides.set(ENGINE_CHROME.fontBdf, async () => new Response(await readFile(font, 'utf8')))
  const fixture = await project(caseId, wineCount)
  const loaded = await loadCurrentProjectFrom(fixture.source)
  expect(loaded.sceneIds).toEqual(['s001', 's003'])
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const visual = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  const { Canvas2DRenderer } = await import('./render.js')
  const renderScene = Canvas2DRenderer.prototype.renderScene
  const escortDraws: { col: number; frame: number }[] = []
  const guestDraws: { col: number; row: number }[] = []
  const openingDraws: {
    player: { col: number; row: number; sprite: string | undefined }
    aunt: { row: number; hidden: boolean; facing: string; frame: number | null }
  }[] = []
  vi.spyOn(Canvas2DRenderer.prototype, 'renderScene').mockImplementation(function (
    this: InstanceType<typeof Canvas2DRenderer>,
    ...args
  ) {
    renderScene.apply(this, args)
    // Observe only a successfully completed real world draw, identifying the NPC by both
    // its live position and its loaded frame object. Blank asset IO is not a pixel oracle.
    const input = visual.mock.lastCall?.[0]
    const guest = input?.entities.find((entity) => entity.id === 'e59')
    if (input && guest && caseId === 'inn') {
      const definition = input.entitySprite(guest.id)
      const loaded = definition ? input.loadedSprite(definition) : undefined
      const pixel = gridToPixel(guest.pos)
      if (
        args[3].some(
          (sprite) =>
            sprite.worldX === pixel.x &&
            sprite.worldY === pixel.y &&
            loaded?.frames.includes(sprite.frame),
        )
      )
        guestDraws.push({ col: guest.pos.col, row: guest.pos.row })
    }
    const aunt = input?.entities.find((entity) => entity.id === 'e10')
    if (input && aunt && caseId === 'opening') {
      const definition = input.entitySprite(aunt.id)
      const loaded = definition ? input.loadedSprite(definition) : undefined
      const pixel = gridToPixel(aunt.pos)
      const draw = args[3].find(
        (sprite) =>
          sprite.worldX === pixel.x &&
          sprite.worldY === pixel.y &&
          loaded?.frames.includes(sprite.frame),
      )
      openingDraws.push({
        player: {
          col: input.player.pos.col,
          row: input.player.pos.row,
          sprite: input.party[0] ? input.partyVisual(input.party[0])?.def.id : undefined,
        },
        aunt: {
          row: aunt.pos.row,
          hidden: !input.visible(aunt),
          facing: aunt.facing ?? 'down',
          frame: draw && loaded ? loaded.frames.indexOf(draw.frame) : null,
        },
      })
    }
    const escort = input?.entities.find((entity) => entity.id === 'e26')
    if (!input || !escort || escort.facing !== 'left') return
    const definition = input.entitySprite(escort.id)
    const loaded = definition ? input.loadedSprite(definition) : undefined
    const pixel = gridToPixel(escort.pos)
    const drawn = args[3].find(
      (sprite) => sprite.worldX === pixel.x && loaded?.frames.includes(sprite.frame),
    )
    if (drawn && loaded)
      escortDraws.push({ col: escort.pos.col, frame: loaded.frames.indexOf(drawn.frame) })
  })
  await (await import('./main.js')).bootGame(loaded, { kind: 'project', projectId: 'pal' })
  await h.frame()
  await drain()
  await h.settleIO()
  return {
    h,
    fixture,
    loaded,
    escortDraws,
    openingDraws,
    guestDraws,
    leaderSprite: () => {
      const input = visual.mock.lastCall?.[0],
        leader = input?.party[0]
      return leader ? input?.partyVisual(leader)?.def.id : undefined
    },
  }
}
async function items(h: ShellHost, reentry = false) {
  // The real hub remembers items, while its reopened submenu starts at equipment.
  for (const value of reentry
    ? ['Escape', 'Enter', 'ArrowDown', 'Enter']
    : ['Escape', 'ArrowDown', 'ArrowDown', 'Enter', 'ArrowDown', 'Enter'])
    await key(h, value)
  expect(state().renderDebug.menuActive).toBe(true)
}
function rows(h: ShellHost) {
  return h.text.mock.calls.flatMap((call) => call[1].map((span) => span.text))
}
async function finishDialogs(h: ShellHost, frameBudget = 160) {
  for (let step = 0; step < frameBudget && (state().script.running || state().dialogue); step++) {
    if (state().dialogue) await key(h, 'Enter')
    else {
      await h.frame(100)
      await drain()
    }
    await h.settleIO()
  }
  expect(state().script.running).toBe(false)
  expect(state().dialogue).toBe(false)
}

test('canonical inn clears the aunt before guest movement while retaining the later two-sided exchange', async () => {
  const { h, fixture, loaded, guestDraws } = await boot('inn')
  await key(h, 'ArrowLeft') // Enter the canonical touch range from outside through normal movement.
  const slots = (): readonly DialogueSlotObservation[] => {
    const observer: unknown = Reflect.get(window, '__tpObserve')
    if (
      !observer ||
      typeof observer !== 'object' ||
      !('readRuntime' in observer) ||
      typeof observer.readRuntime !== 'function'
    )
      throw new Error('actual dialogue observer missing')
    return observer.readRuntime().dialogueSlots
  }
  let auntFinished = false,
    movingDraws = 0,
    exchangeDrawn = false
  for (let frame = 0; frame < 160 && !exchangeDrawn; frame++) {
    const before = slots()
    const aunt = before.find((slot) => slot.rowTextIds.includes('dlg.29'))
    if (state().dialogue) await key(h, 'Enter')
    else {
      await h.frame(100)
      await drain()
    }
    await h.settleIO()
    const after = slots()
    if (aunt && !after.some((slot) => slot.presentationId === aunt.presentationId))
      auntFinished = true
    const guest = guestDraws.at(-1)
    if (guest && guest.col !== 122 && !after.some((slot) => slot.active)) {
      movingDraws++
      expect(auntFinished).toBe(true)
      expect(after).toEqual([])
    }
    if (
      after.some((slot) => slot.rowTextIds.includes('dlg.32')) &&
      after.some((slot) => slot.rowTextIds.includes('dlg.36'))
    ) {
      h.text.mockClear()
      await h.frame(100)
      await drain()
      const rendered = h.text.mock.calls.flatMap((call) => call[1].map((span) => span.text))
      expect(rendered).toContain(loaded.locale['dlg.32'])
      expect(rendered).toContain(loaded.locale['dlg.36'])
      exchangeDrawn = true
    }
  }
  expect(movingDraws, JSON.stringify({ guestDraws, slots: slots() })).toBeGreaterThan(0)
  expect(exchangeDrawn).toBe(true)
  fixture.assertPristine()
}, 15_000)

test('stationary normal item menu immediately awaits the entire NPC gift, once, and restores movement', async () => {
  const { h, fixture, loaded } = await boot('wine', 2)
  const start = structuredClone(state().player.pos)
  for (let tick = 0; tick < 12; tick++) {
    await h.frame(100)
    await drain()
  }
  await items(h)
  await key(h, 'Enter') // scene use: no character chooser, direction or extra step
  for (let tick = 0; tick < 12; tick++) {
    await h.frame(100)
    await drain()
    await h.settleIO()
  }
  expect(state().dialogue).toBe(true)
  expect(state().player.pos).toEqual(start)
  await key(h, 'Enter') // normal typewriter completion renders the first NPC cue
  expect(rows(h).join(' ')).toContain(loaded.locale['dlg.172'])
  expect(state().renderDebug.menuActive).toBe(false)
  await key(h, 'Escape')
  expect(state().renderDebug.menuActive).toBe(false)
  await finishDialogs(h)
  expect(state().world.inventory.find((entry) => entry.itemId === '272')?.count).toBe(1)
  expect(state().world.script?.behaviors.entities?.s003?.e62?.trigger?.cursor?.at).toEqual({
    kind: 'completed',
  })
  expect(rows(h).join(' ')).toContain(loaded.locale['dlg.207'])
  expect(rows(h).join(' ')).toContain(loaded.locale['dlg.209'])
  const inventory = structuredClone(state().world.inventory)
  await items(h, true)
  await key(h, 'Enter')
  await advance(h, () => state().dialogue)
  await key(h, 'Enter')
  expect(rows(h).join(' ')).toContain(loaded.locale['dlg.12538'])
  await finishDialogs(h)
  expect(state().world.inventory).toEqual(inventory)
  await key(h, 'ArrowDown', 150)
  expect(state().player.pos).not.toEqual(start)
  fixture.assertPristine()
}, 15_000)

test('normal item cancellation and invalid wine position preserve inventory and never enter the gift', async () => {
  const { h, fixture, loaded } = await boot('wrong-position')
  const before = structuredClone(state().world)
  await items(h)
  await key(h, 'Escape')
  expect(state().world.inventory).toEqual(before.inventory)
  expect(state().world.party).toEqual(before.party)
  expect(state().world.money).toBe(before.money)
  for (const value of ['Escape', 'Escape']) await key(h, value)
  await items(h, true)
  await key(h, 'Enter')
  await advance(h, () => state().dialogue)
  await key(h, 'Enter')
  expect(rows(h).join(' ')).toContain(loaded.locale['dlg.12538'])
  expect(rows(h).join(' ')).not.toContain(loaded.locale['dlg.172'])
  await finishDialogs(h)
  expect(state().world.inventory).toEqual(before.inventory)
  expect(state().world.script?.behaviors.entities?.s003?.e62?.trigger?.selection).toBeUndefined()
  fixture.assertPristine()
})

test('slow kitchen dialogue keeps the aunt facing down and restores up only after the instruction', async () => {
  const { h, fixture } = await boot('kitchen')
  await key(h, 'Enter')
  await advance(h, () => state().dialogue)
  expect(state().entities.find((entity) => entity.id === 'e19')?.facing).toBe('down')
  for (let tick = 0; tick < 31; tick++) {
    await h.frame(100)
    await drain()
  }
  expect(state().dialogue).toBe(true)
  expect(state().entities.find((entity) => entity.id === 'e19')?.facing).toBe('down')
  await finishDialogs(h)
  expect(state().entities.find((entity) => entity.id === 'e19')?.facing).toBe('up')
  expect(state().world.party[0]?.appearance?.spriteId).toBe('sprite-208')
  fixture.assertPristine()
})

test('normal manual save and fresh current-codec restore retain the actual carried tray', async () => {
  const carrying = await boot('kitchen'),
    h = carrying.h
  await key(h, 'Enter')
  await advance(h, () => state().dialogue)
  await finishDialogs(h)
  expect(state().world.party[0]?.appearance?.spriteId).toBe('sprite-208')
  await h.frame()
  expect(carrying.leaderSprite()).toBe('sprite-208')
  const { IndexedDbSaveStore } = await import('./save/store.js')
  const writes = vi.spyOn(IndexedDbSaveStore.prototype, 'putSlot')
  for (const value of ['Escape', 'ArrowUp', 'Enter', 'Enter', 'ArrowDown', 'ArrowDown', 'Enter'])
    await key(h, value)
  await advance(h, () => writes.mock.calls.length === 1)
  const result = writes.mock.results[0]
  if (!result || result.type !== 'return') throw new Error('manual save writer did not return')
  await result.value
  const payload = await new IndexedDbSaveStore({ kind: 'project', projectId: 'pal' }).getPayload(
    'm01',
  )
  expect(payload?.world.party[0]?.appearance?.spriteId).toBe('sprite-208')
  if (!payload) throw new Error('manual tray snapshot missing')
  const before = structuredClone(payload)
  carrying.fixture.assertPristine()
  h.close()
  host = undefined
  // Fresh boot consumes the untouched manual payload through production load preflight/codec.
  const served = await boot('kitchen', 1, '?e2e-load=/carried.save.json', payload)
  await advance(served.h, () => !state().script.running)
  expect(state().player.pos).toEqual(payload.position.pos)
  expect(state().world.party[0]?.appearance?.spriteId).toBe('sprite-208')
  await served.h.frame()
  expect(served.leaderSprite()).toBe('sprite-208')
  expect(payload).toEqual(before)
  served.fixture.assertPristine()
})

test('a normal landing executes the actual serving body, restores the persistent sprite and grants wine once', async () => {
  const served = await boot('serve')
  await advance(
    served.h,
    () => !state().script.running && state().world.party[0]?.appearance?.spriteId === 'sprite-208',
  )
  await served.h.frame()
  expect(served.leaderSprite()).toBe('sprite-208')
  await key(served.h, 'ArrowUp')
  await advance(served.h, () => state().dialogue)
  await finishDialogs(served.h)
  expect(state().world.party[0]?.appearance?.spriteId).toBe('li-xiaoyao')
  await served.h.frame()
  expect(served.leaderSprite()).toBe('li-xiaoyao')
  expect(state().world.inventory.find((entry) => entry.itemId === '272')?.count).toBe(1)
  expect(state().world.script?.entityState.s001?.e15).toBe(0)
  // Stay in the room until the complete automatic return, unlike the route recording which
  // can leave while the eighth step is pending. L_541/L_542 perform eight quarter-cell steps.
  await advance(
    served.h,
    () =>
      state().world.script?.behaviors.entities?.s001?.e26?.auto?.cursor?.at.kind === 'completed',
  )
  expect(state().entities.find((entity) => entity.id === 'e26')?.pos).toEqual({
    col: 107,
    row: 24,
    height: 0,
  })
  const returnDraws = served.escortDraws
    .filter(({ col }) => col < 109)
    .filter(
      (draw, index, values) =>
        index === 0 ||
        draw.col !== values[index - 1]?.col ||
        draw.frame !== values[index - 1]?.frame,
    )
  expect(returnDraws).toEqual([
    { col: 108.75, frame: 4 },
    { col: 108.5, frame: 3 },
    { col: 108.25, frame: 5 },
    { col: 108, frame: 3 },
    { col: 107.75, frame: 4 },
    { col: 107.5, frame: 3 },
    { col: 107.25, frame: 5 },
    { col: 107, frame: 3 },
  ])
  await key(served.h, 'ArrowDown')
  expect(state().world.inventory.find((entry) => entry.itemId === '272')?.count).toBe(1)
  served.fixture.assertPristine()
})

test.each([
  100, 17,
])('the opening aunt presents each exact handoff before drawing (%ims frames)', async (frameMs) => {
  const opening = await boot('opening')
  const frame = opening.h.frame
  opening.h.frame = () => frame(frameMs)
  const untilLine = async (id: string) => {
    const text = opening.loaded.locale[id]
    if (!text) throw new Error(`missing canonical dialogue ${id}`)
    for (let turn = 0; turn < 900 && !rows(opening.h).includes(text); turn++) {
      if (state().dialogue) await key(opening.h, 'Enter')
      else {
        await opening.h.frame(100)
        await drain()
      }
      await opening.h.settleIO()
    }
    expect(rows(opening.h), id).toContain(text)
    expect(state().dialogue).toBe(true)
  }
  for (const [line, row, facing] of [
    ['dlg.1369', -18.5, 'down'],
    ['dlg.1371', -17, 'up'],
  ] as const) {
    await untilLine(line)
    const pausedDraw = opening.openingDraws.length
    for (let tick = 0; tick < 5; tick++) {
      await opening.h.frame(100)
      await drain()
    }
    expect(state().entities.find((entity) => entity.id === 'e10')).toMatchObject({
      pos: { col: 60, row, height: 0 },
      facing,
    })
    const duringDialogue = opening.openingDraws.slice(pausedDraw).map((draw) => draw.aunt)
    expect(duringDialogue).toHaveLength(5)
    expect(duringDialogue).toEqual(
      Array.from({ length: 5 }, () => ({
        row,
        hidden: false,
        facing,
        frame: facing === 'up' ? 6 : 0,
      })),
    )
  }
  const start = structuredClone(state().player.pos)
  const boundary = opening.openingDraws.length
  // At 17ms five drawn holds do not finish typing; first confirm skips typing, next closes.
  for (let confirm = 0; confirm < 3 && state().dialogue; confirm++) await key(opening.h, 'Enter')
  expect(state().dialogue).toBe(false)
  await advance(opening.h, () =>
    opening.openingDraws
      .slice(boundary)
      .some((draw) => draw.player.col !== start.col || draw.player.row !== start.row),
  )
  const first = opening.openingDraws
    .slice(boundary)
    .find((draw) => draw.player.col !== start.col || draw.player.row !== start.row)
  expect(first?.aunt).toEqual({ row: -12.5, hidden: false, facing: 'down', frame: 0 })
  expect(opening.openingDraws.find((draw) => !draw.aunt.hidden)?.aunt).toEqual({
    row: -23,
    hidden: false,
    facing: 'left',
    frame: 3,
  })
  expect(opening.openingDraws.find((draw) => draw.aunt.row === -20)?.player.sprite).toBe(
    'li-xiaoyao',
  )
  expect(opening.openingDraws.find((draw) => draw.aunt.row === -17)?.aunt).toEqual({
    row: -17,
    hidden: false,
    facing: 'up',
    frame: 6,
  })
  expect(opening.openingDraws.find((draw) => draw.aunt.row === -12.875)?.aunt).toEqual({
    row: -12.875,
    hidden: false,
    facing: 'down',
    frame: 2,
  })
  await advance(
    opening.h,
    () => state().entities.find((entity) => entity.id === 'e10')?.hidden === true,
  )
  expect(state().entities.find((entity) => entity.id === 'e10')?.pos).toEqual({
    col: 60,
    row: -12,
    height: 0,
  })
  await finishDialogs(opening.h, Math.ceil((160 * 100) / frameMs))
  opening.fixture.assertPristine()
}, 30_000)

test('the isolated scene index preserves production validation and fails closed outside its real input scope', async () => {
  host = await installShellHost()
  const fixture = await project('kitchen')
  const loaded = await loadCurrentProjectFrom(fixture.source)
  expect((await loadAllScenes(loaded)).map((scene) => scene.id)).toEqual(['s001', 's003'])
  // s004 exists on disk, but it is not this case's indexed input. No dummy scene or ignored
  // reference may turn an accidentally executed later-plot dependency into a successful case.
  await expect(loadScene(loaded, 's004')).rejects.toThrow('SceneId "s004" 不在 scene index')
  fixture.assertPristine()
})
