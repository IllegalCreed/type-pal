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

import type { Command, DialogBoxStyle, Enemy, EnemyObject, InputSnapshot, Item, Magic, ObjectMagicView, ObjectPoisonView, Palette, PlayerRoles } from '@type-pal/shared'
import { FPS_EXPLORE } from '@type-pal/shared'
import type { BattleState } from './battle/battle-state.js'
import type { CommandBus } from './command-bus.js'
import type { GameState, NpcState, EventCursor, DialogBoxState } from './game-state.js'
import { PARTYOFFSET_X, PARTYOFFSET_Y } from './game-state.js'
import { dispatchBattleOpcode } from './battle/battle-opcodes.js'
import { getWord } from './word-lookup.js'
import { addPlayerStatRow, getPlayerPoisonResistance, removeEquipmentEffect, setPlayerStatRow, writeEquipmentEffectField } from './equip-effect.js'
import {
  buildFadeOut,
  buildFadeIn,
  buildSceneFade,
  buildPaletteFade,
  buildColorFade,
  buildFadeToRed,
  finalizePaletteFade,
  makeWorkingPalette,
  blackColors,
  resolveNightColors,
  type PaletteFadeState,
} from './palette-fade.js'
import {
  startDialogLine,
  appendDialogLine,
  parseDialogText,
  shouldWaitPageKey,
  setWaitingPageKey,
  setWaitingEndKey,
  resetDialogBody,
  tickDialog,
  confirmDialog,
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
// case 0x0045(69):  Set battle music(sdlpal script.c:1658)
//   operand[0]=musicId → gs.wNumBattleMusic(进战斗时用,M6 接真播)
export const OP_SET_BATTLE_MUSIC = 0x0045       // 69
// case 0x0077(119): Stop current playing music(sdlpal script.c:2215)
//   AUDIO_PlayMusic(0,FALSE,op0==0?2.0:op0*3) + gpGlobals->wNumMusic=0(fade 出后停)
export const OP_STOP_MUSIC = 0x0077             // 119
// case 0x00A3(163): Play CD music, RIX fallback(sdlpal script.c:3023)
//   gpGlobals->wNumMusic=op1;CD 可用 → PlayCDTrack(op0,-1→-2)失败回 RIX;否则 PlayMusic(op1)
export const OP_PLAY_CD_MUSIC = 0x00A3          // 163
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
// case 0x0035(53):  Shake screen(script.c:1521-1535)
//   time=operand[0];level=operand[1];if(level==0)level=4;VIDEO_ShakeScreen(time,level);
//   if(operand[0]==0) 立即 UpdateScreen 复位(关抖)。VIDEO_ShakeScreen 只写 static
//   g_wShakeTime/g_wShakeLevel(video.c:59-60,非存档)。真抖在 present 层 applyScreenShake
//   (video.c:571-616)逐帧奇偶交替 ±level 垂直跳动 + 黑条,末尾自减。
export const OP_SHAKE_SCREEN = 0x0035           // 53
// case 0x0034(52): Transform collected enemies into items(script.c:1452,妖魔转化)
//   wCollectValue>0 → i=RandomLong(1,collectValue) cap 9(PAL_CLASSIC);collectValue-=i;i--;
//   AddItem(store[0].rgwItems[i],1) + 物品框 dialog。else(collectValue==0)→ jump op0。
export const OP_TRANSFORM_COLLECTED = 0x0034     // 52
// case 0x0038(56): Teleport the party out of the scene(script.c:1554,归隐符/瞬移)
//   !fInBattle && scene.wScriptOnTeleport != 0 → 跑 teleport 脚本;else 失败 → fScriptSuccess=FALSE + jump op0。
export const OP_TELEPORT_OUT = 0x0038            // 56
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
// case 0x0008(8):   Advance entry and keep running(sdlpal PAL_RunTriggerScript script.c:3335-3341)
//   `wScriptEntry++; wNextScriptEntry = wScriptEntry;` — 推进 ip **且继续跑**,把持久化 resume 点
//   设到 0x08 之后(mid-script checkpoint)。后续 0x01/0x02 收尾覆盖;0x00 plain 不覆盖 → checkpoint
//   保留 → 重触发从 0x08 后续跑(跳过已播内容,如商店对话只播一次)。69 处用(scene-30 药铺等)。
export const OP_CHECKPOINT_ADVANCE = 0x0008     // 8
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
export const OP_SYNC_OBJ_STATE = 0x006F         // 111 if pCurrent.sState==op1 → pEvtObj.sState=op1
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
// 特效 A(2026-05-29):调色板 ramp fade(sdlpal palette.c + script.c case)。全 'raw'(disasm 未具名)。
//   handler 在 tickEventSystem 'raw' case 内联(需 return 设 waiting,applyRawOpcode 无法控制主循环)。
export const OP_FADE_TO_RED = 0x004f            //  79 — PAL_FadeToRed(game over,script.c:1768)
export const OP_FADE_OUT = 0x0050               //  80 — PAL_FadeOut(屏幕淡黑,script.c:1775)
export const OP_FADE_IN = 0x0051                //  81 — PAL_FadeIn(屏幕淡回,script.c:1784)
export const OP_PALETTE_FADE = 0x0080           // 128 — 昼夜 toggle + PAL_PaletteFade(script.c:2381)
export const OP_COLOR_FADE = 0x008c             // 140 — PAL_ColorFade(from/to 纯色,script.c:2582)
export const OP_SCENE_FADE = 0x0093             // 147 — PAL_SceneFade(边淡边更新场景,script.c:2664)
export const OP_FADE_TO_SCENE = 0x009b          // 155 — VIDEO_FadeScreen(2)(dither,复用 fadeState,script.c:2766)
// 特效 A(2026-05-29):昼夜调色板 flag(sdlpal script.c:1802/1809 case 0x53/0x54 设 fNightPalette)。
//   instant 非阻塞;视觉在下次 fade-in / scene-load 选调色板 ramp 时生效(sdlpal 当帧不重绘)。
export const OP_SET_DAY_PALETTE = 0x0053        // 83 — fNightPalette = FALSE
export const OP_SET_NIGHT_PALETTE = 0x0054      // 84 — fNightPalette = TRUE
// 特效 B/C(2026-05-29):RNG 动画 + 屏幕波动。
export const OP_SET_RNG = 0x0036                // 54 — iCurPlayingRNG = op0(script.c:1537,instant)
export const OP_PLAY_RNG = 0x0037               // 55 — PAL_RNGPlay(script.c:1544,阻塞 modal,handler 注入)
export const OP_WAVE_SCREEN = 0x0071            // 113 — wScreenWave/sWaveProgression(script.c:2132,present 层消费)
export const OP_SHOW_FBP = 0x0076               // 118 — PAL_ShowFBP(全屏图,script.c:2199;WIN95 黑屏/DOS 真显)
export const OP_SCROLL_FBP = 0x00A4             // 164 — PAL_ScrollFBP(下滑卷入,script.c:3038;DOS-only,0 用)
export const OP_SHOW_FBP_EFFECT = 0x00A5        // 165 — PAL_ShowFBP+effect sprite(script.c:3055;DOS-only,0 用)
export const OP_ENDING_ANIMATION = 0x0096       // 150 — PAL_EndingAnimation(结局 400 帧,script.c:2693;DOS-only,0 用)
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
//   operand[0] 是 PlayerRoles 结构按 (WORD*) 解读的 row index(sdlpal global.h:299-336 tagPLAYERROLES,
//   每 PLAYERS 字段=1 row,rgwEquipment[6]/rgwElementalResistance[5] 等 2D 数组占多 row)。真值:
//     6=Level / 7=MaxHP / 8=MaxMP / 9=HP / 10=MP / 17=AttackStrength / 18=MagicStrength
//     19=Defense / 20=Dexterity / 21=FleeRate / 22=PoisonResistance / 31=CoveredBy
//   (行号唯一来源 = equip-effect.ts PLAYERROLES_ROW;handler 走 addPlayerStatRow/setPlayerStatRow)
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
// case 0x0041(65): Mark the script as failed(script.c:1623-1627)— g_fScriptSuccess = FALSE。
//   调用方据此 gate:item.consuming 不扣 / 魔法 MP 不扣(脚本判定"用了没效果")。
export const OP_MARK_SCRIPT_FAILED = 0x0041        // 65

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
export const OP_PLACE_USED_ITEM = 0x0084           // 132 把 obj op0 放 party 正前方 + sState=op1;挡→jump op2
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
// case 0x0085(133): Delay for a period(script.c:2511-2516)— UTIL_Delay(operand[0]*80)实时阻塞延迟,
//   期间不调 PAL_GameUpdate(autoScript 暂停)。ts:time-based waiting='delay'(仿 0x73 fade-screen)。
export const OP_DELAY = 0x0085                     // 133
// case 0x008D(141): Increase player level(script.c:2591-2595 → global.c:2347 PAL_PlayerLevelUp)
//   role = wEventObjectID(=currentEventObjectId);operand[0]=升的级数。stat 按固定+RandomLong 增长,
//   clamp 999,level clamp MAX_LEVELS(99),重置 rgPrimaryExp.wExp=0 / wLevel=新等级。
export const OP_INCREASE_PLAYER_LEVEL = 0x008D     // 141
// case 0x008F(143): Halve the cash amount(script.c:2598-2603)— dwCash /= 2。
export const OP_HALVE_CASH = 0x008F                // 143
// case 0x00A1(161): Set positions of all party members = first(script.c:2998-3014)
//   rgTrail[0..MAX_PLAYABLE-1] 全 = 队首世界坐标 + wPartyDirection → follower 渲染贴队首 = 全队聚拢。
export const OP_SET_ALL_PARTY_POS = 0x00A1         // 161
// case 0x0078(120): sdlpal 标 `// FIXME: ???` 的字面 no-op(script.c:2224-2228 `case 0x0078: break;`)。
//   本游戏 35 处用(byte-level 验 all.json),全部空操作 —— 显式 no-op,去掉 default 的 skip debug spam。
export const OP_FIXME_78 = 0x0078                  // 120
// case 0x00A6(166): backup screen — VIDEO_BackupScreen(gpScreen)(script.c:3069-3074)。本游戏 0 调用
//   (0x73 fadeScreen 内部已含 VIDEO_BackupScreen);独立 opcode 当 no-op(ts present 自管 fade backup)。
export const OP_BACKUP_SCREEN = 0x00A6             // 166
// case 0x004D(77): wait for any key — PAL_WaitForKey(0)(script.c:1753-1758)。
//   = PAL_WaitForKeyInternal(0, FALSE)(play.c:602-638):**永久等**,只认 kKeySearch|kKeyMenu。
//   本游戏 0 用(为完整性);设 waiting='wait-key' 阻塞,Confirm/Menu/Cancel 解除。
export const OP_WAIT_FOR_KEY = 0x004D              // 77
// case 0x004E(78): load the last saved game — script.c:1760-1766
//   `PAL_FadeOut(1); PAL_ReloadInNextTick(gpGlobals->bCurrentSaveSlot); return 0;`
//   淡黑(600ms,同 0x50)→ 重载当前存档槽 → **return 0 终止脚本**(不 break)。本游戏 1 用。
export const OP_LOAD_LAST_SAVE = 0x004E            // 78
// case 0x00A0(160): quit game — script.c:2988-2996
//   `if (fIsWIN95) PAL_EndingScreen(); PAL_AdditionalCredits(); PAL_Shutdown(0);`
//   WIN95 播结局 AVI(4/5/6);DOS 结局已由前序 opcode 跑完。**用户决策:跳过 PAL_AdditionalCredits**
//   (SDLPAL 引擎 GNU GPL 版权页,非游戏内容)→ 直接回标题。本游戏 1 用(scene-281 结局,global ip 35621)。
export const OP_QUIT = 0x00A0                      // 160
// case 0x000A(10): goto address if player selected no — script.c:3373-3387
//   `PAL_ClearDialog(FALSE); if (!PAL_ConfirmMenu()) wScriptEntry=operand[0]; else wScriptEntry++;`
//   PAL_ConfirmMenu(uigame.c:342-365)= PAL_SelectionMenu(2, 0, {否=WORD19, 是=WORD20})阻塞确认框,
//   默认 否(nDefault=0);返回 否(index0)/cancel → FALSE → goto operand[0],是(index1)→ TRUE → ip++。
//   本游戏 26 用(yes/no 剧情分支:水果贩"要不要来几个"/居民"想听故事吗"等)。
export const OP_GOTO_IF_NO = 0x000A                // 10

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
    // opcode 0x0A goto-if-no:sdlpal case 用 `PAL_ClearDialog(FALSE)`(script.c:3377)—— **不**等键
    //   (区别于 default 的 PAL_ClearDialog(TRUE) 会 PAL_DialogWaitForKey)。豁免 default 的 Space-wait
    //   pre-op clear:问句保持可见,确认框直接弹出,选完才由 confirm 派发清 dialogBox。
    || (cmd.op === 'raw' && cmd.opcode === OP_GOTO_IF_NO)
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
 * 特效 A 共用:启动一个调色板 ramp fade(0x50/0x51/0x80/0x8C/0x4F/0x93)。
 *  - 确保 gs.palette 是可变工作副本(stepPaletteFade 每帧原地改它的 colors);缺则从 basePalette/全黑造。
 *  - 写 gs.paletteFadeState。
 *  - clearSceneLoading:**FadeOut(0x50)传 false** —— sdlpal PAL_FadeOut 不调 PAL_MakeScene,只
 *    VIDEO_SetPalette 渐变**触发脚本前的当前帧**。我们 loadScene→FadeOut 序中 sceneLoading 仍 true(冻屏),
 *    保持冻结 → present 对冻帧染色淡黑(避免 setPartyPos 把主角瞬移到新场景坐标后在旧地图重绘 = 用户报的
 *    "人物淡出不对")。其余 fade(FadeIn/SceneFade/...)传 true 解冻 → 重绘目标 scene 供淡入。
 *  - cursor.waiting:sceneUpdating(0x93 / 0x80 fUpdateScene)→ 'scene-fade'(mode.ts 放行 autoScript),
 *    否则 'palette-fade'(冻全场)。调用方随后 `return`(不 ip++;waiting handler 淡完才 finalize + ip++)。
 */
function startPaletteFade(
  gs: GameState,
  cursor: EventCursor,
  pf: PaletteFadeState,
  sceneUpdating: boolean,
  clearSceneLoading = true,
): void {
  if (!gs.palette) {
    const src = gs.basePalette ?? { colors: blackColors(), cycles: [] }
    gs.palette = makeWorkingPalette(src)
  }
  gs.paletteFadeState = pf
  if (clearSceneLoading) gs.sceneLoading = false
  cursor.waiting = sceneUpdating ? 'scene-fade' : 'palette-fade'
}

function isEventCursorAtMakeSceneStep(cursor: EventCursor | undefined): boolean {
  if (!cursor || cursor.waiting !== undefined) return false
  const cmd = getCmds(cursor)[cursor.ip]
  if (!cmd || cmd.op !== 'raw') return false
  if (cmd.opcode === OP_PARTY_WALK_TO || cmd.opcode === OP_PARTY_WALK_TO_4 || cmd.opcode === OP_PARTY_WALK_TO_8) {
    return true
  }
  if (cmd.opcode === OP_RIDE_OBJECT_2 || cmd.opcode === OP_RIDE_OBJECT_4 || cmd.opcode === OP_RIDE_OBJECT_8) {
    return true
  }
  if (cmd.opcode === OP_SET_CAMERA) {
    const [cx, cy, flag] = cmd.operands
    const isPan = !((cx ?? 0) === 0 && (cy ?? 0) === 0) && flag !== 0xFFFF
    return isPan && Math.max(cmd.operands[2] ?? 0, 1) > 1
  }
  return false
}

/**
 * port sdlpal `PAL_MakeScene` 末尾 auto fade-in(scene.c:503-508):scene 渲染时若 `fNeedToFadeIn`,
 * 自动 `PAL_FadeIn(wNumPalette, fNight, 1)` + 清 flag。这是 **FadeOut(0x50)→loadScene→无 onEnter 0x51**
 * 的 door 切换(如 wNumScene 4 无 onEnter)淡黑后屏幕**唯一**恢复机制 —— 缺它则永久黑屏(用户报)。
 *
 * 我们在 explore 模式(无 event 脚本运行 = scene 已 settled,对应 sdlpal 主循环 PAL_MakeScene)tick 调:
 *  - needToFadeIn 且无进行中 fade / 未在 loading → 启动 FadeIn 到 basePalette(delay=1 → 600ms)+ 清 flag。
 *    waiting 不设(explore 无 cursor)→ present 到点自清 paletteFadeState;movement 由 scene-system 的
 *    paletteFadeState 守卫冻结(忠实 PAL_FadeIn 阻塞)。
 *
 * event 模式只在确有 PAL_MakeScene 的等待/步进里跑(0x09 frame-wait / scene-fade / PartyWalkTo /
 * Ride / camera-pan)。不能把一般 waiting=undefined 的“脚本续跑空档”当作 PAL_MakeScene:
 * 水月宫 0x50 FadeOut → 0x76 ShowFBP(黑屏)结束后,下一条是居中 `"一夜过去"`;若这里抢先消费
 * needToFadeIn,就会亮屏出字,后面的 0x51 再亮一次。
 */
export function tickSceneAutoFadeIn(gs: GameState): void {
  // sdlpal scene.c:503-507:PAL_MakeScene 内 `if (fNeedToFadeIn) PAL_FadeIn(...)` —— 每帧 PAL_GameUpdate
  //   跑时都查。这里映射到 explore 主循环 + event 中明确会 PAL_MakeScene 的等待/步进;0x05 redraw
  //   已在 opcode handler 内显式触发。不要在一般 event waiting=undefined 时触发:那只是 TS tick 化后的
  //   脚本续跑点,原版仍在 PAL_RunTriggerScript 调用栈里,不会先 PAL_MakeScene。
  const w = gs.eventCursor?.waiting
  const palGameUpdateRuns =
    gs.mode === 'explore'
    || (gs.mode === 'event' && (w === 'frame-wait' || w === 'scene-fade' || isEventCursorAtMakeSceneStep(gs.eventCursor)))
  if (!palGameUpdateRuns || gs.sceneLoading) return
  if (gs.paletteFadeState || gs.fadeState) return // fade 进行中(present 自清 explore fade)
  if (!gs.needToFadeIn) return
  gs.needToFadeIn = false
  gs.blackScreenHold = false
  if (!gs.palette) {
    const src = gs.basePalette ?? { colors: blackColors(), cycles: [] }
    gs.palette = makeWorkingPalette(src)
  }
  // sdlpal scene.c:506 PAL_FadeIn(wNumPalette, **fNightPalette**, 1) → delay=1 → 600ms。黑 → (夜/昼)basePalette。
  const baseColors = resolveNightColors(gs.basePalette ?? gs.palette, gs.nightPalette)
  gs.paletteFadeState = buildFadeIn(baseColors, 600, performance.now())
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

// P2#5(2026-05-29):旧 shared.json 切片(_sharedCommands/setSharedEvents/getShared*)已删 —
// shared 只是全局数组的一个切片,塌缩进单一全局数组后 goto `shared#L_xxx` 由 resolveLabelIp 剥前缀
// 经全局 labelMap 解析(见 'goto' case)。

// ── 全局脚本数组(对应 sdlpal 单一 lprgScriptEntry)─────────────────────────────
// per-scene + shared 切片是优化,但跨 scene 设的脚本指针(0x24/0x25 把 A scene 对象的
// trigger/autoScript 设到只切进 B scene 的脚本)会在 A scene 解析失败。全局数组兜底:
// commands[i] = 全局 script entry i(events/all.json,annotated 未切片全量),label = L_<i>。
let _globalCommands: Command[] = []
let _globalLabelMap: Record<string, number> = {}

/** bootstrap 注入 events/all.json 的全量命令;labelMap 由带 label 的命令建(L_<i> → i)。 */
export function setGlobalEvents(commands: Command[]): void {
  _globalCommands = commands
  const map: Record<string, number> = {}
  for (let i = 0; i < commands.length; i++) {
    const lbl = commands[i]?.label
    if (lbl) map[lbl] = i
  }
  _globalLabelMap = map
}

export function getGlobalCommands(): Command[] {
  return _globalCommands
}

export function getGlobalLabelMap(): Record<string, number> {
  return _globalLabelMap
}

/**
 * P2#5(2026-05-29 单一全局脚本数组):cursor 的命令数组 / labelMap。
 * 生产 cursor 不带 commands/labelMap → 默认读单一全局数组(_globalCommands/_globalLabelMap,
 * = sdlpal 单一 lprgScriptEntry)。单测可传自带数组当 override。
 */
export function getCmds(cursor: { commands?: Command[] }): Command[] {
  return cursor.commands ?? _globalCommands
}
function getLabels(cursor: { labelMap?: Record<string, number> }): Record<string, number> {
  return cursor.labelMap ?? _globalLabelMap
}

/** goto/call/reset 目标 label(可能带 `shared#` 前缀)→ ip(经 cursor labelMap,默认全局)。 */
function resolveLabelIp(
  cursor: { labelMap?: Record<string, number> },
  to: string,
): number | undefined {
  const label = to.startsWith('shared#') ? to.slice('shared#'.length) : to
  return getLabels(cursor)[label]
}

/**
 * 脚本 label → 全局 ip。P2#5 后塌缩成单一全局数组查找(all.json 的 L_<n> → n 恒等,0 违例)。
 * 返回 ip(全局下标);commands/labelMap 省略 → caller 建的 cursor 默认读全局数组(不再内嵌 → 不膨胀存档)。
 * 保留 gs 参数 + 可选 commands/labelMap 返回字段,兼容旧 caller 的解构(得 undefined → 默认全局)。
 */
export function resolveScriptLabel(
  gs: GameState,
  label: string,
): { commands?: Command[]; labelMap?: Record<string, number>; ip: number } | null {
  void gs
  const ip = _globalLabelMap[label]
  return ip !== undefined ? { ip } : null
}

// ── P0.e: opcode 7 startBattle handler 注入 ──────────────────────────────────
//
// event-system 不直接持有 enemies/enemyTeams/playerRoles 等战斗资源(避免污染 import 图)。
// bootstrap 启动时把 startBattle 包成闭包注入 — handler 接收 enemyTeamId/isBoss 自驱动 battle-system。
//
// opcode 7 切 mode='battle' + 存战后接回上下文(savePostBattleResume)。**战后 resume 已做**
// (game-state.ts resumePostBattleScript 按 outcome 选 wonIp / lostIp(op1) / fledIp(op2) 接回,
// C 系列 gameOverActive 工作);旧"不实现 onLose/onFlee"注释已过时(2026-06-02 订正)。
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

// ── 商店菜单 handler(opcode 0x0026 PAL_BuyMenu / 0x0027 PAL_SellMenu)──────────
// event-system 是底层 interpreter,不能 import menu 层(menu-mode/shop-menu)否则成环。
// 同 setStartBattleHandler 模式:bootstrap 注入 handler,内部 openMenu + createBuyMenu(catalogs)。
export interface ShopMenuHandlerInput {
  gs: GameState
  mode: 'buy' | 'sell'
  /** sdlpal 0x0026 operand[0] = store 下标(lprgStore[storeNum]);sell 忽略。 */
  storeNum: number
}
export type ShopMenuHandler = (input: ShopMenuHandlerInput) => void

let _shopMenuHandler: ShopMenuHandler | null = null

export function setShopMenuHandler(fn: ShopMenuHandler | null): void {
  _shopMenuHandler = fn
}

// ── store 表(opcode 0x0034 妖魔转化:store[0].rgwItems[i] → inventory)────────────
// sdlpal `lprgStore[0].rgwItems[i]`。0x34 直接索引 store 0 的物品槽(非 buy menu 过滤)。
// stores[storeNum].items = rgwItems[9] 截到首个 0 前(leading 项与 rgwItems[i] 同序对齐)。
let _storeTable: Array<{ items: number[] }> = []

export function setStoreTable(stores: Array<{ items: number[] }>): void {
  _storeTable = stores
}

// ── 毒 OBJECT 表注入(0x29 apply-player 取 wPlayerScript / cure-by-level 取真 level)──
//   ObjectPoisonView{id,level,color,playerScript,enemyScript};id→数据。applyRawOpcode(大世界 + 战斗
//   fall-through)的 0x29 / curePlayerPoisonByLevel 用。未注入(旧测试)→ 空 Map,playerScript=0/level=0 退化。
let _objectPoisons = new Map<number, { level: number; color: number; playerScript: number; enemyScript: number }>()

export function setObjectPoisons(
  poisons: ReadonlyArray<{ id: number; level: number; color: number; playerScript: number; enemyScript: number }>,
): void {
  _objectPoisons = new Map(
    poisons.map((p) => [p.id, { level: p.level, color: p.color, playerScript: p.playerScript, enemyScript: p.enemyScript }]),
  )
}

// ── 特效 C:RNG 动画 handler(opcode 0x0037 PAL_RNGPlay)──────────────────────
// event-system 是底层 interpreter,不能 import shell 层 rng-player(分层约束)。同 shop 模式:
// bootstrap 注入 handler,内部 suspendRaf + await playRng(modal 全屏播放),播完清 cursor.waiting 续跑。
export interface RngPlayHandlerInput {
  gs: GameState
  /** RNG.MKF chunk(= gs.iCurPlayingRNG,sdlpal PAL_RNGPlay 第 1 参,**非** operand)。 */
  chunkIdx: number
  /** sdlpal op0 起始帧。 */
  startFrame: number
  /** sdlpal op1>0?op1:-1(-1 = 播到末帧)。 */
  endFrame: number
  /** sdlpal op2>0?op2:16,= 帧率 fps(每帧 1/speed 秒)。 */
  speed: number
}
export type RngPlayHandler = (input: RngPlayHandlerInput) => void

let _rngPlayHandler: RngPlayHandler | null = null

export function setRngPlayHandler(fn: RngPlayHandler | null): void {
  _rngPlayHandler = fn
}

// ── 特效 B:FBP 全屏图 handler(opcode 0x0076 PAL_ShowFBP)──────────────────────
// 同 RNG 模式:bootstrap 注入,内部 suspendRaf + showFbp(全屏 blit + 可选 dither fade-in)。
// chunkIdx 无对应 FBP(如 in-game 0xFFFF)→ handler 渲染全黑(sdlpal WIN95 SDL_FillRect / DOS decompress fail memset 0)。
export interface ShowFbpHandlerInput {
  gs: GameState
  /** FBP.MKF chunk(operand[0])。 */
  chunkIdx: number
  /** 渐变速度(operand[1];0=瞬时,>0 → (fade+1)*10ms/步 × 96 步 nibble dither)。 */
  fade: number
}
export type ShowFbpHandler = (input: ShowFbpHandlerInput) => void

let _showFbpHandler: ShowFbpHandler | null = null

export function setShowFbpHandler(fn: ShowFbpHandler | null): void {
  _showFbpHandler = fn
}

// ── 特效 B:FBP 滚动卷入 handler(opcode 0x00A4 PAL_ScrollFBP)──────────────────
export interface ScrollFbpHandlerInput {
  gs: GameState
  /** FBP.MKF chunk(operand[0])。 */
  chunkIdx: number
  /** 滚动速度(operand[2];0→1,每步 800/speed ms)。 */
  speed: number
}
export type ScrollFbpHandler = (input: ScrollFbpHandlerInput) => void

let _scrollFbpHandler: ScrollFbpHandler | null = null

export function setScrollFbpHandler(fn: ScrollFbpHandler | null): void {
  _scrollFbpHandler = fn
}

// ── 结局:结局动画 handler(opcode 0x0096 PAL_EndingAnimation)──────────────────
// 无 operand;bootstrap 注入:fetch FBP 61/62 + MGO 571/572 → 跑 400 帧 cutscene(modal,suspendRaf)。
export interface EndingAnimationHandlerInput {
  gs: GameState
}
export type EndingAnimationHandler = (input: EndingAnimationHandlerInput) => void

let _endingAnimationHandler: EndingAnimationHandler | null = null

export function setEndingAnimationHandler(fn: EndingAnimationHandler | null): void {
  _endingAnimationHandler = fn
}

// ── 0x4E load-last-save handler(sdlpal script.c:1765 PAL_ReloadInNextTick(bCurrentSaveSlot))──
// event-system 是底层 interpreter,不能 import shell/bootstrap 的存档逻辑(分层约束)。同 modal 模式:
// bootstrap 注入 handler,内部 loadGameFromSlot(slot) + 设 needToFadeIn(对齐 PAL_ReloadInNextTick
// 的 fNeedToFadeIn=TRUE → loaded scene 经 explore auto fade-in 淡入)。fade-out 由 event-system 先跑完。
export type LoadLastSaveHandler = (slot: number) => void

let _loadLastSaveHandler: LoadLastSaveHandler | null = null

export function setLoadLastSaveHandler(fn: LoadLastSaveHandler | null): void {
  _loadLastSaveHandler = fn
}

// ── 0xA0 quit handler(sdlpal script.c:2988-2996)──────────────────────────────
// 用户决策:跳过 PAL_AdditionalCredits(SDLPAL 引擎版权页)→ 回标题。bootstrap 注入:
// WIN95 → suspendRaf 播结局 mp4(4/5/6)→ 回标题(OpeningMenu);DOS → 结局已由前序 opcode 跑完 → 直接回标题。
export type QuitHandler = () => void

let _quitHandler: QuitHandler | null = null

export function setQuitHandler(fn: QuitHandler | null): void {
  _quitHandler = fn
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
  /**
   * Present 命令通道 —— D17b:HP-mutate opcode(0x21/0x5B/0x39/0x5A/0x5F/0x60/0x69)
   * 结算后 emit `showDamageNum`(对照 sdlpal `PAL_BattleDisplayStatChange` 在每次行动后
   * 对所有 wPrevHP!=wHealth 的敌/我画数字)。caller 不传时 runScript 自动从 opts.bus 注入
   * (所有 runScript caller 都已透传 bus)。
   */
  bus?: CommandBus
  /**
   * 顺序修(2026-06-05 user 报"灵葫咒掉血在动画前"):scriptOnSuccess 的 HP-mutate opcode 数字**延迟到法术
   * 动画时间线播完后** emit 的缓冲(performMagic 注入,合进 timeline pendingNums)。存在 → emitDamageNum push
   * 进它;不存在(item/throw/敌回合毒 tick 等无动画上下文)→ 即时 bus.emit(向后兼容)。对照 sdlpal
   * PAL_BattleDisplayStatChange 在 ShowOffMagic/DefMagicAnim **之后**(fight.c:4322)。
   */
  pendingDamageNums?: Array<{ target: { kind: 'enemy' | 'player', idx: number }, value: number, color: 'blue' | 'yellow' | 'cyan' }>
  /**
   * 投掷物 OffMagic 特效帧缓冲(performThrowItem 注入,2026-06-05)。0x42/0x66 SimulateMagic 在场则把
   * PAL_BattleShowPlayerOffMagicAnim 的 FIRE 特效帧(buildPlayerOffMagicTimeline casterIdx=-1)push 进它,
   * performThrowItem 接挥臂动画后一起 startBattleAnim(sdlpal fight.c:5340)。不在场 → 不建(向后兼容/无动画)。
   */
  pendingAnimFrames?: NonNullable<BattleState['battleAnim']>['frames']
  /** 投掷物 OffMagic 特效 n(FIRE.MKF chunk[effect] 帧数)—— performThrowItem 注入,0x42/0x66 建特效帧用。 */
  magicSpriteFrameCounts?: Map<number, number>
  /**
   * E 类伤害 opcode(0x42 SimulateMagic / 0x66 throw weapon)解析 magic 用 ——
   * `0x42` op0 是 magic object id,需 objectMagics 解析成 magicNumber/flags,
   * 再 magics 取 baseDamage/elemental。由 performThrowItem(及未来 0x66 caller)注入;
   * 不注入时 0x42 走 no-op(consumed,防御)。
   */
  magicTables?: { magics: Magic[], objectMagics: ObjectMagicView[] }
  /** 0x28 apply poison 解析 poison 的 wEnemyScript —— performThrowItem 注入。 */
  objectPoisons?: ObjectPoisonView[]
  /** 0x88 set magic damage by money 需 `gpGlobals->dwCash` —— performMagic 注入。 */
  gs?: GameState
  /**
   * 0x66 throw weapon 算 w 需 `PAL_GetPlayerAttackStrength(movingPlayer=caster)` ——
   * 由 performThrowItem 注入(caster 是投掷队员)。不注入 → attackStrength 当 0。
   */
  playerRoles?: PlayerRoles
  /**
   * 0x92 show-magic-anim:cast 特效帧基号 = `rgwBattleEffectIndex[battleSprite][0]*10+15`
   * (fight.c:2387-2389)需此表(rgwBattleEffectIndex[10][2] flat,battle-effect-index.json)。
   * 由 enemy turnStart/ready 的 runScript 注入(0x92 在 scripted battle cutscene 内,如赵灵儿力量觉醒)。
   */
  battleEffectIndex?: number[]
  /**
   * 0x9E enemy summon 需:enemies(enemies.json,按 enemyId 取召唤兽 stats)+
   * enemyObjects(enemy-objects.json,按 objectIndex 解 op0 → enemyId/scripts/抗性)。
   * 由 enemy scriptOnReady 的 runScript 注入(battle-system tickPerformAction)。
   */
  summonTables?: { enemies: Enemy[], enemyObjects: EnemyObject[] }
  /** 0x6A 偷取成功"获得 物品名"提示需 items(按 stealItem id 取 _name)—— performMagic 注入。 */
  items?: Item[]
  /**
   * 0x28 apply poison 施毒时跑一次 poison.wEnemyScript —— sdlpal `script.c:1213`
   * `wPoisonScript = PAL_RunTriggerScript(rgObject[id].poison.wEnemyScript, wEventObjectID)`:
   * 施毒当下跑一次入口脚本(跳过 0x0001 入口 terminator → 存推进后的 entry),后续每回合
   * tick 再推进。自推进蛊孵化链(食妖虫附→灵蛊)的"九回合"精确计数靠此。
   * 需 commands(脚本所在)+ runScript(自身,递归跑)—— performThrowItem / performMagic 注入。
   * 不注入 → fallback 存原始 enemyScript(差一拍,链晚一回合推进,仍能炼成)。
   */
  commands?: Command[]
  runScript?: (opts: RunScriptOptions) => number
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
  /**
   * 初始 wEventObjectID(sdlpal PAL_RunTriggerScript 第 2 参)—— 0x29/0x61 等 single-target opcode 用。
   * 如敌人普攻 equivItem.scriptOnUse(wPlayerRole)需 seed 为被打队员 role,使脚本里 0x29 单体毒该队员。
   * 省略 → undefined(单体类 opcode 无目标 → no-op)。
   */
  eventObjectId?: number
}

/** 上下位置互换(top↔bottom)—— 原版 PAL_StartDialog 切位置时不擦掉另一侧旧像素。 */
function isVerticalDialogSwap(a: DialogBoxStyle, b: DialogBoxStyle): boolean {
  return (a === 'top' && b === 'bottom') || (a === 'bottom' && b === 'top')
}

function hasVisibleDialogContent(state: DialogBoxState): boolean {
  return state.shownLines.length > 0 || state.currentLineText !== null || state.titleText !== undefined
}

function cloneDialogBoxForKeep(state: DialogBoxState): DialogBoxState {
  const currentLineLen = state.currentLineText?.length ?? 0
  return {
    ...state,
    shownLines: [...state.shownLines],
    shownLineColors: state.shownLineColors?.map((colors) => [...colors]),
    currentLineColors: state.currentLineColors ? [...state.currentLineColors] : undefined,
    currentLineRevealAt: state.currentLineRevealAt ? [...state.currentLineRevealAt] : undefined,
    charsRevealed: state.currentLineText === null
      ? state.charsRevealed
      : Math.max(state.charsRevealed, currentLineLen),
    keyIconBlink: state.phase === 'waiting-page-key' || state.phase === 'waiting-end-key',
    pendingStyle: undefined,
    pendingFullClear: undefined,
    pendingPreOpClear: undefined,
    pendingPartialClear: undefined,
  }
}

function keepDialogForStyleSwitch(gs: GameState, state: DialogBoxState, nextStyle: DialogBoxStyle): void {
  if (hasVisibleDialogContent(state) && isVerticalDialogSwap(state.style, nextStyle)) {
    gs.dialogBoxKept = cloneDialogBoxForKeep(state)
  }
  else {
    gs.dialogBoxKept = undefined
  }
}

function clearDialogBoxes(gs: GameState): void {
  gs.dialogBox = undefined
  gs.dialogBoxKept = undefined
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
  // sdlpal script.c:3389-3426 setDialogStyleX 入口 PAL_ClearDialog(TRUE):仅 nCurrentDialogLine>0 才等键
  //   (text.c:1770)。`~` 收尾句 → dialogLineCount==0 → 不等键,直接清旧框 + apply 新 style(走下方 fall-through)。
  if (ds && ds.dialogLineCount > 0) {
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
    keepDialogForStyleSwitch(gs, ds, style)
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
  if (_globalCommands.length === 0) return // P2#5:全局脚本数组未就绪(all.json 未载)→ 不跑
  for (const npc of gs.npcs) {
    if ((npc.sState ?? 1) === 0) continue  // sdlpal `sState > 0` 才跑 autoScript
    // owner 跳过门控 —— **仅** waiting===undefined 那一 tick 跳,frame-wait/scene-fade 期间照跑(对齐 sdlpal)。
    // sdlpal 真值:PAL_GameUpdate 自动脚本循环(play.c:172-191)对场景内每个 sState>0 对象都跑 PAL_RunAutoScript,
    //   **无任何 owner 排除**。owner 自动脚本在它触发脚本的 0x09 wait(每帧 PAL_GameUpdate(FALSE))期间正常跑
    //   (eg. 水月宫赵灵儿对话后 op36 设自己 autoScript=走向右上 L_4330,op9 wait 14 期间逐帧走,再 op73 隐藏)。
    // TS 对话朝向 bug(2026-06-03)只发生在 talk 触发后**第一条 opcode 步进前**那 1 tick:cursor.waiting 仍
    //   undefined → mode.ts 放行 autoScript,owner 的 idle/巡逻脚本(0x0B-0x0E/0x0F/0x14/0x16/0x4C 写 facing)抢跑
    //   一步把"面向玩家"覆盖回去 → "转向一帧立刻转回"。该缝隙只在 waiting===undefined,故只在此态跳 owner。
    // 旧码对**所有** waiting 都跳 owner(基于"sdlpal owner 整段不跑"的错误理解)→ 把赵灵儿 frame-wait 期该跑的
    //   walk 也跳了 → 她原地等 14 帧后被隐藏("缺少移动,原地消失",2026-06-05 user 报 水月宫)。
    // ⚠ waiting===undefined 分支行为不变:party-walk/滚屏/ride(张四划船等)期 owner 仍按原状跳,零回归。
    if (
      gs.eventCursor?.triggerOwnerId !== undefined
      && npc.id === gs.eventCursor.triggerOwnerId
      && gs.eventCursor.waiting === undefined
    ) continue
    if (!npc.autoCursor) {
      // scene-load 切片解析(game-state.sliceSceneEventObjects / npcFromEventObject)只查
      // sceneLabelMap;**入口在全局数组**(events/all.json 高位 entry,如丁大伯挥锄 autoScript
      // L_36205)的 NPC 解不到 → autoCursor 留 undefined → 冻在首帧不跑 autoScript,直到对话触发
      // 0x24 setAutoScript(走 resolveScriptLabel)才解析上。此处补走同一 resolveScriptLabel
      // (scene→shared→global),与 0x24 同路:sdlpal `wAutoScript` 本是单一全局 lprgScriptEntry
      // 索引,无 per-scene 概念(play.c:178-183),切片优化后在此补回全局语义。
      // autoLabel 被 0x24 清空(undefined)的不动;已解析的 autoCursor 在共享 event object 上持久
      // (保留 autoscript 进度,重进 scene 不重解)。
      if (!npc.autoLabel) continue
      const r = resolveScriptLabel(gs, npc.autoLabel)
      if (!r) continue
      npc.autoCursor = { ip: r.ip } // P2#5:只存全局 ip,默认读 _globalCommands
    }
    runOneAutoOp(gs, npc)
  }
}

function runOneAutoOp(gs: GameState, npc: NpcState, gotoDepth = 0): void {
  const cursor = npc.autoCursor!
  // P2#5:cursor.ip 是全局下标,默认读单一全局数组(getCmds/getLabels);不再按 scene 切片填充。
  const cmds = getCmds(cursor)
  if (cursor.ip < 0 || cursor.ip >= cmds.length) {
    npc.autoCursor = undefined  // ip 越界 → 停
    return
  }
  const cmd = cmds[cursor.ip]!

  switch (cmd.op) {
    case 'end':
      // opcode 0x04 call-script 返回:子脚本 'end' → 弹返回帧,恢复 caller ip/commands/labelMap/对象。
      // (autoScript 调子脚本 eg. 开门;子脚本 end 是 plain,callStack 非空时优先弹帧。)
      if (cursor.callStack && cursor.callStack.length > 0) {
        const frame = cursor.callStack.pop()!
        cursor.ip = frame.returnIp
        cursor.commands = frame.returnCommands
        cursor.labelMap = frame.returnLabelMap
        cursor.currentEventObjectId = frame.savedEventObjectId
        return
      }
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
          // P2#5:resetTo 是全局 entry 号,直接经 getLabels(默认全局 labelMap)→ 全局 ip。
          const target =
            cmd.resetTo !== undefined ? getLabels(cursor)[`L_${cmd.resetTo}`] : undefined
          if (target !== undefined) cursor.ip = target
          else npc.autoCursor = undefined // resetTo 不在全局数组 → 停(异常)
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
      // sdlpal PAL_RunAutoScript case 0x0003(script.c:3549-3564)真值:
      //   if (op[1]==0 || ++wScriptIdleFrameCountAuto < op[1]) { wScriptEntry=op[0]; goto begin; }  // 跳转
      //   else { wScriptIdleFrameCountAuto=0; wScriptEntry++; }                                       // fall-through
      // frameDelay(op[1])= **循环次数上限**,不是"空等帧数":每次命中 goto 都 ++count,count<delay 时
      //   跳转(并同帧跑目标 op,见下),第 delay 次命中时 count 复位 + fall-through 到下一条。
      //   ⚠ 与 0x0002 reset(本文件上方 cmd.reset 分支)完全同款计数语义 —— 那条是对的,本条曾写反。
      // 旧 bug(2026-06-05 user 报 仙灵岛 赵灵儿降临"非常缓慢"):把 frameDelay 当"空等 N-1 帧再跳",
      //   且计数满后**仍跳转**(永不 fall-through)→ 循环体(如 L_5572 落体 0x7D move)每 N 帧才跑 1 次
      //   + 无限循环不落地/不减速。修正为 sdlpal 真值:count<delay 跳转跑循环体,满则 fall-through。
      const frameDelay = cmd.frameDelay ?? 0
      if (frameDelay !== 0 && (cursor.idleFrameCount = (cursor.idleFrameCount ?? 0) + 1) >= frameDelay) {
        // 第 frameDelay 次命中:复位计数 + fall-through 到下一条(不跳转)。
        cursor.idleFrameCount = 0
        cursor.ip++
        return
      }
      // 跳转分支(frameDelay==0 恒跳,或 count<frameDelay)。
      const target = resolveLabelIp(cursor, cmd.to) // P2#5:含 shared# 剥前缀 → 全局 ip
      if (target === undefined) {
        npc.autoCursor = undefined  // 目标不在全局数组 → 停(异常)
        return
      }
      cursor.ip = target
      // sdlpal `goto begin` —— 跳转**不消耗帧**,同帧续跑目标 op(script.c:3515 注释 "one instruction per
      //   frame **except jumping**")。旧码若 return 消耗一帧 → 循环 autoscript(如张四划船 36147:16 移动 op +
      //   goto 回头)每圈丢 1 帧 → 比 ride(每帧 1 步,sdlpal 每步 PAL_GameUpdate 锁步)慢 ~6%(2026-05-30 报)。
      //   修:同帧递归跑目标 op(深度护栏防全-instant goto 自环爆栈)。
      if (gotoDepth >= SINGLE_TICK_LIMIT) {
        npc.autoCursor = undefined // goto 自环超限(异常死循环)→ 停
        return
      }
      runOneAutoOp(gs, npc, gotoDepth + 1)
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

      // 其余 raw op(含 0x04 call / 条件跳转 / 0x06 / 0xA2 等"动游标"opcode)走统一 applyRawOpcode,
      // 传入本 autoCursor → 跳转 / call 操作它(子脚本 'end' 在上面 callStack 分支弹回),与 trigger
      // 同一套解释器。作用对象 = cursor.currentEventObjectId(call op1 覆盖时)否则 npc.id(0-based)。
      // call/jump 改写 cursor.ip 后,下面 cursor.ip++ 抵消 sdlpal `target-1` 偏移(同主 while)。
      // cursor as ScriptCursor:commands/labelMap 已在函数起手填妥(类型层 optional,运行时必有)。
      applyRawOpcode(
        gs, cmd.opcode, cmd.operands,
        cursor.currentEventObjectId ?? npc.id,
        cursor as ScriptCursor,
      )
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

  // 1a'') waiting 处理:camera-pan(opcode 0x7F 多帧 viewport 平移,sdlpal script.c:2331-2377)
  //   每 tick 移 camera += (dx,dy) + 自减;归 0 时 clear + ip++,fall through 续跑下条 opcode。
  if (cursor.waiting === 'camera-pan') {
    gs.camera.x += cursor.cameraPanDx ?? 0
    gs.camera.y += cursor.cameraPanDy ?? 0
    const remaining = (cursor.cameraPanFramesRemaining ?? 1) - 1
    if (remaining > 0) {
      cursor.cameraPanFramesRemaining = remaining
      return
    }
    cursor.cameraPanFramesRemaining = undefined
    cursor.cameraPanDx = undefined
    cursor.cameraPanDy = undefined
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

  // 1a'½) waiting 处理:palette-fade / scene-fade(特效 A 调色板 ramp,opcode 0x50/0x51/0x80/0x8C/0x4F/0x93)
  //   两 tag 解析完全相同(time-based,到 totalMs 完成 → finalize 精确套 target + ip++);唯一区别在
  //   mode.ts autoScript gate:'scene-fade'(0x93 / 0x80 fUpdateScene)放行 NPC 动画,'palette-fade' 冻全场。
  //   present.ts `stepPaletteFade` 每帧按 elapsed 把 gs.palette.colors ramp 到 target。
  if (cursor.waiting === 'palette-fade' || cursor.waiting === 'scene-fade') {
    const pf = gs.paletteFadeState
    if (!pf) {
      cursor.waiting = undefined  // 防御:无 paletteFadeState 不应等
    }
    else {
      const elapsed = performance.now() - pf.startTimeMs
      if (elapsed < pf.totalMs) {
        return  // 仍在 fade
      }
      // 收尾:把工作调色板精确设为 target(present 最后一帧 progress<1 可能差 1 步,这里补齐)。
      if (gs.palette) finalizePaletteFade(gs.palette.colors, pf)
      gs.paletteFadeState = undefined
      cursor.waiting = undefined
      // 0x4E load-last-save:淡黑完成 → 重载存档槽 + 终止脚本(sdlpal script.c:1766 return 0)。在 ip++ 前拦截。
      if (cursor.reloadSlotAfterFade !== undefined) {
        const slot = cursor.reloadSlotAfterFade
        cursor.reloadSlotAfterFade = undefined
        gs.eventCursor = undefined  // 停脚本(对齐 return 0;reload handler 会替换 gs 全字段)
        if (_loadLastSaveHandler) _loadLastSaveHandler(slot)
        else console.debug('event-system: loadLastSave(无 _loadLastSaveHandler 注入,skip)')
        return
      }
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

  // 1a'''') waiting 处理:shop(opcode 0x26/0x27)— 脚本开商店菜单后阻塞。
  //   正常路径 mode='menu' 时 tickEventSystem 根本不被调;菜单关闭由 menu-mode resume
  //   清 waiting + 切 mode='event'。此处防御:若残留 mode='event'+waiting='shop' 不步进。
  if (cursor.waiting === 'shop') {
    return
  }

  // 特效 C:RNG 动画播放中(modal,bootstrap _rngPlayHandler 跑 playRng + suspendRaf)。
  //   handler 播完(promise finally)清 cursor.waiting → 下个 tick 落不到这里,从 ip(已 ++)续跑。
  if (cursor.waiting === 'rng-play') {
    return
  }

  // 特效 B:FBP 全屏图显示中(modal,bootstrap _showFbpHandler 跑 showFbp + suspendRaf)。同 rng-play。
  if (cursor.waiting === 'show-fbp') {
    return
  }

  // 特效 B:FBP 滚动卷入中(modal,bootstrap _scrollFbpHandler 跑 scrollFbp + suspendRaf)。同 show-fbp。
  if (cursor.waiting === 'scroll-fbp') {
    return
  }

  // 结局:结局动画播放中(modal,bootstrap _endingAnimationHandler 跑 400 帧 + suspendRaf)。同 show-fbp。
  if (cursor.waiting === 'ending-anim') {
    return
  }

  // 0x4D wait-for-any-key(sdlpal play.c:602-638 PAL_WaitForKeyInternal(0, FALSE)):永久等,
  //   sdlpal 只认 `kKeySearch | kKeyMenu`。ts 映射:Confirm(kKeySearch)/Menu(kKeyMenu)/Cancel
  //   (ts 菜单回退键,与 kKeyMenu 语义等价)。按下任一 → 清 waiting + ip++ fall through;否则本 tick 不动。
  //   `pressed`(本 tick 新按下)天然实现 sdlpal PAL_ClearKeyState() 后的"等新按键"语义(进 wait 时
  //   按住的键不在下一 tick 的 pressed 里)。
  if (cursor.waiting === 'wait-key') {
    if (input.pressed.has('Confirm') || input.pressed.has('Menu') || input.pressed.has('Cancel')) {
      cursor.waiting = undefined
      cursor.ip++
      // fall through to main while loop
    }
    else {
      return
    }
  }

  // 0x0A goto-if-no 确认框(sdlpal script.c:3373-3387 / uigame.c:342-365 PAL_ConfirmMenu)。
  //   fire 时未 ip++ → 此处 cursor.ip 仍指 0x0A op,据此读 operand[0](否分支跳转目标)。
  //   否/是 toggle:sdlpal PAL_ReadMenu 2 项 Down/Right=next、Up/Left=prev 带 wrap → 等价 toggle。
  //   Confirm 提交:是(confirmYes)→ip++(wScriptEntry++);否→goto operand[0]。
  //   Cancel/Menu = sdlpal kKeyMenu → MENUITEM_VALUE_CANCELLED → FALSE → 等价否→goto。
  //   提交清 gs.dialogBox:对齐 PAL_ClearDialog 收尾(问句消失;后续 0x05 因 nCurrentDialogLine=0 不再等键)。
  if (cursor.waiting === 'confirm') {
    if (
      input.pressed.has('Up') || input.pressed.has('Down')
      || input.pressed.has('Left') || input.pressed.has('Right')
    ) {
      cursor.confirmYes = !cursor.confirmYes
    }
    if (input.pressed.has('Confirm')) {
      const yes = cursor.confirmYes === true
      const cmd0a = getCmds(cursor)[cursor.ip]
      clearDialogBoxes(gs)
      cursor.waiting = undefined
      cursor.confirmYes = undefined
      if (yes) {
        cursor.ip++ // sdlpal wScriptEntry++;fall through 主 while 同帧跑下条 op
      }
      else if (!resolveConfirmGoto(gs, cursor, cmd0a)) {
        return // 否→goto;目标越界已终止脚本
      }
      // fall through to main while loop
    }
    else if (input.pressed.has('Cancel') || input.pressed.has('Menu')) {
      const cmd0a = getCmds(cursor)[cursor.ip]
      clearDialogBoxes(gs)
      cursor.waiting = undefined
      cursor.confirmYes = undefined
      if (!resolveConfirmGoto(gs, cursor, cmd0a)) {
        return // 终止
      }
      // fall through to main while loop(cancel = 否 = goto)
    }
    else {
      return // 等输入(冻全场,autoScript 不跑)
    }
  }

  // 0xA0 quit:回标题流程进行中(WIN95 结局 mp4 modal / DOS 即时)。_quitHandler 完成后 mode='menu'
  //   + 清 eventCursor,tickEventSystem 不再被调;期间(suspendRaf 不 gate 逻辑 tick)block 不步进。
  if (cursor.waiting === 'quit') {
    return
  }

  // 1a''') waiting 处理:delay(opcode 0x0085 UTIL_Delay,script.c:2511-2516)
  //   time-based:到 delayUntilMs(wall-clock)即完成。期间 autoScript 暂停(mode.ts:event 非
  //   frame-wait → 不跑),对齐 sdlpal UTIL_Delay 不调 PAL_GameUpdate 的真值。
  if (cursor.waiting === 'delay') {
    if (performance.now() < (cursor.delayUntilMs ?? 0)) {
      return  // 仍在延迟
    }
    cursor.delayUntilMs = undefined
    cursor.waiting = undefined
    cursor.ip++
    // fall through to main while loop
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
    else if (gs.dialogBox.style === 'narration' || gs.dialogBox.style === 'item-box') {
      // sdlpal text.c:1663-1710 kDialogCenterWindow(物品提示 "得到XX" / 'item-box' 炼丹物品框):全文瞬显 +
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
        clearDialogBoxes(gs)
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
        const pendingStyleToKeep = ds.phase === 'waiting-page-key' ? ds.pendingStyle?.style : undefined
        const keptDialog = pendingStyleToKeep && hasVisibleDialogContent(ds) && isVerticalDialogSwap(ds.style, pendingStyleToKeep)
          ? cloneDialogBoxForKeep(ds)
          : undefined
        const result = confirmDialog(ds)
        if (result === 'skip-typing') {
          // sdlpal PAL_ShowDialogText fUserSkip 真值(text.c:1616):Space 跳字后整行**先显示+渲染**
          // (VIDEO_UpdateScreen)才返回脚本继续。我们 tick 模型:本 tick 把整行设满后 **return**,
          // 让 presentFrame 渲染满行一帧;**下一 tick** 才走 line-done 自动推进。
          // 否则若下条 opcode 是 loadScene(渐变)/ fadeScreen 等渲染门,满行那帧没机会画 → 玩家只看到
          // 上一帧(本行 0 字 / 上一行)就进渐变(2026-05-29 梦境快按 Space 只出 1 行的根因)。
          return
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
            gs.dialogBoxKept = keptDialog
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
            clearDialogBoxes(gs)
          }
          cursor.waiting = undefined
          if (!preOp) cursor.ip++
          // fall through 到下面 while 循环:本 tick 继续跑下条 opcode(preOp 时 ip 不变,跑原 opcode;
          // 非 preOp 时 ip 已 ++,跑下一条)
        }
        else if (result === 'dialog-end') {
          // 关 dialog,推进到 end 之后(此时 cursor.ip 已在 end opcode 上,end handler 处理退出)
          clearDialogBoxes(gs)
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

    const cmds = getCmds(cursor) // P2#5:默认单一全局数组(cursor.ip 全局下标)
    if (cursor.ip < 0 || cursor.ip >= cmds.length) {
      console.warn(`event-system: ip ${cursor.ip} 越界 → 切回 explore / menu`)
      gs.eventCursor = undefined
      clearDialogBoxes(gs)
      consumePendingItem(gs)  // item.scriptOnUse 跑完 → 按 g_fScriptSuccess gate 扣物品
      gs.iCurEquipPart = -1   // sdlpal PAL_RunTriggerScript 末尾(script.c:3476)reset — 0x18 设的 part 不泄漏
      restoreModeAfterScript(gs) // applyToAll → 关菜单回 explore;否则 menuStack 非空回 menu(INNER 循环)
      triggerPendingSceneLoad(gs) // loadScene 续跑的脚本 ip 越界结束 → 触发延迟 reload
      return
    }

    const cmd = cmds[cursor.ip]!

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
      //   - 0x8E:partialClear → 保 titleText + portraitIcon,清 body
      //   - 其他 op (NPC 动画 / wait / pose 切换):fullClear → 清整 dialogBox(title+portrait 都消失)
      const isRestoreScreen = cmd.op === 'raw' && cmd.opcode === OP_RESTORE_SCREEN
      // sdlpal script.c:3468 default → PAL_ClearDialog(TRUE):仅 nCurrentDialogLine>0 才 PAL_DialogWaitForKey
      //   (text.c:1770)。`~` 收尾句 / 仅 title 行 → dialogLineCount==0 → **不等键、不画箭头**,但仍要清屏
      //   (后续非 dialog opcode 会重画覆盖对话区)。
      if (gs.dialogBox.dialogLineCount > 0) {
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
      // dialogLineCount==0:不等键,立即清(0x8E 保 title 清 body;其余清整框),**不 return** —
      //   本 tick 继续跑该 opcode(opcode 尚未消费)。
      if (isRestoreScreen) {
        resetDialogBody(gs.dialogBox)
      } else {
        clearDialogBoxes(gs)
      }
    }

    switch (cmd.op) {
      case 'end':
        // sdlpal script.c:3475 PAL_EndDialog → PAL_ClearDialog(TRUE):仅 nCurrentDialogLine>0 才
        //   PAL_DialogWaitForKey(text.c:1770)→ 等 Confirm 关 dialog + 画箭头。
        if (gs.dialogBox && gs.dialogBox.phase !== 'waiting-end-key') {
          if (gs.dialogBox.dialogLineCount > 0) {
            setWaitingEndKey(gs.dialogBox)
            cursor.waiting = 'dialog'
            return // 等下次 tick Confirm 处理
          }
          // dialogLineCount==0(`~` 收尾句,如梦境末句):不等键不画箭头,直接关 dialog 继续收尾
          clearDialogBoxes(gs)
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
            nextEntry = getLabels(cursor)[`L_${cmd.resetTo}`] ?? cursor.onEnterStartIp ?? cursor.ip
          }
          else nextEntry = cursor.onEnterStartIp ?? cursor.ip
          gs.sceneOnEnterIp[cursor.onEnterSceneId] = nextEntry
          // P2#7:sceneLoading 已在 loadSceneCommon assets 载入后清,这里幂等防御清一次(任何路径不残留)。
          gs.sceneLoading = false
        }
        // NPC trigger 脚本推进持久化(sdlpal play.c `pEvtObj->wTriggerScript = PAL_RunTriggerScript(...)`):
        //   0x01 advance → 续跑下一条;0x02 reset → resetTo;0x00 plain → 原点(triggerResume 清空,可重触发)。
        //   否则 0x01 收尾的 cutscene 每次接触都重播(2026-05-28 客栈李大娘苗人演出重播根因)。
        if (cursor.triggerOwnerId !== undefined) {
          const owner = gs.npcs.find((n) => n.id === cursor.triggerOwnerId)
            ?? gs.allEventObjects?.[cursor.triggerOwnerId]
          if (owner) {
            if (cmd.advance) {
              owner.triggerResume = { ip: cursor.ip + 1 } // P2#5:全局 ip,默认读全局数组
            }

            else if (cmd.reset && cmd.resetTo !== undefined) {
              const t = getLabels(cursor)[`L_${cmd.resetTo}`]
              if (t !== undefined) {
                owner.triggerResume = { ip: t } // P2#5:全局 ip,默认读全局数组
              }
            }
            // 0x00 plain:sdlpal 返回起始 entry(原地可重触发)→ triggerResume **不动**
            //   (已是本次起始 = 上次 advance 的续跑点,或 undefined 走 triggerLabel)。清空会错误
            //   回退到 triggerLabel 原点重播已推进过的 cutscene。
          }
        }
        gs.eventCursor = undefined
        clearDialogBoxes(gs)
        gs.currentDialogPortraitIcon = undefined
        // sdlpal PAL_EndDialog(text.c:1814)真值:脚本结束把 bDialogPosition 复位 kDialogUpper(top)。
        // 下个 trigger 脚本若直接 showDialog 没先 setDialogStyle(eg. 厨房李大娘 L_560)→ 用 top 默认,
        // 而非继承上段 cutscene 的 center/narration(2026-05-28 "逍遥快把酒菜"显示成居中框的根因)。
        gs.currentDialogStyle = 'top'
        // Sync.2 fix5:主角 scripted pose / sprite override 不在此清,
        //   由 scene-system 首次走动检测时清(避免单元测试 setX→end 两 opcode 后立即 read 不到值)
        // sdlpal play.c:264-323 PAL_GameUseItem:非 applyToAll item 在 INNER while 循环里反复用
        //   (用完回 ItemUseMenu,user 反馈"没用完可以继续使用");applyToAll item `return` 退出 →
        //   关菜单回 explore(让脚本设的世界 trigger 触发,如桂花酒酒剑仙)。NPC trigger / onEnter 同 else 支。
        consumePendingItem(gs)  // item.scriptOnUse 'end' 收尾 → 按 g_fScriptSuccess gate 扣物品
        gs.iCurEquipPart = -1   // sdlpal PAL_RunTriggerScript 末尾(script.c:3476)reset
        restoreModeAfterScript(gs)
        triggerPendingSceneLoad(gs) // loadScene 续跑的脚本结束 → 触发延迟 reload(sdlpal 下帧 PAL_LoadResources)
        return

      case 'goto': {
        // P2#5:单一全局数组 — goto 目标(含旧 `shared#L_xxx` 前缀,剥掉即得全局 L_<n>)→ 全局 ip。
        // resolveLabelIp 经 getLabels(默认全局 labelMap);不再切 cursor 来源。
        const target = resolveLabelIp(cursor, cmd.to)
        if (target === undefined) {
          // 目标 label 不在全局数组(异常数据)→ **终止脚本**,不能 `break`(同 ip 自旋到
          // SINGLE_TICK_LIMIT 抛错)。同 ip 越界路径:清 cursor + 回 explore/menu。
          console.warn(`event-system: goto label ${cmd.to} 不在全局 labelMap → 终止脚本`)
          gs.eventCursor = undefined
          clearDialogBoxes(gs)
          consumePendingItem(gs)
          gs.iCurEquipPart = -1
          restoreModeAfterScript(gs)
          return
        }
        // frameDelay(sdlpal trigger PAL_InterpretInstruction 0x03,script.c:3243-3255):
        //   `if (op[1]==0 || ++nScriptIdleFrame < op[1]) wScriptEntry=op[0]; else { idle=0; ip++ }`。
        //   cutscene NPC 走步循环(`0x6E/0x6C 走一步; 0x09 wait; 0x03 goto-back[fd]`,6 个 trigger 真站点):
        //   计数中 → 跳回 loop 头(同 tick 续跑,loop 内 0x09 提供逐 tick yield → 每 tick 走一步);
        //   满 fd → reset + ip++ 退出。**缺此计数 → 跳转恒成立 → 走步无限循环**(NPC 走不停)。
        const frameDelay = cmd.frameDelay ?? 0
        if (frameDelay > 0) {
          cursor.scriptIdleFrame = (cursor.scriptIdleFrame ?? 0) + 1
          if (cursor.scriptIdleFrame >= frameDelay) {
            cursor.scriptIdleFrame = 0
            cursor.ip++ // 满 fd 帧 → 退出循环,续跑下条
            break
          }
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
        // 纯控制符行(无可见字符且无等键图标,如死亡脚本 L_41075 的 showDialog "$00"/"$02" 只设打字速度)→
        //   sdlpal TEXT_DisplayText 不增 nCurrentDialogLine(无可见字 → 不开新行)→ ts 跳过,不加空行
        //   (否则死亡对话框多出空行,user 报"死亡文字渲染")。带图标的(/) 单行保留。advance + 同 tick 续跑。
        {
          const parsed = parseDialogText(cmd.text, 0, true)
          if (parsed.text.length === 0 && parsed.icon === 0) {
            cursor.ip++
            break
          }
        }
        // 传**原始** cmd.text —— startDialogLine/appendDialogLine 内 parseDialogText 解析控制符:
        //   `"`黄/`-`青/`'``@`红 toggle 逐字符上色,消费 `$~()\` + `~` 提前结束(sdlpal TEXT_DisplayText
        //   text.c:1458-1613)。旧 stripDialogControlCodes 只剥 `$~\d`、漏颜色 + `"()` 字面显示(2026-05-30 修)。
        if (!gs.dialogBox) {
          gs.dialogBox = startDialogLine(cmd.text, {
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
          appendDialogLine(gs.dialogBox, cmd.text)
        }
        cursor.waiting = 'dialog'
        // P2#7:content-no-fade onEnter(有对话、无 fadeScreen,如 scene 14)— 对话是第一个可渲染 yield,
        // 此时 setPartyPos 等已跑完(camera 已对)→ 清 sceneLoading 让对话渲染。fade-first onEnter 的
        // fadeScreen 在对话前已清(此处 sceneLoading 已 false,不重复)。
        if (gs.sceneLoading) gs.sceneLoading = false
        // 通知用解析后可见文本(剥控制符);showDialogBox 仅通知,实际渲染走 gs.dialogBox。
        bus.emit({
          op: 'showDialogBox',
          text: gs.dialogBox?.currentLineText ?? gs.dialogBox?.titleText ?? cmd.text,
          style: gs.currentDialogStyle,
        })
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
        // P0.e: opcode 7 startBattle 切 mode='battle' → 存战后接回 + 释放 cursor,return 退出 tickEventSystem
        if (cmd.opcode === OP_START_BATTLE) {
          savePostBattleResume(gs, cursor, cmd.operands) // 战末接回触发脚本(0x52 隐藏怪 等)
          tryStartBattle(gs, cmd.operands[0] ?? 0, cmd.operands[2] ?? 0)
          gs.eventCursor = undefined
          clearDialogBoxes(gs)
          return
        }
        // P2#6b: opcode 0x08 checkpoint(sdlpal script.c:3335-3341)— 把持久化 resume 点设到 0x08 之后
        //   **且继续跑**(ip++)。trigger:写 owner.triggerResume;onEnter:写 sceneOnEnterIp。
        //   后续 0x01/0x02 'end' 会覆盖(advance/reset);0x00 plain 不动 → checkpoint 保留(重触发续跑)。
        if (cmd.opcode === OP_CHECKPOINT_ADVANCE) {
          const resumeIp = cursor.ip + 1
          if (cursor.triggerOwnerId !== undefined) {
            const owner = gs.npcs.find((n) => n.id === cursor.triggerOwnerId)
              ?? gs.allEventObjects?.[cursor.triggerOwnerId]
            if (owner) {
              owner.triggerResume = { ip: resumeIp } // P2#5:全局 ip,默认读全局数组
            }
          }
          if (cursor.onEnterSceneId !== undefined) {
            gs.sceneOnEnterIp[cursor.onEnterSceneId] = resumeIp
          }
          cursor.ip = resumeIp // 继续跑(本 tick 接下条 opcode)
          break
        }
        // opcode 0x26 buy / 0x27 sell(sdlpal script.c:1157-1172)— 脚本开商店菜单后阻塞。
        //   sdlpal PAL_MakeScene + VIDEO_UpdateScreen + PAL_BuyMenu/SellMenu(modal,玩家退出才返回),
        //   返回后继续跑下条 opcode。我们 tick 模型:_shopMenuHandler 开 menu(mode='menu') +
        //   cursor.waiting='shop' + ip++ + return;菜单关(menu-mode resume)→ mode='event' 续跑。
        if (cmd.opcode === OP_BUY_MENU || cmd.opcode === OP_SELL_MENU) {
          const isBuy = cmd.opcode === OP_BUY_MENU
          if (_shopMenuHandler) {
            _shopMenuHandler({ gs, mode: isBuy ? 'buy' : 'sell', storeNum: cmd.operands[0] ?? 0 })
            cursor.waiting = 'shop'
            cursor.ip++ // PAL_BuyMenu 返回后跑下条(菜单关闭时从此 ip 续)
            return // 切 menu mode,停本 tick 脚本执行
          }
          console.debug(
            `event-system: ${isBuy ? 'buy' : 'sell'} menu storeNum=${cmd.operands[0]}(无 _shopMenuHandler 注入,skip)`,
          )
          cursor.ip++
          break
        }
        // 特效 C:opcode 0x37 PlayRNG(sdlpal script.c:1544-1552)— 阻塞 modal 播 RNG.MKF 动画。
        //   PAL_RNGPlay(iCurPlayingRNG, op0=start, op1>0?op1:-1=end, op2>0?op2:16=speed)。
        //   chunk 号来自 gs.iCurPlayingRNG(0x36 设),**非** operand。同 shop 模式:_rngPlayHandler
        //   开 modal(suspendRaf + playRng)+ waiting='rng-play' + ip++ + return;播完清 waiting 续跑。
        if (cmd.opcode === OP_PLAY_RNG) {
          const startFrame = cmd.operands[0] ?? 0
          const op1 = cmd.operands[1] ?? 0
          const op2 = cmd.operands[2] ?? 0
          const endFrame = op1 > 0 ? op1 : -1
          const speed = op2 > 0 ? op2 : 16
          if (_rngPlayHandler) {
            _rngPlayHandler({ gs, chunkIdx: gs.iCurPlayingRNG, startFrame, endFrame, speed })
            cursor.waiting = 'rng-play'
            cursor.ip++
            return
          }
          console.debug(`event-system: playRNG chunk=${gs.iCurPlayingRNG}(无 _rngPlayHandler 注入,skip)`)
          cursor.ip++
          break
        }
        // 特效 B:opcode 0x76 ShowFBP(sdlpal script.c:2199)。op0=FBP chunk,op1=fade 速度。
        //   sdlpal WIN95 = SDL_FillRect 黑屏;DOS = PAL_ShowFBP(decompress + 可选 dither fade-in)。
        //   我们 handler 统一:chunk 有图 → 真显(DOS 路径,devpanel/结局用);无图(in-game 0xFFFF)→ 黑。
        //   modal:_showFbpHandler 开播 + waiting='show-fbp' + ip++ + return;完成清 waiting 续跑。
        if (cmd.opcode === OP_SHOW_FBP) {
          const chunk = cmd.operands[0] ?? 0
          const fade = cmd.operands[1] ?? 0
          gs.blackScreenHold = chunk === 0xffff
          if (_showFbpHandler) {
            _showFbpHandler({ gs, chunkIdx: chunk, fade })
            cursor.waiting = 'show-fbp'
            cursor.ip++
            return
          }
          console.debug(`event-system: showFBP chunk=${chunk} fade=${fade}(无 _showFbpHandler 注入,skip)`)
          cursor.ip++
          break
        }
        // 特效 B:opcode 0xA4 ScrollFBP(sdlpal script.c:3038)。op0=chunk,op2=speed(op1 未用)。
        //   sdlpal DOS-only(WIN95 no-op),本游戏 0 调用 —— 仅 devpanel / 结局编排经此/直调 scrollFbp。
        //   modal:_scrollFbpHandler 开滚 + waiting='scroll-fbp' + ip++ + return。
        if (cmd.opcode === OP_SCROLL_FBP) {
          const chunk = cmd.operands[0] ?? 0
          const speed = cmd.operands[2] ?? 0
          if (_scrollFbpHandler) {
            _scrollFbpHandler({ gs, chunkIdx: chunk, speed })
            cursor.waiting = 'scroll-fbp'
            cursor.ip++
            return
          }
          console.debug(`event-system: scrollFBP chunk=${chunk} speed=${speed}(无 _scrollFbpHandler 注入,skip)`)
          cursor.ip++
          break
        }
        // 特效 B:opcode 0xA5 ShowFBP+effect(sdlpal script.c:3055)。op0=chunk,op1=effectSprite(0xFFFF=保持),
        //   op2=fade。DOS-only,本游戏 0 调用。复用 _showFbpHandler 渲染全屏图;**MGO 特效精灵叠加留 Phase 3**
        //   (需 MGO sprite RLE 叠加;0x76 默认 effectSprite=0,本 opcode 的 sprite 部分暂跳)。
        if (cmd.opcode === OP_SHOW_FBP_EFFECT) {
          const chunk = cmd.operands[0] ?? 0
          const fade = cmd.operands[2] ?? 0
          if (_showFbpHandler) {
            _showFbpHandler({ gs, chunkIdx: chunk, fade })
            cursor.waiting = 'show-fbp'
            cursor.ip++
            return
          }
          cursor.ip++
          break
        }
        // 结局:opcode 0x96 EndingAnimation(sdlpal script.c:2693)。无 operand。DOS-only(WIN95 用 AVI),0 调用。
        //   modal:_endingAnimationHandler 跑 400 帧 + waiting='ending-anim' + ip++ + return。
        if (cmd.opcode === OP_ENDING_ANIMATION) {
          if (_endingAnimationHandler) {
            _endingAnimationHandler({ gs })
            cursor.waiting = 'ending-anim'
            cursor.ip++
            return
          }
          console.debug('event-system: endingAnimation(无 _endingAnimationHandler 注入,skip)')
          cursor.ip++
          break
        }
        // 0x4D wait-for-any-key(sdlpal script.c:1753 `PAL_WaitForKey(0)`)。设 waiting='wait-key'(永久阻塞),
        //   顶部 'wait-key' 派发分支等 Confirm/Menu/Cancel 解除 + ip++。本 opcode 不 ip++(解除时才推进)。
        if (cmd.opcode === OP_WAIT_FOR_KEY) {
          cursor.waiting = 'wait-key'
          return
        }
        // 0x0A goto-if-no(sdlpal script.c:3373-3387):PAL_ClearDialog(FALSE)(不等键,问句留屏)→
        //   阻塞 PAL_ConfirmMenu(否/是,默认否)。设 waiting='confirm' + confirmYes=false;**不 ip++**
        //   (resolve 时仍读本 op operand[0] 作否分支跳转)。问句不在此清(PAL_ClearDialog FALSE 不擦屏),
        //   留到 confirm 派发提交时清。0x0A 已在 isDialogContinuationOp 豁免 → 不触发 default Space-wait。
        if (cmd.opcode === OP_GOTO_IF_NO) {
          cursor.waiting = 'confirm'
          cursor.confirmYes = false
          return
        }
        // 0x4E load-last-save(sdlpal script.c:1760-1766 `PAL_FadeOut(1); PAL_ReloadInNextTick(slot); return 0`)。
        //   复用 0x50 FadeOut 的 buildFadeOut(600ms 淡黑)+ waiting='palette-fade';记 reloadSlotAfterFade =
        //   当前存档槽 → 淡完(palette-fade 完成分支)fire _loadLastSaveHandler + 清 cursor(对齐 return 0 停脚本)。
        //   **不**设 needToFadeIn(避免淡黑后旧场景自动淡回;loaded scene 淡入由 handler 重载后设 needToFadeIn 触发)。
        if (cmd.opcode === OP_LOAD_LAST_SAVE) {
          const now = performance.now()
          const curColors = (gs.palette ?? gs.basePalette)?.colors ?? blackColors()
          startPaletteFade(gs, cursor, buildFadeOut(curColors, 600, now), false, false)
          cursor.reloadSlotAfterFade = gs.currentSaveSlot
          console.debug(`event-system: loadLastSave slot=${gs.currentSaveSlot}(fade-out 600ms → reload)`)
          return
        }
        // 0xA0 quit(sdlpal script.c:2988-2996)。用户决策:跳过 PAL_AdditionalCredits → 回标题。
        //   modal:_quitHandler 注入(WIN95 播结局 mp4 4/5/6 → 回标题;DOS 直接回标题)+ waiting='quit' 阻塞。
        //   handler 回标题(mode='menu' + 清 cursor)后本分支不再触达。
        if (cmd.opcode === OP_QUIT) {
          if (_quitHandler) {
            _quitHandler()
            cursor.waiting = 'quit'
            return
          }
          console.debug('event-system: quit(无 _quitHandler 注入,清 cursor)')
          gs.eventCursor = undefined
          return
        }
        // Sync.2 fix3: opcode 9 wait N frames — 设 waiting='frame-wait',ip 暂不动
        if (cmd.opcode === OP_WAIT_FRAMES) {
          // sdlpal script.c:3354 `pScript->rgwOperand[0] ? operand[0] : 1`
          const frames = cmd.operands[0] || 1
          // onEnter cutscene(如香兰报信 enter=903:setObjectPos→setDir→setAutoScript→wait→showDialog)
          //   在 showDialog 前先 wait → sceneLoading 冻屏不清 → 整个 cutscene 黑屏。sdlpal PAL_MakeScene
          //   是先画场景再跑 enter script,场景一直可见。撞 wait 时 setPartyPos 等定位已跑完 → 清冻屏让
          //   场景渲染(同 showDialog 在 ↓ 的清法)。非 onEnter 的 frame-wait 时 sceneLoading 本就 false,no-op。
          if (gs.sceneLoading) gs.sceneLoading = false
          cursor.waiting = 'frame-wait'
          cursor.waitFramesRemaining = frames
          return
        }
        // 0x7F moveViewport 多帧 pan(op0|op1 != 0 && op2 != 0xFFFF && frames>1)→ waiting='camera-pan'
        //   逐帧移 camera。单帧(frames<=1)/ 回正 / 绝对跳 落到 applyRawOpcode(不拦)。
        //   sdlpal script.c:2331-2377 do-while op2 次,每次 viewport += (op0,op1)。
        if (cmd.opcode === OP_SET_CAMERA) {
          const [cx, cy, flag] = cmd.operands
          const isPan = !((cx ?? 0) === 0 && (cy ?? 0) === 0) && flag !== 0xFFFF
          const frames = Math.max(cmd.operands[2] ?? 0, 1)
          if (isPan && frames > 1) {
            if (gs.sceneLoading) gs.sceneLoading = false
            const dx = toInt16(cx ?? 0)
            const dy = toInt16(cy ?? 0)
            // sdlpal do-while 第一帧立即移;余 frames-1 帧由 waiting 逐 tick 移。
            gs.camera.x += dx
            gs.camera.y += dy
            cursor.waiting = 'camera-pan'
            cursor.cameraPanFramesRemaining = frames - 1
            cursor.cameraPanDx = dx
            cursor.cameraPanDy = dy
            return
          }
          // 否则 fall through 到 applyRawOpcode(回正 / 绝对 / 单帧)
        }
        // Sync.2 fix5: opcode 5 redrawScreen / PAL_ClearDialog(TRUE) — sdlpal script.c:3267-3297
        //   有 dialog → 等 Confirm 翻页清屏(让后续 NPC 动作 / 场景重画显);无 dialog → no-op + ip++
        // Sync.2 fix8:翻页后**必须完全清 gs.dialogBox**(对应 sdlpal PAL_ClearDialog(TRUE)),
        //              不只清 shownLines/currentLineText;否则 portrait 残留遮挡后续 NPC 动画。
        if (cmd.opcode === OP_REDRAW_SCREEN) {
          // sdlpal script.c:3271 PAL_ClearDialog(TRUE):仅 nCurrentDialogLine>0 才 PAL_DialogWaitForKey
          //   (text.c:1770)等键 + 画箭头;随后 script.c:3290 PAL_MakeScene 重画覆盖对话区。
          if (gs.dialogBox && gs.dialogBox.dialogLineCount > 0) {
            setWaitingPageKey(gs.dialogBox, undefined, true)  // fullClear=true(0x05 = PAL_ClearDialog(TRUE))
            cursor.waiting = 'dialog'
            return  // 等下次 tick Confirm,page-advance 后 dialogBox=undefined + ip++ + 继续
          }
          // dialogLineCount==0(`~` 收尾梦境句):不等键。残留对话框被 PAL_MakeScene 重画覆盖等价清掉。
          if (gs.dialogBox || gs.dialogBoxKept) clearDialogBoxes(gs)
          // 无 dialog:sdlpal 0x05 真值(script.c:3283-3294 非 RNG/battle)= PAL_MakeScene() + VIDEO_UpdateScreen。
          //   PAL_MakeScene 末尾检查 fNeedToFadeIn → PAL_FadeIn(delay=1=600ms)从黑淡入(scene.c:503-508)。
          //   **仙灵岛靠岸"过场黑屏"真因**:onEnter(如 5117)序 setpos→0x05→对话;旧码 0x05 无对话时纯 ip++,
          //   不重绘/淡入 → FadeOut 后的黑屏留到对话期(waiting='dialog' 门控挡掉 tickSceneAutoFadeIn 不淡入)
          //   → 靠岸对话浮在黑屏,对话跑完才淡入(用户报"过场黑屏卡死")。修:0x05 对齐 PAL_MakeScene,
          //   needToFadeIn 时在此触发淡入(对话前岛就显出),结构性补回 0x05 的重绘/淡入职责。
          gs.blackScreenHold = false
          gs.sceneLoading = false  // PAL_MakeScene 重绘 = 解冻渲染(scene 已 load,setPartyPos 已定位 camera)
          if (gs.needToFadeIn && !gs.paletteFadeState && !gs.fadeState) {
            if (!gs.palette) {
              const src = gs.basePalette ?? { colors: blackColors(), cycles: [] }
              gs.palette = makeWorkingPalette(src)
            }
            const baseColors = resolveNightColors(gs.basePalette ?? gs.palette, gs.nightPalette)
            startPaletteFade(gs, cursor, buildFadeIn(baseColors, 600, performance.now()), false, true)
            gs.needToFadeIn = false
            console.debug('event-system: 0x05 redraw → PAL_MakeScene auto fade-in(needToFadeIn,600ms)')
            return  // 阻塞等淡入完(对齐 sdlpal PAL_FadeIn);palette-fade 分支完成时 ip++ 到下一条
          }
          // 无 dialog 且无 pending 淡入 → sdlpal 0x05 真值(script.c:3290-3293,非 RNG/battle):
          //   PAL_MakeScene + VIDEO_UpdateScreen + **UTIL_Delay((operand[1]==0)?60:operand[1]*60) ms**。
          // ⚠ 旧码从未实现这段延时(只有注释提过)→ 触发脚本里 "0x0B-0x0E 走一步 + 0x05" 的逐步序列
          //   (张四上船 走向船 1484-1499 共 8 步,每步后一条 0x05)会在主 while 循环里整段压进**一帧** →
          //   张四"瞬移上船、无走路动画"(2026-06-06 user 报)。补回 time-based 延时(复用 'delay' 等待,
          //   到时 handler 清 waiting + ip++)→ 每步停 60ms 逐帧显示,走路帧(scriptedFrame)随之循环。
          // (与 e8a53ac/1833b16 无关:那两次只改 autoScript owner-skip / goto,本走路路径逐字节未变。)
          const redrawDelayMs = (cmd.operands[1] ?? 0) === 0 ? 60 : (cmd.operands[1] ?? 0) * 60
          cursor.delayUntilMs = performance.now() + redrawDelayMs
          cursor.waiting = 'delay'
          return  // 等延时完('delay' 等待 handler 到时清 waiting + ip++)
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
          gs.blackScreenHold = false
          // P2#7:fadeScreen 是 fade-first onEnter 的第一个可渲染 yield(setPartyPos 等已跑、camera 已定位)
          // → 清 sceneLoading 解冻渲染。fade backup 从冻屏保留的旧 scene 帧拷(present.ts fb.indices)。
          gs.sceneLoading = false
          // Sync.2 fix18:sdlpal 真值 — fadeScreen 启动前的 default-case PAL_ClearDialog(TRUE) 已经
          // 把 nCurrentDialogLine 设 0 → 之后 PAL_MakeScene 重画不含 dialog box → fade 是
          // backup(冻结画面有 dialog 像素) → current(重画无 dialog) → 视觉 dialog 跟着渐隐。
          //
          // 我们 game dialog 是 state-driven render:清 gs.dialogBox 让 current 渲染不画 dialog,
          // backupPixels 已含上一帧冻结的 dialog 像素 → fade 视觉 dialog 渐隐(title + body 一起)。
          clearDialogBoxes(gs)
          gs.currentDialogPortraitIcon = undefined
          gs.currentDialogFontColor = 0x4F
          cursor.waiting = 'fade-screen'
          console.debug(`event-system: fadeScreen speed=${speed} → ${totalMs}ms (sdlpal classic 真值)`)
          return  // 等 fade 完
        }

        // ── 特效 A(2026-05-29):调色板 ramp fade(sdlpal palette.c FadeOut/FadeIn/SceneFade/
        //    PaletteFade/ColorFade/FadeToRed)。start/target 取自 gs.palette(可变工作副本)/
        //    gs.basePalette(稳定场景色);builder 深拷快照进 paletteFadeState;present.ts stepPaletteFade
        //    每帧 ramp gs.palette.colors。waiting 由 startPaletteFade 设(冻 'palette-fade' / 放行 'scene-fade')。
        if (
          cmd.opcode === OP_FADE_OUT
          || cmd.opcode === OP_FADE_IN
          || cmd.opcode === OP_SCENE_FADE
          || cmd.opcode === OP_PALETTE_FADE
          || cmd.opcode === OP_COLOR_FADE
          || cmd.opcode === OP_FADE_TO_RED
        ) {
          const now = performance.now()
          const curColors = (gs.palette ?? gs.basePalette)?.colors ?? blackColors()
          // 特效 A 夜间:fade target 按 gs.nightPalette 选白天/夜间色(sdlpal PAL_GetPalette(n,fNight))。
          //   curColors(start)= 当前显示色不动;baseColors(target)= 夜场淡入到夜色(#0/#5 有夜间半)。
          const baseColors = resolveNightColors(gs.basePalette ?? gs.palette, gs.nightPalette)
          const op0 = cmd.operands[0] ?? 0

          if (cmd.opcode === OP_FADE_OUT) {
            // sdlpal palette.c:163 `time = now + iDelay*10*60` → 时长 (op0||1)*600ms。屏幕 → 全黑。
            // clearSceneLoading=false:loadScene→FadeOut 序中保持冻屏,淡黑触发前那帧(不重绘 setPartyPos 瞬移)。
            const delay = op0 || 1
            startPaletteFade(gs, cursor, buildFadeOut(curColors, delay * 600, now), false, false)
            gs.needToFadeIn = true  // sdlpal script.c:1781
            console.debug(`event-system: FadeOut delay=${delay} → ${delay * 600}ms (→black, needToFadeIn=TRUE)`)
            return
          }
          if (cmd.opcode === OP_FADE_IN) {
            // sdlpal script.c:1789 `((SHORT)op0 > 0) ? op0 : 1`。全黑 → basePalette。
            const delay = toInt16(op0) > 0 ? op0 : 1
            gs.blackScreenHold = false
            startPaletteFade(gs, cursor, buildFadeIn(baseColors, delay * 600, now), false)
            gs.needToFadeIn = false  // sdlpal script.c:1791
            console.debug(`event-system: FadeIn delay=${delay} → ${delay * 600}ms (black→base)`)
            return
          }
          if (cmd.opcode === OP_SCENE_FADE) {
            // sdlpal script.c:2668 `PAL_SceneFade(numPalette, night, (SHORT)op0)`。step>0 淡入 / <0 淡出。
            //   每步 ~100ms(palette.c:310 `time = now + 100`),iterations ≈ ceil(64/|step|)。
            //   边淡边 PAL_GameUpdate(FALSE) → waiting='scene-fade'(mode.ts 放行 autoScript,NPC 不冻)。
            const step = toInt16(op0) || 1
            const absStep = Math.abs(step)
            const fadeIn = step > 0
            const totalMs = Math.ceil(64 / absStep) * 100
            startPaletteFade(gs, cursor, buildSceneFade(curColors, baseColors, fadeIn, totalMs, now), true)
            gs.needToFadeIn = step < 0  // sdlpal script.c:2670
            console.debug(`event-system: SceneFade step=${step} → ${totalMs}ms (${fadeIn ? 'in' : 'out'}, scene-fade)`)
            return
          }
          if (cmd.opcode === OP_PALETTE_FADE) {
            // sdlpal script.c:2385-2387:fNightPalette = !fNightPalette;PAL_PaletteFade(numPalette, night,
            //   !(op0))。fUpdateScene = !op0。32 步 × (fUpdateScene ? FRAME_TIME : FRAME_TIME/4),FRAME_TIME=100。
            gs.nightPalette = !gs.nightPalette
            const fUpdateScene = op0 === 0
            const totalMs = 32 * (fUpdateScene ? 100 : 25)
            // target = PAL_GetPalette(numPalette, **toggled** night)。在 toggle 之后重新按新 flag 选色
            //   (baseColors 是 toggle 前算的,不能直接用)。#0/#5 有夜间半 → 真切夜色。
            const targetColors = resolveNightColors(gs.basePalette ?? gs.palette, gs.nightPalette)
            startPaletteFade(gs, cursor, buildPaletteFade(curColors, targetColors, totalMs, now), fUpdateScene)
            console.debug(
              `event-system: PaletteFade night=${gs.nightPalette} fUpdateScene=${fUpdateScene} → ${totalMs}ms`,
            )
            return
          }
          if (cmd.opcode === OP_COLOR_FADE) {
            // sdlpal script.c:2586 `PAL_ColorFade(op1, (BYTE)op0, op2)` → iDelay=op1, bColor=op0&0xFF, fFrom=op2。
            //   palette.c:494 `iDelay*=10; if(0) iDelay=10`;64 步 × iDelay ms。approach ±4 收敛。
            const color = op0 & 0xff
            const delay = cmd.operands[1] ?? 0
            const fFrom = (cmd.operands[2] ?? 0) !== 0
            const perStep = delay * 10 || 10
            const totalMs = 64 * perStep
            startPaletteFade(gs, cursor, buildColorFade(baseColors, color, fFrom, totalMs, now), false)
            gs.needToFadeIn = false  // sdlpal script.c:2588
            console.debug(`event-system: ColorFade color=${color} fFrom=${fFrom} → ${totalMs}ms`)
            return
          }
          // OP_FADE_TO_RED(0x4F)— sdlpal script.c:1772 `PAL_FadeToRed()`(game over)。
          //   32 步 × 75ms = 2400ms。approach ±8;target=(base.r+g+b)/4+64/0/0;skip idx 0x4F(文字色);
          //   present fb 像素 0x4F→0x4E(builder 已带 remap,present 渲染时套用)。
          // FadeToRed 全游戏唯一在死亡脚本 L_41075(0x4F 唯一在 index 41076,byte-level 核 all.json)。
          //   gameOverActive 重构(C4):死亡演出标记**由本 opcode 真执行时点亮**(不再按 outcome==='lost' 预判),
          //   present 据此保持战斗帧 + 只画死亡对话,palette ramp 把保持的**战斗帧**染红。
          //   交棒:T0 过渡帧用 deathHoldActive(纯 hold)→ 跑到这里清掉,转 gameOverActive(hold+染红+画对话)。
          gs.gameOverActive = true
          gs.deathHoldActive = false
          startPaletteFade(gs, cursor, buildFadeToRed(baseColors, 32 * 75, now), false)
          console.debug(`event-system: FadeToRed → 2400ms (→red, skip 0x4F);gameOverActive=true`)
          return
        }

        // opcode 0x9B fade-to-scene — sdlpal script.c:2766 `VIDEO_BackupScreen; PAL_MakeScene; VIDEO_FadeScreen(2)`。
        //   = dither 引擎(同 0x73),speed 硬编 2。复用 gs.fadeState + waiting='fade-screen'(present 已处理
        //   backupPixels 快照),**不**用 paletteFadeState。
        if (cmd.opcode === OP_FADE_TO_SCENE) {
          const speed = 2
          const totalMs = (speed + 1) * 10 * 72  // 2160ms,同 0x73 真值
          gs.fadeState = { speed, totalMs, startTimeMs: performance.now(), appliedSteps: 0 }
          gs.blackScreenHold = false
          gs.sceneLoading = false
          clearDialogBoxes(gs)
          gs.currentDialogPortraitIcon = undefined
          gs.currentDialogFontColor = 0x4F
          cursor.waiting = 'fade-screen'
          console.debug(`event-system: fadeToScene(0x9B) dither speed=2 → ${totalMs}ms`)
          return
        }

        // opcode 0x85 delay — sdlpal script.c:2511-2516 UTIL_Delay(operand[0]*80) 实时阻塞延迟。
        //   time-based(不受 tick 帧率影响),期间 autoScript 暂停(waiting='delay')。op0=0 → 即时 ip++。
        if (cmd.opcode === OP_DELAY) {
          const delayMs = (cmd.operands[0] ?? 0) * 80
          if (delayMs <= 0) {
            cursor.ip++
            break  // 本 tick 继续跑下条
          }
          cursor.delayUntilMs = performance.now() + delayMs
          cursor.waiting = 'delay'
          console.debug(`event-system: delay ${delayMs}ms (op0=${cmd.operands[0]})`)
          return  // 等延迟完
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
        // cursor 传入 → 条件跳转 / call / 随机跳等"动游标"opcode 操作本 trigger cursor。
        applyRawOpcode(gs, cmd.opcode, cmd.operands, cursor.currentEventObjectId, cursor)
        // 0x34 炼丹弹了物品框(applyRawOpcode 设 gs.dialogBox style='item-box')→ 设 waiting + 暂停本
        //   tick,**不** ip++;dismiss 由 waiting handler('item-box' 同 narration 分支)做 ip++(否则双进)。
        if (gs.dialogBox?.style === 'item-box') {
          cursor.waiting = 'dialog'
          return
        }
        cursor.ip++
        break
      }

      case 'startBattle':
        // P0.e: 具名 startBattle(若 disassembler 升级具名)— 走同 raw#7 handler。
        // sdlpal script.c:3318 真值 PAL_StartBattle(operand[0], !operand[2]);战后接回触发脚本
        //   (胜→下一条 / 负→op[1] / 逃→op[2],script.c:3320-3331)。
        if (cmd.operands) {
          savePostBattleResume(gs, cursor, cmd.operands)
          tryStartBattle(gs, cmd.operands[0], cmd.operands[2])
        }
        gs.eventCursor = undefined
        clearDialogBoxes(gs)
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
        // sdlpal 0x0059(script.c:1870):设 wNumScene + fEnteringScene 后 **break(继续跑调用脚本)** —
        // PAL_LoadResources reload 在下一 PAL_StartFrame(脚本 return 之后)。我们 port:记 pendingSceneLoad +
        // **继续跑**(loadScene 后的 setPartyPos/fade 给新 scene 定位 — 无 onEnter scene 的位置只能来自此处),
        // 脚本结束('end'/ip 越界)才触发异步 _sceneLoader reload(triggerPendingSceneLoad)。
        // 旧版立刻 waiting+replace cursor → 抛弃续跑的 setPartyPos → 无 onEnter scene 黑/错位
        // (2026-05-29 loadScene 14/scene13 黑屏)。sceneLoading=true:续跑 + async fetch 期间 present 保留旧帧。
        // sdlpal script.c:1870-1885 guard:`sceneId > 0 && sceneId <= MAX_SCENES(300) && wNumScene != sceneId`
        //   才换场景(0 哨兵 / 越界 / 同场景冗余 reload 都跳过)。MAX_SCENES=300(palcommon.h)。
        if (_sceneLoader && cmd.sceneId > 0 && cmd.sceneId <= 300 && gs.wNumScene !== cmd.sceneId) {
          gs.pendingSceneLoad = cmd.sceneId
          gs.sceneLoading = true
          cursor.ip++ // 继续跑调用脚本(setPartyPos 等)
          break
        }
        if (cmd.sceneId <= 0 || cmd.sceneId > 300 || gs.wNumScene === cmd.sceneId) {
          // 0 / 越界 / 同场景 → 不 reload,仅推进(sdlpal 跳过)
          cursor.ip++
          break
        }
        console.warn(
          `event-system: loadScene sceneId=${cmd.sceneId} 无 _sceneLoader 注入,skip(测试外 bootstrap 应 setSceneLoader)`,
        )
        cursor.ip++
        break
      }

      case 'setPalette': {
        // M4 P3.T2:真换调色板 —— 异步 fetch,fire-and-forget,tick 同步继续。
        // sdlpal script.c:2571-2580 真值(0x8B):`wNumPalette = op0; if (!fNeedToFadeIn) PAL_SetPalette(wNumPalette, FALSE)`。
        // 特效 A(2026-05-29):
        //   - gs.numPalette = op0(供 0x51 FadeIn / 0x93 SceneFade 选目标调色板)。
        //   - gs.basePalette = fetch 回的新调色板(pristine,fade target 参照;makeWorkingPalette 造独立对象,
        //     避免与 gs.palette 别名 → 否则 fade mutate gs.palette 会污染 target)。
        //   - **仅 !needToFadeIn 时**才把新调色板套到 gs.palette(屏幕)。needToFadeIn(0x50 FadeOut 后)时
        //     屏幕在黑,不立即套色,只更新 basePalette 供随后 0x51 FadeIn ramp(sdlpal 真值)。
        const paletteIdx = cmd.paletteIndex
        gs.numPalette = paletteIdx
        if (_fetchPalette) {
          const gsRef = gs
          _fetchPalette(paletteIdx)
            .then((p) => {
              gsRef.basePalette = makeWorkingPalette(p)  // pristine 独立副本(target 参照)
              if (!gsRef.needToFadeIn) {
                gsRef.palette = p  // sdlpal `if (!fNeedToFadeIn) PAL_SetPalette`
              }
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
export function runScript(opts: RunScriptOptions): number {
  const { commands, bus, runtimeMode, battleCtx } = opts
  let ip = opts.ip

  if (runtimeMode === 'battle' && !battleCtx) {
    throw new Error('runScript: runtimeMode=battle 必须提供 battleCtx')
  }
  if (runtimeMode === 'explore' && battleCtx) {
    throw new Error('runScript: runtimeMode=explore 不应传 battleCtx')
  }

  // D17b:让 battle opcode 拿到 bus emit showDamageNum(caller 未塞则默认 = opts.bus)。
  if (battleCtx && battleCtx.bus === undefined)
    battleCtx.bus = bus

  const logPrefix = runtimeMode === 'battle' ? '[event-system battle]' : '[event-system explore]'

  // 局部 labelMap —— goto 用;runScript 跑一段子脚本,labelMap 在全 commands 中查
  const labelMap = buildLabelMap(commands)

  // battle 模式统一解释器(对齐 sdlpal 单一 PAL_InterpretInstruction):未被 dispatchBattleOpcode
  //   消费的 raw opcode → fall 到 applyRawOpcode(大世界已实现的控制流/数据/资源 opcode:0x06 概率跳、
  //   0x1E 钱、0x1F/0x20 物品、0x55/0x56 法术、各 JUMP_IF_*、0x04 call…)。否则只 skip → 法术脚本的
  //   概率/条件失败分支(如"失败 没有效果")永不触发(2026-05-31 修)。call/return 用持久 callStack +
  //   curEventObjId(循环外声明,raw case 共享给重建的 cursor),'end' 弹帧返回。
  const callStack: NonNullable<ScriptCursor['callStack']> = []
  // battle 脚本 wEventObjectID:opts.eventObjectId seed(如敌普攻 equivItem.scriptOnUse(wPlayerRole)→
  //   脚本 0x29 单体毒该队员);0x04 call 的 op1 eventObjId 覆盖经此持久。
  let curEventObjId: number | undefined = opts.eventObjectId

  let stepCount = 0
  while (true) {
    if (++stepCount > SINGLE_TICK_LIMIT) {
      throw new Error(
        `runScript: single-tick instruction limit (${SINGLE_TICK_LIMIT}) exceeded at ip=${ip}`,
      )
    }

    if (ip < 0 || ip >= commands.length) {
      console.warn(`${logPrefix} ip ${ip} 越界 → 退出`)
      // B2 c7:脚本未达 end opcode 异常退出 → 返回起始 entry(保持 armed,不误禁该脚本)。
      return opts.ip
    }

    const cmd = commands[ip]!

    switch (cmd.op) {
      case 'end':
        // 0x04 call 返回:子脚本 'end' → callStack 非空时弹帧回 caller(对齐 applyOneTick/runEnterScript
        //   的 callStack 约定,event-system.ts:978)。栈空 → 整段结束退出。
        if (callStack.length > 0) {
          const frame = callStack.pop()!
          ip = frame.returnIp
          curEventObjId = frame.savedEventObjectId
          break
        }
        // B2 c7:脚本真结束 → 返回 sdlpal wNextScriptEntry(script.c:3204-3237 + 3478):
        //   0x01 advance → 本行 ip+1(指针前移 = show-once);
        //   0x02 reset → resetTo 标签解析的 entry(re-arm 到指定);
        //   0x00 plain → 起始 entry opts.ip(每轮从头重跑 = 每轮重显)。
        //   敌 turnStart/ready 调用方据此回写 wScriptOnTurnStart/Ready(fight.c:1186/1226/1689/1719)。
        //   (与 explore 'end' 路径 event-system.ts:1519-1534 同款 nextEntry 语义)。
        if (cmd.advance) return ip + 1
        if (cmd.reset && cmd.resetTo !== undefined) return labelMap[`L_${cmd.resetTo}`] ?? opts.ip
        return opts.ip

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
          // 战斗脚本对话(0xFFFF showDialog)—— runScript 是同步一次跑完,无法跨 tick 阻塞,故
          // 收集进 battleCtx.state.battleDialogQueue;tickBattleDialog hold 逐 tick 把队列喂进
          // **复用的大世界** gs.dialogBox(渲染 + 打字 + page/end-key)并暂停战斗(忠实 sdlpal
          // text.c:1660-1772:CLASSIC battle dialog 走普通 dialog box,非 #ifndef 战斗飘字)。
          const bs = battleCtx?.state
          if (bs) {
            const st = bs.battleDialogStyle
            ;(bs.battleDialogQueue ??= []).push({
              text: cmd.text,
              style: st?.style ?? 'bottom',
              portrait: st?.portrait,
              fontColor: st?.fontColor,
              clearBefore: bs.battleDialogPendingClear || undefined,
            })
            bs.battleDialogPendingClear = false
          }
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
      case 'setDialogStyleNarration': {
        // 战斗脚本设对话风格(sdlpal script.c:3394-3424 PAL_StartDialog 设 bDialogPosition +
        //   字色/头像)→ 存 battleCtx.state.battleDialogStyle,下条 showDialog 入队时取。
        const bs = runtimeMode === 'battle' ? battleCtx?.state : undefined
        if (bs) {
          const style: import('@type-pal/shared').DialogBoxStyle =
            cmd.op === 'setDialogStyleTop' ? 'top'
              : cmd.op === 'setDialogStyleCenter' ? 'center'
                : cmd.op === 'setDialogStyleNarration' ? 'narration'
                  : 'bottom'
          bs.battleDialogStyle = {
            style,
            portrait: cmd.arg0 ? cmd.arg0 : undefined,
            fontColor: cmd.arg1 ? cmd.arg1 : 0x4F,
          }
        }
        // explore mode 不该走 runScript(同 showDialog);no-op skip
        ip++
        break
      }

      case 'raw': {
        // M5.B-w2.a:battle mode 先尝试 dispatchBattleOpcode(scripted enemy AI 入口 + 战斗特定 opcode)
        if (runtimeMode === 'battle' && battleCtx) {
          // D26(2b):0x69 敌逃跑动画夹在 dialog 序列中(蛇女灵儿 obj502 turnStart@41060:嘲讽对话 →
          //   0x69 → narration「逃走了」)。runScript 同步若立即跑 → 逃跑动画跑在所有对话前(错序)。
          //   故 **dialog 已入队时**(mid-sequence)把 0x69 也入队按位置保序,tickBattleDialog 处理到时
          //   才 dispatch(set enemyEscapeAnim)→ sdlpal 真值序:对话 → 逃跑动画 → narration → fleed。
          //   队列空(无前置对话)→ 不 defer,照旧立即跑(0x69 → narration 顺序天然对)。
          const bs = battleCtx.state
          if (cmd.opcode === 0x69 && (bs.battleDialogQueue?.length ?? 0) > 0) {
            ;(bs.battleDialogQueue ??= []).push({ effect: { opcode: cmd.opcode, operands: cmd.operands } })
            ip++
            break
          }
          const r = dispatchBattleOpcode(cmd.opcode, cmd.operands, battleCtx)
          if (r.consumed) {
            ip = r.newIp !== undefined ? r.newIp : (ip + 1)
            break
          }
          // dispatchBattleOpcode 未消费(非战斗特定 opcode)→ fall 到大世界统一解释器 applyRawOpcode
          //   (对齐 sdlpal 单一 PAL_InterpretInstruction:battle 脚本与大世界共用解释器)。控制流 / 资源 /
          //   数据 opcode(0x06 概率跳、0x1E 钱、0x1F/0x20 物品、0x55/0x56 法术、JUMP_IF_*、0x04 call)
          //   由此在战斗内真生效 → 法术失败分支("失败 没有效果"等)、花钱/耗材法术正确执行(2026-05-31)。
          //   需 gs(applyRawOpcode 读写 gs.inventory/dwCash/PlayerRolesRuntime…);缺 gs(旧 caller 未塞)
          //   → 退回 D26 skip(优雅降级,不崩)。cursor 复用持久 callStack/curEventObjId 支持 call/return;
          //   commands/labelMap = 全局(jumpToGlobalIp / getLabels 解析跳转目标)。
          if (battleCtx.gs) {
            const cursor: ScriptCursor = {
              ip,
              commands,
              labelMap,
              callStack,
              currentEventObjectId: curEventObjId,
            }
            applyRawOpcode(battleCtx.gs, cmd.opcode, cmd.operands, curEventObjId, cursor)
            ip = cursor.ip + 1 // 跳转 opcode 设 cursor.ip=target-1 → ip=target;非跳转保持 → ip+1
            curEventObjId = cursor.currentEventObjectId // 0x04 call op1 覆盖持久化
            break
          }
        }
        // D26:无具名 opcode 兜底 skip + console.debug(battle 缺 gs / explore mode)
        console.debug(`${logPrefix} skip raw opcode=${cmd.opcode} ip=${ip}`, cmd.operands)
        ip++
        break
      }

      case 'giveItem':
        // sdlpal 0x1F `PAL_AddItemToInventory(itemId, count)`。蛊孵化链(食妖虫附→灵蛊 /
        //   碧血蚕附→赤血蚕)在战斗毒 tick 跑 poison wEnemyScript,末尾 giveItem 炼成蛊
        //   (data 真值 @40936/40959)→ battle 模式必须真给物品,不能 skip。
        //   count=0 → addItemToInventory 内当 1(sdlpal global.c:1094-1097)。
        if (runtimeMode === 'battle' && battleCtx?.gs) {
          addItemToInventory(battleCtx.gs, cmd.itemId, cmd.count)
          console.debug(`${logPrefix} giveItem id=${cmd.itemId} count=${cmd.count}`)
        }
        else {
          // explore mode 不走 runScript(走 stepEvent 的 giveItem);此处仅 battle 缺 gs 兜底
          console.debug(`${logPrefix} skip op=${cmd.op} ip=${ip}`)
        }
        ip++
        break

      case 'startBattle':
        // 战斗脚本里出现 startBattle 不合理;沿用 M2 skip 行为
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
// 切 mode 'battle' + savePostBattleResume 存 won/lost/fled IP;战末 resumePostBattleScript
// 按 outcome 接回(已做,见 game-state.ts;旧"不 resume onLose/onFlee"注释已过时,2026-06-02 订正)。
/**
 * 0x07 startBattle 起手存战后接回上下文(sdlpal script.c:3318-3331:战斗同步返回后脚本继续)。
 * 胜 → wonIp(0x07 后下一条);负 → op[1];逃 → op[2](op[1]/op[2] = 全局 entry,经 cursor.labelMap 解析)。
 * 战末 finalizeBattleCleanup → resumePostBattleScript 接回。修"打完怪不消失"(0x52 隐藏怪此前永不跑)。
 */
function savePostBattleResume(gs: GameState, cursor: EventCursor, operands: readonly number[]): void {
  const resolve = (entry: number): number | undefined =>
    entry !== 0 ? (cursor.labelMap?.[`L_${entry}`] ?? entry) : undefined
  gs.postBattleResume = {
    wonIp: cursor.ip + 1,
    lostIp: resolve(operands[1] ?? 0),
    fledIp: resolve(operands[2] ?? 0),
    commands: cursor.commands,
    labelMap: cursor.labelMap,
    currentEventObjectId: cursor.currentEventObjectId,
    triggerOwnerId: cursor.triggerOwnerId,
    onEnterSceneId: cursor.onEnterSceneId,
    onEnterStartIp: cursor.onEnterStartIp,
    callStack: cursor.callStack,
  }
}

function tryStartBattle(gs: GameState, enemyTeamId: number, fleeArg: number): void {
  if (!_startBattleHandler) {
    console.warn(
      `event-system: opcode 7 startBattle handler 未注入,跳过 (enemyTeamId=${enemyTeamId})。`
      + ' 测试外 bootstrap 应 setStartBattleHandler。',
    )
    return
  }
  const isBoss = fleeArg === 0  // sdlpal !operand[2]:operand[2]==0 → isBoss true
  // 战斗背景 = gs.wNumBattleField(0x4A setBattlefield 设;持久全局,scene enter 脚本逐场设)。
  console.debug(`event-system: startBattle enemyTeamId=${enemyTeamId} isBoss=${isBoss} scene=${gs.wNumScene} battleField=${gs.wNumBattleField}`)
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
  // P2#5:item scriptOnUse 是全局 entry → 全局 ip(identity)。
  const r = resolveScriptLabel(gs, `L_${scriptOnUse}`)
  if (!r) {
    console.warn(`[item-use] L_${scriptOnUse} 不在全局 labelMap(itemId=${itemId})`)
    return false
  }
  const { ip } = r
  // sdlpal play.c:298-302 真值:脚本**跑完后** `if (consuming && g_fScriptSuccess) AddItem(-1)`。
  // 我们 tick 模型脚本跨多帧 → 延迟消耗:重置 fScriptSuccess=TRUE(对齐 PAL_RunTriggerScript 入口
  // script.c:3187),记 pendingItemConsume,脚本 cursor 结束时 consumePendingItem 按 fScriptSuccess gate 扣。
  gs.fScriptSuccess = true
  gs.pendingItemConsume = consuming ? itemId : undefined
  // applyToAll 物品(targetRoleIdOrAll=0xFFFF):sdlpal play.c:305-322 用完 `return` 退出 PAL_GameUseItem
  // → 脚本结束关物品菜单回 explore(让脚本设的世界 trigger 触发,如桂花酒酒剑仙)。非 applyToAll 留菜单。
  gs.itemUseApplyToAll = targetRoleIdOrAll === 0xFFFF
  gs.eventCursor = {
    ip, // P2#5:全局 ip,默认读全局数组(不内嵌 commands/labelMap)
    // sdlpal `script.c:3140 wEventObjectID` 参数 — items 上下文里是 wPlayer(0-based role id)或
    // 0xFFFF(applyToAll)。NPC trigger 用 1-based NPC id;opcode handler 自行按 op 区分语义。
    currentEventObjectId: targetRoleIdOrAll,
  }
  gs.mode = 'event'
  return true
}

/**
 * sdlpal play.c:298-302 / 316-319:item.scriptOnUse 脚本结束后,consuming 物品仅在 g_fScriptSuccess
 * 时扣 1。我们延迟到脚本 cursor 结束调此(item script 结束的两条路径:ip 越界 / 'end' opcode)。
 * 非 item 脚本(pendingItemConsume undefined)→ no-op。
 */
function consumePendingItem(gs: GameState): void {
  if (gs.pendingItemConsume === undefined) return
  if (gs.fScriptSuccess) {
    addItemToInventory(gs, gs.pendingItemConsume, -1)
    console.debug(`event-system: item ${gs.pendingItemConsume} 消耗(脚本成功)`)
  }
  else {
    console.debug(`event-system: item ${gs.pendingItemConsume} 不消耗(g_fScriptSuccess=false)`)
  }
  gs.pendingItemConsume = undefined
}

/**
 * item / trigger 脚本结束后恢复 mode。
 * - applyToAll 物品用完:sdlpal play.c:305-322 `return` 退出 PAL_GameUseItem → 关物品菜单回 explore
 *   (让脚本设的世界 trigger 触发,如桂花酒酒剑仙 proximity 对话)。
 * - 否则(非 applyToAll item INNER 循环 / NPC trigger / onEnter):menuStack 非空回 'menu'(ItemUseMenu
 *   反复用,sdlpal play.c:288-302 INNER while),否则回 'explore'。
 * itemUseApplyToAll 每次都清(每个 startOverworldItemScript 重设,不残留到下个脚本)。
 */
function restoreModeAfterScript(gs: GameState): void {
  if (gs.itemUseApplyToAll) {
    gs.itemUseApplyToAll = undefined
    gs.menuStack = []
    gs.mode = 'explore'
    return
  }
  gs.itemUseApplyToAll = undefined
  gs.mode = gs.menuStack.length > 0 ? 'menu' : 'explore'
}

/**
 * loadScene 续跑的调用脚本结束后,触发延迟的异步 reload(sdlpal:0x59 后脚本继续跑,reload 在脚本
 * return 后的下一 PAL_StartFrame)。loadScene opcode 记 gs.pendingSceneLoad 并继续跑;脚本 'end' /
 * ip 越界(整段结束,非 0x04 子调用返回)时调此 → _sceneLoader 异步 fetch+apply 新 scene。
 * reload 期间 sceneLoading=true(present 保留旧帧 + tickSceneSystem 冻结)。
 */
function triggerPendingSceneLoad(gs: GameState): void {
  if (gs.pendingSceneLoad === undefined || !_sceneLoader) return
  const sid = gs.pendingSceneLoad
  gs.pendingSceneLoad = undefined
  // 重设 sceneLoading=true:onEnter 'end' 可能已清(P2#7),但 async reload 期间需 present 保留旧帧;
  // loadSceneCommon 起手也设 true,这里覆盖 'end'→reload 之间那帧的空窗(否则漏 blank 渲染旧 scene)。
  gs.sceneLoading = true
  _sceneLoader(sid).catch((err: unknown) => {
    console.error(`event-system: sceneLoader(${sid}) failed:`, err)
    // 结构性兜底(2026-05-30 仙灵岛船渡黑屏卡死根因):async scene load 失败**必须解冻**。
    // 否则 gs.sceneLoading 永卡 true → tickSceneAutoFadeIn 守卫(`|| gs.sceneLoading`)永远早退
    // → 0x50 FadeOut 设的黑屏永不淡入 → 永久黑屏 + 冻结(用户报的"过场黑屏卡死")。
    // 对齐 sdlpal play.c:61 真值:fEnteringScene 进场前**无条件**清,绝不因加载失败残留。
    // 加载失败已无法续 cutscene → 恢复到可交互 explore(至少不冻死),console.error 已记真因供定位。
    gs.sceneLoading = false
    gs.eventCursor = undefined
    gs.mode = 'explore'
  })
}

/**
 * 脚本游标统一抽象 —— trigger(gs.eventCursor)与 autoScript(npc.autoCursor)同构,
 * 让 applyRawOpcode 内"动游标"的 opcode(条件跳转 / 0x04 call / 0x06 / 0xA2)操作**传入的**
 * cursor,而非写死 gs.eventCursor(后者在 autoScript / explore 下 undefined → 这些 opcode 全失效,
 * 即 2026-05-28 苗人开门 / 跳转漏执行的架构根因)。
 */
export interface ScriptCursor {
  ip: number
  /** P2#5:可选 override;省略时默认单一全局数组(getCmds/getLabels)。 */
  commands?: Command[]
  labelMap?: Record<string, number>
  callStack?: {
    returnIp: number
    returnCommands?: Command[]
    returnLabelMap?: Record<string, number>
    savedEventObjectId?: number
  }[]
  currentEventObjectId?: number
}

/**
 * 条件 / 随机跳转的统一跳转:globalIp 是绝对 script entry 号 = 全局数组下标(all.json L_<n>→n 恒等)。
 * 生产 cursor 无 labelMap → 直接 cursor.ip = globalIp - 1(caller 跑完 applyRawOpcode 后 ip++ → globalIp)。
 * 对齐 sdlpal `wScriptEntry = target - 1` + PAL_InterpretInstruction 末尾 +1。
 * 直接用 globalIp(而非 _globalLabelMap[L_<n>] 查表)可覆盖**未打 label 的跳转目标** —— 如 opcode 0x06
 * jumpByRate 的 91 个目标(disasm 只给 jump-target 打 label,目标若是 end 等则无 label)。
 * (单测传自带 labelMap 时按本地 ip 解析。)
 */
function jumpToGlobalIp(gs: GameState, cursor: ScriptCursor | null, globalIp: number): void {
  if (!cursor) return
  void gs
  // test override labelMap 优先;**查不到则 fall back 到 globalIp**(globalIp 即全局数组下标恒等)。
  //   修真 bug(2026-05-31,user 报乾坤一掷/酒神):战斗 runScript 的 cursor 带 labelMap(buildLabelMap),
  //   但 disasm 只给"命名 goto 的跳转目标"打 label;raw-opcode 条件跳转(0x1E 钱不够/0x20 缺道具/0x06
  //   概率/JUMP_IF_*)的目标常**未打 label**(如"钱不够，只好作罢"@43064)→ 旧逻辑 labelMap 查不到 →
  //   静默不跳 → 法术不走失败分支(没钱仍放乾坤一掷且 0 伤害)。globalIp 即数组下标,直接用恒正确。
  const mapped = cursor.labelMap?.[`L_${globalIp}`]
  cursor.ip = (mapped ?? globalIp) - 1
}

/**
 * 0x0A 否/cancel 分支跳转(sdlpal script.c:3382 `wScriptEntry = operand[0]`)。
 * operand[0] 是绝对 script entry 号 = 全局数组下标(all.json L_<n>→n 恒等)。生产 cursor 无 labelMap →
 * cursor.ip = operand[0];单测传自带 labelMap → 查 L_<operand0>。confirm 派发后 fall-through 主 while 直接
 * 跑目标 op(无 ip++,对齐 sdlpal in-fn cursor steer 无帧 yield,区别于 jumpToGlobalIp 的 -1+applyRawOpcode++)。
 * 返回 true=已设 ip 续跑;false=目标越界已终止脚本(同 goto 越界路径,清 cursor 回 explore/menu)。
 */
function resolveConfirmGoto(gs: GameState, cursor: EventCursor, cmd0a: Command | undefined): boolean {
  const entry = (cmd0a?.op === 'raw' ? cmd0a.operands[0] : undefined) ?? 0
  const target = cursor.labelMap ? cursor.labelMap[`L_${entry}`] : entry
  if (target === undefined || target < 0) {
    console.warn(`event-system: 0x0A goto entry ${entry} 不在 labelMap → 终止脚本`)
    gs.eventCursor = undefined
    clearDialogBoxes(gs)
    consumePendingItem(gs)
    gs.iCurEquipPart = -1
    restoreModeAfterScript(gs)
    return false
  }
  cursor.ip = target
  return true
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
  /**
   * 当前正在解释的脚本游标(trigger = gs.eventCursor;autoScript = npc.autoCursor)。
   * "动游标"opcode(条件跳转 / 0x04 call / 0x06 / 0xA2)操作它,不再写死 gs.eventCursor —
   * 这样 trigger / autoScript 共用同一套解释器(架构统一,2026-05-28)。
   */
  cursor: ScriptCursor | null = null,
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
      // sdlpal script.c 0x46:还把 rgTrail[0..4] 全填成队伍世界坐标 + i*(xOffset,yOffset)(每槽往身后
      //   退一格),朝向 = wPartyDirection。→ 进场景队员 / 0x98 跟随者立刻排好(否则 trail 残留旧场景坐标
      //   或为空 → 跟随者要走几步把 trail 铺满才定位)。xOffset=(西/南?16:-16)、yOffset=(西/北?8:-8)。
      const dir = gs.party.facing
      const xOff = (dir === 'left' || dir === 'down') ? 16 : -16
      const yOff = (dir === 'left' || dir === 'up') ? 8 : -8
      gs.trail = [0, 1, 2, 3, 4].map((i) => ({ x: px + i * xOff, y: py + i * yOff, dir }))
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
      // 密道帧错乱修(scene 1 李逍遥爬密道,2026-06-02 真机 log 定位):sdlpal 0x15 直接写
      //   `rgParty[op2].wFrame`(script.c:737),**覆盖**任何走路步频(玩家帧是单一 wFrame)。ts 把玩家帧
      //   拆成 walking 步频 + scriptedFrame,present 用 walking 标志择一 → 0x6E playerWalkOneStep
      //   (script.c:2109 调 UpdatePartyGestures(TRUE))设的 walking=true **持续**生效,覆盖后续 0x15 的
      //   scripted pose,把密道爬行精灵(chunk193 逐帧 3,4,5,6…)拽成普通走路步频帧 0,1,0,2
      //   (= user 报"爬帧错乱 / 地板突然关上")。修:leader(member 0)被 0x15 显式设 pose 时清 walking,
      //   让 present 用 scriptedFrame —— 对齐 sdlpal "0x15 覆盖 wFrame"。普通脚本走路(只 0x6E 无后续 0x15)不受影响。
      if (memberIdx === 0) gs.walkingFrame.walking = false
      break
    }

    case OP_SET_CAMERA: {
      // sdlpal script.c:2292-2379 MoveViewport(viewport = ts gs.camera = world-space 镜头左上)。
      //   ① op0==0 && op1==0 → 回正:camera = party - (160,112)(party 居中)。
      //   ② op2==0xFFFF → 绝对跳:camera = (op0*32-160, op1*16-112)(脱离 party,显示绝对 tile 区)。
      //   ③ else → 相对 pan:camera += (SHORT op0, SHORT op1)。多帧动画(op2 帧)由 tickEventSystem 拦截做
      //      waiting='camera-pan' 逐帧;本 applyRawOpcode 路径(autoScript / 单帧 op2<=1)即移一次。
      // ts 模型 party_screen = party.world - camera → 只移 camera 即等价 sdlpal 三联(viewport/party.world/
      //   partyoffset)的净视觉(party.world 不动 + camera 移 = sdlpal partyoffset 移)。
      const [cx, cy, flag] = operands
      if ((cx ?? 0) === 0 && (cy ?? 0) === 0) {
        gs.camera.x = gs.party.x - PARTYOFFSET_X
        gs.camera.y = gs.party.y - PARTYOFFSET_Y
        console.debug('event-system: centerCameraOnParty')
      }
      else if (flag === 0xFFFF) {
        gs.camera.x = (cx ?? 0) * 32 - PARTYOFFSET_X
        gs.camera.y = (cy ?? 0) * 16 - PARTYOFFSET_Y
        console.debug(`event-system: setCamera abs col=${cx} row=${cy} → camera(${gs.camera.x},${gs.camera.y})`)
      }
      else {
        gs.camera.x += toInt16(cx ?? 0)
        gs.camera.y += toInt16(cy ?? 0)
        console.debug(`event-system: setCamera pan-step dx=${toInt16(cx ?? 0)} dy=${toInt16(cy ?? 0)}`)
      }
      break
    }

    case OP_PLAY_MUSIC: {
      // sdlpal script.c:1647 AUDIO_PlayMusic(op0, op1!=1, op1==3&&op0!=9 ? 3.0 : 0)。
      //   op0 = music track;loop = op1!=1;fade = op1==3 时 3s。ts:写 wNumMusic + musicLoop,
      //   shell 每帧轮询切 BGM(Musics/{op0}.mid)。
      const musicId = operands[0] ?? 0
      gs.wNumMusic = musicId
      gs.musicLoop = (operands[1] ?? 0) !== 1
      break
    }

    case OP_SET_BATTLE_MUSIC: {
      // sdlpal script.c:1658:gpGlobals->wNumBattleMusic = operand[0]。进战斗时按此选 BGM。
      //   纯 state-set(不立即播)→ 忠实写 gs.wNumBattleMusic;M6 接真播。
      gs.wNumBattleMusic = operands[0] ?? 0
      console.debug(`event-system: setBattleMusic id=${gs.wNumBattleMusic} (M6 接真播)`)
      break
    }

    case OP_STOP_MUSIC: {
      // sdlpal script.c:2215:AUDIO_PlayMusic(0,FALSE,op0==0?2.0:op0*3) + wNumMusic=0。
      //   op0 = fade-out 秒(0 → 2.0s,否则 op0*3s)。ts:state-set wNumMusic=0;M6 接 fade 停。
      const fadeSec = (operands[0] ?? 0) === 0 ? 2.0 : (operands[0] ?? 0) * 3
      gs.wNumMusic = 0
      console.debug(`event-system: stopMusic fade=${fadeSec}s (M6 接音频)`)
      break
    }

    case OP_PLAY_CD_MUSIC: {
      // sdlpal script.c:3023:gpGlobals->wNumMusic = op1;CD 可用 → PlayCDTrack(op0,-1→-2),失败回
      //   RIX PlayMusic(op1);CD 不可用 → 直接 RIX PlayMusic(op1)。
      //   ts 无 CD → 等价"回退 RIX":wNumMusic=op1 looped(sdlpal AUDIO_PlayMusic(op1,TRUE,0))。
      gs.wNumMusic = operands[1] ?? 0
      gs.musicLoop = true
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
      //   if (amount<0 && dwCash < -amount) wScriptEntry = operand[1]-1  // 钱不足 → 跳失败分支
      //   else dwCash += amount
      // (花钱法术/购买脚本靠"钱不足跳转"分支;2026-05-31 补全,此前简版只 clamp 不跳。)
      const amount = signExtendI16(operands[0] ?? 0)
      if (amount < 0 && gs.dwCash < -amount) {
        jumpToGlobalIp(gs, cursor, operands[1] ?? 0) // 钱不足 → cursor.ip=target-1,caller ip++ → target
        console.debug(`event-system: addCash 钱不足(have ${gs.dwCash} need ${-amount})→ jump L_${operands[1]}`)
      } else {
        gs.dwCash = Math.max(0, gs.dwCash + amount)
        console.debug(`event-system: addCash amount=${amount} → dwCash=${gs.dwCash}`)
      }
      break
    }

    case OP_HALVE_CASH: {
      // sdlpal script.c:2598-2603:gpGlobals->dwCash /= 2(整数除)。
      gs.dwCash = Math.floor(gs.dwCash / 2)
      console.debug(`event-system: halveCash → dwCash=${gs.dwCash}`)
      break
    }

    case OP_SET_ALL_PARTY_POS: {
      // sdlpal script.c:2998-3014:rgTrail[0..MAX_PLAYABLE-1] 全 = 队首世界坐标 + wPartyDirection;
      //   rgParty[1..max] 也贴队首。我们 follower 渲染靠 trail(present.ts 用 trail[1]/trail[2]),
      //   把整条 trail 塞成队首当前坐标+朝向 → follower 全贴队首 = 全队聚拢(cutscene 常用)。
      const lx = gs.party.x
      const ly = gs.party.y
      const dir = gs.party.facing
      gs.trail = [0, 1, 2, 3, 4].map(() => ({ x: lx, y: ly, dir }))
      console.debug(`event-system: setAllPartyPos → all trail = leader (${lx},${ly}) dir=${dir}`)
      break
    }

    case OP_INCREASE_PLAYER_LEVEL: {
      // sdlpal script.c:2591-2595 → global.c:2347 PAL_PlayerLevelUp(wEventObjectID, operand[0])。
      //   role = wEventObjectID(=currentEventObjectId,item/特殊脚本上下文里是 role id)。
      const role = currentEventObjectId
      if (role === undefined || role === 0xFFFF) {
        console.warn('event-system: increasePlayerLevel 无 role 上下文,跳过')
        break
      }
      playerLevelUp(gs, role, operands[0] ?? 0)
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
      // sdlpal script.c:977-1024:operand[0]=itemId, operand[1]=qty(0→1), operand[2]=失败跳转目标。
      //   条件 `x <= CountItem(item) || op[2]==0`:
      //     真 → 从库存移除(最多 have);不足部分(库存不够)→ 遍历全队 6 装备槽移除匹配装备
      //       (PAL_RemoveEquipmentEffect 撤加成 + 清槽)直至足额。
      //     假(库存不足 且 op[2]!=0)→ jump op[2](失败分支)。
      //   此前 ts 简版只 negative-add 库存,无条件检查 / 装备消耗 / 失败跳转(审计 bug)。
      const itemId = operands[0] ?? 0
      let x = (operands[1] ?? 0) === 0 ? 1 : (operands[1] ?? 0)
      const failJump = operands[2] ?? 0
      const have = countInventoryItem(gs, itemId)
      if (x <= have || failJump === 0) {
        const fromInv = Math.min(x, have)
        if (fromInv > 0) addItemToInventory(gs, itemId, -fromInv)
        let remaining = x - fromInv
        if (remaining > 0) {
          // 库存不足 → 从装备槽补足(撤装备效果 + 清槽),遍历全队 × 6 槽
          outer: for (const roleId of gs.partyMembers) {
            for (let slot = 0; slot < 6; slot++) { // MAX_PLAYER_EQUIPMENTS=6(同 0x23)
              if ((gs.PlayerRolesRuntime.rgwEquipment[slot]?.[roleId] ?? 0) === itemId) {
                removeEquipmentEffect(gs, roleId, slot)
                gs.PlayerRolesRuntime.rgwEquipment[slot]![roleId] = 0
                remaining--
                if (remaining === 0) break outer
              }
            }
          }
        }
        console.debug(`event-system: removeItem id=${itemId} qty=${x}(inv=${fromInv} equip=${x - fromInv})`)
      } else {
        // 总量不足 + 有失败分支 → 跳 op[2](sdlpal wScriptEntry=op[2]-1)
        jumpToGlobalIp(gs, cursor, failJump)
        console.debug(`event-system: removeItem id=${itemId} 不足(have ${have} need ${x})→ jump L_${failJump}`)
      }
      break
    }

    case OP_PLAY_SOUND: {
      // sdlpal script.c:1704-1709:AUDIO_PlaySound(operand[0])。M6:push 进 gs.pendingSounds 队列,
      //   shell AudioManager 每帧 drain → Web Audio 播 SOUNDS.MKF chunk。
      ;(gs.pendingSounds ??= []).push(operands[0] ?? 0)
      break
    }

    case OP_SET_OBJECT_POS_REL_PARTY: {
      // sdlpal script.c:706-714 真值:pCurrent.x = operand[1] + viewport.x + partyoffset.x
      //   = operand[1] + party.x(因为 party.world = viewport + partyoffset)。
      //   pCurrent 由 operand[0] 选(非 self)—— 旧 bug 写死 0(self),op0 选别的对象时错。
      const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'setObjectPosRelParty')
      if (npc) {
        // sdlpal pCurrent->x/y 是 SHORT:`operand + viewport + offset`(int)赋给 SHORT 自动 wrap 16-bit 有符号。
        //   operand 常是负偏移(如 0xFF80=-128,香兰报信 cutscene script.c idx 903 摆她到队首左侧)。
        //   旧码直接用无符号 operand(65408)→ 把 NPC 摆到地图外(x=67152)。toInt16 整和 wrap 还原真值。
        npc.x = toInt16((operands[1] ?? 0) + gs.party.x)
        npc.y = toInt16((operands[2] ?? 0) + gs.party.y)
        console.debug(`event-system: setObjectPosRelParty id=${npc.id} → (${npc.x},${npc.y})`)
      }
      break
    }

    case OP_SYNC_OBJ_STATE: {
      // sdlpal script.c 0x006F:if (pCurrent.sState == op1) pEvtObj.sState = op1。
      //   pCurrent = operand[0] 选的对象;pEvtObj = self(currentEventObjectId)。
      const pCurrent = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'syncObjState')
      const pEvt = getSelfNpc(gs, currentEventObjectId, 'syncObjState')
      // sdlpal script.c:2119/2121 对 operand[1] 取 SHORT(负 sState 如 -32767=0x8001);此前 ts 当无符号比较/赋值
      //   → sState>=0x8000 失真(审计 bug,对照 0x94 已用 signExtendI16)。
      const sStateVal = signExtendI16(operands[1] ?? 0)
      if (pCurrent && pEvt && (pCurrent.sState ?? 0) === sStateVal) {
        pEvt.sState = sStateVal
        console.debug(`event-system: syncObjState pEvt=${pEvt.id} ← pCurrent=${pCurrent.id} sState=${pEvt.sState}`)
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
          // P2#5:operand[1] 是全局 script entry → resolveScriptLabel 解全局 ip(L_<n>→n 恒等)。
          // autoCursor 只存全局 ip,默认读单一全局数组(_globalCommands),不再按 scene 切片重排。
          const label = `L_${entry}`
          npc.autoLabel = label
          const r = resolveScriptLabel(gs, label)
          if (r) {
            npc.autoCursor = { ip: r.ip }
          }
          else {
            npc.autoCursor = undefined
            console.warn(`event-system: setAutoScript id=${npc.id} ${label} 不在全局 labelMap`)
          }
          console.debug(`event-system: setAutoScript id=${npc.id} ${label} → ip=${r?.ip}`)
        }
      }
      break
    }

    // OP_BUY_MENU(0x26)/ OP_SELL_MENU(0x27)在 tickEventSystem 主 while 的 'raw' case 内联处理
    //   (需 return 切 menu mode,applyRawOpcode 无法控制主循环)— 2026-05-29 真接入商店菜单。

    case OP_SET_DAY_PALETTE:
      // 特效 A:sdlpal script.c:1802 `gpGlobals->fNightPalette = FALSE`(instant flag,当帧不重绘)。
      gs.nightPalette = false
      break

    case OP_SET_NIGHT_PALETTE:
      // 特效 A:sdlpal script.c:1809 `gpGlobals->fNightPalette = TRUE`(instant flag,当帧不重绘)。
      //   夜间色值已提取(#0/#5);视觉在下次 fade 经 resolveNightColors 选夜色时生效。
      gs.nightPalette = true
      break

    case OP_SHAKE_SCREEN: {
      // sdlpal script.c:1521-1535 真值:
      //   i = operand[1]; if (i == 0) i = 4;   // level 默认 4
      //   VIDEO_ShakeScreen(operand[0], i);     // 写 g_wShakeTime/g_wShakeLevel(video.c:1029-1053)
      //   if (!operand[0]) VIDEO_UpdateScreen(NULL);  // time==0 → 立即复位(关抖)
      const time = operands[0] ?? 0
      let level = operands[1] ?? 0
      if (level === 0) level = 4
      gs.shakeTime = time
      gs.shakeLevel = level
      // operand[0]==0:sdlpal 立即 UpdateScreen 复位关抖。我们 shakeTime 已 = 0,present 层
      //   `if (gs.shakeTime !== 0)` 守卫天然不抖(等价复位)。
      break
    }

    case OP_TRANSFORM_COLLECTED: {
      // sdlpal script.c:1452:把"收集值"换成 store[0] 的物品。
      //   wCollectValue>0:i=RandomLong(1,collectValue),PAL_CLASSIC cap 9;collectValue-=i;i--;
      //     AddItem(store[0].rgwItems[i],1) + 物品框 dialog。
      //   else(==0):jump op0(结束转化循环)。
      // ts:store[0] 经 setStoreTable 注入(items = rgwItems 截 0,leading 与 rgwItems[i] 同序)。
      //   物品发放忠实生效(addItemToInventory)+ 弹**物品框 dialog**(style='item-box',下方)。
      //   i>=items.length(rgwItems 尾部 0 槽)→ 不发(对齐 add 0)。
      if (gs.wCollectValue > 0) {
        let i = Math.floor(Math.random() * gs.wCollectValue) + 1 // RandomLong(1, collectValue)
        if (i > 9) i = 9 // PAL_CLASSIC cap
        gs.wCollectValue -= i
        i--
        const item = _storeTable[0]?.items[i] ?? 0
        if (item > 0) {
          addItemToInventory(gs, item, 1)
          // sdlpal script.c:1479-1513:iDialogShadow=5 + PAL_StartDialogWithOffset(kDialogCenterWindow,
          //   0,0,FALSE,0,-10) + ITEMBOX 精灵屏幕居中 + 物品 BALL 图标@box+(8,7) + PAL_ShowDialogText
          //   ("PAL_GetWord(42)@物品名@")。复用 narration 1.4s 自动关 / 任意键提前关时序(下方 'narration'
          //   == 'item-box' 分支)。仅异步 cursor(紫金葫芦 eventCursor)能 pause 渲染;同步 runScript/battle
          //   context(cursor.waiting 不被消费)设了无害,modal 不显(0x34 仅大世界炼丹用)。
          // 仅设 gs.dialogBox;异步 trigger loop 的 raw case(检测 style==='item-box')再设
          //   cursor.waiting='dialog' + 暂停(applyRawOpcode 的 cursor 是 ScriptCursor 无 waiting 字段)。
          gs.dialogBox = {
            shownLines: [],
            currentLineText: null,
            typingFrames: 0,
            charsRevealed: 0,
            dialogLineCount: 0,
            phase: 'line-done',
            style: 'item-box',
            fontColor: 0,
            shadow: true, // sdlpal iDialogShadow=5
            keyIconBlink: false,
            itemBox: { itemId: item, line1: getWord(42), line2: getWord(item) },
          }
        }
      } else {
        jumpToGlobalIp(gs, cursor, operands[0] ?? 0)
      }
      break
    }

    case OP_TELEPORT_OUT: {
      // sdlpal script.c:1554-1571:把队伍传送出当前场景(归隐符/瞬移)。
      //   if (!fInBattle && scene.wScriptOnTeleport != 0)
      //     PAL_RunTriggerScript(scene.wScriptOnTeleport, 0xFFFF);   // 成功:跑归隐脱出脚本
      //   else { g_fScriptSuccess = FALSE; wScriptEntry = op0 - 1; } // 失败:jump op0
      // ts:effective teleport entry = sceneOnTeleportOverride[wNumScene](0x6D op2)?? sceneOnTeleportEntry(base)。
      //   成功 → 仿 0x04 call:压返回帧 + 跳 teleport entry(子脚本 end 弹帧回 caller 续跑 0x47/0xA1)。
      //   teleport 脚本(scene 163/226 = loadScene+setPartyPos+fade;scene 41 = dialog cutscene)走异步
      //   cursor 全 opcode 支持;loadScene 延迟 reload(到脚本全 end)→ callStack 返回帧不丢。
      const inBattle = gs.battleState !== undefined // sdlpal !fInBattle gate
      const teleportEntry = gs.sceneOnTeleportOverride?.[gs.wNumScene] ?? gs.sceneOnTeleportEntry ?? 0
      if (!inBattle && teleportEntry !== 0 && cursor) {
        // PAL_RunTriggerScript(teleportEntry, 0xFFFF):labelMap 缺(生产 / L_<n>→n 恒等)→ 直接当全局 ip。
        const subIp = cursor.labelMap?.[`L_${teleportEntry}`] ?? teleportEntry
        cursor.callStack = cursor.callStack ?? []
        cursor.callStack.push({
          returnIp: cursor.ip + 1,
          returnCommands: cursor.commands,
          returnLabelMap: cursor.labelMap,
          savedEventObjectId: cursor.currentEventObjectId,
        })
        // sdlpal 传 wEventObjectID=0xFFFF(无具体对象)→ teleport 脚本(loadScene/setPartyPos/fade/dialog)
        //   不引用 pCurrent,故 currentEventObjectId 不变(保持 caller 的)。
        cursor.ip = subIp - 1 // caller raw-case ip++ → subIp
        // 成功:g_fScriptSuccess 不置 false。
      }
      else {
        gs.fScriptSuccess = false
        jumpToGlobalIp(gs, cursor, operands[0] ?? 0)
      }
      break
    }

    case OP_SET_RNG:
      // 特效 C:sdlpal script.c:1541 `gpGlobals->iCurPlayingRNG = operand[0]`(instant,非阻塞)。
      //   0x37 PlayRNG 据此播。两者解耦(一次 set 可被多条 play 复用同 chunk)。
      gs.iCurPlayingRNG = operands[0] ?? 0
      break

    case OP_WAVE_SCREEN:
      // 特效 B:sdlpal script.c:2136-2137 `wScreenWave = op0; sWaveProgression = (SHORT)op1`(instant)。
      //   present 层 applyScreenWave 每帧消费(逐扫描线横向卷动 + 每帧 wScreenWave += sWaveProgression)。
      //   op1 是 SHORT(可负 = 波幅渐弱);disasm 给 UNSIGNED u16 → 这里转回有符号。
      gs.wScreenWave = operands[0] ?? 0
      gs.sWaveProgression = toInt16(operands[1] ?? 0)
      break

    case OP_NPC_WALK_ONE_STEP_SOUTH:
    case OP_NPC_WALK_ONE_STEP_WEST:
    case OP_NPC_WALK_ONE_STEP_NORTH:
    case OP_NPC_WALK_ONE_STEP_EAST: {
      // sdlpal script.c:652-661 真值:dir = opcode - 0x000B(0=S, 1=W, 2=N, 3=E),
      //   pEvtObj.wDirection = dir;PAL_NPCWalkOneStep(wEventObjectID, 2)。
      // scene.c:887-888 PAL_NPCWalkOneStep 真值位移 = (±2 x, ±1 y) * iSpeed,iSpeed=2 →
      //   S→(-4,+2) W→(-4,-2) N→(+4,-2) E→(+4,+2)。**不是** ±16/±8(那是 party 整 tile step) —
      //   旧值 4× 过大 → 苗人 autoScript(0xc 走步)移动飞快 + 冲进墙(2026-05-28 user 发现)。
      const npc = resolveTargetNpc(gs, 0, currentEventObjectId, 'npcWalkOneStepDir')
      if (npc) {
        const dirCode = opcode - 0x000B  // 0..3
        const FACINGS = ['down', 'left', 'up', 'right'] as const
        const DELTAS = [[-4, 2], [-4, -2], [4, -2], [4, 2]] as const
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
        npc.scriptedFrame = ((npc.scriptedFrame ?? -1) + 1) % 4
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
      break
    }

    // ── M5.6 session 3:item.scriptOnUse / scriptOnEquip 真值 opcode(sdlpal script.c:867-1404)──

    case OP_JUMP_BY_RATE: {
      // sdlpal script.c:3299-3312:if RandomLong(1,100) >= operand[0] → jump operand[1]
      const rate = operands[0] ?? 0
      if (Math.floor(Math.random() * 100) + 1 >= rate) {
        jumpToGlobalIp(gs, cursor, operands[1] ?? 0) // cursor.ip = target-1,caller ip++ → target
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
      // 唯一行索引表(equip-effect.ts PLAYERROLES_ROW,sdlpal 真值 Level=6/Atk=17/CoveredBy=31)。
      // 不再用本地 FIELD_MAP(曾全错位 -1 → 设攻击力实写法力,装备脚本走对表、主解释器走错表的同 opcode 两套行为)。
      addPlayerStatRow(gs, fieldIdx, roleId, delta)
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
      // 唯一行索引表(同 0x19);旧 mutatePlayerStat 已删。
      setPlayerStatRow(gs, fieldIdx, roleId, newVal)
      console.debug(`event-system: setPlayerStat role=${roleId} field=${fieldIdx} =${newVal}`)
      break
    }

    case OP_INCREASE_HP: {
      // sdlpal script.c:867-894:HP delta。g_fScriptSuccess:applyAll→覆写 anyChanged(873/881);
      //   单体→仅 !changed 时 FALSE(889-892)。
      const { applyAll, anyChanged } = applyHPMPDelta(gs, currentEventObjectId, operands, /*hp*/ true, /*mp*/ false)
      if (applyAll) gs.fScriptSuccess = anyChanged
      else if (!anyChanged) gs.fScriptSuccess = false
      break
    }

    case OP_INCREASE_MP: {
      // sdlpal script.c:896-921:MP delta。g_fScriptSuccess:仅单体 !changed → FALSE(918);applyAll 不动。
      const { applyAll, anyChanged } = applyHPMPDelta(gs, currentEventObjectId, operands, /*hp*/ false, /*mp*/ true)
      if (!applyAll && !anyChanged) gs.fScriptSuccess = false
      break
    }

    case OP_INCREASE_HP_MP: {
      // sdlpal script.c:923-950:HP & MP 双 delta。g_fScriptSuccess:仅单体 !changed → FALSE(947);applyAll 不动。
      const { applyAll, anyChanged } = applyHPMPDelta(gs, currentEventObjectId, operands, /*hp*/ true, /*mp*/ true)
      if (!applyAll && !anyChanged) gs.fScriptSuccess = false
      break
    }

    case OP_DAMAGE_ENEMY: {
      // sdlpal script.c:1026-1050:战斗 only(g_Battle.rgEnemy.wHealth)
      console.debug(`event-system: damageEnemy(battle-only,overworld skip)op=${operands}`)
      break
    }

    case OP_REVIVE_PLAYER: {
      // sdlpal script.c:1052-1102:HP==0 时 HP = maxHP*op[1]/10 + cure poison level 3 + clear all status。
      // g_fScriptSuccess:applyAll→ FALSE 后任一复活则 TRUE(1061/1077);单体→ 非死者(HP!=0)则 FALSE(1099)。
      // (用复活药在活人身上 → 不消耗物品。)
      const applyAll = (operands[0] ?? 0) !== 0
      const ratioTenths = operands[1] ?? 0
      const targets = applyAll ? gs.partyMembers : (
        currentEventObjectId !== undefined && currentEventObjectId !== 0xFFFF
          ? [currentEventObjectId]
          : []
      )
      let revivedAny = false
      for (const roleId of targets) {
        const curHP = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
        const maxHP = gs.PlayerRolesRuntime.rgwMaxHP[roleId] ?? 0
        if (curHP === 0) {
          gs.PlayerRolesRuntime.rgwHP[roleId] = Math.floor(maxHP * ratioTenths / 10)
          curePlayerPoisonByLevel(gs, roleId, 3)
          revivedAny = true
          // sdlpal script.c:1072-1075:复活同时清全状态(for x<kStatusAll rgPlayerStatus[role][x]=0)。
          //   <=999 才清(>999 = 装备永久效果保留,对齐 D14;sdlpal 靠开战重设,type-pal 用哨兵)。
          const stRow = gs.rgPlayerStatus[roleId]
          if (stRow) for (let x = 0; x < stRow.length; x++) if ((stRow[x] ?? 0) <= 999) stRow[x] = 0
        }
      }
      if (applyAll) gs.fScriptSuccess = revivedAny
      else if (!revivedAny) gs.fScriptSuccess = false
      console.debug(`event-system: revivePlayer applyAll=${applyAll} ratio=${ratioTenths}/10 revived=${revivedAny}`)
      break
    }

    case OP_REMOVE_EQUIPMENT: {
      // sdlpal script.c:1104-1135
      const roleId = operands[0] ?? 0
      const slotPlus1 = operands[1] ?? 0  // 0 = 全部 / 非 0 = slot-1
      const eq = gs.PlayerRolesRuntime.rgwEquipment
      if (slotPlus1 === 0) {
        // 全移(sdlpal script.c:1110-1126):每槽 if(w!=0){回包+清};然后**无条件** RemoveEquipmentEffect(role,i)。
        for (let s = 0; s < 6; s++) {
          const w = eq[s]?.[roleId] ?? 0
          if (w !== 0) {
            addItemToInventory(gs, w, 1)
            eq[s]![roleId] = 0
          }
          removeEquipmentEffect(gs, roleId, s) // 无条件(空槽 no-op,1:1 sdlpal)
        }
      }
      else {
        // 单移(sdlpal script.c:1128-1134):仅 w!=0 时先 RemoveEquipmentEffect 再回包+清。
        const slot = slotPlus1 - 1
        const w = eq[slot]?.[roleId] ?? 0
        if (w !== 0) {
          removeEquipmentEffect(gs, roleId, slot)
          addItemToInventory(gs, w, 1)
          eq[slot]![roleId] = 0
        }
      }
      console.debug(`event-system: removeEquipment role=${roleId} slot=${slotPlus1 === 0 ? 'all' : slotPlus1 - 1}`)
      break
    }

    case OP_SET_TRIGGER_SCRIPT: {
      // sdlpal script.c:1147-1155:if op[0] != 0 → pCurrent.wTriggerScript = op[1]。
      // pCurrent 由 operand[0] 选(非 self!)—— 旧 bug 用 getSelfNpc 改错对象:客栈剧情
      //   `0x25 [63, 604]` 要把**酒剑仙**(对象 63 = id 62)trigger 改成 L_604,而非 self
      //   → 改完没生效,李大娘对话后酒剑仙仍是旧 trigger / 不开新对话(2026-05-28 user 发现)。
      // ts NpcState 没有 wTriggerScript field;改成 triggerLabel: 'L_<ip>' 等价表达。
      if ((operands[0] ?? 0) !== 0) {
        const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'setTriggerScript')
        if (npc) {
          const newIp = operands[1] ?? 0
          npc.triggerLabel = `L_${newIp}`
          npc.triggerResume = undefined // 0x25 直接覆写 wTriggerScript → 清运行时推进的续跑点
          console.debug(`event-system: setTriggerScript id=${npc.id} → triggerLabel=L_${newIp}`)
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
      // sdlpal script.c:1257-1285 + PAL_AddPoisonForPlayer(global.c:1459):
      //   仅当 RandomLong(1,100) > poisonResistance(0-100)才中毒;add 逻辑见 addPoisonForPlayer。
      for (const roleId of targets) {
        // 抗性突破判定(玩家 0-100,> 而非 >=,区别于敌人 0x28 的 0-10 >=)
        if (Math.floor(Math.random() * 100) + 1 <= getPlayerPoisonResistance(gs, roleId)) continue
        addPoisonForPlayer(gs, roleId, poisonId)
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

    case OP_SET_PLAYER_STATUS: {
      // sdlpal global.c PAL_SetPlayerStatus(role, op0=statusId, op1=numRound)恒单目标(wEventObjectID)。
      //   写持久 gs.rgPlayerStatus(开战 seed 进 BattleState)。target 解析:sdlpal 的 applyToAll buff 物品靠
      //   PAL_GameUseItem 外层逐队员循环(eventObjectId=roleId)实现;type-pal 把 applyToAll item 跑一次
      //   (currentEventObjectId=0xFFFF)→ 故此处 0xFFFF/undefined 展开全队(与既有 0x1B applyHPMPDelta 同适配),
      //   否则单 role。bad(0-3 Confused/Paralyzed/Sleep/Silence):cur==0 才设;puppet(4):仅死人且更久,
      //   活人→fScriptSuccess=FALSE;good(5-8 Bravery/Protect/Haste/DualAttack):活人且更久。金刚符63/黑狗血85。
      const statusId = operands[0] ?? 0
      const numRound = operands[1] ?? 0
      const stTargets = (currentEventObjectId === undefined || currentEventObjectId === 0xFFFF) ? gs.partyMembers : [currentEventObjectId]
      for (const roleId of stTargets) {
        const row = gs.rgPlayerStatus[roleId]
        if (!row || statusId >= row.length) continue
        const cur = row[statusId] ?? 0
        const hp = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
        if (statusId <= 3) { // bad:已有则不刷新
          if (cur === 0) row[statusId] = numRound
        }
        else if (statusId === 4) { // puppet:仅死人,且更久才设;活人 → 失败
          if (hp === 0) { if (cur < numRound) row[statusId] = numRound }
          else gs.fScriptSuccess = false
        }
        else { // good 5-8:活人且更久
          if (hp !== 0 && cur < numRound) row[statusId] = numRound
        }
      }
      break
    }

    case OP_REMOVE_PLAYER_STATUS: {
      // sdlpal global.c:2304 PAL_RemovePlayerStatus:status<=999 才清(>999 = 装备永久效果不清,对齐 D14)。
      //   灵心符65/银针255 大世界解负面状态。
      const statusId = operands[0] ?? 0
      const rmTargets = (currentEventObjectId === undefined || currentEventObjectId === 0xFFFF) ? gs.partyMembers : [currentEventObjectId]
      for (const roleId of rmTargets) {
        const row = gs.rgPlayerStatus[roleId]
        if (row && statusId < row.length && (row[statusId] ?? 0) <= 999) row[statusId] = 0
      }
      break
    }

    // ── A 类补全(A1:自包含数据/状态,无跳转)─────────────────────────────────

    case OP_SET_TRIGGER_METHOD: {
      // sdlpal script.c:1613-1621:if operand[0] != 0 → pCurrent.wTriggerMode = operand[1]。
      // pCurrent 由 operand[0] 选(0xFFFF→self,否则 object[operand[0]-1]),**不是恒 self** —
      //   旧 bug 用 currentEventObjectId 恒改 self:水生叔 trigger `0x40 [0xFFFF,3]`(关自己
      //   proximity)对,但随后 `0x40 [124,6]` 本应激活**张四**(对象 124 = id 123),却又把水生叔
      //   mode 复位 6 → 每帧 proximity 重触发 → 对话无限循环(2026-05-29 user 发现)。改用
      //   resolveTargetNpc(同 0x25 setTriggerScript)。triggerMode 写在共享 event object 上 → 持久。
      if ((operands[0] ?? 0) !== 0) {
        const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'setTriggerMethod')
        if (npc) npc.triggerMode = operands[1] ?? 0
      }
      break
    }

    case OP_MARK_SCRIPT_FAILED: {
      // sdlpal script.c:1623-1627:g_fScriptSuccess = FALSE。脚本结束时 item.consuming 不扣 / 魔法 MP 不扣。
      gs.fScriptSuccess = false
      console.debug('event-system: markScriptFailed → fScriptSuccess=false')
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
      // sdlpal script.c:2756-2764:`for (i = op0; i <= op1; i++) lprgEventObject[i-1].sState = op2`。
      // i 是 1-based,遍历**全局**表区间 [op0-1 .. op1-1]。P0#2 修:旧实现 0-based [op0..op1] 且只扫
      //   gs.npcs(off-by-one + 漏跨 scene 对象)。改走与 0x49 同一 resolveGlobalEventObject(id-1 + 全局兜底)。
      const from = operands[0] ?? 0
      const to = operands[1] ?? 0
      const state = operands[2] ?? 0
      for (let i = from; i <= to; i++) {
        const obj = resolveGlobalEventObject(gs, i, 'setMultiObjectState')
        if (obj) obj.sState = state
      }
      break
    }

    // ── A2 条件跳转(目标已由 disasm/slice 打标签 + 收集)─────────────────────────

    case OP_JUMP_IF_ITEM_LESS: {
      // sdlpal script.c:1864:if GetItemAmount(op0) < (SHORT)op1 → jump op2
      if (countInventoryItem(gs, operands[0] ?? 0) < signExtendI16(operands[1] ?? 0)) {
        jumpToGlobalIp(gs, cursor, operands[2] ?? 0)
      }
      break
    }
    case OP_JUMP_IF_NOT_POISON_KIND: {
      // sdlpal script.c:1918:if !IsPlayerPoisonedByKind(role, op0) → jump op1
      if (!isPlayerPoisoned(gs, currentEventObjectId ?? 0, operands[0] ?? 0)) {
        jumpToGlobalIp(gs, cursor, operands[1] ?? 0)
      }
      break
    }
    case OP_JUMP_IF_NOT_POISONED: {
      // sdlpal script.c:1961:if !IsPlayerPoisonedByLevel(role, 0) → jump op0
      if (!isPlayerPoisoned(gs, currentEventObjectId ?? 0)) {
        jumpToGlobalIp(gs, cursor, operands[0] ?? 0)
      }
      break
    }
    case OP_JUMP_IF_NOT_ALL_FULL_HP: {
      // sdlpal script.c:2153-2161:任一队员 HP < MaxHP → jump op0
      const r = gs.PlayerRolesRuntime
      const notFull = gs.partyMembers.some(
        (roleId) => (r.rgwHP[roleId] ?? 0) < (r.rgwMaxHP[roleId] ?? 0),
      )
      if (notFull) jumpToGlobalIp(gs, cursor, operands[0] ?? 0)
      break
    }
    case OP_JUMP_IF_PLAYER_IN_PARTY: {
      // sdlpal script.c:2234-2242:队伍任一成员 rgwName == op0 → jump op1
      const r = gs.PlayerRolesRuntime
      const inParty = gs.partyMembers.some((roleId) => r.rgwName[roleId] === (operands[0] ?? 0))
      if (inParty) jumpToGlobalIp(gs, cursor, operands[1] ?? 0)
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
      if (count < (operands[1] ?? 0)) jumpToGlobalIp(gs, cursor, operands[2] ?? 0)
      break
    }
    case OP_JUMP_IF_OBJ_STATE: {
      // sdlpal script.c:2677-2680:if pCurrent.sState == (SHORT)op1 → jump op2
      const npc = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'jumpIfObjState')
      if (npc && (npc.sState ?? 0) === signExtendI16(operands[1] ?? 0)) {
        jumpToGlobalIp(gs, cursor, operands[2] ?? 0)
      }
      break
    }
    case OP_JUMP_IF_SCENE: {
      // sdlpal script.c:2687-2690:if wNumScene == op0 → jump op1
      if (gs.wNumScene === (operands[0] ?? 0)) jumpToGlobalIp(gs, cursor, operands[1] ?? 0)
      break
    }
    case OP_RANDOM_JUMP: {
      // sdlpal script.c:3020:wScriptEntry += RandomLong(0, op0-1);+ InterpretInstruction 末尾 +1
      //   → 跳到 [cur+1, cur+op0]。ts:cursor.ip += offset(caller ip++ → cur+offset+1)。
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
        jumpToGlobalIp(gs, cursor, operands[2] ?? 0)
        break
      }
      const dx = Math.abs(pEvt.x - pCurrent.x)
      const dy = Math.abs((pEvt.y - pCurrent.y) * 2)
      if (dx + dy >= (operands[1] ?? 0) * 32 + 16) jumpToGlobalIp(gs, cursor, operands[2] ?? 0)
      break
    }
    case OP_PLACE_USED_ITEM: {
      // sdlpal script.c:2473-2509:把 pCurrent(op0 选)放 party 正前方一格 + sState=op1;
      //   该格有障碍(只查 tilemap)→ jump op2。前方格 = party + facing offset(±16/±8)。
      const pCurrent = resolveTargetNpc(gs, operands[0] ?? 0, currentEventObjectId, 'placeUsedItem')
      if (!pCurrent) {
        jumpToGlobalIp(gs, cursor, operands[2] ?? 0)
        break
      }
      const dir = gs.party.facing
      const fx = gs.party.x + ((dir === 'left' || dir === 'down') ? -16 : 16)
      const fy = gs.party.y + ((dir === 'left' || dir === 'up') ? -8 : 8)
      if (isObstacle(fx, fy, false, 0)) {
        jumpToGlobalIp(gs, cursor, operands[2] ?? 0)
      }
      else {
        pCurrent.x = fx
        pCurrent.y = fy
        pCurrent.sState = operands[1] ?? 0
      }
      break
    }
    case OP_CALL_SCRIPT: {
      // sdlpal script.c:3258:PAL_RunTriggerScript(op0, op1==0 ? current : op1) 同步跑子脚本 +
      // wScriptEntry++。ts tick 模型:压返回帧 + 跳子脚本(本 scene labelMap 优先,否则 shared);
      // 子脚本 'end' 在 caller runner(trigger / autoScript)弹帧返回。cursor = 传入活动游标。
      const subEntry = operands[0] ?? 0
      if (!cursor || subEntry === 0) break
      // P2#5:子脚本在同一全局数组,getLabels(默认全局 L_<n>→n 恒等)解出全局 ip,不再切来源。
      const subIp = getLabels(cursor)[`L_${subEntry}`]
      if (subIp === undefined) {
        console.debug(`event-system: callScript L_${subEntry} 不在全局 labelMap`)
        break
      }
      cursor.callStack = cursor.callStack ?? []
      cursor.callStack.push({
        returnIp: cursor.ip + 1,
        returnCommands: cursor.commands, // 生产恒 undefined(默认全局);单测保留自带数组
        returnLabelMap: cursor.labelMap,
        savedEventObjectId: cursor.currentEventObjectId,
      })
      // sdlpal 传 op1 作 wEventObjectID(1-based);op1=0 → 沿用当前。ts currentEventObjectId 0-based。
      if ((operands[1] ?? 0) !== 0) cursor.currentEventObjectId = (operands[1] ?? 0) - 1
      cursor.ip = subIp - 1 // caller raw-case ip++ → subIp(同来源,不改 cursor.commands)
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
      // sdlpal script.c:2065-2089:if op0:
      //   op1!=0 → rgScene[op0-1].wScriptOnEnter = op1(全局 entry);
      //   op2!=0 → rgScene[op0-1].wScriptOnTeleport = op2(全局 entry,0x38 归隐脱出脚本);
      //   op1==0 && op2==0 → 清 BOTH(onEnter=0 + onTeleport=0)。
      // ts:onEnter override loadScene 时消耗(临时);onTeleport override 持久(0x38 随时读)。
      const sceneId = operands[0] ?? 0 // 1-based wNumScene
      const op1 = operands[1] ?? 0
      const op2 = operands[2] ?? 0
      if (sceneId !== 0) {
        gs.sceneOnEnterOverride = gs.sceneOnEnterOverride ?? {}
        gs.sceneOnTeleportOverride = gs.sceneOnTeleportOverride ?? {}
        if (op1 !== 0) gs.sceneOnEnterOverride[sceneId] = op1
        if (op2 !== 0) gs.sceneOnTeleportOverride[sceneId] = op2
        if (op1 === 0 && op2 === 0) {
          gs.sceneOnEnterOverride[sceneId] = 0 // 清 onEnter(loadScene 消耗 → -1 哨兵)
          gs.sceneOnTeleportOverride[sceneId] = 0 // 清 onTeleport
        }
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
        jumpToGlobalIp(gs, cursor, operands[2] ?? 0)
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
        // 面对中:设 **pCurrent**(operand[0] 选的对象,非 self!)的触发模式,下一帧接触可触发。
        // sdlpal script.c:2426 `pCurrent->wTriggerMode = kTriggerTouchNormal(5) + op1`。
        // 旧 bug 设 currentEventObjectId(applyToAll 物品 = 0xFFFF → 找不到 → no-op)→ 酒剑仙
        // triggerMode 没变 contact → 用桂花酒后剧情不自动触发(2026-05-28 user 发现)。
        if (op1 > 0) {
          pCurrent.triggerMode = 5 + op1
        }
      }
      else {
        jumpToGlobalIp(gs, cursor, operands[2] ?? 0)
      }
      break
    }

    case OP_FIXME_78:
      // sdlpal script.c:2224-2228 `case 0x0078: // FIXME: ??? break;` — 字面 no-op。本游戏 35 处用,空操作。
      break

    case OP_BACKUP_SCREEN:
      // sdlpal script.c:3069-3074 `VIDEO_BackupScreen(gpScreen)`。本游戏 0 调用(0x73 内部已 backup),no-op。
      break

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
): { applyAll: boolean, anyChanged: boolean } {
  const applyAll = (operands[0] ?? 0) !== 0
  const delta = signExtendI16(operands[1] ?? 0)
  const targets = applyAll ? gs.partyMembers : (
    currentEventObjectId !== undefined && currentEventObjectId !== 0xFFFF
      ? [currentEventObjectId]
      : (currentEventObjectId === 0xFFFF ? gs.partyMembers : [])
  )
  // sdlpal PAL_IncreaseHPMP 返回是否真改了 HP/MP(死人 / 已到 max·min → 不变 → FALSE)。
  // anyChanged = 任一 target 的 HP 或 MP 实际发生变化(供 g_fScriptSuccess gate 用)。
  let anyChanged = false
  for (const roleId of targets) {
    // sdlpal PAL_IncreaseHPMP(global.c:1287)真值:**仅活人**(rgwHP>0)处理;死人(HP==0)不改 HP/MP、
    //   返回 FALSE(不计入 anyChanged → g_fScriptSuccess 判定正确)。此前 ts 缺此 gate(0x1B/1C/1D 审计 bug)。
    if ((gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0) <= 0) continue
    if (hp) {
      const cur = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
      const max = gs.PlayerRolesRuntime.rgwMaxHP[roleId] ?? 0
      const next = Math.max(0, Math.min(max, cur + delta))
      if (next !== cur) anyChanged = true
      gs.PlayerRolesRuntime.rgwHP[roleId] = next
    }
    if (mp) {
      const cur = gs.PlayerRolesRuntime.rgwMP[roleId] ?? 0
      const max = gs.PlayerRolesRuntime.rgwMaxMP[roleId] ?? 0
      const next = Math.max(0, Math.min(max, cur + delta))
      if (next !== cur) anyChanged = true
      gs.PlayerRolesRuntime.rgwMP[roleId] = next
    }
  }
  console.debug(
    `event-system: HP${hp ? '+' : ''}MP${mp ? '+' : ''}Delta applyAll=${applyAll} delta=${delta} → ${targets.length} role(s) changed=${anyChanged}`,
  )
  return { applyAll, anyChanged }
}

/** sdlpal MAX_LEVELS(common.h)— 等级上限 99。 */
const MAX_LEVELS = 99
/** sdlpal STAT_LIMIT 宏:单项属性上限 999(global.c:2393)。 */
const STAT_CAP = 999

/** RandomLong(0, n) 含端点 — 与 0xA2 randomJump 一致用 Math.random(非确定性,save 不可复现)。 */
function randInclusive(n: number): number {
  return Math.floor(Math.random() * (n + 1))
}

/**
 * port sdlpal `PAL_PlayerLevelUp`(global.c:2347-2409)。
 *
 *   rgwLevel[role] += numLevels(clamp MAX_LEVELS);每升一级各属性按 固定+RandomLong 增长:
 *     MaxHP +10+r(0,7) / MaxMP +8+r(0,5) / Atk +4+r(0,1) / MagStr +4+r(0,1)
 *     / Def +2+r(0,1) / Dex +2+r(0,1) / FleeRate +2 — 全部 clamp 999。
 *   重置主经验 rgPrimaryExp[role]:wExp=0,wLevel=新等级。
 *
 * 注:stat 增长用 Math.random(同 0xA2);值不与 sdlpal 字节一致,但范围/确定部分(level/Exp 重置/clamp)忠实。
 * 这是首个 level-up stat 增长实现,后续战斗 level-up(battle-system.ts follow-up)可复用本 helper。
 */
function playerLevelUp(gs: GameState, role: number, numLevels: number): void {
  const r = gs.PlayerRolesRuntime
  if (r.rgwLevel[role] === undefined) {
    console.warn(`event-system: playerLevelUp role=${role} 不在 PlayerRoles,跳过`)
    return
  }
  r.rgwLevel[role] = Math.min(MAX_LEVELS, (r.rgwLevel[role] ?? 0) + numLevels)
  for (let i = 0; i < numLevels; i++) {
    r.rgwMaxHP[role] = (r.rgwMaxHP[role] ?? 0) + 10 + randInclusive(7)
    r.rgwMaxMP[role] = (r.rgwMaxMP[role] ?? 0) + 8 + randInclusive(5)
    r.rgwAttackStrength[role] = (r.rgwAttackStrength[role] ?? 0) + 4 + randInclusive(1)
    r.rgwMagicStrength[role] = (r.rgwMagicStrength[role] ?? 0) + 4 + randInclusive(1)
    r.rgwDefense[role] = (r.rgwDefense[role] ?? 0) + 2 + randInclusive(1)
    r.rgwDexterity[role] = (r.rgwDexterity[role] ?? 0) + 2 + randInclusive(1)
    r.rgwFleeRate[role] = (r.rgwFleeRate[role] ?? 0) + 2
  }
  for (const arr of [r.rgwMaxHP, r.rgwMaxMP, r.rgwAttackStrength, r.rgwMagicStrength, r.rgwDefense, r.rgwDexterity, r.rgwFleeRate]) {
    if ((arr[role] ?? 0) > STAT_CAP) arr[role] = STAT_CAP
  }
  const exp = gs.Exp.rgPrimaryExp[role]
  if (exp) {
    exp.wExp = 0
    exp.wLevel = r.rgwLevel[role] ?? 0
  }
  console.debug(`event-system: playerLevelUp role=${role} +${numLevels} → level ${r.rgwLevel[role]}`)
}

// 0x0019/0x001A 行索引写入已统一到 equip-effect.ts 的 addPlayerStatRow/setPlayerStatRow
//(唯一 PLAYERROLES_ROW 表,sdlpal global.h tagPLAYERROLES 真值)。旧 mutatePlayerStat 本地
// FIELD_MAP 全错位 -1(P0#1,2026-05-29 删除)。

/** sdlpal PAL_CurePoisonByKind(global.c:1936-1955)— roleId × poisonId 清 0。 */
export function curePlayerPoisonByKind(gs: GameState, roleId: number, poisonId: number): void {
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${roleId}`
    const ps = gs.rgPoisonStatus[key]
    if (ps && ps.wPoisonID === poisonId) {
      gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
    }
  }
}

/**
 * sdlpal `PAL_AddPoisonForPlayer`(global.c:1459-1505):去重(已有同毒 skip)+ 首空槽加,
 * wPoisonScript = obj.wPlayerScript(每回合 tick 跑)。**不含**抗性 gate —— gate 在调用方
 * (0x29 / 敌普攻 attackEquivItem),sdlpal 真值同此分工。
 * 战斗内(0x29 battle ctx)与大世界 / 装备 scriptOnEquip(寿葫芦)共用。
 */
export function addPoisonForPlayer(gs: GameState, roleId: number, poisonId: number): void {
  const playerScript = _objectPoisons.get(poisonId)?.playerScript ?? 0
  // 去重:已有同毒 → skip
  for (let slot = 0; slot < 16; slot++) {
    if (gs.rgPoisonStatus[`${slot}_${roleId}`]?.wPoisonID === poisonId) return
  }
  // 首空槽加
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${roleId}`
    if (!gs.rgPoisonStatus[key] || gs.rgPoisonStatus[key]!.wPoisonID === 0) {
      gs.rgPoisonStatus[key] = { wPoisonID: poisonId, wPoisonScript: playerScript }
      return
    }
  }
}

/**
 * sdlpal `PAL_RemoveEquipmentEffect` Wear 分支(global.c:1413-1454):清该 role 的 level≥99 毒
 * (level<99 保留)。卸 Wear 装备(如寿葫芦)时调 —— 装备授的常驻"毒"(回血/诅咒)随卸下消失。
 */
export function removePoisonLevel99(gs: GameState, roleId: number): void {
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${roleId}`
    const ps = gs.rgPoisonStatus[key]
    if (!ps || ps.wPoisonID === 0) continue
    const level = _objectPoisons.get(ps.wPoisonID)?.level ?? 0
    if (level >= 99) gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
  }
}

/** sdlpal PAL_CurePoisonByLevel(global.c:1567-1614)— 该毒 wPoisonLevel <= maxLevel 就清 0(**无** level==99 例外)。
 *  用注入的 _objectPoisons 取真 level(2026-05-31 plumb;此前简版全清)。装备毒(level 99)靠 cure 物品 maxLevel
 *  都是 1-3(九节菖蒲 2 / 鬼枯藤 2 / 毒龙胆 3)< 99 自然不被清;装备毒由 removePoisonLevel99(卸装备)清。
 *  2026-06-02 review:旧 `level!==99` 守卫 + 注释("sdlpal 跳过 level 99")偏离 sdlpal —— 那是
 *  PAL_RemoveEquipmentEffect(global.c:1440)的行为,不是本函数;已删守卫对齐真值(行为对真物品不变)。 */
export function curePlayerPoisonByLevel(gs: GameState, roleId: number, maxLevel: number): void {
  for (let slot = 0; slot < 16; slot++) {
    const key = `${slot}_${roleId}`
    const ps = gs.rgPoisonStatus[key]
    if (!ps || ps.wPoisonID === 0) continue
    const level = _objectPoisons.get(ps.wPoisonID)?.level ?? 0
    if (level <= maxLevel) {
      gs.rgPoisonStatus[key] = { wPoisonID: 0, wPoisonScript: 0 }
    }
  }
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
  // 其它 → lprgEventObject[operand0-1](1-based 全局 NPC id),经唯一全局解析器。
  return resolveGlobalEventObject(gs, operand0, opName)
}

/**
 * 唯一"1-based 全局 event object id → 对象"解析器(sdlpal `lprgEventObject[id-1]`)。
 *
 * 所有按全局 id 选对象的 opcode(0x49 单对象 via resolveTargetNpc / 0x9A 多对象范围)共用此函数,
 * 杜绝各自手搓 `id-1` / scope 而出 off-by-one 或漏全局对象(P0#2,2026-05-29:0x9A 曾 0-based
 * [op0..op1] + 只扫 gs.npcs)。
 *
 * 先查当前 scene 切片 gs.npcs(拿到引用),不在则回退 gs.allEventObjects 全局表 —— sdlpal
 * lprgEventObject 是单一全局表,脚本可改任意 scene 对象状态;gs.npcs 只是当前 scene 的引用切片,
 * 跨 scene 改动经全局表持久(eg. 客栈苗人 0x49 [25,2,0] 跨 scene 显隐)。
 */
function resolveGlobalEventObject(
  gs: GameState,
  oneBasedId: number,
  opName: string,
): GameState['npcs'][number] | null {
  const targetId = oneBasedId - 1
  const npc = gs.npcs.find((n) => n.id === targetId)
  if (npc) return npc
  const global = gs.allEventObjects?.[targetId]
  if (global && global.id === targetId) return global
  console.warn(`event-system: ${opName} id(1-based)=${oneBasedId} → idx=${targetId} 不在当前 scene 也不在全局表,跳过`)
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
 * sdlpal `PAL_GameUpdate`(play.c:235-238)每帧:`if (--wChasespeedChangeCycles == 0) wChaseRange = 1`。
 * 0x62 驱魔香(wChaseRange=0 暂停追逐)/ 0x63 十里香(wChaseRange=3 加速)设 cycles=op0,本 timer 逐帧自减,
 * 到 0 复位 wChaseRange=1 —— 缺此则效果永久(2026-06-02 审计 MED gap:cycles 只写不消费)。
 * 大世界每帧 tick(mode.ts)调。cycles<=0 不动(不 underflow;sdlpal WORD 会绕回但无游戏意义)。
 */
export function tickChaseTimer(gs: GameState): void {
  if (gs.wChasespeedChangeCycles > 0 && --gs.wChasespeedChangeCycles === 0) {
    gs.wChaseRange = 1
  }
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
  /** P2#5:可选 override(单测传自带数组);生产省略 → cursor 默认读全局数组,startIp 为全局 onEnter ip。 */
  commands: Command[] | undefined,
  labelMap: Record<string, number> | undefined,
  startIp: number,
  /**
   * 本 onEnter 所属 scene(= wNumScene)。传了就在跑完(撞 end)时把"下一条 entry"
   * 持久化到 gs.sceneOnEnterIp[sceneId](sdlpal play.c:64 真值)。skip-intro 同步跑开场
   * 也要存,否则重进 scene onEnter 会重播(覆盖门的 setPartyPos)。
   */
  sceneId?: number,
): void {
  // P2#6c:用本地 ScriptCursor 跑 → applyRawOpcode 的"动游标"opcode(条件跳转 / 0x04 call / 0x06 /
  // 0xA2)操作本 cursor,与 trigger / autoScript 同一套解释器契约。旧版不传 cursor → 这些 opcode 在
  // applyRawOpcode 内 `if (cursor)` 守卫下静默 no-op → skip-intro 同步跑 onEnter 时控制流断(跳转失效)。
  const cursor: ScriptCursor = { ip: startIp, commands, labelMap }
  let stepCount = 0

  while (true) {
    if (++stepCount > SINGLE_TICK_LIMIT) {
      console.warn(`runEnterScript: single-tick limit exceeded at ip=${cursor.ip}`)
      return
    }

    const cmds = getCmds(cursor) // P2#5:默认全局数组
    if (cursor.ip < 0 || cursor.ip >= cmds.length) {
      return
    }

    const cmd = cmds[cursor.ip]!

    if (cmd.op === 'end') {
      // sdlpal play.c:64:onEnter 跑完存回下一条 entry(0x00→起始 replay;0x01→ip+1;0x02→resetTo)
      if (sceneId !== undefined) {
        let nextEntry: number
        if (cmd.advance) nextEntry = cursor.ip + 1
        else if (cmd.reset && cmd.resetTo !== undefined) {
          nextEntry = getLabels(cursor)[`L_${cmd.resetTo}`] ?? startIp
        }
        else nextEntry = startIp
        gs.sceneOnEnterIp[sceneId] = nextEntry
      }
      return
    }

    if (cmd.op === 'goto') {
      const target = resolveLabelIp(cursor, cmd.to)
      if (target === undefined) {
        console.warn(`runEnterScript: goto label ${cmd.to} 不在 labelMap`)
        return
      }
      cursor.ip = target
      continue
    }

    if (cmd.op === 'raw') {
      // cursor 传入 → 条件跳转 / call / 0x06 / 0xA2 操作本 cursor(jumpToGlobalIp 设 target-1,下面 ip++ 落到 target)。
      applyRawOpcode(gs, cmd.opcode, cmd.operands, cursor.currentEventObjectId, cursor)
      cursor.ip++
      continue
    }

    // 其他具名 op(showDialog / setDialogStyle* / loadScene 等)→ skip(enter 段不阻塞)
    console.debug(`runEnterScript: skip named op=${cmd.op} ip=${cursor.ip}`)
    cursor.ip++
  }
}
