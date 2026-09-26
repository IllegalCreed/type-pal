import type { ActivePoison } from '@type-pal/content'
import { SfxReadinessFatalError, SfxReadinessResourceError } from '../audio/sfx.js'
import type { BattleAction, BattleState } from './battle-core.js'

export type BattleTurnReadinessPhase = 'idle' | 'preparing' | 'readinessError'

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

export interface BattleTurnReadinessPort {
  /** Promise 落定时重新核会话身份、终态与 core phase。 */
  isCurrent(): boolean
  /** 同一 continuation 内跨入 performAction；不得在 owner 外再排微任务。 */
  enterActionPhase(): void
}

export interface BattleTurnReadinessOptions {
  prepare?: (snapshot: BattleTurnReadinessSnapshot) => Promise<void>
  reportError?: (error: Error, context: BattleReadinessErrorContext) => void
}

/** 冻结本轮真实动作与毒进度；不把可变 BattleState 暴露给异步准备器。 */
export function createBattleTurnReadinessSnapshot(state: BattleState): BattleTurnReadinessSnapshot {
  return {
    turn: state.turn,
    actions: new Map(state.pendingActions),
    activePlayerPoisons: state.players.flatMap((player) =>
      player.poisons.map((poison) => ({ ...poison })),
    ),
    activeEnemyPoisons: state.enemies.flatMap((enemy) =>
      enemy ? enemy.poisons.map((poison) => ({ ...poison })) : [],
    ),
  }
}

/**
 * 回合音效准备的唯一状态 owner。token、fatal/error 分类与迟到结果失效均留在这里；
 * BattleSession 只负责采样时机和同步 core 提交。
 */
export class BattleTurnReadinessGate {
  private serial = 0
  private currentPhase: BattleTurnReadinessPhase = 'idle'
  private currentError: Error | null = null

  constructor(private readonly options: BattleTurnReadinessOptions = {}) {}

  get phase(): BattleTurnReadinessPhase {
    return this.currentPhase
  }

  get error(): Error | null {
    return this.currentError
  }

  /** 无 prepare 时同步提交；有 prepare 时恰发布一个 token。 */
  begin(snapshot: BattleTurnReadinessSnapshot, port: BattleTurnReadinessPort): void {
    if (this.currentPhase === 'preparing') return
    const prepare = this.options.prepare
    if (!prepare) {
      port.enterActionPhase()
      return
    }
    const token = ++this.serial
    this.currentError = null
    this.currentPhase = 'preparing'
    let pending: Promise<void>
    try {
      pending = prepare(snapshot)
    } catch (error) {
      this.settle(token, snapshot.turn, port, { ok: false, error })
      return
    }
    void pending.then(
      () => this.settle(token, snapshot.turn, port, { ok: true }),
      (error: unknown) => this.settle(token, snapshot.turn, port, { ok: false, error }),
    )
  }

  /** 完成/取消同步作废旧 token；保留 phase 供取消后的只读诊断。 */
  invalidate(): void {
    this.serial++
  }

  private settle(
    token: number,
    turn: number,
    port: BattleTurnReadinessPort,
    outcome: { ok: true } | { ok: false; error: unknown },
  ): void {
    if (token !== this.serial || this.currentPhase !== 'preparing' || !port.isCurrent()) return
    if (outcome.ok) {
      this.currentPhase = 'idle'
      port.enterActionPhase()
      return
    }
    const normalized =
      outcome.error instanceof Error ? outcome.error : new Error(String(outcome.error))
    // 只有已知的资源准备失败允许静音降级；预算/collector/未知编程错误一律 fail-loud。
    const fatal =
      normalized instanceof SfxReadinessFatalError ||
      !(normalized instanceof SfxReadinessResourceError)
    this.options.reportError?.(normalized, { turn, fatal })
    if (fatal) {
      this.currentError = normalized
      this.currentPhase = 'readinessError'
      return
    }
    // 单项缺失/读取/WAV/decode 失败：allSettled 已保证其余成功项 ready，再降级行动。
    this.currentPhase = 'idle'
    port.enterActionPhase()
  }
}

/** pending 不显示内部技术文案；只有 fail-loud 错误态可见。 */
export function battleReadinessOverlayText(
  phase: Extract<BattleTurnReadinessPhase, 'preparing' | 'readinessError'>,
): string | null {
  return phase === 'readinessError' ? '音效工作集错误' : null
}
