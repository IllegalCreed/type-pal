/**
 * 物品编辑页(数据模式·物品标签)。
 * 左:物品列表(过滤 id/名,图标缩略);中:基础字段 + 说明(风味) + **装备结构化编辑**;
 * use/throw 复杂效果暂走 JSON 兜底(本期只结构化装备)。
 *
 * 装备设计(2026-07-10 作者拍板):**单一真相源 = equip.effects**。说明只写风味介绍,
 * 数值一律由 describeEquipEffects 从 effects 派生显示——彻底根治「说明写 +14、实际 delta
 * 不一定」的脱节。编辑器底部只读预览 = 玩家在游戏里看到的效果行,所见即所得。
 */
import type {
  ActorDef,
  CombatStat,
  EquipEffect,
  EquipSlot,
  EquipSpec,
  ItemData,
  Locale,
  SkillData,
  StatusId,
} from '@type-pal/content'
import { describeEquipEffects, lookupText } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { useMemo, useState } from 'react'
import { UpdateItemCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { RefEntry } from '../core/ref-index.js'
import { RefList } from './VarsTab.js'

const SLOTS: { v: EquipSlot; label: string }[] = [
  { v: 'weapon', label: '武器' },
  { v: 'head', label: '头部' },
  { v: 'body', label: '身体' },
  { v: 'cloak', label: '披风' },
  { v: 'feet', label: '脚部' },
  { v: 'accessory', label: '饰品' },
]
const STATS: { v: CombatStat; label: string }[] = [
  { v: 'attack', label: '武术' },
  { v: 'magicAttack', label: '灵力' },
  { v: 'defense', label: '防御' },
  { v: 'speed', label: '身法' },
  { v: 'luck', label: '吉运' },
]
type ResElem = 'poison' | 'wind' | 'thunder' | 'water' | 'fire' | 'earth'
const RES_ELEMS: { v: ResElem; label: string }[] = [
  { v: 'poison', label: '毒' },
  { v: 'wind', label: '风' },
  { v: 'thunder', label: '雷' },
  { v: 'water', label: '水' },
  { v: 'fire', label: '火' },
  { v: 'earth', label: '土' },
]
const STATUSES: { v: StatusId; label: string }[] = [
  { v: 'confused', label: '混乱' },
  { v: 'paralyzed', label: '定身' },
  { v: 'sleep', label: '睡眠' },
  { v: 'silence', label: '沉默' },
  { v: 'puppet', label: '傀儡' },
  { v: 'bravery', label: '神勇' },
  { v: 'protect', label: '护体' },
  { v: 'haste', label: '加速' },
  { v: 'dualAttack', label: '连击' },
]
const EFFECT_KINDS: { v: EquipEffect['kind']; label: string }[] = [
  { v: 'statBonus', label: '属性加成' },
  { v: 'maxPool', label: '上限加成' },
  { v: 'resistance', label: '抗性' },
  { v: 'grantStatus', label: '常驻状态' },
  { v: 'grantSkill', label: '授予技能' },
  { v: 'attackAll', label: '攻击全体' },
  { v: 'regenHp', label: '回合回体力' },
  { v: 'regenMp', label: '回合回真气' },
]

/** kind 切换的缺省效果体。 */
function defaultEquipEffect(kind: EquipEffect['kind']): EquipEffect {
  switch (kind) {
    case 'statBonus': return { kind, stat: 'attack', delta: 10 }
    case 'maxPool': return { kind, pool: 'hp', delta: 50 }
    case 'resistance': return { kind, element: 'fire', percent: 30 }
    case 'grantStatus': return { kind, status: 'dualAttack' }
    case 'grantSkill': return { kind, skillId: '' }
    case 'attackAll': return { kind }
    case 'regenHp': return { kind, amount: 20 }
    case 'regenMp': return { kind, amount: 10 }
  }
}

function Num(props: { v: number; on: (n: number) => void; w?: number }) {
  return (
    <input
      className="in mono ef-num"
      type="number"
      style={props.w ? { width: props.w } : undefined}
      value={props.v}
      onChange={(e) => props.on(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0)}
      onWheel={(e) => e.currentTarget.blur()}
    />
  )
}

/** 单条装备效果的分支字段(镜像 SkillTab 的 EffectFields)。 */
function EquipEffectFields(props: { e: EquipEffect; skills: SkillData[]; on: (next: EquipEffect) => void }) {
  const { e, skills, on } = props
  switch (e.kind) {
    case 'statBonus':
      return (
        <>
          <label>
            <span>属性</span>
            <select className="in" value={e.stat} onChange={(ev) => on({ ...e, stat: ev.target.value as CombatStat })}>
              {STATS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </label>
          <label><span>加/减</span><Num v={e.delta} on={(n) => on({ ...e, delta: n })} /></label>
        </>
      )
    case 'maxPool':
      return (
        <>
          <label>
            <span>池</span>
            <select className="in" value={e.pool} onChange={(ev) => on({ ...e, pool: ev.target.value as 'hp' | 'mp' })}>
              <option value="hp">体力上限</option>
              <option value="mp">真气上限</option>
            </select>
          </label>
          <label><span>加/减</span><Num v={e.delta} on={(n) => on({ ...e, delta: n })} /></label>
        </>
      )
    case 'resistance':
      return (
        <>
          <label>
            <span>五灵/毒</span>
            <select className="in" value={e.element} onChange={(ev) => on({ ...e, element: ev.target.value as ResElem })}>
              {RES_ELEMS.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
            </select>
          </label>
          <label><span>抗 %</span><Num v={e.percent} on={(n) => on({ ...e, percent: n })} /></label>
        </>
      )
    case 'grantStatus':
      return (
        <label>
          <span>状态</span>
          <select className="in" value={e.status} onChange={(ev) => on({ ...e, status: ev.target.value as StatusId })}>
            {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </label>
      )
    case 'grantSkill':
      return (
        <label>
          <span>技能</span>
          <select className="in" value={e.skillId} onChange={(ev) => on({ ...e, skillId: ev.target.value })}>
            <option value="">(选技能)</option>
            {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      )
    case 'regenHp':
    case 'regenMp':
      return <label><span>每回合</span><Num v={e.amount} on={(n) => on({ ...e, amount: n })} /></label>
    default:
      return <span className="hint2">(无参数)</span>
  }
}

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
  actors: ActorDef[]
  skills: SkillData[]
  locale: Locale
  assetBase?: AssetBase
  session: EditSession
  tabBar?: React.ReactNode
  /** N5:物品 → 引用它的事件(give/lose/hasItem);剧情道具的编辑入口。 */
  itemRefs?: Map<string, RefEntry[]>
  onJumpToEvent?: (sceneId: string, srcKey: string) => void
}) {
  const { items, actors, skills, locale, assetBase, session, tabBar, itemRefs, onJumpToEvent } = props
  const [filter, setFilter] = useState('')
  const [selId, setSelId] = useState(items[0]?.id ?? '')

  const shown = useMemo(
    () => items.filter((i) => !filter || i.id.includes(filter) || i.name.includes(filter)),
    [items, filter],
  )
  const item = items.find((i) => i.id === selId) ?? shown[0]
  const iconBase = assetBase?.itemIcons ?? '/baked/ui/items'
  const skillName = useMemo(() => {
    const m = new Map(skills.map((s) => [s.id, s.name]))
    return (id: string): string | undefined => m.get(id)
  }, [skills])

  const patch = (p: Partial<Omit<ItemData, 'id'>>): void => {
    if (item) session.dispatch(new UpdateItemCommand(item.id, p))
  }
  const equip = item?.equip
  const patchEquip = (next: EquipSpec | undefined): void => patch({ equip: next })
  const setEffect = (i: number, next: EquipEffect): void => {
    if (!equip) return
    const effects = [...equip.effects]
    effects[i] = next
    patchEquip({ ...equip, effects })
  }
  const derived = equip ? describeEquipEffects(equip.effects, { skillName }) : []

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
                介绍 <span className="hint2">只写风味说明;数值效果由下方装备栏自动显示,不用手写</span>
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

            {/* 装备(结构化) */}
            <div className="section">
              <h4>
                装备
                <label className="cf-inline" style={{ marginLeft: 12, fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={!!equip}
                    onChange={(e) =>
                      patchEquip(
                        e.target.checked ? { slot: 'weapon', equipableBy: [], effects: [] } : undefined,
                      )
                    }
                  />
                  可装备
                </label>
              </h4>
              {equip && (
                <>
                  <div className="it-form" style={{ marginBottom: 10 }}>
                    <label className="it-field">
                      <span>槽位</span>
                      <select
                        className="in"
                        value={equip.slot}
                        onChange={(e) => patchEquip({ ...equip, slot: e.target.value as EquipSlot })}
                      >
                        {SLOTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="v-field" style={{ marginBottom: 10 }}>
                    <span className="lb">可装角色</span>
                    <span className="ef-status-set">
                      {actors
                        .filter((a) => a.battler)
                        .map((a) => (
                          <label key={a.id} className="cf-inline">
                            <input
                              type="checkbox"
                              checked={equip.equipableBy.includes(a.id)}
                              onChange={(ev) =>
                                patchEquip({
                                  ...equip,
                                  equipableBy: ev.target.checked
                                    ? [...equip.equipableBy, a.id]
                                    : equip.equipableBy.filter((x) => x !== a.id),
                                })
                              }
                            />
                            {(() => {
                              const nm = lookupText(a.name, locale)
                              return nm === a.name ? a.id : nm
                            })()}
                          </label>
                        ))}
                    </span>
                  </div>

                  <div className="v-field">
                    <span className="lb">效果</span>
                    {equip.effects.map((e, i) => (
                      <div className="ef-row" key={`${item.id}-eq-${i}`}>
                        <select
                          className="in ef-kind"
                          value={e.kind}
                          onChange={(ev) => setEffect(i, defaultEquipEffect(ev.target.value as EquipEffect['kind']))}
                        >
                          {EFFECT_KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
                        </select>
                        <div className="ef-fields">
                          <EquipEffectFields e={e} skills={skills} on={(next) => setEffect(i, next)} />
                        </div>
                        <span className="ef-ops">
                          <button
                            type="button"
                            className="mini"
                            title="上移"
                            disabled={i === 0}
                            onClick={() => {
                              const ef = [...equip.effects]
                              const t = ef[i - 1]!
                              ef[i - 1] = ef[i]!
                              ef[i] = t
                              patchEquip({ ...equip, effects: ef })
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="mini"
                            title="下移"
                            disabled={i === equip.effects.length - 1}
                            onClick={() => {
                              const ef = [...equip.effects]
                              const t = ef[i + 1]!
                              ef[i + 1] = ef[i]!
                              ef[i] = t
                              patchEquip({ ...equip, effects: ef })
                            }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="mini"
                            title="删除"
                            onClick={() => patchEquip({ ...equip, effects: equip.effects.filter((_, j) => j !== i) })}
                          >
                            ✕
                          </button>
                        </span>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="tool"
                      onClick={() => patchEquip({ ...equip, effects: [...equip.effects, defaultEquipEffect('statBonus')] })}
                    >
                      ＋ 添加效果
                    </button>
                  </div>

                  {/* 派生预览:玩家在游戏详情框/装备菜单看到的效果行,所见即所得 */}
                  <div className="eq-derived">
                    <span className="lb">玩家看到</span>
                    {derived.length ? (
                      <div className="eq-derived-lines">
                        {derived.map((line, i) => (
                          <div key={`${item.id}-dv-${i}`}>{line}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="hint2">(无机制效果——纯风味/剧情装备)</span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="section">
              <h4>
                使用 / 投掷效果(JSON 兜底)
                <span className="hint2">删除键值 = 取消该用途;结构见 content/item.ts</span>
              </h4>
              <textarea
                className="in cf-ta it-ta it-ta-tall"
                key={`${item.id}-spec`}
                defaultValue={JSON.stringify({ use: item.use, throw: item.throw }, null, 2)}
                onBlur={(e) => {
                  try {
                    const v = JSON.parse(e.target.value) as Pick<ItemData, 'use' | 'throw'>
                    patch({ use: v.use, throw: v.throw })
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
          名字/价格/图标即改即生效(撤销可回)。装备效果结构化编辑,数值是唯一真相源——「玩家看到」
          实时预览就是游戏详情框/装备菜单显示的效果行,说明只写风味。使用/投掷效果暂走 JSON。
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
