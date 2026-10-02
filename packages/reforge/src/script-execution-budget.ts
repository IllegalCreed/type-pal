/** Engine safety budget, not an authored repeat count or a clock. */
export class ScriptExecutionBudget {
  private work = 0
  static readonly LIMIT = 10_240

  consume(): boolean {
    if (++this.work > ScriptExecutionBudget.LIMIT)
      throw new Error('循环没有等待且一直未结束，已停止执行（zero-time execution limit: 10240）')
    return this.work % 256 === 0
  }

  resumedAfterProgress(): void {
    this.work = 0
  }
}

/** Automatic rebinding replaces AbortSignals, not the identity of the automatic job. */
export class ScriptExecutionBudgets {
  private readonly signals = new WeakMap<AbortSignal, ScriptExecutionBudget>()
  private readonly automatic = new Map<string, ScriptExecutionBudget>()
  private session?: string | number

  forSignal(signal: AbortSignal): ScriptExecutionBudget {
    const existing = this.signals.get(signal)
    if (existing) return existing
    const budget = new ScriptExecutionBudget()
    this.signals.set(signal, budget)
    return budget
  }

  forAutomatic(
    session: string | number,
    scene: string,
    entity: string,
    signal: AbortSignal,
  ): ScriptExecutionBudget {
    if (this.session !== session) {
      this.automatic.clear()
      this.session = session
    }
    const key = JSON.stringify([scene, entity])
    let budget = this.automatic.get(key)
    if (!budget) {
      budget = new ScriptExecutionBudget()
      this.automatic.set(key, budget)
    }
    this.signals.set(signal, budget)
    return budget
  }
}
