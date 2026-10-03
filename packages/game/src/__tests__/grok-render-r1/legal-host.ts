/**
 * TEST-GROK-RENDER-HOST-LARGE-1 专属合法宿主。
 * 只供 grok-r1 测试 import。产品代码不得引用本目录。
 * 调色板固定 256 色；RLE / PNG 都是真实字节，不 mock 解码核心。
 */

import { gzipSync } from 'node:zlib'
import type {
  EventFile,
  LevelUpMagicEntry,
  Magic,
  Palette,
  PlayerRole,
  SceneEventObject,
  SceneObjects,
  Store,
  Tilemap,
} from '@type-pal/shared'
import { vi } from 'vitest'
import type { SceneAssets } from '../../assets/loader.js'

export function legalPalette(paint?: (colors: Array<[number, number, number]>) => void): Palette {
  const colors = Array.from(
    { length: 256 },
    (_, index) => [index, 20, 40] as [number, number, number],
  )
  paint?.(colors)
  return {
    colors,
    cycles: [{ start: 10, length: 4, step: 1, frameInterval: 3 }],
  }
}

export function legalTilemap(tileset = 'tileset/1.rle'): Tilemap {
  return {
    width: 1,
    height: 1,
    cells: [[{ lower: 1, upper: 0 }]],
    tileset,
  }
}

export function legalEventObject(id: number, spriteNum: number): SceneEventObject {
  return { id, x: 16, y: 32, spriteNum, triggerMode: 1, sState: 1, direction: 0 }
}

export function legalRole(id: number, spriteNum: number): PlayerRole {
  return {
    id,
    avatar: 1,
    spriteNumInBattle: 1,
    spriteNum,
    name: 36 + id,
    attackAll: 0,
    level: 1,
    maxHP: 100,
    maxMP: 20,
    hp: 100,
    mp: 20,
    attackStrength: 10,
    magicStrength: 8,
    defense: 5,
    dexterity: 5,
    fleeRate: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 3,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
    equipment: [0, 0, 0, 0, 0, 0],
    magic: [],
  }
}

export function legalMagic(id: number, effect: number): Magic {
  return {
    id,
    effect,
    type: 'normal',
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 0,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 1,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP: 1,
    baseDamage: 0,
    elemental: 0,
    sound: 0,
  }
}

export function legalSceneAssets(sceneId: number, mapNum = sceneId): SceneAssets {
  return {
    sceneId,
    mapNum,
    tilemap: legalTilemap(`tileset/${mapNum}.rle`),
    palette: legalPalette(),
    eventObjects: [legalEventObject(1, 4)],
    npcSprites: new Map(),
    eventCommands: [],
    labelMap: { L_enter: 0 },
    onEnterLabel: 'L_enter',
  }
}

/** 两帧 1×1。word0 同时是帧数和 frame0 的 word offset。 */
export function twoFrameChunk(first = 0xaa, second = 0xbb): Uint8Array {
  const buf = new Uint8Array(16)
  const view = new DataView(buf.buffer)
  view.setUint16(0, 2, true)
  view.setUint16(2, 5, true)
  view.setUint16(4, 1, true)
  view.setUint16(6, 1, true)
  buf[8] = 0x01
  buf[9] = first
  view.setUint16(10, 1, true)
  view.setUint16(12, 1, true)
  buf[14] = 0x01
  buf[15] = second
  return buf
}

/** 单帧 5×3，首像素固定，供 loadAll 锚点合同使用。 */
export function wideCharacterChunk(pixel = 0x3c): Uint8Array {
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

export async function indexedPng(
  width: number,
  height: number,
  rgba: readonly number[],
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('grok fixture: 2d context unavailable')
  const image = ctx.createImageData(width, height)
  image.data.set(rgba)
  ctx.putImageData(image, 0, 0)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value)
      else reject(new Error('grok fixture: toBlob returned null'))
    }, 'image/png')
  })
  return new Uint8Array(await blob.arrayBuffer())
}

/** 每个 index 一张 2×1 PNG：R 通道为 index 与 index+1，A 全 255。 */
export async function pngAtlas(indexes: readonly number[]): Promise<Map<number, Uint8Array>> {
  const map = new Map<number, Uint8Array>()
  for (const index of indexes) {
    map.set(index, await indexedPng(2, 1, [index, 0, 0, 255, index + 1, 0, 0, 255]))
  }
  return map
}

export interface LoadAllFail {
  scene?: number
  tilemap?: number
  tileset?: number
  objectPlayers?: number
  words?: number
  battleSprites?: number
  battleBgs?: number
  effect?: number
  fireMeta?: number
  uiMeta?: number
  itemsMeta?: number
  sprites?: number[]
  battleSpriteKeys?: string[]
  battleBgIds?: number[]
  fireChunks?: number[]
  uiFrames?: number[]
  itemIcons?: number[]
  palettes?: Record<number, number>
}

export interface LoadAllScript {
  scene: SceneObjects
  roles: PlayerRole[]
  words: { flat?: string[] }
  objectPlayers: Array<{ id: number }>
  magics: Magic[]
  fireChunks: Array<{ chunkIndex: number; frameCount: number }>
  battleSprites: Array<{ kind: 'player' | 'enemy'; id: number }>
  battleBgIds: number[]
  uiFrames: number[]
  itemIcons: number[]
  enemies: Array<{ id: number }>
  stores: Store[]
  levelUpExp: number[]
  levelUpMagic: LevelUpMagicEntry[][]
  battleEffectIndex: number[]
  eventsName: string
  enemyPos: { layouts: Array<Array<{ x: number; y: number }>> }
  extraPalettes?: Record<number, Palette>
  palette?: Palette
  fail?: LoadAllFail
}

export function loadAllScript(patch: Partial<LoadAllScript> = {}): LoadAllScript {
  const scene: SceneObjects = patch.scene ?? {
    sceneId: 7,
    mapNum: 12,
    onEnterLabel: 'L_enter',
    eventObjects: [legalEventObject(1, 9)],
  }
  return {
    scene,
    roles: patch.roles ?? [legalRole(0, 2), legalRole(1, 0)],
    words: patch.words ?? { flat: ['甲', '乙'] },
    objectPlayers: patch.objectPlayers ?? [{ id: 1 }],
    magics: patch.magics ?? [legalMagic(0, 0), legalMagic(1, 4), legalMagic(2, 4)],
    fireChunks: patch.fireChunks ?? [
      { chunkIndex: 0, frameCount: 2 },
      { chunkIndex: 4, frameCount: 2 },
      { chunkIndex: 7, frameCount: 2 },
      { chunkIndex: 9, frameCount: 0 },
    ],
    battleSprites: patch.battleSprites ?? [
      { kind: 'player', id: 2 },
      { kind: 'enemy', id: 4 },
    ],
    battleBgIds: patch.battleBgIds ?? [8],
    uiFrames: patch.uiFrames ?? [0, 1, 2],
    itemIcons: patch.itemIcons ?? [3, 12],
    enemies: patch.enemies ?? [{ id: 41 }],
    stores: patch.stores ?? [{ id: 3, items: [61, 0] }],
    levelUpExp: patch.levelUpExp ?? [10, 20],
    levelUpMagic: patch.levelUpMagic ?? [[{ level: 2, magic: 296 }]],
    battleEffectIndex: patch.battleEffectIndex ?? [3, 6],
    eventsName: patch.eventsName ?? 'scene-007.onEnter',
    enemyPos: patch.enemyPos ?? { layouts: [[{ x: 40, y: 80 }]] },
    extraPalettes: patch.extraPalettes,
    palette: patch.palette,
    fail: patch.fail,
  }
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

function eventsOf(script: LoadAllScript): EventFile {
  return {
    scene: script.scene.sceneId,
    segments: [{ name: script.eventsName, commands: [] }],
  }
}

export function installLoadAll(
  script: LoadAllScript,
  pngs: Map<number, Uint8Array>,
): { calls: string[] } {
  const calls: string[] = []
  const tilesetGzip = gzipSync(twoFrameChunk(0xaa, 0xbb))
  const characterGzip = gzipSync(wideCharacterChunk(0x3c))
  const spriteGzip = gzipSync(twoFrameChunk(0x11, 0x22))
  const fail = script.fail ?? {}
  const palette0 = script.palette ?? legalPalette()

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      return route(url, script, pngs, fail, palette0, tilesetGzip, characterGzip, spriteGzip)
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
  script: LoadAllScript,
  pngs: Map<number, Uint8Array>,
  fail: LoadAllFail,
  palette0: Palette,
  tilesetGzip: Uint8Array,
  characterGzip: Uint8Array,
  spriteGzip: Uint8Array,
): Response {
  const sceneMatch = url.match(/\/data\/scene\/(\d+)\.json$/)
  if (sceneMatch) {
    if (fail.scene) return http(fail.scene)
    if (Number(sceneMatch[1]) !== script.scene.sceneId) return http(404)
    return json(script.scene)
  }
  if (url.endsWith(`/data/tilemap/${script.scene.mapNum}.json`)) {
    if (fail.tilemap) return http(fail.tilemap)
    return json(legalTilemap(`tileset/${script.scene.mapNum}.rle`))
  }
  const paletteMatch = url.match(/\/data\/palette\/(\d+)\.json$/)
  if (paletteMatch) {
    const id = Number(paletteMatch[1])
    const status = fail.palettes?.[id]
    if (status) return http(status)
    if (id === 0) return json(palette0)
    const extra = script.extraPalettes?.[id]
    if (!extra) return http(404)
    return json(extra)
  }
  if (url.includes('/events/scene-') && url.endsWith('.json')) return json(eventsOf(script))
  if (url.endsWith('/data/player-roles.json')) return json({ roles: script.roles })
  if (url.endsWith('/data/enemies.json')) return json(script.enemies)
  if (url.endsWith('/data/enemy-objects.json')) return json([])
  if (url.endsWith('/data/enemy-teams.json')) return json([])
  if (url.endsWith('/data/battle-fields.json')) return json([])
  if (url.endsWith('/data/enemy-pos.json')) return json(script.enemyPos)
  if (url.endsWith('/data/battle-effect-index.json')) return json(script.battleEffectIndex)
  if (url.endsWith('/data/items.json')) return json([])
  if (url.endsWith('/data/spells.json')) return json([])
  if (url.endsWith('/data/magic.json')) return json(script.magics)
  if (url.endsWith('/data/object-magics.json')) return json([])
  if (url.endsWith('/data/object-poisons.json')) return json([])
  if (url.endsWith('/data/object-players.json')) {
    if (fail.objectPlayers) return http(fail.objectPlayers)
    return json(script.objectPlayers)
  }
  if (url.endsWith('/data/level-up-exp.json')) return json(script.levelUpExp)
  if (url.endsWith('/data/level-up-magic.json')) return json(script.levelUpMagic)
  if (url.endsWith('/data/stores.json')) return json(script.stores)
  if (url.endsWith('/lookup/words.json')) {
    if (fail.words) return http(fail.words)
    return json(script.words)
  }
  if (url.endsWith(`/data/tileset/${script.scene.mapNum}.rle`)) {
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
    return json({ sprites: script.battleSprites })
  }
  if (url.endsWith('/data/battle-bgs.json')) {
    if (fail.battleBgs) return http(fail.battleBgs)
    return json({ count: script.battleBgIds.length, ids: script.battleBgIds })
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
      chunkCount: script.fireChunks.length,
      chunks: script.fireChunks.map((chunk) => ({ ...chunk, frames: [] })),
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
      frameCount: script.uiFrames.length,
      frames: script.uiFrames.map((index) => ({ index, width: 2, height: 1 })),
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
      count: script.itemIcons.length,
      icons: script.itemIcons.map((chunkIndex) => ({ chunkIndex, width: 2, height: 1 })),
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
