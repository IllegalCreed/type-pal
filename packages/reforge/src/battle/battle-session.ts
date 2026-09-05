/**
 * BattleSession(M4b-2)—— 封装一场可玩战斗:battle-core 状态机 + 指令菜单 UI +
 * 节奏化结算(逐 action 播 + 伤害飘字)+ 胜负收尾。
 *
 * main.ts 的 host.startBattle 创建它,主循环转发 tick/render,await done 拿结果续脚本。
 * M4b-2 指令集:攻击/防御/逃跑(仙术/物品 = M4b-3 与动画一起);渲染 = 静态帧 + 飘字。
 */

import type {
  ActivePoison,
  AssetId,
  BattleChoreographyAction,
  BattleSpriteProfileKind,
  BattleStatus,
  EnemyDef,
  EnemyHookChannel,
  LevelGrowthDelta,
  PlayerFighterFrames,
  SkillData,
  SoundAssetRole,
  WorldState,
} from '@type-pal/content'
import {
  canAct,
  checkThrowSpec,
  evalAiCond,
  isPlayerDying,
  itemUseSupportsContext,
  lookupText,
  POISON_CURE_RANK,
  resolveSkillExecution,
} from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import {
  bakeBgImageData,
  type GlyphTable,
  type LoadedBattleSpriteDefinition,
  type LoadedSprite,
} from '../assets.js'
import { type SfxPlayer, SfxReadinessFatalError, SfxReadinessResourceError } from '../audio/sfx.js'
import { expectDefined } from '../defined.js'
import type { DialogBox } from '../dialog/dialog-box.js'
import { startDialogue } from '../dialogue.js'
import { drawNumber, type MenuAssets } from '../menu/menu-box.js'
import { drawRewardGainText } from '../menu/reward-gain.js'
import { bakeFrame } from '../render.js'
import { type ScreenShake, shakeOffsetY, WavedBgCache } from '../screen-fx.js'
import { renderSpans } from '../text/text-render.js'
import {
  type AnimFrame,
  AnimPlayer,
  buildEnemyCast,
  buildEnemyDivide,
  buildEnemyEscape,
  buildEnemyMateAttack,
  buildEnemyPhysical,
  buildEnemyTransform,
  buildFleeFail,
  buildMateAttack,
  buildPartyFlee,
  buildPlayerAttack,
  buildPlayerAttackAll,
  buildPlayerCast,
  buildPlayerCoop,
  buildPlayerScriptCastEffect,
  buildPlayerTrance,
  buildSteal,
  buildThrowItem,
  buildUseItem,
  type CastFxParams,
  type OverlayDraw,
} from './battle-anim.js'
import {
  type BattleAction,
  type BattleState,
  buildAiView,
  type CreatePlayerInput,
  createBattleState,
  healthyPlayerCount,
  isPlayerHealthy,
  needsManualSelect,
  pendingItemUses,
  reviveBattlePlayer,
  stepBattle,
} from './battle-core.js'
import type { BattleFailureFeedback, BattleLastAction } from './battle-last-action.js'
import { getPlayerBasePos } from './battle-positions.js'
import type { BattleResult } from './battle-result.js'
import {
  type BattleMenuRow,
  drawBattleGrid,
  drawBattleMenuBox,
  drawCurrentFinger,
  drawItemDetailBox,
  drawMainIcons,
  drawMpBox,
  drawPlayerInfoBox,
  drawPlayerTargetArrow,
  ITEM_GRID,
  MAGIC_GRID,
} from './battle-ui.js'
import {
  beginEnemyHookActivation,
  type EnemyHookActivation,
  nextEnemyHookStep,
} from './enemy-hook-runtime.js'
import {
  type BattleDepthOverlayDraw,
  type BattleScene,
  type BattleSpriteDraw,
  renderBattleScene,
} from './present-battle.js'
import { drawSettlementScreen, type SettlementScreen } from './settlement.js'

function assertNever(value: never, context: string): never {
  throw new Error(`${context}: 未处理 action ${JSON.stringify(value)}`)
}

/** 杂项盒(一阶段 WORD.DAT 56-60):围攻/状态未实现,渲染灰显、确认无响应。 */
const MISC_LABELS = ['围攻', '道具', '防御', '逃跑', '状态'] as const
/** 文字兜底菜单(无 UI 资产时;单测)。 */
const FALLBACK_MENU = ['攻击', '仙术', '物品', '防御', '逃跑'] as const
/** 每个 action 结算间隔(节奏;一帧全算看不清)。 */
const ACT_MS = 240
/** 胜/败结果停留展示时长；逃跑自身的滑出屏动画已经承担完整收尾，不再追加。 */
const OVER_MS = 1200
/** 敌人死亡淡出时长(一阶段 PAL_BattleFadeScene 12×6 步 ≈ 900ms;RGBA 用 alpha 渐隐等价)。 */
// 死亡溶解时长 = 原版 72 步 × 16ms(PAL_BattleFadeScene,battle.c:608-682;曾 900ms alpha
// 渐隐,作者报「死亡动画有些怪」→ 改颗粒溶解形态,见 present-battle drawDissolved)
const DEATH_FADE_MS = 72 * 16

interface FloatNum {
  x: number
  y: number
  text: string
  /** 有值 = 数字飘字;无 = 文本飘字。 */
  num?: number
  /** 数字色(fight.c:648-708:掉血=蓝/回血=黄/回 MP=青;缺省蓝)。 */
  tone?: 'blue' | 'yellow' | 'cyan'
  color: readonly [number, number, number]
  bornAt: number
}

type UiPhase =
  | 'menu'
  | 'misc'
  | 'miscSub'
  | 'skill'
  | 'item'
  | 'throwItem'
  | 'target'
  | 'preparing'
  | 'readinessError'
  | 'acting'
  | 'over'

/**
 * 正常 SFX readiness 是一条内部异步屏障，保持当前战场帧即可，不应向玩家闪现技术文案。
 * 只有 fail-loud 错误态才显示可操作提示。
 */
export function battleReadinessOverlayText(phase: 'preparing' | 'readinessError'): string | null {
  return phase === 'readinessError' ? '音效工作集错误' : null
}

/** 最后一名队员交招后、core 建行动队列前冻结的音效工作集输入。 */
export interface BattleTurnReadinessSnapshot {
  turn: number
  actions: ReadonlyMap<number, BattleAction>
  activePlayerPoisons: readonly ActivePoison[]
  activeEnemyPoisons: readonly ActivePoison[]
}

export interface BattleReadinessErrorContext {
  turn: number
  fatal: boolean
}

export interface BattleSessionAssets {
  bg?: CanvasImageSource
  /** 背景 FBP 索引源(召唤背景染色的调色板级 nibble 重烤;缺 = 跳过染色)。 */
  bgIndexed?: { indices: Uint8Array; w: number; h: number }
  palette: Palette
  glyphs: GlyphTable
  /** 本场完整视觉 readiness；key = BattleSpriteDef.id。 */
  battleSprites: ReadonlyMap<string, LoadedBattleSpriteDefinition>
  /** 队员基础有效形象（已应用持久 appearance 与装备覆写），与 players 同序。 */
  playerBaseDefinitionIds: readonly string[]
  /** 菜单基建资产(九宫格框/数字/手指;M4d-1)。缺 → 文字兜底渲染(单测)。 */
  ui?: MenuAssets
  /** 队员战斗小头像,键 = roleId(与 players 的 roleId 同源)。 */
  faces?: Record<string, ImageBitmap | undefined>
  /** 主菜单 4 图标(0攻击 1法术 2合击 3杂项;一阶段 SPRITEUI 40-43)。 */
  battleIcons?: (ImageBitmap | undefined)[]
  /** 音效播放器(M4d-3;敌攻/敌法/敌死/演出 playSound)。缺 = 静音。 */
  sfx?: SfxPlayer
  /** 物理命中特效精灵(chunk 10 = /extracted/data/magic/effect.rle;M4d-2)。缺 = 无特效。 */
  effectSprite?: LoadedSprite
  /** 法术特效精灵表(fire chunk → sprite;main 预载本场可能用到的;M4d-2b)。 */
  fireSprites?: Record<number, LoadedSprite>
  /**
   * 战斗内对话框(= 大世界同款 DialogBox,叠在战斗场景上;一阶段真值:战斗对话复用
   * gs.dialogBox 渲染,text.c:1687 box 不擦底)。缺 → 文字兜底(单测)。
   */
  dialogBox?: DialogBox
}

/** 表现层单位状态(动画期间被时间线 delta 驱动;非动画期 = 基准值)。 */
interface VisualFighter {
  x: number
  y: number
  frame: number
  colorShift: number
  /** 信息框显示血量(伤害数字帧才同步,避免结算即时扣血提前剧透)。 */
  displayHp: number
}

export class BattleSession {
  /** 唯一公共战斗总终态；action kind="flee" 仍是战斗内动作，不混入此类型。 */
  readonly done: Promise<BattleResult>
  private resolveDone!: (r: BattleResult) => void
  private rejectDone!: (reason?: unknown) => void
  private doneSettled = false
  private closed = false
  /** 每次准备/退出均递增；过期 Promise 回调不得推进 core。 */
  private preparationSerial = 0
  private readinessError: Error | null = null
  private readonly state: BattleState
  private ui: UiPhase = 'menu'
  /** 主菜单 4 图标选中(0攻击 1法术 2合击 3杂项;一阶段 selectedAction)。 */
  private menuIdx = 0
  private miscIdx = 0
  private miscSubIdx = 0
  private skillIdx = 0
  private itemIdx = 0
  /** 仙术选目标中(target 态确认时:有值 → cast,无值 → attack)。 */
  private pendingSkillId: string | null = null
  private pendingThrowItem: string | null = null
  /** 合击选目标中(单体合体技进 target 态时置;确认后 = coop 动作 + 消耗其余队员)。 */
  private pendingCoop = false
  private targetIdx = 0
  /** 选目标阵营:enemy=选敌(默认);ally=选队友(oneAlly 技能/物品 —— 还魂/解状态点名尸体/队友)。 */
  private targetSide: 'enemy' | 'ally' = 'enemy'
  /** 物品选队友中(oneAlly 物品进 target 态;确认后 = item 动作带 targetAllyIdx)。 */
  private pendingItemId: string | null = null
  // ── 战斗快捷键状态(一阶段 uibattle.c:1166-1302 全套;S 状态屏 reforge 无状态面板暂缺)──
  /** A 自动战斗:持续每回合自动普攻,菜单态 Esc 取消。 */
  private fAuto = false
  /** F 强行(本轮粘滞):剩余队员自动普攻。 */
  private stickyForce = false
  /** R 重复(本轮粘滞):剩余队员自动重提上回合动作(耗尽/MP 不足退化普攻)。 */
  private stickyRepeat = false
  /** 各队员上回合动作(R 重复的数据源;手动提交时记录)。 */
  private readonly lastActs = new Map<number, BattleAction>()
  /** 本回合手动提交顺序(菜单态 Esc 回退上一队员重选,uibattle.c:1298 revert)。 */
  private submitOrder: number[] = []
  /** 正在选指令的队员下标(pendingActions 未填的第一个活队员)。 */
  private actTimer = 0
  private overTimer = 0
  private floats: FloatNum[] = []
  private nowMs = 0
  // ── M4d-2 表现层:动画回放 + 死亡淡出 ──
  private visual: { players: VisualFighter[]; enemies: Array<VisualFighter | null> } = {
    players: [],
    enemies: [],
  }
  private anim: AnimPlayer | null = null
  private overlays: OverlayDraw[] | null = null
  /** 本次施法的召唤神精灵(overlays sheet='summon' 图源;非召唤 = null)。 */
  private currentSummon: LoadedSprite | null = null
  /** 本次施法动画的 fire sprite(overlays sheet='magic' 的图源)。 */
  private currentFire: LoadedSprite | null = null
  /** 敌整场逃离演出中的敌槽(hp 已被 core 清零,渲染豁免继续画 —— 滑出屏动画可见)。 */
  private fleeingEnemies: number[] | null = null
  /** 隐身渐隐/渐显过渡(0x5C;hidingTime 边沿触发,72×16ms = 原版 FadeScene 时长)。 */
  private hideFade: { dir: 'out' | 'in'; start: number } | null = null
  private prevHidden = false
  /** 本步演出收尾跳过 resetVisual(逃跑成功/敌逃:人已离场,归位会闪回)。 */
  private skipNextReset = false
  /** 敌槽 → 淡出开始时刻(动画收尾后登记;渲染 alpha 渐隐)。 */
  private deathFades = new Map<number, number>()
  /** 本步结算中死掉的敌槽(动画播完后统一开淡出 + death 音)。 */
  private pendingDeaths: number[] = []
  /** 本步刚获得 confused 的敌槽；core 已结算，但 OffMagic 收尾前不得提前抖动。 */
  private readonly pendingConfusedReveal = new Set<number>()
  /** 状态术失败反馈；等当前动作时间线收尾后再进入 narration。 */
  private pendingFailureFeedback: BattleFailureFeedback | null = null
  /** 梦蛇/敌变身的旧→新 dither 状态；动作收尾统一清除。 */
  private appearanceTransitions = new Map<string, NonNullable<AnimFrame['appearanceTransition']>>()
  // ── 屏幕级特效(演出审计 §2-1;screen-fx 引擎模块)──
  /** 波动背景缓存(仅相位/波幅变化时重卷)。 */
  private readonly wavedBg = new WavedBgCache()
  /** 法术屏波叠加(OffMagic 首帧设 fx.wave;收尾归 0 = fight.c:2835 还原语义)。 */
  private frameWaveAdd = 0
  /** 震屏(法术末 wShake 帧累计;time-based 派生,过期自清)。 */
  private screenShake: ScreenShake | null = null
  // ── 召唤演出相(P1 召唤束):in 队员溶出/神将溶入;hold 队员隐;out 反向 ──
  private summonVis: { phase: 'in' | 'hold' | 'out'; start: number } | null = null
  /** 召唤背景染色量(= 技能 effectTimes,fight.c:3145;建时间线时记)。 */
  private summonTintShift = 0
  /** 染色背景缓存(shift 键;bgIndexed 调色板级 nibble 重烤)。 */
  private tintedBg: { shift: number; canvas: HTMLCanvasElement } | null = null
  /** 召唤 bg 合成便签(base + tinted 溶入)。 */
  private bgComposeScratch: HTMLCanvasElement | null = null
  /** keepEffect 烙印工作画布(首烙时懒复制 assets.bg;整场留存,随屏波卷,fight.c:2757)。 */
  private bgWorking: HTMLCanvasElement | null = null
  /** 烙印次数(进 wavedBg 缓存 tag,防烙后撞净底旧缓存)。 */
  private burnCount = 0
  // ── M4c-2 演出(choreography):轮起手钩,dialog 逐条横幅播,空格推进 ──
  private choreoQueue: BattleChoreographyAction[] = []
  private choreoBanner: { name: string; text: string } | null = null
  /** 当前尚未开始的 turnStart hook；terminal request 后不再激活。 */
  private pendingHookActivations: { enemyIdx: number; channel: EnemyHookChannel }[] = []
  private activeHook: EnemyHookActivation | null = null
  /** actionQueue item 以对象身份去重，dualMove 的两个 entry 各跑一次 ready。 */
  private readonly readyHookEntries = new WeakSet<object>()
  private choreoWaitUntil: number | null = null
  private scriptAnimation = false
  /** terminal 立即登记、演出 closure 排净后才提交 state.phase。 */
  private pendingTerminal: {
    phase: 'won' | 'lost' | 'fled'
    result: BattleResult
  } | null = null
  /** phase 不能区分 victory/ enemyFled/ terminated，故由此字段保留唯一总终态事实。 */
  private terminalResult: BattleResult | null = null
  /** battle choreography 音乐请求序号；迟到 fade-stop 不得误停后播的新曲。 */
  private musicSerial = 0
  private scheduledMusicStop: { serial: number; deadline: number } | null = null
  /** 物品使用横幅(fight.c:2316 物品名@(210,50) 白字;13 帧 ≈520ms 到期自清)。 */
  private itemBanner: { text: string; untilMs: number; x?: number; y?: number } | null = null
  private choreoName = ''
  private encounterFired = new Set<number>() // 遭遇演出已播钩子下标(encounter 级,非 per-enemy)
  private choreoTurn = 0 // 已收集过演出的轮次
  // ── B7b 胜利结算屏(经验金钱 → 升级 → 练成;逐屏空格推进)──
  private settlement: SettlementScreen[] | null = null // null = 未构建;[] = 无屏
  private settleIdx = 0
  /** 胜利结算前与败/逃共路均会尝试写回；一次性门防止奖励结算后被旧快照覆盖。 */
  private persistentEffectsWritten = false
  /** B11-1:当前伤亡对话是否已交给 dialogBox/横幅(防止同一 dialogue 反复重开)。 */
  private casualtyDialogueShown = false

  constructor(
    players: CreatePlayerInput[],
    enemyDefs: Array<EnemyDef | null>,
    private readonly assets: BattleSessionAssets,
    private readonly nameOf: (roleId: string) => string,
    private readonly rng: () => number = Math.random,
    /** M4c:技能表(敌施法)+ 敌人表(变身/召唤)+ 难度预设 + locale(演出文本)。 */
    private readonly opts: {
      skills?: Record<string, SkillData>
      enemiesById?: Record<string, EnemyDef>
      items?: Record<string, import('@type-pal/content').ItemData>
      inventory?: { itemId: string; count: number }[]
      difficulty?: string
      locale?: Record<string, string>
      /** 遭遇专属战斗演出(startBattle.choreography;二阶段 clean:对话绑这一场遭遇而非敌种。
       *  boss 战由 scene 脚本传入,杂兵遭遇缺省无)。 */
      encounterChoreo?: import('@type-pal/content').BattleChoreography[]
      /** 各队员战斗音效(BattlerSpec.sounds;与 players 同序。演出数据走 opts 通道,不进逻辑核)。 */
      playerSounds?: Array<import('@type-pal/content').BattlerSounds | undefined>
      /** 工程级战斗提示音角色；演出层只消费 AssetId，不认识 PAL 数字槽。 */
      soundRoles?: Partial<Record<SoundAssetRole, AssetId>>
      /** 战场常驻波幅(battle-fields.json screenWave;法术 wave 演出期叠加其上,battle.c:1559)。 */
      fieldWave?: number
      /** 战场五灵加成(battle-fields.json magicEffect;fight.c:244 双向乘入法术伤害)。 */
      fieldEffect?: import('@type-pal/content').ElementVec
      /** 毒表(id → PoisonDef;逐回合 DoT tick 查)。 */
      poisonDefs?: Record<number, import('@type-pal/content').PoisonDef>
      /** 入战金钱快照(乾坤一掷/铜钱镖消耗基数;缺省 0 = 金钱技选单置灰)。 */
      money?: number
      /** 角色表(actorTemplateId → ActorDef;伤亡脚本查 battler.casualty)。 */
      actorsById?: Record<string, import('@type-pal/content').ActorDef>
      /** 技能一生限用计数(characterId → skillId → 已用次数;缺省空 = 未用过)。 */
      skillUseCounts?: Record<string, Record<string, number>>
      /** 自动战斗(0x8A;玩家侧 AI 代打,不出指令菜单 —— 石长老过场战)。 */
      auto?: boolean
      /** 首领战(原版 0x07 fIsBoss=!op2):不可逃;壳层另用于胜利曲 2/结算时长。 */
      boss?: boolean
      /**
       * 胜利结算(B7b;win 且非敌逃时调一次)。回调内做 HP 写回 + 入账 + 升级(单次授予点),
       * 返回结算屏序列(经验金钱 / 升级 / 练成),会话在 over 阶段逐屏空格推进。
       * 缺 → 无结算屏(直接收尾;单测)。
       */
      buildSettlement?: () => SettlementScreen[]
      /** 全员交招后的第二级音效屏障；缺省保持 headless/旧单测的同步行为。 */
      prepareTurnSounds?: (snapshot: BattleTurnReadinessSnapshot) => Promise<void>
      /** 每次屏障失败只由会话报告一次；资源失败可继续，fatal 停在错误态。 */
      reportReadinessError?: (error: Error, context: BattleReadinessErrorContext) => void
      /** 战斗演出音乐桥；stopMusic(fadeMs) 由会话用 gameplay clock 延后提交。 */
      playMusic?: (asset: AssetId) => void
      stopMusic?: () => void
      /**
       * 开战时的大世界队伍身份快照。固定剧情成长在任何 mutation 前同时校验
       * battle player 与 world party 的模板唯一性和实例 id 一致性。
       */
      worldPartyIdentities?: readonly { id: string; template: string }[]
    } = {},
  ) {
    this.state = createBattleState({
      players,
      enemySlots: enemyDefs,
      skills: opts.skills,
      enemiesById: opts.enemiesById,
      items: opts.items,
      inventory: opts.inventory,
      difficulty: opts.difficulty,
      boss: opts.boss,
      fieldEffect: opts.fieldEffect,
      poisonDefs: opts.poisonDefs,
      money: opts.money,
      actorsById: opts.actorsById,
      auto: opts.auto,
      skillUseCounts: opts.skillUseCounts,
    })
    this.done = new Promise((res, rej) => {
      this.resolveDone = res
      this.rejectDone = rej
    })
    stepBattle(this.state, this.rng) // preBattle → selectAction
    if (assets.playerBaseDefinitionIds.length !== players.length)
      throw new Error(
        `BattleSession playerBaseDefinitionIds 长度 ${assets.playerBaseDefinitionIds.length} != players ${players.length}`,
      )
    this.resetVisual()
  }

  private requireAppearance(
    id: string,
    expected: BattleSpriteProfileKind,
  ): LoadedBattleSpriteDefinition {
    const loaded = this.assets.battleSprites.get(id)
    if (!loaded) throw new Error(`本场 battle sprite readiness 缺定义 "${id}"`)
    if (loaded.definition.profile.kind !== expected)
      throw new Error(
        `BattleSpriteDef "${id}" profile 期望 ${expected}，实际 ${loaded.definition.profile.kind}`,
      )
    return loaded
  }

  private playerAppearance(index: number): LoadedBattleSpriteDefinition {
    const player = expectDefined(this.state.players[index])
    const id =
      player.tranceBattleSprite ?? expectDefined(this.assets.playerBaseDefinitionIds[index])
    return this.requireAppearance(id, 'player-fighter')
  }

  private playerFrames(index: number): PlayerFighterFrames {
    const profile = this.playerAppearance(index).definition.profile
    if (profile.kind !== 'player-fighter') throw new Error('player appearance profile 漂移')
    return profile.frames
  }

  private enemyAppearance(index: number): LoadedBattleSpriteDefinition {
    return this.requireAppearance(
      expectDefined(this.state.enemies[index]).def.battleSprite,
      'enemy',
    )
  }

  /** 召唤染色背景(bgIndexed 调色板级 nibble 重烤;shift 键缓存)。缺索引/零染色 = null。 */
  private getTintedBg(): HTMLCanvasElement | null {
    const shift = this.summonTintShift
    const bi = this.assets.bgIndexed
    if (!bi || shift === 0) return null
    if (this.tintedBg?.shift === shift) return this.tintedBg.canvas
    const cvs = document.createElement('canvas')
    cvs.width = bi.w
    cvs.height = bi.h
    const c = cvs.getContext('2d')
    if (!c) return null
    c.putImageData(bakeBgImageData(c, bi.indices, bi.w, bi.h, this.assets.palette, shift), 0, 0)
    this.tintedBg = { shift, canvas: cvs }
    return cvs
  }

  /** base 上溶入染色层(show=1 全染;crossfade 期背景随神将同步换色)。 */
  private composeSummonBg(
    base: CanvasImageSource,
    tinted: HTMLCanvasElement,
    show: number,
  ): CanvasImageSource {
    if (show >= 1) return tinted
    if (!this.bgComposeScratch) {
      this.bgComposeScratch = document.createElement('canvas')
      this.bgComposeScratch.width = 320
      this.bgComposeScratch.height = 200
    }
    const c = this.bgComposeScratch.getContext('2d')
    if (!c) return base
    c.clearRect(0, 0, 320, 200)
    c.drawImage(base, 0, 0, 320, 200)
    c.save()
    c.globalAlpha = show // 染色层随相渐入/渐出(alpha 形态)
    c.drawImage(tinted, 0, 0)
    c.restore()
    return this.bgComposeScratch
  }

  /** 队员表现层复位(召唤 out 相起点单独用:溶回目标必须是复位后的队员)。 */
  private resetPlayersVisual(): void {
    const s = this.state
    this.visual.players = s.players.map((p, i) => {
      const frames = this.playerFrames(i)
      const pos = getPlayerBasePos(s.players.length, i) ?? { x: 0, y: 0 }
      const prev = this.visual.players[i]
      return {
        x: pos.x,
        y: pos.y,
        frame:
          p.hp <= 0
            ? p.status.puppet > 0
              ? frames.idle
              : frames.dead
            : p.status.sleep > 0 || p.hp < Math.min(100, Math.floor(p.maxHp / 5))
              ? frames.dying
              : p.defending
                ? frames.defend
                : frames.idle,
        colorShift: 0,
        displayHp: prev?.displayHp ?? p.hp,
      }
    })
  }

  /** 表现层复位:全员回站位/复位姿势/无染色(一阶段 resetFightersAfterAction 语义)。
   *  队员姿势 = playerRestFrame(死→傀儡0/死2;睡/濒死→1;防→3;站0 —— 一夜三刀簇,
   *  曾一律 frame0 丢死/濒死/防御姿,演出审计 §2-8)。 */
  private resetVisual(): void {
    const s = this.state
    this.resetPlayersVisual()
    this.visual.enemies = s.enemies.map((e, i) => {
      if (!e) return null
      const pos = e.basePos
      const prev = this.visual.enemies[i]
      const profile = this.enemyAppearance(i).definition.profile
      if (profile.kind !== 'enemy') throw new Error('enemy appearance profile 漂移')
      return {
        x: pos.x,
        y: pos.y,
        frame: profile.idle.start,
        colorShift: 0,
        displayHp: prev?.displayHp ?? e.hp,
      }
    })
    this.overlays = null
    this.currentFire = null
    this.appearanceTransitions.clear()
  }

  /** 当前待选指令的队员下标;全填 → undefined。眠/定/疯/死者不出菜单
   *  (needsManualSelect 与 core 等填共用谓词;core 建队列时强制普攻兜底)。 */
  private nextSelecting(): number | undefined {
    const s = this.state
    for (let i = 0; i < s.players.length; i++) {
      if (needsManualSelect(expectDefined(s.players[i])) && !s.pendingActions.has(i)) return i
    }
    return undefined
  }

  /** 保持 core 同步：只有 readiness 落定后才从 selectAction 跨入 performAction。 */
  private enterActionPhase(): void {
    if (this.closed || this.doneSettled || this.state.phase !== 'selectAction') return
    stepBattle(this.state, this.rng)
    this.ui = 'acting'
    this.actTimer = 0
  }

  private reportPreparationFailure(error: Error, fatal: boolean): void {
    this.opts.reportReadinessError?.(error, { turn: this.state.turn, fatal })
  }

  private settleTurnPreparation(
    token: number,
    outcome: { ok: true } | { ok: false; error: unknown },
  ): void {
    if (
      token !== this.preparationSerial ||
      this.closed ||
      this.doneSettled ||
      this.state.phase !== 'selectAction' ||
      this.ui !== 'preparing'
    )
      return
    if (outcome.ok) {
      this.enterActionPhase()
      return
    }
    const { error } = outcome
    const normalized = error instanceof Error ? error : new Error(String(error))
    // 只有已知的资源准备失败允许静音降级；预算/collector/未知编程错误一律 fail-loud。
    const fatal =
      normalized instanceof SfxReadinessFatalError ||
      !(normalized instanceof SfxReadinessResourceError)
    this.reportPreparationFailure(normalized, fatal)
    if (fatal) {
      this.readinessError = normalized
      this.ui = 'readinessError'
      return
    }
    // 单项缺失/读取/WAV/decode 失败：allSettled 已保证其余成功项 ready，再降级行动。
    this.enterActionPhase()
  }

  private beginTurnPreparation(): void {
    if (this.closed || this.doneSettled || this.ui === 'preparing') return
    const prepare = this.opts.prepareTurnSounds
    if (!prepare) {
      this.enterActionPhase()
      return
    }
    const snapshot: BattleTurnReadinessSnapshot = {
      turn: this.state.turn,
      actions: new Map(this.state.pendingActions),
      activePlayerPoisons: this.state.players.flatMap((player) =>
        player.poisons.map((poison) => ({ ...poison })),
      ),
      activeEnemyPoisons: this.state.enemies.flatMap((enemy) =>
        enemy ? enemy.poisons.map((poison) => ({ ...poison })) : [],
      ),
    }
    const token = ++this.preparationSerial
    this.readinessError = null
    this.ui = 'preparing'
    let pending: Promise<void>
    try {
      pending = prepare(snapshot)
    } catch (error) {
      this.settleTurnPreparation(token, { ok: false, error })
      return
    }
    void pending.then(
      () => this.settleTurnPreparation(token, { ok: true }),
      (error: unknown) => this.settleTurnPreparation(token, { ok: false, error }),
    )
  }

  private complete(result: BattleResult): void {
    if (this.doneSettled) return
    this.doneSettled = true
    this.closed = true
    this.preparationSerial++
    this.resolveDone(result)
  }

  /** 读档、切场景或 readiness fatal 退出；令所有尚未落定的准备回调失效。 */
  cancel(reason?: unknown): void {
    if (this.doneSettled) return
    this.doneSettled = true
    this.closed = true
    this.preparationSerial++
    this.musicSerial++
    this.scheduledMusicStop = null
    this.pendingTerminal = null
    this.pendingHookActivations = []
    this.activeHook = null
    this.state.casualtyDialogue = undefined
    this.casualtyDialogueShown = false
    const abortError = new Error('BattleSession 已取消')
    abortError.name = 'AbortError'
    this.rejectDone(reason ?? abortError)
  }

  private aliveEnemyIdxs(): number[] {
    return this.state.enemies.map((e, i) => (e && e.hp > 0 ? i : -1)).filter((i) => i >= 0)
  }

  /** 战斗可用物品(背包有货且带 use);数量已扣本回合预占(nAmountInUse 语义:
   *  前面队员选走最后一件后,后面队员列表里即不再出现 —— 剩 0 隐藏沿用本列表现约定,
   *  「全显示+灰」的原版列表语义留 P2 列表专项一并裁)。 */
  private usableItems(): { itemId: string; count: number }[] {
    const used = pendingItemUses(this.state)
    return this.state.inventory
      .map((x) => ({ itemId: x.itemId, count: x.count - (used.get(x.itemId) ?? 0) }))
      .filter((x) => {
        const use = this.state.items[x.itemId]?.use
        return x.count > 0 && use != null && itemUseSupportsContext(use, 'battle')
      })
  }

  /** 可投掷道具(有 throw 能力块;毒药/蛊)。数量同扣预占(投掷无条件占,fight.c:1900)。 */
  private throwableItems(): { itemId: string; count: number }[] {
    const used = pendingItemUses(this.state)
    return this.state.inventory
      .map((x) => ({ itemId: x.itemId, count: x.count - (used.get(x.itemId) ?? 0) }))
      .filter((x) => {
        const thrown = this.state.items[x.itemId]?.throw
        if (x.count <= 0 || !thrown) return false
        try {
          checkThrowSpec(thrown, `items.${x.itemId}.throw`)
          return true
        } catch {
          return false
        }
      })
  }

  /** 主菜单 4 项可用性(0攻击/3杂项恒可;1法术=有技能且未封;2合击=有合体技+本人healthy+≥2人healthy)。 */
  private mainActionValid(sel: number): [boolean, boolean, boolean, boolean] {
    const p = this.state.players[sel]
    const magicOk = !!p && p.skills.length > 0 && (p.status?.silence ?? 0) === 0
    // 合击(fight.c uibattle.c:271-341):有合体技 + 发起者 healthy + 全队 ≥2 healthy
    const coopOk =
      !!p && !!p.cooperativeMagicSkillId && isPlayerHealthy(p) && healthyPlayerCount(this.state) > 1
    return [true, magicOk, coopOk, true]
  }

  /** 提交指令后回主菜单(一阶段 commit 后 selectedAction 重置)。 */
  private backToMain(): void {
    this.ui = 'menu'
    this.menuIdx = 0
  }

  /**
   * 合击消耗其余队员本回合出手(fight.c applyCoopConsumesOthers):给尚未选招的其他队员
   * 填占位动作,令 nextSelecting 结束选招 → 直接进出手。core coopThisTurn 令这些非合击动作
   * 出手作废(HP 贡献已在合击结算内扣)。已选招的队员亦同(coopThisTurn 侧统一 pass)。
   */
  private consumeOthersForCoop(caster: number): void {
    for (let i = 0; i < this.state.players.length; i++) {
      if (i === caster) continue
      if (!this.state.pendingActions.has(i)) {
        this.state.pendingActions.set(i, { kind: 'attack', targetEnemyIdx: -1 })
      }
    }
  }

  private startTimeline(timeline: AnimFrame[], scripted = false): void {
    this.scriptAnimation = scripted
    this.anim = new AnimPlayer(timeline, {
      onFighter: (delta) => this.applyDelta(delta),
      onOverlay: (overlays) => {
        this.overlays = overlays
      },
      onSound: (asset) => this.assets.sfx?.play(asset),
      onDamage: (target, value, tone) => this.applyDamageFx(target, value, tone ?? 'blue'),
      onBanner: (text, durationMs, x, y) => {
        this.itemBanner = {
          text,
          untilMs: this.nowMs + durationMs,
          ...(x !== undefined ? { x } : {}),
          ...(y !== undefined ? { y } : {}),
        }
      },
      onScreenShake: (durationMs, level) => {
        const untilMs = this.nowMs + durationMs
        this.screenShake = {
          untilMs: Math.max(this.screenShake?.untilMs ?? 0, untilMs),
          level: level ?? 3,
        }
      },
      onWaveAdd: (wave) => {
        this.frameWaveAdd = wave
      },
      onAppearanceTransition: (transition) => {
        this.appearanceTransitions.set(`${transition.side}:${transition.idx}`, transition)
      },
      onBurnBg: (marks) => this.burnToBg(marks),
      onSummonPhase: (phase) => {
        if (phase === null) {
          this.summonVis = null
          return
        }
        if (this.summonVis?.phase !== phase) {
          if (phase === 'out') this.resetPlayersVisual()
          this.summonVis = { phase, start: this.nowMs }
        }
      },
    })
    this.anim.tick(0)
  }

  /** 收集当轮遭遇专属演出；敌实例 hook 由 queueTurnStartHooks 单独排队。 */
  private collectChoreo(): void {
    const s = this.state
    // 隐身期(0x5C) turnStart 演出不跑(一阶段 fight.c:1680 ==0 才跑脚本)
    if (s.hidingTime > 0) return
    const rng = this.rng
    const list = this.opts.encounterChoreo ?? []
    const primary = s.enemies.find((e): e is NonNullable<typeof e> => !!e && e.hp > 0)
    this.choreoName = primary ? lookupText(primary.def.name, this.opts.locale ?? {}) : ''
    list.forEach((c, ci) => {
      if (c.at !== 'turnStart' && !(c.at === 'battleStart' && s.turn === 1)) return
      if (c.once && this.encounterFired.has(ci)) return
      if (c.when && primary && !evalAiCond(c.when, buildAiView(s, primary), rng)) return
      this.encounterFired.add(ci)
      this.choreoQueue.push(...c.body)
    })
  }

  private queueTurnStartHooks(): void {
    if (this.state.hidingTime > 0 || this.pendingTerminal) return
    this.state.enemies.forEach((enemy, enemyIdx) => {
      if (enemy && enemy.hp > 0)
        this.pendingHookActivations.push({ enemyIdx, channel: 'turnStart' })
    })
  }

  private flushScheduledMusicStop(): void {
    const scheduled = this.scheduledMusicStop
    if (!scheduled || this.nowMs < scheduled.deadline) return
    this.scheduledMusicStop = null
    if (scheduled.serial === this.musicSerial) this.opts.stopMusic?.()
  }

  private battleActor(actor: string): BattleState['players'][number] {
    const matches = this.state.players.filter((player) => player.actorTemplateId === actor)
    if (matches.length !== 1)
      throw new Error(
        `battle choreography actor "${actor}" 在战斗队伍中期望恰好 1 个实例，实际 ${matches.length}`,
      )
    return expectDefined(matches[0])
  }

  private applyFixedActorGrowth(actor: string, delta: LevelGrowthDelta): void {
    const player = this.battleActor(actor)
    const worldMatches = (this.opts.worldPartyIdentities ?? []).filter(
      (character) => character.template === actor,
    )
    if (worldMatches.length !== 1)
      throw new Error(
        `battle choreography actor "${actor}" 在世界队伍中期望恰好 1 个实例，实际 ${worldMatches.length}`,
      )
    const worldCharacter = expectDefined(worldMatches[0])
    if (worldCharacter.id !== player.roleId)
      throw new Error(
        `battle choreography actor "${actor}" 实例不一致：battle=${player.roleId}, world=${worldCharacter.id}`,
      )
    const progress = player.persistentProgress
    if (!progress) throw new Error(`battle choreography actor "${actor}" 缺持久成长快照`)

    progress.level += delta.level
    progress.maxHP += delta.maxHP
    progress.maxMP += delta.maxMP
    progress.attack += delta.attack
    progress.magicAttack += delta.magicAttack
    progress.defense += delta.defense
    progress.speed += delta.speed
    progress.luck += delta.luck
    player.maxHp += delta.maxHP
    player.maxMp += delta.maxMP
    player.attackStrength += delta.attack
    player.magicStrength += delta.magicAttack
    player.defense += delta.defense
    player.baseDexterity += delta.speed
    player.fleeRate += delta.luck
    this.state.pendingWorldMutations.push({
      kind: 'fixedCharacterGrowth',
      characterId: player.roleId,
      actorTemplateId: actor,
      delta: { ...delta },
    })
  }

  private requestTerminal(result: BattleResult): void {
    if (this.pendingTerminal)
      throw new Error('battle choreography 同一执行路径重复登记 terminal request')
    const phase = result === 'defeat' ? 'lost' : result === 'playerFled' ? 'fled' : 'won'
    this.pendingTerminal = { phase, result }
    if (result === 'enemyFled') this.state.enemyFled = true
    // B11-1 P5:终局不残留半段伤亡对话
    this.state.casualtyDialogue = undefined
    this.casualtyDialogueShown = false
    // 尚未激活的 hook 不属于当前 closure；terminal 后禁止新 activation。
    this.pendingHookActivations = []
  }

  private startEnemyFleePresentation(): void {
    const playerHp = this.state.players.map((player) => player.hp)
    const enemyHp = this.state.enemies.map((enemy) => enemy?.hp ?? 0)
    const playerAppearances = this.state.players.map(
      (player, index) =>
        player.tranceBattleSprite ?? expectDefined(this.assets.playerBaseDefinitionIds[index]),
    )
    const enemyAppearances = this.state.enemies.map((enemy) => enemy?.def.battleSprite ?? '')
    const action = {
      side: 'enemy' as const,
      idx: 0,
      kind: 'fleeAll' as const,
    }
    const timeline = this.buildStepTimeline(
      action,
      playerHp,
      enemyHp,
      playerAppearances,
      enemyAppearances,
    )
    if (timeline) this.startTimeline(timeline, true)
  }

  private playActorCastEffect(actor: string): void {
    const player = this.battleActor(actor)
    const playerIdx = this.state.players.indexOf(player)
    const casterPos = getPlayerBasePos(this.state.players.length, playerIdx)
    if (!casterPos) throw new Error(`battle choreography actor "${actor}" 缺战斗站位`)
    const appearance = this.playerAppearance(playerIdx)
    const profile = appearance.definition.profile
    if (profile.kind !== 'player-fighter')
      throw new Error(`battle choreography actor "${actor}" 战斗形象 profile 非 player-fighter`)
    this.startTimeline(
      buildPlayerScriptCastEffect({
        casterIdx: playerIdx,
        casterPos,
        casterFrames: profile.frames,
        castEffectBase: this.assets.effectSprite ? profile.castEffectBase : -1,
        partyIdxs: this.state.players.map((_, index) => index),
        ...(this.opts.playerSounds?.[playerIdx]?.magic
          ? { magicSound: expectDefined(this.opts.playerSounds[playerIdx]).magic }
          : {}),
      }),
      true,
    )
  }

  private executeBattleChoreographyAction(action: BattleChoreographyAction): void {
    const box = this.assets.dialogBox
    switch (action.kind) {
      case 'dialog':
        if (box) {
          box.open(
            startDialogue({
              id: '__battle',
              cues: [{ ...action.cue, slot: action.cue.slot ?? 'top' }],
            }),
            this.nowMs,
          )
        } else {
          this.choreoBanner = {
            name: this.choreoName,
            text: action.cue.rows
              .map((row) => lookupText(row.text, this.opts.locale ?? {}))
              .join('\n'),
          }
        }
        return
      case 'playSound':
        this.assets.sfx?.play(action.asset)
        this.state.log.push(`♪ 音效 ${action.asset}`)
        return
      case 'playMusic':
        this.musicSerial += 1
        this.scheduledMusicStop = null
        this.opts.playMusic?.(action.asset)
        return
      case 'stopMusic': {
        const serial = ++this.musicSerial
        const fadeMs = action.fadeMs ?? 0
        if (fadeMs > 0)
          this.scheduledMusicStop = {
            serial,
            deadline: this.nowMs + fadeMs,
          }
        else {
          this.scheduledMusicStop = null
          this.opts.stopMusic?.()
        }
        return
      }
      case 'wait':
        this.choreoWaitUntil = this.nowMs + action.ms
        return
      case 'fleeBattle': {
        this.requestTerminal('enemyFled')
        this.state.log.push('敌人逃走了')
        this.startEnemyFleePresentation()
        return
      }
      case 'endBattle': {
        this.requestTerminal(
          action.result === 'lost'
            ? 'defeat'
            : action.result === 'terminate'
              ? 'terminated'
              : 'victory',
        )
        this.state.log.push(`战斗结束(${action.result})`)
        return
      }
      case 'revivePartyAll':
        for (const player of this.state.players)
          reviveBattlePlayer(this.state, player, action.tenths * 10)
        this.resetPlayersVisual()
        return
      case 'increaseHpMp': {
        const pools = action.pools ?? 'both'
        for (const player of this.state.players) {
          if (pools === 'both' || pools === 'hp')
            player.hp = Math.max(0, Math.min(player.maxHp, player.hp + action.delta))
          if (pools === 'both' || pools === 'mp')
            player.mp = Math.max(0, Math.min(player.maxMp, player.mp + action.delta))
        }
        this.resetPlayersVisual()
        return
      }
      case 'applyActorGrowth':
        this.applyFixedActorGrowth(action.actor, action.delta)
        return
      case 'playActorCastEffect':
        this.playActorCastEffect(action.actor)
        return
      default:
        assertNever(action, 'battle choreography')
    }
  }

  private startHookEffectPresentation(
    activation: EnemyHookActivation,
    result: ReturnType<typeof nextEnemyHookStep> & { kind: 'effect' },
    before: {
      playerHp: number[]
      enemyHp: number[]
      playerAppearances: string[]
      enemyAppearances: string[]
    },
  ): void {
    if (result.result.outcome === 'failed') return
    const action = {
      side: 'enemy' as const,
      idx: activation.enemyIdx,
      kind: result.result.kind,
      ...(result.result.spawnedIdxs ? { spawnedIdxs: result.result.spawnedIdxs } : {}),
    }
    const timeline = this.buildStepTimeline(
      action,
      before.playerHp,
      before.enemyHp,
      before.playerAppearances,
      before.enemyAppearances,
    )
    if (timeline) this.startTimeline(timeline, true)
    else this.resetVisual()
  }

  private pumpScriptExecution(dtMs: number, pressed: ReadonlySet<string>): boolean {
    const box = this.assets.dialogBox
    // B11-1:伤亡脚本台词经战斗内对话逐条展示,放完前暂停推进(P5)。
    const casualty = this.state.casualtyDialogue
    if (casualty && !this.casualtyDialogueShown) {
      const speaker = this.nameOf(casualty.speakerRoleId)
      if (box) {
        box.open(
          startDialogue({
            id: '__casualty',
            cues: casualty.lines.map((line) => ({
              rows: [{ text: line.text }],
              slot: line.style,
            })),
          }),
          this.nowMs,
        )
      } else {
        this.choreoBanner = {
          name: speaker,
          text: casualty.lines
            .map((line) => lookupText(line.text, this.opts.locale ?? {}))
            .join('\n'),
        }
      }
      this.casualtyDialogueShown = true
      return true
    }
    if (this.casualtyDialogueShown && !box?.active && !this.choreoBanner) {
      // 对话放完(或横幅被空格清掉)→ 清引用,允许下一次 sweep 再开。
      this.state.casualtyDialogue = undefined
      this.casualtyDialogueShown = false
    }
    if (box?.active) {
      if (pressed.has(' ') || pressed.has('Enter')) box.advance(this.nowMs)
      return true
    }
    if (this.choreoBanner) {
      if (pressed.has(' ') || pressed.has('Enter')) this.choreoBanner = null
      return true
    }
    if (this.choreoWaitUntil !== null) {
      if (this.nowMs < this.choreoWaitUntil) return true
      this.choreoWaitUntil = null
    }
    if (this.scriptAnimation) {
      if (this.anim && !this.anim.tick(dtMs)) return true
      this.anim = null
      this.scriptAnimation = false
      this.finishStepVisuals()
      return true
    }
    if (this.activeHook) {
      const activation = this.activeHook
      const before = {
        playerHp: this.state.players.map((player) => player.hp),
        enemyHp: this.state.enemies.map((enemy) => enemy?.hp ?? 0),
        playerAppearances: this.state.players.map(
          (player, index) =>
            player.tranceBattleSprite ?? expectDefined(this.assets.playerBaseDefinitionIds[index]),
        ),
        enemyAppearances: this.state.enemies.map((enemy) => enemy?.def.battleSprite ?? ''),
      }
      const step = nextEnemyHookStep(this.state, activation, this.rng)
      if (step.kind === 'complete') {
        this.activeHook = null
        return true
      }
      if (step.kind === 'effect') {
        this.startHookEffectPresentation(activation, step, before)
        return true
      }
      this.executeBattleChoreographyAction(step.action)
      return true
    }
    const action = this.choreoQueue.shift()
    if (action) {
      this.executeBattleChoreographyAction(action)
      return true
    }
    if (!this.pendingTerminal) {
      while (this.pendingHookActivations.length > 0) {
        const pending = expectDefined(this.pendingHookActivations.shift())
        const enemy = this.state.enemies[pending.enemyIdx]
        if (!enemy || enemy.hp <= 0 || this.state.hidingTime > 0) continue
        const activation = beginEnemyHookActivation(this.state, pending.enemyIdx, pending.channel)
        if (!activation) continue
        this.activeHook = activation
        this.choreoName = lookupText(enemy.scriptOwnerDef.name, this.opts.locale ?? {})
        return true
      }
    }
    if (this.pendingTerminal) {
      const terminal = this.pendingTerminal
      this.pendingTerminal = null
      this.state.phase = terminal.phase
      this.terminalResult = terminal.result
      return true
    }
    return false
  }

  /** keepEffect 末帧烙进背景(fight.c:2757 blit lpBackground;底中锚同 overlay 例程)。
   *  原版门:烙时屏波 ≥9 不烙(wScreenWave<9;波荡背景烙了也糊)。 */
  private burnToBg(marks: OverlayDraw[]): void {
    if ((this.opts.fieldWave ?? 0) + this.frameWaveAdd >= 9) return
    const base = this.bgWorking ?? this.assets.bg
    if (!base) return
    if (!this.bgWorking) {
      const c = document.createElement('canvas')
      c.width = 320 // 战斗背景恒 320×200(FBP;bg 类型是 CanvasImageSource,不带 w/h)
      c.height = 200
      const g0 = c.getContext('2d')
      if (!g0) return
      g0.drawImage(base, 0, 0)
      this.bgWorking = c
    }
    const g = this.bgWorking.getContext('2d')
    if (!g) return
    for (const m of marks) {
      const f = this.currentFire?.frames[m.frameIdx]
      if (!f) continue
      g.drawImage(bakeFrame(f, this.assets.palette), m.x - Math.floor(f.width / 2), m.y - f.height)
      this.burnCount++
    }
  }

  /** 战末敌槽 def 列表(按槽序,含 divide/summon 增员;Phase E 战后脚本逐槽跑,battle.c:1334)。 */
  enemySlotDefs(): EnemyDef[] {
    return this.state.enemies.flatMap((e) => (e ? [e.scriptOwnerDef] : []))
  }

  /** 战果(B7a;敌死累计,main 战后入账)。 */
  rewards(): { exp: number; cash: number } {
    return { exp: this.state.expGained, cash: this.state.cashGained }
  }

  /** 战内金钱增减合计(偷钱 +/乾坤·铜钱镖消耗 −;原版 dwCash 即时加减 —— main 无条件入账,逃跑也保留)。 */
  moneyDelta(): number {
    return this.state.moneyDelta
  }

  /** 战内当前可用金钱(快照+增减;铜钱镖 cost.money 选单门)。 */
  private moneyNow(): number {
    return Math.max(0, this.state.money + this.state.moneyDelta)
  }

  /** 收妖值(灵葫咒 0x33;main 无条件并入 world.collectValue)。 */
  collectGained(): number {
    return this.state.collectGained
  }

  /** B7c 隐藏经验行为计数(roleId → 池计数;main 传 grantBattleRewards 分配)。 */
  hiddenCounts(): Record<string, Partial<Record<string, number>>> {
    const out: Record<string, Partial<Record<string, number>>> = {}
    for (const p of this.state.players) out[p.roleId] = p.hiddenCounts
    return out
  }

  tick(dtMs: number, pressed: ReadonlySet<string>, gameplayNowMs?: number): void {
    if (this.closed) return
    this.nowMs = gameplayNowMs ?? this.nowMs + dtMs
    this.flushScheduledMusicStop()
    // 数字 11 帧×40ms=440ms(uibattle.c:1753 age>10 清);文本飘字维持 900ms
    this.floats = this.floats.filter(
      (f) => this.nowMs - f.bornAt < (f.num !== undefined ? 440 : 900),
    )
    const s = this.state

    // readiness pending 期间锁住所有输入；fatal 可见停留，Enter/Escape 明确退出本场。
    if (this.ui === 'preparing') return
    if (this.ui === 'readinessError') {
      if (pressed.has('Enter') || pressed.has('Escape'))
        this.cancel(this.readinessError ?? undefined)
      return
    }

    if (s.phase === 'won' || s.phase === 'lost' || s.phase === 'fled') {
      if (!this.terminalResult)
        this.terminalResult =
          s.phase === 'lost'
            ? 'defeat'
            : s.phase === 'fled'
              ? 'playerFled'
              : s.enemyFled
                ? 'enemyFled'
                : 'victory'
      // 终态但收尾动画未播完(最后一击)→ 先播完(死亡淡出/死音在 finishStepVisuals)
      if (this.anim) {
        if (!this.anim.tick(dtMs)) return
        this.anim = null
        this.finishStepVisuals()
        return
      }
      // 动作收尾可能刚打开失败 narration；终态也必须等它自动/手动关闭后再 finalize。
      const terminalDialog = this.assets.dialogBox
      if (terminalDialog?.active) {
        if (pressed.has(' ') || pressed.has('Enter')) terminalDialog.advance(this.nowMs)
        return
      }
      this.ui = 'over'
      // 死亡溶解 hold:最后一敌的溶解播完 + 短拍(240ms)才起胜利乐/结算屏 —— 原版
      // PostActionCheck 的 FadeScene 是阻塞式(fight.c:889-894),溶解期间什么都不发生
      // (作者报「结算画面这么快?」= 此 hold 缺失)。render 清过期项,空表 = 直接过。
      for (const t of this.deathFades.values()) if (this.nowMs < t + DEATH_FADE_MS + 240) return
      // B7b 胜利结算屏:win 且非敌逃 → 构建一次(回调内写回 HP + 入账 + 升级)→ 逐屏空格推进
      if (this.terminalResult === 'victory' && this.settlement === null) {
        this.settlement = this.opts.buildSettlement?.() ?? []
      }
      if (this.settlement?.length) {
        // 逐屏:空格进下一屏;放完 → 收尾。至少停 300ms 防手滑连按跳屏。
        this.overTimer += dtMs
        if ((pressed.has(' ') || pressed.has('Enter')) && this.overTimer >= 300) {
          this.settleIdx++
          this.overTimer = 0
          if (this.settleIdx >= this.settlement.length) {
            this.complete(this.terminalResult)
          }
        }
        return
      }
      // 第一阶段 / 原版：玩家逃跑在 16 步滑出屏后的下一拍直接 finalize；敌逃时间线
      // 自带出屏后约 500ms hold，terminated 也没有通用结果屏。不能复用胜败的 1.2s 停留，
      // 否则最后一帧会像卡住一样悬停。
      if (
        this.terminalResult === 'playerFled' ||
        this.terminalResult === 'enemyFled' ||
        this.terminalResult === 'terminated'
      ) {
        this.complete(this.terminalResult)
        return
      }
      // 无结算屏的胜/败仍短暂停留自动收尾。
      this.overTimer += dtMs
      if (this.overTimer >= OVER_MS) {
        this.complete(this.terminalResult)
      }
      return
    }

    if (s.phase === 'selectAction') {
      // M4c-2:轮起手演出(battleStart 并入第 1 轮)—— 进指令菜单前逐条播
      if (this.choreoTurn < s.turn) {
        this.choreoTurn = s.turn
        this.collectChoreo()
        this.queueTurnStartHooks()
      }
      if (this.pumpScriptExecution(dtMs, pressed)) return
      const sel = this.nextSelecting()
      if (sel === undefined) {
        this.beginTurnPreparation()
        return
      }
      // 自动战斗(0x8A):玩家侧不出菜单,逐个活队员派 AI 攻击最近活敌(石长老过场战)
      if (this.opts.auto) {
        const alive = this.aliveEnemyIdxs()
        s.pendingActions.set(
          sel,
          alive.length
            ? { kind: 'attack', targetEnemyIdx: expectDefined(alive[0]) }
            : { kind: 'defend' },
        )
        return
      }
      if (this.ui === 'acting') {
        this.ui = 'menu' // 新回合回菜单
        this.stickyForce = false // F/R 粘滞只管本轮(uibattle.c 轮末清)
        this.stickyRepeat = false
        this.submitOrder = []
      }
      // 粘滞/自动断路:F(本轮)/R(本轮)/A(持续)→ 剩余队员不出菜单自动提交;Esc 取消
      if (this.fAuto || this.stickyForce || this.stickyRepeat) {
        if (pressed.has('Escape')) {
          this.fAuto = false
          this.stickyForce = false
          this.stickyRepeat = false
        } else {
          if (this.stickyRepeat) this.submitRepeat(sel)
          else this.submitForce(sel)
          return
        }
      }
      const confirm = pressed.has(' ') || pressed.has('Enter')
      if (this.ui === 'menu') {
        // 战斗快捷键(一阶段 uibattle.c:1166-1302;WASD 原义还原同一阶段 input.ts)
        const key = (a: string, b: string): boolean => pressed.has(a) || pressed.has(b)
        if (key('d', 'D')) {
          this.submitAnd(sel, { kind: 'defend' })
          return
        }
        if (key('q', 'Q')) {
          this.submitAnd(sel, { kind: 'flee' })
          return
        }
        if (key('e', 'E')) {
          // 用物品:直开使用列表(uibattle.c:1224)
          if (this.usableItems().length) {
            this.ui = 'item'
            this.itemIdx = 0
          }
          return
        }
        if (key('w', 'W')) {
          // 投掷:直开投掷列表(uibattle.c:1230)
          if (this.throwableItems().length) {
            this.ui = 'throwItem'
            this.itemIdx = 0
          }
          return
        }
        if (key('r', 'R')) {
          this.stickyRepeat = true // 整轮粘滞(uibattle.c:1240 fRepeat)
          this.submitRepeat(sel)
          return
        }
        if (key('f', 'F')) {
          this.stickyForce = true // 整轮粘滞(uibattle.c:1252 fForce)
          this.submitForce(sel)
          return
        }
        if (key('a', 'A')) {
          this.fAuto = true // 持续自动(uibattle.c:1266 fAutoAttack;Esc 取消)
          this.submitForce(sel)
          return
        }
        // Esc:回退上一个已提交队员重选(uibattle.c:1298;无可回退则无操作)
        if (pressed.has('Escape') && this.submitOrder.length) {
          const prev = expectDefined(this.submitOrder.pop())
          s.pendingActions.delete(prev)
          return
        }
        // 一阶段主菜单方向语义:Up→攻击 Down→杂项 Left→法术(valid) Right→合击(valid);invalid 回 0
        const valid = this.mainActionValid(sel)
        if (pressed.has('ArrowUp')) this.menuIdx = 0
        else if (pressed.has('ArrowDown')) this.menuIdx = 3
        else if (pressed.has('ArrowLeft') && valid[1]) this.menuIdx = 1
        else if (pressed.has('ArrowRight') && valid[2]) this.menuIdx = 2
        if (!valid[this.menuIdx]) this.menuIdx = 0
        if (confirm) {
          if (this.menuIdx === 0) {
            this.ui = 'target'
            this.targetSide = 'enemy'
            this.pendingSkillId = null
            this.targetIdx = 0
          } else if (this.menuIdx === 1) {
            this.ui = 'skill'
            this.skillIdx = 0
          } else if (this.menuIdx === 2) {
            // 合击:全体合体技直接提交(无目标),单体合体技进选敌
            const p2 = expectDefined(s.players[sel])
            const coopSkill = p2.cooperativeMagicSkillId
              ? this.opts.skills?.[p2.cooperativeMagicSkillId]
              : undefined
            if (coopSkill?.target === 'allEnemies') {
              this.submit(sel, { kind: 'coop' })
              this.consumeOthersForCoop(sel)
              this.backToMain()
            } else {
              this.pendingCoop = true
              this.ui = 'target'
              this.targetSide = 'enemy'
              this.targetIdx = 0
            }
          } else if (this.menuIdx === 3) {
            this.ui = 'misc'
            this.miscIdx = 0
          }
        }
      } else if (this.ui === 'misc') {
        // 杂项盒(一阶段):围攻/道具/防御/逃跑/状态,上下循环;围攻与状态未实现(灰)
        const n = MISC_LABELS.length
        if (pressed.has('ArrowUp')) this.miscIdx = (this.miscIdx + n - 1) % n
        if (pressed.has('ArrowDown')) this.miscIdx = (this.miscIdx + 1) % n
        if (pressed.has('Escape')) this.ui = 'menu'
        if (confirm) {
          if (this.miscIdx === 1) {
            if (this.usableItems().length) this.ui = 'miscSub'
            this.miscSubIdx = 0
          } else if (this.miscIdx === 2) {
            this.submitAnd(sel, { kind: 'defend' })
          } else if (this.miscIdx === 3) {
            this.submitAnd(sel, { kind: 'flee' })
          } // 0 围攻 / 4 状态:未实现,无响应(灰显)
        }
      } else if (this.ui === 'miscSub') {
        // 物品二级:使用/投掷;Up|Left→使用 Down|Right→投掷
        if (pressed.has('ArrowUp') || pressed.has('ArrowLeft')) this.miscSubIdx = 0
        if (pressed.has('ArrowDown') || pressed.has('ArrowRight')) this.miscSubIdx = 1
        if (pressed.has('Escape')) this.ui = 'misc'
        if (confirm && this.miscSubIdx === 0) {
          this.ui = 'item'
          this.itemIdx = 0
        }
        if (confirm && this.miscSubIdx === 1 && this.throwableItems().length) {
          this.ui = 'throwItem'
          this.itemIdx = 0
        }
      } else if (this.ui === 'skill') {
        const p = expectDefined(s.players[sel])
        const list = p.skills
        // 3 列网格导航:左右 ±1,上下 ±3(clamp)
        if (pressed.has('ArrowLeft')) this.skillIdx = Math.max(0, this.skillIdx - 1)
        if (pressed.has('ArrowRight')) this.skillIdx = Math.min(list.length - 1, this.skillIdx + 1)
        if (pressed.has('ArrowUp')) this.skillIdx = Math.max(0, this.skillIdx - 3)
        if (pressed.has('ArrowDown')) this.skillIdx = Math.min(list.length - 1, this.skillIdx + 3)
        if (pressed.has('Escape')) this.ui = 'menu'
        if (confirm) {
          const skillId = expectDefined(list[this.skillIdx % list.length])
          const skill = this.opts.skills?.[skillId]
          if (skill && p.mp >= (skill.cost.mp ?? 0) && this.moneyNow() >= (skill.cost.money ?? 0)) {
            if (skill.target === 'oneEnemy') {
              this.pendingSkillId = skillId
              this.ui = 'target'
              this.targetSide = 'enemy'
              this.targetIdx = 0
            } else if (skill.target === 'oneAlly' && s.players.length > 1) {
              // 对队友单体(还魂咒/冰心诀):进己方选人(单人队直落自己,不弹选人)
              this.pendingSkillId = skillId
              this.ui = 'target'
              this.targetSide = 'ally'
              this.targetIdx = sel
            } else {
              this.submitAnd(sel, { kind: 'cast', skillId })
            }
          } // MP 不足/缺数据:留在网格(灰显)
        }
      } else if (this.ui === 'item') {
        const list = this.usableItems()
        if (pressed.has('ArrowLeft')) this.itemIdx = Math.max(0, this.itemIdx - 1)
        if (pressed.has('ArrowRight')) this.itemIdx = Math.min(list.length - 1, this.itemIdx + 1)
        if (pressed.has('ArrowUp')) this.itemIdx = Math.max(0, this.itemIdx - 3)
        if (pressed.has('ArrowDown')) this.itemIdx = Math.min(list.length - 1, this.itemIdx + 3)
        if (pressed.has('Escape')) this.ui = 'miscSub'
        if (confirm && list.length) {
          const it = expectDefined(list[this.itemIdx % list.length])
          if (this.state.items[it.itemId]?.use?.target === 'oneAlly' && s.players.length > 1) {
            // oneAlly 物品(还魂香/灵心符):选队友(可选尸体 —— 复活正需要);单人队直落自己
            this.pendingItemId = it.itemId
            this.ui = 'target'
            this.targetSide = 'ally'
            this.targetIdx = sel
          } else {
            this.submitAnd(sel, { kind: 'item', itemId: it.itemId })
          }
        }
      } else if (this.ui === 'throwItem') {
        const list = this.throwableItems()
        if (pressed.has('ArrowLeft')) this.itemIdx = Math.max(0, this.itemIdx - 1)
        if (pressed.has('ArrowRight')) this.itemIdx = Math.min(list.length - 1, this.itemIdx + 1)
        if (pressed.has('ArrowUp')) this.itemIdx = Math.max(0, this.itemIdx - 3)
        if (pressed.has('ArrowDown')) this.itemIdx = Math.min(list.length - 1, this.itemIdx + 3)
        if (pressed.has('Escape')) this.ui = 'miscSub'
        if (confirm && list.length) {
          const itemId = expectDefined(list[this.itemIdx % list.length]).itemId
          const thrown = expectDefined(this.state.items[itemId]?.throw)
          if (thrown.target === 'allEnemies') {
            this.submit(sel, { kind: 'throw', itemId })
            this.pendingThrowItem = null
            this.backToMain()
          } else {
            // 单体投掷才进入敌方目标选择。
            this.pendingThrowItem = itemId
            this.ui = 'target'
            this.targetSide = 'enemy'
            this.targetIdx = 0
          }
        }
      } else if (this.ui === 'target' && this.targetSide === 'ally') {
        // 己方选人(oneAlly 技能/物品):全队成员循环,**含死者**(还魂要点名尸体);
        // 高亮闪目标,Esc 回来源列表,确认提交带 targetAllyIdx
        const n = s.players.length
        if (pressed.has('ArrowLeft') || pressed.has('ArrowUp'))
          this.targetIdx = (this.targetIdx + n - 1) % n
        if (pressed.has('ArrowRight') || pressed.has('ArrowDown'))
          this.targetIdx = (this.targetIdx + 1) % n
        if (pressed.has('Escape')) {
          this.targetSide = 'enemy'
          if (this.pendingItemId) {
            this.pendingItemId = null
            this.ui = 'item'
          } else {
            this.pendingSkillId = null
            this.ui = 'skill'
          }
        }
        if (confirm) {
          const t = this.targetIdx % n
          const action: BattleAction = this.pendingItemId
            ? { kind: 'item', itemId: this.pendingItemId, targetAllyIdx: t }
            : { kind: 'cast', skillId: expectDefined(this.pendingSkillId), targetAllyIdx: t }
          this.pendingItemId = null
          this.pendingSkillId = null
          this.targetSide = 'enemy'
          this.submit(sel, action)
          this.backToMain()
        }
      } else if (this.ui === 'target') {
        const alive = this.aliveEnemyIdxs()
        if (alive.length === 0) return
        if (pressed.has('ArrowLeft'))
          this.targetIdx = (this.targetIdx + alive.length - 1) % alive.length
        if (pressed.has('ArrowRight')) this.targetIdx = (this.targetIdx + 1) % alive.length
        // 返回:投掷态回投掷选物,否则回主菜单(合击/普攻/仙术选敌均回菜单)
        if (pressed.has('Escape')) {
          if (this.pendingThrowItem) {
            this.pendingThrowItem = null
            this.ui = 'throwItem'
          } else {
            this.pendingCoop = false
            this.ui = 'menu'
          }
        }
        if (confirm) {
          const t = expectDefined(alive[this.targetIdx % alive.length])
          const action: BattleAction = this.pendingThrowItem
            ? { kind: 'throw', itemId: this.pendingThrowItem, targetEnemyIdx: t }
            : this.pendingCoop
              ? { kind: 'coop', targetEnemyIdx: t }
              : this.pendingSkillId
                ? { kind: 'cast', skillId: this.pendingSkillId, targetEnemyIdx: t }
                : { kind: 'attack', targetEnemyIdx: t }
          const wasCoop = this.pendingCoop
          this.pendingSkillId = null
          this.pendingThrowItem = null
          this.pendingCoop = false
          this.submit(sel, action)
          if (wasCoop) this.consumeOthersForCoop(sel) // 合击消耗其余队员本回合出手
          this.backToMain()
        }
      }
      return
    }

    if (s.phase === 'performAction') {
      this.ui = 'acting'
      if (this.pumpScriptExecution(dtMs, pressed)) return
      // M4d-2:动画回放中 → 只推进;播完收尾(复位/死亡淡出/死音)
      if (this.anim) {
        if (!this.anim.tick(dtMs)) return
        this.anim = null
        this.finishStepVisuals()
        return
      }
      this.actTimer += dtMs
      if (this.actTimer < ACT_MS) return
      this.actTimer = 0
      const queueHead = s.actionQueue[0]
      if (queueHead?.isEnemy && !this.readyHookEntries.has(queueHead)) {
        this.readyHookEntries.add(queueHead)
        const enemy = s.enemies[queueHead.idx]
        const readyAllowed =
          !this.pendingTerminal &&
          !!enemy &&
          enemy.hp > 0 &&
          s.hidingTime <= 0 &&
          canAct(enemy.status) &&
          enemy.status.confused <= 0
        if (readyAllowed) {
          const activation = beginEnemyHookActivation(s, queueHead.idx, 'ready')
          if (activation) {
            this.activeHook = activation
            this.choreoName = lookupText(
              expectDefined(enemy).scriptOwnerDef.name,
              this.opts.locale ?? {},
            )
            this.pumpScriptExecution(dtMs, pressed)
            return
          }
        }
      }
      // hp/mp 快照 → 走一步 → 物攻建时间线回放;其余动作即时反馈(cast/物品时间线后续刀)
      const pHp = s.players.map((p) => p.hp)
      const pMp = s.players.map((p) => p.mp)
      const eHp = s.enemies.map((e) => e?.hp ?? 0)
      const eConfused = s.enemies.map((e) => e?.status.confused ?? 0)
      const playerAppearanceBefore = s.players.map(
        (player, index) =>
          player.tranceBattleSprite ?? expectDefined(this.assets.playerBaseDefinitionIds[index]),
      )
      const enemyAppearanceBefore = s.enemies.map((enemy) => enemy?.def.battleSprite ?? '')
      stepBattle(s, this.rng)
      const la = s.lastAction
      s.lastAction = null // 消费即清(回合末空步不重播)
      this.pendingFailureFeedback = la?.failureFeedback ?? null
      // 结果横幅(偷窃「获得 …」/金蝉 boss「无法逃离!」/乾坤「金钱不足」;fight.c:5288 CLASSIC
      // 居中对话框,一阶段 narration 同款):战斗标签位 (130,75),1.2s 自清(时间线播完后仍显示)
      if (la?.notice)
        this.itemBanner = { text: la.notice, untilMs: this.nowMs + 1200, x: 130, y: 75 }
      // 本步死亡敌(动画收尾统一开淡出 + death 音;一阶段 diedFromAttack 语义)
      this.pendingDeaths = s.enemies
        .map((e, i) =>
          i < eHp.length && e && expectDefined(eHp[i]) > 0 && e.hp <= 0 && !s.enemyFled ? i : -1,
        )
        .filter((i) => i >= 0)
      // 本步数值反馈：回血黄字/回 MP 青字；物品造成的自伤按原版
      // PAL_BattleDisplayStatChange 显示蓝字。其它伤害仍由各自攻击时间线负责，避免重复。
      this.pendingGains = []
      s.players.forEach((p, i) => {
        const dh = p.hp - (pHp[i] ?? p.hp)
        if (dh > 0)
          this.pendingGains.push({ target: { side: 'player', idx: i }, value: dh, tone: 'yellow' })
        else if (dh < 0 && la?.kind === 'item' && la.side === 'player')
          this.pendingGains.push({ target: { side: 'player', idx: i }, value: -dh, tone: 'blue' })
        const dm = p.mp - (pMp[i] ?? p.mp)
        if (dm > 0)
          this.pendingGains.push({ target: { side: 'player', idx: i }, value: dm, tone: 'cyan' })
      })
      s.enemies.forEach((e, i) => {
        if (!e) return
        const dh = e.hp - (eHp[i] ?? e.hp)
        if (dh > 0)
          this.pendingGains.push({ target: { side: 'enemy', idx: i }, value: dh, tone: 'yellow' })
      })
      const timeline = this.buildStepTimeline(
        la,
        pHp,
        eHp,
        playerAppearanceBefore,
        enemyAppearanceBefore,
      )
      if (timeline) {
        s.enemies.forEach((enemy, index) => {
          if (enemy && (eConfused[index] ?? 0) <= 0 && enemy.status.confused > 0)
            this.pendingConfusedReveal.add(index)
        })
        this.startTimeline(timeline)
        return
      }
      // fallback(非物攻动作):即时飘字 + 敌施法音
      if (la?.side === 'enemy') {
        const snd = s.enemies[la.idx]?.def.sounds
        if (snd?.magic && la.kind === 'cast') this.assets.sfx?.play(snd.magic)
      }
      s.players.forEach((p, i) => {
        const d = expectDefined(pHp[i]) - p.hp
        if (d > 0) this.applyDamageFx({ side: 'player', idx: i }, d)
        const v = this.visual.players[i]
        if (v) v.displayHp = p.hp
      })
      s.enemies.forEach((e, i) => {
        if (!e) return
        const d = (eHp[i] ?? e.hp) - e.hp
        if (d > 0) this.applyDamageFx({ side: 'enemy', idx: i }, d)
      })
      this.finishStepVisuals()
    }
  }

  /** 结算 diff → 掉血数字列表(法术可群体;heal 不弹,恢复数字后续)。 */
  private diffDamageNums(
    pHp: number[],
    eHp: number[],
  ): Array<{ target: { side: 'player' | 'enemy'; idx: number }; value: number }> {
    const s = this.state
    const out: Array<{ target: { side: 'player' | 'enemy'; idx: number }; value: number }> = []
    s.players.forEach((p, i) => {
      const d = (pHp[i] ?? p.hp) - p.hp
      if (d > 0) out.push({ target: { side: 'player', idx: i }, value: d })
    })
    s.enemies.forEach((e, i) => {
      if (!e) return
      const d = (eHp[i] ?? e.hp) - e.hp
      if (d > 0) out.push({ target: { side: 'enemy', idx: i }, value: d })
    })
    return out
  }

  /** 施法动作 → 时间线(玩家/敌;fire sprite 由预载表取,设 currentFire)。 */
  private buildCastTimeline(
    la: Extract<BattleLastAction, { kind: 'cast' | 'coop' }>,
    pHp: number[],
    eHp: number[],
  ): AnimFrame[] | null {
    const s = this.state
    const skill = this.opts.skills?.[la.skillId]
    if (!skill) return null
    const execution = resolveSkillExecution(skill, la.side)
    const a = execution.animation
    const skillEffects = execution.effects
    const fire = this.assets.fireSprites?.[a.effectSprite]
    this.currentFire = la.fizzled ? null : (fire ?? null)
    // 召唤：effect 直接引用 summon profile 定义，资源已在进战 readiness 完整预载。
    const summonEff = skillEffects.find((e) => e.kind === 'summon')
    const summonSprite =
      !la.fizzled && summonEff?.kind === 'summon'
        ? this.requireAppearance(summonEff.battleSprite, 'summon').sprite
        : null
    this.currentSummon = summonSprite
    const fx: CastFxParams = {
      placement: a.placement ?? 'normal',
      xOffset: a.xOffset ?? 0,
      yOffset: a.yOffset ?? 0,
      layerOffset: a.layerOffset ?? 0,
      speed: a.speed ?? 0,
      fireDelay: a.fireDelay ?? 0,
      effectTimes: a.effectTimes ?? 0,
      shake: a.shake ?? 0,
      ...(a.preShake ? { preShake: a.preShake } : {}),
      wave: a.wave ?? 0,
      ...(a.sound ? { sound: a.sound } : {}),
    }
    const damageNums = la.fizzled ? [] : this.diffDamageNums(pHp, eHp)
    if (la.side === 'player') {
      const playerProfile = this.playerAppearance(la.idx).definition.profile
      if (playerProfile.kind !== 'player-fighter') throw new Error('player profile 漂移')
      const casterPos = getPlayerBasePos(s.players.length, la.idx)
      if (!casterPos) return null
      // normal 落点:敌目标(攻击系)或施法者自身(heal/self)
      const targetPos =
        la.targetEnemyIdx !== undefined
          ? (s.enemies[la.targetEnemyIdx]?.basePos ?? casterPos)
          : casterPos
      // PostMagic 受击目标:掉血的敌人(fight.c wPrevHP≠wHealth 语义 → damageNums 敌方项)
      const postTargets = damageNums
        .filter((d) => d.target.side === 'enemy')
        .map((d) => ({
          idx: d.target.idx,
          pos: s.enemies[d.target.idx]?.basePos ?? { x: 160, y: 100 },
        }))
      // 召唤背景染色量 = summon 效果自己的 tint(原召唤 magic 的 wEffectTimes SHORT,
      // fight.c:3145;⚠ animation.effectTimes 是二次法术循环数,与染色无关 —— 曾混淆)
      this.summonTintShift = !la.fizzled && summonEff?.kind === 'summon' ? (summonEff.tint ?? 0) : 0
      // 合击(非召唤):走聚拢队形演出(贡献者靠拢→后→前依次施法→放技能)。
      // 召唤类合击照原版直接播召唤动画(落入下方 buildPlayerCast summon 段,不聚拢)。
      if (la.coopContributors && !summonSprite) {
        return buildPlayerCoop({
          framesByPlayer: s.players.map((_, index) => this.playerFrames(index)),
          casterIdx: la.idx,
          contributorIdxs: la.coopContributors,
          partySize: s.players.length,
          partyPositions: s.players.map((_, i) => getPlayerBasePos(s.players.length, i)),
          fireFrames: la.fizzled ? 0 : (fire?.frames.length ?? 0),
          fx,
          targetPos,
          damageNums,
          postTargets,
          ...(this.opts.soundRoles?.['audio.battleCoopCastSound']
            ? { castSound: this.opts.soundRoles['audio.battleCoopCastSound'] }
            : {}),
        })
      }
      return buildPlayerCast({
        casterFrames: playerProfile.frames,
        casterIdx: la.idx,
        casterPos,
        // 施法吟唱音(rgwMagicSound;挂 PreMagic frame5 姿势帧,一阶段真值)
        ...(this.opts.playerSounds?.[la.idx]?.magic
          ? { magicSound: expectDefined(this.opts.playerSounds[la.idx]).magic }
          : {}),
        // fSummon 语义(fight.c:2380):召唤跳过施法者自身前摇特效
        castEffectBase:
          summonEff?.kind !== 'summon' && this.assets.effectSprite
            ? playerProfile.castEffectBase
            : -1,
        partyIdxs: s.players.map((_, i) => i),
        fireFrames: la.fizzled ? 0 : (fire?.frames.length ?? 0),
        fx,
        targetPos,
        damageNums,
        postTargets,
        ...(!la.fizzled && a.keepEffect ? { keepEffect: true } : {}),
        ...(summonSprite
          ? {
              summon: {
                frames: summonSprite.frames.length,
                // 召唤自身音(变亮首帧;二级段 fSummon 静默)
                ...(summonEff?.kind === 'summon' && summonEff.sound
                  ? { sound: summonEff.sound }
                  : {}),
                // 神将段帧速 = 召唤 magic 自己的 wSpeed(effects.summon.speed);fx.speed 是二次法术的
                frameTimeMs:
                  (((summonEff?.kind === 'summon' ? summonEff.speed : undefined) ?? 0) + 5) * 10,
                // 一阶段真值 posSummon = (240+xOffset, 165+yOffset),底中锚语义;render 已对全部
                // overlay 统一底中锚 blit(x−⌊w/2⌋, y−h)→ 这里传原值,每帧独立锚底(神将各帧
                // 尺寸不同也不漂,battle.c:173-177 同义)。曾按旧左上假设预减 → 双重减锚偏左上
                // (2026-07-05 演出审计发现,随 render 锚点修正未跟所致)。
                x: 240 + fx.xOffset,
                y: 165 + fx.yOffset,
              },
            }
          : {}),
      })
    }
    const def = s.enemies[la.idx]?.def
    if (!def) return null
    const enemyProfile = this.enemyAppearance(la.idx).definition.profile
    if (enemyProfile.kind !== 'enemy') throw new Error('enemy profile 漂移')
    const targetPos = getPlayerBasePos(s.players.length, la.targetPlayerIdx)
    if (!targetPos) return null
    const enemyFx = { ...fx }
    if (def.sounds.suppressMagicEffectSound) delete enemyFx.sound
    return buildEnemyCast({
      enemyIdx: la.idx,
      anim: enemyProfile,
      playerFrames: s.players.map((_, index) => this.playerFrames(index)),
      magicSound: def.sounds.magic,
      fireFrames: fire?.frames.length ?? 0,
      fx: enemyFx,
      targetPos,
      damageNums,
      ...(a.keepEffect ? { keepEffect: true } : {}),
      // 被动格挡队员摆防御姿 frame3(除因子 +1 减伤;fight.c:4737/4755)
      ...(la.autoDefend?.length ? { autoDefendPlayers: la.autoDefend } : {}),
      // 受伤队员受击反应(frame4+红闪+递减击退;一阶段 19f8d6a9 曾整段漏)
      hurtPlayers: damageNums
        .filter((d) => d.target.side === 'player')
        .map((d) => ({
          idx: d.target.idx,
          pos: getPlayerBasePos(s.players.length, d.target.idx) ?? { x: 240, y: 170 },
        })),
    })
  }

  /** 物攻/施法动作 → 一阶段真值时间线;其余 null(fallback 即时反馈)。 */
  private buildStepTimeline(
    la: BattleLastAction | null,
    pHp: number[],
    eHp: number[],
    playerAppearanceBefore: readonly string[],
    enemyAppearanceBefore: readonly string[],
  ): AnimFrame[] | null {
    const s = this.state
    if (!la) return null
    if (la.kind === 'cast') {
      // scriptOnUse 消耗门失败仍保留玩家 PreMagic/施法音，但必须先于 trance、steal、
      // flee 等专用 effect 路由截断，不能让失败施法产生任何成功效果演出。
      if (la.fizzled) return this.buildCastTimeline(la, pHp, eHp)
      const trance = la.skillId
        ? (() => {
            const castSkill = s.skills[la.skillId]
            return castSkill
              ? resolveSkillExecution(castSkill, la.side).effects.find(
                  (effect) => effect.kind === 'trance',
                )
              : undefined
          })()
        : undefined
      if (la.side === 'player' && trance?.kind === 'trance') {
        const oldDefinitionId = expectDefined(playerAppearanceBefore[la.idx])
        const oldAppearance = this.requireAppearance(oldDefinitionId, 'player-fighter')
        const newAppearance = this.requireAppearance(trance.battleSprite, 'player-fighter')
        const oldProfile = oldAppearance.definition.profile
        const newProfile = newAppearance.definition.profile
        if (oldProfile.kind !== 'player-fighter' || newProfile.kind !== 'player-fighter')
          throw new Error('trance profile 漂移')
        const casterPos = getPlayerBasePos(s.players.length, la.idx)
        if (!casterPos) return null
        return buildPlayerTrance({
          casterIdx: la.idx,
          casterPos,
          oldDefinitionId,
          newDefinitionId: trance.battleSprite,
          oldFrames: oldProfile.frames,
          newFrames: newProfile.frames,
          castEffectBase: this.assets.effectSprite ? oldProfile.castEffectBase : -1,
          ...(this.opts.playerSounds?.[la.idx]?.magic
            ? { magicSound: expectDefined(this.opts.playerSounds[la.idx]).magic }
            : {}),
        })
      }
      // 偷窃技(飞龙探云手):专用冲刺时间线(一阶段 buildStealTimeline;技能 effectSprite=65535
      // 本就无特效,generic cast 会打空气)—— 冲到敌前 5 步滑步 + 敌闪白
      const sk = la.skillId ? s.skills[la.skillId] : undefined
      const skEffects = sk ? resolveSkillExecution(sk, la.side).effects : []
      if (
        la.side === 'player' &&
        la.targetEnemyIdx !== undefined &&
        skEffects.some((e) => e.kind === 'steal')
      ) {
        const pos = s.enemies[la.targetEnemyIdx]?.basePos
        const stealFrame = this.playerFrames(la.idx).steal
        if (pos && stealFrame !== undefined)
          return buildSteal({
            casterIdx: la.idx,
            targetIdx: la.targetEnemyIdx,
            enemyPos: pos,
            stealFrame,
          })
        if (pos)
          throw new Error(
            `BattleSpriteDef "${this.playerAppearance(la.idx).definition.id}" 缺 steal 命名帧`,
          )
      }
      // 金蝉脱壳(fleeBattle;effectSprite=65535 无特效,generic cast 会打空气):
      // 成功 → 全队滑出屏(flee 命令成功同款演出);boss 失败 → 无演出,「无法逃离!」横幅已弹
      if (la.side === 'player' && skEffects.some((e) => e.kind === 'fleeBattle')) {
        if (!la.fleeSuccess) return null
        const alive = s.players
          .map((_, i) => i)
          .filter((i) => (pHp[i] ?? 0) > 0)
          .map((i) => ({
            idx: i,
            pos: getPlayerBasePos(s.players.length, i) ?? { x: 240, y: 170 },
            idleFrame: this.playerFrames(i).idle,
          }))
        if (!alive.length) return null
        this.skipNextReset = true
        return buildPartyFlee({
          players: alive,
          ...(this.opts.soundRoles?.['audio.battleEscapeSound']
            ? { sound: this.opts.soundRoles['audio.battleEscapeSound'] }
            : {}),
        })
      }
      return this.buildCastTimeline(la, pHp, eHp)
    }
    // 合击:走 buildCastTimeline(内含 coopContributors 分支 → buildPlayerCoop 聚拢队形演出;
    // 召唤类合击落 summon 段直接播召唤动画)。
    if (la.kind === 'coop') return this.buildCastTimeline(la, pHp, eHp)
    // 使用物品(fight.c:2266 举物 + 目标彩色呼吸;v1 施己 → 目标 = 自己)。
    // 物品名走时间线 banner 帧(与举物/音效同帧起显,作者对照原版确认「三同步」);
    // 玩家侧涨益数字从收尾统一弹**挪进时间线**(归位前弹 = 作者对照原版时序;
    // 从 pendingGains 取走防双弹,敌侧涨益仍走收尾)。
    if (la.kind === 'item' && la.side === 'player') {
      const casterPos = getPlayerBasePos(s.players.length, la.idx)
      if (!casterPos) return null
      const itemName = la.itemId ? s.items[la.itemId]?.name : undefined
      const gains = this.pendingGains
        .filter((g) => g.target.side === 'player')
        .map((g) => ({ idx: g.target.idx, value: g.value, tone: g.tone }))
      this.pendingGains = this.pendingGains.filter((g) => g.target.side !== 'player')
      // oneAlly 点名队友时呼吸落在目标身上(还魂香喂尸体);缺省施己
      return buildUseItem({
        casterFrames: this.playerFrames(la.idx),
        casterIdx: la.idx,
        casterPos,
        targetIdxs: [la.targetAllyIdx ?? la.idx],
        itemName,
        ...(() => {
          const sound = la.itemId
            ? (s.items[la.itemId]?.use?.sound ?? this.opts.soundRoles?.['audio.battleItemUseSound'])
            : this.opts.soundRoles?.['audio.battleItemUseSound']
          return sound ? { sound } : {}
        })(),
        gains,
      })
    }
    // 玩家逃跑(fight.c:4126-4171):成功 = 全队 16 帧滑右下出屏(不复位,人已离场);
    // 失败 = 挪 3 小步 + frame1 定格 320ms + 「逃跑失败」label,复位交收尾
    if (la.kind === 'flee' && la.side === 'player') {
      if (la.fleeSuccess) {
        const alive = s.players
          .map((_, i) => i)
          .filter((i) => (pHp[i] ?? 0) > 0)
          .map((i) => ({
            idx: i,
            pos: getPlayerBasePos(s.players.length, i) ?? { x: 240, y: 170 },
            idleFrame: this.playerFrames(i).idle,
          }))
        if (!alive.length) return null
        this.skipNextReset = true
        return buildPartyFlee({
          players: alive,
          ...(this.opts.soundRoles?.['audio.battleEscapeSound']
            ? { sound: this.opts.soundRoles['audio.battleEscapeSound'] }
            : {}),
        })
      }
      const pos = getPlayerBasePos(s.players.length, la.idx)
      return pos ? buildFleeFail({ idx: la.idx, pos, frames: this.playerFrames(la.idx) }) : null
    }
    // 敌整场逃离(battle.c:1376 0x69):全体 10ms/x−5 滑出左屏 + 停 500ms;
    // hp 已被 core 清零 → fleeingEnemies 渲染豁免,收尾不复位
    if (la.kind === 'fleeAll' && la.side === 'enemy') {
      const fleeing = s.enemies
        .map((e, i) => ({ e, i }))
        .filter(({ e, i }) => !!e && (eHp[i] ?? 0) > 0)
        .filter((entry): entry is { e: NonNullable<typeof entry.e>; i: number } => !!entry.e)
        .map(({ e, i }) => ({
          idx: i,
          pos: e.basePos,
          width: this.enemyAppearance(i).sprite.frames[0]?.width ?? 80,
        }))
      if (!fleeing.length) return null
      this.fleeingEnemies = fleeing.map((f) => f.idx)
      this.skipNextReset = true
      return buildEnemyEscape({
        enemies: fleeing,
        ...(this.opts.soundRoles?.['audio.battleEscapeSound']
          ? { sound: this.opts.soundRoles['audio.battleEscapeSound'] }
          : {}),
      })
    }
    // 敌变身现形：资源已由开战前 BFS readiness 同步备妥，动作期严禁再发 IO。
    if (la.kind === 'transform' && la.side === 'enemy') {
      const oldDefinitionId = expectDefined(enemyAppearanceBefore[la.idx])
      const oldProfile = this.requireAppearance(oldDefinitionId, 'enemy').definition.profile
      const next = this.enemyAppearance(la.idx)
      const newProfile = next.definition.profile
      if (oldProfile.kind !== 'enemy' || newProfile.kind !== 'enemy')
        throw new Error('enemy transform profile 漂移')
      return buildEnemyTransform({
        idx: la.idx,
        oldDefinitionId,
        newDefinitionId: next.definition.id,
        oldIdleFrame: oldProfile.idle.start,
        newIdleFrame: newProfile.idle.start,
        ...(this.opts.soundRoles?.['audio.battleEnemyTransformSound']
          ? { sound: this.opts.soundRoles['audio.battleEnemyTransformSound'] }
          : {}),
      })
    }
    // 敌分裂(script.c:2776 0x9C):分身播种(visual 落本体位 + 共用本体精灵)→
    // 10 帧整数二分滑开到各自槽位
    if (la.kind === 'divide' && la.side === 'enemy' && la.spawnedIdxs?.length) {
      const mother = s.enemies[la.idx]
      if (!mother) return null
      for (const si of la.spawnedIdxs) {
        this.visual.enemies[si] = {
          x: mother.basePos.x,
          y: mother.basePos.y,
          frame: (() => {
            const profile = this.enemyAppearance(si).definition.profile
            if (profile.kind !== 'enemy') throw new Error('enemy profile 漂移')
            return profile.idle.start
          })(),
          colorShift: 0,
          displayHp: s.enemies[si]?.hp ?? 0,
        }
      }
      return buildEnemyDivide({
        motherPos: mother.basePos,
        spawns: la.spawnedIdxs.map((si) => ({
          idx: si,
          target: s.enemies[si]?.basePos ?? mother.basePos,
          idleFrame: (() => {
            const profile = this.enemyAppearance(si).definition.profile
            if (profile.kind !== 'enemy') throw new Error('enemy profile 漂移')
            return profile.idle.start
          })(),
        })),
      })
    }
    // 敌召唤：本体 magic 段起手；所有可达新怪已由 readiness 预载。
    if (la.kind === 'summon' && la.side === 'enemy') {
      const profile = this.enemyAppearance(la.idx).definition.profile
      if (profile.kind !== 'enemy') throw new Error('enemy profile 漂移')
      if (profile.magic.count <= 0) return null
      const frames: AnimFrame[] = []
      for (let i = 0; i < profile.magic.count; i++)
        frames.push({
          durationMs: 40 * profile.actTicksPerFrame,
          fighters: [{ side: 'enemy', idx: la.idx, frame: profile.magic.start + i }],
        })
      frames.push({
        durationMs: 40,
        fighters: [{ side: 'enemy', idx: la.idx, frame: profile.idle.start }],
      })
      return frames
    }
    // 投掷道具(frame5 投掷姿 → 目标染色闪 → 复位；纯施毒不显数字，即时伤害显蓝字)
    if (la.kind === 'throw' && la.side === 'player' && la.throwHits?.length) {
      const attackerPos = getPlayerBasePos(s.players.length, la.idx)
      if (!attackerPos) return null
      const item = la.itemId ? s.items[la.itemId] : undefined
      const throwSound = item?.throw?.sound
      const presentation = item?.throw?.presentation
      let throwPresentation: Parameters<typeof buildThrowItem>[0]['presentation']
      if (presentation?.kind === 'magic') {
        const a = presentation.animation
        const fire = this.assets.fireSprites?.[a.effectSprite]
        this.currentFire = fire ?? null
        throwPresentation = {
          fireFrames: fire?.frames.length ?? 0,
          fx: {
            placement: a.placement ?? 'normal',
            xOffset: a.xOffset ?? 0,
            yOffset: a.yOffset ?? 0,
            layerOffset: a.layerOffset ?? 0,
            speed: a.speed ?? 0,
            fireDelay: a.fireDelay ?? 0,
            effectTimes: a.effectTimes ?? 0,
            shake: a.shake ?? 0,
            ...(a.preShake ? { preShake: a.preShake } : {}),
            wave: a.wave ?? 0,
            ...(a.sound ? { sound: a.sound } : {}),
          },
          ...(item?.throw?.target === 'oneEnemy'
            ? {
                targetPos: s.enemies[la.throwHits[0]?.idx ?? -1]?.basePos ?? { x: 160, y: 100 },
              }
            : {}),
        }
      }
      return buildThrowItem({
        casterFrames: this.playerFrames(la.idx),
        casterIdx: la.idx,
        hits: la.throwHits.map((hit) => ({
          idx: hit.idx,
          damage: Math.max(0, (eHp[hit.idx] ?? 0) - (s.enemies[hit.idx]?.hp ?? 0)),
        })),
        ...(throwSound ? { sound: throwSound } : {}),
        ...(throwPresentation ? { presentation: throwPresentation } : {}),
      })
    }
    // 疯魔打友(fight.c:3790-3855):瞬移到队友旁挥兵器,数字/击退/红闪全套
    if (la.kind === 'attackMate' && la.side === 'player') {
      const attackerPos = getPlayerBasePos(s.players.length, la.idx)
      const matePos = getPlayerBasePos(s.players.length, la.targetAllyIdx)
      if (!attackerPos || !matePos) return null
      return buildMateAttack({
        attackerFrames: this.playerFrames(la.idx),
        mateFrames: this.playerFrames(la.targetAllyIdx),
        attackerIdx: la.idx,
        attackerPos,
        mateIdx: la.targetAllyIdx,
        matePos,
        weaponSound: this.opts.playerSounds?.[la.idx]?.weapon,
        damage: la.damage,
        mateDied: (s.players[la.targetAllyIdx]?.hp ?? 0) <= 0,
      })
    }
    // 长鞭攻全体(core 已逐敌减半结算;present 一挥扫全场)
    if (la.kind === 'attack' && la.side === 'player' && la.attackAllHits?.length) {
      const attackerPos = getPlayerBasePos(s.players.length, la.idx)
      if (!attackerPos) return null
      const hits = la.attackAllHits
        .map((h) => {
          const pos = s.enemies[h.idx]?.basePos
          return pos ? { idx: h.idx, pos, value: h.value } : null
        })
        .filter(
          (x): x is { idx: number; pos: { x: number; y: number }; value: number } => x !== null,
        )
      if (!hits.length) return null
      const snd = this.opts.playerSounds?.[la.idx]
      return buildPlayerAttackAll({
        frames: this.playerFrames(la.idx),
        attackerIdx: la.idx,
        attackerPos,
        centerPos: expectDefined(hits[Math.floor(hits.length / 2)]).pos, // 中心敌落点挥击
        hits,
        weaponSound: snd?.weapon,
        attackSound: la.crit ? snd?.critical : snd?.attack,
      })
    }
    // 敌混乱打友敌必须在普通敌人物攻过滤前走专用时间线。
    if (la.kind === 'attackMate' && la.side === 'enemy') {
      const attacker = s.enemies[la.idx]
      const target = s.enemies[la.targetEnemyIdx]
      const attackerPos = attacker?.basePos
      const targetPos = target?.basePos
      if (!attacker || !target || !attackerPos || !targetPos) return null
      const profile = this.enemyAppearance(la.idx).definition.profile
      if (profile.kind !== 'enemy') throw new Error('enemy profile 漂移')
      return buildEnemyMateAttack({
        attackerIdx: la.idx,
        targetIdx: la.targetEnemyIdx,
        attackerPos,
        targetPos,
        targetHeight: this.enemyAppearance(la.targetEnemyIdx).sprite.frames[0]?.height ?? 40,
        anim: profile,
        damage: la.damage,
        targetDied: target.hp <= 0,
      })
    }
    if (la.kind !== 'attack') return null
    if (la.side === 'player') {
      const t = la.targetEnemyIdx
      if ((eHp[t] ?? 0) <= 0) return null // 目标已死 = core 空过,无动画
      const attackerPos = getPlayerBasePos(s.players.length, la.idx)
      const targetPos = s.enemies[t]?.basePos
      if (!attackerPos || !targetPos) return null
      const totalDmg = (eHp[t] ?? 0) - (s.enemies[t]?.hp ?? 0)
      const second = la.secondDamage // 连击第二击(present 追加一挥,音效自然落不同帧)
      const firstDmg = totalDmg - (second ?? 0)
      const snd = this.opts.playerSounds?.[la.idx]
      const attackInput = (damage: number, windup: boolean) => ({
        frames: this.playerFrames(la.idx),
        attackerIdx: la.idx,
        attackerPos,
        targetIdx: t,
        targetPos,
        targetHeight: this.enemyAppearance(t).sprite.frames[0]?.height ?? 40,
        effectFrameBase: this.assets.effectSprite
          ? (() => {
              const profile = this.playerAppearance(la.idx).definition.profile
              if (profile.kind !== 'player-fighter') throw new Error('player profile 漂移')
              return profile.attackEffectBase
            })()
          : -1,
        damage,
        windup,
        // 出招/兵器音;暴击换暴击喝声(rgwCriticalSound 替代 attackSound,fight.c:2065-2069)
        ...(snd
          ? {
              sounds: {
                attack: la.crit ? snd.critical : snd.attack,
                weapon: snd.weapon,
              },
            }
          : {}),
      })
      const t1 = buildPlayerAttack(attackInput(firstDmg, true))
      // 连击:第二挥无 windup(fight.c:windup 仅回合首击);两挥兵器音各在自帧 → 不同帧折叠免疫
      return second === undefined ? t1 : [...t1, ...buildPlayerAttack(attackInput(second, false))]
    }
    // 敌物攻
    const t = la.targetPlayerIdx
    const enemyPos = s.enemies[la.idx]?.basePos
    const targetPos = getPlayerBasePos(s.players.length, t)
    const def = s.enemies[la.idx]?.def
    if (!enemyPos || !targetPos || !def) return null
    return buildEnemyPhysical({
      enemyIdx: la.idx,
      enemyPos,
      targetIdx: t,
      targetPos,
      anim: (() => {
        const profile = this.enemyAppearance(la.idx).definition.profile
        if (profile.kind !== 'enemy') throw new Error('enemy profile 漂移')
        return profile
      })(),
      playerFrames: s.players.map((_, index) => this.playerFrames(index)),
      sounds: { action: def.sounds.action, call: def.sounds.call },
      // 被动格挡演出(免伤免数字+格挡姿;音 = 目标玩家自己的 coverSound)
      ...(la.blocked ? { blocked: true } : {}),
      ...(la.blocked && this.opts.playerSounds?.[t]?.cover
        ? { coverSound: expectDefined(this.opts.playerSounds[t]).cover }
        : {}),
      // 替挡(coveredBy):守护者顶身前接刀,音 = **守护者**的 coverSound
      ...(la.blocked && la.coverIdx !== undefined
        ? {
            cover: {
              idx: la.coverIdx,
              ...(this.opts.playerSounds?.[la.coverIdx]?.cover
                ? { sound: expectDefined(this.opts.playerSounds[la.coverIdx]).cover }
                : {}),
            },
          }
        : {}),
      damage: (pHp[t] ?? 0) - (s.players[t]?.hp ?? 0),
      targetDied: (s.players[t]?.hp ?? 0) <= 0,
    })
  }

  /** 手动/快捷键提交统一入口:记 lastActs(R 重复源)+ submitOrder(Esc 回退)。 */
  private submit(sel: number, act: BattleAction): void {
    this.state.pendingActions.set(sel, act)
    this.lastActs.set(sel, act)
    this.submitOrder.push(sel)
  }

  /** submit + 回主菜单(快捷键 D/Q 一步提交用)。 */
  private submitAnd(sel: number, act: BattleAction): void {
    this.submit(sel, act)
    this.backToMain()
  }

  /** 强行/自动:普攻首活敌(无活敌退化防御)。F/A 快捷键与粘滞轮转共用。 */
  private submitForce(sel: number): void {
    const alive = this.aliveEnemyIdxs()
    this.submitAnd(
      sel,
      alive.length
        ? { kind: 'attack', targetEnemyIdx: expectDefined(alive[0]) }
        : { kind: 'defend' },
    )
  }

  /** R 重复:重提上回合动作;物品耗尽/MP 不足/目标已死 → 修正或退化普攻(uibattle.c repeat 语义)。 */
  private submitRepeat(sel: number): void {
    let act = this.lastActs.get(sel)
    if (act?.kind === 'item') {
      const id = act.itemId
      if (!this.usableItems().some((i) => i.itemId === id)) act = undefined
    }
    if (act?.kind === 'throw') {
      const id = act.itemId
      if (!this.throwableItems().some((i) => i.itemId === id)) act = undefined
    }
    if (act?.kind === 'cast') {
      const sk = this.opts.skills?.[act.skillId]
      const p = this.state.players[sel]
      if (!sk || !p || p.mp < (sk.cost.mp ?? 0) || this.moneyNow() < (sk.cost.money ?? 0))
        act = undefined
    }
    if (act && 'targetEnemyIdx' in act && act.targetEnemyIdx !== undefined) {
      const alive = this.aliveEnemyIdxs()
      if (!alive.includes(act.targetEnemyIdx)) {
        act = alive.length ? { ...act, targetEnemyIdx: expectDefined(alive[0]) } : undefined
      }
    }
    if (!act) {
      this.submitForce(sel)
      return
    }
    this.submitAnd(sel, act)
  }

  /** 时间线 delta → 表现层(原版语义:pos 直落;连续位移由时间线插值帧承担)。 */
  private applyDelta(d: {
    side: 'player' | 'enemy'
    idx: number
    frame?: number
    pos?: { x: number; y: number }
    colorShift?: number
  }): void {
    const v = d.side === 'player' ? this.visual.players[d.idx] : this.visual.enemies[d.idx]
    if (!v) return
    if (d.frame !== undefined) v.frame = d.frame
    if (d.pos) {
      v.x = d.pos.x
      v.y = d.pos.y
    }
    if (d.colorShift !== undefined) v.colorShift = d.colorShift
  }

  /** 伤害表现:蓝数字飘字(一阶段 damageNum blue)+ displayHp 同步到结算值。 */
  private applyDamageFx(
    t: { side: 'player' | 'enemy'; idx: number },
    value: number,
    tone: 'blue' | 'yellow' | 'cyan' = 'blue',
  ): void {
    const v = t.side === 'player' ? this.visual.players[t.idx] : this.visual.enemies[t.idx]
    if (!v) return
    // 数字锚 = 一阶段真值(present-battle.ts showDamageNum,fight.c:640-708 + uibattle.c:1801):
    //   x:anchor.x−24 且 5 位右对齐(6px/位)→ 个位右缘 = 底中 + 6(drawNumber 右对齐语义直传)
    //   y:敌 −115 / 玩家 HP −75 / MP(cyan)−67,下限 10;固定偏移不随精灵高度(此前用
    //   spriteH 导致高矮怪数字忽高忽低 = 作者报「掉血数字歪」根因之一)
    const yOff = t.side === 'enemy' ? 115 : tone === 'cyan' ? 67 : 75
    this.floats.push({
      x: v.x + 6,
      y: Math.max(v.y - yOff, 10),
      text: '',
      num: value,
      tone,
      color: [0, 0, 0],
      bornAt: this.nowMs,
    })
    const cur = t.side === 'player' ? this.state.players[t.idx]?.hp : this.state.enemies[t.idx]?.hp
    if (cur !== undefined) v.displayHp = cur
  }

  /** 本步数值反馈缓冲(回血/回 MP/用品自伤；演出收尾统一弹 = 原版特效后时序)。 */
  private pendingGains: Array<{
    target: { side: 'player' | 'enemy'; idx: number }
    value: number
    tone: 'blue' | 'yellow' | 'cyan'
  }> = []

  private presentPendingFailureFeedback(): void {
    const feedback = this.pendingFailureFeedback
    this.pendingFailureFeedback = null
    if (!feedback) return
    const text =
      feedback === 'statusIneffective' ? '攻击无效' : assertNever(feedback, '战斗失败反馈')
    const box = this.assets.dialogBox
    if (box) {
      box.open(
        startDialogue({
          id: '__battle_action_failure',
          cues: [{ rows: [{ text }], slot: 'narration', autoAdvance: 1400 }],
        }),
        this.nowMs,
      )
    } else {
      // headless/资源缺失兜底；真实游戏路径始终使用 narration 卷轴。
      this.itemBanner = { text, untilMs: this.nowMs + 1400, x: 130, y: 75 }
    }
  }

  /** 每步收尾:表现层复位 + 死亡淡出登记(death 音)+ displayHp 兜底同步。 */
  private finishStepVisuals(): void {
    if (this.skipNextReset) this.skipNextReset = false
    else this.resetVisual()
    // per-action 瞬态复位(审计红线 #7;fight.c:2835 wave 还原语义)
    this.frameWaveAdd = 0
    this.screenShake = null
    this.summonVis = null
    // 涨益飘字(回血黄/回 MP 青;特效播完后弹 = DisplayStatChange 时序)
    for (const g of this.pendingGains) this.applyDamageFx(g.target, g.value, g.tone)
    this.pendingGains = []
    for (const i of this.pendingDeaths) {
      this.deathFades.set(i, this.nowMs)
      const e = this.state.enemies[i]
      if (e?.def.sounds.death) this.assets.sfx?.play(e.def.sounds.death)
    }
    this.pendingDeaths = []
    this.pendingConfusedReveal.clear()
    this.state.players.forEach((p, i) => {
      const v = this.visual.players[i]
      if (v) v.displayHp = p.hp
    })
    this.presentPendingFailureFeedback()
  }

  /** dev:战斗日志只读视图(M4c 验证)。 */
  debugLog(): readonly string[] {
    return this.state.log
  }

  /** dev/test:异步音效屏障只读状态。 */
  debugReadiness(): { phase: UiPhase; error?: string } {
    return {
      phase: this.ui,
      ...(this.readinessError ? { error: this.readinessError.message } : {}),
    }
  }

  /** dev:队员战斗态只读快照(护体符/毒携带/大蒜毒抗验证:roleId/hp/status/poisons/poisonRes)。 */
  debugPlayers(): {
    roleId: string
    hp: number
    status: BattleStatus
    poisons: ActivePoison[]
    poisonRes: number
  }[] {
    return this.state.players.map((p) => ({
      roleId: p.roleId,
      hp: p.hp,
      status: { ...p.status },
      poisons: p.poisons.map((x) => ({ ...x })),
      poisonRes: p.poisonRes ?? 0,
    }))
  }

  /** 战后把背包写回 world.inventory(消耗持久;count 0 清项)。 */
  writeBackInventory(inv: { itemId: string; count: number }[]): void {
    for (const s of this.state.inventory) {
      const w = inv.find((x) => x.itemId === s.itemId)
      if (w) w.count = s.count
    }
    for (let i = inv.length - 1; i >= 0; i--) if (expectDefined(inv[i]).count <= 0) inv.splice(i, 1)
  }

  /**
   * 把战斗用品产生的持久效果写回世界。胜利必须在经验结算前调用；败/逃在 done 后调用。
   * 方法幂等，避免胜利结算后再次用战斗快照覆盖升级奖励。
   */
  writeBackPersistentEffects(world: WorldState): void {
    if (this.persistentEffectsWritten) return
    for (const mutation of this.state.pendingWorldMutations) {
      if (mutation.kind !== 'fixedCharacterGrowth') continue
      const byId = world.party.filter((candidate) => candidate.id === mutation.characterId)
      const byTemplate = world.party.filter(
        (candidate) => candidate.template === mutation.actorTemplateId,
      )
      if (
        byId.length !== 1 ||
        byTemplate.length !== 1 ||
        expectDefined(byId[0]) !== expectDefined(byTemplate[0])
      )
        throw new Error(
          `fixedCharacterGrowth 写回定位失败：actor=${mutation.actorTemplateId}, character=${mutation.characterId}`,
        )
    }
    this.persistentEffectsWritten = true
    for (const mutation of this.state.pendingWorldMutations) {
      switch (mutation.kind) {
        case 'characterGrowth': {
          const character = world.party.find((candidate) => candidate.id === mutation.characterId)
          if (!character) break
          character.level = Math.min(99, character.level + mutation.delta.level)
          character.exp = mutation.expAfter
          character.maxHP += mutation.delta.maxHP
          character.maxMP += mutation.delta.maxMP
          character.attack += mutation.delta.attack
          character.magicAttack += mutation.delta.magicAttack
          character.defense += mutation.delta.defense
          character.speed += mutation.delta.speed
          character.luck += mutation.delta.luck
          break
        }
        case 'fixedCharacterGrowth': {
          const character = expectDefined(
            world.party.find((candidate) => candidate.id === mutation.characterId),
          )
          character.level += mutation.delta.level
          character.maxHP += mutation.delta.maxHP
          character.maxMP += mutation.delta.maxMP
          character.attack += mutation.delta.attack
          character.magicAttack += mutation.delta.magicAttack
          character.defense += mutation.delta.defense
          character.speed += mutation.delta.speed
          character.luck += mutation.delta.luck
          break
        }
        case 'hostileAwareness':
          world.hostileAwareness = { ...mutation.value }
          break
        case 'skillUse': {
          world.skillUseCounts ??= {}
          const counts = world.skillUseCounts
          counts[mutation.characterId] ??= {}
          const characterCounts = counts[mutation.characterId]
          if (!characterCounts) throw new Error(`skillUseCounts 缺角色 ${mutation.characterId}`)
          characterCounts[mutation.skillId] = mutation.usesAfter
          if (mutation.removed) {
            const learned = world.learnedSkills[mutation.characterId]
            if (learned) {
              const next = learned.filter((id) => id !== mutation.skillId)
              if (next.length !== learned.length) world.learnedSkills[mutation.characterId] = next
            }
          }
          break
        }
      }
    }
  }

  /** 战后把队员 HP/MP 写回 world.party(战斗内伤害/耗蓝持久;原版同,逃跑也保留伤害)。 */
  writeBackHp(party: { id: string; hp: number; mp: number }[]): void {
    for (const p of this.state.players) {
      const c = party.find((x) => x.id === p.roleId)
      if (!c) continue
      c.hp = this.state.phase === 'lost' ? Math.max(p.hp, 0) : Math.max(p.hp, 1) // 胜/逃至少留 1
      c.mp = p.mp
    }
  }

  render(ctx: CanvasRenderingContext2D, worldScale: number): void {
    // 震屏 = 整帧合成级垂直位移(所有图层+UI 之上;video.c UpdateScreen 输出级 —— 一阶段
    // daaaae51 血泪:只接大世界路径漏战斗侧 = 山神震屏不显示)。露出条带填黑。
    const dy = shakeOffsetY(this.screenShake, this.nowMs)
    if (dy !== 0) {
      ctx.save()
      ctx.translate(0, dy * worldScale)
    }
    try {
      this.renderInner(ctx, worldScale)
    } finally {
      if (dy !== 0) {
        ctx.restore()
        ctx.fillStyle = '#000'
        const band = Math.abs(dy) * worldScale
        if (dy > 0) ctx.fillRect(0, 0, ctx.canvas.width, band)
        else ctx.fillRect(0, ctx.canvas.height - band, ctx.canvas.width, band)
      }
    }
  }

  /** confused idle 抖动只属于已完成生效的状态；本步新状态在 OffMagic 收尾前保持静止。 */
  private enemyConfusedJitterX(
    enemyIdx: number,
    enemy: { hp: number; status: BattleStatus },
  ): number {
    if (
      this.pendingConfusedReveal.has(enemyIdx) ||
      enemy.hp <= 0 ||
      enemy.status.confused <= 0 ||
      enemy.status.sleep > 0 ||
      enemy.status.paralyzed > 0
    )
      return 0
    return Math.floor(Math.random() * 3) - 1
  }

  private renderInner(ctx: CanvasRenderingContext2D, worldScale: number): void {
    const s = this.state
    const now = this.nowMs
    // 召唤可见度 summonShow(0 = 队员全显/神全隐 … 1 = 队员全隐/神全显);相内 time-based
    const sv = this.summonVis
    const svT =
      sv === null
        ? 0
        : sv.phase === 'hold'
          ? 1
          : Math.min(1, Math.max(0, (now - sv.start) / (72 * 16)))
    const summonShow = sv === null ? 0 : sv.phase === 'out' ? 1 - svT : svT
    // 隐身可见度 hideVis(0 显 → 1 全隐):hidingTime 边沿触发 72×16ms 渐变
    // (原版激活/结束各走一次 PAL_BattleFadeScene 溶解,battle.c:609 12×6×16ms)
    const hiddenNow = s.hidingTime > 0
    if (hiddenNow !== this.prevHidden) {
      this.hideFade = { dir: hiddenNow ? 'out' : 'in', start: now }
      this.prevHidden = hiddenNow
    }
    let hideVis = hiddenNow ? 1 : 0
    if (this.hideFade) {
      const ht = Math.min(1, (now - this.hideFade.start) / (72 * 16))
      hideVis = this.hideFade.dir === 'out' ? ht : 1 - ht
      if (ht >= 1) this.hideFade = null
    }
    const sel = s.phase === 'selectAction' ? this.nextSelecting() : undefined
    // 选敌高亮目标(target 态,闪烁节拍)。选队友是**箭头光标**(drawPlayerTargetArrow,
    // 一阶段两套形制:敌 = colorShift 高亮 / 友 = 箭头移动,勿混 —— 曾拿高亮套友方,作者纠)
    const alive = this.aliveEnemyIdxs()
    const targetBlink = Math.floor(now / 160) % 2 === 0
    const highlightEnemy =
      sel !== undefined &&
      this.ui === 'target' &&
      this.targetSide === 'enemy' &&
      alive.length &&
      targetBlink
        ? alive[this.targetIdx % alive.length]
        : undefined
    // 场景(M4d-2:visual 层驱动 —— 动画位移/帧/受击染色;死亡 = 颗粒溶解)
    const enemies: BattleSpriteDraw[] = []
    s.enemies.forEach((e, i) => {
      if (!e) return
      const appearance = this.enemyAppearance(i)
      const sprite = appearance.sprite
      const v = this.visual.enemies[i]
      if (!sprite || !v) return
      const fade = this.deathFades.get(i)
      // 死亡可见性(2026-07-05 作者报「施法时怪物消失」):真 hp 在时间线**播放前**已结算,
      // 不能凭它判死否则强力术一出手怪就没、整段演出打空气。用 pendingDeaths(本步正被这次
      // 演出击杀的敌)区分两类:① 正被击杀 → 演出全程照画,收尾(finishStepVisuals)才登记
      // 淡出;② 早已死亡(逃跑清场)→ 不在 pendingDeaths 且 hp≤0 → 不画。原版语义:命中数字后才淡出。
      const dyingNow = this.pendingDeaths.includes(i) || this.fleeingEnemies?.includes(i) === true
      let alpha = 1
      if (e.hp <= 0 && !dyingNow) {
        if (fade === undefined) return // 早死无淡出登记(逃跑清场等)= 不画
        // 渐隐(形态两轮裁决 2026-07-05:溶解试后作者选回正常渐隐;时长保持原版 72×16ms)
        alpha = 1 - (now - fade) / DEATH_FADE_MS
        if (alpha <= 0) {
          this.deathFades.delete(i)
          return
        }
      }
      // idle 呼吸帧:visual.frame===0(站立默认)时循环 idleFrames;时间线设过的特殊帧原样
      const anim = appearance.definition.profile
      if (anim.kind !== 'enemy') throw new Error('enemy profile 漂移')
      const frame =
        v.frame === anim.idle.start && anim.idle.count > 1 && e.hp > 0
          ? anim.idle.start + (Math.floor(now / (anim.idleTicksPerFrame * 40)) % anim.idle.count)
          : v.frame
      // 疯魔抖动(battle.c:114-121):敌 X 轴 ±1/帧;眠/定压制不抖(死亡淡出 hp≤0 自然排除)
      const jx = this.enemyConfusedJitterX(i, e)
      const transition = this.appearanceTransitions.get(`enemy:${i}`)
      if (transition) {
        const progress = transition.step / transition.total
        enemies.push(
          {
            sprite: this.requireAppearance(transition.oldDefinitionId, 'enemy').sprite,
            x: v.x + jx,
            y: v.y,
            frame: transition.oldFrame,
            colorShift: i === highlightEnemy ? 6 : v.colorShift,
            dissolve: progress,
          },
          {
            sprite: this.requireAppearance(transition.newDefinitionId, 'enemy').sprite,
            x: v.x + jx,
            y: v.y,
            frame: transition.newFrame,
            colorShift: i === highlightEnemy ? 6 : v.colorShift,
            dissolve: 1 - progress,
          },
        )
      } else
        enemies.push({
          sprite,
          x: v.x + jx,
          y: v.y,
          frame,
          colorShift: i === highlightEnemy ? 6 : v.colorShift,
          ...(alpha < 1 ? { alpha } : {}),
        })
    })
    const players: BattleSpriteDraw[] = []
    s.players.forEach((p, i) => {
      const sprite = this.playerAppearance(i).sprite
      const v = this.visual.players[i]
      if (!sprite || !v) return
      // 召唤期队员隐显(渐隐/渐显;hold 全隐 —— fight.c:3160-3181 隐队员只画神将。
      // 形态:作者裁决用正常 alpha 渐变,不用溶解)
      if (summonShow >= 1) return
      // 隐身(0x5C 隐蛊)**渐隐/渐显**(作者对照原版:用完渐隐,回合到了渐显 —— 原版激活/
      // 结束各走一次 PAL_BattleFadeScene 12×6×16ms 溶解;此处 alpha 渐变同 72×16ms)。
      // 全隐期受击闪白(colorShift≠0)例外仍画(battle.c:202-211)
      if (hideVis >= 1 && v.colorShift === 0) return
      // 疯魔抖动(battle.c:187-196):玩家 Y 轴 ±1/帧;眠/定压制,须活着且非濒死
      const jy =
        p.hp > 0 &&
        p.status.confused > 0 &&
        p.status.sleep <= 0 &&
        p.status.paralyzed <= 0 &&
        !isPlayerDying(p.hp, p.maxHp)
          ? Math.floor(Math.random() * 3) - 1
          : 0
      const alpha = (1 - summonShow) * (v.colorShift !== 0 ? 1 : 1 - hideVis)
      const transition = this.appearanceTransitions.get(`player:${i}`)
      if (transition) {
        const progress = transition.step / transition.total
        players.push(
          {
            sprite: this.requireAppearance(transition.oldDefinitionId, 'player-fighter').sprite,
            x: v.x,
            y: v.y + jy,
            frame: transition.oldFrame,
            colorShift: v.colorShift,
            dissolve: progress,
          },
          {
            sprite: this.requireAppearance(transition.newDefinitionId, 'player-fighter').sprite,
            x: v.x,
            y: v.y + jy,
            frame: transition.newFrame,
            colorShift: v.colorShift,
            dissolve: 1 - progress,
          },
        )
      } else
        players.push({
          sprite,
          x: v.x,
          y: v.y + jy,
          frame: v.frame,
          colorShift: v.colorShift,
          ...(alpha < 1 ? { alpha } : {}),
        })
    })
    // 屏波:战场常驻 + 法术叠加(fight.c:2666);只卷背景层,精灵画在卷完的背景上自身笔直
    // (层序铁律,一阶段 2deb52bd:放精灵后 = boss 边缘撕裂)。缓存仅相位变化时重卷。
    // 召唤期背景染色(sBackgroundColorShift=effectTimes,battle.c:62-80 调色板级)随
    // crossfade 溶入/溶出。
    const waveAmp = (this.opts.fieldWave ?? 0) + this.frameWaveAdd
    // keepEffect 烙印:有烙印用工作画布(烙印在背景内 → 随屏波卷动,原版 blit lpBackground 同义);
    // burnCount 进 tag 防 wavedBg 撞旧缓存。召唤染色仍以净底烤(tint 走 bgIndexed,烙印
    // 是 RGBA 后画 —— 染色期烙印暂不可见,溶回即恢复;调色板级烙印染色留待需要时)。
    let bgSrc = this.bgWorking ?? this.assets.bg
    let bgTag = this.burnCount > 0 ? `base+b${this.burnCount}` : 'base'
    if (bgSrc && summonShow > 0) {
      const tinted = this.getTintedBg()
      if (tinted) {
        bgSrc = this.composeSummonBg(bgSrc, tinted, summonShow)
        bgTag = `sm${Math.round(summonShow * 72)}`
      }
    }
    const depthOverlays: BattleDepthOverlayDraw[] = []
    if (this.currentFire)
      for (const overlay of this.overlays ?? [])
        if (overlay.sheet === 'magic' && overlay.layerOffset !== undefined)
          depthOverlays.push({
            sprite: this.currentFire,
            x: overlay.x,
            y: overlay.y,
            frame: overlay.frameIdx,
            layerOffset: overlay.layerOffset,
          })
    const scene: BattleScene = {
      ...(bgSrc ? { bg: this.wavedBg.render(bgSrc, waveAmp, now, 320, 200, bgTag) } : {}),
      enemies,
      players,
      ...(depthOverlays.length ? { depthOverlays } : {}),
      palette: this.assets.palette,
    }
    renderBattleScene(ctx, scene, worldScale)

    // 特效 overlay:**底中锚** blit(fight.c:2436/2183 真值 PAL_XY(x−w/2, y−h) ——
    // 此前左上角 blit 致全体法术特效偏右下半宽全高,2026-07-05 作者战斗实测打回)
    if (this.overlays?.length) {
      ctx.save()
      ctx.imageSmoothingEnabled = false
      ctx.scale(worldScale, worldScale)
      for (const o of this.overlays) {
        // MAGIC.special 有定义的法术精灵已与敌我单位在 renderBattleScene 内统一排序。
        if (o.sheet === 'magic' && o.layerOffset !== undefined) continue
        const sheet =
          o.sheet === 'magic'
            ? this.currentFire
            : o.sheet === 'summon'
              ? this.currentSummon
              : this.assets.effectSprite
        const f = sheet?.frames[o.frameIdx]
        if (!f) continue
        const img = bakeFrame(f, this.assets.palette)
        const dx = o.x - Math.floor(f.width / 2)
        const dy = o.y - f.height
        // 神将随相渐显/渐隐(与队员反相;hold 全显。alpha 形态,作者裁决)
        if (o.sheet === 'summon' && summonShow < 1) {
          if (summonShow > 0) {
            ctx.save()
            ctx.globalAlpha = summonShow
            ctx.drawImage(img, dx, dy)
            ctx.restore()
          }
          continue
        }
        ctx.drawImage(img, dx, dy)
      }
      ctx.restore()
    }

    // UI 层(320 逻辑坐标 ×scale)
    ctx.save()
    ctx.scale(worldScale, worldScale)
    ctx.imageSmoothingEnabled = false
    const g = this.assets.glyphs
    const ui = this.assets.ui

    // 对话框活跃期:一阶段真值「整个战斗 UI 都不画」(信息框 + 菜单全隐,只留场景 + 对话框)。
    const dialogActive = this.assets.dialogBox?.active ?? false

    // 底部队员信息框(playerbox+头像+黄青数字;无 UI 资产 → 文字兜底)。
    // HP 显示用 displayHp(伤害数字帧才同步,动画命中前不剧透)。
    if (!dialogActive)
      s.players.forEach((p, i) => {
        const shownHp = this.visual.players[i]?.displayHp ?? p.hp
        if (ui?.magicPlayerBox) {
          // 中毒头像色:最高级(≤3)毒的 wColor 查调色板(uibattle.c:126-149;伪毒 99/无影 173 不染)
          // 中毒头像色:染色可解毒中可解度最高者(原版 level≤3 染色 = common/severe,incurable 不染)
          let maxRank = -1
          let poisonRgb: readonly [number, number, number] | undefined
          for (const ap of p.poisons) {
            const def = s.poisonDefs[ap.poisonId]
            if (!def || def.curability === 'incurable' || def.color <= 0) continue
            const rank = POISON_CURE_RANK[def.curability]
            if (rank >= maxRank) {
              maxRank = rank
              poisonRgb = this.assets.palette.colors[def.color & 0xff]
            }
          }
          drawPlayerInfoBox(
            ctx,
            ui,
            this.assets.faces?.[p.roleId],
            { ...p, hp: shownHp, status: p.status, ...(poisonRgb ? { poisonRgb } : {}) },
            i,
            g,
            this.assets.palette,
          )
        } else {
          const x = 8 + i * 106
          const hpColor: readonly [number, number, number] =
            shownHp <= 0 ? [224, 91, 91] : shownHp < p.maxHp / 5 ? [226, 179, 64] : [215, 220, 229]
          renderSpans(ctx, [{ text: this.nameOf(p.roleId) }], x, 170, { glyphs: g, shadow: true })
          renderSpans(ctx, [{ text: `${shownHp}/${p.maxHp}` }], x, 184, {
            glyphs: g,
            shadow: true,
            forceRgba: hpColor,
          })
        }
      })

    // 当前行动队员头顶三角(选指令/选目标期间;一阶段 68/69 闪)。
    // 锚 = 底中固定偏移(uibattle.c:1004 x−8/y−74),不随精灵高度 —— 作者原版截图:三角贴头顶正上。
    if (!dialogActive && sel !== undefined && ui) {
      if (this.ui === 'target' && this.targetSide === 'ally') {
        // 选队友 = **箭头光标**移动到候选队员(一阶段 selectTargetPlayer:只画目标箭头,
        // 不画行动者三角;选敌方才是 colorShift 高亮 —— 曾拿高亮套友方,作者纠)
        const t = this.targetIdx % Math.max(1, s.players.length)
        const v = this.visual.players[t]
        if (v) drawPlayerTargetArrow(ctx, ui, v.x, v.y, now)
      } else {
        const pos = getPlayerBasePos(s.players.length, sel)
        if (pos) drawCurrentFinger(ctx, ui, pos.x, pos.y, now)
      }
    }

    // 物品使用横幅:物品名 @(210,50) 白字(fight.c:2316 PAL_DrawText color15;到期自清)
    if (this.itemBanner) {
      if (now >= this.itemBanner.untilMs) this.itemBanner = null
      else
        drawRewardGainText(
          ctx,
          g,
          this.itemBanner.text,
          this.itemBanner.x ?? 210,
          this.itemBanner.y ?? 50,
        )
    }

    // 战斗内对话框 = 大世界同款 DialogBox 叠战斗场景上(一阶段真值;text.c:1687 不擦底)。
    // 已在 320 逻辑坐标 ×scale 上下文里,DialogBox.render 内部也走 320 坐标 → 直接调。
    if (this.assets.dialogBox?.active) {
      this.assets.dialogBox.render(now)
    } else if (this.choreoBanner) {
      // 无 DialogBox(单测/资产缺)时的文字兜底横幅
      renderSpans(ctx, [{ text: `${this.choreoBanner.name}:` }], 10, 6, {
        glyphs: g,
        shadow: true,
        forceRgba: [226, 179, 64],
      })
      renderSpans(ctx, [{ text: this.choreoBanner.text }], 10, 24, { glyphs: g, shadow: true })
    }

    // 第二级音效屏障：pending 时只冻结当前战场帧，不显示内部技术提示；真正 fatal 才
    // 显示错误与退出操作。这样缓存命中的 Promise 微任务不会在屏幕中央闪一帧“准备中”。
    const readinessOverlayText =
      this.ui === 'preparing' || this.ui === 'readinessError'
        ? battleReadinessOverlayText(this.ui)
        : null
    if (!dialogActive && readinessOverlayText) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)'
      ctx.fillRect(48, 76, 224, 58)
      renderSpans(ctx, [{ text: readinessOverlayText }], 104, 88, {
        glyphs: g,
        shadow: true,
        forceRgba: [255, 255, 255],
      })
      renderSpans(ctx, [{ text: '按 Enter 或 Esc 返回' }], 80, 109, {
        glyphs: g,
        shadow: true,
        forceRgba: [226, 179, 64],
      })
    }

    // 指令菜单(一阶段原版形态:4 图标 + 杂项盒 + 3 列网格)。选敌态不画(一阶段 DL30);对话期全隐。
    if (!dialogActive && sel !== undefined && ui && this.ui !== 'target' && this.ui !== 'acting') {
      const p = expectDefined(s.players[sel])
      // 主菜单 4 图标(法术/物品/杂项态仍画,一阶段 selectMove 全程画)
      if (this.assets.battleIcons) {
        drawMainIcons(
          ctx,
          this.assets.battleIcons,
          this.menuIdx,
          this.mainActionValid(sel),
          true,
          this.assets.palette,
        )
      }
      if (this.ui === 'misc' || this.ui === 'miscSub') {
        // 杂项盒 box(2,20);进二级后父项(道具)固定金黄
        const rows: BattleMenuRow[] = MISC_LABELS.map((label, i) => ({
          label,
          disabled: i === 0 || i === 4 || (i === 1 && this.usableItems().length === 0),
        }))
        // 尺寸 = 一阶段实机对照(2026-07-11 截 6005 战斗杂项盒;作者点破「太窄」):
        // 原版 CreateBox 按 tile **实宽**平铺 —— 帽 22/轴头 33/中 16,cols=1 → 顶行 71px。
        // drawSlicedBox 的 w 是回纹主体宽(轴头自动右探 10)→ 主体 22+16+23=61;
        // 高 rows=4 → 20+18×4+20=112(五行文字全在盒内,不压边)。
        drawBattleMenuBox(
          ctx,
          ui,
          g,
          rows,
          this.miscIdx,
          now,
          2,
          20,
          61,
          112,
          this.ui === 'miscSub',
        )
        if (this.ui === 'miscSub') {
          // 使用/投掷二级 box(30,50):cols=1 rows=1 → 主体 61 × 高 20+18+20=58
          const sub: BattleMenuRow[] = [
            { label: '使用' },
            { label: '投掷', disabled: this.throwableItems().length === 0 },
          ]
          drawBattleMenuBox(ctx, ui, g, sub, this.miscSubIdx, now, 30, 50, 61, 58)
        }
      } else if (this.ui === 'skill') {
        // 法术网格(红框 3 列)+ 左上 MP 框
        const rows: BattleMenuRow[] = p.skills.map((sid) => {
          const sk = this.opts.skills?.[sid]
          const mp = sk?.cost.mp ?? 0
          return {
            label: sk?.name ?? sid,
            disabled: !sk || p.mp < mp || this.moneyNow() < (sk.cost.money ?? 0),
          }
        })
        drawBattleGrid(ctx, ui, g, rows, this.skillIdx, now, MAGIC_GRID)
        const selSkill = this.opts.skills?.[p.skills[this.skillIdx % p.skills.length] ?? '']
        drawMpBox(ctx, ui, selSkill?.cost.mp ?? 0, p.mp)
      } else if (this.ui === 'item' || this.ui === 'throwItem') {
        // 物品/投掷网格(红框 3 列,数量 cyan)+ 左下选中物详情框
        const list = this.ui === 'item' ? this.usableItems() : this.throwableItems()
        const rows: BattleMenuRow[] = list.map((it) => ({
          label: this.state.items[it.itemId]?.name ?? it.itemId,
          right: it.count,
        }))
        drawBattleGrid(ctx, ui, g, rows, this.itemIdx, now, ITEM_GRID)
        const selItem = this.state.items[list[this.itemIdx % list.length]?.itemId ?? '']
        drawItemDetailBox(ctx, ui, selItem?.icon ? ui.itemIcons[selItem.icon] : undefined)
      }
    } else if (sel !== undefined && !ui) {
      // 文字兜底(单测/资产缺失)
      FALLBACK_MENU.forEach((item, i) => {
        const selMark = i === this.menuIdx ? '▶ ' : '   '
        renderSpans(ctx, [{ text: `${selMark}${item}` }], 10, 26 + i * 17, {
          glyphs: g,
          shadow: true,
          forceRgba: i === this.menuIdx ? [255, 255, 255] : [139, 147, 163],
        })
      })
    }

    // 伤害/涨益飘字(升起;掉血蓝/回血黄/回 MP 青 = fight.c:648-708,无资产退化文本)
    for (const f of this.floats) {
      const t = (this.nowMs - f.bornAt) / 900
      if (f.num !== undefined && ui) {
        // 一阶段真值(uibattle.c:1753-1761):每 40ms 上移 1px,age 0..10 共 11 帧;
        // x 已在 applyDamageFx 算成个位右缘锚,直传右对齐 drawNumber
        const age = Math.floor((this.nowMs - f.bornAt) / 40)
        const nums = f.tone === 'yellow' ? ui.nums : f.tone === 'cyan' ? ui.numsCyan : ui.numsBlue
        drawNumber(ctx, f.num, f.x, f.y - age, nums)
      } else {
        const fy = f.y - t * 12
        renderSpans(ctx, [{ text: f.num !== undefined ? `-${f.num}` : f.text }], f.x, fy, {
          glyphs: g,
          shadow: true,
          forceRgba: f.color,
        })
      }
    }

    // 胜利结算屏(B7b:一阶段 PAL_BattleWon box 序列,原版无「战斗胜利!」字样)。
    //   有 UI 资产 → 画当前屏;缺(单测)→ 跳过。败/逃无结算屏(一阶段 PAL_BattleLost 直接黑屏读档)。
    if (this.ui === 'over' && this.settlement?.length && ui) {
      const screen = this.settlement[this.settleIdx]
      if (screen) drawSettlementScreen(ctx, screen, ui, g)
    }
    ctx.restore()
  }
}
