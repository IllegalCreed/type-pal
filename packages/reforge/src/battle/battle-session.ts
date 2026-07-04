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
import type { MenuAssets } from '../menu/menu-box.js'
import { renderSpans } from '../text/text-render.js'
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

const VIEW_W = 320
/** 杂项盒(一阶段 WORD.DAT 56-60):围攻/状态未实现,渲染灰显、确认无响应。 */
const MISC_LABELS = ['围攻', '道具', '防御', '逃跑', '状态'] as const
/** 文字兜底菜单(无 UI 资产时;单测)。 */
const FALLBACK_MENU = ['攻击', '仙术', '物品', '防御', '逃跑'] as const
/** 每个 action 结算间隔(节奏;一帧全算看不清)。 */
const ACT_MS = 480
/** 胜负停留展示时长。 */
const OVER_MS = 1200

interface FloatNum {
  x: number
  y: number
  text: string
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
  // ── M4c-2 演出(choreography):轮起手钩,dialog 逐条横幅播,空格推进 ──
  private choreoQueue: Command[] = []
  private choreoBanner: { name: string; text: string } | null = null
  private choreoName = ''
  private choreoFired = new Map<number, Set<number>>() // 敌槽 → 已播钩子下标
  private choreoTurn = 0 // 已收集过演出的轮次

  constructor(
    players: Omit<BattlePlayerState, 'status' | 'defending'>[],
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
    })
    this.done = new Promise((res) => {
      this.resolveDone = res
    })
    stepBattle(this.state, this.rng) // preBattle → selectAction
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

  /** 逐条消费演出命令(dialog 横幅等按键;音效记 log;fleeBattle 终止战斗)。 */
  private pumpChoreo(pressed: ReadonlySet<string>): void {
    if (this.choreoBanner) {
      if (pressed.has(' ') || pressed.has('Enter')) this.choreoBanner = null
      return
    }
    const c = this.choreoQueue.shift()
    if (!c) return
    switch (c.kind) {
      case 'dialog':
        this.choreoBanner = {
          name: this.choreoName,
          text: lookupText(c.line.text, this.opts.locale ?? {}),
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

  tick(dtMs: number, pressed: ReadonlySet<string>): void {
    this.nowMs += dtMs
    this.floats = this.floats.filter((f) => this.nowMs - f.bornAt < 900)
    const s = this.state

    if (s.phase === 'won' || s.phase === 'lost' || s.phase === 'fled') {
      this.ui = 'over'
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
      if (this.choreoBanner || this.choreoQueue.length) {
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
      this.actTimer += dtMs
      if (this.actTimer < ACT_MS) return
      this.actTimer = 0
      // hp 快照 → 走一步 → diff 飘字 + 音效
      const pHp = s.players.map((p) => p.hp)
      const eHp = s.enemies.map((e) => e.hp)
      stepBattle(s, this.rng)
      // 行动音(M4d-3 过渡:结算瞬间播;M4d-2 动画落地后挂到动画帧上,一阶段真值时机
      //   = 敌接近播 actionSound / 命中播 callSound,fight.c:5005/5084)
      const la = s.lastAction
      s.lastAction = null // 消费即清(回合末空步不重播上一动作音)
      if (la?.side === 'enemy') {
        const snd = s.enemies[la.idx]?.def.sounds
        if (snd) {
          if (la.kind === 'attack') this.assets.sfx?.play(snd.attack)
          else if (la.kind === 'cast') this.assets.sfx?.play(snd.magic)
        }
      }
      s.players.forEach((p, i) => {
        const d = pHp[i]! - p.hp
        if (d > 0) this.spawnFloat('player', i, `-${d}`, [255, 80, 80])
      })
      s.enemies.forEach((e, i) => {
        const d = eHp[i]! - e.hp
        if (d > 0) this.spawnFloat('enemy', i, `-${d}`, [255, 255, 255])
        // 死亡音(一阶段 battle-system:diedFromAttack 播 deathSound)
        if (eHp[i]! > 0 && e.hp <= 0 && !s.enemyFled) this.assets.sfx?.play(e.def.sounds.death)
      })
    }
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
    const s = this.state
    const now = this.nowMs
    const sel = s.phase === 'selectAction' ? this.nextSelecting() : undefined
    // 选敌高亮目标(target 态,闪烁节拍)
    const alive = this.aliveEnemyIdxs()
    const highlightEnemy =
      sel !== undefined && this.ui === 'target' && alive.length && Math.floor(now / 160) % 2 === 0
        ? alive[this.targetIdx % alive.length]
        : undefined
    // 场景(死亡不画;M4b-3 换死亡淡出)
    const enemies: BattleSpriteDraw[] = []
    s.enemies.forEach((e, i) => {
      const sprite = this.assets.enemySprites[i]
      const pos = getEnemyBasePos(s.enemies.length, i, this.enemyDefs[i]?.anim.yPosOffset ?? 0)
      if (e.hp > 0 && sprite && pos)
        enemies.push({ sprite, x: pos.x, y: pos.y, frame: 0, highlight: i === highlightEnemy })
    })
    const players: BattleSpriteDraw[] = []
    s.players.forEach((_p, i) => {
      const sprite = this.assets.playerSprites[i]
      const pos = getPlayerBasePos(s.players.length, i)
      if (sprite && pos) players.push({ sprite, x: pos.x, y: pos.y, frame: 0 })
    })
    const scene: BattleScene = {
      bg: this.assets.bg,
      enemies,
      players,
      palette: this.assets.palette,
    }
    renderBattleScene(ctx, scene, worldScale)

    // UI 层(320 逻辑坐标 ×scale)
    ctx.save()
    ctx.scale(worldScale, worldScale)
    ctx.imageSmoothingEnabled = false
    const g = this.assets.glyphs
    const ui = this.assets.ui

    // 底部队员信息框(playerbox+头像+黄青数字;无 UI 资产 → 文字兜底)
    s.players.forEach((p, i) => {
      if (ui?.magicPlayerBox) {
        drawPlayerInfoBox(ctx, ui, this.assets.faces?.[p.roleId], p, i)
      } else {
        const x = 8 + i * 106
        const hpColor: readonly [number, number, number] =
          p.hp <= 0 ? [224, 91, 91] : p.hp < p.maxHp / 5 ? [226, 179, 64] : [215, 220, 229]
        renderSpans(ctx, [{ text: this.nameOf(p.roleId) }], x, 170, { glyphs: g, shadow: true })
        renderSpans(ctx, [{ text: `${p.hp}/${p.maxHp}` }], x, 184, {
          glyphs: g,
          shadow: true,
          forceRgba: hpColor,
        })
      }
    })

    // 当前行动队员头顶手指(选指令/选目标期间;一阶段 68/69 闪)
    if (sel !== undefined && ui) {
      const pos = getPlayerBasePos(s.players.length, sel)
      const spriteH = this.assets.playerSprites[sel]?.frames[0]?.height ?? 60
      if (pos) drawCurrentFinger(ctx, ui, pos.x, pos.y - spriteH, now)
    }

    // M4c-2 演出横幅(顶部;空格推进)—— 半透明底条 + 名字/文本
    if (this.choreoBanner) {
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(0, 0, VIEW_W, 46)
      ctx.restore()
      renderSpans(ctx, [{ text: `${this.choreoBanner.name}:` }], 10, 6, {
        glyphs: g,
        shadow: true,
        forceRgba: [226, 179, 64],
      })
      renderSpans(ctx, [{ text: this.choreoBanner.text }], 10, 24, { glyphs: g, shadow: true })
      renderSpans(ctx, [{ text: '▼' }], VIEW_W - 16, 24, {
        glyphs: g,
        shadow: true,
        forceRgba: [226, 179, 64],
      })
    }

    // 指令菜单(一阶段原版形态:4 图标 + 杂项盒 + 3 列网格)。选敌态不画(一阶段 DL30)。
    if (sel !== undefined && ui && this.ui !== 'target' && this.ui !== 'acting') {
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

    // 伤害飘字(升起 + 淡出交给时长;先升 12px)
    for (const f of this.floats) {
      const t = (this.nowMs - f.bornAt) / 900
      renderSpans(ctx, [{ text: f.text }], f.x, f.y - t * 12, {
        glyphs: g,
        shadow: true,
        forceRgba: f.color,
      })
    }

    // 胜负字
    if (this.ui === 'over') {
      const msg = s.phase === 'won' ? '战斗胜利!' : s.phase === 'lost' ? '全军覆没…' : '逃跑成功'
      renderSpans(ctx, [{ text: msg }], VIEW_W / 2 - msg.length * 8, 92, {
        glyphs: g,
        shadow: true,
        forceRgba: [255, 255, 255],
      })
    }
    ctx.restore()
  }
}
