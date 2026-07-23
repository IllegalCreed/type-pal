import {
  completeExternalWorldItemUse,
  type ItemDataMap,
  type PoisonDef,
  resolveWorldItemUse,
  type ScriptRef,
  type WorldItemUseOutcome,
  type WorldState,
} from '@type-pal/content'

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
  runScript(ref: ScriptRef, signal?: AbortSignal): Promise<void>
  runSceneHook(hook: 'onTeleport', signal?: AbortSignal): Promise<boolean>
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

/**
 * 统一大世界用途执行器。调用方只消费 outcome，不再检查 effect.kind；外部动作全部成功后
 * 才提交物品消耗。场景钩子返回 false 时保留菜单、物品与世界态。
 */
export async function executeWorldItemUse(
  options: ExecuteWorldItemUseOptions,
): Promise<WorldItemUseOutcome> {
  options.signal?.throwIfAborted()
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
      default:
        assertNever(effect)
    }
  }
  options.signal?.throwIfAborted()
  return completeExternalWorldItemUse(options.host.currentWorld(), options.itemId, options.items)
}
