/**
 * SceneSystem —— explore 模式 tick 主体(02 架构 + D6 + D14)。
 * 职责:读 input → 走路 / 撞墙 / 转向 → 检测 Confirm → 装载 NPC 事件 → 切 mode。
 *
 * M2 简化:
 *  - 碰撞:所有 cell 可走,只做地图边界 clamp。M1 schema 未单独抽出 cell.attribute 位,
 *    Task 22 dev 验证发现 NPC 能走进墙里再补属性位查询。
 *  - 方向键多按:用 DIR_PRIORITY 固定 Up>Down>Left>Right 决定(D14 妥协)。
 */

import type { Command, InputSnapshot, Tilemap } from '@type-pal/shared'
import type { SceneAssetsCache } from '../assets/loader.js'
import type { CommandBus } from './command-bus.js'
import { npcFromEventObject, type Facing, type GameState, type NpcState } from './game-state.js'

export interface SceneContext {
  tilemap: Tilemap
  eventCommands: Command[]
  labelMap: Record<string, number>
}

let _ctx: SceneContext | null = null

export function setSceneContext(ctx: SceneContext): void {
  _ctx = ctx
}

const DIR_DELTA: Record<Facing, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
}

const DIR_PRIORITY: { key: 'Up' | 'Down' | 'Left' | 'Right'; facing: Facing }[] = [
  { key: 'Up', facing: 'up' },
  { key: 'Down', facing: 'down' },
  { key: 'Left', facing: 'left' },
  { key: 'Right', facing: 'right' },
]

function pickFacing(input: InputSnapshot): Facing | null {
  for (const d of DIR_PRIORITY) {
    if (input.held.has(d.key)) return d.facing
  }
  return null
}

function npcAt(npcs: NpcState[], col: number, row: number): NpcState | undefined {
  return npcs.find((n) => n.col === col && n.row === row)
}

function isWalkable(tilemap: Tilemap, col: number, row: number): boolean {
  if (col < 0 || col >= tilemap.width || row < 0 || row >= tilemap.height) return false
  // M2 简化:全部可走。M1 没单独存 attribute 位,实施时若发现 schema 已带,
  // 改成查属性位即可。Task 22 在「实施过程发现」记录。
  return true
}

export function tickSceneSystem(
  gs: GameState,
  input: InputSnapshot,
  bus: CommandBus,
  ctxOverride?: SceneContext,
): void {
  const ctx = ctxOverride ?? _ctx
  if (!ctx) throw new Error('scene-system: setSceneContext / ctxOverride 必须先设置')

  // 1) 走路 + 转向
  const facing = pickFacing(input)
  if (facing) {
    gs.party.facing = facing
    const { dc, dr } = DIR_DELTA[facing]
    const nc = gs.party.col + dc
    const nr = gs.party.row + dr
    if (isWalkable(ctx.tilemap, nc, nr) && !npcAt(gs.npcs, nc, nr)) {
      gs.party.col = nc
      gs.party.row = nr
    }
  }

  // 2) 相机跟随 + 边界 clamp
  gs.camera = {
    col: Math.max(0, Math.min(ctx.tilemap.width - 1, gs.party.col)),
    row: Math.max(0, Math.min(ctx.tilemap.height - 1, gs.party.row)),
  }

  // 3) Confirm 触发 NPC
  if (input.pressed.has('Confirm')) {
    const { dc, dr } = DIR_DELTA[gs.party.facing]
    const targetCol = gs.party.col + dc
    const targetRow = gs.party.row + dr
    const npc = npcAt(gs.npcs, targetCol, targetRow)
    if (npc?.triggerLabel) {
      const ip = ctx.labelMap[npc.triggerLabel]
      if (ip !== undefined) {
        gs.eventCursor = {
          commands: ctx.eventCommands,
          labelMap: ctx.labelMap,
          ip,
        }
        gs.mode = 'event'
      } else {
        console.warn(`scene-system: triggerLabel ${npc.triggerLabel} 不在 labelMap 中`)
      }
    }
  }

  // 注:gs.frameNum++ 由 tickByMode 统一推进(所有模式都计),不在此处做。

  void bus
}

// ── M3.5 T9: loadScene(D33 lazy 切场景)─────────────────────────────────────

export interface LoadSceneInput {
  gs: GameState
  sceneId: number
  assets: SceneAssetsCache
  /** 可选 party 起点 —— 不传则 party 位置 / facing 都不动(facing 单字段也可选)。 */
  partyStart?: { col: number; row: number; facing?: Facing }
}

/**
 * Scene 切换(D33 lazy + D34 dev shortcut)。
 *
 * 1. SceneAssetsCache lazy fetch 新 scene 资源(同 scene 重复切不重复 fetch)
 * 2. 重置 gs.npcs(走 npcFromEventObject)
 * 3. 可选写 party 起点(并把 camera 跟到 party,避免下一帧渲染指旧坐标)
 * 4. **不**跑 onEnter(D34 dev shortcut;M5 接真剧情链时升级)
 *
 * 注:GameState 当前没单独 scene id 字段;切场景体现在 gs.npcs / party 的重置上,
 * tilemap 等渲染所需资源由调用方自行从 SceneAssetsCache 取(M3.5 T16+ dev panel 串接)。
 */
export async function loadScene(input: LoadSceneInput): Promise<void> {
  const { gs, sceneId, assets, partyStart } = input
  const sceneAssets = await assets.loadScene(sceneId)

  gs.npcs = sceneAssets.eventObjects.map(npcFromEventObject)

  if (partyStart) {
    gs.party = {
      col: partyStart.col,
      row: partyStart.row,
      facing: partyStart.facing ?? gs.party.facing,
    }
    gs.camera = { col: partyStart.col, row: partyStart.row }
  }
}
