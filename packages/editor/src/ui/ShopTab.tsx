/**
 * 商店页(数据模式·商店标签)—— 店铺货单编辑。
 * 左:店列表(id + 货数)+ 新建;中:货单(物品行 + 删除/上下移 + 加货下拉);右:提示。
 * 买价/卖价随物品(items 表 buyPrice/sellPrice),此处只编「这家店卖什么」;
 * 脚本「商店」指令(openShop)按店号引用。
 */
import type { AssetCatalogV1, ItemData, ShopDef } from '@type-pal/content'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AddShopCommand, UpdateShopCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  ItemPickerThumbnail,
  itemPickerDescription,
  itemPickerSearchText,
} from './add-picker-option-presentation.js'
import { DsAddPickerDialog } from './design-system/add-picker.js'
import { DsButton, DsEmptyState, DsListHeader, DsTag } from './design-system/controls.js'
import {
  DsCatalogRow,
  DsInspectorSection,
  DsInspectorTabs,
  DsObjectHero,
  DsPropertyGrid,
  DsPropertyRow,
  DsSequenceIndex,
} from './design-system/recipes.js'
import {
  DsReorderCollection,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  reorderDsItems,
  useDsReorderKeys,
} from './design-system/reorder.js'

type ShopInspectorTab = 'summary' | 'help'

export function ShopTab(props: {
  shops: ShopDef[]
  items: ItemData[]
  session: EditSession
  assetCatalog?: AssetCatalogV1
  assetReader?: EditorAssetReader
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  tabBar?: React.ReactNode
}) {
  const { shops, items, session, assetCatalog, assetReader, focusObjectId, onObjectFocus, tabBar } =
    props
  const [selId, setSelId] = useState<number>(shops[0]?.id ?? 0)
  const [inspectorTab, setInspectorTab] = useState<ShopInspectorTab>('summary')
  const stockSectionRef = useRef<HTMLElement>(null)
  const shop = shops.find((x) => x.id === selId) ?? shops[0]
  const stockReorderKeys = useDsReorderKeys(shop?.items ?? [])
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const stockItemOptions = useMemo(
    () =>
      items
        .filter((item) => !shop?.items.includes(item.id))
        .map((item) => ({
          id: item.id,
          label: item.name,
          description: itemPickerDescription(item),
          searchText: [...itemPickerSearchText(item), `买价 ${item.buyPrice} 文`],
          leading: <ItemPickerThumbnail item={item} catalog={assetCatalog} reader={assetReader} />,
          trailing: <DsTag tone="neutral">买价 {item.buyPrice} 文</DsTag>,
        })),
    [assetCatalog, assetReader, items, shop?.items],
  )
  const selectShop = (id: number): void => {
    setSelId(id)
    onObjectFocus?.(String(id))
  }

  useEffect(() => {
    const id = Number(focusObjectId)
    if (focusObjectId && Number.isInteger(id) && shops.some((candidate) => candidate.id === id)) {
      setSelId(id)
    }
  }, [focusObjectId, shops])

  const setItems = (next: string[]): void => {
    if (shop) session.dispatch(new UpdateShopCommand(shop.id, next))
  }
  const reorderStock = (intent: DsReorderIntent): boolean => {
    if (!shop) return false
    const next = reorderDsItems(shop.items, intent)
    if (next === shop.items) return false
    if (next.every((itemId, index) => itemId === shop.items[index])) return false
    stockReorderKeys.move(intent)
    setItems([...next])
    return true
  }

  return (
    <>
      <div className="outliner data-outliner shop-outliner">
        {tabBar}
        <DsListHeader
          title="商店"
          count={shops.length}
          unit="家"
          actions={[
            {
              id: 'create-shop',
              label: '新建店铺',
              icon: 'add',
              onClick: () => {
                const id =
                  shops.reduce((maximum, candidate) => Math.max(maximum, candidate.id), -1) + 1
                session.dispatch(new AddShopCommand(id))
                selectShop(id)
              },
            },
          ]}
        />
        <div className="sprite-list shop-catalog">
          {shops.map((x) => (
            <DsCatalogRow
              key={x.id}
              selected={x.id === shop?.id}
              title={`店 ${x.id}`}
              meta={`${x.items.length} 种货`}
              onClick={() => selectShop(x.id)}
            />
          ))}
        </div>
      </div>

      <div className="canvas-wrap data-body shop-workbench">
        {shop ? (
          <main className="shop-main ds-object-workspace">
            <DsObjectHero
              eyebrow="店铺"
              title="货单"
              objectId={`#${shop.id}`}
              summary="配置这家店出售的物品及展示顺序；售价直接引用物品数据。"
              meta={<DsTag tone="neutral">{shop.items.length} 种货</DsTag>}
            />

            <div className="shop-main-inner ds-object-workspace__content">
              <section
                ref={stockSectionRef}
                className="shop-stock-card"
                aria-labelledby="shop-stock-title"
                tabIndex={-1}
              >
                <header className="shop-card-head">
                  <div>
                    <p className="eyebrow">在售物品</p>
                    <h3 id="shop-stock-title">当前货单</h3>
                  </div>
                  <DsAddPickerDialog
                    adoptionId="shop/stock"
                    triggerLabel="上架物品"
                    title="上架物品"
                    description="搜索物品，确认后加入当前货单；售价继续引用物品定义。"
                    confirmLabel="上架物品"
                    options={stockItemOptions}
                    scopeKey={`shop:${shop.id}:stock`}
                    revision={session.getHistoryVersion()}
                    emptyMessage="当前没有可上架的物品。"
                    fallbackFocusRef={stockSectionRef}
                    onConfirm={(itemId) => {
                      const latestShop = session
                        .getState()
                        .shops?.find((candidate) => candidate.id === shop.id)
                      if (
                        !latestShop ||
                        latestShop.items.includes(itemId) ||
                        !itemsById.has(itemId)
                      )
                        return false
                      session.dispatch(
                        new UpdateShopCommand(latestShop.id, [...latestShop.items, itemId]),
                      )
                    }}
                  />
                </header>

                <DsReorderCollection
                  adoptionId="shop/stock"
                  scopeKey={`shop:${shop.id}:items`}
                  entries={shop.items.map((id, index) => ({
                    key: stockReorderKeys.keys[index]!,
                    label: itemsById.get(id)?.name ?? `未知物品 ${id}`,
                  }))}
                  revision={session.getHistoryVersion()}
                  onReorder={reorderStock}
                >
                  <div className="shop-stock-list">
                    {shop.items.map((id, i) => {
                      const it = itemsById.get(id)
                      const itemName = it?.name ?? `未知物品 ${id}`
                      const reorderKey = stockReorderKeys.keys[i]!
                      return (
                        <DsReorderItem itemKey={reorderKey} key={reorderKey}>
                          <div className="shop-stock-row">
                            <DsSequenceIndex value={i + 1} accessibleLabel={`第 ${i + 1} 项`} />
                            <span className="shop-stock-identity">
                              <strong>{itemName}</strong>
                              <span>
                                <code>{id}</code>
                                {it ? ` · 买价 ${it.buyPrice} 文` : ' · 不在物品表'}
                              </span>
                            </span>
                            <span className="shop-stock-actions">
                              <DsReorderMoveButton
                                itemKey={reorderKey}
                                direction="backward"
                                label={`上移 ${itemName}`}
                              />
                              <DsReorderMoveButton
                                itemKey={reorderKey}
                                direction="forward"
                                label={`下移 ${itemName}`}
                              />
                              <DsButton
                                className="shop-stock-remove"
                                aria-label={`下架 ${itemName}`}
                                title="下架"
                                onClick={() => setItems(shop.items.filter((_, j) => j !== i))}
                                size="compact"
                                variant="secondary"
                              >
                                ✕
                              </DsButton>
                            </span>
                          </div>
                        </DsReorderItem>
                      )
                    })}
                    {shop.items.length === 0 ? (
                      <DsEmptyState
                        layout="embedded"
                        title="暂无在售物品"
                        description={
                          items.length > 0 ? '可从右上角上架物品。' : '当前项目没有可上架的物品。'
                        }
                      />
                    ) : null}
                  </div>
                </DsReorderCollection>
              </section>
            </div>
          </main>
        ) : (
          <div className="shop-empty-state">
            <span aria-hidden="true">🏪</span>
            <h2>还没有商店</h2>
            <p>点击左侧“新建店铺”创建第一份货单。</p>
          </div>
        )}
      </div>

      <aside className="inspector inspector--tabbed shop-inspector">
        <div className="insp-head">
          <div className="what">商店</div>
          <div className="who">{shop ? `店 ${shop.id}` : '未选择'}</div>
        </div>
        <DsInspectorTabs
          id="shop-inspector"
          label="商店检查器"
          activeId={inspectorTab}
          onChange={(id) => setInspectorTab(id as ShopInspectorTab)}
          items={[
            {
              id: 'summary',
              label: '摘要',
              panel: (
                <div className="shop-inspector-body">
                  {shop ? (
                    <DsInspectorSection title="当前店铺" description={`店 ${shop.id}`}>
                      <DsPropertyGrid>
                        <DsPropertyRow label="在售物品">{shop.items.length} 种</DsPropertyRow>
                        <DsPropertyRow label="引用编号">#{shop.id}</DsPropertyRow>
                      </DsPropertyGrid>
                    </DsInspectorSection>
                  ) : (
                    <div className="insp-empty">还没有商店。</div>
                  )}
                </div>
              ),
            },
            {
              id: 'help',
              label: '说明',
              panel: (
                <div className="shop-inspector-body">
                  <DsInspectorSection title="定价规则" description="价格来自物品数据">
                    <p>
                      买价读取物品的 buyPrice；当铺按 sellPrice 收购所有可出售物品，不需要逐店配置。
                    </p>
                  </DsInspectorSection>

                  <DsInspectorSection title="剧情调用" description="通过“商店”指令开店">
                    <ol className="shop-help-steps">
                      <li>打开掌柜 NPC 的触发脚本。</li>
                      <li>插入“商店”指令并选择买入或卖出模式。</li>
                      <li>买入模式引用当前店铺编号 #{shop?.id ?? '—'}。</li>
                    </ol>
                    <p className="ds-inspector-supporting-copy">
                      货单改动即时生效，可使用 ⌘Z 撤销。
                    </p>
                  </DsInspectorSection>
                </div>
              ),
            },
          ]}
        />
      </aside>
    </>
  )
}
