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

/** sdlpal scene.c:807:xOffset=±16 / yOffset=±8,每按一次方向键走半格(tile 32×16)。 */
const X_STEP = 16
const Y_STEP = 8

const DIR_DELTA: Record<Facing, { dx: number; dy: number }> = {
  down:  { dx:  X_STEP, dy:  Y_STEP },
  up:    { dx: -X_STEP, dy: -Y_STEP },
  left:  { dx: -X_STEP, dy:  Y_STEP },
  right: { dx:  X_STEP, dy: -Y_STEP },
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

function npcAt(npcs: NpcState[], x: number, y: number): NpcState | undefined {
  return npcs.find((n) => n.x === x && n.y === y)
}

/** sdlpal global.h:84-92 wTriggerMode 真值;>= 4 是 contact 系列(TouchNear..Farthest)。
 *  M3.5 简版统一处理;M5 真做距离差异时再细分。 */
const TRIGGER_MODE_CONTACT_MIN = 4

/**
 * 用 NPC 的 triggerLabel 装载 eventCursor + 切到 event 模式。
 * Confirm-search 路径 / contact 明雷路径共享。
 */
function loadEventFromNpc(gs: GameState, ctx: SceneContext, npc: NpcState): void {
  if (!npc.triggerLabel) return
  const ip = ctx.labelMap[npc.triggerLabel]
  if (ip === undefined) {
    console.warn(`scene-system: triggerLabel ${npc.triggerLabel} 不在 labelMap 中`)
    return
  }
  gs.eventCursor = {
    commands: ctx.eventCommands,
    labelMap: ctx.labelMap,
    ip,
  }
  gs.mode = 'event'
}

function isWalkable(tilemap: Tilemap, x: number, y: number): boolean {
  // 把像素坐标换算回 cell(向下取整),做地图边界检查。
  const col = Math.floor(x / X_STEP)
  const row = Math.floor(y / Y_STEP)
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
  //    M3.5:contact monster(triggerMode >= 4)**不阻挡** —— 对照 sdlpal play.c
  //    PAL_PartyWalk,接触触发是「走入怪格 → 触发战斗」,所以 walk 阶段允许进入。
  //    Confirm-search NPC(triggerMode 0..3,默认 NPC)仍阻挡。
  const facing = pickFacing(input)
  if (facing) {
    gs.party.facing = facing
    const { dx, dy } = DIR_DELTA[facing]
    const nx = gs.party.x + dx
    const ny = gs.party.y + dy
    const blockingNpc = npcAt(gs.npcs, nx, ny)
    const isContactMonster
      = blockingNpc?.triggerMode !== undefined
        && blockingNpc.triggerMode >= TRIGGER_MODE_CONTACT_MIN
    if (isWalkable(ctx.tilemap, nx, ny) && (!blockingNpc || isContactMonster)) {
      gs.party.x = nx
      gs.party.y = ny
    }
  }

  // 2) 相机跟随 + 边界 clamp(像素坐标;clamp 以 cell 边界换算)
  const maxX = (ctx.tilemap.width - 1) * X_STEP
  const maxY = (ctx.tilemap.height - 1) * Y_STEP
  gs.camera = {
    x: Math.max(0, Math.min(maxX, gs.party.x)),
    y: Math.max(0, Math.min(maxY, gs.party.y)),
  }

  // 3) 明雷 contact 检测(M3.5 T11 / D32 / 对照 sdlpal play.c::PAL_PartyWalk)
  //    party 当前像素位有 triggerMode >= 4 的 EventObject → 自动 runScript,无需 Confirm。
  //    放在 Confirm 之前:走完路立即触发,避免下一帧才生效。
  const npcAtParty = npcAt(gs.npcs, gs.party.x, gs.party.y)
  if (
    npcAtParty
    && npcAtParty.triggerMode !== undefined
    && npcAtParty.triggerMode >= TRIGGER_MODE_CONTACT_MIN
  ) {
    loadEventFromNpc(gs, ctx, npcAtParty)
  }

  // 4) Confirm 触发 NPC(M2 既有逻辑:对面格 NPC,按 Confirm)
  //    注:M3.5 简版不做 triggerMode in {1,2,3} 距离差异;有 triggerLabel 即响应 Confirm。
  if (gs.mode === 'explore' && input.pressed.has('Confirm')) {
    const { dx, dy } = DIR_DELTA[gs.party.facing]
    const targetX = gs.party.x + dx
    const targetY = gs.party.y + dy
    const npc = npcAt(gs.npcs, targetX, targetY)
    if (npc?.triggerLabel) {
      loadEventFromNpc(gs, ctx, npc)
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
  /** 可选 party 起点(像素坐标)—— 不传则 party 位置 / facing 都不动(facing 单字段也可选)。 */
  partyStart?: { x: number; y: number; facing?: Facing }
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

  // P3.T1: 切 scene 时同步更新 SceneContext 的 events + labelMap,
  // 修 M3.5 ⚠️ a9 #8:旧 scene 的 labelMap 留在内存导致 triggerLabel 查不到。
  setSceneContext({
    tilemap: sceneAssets.tilemap,
    eventCommands: sceneAssets.eventCommands,
    labelMap: sceneAssets.labelMap,
  })

  if (partyStart) {
    gs.party = {
      x: partyStart.x,
      y: partyStart.y,
      facing: partyStart.facing ?? gs.party.facing,
    }
    gs.camera = { x: partyStart.x, y: partyStart.y }
  }
}
