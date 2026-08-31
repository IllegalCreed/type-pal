import type { AuthorItemData, ItemData, ShopDef } from '@type-pal/content'
import type { SourceStore } from './pal-derived-content.js'

export const PAL_STORE0_REWARD_ITEM_IDS = [
  '100',
  '105',
  '95',
  '112',
  '72',
  '131',
  '97',
  '102',
  '111',
] as const

export interface PalStoreBoundaryReport {
  buyCalls: number
  sellCalls: number
}

export interface PalStoreBoundaryArgs {
  sourceStores: readonly SourceStore[]
  shops: readonly ShopDef[]
  items: readonly (ItemData | AuthorItemData)[]
  commandRoots: readonly unknown[]
  expectedBuyCalls?: number
  expectedSellCalls?: number
  expectedSellShopId?: number
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function itemById(
  items: readonly (ItemData | AuthorItemData)[],
  id: string,
): ItemData | AuthorItemData {
  const item = items.find((candidate) => candidate.id === id)
  if (!item) throw new Error(`PAL Store0 invariant: 缺物品 ${id}`)
  return item
}

function assertVesselRecipes(items: readonly (ItemData | AuthorItemData)[]): void {
  const vessel = itemById(items, '268')
  const craftEffects = vessel.use?.effects.filter((effect) => effect.kind === 'craftRecipe') ?? []
  const poolEffects =
    vessel.use?.effects.filter((effect) => effect.kind === 'drawFromResourcePool') ?? []
  if (craftEffects.length !== 1 || craftEffects[0]!.recipes.length !== 5 || poolEffects.length)
    throw new Error(
      `PAL Store0 invariant: item268 craftRecipe=${craftEffects.length}/recipes=${craftEffects[0]?.recipes.length ?? 0}/resourcePool=${poolEffects.length}`,
    )
}

function assertSpiritGourd(
  sourceRewards: readonly string[],
  items: readonly (ItemData | AuthorItemData)[],
): void {
  if (!sameStrings(sourceRewards, PAL_STORE0_REWARD_ITEM_IDS))
    throw new Error(`PAL Store0 invariant: 源 Store0 九档漂移 ${sourceRewards.join(',')}`)
  const gourd = itemById(items, '270')
  const effects =
    gourd.use?.effects.filter((effect) => effect.kind === 'drawFromResourcePool') ?? []
  if (effects.length !== 1)
    throw new Error(`PAL Store0 invariant: item270 resource pool 数量 ${effects.length} != 1`)
  const effect = effects[0]!
  const rewardIds = effect.rewards.map(({ itemId }) => itemId)
  if (
    effect.resource !== 'collectValue' ||
    effect.maxRoll !== sourceRewards.length ||
    effect.rewards.length !== effect.maxRoll ||
    !sameStrings(rewardIds, sourceRewards) ||
    effect.rewards.some(({ count }) => count !== 1)
  )
    throw new Error('PAL Store0 invariant: item270 奖励档位漂移')
  for (const itemId of sourceRewards) itemById(items, itemId)
  if (itemById(items, '112').buyPrice !== 0 || itemById(items, '72').buyPrice !== 0)
    throw new Error('PAL Store0 invariant: 试炼果/舍利子原始 buyPrice 应保持 0')
}

function collectOpenShops(
  value: unknown,
  shops: ReadonlySet<number>,
  report: PalStoreBoundaryReport,
): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectOpenShops(entry, shops, report)
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  if (record.kind === 'openShop') {
    if (!Number.isInteger(record.shop))
      throw new Error(`PAL Store0 invariant: openShop.shop 非整数 ${String(record.shop)}`)
    const shop = record.shop as number
    if (record.mode === 'buy') {
      report.buyCalls += 1
      if (!shops.has(shop))
        throw new Error(`PAL Store0 invariant: buy openShop 引用未知商店 ${shop}`)
    } else if (record.mode === 'sell') {
      report.sellCalls += 1
    } else throw new Error(`PAL Store0 invariant: openShop.mode 非法 ${String(record.mode)}`)
  }
  for (const nested of Object.values(record)) collectOpenShops(nested, shops, report)
}

export function assertPalStoreBoundaryInvariant(
  args: PalStoreBoundaryArgs,
): PalStoreBoundaryReport {
  const store0 = args.sourceStores.filter(({ id }) => id === 0)
  if (store0.length !== 1)
    throw new Error(`PAL Store0 invariant: 源 Store0 数量 ${store0.length} != 1`)
  const sourceRewards = store0[0]!.items.map(String)
  if (sourceRewards.some((itemId) => itemId === '0'))
    throw new Error('PAL Store0 invariant: 源 Store0 奖励不得为 0')

  if (args.shops.some(({ id }) => id === 0))
    throw new Error('PAL Store0 invariant: 禁止发布 ShopDef0')
  const expectedIds = Array.from({ length: 20 }, (_, index) => index + 1)
  const sourceIds = args.sourceStores.filter(({ id }) => id !== 0).map(({ id }) => id)
  if (!sameStrings(sourceIds.map(String), expectedIds.map(String)))
    throw new Error(`PAL Store0 invariant: 源真实商店 id/顺序漂移 ${sourceIds.join(',')}`)
  const actualIds = args.shops.map(({ id }) => id)
  if (!sameStrings(actualIds.map(String), expectedIds.map(String)))
    throw new Error(
      `PAL Store0 invariant: 真实商店 id/顺序漂移 ${actualIds.join(',')} != ${expectedIds.join(',')}`,
    )
  assertSpiritGourd(sourceRewards, args.items)
  assertVesselRecipes(args.items)

  const shopIds = new Set(args.shops.map(({ id }) => id))
  const report: PalStoreBoundaryReport = { buyCalls: 0, sellCalls: 0 }
  for (const root of args.commandRoots) collectOpenShops(root, shopIds, report)
  if (args.expectedBuyCalls !== undefined && report.buyCalls !== args.expectedBuyCalls)
    throw new Error(
      `PAL Store0 invariant: buy openShop 数量 ${report.buyCalls} != ${args.expectedBuyCalls}`,
    )
  if (args.expectedSellCalls !== undefined && report.sellCalls !== args.expectedSellCalls)
    throw new Error(
      `PAL Store0 invariant: sell openShop 数量 ${report.sellCalls} != ${args.expectedSellCalls}`,
    )
  if (args.expectedSellShopId !== undefined) {
    const invalidSellShops: number[] = []
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(collect)
        return
      }
      if (!value || typeof value !== 'object') return
      const record = value as Record<string, unknown>
      if (
        record.kind === 'openShop' &&
        record.mode === 'sell' &&
        record.shop !== args.expectedSellShopId
      )
        invalidSellShops.push(record.shop as number)
      Object.values(record).forEach(collect)
    }
    args.commandRoots.forEach(collect)
    if (invalidSellShops.length)
      throw new Error(
        `PAL Store0 invariant: sell shop 应为 ${args.expectedSellShopId}，收到 ${invalidSellShops.join(',')}`,
      )
  }
  return report
}
