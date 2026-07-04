/**
 * 物品编辑页(数据模式·物品标签)—— 此前是占位空壳,现补齐(作者问「能编辑道具吗」)。
 * 左:物品列表(过滤 id/名,图标缩略);中:常用字段表单(名字/价格/可卖/图标+预览/说明);
 * equip/use/throw 复杂效果走 JSON 兜底(同 EnemyTab 哲学:全数据可编不留死角)。
 */
import type { ItemData } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { useMemo, useState } from 'react'
import { UpdateItemCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { RefEntry } from '../core/ref-index.js'
import { RefList } from './VarsTab.js'

/** 图标(预烘 RGBA PNG;assetBase.itemIcons 目录)。 */
function ItemIcon(props: { base: string; icon: number; size?: number }) {
  const { base, icon, size = 32 } = props
  return (
    <img
      src={`${props.base}/${icon}.png`}
      alt=""
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
      onError={(e) => {
        ;(e.target as HTMLImageElement).style.visibility = 'hidden' // 缺图静默(demo 无图标目录)
      }}
    />
  )
}

export function ItemTab(props: {
  items: ItemData[]
  assetBase?: AssetBase
  session: EditSession
  tabBar?: React.ReactNode
  /** N5:物品 → 引用它的事件(give/lose/hasItem);剧情道具的编辑入口。 */
  itemRefs?: Map<string, RefEntry[]>
  onJumpToEvent?: (sceneId: string, srcKey: string) => void
}) {
  const { items, assetBase, session, tabBar, itemRefs, onJumpToEvent } = props
  const [filter, setFilter] = useState('')
  const [selId, setSelId] = useState(items[0]?.id ?? '')

  const shown = useMemo(
    () => items.filter((i) => !filter || i.id.includes(filter) || i.name.includes(filter)),
    [items, filter],
  )
  const item = items.find((i) => i.id === selId) ?? shown[0]
  const iconBase = assetBase?.itemIcons ?? '/baked/ui/items'

  const patch = (p: Partial<Omit<ItemData, 'id'>>): void => {
    if (item) session.dispatch(new UpdateItemCommand(item.id, p))
  }

  return (
    <>
      {/* 左:标签栏 + 物品列表 */}
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">物品</span>
          <span className="spacer" />
          <span className="k">
            {shown.length}/{items.length}
          </span>
        </div>
        <input
          className="in"
          placeholder="过滤 id/名…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ margin: '0 8px 6px' }}
        />
        <div className="sprite-list">
          {shown.map((i) => (
            <button
              type="button"
              key={i.id}
              className={`arow${i.id === item?.id ? ' sel' : ''}`}
              onClick={() => setSelId(i.id)}
            >
              <span className="face">
                <ItemIcon base={iconBase} icon={i.icon} size={22} />
              </span>
              <span className="nm">
                {i.name}
                <small>
                  {i.id}
                  {i.equip ? ' · 装备' : ''}
                  {i.use ? ' · 可用' : ''}
                </small>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 中:字段编辑 */}
      <div className="canvas-wrap data-body">
        {item ? (
          <div className="et-scroll">
            <div className="section">
              <h4>基础</h4>
              <div className="it-form">
                <div className="it-icon-cell">
                  <span className="it-icon-frame">
                    <ItemIcon base={iconBase} icon={item.icon} size={40} />
                  </span>
                  <label className="it-field num">
                    <span>图标#</span>
                    <input
                      className="in mono"
                      type="number"
                      value={item.icon}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) =>
                        patch({ icon: Math.max(0, Math.floor(e.target.valueAsNumber || 0)) })
                      }
                    />
                  </label>
                </div>
                <label className="it-field name">
                  <span>名字</span>
                  <input
                    className="in"
                    value={item.name}
                    onChange={(e) => patch({ name: e.target.value })}
                  />
                </label>
                <label className="it-field num">
                  <span>买价</span>
                  <input
                    className="in mono"
                    type="number"
                    value={item.buyPrice}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                      patch({ buyPrice: Math.max(0, Math.floor(e.target.valueAsNumber || 0)) })
                    }
                  />
                </label>
                <label className="it-field num">
                  <span>卖价</span>
                  <input
                    className="in mono"
                    type="number"
                    value={item.sellPrice}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                      patch({ sellPrice: Math.max(0, Math.floor(e.target.valueAsNumber || 0)) })
                    }
                  />
                </label>
                <label className="it-check">
                  <input
                    type="checkbox"
                    checked={item.sellable}
                    onChange={(e) => patch({ sellable: e.target.checked })}
                  />
                  可卖
                </label>
              </div>
            </div>
            <div className="section">
              <h4>
                说明 <span className="hint2">一行一条(菜单详情框逐行渲染)</span>
              </h4>
              <textarea
                className="in cf-ta it-ta"
                key={`${item.id}-desc`}
                defaultValue={item.desc.join('\n')}
                onBlur={(e) =>
                  patch({ desc: e.target.value.split('\n').filter((l) => l.trim() !== '') })
                }
                spellCheck={false}
              />
            </div>
            <div className="section">
              <h4>
                装备 / 使用 / 投掷效果(JSON 兜底)
                <span className="hint2">删除键值 = 取消该用途;结构见 content/item.ts</span>
              </h4>
              <textarea
                className="in cf-ta it-ta it-ta-tall"
                key={`${item.id}-spec`}
                defaultValue={JSON.stringify(
                  { equip: item.equip, use: item.use, throw: item.throw },
                  null,
                  2,
                )}
                onBlur={(e) => {
                  try {
                    const v = JSON.parse(e.target.value) as Pick<
                      ItemData,
                      'equip' | 'use' | 'throw'
                    >
                    patch({ equip: v.equip, use: v.use, throw: v.throw })
                  } catch {
                    /* 解析失败不落盘;失焦保持原文供修 */
                  }
                }}
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          <div className="insp-empty" style={{ padding: 40 }}>
            无物品
          </div>
        )}
      </div>

      {/* 右:提示 + 被引用(N5) */}
      <div className="inspector">
        <div className="pane-h">
          <span className="t">物品 · 编辑</span>
        </div>
        <div className="insp-hint">
          名字/价格/图标即改即生效(撤销可回);装备加成(equip.effects)与使用效果
          (use.effects)结构化编辑后续补,现走 JSON——改完 💾 保存,菜单/战斗立即消费。
        </div>
        {item && itemRefs && onJumpToEvent && (
          <div className="section">
            <h4>
              被事件引用
              <span className="hint2">{itemRefs.get(item.id)?.length ?? 0} 处 · 点击跳事件</span>
            </h4>
            {itemRefs.get(item.id)?.length ? (
              <RefList refs={itemRefs.get(item.id)!} onJump={onJumpToEvent} />
            ) : (
              <div className="insp-empty">没有事件给出/收走/检查此物品。</div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
