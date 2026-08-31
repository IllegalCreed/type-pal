import type { ItemData } from '@type-pal/content'
import { useEffect, useState } from 'react'
import type { EditSession } from '../core/edit-session.js'
import {
  type CraftRecipeEffect,
  findItemAlchemyEffect,
  type ItemAlchemySurface,
  itemAlchemyOwners,
  mutateItemAlchemyEffect,
  type ResourcePoolEffect,
  resizeResourcePoolEffect,
} from '../core/item-alchemy.js'
import type { ItemReference } from '../core/item-references.js'
import {
  DsButton,
  DsDraftNumberField,
  DsDraftTextField,
  DsEmptyState,
  DsField,
  DsFieldGroup,
  DsInspectorHost,
  DsInspectorSection,
  DsInspectorTabs,
  DsObjectHero,
  DsObjectWorkspace,
  DsPropertyGrid,
  DsPropertyRow,
  DsReadonlyValue,
  DsTag,
  DsWorkbenchSection,
} from './design-system/index.js'
import { appendCraftRecipe, CraftRecipeList, ResourceRewardTierList } from './ItemAlchemyEditors.js'

type InspectorTab = 'summary' | 'help'

const COPY = {
  crafting: {
    title: '炼蛊皿',
    eyebrow: '自动炼蛊机制',
    sectionEyebrow: '固定优先级',
    sectionTitle: '自动取材规则',
    effectKind: 'craftRecipe',
  },
  'spirit-gourd': {
    title: '紫金葫芦',
    eyebrow: '灵葫炼丹机制',
    sectionEyebrow: '实际扣除值',
    sectionTitle: '实际灵葫值消耗 → 奖励',
    effectKind: 'drawFromResourcePool',
  },
} as const

function effectCount(surface: ItemAlchemySurface, effect: CraftRecipeEffect | ResourcePoolEffect) {
  return surface === 'crafting'
    ? `${(effect as CraftRecipeEffect).recipes.length} 条配方`
    : `最高实际消耗 ${(effect as ResourcePoolEffect).maxRoll} 灵葫值`
}

function referencedItemIds(effect: CraftRecipeEffect | ResourcePoolEffect): string[] {
  if (effect.kind === 'craftRecipe')
    return effect.recipes.flatMap((recipe) => [
      ...recipe.ingredients.map((entry) => entry.itemId),
      ...recipe.products.map((entry) => entry.itemId),
    ])
  return effect.rewards.map((entry) => entry.itemId)
}

export interface ItemAlchemyTabProps {
  surface: ItemAlchemySurface
  items: readonly ItemData[]
  session: EditSession
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenItem?: (id: string) => void
  tabBar?: React.ReactNode
  itemReferenceIndex?: ReadonlyMap<string, readonly ItemReference[]>
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}

export function ItemAlchemyTab(props: ItemAlchemyTabProps) {
  const { items, session, surface, focusObjectId, onObjectFocus } = props
  const copy = COPY[surface]
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('summary')
  const [localError, setLocalError] = useState<string>()

  let derivationError: string | undefined
  let owners: ItemData[] = []
  try {
    owners = itemAlchemyOwners(items, surface)
  } catch (cause) {
    derivationError = cause instanceof Error ? cause.message : String(cause)
  }
  if (!derivationError && owners.length > 1)
    derivationError = `${copy.title}机制检测到 ${owners.length} 个 owner；只能存在一个 canonical owner`

  const canonicalOwner = owners.length === 1 ? owners[0] : undefined
  const selectedItem = focusObjectId
    ? items.find((item) => item.id === focusObjectId)
    : canonicalOwner
  let effect: CraftRecipeEffect | ResourcePoolEffect | undefined
  try {
    effect = selectedItem ? findItemAlchemyEffect(selectedItem, surface)?.effect : undefined
  } catch (cause) {
    derivationError = cause instanceof Error ? cause.message : String(cause)
  }
  if (
    !derivationError &&
    surface === 'spirit-gourd' &&
    effect?.kind === 'drawFromResourcePool' &&
    effect.resource !== 'collectValue'
  )
    derivationError = `紫金葫芦机制资源必须是 collectValue，当前为 ${effect.resource}`

  useEffect(() => {
    if (!focusObjectId && canonicalOwner) onObjectFocus?.(canonicalOwner.id)
  }, [canonicalOwner, focusObjectId, onObjectFocus])

  const references = selectedItem ? (props.itemReferenceIndex?.get(selectedItem.id) ?? []) : []
  const missingReferences = effect
    ? [...new Set(referencedItemIds(effect))].filter(
        (itemId) => !items.some((item) => item.id === itemId),
      )
    : []

  const reportError = (cause: unknown): void => {
    const message = cause instanceof Error ? cause.message : String(cause)
    setLocalError(message)
    props.onStatusNotice?.({ kind: 'error', message })
  }
  const commitCraft = (next: CraftRecipeEffect): void => {
    if (!selectedItem) return
    try {
      mutateItemAlchemyEffect(session, selectedItem.id, 'crafting', () => next)
    } catch (cause) {
      reportError(cause)
    }
  }
  const commitPool = (next: ResourcePoolEffect): void => {
    if (!selectedItem) return
    try {
      mutateItemAlchemyEffect(session, selectedItem.id, 'spirit-gourd', () => next)
    } catch (cause) {
      reportError(cause)
    }
  }

  return (
    <>
      <div className="canvas-wrap data-body item-alchemy-workbench item-alchemy-workbench--mechanism">
        <DsObjectWorkspace
          as="main"
          label={`${copy.title}机制工作区`}
          className="item-alchemy-main"
          contentClassName="item-alchemy-main__content"
          hero={
            selectedItem && effect && !derivationError ? (
              <DsObjectHero
                eyebrow={copy.eyebrow}
                title={copy.title}
                objectId={`${selectedItem.name} · ${selectedItem.id}`}
                summary={
                  surface === 'crafting'
                    ? '游戏中只需使用炼蛊皿，不选择原材料；系统按固定顺序自动消耗第一种足量材料。'
                    : '随机值封顶后的 N 就是本次实际扣除的 N 点灵葫值，并决定第 N 行奖励。'
                }
                meta={<DsTag tone="neutral">{effectCount(surface, effect)}</DsTag>}
                actions={
                  props.onOpenItem ? (
                    <DsButton
                      variant="secondary"
                      icon="open"
                      onClick={() => props.onOpenItem?.(selectedItem.id)}
                    >
                      打开承载物品
                    </DsButton>
                  ) : undefined
                }
              />
            ) : undefined
          }
        >
          <div className="item-alchemy-sections">
            {props.tabBar}
            {derivationError ? (
              <DsEmptyState
                title={`${copy.title}机制数据不一致`}
                description={`${derivationError}。编辑器不会把多个物品伪装成机制列表。`}
              />
            ) : !canonicalOwner ? (
              <DsEmptyState
                title={`项目缺少${copy.title}机制`}
                description={`当前项目没有 ${copy.effectKind} canonical owner；请先修复迁移或内容数据。`}
              />
            ) : !selectedItem ? (
              <DsEmptyState
                title="机制承载物品已被删除"
                description={`深链目标 ${focusObjectId ?? canonicalOwner.id} 已不在当前物品表。`}
              />
            ) : !effect || selectedItem.id !== canonicalOwner.id ? (
              <DsEmptyState
                title={`目标不是${copy.title}机制 owner`}
                description={`${selectedItem.name} 不承载 ${copy.effectKind}；机制页不会生成第二个 owner。`}
              />
            ) : surface === 'crafting' && effect.kind === 'craftRecipe' ? (
              <>
                <DsWorkbenchSection
                  className="item-alchemy-form-card"
                  eyebrow="提示文案"
                  title="炼蛊失败反馈"
                  description="材料不足时显示；留空则使用运行时默认提示。"
                >
                  <DsFieldGroup layout="stacked">
                    <DsDraftTextField
                      label="材料不足提示"
                      draftKey={`item-alchemy:${selectedItem.id}:crafting:unavailable`}
                      syncToken={session.getHistoryVersion()}
                      value={effect.unavailableMessage ?? ''}
                      onCommit={(value) =>
                        commitCraft({ ...effect, unavailableMessage: value.trim() || undefined })
                      }
                    />
                  </DsFieldGroup>
                </DsWorkbenchSection>
                <DsWorkbenchSection
                  className="item-alchemy-list-card"
                  eyebrow={copy.sectionEyebrow}
                  title={copy.sectionTitle}
                  description="游戏操作没有选料步骤；下方选择器只供作者配置。系统自上而下判断，同时满足时自动采用第一条。"
                  contentLayout="list"
                  actions={
                    <DsButton
                      data-ds-add-picker-deferred="item/craft-recipe-append-default"
                      variant="secondary"
                      icon="add"
                      disabled={
                        !appendCraftRecipe(
                          effect,
                          items,
                          selectedItem.id,
                          selectedItem.use?.consuming ?? false,
                        )
                      }
                      onClick={() => {
                        const ingredientId = items.find(
                          (item) => !selectedItem.use?.consuming || item.id !== selectedItem.id,
                        )?.id
                        const productId = items[0]?.id
                        if (!ingredientId || !productId) return
                        commitCraft({
                          ...effect,
                          recipes: [
                            ...effect.recipes,
                            {
                              ingredients: [{ itemId: ingredientId, count: 1 }],
                              products: [{ itemId: productId, count: 1 }],
                            },
                          ],
                        })
                      }}
                    >
                      添加配方
                    </DsButton>
                  }
                >
                  <CraftRecipeList
                    effect={effect}
                    items={items}
                    ownerItemId={selectedItem.id}
                    consuming={selectedItem.use?.consuming ?? false}
                    scopeKey={`item-alchemy:${selectedItem.id}:crafting`}
                    revision={session.getHistoryVersion()}
                    onChange={commitCraft}
                  />
                </DsWorkbenchSection>
              </>
            ) : surface === 'spirit-gourd' && effect.kind === 'drawFromResourcePool' ? (
              <>
                <DsWorkbenchSection
                  className="item-alchemy-form-card"
                  eyebrow="抽取公式"
                  title="资源与实际消耗上限"
                  description="奖励行数与最高消耗严格相等；第 N 行会实际扣除 N 点灵葫值。"
                >
                  <DsFieldGroup>
                    <DsField
                      label="资源变量"
                      help="紫金葫芦固定消费全局 collectValue；该事实不在此页改写。"
                    >
                      <DsReadonlyValue monospace>{effect.resource}</DsReadonlyValue>
                    </DsField>
                    <DsDraftNumberField
                      label="单次最高消耗"
                      aria-label="单次最高灵葫值消耗"
                      draftKey={`item-alchemy:${selectedItem.id}:spirit-gourd:max-roll`}
                      syncToken={session.getHistoryVersion()}
                      value={effect.maxRoll}
                      min={1}
                      max={999}
                      integer
                      enforceRange
                      onCommit={(maxRoll) => {
                        if (maxRoll !== undefined)
                          commitPool(
                            resizeResourcePoolEffect(
                              effect,
                              maxRoll,
                              items[0]?.id ?? selectedItem.id,
                            ),
                          )
                      }}
                    />
                    <DsDraftTextField
                      label="不可用提示"
                      draftKey={`item-alchemy:${selectedItem.id}:spirit-gourd:unavailable`}
                      syncToken={session.getHistoryVersion()}
                      value={effect.unavailableMessage ?? ''}
                      onCommit={(value) =>
                        commitPool({ ...effect, unavailableMessage: value.trim() || undefined })
                      }
                    />
                  </DsFieldGroup>
                </DsWorkbenchSection>
                <DsWorkbenchSection
                  className="item-alchemy-list-card"
                  eyebrow={copy.sectionEyebrow}
                  title={copy.sectionTitle}
                  description="移动奖励会改变它对应的实际扣除值与抽取结果。"
                  contentLayout="list"
                  actions={
                    <DsButton
                      data-ds-add-picker-deferred="item/resource-reward-tier-append-default"
                      variant="secondary"
                      icon="add"
                      disabled={!items.length || effect.maxRoll >= 999}
                      onClick={() => {
                        const fallbackItemId = items[0]?.id
                        if (!fallbackItemId) return
                        commitPool({
                          ...effect,
                          maxRoll: effect.maxRoll + 1,
                          rewards: [
                            ...effect.rewards,
                            {
                              ...(effect.rewards.at(-1) ?? {
                                itemId: fallbackItemId,
                                count: 1,
                              }),
                            },
                          ],
                        })
                      }}
                    >
                      增加消耗值
                    </DsButton>
                  }
                >
                  <ResourceRewardTierList
                    effect={effect}
                    items={items}
                    scopeKey={`item-alchemy:${selectedItem.id}:spirit-gourd`}
                    revision={session.getHistoryVersion()}
                    onChange={commitPool}
                  />
                </DsWorkbenchSection>
              </>
            ) : (
              <DsEmptyState
                title="页面与 effect 类型不匹配"
                description="当前 canonical effect 不能由此机制页面编辑。"
              />
            )}
            {localError ? (
              <p className="item-alchemy-inline-error" role="alert">
                {localError}
              </p>
            ) : null}
          </div>
        </DsObjectWorkspace>
      </div>

      <DsInspectorHost as="aside" className="inspector inspector--tabbed item-alchemy-inspector">
        <div className="insp-head">
          <div className="what">{copy.title}</div>
          <div className="who">{selectedItem?.name ?? '机制未就绪'}</div>
        </div>
        <DsInspectorTabs
          id={`item-alchemy-${surface}-inspector`}
          label={`${copy.title}检查器`}
          activeId={inspectorTab}
          onChange={(id) => setInspectorTab(id as InspectorTab)}
          items={[
            {
              id: 'summary',
              label: '摘要',
              panel: (
                <div className="item-alchemy-inspector__body">
                  <DsInspectorSection
                    title="机制数据"
                    description="canonical 数据仍由一个承载物品的 use.effects 保存"
                  >
                    <DsPropertyGrid>
                      <DsPropertyRow label="承载物品">
                        {canonicalOwner
                          ? `${canonicalOwner.name} · ${canonicalOwner.id}`
                          : '未找到'}
                      </DsPropertyRow>
                      <DsPropertyRow label="结构">
                        {effect ? effectCount(surface, effect) : '未配置'}
                      </DsPropertyRow>
                      <DsPropertyRow label="物品引用">{references.length} 处</DsPropertyRow>
                      <DsPropertyRow label="缺失引用">
                        {missingReferences.length ? missingReferences.join('、') : '0'}
                      </DsPropertyRow>
                    </DsPropertyGrid>
                  </DsInspectorSection>
                </div>
              ),
            },
            {
              id: 'help',
              label: '公式',
              panel: (
                <div className="item-alchemy-inspector__body">
                  <DsInspectorSection
                    title={surface === 'crafting' ? '玩家操作与自动取材' : '灵葫值公式'}
                    description={
                      surface === 'crafting'
                        ? '包袱中直接使用炼蛊皿；没有第二步原材料选择'
                        : 'tier = min(random(1, 当前资源), 最大档位)'
                    }
                  >
                    {surface === 'crafting' ? (
                      <p>
                        运行时固定按毒蛇卵、毒蝎卵、毒蟾卵、蜘蛛卵、蜈蚣卵的顺序检查，自动消耗第一种足量材料并炼成蛊。
                      </p>
                    ) : (
                      <p>
                        抽中 N 时会实际扣除 N 点灵葫值，并发放第 N 行奖励；N
                        不是虚拟排序号或价格字段。
                      </p>
                    )}
                  </DsInspectorSection>
                </div>
              ),
            },
          ]}
        />
      </DsInspectorHost>
    </>
  )
}

export function CraftingAlchemyTab(props: Omit<ItemAlchemyTabProps, 'surface'>) {
  return <ItemAlchemyTab {...props} surface="crafting" />
}

export function SpiritGourdAlchemyTab(props: Omit<ItemAlchemyTabProps, 'surface'>) {
  return <ItemAlchemyTab {...props} surface="spirit-gourd" />
}
