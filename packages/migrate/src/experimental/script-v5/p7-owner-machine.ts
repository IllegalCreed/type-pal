import type {
  AuthorCommandV5,
  AuthorSceneEntryPresentationV5,
  ScriptFlowV5,
  ScriptStateMachineV5,
  StateTransitionV5,
} from '@type-pal/content'
import { p7OwnerKey, projectP7AuthorCommands, projectP7AuthorCondition } from './p7-canonical.js'
import { projectP7CycleStateMachine } from './p7-state-machine.js'
import type {
  P4AuthorOwnerAllocation,
  P4OwnerFragment,
  P5CycleStructure,
  P5GeneratedFlowExit,
  ScriptMigrationIRP6,
} from './types.js'

type CanonicalState = ScriptStateMachineV5['states'][string]

export interface LegacyStageInput {
  entry?: {
    prepare: unknown
    reveal: unknown
  }
  next?: 'advance' | number
}

interface SourceCommand {
  path: string
  value: unknown
}

interface DetectedExit {
  kind: 'body-end' | 'condition' | 'command-outcome'
  position: number
  command: Record<string, unknown>
  exit: P5GeneratedFlowExit
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function stableTransition(value: StateTransitionV5): string {
  return JSON.stringify(value)
}

function countP5Exits(value: unknown): number {
  if (Array.isArray(value))
    return value.reduce<number>((total, child) => total + countP5Exits(child), 0)
  if (!value || typeof value !== 'object') return 0
  const command = value as Record<string, unknown>
  if (command.kind === 'n3P5FlowExit') return 1
  return Object.values(command).reduce<number>((total, child) => total + countP5Exits(child), 0)
}

function asP5Exit(value: unknown): P5GeneratedFlowExit | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  const command = value as Partial<P5GeneratedFlowExit>
  if (command.kind !== 'n3P5FlowExit') return
  return command as P5GeneratedFlowExit
}

class OwnerStateIdAllocator {
  private continuationOrdinal = 0
  private exitOrdinal = 0

  constructor(private readonly used: Set<string>) {}

  continuation(): string {
    return this.next(
      'continuation',
      'legacy-continuation',
      ++this.continuationOrdinal,
      'continuationOrdinal',
    )
  }

  exit(): string {
    return this.next('exit', 'legacy-exit', ++this.exitOrdinal, 'exitOrdinal')
  }

  private next(
    first: string,
    prefix: string,
    ordinal: number,
    counter: 'continuationOrdinal' | 'exitOrdinal',
  ): string {
    let current = ordinal
    while (true) {
      const id = current === 1 ? first : `${prefix}-${String(current).padStart(3, '0')}`
      if (!this.used.has(id)) {
        this.used.add(id)
        this[counter] = current
        return id
      }
      current++
    }
  }
}

class P7OwnerStateMachineProjector {
  private readonly ownerKey
  private readonly context
  private readonly cycles
  private readonly fragments
  private readonly directLocalFlows
  private readonly states = new Map<string, CanonicalState>()
  private readonly stateOrder: string[]
  private readonly usedStateIds
  private readonly allocator
  private readonly cycleEntryStates = new Map<string, Map<string, string>>()
  private readonly cycleCompletions = new Map<string, string>()
  private readonly fragmentStates = new Map<string, string>()
  private readonly fragmentCompletions = new Map<string, string>()

  constructor(
    private readonly args: {
      ir: ScriptMigrationIRP6
      owner: P4AuthorOwnerAllocation
      entityScenes: ReadonlyMap<string, readonly string[]>
      legacyStages?: readonly LegacyStageInput[]
    },
  ) {
    this.ownerKey = p7OwnerKey(args.owner.identity)
    this.context = {
      ir: args.ir,
      owner: args.owner.identity,
      entityScenes: args.entityScenes,
    }
    this.cycles = new Map(args.ir.cycleStructures.map((cycle) => [cycle.identity.cycleId, cycle]))
    this.fragments = new Map(
      args.ir.ownerFragments
        .filter((fragment) => p7OwnerKey(fragment.owner) === this.ownerKey)
        .map((fragment) => [fragment.legacyScriptId, fragment]),
    )
    this.directLocalFlows = new Map(
      args.ir.localFlows
        .filter(
          (flow) =>
            p7OwnerKey(flow.identity.owner) === this.ownerKey && flow.entry === 'direct-owner-body',
        )
        .map((flow) => [flow.sourceLegacyScriptId, flow.authorBody]),
    )
    this.stateOrder = args.owner.stages.map((stage) => stage.stageId)
    this.usedStateIds = new Set(this.stateOrder)
    this.allocator = new OwnerStateIdAllocator(this.usedStateIds)
  }

  project(): Extract<ScriptFlowV5, { kind: 'stateMachine' }> {
    if (this.args.owner.stages.length > 1 && !this.args.legacyStages)
      throw new Error(`${this.ownerKey}: multi-stage owner 缺 legacy next 证据`)

    for (const [index, stage] of this.args.owner.stages.entries()) {
      const completion = this.stageCompletion(index)
      const directCycle = this.directCycle(stage.entryLegacyScriptId)
      if (directCycle) {
        const entry = this.ensureCycle(directCycle, completion, stage.stageId).get(
          stage.entryLegacyScriptId,
        )
        if (entry !== stage.stageId)
          throw new Error(`${this.ownerKey}:${stage.stageId}: direct cycle entry 未保留 StageId`)
      } else {
        const body = this.stageBody(stage.entryLegacyScriptId)
        this.compileState(stage.stageId, stage.stageId, body, completion)
      }
      this.attachEntry(stage.stageId, stage.legacyStageIndex)
    }

    const states = Object.fromEntries(
      this.stateOrder.map((id) => {
        const state = this.states.get(id)
        if (!state) throw new Error(`${this.ownerKey}: state 未生成 ${id}`)
        return [id, state]
      }),
    )
    return {
      kind: 'stateMachine',
      machine: {
        id: 'machine',
        label: this.args.owner.label,
        initial: this.args.owner.stages[0]!.stageId,
        states,
      },
    }
  }

  private stageCompletion(index: number): StateTransitionV5 {
    const stage = this.args.owner.stages[index]!
    const legacy = this.args.legacyStages?.[stage.legacyStageIndex]
    if (legacy?.next === undefined) return { kind: 'stay' }
    const targetIndex =
      legacy.next === 'advance'
        ? Math.min(index + 1, this.args.owner.stages.length - 1)
        : Math.max(0, Math.min(legacy.next, this.args.owner.stages.length - 1))
    const target = this.args.owner.stages[targetIndex]!.stageId
    return target === stage.stageId ? { kind: 'stay' } : { kind: 'advance', state: target }
  }

  private directCycle(legacyScriptId: string): P5CycleStructure | undefined {
    return this.args.ir.cycleStructures.find(
      (cycle) =>
        cycle.entryLegacyScriptIds.includes(legacyScriptId) &&
        cycle.ownerFlows.some((flow) => p7OwnerKey(flow.identity.owner) === this.ownerKey),
    )
  }

  private stageBody(legacyScriptId: string): unknown[] {
    const body =
      this.fragments.get(legacyScriptId)?.body ?? this.directLocalFlows.get(legacyScriptId)
    if (!body) throw new Error(`${this.ownerKey}: stage body 缺失 ${legacyScriptId}`)
    return body
  }

  private compileState(
    stateId: string,
    label: string,
    body: unknown[],
    completion: StateTransitionV5,
  ): void {
    this.compileSegment(
      stateId,
      label,
      body.map((value, index) => ({ path: `/${index}`, value })),
      completion,
    )
  }

  private compileSegment(
    stateId: string,
    label: string,
    commands: SourceCommand[],
    completion: StateTransitionV5,
  ): void {
    if (this.states.has(stateId)) throw new Error(`${this.ownerKey}: 重复生成 state ${stateId}`)
    const detected = this.detectExit(commands)
    if (!detected) {
      const exits = countP5Exits(commands.map((command) => command.value))
      if (exits) throw new Error(`${this.ownerKey}:${stateId}: ${exits} 个未支持的嵌套 P5 exit`)
      this.states.set(stateId, {
        label,
        body: this.commands(commands, `${stateId}.body`),
        next: clone(completion),
      })
      return
    }

    const prefix = commands.slice(0, detected.position)
    if (detected.kind === 'body-end') {
      this.states.set(stateId, {
        label,
        body: this.commands(prefix, `${stateId}.body`),
        next: this.transfer(detected.exit, completion),
      })
      return
    }

    if (detected.kind === 'condition') {
      const fallback = [
        ...(Array.isArray(detected.command.else)
          ? detected.command.else.map((value, index) => ({
              path: `${commands[detected.position]!.path}/else/${index}`,
              value,
            }))
          : []),
        ...commands.slice(detected.position + 1),
      ]
      this.states.set(stateId, {
        label,
        body: this.commands(prefix, `${stateId}.body`),
        next: {
          kind: 'branch',
          cond: projectP7AuthorCondition(
            detected.command.cond,
            this.context,
            `${stateId}.next.cond`,
          ),
          then: this.transfer(detected.exit, completion),
          else: this.continuation(fallback, completion),
        },
      })
      return
    }

    const commandId = 'legacy-choice-001'
    const confirm: AuthorCommandV5 = { kind: 'confirm', id: commandId, onNo: [] }
    this.states.set(stateId, {
      label,
      body: [...this.commands(prefix, `${stateId}.body`), confirm],
      next: {
        kind: 'commandOutcome',
        commandId,
        command: 'confirm',
        outcome: 'no',
        then: this.transfer(detected.exit, completion),
        else: this.continuation(commands.slice(detected.position + 1), completion),
      },
    })
  }

  private detectExit(commands: SourceCommand[]): DetectedExit | undefined {
    for (const [position, source] of commands.entries()) {
      const command = record(source.value, `${this.ownerKey}${source.path}`)
      const direct = asP5Exit(command)
      if (direct) return { kind: 'body-end', position, command, exit: direct }
      if (command.kind === 'branch') {
        const then = command.then
        const exit = Array.isArray(then) ? asP5Exit(then[0]) : undefined
        if (exit) return { kind: 'condition', position, command, exit }
      }
      if (command.kind === 'confirm') {
        const onNo = command.onNo
        const exit = Array.isArray(onNo) ? asP5Exit(onNo[0]) : undefined
        if (exit) return { kind: 'command-outcome', position, command, exit }
      }
    }
  }

  private continuation(
    commands: SourceCommand[],
    completion: StateTransitionV5,
  ): StateTransitionV5 {
    if (commands.length === 0) return clone(completion)
    const state = this.allocator.continuation()
    this.stateOrder.push(state)
    this.compileSegment(state, `同步继续 ${state}`, commands, clone(completion))
    return { kind: 'continue', state }
  }

  private transfer(exit: P5GeneratedFlowExit, completion: StateTransitionV5): StateTransitionV5 {
    const target = exit.target
    let state: string
    if (target.kind === 'cycle') {
      const cycle = this.cycles.get(target.cycleId)
      if (!cycle) throw new Error(`${this.ownerKey}: cycle 缺失 ${target.cycleId}`)
      const entries = this.ensureCycle(cycle, completion)
      state = entries.get(target.legacyScriptId) ?? ''
      if (!state)
        throw new Error(
          `${this.ownerKey}: cycle entry 缺失 ${target.cycleId}:${target.legacyScriptId}`,
        )
    } else {
      state = this.ensureFragment(target.legacyScriptId, completion)
    }
    return { kind: 'to', state, yield: exit.scheduling }
  }

  private ensureCycle(
    cycle: P5CycleStructure,
    completion: StateTransitionV5,
    namespaceOverride?: string,
  ): Map<string, string> {
    const existing = this.cycleEntryStates.get(cycle.identity.cycleId)
    const completionDigest = stableTransition(completion)
    if (existing) {
      if (this.cycleCompletions.get(cycle.identity.cycleId) !== completionDigest)
        throw new Error(`${this.ownerKey}: cycle 被不同 stage completion 复用`)
      return existing
    }
    const ownerFlow = cycle.ownerFlows.find(
      (flow) => p7OwnerKey(flow.identity.owner) === this.ownerKey,
    )
    if (!ownerFlow)
      throw new Error(`${this.ownerKey}: cycle owner flow 缺失 ${cycle.identity.cycleId}`)
    const namespace = namespaceOverride ?? ownerFlow.identity.flowId
    const entries = new Map<string, string>()
    this.cycleEntryStates.set(cycle.identity.cycleId, entries)
    this.cycleCompletions.set(cycle.identity.cycleId, completionDigest)

    if (cycle.authorProjection.kind === 'state-machine') {
      const flow = projectP7CycleStateMachine({
        ir: this.args.ir,
        cycle,
        owner: this.args.owner.identity,
        entityScenes: this.args.entityScenes,
        completion,
        namespace,
      })
      for (const source of cycle.authorProjection.states)
        entries.set(
          source.legacyScriptId,
          source.id === cycle.authorProjection.initialStateId
            ? namespace
            : `${namespace}-${source.id}`,
        )
      this.mergeStates(flow.machine.states)
      return entries
    }

    for (const legacyScriptId of cycle.entryLegacyScriptIds) entries.set(legacyScriptId, namespace)
    this.reserveState(namespace)
    this.compileState(namespace, `迁移流程 ${namespace}`, cycle.authorProjection.body, completion)
    return entries
  }

  private ensureFragment(legacyScriptId: string, completion: StateTransitionV5): string {
    const existing = this.fragmentStates.get(legacyScriptId)
    const completionDigest = stableTransition(completion)
    if (existing) {
      if (this.fragmentCompletions.get(legacyScriptId) !== completionDigest)
        throw new Error(`${this.ownerKey}: fragment 被不同 stage completion 复用`)
      return existing
    }
    const fragment = this.fragments.get(legacyScriptId)
    if (!fragment) throw new Error(`${this.ownerKey}: owner fragment 缺失 ${legacyScriptId}`)
    const state = this.allocator.exit()
    this.fragmentStates.set(legacyScriptId, state)
    this.fragmentCompletions.set(legacyScriptId, completionDigest)
    this.stateOrder.push(state)
    this.compileFragment(state, fragment, completion)
    return state
  }

  private compileFragment(
    state: string,
    fragment: P4OwnerFragment,
    completion: StateTransitionV5,
  ): void {
    this.compileState(state, `退出 ${state}`, fragment.body, clone(completion))
  }

  private reserveState(state: string): void {
    if (this.usedStateIds.has(state))
      throw new Error(`${this.ownerKey}: stable StateId 冲突 ${state}`)
    this.usedStateIds.add(state)
    this.stateOrder.push(state)
  }

  private mergeStates(states: Record<string, CanonicalState>): void {
    for (const [id, state] of Object.entries(states)) {
      if (!this.usedStateIds.has(id)) {
        this.usedStateIds.add(id)
        this.stateOrder.push(id)
      } else if (this.states.has(id)) {
        throw new Error(`${this.ownerKey}: stable StateId 冲突 ${id}`)
      }
      this.states.set(id, clone(state))
    }
  }

  private attachEntry(stageId: string, legacyStageIndex: number): void {
    const legacy = this.args.legacyStages?.[legacyStageIndex]
    if (!legacy?.entry) return
    const state = this.states.get(stageId)
    if (!state) throw new Error(`${this.ownerKey}: entry state 缺失 ${stageId}`)
    state.entry = {
      prepare: projectP7AuthorCommands(
        legacy.entry.prepare,
        this.context,
        `${stageId}.entry.prepare`,
      ),
      reveal: clone(legacy.entry.reveal) as AuthorSceneEntryPresentationV5['reveal'],
    }
  }

  private commands(commands: SourceCommand[], path: string): AuthorCommandV5[] {
    return projectP7AuthorCommands(
      commands.map((command) => command.value),
      this.context,
      path,
    )
  }
}

/** Projects every stage and recovered cycle for one owner into one canonical v5 machine. */
export function projectP7StateMachineOwnerFlow(args: {
  ir: ScriptMigrationIRP6
  owner: P4AuthorOwnerAllocation
  entityScenes: ReadonlyMap<string, readonly string[]>
  legacyStages?: readonly LegacyStageInput[]
}): Extract<ScriptFlowV5, { kind: 'stateMachine' }> {
  return new P7OwnerStateMachineProjector(args).project()
}
