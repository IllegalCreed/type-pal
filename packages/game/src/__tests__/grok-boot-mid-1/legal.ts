/**
 * 本波专属合法输入。屏障测试只比较引用；场景缓存与对话图标走完整公开类型。
 * 不从原 400 legal-host 导入。
 */
import type { EventFile, Palette, SceneEventObject, Tilemap } from '@type-pal/shared'
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

/** 屏障端口输入，满足 loadAll 的 role0/首段前提；words[0] 只区分引用，不代表跑过完整 bootstrap。 */
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
    events: {
      scene: 1,
      segments: [{ name: 'scene-001.onEnter', commands: [] }],
    } satisfies EventFile,
    playerRoles: {
      roles: [
        {
          id: 0,
          avatar: 1,
          spriteNumInBattle: 1,
          spriteNum: 2,
          name: 36,
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
          attackSound: -1,
          weaponSound: -1,
          criticalSound: -1,
          magicSound: -1,
          deathSound: -1,
          equipment: [0, 0, 0, 0, 0, 0],
          magic: [],
        },
      ],
    },
    tileImages,
    characterSprites,
    battleSprites: new Map<string, SpriteAsset>(),
    battleBgs: new Map<number, BattleBgAsset>(),
    magicSprites: new Map<number, SpriteAsset>(),
    enemies: [],
    enemyObjects: [],
    enemyTeams: [],
    battleFields: [],
    enemyPos: { layouts: [] },
    battleEffectIndex: [],
    items: [],
    spells: [],
    magics: [],
    objectMagics: [],
    objectPoisons: [],
    objectPlayers: [],
    stores: [],
    words: [label],
    uiSpriteFrames: [],
    itemIcons: new Map<number, IndexedImage>(),
    levelUpExp: [],
    levelUpMagic: [],
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
