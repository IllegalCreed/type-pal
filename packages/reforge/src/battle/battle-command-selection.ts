import type { ItemData, SkillData } from '@type-pal/content'
import type { BattleAction } from './battle-core.js'

export type BattleCommandSelectionPhase =
  | 'menu'
  | 'misc'
  | 'miscSub'
  | 'skill'
  | 'item'
  | 'throwItem'
  | 'target'

export interface BattleSelectableItem {
  itemId: string
  count: number
}

export interface BattleCommandPlayerView {
  skills: readonly string[]
  mp: number
  silenced: boolean
  cooperativeMagicSkillId?: string
  healthy: boolean
}

export interface BattleCommandSelectionContext {
  playerIndex: number
  player: BattleCommandPlayerView
  playerCount: number
  healthyPlayerCount: number
  aliveEnemyIndices: readonly number[]
  usableItems: readonly BattleSelectableItem[]
  throwableItems: readonly BattleSelectableItem[]
  skills: Readonly<Record<string, SkillData>>
  items: Readonly<Record<string, ItemData>>
  money: number
}

export interface BattleCommandSelectionPort {
  submit(playerIndex: number, action: BattleAction): void
  retract(playerIndex: number): void
  consumeOthersForCoop(casterIndex: number): void
}

export interface BattleCommandSelectionView {
  phase: BattleCommandSelectionPhase
  menuIndex: number
  miscIndex: number
  miscSubIndex: number
  skillIndex: number
  itemIndex: number
  targetIndex: number
  targetSide: 'enemy' | 'ally'
}

/** 战斗命令菜单、目标选择与 F/R/A 快捷键临时态的唯一 owner。 */
export class BattleCommandSelection {
  private currentPhase: BattleCommandSelectionPhase = 'menu'
  private menuIndex = 0
  private miscIndex = 0
  private miscSubIndex = 0
  private skillIndex = 0
  private itemIndex = 0
  private pendingSkillId: string | null = null
  private pendingThrowItem: string | null = null
  private pendingCoop = false
  private targetIndex = 0
  private targetSide: 'enemy' | 'ally' = 'enemy'
  private pendingItemId: string | null = null
  private autoAttack = false
  private stickyForce = false
  private stickyRepeat = false
  private readonly lastActions = new Map<number, BattleAction>()
  private submitOrder: number[] = []

  get phase(): BattleCommandSelectionPhase {
    return this.currentPhase
  }

  get view(): BattleCommandSelectionView {
    return {
      phase: this.currentPhase,
      menuIndex: this.menuIndex,
      miscIndex: this.miscIndex,
      miscSubIndex: this.miscSubIndex,
      skillIndex: this.skillIndex,
      itemIndex: this.itemIndex,
      targetIndex: this.targetIndex,
      targetSide: this.targetSide,
    }
  }

  /** performAction 回到 selectAction 时同步清本轮态；持续 A 与上轮动作保留。 */
  beginRound(): void {
    this.currentPhase = 'menu'
    this.stickyForce = false
    this.stickyRepeat = false
    this.submitOrder = []
  }

  mainActionValidity(context: BattleCommandSelectionContext): [boolean, boolean, boolean, boolean] {
    const player = context.player
    const magicOk = player.skills.length > 0 && !player.silenced
    const coopOk =
      !!player.cooperativeMagicSkillId && player.healthy && context.healthyPlayerCount > 1
    return [true, magicOk, coopOk, true]
  }

  advance(
    context: BattleCommandSelectionContext,
    pressed: ReadonlySet<string>,
    port: BattleCommandSelectionPort,
  ): void {
    const sel = context.playerIndex
    if (this.autoAttack || this.stickyForce || this.stickyRepeat) {
      if (pressed.has('Escape')) {
        this.autoAttack = false
        this.stickyForce = false
        this.stickyRepeat = false
      } else {
        if (this.stickyRepeat) this.submitRepeat(context, port)
        else this.submitForce(context, port)
        return
      }
    }

    const confirm = pressed.has(' ') || pressed.has('Enter')
    if (this.currentPhase === 'menu') {
      const key = (a: string, b: string): boolean => pressed.has(a) || pressed.has(b)
      if (key('d', 'D')) {
        this.submitAnd(context, port, { kind: 'defend' })
        return
      }
      if (key('q', 'Q')) {
        this.submitAnd(context, port, { kind: 'flee' })
        return
      }
      if (key('e', 'E')) {
        if (context.usableItems.length) {
          this.currentPhase = 'item'
          this.itemIndex = 0
        }
        return
      }
      if (key('w', 'W')) {
        if (context.throwableItems.length) {
          this.currentPhase = 'throwItem'
          this.itemIndex = 0
        }
        return
      }
      if (key('r', 'R')) {
        this.stickyRepeat = true
        this.submitRepeat(context, port)
        return
      }
      if (key('f', 'F')) {
        this.stickyForce = true
        this.submitForce(context, port)
        return
      }
      if (key('a', 'A')) {
        this.autoAttack = true
        this.submitForce(context, port)
        return
      }
      if (pressed.has('Escape') && this.submitOrder.length) {
        const previous = this.submitOrder.pop()
        if (previous !== undefined) port.retract(previous)
        return
      }
      const valid = this.mainActionValidity(context)
      if (pressed.has('ArrowUp')) this.menuIndex = 0
      else if (pressed.has('ArrowDown')) this.menuIndex = 3
      else if (pressed.has('ArrowLeft') && valid[1]) this.menuIndex = 1
      else if (pressed.has('ArrowRight') && valid[2]) this.menuIndex = 2
      if (!valid[this.menuIndex]) this.menuIndex = 0
      if (confirm) {
        if (this.menuIndex === 0) {
          this.currentPhase = 'target'
          this.targetSide = 'enemy'
          this.pendingSkillId = null
          this.targetIndex = 0
        } else if (this.menuIndex === 1) {
          this.currentPhase = 'skill'
          this.skillIndex = 0
        } else if (this.menuIndex === 2) {
          const coopSkillId = context.player.cooperativeMagicSkillId
          const coopSkill = coopSkillId ? context.skills[coopSkillId] : undefined
          if (coopSkill?.target === 'allEnemies') {
            this.submit(context, port, { kind: 'coop' })
            port.consumeOthersForCoop(sel)
            this.backToMain()
          } else {
            this.pendingCoop = true
            this.currentPhase = 'target'
            this.targetSide = 'enemy'
            this.targetIndex = 0
          }
        } else if (this.menuIndex === 3) {
          this.currentPhase = 'misc'
          this.miscIndex = 0
        }
      }
      return
    }

    if (this.currentPhase === 'misc') {
      const count = 5
      if (pressed.has('ArrowUp')) this.miscIndex = (this.miscIndex + count - 1) % count
      if (pressed.has('ArrowDown')) this.miscIndex = (this.miscIndex + 1) % count
      if (pressed.has('Escape')) this.currentPhase = 'menu'
      if (confirm) {
        if (this.miscIndex === 1) {
          if (context.usableItems.length) this.currentPhase = 'miscSub'
          this.miscSubIndex = 0
        } else if (this.miscIndex === 2) {
          this.submitAnd(context, port, { kind: 'defend' })
        } else if (this.miscIndex === 3) {
          this.submitAnd(context, port, { kind: 'flee' })
        }
      }
      return
    }

    if (this.currentPhase === 'miscSub') {
      if (pressed.has('ArrowUp') || pressed.has('ArrowLeft')) this.miscSubIndex = 0
      if (pressed.has('ArrowDown') || pressed.has('ArrowRight')) this.miscSubIndex = 1
      if (pressed.has('Escape')) this.currentPhase = 'misc'
      if (confirm && this.miscSubIndex === 0) {
        this.currentPhase = 'item'
        this.itemIndex = 0
      }
      if (confirm && this.miscSubIndex === 1 && context.throwableItems.length) {
        this.currentPhase = 'throwItem'
        this.itemIndex = 0
      }
      return
    }

    if (this.currentPhase === 'skill') {
      const list = context.player.skills
      if (pressed.has('ArrowLeft')) this.skillIndex = Math.max(0, this.skillIndex - 1)
      if (pressed.has('ArrowRight'))
        this.skillIndex = Math.min(list.length - 1, this.skillIndex + 1)
      if (pressed.has('ArrowUp')) this.skillIndex = Math.max(0, this.skillIndex - 3)
      if (pressed.has('ArrowDown')) this.skillIndex = Math.min(list.length - 1, this.skillIndex + 3)
      if (pressed.has('Escape')) this.currentPhase = 'menu'
      if (confirm) {
        const skillId = list[this.skillIndex % list.length]
        if (skillId === undefined) throw new Error('战斗技能列表为空')
        const skill = context.skills[skillId]
        if (
          skill &&
          context.player.mp >= (skill.cost.mp ?? 0) &&
          context.money >= (skill.cost.money ?? 0)
        ) {
          if (skill.target === 'oneEnemy') {
            this.pendingSkillId = skillId
            this.currentPhase = 'target'
            this.targetSide = 'enemy'
            this.targetIndex = 0
          } else if (skill.target === 'oneAlly' && context.playerCount > 1) {
            this.pendingSkillId = skillId
            this.currentPhase = 'target'
            this.targetSide = 'ally'
            this.targetIndex = sel
          } else {
            this.submitAnd(context, port, { kind: 'cast', skillId })
          }
        }
      }
      return
    }

    if (this.currentPhase === 'item') {
      const list = context.usableItems
      this.moveGridCursor(pressed, list.length)
      if (pressed.has('Escape')) this.currentPhase = 'miscSub'
      if (confirm && list.length) {
        const item = list[this.itemIndex % list.length]
        if (!item) throw new Error('战斗物品游标越界')
        if (context.items[item.itemId]?.use?.target === 'oneAlly' && context.playerCount > 1) {
          this.pendingItemId = item.itemId
          this.currentPhase = 'target'
          this.targetSide = 'ally'
          this.targetIndex = sel
        } else {
          this.submitAnd(context, port, { kind: 'item', itemId: item.itemId })
        }
      }
      return
    }

    if (this.currentPhase === 'throwItem') {
      const list = context.throwableItems
      this.moveGridCursor(pressed, list.length)
      if (pressed.has('Escape')) this.currentPhase = 'miscSub'
      if (confirm && list.length) {
        const item = list[this.itemIndex % list.length]
        if (!item) throw new Error('战斗投掷物游标越界')
        const thrown = context.items[item.itemId]?.throw
        if (!thrown) throw new Error(`战斗投掷物 ${item.itemId} 缺 throw 能力`)
        if (thrown.target === 'allEnemies') {
          this.submit(context, port, { kind: 'throw', itemId: item.itemId })
          this.pendingThrowItem = null
          this.backToMain()
        } else {
          this.pendingThrowItem = item.itemId
          this.currentPhase = 'target'
          this.targetSide = 'enemy'
          this.targetIndex = 0
        }
      }
      return
    }

    if (this.targetSide === 'ally') {
      const count = context.playerCount
      if (pressed.has('ArrowLeft') || pressed.has('ArrowUp'))
        this.targetIndex = (this.targetIndex + count - 1) % count
      if (pressed.has('ArrowRight') || pressed.has('ArrowDown'))
        this.targetIndex = (this.targetIndex + 1) % count
      if (pressed.has('Escape')) {
        this.targetSide = 'enemy'
        if (this.pendingItemId) {
          this.pendingItemId = null
          this.currentPhase = 'item'
        } else {
          this.pendingSkillId = null
          this.currentPhase = 'skill'
        }
      }
      if (confirm) {
        const target = this.targetIndex % count
        const action: BattleAction = this.pendingItemId
          ? { kind: 'item', itemId: this.pendingItemId, targetAllyIdx: target }
          : {
              kind: 'cast',
              skillId: this.requirePendingSkill(),
              targetAllyIdx: target,
            }
        this.pendingItemId = null
        this.pendingSkillId = null
        this.targetSide = 'enemy'
        this.submit(context, port, action)
        this.backToMain()
      }
      return
    }

    const alive = context.aliveEnemyIndices
    if (alive.length === 0) return
    if (pressed.has('ArrowLeft'))
      this.targetIndex = (this.targetIndex + alive.length - 1) % alive.length
    if (pressed.has('ArrowRight')) this.targetIndex = (this.targetIndex + 1) % alive.length
    if (pressed.has('Escape')) {
      if (this.pendingThrowItem) {
        this.pendingThrowItem = null
        this.currentPhase = 'throwItem'
      } else {
        this.pendingCoop = false
        this.currentPhase = 'menu'
      }
    }
    if (confirm) {
      const target = alive[this.targetIndex % alive.length]
      if (target === undefined) throw new Error('战斗敌方目标游标越界')
      const action: BattleAction = this.pendingThrowItem
        ? { kind: 'throw', itemId: this.pendingThrowItem, targetEnemyIdx: target }
        : this.pendingCoop
          ? { kind: 'coop', targetEnemyIdx: target }
          : this.pendingSkillId
            ? { kind: 'cast', skillId: this.pendingSkillId, targetEnemyIdx: target }
            : { kind: 'attack', targetEnemyIdx: target }
      const wasCoop = this.pendingCoop
      this.pendingSkillId = null
      this.pendingThrowItem = null
      this.pendingCoop = false
      this.submit(context, port, action)
      if (wasCoop) port.consumeOthersForCoop(sel)
      this.backToMain()
    }
  }

  private moveGridCursor(pressed: ReadonlySet<string>, itemCount: number): void {
    if (pressed.has('ArrowLeft')) this.itemIndex = Math.max(0, this.itemIndex - 1)
    if (pressed.has('ArrowRight')) this.itemIndex = Math.min(itemCount - 1, this.itemIndex + 1)
    if (pressed.has('ArrowUp')) this.itemIndex = Math.max(0, this.itemIndex - 3)
    if (pressed.has('ArrowDown')) this.itemIndex = Math.min(itemCount - 1, this.itemIndex + 3)
  }

  private submit(
    context: BattleCommandSelectionContext,
    port: BattleCommandSelectionPort,
    action: BattleAction,
  ): void {
    port.submit(context.playerIndex, action)
    this.lastActions.set(context.playerIndex, action)
    this.submitOrder.push(context.playerIndex)
  }

  private submitAnd(
    context: BattleCommandSelectionContext,
    port: BattleCommandSelectionPort,
    action: BattleAction,
  ): void {
    this.submit(context, port, action)
    this.backToMain()
  }

  private submitForce(
    context: BattleCommandSelectionContext,
    port: BattleCommandSelectionPort,
  ): void {
    const target = context.aliveEnemyIndices[0]
    this.submitAnd(
      context,
      port,
      target === undefined ? { kind: 'defend' } : { kind: 'attack', targetEnemyIdx: target },
    )
  }

  private submitRepeat(
    context: BattleCommandSelectionContext,
    port: BattleCommandSelectionPort,
  ): void {
    let action = this.lastActions.get(context.playerIndex)
    if (action?.kind === 'item') {
      const itemId = action.itemId
      if (!context.usableItems.some((item) => item.itemId === itemId)) action = undefined
    }
    if (action?.kind === 'throw') {
      const itemId = action.itemId
      if (!context.throwableItems.some((item) => item.itemId === itemId)) action = undefined
    }
    if (action?.kind === 'cast') {
      const skill = context.skills[action.skillId]
      if (
        !skill ||
        context.player.mp < (skill.cost.mp ?? 0) ||
        context.money < (skill.cost.money ?? 0)
      )
        action = undefined
    }
    if (action && 'targetEnemyIdx' in action && action.targetEnemyIdx !== undefined) {
      if (!context.aliveEnemyIndices.includes(action.targetEnemyIdx)) {
        const target = context.aliveEnemyIndices[0]
        action = target === undefined ? undefined : { ...action, targetEnemyIdx: target }
      }
    }
    if (!action) {
      this.submitForce(context, port)
      return
    }
    this.submitAnd(context, port, action)
  }

  private backToMain(): void {
    this.currentPhase = 'menu'
    this.menuIndex = 0
  }

  private requirePendingSkill(): string {
    if (!this.pendingSkillId) throw new Error('战斗己方目标缺 pending skill')
    return this.pendingSkillId
  }
}
