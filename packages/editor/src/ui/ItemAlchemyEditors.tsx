import type { ItemData, ItemRecipe } from '@type-pal/content'
import type { CraftRecipeEffect, ResourcePoolEffect } from '../core/item-alchemy.js'
import {
  DsActionGroup,
  DsDraftNumberField,
  DsDraftNumberInput,
  DsIconButton,
  DsReorderCollection,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  DsSelect,
  DsSelectField,
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

function ItemAlchemyFlowConnector(props: { label: string }) {
  return (
    <span className="item-alchemy-formula-arrow">
      <svg
        className="item-alchemy-formula-arrow__glyph"
        viewBox="0 0 32 16"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M3 8h26M23 2l6 6-6 6" />
      </svg>
      <span className="ds-visually-hidden">{props.label}</span>
    </span>
  )
}

function RecipeAmountField(props: {
  label: '材料' | '产物'
  entry: ItemAmount
  items: readonly ItemData[]
  recipeNumber: number
  scopeKey: string
  revision: number
  onChange: (entry: ItemAmount) => void
}) {
  return (
    <div className="item-alchemy-amount-list" data-amount-kind={props.label}>
      <DsSelectField
        label={props.label}
        layout="stacked"
        fieldClassName="item-alchemy-amount-item-field"
        aria-label={`配方 ${props.recipeNumber} ${props.label}物品`}
        value={props.entry.itemId}
        options={itemOptions(props.items, props.entry.itemId)}
        onValueChange={(itemId) => props.onChange({ ...props.entry, itemId })}
      />
      <DsDraftNumberField
        label={`${props.label}数量`}
        layout="stacked"
        fieldClassName="item-alchemy-amount-count-field"
        aria-label={`配方 ${props.recipeNumber} ${props.label}数量`}
        name={`recipe-${props.recipeNumber}-${props.label === '材料' ? 'ingredient' : 'product'}-count`}
        autoComplete="off"
        draftKey={`${props.scopeKey}:count`}
        syncToken={props.revision}
        min={1}
        step={1}
        integer
        enforceRange
        value={props.entry.count}
        onCommit={(value) => {
          if (value !== undefined) props.onChange({ ...props.entry, count: positiveInteger(value) })
        }}
      />
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
                  <RecipeAmountField
                    label="材料"
                    entry={recipe.ingredients[0]!}
                    items={ingredientItems}
                    recipeNumber={index + 1}
                    scopeKey={`${props.scopeKey}:recipe:${reorderKey}:ingredients`}
                    revision={props.revision}
                    onChange={(ingredient) =>
                      patchRecipe(index, { ...recipe, ingredients: [ingredient] })
                    }
                  />
                  <ItemAlchemyFlowConnector label="炼成" />
                  <RecipeAmountField
                    label="产物"
                    entry={recipe.products[0]!}
                    items={props.items}
                    recipeNumber={index + 1}
                    scopeKey={`${props.scopeKey}:recipe:${reorderKey}:products`}
                    revision={props.revision}
                    onChange={(product) => patchRecipe(index, { ...recipe, products: [product] })}
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
              <div className="item-alchemy-reward-row">
                <span className="item-alchemy-reward-cost">实际扣除 {index + 1} 灵葫值</span>
                <ItemAlchemyFlowConnector label="对应奖励" />
                <span className="item-alchemy-reward-item">
                  <DsSelect
                    size="default"
                    aria-label={`实际扣除 ${index + 1} 灵葫值的奖励物品`}
                    value={reward.itemId}
                    options={itemOptions(props.items, reward.itemId)}
                    onValueChange={(itemId) => {
                      const next = [...rewards]
                      next[index] = { ...reward, itemId }
                      props.onChange({ ...props.effect, rewards: next })
                    }}
                  />
                </span>
                <span className="item-alchemy-reward-count">
                  <DsDraftNumberInput
                    size="default"
                    aria-label={`实际扣除 ${index + 1} 灵葫值的奖励数量`}
                    name={`spirit-gourd-reward-${index + 1}-count`}
                    autoComplete="off"
                    draftKey={`${props.scopeKey}:reward:${reorderKey}:count`}
                    syncToken={props.revision}
                    min={1}
                    step={1}
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
              </div>
            </DsReorderItem>
          )
        })}
      </div>
    </DsReorderCollection>
  )
}
