import type {
  AuthorConditionV5,
  EntityAddress,
  FlowCursor,
  SceneReveal,
  StateTransitionV5,
} from '@type-pal/content'
import {
  type ExecutableCommandBoundaryV5,
  type ExecutableCommandV5,
  type ExecutableScriptFlowV5,
  type ExecutableSharedScriptV5,
  type RuntimeLeafCommandV5,
  SCRIPT_COMPILER_V5_VERSION,
  type ScriptBoundaryPolicyV5,
  type ScriptTimingV5,
} from './script-compiler-v5.js'
import type { BattleResult } from './battle/battle-result.js'

type BattleRequestV5 = Extract<ExecutableCommandV5, { kind: 'startBattle' }>['request']

export interface ScriptRuntimeContextV5 {
  self?: EntityAddress
  timing?: ScriptTimingV5
}

export interface ScriptRuntimeHostV5 {
  /**
   * 宿主级执行门。中央 modal 可用它冻结所有 v5 runner（包括 auto、shared、
   * item-private），而不只暂停 main tick 的物理推进。
   */
  gate?(signal: AbortSignal): void | Promise<void>
  execute(
    command: RuntimeLeafCommandV5,
    context: Readonly<ScriptRuntimeContextV5>,
    signal: AbortSignal,
  ): void | Promise<void>
  evalCondition(condition: AuthorConditionV5, context: Readonly<ScriptRuntimeContextV5>): boolean
  confirm(signal: AbortSignal): Promise<boolean>
  startBattle(request: BattleRequestV5, signal: AbortSignal): Promise<BattleResult>
  teleportOut(signal: AbortSignal): Promise<boolean>
  revealSceneEntry?(reveal: SceneReveal, signal: AbortSignal): Promise<void>
  wait(ms: number, signal: AbortSignal): Promise<void>
  waitWorldTick(signal: AbortSignal): Promise<void>
  yieldMacroTask(signal: AbortSignal): Promise<void>
}

export interface SharedScriptResolverV5 {
  resolve(
    id: string,
    timing: ScriptTimingV5,
    boundaryPolicy: ScriptBoundaryPolicyV5,
    signal: AbortSignal,
  ): ExecutableSharedScriptV5 | Promise<ExecutableSharedScriptV5>
}

export type SafePointDecisionV5 = 'continue' | 'stop'

export interface FlowCursorControllerV5 {
  /**
   * Atomically CAS-commits the persistent cursor for the activation lease and enters the
   * save barrier. `stop` means the cursor was committed (or the lease became stale) but
   * this activation must not cross the safe-point.
   */
  reachSafePoint(cursor: FlowCursor): SafePointDecisionV5 | Promise<SafePointDecisionV5>
}

export interface ScriptStepEventV5 {
  path: readonly (number | string)[]
  command: ExecutableCommandV5
}

export interface RunScriptFlowV5Options {
  cursor?: FlowCursor
  cursorController: FlowCursorControllerV5
  allowSceneEntry?: boolean
  runSceneEntry?: boolean
  self?: EntityAddress
}

class ScriptStoppedV5 extends Error {
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

export class ScriptRunnerV5 {
  private static readonly MAX_CALL_DEPTH = 128
  private static readonly MAX_SYNCHRONOUS_STATE_TRANSITIONS = 4096
  private callDepth = 0
  private self?: EntityAddress
  running = false
  onStep?: (event: ScriptStepEventV5) => void

  constructor(
    private readonly host: ScriptRuntimeHostV5,
    private readonly signal: AbortSignal,
    private readonly resolver?: SharedScriptResolverV5,
  ) {}

  async runFlow(
    executable: ExecutableScriptFlowV5,
    options: RunScriptFlowV5Options,
  ): Promise<void> {
    if (executable.compilerVersion !== SCRIPT_COMPILER_V5_VERSION)
      throw new Error(`ScriptRunnerV5: compilerVersion ${executable.compilerVersion} 不受支持`)
    if (executable.boundaryPolicy !== 'perCommand' && executable.boundaryPolicy !== 'transition')
      throw new Error(
        `ScriptRunnerV5: boundaryPolicy ${String(executable.boundaryPolicy)} 不受支持`,
      )
    const previousSelf = this.self
    const previousTiming = this.runningTiming
    const previousBoundaryPolicy = this.runningBoundaryPolicy
    const previousDigest = this.runningDigest
    this.self = options.self === undefined ? undefined : structuredClone(options.self)
    this.runningTiming = executable.timing
    this.runningBoundaryPolicy = executable.boundaryPolicy
    this.runningDigest = executable.canonicalContentDigest
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
    }
  }

  private async runStages(
    executable: ExecutableScriptFlowV5,
    options: RunScriptFlowV5Options,
  ): Promise<void> {
    if (executable.flow.kind !== 'stages') throw new Error('ScriptRunnerV5: 期望 stages flow')
    const stageId =
      options.cursor === undefined
        ? executable.flow.initial
        : options.cursor.kind === 'stage'
          ? options.cursor.stage
          : (() => {
              throw new Error('ScriptRunnerV5: state cursor 不能运行 stages flow')
            })()
    const stage = executable.flow.stages.find((candidate) => candidate.id === stageId)
    if (!stage) throw new Error(`ScriptRunnerV5: stage cursor 不存在 ${stageId}`)
    try {
      await this.awaitGate()
      if (options.runSceneEntry && stage.entry) {
        if (!options.allowSceneEntry)
          throw new Error('ScriptRunnerV5: 非 onEnter flow 禁止执行 scene entry')
        if (!this.host.revealSceneEntry)
          throw new Error('ScriptRunnerV5: host 未实现 revealSceneEntry')
        await this.runCommands(stage.entry.prepare, [stage.id, 'entry', 'prepare'])
        throwIfAborted(this.signal)
        await this.awaitGate()
        await this.host.revealSceneEntry(stage.entry.reveal, this.signal)
        throwIfAborted(this.signal)
      }
      await this.runCommands(stage.body, [stage.id])
      throwIfAborted(this.signal)
      await this.awaitGate()
      await options.cursorController.reachSafePoint({
        kind: 'stage',
        stage: stage.next ?? stage.id,
      })
    } catch (error) {
      if (!(error instanceof ScriptStoppedV5)) throw error
    }
  }

  private async runStateMachine(
    executable: ExecutableScriptFlowV5,
    options: RunScriptFlowV5Options,
  ): Promise<void> {
    if (executable.flow.kind !== 'stateMachine')
      throw new Error('ScriptRunnerV5: 期望 stateMachine flow')
    const { machine } = executable.flow
    let stateId =
      options.cursor === undefined
        ? machine.initial
        : options.cursor.kind === 'state'
          ? (() => {
              if (options.cursor.machine !== machine.id)
                throw new Error(
                  `ScriptRunnerV5: machine cursor ${options.cursor.machine} 不匹配 ${machine.id}`,
                )
              return options.cursor.state
            })()
          : (() => {
              throw new Error('ScriptRunnerV5: stage cursor 不能运行 stateMachine flow')
            })()
    assertState(machine.states, stateId, `machine ${machine.id}`)
    let firstState = true
    let synchronousTransitions = 0
    try {
      while (true) {
        throwIfAborted(this.signal)
        await this.awaitGate()
        const state = machine.states[stateId]
        if (!state) throw new Error(`ScriptRunnerV5: state 不存在 ${stateId}`)
        if (firstState && options.runSceneEntry && state.entry) {
          if (!options.allowSceneEntry)
            throw new Error('ScriptRunnerV5: 非 onEnter flow 禁止执行 scene entry')
          if (!this.host.revealSceneEntry)
            throw new Error('ScriptRunnerV5: host 未实现 revealSceneEntry')
          await this.runCommands(state.entry.prepare, [machine.id, stateId, 'entry', 'prepare'])
          throwIfAborted(this.signal)
          await this.awaitGate()
          await this.host.revealSceneEntry(state.entry.reveal, this.signal)
          throwIfAborted(this.signal)
        }
        firstState = false
        const outcomes = new Map<string, { command: 'confirm'; no: boolean }>()
        await this.runCommands(state.body, [machine.id, stateId], outcomes, true)
        throwIfAborted(this.signal)
        const transition = this.resolveTransition(state.next, outcomes)
        if (transition.kind === 'continue') {
          assertState(machine.states, transition.state, `${machine.id}.${stateId}.next`)
          synchronousTransitions++
          if (synchronousTransitions > ScriptRunnerV5.MAX_SYNCHRONOUS_STATE_TRANSITIONS)
            throw new Error(
              `ScriptRunnerV5: machine ${machine.id} 的 continue 链超过 ` +
                `${ScriptRunnerV5.MAX_SYNCHRONOUS_STATE_TRANSITIONS}（state ${stateId}）`,
            )
          stateId = transition.state
          continue
        }
        const target =
          transition.kind === 'stay'
            ? stateId
            : transition.kind === 'restart'
              ? machine.initial
              : transition.state
        assertState(machine.states, target, `${machine.id}.${stateId}.next`)
        await this.awaitGate()
        const decision = await options.cursorController.reachSafePoint({
          kind: 'state',
          machine: machine.id,
          state: target,
        })
        if (transition.kind !== 'to' || decision === 'stop') return
        if (transition.yield === 'macroTask') await this.host.yieldMacroTask(this.signal)
        else await this.host.waitWorldTick(this.signal)
        throwIfAborted(this.signal)
        synchronousTransitions = 0
        stateId = target
      }
    } catch (error) {
      if (!(error instanceof ScriptStoppedV5)) throw error
    }
  }

  private resolveTransition(
    transition: StateTransitionV5,
    outcomes: ReadonlyMap<string, { command: 'confirm'; no: boolean }>,
  ): Exclude<StateTransitionV5, { kind: 'branch' | 'commandOutcome' }> {
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
        throw new Error(`ScriptRunnerV5: commandOutcome 未找到已执行命令 ${transition.commandId}`)
      if (outcome.command !== transition.command)
        throw new Error(`ScriptRunnerV5: commandOutcome ${transition.commandId} 类型不匹配`)
      return this.resolveTransition(outcome.no ? transition.then : transition.else, outcomes)
    }
    return transition
  }

  private async runCommands(
    commands: readonly ExecutableCommandV5[],
    path: readonly (number | string)[],
    outcomes?: Map<string, { command: 'confirm'; no: boolean }>,
    recordTopLevelOutcomes = false,
  ): Promise<void> {
    for (const [index, command] of commands.entries()) {
      throwIfAborted(this.signal)
      await this.awaitGate()
      const commandPath = [...path, index]
      this.onStep?.({ path: commandPath, command })
      await this.runCommand(command, commandPath, outcomes, recordTopLevelOutcomes)
      throwIfAborted(this.signal)
      await this.runBoundaries(command.after)
    }
  }

  private async runCommand(
    command: ExecutableCommandV5,
    path: readonly (number | string)[],
    outcomes: Map<string, { command: 'confirm'; no: boolean }> | undefined,
    recordOutcome: boolean,
  ): Promise<void> {
    switch (command.kind) {
      case 'leaf':
        await this.host.execute(
          command.command,
          { self: this.self, timing: this.runningTiming },
          this.signal,
        )
        return
      case 'stop':
        throw new ScriptStoppedV5()
      case 'branch':
        await this.runCommands(
          this.host.evalCondition(command.cond, {
            self: this.self,
            timing: this.runningTiming,
          })
            ? command.then
            : command.else,
          [...path, 'branch'],
          outcomes,
        )
        return
      case 'loop':
        await this.runLoopCommand(command, path, outcomes)
        return
      case 'confirm': {
        const accepted = await this.host.confirm(this.signal)
        if (!accepted) await this.runCommands(command.onNo, [...path, 'onNo'], outcomes)
        if (recordOutcome && command.id)
          outcomes?.set(command.id, { command: 'confirm', no: !accepted })
        return
      }
      case 'startBattle': {
        const result = await this.host.startBattle(command.request, this.signal)
        if (result === 'defeat' && command.onLose)
          await this.runCommands(command.onLose, [...path, 'onLose'], outcomes)
        if (result === 'playerFled' && command.onFlee)
          await this.runCommands(command.onFlee, [...path, 'onFlee'], outcomes)
        return
      }
      case 'teleportOut':
        if (!(await this.host.teleportOut(this.signal)) && command.onFail)
          await this.runCommands(command.onFail, [...path, 'onFail'], outcomes)
        return
      case 'callScript':
        await this.callScript(command, path, outcomes)
        return
    }
  }

  private async runLoopCommand(
    command: Extract<ExecutableCommandV5, { kind: 'loop' }>,
    path: readonly (number | string)[],
    outcomes: Map<string, { command: 'confirm'; no: boolean }> | undefined,
  ): Promise<void> {
    let iterations = 0
    if (command.mode === 'while') {
      while (
        this.host.evalCondition(command.cond, {
          self: this.self,
          timing: this.runningTiming,
        })
      ) {
        if (iterations >= command.maxIterations)
          throw new Error(`ScriptRunnerV5: loop 超过 maxIterations=${command.maxIterations}`)
        iterations++
        await this.runCommands(command.body, [...path, `iteration:${iterations}`], outcomes)
        await this.host.waitWorldTick(this.signal)
        throwIfAborted(this.signal)
      }
      return
    }
    while (true) {
      if (iterations >= command.maxIterations)
        throw new Error(`ScriptRunnerV5: loop 超过 maxIterations=${command.maxIterations}`)
      iterations++
      await this.runCommands(command.body, [...path, `iteration:${iterations}`], outcomes)
      if (
        this.host.evalCondition(command.cond, {
          self: this.self,
          timing: this.runningTiming,
        })
      )
        return
      await this.host.waitWorldTick(this.signal)
      throwIfAborted(this.signal)
    }
  }

  private async callScript(
    command: Extract<ExecutableCommandV5, { kind: 'callScript' }>,
    path: readonly (number | string)[],
    outcomes: Map<string, { command: 'confirm'; no: boolean }> | undefined,
  ): Promise<void> {
    if (!this.resolver) throw new Error(`ScriptRunnerV5: 无 resolver，无法解析 ${command.script}`)
    if (this.callDepth >= ScriptRunnerV5.MAX_CALL_DEPTH)
      throw new Error(`ScriptRunnerV5: callScript 调用深度超过 ${ScriptRunnerV5.MAX_CALL_DEPTH}`)
    const script = await this.resolver.resolve(
      command.script,
      this.runningTiming,
      this.runningBoundaryPolicy,
      this.signal,
    )
    if (script.id !== command.script)
      throw new Error(`ScriptRunnerV5: resolver 返回错误 script id ${script.id}`)
    if (script.compilerVersion !== SCRIPT_COMPILER_V5_VERSION)
      throw new Error(`ScriptRunnerV5: shared ${script.id} compilerVersion 不匹配`)
    if (
      script.canonicalContentDigest !== this.runningDigest ||
      script.timing !== this.runningTiming ||
      script.boundaryPolicy !== this.runningBoundaryPolicy
    )
      throw new Error(`ScriptRunnerV5: shared ${script.id} executable cache 已过期`)
    const inherited = command.self ?? this.self
    if (script.self === 'none' && command.self)
      throw new Error(`ScriptRunnerV5: ${command.script} self=none，禁止显式 self`)
    if (script.self === 'required' && !inherited)
      throw new Error(`ScriptRunnerV5: ${command.script} 需要 self`)
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
      if (!(error instanceof ScriptStoppedV5)) throw error
    } finally {
      this.callDepth--
      this.self = previousSelf
    }
  }

  private runningTiming: ScriptTimingV5 = 'interactive'
  private runningBoundaryPolicy: ScriptBoundaryPolicyV5 = 'perCommand'
  private runningDigest = ''

  private async awaitGate(): Promise<void> {
    await this.host.gate?.(this.signal)
    throwIfAborted(this.signal)
  }

  private async runBoundaries(boundaries: readonly ExecutableCommandBoundaryV5[]): Promise<void> {
    for (const boundary of boundaries) {
      await this.host.wait(boundary.ms, this.signal)
      throwIfAborted(this.signal)
    }
  }
}
