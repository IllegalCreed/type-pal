import type { ItemDataMap, ScriptRef, WorldState } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { executeWorldItemUse, type ItemUseHost } from './item-use-executor.js'

function world(itemId: string): WorldState {
  return {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [{ itemId, count: 1 }],
  }
}

function item(
  itemId: string,
  effect: NonNullable<ItemDataMap[string]['use']>['effects'][number],
): ItemDataMap {
  return {
    [itemId]: {
      id: itemId,
      name: itemId,
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: { target: 'scene', consuming: true, effects: [effect] },
    },
  }
}

describe('C8 · executeWorldItemUse 外部事务边界', () => {
  test('已取消的请求在规划前即失败，不进入纯效果或外部宿主', async () => {
    const initial = world('letter')
    const controller = new AbortController()
    controller.abort()
    const host: ItemUseHost = {
      currentWorld: () => initial,
      runScript: vi.fn(async () => undefined),
      runSceneHook: vi.fn(async () => false),
    }
    await expect(
      executeWorldItemUse({
        world: initial,
        targetCharId: '',
        itemId: 'letter',
        items: item('letter', {
          kind: 'runScript',
          script: { chunk: 'shared/c00', id: 'shared/user/letter' },
        }),
        host,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(host.runScript).not.toHaveBeenCalled()
  })

  test('共享脚本成功后从 host 最新世界提交消耗，不覆盖脚本产生的变化', async () => {
    const ref: ScriptRef = { chunk: 'shared/c00', id: 'shared/user/open-bundle' }
    let active = world('bundle')
    const runScript = vi.fn(async () => {
      active = {
        ...active,
        money: active.money + 500,
        inventory: [...active.inventory, { itemId: 'scroll', count: 1 }],
      }
    })
    const host: ItemUseHost = {
      currentWorld: () => active,
      runScript,
      runSceneHook: vi.fn(async () => false),
    }
    const outcome = await executeWorldItemUse({
      world: active,
      targetCharId: '',
      itemId: 'bundle',
      items: item('bundle', { kind: 'runScript', script: ref }),
      host,
    })
    expect(runScript).toHaveBeenCalledWith(ref, undefined)
    expect(outcome).toMatchObject({ status: 'success', consumed: true })
    expect(outcome.world.money).toBe(500)
    expect(outcome.world.inventory).toEqual([{ itemId: 'scroll', count: 1 }])
  })

  test('场景没有 onTeleport 时失败、保留物品并强制保留菜单', async () => {
    const initial = world('bee')
    const host: ItemUseHost = {
      currentWorld: () => initial,
      runScript: vi.fn(async () => undefined),
      runSceneHook: vi.fn(async () => false),
    }
    const outcome = await executeWorldItemUse({
      world: initial,
      targetCharId: '',
      itemId: 'bee',
      items: item('bee', {
        kind: 'runSceneHook',
        hook: 'onTeleport',
        unavailableMessage: '这里不能使用',
      }),
      host,
    })
    expect(outcome).toMatchObject({
      status: 'failure',
      reason: 'external-unavailable',
      message: '这里不能使用',
      menu: 'keep',
      consumed: false,
      world: initial,
    })
  })

  test('场景 onTeleport 成功后按最新世界提交消耗并遵循 close 菜单配置', async () => {
    let active = world('bee')
    const host: ItemUseHost = {
      currentWorld: () => active,
      runScript: vi.fn(async () => undefined),
      runSceneHook: vi.fn(async () => {
        active = { ...active, money: 88 }
        return true
      }),
    }
    const items = item('bee', { kind: 'runSceneHook', hook: 'onTeleport' })
    items.bee!.use!.menuAfterUse = 'close'
    const outcome = await executeWorldItemUse({
      world: active,
      targetCharId: '',
      itemId: 'bee',
      items,
      host,
    })
    expect(host.runSceneHook).toHaveBeenCalledWith('onTeleport', undefined)
    expect(outcome).toMatchObject({
      status: 'success',
      consumed: true,
      menu: 'close',
      world: { money: 88, inventory: [] },
    })
  })

  test('外部脚本抛错时拒绝 Promise，执行器不会提前扣物品', async () => {
    const initial = world('letter')
    const host: ItemUseHost = {
      currentWorld: () => initial,
      runScript: vi.fn(async () => {
        throw new Error('script failed')
      }),
      runSceneHook: vi.fn(async () => false),
    }
    await expect(
      executeWorldItemUse({
        world: initial,
        targetCharId: '',
        itemId: 'letter',
        items: item('letter', {
          kind: 'runScript',
          script: { chunk: 'shared/c00', id: 'shared/user/letter' },
        }),
        host,
      }),
    ).rejects.toThrow('script failed')
    expect(initial.inventory).toEqual([{ itemId: 'letter', count: 1 }])
  })

  test('宿主忽略中途取消时，执行器也不会在外部动作返回后继续扣物品', async () => {
    const initial = world('letter')
    let release!: () => void
    const blocked = new Promise<void>((resolve) => {
      release = resolve
    })
    const controller = new AbortController()
    const host: ItemUseHost = {
      currentWorld: () => initial,
      runScript: vi.fn(async () => blocked),
      runSceneHook: vi.fn(async () => false),
    }
    const execution = executeWorldItemUse({
      world: initial,
      targetCharId: '',
      itemId: 'letter',
      items: item('letter', {
        kind: 'runScript',
        script: { chunk: 'shared/c00', id: 'shared/user/letter' },
      }),
      host,
      signal: controller.signal,
    })

    controller.abort()
    release()

    await expect(execution).rejects.toMatchObject({ name: 'AbortError' })
    expect(initial.inventory).toEqual([{ itemId: 'letter', count: 1 }])
  })

  test('配方结果携带首条满足的材料、产物与 item-box presentation', async () => {
    const initial: WorldState = {
      ...world('vessel'),
      inventory: [
        { itemId: 'vessel', count: 1 },
        { itemId: 'a', count: 1 },
        { itemId: 'b', count: 1 },
      ],
    }
    const items = item('vessel', {
      kind: 'craftRecipe',
      recipes: [
        {
          ingredients: [{ itemId: 'a', count: 1 }],
          products: [{ itemId: 'reward-a', count: 2 }],
        },
        {
          ingredients: [{ itemId: 'b', count: 1 }],
          products: [{ itemId: 'reward-b', count: 1 }],
        },
      ],
    })
    items.vessel!.use!.consuming = false
    const host: ItemUseHost = {
      currentWorld: () => initial,
      runScript: vi.fn(async () => undefined),
      runSceneHook: vi.fn(async () => false),
    }
    const outcome = await executeWorldItemUse({
      world: initial,
      targetCharId: '',
      itemId: 'vessel',
      items,
      host,
    })
    expect(outcome.effectResults[0]?.recipe).toEqual({
      recipeIndex: 0,
      ingredients: [{ itemId: 'a', count: 1 }],
      products: [{ itemId: 'reward-a', count: 2 }],
    })
    expect(outcome.presentations).toEqual([
      {
        kind: 'item-result',
        source: 'craftRecipe',
        items: [{ itemId: 'reward-a', count: 2 }],
      },
    ])
    expect(outcome.world.inventory).toContainEqual({ itemId: 'b', count: 1 })
    expect(outcome.world.inventory).toContainEqual({ itemId: 'reward-a', count: 2 })
  })

  test.each([
    { value: 0, rng: 0, status: 'failure', tier: undefined, left: 0 },
    { value: 1, rng: 0.9, status: 'success', tier: 1, left: 0 },
    { value: 9, rng: 0.999, status: 'success', tier: 9, left: 0 },
    { value: 18, rng: 0.999, status: 'success', tier: 9, left: 9 },
  ] as const)('资源池 value=$value 的执行结果可供 UI 呈现', async (row) => {
    const initial = { ...world('gourd'), collectValue: row.value }
    const rewards = Array.from({ length: 9 }, (_, index) => ({
      itemId: `reward-${index + 1}`,
      count: 1,
    }))
    const items = item('gourd', {
      kind: 'drawFromResourcePool',
      resource: 'collectValue',
      maxRoll: 9,
      rewards,
    })
    items.gourd!.use!.consuming = false
    const host: ItemUseHost = {
      currentWorld: () => initial,
      runScript: vi.fn(async () => undefined),
      runSceneHook: vi.fn(async () => false),
    }
    const outcome = await executeWorldItemUse({
      world: initial,
      targetCharId: '',
      itemId: 'gourd',
      items,
      rng: () => row.rng,
      host,
    })
    expect(outcome.status).toBe(row.status)
    expect(outcome.world.collectValue ?? 0).toBe(row.left)
    expect(outcome.effectResults[0]?.resourceDraw?.tier).toBe(row.tier)
    expect(outcome.presentations).toHaveLength(row.tier === undefined ? 0 : 1)
  })
})
