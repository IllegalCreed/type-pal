/** Per-test fetch adapter: fresh Response bodies per request; caller restores stubbed globals. */
import { gzipSync } from 'node:zlib'
import type { EventFile, Palette } from '@type-pal/shared'
import { vi } from 'vitest'
import { legalPalette, legalTilemap, twoFrameChunk } from './asset-fixtures.js'
import type { AssetLoadFailures, AssetLoadScenario } from './asset-load-scenario.js'

/** 单帧 5×3，首像素固定，供 loadAll 锚点合同使用。 */
function wideCharacterChunk(pixel = 0x3c): Uint8Array {
  const pixels = 5 * 3
  const buf = new Uint8Array(2 + 4 + 1 + pixels)
  const view = new DataView(buf.buffer)
  view.setUint16(0, 1, true)
  view.setUint16(2, 5, true)
  view.setUint16(4, 3, true)
  buf[6] = pixels
  buf.fill(pixel, 7)
  return buf
}

export function callsEnding(calls: readonly string[], suffix: string): string[] {
  return calls.filter((url) => url.endsWith(suffix))
}

function http(status: number): Response {
  return new Response(null, { status })
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

function bytes(body: Uint8Array, status = 200): Response {
  return new Response(body.slice(), { status })
}

function eventsOf(scenario: AssetLoadScenario): EventFile {
  return {
    scene: scenario.scene.sceneId,
    segments: [{ name: scenario.eventsName, commands: [] }],
  }
}

export function installAssetFetch(
  scenario: AssetLoadScenario,
  pngs: Map<number, Uint8Array>,
): { calls: string[] } {
  const calls: string[] = []
  const tilesetGzip = gzipSync(twoFrameChunk(0xaa, 0xbb))
  const characterGzip = gzipSync(wideCharacterChunk(0x3c))
  const spriteGzip = gzipSync(twoFrameChunk(0x11, 0x22))
  const fail = scenario.fail ?? {}
  const palette0 = scenario.palette ?? legalPalette()

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      return route(url, scenario, pngs, fail, palette0, tilesetGzip, characterGzip, spriteGzip)
    }),
  )
  return { calls }
}

function pngOf(pngs: Map<number, Uint8Array>, index: number): Response {
  const body = pngs.get(index)
  if (!body) return http(404)
  return bytes(body)
}

function route(
  url: string,
  scenario: AssetLoadScenario,
  pngs: Map<number, Uint8Array>,
  fail: AssetLoadFailures,
  palette0: Palette,
  tilesetGzip: Uint8Array,
  characterGzip: Uint8Array,
  spriteGzip: Uint8Array,
): Response {
  const sceneMatch = url.match(/\/data\/scene\/(\d+)\.json$/)
  if (sceneMatch) {
    if (fail.scene) return http(fail.scene)
    if (Number(sceneMatch[1]) !== scenario.scene.sceneId) return http(404)
    return json(scenario.scene)
  }
  if (url.endsWith(`/data/tilemap/${scenario.scene.mapNum}.json`)) {
    if (fail.tilemap) return http(fail.tilemap)
    return json(legalTilemap(`tileset/${scenario.scene.mapNum}.rle`))
  }
  const paletteMatch = url.match(/\/data\/palette\/(\d+)\.json$/)
  if (paletteMatch) {
    const id = Number(paletteMatch[1])
    const status = fail.palettes?.[id]
    if (status) return http(status)
    if (id === 0) return json(palette0)
    const extra = scenario.extraPalettes?.[id]
    if (!extra) return http(404)
    return json(extra)
  }
  if (url.includes('/events/scene-') && url.endsWith('.json')) return json(eventsOf(scenario))
  if (url.endsWith('/data/player-roles.json')) return json({ roles: scenario.roles })
  if (url.endsWith('/data/enemies.json')) return json(scenario.enemies)
  if (url.endsWith('/data/enemy-objects.json')) return json([])
  if (url.endsWith('/data/enemy-teams.json')) return json([])
  if (url.endsWith('/data/battle-fields.json')) return json([])
  if (url.endsWith('/data/enemy-pos.json')) return json(scenario.enemyPos)
  if (url.endsWith('/data/battle-effect-index.json')) return json(scenario.battleEffectIndex)
  if (url.endsWith('/data/items.json')) return json([])
  if (url.endsWith('/data/spells.json')) return json([])
  if (url.endsWith('/data/magic.json')) return json(scenario.magics)
  if (url.endsWith('/data/object-magics.json')) return json([])
  if (url.endsWith('/data/object-poisons.json')) return json([])
  if (url.endsWith('/data/object-players.json')) {
    if (fail.objectPlayers) return http(fail.objectPlayers)
    return json(scenario.objectPlayers)
  }
  if (url.endsWith('/data/level-up-exp.json')) return json(scenario.levelUpExp)
  if (url.endsWith('/data/level-up-magic.json')) return json(scenario.levelUpMagic)
  if (url.endsWith('/data/stores.json')) return json(scenario.stores)
  if (url.endsWith('/lookup/words.json')) {
    if (fail.words) return http(fail.words)
    return json(scenario.words)
  }
  if (url.endsWith(`/data/tileset/${scenario.scene.mapNum}.rle`)) {
    if (fail.tileset) return http(fail.tileset)
    return bytes(tilesetGzip)
  }
  const spriteMatch = url.match(/\/data\/sprite\/(\d+)\.rle$/)
  if (spriteMatch) {
    const id = Number(spriteMatch[1])
    if (fail.sprites?.includes(id)) return http(404)
    return bytes(characterGzip)
  }
  if (url.endsWith('/data/battle-sprites.json')) {
    if (fail.battleSprites) return http(fail.battleSprites)
    return json({ sprites: scenario.battleSprites })
  }
  if (url.endsWith('/data/battle-bgs.json')) {
    if (fail.battleBgs) return http(fail.battleBgs)
    return json({ count: scenario.battleBgIds.length, ids: scenario.battleBgIds })
  }
  const battleSprite = url.match(/\/data\/battle-sprite\/(player|enemy)\/(\d+)\.rle$/)
  if (battleSprite) {
    const key = `${battleSprite[1]}-${battleSprite[2]}`
    if (fail.battleSpriteKeys?.includes(key)) return http(404)
    return bytes(spriteGzip)
  }
  const battleBg = url.match(/\/images\/battle\/bg\/(\d+)\.png$/)
  if (battleBg) {
    const id = Number(battleBg[1])
    if (fail.battleBgIds?.includes(id)) return http(404)
    return pngOf(pngs, id)
  }
  if (url.endsWith('/data/magic/effect.rle')) {
    if (fail.effect) return http(fail.effect)
    return bytes(spriteGzip)
  }
  if (url.endsWith('/data/fire-sprites.json')) {
    if (fail.fireMeta) return http(fail.fireMeta)
    return json({
      chunkCount: scenario.fireChunks.length,
      chunks: scenario.fireChunks.map((chunk) => ({ ...chunk, frames: [] })),
    })
  }
  const fire = url.match(/\/data\/magic\/fire-(\d+)\.rle$/)
  if (fire) {
    const chunk = Number(fire[1])
    if (fail.fireChunks?.includes(chunk)) return http(404)
    return bytes(spriteGzip)
  }
  if (url.endsWith('/data/ui-sprite/spriteui.json')) {
    if (fail.uiMeta) return http(fail.uiMeta)
    return json({
      chunkIndex: 9,
      sdlpalName: 'spriteui',
      frameCount: scenario.uiFrames.length,
      frames: scenario.uiFrames.map((index) => ({ index, width: 2, height: 1 })),
    })
  }
  const ui = url.match(/\/images\/ui\/frame-(\d+)\.png$/)
  if (ui) {
    const index = Number(ui[1])
    if (fail.uiFrames?.includes(index)) return http(404)
    return pngOf(pngs, index)
  }
  if (url.endsWith('/data/items-icons.json')) {
    if (fail.itemsMeta) return http(fail.itemsMeta)
    return json({
      count: scenario.itemIcons.length,
      icons: scenario.itemIcons.map((chunkIndex) => ({ chunkIndex, width: 2, height: 1 })),
    })
  }
  const item = url.match(/\/images\/items\/(\d+)\.png$/)
  if (item) {
    const chunkIndex = Number(item[1])
    if (fail.itemIcons?.includes(chunkIndex)) return http(404)
    return pngOf(pngs, chunkIndex)
  }
  return http(404)
}
