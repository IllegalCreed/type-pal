/** Default records for asset loading; supplied scenario overrides stay borrowed. */
import type {
  Enemy,
  LevelUpMagicEntry,
  Magic,
  ObjectPlayerView,
  Palette,
  PlayerRole,
  SceneObjects,
  Store,
} from '@type-pal/shared'
import { legalEventObject } from './asset-fixtures.js'

export function makeAssetRole(id: number, spriteNum: number): PlayerRole {
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

function legalMagic(id: number, effect: number): Magic {
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

export interface AssetLoadFailures {
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

export interface AssetLoadScenario {
  scene: SceneObjects
  roles: PlayerRole[]
  words: { flat?: string[] }
  objectPlayers: ObjectPlayerView[]
  magics: Magic[]
  fireChunks: Array<{ chunkIndex: number; frameCount: number }>
  battleSprites: Array<{ kind: 'player' | 'enemy'; id: number }>
  battleBgIds: number[]
  uiFrames: number[]
  itemIcons: number[]
  enemies: Enemy[]
  stores: Store[]
  levelUpExp: number[]
  levelUpMagic: LevelUpMagicEntry[][]
  battleEffectIndex: number[]
  eventsName: string
  enemyPos: { layouts: Array<Array<{ x: number; y: number }>> }
  extraPalettes?: Record<number, Palette>
  palette?: Palette
  fail?: AssetLoadFailures
}

export function makeAssetLoadScenario(patch: Partial<AssetLoadScenario> = {}): AssetLoadScenario {
  const scene: SceneObjects = patch.scene ?? {
    sceneId: 7,
    mapNum: 12,
    onEnterLabel: 'L_enter',
    eventObjects: [legalEventObject(1, 9)],
  }
  return {
    scene,
    roles: patch.roles ?? [makeAssetRole(0, 2), makeAssetRole(1, 0)],
    words: patch.words ?? { flat: ['甲', '乙'] },
    objectPlayers: patch.objectPlayers ?? [{ id: 36, scriptOnFriendDeath: 0, scriptOnDying: 0 }],
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
    enemies: patch.enemies ?? [
      {
        id: 41,
        idleFrames: 1,
        magicFrames: 1,
        attackFrames: 1,
        idleAnimSpeed: 1,
        actWaitFrames: 1,
        yPosOffset: 0,
        attackSound: 0,
        actionSound: 0,
        magicSound: 0,
        deathSound: 0,
        callSound: 0,
        health: 100,
        exp: 1,
        cash: 1,
        level: 1,
        magic: 0,
        magicRate: 0,
        attackEquivItem: 0,
        attackEquivItemRate: 0,
        stealItem: 0,
        stealItemCount: 0,
        attackStrength: 0,
        magicStrength: 0,
        defense: 0,
        dexterity: 0,
        fleeRate: 0,
        poisonResistance: 0,
        elemResistance: {
          wind: 0,
          thunder: 0,
          water: 0,
          fire: 0,
          earth: 0,
        },
        physicalResistance: 0,
        dualMove: 0,
        collectValue: 0,
      },
    ],
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
