/**
 * SceneSystem —— explore 模式 tick 主体(02 架构 + D6 + D14)。
 * 职责:读 input → 走路 / 撞墙 / 转向 → 自动 trigger / blocker 推离 → Confirm Search → 切 mode。
 *
 * 当前碰撞/触发已按 SDLPal 关键路径对齐:tile bit13 菱形判定、sState>=2 NPC 阻挡、
 * 方向键 last-press priority、triggerMode 4..8 自动触发距离。
 */

import type { Command, InputSnapshot, Tilemap } from '@type-pal/shared'
import type { SceneAssetsCache } from '../assets/loader.js'
import type { CommandBus } from './command-bus.js'
import { hydrateNpcStaticDefaults, npcFromEventObject, PARTYOFFSET_X, PARTYOFFSET_Y, sliceSceneEventObjects, type Facing, type GameState, type NpcState } from './game-state.js'
import { resolveScriptLabel, runEnterScript, tickAutoScripts, tickChaseTimer } from './event-system.js'
import { createInGameMenu } from './menu/in-game-menu.js'
import { openMenu } from './menu/menu-mode.js'
import { openOverworldShortcutMenu } from './menu/menu-driver.js'
import { findSearchableNpc } from './scene-system-search.js'

export interface SceneContext {
  tilemap: Tilemap
  eventCommands: Command[]
  labelMap: Record<string, number>
}

let _ctx: SceneContext | null = null

export function setSceneContext(ctx: SceneContext): void {
  _ctx = ctx
}

// 当前场景所属地图号(SCENE.mapNum)。场景名按 map 而非 wNumScene 命名(同 map 的多个 scene
// 共享地名更稳),由 loadScene 写入;event-system 历史对话捕获经 getCurrentMapNum 读它。
let _currentMapNum = 0

export function getCurrentMapNum(): number {
  return _currentMapNum
}

/** opcode/正常流程/读档走 bootstrap loadSceneCommon(不经此文件 loadScene),需手动同步当前 mapNum。 */
export function setCurrentMapNum(n: number): void {
  _currentMapNum = n
}

function requireSceneContext(ctxOverride?: SceneContext): SceneContext {
  const ctx = ctxOverride ?? _ctx
  if (!ctx) throw new Error('scene-system: setSceneContext / ctxOverride 必须先设置')
  return ctx
}

/** sdlpal scene.c:807:xOffset=±16 / yOffset=±8(sdlpal pixel),每按一次方向键走半 tile。
 *  System A:OUR unit = sdlpal pixel,tile=32×16 sdlpal px。 */
const X_STEP = 16
const Y_STEP = 8
const TILE_W = 32
const TILE_H = 16
// M5:走路碰撞下边界(sdlpal scene.c:551 `blockX=PAL_X(partyoffset)/32, blockY=PAL_Y(partyoffset)/16`)。
//   partyoffset=(160,112)(res.c:301)→ blockX=5, blockY=7。队首 tile 列<5/行<7 一律阻挡,
//   保证队首恒居屏幕中心、viewport 不为负(C 不 clamp viewport,靠这条走路阻挡)。
const BLOCK_X = PARTYOFFSET_X / TILE_W // 5
const BLOCK_Y = PARTYOFFSET_Y / TILE_H // 7

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
 * sdlpal play.c:107-165(PAL_GameUpdate fTrigger 段)真值 — 自动 trigger zone 检测。
 *
 *   if (p->sState > 0 && p->wTriggerMode >= kTriggerTouchNear) {
 *      if (abs(viewport.x + partyoffset.x - p->x) +
 *          abs(viewport.y + partyoffset.y - p->y) * 2 <
 *          (p->wTriggerMode - kTriggerTouchNear) * 32 + 16)
 *      { ... PAL_RunTriggerScript ... }
 *   }
 *
 * sdlpal 真值 4 个常量(global.h:88-92):
 *   kTriggerTouchNear=4(threshold 16)/ Normal=5(48)/ Far=6(80)/ Farther=7(112)/ Farthest=8(144)
 *
 * **不区分** contact monster vs trigger NPC — 同一机制:wTriggerScript 跑 script,
 * script 内部用 opcode 决定动作(startBattle / loadScene / showDialog / openShop 等)。
 *
 * M3.5 旧版 findContactNpc 只对 mode 4 用 < 16(把所有 mode>=4 都按 16 处理),
 * 导致出口 / 远距离 trigger NPC(mode 5-8)走过去也不触发 → 用户报"走到地图边缘不切场景"。
 *
 * M5.6 W1.b 修:按 sdlpal 真值距离公式,每 mode 不同 threshold。
 */
function findTriggerZoneNpc(
  npcs: NpcState[],
  x: number,
  y: number,
): NpcState | undefined {
  for (const n of npcs) {
    if (n.triggerMode === undefined || n.triggerMode < TRIGGER_MODE_AUTO_MIN) continue
    // sdlpal global.h:77 EventObject.sState <=0 (Hidden / Vanishing) 不参与 trigger;
    // NpcState.sState 可能 undefined(老 dump 数据);视 undefined 为 1(Normal)。
    if ((n.sState ?? 1) <= 0) continue
    // sdlpal play.c:113-115 真值距离公式
    const threshold = (n.triggerMode - TRIGGER_MODE_AUTO_MIN) * 32 + 16
    if (Math.abs(n.x - x) + Math.abs(n.y - y) * 2 < threshold) return n
  }
  return undefined
}

/** sdlpal global.h:88-92 kTriggerTouchNear..Farthest = 4..8(自动触发区间)。 */
const TRIGGER_MODE_AUTO_MIN = 4

// sdlpal palcommon.h:kDirSouth=0, kDirWest=1, kDirNorth=2, kDirEast=3
const DIR_NUM_TO_FACING: Record<number, Facing> = { 0: 'down', 1: 'left', 2: 'up', 3: 'right' }
const FACING_TO_DIR_NUM: Record<Facing, number> = { down: 0, left: 1, up: 2, right: 3 }

function dirNumDelta(dirNum: number): { dx: number; dy: number } {
  return DIR_DELTA[DIR_NUM_TO_FACING[dirNum % 4] ?? 'down']
}

/**
 * sdlpal play.c:468-490 PAL_Search 触发后的视觉效果(M5.6 T8):
 *  - NPC 转向 party 反方向(kDir = (partyDir + 2) % 4)+ scriptedFrame 0 站立
 *  - party 全员转向面对 NPC(rgParty[l].wFrame = wPartyDirection * 3 → ts:partyScriptedFrame[i])
 *  - sdlpal PAL_MakeScene + VIDEO_UpdateScreen + UTIL_Delay(50):ts 渲染下帧自动跑,delay 略
 */
function applySearchVisualEffect(gs: GameState, npc: NpcState): void {
  // sdlpal play.c:477 真值:仅 `nSpriteFrames * 4 > wCurrentFrameNum` 时调整姿势。
  // 非方向性箱子 nSpriteFrames=0,已开帧不会被再次调查重置成关闭帧。
  // undefined 是旧 fixture,保留此前会调整姿势的兼容行为。
  if (
    npc.nSpriteFrames !== undefined
    && npc.nSpriteFrames * 4 <= (npc.scriptedFrame ?? 0)
  ) {
    return
  }
  const partyDirNum = FACING_TO_DIR_NUM[gs.party.facing]
  // sdlpal play.c:483 真值:NPC 朝向 party 反方向
  npc.facing = DIR_NUM_TO_FACING[(partyDirNum + 2) % 4]
  npc.scriptedFrame = 0
  // sdlpal play.c:485-489:party 全员 wFrame = wPartyDirection * 3(面向 NPC 的站立帧)
  // ts partyScriptedFrame[i] 等价(渲染层优先级覆盖 stepFrame)
  for (let i = 0; i < gs.partyMembers.length; i++) {
    gs.partyScriptedFrame[i] = partyDirNum * 3
  }
}

const SCREEN_W = 320

/**
 * sdlpal play.c:81-166 PAL_GameUpdate fTrigger 段完整 port(M5.6 T7)。
 * 遍历 EventObjects:vanish-time / 复活 / 转向 + 触发 trigger zone。
 * 内联 trigger zone 距离 + Manhattan 公式(W1.b 的 findTriggerZoneNpc 等价但带 in-place 转向 + state 修)。
 */
function updateEventObjectsAndTrigger(gs: GameState, ctx: SceneContext): void {
  // sdlpal `viewport + partyoffset = party world pos`(viewport 是屏幕左上 world 坐标,
  // partyoffset (160,112) 是 party 在屏幕上的固定位置,相加 = party world)。
  // ts 端 gs.party.x/y 直接就是 party world,无需再算 — 但 viewport 仍单独用于 sState<0 复活检测。
  const vx = gs.camera.x
  const vy = gs.camera.y
  const partyWorldX = gs.party.x
  const partyWorldY = gs.party.y
  // DLb:本 tick 已触发过脚本 → 后续对象跳过触发判定,但 vanish 递减/复活(a/b 段)照常推进
  //   (C play.c:81-166 跑完脚本后继续扫;ts 单 cursor 无法同 tick 起第二个脚本,取副作用等价)。
  let triggered = false

  for (const npc of gs.npcs) {
    // a) sVanishTime != 0 — sdlpal play.c:87-94:暂停 trigger/autoScript 并向 0 递进。
    // present 按 scene.c 处理可见性:>0 隐藏,<0 仍可见。
    if (npc.sVanishTime !== undefined && npc.sVanishTime !== 0) {
      npc.sVanishTime += npc.sVanishTime < 0 ? 1 : -1
      continue
    }

    // b) sState < 0 + viewport 外 → 复活 — sdlpal play.c:96-106
    if ((npc.sState ?? 1) < 0) {
      // sdlpal:p->x < viewport.x || p->x > viewport.x + 320 || p->y < viewport.y || p->y > viewport.y + 320
      // (sdlpal 第二个 320 是 y 比较,可能是 typo 应该 200,但忠实复刻)
      if (npc.x < vx || npc.x > vx + SCREEN_W || npc.y < vy || npc.y > vy + SCREEN_W) {
        npc.sState = Math.abs(npc.sState ?? 0)
        npc.scriptedFrame = 0
      }
      continue
    }

    // c) sState > 0 + triggerMode >= 4 + Manhattan < threshold — sdlpal play.c:107-165
    if (triggered) continue // DLb:本 tick 已触发,余下对象只走 a/b 副作用
    const mode = npc.triggerMode ?? 0
    if ((npc.sState ?? 1) <= 0 || mode < TRIGGER_MODE_AUTO_MIN) continue
    const threshold = (mode - TRIGGER_MODE_AUTO_MIN) * 32 + 16
    // 扬州太守领赏:autoTriggerAnchorX/Y 把触发判定中心挪到书案前站立点(非太守 sprite)→ 出发点不在
    // 附近不自动触发,速通不被强制领赏(见 game-state GOVERNOR_REWARD_* 注释)。仅影响距离判定,
    // sprite 位置 / 下方朝向计算仍用 npc.x/y。
    const anchorX = npc.autoTriggerAnchorX ?? npc.x
    const anchorY = npc.autoTriggerAnchorY ?? npc.y
    const dxAbs = Math.abs(partyWorldX - anchorX)
    const dyAbs = Math.abs(partyWorldY - anchorY) * 2
    if (dxAbs + dyAbs >= threshold) continue

    // 触发:NPC 转向面对 party(sdlpal play.c:120-148 真值 — 仅 nSpriteFrames>0 时)。
    // 宝箱 / 装饰物 nSpriteFrames=0,方向无意义;不能把 wCurrentFrameNum 重置成 0,
    // 否则已打开的箱子再次调查会被画回关闭帧。
    if (npc.nSpriteFrames !== 0) {
      const xOffset = partyWorldX - npc.x
      const yOffset = partyWorldY - npc.y
      let dirNum: number
      if (xOffset > 0) {
        dirNum = yOffset > 0 ? 3 /* East */ : 2 /* North */
      } else {
        dirNum = yOffset > 0 ? 0 /* South */ : 1 /* West */
      }
      npc.facing = DIR_NUM_TO_FACING[dirNum]
      npc.scriptedFrame = 0 // sdlpal play.c:127 wCurrentFrameNum = 0(站立帧)
    }

    // 跑 trigger script + 切 event mode(sdlpal play.c:153 PAL_RunTriggerScript)
    loadEventFromNpc(gs, ctx, npc)
    if ((gs.mode as string) === 'event') {
      // DLc:真正起了脚本且 owner 有 sprite 帧 → PAL_UpdatePartyGestures(FALSE)(play.c:120-148):
      //   全队切站立帧 + 相位复位,主角不再整段 cutscene 冻在迈步帧(stepFrame 奇相位)。
      if (npc.nSpriteFrames !== 0) {
        gs.walkingFrame.walking = false
        gs.walkingFrame.stepFrame = (gs.walkingFrame.stepFrame & 2) ^ 2
      }
      // DLb:C 跑完该对象脚本后**继续扫描**余下对象(play.c:81-166 不 break,仅 fEnteringScene
      //   return)——本 tick 后续对象的 vanishTime 递减/sState<0 复活照常推进。ts 单 cursor
      //   无法同 tick 触发第二个脚本 → 记 triggered,后续对象跳过触发判定但副作用照走。
      triggered = true
      // 扬州太守领赏:autoTriggerOnce 对象触发成功即消费(triggerMode→0),否则玩家停在触发区内
      // 每帧重触发 → 刷后续段(匾额/欢迎再来)对白。引用入 allEventObjects → 持久 + 存档保留
      //(见 game-state GOVERNOR_REWARD_* 注释)。
      if (npc.autoTriggerOnce) npc.triggerMode = 0
    }
    // 解析失败 no-op(= C wTriggerScript=0 entry 0 照调)→ 继续扫后续对象,不再卡死整轮。
    continue
  }
}

/**
 * sdlpal play.c:197-228:自动脚本/trigger 更新后,若阻挡物压到 party anchor,
 * 原版会沿 NPC 朝向的下一方向起试 4 个方向,把 viewport 推离一格。
 *
 * 这不是玩家主动走路,不更新 trail / walkingFrame;TS 端 party world 与 viewport 分开存,
 * 因此同时移动 gs.party 与 gs.camera,保持 `camera = party - partyoffset` 语义。
 */
function pushPartyAwayFromBlockingNpcs(gs: GameState, ctx: SceneContext): void {
  for (const npc of gs.npcs) {
    if ((npc.sState ?? 1) < 2) continue
    if (npc.spriteNum === 0) continue
    if (Math.abs(npc.x - gs.party.x) + Math.abs(npc.y - gs.party.y) * 2 > 12) continue

    let dirNum = (((npc.facing ? FACING_TO_DIR_NUM[npc.facing] : 0) + 1) % 4)
    for (let i = 0; i < 4; i++) {
      const { dx, dy } = dirNumDelta(dirNum)
      const x = gs.party.x + dx
      const y = gs.party.y + dy
      if (isWalkable(ctx.tilemap, x, y, gs.npcs, 0, true)) { // DL24:推离落点也受 blockX/Y 下边界(play.c:218 fCheckRange=TRUE)
        gs.party.x = x
        gs.party.y = y
        gs.camera = { x: x - PARTYOFFSET_X, y: y - PARTYOFFSET_Y }
        break
      }
      dirNum = (dirNum + 1) % 4
    }
  }
}

/**
 * 用 NPC 的 triggerLabel 装载 eventCursor + 切到 event 模式。
 * Confirm-search 路径 / contact 明雷路径共享。
 */
function loadEventFromNpc(gs: GameState, ctx: SceneContext, npc: NpcState): void {
  void ctx // P2#5:不再用 per-scene 切片解析 trigger — 全部走单一全局数组(全局 ip)。
  let ip: number

  // 优先 triggerResume(上次 0x01 advance / 0x02 reset 推进后的续跑位置 = sdlpal wTriggerScript
  // 被改写的等价)→ 不重播已跑过的 cutscene。否则按 triggerLabel 原点解析(全局 entry)。
  if (npc.triggerResume) {
    ip = npc.triggerResume.ip // 全局 ip
  }
  else {
    if (!npc.triggerLabel) return
    // P2#5:triggerLabel(L_<globalIndex>,来自 event-objects.json)→ 全局 ip(identity)。
    // sdlpal wTriggerScript 本是单一全局 offset(events.bin unified),与此一致。
    const r = resolveScriptLabel(gs, npc.triggerLabel)
    if (!r) {
      console.warn(
        `scene-system: triggerLabel ${npc.triggerLabel} 不在全局 labelMap(NPC id=${npc.id})`,
      )
      return
    }
    ip = r.ip
  }

  // sdlpal PAL_RunTriggerScript 入口设 g_fScriptSuccess=TRUE(script.c:3187)— 每段 trigger 脚本起手重置。
  gs.fScriptSuccess = true
  gs.eventCursor = {
    ip, // P2#5:全局 ip,默认读全局数组(不内嵌 commands/labelMap)
    // 单测可在 triggerResume 上带 override 数组;生产恒 undefined → 默认全局。
    commands: npc.triggerResume?.commands,
    labelMap: npc.triggerResume?.labelMap,
    // Sync.2 fix3:trigger 触发时设 currentEventObjectId(= NPC id),让 opcode 0x0013/0x0016/0x006C
    // 在 operand[0]==0 时作用于"自己"(sdlpal `wEventObjectID` / `pCurrent` 等价)。
    currentEventObjectId: npc.id,
    // 'end' 据此持久化 trigger 推进(0x01 advance / 0x02 reset → triggerResume)。
    triggerOwnerId: npc.id,
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
  /**
   * M5:sdlpal `fCheckRange`(scene.c:818 PAL_UpdateParty 走路 / 712-713 follower 避障传 TRUE;
   * scene.c:512 PAL_CheckObstacle 怪物追击默认 FALSE)。TRUE 时加 blockX/blockY 下边界。
   */
  fCheckRange: boolean = false,
): boolean {
  // ── Step 1: 菱形四分法 → (col, row, h) ──────────────────────────────────
  // 直接 port sdlpal scene.c:556-591
  let col = Math.floor(posX / TILE_W)
  let row = Math.floor(posY / TILE_H)
  let h: 0 | 1 = 0
  const xr = posX % TILE_W   // 0..31
  const yr = posY % TILE_H   // 0..15

  // M5:fCheckRange 下边界(sdlpal scene.c:563-567)—— 用菱形调整**前**的 col/row(C 在 569+ 菱形之前
  //   就 `if(x<blockX||y<blockY) return TRUE`)。队首走不进左上 5 列 / 上 7 行边缘带,镜头恒居中。
  if (fCheckRange && (col < BLOCK_X || row < BLOCK_Y)) return false

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

  // ── Step 3: NPC 菱形曼哈顿距离 (sdlpal scene.c:619-628) ────────────────
  // sdlpal 真值:**只有 sState >= kObjStateBlocker(2)才阻挡**,无任何 triggerMode 条件;
  //   sState=0 (Hidden):不渲染不阻挡
  //   sState=1 (Normal):渲染但**不阻挡**(地板/桌椅等装饰 sprite event object)
  //   sState>=2 (Blocker):渲染且阻挡(墙、家具阻挡部分、挡路门卫)
  // DH5:旧码豁免 triggerMode>=4 的对象("contact 怪不挡路"的误解)→ 744 个 sState>=2 且
  //   mode 5-8 的门卫/守卫可被穿行(sequence break)。数据实测 mode==4 明雷怪全部 sState<=1,
  //   本就不过 blocker 关 —— 该豁免对踩怪触发完全多余,删除不影响触发战斗。
  for (const npc of npcs) {
    if (npc.id === selfNpcId) continue
    if ((npc.sState ?? 1) < 2) continue
    if (Math.abs(npc.x - posX) + Math.abs(npc.y - posY) * 2 < 16) return false
  }

  return true
}

function syncCameraToParty(gs: GameState, tilemap: Tilemap): void {
  const maxX = (tilemap.width - 1) * TILE_W
  const maxY = (tilemap.height - 1) * TILE_H
  gs.camera = {
    x: Math.max(0, Math.min(maxX, gs.party.x - PARTYOFFSET_X)),
    y: Math.max(0, Math.min(maxY, gs.party.y - PARTYOFFSET_Y)),
  }
}

/**
 * 探索帧前段:对应 sdlpal `PAL_GameUpdate(TRUE)` 里 fTrigger / blocker-push 部分。
 *
 * 原版 `PAL_StartFrame` 顺序是:
 *   PAL_GameUpdate(TRUE) → PAL_UpdateParty() → PAL_MakeScene() → 菜单/Search 键
 * 因此自动触发区检测发生在玩家本帧移动之前;走进触发区后下一帧才触发。
 */
export function tickScenePreInput(gs: GameState, ctxOverride?: SceneContext): void {
  const ctx = requireSceneContext(ctxOverride)
  if (gs.sceneLoading || gs.paletteFadeState) return

  // 脚本结束切回 explore 的首帧跳过触发扫描:sdlpal PAL_RunTriggerScript 同步阻塞返回后,
  // 同帧 PAL_StartFrame 仍跑 PAL_UpdateParty(play.c:534→543)→ 玩家必得一次移动才被重新扫描。
  // 不跳则 TouchFar NPC 半径内玩家永无移动机会 → 死锁(李大娘"别怠慢了客人",game-state.ts 字段注释)。
  if (gs.suppressAutoTriggerOnce) {
    gs.suppressAutoTriggerOnce = false
  } else {
    updateEventObjectsAndTrigger(gs, ctx)
    if (gs.mode !== 'explore') return
  }

  // sdlpal play.c:169-192:自动脚本循环在 fTrigger 段之后、blocker push 之前。
  tickAutoScripts(gs)
  if (gs.mode !== 'explore' || gs.sceneLoading) return

  pushPartyAwayFromBlockingNpcs(gs, ctx)

  // sdlpal play.c:235-238:PAL_GameUpdate 末尾追逐 timer 自减。
  tickChaseTimer(gs)
}

export function tickSceneInput(
  gs: GameState,
  input: InputSnapshot,
  bus: CommandBus,
  ctxOverride?: SceneContext,
): void {
  const ctx = requireSceneContext(ctxOverride)

  // P2#7/loadScene-defer:scene 切换/加载期间(present 保留旧帧)冻结探索 — 不走移动/转向/触发,
  // 避免 loadScene 续跑脚本 'end' 后、异步 reload 完成前的几帧里玩家移动或旧 scene trigger 误触发。
  if (gs.sceneLoading) return

  // 特效 A:explore 模式 palette fade 进行中(scene.c:503 auto fade-in)冻结探索 —— 忠实 sdlpal
  // PAL_FadeIn 阻塞循环,淡入 600ms 内玩家不能移动 / 触发。fade 完(present 自清 paletteFadeState)恢复。
  if (gs.paletteFadeState) return

  // 1) 走路 + 转向
  //    P0.a:isWalkable 内部统一处理 tilemap obstacle bit + NPC 菱形碰撞。
  //    contact monster(triggerMode >= 4)走进触发战斗 → isWalkable 不阻挡。
  //    party 自身 selfNpcId=0(party 不是 NPC,无需排除自己)。
  const facing = pickFacing(input)
  if (facing) {
    // Sync.2 fix5:玩家首次按方向键时清剧情期间设的主角**pose**(partyScriptedFrame,0x15 写的
    // 固定姿势:捂头/倒地),让 walking stepFrame 公式接管(sdlpal PAL_UpdatePartyGestures 走路覆写 wFrame)。
    if (Object.keys(gs.partyScriptedFrame).length > 0) {
      gs.partyScriptedFrame = {}
    }
    // 注:0x65 setPlayerSprite 写的 runtime rgwSpriteNum/旧 partyLeaderSpriteId **不**在走路时清 ——
    // sdlpal rgwSpriteNum 持久到下个 0x65,走路用新 sprite 的 walk 帧(eg. 端酒菜 sprite 208
    // 边走边端,2026-05-28 user 发现走路时退回普通 sprite 的根因)。pose ≠ sprite,只清 pose。
    gs.party.facing = facing
    const { dx, dy } = DIR_DELTA[facing]
    const nx = gs.party.x + dx
    const ny = gs.party.y + dy
    if (isWalkable(ctx.tilemap, nx, ny, gs.npcs, 0, true)) { // M5:走路 fCheckRange=TRUE(scene.c:818)
      // sdlpal scene.c:823-830 PAL_UpdateParty:移动前 leader pos 插入 trail 头部,截至 5 项。
      gs.trail.unshift({ x: gs.party.x, y: gs.party.y, dir: facing })
      if (gs.trail.length > 5) gs.trail.length = 5
      gs.party.x = nx
      gs.party.y = ny
      // sdlpal scene.c:663 PAL_UpdatePartyGestures:walking 时 s_iThisStepFrame +1 mod 4
      gs.walkingFrame.walking = true
      gs.walkingFrame.stepFrame = (gs.walkingFrame.stepFrame + 1) % 4
    } else {
      // 撞墙 / NPC 阻挡:转向但不走 → walking=false。
      // L5/L30:C 此处仍走 PAL_UpdatePartyGestures(FALSE)(scene.c:847 只在真移动时才 TRUE)→
      //   站立分支复位 stepFrame &=2;^=2(scene.c:773-774,0/1→2、2/3→0),为下次起步设迈腿相位。
      gs.walkingFrame.walking = false
      gs.walkingFrame.stepFrame = (gs.walkingFrame.stepFrame & 2) ^ 2
    }
  } else {
    // 无方向键:idle → walking=false。L5/L30:同上,站立复位 stepFrame &=2;^=2(scene.c:773-774)。
    gs.walkingFrame.walking = false
    gs.walkingFrame.stepFrame = (gs.walkingFrame.stepFrame & 2) ^ 2
  }

  // 2) 相机跟随 + 边界 clamp(System A:sdlpal pixel,以 tile 边界换算)
  //    camera 语义 = sdlpal viewport(屏幕左上 world 坐标)= party - partyoffset
  syncCameraToParty(gs, ctx.tilemap)

  // 3) M5.6 W0.v:Menu 键(sdlpal input.c:66 SDLK_ESCAPE → kKeyMenu)→ 开 InGameMenu hub。
  //    sdlpal PAL_StartFrame 顺序是 PAL_UpdateParty 后再处理菜单,因此方向键+Menu 同帧会先走一步。
  if (input.pressed.has('Menu')) {
    // M5.6 T6:cursor 默认 = gs.iCurMainMenuItem(sdlpal 真值 — 上次选哪项这次默认那项)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu(gs.iCurMainMenuItem) })
    return
  }

  // 3.5) 大世界快捷键直达子菜单 —— port sdlpal play.c:558-584(else-if 链,一帧一项):
  //   E 用物品 / W 装备 / F 法术 / S 状态屏。Q(Flee→PAL_QuitGame)浏览器无退出语义,不接。
  if (input.pressed.has('UseItem')) {
    openOverworldShortcutMenu(gs, 'use-item')
    return
  }
  if (input.pressed.has('ThrowItem')) {
    openOverworldShortcutMenu(gs, 'equip')
    return
  }
  if (input.pressed.has('Force')) {
    openOverworldShortcutMenu(gs, 'magic')
    return
  }
  if (input.pressed.has('Status')) {
    openOverworldShortcutMenu(gs, 'status')
    return
  }

  // 4) Confirm 触发 Search(M5.6 W1.c + T8 完整真值:play.c:423-510)
  //    - 13 cell range + triggerMode 1-3 + grid match(W1.c)
  //    - 触发命中后:NPC 转向 party 反方向 + 站立帧;party 全员转向面对 NPC(T8)
  //    - sdlpal UTIL_Delay(50) + PAL_ClearKeyState:ts 不阻塞,delay 略;input 每 tick 新无需 clear
  if (gs.mode === 'explore' && input.pressed.has('Confirm')) {
    const npc = findSearchableNpc(gs.npcs, gs.party.facing, gs.party.x, gs.party.y)
    if (npc?.triggerLabel) {
      applySearchVisualEffect(gs, npc)
      loadEventFromNpc(gs, ctx, npc)
    }
  }

  // 注:gs.frameNum++ 由 tickByMode 统一推进(所有模式都计),不在此处做。

  void bus
}

/**
 * 兼容旧单测/工具的整帧探索 tick。生产主循环调用本函数;内部按 SDLPal 顺序执行
 * `tickScenePreInput` + `tickSceneInput`。
 */
export function tickSceneSystem(
  gs: GameState,
  input: InputSnapshot,
  bus: CommandBus,
  ctxOverride?: SceneContext,
): void {
  tickScenePreInput(gs, ctxOverride)
  if (gs.mode !== 'explore') return
  tickSceneInput(gs, input, bus, ctxOverride)
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
 * 3. 跑 scene onEnter 脚本,接入 setBattlefield / music / object state 等进场副作用
 * 4. 可选 partyStart 覆写 party 起点(并把 camera 跟到 party,用于 dev shortcut / manual jump)
 *
 * sceneId 是资源 dump 下标(0-based);sdlpal `wNumScene` 是 1-based,因此写入 sceneId+1。
 * tilemap 等渲染所需资源由调用方自行从 SceneAssetsCache 取(M3.5 T16+ dev panel 串接)。
 */
export async function loadScene(input: LoadSceneInput): Promise<void> {
  const { gs, sceneId, assets, partyStart } = input
  const sceneAssets = await assets.loadScene(sceneId)
  const wNumScene = sceneId + 1

  // 传 labelMap → autoLabel 解 ip 写入 autoCursor;sceneCommands/sceneLabelMap 写 gs
  gs.wNumScene = wNumScene
  gs.sceneCommands = sceneAssets.eventCommands
  gs.sceneLabelMap = sceneAssets.labelMap
  gs.gameOverActive = false // 死亡读档 → 新场景 → 清 game-over 演出标记
  gs.deathHoldActive = false // 同清过渡帧 hold(残留会冻住新场景渲染);死亡演出退出点
  // 0x38 归隐脱出:缓存当前场景 base onTeleport 全局 entry(onTeleportLabel L_<n>→n;无则 0)。
  gs.sceneOnTeleportEntry = sceneAssets.onTeleportLabel
    ? (resolveScriptLabel(gs, sceneAssets.onTeleportLabel)?.ip ?? 0)
    : 0
  gs.npcs =
    sliceSceneEventObjects(gs, wNumScene)
    ?? sceneAssets.eventObjects.map((eo) => npcFromEventObject(eo, sceneAssets.labelMap))
  hydrateNpcStaticDefaults(gs.npcs, sceneAssets.eventObjects)

  // P3.T1: 切 scene 时同步更新 SceneContext 的 events + labelMap,
  // 修 M3.5 ⚠️ a9 #8:旧 scene 的 labelMap 留在内存导致 triggerLabel 查不到。
  setSceneContext({
    tilemap: sceneAssets.tilemap,
    eventCommands: sceneAssets.eventCommands,
    labelMap: sceneAssets.labelMap,
  })
  _currentMapNum = sceneAssets.mapNum // 场景名按 map 命名:历史对话捕获用 getCurrentMapNum 读它

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
    const ip = resolveScriptLabel(gs, sceneAssets.onEnterLabel)?.ip // P2#5:onEnterLabel = L_<global> → 全局 ip
    if (ip !== undefined) {
      runEnterScript(gs, undefined, undefined, ip) // P2#5:默认全局数组
    }
  }
  if (partyStart) {
    gs.party = {
      x: partyStart.x,
      y: partyStart.y,
      facing: partyStart.facing ?? gs.party.facing,
    }
    gs.camera = { x: partyStart.x - PARTYOFFSET_X, y: partyStart.y - PARTYOFFSET_Y }
  }
}
