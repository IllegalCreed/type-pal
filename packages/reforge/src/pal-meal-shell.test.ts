// @vitest-environment jsdom
import {
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
type Case = 'wine' | 'wrong-position' | 'kitchen' | 'serve'

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
  const current = caseId === 'kitchen' || caseId === 'serve' ? 's001' : 's003'
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
    caseId === 'kitchen' ? ['e19', 'e20'] : caseId === 'serve' ? ['e15', 'e26'] : ['e62']
  for (const scene of scenes) {
    // Isolate the authored body from unrelated inn plots, retaining every canonical definition,
    // address and original map/asset. This is a normal-input integration case, not formal route E2E.
    delete scene.hooks
    scene.music = null
    for (const entity of scene.entities) {
      entity.hidden = scene.id !== current || !visible.includes(entity.id)
      if (entity.id !== 'e62' && !(caseId === 'kitchen' && entity.id === 'e19'))
        for (const page of entity.pages ?? []) delete page.auto
    }
  }
  const entry = scenes.find((scene) => scene.id === current)!
  entry.entry = {
    pos:
      caseId === 'kitchen'
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
  h.frame = (dt = 100) => {
    realNow += dt
    present(dt)
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
  // Extend external Canvas IO only. Script/menu/state assertions never use these blank pixels
  // as a visual oracle; the actual PAL map exercises the production foreground-mask path.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    kind,
  ) {
    const context = contextFor.call(this, kind)
    if (kind === '2d' && context)
      Reflect.set(context, 'getTransform', () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }))
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
  await (await import('./main.js')).bootGame(loaded, { kind: 'project', projectId: 'pal' })
  h.frame()
  await drain()
  await h.settleIO()
  return {
    h,
    fixture,
    loaded,
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
async function finishDialogs(h: ShellHost) {
  for (let step = 0; step < 160 && (state().script.running || state().dialogue); step++) {
    if (state().dialogue) await key(h, 'Enter')
    else {
      h.frame(100)
      await drain()
    }
    await h.settleIO()
  }
  expect(state().script.running).toBe(false)
  expect(state().dialogue).toBe(false)
}

test('stationary normal item menu immediately awaits the entire NPC gift, once, and restores movement', async () => {
  const { h, fixture, loaded } = await boot('wine', 2)
  const start = structuredClone(state().player.pos)
  for (let tick = 0; tick < 12; tick++) {
    h.frame(100)
    await drain()
  }
  await items(h)
  await key(h, 'Enter') // scene use: no character chooser, direction or extra step
  for (let tick = 0; tick < 12; tick++) {
    h.frame(100)
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
    h.frame(100)
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
  h.frame()
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
  served.h.frame()
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
  served.h.frame()
  expect(served.leaderSprite()).toBe('sprite-208')
  await key(served.h, 'ArrowUp')
  await advance(served.h, () => state().dialogue)
  await finishDialogs(served.h)
  expect(state().world.party[0]?.appearance?.spriteId).toBe('li-xiaoyao')
  served.h.frame()
  expect(served.leaderSprite()).toBe('li-xiaoyao')
  expect(state().world.inventory.find((entry) => entry.itemId === '272')?.count).toBe(1)
  expect(state().world.script?.entityState.s001?.e15).toBe(0)
  await key(served.h, 'ArrowDown')
  expect(state().world.inventory.find((entry) => entry.itemId === '272')?.count).toBe(1)
  served.fixture.assertPristine()
})

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
