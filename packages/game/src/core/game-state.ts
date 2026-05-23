/**
 * GameState —— 探索 / 事件模式下的单一真相源(02 架构 + D6)。
 * M2 只覆盖 explore / event 两态:战斗 / 菜单 / 转场留给 M3+。
 */

import type { Command, DialogBoxStyle, SceneEventObject } from '@type-pal/shared'

export type Facing = 'up' | 'down' | 'left' | 'right'

export type Mode = 'explore' | 'event'

export interface NpcState {
  id: number
  col: number
  row: number
  spriteNum: number
  triggerLabel?: string
}

export interface EventCursor {
  commands: Command[]
  labelMap: Record<string, number>
  ip: number
  waiting?: 'dialog'
}

export interface DialogBoxState {
  text: string
  style: DialogBoxStyle
}

export interface GameState {
  party: { col: number; row: number; facing: Facing }
  camera: { col: number; row: number }
  npcs: NpcState[]
  mode: Mode
  eventCursor?: EventCursor
  dialogBox?: DialogBoxState
  /** 由 setDialogStyle* 命令累积。默认 'center'。 */
  currentDialogStyle: DialogBoxStyle
  frameNum: number
}

export function createInitialGameState(
  partyStart: { col: number; row: number; facing: Facing },
): GameState {
  return {
    party: partyStart,
    camera: { col: partyStart.col, row: partyStart.row },
    npcs: [],
    mode: 'explore',
    currentDialogStyle: 'center',
    frameNum: 0,
  }
}

export function npcFromEventObject(eo: SceneEventObject): NpcState {
  return {
    id: eo.id,
    col: eo.x,
    row: eo.y,
    spriteNum: eo.spriteNum,
    triggerLabel: eo.triggerLabel,
  }
}
