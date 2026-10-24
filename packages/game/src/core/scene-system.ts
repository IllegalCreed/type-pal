/**
 * SceneSystem —— explore 模式 tick 主体(02 架构 + D6 + D14)。
 * 顺序：自动trigger/脚本/blocker推离 → 走路与镜头 → 菜单或Confirm Search。
 *
 * 当前碰撞/触发已按 SDLPal 关键路径对齐:tile bit13 菱形判定、sState>=2 NPC 阻挡、
 * 方向键 last-press priority、triggerMode 4..8 自动触发距离。
 */

import type { InputSnapshot, Tilemap } from '@type-pal/shared'
import { resolveScriptLabel, tickAutoScripts, tickChaseTimer } from './event-system.js'
import {
  type Facing,
  type GameState,
  type NpcState,
  PARTYOFFSET_X,
  PARTYOFFSET_Y,
} from './game-state.js'
import { createInGameMenu } from './menu/in-game-menu.js'
import { openOverworldShortcutMenu } from './menu/menu-driver.js'
import { openMenu } from './menu/menu-mode.js'
import { isWalkable } from './scene-collision.js'
import { requireSceneContext, type SceneContext } from './scene-context.js'
import { findSearchableNpc } from './scene-system-search.js'

export { isWalkable } from './scene-collision.js'
export { type SceneContext, setSceneContext } from './scene-context.js'
export { getCurrentMapNum, setCurrentMapNum } from './scene-identity.js'
export { type LoadSceneInput, loadScene } from './scene-loading.js'

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
  down: { dx: -X_STEP, dy: Y_STEP },
  up: { dx: X_STEP, dy: -Y_STEP },
  left: { dx: -X_STEP, dy: -Y_STEP },
  right: { dx: X_STEP, dy: Y_STEP },
}

/** held按按下顺序排列，从末尾取最后按下的方向键，忽略其它键。 */
function pickFacing(input: InputSnapshot): Facing | null {
  const held = Array.from(input.held)
  for (let i = held.length - 1; i >= 0; i--) {
    switch (held[i]) {
      case 'Up':
        return 'up'
      case 'Down':
        return 'down'
      case 'Left':
        return 'left'
      case 'Right':
        return 'right'
    }
  }
  return null
}

/**
 * sdlpal global.h:88-92 kTriggerTouchNear..Farthest = 4..8(自动触发区间)。
 *
 * trigger zone 真值(play.c::PAL_GameUpdate 的 fTrigger 段);距离判定位于
 * updateEventObjectsAndTrigger,同一遍历还负责消失计时、复活和触发朝向:
 *   if (p->sState > 0 && p->wTriggerMode >= kTriggerTouchNear) {
 *      if (abs(viewport.x + partyoffset.x - p->x) +
 *          abs(viewport.y + partyoffset.y - p->y) * 2 <
 *          (p->wTriggerMode - kTriggerTouchNear) * 32 + 16)
 *      { ... PAL_RunTriggerScript ... }
 *   }
 * 各 mode threshold:4→16 / 5→48 / 6→80 / 7→112 / 8→144。
 * **不区分** contact monster vs trigger NPC —— 同一机制,script 内 opcode 决定动作。
 * M3.5 旧版 findContactNpc 只对 mode 4 用 < 16 → 出口/远距 NPC 不触发
 * (用户报"走到地图边缘不切场景");M5.6 W1.b 修:按真值公式,每 mode 不同 threshold。
 */
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
  if (npc.nSpriteFrames !== undefined && npc.nSpriteFrames * 4 <= (npc.scriptedFrame ?? 0)) {
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
function updateEventObjectsAndTrigger(gs: GameState): void {
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
    // 附近不自动触发,速通不被强制领赏(由事件元数据声明)。仅影响距离判定,
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
    if (loadEventFromNpc(gs, npc)) {
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
      //(由事件元数据声明)。
      if (npc.autoTriggerOnce) npc.triggerMode = 0
    }
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

    let dirNum = ((npc.facing ? FACING_TO_DIR_NUM[npc.facing] : 0) + 1) % 4
    for (let i = 0; i < 4; i++) {
      const { dx, dy } = dirNumDelta(dirNum)
      const x = gs.party.x + dx
      const y = gs.party.y + dy
      if (isWalkable(ctx.tilemap, x, y, gs.npcs, 0, true)) {
        // DL24:推离落点也受 blockX/Y 下边界(play.c:218 fCheckRange=TRUE)
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
function loadEventFromNpc(gs: GameState, npc: NpcState): boolean {
  let ip: number

  // 优先 triggerResume(上次 0x01 advance / 0x02 reset 推进后的续跑位置 = sdlpal wTriggerScript
  // 被改写的等价)→ 不重播已跑过的 cutscene。否则按 triggerLabel 原点解析(全局 entry)。
  if (npc.triggerResume) {
    ip = npc.triggerResume.ip // 全局 ip
  } else {
    if (!npc.triggerLabel) return false
    // P2#5:triggerLabel(L_<globalIndex>,来自 event-objects.json)→ 全局 ip(identity)。
    // sdlpal wTriggerScript 本是单一全局 offset(events.bin unified),与此一致。
    const r = resolveScriptLabel(npc.triggerLabel)
    if (!r) {
      console.warn(
        `scene-system: triggerLabel ${npc.triggerLabel} 不在全局 labelMap(NPC id=${npc.id})`,
      )
      return false
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
    updateEventObjectsAndTrigger(gs)
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
  //    自动触发与阻挡分开判断；isWalkable只按tile和NPC的sState判断阻挡。
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
    if (isWalkable(ctx.tilemap, nx, ny, gs.npcs, 0, true)) {
      // M5:走路 fCheckRange=TRUE(scene.c:818)
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
      loadEventFromNpc(gs, npc)
    }
  }
}

/**
 * 生产主循环的整帧探索tick；内部按SDLPal顺序执行
 * `tickScenePreInput` + `tickSceneInput`。
 */
export function tickSceneSystem(
  gs: GameState,
  input: InputSnapshot,
  ctxOverride?: SceneContext,
): void {
  tickScenePreInput(gs, ctxOverride)
  if (gs.mode !== 'explore') return
  tickSceneInput(gs, input, ctxOverride)
}
