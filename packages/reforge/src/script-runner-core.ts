import type {
  AuthorCondition,
  AutoCommandFrame,
  AutoScriptContinuation,
  BaseStateTransition,
  EntityAddress,
  FlowCursor,
  SceneReveal,
} from '@type-pal/content'
import { flowCanComplete } from '@type-pal/content'
import type { BattleResult } from './battle/battle-result.js'
import {
  type BaseRuntimeLeafCommand,
  type ExecutableBaseCommand,
  type ExecutableBaseScriptFlowLike,
  type ExecutableCommandBoundary,
  type ExecutableCommandLike,
  type ExecutableSharedScriptLike,
  SCRIPT_COMPILER_VERSION,
  type ScriptBoundaryPolicy,
  type ScriptTiming,
} from './script-compiler-core.js'
import {
  SCRIPT_MAX_CALL_DEPTH,
  type ScriptContinuationLocation,
  validateScriptContinuation,
} from './script-continuation.js'

type BattleRequest = Extract<ExecutableBaseCommand, { kind: 'startBattle' }>['request']

export type ScriptGateBoundary =
  | { kind: 'settlement' }
  | { kind: 'continuation'; reachSafePoint(): SafePointDecision | Promise<SafePointDecision> }

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
  confirm(signal: AbortSignal): Promise<boolean>
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
    boundaryPolicy: ScriptBoundaryPolicy,
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
    super('script stopped by stopScript')
  }
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('script aborted', 'AbortError')
}

function assertState(states: Readonly<Record<string, unknown>>, state: string, path: string): void {
  if (!Object.hasOwn(states, state)) throw new Error(`${path}: state 不存在 ${state}`)
}

export class ScriptRunnerCore<RuntimeLeafCommand = BaseRuntimeLeafCommand> {
  private static readonly MAX_CALL_DEPTH = SCRIPT_MAX_CALL_DEPTH
  private static readonly MAX_SYNCHRONOUS_STATE_TRANSITIONS = 4096
  private callDepth = 0
  private self?: EntityAddress
  private checkpointController?: FlowCursorController
  private checkpointCursor?: FlowCursor
  private resumeFrames: AutoCommandFrame[] = []
  private readonly frames: AutoCommandFrame[] = []
  private checkpointOutcomes = new Map<string, { command: 'confirm'; no: boolean }>()
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
  ) {}

  async runFlow(
    executable: ExecutableBaseScriptFlowLike<RuntimeLeafCommand>,
    options: RunBaseScriptFlowOptions,
  ): Promise<void> {
    if (executable.compilerVersion !== SCRIPT_COMPILER_VERSION)
      throw new Error(`ScriptRunnerCore: compilerVersion ${executable.compilerVersion} 不受支持`)
    if (executable.boundaryPolicy !== 'perCommand' && executable.boundaryPolicy !== 'transition')
      throw new Error(
        `ScriptRunnerCore: boundaryPolicy ${String(executable.boundaryPolicy)} 不受支持`,
      )
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
    const previousBoundaryPolicy = this.runningBoundaryPolicy
    const previousDigest = this.runningDigest
    this.self = options.self === undefined ? undefined : structuredClone(options.self)
    this.runningTiming = executable.timing
    this.runningBoundaryPolicy = executable.boundaryPolicy
    this.runningDigest = executable.canonicalContentDigest
    this.checkpointController = options.cursorController.checkpointEnabled
      ? options.cursorController
      : undefined
    this.resumeFrames = structuredClone(options.resume?.frames ?? [])
    this.checkpointOutcomes = new Map(Object.entries(options.resume?.outcomes ?? {}))
    this.running = true
    try {
      if (executable.flow.kind === 'stages') await this.runStages(executable, options)
      else await this.runStateMachine(executable, options)
    } finally {
      this.self = previousSelf
      this.runningTiming = previousTiming
      this.runningBoundaryPolicy = previousBoundaryPolicy
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
        outcomes: Object.fromEntries(this.checkpointOutcomes),
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

  private async runStages(
    executable: ExecutableBaseScriptFlowLike<RuntimeLeafCommand>,
    options: RunBaseScriptFlowOptions,
  ): Promise<void> {
    if (executable.flow.kind !== 'stages') throw new Error('ScriptRunnerCore: 期望 stages flow')
    const stageId =
      options.cursor === undefined
        ? executable.flow.initial
        : options.cursor.kind === 'stage'
          ? options.cursor.stage
          : (() => {
              throw new Error('ScriptRunnerCore: state cursor 不能运行 stages flow')
            })()
    const stage = executable.flow.stages.find((candidate) => candidate.id === stageId)
    if (!stage) throw new Error(`ScriptRunnerCore: stage cursor 不存在 ${stageId}`)
    try {
      this.checkpointCursor = { kind: 'stage', stage: stageId }
      await this.awaitGate()
      if (options.runSceneEntry && stage.entry) {
        if (!options.allowSceneEntry)
          throw new Error('ScriptRunnerCore: 非 onEnter flow 禁止执行 scene entry')
        if (!this.host.revealSceneEntry)
          throw new Error('ScriptRunnerCore: host 未实现 revealSceneEntry')
        await this.runCommands(stage.entry.prepare, [stage.id, 'entry', 'prepare'])
        throwIfAborted(this.signal)
        await this.awaitGate()
        await this.host.revealSceneEntry(stage.entry.reveal, this.signal)
        throwIfAborted(this.signal)
      }
      await this.runCommands(stage.body, [stage.id])
      throwIfAborted(this.signal)
      await this.awaitGate({ kind: 'settlement' })
      await options.cursorController.reachSafePoint(
        typeof stage.next === 'object'
          ? { kind: 'completed' }
          : { kind: 'stage', stage: stage.next ?? stage.id },
      )
    } catch (error) {
      if (!(error instanceof ScriptStopped)) throw error
    }
  }

  private async runStateMachine(
    executable: ExecutableBaseScriptFlowLike<RuntimeLeafCommand>,
    options: RunBaseScriptFlowOptions,
  ): Promise<void> {
    if (executable.flow.kind !== 'stateMachine')
      throw new Error('ScriptRunnerCore: 期望 stateMachine flow')
    const { machine } = executable.flow
    let stateId =
      options.cursor === undefined
        ? machine.initial
        : options.cursor.kind === 'state'
          ? (() => {
              if (options.cursor.machine !== machine.id)
                throw new Error(
                  `ScriptRunnerCore: machine cursor ${options.cursor.machine} 不匹配 ${machine.id}`,
                )
              return options.cursor.state
            })()
          : (() => {
              throw new Error('ScriptRunnerCore: stage cursor 不能运行 stateMachine flow')
            })()
    assertState(machine.states, stateId, `machine ${machine.id}`)
    let firstState = true
    let synchronousTransitions = 0
    let continuation: ScriptGateBoundary | undefined
    try {
      while (true) {
        throwIfAborted(this.signal)
        await this.checkpointGate()
        this.checkpointCursor = { kind: 'state', machine: machine.id, state: stateId }
        await this.awaitGate(continuation)
        continuation = undefined
        const state = machine.states[stateId]
        if (!state) throw new Error(`ScriptRunnerCore: state 不存在 ${stateId}`)
        if (firstState && options.runSceneEntry && state.entry) {
          if (!options.allowSceneEntry)
            throw new Error('ScriptRunnerCore: 非 onEnter flow 禁止执行 scene entry')
          if (!this.host.revealSceneEntry)
            throw new Error('ScriptRunnerCore: host 未实现 revealSceneEntry')
          await this.runCommands(state.entry.prepare, [machine.id, stateId, 'entry', 'prepare'])
          throwIfAborted(this.signal)
          await this.awaitGate()
          await this.host.revealSceneEntry(state.entry.reveal, this.signal)
          throwIfAborted(this.signal)
        }
        const outcomes = firstState
          ? this.checkpointOutcomes
          : new Map<string, { command: 'confirm'; no: boolean }>()
        firstState = false
        this.checkpointOutcomes = outcomes
        await this.runCommands(state.body, [machine.id, stateId], outcomes, true)
        throwIfAborted(this.signal)
        await this.checkpointGate()
        // Once a transition condition has been evaluated, commit its selected target before
        // allowing a snapshot. Loading the old state's end must not redraw an already-made choice.
        await this.beginCheckpointMutation()
        const transition = this.resolveTransition(state.next, outcomes)
        if (transition.kind === 'complete') {
          await this.awaitGate({ kind: 'settlement' })
          await options.cursorController.reachSafePoint({ kind: 'completed' })
          return
        }
        if (transition.kind === 'continue') {
          assertState(machine.states, transition.state, `${machine.id}.${stateId}.next`)
          synchronousTransitions++
          if (synchronousTransitions > ScriptRunnerCore.MAX_SYNCHRONOUS_STATE_TRANSITIONS)
            throw new Error(
              `ScriptRunnerCore: machine ${machine.id} 的 continue 链超过 ` +
                `${ScriptRunnerCore.MAX_SYNCHRONOUS_STATE_TRANSITIONS}（state ${stateId}）`,
            )
          stateId = transition.state
          if (this.checkpointController)
            await options.cursorController.reachSafePoint({
              kind: 'state',
              machine: machine.id,
              state: stateId,
            })
          continue
        }
        const target =
          transition.kind === 'stay'
            ? stateId
            : transition.kind === 'restart'
              ? machine.initial
              : transition.state
        assertState(machine.states, target, `${machine.id}.${stateId}.next`)
        await this.awaitGate({ kind: 'settlement' })
        const cursor: FlowCursor = {
          kind: 'state',
          machine: machine.id,
          state: target,
        }
        const decision = await options.cursorController.reachSafePoint(cursor)
        if (transition.kind !== 'to' || decision === 'stop') return
        continuation = {
          kind: 'continuation',
          reachSafePoint: () => options.cursorController.reachSafePoint(cursor),
        }
        if (transition.yield === 'macroTask') await this.host.yieldMacroTask(this.signal)
        else await this.host.waitWorldTick(this.signal)
        throwIfAborted(this.signal)
        synchronousTransitions = 0
        stateId = target
      }
    } catch (error) {
      if (!(error instanceof ScriptStopped)) throw error
    }
  }

  private resolveTransition(
    transition: BaseStateTransition,
    outcomes: ReadonlyMap<string, { command: 'confirm'; no: boolean }>,
  ): Exclude<BaseStateTransition, { kind: 'branch' | 'commandOutcome' }> {
    if (transition.kind === 'branch')
      return this.resolveTransition(
        this.host.evalCondition(transition.cond, {
          self: this.self,
          timing: this.runningTiming,
        })
          ? transition.then
          : transition.else,
        outcomes,
      )
    if (transition.kind === 'commandOutcome') {
      const outcome = outcomes.get(transition.commandId)
      if (!outcome)
        throw new Error(`ScriptRunnerCore: commandOutcome 未找到已执行命令 ${transition.commandId}`)
      if (outcome.command !== transition.command)
        throw new Error(`ScriptRunnerCore: commandOutcome ${transition.commandId} 类型不匹配`)
      return this.resolveTransition(outcome.no ? transition.then : transition.else, outcomes)
    }
    return transition
  }

  private async runCommands(
    commands: readonly ExecutableCommandLike<RuntimeLeafCommand>[],
    path: readonly (number | string)[],
    outcomes?: Map<string, { command: 'confirm'; no: boolean }>,
    recordTopLevelOutcomes = false,
  ): Promise<void> {
    if (this.frames.length >= 256) throw new Error('ScriptRunnerCore: 执行帧深度超过256')
    const frame = this.resumeFrames.shift() ?? { index: 0 }
    this.frames.push(frame)
    try {
      this.checkpoint(true)
      for (let index = frame.index; index < commands.length; index++) {
        const command = commands[index]
        if (!command) throw new Error('ScriptRunnerCore: 指令不存在')
        throwIfAborted(this.signal)
        await this.checkpointGate()
        const commandPath = [...path, index]
        if (this.beforeStep) await this.beforeStep({ path: commandPath, command })
        await this.awaitGate()
        await this.beginCheckpointMutation()
        this.onStep?.({ path: commandPath, command })
        await this.runCommand(command, commandPath, outcomes, recordTopLevelOutcomes)
        throwIfAborted(this.signal)
        frame.index = index + 1
        delete frame.control
        this.checkpoint(true)
        await this.runBoundaries(command.after)
      }
    } finally {
      this.frames.pop()
    }
  }

  private async runCommand(
    command: ExecutableCommandLike<RuntimeLeafCommand>,
    path: readonly (number | string)[],
    outcomes: Map<string, { command: 'confirm'; no: boolean }> | undefined,
    recordOutcome: boolean,
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
        await this.host.execute(
          command.command,
          {
            self: this.self,
            timing: this.runningTiming,
            ...(autoMotionCheckpoint ? { autoMotionCheckpoint } : {}),
          },
          this.signal,
        )
        return
      }
      case 'stop':
        throw new ScriptStopped()
      case 'branch': {
        const arm =
          frame.control?.kind === 'branch'
            ? frame.control.arm
            : this.host.evalCondition(command.cond, { self: this.self, timing: this.runningTiming })
              ? 'then'
              : 'else'
        frame.control = { kind: 'branch', arm }
        await this.runCommands(command[arm], [...path, 'branch'], outcomes)
        return
      }
      case 'loop':
        await this.runLoopCommand(command, path, outcomes)
        return
      case 'confirm': {
        const no =
          frame.control?.kind === 'confirm'
            ? frame.control.no
            : !(await this.host.confirm(this.signal))
        frame.control = { kind: 'confirm', no }
        if (recordOutcome && command.id) outcomes?.set(command.id, { command: 'confirm', no })
        if (no) await this.runCommands(command.onNo, [...path, 'onNo'], outcomes)
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
        if (body) await this.runCommands(body, [...path, arm], outcomes)
        return
      }
      case 'teleportOut': {
        const failed =
          frame.control?.kind === 'teleportOut'
            ? frame.control.failed
            : !(await this.host.teleportOut(this.signal))
        frame.control = { kind: 'teleportOut', failed }
        if (failed && command.onFail)
          await this.runCommands(command.onFail, [...path, 'onFail'], outcomes)
        return
      }
      case 'callScript':
        await this.callScript(command, path, outcomes)
        return
    }
  }

  private async runLoopCommand(
    command: Extract<ExecutableCommandLike<RuntimeLeafCommand>, { kind: 'loop' }>,
    path: readonly (number | string)[],
    outcomes: Map<string, { command: 'confirm'; no: boolean }> | undefined,
  ): Promise<void> {
    const frame = this.frames.at(-1)
    if (!frame) throw new Error('ScriptRunnerCore: 缺少loop执行帧')
    const condition = () =>
      this.host.evalCondition(command.cond, { self: this.self, timing: this.runningTiming })
    let control = frame.control?.kind === 'loop' ? frame.control : undefined
    if (!control) {
      if (command.mode === 'while' && !condition()) return
      control = { kind: 'loop', iteration: 1, phase: 'body' }
      frame.control = control
    }
    while (true) {
      if (control.phase === 'body') {
        await this.runCommands(command.body, [...path, `iteration:${control.iteration}`], outcomes)
        control.phase = 'test'
      }
      if (control.phase === 'test') {
        await this.beginCheckpointMutation()
        if (command.mode === 'until' && condition()) return
        control.phase = 'next'
      }
      this.checkpoint(true)
      await this.host.waitWorldTick(this.signal)
      throwIfAborted(this.signal)
      await this.beginCheckpointMutation()
      if (command.mode === 'while' && !condition()) return
      if (control.iteration >= command.maxIterations)
        throw new Error(`ScriptRunnerCore: loop 超过 maxIterations=${command.maxIterations}`)
      control.iteration++
      control.phase = 'body'
    }
  }

  private async callScript(
    command: Extract<ExecutableCommandLike<RuntimeLeafCommand>, { kind: 'callScript' }>,
    path: readonly (number | string)[],
    outcomes: Map<string, { command: 'confirm'; no: boolean }> | undefined,
  ): Promise<void> {
    if (!this.resolver) throw new Error(`ScriptRunnerCore: 无 resolver，无法解析 ${command.script}`)
    if (this.callDepth >= ScriptRunnerCore.MAX_CALL_DEPTH)
      throw new Error(
        `ScriptRunnerCore: callScript 调用深度超过 ${ScriptRunnerCore.MAX_CALL_DEPTH}`,
      )
    const script = await this.resolver.resolve(
      command.script,
      this.runningTiming,
      this.runningBoundaryPolicy,
      this.signal,
    )
    if (script.id !== command.script)
      throw new Error(`ScriptRunnerCore: resolver 返回错误 script id ${script.id}`)
    if (script.compilerVersion !== SCRIPT_COMPILER_VERSION)
      throw new Error(`ScriptRunnerCore: shared ${script.id} compilerVersion 不匹配`)
    if (
      script.canonicalContentDigest !== this.runningDigest ||
      script.timing !== this.runningTiming ||
      script.boundaryPolicy !== this.runningBoundaryPolicy
    )
      throw new Error(`ScriptRunnerCore: shared ${script.id} executable cache 已过期`)
    const inherited = command.self ?? this.self
    if (script.self === 'none' && command.self)
      throw new Error(`ScriptRunnerCore: ${command.script} self=none，禁止显式 self`)
    if (script.self === 'required' && !inherited)
      throw new Error(`ScriptRunnerCore: ${command.script} 需要 self`)
    const previousSelf = this.self
    this.self =
      script.self === 'none'
        ? undefined
        : inherited === undefined
          ? undefined
          : structuredClone(inherited)
    this.callDepth++
    try {
      await this.runCommands(script.body, [...path, `call:${script.id}`], outcomes)
    } catch (error) {
      if (!(error instanceof ScriptStopped)) throw error
    } finally {
      this.callDepth--
      this.self = previousSelf
    }
  }

  private runningTiming: ScriptTiming = 'interactive'
  private runningBoundaryPolicy: ScriptBoundaryPolicy = 'perCommand'
  private runningDigest = ''

  private async awaitGate(boundary?: ScriptGateBoundary): Promise<void> {
    const decision = await this.host.gate?.(this.signal, boundary)
    throwIfAborted(this.signal)
    if (decision === 'stop') throw new ScriptStopped()
  }

  private async runBoundaries(boundaries: readonly ExecutableCommandBoundary[]): Promise<void> {
    for (const boundary of boundaries) {
      await this.host.wait(boundary.ms, this.signal)
      throwIfAborted(this.signal)
    }
  }
}
