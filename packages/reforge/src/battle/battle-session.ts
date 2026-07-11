/**
 * BattleSession(M4b-2)—— 封装一场可玩战斗:battle-core 状态机 + 指令菜单 UI +
 * 节奏化结算(逐 action 播 + 伤害飘字)+ 胜负收尾。
 *
 * main.ts 的 host.startBattle 创建它,主循环转发 tick/render,await done 拿结果续脚本。
 * M4b-2 指令集:攻击/防御/逃跑(仙术/物品 = M4b-3 与动画一起);渲染 = 静态帧 + 飘字。
 */
import type { ActivePoison, BattleStatus, Command, EnemyDef, SkillData } from '@type-pal/content'
import { evalAiCond, isPlayerDying, lookupText, POISON_CURE_RANK } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import { bakeBgImageData, type GlyphTable, type LoadedSprite } from '../assets.js'
import type { SfxPlayer } from '../audio/sfx.js'
import type { DialogBox } from '../dialog/dialog-box.js'
import { startDialogue } from '../dialogue.js'
import { drawNumber, type MenuAssets } from '../menu/menu-box.js'
import { bakeFrame } from '../render.js'
import { type ScreenShake, shakeOffsetY, WavedBgCache } from '../screen-fx.js'
import { renderSpans } from '../text/text-render.js'
import {
  type AnimFrame,
  AnimPlayer,
  buildEnemyCast,
  buildEnemyDivide,
  buildEnemyEscape,
  buildEnemyPhysical,
  buildEnemyTransform,
  buildFleeFail,
  buildMateAttack,
  buildPartyFlee,
  buildPlayerAttack,
  buildPlayerAttackAll,
  buildSteal,
  buildUseItem,
  buildPlayerCast,
  buildPlayerCoop,
  type CastFxParams,
  type OverlayDraw,
} from './battle-anim.js'
import {
  type BattleAction,
  type BattlePlayerState,
  type CreatePlayerInput,
  type BattleState,
  buildAiView,
  createBattleState,
  healthyPlayerCount,
  isPlayerHealthy,
  needsManualSelect,
  stepBattle,
} from './battle-core.js'
import { getEnemyBasePos, getPlayerBasePos } from './battle-positions.js'
import {
  type BattleMenuRow,
  drawBattleGrid,
  drawBattleMenuBox,
  drawCurrentFinger,
  drawPlayerTargetArrow,
  drawItemDetailBox,
  drawMainIcons,
  drawMpBox,
  drawPlayerInfoBox,
  ITEM_GRID,
  MAGIC_GRID,
} from './battle-ui.js'
import { type BattleScene, type BattleSpriteDraw, renderBattleScene } from './present-battle.js'
import { drawSettlementScreen, type SettlementScreen } from './settlement.js'

const VIEW_W = 320
/** 杂项盒(一阶段 WORD.DAT 56-60):围攻/状态未实现,渲染灰显、确认无响应。 */
const MISC_LABELS = ['围攻', '道具', '防御', '逃跑', '状态'] as const
/** 文字兜底菜单(无 UI 资产时;单测)。 */
const FALLBACK_MENU = ['攻击', '仙术', '物品', '防御', '逃跑'] as const
/** 每个 action 结算间隔(节奏;一帧全算看不清)。 */
const ACT_MS = 240
/** 胜负停留展示时长。 */
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

type UiPhase = 'menu' | 'misc' | 'miscSub' | 'skill' | 'item' | 'throwItem' | 'target' | 'acting' | 'over'

export interface BattleSessionAssets {
  bg?: CanvasImageSource
  /** 背景 FBP 索引源(召唤背景染色的调色板级 nibble 重烤;缺 = 跳过染色)。 */
  bgIndexed?: { indices: Uint8Array; w: number; h: number }
  palette: Palette
  glyphs: GlyphTable
  /** 敌人战斗精灵(与 enemies 数组同序)。 */
  enemySprites: (LoadedSprite | undefined)[]
  /** 队员战斗精灵(与 players 同序)。 */
  playerSprites: (LoadedSprite | undefined)[]
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
  /** 召唤神精灵表(godId → F.MKF player 通道 chunk godId+10;main 按队伍召唤技预载;B5)。 */
  summonSprites?: Record<number, LoadedSprite>
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
  readonly done: Promise<'win' | 'lose' | 'flee'>
  private resolveDone!: (r: 'win' | 'lose' | 'flee') => void
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
  private visual: { players: VisualFighter[]; enemies: VisualFighter[] } = {
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
  private choreoQueue: Command[] = []
  private choreoBanner: { name: string; text: string } | null = null
  /** 物品使用横幅(fight.c:2316 物品名@(210,50) 白字;13 帧 ≈520ms 到期自清)。 */
  private itemBanner: { text: string; untilMs: number; x?: number; y?: number } | null = null
  private choreoName = ''
  private choreoFired = new Map<number, Set<number>>() // 敌槽 → 已播钩子下标
  private choreoTurn = 0 // 已收集过演出的轮次
  // ── B7b 胜利结算屏(经验金钱 → 升级 → 练成;逐屏空格推进)──
  private settlement: SettlementScreen[] | null = null // null = 未构建;[] = 无屏
  private settleIdx = 0

  constructor(
    players: CreatePlayerInput[],
    private readonly enemyDefs: EnemyDef[],
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
      /** 各队员命中特效帧基(battle-effect-index[spriteNum*2+1]*3;与 players 同序;缺 = 无特效)。 */
      playerEffectBase?: number[]
      /** 各队员施法前摇特效帧基(battle-effect-index[spriteNum*2]*10+15;缺 = 跳过前摇特效)。 */
      playerCastBase?: number[]
      /** 各队员战斗音效(BattlerSpec.sounds;与 players 同序。演出数据走 opts 通道,不进逻辑核)。 */
      playerSounds?: Array<import('@type-pal/content').BattlerSounds | undefined>
      /** 战场常驻波幅(battle-fields.json screenWave;法术 wave 演出期叠加其上,battle.c:1559)。 */
      fieldWave?: number
      /** 战场五灵加成(battle-fields.json magicEffect;fight.c:244 双向乘入法术伤害)。 */
      fieldEffect?: import('@type-pal/content').ElementVec
      /** 毒表(id → PoisonDef;逐回合 DoT tick 查)。 */
      poisonDefs?: Record<number, import('@type-pal/content').PoisonDef>
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
      /** 按敌 def 加载战斗精灵(变身换形/异种召唤时中场重载 —— 原版 PAL_LoadBattleSprites;
       *  缺 = 沿用槽位旧精灵,分裂/同种召唤不受影响)。 */
      loadEnemySprite?: (def: EnemyDef) => Promise<LoadedSprite | undefined>
    } = {},
  ) {
    this.state = createBattleState({
      players,
      enemies: enemyDefs,
      skills: opts.skills,
      enemiesById: opts.enemiesById,
      items: opts.items,
      inventory: opts.inventory,
      difficulty: opts.difficulty,
      boss: opts.boss,
      fieldEffect: opts.fieldEffect,
      poisonDefs: opts.poisonDefs,
    })
    this.done = new Promise((res) => {
      this.resolveDone = res
    })
    stepBattle(this.state, this.rng) // preBattle → selectAction
    this.resetVisual()
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
      const pos = getPlayerBasePos(s.players.length, i) ?? { x: 0, y: 0 }
      const prev = this.visual.players[i]
      return {
        x: pos.x,
        y: pos.y,
        frame:
          p.hp <= 0
            ? p.status.puppet > 0
              ? 0
              : 2
            : p.status.sleep > 0 || p.hp < Math.min(100, Math.floor(p.maxHp / 5))
              ? 1
              : p.defending
                ? 3
                : 0,
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
      const pos = e.basePos
      const prev = this.visual.enemies[i]
      return { x: pos.x, y: pos.y, frame: 0, colorShift: 0, displayHp: prev?.displayHp ?? e.hp }
    })
    this.overlays = null
    this.currentFire = null
  }

  /** 当前待选指令的队员下标;全填 → undefined。眠/定/疯/死者不出菜单
   *  (needsManualSelect 与 core 等填共用谓词;core 建队列时强制普攻兜底)。 */
  private nextSelecting(): number | undefined {
    const s = this.state
    for (let i = 0; i < s.players.length; i++) {
      if (needsManualSelect(s.players[i]!) && !s.pendingActions.has(i)) return i
    }
    return undefined
  }

  private aliveEnemyIdxs(): number[] {
    return this.state.enemies.map((e, i) => (e.hp > 0 ? i : -1)).filter((i) => i >= 0)
  }

  /** 战斗可用物品(背包中有货且 items 表带 use)。 */
  private usableItems(): { itemId: string; count: number }[] {
    return this.state.inventory.filter((x) => x.count > 0 && this.state.items[x.itemId]?.use)
  }

  /** 可投掷道具(有 throw 能力块;毒药/蛊)。 */
  private throwableItems(): { itemId: string; count: number }[] {
    return this.state.inventory.filter((x) => x.count > 0 && this.state.items[x.itemId]?.throw)
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

  /** 收集当轮该播的演出钩(once/when 求值;文本 locale 化 + 说话人 = 敌名)。 */
  private collectChoreo(): void {
    const s = this.state
    // 隐身期(0x5C)敌 turnStart 演出也不跑(一阶段 fight.c:1680 ==0 才跑 turnStart 脚本)
    if (s.hidingTime > 0) return
    const rng = this.rng
    s.enemies.forEach((e, idx) => {
      if (e.hp <= 0) return
      const list = e.def.choreography ?? []
      const fired = this.choreoFired.get(idx) ?? new Set<number>()
      this.choreoFired.set(idx, fired)
      list.forEach((c, ci) => {
        if (c.at !== 'turnStart' && !(c.at === 'battleStart' && s.turn === 1)) return
        if (c.once && fired.has(ci)) return
        if (c.when && !evalAiCond(c.when, buildAiView(s, e), rng)) return
        fired.add(ci)
        this.choreoName = lookupText(e.def.name, this.opts.locale ?? {})
        this.choreoQueue.push(...c.body)
      })
    })
  }

  /** 逐条消费演出命令(dialog 走真 DialogBox 等按键;音效记 log;fleeBattle 终止战斗)。 */
  private pumpChoreo(pressed: ReadonlySet<string>): void {
    const box = this.assets.dialogBox
    // 对话框活跃期:空格推进(翻页/下一段/关闭),关掉才继续消费队列(一阶段战斗对话同)。
    if (box?.active) {
      if (pressed.has(' ') || pressed.has('Enter')) box.advance(this.nowMs)
      return
    }
    if (this.choreoBanner) {
      if (pressed.has(' ') || pressed.has('Enter')) this.choreoBanner = null
      return
    }
    const c = this.choreoQueue.shift()
    if (!c) return
    switch (c.kind) {
      case 'dialog':
        if (box) {
          // 战斗对话 = 大世界同款对话框叠战斗场景上(一阶段真值)。敌方台词默认顶框(林天南
          //   setDialogStyleTop);已带 slot 的沿用。
          box.open(
            startDialogue({ id: '__battle', lines: [{ slot: 'top', ...c.line }] }),
            this.nowMs,
          )
        } else {
          this.choreoBanner = {
            name: this.choreoName,
            text: lookupText(c.line.text, this.opts.locale ?? {}),
          }
        }
        return
      case 'playSound':
        this.assets.sfx?.play(c.soundId)
        this.state.log.push(`♪ 音效 ${c.soundId}`)
        return
      case 'fleeBattle': {
        this.state.enemyFled = true
        for (const x of this.state.enemies) x.hp = 0
        this.state.log.push('敌人逃走了')
        this.state.phase = 'won'
        this.choreoQueue.length = 0
        return
      }
      case 'endBattle': {
        // 0x89:脚本终止战斗(林天南撑 7 回合 → terminate;无奖励干净退)。
        // terminate/won 都走 won 分支(main 按 enemyFled 决定是否给奖励);terminate 标 enemyFled 免奖励。
        if (c.result === 'terminate') this.state.enemyFled = true
        this.state.phase = c.result === 'lost' ? 'lost' : 'won'
        this.state.log.push(`战斗结束(${c.result})`)
        this.choreoQueue.length = 0
        return
      }
      case 'wait':
        return // 演出节拍由横幅按键控制,wait 忽略
      default:
        this.state.log.push(`演出命令 ${c.kind} 未接(记日志)`)
    }
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

  /** 敌逃离(无奖励语义;main 决定是否跑 onDefeated/给奖励)。 */
  enemyFled(): boolean {
    return this.state.enemyFled
  }

  /** 战末敌槽 def 列表(按槽序,含 divide/summon 增员;Phase E 战后脚本逐槽跑,battle.c:1334)。 */
  enemySlotDefs(): EnemyDef[] {
    return this.state.enemies.map((e) => e.def)
  }

  /** 战果(B7a;敌死累计,main 战后入账)。 */
  rewards(): { exp: number; cash: number } {
    return { exp: this.state.expGained, cash: this.state.cashGained }
  }

  /** 偷到的钱(飞龙探云手;原版 dwCash 即时加 —— main 无条件入账,逃跑也保留)。 */
  moneyStolen(): number {
    return this.state.moneyStolen
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

  tick(dtMs: number, pressed: ReadonlySet<string>): void {
    this.nowMs += dtMs
    // 数字 11 帧×40ms=440ms(uibattle.c:1753 age>10 清);文本飘字维持 900ms
    this.floats = this.floats.filter(
      (f) => this.nowMs - f.bornAt < (f.num !== undefined ? 440 : 900),
    )
    const s = this.state

    if (s.phase === 'won' || s.phase === 'lost' || s.phase === 'fled') {
      // 终态但收尾动画未播完(最后一击)→ 先播完(死亡淡出/死音在 finishStepVisuals)
      if (this.anim) {
        if (!this.anim.tick(dtMs)) return
        this.anim = null
        this.finishStepVisuals()
        return
      }
      this.ui = 'over'
      // 死亡溶解 hold:最后一敌的溶解播完 + 短拍(240ms)才起胜利乐/结算屏 —— 原版
      // PostActionCheck 的 FadeScene 是阻塞式(fight.c:889-894),溶解期间什么都不发生
      // (作者报「结算画面这么快?」= 此 hold 缺失)。render 清过期项,空表 = 直接过。
      for (const t of this.deathFades.values())
        if (this.nowMs < t + DEATH_FADE_MS + 240) return
      // B7b 胜利结算屏:win 且非敌逃 → 构建一次(回调内写回 HP + 入账 + 升级)→ 逐屏空格推进
      if (s.phase === 'won' && !this.state.enemyFled && this.settlement === null) {
        this.settlement = this.opts.buildSettlement?.() ?? []
      }
      if (this.settlement && this.settlement.length) {
        // 逐屏:空格进下一屏;放完 → 收尾。至少停 300ms 防手滑连按跳屏。
        this.overTimer += dtMs
        if ((pressed.has(' ') || pressed.has('Enter')) && this.overTimer >= 300) {
          this.settleIdx++
          this.overTimer = 0
          if (this.settleIdx >= this.settlement.length) {
            this.resolveDone('win')
          }
        }
        return
      }
      // 无结算屏(败/逃/敌逃):短暂停留自动收尾
      this.overTimer += dtMs
      if (this.overTimer >= OVER_MS) {
        this.resolveDone(s.phase === 'won' ? 'win' : s.phase === 'lost' ? 'lose' : 'flee')
      }
      return
    }

    if (s.phase === 'selectAction') {
      // M4c-2:轮起手演出(battleStart 并入第 1 轮)—— 进指令菜单前逐条播
      if (this.choreoTurn < s.turn) {
        this.choreoTurn = s.turn
        this.collectChoreo()
      }
      if (this.assets.dialogBox?.active || this.choreoBanner || this.choreoQueue.length) {
        this.pumpChoreo(pressed)
        return
      }
      const sel = this.nextSelecting()
      if (sel === undefined) {
        stepBattle(s, this.rng) // 全填 → build queue → performAction
        this.ui = 'acting'
        this.actTimer = 0
        return
      }
      // 自动战斗(0x8A):玩家侧不出菜单,逐个活队员派 AI 攻击最近活敌(石长老过场战)
      if (this.opts.auto) {
        const alive = this.aliveEnemyIdxs()
        s.pendingActions.set(
          sel,
          alive.length ? { kind: 'attack', targetEnemyIdx: alive[0]! } : { kind: 'defend' },
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
        if (key('d', 'D')) return this.submitAnd(sel, { kind: 'defend' }) // 防御
        if (key('q', 'Q')) return this.submitAnd(sel, { kind: 'flee' }) // 逃跑
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
          return this.submitRepeat(sel)
        }
        if (key('f', 'F')) {
          this.stickyForce = true // 整轮粘滞(uibattle.c:1252 fForce)
          return this.submitForce(sel)
        }
        if (key('a', 'A')) {
          this.fAuto = true // 持续自动(uibattle.c:1266 fAutoAttack;Esc 取消)
          return this.submitForce(sel)
        }
        // Esc:回退上一个已提交队员重选(uibattle.c:1298;无可回退则无操作)
        if (pressed.has('Escape') && this.submitOrder.length) {
          const prev = this.submitOrder.pop()!
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
            const p2 = s.players[sel]!
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
        const p = s.players[sel]!
        const list = p.skills
        // 3 列网格导航:左右 ±1,上下 ±3(clamp)
        if (pressed.has('ArrowLeft')) this.skillIdx = Math.max(0, this.skillIdx - 1)
        if (pressed.has('ArrowRight')) this.skillIdx = Math.min(list.length - 1, this.skillIdx + 1)
        if (pressed.has('ArrowUp')) this.skillIdx = Math.max(0, this.skillIdx - 3)
        if (pressed.has('ArrowDown')) this.skillIdx = Math.min(list.length - 1, this.skillIdx + 3)
        if (pressed.has('Escape')) this.ui = 'menu'
        if (confirm) {
          const skillId = list[this.skillIdx % list.length]!
          const skill = this.opts.skills?.[skillId]
          if (skill && p.mp >= (skill.cost.mp ?? 0)) {
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
          const it = list[this.itemIdx % list.length]!
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
          // 选好投掷道具 → 进敌方目标选择(throw 打敌单体)
          this.pendingThrowItem = list[this.itemIdx % list.length]!.itemId
          this.ui = 'target'
          this.targetSide = 'enemy'
          this.targetIdx = 0
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
            : { kind: 'cast', skillId: this.pendingSkillId!, targetAllyIdx: t }
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
          const t = alive[this.targetIdx % alive.length]!
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
      // hp/mp 快照 → 走一步 → 物攻建时间线回放;其余动作即时反馈(cast/物品时间线后续刀)
      const pHp = s.players.map((p) => p.hp)
      const pMp = s.players.map((p) => p.mp)
      const eHp = s.enemies.map((e) => e.hp)
      stepBattle(s, this.rng)
      const la = s.lastAction
      s.lastAction = null // 消费即清(回合末空步不重播)
      // 偷窃结果「获得 …」(fight.c:5288 CLASSIC 居中对话框;一阶段 narration 同款):
      // 战斗标签位 (130,75),1.2s 自清(时间线播完后仍在显示,对齐原版动画后弹框时序)
      if (la?.stealBanner)
        this.itemBanner = { text: la.stealBanner, untilMs: this.nowMs + 1200, x: 130, y: 75 }
      // 本步死亡敌(动画收尾统一开淡出 + death 音;一阶段 diedFromAttack 语义)
      this.pendingDeaths = s.enemies
        .map((e, i) => (i < eHp.length && eHp[i]! > 0 && e.hp <= 0 && !s.enemyFled ? i : -1))
        .filter((i) => i >= 0)
      // 本步涨益(回血黄字/回 MP 青字,fight.c:648-708;只显增加 :105-109。演出收尾统一弹
      // = 原版 DisplayStatChange 在特效之后的时序)
      this.pendingGains = []
      s.players.forEach((p, i) => {
        const dh = p.hp - (pHp[i] ?? p.hp)
        if (dh > 0)
          this.pendingGains.push({ target: { side: 'player', idx: i }, value: dh, tone: 'yellow' })
        const dm = p.mp - (pMp[i] ?? p.mp)
        if (dm > 0)
          this.pendingGains.push({ target: { side: 'player', idx: i }, value: dm, tone: 'cyan' })
      })
      s.enemies.forEach((e, i) => {
        const dh = e.hp - (eHp[i] ?? e.hp)
        if (dh > 0)
          this.pendingGains.push({ target: { side: 'enemy', idx: i }, value: dh, tone: 'yellow' })
      })
      const timeline = this.buildStepTimeline(la, pHp, eHp)
      if (timeline) {
        this.anim = new AnimPlayer(timeline, {
          onFighter: (d) => this.applyDelta(d),
          onOverlay: (o) => {
            this.overlays = o
          },
          onSound: (id) => this.assets.sfx?.play(id),
          onDamage: (t, v, tone) => this.applyDamageFx(t, v, tone ?? 'blue'),
          // 战斗消息条(物品名缺省 @210,50;逃跑失败/获得类带 (130,75) 标签位;到期渲染层自清)
          onBanner: (text, durMs, x, y) => {
            this.itemBanner = {
              text,
              untilMs: this.nowMs + durMs,
              ...(x !== undefined ? { x } : {}),
              ...(y !== undefined ? { y } : {}),
            }
          },
          // 震屏帧:累计活跃至帧尾(level 恒 3,fight.c:2718;合成级垂直位移)
          onScreenShake: (durMs) => {
            const until = this.nowMs + durMs
            this.screenShake = { untilMs: Math.max(this.screenShake?.untilMs ?? 0, until), level: 3 }
          },
          // 法术屏波叠加(fight.c:2666;收尾 finishStepVisuals 还原)
          onWaveAdd: (w) => {
            this.frameWaveAdd = w
          },
          // keepEffect 烙背景(末帧一次;屏波门在 burnToBg 内)
          onBurnBg: (marks) => this.burnToBg(marks),
          // 召唤相驱动(in/hold/out;进 out 相先复位队员姿势 —— fight.c:901 UpdateFighters
          // 先于淡出,一阶段 7e49327b 血泪:否则溶回目标是施法帧+高亮残留)
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
        this.anim.tick(0) // 进首帧
        return
      }
      // fallback(非物攻动作):即时飘字 + 敌施法音
      if (la?.side === 'enemy') {
        const snd = s.enemies[la.idx]?.def.sounds
        if (snd && la.kind === 'cast') this.assets.sfx?.play(snd.magic)
      }
      s.players.forEach((p, i) => {
        const d = pHp[i]! - p.hp
        if (d > 0) this.applyDamageFx({ side: 'player', idx: i }, d)
        const v = this.visual.players[i]
        if (v) v.displayHp = p.hp
      })
      s.enemies.forEach((e, i) => {
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
      const d = (eHp[i] ?? e.hp) - e.hp
      if (d > 0) out.push({ target: { side: 'enemy', idx: i }, value: d })
    })
    return out
  }

  /** 施法动作 → 时间线(玩家/敌;fire sprite 由预载表取,设 currentFire)。 */
  private buildCastTimeline(
    la: {
      side: 'player' | 'enemy'
      idx: number
      target?: number
      skillId?: string
      /** 敌施法被动格挡的队员(摆防御姿 frame3)。 */
      autoDefend?: number[]
      /** 合击贡献者 slot(有 = 走合击聚拢演出;非召唤合击才用)。 */
      coopContributors?: number[]
    },
    pHp: number[],
    eHp: number[],
  ): AnimFrame[] | null {
    const s = this.state
    const skill = la.skillId ? this.opts.skills?.[la.skillId] : undefined
    if (!skill) return null
    const a = skill.animation
    const fire = this.assets.fireSprites?.[a.effectSprite]
    this.currentFire = fire ?? null
    // B5 召唤:effects 首个 summon → 神将精灵 + 时间线召唤段
    const summonEff = skill.effects.find((e) => e.kind === 'summon')
    const summonSprite =
      summonEff?.kind === 'summon' ? (this.assets.summonSprites?.[summonEff.godId] ?? null) : null
    this.currentSummon = summonSprite
    const fx: CastFxParams = {
      placement: a.placement ?? 'normal',
      xOffset: a.xOffset ?? 0,
      yOffset: a.yOffset ?? 0,
      speed: a.speed ?? 0,
      fireDelay: a.fireDelay ?? 0,
      effectTimes: a.effectTimes ?? 0,
      shake: a.shake ?? 0,
      wave: a.wave ?? 0,
      sound: a.sound ?? 0,
    }
    const damageNums = this.diffDamageNums(pHp, eHp)
    if (la.side === 'player') {
      const casterPos = getPlayerBasePos(s.players.length, la.idx)
      if (!casterPos) return null
      // normal 落点:敌目标(攻击系)或施法者自身(heal/self)
      const targetPos =
        la.target !== undefined ? (s.enemies[la.target]?.basePos ?? casterPos) : casterPos
      // PostMagic 受击目标:掉血的敌人(fight.c wPrevHP≠wHealth 语义 → damageNums 敌方项)
      const postTargets = damageNums
        .filter((d) => d.target.side === 'enemy')
        .map((d) => ({
          idx: d.target.idx,
          pos: s.enemies[d.target.idx]?.basePos ?? { x: 160, y: 100 },
        }))
      // 召唤背景染色量 = summon 效果自己的 tint(原召唤 magic 的 wEffectTimes SHORT,
      // fight.c:3145;⚠ animation.effectTimes 是二次法术循环数,与染色无关 —— 曾混淆)
      this.summonTintShift =
        summonEff?.kind === 'summon' ? (summonEff.tint ?? 0) : 0
      // 合击(非召唤):走聚拢队形演出(贡献者靠拢→后→前依次施法→放技能)。
      // 召唤类合击照原版直接播召唤动画(落入下方 buildPlayerCast summon 段,不聚拢)。
      if (la.coopContributors && !summonSprite) {
        return buildPlayerCoop({
          casterIdx: la.idx,
          contributorIdxs: la.coopContributors,
          partySize: s.players.length,
          partyPositions: s.players.map((_, i) => getPlayerBasePos(s.players.length, i)),
          fireFrames: fire?.frames.length ?? 0,
          fx,
          targetPos,
          damageNums,
          postTargets,
        })
      }
      return buildPlayerCast({
        casterIdx: la.idx,
        casterPos,
        // 施法吟唱音(rgwMagicSound;挂 PreMagic frame5 姿势帧,一阶段真值)
        ...(this.opts.playerSounds?.[la.idx]?.magic
          ? { magicSound: this.opts.playerSounds[la.idx]!.magic }
          : {}),
        // fSummon 语义(fight.c:2380):召唤跳过施法者自身前摇特效
        castEffectBase:
          !summonSprite && this.assets.effectSprite
            ? (this.opts.playerCastBase?.[la.idx] ?? -1)
            : -1,
        partyIdxs: s.players.map((_, i) => i),
        fireFrames: fire?.frames.length ?? 0,
        fx,
        targetPos,
        damageNums,
        postTargets,
        ...(a.keepEffect ? { keepEffect: true } : {}),
        ...(summonSprite
          ? {
              summon: {
                frames: summonSprite.frames.length,
                // 召唤自身音(变亮首帧;二级段 fSummon 静默)
                ...(summonEff?.kind === 'summon' && summonEff.sound
                  ? { sound: summonEff.sound }
                  : {}),
                // 神将段帧速 = 召唤 magic 自己的 wSpeed(effects.summon.speed);fx.speed 是二次法术的
                frameTimeMs: (((summonEff?.kind === 'summon' ? summonEff.speed : undefined) ?? 0) + 5) * 10,
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
    const targetPos =
      la.target !== undefined ? getPlayerBasePos(s.players.length, la.target) : undefined
    return buildEnemyCast({
      enemyIdx: la.idx,
      anim: { idleFrames: def.anim.idleFrames, magicFrames: def.anim.magicFrames },
      magicSound: def.sounds.magic,
      fireFrames: fire?.frames.length ?? 0,
      fx,
      targetPos: targetPos ?? undefined,
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
    la: {
      side: 'player' | 'enemy'
      idx: number
      kind: string
      target?: number
      skillId?: string
      itemId?: string
      crit?: boolean
      secondDamage?: number
      attackAllHits?: { idx: number; value: number }[]
      blocked?: boolean
      coverIdx?: number
      autoDefend?: number[]
      targetAllyIdx?: number
      fleeSuccess?: boolean
      spawnedIdxs?: number[]
    } | null,
    pHp: number[],
    eHp: number[],
  ): AnimFrame[] | null {
    const s = this.state
    if (!la) return null
    if (la.kind === 'cast') {
      // 偷窃技(飞龙探云手):专用冲刺时间线(一阶段 buildStealTimeline;技能 effectSprite=65535
      // 本就无特效,generic cast 会打空气)—— 冲到敌前 5 步滑步 + 敌闪白
      const sk = la.skillId ? s.skills[la.skillId] : undefined
      if (
        la.side === 'player' &&
        la.target !== undefined &&
        sk?.effects.some((e) => e.kind === 'steal')
      ) {
        const pos = s.enemies[la.target]?.basePos
        if (pos) return buildSteal({ casterIdx: la.idx, targetIdx: la.target, enemyPos: pos })
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
        casterIdx: la.idx,
        casterPos,
        targetIdxs: [la.targetAllyIdx ?? la.idx],
        itemName,
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
          .map((i) => ({ idx: i, pos: getPlayerBasePos(s.players.length, i) ?? { x: 240, y: 170 } }))
        if (!alive.length) return null
        this.skipNextReset = true
        return buildPartyFlee({ players: alive })
      }
      const pos = getPlayerBasePos(s.players.length, la.idx)
      return pos ? buildFleeFail({ idx: la.idx, pos }) : null
    }
    // 敌整场逃离(battle.c:1376 0x69):全体 10ms/x−5 滑出左屏 + 停 500ms;
    // hp 已被 core 清零 → fleeingEnemies 渲染豁免,收尾不复位
    if (la.kind === 'fleeAll' && la.side === 'enemy') {
      const fleeing = s.enemies
        .map((e, i) => ({ e, i }))
        .filter(({ i }) => (eHp[i] ?? 0) > 0)
        .map(({ e, i }) => ({
          idx: i,
          pos: e.basePos,
          width: this.assets.enemySprites[i]?.frames[0]?.width ?? 80,
        }))
      if (!fleeing.length) return null
      this.fleeingEnemies = fleeing.map((f) => f.idx)
      this.skipNextReset = true
      return buildEnemyEscape({ enemies: fleeing })
    }
    // 敌变身现形(script.c:2954 0x9F):colorShift 0→5 染白 + 音 47;def 已换(保 HP),
    // 精灵异步重载(原版 PAL_LoadBattleSprites;同精灵号变身 = 立即命中缓存)
    if (la.kind === 'transform' && la.side === 'enemy') {
      const def = s.enemies[la.idx]?.def
      if (def)
        this.opts.loadEnemySprite?.(def).then((sp) => {
          if (sp) this.assets.enemySprites[la.idx] = sp
        })
      return buildEnemyTransform({ idx: la.idx })
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
          frame: 0,
          colorShift: 0,
          displayHp: s.enemies[si]?.hp ?? 0,
        }
        if (!this.assets.enemySprites[si]) this.assets.enemySprites[si] = this.assets.enemySprites[la.idx]
      }
      return buildEnemyDivide({
        motherPos: mother.basePos,
        spawns: la.spawnedIdxs.map((si) => ({
          idx: si,
          target: s.enemies[si]?.basePos ?? mother.basePos,
        })),
      })
    }
    // 敌召唤(script.c:2871 0x9E):本体 magic 帧起手;新怪精灵播种(同种共用本体精灵,
    // 异种走 loadEnemySprite 重载),现身在收尾 resetVisual(原版 FadeScene 交叉淡的简化)
    if (la.kind === 'summon' && la.side === 'enemy') {
      for (const si of la.spawnedIdxs ?? []) {
        const def = s.enemies[si]?.def
        if (!def) continue
        if (def.spriteNum === s.enemies[la.idx]?.def.spriteNum) {
          if (!this.assets.enemySprites[si]) this.assets.enemySprites[si] = this.assets.enemySprites[la.idx]
        } else {
          this.opts.loadEnemySprite?.(def).then((sp) => {
            if (sp) this.assets.enemySprites[si] = sp
          })
        }
      }
      const anim = s.enemies[la.idx]?.def.anim
      if (!anim || anim.magicFrames <= 0) return null
      const frames: AnimFrame[] = []
      for (let i = 0; i < anim.magicFrames; i++)
        frames.push({
          durationMs: 40 * Math.max(1, anim.actWaitFrames),
          fighters: [{ side: 'enemy', idx: la.idx, frame: anim.idleFrames + i }],
        })
      frames.push({ durationMs: 40, fighters: [{ side: 'enemy', idx: la.idx, frame: 0 }] })
      return frames
    }
    // 投掷道具(frame5 投掷姿 → 目标染色闪 → 复位;数字不显 —— 下毒无即时伤害)
    if (la.kind === 'throw' && la.side === 'player' && la.target !== undefined) {
      const attackerPos = getPlayerBasePos(s.players.length, la.idx)
      if (!attackerPos) return null
      return [
        { durationMs: 120, fighters: [{ side: 'player', idx: la.idx, frame: 5 }] },
        { durationMs: 200, fighters: [{ side: 'enemy', idx: la.target, colorShift: 6 }] },
        {
          durationMs: 160,
          fighters: [
            { side: 'player', idx: la.idx, frame: 0 },
            { side: 'enemy', idx: la.target, colorShift: 0 },
          ],
        },
      ]
    }
    // 疯魔打友(fight.c:3790-3855):瞬移到队友旁挥兵器,数字/击退/红闪全套
    if (la.kind === 'attackMate' && la.side === 'player' && la.target !== undefined) {
      const attackerPos = getPlayerBasePos(s.players.length, la.idx)
      const matePos = getPlayerBasePos(s.players.length, la.target)
      if (!attackerPos || !matePos) return null
      return buildMateAttack({
        attackerIdx: la.idx,
        attackerPos,
        mateIdx: la.target,
        matePos,
        weaponSound: this.opts.playerSounds?.[la.idx]?.weapon ?? 0,
        damage: (pHp[la.target] ?? 0) - (s.players[la.target]?.hp ?? 0),
        mateDied: (s.players[la.target]?.hp ?? 0) <= 0,
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
        .filter((x): x is { idx: number; pos: { x: number; y: number }; value: number } => x !== null)
      if (!hits.length) return null
      const snd = this.opts.playerSounds?.[la.idx]
      return buildPlayerAttackAll({
        attackerIdx: la.idx,
        attackerPos,
        centerPos: hits[Math.floor(hits.length / 2)]!.pos, // 中心敌落点挥击
        hits,
        weaponSound: snd?.weapon ?? 0,
        attackSound: (la.crit ? snd?.critical : snd?.attack) ?? 0,
      })
    }
    if (la.kind !== 'attack' || la.target === undefined) return null
    if (la.side === 'player') {
      const t = la.target
      if ((eHp[t] ?? 0) <= 0) return null // 目标已死 = core 空过,无动画
      const attackerPos = getPlayerBasePos(s.players.length, la.idx)
      const targetPos = s.enemies[t]?.basePos
      if (!attackerPos || !targetPos) return null
      const totalDmg = (eHp[t] ?? 0) - (s.enemies[t]?.hp ?? 0)
      const second = la.secondDamage // 连击第二击(present 追加一挥,音效自然落不同帧)
      const firstDmg = totalDmg - (second ?? 0)
      const snd = this.opts.playerSounds?.[la.idx]
      const attackInput = (damage: number, windup: boolean) => ({
        attackerIdx: la.idx,
        attackerPos,
        targetIdx: t,
        targetPos,
        targetHeight: this.assets.enemySprites[t]?.frames[0]?.height ?? 40,
        effectFrameBase: this.assets.effectSprite
          ? (this.opts.playerEffectBase?.[la.idx] ?? -1)
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
    const t = la.target
    const enemyPos = s.enemies[la.idx]?.basePos
    const targetPos = getPlayerBasePos(s.players.length, t)
    const def = s.enemies[la.idx]?.def
    if (!enemyPos || !targetPos || !def) return null
    return buildEnemyPhysical({
      enemyIdx: la.idx,
      enemyPos,
      targetIdx: t,
      targetPos,
      anim: def.anim,
      sounds: { action: def.sounds.action, call: def.sounds.call },
      // 被动格挡演出(免伤免数字+格挡姿;音 = 目标玩家自己的 coverSound)
      ...(la.blocked ? { blocked: true } : {}),
      ...(la.blocked && this.opts.playerSounds?.[t]?.cover
        ? { coverSound: this.opts.playerSounds[t]!.cover }
        : {}),
      // 替挡(coveredBy):守护者顶身前接刀,音 = **守护者**的 coverSound
      ...(la.blocked && la.coverIdx !== undefined
        ? {
            cover: {
              idx: la.coverIdx,
              ...(this.opts.playerSounds?.[la.coverIdx]?.cover
                ? { sound: this.opts.playerSounds[la.coverIdx]!.cover }
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
      alive.length ? { kind: 'attack', targetEnemyIdx: alive[0]! } : { kind: 'defend' },
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
      if (!sk || !p || p.mp < (sk.cost.mp ?? 0)) act = undefined
    }
    if (act && 'targetEnemyIdx' in act && act.targetEnemyIdx !== undefined) {
      const alive = this.aliveEnemyIdxs()
      if (!alive.includes(act.targetEnemyIdx)) {
        act = alive.length ? { ...act, targetEnemyIdx: alive[0]! } : undefined
      }
    }
    if (!act) return this.submitForce(sel)
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

  /** 本步涨益(回血/回 MP)飘字缓冲(演出收尾统一弹 = 原版特效后时序)。 */
  private pendingGains: Array<{
    target: { side: 'player' | 'enemy'; idx: number }
    value: number
    tone: 'yellow' | 'cyan'
  }> = []

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
      if (e) this.assets.sfx?.play(e.def.sounds.death)
    }
    this.pendingDeaths = []
    this.state.players.forEach((p, i) => {
      const v = this.visual.players[i]
      if (v) v.displayHp = p.hp
    })
  }

  /** dev:战斗日志只读视图(M4c 验证)。 */
  debugLog(): readonly string[] {
    return this.state.log
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
    for (let i = inv.length - 1; i >= 0; i--) if (inv[i]!.count <= 0) inv.splice(i, 1)
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

  private spawnFloat(
    side: 'player' | 'enemy',
    idx: number,
    text: string,
    color: readonly [number, number, number],
  ): void {
    const pos =
      side === 'player'
        ? getPlayerBasePos(this.state.players.length, idx)
        : this.state.enemies[idx]?.basePos
    if (!pos) return
    const sprite =
      side === 'player' ? this.assets.playerSprites[idx] : this.assets.enemySprites[idx]
    const h = sprite?.frames[0]?.height ?? 40
    this.floats.push({ x: pos.x, y: pos.y - h - 6, text, color, bornAt: this.nowMs })
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

  private renderInner(ctx: CanvasRenderingContext2D, worldScale: number): void {
    const s = this.state
    const now = this.nowMs
    // 召唤可见度 summonShow(0 = 队员全显/神全隐 … 1 = 队员全隐/神全显);相内 time-based
    const sv = this.summonVis
    const svT =
      sv === null ? 0 : sv.phase === 'hold' ? 1 : Math.min(1, Math.max(0, (now - sv.start) / (72 * 16)))
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
      const sprite = this.assets.enemySprites[i]
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
      const anim = e.def.anim
      const frame =
        v.frame === 0 && anim && anim.idleFrames > 1 && e.hp > 0
          ? Math.floor(now / (Math.max(1, anim.idleAnimSpeed) * 40)) % anim.idleFrames
          : v.frame
      // 疯魔抖动(battle.c:114-121):敌 X 轴 ±1/帧;眠/定压制不抖(死亡淡出 hp≤0 自然排除)
      const jx =
        e.hp > 0 && e.status.confused > 0 && e.status.sleep <= 0 && e.status.paralyzed <= 0
          ? Math.floor(Math.random() * 3) - 1
          : 0
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
      const sprite = this.assets.playerSprites[i]
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
    const scene: BattleScene = {
      ...(bgSrc ? { bg: this.wavedBg.render(bgSrc, waveAmp, now, 320, 200, bgTag) } : {}),
      enemies,
      players,
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
        renderSpans(
          ctx,
          [{ text: this.itemBanner.text }],
          this.itemBanner.x ?? 210,
          this.itemBanner.y ?? 50,
          {
            glyphs: g,
            shadow: true,
            forceRgba: [255, 255, 255],
          },
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

    // 指令菜单(一阶段原版形态:4 图标 + 杂项盒 + 3 列网格)。选敌态不画(一阶段 DL30);对话期全隐。
    if (!dialogActive && sel !== undefined && ui && this.ui !== 'target' && this.ui !== 'acting') {
      const p = s.players[sel]!
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
        drawBattleMenuBox(ctx, ui, g, rows, this.miscIdx, now, 2, 20, 61, 112, this.ui === 'miscSub')
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
          return { label: sk?.name ?? sid, disabled: !sk || p.mp < mp }
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
        drawItemDetailBox(ctx, ui, ui.itemIcons[selItem?.icon ?? -1])
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
        const nums =
          f.tone === 'yellow' ? ui.nums : f.tone === 'cyan' ? ui.numsCyan : ui.numsBlue
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
