/**
 * BattleSession(M4b-2)—— 封装一场可玩战斗:battle-core 状态机 + 指令菜单 UI +
 * 节奏化结算(逐 action 播 + 伤害飘字)+ 胜负收尾。
 *
 * main.ts 的 host.startBattle 创建它,主循环转发 tick/render,await done 拿结果续脚本。
 * M4b-2 指令集:攻击/防御/逃跑(仙术/物品 = M4b-3 与动画一起);渲染 = 静态帧 + 飘字。
 */
import type { EnemyDef, SkillData } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import type { GlyphTable, LoadedSprite } from '../assets.js'
import { renderSpans } from '../text/text-render.js'
import {
  type BattleAction,
  type BattlePlayerState,
  type BattleState,
  createBattleState,
  stepBattle,
} from './battle-core.js'
import { getEnemyBasePos, getPlayerBasePos } from './battle-positions.js'
import { type BattleScene, type BattleSpriteDraw, renderBattleScene } from './present-battle.js'

const VIEW_W = 320
const MENU_ITEMS = ['攻击', '防御', '逃跑'] as const
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

type UiPhase = 'menu' | 'target' | 'acting' | 'over'

export interface BattleSessionAssets {
  bg?: CanvasImageSource
  palette: Palette
  glyphs: GlyphTable
  /** 敌人战斗精灵(与 enemies 数组同序)。 */
  enemySprites: (LoadedSprite | undefined)[]
  /** 队员战斗精灵(与 players 同序)。 */
  playerSprites: (LoadedSprite | undefined)[]
}

export class BattleSession {
  readonly done: Promise<'win' | 'lose' | 'flee'>
  private resolveDone!: (r: 'win' | 'lose' | 'flee') => void
  private readonly state: BattleState
  private ui: UiPhase = 'menu'
  private menuIdx = 0
  private targetIdx = 0
  /** 正在选指令的队员下标(pendingActions 未填的第一个活队员)。 */
  private actTimer = 0
  private overTimer = 0
  private floats: FloatNum[] = []
  private nowMs = 0

  constructor(
    players: Omit<BattlePlayerState, 'status' | 'defending'>[],
    private readonly enemyDefs: EnemyDef[],
    private readonly assets: BattleSessionAssets,
    private readonly nameOf: (roleId: string) => string,
    private readonly rng: () => number = Math.random,
    /** M4c:技能表(敌施法查 SkillData)+ 难度预设 id。 */
    opts: { skills?: Record<string, SkillData>; difficulty?: string } = {},
  ) {
    this.state = createBattleState({ players, enemies: enemyDefs, skills: opts.skills, difficulty: opts.difficulty })
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
      const sel = this.nextSelecting()
      if (sel === undefined) {
        stepBattle(s, this.rng) // 全填 → build queue → performAction
        this.ui = 'acting'
        this.actTimer = 0
        return
      }
      if (this.ui === 'acting') this.ui = 'menu' // 新回合回菜单
      if (this.ui === 'menu') {
        if (pressed.has('ArrowUp')) this.menuIdx = (this.menuIdx + MENU_ITEMS.length - 1) % MENU_ITEMS.length
        if (pressed.has('ArrowDown')) this.menuIdx = (this.menuIdx + 1) % MENU_ITEMS.length
        if (pressed.has(' ') || pressed.has('Enter')) {
          const item = MENU_ITEMS[this.menuIdx]
          if (item === '攻击') {
            this.ui = 'target'
            this.targetIdx = 0
          } else if (item === '防御') {
            s.pendingActions.set(sel, { kind: 'defend' })
          } else {
            s.pendingActions.set(sel, { kind: 'flee' })
          }
        }
      } else if (this.ui === 'target') {
        const alive = this.aliveEnemyIdxs()
        if (alive.length === 0) return
        if (pressed.has('ArrowLeft')) this.targetIdx = (this.targetIdx + alive.length - 1) % alive.length
        if (pressed.has('ArrowRight')) this.targetIdx = (this.targetIdx + 1) % alive.length
        if (pressed.has('Escape')) this.ui = 'menu'
        if (pressed.has(' ') || pressed.has('Enter')) {
          const action: BattleAction = { kind: 'attack', targetEnemyIdx: alive[this.targetIdx % alive.length]! }
          s.pendingActions.set(sel, action)
          this.ui = 'menu'
          this.menuIdx = 0
        }
      }
      return
    }

    if (s.phase === 'performAction') {
      this.ui = 'acting'
      this.actTimer += dtMs
      if (this.actTimer < ACT_MS) return
      this.actTimer = 0
      // hp 快照 → 走一步 → diff 飘字
      const pHp = s.players.map((p) => p.hp)
      const eHp = s.enemies.map((e) => e.hp)
      stepBattle(s, this.rng)
      s.players.forEach((p, i) => {
        const d = pHp[i]! - p.hp
        if (d > 0) this.spawnFloat('player', i, `-${d}`, [255, 80, 80])
      })
      s.enemies.forEach((e, i) => {
        const d = eHp[i]! - e.hp
        if (d > 0) this.spawnFloat('enemy', i, `-${d}`, [255, 255, 255])
      })
    }
  }

  /** dev:战斗日志只读视图(M4c 验证)。 */
  debugLog(): readonly string[] {
    return this.state.log
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

  private spawnFloat(side: 'player' | 'enemy', idx: number, text: string, color: readonly [number, number, number]): void {
    const pos =
      side === 'player'
        ? getPlayerBasePos(this.state.players.length, idx)
        : getEnemyBasePos(this.state.enemies.length, idx, this.enemyDefs[idx]?.anim.yPosOffset ?? 0)
    if (!pos) return
    const sprite = side === 'player' ? this.assets.playerSprites[idx] : this.assets.enemySprites[idx]
    const h = sprite?.frames[0]?.height ?? 40
    this.floats.push({ x: pos.x, y: pos.y - h - 6, text, color, bornAt: this.nowMs })
  }

  render(ctx: CanvasRenderingContext2D, worldScale: number): void {
    const s = this.state
    // 场景(死亡不画;M4b-3 换死亡淡出)
    const enemies: BattleSpriteDraw[] = []
    s.enemies.forEach((e, i) => {
      const sprite = this.assets.enemySprites[i]
      const pos = getEnemyBasePos(s.enemies.length, i, this.enemyDefs[i]?.anim.yPosOffset ?? 0)
      if (e.hp > 0 && sprite && pos) enemies.push({ sprite, x: pos.x, y: pos.y, frame: 0 })
    })
    const players: BattleSpriteDraw[] = []
    s.players.forEach((p, i) => {
      const sprite = this.assets.playerSprites[i]
      const pos = getPlayerBasePos(s.players.length, i)
      if (sprite && pos) players.push({ sprite, x: pos.x, y: pos.y, frame: 0 })
    })
    const scene: BattleScene = { bg: this.assets.bg, enemies, players, palette: this.assets.palette }
    renderBattleScene(ctx, scene, worldScale)

    // UI 层(320 逻辑坐标 ×scale)
    ctx.save()
    ctx.scale(worldScale, worldScale)
    ctx.imageSmoothingEnabled = false
    const g = this.assets.glyphs

    // 底部队员 HP/MP 条
    s.players.forEach((p, i) => {
      const x = 8 + i * 106
      const hpColor: readonly [number, number, number] = p.hp <= 0 ? [224, 91, 91] : p.hp < p.maxHp / 5 ? [226, 179, 64] : [215, 220, 229]
      renderSpans(ctx, [{ text: this.nameOf(p.roleId) }], x, 170, { glyphs: g, shadow: true })
      renderSpans(ctx, [{ text: `${p.hp}/${p.maxHp}` }], x, 184, { glyphs: g, shadow: true, forceRgba: hpColor })
    })

    // 指令菜单(左上;为 nextSelecting 队员选)
    const sel = s.phase === 'selectAction' ? this.nextSelecting() : undefined
    if (sel !== undefined && this.ui === 'menu') {
      renderSpans(ctx, [{ text: `▼ ${this.nameOf(s.players[sel]!.roleId)}` }], 10, 8, { glyphs: g, shadow: true, forceRgba: [156, 196, 255] })
      MENU_ITEMS.forEach((item, i) => {
        const selMark = i === this.menuIdx ? '▶ ' : '   '
        renderSpans(ctx, [{ text: `${selMark}${item}` }], 10, 26 + i * 17, {
          glyphs: g,
          shadow: true,
          forceRgba: i === this.menuIdx ? [255, 255, 255] : [139, 147, 163],
        })
      })
    }
    // 目标箭头(选敌)
    if (sel !== undefined && this.ui === 'target') {
      renderSpans(ctx, [{ text: '选目标:← → 切换,空格确认' }], 10, 8, { glyphs: g, shadow: true, forceRgba: [156, 196, 255] })
      const alive = this.aliveEnemyIdxs()
      const t = alive[this.targetIdx % alive.length]
      if (t !== undefined) {
        const pos = getEnemyBasePos(s.enemies.length, t, this.enemyDefs[t]?.anim.yPosOffset ?? 0)
        const sprite = this.assets.enemySprites[t]
        const h = sprite?.frames[0]?.height ?? 40
        if (pos) renderSpans(ctx, [{ text: '▼' }], pos.x - 4, pos.y - h - 14, { glyphs: g, shadow: true, forceRgba: [226, 179, 64] })
      }
    }

    // 伤害飘字(升起 + 淡出交给时长;先升 12px)
    for (const f of this.floats) {
      const t = (this.nowMs - f.bornAt) / 900
      renderSpans(ctx, [{ text: f.text }], f.x, f.y - t * 12, { glyphs: g, shadow: true, forceRgba: f.color })
    }

    // 胜负字
    if (this.ui === 'over') {
      const msg = s.phase === 'won' ? '战斗胜利!' : s.phase === 'lost' ? '全军覆没…' : '逃跑成功'
      renderSpans(ctx, [{ text: msg }], VIEW_W / 2 - msg.length * 8, 92, { glyphs: g, shadow: true, forceRgba: [255, 255, 255] })
    }
    ctx.restore()
  }
}
