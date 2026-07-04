/**
 * 数据模式(RPG Maker 数据库范式)—— 游戏数据表统一入口,标签页组织。
 * 精灵库(座椅/火把/石头 + 角色行走图)/ 技能 / 物品 / 敌人。
 * C1 阶段先落「精灵库」标签(场景 prop 精灵的布局配置);技能/物品/敌人后续。
 */

import type {
  EnemyDef,
  EnemyTeamDef,
  ItemDataMap,
  Locale,
  SkillDataMap,
  SpriteDef,
  SpriteLayout,
} from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { useMemo, useState } from 'react'
import { UpdateSpriteCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { EnemyTab } from './EnemyTab.js'
import { SpriteFrames } from './SpriteFrames.js'

type Tab = 'sprite' | 'skill' | 'item' | 'enemy'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'sprite', label: '精灵库', icon: '🖼' },
  { id: 'skill', label: '技能', icon: '✨' },
  { id: 'item', label: '物品', icon: '🎒' },
  { id: 'enemy', label: '敌人', icon: '👹' },
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
  locale: Locale
  assetBase: AssetBase
  session: EditSession
  enemies: EnemyDef[]
  enemyTeams: EnemyTeamDef[]
}) {
  const { sprites, assetBase, session, enemies, enemyTeams, skills, locale } = props
  const [tab, setTab] = useState<Tab>('sprite')
  const [filter, setFilter] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | SpriteDef['layout']['kind']>('all')
  const [selId, setSelId] = useState(sprites[0]?.id ?? '')

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

  const tabBar = (
    <div className="data-tabs">
      {TABS.map((t) => (
        <button
          type="button"
          key={t.id}
          className={`dtab${tab === t.id ? ' sel' : ''}`}
          onClick={() => setTab(t.id)}
        >
          <span>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  )

  if (tab === 'enemy') {
    return (
      <EnemyTab
        enemies={enemies}
        enemyTeams={enemyTeams}
        skills={Object.values(skills)}
        locale={locale}
        session={session}
        tabBar={tabBar}
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
            {TABS.find((t) => t.id === tab)?.label} 编辑器 —— 待做（数据模式后续标签）
          </div>
        )}
      </div>

      {/* 中:精灵帧 */}
      <div className="center actor-center">
        {tab === 'sprite' ? (
          sprite ? (
            <SpriteFrames sprite={sprite} assetBase={assetBase} session={session} />
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
                <label>id</label>
                <div className="in mono pick">
                  <span>{sprite.id}</span>
                </div>
              </div>
              <div className="field">
                <label>精灵号</label>
                <div className="in mono">#{sprite.spriteNum}</div>
              </div>
            </div>
            <div className="section">
              <h4>
                帧布局 <span className="hint2">可改 · 火把/流水标循环</span>
              </h4>
              <div className="field">
                <label>类型</label>
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
                  <label>每向帧数</label>
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
                  <label>循环帧数</label>
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
