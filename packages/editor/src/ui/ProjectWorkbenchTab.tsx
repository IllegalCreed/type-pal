/**
 * manifest-centered 工程工作台(X7-1)。
 *
 * 四个子页共享同一 manifest/Command 真源：概览、全局资源与启动、入口点与开局、问题与高级。
 * 缺省 entryPoints 只在这里解析为 UI 兼容入口，只有用户真正编辑入口表时才物化保存。
 */
import type {
  ActorDef,
  AssetCatalogV1,
  AssetRole,
  EntryPoint,
  ItemData,
  Locale,
  SceneDef,
  SkillData,
  StartWorld,
} from '@type-pal/content'
import {
  ASSET_ROLE_KINDS,
  ASSET_ROLES,
  AUDIO_ASSET_ROLES,
  lookupText,
  validateAssetCatalog,
} from '@type-pal/content'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  RenameProjectCommand,
  SetEntryPointsCommand,
  UpdateEntrySceneCommand,
  UpdateManifestAssetRolesCommand,
  UpdateStartWorldCommand,
} from '../core/commands.js'
import type { EditorState, EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  collectProjectIssues,
  getRepairableEntryIndexes,
  type ManifestLike,
  type ProjectIssue,
  resolveProjectEntryPoints,
} from '../core/project-diagnostics.js'
import type { EditorLocation } from './editor-navigation.js'
import { SoundPicker } from './SoundPicker.js'

export type ProjectWorkbenchPage = 'overview' | 'startup' | 'entrypoint' | 'advanced'

export interface ProjectWorkbenchTabProps {
  page: ProjectWorkbenchPage
  manifest: ManifestLike
  scenes: SceneDef[]
  actors: ActorDef[]
  items: ItemData[]
  skills: SkillData[]
  locale: Locale
  assetCatalog: AssetCatalogV1
  session: EditSession
  editorState: EditorState
  assetReader: EditorAssetReader
  tabBar?: ReactNode
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenLocation?: (location: EditorLocation) => void
}

const ROLE_LABELS: Record<AssetRole, string> = {
  'audio.midiSoundfont': 'MIDI 音色库',
  'audio.defaultBattleMusic': '默认战斗音乐',
  // SDL 把这个 role 作为不可逃/特殊战的胜利结算曲选择；升级判断随后发生，
  // 升级屏本身不另播曲，不能把这个 role 误标成独立的 levelUp 音乐。
  // 这里不展示 PAL 迁移时的默认编号，作者可以自由绑定任意 music AssetId。
  'audio.bossVictoryMusic': '特殊战胜利结算音乐',
  'audio.normalVictoryMusic': '普通胜利音乐',
  'audio.openingMenuMusic': '标题菜单音乐',
  'audio.battleItemUseSound': '战斗物品使用音效',
  'audio.battleCoopCastSound': '合击起手音效',
  'audio.battleEscapeSound': '逃跑音效',
  'audio.battleEnemyTransformSound': '敌人变身音效',
  'video.startupTrademark': '启动商标视频',
  'video.startupSplash': '启动开场视频',
  'visual.standardColorTable': '标准色表',
}

const STARTUP_ROLES: AssetRole[] = [
  'video.startupTrademark',
  'video.startupSplash',
  'audio.openingMenuMusic',
]

export const PROJECT_ASSET_ROLE_GROUPS: readonly {
  id: string
  title: string
  description: string
  roles: readonly AssetRole[]
}[] = [
  {
    id: 'startup',
    title: '启动与标题菜单',
    description: '启动商标、开场视频和标题菜单音乐。',
    roles: STARTUP_ROLES,
  },
  {
    id: 'battle',
    title: '战斗音乐',
    description: '普通战斗、特殊战胜利结算（升级屏沿用）和普通胜利的全局默认音乐。',
    roles: ['audio.defaultBattleMusic', 'audio.bossVictoryMusic', 'audio.normalVictoryMusic'],
  },
  {
    id: 'audio-base',
    title: '音频基础',
    description: 'MIDI 播放使用的工程级 SoundFont。',
    roles: ['audio.midiSoundfont'],
  },
  {
    id: 'battle-sfx',
    title: '战斗音效',
    description: '物品使用、合击、逃跑与敌人变身的全局回退音效。',
    roles: [
      'audio.battleItemUseSound',
      'audio.battleCoopCastSound',
      'audio.battleEscapeSound',
      'audio.battleEnemyTransformSound',
    ],
  },
  {
    id: 'visual-base',
    title: '视觉基础',
    description: '工程标准色彩转换使用的色表。',
    roles: ['visual.standardColorTable'],
  },
]

function issueTarget(issue: ProjectIssue): EditorLocation | undefined {
  if (!issue.target) return undefined
  return {
    module: issue.target.module,
    subpage: issue.target.page,
    ...(issue.target.objectId ? { objectId: issue.target.objectId } : {}),
    ...(issue.target.domain ? { domain: issue.target.domain } : {}),
    ...(issue.target.view ? { view: issue.target.view } : {}),
  } as EditorLocation
}

const ISSUE_PAGE_SIZE = 80
const COMPACT_ISSUE_LIMIT = 30

export function IssueList(props: {
  issues: ProjectIssue[]
  onOpenLocation?: (location: EditorLocation) => void
  compact?: boolean
  onViewAll?: () => void
}) {
  const { issues, onOpenLocation, compact = false, onViewAll } = props
  const initialLimit = compact ? COMPACT_ISSUE_LIMIT : ISSUE_PAGE_SIZE
  const [visibleLimit, setVisibleLimit] = useState(initialLimit)
  useEffect(() => setVisibleLimit(initialLimit), [initialLimit])
  const visibleIssues = issues.slice(0, visibleLimit)
  const hiddenCount = issues.length - visibleIssues.length
  if (issues.length === 0)
    return <div className="project-empty project-ok">✓ 未发现工程配置问题</div>
  return (
    <div className={`project-issues${compact ? ' compact' : ''}`}>
      {visibleIssues.map((issue) => {
        const target = issueTarget(issue)
        return (
          <div
            className={`project-issue ${issue.severity}`}
            key={`${issue.code}:${issue.path}:${issue.message}`}
          >
            <span className="project-issue-icon">{issue.severity === 'error' ? '!' : '·'}</span>
            <span className="project-issue-copy">
              <span>{issue.message}</span>
              <code>{issue.path}</code>
            </span>
            {target && onOpenLocation ? (
              <button type="button" className="mini-txt" onClick={() => onOpenLocation(target)}>
                跳转
              </button>
            ) : null}
          </div>
        )
      })}
      {issues.length > initialLimit ? (
        <div className="project-issue-more">
          <span role="status" aria-live="polite">
            {hiddenCount > 0
              ? `已显示 ${visibleIssues.length} / ${issues.length} 项`
              : `已显示全部 ${issues.length} 项`}
          </span>
          <span className="project-issue-more-actions">
            {compact && hiddenCount > 0 && onViewAll ? (
              <button type="button" className="mini-txt" onClick={onViewAll}>
                查看全部 {issues.length} 项
              </button>
            ) : null}
            {hiddenCount > 0 && (!compact || !onViewAll) ? (
              <button
                type="button"
                className="mini-txt"
                onClick={() => setVisibleLimit((current) => current + ISSUE_PAGE_SIZE)}
              >
                继续显示 {Math.min(ISSUE_PAGE_SIZE, hiddenCount)} 项
              </button>
            ) : null}
            {!compact && hiddenCount > 0 ? (
              <button
                type="button"
                className="mini-txt"
                onClick={() => setVisibleLimit(issues.length)}
              >
                显示全部
              </button>
            ) : null}
            {!compact && visibleIssues.length > initialLimit ? (
              <button
                type="button"
                className="mini-txt"
                onClick={() => setVisibleLimit(initialLimit)}
              >
                收起至前 {initialLimit} 项
              </button>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function PageHint({ children }: { children: ReactNode }) {
  return <div className="project-hint">{children}</div>
}

function RoleBindings(props: {
  manifest: ManifestLike
  assetCatalog: AssetCatalogV1
  session: EditSession
  assetReader: EditorAssetReader
  roles?: readonly AssetRole[]
  onOpenLocation?: (location: EditorLocation) => void
}) {
  const {
    manifest,
    assetCatalog,
    session,
    assetReader,
    roles = ASSET_ROLES,
    onOpenLocation,
  } = props
  const hasAudioCatalog = Object.values(assetCatalog.assets).some(
    (record) => record.kind === 'music' || record.kind === 'soundfont',
  )
  return (
    <div className="project-role-list">
      {roles.map((role) => {
        const expected = ASSET_ROLE_KINDS[role]
        const required = hasAudioCatalog && role in AUDIO_ASSET_ROLES
        const current = manifest.assets.roles[role] ?? ''
        const candidates = Object.entries(assetCatalog.assets)
          .filter(([, record]) => record.kind === expected)
          .sort(([left], [right]) => left.localeCompare(right))
        const currentRecord = current ? assetCatalog.assets[current] : undefined
        const targetSubpage =
          expected === 'music'
            ? 'music'
            : expected === 'sound'
              ? 'sound'
              : expected === 'video'
                ? 'cutscene'
                : undefined
        const libraryLabel =
          targetSubpage === 'music' ? '音乐库' : targetSubpage === 'sound' ? '音效库' : '过场素材库'
        const bindingError = current
          ? !currentRecord
            ? `AssetId ${current} 不存在`
            : currentRecord.kind !== expected
              ? `类型错误：当前是 ${currentRecord.kind}，这里需要 ${expected}`
              : undefined
          : undefined
        const validRecord = currentRecord?.kind === expected ? currentRecord : undefined
        const roleHint =
          role === 'audio.bossVictoryMusic'
            ? '不可逃战胜利后播放；若随后升级，升级屏继续沿用此曲。可自由绑定音乐资源。'
            : undefined
        return (
          <div className="project-role-row" key={role}>
            <span className="project-role-label">
              <strong>{ROLE_LABELS[role]}</strong>
              <small>
                {role} · 期望 {expected} · {required ? '必选' : '可选'}
              </small>
              {roleHint ? <small className="project-role-hint">{roleHint}</small> : null}
            </span>
            <span className="project-role-control">
              {expected === 'sound' ? (
                <SoundPicker
                  value={current || undefined}
                  onChange={(asset) =>
                    session.dispatch(new UpdateManifestAssetRolesCommand({ [role]: asset }))
                  }
                  catalog={assetCatalog}
                  reader={assetReader}
                  allowUnset
                  onOpenAsset={(asset) =>
                    onOpenLocation?.({ module: 'asset', subpage: 'sound', objectId: asset })
                  }
                />
              ) : (
                <select
                  className="in"
                  value={current}
                  onChange={(event) =>
                    session.dispatch(
                      new UpdateManifestAssetRolesCommand({
                        [role]: event.target.value || undefined,
                      }),
                    )
                  }
                >
                  <option value="">未绑定</option>
                  {current && !currentRecord ? (
                    <option value={current}>{current}（缺失）</option>
                  ) : null}
                  {currentRecord && currentRecord.kind !== expected ? (
                    <option value={current}>
                      {current}（类型 {currentRecord.kind}）
                    </option>
                  ) : null}
                  {candidates.map(([id, record]) => (
                    <option value={id} key={id}>
                      {record.label ? `${record.label} · ` : ''}
                      {id}
                    </option>
                  ))}
                </select>
              )}
              {bindingError ? (
                <span className="project-role-error">{bindingError}</span>
              ) : validRecord ? (
                <span className="project-role-preview" title={validRecord.path}>
                  {validRecord.kind} · {validRecord.path}
                </span>
              ) : null}
              {expected !== 'sound' && onOpenLocation && targetSubpage ? (
                <button
                  type="button"
                  className="btn"
                  title={validRecord ? `查看资源 ${current}` : `打开${libraryLabel}`}
                  onClick={() =>
                    onOpenLocation({
                      module: 'asset',
                      subpage: targetSubpage,
                      ...(validRecord ? { objectId: current } : {}),
                    })
                  }
                >
                  {validRecord
                    ? '预览 ↗'
                    : candidates.length
                      ? `打开${libraryLabel} ↗`
                      : `前往${libraryLabel}导入 ↗`}
                </button>
              ) : (
                <span className="project-role-no-preview">
                  当前没有 {expected} 专用资源页；这里只能绑定 catalog 中已有项。
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function numberOrZero(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0
}

export function StartWorldFields(props: {
  value: StartWorld
  actors: ActorDef[]
  items: ItemData[]
  skills: SkillData[]
  locale: Locale
  readOnly?: boolean
  onChange: (next: StartWorld) => void
}) {
  const { value, actors, items, skills, locale, readOnly = false, onChange } = props
  const [newResourceKey, setNewResourceKey] = useState('')
  const patch = (next: Partial<StartWorld>): void => onChange({ ...value, ...next })
  const partyActors = actors.filter((actor) => actor.battler)
  const seedActorIds = Array.from(new Set([...value.party, ...Object.keys(value.seedStats ?? {})]))
  const skillActorIds = Array.from(new Set([...value.party, ...Object.keys(value.learnedSkills)]))
  const inventory = value.inventory ?? []
  const addableItems = items.filter((item) => !inventory.some((entry) => entry.itemId === item.id))
  const toggleParty = (id: string): void => {
    const party = value.party.includes(id)
      ? value.party.filter((candidate) => candidate !== id)
      : [...value.party, id]
    patch({ party })
  }
  const moveParty = (id: string, delta: -1 | 1): void => {
    const index = value.party.indexOf(id)
    const target = index + delta
    if (index < 0 || target < 0 || target >= value.party.length) return
    const party = [...value.party]
    ;[party[index], party[target]] = [party[target]!, party[index]!]
    patch({ party })
  }
  const setSkills = (actorId: string, next: string[]): void => {
    const learnedSkills = { ...value.learnedSkills }
    if (next.length) learnedSkills[actorId] = next
    else delete learnedSkills[actorId]
    patch({ learnedSkills })
  }
  const patchSeed = (actorId: string, key: 'hp' | 'mp', raw: string): void => {
    const seedStats = { ...(value.seedStats ?? {}) }
    const stats = { ...(seedStats[actorId] ?? {}) }
    if (raw.trim() === '') delete stats[key]
    else stats[key] = numberOrZero(raw)
    if (Object.keys(stats).length) seedStats[actorId] = stats
    else delete seedStats[actorId]
    patch({ seedStats: Object.keys(seedStats).length ? seedStats : undefined })
  }
  const patchResource = (key: string, nextValue: number | undefined): void => {
    const resources = { ...(value.resources ?? {}) }
    if (nextValue === undefined) delete resources[key]
    else resources[key] = Math.max(0, Math.floor(nextValue))
    patch({ resources: Object.keys(resources).length ? resources : undefined })
  }
  const addResource = (): void => {
    const key = newResourceKey.trim()
    if (!key || key === 'collectValue' || Object.hasOwn(value.resources ?? {}, key)) return
    patchResource(key, 0)
    setNewResourceKey('')
  }

  return (
    <div className="project-form-stack">
      <div className="project-field-grid">
        <label className="field">
          <span className="field-label">金钱</span>
          <input
            className="in"
            type="number"
            min={0}
            value={value.money}
            disabled={readOnly}
            onChange={(event) => patch({ money: numberOrZero(event.target.value) })}
          />
        </label>
      </div>

      <section className="project-card">
        <h4>
          队伍顺序 <span className="b2">（顺序即初始站位）</span>
        </h4>
        <div className="project-party-order">
          {value.party.map((actorId, index) => {
            const actor = actors.find((candidate) => candidate.id === actorId)
            return (
              <div className="project-party-row" key={`${actorId}:${index}`}>
                <span className="project-party-index">{index + 1}</span>
                <span className="project-party-name">
                  {actor ? lookupText(actor.name, locale) : `${actorId}（缺失）`}
                </span>
                <code>{actorId}</code>
                <button
                  type="button"
                  className="btn project-party-move"
                  disabled={readOnly || index === 0}
                  onClick={() => moveParty(actorId, -1)}
                  aria-label="上移队员"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn project-party-move"
                  disabled={readOnly || index === value.party.length - 1}
                  onClick={() => moveParty(actorId, 1)}
                  aria-label="下移队员"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn project-party-remove"
                  disabled={readOnly}
                  onClick={() => toggleParty(actorId)}
                >
                  移出
                </button>
              </div>
            )
          })}
          {value.party.length === 0 ? <PageHint>当前没有队员；请从下方加入。</PageHint> : null}
        </div>
        <div className="project-check-grid">
          {partyActors
            .filter((actor) => !value.party.includes(actor.id))
            .map((actor) => (
              <label key={actor.id}>
                <input
                  type="checkbox"
                  checked={false}
                  disabled={readOnly}
                  onChange={() => toggleParty(actor.id)}
                />{' '}
                加入 {lookupText(actor.name, locale)} <code>{actor.id}</code>
              </label>
            ))}
        </div>
        {partyActors.length === 0 ? <PageHint>当前工程没有可参战角色。</PageHint> : null}
      </section>

      <section className="project-card">
        <h4>初始道具</h4>
        <div className="project-list-stack">
          {inventory.map((row, index) => (
            <div className="project-inline-row" key={`${row.itemId}:${index}`}>
              <select
                className="in"
                value={row.itemId}
                disabled={readOnly}
                onChange={(event) =>
                  patch({
                    inventory: inventory.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, itemId: event.target.value } : item,
                    ),
                  })
                }
              >
                {!items.some((item) => item.id === row.itemId) ? (
                  <option value={row.itemId}>{row.itemId}（缺失）</option>
                ) : null}
                {items
                  .filter(
                    (item) =>
                      item.id === row.itemId ||
                      !inventory.some(
                        (entry, itemIndex) => itemIndex !== index && entry.itemId === item.id,
                      ),
                  )
                  .map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name} · {item.id}
                    </option>
                  ))}
              </select>
              <input
                className="in project-count"
                type="number"
                min={1}
                value={row.count}
                disabled={readOnly}
                onChange={(event) =>
                  patch({
                    inventory: inventory.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, count: Math.max(1, numberOrZero(event.target.value)) }
                        : item,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="btn"
                disabled={readOnly}
                onClick={() =>
                  patch({ inventory: inventory.filter((_, itemIndex) => itemIndex !== index) })
                }
              >
                删除
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn"
            disabled={readOnly || addableItems.length === 0}
            onClick={() => {
              const itemId = addableItems[0]?.id
              if (itemId) patch({ inventory: [...inventory, { itemId, count: 1 }] })
            }}
          >
            ＋ 添加道具
          </button>
          {inventory.length === 0 ? <PageHint>无初始道具。</PageHint> : null}
        </div>
      </section>

      <section className="project-card">
        <h4>初始技能</h4>
        {skillActorIds.map((actorId) => {
          const actor = actors.find((candidate) => candidate.id === actorId)
          const actorSkills = value.learnedSkills[actorId] ?? []
          const addableSkills = skills.filter((skill) => !actorSkills.includes(skill.id))
          const inParty = value.party.includes(actorId)
          return (
            <div className="project-skill-group" key={actorId}>
              <div className="project-subtitle">
                {actor ? lookupText(actor.name, locale) : actorId} <code>{actorId}</code>
                {!inParty ? <span className="project-badge warning">不在初始队伍</span> : null}
              </div>
              {actorSkills.map((skillId, index) => (
                <div className="project-inline-row" key={`${skillId}:${index}`}>
                  <select
                    className="in"
                    value={skillId}
                    disabled={readOnly}
                    onChange={(event) =>
                      setSkills(
                        actorId,
                        actorSkills.map((id, skillIndex) =>
                          skillIndex === index ? event.target.value : id,
                        ),
                      )
                    }
                  >
                    {!skills.some((skill) => skill.id === skillId) ? (
                      <option value={skillId}>{skillId}（缺失）</option>
                    ) : null}
                    {skills
                      .filter(
                        (skill) =>
                          skill.id === skillId ||
                          !actorSkills.some(
                            (id, skillIndex) => skillIndex !== index && id === skill.id,
                          ),
                      )
                      .map((skill) => (
                        <option value={skill.id} key={skill.id}>
                          {skill.name} · {skill.id}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="btn"
                    disabled={readOnly}
                    onClick={() =>
                      setSkills(
                        actorId,
                        actorSkills.filter((_, skillIndex) => skillIndex !== index),
                      )
                    }
                  >
                    删除
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn"
                disabled={readOnly || addableSkills.length === 0}
                onClick={() => {
                  const skillId = addableSkills[0]?.id
                  if (skillId) setSkills(actorId, [...actorSkills, skillId])
                }}
              >
                ＋ 添加技能
              </button>
              {actorSkills.length === 0 ? <PageHint>未配置初始技能。</PageHint> : null}
            </div>
          )
        })}
        {skillActorIds.length === 0 ? (
          <PageHint>先选择队伍成员，再配置其初始技能。</PageHint>
        ) : null}
      </section>

      <section className="project-card">
        <h4>
          初始世界资源 <span className="b2">（物品炼化等机制按稳定键读写）</span>
        </h4>
        <div className="project-list-stack">
          {Object.entries(value.resources ?? {})
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, initialValue]) => (
              <div className="project-inline-row project-resource-row" key={key}>
                <code>{key}</code>
                <label>
                  初始值{' '}
                  <input
                    className="in project-count"
                    type="number"
                    min={0}
                    value={initialValue}
                    disabled={readOnly}
                    aria-label={`${key} 初始值`}
                    onChange={(event) => patchResource(key, numberOrZero(event.target.value))}
                  />
                </label>
                <button
                  type="button"
                  className="btn"
                  disabled={readOnly}
                  onClick={() => patchResource(key, undefined)}
                >
                  删除
                </button>
              </div>
            ))}
          <div className="project-inline-row project-resource-create">
            <input
              className="in mono"
              value={newResourceKey}
              disabled={readOnly}
              aria-label="新世界资源稳定键"
              placeholder="新资源键，如 alchemyEnergy"
              onChange={(event) => setNewResourceKey(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addResource()
                }
              }}
            />
            <button
              type="button"
              className="btn"
              disabled={
                readOnly ||
                !newResourceKey.trim() ||
                newResourceKey.trim() === 'collectValue' ||
                Object.hasOwn(value.resources ?? {}, newResourceKey.trim())
              }
              onClick={addResource}
            >
              ＋ 添加资源
            </button>
          </div>
          <PageHint>
            collectValue 是内建收妖值，不在此处重复定义。独立入口可以保存自己的资源初值。
          </PageHint>
        </div>
      </section>

      <section className="project-card">
        <h4>
          seedStats <span className="b2">（可选，覆盖角色初始 HP/MP）</span>
        </h4>
        {seedActorIds.map((actorId) => {
          const actor = actors.find((candidate) => candidate.id === actorId)
          const stats = value.seedStats?.[actorId] ?? {}
          return (
            <div className="project-inline-row project-seed-row" key={actorId}>
              <span className="project-subtitle">
                {actor ? lookupText(actor.name, locale) : actorId}
              </span>
              <code>{actorId}</code>
              <label>
                HP{' '}
                <input
                  className="in project-count"
                  type="number"
                  min={0}
                  value={stats.hp ?? ''}
                  disabled={readOnly}
                  onChange={(event) => patchSeed(actorId, 'hp', event.target.value)}
                />
              </label>
              <label>
                MP{' '}
                <input
                  className="in project-count"
                  type="number"
                  min={0}
                  value={stats.mp ?? ''}
                  disabled={readOnly}
                  onChange={(event) => patchSeed(actorId, 'mp', event.target.value)}
                />
              </label>
            </div>
          )
        })}
        {seedActorIds.length === 0 ? (
          <PageHint>未设置 seedStats。它不会改变角色定义，只是开局覆盖。</PageHint>
        ) : null}
      </section>
    </div>
  )
}

function ProjectIssuesAside(props: {
  issues: ProjectIssue[]
  onOpenLocation?: (location: EditorLocation) => void
}) {
  return (
    <>
      <div className="insp-head">
        <div className="what">工程诊断</div>
        <div className="who">
          {props.issues.length ? `${props.issues.length} 项需要处理` : '配置健康'}
        </div>
      </div>
      <div className="section">
        <h4>问题与跳转</h4>
        <IssueList
          issues={props.issues}
          onOpenLocation={props.onOpenLocation}
          compact
          onViewAll={
            props.onOpenLocation
              ? () =>
                  props.onOpenLocation?.({
                    module: 'project',
                    subpage: 'advanced',
                  } as EditorLocation)
              : undefined
          }
        />
      </div>
    </>
  )
}

function EntryPointEditor(props: ProjectWorkbenchTabProps & { issues: ProjectIssue[] }) {
  const {
    manifest,
    scenes,
    actors,
    items,
    skills,
    locale,
    assetCatalog,
    session,
    tabBar,
    focusObjectId,
    onObjectFocus,
    onOpenLocation,
    issues,
  } = props
  const entryPoints = useMemo(() => resolveProjectEntryPoints(manifest), [manifest])
  const identityIssues = issues.filter((issue) =>
    ['blank-entry-id', 'noncanonical-entry-id', 'duplicate-entry-id'].includes(issue.code),
  )
  const repairableEntryIndexes = getRepairableEntryIndexes(entryPoints)
  const [repairIds, setRepairIds] = useState(() => entryPoints.map((entry) => entry.id))
  useEffect(() => {
    setRepairIds(entryPoints.map((entry) => entry.id))
  }, [entryPoints])
  const [selectedId, setSelectedId] = useState<string | undefined>(focusObjectId)
  useEffect(() => {
    if (focusObjectId === undefined) {
      setSelectedId(undefined)
      return
    }
    if (entryPoints.some((entry) => entry.id === focusObjectId)) setSelectedId(focusObjectId)
  }, [entryPoints, focusObjectId])
  const selected = selectedId ? entryPoints.find((entry) => entry.id === selectedId) : undefined
  const sceneIds = useMemo(() => scenes.map((scene) => scene.id).sort(), [scenes])
  const videoAssets = useMemo(
    () =>
      Object.entries(assetCatalog.assets)
        .filter(([, asset]) => asset.kind === 'video')
        .sort(([left], [right]) => left.localeCompare(right)),
    [assetCatalog],
  )
  const commit = (next: EntryPoint[]): void => {
    session.dispatch(new SetEntryPointsCommand(next))
  }
  const normalizedRepairIds = repairIds.map((id) => id.trim())
  const repairReady =
    normalizedRepairIds.length === entryPoints.length &&
    normalizedRepairIds.every(Boolean) &&
    new Set(normalizedRepairIds).size === normalizedRepairIds.length &&
    normalizedRepairIds.every(
      (id, index) => repairableEntryIndexes.has(index) || id === entryPoints[index]?.id,
    )
  if (identityIssues.length) {
    return (
      <>
        <div className="outliner project-outliner">
          {tabBar}
          <div className="pane-h">
            <span className="t">入口与开局</span>
            <span className="spacer" />
            <span className="k">修复模式</span>
          </div>
          <PageHint>入口 id 损坏时不再按该 id 选中或深链，先修复稳定身份再继续编辑。</PageHint>
          <IssueList issues={identityIssues} />
        </div>
        <div className="canvas-wrap data-body project-center">
          <div className="project-scroll">
            <div className="project-title-row">
              <div>
                <h2>修复入口 id</h2>
                <span className="project-copy">id 必须非空、无首尾空格且彼此唯一</span>
              </div>
              <span className="project-badge warning">阻止保存</span>
            </div>
            <section className="project-card">
              <div className="project-form-stack">
                {entryPoints.map((entry, index) => (
                  <label className="field" key={`repair:${index}`}>
                    <span className="field-label">入口 {index + 1}</span>
                    <input
                      className="in"
                      aria-label={`入口 ${index + 1} id`}
                      value={repairIds[index] ?? ''}
                      disabled={!repairableEntryIndexes.has(index)}
                      onChange={(event) =>
                        setRepairIds((current) =>
                          current.map((id, itemIndex) =>
                            itemIndex === index ? event.target.value : id,
                          ),
                        )
                      }
                    />
                    <span className="project-copy">
                      {entry.label || '未命名入口'} ·{' '}
                      {repairableEntryIndexes.has(index) ? '需要修复' : '稳定 id（只读）'}
                    </span>
                  </label>
                ))}
              </div>
              <div className="project-button-row">
                <button
                  type="button"
                  className="btn"
                  disabled={!repairReady}
                  onClick={() => {
                    commit(
                      entryPoints.map((entry, index) => ({
                        ...entry,
                        id: normalizedRepairIds[index]!,
                      })),
                    )
                    setSelectedId(undefined)
                    onObjectFocus?.(undefined)
                  }}
                >
                  应用 id 修复
                </button>
              </div>
              <PageHint>应用时会自动去掉首尾空格；普通状态下 id 继续只读。</PageHint>
            </section>
          </div>
        </div>
        <div className="inspector project-inspector">
          <ProjectIssuesAside issues={issues} onOpenLocation={onOpenLocation} />
        </div>
      </>
    )
  }
  const patchEntry = (id: string, patch: Partial<EntryPoint>): void =>
    commit(entryPoints.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  const chooseDefault = (): void => {
    setSelectedId(undefined)
    onObjectFocus?.(undefined)
  }
  const chooseEntry = (id: string): void => {
    setSelectedId(id)
    onObjectFocus?.(id)
  }
  const newEntryId = (): string => {
    let number = 1
    let id = `entry-${number}`
    const ids = new Set(entryPoints.map((entry) => entry.id))
    while (ids.has(id)) id = `entry-${++number}`
    return id
  }
  const addEntry = (): void => {
    const id = newEntryId()
    commit([...entryPoints, { id, label: '新入口', scene: manifest.entryScene }])
    chooseEntry(id)
  }
  const cloneEntry = (): void => {
    const id = newEntryId()
    const source: EntryPoint = selected
      ? structuredClone(selected)
      : {
          id,
          label: '默认入口副本',
          scene: manifest.entryScene,
          startWorld: structuredClone(manifest.startWorld),
        }
    commit([
      ...entryPoints,
      { ...source, id, label: selected ? `${selected.label} 副本` : source.label },
    ])
    chooseEntry(id)
  }
  const removeEntry = (): void => {
    if (!selected || entryPoints.length <= 1) return
    const remaining = entryPoints.filter((entry) => entry.id !== selected.id)
    commit(remaining)
    chooseEntry(remaining[0]!.id)
  }
  const updateOverride = (next: StartWorld): void => {
    if (selected) patchEntry(selected.id, { startWorld: next })
  }
  const updateDefault = (next: StartWorld): void => {
    session.dispatch(new UpdateStartWorldCommand(next))
  }

  return (
    <>
      <div className="outliner project-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">入口点与开局</span>
          <span className="spacer" />
          <span className="k">1 默认 + {entryPoints.length} 菜单</span>
        </div>
        <PageHint>
          每个入口都在这里对应一套实际开局设置；菜单入口可以跟随默认入口，也可以保存本入口自己的整套设置。
        </PageHint>
        <div className="project-entry-list">
          <button
            type="button"
            className={`node${selectedId === undefined ? ' sel' : ''}`}
            onClick={chooseDefault}
          >
            <span className="ico">🧭</span>
            <span className="node-label">默认入口</span>
            <code>{manifest.entryScene}</code>
          </button>
          <div className="project-entry-divider">标题菜单入口（各自带开局）</div>
          {entryPoints.map((entry) => (
            <button
              type="button"
              className={`node${entry.id === selected?.id ? ' sel' : ''}`}
              key={entry.id}
              onClick={() => chooseEntry(entry.id)}
            >
              <span className="ico">🚪</span>
              <span className="node-label">{entry.label}</span>
              <code>{entry.id}</code>
            </button>
          ))}
        </div>
        <div className="project-button-row">
          <button type="button" className="btn" onClick={addEntry}>
            ＋ 新增
          </button>
          <button type="button" className="btn" onClick={cloneEntry}>
            复制当前
          </button>
          <button
            type="button"
            className="btn"
            onClick={removeEntry}
            disabled={!selected || entryPoints.length <= 1}
          >
            删除入口
          </button>
        </div>
      </div>
      <div className="canvas-wrap data-body project-center">
        <div className="project-scroll">
          {selected ? (
            <>
              <div className="project-title-row">
                <div>
                  <h2>{selected.label}</h2>
                  <code>{selected.id}</code>
                </div>
                <span className="project-badge">菜单入口 · 稳定 id</span>
              </div>
              <section className="project-card">
                <h4>入口信息</h4>
                <label className="field">
                  <span className="field-label">标签</span>
                  <input
                    className="in"
                    value={selected.label}
                    onChange={(event) => patchEntry(selected.id, { label: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">起始场景</span>
                  <select
                    className="in"
                    value={selected.scene}
                    onChange={(event) => patchEntry(selected.id, { scene: event.target.value })}
                  >
                    {!sceneIds.includes(selected.scene) ? (
                      <option value={selected.scene}>{selected.scene}（缺失）</option>
                    ) : null}
                    {sceneIds.map((id) => (
                      <option value={id} key={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">入口视频</span>
                  <span className="project-entry-video-control">
                    <select
                      className="in"
                      value={selected.introVideo ?? ''}
                      onChange={(event) =>
                        patchEntry(selected.id, { introVideo: event.target.value || undefined })
                      }
                    >
                      <option value="">无（由场景脚本负责叙事）</option>
                      {selected.introVideo && !assetCatalog.assets[selected.introVideo] ? (
                        <option value={selected.introVideo}>{selected.introVideo}（缺失）</option>
                      ) : null}
                      {selected.introVideo &&
                      assetCatalog.assets[selected.introVideo]?.kind !== 'video' ? (
                        <option value={selected.introVideo}>
                          {selected.introVideo}（类型{' '}
                          {assetCatalog.assets[selected.introVideo]?.kind}）
                        </option>
                      ) : null}
                      {videoAssets.map(([id, asset]) => (
                        <option value={id} key={id}>
                          {asset.label ? `${asset.label} · ` : ''}
                          {id}
                        </option>
                      ))}
                    </select>
                    {selected.introVideo && onOpenLocation ? (
                      <button
                        type="button"
                        className="btn"
                        title={`查看入口视频 ${selected.introVideo}`}
                        onClick={() =>
                          onOpenLocation({
                            module: 'asset',
                            subpage: 'cutscene',
                            objectId: selected.introVideo!,
                          })
                        }
                      >
                        预览 ↗
                      </button>
                    ) : null}
                  </span>
                </label>
              </section>
              <section className="project-card">
                <div className="project-title-row">
                  <h4>这个入口的开局设置</h4>
                  <span className={`project-badge ${selected.startWorld ? 'custom' : ''}`}>
                    {selected.startWorld ? '本入口独立设置' : '跟随默认入口'}
                  </span>
                </div>
                <p className="project-copy">
                  下方始终展示这个入口实际会使用的完整开局。跟随默认时，这些控件只读，默认入口的修改会同步影响它；
                  需要不同队伍或道具时，再复制一份作为本入口独立设置。
                </p>
                <div className="project-button-row">
                  {!selected.startWorld ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        patchEntry(selected.id, {
                          startWorld: structuredClone(manifest.startWorld),
                        })
                      }
                    >
                      复制默认为本入口设置
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => patchEntry(selected.id, { startWorld: undefined })}
                    >
                      改为跟随默认入口
                    </button>
                  )}
                </div>
                <StartWorldFields
                  value={selected.startWorld ?? manifest.startWorld}
                  actors={actors}
                  items={items}
                  skills={skills}
                  locale={locale}
                  readOnly={!selected.startWorld}
                  onChange={updateOverride}
                />
              </section>
            </>
          ) : (
            <>
              <div className="project-title-row">
                <div>
                  <h2>默认入口</h2>
                  <code>manifest.entryScene + manifest.startWorld</code>
                </div>
                <span className="project-badge">不经过标题菜单</span>
              </div>
              <section className="project-card">
                <h4>入口信息</h4>
                <label className="field">
                  <span className="field-label">起始场景</span>
                  <select
                    className="in"
                    value={manifest.entryScene}
                    onChange={(event) =>
                      session.dispatch(new UpdateEntrySceneCommand(event.target.value))
                    }
                  >
                    {!sceneIds.includes(manifest.entryScene) ? (
                      <option value={manifest.entryScene}>{manifest.entryScene}（缺失）</option>
                    ) : null}
                    {sceneIds.map((id) => (
                      <option value={id} key={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </label>
                <PageHint>
                  这是无 menu / entry 参数时使用的入口；没有 introVideo，叙事由入口场景 onEnter
                  负责。
                </PageHint>
              </section>
              <section className="project-card">
                <div className="project-title-row">
                  <h4>这个入口的开局设置</h4>
                  <span className="project-badge custom">默认真源</span>
                </div>
                <StartWorldFields
                  value={manifest.startWorld}
                  actors={actors}
                  items={items}
                  skills={skills}
                  locale={locale}
                  onChange={updateDefault}
                />
              </section>
            </>
          )}
        </div>
      </div>
      <div className="inspector project-inspector">
        <ProjectIssuesAside issues={issues} onOpenLocation={onOpenLocation} />
        <div className="section">
          <h4>字段归属</h4>
          <p className="project-copy">
            开局设置跟随当前入口编辑。入口视频只属于菜单入口；场景 onEnter 的 video/RNG/BGM
            仍归脚本页。
          </p>
        </div>
      </div>
    </>
  )
}

export function ProjectWorkbenchTab(props: ProjectWorkbenchTabProps) {
  const {
    page,
    manifest,
    scenes,
    assetCatalog,
    assetReader,
    session,
    editorState,
    tabBar,
    onOpenLocation,
  } = props
  const issues = useMemo(() => collectProjectIssues(editorState), [editorState])
  if (page === 'entrypoint') return <EntryPointEditor {...props} issues={issues} />

  const effectiveEntries = resolveProjectEntryPoints(manifest)
  const firstEntry = effectiveEntries[0]
  const defaultScene = scenes.find((scene) => scene.id === manifest.entryScene)
  const boundRoleCount = ASSET_ROLES.filter((role) => manifest.assets.roles[role]).length
  const openProjectPage = (next: ProjectWorkbenchPage, objectId?: string): void =>
    onOpenLocation?.({
      module: 'project',
      subpage: next,
      ...(objectId ? { objectId } : {}),
    } as EditorLocation)

  if (page === 'startup') {
    return (
      <>
        <div className="outliner project-outliner">
          {tabBar}
          <div className="pane-h">
            <span className="t">全局资源与启动</span>
          </div>
          <PageHint>
            manifest.assets.roles 的 {ASSET_ROLES.length}{' '}
            项设置都在本页，按用途分组；启动链放在设置之后解释实际消费顺序。
          </PageHint>
          <div className="project-step-list">
            {PROJECT_ASSET_ROLE_GROUPS.map((group) => {
              const groupBoundCount = group.roles.filter(
                (role) => manifest.assets.roles[role],
              ).length
              return (
                <div className="project-step" key={group.id}>
                  <span>●</span>
                  <span>{group.title}</span>
                  <code>
                    {groupBoundCount}/{group.roles.length} 已绑定
                  </code>
                </div>
              )
            })}
            <div className="project-step">
              <span>→</span>
              <span>启动链（只读）</span>
              <code>默认入口 / 标题菜单</code>
            </div>
          </div>
        </div>
        <div className="canvas-wrap data-body project-center">
          <div className="project-scroll">
            <div className="project-title-row">
              <div>
                <h2>全局资源设置</h2>
                <code>manifest.assets.roles</code>
              </div>
              <span className="project-badge">
                {boundRoleCount}/{ASSET_ROLES.length} 已绑定
              </span>
            </div>
            <PageHint>
              这里选择工程运行时使用的稳定 AssetId；资源文件的导入、替换和预览仍在“资源”模块完成。
            </PageHint>
            {PROJECT_ASSET_ROLE_GROUPS.map((group) => {
              const groupBoundCount = group.roles.filter(
                (role) => manifest.assets.roles[role],
              ).length
              return (
                <section className="project-card" key={group.id}>
                  <div className="project-role-group-head">
                    <div>
                      <h4>{group.title}</h4>
                      <p className="project-copy">{group.description}</p>
                    </div>
                    <span className="project-badge">
                      {groupBoundCount}/{group.roles.length} 已绑定
                    </span>
                  </div>
                  <RoleBindings
                    manifest={manifest}
                    assetCatalog={assetCatalog}
                    assetReader={assetReader}
                    session={session}
                    roles={group.roles}
                    onOpenLocation={onOpenLocation}
                  />
                </section>
              )
            })}
            <div className="project-section-heading">
              <div>
                <h2>启动链</h2>
                <span className="project-copy">只读解释层 · 与当前运行时分支一致</span>
              </div>
            </div>
            <section className="project-card">
              <h4>默认入口（不经过标题菜单）</h4>
              <div className="project-flow">
                <div className="project-flow-step">
                  <span className="project-flow-number">1</span>
                  <div>
                    <strong>创建默认世界</strong>
                    <p>读取 manifest.startWorld，不选择任何入口点。</p>
                  </div>
                </div>
                <div className="project-flow-step">
                  <span className="project-flow-number">2</span>
                  <div>
                    <strong>进入默认场景</strong>
                    <p>{manifest.entryScene}</p>
                  </div>
                </div>
                <div className="project-flow-step">
                  <span className="project-flow-number">3</span>
                  <div>
                    <strong>执行场景 onEnter</strong>
                    <p>
                      {defaultScene ? '脚本模块所有；video/RNG/BGM 只读展示。' : '入口场景缺失'}
                    </p>
                  </div>
                </div>
              </div>
              <PageHint>
                使用 entry 参数属于开发直达：选择入口的场景/开局数据，但同样跳过启动视频、菜单和
                introVideo。
              </PageHint>
            </section>
            <section className="project-card">
              <h4>标题菜单分支（menu）</h4>
              <div className="project-flow">
                {STARTUP_ROLES.map((role, index) => (
                  <div className="project-flow-step" key={role}>
                    <span className="project-flow-number">{index + 1}</span>
                    <div>
                      <strong>{ROLE_LABELS[role]}</strong>
                      <p>
                        {manifest.assets.roles[role]
                          ? `AssetId ${manifest.assets.roles[role]}`
                          : '未绑定'}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="project-flow-step">
                  <span className="project-flow-number">4</span>
                  <div>
                    <strong>选择入口点</strong>
                    <p>播放该入口的 introVideo，再使用其完整开局（跟随默认或本入口独立设置）。</p>
                  </div>
                </div>
                <div className="project-flow-step">
                  <span className="project-flow-number">5</span>
                  <div>
                    <strong>进入入口场景</strong>
                    <p>随后执行该场景 onEnter；脚本内容仍由剧情/场景模块编辑。</p>
                  </div>
                </div>
              </div>
            </section>
            <section className="project-card">
              <h4>标题菜单入口点</h4>
              <div className="project-entry-summary-list">
                {effectiveEntries.map((entry) => (
                  <div className="project-entry-summary" key={entry.id}>
                    <span>菜单项</span>
                    <strong>{entry.label}</strong>
                    <code>{entry.scene}</code>
                    <small>
                      {entry.introVideo ?? '无入口视频'} ·{' '}
                      {entry.startWorld ? '本入口独立设置' : '跟随默认入口'}
                    </small>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => openProjectPage('entrypoint', entry.id)}
                    >
                      编辑
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
        <div className="inspector project-inspector">
          <ProjectIssuesAside issues={issues} onOpenLocation={onOpenLocation} />
          <div className="section">
            <h4>编辑边界</h4>
            <p className="project-copy">
              manifest 全局角色和入口视频由工程页编辑；场景 onEnter 内的剧情视频、RNG、BGM
              仍由脚本模块拥有。
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => openProjectPage('entrypoint', firstEntry?.id)}
            >
              编辑入口点
            </button>
          </div>
        </div>
      </>
    )
  }

  // overview / advanced 共用 manifest 只读元数据与问题聚合。
  const unknownManifestKeys = Object.keys(manifest).filter(
    (key) =>
      ![
        'id',
        'name',
        'contentVersion',
        'entryScene',
        'entryPoints',
        'content',
        'assets',
        'startWorld',
      ].includes(key),
  )
  const referenceCount = issues.length
  let catalogStatus: { valid: true } | { valid: false; message: string } = { valid: true }
  try {
    validateAssetCatalog(assetCatalog)
  } catch (error) {
    catalogStatus = {
      valid: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
  return (
    <>
      <div className="outliner project-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">{page === 'overview' ? '工程概览' : '问题与高级'}</span>
        </div>
        {page === 'overview' ? (
          <>
            <PageHint>
              manifest 是工程自包含快照。这里编辑显示名并展示摘要，入口与开局页负责入口配置。
            </PageHint>
            <div className="project-summary-list">
              <div>
                工程 id <code>{manifest.id}</code>
              </div>
              <div>
                保存状态 <strong>{session.isDirty() ? '有未保存改动' : '已保存'}</strong>
              </div>
              <div>
                场景 <strong>{scenes.length}</strong>
              </div>
              <div>
                入口点 <strong>{effectiveEntries.length}</strong>
              </div>
              <div>
                资源 <strong>{Object.keys(assetCatalog.assets).length}</strong>
              </div>
            </div>
          </>
        ) : (
          <>
            <PageHint>高级信息只读；原始 JSON 和资源二进制不在这里编辑。</PageHint>
            <div className="project-summary-list">
              <div>
                诊断 <strong>{referenceCount}</strong>
              </div>
              <div>
                contentVersion <strong>{manifest.contentVersion}</strong>
              </div>
              <div>
                未知顶层字段 <strong>{unknownManifestKeys.length}</strong>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="canvas-wrap data-body project-center">
        <div className="project-scroll">
          {page === 'overview' ? (
            <>
              <div className="project-title-row">
                <div>
                  <h2>{manifest.name}</h2>
                  <code>{manifest.id}</code>
                </div>
                <span className={`project-badge ${issues.length ? 'warning' : 'ok'}`}>
                  {issues.length ? `${issues.length} 项问题` : '配置健康'}
                </span>
              </div>
              <section className="project-card">
                <h4>工程身份</h4>
                <label className="field">
                  <span className="field-label">显示名</span>
                  <input
                    className="in"
                    value={manifest.name}
                    onChange={(event) =>
                      session.dispatch(new RenameProjectCommand(event.target.value))
                    }
                  />
                </label>
              </section>
              <section className="project-card">
                <h4>启动摘要</h4>
                <div className="project-flow-mini">
                  <span>默认入口</span>
                  <strong>
                    {manifest.startWorld.party.length} 名队员 · {manifest.startWorld.money} 金钱
                  </strong>
                  <code>{manifest.entryScene}</code>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => openProjectPage('entrypoint')}
                  >
                    编辑入口与开局
                  </button>
                </div>
                <div className="project-flow-mini">
                  <span>标题菜单</span>
                  <strong>{effectiveEntries.length} 个入口点</strong>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => openProjectPage('entrypoint', firstEntry?.id)}
                  >
                    编辑入口
                  </button>
                </div>
                <div className="project-flow-mini">
                  <span>全局资源</span>
                  <strong>
                    {boundRoleCount}/{ASSET_ROLES.length} 项已绑定
                  </strong>
                  <code>assets.roles</code>
                  <button type="button" className="btn" onClick={() => openProjectPage('startup')}>
                    编辑 8 项设置
                  </button>
                </div>
                <div className="project-flow-mini">
                  <span>启动分支</span>
                  <strong>默认入口 / 标题菜单入口</strong>
                  <button type="button" className="btn" onClick={() => openProjectPage('startup')}>
                    查看链路
                  </button>
                </div>
              </section>
              <section className="project-card">
                <h4>未解决问题</h4>
                <IssueList issues={issues} onOpenLocation={onOpenLocation} />
              </section>
            </>
          ) : (
            <>
              <div className="project-title-row">
                <div>
                  <h2>问题与高级</h2>
                  <span className="project-copy">统一引用/validator 诊断</span>
                </div>
              </div>
              <section className="project-card">
                <h4>问题面板</h4>
                <IssueList issues={issues} onOpenLocation={onOpenLocation} />
              </section>
              <section className="project-card">
                <h4>工程元数据（只读）</h4>
                <dl className="project-meta">
                  <dt>id</dt>
                  <dd>
                    <code>{manifest.id}</code>
                  </dd>
                  <dt>contentVersion</dt>
                  <dd>{manifest.contentVersion}</dd>
                  <dt>content</dt>
                  <dd>
                    <code>{JSON.stringify(manifest.content)}</code>
                  </dd>
                  <dt>资源 catalog</dt>
                  <dd>
                    <code>{manifest.assets.catalog}</code>
                  </dd>
                  <dt>catalog 校验</dt>
                  <dd>
                    {catalogStatus.valid ? (
                      <span className="project-status-ok">✓ 有效</span>
                    ) : (
                      <span className="project-status-error">✕ {catalogStatus.message}</span>
                    )}
                  </dd>
                  <dt>legacy families</dt>
                  <dd>
                    <code>{manifest.assets.legacy?.families.join(', ') || '无'}</code>
                  </dd>
                  <dt>未知顶层字段</dt>
                  <dd>
                    <code>{unknownManifestKeys.join(', ') || '无'}</code>
                  </dd>
                </dl>
              </section>
              <section className="project-card">
                <h4>locale 归属</h4>
                <PageHint>
                  locale 编辑不属于本卡四页，延后到独立内容/本地化任务；这里仅展示当前 locale。
                </PageHint>
              </section>
            </>
          )}
        </div>
      </div>
      <div className="inspector project-inspector">
        <ProjectIssuesAside issues={issues} onOpenLocation={onOpenLocation} />
        {page === 'overview' ? (
          <div className="section">
            <h4>下一步</h4>
            <button type="button" className="btn" onClick={() => openProjectPage('startup')}>
              编辑全局资源
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => openProjectPage('entrypoint')}
              style={{ marginLeft: 6 }}
            >
              编辑入口与开局
            </button>
          </div>
        ) : (
          <div className="section">
            <h4>保存契约</h4>
            <p className="project-copy">
              保存会整体写回 manifest；所有未编辑字段（包括未知顶层字段）保持原对象，不提供裸 JSON
              编辑。
            </p>
          </div>
        )}
      </div>
    </>
  )
}
