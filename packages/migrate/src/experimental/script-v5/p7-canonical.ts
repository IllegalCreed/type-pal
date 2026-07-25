import type {
  AuthorCommandV5,
  AuthorConditionV5,
  EntityAddress,
  ScriptFlowV5,
} from '@type-pal/content'
import type {
  P4AuthorOwnerAllocation,
  P4AuthorOwnerIdentity,
  P5CycleStructure,
  ScriptMigrationIRP6,
} from './types.js'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export function p7OwnerKey(owner: P4AuthorOwnerIdentity): string {
  return owner.kind === 'entity-behavior'
    ? `entity:${owner.sceneId}:${owner.entityId}:${owner.channel}:${owner.behaviorId}`
    : `hook:${owner.sceneId}:${owner.slot}:${owner.hookId}`
}

export interface P7CommandProjectionContext {
  ir: ScriptMigrationIRP6
  owner: P4AuthorOwnerIdentity
  /** legacy entity id -> sorted scene ids containing that id. */
  entityScenes: ReadonlyMap<string, readonly string[]>
}

const ENTITY_TARGET_KINDS = new Set([
  'animEntity',
  'mountParty',
  'moveEntity',
  'nudgeEntity',
  'playEntityAction',
  'ride',
  'setEntityFacing',
  'setEntityFrame',
  'setEntityLayer',
  'setEntityPos',
  'setEntityPosRelParty',
  'setEntityState',
  'stepEntity',
  'stopEntityAction',
  'takeEntity',
])

const RETIRED_AUTHOR_KINDS = new Set([
  'jumpScript',
  'setEntityAuto',
  'setEntityTrigger',
  'setEntityTriggerMode',
  'setSceneOnEnter',
  'setSceneOnTeleport',
  'clearSceneScripts',
])

class P7CommandProjector {
  private readonly flowStructures
  private readonly cycles
  private readonly localFlows
  private readonly ownerFragments
  private readonly expansionStack = new Set<string>()

  constructor(private readonly context: P7CommandProjectionContext) {
    this.flowStructures = new Map(
      context.ir.flowStructures.map((structure) => [structure.id, structure]),
    )
    this.cycles = new Map(
      context.ir.cycleStructures.map((structure) => [structure.identity.cycleId, structure]),
    )
    this.localFlows = new Map(
      context.ir.localFlows.map((flow) => [
        `${p7OwnerKey(flow.identity.owner)}\u0000${flow.identity.flowId}`,
        flow,
      ]),
    )
    this.ownerFragments = new Map(
      context.ir.ownerFragments.map((fragment) => [
        `${p7OwnerKey(fragment.owner)}\u0000${fragment.legacyScriptId}`,
        fragment,
      ]),
    )
  }

  commands(value: unknown, path: string): AuthorCommandV5[] {
    if (!Array.isArray(value)) throw new Error(`${path}: 期望命令数组`)
    return value.flatMap((command, index) => this.command(command, `${path}[${index}]`))
  }

  private withExpansion(
    key: string,
    path: string,
    body: unknown,
  ): AuthorCommandV5[] {
    if (this.expansionStack.has(key)) throw new Error(`${path}: canonical inline expansion 环 ${key}`)
    this.expansionStack.add(key)
    try {
      return this.commands(body, `${path}<${key}>`)
    } finally {
      this.expansionStack.delete(key)
    }
  }

  private address(
    legacyEntity: unknown,
    path: string,
    explicitScene?: unknown,
  ): EntityAddress {
    if (
      legacyEntity &&
      typeof legacyEntity === 'object' &&
      !Array.isArray(legacyEntity) &&
      typeof (legacyEntity as { scene?: unknown }).scene === 'string' &&
      typeof (legacyEntity as { entity?: unknown }).entity === 'string'
    )
      return clone(legacyEntity as EntityAddress)
    if (typeof legacyEntity !== 'string' || legacyEntity.length === 0)
      throw new Error(`${path}: 期望旧实体 id`)
    if (explicitScene !== undefined) {
      if (typeof explicitScene !== 'string' || explicitScene.length === 0)
        throw new Error(`${path}: 显式 scene 非法`)
      return { scene: explicitScene, entity: legacyEntity }
    }
    const ownerScene = this.context.owner.sceneId
    const scenes = this.context.entityScenes.get(legacyEntity) ?? []
    if (scenes.includes(ownerScene)) return { scene: ownerScene, entity: legacyEntity }
    if (scenes.length === 1) return { scene: scenes[0]!, entity: legacyEntity }
    if (scenes.length === 0) throw new Error(`${path}: 实体 ${legacyEntity} 不在任何场景`)
    throw new Error(
      `${path}: 实体 ${legacyEntity} 跨 ${scenes.join(',')} 多义，缺显式 EntityAddress`,
    )
  }

  private condition(value: unknown, path: string): AuthorConditionV5 {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`${path}: 期望条件对象`)
    const condition = value as Record<string, unknown>
    if (condition.kind === 'entityState') {
      return {
        kind: 'entityState',
        target: this.address(condition.target ?? condition.entity, `${path}.target`),
        is: condition.is as number,
      }
    }
    if (condition.kind === 'entityInScene') {
      return {
        kind: 'entityInScene',
        target: this.address(condition.target ?? condition.entity, `${path}.target`),
      }
    }
    if (condition.kind === 'facingEntity') {
      return {
        kind: 'facingEntity',
        target: this.address(condition.target ?? condition.entity, `${path}.target`),
        ...(condition.range === undefined ? {} : { range: condition.range as number }),
      }
    }
    if (condition.kind === 'all' || condition.kind === 'any') {
      if (!Array.isArray(condition.of)) throw new Error(`${path}.of: 期望数组`)
      return {
        kind: condition.kind,
        of: condition.of.map((child, index) => this.condition(child, `${path}.of[${index}]`)),
      }
    }
    if (condition.kind === 'not')
      return { kind: 'not', cond: this.condition(condition.cond, `${path}.cond`) }
    return clone(condition) as AuthorConditionV5
  }

  private generatedP3(command: Record<string, unknown>, path: string): AuthorCommandV5[] {
    const structure = this.flowStructures.get(String(command.structureId))
    if (!structure) throw new Error(`${path}: n3P3FlowExit 目标不存在`)
    return this.withExpansion(`p3:${structure.id}`, path, structure.target.body)
  }

  private generatedP6(command: Record<string, unknown>, path: string): AuthorCommandV5[] {
    const target = command.target as
      | { owner?: P4AuthorOwnerIdentity; flowId?: unknown }
      | undefined
    if (!target?.owner || typeof target.flowId !== 'string')
      throw new Error(`${path}: n3P6FlowExit 目标非法`)
    const flow = this.localFlows.get(`${p7OwnerKey(target.owner)}\u0000${target.flowId}`)
    if (!flow) throw new Error(`${path}: n3P6FlowExit local flow 不存在`)
    return this.withExpansion(
      `p6:${p7OwnerKey(target.owner)}:${target.flowId}`,
      path,
      flow.authorBody,
    )
  }

  private generatedP5(command: Record<string, unknown>, path: string): AuthorCommandV5[] {
    const target = command.target as
      | {
          kind?: unknown
          cycleId?: unknown
          legacyScriptId?: unknown
          owner?: P4AuthorOwnerIdentity
        }
      | undefined
    if (target?.kind === 'owner-fragment') {
      if (!target.owner || typeof target.legacyScriptId !== 'string')
        throw new Error(`${path}: owner-fragment 目标非法`)
      const fragment = this.ownerFragments.get(
        `${p7OwnerKey(target.owner)}\u0000${target.legacyScriptId}`,
      )
      if (!fragment) throw new Error(`${path}: owner-fragment 目标不存在`)
      return this.withExpansion(
        `fragment:${p7OwnerKey(target.owner)}:${target.legacyScriptId}`,
        path,
        fragment.body,
      )
    }
    if (target?.kind !== 'cycle' || typeof target.cycleId !== 'string')
      throw new Error(`${path}: n3P5FlowExit cycle 目标非法`)
    const cycle = this.cycles.get(target.cycleId)
    if (!cycle) throw new Error(`${path}: cycle ${target.cycleId} 不存在`)
    if (cycle.authorProjection.kind === 'state-machine')
      throw new Error(
        `${path}: state-machine transfer ${target.cycleId} 必须由 owner flow projector 消费`,
      )
    return this.withExpansion(
      `cycle:${target.cycleId}`,
      path,
      cycle.authorProjection.body,
    )
  }

  private command(value: unknown, path: string): AuthorCommandV5[] {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`${path}: 期望命令对象`)
    const command = value as Record<string, unknown>
    if (typeof command.kind !== 'string') throw new Error(`${path}.kind: 期望 string`)
    if (command.kind === 'n3P3FlowExit') return this.generatedP3(command, path)
    if (command.kind === 'n3P5FlowExit') return this.generatedP5(command, path)
    if (command.kind === 'n3P6FlowExit') return this.generatedP6(command, path)
    if (RETIRED_AUTHOR_KINDS.has(command.kind))
      throw new Error(`${path}.kind: P7 canonical 禁止 ${command.kind}`)

    if (command.kind === 'branch') {
      return [
        {
          kind: 'branch',
          cond: this.condition(command.cond, `${path}.cond`),
          then: this.commands(command.then, `${path}.then`),
          ...(command.else === undefined
            ? {}
            : { else: this.commands(command.else, `${path}.else`) }),
        },
      ]
    }
    if (command.kind === 'loop') {
      return [
        {
          kind: 'loop',
          mode: command.mode as 'while' | 'until',
          cond: this.condition(command.cond, `${path}.cond`),
          body: this.commands(command.body, `${path}.body`),
          yield: command.yield as 'worldTick',
          maxIterations: command.maxIterations as number,
        },
      ]
    }
    if (command.kind === 'startBattle') {
      return [
        {
          ...(clone(command) as Extract<AuthorCommandV5, { kind: 'startBattle' }>),
          kind: 'startBattle',
          ...(command.onLose === undefined
            ? {}
            : { onLose: this.commands(command.onLose, `${path}.onLose`) }),
          ...(command.onFlee === undefined
            ? {}
            : { onFlee: this.commands(command.onFlee, `${path}.onFlee`) }),
        },
      ]
    }
    if (command.kind === 'teleportOut') {
      return [
        {
          kind: 'teleportOut',
          ...(command.onFail === undefined
            ? {}
            : { onFail: this.commands(command.onFail, `${path}.onFail`) }),
        },
      ]
    }
    if (command.kind === 'confirm')
      return [{ kind: 'confirm', onNo: this.commands(command.onNo, `${path}.onNo`) }]
    if (command.kind === 'setMultiEntityState') {
      const rawTargets = command.targets ?? command.entities
      if (!Array.isArray(rawTargets)) throw new Error(`${path}.targets: 期望数组`)
      return [
        {
          kind: 'setMultiEntityState',
          targets: rawTargets.map((target, index) =>
            this.address(target, `${path}.targets[${index}]`),
          ),
          state: command.state as number,
        },
      ]
    }
    if (command.kind === 'selectEntityBehavior') {
      return [
        {
          kind: 'selectEntityBehavior',
          target: this.address(
            command.target ?? command.entity,
            `${path}.target`,
            command.target === undefined ? command.scene : undefined,
          ),
          channel: command.channel as 'trigger' | 'auto',
          selection: clone(command.selection) as Extract<
            AuthorCommandV5,
            { kind: 'selectEntityBehavior' }
          >['selection'],
        },
      ]
    }
    if (command.kind === 'selectEntityPage') {
      return [
        {
          kind: 'selectEntityPage',
          target: this.address(
            command.target ?? command.entity,
            `${path}.target`,
            command.target === undefined ? command.scene : undefined,
          ),
          selection: clone(command.selection) as Extract<
            AuthorCommandV5,
            { kind: 'selectEntityPage' }
          >['selection'],
        },
      ]
    }
    if (command.kind === 'setEntityTriggerActivation') {
      return [
        {
          kind: 'setEntityTriggerActivation',
          target: this.address(
            command.target ?? command.entity,
            `${path}.target`,
            command.target === undefined ? command.scene : undefined,
          ),
          selection: clone(command.selection) as Extract<
            AuthorCommandV5,
            { kind: 'setEntityTriggerActivation' }
          >['selection'],
        },
      ]
    }
    if (command.kind === 'selectSceneHooks')
      return [clone(command) as Extract<AuthorCommandV5, { kind: 'selectSceneHooks' }>]
    if (command.kind === 'callScript') {
      const ref = command.ref as { id?: unknown } | undefined
      const script = command.script ?? ref?.id
      if (typeof script !== 'string' || script.length === 0)
        throw new Error(`${path}.script: callScript 缺稳定 id`)
      return [
        {
          kind: 'callScript',
          script,
          ...(command.self === undefined
            ? {}
            : { self: this.address(command.self, `${path}.self`) }),
        },
      ]
    }
    if (command.kind === 'vanishEntity' || command.kind === 'releaseEntity') {
      const rawTarget = command.target ?? command.entity
      const { entity: _entity, target: _target, ...rest } = command
      return [
        {
          ...(clone(rest) as Extract<
            AuthorCommandV5,
            { kind: 'vanishEntity' | 'releaseEntity' }
          >),
          kind: command.kind,
          ...(rawTarget === undefined
            ? {}
            : { target: this.address(rawTarget, `${path}.target`) }),
        } as AuthorCommandV5,
      ]
    }
    if (ENTITY_TARGET_KINDS.has(command.kind)) {
      const { entity: _entity, target: _target, ...rest } = command
      return [
        {
          ...clone(rest),
          kind: command.kind,
          target: this.address(command.target ?? command.entity, `${path}.target`),
        } as AuthorCommandV5,
      ]
    }
    return [clone(command) as AuthorCommandV5]
  }
}

export function projectP7AuthorCommands(
  value: unknown,
  context: P7CommandProjectionContext,
  path = 'commands',
): AuthorCommandV5[] {
  return new P7CommandProjector(context).commands(value, path)
}

function directCycleForStage(
  ir: ScriptMigrationIRP6,
  owner: P4AuthorOwnerIdentity,
  legacyScriptId: string,
): P5CycleStructure | undefined {
  return ir.cycleStructures.find(
    (cycle) =>
      cycle.entryLegacyScriptIds.includes(legacyScriptId) &&
      cycle.ownerFlows.some(
        (flow) => p7OwnerKey(flow.identity.owner) === p7OwnerKey(owner),
      ),
  )
}

/** P7 线性/loop/auto owner flow 投影；含不可约状态机的 owner 由后续专用 projector 处理。 */
export function projectP7SimpleOwnerFlow(args: {
  ir: ScriptMigrationIRP6
  owner: P4AuthorOwnerAllocation
  entityScenes: ReadonlyMap<string, readonly string[]>
  legacyStages?: ReadonlyArray<{
    entry?: unknown
    next?: 'advance' | number
  }>
}): ScriptFlowV5 {
  const ownerKey = p7OwnerKey(args.owner.identity)
  const fragments = new Map(
    args.ir.ownerFragments
      .filter((fragment) => p7OwnerKey(fragment.owner) === ownerKey)
      .map((fragment) => [fragment.legacyScriptId, fragment]),
  )
  const directLocalFlows = new Map(
    args.ir.localFlows
      .filter(
        (flow) =>
          p7OwnerKey(flow.identity.owner) === ownerKey &&
          flow.entry === 'direct-owner-body',
      )
      .map((flow) => [flow.sourceLegacyScriptId, flow]),
  )
  const stages = args.owner.stages.map((allocation, index) => {
    const directCycle = directCycleForStage(
      args.ir,
      args.owner.identity,
      allocation.entryLegacyScriptId,
    )
    if (directCycle?.authorProjection.kind === 'state-machine')
      throw new Error(
        `P7 owner ${ownerKey}: stage ${allocation.stageId} 命中 state-machine，须走专用 projector`,
      )
    const body =
      fragments.get(allocation.entryLegacyScriptId)?.body ??
      directLocalFlows.get(allocation.entryLegacyScriptId)?.authorBody ??
      (directCycle?.authorProjection.kind === 'auto-runner-repeat' ||
      directCycle?.authorProjection.kind === 'structured-loop'
        ? directCycle.authorProjection.body
        : undefined)
    if (body === undefined)
      throw new Error(
        `P7 owner ${ownerKey}: stage ${allocation.stageId} 缺 canonical body`,
      )
    const legacy = args.legacyStages?.[allocation.legacyStageIndex]
    let next: string | undefined
    if (legacy?.next === 'advance') next = args.owner.stages[index + 1]?.stageId
    else if (typeof legacy?.next === 'number') {
      const targetIndex = Math.max(0, Math.min(legacy.next, args.owner.stages.length - 1))
      next = args.owner.stages[targetIndex]?.stageId
    }
    return {
      id: allocation.stageId,
      ...(legacy?.entry === undefined
        ? {}
        : {
            entry: {
              ...(clone(legacy.entry) as { prepare: unknown; reveal: unknown }),
              prepare: projectP7AuthorCommands(
                (legacy.entry as { prepare?: unknown }).prepare,
                {
                  ir: args.ir,
                  owner: args.owner.identity,
                  entityScenes: args.entityScenes,
                },
                `owner(${ownerKey}).stages.${allocation.stageId}.entry.prepare`,
              ),
            } as never,
          }),
      body: projectP7AuthorCommands(
        body,
        {
          ir: args.ir,
          owner: args.owner.identity,
          entityScenes: args.entityScenes,
        },
        `owner(${ownerKey}).stages.${allocation.stageId}.body`,
      ),
      ...(next === undefined || next === allocation.stageId ? {} : { next }),
    }
  })
  return { kind: 'stages', initial: stages[0]!.id, stages }
}
