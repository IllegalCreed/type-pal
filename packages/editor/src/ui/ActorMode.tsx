/**
 * 角色模式(C1)—— NPC 与可入队角色统一编辑(mockup v2)。
 * C1b:骨架 + 角色列表 + 属性面板(身份/头像组/战斗数据/装备/仙术)。
 * C1c 补中间帧标注(四向帧网格 + 命名姿势 + 走路预览);C1d 补编辑交互(命令/undo)。
 */
import { useMemo, useState } from 'react'
import { lookupText } from '@type-pal/content'
import type { ActorDef, ItemDataMap, Locale, SkillDataMap, SpriteDef } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { SpriteFrames } from './SpriteFrames.js'

const SLOT_LABEL: Record<string, string> = {
  weapon: '武器', head: '头', body: '身', cloak: '披', feet: '足', accessory: '饰',
}

export function ActorMode(props: {
  actors: ActorDef[]
  sprites: SpriteDef[]
  items: ItemDataMap
  skills: SkillDataMap
  locale: Locale
  assetBase: AssetBase
}) {
  const { actors, sprites, items, skills, locale, assetBase } = props
  const [selId, setSelId] = useState(actors[0]?.id ?? '')
  const spriteById = useMemo(() => new Map(sprites.map((s) => [s.id, s])), [sprites])
  const actor = actors.find((a) => a.id === selId) ?? actors[0]
  const sprite = actor ? spriteById.get(actor.spriteId) : undefined

  const nm = (id: string): string => {
    const s = lookupText(id, locale)
    return s === id ? id : s
  }

  return (
    <>
      {/* 左:角色列表(NPC + 可入队同列) */}
      <div className="outliner">
        <div className="pane-h"><span className="t">角色</span><span className="spacer" /><span className="k">{actors.length}</span></div>
        <div className="actor-list">
          {actors.map((a) => (
            <button key={a.id} className={`arow${a.id === selId ? ' sel' : ''}`} onClick={() => setSelId(a.id)}>
              <span className="face">{a.battler ? '🧑' : '👤'}</span>
              <span className="nm"><b>{nm(a.name)}</b><span>{a.id}</span></span>
              <span className={`abadge${a.battler ? '' : ' npc'}`}>{a.battler ? '可入队' : 'NPC'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 中:精灵帧标注(C1c) */}
      <div className="center actor-center">
        {actor && sprite ? (
          <SpriteFrames sprite={sprite} assetBase={assetBase} />
        ) : (
          <div className="insp-empty" style={{ padding: 40 }}>
            {actor ? `精灵 "${actor.spriteId}" 不在注册表` : '无角色'}
          </div>
        )}
      </div>

      {/* 右:属性面板 */}
      <div className="inspector">
        {actor ? (
          <>
            <div className="insp-head"><div className="what">选中角色</div><div className="who">{nm(actor.name)} <code style={{ color: 'var(--faint)', fontSize: 11 }}>{actor.id}</code></div></div>
            <div className="section">
              <h4>身份</h4>
              <div className="field"><label>名字</label><div className="in pick"><span>{nm(actor.name)}</span><span className="meta">{actor.name}</span></div></div>
              <div className="field"><label>精灵</label><div className="in pick"><span>{sprite?.label ?? actor.spriteId}</span><span className="meta">#{sprite?.spriteNum ?? '?'}</span></div></div>
            </div>
            <div className="section">
              <h4>头像立绘 <span className="hint2">主 + 命名表情</span></h4>
              {actor.portraits ? (
                <div className="chips">
                  <span className="chip2">主<span className="meta">#{actor.portraits.default}</span></span>
                  {Object.entries(actor.portraits.expressions ?? {}).map(([name, n]) => (
                    <span key={name} className="chip2">{name}<span className="meta">#{n}</span></span>
                  ))}
                </div>
              ) : <div className="hint">（无头像）</div>}
            </div>
            {actor.battler ? (
              <>
                <div className="section">
                  <h4>战斗数据 <span className="abadge">可入队</span></h4>
                  <div className="statgrid">
                    <Stat k="等级" v={actor.battler.baseStats.level} />
                    <Stat k="体力" v={`${actor.battler.baseStats.hp}/${actor.battler.baseStats.maxHP}`} />
                    <Stat k="真气" v={`${actor.battler.baseStats.mp}/${actor.battler.baseStats.maxMP}`} />
                    <Stat k="武术" v={actor.battler.baseStats.attack} />
                    <Stat k="防御" v={actor.battler.baseStats.defense} />
                    <Stat k="灵力" v={actor.battler.baseStats.magicAttack} />
                    <Stat k="身法" v={actor.battler.baseStats.speed} />
                    <Stat k="吉运" v={actor.battler.baseStats.luck} />
                  </div>
                </div>
                <div className="section">
                  <h4>初始装备</h4>
                  <div className="chips">
                    {Object.entries(actor.battler.initialEquipment).map(([slot, itemId]) => (
                      <span key={slot} className="chip2">{items[itemId]?.name ?? itemId}<span className="meta">{SLOT_LABEL[slot] ?? slot}</span></span>
                    ))}
                    {Object.keys(actor.battler.initialEquipment).length === 0 ? <span className="hint">（无）</span> : null}
                  </div>
                </div>
                <div className="section">
                  <h4>初始仙术</h4>
                  <div className="chips">
                    {actor.battler.initialMagic.map((sid) => (
                      <span key={sid} className="chip2">{skills[sid]?.name ?? sid}<span className="meta">{sid}</span></span>
                    ))}
                    {actor.battler.initialMagic.length === 0 ? <span className="hint">（无）</span> : null}
                  </div>
                </div>
                <div className="section"><div className="collapsed">▸ 升级曲线 {actor.battler.leveling?.expTable.length ? `(expTable ${actor.battler.leveling.expTable.length} 级)` : '(未迁)'}</div></div>
              </>
            ) : (
              <div className="section"><div className="hint">纯 NPC（无战斗数据）。加 battler 使其可入队/参战。</div></div>
            )}
          </>
        ) : <div className="insp-empty">无角色</div>}
      </div>
    </>
  )
}

function Stat(props: { k: string; v: string | number }) {
  return <div className="stat"><span>{props.k}</span><b>{props.v}</b></div>
}
