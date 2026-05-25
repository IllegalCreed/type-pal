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
}

export interface EventCursor {
  commands: Command[]
  labelMap: Record<string, number>
  ip: number
  /** EventSystem 暂停等待用户确认的原因;undefined = 非 waiting 状态。M2 只有 'dialog'。 */
  waiting?: 'dialog'
}

export interface DialogBoxState {
  text: string
  style: DialogBoxStyle
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
  sState: number          // kObjStateHidden=-1 / Normal=0 / Blocker=1 / Message=2 ...
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
  /** 相机像素坐标;SceneSystem 每 tick 跟随 party,带地图边界 clamp。 */
  camera: { x: number; y: number }
  npcs: NpcState[]
  /** 队伍成员 role id 列表(T14 占位,M3 dev fixture 决定默认填充)。 */
  partyMembers: number[]
  /** 持有物品(T21 item action 用),数量为 0 不剔除由 add/sub 命令决定。 */
  inventory: InventoryEntry[]
  mode: Mode
  eventCursor?: EventCursor
  dialogBox?: DialogBoxState
  /** 由 setDialogStyle* 命令累积。默认 'center'。 */
  currentDialogStyle: DialogBoxStyle
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
    camera: { x: partyStart.x, y: partyStart.y },
    npcs: [],
    partyMembers: [],
    inventory: [],
    mode: 'explore',
    currentDialogStyle: 'center',
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
export function npcFromEventObject(eo: SceneEventObject): NpcState {
  return {
    id: eo.id,
    x: eo.x,
    y: eo.y,
    spriteNum: eo.spriteNum,
    triggerLabel: eo.triggerLabel,
    triggerMode: eo.triggerMode,
  }
}
