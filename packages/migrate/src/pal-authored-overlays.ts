import type { ItemData } from '@type-pal/content'

/** 隐蛊原脚本是战斗全队隐形 3 回合，目标 schema 已有 hideParty 精确表达。 */
export function applyPalItemOverlays(input: readonly ItemData[]): ItemData[] {
  return input.map((item) => {
    const overlaid =
      item.id === '141'
        ? {
            ...structuredClone(item),
            use: {
              target: 'allAllies' as const,
              consuming: true,
              battleOnly: true,
              effects: [{ kind: 'hideParty' as const, turns: 3 }],
            },
          }
        : structuredClone(item)
    if (
      overlaid.use?.effects.some(
        (effect) => effect.kind === 'applyStatus' && effect.status === 'puppet',
      )
    )
      overlaid.use.battleOnly = true
    return overlaid
  })
}

type CraftRecipeEffect = Extract<
  NonNullable<ItemData['use']>['effects'][number],
  { kind: 'craftRecipe' }
>
type ResourcePoolEffect = Extract<
  NonNullable<ItemData['use']>['effects'][number],
  { kind: 'drawFromResourcePool' }
>

function sameItemAmounts(
  left: readonly { itemId: string; count: number }[],
  right: readonly { itemId: string; count: number }[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (amount, index) =>
        amount.itemId === right[index]?.itemId && amount.count === right[index]?.count,
    )
  )
}

function sameRecipes(
  left: CraftRecipeEffect['recipes'],
  right: CraftRecipeEffect['recipes'],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (recipe, index) =>
        sameItemAmounts(recipe.ingredients, right[index]?.ingredients ?? []) &&
        sameItemAmounts(recipe.products, right[index]?.products ?? []),
    )
  )
}

function uniqueItemsById(items: readonly ItemData[], label: string): Map<string, ItemData> {
  const byId = new Map<string, ItemData>()
  for (const item of items) {
    if (byId.has(item.id))
      throw new Error(`PAL generated craft message: ${label} 重复 item id ${item.id}`)
    byId.set(item.id, item)
  }
  return byId
}

/**
 * current publication 保留作者 items，只把同轮 raw producer 已完整翻译的 craft 失败原文同步回来。
 * 配方仍由作者树承载；结构对不上时停线，不能把 message 挂到错误配方，也不能覆盖其它作者字段。
 */
export function applyPalGeneratedCraftMessages(
  current: readonly ItemData[],
  generated: readonly ItemData[],
): ItemData[] {
  const output = current.map((item) => structuredClone(item))
  const currentById = uniqueItemsById(output, 'current')
  const generatedById = uniqueItemsById(generated, 'generated')

  for (const generatedItem of generatedById.values()) {
    const generatedCrafts =
      generatedItem.use?.effects.filter((effect) => effect.kind === 'craftRecipe') ?? []
    if (!generatedCrafts.some((effect) => effect.unavailableMessage !== undefined)) continue
    const currentItem = currentById.get(generatedItem.id)
    if (!currentItem)
      throw new Error(`PAL generated craft message: current 缺物品 ${generatedItem.id}`)
    const currentCrafts =
      currentItem.use?.effects.filter((effect) => effect.kind === 'craftRecipe') ?? []
    if (currentCrafts.length !== generatedCrafts.length)
      throw new Error(`PAL generated craft message: item${generatedItem.id} craft 数量漂移`)

    generatedCrafts.forEach((generatedCraft, index) => {
      const message = generatedCraft.unavailableMessage
      const currentCraft = currentCrafts[index]
      if (!currentCraft || !sameRecipes(currentCraft.recipes, generatedCraft.recipes))
        throw new Error(`PAL generated craft message: item${generatedItem.id} recipes drift`)
      if (message === undefined) return
      if (!message.length || message.trim() !== message)
        throw new Error(`PAL generated craft message: item${generatedItem.id} message 非法`)
      currentCraft.unavailableMessage = message
    })
  }
  return output
}

function sameResourcePool(left: ResourcePoolEffect, right: ResourcePoolEffect): boolean {
  return (
    left.resource === right.resource &&
    left.maxRoll === right.maxRoll &&
    sameItemAmounts(left.rewards, right.rewards)
  )
}

/** current publication 只同步同轮 raw producer 已完整翻译的资源池失败原文。 */
export function applyPalGeneratedResourcePoolMessages(
  current: readonly ItemData[],
  generated: readonly ItemData[],
): ItemData[] {
  const output = current.map((item) => structuredClone(item))
  const currentById = uniqueItemsById(output, 'current')
  const generatedById = uniqueItemsById(generated, 'generated')

  for (const generatedItem of generatedById.values()) {
    const generatedPools =
      generatedItem.use?.effects.filter((effect) => effect.kind === 'drawFromResourcePool') ?? []
    if (!generatedPools.some((effect) => effect.unavailableMessage !== undefined)) continue
    const currentItem = currentById.get(generatedItem.id)
    if (!currentItem)
      throw new Error(`PAL generated resource message: current 缺物品 ${generatedItem.id}`)
    const currentPools =
      currentItem.use?.effects.filter((effect) => effect.kind === 'drawFromResourcePool') ?? []
    if (currentPools.length !== generatedPools.length)
      throw new Error(`PAL generated resource message: item${generatedItem.id} pool 数量漂移`)

    generatedPools.forEach((generatedPool, index) => {
      const message = generatedPool.unavailableMessage
      const currentPool = currentPools[index]
      if (!currentPool || !sameResourcePool(currentPool, generatedPool))
        throw new Error(
          `PAL generated resource message: item${generatedItem.id} resource pool drift`,
        )
      if (message === undefined) return
      if (!message.length || message.trim() !== message)
        throw new Error(`PAL generated resource message: item${generatedItem.id} message 非法`)
      currentPool.unavailableMessage = message
    })
  }
  return output
}
