import {
  completeExternalWorldItemUse,
  type EntityAddress,
  type ItemDataMap,
  type ItemUseEffect,
  type PoisonDef,
  preflightWorldItemUse,
  resolveWorldItemUse,
  type ScriptRef,
  type WorldItemUseEffectResult,
  type WorldItemUseOutcome,
  type WorldItemUsePresentation,
  type WorldState,
} from '@type-pal/content'
import { isRuntimeScriptRef } from './runtime-project-view.js'

function assertNever(value: never): never {
  throw new Error(`executeWorldItemUse: 未处理的外部效果 ${JSON.stringify(value)}`)
}

/** 异步边界只在 reforge：content 负责纯世界变换，host 负责脚本与当前场景钩子。 */
export interface ItemUseHost {
  /**
   * 外部脚本可能原地改世界或切场景；提交消耗前必须重新读取活动世界。
   * host 自己负责脚本/场景副作用的事务性；执行器只能保证失败或取消时不再提交物品消耗。
   */
  currentWorld(): WorldState
  /** 混合 item-private 效果链在脚本边界提交已完成的纯效果，供随后脚本读取。 */
  replaceWorld?(world: WorldState): void
  runScript(ref: ScriptRef, signal?: AbortSignal): Promise<void>
  runSceneHook(hook: 'onTeleport', signal?: AbortSignal): Promise<boolean>
  placeEntityInFront(target: EntityAddress, state: number, signal?: AbortSignal): Promise<boolean>
}

export interface ExecuteWorldItemUseOptions {
  world: WorldState
  targetCharId: string
  itemId: string
  items: ItemDataMap
  poisonDefs?: Record<number, PoisonDef>
  rng?: () => number
  host: ItemUseHost
  signal?: AbortSignal
}

function isItemPrivateRuntimeEffect(
  effect: ItemUseEffect,
  itemId: string,
): effect is Extract<ItemUseEffect, { kind: 'runScript' }> {
  return (
    effect.kind === 'runScript' &&
    isRuntimeScriptRef(effect.script) &&
    effect.script.id === `item:${itemId}:use`
  )
}

async function executeMixedItemPrivateUse(
  options: ExecuteWorldItemUseOptions,
): Promise<WorldItemUseOutcome | undefined> {
  const item = options.items[options.itemId]
  const use = item?.use
  if (!item || !use || use.effects.length <= 1) return
  const privateEffects = use.effects.filter((effect) =>
    isItemPrivateRuntimeEffect(effect, options.itemId),
  )
  if (privateEffects.length !== 1) return
  if (
    use.effects.some(
      (effect) =>
        (effect.kind === 'runScript' && !isItemPrivateRuntimeEffect(effect, options.itemId)) ||
        effect.kind === 'runSceneHook' ||
        effect.kind === 'placeEntityInFront',
    )
  )
    return
  if (!options.host.replaceWorld)
    throw new Error('executeWorldItemUse: 混合物品私有脚本缺 replaceWorld 提交边界')

  const preflight = preflightWorldItemUse(
    options.world,
    options.targetCharId,
    options.itemId,
    options.items,
  )
  if (preflight) return preflight

  const effectResults: WorldItemUseEffectResult[] = []
  const presentations: WorldItemUsePresentation[] = []
  for (let index = 0; index < use.effects.length; ) {
    options.signal?.throwIfAborted()
    const effect = use.effects[index]
    if (!effect) throw new Error(`executeWorldItemUse: 效果索引越界 ${index}`)
    if (isItemPrivateRuntimeEffect(effect, options.itemId)) {
      await options.host.runScript(effect.script, options.signal)
      options.signal?.throwIfAborted()
      effectResults.push({ index, kind: effect.kind, changed: true })
      index += 1
      continue
    }

    const start = index
    const pureEffects: ItemUseEffect[] = []
    while (index < use.effects.length) {
      const candidate = use.effects[index]
      if (!candidate || isItemPrivateRuntimeEffect(candidate, options.itemId)) break
      pureEffects.push(candidate)
      index += 1
    }
    const segmentItems: ItemDataMap = {
      ...options.items,
      [options.itemId]: {
        ...item,
        use: { ...use, consuming: false, effects: pureEffects },
      },
    }
    const segment = resolveWorldItemUse(
      options.host.currentWorld(),
      options.targetCharId,
      options.itemId,
      segmentItems,
      options.poisonDefs,
      options.rng,
    )
    if (segment.status !== 'success')
      return {
        ...segment,
        world: options.host.currentWorld(),
        consumed: false,
        changed: effectResults.some((entry) => entry.changed),
        effectResults: [
          ...effectResults,
          ...segment.effectResults.map((entry) => ({ ...entry, index: start + entry.index })),
        ],
        presentations: [...presentations, ...segment.presentations],
      }
    options.host.replaceWorld(segment.world)
    effectResults.push(
      ...segment.effectResults.map((entry) => ({ ...entry, index: start + entry.index })),
    )
    presentations.push(...segment.presentations)
  }

  options.signal?.throwIfAborted()
  const completed = completeExternalWorldItemUse(
    options.host.currentWorld(),
    options.itemId,
    options.items,
  )
  return {
    ...completed,
    changed: completed.changed || effectResults.some((entry) => entry.changed),
    effectResults,
    presentations,
  }
}

/**
 * 统一大世界用途执行器。调用方只消费 outcome，不再检查 effect.kind；外部动作全部成功后
 * 才提交物品消耗。场景钩子返回 false 时保留菜单、物品与世界态。
 */
export async function executeWorldItemUse(
  options: ExecuteWorldItemUseOptions,
): Promise<WorldItemUseOutcome> {
  options.signal?.throwIfAborted()
  const mixedPrivate = await executeMixedItemPrivateUse(options)
  if (mixedPrivate) return mixedPrivate
  const planned = resolveWorldItemUse(
    options.world,
    options.targetCharId,
    options.itemId,
    options.items,
    options.poisonDefs,
    options.rng,
  )
  if (planned.status !== 'external') return planned

  for (const effect of planned.externalEffects ?? []) {
    options.signal?.throwIfAborted()
    switch (effect.kind) {
      case 'runScript':
        await options.host.runScript(effect.script, options.signal)
        options.signal?.throwIfAborted()
        break
      case 'runSceneHook': {
        const available = await options.host.runSceneHook(effect.hook, options.signal)
        options.signal?.throwIfAborted()
        if (!available)
          return {
            status: 'failure',
            world: options.host.currentWorld(),
            consumed: false,
            changed: false,
            effectResults: planned.effectResults,
            presentations: [],
            reason: 'external-unavailable',
            message: effect.unavailableMessage,
            menu: 'keep',
          }
        break
      }
      case 'placeEntityInFront': {
        const available = await options.host.placeEntityInFront(
          effect.target,
          effect.state,
          options.signal,
        )
        options.signal?.throwIfAborted()
        if (!available)
          return {
            status: 'failure',
            world: options.host.currentWorld(),
            consumed: false,
            changed: false,
            effectResults: planned.effectResults,
            presentations: [],
            reason: 'external-unavailable',
            message: effect.unavailableMessage,
            menu: 'keep',
          }
        break
      }
      default:
        assertNever(effect)
    }
  }
  options.signal?.throwIfAborted()
  return completeExternalWorldItemUse(options.host.currentWorld(), options.itemId, options.items)
}
