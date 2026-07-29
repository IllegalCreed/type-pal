import type {
  AuthorCommandV5,
  AuthorConditionV5,
  EntityAddress,
  ScriptFlowV5,
  StateTransitionV5,
} from '@type-pal/content'
import { palSoundAssetId } from '@type-pal/content'
import type { SourceCmd } from '../../source-facts.js'
import {
  FACING_BY_DIR,
  legacyEventObjectEntityId,
  partyPosToGrid,
  signExtendI16,
} from '../../source-facts.js'
import type { AutoFlowLifecycleDecision } from './auto-flow-lifecycle.js'
import { stableJson } from './stable-json.js'
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

const COMMAND_REWRITE_CACHE = new WeakMap<ScriptMigrationIRP6, ReadonlyMap<string, unknown>>()
const COMMAND_REWRITE_SOURCE_CACHE = new WeakMap<
  ScriptMigrationIRP6,
  ReadonlyMap<string, unknown>
>()

function commandRewriteSourceKey(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const command = value as Record<string, unknown>
  if (typeof command.kind !== 'string' || !Number.isInteger(command._sourceAddress))
    return undefined
  // source address 在 all.json 中全局唯一；kind 额外防止损坏 fixture 把不同命令伪装成同站点。
  return `${command.kind}\u0000${String(command._sourceAddress)}`
}

function commandRewriteMap(ir: ScriptMigrationIRP6): ReadonlyMap<string, unknown> {
  const cached = COMMAND_REWRITE_CACHE.get(ir)
  if (cached) return cached
  const result = new Map<string, unknown>()
  for (const rewrite of ir.commandRewrites ?? []) {
    const key = stableJson(rewrite.before)
    const previous = result.get(key)
    if (previous !== undefined && stableJson(previous) !== stableJson(rewrite.after))
      throw new Error(`P7 canonical: 同一 legacy binding command 存在多义 rewrite`)
    result.set(key, rewrite.after)
  }
  COMMAND_REWRITE_CACHE.set(ir, result)
  return result
}

function commandRewriteSourceMap(ir: ScriptMigrationIRP6): ReadonlyMap<string, unknown> {
  const cached = COMMAND_REWRITE_SOURCE_CACHE.get(ir)
  if (cached) return cached
  const result = new Map<string, unknown>()
  for (const rewrite of ir.commandRewrites ?? []) {
    const key = commandRewriteSourceKey(rewrite.before)
    if (!key) continue
    const previous = result.get(key)
    if (previous !== undefined && stableJson(previous) !== stableJson(rewrite.after))
      throw new Error(`P7 canonical: 同一 legacy binding source 存在多义 rewrite ${key}`)
    result.set(key, rewrite.after)
  }
  COMMAND_REWRITE_SOURCE_CACHE.set(ir, result)
  return result
}

class P7CommandProjector {
  private readonly flowStructures
  private readonly cycles
  private readonly localFlows
  private readonly ownerFragments
  private readonly commandRewrites
  private readonly commandRewritesBySource
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
    this.commandRewrites = commandRewriteMap(context.ir)
    this.commandRewritesBySource = commandRewriteSourceMap(context.ir)
  }

  commands(value: unknown, path: string): AuthorCommandV5[] {
    if (!Array.isArray(value)) throw new Error(`${path}: 期望命令数组`)
    return value.flatMap((command, index) => this.command(command, `${path}[${index}]`))
  }

  private withExpansion(key: string, path: string, body: unknown): AuthorCommandV5[] {
    if (this.expansionStack.has(key))
      throw new Error(`${path}: canonical inline expansion 环 ${key}`)
    this.expansionStack.add(key)
    try {
      return this.commands(body, `${path}<${key}>`)
    } finally {
      this.expansionStack.delete(key)
    }
  }

  private address(legacyEntity: unknown, path: string, explicitScene?: unknown): EntityAddress {
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

  condition(value: unknown, path: string): AuthorConditionV5 {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`${path}: 期望条件对象`)
    const condition = value as Record<string, unknown>
    if (condition.kind === 'entityState') {
      return {
        kind: 'entityState',
        target: this.address(
          condition.target ?? condition.entity,
          `${path}.target`,
          condition.target === undefined ? condition.scene : undefined,
        ),
        is: condition.is as number,
      }
    }
    if (condition.kind === 'entityInScene') {
      return {
        kind: 'entityInScene',
        target: this.address(
          condition.target ?? condition.entity,
          `${path}.target`,
          condition.target === undefined ? condition.scene : undefined,
        ),
      }
    }
    if (condition.kind === 'facingEntity') {
      return {
        kind: 'facingEntity',
        target: this.address(
          condition.target ?? condition.entity,
          `${path}.target`,
          condition.target === undefined ? condition.scene : undefined,
        ),
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
    const target = command.target as { owner?: P4AuthorOwnerIdentity; flowId?: unknown } | undefined
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
    return this.withExpansion(`cycle:${target.cycleId}`, path, cycle.authorProjection.body)
  }

  private command(value: unknown, path: string): AuthorCommandV5[] {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`${path}: 期望命令对象`)
    const command = value as Record<string, unknown>
    if (typeof command.kind !== 'string') throw new Error(`${path}.kind: 期望 string`)
    if (command.kind === 'n3P3FlowExit') return this.generatedP3(command, path)
    if (command.kind === 'n3P5FlowExit') return this.generatedP5(command, path)
    if (command.kind === 'n3P6FlowExit') return this.generatedP6(command, path)
    if (RETIRED_AUTHOR_KINDS.has(command.kind)) {
      const rewrite =
        this.commandRewrites.get(stableJson(command)) ??
        (() => {
          const sourceKey = commandRewriteSourceKey(command)
          return sourceKey ? this.commandRewritesBySource.get(sourceKey) : undefined
        })()
      if (rewrite === undefined)
        throw new Error(
          `${path}.kind: P7 canonical 禁止 ${command.kind}，且缺 P4 rewrite；` +
            `command=${stableJson(command)}`,
        )
      return this.command(rewrite, `${path}<P4 rewrite>`)
    }

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
      return [
        {
          kind: 'confirm',
          ...(command.id === undefined ? {} : { id: command.id as string }),
          onNo: this.commands(command.onNo, `${path}.onNo`),
        },
      ]
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
      const { entity: _entity, scene: _scene, target: _target, ...rest } = command
      return [
        {
          ...(clone(rest) as Extract<AuthorCommandV5, { kind: 'vanishEntity' | 'releaseEntity' }>),
          kind: command.kind,
          ...(rawTarget === undefined
            ? {}
            : {
                target: this.address(
                  rawTarget,
                  `${path}.target`,
                  command.target === undefined ? command.scene : undefined,
                ),
              }),
        } as AuthorCommandV5,
      ]
    }
    if (ENTITY_TARGET_KINDS.has(command.kind)) {
      const { entity: _entity, scene: _scene, target: _target, ...rest } = command
      return [
        {
          ...clone(rest),
          kind: command.kind,
          target: this.address(
            command.target ?? command.entity,
            `${path}.target`,
            command.target === undefined ? command.scene : undefined,
          ),
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

export function projectP7AuthorCondition(
  value: unknown,
  context: P7CommandProjectionContext,
  path = 'condition',
): AuthorConditionV5 {
  return new P7CommandProjector(context).condition(value, path)
}

function directCycleForStage(
  ir: ScriptMigrationIRP6,
  owner: P4AuthorOwnerIdentity,
  legacyScriptId: string,
): P5CycleStructure | undefined {
  return ir.cycleStructures.find(
    (cycle) =>
      cycle.entryLegacyScriptIds.includes(legacyScriptId) &&
      cycle.ownerFlows.some((flow) => p7OwnerKey(flow.identity.owner) === p7OwnerKey(owner)),
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
          p7OwnerKey(flow.identity.owner) === ownerKey && flow.entry === 'direct-owner-body',
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
      throw new Error(`P7 owner ${ownerKey}: stage ${allocation.stageId} 缺 canonical body`)
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

function ownerEntityAddress(owner: P4AuthorOwnerIdentity): EntityAddress {
  if (owner.kind !== 'entity-behavior')
    throw new Error(`P7 auto lifecycle: ${p7OwnerKey(owner)} 不是实体行为`)
  return { scene: owner.sceneId, entity: owner.entityId }
}

function addressForLegacyEntity(
  value: number,
  owner: P4AuthorOwnerIdentity,
  entityScenes: ReadonlyMap<string, readonly string[]>,
): EntityAddress {
  if (value === 0 || value === 0xffff) return ownerEntityAddress(owner)
  const entity = legacyEventObjectEntityId(value)
  const scenes = entityScenes.get(entity) ?? []
  if (scenes.includes(owner.sceneId)) return { scene: owner.sceneId, entity }
  if (scenes.length === 1) return { scene: scenes[0]!, entity }
  throw new Error(
    `P7 auto lifecycle: ${p7OwnerKey(owner)} 的实体 ${entity} 缺唯一 scene (${scenes.join(',')})`,
  )
}

export function sourceAutoCommand(
  command: SourceCmd,
  owner: P4AuthorOwnerIdentity,
  entityScenes: ReadonlyMap<string, readonly string[]>,
  address: number,
): AuthorCommandV5[] {
  if (command.op === 'end' || command.op === 'goto') return []
  if (command.op !== 'raw')
    throw new Error(`P7 auto lifecycle: @${address} 不支持 ${command.op ?? 'unknown'}`)
  const operands = command.operands ?? []
  if (command.opcode === 0x06) return []
  if (command.opcode === 0x09) return []
  if (command.opcode !== undefined && command.opcode >= 0x0b && command.opcode <= 0x0e)
    return [
      {
        kind: 'stepEntity',
        target: ownerEntityAddress(owner),
        dir: FACING_BY_DIR[command.opcode - 0x0b] ?? 'down',
      },
    ]
  if (command.opcode === 0x0f) {
    const target = ownerEntityAddress(owner)
    return [
      ...((operands[0] ?? 0xffff) === 0xffff
        ? []
        : [
            {
              kind: 'setEntityFacing' as const,
              target,
              facing: FACING_BY_DIR[operands[0]!] ?? 'down',
            },
          ]),
      ...((operands[1] ?? 0xffff) === 0xffff
        ? []
        : [{ kind: 'setEntityFrame' as const, target, frame: operands[1]! }]),
    ]
  }
  if (command.opcode === 0x10 || command.opcode === 0x11)
    return [
      {
        kind: 'moveEntity',
        target: ownerEntityAddress(owner),
        to: partyPosToGrid(operands[0] ?? 0, operands[1] ?? 0, operands[2] ?? 0),
        speed: command.opcode === 0x11 ? 'slow' : 'normal',
      },
    ]
  if (command.opcode === 0x14) {
    const target = ownerEntityAddress(owner)
    return [
      { kind: 'setEntityFacing', target, facing: 'down' },
      { kind: 'setEntityFrame', target, frame: operands[0] ?? 0 },
    ]
  }
  if (command.opcode === 0x47) {
    const sound = operands[0] ?? 0
    if (sound <= 0) throw new Error(`P7 auto lifecycle: ${p7OwnerKey(owner)} @${address} 空音效`)
    return [{ kind: 'playSound', asset: palSoundAssetId(sound) }]
  }
  if (command.opcode === 0x49) {
    const rawTarget = operands[0] ?? 0
    if (rawTarget === 0) return []
    return [
      {
        kind: 'setEntityState',
        target: addressForLegacyEntity(rawTarget, owner, entityScenes),
        state: signExtendI16(operands[1] ?? 0),
      },
    ]
  }
  if (command.opcode === 0x4c)
    return [
      {
        kind: 'chasePlayer',
        range: (operands[0] ?? 0) || 8,
        speed: (operands[1] ?? 0) || 4,
        ...((operands[2] ?? 0) !== 0 ? { floating: true } : {}),
      },
    ]
  if (command.opcode === 0x40) {
    const target = addressForLegacyEntity(operands[0] ?? 0, owner, entityScenes)
    const mode = operands[1] ?? 0
    return [
      {
        kind: 'setEntityTriggerActivation',
        target,
        selection:
          mode >= 1 && mode <= 3
            ? { kind: 'use', value: { on: 'interact', range: mode } }
            : mode >= 4 && mode <= 8
              ? { kind: 'use', value: { on: 'touch', range: mode - 4 } }
              : { kind: 'disabled' },
      },
    ]
  }
  if (command.opcode === 0x6c || command.opcode === 0x7d) {
    const target = addressForLegacyEntity(operands[0] ?? 0, owner, entityScenes)
    return [
      {
        kind: 'nudgeEntity',
        target,
        dx: signExtendI16(operands[1] ?? 0),
        dy: signExtendI16(operands[2] ?? 0),
      },
      ...(command.opcode === 0x6c ? [{ kind: 'animEntity' as const, target }] : []),
    ]
  }
  if (command.opcode === 0x87) return [{ kind: 'animEntity', target: ownerEntityAddress(owner) }]
  throw new Error(
    `P7 auto lifecycle: ${p7OwnerKey(owner)} @${address} 不支持 opcode 0x${(command.opcode ?? 0).toString(16)}`,
  )
}

export function sourceAutoFlow(args: {
  owner: P4AuthorOwnerAllocation
  entityScenes: ReadonlyMap<string, readonly string[]>
  sourceCommands: readonly SourceCmd[]
  lifecycle: AutoFlowLifecycleDecision
}): ScriptFlowV5 {
  if (args.owner.identity.kind !== 'entity-behavior')
    throw new Error('P7 auto lifecycle: complex flow owner 不是实体行为')
  const identity = args.owner.identity
  const ids = new Map(
    args.lifecycle.reachableAddresses.map((address) => [address, `source-${address}`]),
  )
  const state = (address: number): string => {
    const id = ids.get(address)
    if (!id) throw new Error(`P7 auto lifecycle: @${address} 不在源 closure`)
    return id
  }
  const continueTo = (address: number): Extract<StateTransitionV5, { kind: 'continue' }> => ({
    kind: 'continue',
    state: state(address),
  })
  const tickToState = (stateId: string): Extract<StateTransitionV5, { kind: 'to' }> => ({
    kind: 'to',
    state: stateId,
    yield: 'worldTick',
  })
  const tickTo = (address: number): Extract<StateTransitionV5, { kind: 'to' }> =>
    tickToState(state(address))
  const waitState = (address: number, tick: number): string => `source-${address}-wait-${tick}`
  type SourceState = Extract<ScriptFlowV5, { kind: 'stateMachine' }>['machine']['states'][string]
  const entries: Array<[string, SourceState]> = []
  for (const address of args.lifecycle.reachableAddresses) {
    const syntheticEntries: Array<[string, SourceState]> = []
    const command = args.sourceCommands[address] as
      | (SourceCmd & {
          advance?: boolean
          reset?: boolean
          resetTo?: number
          to?: string
          frameDelay?: number
        })
      | undefined
    if (!command) throw new Error(`P7 auto lifecycle: 缺源指令 @${address}`)
    let next: StateTransitionV5
    if (command.op === 'end') {
      if (command.advance) next = { kind: 'advance', state: state(address + 1) }
      else if (command.reset && command.resetTo !== undefined)
        next = { kind: 'advance', state: state(command.resetTo) }
      else next = { kind: 'stay' }
    } else if (command.op === 'goto') {
      if ((command.frameDelay ?? 0) > 0)
        throw new Error(`P7 auto lifecycle: complex delayed goto @${address} 需要独立状态设计`)
      const target = /(?:^|#)L_(\d+)$/.exec(command.to ?? '')?.[1]
      if (target === undefined) throw new Error(`P7 auto lifecycle: goto @${address} 缺 target`)
      next = continueTo(Number(target))
    } else if (command.op === 'raw' && command.opcode === 0x06) {
      const rawTarget = command.operands?.[1] ?? 0
      const target = rawTarget === 0 ? address : rawTarget
      next = {
        kind: 'branch',
        cond: {
          kind: 'chance',
          // SDLPal uses RandomLong(1, 100) >= threshold, so the inclusive
          // success range contains 101 - threshold values.
          percent: Math.max(0, Math.min(100, 101 - (command.operands?.[0] ?? 0))),
        },
        then: rawTarget === 0 ? tickTo(address) : continueTo(target),
        else: tickTo(address + 1),
      }
    } else if (command.op === 'raw' && command.opcode === 0x09) {
      const ticks = Math.max(1, command.operands?.[0] ?? 1)
      next = tickToState(ticks === 1 ? state(address + 1) : waitState(address, 2))
      for (let tick = 2; tick <= ticks; tick++) {
        syntheticEntries.push([
          waitState(address, tick),
          {
            label: `源指令 ${address} · 等待 ${tick}/${ticks}`,
            body: [],
            next: tickToState(tick === ticks ? state(address + 1) : waitState(address, tick + 1)),
          },
        ])
      }
    } else next = tickTo(address + 1)
    entries.push([
      state(address),
      {
        label: `源指令 ${address}`,
        body: sourceAutoCommand(command, args.owner.identity, args.entityScenes, address),
        next,
      },
    ])
    entries.push(...syntheticEntries)
  }
  const states = Object.fromEntries(entries)
  return {
    kind: 'stateMachine',
    machine: {
      id: `auto-lifecycle-${identity.sceneId}-${identity.entityId}-${identity.behaviorId}`,
      label: `${args.owner.label} · 源循环`,
      cadence: 'transition',
      initial: state(args.lifecycle.root),
      states,
    },
  }
}

/** R13-1: source-backed auto plain-end/repeat lifecycle projection. */
export function applyP7AutoLifecycle(args: {
  flow: ScriptFlowV5
  ir: ScriptMigrationIRP6
  owner: P4AuthorOwnerAllocation
  entityScenes: ReadonlyMap<string, readonly string[]>
  sourceCommands: readonly SourceCmd[]
  lifecycle: AutoFlowLifecycleDecision
}): ScriptFlowV5 {
  if (args.flow.kind !== 'stages' || args.flow.stages.length !== 1)
    throw new Error(`P7 auto lifecycle: ${p7OwnerKey(args.owner.identity)} 候选不再是单 stage`)
  const initial = args.flow.stages[0]!
  if (initial.body.length === 0 || initial.next !== undefined)
    throw new Error(`P7 auto lifecycle: ${p7OwnerKey(args.owner.identity)} 输入池漂移`)
  if (args.lifecycle.kind === 'invalid')
    throw new Error(`P7 auto lifecycle: ${p7OwnerKey(args.owner.identity)} mixed/falloff`)
  if (args.lifecycle.kind === 'idle-gate' || args.lifecycle.shape === 'repeat-root')
    return args.flow
  if (args.lifecycle.kind === 'terminal') {
    if (initial.id === 'completed')
      throw new Error(`P7 auto lifecycle: ${p7OwnerKey(args.owner.identity)} completed id 冲突`)
    return {
      kind: 'stages',
      initial: initial.id,
      stages: [
        { ...initial, next: 'completed' },
        { id: 'completed', body: [] },
      ],
    }
  }
  if (args.lifecycle.shape === 'prefix-tail' || args.lifecycle.shape === 'complex-repeat')
    return sourceAutoFlow(args)
  throw new Error(`P7 auto lifecycle: 未支持 shape ${args.lifecycle.shape}`)
}
