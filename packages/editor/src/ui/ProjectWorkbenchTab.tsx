/**
 * manifest-centered 项目工作台(X7-1)。
 *
 * 四个子页共享同一 manifest/Command 真源：概览、全局资源与启动、入口点与开局、问题。
 * 当前版本只接受非空真实入口表；编辑直接启动入口和入口表时始终原子提交。
 */
import type {
  ActorDef,
  AssetCatalogV1,
  AssetKind,
  EntryPoint,
  ItemData,
  Locale,
  SceneDef,
  StartWorld,
} from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { EDITOR_ASSET_KIND_LABELS } from '../core/asset-diagnostics.js'
import { stopEditorAudioPreview } from '../core/audio-preview-session.js'
import {
  RenameProjectCommand,
  SetStartupEntriesCommand,
  UpdateManifestAssetRolesCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  getRepairableEntryIndexes,
  type ManifestLike,
  type ProjectIssue,
} from '../core/project-diagnostics.js'
import { findDefaultEntry } from '../core/startup-entries.js'
import {
  ActorPickerThumbnail,
  ItemPickerThumbnail,
  itemAbilitySummary,
  itemPickerDescription,
  itemPickerSearchText,
} from './add-picker-option-presentation.js'
import {
  DsAddPickerDialog,
  DsButton,
  DsCard,
  DsCatalogGroupEmpty,
  DsCatalogGroupHeader,
  DsCatalogGroupList,
  DsCatalogRow,
  DsControlGroup,
  DsDiagnosticList,
  DsDiagnosticPanel,
  DsDiagnosticRow,
  DsDraftNumberField,
  DsDraftNumberInput,
  DsDraftTextField,
  DsEmptyState,
  DsField,
  DsFieldGroup,
  DsHelpTip,
  DsIconButton,
  DsListHeader,
  DsNumberFieldGrid,
  DsObjectHero,
  DsReorderCollection,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  DsRepeatRow,
  DsSelect,
  DsSelectField,
  DsSequenceIndex,
  DsTag,
  DsTextInput,
  reorderDsItems,
  sameDsSerializableValue,
  useDsReorderKeys,
} from './design-system/index.js'
import type { EditorLocation } from './editor-navigation.js'
import { ProjectAudioPreviewButton } from './ProjectAudioPreviewButton.js'
import {
  PROJECT_ASSET_ROLE_GROUPS,
  type ProjectAssetRoleDefinition,
  projectAssetRoleStatus,
  projectAssetRoleStatuses,
} from './project-asset-roles.js'

export { PROJECT_ASSET_ROLE_GROUPS } from './project-asset-roles.js'

export type ProjectWorkbenchPage = 'overview' | 'startup' | 'entrypoint' | 'advanced'

export interface ProjectWorkbenchTabProps {
  page: ProjectWorkbenchPage
  manifest: ManifestLike
  scenes: SceneDef[]
  actors: ActorDef[]
  items: ItemData[]
  locale: Locale
  assetCatalog: AssetCatalogV1
  session: EditSession
  issues: readonly ProjectIssue[]
  diagnosticsStatus: 'checking' | 'stale' | 'current' | 'failed'
  assetReader: EditorAssetReader
  tabBar?: ReactNode
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenLocation?: (location: EditorLocation) => void
}

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
const ADAPTIVE_ISSUE_TITLE_MAX_LENGTH = 72
const PROJECT_NUMBER_FORMAT = new Intl.NumberFormat('zh-CN')

export interface StartWorldResourceCandidate {
  key: string
  label: string
  consumerItemIds: string[]
}

/** 从当前 live 物品定义反向派生入口可配置的普通世界资源；不创造第二份资源 registry。 */
export function deriveStartWorldResourceCandidates(
  items: readonly ItemData[],
): StartWorldResourceCandidate[] {
  const consumersByResource = new Map<string, Map<string, string>>()
  for (const item of [...items].sort((left, right) => left.id.localeCompare(right.id))) {
    for (const effect of item.use?.effects ?? []) {
      if (effect.kind !== 'drawFromResourcePool') continue
      const key = effect.resource.trim()
      if (!key || key !== effect.resource || key === 'collectValue') continue
      const consumers = consumersByResource.get(key) ?? new Map<string, string>()
      if (!consumers.has(item.id)) consumers.set(item.id, item.name)
      consumersByResource.set(key, consumers)
    }
  }
  return [...consumersByResource.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, consumers]) => ({
      key,
      label: [...consumers.values()].join('、'),
      consumerItemIds: [...consumers.keys()],
    }))
}

export function IssueList(props: {
  issues: readonly ProjectIssue[]
  onOpenLocation?: (location: EditorLocation) => void
  statusOwner?: 'panel' | 'external'
}) {
  const { issues, onOpenLocation, statusOwner } = props
  const errors = issues.filter((issue) => issue.severity === 'error').length
  const warnings = issues.length - errors
  const compact = issues.every(
    (issue) =>
      issue.message.length <= ADAPTIVE_ISSUE_TITLE_MAX_LENGTH && !issue.message.includes('\n'),
  )
  return (
    <DsDiagnosticPanel
      state={issues.length ? 'ready' : 'clear'}
      count={{ kind: 'exact', errors, warnings }}
      statusOwner={statusOwner}
      live={issues.length <= ISSUE_PAGE_SIZE}
    >
      {issues.length ? (
        <DsDiagnosticList
          layout={compact ? 'adaptive-grid' : 'stack'}
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
                action={
                  target && onOpenLocation
                    ? {
                        label: '跳转',
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
  'missing-default-entry': '直接启动入口缺失',
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
        ? EDITOR_ASSET_KIND_LABELS[resourceKind]
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
  const { tabBar, focusObjectId, onObjectFocus, onOpenLocation, issues, diagnosticsStatus } = props
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
            <DsCatalogGroupEmpty>
              {diagnosticsStatus === 'current' ? '暂无错误' : '等待当前诊断'}
            </DsCatalogGroupEmpty>
          )}
          <DsCatalogGroupHeader title="警告" count={warningCount} />
          {warningGroups.length ? (
            renderIssueFamilies(warningGroups)
          ) : (
            <DsCatalogGroupEmpty>
              {diagnosticsStatus === 'current' ? '暂无警告' : '等待当前诊断'}
            </DsCatalogGroupEmpty>
          )}
        </DsCatalogGroupList>
      </div>
      <ProjectPageWorkspace
        eyebrow="项目设置 · 问题"
        title={selectedTitle}
        summary={
          selectedIssueGroup
            ? undefined
            : diagnosticsStatus === 'current'
              ? '当前项目没有错误或警告。'
              : diagnosticsStatus === 'failed'
                ? '当前诊断不可用，未把空列表视为健康。'
                : '正在检查当前项目；暂不判定配置健康。'
        }
        meta={
          selectedIssueGroup || diagnosticsStatus !== 'current' ? (
            <>
              {selectedIssueGroup ? (
                <DsTag tone={selectedIssueGroup.severity === 'error' ? 'danger' : 'warning'}>
                  {selectedCount} 项
                </DsTag>
              ) : null}
              {diagnosticsStatus !== 'current' ? (
                <DsTag tone="warning">
                  {diagnosticsStatus === 'failed'
                    ? '诊断失败 · 显示上一版'
                    : diagnosticsStatus === 'stale'
                      ? '正在刷新 · 显示上一版'
                      : '正在检查'}
                </DsTag>
              ) : null}
            </>
          ) : null
        }
      >
        <section id="project-issue-detail" className="project-card" aria-label="问题详情">
          {selectedIssueGroup ? (
            <IssueList
              issues={selectedIssueGroup.issues}
              onOpenLocation={onOpenLocation}
              statusOwner="external"
            />
          ) : diagnosticsStatus === 'current' ? (
            <IssueList issues={[]} onOpenLocation={onOpenLocation} />
          ) : (
            <p role="status">
              {diagnosticsStatus === 'failed' ? '诊断失败，请从底部状态栏重试。' : '诊断检查中…'}
            </p>
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
  roles: readonly ProjectAssetRoleDefinition[]
  onOpenLocation?: (location: EditorLocation) => void
}) {
  const { manifest, assetCatalog, session, assetReader, roles, onOpenLocation } = props
  return (
    <DsFieldGroup className="project-role-list">
      {roles.map((definition) => {
        const { role, kind: expected, label } = definition
        const status = projectAssetRoleStatus(definition, manifest.assets, assetCatalog)
        const required = status.required
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
        const bindingError = status.state === 'error' ? status.message : undefined
        const validRecord = status.state === 'configured' ? status.record : undefined
        const expectedLabel = EDITOR_ASSET_KIND_LABELS[expected]
        const controlId = `project-role-${role.replaceAll('.', '-')}`
        const selectionOptions = [
          { value: '', label: '未绑定' },
          ...(current && !currentRecord ? [{ value: current, label: `${current}（缺失）` }] : []),
          ...(currentRecord && currentRecord.kind !== expected
            ? [
                {
                  value: current,
                  label: `${current}（当前是${EDITOR_ASSET_KIND_LABELS[currentRecord.kind]}，需要${expectedLabel}）`,
                },
              ]
            : []),
          ...candidates.map(([id, record]) => ({
            value: id,
            label: record.label ? `${record.label} · ${id}` : id,
          })),
        ]
        return (
          <DsField
            id={controlId}
            key={role}
            className="project-role-row"
            label={label}
            required={required}
            error={bindingError}
            help={`${required ? '必选' : '可选'}资源角色：${role}；需要${expectedLabel}资源。${definition.help ? ` ${definition.help}` : ''}`}
          >
            {(control) => (
              <div className="project-role-binding">
                <DsControlGroup
                  className="project-role-binding-control"
                  control={
                    <DsSelect
                      {...control}
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
                    <>
                      {validRecord && (expected === 'music' || expected === 'sound') ? (
                        <ProjectAudioPreviewButton
                          asset={current}
                          label={validRecord.label ?? label}
                          kind={expected}
                          cacheKey={validRecord.sha256}
                          reader={assetReader}
                        />
                      ) : null}
                      {onOpenLocation && targetSubpage ? (
                        <DsButton
                          variant="secondary"
                          icon="open"
                          title={validRecord ? `打开资源 ${current}` : `打开${libraryLabel}`}
                          onClick={() => {
                            stopEditorAudioPreview()
                            onOpenLocation({
                              module: 'asset',
                              subpage: targetSubpage,
                              ...(validRecord ? { objectId: current } : {}),
                            })
                          }}
                        >
                          {validRecord
                            ? '打开资源'
                            : candidates.length
                              ? `打开${libraryLabel}`
                              : `前往${libraryLabel}导入`}
                        </DsButton>
                      ) : null}
                    </>
                  }
                />
                {validRecord ? (
                  <span className="project-role-resource" title={validRecord.path}>
                    <DsTag tone="neutral">{expectedLabel}</DsTag>
                    <span>{validRecord.label ?? current}</span>
                  </span>
                ) : null}
                {!(expected === 'music' || expected === 'sound') &&
                !(onOpenLocation && targetSubpage) ? (
                  <span className="project-role-no-preview">
                    当前没有{expectedLabel}专用资源页；这里只能绑定资源库中已有项。
                  </span>
                ) : null}
              </div>
            )}
          </DsField>
        )
      })}
    </DsFieldGroup>
  )
}

export function StartWorldFields(props: {
  value: StartWorld
  actors: ActorDef[]
  items: ItemData[]
  locale: Locale
  assetCatalog?: AssetCatalogV1
  assetReader?: EditorAssetReader
  readOnly?: boolean
  draftScope?: string
  syncToken?: number
  onChange: (next: StartWorld) => void
}) {
  const {
    value,
    actors,
    items,
    locale,
    assetCatalog,
    assetReader,
    readOnly = false,
    draftScope = 'startWorld',
    syncToken = 0,
    onChange,
  } = props
  const [announcement, setAnnouncement] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const partySectionRef = useRef<HTMLElement>(null)
  const inventorySectionRef = useRef<HTMLElement>(null)
  const partyRemoveRefs = useRef(new Map<string, HTMLButtonElement>())
  const pendingPartyFocusRef = useRef<{ actorId?: string } | undefined>(undefined)
  const resourceSectionRef = useRef<HTMLElement>(null)
  const resourceValueRefs = useRef(new Map<string, HTMLInputElement>())
  const pendingResourceFocusRef = useRef<
    { inputKey?: string; preferComposer?: boolean } | undefined
  >(undefined)
  const partyReorderKeys = useDsReorderKeys(value.party)
  const inventoryReorderKeys = useDsReorderKeys(value.inventory ?? [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: live feedback survives same-object commands and resets only on object switch.
  useEffect(() => {
    setAnnouncement('')
  }, [draftScope])
  // biome-ignore lint/correctness/useExhaustiveDependencies: a changed ordered party means the requested row/fallback now exists in the DOM.
  useEffect(() => {
    const pending = pendingPartyFocusRef.current
    if (!pending) return
    pendingPartyFocusRef.current = undefined
    const target = pending.actorId
      ? partyRemoveRefs.current.get(pending.actorId)
      : rootRef.current?.querySelector<HTMLButtonElement>(
          '[data-ds-add-picker-adoption="project/startup-party"] button',
        )
    target?.focus()
  }, [value.party])
  // biome-ignore lint/correctness/useExhaustiveDependencies: a resource command changes the rendered row/composer that receives the requested focus handoff.
  useEffect(() => {
    const pending = pendingResourceFocusRef.current
    if (!pending) return
    pendingResourceFocusRef.current = undefined
    const valueInput = pending.inputKey
      ? resourceValueRefs.current.get(pending.inputKey)
      : undefined
    const trigger = rootRef.current?.querySelector<HTMLButtonElement>(
      '[data-ds-add-picker-adoption="project/startup-resource"] button',
    )
    const target = valueInput ?? (pending.preferComposer ? trigger : undefined) ?? trigger
    queueMicrotask(() => (target ?? resourceSectionRef.current)?.focus())
  }, [value.resources])
  const patch = (next: Partial<StartWorld>): void => onChange({ ...value, ...next })
  const partyActors = actors.filter((actor) => actor.battler)
  const addablePartyActors = partyActors.filter((actor) => !value.party.includes(actor.id))
  const orphanSeedActorIds = Object.keys(value.seedStats ?? {}).filter(
    (actorId) => !value.party.includes(actorId),
  )
  const inventory = value.inventory ?? []
  const addableItems = items.filter((item) => !inventory.some((entry) => entry.itemId === item.id))
  const resourceCandidates = useMemo(() => deriveStartWorldResourceCandidates(items), [items])
  const resourceCandidateByKey = useMemo(
    () => new Map(resourceCandidates.map((candidate) => [candidate.key, candidate])),
    [resourceCandidates],
  )
  const configuredResources = Object.entries(value.resources ?? {}).sort(([left], [right]) =>
    left.localeCompare(right),
  )
  const activeResources = configuredResources.filter(([key]) => resourceCandidateByKey.has(key))
  const orphanResources = configuredResources.filter(([key]) => !resourceCandidateByKey.has(key))
  const addableResourceCandidates = resourceCandidates.filter(
    (candidate) => !Object.hasOwn(value.resources ?? {}, candidate.key),
  )
  const addParty = (actorId: string) => {
    const actor = addablePartyActors.find((candidate) => candidate.id === actorId)
    if (!actor) return false
    patch({ party: [...value.party, actor.id] })
    setAnnouncement(`已将${lookupText(actor.name, locale)}加入初始队伍。`)
  }
  const removeParty = (id: string): void => {
    const actor = actors.find((candidate) => candidate.id === id)
    const index = value.party.indexOf(id)
    const party = value.party.filter((candidate) => candidate !== id)
    const seedStats = { ...(value.seedStats ?? {}) }
    delete seedStats[id]
    pendingPartyFocusRef.current = {
      actorId: party[Math.min(Math.max(index, 0), party.length - 1)],
    }
    patch({ party, seedStats: Object.keys(seedStats).length ? seedStats : undefined })
    setAnnouncement(`已将${actor ? lookupText(actor.name, locale) : id}移出初始队伍。`)
  }
  const reorderParty = (intent: DsReorderIntent): boolean => {
    const party = reorderDsItems(value.party, intent, 'insert', sameDsSerializableValue)
    if (party === value.party) return false
    partyReorderKeys.move(intent)
    patch({ party: [...party] })
    const id = value.party[intent.fromIndex]
    const actor = actors.find((candidate) => candidate.id === id)
    setAnnouncement(
      `${actor ? lookupText(actor.name, locale) : id}已移到初始队伍第 ${intent.toIndex + 1} 位。`,
    )
    return true
  }
  const reorderInventory = (intent: DsReorderIntent): boolean => {
    const next = reorderDsItems(inventory, intent, 'insert', sameDsSerializableValue)
    if (next === inventory) return false
    inventoryReorderKeys.move(intent)
    patch({ inventory: [...next] })
    setAnnouncement(`已将初始道具移到第 ${intent.toIndex + 1} 项。`)
    return true
  }
  const patchSeed = (actorId: string, key: 'hp' | 'mp', next: number | undefined): void => {
    const seedStats = { ...(value.seedStats ?? {}) }
    const stats = { ...(seedStats[actorId] ?? {}) }
    if (next === undefined) delete stats[key]
    else stats[key] = Math.max(0, Math.floor(next))
    if (Object.keys(stats).length) seedStats[actorId] = stats
    else delete seedStats[actorId]
    patch({ seedStats: Object.keys(seedStats).length ? seedStats : undefined })
  }
  const clearSeed = (actorId: string): void => {
    const seedStats = { ...(value.seedStats ?? {}) }
    delete seedStats[actorId]
    patch({ seedStats: Object.keys(seedStats).length ? seedStats : undefined })
    setAnnouncement(`已清理 ${actorId} 的未入队状态覆盖。`)
  }
  const patchResource = (key: string, nextValue: number | undefined): void => {
    const resources = { ...(value.resources ?? {}) }
    if (nextValue === undefined) delete resources[key]
    else resources[key] = Math.max(0, Math.floor(nextValue))
    patch({ resources: Object.keys(resources).length ? resources : undefined })
  }
  const addInventoryItem = (itemId: string) => {
    const item = addableItems.find((candidate) => candidate.id === itemId)
    if (!item) return false
    patch({ inventory: [...inventory, { itemId: item.id, count: 1 }] })
    setAnnouncement(`已添加初始道具${item.name}。`)
  }
  const addResource = (key: string) => {
    const candidate = addableResourceCandidates.find((candidate) => candidate.key === key)
    if (!candidate) return false
    patchResource(candidate.key, 0)
    setAnnouncement(`已添加${candidate.label}使用的初始世界资源。`)
  }
  const removeActiveResource = (candidate: StartWorldResourceCandidate): void => {
    pendingResourceFocusRef.current = { preferComposer: true }
    patchResource(candidate.key, undefined)
    setAnnouncement(`已删除${candidate.label}使用的初始世界资源。`)
  }
  const clearOrphanResource = (key: string): void => {
    const index = orphanResources.findIndex(([candidateKey]) => candidateKey === key)
    const remainingKeys = orphanResources
      .filter(([candidateKey]) => candidateKey !== key)
      .map(([candidateKey]) => candidateKey)
    pendingResourceFocusRef.current = {
      inputKey: remainingKeys[Math.min(Math.max(index, 0), remainingKeys.length - 1)],
    }
    patchResource(key, undefined)
    setAnnouncement(`已清理未被使用的世界资源 ${key}。`)
  }

  return (
    <div ref={rootRef} className="project-form-stack">
      <DsFieldGroup>
        <DsDraftNumberField
          id="start-world-money"
          label="金钱"
          min={0}
          integer
          normalize={(next) => Math.max(0, Math.floor(next))}
          draftKey={`${draftScope}:money`}
          syncToken={syncToken}
          value={value.money}
          disabled={readOnly}
          onCommit={(next) => next !== undefined && patch({ money: next })}
        />
      </DsFieldGroup>

      <section ref={partySectionRef} className="project-card" tabIndex={-1}>
        <div className="project-title-row">
          <h4>
            初始队伍 <span className="b2">（顺序即初始站位）</span>{' '}
            <DsHelpTip label="初始队伍当前状态">
              当前 HP/MP 只覆盖这个入口的开局当前值；留空即继承角色定义，最大值仍由角色定义持有。
            </DsHelpTip>
          </h4>
          <DsAddPickerDialog
            adoptionId="project/startup-party"
            triggerLabel="添加队员"
            title="添加初始队员"
            description="搜索可参战角色，选择后确认加入当前入口的初始队伍。"
            confirmLabel="加入队伍"
            options={addablePartyActors.map((actor) => ({
              id: actor.id,
              label: lookupText(actor.name, locale),
              description: `HP ${actor.battler!.baseStats.hp}/${actor.battler!.baseStats.maxHP} · MP ${actor.battler!.baseStats.mp}/${actor.battler!.baseStats.maxMP}`,
              searchText: [`等级 ${actor.battler!.baseStats.level}`],
              leading: (
                <ActorPickerThumbnail
                  actor={actor}
                  actorName={lookupText(actor.name, locale)}
                  catalog={assetCatalog}
                  reader={assetReader}
                />
              ),
              trailing: <DsTag tone="neutral">等级 {actor.battler!.baseStats.level}</DsTag>,
            }))}
            scopeKey={`${draftScope}:party`}
            revision={syncToken}
            readOnly={readOnly}
            emptyMessage="当前没有可加入初始队伍的角色。"
            fallbackFocusRef={partySectionRef}
            onConfirm={addParty}
          />
        </div>
        <p className="project-card-description">
          每个队员在同一行设置开局当前 HP/MP；留空即继承角色定义的当前值。
        </p>
        <DsReorderCollection
          adoptionId="project/startup-party"
          scopeKey={`${draftScope}:party`}
          entries={value.party.map((actorId, index) => ({
            key: partyReorderKeys.keys[index]!,
            label: actors.find((candidate) => candidate.id === actorId)
              ? lookupText(actors.find((candidate) => candidate.id === actorId)!.name, locale)
              : actorId,
          }))}
          revision={syncToken}
          disabled={readOnly}
          onReorder={reorderParty}
        >
          <div className="project-party-order">
            {value.party.map((actorId, index) => {
              const actor = actors.find((candidate) => candidate.id === actorId)
              const actorName = actor ? lookupText(actor.name, locale) : `${actorId}（缺失）`
              const stats = value.seedStats?.[actorId] ?? {}
              const inheritedHp = actor?.battler?.baseStats.hp
              const inheritedMp = actor?.battler?.baseStats.mp
              const reorderKey = partyReorderKeys.keys[index]!
              return (
                <DsReorderItem itemKey={reorderKey} key={reorderKey}>
                  <DsRepeatRow density="default" className="project-party-row">
                    <DsSequenceIndex
                      value={index + 1}
                      accessibleLabel={`初始队伍第 ${index + 1} 位`}
                    />
                    <span className="project-party-identity">
                      <strong className="project-party-name" title={actorName}>
                        {actorName}
                      </strong>
                      <code title={actorId}>{actorId}</code>
                    </span>
                    <DsNumberFieldGrid className="project-party-state">
                      <DsDraftNumberField
                          label="当前 HP"
                          min={0}
                          integer
                          allowEmpty
                          normalize={(next) => Math.max(0, Math.floor(next))}
                          draftKey={`${draftScope}:seedStats.${actorId}.hp`}
                          syncToken={syncToken}
                          value={stats.hp}
                          disabled={readOnly}
                          aria-label={`${actorId} 开局当前 HP，留空继承 ${inheritedHp ?? '未知'}`}
                          placeholder={
                            inheritedHp === undefined ? '继承不可用' : `继承 ${inheritedHp}`
                          }
                          onCommit={(value) => patchSeed(actorId, 'hp', value)}
                      />
                      <DsDraftNumberField
                          label="当前 MP"
                          min={0}
                          integer
                          allowEmpty
                          normalize={(next) => Math.max(0, Math.floor(next))}
                          draftKey={`${draftScope}:seedStats.${actorId}.mp`}
                          syncToken={syncToken}
                          value={stats.mp}
                          disabled={readOnly}
                          aria-label={`${actorId} 开局当前 MP，留空继承 ${inheritedMp ?? '未知'}`}
                          placeholder={
                            inheritedMp === undefined ? '继承不可用' : `继承 ${inheritedMp}`
                          }
                          onCommit={(value) => patchSeed(actorId, 'mp', value)}
                      />
                    </DsNumberFieldGrid>
                    <span className="project-party-actions">
                      <DsReorderMoveButton itemKey={reorderKey} direction="backward" />
                      <DsReorderMoveButton itemKey={reorderKey} direction="forward" />
                      <DsIconButton
                        ref={(node) => {
                          if (node) partyRemoveRefs.current.set(actorId, node)
                          else partyRemoveRefs.current.delete(actorId)
                        }}
                        disabled={readOnly}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => removeParty(actorId)}
                        label={`移出${actorName}`}
                        icon="delete"
                        variant="danger"
                      />
                    </span>
                  </DsRepeatRow>
                </DsReorderItem>
              )
            })}
            {value.party.length === 0 ? (
              <DsEmptyState
                layout="embedded"
                title="暂无初始队员"
                description={
                  partyActors.length > 0 ? '可从右上角添加队员。' : '当前项目没有可参战角色。'
                }
              />
            ) : null}
          </div>
        </DsReorderCollection>
        {partyActors.length === 0 && value.party.length > 0 ? (
          <PageHint>当前项目没有可参战角色。</PageHint>
        ) : null}
        {partyActors.length > 0 && addablePartyActors.length === 0 ? (
          <PageHint>所有可参战角色都已在初始队伍中。</PageHint>
        ) : null}
        {orphanSeedActorIds.length > 0 ? (
          <section className="project-orphan-seeds" aria-label="未入队状态覆盖">
            <h5>未入队状态覆盖</h5>
            <p>这些旧数据不会进入开局队伍。请确认后逐项清理；每次清理都可以撤销。</p>
            <div className="project-orphan-seed-list">
              {orphanSeedActorIds.map((actorId) => {
                const actor = actors.find((candidate) => candidate.id === actorId)
                const stats = value.seedStats?.[actorId] ?? {}
                const state = !actor ? '角色缺失' : actor.battler ? '未入队' : '不可参战'
                const name = actor ? lookupText(actor.name, locale) : actorId
                return (
                  <DsRepeatRow density="default" className="project-orphan-seed-row" key={actorId}>
                    <span className="project-orphan-seed-identity">
                      <strong>{name}</strong>
                      <code>{actorId}</code>
                    </span>
                    <span className="project-orphan-seed-values">
                      当前 HP {stats.hp ?? '未覆盖'} · 当前 MP {stats.mp ?? '未覆盖'}
                    </span>
                    <DsTag tone={state === '角色缺失' ? 'danger' : 'warning'}>{state}</DsTag>
                    <DsButton
                      aria-label={`清理未入队状态覆盖 ${actorId}`}
                      disabled={readOnly}
                      onClick={() => clearSeed(actorId)}
                      icon="delete"
                      variant="danger"
                    >
                      清理
                    </DsButton>
                  </DsRepeatRow>
                )
              })}
            </div>
          </section>
        ) : null}
        <span className="ds-visually-hidden" role="status" aria-live="polite">
          {announcement}
        </span>
      </section>

      <section ref={inventorySectionRef} className="project-card" tabIndex={-1}>
        <div className="project-title-row">
          <h4>初始道具</h4>
          <span className="project-title-actions">
            <DsTag aria-label={`初始道具数量：${inventory.length} 项`} tone="neutral">
              {inventory.length} 项
            </DsTag>
            <DsAddPickerDialog
              adoptionId="project/startup-inventory"
              triggerLabel="添加道具"
              title="添加初始道具"
              description="搜索道具并确认加入当前入口的初始库存；新增数量默认为 1。"
              confirmLabel="添加道具"
              options={addableItems.map((item) => {
                const ability = itemAbilitySummary(item)
                return {
                  id: item.id,
                  label: item.name,
                  description: itemPickerDescription(item),
                  searchText: itemPickerSearchText(item),
                  leading: (
                    <ItemPickerThumbnail item={item} catalog={assetCatalog} reader={assetReader} />
                  ),
                  trailing: ability ? <DsTag tone="neutral">{ability}</DsTag> : undefined,
                }
              })}
              scopeKey={`${draftScope}:inventory`}
              revision={syncToken}
              readOnly={readOnly}
              emptyMessage="当前没有可加入初始库存的道具。"
              fallbackFocusRef={inventorySectionRef}
              onConfirm={addInventoryItem}
            />
          </span>
        </div>
        <DsReorderCollection
          adoptionId="project/startup-inventory"
          scopeKey={`${draftScope}:inventory`}
          entries={inventory.map((row, index) => ({
            key: inventoryReorderKeys.keys[index]!,
            label: items.find((item) => item.id === row.itemId)?.name ?? row.itemId,
          }))}
          revision={syncToken}
          disabled={readOnly}
          onReorder={reorderInventory}
        >
          <div className="project-list-stack">
            {inventory.map((row, index) => {
              const itemName = items.find((item) => item.id === row.itemId)?.name ?? row.itemId
              const reorderKey = inventoryReorderKeys.keys[index]!
              return (
                <DsReorderItem itemKey={reorderKey} key={reorderKey}>
                  <DsRepeatRow density="default" className="project-inventory-row">
                    <DsSequenceIndex
                      value={index + 1}
                      accessibleLabel={`初始道具第 ${index + 1} 项`}
                    />
                    <DsSelect
                      aria-label={`第 ${index + 1} 项初始道具`}
                      searchable
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
                                (entry, itemIndex) =>
                                  itemIndex !== index && entry.itemId === item.id,
                              ),
                          )
                          .map((item) => ({
                            value: item.id,
                            label: item.name,
                            description: item.id,
                          })),
                      ]}
                      onValueChange={(value) =>
                        patch({
                          inventory: inventory.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, itemId: value } : item,
                          ),
                        })
                      }
                    />
                    <DsDraftNumberField
                      fieldClassName="project-inventory-count"
                      label="数量"
                      layout="inline"
                      aria-label={`${itemName}的初始数量`}
                      min={1}
                      integer
                      normalize={(count) => Math.max(1, Math.floor(count))}
                      draftKey={`${draftScope}:inventory.${index}.count`}
                      syncToken={syncToken}
                      value={row.count}
                      disabled={readOnly}
                      onCommit={(count) =>
                        patch({
                          inventory: inventory.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, count: count ?? 1 } : item,
                          ),
                        })
                      }
                    />
                    <span className="project-inventory-actions">
                      <DsReorderMoveButton itemKey={reorderKey} direction="backward" />
                      <DsReorderMoveButton itemKey={reorderKey} direction="forward" />
                      <DsIconButton
                        disabled={readOnly}
                        onClick={() =>
                          patch({
                            inventory: inventory.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                        label={`删除初始道具${itemName}`}
                        icon="delete"
                        variant="danger"
                      />
                    </span>
                  </DsRepeatRow>
                </DsReorderItem>
              )
            })}
            {inventory.length === 0 ? (
              <DsEmptyState
                layout="embedded"
                title="暂无初始道具"
                description={
                  items.length > 0 ? '可从右上角添加道具。' : '当前项目没有可添加的道具。'
                }
              />
            ) : null}
            {inventory.length > 0 && addableItems.length === 0 ? (
              <PageHint>所有道具都已加入初始库存。</PageHint>
            ) : null}
          </div>
        </DsReorderCollection>
      </section>

      <section
        ref={resourceSectionRef}
        className="project-card"
        aria-labelledby="start-world-resources-heading"
        tabIndex={-1}
      >
        <div className="project-title-row">
          <h4 id="start-world-resources-heading">
            初始世界资源{' '}
            <DsHelpTip label="初始世界资源">
              这里只设置项目中物品机制已经使用的自定义资源初值；内建收妖值不在这里重复配置。
            </DsHelpTip>
          </h4>
          {addableResourceCandidates.length > 0 ? (
            <DsAddPickerDialog
              adoptionId="project/startup-resource"
              triggerLabel="添加资源"
              title="添加初始世界资源"
              description="选择项目中物品机制正在使用的资源，并以 0 作为当前入口的初始值。"
              confirmLabel="添加资源"
              options={addableResourceCandidates.map((candidate) => ({
                id: candidate.key,
                label: `${candidate.label}使用的资源`,
                description: '用于物品的资源抽取',
                searchText: [candidate.label, ...candidate.consumerItemIds],
                trailing: <DsTag tone="neutral">{candidate.consumerItemIds.length} 个使用方</DsTag>,
              }))}
              scopeKey={`${draftScope}:resources`}
              revision={syncToken}
              readOnly={readOnly}
              fallbackFocusRef={resourceSectionRef}
              onConfirm={addResource}
            />
          ) : null}
        </div>
        <div className="project-list-stack">
          {activeResources.map(([key, initialValue]) => {
            const candidate = resourceCandidateByKey.get(key)!
            return (
              <DsRepeatRow density="default" className="project-resource-row" key={key}>
                <span className="project-resource-identity">
                  <strong title={candidate.label}>{candidate.label}</strong>
                  <code title={key}>{key}</code>
                </span>
                <span className="project-resource-value">
                  初始值{' '}
                  <DsDraftNumberInput
                    inputRef={(node) => {
                      if (node) resourceValueRefs.current.set(key, node)
                      else resourceValueRefs.current.delete(key)
                    }}
                    min={0}
                    integer
                    normalize={(next) => Math.max(0, Math.floor(next))}
                    draftKey={`${draftScope}:resources.${key}`}
                    syncToken={syncToken}
                    value={initialValue}
                    disabled={readOnly}
                    aria-label={`${candidate.label}（资源 ${key}）初始值`}
                    onCommit={(value) => patchResource(key, value)}
                  />
                </span>
                <DsIconButton
                  disabled={readOnly}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => removeActiveResource(candidate)}
                  label={`删除${candidate.label}使用的初始世界资源`}
                  icon="delete"
                  variant="danger"
                />
              </DsRepeatRow>
            )
          })}
          {activeResources.length === 0 ? (
            <DsEmptyState
              layout="embedded"
              title="暂无初始世界资源"
              description={
                addableResourceCandidates.length > 0
                  ? '可从右上角添加资源。'
                  : '本项目没有需要为入口设置初值的自定义资源。'
              }
            />
          ) : null}
          {activeResources.length > 0 && addableResourceCandidates.length === 0 ? (
            <PageHint>当前入口已配置所有正在使用的自定义资源。</PageHint>
          ) : null}
          {orphanResources.length > 0 ? (
            <section className="project-resource-repair" aria-label="未被使用的资源">
              <h5>未被使用的资源</h5>
              <p>这些既有资源目前没有物品机制使用。可保留数值，或确认后逐项清理。</p>
              <div className="project-resource-repair-list">
                {orphanResources.map(([key, initialValue]) => (
                  <DsRepeatRow
                    density="default"
                    className="project-resource-row project-resource-row--repair"
                    key={key}
                  >
                    <span className="project-resource-identity">
                      <strong>未被使用的资源</strong>
                      <code title={key}>{key}</code>
                    </span>
                    <span className="project-resource-value">
                      初始值{' '}
                      <DsDraftNumberInput
                        inputRef={(node) => {
                          if (node) resourceValueRefs.current.set(key, node)
                          else resourceValueRefs.current.delete(key)
                        }}
                        min={0}
                        integer
                        normalize={(next) => Math.max(0, Math.floor(next))}
                        draftKey={`${draftScope}:resources.${key}`}
                        syncToken={syncToken}
                        value={initialValue}
                        disabled={readOnly}
                        aria-label={`未被使用的资源 ${key} 初始值`}
                        onCommit={(value) => patchResource(key, value)}
                      />
                    </span>
                    <DsIconButton
                      disabled={readOnly}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => clearOrphanResource(key)}
                      label={`清理未被使用的世界资源 ${key}`}
                      icon="delete"
                      variant="danger"
                    />
                  </DsRepeatRow>
                ))}
              </div>
            </section>
          ) : null}
        </div>
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
    locale,
    assetCatalog,
    session,
    tabBar,
    focusObjectId,
    onObjectFocus,
    onOpenLocation,
    issues,
  } = props
  const entryPoints = manifest.entryPoints
  const entryReorderKeys = useDsReorderKeys(entryPoints, (entry) => entry.id)
  const identityIssues = issues.filter((issue) =>
    ['blank-entry-id', 'noncanonical-entry-id', 'duplicate-entry-id'].includes(issue.code),
  )
  const repairableEntryIndexes = getRepairableEntryIndexes(entryPoints)
  const [repairIds, setRepairIds] = useState(() => entryPoints.map((entry) => entry.id))
  useEffect(() => {
    setRepairIds(entryPoints.map((entry) => entry.id))
  }, [entryPoints])
  const [selectedId, setSelectedId] = useState<string | undefined>(() => {
    if (focusObjectId && entryPoints.some((entry) => entry.id === focusObjectId))
      return focusObjectId
    return entryPoints.some((entry) => entry.id === manifest.defaultEntryId)
      ? manifest.defaultEntryId
      : undefined
  })
  useEffect(() => {
    if (focusObjectId === undefined) {
      setSelectedId(
        entryPoints.some((entry) => entry.id === manifest.defaultEntryId)
          ? manifest.defaultEntryId
          : undefined,
      )
      return
    }
    if (entryPoints.some((entry) => entry.id === focusObjectId)) setSelectedId(focusObjectId)
  }, [entryPoints, focusObjectId, manifest.defaultEntryId])
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
  const commit = (next: EntryPoint[], defaultEntryId = manifest.defaultEntryId): void => {
    session.dispatch(new SetStartupEntriesCommand({ defaultEntryId, entryPoints: next }))
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
            <DsFieldGroup>
              {entryPoints.map((entry, index) => (
                <DsField
                  id={`entry-id-repair-${index}`}
                  key={`repair:${index}`}
                  label={`入口 ${index + 1}`}
                  help={`${entry.label || '未命名入口'} · ${
                    repairableEntryIndexes.has(index) ? '需要修复' : '稳定 id（只读）'
                  }`}
                >
                  {(field) => (
                    <DsTextInput
                      {...field}
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
                  )}
                </DsField>
              ))}
            </DsFieldGroup>
            <div className="project-button-row">
              <DsButton
                disabled={!repairReady}
                onClick={() => {
                  const defaultIndex = entryPoints.findIndex(
                    (entry) => entry.id === manifest.defaultEntryId,
                  )
                  commit(
                    entryPoints.map((entry, index) => ({
                      ...entry,
                      id: normalizedRepairIds[index]!,
                    })),
                    defaultIndex >= 0
                      ? normalizedRepairIds[defaultIndex]!
                      : manifest.defaultEntryId,
                  )
                  const repairedSelection =
                    selectedId === undefined
                      ? undefined
                      : normalizedRepairIds[
                          entryPoints.findIndex((entry) => entry.id === selectedId)
                        ]
                  setSelectedId(repairedSelection)
                  onObjectFocus?.(repairedSelection)
                }}
                size="compact"
                variant="secondary"
              >
                应用 id 修复
              </DsButton>
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
    const source = selected ?? findDefaultEntry(manifest)
    if (!source) return
    commit([
      ...entryPoints,
      {
        id,
        label: '新入口',
        scene: source.scene,
        ...(source.introVideo ? { introVideo: source.introVideo } : {}),
        startWorld: structuredClone(source.startWorld),
      },
    ])
    chooseEntry(id)
  }
  const cloneEntry = (): void => {
    if (!selected) return
    const id = newEntryId()
    const source = structuredClone(selected)
    commit([...entryPoints, { ...source, id, label: `${selected.label} 副本` }])
    chooseEntry(id)
  }
  const removeEntry = (): void => {
    if (!selected || entryPoints.length <= 1 || selected.id === manifest.defaultEntryId) return
    const remaining = entryPoints.filter((entry) => entry.id !== selected.id)
    commit(remaining)
    chooseEntry(manifest.defaultEntryId)
  }
  const reorderEntries = (intent: DsReorderIntent): boolean => {
    const next = reorderDsItems(entryPoints, intent, 'insert', sameDsSerializableValue)
    if (next === entryPoints) return false
    entryReorderKeys.move(intent)
    commit([...next])
    return true
  }
  const setSelectedAsDefault = (): void => {
    if (!selected) return
    commit([...entryPoints], selected.id)
  }

  return (
    <>
      <div className="outliner outliner--split project-outliner">
        {tabBar}
        <DsListHeader
          title="入口点"
          count={entryPoints.length}
          unit="项"
          help={{
            label: '入口点开局设置',
            content: '每个入口都保存完整场景与开局数据；“直接启动”只标记无参数启动时选择哪一项。',
          }}
          actions={[{ id: 'create-entry', label: '新增入口', icon: 'add', onClick: addEntry }]}
          overflowActions={[
            {
              id: 'clone-entry',
              label: '复制当前入口',
              disabled: !selected,
              onClick: cloneEntry,
            },
            {
              id: 'set-default-entry',
              label: '设为直接启动入口',
              disabled: !selected || selected.id === manifest.defaultEntryId,
              onClick: setSelectedAsDefault,
            },
            {
              id: 'remove-entry',
              label: '删除当前入口',
              danger: true,
              disabled:
                !selected || entryPoints.length <= 1 || selected.id === manifest.defaultEntryId,
              onClick: removeEntry,
            },
          ]}
        />
        <DsReorderCollection
          adoptionId="project/entry-points"
          scopeKey="manifest.entryPoints"
          entries={entryPoints.map((entry, index) => ({
            key: entryReorderKeys.keys[index]!,
            label: entry.label || entry.id,
          }))}
          revision={session.getHistoryVersion()}
          onReorder={reorderEntries}
        >
          <div className="project-entry-list">
            {entryPoints.map((entry, index) => {
              const reorderKey = entryReorderKeys.keys[index]!
              return (
                <DsReorderItem
                  itemKey={reorderKey}
                  contentClassName="project-entry-item-content"
                  key={reorderKey}
                >
                  <DsCatalogRow
                    title={entry.label}
                    meta={entry.id}
                    trailing={
                      entry.id === manifest.defaultEntryId ? (
                        <DsTag tone="accent">直接启动</DsTag>
                      ) : null
                    }
                    selected={entry.id === selected?.id}
                    onClick={() => chooseEntry(entry.id)}
                  />
                  <span className="project-entry-row-actions">
                    <DsReorderMoveButton itemKey={reorderKey} direction="backward" />
                    <DsReorderMoveButton itemKey={reorderKey} direction="forward" />
                  </span>
                </DsReorderItem>
              )
            })}
          </div>
        </DsReorderCollection>
      </div>
      <ProjectPageWorkspace
        eyebrow="项目设置 · 入口点"
        title={selected?.label ?? '选择一个入口'}
        objectId={selected?.id ?? 'manifest.entryPoints'}
        meta={
          <DsTag tone="neutral">
            {selected?.id === manifest.defaultEntryId ? '直接启动 · 稳定 id' : '菜单入口 · 稳定 id'}
          </DsTag>
        }
      >
        {selected ? (
          <>
            <section className="project-card">
              <h4>
                入口信息{' '}
                <DsHelpTip label="启动入口">
                  每个入口都保存完整场景、入口视频与开局状态；稳定 ID 创建后保持不变。
                </DsHelpTip>
              </h4>
              <DsFieldGroup>
                <DsDraftTextField
                  id="entry-label"
                  label="标签"
                  draftKey={`entry:${selected.id}:label`}
                  syncToken={session.getHistoryVersion()}
                  value={selected.label}
                  onCommit={(value) => patchEntry(selected.id, { label: value })}
                />
                <DsSelectField
                  id="entry-scene"
                  label="起始场景"
                  value={selected.scene}
                  options={[
                    ...(!sceneIds.includes(selected.scene)
                      ? [{ value: selected.scene, label: `${selected.scene}（缺失）` }]
                      : []),
                    ...sceneIds.map((id) => ({ value: id, label: id })),
                  ]}
                  onValueChange={(value) => patchEntry(selected.id, { scene: value })}
                />
                <DsField id="entry-intro-video" label="入口视频">
                  {(field) => (
                    <DsControlGroup
                      control={
                        <DsSelect
                          {...field}
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
                      }
                      actions={
                        selected.introVideo && onOpenLocation ? (
                          <DsButton
                            icon="open"
                            title={`查看入口视频 ${selected.introVideo}`}
                            onClick={() => {
                              stopEditorAudioPreview()
                              onOpenLocation({
                                module: 'asset',
                                subpage: 'cutscene',
                                objectId: selected.introVideo!,
                              })
                            }}
                            variant="secondary"
                          >
                            前往预览
                          </DsButton>
                        ) : undefined
                      }
                    />
                  )}
                </DsField>
              </DsFieldGroup>
            </section>
            <section className="project-card">
              <div className="project-title-row">
                <h4>
                  开局设置{' '}
                  <DsHelpTip label="入口开局设置">
                    该入口拥有独立的队伍顺序、当前 HP/MP 覆盖、资源和物品配置。
                  </DsHelpTip>
                </h4>
                {selected.id === manifest.defaultEntryId ? (
                  <span className="project-badge custom">直接启动</span>
                ) : null}
              </div>
              <StartWorldFields
                draftScope={`entry:${selected.id}:startWorld`}
                syncToken={session.getHistoryVersion()}
                value={selected.startWorld}
                actors={actors}
                items={items}
                locale={locale}
                assetCatalog={assetCatalog}
                assetReader={props.assetReader}
                onChange={(next: StartWorld) => patchEntry(selected.id, { startWorld: next })}
              />
            </section>
          </>
        ) : (
          <section className="project-card">
            <PageHint>直接启动入口配置损坏；请先从左侧选择一个真实入口并设为直接启动。</PageHint>
          </section>
        )}
      </ProjectPageWorkspace>
    </>
  )
}

function ProjectStartupPage(props: ProjectWorkbenchTabProps) {
  const { manifest, assetCatalog, assetReader, session, tabBar, onOpenLocation } = props
  const statuses = projectAssetRoleStatuses(manifest.assets, assetCatalog)
  const statusByRole = new Map(statuses.map((status) => [status.definition.role, status]))
  const configuredCount = statuses.filter((status) => status.state === 'configured').length
  const errorCount = statuses.filter((status) => status.state === 'error').length
  const [selectedGroupId, setSelectedGroupId] = useState(PROJECT_ASSET_ROLE_GROUPS[0]?.id)
  const openGroup = (groupId: (typeof PROJECT_ASSET_ROLE_GROUPS)[number]['id']): void => {
    setSelectedGroupId(groupId)
    document.getElementById(`project-role-group-${groupId}`)?.scrollIntoView({ block: 'start' })
  }

  return (
    <>
      <div className="outliner project-outliner">
        {tabBar}
        <DsListHeader title="全局资源" count={configuredCount} unit="项已配置" />
        <DsCatalogGroupList label="全局资源分组">
          {PROJECT_ASSET_ROLE_GROUPS.map((group) => {
            const groupStatuses = group.roles.map(
              (definition) => statusByRole.get(definition.role)!,
            )
            const groupConfigured = groupStatuses.filter(
              (status) => status.state === 'configured',
            ).length
            const groupErrors = groupStatuses.filter((status) => status.state === 'error').length
            return (
              <DsCatalogRow
                key={group.id}
                title={group.title}
                meta={`${groupConfigured}/${group.roles.length} 已配置`}
                selected={selectedGroupId === group.id}
                aria-controls={`project-role-group-${group.id}`}
                trailing={
                  groupErrors ? <DsTag tone="warning">{groupErrors} 项待处理</DsTag> : undefined
                }
                onClick={() => openGroup(group.id)}
              />
            )
          })}
        </DsCatalogGroupList>
      </div>
      <ProjectPageWorkspace
        eyebrow="项目设置 · 全局资源"
        title="全局资源与启动"
        summary="按用途配置项目级音乐、音效、视频与视觉资源；音乐和音效可在原位试听。"
        meta={
          <>
            <DsHelpTip label="全局资源设置">
              这里只选择运行时使用的项目级资源；导入、替换和资源详情仍由资源模块负责。
            </DsHelpTip>
            <DsTag tone={errorCount ? 'warning' : 'neutral'}>
              {configuredCount}/{statuses.length} 已配置
              {errorCount ? ` · ${errorCount} 项待处理` : ''}
            </DsTag>
          </>
        }
      >
        {PROJECT_ASSET_ROLE_GROUPS.map((group) => {
          const groupStatuses = group.roles.map((definition) => statusByRole.get(definition.role)!)
          const groupConfigured = groupStatuses.filter(
            (status) => status.state === 'configured',
          ).length
          const groupErrors = groupStatuses.filter((status) => status.state === 'error').length
          return (
            <section
              id={`project-role-group-${group.id}`}
              className="project-card project-role-group"
              key={group.id}
            >
              <div className="project-role-group-head">
                <div>
                  <h4>{group.title}</h4>
                  <p className="project-copy">{group.description}</p>
                </div>
                <DsTag tone={groupErrors ? 'warning' : 'neutral'}>
                  {groupConfigured}/{group.roles.length} 已配置
                  {groupErrors ? ` · ${groupErrors} 项待处理` : ''}
                </DsTag>
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
      </ProjectPageWorkspace>
    </>
  )
}

function readableList(values: readonly string[], overflowLabel: string): string {
  if (!values.length) return '无'
  const visible = values.slice(0, 3)
  const remaining = values.length - visible.length
  return `${visible.join('、')}${remaining ? `，另有 ${PROJECT_NUMBER_FORMAT.format(remaining)} ${overflowLabel}` : ''}`
}

function ProjectOverviewPage(props: ProjectWorkbenchTabProps) {
  const {
    manifest,
    scenes,
    actors,
    items,
    locale,
    assetCatalog,
    session,
    issues,
    diagnosticsStatus,
    tabBar,
    onOpenLocation,
  } = props
  const entries = manifest.entryPoints
  const defaultEntry = findDefaultEntry(manifest)
  const openProjectPage = (next: ProjectWorkbenchPage, objectId?: string): void =>
    onOpenLocation?.({
      module: 'project',
      subpage: next,
      ...(objectId ? { objectId } : {}),
    } as EditorLocation)
  const defaultEntryIssues = issues.filter(
    (issue) =>
      issue.code === 'missing-default-entry' ||
      (defaultEntry && issue.target?.objectId === defaultEntry.id),
  )
  const hasMissingScene = defaultEntryIssues.some(
    (issue) => issue.code === 'missing-entry-point-scene',
  )
  const hasIntroIssue = defaultEntryIssues.some((issue) =>
    ['missing-intro-video', 'intro-video-kind-mismatch'].includes(issue.code),
  )
  const entryHealth =
    diagnosticsStatus !== 'current'
      ? diagnosticsStatus === 'failed'
        ? '诊断暂不可用'
        : '正在检查'
      : !defaultEntry || defaultEntryIssues.some((issue) => issue.code === 'missing-default-entry')
        ? '默认入口需要修复'
        : hasMissingScene
          ? '需要修复'
          : '已就绪'
  const introHealth =
    diagnosticsStatus !== 'current'
      ? diagnosticsStatus === 'failed'
        ? '诊断暂不可用'
        : '正在检查'
      : !defaultEntry
        ? '等待入口修复'
        : hasIntroIssue
          ? '需要修复'
          : defaultEntry.introVideo
            ? '已配置'
            : '未配置（可选）'
  const partyNames = (defaultEntry?.startWorld.party ?? []).map((actorId) => {
    const actor = actors.find((candidate) => candidate.id === actorId)
    return actor ? lookupText(actor.name, locale) : '未知角色'
  })
  const inventory = defaultEntry?.startWorld.inventory ?? []
  const inventoryNames = inventory.map((entry) => {
    const item = items.find((candidate) => candidate.id === entry.itemId)
    return item?.name ?? '未知道具'
  })
  const inventoryCount = inventory.reduce((sum, entry) => sum + entry.count, 0)
  const menuNames = entries.map((entry) => entry.label.trim() || '未命名入口')
  const entryVideoCount = entries.filter((entry) => entry.introVideo).length
  const roleStatuses = projectAssetRoleStatuses(manifest.assets, assetCatalog)
  const diagnosticRoleErrors = new Set(
    issues
      .filter((issue) => ['missing-role-asset', 'role-kind-mismatch'].includes(issue.code))
      .flatMap((issue) => (issue.assetRole ? [issue.assetRole] : [])),
  )
  const roleErrors = roleStatuses.filter(
    (status) => status.state === 'error' || diagnosticRoleErrors.has(status.definition.role),
  )
  const configuredRoles = roleStatuses.filter((status) => status.state === 'configured').length
  const optionalRoles = roleStatuses.filter(
    (status) => status.state === 'unconfigured' && !status.required,
  ).length
  const resourceHealth =
    diagnosticsStatus !== 'current'
      ? diagnosticsStatus === 'failed'
        ? '诊断暂不可用'
        : '正在检查资源配置'
      : roleErrors.length
        ? `${PROJECT_NUMBER_FORMAT.format(roleErrors.length)} 项需要处理`
        : '资源配置检查通过'

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
            入口点 <strong>{entries.length}</strong>
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
          <DsTag tone={issues.length || diagnosticsStatus !== 'current' ? 'warning' : 'neutral'}>
            {issues.length
              ? `${issues.length} 项问题`
              : diagnosticsStatus === 'current'
                ? '配置健康'
                : diagnosticsStatus === 'failed'
                  ? '诊断失败'
                  : '检查中'}
          </DsTag>
        }
      >
        <section className="project-card">
          <h4>项目身份</h4>
          <DsFieldGroup>
            <DsDraftTextField
              id="project-display-name"
              label="显示名"
              draftKey={`project:${manifest.id}:name`}
              syncToken={session.getHistoryVersion()}
              value={manifest.name}
              validate={(value) => (value.trim() ? undefined : '项目显示名不能为空。')}
              onCommit={(value) => session.dispatch(new RenameProjectCommand(value))}
            />
          </DsFieldGroup>
        </section>
        <section className="project-startup-summary-grid" aria-label="启动摘要">
          <DsCard
            title="默认开局"
            className="project-startup-summary-card"
            actions={
              <DsButton
                onClick={() => openProjectPage('entrypoint', defaultEntry?.id)}
                size="compact"
                variant="secondary"
                icon="edit"
              >
                编辑开局
              </DsButton>
            }
          >
            <p className="project-summary-lead">
              {defaultEntry?.label.trim() || '直接启动入口尚未配置'}
            </p>
            <dl className="project-startup-facts">
              <div>
                <dt>队伍</dt>
                <dd>{readableList(partyNames, '名队员')}</dd>
              </div>
              <div>
                <dt>金钱</dt>
                <dd>
                  {defaultEntry
                    ? `${PROJECT_NUMBER_FORMAT.format(defaultEntry.startWorld.money)} 金钱`
                    : '等待入口修复'}
                </dd>
              </div>
              <div>
                <dt>道具</dt>
                <dd>
                  {inventory.length
                    ? `${PROJECT_NUMBER_FORMAT.format(inventory.length)} 种、共 ${PROJECT_NUMBER_FORMAT.format(inventoryCount)} 件：${readableList(inventoryNames, '种道具')}`
                    : '无初始道具'}
                </dd>
              </div>
              <div>
                <dt>起始位置</dt>
                <dd>{entryHealth}</dd>
              </div>
              <div>
                <dt>开场视频</dt>
                <dd>{introHealth}</dd>
              </div>
            </dl>
          </DsCard>
          <DsCard
            title="标题菜单"
            className="project-startup-summary-card"
            actions={
              <DsButton
                onClick={() => openProjectPage('entrypoint', entries[0]?.id)}
                size="compact"
                variant="secondary"
                icon="edit"
              >
                编辑入口
              </DsButton>
            }
          >
            <p className="project-summary-lead">
              {PROJECT_NUMBER_FORMAT.format(entries.length)} 个可选入口
            </p>
            <dl className="project-startup-facts">
              <div>
                <dt>菜单项</dt>
                <dd>{readableList(menuNames, '个入口')}</dd>
              </div>
              <div>
                <dt>入口视频</dt>
                <dd>
                  {entryVideoCount
                    ? `${PROJECT_NUMBER_FORMAT.format(entryVideoCount)} 个入口已配置`
                    : '均未配置（可选）'}
                </dd>
              </div>
            </dl>
          </DsCard>
          <DsCard
            title="启动资源"
            className="project-startup-summary-card"
            actions={
              <DsButton
                onClick={() => openProjectPage('startup')}
                size="compact"
                variant="secondary"
                icon="edit"
              >
                编辑资源
              </DsButton>
            }
          >
            <p className="project-summary-lead">{resourceHealth}</p>
            <dl className="project-startup-facts">
              <div>
                <dt>已配置</dt>
                <dd>
                  {PROJECT_NUMBER_FORMAT.format(configuredRoles)}/
                  {PROJECT_NUMBER_FORMAT.format(roleStatuses.length)} 项
                </dd>
              </div>
              <div>
                <dt>可选留空</dt>
                <dd>{PROJECT_NUMBER_FORMAT.format(optionalRoles)} 项</dd>
              </div>
              {roleErrors.length ? (
                <div>
                  <dt>待处理</dt>
                  <dd>
                    {readableList(
                      roleErrors.map((status) => status.definition.label),
                      '项设置',
                    )}
                  </dd>
                </div>
              ) : null}
            </dl>
          </DsCard>
        </section>
      </ProjectPageWorkspace>
    </>
  )
}

export function ProjectWorkbenchTab(props: ProjectWorkbenchTabProps) {
  if (props.page === 'entrypoint') return <EntryPointEditor {...props} issues={[...props.issues]} />
  if (props.page === 'startup') return <ProjectStartupPage {...props} />
  if (props.page === 'advanced') return <ProjectAdvancedPage {...props} issues={props.issues} />
  return <ProjectOverviewPage {...props} />
}
