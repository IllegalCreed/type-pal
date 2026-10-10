import { asyncIntentAbortError } from './async-intent.js'
import { expectDefined } from './defined.js'
import { GameplayClock } from './gameplay-clock.js'
import { scriptWorkWait } from './script-work-queue.js'

/** Synchronous frame phases only; no world/project/DOM ownership and no second scheduler. */
export interface RuntimeFramePorts {
  afterScriptWork?(action: () => void): Promise<void>
  settleMotionContinuations?(): void
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
  pausedRemaining?: number
  settle(error?: Error): void
}

/** One timer on the existing gameplay clock, controlled by synchronous ownership changes. */
export interface RuntimeWait {
  readonly done: Promise<void>
  readonly remainingMs: number
  setPaused(paused: boolean): void
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
    return this.scheduleWait(ms, signal).done
  }

  scheduleWait(ms: number, signal: AbortSignal): RuntimeWait {
    let settled = false
    let timer: FrameWait
    const remaining = () =>
      settled ? 0 : (timer.pausedRemaining ?? Math.max(0, timer.deadline - this.#now))
    const done = scriptWorkWait<void>(signal, (resolve, reject) => {
      timer = {
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
    return {
      done,
      get remainingMs() {
        return remaining()
      },
      setPaused: (paused) => {
        if (settled) return
        if (paused && timer.pausedRemaining === undefined) {
          timer.pausedRemaining = remaining()
        } else if (!paused && timer.pausedRemaining !== undefined) {
          timer.deadline = this.#now + timer.pausedRemaining
          delete timer.pausedRemaining
        }
      },
    }
  }

  /** After parent aborts, the old host resolved any remaining unowned waits; keep that policy. */
  clearWaits(): void {
    for (const timer of this.#waits.splice(0)) timer.settle()
  }

  async tick(realNow: number, ports: RuntimeFramePorts): Promise<void> {
    let dt = 0
    let pressed: ReadonlySet<string> = new Set()
    const advance = () => {
      ports.activateConfirm()
      ports.resumeScriptGates()
      const frozen = ports.gameplayFrozen()
      const stepping = this.#stepActive
      const requested = this.#stepRequested
      this.#stepRequested = false
      const clock = this.#clock.advance(realNow, frozen || stepping, requested ? this.stepMs : 0)
      this.#now = clock.gameplayNow
      dt = clock.gameplayDt
      if (!frozen) {
        // Timers become ready here, but their continuations follow this world's single commit.
        // Otherwise a just-shown actor or newly registered move advances before its initial draw.
        for (let i = this.#waits.length - 1; i >= 0; i--) {
          const timer = expectDefined(this.#waits[i])
          if (timer.pausedRemaining === undefined && this.#now >= timer.deadline) {
            this.#waits.splice(i, 1)
            timer.settle()
          }
        }
        if (!stepping) ports.advanceFade(this.#now)
      }
      ports.settleClosedDialogue()
      pressed = ports.consumePressed()
      if (!frozen && !stepping) {
        this.advanceWorld(dt, pressed, frozen, stepping, ports)
        ports.advanceEntityActions(dt)
      } else if (requested) {
        this.advanceWorld(dt, pressed, frozen, stepping, ports)
      } else ports.clearWorldTicks()
    }
    if (ports.afterScriptWork) await ports.afterScriptWork(advance)
    else advance()
    // A touch runner gets its first real suspension before previous motion owners resume.
    const settleMotion = () => ports.settleMotionContinuations?.()
    if (ports.afterScriptWork) await ports.afterScriptWork(settleMotion)
    else settleMotion()
    let battlePresented = false
    const input = () => {
      battlePresented = ports.presentBattle(dt, pressed, this.#now)
      if (battlePresented) return
      ports.routeInput(pressed, realNow)
      if (ports.afterScriptWork) ports.settleClosedDialogue()
    }
    if (ports.afterScriptWork) await ports.afterScriptWork(input)
    else input()
    if (battlePresented) return
    const present = () => {
      if (ports.afterScriptWork && ports.presentBattle(0, new Set(), this.#now)) return
      ports.presentWorld()
    }
    if (ports.afterScriptWork) await ports.afterScriptWork(present)
    else present()
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
