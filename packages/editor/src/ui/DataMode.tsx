/**
 * 数据模式(RPG Maker 数据库范式)—— 游戏数据表统一入口,标签页组织。
 * 精灵库(座椅/火把/石头 + 角色行走图)/ 技能 / 物品 / 敌人。
 * C1 阶段先落「精灵库」标签(场景 prop 精灵的布局配置);技能/物品/敌人后续。
 */

import type {
  BattleFieldDef,
  EnemyDef,
  EnemyTeamDef,
  ItemDataMap,
  Locale,
  MusicDef,
  SceneDef,
  SkillDataMap,
  SpriteDef,
  SpriteLayout,
} from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { useMemo, useState } from 'react'
import { UpdateSpriteCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { buildRefIndex } from '../core/ref-index.js'
import { AmbienceTab } from './AmbienceTab.js'
import { BattleFieldTab } from './BattleFieldTab.js'
import { CutsceneTab } from './CutsceneTab.js'
import { EnemyTab } from './EnemyTab.js'
import { EntryPointTab } from './EntryPointTab.js'
import { EventLibTab } from './EventLibTab.js'
import { ItemTab } from './ItemTab.js'
import { MusicTab } from './MusicTab.js'
import { PoisonTab } from './PoisonTab.js'
import { SharedScriptTab } from './SharedScriptTab.js'
import { ShopTab } from './ShopTab.js'
import { SkillTab } from './SkillTab.js'
import { SpriteFrames } from './SpriteFrames.js'
import { SpriteUploadWizard } from './SpriteUploadWizard.js'
import { TilesetTab } from './TilesetTab.js'
import { VarsTab } from './VarsTab.js'

export type DataTab =
  | 'sprite'
  | 'skill'
  | 'item'
  | 'enemy'
  | 'poison'
  | 'ambience'
  | 'shop'
  | 'battlefield'
  | 'music'
  | 'tileset'
  | 'cutscene'
  | 'entrypoint'
  | 'vars'
  | 'events'
  | 'scripts'
export const DATA_TABS: { id: DataTab; label: string; icon: string }[] = [
  { id: 'sprite', label: '精灵库', icon: '🖼' },
  { id: 'skill', label: '技能', icon: '✨' },
  { id: 'item', label: '物品', icon: '🎒' },
  { id: 'enemy', label: '敌人', icon: '👹' },
  { id: 'poison', label: '毒', icon: '☠️' },
  { id: 'ambience', label: '氛围', icon: '🌗' },
  { id: 'shop', label: '商店', icon: '🏪' },
  { id: 'battlefield', label: '战场', icon: '🏞' },
  { id: 'music', label: '音乐', icon: '🎵' },
  { id: 'tileset', label: '瓦片集', icon: '🧱' },
  { id: 'cutscene', label: '过场', icon: '🎬' },
  { id: 'entrypoint', label: '入口', icon: '🚪' },
  { id: 'vars', label: '变量', icon: '🚩' },
  { id: 'events', label: '指令手册', icon: '📖' },
  { id: 'scripts', label: '共享脚本', icon: '↪' },
]

const KIND_LABEL: Record<SpriteDef['layout']['kind'], string> = {
  directional: '行走',
  static: '静物',
  loop: '循环',
}
const KIND_ICON: Record<SpriteDef['layout']['kind'], string> = {
  directional: '🚶',
  static: '🪑',
  loop: '🔥',
}

/** 布局类型切换时的默认参数(directional 默认 3 帧/向,loop 默认全帧循环)。 */
function defaultLayout(kind: SpriteLayout['kind'], prev: SpriteLayout): SpriteLayout {
  if (kind === 'directional')
    return { kind, framesPerDir: prev.kind === 'directional' ? prev.framesPerDir : 3 }
  if (kind === 'loop') return { kind, frameCount: prev.kind === 'loop' ? prev.frameCount : 4 }
  return { kind: 'static' }
}

export function DataMode(props: {
  sprites: SpriteDef[]
  skills: SkillDataMap
  items: ItemDataMap
  /** 物品数组(ItemTab 编辑;= session state.items)。 */
  itemList: import('@type-pal/content').ItemData[]
  locale: Locale
  assetBase: AssetBase
  session: EditSession
  enemies: EnemyDef[]
  enemyTeams: EnemyTeamDef[]
  /** 音乐库(音乐页;工程没带 = 空)。 */
  music: MusicDef[]
  /** tileset 注册表 + 上传字节暂存(瓦片集页,W7B)。 */
  tilesets: import('@type-pal/reforge').TilesetDef[]
  tilesetBlobs: Record<string, ArrayBuffer>
  /** 战场表(战场页;D24;工程没带 = 空)。 */
  battleFields: BattleFieldDef[]
  /** 毒定义表(毒页,B10;工程没带 = 空)。 */
  poisons: import('@type-pal/content').PoisonDef[]
  /** 氛围表(氛围页,W6;工程没带 = 空)。 */
  ambiences: import('@type-pal/content').AmbienceDef[]
  /** 店铺表(商店页;工程没带 = 空)。 */
  shops: import('@type-pal/content').ShopDef[]
  /** 技能数组(SkillTab 编辑;= session state.skills)。 */
  skillList: import('@type-pal/content').SkillData[]
  /** 全场景(N5 引用反向索引数据源;入口点场景下拉)。 */
  scenes: SceneDef[]
  /** 工程清单(入口点页编 manifest.entryPoints)。 */
  manifest: import('@type-pal/content').LoadedManifest
  /** 角色定义(入口点 startWorld 队伍选人)。 */
  actors: import('@type-pal/content').ActorDef[]
  /** 引用跳转:变量页/物品页点引用 → 事件模式定位。 */
  onJumpToEvent: (sceneId: string, srcKey: string) => void
  /** N6:从场景调用行跳入指定共享/内部脚本。 */
  focusScriptId?: string
  focusScriptRevision?: number
  /** 当前数据页 + 切换(左栏垂直页列驱动 —— RPGM 数据库范式,2026-07-05 二改)。 */
  tab: DataTab
  onTab: (t: DataTab) => void
}) {
  const {
    sprites,
    assetBase,
    session,
    enemies,
    enemyTeams,
    skills,
    locale,
    itemList,
    music,
    tilesets,
    tilesetBlobs,
    battleFields,
    poisons,
    ambiences,
    shops,
    scenes,
    manifest,
    actors,
    skillList,
    onJumpToEvent,
    focusScriptId,
    focusScriptRevision,
    tab,
    onTab,
  } = props
  // N5:引用反向索引(flag/var/item ← 事件脚本);scenes 变才重算(全量扫描毫秒级)
  const refIndex = useMemo(() => buildRefIndex(scenes), [scenes])
  // 垂直页列(RPGM 数据库左栏范式;塞 outliner 顶部,每子页统一)
  const tabBar = (
    <div className="data-pages">
      {DATA_TABS.map((t) => (
        <button
          type="button"
          key={t.id}
          className={`dpage${tab === t.id ? ' sel' : ''}`}
          onClick={() => onTab(t.id)}
        >
          <span className="ico">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
  const [filter, setFilter] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | SpriteDef['layout']['kind']>('all')
  const [selId, setSelId] = useState(sprites[0]?.id ?? '')
  const [uploadingSprite, setUploadingSprite] = useState(false)

  const shown = useMemo(
    () =>
      sprites.filter(
        (s) =>
          (kindFilter === 'all' || s.layout.kind === kindFilter) &&
          (!filter ||
            s.id.includes(filter) ||
            s.label.includes(filter) ||
            String(s.spriteNum).includes(filter)),
      ),
    [sprites, filter, kindFilter],
  )
  const sprite = sprites.find((s) => s.id === selId) ?? shown[0]

  if (tab === 'enemy') {
    return (
      <EnemyTab
        assetBase={assetBase}
        projectId={manifest.id}
        tilesetBlobs={tilesetBlobs}
        enemies={enemies}
        enemyTeams={enemyTeams}
        skills={Object.values(skills)}
        locale={locale}
        session={session}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'item') {
    return (
      <ItemTab
        items={itemList}
        actors={actors}
        skills={skillList}
        locale={locale}
        assetBase={assetBase}
        session={session}
        itemRefs={refIndex.items}
        onJumpToEvent={onJumpToEvent}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'skill') {
    return (
      <SkillTab
        skills={skillList}
        session={session}
        assetBase={assetBase}
        projectId={manifest.id}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'poison') {
    return <PoisonTab poisons={poisons} items={itemList} session={session} tabBar={tabBar} />
  }

  if (tab === 'ambience') {
    return <AmbienceTab ambiences={ambiences} session={session} tabBar={tabBar} />
  }

  if (tab === 'shop') {
    return <ShopTab shops={shops} items={itemList} session={session} tabBar={tabBar} />
  }

  if (tab === 'tileset') {
    return (
      <TilesetTab
        tilesets={tilesets}
        tilesetBlobs={tilesetBlobs}
        assetBase={assetBase}
        session={session}
        tabBar={tabBar}
      />
    )
  }
  if (tab === 'music') {
    return <MusicTab music={music} musicBase={assetBase.music} session={session} tabBar={tabBar} />
  }

  if (tab === 'cutscene') {
    return <CutsceneTab assetBase={assetBase} tabBar={tabBar} />
  }

  if (tab === 'entrypoint') {
    return (
      <EntryPointTab
        manifest={manifest}
        scenes={scenes}
        actors={actors}
        items={itemList}
        skills={skillList}
        locale={locale}
        session={session}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'battlefield') {
    return (
      <BattleFieldTab
        battleFields={battleFields}
        assetBase={assetBase}
        session={session}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'events') {
    return <EventLibTab tabBar={tabBar} />
  }

  if (tab === 'vars') {
    return <VarsTab refIndex={refIndex} onJumpToEvent={onJumpToEvent} tabBar={tabBar} />
  }

  if (tab === 'scripts') {
    const state = session.getState()
    return (
      <SharedScriptTab
        tabBar={tabBar}
        session={session}
        scriptIndex={state.scriptIndex}
        scriptChunks={state.scriptChunks}
        scenes={scenes}
        locale={locale}
        sprites={sprites}
        actors={actors}
        assetBase={assetBase}
        ownMaps={state.maps}
        tilesets={tilesets}
        tilesetBlobs={tilesetBlobs}
        projectId={manifest.id}
        focusScriptId={focusScriptId}
        focusScriptRevision={focusScriptRevision}
        onJumpToEvent={onJumpToEvent}
      />
    )
  }

  return (
    <>
      {/* 左:数据标签 + 精灵列表 */}
      <div className="outliner data-outliner">
        {tabBar}
        {tab === 'sprite' ? (
          <>
            <div className="pane-h">
              <span className="t">精灵</span>
              <span className="spacer" />
              <button
                type="button"
                className="mini-txt"
                title="上传 PNG 行走图/静物/循环动画,自动贴合工程主色风格"
                onClick={() => setUploadingSprite(true)}
              >
                ＋ 上传精灵
              </button>
              <span className="k">
                {shown.length}/{sprites.length}
              </span>
            </div>
            <input
              className="in"
              placeholder="过滤 id/标签/号…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ margin: '0 8px 6px' }}
            />
            <div className="kind-filter">
              {(['all', 'directional', 'static', 'loop'] as const).map((k) => (
                <button
                  type="button"
                  key={k}
                  className={`kchip${kindFilter === k ? ' on' : ''}`}
                  onClick={() => setKindFilter(k)}
                >
                  {k === 'all' ? '全部' : `${KIND_ICON[k]} ${KIND_LABEL[k]}`}
                </button>
              ))}
            </div>
            <div className="sprite-list">
              {shown.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className={`arow${s.id === selId ? ' sel' : ''}`}
                  onClick={() => setSelId(s.id)}
                >
                  <span className="face">{KIND_ICON[s.layout.kind]}</span>
                  <span className="nm">
                    <b>{s.label}</b>
                    <span>
                      {s.id} · #{s.spriteNum}
                    </span>
                  </span>
                  <span className="abadge npc">{KIND_LABEL[s.layout.kind]}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="insp-empty" style={{ padding: 20 }}>
            {DATA_TABS.find((t) => t.id === tab)?.label} 编辑器 —— 待做（数据模式后续标签）
          </div>
        )}
      </div>

      {/* 中:精灵帧(上传态 → 向导) */}
      <div className="center actor-center">
        {tab === 'sprite' ? (
          uploadingSprite ? (
            <SpriteUploadWizard
              sprites={sprites}
              assetBase={assetBase}
              session={session}
              onDone={(id) => {
                setUploadingSprite(false)
                if (id) setSelId(id)
              }}
            />
          ) : sprite ? (
            <SpriteFrames
              sprite={sprite}
              assetBase={assetBase}
              session={session}
              blob={sprite.path ? tilesetBlobs[sprite.path] : undefined}
            />
          ) : (
            <div className="insp-empty" style={{ padding: 40 }}>
              无精灵
            </div>
          )
        ) : (
          <div className="insp-empty" style={{ padding: 40 }}>
            此标签编辑器待做。数据模式采 RPG Maker 数据库范式:各类游戏数据表标签页组织。
          </div>
        )}
      </div>

      {/* 右:精灵信息 + 布局(编辑后续) */}
      <div className="inspector">
        {tab === 'sprite' && sprite ? (
          <>
            <div className="insp-head">
              <div className="what">选中精灵</div>
              <div className="who">{sprite.label}</div>
            </div>
            <div className="section">
              <h4>登记</h4>
              <div className="field">
                <span className="field-label">id</span>
                <div className="in mono pick">
                  <span>{sprite.id}</span>
                </div>
              </div>
              <div className="field">
                <span className="field-label">精灵号</span>
                <div className="in mono">#{sprite.spriteNum}</div>
              </div>
            </div>
            <div className="section">
              <h4>
                帧布局 <span className="hint2">可改 · 火把/流水标循环</span>
              </h4>
              <div className="field">
                <span className="field-label">类型</span>
                <select
                  className="in"
                  value={sprite.layout.kind}
                  onChange={(e) =>
                    session.dispatch(
                      new UpdateSpriteCommand(sprite.id, {
                        layout: defaultLayout(
                          e.target.value as SpriteLayout['kind'],
                          sprite.layout,
                        ),
                      }),
                    )
                  }
                >
                  <option value="directional">🚶 行走(4向)</option>
                  <option value="static">🪑 静物(单帧)</option>
                  <option value="loop">🔥 循环(自动画)</option>
                </select>
              </div>
              {sprite.layout.kind === 'directional' ? (
                <div className="field">
                  <span className="field-label">每向帧数</span>
                  <input
                    className="in mono"
                    type="number"
                    min={1}
                    value={sprite.layout.framesPerDir}
                    onChange={(e) =>
                      Number.isFinite(e.target.valueAsNumber) &&
                      e.target.valueAsNumber >= 1 &&
                      session.dispatch(
                        new UpdateSpriteCommand(sprite.id, {
                          layout: {
                            kind: 'directional',
                            framesPerDir: Math.floor(e.target.valueAsNumber),
                          },
                        }),
                      )
                    }
                  />
                </div>
              ) : sprite.layout.kind === 'loop' ? (
                <div className="field">
                  <span className="field-label">循环帧数</span>
                  <input
                    className="in mono"
                    type="number"
                    min={1}
                    value={sprite.layout.frameCount}
                    onChange={(e) =>
                      Number.isFinite(e.target.valueAsNumber) &&
                      e.target.valueAsNumber >= 1 &&
                      session.dispatch(
                        new UpdateSpriteCommand(sprite.id, {
                          layout: { kind: 'loop', frameCount: Math.floor(e.target.valueAsNumber) },
                        }),
                      )
                    }
                  />
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="insp-empty">选左侧精灵看它的帧布局。</div>
        )}
      </div>
    </>
  )
}
