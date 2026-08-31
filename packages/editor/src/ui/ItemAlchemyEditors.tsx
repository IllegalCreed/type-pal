import type { ItemData, ItemRecipe } from '@type-pal/content'
import type { CraftRecipeEffect, ResourcePoolEffect } from '../core/item-alchemy.js'
import {
  DsActionGroup,
  DsDraftNumberInput,
  DsIconButton,
  DsReorderCollection,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  DsRepeatRow,
  DsSelect,
  DsSequenceIndex,
  reorderDsItems,
  sameDsSerializableValue,
  useDsReorderKeys,
} from './design-system/index.js'

type ItemAmount = { itemId: string; count: number }

function positiveInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1
}

function itemOptions(items: readonly ItemData[], currentId: string) {
  return [
    ...(!items.some((item) => item.id === currentId)
      ? [{ value: currentId, label: `⚠ 未找到 ${currentId}` }]
      : []),
    ...items.map((item) => ({ value: item.id, label: item.name, description: item.id })),
  ]
}

function RecipeAmountList(props: {
  label: '材料' | '产物'
  entries: readonly ItemAmount[]
  items: readonly ItemData[]
  scopeKey: string
  revision: number
  onChange: (entries: ItemAmount[]) => void
}) {
  const fallbackId = props.items[0]?.id
  return (
    <div className="item-alchemy-amount-list" data-amount-kind={props.label}>
      <div className="item-alchemy-amount-list__header">
        <strong>{props.label}</strong>
        <DsIconButton
          data-ds-add-picker-deferred="item/item-amount-append-default"
          variant="secondary"
          icon="add"
          label={`添加${props.label}`}
          disabled={!fallbackId}
          onClick={() => {
            const itemId = props.items[0]?.id
            if (itemId) props.onChange([...props.entries, { itemId, count: 1 }])
          }}
        />
      </div>
      <div className="item-alchemy-amount-list__rows">
        {props.entries.map((entry, index) => (
          <div className="item-alchemy-amount-row" key={`${props.scopeKey}:${index}`}>
            <DsSelect
              aria-label={`${props.label}物品 ${index + 1}`}
              value={entry.itemId}
              options={itemOptions(props.items, entry.itemId)}
              onValueChange={(itemId) => {
                const next = [...props.entries]
                next[index] = { ...entry, itemId }
                props.onChange(next)
              }}
            />
            <span className="item-alchemy-amount-row__count">
              <DsDraftNumberInput
                aria-label={`${props.label}数量 ${index + 1}`}
                draftKey={`${props.scopeKey}:count:${index}`}
                syncToken={props.revision}
                min={1}
                integer
                enforceRange
                value={entry.count}
                onCommit={(value) => {
                  if (value === undefined) return
                  const next = [...props.entries]
                  next[index] = { ...entry, count: positiveInteger(value) }
                  props.onChange(next)
                }}
              />
            </span>
            <DsIconButton
              variant="danger"
              icon="delete"
              label={`删除${props.label} ${index + 1}`}
              disabled={props.entries.length <= 1}
              onClick={() =>
                props.onChange(props.entries.filter((_, current) => current !== index))
              }
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CraftRecipeList(props: {
  effect: CraftRecipeEffect
  items: readonly ItemData[]
  ownerItemId: string
  consuming: boolean
  scopeKey: string
  revision: number
  onChange: (effect: CraftRecipeEffect) => void
}) {
  const recipes = props.effect.recipes
  const reorderKeys = useDsReorderKeys(recipes)
  const ingredientItems = props.consuming
    ? props.items.filter((item) => item.id !== props.ownerItemId)
    : props.items
  const patchRecipe = (index: number, recipe: ItemRecipe): void => {
    const next = [...recipes]
    next[index] = recipe
    props.onChange({ ...props.effect, recipes: next })
  }
  const reorder = (intent: DsReorderIntent): boolean => {
    const next = reorderDsItems(recipes, intent, 'insert', sameDsSerializableValue)
    if (next === recipes) return false
    reorderKeys.move(intent)
    props.onChange({ ...props.effect, recipes: [...next] })
    return true
  }

  return (
    <DsReorderCollection
      adoptionId="item/craft-recipes"
      scopeKey={`${props.scopeKey}:recipes`}
      entries={recipes.map((_recipe, index) => ({
        key: reorderKeys.keys[index]!,
        label: `配方 ${index + 1}`,
      }))}
      revision={props.revision}
      onReorder={reorder}
    >
      <div className="item-alchemy-recipe-list">
        {recipes.map((recipe, index) => {
          const reorderKey = reorderKeys.keys[index]!
          return (
            <DsReorderItem itemKey={reorderKey} key={reorderKey}>
              <article className="item-alchemy-recipe-row">
                <header className="item-alchemy-recipe-row__header">
                  <DsSequenceIndex value={index + 1} accessibleLabel={`优先级 ${index + 1}`} />
                  <span className="item-alchemy-recipe-row__identity">
                    <strong>配方 {index + 1}</strong>
                    <span>优先级 {index + 1} · 首个材料充足的配方生效</span>
                  </span>
                  <DsActionGroup density="compact" className="item-alchemy-row-actions">
                    <DsReorderMoveButton
                      itemKey={reorderKey}
                      direction="backward"
                      label={`上移配方 ${index + 1}`}
                    />
                    <DsReorderMoveButton
                      itemKey={reorderKey}
                      direction="forward"
                      label={`下移配方 ${index + 1}`}
                    />
                    <DsIconButton
                      variant="danger"
                      icon="delete"
                      label={`删除配方 ${index + 1}`}
                      disabled={recipes.length <= 1}
                      onClick={() =>
                        props.onChange({
                          ...props.effect,
                          recipes: recipes.filter((_, current) => current !== index),
                        })
                      }
                    />
                  </DsActionGroup>
                </header>
                <div className="item-alchemy-recipe-row__formula">
                  <RecipeAmountList
                    label="材料"
                    entries={recipe.ingredients}
                    items={ingredientItems}
                    scopeKey={`${props.scopeKey}:recipe:${reorderKey}:ingredients`}
                    revision={props.revision}
                    onChange={(ingredients) => patchRecipe(index, { ...recipe, ingredients })}
                  />
                  <span className="item-alchemy-formula-arrow" aria-hidden="true">
                    →
                  </span>
                  <RecipeAmountList
                    label="产物"
                    entries={recipe.products}
                    items={props.items}
                    scopeKey={`${props.scopeKey}:recipe:${reorderKey}:products`}
                    revision={props.revision}
                    onChange={(products) => patchRecipe(index, { ...recipe, products })}
                  />
                </div>
              </article>
            </DsReorderItem>
          )
        })}
      </div>
    </DsReorderCollection>
  )
}

export function appendCraftRecipe(
  effect: CraftRecipeEffect,
  items: readonly ItemData[],
  ownerItemId: string,
  consuming: boolean,
): CraftRecipeEffect | undefined {
  const ingredientId = items.find((item) => !consuming || item.id !== ownerItemId)?.id
  const productId = items[0]?.id
  if (!ingredientId || !productId) return undefined
  return {
    ...effect,
    recipes: [
      ...effect.recipes,
      {
        ingredients: [{ itemId: ingredientId, count: 1 }],
        products: [{ itemId: productId, count: 1 }],
      },
    ],
  }
}

export function ResourceRewardTierList(props: {
  effect: ResourcePoolEffect
  items: readonly ItemData[]
  scopeKey: string
  revision: number
  onChange: (effect: ResourcePoolEffect) => void
}) {
  const rewards = props.effect.rewards
  const reorderKeys = useDsReorderKeys(rewards)
  const reorder = (intent: DsReorderIntent): boolean => {
    const next = reorderDsItems(rewards, intent, 'insert', sameDsSerializableValue)
    if (next === rewards) return false
    reorderKeys.move(intent)
    props.onChange({ ...props.effect, rewards: [...next] })
    return true
  }

  return (
    <DsReorderCollection
      adoptionId="item/resource-reward-tiers"
      scopeKey={`${props.scopeKey}:rewards`}
      entries={rewards.map((reward, index) => ({
        key: reorderKeys.keys[index]!,
        label: `实际扣除 ${index + 1} 灵葫值 → ${reward.itemId}`,
      }))}
      revision={props.revision}
      onReorder={reorder}
    >
      <div className="item-alchemy-reward-list">
        {rewards.map((reward, index) => {
          const reorderKey = reorderKeys.keys[index]!
          return (
            <DsReorderItem itemKey={reorderKey} key={reorderKey}>
              <DsRepeatRow density="compact" className="item-alchemy-reward-row">
                <span className="item-alchemy-reward-cost">实际扣除 {index + 1} 灵葫值</span>
                <span className="item-alchemy-formula-arrow" aria-hidden="true">
                  →
                </span>
                <DsSelect
                  aria-label={`实际扣除 ${index + 1} 灵葫值的奖励物品`}
                  value={reward.itemId}
                  options={itemOptions(props.items, reward.itemId)}
                  onValueChange={(itemId) => {
                    const next = [...rewards]
                    next[index] = { ...reward, itemId }
                    props.onChange({ ...props.effect, rewards: next })
                  }}
                />
                <span className="item-alchemy-reward-count">
                  <DsDraftNumberInput
                    aria-label={`实际扣除 ${index + 1} 灵葫值的奖励数量`}
                    draftKey={`${props.scopeKey}:reward:${reorderKey}:count`}
                    syncToken={props.revision}
                    min={1}
                    integer
                    enforceRange
                    value={reward.count}
                    onCommit={(count) => {
                      if (count === undefined) return
                      const next = [...rewards]
                      next[index] = { ...reward, count: positiveInteger(count) }
                      props.onChange({ ...props.effect, rewards: next })
                    }}
                  />
                </span>
                <DsActionGroup density="compact" className="item-alchemy-row-actions">
                  <DsReorderMoveButton
                    itemKey={reorderKey}
                    direction="backward"
                    label={`上移实际扣除 ${index + 1} 灵葫值的奖励`}
                  />
                  <DsReorderMoveButton
                    itemKey={reorderKey}
                    direction="forward"
                    label={`下移实际扣除 ${index + 1} 灵葫值的奖励`}
                  />
                  <DsIconButton
                    variant="danger"
                    icon="delete"
                    label={`删除实际扣除 ${index + 1} 灵葫值的奖励`}
                    disabled={rewards.length <= 1}
                    onClick={() =>
                      props.onChange({
                        ...props.effect,
                        maxRoll: props.effect.maxRoll - 1,
                        rewards: rewards.filter((_, current) => current !== index),
                      })
                    }
                  />
                </DsActionGroup>
              </DsRepeatRow>
            </DsReorderItem>
          )
        })}
      </div>
    </DsReorderCollection>
  )
}
