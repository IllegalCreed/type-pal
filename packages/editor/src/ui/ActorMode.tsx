/**
 * 角色模式(C1)—— NPC 与可入队角色统一编辑(mockup v2)。
 * C1b:骨架 + 角色列表 + 属性面板(身份/头像组/战斗数据/装备/仙术)。
 * C1c 补中间帧标注(四向帧网格 + 命名姿势 + 走路预览);C1d 补编辑交互(命令/undo)。
 */

import type {
  ActorDef,
  AssetCatalogV1,
  AssetId,
  BattlerSounds,
  BattlerSpec,
  BattleSpriteDef,
  ItemDataMap,
  LevelUpSkill,
  Locale,
  SkillDataMap,
  SpriteDef,
} from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { useEffect, useMemo, useState } from 'react'
import { prepareBattleSpriteImport } from '../core/battle-sprite-import.js'
import {
  AddBattleSpriteCommand,
  CompositeCommand,
  SetActorBattleSpriteCommand,
  UpdateActorCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { BattleSpritePicker } from './BattleSpritePicker.js'
import { BattleSpriteUploader } from './BattleSpriteUploader.js'
import { CasualtyEditor } from './CasualtyEditor.js'
import { ImageAssetPicker } from './ImageAssetPicker.js'
import { LevelCurveEditor } from './LevelCurveEditor.js'
import { LevelingEditor } from './LevelingEditor.js'
import { PortraitEditor } from './PortraitEditor.js'
import { SoundPicker } from './SoundPicker.js'
import { SpriteFrames } from './SpriteFrames.js'

const SLOT_LABEL: Record<string, string> = {
  weapon: '武器',
  head: '头',
  body: '身',
  cloak: '披',
  feet: '足',
  accessory: '饰',
}

const BATTLER_SOUND_FIELDS: readonly { key: keyof BattlerSounds; label: string }[] = [
  { key: 'attack', label: '普攻出招' },
  { key: 'critical', label: '暴击出招' },
  { key: 'weapon', label: '兵器命中' },
  { key: 'magic', label: '施法吟唱' },
  { key: 'cover', label: '替挡 / 格挡' },
  { key: 'dying', label: '濒死' },
  { key: 'death', label: '阵亡' },
]

export function ActorMode(props: {
  actors: ActorDef[]
  sprites: SpriteDef[]
  battleSprites: readonly BattleSpriteDef[]
  items: ItemDataMap
  skills: SkillDataMap
  locale: Locale
  assetBase: AssetBase
  session: EditSession
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  /** 升级学技能表(skills.json levelUp 键;C6 编辑)。 */
  levelUp: Record<string, LevelUpSkill[]>
  /** 默认入口的开局技能，只读摘要；唯一作者在工程 → 入口与开局。 */
  startSkills: Record<string, string[]>
  navigation?: React.ReactNode
  focusActorId?: string
  onActorFocus?: (id: string) => void
  onOpenSprite?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  onOpenSound?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenStartSettings?: () => void
}) {
  const {
    actors,
    sprites,
    battleSprites,
    items,
    skills,
    locale,
    assetBase,
    session,
    assetCatalog,
    assetReader,
    levelUp,
    startSkills,
    navigation,
    focusActorId,
    onActorFocus,
    onOpenSprite,
    onOpenBattleSprite,
    onOpenSound,
    onOpenImage,
    onOpenStartSettings,
  } = props
  const [selId, setSelId] = useState(focusActorId ?? actors[0]?.id ?? '')
  const [battleUpload, setBattleUpload] = useState(false) // A4c 战斗形象上传器展开
  // G1:中区编辑器三选一互斥(精灵帧 / 升级曲线 / 伤亡脚本);null = 精灵帧。
  const [centerEditor, setCenterEditor] = useState<'curve' | 'casualty' | null>(null)
  const spriteById = useMemo(() => new Map(sprites.map((s) => [s.id, s])), [sprites])
  const actor = actors.find((a) => a.id === selId)
  const sprite = actor ? spriteById.get(actor.spriteId) : undefined

  useEffect(() => {
    if (focusActorId !== undefined) setSelId(focusActorId)
  }, [focusActorId])

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

  const setBattlerSound = (key: keyof BattlerSounds, value: AssetId | undefined): void => {
    if (!actor?.battler) return
    const sounds = { ...actor.battler.sounds, [key]: value }
    if (value === undefined) delete sounds[key]
    const nextSounds = Object.keys(sounds).length ? sounds : undefined
    session.dispatch(
      new UpdateActorCommand(actor.id, {
        battler: { ...actor.battler, sounds: nextSounds },
      }),
    )
  }

  return (
    <>
      {/* 左:角色列表(NPC + 可入队同列) */}
      <div className="outliner">
        {navigation}
        <div className="pane-h">
          <span className="t">角色</span>
          <span className="spacer" />
          <span className="k">{actors.length}</span>
        </div>
        <div className="actor-list">
          {actors.map((a) => (
            <button
              type="button"
              key={a.id}
              className={`arow${a.id === selId ? ' sel' : ''}`}
              onClick={() => {
                setSelId(a.id)
                onActorFocus?.(a.id)
              }}
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

      {/* 中:精灵帧标注(C1c)/ 升级曲线编辑器(C6)/ 伤亡脚本编辑器(E18-1)三选一互斥 */}
      <div className="center actor-center">
        {centerEditor === 'casualty' && actor?.battler ? (
          <CasualtyEditor
            key={actor.id}
            actor={actor as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
            session={session}
            locale={locale}
            onClose={() => setCenterEditor(null)}
          />
        ) : centerEditor === 'curve' && actor?.battler ? (
          <LevelCurveEditor
            key={actor.id}
            actor={actor as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
            levelUpRows={levelUp[actor.id] ?? []}
            skills={skills}
            session={session}
            onClose={() => setCenterEditor(null)}
          />
        ) : actor && sprite ? (
          <SpriteFrames
            sprite={sprite}
            assetBase={assetBase}
            assetReader={assetReader}
            session={session}
          />
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
                <span className="field-label">名字</span>
                <div className="in pick">
                  <span>{nm(actor.name)}</span>
                  <span className="meta">{actor.name}</span>
                </div>
              </div>
              <div className="field">
                <span className="field-label">精灵</span>
                <div className="in pick linked-value">
                  <span>{sprite?.label ?? actor.spriteId}</span>
                  <span className="meta">{sprite?.asset ?? '缺资源'}</span>
                  <button
                    type="button"
                    className="linked-value-open"
                    title="在资源模块打开精灵"
                    aria-label={`打开精灵 ${actor.spriteId}`}
                    onClick={() => onOpenSprite?.(actor.spriteId)}
                  >
                    ↗
                  </button>
                </div>
              </div>
            </div>
            <PortraitEditor
              actor={actor}
              session={session}
              catalog={assetCatalog}
              reader={assetReader}
              onOpenAsset={onOpenImage}
            />
            <div className="section">
              <h4>
                菜单 / 战斗小头像 <span className="hint2">face 图片；缺省表示刻意不显示</span>
              </h4>
              <div className="field">
                <span className="field-label">小头像</span>
                <ImageAssetPicker
                  value={actor.face}
                  kind="face"
                  catalog={assetCatalog}
                  reader={assetReader}
                  allowUnset
                  ariaLabel="菜单和战斗小头像"
                  onOpenAsset={onOpenImage}
                  onChange={(face) => session.dispatch(new UpdateActorCommand(actor.id, { face }))}
                />
              </div>
            </div>
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
                    战斗关系 <span className="hint2">援护 / 合体技 / 伤亡脚本</span>
                  </h4>
                  <div className="field">
                    <span className="field-label">援护者</span>
                    <select
                      className="in"
                      value={actor.battler.coveredBy ?? ''}
                      onChange={(e) => {
                        const b = actor.battler
                        if (!b) return
                        session.dispatch(
                          new UpdateActorCommand(actor.id, {
                            battler: { ...b, coveredBy: e.target.value || undefined },
                          }),
                        )
                      }}
                    >
                      <option value="">（无）</option>
                      {actors
                        .filter((a) => a.battler)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {nm(a.name)} ({a.id})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="field">
                    <span className="field-label">合体技</span>
                    <select
                      className="in"
                      value={actor.battler.cooperativeMagicSkillId ?? ''}
                      onChange={(e) => {
                        const b = actor.battler
                        if (!b) return
                        session.dispatch(
                          new UpdateActorCommand(actor.id, {
                            battler: { ...b, cooperativeMagicSkillId: e.target.value || undefined },
                          }),
                        )
                      }}
                    >
                      <option value="">（无）</option>
                      {Object.entries(skills).map(([id, s]) => (
                        <option key={id} value={id}>
                          {s.name} ({id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <span className="field-label">伤亡脚本</span>
                    <div className="chips">
                      {(['friendDeath', 'dying'] as const).map((slot) => (
                        <span
                          key={slot}
                          className={`chip2${actor.battler?.casualty?.[slot] ? '' : ' dim'}`}
                        >
                          {slot === 'friendDeath' ? '队友阵亡' : '自己濒死'}：
                          {actor.battler?.casualty?.[slot] ? '已配置' : '未配置'}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="tool"
                        onClick={() => setCenterEditor('casualty')}
                      >
                        ✎ 编辑伤亡脚本
                      </button>
                      {(['friendDeath', 'dying'] as const).map((slot) =>
                        actor.battler?.casualty?.[slot] ? (
                          <button
                            type="button"
                            className="mini-txt"
                            key={slot}
                            onClick={() => {
                              const b = actor.battler
                              if (!b) return
                              // K4:槽移除 = 键 undefined;两槽全移除 → casualty 整体 undefined。
                              const cur = b.casualty
                              const next: NonNullable<BattlerSpec['casualty']> = cur
                                ? { ...cur }
                                : {}
                              delete next[slot]
                              session.dispatch(
                                new UpdateActorCommand(actor.id, {
                                  battler: { ...b, casualty: next.friendDeath !== undefined || next.dying !== undefined ? next : undefined },
                                }),
                              )
                            }}
                          >
                            移除{slot === 'friendDeath' ? '队友阵亡' : '濒死'}
                          </button>
                        ) : null,
                      )}
                    </div>
                  </div>
                </div>
                <div className="section">
                  <h4>
                    战斗形象
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
                  <div className="field">
                    <span className="field-label">定义</span>
                    <BattleSpritePicker
                      value={actor.battler.battleSprite}
                      definitions={battleSprites}
                      kind="player-fighter"
                      onChange={(id) =>
                        session.dispatch(new SetActorBattleSpriteCommand(actor.id, id))
                      }
                      onOpenDefinition={onOpenBattleSprite}
                      ariaLabel="角色战斗精灵"
                    />
                  </div>
                  {battleUpload && (
                    <BattleSpriteUploader
                      assetBase={assetBase}
                      onApply={async (buf, frameCount) => {
                        const prepared = await prepareBattleSpriteImport(session.getState(), {
                          hint: actor.id,
                          label: `${nm(actor.name)} 战斗精灵`,
                          kind: 'player-fighter',
                          bytes: buf,
                          frameCount,
                          reader: assetReader,
                        })
                        session.dispatch(
                          new CompositeCommand('上传并设置角色战斗精灵', [
                            new AddBattleSpriteCommand(
                              prepared.definition,
                              prepared.record,
                              prepared.bytes,
                              prepared.frameCount,
                            ),
                            new SetActorBattleSpriteCommand(actor.id, prepared.definition.id),
                          ]),
                        )
                        setBattleUpload(false)
                      }}
                      onCancel={() => setBattleUpload(false)}
                    />
                  )}
                </div>
                <div className="section">
                  <h4>战斗音效</h4>
                  <div className="sound-field-list">
                    {BATTLER_SOUND_FIELDS.map(({ key, label }) => (
                      <div className="field" key={key}>
                        <span className="field-label">{label}</span>
                        <SoundPicker
                          value={actor.battler?.sounds?.[key]}
                          onChange={(value) => setBattlerSound(key, value)}
                          catalog={assetCatalog}
                          reader={assetReader}
                          allowUnset
                          ariaLabel={`${label}音效`}
                          onOpenAsset={onOpenSound}
                        />
                      </div>
                    ))}
                  </div>
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
                    入口开局技能<span className="hint2"> · 默认入口摘要（只读）</span>
                  </h4>
                  <div className="chips">
                    {(startSkills[actor.id] ?? []).map((sid) => (
                      <span key={sid} className="chip2">
                        {skills[sid]?.name ?? sid}
                        <span className="meta">{sid}</span>
                      </span>
                    ))}
                    {(startSkills[actor.id] ?? []).length === 0 ? (
                      <span className="hint">（默认入口未配置）</span>
                    ) : null}
                  </div>
                  <div className="hint" style={{ marginTop: 7 }}>
                    每个入口可以有不同的队伍与技能；请在入口自己的开局设置中统一编辑。
                  </div>
                  <button
                    type="button"
                    className="mini-txt"
                    style={{ marginTop: 7 }}
                    onClick={onOpenStartSettings}
                  >
                    前往“入口与开局”编辑 ↗
                  </button>
                </div>
                <LevelingEditor
                  actor={actor as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
                  levelUpRows={levelUp[actor.id] ?? []}
                  skills={skills}
                  session={session}
                  onEditCurve={() => setCenterEditor('curve')}
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
