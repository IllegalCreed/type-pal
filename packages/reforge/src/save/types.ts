import type {
  Facing,
  GridPos,
  WorldState,
  WorldStateV5,
  WorldStateV6,
  WorldStateV7,
  WorldStateV8,
} from '@type-pal/content'

export type SlotKind = 'auto' | 'quick' | 'manual'
export type SlotId = string // 'auto' | 'quick' | 'm01'..'m28'

export const MANUAL_SLOT_COUNT = 28
export const SLOTS_PER_PAGE = 3
export const SAVE_VERSION = 7 as const

/** 全部槽 id（固定序）：自动、快速最前，其后 m01..m28（共 30，3/页 → 10 页）。 */
export const ALL_SLOT_IDS: SlotId[] = [
  'auto',
  'quick',
  ...Array.from({ length: MANUAL_SLOT_COUNT }, (_, i) => `m${String(i + 1).padStart(2, '0')}`),
]

export const TOTAL_PAGES = Math.ceil(ALL_SLOT_IDS.length / SLOTS_PER_PAGE)

export function slotKind(id: SlotId): SlotKind {
  return id === 'auto' ? 'auto' : id === 'quick' ? 'quick' : 'manual'
}

/** 显示快照（浏览界面用，不含全量状态）。 */
export interface SaveMeta {
  slotId: SlotId
  kind: SlotKind
  party: { name: string; level: number }[]
  mapName: string
  savedAt: number // Date.now() epoch ms（调用方注入）
  /** 存档次数(原版 wSavedTimes 跨槽计数器:每存 = max(全部槽)+1;旧档缺省 = 不显示)。 */
  savedTimes?: number
}

/** 全量还原状态；v3 起跟随者只允许 SpriteDef.id，v4 起战斗外观只允许 BattleSpriteDef.id。 */
export interface SavePayload {
  version: number
  /** 存档所属工程 id(读档校验:防把 A 工程存档读进 B 工程)。 */
  projectId: string
  /** 存档时的工程内容版本(与 SAVE_VERSION 分轴:SAVE_VERSION=存档格式,contentVersion=工程内容)。 */
  contentVersion: number
  world: WorldState
  position: { sceneId: string; pos: GridPos; facing: Facing }
}

export interface SavePayloadV5 extends Omit<SavePayload, 'version' | 'contentVersion' | 'world'> {
  version: 5
  contentVersion: 5
  world: WorldStateV5
}

export interface SavePayloadV6 extends Omit<SavePayload, 'version' | 'contentVersion' | 'world'> {
  version: 6
  contentVersion: 6
  world: WorldStateV6
}

/** R13-2 已发布的历史 SAVE7/content7 payload；只供 v7 byte-pin 与 v8 identity 升级。 */
export interface LegacySavePayloadV7
  extends Omit<SavePayload, 'version' | 'contentVersion' | 'world'> {
  version: 7
  contentVersion: 7
  world: WorldStateV7
}

/** 当前 envelope 仍为 SAVE7，但内容轴已升到 content8。 */
export interface SavePayloadV7 extends Omit<SavePayload, 'version' | 'contentVersion' | 'world'> {
  version: 7
  contentVersion: 8
  world: WorldStateV8
}

export type StoredSavePayload =
  | SavePayload
  | SavePayloadV5
  | SavePayloadV6
  | LegacySavePayloadV7
  | SavePayloadV7
