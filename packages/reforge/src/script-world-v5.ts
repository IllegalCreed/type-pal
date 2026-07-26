import type {
  ActiveBehaviorSlot,
  AuthorConditionV5,
  BehaviorId,
  EntityAddress,
  EntityBaseV5,
  EntityPageV5,
  FlowCursor,
  HookId,
  NamedEntityBehaviorV5,
  NamedSceneHookV5,
  PageSelection,
  SceneDefV5,
  ScriptFlowV5,
  Selection,
  TriggerActivation,
  WorldEntityBehaviorState,
  WorldSceneHookSlot,
  WorldScriptStateV5,
} from '@type-pal/content'
import type { FlowCursorControllerV5, SafePointDecisionV5 } from './script-runner-v5.js'

export type PersistentFlowOwnerV5 =
  | {
      kind: 'entity-behavior'
      target: EntityAddress
      channel: 'trigger' | 'auto'
    }
  | {
      kind: 'scene-hook'
      scene: string
      slot: 'onEnter' | 'onTeleport'
    }

export interface ResolvedEntityBehaviorV5 {
  behaviorId: BehaviorId
  behavior: NamedEntityBehaviorV5
  cursor: FlowCursor
}

export interface ResolvedSceneHookV5 {
  hookId: HookId
  hook: NamedSceneHookV5
  cursor: FlowCursor
}

export interface EntityPageSelectionResultV5 {
  previousPage?: string
  page?: string
  triggerChanged: boolean
  autoChanged: boolean
  animationChanged: boolean
}

export interface FlowSaveBarrierHandleV5 {
  ready: Promise<void>
  release(): void
  cancel(reason?: unknown): void
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function ownerKey(owner: PersistentFlowOwnerV5): string {
  return owner.kind === 'entity-behavior'
    ? JSON.stringify([owner.kind, owner.target.scene, owner.target.entity, owner.channel])
    : JSON.stringify([owner.kind, owner.scene, owner.slot])
}

function entityOwner(target: EntityAddress, channel: 'trigger' | 'auto'): PersistentFlowOwnerV5 {
  return { kind: 'entity-behavior', target: clone(target), channel }
}

function hookOwner(scene: string, slot: 'onEnter' | 'onTeleport'): PersistentFlowOwnerV5 {
  return { kind: 'scene-hook', scene, slot }
}

function entityWorldState(
  world: WorldScriptStateV5,
  target: EntityAddress,
): WorldEntityBehaviorState | undefined {
  return world.behaviors.entities?.[target.scene]?.[target.entity]
}

function writeEntityWorldState(
  world: WorldScriptStateV5,
  target: EntityAddress,
  state: WorldEntityBehaviorState,
): void {
  if (!world.behaviors.entities) world.behaviors.entities = {}
  const scene = world.behaviors.entities[target.scene] ?? {}
  world.behaviors.entities[target.scene] = scene
  scene[target.entity] = state
}

function sceneWorldState(
  world: WorldScriptStateV5,
  scene: string,
): Partial<Record<'onEnter' | 'onTeleport', WorldSceneHookSlot>> | undefined {
  return world.behaviors.scenes?.[scene]
}

function writeSceneWorldState(
  world: WorldScriptStateV5,
  sceneId: string,
  state: Partial<Record<'onEnter' | 'onTeleport', WorldSceneHookSlot>>,
): void {
  if (!world.behaviors.scenes) world.behaviors.scenes = {}
  world.behaviors.scenes[sceneId] = state
}

function assertEntityTarget(entity: EntityBaseV5, target: EntityAddress): void {
  if (entity.id !== target.entity)
    throw new Error(`entity address ${target.entity} 与定义 ${entity.id} 不匹配`)
}

function pageById(entity: EntityBaseV5, pageId: string): EntityPageV5 {
  const page = entity.pages?.find((candidate) => candidate.id === pageId)
  if (!page) throw new Error(`entity ${entity.id}: page 不存在 ${pageId}`)
  return page
}

export function resolveEntityPageV5(
  entity: EntityBaseV5,
  state?: WorldEntityBehaviorState,
): EntityPageV5 | undefined {
  const pageId = state?.page ?? entity.initialPage
  if (pageId === undefined) return
  return pageById(entity, pageId)
}

function behaviorRegistry(
  entity: EntityBaseV5,
  channel: 'trigger' | 'auto',
): Record<BehaviorId, NamedEntityBehaviorV5> | undefined {
  return entity.behaviors?.[channel]
}

function effectiveBehaviorId(
  entity: EntityBaseV5,
  state: WorldEntityBehaviorState | undefined,
  channel: 'trigger' | 'auto',
): BehaviorId | undefined {
  const selection = state?.[channel]?.selection
  let id: string | undefined
  if (selection?.kind === 'disabled') return
  if (selection?.kind === 'use') id = selection.value
  else id = resolveEntityPageV5(entity, state)?.[channel]
  if (id === undefined) return
  if (!behaviorRegistry(entity, channel)?.[id])
    throw new Error(`entity ${entity.id}: ${channel} behavior 不存在 ${id}`)
  return id
}

export function initialFlowCursorV5(flow: ScriptFlowV5): FlowCursor {
  return flow.kind === 'stages'
    ? { kind: 'stage', stage: flow.initial }
    : {
        kind: 'state',
        machine: flow.machine.id,
        state: flow.machine.initial,
      }
}

export function assertFlowCursorV5(flow: ScriptFlowV5, cursor: FlowCursor): void {
  if (flow.kind === 'stages') {
    if (cursor.kind !== 'stage') throw new Error('stages flow 不能使用 state cursor')
    if (!flow.stages.some((stage) => stage.id === cursor.stage))
      throw new Error(`stage cursor 不存在 ${cursor.stage}`)
    return
  }
  if (cursor.kind !== 'state') throw new Error('stateMachine flow 不能使用 stage cursor')
  if (cursor.machine !== flow.machine.id)
    throw new Error(`machine cursor ${cursor.machine} 不匹配 ${flow.machine.id}`)
  if (!Object.hasOwn(flow.machine.states, cursor.state))
    throw new Error(`state cursor 不存在 ${cursor.state}`)
}

export function resolveEntityBehaviorV5(
  entity: EntityBaseV5,
  world: WorldScriptStateV5,
  target: EntityAddress,
  channel: 'trigger' | 'auto',
): ResolvedEntityBehaviorV5 | undefined {
  assertEntityTarget(entity, target)
  const state = entityWorldState(world, target)
  const behaviorId = effectiveBehaviorId(entity, state, channel)
  if (behaviorId === undefined) return
  const behavior = behaviorRegistry(entity, channel)?.[behaviorId]
  if (!behavior) throw new Error(`entity ${entity.id}: ${channel} behavior 不存在 ${behaviorId}`)
  const saved = state?.[channel]?.cursor
  const cursor =
    saved?.behavior === behaviorId ? clone(saved.at) : initialFlowCursorV5(behavior.flow)
  assertFlowCursorV5(behavior.flow, cursor)
  return { behaviorId, behavior, cursor }
}

export function resolveEntityTriggerActivationV5(
  entity: EntityBaseV5,
  world: WorldScriptStateV5,
  target: EntityAddress,
): TriggerActivation | undefined {
  const state = entityWorldState(world, target)
  const selection = state?.triggerActivation
  if (selection?.kind === 'disabled') return
  if (selection?.kind === 'use') return clone(selection.value)
  return clone(resolveEntityPageV5(entity, state)?.triggerActivation)
}

function applyBehaviorSelection(
  state: WorldEntityBehaviorState,
  channel: 'trigger' | 'auto',
  selection: Selection<BehaviorId>,
): void {
  const slot = clone(state[channel] ?? {})
  if (selection.kind === 'inherit') delete slot.selection
  else slot.selection = clone(selection)
  state[channel] = slot
}

function preserveMatchingCursor(
  state: WorldEntityBehaviorState,
  channel: 'trigger' | 'auto',
  previousId: string | undefined,
  nextId: string | undefined,
): void {
  const slot = state[channel]
  if (!slot) return
  if (previousId !== nextId || slot.cursor?.behavior !== nextId) delete slot.cursor
}

export function selectEntityBehaviorV5(
  world: WorldScriptStateV5,
  entity: EntityBaseV5,
  target: EntityAddress,
  channel: 'trigger' | 'auto',
  selection: Selection<BehaviorId>,
  coordinator?: FlowRuntimeCoordinatorV5,
): boolean {
  assertEntityTarget(entity, target)
  if (selection.kind === 'use' && !behaviorRegistry(entity, channel)?.[selection.value])
    throw new Error(`entity ${entity.id}: ${channel} behavior 不存在 ${selection.value}`)
  const current = clone(entityWorldState(world, target) ?? {})
  const previousId = effectiveBehaviorId(entity, current, channel)
  const next = clone(current)
  applyBehaviorSelection(next, channel, selection)
  const nextId = effectiveBehaviorId(entity, next, channel)
  preserveMatchingCursor(next, channel, previousId, nextId)
  writeEntityWorldState(world, target, next)
  const changed = previousId !== nextId
  if (changed) coordinator?.bump(entityOwner(target, channel))
  return changed
}

export function selectEntityPageV5(
  world: WorldScriptStateV5,
  entity: EntityBaseV5,
  target: EntityAddress,
  selection: PageSelection,
  coordinator?: FlowRuntimeCoordinatorV5,
): EntityPageSelectionResultV5 {
  assertEntityTarget(entity, target)
  if (selection.kind === 'use') pageById(entity, selection.value)
  const current = clone(entityWorldState(world, target) ?? {})
  const previousPage = resolveEntityPageV5(entity, current)
  const previousTrigger = effectiveBehaviorId(entity, current, 'trigger')
  const previousAuto = effectiveBehaviorId(entity, current, 'auto')
  const next = clone(current)
  if (selection.kind === 'inherit') delete next.page
  else next.page = selection.value
  if (next.trigger) delete next.trigger.selection
  if (next.auto) delete next.auto.selection
  delete next.triggerActivation
  const page = resolveEntityPageV5(entity, next)
  const nextTrigger = effectiveBehaviorId(entity, next, 'trigger')
  const nextAuto = effectiveBehaviorId(entity, next, 'auto')
  preserveMatchingCursor(next, 'trigger', previousTrigger, nextTrigger)
  preserveMatchingCursor(next, 'auto', previousAuto, nextAuto)
  writeEntityWorldState(world, target, next)
  const triggerChanged = previousTrigger !== nextTrigger
  const autoChanged = previousAuto !== nextAuto
  if (triggerChanged) coordinator?.bump(entityOwner(target, 'trigger'))
  if (autoChanged) coordinator?.bump(entityOwner(target, 'auto'))
  return {
    ...(previousPage === undefined ? {} : { previousPage: previousPage.id }),
    ...(page === undefined ? {} : { page: page.id }),
    triggerChanged,
    autoChanged,
    animationChanged: !sameValue(previousPage?.animation, page?.animation),
  }
}

export function setEntityTriggerActivationV5(
  world: WorldScriptStateV5,
  entity: EntityBaseV5,
  target: EntityAddress,
  selection: Selection<TriggerActivation>,
): void {
  assertEntityTarget(entity, target)
  if (selection.kind === 'use') {
    if (selection.value.on !== 'interact' && selection.value.on !== 'touch')
      throw new Error('trigger activation.on: 期望 interact|touch')
    if (
      selection.value.range !== undefined &&
      (!Number.isFinite(selection.value.range) || selection.value.range < 0)
    )
      throw new Error('trigger activation.range: 期望非负有限数')
  }
  const next = clone(entityWorldState(world, target) ?? {})
  if (selection.kind === 'inherit') delete next.triggerActivation
  else next.triggerActivation = clone(selection)
  resolveEntityPageV5(entity, next)
  writeEntityWorldState(world, target, next)
}

function hookChannel(scene: SceneDefV5, slot: 'onEnter' | 'onTeleport') {
  return scene.hooks?.[slot]
}

function effectiveHookId(
  scene: SceneDefV5,
  state: Partial<Record<'onEnter' | 'onTeleport', WorldSceneHookSlot>> | undefined,
  slot: 'onEnter' | 'onTeleport',
): HookId | undefined {
  const selection = state?.[slot]?.selection
  if (selection?.kind === 'disabled') return
  const id = selection?.kind === 'use' ? selection.value : hookChannel(scene, slot)?.initial
  if (id === undefined) return
  if (!hookChannel(scene, slot)?.variants[id])
    throw new Error(`scene ${scene.id}: ${slot} hook 不存在 ${id}`)
  return id
}

export function resolveSceneHookV5(
  scene: SceneDefV5,
  world: WorldScriptStateV5,
  slot: 'onEnter' | 'onTeleport',
): ResolvedSceneHookV5 | undefined {
  const state = sceneWorldState(world, scene.id)
  const hookId = effectiveHookId(scene, state, slot)
  if (hookId === undefined) return
  const hook = hookChannel(scene, slot)?.variants[hookId]
  if (!hook) throw new Error(`scene ${scene.id}: ${slot} hook 不存在 ${hookId}`)
  const saved = state?.[slot]?.cursor
  const cursor = saved?.hook === hookId ? clone(saved.at) : initialFlowCursorV5(hook.flow)
  assertFlowCursorV5(hook.flow, cursor)
  return { hookId, hook, cursor }
}

export function selectSceneHooksV5(
  world: WorldScriptStateV5,
  scene: SceneDefV5,
  selection: Partial<Record<'onEnter' | 'onTeleport', Selection<HookId>>>,
  coordinator?: FlowRuntimeCoordinatorV5,
): Readonly<Record<'onEnter' | 'onTeleport', boolean>> {
  const slots = (['onEnter', 'onTeleport'] as const).filter((slot) =>
    Object.hasOwn(selection, slot),
  )
  if (slots.length === 0) throw new Error('selectSceneHooks.selection: 至少需要一个 own slot')
  for (const slot of slots) {
    const value = selection[slot]
    if (value?.kind === 'use' && !hookChannel(scene, slot)?.variants[value.value])
      throw new Error(`scene ${scene.id}: ${slot} hook 不存在 ${value.value}`)
  }
  const current = clone(sceneWorldState(world, scene.id) ?? {})
  const next = clone(current)
  const changed = { onEnter: false, onTeleport: false }
  for (const slot of slots) {
    const value = selection[slot]
    if (!value) continue
    const previousId = effectiveHookId(scene, current, slot)
    const slotState = clone(next[slot] ?? {})
    if (value.kind === 'inherit') delete slotState.selection
    else slotState.selection = clone(value)
    next[slot] = slotState
    const nextId = effectiveHookId(scene, next, slot)
    if (previousId !== nextId || slotState.cursor?.hook !== nextId) delete slotState.cursor
    changed[slot] = previousId !== nextId
  }
  writeSceneWorldState(world, scene.id, next)
  for (const slot of slots) if (changed[slot]) coordinator?.bump(hookOwner(scene.id, slot))
  return changed
}

export class FlowActivationLeaseV5 implements FlowCursorControllerV5 {
  private active = true

  constructor(
    private readonly coordinator: FlowRuntimeCoordinatorV5,
    private readonly key: string,
    private readonly epoch: number,
    private readonly commit: (cursor: FlowCursor) => void,
  ) {}

  async reachSafePoint(cursor: FlowCursor): Promise<SafePointDecisionV5> {
    if (!this.active) return 'stop'
    if (this.coordinator.epochForKey(this.key) !== this.epoch) {
      this.active = false
      this.coordinator.finish(this)
      return 'stop'
    }
    this.commit(clone(cursor))
    if (this.coordinator.gateClosed()) {
      this.active = false
      this.coordinator.finish(this)
      return 'stop'
    }
    return 'continue'
  }

  close(): void {
    if (!this.active) return
    this.active = false
    this.coordinator.finish(this)
  }
}

export interface ActiveEntityBehaviorV5 extends ResolvedEntityBehaviorV5 {
  lease: FlowActivationLeaseV5
}

export interface ActiveSceneHookV5 extends ResolvedSceneHookV5 {
  lease: FlowActivationLeaseV5
}

interface PendingBarrierV5 {
  ready: boolean
  resolve: () => void
  reject: (reason?: unknown) => void
}

export class FlowRuntimeCoordinatorV5 {
  private readonly epochs = new Map<string, number>()
  private readonly active = new Set<FlowActivationLeaseV5>()
  private pending?: PendingBarrierV5

  epoch(owner: PersistentFlowOwnerV5): number {
    return this.epochForKey(ownerKey(owner))
  }

  bump(owner: PersistentFlowOwnerV5): number {
    const key = ownerKey(owner)
    const epoch = this.epochForKey(key) + 1
    this.epochs.set(key, epoch)
    return epoch
  }

  begin(
    owner: PersistentFlowOwnerV5,
    commit: (cursor: FlowCursor) => void,
  ): FlowActivationLeaseV5 | undefined {
    if (this.pending) return
    const key = ownerKey(owner)
    const lease = new FlowActivationLeaseV5(this, key, this.epochForKey(key), commit)
    this.active.add(lease)
    return lease
  }

  requestSaveBarrier(): FlowSaveBarrierHandleV5 {
    if (this.pending) throw new Error('save barrier 已经关闭')
    let resolve!: () => void
    let reject!: (reason?: unknown) => void
    const ready = new Promise<void>((accept, decline) => {
      resolve = accept
      reject = decline
    })
    const pending = { ready: false, resolve, reject }
    this.pending = pending
    this.resolveBarrierIfReady()
    return {
      ready,
      release: () => {
        if (this.pending !== pending) throw new Error('save barrier handle 已失效')
        if (!pending.ready) throw new Error('save barrier 尚未 ready，不能 release')
        this.pending = undefined
      },
      cancel: (reason?: unknown) => {
        if (this.pending !== pending) return
        this.pending = undefined
        if (!pending.ready)
          pending.reject(
            reason instanceof Error
              ? reason
              : new Error(reason === undefined ? 'save barrier cancelled' : String(reason)),
          )
      },
    }
  }

  beginEntityBehavior(
    world: WorldScriptStateV5,
    entity: EntityBaseV5,
    target: EntityAddress,
    channel: 'trigger' | 'auto',
  ): ActiveEntityBehaviorV5 | undefined {
    const resolved = resolveEntityBehaviorV5(entity, world, target, channel)
    if (!resolved) return
    const lease = this.begin(entityOwner(target, channel), (cursor) => {
      const state = clone(entityWorldState(world, target) ?? {})
      const slot: ActiveBehaviorSlot = clone(state[channel] ?? {})
      slot.cursor = {
        behavior: resolved.behaviorId,
        at: clone(cursor),
      }
      state[channel] = slot
      writeEntityWorldState(world, target, state)
    })
    if (!lease) return
    return { ...resolved, lease }
  }

  beginSceneHook(
    world: WorldScriptStateV5,
    scene: SceneDefV5,
    slot: 'onEnter' | 'onTeleport',
  ): ActiveSceneHookV5 | undefined {
    const resolved = resolveSceneHookV5(scene, world, slot)
    if (!resolved) return
    const lease = this.begin(hookOwner(scene.id, slot), (cursor) => {
      const state = clone(sceneWorldState(world, scene.id) ?? {})
      const slotState = clone(state[slot] ?? {})
      slotState.cursor = { hook: resolved.hookId, at: clone(cursor) }
      state[slot] = slotState
      writeSceneWorldState(world, scene.id, state)
    })
    if (!lease) return
    return { ...resolved, lease }
  }

  epochForKey(key: string): number {
    return this.epochs.get(key) ?? 0
  }

  gateClosed(): boolean {
    return this.pending !== undefined
  }

  finish(lease: FlowActivationLeaseV5): void {
    this.active.delete(lease)
    this.resolveBarrierIfReady()
  }

  private resolveBarrierIfReady(): void {
    if (!this.pending || this.pending.ready || this.active.size > 0) return
    this.pending.ready = true
    this.pending.resolve()
  }
}

export function evalAuthorConditionV5(
  condition: AuthorConditionV5,
  args: {
    world: WorldScriptStateV5
    currentSceneId?: () => string
    query: {
      hasItem(itemId: string, atLeast: number): boolean
      ownsItem(itemId: string, atLeast: number): boolean
      itemEquipped(itemId: string, atLeast: number): boolean
      allFullHp(): boolean
      money(): number
      inParty(actorId: string): boolean
      entityInScene(target: EntityAddress): boolean
      facingEntity(target: EntityAddress, range: number): boolean
    }
    random?: () => number
  },
): boolean {
  const random = args.random ?? Math.random
  switch (condition.kind) {
    case 'flag':
      return (args.world.flags[condition.flag] ?? false) === condition.is
    case 'var': {
      const value = args.world.vars[condition.var] ?? 0
      switch (condition.op) {
        case '==':
          return value === condition.value
        case '!=':
          return value !== condition.value
        case '>=':
          return value >= condition.value
        case '<=':
          return value <= condition.value
        case '>':
          return value > condition.value
        case '<':
          return value < condition.value
      }
      return false
    }
    case 'currentScene': {
      const scene = args.currentSceneId?.()
      if (!scene) throw new Error('currentScene 条件缺当前场景查询')
      return scene === condition.scene
    }
    case 'entityState':
      return (
        (args.world.entityState[condition.target.scene]?.[condition.target.entity] ??
          Number.NaN) === condition.is
      )
    case 'entityInScene':
      return args.query.entityInScene(condition.target)
    case 'facingEntity':
      return args.query.facingEntity(condition.target, condition.range ?? 0)
    case 'chance':
      return random() * 100 < condition.percent
    case 'hasItem':
      return args.query.hasItem(condition.itemId, condition.atLeast ?? 1)
    case 'ownsItem':
      return args.query.ownsItem(condition.itemId, condition.atLeast ?? 1)
    case 'itemEquipped':
      return args.query.itemEquipped(condition.itemId, condition.atLeast ?? 1)
    case 'allFullHp':
      return args.query.allFullHp()
    case 'hasMoney':
      return args.query.money() >= condition.atLeast
    case 'inParty':
      return args.query.inParty(condition.actorId)
    case 'all':
      return condition.of.every((child) => evalAuthorConditionV5(child, args))
    case 'any':
      return condition.of.some((child) => evalAuthorConditionV5(child, args))
    case 'not':
      return !evalAuthorConditionV5(condition.cond, args)
  }
}
