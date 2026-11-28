import type { ItemData, ItemUseEffect } from '@type-pal/content'
import type { EditSession } from './edit-session.js'
import { UpdateItemCommand } from './item-commands.js'

export type ItemAlchemySurface = 'crafting' | 'spirit-gourd'
export type CraftRecipeEffect = Extract<ItemUseEffect, { kind: 'craftRecipe' }>
export type ResourcePoolEffect = Extract<ItemUseEffect, { kind: 'drawFromResourcePool' }>
export type ItemAlchemyEffect = CraftRecipeEffect | ResourcePoolEffect

export interface LocatedItemAlchemyEffect<T extends ItemAlchemyEffect = ItemAlchemyEffect> {
  index: number
  effect: T
}

function effectKind(surface: ItemAlchemySurface): ItemAlchemyEffect['kind'] {
  return surface === 'crafting' ? 'craftRecipe' : 'drawFromResourcePool'
}

const MAX_EDITABLE_RESOURCE_TIERS = 999

export function findItemAlchemyEffect(
  item: ItemData,
  surface: 'crafting',
): LocatedItemAlchemyEffect<CraftRecipeEffect> | undefined
export function findItemAlchemyEffect(
  item: ItemData,
  surface: 'spirit-gourd',
): LocatedItemAlchemyEffect<ResourcePoolEffect> | undefined
export function findItemAlchemyEffect(
  item: ItemData,
  surface: ItemAlchemySurface,
): LocatedItemAlchemyEffect | undefined
export function findItemAlchemyEffect(
  item: ItemData,
  surface: ItemAlchemySurface,
): LocatedItemAlchemyEffect | undefined {
  const kind = effectKind(surface)
  const matches = (item.use?.effects ?? [])
    .map((effect, index) => ({ effect, index }))
    .filter((entry): entry is LocatedItemAlchemyEffect => entry.effect.kind === kind)
  if (matches.length > 1)
    throw new Error(`物品 ${item.id} 重复 ${matches.length} 个 ${kind} effect`)
  return matches[0]
}

export function itemAlchemyOwners(
  items: readonly ItemData[],
  surface: ItemAlchemySurface,
): ItemData[] {
  return items.filter((item) => findItemAlchemyEffect(item, surface) !== undefined)
}

/** PAL 炼蛊皿专页只表达自动优先级的一进一出规则；通用 craftRecipe schema 仍允许复合配方。 */
export function assertSingleInputOutputCraftRecipes(
  effect: CraftRecipeEffect,
  ownerItemId: string,
): void {
  effect.recipes.forEach((recipe, index) => {
    if (recipe.ingredients.length === 1 && recipe.products.length === 1) return
    throw new Error(
      `炼蛊 owner ${ownerItemId} 的规则 ${index + 1} 必须恰有 1 项材料和 1 项产物；` +
        `当前为 ${recipe.ingredients.length} 项材料、${recipe.products.length} 项产物`,
    )
  })
}

export function resizeResourcePoolEffect(
  effect: ResourcePoolEffect,
  maxRoll: number,
  fallbackItemId: string,
): ResourcePoolEffect {
  if (!Number.isSafeInteger(maxRoll) || maxRoll < 1 || maxRoll > MAX_EDITABLE_RESOURCE_TIERS)
    throw new Error(`奖励档位必须是 1..${MAX_EDITABLE_RESOURCE_TIERS} 的整数`)
  const rewards = effect.rewards.slice(0, maxRoll).map((entry) => ({ ...entry }))
  const fallback = rewards.at(-1) ?? { itemId: fallbackItemId, count: 1 }
  while (rewards.length < maxRoll) rewards.push({ ...fallback })
  return { ...effect, maxRoll, rewards }
}

function itemFromSession(session: EditSession, itemId: string): ItemData {
  const item = session.getState().items.find((candidate) => candidate.id === itemId)
  if (!item) throw new Error(`炼化 owner 物品不存在：${itemId}`)
  return item
}

function patchedUse(
  item: ItemData,
  effectIndex: number,
  nextEffect: ItemAlchemyEffect,
): ItemData['use'] | undefined {
  if (!item.use) throw new Error(`炼化 owner ${item.id} 缺 use capability`)
  const effects = [...item.use.effects]
  effects[effectIndex] = structuredClone(nextEffect)
  return { ...item.use, effects }
}

type AlchemyEdit =
  | [surface: 'crafting', mutate: (effect: CraftRecipeEffect) => CraftRecipeEffect]
  | [surface: 'spirit-gourd', mutate: (effect: ResourcePoolEffect) => ResourcePoolEffect]

function applyAlchemyEdit<Effect extends ItemAlchemyEffect>(
  session: EditSession,
  item: ItemData,
  surface: ItemAlchemySurface,
  located: LocatedItemAlchemyEffect<Effect> | undefined,
  mutate: (effect: Effect) => Effect,
): boolean {
  if (!located) throw new Error(`物品 ${item.id} 缺 ${effectKind(surface)} effect`)
  const next = mutate(structuredClone(located.effect))
  if (next.kind !== effectKind(surface))
    throw new Error(`炼化 surface ${surface} 不能改写为 ${next.kind}`)
  if (JSON.stringify(next) === JSON.stringify(located.effect)) return false
  return session.dispatch(
    new UpdateItemCommand(item.id, { use: patchedUse(item, located.index, next) }),
  )
}

export function mutateItemAlchemyEffect(
  session: EditSession,
  itemId: string,
  surface: 'crafting',
  mutate: (effect: CraftRecipeEffect) => CraftRecipeEffect,
): boolean
export function mutateItemAlchemyEffect(
  session: EditSession,
  itemId: string,
  surface: 'spirit-gourd',
  mutate: (effect: ResourcePoolEffect) => ResourcePoolEffect,
): boolean
export function mutateItemAlchemyEffect(
  session: EditSession,
  itemId: string,
  ...[surface, mutate]: AlchemyEdit
): boolean {
  const item = itemFromSession(session, itemId)
  if (surface === 'crafting')
    return applyAlchemyEdit(session, item, surface, findItemAlchemyEffect(item, surface), mutate)
  return applyAlchemyEdit(session, item, surface, findItemAlchemyEffect(item, surface), mutate)
}
