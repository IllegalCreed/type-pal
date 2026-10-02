/**
 * 本波专属合法输入。屏障测试只比较引用；场景缓存与对话图标走完整公开类型。
 * 不从原 400 legal-host 导入。
 */
import type {
  BattleField,
  Enemy,
  EnemyObject,
  EnemyTeam,
  EventFile,
  Item,
  LevelUpMagicEntry,
  Magic,
  ObjectMagicView,
  ObjectPlayerView,
  ObjectPoisonView,
  Palette,
  SceneEventObject,
  Spell,
  Store,
  Tilemap,
} from '@type-pal/shared'
import type { LoadedAssets, SceneAssets } from '../../assets/loader.js'
import type { IndexedImage } from '../../assets/png.js'
import type { BattleBgAsset } from '../../present/battle/draw-battle-bg.js'
import type { SpriteAsset } from '../../present/battle/draw-battle-sprites.js'

export function legalPalette(): Palette {
  const colors: [number, number, number][] = []
  for (let index = 0; index < 256; index++) colors.push([index, 20, 40])
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

/** 屏障端口的完整 LoadedAssets。words[0] 只区分引用，测试不把它当加载结果。 */
export function legalLoadedAssets(label: string): LoadedAssets {
  const tileImages = new Map<number, IndexedImage>()
  const characterSprites = new Map<
    number,
    { frames: IndexedImage[]; anchorX: number; anchorY: number }
  >()
  return {
    tilemap: legalTilemap(),
    palette: legalPalette(),
    scene: { sceneId: 1, mapNum: 1, eventObjects: [legalEventObject(1, 4)] },
    events: { segments: [] } satisfies EventFile,
    playerRoles: { roles: [] },
    tileImages,
    characterSprites,
    battleSprites: new Map<string, SpriteAsset>(),
    battleBgs: new Map<number, BattleBgAsset>(),
    magicSprites: new Map<number, SpriteAsset>(),
    enemies: [] as Enemy[],
    enemyObjects: [] as EnemyObject[],
    enemyTeams: [] as EnemyTeam[],
    battleFields: [] as BattleField[],
    enemyPos: { layouts: [] },
    battleEffectIndex: [],
    items: [] as Item[],
    spells: [] as Spell[],
    magics: [] as Magic[],
    objectMagics: [] as ObjectMagicView[],
    objectPoisons: [] as ObjectPoisonView[],
    objectPlayers: [] as ObjectPlayerView[],
    stores: [] as Store[],
    words: [label],
    uiSpriteFrames: [],
    itemIcons: new Map<number, IndexedImage>(),
    levelUpExp: [],
    levelUpMagic: [] as LevelUpMagicEntry[][],
  }
}

export function legalSceneAssets(sceneId: number, mapNum = sceneId): SceneAssets {
  return {
    sceneId,
    mapNum,
    tilemap: legalTilemap(`tileset/${mapNum}.rle`),
    palette: legalPalette(),
    eventObjects: [legalEventObject(1, 4)],
    npcSprites: new Map<number, SpriteAsset>(),
    eventCommands: [],
    labelMap: { L_enter: 0 },
    onEnterLabel: 'L_enter',
  }
}

/** 两帧 1×1 sprite-group。word0 同时是帧数和 frame0 的 word offset。 */
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

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
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
  if (!ctx) throw new Error('indexedPng: 2d context unavailable')
  const image = ctx.createImageData(width, height)
  image.data.set(rgba)
  ctx.putImageData(image, 0, 0)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value)
      else reject(new Error('indexedPng: canvas produced no blob'))
    }, 'image/png')
  })
  return new Uint8Array(await blob.arrayBuffer())
}
