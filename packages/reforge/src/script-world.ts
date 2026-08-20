import type {
  ActiveBehaviorSlot,
  AuthorCondition,
  BehaviorId,
  CursorHandoff,
  EntityAddress,
  BaseSceneEntity,
  BaseEntityPage,
  FlowCursor,
  HookId,
  BaseEntityBehavior,
  BaseSceneHook,
  PageSelection,
  BaseSceneDef,
  BaseScriptFlow,
  Selection,
  TriggerActivation,
  WorldEntityBehaviorState,
  WorldSceneHookSlot,
  WorldScriptState,
} from '@type-pal/content'
import type { FlowCursorController, SafePointDecision } from './script-runner-core.js'

export type PersistentFlowOwner =
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

export interface ResolvedEntityBehavior {
  behaviorId: BehaviorId
  behavior: BaseEntityBehavior
  cursor: FlowCursor
}

export interface ResolvedSceneHook {
  hookId: HookId
  hook: BaseSceneHook
  cursor: FlowCursor
}

export interface EntityPageSelectionResult {
  previousPage?: string
  page?: string
  triggerChanged: boolean
  autoChanged: boolean
  animationChanged: boolean
}

export interface FlowSaveBarrierHandle {
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

function flowCursorKey(cursor: FlowCursor): string {
  return cursor.kind === 'stage'
    ? JSON.stringify(['stage', cursor.stage])
    : JSON.stringify(['state', cursor.machine, cursor.state])
}

function ownerKey(owner: PersistentFlowOwner): string {
  return owner.kind === 'entity-behavior'
    ? JSON.stringify([owner.kind, owner.target.scene, owner.target.entity, owner.channel])
    : JSON.stringify([owner.kind, owner.scene, owner.slot])
}

function entityOwner(target: EntityAddress, channel: 'trigger' | 'auto'): PersistentFlowOwner {
  return { kind: 'entity-behavior', target: clone(target), channel }
}

function hookOwner(scene: string, slot: 'onEnter' | 'onTeleport'): PersistentFlowOwner {
  return { kind: 'scene-hook', scene, slot }
}

function entityWorldState(
  world: WorldScriptState,
  target: EntityAddress,
): WorldEntityBehaviorState | undefined {
  return world.behaviors.entities?.[target.scene]?.[target.entity]
}

function writeEntityWorldState(
  world: WorldScriptState,
  target: EntityAddress,
  state: WorldEntityBehaviorState,
): void {
  if (!world.behaviors.entities) world.behaviors.entities = {}
  const scene = world.behaviors.entities[target.scene] ?? {}
  world.behaviors.entities[target.scene] = scene
  scene[target.entity] = state
}

function sceneWorldState(
  world: WorldScriptState,
  scene: string,
): Partial<Record<'onEnter' | 'onTeleport', WorldSceneHookSlot>> | undefined {
  return world.behaviors.scenes?.[scene]
}

function writeSceneWorldState(
  world: WorldScriptState,
  sceneId: string,
  state: Partial<Record<'onEnter' | 'onTeleport', WorldSceneHookSlot>>,
): void {
  if (!world.behaviors.scenes) world.behaviors.scenes = {}
  world.behaviors.scenes[sceneId] = state
}

function assertEntityTarget(entity: BaseSceneEntity, target: EntityAddress): void {
  if (entity.id !== target.entity)
    throw new Error(`entity address ${target.entity} 与定义 ${entity.id} 不匹配`)
}

function pageById(entity: BaseSceneEntity, pageId: string): BaseEntityPage {
  const page = entity.pages?.find((candidate) => candidate.id === pageId)
  if (!page) throw new Error(`entity ${entity.id}: page 不存在 ${pageId}`)
  return page
}

export function resolveBaseEntityPage(
  entity: BaseSceneEntity,
  state?: WorldEntityBehaviorState,
): BaseEntityPage | undefined {
  const pageId = state?.page ?? entity.initialPage
  if (pageId === undefined) return
  return pageById(entity, pageId)
}

function behaviorRegistry(
  entity: BaseSceneEntity,
  channel: 'trigger' | 'auto',
): Record<BehaviorId, BaseEntityBehavior> | undefined {
  return entity.behaviors?.[channel]
}

function effectiveBehaviorId(
  entity: BaseSceneEntity,
  state: WorldEntityBehaviorState | undefined,
  channel: 'trigger' | 'auto',
): BehaviorId | undefined {
  const selection = state?.[channel]?.selection
  let id: string | undefined
  if (selection?.kind === 'disabled') return
  if (selection?.kind === 'use') id = selection.value
  else id = resolveBaseEntityPage(entity, state)?.[channel]
  if (id === undefined) return
  if (!behaviorRegistry(entity, channel)?.[id])
    throw new Error(`entity ${entity.id}: ${channel} behavior 不存在 ${id}`)
  return id
}

export function initialFlowCursor(flow: BaseScriptFlow): FlowCursor {
  return flow.kind === 'stages'
    ? { kind: 'stage', stage: flow.initial }
    : {
        kind: 'state',
        machine: flow.machine.id,
        state: flow.machine.initial,
      }
}

export function assertFlowCursor(flow: BaseScriptFlow, cursor: FlowCursor): void {
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

export function resolveEntityBehavior(
  entity: BaseSceneEntity,
  world: WorldScriptState,
  target: EntityAddress,
  channel: 'trigger' | 'auto',
): ResolvedEntityBehavior | undefined {
  assertEntityTarget(entity, target)
  const state = entityWorldState(world, target)
  const behaviorId = effectiveBehaviorId(entity, state, channel)
  if (behaviorId === undefined) return
  const behavior = behaviorRegistry(entity, channel)?.[behaviorId]
  if (!behavior) throw new Error(`entity ${entity.id}: ${channel} behavior 不存在 ${behaviorId}`)
  const saved = state?.[channel]?.cursor
  const cursor =
    saved?.behavior === behaviorId ? clone(saved.at) : initialFlowCursor(behavior.flow)
  assertFlowCursor(behavior.flow, cursor)
  return { behaviorId, behavior, cursor }
}

export function resolveEntityTriggerActivation(
  entity: BaseSceneEntity,
  world: WorldScriptState,
  target: EntityAddress,
): TriggerActivation | undefined {
  const state = entityWorldState(world, target)
  const selection = state?.triggerActivation
  if (selection?.kind === 'disabled') return
  if (selection?.kind === 'use') return clone(selection.value)
  return clone(resolveBaseEntityPage(entity, state)?.triggerActivation)
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

export function selectEntityBehavior(
  world: WorldScriptState,
  entity: BaseSceneEntity,
  target: EntityAddress,
  channel: 'trigger' | 'auto',
  selection: Selection<BehaviorId>,
  coordinator?: FlowRuntimeCoordinator,
  cursorHandoff?: CursorHandoff,
): boolean {
  assertEntityTarget(entity, target)
  if (selection.kind === 'use' && !behaviorRegistry(entity, channel)?.[selection.value])
    throw new Error(`entity ${entity.id}: ${channel} behavior 不存在 ${selection.value}`)
  const current = clone(entityWorldState(world, target) ?? {})
  const previousId = effectiveBehaviorId(entity, current, channel)
  const previous = resolveEntityBehavior(entity, world, target, channel)
  const next = clone(current)
  applyBehaviorSelection(next, channel, selection)
  const nextId = effectiveBehaviorId(entity, next, channel)
  if (cursorHandoff) {
    if (!coordinator) throw new Error('cursorHandoff: 缺少 FlowRuntimeCoordinator')
    if (cursorHandoff.kind !== 'stateMap' || cursorHandoff.onUnmapped !== 'error')
      throw new Error('cursorHandoff: 仅支持 stateMap + onUnmapped=error')
    if (selection.kind !== 'use') throw new Error('cursorHandoff: 仅 selection.use 可声明游标交接')
    if (!previous || previous.behaviorId !== cursorHandoff.fromBehavior)
      throw new Error(
        `cursorHandoff: 当前 ${channel} behavior ${
          previous?.behaviorId ?? '<disabled>'
        } 不匹配来源 ${cursorHandoff.fromBehavior}`,
      )
    const targetBehavior = behaviorRegistry(entity, channel)?.[selection.value]
    if (!targetBehavior)
      throw new Error(`entity ${entity.id}: ${channel} behavior 不存在 ${selection.value}`)
    if (!Array.isArray(cursorHandoff.cases) || cursorHandoff.cases.length === 0)
      throw new Error('cursorHandoff.cases: 期望非空映射数组')
    const sourceKeys = new Set<string>()
    for (const mapping of cursorHandoff.cases) {
      assertFlowCursor(previous.behavior.flow, mapping.from)
      assertFlowCursor(targetBehavior.flow, mapping.to)
      const key = flowCursorKey(mapping.from)
      if (sourceKeys.has(key)) throw new Error(`cursorHandoff: 来源游标重复 ${key}`)
      sourceKeys.add(key)
    }
    const currentCursorKey = flowCursorKey(previous.cursor)
    const matches = cursorHandoff.cases.filter(
      (mapping) => flowCursorKey(mapping.from) === currentCursorKey,
    )
    if (matches.length !== 1)
      throw new Error(
        `cursorHandoff: 当前游标 ${JSON.stringify(previous.cursor)} 命中 ${matches.length} 条映射`,
      )
    const slot = next[channel]
    if (!slot || nextId !== selection.value)
      throw new Error('cursorHandoff: 目标 behavior 选择未生效')
    const mapping = matches[0]
    if (!mapping) throw new Error('cursorHandoff: 唯一映射缺失')
    slot.cursor = {
      behavior: selection.value,
      at: clone(mapping.to),
    }
  } else {
    preserveMatchingCursor(next, channel, previousId, nextId)
  }
  writeEntityWorldState(world, target, next)
  const changed = previousId !== nextId || cursorHandoff !== undefined
  if (changed) coordinator?.bump(entityOwner(target, channel))
  return changed
}

export function selectBaseEntityPage(
  world: WorldScriptState,
  entity: BaseSceneEntity,
  target: EntityAddress,
  selection: PageSelection,
  coordinator?: FlowRuntimeCoordinator,
): EntityPageSelectionResult {
  assertEntityTarget(entity, target)
  if (selection.kind === 'use') pageById(entity, selection.value)
  const current = clone(entityWorldState(world, target) ?? {})
  const previousPage = resolveBaseEntityPage(entity, current)
  const previousTrigger = effectiveBehaviorId(entity, current, 'trigger')
  const previousAuto = effectiveBehaviorId(entity, current, 'auto')
  const next = clone(current)
  if (selection.kind === 'inherit') delete next.page
  else next.page = selection.value
  if (next.trigger) delete next.trigger.selection
  if (next.auto) delete next.auto.selection
  delete next.triggerActivation
  const page = resolveBaseEntityPage(entity, next)
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

export function setEntityTriggerActivation(
  world: WorldScriptState,
  entity: BaseSceneEntity,
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
  resolveBaseEntityPage(entity, next)
  writeEntityWorldState(world, target, next)
}

function hookChannel(scene: BaseSceneDef, slot: 'onEnter' | 'onTeleport') {
  return scene.hooks?.[slot]
}

function effectiveHookId(
  scene: BaseSceneDef,
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

export function resolveSceneHook(
  scene: BaseSceneDef,
  world: WorldScriptState,
  slot: 'onEnter' | 'onTeleport',
): ResolvedSceneHook | undefined {
  const state = sceneWorldState(world, scene.id)
  const hookId = effectiveHookId(scene, state, slot)
  if (hookId === undefined) return
  const hook = hookChannel(scene, slot)?.variants[hookId]
  if (!hook) throw new Error(`scene ${scene.id}: ${slot} hook 不存在 ${hookId}`)
  const saved = state?.[slot]?.cursor
  const cursor = saved?.hook === hookId ? clone(saved.at) : initialFlowCursor(hook.flow)
  assertFlowCursor(hook.flow, cursor)
  return { hookId, hook, cursor }
}

export function selectBaseSceneHooks(
  world: WorldScriptState,
  scene: BaseSceneDef,
  selection: Partial<Record<'onEnter' | 'onTeleport', Selection<HookId>>>,
  coordinator?: FlowRuntimeCoordinator,
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

export class FlowActivationLease implements FlowCursorController {
  private active = true

  constructor(
    private readonly coordinator: FlowRuntimeCoordinator,
    private readonly key: string,
    private readonly epoch: number,
    private readonly commit: (cursor: FlowCursor) => void,
  ) {}

  async reachSafePoint(cursor: FlowCursor): Promise<SafePointDecision> {
    if (!this.active) return 'stop'
    if (this.coordinator.epochForKey(this.key) !== this.epoch) {
      this.active = false
      this.coordinator.finish(this.key, this)
      return 'stop'
    }
    this.commit(clone(cursor))
    if (this.coordinator.gateClosed()) {
      this.active = false
      this.coordinator.finish(this.key, this)
      return 'stop'
    }
    return 'continue'
  }

  close(): void {
    if (!this.active) return
    this.active = false
    this.coordinator.finish(this.key, this)
  }
}

/**
 * 不持久化 FlowCursor 的脚本活动租约。共享脚本、物品私有脚本和临时 command
 * 仍必须进入与持久 flow 相同的 active 注册表，否则 save barrier 会漏看正在等待
 * confirm / battle / host effect 的执行。
 */
export class FlowActivityLease {
  private active = true

  constructor(
    private readonly coordinator: FlowRuntimeCoordinator,
    private readonly key: string,
  ) {}

  close(): void {
    if (!this.active) return
    this.active = false
    this.coordinator.finish(this.key, this)
  }
}

export interface ActiveEntityBehavior extends ResolvedEntityBehavior {
  lease: FlowActivationLease
}

export interface ActiveSceneHook extends ResolvedSceneHook {
  lease: FlowActivationLease
}

interface PendingBarrier {
  ready: boolean
  resolve: () => void
  reject: (reason?: unknown) => void
  opened: Promise<void>
  resolveOpened: () => void
}

export class FlowRuntimeCoordinator {
  private readonly epochs = new Map<string, number>()
  private readonly active = new Map<string, FlowActivationLease | FlowActivityLease>()
  private nextActivityId = 1
  private pending?: PendingBarrier

  epoch(owner: PersistentFlowOwner): number {
    return this.epochForKey(ownerKey(owner))
  }

  bump(owner: PersistentFlowOwner): number {
    const key = ownerKey(owner)
    const epoch = this.epochForKey(key) + 1
    this.epochs.set(key, epoch)
    return epoch
  }

  begin(
    owner: PersistentFlowOwner,
    commit: (cursor: FlowCursor) => void,
  ): FlowActivationLease | undefined {
    if (this.pending) return
    const key = ownerKey(owner)
    if (this.active.has(key)) return
    const lease = new FlowActivationLease(this, key, this.epochForKey(key), commit)
    this.active.set(key, lease)
    return lease
  }

  /**
   * 登记一个无 cursor 的完整脚本活动。save barrier 已关闭时拒绝新活动；调用方应通过
   * waitForActivationGate 等待并重试，与持久 flow 的激活纪律一致。
   */
  beginActivity(): FlowActivityLease | undefined {
    if (this.pending) return
    const key = `transient:${this.nextActivityId++}`
    const lease = new FlowActivityLease(this, key)
    this.active.set(key, lease)
    return lease
  }

  requestSaveBarrier(): FlowSaveBarrierHandle {
    if (this.pending) throw new Error('save barrier 已经关闭')
    let resolve!: () => void
    let reject!: (reason?: unknown) => void
    let resolveOpened!: () => void
    const ready = new Promise<void>((accept, decline) => {
      resolve = accept
      reject = decline
    })
    const opened = new Promise<void>((accept) => {
      resolveOpened = accept
    })
    const pending = { ready: false, resolve, reject, opened, resolveOpened }
    this.pending = pending
    this.resolveBarrierIfReady()
    return {
      ready,
      release: () => {
        if (this.pending !== pending) throw new Error('save barrier handle 已失效')
        if (!pending.ready) throw new Error('save barrier 尚未 ready，不能 release')
        this.pending = undefined
        pending.resolveOpened()
      },
      cancel: (reason?: unknown) => {
        if (this.pending !== pending) return
        this.pending = undefined
        pending.resolveOpened()
        if (!pending.ready)
          pending.reject(
            reason instanceof Error
              ? reason
              : new Error(reason === undefined ? 'save barrier cancelled' : String(reason)),
          )
      },
    }
  }

  async waitForActivationGate(signal: AbortSignal): Promise<void> {
    while (this.pending) {
      if (signal.aborted) throw new DOMException('script activation aborted', 'AbortError')
      const pending = this.pending
      await new Promise<void>((resolve, reject) => {
        let settled = false
        const finish = (): void => {
          if (settled) return
          settled = true
          signal.removeEventListener('abort', abort)
          resolve()
        }
        const abort = (): void => {
          if (settled) return
          settled = true
          reject(new DOMException('script activation aborted', 'AbortError'))
        }
        void pending.opened.then(finish)
        signal.addEventListener('abort', abort, { once: true })
        if (signal.aborted) abort()
      })
    }
  }

  beginEntityBehavior(
    world: WorldScriptState,
    entity: BaseSceneEntity,
    target: EntityAddress,
    channel: 'trigger' | 'auto',
  ): ActiveEntityBehavior | undefined {
    const resolved = resolveEntityBehavior(entity, world, target, channel)
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
    world: WorldScriptState,
    scene: BaseSceneDef,
    slot: 'onEnter' | 'onTeleport',
  ): ActiveSceneHook | undefined {
    const resolved = resolveSceneHook(scene, world, slot)
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

  finish(key: string, lease: FlowActivationLease | FlowActivityLease): void {
    if (this.active.get(key) === lease) this.active.delete(key)
    this.resolveBarrierIfReady()
  }

  private resolveBarrierIfReady(): void {
    if (!this.pending || this.pending.ready || this.active.size > 0) return
    this.pending.ready = true
    this.pending.resolve()
  }
}

export function evalAuthorCondition(
  condition: AuthorCondition,
  args: {
    world: WorldScriptState
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
      return condition.of.every((child) => evalAuthorCondition(child, args))
    case 'any':
      return condition.of.some((child) => evalAuthorCondition(child, args))
    case 'not':
      return !evalAuthorCondition(condition.cond, args)
  }
}
