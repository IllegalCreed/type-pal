/**
 * GameState —— 探索 / 事件 / 战斗模式下的单一真相源(02 架构 + D6)。
 * M2 覆盖 explore / event;M3 (T14) 加 battle option(tickBattle 真实现 T22)。
 */

import type { Command, DialogBoxStyle, Palette, SceneEventObject } from '@type-pal/shared'
import type { BattleState } from './battle/battle-state.js'

export type Facing = 'up' | 'down' | 'left' | 'right'

export type Mode = 'explore' | 'event' | 'battle'

/** 队伍成员的 role id(MKFNUM_PLAYERROLES),原版 max 5 在 party 中。 */
export interface InventoryEntry {
  itemId: number
  count: number
}

export interface NpcState {
  id: number
  /** 像素坐标(M5 P0.0:sdlpal scene.c:807 xOffset=±16 / yOffset=±8 等价)。 */
  x: number
  y: number
  spriteNum: number
  triggerLabel?: string
  /** sdlpal `EventObject.wTriggerMode`(M3.5 T11 真消費):
   *  - 0       装饰 / 不触发
   *  - 1..3    Confirm-search(M2 用 Confirm 键触发)
   *  - 4..8    contact 明雷(走进自动触发,M3.5 简版统一 >= 4)
   *
   * 可选:M2 旧 fixture / 测试不带此字段时,scene-system 视作 0(不触发)。
   */
  triggerMode?: number
}

export interface EventCursor {
  commands: Command[]
  labelMap: Record<string, number>
  ip: number
  /** EventSystem 暂停等待用户确认的原因;undefined = 非 waiting 状态。M2 只有 'dialog'。 */
  waiting?: 'dialog'
}

export interface DialogBoxState {
  text: string
  style: DialogBoxStyle
}

export interface GameState {
  /** 队长像素坐标(M5 P0.0:sdlpal scene.c:807 xOffset=±16 / yOffset=±8 等价)。 */
  party: { x: number; y: number; facing: Facing }
  /** 相机像素坐标;SceneSystem 每 tick 跟随 party,带地图边界 clamp。 */
  camera: { x: number; y: number }
  npcs: NpcState[]
  /** 队伍成员 role id 列表(T14 占位,M3 dev fixture 决定默认填充)。 */
  partyMembers: number[]
  /** 持有物品(T21 item action 用),数量为 0 不剔除由 add/sub 命令决定。 */
  inventory: InventoryEntry[]
  mode: Mode
  eventCursor?: EventCursor
  dialogBox?: DialogBoxState
  /** 由 setDialogStyle* 命令累积。默认 'center'。 */
  currentDialogStyle: DialogBoxStyle
  /** 战斗状态;T16 给真类型(BattleState),T14 已用 unknown 占位避免污染 explore/event。 */
  battleState?: BattleState
  frameNum: number
  /** 当前调色板;M4 P3.T2 setPalette opcode handler 写入,渲染层 flushToCanvas 消费。
   *  初始值 undefined — bootstrap 初始化后由 GameState 持有最新 palette,
   *  flushToCanvas 优先用 gs.palette(若非 undefined),否则 fallback 到 bootstrap 初始 palette。
   */
  palette?: Palette
}

export function createInitialGameState(
  partyStart: { x: number; y: number; facing: Facing },
): GameState {
  return {
    party: { x: partyStart.x, y: partyStart.y, facing: partyStart.facing },
    camera: { x: partyStart.x, y: partyStart.y },
    npcs: [],
    partyMembers: [],
    inventory: [],
    mode: 'explore',
    currentDialogStyle: 'center',
    frameNum: 0,
  }
}

/**
 * 原版 EVENTOBJECT.x / .y 是**像素坐标**(见 sdlpal map.c::PAL_MapBlitToSurface
 * 用 x/32 取 col、y/16 取 row,菱形错排,tile 32×16)。
 * M5 P0.0:运行时改用半格像素坐标(X_STEP=16 / Y_STEP=8),故:
 *   npc.x = floor(eo.x / 32) * 16 = eo.x / 2
 *   npc.y = floor(eo.y / 16) * 8  = eo.y / 2
 */
const TILE_W = 32
const TILE_H = 16
const X_STEP = 16
const Y_STEP = 8

export function npcFromEventObject(eo: SceneEventObject): NpcState {
  return {
    id: eo.id,
    x: Math.floor(eo.x / TILE_W) * X_STEP,
    y: Math.floor(eo.y / TILE_H) * Y_STEP,
    spriteNum: eo.spriteNum,
    triggerLabel: eo.triggerLabel,
    triggerMode: eo.triggerMode,
  }
}
