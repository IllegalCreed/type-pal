/**
 * BattleState —— 战斗模式的局部 working state(M3 T16)。
 *
 * 从 GameState 派生(startBattle 时 createBattleState),战斗结束写回 GameState
 * (hp / mp / exp / cash 等)。设计:可变结构,T22 battle-system.ts 真消费。
 *
 * 字段对照 02 架构 §3 BattleState 列表;status / phase / uiState 三个枚举与
 * sdlpal `battle.h` / `fight.c` 概念对齐,但不一一映射(M3 只识别状态子集)。
 */

import type { BattleField, DialogBoxStyle, Enemy, EnemyPosTable, PlayerRoles } from '@type-pal/shared'
import type { GameState } from '../game-state.js'
import type { SeedableRng } from '../rng.js'
import type { SelectionMenuState } from '../menu/primitives.js'
import type { BattleSettlementState } from './battle-settlement.js'
import { getEnemyBasePos, getPlayerBasePos } from './battle-positions.js'
import type { ActionQueueItem } from './turn-queue.js'

/**
 * 战斗状态(sdlpal `global.h tagSTATUS` 真值 9 种,PAL_CLASSIC):
 *   Confused / Paralyzed / Sleep / Silence / Puppet / Bravery / Protect / Haste / DualAttack
 *   (+ Slow:revisited 模式独有,我们留兼容)。
 * **全是 WORD 计数器**(sdlpal `rgPlayerStatus[role][kStatusAll]`)= 剩余回合数(0 = 无效),
 * 回合末逐项 -1 递减(fight.c:1632-1638);消费方判 `> 0`;>999 = 装备永久效果(战末 ClearAll 保留)。
 */
export interface BattleStatus {
  sleep: number
  paralyzed: number
  confused: number
  haste: number
  slow: number
  // M5.B-w0.3 扩(全 optional 保 fixture 向后兼容,运行时用 ?? 0)。
  silence?: number
  puppet?: number
  bravery?: number
  protect?: number
  dualAttack?: number
}

/**
 * 队员的战斗状态视图。M3 通过 roleId 引用 PlayerRoles.roles[roleId] 的真实数据,
 * 这里只存战斗局部信息(prev 快照 / defend / status counter)。
 */
export interface BattlePlayer {
  /** PlayerRoles.roles 的 id(M3 fixture 时由 dev panel 填)。 */
  roleId: number
  /** 拷贝战前状态(用于动画 / 数字弹幕 比对)。 */
  prevHp: number
  prevMp: number
  /** PLAYER object 死亡 / 濒死脚本独立 HP 快照(PAL_BattleBackupStat 语义)。 */
  scriptPrevHp?: number
  /** 本轮是否在 defend。 */
  defending: boolean
  /**
   * D17a 物理战斗动画 render state(全 optional 兼容旧 fixture,运行时 ?? 默认)。
   * 对照 sdlpal `g_Battle.rgPlayer[i]`:
   *   pos          = 当前屏幕底锚(`PAL_POS`,动画期间逐帧 mutate;fight.c:2079-2262)
   *   posOriginal  = 站立底锚(动画结束 PAL_BattleUpdateFighters 复位 fight.c:945)
   *   currentFrame = F.MKF 精灵帧号(0 站立 / 1 濒死 / 2 死 / 3 防御 / 4 受击 / 8,9 攻击)
   *   iColorShift  = blit 低 nibble 偏移(受击 6;复位 0;palcommon.c:398-411)
   */
  pos?: { x: number; y: number }
  posOriginal?: { x: number; y: number }
  currentFrame?: number
  iColorShift?: number
  /**
   * D17 0x31:战斗精灵临时替换号(梦蛇295 scriptOnUse 变身;sdlpal script.c:0031
   * `rgEquipmentEffect[Extra].rgwSpriteNumInBattle[role]=op0`)。present 优先于 role.spriteNumInBattle 用此覆盖。
   * per-battle:存 BattleState → 随战斗结束自动清(= sdlpal Extra slot 战末清,语义等价)。
   */
  spriteNumOverride?: number
  /** 战斗状态计数器(sdlpal `rgPlayerStatus[role][kStatusAll]`)。详 BattleStatus。 */
  status: BattleStatus
}

/**
 * 敌人的战斗状态视图。e 字段是 enemies.json 的 shallow copy(health 在战斗中
 * 会被改,需独立副本不污染原数据)。3 个 script 字段从 OBJECT 数组的
 * OBJECT_ENEMY 派生,由 turnStart / ready / battleEnd 链路执行。
 */
export interface BattleEnemy {
  /** 拷贝 enemies.json 的完整 stats(战斗中 health 会被改)。 */
  e: Enemy
  /** 战斗状态计数器(sdlpal `g_Battle.rgEnemy[i].rgwStatus[kStatusAll]`)。详 BattleStatus。 */
  status: BattleStatus
  prevHp: number
  /**
   * 战斗开始时的满血(= 创建时 e.health,战中不变)。0x64 jump-if-HP-above-% 真值需稳定 maxHp
   * (sdlpal `gpGlobals->g.lprgEnemy[id].wHealth`),不能用逐回合更新的 prevHp 近似。
   * createBattleState 必设;optional 仅为旧 fixture 向后兼容(handler 用 ?? prevHp ?? e.health)。
   */
  maxHealth?: number
  /**
   * L25:OBJECT 数组绝对 index(= sdlpal `wObjectID`,battle.h:72 / battle.c:1716)。0x91「同种敌人」
   *   判定按此(script.c:2624 `rgEnemy[i].wObjectID == ...`),而非 `e.id`(wEnemyID)—— 同 wEnemyID
   *   可映射多个 OBJECT(如 enemyId 81→478/479)。createBattleState 从 `team.enemyObjectIndexes` 填
   *   (无精确对象号则 fallback enemyId);旧 fixture 不填,0x91 handler `objectId ?? e.id` 回退按 enemyId 比较。
   */
  objectId?: number
  /** 从 OBJECT 数组的 OBJECT_ENEMY 派生。 */
  scriptOnTurnStart: number
  scriptOnBattleEnd: number
  scriptOnReady: number
  /**
   * 敌人毒抗(OBJECT_ENEMY.wResistanceToSorcery,0-10)—— 0x28 apply poison
   * 的 `RandomLong(0,9) >= resistanceToSorcery` 抗性判定用。0 = 无抗(总中毒)。
   * createBattleState 必设;optional 仅为旧 fixture 向后兼容(handler 用 ?? 0)。
   */
  resistanceToSorcery?: number
  /**
   * 敌人当前所中的毒(对照 sdlpal `g_Battle.rgEnemy[].rgPoisons[MAX_POISONS]`)。
   * 每条 = { poisonId(毒种 object id), scriptEntry(该毒 wEnemyScript ip,每回合 tick 跑) }。
   * 0x28 apply 填、0x5E 查、postAction 毒 tick 逐条跑 scriptEntry 扣血。
   * createBattleState 必设 [];optional 仅为旧 fixture 向后兼容(handler 用 ?? [] / 懒初始化)。
   */
  poisons?: Array<{ poisonId: number; scriptEntry: number }>
  /**
   * 原版 `wObjectID==0` 的运行时空槽标记。敌人被 PostActionCheck 判死后置 true,
   * 表示该槽不再参与目标/全体效果/脚本,但 deathFadeStep 仍可保留给淡出渲染。
   * 0x9E 召唤和 0x9C 分裂会复用这种槽并清回 false。
   */
  defeated?: boolean
  /**
   * D17a 物理战斗动画 render state(全 optional 兼容旧 fixture,运行时 ?? 默认)。
   * 对照 sdlpal `g_Battle.rgEnemy[i]`:
   *   pos          = 当前屏幕底锚(冲刺 / 击退期间逐帧 mutate;fight.c:4987-5128)
   *   posOriginal  = idle 底锚(动画结束复位 fight.c:998/5127;= EnemyPos 表 + yPosOffset)
   *   currentFrame = ABC.MKF 精灵帧号(idle 0..idleFrames-1;攻击 idleFrames+magicFrames+k)
   *   iColorShift  = blit 低 nibble 偏移(受击 6;复位 0;fight.c:2206/4895)
   */
  pos?: { x: number; y: number }
  posOriginal?: { x: number; y: number }
  currentFrame?: number
  iColorShift?: number
  /** 敌方战斗精灵第 0 帧高度(PAL_RLEGetHeight(frame0)),用于命中特效逐像素落点。 */
  spriteFrameHeight?: number
  /**
   * D17 敌人死亡淡出步数(PAL_BattleFadeScene,battle.c:608-682)。
   *   undefined = 活着 / 尚未开始淡出(照常 idle / 动画渲染)
   *   0..71      = 淡出进行中(draw 走 crossfade blit,像素低 nibble 朝其下背景逼近)
   *   >= 72      = 已淡出完成(完全消失,不画)
   * checkEnemyDeaths 在 health<=0 且本字段 undefined 时置 0(开始淡出);
   * battleFade hold 分支按 elapsedMs/16 同步推进;resetFightersAfterAction 不覆盖。
   * sdlpal 真值:72 步(外 i=0..11 × 内 j=0..5),每步 16ms,共 1152ms。
   */
  deathFadeStep?: number
}

/**
 * 选好的一个战斗动作(进 performAction 阶段后逐个执行)。
 * actionId 仅对 magic / item 有效;target = -1 表示全体。
 */
export interface BattleAction {
  // sdlpal `battle.h:49-60` BATTLEACTIONTYPE 9 成员(无 Summon/Trance/Equip kBattleAction):
  //   Pass/Defend/Attack/Magic/CoopMagic/Flee/ThrowItem/UseItem/AttackMate。
  // W1(2026-06-01 死代码清理):summon/trance/equip-battle 不是独立 action —
  //   summon/trance 是 **magic 类型**(kMagicTypeSummon/Trance,走 performMagic defensive/summon 分支,
  //   见 actions/magic.ts);equip-battle 在 CLASSIC 战斗主菜单(4 图标:攻/法/合击/杂项)无入口。
  //   故从 BattleAction union 删除(保留 Magic['type']='trance'/'summon')。
  type:
    | 'attack'
    | 'defend'
    | 'magic'
    | 'item'
    | 'flee'
    | 'pass'
    // B1/D8:混乱队员攻随机活友军(sdlpal kBattleActionAttackMate,fight.c:3760-3853)。
    | 'attack-mate'
    | 'throw-item'
    // M5.B-w3.a:coop-magic 协力法术 — sdlpal `fight.c:PAL_BattleCheckCooperativeMagic`
    // 两 player 同 mainmenu confirm 时检测;actionId = cooperativeMagicId(来自
    // PlayerRoles.cooperativeMagic 字段,Sync.2 B-w0 已 dump)。
    | 'coop-magic'
  /** magic / item 的 id;attack/defend/flee 不用。throw-item = itemId。 */
  actionId?: number
  /** target 索引(0..4 或 0..N enemy);-1 = 全体。 */
  target: number
  /**
   * D18:目标方 —— 'enemy' = target 是 state.enemies 索引(攻击/攻击魔法/投掷);
   * 'player' = target 是 state.players(party)索引(治疗/辅助法术/治疗物品)。
   * sdlpal 真值:`action.sTarget` 单 number 域靠 wActionType+magic.flags 隐含目标方
   * (player-target uibattle.c:1344 / enemy-target uibattle.c:1327);ts number 域无法
   * 区分指向 player/enemy,需显式 targetSide。
   * **省略 / undefined = 'enemy'**(向后兼容:旧 action 全是敌方目标)。
   */
  targetSide?: 'enemy' | 'player'
}

/**
 * 战斗 phase 状态机(T22 真消费)。
 * preBattle → selectAction → performAction → postAction → (回 selectAction
 * 进下一轮 / 或转 won / lost / fleed 退出)。
 */
export type BattlePhase =
  | 'preBattle'
  | 'selectAction'
  | 'performAction'
  | 'postAction'
  | 'won'
  | 'lost'
  | 'fleed'

// ============================================================================
// D17a 物理战斗动画时间线(声明式 — anim-timeline.ts builder 产,tickPerformAction 驱动)
// ============================================================================

/**
 * 单个 fighter 在某一动画帧上的状态增量(只列要变的字段,缺省 = 不变)。
 * 对照 sdlpal `g_Battle.rg{Player,Enemy}[idx]` 的逐帧 mutate。
 */
export interface FighterDelta {
  side: 'player' | 'enemy'
  idx: number
  /** 新底锚屏幕坐标(冲刺 / 受击位移)。 */
  pos?: { x: number; y: number }
  /** 新精灵帧号(站立 / 攻击 / 受击 …)。 */
  currentFrame?: number
  /** 新 blit 低 nibble 偏移(受击 6;复位 0)。 */
  iColorShift?: number
  /**
   * 仅 player:切换战斗精灵覆盖号。number = 切到指定 sprite;null = 清除覆盖。
   * 用于梦蛇 Trance 在 colorShift 结束帧才 reload 到新战斗精灵。
   */
  spriteNumOverride?: number | null
}

/**
 * 一帧叠加的特效 sprite(物理攻击的 lpEffectSprite 命中特效 / 法术 FIRE.MKF sprite)。
 * present 层据 spriteChunk + frameIdx 取帧画到 (x,y)(sprite 之上 UI 之下)。
 *   - kind='effect':spriteChunk = DATA.MKF chunk 10 lpEffectSprite(物理攻击命中特效),
 *     present 走 assets.effectSprite。
 *   - kind='magic'(D17):spriteChunk = magic.wEffect(= FIRE.MKF chunk 号),
 *     present 走 assets.magicSprites.get(spriteChunk)。frameIdx = OffMagic 帧循环公式 k。
 *     落点 = magic.wType 落点 +(wXOffset,wYOffset)(fight.c:2742-2825)。
 */
export interface BattleAnimOverlay {
  kind: 'effect' | 'magic'
  /** present 解析的精灵 chunk(effect = DATA.MKF chunk 10;magic = FIRE.MKF chunk = magic.effect)。 */
  spriteChunk: number
  /** 该 chunk 内帧号(player attack = rgwBattleEffectIndex[sprite][1]*3 + i;magic = 帧循环 k)。 */
  frameIdx: number
  /** 落点屏幕坐标(blit 底中 anchor:x - w/2, y - h)。 */
  x: number
  y: number
}

/**
 * 一帧战斗动画(声明式)。durationMs = 该帧停留时长(= N × BATTLE_FRAME_TIME)。
 * 进入该帧时 tickPerformAction applyAnimFrame 把 fighters/overlay/damageNum/shake 应用到 state。
 */
export interface BattleAnimFrame {
  /** 该帧停留时长(ms;sdlpal PAL_BattleDelay(N) = N × 40ms)。 */
  durationMs: number
  /** 本帧要 mutate 的 fighter 增量。 */
  fighters?: FighterDelta[]
  /** 本帧叠加的单个特效 sprite(物理攻击 effect overlay;= state.battleAnim.overlay,供 present 画)。 */
  overlay?: BattleAnimOverlay
  /**
   * 本帧叠加的**多个**特效 sprite(D17 法术 AttackAll 三落点同帧;= state.battleAnim.overlays)。
   * 兼容原 `overlay`(单数):driver applyAnimFrame 把 overlay/overlays 都落到 battleAnim,
   * present 优先画 overlays(非空)否则画 overlay。单落点(Normal/Whole/Field)仍可用 overlays:[一条]。
   */
  overlays?: BattleAnimOverlay[]
  /** 本帧要弹的伤害数字(emit showDamageNum)。 */
  damageNum?: {
    target: { kind: 'enemy' | 'player'; idx: number }
    value: number
    color: 'yellow' | 'blue' | 'cyan'
  }
  /**
   * 本帧要弹的**多个**伤害数字 —— 物理群攻挥砍 i==0 帧遍历全敌弹各自数字
   * (sdlpal PAL_BattleDisplayStatChange fight.c:626-659,在 PAL_BattleShowPlayerAttackAnim i==0 调,
   *  fight.c:2209)。与单数 damageNum 并存:driver applyAnimFrame 两者都 emit。
   */
  damageNums?: Array<{
    target: { kind: 'enemy' | 'player'; idx: number }
    value: number
    color: 'yellow' | 'blue' | 'cyan'
  }>
  /** 本帧音效(present 播;本切片只存值)。 */
  sound?: number
  /**
   * 本帧战斗单行文字(sdlpal `PAL_BattleDelay(..., wObjectID)` 类文本)。
   * 进入该帧时由 driver emit `showBattleMessage`，用于逃跑失败等非 dialog-box 文本。
   */
  battleMessage?: { text: string; durationMs: number; pos?: { x: number; y: number } }
  /** 本帧屏幕抖动(screenShake;本切片只存值)。 */
  shake?: { time: number; level: number }
  /**
   * W4 屏波:本帧 wScreenWave 值(sdlpal 攻击魔法动画期间 wScreenWave += magic.wWave,末复位;
   * fight.c:2666-2667/2835)。陆战 base=0 → 帧值 = magic.wave。present 据此 applyScreenWave 扭曲战斗场景
   * (transient,不写 gs 存档字段)。0/缺 → 无屏波。
   */
  screenWave?: number
  /**
   * W4 keepEffect:本帧(攻击魔法末帧 + wKeepEffect==0xFFFF + wScreenWave<9)把 overlays 的魔法精灵
   * **烙进战斗背景**(sdlpal PAL_RLEBlitToSurface→lpBackground,fight.c:2757-2762)。driver 据此把本帧
   * overlays 追加到 state.persistentBgBlits(跨帧持久,present 每帧画在 bg 上,战斗结束清)。
   */
  keepEffect?: boolean
  /** 本帧召唤神演出状态(set → 隐队员改画召唤神;driver 落到 battleAnim.summon,present 读)。 */
  summon?: SummonFrameState
}

/**
 * 召唤神演出帧状态(sdlpal PAL_BattleShowPlayerSummonMagicAnim,fight.c:3072-3187)。
 * 帧设此 → present 隐藏全体队员、改画召唤神精灵(替换 battle.c:386-405 lpSummonSprite!=NULL 分支),
 * 并按 bgColorShift 给战斗背景低 nibble 染色(battle.c:63-67),fadeStep 时走 dither crossfade(淡入/淡出)。
 */
export interface SummonFrameState {
  /** 召唤神精灵 key(battleSprites 'player-{wSummonEffect+10}',F.MKF chunk)。 */
  spriteKey: string
  /** 当前帧 index(iSummonFrame)。 */
  frame: number
  /** 召唤神屏幕底锚(posSummon = 240+xOffset, 165+yOffset,fight.c:3143)。 */
  pos: { x: number; y: number }
  /** 背景染色低 nibble 偏移(sBackgroundColorShift = (SHORT)magic.effectTimes,fight.c:3145/63-67)。 */
  bgColorShift: number
  /** crossfade dither 步 0..71(淡入/淡出中);undefined = 全显不淡(loop / OffMagic 期)。 */
  fadeStep?: number
  /** fade 方向:'in' 队员→召唤神 / 'out' 召唤神→队员(PAL_BattleFadeScene 双向)。 */
  fadeDir?: 'in' | 'out'
}

export interface BattleAnimAfterPerformItem {
  kind: 'perform-item'
  actorIdx: number
  actionId: number
  targetIdx: number | 'all'
  targetIsEnemy: boolean
}

export type BattleAnimAfterComplete = BattleAnimAfterPerformItem

/** 当前正在播放的动画时间线(performAction 期间存在;播完置 undefined)。 */
export interface BattleAnimState {
  frames: BattleAnimFrame[]
  /** 当前帧 index。 */
  idx: number
  /** 当前帧已播放时长(ms)。 */
  frameElapsedMs: number
  /** 当前帧召唤神演出状态(set → present 改画召唤神替换队员;无则正常画队员)。 */
  summon?: SummonFrameState
  /** 本动画含召唤 crossfade(buildAndStartSummonAnim 置)→ present 才在非 fade 帧快照场景供 fade 起手。 */
  hasSummonFade?: boolean
  /** 当前帧单个 effect overlay(供 present 画;无则 undefined)。 */
  overlay?: BattleAnimOverlay
  /** 当前帧多个 magic overlay(AttackAll 三落点;present 优先画此,非空时盖过 overlay)。 */
  overlays?: BattleAnimOverlay[]
  /**
   * 时间线**播完后**才 emit 的兜底伤害数字(掉血/MP 弹幕)。
   * 攻击/召唤法术的 `PAL_BattleDisplayStatChange()` 应挂 PostMagic 第一帧(frame.damageNums),
   * 因为 SDLPal 在 OffMagic 后、PostMagic 前/开始显示;物理攻击也在命中帧 emit(frame.damageNum)。
   * DefMagic / 投掷等没有 PostMagic 的链仍可用这里,由 tickPerformAction 在 idx 越界那刻 emit。
   */
  pendingDamageNums?: Array<{
    target: { kind: 'enemy' | 'player'; idx: number }
    value: number
    color: 'yellow' | 'blue' | 'cyan'
  }>
  /**
   * 少数 SDLPal 动作是「先播前摇,再执行脚本/结算」。当前仅 UseItem 用:
   * fight.c:4385 先 PAL_BattleShowPlayerUseItemAnim,随后 4387-4400 跑脚本并扣 consuming。
   */
  afterComplete?: BattleAnimAfterComplete
}

/**
 * UI 状态 —— 1:1 对照 sdlpal `BATTLEUISTATE`(uibattle.h:28-36)+ ts 专用 'hidden'。
 *   wait               = kBattleUIWait(等下一个 ready 队员;advance 直接接管,ts 多为过渡态)
 *   selectMove         = kBattleUISelectMove(主菜单 4 图标 + menuState 子状态)
 *   selectTargetEnemy  = kBattleUISelectTargetEnemy(选单个敌人)
 *   selectTargetPlayer = kBattleUISelectTargetPlayer(选单个队员)
 *   selectTargetEnemyAll  = kBattleUISelectTargetEnemyAll(CLASSIC 不选,即时 commit)
 *   selectTargetPlayerAll = kBattleUISelectTargetPlayerAll(CLASSIC 不选,即时 commit)
 *   hidden             = 非选择阶段(perform/post)不画菜单(ts 专用)
 */
export type BattleUIState =
  | 'wait'
  | 'selectMove'
  | 'selectTargetEnemy'
  | 'selectTargetPlayer'
  | 'selectTargetEnemyAll'
  | 'selectTargetPlayerAll'
  | 'hidden'

/**
 * 主菜单子状态 —— 1:1 对照 sdlpal `BATTLEMENUSTATE`(uibattle.h:38-46),
 * **仅 uiState==='selectMove' 时有意义**。
 *   main            = kBattleMenuMain(4 图标主菜单)
 *   magicSelect     = kBattleMenuMagicSelect(法术选择网格)
 *   useItemSelect   = kBattleMenuUseItemSelect(使用物品网格,目标=队友)
 *   throwItemSelect = kBattleMenuThrowItemSelect(投掷物品网格,目标=敌方)
 *   misc            = kBattleMenuMisc(杂项盒:围攻/道具/防御/逃跑/状态)
 *   miscItemSubMenu = kBattleMenuMiscItemSubMenu(物品二级:使用/投掷)
 */
export type BattleMenuState =
  | 'main'
  | 'magicSelect'
  | 'useItemSelect'
  | 'throwItemSelect'
  | 'misc'
  | 'miscItemSubMenu'

export interface BattleState {
  players: BattlePlayer[]
  enemies: BattleEnemy[]
  field: BattleField
  isBoss: boolean
  phase: BattlePhase
  /** 当前轮(每轮 ActionQueue 重排)。 */
  turn: number
  actionQueue: ActionQueueItem[]
  /** actionQueue 推进游标。 */
  currentActionIndex: number
  /** select-action 阶段:还在选哪个队员(undefined 表示已全选完)。 */
  selectingPlayerIdx?: number
  /** 队员已选好的 action(进 performAction 后逐个执行)。 */
  pendingActions: Map<number, BattleAction>
  /**
   * 半成品 action:攻击 / 法术 / 物品 在 mainMenu Confirm 后但还没选 target 时暂存
   * 这里(T13 写入,T14 二级菜单 / targetSelect 完成后落 pendingActions)。
   * 完整 BattleAction.target 必填,这里允许缺(尚未选 target)。
   */
  pendingActionDraft?: {
    type: BattleAction['type']
    actionId?: number
    target?: number
    /**
     * D18:目标方(同 BattleAction.targetSide)。mainMenu/二级菜单 Confirm 后按
     * sdlpal magic.flags.usableToEnemy / item kItemFlagApplyToAll 设;
     * handleTargetSelectInput 据此分敌方域 / 友方域导航。省略 = 'enemy'。
     */
    targetSide?: 'enemy' | 'player'
  }
  /** UI 状态(= sdlpal g_Battle.UI.state)。 */
  uiState: BattleUIState
  /**
   * 主菜单子状态(= sdlpal g_Battle.UI.MenuState),仅 uiState==='selectMove' 时有意义。
   * createBattleState 初值 'main';preBattle/换队员 PlayerReady 重置 'main'。
   */
  menuState: BattleMenuState
  /**
   * 主菜单 4 图标当前选中(= sdlpal g_Battle.UI.wSelectedAction):0攻击 1法术 2合击 3杂项。
   * 方向键直接设值(uibattle.c:1034-1055),非线性光标。
   */
  selectedAction: number
  /** 通用选择光标(target 索引 = sdlpal iSelectedIndex;旧 uiCursor 语义保留)。 */
  uiCursor: number
  /**
   * 杂项盒光标(= sdlpal g_iCurMiscMenuItem)。**进菜单不重置、跨次持久**
   * (sdlpal uibattle.c:1162 `//disabled due to not same as both original version`)。
   */
  miscMenuCursor: number
  /** 物品二级光标(= sdlpal g_iCurSubMenuItem),同样持久(uibattle.c:1374 `//disabled`)。 */
  miscSubMenuCursor: number
  /**
   * 当前法术选择网格状态(进 magicSelect 时 createMagicSelectMenu 建;退出清)。
   * = sdlpal magicmenu.c 的 g_iCurrentItem / rgMagicItem(战斗与大世界共用 PAL_MagicSelectionMenuUpdate)。
   */
  magicSelect?: SelectionMenuState
  /** 当前物品选择网格状态(进 useItemSelect/throwItemSelect 时建;退出清)。 */
  itemSelect?: SelectionMenuState
  /**
   * 围攻 / Auto 键开启的自动攻击(= sdlpal g_Battle.UI.fAutoAttack)。开 → 每队员起手自动
   * 攻击(自动目标),Menu/Auto 键关。createBattleState 必设 false;optional 仅向后兼容。
   */
  fAutoAttack?: boolean
  /**
   * M7(2026-06-07 sdlpal 审查):本轮按过 Force/Repeat 的整队粘滞标志(= sdlpal g_Battle.fForce/fRepeat,
   * fight.c:1780/1785/1789-1796)。开 → 本轮剩余待选队员都自动按 强行 / 重提;全员填完或 Menu/Cancel 取消时清。
   */
  fForce?: boolean
  fRepeat?: boolean
  /**
   * 持久自动战斗(= sdlpal gpGlobals->fAutoBattle,0x8A 剧情脚本设)。开 → 整场每队员自动
   * 选最强法术或物理(PickAutoMagic 阈值 9999,uibattle.c:839-878),**单场有效**(战斗结束
   * finalizeBattleCleanup 清 gs.fAutoBattle,script.c:3332)。与 fAutoAttack 区别:后者 A 键单回合纯物理、
   * 可 Menu 关;前者整场自动会选法术、不可手动关。createBattleState 从 gs.fAutoBattle seed。
   */
  fAutoBattle?: boolean
  /**
   * 上一轮每队员已 commit 的 action 快照(= sdlpal prevAction)。全员动作决定、填 actionQueue 前备份;
   * Repeat(R 键)重提上一轮 action(sdlpal kKeyRepeat → CommitAction(TRUE))。
   */
  prevActions?: Map<number, BattleAction>
  /**
   * 本轮选择中是否按过 Repeat。sdlpal `g_Battle.fRepeat` 在填 actionQueue 前阻止 prevAction 备份,
   * 避免 R 重提把原始缓存覆盖掉。
   */
  repeatSelectionActive?: boolean
  /**
   * 目标光标上次悬停的敌人 index(sdlpal `g_Battle.UI.iPrevEnemyTarget`)。
   * perform 前 selectAutoTargetFrom 重选目标时优先用它(若仍活)。targetSelect UI 设;
   * optional 兼容旧 fixture(未设 → -1 fallback 到首个活敌)。
   */
  iPrevEnemyTarget?: number
  expGained: number
  cashGained: number
  rng: SeedableRng
  /** 防卡死:phase 卡 60s tickBattle 报错跳出(T22 用)。 */
  phaseStallTicks: number
  /**
   * 队伍隐身计时(sdlpal `g_Battle.iHidingTime`)—— 0x5C hide 设 `-op0`。>0 时敌方
   * 跳过瞄准队员 / 0x9E·0x9F 召唤·变身失败。createBattleState 必设 0;optional 仅向后兼容。
   */
  iHidingTime?: number
  /**
   * 吹飞强度(sdlpal `g_Battle.iBlow`)—— 0x6B blow 设 op0。敌方行动时按 RandomLong(0,iBlow)
   * 位移击退(present 消费;本层只存值)。createBattleState 必设 0;optional 仅向后兼容。
   */
  iBlow?: number
  /**
   * D17a:当前 performAction 正在播放的物理战斗动画时间线。
   * 存在 → tickPerformAction 逐 tick 推进 frames、播完复位 fighters + currentActionIndex++;
   * undefined → 无 active 时间线,起下一个 action(未建时间线的 action 即时推进,向后兼容)。
   */
  battleAnim?: BattleAnimState
  /**
   * W4 keepEffect:被"烙进背景"的魔法精灵(sdlpal lpBackground 的永久 blit,fight.c:2757-2762)。
   * 每条 = { spriteChunk, frameIdx, x, y }(x/y = overlay 底中锚)。present 每帧在战斗背景上画这些(精灵之下),
   * 直到战斗结束。startBattle 清空(每场重置)。undefined/空 = 无烙背景。
   */
  persistentBgBlits?: Array<{ spriteChunk: number; frameIdx: number; x: number; y: number }>
  /**
   * D19 战斗入场 dither fade-in(sdlpal `PAL_BattleFadeScene`,battle.c:609-680)。step/total = 进度;
   * preBattle phase 期间 gate 输入(fade 完才进 selectAction),present-battle 据此把战斗场景从入场前的
   * 大世界帧 nibble-dither 揭示出来。完成 → 清。undefined = 无入场淡入(已进战斗 / 单测)。
   */
  introFade?: { step: number; total: number }
  /**
   * 逃跑动画 hold(sdlpal `PAL_BattlePlayerEscape`,battle.c:1438-1527)。flee roll 成功 → 设
   * { step: 0 };tickBattleFleeAnim 每 tick 把活队员往右下挪(当前实现按用户实测取统一右下位移),
   * 16 步后全员移出屏(9999,9999)→ phase='fleed' → finalize。undefined = 无逃跑动画。
   */
  fleeAnim?: { step: number }
  /**
   * D13 敌人主动逃飞出屏(sdlpal `PAL_BattleEnemyEscape`,battle.c:1399-1434)。0x69 opcode 设 { step:0 } →
   * tickBattleEnemyEscapeAnim 每 tick 把全体活敌往**左**挪(x-=ENEMY_FLYOUT_DX,y 不变),全部移出左屏 →
   * phase='fleed'(Terminated 无奖励;**不**改 health 避免误给 exp)。undefined = 无敌逃动画。
   */
  enemyEscapeAnim?: { step: number; holdTicks?: number }
  /**
   * 敌人逃跑(opcode 105 PAL_BattleEnemyEscape)完成标记 —— 区分 sdlpal kBattleResultTerminated(0,敌逃/
   * 脚本终止)与 kBattleResultFleed(0xFFFF,玩家逃)。两者 phase 都落 'fleed',但 finalize 据此把 outcome
   * 定为 'terminated'(→ opcode 7 续跑 wonIp,如草妖剧本的 opcode82 隐藏怪),而非 'fled'(→ fledIp)。
   */
  terminatedByEnemyEscape?: boolean
  /**
   * D17 敌人死亡淡出 hold(PAL_BattleFadeScene,fight.c:889-893 + battle.c:608-682)。
   * 某 action 后有新死敌 → checkEnemyDeaths 开启 { elapsedMs: 0 };tickPerformAction 的
   * fade 分支按 BATTLE_DT 累 elapsedMs、推进所有淡出中敌人的 deathFadeStep(= floor(elapsedMs/16),
   * cap 72)。step 到 72 → 死敌 deathFadeStep=72(隐)、清 battleFade、currentActionIndex++。
   * 淡出期间**暂停**战斗推进(忠实 sdlpal:fade 是同步 72×16ms blocking loop)。
   * undefined = 无 active 淡出。
   */
  battleFade?: { elapsedMs: number }
  /**
   * 战斗内对话队列(战斗脚本 0xFFFF showDialog;scriptOnReady / scriptOnTurnStart 等)。
   * runScript(battle) 同步跑完时把 dialog 行收集进此队列;tickBattleDialog hold 逐 tick 把队列
   * 喂进**复用的大世界** gs.dialogBox(startDialogLine/appendDialogLine + page/end-key + 渲染),
   * 期间**暂停**战斗推进(忠实 sdlpal PAL_ShowDialogText 同步 blocking,text.c:1701)。
   * CLASSIC 真值:battle dialog 走普通 dialog box(text.c:1660-1772),#ifndef PAL_CLASSIC 的
   * 战斗飘字 PAL_BattleUIShowText 在 classic build 被编译掉。空/undefined = 无待显对话。
   */
  battleDialogQueue?: BattleDialogLine[]
  /** typing 节拍累加器:BATTLE_DT(40ms) 累到 FRAME_MS_EXPLORE(100ms) 才 tickDialog 一次,保打字速率与大世界一致。 */
  battleDialogTypingAccMs?: number
  /** narration 风格自动消失帧计(复用大世界 NARRATION_AUTO_DISMISS_FRAMES,达到 → 自动翻过)。 */
  battleDialogNarrationFrames?: number
  /** setDialogStyle*(battle)累积的当前对话风格,下条 showDialog 入队时取。undefined = 默认 'bottom'。 */
  battleDialogStyle?: { style: DialogBoxStyle, portrait?: number, fontColor?: number }
  /** 0x05/0x8E ClearDialog 置真 → 下条 showDialog 入队标 clearBefore(另起新框),入队后清。 */
  battleDialogPendingClear?: boolean
  /**
   * 已跑过 scriptOnTurnStart 的轮次(= state.turn)。tickPerformAction 每轮起手对全体活敌跑一次
   * wScriptOnTurnStart(sdlpal fight.c:1184-1191 fTurnStart gate,每轮一次,行动前),boss 嘲讽对话
   * 由此入队。!== state.turn → 本轮还没跑。对话 hold 暂停期间重入也不重跑(guard)。
   */
  turnStartDoneForTurn?: number
  /**
   * D11b 战斗胜利结算演出(PAL_BattleWon 多屏 PAL_WaitForAnyKey 序列)。phase==='won' 首 tick
   * 处理战果(回写 HP/MP + 升级 + cash)后建;顶层 tickBattleSettlement hold 逐屏等键/超时翻,
   * 放完 → Phase E scriptOnBattleEnd(可排入 battleDialogQueue)→ Phase F 半血恢复 + finalize → explore。
   * undefined = 未进入结算 / 非 won。
   */
  settlement?: BattleSettlementState
}

/**
 * 战斗内对话一行(0xFFFF showDialog 收集 → 复用大世界 dialog 渲染)。
 * 对照 sdlpal `PAL_ShowDialogText(PAL_GetMsg(op0))`(script.c:3463)+ 前置 PAL_StartDialog 风格。
 */
export interface BattleDialogLine {
  /** 原始文本(含控制符,parseDialogText 解析逐字符上色 / 变速 / 尾暂停)。effect 条目无此字段。 */
  text?: string
  /** dialog 风格(setDialogStyle* 决定:top/bottom/center/narration)。effect 条目无关。 */
  style?: DialogBoxStyle
  /** 头像 icon(RGM.MKF chunk;setDialogStyle arg0)。 */
  portrait?: number
  /** 字色(setDialogStyle arg1;默认 0x4F)。 */
  fontColor?: number
  /** 此行前需清屏另起新框(0x05/0x8E ClearDialog → 上一段 dialog 结束、重开)。 */
  clearBefore?: boolean
  /**
   * D26(2b):dialog 序列中**内联可见 effect**(目前仅 0x69 敌逃跑动画)。runScript 同步收集对话时,
   * 夹在 dialog 之间的可见 effect 若立即跑会错序(逃跑动画跑在嘲讽台词之前)→ 改入队按位置保序;
   * tickBattleDialog 处理到此条目时 dispatch,保 sdlpal 真值时序(嘲讽对话→逃跑动画→narration)。
   * 非 undefined 时本条目是 effect 而非 dialog(无 text)。
   */
  effect?: { opcode: number; operands: readonly number[] }
}

export interface CreateBattleStateInput {
  gs: GameState
  playerRoles: PlayerRoles
  /** 已 expand 自 enemyTeam(slot 解引用 + 0xFFFF 过滤过)。 */
  enemies: Enemy[]
  /**
   * M5.B-w2.a:每只 enemy 的 AI script hook(同 index 对齐 enemies 数组)。
   * 字段对应 sdlpal `OBJECT_ENEMY.wScriptOn*` 真值;0 = 无脚本(走 default
   * `decideEnemyAction` C 代码 fallback)。
   * 不传或 length 不足 → 全部按 0 处理(向后兼容旧 fixture / 测试)。
   */
  enemyScripts?: Array<{
    onTurnStart: number
    onReady: number
    onBattleEnd: number
    resistanceToSorcery?: number
    /** L25:OBJECT 绝对 index(wObjectID),0x91 同种判定用;缺省回退 enemyId。 */
    objectId?: number
  }>
  /** enemyId → ABC.MKF frame0 height(PAL_RLEGetHeight),缺省兼容旧 fixture。 */
  enemySpriteFrameHeights?: Map<number, number>
  field: BattleField
  isBoss: boolean
  rng: SeedableRng
  /**
   * D17a:ENEMYPOS table(DATA.MKF chunk 13)— enemy 初始 pos/posOriginal 用
   * (battle.c:936-939 layouts[count-1][i] + yPosOffset)。缺则 fallback 表(向后兼容旧 fixture)。
   */
  enemyPos?: EnemyPosTable
}

/**
 * 从 GameState + fixture 派生一个新的 BattleState。
 *
 * - players 按 gs.partyMembers 顺序构造,每个 roleId 必须落在 playerRoles.roles
 *   中(找不到抛错防 fixture 错配)。
 * - enemies 每条 shallow copy `e`,health 在战斗中会被改,避免污染原 JSON 数据。
 * - phase 起点 = 'preBattle',turn = 0,uiState = 'hidden'(T22 进入后再 advance)。
 */
/** sdlpal `battle.c:27` 真值:`g_rgPlayerPos[3][3][2]` — 战斗时最多 3 player。
 *  party 可有 5(MAX_PLAYABLE_PLAYER_ROLES),但战斗 layout 只 3 位。 */
export const MAX_BATTLE_PLAYERS = 3

/**
 * D14:把持久 `gs.rgPlayerStatus[role]`(CLASSIC kStatus 序 9 项)seed 成战斗 BattleStatus。
 * 索引序对齐 global.h:42-55:0 Confused/1 Paralyzed/2 Sleep/3 Silence/4 Puppet/
 * 5 Bravery/6 Protect/7 Haste/8 DualAttack(CLASSIC 无 Slow,留 0)。
 * 持久层只承载装备授状态(value>999),其余战斗局部状态仍每场新建(B1)。
 */
function seedBattleStatus(persistent: number[] | undefined): BattleStatus {
  const p = persistent
  return {
    confused: p?.[0] ?? 0,
    paralyzed: p?.[1] ?? 0,
    sleep: p?.[2] ?? 0,
    silence: p?.[3] ?? 0,
    puppet: p?.[4] ?? 0,
    bravery: p?.[5] ?? 0,
    protect: p?.[6] ?? 0,
    haste: p?.[7] ?? 0,
    dualAttack: p?.[8] ?? 0,
    slow: 0,
  }
}

export function createBattleState(input: CreateBattleStateInput): BattleState {
  if (input.gs.partyMembers.length > MAX_BATTLE_PLAYERS) {
    throw new Error(
      `createBattleState: partyMembers.length=${input.gs.partyMembers.length} > ${MAX_BATTLE_PLAYERS}` +
        `(sdlpal g_rgPlayerPos[3][3][2] 真值:战斗最多 3 player)`,
    )
  }
  const partyCount = input.gs.partyMembers.length
  const players: BattlePlayer[] = input.gs.partyMembers.map((roleId, i) => {
    const role = input.playerRoles.roles[roleId]
    if (!role) throw new Error(`createBattleState: role id ${roleId} not in PlayerRoles`)
    // D17a:站立底锚 = g_rgPlayerPos[count-1][i](battle.c:27);pos = posOriginal;
    // currentFrame=0(站立);iColorShift=0。idx 越界 → undefined(渲染层照旧兜底)。
    const base = getPlayerBasePos(partyCount, i)
    return {
      roleId,
      prevHp: role.hp,
      prevMp: role.mp,
      scriptPrevHp: role.hp,
      defending: false,
      // D14:从持久 gs.rgPlayerStatus[role] seed 装备授状态(DualAttack 等);无 → 全 0。
      status: seedBattleStatus(input.gs.rgPlayerStatus?.[roleId]),
      pos: base ? { ...base } : undefined,
      posOriginal: base ? { ...base } : undefined,
      currentFrame: 0,
      iColorShift: 0,
    }
  })

  const enemyCount = input.enemies.length
  const enemies: BattleEnemy[] = input.enemies.map((e, i) => {
    const scripts = input.enemyScripts?.[i]
    // D17a:idle 底锚 = EnemyPos.pos[i][maxEnemyIndex] + yPosOffset(battle.c:936-939)。
    const base = getEnemyBasePos(input.enemyPos, enemyCount, i, e.yPosOffset ?? 0)
    return {
      e: { ...e }, // shallow copy(health 在战斗中会被改)
      status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
      prevHp: e.health,
      maxHealth: e.health, // 战中不变的满血(0x64 真值用)
      // L25:对象身份(wObjectID)。精确对象号缺省时 fallback enemyId —— 此时与 e.id 同值,
      //   0x91 比较退化为旧"同 enemyId=同种"行为(对无对象身份信息的数据是唯一合理近似)。
      objectId: scripts?.objectId ?? e.id,
      scriptOnTurnStart: scripts?.onTurnStart ?? 0,
      scriptOnBattleEnd: scripts?.onBattleEnd ?? 0,
      scriptOnReady: scripts?.onReady ?? 0,
      resistanceToSorcery: scripts?.resistanceToSorcery ?? 0,
      poisons: [],
      pos: base ? { ...base } : undefined,
      posOriginal: base ? { ...base } : undefined,
      spriteFrameHeight: input.enemySpriteFrameHeights?.get(e.id),
      // 敌人 idle 期 currentFrame **保持 undefined** → draw 走 idle 时钟轮播
      //   (computeIdleFrameIndex,D17c)。动画期 anim-timeline 才置攻击帧号,
      //   resetFightersAfterAction 复位回 undefined。置 0 会冻结 idle 轮播(回归)。
      currentFrame: undefined,
      iColorShift: 0,
    }
  })

  return {
    players,
    enemies,
    field: input.field,
    isBoss: input.isBoss,
    phase: 'preBattle',
    turn: 0,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    menuState: 'main',
    selectedAction: 0,
    uiCursor: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    fAutoAttack: false,
    fForce: false,
    fRepeat: false,
    fAutoBattle: input.gs.fAutoBattle ?? false, // B4(3):0x8A 持久 flag seed 进战斗
    prevActions: new Map(),
    expGained: 0,
    cashGained: 0,
    rng: input.rng,
    phaseStallTicks: 0,
    iHidingTime: 0,
    iBlow: 0,
  }
}
