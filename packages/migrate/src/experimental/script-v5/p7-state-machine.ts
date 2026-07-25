import type {
  AuthorCommandV5,
  ScriptFlowV5,
  ScriptStateMachineV5,
  StateTransitionV5,
} from '@type-pal/content'
import { p7OwnerKey, projectP7AuthorCommands, projectP7AuthorCondition } from './p7-canonical.js'
import type {
  P4AuthorOwnerIdentity,
  P5AuthorTransitionAllocation,
  P5CycleStructure,
  ScriptMigrationIRP6,
} from './types.js'

interface SourceCommand {
  path: string
  value: unknown
}

type CanonicalState = ScriptStateMachineV5['states'][string]

function clone<T>(value: T): T {
  return structuredClone(value)
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function transitionCommandIndex(transition: P5AuthorTransitionAllocation, path: string): number {
  const suffix =
    transition.trigger.kind === 'body-end'
      ? ''
      : transition.trigger.kind === 'condition'
        ? '/then/0'
        : '/onNo/0'
  const match = new RegExp(`^/(\\d+)${suffix}$`).exec(transition.sourcePointer)
  if (!match)
    throw new Error(
      `${path}:${transition.transitionId}: unsupported source pointer ${transition.sourcePointer}`,
    )
  return Number(match[1])
}

class StateIdAllocator {
  private continuationOrdinal = 0
  private exitOrdinal = 0

  constructor(private readonly used: Set<string>) {}

  continuation(): string {
    return this.next('continuation', 'legacy-continuation', ++this.continuationOrdinal)
  }

  exit(): string {
    return this.next('exit', 'legacy-exit', ++this.exitOrdinal)
  }

  private next(first: string, prefix: string, ordinal: number): string {
    let current = ordinal
    while (true) {
      const id = current === 1 ? first : `${prefix}-${String(current).padStart(3, '0')}`
      if (!this.used.has(id)) {
        this.used.add(id)
        return id
      }
      current++
      if (prefix === 'legacy-continuation') this.continuationOrdinal = current
      else this.exitOrdinal = current
    }
  }
}

class P7CycleStateMachineProjector {
  private readonly context
  private readonly projection
  private readonly stateIdByLegacyScript
  private readonly states = new Map<string, CanonicalState>()
  private readonly stateOrder: string[] = []
  private readonly allocator
  private readonly exitStateByFragment = new Map<string, string>()
  private readonly ownerFragments

  constructor(
    private readonly args: {
      ir: ScriptMigrationIRP6
      cycle: P5CycleStructure
      owner: P4AuthorOwnerIdentity
      entityScenes: ReadonlyMap<string, readonly string[]>
      completion: StateTransitionV5
    },
  ) {
    if (args.cycle.authorProjection.kind !== 'state-machine')
      throw new Error(`${args.cycle.identity.cycleId}: 期望 state-machine`)
    this.projection = args.cycle.authorProjection
    this.context = {
      ir: args.ir,
      owner: args.owner,
      entityScenes: args.entityScenes,
    }
    this.stateIdByLegacyScript = new Map(
      this.projection.states.map((state) => [state.legacyScriptId, state.id]),
    )
    const used = new Set(this.projection.states.map((state) => state.id))
    this.allocator = new StateIdAllocator(used)
    for (const state of this.projection.states) this.stateOrder.push(state.id)
    this.ownerFragments = new Map(
      args.ir.ownerFragments
        .filter((fragment) => p7OwnerKey(fragment.owner) === p7OwnerKey(args.owner))
        .map((fragment) => [fragment.legacyScriptId, fragment]),
    )
  }

  project(): Extract<ScriptFlowV5, { kind: 'stateMachine' }> {
    for (const sourceState of this.projection.states) {
      const transitions = this.args.cycle.transitions
        .filter((transition) => transition.from.legacyScriptId === sourceState.legacyScriptId)
        .sort(
          (left, right) =>
            transitionCommandIndex(left, this.args.cycle.identity.cycleId) -
            transitionCommandIndex(right, this.args.cycle.identity.cycleId),
        )
      this.compileState(
        sourceState.id,
        sourceState.label,
        sourceState.body.map((value, index) => ({ path: `/${index}`, value })),
        transitions,
        clone(this.args.completion),
      )
    }
    const ownerFlow = this.args.cycle.ownerFlows.find(
      (flow) => p7OwnerKey(flow.identity.owner) === p7OwnerKey(this.args.owner),
    )
    if (!ownerFlow?.machineId)
      throw new Error(
        `${this.args.cycle.identity.cycleId}: owner flow 缺 machine id ${p7OwnerKey(this.args.owner)}`,
      )
    const states = Object.fromEntries(
      this.stateOrder.map((id) => {
        const state = this.states.get(id)
        if (!state) throw new Error(`${this.args.cycle.identity.cycleId}: state 未生成 ${id}`)
        return [id, state]
      }),
    )
    return {
      kind: 'stateMachine',
      machine: {
        id: ownerFlow.machineId,
        label: `迁移状态机 ${ownerFlow.machineId}`,
        initial: this.projection.initialStateId,
        states,
      },
    }
  }

  private compileState(
    stateId: string,
    label: string,
    commands: SourceCommand[],
    transitions: P5AuthorTransitionAllocation[],
    completion: StateTransitionV5,
  ): void {
    if (this.states.has(stateId))
      throw new Error(`${this.args.cycle.identity.cycleId}: 重复生成 state ${stateId}`)
    if (transitions.length === 0) {
      this.states.set(stateId, {
        label,
        body: this.commands(commands, `${stateId}.body`),
        next: completion,
      })
      return
    }

    const transition = transitions[0]!
    const commandIndex = transitionCommandIndex(transition, this.args.cycle.identity.cycleId)
    const position = commands.findIndex((command) => command.path === `/${commandIndex}`)
    if (position < 0)
      throw new Error(
        `${this.args.cycle.identity.cycleId}:${transition.transitionId}: source command missing`,
      )
    const source = record(
      commands[position]!.value,
      `${this.args.cycle.identity.cycleId}:${transition.transitionId}`,
    )
    const prefix = commands.slice(0, position)
    const remaining = transitions.slice(1)

    if (transition.trigger.kind === 'body-end') {
      if (source.kind !== 'n3P5FlowExit')
        throw new Error(`${transition.transitionId}: body-end 未命中 n3P5FlowExit`)
      if (remaining.length)
        throw new Error(`${transition.transitionId}: body-end 后仍有 transition`)
      this.states.set(stateId, {
        label,
        body: this.commands(prefix, `${stateId}.body`),
        next: this.transfer(transition),
      })
      return
    }

    if (transition.trigger.kind === 'condition') {
      if (source.kind !== 'branch') throw new Error(`${transition.transitionId}: 期望 branch`)
      const thenCommands = source.then
      if (
        !Array.isArray(thenCommands) ||
        record(thenCommands[0], `${transition.transitionId}.then[0]`).kind !== 'n3P5FlowExit'
      )
        throw new Error(`${transition.transitionId}: branch.then[0] 未命中 n3P5FlowExit`)
      const fallback = [
        ...(Array.isArray(source.else)
          ? source.else.map((value, index) => ({
              path: `/${commandIndex}/else/${index}`,
              value,
            }))
          : []),
        ...commands.slice(position + 1),
      ]
      this.states.set(stateId, {
        label,
        body: this.commands(prefix, `${stateId}.body`),
        next: {
          kind: 'branch',
          cond: projectP7AuthorCondition(
            transition.trigger.cond,
            this.context,
            `${stateId}.next.cond`,
          ),
          then: this.transfer(transition),
          else: this.continuation(fallback, remaining, completion),
        },
      })
      return
    }

    if (source.kind !== 'confirm')
      throw new Error(`${transition.transitionId}: command-outcome 期望 confirm`)
    const onNo = source.onNo
    if (
      !Array.isArray(onNo) ||
      record(onNo[0], `${transition.transitionId}.onNo[0]`).kind !== 'n3P5FlowExit'
    )
      throw new Error(`${transition.transitionId}: confirm.onNo[0] 未命中 n3P5FlowExit`)
    const commandId = transition.transitionId.replace(/^legacy-transition-/, 'legacy-choice-')
    const confirm: AuthorCommandV5 = { kind: 'confirm', id: commandId, onNo: [] }
    const fallback = commands.slice(position + 1)
    this.states.set(stateId, {
      label,
      body: [...this.commands(prefix, `${stateId}.body`), confirm],
      next: {
        kind: 'commandOutcome',
        commandId,
        command: 'confirm',
        outcome: 'no',
        then: this.transfer(transition),
        else: this.continuation(fallback, remaining, completion),
      },
    })
  }

  private continuation(
    commands: SourceCommand[],
    transitions: P5AuthorTransitionAllocation[],
    completion: StateTransitionV5,
  ): StateTransitionV5 {
    if (commands.length === 0 && transitions.length === 0) return clone(completion)
    const stateId = this.allocator.continuation()
    this.stateOrder.push(stateId)
    this.compileState(stateId, `同步继续 ${stateId}`, commands, transitions, clone(completion))
    return { kind: 'continue', state: stateId }
  }

  private transfer(transition: P5AuthorTransitionAllocation): StateTransitionV5 {
    if (transition.target.kind === 'cycle') {
      if (transition.target.cycleId !== this.args.cycle.identity.cycleId)
        throw new Error(
          `${transition.transitionId}: state-machine 跨 cycle ${transition.target.cycleId}`,
        )
      const state = this.stateIdByLegacyScript.get(transition.target.legacyScriptId)
      if (!state) throw new Error(`${transition.transitionId}: target state 缺失`)
      return { kind: 'to', state, yield: transition.scheduling }
    }

    let state = this.exitStateByFragment.get(transition.target.legacyScriptId)
    if (!state) {
      const fragment = this.ownerFragments.get(transition.target.legacyScriptId)
      if (!fragment)
        throw new Error(
          `${transition.transitionId}: owner fragment 缺失 ${transition.target.legacyScriptId}`,
        )
      state = this.allocator.exit()
      this.exitStateByFragment.set(transition.target.legacyScriptId, state)
      this.stateOrder.push(state)
      this.states.set(state, {
        label: `退出 ${state}`,
        body: projectP7AuthorCommands(fragment.body, this.context, `${state}.body`),
        next: clone(this.args.completion),
      })
    }
    return { kind: 'to', state, yield: transition.scheduling }
  }

  private commands(commands: SourceCommand[], path: string): AuthorCommandV5[] {
    return projectP7AuthorCommands(
      commands.map((command) => command.value),
      this.context,
      path,
    )
  }
}

/**
 * Projects one P5 irreducible cycle to a self-contained canonical v5 state machine.
 * Owner-stage merging is a later P7 step; completion defaults to staying on this flow.
 */
export function projectP7CycleStateMachine(args: {
  ir: ScriptMigrationIRP6
  cycle: P5CycleStructure
  owner: P4AuthorOwnerIdentity
  entityScenes: ReadonlyMap<string, readonly string[]>
  completion?: StateTransitionV5
}): Extract<ScriptFlowV5, { kind: 'stateMachine' }> {
  return new P7CycleStateMachineProjector({
    ...args,
    completion: args.completion ?? { kind: 'stay' },
  }).project()
}
