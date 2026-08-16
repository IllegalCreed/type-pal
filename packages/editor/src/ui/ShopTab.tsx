/**
 * 商店页(数据模式·商店标签)—— 店铺货单编辑。
 * 左:店列表(id + 货数)+ 新建;中:货单(物品行 + 删除/上下移 + 加货下拉);右:提示。
 * 买价/卖价随物品(items 表 buyPrice/sellPrice),此处只编「这家店卖什么」;
 * 脚本「商店」指令(openShop)按店号引用。
 */
import type { ItemData, ShopDef } from '@type-pal/content'
import { useEffect, useMemo, useState } from 'react'
import { AddShopCommand, UpdateShopCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { DsListHeader, DsTag } from './design-system/controls.js'
import { DsCatalogRow, DsObjectHero, DsSequenceIndex } from './design-system/recipes.js'

export function ShopTab(props: {
  shops: ShopDef[]
  items: ItemData[]
  session: EditSession
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  tabBar?: React.ReactNode
}) {
  const { shops, items, session, focusObjectId, onObjectFocus, tabBar } = props
  const [selId, setSelId] = useState<number>(shops[0]?.id ?? 0)
  const [pick, setPick] = useState('')
  const shop = shops.find((x) => x.id === selId) ?? shops[0]
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const selectShop = (id: number): void => {
    setSelId(id)
    onObjectFocus?.(String(id))
  }

  useEffect(() => {
    const id = Number(focusObjectId)
    if (focusObjectId && Number.isInteger(id) && shops.some((candidate) => candidate.id === id))
      setSelId(id)
  }, [focusObjectId, shops])

  const setItems = (next: string[]): void => {
    if (shop) session.dispatch(new UpdateShopCommand(shop.id, next))
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
              icon: '＋',
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
              <section className="shop-stock-card" aria-labelledby="shop-stock-title">
                <header className="shop-card-head">
                  <div>
                    <p className="eyebrow">在售物品</p>
                    <h3 id="shop-stock-title">当前货单</h3>
                  </div>
                  <span className="shop-card-note">使用右侧按钮调整顺序</span>
                </header>

                <div className="shop-stock-list">
                  {shop.items.map((id, i) => {
                    const it = itemsById.get(id)
                    const itemName = it?.name ?? `未知物品 ${id}`
                    return (
                      <div className="shop-stock-row" key={`${shop.id}-${i}-${id}`}>
                        <DsSequenceIndex value={i + 1} accessibleLabel={`第 ${i + 1} 项`} />
                        <span className="shop-stock-identity">
                          <strong>{itemName}</strong>
                          <span>
                            <code>{id}</code>
                            {it ? ` · 买价 ${it.buyPrice} 文` : ' · 不在物品表'}
                          </span>
                        </span>
                        <span className="shop-stock-actions">
                          <button
                            type="button"
                            className="mini"
                            aria-label={`上移 ${itemName}`}
                            title="上移"
                            disabled={i === 0}
                            onClick={() => {
                              const a = [...shop.items]
                              const t = a[i - 1]!
                              a[i - 1] = a[i]!
                              a[i] = t
                              setItems(a)
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="mini"
                            aria-label={`下移 ${itemName}`}
                            title="下移"
                            disabled={i === shop.items.length - 1}
                            onClick={() => {
                              const a = [...shop.items]
                              const t = a[i + 1]!
                              a[i + 1] = a[i]!
                              a[i] = t
                              setItems(a)
                            }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="mini shop-stock-remove"
                            aria-label={`下架 ${itemName}`}
                            title="下架"
                            onClick={() => setItems(shop.items.filter((_, j) => j !== i))}
                          >
                            ✕
                          </button>
                        </span>
                      </div>
                    )
                  })}
                  {shop.items.length === 0 ? (
                    <div className="shop-stock-empty">这家店还没有在售物品。</div>
                  ) : null}
                </div>

                <div className="shop-add-stock">
                  <label>
                    <span>上架物品</span>
                    <select
                      className="in"
                      name="shop-stock-item"
                      autoComplete="off"
                      value={pick}
                      onChange={(e) => setPick(e.target.value)}
                    >
                      <option value="">选择物品…</option>
                      {items
                        .filter((it) => !shop.items.includes(it.id))
                        .map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name}（{it.buyPrice} 文）
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="tool shop-add-stock-button"
                    disabled={!pick}
                    onClick={() => {
                      if (!pick) return
                      setItems([...shop.items, pick])
                      setPick('')
                    }}
                  >
                    ＋ 上架
                  </button>
                </div>
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

      <aside className="inspector shop-inspector">
        <div className="pane-h">
          <span className="t">商店摘要</span>
        </div>
        <div className="shop-inspector-body">
          {shop ? (
            <section className="shop-inspector-card">
              <p className="eyebrow">当前店铺</p>
              <h3>店 {shop.id}</h3>
              <dl className="shop-summary-list">
                <div>
                  <dt>在售物品</dt>
                  <dd>{shop.items.length} 种</dd>
                </div>
                <div>
                  <dt>引用编号</dt>
                  <dd>#{shop.id}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <section className="shop-inspector-card">
            <p className="eyebrow">定价规则</p>
            <h3>价格来自物品数据</h3>
            <p>买价读取物品的 buyPrice；当铺按 sellPrice 收购所有可出售物品，不需要逐店配置。</p>
          </section>

          <section className="shop-inspector-card">
            <p className="eyebrow">剧情调用</p>
            <h3>通过“商店”指令开店</h3>
            <ol>
              <li>打开掌柜 NPC 的触发脚本。</li>
              <li>插入“商店”指令并选择买入或卖出模式。</li>
              <li>买入模式引用当前店铺编号 #{shop?.id ?? '—'}。</li>
            </ol>
          </section>

          <p className="shop-undo-note">货单改动即时生效，可使用 ⌘Z 撤销。</p>
        </div>
      </aside>
    </>
  )
}
