import { asyncIntentAbortError } from './async-intent.js'
import { expectDefined } from './defined.js'
import { GameplayClock } from './gameplay-clock.js'

/** Synchronous frame phases only; no world/project/DOM ownership and no second scheduler. */
export interface RuntimeFramePorts {
  activateConfirm(): void
  resumeScriptGates(): void
  gameplayFrozen(): boolean
  advanceFade(now: number): void
  settleClosedDialogue(): void
  consumePressed(): ReadonlySet<string>
  tickHostiles(dt: number): void
  advanceMoves(dt: number, pressed: ReadonlySet<string>): void
  deriveMounts(): void
  advanceLifecycle(frozen: boolean, stepping: boolean): void
  advanceEntityActions(dt: number): void
  clearWorldTicks(): void
  /** Queries the current battle after world advancement. True consumes the frame. */
  presentBattle(dt: number, pressed: ReadonlySet<string>, now: number): boolean
  routeInput(pressed: ReadonlySet<string>, realNow: number): void
  presentWorld(): void
}

interface FrameWait {
  deadline: number
  settle(error?: Error): void
}

/** Owns gameplay time, the single-step intent and waits driven by that time. */
export class RuntimeFrameSession {
  #clock = new GameplayClock()
  #now = 0
  #stepActive = false
  #stepRequested = false
  #waits: FrameWait[] = []

  constructor(private readonly stepMs: number) {}

  get now(): number {
    return this.#now
  }
  get stepActive(): boolean {
    return this.#stepActive
  }

  setStepActive(active: boolean): void {
    this.#stepActive = active
    if (!active) this.#stepRequested = false
  }
  requestStep(): void {
    this.#stepRequested = true
  }
  resetStep(): void {
    this.#stepActive = false
    this.#stepRequested = false
  }

  wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false
      const timer: FrameWait = {
        deadline: this.#now + ms,
        settle: (error?: Error) => {
          if (settled) return
          settled = true
          signal.removeEventListener('abort', abort)
          const index = this.#waits.indexOf(timer)
          if (index >= 0) this.#waits.splice(index, 1)
          if (error) reject(error)
          else resolve()
        },
      }
      const abort = () => timer.settle(asyncIntentAbortError('脚本等待所属 runner 已取消'))
      this.#waits.push(timer)
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
    })
  }

  /** After parent aborts, the old host resolved any remaining unowned waits; keep that policy. */
  clearWaits(): void {
    for (const timer of this.#waits.splice(0)) timer.settle()
  }

  tick(realNow: number, ports: RuntimeFramePorts): void {
    ports.activateConfirm()
    ports.resumeScriptGates()
    const frozen = ports.gameplayFrozen()
    const stepping = this.#stepActive
    const requested = this.#stepRequested
    this.#stepRequested = false
    const clock = this.#clock.advance(realNow, frozen || stepping, requested ? this.stepMs : 0)
    this.#now = clock.gameplayNow
    if (!frozen) {
      // Preserve reverse registration order and remove before settling; never sort deadlines.
      for (let i = this.#waits.length - 1; i >= 0; i--) {
        const timer = expectDefined(this.#waits[i])
        if (this.#now >= timer.deadline) {
          this.#waits.splice(i, 1)
          timer.settle()
        }
      }
      if (!stepping) ports.advanceFade(this.#now)
    }
    ports.settleClosedDialogue()
    const pressed = ports.consumePressed()
    if (!frozen && !stepping) {
      this.advanceWorld(clock.gameplayDt, pressed, frozen, stepping, ports)
      ports.advanceEntityActions(clock.gameplayDt)
    } else if (requested) {
      this.advanceWorld(clock.gameplayDt, pressed, frozen, stepping, ports)
    } else ports.clearWorldTicks()
    if (ports.presentBattle(clock.gameplayDt, pressed, clock.gameplayNow)) return
    ports.routeInput(pressed, realNow)
    ports.presentWorld()
  }

  private advanceWorld(
    dt: number,
    pressed: ReadonlySet<string>,
    frozen: boolean,
    stepping: boolean,
    ports: RuntimeFramePorts,
  ) {
    ports.tickHostiles(dt)
    ports.advanceMoves(dt, pressed)
    ports.deriveMounts()
    ports.advanceLifecycle(frozen, stepping)
  }
}
