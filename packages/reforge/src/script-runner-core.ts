import type {
  AuthorCondition,
  AutoCommandFrame,
  AutoScriptContinuation,
  EntityAddress,
  FlowCursor,
  SceneReveal,
  StepExit,
} from '@type-pal/content'
import { flowCanComplete } from '@type-pal/content'
import type { BattleResult } from './battle/battle-result.js'
import {
  type BaseRuntimeLeafCommand,
  type ExecutableBaseCommand,
  type ExecutableBaseScriptFlowLike,
  type ExecutableCommandLike,
  type ExecutableSharedScriptLike,
  SCRIPT_COMPILER_VERSION,
  type ScriptRootScope,
  type ScriptTiming,
} from './script-compiler-core.js'
import {
  SCRIPT_MAX_CALL_DEPTH,
  type ScriptContinuationLocation,
  validateScriptContinuation,
} from './script-continuation.js'

import { ScriptExecutionBudget } from './script-execution-budget.js'

type BattleRequest = Extract<ExecutableBaseCommand, { kind: 'startBattle' }>['request']

export type ScriptGateBoundary = { kind: 'settlement' }

export interface ScriptRuntimeContext {
  self?: EntityAddress
  timing?: ScriptTiming
  autoMotionCheckpoint?: AutomaticMotionCheckpoint
}

/** Engine-only one-shot commit handshake; never an authored step or persistent function. */
export interface AutomaticMotionCheckpoint {
  readonly phase: 'continuation' | 'done' | undefined
  settle(phase: 'continuation' | 'done'): void
  ready(): void
  beginMutation(): Promise<void>
}

export interface ScriptRuntimeHostLike<RuntimeLeafCommand> {
  /**
   * 宿主级执行门。中央 modal 可用它冻结所有 runner（包括 auto、shared、
   * item-private），而不只暂停 main tick 的物理推进。
   */
  gate?(
    signal: AbortSignal,
    boundary?: ScriptGateBoundary,
  ): void | SafePointDecision | Promise<void> | Promise<SafePointDecision | undefined>
  execute(
    command: RuntimeLeafCommand,
    context: Readonly<ScriptRuntimeContext>,
    signal: AbortSignal,
  ): void | Promise<void>
  evalCondition(condition: AuthorCondition, context: Readonly<ScriptRuntimeContext>): boolean
  gameplayNow?(): number
  confirm(signal: AbortSignal, reportInteraction?: () => void): Promise<boolean>
  startBattle(request: BattleRequest, signal: AbortSignal): Promise<BattleResult>
  teleportOut(signal: AbortSignal): Promise<boolean>
  revealSceneEntry?(reveal: SceneReveal, signal: AbortSignal): Promise<void>
  wait(ms: number, signal: AbortSignal): Promise<void>
  waitWorldTick(signal: AbortSignal): Promise<void>
  yieldMacroTask(signal: AbortSignal): Promise<void>
}

export type BaseScriptRuntimeHost = ScriptRuntimeHostLike<BaseRuntimeLeafCommand>

export interface SharedScriptResolverLike<RuntimeLeafCommand> {
  resolve(
    id: string,
    timing: ScriptTiming,
    signal: AbortSignal,
  ):
    | ExecutableSharedScriptLike<RuntimeLeafCommand>
    | Promise<ExecutableSharedScriptLike<RuntimeLeafCommand>>
}

export type BaseSharedScriptResolverInterface = SharedScriptResolverLike<BaseRuntimeLeafCommand>

export type SafePointDecision = 'continue' | 'stop'
export type FlowCheckpointDecision = SafePointDecision | 'wait'

export interface FlowCursorController {
  readonly checkpointEnabled?: boolean
  checkpoint?(
    cursor: FlowCursor,
    resume: AutoScriptContinuation,
    ready: boolean,
  ): FlowCheckpointDecision
  setCheckpointReady?(ready: boolean): FlowCheckpointDecision
  waitForCheckpointGate?(signal: AbortSignal): Promise<void>
  /**
   * Atomically CAS-commits the persistent cursor for the activation lease and enters the
   * save barrier. `stop` means the cursor was committed (or the lease became stale) but
   * this activation must not cross the safe-point.
   */
  reachSafePoint(cursor: FlowCursor): SafePointDecision | Promise<SafePointDecision>
}

export interface ScriptStepEventLike<RuntimeLeafCommand> {
  path: readonly (number | string)[]
  command: ExecutableCommandLike<RuntimeLeafCommand>
}

export type BaseScriptStepEvent = ScriptStepEventLike<BaseRuntimeLeafCommand>

export interface RunBaseScriptFlowOptions {
  cursor?: FlowCursor
  resume?: AutoScriptContinuation
  cursorController: FlowCursorController
  allowSceneEntry?: boolean
  runSceneEntry?: boolean
  self?: EntityAddress
}

class ScriptStopped extends Error {
  constructor() {
    super('script activation lost its cursor ownership')
  }
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('script aborted', 'AbortError')
}

class StepFinished {
  constructor(readonly next: StepExit) {}
}
class ScriptReturned {}
class LoopBroken {}
class LoopContinued {
  constructor(readonly loop?: string) {}
}

export class ScriptRunnerCore<RuntimeLeafCommand = BaseRuntimeLeafCommand> {
  private static readonly MAX_CALL_DEPTH = SCRIPT_MAX_CALL_DEPTH
  private callDepth = 0
  private self?: EntityAddress
  private checkpointController?: FlowCursorController
  private checkpointCursor?: FlowCursor
  private resumeFrames: AutoCommandFrame[] = []
  private readonly frames: AutoCommandFrame[] = []
  running = false
  onStep?: (event: ScriptStepEventLike<RuntimeLeafCommand>) => void
  /** Optional debugger pause at an authored command, never at an internal safe point.
   * The normal host gate and cancellation check still run after this hook settles.
   */
  beforeStep?: (event: ScriptStepEventLike<RuntimeLeafCommand>) => void | Promise<void>

  constructor(
    private readonly host: ScriptRuntimeHostLike<RuntimeLeafCommand>,
    private readonly signal: AbortSignal,
    private readonly resolver?: SharedScriptResolverLike<RuntimeLeafCommand>,
    private readonly budget = new ScriptExecutionBudget(),
  ) {}

  async runFlow(
    executable: ExecutableBaseScriptFlowLike<RuntimeLeafCommand>,
    options: RunBaseScriptFlowOptions,
  ): Promise<void> {
    if (executable.compilerVersion !== SCRIPT_COMPILER_VERSION)
      throw new Error(`ScriptRunnerCore: compilerVersion ${executable.compilerVersion} 不受支持`)
    throwIfAborted(this.signal)
    if (options.resume) {
      if (!options.cursor || !options.cursorController.checkpointEnabled)
        throw new Error('auto resume: 缺少自动flow执行游标')
      await this.validateContinuation(executable, options.cursor, options.resume, options.self)
    }
    if (options.cursor?.kind === 'completed') {
      if (!flowCanComplete(executable.flow))
        throw new Error('ScriptRunnerCore: flow 未声明 complete，不能使用 completed cursor')
      return
    }
    const previousSelf = this.self
    const previousTiming = this.runningTiming
    const previousRootScope = this.runningRootScope
    const previousDigest = this.runningDigest
    this.self = options.self === undefined ? undefined : structuredClone(options.self)
    this.runningTiming = executable.timing
    this.runningRootScope = executable.rootScope
    this.runningDigest = executable.canonicalContentDigest
    this.checkpointController = options.cursorController.checkpointEnabled
      ? options.cursorController
      : undefined
    this.resumeFrames = structuredClone(options.resume?.frames ?? [])
    this.running = true
    try {
      await this.runStages(executable, options)
    } finally {
      this.self = previousSelf
      this.runningTiming = previousTiming
      this.runningRootScope = previousRootScope
      this.runningDigest = previousDigest
      this.running = false
      this.checkpointController = undefined
      this.checkpointCursor = undefined
      this.frames.length = 0
      this.resumeFrames = []
    }
  }

  async validateContinuation(
    executable: ExecutableBaseScriptFlowLike<RuntimeLeafCommand>,
    cursor: FlowCursor,
    resume: AutoScriptContinuation,
    self?: EntityAddress,
  ): Promise<ScriptContinuationLocation<RuntimeLeafCommand>> {
    return validateScriptContinuation(executable, cursor, resume, this.resolver, this.signal, self)
  }

  private checkpoint(ready: boolean): boolean {
    if (!this.checkpointController || !this.checkpointCursor) return true
    if (this.frames.length === 0) {
      const decision = this.checkpointController.setCheckpointReady?.(ready)
      if (decision === 'stop') throw new ScriptStopped()
      return decision !== 'wait'
    }
    const decision = this.checkpointController.checkpoint?.(
      this.checkpointCursor,
      {
        digest: this.runningDigest,
        // During restore the child address stack is consumed one frame at a time. A host
        // gate may pause before the next child is entered; snapshots must keep that tail.
        frames: structuredClone([...this.frames, ...this.resumeFrames]),
      },
      ready,
    )
    if (decision === 'stop') throw new ScriptStopped()
    return decision !== 'wait'
  }

  private async checkpointGate(): Promise<void> {
    await this.checkpointController?.waitForCheckpointGate?.(this.signal)
    throwIfAborted(this.signal)
  }

  private async beginCheckpointMutation(): Promise<void> {
    // The async gate can open before this continuation runs. Acquire readiness atomically
    // against a newly requested snapshot rather than beginning an effect inside its window.
    do {
      await this.checkpointGate()
    } while (!this.checkpoint(false))
  }

  private async consumeWork(): Promise<void> {
    if (this.budget.consume()) {
      await this.host.yieldMacroTask(this.signal)
      throwIfAborted(this.signal)
    }
  }

  private async runStages(
    executable: ExecutableBaseScriptFlowLike<RuntimeLeafCommand>,
    options: RunBaseScriptFlowOptions,
  ): Promise<void> {
    await this.consumeWork()
    const stageId =
      options.cursor?.kind === 'stage' ? options.cursor.stage : executable.flow.initial
    const stage = executable.flow.stages.find((value) => value.id === stageId)
    if (!stage) throw new Error(`ScriptRunnerCore: stage cursor 不存在 ${stageId}`)
    let next: StepExit =
      typeof stage.next === 'object'
        ? { kind: 'complete' }
        : stage.next
          ? { kind: 'stage', stage: stage.next }
          : { kind: 'stay' }
    try {
      this.checkpointCursor = { kind: 'stage', stage: stageId }
      if (options.runSceneEntry && stage.entry) {
        if (!options.allowSceneEntry || !this.host.revealSceneEntry)
          throw new Error('ScriptRunnerCore: scene entry 不允许或缺少 host')
        await this.runCommands(stage.entry.prepare, [stage.id, 'entry', 'prepare'])
        throwIfAborted(this.signal)
        await this.awaitGate()
        await this.host.revealSceneEntry(stage.entry.reveal, this.signal)
        throwIfAborted(this.signal)
      }
      try {
        await this.runCommands(stage.body, [stage.id])
      } catch (error) {
        if (error instanceof StepFinished) next = error.next
        else if (error instanceof ScriptReturned && executable.rootScope === 'script') return
        else throw error
      }
      throwIfAborted(this.signal)
      await this.awaitGate({ kind: 'settlement' })
      const cursor: FlowCursor =
        next.kind === 'complete'
          ? { kind: 'completed' }
          : { kind: 'stage', stage: next.kind === 'stage' ? next.stage : stageId }
      if (
        cursor.kind === 'stage' &&
        !executable.flow.stages.some((value) => value.id === cursor.stage)
      )
        throw new Error(`ScriptRunnerCore: finishStep目标不存在 ${cursor.stage}`)
      await options.cursorController.reachSafePoint(cursor)
    } catch (error) {
      if (!(error instanceof ScriptStopped)) throw error
    }
  }

  private async runCommands(
    commands: readonly ExecutableCommandLike<RuntimeLeafCommand>[],
    path: readonly (number | string)[],
  ): Promise<void> {
    if (this.frames.length >= 256) throw new Error('ScriptRunnerCore: 执行帧深度超过256')
    const frame = this.resumeFrames.shift() ?? { index: 0 }
    this.frames.push(frame)
    try {
      this.checkpoint(true)
      for (let index = frame.index; index < commands.length; index++) {
        await this.consumeWork()
        const command = commands[index]
        if (!command) throw new Error('ScriptRunnerCore: 指令不存在')
        throwIfAborted(this.signal)
        await this.checkpointGate()
        const commandPath = [...path, index]
        // Structural traversal only changes the continuation. A hidden/suspended owner may
        // still settle its step, including a conditional finish or a return through a call.
        // Actual effects and interactive requests retain the full gameplay gate.
        const metadataOnly = !['leaf', 'confirm', 'startBattle', 'teleportOut'].includes(
          command.kind,
        )
        if (this.beforeStep) {
          await this.awaitGate(metadataOnly ? { kind: 'settlement' } : undefined)
          await this.beforeStep({ path: commandPath, command })
        }
        if (command.kind === 'finishStep' || command.kind === 'returnScript') {
          await this.beginCheckpointMutation()
          await this.awaitGate({ kind: 'settlement' })
        } else {
          await this.awaitGate(metadataOnly ? { kind: 'settlement' } : undefined)
          await this.beginCheckpointMutation()
        }
        this.onStep?.({ path: commandPath, command })
        await this.runCommand(command, commandPath)
        throwIfAborted(this.signal)
        frame.index = index + 1
        delete frame.control
        this.checkpoint(true)
      }
    } finally {
      this.frames.pop()
    }
  }

  private async runCommand(
    command: ExecutableCommandLike<RuntimeLeafCommand>,
    path: readonly (number | string)[],
  ): Promise<void> {
    const frame = this.frames.at(-1)
    if (!frame) throw new Error('ScriptRunnerCore: 缺少执行帧')
    switch (command.kind) {
      case 'leaf': {
        const motionKind =
          typeof command.command === 'object' &&
          command.command !== null &&
          'kind' in command.command
            ? command.command.kind
            : undefined
        const checkpointedMotion =
          !!this.checkpointController &&
          (motionKind === 'stepEntity' || motionKind === 'chasePlayer')
        const index = frame.index
        const current = () =>
          !this.signal.aborted && this.frames.includes(frame) && frame.index === index
        const publish = () => {
          if (!current()) return
          try {
            this.checkpoint(true)
          } catch (error) {
            // A stale lease must not throw into the host's synchronous motion commit batch.
            if (!(error instanceof ScriptStopped)) throw error
          }
        }
        const autoMotionCheckpoint: AutomaticMotionCheckpoint | undefined = checkpointedMotion
          ? {
              get phase() {
                return frame.control?.kind === 'leaf' ? frame.control.phase : undefined
              },
              settle: (phase) => {
                if (!current()) return
                frame.control = { kind: 'leaf', command: motionKind, phase }
                publish()
              },
              ready: publish,
              beginMutation: () => this.beginCheckpointMutation(),
            }
          : undefined
        // Absolute target movement can re-enter from the captured live position. A wait may
        // restart its duration; neither repeats a committed reward or relative displacement.
        if (
          typeof command.command === 'object' &&
          command.command !== null &&
          'kind' in command.command &&
          (command.command.kind === 'moveEntity' ||
            command.command.kind === 'wait' ||
            checkpointedMotion)
        )
          this.checkpoint(true)
        const before = this.host.gameplayNow?.() ?? 0
        await this.host.execute(
          command.command,
          {
            self: this.self,
            timing: this.runningTiming,
            ...(autoMotionCheckpoint ? { autoMotionCheckpoint } : {}),
          },
          this.signal,
        )
        const zeroWait =
          typeof command.command === 'object' &&
          command.command !== null &&
          'kind' in command.command &&
          command.command.kind === 'wait' &&
          'ms' in command.command &&
          Number(command.command.ms) <= 0
        if (!zeroWait && (this.host.gameplayNow?.() ?? 0) > before)
          this.budget.resumedAfterProgress()
        return
      }
      case 'returnScript':
        if (this.runningRootScope !== 'script') throw new Error('returnScript outside script root')
        throw new ScriptReturned()
      case 'finishStep':
        if (this.runningRootScope !== 'flow') throw new Error('finishStep outside owner flow')
        throw new StepFinished(command.next)
      case 'breakLoop':
        if (!this.loopAncestors.length) throw new Error('breakLoop outside lexical loop')
        throw new LoopBroken()
      case 'continueLoop':
        if (
          !this.loopAncestors.length ||
          (command.loop && !this.loopAncestors.includes(command.loop))
        )
          throw new Error('continueLoop target is not a lexical ancestor')
        throw new LoopContinued(command.loop)
      case 'branch': {
        const arm =
          frame.control?.kind === 'branch'
            ? frame.control.arm
            : this.host.evalCondition(command.cond, { self: this.self, timing: this.runningTiming })
              ? 'then'
              : 'else'
        frame.control = { kind: 'branch', arm }
        await this.runCommands(command[arm], [...path, 'branch'])
        return
      }
      case 'loop':
      case 'repeat':
        await this.runLoopCommand(command, path)
        return
      case 'confirm': {
        let arm: 'onYes' | 'onNo'
        if (frame.control?.kind === 'confirm') arm = frame.control.arm
        else {
          let pending = false,
            active = true,
            settled = false,
            reported = false
          const answer = this.host.confirm(this.signal, () => {
            if (active && pending && !reported && !this.signal.aborted) {
              reported = true
              this.budget.resumedAfterProgress()
            }
          })
          void answer.then(
            () => {
              settled = true
            },
            () => {
              settled = true
            },
          )
          await Promise.resolve()
          pending = !settled
          try {
            arm = (await answer) ? 'onYes' : 'onNo'
          } finally {
            active = false
          }
        }
        frame.control = { kind: 'confirm', arm }
        await this.runCommands(command[arm], [...path, arm])
        return
      }
      case 'startBattle': {
        let arm: 'onLose' | 'onFlee' | 'none'
        if (frame.control?.kind === 'startBattle') arm = frame.control.arm
        else {
          const result = await this.host.startBattle(command.request, this.signal)
          arm = result === 'defeat' ? 'onLose' : result === 'playerFled' ? 'onFlee' : 'none'
        }
        frame.control = { kind: 'startBattle', arm }
        const body = arm === 'none' ? undefined : command[arm]
        if (body) await this.runCommands(body, [...path, arm])
        return
      }
      case 'teleportOut': {
        const failed =
          frame.control?.kind === 'teleportOut'
            ? frame.control.failed
            : !(await this.host.teleportOut(this.signal))
        frame.control = { kind: 'teleportOut', failed }
        if (failed && command.onFail) await this.runCommands(command.onFail, [...path, 'onFail'])
        return
      }
      case 'callScript':
        await this.callScript(command, path)
        return
    }
  }

  private loopAncestors: (string | undefined)[] = []

  private async runLoopCommand(
    command: Extract<ExecutableCommandLike<RuntimeLeafCommand>, { kind: 'loop' | 'repeat' }>,
    path: readonly (number | string)[],
  ): Promise<void> {
    const frame = this.frames.at(-1)
    if (!frame) throw new Error('ScriptRunnerCore: 缺少循环执行帧')
    if (!frame.control)
      frame.control =
        command.kind === 'repeat'
          ? { kind: 'repeat', iteration: 1 }
          : { kind: 'loop', phase: command.mode === 'while' ? 'test' : 'body' }
    const control = frame.control
    this.loopAncestors.push(command.id)
    try {
      while (true) {
        await this.consumeWork()
        if (command.kind === 'loop' && control.kind === 'loop' && control.phase === 'test') {
          await this.beginCheckpointMutation()
          if (command.mode === 'forever') throw new Error('forever loop cannot resume at test')
          const selected = this.host.evalCondition(command.cond, {
            self: this.self,
            timing: this.runningTiming,
          })
          if (command.mode === 'while' ? !selected : selected) return
          control.phase = 'body'
          this.checkpoint(true)
        }
        try {
          await this.runCommands(command.body, [...path, 'body'])
        } catch (error) {
          if (error instanceof LoopBroken) return
          if (!(error instanceof LoopContinued) || (error.loop && error.loop !== command.id))
            throw error
        }
        await this.beginCheckpointMutation()
        if (command.kind === 'repeat' && control.kind === 'repeat') {
          if (control.iteration >= command.count) return
          control.iteration++
        } else if (command.kind === 'loop' && control.kind === 'loop') {
          control.phase = command.mode === 'forever' ? 'body' : 'test'
        } else throw new Error('ScriptRunnerCore: 循环控制帧类型不匹配')
        this.checkpoint(true)
      }
    } finally {
      this.loopAncestors.pop()
    }
  }

  private async callScript(
    command: Extract<ExecutableCommandLike<RuntimeLeafCommand>, { kind: 'callScript' }>,
    path: readonly (number | string)[],
  ): Promise<void> {
    if (!this.resolver) throw new Error(`ScriptRunnerCore: 无 resolver，无法解析 ${command.script}`)
    if (this.callDepth >= ScriptRunnerCore.MAX_CALL_DEPTH)
      throw new Error(
        `ScriptRunnerCore: callScript 调用深度超过 ${ScriptRunnerCore.MAX_CALL_DEPTH}`,
      )
    const script = await this.resolver.resolve(command.script, this.runningTiming, this.signal)
    if (script.id !== command.script)
      throw new Error(`ScriptRunnerCore: resolver 返回错误 script id ${script.id}`)
    if (script.compilerVersion !== SCRIPT_COMPILER_VERSION)
      throw new Error(`ScriptRunnerCore: shared ${script.id} compilerVersion 不匹配`)
    if (
      script.canonicalContentDigest !== this.runningDigest ||
      script.timing !== this.runningTiming
    )
      throw new Error(`ScriptRunnerCore: shared ${script.id} executable cache 已过期`)
    const inherited = command.self ?? this.self
    if (script.self === 'none' && command.self)
      throw new Error(`ScriptRunnerCore: ${command.script} self=none，禁止显式 self`)
    if (script.self === 'required' && !inherited)
      throw new Error(`ScriptRunnerCore: ${command.script} 需要 self`)
    const previousSelf = this.self
    const previousRootScope = this.runningRootScope
    const previousLoops = this.loopAncestors
    this.runningRootScope = 'script'
    this.loopAncestors = []
    this.self =
      script.self === 'none'
        ? undefined
        : inherited === undefined
          ? undefined
          : structuredClone(inherited)
    this.callDepth++
    try {
      await this.runCommands(script.body, [...path, `call:${script.id}`])
    } catch (error) {
      if (!(error instanceof ScriptReturned)) throw error
    } finally {
      this.runningRootScope = previousRootScope
      this.loopAncestors = previousLoops
      this.callDepth--
      this.self = previousSelf
    }
  }

  private runningTiming: ScriptTiming = 'interactive'
  private runningRootScope: ScriptRootScope = 'flow'
  private runningDigest = ''

  private async awaitGate(boundary?: ScriptGateBoundary): Promise<void> {
    const decision = await this.host.gate?.(this.signal, boundary)
    throwIfAborted(this.signal)
    if (decision === 'stop') throw new ScriptStopped()
  }
}
