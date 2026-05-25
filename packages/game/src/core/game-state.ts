/**
 * GameState —— 探索 / 事件 / 战斗模式下的单一真相源(02 架构 + D6)。
 * M2 覆盖 explore / event;M3 (T14) 加 battle option(tickBattle 真实现 T22)。
 * M5 Sync.1:全字段冻结(SAVEDGAME_WIN 倒推 typed)。
 */

import type { Command, DialogBoxStyle, Palette, SceneEventObject } from '@type-pal/shared'
import type { BattleState } from './battle/battle-state.js'

export type Facing = 'up' | 'down' | 'left' | 'right'

/**
 * 队友 trail 记录项(P0.d:port sdlpal global.h rgTrail[5])。
 * 移动前 leader 的世界像素坐标 + 方向,供跟随者占位使用。
 */
export interface TrailEntry {
  x: number
  y: number
  dir: Facing
}

export type Mode = 'explore' | 'event' | 'battle'

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
   * sdlpal `EventObject.sLayer` —— 渲染 z 层(sort + cover tile 算法都用)。
   * scene.c:302 `y += sLayer * 8 + 9`(sort key)、scene.c:316 `iLayer = sLayer * 8 + 2`。
   * 装饰类 sprite(地板 / 桌椅等)常用非 0 sLayer 决定与人物的 z 关系。
   * undefined = 0(向后兼容旧 fixture)。
   */
  sLayer?: number
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
  }
}

export interface EventCursor {
  commands: Command[]
  labelMap: Record<string, number>
  ip: number
  /**
   * EventSystem 暂停等待原因。undefined = 非 waiting 状态。
   *  - 'dialog':      等对话(typing / page-key / end-key,由 dialog-box 状态机管)
   *  - 'frame-wait':  opcode 0x0009 wait N frames(sdlpal script.c:3593-3604)
   *  - 'fade-screen': opcode 0x0073 fade-in 完(Sync.2 fix9,由 gs.fadeState 管)
   *  - 'scene-load': opcode 0x0059 loadScene 异步切场景(bootstrap callback fetch + setSceneContext +
   *                  写 gs.eventCursor 到新 scene 的 onEnterLabel ip,释放 waiting,下一帧 tick 接管)
   */
  waiting?: 'dialog' | 'frame-wait' | 'fade-screen' | 'scene-load'
  /** 'frame-wait' 用:剩余帧数,每 tick 自减,归 0 时 ip++ + clear waiting。 */
  waitFramesRemaining?: number
  /**
   * 当前执行 trigger 的 event object id(sdlpal `wEventObjectID` / `pCurrent`)。
   * setObjectPosition / walkOneStep 等 opcode 默认 operate on this 当 operand[0]==0 时。
   * tickSceneSystem 触发 NPC trigger 时设;此后所有 opcode 内 self = npcs[id-1]。
   */
  currentEventObjectId?: number
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
  /** 当前正在 typing 的那行文本(若 phase='typing'/'line-done')。 */
  currentLineText: string | null
  /** 当前行已经过的 frame 数。 */
  typingFrames: number
  /** 当前行已显字符数 = min(floor(typingFrames / FRAMES_PER_CHAR), currentLineText.length)。 */
  charsRevealed: number
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
 * sdlpal global.h `EXPERIENCE` struct(tagEXPERIENCE)。
 * 每类经验对应一个 ExpEntry:wExp 当前累积值,wLevel 当前等级。
 * `wReserved` 和 `wCount` 仅供兼容,运行时不需要。
 */
export interface ExpEntry {
  wExp: number    // 当前累积经验
  wLevel: number  // 等级
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
   * sdlpal `gpGlobals->fEnteringScene` 真值:loadScene opcode 设 TRUE → `PAL_StartFrame`
   * 早期 return(不调 PAL_MakeScene)→ **屏幕冻结**在 loadScene 前那一帧,直到下个
   * fadeScreen opcode 启动 backup 时屏幕仍是冻结画面(=旧 scene + dialog)。
   *
   * 我们 port:sceneLoader callback 设 fEnteringScene=true → present.ts 跳过 render
   * (fb 保留上一帧 = dream 渲染)→ ip=371 fadeScreen 启动 backupPixels = fb.indices
   * 含 dream 像素 → fade 视觉 dream 渐变到 inn。
   *
   * fadeScreen handler 设 fEnteringScene=false 让 render 恢复。
   */
  fEnteringScene?: boolean

  // ── SAVEDGAME_WIN 倒推: 平铺全局杂项 ───────────────────────────────────────

  /**
   * 存档次数(sdlpal SAVEDGAME_WIN.wSavedTimes)。
   * 每次调用 PAL_SaveGame 递增。
   */
  wSavedTimes: number

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
   * 当前 BGM id(sdlpal global.h:534 `wNumMusic`)。
   *
   * P0.e:opcode 0x43 `playMusic` 写入。M6 接真播,本阶段只记字段值供 sync 校验。
   */
  wNumMusic: number

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
   * Scene 运行时可变状态(sdlpal SAVEDGAME_WIN.rgScene[MAX_SCENES])。
   * 稀疏存:sceneId → state,只存被 script 改过的 scene。
   */
  rgScene: Record<number, SceneStateMutable>

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
  return { wExp: 0, wLevel: 0 }
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

/** 创建全零 PlayerRolesRuntime(MAX_PLAYER_ROLES=6 角色)。 */
function createInitialPlayerRolesRuntime(): PlayerRolesRuntime {
  const n = 6 // MAX_PLAYER_ROLES
  const zeros = () => Array<number>(n).fill(0)
  const mat = (rows: number) => Array.from({ length: rows }, zeros)
  return {
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

export function createInitialGameState(
  partyStart: { x: number; y: number; facing: Facing },
): GameState {
  return {
    // ── 既有字段 ──
    party: { x: partyStart.x, y: partyStart.y, facing: partyStart.facing },
    partyScriptedFrame: {},
    camera: { x: partyStart.x, y: partyStart.y },
    npcs: [],
    partyMembers: [],
    inventory: [],
    mode: 'explore',
    currentDialogStyle: 'center',
    // sdlpal text.c:29 FONT_COLOR_DEFAULT = 0x4F(palette idx 79,亮黄/浅米)
    currentDialogFontColor: 0x4F,
    frameNum: 0,
    walkingFrame: { stepFrame: 0, walking: false },
    trail: [],

    // ── M5 Sync.1: SAVEDGAME_WIN 平铺杂项 ──
    wSavedTimes: 0,
    wNumScene: 0,
    wPaletteOffset: 0,
    wNumMusic: 0,
    wNumBattleMusic: 0,
    wNumBattleField: 0,
    wScreenWave: 0,
    wBattleSpeed: 2,      // sdlpal global.c:765 default = 2
    wCollectValue: 0,
    wLayer: 0,
    wChaseRange: 1,       // sdlpal default 追击范围 1
    wChasespeedChangeCycles: 0,
    nFollower: 0,
    dwCash: 0,

    // ── M5 Sync.1: 嵌套 struct ──
    Exp: createEmptyExp(),
    PlayerRolesRuntime: createInitialPlayerRolesRuntime(),
    rgPoisonStatus: {},
    rgScene: {},
    rgObject: {},
    rgEventObject: {},
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
  }
  // resolve autoLabel → autoCursor.ip(scene 加载时调用方传 labelMap)
  // sdlpal `wAutoScript != 0 && sState > 0` → autoScript 每帧跑;NPC dump 里 autoLabel 非空才有。
  if (eo.autoLabel && labelMap) {
    const ip = labelMap[eo.autoLabel]
    if (ip !== undefined) {
      npc.autoCursor = { ip }
    }
  }
  return npc
}
