/**
 * GameState —— 探索 / 事件 / 战斗模式下的单一真相源(02 架构 + D6)。
 * M2 覆盖 explore / event;M3 (T14) 加 battle option(tickBattle 真实现 T22)。
 * M5 Sync.1:全字段冻结(SAVEDGAME_WIN 倒推 typed)。
 */

import type { Command, DialogBoxStyle, Palette, SceneEventObject } from '@type-pal/shared'
import type { BattleState } from './battle/battle-state.js'
import type { PaletteFadeState } from './palette-fade.js'

export type Facing = 'up' | 'down' | 'left' | 'right'

/**
 * sdlpal `gpGlobals->partyoffset` 真值(res.c:301):party 永远 anchor 在 screen
 * (160, 112);viewport 是 "屏幕左上对应的 world 坐标" = party.world - partyoffset。
 *
 * gs.camera 语义 = sdlpal viewport。所有 camera write 点统一:
 *   gs.camera.x = gs.party.x - PARTYOFFSET_X
 *   gs.camera.y = gs.party.y - PARTYOFFSET_Y
 *
 * 后续 sdlpal script.c:2306/2354 改 partyoffset 的 opcode 真做时,此常量改 mutable
 * gs.partyoffset 字段;M5.Sync.2 阶段固定 (160,112) 满足开场 cutscene 对齐。
 */
export const PARTYOFFSET_X = 160
export const PARTYOFFSET_Y = 112

/**
 * 队友 trail 记录项(P0.d:port sdlpal global.h rgTrail[5])。
 * 移动前 leader 的世界像素坐标 + 方向,供跟随者占位使用。
 */
export interface TrailEntry {
  x: number
  y: number
  dir: Facing
}

export type Mode = 'explore' | 'event' | 'battle' | 'menu'

/**
 * M5.6 W0.a:大世界菜单种类(对应 sdlpal uigame.c 各 PAL_*Menu 函数)。
 * 战斗内菜单(item-select / magic-select)仍走 battle-system 自有 uiState,不进 menuStack。
 */
export type ActiveMenuKind =
  | 'opening'         // M5.6 T17:启动后第一个菜单(新游戏/读档)— sdlpal uigame.c:42-167
  | 'in-game'        // ESC 弹出的主菜单 hub(物品/法术/状态/系统)
  | 'system'          // 进系统设置(存档/读档/设置/退出)
  | 'save-slot'       // 存档列表(5 slot)
  | 'inventory-action' // M5.6 T10b 修:sdlpal `uigame.c:878-919 PAL_InventoryMenu` 一级子菜单(装备/使用 2 项 box)
  | 'inventory'       // 物品 fullscreen list(use/equip filter,sdlpal `itemmenu.c PAL_ItemSelectMenu`)
  | 'equip'           // 装备
  | 'in-game-magic'   // 大世界法术(选角色 → 选法术 → 选目标)
  | 'player-status'   // 角色状态(stat + 装备)
  | 'shop-buy'        // 商店买
  | 'shop-sell'       // 商店卖

/** 当前 active menu — `state` 由具体 menu state machine fn 创建,unknown 让 dispatcher 转型。 */
export interface ActiveMenuEntry {
  kind: ActiveMenuKind
  state: unknown
}

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
  /**
   * trigger 脚本推进后的"续跑位置"(sdlpal `EventObject.wTriggerScript` 被 PAL_RunTriggerScript
   * 返回值改写的等价)。0x01 advance 收尾的 trigger 跑完后存"下一条",下次接触从这里跑(而非
   * triggerLabel 原点重播)。undefined = 用 triggerLabel(原点,可重触发的 0x00 plain 脚本)。
   * P2#5(2026-05-29):**ip 是全局下标**(_globalCommands)。生产只存 {ip},不再内嵌命令数组
   * (存档膨胀根因)。commands/labelMap 可选 override(单测用),生产/存档恒 undefined。
   */
  triggerResume?: { commands?: Command[]; labelMap?: Record<string, number>; ip: number }
  /** sdlpal `EventObject.wTriggerMode`(M3.5 T11 真消費):
   *  - 0       装饰 / 不触发
   *  - 1..3    Confirm-search(M2 用 Confirm 键触发)
   *  - 4..8    contact 明雷(走进自动触发,M3.5 简版统一 >= 4)
   *
   * 可选:M2 旧 fixture / 测试不带此字段时,scene-system 视作 0(不触发)。
   */
  triggerMode?: number
  /**
   * 当前状态(sdlpal `EventObject.sState`)。Sync.2 fix4:scene 加载时透传。
   *  -1 = Hidden(不渲染);0+ = 可见(0=Normal/1=Blocker/2=Message/3=Script/4+=Contact)
   * 缺省 0 = Normal(向后兼容)。
   */
  sState?: number
  /**
   * sdlpal `EventObject.sVanishTime`(M5.6 T7 真值补)。
   * 非 0 时 NPC 消失中:每 tick 递减(< 0 +1 / > 0 -1)直到 0,期间不参与 trigger。
   * 用于"NPC 短时间消失"opcode(剧情:角色暂时离开 / 物品被拾起短时不显示)。
   * undefined = 0(常态可见)。
   */
  sVanishTime?: number
  /**
   * sdlpal `EventObject.sLayer` —— 渲染 z 层(sort + cover tile 算法都用)。
   * scene.c:302 `y += sLayer * 8 + 9`(sort key)、scene.c:316 `iLayer = sLayer * 8 + 2`。
   * 装饰类 sprite(地板 / 桌椅等)常用非 0 sLayer 决定与人物的 z 关系。
   * undefined = 0(向后兼容旧 fixture)。
   */
  sLayer?: number
  /**
   * sdlpal `EventObject.nSpriteFrames` —— 单方向走路帧数(scene.c:262-280 渲染真值)。
   * spriteIdx = wDirection * nSpriteFrames + wCurrentFrameNum;**nSpriteFrames==0 时方向被忽略**
   * (idx = frame,非方向性 sprite,eg. 躺地醉汉 / 装饰物)。必须用 dump 真值,不能靠 frames.length
   * 推断 —— 否则非方向 sprite 被当成方向性,转向时帧错(2026-05-28 酒剑仙对话"站起来"的根因)。
   * undefined = 渲染层回退 frames.length 推断(旧 fixture 兼容)。
   */
  nSpriteFrames?: number
  /**
   * NPC 朝向(sdlpal `EventObject.wDirection`)。
   * Sync.2 fix3:opcode 0x0016 setEventObjectDirAndFrame 写入(operand[1])。
   * undefined = 渲染层用 spriteNum 默认帧。
   */
  facing?: Facing
  /**
   * NPC 姿势帧(sdlpal `EventObject.wCurrentFrameNum`)。
   * Sync.2 fix3 pose:opcode 0x0014 setEventObjectGesture(operand[0])
   *                 / 0x0016 setEventObjectDirAndFrame(operand[2])
   *                 / 0x000F walkOneStepWithFrame(operand[1] != 0xFFFF) 写入。
   * **优先级:** 若 scriptedFrame 非 undefined,渲染层直接用此帧(覆盖 stepFrame 公式)。
   * 用于剧情期间 NPC 摆姿势(挥手 / 点头 / 鞠躬 等)。
   */
  scriptedFrame?: number
  /**
   * port sdlpal `EventObject.wAutoScript` + `PAL_RunAutoScript`(script.c:3482-3651)。
   *
   * sdlpal `PAL_GameUpdate` 内对每个 `sState != 0 && wAutoScript != 0` 的 NPC 调
   * `PAL_RunAutoScript(wAutoScript, id)`,返回新 wAutoScript ip — **不阻塞** trigger script。
   *
   * 我们 port:对 sState != 0 && autoCursor 设置的 NPC 每 tick 跑 1 op。autoLabel(scene
   * dump 字段)在 npcFromEventObject 时按 labelMap 解 ip 写入 autoCursor。
   *
   * undefined = NPC 无 autoScript(wAutoScript=0)。
   */
  autoCursor?: {
    /** scene 全局 ip(等同 sdlpal `wAutoScript`)。每跑一 op 由 autoScript handler 改写。 */
    ip: number
    /** sdlpal `wScriptIdleFrameCountAuto`:opcode 0x09 wait N frames 用,累计 N 后推 ip。 */
    idleFrameCount?: number
    /**
     * autoScript 脚本体的 commands / labelMap。与 EventCursor 同构 —— 让 trigger / autoScript
     * 共用同一套解释器(applyRawOpcode 的 jump/call/条件跳转等"动游标"opcode 操作传入的 cursor,
     * 不再写死 gs.eventCursor)。undefined = 默认当前 scene(runOneAutoOp 起手填 gs.sceneCommands/
     * sceneLabelMap);被 2+ scene 共引提升到 shared 的 autoScript(eg. 苗人头领 L_406)填 shared。
     */
    commands?: Command[]
    labelMap?: Record<string, number>
    /**
     * opcode 0x04 call-script 子脚本返回栈(autoScript 内也调子脚本,eg. 苗人进门前 `0x4 [3739]`
     * 开门)。与 EventCursor.callStack 同构,'end' 时栈非空 → 弹帧回 caller(ip/commands/labelMap/对象)。
     */
    callStack?: {
      /** P2#5:returnIp 全局下标;returnCommands/returnLabelMap 可选 override(默认全局数组)。 */
      returnIp: number
      returnCommands?: Command[]
      returnLabelMap?: Record<string, number>
      savedEventObjectId?: number
    }[]
    /**
     * 当前作用对象 id(sdlpal `wCurEventObjectID`)。默认 = autoScript owner(npc.id);
     * 0x04 call-script 的 op1 可覆盖(eg. 开门脚本对门对象生效)。子脚本返回时还原。
     */
    currentEventObjectId?: number
  }
  /**
   * autoScript 入口 label(`L_<global ip>`)。全局 event object 数组里保留它,供进 scene 切片时
   * 按**当前 scene labelMap** 延迟解析 autoCursor(每 scene labelMap 不同,不能全局预解析)。
   * autoCursor 一旦解析/推进过就不再重解(保留 autoscript 进度,sdlpal wScriptOnAutoTrigger 持久)。
   */
  autoLabel?: string
}

export interface EventCursor {
  /**
   * P2#5(2026-05-29 单一全局脚本数组):**ip 是全局下标**(events/all.json 的 `_globalCommands` 索引,
   * = sdlpal 单一 `lprgScriptEntry` 偏移)。生产代码建 cursor 只填 `{ip}`,解释器经 getCmds/getLabels
   * 默认读 `_globalCommands`/`_globalLabelMap`(单一来源 → 存档只存数字,不再内嵌 5.5MB 命令数组)。
   * commands/labelMap 为**可选 override**(仅单测传自带数组用;生产/存档恒 undefined)。
   */
  commands?: Command[]
  labelMap?: Record<string, number>
  ip: number
  /**
   * EventSystem 暂停等待原因。undefined = 非 waiting 状态。
   *  - 'dialog':      等对话(typing / page-key / end-key,由 dialog-box 状态机管)
   *  - 'frame-wait':  opcode 0x0009 wait N frames(sdlpal script.c:3593-3604)
   *  - 'fade-screen': opcode 0x0073 fade-in 完(Sync.2 fix9,由 gs.fadeState 管)
   *  - 'scene-load': opcode 0x0059 loadScene 异步切场景(bootstrap callback fetch + setSceneContext +
   *                  写 gs.eventCursor 到新 scene 的 onEnterLabel ip,释放 waiting,下一帧 tick 接管)
   *  - 'delay':      opcode 0x0085 UTIL_Delay(op0*80ms)实时阻塞延迟(script.c:2511-2516);
   *                  time-based(delayUntilMs),期间 autoScript 暂停(sdlpal 不调 PAL_GameUpdate)
   *  - 'shop':       opcode 0x0026 PAL_BuyMenu / 0x0027 PAL_SellMenu(script.c:1157-1172)— 脚本
   *                  开商店菜单(mode='menu')后阻塞;菜单关闭(menu-mode resume)→ mode='event' 续跑。
   *  - 'palette-fade': 特效 A 调色板 ramp fade(0x50/0x51/0x80(!update)/0x8C/0x4F)。由 gs.paletteFadeState
   *                  管,time-based(同 'fade-screen' 解析)。**冻全场**(autoScript 不跑,sdlpal UTIL_Delay 不调
   *                  PAL_GameUpdate)。淡完 → finalizePaletteFade + ip++ + 清。
   *  - 'scene-fade': 0x93 SceneFade / 0x80(fUpdateScene)—— sdlpal 淡入时 PAL_GameUpdate 继续跑(NPC/动画
   *                  不冻)。同 paletteFadeState 管,但 mode.ts 放行 autoScript(同 'frame-wait')。
   *  - 'rng-play':   0x37 PlayRNG(script.c:1544)— 脚本播 RNG.MKF 动画(modal,suspendRaf)。仿 'shop':
   *                  opcode 调 _rngPlayHandler(注入)开播 + waiting + ip++;播完(bootstrap finally)清 waiting 续跑。
   *  - 'show-fbp':   0x76 ShowFBP(script.c:2199)— 全屏 FBP 图(modal,suspendRaf,可选 dither fade-in)。同 rng-play。
   *  - 'scroll-fbp': 0xA4 ScrollFBP(script.c:3038)— FBP 滚动卷入(modal,suspendRaf,220 步)。同 show-fbp。
   *  - 'ending-anim':0x96 EndingAnimation(script.c:2693)— 结局 400 帧 cutscene(modal,suspendRaf)。同 show-fbp。
   *  - 'wait-key':   0x4D wait-for-any-key(script.c:1753 `PAL_WaitForKey(0)` = PAL_WaitForKeyInternal(0,FALSE),
   *                  play.c:602-638)— **永久等**,只认 kKeySearch|kKeyMenu(Confirm/Menu/Cancel)。期间冻全场
   *                  (mode.ts allowlist 不含 → autoScript 不跑)。按键 → 清 waiting + ip++。
   *  - 'quit':       0xA0 quit(script.c:2988-2996)— WIN95 播结局 mp4(4/5/6)/ DOS 即时 → 回标题(modal,
   *                  _quitHandler 注入)。回标题(mode='menu' + OpeningMenu)后本 cursor 弃用;期间 block 不步进。
   *  - 'confirm':    0x0A goto-if-no(script.c:3373-3387 / uigame.c:342-365 PAL_ConfirmMenu)— 阻塞 否/是
   *                  确认框(否=WORD 19/是=WORD 20,默认 否 nDefault=0)。期间冻全场(mode.ts allowlist 不含
   *                  → autoScript 不跑)。Up/Down/Left/Right 切换(confirmYes);Confirm 提交:是→ip++,
   *                  否→goto operand[0];Cancel/Menu(= sdlpal MENUITEM_VALUE_CANCELLED → FALSE)等价否→goto。
   */
  waiting?: 'dialog' | 'frame-wait' | 'fade-screen' | 'scene-load' | 'delay' | 'shop' | 'palette-fade' | 'scene-fade' | 'rng-play' | 'show-fbp' | 'scroll-fbp' | 'ending-anim' | 'wait-key' | 'quit' | 'confirm' | 'camera-pan'
  /** 'confirm' 用(opcode 0x0A):当前 否/是 选择。sdlpal 默认 否(false);Up/Down/Left/Right 切换。 */
  confirmYes?: boolean
  /** 'frame-wait' 用:剩余帧数,每 tick 自减,归 0 时 ip++ + clear waiting。 */
  waitFramesRemaining?: number
  /** 0x03 goto frameDelay 计数(sdlpal pEvtObj->nScriptIdleFrame,trigger 路径 PAL_InterpretInstruction
   * script.c:3243-3255):++scriptIdleFrame < frameDelay → 跳(loop);>= → reset 0 + ip++(退出 cutscene 走步循环)。
   * 配 loop 内 0x09 逐 tick yield → 每 tick 走一步,frameDelay 帧后退出。 */
  scriptIdleFrame?: number
  /** 'camera-pan' 用(opcode 0x7F 多帧 viewport 平移):剩余帧数 + 每帧 (dx,dy) px(SHORT)。
   * sdlpal script.c:2331-2377 逐帧 `viewport += (op0,op1)` do-while op2 次。每 tick 移 camera + 自减,
   * 归 0 时 ip++ + clear。pan cutscene(180 站点)逐帧平移摄像机。 */
  cameraPanFramesRemaining?: number
  cameraPanDx?: number
  cameraPanDy?: number
  /** 'delay' 用(opcode 0x85):延迟到此 wall-clock 时间戳(performance.now()),到点 ip++ + clear。 */
  delayUntilMs?: number
  /**
   * 0x4E load-last-save 用:fade-out(waiting='palette-fade')完成后要重载的存档槽。
   * sdlpal script.c:1760-1766 `PAL_FadeOut(1); PAL_ReloadInNextTick(slot); return 0;` —— 先淡黑,
   * 淡完(palette-fade 完成分支)再 fire _loadLastSaveHandler(slot) + 清 cursor(对齐 return 0 停脚本)。
   */
  reloadSlotAfterFade?: number
  /**
   * 当前执行 trigger 的 event object id(sdlpal `wEventObjectID` / `pCurrent`)。
   * setObjectPosition / walkOneStep 等 opcode 默认 operate on this 当 operand[0]==0 时。
   * tickSceneSystem 触发 NPC trigger 时设;此后所有 opcode 内 self = npcs[id-1]。
   */
  currentEventObjectId?: number
  /**
   * 本 cursor 是某 NPC 的 trigger 脚本时设(= 该 NPC id)。'end' 时据此持久化触发脚本推进:
   * sdlpal play.c `pEvtObj->wTriggerScript = PAL_RunTriggerScript(...)` —— 0x01 advance → 下一条,
   * 0x02 reset → resetTo,0x00 plain → 原地(可重触发)。否则 0x01 收尾的 cutscene 会每次接触重播
   * (2026-05-28 客栈李大娘苗人演出重播的根因)。onEnter / item / magic 脚本不设此(不持久化 NPC trigger)。
   */
  triggerOwnerId?: number
  /**
   * opcode 0x04 call-script(script.c:3258)调用栈。sdlpal `PAL_RunTriggerScript(子脚本)`
   * 同步跑完再回原处 wScriptEntry++。ts tick 模型用栈:0x04 压返回帧 + 跳子脚本;子脚本
   * 'end' 弹帧返回(恢复 ip/commands/labelMap/currentEventObjectId),而非清 cursor。
   * 支持子脚本在 shared(跨 scene 复用):保存 caller 的 commands/labelMap。
   */
  callStack?: {
    /** P2#5:returnIp 是全局下标;returnCommands/returnLabelMap 可选 override(默认全局数组)。 */
    returnIp: number
    returnCommands?: Command[]
    returnLabelMap?: Record<string, number>
    savedEventObjectId?: number
  }[]
  /**
   * 本 cursor 是某 scene 的 onEnter 脚本时设(= wNumScene)。sdlpal play.c:64 真值:
   * `rgScene[i].wScriptOnEnter = PAL_RunTriggerScript(rgScene[i].wScriptOnEnter, ...)` —
   * onEnter 跑完把"停在哪/下一条 entry"存回 scene.wScriptOnEnter。'end' handler 据此
   * 持久化到 gs.sceneOnEnterIp[sceneId],实现"开场 cutscene 只播一次,重进不重播"。
   * undefined = 非 onEnter 脚本(NPC trigger / item script 等),不持久化。
   */
  onEnterSceneId?: number
  /** onEnter 本次运行的起始 ip(0x0000 end 真值返回起始 entry,replay-in-place;见 onEnterSceneId)。 */
  onEnterStartIp?: number
}

/**
 * DialogBox 状态机 phase(port sdlpal text.c:1616 PAL_ShowDialogText):
 *  - 'typing': 当前行 typing 中(charsRevealed < currentLineText.length)
 *  - 'line-done': 当前行 typing 完;cursor 可推进到下一 opcode(自动,无需 Confirm)
 *  - 'waiting-page-key': shownLines==4 且下条 showDialog 来到 → 等 Confirm 清屏 + 重置 line=0
 *  - 'waiting-end-key': dialog 整段结束(如撞 end opcode)→ 等 Confirm 关 dialog
 */
export type DialogPhase = 'typing' | 'line-done' | 'waiting-page-key' | 'waiting-end-key'

export interface DialogBoxState {
  /**
   * 当前 dialog 的"姓名 title"(以 `:` / `：` / `∶` 结尾的 showDialog 文本)。
   * sdlpal text.c:1717-1727 真值:姓名画在独立 `posDialogTitle` 位置,**不计入** dialog
   * line(nCurrentDialogLine 不加),后续 RestoreScreen 把 backup buffer restore 时 title
   * 区像素仍保留,所以同 cutscene 段 dialog 翻页后"李逍遥:" 仍显示。
   *
   * undefined = 当前 dialog 段无姓名(setDialogStyleX 重置 + 没遇过 `:` 结尾)
   */
  titleText?: string
  /**
   * 已 typing 完整显示的"过往行"(累计 0-4)。
   * 第 4 行画完后下条 showDialog 触发 waiting-page-key,Confirm 后清空。
   */
  shownLines: string[]
  /**
   * 与 shownLines 等长:每行的逐字符调色板色(parseDialogText 解析,sdlpal TEXT_DisplayText 控制符
   * `-`青/`'`红/`@`红alt/`"`黄 toggle)。colors[lineIdx][charIdx] = 该字符色。
   */
  shownLineColors?: number[][]
  /** 当前正在 typing 的那行文本(若 phase='typing'/'line-done')。 */
  currentLineText: string | null
  /** 与 currentLineText 等长:当前行逐字符色(parseDialogText)。 */
  currentLineColors?: number[]
  /**
   * 当前行每字符出现时刻(ms,parseDialogText.revealAt)。时间驱动打字:charsRevealed =
   * typingFrames*FRAME_MS_EXPLORE 内 revealAt[i]<=elapsed 的字数(sdlpal iDelayTime*8/字 + `$NN` 变速)。
   */
  currentLineRevealAt?: number[]
  /** 当前行完全打完时刻(ms,含 `~NN` 尾暂停);elapsed>=doneAt → phase='line-done'。 */
  currentLineDoneAt?: number
  /** 跨行持续的 iDelayTime 状态(sdlpal g_TextLib.iDelayTime;`$NN` 改,段内续行继承,startDialogLine 重置默认 3)。 */
  iDelayState?: number
  /**
   * 跨行持续的 bCurrentFontColor 状态(sdlpal g_TextLib.bCurrentFontColor)。toggle 控制符的色态
   * 在同一 dialog 段内跨 showDialog 行持续 —— 下一行 parseDialogText 的起始色。
   * PAL_StartDialog(bFontColor)/ PAL_EndDialog 重置;startDialogLine 用 dialog 起始色初始化。
   */
  fontColorState?: number
  /** `(`/`)` 控制符设的等键图标(sdlpal bIcon:1=`)`,2=`(`);0/undefined = 默认箭头。 */
  iconKind?: number
  /** 当前行已经过的 frame 数。 */
  typingFrames: number
  /** 当前行已显字符数 = min(floor(typingFrames / FRAMES_PER_CHAR), currentLineText.length)。 */
  charsRevealed: number
  /**
   * port sdlpal `g_TextLib.nCurrentDialogLine`(text.c)。当前页已显示的**正文**行数,决定段末/清屏/end
   * 是否等键画箭头:
   *  - 正文行显示后 +1(text.c:1746);姓名 title 行**不**计入(text.c:1715-1726 走独立绘制不 ++)
   *  - 以 `~` 收尾的行复位 0(text.c:1552 置 -1 → ++ 后 0)
   *  - 翻页 / PAL_ClearDialog 后归 0(text.c:1655/1775)
   * sdlpal text.c:1770 `if (nCurrentDialogLine > 0 && fWaitForKey) PAL_DialogWaitForKey()` —— 仅
   * `dialogLineCount > 0` 才在清屏/段末阻塞等键 + 画黄色箭头。`~` 收尾句 count==0 → 不等键、不画箭头、
   * 自动推进(开场梦境三句的原版真值)。
   *
   * 注:翻页判定 shouldWaitPageKey 仍按可见行数(shownLines)算 —— `~` 几乎总紧跟清屏 opcode,
   * 翻页边界不受 `~` 复位影响,沿用旧逻辑避免回归。
   */
  dialogLineCount: number
  /** 状态机 phase(详见 DialogPhase 注释)。 */
  phase: DialogPhase
  /** 对话框位置样式 */
  style: DialogBoxStyle
  /** RGM.MKF chunk 编号(角色头像);undefined = 无头像 */
  portraitIcon?: number
  /** 字体前景色(palette 下标;默认 255 白) */
  fontColor: number
  /** 字阴影(iDialogShadow > 0 时 true) */
  shadow: boolean
  /** 等键时右下角 icon 的闪烁状态(偶数 blink-period = true) */
  keyIconBlink: boolean
  /**
   * L1 紫金葫芦炼丹物品框(style='item-box',sdlpal script.c:1480-1512 / SPRITENUM_ITEMBOX)。
   * 非 undefined 时 present 画屏幕居中 ITEMBOX 精灵 + 物品 BALL 图标 + 2 行居中文字。
   * present 用 itemId 经 ctx.items 查 bitmap → ctx.itemIcons 取图标;line1="炼出"=getWord(42)、
   * line2=物品名=getWord(itemId)。复用 narration 1.4s 自动关 / 任意键提前关时序。
   */
  itemBox?: { itemId: number; line1: string; line2: string }
  /**
   * 暂存的 setDialogStyleX 切换(sdlpal script.c:3389-3426 真值:每 setDialogStyleX
   * 入口先 PAL_ClearDialog(TRUE) 阻塞等键)。
   *
   * 当 setDialogStyleX 在已有 dialog 上触发时,setWaitingPageKey 切 phase,
   * 同时把"新 style + portrait + fontColor"暂存进 pendingStyle。Confirm 翻页时
   * caller 应用 pending → gs.currentDialogStyle / currentDialogPortraitIcon / currentDialogFontColor。
   *
   * undefined = 累计 4 行触发的页翻(同 style),非 setDialogStyleX 触发。
   */
  pendingStyle?: {
    style: DialogBoxStyle
    portraitIcon?: number
    fontColor: number
  }
  /**
   * Sync.2 fix8:opcode 0x05 ClearDialog 或 setDialogStyleX 触发的 waiting-page-key,
   * Confirm 翻页后必须**完全清掉 dialogBox**(不只清 shownLines/currentLineText),
   * 否则 portrait 在下条 NPC 动画 opcode 期间残留,遮挡剧情动画。
   *
   * true  = 翻页后 caller 设 gs.dialogBox = undefined(对应 sdlpal PAL_ClearDialog(TRUE))
   * undefined = 累计 4 行翻页(append 模式,保留 box 让下条 showDialog 续行)
   */
  pendingFullClear?: boolean
  /**
   * Sync.2 fix11:sdlpal script.c:3468-3471 default case 真值 — 任何非 dialog 跑指令前
   * 都先 `PAL_ClearDialog(TRUE)`。我们在 opcode dispatch 前检测有 line-done dialog 时
   * 触发等键阻塞;`true` 时 page-advance 后 **caller 不应 ip++**(opcode 本身还没跑)。
   *
   * true  = 由 dispatch 前 auto-ClearDialog 触发(opcode 尚未消费,ip 留原位)
   * undefined = 由 opcode 0x05 / setDialogStyleX 触发(opcode 已消费,ip++ 继续)
   */
  pendingPreOpClear?: boolean
  /**
   * Sync.2 fix18:opcode 0x8E RestoreScreen 真值 — sdlpal `VIDEO_RestoreScreen` restore
   * backup buffer(含 title + portrait + body=空)→ 视觉 title/portrait 持久,body 空。
   *
   * true  = 0x8E 触发的 ClearDialog,page-advance 保 titleText + portraitIcon,只清 body
   * undefined = 普通 0x05 / auto pre-op clear → fullClear 清整 dialogBox
   */
  pendingPartialClear?: boolean
}

// ── M5 Sync.1: SAVEDGAME_WIN 倒推 typed ─────────────────────────────────────

/**
 * sdlpal global.h `EXPERIENCE` struct(tagEXPERIENCE):{ wExp, wReserved, wLevel, wCount }。
 * wExp 当前累积值,wLevel 当前等级,**wCount = 本场战斗动作累积计数**(隐藏属性经验子系统 E04 核心:
 * 战前清零、战中按动作累积、战后 CHECK_HIDDEN_EXP 按占比转隐藏经验涨属性,battle.c:1226-1293)。
 * wReserved(恒 0)不建模。
 */
export interface ExpEntry {
  wExp: number     // 当前累积经验
  wLevel: number   // 等级
  wCount?: number  // 本场战斗累积计数(E04 隐藏属性经验;缺省 0,旧档反序列化 ?? 0)
}

/**
 * sdlpal global.h `ALLEXPERIENCE`(tagALLEXPERIENCE)。
 * 8 类经验 × MAX_PLAYER_ROLES(6)角色。
 * 用数组 index 对应 roleId(同 rgwHP 等 PLAYERS 数组惯例)。
 */
export interface AllExperience {
  rgPrimaryExp: ExpEntry[]      // 主经验
  rgHealthExp: ExpEntry[]       // HP 经验
  rgMagicExp: ExpEntry[]        // MP 经验
  rgAttackExp: ExpEntry[]       // 攻击经验
  rgMagicPowerExp: ExpEntry[]   // 法力经验
  rgDefenseExp: ExpEntry[]      // 防御经验
  rgDexterityExp: ExpEntry[]    // 速度经验
  rgFleeExp: ExpEntry[]         // 逃跑经验
}

/**
 * sdlpal global.h `PLAYERROLES` 中运行时可变部分(mutable fields)。
 *
 * 静态基础值(avatar / spriteNum / name / attackAll / walkFrames / sounds 等)
 * 保留在 player-roles.json,运行时只存会被升级 / 装备改变的字段。
 *
 * 数组长度 = MAX_PLAYER_ROLES (6),index = roleId。
 */
export interface PlayerRolesRuntime {
  rgwName: number[]               // 角色名 WORD 下标(sdlpal rgwName;opcode 0x79 按 name 判队伍用)
  rgwLevel: number[]              // 等级
  rgwMaxHP: number[]              // 最大 HP
  rgwMaxMP: number[]              // 最大 MP
  rgwHP: number[]                 // 当前 HP
  rgwMP: number[]                 // 当前 MP
  rgwEquipment: number[][]        // [slotIdx][roleId] 装备 item id;MAX_PLAYER_EQUIPMENTS(6) × MAX_PLAYER_ROLES(6)
  rgwAttackStrength: number[]     // 当前攻击力(含装备加成后)
  rgwMagicStrength: number[]      // 当前法力攻击力
  rgwDefense: number[]            // 当前防御
  rgwDexterity: number[]          // 当前速度
  rgwFleeRate: number[]           // 逃跑率
  rgwPoisonResistance: number[]   // 毒抗性
  rgwElementalResistance: number[][] // [elemIdx][roleId] 元素抗性;NUM_MAGIC_ELEMENTAL(5) × MAX_PLAYER_ROLES(6)
  rgwCoveredBy: number[]          // HP 危险时谁会护着我
  rgwMagic: number[][]            // [magicSlot][roleId] 已学魔法;MAX_PLAYER_MAGICS(32) × MAX_PLAYER_ROLES(6)
  rgwCooperativeMagic: number[]   // 合体魔法编号
}

/**
 * sdlpal global.h `POISONSTATUS`(tagPOISONSTATUS)。
 * rgPoisonStatus[poisonSlot][playerIdx]:sparse 存,用 Record 减少空间。
 */
export interface PoisonStatus {
  wPoisonID: number      // 0 = 无毒,非 0 = poison item id
  wPoisonScript: number  // 每回合执行的 script offset
}

/**
 * sdlpal global.h:521 `rgEquipmentEffect[MAX_PLAYER_EQUIPMENTS + 1]` 真值 —
 * 7 个 PLAYERROLES SoA,index = bodypart(0..5 真实槽 + 6 reserved)。
 *
 * scriptOnEquip 跑 opcode 0x17 时写入(script.c:752-766 真值 HACK):
 *   i = operand[0] - 0xB; p = (WORD*)&rgEquipmentEffect[i];
 *   p[operand[1] * MAX_PLAYER_ROLES + role] = SHORT(operand[2])
 * → 解析:把 `rgEquipmentEffect[i]` 当 byte 数组 cast 成 WORD*,
 *   operand[1] = sdlpal global.h tagPLAYERROLES 内 row index(0=Avatar..70+ 各字段)。
 *
 * 装备 effect 永远只写 stat 类字段(AttackStrength 等),所以 ts 只保留 stat 行
 * 节省内存;非 stat row(eg avatar/name)的 0x17 写入 → log skip。
 *
 * effective stat = base PlayerRolesRuntime.rgwXxx[role]
 *                + Σ rgEquipmentEffect[i].rgwXxx[role]  // i = 0..6
 *
 * 见 [equip-effect.ts](./equip-effect.ts) 6 个 getter(`getPlayerAttackStrength` 等)。
 */
export interface EquipmentEffectRoles {
  rgwSpriteNumInBattle: number[]  // sdlpal global.h:302 row 1(装备换战斗精灵;长鞭 0x1A[1,6,0])
  rgwAttackAll: number[]          // row 4(装备授群攻;长鞭 0x1A[4,1,0]→PAL_PlayerCanAttackAll)
  rgwLevel: number[]              // sdlpal global.h:307 row 6
  rgwMaxHP: number[]              // row 7
  rgwMaxMP: number[]              // row 8
  rgwHP: number[]                 // row 9
  rgwMP: number[]                 // row 10
  rgwAttackStrength: number[]     // row 17
  rgwMagicStrength: number[]      // row 18
  rgwDefense: number[]            // row 19
  rgwDexterity: number[]          // row 20
  rgwFleeRate: number[]           // row 21
  rgwPoisonResistance: number[]   // row 22
  rgwElementalResistance: number[][] // row 23-27 (5 elem × 6 roles)
  rgwCoveredBy: number[]          // row 31
  rgwCooperativeMagic: number[]   // row 65(装备改合击;圣灵珠 0x1A[65,351,0]→PAL_GetPlayerCooperativeMagic)
}

/**
 * sdlpal global.h `EVENTOBJECT`(tagEVENTOBJECT)运行时可变字段。
 *
 * chest 已开 / 机关已触发 / NPC 状态 全住这(rgEventObject sparse record)。
 * 稀疏存:只存被 script 改过的 event object。
 */
export interface EventObjectStateMutable {
  sState: number          // sdlpal global.h:77 kObjStateHidden=0 / Normal=1 / Blocker=2 / Message=3 ...(负数也算 hidden)
  x: number               // 像素坐标(可被 script 移动)
  y: number
  sLayer: number          // layer value
  wTriggerScript: number
  wAutoScript: number
  wTriggerMode: number
  wSpriteNum: number
  nSpriteFrames: number
  wDirection: number
  wCurrentFrameNum: number
  nScriptIdleFrame: number
  wSpritePtrOffset: number
  nSpriteFramesAuto: number
  wScriptIdleFrameCountAuto: number
  sVanishTime: number
}

/**
 * sdlpal global.h `SCENE`(tagSCENE)运行时可变部分。
 * 稀疏存:只存 wScriptOnEnter 被 script 改过的 scene。
 */
export interface SceneStateMutable {
  wMapNum: number
  wScriptOnEnter: number       // 可被 script 改写
  wScriptOnTeleport: number
  wEventObjectIndex: number
}

/**
 * sdlpal global.h `OBJECT`(tagOBJECT union)运行时可变部分。
 * 统一用 rgwData[7] 存(7 个 WORD),避免 union 歧义。
 * 稀疏存:只存被 script 改写过的 object。
 */
export interface ObjectStateMutable {
  rgwData: number[]  // 7 个 WORD,按 OBJECT union 的 C 布局存
}

// ── GameState ────────────────────────────────────────────────────────────────

export interface GameState {
  /** 队长像素坐标(M5 P0.0:sdlpal scene.c:807 xOffset=±16 / yOffset=±8 等价)。 */
  party: { x: number; y: number; facing: Facing }
  /**
   * 队长当前 sprite id(sdlpal `PlayerRoles.rgwSpriteNum[0]` runtime 镜像)。
   * Sync.2 fix4:opcode 0x0065 setPlayerSprite 写入,覆盖 bootstrap hardcoded sprite #2,
   * 用于剧情切换主角 pose sprite group(捂头 / 倒地 / 大侠 等)。
   * undefined = 用 bootstrap 默认(player-roles.json roles[0].spriteNum)。
   */
  partyLeaderSpriteId?: number
  /**
   * 主角 / 队员的姿势帧覆盖(sdlpal `rgParty[i].wFrame` 等价)。
   * Sync.2 fix3 pose:opcode 0x0015 setPartyDirectionAndFrame
   *   wFrame = wPartyDirection * 3 + operand[1],队员 index = operand[2]
   * **优先级:** 若 partyScriptedFrame[memberIdx] 非 undefined,渲染层覆盖 stepFrame 公式。
   * 用于剧情期间主角 / 队员摆姿势(点头 / 摆手 / 鞠躬 等)。
   * M5 简版:用 Record(sparse)而非数组,避免初始化空槽。
   */
  partyScriptedFrame: Record<number, number>
  /** 相机像素坐标;SceneSystem 每 tick 跟随 party,带地图边界 clamp。 */
  camera: { x: number; y: number }
  npcs: NpcState[]
  /** 队伍成员 role id 列表(T14 占位,M3 dev fixture 决定默认填充)。 */
  partyMembers: number[]
  /** 持有物品(T21 item action 用),数量为 0 不剔除由 add/sub 命令决定。 */
  inventory: InventoryEntry[]
  mode: Mode
  /**
   * M5.6 W0.a:active menu 栈。push 子菜单时 append,关菜单时 pop;
   * 空 = 无菜单(若当前 mode='menu' 则 tickMenu 自动切回 'explore')。
   * sdlpal uigame.c 各 PAL_*Menu 是 modal blocking 函数,栈隐式在 C call stack;
   * ts 端把它显式化为数据 — 顶层是当前焦点,渲染层从底到顶画。
   */
  menuStack: ActiveMenuEntry[]
  /**
   * scene-level event commands + labelMap(autoScript runner 用)。
   *
   * `eventCursor` 是 trigger script 临时 cursor(event mode 进入时设,退出清);
   * `sceneCommands`/`sceneLabelMap` 是 scene 持有 events 文件全文 — autoScript 在 explore
   * mode 也要跑(sdlpal `PAL_GameUpdate` 不分 mode 都调),所以读这里。
   *
   * 由 bootstrap / sceneLoader 在 scene 加载完成后写入。
   */
  sceneCommands?: Command[]
  sceneLabelMap?: Record<string, number>
  eventCursor?: EventCursor
  dialogBox?: DialogBoxState
  /**
   * 上下同屏共存的**另一位置**对话框(对照 sdlpal:PAL_StartDialog 切位置不擦旧框,upper/lower
   * 两框同屏到 PAL_EndDialog)。dialogBox 是当前活动框(正在打字/等键);dialogBoxKept 是**反位置**的
   * 已显满冻结框(渲染在活动框之下)。top↔bottom 切换时把旧框移入此槽,新框成 dialogBox;对话整段
   * 结束时一并清。单槽即可 —— 任一时刻只有 top + bottom 各一个,kept 永远是非活动的那个位置。
   * 战斗对话(tickBattleDialog)管理;present-battle 渲染。大世界 cutscene 暂未接(event-system
   * dialog 逻辑复杂,留后续)。
   */
  dialogBoxKept?: DialogBoxState
  /** 由 setDialogStyle* 命令累积。默认 'center'。 */
  currentDialogStyle: DialogBoxStyle
  /**
   * 当前对话头像 RGM.MKF chunk(由 setDialogStyleTop/Bottom 的 operand[0] = iNumCharFace 累积)。
   * undefined = 无头像;showDialog 时透传给 startDialogLine / appendDialogLine。
   * sdlpal script.c:3389-3426 真值。
   */
  currentDialogPortraitIcon?: number
  /**
   * 当前对话字体色(由 setDialogStyleX 的 operand[1] (Upper/Lower) 或 operand[0] (Center/CenterWindow))。
   * sdlpal text.c:29 #define FONT_COLOR_DEFAULT 0x4F。默认 0x4F = 79(palette idx 亮黄)。
   */
  currentDialogFontColor: number
  /** 战斗状态;T16 给真类型(BattleState),T14 已用 unknown 占位避免污染 explore/event。 */
  battleState?: BattleState
  frameNum: number
  /**
   * 走动动画状态(P0.c:port sdlpal scene.c:636 PAL_UpdatePartyGestures)。
   *
   * `stepFrame`: 0-3 循环计数(s_iThisStepFrame),走一步 +1 mod 4。
   * `walking`: 本 tick 是否成功走路(走时 true,撞墙 / idle 时 false)。
   * present.ts 按 walking / stepFrame 选 party leader frame(走动帧 vs 站立帧)。
   */
  walkingFrame: { stepFrame: number; walking: boolean }
  /**
   * 队友 trail(P0.d:port sdlpal scene.c:823-830 PAL_UpdateParty rgTrail[5] shift)。
   * 每次 leader 成功移动时,将移动前的 leader pos 插入头部,截至长度 5。
   * 跟随者(partyMembers[1..])根据 trail 位置 + 偏移确定自身位置。
   */
  trail: TrailEntry[]
  /** 当前调色板;M4 P3.T2 setPalette opcode handler 写入,渲染层 flushToCanvas 消费。
   *  初始值 undefined — bootstrap 初始化后由 GameState 持有最新 palette,
   *  flushToCanvas 优先用 gs.palette(若非 undefined),否则 fallback 到 bootstrap 初始 palette。
   */
  palette?: Palette

  /**
   * 特效 A(2026-05-29):**稳定**的场景调色板(= sdlpal `PAL_GetPalette(wNumPalette, fNight)` 等价)。
   * fade 引擎**不动它**:`gs.palette` 是可变工作副本(每帧被 ramp),`basePalette` 是 fade 的 target /
   * snapshot 参照(FadeIn 终点、ColorFade 场景端、FadeToRed 基色)。
   * 写入点:bootstrap 初始 palette、loadScene(场景调色板)、0x8B setPalette(fetch 回的新调色板)。
   * **pristine 不可变**:始终与 `gs.palette` 是不同对象(后者可被 fade mutate),不被 fade 改写。
   * undefined = 未初始化(bootstrap 后恒有值);fade handler 兜底回退 gs.palette / 全黑。
   */
  basePalette?: Palette

  /**
   * 特效 A(2026-05-29):调色板 ramp 淡入淡出状态(palette.c FadeOut/FadeIn/SceneFade/PaletteFade/
   * ColorFade/FadeToRed)。与 dither `fadeState` 正交 —— 本字段 ramp `gs.palette.colors`(色表),
   * `fadeState` blend `fb.indices`(像素)。opcode 0x50/0x51/0x93/0x80/0x8C/0x4F 创建;present.ts
   * `stepPaletteFade` 每帧应用;event-system waiting='palette-fade'/'scene-fade' 等淡完 → finalize + 清。
   * 见 [palette-fade.ts](./palette-fade.ts)。undefined = 无 palette fade。
   */
  paletteFadeState?: PaletteFadeState

  /**
   * 特效 A(2026-05-29):sdlpal `gpGlobals->fNeedToFadeIn`。0x50 FadeOut → TRUE(屏幕淡黑,
   * 待 0x51 FadeIn 淡回);0x51 FadeIn / 0x8C ColorFade → FALSE;0x93 SceneFade = (step<0)。
   * 消费点:0x8B setPalette —— sdlpal script.c:2576 `if (!fNeedToFadeIn) PAL_SetPalette(...)`(屏幕
   * 在黑时不立即套新色,只更新 basePalette 供 FadeIn 用)。默认 falsy。
   */
  needToFadeIn?: boolean

  /**
   * 特效 A(2026-05-29):当前调色板索引(sdlpal `gpGlobals->wNumPalette`)。0x8B setPalette 写入;
   * 0x51 FadeIn / 0x93 SceneFade / 0x80 PaletteFade 据此选淡入目标调色板。默认 0。
   */
  numPalette: number
  /**
   * 特效 A(2026-05-29):昼夜调色板 flag(sdlpal `gpGlobals->fNightPalette`,默认 FALSE=白天)。
   * 0x53 setDayPalette → false;0x54 setNightPalette → true;0x80 PaletteFade 取反。
   * 夜间色值已提取(PAT.MKF #0/#5 后半 256 色 → palette JSON.nightColors);fade target 经
   * resolveNightColors 据本 flag 选夜/昼色(sdlpal PAL_GetPalette(n,fNight))。flag 本身仅状态,
   * 视觉在下次 fade(0x51/0x80/0x93/auto fade-in)选 target 时生效(sdlpal 当帧不重绘)。
   */
  nightPalette: boolean

  /**
   * 特效 C(2026-05-29):当前 RNG 动画编号(sdlpal `gpGlobals->iCurPlayingRNG`,= RNG.MKF chunk index)。
   * 0x36 setRNG 写入;0x37 playRNG 据此播。两者解耦(一次 set 可被多条 play 复用)。默认 0。
   */
  iCurPlayingRNG: number

  /**
   * 特效 B(2026-05-29):屏幕波动每帧增量(sdlpal `gpGlobals->sWaveProgression`,SHORT 可负)。
   * 0x71 waveScreen 写入 operand[1]。每帧渲染时 `wScreenWave += sWaveProgression`;为 0 = 波幅恒定。
   * present 层 applyScreenWave 消费(配 wScreenWave)。读档恒置 0(sdlpal global.c:611 真值)。默认 0。
   */
  sWaveProgression: number

  /**
   * G9(2026-05-30):屏幕摇晃剩余帧数(sdlpal `static g_wShakeTime`,video.c:59)。
   * **瞬态,非存档字段**(sdlpal 是 video.c 文件级 static,不在 SAVEDGAME_WIN)。
   * opcode 0x0035 shakeScreen 写入 operand[0]。present 层每帧 applyScreenShake 消费:
   *   奇偶帧整幅 ±shakeLevel 垂直跳动 + 黑条,末尾自减,到 0 停。默认 0。
   */
  shakeTime: number

  /**
   * G9(2026-05-30):屏幕摇晃等级 = 每帧垂直偏移行数(sdlpal `static g_wShakeLevel`,video.c:60)。
   * **瞬态,非存档字段**。opcode 0x0035 写入 operand[1](==0 时 sdlpal script.c:1527 取默认 4)。默认 0。
   */
  shakeLevel: number

  /**
   * P2#7(2026-05-29):scene 切换的**异步资源加载窗口** flag(取代旧 fEnteringScene 渲染门)。
   *
   * loadScene opcode / loadSceneCommon 起手设 true → present.ts 跳过 render(fb 保留上一帧 = 旧 scene
   * 完整帧),避免 async fetch 期间渲染"旧 tilemap + 新 party 坐标"的花屏。assets 应用完
   * (applySceneAssetsToPresent)**立即**清 false → onEnter 正常渲染新场景(含 content-no-fade onEnter
   * 的对话,如 scene 14)。fade-first onEnter 清门后第一 tick 即跑到 fadeScreen(可等待点)→ present
   * 直接渲染渐变,不闪未渐变的新场景。
   *
   * P2#7 关键修(content-no-fade onEnter):旧版只在 fadeScreen / onEnter-end 清 → 有对话无 fadeScreen 的
   * onEnter(如 scene 14)对话被冻到 onEnter 结束才显。现额外在 **showDialog** 处清(对话是第一个可渲染
   * yield,此时 setPartyPos 已跑、camera 已定位)→ 对话正常显示。fade-first onEnter 仍在 fadeScreen 清。
   */
  sceneLoading?: boolean

  /**
   * loadScene opcode(0x59)的延迟 reload 目标 wNumScene。sdlpal 0x59(script.c:1870)设 wNumScene +
   * fEnteringScene 后 **break(继续跑调用脚本)** — reload 在下一 PAL_StartFrame。我们 port:loadScene 记此 +
   * 继续跑脚本(loadScene 后的 setPartyPos/fade 给新 scene 定位,无 onEnter scene 的位置只能来自这里),
   * 脚本结束('end'/ip 越界)才触发异步 _sceneLoader reload。旧版立刻 waiting+replace cursor 抛弃续跑 →
   * 无 onEnter scene 黑/错位(2026-05-29 scene 13/wNumScene14 黑屏根因)。undefined = 无待 reload。
   */
  pendingSceneLoad?: number

  /**
   * M5.6 T18 Step 3:AVI / RNG / splash 等"全屏 modal 序列"播放期间暂停 raf loop
   * 渲染(canvas 内容冻结,DOM `<video>` overlay 或自管渲染层接管视觉)。
   *
   * present.ts 入口检查 → early return;avi-player / rng-player / splash-fallback
   * 设 true,播完 finally 清 false。
   *
   * 注:跟 fEnteringScene 区别 — fEnteringScene 是 sdlpal loadScene 期间内部 1-2 帧
   * 冻结(短),suspendRaf 是 modal 整段(几秒到 30s+)。
   */
  suspendRaf?: boolean

  // ── SAVEDGAME_WIN 倒推: 平铺全局杂项 ───────────────────────────────────────

  /**
   * 存档次数(sdlpal SAVEDGAME_WIN.wSavedTimes)。
   * 每次调用 PAL_SaveGame 递增。
   */
  wSavedTimes: number

  /**
   * 当前存档槽(sdlpal `gpGlobals->bCurrentSaveSlot`,global.h)。**runtime 全局,不在 SAVEDGAME_WIN**:
   * save / load 到某槽时记录之。opcode 0x4E load-last-save(PAL_ReloadInNextTick(bCurrentSaveSlot))重载它。
   * 默认 1(slots 1-5);load 后须显式覆盖(Object.assign 会带入存档里那份旧值)。
   */
  currentSaveSlot: number

  /**
   * 当前 scene 编号(sdlpal SAVEDGAME_WIN.wNumScene)。
   * loadScene 写入,存档时持久化供下次读档还原当前场景。
   */
  wNumScene: number

  /**
   * palette cycle 偏移(sdlpal SAVEDGAME_WIN.wPaletteOffset)。
   * 控制调色板循环动画相位。
   */
  wPaletteOffset: number

  /**
   * 当前 BGM id(sdlpal global.h:534 `wNumMusic`)。0 = 停乐。
   *
   * M6:opcode 0x43/0x45/0x73 + 战斗起手写入;shell AudioManager 每帧轮询此值,变化即切 BGM
   * (Musics/{NNN}.mid,looped)/ 0 停。
   */
  wNumMusic: number
  /**
   * M6 BGM 循环标志(sdlpal `AUDIO_PlayMusic(num, loop, fade)` 的 loop = op1!=1,script.c:1647)。
   * 0x43 写入;默认 true(游戏 BGM 几乎全循环)。shell 切 BGM 时按此决定 loop。
   */
  musicLoop?: boolean
  /**
   * M6 SFX 一次性播放队列(sdlpal `AUDIO_PlaySound(num)`)。opcode 0x47 / 战斗攻击受击 / 菜单 push
   * SOUNDS.MKF chunk 号;shell AudioManager 每帧 drain → Web Audio 播 → 清空。**transient,不存档**。
   */
  pendingSounds?: number[]
  /**
   * M6 系统菜单「音乐」「音效」开关(sdlpal gConfig.fIsMusicEnabled / fIsSoundEnabled,
   * AUDIO_EnableMusic/EnableSound,uigame.c:618/629)。undefined 视为 true(默认开)。
   * 系统菜单 PAL_SwitchMenu 子选单切换;shell AudioManager 每帧读 → setMusicEnabled/setSfxEnabled。
   */
  fMusicEnabled?: boolean
  fSoundEnabled?: boolean

  /**
   * 战斗 BGM 编号(sdlpal SAVEDGAME_WIN.wNumBattleMusic)。
   * 进入战斗时播放。
   */
  wNumBattleMusic: number

  /**
   * 当前 battle field id(sdlpal global.h:536 `wNumBattleField`)。
   *
   * P0.e:opcode 0x4A `setBattlefield` 写入 — `scene.wScriptOnEnter` 进 scene 时设。
   * scene 15 的 enter script 真值 `[10, 0, 0]` → 草妖通道用 battlefield 10。
   *
   * opcode 7 startBattle 调 PAL_StartBattle 时取此值作 `battleFieldId`,绘制对应战斗背景。
   */
  wNumBattleField: number

  /**
   * 屏幕摇晃等级(sdlpal SAVEDGAME_WIN.wScreenWave)。
   * 0 = 不摇晃;数值越大摇晃越强。
   */
  wScreenWave: number

  /**
   * 战斗速度(sdlpal SAVEDGAME_WIN.wBattleSpeed)。
   * sdlpal global.c default = 2(非 PAL_CLASSIC build)。
   */
  wBattleSpeed: number

  /**
   * sdlpal SAVEDGAME_WIN.iCurMainMenuItem(M5.6 T6 PAL_ReadMenu 全局记忆)。
   * 主菜单(InGame hub)cursor 跨次记忆 — 下次开菜单光标停在上次位置。
   */
  iCurMainMenuItem: number

  /** sdlpal SAVEDGAME_WIN.iCurSystemMenuItem — 系统菜单 cursor 跨次记忆。 */
  iCurSystemMenuItem: number

  /** sdlpal SAVEDGAME_WIN.iCurInvMenuItem — 物品菜单 cursor 跨次记忆。 */
  iCurInvMenuItem: number

  /**
   * M5.6 T10b 修:sdlpal `uigame.c:896` `static WORD w = 0` 跨调用记忆 InventoryMenu
   * 一级子菜单(装备/使用)上次选项。0=装备 / 1=使用。
   */
  iCurInvActionMenuItem: number

  /**
   * 采集物品总价值(sdlpal SAVEDGAME_WIN.wCollectValue)。
   * 击败可采集敌人时累积。
   */
  wCollectValue: number

  /**
   * 当前 party 层(sdlpal SAVEDGAME_WIN.wLayer)。
   * 0 = 地上,非 0 = 地下层。
   */
  wLayer: number

  /**
   * 敌人追击范围(sdlpal SAVEDGAME_WIN.wChaseRange)。
   */
  wChaseRange: number

  /**
   * 追击速度变化周期(sdlpal SAVEDGAME_WIN.wChasespeedChangeCycles)。
   */
  wChasespeedChangeCycles: number

  /**
   * follower 数(队员之外的跟随者)(sdlpal SAVEDGAME_WIN.nFollower)。
   */
  nFollower: number

  /**
   * 当前拥有的钱(sdlpal SAVEDGAME_WIN.dwCash)。
   */
  dwCash: number

  /**
   * 下一场战斗自动战斗(sdlpal `gpGlobals->fAutoBattle`)—— 0x8A 置 true。
   * (消费方:auto-battle 自动选队员动作,尚未实现;本层只存旗子。)
   * 注:收集值用已有的 `wCollectValue`(0x33 累加 / 0x34 换物品)。
   */
  fAutoBattle: boolean

  // ── SAVEDGAME_WIN 倒推: 嵌套 struct ──────────────────────────────────────

  /**
   * 8 类经验 × MAX_PLAYER_ROLES(6)角色(sdlpal SAVEDGAME_WIN.Exp)。
   */
  Exp: AllExperience

  /**
   * PLAYERROLES 运行时可变部分(HP/MP/装备/魔法/属性等)。
   * 静态基础值保留在 player-roles.json。
   */
  PlayerRolesRuntime: PlayerRolesRuntime

  /**
   * 毒状态(sdlpal SAVEDGAME_WIN.rgPoisonStatus[MAX_POISONS][MAX_PLAYABLE_PLAYER_ROLES])。
   * 稀疏存:key = `${poisonSlot}_${playerIdx}`,只存非空毒状态。
   */
  rgPoisonStatus: Record<string, PoisonStatus>

  /**
   * 持久玩家状态(sdlpal global.h:522 `rgPlayerStatus[MAX_PLAYER_ROLES][kStatusAll]`)。
   * `[role][status]`,9 status(CLASSIC 序:0 Confused/1 Paralyzed/2 Sleep/3 Silence/
   * 4 Puppet/5 Bravery/6 Protect/7 Haste/8 DualAttack)。
   *
   * **D14 用途**:装备 scriptOnEquip 0x2D(PAL_SetPlayerStatus)把装备授的状态(如仙女剑
   * 的 DualAttack=32760)写这里;开战 createBattleState 把本表 seed 进 BattleState.players[].status。
   * 战斗局部状态仍 battle-local(B1 决策不回退),本表只承载**装备授**的持久状态(value>999
   * 免被 ClearAllPlayerStatus 清,唯一清除点 = removeEquipmentEffect 卸对应装备)。
   */
  rgPlayerStatus: number[][]

  /**
   * Scene 运行时可变状态(sdlpal SAVEDGAME_WIN.rgScene[MAX_SCENES])。
   * 稀疏存:sceneId → state,只存被 script 改过的 scene。
   */
  rgScene: Record<number, SceneStateMutable>

  /**
   * 各 scene 的 onEnter 脚本运行时入口 ip(sdlpal `rgScene[].wScriptOnEnter` 等价)。
   * 键 = wNumScene(1-based)。稀疏存:只存 onEnter 已跑过、被推进的 scene。
   *
   * sdlpal play.c:64 真值:onEnter 跑完返回值存回 wScriptOnEnter。开场 cutscene 以 0x01
   * (end-advance)收尾 → 推进到下一条 0x00(stop)→ 重进只跑 0x00 不重播。
   * P2#5(2026-05-29):**全局** ip(单一全局脚本数组 _globalCommands 下标,= EventCursor.ip 同语义);
   * 缺省 → 用 onEnterLabel(L_<global>→全局 ip)。-1 = 0x6D 清的"无 onEnter"。
   */
  sceneOnEnterIp: Record<number, number>

  /**
   * opcode 0x6D 设的 scene onEnter 脚本覆盖(键 = wNumScene,值 = **全局 script entry**,
   * 0 = 清除/无 onEnter)。sdlpal script.c:2065 `rgScene[op0-1].wScriptOnEnter = op1`。
   * loadScene 时消耗:全局 entry → 该 scene labelMap 解 local ip → 写 sceneOnEnterIp(0 → -1 哨兵)。
   * 跟 sceneOnEnterIp(local,跑完持久)分开存,因 0x6D 设的是全局 entry 且常作用于未加载的 scene。
   */
  sceneOnEnterOverride?: Record<number, number>

  /**
   * opcode 0x07 startBattle 的战后接回上下文(sdlpal script.c:3318-3331:战斗是同步的,返回后脚本继续;
   * 胜/无对应分支 → 下一条 ip,负 → op[1],逃 → op[2])。ts 战斗异步 → 0x07 存此,战末 resumePostBattleScript
   * 接回触发脚本。**修"打完怪不消失"**:`0x07; 0x52 隐藏怪; end` 的 0x52 此前永不跑(0x07 直接清 cursor)。
   */
  /**
   * R(重提)跨战斗持久:上一场战斗最后一回合各队员 action(按 party 槽 index)。sdlpal g_Battle 全局
   * 不随战斗重置 → "上回合"可跨场。tickPostAction 每轮更新,startBattle 带入新场 BattleState.prevActions。
   */
  prevBattleActions?: Map<number, import('./battle/battle-state.js').BattleAction>

  /**
   * 死亡演出标记(0x4F 已执行后)。present 据此**保持战斗帧 + 画死亡对话**,palette ramp 把战斗帧染红。
   * **由 0x4F handler 置**(非 outcome==='lost' —— 那误伤石长老/team21/team29 续剧情战);0x4E 读档 / 场景重载清。
   * 专用标记(showDialog 不清,区别于 sceneLoading)。sdlpal 死亡脚本 L_41075:0x43→0x4F→对话→0x4E。
   */
  gameOverActive?: boolean

  /**
   * 死亡**过渡帧** hold(gameOverActive 重构):T0 战斗结算 → 0x4F 真执行之间那几帧。
   * present 据此保持战斗最后一帧(角色倒地)不重绘,**不画 dialog**(此刻还没死亡对话、0x4F 也没染红)。
   * 由 resumePostBattleScript 用 scriptRunHits0x4F 预判 lostIp 指向死亡脚本时置;0x4F handler 真执行时
   * 移交给 gameOverActive(置后者 + 清此);0x4E 读档 / 场景重载兜底清。补 0x4F 前的 fb.clear 露大世界空窗。
   */
  deathHoldActive?: boolean

  postBattleResume?: {
    wonIp: number             // 胜(或负/逃无对应分支)→ resume 此 ip(= 0x07 后下一条)
    lostIp?: number           // 负 → op[1](已解析为全局 ip;0/无 → undefined → 用 wonIp)
    fledIp?: number           // 逃 → op[2]
    commands?: import('@type-pal/shared').Command[]
    labelMap?: Record<string, number>
    currentEventObjectId?: number
    triggerOwnerId?: number
    onEnterSceneId?: number
    onEnterStartIp?: number
    callStack?: EventCursor['callStack']
  }

  /**
   * opcode 0x6D op2 设的 scene onTeleport 脚本覆盖(键 = wNumScene 1-based,值 = **全局 script entry**,
   * 0 = 清除/无 teleport)。sdlpal script.c:2079 `rgScene[op0-1].wScriptOnTeleport = op2`。
   * 与 onEnter override 不同:**持久**(不在 loadScene 时消耗/删),对齐 sdlpal rgScene 常驻 saved 状态。
   * 0x38 teleportOut 读 `override[wNumScene] ?? sceneOnTeleportEntry`(base)判归隐脱出。
   */
  sceneOnTeleportOverride?: Record<number, number>

  /**
   * 当前场景(gs.wNumScene)的 base onTeleport 脚本全局 entry(0 = 无)—— loadScene 时由 scene dump
   * 的 onTeleportLabel(L_<n>→n)解析缓存。0x38 teleportOut 用作 base(override 优先)。
   * sdlpal 真值是 g.rgScene[wNumScene-1].wScriptOnTeleport(常驻 saved);ts 懒加载 → 仅缓存当前场景 base。
   */
  sceneOnTeleportEntry?: number

  /**
   * opcode 0x99 设的 scene mapNum 覆盖(键 = wNumScene,值 = 新 mapNum)。
   * sdlpal script.c:2740 `rgScene[op0-1].wMapNum = op1`。loadScene 时优先用此 mapNum 取 tilemap。
   */
  sceneMapNumOverride?: Record<number, number>

  /**
   * opcode 0x98 设的跟随者 role id 列表(队员之外的 NPC 跟随,如剧情角色)。
   * sdlpal nFollower + rgParty[wMaxPartyMemberIndex+i].wPlayerRole。present 层在队伍后渲染。
   */
  followers?: number[]

  /**
   * Object 运行时可变状态(sdlpal SAVEDGAME_WIN.rgObject[MAX_OBJECTS])。
   * 稀疏存:objectId → state,只存被 script 改过的 object。
   */
  rgObject: Record<number, ObjectStateMutable>

  /**
   * EventObject 运行时可变状态(sdlpal SAVEDGAME_WIN.rgEventObject[MAX_EVENT_OBJECTS])。
   * 稀疏存:eventObjectId → state。chest 已开 / 机关已触发 / NPC 移动等全在这。
   */
  rgEventObject: Record<number, EventObjectStateMutable>

  /**
   * 忠实 sdlpal `lprgEventObject[MAX_EVENT_OBJECTS]`:全部 scene 的 event object 全局数组,
   * 下标 = 全局 0-based id(= scene dump 的 `id` 字段 = sss.eventObjects 下标)。
   * 新游戏一次性加载;脚本按全局 id 改这里(NPC 走了/隐藏/宝箱开了 全持久)。
   * `gs.npcs` 是当前 scene 的切片(元素**引用**本数组,改动自动持久)。随存档持久化。
   * undefined = 旧档/未加载(loadSceneCommon 兜底从 scene dump 建,退化为非持久)。
   */
  allEventObjects?: NpcState[]

  /**
   * 各 scene 在 allEventObjects 里的 [start, end) 区间(键 = scene 0-based index = wNumScene-1)。
   * sdlpal `scene.wEventObjectIndex` 真值。event-objects.json 随 allEventObjects 一起加载。
   */
  sceneEventRanges?: Record<number, [number, number]>

  /**
   * sdlpal global.h:521 `rgEquipmentEffect[MAX_PLAYER_EQUIPMENTS + 1]` — 7 部位
   * 装备 stat 加成累加表。`updateAllEquipments` 启动 / 读档时填满,opcode 0x17
   * (set extra attr)期间增量写入,opcode 0x18 (Equip) 入口先 removeEquipmentEffect 清。
   */
  rgEquipmentEffect: EquipmentEffectRoles[]

  /**
   * sdlpal global.h:519 `wLastUnequippedItem` — opcode 0x18 真值(script.c:809)将
   * 当前 swap 下来的旧装备 ID 写到此字段;PAL_EquipItemMenu(uigame.c:1859)每帧重读,
   * **swap 链路 redraw 用** — 装上一个新装备后,菜单显示旧装备让 user 看,
   * 可继续选 role 装这个旧装备(实现装备循环交换 UI)。
   */
  wLastUnequippedItem: number

  /**
   * sdlpal `g_iCurEquipPart` — opcode 0x18 设当前 bodypart slot,后续 0x17 写入
   * `rgEquipmentEffect[i]` 时使用(script.c:773 真值)。我们 ts 不真用 — opcode 0x17
   * 直接取 operand[0]-0xB 算 part,iCurEquipPart 只为同 sdlpal SAVEDGAME 对齐保留。
   *
   * -1 = no equip in progress(sdlpal 默认 0 但 ts 用 -1 区分 "未装备"和"part 0=Head")。
   */
  iCurEquipPart: number

  /**
   * sdlpal `g_fScriptSuccess`(script.c:27)。PAL_RunTriggerScript 入口设 TRUE(script.c:3187),
   * 失败类 opcode(0x1B/0x1C/0x1D HP/MP 无变化、0x22 复活非死者、0x41 markFailed、条件跳转等)设 FALSE。
   * 调用方据此 gate 副作用:item.consuming 物品仅在脚本成功时扣(play.c:298-302)、魔法 MP 同理。
   * 我们 port:每个 trigger/item 脚本 cursor 起始重置 TRUE;脚本结束时按它决定是否扣 pendingItemConsume。
   */
  fScriptSuccess: boolean

  /**
   * 当前正在跑的 item.scriptOnUse 待消耗物品 id(consuming 物品)。sdlpal item 消耗是脚本**跑完后**
   * `if (consuming && g_fScriptSuccess) AddItem(-1)`(play.c:298)。我们 tick 模型脚本跨多帧,故延迟:
   * startOverworldItemScript 设此(不立即扣),脚本 cursor 结束时按 fScriptSuccess gate 扣。undefined = 无待消耗。
   */
  pendingItemConsume?: number

  /**
   * 当前 item.scriptOnUse 是 applyToAll 物品(sdlpal play.c:305-322:`RunTriggerScript; consume; return;`
   * — applyToAll 用完**直接 return 退出 PAL_GameUseItem**,不像非 applyToAll 在 ItemUseMenu INNER while
   * 循环里反复用)。我们 tick 模型:脚本结束时据此关掉物品菜单回 explore(让脚本设的世界 trigger 触发,
   * 如桂花酒设酒剑仙 proximity → 回 explore 立即触发喝酒对话)。非 applyToAll 不设 → 留在菜单(INNER 循环)。
   */
  itemUseApplyToAll?: boolean

  /**
   * Sync.2 fix9:屏幕淡入状态(sdlpal video.c::VIDEO_FadeScreen,opcode 0x73 触发)。
   *
   * sdlpal 真值(video.c:1130-1280):
   *   - 12 outer × 6 inner = 72 步 palette-bit blending
   *   - 每步 SDL_Delay(wSpeed*10 ms),speed=2 → 30ms × 72 ≈ 2.16s
   *   - blocking event loop:VIDEO_BackupScreen → PAL_MakeScene → VIDEO_FadeScreen(speed) 三步同步
   * 我们真做:framesTotal = 72(对应 sdlpal 72 inner ticks),每 raf tick 推 1。
   * present.ts 见此字段时在最上层画黑色 alpha overlay:
   *   alpha = 1.0 - framesElapsed/framesTotal(0→全黑,1→全透明)
   *
   * undefined = 无 fade(常态)
   */
  fadeState?: {
    /** opcode 0x73 operand[0] — sdlpal speed;wall-clock 总时长 = (speed+1)*10*72 ms。 */
    speed: number
    /**
     * sdlpal video.c:1175-1176 真值:wSpeed++; wSpeed*=10; 总时长 = wSpeed * 72。
     * speed=2 → 30ms × 72 = 2160ms。time-based 不受 raf 帧率影响,1:1 还原 sdlpal classic。
     */
    totalMs: number
    /** performance.now() 在 opcode 0x73 firing 那一帧记录;每帧算 elapsed = now - startTime。 */
    startTimeMs: number
    /**
     * 已应用 sdlpal step 数(0..72)。每帧 present.ts 按 elapsedMs 算 target step,
     * 把 missing steps 全跑完(raf 慢时一次跑多步追上)。
     */
    appliedSteps: number
    /**
     * sdlpal video.c:VIDEO_BackupScreen 的 gpScreenBak buffer — 在 opcode 0x73 firing
     * 当 frame 进 present.ts 时,从上一帧 fb.indices 拷一份快照。
     *
     * sdlpal 真值:`VIDEO_BackupScreen(gpScreen)` 在 PAL_MakeScene 之前调,backupBuffer
     * 持有"opcode 触发那一瞬间屏幕上"的像素(在我们 == 上一帧 dream 渲染结果)。
     * 后续 VIDEO_FadeScreen 在 backup ↔ current 之间 per-pixel 渐变 — 主角 sprite 在两个
     * buffer 都画过(dream 跟 inn 都画主角 sprite 193),所以 fade 全程主角可见。
     */
    backupPixels?: Uint8Array
  }
}

// ── 工厂函数 helpers ──────────────────────────────────────────────────────────

/** 创建全零 ExpEntry。 */
function makeExpEntry(): ExpEntry {
  return { wExp: 0, wLevel: 0, wCount: 0 }
}

/**
 * 战前清零 7 个**隐藏**经验池的 wCount(sdlpal battle.c:1565-1586 PAL_StartBattle:rgHealthExp..rgFleeExp
 * 各 wCount=0)。rgPrimaryExp.wCount **不清**(主经验不用 wCount)。wCount 是 per-battle 临时计数,跨战不累积。
 */
export function clearHiddenExpCounts(gs: GameState): void {
  const pools = [
    gs.Exp.rgHealthExp, gs.Exp.rgMagicExp, gs.Exp.rgAttackExp, gs.Exp.rgMagicPowerExp,
    gs.Exp.rgDefenseExp, gs.Exp.rgDexterityExp, gs.Exp.rgFleeExp,
  ]
  for (const pool of pools) for (const e of pool) e.wCount = 0
}

/** 创建全零 AllExperience(8 类 × MAX_PLAYER_ROLES=6 角色)。 */
function createEmptyExp(): AllExperience {
  const row = () => Array.from({ length: 6 }, makeExpEntry)
  return {
    rgPrimaryExp: row(),
    rgHealthExp: row(),
    rgMagicExp: row(),
    rgAttackExp: row(),
    rgMagicPowerExp: row(),
    rgDefenseExp: row(),
    rgDexterityExp: row(),
    rgFleeExp: row(),
  }
}

/**
 * 新游戏:把全 8 类经验的 `wLevel` 初始化为对应角色等级(sdlpal global.c:455-465 PAL_LoadDefaultGame:
 * `memset(&Exp,0)` 后 `for i<MAX_PLAYER_ROLES: Exp.rg{Primary,Health,Magic,Attack,MagicPower,Defense,
 * Dexterity,Flee}Exp[i].wLevel = PlayerRoles.rgwLevel[i]`)。wExp 保持 0(memset 后只设 wLevel)。
 * **仅新游戏调** —— 读档时 Exp 整体从存档反序列化,不可重置(否则覆盖玩家真实升级进度)。
 * 入参 `rgwLevel` = hydrate 后的 PlayerRolesRuntime.rgwLevel(= sdlpal `p->PlayerRoles.rgwLevel`)。
 */
export function initExpLevelsFromLevels(exp: AllExperience, rgwLevel: number[]): void {
  const cats = [
    exp.rgPrimaryExp, exp.rgHealthExp, exp.rgMagicExp, exp.rgAttackExp,
    exp.rgMagicPowerExp, exp.rgDefenseExp, exp.rgDexterityExp, exp.rgFleeExp,
  ]
  const n = exp.rgPrimaryExp.length // = MAX_PLAYER_ROLES(6),避免魔法常量
  for (let i = 0; i < n; i++) {
    const lv = rgwLevel[i] ?? 0
    for (const cat of cats) {
      const entry = cat[i]
      if (entry) entry.wLevel = lv
    }
  }
}

/**
 * 新游戏起手:从 playerRoles.json 静态基线 hydrate 到 PlayerRolesRuntime 运行时可变副本。
 *
 * sdlpal `global.c PAL_NewGame` → `PAL_LoadDefaultGame` 真值:把 DATA.MKF chunk 3 解出的
 * 整张 PLAYERROLES 表整体拷给 `gpGlobals->g.PlayerRoles`(runtime 副本)。我们 ts 拆静态字段
 * 留在 [player-roles.json](../../../packages/game/public/extracted/data/player-roles.json),
 * runtime mutable 字段在 `PlayerRolesRuntime` — 新游戏时需要复制基线值,否则 rgwHP/MaxHP/全 stat
 * 都是 0,所有 HP/MP 加减 opcode(0x1B/1C/1D 等)clamp 后无效果(user 反馈"用观音符没反应"
 * 的根因)。
 */
export function hydratePlayerRolesRuntime(
  runtime: PlayerRolesRuntime,
  playerRoles: import('@type-pal/shared').PlayerRoles,
): void {
  for (const role of playerRoles.roles) {
    const i = role.id
    runtime.rgwName[i] = role.name
    runtime.rgwLevel[i] = role.level
    runtime.rgwMaxHP[i] = role.maxHP
    runtime.rgwMaxMP[i] = role.maxMP
    runtime.rgwHP[i] = role.hp
    runtime.rgwMP[i] = role.mp
    runtime.rgwAttackStrength[i] = role.attackStrength
    runtime.rgwMagicStrength[i] = role.magicStrength
    runtime.rgwDefense[i] = role.defense
    runtime.rgwDexterity[i] = role.dexterity
    runtime.rgwFleeRate[i] = role.fleeRate
    runtime.rgwPoisonResistance[i] = role.poisonResistance
    runtime.rgwCoveredBy[i] = role.coveredBy ?? 0
    runtime.rgwCooperativeMagic[i] = role.cooperativeMagic ?? 0 // base 合击(装备 override 之上,P2 foundation)
    // 装备 6 槽
    const eq = role.equipment ?? []
    for (let slot = 0; slot < 6; slot++) {
      const row = runtime.rgwEquipment[slot]
      if (row) row[i] = eq[slot] ?? 0
    }
    // 法术 32 槽
    const mg = role.magic ?? []
    for (let slot = 0; slot < 32; slot++) {
      const row = runtime.rgwMagic[slot]
      if (row) row[i] = mg[slot] ?? 0
    }
    // 元素抗性 5 维(sdlpal NUM_MAGIC_ELEMENTAL=5 顺序:0 风 / 1 雷 / 2 水 / 3 火 / 4 土)
    const er = role.elemResistance
    if (er) {
      const elems: number[] = [er.wind, er.thunder, er.water, er.fire, er.earth]
      for (let elem = 0; elem < 5; elem++) {
        const row = runtime.rgwElementalResistance[elem]
        if (row) row[i] = elems[elem] ?? 0
      }
    }
  }
}

/**
 * 投影 PlayerRolesRuntime(运行时 SoA array)→ 战斗用 PlayerRoles(object)—— hydratePlayerRolesRuntime 的逆。
 *
 * **架构边界**:战斗原直接用 `assets.playerRoles` 静态 1 级基线,**升级/大世界 stat 改动战斗里全不生效**
 * (battle 用 base / explore+menu 用 runtime,两者新游戏后即分叉)。本投影在 startBattle 入口用 runtime
 * **当前**属性(等级/HP/MP/攻防/速度/逃跑/抗性/名字)+ staticRoles 的不可变字段(精灵/音效/avatar/
 * walkFrames/attackAll/装备槽 等)建战斗 roles,使战斗吃上升级后属性。
 *
 * **D14 修(2026-05-31)**:传入 `equipmentEffect`(gs.rgEquipmentEffect)后,把战斗 stat 投影成
 * **effective = base + Σ rgEquipmentEffect[0..6]**,1:1 mirror sdlpal `PAL_GetPlayerAttackStrength` 等
 * getter(global.c:1736-1975,PAL_CLASSIC i=0..MAX_PLAYER_EQUIPMENTS 含 Extra 槽)。这样战斗吃上装备
 * 攻/防/魔/速/逃/毒抗/元素抗加成 + per-battle Extra 槽(0x30 临时 buff)。装备在战斗中不变 → 投影时
 * 烤入即等价 sdlpal 每次 live 读;0x30 战内写 Extra 后由 battle-opcodes 经 getter recompute snapshot。
 * 省略 `equipmentEffect`(旧 caller / 不关心装备的测试)→ 退回纯 base 投影(向后兼容)。
 *
 * 注:maxHP/maxMP/level **不**并入装备 effect —— sdlpal 无对应 getter(rgwMaxHP 等无 PAL_GetPlayerMaxHP),
 * battle 直读 g.PlayerRoles.rgwMaxHP base,故此处也只投影 runtime base。
 *
 * @param runtime gs.PlayerRolesRuntime —— 可变属性源
 * @param staticRoles assets.playerRoles —— 不可变字段源 + 角色全集(id 顺序)
 * @param equipmentEffect gs.rgEquipmentEffect —— 装备 + Extra effect 槽(0..6);省略 → 纯 base 投影
 */
export function projectRuntimeToBattleRoles(
  runtime: PlayerRolesRuntime,
  staticRoles: import('@type-pal/shared').PlayerRoles,
  equipmentEffect?: EquipmentEffectRoles[],
): import('@type-pal/shared').PlayerRoles {
  // sdlpal getter:base + Σ_{slot=0..MAX_PLAYER_EQUIPMENTS(=6,含 Extra)} rgEquipmentEffect[slot].field[role]
  const sumEff = (field: keyof Omit<EquipmentEffectRoles, 'rgwElementalResistance'>, i: number): number => {
    if (!equipmentEffect) return 0
    let s = 0
    for (let slot = 0; slot <= 6; slot++) {
      s += equipmentEffect[slot]?.[field][i] ?? 0
    }
    return s
  }
  const sumElemEff = (elem: number, i: number): number => {
    if (!equipmentEffect) return 0
    let s = 0
    for (let slot = 0; slot <= 6; slot++) {
      s += equipmentEffect[slot]?.rgwElementalResistance[elem]?.[i] ?? 0
    }
    return s
  }
  const clamp100 = (v: number): number => Math.max(0, Math.min(100, v)) // sdlpal 抗性 clamp(>100→100)
  // sdlpal override 类 getter:某槽非 0 即覆盖(非累加)。
  //   PAL_PlayerCanAttackAll(global.c:2047):任一槽 rgwAttackAll!=0 → 群攻。
  //   PAL_GetPlayerBattleSprite(2009)/ PAL_GetPlayerCooperativeMagic(2044):末个非 0 槽 override base。
  const anyEquip = (field: 'rgwAttackAll', i: number): boolean => {
    if (!equipmentEffect) return false
    for (let slot = 0; slot <= 6; slot++) if ((equipmentEffect[slot]?.[field][i] ?? 0) !== 0) return true
    return false
  }
  const lastNonzeroEquip = (field: 'rgwSpriteNumInBattle' | 'rgwCooperativeMagic', i: number): number => {
    if (!equipmentEffect) return 0
    let w = 0
    for (let slot = 0; slot <= 6; slot++) {
      const v = equipmentEffect[slot]?.[field][i] ?? 0
      if (v !== 0) w = v
    }
    return w
  }
  const roles = staticRoles.roles.map((base) => {
    const i = base.id
    const baseElem = {
      wind: runtime.rgwElementalResistance[0]?.[i] ?? base.elemResistance.wind,
      thunder: runtime.rgwElementalResistance[1]?.[i] ?? base.elemResistance.thunder,
      water: runtime.rgwElementalResistance[2]?.[i] ?? base.elemResistance.water,
      fire: runtime.rgwElementalResistance[3]?.[i] ?? base.elemResistance.fire,
      earth: runtime.rgwElementalResistance[4]?.[i] ?? base.elemResistance.earth,
    }
    return {
      ...base, // 不可变:_name/avatar/spriteNum/walkFrames/sounds/equipment 等
      name: runtime.rgwName[i] ?? base.name,
      level: runtime.rgwLevel[i] ?? base.level,
      maxHP: runtime.rgwMaxHP[i] ?? base.maxHP,
      maxMP: runtime.rgwMaxMP[i] ?? base.maxMP,
      hp: runtime.rgwHP[i] ?? base.hp,
      mp: runtime.rgwMP[i] ?? base.mp,
      // 装备 override(sdlpal getter):长鞭 attackAll/sprite、圣灵珠 coopMagic。装备授群攻 → role.attackAll=1
      //   (battle-system 读此判全体攻);sprite/coopMagic 末非 0 槽 override base(coopMagic 执行待 P2)。
      attackAll: anyEquip('rgwAttackAll', i) ? 1 : base.attackAll,
      spriteNumInBattle: lastNonzeroEquip('rgwSpriteNumInBattle', i) || base.spriteNumInBattle,
      cooperativeMagic: lastNonzeroEquip('rgwCooperativeMagic', i)
        || (runtime.rgwCooperativeMagic[i] ?? base.cooperativeMagic ?? 0),
      // effective = base + Σ 装备 effect(含 Extra),mirror sdlpal PAL_GetPlayerXxx getter
      attackStrength: (runtime.rgwAttackStrength[i] ?? base.attackStrength) + sumEff('rgwAttackStrength', i),
      magicStrength: (runtime.rgwMagicStrength[i] ?? base.magicStrength) + sumEff('rgwMagicStrength', i),
      defense: (runtime.rgwDefense[i] ?? base.defense) + sumEff('rgwDefense', i),
      dexterity: (runtime.rgwDexterity[i] ?? base.dexterity) + sumEff('rgwDexterity', i),
      fleeRate: (runtime.rgwFleeRate[i] ?? base.fleeRate) + sumEff('rgwFleeRate', i),
      poisonResistance: clamp100((runtime.rgwPoisonResistance[i] ?? base.poisonResistance) + sumEff('rgwPoisonResistance', i)),
      coveredBy: runtime.rgwCoveredBy[i] ?? base.coveredBy,
      // 装备 6 槽 / 法术 32 槽:runtime[slot][i] → role 数组(完整 hydrate 逆;battle magic 菜单已接此 role.magic 真值,见 buildBattleMagicSelect)
      equipment: runtime.rgwEquipment.map((slot) => slot[i] ?? 0),
      magic: runtime.rgwMagic.map((slot) => slot[i] ?? 0),
      // 元素抗 5 维(0 风/1 雷/2 水/3 火/4 土,同 hydrate)+ 装备 effect,clamp [0,100]
      elemResistance: {
        wind: clamp100(baseElem.wind + sumElemEff(0, i)),
        thunder: clamp100(baseElem.thunder + sumElemEff(1, i)),
        water: clamp100(baseElem.water + sumElemEff(2, i)),
        fire: clamp100(baseElem.fire + sumElemEff(3, i)),
        earth: clamp100(baseElem.earth + sumElemEff(4, i)),
      },
    }
  })
  return { roles }
}

/** 战斗结局(0x07 战后接回分支用)。 */
export type BattleOutcome = 'won' | 'lost' | 'fled'

/** sdlpal 死亡红屏 opcode 0x4F PAL_FadeToRed(script.c:1768),全游戏唯一在死亡脚本 L_41075。 */
const OP_FADE_TO_RED = 0x4f

/**
 * 死亡帧预判(gameOverActive 重构):从 startIp 起**线性扫描**脚本 run(遇首个 end/goto 即停),
 * 是否命中 0x4F(死亡红屏)。命中 → 本场战败是"立即进死亡帧"的真死亡(L_41075:0x43→0x4F)。
 *
 * sdlpal 真值(data/extracted/events/all.json,byte-level 核对):0x4F 全游戏**唯一**在 index 41076,
 *   0x4E(FadeOut+reload)唯一在 41082 —— 全游戏只有一条 game-over 序列 L_41075。
 *
 * **遇 goto 停**(不跨 goto 追)的取舍:全部"立即死亡"战 lostJump 直接 = 41075(run 内首条就近见 0x4F)。
 *   唯一例外是 team21 **林月如(必胜战)**:lostIp=6186 先播 `林月如:多管闲事..活该!` 两句对白,再 `goto L_41075`
 *   (6189)进死亡序列(红屏+读档)。本判据扫到 6189 goto 即停 → 返 false → **不**预置 deathHoldActive。
 *   后果:战败红屏+读档**结局仍正确**(脚本真跑到 goto→41076 时由 0x4F handler 置 gameOverActive 点亮),
 *   只是那两句对白期间 hold 的是战后场景帧而非战斗帧(中间态视觉小瑕疵,user 未报,留作已知差异)。
 *   若日后要 1:1,需上"通用战后保持帧+叠对白"机制(见 plan),而非简单跨 goto 追(会让对白 hold 时不绘)。
 * 续剧情战(石长老 team34 / 天鬼皇 team293 / 彩依 team37 lostJump=0 落 wonIp;林天南 team24 撑7回合 Terminated→fled)
 *   run 内无 0x4F → 返 false,绝不误 hold 死亡帧。
 */
export function scriptRunHits0x4F(commands: Command[] | undefined, startIp: number): boolean {
  if (!commands) return false
  for (let i = startIp; i >= 0 && i < commands.length; i++) {
    const c = commands[i]
    if (!c) return false
    if (c.op === 'end' || c.op === 'goto') return false // run 边界:不跨 goto/end 追
    if (c.op === 'raw' && c.opcode === OP_FADE_TO_RED) return true
  }
  return false
}

/**
 * opcode 0x07 触发的战斗结束后,接回原触发脚本(sdlpal script.c:3318-3331)。
 * 胜(或负/逃但 op 无对应分支)→ wonIp(0x07 后下一条);负 → lostIp(op[1]);逃 → fledIp(op[2])。
 * **修"打完怪不消失"**:让 `0x07; 0x52 隐藏怪; end` 的 0x52 真跑(0x07 此前直接清 cursor → 永不跑)。
 * 恢复 currentEventObjectId → 0x52 隐藏的是开战的那只怪。无 postBattleResume → no-op(非 0x07 触发的战斗)。
 */
export function resumePostBattleScript(gs: GameState, outcome: BattleOutcome): void {
  const r = gs.postBattleResume
  if (!r) return
  gs.postBattleResume = undefined
  // sdlpal script.c:3320-3331:负+op[1]!=0 → op[1];逃+op[2]!=0 → op[2];否则(胜/无分支)→ 下一条。
  let ip = r.wonIp
  if (outcome === 'lost' && r.lostIp !== undefined) ip = r.lostIp
  else if (outcome === 'fled' && r.fledIp !== undefined) ip = r.fledIp
  gs.eventCursor = {
    ip,
    commands: r.commands,
    labelMap: r.labelMap,
    currentEventObjectId: r.currentEventObjectId,
    triggerOwnerId: r.triggerOwnerId,
    onEnterSceneId: r.onEnterSceneId,
    onEnterStartIp: r.onEnterStartIp,
    callStack: r.callStack,
  }
  gs.mode = 'event'
  // gameOverActive 重构(2026-06-01,修石长老必败续剧情误红屏):**不再** `outcome==='lost'` 无条件置死亡演出。
  //   误伤过的续剧情战(byte-level 核对 all.json 0x07 全表):石长老 team34 / 天鬼皇 team293 / 彩依 team37
  //   (lostJump=0 → lostIp=undefined → 落 wonIp 续);林天南 team24(撑7回合 Terminated→fled)。它们 lost 路无 0x4F,
  //   旧逻辑却因 outcome==='lost' 一律红屏 → user 报"石长老必败却出红屏"。
  //   改判据 = lostIp 指向脚本 run 是否真含 0x4F。命中 → 置 deathHoldActive 补 T0→0x4F 过渡帧(present 保持战斗倒地帧)。
  //   0x4F handler 真执行时移交 gameOverActive(C4)。**必胜战**(林月如 team21 lost→对白→goto 41075)遇 goto 停 →
  //   不预置,结局红屏仍由 0x4F handler 点亮(见上 scriptRunHits0x4F 注)。详 docs/plans/2026-06-01-gameoveractive-refactor.md。
  if (outcome === 'lost' && r.lostIp !== undefined && scriptRunHits0x4F(r.commands, ip)) {
    gs.deathHoldActive = true
  }
}

/**
 * 战斗结束把战斗 roles 的可变战果回写 PlayerRolesRuntime —— 投影的逆向收尾,使战斗伤害/治疗**持久化**
 * 进大世界 + 存档对齐(原 finalizeBattle 只回写 exp/cash,hp/mp 战果丢失,打完血量复原)。
 *
 * 战斗只改 HP/MP(伤害/治疗)→ 回写这两项;等级/属性升级(D11)由升级 loop 在回写后直接写 runtime;
 * 临时增益(0x30 Extra slot)不回写(sdlpal 战末清 Extra)。仅回写在场 party 成员。
 *
 * @param battleRoles res.playerRoles —— 战斗结束态(hp/mp 已被伤害/治疗改)
 * @param runtime gs.PlayerRolesRuntime —— 回写目标
 * @param partyMembers 在场 party 的 roleId 列表(只回写这些)
 */
export function writeBackBattleRolesToRuntime(
  battleRoles: import('@type-pal/shared').PlayerRoles,
  runtime: PlayerRolesRuntime,
  partyMembers: number[],
): void {
  for (const roleId of partyMembers) {
    const role = battleRoles.roles[roleId]
    if (!role) continue
    runtime.rgwHP[roleId] = role.hp
    runtime.rgwMP[roleId] = role.mp
  }
}

/** 创建全零 PlayerRolesRuntime(MAX_PLAYER_ROLES=6 角色)。 */
function createInitialPlayerRolesRuntime(): PlayerRolesRuntime {
  const n = 6 // MAX_PLAYER_ROLES
  const zeros = () => Array<number>(n).fill(0)
  const mat = (rows: number) => Array.from({ length: rows }, zeros)
  return {
    rgwName: zeros(),
    rgwLevel: zeros(),
    rgwMaxHP: zeros(),
    rgwMaxMP: zeros(),
    rgwHP: zeros(),
    rgwMP: zeros(),
    rgwEquipment: mat(6),   // MAX_PLAYER_EQUIPMENTS=6 slots × 6 roles
    rgwAttackStrength: zeros(),
    rgwMagicStrength: zeros(),
    rgwDefense: zeros(),
    rgwDexterity: zeros(),
    rgwFleeRate: zeros(),
    rgwPoisonResistance: zeros(),
    rgwElementalResistance: mat(5), // NUM_MAGIC_ELEMENTAL=5 × 6 roles
    rgwCoveredBy: zeros(),
    rgwMagic: mat(32), // MAX_PLAYER_MAGICS=32 × 6 roles
    rgwCooperativeMagic: zeros(),
  }
}

/**
 * sdlpal global.h:521 `rgEquipmentEffect[MAX_PLAYER_EQUIPMENTS + 1]` 全零初始化 —
 * 7 个 EquipmentEffectRoles。PAL_UpdateEquipments(global.c:1333)启动时先 memset 全 0
 * 再跨 role × part 跑 scriptOnEquip 累加。
 */
export function createInitialEquipmentEffect(): EquipmentEffectRoles[] {
  const n = 6 // MAX_PLAYER_ROLES
  const zeros = () => Array<number>(n).fill(0)
  const mat = (rows: number) => Array.from({ length: rows }, zeros)
  const slot = (): EquipmentEffectRoles => ({
    rgwSpriteNumInBattle: zeros(),
    rgwAttackAll: zeros(),
    rgwLevel: zeros(),
    rgwMaxHP: zeros(),
    rgwMaxMP: zeros(),
    rgwHP: zeros(),
    rgwMP: zeros(),
    rgwAttackStrength: zeros(),
    rgwMagicStrength: zeros(),
    rgwDefense: zeros(),
    rgwDexterity: zeros(),
    rgwFleeRate: zeros(),
    rgwPoisonResistance: zeros(),
    rgwElementalResistance: mat(5),
    rgwCoveredBy: zeros(),
    rgwCooperativeMagic: zeros(),
  })
  // sdlpal MAX_PLAYER_EQUIPMENTS + 1 = 7 部位(0..5 真实 + 1 reserved)
  return Array.from({ length: 7 }, slot)
}

/** 创建全零持久玩家状态(MAX_PLAYER_ROLES=6 × kStatusAll=9,sdlpal global.h:522)。 */
export function createInitialPlayerStatus(): number[][] {
  return Array.from({ length: 6 }, () => Array<number>(9).fill(0))
}

export function createInitialGameState(
  partyStart: { x: number; y: number; facing: Facing },
): GameState {
  return {
    // ── 既有字段 ──
    party: { x: partyStart.x, y: partyStart.y, facing: partyStart.facing },
    partyScriptedFrame: {},
    camera: { x: partyStart.x - PARTYOFFSET_X, y: partyStart.y - PARTYOFFSET_Y },
    npcs: [],
    partyMembers: [],
    inventory: [],
    mode: 'explore',
    menuStack: [],
    currentDialogStyle: 'top',  // sdlpal PAL_InitText / PAL_EndDialog 默认 kDialogUpper(top)
    // sdlpal text.c:29 FONT_COLOR_DEFAULT = 0x4F(palette idx 79,亮黄/浅米)
    currentDialogFontColor: 0x4F,
    frameNum: 0,
    walkingFrame: { stepFrame: 0, walking: false },
    trail: [],

    // ── M5 Sync.1: SAVEDGAME_WIN 平铺杂项 ──
    wSavedTimes: 0,
    currentSaveSlot: 1,  // sdlpal bCurrentSaveSlot 默认槽;save/load 时更新(opcode 0x4E 重载它)
    wNumScene: 0,
    wPaletteOffset: 0,
    wNumMusic: 0,
    wNumBattleMusic: 0,
    wNumBattleField: 0,
    wScreenWave: 0,
    wBattleSpeed: 2,      // sdlpal global.c:765 default = 2
    iCurMainMenuItem: 0,  // M5.6 T6:菜单 cursor 默认 0
    iCurSystemMenuItem: 0,
    iCurInvMenuItem: 0,
    iCurInvActionMenuItem: 0,  // M5.6 T10b 修:sdlpal uigame.c:896 static w=0
    wCollectValue: 0,
    wLayer: 0,
    wChaseRange: 1,       // sdlpal default 追击范围 1
    wChasespeedChangeCycles: 0,
    nFollower: 0,
    dwCash: 0,
    fAutoBattle: false,
    numPalette: 0,        // 特效 A:当前调色板索引(sdlpal wNumPalette)
    nightPalette: false,  // 特效 A:昼夜 flag(sdlpal fNightPalette,默认白天)
    iCurPlayingRNG: 0,    // 特效 C:当前 RNG 动画编号(sdlpal iCurPlayingRNG)
    sWaveProgression: 0,  // 特效 B:屏幕波动每帧增量(sdlpal sWaveProgression)
    shakeTime: 0,         // G9:屏幕摇晃剩余帧(sdlpal static g_wShakeTime,video.c:59,瞬态非存档)
    shakeLevel: 0,        // G9:屏幕摇晃等级=垂直偏移行数(sdlpal static g_wShakeLevel,video.c:60,瞬态)

    // ── M5 Sync.1: 嵌套 struct ──
    Exp: createEmptyExp(),
    PlayerRolesRuntime: createInitialPlayerRolesRuntime(),
    rgPoisonStatus: {},
    rgPlayerStatus: createInitialPlayerStatus(),
    rgScene: {},
    sceneOnEnterIp: {},
    rgObject: {},
    rgEventObject: {},
    // ── M6 C5: 装备 effect ───────────────────────────────────────────────
    rgEquipmentEffect: createInitialEquipmentEffect(),
    wLastUnequippedItem: 0,
    iCurEquipPart: -1,
    fScriptSuccess: true,
    pendingItemConsume: undefined,
  }
}

/**
 * 原版 EVENTOBJECT.x / .y 是 sdlpal pixel(tile 32×16,允许半 tile)。
 * M5 P0.0 System A:我们单位 = sdlpal pixel(1:1),直接透传 eo.x/y。
 *
 * 注:sdlpal scene.c:301-322 sprite 渲染时有 +7 锚点偏移(sLayer*8+9 anchor - sLayer*8-2 iLayer 相消),
 * 但那是**渲染层偏移**(脚底显示在 y+7),不写进 logical 坐标 — contact 距离判断
 * (sdlpal scene.c:624 `abs(p.x - eo.x) + abs(p.y - eo.y)*2 < 16`)用的是原 eo.x/y。
 * +7 偏移在 present.ts NPC 绘制处加。
 */
export function npcFromEventObject(
  eo: SceneEventObject,
  labelMap?: Record<string, number>,
): NpcState {
  const npc: NpcState = {
    id: eo.id,
    x: eo.x,
    y: eo.y,
    spriteNum: eo.spriteNum,
    triggerLabel: eo.triggerLabel,
    triggerMode: eo.triggerMode,
    // Sync.2 fix4 + fix10:透传 sState(scene dump 已含 EventObject.sState 真值)
    // sdlpal global.h:77-79:kObjStateHidden=0 / Normal=1 / Blocker=2
    sState: eo.sState ?? 1,
    // sdlpal scene.c:302/316 真值:渲染 z 层 — sort key 和 iLayer 都依赖 sLayer。
    // dump 字段保留;present.ts 用 sLayer*8+9(pos.y)/ sLayer*8+2(iLayer)。
    sLayer: eo.sLayer ?? 0,
    // sdlpal `EventObject.nSpriteFrames`(scene.c:262 渲染真值;0 = 非方向性 sprite)。
    nSpriteFrames: eo.nSpriteFrames,
  }
  // sdlpal EventObject.wDirection → 初始朝向(scene.c NPC 渲染按 wDirection 选方向帧)。
  // kDir 0=South/down, 1=West/left, 2=North/up, 3=East/right(palcommon.h:92-95)。
  // 之前不透传 → NPC 一律朝下(2026-05-28 user 发现苗人初始朝向不对)。
  if (eo.direction !== undefined) {
    npc.facing = (['down', 'left', 'up', 'right'] as const)[eo.direction] ?? 'down'
  }
  // P2#5:autoLabel = L_<globalIndex>(event-objects.json)→ autoCursor.ip 直接 = 全局下标(identity)。
  // 不再依赖 per-scene labelMap(每 scene 不同);全局 ip 与 scene 无关,一次解析处处有效。
  void labelMap
  if (eo.autoLabel) {
    npc.autoLabel = eo.autoLabel
    const ip = globalIpFromLabel(eo.autoLabel)
    if (ip !== undefined) npc.autoCursor = { ip }
  }
  return npc
}

/** P2#5:`L_<n>` → 全局下标 n(all.json 标签 = 数组下标恒等,0 违例)。非法 → undefined。 */
function globalIpFromLabel(label: string): number | undefined {
  if (!label.startsWith('L_')) return undefined
  const n = Number(label.slice(2))
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

/**
 * 当前 scene 的 event object 切片(忠实 sdlpal lprgEventObject[scene.eventObjectIndex..])。
 *
 * 元素是 `gs.allEventObjects` 的**引用** → 脚本(0x49/移动/0x9A 等)改动自动持久、重进保留
 *(李大娘走了/宝箱开了 都在)。首访时按**当前 scene labelMap**(gs.sceneLabelMap,loadSceneCommon
 * 已先设)延迟解析 autoCursor;已解析或已推进过的不重解(保留 autoscript 进度,sdlpal
 * wScriptOnAutoTrigger 持久)。
 *
 * 返回 undefined = 全局数组未加载(旧档 / 加载失败)→ 调用方兜底从 scene dump 重建(退化为非持久)。
 */
export function sliceSceneEventObjects(gs: GameState, wNumScene: number): NpcState[] | undefined {
  if (!gs.allEventObjects || !gs.sceneEventRanges) return undefined
  const range = gs.sceneEventRanges[wNumScene - 1]
  if (!range) return undefined
  const slice = gs.allEventObjects.slice(range[0], range[1])
  for (const npc of slice) {
    if (npc.autoCursor === undefined && npc.autoLabel) {
      const ip = globalIpFromLabel(npc.autoLabel) // P2#5:全局下标(identity),不再用 per-scene labelMap
      if (ip !== undefined) npc.autoCursor = { ip }
    }
  }
  return slice
}
