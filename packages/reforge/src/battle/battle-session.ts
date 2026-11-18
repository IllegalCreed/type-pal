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
  CharacterInstance,
  EnemyBattleSpriteProfile,
  EnemyDef,
  EnemyHookChannel,
  LevelGrowthDelta,
  PlayerFighterFrames,
  SkillData,
  SoundAssetRole,
  TextSpan,
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
  resolveDialogueRowText,
  resolveSkillExecution,
} from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import {
  bakeBgImageData,
  type GlyphTable,
  type LoadedBattleSpriteDefinition,
  type LoadedSprite,
} from '../assets.js'
import type { SfxPlayer } from '../audio/sfx.js'
import { expectDefined } from '../defined.js'
import type { DialogBox } from '../dialog/dialog-box.js'
import { startDialogue } from '../dialogue.js'
import { drawNumber, type MenuAssets, type MenuBox } from '../menu/menu-box.js'
import { drawRewardGainText } from '../menu/reward-gain.js'
import { bakeFrame } from '../render.js'
import { type ScreenShake, shakeOffsetY, WavedBgCache } from '../screen-fx.js'
import { renderSpans } from '../text/text-render.js'
import { BattleActionPresentationScheduler } from './battle-action-presentation-scheduler.js'
import {
  type AnimFrame,
  type AnimSideEffects,
  BATTLE_FRAME_MS,
  buildEnemyCast,
  buildEnemyDivide,
  buildEnemyEscape,
  buildEnemyMateAttack,
  buildEnemyPhysical,
  buildEnemySummon,
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
  ENEMY_SUMMON_COLOR_SHIFT,
  ENEMY_SUMMON_HOLD_TICKS,
  type EnemyAppearanceTransition,
  type EnemySummonFade,
  enemySummonIdleFrame,
  type FighterDelta,
  type OverlayDraw,
  type PlayerAppearanceTransition,
} from './battle-anim.js'
import { battleCasualtyCues } from './battle-casualty-presentation.js'
import {
  BattleCommandSelection,
  type BattleCommandSelectionContext,
  type BattleCommandSelectionPhase,
} from './battle-command-selection.js'
import {
  type BattleEnemyState,
  type BattleState,
  buildAiView,
  type CreatePlayerInput,
  completeCasualtyEffects,
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
import { BattleSettlementPresentation } from './battle-settlement-presentation.js'
import {
  type BattleReadinessErrorContext,
  BattleTurnReadinessGate,
  type BattleTurnReadinessSnapshot,
  battleReadinessOverlayText,
  createBattleTurnReadinessSnapshot,
} from './battle-turn-readiness.js'
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
  BattleSceneFade,
  type BattleSpriteDraw,
  renderBattleScene,
} from './present-battle.js'
import { drawSettlementScreen, type SettlementScreen } from './settlement.js'

function assertNever(value: never, context: string): never {
  throw new Error(`${context}: 未处理 action ${JSON.stringify(value)}`)
}

/** WIN95 说明直接取作者文字，使用原盘菜单的行距及色板索引。 */
function drawBattleMenuDescription(
  ctx: CanvasRenderingContext2D,
  lines: readonly string[],
  x: number,
  y: number,
  glyphs: GlyphTable,
  palette: Palette,
): void {
  lines.forEach((text, row) => {
    renderSpans(ctx, [{ text }], x, y + row * 16, {
      glyphs,
      shadow: true,
      forceRgba: palette.colors[0x3c],
    })
  })
}

/** 杂项盒(一阶段 WORD.DAT 56-60):围攻/状态未实现,渲染灰显、确认无响应。 */
const MISC_LABELS = ['围攻', '道具', '防御', '逃跑', '状态'] as const
/** 文字兜底菜单(无 UI 资产时;单测)。 */
const FALLBACK_MENU = ['攻击', '仙术', '物品', '防御', '逃跑'] as const
/** 回合末数值反馈停 8 帧，每帧 40ms（fight.c:1664-1668，battle.h:28-29）。 */
const ROUND_END_FEEDBACK_MS = 8 * BATTLE_FRAME_MS
const ENEMY_CAST_RECOVERY_MS = 8 * BATTLE_FRAME_MS
const CASUALTY_DIALOGUE_DELAY_MS = 10 * BATTLE_FRAME_MS
const FAILURE_FEEDBACK_MS = 1400
/** PAL_BattleFadeScene 12×6 步的节拍。二阶段沿用作者选定的 alpha 渐隐。 */
const DEATH_FADE_MS = 72 * 16
const DEATH_SETTLEMENT_PAUSE_MS = 240

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

type SessionUiPhase = 'acting' | 'over'

export type {
  BattleReadinessErrorContext,
  BattleTurnReadinessSnapshot,
} from './battle-turn-readiness.js'
export { battleReadinessOverlayText } from './battle-turn-readiness.js'

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
  /** 战斗状态页共用世界状态面板。队员元数据在进入战斗时固定。 */
  statusPanel?: { renderer: MenuBox; party: readonly CharacterInstance[] }
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
  holdFrame?: boolean
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
  private readonly readiness: BattleTurnReadinessGate
  private readonly settlementPresentation: BattleSettlementPresentation
  private readonly selection = new BattleCommandSelection()
  private readonly actionPresentation = new BattleActionPresentationScheduler()
  private readonly state: BattleState
  private sessionUi: SessionUiPhase | null = null
  private selectionStartedForTurn: number | null = null
  private floats: FloatNum[] = []
  private nowMs = 0
  private roundEndFeedbackUntilMs = 0
  private enemyCastRecoveryPending = false
  private enemyCastRecoveryUntilMs = 0
  // ── M4d-2 表现层:动画回放 + 死亡淡出 ──
  private visual: { players: VisualFighter[]; enemies: Array<VisualFighter | null> } = {
    players: [],
    enemies: [],
  }
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
  private clearBannerOnActionEnd = false
  /** 同一步死亡的敌槽共用一次淡出，完成后才继续推进战斗。 */
  private deathFade: { startedAtMs: number; enemySlots: readonly number[] } | null = null
  /** 本步结算中死掉的敌槽(动画播完后统一开淡出 + death 音)。 */
  private pendingDeaths: number[] = []
  /** 本步刚获得 confused 的敌槽；core 已结算，但 OffMagic 收尾前不得提前抖动。 */
  private readonly pendingConfusedReveal = new Set<number>()
  /** 结算后等待时间线到达提示位置的失败反馈。 */
  private pendingFailureFeedback: BattleFailureFeedback | null = null
  /** 动作旁白阻塞时间线，按键或到时后释放。 */
  private actionFeedback: { untilMs: number; dismiss: 'confirm' | 'anyKey' } | null = null
  private pendingStealNotice: TextSpan[] | undefined
  /** Retain the old enemy appearance through its flash and scene dissolve. */
  private readonly enemyAppearanceTransitions = new Map<number, EnemyAppearanceTransition>()
  private playerAppearanceTransition: PlayerAppearanceTransition | null = null
  private enemySummonFade: EnemySummonFade | null = null
  private readonly sceneFade = new BattleSceneFade()
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
  /** 连续召唤只在两段溶解之间推进闲站计时，按本次出生的实例记录。 */
  private readonly hookSummonIdleTicks = new Map<BattleEnemyState, number>()
  /** actionQueue item 以对象身份去重，dualMove 的两个 entry 各跑一次 ready。 */
  private readonly readyHookEntries = new WeakSet<object>()
  private choreoWaitUntil: number | null = null
  /** terminal 立即登记、演出 closure 排净后才提交 state.phase。 */
  private pendingTerminal: {
    phase: 'won' | 'lost' | 'fled'
    result: BattleResult
  } | null = null
  /** battle choreography 音乐请求序号；迟到 fade-stop 不得误停后播的新曲。 */
  private musicSerial = 0
  private scheduledMusicStop: { serial: number; deadline: number } | null = null
  /** 物品使用横幅(fight.c:2316 物品名@(210,50) 白字;13 帧 ≈520ms 到期自清)。 */
  private itemBanner: { text: string; untilMs: number; x?: number; y?: number } | null = null
  private choreoName = ''
  private encounterFired = new Set<number>() // 遭遇演出已播钩子下标(encounter 级,非 per-enemy)
  private choreoTurn = 0 // 已收集过演出的轮次
  /** 胜利结算前与败/逃共路均会尝试写回；一次性门防止奖励结算后被旧快照覆盖。 */
  private persistentEffectsWritten = false
  /** B11-1:当前伤亡对话是否已交给 dialogBox/横幅(防止同一 dialogue 反复重开)。 */
  private casualtyDialogueShown = false
  private casualtyDialogueReadyAtMs = 0

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
      worldSettlement?: { boss: boolean }
      /** 普通遇敌全灭的表现交给大世界，战斗收尾完成后同拍交接。 */
      handoffDefeat?: boolean
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
      fireFrameCounts: Object.fromEntries(
        Object.entries(assets.fireSprites ?? {}).map(([chunk, sprite]) => [
          chunk,
          sprite.frames.length,
        ]),
      ),
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
    this.readiness = new BattleTurnReadinessGate({
      ...(opts.prepareTurnSounds ? { prepare: opts.prepareTurnSounds } : {}),
      ...(opts.reportReadinessError ? { reportError: opts.reportReadinessError } : {}),
    })
    this.settlementPresentation = new BattleSettlementPresentation({
      ...(opts.buildSettlement ? { buildSettlement: opts.buildSettlement } : {}),
      ...(opts.worldSettlement ? { worldSettlement: opts.worldSettlement } : {}),
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

  private playerRestFrame(p: BattleState['players'][number], frames: PlayerFighterFrames): number {
    if (p.hp <= 0) return p.status.puppet > 0 ? frames.idle : frames.dead
    if (p.status.sleep > 0 || isPlayerDying(p.hp, p.maxHp)) return frames.dying
    return p.defending ? frames.defend : frames.idle
  }

  /** 队员表现层复位(召唤 out 相起点单独用:溶回目标必须是复位后的队员)。 */
  private resetPlayersVisual(): void {
    const s = this.state
    const holdRoundEndPoses = this.nowMs < this.roundEndFeedbackUntilMs
    this.visual.players = s.players.map((p, i) => {
      const frames = this.playerFrames(i)
      const pos = getPlayerBasePos(s.players.length, i) ?? { x: 0, y: 0 }
      const prev = this.visual.players[i]
      return {
        x: pos.x,
        y: pos.y,
        frame: holdRoundEndPoses && prev ? prev.frame : this.playerRestFrame(p, frames),
        colorShift: 0,
        displayHp: prev?.displayHp ?? p.hp,
      }
    })
  }

  private enemyRestVisual(index: number): VisualFighter | null {
    const enemy = this.state.enemies[index]
    if (!enemy) return null
    const profile = this.enemyAppearance(index).definition.profile
    if (profile.kind !== 'enemy') throw new Error('enemy appearance profile 漂移')
    return {
      x: enemy.basePos.x,
      y: enemy.basePos.y,
      frame: profile.idle.start,
      colorShift: 0,
      displayHp: this.visual.enemies[index]?.displayHp ?? enemy.hp,
    }
  }

  /** 表现层复位:全员回站位/复位姿势/无染色(一阶段 resetFightersAfterAction 语义)。
   *  队员姿势 = playerRestFrame(死→傀儡0/死2;睡/濒死→1;防→3;站0 —— 一夜三刀簇,
   *  曾一律 frame0 丢死/濒死/防御姿,演出审计 §2-8)。 */
  private resetVisual(): void {
    this.resetPlayersVisual()
    this.visual.enemies = this.state.enemies.map((_, index) => this.enemyRestVisual(index))
    this.overlays = null
    this.currentFire = null
    this.enemyAppearanceTransitions.clear()
    this.playerAppearanceTransition = null
    this.enemySummonFade = null
    this.sceneFade.reset()
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
    this.sessionUi = 'acting'
  }

  private beginTurnPreparation(preparationFrameMs: number): void {
    if (this.closed || this.doneSettled) return
    this.actionPresentation.resetActionCadence(preparationFrameMs)
    this.readiness.begin(createBattleTurnReadinessSnapshot(this.state), {
      isCurrent: () => !this.closed && !this.doneSettled && this.state.phase === 'selectAction',
      enterActionPhase: () => this.enterActionPhase(),
    })
  }

  private complete(result: BattleResult): void {
    if (this.doneSettled) return
    this.doneSettled = true
    this.closed = true
    this.readiness.invalidate()
    this.hookSummonIdleTicks.clear()
    this.resolveDone(result)
  }

  /** 读档、切场景或 readiness fatal 退出；令所有尚未落定的准备回调失效。 */
  cancel(reason?: unknown): void {
    if (this.doneSettled) return
    this.doneSettled = true
    this.closed = true
    this.readiness.invalidate()
    this.musicSerial++
    this.scheduledMusicStop = null
    this.pendingTerminal = null
    this.pendingHookActivations = []
    this.activeHook = null
    this.hookSummonIdleTicks.clear()
    this.enemySummonFade = null
    this.sceneFade.reset()
    if (this.casualtyDialogueShown || this.actionFeedback) this.assets.dialogBox?.close()
    this.actionFeedback = null
    this.pendingStealNotice = undefined
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

  private selectionContext(sel: number): BattleCommandSelectionContext {
    const player = expectDefined(this.state.players[sel])
    return {
      playerIndex: sel,
      player: {
        skills: player.skills,
        mp: player.mp,
        silenced: player.status.silence > 0,
        ...(player.cooperativeMagicSkillId
          ? { cooperativeMagicSkillId: player.cooperativeMagicSkillId }
          : {}),
        healthy: isPlayerHealthy(player),
        attackAll: player.attackAll,
      },
      playerCount: this.state.players.length,
      healthyPlayerCount: healthyPlayerCount(this.state),
      selectablePlayerIndices: this.state.players.flatMap((member, index) =>
        needsManualSelect(member) ? [index] : [],
      ),
      aliveEnemyIndices: this.aliveEnemyIdxs(),
      usableItems: this.usableItems(),
      throwableItems: this.throwableItems(),
      skills: this.opts.skills ?? {},
      items: this.state.items,
    }
  }

  /** Stop asking for commands without overwriting any previously committed actions. */
  private consumeOthersForCoop(caster: number): void {
    for (const [i, player] of this.state.players.entries()) {
      if (i !== caster && needsManualSelect(player) && !this.state.pendingActions.has(i)) {
        this.state.pendingActions.set(i, { kind: 'pass' })
      }
    }
  }

  private startTimeline(timeline: AnimFrame[], scripted = false): void {
    const effects: AnimSideEffects = {
      onFighter: (delta) => this.applyDelta(delta),
      onOverlay: (overlays) => {
        this.overlays = overlays
      },
      onSound: (asset) => this.assets.sfx?.play(asset),
      onDamage: (target, value, tone, anchor) => this.applyDamageFx(target, value, tone, anchor),
      onBanner: (text, durationMs, x, y) => {
        this.itemBanner = {
          text,
          untilMs: this.nowMs + durationMs,
          ...(x !== undefined ? { x } : {}),
          ...(y !== undefined ? { y } : {}),
        }
      },
      onActionFeedback: () => this.presentPendingFailureFeedback(),
      onRevealEnemyConfusion: () => this.pendingConfusedReveal.clear(),
      onEnemyDeathFade: () => this.startEnemyDeathFade(),
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
        if (transition.side === 'player') this.playerAppearanceTransition = transition
        else this.enemyAppearanceTransitions.set(transition.idx, transition)
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
      onEnemySummonFade: (fade) => {
        if (fade && fade.phase !== this.enemySummonFade?.phase) this.sceneFade.reset()
        this.enemySummonFade = fade
      },
    }
    this.actionPresentation.start(timeline, effects, scripted)
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
    // Scan slots in order, checking occupancy at execution so a later slot can be filled mid-scan.
    for (const enemyIdx of this.state.enemies.keys())
      this.pendingHookActivations.push({ enemyIdx, channel: 'turnStart' })
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
            'battle',
          )
        } else {
          this.choreoBanner = {
            name: this.choreoName,
            text: action.cue.rows
              .map((row) => resolveDialogueRowText(row, this.opts.locale ?? {}))
              .join('\n'),
          }
        }
        return
      case 'clearDialog':
        box?.releaseBattleChoreography()
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
        box?.releaseBattleChoreography()
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
    if (result.result.kind !== 'summon') this.hookSummonIdleTicks.clear()
    if (result.result.outcome === 'failed' && result.result.kind !== 'summon') return
    const action = {
      side: 'enemy' as const,
      idx: activation.enemyIdx,
      kind: result.result.kind,
      ...(result.result.spawnedIdxs ? { spawnedIdxs: result.result.spawnedIdxs } : {}),
    }
    const timeline =
      action.kind === 'summon'
        ? this.buildEnemySummonTimeline(activation.enemyIdx, action.spawnedIdxs ?? [], true)
        : this.buildStepTimeline(
            action,
            before.playerHp,
            before.enemyHp,
            before.playerAppearances,
            before.enemyAppearances,
          )
    if (timeline) this.startTimeline(timeline, true)
    else if (result.result.outcome === 'succeeded') this.resetVisual()
  }

  private pumpCasualtyDialogue(pressed: ReadonlySet<string>): boolean {
    const casualty = this.state.casualtyDialogue
    if (!casualty || this.actionPresentation.active) return false
    if (this.nowMs < this.casualtyDialogueReadyAtMs) return true
    const box = this.assets.dialogBox
    if (!this.casualtyDialogueShown && casualty.lines.length) {
      if (box) {
        box.open(
          startDialogue({ id: '__casualty', cues: battleCasualtyCues(casualty.lines) }),
          this.nowMs,
        )
      } else {
        this.choreoBanner = {
          name: this.nameOf(casualty.speakerRoleId),
          text: casualty.lines
            .map((line) => lookupText(line.text, this.opts.locale ?? {}))
            .join('\n'),
        }
      }
      this.casualtyDialogueShown = true
      return true
    }
    if (box?.active) {
      if (pressed.has(' ') || pressed.has('Enter')) box.advance(this.nowMs)
      return true
    }
    if (this.choreoBanner) {
      if (pressed.has(' ') || pressed.has('Enter')) this.choreoBanner = null
      return true
    }
    completeCasualtyEffects(this.state)
    this.state.casualtyDialogue = undefined
    this.casualtyDialogueShown = false
    this.casualtyDialogueReadyAtMs = 0
    this.syncPlayerDisplayHp()
    this.beginEnemyCastRecovery()
    return true
  }

  private pumpScriptExecution(dtMs: number, pressed: ReadonlySet<string>): boolean {
    if (this.pumpCasualtyDialogue(pressed)) return true
    const box = this.assets.dialogBox
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
    const scriptPlayback = this.actionPresentation.advanceScript(dtMs)
    if (scriptPlayback !== 'inactive') {
      if (scriptPlayback === 'playing') return true
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
        box?.releaseBattleChoreography()
        this.activeHook = null
        this.hookSummonIdleTicks.clear()
        return true
      }
      if (step.kind === 'effect') {
        this.startHookEffectPresentation(activation, step, before)
        return true
      }
      this.hookSummonIdleTicks.clear()
      this.executeBattleChoreographyAction(step.action)
      return true
    }
    const action = this.choreoQueue.shift()
    if (action) {
      this.executeBattleChoreographyAction(action)
      return true
    }
    box?.releaseBattleChoreography()
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
      this.settlementPresentation.recordResult(terminal.result)
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
    if (this.readiness.phase === 'preparing') return
    if (this.readiness.phase === 'readinessError') {
      if (pressed.has('Enter') || pressed.has('Escape'))
        this.cancel(this.readiness.error ?? undefined)
      return
    }
    if (this.nowMs < this.roundEndFeedbackUntilMs) return
    if (this.roundEndFeedbackUntilMs !== 0) {
      this.roundEndFeedbackUntilMs = 0
      this.resetPlayersVisual()
    }
    if (this.nowMs < this.enemyCastRecoveryUntilMs) return
    const feedback = this.actionFeedback
    if (feedback) {
      const dismissed =
        feedback.dismiss === 'anyKey' ? pressed.size > 0 : pressed.has(' ') || pressed.has('Enter')
      if (!dismissed && this.nowMs < feedback.untilMs) return
      const box = this.assets.dialogBox
      if (dismissed && this.nowMs < feedback.untilMs) box?.advance(this.nowMs)
      if (box?.active) box.close()
      this.itemBanner = null
      this.actionFeedback = null
      // 投掷等确认后即可进入收招，其他旁白从下一拍继续。
      if (feedback.dismiss === 'confirm') this.actionPresentation.advancePlayback(0)
      if (this.enemyCastRecoveryPending && !s.casualtyDialogue) {
        this.beginEnemyCastRecovery()
        this.actionPresentation.satisfyActionCadence()
      }
      return
    }

    if (s.phase === 'won' || s.phase === 'lost' || s.phase === 'fled') {
      this.settlementPresentation.observeCorePhase(s.phase, s.enemyFled)
      // A finishing cooperative move still holds its formation during the death fade.
      if (this.actionPresentation.active && this.advanceDeathFade()) return
      const terminalPlayback = this.actionPresentation.advancePlayback(dtMs)
      if (terminalPlayback === 'playing') return
      if (terminalPlayback === 'finished') {
        this.finishStepVisuals()
        return
      }
      if (this.pumpCasualtyDialogue(pressed)) return
      // 动作收尾可能刚打开失败 narration；终态也必须等它自动/手动关闭后再 finalize。
      const terminalDialog = this.assets.dialogBox
      if (terminalDialog?.active) {
        if (pressed.has(' ') || pressed.has('Enter')) terminalDialog.advance(this.nowMs)
        return
      }
      this.sessionUi = 'over'
      if (this.advanceDeathFade(DEATH_SETTLEMENT_PAUSE_MS)) return
      const completed = this.settlementPresentation.advance(dtMs, pressed, this.opts.handoffDefeat)
      if (completed) this.complete(completed)
      return
    }

    if (this.advanceDeathFade()) return

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
        this.beginTurnPreparation(dtMs)
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
      if (this.sessionUi === 'acting') {
        this.selection.beginRound()
        this.sessionUi = null
      }
      this.selectionStartedForTurn = s.turn
      const context = this.selectionContext(sel)
      this.selection.advance(context, pressed, {
        submit: (playerIndex, action) => this.state.pendingActions.set(playerIndex, action),
        retract: (playerIndex) => this.state.pendingActions.delete(playerIndex),
        consumeOthersForCoop: (casterIndex) => this.consumeOthersForCoop(casterIndex),
      })
      return
    }

    if (s.phase === 'performAction') {
      this.sessionUi = 'acting'
      if (this.pumpScriptExecution(dtMs, pressed)) return
      // M4d-2:动画回放中 → 只推进;播完收尾(复位/死亡淡出/死音)
      const actionPlayback = this.actionPresentation.advancePlayback(dtMs)
      if (actionPlayback === 'playing') return
      if (actionPlayback === 'finished') {
        this.finishStepVisuals()
        return
      }
      if (!this.actionPresentation.consumeActionCadence(dtMs)) return
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
            if (this.activeHook) {
              this.actionPresentation.resetActionCadence()
              return
            }
            // A synchronous ready hook and its action share a battle frame (fight.c:1719-1724).
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
      this.enemyCastRecoveryPending = la?.side === 'enemy' && la.kind === 'cast'
      this.pendingFailureFeedback = la?.failureFeedback ?? null
      // 本步死亡敌(动画收尾统一开淡出 + death 音;一阶段 diedFromAttack 语义)
      this.pendingDeaths = s.enemies
        .map((e, i) =>
          i < eHp.length && e && expectDefined(eHp[i]) > 0 && e.hp <= 0 && !s.enemyFled ? i : -1,
        )
        .filter((i) => i >= 0)
      // 本步数值反馈：回血黄字/回 MP 青字；物品造成的自伤按原版
      // PAL_BattleDisplayStatChange 显示蓝字。其它伤害仍由各自攻击时间线负责，避免重复。
      this.pendingGains = []
      const hpBeforeEffects = la?.kind === 'coop' ? la.hpAfterContribution : pHp
      s.players.forEach((p, i) => {
        const dh = p.hp - (hpBeforeEffects[i] ?? p.hp)
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
      if (la?.notice && !this.pendingStealNotice)
        this.itemBanner = { text: la.notice, untilMs: this.nowMs + 1200, x: 130, y: 75 }
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
      const previousFloatCount = this.floats.length
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
      // 原版先回原坐标，数字停拍中保留玩家姿势，下一普通战斗帧才复位。
      // fight.c:1604–1668 的 Delay 只更新敌方姿态。
      if (
        !queueHead &&
        !this.pendingDeaths.length &&
        (this.floats.length > previousFloatCount || this.pendingGains.length > 0)
      )
        this.roundEndFeedbackUntilMs = this.nowMs + ROUND_END_FEEDBACK_MS
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
    // 合击只扣贡献者的生命代价。原版扣完才备份 HP，因此不显示这笔伤害（fight.c:3980）。
    const damageNums = la.fizzled ? [] : this.diffDamageNums(la.kind === 'coop' ? [] : pHp, eHp)
    if (la.side === 'player') {
      // fight.c:638–651：玩家法术超杀时飘完整伤害。混合技能仍保留其它效果的净扣血。
      for (const hit of la.magicHits ?? []) {
        const number = damageNums.find(
          ({ target }) => target.side === 'enemy' && target.idx === hit.idx,
        )
        if (number) number.value += hit.value - hit.hpLost
      }
      const playerProfile = this.playerAppearance(la.idx).definition.profile
      if (playerProfile.kind !== 'player-fighter') throw new Error('player profile 漂移')
      const casterPos = getPlayerBasePos(s.players.length, la.idx)
      if (!casterPos) return null
      // OffMagic normal 落点；友方普通法术另走受术队员的 DefMagic。
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
      const fireFrames = la.fizzled ? 0 : (fire?.frames.length ?? 0)
      let allyTargets: NonNullable<Parameters<typeof buildPlayerCast>[0]['allyTargets']> = []
      if (!la.fizzled && !summonEff && fx.placement === 'normal') {
        // 全队效果覆盖每个队伍槽；单体与 core 使用同一个目标槽范围。
        const targetIdx = Math.min(Math.max(la.targetAllyIdx ?? la.idx, 0), s.players.length - 1)
        if (skill.target === 'allAllies' || skill.target === 'oneAlly' || skill.target === 'self')
          allyTargets = s.players.flatMap((_, idx) => {
            if (skill.target !== 'allAllies' && idx !== targetIdx) return []
            const pos = getPlayerBasePos(s.players.length, idx)
            return pos ? [{ idx, pos }] : []
          })
      }
      // 合击(非召唤):走聚拢队形演出(贡献者靠拢→后→前依次施法→放技能)。
      // 召唤类合击照原版直接播召唤动画(落入下方 buildPlayerCast summon 段,不聚拢)。
      if (la.coopContributors && !summonSprite) {
        return buildPlayerCoop({
          framesByPlayer: s.players.map((_, index) => this.playerFrames(index)),
          casterIdx: la.idx,
          contributorIdxs: la.coopContributors,
          partySize: s.players.length,
          partyPositions: s.players.map((_, i) => getPlayerBasePos(s.players.length, i)),
          fireFrames,
          fx,
          targetPos,
          ...(allyTargets.length ? { allyTargets } : {}),
          damageNums,
          postTargets,
          ...(a.keepEffect ? { keepEffect: true } : {}),
          ...(this.pendingDeaths.length
            ? {
                waitForEnemyDeathFade: true,
                ...(s.phase === 'won' ? { settlementHoldMs: DEATH_SETTLEMENT_PAUSE_MS } : {}),
              }
            : {}),
          ...(this.opts.soundRoles?.['audio.battleCoopCastSound']
            ? { castSound: this.opts.soundRoles['audio.battleCoopCastSound'] }
            : {}),
        })
      }
      const partyIdxs = s.players.map((_, index) => index)
      const retreat = la.fleeSuccess
        ? {
            partySlots: partyIdxs,
            players: partyIdxs.flatMap((idx) => {
              const pos = getPlayerBasePos(s.players.length, idx)
              if (!pos || (pHp[idx] ?? 0) <= 0) return []
              return [{ idx, pos, idleFrame: this.playerFrames(idx).idle }]
            }),
            ...(this.opts.soundRoles?.['audio.battleEscapeSound']
              ? { sound: this.opts.soundRoles['audio.battleEscapeSound'] }
              : {}),
          }
        : undefined
      if (retreat) this.skipNextReset = true
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
        partyIdxs,
        fireFrames,
        fx,
        targetPos,
        waitForUseFailureFeedback: la.fizzled === true || la.fleeSuccess === false,
        ...(retreat ? { retreat } : {}),
        ...(la.blow
          ? {
              blow: {
                steps: la.blow.steps,
                targets: la.blow.targetSlots.map((idx) => ({
                  idx,
                  pos: expectDefined(s.enemies[idx]).basePos,
                })),
              },
            }
          : {}),
        ...(allyTargets.length ? { allyTargets } : {}),
        offensive:
          la.kind === 'cast' &&
          fireFrames > 0 &&
          !summonEff &&
          (skill.target === 'oneEnemy' || skill.target === 'allEnemies'),
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
                // fight.c:3143–3144 使用召唤本体的位置偏移，后续 FIRE 另取自己的偏移。
                x: 240 + (summonEff?.xOffset ?? 0),
                y: 165 + (summonEff?.yOffset ?? 0),
              },
            }
          : {}),
      })
    }
    const enemy = s.enemies[la.idx]
    const caster = this.visual.enemies[la.idx]
    if (!enemy || !caster) return null
    const { def } = enemy
    const enemyProfile = this.enemyAppearance(la.idx).definition.profile
    if (enemyProfile.kind !== 'enemy') throw new Error('enemy profile 漂移')
    const targetPos = getPlayerBasePos(s.players.length, la.targetPlayerIdx)
    if (!targetPos) return null
    const enemyFx = { ...fx }
    if (def.sounds.suppressMagicEffectSound) delete enemyFx.sound
    const casualtySounds = (slots: number[] | undefined, kind: 'death' | 'dying') =>
      (slots ?? []).flatMap((idx) => {
        const sound = this.opts.playerSounds?.[idx]?.[kind]
        return sound ? [sound] : []
      })
    const hurtPlayers =
      skill.target === 'oneEnemy'
        ? [{ idx: la.targetPlayerIdx, pos: targetPos }]
        : skill.target === 'allEnemies'
          ? damageNums
              .filter((d) => d.target.side === 'player')
              .map((d) => ({
                idx: d.target.idx,
                pos: expectDefined(getPlayerBasePos(s.players.length, d.target.idx)),
              }))
          : undefined
    return buildEnemyCast({
      enemyIdx: la.idx,
      enemyPos: enemy.basePos,
      enemyFrame: this.enemyVisualFrame(caster, enemyProfile, enemy),
      anim: enemyProfile,
      playerFrames: s.players.map((_, index) => this.playerFrames(index)),
      magicSound: def.sounds.magic,
      fireFrames: fire?.frames.length ?? 0,
      fx: enemyFx,
      targetPos,
      damageNums,
      deathSounds: casualtySounds(la.magicDeathPlayerIdxs, 'death'),
      dyingSounds: casualtySounds(la.enteredDyingPlayerIdxs, 'dying'),
      ...(a.keepEffect ? { keepEffect: true } : {}),
      // 被动格挡队员摆防御姿 frame3(除因子 +1 减伤;fight.c:4737/4755)
      ...(la.autoDefend?.length ? { autoDefendPlayers: la.autoDefend } : {}),
      hurtPlayers,
    })
  }

  /** 敌召唤手势先于空槽/状态失败，成功时播放两段入场溶解（script.c:2870–2945）。 */
  private buildEnemySummonTimeline(
    casterIdx: number,
    spawnedIdxs: readonly number[],
    fromHook = false,
  ): AnimFrame[] | null {
    const profile = this.enemyAppearance(casterIdx).definition.profile
    if (profile.kind !== 'enemy') throw new Error('enemy profile 漂移')
    if (!spawnedIdxs.length && profile.magic.count <= 0) return null

    const slotIdle = (idx: number) => {
      const slotProfile = this.enemyAppearance(idx).definition.profile
      if (slotProfile.kind !== 'enemy') throw new Error('enemy profile 漂移')
      return { idx, idle: slotProfile.idle, idleTicksPerFrame: slotProfile.idleTicksPerFrame }
    }
    const earlierArrivals = fromHook
      ? this.state.enemies.flatMap((enemy, idx) => {
          if (!enemy || enemy.hp <= 0) return []
          const elapsedTicks = this.hookSummonIdleTicks.get(enemy)
          if (elapsedTicks === undefined) return []
          if (spawnedIdxs.length)
            this.hookSummonIdleTicks.set(enemy, elapsedTicks + ENEMY_SUMMON_HOLD_TICKS)
          return [{ ...slotIdle(idx), elapsedTicks }]
        })
      : []
    const spawns = spawnedIdxs.map((idx) => {
      this.visual.enemies[idx] = null
      if (fromHook)
        this.hookSummonIdleTicks.set(
          expectDefined(this.state.enemies[idx]),
          ENEMY_SUMMON_HOLD_TICKS,
        )
      return slotIdle(idx)
    })
    return buildEnemySummon({
      casterIdx,
      profile,
      spawns,
      earlierArrivals,
      sound: this.opts.soundRoles?.['audio.battleEnemySummonSound'],
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
      const execution = sk && resolveSkillExecution(sk, la.side)
      const skEffects = execution?.effects ?? []
      if (
        la.side === 'player' &&
        la.targetEnemyIdx !== undefined &&
        skEffects.some((e) => e.kind === 'steal')
      ) {
        const pos = s.enemies[la.targetEnemyIdx]?.basePos
        const stealFrame = this.playerFrames(la.idx).steal
        if (!pos) return null
        if (stealFrame === undefined)
          throw new Error(
            `BattleSpriteDef "${this.playerAppearance(la.idx).definition.id}" 缺 steal 命名帧`,
          )
        // SSS 43144 发出技能音，角色施法音与实际冲刺同拍。
        const effectSound = execution?.animation.sound
        if (effectSound) this.assets.sfx?.play(effectSound)
        const castSound = this.opts.playerSounds?.[la.idx]?.magic
        if (castSound) this.assets.sfx?.play(castSound)
        const stolen = la.stolen
        if (stolen?.kind === 'item')
          this.pendingStealNotice = [{ text: '获得' }, { text: stolen.name, color: 'redAlt' }]
        else if (stolen?.kind === 'money')
          this.pendingStealNotice = [
            { text: '获得 ', color: 'redAlt' },
            { text: String(stolen.amount) },
            { text: ' 文钱', color: 'redAlt' },
          ]
        return buildSteal({
          casterIdx: la.idx,
          targetIdx: la.targetEnemyIdx,
          enemyPos: pos,
          stealFrame,
        })
      }
      return this.buildCastTimeline(la, pHp, eHp)
    }
    // 合击:走 buildCastTimeline(内含 coopContributors 分支 → buildPlayerCoop 聚拢队形演出;
    // 召唤类合击落 summon 段直接播召唤动画)。
    if (la.kind === 'coop') return this.buildCastTimeline(la, pHp, eHp)
    // 使用物品(fight.c:2266 举物 + 目标彩色呼吸)。
    // 物品名走时间线 banner 帧(与举物/音效同帧起显,作者对照原版确认「三同步」);
    // 玩家侧涨益由归位帧派发，数字从归位后的目标锚点起显。敌侧涨益仍走收尾。
    if (la.kind === 'item' && la.side === 'player') {
      const casterPos = getPlayerBasePos(s.players.length, la.idx)
      if (!casterPos) return null
      const item = s.items[la.itemId]
      const useTarget = item?.use?.target
      // 两种香走场景效果，原盘用物旗标仍要求全队辉光。
      const targetIdxs =
        useTarget === 'allAllies' || useTarget === 'scene'
          ? s.players.map((_, slot) => slot)
          : [la.targetAllyIdx ?? la.idx]
      const gains = this.pendingGains
        .filter((g) => g.target.side === 'player')
        .map((g) => ({ idx: g.target.idx, value: g.value, tone: g.tone }))
      this.pendingGains = this.pendingGains.filter((g) => g.target.side !== 'player')
      const sound = item?.use?.sound ?? this.opts.soundRoles?.['audio.battleItemUseSound']
      // fight.c:4404–4405：复活者在辉光结束后先恢复静止姿态，再绘制回血数字。
      const revivedTargets = targetIdxs.flatMap((idx) => {
        const target = expectDefined(s.players[idx])
        return pHp[idx] === 0 && target.hp > 0
          ? [{ idx, frame: this.playerRestFrame(target, this.playerFrames(idx)) }]
          : []
      })
      return buildUseItem({
        casterFrames: this.playerFrames(la.idx),
        casterIdx: la.idx,
        casterPos,
        targetIdxs,
        revivedTargets,
        waitForUseFailureFeedback: la.failureFeedback === 'itemIneffective',
        itemName: item?.name,
        ...(sound ? { sound } : {}),
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
      if (!pos) return null
      this.clearBannerOnActionEnd = true
      return buildFleeFail({ idx: la.idx, pos, frames: this.playerFrames(la.idx) })
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
      const original = expectDefined(this.visual.enemies[la.idx])
      return buildEnemyTransform({
        idx: la.idx,
        oldDefinitionId,
        oldPos: { x: original.x, y: original.y },
        newPos: expectDefined(s.enemies[la.idx]).basePos,
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
      const motherVisual = this.visual.enemies[la.idx]
      if (motherVisual) {
        motherVisual.x = mother.basePos.x
        motherVisual.y = mother.basePos.y
      }
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
    if (la.kind === 'summon' && la.side === 'enemy')
      return this.buildEnemySummonTimeline(la.idx, la.spawnedIdxs ?? [])
    // 投掷道具(前移、挥臂、出手 → 数字 → 复位；纯施毒不显数字)
    if (la.kind === 'throw' && la.side === 'player' && la.throwHits?.length) {
      const attackerPos = getPlayerBasePos(s.players.length, la.idx)
      if (!attackerPos) return null
      const item = la.itemId ? s.items[la.itemId] : undefined
      const throwSound = item?.throw?.sound ?? this.opts.playerSounds?.[la.idx]?.magic
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
      const casterFrames = this.playerFrames(la.idx)
      // 吸星锁在投掷者归位前同时显示敌伤与回血（fight.c:4369–4372）。
      const casterGainIndex = this.pendingGains.findIndex(
        (gain) =>
          gain.target.side === 'player' && gain.target.idx === la.idx && gain.tone === 'yellow',
      )
      const casterGain =
        casterGainIndex < 0 ? undefined : this.pendingGains.splice(casterGainIndex, 1)[0]
      return buildThrowItem({
        casterFrames,
        casterIdx: la.idx,
        casterPos: attackerPos,
        casterRestFrame: this.playerRestFrame(expectDefined(s.players[la.idx]), casterFrames),
        ...(item ? { itemName: item.name } : {}),
        waitForThrowFeedback: la.failureFeedback === 'throwIneffective',
        hits: la.throwHits.map(({ idx, value }) => ({ idx, damage: value })),
        ...(casterGain ? { casterHeal: casterGain.value } : {}),
        ...(throwSound ? { sound: throwSound } : {}),
        ...(throwPresentation ? { presentation: throwPresentation } : {}),
      })
    }
    // 混乱打友：从当前画面站位出招，复位按双方实际状态（fight.c:3800–3850）。
    if (la.kind === 'attackMate' && la.side === 'player') {
      const attacker = expectDefined(s.players[la.idx])
      const mate = expectDefined(s.players[la.targetAllyIdx])
      const attackerPos = getPlayerBasePos(s.players.length, la.idx)
      const mateVisual = this.visual.players[la.targetAllyIdx]
      if (!attackerPos || !mateVisual) return null
      const attackerFrames = this.playerFrames(la.idx)
      const mateFrames = this.playerFrames(la.targetAllyIdx)
      return buildMateAttack({
        attackerFrames,
        attackerRestFrame: this.playerRestFrame(attacker, attackerFrames),
        attackerIdx: la.idx,
        attackerPos,
        mateIdx: la.targetAllyIdx,
        matePos: { x: mateVisual.x, y: mateVisual.y },
        mateRestFrame: this.playerRestFrame(mate, mateFrames),
        weaponSound: this.opts.playerSounds?.[la.idx]?.weapon,
        damage: la.damage,
      })
    }
    if (la.kind === 'attack' && la.side === 'player' && la.attackAllSweeps?.length) {
      const attackerPos = getPlayerBasePos(s.players.length, la.idx)
      if (!attackerPos) return null
      const player = expectDefined(s.players[la.idx])
      const firstSweep = expectDefined(la.attackAllSweeps[0])
      const targets = [...firstSweep.hits]
        .sort((a, b) => a.idx - b.idx)
        .map(({ idx }) => ({ idx, pos: expectDefined(s.enemies[idx]).basePos }))
      const frames = this.playerFrames(la.idx)
      const snd = this.opts.playerSounds?.[la.idx]
      return buildPlayerAttackAll({
        frames,
        attackerIdx: la.idx,
        attackerPos,
        attackerRestFrame: this.playerRestFrame(player, frames),
        effectFrameBase: this.playerAttackEffectFrameBase(la.idx),
        targets,
        sweeps: la.attackAllSweeps.map(({ hits, critical }) => ({
          hits,
          attackSound: player.hp > 0 ? (critical ? snd?.critical : snd?.attack) : undefined,
        })),
        weaponSound: snd?.weapon,
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
      // 敌 HP 钳到 0，飘字仍显示本击算出的完整伤害(fight.c:638,3665)。
      const firstDmg = la.firstDamage ?? totalDmg - (second ?? 0)
      const snd = this.opts.playerSounds?.[la.idx]
      const attackerAlive = expectDefined(s.players[la.idx]).hp > 0
      const attackInput = (
        damage: number,
        windup: boolean,
        critical: boolean | undefined,
        anchor: { x: number; y: number },
      ) => ({
        frames: this.playerFrames(la.idx),
        attackerIdx: la.idx,
        attackerPos,
        targetIdx: t,
        targetPos: anchor,
        targetHeight: this.enemyAppearance(t).sprite.frames[0]?.height ?? 40,
        effectFrameBase: this.playerAttackEffectFrameBase(la.idx),
        damage,
        windup,
        // 出招/兵器音;暴击换暴击喝声(rgwCriticalSound 替代 attackSound,fight.c:2065-2069)
        ...(snd
          ? {
              sounds: {
                attack: attackerAlive ? (critical ? snd.critical : snd.attack) : undefined,
                weapon: snd.weapon,
              },
            }
          : {}),
      })
      const first = buildPlayerAttack(attackInput(firstDmg, true, la.crit, targetPos))
      if (second === undefined) return first
      // fight.c:2040–2042,2250–2261: each swing reads the enemy position after the last knockback.
      const secondTarget = expectDefined(
        first.at(-1)?.fighters?.find((fighter) => fighter.side === 'enemy' && fighter.idx === t)
          ?.pos,
      )
      return [
        ...first,
        ...buildPlayerAttack(attackInput(second, false, la.secondCrit ?? la.crit, secondTarget)),
      ]
    }
    // 敌物攻
    const t = la.targetPlayerIdx
    const enemyPos = s.enemies[la.idx]?.basePos
    const targetPos = getPlayerBasePos(s.players.length, t)
    const def = s.enemies[la.idx]?.def
    if (!enemyPos || !targetPos || !def) return null
    const damage = la.damage ?? 0
    const playerFrames = s.players.map((_, index) => this.playerFrames(index))
    const targetPose = expectDefined(playerFrames[t])
    const targetSounds = this.opts.playerSounds?.[t]
    // 保留受击前画帧，仅由本次物理扣血覆盖死/濒死姿态；附毒在原版复位后结算。
    // fight.c:4915,5108-5145
    const hpAfterPhysicalHit = expectDefined(pHp[t]) - damage
    const targetRecoveryFrame =
      hpAfterPhysicalHit <= 0
        ? targetPose.dead
        : isPlayerDying(hpAfterPhysicalHit, expectDefined(s.players[t]).maxHp)
          ? targetPose.dying
          : expectDefined(this.visual.players[t]).frame
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
      playerFrames,
      sounds: def.sounds,
      // 被动格挡演出(免伤免数字+格挡姿;音 = 目标玩家自己的 coverSound)
      ...(la.blocked ? { blocked: true } : {}),
      ...(la.blocked && targetSounds?.cover ? { coverSound: targetSounds.cover } : {}),
      ...(damage > 0 && hpAfterPhysicalHit <= 0 && targetSounds?.death
        ? { targetDeathSound: targetSounds.death }
        : {}),
      ...(la.enteredDyingPlayerIdxs?.includes(t) && targetSounds?.dying
        ? { targetDyingSound: targetSounds.dying }
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
      damage,
      targetRecoveryFrame,
    })
  }

  private playerAttackEffectFrameBase(idx: number): number {
    if (!this.assets.effectSprite) return -1
    const profile = this.playerAppearance(idx).definition.profile
    if (profile.kind !== 'player-fighter') throw new Error('player profile 漂移')
    return profile.attackEffectBase
  }

  /** 时间线 delta → 表现层(原版语义:pos 直落;连续位移由时间线插值帧承担)。 */
  private applyDelta(d: FighterDelta): void {
    if (d.side === 'enemy' && d.showSpawn) this.visual.enemies[d.idx] = this.enemyRestVisual(d.idx)
    const v = d.side === 'player' ? this.visual.players[d.idx] : this.visual.enemies[d.idx]
    if (!v) return
    if (d.frame !== undefined) v.frame = d.frame
    if (d.holdFrame !== undefined) v.holdFrame = d.holdFrame
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
    anchor?: { x: number; y: number },
  ): void {
    const v = t.side === 'player' ? this.visual.players[t.idx] : this.visual.enemies[t.idx]
    if (!v) return
    // 数字锚 = 一阶段真值(present-battle.ts showDamageNum,fight.c:640-708 + uibattle.c:1801):
    //   x:anchor.x−24 且 5 位右对齐(6px/位)→ 个位右缘 = 底中 + 6(drawNumber 右对齐语义直传)
    //   y:敌 −115 / 玩家 HP −75 / MP(cyan)−67,下限 10;固定偏移不随精灵高度(此前用
    //   spriteH 导致高矮怪数字忽高忽低 = 作者报「掉血数字歪」根因之一)
    const { x, y } = anchor ?? v
    const yOff = t.side === 'enemy' ? 115 : tone === 'cyan' ? 67 : 75
    this.floats.push({
      x: x + 6,
      y: Math.max(y - yOff, 10),
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
    const text = {
      statusIneffective: '攻击无效',
      itemIneffective: '无任何效果',
      throwIneffective: '无任何效果',
      spellIneffective: '失败　没有效果',
      missingSpellItem: '道具不足无法使用',
      missingSpellMoney: '钱不够，只好作罢',
    }[feedback]
    if (feedback === 'statusIneffective') this.showActionFeedback(text)
    else if (feedback === 'throwIneffective') this.showActionFeedback(text, 'confirm')
    else {
      this.showActionFeedback(text, 'anyKey')
      if (feedback !== 'itemIneffective') this.actionPresentation.satisfyActionCadence()
    }
  }

  private showActionFeedback(message: string | TextSpan[], dismiss?: 'confirm' | 'anyKey'): void {
    if (dismiss) {
      this.itemBanner = null
      this.actionPresentation.resetActionCadence()
      this.actionFeedback = { untilMs: this.nowMs + FAILURE_FEEDBACK_MS, dismiss }
    }
    const box = this.assets.dialogBox
    const id = '__battle_action_feedback'
    if (box && typeof message !== 'string') {
      box.openNarration(id, message, this.nowMs)
      return
    }
    const text = typeof message === 'string' ? message : message.map((span) => span.text).join('')
    if (box) {
      box.open(
        startDialogue({
          id,
          cues: [
            {
              rows: [{ text }],
              slot: 'narration',
              ...(dismiss === 'confirm' ? {} : { autoAdvance: FAILURE_FEEDBACK_MS }),
            },
          ],
        }),
        this.nowMs,
      )
    } else {
      // headless/资源缺失兜底；真实游戏路径始终使用 narration 卷轴。
      this.itemBanner = { text, untilMs: this.nowMs + FAILURE_FEEDBACK_MS, x: 130, y: 75 }
    }
  }

  /** PostActionCheck 等待 FadeScene (fight.c:889-894)。由游戏时间释放，与绘制频率无关。 */
  private advanceDeathFade(pauseAfterMs = 0): boolean {
    const fade = this.deathFade
    if (!fade) return false
    if (this.nowMs - fade.startedAtMs < DEATH_FADE_MS + pauseAfterMs) return true
    this.deathFade = null
    if (this.state.phase === 'performAction' && !this.actionPresentation.active)
      this.actionPresentation.satisfyActionCadence()
    // 没有结算停拍时，把淡出完成的这一帧留给战场终帧。
    return pauseAfterMs === 0
  }

  private startEnemyDeathFade(): void {
    if (!this.pendingDeaths.length) return
    this.deathFade = { startedAtMs: this.nowMs, enemySlots: this.pendingDeaths }
    for (const i of this.pendingDeaths) {
      const e = this.state.enemies[i]
      if (e?.def.sounds.death) this.assets.sfx?.play(e.def.sounds.death)
    }
    this.pendingDeaths = []
  }

  /** 每步收尾:表现层复位 + 死亡淡出登记(death 音)+ displayHp 兜底同步。 */
  private finishStepVisuals(): void {
    if (this.clearBannerOnActionEnd) {
      this.itemBanner = null
      this.clearBannerOnActionEnd = false
    }
    if (this.skipNextReset) this.skipNextReset = false
    else this.resetVisual()
    // per-action 瞬态复位(审计红线 #7;fight.c:2835 wave 还原语义)
    this.frameWaveAdd = 0
    this.screenShake = null
    this.summonVis = null
    // 涨益飘字(回血黄/回 MP 青;特效播完后弹 = DisplayStatChange 时序)
    for (const g of this.pendingGains) this.applyDamageFx(g.target, g.value, g.tone)
    this.pendingGains = []
    this.startEnemyDeathFade()
    this.pendingConfusedReveal.clear()
    this.syncPlayerDisplayHp()
    // 失败卷轴在收尾复位后显示。敌方另在清除后进入施法恢复停顿。
    this.presentPendingFailureFeedback()
    // 原版完整复位后等十帧才进伤亡脚本（fight.c:804–819,865–882）。
    if (this.state.casualtyDialogue)
      this.casualtyDialogueReadyAtMs = this.nowMs + CASUALTY_DIALOGUE_DELAY_MS
    else if (!this.actionFeedback) this.beginEnemyCastRecovery()
    if (this.pendingStealNotice) {
      this.showActionFeedback(this.pendingStealNotice, 'anyKey')
      this.pendingStealNotice = undefined
    }
  }

  private syncPlayerDisplayHp(): void {
    this.state.players.forEach((p, i) => {
      const v = this.visual.players[i]
      if (v) v.displayHp = p.hp
    })
  }

  private beginEnemyCastRecovery(): void {
    // 原版敌法在受击复位及伤亡检查后保持八帧（fight.c:4904–4908）。
    if (!this.enemyCastRecoveryPending) return
    this.enemyCastRecoveryPending = false
    this.actionPresentation.resetActionCadence()
    this.enemyCastRecoveryUntilMs = this.nowMs + ENEMY_CAST_RECOVERY_MS
  }

  /** dev:战斗日志只读视图(M4c 验证)。 */
  debugLog(): readonly string[] {
    return this.state.log
  }

  /** dev/test:异步音效屏障只读状态。 */
  debugReadiness(): {
    phase: SessionUiPhase | BattleCommandSelectionPhase | 'preparing' | 'readinessError'
    error?: string
  } {
    const phase =
      this.readiness.phase === 'idle'
        ? (this.sessionUi ?? this.selection.phase)
        : this.readiness.phase
    return {
      phase,
      ...(this.readiness.error ? { error: this.readiness.error.message } : {}),
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

  /** 写回真实战斗中的道具增减，保留战斗期间新增的可用道具。 */
  writeBackInventory(inv: { itemId: string; count: number }[]): void {
    for (const s of this.state.inventory) {
      const w = inv.find((x) => x.itemId === s.itemId)
      if (w) w.count = s.count
      else if (s.count > 0) inv.push({ ...s })
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

  /** 战后把队员 HP/MP 写回 world.party；胜利奖励先按实际 HP 判断是否发经验。 */
  writeBackHp(
    party: { id: string; hp: number; mp: number }[],
    options: { preserveZeroHp?: boolean } = {},
  ): void {
    const minHp = options.preserveZeroHp || this.state.phase === 'lost' ? 0 : 1
    for (const p of this.state.players) {
      const c = party.find((x) => x.id === p.roleId)
      if (!c) continue
      c.hp = Math.max(p.hp, minHp)
      c.mp = p.mp
    }
  }

  render(ctx: CanvasRenderingContext2D, worldScale: number): void {
    // 震屏 = 整帧合成级垂直位移(所有图层+UI 之上;video.c UpdateScreen 输出级 —— 一阶段
    // daaaae51 血泪:只接大世界路径漏战斗侧 = 山神震屏不显示)。露出条带填黑。
    const dy =
      this.actionPresentation.frameShakeOffsetY ?? shakeOffsetY(this.screenShake, this.nowMs)
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

  /** 新施加的混乱从主特效结束后的第一拍开始抖动。 */
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

  private enemyVisualFrame(
    visual: VisualFighter,
    profile: EnemyBattleSpriteProfile,
    enemy: BattleEnemyState,
  ): number {
    if (
      visual.holdFrame ||
      visual.frame !== profile.idle.start ||
      profile.idle.count <= 1 ||
      enemy.hp <= 0
    )
      return visual.frame
    const summonTicks = this.hookSummonIdleTicks.get(enemy)
    if (summonTicks !== undefined) return enemySummonIdleFrame(profile, summonTicks)
    const idleStep = Math.floor(this.nowMs / (profile.idleTicksPerFrame * BATTLE_FRAME_MS))
    return profile.idle.start + (idleStep % profile.idle.count)
  }

  private renderInner(ctx: CanvasRenderingContext2D, worldScale: number): void {
    const s = this.state
    const now = this.nowMs
    const statusMember = this.selection.statusMember
    if (statusMember !== null && this.assets.statusPanel) {
      const { renderer, party } = this.assets.statusPanel
      const player = expectDefined(s.players[statusMember])
      const member = expectDefined(party.find(({ id }) => id === player.roleId))
      const progress = player.persistentProgress
      ctx.save()
      ctx.scale(worldScale, worldScale)
      ctx.imageSmoothingEnabled = false
      renderer.renderMemberStatus(
        ctx,
        {
          ...member,
          hp: player.hp,
          maxHP: player.maxHp,
          mp: player.mp,
          maxMP: player.maxMp,
          level: progress?.level ?? member.level,
          exp: progress?.exp ?? member.exp,
          poisons: player.poisons,
        },
        {
          attack: player.attackStrength,
          magicAttack: player.magicStrength,
          defense: player.defense,
          speed: player.baseDexterity,
          luck: player.fleeRate,
        },
      )
      ctx.restore()
      return
    }
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
    const sel =
      s.phase === 'selectAction' &&
      this.selectionStartedForTurn === s.turn &&
      now >= this.roundEndFeedbackUntilMs &&
      !this.selection.isAutoAttacking
        ? this.nextSelecting()
        : undefined
    const selection = this.selection.view
    const selectionContext = sel === undefined ? null : this.selectionContext(sel)
    // 选敌高亮目标(target 态,闪烁节拍)。选队友是**箭头光标**(drawPlayerTargetArrow,
    // 一阶段两套形制:敌 = colorShift 高亮 / 友 = 箭头移动,勿混 —— 曾拿高亮套友方,作者纠)
    const alive = this.aliveEnemyIdxs()
    const targetBlink = Math.floor(now / 160) % 2 === 0
    const highlightEnemy =
      sel !== undefined &&
      selection.phase === 'target' &&
      selection.targetSide === 'enemy' &&
      alive.length &&
      targetBlink
        ? alive[selection.targetIndex % alive.length]
        : undefined
    // 场景(M4d-2:visual 层驱动 —— 动画位移/帧/受击染色;死亡 = alpha 渐隐)
    const deathFade = this.deathFade
    const summonFade = this.enemySummonFade
    const arrivingDraws = summonFade ? new Set<BattleSpriteDraw>() : null
    const enemies: BattleSpriteDraw[] = []
    let transformFade:
      | { source: BattleSpriteDraw; target: BattleSpriteDraw; step: number }
      | undefined
    for (const [i, e] of s.enemies.entries()) {
      if (!e) continue
      const appearance = this.enemyAppearance(i)
      const sprite = appearance.sprite
      const v = this.visual.enemies[i]
      if (!sprite || !v) continue
      // 死亡可见性(2026-07-05 作者报「施法时怪物消失」):真 hp 在时间线**播放前**已结算,
      // 不能凭它判死否则强力术一出手怪就没、整段演出打空气。用 pendingDeaths(本步正被这次
      // 演出击杀的敌)区分两类:① 正被击杀 → 演出全程照画,收尾(finishStepVisuals)才登记
      // 淡出;② 早已死亡(逃跑清场)→ 不在 pendingDeaths 且 hp≤0 → 不画。原版语义:命中数字后才淡出。
      const dyingNow = this.pendingDeaths.includes(i) || this.fleeingEnemies?.includes(i) === true
      let alpha = 1
      if (e.hp <= 0 && !dyingNow) {
        if (!deathFade?.enemySlots.includes(i)) continue
        alpha = 1 - (now - deathFade.startedAtMs) / DEATH_FADE_MS
        if (alpha <= 0) continue
      }
      const anim = appearance.definition.profile
      if (anim.kind !== 'enemy') throw new Error('enemy profile 漂移')
      const frame = this.enemyVisualFrame(v, anim, e)
      // 疯魔抖动(battle.c:114-121):敌 X 轴 ±1/帧;眠/定压制不抖(死亡淡出 hp≤0 自然排除)
      const jx = this.enemyConfusedJitterX(i, e)
      const draw: BattleSpriteDraw = {
        sprite,
        x: v.x + jx,
        y: v.y,
        frame,
        colorShift: i === highlightEnemy ? 6 : v.colorShift,
        ...(alpha < 1 ? { alpha } : {}),
      }
      const transition = this.enemyAppearanceTransitions.get(i)
      if (transition) {
        const source = {
          sprite: this.requireAppearance(transition.oldDefinitionId, 'enemy').sprite,
          ...transition.source,
        }
        if (transition.step === 0) {
          enemies.push({ ...source, colorShift: draw.colorShift })
        } else {
          const target = draw
          enemies.push(target)
          transformFade = { source, target, step: transition.step }
        }
      } else {
        enemies.push(draw)
        if (summonFade?.slots.includes(i)) arrivingDraws?.add(draw)
      }
    }
    const players: BattleSpriteDraw[] = []
    const trance = this.playerAppearanceTransition
    let tranceTarget: BattleSpriteDraw | undefined
    s.players.forEach((p, i) => {
      const playerTransition = trance?.idx === i ? trance : null
      const appearance =
        playerTransition && !playerTransition.fade
          ? this.requireAppearance(playerTransition.oldDefinitionId, 'player-fighter')
          : this.playerAppearance(i)
      const sprite = appearance.sprite
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
      const draw: BattleSpriteDraw = {
        sprite,
        x: v.x,
        y: v.y + jy,
        frame: v.frame,
        colorShift: v.colorShift,
        ...(alpha < 1 ? { alpha } : {}),
      }
      players.push(draw)
      if (playerTransition?.fade) tranceTarget = draw
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
    if (trance?.fade) {
      const source = { ...scene, players: players.filter((draw) => draw !== tranceTarget) }
      const sourcePlayer = {
        sprite: this.requireAppearance(trance.oldDefinitionId, 'player-fighter').sprite,
        ...trance.fade.source,
      }
      source.players.push(sourcePlayer)
      this.sceneFade.render(ctx, source, scene, worldScale, trance.fade.step)
    } else if (transformFade) {
      const { source, target, step } = transformFade
      const sourceEnemies = enemies.map((draw) => (draw === target ? source : draw))
      this.sceneFade.render(ctx, { ...scene, enemies: sourceEnemies }, scene, worldScale, step)
    } else if (summonFade && arrivingDraws) {
      const sourceEnemies =
        summonFade.phase === 'arrival'
          ? enemies.filter((draw) => !arrivingDraws.has(draw))
          : enemies.map((draw) =>
              arrivingDraws.has(draw) ? { ...draw, colorShift: ENEMY_SUMMON_COLOR_SHIFT } : draw,
            )
      this.sceneFade.render(
        ctx,
        { ...scene, enemies: sourceEnemies },
        scene,
        worldScale,
        summonFade.step,
      )
    } else renderBattleScene(ctx, scene, worldScale)

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

    // CLASSIC 只在选招期间绘制人物框(uibattle.c:888-928)。等本轮起手脚本播完才进入选招。
    if (
      !dialogActive &&
      s.phase === 'selectAction' &&
      this.selectionStartedForTurn === s.turn &&
      !this.selection.isAutoAttacking
    )
      s.players.forEach((p, i) => {
        const shownHp = this.visual.players[i]?.displayHp ?? p.hp
        if (ui?.magicPlayerBox) {
          // 取可染色毒中可解度最高者，保留 wColor 供头像选色段（uibattle.c:126-161）。
          let maxRank = -1
          let poisonColor: number | undefined
          for (const ap of p.poisons) {
            const def = s.poisonDefs[ap.poisonId]
            if (!def || def.curability === 'incurable' || def.color <= 0) continue
            const rank = POISON_CURE_RANK[def.curability]
            if (rank >= maxRank) {
              maxRank = rank
              poisonColor = def.color & 0xff
            }
          }
          drawPlayerInfoBox(
            ctx,
            ui,
            this.assets.faces?.[p.roleId],
            { ...p, hp: shownHp, status: p.status, poisonColor },
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
      if (selection.phase === 'target' && selection.targetSide === 'ally') {
        // 选队友 = **箭头光标**移动到候选队员(一阶段 selectTargetPlayer:只画目标箭头,
        // 不画行动者三角;选敌方才是 colorShift 高亮 —— 曾拿高亮套友方,作者纠)
        const t = selection.targetIndex % Math.max(1, s.players.length)
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
      this.readiness.phase === 'idle' ? null : battleReadinessOverlayText(this.readiness.phase)
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
    if (
      !dialogActive &&
      sel !== undefined &&
      selectionContext &&
      ui &&
      selection.phase !== 'target' &&
      this.sessionUi !== 'acting'
    ) {
      const p = expectDefined(s.players[sel])
      // 主菜单 4 图标(法术/物品/杂项态仍画,一阶段 selectMove 全程画)
      if (this.assets.battleIcons) {
        drawMainIcons(
          ctx,
          this.assets.battleIcons,
          selection.menuIndex,
          this.selection.mainActionValidity(selectionContext),
          true,
        )
      }
      if (selection.phase === 'misc' || selection.phase === 'miscSub') {
        // 杂项盒 box(2,20);进二级后父项(道具)固定金黄
        const rows: BattleMenuRow[] = MISC_LABELS.map((label, i) => ({
          label,
          disabled: i === 1 && selectionContext.usableItems.length === 0,
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
          selection.miscIndex,
          now,
          2,
          20,
          61,
          112,
          selection.phase === 'miscSub',
        )
        if (selection.phase === 'miscSub') {
          // 使用/投掷二级 box(30,50):cols=1 rows=1 → 主体 61 × 高 20+18+20=58
          const sub: BattleMenuRow[] = [
            { label: '使用' },
            { label: '投掷', disabled: selectionContext.throwableItems.length === 0 },
          ]
          drawBattleMenuBox(ctx, ui, g, sub, selection.miscSubIndex, now, 30, 50, 61, 58)
        }
      } else if (selection.phase === 'skill') {
        // 法术网格(红框 3 列)+ 左上 MP 框
        const rows: BattleMenuRow[] = p.skills.map((sid) => {
          const sk = this.opts.skills?.[sid]
          const mp = sk?.cost.mp ?? 0
          return {
            label: sk?.name ?? sid,
            disabled: !sk || p.mp < mp,
          }
        })
        const selSkill = this.opts.skills?.[p.skills[selection.skillIndex % p.skills.length] ?? '']
        if (selSkill?.desc)
          drawBattleMenuDescription(
            ctx,
            selSkill.desc.split(/\r?\n/),
            102,
            3,
            g,
            this.assets.palette,
          )
        drawBattleGrid(ctx, ui, g, rows, selection.skillIndex, now, MAGIC_GRID)
        drawMpBox(ctx, ui, selSkill?.cost.mp ?? 0, p.mp)
      } else if (selection.phase === 'item' || selection.phase === 'throwItem') {
        // 物品/投掷网格(红框 3 列,数量 cyan)+ 左下选中物详情框
        const list =
          selection.phase === 'item'
            ? selectionContext.usableItems
            : selectionContext.throwableItems
        const rows: BattleMenuRow[] = list.map((it) => ({
          label: this.state.items[it.itemId]?.name ?? it.itemId,
          right: it.count,
        }))
        drawBattleGrid(ctx, ui, g, rows, selection.itemIndex, now, ITEM_GRID)
        const selItem = this.state.items[list[selection.itemIndex % list.length]?.itemId ?? '']
        drawItemDetailBox(ctx, ui, selItem?.icon ? ui.itemIcons[selItem.icon] : undefined)
        if (selItem?.desc.length)
          drawBattleMenuDescription(ctx, selItem.desc, 71, 151, g, this.assets.palette)
      }
    } else if (sel !== undefined && !ui) {
      // 文字兜底(单测/资产缺失)
      FALLBACK_MENU.forEach((item, i) => {
        const selMark = i === selection.menuIndex ? '▶ ' : '   '
        renderSpans(ctx, [{ text: `${selMark}${item}` }], 10, 26 + i * 17, {
          glyphs: g,
          shadow: true,
          forceRgba: i === selection.menuIndex ? [255, 255, 255] : [139, 147, 163],
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
    const settlementScreen = this.settlementPresentation.currentScreen
    if (this.sessionUi === 'over' && settlementScreen && ui) {
      drawSettlementScreen(ctx, settlementScreen, ui, g)
      this.settlementPresentation.markPageDrawn()
    }
    ctx.restore()
  }
}
