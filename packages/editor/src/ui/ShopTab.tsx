/**
 * 商店页(数据模式·商店标签)—— 店铺货单编辑。
 * 左:店列表(id + 货数)+ 新建;中:货单(物品行 + 删除/上下移 + 加货下拉);右:提示。
 * 买价/卖价随物品(items 表 buyPrice/sellPrice),此处只编「这家店卖什么」;
 * 脚本「商店」指令(openShop)按店号引用。
 */
import type { ItemData, ShopDef } from '@type-pal/content'
import { useMemo, useState } from 'react'
import { AddShopCommand, UpdateShopCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'

export function ShopTab(props: {
  shops: ShopDef[]
  items: ItemData[]
  session: EditSession
  tabBar?: React.ReactNode
}) {
  const { shops, items, session, tabBar } = props
  const [selId, setSelId] = useState<number>(shops[0]?.id ?? 0)
  const [pick, setPick] = useState('')
  const shop = shops.find((x) => x.id === selId) ?? shops[0]
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  const setItems = (next: string[]): void => {
    if (shop) session.dispatch(new UpdateShopCommand(shop.id, next))
  }

  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">商店</span>
          <span className="spacer" />
          <span className="k">{shops.length} 家</span>
        </div>
        <div className="sprite-list">
          {shops.map((x) => (
            <button
              type="button"
              key={x.id}
              className={`arow${x.id === shop?.id ? ' sel' : ''}`}
              onClick={() => setSelId(x.id)}
            >
              <span className="nm">
                店 {x.id}
                <small>{x.items.length} 种货</small>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="tool"
          style={{ margin: '6px 10px 8px', justifyContent: 'center' }}
          onClick={() => {
            const id = shops.reduce((m, x) => Math.max(m, x.id), -1) + 1
            session.dispatch(new AddShopCommand(id))
            setSelId(id)
          }}
        >
          ＋ 新建店铺
        </button>
      </div>

      <div className="canvas-wrap data-body">
        {shop ? (
          <div className="et-scroll">
            <div className="section">
              <h4>
                店 {shop.id} · 货单
                <span className="hint2">买价随物品表 buyPrice;脚本「商店」指令按店号引用</span>
              </h4>
              {shop.items.map((id, i) => {
                const it = itemsById.get(id)
                return (
                  <div className="ef-row" key={`${shop.id}-${i}-${id}`}>
                    <span className="nm" style={{ flex: 1 }}>
                      {it?.name ?? `?${id}`}
                      <small style={{ marginLeft: 8 }}>
                        {id}
                        {it ? ` · ${it.buyPrice} 文` : '(不在物品表)'}
                      </small>
                    </span>
                    <span className="ef-ops">
                      <button
                        type="button"
                        className="mini"
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
                        className="mini"
                        title="下架"
                        onClick={() => setItems(shop.items.filter((_, j) => j !== i))}
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                )
              })}
              <div className="ef-row" style={{ marginTop: 8 }}>
                <select className="in" value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">(选要上架的物品)</option>
                  {items
                    .filter((it) => !shop.items.includes(it.id))
                    .map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name}({it.buyPrice} 文)
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="tool"
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
            </div>
          </div>
        ) : (
          <div className="insp-empty" style={{ padding: 40 }}>
            无店铺;「＋ 新建店铺」开一家。
          </div>
        )}
      </div>

      <div className="inspector">
        <div className="pane-h">
          <span className="t">商店 · 编辑</span>
        </div>
        <div className="insp-hint">
          货单即改即生效(⌘Z 可回)。买价 = 物品表 buyPrice(物品页改);当铺(卖)不需要 配置 —— 收购一切
          sellable 物品,按 sellPrice。把「商店」指令(买/卖模式)插进 掌柜 NPC 的触发脚本即开店。
        </div>
      </div>
    </>
  )
}
