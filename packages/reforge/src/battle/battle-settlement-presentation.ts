import type { BattlePhase } from './battle-core.js'
import type { BattleResult } from './battle-result.js'
import type { SettlementScreen } from './settlement.js'

const SETTLEMENT_CONFIRM_MIN_MS = 300
const TERMINAL_HOLD_MS = 1200
const REWARD_SCREEN_MS = 3000
const BOSS_REWARD_SCREEN_MS = 5500

type CoreTerminalPhase = Extract<BattlePhase, 'won' | 'lost' | 'fled'>

export interface BattleSettlementPresentationOptions {
  buildSettlement?: () => SettlementScreen[]
  worldSettlement?: { boss: boolean }
}

/**
 * 终态结果与结算屏序列的唯一 owner。最后一击动画、对话和死亡淡出先由宿主把关；
 * 门清后宿主每拍只提交时间/按键，并消费唯一完成结果。
 */
export class BattleSettlementPresentation {
  private currentResult: BattleResult | null = null
  private screens: SettlementScreen[] | null = null
  private screenIndex = 0
  private elapsedMs = 0
  private pageDrawn = false

  constructor(private readonly options: BattleSettlementPresentationOptions = {}) {}

  get result(): BattleResult | null {
    return this.currentResult
  }

  get currentScreen(): SettlementScreen | null {
    return this.screens?.[this.screenIndex] ?? null
  }

  /** PAL_WaitForAnyKey starts after VIDEO_UpdateScreen publishes the current page. */
  markPageDrawn(): void {
    this.pageDrawn = true
  }

  /** 脚本终止/敌逃等已有精确结果优先于 core phase 的粗粒度枚举。 */
  recordResult(result: BattleResult): void {
    this.currentResult = result
  }

  /** 普通 core 终态只在尚无精确结果时映射一次。 */
  observeCorePhase(phase: CoreTerminalPhase, enemyFled: boolean): void {
    if (this.currentResult) return
    this.currentResult =
      phase === 'lost'
        ? 'defeat'
        : phase === 'fled'
          ? 'playerFled'
          : enemyFled
            ? 'enemyFled'
            : 'victory'
  }

  /** 返回非 null 即应由宿主在同一 tick 完成会话。 */
  advance(dtMs: number, pressed: ReadonlySet<string>, handoffDefeat = false): BattleResult | null {
    const result = this.currentResult
    if (!result) throw new Error('BattleSettlementPresentation 尚未观察到终态')

    if (result === 'victory' && this.screens === null) {
      this.screens = this.options.buildSettlement?.() ?? []
    }
    const screen = this.currentScreen
    if (screen) {
      if (!this.acceptPageInput(screen, dtMs, pressed)) return null
      this.screenIndex++
      this.elapsedMs = 0
      this.pageDrawn = false
      return this.currentScreen ? null : result
    }
    if (result === 'victory' && this.options.worldSettlement) return result

    // 逃跑/敌逃/脚本终止没有通用结果屏；演出门清后同拍完成。
    if (result === 'playerFled' || result === 'enemyFled' || result === 'terminated') return result

    // 具有败退接续流程的宿主接管全灭表现，结算阶段无需再等通用停顿。
    if (result === 'defeat' && handoffDefeat) return result

    // 无结算屏的胜/败仍短暂停留。
    this.elapsedMs += dtMs
    return this.elapsedMs >= TERMINAL_HOLD_MS ? result : null
  }

  private acceptPageInput(
    screen: SettlementScreen,
    dtMs: number,
    pressed: ReadonlySet<string>,
  ): boolean {
    const world = this.options.worldSettlement
    if (world && !this.pageDrawn) return false
    this.elapsedMs += dtMs
    if (world) {
      const timeout =
        world.boss && screen.kind === 'exp-cash' ? BOSS_REWARD_SCREEN_MS : REWARD_SCREEN_MS
      return pressed.size > 0 || this.elapsedMs >= timeout
    }
    return this.elapsedMs >= SETTLEMENT_CONFIRM_MIN_MS && (pressed.has(' ') || pressed.has('Enter'))
  }
}
