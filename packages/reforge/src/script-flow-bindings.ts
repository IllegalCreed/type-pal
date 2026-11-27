import type {
  ActiveBehaviorSlot,
  AutoScriptContinuation,
  BaseEntityBehavior,
  BaseEntityPage,
  BaseSceneDef,
  BaseSceneEntity,
  BaseSceneHook,
  BaseScriptFlow,
  BehaviorId,
  EntityAddress,
  FlowCursor,
  HookId,
  PageSelection,
  Selection,
  TriggerActivation,
  WorldEntityBehaviorState,
  WorldSceneHookSlot,
  WorldScriptState,
} from '@type-pal/content'
import { flowCanComplete } from '@type-pal/content'
import { readOwnEntry, writeOwnEntry, writeSceneEntitySnapshot } from './scene-entity-values.js'
import type { FlowRuntimeCoordinator, PersistentFlowOwner } from './script-world.js'

export interface ResolvedEntityBehavior {
  behaviorId: BehaviorId
  behavior: BaseEntityBehavior
  cursor: FlowCursor
  resume?: AutoScriptContinuation
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

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function entityOwner(
  target: EntityAddress,
  channel: 'trigger' | 'auto',
): PersistentFlowOwner {
  return { kind: 'entity-behavior', target: structuredClone(target), channel }
}

export function hookOwner(scene: string, slot: 'onEnter' | 'onTeleport'): PersistentFlowOwner {
  return { kind: 'scene-hook', scene, slot }
}

function entityWorldState(
  world: WorldScriptState,
  target: EntityAddress,
): WorldEntityBehaviorState | undefined {
  return readOwnEntry(readOwnEntry(world.behaviors.entities, target.scene), target.entity)
}

function writeEntityWorldState(
  world: WorldScriptState,
  target: EntityAddress,
  state: WorldEntityBehaviorState,
): void {
  world.behaviors.entities ??= {}
  writeSceneEntitySnapshot(world.behaviors.entities, target, state)
}

function sceneWorldState(
  world: WorldScriptState,
  scene: string,
): Partial<Record<'onEnter' | 'onTeleport', WorldSceneHookSlot>> | undefined {
  return readOwnEntry(world.behaviors.scenes, scene)
}

function writeSceneWorldState(
  world: WorldScriptState,
  sceneId: string,
  state: Partial<Record<'onEnter' | 'onTeleport', WorldSceneHookSlot>>,
): void {
  world.behaviors.scenes ??= {}
  writeOwnEntry(world.behaviors.scenes, sceneId, state)
}

function assertEntityTarget(entity: BaseSceneEntity, target: EntityAddress): void {
  if (entity.id !== target.entity)
    throw new Error(`entity address ${target.entity} 与定义 ${entity.id} 不匹配`)
}

function pageById(entity: Pick<BaseSceneEntity, 'id' | 'pages'>, pageId: string): BaseEntityPage {
  const page = entity.pages?.find((candidate) => candidate.id === pageId)
  if (!page) throw new Error(`entity ${entity.id}: page 不存在 ${pageId}`)
  return page
}

export function resolveBaseEntityPage(
  entity: Pick<BaseSceneEntity, 'id' | 'pages' | 'initialPage'>,
  state?: WorldEntityBehaviorState,
): BaseEntityPage | undefined {
  const pageId = state?.page ?? entity.initialPage
  if (pageId === undefined) return
  return pageById(entity, pageId)
}

function declaredBehavior(
  entity: BaseSceneEntity,
  channel: 'trigger' | 'auto',
  id: BehaviorId,
): BaseEntityBehavior {
  const behavior = readOwnEntry(entity.behaviors?.[channel], id)
  if (!behavior) throw new Error(`entity ${entity.id}: ${channel} behavior 不存在 ${id}`)
  return behavior
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
  declaredBehavior(entity, channel, id)
  return id
}

export function initialFlowCursor(flow: BaseScriptFlow): FlowCursor {
  return { kind: 'stage', stage: flow.initial }
}

export function assertFlowCursor(flow: BaseScriptFlow, cursor: FlowCursor): void {
  if (cursor.kind === 'completed') {
    if (!flowCanComplete(flow)) throw new Error('flow 未声明 complete，不能使用 completed cursor')
    return
  }
  if (!flow.stages.some((stage) => stage.id === cursor.stage))
    throw new Error(`stage cursor 不存在 ${cursor.stage}`)
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
  const behavior = declaredBehavior(entity, channel, behaviorId)
  const saved = state?.[channel]?.cursor
  const cursor =
    saved?.behavior === behaviorId ? structuredClone(saved.at) : initialFlowCursor(behavior.flow)
  assertFlowCursor(behavior.flow, cursor)
  return {
    behaviorId,
    behavior,
    cursor,
    ...(saved?.behavior === behaviorId && saved.resume
      ? { resume: structuredClone(saved.resume) }
      : {}),
  }
}

export function resolveEntityTriggerActivation(
  entity: BaseSceneEntity,
  world: WorldScriptState,
  target: EntityAddress,
): TriggerActivation | undefined {
  const state = entityWorldState(world, target)
  const selection = state?.triggerActivation
  if (selection?.kind === 'disabled') return
  if (selection?.kind === 'use') return structuredClone(selection.value)
  return structuredClone(resolveBaseEntityPage(entity, state)?.triggerActivation)
}

function applyBehaviorSelection(
  state: WorldEntityBehaviorState,
  channel: 'trigger' | 'auto',
  selection: Selection<BehaviorId>,
): void {
  const slot = structuredClone(state[channel] ?? {})
  if (selection.kind === 'inherit') delete slot.selection
  else slot.selection = structuredClone(selection)
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
): boolean {
  assertEntityTarget(entity, target)
  if (selection.kind === 'use') declaredBehavior(entity, channel, selection.value)
  const current = structuredClone(entityWorldState(world, target) ?? {})
  const previousId = effectiveBehaviorId(entity, current, channel)
  const next = structuredClone(current)
  applyBehaviorSelection(next, channel, selection)
  const nextId = effectiveBehaviorId(entity, next, channel)
  preserveMatchingCursor(next, channel, previousId, nextId)
  writeEntityWorldState(world, target, next)
  const changed = previousId !== nextId
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
  const current = structuredClone(entityWorldState(world, target) ?? {})
  const previousPage = resolveBaseEntityPage(entity, current)
  const previousTrigger = effectiveBehaviorId(entity, current, 'trigger')
  const previousAuto = effectiveBehaviorId(entity, current, 'auto')
  const next = structuredClone(current)
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
  const next = structuredClone(entityWorldState(world, target) ?? {})
  if (selection.kind === 'inherit') delete next.triggerActivation
  else next.triggerActivation = structuredClone(selection)
  resolveBaseEntityPage(entity, next)
  writeEntityWorldState(world, target, next)
}

function hookChannel(scene: BaseSceneDef, slot: 'onEnter' | 'onTeleport') {
  return scene.hooks?.[slot]
}

function declaredHook(
  scene: BaseSceneDef,
  slot: 'onEnter' | 'onTeleport',
  id: HookId,
): BaseSceneHook {
  const hook = readOwnEntry(hookChannel(scene, slot)?.variants, id)
  if (!hook) throw new Error(`scene ${scene.id}: ${slot} hook 不存在 ${id}`)
  return hook
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
  declaredHook(scene, slot, id)
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
  const hook = declaredHook(scene, slot, hookId)
  const saved = state?.[slot]?.cursor
  const cursor = saved?.hook === hookId ? structuredClone(saved.at) : initialFlowCursor(hook.flow)
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
    if (value?.kind === 'use') declaredHook(scene, slot, value.value)
  }
  const current = structuredClone(sceneWorldState(world, scene.id) ?? {})
  const next = structuredClone(current)
  const changed = { onEnter: false, onTeleport: false }
  for (const slot of slots) {
    const value = selection[slot]
    if (!value) continue
    const previousId = effectiveHookId(scene, current, slot)
    const slotState = structuredClone(next[slot] ?? {})
    if (value.kind === 'inherit') delete slotState.selection
    else slotState.selection = structuredClone(value)
    next[slot] = slotState
    const nextId = effectiveHookId(scene, next, slot)
    if (previousId !== nextId || slotState.cursor?.hook !== nextId) delete slotState.cursor
    changed[slot] = previousId !== nextId
  }
  writeSceneWorldState(world, scene.id, next)
  for (const slot of slots) if (changed[slot]) coordinator?.bump(hookOwner(scene.id, slot))
  return changed
}

/** Persist the cursor only after the coordinator has checked the current lease. */
export function commitEntityBehaviorCursor(
  world: WorldScriptState,
  target: EntityAddress,
  channel: 'trigger' | 'auto',
  resolved: ResolvedEntityBehavior,
  cursor: FlowCursor,
  resume?: AutoScriptContinuation,
): void {
  assertFlowCursor(resolved.behavior.flow, cursor)
  const state = structuredClone(entityWorldState(world, target) ?? {})
  const slot: ActiveBehaviorSlot = structuredClone(state[channel] ?? {})
  slot.cursor = {
    behavior: resolved.behaviorId,
    at: structuredClone(cursor),
    ...(resume ? { resume: structuredClone(resume) } : {}),
  }
  state[channel] = slot
  writeEntityWorldState(world, target, state)
}

export function commitSceneHookCursor(
  world: WorldScriptState,
  sceneId: string,
  slot: 'onEnter' | 'onTeleport',
  resolved: ResolvedSceneHook,
  cursor: FlowCursor,
): void {
  assertFlowCursor(resolved.hook.flow, cursor)
  const state = structuredClone(sceneWorldState(world, sceneId) ?? {})
  const slotState = structuredClone(state[slot] ?? {})
  slotState.cursor = { hook: resolved.hookId, at: structuredClone(cursor) }
  state[slot] = slotState
  writeSceneWorldState(world, sceneId, state)
}
