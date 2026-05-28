/**
 * EventSystem —— event 模式协程式步进器(02 架构 + D15 + 05)。
 * M2 范围:
 *  - loop-until-waitable:单 tick 内连跑非阻塞命令,撞 waitable / end / 越界才返回
 *  - showDialog:设 gs.dialogBox + 进入 waiting='dialog',emit showDialogBox
 *  - waiting=dialog 期间,按下 Confirm 释放、清 dialogBox、ip++ 继续步进
 *  - setDialogStyle*:累积到 gs.currentDialogStyle(供下一条 showDialog 用)
 *  - end:清 eventCursor / dialogBox,mode 切回 explore
 *  - goto:查 labelMap 跳转(目标不存在抛错)
 *  - raw:console.debug 跳过,ip++(M2 兜底:还没具名化的 opcode 不阻塞游戏)
 *  - giveItem / startBattle:M3+ 实现,M2 暂当 skip
 *  - sequence / if / choice:结构化 op,M2 不实现(抛错明示)
 *
 * SINGLE_TICK_LIMIT 兜底死循环(例如 goto 自指 / 死循环 raw 链)。
 *
 * M3 T17 扩展:
 *  - 加 runtimeMode = 'explore' | 'battle' 区分,以及 battleCtx 注入
 *    (caster / target / BattleState 引用)。**M2 explore/event 行为零变**
 *    (默认 runtimeMode = 'explore' 走原 tickEventSystem 路径)。
 *  - 新 runScript(opts) 函数 —— **同步**跑一段命令(scriptOnUse 用),
 *    不用 GameState.eventCursor,不写 GameState.mode / scene / party
 *    (只能改 battleCtx.state 或 emit 命令)。
 *  - 战斗 opcode 具名延 T20/T21:本 task 只搭基础设施,具体 handler
 *    等真撞到 raw + console.debug 看到 opcode 号再补。
 */

import type { Command, InputSnapshot, Palette } from '@type-pal/shared'
import { FPS_EXPLORE } from '@type-pal/shared'
import type { BattleState } from './battle/battle-state.js'
import type { CommandBus } from './command-bus.js'
import type { GameState, NpcState } from './game-state.js'
import { PARTYOFFSET_X, PARTYOFFSET_Y } from './game-state.js'
import { dispatchBattleOpcode } from './battle/battle-opcodes.js'
import { removeEquipmentEffect, writeEquipmentEffectField } from './equip-effect.js'
import {
  startDialogLine,
  appendDialogLine,
  shouldWaitPageKey,
  setWaitingPageKey,
  setWaitingEndKey,
  tickDialog,
  confirmDialog,
  stripDialogControlCodes,
} from '../present/dialog-box.js'

// ── P0.e: wScriptOnEnter / 战斗触发 opcode 真值(grep sdlpal reference/sdlpal/script.c) ──
// case 0x0007(7):   Start battle
//   operand[0]=enemyTeamId
//   operand[1]=wScriptEntry on Lose(0 = default game-over)
//   operand[2]=wScriptEntry on Flee(also: !operand[2] → fIsBoss / no-flee 标志)
export const OP_START_BATTLE = 0x0007           // 7
// case 0x0046(70):  Set the party position on the map
//   operand[0]=col, operand[1]=row, operand[2]=h → x=col*32+h*16, y=row*16+h*8
export const OP_SET_PARTY_POS = 0x0046          // 70
// case 0x0015(21):  Set the direction and gesture for a party member (sdlpal script.c:732-739)
//   operand[0] = wPartyDirection(0=South/down, 1=West/left, 2=North/up, 3=East/right)
//   operand[1] = wFrame offset(0/1/2 — 加到 dir*3 上)
//   operand[2] = party member index(M5 简版 = 0 主角)
// **fix3:** 之前只读 operand[0]/dir;真值还要写 partyScriptedFrame[op[2]] = dir*3 + op[1]
export const OP_SET_PARTY_DIRECTION = 0x0015    // 21(实际 setPartyDirectionAndFrame)
// case 0x007F(127): Move the viewport(set camera)
//   operand[2]=0xFFFF → absolute set(col, row → pixel); operand[0..1]=0 → center on party
export const OP_SET_CAMERA = 0x007F             // 127
// same opcode — centerCameraOnParty is 0x007F with operand[0]=0, operand[1]=0
export const OP_CENTER_CAMERA_ON_PARTY = 0x007F // 127 (operand[0]=0, operand[1]=0 変体)
// case 0x0043(67):  Set background music
//   operand[0]=musicId → gs.wNumMusic (M6 接真播,先记字段)
export const OP_PLAY_MUSIC = 0x0043             // 67
// case 0x0049(73):  Set state of current event object
//   operand[0]=condition(non-zero → execute), operand[1]=newState
export const OP_SET_SCENE_OBJECT_STATE = 0x0049 // 73
// case 0x001E(30):  Increase or decrease cash(sdlpal script.c:952-968)
//   operand[0] = signed amount;若 < 0 且 dwCash 不够 → 跳 operand[1] label。
//   我们简版:cash 不够时也加(让 negative)+ 不跳 — 注释标注但不做 goto fallback
//   (chest 用 add positive 主要 case;dec 多在 buy 用走 menu 路径)。
export const OP_ADD_CASH = 0x001E               // 30
// case 0x001F(31):  Add item to inventory(sdlpal script.c:970-975)
//   operand[0] = itemId, operand[1] = qty(signed,负值 = remove)。
export const OP_ADD_ITEM = 0x001F               // 31
// case 0x0020(32):  Remove item from inventory(sdlpal script.c:977-...)
//   operand[0] = itemId, operand[1] = qty(0 → 1), operand[2] = consumeEquipped flag。
//   简版:只从 inventory remove;equipment 不消费(M5 装备表未真做)。
export const OP_REMOVE_ITEM = 0x0020            // 32
// case 0x0047(71):  Play sound effect(sdlpal script.c:1704-1709)
//   operand[0] = soundId。M6 接音频 — 简版 console.debug 不报错。
export const OP_PLAY_SOUND = 0x0047             // 71
// case 0x0012(18):  Set position of event object relative to party(script.c:706-714)
//   pCurrent.x = operand[1] + viewport.x + partyoffset.x = operand[1] + party.x(world)
//   pCurrent.y = operand[2] + viewport.y + partyoffset.y = operand[2] + party.y
//   (我们 gs.party.x/y 直接是 world,viewport+partyoffset 等价于 party world)
export const OP_SET_OBJECT_POS_REL_PARTY = 0x0012  // 18
// case 0x0024(36):  Set autoscript entry for event object(script.c:相关)
//   if (operand[0] != 0) pCurrent.wAutoScript = operand[1]
//   operand[1] 是 raw commands index ip — 我们 npc.autoCursor.ip 同义。
export const OP_SET_AUTO_SCRIPT = 0x0024        // 36
// case 0x0035(53):  Shake screen(script.c:相关)
//   operand[0] = duration(frames),operand[1] = intensity(0 默认 4 像素)
//   M5 简版:存 gs.screenShakeFrames,present 层 viewport ±intensity 抖(M5 不渲染 — 留 follow-up)。
//   功能 stub 即可,不挡 cutscene 流。
export const OP_SHAKE_SCREEN = 0x0035           // 53
// case 0x0026(38): Buy menu(sdlpal script.c:1157)— PAL_BuyMenu(operand[0]=shop id)
//   显示购买菜单,operand[0] 是 shop OBJECT id;阻塞等用户选完。
// M-w3.a 简版:event-system stub console.debug + ip++(真做接 dev panel BuyMenu)。
export const OP_BUY_MENU = 0x0026                // 38
// case 0x0027(39): Sell menu(script.c:1166)— PAL_SellMenu(),无 operand。
export const OP_SELL_MENU = 0x0027               // 39
// case 0x000B-0x000E (11-14): NPC walk one step + 自动设方向(script.c:652-661)
//   dir = wOperation - 0x000B(0=S, 1=W, 2=N, 3=E,palcommon.h kDir*)
//   走一步 = 像素位移按方向(scene.c:804-805:S→(-16,+8) W→(-16,-8) N→(+16,-8) E→(+16,+8))
export const OP_NPC_WALK_ONE_STEP_SOUTH = 0x000B  // 11
export const OP_NPC_WALK_ONE_STEP_WEST  = 0x000C  // 12
export const OP_NPC_WALK_ONE_STEP_NORTH = 0x000D  // 13
export const OP_NPC_WALK_ONE_STEP_EAST  = 0x000E  // 14
// case 0x004A(74):  Set the current battlefield
//   operand[0] = battlefield id → gs.wNumBattleField(sdlpal script.c:1719,global.h:536)
//   scene 15 wScriptOnEnter `[10, 0, 0]` → 草妖通道用 battlefield 10
export const OP_SET_BATTLE_FIELD = 0x004A       // 74

// ── Sync.2 fix3: 5 个 cutscene opcode(scene 1 onEnter 高频用)─────────────
// case 0x0005(5):   Redraw screen / PAL_ClearDialog(TRUE) — sdlpal script.c:3267-3297
//   触发 dialog 等键 + 清屏(让后续 NPC 动作 / 场景重画显示)。
//   有 dialog → 等 Confirm 翻页(走 pendingStyle = undefined 路径,纯 clear 不切 style)
//   无 dialog → 直接 ip++(no-op)
// 注:operand[1] = delay 倍数 60(UTIL_Delay),operand[2] != 0 → PAL_UpdatePartyGestures(FALSE)
//     M5 简版:delay / gesture update 暂不实现(playback 节奏由 typing + frame-wait 覆盖)
export const OP_REDRAW_SCREEN = 0x0005          // 5
// case 0x0009(9):   Wait for N frames(sdlpal script.c:3593-3604)
//   operand[0] = frame count;cursor 卡 N frame 再 ip++
export const OP_WAIT_FRAMES = 0x0009            // 9
// case 0x0013(19):  Set the position of the event object(script.c:716-722)
//   self.x = operand[1], self.y = operand[2](operand[0] unused;always pCurrent / wCurEventObjectID)
export const OP_SET_OBJECT_POS = 0x0013         // 19
// case 0x0014(20):  Set the gesture of the event object(script.c:724-730)
//   pCurrent.wCurrentFrameNum = operand[0]; pCurrent.wDirection = kDirSouth(强制朝南)
// 这是 pose opcode 核心 — 设 NPC 当前帧 + 朝南。
export const OP_SET_OBJECT_GESTURE = 0x0014     // 20
// case 0x0016(22):  Set direction AND gesture for an event object(script.c:741-750)
//   operand[0] != 0 → pCurrent.wDirection = operand[1], pCurrent.wCurrentFrameNum = operand[2]
//   operand[0] == 0 → no-op
// **fix3 真值修:** 之前误把 operand[1]=dir + 漏 operand[2]=frame;真值如上。
export const OP_SET_EVENT_OBJECT_DIR_AND_FRAME = 0x0016  // 22
/** @deprecated 改名 → OP_SET_EVENT_OBJECT_DIR_AND_FRAME */
export const OP_SET_EVENT_OBJECT_DIR = OP_SET_EVENT_OBJECT_DIR_AND_FRAME
// case 0x000F(15):  Set direction and/or gesture for event object (sdlpal script.c:663-675)
//   operand[0] != 0xFFFF → pEvtObj.wDirection = operand[0]
//   operand[1] != 0xFFFF → pEvtObj.wCurrentFrameNum = operand[1]
// 注:**与 0x000E walkOneStep 是兩個独立 opcode** — 0x000F 不真 walk,只是 dir/frame setter。
export const OP_SET_EVENT_OBJECT_DIR_OR_FRAME = 0x000F  // 15
// case 0x0010(16): Walk straight to position(sdlpal script.c:677-686)
//   PAL_NPCWalkTo(wEventObjectID, op0, op1, op2, speed=3)
//   未到达时 sdlpal `wScriptEntry--` → 下一帧 retry 同条 ip → 阻塞 trigger script 到达目标。
//   trigger 触发的 wEventObjectID = currentEventObjectId(我们 npc.id 0-based)。
//   target 像素 = (op0 * 32 + op2 * 16, op1 * 16 + op2 * 8) — col/row/h 转 pixel(sdlpal map.h)
export const OP_NPC_WALK_TO_SPEED_3 = 0x0010    // 16
// case 0x0011(17): NPCWalkTo,speed=2,每隔帧才走(sdlpal script.c:688-704)
//   `if ((wEventObjectID & 1) ^ (dwFrameNum & 1))` 即奇偶搭配走 → 实际是慢速 walk
export const OP_NPC_WALK_TO_SPEED_2 = 0x0011    // 17
// case 0x0082(130): NPCWalkTo,speed=8(快走,script.c:2437-2446)
export const OP_NPC_WALK_TO_SPEED_8 = 0x0082    // 130
// case 0x0070(112): Walk the party to position(sdlpal script.c:2125-2130)
//   PAL_PartyWalkTo(op0, op1, op2, speed=2) — 主角同步走到 (col=op0, row=op1, h=op2)。
//   每 tick 1 step,trail unshift + 改 wPartyDirection + UpdatePartyGestures。
export const OP_PARTY_WALK_TO = 0x0070          // 112
// case 0x006C(108): Walk the NPC in one step(script.c:2056-2063)
//   pCurrent.x += SHORT(operand[1]), pCurrent.y += SHORT(operand[2])
//   PAL_NPCWalkOneStep(wCurEventObjectID, 0)  // speed=0,只更新 wCurrentFrameNum
export const OP_NPC_WALK_ONE_STEP = 0x006C      // 108

// ── B 类移动 opcode ──────────────────────────────────────────────────────────
export const OP_PARTY_WALK_TO_4 = 0x007A        // 122 walk party speed 4
export const OP_PARTY_WALK_TO_8 = 0x007B        // 123 walk party speed 8
export const OP_NPC_WALK_TO_4 = 0x007C          // 124 NPC walk straight speed 4(隔帧)
export const OP_MOVE_OBJECT = 0x007D            // 125 pCurrent.x+=op1, y+=op2
export const OP_SET_OBJECT_LAYER = 0x007E       // 126 pCurrent.sLayer = op1
export const OP_ANIMATE_OBJECT = 0x0087         // 135 NPCWalkOneStep(id,0):仅推进动画帧
export const OP_NULLIFY_OBJECT = 0x004B         // 75  pEvtObj.sVanishTime = -15
export const OP_HIDE_OBJECT = 0x0052            // 82  pEvtObj.sState*=-1 + sVanishTime=op0?op0:800
export const OP_CHASE_PAUSE = 0x0062            // 98  wChasespeedChangeCycles=op0, wChaseRange=0
export const OP_CHASE_SPEEDUP = 0x0063          // 99  wChasespeedChangeCycles=op0, wChaseRange=3
export const OP_RIDE_OBJECT_2 = 0x003F          // 63  PartyRideEventObject speed 2
export const OP_RIDE_OBJECT_4 = 0x0044          // 68  PartyRideEventObject speed 4
export const OP_RIDE_OBJECT_8 = 0x0097          // 151 PartyRideEventObject speed 8
export const OP_MONSTER_CHASE = 0x004C          // 76  MonsterChasePlayer(id, speed, maxDist, floating)
// case 0x006E(110): Move the player to specified offset in one step(script.c:2091-2113)
//   trail unshift + party.x += SHORT(operand[0]), party.y += SHORT(operand[1])
//   wLayer = operand[2] * 8
export const OP_PLAYER_WALK_ONE_STEP = 0x006E   // 110
// case 0x0065(101): Set player sprite(script.c:1999-2004)
//   PlayerRoles.rgwSpriteNum[operand[0]] = operand[1]
//   operand[2] != 0 → PAL_LoadResources (we just update runtime;实际 load 由 bootstrap 预加载所有)
// 用于剧情切换主角 pose 系列 sprite group(如:捂头 / 倒地 / 大侠造型)。
export const OP_SET_PLAYER_SPRITE = 0x0065      // 101
// case 0x0073(115): Fade screen — VIDEO_FadeScreen(operand[0])(script.c:3267-3297 类似的 IO 模式)
//   sdlpal 真值:VIDEO_BackupScreen + PAL_MakeScene + VIDEO_FadeScreen(speed)
//   速度越大越慢:12 outer × 6 inner = 72 步 palette-bit blending
// M5 简版:writeState fadeState + cursor.waiting='fade-screen' 等淡完;present.ts 画黑色 alpha overlay
export const OP_FADE_SCREEN = 0x0073            // 115
// case 0x008E(142): Restore the screen(sdlpal script.c:3428-3436)
//   PAL_ClearDialog(TRUE) + VIDEO_RestoreScreen + VIDEO_UpdateScreen
//   真值:restore backup buffer(含 title+portrait 像素)→ 视觉 title/portrait 持久,body 空。
//   我们 state-driven:trigger partialClear → page-advance 保 titleText + portraitIcon,清 body。
export const OP_RESTORE_SCREEN = 0x008E         // 142

// ── M5.6 session 3:item.scriptOnUse / scriptOnEquip 真值 opcode(sdlpal script.c:867-1404)
//
// 全部按 sdlpal script.c case 真值 1:1 port。currentEventObjectId 在 item 上下文 = 目标 role id
// (sdlpal `wPlayer` 0-based)或 0xFFFF(applyToAll)。NPC trigger 上下文是 1-based NPC id;
// opcode 自行按需重新解读 — HP/MP/status 类按 role id,equipment 类按 role id。

// case 0x0006(6):  Jump to specified address by rate(script.c:3299-3312)
//   if (RandomLong(1, 100) >= operand[0]) → wScriptEntry = operand[1];else ip++
export const OP_JUMP_BY_RATE = 0x0006              // 6

// case 0x0017(23): Set player extra attribute(equipment effect — script.c:752-766)
//   i = operand[0] - 0xB → equipmentEffect[i].field[operand[1]][role] = SHORT(operand[2])
//   ts:无 rgEquipmentEffect runtime 模型 → log skip(M6 EquipItemMenu 真做时补)
export const OP_SET_PLAYER_EXTRA_ATTR = 0x0017     // 23

// case 0x0018(24): Equip selected item(script.c:768-811)
//   i = operand[0] - 0xB(equipment slot);writes rgwEquipment[i][role]=operand[1];
//   inventory swap:remove new item -1,if old != 0 add old +1
//   sdlpal `g_iCurEquipPart = i` 全局后续 0x1A 写 equipmentEffect 用 — ts 不持久此 ctx
//   (装备效果留 M6),先把 rgwEquipment 字段 + inventory swap 真做。
export const OP_EQUIP_ITEM = 0x0018                // 24

// case 0x0019(25): Increase/decrease player attribute(script.c:813-832)
//   p[operand[0] * MAX_PLAYER_ROLES + role] += SHORT(operand[1])
//   role = (operand[2] == 0) ? wEventObjectID : operand[2] - 1
//   operand[0] 是 PlayerRoles 结构内 row index(sdlpal global.h tagPLAYERROLES):
//     5=Level / 6=MaxHP / 7=MaxMP / 8=HP / 9=MP / 16=AttackStrength / 17=MagicStrength
//     18=Defense / 19=Dexterity / 20=FleeRate / 21=PoisonResistance / 28=CoveredBy
//   其它(0-4 静态字段 / 10-15 Equipment 2D / 22-27 Resistance 等)→ log skip
export const OP_INCREASE_PLAYER_ATTR = 0x0019      // 25

// case 0x001A(26): Set player stat(script.c:834-865)
//   p[operand[0] * MAX_PLAYER_ROLES + role] = SHORT(operand[1])
//   role 同 0x0019
//   注:g_iCurEquipPart != -1 时改写 equipmentEffect(equip 时)— ts 不持久,fallback PlayerRoles
export const OP_SET_PLAYER_STAT = 0x001A           // 26

// case 0x001B(27): HP delta(script.c:867-894)
//   operand[0]=applyToAll;operand[1]=signed delta;wEventObjectID=target role(when not all)
//   PAL_IncreaseHPMP clamp [0, maxHP]
export const OP_INCREASE_HP = 0x001B               // 27

// case 0x001C(28): MP delta(script.c:896-921)— 同上
export const OP_INCREASE_MP = 0x001C               // 28

// case 0x001D(29): HP+MP 双 delta(script.c:923-950)— 同上
export const OP_INCREASE_HP_MP = 0x001D            // 29

// case 0x0021(33): Inflict damage to enemy(script.c:1026-1050)— 战斗 only
//   battle context;overworld script 不触发 — log skip + 不阻流
export const OP_DAMAGE_ENEMY = 0x0021              // 33

// case 0x0022(34): Revive player(script.c:1052-1102)
//   if HP == 0:HP = maxHP * operand[1] / 10 + cure poison level 3 + clear all status
//   operand[0]=applyToAll
export const OP_REVIVE_PLAYER = 0x0022             // 34

// case 0x0023(35): Remove equipment(script.c:1104-1135)
//   operand[0]=role id;operand[1]==0 → 全槽 / != 0 → 槽 (operand[1]-1)
//   removed item → inventory +1
export const OP_REMOVE_EQUIPMENT = 0x0023          // 35

// case 0x0025(37): Set trigger script for NPC(script.c:1147-1155)
//   if operand[0] != 0:pCurrent.wTriggerScript = operand[1]
//   NPC trigger 上下文 — overworld item script 罕用
export const OP_SET_TRIGGER_SCRIPT = 0x0025        // 37

// case 0x0040(64): Set trigger method for event object(script.c:1613-1621)
//   if operand[0] != 0 → pCurrent.wTriggerMode = operand[1]
export const OP_SET_TRIGGER_METHOD = 0x0040        // 64

// case 0x0055(85): Add magic to player(script.c:1816-1830 → global.c:2084 PAL_AddMagic)
//   role = operand[1]==0 ? eventObjId : operand[1]-1;spell wObjectID = operand[0]
//   已学则 no-op,否则填第一个空槽
export const OP_ADD_MAGIC = 0x0055                 // 85

// case 0x0056(86): Remove magic from player(script.c:1832-1846 → global.c:2139 PAL_RemoveMagic)
export const OP_REMOVE_MAGIC = 0x0056              // 86

// case 0x009A(154): Set state for multiple event objects(script.c:2756-2764)
//   for id in [operand[0], operand[1]] → eventObject[id-1].sState = operand[2]
export const OP_SET_MULTI_OBJECT_STATE = 0x009A    // 154

// ── A2 条件跳转(大世界,无 battle 前置)。跳转目标由 disasm/slice JUMP_TARGET_OPERAND 打标签 ──
export const OP_JUMP_IF_ITEM_LESS = 0x0058         // 88  if itemAmount(op0)<op1 → jump op2
export const OP_JUMP_IF_NOT_POISON_KIND = 0x005D   // 93  if !poisonedByKind(role,op0) → jump op1
export const OP_JUMP_IF_NOT_POISONED = 0x0061      // 97  if !poisoned(role) → jump op0
export const OP_JUMP_IF_NOT_ALL_FULL_HP = 0x0074   // 116 if 任一队员 HP<MaxHP → jump op0
export const OP_JUMP_IF_PLAYER_IN_PARTY = 0x0079   // 121 if 队伍含 name==op0 → jump op1
export const OP_JUMP_IF_NOT_FACING = 0x0081        // 129 几何:party 不面对 obj op0 → jump op2
export const OP_JUMP_IF_OBJ_NOT_IN_ZONE = 0x0083   // 131 几何:obj op0 不在 zone → jump op2
export const OP_JUMP_IF_NOT_EQUIPPED = 0x0086      // 134 if 装备 op0 数量<op1 → jump op2
export const OP_JUMP_IF_OBJ_STATE = 0x0094         // 148 if pCurrent.sState==op1 → jump op2
export const OP_JUMP_IF_SCENE = 0x0095             // 149 if wNumScene==op0 → jump op1
export const OP_RANDOM_JUMP = 0x00A2               // 162 cursor.ip += RandomLong(0,op0-1)

// ── A3 数据/状态 opcode ──────────────────────────────────────────────────────
export const OP_CALL_SCRIPT = 0x0004               // 4   调用子脚本 op0(op1=eventObjId 覆盖),返回后续跑
export const OP_SET_SCENE_SCRIPTS = 0x006D         // 109 设 scene op0 的 onEnter(op1)/teleport(op2)脚本
export const OP_SET_PARTY = 0x0075                 // 117 operand[0..2]=roleId+1 → partyMembers
export const OP_SET_OBJECT_SCRIPT = 0x0090         // 144 rgObject[op0].rgwData[2+op2]=op1
export const OP_SET_FOLLOWER = 0x0098              // 152 operand[0..1]=follower roleId → gs.followers
export const OP_CHANGE_MAP = 0x0099                // 153 op0==0xFFFF 当前换图+reload;else 设 scene op0 mapNum

// case 0x0028(40): Apply poison to enemy(script.c:1175-1255)— 战斗 only,log skip
export const OP_POISON_ENEMY = 0x0028              // 40

// case 0x0029(41): Apply poison to player(script.c:1257-1285)
//   if RandomLong(1,100) > PAL_GetPlayerPoisonResistance(role) → AddPoisonForPlayer(role, operand[1])
//   operand[0]=applyToAll
//   ts:gs.rgPoisonStatus[`${slot}_${playerIdx}`] = { wPoisonID, wPoisonScript }
export const OP_POISON_PLAYER = 0x0029             // 41

// case 0x002A(42): Cure poison enemy(script.c:1287-1329)— 战斗 only,log skip
export const OP_CURE_ENEMY_POISON_KIND = 0x002A    // 42

// case 0x002B(43): Cure player poison by kind(script.c:1331-1347)
//   遍历 rgPoisonStatus,wPoisonID == operand[1] 清 0
export const OP_CURE_PLAYER_POISON_KIND = 0x002B   // 43

// case 0x002C(44): Cure player poison by level(script.c:1349-1365)
//   遍历 rgPoisonStatus,items[wPoisonID].poison.wPoisonLevel <= operand[1] 清 0
//   ts:items.poison 字段未完整 plumb — fallback 全清(简化,等 M5.5 poison plumb 真做)
export const OP_CURE_PLAYER_POISON_LEVEL = 0x002C  // 44

// case 0x002D(45): Set player status(script.c:1367-1375)
//   PAL_SetPlayerStatus(role, statusId, duration)
//   ts:无大世界 player status 模型(battle-only)— log skip(M6 大世界 status 真做时补)
export const OP_SET_PLAYER_STATUS = 0x002D         // 45

// case 0x002E(46): Set enemy status — 战斗 only,log skip
export const OP_SET_ENEMY_STATUS = 0x002E          // 46

// case 0x002F(47): Remove player status(script.c:1399-1404)— 同 0x002D 模型问题,log skip
export const OP_REMOVE_PLAYER_STATUS = 0x002F      // 47

/** sdlpal palcommon.h enum kDir → our Facing 字面量映射 */
const SDLPAL_DIR_TO_FACING: Record<number, 'down' | 'left' | 'up' | 'right'> = {
  0: 'down',   // kDirSouth
  1: 'left',   // kDirWest
  2: 'up',     // kDirNorth
  3: 'right',  // kDirEast
}

// 反向:facing → sdlpal kDir 数值(0x4C 驱魔香原地打转 wDirection++ 循环用)
const FACING_TO_SDLPAL_DIR: Record<'down' | 'left' | 'up' | 'right', number> = {
  down: 0,   // kDirSouth
  left: 1,   // kDirWest
  up: 2,     // kDirNorth
  right: 3,  // kDirEast
}

const SINGLE_TICK_LIMIT = 256

// sdlpal text.c:1701 PAL_DialogWaitForKeyWithMaximumSeconds(1.4):kDialogCenterWindow
// (narration / "得到XX" 物品提示)最多等 1.4s 自动消失,或按键提前。
// explore/event @ FPS_EXPLORE(10)→ 1.4 × 10 = 14 帧。
const NARRATION_AUTO_DISMISS_FRAMES = Math.round(1.4 * FPS_EXPLORE)

/**
 * "auto pre-op ClearDialog" — sdlpal script.c:3468-3471 default case 真值。
 * 任何**非 dialog setup / showDialog / 自带 ClearDialog**的 opcode 在 dispatch 前都先
 * `PAL_ClearDialog(TRUE)` — line-done dialog 在那时阻塞等 Space。
 *
 * 本列表 = "自带 ClearDialog 或 dialog-related,**不**需 auto pre-op 介入"的 opcode:
 *  - showDialog:自己 append / 等键
 *  - setDialogStyleX:自己触发 ClearDialog(by `pendingStyle`)
 *  - 0x05 redrawScreen:自己 PAL_ClearDialog(TRUE)
 *  - goto / end:goto 跳转不显示动作;end 自己 close dialog
 */
function isDialogContinuationOp(cmd: Command): boolean {
  return cmd.op === 'showDialog'
    || cmd.op === 'setDialogStyleTop'
    || cmd.op === 'setDialogStyleCenter'
    || cmd.op === 'setDialogStyleBottom'
    || cmd.op === 'setDialogStyleNarration'
    || cmd.op === 'goto'
    || cmd.op === 'end'
    // loadScene:sdlpal 真值 dialog **跟着** scene 渐变(后续 fadeScreen backup 含 dialog) —
    // dispatch 前不能清 dialogBox,否则 backup buffer 不含 dialog,fade 视觉不对。
    || cmd.op === 'loadScene'
    || (cmd.op === 'raw' && cmd.opcode === OP_REDRAW_SCREEN)
    // opcode 0x73 fadeScreen 内部 sdlpal `VIDEO_BackupScreen` 已含 dialog text;dispatch 前
    // **不**触发 auto pre-op clear,否则 backup 不含 dialog → 渐变 dialog 不跟。
    || (cmd.op === 'raw' && cmd.opcode === OP_FADE_SCREEN)
}

/** fetchPalette 注入(M4 P3.T2)—— 模式与 setSceneContext 一致,保持 tickEventSystem 同步签名。 */
type FetchPaletteFn = (id: number) => Promise<Palette>
let _fetchPalette: FetchPaletteFn | null = null

/** 注入 fetchPalette 实现;bootstrap 在 startRafLoop 前调用一次(类同 setSceneContext)。
 *  传 null 可在测试中重置(清除注入)。
 */
export function setFetchPalette(fn: FetchPaletteFn | null): void {
  _fetchPalette = fn
}

/**
 * loadScene opcode (0x0059) 异步切场景 callback 注入。
 *
 * sdlpal script.c:1880-1893 真值:wNumScene = operand[0],PAL_SetLoadFlags(kLoadScene) +
 * fEnteringScene = TRUE → 下帧 main loop PAL_LoadResources 重 load,PAL_GameUpdate 跑新 scene
 * 的 wScriptOnEnter。我们用 async callback 模拟:bootstrap 在闭包内拿到 sceneAssetsCache,
 * fetch 新 scene assets → setSceneContext + 重置 gs.npcs / wNumScene + applySceneAssetsToPresent
 * → 写 gs.eventCursor 指向新 scene 的 onEnterLabel ip → 释放 waiting='scene-load'。
 *
 * tickEventSystem 在 loadScene opcode 上 cursor.waiting='scene-load' + return,
 * callback 完成前不前进。callback 完成后,gs.eventCursor 已切到新 scene,下一帧 tick 接新 ip。
 */
type SceneLoaderFn = (sceneId: number) => Promise<void>
let _sceneLoader: SceneLoaderFn | null = null

export function setSceneLoader(fn: SceneLoaderFn | null): void {
  _sceneLoader = fn
}

/**
 * opcode 0x99 (changeMap) map-only 重载 callback。sdlpal script.c:2744-2748 op0==0xFFFF:
 * `rgScene[wNumScene-1].wMapNum = op1; PAL_SetLoadFlags(kLoadScene); PAL_LoadResources()` —
 * **只换地图 tilemap**(脚本继续,不重跑 onEnter / 不重置 npcs)。
 * bootstrap 注入:按新 mapNum re-fetch tilemap + applySceneAssetsToPresent(tilemap-only)。
 * fire-and-forget(不挂 waiting):异步换图期间脚本继续,几帧后新图就绪。
 */
type MapReloaderFn = (mapNum: number) => Promise<void>
let _mapReloader: MapReloaderFn | null = null

export function setMapReloader(fn: MapReloaderFn | null): void {
  _mapReloader = fn
}

/**
 * opcode 0x4C MonsterChasePlayer 障碍检测注入(port sdlpal `PAL_CheckObstacle`)。
 *
 * 返回 TRUE = 该像素坐标被阻挡(= sdlpal PAL_CheckObstacle 真值)。
 *   checkObjects=TRUE  → tilemap obstacle bit + 当前 scene event objects(排除 selfId)
 *   checkObjects=FALSE → 只查 tilemap(忽略 event objects,selfId 无意义)
 * 用 hook 注入避免 event-system 反向 import scene-system(scene-system 已 import event-system,
 * 直接 import 会成环)。bootstrap 用 `!isWalkable(presentCtx.tilemap, x, y, ...)` 实现。
 * 未注入(测试 / 无 tilemap)→ 视为无障碍(返回 false)。
 */
type ObstacleCheckerFn = (x: number, y: number, checkObjects: boolean, selfId: number) => boolean
let _obstacleChecker: ObstacleCheckerFn | null = null

export function setObstacleChecker(fn: ObstacleCheckerFn | null): void {
  _obstacleChecker = fn
}

// ── P0.e: shared.json events.bin 跨 scene 共享脚本注入 ─────────────────────────
//
// scene-NNN.json 的 trigger 内常 `goto: "shared#L_xxx"` 跳到 events/shared.json 的某 label
// 跑 cleanup / 公共序列(如战后隐藏怪 sprite + fade)。
// bootstrap 启动时 fetch /events/shared.json 一次,注入 commands + labelMap。
// tickEventSystem 遇到 goto "shared#L_xxx" 时:
//   - cursor.commands ← _sharedCommands
//   - cursor.labelMap ← _sharedLabelMap
//   - cursor.ip       ← labelMap["L_xxx"]
// 即把 cursor 切到 shared events 上继续执行。shared 内 'end' 退出 event mode 回 explore。
let _sharedCommands: Command[] = []
let _sharedLabelMap: Record<string, number> = {}

export function setSharedEvents(commands: Command[], labelMap: Record<string, number>): void {
  _sharedCommands = commands
  _sharedLabelMap = labelMap
}

/** M5.6 W1.a:scene-system loadEventFromNpc fallback 用 — NPC triggerLabel 不在 per-scene 时查 shared。 */
export function getSharedLabelMap(): Record<string, number> {
  return _sharedLabelMap
}

export function getSharedCommands(): Command[] {
  return _sharedCommands
}

// ── P0.e: opcode 7 startBattle handler 注入 ──────────────────────────────────
//
// event-system 不直接持有 enemies/enemyTeams/playerRoles 等战斗资源(避免污染 import 图)。
// bootstrap 启动时把 startBattle 包成闭包注入 — handler 接收 enemyTeamId/isBoss 自驱动 battle-system。
//
// 简化版(P0.e 范围):opcode 7 切 mode='battle' + 清 eventCursor(战后 finalizeBattle
// 自动回 explore mode),不实现"战后 cursor.ip++ 跑 onLose/onFlee 分支"路径。
// 真做战后 resume 留 M5 P1-Battle 股。
export interface StartBattleHandlerInput {
  gs: GameState
  enemyTeamId: number
  /** sdlpal script.c:3318 真值:`fIsBoss = !operand[2]`(operand[2]==0 → 不可逃跑 boss 战)。 */
  isBoss: boolean
}
export type StartBattleHandler = (input: StartBattleHandlerInput) => void

let _startBattleHandler: StartBattleHandler | null = null

export function setStartBattleHandler(fn: StartBattleHandler | null): void {
  _startBattleHandler = fn
}

/** 跑事件脚本的运行模式(M3 T17)。 */
export type RuntimeMode = 'explore' | 'battle'

/**
 * 战斗运行 ctx —— runtimeMode='battle' 时 caller 必须传入。
 * caster / target 索引指向 state.players / state.enemies(type 表明哪个数组);
 * 全体目标(target='all')时 target 字段省略,由 handler 自行处理(M3 T20/T21)。
 */
export interface BattleCtx {
  state: BattleState
  caster?: { type: 'player' | 'enemy', idx: number }
  target?: { type: 'player' | 'enemy', idx: number }
}

/** runScript 入口选项(M3 T17;T20/T21 caller 填)。 */
export interface RunScriptOptions {
  /** 完整命令列表(events.bin 的 commands 数组,scriptOnUse 是其全局 ip)。 */
  commands: Command[]
  /** 起始 ip(scriptOnUse 字段)。 */
  ip: number
  /** 命令总线 —— battle handler emit 动画 / 战斗消息走它。 */
  bus: CommandBus
  /** 运行模式 —— 'battle' 时 battleCtx 必传。 */
  runtimeMode: RuntimeMode
  /** 战斗 ctx —— 仅 runtimeMode='battle' 提供。 */
  battleCtx?: BattleCtx
}

export function buildLabelMap(commands: Command[]): Record<string, number> {
  const map: Record<string, number> = {}
  commands.forEach((c, i) => {
    if (c.label) map[c.label] = i
  })
  return map
}

/**
 * sdlpal script.c:3389-3426:每 setDialogStyleX opcode 入口先 `PAL_ClearDialog(TRUE)`:
 *  - 若已有 dialog(currentLineText 或 shownLines 非空)→ 阻塞等 Confirm + 清屏
 *  - 然后 `PAL_StartDialog(<style>, bFontColor, iNumCharFace, ...)` 应用新 style
 *
 * 我们的实现:
 *  - 已有 dialog → setWaitingPageKey(state, pendingStyle) + cursor.waiting='dialog' + return true
 *    (caller 不推 ip,等下次 tick Confirm 在 'page-advance' 分支读 pending → apply + 清 + ip++)
 *  - 无 dialog → 直接写 gs.currentDialog* + cursor.ip++,return false
 *
 * @returns true 表示已 wait(caller 应 return);false 表示已 apply(caller 应 break out of switch)
 */
function applySetDialogStyle(
  gs: GameState,
  cursor: NonNullable<GameState['eventCursor']>,
  style: 'top' | 'center' | 'bottom' | 'narration',
  portraitIcon: number | undefined,
  fontColor: number,
): boolean {
  const ds = gs.dialogBox
  if (ds && (ds.shownLines.length > 0 || ds.currentLineText !== null)) {
    setWaitingPageKey(ds, { style, portraitIcon, fontColor })
    cursor.waiting = 'dialog'
    return true
  }
  // **Sync.2 fix6:** 每次 setDialogStyleX 重设 style/portrait/fontColor(不 inherit),
  // 且若 dialogBox 还残留(opcode 0x05 + Confirm 后 shownLines/currentLineText 都清空,
  // 但 dialogBox 对象仍在)→ 清掉它,让下一条 showDialog 走 startDialogLine 用新 portrait/fontColor
  // 重建。不然 appendDialogLine 沿用旧 dialogBox 的 style/portraitIcon 留 bug(主角对话显李大娘头像)。
  gs.currentDialogStyle = style
  gs.currentDialogPortraitIcon = portraitIcon
  gs.currentDialogFontColor = fontColor
  if (ds) {
    gs.dialogBox = undefined
  }
  cursor.ip++
  return false
}

// ── autoScript runner ─────────────────────────────────────────────────────────
//
// port sdlpal `PAL_RunAutoScript`(script.c:3482-3651):每 active NPC 每帧执行 1 op,
// 不阻塞 trigger script。
//
// 真值调度(sdlpal):
//   - 主循环 PAL_GameUpdate(TRUE):跑 trigger + autoScripts
//   - opcode 0x09 wait N frames 内每帧 PAL_GameUpdate(op1?T:F):跑 autoScripts
//   - dialog wait / fade / scene-load **不**跑(sdlpal 这些 yield 不调 PAL_GameUpdate)
//
// 我们 port(mode.ts gate):
//   - explore mode: 跑
//   - event mode + cursor.waiting='frame-wait': 跑
//   - 其他 mode / waiting: 不跑
export function tickAutoScripts(gs: GameState): void {
  if (!gs.sceneCommands) return
  for (const npc of gs.npcs) {
    if ((npc.sState ?? 1) === 0) continue  // sdlpal `sState > 0` 才跑 autoScript
    if (!npc.autoCursor) continue
    runOneAutoOp(gs, npc)
  }
}

function runOneAutoOp(gs: GameState, npc: NpcState): void {
  const cursor = npc.autoCursor!
  // cursor.shared:autoScript 脚本体在 shared.json(被多 scene 共引,切片提升到 shared)。
  // 否则跑当前 scene 的 commands。labelMap 同源(goto/reset 的 L_ 解析也走对应表)。
  const cmds = cursor.shared ? getSharedCommands() : gs.sceneCommands!
  const autoLabelMap = cursor.shared ? getSharedLabelMap() : (gs.sceneLabelMap ?? {})
  if (cursor.ip < 0 || cursor.ip >= cmds.length) {
    npc.autoCursor = undefined  // ip 越界 → 停
    return
  }
  const cmd = cmds[cursor.ip]!

  switch (cmd.op) {
    case 'end':
      // sdlpal PAL_RunAutoScript 控制流(script.c:3518-3547):
      //  - 0x0000 (plain):原地 park(ip 不变,每帧重读 = no-op)
      //  - 0x0001 (advance):推进至下一行 i+1
      //  - 0x0002 (reset):idleFrames(operand[1])满前跳 resetTo(operand[0]);满后推进 i+1
      if (cmd.advance) {
        cursor.ip++
        return
      }
      if (cmd.reset) {
        const idleFrames = cmd.idleFrames ?? 0
        // sdlpal `rgwOperand[1] == 0 || ++count < rgwOperand[1]`(idleFrames=0 时不累加,恒跳)
        if (
          idleFrames === 0
          || (cursor.idleFrameCount = (cursor.idleFrameCount ?? 0) + 1) < idleFrames
        ) {
          // resetTo 是全局 entry 号,经 labelMap['L_<resetTo>'] 解本地 ip(shared 时查 shared 表)
          const target =
            cmd.resetTo !== undefined ? autoLabelMap[`L_${cmd.resetTo}`] : undefined
          if (target !== undefined) cursor.ip = target
          else npc.autoCursor = undefined // resetTo 跨文件/不在本 scene → 停
        }
        else {
          cursor.idleFrameCount = 0
          cursor.ip++
        }
        return
      }
      // 0x0000:park(ip 不变)
      return

    case 'goto': {
      // sdlpal case 0x0003 unconditional jump
      const frameDelay = cmd.frameDelay ?? 0
      if (frameDelay > 0) {
        cursor.idleFrameCount = (cursor.idleFrameCount ?? 0) + 1
        if (cursor.idleFrameCount < frameDelay) return
        cursor.idleFrameCount = 0
      }
      const target = autoLabelMap[cmd.to]
      if (target !== undefined) {
        cursor.ip = target
      }
      else {
        npc.autoCursor = undefined  // shared#L_X 跨文件不支持
      }
      return
    }

    case 'raw': {
      // opcode 0x09 wait N frames in autoScript:idleFrameCountAuto++ >= op0 → ip++
      if (cmd.opcode === OP_WAIT_FRAMES) {
        const frames = cmd.operands[0] || 1
        cursor.idleFrameCount = (cursor.idleFrameCount ?? 0) + 1
        if (cursor.idleFrameCount >= frames) {
          cursor.idleFrameCount = 0
          cursor.ip++
        }
        return
      }

      // opcode 0x10/0x11/0x7C/0x82 NPCWalkTo — autoScript 自走目标(NPC 是 autoCursor owner)
      if (cmd.opcode === OP_NPC_WALK_TO_SPEED_3
        || cmd.opcode === OP_NPC_WALK_TO_SPEED_2
        || cmd.opcode === OP_NPC_WALK_TO_4
        || cmd.opcode === OP_NPC_WALK_TO_SPEED_8) {
        // sdlpal 0x11(script.c:692)/ 0x7C(script.c:2263)有隔帧 stagger gate
        //   `(wEventObjectID & 1) ^ (dwFrameNum & 1)` — gate FALSE → wScriptEntry--(本帧不走,下帧重试)。
        //   wEventObjectID 1-based = npc.id + 1。0x10 / 0x82 无 gate。
        const staggered
          = cmd.opcode === OP_NPC_WALK_TO_SPEED_2 || cmd.opcode === OP_NPC_WALK_TO_4
        if (staggered && ((((npc.id + 1) & 1) ^ (gs.frameNum & 1)) === 0)) {
          return  // 隔帧:本 tick 跳过移动 + 重试
        }
        const speed = cmd.opcode === OP_NPC_WALK_TO_SPEED_3
          ? 3
          : cmd.opcode === OP_NPC_WALK_TO_SPEED_8
            ? 8
            : cmd.opcode === OP_NPC_WALK_TO_4
              ? 4
              : 2
        const arrived = npcWalkTo(
          npc,
          cmd.operands[0] ?? 0,
          cmd.operands[1] ?? 0,
          cmd.operands[2] ?? 0,
          speed,
        )
        if (arrived) cursor.ip++
        return
      }

      // 其余 raw op:sdlpal default case 走 PAL_InterpretInstruction。
      // 我们用 applyRawOpcode,**传 npc.id 作 currentEventObjectId**(0-based,跟
      // scene-system.ts:125 trigger 进入约定一致 — **不**加 1)。
      applyRawOpcode(gs, cmd.opcode, cmd.operands, npc.id)
      cursor.ip++
      return
    }

    default:
      // showDialog / setDialogStyleX / loadScene / startBattle 等不该在 autoScript 出现。
      // 防御 skip ip++,避免死循环。
      console.debug(`autoScript: skip non-script op '${cmd.op}' for npc id=${npc.id} ip=${cursor.ip}`)
      cursor.ip++
  }
}

export function tickEventSystem(
  gs: GameState,
  input: InputSnapshot,
  bus: CommandBus,
): void {
  const cursor = gs.eventCursor
  if (!cursor) {
    gs.mode = 'explore'
    return
  }

  // 1a) waiting 处理:frame-wait(opcode 0x0009 wait N frames,sdlpal script.c:3593-3604)
  //   每 tick 自减;归 0 时 ip++ + clear waiting,fall through 跑下条 opcode
  if (cursor.waiting === 'frame-wait') {
    const remaining = (cursor.waitFramesRemaining ?? 1) - 1
    if (remaining > 0) {
      cursor.waitFramesRemaining = remaining
      return
    }
    cursor.waitFramesRemaining = undefined
    cursor.waiting = undefined
    cursor.ip++
    // fall through to main while loop
  }

  // 1a') waiting 处理:fade-screen(opcode 0x0073 fade-in)
  //   time-based:elapsed = performance.now() - startTimeMs;到 totalMs 即完成。
  //   raf 帧率(60Hz / 20Hz 都行)不影响实际时长 — 1:1 还原 sdlpal video.c wall-clock 节拍。
  if (cursor.waiting === 'fade-screen') {
    if (!gs.fadeState) {
      cursor.waiting = undefined  // 防御:无 fadeState 不应等
    }
    else {
      const elapsed = performance.now() - gs.fadeState.startTimeMs
      if (elapsed < gs.fadeState.totalMs) {
        return  // 仍在 fade,present.ts 按 elapsed/totalMs 应用对应数量 sdlpal step
      }
      gs.fadeState = undefined
      cursor.waiting = undefined
      cursor.ip++
      // fall through to main while loop
    }
  }

  // 1a'') waiting 处理:scene-load(opcode 0x0059 loadScene)
  //   bootstrap callback 异步 fetch 新 scene assets → 重置 gs.eventCursor 指新 scene onEnterLabel ip。
  //   callback 完成前每 tick 仍读到旧 cursor.waiting='scene-load' → 直接 return 不步进。
  //   完成后 gs.eventCursor 被替换为新 cursor(无 waiting),下一 tick 从新 ip 继续。
  if (cursor.waiting === 'scene-load') {
    return  // 等 callback 替换 gs.eventCursor
  }

  // 1b) waiting 处理:dialog 状态机(port sdlpal text.c:1616 PAL_ShowDialogText)
  //
  // sdlpal 真实交互:
  //  - typing 中:每 tick 推 charsRevealed;Confirm = fUserSkip 跳行末
  //  - line-done:自动推进 cursor.ip,无需 Confirm(行间不停)
  //  - waiting-page-key:第 5 行 showDialog 到来 → 等 Confirm 清屏 + 重画
  //  - waiting-end-key:dialog 整段结束 → 等 Confirm 关 dialog
  if (cursor.waiting === 'dialog') {
    if (!gs.dialogBox) {
      // 防御:waiting=dialog 但 dialogBox 不存在 → 清状态退出 waiting,继续步进
      cursor.waiting = undefined
    }
    else if (gs.dialogBox.style === 'narration') {
      // sdlpal text.c:1663-1710 kDialogCenterWindow(物品提示 "得到XX"):全文瞬显 +
      // PAL_DialogWaitForKeyWithMaximumSeconds(1.4)→ 最多 1.4s(NARRATION_AUTO_DISMISS_FRAMES 帧)
      // 自动消失 / 按键提前 → PAL_DeleteBox + PAL_EndDialog(nCurrentDialogLine=0)。
      //
      // 与多行 typing dialog 不同:**不**走行间 auto-advance / pre-op wait-for-key —
      // 自带 timer 自清 dialogBox + 推进 cursor,后续 opcode(giveItem 等)本 tick 继续跑、不阻塞。
      const ds = gs.dialogBox
      ds.typingFrames++
      // sdlpal text.c:1433 `g_InputState.dwKeyPress != 0`:**任意键**立即关闭(不止 Confirm),
      // 或 1.4s 超时。玩家按方向键 / ESC / 任何键都能马上继续,不被迫干等。
      const anyKey = input.pressed.size > 0
      if (anyKey || ds.typingFrames >= NARRATION_AUTO_DISMISS_FRAMES) {
        gs.dialogBox = undefined
        cursor.waiting = undefined
        cursor.ip++ // 推进过 showDialog;fall through 主 while 跑后续 opcode
      }
      else {
        return // 继续显示,等 1.4s timer / 按键
      }
    }
    else {
      tickDialog(gs.dialogBox)
      const ds = gs.dialogBox

      // Confirm 处理:phase 决定行为
      if (input.pressed.has('Confirm')) {
        const result = confirmDialog(ds)
        if (result === 'skip-typing') {
          // 跳到行末;仍在 typing 行,但已 line-done — 下面 line-done 分支自动推进
        }
        else if (result === 'page-advance') {
          // 清屏完成。检查 pendingStyle / pendingFullClear / pendingPreOpClear:
          //  - pendingStyle 有(setDialogStyleX 触发)→ apply gs.currentDialog*,清 dialogBox
          //  - pendingFullClear 有(Sync.2 fix8:0x05 ClearDialog 触发)→ 不切 style,但仍清 dialogBox
          //  - pendingPreOpClear 有(Sync.2 fix11:script.c:3468 default auto-ClearDialog 触发)→
          //      opcode 尚未消费,**不 ip++** — 下一帧 tick 仍在原 ip 跑 opcode(无 dialog 遮挡)
          //  - 都无 → 累计 4 行翻页(同 style),保留 dialogBox 让下条 showDialog appendDialogLine
          const pending = ds.pendingStyle
          const preOp = ds.pendingPreOpClear
          if (pending) {
            gs.currentDialogStyle = pending.style
            gs.currentDialogPortraitIcon = pending.portraitIcon
            gs.currentDialogFontColor = pending.fontColor
            gs.dialogBox = undefined
          }
          else if (ds.pendingPartialClear) {
            // Sync.2 fix18:0x8E RestoreScreen 特殊路径 — sdlpal 真值是 VIDEO_RestoreScreen
            // restore backup buffer(含 title + portrait 像素)→ 视觉 title/portrait 持久。
            // 我们 state-driven:partialClear 保留 titleText + portraitIcon,只清 body 内容。
            // (content 已在 confirmDialog page-advance 内 reset)
            ds.pendingPartialClear = undefined
            ds.pendingPreOpClear = undefined
          }
          else if (ds.pendingFullClear) {
            // Sync.2 真值:0x05 ClearDialog + PAL_MakeScene 重画 scene 覆盖 dialog 区像素
            // (含 portrait + title)→ 视觉消失。auto pre-op clear 同理(后面 NPC 动画 opcode
            // 由 PAL_MakeScene 覆盖屏幕)。
            // state-driven port:清整 dialogBox 让渲染层不再画 dialog。
            gs.dialogBox = undefined
          }
          cursor.waiting = undefined
          if (!preOp) cursor.ip++
          // fall through 到下面 while 循环:本 tick 继续跑下条 opcode(preOp 时 ip 不变,跑原 opcode;
          // 非 preOp 时 ip 已 ++,跑下一条)
        }
        else if (result === 'dialog-end') {
          // 关 dialog,推进到 end 之后(此时 cursor.ip 已在 end opcode 上,end handler 处理退出)
          gs.dialogBox = undefined
          cursor.waiting = undefined
          // 注意:不 ip++,因为 'end' opcode 本身还要执行(下面 switch case 处理)
        }
        // 'noop':什么都不做(line-done 等状态)
      }

      // 自动推进:line-done 时直接 cursor.ip++(不等 Confirm)— sdlpal 行间不停
      // 但只在 *上面* 不是 'page-advance' / 'dialog-end' 时才做(那两已 return / 切状态)
      if (gs.dialogBox && gs.dialogBox.phase === 'line-done' && cursor.waiting === 'dialog') {
        cursor.waiting = undefined
        cursor.ip++
        // 继续 fall-through 进入主 while 跑下条 opcode
      }
      else if (gs.dialogBox && cursor.waiting === 'dialog') {
        // 仍在 typing / waiting-page-key / waiting-end-key → 本 tick 不动 cursor
        return
      }
    }
  }

  // 2) 循环跑直到撞 waitable / end / 越界 / 超限
  let stepCount = 0
  while (true) {
    if (++stepCount > SINGLE_TICK_LIMIT) {
      throw new Error(
        `event-system: single-tick instruction limit (${SINGLE_TICK_LIMIT}) exceeded at ip=${cursor.ip}`,
      )
    }

    if (cursor.ip < 0 || cursor.ip >= cursor.commands.length) {
      console.warn(`event-system: ip ${cursor.ip} 越界 → 切回 explore / menu`)
      gs.eventCursor = undefined
      gs.dialogBox = undefined
      // sdlpal play.c:264-303 PAL_GameUseItem 真值:item script 跑完回到 ItemUseMenu。
      // 等价 ts:menuStack 非空 → mode='menu' 恢复菜单循环(否则回 explore)。
      gs.mode = gs.menuStack.length > 0 ? 'menu' : 'explore'
      return
    }

    const cmd = cursor.commands[cursor.ip]!

    // sdlpal script.c:3468-3471 真值:PAL_RunTriggerScript outer switch 的 default case 在跑
    // 任何**非 dialog setup / showDialog / 自带 ClearDialog** 指令前都先 `PAL_ClearDialog(TRUE)`。
    // 真值阻塞:if (nCurrentDialogLine > 0) PAL_DialogWaitForKey()(等 Space)。
    //
    // 我们 port:line-done 状态的 dialog + 即将跑非 dialog opcode → setWaitingPageKey(fullClear+preOpClear)
    // + waiting='dialog' return,等用户 Space 后真清 dialogBox,下一帧再跑该 opcode。
    // 这样 NPC 动画 / wait / 角色 pose 切换等播放期间,先前的对话框不再遮挡画面。
    if (
      gs.dialogBox
      && gs.dialogBox.phase === 'line-done'
      && (gs.dialogBox.shownLines.length > 0 || gs.dialogBox.currentLineText !== null)
      && !isDialogContinuationOp(cmd)
    ) {
      // Sync.2 fix18:区分 ClearDialog 触发源(sdlpal scene.c:472 真值 — PAL_MakeScene 每帧
      // rect={0,0,320,200} 全屏重画 → portrait/title 像素被覆盖 → 视觉消失。**例外** 0x8E
      // RestoreScreen 用 VIDEO_RestoreScreen restore backup buffer 含 title/portrait → 持久)。
      //
      // 我们 port:
      //   - 0x8E:partialClear → page-advance 保 titleText + portraitIcon,清 body
      //   - 其他 op (NPC 动画 / wait / pose 切换):fullClear → 清整 dialogBox(title+portrait 都消失)
      const isRestoreScreen = cmd.op === 'raw' && cmd.opcode === OP_RESTORE_SCREEN
      setWaitingPageKey(
        gs.dialogBox,
        undefined,
        !isRestoreScreen,  // fullClear:非 0x8E 都 true
        true,              // preOpClear:opcode 尚未消费
        isRestoreScreen,   // partialClear:仅 0x8E true
      )
      cursor.waiting = 'dialog'
      return
    }

    switch (cmd.op) {
      case 'end':
        // sdlpal script.c:3475 PAL_EndDialog → PAL_ClearDialog(TRUE)
        // 若 dialog 有过行(shownLines.length > 0 或 currentLineText 非空)→ 等 Confirm 关 dialog
        if (gs.dialogBox && gs.dialogBox.phase !== 'waiting-end-key') {
          const hasLines = gs.dialogBox.shownLines.length > 0
            || (gs.dialogBox.currentLineText !== null && gs.dialogBox.charsRevealed > 0)
          if (hasLines) {
            setWaitingEndKey(gs.dialogBox)
            cursor.waiting = 'dialog'
            return // 等下次 tick Confirm 处理
          }
        }
        // opcode 0x04 call-script 返回:子脚本 'end' → 弹返回帧,恢复 caller 上下文(ip/commands/
        // labelMap/currentEventObjectId)继续,而非清 cursor(sdlpal PAL_RunTriggerScript 子调用返回)。
        if (cursor.callStack && cursor.callStack.length > 0) {
          const frame = cursor.callStack.pop()!
          cursor.commands = frame.returnCommands
          cursor.labelMap = frame.returnLabelMap
          cursor.currentEventObjectId = frame.savedEventObjectId
          cursor.ip = frame.returnIp
          break // 继续主 while,从 returnIp 跑 caller 下一条
        }
        // sdlpal play.c:64 真值:onEnter 脚本跑完把"下一条 entry"存回 scene.wScriptOnEnter。
        //   0x00(end,无 advance/reset):返回本次起始 entry(原地 replay — "每次进都跑"的脚本);
        //   0x01(advance):ip+1(推进过本段 — 开场 cutscene 用,落到下一条 0x00 → 重进只跑 0x00);
        //   0x02(reset):resetTo。
        // 存进 gs.sceneOnEnterIp[sceneId] → 重进该 scene 从此 ip 跑,实现"开场只播一次"。
        if (cursor.onEnterSceneId !== undefined) {
          let nextEntry: number
          if (cmd.advance) nextEntry = cursor.ip + 1
          else if (cmd.reset && cmd.resetTo !== undefined) {
            nextEntry = cursor.labelMap[`L_${cmd.resetTo}`] ?? cursor.onEnterStartIp ?? cursor.ip
          }
          else nextEntry = cursor.onEnterStartIp ?? cursor.ip
          gs.sceneOnEnterIp[cursor.onEnterSceneId] = nextEntry
          // onEnter 结束 → 清 fEnteringScene 解冻渲染(sdlpal play.c:61 真值是无条件清)。
          // 带 fadeScreen 的开场已在中途(opcode 0x73)清过,这里幂等;override(已推进过
          // 开场、无 fadeScreen)则靠这里清,否则 present.ts:114 永久 early-return → 卡死。
          gs.fEnteringScene = false
        }
        gs.eventCursor = undefined
        gs.dialogBox = undefined
        gs.currentDialogPortraitIcon = undefined
        // Sync.2 fix5:主角 scripted pose / sprite override 不在此清,
        //   由 scene-system 首次走动检测时清(避免单元测试 setX→end 两 opcode 后立即 read 不到值)
        // M5.6 session 3 修(sdlpal play.c:264-303 PAL_GameUseItem INNER while loop 真值):
        //   item.scriptOnUse 跑完后 sdlpal **回到** ItemUseMenu(while (TRUE) 顶)— 不退菜单。
        //   ts 等价:若 menuStack 非空 → mode='menu' 恢复菜单循环,而非 mode='explore'。
        //   user 反馈"如果这个物品没用完可以继续使用" — 之前我一律 menuStack=[] 错杀菜单。
        gs.mode = gs.menuStack.length > 0 ? 'menu' : 'explore'
        return

      case 'goto': {
        // P0.e: 支持 "shared#L_xxx" 跨 scene 共享脚本(events/shared.json)。
        // shared#L_X → cursor 切到 _sharedCommands + _sharedLabelMap,ip = sharedLabelMap[L_X]。
        // shared 内 'end' 退出 event mode 回 explore(无需再切回原 scene cursor — 调用 trigger
        // 已 end + 战斗 / cleanup 跑完即应回 explore)。
        if (cmd.to.startsWith('shared#')) {
          const sharedLabel = cmd.to.slice('shared#'.length)
          const sharedIp = _sharedLabelMap[sharedLabel]
          if (sharedIp === undefined) {
            throw new Error(
              `event-system: shared goto label ${cmd.to} 不在 sharedLabelMap`
              + `(确认 bootstrap 已 setSharedEvents)`,
            )
          }
          cursor.commands = _sharedCommands
          cursor.labelMap = _sharedLabelMap
          cursor.ip = sharedIp
          break
        }
        const target = cursor.labelMap[cmd.to]
        if (target === undefined) {
          throw new Error(`event-system: goto label ${cmd.to} 不在 labelMap`)
        }
        cursor.ip = target
        break
      }

      case 'showDialog': {
        // sdlpal text.c:1616 PAL_ShowDialogText —— 一行一调,行间不等键(由 page/end 状态机管)。
        // 若 dialogBox 不存在 → startDialogLine 启首行
        // 若存在但累计 4 行(shouldWaitPageKey)→ setWaitingPageKey,等下次 tick Confirm 后再 append
        // 否则 → appendDialogLine 加新行
        //
        // sdlpal text.c:1534/1542 `$XX` / `~XX` 控制码 strip(不显示字面值)
        const text = stripDialogControlCodes(cmd.text)
        if (!gs.dialogBox) {
          gs.dialogBox = startDialogLine(text, {
            style: gs.currentDialogStyle,
            portraitIcon: gs.currentDialogPortraitIcon,
            fontColor: gs.currentDialogFontColor,
          })
        }
        else if (shouldWaitPageKey(gs.dialogBox)) {
          // 不消费本 showDialog — 设 wait 状态,Confirm 后 cursor.ip++ 才会回到此 case append
          setWaitingPageKey(gs.dialogBox)
          cursor.waiting = 'dialog'
          return
        }
        else {
          appendDialogLine(gs.dialogBox, text)
        }
        cursor.waiting = 'dialog'
        bus.emit({ op: 'showDialogBox', text, style: gs.currentDialogStyle })
        // ip 停在 showDialog 上,waiting 释放(typing 完后自动 ip++)才推进
        return
      }

      case 'setDialogStyleTop': {
        // sdlpal script.c:3404 PAL_ClearDialog(TRUE) + PAL_StartDialog(kDialogUpper, op[1], op[0], ...)
        if (applySetDialogStyle(gs, cursor, 'top',
          cmd.arg0 ? cmd.arg0 : undefined,
          cmd.arg1 ? cmd.arg1 : 0x4F)) return
        break
      }
      case 'setDialogStyleCenter': {
        // sdlpal script.c:3394 PAL_ClearDialog(TRUE) + PAL_StartDialog(kDialogCenter, op[0], 0, ...)
        if (applySetDialogStyle(gs, cursor, 'center',
          undefined,
          cmd.arg0 ? cmd.arg0 : 0x4F)) return
        break
      }
      case 'setDialogStyleBottom': {
        // sdlpal script.c:3414 PAL_ClearDialog(TRUE) + PAL_StartDialog(kDialogLower, op[1], op[0], ...)
        if (applySetDialogStyle(gs, cursor, 'bottom',
          cmd.arg0 ? cmd.arg0 : undefined,
          cmd.arg1 ? cmd.arg1 : 0x4F)) return
        break
      }
      case 'setDialogStyleNarration': {
        // sdlpal script.c:3424 PAL_ClearDialog(TRUE) + PAL_StartDialog(kDialogCenterWindow, op[0], 0, FALSE)
        if (applySetDialogStyle(gs, cursor, 'narration',
          undefined,
          cmd.arg0 ? cmd.arg0 : 0x4F)) return
        break
      }

      case 'raw': {
        // P0.e: opcode 7 startBattle 切 mode='battle' → 释放 cursor,return 退出 tickEventSystem
        if (cmd.opcode === OP_START_BATTLE) {
          tryStartBattle(gs, cmd.operands[0] ?? 0, cmd.operands[2] ?? 0)
          gs.eventCursor = undefined
          gs.dialogBox = undefined
          return
        }
        // Sync.2 fix3: opcode 9 wait N frames — 设 waiting='frame-wait',ip 暂不动
        if (cmd.opcode === OP_WAIT_FRAMES) {
          // sdlpal script.c:3354 `pScript->rgwOperand[0] ? operand[0] : 1`
          const frames = cmd.operands[0] || 1
          cursor.waiting = 'frame-wait'
          cursor.waitFramesRemaining = frames
          return
        }
        // Sync.2 fix5: opcode 5 redrawScreen / PAL_ClearDialog(TRUE) — sdlpal script.c:3267-3297
        //   有 dialog → 等 Confirm 翻页清屏(让后续 NPC 动作 / 场景重画显);无 dialog → no-op + ip++
        // Sync.2 fix8:翻页后**必须完全清 gs.dialogBox**(对应 sdlpal PAL_ClearDialog(TRUE)),
        //              不只清 shownLines/currentLineText;否则 portrait 残留遮挡后续 NPC 动画。
        if (cmd.opcode === OP_REDRAW_SCREEN) {
          if (gs.dialogBox
            && (gs.dialogBox.shownLines.length > 0 || gs.dialogBox.currentLineText !== null)) {
            setWaitingPageKey(gs.dialogBox, undefined, true)  // fullClear=true(0x05 = PAL_ClearDialog(TRUE))
            cursor.waiting = 'dialog'
            return  // 等下次 tick Confirm,page-advance 后 dialogBox=undefined + ip++ + 继续
          }
          // 无 dialog → 直接 ip++,本 tick 继续(下面 ip++)
          cursor.ip++
          break
        }

        // Sync.2 fix9: opcode 0x73 fadeScreen — sdlpal script.c:3271 + video.c:1130 VIDEO_FadeScreen
        //   sdlpal 真值:VIDEO_BackupScreen + PAL_MakeScene + VIDEO_FadeScreen(speed)
        //   VIDEO_FadeScreen 内 12 outer × 6 inner = 72 步 palette-bit blending,blocking。
        //   speed 控制每步 SDL_Delay(wSpeed*10ms);我们 raf tick 速率固定 ≈ 60Hz,
        //   72 frames ≈ 1.2s,接近 sdlpal speed=2 的 2.16s(可接受的近似)。
        //   设 fadeState + waiting='fade-screen';tick 1a' 推帧完成后 ip++。
        if (cmd.opcode === OP_FADE_SCREEN) {
          // sdlpal video.c:1175-1176 真值:wSpeed = (operand+1)*10 ms 每步,72 步总时长。
          // speed=2 → 30ms × 72 = 2160ms。time-based 不受 raf 帧率影响 — 1:1 还原 sdlpal classic 真值。
          const speed = cmd.operands[0] ?? 0
          const totalMs = (speed + 1) * 10 * 72
          gs.fadeState = {
            speed,
            totalMs,
            startTimeMs: performance.now(),
            appliedSteps: 0,
          }
          // sdlpal 真值:fEnteringScene 在 PAL_LoadResources 完成 + 第一次 PAL_GameUpdate 后即清。
          // 我们 port:fadeScreen 启动表示 onEnter 已跑到 fade 这步,scene 已加载完;清 fEnteringScene
          // 让 present.ts 恢复渲染(新 scene)— fade 从冻结的旧画面渐变到新 scene。
          gs.fEnteringScene = false
          // Sync.2 fix18:sdlpal 真值 — fadeScreen 启动前的 default-case PAL_ClearDialog(TRUE) 已经
          // 把 nCurrentDialogLine 设 0 → 之后 PAL_MakeScene 重画不含 dialog box → fade 是
          // backup(冻结画面有 dialog 像素) → current(重画无 dialog) → 视觉 dialog 跟着渐隐。
          //
          // 我们 game dialog 是 state-driven render:清 gs.dialogBox 让 current 渲染不画 dialog,
          // backupPixels 已含上一帧冻结的 dialog 像素 → fade 视觉 dialog 渐隐(title + body 一起)。
          gs.dialogBox = undefined
          gs.currentDialogPortraitIcon = undefined
          gs.currentDialogFontColor = 0x4F
          cursor.waiting = 'fade-screen'
          console.debug(`event-system: fadeScreen speed=${speed} → ${totalMs}ms (sdlpal classic 真值)`)
          return  // 等 fade 完
        }
        // Sync.2 fix20:opcode 0x70/0x7A/0x7B PartyWalkTo — 主角阻塞走到目标。
        //   0x70 speed 2(script.c:2125)/ 0x7A speed 4(script.c:2249)/ 0x7B speed 8(script.c:2256)。
        //   每 tick 走 1 step,arrived 才 ip++。trigger 中常见用法 "主角走到密道" 等。
        if (cmd.opcode === OP_PARTY_WALK_TO
          || cmd.opcode === OP_PARTY_WALK_TO_4
          || cmd.opcode === OP_PARTY_WALK_TO_8) {
          const speed = cmd.opcode === OP_PARTY_WALK_TO_8
            ? 8
            : cmd.opcode === OP_PARTY_WALK_TO_4
              ? 4
              : 2
          const arrived = partyWalkTo(
            gs,
            cmd.operands[0] ?? 0,
            cmd.operands[1] ?? 0,
            cmd.operands[2] ?? 0,
            speed,
          )
          if (arrived) {
            cursor.ip++
            break
          }
          return
        }

        // Sync.2 fix19:opcode 0x10 / 0x11 / 0x7C / 0x82 NPCWalkTo — 阻塞 trigger script,
        // 每 tick 走 1 步,arrived 才 ip++(对应 sdlpal `wScriptEntry--` 下帧 retry 真值)。
        // self = currentEventObjectId(trigger 当前 NPC,scene-system 进入 trigger 时设)。
        if (cmd.opcode === OP_NPC_WALK_TO_SPEED_3
          || cmd.opcode === OP_NPC_WALK_TO_SPEED_2
          || cmd.opcode === OP_NPC_WALK_TO_4
          || cmd.opcode === OP_NPC_WALK_TO_SPEED_8) {
          const npc = getSelfNpc(gs, cursor.currentEventObjectId, 'npcWalkTo')
          if (!npc) {
            // 无 self(从 onEnter 跑无 trigger NPC)→ skip + ip++
            cursor.ip++
            break
          }
          // sdlpal 0x11(script.c:692)/ 0x7C(script.c:2263)有隔帧 stagger gate
          //   `(wEventObjectID & 1) ^ (dwFrameNum & 1)` — gate FALSE → wScriptEntry--(本帧不走重试)。
          //   wEventObjectID 1-based = npc.id + 1。0x10 / 0x82 无 gate。
          const staggered
            = cmd.opcode === OP_NPC_WALK_TO_SPEED_2 || cmd.opcode === OP_NPC_WALK_TO_4
          if (staggered && ((((npc.id + 1) & 1) ^ (gs.frameNum & 1)) === 0)) {
            return  // 隔帧:本 tick 跳过移动 + 重试
          }
          // sdlpal 四档速度:0x10=3, 0x11=2(隔帧), 0x7C=4(隔帧), 0x82=8
          const speed = cmd.opcode === OP_NPC_WALK_TO_SPEED_3
            ? 3
            : cmd.opcode === OP_NPC_WALK_TO_SPEED_8
              ? 8
              : cmd.opcode === OP_NPC_WALK_TO_4
                ? 4
                : 2
          const arrived = npcWalkTo(
            npc,
            cmd.operands[0] ?? 0,
            cmd.operands[1] ?? 0,
            cmd.operands[2] ?? 0,
            speed,
          )
          if (arrived) {
            cursor.ip++
            break  // fall through 跑下条
          }
          return  // 未到 → 下 tick 再跑同条
        }

        // opcode 0x3F/0x44/0x97 PartyRideEventObject — party 骑乘对象阻塞移动到目标。
        //   0x3F speed 2(script.c:1609)/ 0x44 speed 4(script.c:1654)/ 0x97 speed 8(script.c:2705)。
        //   骑乘对象 = wEventObjectID(self)。每 tick 走 1 step,arrived 才 ip++(同 walk-to retry)。
        if (cmd.opcode === OP_RIDE_OBJECT_2
          || cmd.opcode === OP_RIDE_OBJECT_4
          || cmd.opcode === OP_RIDE_OBJECT_8) {
          const npc = getSelfNpc(gs, cursor.currentEventObjectId, 'rideObject')
          if (!npc) {
            cursor.ip++
            break
          }
          const speed = cmd.opcode === OP_RIDE_OBJECT_8
            ? 8
            : cmd.opcode === OP_RIDE_OBJECT_4
              ? 4
              : 2
          const arrived = partyRideEventObject(
            gs,
            npc,
            cmd.operands[0] ?? 0,
            cmd.operands[1] ?? 0,
            cmd.operands[2] ?? 0,
            speed,
          )
          if (arrived) {
            cursor.ip++
            break
          }
          return
        }

        // P0.e: 6 wScriptOnEnter opcode 真生效 + Sync.2 fix3: 4 个 NPC 动作 opcode;其余 D26 兜底 skip
        applyRawOpcode(gs, cmd.opcode, cmd.operands, cursor.currentEventObjectId)
        cursor.ip++
        break
      }

      case 'startBattle':
        // P0.e: 具名 startBattle(若 disassembler 升级具名)— 走同 raw#7 handler。
        // sdlpal script.c:3318 真值 PAL_StartBattle(operand[0], !operand[2])。
        // 简化版:切 mode 'battle' + 清 eventCursor;战后 finalizeBattle 回 explore mode。
        // 战后 cursor.ip++ resume + onLose/onFlee 分支留 M5 P1-Battle 股。
        if (cmd.operands) {
          tryStartBattle(gs, cmd.operands[0], cmd.operands[2])
        }
        // mode 已切 'battle' / explore(取决于 handler 是否注入);释放 cursor 不再 resume
        gs.eventCursor = undefined
        gs.dialogBox = undefined
        return

      case 'giveItem':
        // sdlpal opcode 0x1F(script.c:970-975)`PAL_AddItemToInventory(itemId, count)` —
        // pal-extract 反编译为 'giveItem' 具名 op(itemId 已是 ts items.json id;count=0 →
        // helper 内当 1)。**旧版 skip 是 user 2026-05-29 "调查柜子获得净衣符但道具列表空"
        // 的根因** — 宝箱 / cutscene 给物品 opcode 全失效。
        addItemToInventory(gs, cmd.itemId, cmd.count)
        console.debug(`event-system: giveItem id=${cmd.itemId} count=${cmd.count}`)
        cursor.ip++
        break

      case 'loadScene': {
        // sdlpal 0x0059 真做:fEnteringScene + wNumScene = operand[0] → 下帧 PAL_LoadResources 重 load。
        // 我们用注入的 _sceneLoader async callback:fetch 新 scene assets → setSceneContext + 重置 gs +
        // 切 gs.eventCursor 到新 scene 的 onEnterLabel ip → 释放 waiting。
        // ip 停在本 loadScene 上,callback 完成后 gs.eventCursor 已被重写到新 scene,本 cursor 弃用。
        if (_sceneLoader) {
          cursor.waiting = 'scene-load'
          // **立刻**设 fEnteringScene=true — present.ts:114 见此 flag 跳过渲染,
          // 冻结上一帧(切场景前的旧 scene 完整帧)。否则 sceneLoader 是 async fetch,
          // fetch 期间(几帧)present 会渲染"旧 tilemap + 新 party 坐标(setPartyPos 已改)"
          // 的中间态 → 旧 scene tilemap 在新坐标处是空 → 黑帧闪现(user 2026-05-29
          // "闪一下新场景然后黑屏" 的 async race 根因)。sceneLoader 完成后清(loadSceneCommon)。
          gs.fEnteringScene = true
          _sceneLoader(cmd.sceneId).catch((err: unknown) => {
            console.error(`event-system: sceneLoader(${cmd.sceneId}) failed:`, err)
          })
          return
        }
        console.warn(
          `event-system: loadScene sceneId=${cmd.sceneId} 无 _sceneLoader 注入,skip(测试外 bootstrap 应 setSceneLoader)`,
        )
        cursor.ip++
        break
      }

      case 'setPalette': {
        // M4 P3.T2:真换调色板 —— 异步 fetch,fire-and-forget,tick 同步继续。
        // gs.palette 写入后渲染层下一帧 flushToCanvas 消费新色表。
        const paletteIdx = cmd.paletteIndex
        if (_fetchPalette) {
          const gsRef = gs
          _fetchPalette(paletteIdx)
            .then((p) => {
              gsRef.palette = p
            })
            .catch((err: unknown) => {
              console.warn(`event-system: fetchPalette(${paletteIdx}) failed:`, err)
            })
        }
        else {
          console.debug(
            `event-system: setPalette paletteIndex=${paletteIdx} ip=${cursor.ip}(fetchPalette 未注入)`,
          )
        }
        cursor.ip++
        break
      }

      case 'sequence':
      case 'if':
      case 'choice':
        throw new Error(`event-system: 结构化 op ${cmd.op} M2 未实现`)

      default: {
        const _exhaustive: never = cmd
        throw new Error(`event-system: unhandled op ${(_exhaustive as Command).op}`)
      }
    }
  }
}

/**
 * 同步跑一段命令(M3 T17,T20/T21 magic.scriptOnUse / item.scriptOnUse 用)。
 *
 * 与 tickEventSystem 区别:
 *  - 不依赖 GameState.eventCursor,自带局部 ip 推进
 *  - 不写 GameState.mode / dialogBox / party / scene(不变量见 plan T17)
 *  - 同步跑完(撞 end / 越界 / 超限 退出),不在 waitable 上等下一帧
 *  - showDialog 在 battle mode 改 emit showBattleMessage,**不阻塞**(ip++ 继续)
 *  - raw 沿用 D26 兜底 skip,console.debug 加 [event-system battle] 前缀
 *    方便 T20/T21 implementer grep 撞到的真实 opcode 号
 *
 * 战斗 opcode 具名 handler 延 T20/T21(等真跑 spell.scriptOnUse 撞到 raw 时再补)。
 */
export function runScript(opts: RunScriptOptions): void {
  const { commands, bus, runtimeMode, battleCtx } = opts
  let ip = opts.ip

  if (runtimeMode === 'battle' && !battleCtx) {
    throw new Error('runScript: runtimeMode=battle 必须提供 battleCtx')
  }
  if (runtimeMode === 'explore' && battleCtx) {
    throw new Error('runScript: runtimeMode=explore 不应传 battleCtx')
  }

  const logPrefix = runtimeMode === 'battle' ? '[event-system battle]' : '[event-system explore]'

  // 局部 labelMap —— goto 用;runScript 跑一段子脚本,labelMap 在全 commands 中查
  const labelMap = buildLabelMap(commands)

  let stepCount = 0
  while (true) {
    if (++stepCount > SINGLE_TICK_LIMIT) {
      throw new Error(
        `runScript: single-tick instruction limit (${SINGLE_TICK_LIMIT}) exceeded at ip=${ip}`,
      )
    }

    if (ip < 0 || ip >= commands.length) {
      console.warn(`${logPrefix} ip ${ip} 越界 → 退出`)
      return
    }

    const cmd = commands[ip]!

    switch (cmd.op) {
      case 'end':
        return

      case 'goto': {
        const target = labelMap[cmd.to]
        if (target === undefined) {
          throw new Error(`runScript: goto label ${cmd.to} 不在 labelMap`)
        }
        ip = target
        break
      }

      case 'showDialog': {
        if (runtimeMode === 'battle') {
          // 战斗中改 emit showBattleMessage,**不阻塞**(M3 简单实现;M5 可能更精细)
          bus.emit({ op: 'showBattleMessage', text: cmd.text })
          ip++
        } else {
          // explore 模式下,runScript 不持有 GameState,无法走 waiting=dialog 路径
          // 调用方应使用 tickEventSystem 跑探索 / 事件脚本,而不是 runScript
          throw new Error('runScript: showDialog in explore mode 应走 tickEventSystem')
        }
        break
      }

      case 'setDialogStyleTop':
      case 'setDialogStyleCenter':
      case 'setDialogStyleBottom':
      case 'setDialogStyleNarration':
        // battle mode 下 dialog style 没有意义(showBattleMessage 不分 style);no-op skip
        ip++
        break

      case 'raw': {
        // M5.B-w2.a:battle mode 先尝试 dispatchBattleOpcode(scripted enemy AI 入口)
        if (runtimeMode === 'battle' && battleCtx) {
          const r = dispatchBattleOpcode(cmd.opcode, cmd.operands, battleCtx)
          if (r.consumed) {
            ip = r.newIp !== undefined ? r.newIp : (ip + 1)
            break
          }
        }
        // D26:无具名 opcode 兜底 skip + console.debug;battle mode 加前缀方便
        // T20/T21 implementer grep 撞到的真实 opcode 号
        console.debug(`${logPrefix} skip raw opcode=${cmd.opcode} ip=${ip}`, cmd.operands)
        ip++
        break
      }

      case 'giveItem':
      case 'startBattle':
        // 战斗脚本里出现这些 op 不合理;沿用 M2 skip 行为
        console.debug(`${logPrefix} skip op=${cmd.op} ip=${ip}`)
        ip++
        break

      case 'loadScene':
        // M3.5 B 路线 stub:no-op skip + console.debug。test 在 T10 补全。
        console.debug(`${logPrefix} skip loadScene sceneId=${cmd.sceneId} ip=${ip}(B 路线 stub)`)
        ip++
        break

      case 'setPalette':
        // runScript 是 battle-mode 子脚本执行路径,setPalette 在战斗中无意义;no-op skip。
        console.debug(`${logPrefix} skip setPalette paletteIndex=${cmd.paletteIndex} ip=${ip}`)
        ip++
        break

      case 'sequence':
      case 'if':
      case 'choice':
        throw new Error(`runScript: 结构化 op ${cmd.op} M3 未实现`)

      default: {
        const _exhaustive: never = cmd
        throw new Error(`runScript: unhandled op ${(_exhaustive as Command).op}`)
      }
    }
  }
}

// ── P0.e: opcode 7 startBattle 调度(handler 注入,避免污染 event-system 的 import 图)──
//
// sdlpal script.c:3318:`PAL_StartBattle(operand[0], !operand[2])`
// operand[0]=enemyTeamId;operand[2]=flee 跳转目标(也兼"是否允许逃跑"标志,非 0 = 允许)。
// → isBoss = !operand[2](operand[2]==0 → 不可逃跑)
//
// 简化版(P0.e 范围):切 mode 'battle' + 释放 cursor;不 resume cursor.ip 跑 onLose/onFlee。
// 真做战后 resume 留 M5 P1-Battle B-w0 系列(`wScriptOnWin/Lose` cleanup 一并)。
function tryStartBattle(gs: GameState, enemyTeamId: number, fleeArg: number): void {
  if (!_startBattleHandler) {
    console.warn(
      `event-system: opcode 7 startBattle handler 未注入,跳过 (enemyTeamId=${enemyTeamId})。`
      + ' 测试外 bootstrap 应 setStartBattleHandler。',
    )
    return
  }
  const isBoss = fleeArg === 0  // sdlpal !operand[2]:operand[2]==0 → isBoss true
  console.debug(`event-system: startBattle enemyTeamId=${enemyTeamId} isBoss=${isBoss}`)
  _startBattleHandler({ gs, enemyTeamId, isBoss })
}

// ── P0.e: applyRawOpcode + runEnterScript ──────────────────────────────────
//
// applyRawOpcode: 6 wScriptOnEnter opcode 真生效;其余 D26 兜底 skip(console.debug)。
// 供 tickEventSystem(raw case)和 runEnterScript 共用,避免重复逻辑。

/** u16 → signed i16(sdlpal `(SHORT)` cast 真值)。 */
function signExtendI16(u: number): number {
  return u & 0x8000 ? u - 0x10000 : u
}

/** I-w1.a 共用 helper:inventory 加/减(qty signed)。port sdlpal global.c:1063-1172 PAL_AddItemToInventory。
 *  - **qty == 0 → 1**(sdlpal global.c:1094-1097 真值;giveItem 反编译 count=0 实际给 1 个,
 *    这是 user 2026-05-29 "调查柜子获得净衣符但列表空" 根因之一)
 *  - qty > 0:已有 → count+=qty(max 99 clamp,sdlpal global.c:1123/1128);无则 push 新条目(99 clamp)
 *  - qty < 0:已有 → count clamp 到 0;无则 no-op(简版,不做 sdlpal equipment fallback)
 *  注:itemId 用 ts items.json id(0..234);id 0 = 观音符是真物品,**不** skip(sdlpal
 *  `wObjectID==0` 哨兵是 sdlpal OBJECT id 体系,pal-extract 反编译已转 ts id)。 */
export function addItemToInventory(gs: GameState, itemId: number, qty: number): void {
  // sdlpal global.c:1094 真值:iNum == 0 → 1
  if (qty === 0) qty = 1
  const entry = gs.inventory.find((e) => e.itemId === itemId)
  if (entry) {
    entry.count = Math.min(99, Math.max(0, entry.count + qty))
    if (entry.count === 0) {
      gs.inventory = gs.inventory.filter((e) => e.itemId !== itemId)
    }
  } else if (qty > 0) {
    gs.inventory.push({ itemId, count: Math.min(99, qty) })
  }
}

/** Export for menu-driver(M5.6 session 3:大世界 PAL_GameUseItem 等价 — 物品消耗 / 装备脚本)。 */
export function consumeItemFromInventory(gs: GameState, itemId: number): void {
  addItemToInventory(gs, itemId, -1)
}

/**
 * 大世界用物品 — sdlpal `play.c:244-325` PAL_GameUseItem 真值简版。
 *
 * sdlpal 真值流程(item.flags.applyToAll 分支):
 *  - applyToAll=false:PAL_ItemUseMenu 选 player → PAL_RunTriggerScript(scriptOnUse, wPlayer)
 *  - applyToAll=true: 跳过 picker,直接 PAL_RunTriggerScript(scriptOnUse, 0xFFFF)
 *  - if (item.flags.consuming && g_fScriptSuccess) PAL_AddItemToInventory(itemId, -1)
 *
 * ts 简版:不跟 sdlpal `while (true)` 循环(用完一个继续选下一个);使用一次后退出。
 * 用 `0xFFFF` 表 sdlpal 真值 applyToAll(wEventObjectID=0xFFFF)。
 *
 * 返回 false:scriptOnUse=0 / labelMap 缺失 — 调用方应不消耗物品并 warn。
 * 返回 true: 已设置 gs.eventCursor + mode='event';调用方应清 menuStack。
 */
export function startOverworldItemScript(
  gs: GameState,
  itemId: number,
  scriptOnUse: number,
  targetRoleIdOrAll: number | 0xFFFF,
  consuming: boolean,
): boolean {
  if (scriptOnUse === 0) {
    console.warn(`[item-use] scriptOnUse=0 for itemId=${itemId},不可用`)
    return false
  }
  const labelMap = getSharedLabelMap()
  const ip = labelMap[`L_${scriptOnUse}`]
  if (ip === undefined) {
    console.warn(
      `[item-use] L_${scriptOnUse} 不在 shared.json labelMap(itemId=${itemId})— `
      + `pal-extract sliceByScene globalEntries 是否漏收?`,
    )
    return false
  }
  // sdlpal play.c:298-302 真值:g_fScriptSuccess 决定是否扣;ts 简版立即扣(脚本失败时不可逆,
  // M6 真做加 success 回调跟踪)。
  if (consuming) {
    addItemToInventory(gs, itemId, -1)
  }
  gs.eventCursor = {
    commands: getSharedCommands(),
    labelMap,
    ip,
    // sdlpal `script.c:3140 wEventObjectID` 参数 — items 上下文里是 wPlayer(0-based role id)或
    // 0xFFFF(applyToAll)。NPC trigger 用 1-based NPC id;opcode handler 自行按 op 区分语义。
    currentEventObjectId: targetRoleIdOrAll,
  }
  gs.mode = 'event'
  return true
}

/**
 * A2 条件跳转的统一跳转:目标是全局 script entry 号(operand 原值),经当前 scene labelMap
 * 解析成 local ip。设 cursor.ip = idx - 1(caller 跑完 applyRawOpcode 后 ip++ → idx)。
 * 对齐 sdlpal jump opcode `wScriptEntry = target - 1` + PAL_InterpretInstruction 末尾 +1。
 */
function jumpToGlobalIp(gs: GameState, globalIp: number): void {
  const cursor = gs.eventCursor
  if (!cursor) return
  const idx = cursor.labelMap[`L_${globalIp}`]
  if (idx !== undefined) cursor.ip = idx - 1
  else console.debug(`event-system: jump target L_${globalIp} 不在 labelMap(跳转失效)`)
}

/** 背包内某 item 总数(sdlpal PAL_GetItemAmount 等价)。 */
function countInventoryItem(gs: GameState, itemId: number): number {
  let n = 0
  for (const e of gs.inventory) {
    if (e.itemId === itemId) n += e.count
  }
  return n
}

/**
 * role 是否中毒(sdlpal PAL_IsPlayerPoisonedByKind / ByLevel(role,0) 等价)。
 * poisonKind 给定 → 只看该种毒(ByKind);省略 → 任意毒(ByLevel 0)。rgPoisonStatus 16 槽/role。
 */
function isPlayerPoisoned(gs: GameState, roleId: number, poisonKind?: number): boolean {
  for (let slot = 0; slot < 16; slot++) {
    const p = gs.rgPoisonStatus[`${slot}_${roleId}`]
    if (!p || p.wPoisonID === 0) continue
    if (poisonKind === undefined || p.wPoisonID === poisonKind) return true
  }
  return false
}

/** sdlpal `PAL_AddMagic`(global.c:2084):已学 → no-op;否则填第一个空槽(spell wObjectID)。 */
function addMagicToRole(gs: GameState, roleId: number, spellObjId: number): void {
  const rgwMagic = gs.PlayerRolesRuntime.rgwMagic
  const numRoles = rgwMagic[0]?.length ?? 0
  if (roleId < 0 || roleId >= numRoles || spellObjId === 0) return
  // 已学该法术 → no-op
  for (const slot of rgwMagic) {
    if (slot?.[roleId] === spellObjId) return
  }
  // 填第一个空槽(0 = 空)
  for (const slot of rgwMagic) {
    if ((slot?.[roleId] ?? 0) === 0) {
      slot[roleId] = spellObjId
      return
    }
  }
  // 槽满 → 失败(sdlpal 返回 FALSE)
}

/** sdlpal `PAL_RemoveMagic`(global.c:2139):找到该 spell 的槽置 0(不移位)。 */
function removeMagicFromRole(gs: GameState, roleId: number, spellObjId: number): void {
  const rgwMagic = gs.PlayerRolesRuntime.rgwMagic
  const numRoles = rgwMagic[0]?.length ?? 0
  if (roleId < 0 || roleId >= numRoles) return
  for (const slot of rgwMagic) {
    if (slot?.[roleId] === spellObjId) {
      slot[roleId] = 0
      return
    }
  }
}

function applyRawOpcode(
  gs: GameState,
  opcode: number,
  operands: [number, number, number],
  /**
   * 当前 trigger 的 event object id(sdlpal `wCurEventObjectID` / `pCurrent`)。
   * 用于 OP_SET_OBJECT_POS / OP_SET_EVENT_OBJECT_DIR / OP_NPC_WALK_ONE_STEP 作用于 self。
   * undefined 表示无 self context(runEnterScript 从 onEnter 跑时无 trigger NPC);
   * 此种情况下 self-ops 视为 no-op + warn。
   */
  currentEventObjectId?: number,
): void {
  switch (opcode) {
    case OP_SET_PARTY_POS: {
      // sdlpal script.c:1665-1700 真值:operand=(col,row,h) → world.x = col*32+h*16,
      // world.y = row*16+h*8;viewport = world - partyoffset(party 在 screen anchor)。
      const [col, row, h] = operands
      const px = (col ?? 0) * 32 + (h ?? 0) * 16
      const py = (row ?? 0) * 16 + (h ?? 0) * 8
      gs.party.x = px
      gs.party.y = py
      gs.camera.x = px - PARTYOFFSET_X
      gs.camera.y = py - PARTYOFFSET_Y
      console.debug(`event-system: setPartyPos col=${col} row=${row} h=${h} → px=${px} py=${py}`)
      break
    }

    case OP_SET_PARTY_DIRECTION: {
      // sdlpal script.c:732-739 真值:setPartyDirectionAndFrame
      //   wPartyDirection = operand[0];
      //   rgParty[operand[2]].wFrame = wPartyDirection * 3 + operand[1]
      const dirCode = operands[0] ?? 0
      const frameOffset = operands[1] ?? 0
      const memberIdx = operands[2] ?? 0
      const facing = SDLPAL_DIR_TO_FACING[dirCode] ?? 'down'
      gs.party.facing = facing
      // wFrame = dir * 3 + frameOffset(sdlpal walkFrames default 3)
      gs.partyScriptedFrame[memberIdx] = dirCode * 3 + frameOffset
      console.debug(
        `event-system: setPartyDirectionAndFrame dir=${dirCode} frameOff=${frameOffset} member=${memberIdx}`
        + ` → facing=${facing} wFrame=${gs.partyScriptedFrame[memberIdx]}`,
      )
      break
    }

    case OP_SET_CAMERA: {
      const [cx, cy, flag] = operands
      if ((cx ?? 0) === 0 && (cy ?? 0) === 0) {
        gs.camera.x = gs.party.x - PARTYOFFSET_X
        gs.camera.y = gs.party.y - PARTYOFFSET_Y
        console.debug('event-system: centerCameraOnParty')
      }
      else if (flag === 0xFFFF) {
        // Absolute set: camera follows party in System A
        gs.camera.x = gs.party.x - PARTYOFFSET_X
        gs.camera.y = gs.party.y - PARTYOFFSET_Y
        console.debug(`event-system: setCamera col=${cx} row=${cy} → follows party`)
      }
      else {
        // Relative move (animated): no-op, log only
        console.debug(`event-system: setCamera relative dx=${cx} dy=${cy} (skip)`)
      }
      break
    }

    case OP_PLAY_MUSIC: {
      const musicId = operands[0] ?? 0
      gs.wNumMusic = musicId
      console.debug(`event-system: playMusic id=${musicId} (M6 接真播)`)
      break
    }

    case OP_SET_SCENE_OBJECT_STATE: {
      // sdlpal script.c:1711-1717:if (operand[0] != 0) pCurrent->sState = operand[1]
      // operand[0] 作 enabled 标志 + 选 NPC(走 resolveTargetNpc)
      if ((operands[0] ?? 0) === 0) {
        console.debug('event-system: setSceneObjectState operand[0]==0 → no-op')
        break
      }
      const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'setSceneObjectState')
      if (npc) {
        npc.sState = operands[1] ?? 0
        console.debug(`event-system: setSceneObjectState id=${npc.id} sState=${npc.sState}`)
      }
      break
    }

    case OP_ADD_CASH: {
      // sdlpal script.c:952-968 真值:operand[0] signed amount(SHORT cast)。
      // 简版:不做 "cash 不足 goto" 分支(operand[1] = onFail label);chest 主要 use 是 add positive。
      const amount = signExtendI16(operands[0] ?? 0)
      gs.dwCash = Math.max(0, gs.dwCash + amount)
      console.debug(`event-system: addCash amount=${amount} → dwCash=${gs.dwCash}`)
      break
    }

    case OP_ADD_ITEM: {
      // sdlpal script.c:970-975:PAL_AddItemToInventory(itemId, qty);qty signed。
      const itemId = operands[0] ?? 0
      const qty = signExtendI16(operands[1] ?? 0)
      addItemToInventory(gs, itemId, qty)
      console.debug(`event-system: addItem id=${itemId} qty=${qty}`)
      break
    }

    case OP_REMOVE_ITEM: {
      // sdlpal script.c:977+:operand[0]=itemId, operand[1]=qty(0→1), operand[2]=consumeEquipped。
      // 简版:不消费 equipment,只从 inventory 走 negative add。
      const itemId = operands[0] ?? 0
      const qty = (operands[1] ?? 0) === 0 ? 1 : (operands[1] ?? 0)
      addItemToInventory(gs, itemId, -qty)
      console.debug(`event-system: removeItem id=${itemId} qty=${qty}`)
      break
    }

    case OP_PLAY_SOUND: {
      // sdlpal script.c:1704-1709:AUDIO_PlaySound(operand[0])。M6 接音频。
      console.debug(`event-system: playSound id=${operands[0] ?? 0}(M6 接音频系统)`)
      break
    }

    case OP_SET_OBJECT_POS_REL_PARTY: {
      // sdlpal script.c:706-714 真值:pCurrent.x = operand[1] + viewport.x + partyoffset.x
      //   = operand[1] + party.x(因为 party.world = viewport + partyoffset)
      const npc = resolveTargetNpc(gs, 0, currentEventObjectId, 'setObjectPosRelParty')
      if (npc) {
        npc.x = (operands[1] ?? 0) + gs.party.x
        npc.y = (operands[2] ?? 0) + gs.party.y
        console.debug(`event-system: setObjectPosRelParty id=${npc.id} → (${npc.x},${npc.y})`)
      }
      break
    }

    case OP_SET_AUTO_SCRIPT: {
      // sdlpal:if (operand[0] != 0) pCurrent.wAutoScript = operand[1]
      // operand[0] 既是 enabled 标志,也用于 resolveTargetNpc 选 NPC(operand[0]==0 → self)。
      if ((operands[0] ?? 0) === 0) {
        console.debug('event-system: setAutoScript operand[0]==0 → no-op')
        break
      }
      const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'setAutoScript')
      if (npc) {
        const entry = operands[1] ?? 0
        if (entry === 0) {
          npc.autoLabel = undefined
          npc.autoCursor = undefined
          console.debug(`event-system: setAutoScript id=${npc.id} 清空(op1=0)`)
        }
        else {
          // operand[1] 是**全局** script entry。切片后 commands 重排成本地索引,全局 entry
          // 经 `L_<entry>` label 映射到当前 scene labelMap 的本地 ip(同 autoLabel 解析路径)。
          // 不能拿全局 entry 当本地 ip 直接用(旧 bug:autoCursor.ip 落到错误命令)。
          const label = `L_${entry}`
          npc.autoLabel = label
          // 先查当前 scene labelMap;多 scene 共用地图时该脚本可能被提升到 shared(eg. 苗人头领
          // L_406 被 scene-001/003 共引 → shared)→ 回退查 shared,标 cursor.shared=true。
          const localIp = gs.sceneLabelMap?.[label]
          const sharedIp = localIp === undefined ? getSharedLabelMap()[label] : undefined
          if (localIp !== undefined) {
            npc.autoCursor = { ip: localIp }
          }
          else if (sharedIp !== undefined) {
            npc.autoCursor = { ip: sharedIp, shared: true }
          }
          else {
            npc.autoCursor = undefined
            console.warn(
              `event-system: setAutoScript id=${npc.id} ${label} 不在 scene/shared labelMap`
              + `(目标脚本可能被切片剪掉 — 检查 JUMP_TARGET_OPERAND 是否含 0x24)`,
            )
          }
          console.debug(
            `event-system: setAutoScript id=${npc.id} ${label} → `
            + (localIp !== undefined ? `localIp=${localIp}` : `sharedIp=${sharedIp}`),
          )
        }
      }
      break
    }

    case OP_BUY_MENU:
    case OP_SELL_MENU: {
      // M5.M-w3.a 简版:console.debug stub。真做要 emit 'showShopMenu' command +
      // 进 waiting='shop' phase 等 dev panel / UI 弹 BuyMenu / SellMenu confirm。
      console.debug(`event-system: ${opcode === OP_BUY_MENU ? 'buy' : 'sell'} menu`
        + ` operand=${operands.join(',')}(menu UI 真接入留 follow-up)`)
      break
    }

    case OP_SHAKE_SCREEN: {
      // sdlpal script.c:相关 真值:operand[0]=duration,operand[1]=intensity(默认 4)。
      // M5 简版:stub,console.debug 标 frames + intensity,present 层不实接抖动(留 follow-up)。
      const duration = operands[0] ?? 0
      const intensity = (operands[1] ?? 0) === 0 ? 4 : (operands[1] ?? 0)
      console.debug(`event-system: shakeScreen duration=${duration} intensity=${intensity}(present 层 stub)`)
      break
    }

    case OP_NPC_WALK_ONE_STEP_SOUTH:
    case OP_NPC_WALK_ONE_STEP_WEST:
    case OP_NPC_WALK_ONE_STEP_NORTH:
    case OP_NPC_WALK_ONE_STEP_EAST: {
      // sdlpal script.c:652-661 真值:dir = opcode - 0x000B(0=S, 1=W, 2=N, 3=E),
      //   pEvtObj.wDirection = dir;PAL_NPCWalkOneStep(wEventObjectID, 2)
      // scene.c:804-805 方向位移真值:
      //   S→(-16,+8) W→(-16,-8) N→(+16,-8) E→(+16,+8)
      const npc = resolveTargetNpc(gs, 0, currentEventObjectId, 'npcWalkOneStepDir')
      if (npc) {
        const dirCode = opcode - 0x000B  // 0..3
        const FACINGS = ['down', 'left', 'up', 'right'] as const
        const DELTAS = [[-16, 8], [-16, -8], [16, -8], [16, 8]] as const
        npc.facing = FACINGS[dirCode]
        const delta = DELTAS[dirCode]
        if (delta) {
          npc.x += delta[0]
          npc.y += delta[1]
        }
        // 同 0x6C handler:推进 scriptedFrame mod 4 — 走路帧循环
        npc.scriptedFrame = ((npc.scriptedFrame ?? -1) + 1) % 4
        console.debug(
          `event-system: walkOneStep dir=${FACINGS[dirCode]} id=${npc.id} → (${npc.x},${npc.y})`,
        )
      }
      break
    }

    case OP_SET_BATTLE_FIELD: {
      // sdlpal script.c:1719:`gpGlobals->wNumBattleField = pScript->rgwOperand[0];`
      // 进 scene wScriptOnEnter 时写;后续 opcode 7 startBattle 取此值作 battleFieldId。
      const battleFieldId = operands[0] ?? 0
      gs.wNumBattleField = battleFieldId
      console.debug(`event-system: setBattlefield id=${battleFieldId}`)
      break
    }

    // ── Sync.2 fix3/fix4: cutscene opcode(scene 1 onEnter 高频用) ─────────────
    //
    // **fix4 真值**(port sdlpal script.c:608-639 PAL_InterpretInstruction 入口解析):
    //   pCurrent = (operand[0] == 0 || operand[0] == 0xFFFF)
    //            ? pEvtObj                                          // self,即调用方传的 wEventObjectID
    //            : &lprgEventObject[operand[0] - 1];                // 1-based 全局 NPC id
    //
    // 即每条 opcode 自带 NPC 选择器。两类:
    //  - 用 pCurrent(operand[0] 选 NPC):0x13 / 0x16 / 0x6C
    //  - 用 pEvtObj 强制 self(operand[0]/[1] 是数据,不是 NPC id):0xF / 0x14
    //
    // resolveTargetNpc(...) 仅给 pCurrent 类用。pEvtObj 类直接用 currentEventObjectId。

    case OP_SET_OBJECT_POS: {
      // sdlpal script.c:716-722:`pCurrent->x = operand[1]; pCurrent->y = operand[2]`
      // pCurrent 由 operand[0] 选(fix4)
      const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'setObjectPos')
      if (npc) {
        npc.x = operands[1] ?? 0
        npc.y = operands[2] ?? 0
        console.debug(`event-system: setObjectPos id=${npc.id} → (${npc.x},${npc.y})`)
      }
      break
    }

    case OP_SET_OBJECT_GESTURE: {
      // sdlpal script.c:724-730:
      //   pEvtObj->wCurrentFrameNum = operand[0];          // operand[0] 是 frame
      //   pEvtObj->wDirection = kDirSouth(强制朝南)
      // **pEvtObj 类:operand[0] 是数据,不是 NPC id**;只能作用 self。
      const npc = getSelfNpc(gs, currentEventObjectId, 'setObjectGesture')
      if (npc) {
        npc.scriptedFrame = operands[0] ?? 0
        npc.facing = 'down'  // sdlpal 强制 kDirSouth
        console.debug(`event-system: setObjectGesture id=${npc.id} frame=${npc.scriptedFrame} dir=down`)
      }
      break
    }

    case OP_SET_EVENT_OBJECT_DIR_AND_FRAME: {
      // sdlpal script.c:741-750:
      //   if (operand[0] != 0):
      //     pCurrent->wDirection = operand[1]
      //     pCurrent->wCurrentFrameNum = operand[2]
      // operand[0] 既是"enabled 标志"又是 pCurrent 的 NPC id(fix4 入口解析逻辑)
      // operand[0]==0 → no-op(sdlpal silent skip)
      if ((operands[0] ?? 0) === 0) {
        console.debug('event-system: setEventObjectDirAndFrame operand[0]==0 → no-op')
        break
      }
      const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'setEventObjectDirAndFrame')
      if (npc) {
        const dirCode = operands[1] ?? 0
        const frame = operands[2] ?? 0
        npc.facing = SDLPAL_DIR_TO_FACING[dirCode] ?? 'down'
        npc.scriptedFrame = frame
        console.debug(`event-system: setEventObjectDirAndFrame id=${npc.id} dir=${dirCode} frame=${frame}`)
      }
      break
    }

    case OP_SET_EVENT_OBJECT_DIR_OR_FRAME: {
      // sdlpal script.c:663-675:
      //   if (operand[0] != 0xFFFF) pEvtObj->wDirection = operand[0]
      //   if (operand[1] != 0xFFFF) pEvtObj->wCurrentFrameNum = operand[1]
      // **pEvtObj 类:operand[0]/[1] 是数据(dir / frame),不是 NPC id**;只能作用 self。
      const npc = getSelfNpc(gs, currentEventObjectId, 'setEventObjectDirOrFrame')
      if (npc) {
        if (operands[0] !== 0xFFFF) {
          const dirCode = operands[0] ?? 0
          npc.facing = SDLPAL_DIR_TO_FACING[dirCode] ?? 'down'
        }
        if (operands[1] !== 0xFFFF) {
          npc.scriptedFrame = operands[1] ?? 0
        }
        console.debug(
          `event-system: setEventObjectDirOrFrame id=${npc.id} op0=${operands[0]} op1=${operands[1]}`
          + ` → facing=${npc.facing} frame=${npc.scriptedFrame}`,
        )
      }
      break
    }

    case OP_NPC_WALK_ONE_STEP: {
      // sdlpal script.c:2056-2063:
      //   pCurrent.x += SHORT(operand[1])
      //   pCurrent.y += SHORT(operand[2])
      //   PAL_NPCWalkOneStep(wCurEventObjectID, 0)
      // pCurrent 由 operand[0] 选(fix4)
      const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'npcWalkOneStep')
      if (npc) {
        const dx = toInt16(operands[1] ?? 0)
        const dy = toInt16(operands[2] ?? 0)
        npc.x += dx
        npc.y += dy
        // Sync.2 fix5:port sdlpal `PAL_NPCWalkOneStep(id, 0)`(scene.c:893-902):
        //   wCurrentFrameNum++ + 循环模(nSpriteFrames=3 → mod 4;否则 mod nSpriteFrames)
        // M5 简版:从 undefined 起始 0,循环 mod 4(NPC sprite 通常 4 帧 = 4 dirs × 1 / 或 4 步动画)
        //         真 nSpriteFrames 由渲染层从 ctx.npcSpriteFrames 反查;event-system 拿不到 ctx,
        //         默认 mod 4 已足以让"走 5 步动画 0→1→2→3→0→1"循环视觉。
        const next = ((npc.scriptedFrame ?? -1) + 1) % 4
        npc.scriptedFrame = next
        console.debug(
          `event-system: npcWalkOneStep id=${npc.id} d=(${dx},${dy}) → (${npc.x},${npc.y})`
          + ` frame=${next}`,
        )
      }
      break
    }

    case OP_MOVE_OBJECT: {
      // sdlpal script.c:2277-2283:pCurrent->x += SHORT(op1); pCurrent->y += SHORT(op2)
      // pCurrent = operand[0] 选(0/0xFFFF → self)
      const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'moveObject')
      if (npc) {
        npc.x += toInt16(operands[1] ?? 0)
        npc.y += toInt16(operands[2] ?? 0)
        console.debug(`event-system: moveObject id=${npc.id} → (${npc.x},${npc.y})`)
      }
      break
    }

    case OP_SET_OBJECT_LAYER: {
      // sdlpal script.c:2285-2290:pCurrent->sLayer = SHORT(op1)
      const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'setObjectLayer')
      if (npc) {
        npc.sLayer = toInt16(operands[1] ?? 0)
        console.debug(`event-system: setObjectLayer id=${npc.id} sLayer=${npc.sLayer}`)
      }
      break
    }

    case OP_ANIMATE_OBJECT: {
      // sdlpal script.c:2540-2545:PAL_NPCWalkOneStep(wCurEventObjectID, 0)
      // iSpeed=0 → 仅推进动画帧(scene.c:893-902),不位移。wCurEventObjectID = operand[0] 选。
      const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'animateObject')
      if (npc) {
        npc.scriptedFrame = ((npc.scriptedFrame ?? -1) + 1) % 4
        console.debug(`event-system: animateObject id=${npc.id} frame=${npc.scriptedFrame}`)
      }
      break
    }

    case OP_NULLIFY_OBJECT: {
      // sdlpal script.c:1726-1731:pEvtObj->sVanishTime = -15(短暂消失)。pEvtObj = self。
      const npc = getSelfNpc(gs, currentEventObjectId, 'nullifyObject')
      if (npc) {
        npc.sVanishTime = -15
        console.debug(`event-system: nullifyObject id=${npc.id} sVanishTime=-15`)
      }
      break
    }

    case OP_HIDE_OBJECT: {
      // sdlpal script.c:1794-1800:pEvtObj->sState *= -1; sVanishTime = op0 ? op0 : 800。pEvtObj = self。
      const npc = getSelfNpc(gs, currentEventObjectId, 'hideObject')
      if (npc) {
        npc.sState = -(npc.sState ?? 1)
        npc.sVanishTime = (operands[0] ?? 0) ? (operands[0] ?? 0) : 800
        console.debug(`event-system: hideObject id=${npc.id} sState=${npc.sState} sVanishTime=${npc.sVanishTime}`)
      }
      break
    }

    case OP_CHASE_PAUSE: {
      // sdlpal script.c:1967-1973:wChasespeedChangeCycles = op0; wChaseRange = 0(暂停追击)
      gs.wChasespeedChangeCycles = operands[0] ?? 0
      gs.wChaseRange = 0
      console.debug(`event-system: chasePause cycles=${gs.wChasespeedChangeCycles}`)
      break
    }

    case OP_CHASE_SPEEDUP: {
      // sdlpal script.c:1975-1981:wChasespeedChangeCycles = op0; wChaseRange = 3(加速追击)
      gs.wChasespeedChangeCycles = operands[0] ?? 0
      gs.wChaseRange = 3
      console.debug(`event-system: chaseSpeedup cycles=${gs.wChasespeedChangeCycles}`)
      break
    }

    case OP_MONSTER_CHASE: {
      // sdlpal script.c:1733-1751:i=op0(max dist,默认 8)/ j=op1(speed,默认 4),
      //   PAL_MonsterChasePlayer(wEventObjectID, j, i, op2)。怪追 party 1 步(self = trigger NPC)。
      const npc = getSelfNpc(gs, currentEventObjectId, 'monsterChase')
      if (npc) {
        const maxDist = (operands[0] ?? 0) || 8
        const speed = (operands[1] ?? 0) || 4
        monsterChasePlayer(gs, npc, speed, maxDist, (operands[2] ?? 0) !== 0)
        console.debug(`event-system: monsterChase id=${npc.id} speed=${speed} maxDist=${maxDist} → (${npc.x},${npc.y})`)
      }
      break
    }

    case OP_PLAYER_WALK_ONE_STEP: {
      // sdlpal script.c:2091-2113:
      //   trail unshift + party.x += SHORT(operand[0]), party.y += SHORT(operand[1])
      //   wLayer = operand[2] * 8
      //   若 operand[0]/[1] 非 0 → PAL_UpdatePartyGestures(TRUE) 更新 stepFrame
      const dx = toInt16(operands[0] ?? 0)
      const dy = toInt16(operands[1] ?? 0)

      // trail unshift(P0.d:port sdlpal scene.c:823-830,trail 长度 ≤ 5)
      gs.trail.unshift({
        x: gs.party.x,
        y: gs.party.y,
        dir: gs.party.facing,
      })
      if (gs.trail.length > 5) gs.trail.length = 5

      gs.party.x += dx
      gs.party.y += dy
      gs.camera.x = gs.party.x - PARTYOFFSET_X
      gs.camera.y = gs.party.y - PARTYOFFSET_Y
      gs.wLayer = (operands[2] ?? 0) * 8

      if (dx !== 0 || dy !== 0) {
        // sdlpal PAL_UpdatePartyGestures(TRUE):推进 stepFrame
        gs.walkingFrame.walking = true
        gs.walkingFrame.stepFrame = (gs.walkingFrame.stepFrame + 1) % 4
      }
      console.debug(`event-system: playerWalkOneStep d=(${dx},${dy}) wLayer=${gs.wLayer}`)
      break
    }

    case OP_SET_PLAYER_SPRITE: {
      // sdlpal script.c:1999-2004:
      //   PlayerRoles.rgwSpriteNum[operand[0]] = operand[1]
      //   if (!fInBattle && operand[2]) PAL_LoadResources()  // hot-reload sprite
      // 用于剧情期间切主角 pose sprite group(捂头 / 倒地 / 大侠 等)。
      //
      // M5 简版:只支持队长(operand[0]=0)— 多 player 切 sprite 留 M6。
      // 写 gs.partyLeaderSpriteId,present.ts 渲染优先用此值(覆盖 bootstrap ctx.partyFrames)。
      const playerIdx = operands[0] ?? 0
      const spriteId = operands[1] ?? 0
      if (playerIdx === 0) {
        gs.partyLeaderSpriteId = spriteId
      }
      console.debug(`event-system: setPlayerSprite player=${playerIdx} spriteId=${spriteId}`)
      break
    }

    // ── M5.6 session 3:item.scriptOnUse / scriptOnEquip 真值 opcode(sdlpal script.c:867-1404)──

    case OP_JUMP_BY_RATE: {
      // sdlpal script.c:3299-3312:if RandomLong(1,100) >= operand[0] → jump operand[1]
      const rate = operands[0] ?? 0
      const targetIp = operands[1] ?? 0
      if (Math.floor(Math.random() * 100) + 1 >= rate) {
        // 跳转 — 但 applyRawOpcode 是 cursor.ip 已 ip++ 的;调用方需用 label 系统
        // 实际:tickEventSystem 推 ip 是默认 ip++;我们这里改写 cursor.ip 让下一帧从 targetIp 走。
        // 简化:gs.eventCursor 直接改 ip(注意 targetIp 是 sdlpal global IP — 经 disasm 后用 L_ 查)
        const labelMap = gs.eventCursor?.labelMap
        if (labelMap) {
          const idx = labelMap[`L_${targetIp}`]
          if (idx !== undefined && gs.eventCursor) {
            gs.eventCursor.ip = idx - 1 // ip++ 被 default 自动加,这里减 1 抵消
            console.debug(`event-system: jumpByRate rate=${rate} hit → ip=L_${targetIp} (${idx})`)
            return
          }
        }
        console.debug(`event-system: jumpByRate rate=${rate} hit but L_${targetIp} 不在 labelMap`)
      }
      else {
        console.debug(`event-system: jumpByRate rate=${rate} miss → fall through`)
      }
      break
    }

    case OP_SET_PLAYER_EXTRA_ATTR: {
      // sdlpal script.c:752-766 真值:
      //   i = op[0] - 0xB;
      //   p = (WORD*)&gpGlobals->rgEquipmentEffect[i];
      //   p[op[1] * MAX_PLAYER_ROLES + role] = SHORT(op[2])
      // op[1] 是 sdlpal global.h tagPLAYERROLES row index — 真值见 equip-effect.ts PLAYERROLES_ROW。
      const partIdx = (operands[0] ?? 0) - 0x0B
      const rowIdx = operands[1] ?? 0
      const value = signExtendI16(operands[2] ?? 0)
      const roleId = currentEventObjectId
      if (roleId === undefined || roleId === 0xFFFF) {
        console.warn(`event-system: setPlayerExtraAttr no role context`)
        break
      }
      writeEquipmentEffectField(gs, partIdx, rowIdx, roleId, value)
      console.debug(`event-system: setPlayerExtraAttr part=${partIdx} row=${rowIdx} role=${roleId} =${value}`)
      break
    }

    case OP_EQUIP_ITEM: {
      // sdlpal script.c:768-811 真值:
      //   i = op[0] - 0xB; g_iCurEquipPart = i; PAL_RemoveEquipmentEffect(role, i);
      //   if (rgwEquipment[i][role] != op[1])
      //     swap inventory + rgwEquipment[i][role] = op[1] + wLastUnequippedItem = old
      const slot = (operands[0] ?? 0) - 0x0B
      const newItem = operands[1] ?? 0
      const roleId = currentEventObjectId
      if (roleId === undefined || roleId === 0xFFFF) {
        console.warn(`event-system: equipItem no role context`)
        break
      }
      if (slot < 0 || slot >= 6) {
        console.warn(`event-system: equipItem invalid slot=${slot}(op[0]=${operands[0]})`)
        break
      }
      // sdlpal script.c:773-778 真值:iCurEquipPart + removeEquipmentEffect 入口先做
      gs.iCurEquipPart = slot
      removeEquipmentEffect(gs, roleId, slot)
      const eqRow = gs.PlayerRolesRuntime.rgwEquipment[slot]
      if (!eqRow) break
      const oldItem = eqRow[roleId] ?? 0
      if (oldItem !== newItem) {
        eqRow[roleId] = newItem
        addItemToInventory(gs, newItem, -1)
        if (oldItem !== 0) addItemToInventory(gs, oldItem, 1)
        // sdlpal script.c:809 真值 — swap 后写 wLastUnequippedItem
        gs.wLastUnequippedItem = oldItem
      }
      console.debug(`event-system: equipItem role=${roleId} slot=${slot} ${oldItem}→${newItem}`)
      break
    }

    case OP_INCREASE_PLAYER_ATTR: {
      // sdlpal script.c:813-832:p[op[0] * MAX_PLAYER_ROLES + role] += SHORT(op[1])
      // role = (op[2] == 0) ? wEventObjectID : op[2] - 1
      const fieldIdx = operands[0] ?? 0
      const delta = signExtendI16(operands[1] ?? 0)
      const roleId = (operands[2] ?? 0) === 0
        ? currentEventObjectId
        : ((operands[2] ?? 0) - 1)
      if (roleId === undefined || roleId === 0xFFFF) {
        console.warn(`event-system: increasePlayerAttr no role context`)
        break
      }
      mutatePlayerStat(gs, roleId, fieldIdx, (cur) => cur + delta)
      console.debug(`event-system: increasePlayerAttr role=${roleId} field=${fieldIdx} +=${delta}`)
      break
    }

    case OP_SET_PLAYER_STAT: {
      // sdlpal script.c:834-865:p[op[0] * MAX_PLAYER_ROLES + role] = SHORT(op[1])
      const fieldIdx = operands[0] ?? 0
      const newVal = signExtendI16(operands[1] ?? 0)
      const roleId = (operands[2] ?? 0) === 0
        ? currentEventObjectId
        : ((operands[2] ?? 0) - 1)
      if (roleId === undefined || roleId === 0xFFFF) {
        console.warn(`event-system: setPlayerStat no role context`)
        break
      }
      mutatePlayerStat(gs, roleId, fieldIdx, () => newVal)
      console.debug(`event-system: setPlayerStat role=${roleId} field=${fieldIdx} =${newVal}`)
      break
    }

    case OP_INCREASE_HP: {
      // sdlpal script.c:867-894:HP delta(applyToAll on operand[0])
      applyHPMPDelta(gs, currentEventObjectId, operands, /*hp*/ true, /*mp*/ false)
      break
    }

    case OP_INCREASE_MP: {
      // sdlpal script.c:896-921:MP delta
      applyHPMPDelta(gs, currentEventObjectId, operands, /*hp*/ false, /*mp*/ true)
      break
    }

    case OP_INCREASE_HP_MP: {
      // sdlpal script.c:923-950:HP & MP 双 delta
      applyHPMPDelta(gs, currentEventObjectId, operands, /*hp*/ true, /*mp*/ true)
      break
    }

    case OP_DAMAGE_ENEMY: {
      // sdlpal script.c:1026-1050:战斗 only(g_Battle.rgEnemy.wHealth)
      console.debug(`event-system: damageEnemy(battle-only,overworld skip)op=${operands}`)
      break
    }

    case OP_REVIVE_PLAYER: {
      // sdlpal script.c:1052-1102:HP==0 时 HP = maxHP*op[1]/10 + cure poison level 3 + clear all status
      const applyAll = (operands[0] ?? 0) !== 0
      const ratioTenths = operands[1] ?? 0
      const targets = applyAll ? gs.partyMembers : (
        currentEventObjectId !== undefined && currentEventObjectId !== 0xFFFF
          ? [currentEventObjectId]
          : []
      )
      for (const roleId of targets) {
        const curHP = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
        const maxHP = gs.PlayerRolesRuntime.rgwMaxHP[roleId] ?? 0
        if (curHP === 0) {
          gs.PlayerRolesRuntime.rgwHP[roleId] = Math.floor(maxHP * ratioTenths / 10)
          curePlayerPoisonByLevel(gs, roleId, 3)
          // status flags 留 follow-up:无大世界 status 模型,只在 battle 内有 rgwStatus
        }
      }
      console.debug(`event-system: revivePlayer applyAll=${applyAll} ratio=${ratioTenths}/10`)
      break
    }

    case OP_REMOVE_EQUIPMENT: {
      // sdlpal script.c:1104-1135
      const roleId = operands[0] ?? 0
      const slotPlus1 = operands[1] ?? 0  // 0 = 全部 / 非 0 = slot-1
      const eq = gs.PlayerRolesRuntime.rgwEquipment
      const removeSlot = (slot: number) => {
        const w = eq[slot]?.[roleId] ?? 0
        if (w !== 0) {
          addItemToInventory(gs, w, 1)
          eq[slot]![roleId] = 0
        }
      }
      if (slotPlus1 === 0) {
        for (let s = 0; s < 6; s++) removeSlot(s)
      }
      else {
        removeSlot(slotPlus1 - 1)
      }
      console.debug(`event-system: removeEquipment role=${roleId} slot=${slotPlus1 === 0 ? 'all' : slotPlus1 - 1}`)
      break
    }

    case OP_SET_TRIGGER_SCRIPT: {
      // sdlpal script.c:1147-1155:if op[0] != 0 → pCurrent.wTriggerScript = op[1]
      // ts NpcState 没有 wTriggerScript field;改成 triggerLabel: 'L_<ip>' 等价表达。
      if ((operands[0] ?? 0) !== 0) {
        const npc = getSelfNpc(gs, currentEventObjectId, 'setTriggerScript')
        if (npc) {
          const newIp = operands[1] ?? 0
          npc.triggerLabel = `L_${newIp}`
          console.debug(`event-system: setTriggerScript npc.id=${npc.id} → triggerLabel=L_${newIp}`)
        }
      }
      break
    }

    case OP_POISON_ENEMY:
    case OP_CURE_ENEMY_POISON_KIND:
    case OP_SET_ENEMY_STATUS: {
      console.debug(`event-system: 战斗 only opcode(overworld skip)0x${opcode.toString(16)} op=${operands}`)
      break
    }

    case OP_POISON_PLAYER: {
      // sdlpal script.c:1257-1285:if RandomLong(1,100) > poisonResist → addPoison
      const applyAll = (operands[0] ?? 0) !== 0
      const poisonId = operands[1] ?? 0
      const targets = applyAll ? gs.partyMembers : (
        currentEventObjectId !== undefined && currentEventObjectId !== 0xFFFF
          ? [currentEventObjectId]
          : []
      )
      for (const roleId of targets) {
        // 简版:不模拟 RandomLong 抗性检查(沿用 sdlpal 但简化),直接添加(scriptOnUse 物品用,
        // 调用方设计为"必中"或 g_fScriptSuccess 路径已含 random 判定;follow-up 加抗性)
        for (let slot = 0; slot < 16; slot++) {
          const key = `${slot}_${roleId}`
          if (!gs.rgPoisonStatus[key] || gs.rgPoisonStatus[key]!.wPoisonID === 0) {
            gs.rgPoisonStatus[key] = { wPoisonID: poisonId, wPoisonScript: 0 }
            break
          }
        }
      }
      console.debug(`event-system: poisonPlayer applyAll=${applyAll} poisonId=${poisonId}`)
      break
    }

    case OP_CURE_PLAYER_POISON_KIND: {
      // sdlpal script.c:1331-1347:遍历 rgPoisonStatus,wPoisonID == op[1] 清 0
      const applyAll = (operands[0] ?? 0) !== 0
      const poisonId = operands[1] ?? 0
      const targets = applyAll ? gs.partyMembers : (
        currentEventObjectId !== undefined && currentEventObjectId !== 0xFFFF
          ? [currentEventObjectId]
          : []
      )
      for (const roleId of targets) {
        curePlayerPoisonByKind(gs, roleId, poisonId)
      }
      console.debug(`event-system: curePoisonByKind applyAll=${applyAll} poisonId=${poisonId}`)
      break
    }

    case OP_CURE_PLAYER_POISON_LEVEL: {
      // sdlpal script.c:1349-1365:遍历 rgPoisonStatus,items[wPoisonID].poison.wPoisonLevel <= op[1] 清 0
      // ts:items.poison 字段未完整 plumb — 简版按 level cap = 99 视为全清(等价 cure all)
      const applyAll = (operands[0] ?? 0) !== 0
      const maxLevel = operands[1] ?? 0
      const targets = applyAll ? gs.partyMembers : (
        currentEventObjectId !== undefined && currentEventObjectId !== 0xFFFF
          ? [currentEventObjectId]
          : []
      )
      for (const roleId of targets) {
        curePlayerPoisonByLevel(gs, roleId, maxLevel)
      }
      console.debug(`event-system: curePoisonByLevel applyAll=${applyAll} maxLevel=${maxLevel}`)
      break
    }

    case OP_SET_PLAYER_STATUS:
    case OP_REMOVE_PLAYER_STATUS: {
      // sdlpal script.c:1367/1399 — 无大世界 player status 模型(battle.rgwStatus only)
      // 大世界 buff(如 blessing)持久化留 M6 follow-up
      console.debug(`event-system: ${opcode === OP_SET_PLAYER_STATUS ? 'set' : 'remove'}PlayerStatus(no overworld status model)op=${operands}`)
      break
    }

    // ── A 类补全(A1:自包含数据/状态,无跳转)─────────────────────────────────

    case OP_SET_TRIGGER_METHOD: {
      // sdlpal script.c:1613-1621:if operand[0] != 0 → pCurrent.wTriggerMode = operand[1]
      if ((operands[0] ?? 0) !== 0 && currentEventObjectId !== undefined) {
        const npc = gs.npcs.find((n) => n.id === currentEventObjectId)
        if (npc) npc.triggerMode = operands[1] ?? 0
      }
      break
    }

    case OP_ADD_MAGIC: {
      // sdlpal script.c:1816-1830 → global.c:2084 PAL_AddMagic
      //   role = operand[1]==0 ? eventObjId : operand[1]-1;spell wObjectID = operand[0]
      const roleId = (operands[1] ?? 0) === 0 ? (currentEventObjectId ?? 0) : ((operands[1] ?? 0) - 1)
      addMagicToRole(gs, roleId, operands[0] ?? 0)
      break
    }

    case OP_REMOVE_MAGIC: {
      // sdlpal script.c:1832-1846 → global.c:2139 PAL_RemoveMagic
      const roleId = (operands[1] ?? 0) === 0 ? (currentEventObjectId ?? 0) : ((operands[1] ?? 0) - 1)
      removeMagicFromRole(gs, roleId, operands[0] ?? 0)
      break
    }

    case OP_SET_MULTI_OBJECT_STATE: {
      // sdlpal script.c:2756-2764:for id in [operand[0], operand[1]] → eventObject[id-1].sState = operand[2]
      // ts:只对当前 scene 已加载 npcs(id 即 1-based 全局 event object id)生效,同 0x49 模型。
      const from = operands[0] ?? 0
      const to = operands[1] ?? 0
      const state = operands[2] ?? 0
      for (const npc of gs.npcs) {
        if (npc.id >= from && npc.id <= to) npc.sState = state
      }
      break
    }

    // ── A2 条件跳转(目标已由 disasm/slice 打标签 + 收集)─────────────────────────

    case OP_JUMP_IF_ITEM_LESS: {
      // sdlpal script.c:1864:if GetItemAmount(op0) < (SHORT)op1 → jump op2
      if (countInventoryItem(gs, operands[0] ?? 0) < signExtendI16(operands[1] ?? 0)) {
        jumpToGlobalIp(gs, operands[2] ?? 0)
      }
      break
    }
    case OP_JUMP_IF_NOT_POISON_KIND: {
      // sdlpal script.c:1918:if !IsPlayerPoisonedByKind(role, op0) → jump op1
      if (!isPlayerPoisoned(gs, currentEventObjectId ?? 0, operands[0] ?? 0)) {
        jumpToGlobalIp(gs, operands[1] ?? 0)
      }
      break
    }
    case OP_JUMP_IF_NOT_POISONED: {
      // sdlpal script.c:1961:if !IsPlayerPoisonedByLevel(role, 0) → jump op0
      if (!isPlayerPoisoned(gs, currentEventObjectId ?? 0)) {
        jumpToGlobalIp(gs, operands[0] ?? 0)
      }
      break
    }
    case OP_JUMP_IF_NOT_ALL_FULL_HP: {
      // sdlpal script.c:2153-2161:任一队员 HP < MaxHP → jump op0
      const r = gs.PlayerRolesRuntime
      const notFull = gs.partyMembers.some(
        (roleId) => (r.rgwHP[roleId] ?? 0) < (r.rgwMaxHP[roleId] ?? 0),
      )
      if (notFull) jumpToGlobalIp(gs, operands[0] ?? 0)
      break
    }
    case OP_JUMP_IF_PLAYER_IN_PARTY: {
      // sdlpal script.c:2234-2242:队伍任一成员 rgwName == op0 → jump op1
      const r = gs.PlayerRolesRuntime
      const inParty = gs.partyMembers.some((roleId) => r.rgwName[roleId] === (operands[0] ?? 0))
      if (inParty) jumpToGlobalIp(gs, operands[1] ?? 0)
      break
    }
    case OP_JUMP_IF_NOT_EQUIPPED: {
      // sdlpal script.c:2522-2537:统计队伍装备 op0 件数 < op1 → jump op2
      const r = gs.PlayerRolesRuntime
      let count = 0
      for (const roleId of gs.partyMembers) {
        for (let slot = 0; slot < 6; slot++) {
          if (r.rgwEquipment[slot]?.[roleId] === (operands[0] ?? 0)) count++
        }
      }
      if (count < (operands[1] ?? 0)) jumpToGlobalIp(gs, operands[2] ?? 0)
      break
    }
    case OP_JUMP_IF_OBJ_STATE: {
      // sdlpal script.c:2677-2680:if pCurrent.sState == (SHORT)op1 → jump op2
      const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'jumpIfObjState')
      if (npc && (npc.sState ?? 0) === signExtendI16(operands[1] ?? 0)) {
        jumpToGlobalIp(gs, operands[2] ?? 0)
      }
      break
    }
    case OP_JUMP_IF_SCENE: {
      // sdlpal script.c:2687-2690:if wNumScene == op0 → jump op1
      if (gs.wNumScene === (operands[0] ?? 0)) jumpToGlobalIp(gs, operands[1] ?? 0)
      break
    }
    case OP_RANDOM_JUMP: {
      // sdlpal script.c:3020:wScriptEntry += RandomLong(0, op0-1);+ InterpretInstruction 末尾 +1
      //   → 跳到 [cur+1, cur+op0]。ts:cursor.ip += offset(caller ip++ → cur+offset+1)。
      const cursor = gs.eventCursor
      if (cursor) {
        const n = Math.max(1, operands[0] ?? 1)
        cursor.ip += Math.floor(Math.random() * n) // RandomLong(0, n-1)
      }
      break
    }
    case OP_JUMP_IF_OBJ_NOT_IN_ZONE: {
      // sdlpal script.c:2448-2471:op0 obj 不在当前 scene → jump op2;否则
      //   x=triggerObj.x-op0obj.x, y=同; |x|+|2y| >= op1*32+16 → jump op2(不在 zone)。
      const pCurrent = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'jumpIfNotInZone')
      const pEvt = gs.npcs.find((n) => n.id === currentEventObjectId)
      if (!pCurrent || !pEvt) {
        // op0 obj 不在当前 scene → 跳(sdlpal g_fScriptSuccess=FALSE)
        jumpToGlobalIp(gs, operands[2] ?? 0)
        break
      }
      const dx = Math.abs(pEvt.x - pCurrent.x)
      const dy = Math.abs((pEvt.y - pCurrent.y) * 2)
      if (dx + dy >= (operands[1] ?? 0) * 32 + 16) jumpToGlobalIp(gs, operands[2] ?? 0)
      break
    }
    case OP_CALL_SCRIPT: {
      // sdlpal script.c:3258:PAL_RunTriggerScript(op0, op1==0 ? current : op1) 同步跑子脚本 +
      // wScriptEntry++。ts tick 模型:压返回帧 + 跳子脚本(本 scene labelMap 优先,否则 shared);
      // 子脚本 'end' 在主 while 弹帧返回 caller。
      const cursor = gs.eventCursor
      const subEntry = operands[0] ?? 0
      if (!cursor || subEntry === 0) break
      let subCommands = cursor.commands
      let subLabelMap = cursor.labelMap
      let subIp: number | undefined = cursor.labelMap[`L_${subEntry}`]
      if (subIp === undefined) {
        const sIp = _sharedLabelMap[`L_${subEntry}`]
        if (sIp !== undefined) {
          subCommands = _sharedCommands
          subLabelMap = _sharedLabelMap
          subIp = sIp
        }
      }
      if (subIp === undefined) {
        console.debug(`event-system: callScript L_${subEntry} 不在 scene/shared labelMap`)
        break
      }
      cursor.callStack = cursor.callStack ?? []
      cursor.callStack.push({
        returnIp: cursor.ip + 1,
        returnCommands: cursor.commands,
        returnLabelMap: cursor.labelMap,
        savedEventObjectId: cursor.currentEventObjectId,
      })
      // sdlpal 传 op1 作 wEventObjectID(1-based);op1=0 → 沿用当前。ts currentEventObjectId 0-based。
      if ((operands[1] ?? 0) !== 0) cursor.currentEventObjectId = (operands[1] ?? 0) - 1
      cursor.commands = subCommands
      cursor.labelMap = subLabelMap
      cursor.ip = subIp - 1 // caller raw-case ip++ → subIp
      break
    }

    case OP_SET_PARTY: {
      // sdlpal script.c:2164-2197:operand[0..2] = roleId+1(0=空)→ 重设队伍;清 poison。
      //   sprite 重载(kLoadPlayerSprite)= overworld follower 显示,present 层按 partyMembers 处理。
      //   PAL_UpdateEquipments:新游戏已对全 role 跑过 → effect 已在,不重跑。
      const members: number[] = []
      for (let i = 0; i < 3; i++) {
        const v = operands[i] ?? 0
        if (v !== 0) members.push(v - 1)
      }
      if (members.length === 0) members.push(0) // sdlpal HACK for Dream 2.11
      gs.partyMembers = members
      gs.rgPoisonStatus = {} // sdlpal memset rgPoisonStatus
      break
    }

    case OP_SET_OBJECT_SCRIPT: {
      // sdlpal script.c:2605-2611:rgObject[op0].rgwData[2 + op2] = op1(sparse 持久存)
      const objId = operands[0] ?? 0
      const idx = 2 + (operands[2] ?? 0)
      let st = gs.rgObject[objId]
      if (!st) {
        st = { rgwData: Array<number>(7).fill(0) }
        gs.rgObject[objId] = st
      }
      while (st.rgwData.length <= idx) st.rgwData.push(0)
      if (idx >= 0) st.rgwData[idx] = operands[1] ?? 0
      break
    }

    case OP_SET_SCENE_SCRIPTS: {
      // sdlpal script.c:2065-2089:if op0: op1!=0 → rgScene[op0-1].wScriptOnEnter=op1(全局 entry);
      //   op1==0&&op2==0 → 清(=0)。op2(teleport)ts 暂不消费。存全局 override,loadScene 时解析。
      const sceneId = operands[0] ?? 0 // 1-based wNumScene
      if (sceneId !== 0) {
        gs.sceneOnEnterOverride = gs.sceneOnEnterOverride ?? {}
        if ((operands[1] ?? 0) !== 0) gs.sceneOnEnterOverride[sceneId] = operands[1] ?? 0
        else if ((operands[2] ?? 0) === 0) gs.sceneOnEnterOverride[sceneId] = 0 // 清
      }
      break
    }

    case OP_SET_FOLLOWER: {
      // sdlpal script.c:2709-2738:operand[0..1] = follower role id(>0;注:直接 role id,非 -1)→
      //   nFollower=count。present 层在队伍后按 trail 渲染。
      const followers: number[] = []
      for (let i = 0; i < 2; i++) {
        const r = operands[i] ?? 0
        if (r > 0) followers.push(r)
      }
      gs.followers = followers
      gs.nFollower = followers.length
      break
    }

    case OP_CHANGE_MAP: {
      // sdlpal script.c:2740-2753:op0==0xFFFF → 当前 scene mapNum=op1 + map-only reload(脚本继续);
      //   else rgScene[op0-1].wMapNum=op1(下次 load 生效)。
      const op0 = operands[0] ?? 0
      const newMapNum = operands[1] ?? 0
      gs.sceneMapNumOverride = gs.sceneMapNumOverride ?? {}
      if (op0 === 0xffff) {
        gs.sceneMapNumOverride[gs.wNumScene] = newMapNum
        if (_mapReloader) void _mapReloader(newMapNum) // 异步换 tilemap,不动 cursor/npcs
      }
      else {
        gs.sceneMapNumOverride[op0] = newMapNum
      }
      break
    }

    case OP_JUMP_IF_NOT_FACING: {
      // sdlpal script.c:2390-2435:op0 obj 不在当前 scene → jump op2;否则算 party 朝向前方
      //   一格的屏幕相对位置,在 op0 obj 范围内(op1*32+16)且 sState>0 → 设触发模式(不跳);
      //   否则 jump op2。
      const pCurrent = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'jumpIfNotFacing')
      if (!pCurrent) {
        jumpToGlobalIp(gs, operands[2] ?? 0)
        break
      }
      // sdlpal kDir: South=0/West=1/North=2/East=3。party facing → dir。
      const facing = gs.party.facing
      const isWest = facing === 'left'
      const isSouth = facing === 'down'
      const isNorth = facing === 'up'
      let fx = pCurrent.x + (isWest || isSouth ? 16 : -16)
      let fy = pCurrent.y + (isWest || isNorth ? 8 : -8)
      fx -= gs.camera.x + PARTYOFFSET_X
      fy -= gs.camera.y + PARTYOFFSET_Y
      const op1 = operands[1] ?? 0
      if (Math.abs(fx) + Math.abs(fy * 2) < op1 * 32 + 16 && (pCurrent.sState ?? 0) > 0) {
        // 面对中:设触发对象(pEvt)的触发模式,下一帧可触发(不跳)。kTriggerTouchNormal=5。
        if (op1 > 0) {
          const pEvt = gs.npcs.find((n) => n.id === currentEventObjectId)
          if (pEvt) pEvt.triggerMode = 5 + op1
        }
      }
      else {
        jumpToGlobalIp(gs, operands[2] ?? 0)
      }
      break
    }

    default:
      console.debug(`event-system: skip raw opcode=0x${opcode.toString(16).padStart(4, '0')}`, operands)
      break
  }
}

// ── M5.6 session 3:helper for item.scriptOnUse opcode 真值 1:1 port ──────────────

/**
 * 0x001B/0x001C/0x001D 共用 — sdlpal PAL_IncreaseHPMP(global.c:1957+)。
 * 多 target(applyAll)or 单 target(wEventObjectID);clamp HP/MP 到 [0, max]。
 */
function applyHPMPDelta(
  gs: GameState,
  currentEventObjectId: number | undefined,
  operands: [number, number, number],
  hp: boolean,
  mp: boolean,
): void {
  const applyAll = (operands[0] ?? 0) !== 0
  const delta = signExtendI16(operands[1] ?? 0)
  const targets = applyAll ? gs.partyMembers : (
    currentEventObjectId !== undefined && currentEventObjectId !== 0xFFFF
      ? [currentEventObjectId]
      : (currentEventObjectId === 0xFFFF ? gs.partyMembers : [])
  )
  for (const roleId of targets) {
    if (hp) {
      const cur = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
      const max = gs.PlayerRolesRuntime.rgwMaxHP[roleId] ?? 0
      gs.PlayerRolesRuntime.rgwHP[roleId] = Math.max(0, Math.min(max, cur + delta))
    }
    if (mp) {
      const cur = gs.PlayerRolesRuntime.rgwMP[roleId] ?? 0
      const max = gs.PlayerRolesRuntime.rgwMaxMP[roleId] ?? 0
      gs.PlayerRolesRuntime.rgwMP[roleId] = Math.max(0, Math.min(max, cur + delta))
    }
  }
  console.debug(
    `event-system: HP${hp ? '+' : ''}MP${mp ? '+' : ''}Delta applyAll=${applyAll} delta=${delta} → ${targets.length} role(s)`,
  )
}

/**
 * 0x0019/0x001A — sdlpal `p[op[0] * MAX_PLAYER_ROLES + role]` 真值直写。
 * operand[0] 是 PlayerRoles 结构内 row index(sdlpal global.h tagPLAYERROLES,见 OP_INCREASE_PLAYER_ATTR 注)。
 * mutator 函数返回新值(set / add 等)。
 */
function mutatePlayerStat(
  gs: GameState,
  roleId: number,
  fieldIdx: number,
  mutator: (cur: number) => number,
): void {
  const runtime = gs.PlayerRolesRuntime
  // sdlpal global.h tagPLAYERROLES 真值 field 索引(每 row = MAX_PLAYER_ROLES=6 WORDs)
  const FIELD_MAP: Record<number, number[]> = {
    5: runtime.rgwLevel,
    6: runtime.rgwMaxHP,
    7: runtime.rgwMaxMP,
    8: runtime.rgwHP,
    9: runtime.rgwMP,
    16: runtime.rgwAttackStrength,
    17: runtime.rgwMagicStrength,
    18: runtime.rgwDefense,
    19: runtime.rgwDexterity,
    20: runtime.rgwFleeRate,
    21: runtime.rgwPoisonResistance,
    28: runtime.rgwCoveredBy,
  }
  const arr = FIELD_MAP[fieldIdx]
  if (!arr) {
    console.warn(`event-system: mutatePlayerStat unknown fieldIdx=${fieldIdx}(sdlpal global.h tagPLAYERROLES row index)`)
    return
  }
  arr[roleId] = mutator(arr[roleId] ?? 0)
}

/** sdlpal PAL_CurePoisonByKind(global.c:1936-1955)— roleId × poisonId 清 0。 */
function curePlayerPoisonByKind(gs: GameState, roleId: number, poisonId: number): void {
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${roleId}`
    const ps = gs.rgPoisonStatus[key]
    if (ps && ps.wPoisonID === poisonId) {
      gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
    }
  }
}

/** sdlpal PAL_CurePoisonByLevel(global.c:1957-1985)— level <= maxLevel 清 0。
 *  ts 简版:items.poison.wPoisonLevel 字段未 plumb → 视为 maxLevel >= 3 时全清(覆盖 sdlpal 真值用法
 *  — 0x22 revive 用 maxLevel=3 全清;治毒丹 maxLevel=1 部分清留 follow-up)。 */
function curePlayerPoisonByLevel(gs: GameState, roleId: number, maxLevel: number): void {
  // 简化:全清。等 items.poison 字段 plumb 后改按 level 过滤。
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${roleId}`
    if (gs.rgPoisonStatus[key]) {
      gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
    }
  }
  void maxLevel  // explicit unused — 见上注
}

/** 取 trigger 的 self NPC(sdlpal `pEvtObj`,纯 self 类 opcode 0x14 / 0xF 用)。无效 id 时 warn + 返回 null。 */
function getSelfNpc(
  gs: GameState,
  currentEventObjectId: number | undefined,
  opName: string,
): GameState['npcs'][number] | null {
  if (currentEventObjectId === undefined) {
    console.warn(`event-system: ${opName} 无 currentEventObjectId(可能从 runEnterScript 跑),跳过`)
    return null
  }
  const npc = gs.npcs.find((n) => n.id === currentEventObjectId)
  if (!npc) {
    console.warn(`event-system: ${opName} npc id=${currentEventObjectId} 不在 gs.npcs,跳过`)
    return null
  }
  return npc
}

/**
 * Sync.2 fix4:resolve `pCurrent` 对应的 NPC(port sdlpal script.c:608-639 PAL_InterpretInstruction 入口)。
 *
 *   operand[0] == 0 / 0xFFFF → pCurrent = pEvtObj(self,由 currentEventObjectId 决定)
 *   其它                     → pCurrent = lprgEventObject[operand[0] - 1](1-based 全局 NPC id)
 *
 * 0x13 / 0x16 / 0x6C 等 pCurrent 类 opcode 用,允许显式选其他 NPC(onEnter 段经此走对 NPC)。
 */
function resolveTargetNpc(
  gs: GameState,
  operand0: number,
  currentEventObjectId: number | undefined,
  opName: string,
): GameState['npcs'][number] | null {
  // operand[0] = 0 或 0xFFFF → self
  if (operand0 === 0 || operand0 === 0xFFFF) {
    return getSelfNpc(gs, currentEventObjectId, opName)
  }
  // sdlpal:`i = operand[0] - 1`;lprgEventObject 是 0-based,wEventObjectID 是 1-based。
  // 我们 pal-extract scene.ts:46 `id: i`(0-based 全局 eventObject 索引)= sdlpal `i`。
  // → 查 `id == operand0 - 1`(operand0 已减 1 即对应我们的 npc.id)。
  const targetId = operand0 - 1
  const npc = gs.npcs.find((n) => n.id === targetId)
  if (npc) return npc
  // 不在当前 scene → 回退全局 event object 数组(sdlpal lprgEventObject 是**全局**表,
  // 脚本按全局 id 改任意对象的状态/位置;gs.npcs 只是当前 scene 的切片**引用**)。
  // 跨 scene 改动会持久,进对应 scene 时 sliceSceneEventObjects 引用同一对象 → 生效。
  // eg. 客栈苗人 autoScript `0x49 [25,2,0]`:把房间场景的苗人(全局 obj 24,sState=0 隐藏)
  // 设 sState=2 显示 —— 跨 scene,必须走全局表,否则"苗人进屋了但屋里没苗人"(2026-05-28 user 发现)。
  const global = gs.allEventObjects?.[targetId]
  if (global && global.id === targetId) return global
  console.warn(`event-system: ${opName} operand[0]=${operand0} → id=${targetId} 不在当前 scene 也不在全局表,跳过`)
  return null
}

/** WORD operand 真值 SHORT(SDL Pal C struct 用 SHORT,JS 我们一直当 u16 存)。 */
function toInt16(v: number): number {
  return v >= 0x8000 ? v - 0x10000 : v
}

/**
 * port sdlpal `PAL_NPCWalkTo`(script.c:30-98)— **每 tick 走 1 步**,返回是否到达。
 *
 * 真值算法:
 *   1. dx = (x*32 + h*16) - npc.x;dy = (y*16 + h*8) - npc.y
 *   2. 设 facing:dy<0 → (dx<0?West:North);否则 → (dx<0?South:East)
 *   3. 若 `|dx| < speed*2 || |dy| < speed*2` → snap 到目标(任一接近即整体 snap)
 *      否则 → 1 步:(±2*speed x, ±speed y) — 按 facing
 *   4. 到达 → wCurrentFrameNum=0 返 true;否则返 false
 */
function npcWalkTo(
  npc: NpcState,
  targetX: number,
  targetY: number,
  h: number,
  speed: number,
): boolean {
  const tx = targetX * 32 + h * 16
  const ty = targetY * 16 + h * 8
  const dx = tx - npc.x
  const dy = ty - npc.y

  // sdlpal scene.c:72-79 真值方向选(全角符号 dy<0 north/west;dy>=0 south/east)
  if (dy < 0) {
    npc.facing = dx < 0 ? 'left' : 'up'
  }
  else {
    npc.facing = dx < 0 ? 'down' : 'right'
  }

  if (Math.abs(dx) < speed * 2 || Math.abs(dy) < speed * 2) {
    // snap 到目标
    npc.x = tx
    npc.y = ty
  }
  else {
    // PAL_NPCWalkOneStep(id, speed) — scene.c:887-902
    const stepX = (npc.facing === 'left' || npc.facing === 'down') ? -2 : 2
    const stepY = (npc.facing === 'left' || npc.facing === 'up') ? -1 : 1
    npc.x += stepX * speed
    npc.y += stepY * speed
    // wCurrentFrameNum++ mod 4(sdlpal scene.c:893-896 真值)
    // **重要**:sdlpal 结构体 zero-init,wCurrentFrameNum 初始 = 0。我们 scriptedFrame
    // undefined 时也应当 0(不是 -1),否则差一帧 — 12 步后 sdlpal frame=0(stand),
    // 我们错算成 frame=3(foot2),停在抬腿姿势。
    const next = ((npc.scriptedFrame ?? 0) + 1) % 4
    npc.scriptedFrame = next
  }

  if (npc.x === tx && npc.y === ty) {
    npc.scriptedFrame = 0  // sdlpal 真值:到达 wCurrentFrameNum=0(站立)
    return true
  }
  return false
}

/**
 * port sdlpal `PAL_PartyWalkTo`(script.c:101-200)— **每 tick 走 1 步**,返回是否到达。
 *
 * 真值算法:
 *   1. dx = (x*32 + h*16) - party.x;dy = (y*16 + h*8) - party.y
 *   2. trail unshift:把 leader 当前位置插 trail[0]
 *   3. facing 同 npcWalkTo
 *   4. step:|dx| <= speed*2 → snap dx else ±speed*2;|dy| <= speed → snap dy else ±speed
 *   5. PAL_UpdatePartyGestures(TRUE) — 推 stepFrame(走路动画)
 *   6. 到达(dx=0 && dy=0)→ 返 true(caller 调 PAL_UpdatePartyGestures(FALSE) 站立)
 */
function partyWalkTo(
  gs: GameState,
  targetX: number,
  targetY: number,
  h: number,
  speed: number,
): boolean {
  const tx = targetX * 32 + h * 16
  const ty = targetY * 16 + h * 8
  const dx = tx - gs.party.x
  const dy = ty - gs.party.y

  if (dx === 0 && dy === 0) {
    // 已到达(可能从 dx=0 dy=0 起步 — 防御)
    gs.walkingFrame.walking = false
    return true
  }

  // sdlpal PAL_UpdatePartyGestures(TRUE) 每 tick 直接覆写 rgParty[*].wFrame
  // (scene.c:680/684/724/728);任何之前 0x15 写的 scripted pose 都被走路覆盖。
  // 清掉 partyScriptedFrame,到达后 fallback 站立帧而不是恢复旧 pose。
  if (Object.keys(gs.partyScriptedFrame).length > 0) {
    gs.partyScriptedFrame = {}
  }

  // sdlpal scene.c:155-162 真值:facing 同 NPC
  if (dy < 0) {
    gs.party.facing = dx < 0 ? 'left' : 'up'
  }
  else {
    gs.party.facing = dx < 0 ? 'down' : 'right'
  }

  // trail unshift(sdlpal script.c:147-153:rgTrail[i+1]=rgTrail[i],leader pos 入 trail[0])
  gs.trail.unshift({
    x: gs.party.x,
    y: gs.party.y,
    dir: gs.party.facing,
  })
  if (gs.trail.length > 5) gs.trail.length = 5

  // sdlpal step:|d| <= speed*2(或 speed)→ snap remainder;否则 ±speed*2(或 ±speed)
  const stepX = Math.abs(dx) <= speed * 2 ? dx : (dx < 0 ? -speed * 2 : speed * 2)
  const stepY = Math.abs(dy) <= speed ? dy : (dy < 0 ? -speed : speed)
  gs.party.x += stepX
  gs.party.y += stepY
  gs.camera.x = gs.party.x - PARTYOFFSET_X
  gs.camera.y = gs.party.y - PARTYOFFSET_Y

  // PAL_UpdatePartyGestures(TRUE) — 推 walking stepFrame
  gs.walkingFrame.walking = true
  gs.walkingFrame.stepFrame = (gs.walkingFrame.stepFrame + 1) % 4

  if (gs.party.x === tx && gs.party.y === ty) {
    gs.walkingFrame.walking = false  // PAL_UpdatePartyGestures(FALSE) — 站立
    return true
  }
  return false
}

/**
 * port sdlpal `PAL_PartyRideEventObject`(script.c:203-307)— **每 tick 走 1 步**,返回是否到达。
 *
 * 真值:party 骑乘 event object 一起移动到目标。原版是 blocking while loop(每帧 viewport+对象
 * 同步 dx/dy,直到 xOffset/yOffset 归零);我们 tick 化:每 tick 走 1 step,未到 caller 不 ip++(retry)。
 *
 *   xOffset = x*32 + h*16 - viewport.x - partyoffset.x = 目标世界 X - party 世界 X(= gs.party.x)
 *   dx = |xOffset| > speed*2 ? speed*±2 : xOffset;dy = |yOffset| > speed ? speed*±1 : yOffset
 *   viewport += (dx,dy)(= party.x/y += dx/dy,camera 跟随);骑乘对象 npc.x/y += dx/dy(一起动)
 *   trail[0] = 移动**后**的 party 世界坐标(script.c:287-289 真值,与 PAL_PartyWalkTo 存移动前不同)
 *   PAL_GameUpdate(FALSE):骑乘期间**不**更新走路 gesture(party 保持站立 pose)
 */
function partyRideEventObject(
  gs: GameState,
  npc: NpcState,
  targetX: number,
  targetY: number,
  h: number,
  speed: number,
): boolean {
  const tx = targetX * 32 + h * 16
  const ty = targetY * 16 + h * 8
  const xOffset = tx - gs.party.x
  const yOffset = ty - gs.party.y

  if (xOffset === 0 && yOffset === 0) return true

  // facing(sdlpal script.c:252-259,同 NPC 方向选)
  if (yOffset < 0) {
    gs.party.facing = xOffset < 0 ? 'left' : 'up'
  }
  else {
    gs.party.facing = xOffset < 0 ? 'down' : 'right'
  }

  const dx = Math.abs(xOffset) > speed * 2 ? speed * (xOffset < 0 ? -2 : 2) : xOffset
  const dy = Math.abs(yOffset) > speed ? speed * (yOffset < 0 ? -1 : 1) : yOffset

  // trail unshift:存移动**后**的 party 世界坐标(sdlpal script.c:282-289)
  gs.trail.unshift({
    x: gs.party.x + dx,
    y: gs.party.y + dy,
    dir: gs.party.facing,
  })
  if (gs.trail.length > 5) gs.trail.length = 5

  // viewport(camera)+ party + 骑乘对象一起移动 dx/dy
  gs.party.x += dx
  gs.party.y += dy
  gs.camera.x = gs.party.x - PARTYOFFSET_X
  gs.camera.y = gs.party.y - PARTYOFFSET_Y
  npc.x += dx
  npc.y += dy

  return gs.party.x === tx && gs.party.y === ty
}

/**
 * port sdlpal `PAL_MonsterChasePlayer`(script.c:309-501)— 怪物朝 party 追 1 步(opcode 0x4C)。
 * 单次调用走 1 step,caller ip++(常在 autoScript 每 tick 跑 → 持续追)。
 *
 *   wSpeed         追击速度(0x4C op1,默认 4)
 *   wMaxDist       追击灵敏范围(0x4C op0,默认 8;sdlpal 形参名也叫 wChaseRange,易混)
 *   fFloating      浮空怪(0x4C op2)→ 忽略障碍
 *   gs.wChaseRange 全局追击系数(0x62/0x63 改;==0 时"驱魔香"原地打转)
 */
function monsterChasePlayer(
  gs: GameState,
  npc: NpcState,
  wSpeed: number,
  wMaxDist: number,
  fFloating: boolean,
): void {
  let wMonsterSpeed = 0

  if (gs.wChaseRange !== 0) {
    // party 世界坐标 = viewport + partyoffset = gs.party.x/y
    let x = gs.party.x - npc.x
    let y = gs.party.y - npc.y
    if (x === 0) x = Math.random() < 0.5 ? -1 : 1
    if (y === 0) y = Math.random() < 0.5 ? -1 : 1

    // snap prevx/prevy(sdlpal script.c:356-388 菱形 tile 回弹基准)
    let prevx = npc.x
    let prevy = npc.y
    const i = prevx % 32
    const j = prevy % 16
    prevx = Math.floor(prevx / 32)
    prevy = Math.floor(prevy / 16)
    let l = 0
    if (i + j * 2 >= 16) {
      if (i + j * 2 >= 48) {
        prevx++; prevy++
      }
      else if (32 - i + j * 2 < 16) {
        prevx++
      }
      else if (32 - i + j * 2 < 48) {
        l = 1
      }
      else {
        prevy++
      }
    }
    prevx = prevx * 32 + l * 16
    prevy = prevy * 16 + l * 8

    // party 是否在追击范围内(script.c:393)
    if (Math.abs(x) + Math.abs(y) * 2 < wMaxDist * 32 * gs.wChaseRange) {
      // 朝 party 方向(script.c:395-416)
      if (x < 0) {
        npc.facing = y < 0 ? 'left' : 'down'   // West / South
      }
      else {
        npc.facing = y < 0 ? 'up' : 'right'    // North / East
      }

      const cx = x !== 0 ? npc.x + (x < 0 ? -1 : 1) * 16 : npc.x
      const cy = y !== 0 ? npc.y + (y < 0 ? -1 : 1) * 8 : npc.y

      if (fFloating) {
        wMonsterSpeed = wSpeed
      }
      else {
        // PAL_CheckObstacle(cx,cy,TRUE,self):无障碍 → 可走;有障碍 → 回弹 prev
        if (!isObstacle(cx, cy, true, npc.id)) {
          wMonsterSpeed = wSpeed
        }
        else {
          npc.x = prevx
          npc.y = prevy
        }
        // 4-向微调避障(script.c:452-482):每个偏移落到障碍就回弹
        for (let k = 0; k < 4; k++) {
          if (k === 0) { npc.x -= 4; npc.y += 2 }
          else if (k === 1) { npc.x -= 4; npc.y -= 2 }
          else if (k === 2) { npc.x += 4; npc.y -= 2 }
          else { npc.x += 4; npc.y += 2 }
          if (isObstacle(npc.x, npc.y, false, 0)) {
            npc.x = prevx
            npc.y = prevy
          }
        }
      }
    }
  }
  else {
    // 驱魔香:wChaseRange==0 原地打转,每 2 帧换向(script.c:486-498)
    if (gs.frameNum & 1) {
      const dirIdx = (FACING_TO_SDLPAL_DIR[npc.facing ?? 'down'] + 1) % 4
      npc.facing = SDLPAL_DIR_TO_FACING[dirIdx] ?? 'down'
    }
  }

  // PAL_NPCWalkOneStep(id, wMonsterSpeed)(scene.c:887-902):按 facing 走 + 推进动画帧
  const stepX = (npc.facing === 'left' || npc.facing === 'down') ? -2 : 2
  const stepY = (npc.facing === 'left' || npc.facing === 'up') ? -1 : 1
  npc.x += stepX * wMonsterSpeed
  npc.y += stepY * wMonsterSpeed
  npc.scriptedFrame = ((npc.scriptedFrame ?? 0) + 1) % 4
}

/** PAL_CheckObstacle 真值(via 注入 hook);未注入(测试/无 tilemap)视为无障碍。 */
function isObstacle(x: number, y: number, checkObjects: boolean, selfId: number): boolean {
  return _obstacleChecker ? _obstacleChecker(x, y, checkObjects, selfId) : false
}

// runEnterScript: 同步跑 wScriptOnEnter 段(loadScene 不传 partyStart 时调用)。
// 只处理瞬时 setX opcode;其余走 D26 skip。
// SINGLE_TICK_LIMIT 兜底防死循环。
export function runEnterScript(
  gs: GameState,
  commands: Command[],
  labelMap: Record<string, number>,
  startIp: number,
  /**
   * 本 onEnter 所属 scene(= wNumScene)。传了就在跑完(撞 end)时把"下一条 entry"
   * 持久化到 gs.sceneOnEnterIp[sceneId](sdlpal play.c:64 真值)。skip-intro 同步跑开场
   * 也要存,否则重进 scene onEnter 会重播(覆盖门的 setPartyPos)。
   */
  sceneId?: number,
): void {
  let ip = startIp
  let stepCount = 0

  while (true) {
    if (++stepCount > SINGLE_TICK_LIMIT) {
      console.warn(`runEnterScript: single-tick limit exceeded at ip=${ip}`)
      return
    }

    if (ip < 0 || ip >= commands.length) {
      return
    }

    const cmd = commands[ip]!

    if (cmd.op === 'end') {
      // sdlpal play.c:64:onEnter 跑完存回下一条 entry(0x00→起始 replay;0x01→ip+1;0x02→resetTo)
      if (sceneId !== undefined) {
        let nextEntry: number
        if (cmd.advance) nextEntry = ip + 1
        else if (cmd.reset && cmd.resetTo !== undefined) {
          nextEntry = labelMap[`L_${cmd.resetTo}`] ?? startIp
        }
        else nextEntry = startIp
        gs.sceneOnEnterIp[sceneId] = nextEntry
      }
      return
    }

    if (cmd.op === 'goto') {
      const target = labelMap[cmd.to]
      if (target === undefined) {
        console.warn(`runEnterScript: goto label ${cmd.to} 不在 labelMap`)
        return
      }
      ip = target
      continue
    }

    if (cmd.op === 'raw') {
      applyRawOpcode(gs, cmd.opcode, cmd.operands)
      ip++
      continue
    }

    // 其他具名 op(showDialog / setDialogStyle* / loadScene 等)→ skip(enter 段不阻塞)
    console.debug(`runEnterScript: skip named op=${cmd.op} ip=${ip}`)
    ip++
  }
}
