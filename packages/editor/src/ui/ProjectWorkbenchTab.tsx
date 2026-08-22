/**
 * manifest-centered 项目工作台(X7-1)。
 *
 * 四个子页共享同一 manifest/Command 真源：概览、全局资源与启动、入口点与开局、问题。
 * 缺省 entryPoints 只在这里解析为 UI 兼容入口，只有用户真正编辑入口表时才物化保存。
 */
import type {
  ActorDef,
  AssetCatalogV1,
  AssetKind,
  AssetRole,
  EntryPoint,
  ItemData,
  Locale,
  SceneDef,
  SkillData,
  StartWorld,
} from '@type-pal/content'
import { ASSET_ROLE_KINDS, ASSET_ROLES, AUDIO_ASSET_ROLES, lookupText } from '@type-pal/content'
import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react'
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
import {
  DsButton,
  DsCatalogGroupEmpty,
  DsCatalogGroupHeader,
  DsCatalogGroupList,
  DsCatalogRow,
  DsControlGroup,
  DsDiagnosticList,
  DsDiagnosticPanel,
  DsDiagnosticRow,
  DsHelpTip,
  DsListHeader,
  DsObjectHero,
  DsSelect,
  DsSequenceIndex,
  DsTag,
} from './design-system/index.js'
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
    description: 'MIDI 播放使用的项目级 SoundFont。',
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
    description: '项目标准色彩转换使用的色表。',
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

export function IssueList(props: {
  issues: readonly ProjectIssue[]
  onOpenLocation?: (location: EditorLocation) => void
}) {
  const { issues, onOpenLocation } = props
  const errors = issues.filter((issue) => issue.severity === 'error').length
  const warnings = issues.length - errors
  return (
    <DsDiagnosticPanel
      state={issues.length ? 'ready' : 'clear'}
      count={{ kind: 'exact', errors, warnings }}
      live={issues.length <= ISSUE_PAGE_SIZE}
    >
      {issues.length ? (
        <DsDiagnosticList
          initialVisibleCount={ISSUE_PAGE_SIZE}
          pageSize={ISSUE_PAGE_SIZE}
          allowShowAll
        >
          {issues.map((issue) => {
            const target = issueTarget(issue)
            return (
              <DsDiagnosticRow
                key={`${issue.code}:${issue.path}:${issue.message}`}
                severity={issue.severity === 'error' ? 'error' : 'warning'}
                title={issue.message}
                code={issue.code}
                path={issue.path}
                action={
                  target && onOpenLocation
                    ? {
                        label: '跳转 ↗',
                        ariaLabel: `跳转到：${issue.message}`,
                        onActivate: () => onOpenLocation(target),
                      }
                    : undefined
                }
                statusLabel={target ? '无法定位' : '仅提示'}
              />
            )
          })}
        </DsDiagnosticList>
      ) : null}
    </DsDiagnosticPanel>
  )
}

const PROJECT_ISSUE_GROUP_LABELS: Record<ProjectIssue['code'], string> = {
  'missing-entry-scene': '默认入口场景缺失',
  'empty-entry-points': '入口点列表为空',
  'blank-entry-id': '入口 ID 为空',
  'noncanonical-entry-id': '入口 ID 不规范',
  'duplicate-entry-id': '入口 ID 重复',
  'missing-entry-point-scene': '入口点场景缺失',
  'missing-role-asset': '全局资源缺失',
  'role-kind-mismatch': '全局资源类型错误',
  'missing-asset': '引用资源缺失',
  'asset-kind-mismatch': '资源类型错误',
  'missing-intro-video': '入口视频缺失',
  'intro-video-kind-mismatch': '入口视频类型错误',
  'unused-asset': '未引用资源',
  'invalid-start-world': '开局配置错误',
  'asset-catalog-invalid': '资源目录无效',
  'manifest-assets-invalid': '全局资源配置无效',
  'invalid-item-data': '物品数据无效',
  'migration-pending': '迁移待处理',
  'unknown-manifest-field': '未知项目字段',
}

const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  music: '音乐',
  sound: '音效',
  soundfont: '音色库',
  tileset: '瓦片集',
  sprite: '场景精灵',
  'battle-sprite': '战斗精灵',
  'effect-sprite': '特效精灵',
  portrait: '角色立绘',
  face: '战斗头像',
  'item-icon': '物品图标',
  'battle-background': '战斗背景',
  video: '视频',
  'frame-animation': '帧动画',
  'color-table': '色表',
}

export interface ProjectIssueGroup {
  id: string
  severity: ProjectIssue['severity']
  code: ProjectIssue['code']
  familyTitle: string
  title: string
  resourceKind?: AssetKind
  issues: ProjectIssue[]
}

function issueResourceKind(issue: ProjectIssue): AssetKind | undefined {
  return issue.code === 'unused-asset'
    ? issue.asset?.actualKind
    : (issue.asset?.expectedKind ?? issue.asset?.actualKind)
}

/**
 * 左栏按严重度建立一级分区，再按稳定诊断 code 与资源类型聚合。
 * message/path 只负责展示与定位，绝不承担分类语义。
 */
export function groupProjectIssues(issues: readonly ProjectIssue[]): ProjectIssueGroup[] {
  const groups = new Map<string, ProjectIssueGroup>()
  for (const issue of issues) {
    const resourceKind = issueResourceKind(issue)
    const id = `diagnostic:${issue.severity}:${issue.code}:${resourceKind ?? 'all'}`
    const current = groups.get(id)
    if (current) {
      current.issues.push(issue)
      continue
    }
    groups.set(id, {
      id,
      severity: issue.severity,
      code: issue.code,
      familyTitle: PROJECT_ISSUE_GROUP_LABELS[issue.code],
      title: resourceKind
        ? ASSET_KIND_LABELS[resourceKind]
        : PROJECT_ISSUE_GROUP_LABELS[issue.code],
      ...(resourceKind ? { resourceKind } : {}),
      issues: [issue],
    })
  }
  const values = [...groups.values()]
  return [
    ...values.filter((group) => group.severity === 'error'),
    ...values.filter((group) => group.severity === 'warn'),
  ]
}

function PageHint({ children }: { children: ReactNode }) {
  return <div className="project-hint">{children}</div>
}

function ProjectPageWorkspace(props: {
  eyebrow: ReactNode
  title: ReactNode
  objectId?: ReactNode
  summary?: ReactNode
  meta?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="canvas-wrap data-body project-center ds-object-workspace">
      <DsObjectHero
        eyebrow={props.eyebrow}
        title={props.title}
        objectId={props.objectId}
        summary={props.summary}
        meta={props.meta}
      />
      <div className="project-scroll ds-object-workspace__content">{props.children}</div>
    </main>
  )
}

function ProjectAdvancedPage(
  props: ProjectWorkbenchTabProps & { issues: readonly ProjectIssue[] },
) {
  const { tabBar, focusObjectId, onObjectFocus, onOpenLocation, issues } = props
  const issueGroups = useMemo(() => groupProjectIssues(issues), [issues])
  const errorGroups = issueGroups.filter((group) => group.severity === 'error')
  const warningGroups = issueGroups.filter((group) => group.severity === 'warn')
  const errorCount = errorGroups.reduce((count, group) => count + group.issues.length, 0)
  const warningCount = warningGroups.reduce((count, group) => count + group.issues.length, 0)
  const selectableIds = useMemo(() => new Set(issueGroups.map((group) => group.id)), [issueGroups])
  const fallbackId = issueGroups[0]?.id
  const [localSelectedId, setLocalSelectedId] = useState(() =>
    focusObjectId && selectableIds.has(focusObjectId) ? focusObjectId : fallbackId,
  )

  useEffect(() => {
    if (focusObjectId && selectableIds.has(focusObjectId)) {
      setLocalSelectedId(focusObjectId)
    }
  }, [focusObjectId, selectableIds])

  const selectedId =
    localSelectedId && selectableIds.has(localSelectedId) ? localSelectedId : fallbackId
  const selectedIssueGroup = issueGroups.find((group) => group.id === selectedId)
  const selectedTitle = selectedIssueGroup
    ? selectedIssueGroup.resourceKind
      ? `${selectedIssueGroup.familyTitle} · ${selectedIssueGroup.title}`
      : selectedIssueGroup.title
    : '项目问题'
  const selectedObjectId = selectedIssueGroup
    ? `${selectedIssueGroup.code}${selectedIssueGroup.resourceKind ? `:${selectedIssueGroup.resourceKind}` : ''}`
    : undefined
  const selectedCount = selectedIssueGroup?.issues.length
  const selectGroup = (id: string): void => {
    setLocalSelectedId(id)
    onObjectFocus?.(id)
  }

  const renderIssueGroup = (group: ProjectIssueGroup) => (
    <DsCatalogRow
      key={group.id}
      level={group.resourceKind ? 'secondary' : 'primary'}
      selected={selectedId === group.id}
      title={group.title}
      meta={group.resourceKind ?? group.code}
      aria-controls="project-issue-detail"
      trailing={
        <DsTag tone={group.severity === 'error' ? 'danger' : 'warning'}>
          {group.issues.length}
        </DsTag>
      }
      onClick={() => selectGroup(group.id)}
    />
  )

  const renderIssueFamilies = (groups: readonly ProjectIssueGroup[]) => {
    const families = new Map<ProjectIssue['code'], ProjectIssueGroup[]>()
    for (const group of groups) {
      const family = families.get(group.code)
      if (family) family.push(group)
      else families.set(group.code, [group])
    }
    return [...families.entries()].map(([code, familyGroups]) => {
      const hasResourceKinds = familyGroups.some((group) => group.resourceKind)
      const count = familyGroups.reduce((sum, group) => sum + group.issues.length, 0)
      return (
        <Fragment key={code}>
          {hasResourceKinds ? (
            <DsCatalogGroupHeader
              level="secondary"
              title={PROJECT_ISSUE_GROUP_LABELS[code]}
              count={count}
            />
          ) : null}
          {familyGroups.map(renderIssueGroup)}
        </Fragment>
      )
    })
  }

  return (
    <>
      <div className="outliner project-outliner">
        {tabBar}
        <DsListHeader title="问题" count={issues.length} unit="项" />
        <DsCatalogGroupList label="项目问题分组">
          <DsCatalogGroupHeader title="错误" count={errorCount} />
          {errorGroups.length ? (
            renderIssueFamilies(errorGroups)
          ) : (
            <DsCatalogGroupEmpty>暂无错误</DsCatalogGroupEmpty>
          )}
          <DsCatalogGroupHeader title="警告" count={warningCount} />
          {warningGroups.length ? (
            renderIssueFamilies(warningGroups)
          ) : (
            <DsCatalogGroupEmpty>暂无警告</DsCatalogGroupEmpty>
          )}
        </DsCatalogGroupList>
      </div>
      <ProjectPageWorkspace
        eyebrow="项目设置 · 问题"
        title={selectedTitle}
        objectId={selectedObjectId}
        summary={selectedIssueGroup ? undefined : '当前项目没有错误或警告。'}
        meta={
          selectedIssueGroup ? (
            <DsTag tone={selectedIssueGroup.severity === 'error' ? 'danger' : 'warning'}>
              {selectedCount} 项
            </DsTag>
          ) : null
        }
      >
        <section id="project-issue-detail" className="project-card" aria-label="问题详情">
          {selectedIssueGroup ? (
            <>
              <h2 className="project-card__title">分组详情</h2>
              <IssueList issues={selectedIssueGroup.issues} onOpenLocation={onOpenLocation} />
            </>
          ) : (
            <IssueList issues={[]} onOpenLocation={onOpenLocation} />
          )}
        </section>
      </ProjectPageWorkspace>
    </>
  )
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
        const controlId = `project-role-${role.replaceAll('.', '-')}`
        const labelId = `${controlId}-label`
        const descriptionId = `${controlId}-description`
        const selectionOptions = [
          { value: '', label: '未绑定' },
          ...(current && !currentRecord ? [{ value: current, label: `${current}（缺失）` }] : []),
          ...(currentRecord && currentRecord.kind !== expected
            ? [
                {
                  value: current,
                  label: `${current}（类型 ${currentRecord.kind}，需要 ${expected}）`,
                },
              ]
            : []),
          ...candidates.map(([id, record]) => ({
            value: id,
            label: record.label ? `${record.label} · ${id}` : id,
          })),
        ]
        return (
          <div className="project-role-row" key={role}>
            <div className="project-role-label">
              <div className="project-role-label-head">
                <strong id={labelId}>{ROLE_LABELS[role]}</strong>
                <DsTag tone={required ? 'accent' : 'neutral'}>{required ? '必选' : '可选'}</DsTag>
              </div>
              <small>
                <code translate="no">{role}</code> · 期望 {expected}
              </small>
              {roleHint ? <small className="project-role-hint">{roleHint}</small> : null}
            </div>
            <div className="project-role-binding">
              {expected === 'sound' ? (
                <SoundPicker
                  id={controlId}
                  value={current || undefined}
                  onChange={(asset) =>
                    session.dispatch(new UpdateManifestAssetRolesCommand({ [role]: asset }))
                  }
                  catalog={assetCatalog}
                  reader={assetReader}
                  allowUnset
                  ariaLabel={`${ROLE_LABELS[role]}资源`}
                  onOpenAsset={(asset) =>
                    onOpenLocation?.({ module: 'asset', subpage: 'sound', objectId: asset })
                  }
                />
              ) : (
                <DsControlGroup
                  className="project-role-binding-control"
                  control={
                    <DsSelect
                      id={controlId}
                      aria-labelledby={labelId}
                      aria-describedby={bindingError || validRecord ? descriptionId : undefined}
                      value={current}
                      required={required}
                      invalid={Boolean(bindingError)}
                      searchable="auto"
                      options={selectionOptions}
                      onValueChange={(value) =>
                        session.dispatch(
                          new UpdateManifestAssetRolesCommand({
                            [role]: value || undefined,
                          }),
                        )
                      }
                    />
                  }
                  actions={
                    onOpenLocation && targetSubpage ? (
                      <DsButton
                        variant="secondary"
                        icon="open"
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
                          ? '前往预览'
                          : candidates.length
                            ? `打开${libraryLabel}`
                            : `前往${libraryLabel}导入`}
                      </DsButton>
                    ) : undefined
                  }
                />
              )}
              {bindingError ? (
                <span id={descriptionId} className="project-role-error">
                  {bindingError}
                </span>
              ) : validRecord ? (
                <span id={descriptionId} className="project-role-resource" title={validRecord.path}>
                  <DsTag tone="neutral">{validRecord.kind}</DsTag>
                  <code translate="no">{validRecord.path}</code>
                </span>
              ) : null}
              {expected !== 'sound' && !(onOpenLocation && targetSubpage) ? (
                <span className="project-role-no-preview">
                  当前没有 {expected} 专用资源页；这里只能绑定 catalog 中已有项。
                </span>
              ) : null}
            </div>
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
                <DsSequenceIndex value={index + 1} accessibleLabel={`初始队伍第 ${index + 1} 位`} />
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
        {partyActors.length === 0 ? <PageHint>当前项目没有可参战角色。</PageHint> : null}
      </section>

      <section className="project-card">
        <h4>初始道具</h4>
        <div className="project-list-stack">
          {inventory.map((row, index) => (
            <div className="project-inline-row" key={`${row.itemId}:${index}`}>
              <DsSelect
                size="compact"
                aria-label={`第 ${index + 1} 项初始道具`}
                value={row.itemId}
                disabled={readOnly}
                options={[
                  ...(!items.some((item) => item.id === row.itemId)
                    ? [{ value: row.itemId, label: `${row.itemId}（缺失）` }]
                    : []),
                  ...items
                    .filter(
                      (item) =>
                        item.id === row.itemId ||
                        !inventory.some(
                          (entry, itemIndex) => itemIndex !== index && entry.itemId === item.id,
                        ),
                    )
                    .map((item) => ({ value: item.id, label: item.name, description: item.id })),
                ]}
                onValueChange={(value) =>
                  patch({
                    inventory: inventory.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, itemId: value } : item,
                    ),
                  })
                }
              />
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
                  <DsSelect
                    size="compact"
                    aria-label={`${actorId} 的第 ${index + 1} 个初始技能`}
                    value={skillId}
                    disabled={readOnly}
                    options={[
                      ...(!skills.some((skill) => skill.id === skillId)
                        ? [{ value: skillId, label: `${skillId}（缺失）` }]
                        : []),
                      ...skills
                        .filter(
                          (skill) =>
                            skill.id === skillId ||
                            !actorSkills.some(
                              (id, skillIndex) => skillIndex !== index && id === skill.id,
                            ),
                        )
                        .map((skill) => ({
                          value: skill.id,
                          label: skill.name,
                          description: skill.id,
                        })),
                    ]}
                    onValueChange={(value) =>
                      setSkills(
                        actorId,
                        actorSkills.map((id, skillIndex) => (skillIndex === index ? value : id)),
                      )
                    }
                  />
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
          初始世界资源{' '}
          <DsHelpTip label="初始世界资源">
            物品炼化等机制按稳定键读写。collectValue
            是内建收妖值，不在这里重复定义；独立入口可以保存自己的资源初值。
          </DsHelpTip>
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
        </div>
      </section>

      <section className="project-card">
        <h4>
          角色初始状态{' '}
          <DsHelpTip label="角色初始状态">
            可选。这里只覆盖本入口的开局 HP/MP，不修改角色定义。
          </DsHelpTip>
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
          <PageHint>未设置角色初始状态覆盖；开局沿用角色定义。</PageHint>
        ) : null}
      </section>
    </div>
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
  const selectedIntroVideoAsset = selected?.introVideo
    ? assetCatalog.assets[selected.introVideo]
    : undefined
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
          <DsListHeader title="入口修复" count={identityIssues.length} unit="项" />
          <PageHint>入口 id 损坏时不再按该 id 选中或深链，先修复稳定身份再继续编辑。</PageHint>
          <IssueList issues={identityIssues} />
        </div>
        <ProjectPageWorkspace
          eyebrow="项目设置 · 入口点"
          title="修复入口 id"
          objectId="manifest.entryPoints"
          summary="id 必须非空、无首尾空格且彼此唯一。"
          meta={<DsTag tone="warning">阻止保存</DsTag>}
        >
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
              <DsHelpTip label="入口 ID 修复规则">
                应用时会自动去掉首尾空格；修复完成后，稳定 ID 继续只读。
              </DsHelpTip>
            </div>
          </section>
        </ProjectPageWorkspace>
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
        <DsListHeader
          title="入口点"
          count={entryPoints.length + 1}
          unit="项"
          help={{
            label: '入口点开局设置',
            content: '每个标题菜单入口都可以跟随默认入口，也可以保存本入口自己的完整开局设置。',
          }}
          actions={[{ id: 'create-entry', label: '新增入口', icon: 'add', onClick: addEntry }]}
          overflowActions={[
            { id: 'clone-entry', label: '复制当前入口', onClick: cloneEntry },
            {
              id: 'remove-entry',
              label: '删除当前入口',
              danger: true,
              disabled: !selected || entryPoints.length <= 1,
              onClick: removeEntry,
            },
          ]}
        />
        <div className="project-entry-list">
          <DsCatalogRow
            leading="🧭"
            title="默认入口"
            meta={manifest.entryScene}
            selected={selectedId === undefined}
            onClick={chooseDefault}
          />
          <div className="project-entry-divider">标题菜单入口（各自带开局）</div>
          {entryPoints.map((entry) => (
            <DsCatalogRow
              key={entry.id}
              leading="🚪"
              title={entry.label}
              meta={entry.id}
              selected={entry.id === selected?.id}
              onClick={() => chooseEntry(entry.id)}
            />
          ))}
        </div>
      </div>
      <ProjectPageWorkspace
        eyebrow="项目设置 · 入口点"
        title={selected ? selected.label : '默认入口'}
        objectId={selected ? selected.id : 'manifest.entryScene + manifest.startWorld'}
        meta={<DsTag tone="neutral">{selected ? '菜单入口 · 稳定 id' : '不经过标题菜单'}</DsTag>}
      >
        {selected ? (
          <>
            <section className="project-card">
              <h4>
                入口信息{' '}
                <DsHelpTip label="标题菜单入口">
                  该入口可以配置自己的场景、入口视频与开局状态；稳定 ID 创建后保持不变。
                </DsHelpTip>
              </h4>
              <label className="field">
                <span className="field-label">标签</span>
                <input
                  className="in"
                  value={selected.label}
                  onChange={(event) => patchEntry(selected.id, { label: event.target.value })}
                />
              </label>
              <div className="field">
                <span className="field-label">起始场景</span>
                <DsSelect
                  aria-label="菜单入口场景"
                  value={selected.scene}
                  options={[
                    ...(!sceneIds.includes(selected.scene)
                      ? [{ value: selected.scene, label: `${selected.scene}（缺失）` }]
                      : []),
                    ...sceneIds.map((id) => ({ value: id, label: id })),
                  ]}
                  onValueChange={(value) => patchEntry(selected.id, { scene: value })}
                />
              </div>
              <div className="field">
                <span className="field-label">入口视频</span>
                <span className="project-entry-video-control">
                  <DsSelect
                    aria-label="入口视频"
                    value={selected.introVideo ?? ''}
                    options={[
                      { value: '', label: '无（由场景脚本负责叙事）' },
                      ...(selected.introVideo && !assetCatalog.assets[selected.introVideo]
                        ? [
                            {
                              value: selected.introVideo,
                              label: `${selected.introVideo}（缺失）`,
                            },
                          ]
                        : []),
                      ...(selected.introVideo &&
                      selectedIntroVideoAsset &&
                      selectedIntroVideoAsset.kind !== 'video'
                        ? [
                            {
                              value: selected.introVideo,
                              label: selected.introVideo,
                              description: `类型 ${selectedIntroVideoAsset.kind}`,
                            },
                          ]
                        : []),
                      ...videoAssets.map(([id, asset]) => ({
                        value: id,
                        label: asset.label ?? id,
                        description: asset.label ? id : undefined,
                      })),
                    ]}
                    onValueChange={(value) =>
                      patchEntry(selected.id, { introVideo: value || undefined })
                    }
                  />
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
              </div>
            </section>
            <section className="project-card">
              <div className="project-title-row">
                <h4>
                  这个入口的开局设置{' '}
                  <DsHelpTip label="入口开局设置">
                    跟随默认时，下方展示实际生效值但保持只读；需要不同队伍、资源或道具时，再复制为本入口独立设置。
                  </DsHelpTip>
                </h4>
                <span className={`project-badge ${selected.startWorld ? 'custom' : ''}`}>
                  {selected.startWorld ? '本入口独立设置' : '跟随默认入口'}
                </span>
              </div>
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
            <section className="project-card">
              <h4>
                入口信息{' '}
                <DsHelpTip label="默认入口">
                  无 menu / entry 参数时使用这里的场景和开局状态；它没有 introVideo，叙事由入口场景
                  onEnter 负责。
                </DsHelpTip>
              </h4>
              <div className="field">
                <span className="field-label">起始场景</span>
                <DsSelect
                  aria-label="默认入口场景"
                  value={manifest.entryScene}
                  options={[
                    ...(!sceneIds.includes(manifest.entryScene)
                      ? [{ value: manifest.entryScene, label: `${manifest.entryScene}（缺失）` }]
                      : []),
                    ...sceneIds.map((id) => ({ value: id, label: id })),
                  ]}
                  onValueChange={(value) => session.dispatch(new UpdateEntrySceneCommand(value))}
                />
              </div>
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
      </ProjectPageWorkspace>
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
          <DsListHeader title="全局资源" count={boundRoleCount} unit="项已绑定" />
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
        <ProjectPageWorkspace
          eyebrow="项目设置"
          title="全局资源设置"
          objectId="manifest.assets.roles"
          meta={
            <>
              <DsHelpTip label="全局资源设置">
                这里绑定项目运行时使用的稳定 AssetId；资源文件的导入、替换和预览仍在“资源”模块完成。
              </DsHelpTip>
              <DsTag tone="neutral">
                {boundRoleCount}/{ASSET_ROLES.length} 已绑定
              </DsTag>
            </>
          }
        >
          {PROJECT_ASSET_ROLE_GROUPS.map((group) => {
            const groupBoundCount = group.roles.filter((role) => manifest.assets.roles[role]).length
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
            <h4>
              默认入口（不经过标题菜单）{' '}
              <DsHelpTip label="开发直达入口">
                使用 entry 参数会选择该入口的场景与开局数据，但仍跳过启动视频、标题菜单和
                introVideo。
              </DsHelpTip>
            </h4>
            <div className="project-flow">
              <div className="project-flow-step">
                <DsSequenceIndex value={1} accessibleLabel="第 1 步" />
                <div>
                  <strong>创建默认世界</strong>
                  <p>读取 manifest.startWorld，不选择任何入口点。</p>
                </div>
              </div>
              <div className="project-flow-step">
                <DsSequenceIndex value={2} accessibleLabel="第 2 步" />
                <div>
                  <strong>进入默认场景</strong>
                  <p>{manifest.entryScene}</p>
                </div>
              </div>
              <div className="project-flow-step">
                <DsSequenceIndex value={3} accessibleLabel="第 3 步" />
                <div>
                  <strong>执行场景 onEnter</strong>
                  <p>{defaultScene ? '脚本模块所有；video/RNG/BGM 只读展示。' : '入口场景缺失'}</p>
                </div>
              </div>
            </div>
          </section>
          <section className="project-card">
            <h4>标题菜单分支（menu）</h4>
            <div className="project-flow">
              {STARTUP_ROLES.map((role, index) => (
                <div className="project-flow-step" key={role}>
                  <DsSequenceIndex value={index + 1} accessibleLabel={`第 ${index + 1} 步`} />
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
                <DsSequenceIndex value={4} accessibleLabel="第 4 步" />
                <div>
                  <strong>选择入口点</strong>
                  <p>播放该入口的 introVideo，再使用其完整开局（跟随默认或本入口独立设置）。</p>
                </div>
              </div>
              <div className="project-flow-step">
                <DsSequenceIndex value={5} accessibleLabel="第 5 步" />
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
        </ProjectPageWorkspace>
      </>
    )
  }

  if (page === 'advanced') return <ProjectAdvancedPage {...props} issues={issues} />

  return (
    <>
      <div className="outliner project-outliner">
        {tabBar}
        <DsListHeader title="项目概览" count={scenes.length} unit="个场景" />
        <div className="project-summary-list">
          <div>
            项目 ID <code>{manifest.id}</code>
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
          <div>
            内容版本 <strong>{manifest.contentVersion}</strong>
          </div>
          <div>
            最低存档版本 <strong>{manifest.minimumSaveVersion}</strong>
          </div>
        </div>
      </div>
      <ProjectPageWorkspace
        eyebrow="项目设置 · 项目概览"
        title={manifest.name}
        objectId={manifest.id}
        meta={
          <DsTag tone={issues.length ? 'warning' : 'neutral'}>
            {issues.length ? `${issues.length} 项问题` : '配置健康'}
          </DsTag>
        }
      >
        <section className="project-card">
          <h4>项目身份</h4>
          <label className="field">
            <span className="field-label">显示名</span>
            <input
              className="in"
              value={manifest.name}
              onChange={(event) => session.dispatch(new RenameProjectCommand(event.target.value))}
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
            <button type="button" className="btn" onClick={() => openProjectPage('entrypoint')}>
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
      </ProjectPageWorkspace>
    </>
  )
}
