/**
 * BattleSession(M4b-2)—— 封装一场可玩战斗:battle-core 状态机 + 指令菜单 UI +
 * 节奏化结算(逐 action 播 + 伤害飘字)+ 胜负收尾。
 *
 * main.ts 的 host.startBattle 创建它,主循环转发 tick/render,await done 拿结果续脚本。
 * M4b-2 指令集:攻击/防御/逃跑(仙术/物品 = M4b-3 与动画一起);渲染 = 静态帧 + 飘字。
 */
import type { Command, EnemyDef, SkillData } from '@type-pal/content'
import { evalAiCond, lookupText } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import type { GlyphTable, LoadedSprite } from '../assets.js'
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
  buildEnemyPhysical,
  buildPlayerAttack,
  buildPlayerCast,
  type CastFxParams,
  type OverlayDraw,
} from './battle-anim.js'
import {
  type BattleAction,
  type BattlePlayerState,
  type BattleState,
  buildAiView,
  createBattleState,
  stepBattle,
} from './battle-core.js'
import { getEnemyBasePos, getPlayerBasePos } from './battle-positions.js'
import {
  type BattleMenuRow,
  drawBattleGrid,
  drawBattleMenuBox,
  drawCurrentFinger,
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

type UiPhase = 'menu' | 'misc' | 'miscSub' | 'skill' | 'item' | 'target' | 'acting' | 'over'

export interface BattleSessionAssets {
  bg?: CanvasImageSource
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
  private targetIdx = 0
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
  // ── M4c-2 演出(choreography):轮起手钩,dialog 逐条横幅播,空格推进 ──
  private choreoQueue: Command[] = []
  private choreoBanner: { name: string; text: string } | null = null
  private choreoName = ''
  private choreoFired = new Map<number, Set<number>>() // 敌槽 → 已播钩子下标
  private choreoTurn = 0 // 已收集过演出的轮次
  // ── B7b 胜利结算屏(经验金钱 → 升级 → 练成;逐屏空格推进)──
  private settlement: SettlementScreen[] | null = null // null = 未构建;[] = 无屏
  private settleIdx = 0

  constructor(
    players: Omit<BattlePlayerState, 'status' | 'defending' | 'hiddenCounts'>[],
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
    })
    this.done = new Promise((res) => {
      this.resolveDone = res
    })
    stepBattle(this.state, this.rng) // preBattle → selectAction
    this.resetVisual()
  }

  /** 表现层复位:全员回站位/站立帧/无染色(一阶段 resetFightersAfterAction 语义;死亡帧除外)。 */
  private resetVisual(): void {
    const s = this.state
    this.visual.players = s.players.map((p, i) => {
      const pos = getPlayerBasePos(s.players.length, i) ?? { x: 0, y: 0 }
      const prev = this.visual.players[i]
      // 复位姿势 = playerRestFrame 语义(一阶段 battle-anim-driver.ts:220-234,一夜三刀簇):
      // 死→傀儡0/死2;睡/濒死(hp<min(100,maxHP/5))→1;防御→3;否则站 0。曾一律 frame0
      // = 丢死/濒死/防御姿(演出审计 §2-8)。
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
    this.visual.enemies = s.enemies.map((e, i) => {
      const pos = getEnemyBasePos(s.enemies.length, i, this.enemyDefs[i]?.anim.yPosOffset ?? 0) ?? {
        x: 0,
        y: 0,
      }
      const prev = this.visual.enemies[i]
      return { x: pos.x, y: pos.y, frame: 0, colorShift: 0, displayHp: prev?.displayHp ?? e.hp }
    })
    this.overlays = null
    this.currentFire = null
  }

  /** 当前待选指令的活队员下标;全填 → undefined。 */
  private nextSelecting(): number | undefined {
    const s = this.state
    for (let i = 0; i < s.players.length; i++) {
      if (s.players[i]!.hp > 0 && !s.pendingActions.has(i)) return i
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

  /** 主菜单 4 项可用性(0攻击/3杂项恒可;1法术=有技能且未封;2合击未实现)。 */
  private mainActionValid(sel: number): [boolean, boolean, boolean, boolean] {
    const p = this.state.players[sel]
    const magicOk = !!p && p.skills.length > 0 && (p.status?.silence ?? 0) === 0
    return [true, magicOk, false, true]
  }

  /** 提交指令后回主菜单(一阶段 commit 后 selectedAction 重置)。 */
  private backToMain(): void {
    this.ui = 'menu'
    this.menuIdx = 0
  }

  /** 收集当轮该播的演出钩(once/when 求值;文本 locale 化 + 说话人 = 敌名)。 */
  private collectChoreo(): void {
    const s = this.state
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

  /** 敌逃离(无奖励语义;main 决定是否跑 onDefeated/给奖励)。 */
  enemyFled(): boolean {
    return this.state.enemyFled
  }

  /** 战果(B7a;敌死累计,main 战后入账)。 */
  rewards(): { exp: number; cash: number } {
    return { exp: this.state.expGained, cash: this.state.cashGained }
  }

  /** B7c 隐藏经验行为计数(roleId → 池计数;main 传 grantBattleRewards 分配)。 */
  hiddenCounts(): Record<string, Partial<Record<string, number>>> {
    const out: Record<string, Partial<Record<string, number>>> = {}
    for (const p of this.state.players) out[p.roleId] = p.hiddenCounts
    return out
  }

  tick(dtMs: number, pressed: ReadonlySet<string>): void {
    this.nowMs += dtMs
    this.floats = this.floats.filter((f) => this.nowMs - f.bornAt < 900)
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
      if (this.ui === 'acting') this.ui = 'menu' // 新回合回菜单
      const confirm = pressed.has(' ') || pressed.has('Enter')
      if (this.ui === 'menu') {
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
            this.pendingSkillId = null
            this.targetIdx = 0
          } else if (this.menuIdx === 1) {
            this.ui = 'skill'
            this.skillIdx = 0
          } else if (this.menuIdx === 3) {
            this.ui = 'misc'
            this.miscIdx = 0
          } // 2 合击:valid 恒 false,到不了
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
            s.pendingActions.set(sel, { kind: 'defend' })
            this.backToMain()
          } else if (this.miscIdx === 3) {
            s.pendingActions.set(sel, { kind: 'flee' })
            this.backToMain()
          } // 0 围攻 / 4 状态:未实现,无响应(灰显)
        }
      } else if (this.ui === 'miscSub') {
        // 物品二级(一阶段):使用/投掷;Up|Left→使用 Down|Right→投掷;投掷未实现(灰)
        if (pressed.has('ArrowUp') || pressed.has('ArrowLeft')) this.miscSubIdx = 0
        if (pressed.has('ArrowDown') || pressed.has('ArrowRight')) this.miscSubIdx = 1
        if (pressed.has('Escape')) this.ui = 'misc'
        if (confirm && this.miscSubIdx === 0) {
          this.ui = 'item'
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
              this.targetIdx = 0
            } else {
              s.pendingActions.set(sel, { kind: 'cast', skillId })
              this.backToMain()
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
          s.pendingActions.set(sel, { kind: 'item', itemId: it.itemId })
          this.backToMain()
        }
      } else if (this.ui === 'target') {
        const alive = this.aliveEnemyIdxs()
        if (alive.length === 0) return
        if (pressed.has('ArrowLeft'))
          this.targetIdx = (this.targetIdx + alive.length - 1) % alive.length
        if (pressed.has('ArrowRight')) this.targetIdx = (this.targetIdx + 1) % alive.length
        if (pressed.has('Escape')) this.ui = 'menu'
        if (confirm) {
          const t = alive[this.targetIdx % alive.length]!
          const action: BattleAction = this.pendingSkillId
            ? { kind: 'cast', skillId: this.pendingSkillId, targetEnemyIdx: t }
            : { kind: 'attack', targetEnemyIdx: t }
          this.pendingSkillId = null
          s.pendingActions.set(sel, action)
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
          onDamage: (t, v) => this.applyDamageFx(t, v),
          // 震屏帧:累计活跃至帧尾(level 恒 3,fight.c:2718;合成级垂直位移)
          onScreenShake: (durMs) => {
            const until = this.nowMs + durMs
            this.screenShake = { untilMs: Math.max(this.screenShake?.untilMs ?? 0, until), level: 3 }
          },
          // 法术屏波叠加(fight.c:2666;收尾 finishStepVisuals 还原)
          onWaveAdd: (w) => {
            this.frameWaveAdd = w
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
    la: { side: 'player' | 'enemy'; idx: number; target?: number; skillId?: string },
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
        la.target !== undefined
          ? (getEnemyBasePos(
              s.enemies.length,
              la.target,
              this.enemyDefs[la.target]?.anim.yPosOffset ?? 0,
            ) ?? casterPos)
          : casterPos
      // PostMagic 受击目标:掉血的敌人(fight.c wPrevHP≠wHealth 语义 → damageNums 敌方项)
      const postTargets = damageNums
        .filter((d) => d.target.side === 'enemy')
        .map((d) => ({
          idx: d.target.idx,
          pos:
            getEnemyBasePos(
              s.enemies.length,
              d.target.idx,
              this.enemyDefs[d.target.idx]?.anim.yPosOffset ?? 0,
            ) ?? { x: 160, y: 100 },
        }))
      return buildPlayerCast({
        casterIdx: la.idx,
        casterPos,
        // 施法吟唱音(rgwMagicSound;挂 PreMagic frame5 姿势帧,一阶段真值)
        ...(this.opts.playerSounds?.[la.idx]?.magic
          ? { magicSound: this.opts.playerSounds[la.idx]!.magic }
          : {}),
        castEffectBase: this.assets.effectSprite ? (this.opts.playerCastBase?.[la.idx] ?? -1) : -1,
        fireFrames: fire?.frames.length ?? 0,
        fx,
        targetPos,
        damageNums,
        postTargets,
        ...(summonSprite
          ? {
              summon: {
                frames: summonSprite.frames.length,
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
    } | null,
    pHp: number[],
    eHp: number[],
  ): AnimFrame[] | null {
    const s = this.state
    if (!la) return null
    if (la.kind === 'cast') return this.buildCastTimeline(la, pHp, eHp)
    if (la.kind !== 'attack' || la.target === undefined) return null
    if (la.side === 'player') {
      const t = la.target
      if ((eHp[t] ?? 0) <= 0) return null // 目标已死 = core 空过,无动画
      const attackerPos = getPlayerBasePos(s.players.length, la.idx)
      const targetPos = getEnemyBasePos(
        s.enemies.length,
        t,
        this.enemyDefs[t]?.anim.yPosOffset ?? 0,
      )
      if (!attackerPos || !targetPos) return null
      return buildPlayerAttack({
        attackerIdx: la.idx,
        attackerPos,
        targetIdx: t,
        targetPos,
        targetHeight: this.assets.enemySprites[t]?.frames[0]?.height ?? 40,
        effectFrameBase: this.assets.effectSprite
          ? (this.opts.playerEffectBase?.[la.idx] ?? -1)
          : -1,
        damage: (eHp[t] ?? 0) - (s.enemies[t]?.hp ?? 0),
        windup: true,
        // 出招/兵器音(rgwAttackSound/rgwWeaponSound;暴击音 critical 等暴击落地)
        ...(this.opts.playerSounds?.[la.idx]
          ? {
              sounds: {
                attack: this.opts.playerSounds[la.idx]!.attack,
                weapon: this.opts.playerSounds[la.idx]!.weapon,
              },
            }
          : {}),
      })
    }
    // 敌物攻
    const t = la.target
    const enemyPos = getEnemyBasePos(
      s.enemies.length,
      la.idx,
      this.enemyDefs[la.idx]?.anim.yPosOffset ?? 0,
    )
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
      damage: (pHp[t] ?? 0) - (s.players[t]?.hp ?? 0),
      targetDied: (s.players[t]?.hp ?? 0) <= 0,
    })
  }

  /** 时间线 delta → 表现层。 */
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
    const sprite =
      t.side === 'player' ? this.assets.playerSprites[t.idx] : this.assets.enemySprites[t.idx]
    const h = sprite?.frames[0]?.height ?? 40
    this.floats.push({
      x: v.x,
      y: v.y - h - 6,
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
    this.resetVisual()
    // per-action 瞬态复位(审计红线 #7;fight.c:2835 wave 还原语义)
    this.frameWaveAdd = 0
    this.screenShake = null
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
        : getEnemyBasePos(this.state.enemies.length, idx, this.enemyDefs[idx]?.anim.yPosOffset ?? 0)
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
    const sel = s.phase === 'selectAction' ? this.nextSelecting() : undefined
    // 选敌高亮目标(target 态,闪烁节拍)
    const alive = this.aliveEnemyIdxs()
    const highlightEnemy =
      sel !== undefined && this.ui === 'target' && alive.length && Math.floor(now / 160) % 2 === 0
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
      const dyingNow = this.pendingDeaths.includes(i)
      let dissolve: number | undefined
      if (e.hp <= 0 && !dyingNow) {
        if (fade === undefined) return // 早死无淡出登记(逃跑清场等)= 不画
        // 颗粒溶解进度(原版 dither 形态;曾 alpha 渐隐,作者报观感怪)
        dissolve = (now - fade) / DEATH_FADE_MS
        if (dissolve >= 1) {
          this.deathFades.delete(i)
          return
        }
      }
      // idle 呼吸帧:visual.frame===0(站立默认)时循环 idleFrames;时间线设过的特殊帧原样
      const anim = this.enemyDefs[i]?.anim
      const frame =
        v.frame === 0 && anim && anim.idleFrames > 1 && e.hp > 0
          ? Math.floor(now / (Math.max(1, anim.idleAnimSpeed) * 40)) % anim.idleFrames
          : v.frame
      enemies.push({
        sprite,
        x: v.x,
        y: v.y,
        frame,
        highlight: i === highlightEnemy || v.colorShift > 0,
        ...(dissolve !== undefined ? { dissolve } : {}),
      })
    })
    const players: BattleSpriteDraw[] = []
    s.players.forEach((_p, i) => {
      const sprite = this.assets.playerSprites[i]
      const v = this.visual.players[i]
      if (sprite && v)
        players.push({ sprite, x: v.x, y: v.y, frame: v.frame, highlight: v.colorShift > 0 })
    })
    // 屏波:战场常驻 + 法术叠加(fight.c:2666);只卷背景层,精灵画在卷完的背景上自身笔直
    // (层序铁律,一阶段 2deb52bd:放精灵后 = boss 边缘撕裂)。缓存仅相位变化时重卷。
    const waveAmp = (this.opts.fieldWave ?? 0) + this.frameWaveAdd
    const scene: BattleScene = {
      ...(this.assets.bg ? { bg: this.wavedBg.render(this.assets.bg, waveAmp, now) } : {}),
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
        if (f)
          ctx.drawImage(
            bakeFrame(f, this.assets.palette),
            o.x - Math.floor(f.width / 2),
            o.y - f.height,
          )
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
          drawPlayerInfoBox(ctx, ui, this.assets.faces?.[p.roleId], { ...p, hp: shownHp }, i)
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

    // 当前行动队员头顶手指(选指令/选目标期间;一阶段 68/69 闪)
    if (!dialogActive && sel !== undefined && ui) {
      const pos = getPlayerBasePos(s.players.length, sel)
      const spriteH = this.assets.playerSprites[sel]?.frames[0]?.height ?? 60
      if (pos) drawCurrentFinger(ctx, ui, pos.x, pos.y - spriteH, now)
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
        drawMainIcons(ctx, this.assets.battleIcons, this.menuIdx, this.mainActionValid(sel), true)
      }
      if (this.ui === 'misc' || this.ui === 'miscSub') {
        // 杂项盒 box(2,20);进二级后父项(道具)固定金黄
        const rows: BattleMenuRow[] = MISC_LABELS.map((label, i) => ({
          label,
          disabled: i === 0 || i === 4 || (i === 1 && this.usableItems().length === 0),
        }))
        drawBattleMenuBox(ctx, ui, g, rows, this.miscIdx, now, 2, 20, this.ui === 'miscSub')
        if (this.ui === 'miscSub') {
          // 使用/投掷二级 box(30,50);投掷未实现灰显
          const sub: BattleMenuRow[] = [{ label: '使用' }, { label: '投掷', disabled: true }]
          drawBattleMenuBox(ctx, ui, g, sub, this.miscSubIdx, now, 30, 50)
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
      } else if (this.ui === 'item') {
        // 物品网格(红框 3 列,数量 cyan)+ 左下选中物详情框
        const list = this.usableItems()
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
      const fy = f.y - t * 12
      if (f.num !== undefined && ui) {
        const nums =
          f.tone === 'yellow' ? ui.nums : f.tone === 'cyan' ? ui.numsCyan : ui.numsBlue
        drawNumber(ctx, f.num, f.x + 12, fy, nums)
      } else {
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
