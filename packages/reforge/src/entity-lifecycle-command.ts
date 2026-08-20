import type {
  EntityAddress,
  EntityLifecycleReferenceIndex,
  EntityLifecycleTable,
  EntityLifecycleCommand,
  WorldState,
} from '@type-pal/content'
import {
  applyEntityLifecycleMutation,
  type EntityLifecycleMutation,
} from './entity-lifecycle.js'

/** 当前 runtime lifecycle command 的唯一窄边界。 */
export type RuntimeEntityLifecycleCommand = EntityLifecycleCommand

export interface EntityLifecycleCommandCommit {
  table: EntityLifecycleTable
  /** manual restore 的 caller 可在当前场景把该实体动作帧复位为 0。 */
  resetFrameTarget?: EntityAddress
}

export interface WorldEntityLifecycleCommandCommit {
  world: WorldState
  resetFrameTarget?: EntityAddress
}

function assertKnownTarget(
  target: EntityAddress,
  references: EntityLifecycleReferenceIndex,
): void {
  const entities = references.get(target.scene)
  if (!entities) throw new Error(`lifecycle command: 未知 scene "${target.scene}"`)
  if (!entities.has(target.entity))
    throw new Error(`lifecycle command: 未知 entity "${target.scene}/${target.entity}"`)
}

/**
 * 纯 reducer adapter：命令可作用于非当前场景，持久表照样写入；视觉消费者只投影当前场景。
 * 引用闭包在写入前检查，避免 applyEntityLifecycleMutation 仅凭非空 id 接受未知键。
 */
export function reduceEntityEntityLifecycleCommand(
  table: EntityLifecycleTable | undefined,
  command: RuntimeEntityLifecycleCommand,
  references: EntityLifecycleReferenceIndex,
): EntityLifecycleTable {
  return commitEntityEntityLifecycleCommand(table, command, references).table
}

/** 四叶命令的原子提交结果；只有显式 restore 产生帧复位通知。 */
export function commitEntityEntityLifecycleCommand(
  table: EntityLifecycleTable | undefined,
  command: RuntimeEntityLifecycleCommand,
  references: EntityLifecycleReferenceIndex,
): EntityLifecycleCommandCommit {
  assertKnownTarget(command.target, references)
  const mutation: EntityLifecycleMutation =
    command.kind === 'suspendEntity' || command.kind === 'hideEntity'
      ? {
          kind: command.kind,
          scene: command.target.scene,
          entity: command.target.entity,
          ticks: command.ticks,
        }
      : { kind: command.kind, scene: command.target.scene, entity: command.target.entity }
  const next = applyEntityLifecycleMutation(table ?? {}, mutation)
  return {
    table: next,
    ...(command.kind === 'restoreEntity'
      ? { resetFrameTarget: structuredClone(command.target) }
      : {}),
  }
}

/**
 * World-state 纯适配：保留 script/entityState、party 和其余字段，只替换 lifecycle 表。
 * canonical script host 可在提交点采用返回值，旧 world 不会被半写入。
 */
export function applyWorldEntityEntityLifecycleCommand(
  world: WorldState,
  command: RuntimeEntityLifecycleCommand,
  references: EntityLifecycleReferenceIndex,
): WorldState {
  return commitWorldEntityEntityLifecycleCommand(world, command, references).world
}

export function commitWorldEntityEntityLifecycleCommand(
  world: WorldState,
  command: RuntimeEntityLifecycleCommand,
  references: EntityLifecycleReferenceIndex,
): WorldEntityLifecycleCommandCommit {
  const committed = commitEntityEntityLifecycleCommand(
    world.entityLifecycles,
    command,
    references,
  )
  return {
    world: {
      ...structuredClone(world),
      entityLifecycles: committed.table,
    },
    ...(committed.resetFrameTarget
      ? { resetFrameTarget: structuredClone(committed.resetFrameTarget) }
      : {}),
  }
}
