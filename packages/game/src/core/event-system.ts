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
import type { BattleState } from './battle/battle-state.js'
import type { CommandBus } from './command-bus.js'
import type { GameState, NpcState } from './game-state.js'
import { PARTYOFFSET_X, PARTYOFFSET_Y } from './game-state.js'
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

/** sdlpal palcommon.h enum kDir → our Facing 字面量映射 */
const SDLPAL_DIR_TO_FACING: Record<number, 'down' | 'left' | 'up' | 'right'> = {
  0: 'down',   // kDirSouth
  1: 'left',   // kDirWest
  2: 'up',     // kDirNorth
  3: 'right',  // kDirEast
}

const SINGLE_TICK_LIMIT = 256

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
  const cmds = gs.sceneCommands!
  if (cursor.ip < 0 || cursor.ip >= cmds.length) {
    npc.autoCursor = undefined  // ip 越界 → 停
    return
  }
  const cmd = cmds[cursor.ip]!

  switch (cmd.op) {
    case 'end':
      // sdlpal case 0x0000 / 0x0001:停止;0x0001 推 ip。
      if (cmd.advance) cursor.ip++
      return

    case 'goto': {
      // sdlpal case 0x0003 unconditional jump
      const frameDelay = cmd.frameDelay ?? 0
      if (frameDelay > 0) {
        cursor.idleFrameCount = (cursor.idleFrameCount ?? 0) + 1
        if (cursor.idleFrameCount < frameDelay) return
        cursor.idleFrameCount = 0
      }
      const target = gs.sceneLabelMap?.[cmd.to]
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

      // opcode 0x10/0x11/0x82 NPCWalkTo — autoScript 自走目标(NPC 是 autoCursor owner)
      if (cmd.opcode === OP_NPC_WALK_TO_SPEED_3
        || cmd.opcode === OP_NPC_WALK_TO_SPEED_2
        || cmd.opcode === OP_NPC_WALK_TO_SPEED_8) {
        const speed = cmd.opcode === OP_NPC_WALK_TO_SPEED_3
          ? 3
          : cmd.opcode === OP_NPC_WALK_TO_SPEED_8
            ? 8
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
      console.warn(`event-system: ip ${cursor.ip} 越界 → 切回 explore`)
      gs.eventCursor = undefined
      gs.dialogBox = undefined
      gs.mode = 'explore'
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
        gs.eventCursor = undefined
        gs.dialogBox = undefined
        gs.currentDialogPortraitIcon = undefined
        // Sync.2 fix5:主角 scripted pose / sprite override 不在此清,
        //   由 scene-system 首次走动检测时清(避免单元测试 setX→end 两 opcode 后立即 read 不到值)
        gs.mode = 'explore'
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
        // Sync.2 fix20:opcode 0x70 PartyWalkTo — 主角阻塞走到目标(sdlpal script.c:2125-2130)。
        // 每 tick 走 1 step (speed=2),arrived 才 ip++。trigger 中常见用法 "主角走到密道" 等。
        if (cmd.opcode === OP_PARTY_WALK_TO) {
          const arrived = partyWalkTo(
            gs,
            cmd.operands[0] ?? 0,
            cmd.operands[1] ?? 0,
            cmd.operands[2] ?? 0,
            2,
          )
          if (arrived) {
            cursor.ip++
            break
          }
          return
        }

        // Sync.2 fix19:opcode 0x10 / 0x11 / 0x82 NPCWalkTo — 阻塞 trigger script,
        // 每 tick 走 1 步,arrived 才 ip++(对应 sdlpal `wScriptEntry--` 下帧 retry 真值)。
        // self = currentEventObjectId(trigger 当前 NPC,scene-system 进入 trigger 时设)。
        if (cmd.opcode === OP_NPC_WALK_TO_SPEED_3
          || cmd.opcode === OP_NPC_WALK_TO_SPEED_2
          || cmd.opcode === OP_NPC_WALK_TO_SPEED_8) {
          const npc = getSelfNpc(gs, cursor.currentEventObjectId, 'npcWalkTo')
          if (!npc) {
            // 无 self(从 onEnter 跑无 trigger NPC)→ skip + ip++
            cursor.ip++
            break
          }
          // sdlpal 三档速度:0x10=3, 0x11=2(每隔帧走), 0x82=8
          const speed = cmd.opcode === OP_NPC_WALK_TO_SPEED_3
            ? 3
            : cmd.opcode === OP_NPC_WALK_TO_SPEED_8
              ? 8
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
        console.debug(`event-system: skip M3+ op=${cmd.op} ip=${cursor.ip}`)
        cursor.ip++
        break

      case 'loadScene': {
        // sdlpal 0x0059 真做:fEnteringScene + wNumScene = operand[0] → 下帧 PAL_LoadResources 重 load。
        // 我们用注入的 _sceneLoader async callback:fetch 新 scene assets → setSceneContext + 重置 gs +
        // 切 gs.eventCursor 到新 scene 的 onEnterLabel ip → 释放 waiting。
        // ip 停在本 loadScene 上,callback 完成后 gs.eventCursor 已被重写到新 scene,本 cursor 弃用。
        if (_sceneLoader) {
          cursor.waiting = 'scene-load'
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

      case 'raw':
        // D26:无具名 opcode 兜底 skip + console.debug;battle mode 加前缀方便
        // T20/T21 implementer grep 撞到的真实 opcode 号
        console.debug(`${logPrefix} skip raw opcode=${cmd.opcode} ip=${ip}`, cmd.operands)
        ip++
        break

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

    default:
      console.debug(`event-system: skip raw opcode=0x${opcode.toString(16).padStart(4, '0')}`, operands)
      break
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
  // sdlpal:`i = operand[0] - 1`;lprgEventObject 是 0-based,wEventObjectID 是 1-based。
  // 我们 pal-extract scene.ts:46 `id: i`(0-based 全局 eventObject 索引)= sdlpal `i`。
  // → 查 `id == operand0 - 1`(operand0 已减 1 即对应我们的 npc.id)。
  const targetId = operand0 - 1
  const npc = gs.npcs.find((n) => n.id === targetId)
  if (!npc) {
    // 注:scene 切换后 gs.npcs 只含当前 scene 的 event objects;但 sdlpal lprgEventObject 是全局表,
    // 跨 scene id 可能在 lprgEventObject 内但不在当前 gs.npcs。M5 简版:warn + skip。
    console.warn(`event-system: ${opName} 显式 operand[0]=${operand0} → npc.id=${targetId} 不在当前 scene,跳过`)
    return null
  }
  return npc
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

// runEnterScript: 同步跑 wScriptOnEnter 段(loadScene 不传 partyStart 时调用)。
// 只处理瞬时 setX opcode;其余走 D26 skip。
// SINGLE_TICK_LIMIT 兜底防死循环。
export function runEnterScript(
  gs: GameState,
  commands: Command[],
  labelMap: Record<string, number>,
  startIp: number,
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
