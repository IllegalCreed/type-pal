import type {
  EntityAddress,
  EntityLifecycleReferenceIndexV13,
  EntityLifecycleTable,
  LifecycleCommandV13,
  WorldStateV13,
} from '@type-pal/content'
import {
  applyEntityLifecycleMutation,
  type EntityLifecycleMutation,
} from './entity-lifecycle.js'

/** v13 runtime command 的唯一窄边界；旧 v5 AuthorCommand/vanishEntity 不经过这里。 */
export type RuntimeLifecycleCommandV13 = LifecycleCommandV13

export interface EntityLifecycleCommandCommitV13 {
  table: EntityLifecycleTable
  /** manual restore 的 caller 可在当前场景把该实体动作帧复位为 0。 */
  resetFrameTarget?: EntityAddress
}

export interface WorldEntityLifecycleCommandCommitV13 {
  world: WorldStateV13
  resetFrameTarget?: EntityAddress
}

function assertKnownTarget(
  target: EntityAddress,
  references: EntityLifecycleReferenceIndexV13,
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
export function reduceEntityLifecycleCommandV13(
  table: EntityLifecycleTable | undefined,
  command: RuntimeLifecycleCommandV13,
  references: EntityLifecycleReferenceIndexV13,
): EntityLifecycleTable {
  return commitEntityLifecycleCommandV13(table, command, references).table
}

/** 四叶命令的原子提交结果；只有显式 restore 产生帧复位通知。 */
export function commitEntityLifecycleCommandV13(
  table: EntityLifecycleTable | undefined,
  command: RuntimeLifecycleCommandV13,
  references: EntityLifecycleReferenceIndexV13,
): EntityLifecycleCommandCommitV13 {
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
export function applyWorldEntityLifecycleCommandV13(
  world: WorldStateV13,
  command: RuntimeLifecycleCommandV13,
  references: EntityLifecycleReferenceIndexV13,
): WorldStateV13 {
  return commitWorldEntityLifecycleCommandV13(world, command, references).world
}

export function commitWorldEntityLifecycleCommandV13(
  world: WorldStateV13,
  command: RuntimeLifecycleCommandV13,
  references: EntityLifecycleReferenceIndexV13,
): WorldEntityLifecycleCommandCommitV13 {
  const committed = commitEntityLifecycleCommandV13(
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
