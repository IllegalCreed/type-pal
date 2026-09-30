/** Minimal extracted PAL resource input shapes; no script conversion implementation. */
export interface SourceRole {
  id: number
  _name: string
  avatar: number
  spriteNum: number
  spriteNumInBattle: number
  walkFrames: number
  level: number
  hp: number
  maxHP: number
  mp: number
  maxMP: number
  attackStrength: number
  magicStrength: number
  defense: number
  dexterity: number
  fleeRate: number
  equipment: number[]
  magic: number[]
  /** 合体技 obj-id(player-roles cooperativeMagic;0 = 无)。 */
  cooperativeMagic?: number
  /** 援护关系(player-roles rgwCoveredBy;存角色 index,0 = 李逍遥,合法)。 */
  coveredBy: number
  attackSound: number
  weaponSound: number
  criticalSound: number
  magicSound: number
  coverSound: number
  dyingSound: number
  deathSound: number
}

export interface SourceItem {
  id: number
  _name: string
  bitmap: number
  price: number
  scriptOnUse: number
  scriptOnEquip: number
  scriptOnThrow: number
  scriptDesc: number
  flags: {
    usable: boolean
    equipable: boolean
    throwable: boolean
    consuming: boolean
    applyToAll: boolean
    sellable: boolean
    equipableBy: boolean[]
  }
}

export interface SourceEventObject {
  id: number
  x: number
  y: number
  spriteNum: number
  triggerMode?: number
  sState?: number
  sLayer?: number
  nSpriteFrames?: number
  nSpriteFramesAuto?: number
  direction?: number
  autoLabel?: string
  triggerLabel?: string
}

export interface SourceScene {
  sceneId: number
  mapNum: number
  onEnterLabel?: string
  onTeleportLabel?: string
  eventObjects: SourceEventObject[]
}
