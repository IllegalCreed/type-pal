import type {
  EntityLifecycleEntry,
  EntityLifecycleTable,
} from '@type-pal/content'

export type LifecycleTriggerKind = 'manual' | 'touch'

export interface EntityLifecycleGateInput {
  staticHidden?: boolean
  staticCollide?: boolean
  /** legacy entityState：<=0 隐藏，>=2 挡路，缺省保留静态 def。 */
  entityState?: number
  lifecycle?: EntityLifecycleEntry
  hasTrigger?: boolean
  triggerKind?: LifecycleTriggerKind
  hasAuto?: boolean
  hasHostile?: boolean
}

export interface EntityLifecycleGates {
  visible: boolean
  collidable: boolean
  manualInteractable: boolean
  touchTriggerable: boolean
  autoAllowed: boolean
  hostileAllowed: boolean
}

type LifecyclePhase = EntityLifecycleEntry['phase'] | 'normal'

function lifecyclePhase(entry: EntityLifecycleEntry | undefined): LifecyclePhase {
  return entry?.phase ?? 'normal'
}

/** 静态 def → entityState → lifecycle 的唯一 gate 派生顺序。 */
export function deriveEntityLifecycleGates(input: EntityLifecycleGateInput): EntityLifecycleGates {
  // An explicit entityState is a persisted script override of the static definition (the
  // historical setEntityState command can reveal an initially hidden anchor). Only when the
  // override is absent do we consult the pristine static flags. Lifecycle then gates the result.
  const hasState = input.entityState !== undefined
  const visibleByStatic = hasState ? input.entityState! > 0 : input.staticHidden !== true
  const collidableByStatic = hasState ? input.entityState! >= 2 : input.staticCollide === true
  const phase = lifecyclePhase(input.lifecycle)
  const hiddenLifecycle = phase === 'despawned' || phase === 'awaitingExit' || phase === 'removed'
  const suspended = phase === 'suspended'
  const visible = visibleByStatic && !hiddenLifecycle
  const collidable = visible && collidableByStatic
  return {
    visible,
    collidable,
    manualInteractable:
      visible && input.hasTrigger === true && input.triggerKind === 'manual',
    touchTriggerable:
      visible && !suspended && input.hasTrigger === true && input.triggerKind === 'touch',
    autoAllowed: visible && !suspended && input.hasAuto === true,
    hostileAllowed: visible && !suspended && input.hasHostile === true,
  }
}

export type EntityLifecycleMutation =
  | { kind: 'suspendEntity'; scene: string; entity: string; ticks: number }
  | { kind: 'hideEntity'; scene: string; entity: string; ticks: number }
  | { kind: 'restoreEntity'; scene: string; entity: string }
  | { kind: 'removeEntity'; scene: string; entity: string }

function cloneTable(table: EntityLifecycleTable): EntityLifecycleTable {
  return Object.fromEntries(
    Object.entries(table).map(([scene, entities]) => [
      scene,
      Object.fromEntries(Object.entries(entities).map(([entity, entry]) => [entity, { ...entry }])),
    ]),
  )
}

function assertPositiveTicks(ticks: number): void {
  if (!Number.isSafeInteger(ticks) || ticks <= 0)
    throw new Error(`lifecycle ticks: 期望正安全整数，收到 ${String(ticks)}`)
}

/** 四个 public lifecycle 叶命令的纯 reducer；输入表不会被修改。 */
export function applyEntityLifecycleMutation(
  table: EntityLifecycleTable,
  mutation: EntityLifecycleMutation,
): EntityLifecycleTable {
  const next = cloneTable(table)
  if (!mutation.scene || !mutation.entity)
    throw new Error('lifecycle mutation: scene/entity 不得为空')
  const entities = (next[mutation.scene] ??= {})
  switch (mutation.kind) {
    case 'suspendEntity':
      assertPositiveTicks(mutation.ticks)
      entities[mutation.entity] = { phase: 'suspended', remainingTicks: mutation.ticks }
      return next
    case 'hideEntity':
      assertPositiveTicks(mutation.ticks)
      entities[mutation.entity] = { phase: 'despawned', remainingTicks: mutation.ticks }
      return next
    case 'restoreEntity':
      delete entities[mutation.entity]
      if (Object.keys(entities).length === 0) delete next[mutation.scene]
      return next
    case 'removeEntity':
      entities[mutation.entity] = { phase: 'removed' }
      return next
  }
}

export interface LifecycleTickResult {
  table: EntityLifecycleTable
  changed: boolean
}

/** 一次合格的 100ms 世界拍；battle/menu/dialog/confirm/script 等由 caller 统一 gate。 */
export function tickEntityLifecycles(
  table: EntityLifecycleTable,
  context: { currentScene: string; eligible: boolean },
): LifecycleTickResult {
  if (!context.eligible) return { table, changed: false }
  const current = table[context.currentScene]
  if (!current) return { table, changed: false }
  const next = cloneTable(table)
  const entities = next[context.currentScene]!
  let changed = false
  for (const [entity, entry] of Object.entries(entities)) {
    if (entry.phase !== 'suspended' && entry.phase !== 'despawned') continue
    changed = true
    if (entry.remainingTicks > 1) {
      entities[entity] = { ...entry, remainingTicks: entry.remainingTicks - 1 }
    } else if (entry.phase === 'suspended') {
      delete entities[entity]
    } else {
      entities[entity] = { phase: 'awaitingExit' }
    }
  }
  if (Object.keys(entities).length === 0) delete next[context.currentScene]
  return { table: next, changed }
}

export interface FootAnchorOffset {
  x: number
  y: number
}

export interface EntityLifecycleWorldStepContext {
  currentScene: string
  eligible: boolean
  /** 当前场景实体 foot-anchor 相对相机的投影；缺项保持 awaitingExit。 */
  footAnchors?: Readonly<Record<string, FootAnchorOffset>>
}

export interface EntityLifecycleWorldStepResult extends LifecycleTickResult {
  /** caller 必须只把这些实体的动作帧复位为 0；位置、朝向与碰撞类别均不改。 */
  reappearedEntities: readonly string[]
}

/** 320×320 端点包含：0/320 仍隐藏，-1/321 才允许重现。 */
export function footAnchorOutsideReappearRect(offset: FootAnchorOffset): boolean {
  return offset.x < 0 || offset.x > 320 || offset.y < 0 || offset.y > 320
}

export function restoreAwaitingExitIfOutside(
  table: EntityLifecycleTable,
  scene: string,
  entity: string,
  offset: FootAnchorOffset,
): EntityLifecycleTable {
  const entry = table[scene]?.[entity]
  if (entry?.phase !== 'awaitingExit' || !footAnchorOutsideReappearRect(offset)) return table
  return applyEntityLifecycleMutation(table, { kind: 'restoreEntity', scene, entity })
}

/**
 * 一次 canonical 100ms lifecycle 世界步：先推进倒计时，再只检查本步开始前已处于
 * awaitingExit 的实体。这样 despawned 的最后一拍仍遵守源 `continue`，下一次 eligible
 * 世界步才离屏重现；离场/菜单/战斗/阻塞脚本期间两段都冻结。
 */
export function advanceEntityLifecycleWorldStep(
  table: EntityLifecycleTable,
  context: EntityLifecycleWorldStepContext,
): EntityLifecycleWorldStepResult {
  if (!context.eligible)
    return { table, changed: false, reappearedEntities: [] }

  const awaitingBefore = Object.entries(table[context.currentScene] ?? {})
    .filter(([, entry]) => entry.phase === 'awaitingExit')
    .map(([entity]) => entity)
    .sort()
  const ticked = tickEntityLifecycles(table, {
    currentScene: context.currentScene,
    eligible: true,
  })
  let next = ticked.table
  const reappearedEntities: string[] = []
  for (const entity of awaitingBefore) {
    const offset = context.footAnchors?.[entity]
    if (!offset || !footAnchorOutsideReappearRect(offset)) continue
    next = applyEntityLifecycleMutation(next, {
      kind: 'restoreEntity',
      scene: context.currentScene,
      entity,
    })
    reappearedEntities.push(entity)
  }
  return {
    table: next,
    changed: ticked.changed || reappearedEntities.length > 0,
    reappearedEntities,
  }
}
