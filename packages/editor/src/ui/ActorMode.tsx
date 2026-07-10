/**
 * 角色模式(C1)—— NPC 与可入队角色统一编辑(mockup v2)。
 * C1b:骨架 + 角色列表 + 属性面板(身份/头像组/战斗数据/装备/仙术)。
 * C1c 补中间帧标注(四向帧网格 + 命名姿势 + 走路预览);C1d 补编辑交互(命令/undo)。
 */

import type {
  ActorDef,
  BattlerSpec,
  ItemDataMap,
  LevelUpSkill,
  Locale,
  SkillDataMap,
  SpriteDef,
} from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { useMemo, useState } from 'react'
import { UpdateActorCommand, UpdateStartSkillsCommand, SetActorBattleSpriteCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { BattleSpriteUploader } from './BattleSpriteUploader.js'
import { LevelingEditor } from './LevelingEditor.js'
import { PortraitEditor } from './PortraitEditor.js'
import { SpriteFrames } from './SpriteFrames.js'

const SLOT_LABEL: Record<string, string> = {
  weapon: '武器',
  head: '头',
  body: '身',
  cloak: '披',
  feet: '足',
  accessory: '饰',
}

export function ActorMode(props: {
  actors: ActorDef[]
  sprites: SpriteDef[]
  items: ItemDataMap
  skills: SkillDataMap
  locale: Locale
  assetBase: AssetBase
  session: EditSession
  /** 升级学技能表(skills.json levelUp 键;C6 编辑)。 */
  levelUp: Record<string, LevelUpSkill[]>
  /** 新档初始技能(manifest.startWorld.learnedSkills —— 战斗技能真实来源;可编辑)。 */
  startSkills: Record<string, string[]>
}) {
  const { actors, sprites, items, skills, locale, assetBase, session, levelUp, startSkills } = props
  const [selId, setSelId] = useState(actors[0]?.id ?? '')
  const [battleUpload, setBattleUpload] = useState(false) // A4c 战斗形象上传器展开
  const spriteById = useMemo(() => new Map(sprites.map((s) => [s.id, s])), [sprites])
  const actor = actors.find((a) => a.id === selId) ?? actors[0]
  const sprite = actor ? spriteById.get(actor.spriteId) : undefined

  const nm = (id: string): string => {
    const s = lookupText(id, locale)
    return s === id ? id : s
  }

  /** 改战斗属性:hp/mp 跟 maxHP/maxMP(初始满)。dispatch UpdateActorCommand。 */
  const setStat = (key: keyof BattlerSpec['baseStats'], val: number): void => {
    if (!actor?.battler || !Number.isFinite(val)) return
    const bs = { ...actor.battler.baseStats, [key]: val }
    if (key === 'maxHP') bs.hp = val
    if (key === 'maxMP') bs.mp = val
    session.dispatch(
      new UpdateActorCommand(actor.id, { battler: { ...actor.battler, baseStats: bs } }),
    )
  }

  return (
    <>
      {/* 左:角色列表(NPC + 可入队同列) */}
      <div className="outliner">
        <div className="pane-h">
          <span className="t">角色</span>
          <span className="spacer" />
          <span className="k">{actors.length}</span>
        </div>
        <div className="actor-list">
          {actors.map((a) => (
            <button
              key={a.id}
              className={`arow${a.id === selId ? ' sel' : ''}`}
              onClick={() => setSelId(a.id)}
            >
              <span className="face">{a.battler ? '🧑' : '👤'}</span>
              <span className="nm">
                <b>{nm(a.name)}</b>
                <span>{a.id}</span>
              </span>
              <span className={`abadge${a.battler ? '' : ' npc'}`}>
                {a.battler ? '可入队' : 'NPC'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 中:精灵帧标注(C1c) */}
      <div className="center actor-center">
        {actor && sprite ? (
          <SpriteFrames sprite={sprite} assetBase={assetBase} session={session} />
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
            <div className="insp-head">
              <div className="what">选中角色</div>
              <div className="who">
                {nm(actor.name)}{' '}
                <code style={{ color: 'var(--faint)', fontSize: 11 }}>{actor.id}</code>
              </div>
            </div>
            <div className="section">
              <h4>身份</h4>
              <div className="field">
                <label>名字</label>
                <div className="in pick">
                  <span>{nm(actor.name)}</span>
                  <span className="meta">{actor.name}</span>
                </div>
              </div>
              <div className="field">
                <label>精灵</label>
                <div className="in pick">
                  <span>{sprite?.label ?? actor.spriteId}</span>
                  <span className="meta">#{sprite?.spriteNum ?? '?'}</span>
                </div>
              </div>
            </div>
            <PortraitEditor
              actor={actor}
              session={session}
              portraitBase={assetBase.portraits}
            />
            {actor.battler ? (
              <>
                <div className="section">
                  <h4>
                    战斗数据 <span className="abadge">可入队</span>
                  </h4>
                  <div className="statgrid">
                    <EditStat
                      k="等级"
                      v={actor.battler.baseStats.level}
                      on={(x) => setStat('level', x)}
                    />
                    <EditStat
                      k="体力"
                      v={actor.battler.baseStats.maxHP}
                      on={(x) => setStat('maxHP', x)}
                    />
                    <EditStat
                      k="真气"
                      v={actor.battler.baseStats.maxMP}
                      on={(x) => setStat('maxMP', x)}
                    />
                    <EditStat
                      k="武术"
                      v={actor.battler.baseStats.attack}
                      on={(x) => setStat('attack', x)}
                    />
                    <EditStat
                      k="防御"
                      v={actor.battler.baseStats.defense}
                      on={(x) => setStat('defense', x)}
                    />
                    <EditStat
                      k="灵力"
                      v={actor.battler.baseStats.magicAttack}
                      on={(x) => setStat('magicAttack', x)}
                    />
                    <EditStat
                      k="身法"
                      v={actor.battler.baseStats.speed}
                      on={(x) => setStat('speed', x)}
                    />
                    <EditStat
                      k="吉运"
                      v={actor.battler.baseStats.luck}
                      on={(x) => setStat('luck', x)}
                    />
                  </div>
                </div>
                <div className="section">
                  <h4>
                    战斗形象
                    <span className="hint2">
                      {actor.battler.battleSpritePath
                        ? ' 自有形象 ✓(保存后战斗可见)'
                        : actor.battler.battleSpriteNum != null
                          ? ` 原版 #${actor.battler.battleSpriteNum}`
                          : ' 未设置(战斗中隐形)'}
                    </span>
                    <button
                      type="button"
                      className="mini-txt"
                      style={{ marginLeft: 8 }}
                      title="上传 PNG 帧带(横排逐行切),自动贴合工程主色;引擎战斗按帧序取用"
                      onClick={() => setBattleUpload((v) => !v)}
                    >
                      ⬆ 上传
                    </button>
                  </h4>
                  {battleUpload && (
                    <BattleSpriteUploader
                      assetBase={assetBase}
                      onApply={(buf) => {
                        session.dispatch(
                          new SetActorBattleSpriteCommand(
                            actor.id,
                            `assets/battle-sprites/player/${actor.id}.rle`,
                            buf,
                          ),
                        )
                        setBattleUpload(false)
                      }}
                      onCancel={() => setBattleUpload(false)}
                    />
                  )}
                </div>
                <div className="section">
                  <h4>初始装备</h4>
                  <div className="chips">
                    {Object.entries(actor.battler.initialEquipment).map(([slot, itemId]) => (
                      <span key={slot} className="chip2">
                        {items[itemId]?.name ?? itemId}
                        <span className="meta">{SLOT_LABEL[slot] ?? slot}</span>
                      </span>
                    ))}
                    {Object.keys(actor.battler.initialEquipment).length === 0 ? (
                      <span className="hint">（无）</span>
                    ) : null}
                  </div>
                </div>
                <div className="section">
                  <h4>初始仙术</h4>
                  <div className="chips">
                    {actor.battler.initialMagic.map((sid) => (
                      <span key={sid} className="chip2">
                        {skills[sid]?.name ?? sid}
                        <span className="meta">{sid}</span>
                      </span>
                    ))}
                    {actor.battler.initialMagic.length === 0 ? (
                      <span className="hint">（无）</span>
                    ) : null}
                  </div>
                </div>
                <div className="section">
                  <h4>
                    初始技能<span className="hint2"> · 新档入队即会(startWorld;战斗技能来源)</span>
                  </h4>
                  <div className="chips">
                    {(startSkills[actor.id] ?? []).map((sid) => (
                      <span key={sid} className="chip2">
                        {skills[sid]?.name ?? sid}
                        <button
                          type="button"
                          className="mini"
                          style={{ width: 16, height: 16, fontSize: 10, marginLeft: 4 }}
                          title="移除"
                          onClick={() =>
                            session.dispatch(
                              new UpdateStartSkillsCommand(
                                actor.id,
                                (startSkills[actor.id] ?? []).filter((x) => x !== sid),
                              ),
                            )
                          }
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    className="in"
                    value=""
                    onChange={(e) => {
                      const sid = e.target.value
                      if (!sid) return
                      const cur = startSkills[actor.id] ?? []
                      if (!cur.includes(sid))
                        session.dispatch(new UpdateStartSkillsCommand(actor.id, [...cur, sid]))
                    }}
                  >
                    <option value="">＋ 添加技能…</option>
                    {Object.values(skills)
                      .filter((sk) => !(startSkills[actor.id] ?? []).includes(sk.id))
                      .map((sk) => (
                        <option key={sk.id} value={sk.id}>
                          {sk.name} ({sk.id})
                        </option>
                      ))}
                  </select>
                </div>
                <LevelingEditor
                  actor={actor as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
                  levelUpRows={levelUp[actor.id] ?? []}
                  skills={skills}
                  session={session}
                />
              </>
            ) : (
              <div className="section">
                <div className="hint">纯 NPC（无战斗数据）。加 battler 使其可入队/参战。</div>
              </div>
            )}
          </>
        ) : (
          <div className="insp-empty">无角色</div>
        )}
      </div>
    </>
  )
}

function EditStat(props: { k: string; v: number; on: (x: number) => void }) {
  return (
    <div className="stat">
      <span>{props.k}</span>
      <input
        className="stat-in mono"
        type="number"
        value={props.v}
        onChange={(e) =>
          e.target.valueAsNumber >= 0 && props.on(Math.floor(e.target.valueAsNumber))
        }
      />
    </div>
  )
}
