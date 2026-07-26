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
      placeEntityInFront: vi.fn(async () => false),
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
      placeEntityInFront: vi.fn(async () => false),
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

  test('外部脚本已移除消费品时按已消费成功收口，不伪报 consumed false', async () => {
    let active = world('bundle')
    const host: ItemUseHost = {
      currentWorld: () => active,
      runScript: vi.fn(async () => {
        active = { ...active, money: 12, inventory: [] }
      }),
      runSceneHook: vi.fn(async () => false),
      placeEntityInFront: vi.fn(async () => false),
    }
    const outcome = await executeWorldItemUse({
      world: active,
      targetCharId: '',
      itemId: 'bundle',
      items: item('bundle', {
        kind: 'runScript',
        script: { chunk: 'shared/c00', id: 'shared/user/consume-bundle' },
      }),
      host,
    })
    expect(outcome).toMatchObject({
      status: 'success',
      consumed: true,
      changed: true,
      world: { money: 12, inventory: [] },
    })
  })

  test('物品私有脚本可与纯效果按原顺序执行，最后只消耗一次', async () => {
    let active = world('book')
    const ref: ScriptRef = { chunk: '__script-v5-runtime', id: 'item:book:use' }
    const runScript = vi.fn(async () => {
      expect(active.hostileAwareness).toEqual({
        rangeMultiplier: 0,
        remainingMs: 60_000,
      })
      active = { ...active, money: 77 }
    })
    const items: ItemDataMap = {
      book: {
        id: 'book',
        name: '天书',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: true,
          effects: [
            {
              kind: 'modifyHostileAwareness',
              rangeMultiplier: 0,
              durationMs: 60_000,
            },
            { kind: 'runScript', script: ref },
          ],
        },
      },
    }
    const outcome = await executeWorldItemUse({
      world: active,
      targetCharId: '',
      itemId: 'book',
      items,
      host: {
        currentWorld: () => active,
        replaceWorld: (next) => {
          active = next
        },
        runScript,
        runSceneHook: vi.fn(async () => false),
        placeEntityInFront: vi.fn(async () => false),
      },
    })
    expect(runScript).toHaveBeenCalledWith(ref, undefined)
    expect(outcome).toMatchObject({
      status: 'success',
      consumed: true,
      world: {
        money: 77,
        inventory: [],
        hostileAwareness: { rangeMultiplier: 0, remainingMs: 60_000 },
      },
      effectResults: [
        { index: 0, kind: 'modifyHostileAwareness', changed: true },
        { index: 1, kind: 'runScript', changed: true },
      ],
    })
  })

  test.each([
    {
      name: '未持有物品',
      world: { ...world('book'), inventory: [] } satisfies WorldState,
      targetCharId: '',
      reason: 'not-owned',
    },
    {
      name: '缺少角色目标',
      world: world('book'),
      targetCharId: 'missing',
      reason: 'missing-target',
    },
  ] as const)('$name时私有脚本不会先产生副作用', async (row) => {
    let active = row.world
    const runScript = vi.fn(async () => {
      active = { ...active, money: 999 }
    })
    const outcome = await executeWorldItemUse({
      world: active,
      targetCharId: row.targetCharId,
      itemId: 'book',
      items: {
        book: {
          id: 'book',
          name: '测试书',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'oneAlly',
            consuming: true,
            effects: [
              {
                kind: 'runScript',
                script: { chunk: '__script-v5-runtime', id: 'item:book:use' },
              },
              { kind: 'healHp', amount: 10 },
            ],
          },
        },
      },
      host: {
        currentWorld: () => active,
        replaceWorld: (next) => {
          active = next
        },
        runScript,
        runSceneHook: vi.fn(async () => false),
        placeEntityInFront: vi.fn(async () => false),
      },
    })
    expect(outcome).toMatchObject({
      status: 'failure',
      reason: row.reason,
      consumed: false,
      changed: false,
      world: row.world,
    })
    expect(runScript).not.toHaveBeenCalled()
    expect(active.money).toBe(0)
  })

  test('空效果链不可使用且不会消耗物品', async () => {
    const initial = world('draft')
    const outcome = await executeWorldItemUse({
      world: initial,
      targetCharId: '',
      itemId: 'draft',
      items: {
        draft: {
          id: 'draft',
          name: '未完成用途',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: { target: 'scene', consuming: true, effects: [] },
        },
      },
      host: {
        currentWorld: () => initial,
        runScript: vi.fn(async () => undefined),
        runSceneHook: vi.fn(async () => false),
        placeEntityInFront: vi.fn(async () => false),
      },
    })
    expect(outcome).toMatchObject({
      status: 'failure',
      reason: 'wrong-context',
      consumed: false,
      world: initial,
    })
  })

  test('场景没有 onTeleport 时失败、保留物品并强制保留菜单', async () => {
    const initial = world('bee')
    const host: ItemUseHost = {
      currentWorld: () => initial,
      runScript: vi.fn(async () => undefined),
      runSceneHook: vi.fn(async () => false),
      placeEntityInFront: vi.fn(async () => false),
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
      placeEntityInFront: vi.fn(async () => false),
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
      placeEntityInFront: vi.fn(async () => false),
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
      placeEntityInFront: vi.fn(async () => false),
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
      placeEntityInFront: vi.fn(async () => false),
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
      placeEntityInFront: vi.fn(async () => false),
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

  test('场景放置失败不消耗，成功才从宿主最新世界提交', async () => {
    const initial = world('trap')
    const placeEntityInFront = vi.fn(async () => false)
    const host: ItemUseHost = {
      currentWorld: () => initial,
      runScript: vi.fn(async () => undefined),
      runSceneHook: vi.fn(async () => false),
      placeEntityInFront,
    }
    const items = item('trap', {
      kind: 'placeEntityInFront',
      target: { scene: 's048', entity: 'e797' },
      state: 2,
      unavailableMessage: '此处无法放置',
    })
    const failed = await executeWorldItemUse({
      world: initial,
      targetCharId: '',
      itemId: 'trap',
      items,
      host,
    })
    expect(failed).toMatchObject({
      status: 'failure',
      reason: 'external-unavailable',
      message: '此处无法放置',
      consumed: false,
    })
    expect(initial.inventory).toEqual([{ itemId: 'trap', count: 1 }])

    placeEntityInFront.mockResolvedValueOnce(true)
    const success = await executeWorldItemUse({
      world: initial,
      targetCharId: '',
      itemId: 'trap',
      items,
      host,
    })
    expect(success).toMatchObject({ status: 'success', consumed: true })
    expect(placeEntityInFront).toHaveBeenLastCalledWith(
      { scene: 's048', entity: 'e797' },
      2,
      undefined,
    )
  })
})
