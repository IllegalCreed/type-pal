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
import { runEnterScript } from './event-system.js'

export interface SceneContext {
  tilemap: Tilemap
  eventCommands: Command[]
  labelMap: Record<string, number>
}

let _ctx: SceneContext | null = null

export function setSceneContext(ctx: SceneContext): void {
  _ctx = ctx
}

/** sdlpal scene.c:807:xOffset=±16 / yOffset=±8(sdlpal pixel),每按一次方向键走半 tile。
 *  System A:OUR unit = sdlpal pixel,tile=32×16 sdlpal px。 */
const X_STEP = 16
const Y_STEP = 8
const TILE_W = 32
const TILE_H = 16

// sdlpal scene.c:804-805 真值 + palcommon.h enum(kDirSouth=0,kDirWest=1,kDirNorth=2,kDirEast=3):
//   xOffset = (West||South ? -16 : +16);  yOffset = (West||North ? -8 : +8)
// 展开:
//   Down  (South) → (-16, +8) 左下
//   Up    (North) → (+16, -8) 右上
//   Left  (West)  → (-16, -8) 左上
//   Right (East)  → (+16, +8) 右下
// 之前实现把 down/up 和 left/right 反了导致按键朝向与移动方向不一致。
const DIR_DELTA: Record<Facing, { dx: number; dy: number }> = {
  down:  { dx: -X_STEP, dy:  Y_STEP },
  up:    { dx:  X_STEP, dy: -Y_STEP },
  left:  { dx: -X_STEP, dy: -Y_STEP },
  right: { dx:  X_STEP, dy:  Y_STEP },
}

const KEY_TO_FACING: Record<'Up' | 'Down' | 'Left' | 'Right', Facing> = {
  Up: 'up', Down: 'down', Left: 'left', Right: 'right',
}
const DIR_KEY_SET = new Set<'Up' | 'Down' | 'Left' | 'Right'>(['Up', 'Down', 'Left', 'Right'])

/**
 * sdlpal input.c:180-189 PAL_GetCurrDirection:选最后按的方向键(dwKeyOrder 最大者)。
 * 我们的实现:KeyboardInputSource handleDown delete-then-add 让最新键在 held Set 末尾,
 * 反向迭代取第一个方向键。
 *
 * 之前 M2 era 用硬编码 Up>Down>Left>Right 固定优先级,不符合原版 "最后按的赢" 语义。
 */
function pickFacing(input: InputSnapshot): Facing | null {
  const held = Array.from(input.held)
  for (let i = held.length - 1; i >= 0; i--) {
    const k = held[i]
    if (k !== undefined && DIR_KEY_SET.has(k as 'Up' | 'Down' | 'Left' | 'Right')) {
      return KEY_TO_FACING[k as 'Up' | 'Down' | 'Left' | 'Right']
    }
  }
  return null
}

function npcAt(npcs: NpcState[], x: number, y: number): NpcState | undefined {
  return npcs.find((n) => n.x === x && n.y === y)
}

/**
 * sdlpal scene.c:624 真值 — 菱形 isometric Manhattan 距离 < 16 视为接触。
 *
 *   if (abs(p->x - PAL_X(pos)) + abs(p->y - PAL_Y(pos)) * 2 < 16) ...
 *
 * contact monster(triggerMode >= 4)走到 NPC 附近 1 步即触发,**不需要严格相等**。
 *
 * 之前 contact 检测用 `npcAt`(严格 ==),要求 party.x/y 等于 npc.x/y。但 party 步长
 * (±16, ±8) 的 parity 限制让从任意起点走到 NPC 精确像素 *经常* 无整数解 —
 * scene 15 草妖(NPC 207 at 1136,1304;partyStart 864,1432):dx=272 / dy=-128,
 * 解 2(a-d) = 33 无整数解 → 永远走不到精确位 → contact 永不触发。
 *
 * 改用菱形 Manhattan < 16 复刻 sdlpal 真值后,party 步进到 NPC ±1 步内即可触发。
 */
function findContactNpc(
  npcs: NpcState[],
  x: number,
  y: number,
): NpcState | undefined {
  for (const n of npcs) {
    if (n.triggerMode === undefined || n.triggerMode < TRIGGER_MODE_CONTACT_MIN) continue
    if (Math.abs(n.x - x) + Math.abs(n.y - y) * 2 < 16) return n
  }
  return undefined
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

/**
 * 读 TileCell obstacle bit。
 *
 * sdlpal map.c:298  `return (lpMap->Tiles[y][x][h] & 0x2000) >> 13;`
 * → bit 13 (0-indexed) of the u16 tile value = obstacle flag。
 * h=0 → cell.lower;h=1 → cell.upper。
 */
function tilemapIsBlocked(tilemap: Tilemap, col: number, row: number, h: 0 | 1): boolean {
  if (col < 0 || col >= tilemap.width || row < 0 || row >= tilemap.height) return true
  const cell = tilemap.cells[row]?.[col]
  if (!cell) return true
  const tileWord = h === 0 ? cell.lower : cell.upper
  // obstacle bit = bit 13 of u16 tile word (sdlpal map.c:298 `& 0x2000`)
  return (tileWord & 0x2000) !== 0
}

/**
 * 菱形 isometric 碰撞判定(P0.a,port sdlpal scene.c:512-633 PAL_CheckObstacleWithRange)。
 *
 * 1. 把像素坐标用菱形四分法映射到 (col, row, h=0/1) tile — 直接 port sdlpal scene.c:556-591。
 * 2. 查 tilemap obstacle bit(bit 13 of lower/upper u16)。
 * 3. 查 NPC 菱形曼哈顿距离(sdlpal scene.c:624:abs(dx)+abs(dy)*2 < 16)。
 *    contact 怪(triggerMode >= 4)走进触发战斗,不阻挡走路。
 *
 * @param tilemap  当前场景 tilemap
 * @param posX     目标像素 X
 * @param posY     目标像素 Y
 * @param npcs     当前场景 NPC 列表(可选,默认空数组)
 * @param selfNpcId 跳过自身(party=0,NPC 移动时传自己 id)
 */
export function isWalkable(
  tilemap: Tilemap,
  posX: number,
  posY: number,
  npcs: ReadonlyArray<NpcState> = [],
  selfNpcId: number = 0,
): boolean {
  // ── Step 1: 菱形四分法 → (col, row, h) ──────────────────────────────────
  // 直接 port sdlpal scene.c:556-591
  let col = Math.floor(posX / TILE_W)
  let row = Math.floor(posY / TILE_H)
  let h: 0 | 1 = 0
  const xr = posX % TILE_W   // 0..31
  const yr = posY % TILE_H   // 0..15

  if (xr + yr * 2 >= 16) {
    if (xr + yr * 2 >= 48) {
      col++; row++
    } else if (32 - xr + yr * 2 < 16) {
      col++
    } else if (32 - xr + yr * 2 < 48) {
      h = 1
    } else {
      row++
    }
  }

  // ── Step 2: tilemap obstacle bit (sdlpal map.c:298 bit 13) ──────────────
  if (tilemapIsBlocked(tilemap, col, row, h)) return false

  // ── Step 3: NPC 菱形曼哈顿距离 (sdlpal scene.c:624) ────────────────────
  // contact 怪(triggerMode >= 4)走进触发战斗 —— 不阻挡走路。
  // 普通 NPC(triggerMode 0..3 或 undefined)阻挡。
  for (const npc of npcs) {
    if (npc.id === selfNpcId) continue
    if (npc.triggerMode !== undefined && npc.triggerMode >= TRIGGER_MODE_CONTACT_MIN) continue
    if (Math.abs(npc.x - posX) + Math.abs(npc.y - posY) * 2 < 16) return false
  }

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
  //    P0.a:isWalkable 内部统一处理 tilemap obstacle bit + NPC 菱形碰撞。
  //    contact monster(triggerMode >= 4)走进触发战斗 → isWalkable 不阻挡。
  //    party 自身 selfNpcId=0(party 不是 NPC,无需排除自己)。
  const facing = pickFacing(input)
  if (facing) {
    gs.party.facing = facing
    const { dx, dy } = DIR_DELTA[facing]
    const nx = gs.party.x + dx
    const ny = gs.party.y + dy
    if (isWalkable(ctx.tilemap, nx, ny, gs.npcs, 0)) {
      gs.party.x = nx
      gs.party.y = ny
      // sdlpal scene.c:663 PAL_UpdatePartyGestures:walking 时 s_iThisStepFrame +1 mod 4
      gs.walkingFrame.walking = true
      gs.walkingFrame.stepFrame = (gs.walkingFrame.stepFrame + 1) % 4
    } else {
      // 撞墙 / NPC 阻挡:转向但不走 → walking=false
      gs.walkingFrame.walking = false
    }
  } else {
    // 无方向键:idle → walking=false
    gs.walkingFrame.walking = false
  }

  // 2) 相机跟随 + 边界 clamp(System A:sdlpal pixel,以 tile 边界换算)
  const maxX = (ctx.tilemap.width - 1) * TILE_W
  const maxY = (ctx.tilemap.height - 1) * TILE_H
  gs.camera = {
    x: Math.max(0, Math.min(maxX, gs.party.x)),
    y: Math.max(0, Math.min(maxY, gs.party.y)),
  }

  // 3) 明雷 contact 检测(对照 sdlpal scene.c:624 — 菱形 Manhattan < 16)
  //    party 跟 triggerMode >= 4 的 EventObject 菱形距离 < 16 → 自动 runScript,无需 Confirm。
  //    放在 Confirm 之前:走完路立即触发,避免下一帧才生效。
  //    用 findContactNpc(菱形 Manhattan)取代旧 npcAt(严格 ==)— 修步长 parity 不能精准走到 NPC 的 bug。
  const contactNpc = findContactNpc(gs.npcs, gs.party.x, gs.party.y)
  if (contactNpc) {
    loadEventFromNpc(gs, ctx, contactNpc)
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

  // P0.e: party 起点 + enter script 副作用顺序:
  //   1. 先跑 wScriptOnEnter(若有)— 设 wNumBattleField / wNumMusic / setSceneObjectState 等
  //      非位置类副作用(opcode 0x4A / 0x43 等)
  //   2. 若调用方传 partyStart(dev panel manual override),其后覆写 party.x/y/facing + camera
  //      — 这让 enter script 的 setBattlefield 真生效,即便 dev fallback partyStart 也不丢
  //   3. 无 partyStart + 无 onEnterLabel → party 留在原坐标(不报错)
  //
  // 注:之前版本 partyStart 短路 enter script,导致 scene-jumps.json dev fallback partyStart
  // 直跳的 scene 永远不跑 setBattlefield → 战斗背景永远 default。本 fix 让两者并存:
  // enter script 跑全(含 setPartyPos),partyStart 之后覆写位置。
  if (sceneAssets.onEnterLabel) {
    const ip = sceneAssets.labelMap[sceneAssets.onEnterLabel]
    if (ip !== undefined) {
      runEnterScript(gs, sceneAssets.eventCommands, sceneAssets.labelMap, ip)
    }
  }
  if (partyStart) {
    gs.party = {
      x: partyStart.x,
      y: partyStart.y,
      facing: partyStart.facing ?? gs.party.facing,
    }
    gs.camera = { x: partyStart.x, y: partyStart.y }
  }
}
